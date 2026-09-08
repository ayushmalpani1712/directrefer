// ============================================================================
// DirectRefer V2.0 — Screening Engine
// ============================================================================
// Manages screening criteria, attempts, and pass/fail logic.
// Screening is triggered when a referral is accepted.
// ============================================================================

import { supabase } from '@/lib/supabase'

export interface ScreeningCriteria {
  id: string
  name: string
  description: string
  category: 'resume' | 'skills' | 'experience' | 'background'
  validation_rules: ValidationRule[]
  is_active: boolean
  created_at: string
}

export interface ValidationRule {
  type: 'min_experience_years' | 'required_skills' | 'min_education' | 'resume_keywords' | 'custom'
  params: Record<string, unknown>
}

export interface ScreeningAttempt {
  id: string
  candidate_id: string
  job_id: string
  criteria_id: string
  result: 'pass' | 'fail' | 'pending' | 'waived'
  details: Record<string, unknown> | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface ScreeningDecision {
  all_passed: boolean
  attempts: ScreeningAttempt[]
  summary: string
}

// ── Criteria Management ────────────────────────────────────────────────────

/**
 * Get all active screening criteria.
 */
export async function getActiveCriteria(): Promise<ScreeningCriteria[]> {
  const { data, error } = await supabase
    .from('screening_criteria')
    .select('*')
    .eq('is_active', true)
    .order('created_at')

  if (error) throw error
  return (data ?? []) as ScreeningCriteria[]
}

/**
 * Get a specific screening criterion.
 */
export async function getCriteria(id: string): Promise<ScreeningCriteria | null> {
  const { data, error } = await supabase
    .from('screening_criteria')
    .select('*')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as ScreeningCriteria | null
}

/**
 * Create a new screening criterion (admin only).
 */
export async function createCriteria(
  criteria: Omit<ScreeningCriteria, 'id' | 'created_at'>
): Promise<ScreeningCriteria> {
  const { data, error } = await supabase
    .from('screening_criteria')
    .insert(criteria)
    .select()
    .single()

  if (error) throw error
  return data as ScreeningCriteria
}

// ── Screening Execution ────────────────────────────────────────────────────

/**
 * Run screening for a candidate against a job.
 * Returns pass/fail decision with details.
 */
export async function runScreening(
  candidateId: string,
  jobId: string
): Promise<ScreeningDecision> {
  const criteria = await getActiveCriteria()
  const attempts: ScreeningAttempt[] = []

  for (const criterion of criteria) {
    const attempt = await evaluateCriterion(candidateId, jobId, criterion)
    attempts.push(attempt)
  }

  const allPassed = attempts.every(a => a.result === 'pass' || a.result === 'waived')
  const passedCount = attempts.filter(a => a.result === 'pass').length
  const failedCount = attempts.filter(a => a.result === 'fail').length

  const summary = allPassed
    ? `All ${criteria.length} screening criteria passed (${passedCount} pass, ${attempts.filter(a => a.result === 'waived').length} waived)`
    : `${failedCount} of ${criteria.length} criteria failed`

  return { all_passed: allPassed, attempts, summary }
}

/**
 * Evaluate a single criterion against a candidate.
 */
async function evaluateCriterion(
  candidateId: string,
  jobId: string,
  criterion: ScreeningCriteria
): Promise<ScreeningAttempt> {
  const { data: seekerProfile } = await supabase
    .from('profiles_job_seeker')
    .select('*')
    .eq('user_id', candidateId)
    .single()

  let passed = true
  const details: Record<string, unknown> = { criterion: criterion.name }

  for (const rule of criterion.validation_rules) {
    switch (rule.type) {
      case 'min_experience_years': {
        const years = rule.params.years as number
        const actualYears = seekerProfile?.experience_years ?? 0
        details.required_years = years
        details.actual_years = actualYears
        if (actualYears < years) passed = false
        break
      }
      case 'required_skills': {
        const required = rule.params.skills as string[]
        const { data: profileSkills } = await supabase
          .from('profile_skills')
          .select('skill_id')
          .eq('profile_id', candidateId)

        const skillIds = (profileSkills ?? []).map(s => s.skill_id)
        const missing = required.filter(s => !skillIds.includes(s))
        details.required = required
        details.missing = missing
        if (missing.length > 0) passed = false
        break
      }
      case 'min_education': {
        const level = rule.params.level as string
        const levels = ['high_school', 'bachelors', 'masters', 'phd']
        const requiredIdx = levels.indexOf(level)
        const actualIdx = levels.indexOf(seekerProfile?.education ?? '')
        details.required_level = level
        details.actual_level = seekerProfile?.education
        if (actualIdx < requiredIdx) passed = false
        break
      }
      case 'resume_keywords': {
        const keywords = rule.params.keywords as string[]
        const resumeText = (seekerProfile?.resume_text ?? '').toLowerCase()
        const found = keywords.filter(kw => resumeText.includes(kw.toLowerCase()))
        details.required_keywords = keywords
        details.found = found
        details.found_count = found.length
        if (found.length === 0) passed = false
        break
      }
    }
  }

  const result: ScreeningAttempt['result'] = passed ? 'pass' : 'fail'

  // Persist attempt
  const { data, error } = await supabase
    .from('screening_attempts')
    .insert({
      candidate_id: candidateId,
      job_id: jobId,
      criteria_id: criterion.id,
      result,
      details,
    })
    .select()
    .single()

  if (error) throw error

  return data as ScreeningAttempt
}

// ── Queries ────────────────────────────────────────────────────────────────

/**
 * Get screening attempts for a candidate.
 */
export async function getCandidateScreening(
  candidateId: string,
  jobId?: string
): Promise<ScreeningAttempt[]> {
  let query = supabase
    .from('screening_attempts')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })

  if (jobId) {
    query = query.eq('job_id', jobId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ScreeningAttempt[]
}

/**
 * Update screening attempt result (admin only).
 */
export async function reviewAttempt(
  attemptId: string,
  result: 'pass' | 'fail' | 'waived',
  reviewedBy: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('screening_attempts')
    .update({
      result,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      details: { ...((await supabase.from('screening_attempts').select('details').eq('id', attemptId).single()).data?.details ?? {}), admin_notes: notes },
    })
    .eq('id', attemptId)

  if (error) throw error
}
