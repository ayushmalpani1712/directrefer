// ============================================================================
// DirectRefer V2.0 — Applications Module
// ============================================================================
// Manages job applications: creation, updates, tracking.
// Applications are submitted by job seekers for specific jobs.
// ============================================================================

import { supabase } from '@/lib/supabase'
import { recordStateTransition } from './state-history'

export type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'shortlisted' | 'rejected' | 'withdrawn' | 'hired'

export interface Application {
  id: string
  candidate_id: string
  job_id: string
  match_id: string | null
  resume_snapshot: string | null
  cover_letter: string | null
  answers: Record<string, string> | null
  status: ApplicationStatus
  recruiter_notes: string | null
  submitted_at: string
  created_at: string
  updated_at: string
}

export interface ApplicationCreate {
  candidate_id: string
  job_id: string
  match_id?: string
  resume_snapshot?: string
  cover_letter?: string
  answers?: Record<string, string>
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
      match_id: input.match_id ?? null,
      resume_snapshot: input.resume_snapshot ?? null,
      cover_letter: input.cover_letter ?? null,
      answers: input.answers ?? null,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  // Record state transition
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
): Promise<Application[]> {
  let query = supabase
    .from('applications')
    .select('*, jobs(title, company, location)')
    .eq('candidate_id', candidateId)
    .order('submitted_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Application[]
}

/**
 * Get applications for a job (recruiter view).
 */
export async function getJobApplications(
  jobId: string,
  status?: ApplicationStatus
): Promise<Application[]> {
  let query = supabase
    .from('applications')
    .select('*, profiles_job_seeker(full_name, email)')
    .eq('job_id', jobId)
    .order('submitted_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Application[]
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
      recruiter_notes: notes ?? app.recruiter_notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select()
    .single()

  if (error) throw error

  // Record state transition
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
  under_review: number
  shortlisted: number
  rejected: number
  withdrawn: number
  hired: number
}> {
  const apps = await getCandidateApplications(candidateId)

  return {
    total: apps.length,
    submitted: apps.filter(a => a.status === 'submitted').length,
    under_review: apps.filter(a => a.status === 'under_review').length,
    shortlisted: apps.filter(a => a.status === 'shortlisted').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
    withdrawn: apps.filter(a => a.status === 'withdrawn').length,
    hired: apps.filter(a => a.status === 'hired').length,
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

  // Calculate average response time
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
