// ============================================================================
// DirectRefer V2.0 — Matching Engine
// ============================================================================
// Produces ranked candidate-to-professional matches.
// Scoring: skill_overlap (40), experience_relevance (25), preference_fit (20),
//          location_proximity (10), recency (5)
// ============================================================================

import { supabase } from '@/lib/supabase'
import { getTrustScore, type TrustScore, type TrustTier } from './trust-score'

const TIER_ORDER: Record<TrustTier, number> = {
  unverified: 0,
  provisional: 1,
  verified: 2,
}

export interface MatchCandidate {
  user_id: string
  full_name: string
  email: string
  skills: string[]          // skill IDs
  experience_years: number
  education: string
  location: string
  open_to_work: boolean
}

export interface MatchProfessional {
  user_id: string
  full_name: string
  company: string
  role: string
  skills: string[]          // skill IDs
  experience_years: number
  industries: string[]
  locations: string[]
  open_for_referrals: boolean
  trust_score: TrustScore | null
}

export interface MatchResult {
  candidate_id: string
  professional_id: string
  job_id: string
  score: number
  breakdown: {
    skill_overlap: number
    experience_relevance: number
    preference_fit: number
    location_proximity: number
    recency: number
  }
  confidence: 'high' | 'medium' | 'low'
  explanation: string[]
}

// ── Scoring Algorithm ──────────────────────────────────────────────────────

/**
 * Calculate match score between a candidate and professional for a specific job.
 */
export function calculateMatchScore(
  candidate: MatchCandidate,
  professional: MatchProfessional,
  jobRequiredSkills: string[],
  jobLocation?: string,
  jobIndustries?: string[]
): MatchResult {
  // Skill Overlap (0-40)
  const candidateSkills = new Set(candidate.skills)
  const professionalSkills = new Set(professional.skills)
  const jobRequired = new Set(jobRequiredSkills)

  const matchingRequired = jobRequiredSkills.filter(s =>
    candidateSkills.has(s) && professionalSkills.has(s)
  )
  const skillScore = jobRequired.size > 0
    ? Math.round((matchingRequired.length / jobRequired.size) * 40)
    : 0

  // Experience Relevance (0-25)
  const expDiff = Math.abs(candidate.experience_years - professional.experience_years)
  const experienceScore = Math.max(0, Math.round(
    25 * Math.exp(-expDiff / 5)  // decay factor
  ))

  // Preference Fit (0-20)
  let preferenceScore = 0
  // Industry overlap
  if (jobIndustries && professional.industries.length > 0) {
    const industryOverlap = jobIndustries.filter(i =>
      professional.industries.includes(i)
    ).length
    preferenceScore += Math.round((industryOverlap / jobIndustries.length) * 10)
  }
  // Location preference
  if (jobLocation && professional.locations.includes(jobLocation)) {
    preferenceScore += 5
  }
  // Education level match
  if (candidate.education === 'masters' || candidate.education === 'phd') {
    preferenceScore += 5
  }
  preferenceScore = Math.min(20, preferenceScore)

  // Location Proximity (0-10)
  let locationScore = 0
  if (jobLocation) {
    if (professional.locations.includes(jobLocation)) {
      locationScore = 10
    } else if (professional.locations.some(l =>
      l.toLowerCase().includes(jobLocation.toLowerCase().split(',')[1]?.trim() ?? '')
    )) {
      locationScore = 6
    } else {
      locationScore = 3 // assume remote possible
    }
  } else {
    locationScore = 7 // no location preference, assume flexible
  }

  // Recency (0-5) — based on professional's last_active
  const daysSinceActive = professional.trust_score?.calculated_at
    ? (Date.now() - new Date(professional.trust_score.calculated_at).getTime()) / (1000 * 60 * 60 * 24)
    : 30
  const recencyScore = Math.max(0, Math.round(5 * Math.exp(-daysSinceActive / 7)))

  const totalScore = skillScore + experienceScore + preferenceScore + locationScore + recencyScore

  const confidence: MatchResult['confidence'] =
    totalScore >= 70 ? 'high' :
    totalScore >= 45 ? 'medium' : 'low'

  const explanation: string[] = []

  const skillPct = jobRequired.size > 0 ? Math.round((matchingRequired.length / jobRequired.size) * 100) : 0
  if (skillPct >= 60) {
    explanation.push(`Strong skill overlap (${skillPct}%)`)
  } else if (skillPct >= 30) {
    explanation.push(`Moderate skill overlap (${skillPct}%)`)
  }

  if (experienceScore >= 20) {
    explanation.push('Similar experience level')
  } else if (experienceScore >= 10) {
    explanation.push('Compatible experience range')
  }

  if (jobIndustries && professional.industries.length > 0) {
    const industryOverlap = jobIndustries.filter(i =>
      professional.industries.includes(i)
    ).length
    if (industryOverlap > 0) {
      explanation.push('Same industry preference')
    }
  }

  if (locationScore >= 8) {
    explanation.push('Location match')
  } else if (locationScore >= 5) {
    explanation.push('Nearby location')
  }

  if (recencyScore >= 3) {
    explanation.push('Active professional')
  }

  return {
    candidate_id: candidate.user_id,
    professional_id: professional.user_id,
    job_id: '',
    score: totalScore,
    breakdown: {
      skill_overlap: skillScore,
      experience_relevance: experienceScore,
      preference_fit: preferenceScore,
      location_proximity: locationScore,
      recency: recencyScore,
    },
    confidence,
    explanation,
  }
}

// ── Matching Operations ────────────────────────────────────────────────────

/**
 * Find top matches for a job seeker against available professionals.
 */
export async function findMatchesForJobSeeker(
  candidateId: string,
  jobId: string,
  limit = 10,
  minTrustTier?: TrustTier
): Promise<MatchResult[]> {
  // Get candidate profile
  const { data: seekerProfile } = await supabase
    .from('profiles_job_seeker')
    .select('*')
    .eq('user_id', candidateId)
    .single()

  if (!seekerProfile) throw new Error('Job seeker profile not found')

  // Get candidate skills
  const { data: profileSkills } = await supabase
    .from('profile_skills')
    .select('skill_id')
    .eq('profile_id', candidateId)

  const candidateSkills = (profileSkills ?? []).map(s => s.skill_id)

  // Get job details
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (!job) throw new Error('Job not found')

  // Get job required skills
  const { data: jobSkills } = await supabase
    .from('job_skills')
    .select('skill_id')
    .eq('job_id', jobId)

  const jobRequiredSkills = (jobSkills ?? []).map(s => s.skill_id)

  // Get available professionals
  const { data: professionals } = await supabase
    .from('profiles_professional')
    .select('*')
    .eq('open_for_referrals', true)
    .is('deleted_at', null)

  if (!professionals) return []

  // Get professional skills and trust scores
  const matches: MatchResult[] = []

  for (const pro of professionals) {
    const { data: proSkills } = await supabase
      .from('profile_skills')
      .select('skill_id')
      .eq('profile_id', pro.user_id)

    const proSkillIds = (proSkills ?? []).map(s => s.skill_id)
    const trustScore = await getTrustScore(pro.user_id)

    // Trust-tier filtering
    if (minTrustTier && trustScore) {
      if (TIER_ORDER[trustScore.tier] < TIER_ORDER[minTrustTier]) continue
    } else if (minTrustTier && !trustScore) {
      continue
    }

    // Capacity checking
    const { data: capacity } = await supabase
      .from('professional_capacities')
      .select('max_capacity, used')
      .eq('user_id', pro.user_id)
      .single()

    if (capacity && capacity.used >= capacity.max_capacity) continue

    const matchCandidate: MatchCandidate = {
      user_id: candidateId,
      full_name: seekerProfile.full_name ?? '',
      email: seekerProfile.email ?? '',
      skills: candidateSkills,
      experience_years: seekerProfile.experience_years ?? 0,
      education: seekerProfile.education ?? '',
      location: seekerProfile.location ?? '',
      open_to_work: seekerProfile.open_to_work ?? false,
    }

    const matchProfessional: MatchProfessional = {
      user_id: pro.user_id,
      full_name: pro.full_name ?? '',
      company: pro.company ?? '',
      role: pro.role ?? '',
      skills: proSkillIds,
      experience_years: pro.years_of_experience ?? 0,
      industries: pro.industries ?? [],
      locations: pro.preferred_locations ?? [],
      open_for_referrals: pro.open_for_referrals ?? false,
      trust_score: trustScore,
    }

    const result = calculateMatchScore(
      matchCandidate,
      matchProfessional,
      jobRequiredSkills,
      job.location
    )

    result.job_id = jobId
    matches.push(result)
  }

  // Sort by score descending, return top N
  matches.sort((a, b) => b.score - a.score)
  return matches.slice(0, limit)
}

/**
 * Find top matches for a professional (who candidates to refer).
 */
export async function findMatchesForProfessional(
  professionalId: string,
  limit = 10
): Promise<MatchResult[]> {
  // Get professional profile
  const { data: proProfile } = await supabase
    .from('profiles_professional')
    .select('*')
    .eq('user_id', professionalId)
    .single()

  if (!proProfile) throw new Error('Professional profile not found')

  // Check capacity for this professional
  const { data: capacity } = await supabase
    .from('professional_capacities')
    .select('max_capacity, used')
    .eq('user_id', professionalId)
    .single()

  if (capacity && capacity.used >= capacity.max_capacity) return []

  // Get professional skills
  const { data: proSkills } = await supabase
    .from('profile_skills')
    .select('skill_id')
    .eq('profile_id', professionalId)

  const proSkillIds = (proSkills ?? []).map(s => s.skill_id)

  // Get open jobs
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'open')
    .is('deleted_at', null)

  if (!jobs) return []

  const matches: MatchResult[] = []

  for (const job of jobs) {
    // Get job required skills
    const { data: jobSkills } = await supabase
      .from('job_skills')
      .select('skill_id')
      .eq('job_id', job.id)

    const jobRequiredSkills = (jobSkills ?? []).map(s => s.skill_id)

    // Get job seekers who match
    const { data: seekers } = await supabase
      .from('profiles_job_seeker')
      .select('*')
      .eq('open_to_work', true)
      .is('deleted_at', null)

    if (!seekers) continue

    for (const seeker of seekers) {
      const { data: seekerSkills } = await supabase
        .from('profile_skills')
        .select('skill_id')
        .eq('profile_id', seeker.user_id)

      const seekerSkillIds = (seekerSkills ?? []).map(s => s.skill_id)

      const trustScore = await getTrustScore(professionalId)

      const matchCandidate: MatchCandidate = {
        user_id: seeker.user_id,
        full_name: seeker.full_name ?? '',
        email: seeker.email ?? '',
        skills: seekerSkillIds,
        experience_years: seeker.experience_years ?? 0,
        education: seeker.education ?? '',
        location: seeker.location ?? '',
        open_to_work: seeker.open_to_work ?? false,
      }

      const matchProfessional: MatchProfessional = {
        user_id: professionalId,
        full_name: proProfile.full_name ?? '',
        company: proProfile.company ?? '',
        role: proProfile.role ?? '',
        skills: proSkillIds,
        experience_years: proProfile.years_of_experience ?? 0,
        industries: proProfile.industries ?? [],
        locations: proProfile.preferred_locations ?? [],
        open_for_referrals: proProfile.open_for_referrals ?? false,
        trust_score: trustScore,
      }

      const result = calculateMatchScore(
        matchCandidate,
        matchProfessional,
        jobRequiredSkills,
        job.location
      )

      result.job_id = job.id
      matches.push(result)
    }
  }

  matches.sort((a, b) => b.score - a.score)
  return matches.slice(0, limit)
}

/**
 * Store match results in the matches table.
 */
export async function storeMatches(matches: MatchResult[]): Promise<void> {
  const rows = matches.map(m => ({
    candidate_id: m.candidate_id,
    professional_id: m.professional_id,
    job_id: m.job_id,
    score: m.score,
    breakdown: m.breakdown,
    confidence: m.confidence,
    explanation: m.explanation,
  }))

  const { error } = await supabase
    .from('matches')
    .upsert(rows, { onConflict: 'candidate_id,professional_id,job_id' })

  if (error) throw error

  try {
    const { notifyNewMatch } = await import('@/lib/notifications')
    for (const m of matches) {
      const { data: candidateProfile } = await supabase
        .from('profiles_job_seeker')
        .select('full_name')
        .eq('user_id', m.candidate_id)
        .single()
      const { data: job } = await supabase
        .from('jobs')
        .select('title')
        .eq('id', m.job_id)
        .single()
      if (candidateProfile?.full_name && job?.title) {
        notifyNewMatch(candidateProfile.full_name, job.title, m.score)
      }
    }
  } catch {
    // Non-critical — notification failure should not break match storage
  }
}

/**
 * Get matches for a specific job.
 */
export async function getJobMatches(jobId: string): Promise<MatchResult[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('job_id', jobId)
    .order('score', { ascending: false })

  if (error) throw error
  return (data ?? []) as MatchResult[]
}

// ── Job Recommendation Engine ───────────────────────────────────────────────

export interface JobRecommendation {
  job_id: string
  title: string
  company: string
  location: string
  score: number
  matching_skills: string[]
  skill_overlap_pct: number
  experience_fit: number
}

/**
 * Recommend jobs for a candidate based on skill overlap and experience fit.
 */
export async function recommendJobsForCandidate(
  candidateId: string,
  limit = 10
): Promise<JobRecommendation[]> {
  const { data: profileSkills } = await supabase
    .from('profile_skills')
    .select('skill_id')
    .eq('profile_id', candidateId)

  const candidateSkills = (profileSkills ?? []).map((s) => s.skill_id)
  if (candidateSkills.length === 0) return []

  const { data: seekerProfile } = await supabase
    .from('profiles_job_seeker')
    .select('experience_years')
    .eq('user_id', candidateId)
    .single()

  const candidateExp = seekerProfile?.experience_years ?? 0

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, company_name, location, min_experience_years, max_experience_years')
    .eq('status', 'open')
    .is('deleted_at', null)

  if (!jobs) return []

  const recommendations: JobRecommendation[] = []

  for (const job of jobs) {
    const { data: jobSkills } = await supabase
      .from('job_skills')
      .select('skill_id, skills(name)')
      .eq('job_id', job.id)

    const jobRequiredSkills = (jobSkills ?? []).map((s) => s.skill_id)
    const jobSkillNames = (jobSkills ?? [])
      .map((s) => (s.skills as unknown as { name: string } | null)?.name)
      .filter(Boolean) as string[]

    if (jobRequiredSkills.length === 0) continue

    const matchingSkills = jobRequiredSkills.filter((s) => candidateSkills.includes(s))
    const skillOverlapPct = Math.round((matchingSkills.length / jobRequiredSkills.length) * 100)

    let experienceFit = 1.0
    const minExp = job.min_experience_years ?? 0
    const maxExp = job.max_experience_years ?? Infinity
    if (candidateExp < minExp) {
      experienceFit = Math.max(0.3, candidateExp / minExp)
    } else if (candidateExp > maxExp && maxExp !== Infinity) {
      experienceFit = Math.max(0.5, maxExp / candidateExp)
    }

    const score = Math.round(skillOverlapPct * 0.7 + experienceFit * 30)

    if (skillOverlapPct > 0) {
      recommendations.push({
        job_id: job.id,
        title: job.title,
        company: job.company_name ?? '',
        location: job.location ?? '',
        score,
        matching_skills: jobSkillNames.filter((_, i) => matchingSkills.includes(jobRequiredSkills[i])),
        skill_overlap_pct: skillOverlapPct,
        experience_fit: experienceFit,
      })
    }
  }

  recommendations.sort((a, b) => b.score - a.score)
  return recommendations.slice(0, limit)
}

// ── Skill Gap Analysis ──────────────────────────────────────────────────────

export interface SkillGapResult {
  matching: string[]
  missing: string[]
  extra: string[]
  gap_score: number
}

/**
 * Analyze skill gap between candidate skills and job required skills.
 */
export function getSkillGap(
  candidateSkills: string[],
  jobRequiredSkills: string[]
): SkillGapResult {
  const candidateSet = new Set(candidateSkills.map((s) => s.toLowerCase()))
  const requiredSet = new Set(jobRequiredSkills.map((s) => s.toLowerCase()))

  const matching = jobRequiredSkills.filter((s) => candidateSet.has(s.toLowerCase()))
  const missing = jobRequiredSkills.filter((s) => !candidateSet.has(s.toLowerCase()))
  const extra = candidateSkills.filter((s) => !requiredSet.has(s.toLowerCase()))

  const gapScore = jobRequiredSkills.length > 0
    ? Math.round((matching.length / jobRequiredSkills.length) * 100)
    : 100

  return { matching, missing, extra, gap_score: gapScore }
}
