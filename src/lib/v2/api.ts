// ============================================================================
// DirectRefer V2.0 — Client API Layer
// ============================================================================
// Wraps V2 modules for use in React components via Supabase client.
// ============================================================================

import { supabase } from '@/lib/supabase'
import { calculateTrustScore, getTrustScore } from './trust-score'
import type { TrustScore } from './trust-score'
import { recordStateTransition, getEntityHistory } from './state-history'
import { runScreening } from './screening'
import { createApplication, updateApplicationStatus } from './applications'
import type { Application, ApplicationStatus } from './applications'
import type { ScreeningDecision } from './screening'
import { trustScoresSupported, stateHistorySupported, screeningSupported } from './probes'

// ── Trust Scores ───────────────────────────────────────────────────────────

/**
 * Fetch trust score for a professional (cached if recent).
 * Gracefully returns null if V2 tables don't exist yet.
 */
export async function fetchTrustScore(userId: string): Promise<TrustScore | null> {
  try {
    if (!(await trustScoresSupported())) return null
    const existing = await getTrustScore(userId)
    // Recalculate if older than 24 hours
    if (existing) {
      const hoursSince = (Date.now() - new Date(existing.calculated_at).getTime()) / (1000 * 60 * 60)
      if (hoursSince < 24) return existing
    }
    return await calculateTrustScore(userId)
  } catch {
    return null
  }
}

/**
 * Batch fetch trust scores for multiple professionals.
 */
export async function fetchTrustScores(userIds: string[]): Promise<Map<string, TrustScore>> {
  const scores = new Map<string, TrustScore>()
  await Promise.allSettled(
    userIds.map(async (id) => {
      const score = await fetchTrustScore(id)
      if (score) scores.set(id, score)
    })
  )
  return scores
}

// ── State History ──────────────────────────────────────────────────────────

/**
 * Record a referral state change.
 * Gracefully skips if V2 tables don't exist yet.
 */
export async function recordReferralTransition(
  referralId: string,
  fromState: string | null,
  toState: string,
  triggeredBy: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    if (!(await stateHistorySupported())) return
    await recordStateTransition({
      entity_type: 'referral',
      entity_id: referralId,
      from_state: fromState,
      to_state: toState,
      triggered_by: triggeredBy,
      metadata,
    })
  } catch (e) {
    console.error('Failed to record state transition:', e)
  }
}

/**
 * Record an application state change.
 */
export async function recordApplicationTransition(
  applicationId: string,
  fromState: string | null,
  toState: string,
  triggeredBy: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await recordStateTransition({
      entity_type: 'application',
      entity_id: applicationId,
      from_state: fromState,
      to_state: toState,
      triggered_by: triggeredBy,
      metadata,
    })
  } catch (e) {
    console.error('Failed to record state transition:', e)
  }
}

/**
 * Get full history for a referral.
 */
export async function getReferralHistory(referralId: string) {
  return getEntityHistory('referral', referralId)
}

// ── Screening ──────────────────────────────────────────────────────────────

/**
 * Run screening for a candidate against a job.
 * Gracefully returns pass-all if V2 tables don't exist yet.
 */
export async function runCandidateScreening(
  candidateId: string,
  jobId: string
): Promise<ScreeningDecision> {
  try {
    if (!(await screeningSupported())) {
      return { all_passed: true, attempts: [], summary: 'Screening not available yet' }
    }
    return await runScreening(candidateId, jobId)
  } catch {
    return { all_passed: true, attempts: [], summary: 'Screening skipped' }
  }
}

// ── Applications ───────────────────────────────────────────────────────────

/**
 * Submit a job application.
 */
export async function submitApplication(params: {
  candidateId: string
  jobId: string
  resumeUrl?: string
  coverLetter?: string
  notes?: string
}): Promise<Application> {
  return createApplication({
    candidate_id: params.candidateId,
    job_id: params.jobId,
    resume_url: params.resumeUrl,
    cover_letter: params.coverLetter,
    notes: params.notes,
  })
}

/**
 * Update application status.
 */
export async function updateAppStatus(
  applicationId: string,
  status: ApplicationStatus,
  updatedBy: string,
  notes?: string
): Promise<Application> {
  return updateApplicationStatus(applicationId, status, updatedBy, notes)
}

// ── Notifications (V2 helpers) ─────────────────────────────────────────────

/**
 * Create a notification for state change.
 */
export async function notifyStateChange(
  userId: string,
  title: string,
  description: string,
  type: string = 'system'
): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      description,
    })
  } catch (e) {
    console.error('Failed to create notification:', e)
  }
}

// ── Profile Completeness ───────────────────────────────────────────────────

/**
 * Calculate profile completeness for a professional.
 */
export async function calculateProfileCompleteness(userId: string): Promise<number> {
  try {
    const { data: profile } = await supabase
      .from('profiles_professional')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!profile) return 0

    const { data: skills } = await supabase
      .from('profile_skills')
      .select('skill_id')
      .eq('profile_id', userId)

    const { data: user } = await supabase
      .from('users')
      .select('linkedin_url')
      .eq('id', userId)
      .single()

    let score = 0
    if (profile.job_title) score += 15
    if (profile.company_name) score += 15
    if (profile.bio && profile.bio.length > 50) score += 20
    if (skills && skills.length > 0) score += 15
    if (profile.years_experience && profile.years_experience > 0) score += 10
    if (profile.referral_policy) score += 10
    if (user?.linkedin_url || profile.github_url) score += 5

    return Math.min(100, score)
  } catch {
    return 0
  }
}

export type { TrustScore }
