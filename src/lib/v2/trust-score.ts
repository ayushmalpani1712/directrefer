// ============================================================================
// DirectRefer V2.0 — Trust Score Engine
// ============================================================================
// Business rule: Score ≥80 = verified, 50-79 = provisional, <50 = unverified
// Components: response_reliability (25), acceptance_rate (25), referral_quality (25), profile_quality (25)
// ============================================================================

import { supabase } from '@/lib/supabase'

export type TrustTier = 'verified' | 'provisional' | 'unverified'

export interface TrustScore {
  user_id: string
  score: number
  tier: TrustTier
  response_reliability: number
  acceptance_rate: number
  referral_quality: number
  profile_quality: number
  calculated_at: string
  version: number
}

// ── Score Calculation ──────────────────────────────────────────────────────

/**
 * Calculate trust score components for a professional.
 * Each component is 0-25 points. Total is 0-100.
 */
export async function calculateTrustScore(userId: string): Promise<TrustScore> {
  const { data: profile } = await supabase
    .from('profiles_professional')
    .select('*')
    .eq('user_id', userId)
    .single()

  const { data: referrals } = await supabase
    .from('referrals')
    .select('status')
    .eq('professional_id', userId)
    .is('deleted_at', null)

  // Component 1: Response Reliability (0-25)
  // Based on avg_reply_hours: <2h = 25, 2-12h = 20, 12-24h = 15, 24-48h = 10, >48h = 5
  const avgHours = profile?.avg_reply_hours ?? 48
  const responseReliability = Math.max(0, Math.min(25,
    avgHours <= 2 ? 25 :
    avgHours <= 12 ? 20 :
    avgHours <= 24 ? 15 :
    avgHours <= 48 ? 10 : 5
  ))

  // Component 2: Acceptance Rate (0-25)
  // accepted / total referrals * 25
  const totalReferrals = referrals?.length ?? 0
  const acceptedReferrals = referrals?.filter(r => r.status === 'accepted').length ?? 0
  const acceptanceRate = totalReferrals > 0
    ? Math.round((acceptedReferrals / totalReferrals) * 25)
    : 0

  // Component 3: Referral Quality (0-25)
  // Based on success_rate: >80% = 25, 60-80% = 20, 40-60% = 15, 20-40% = 10, <20% = 5
  const successRate = profile?.success_rate ?? 0
  const referralQuality = Math.max(0, Math.min(25,
    successRate >= 80 ? 25 :
    successRate >= 60 ? 20 :
    successRate >= 40 ? 15 :
    successRate >= 20 ? 10 : 5
  ))

  // Component 4: Profile Quality (0-25)
  // Based on profile_completeness percentage
  const profileQuality = Math.round((profile?.profile_completeness ?? 0) / 100 * 25)

  const totalScore = responseReliability + acceptanceRate + referralQuality + profileQuality
  const tier = getTier(totalScore)

  return {
    user_id: userId,
    score: totalScore,
    tier,
    response_reliability: responseReliability,
    acceptance_rate: acceptanceRate,
    referral_quality: referralQuality,
    profile_quality: profileQuality,
    calculated_at: new Date().toISOString(),
    version: 1,
  }
}

/**
 * Determine trust tier from score.
 */
export function getTier(score: number): TrustTier {
  if (score >= 80) return 'verified'
  if (score >= 50) return 'provisional'
  return 'unverified'
}

// ── Database Operations ────────────────────────────────────────────────────

/**
 * Recalculate and persist trust score for a user.
 */
export async function recalculateAndPersist(userId: string): Promise<TrustScore> {
  const scoreData = await calculateTrustScore(userId)

  const { data: existing } = await supabase
    .from('trust_scores')
    .select('version')
    .eq('user_id', userId)
    .single()

  const newVersion = (existing?.version ?? 0) + 1

  const { data, error } = await supabase
    .from('trust_scores')
    .upsert({
      user_id: userId,
      score: scoreData.score,
      tier: scoreData.tier,
      response_reliability: scoreData.response_reliability,
      acceptance_rate: scoreData.acceptance_rate,
      referral_quality: scoreData.referral_quality,
      profile_quality: scoreData.profile_quality,
      calculated_at: new Date().toISOString(),
      version: newVersion,
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error
  return data as TrustScore
}

/**
 * Batch recalculate trust scores for all active professionals.
 */
export async function batchRecalculate(): Promise<{ updated: number; errors: string[] }> {
  const { data: professionals } = await supabase
    .from('profiles_professional')
    .select('user_id')
    .eq('open_for_referrals', true)
    .is('deleted_at', null)

  if (!professionals) return { updated: 0, errors: [] }

  let updated = 0
  const errors: string[] = []

  for (const pro of professionals) {
    try {
      await recalculateAndPersist(pro.user_id)
      updated++
    } catch (e) {
      errors.push(`Failed for ${pro.user_id}: ${(e as Error).message}`)
    }
  }

  return { updated, errors }
}

/**
 * Get trust score for a user.
 */
export async function getTrustScore(userId: string): Promise<TrustScore | null> {
  const { data } = await supabase
    .from('trust_scores')
    .select('*')
    .eq('user_id', userId)
    .single()

  return data as TrustScore | null
}

/**
 * Get trust tier display label.
 */
export function getTierLabel(tier: TrustTier): string {
  switch (tier) {
    case 'verified': return 'Verified Professional'
    case 'provisional': return 'Provisional'
    case 'unverified': return 'Unverified'
  }
}

/**
 * Get trust tier color class.
 */
export function getTierColor(tier: TrustTier): string {
  switch (tier) {
    case 'verified': return 'text-emerald-500'
    case 'provisional': return 'text-amber-500'
    case 'unverified': return 'text-muted-foreground'
  }
}

export interface TrustScoreHistoryEntry {
  score: number
  tier: TrustTier
  calculated_at: string
  version: number
}

/**
 * Get trust score history for a user, ordered by version ascending.
 */
export async function getTrustScoreHistory(userId: string): Promise<TrustScoreHistoryEntry[]> {
  const { data } = await supabase
    .from('trust_scores')
    .select('score, tier, calculated_at, version')
    .eq('user_id', userId)
    .order('version', { ascending: true })

  return (data ?? []) as TrustScoreHistoryEntry[]
}

// ── Admin Manual Override ─────────────────────────────────────────────────

export async function manualOverrideTrustScore(
  userId: string,
  score: number,
  tier: string,
  adminId: string,
): Promise<boolean> {
  try {
    const clampedScore = Math.max(0, Math.min(100, Math.round(score)))
    const validatedTier = (['verified', 'provisional', 'unverified'].includes(tier) ? tier : getTier(clampedScore)) as TrustTier

    const { data: existing } = await supabase
      .from('trust_scores')
      .select('version')
      .eq('user_id', userId)
      .single()

    const newVersion = (existing?.version ?? 0) + 1

    const { error: upsertError } = await supabase
      .from('trust_scores')
      .upsert({
        user_id: userId,
        score: clampedScore,
        tier: validatedTier,
        response_reliability: 0,
        acceptance_rate: 0,
        referral_quality: 0,
        profile_quality: 0,
        calculated_at: new Date().toISOString(),
        version: newVersion,
      }, { onConflict: 'user_id' })

    if (upsertError) throw upsertError

    await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminId,
        action: 'manual_trust_override',
        target_id: userId,
        details: { score: clampedScore, tier: validatedTier, previous_version: (existing?.version ?? 0) },
      })

    return true
  } catch {
    return false
  }
}
