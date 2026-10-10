// ============================================================================
// DirectRefer V2.0 — Applications Module
// ============================================================================
// Manages job applications: creation, updates, tracking.
// Applications are submitted by job seekers for specific jobs.
// ============================================================================

import { supabase } from '@/lib/supabase'
import { recordStateTransition } from './state-history'

export type ApplicationStatus = 'submitted' | 'screening' | 'shortlisted' | 'interview' | 'offered' | 'accepted' | 'rejected' | 'withdrawn'

export interface Application {
  id: string
  candidate_id: string
  job_id: string
  status: ApplicationStatus
  resume_url: string | null
  cover_letter: string | null
  notes: string | null
  submitted_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ApplicationCreate {
  candidate_id: string
  job_id: string
  resume_url?: string
  cover_letter?: string
  notes?: string
}

// ── CRUD Operations ────────────────────────────────────────────────────────

/**
 * Create a new application.
 * Records state transition from null → 'submitted'.
 */
export async function createApplication(input: ApplicationCreate): Promise<Application> {
  const { data, error } = await supabase
    .from('applications')
    .insert({
      candidate_id: input.candidate_id,
      job_id: input.job_id,
      resume_url: input.resume_url ?? null,
      cover_letter: input.cover_letter ?? null,
      notes: input.notes ?? null,
      status: 'submitted',
    })
    .select()
    .single()

  if (error) throw error

  await recordStateTransition({
    entity_type: 'application',
    entity_id: data.id,
    from_state: null,
    to_state: 'submitted',
    triggered_by: input.candidate_id,
    metadata: { job_id: input.job_id },
  })

  return data as Application
}

/**
 * Get application by ID.
 */
export async function getApplication(id: string): Promise<Application | null> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as Application | null
}

/**
 * Get applications for a candidate.
 */
export async function getCandidateApplications(
  candidateId: string,
  status?: ApplicationStatus
): Promise<(Application & { jobs?: { title?: string; company?: string; location?: string } })[]> {
  let query = supabase
    .from('applications')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('submitted_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error

  const apps = (data ?? []) as Application[]
  const jobIds = [...new Set(apps.map((a) => a.job_id).filter(Boolean))]
  if (jobIds.length === 0) return apps

  const { data: jobsData } = await supabase
    .from('jobs')
    .select('*')
    .in('id', jobIds)

  const jobsById = new Map<string, { title?: string; company?: string; location?: string }>()
  for (const j of (jobsData ?? []) as Record<string, unknown>[]) {
    jobsById.set(String(j.id), {
      title: (j.title as string) ?? undefined,
      company: (j.company_name as string) ?? (j.company as string) ?? undefined,
      location: (j.location as string) ?? undefined,
    })
  }

  return apps.map((a) => ({ ...a, jobs: jobsById.get(a.job_id) }))
}

/**
 * Get applications for a job (recruiter view).
 */
export async function getJobApplications(
  jobId: string,
  status?: ApplicationStatus
): Promise<(Application & { profiles_job_seeker?: { full_name: string; email: string } })[]> {
  let query = supabase
    .from('applications')
    .select('*')
    .eq('job_id', jobId)
    .order('submitted_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error

  const apps = (data ?? []) as Application[]
  const candidateIds = [...new Set(apps.map((a) => a.candidate_id).filter(Boolean))]
  if (candidateIds.length === 0) return apps

  const { data: profilesData } = await supabase
    .from('profiles_job_seeker')
    .select('user_id, full_name, email')
    .in('user_id', candidateIds)

  const byUser = new Map<string, { full_name: string; email: string }>()
  for (const p of (profilesData ?? []) as { user_id: string; full_name?: string; email?: string }[]) {
    byUser.set(p.user_id, { full_name: p.full_name ?? '', email: p.email ?? '' })
  }

  return apps.map((a) => ({ ...a, profiles_job_seeker: byUser.get(a.candidate_id) }))
}

// ── Status Updates ─────────────────────────────────────────────────────────

/**
 * Update application status with state transition recording.
 */
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
  updatedBy: string,
  notes?: string
): Promise<Application> {
  const app = await getApplication(applicationId)
  if (!app) throw new Error('Application not found')

  const oldStatus = app.status

  const { data, error } = await supabase
    .from('applications')
    .update({
      status: newStatus,
      notes: notes ?? app.notes,
    })
    .eq('id', applicationId)
    .select()
    .single()

  if (error) throw error

  await recordStateTransition({
    entity_type: 'application',
    entity_id: applicationId,
    from_state: oldStatus,
    to_state: newStatus,
    triggered_by: updatedBy,
    metadata: { notes },
  })

  return data as Application
}

/**
 * Withdraw an application (candidate action).
 */
export async function withdrawApplication(
  applicationId: string,
  candidateId: string
): Promise<Application> {
  return updateApplicationStatus(applicationId, 'withdrawn', candidateId)
}

/**
 * Shortlist an application (recruiter action).
 */
export async function shortlistApplication(
  applicationId: string,
  recruiterId: string,
  notes?: string
): Promise<Application> {
  return updateApplicationStatus(applicationId, 'shortlisted', recruiterId, notes)
}

/**
 * Reject an application (recruiter action).
 */
export async function rejectApplication(
  applicationId: string,
  recruiterId: string,
  reason?: string
): Promise<Application> {
  return updateApplicationStatus(applicationId, 'rejected', recruiterId, reason)
}

// ── Analytics ──────────────────────────────────────────────────────────────

/**
 * Get application stats for a candidate.
 */
export async function getCandidateStats(candidateId: string): Promise<{
  total: number
  submitted: number
  screening: number
  shortlisted: number
  rejected: number
  withdrawn: number
}> {
  const apps = await getCandidateApplications(candidateId)

  return {
    total: apps.length,
    submitted: apps.filter(a => a.status === 'submitted').length,
    screening: apps.filter(a => a.status === 'screening').length,
    shortlisted: apps.filter(a => a.status === 'shortlisted').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
    withdrawn: apps.filter(a => a.status === 'withdrawn').length,
  }
}

/**
 * Get application stats for a job.
 */
export async function getJobStats(jobId: string): Promise<{
  total: number
  by_status: Record<ApplicationStatus, number>
  avg_response_days: number
}> {
  const apps = await getJobApplications(jobId)

  const byStatus: Record<string, number> = {}
  for (const app of apps) {
    byStatus[app.status] = (byStatus[app.status] ?? 0) + 1
  }

  const reviewedApps = apps.filter(a => a.status !== 'submitted')
  const avgDays = reviewedApps.length > 0
    ? reviewedApps.reduce((sum, a) => {
        const submitted = new Date(a.submitted_at)
        const updated = new Date(a.updated_at)
        return sum + (updated.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24)
      }, 0) / reviewedApps.length
    : 0

  return {
    total: apps.length,
    by_status: byStatus as Record<ApplicationStatus, number>,
    avg_response_days: Math.round(avgDays * 10) / 10,
  }
}
