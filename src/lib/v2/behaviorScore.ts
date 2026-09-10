import { supabase } from '@/lib/supabase'
import { getTrustScore } from './trust-score'
import type { TrustScore } from './trust-score'

export interface BehaviorAdjustment {
  id: string
  user_id: string
  adjustment: number
  reason: string
  category: string
  created_at: string
}

// ── Core Operations ────────────────────────────────────────────────────────

export async function recordBehaviorAdjustment(
  userId: string,
  adjustment: number,
  reason: string,
  category: string,
): Promise<BehaviorAdjustment | null> {
  const { data, error } = await supabase
    .from('trust_score_adjustments')
    .insert({
      user_id: userId,
      adjustment,
      reason,
      category,
    })
    .select()
    .single()

  if (error) throw error
  return data as BehaviorAdjustment
}

export async function getBehaviorAdjustments(userId: string): Promise<BehaviorAdjustment[]> {
  const { data, error } = await supabase
    .from('trust_score_adjustments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data ?? []) as BehaviorAdjustment[]
}

// ── Auto-Adjustment Triggers ───────────────────────────────────────────────

export async function onReferralAccepted(professionalId: string): Promise<void> {
  await recordBehaviorAdjustment(
    professionalId,
    +2,
    'Referral accepted',
    'referral_response',
  )
}

export async function onReferralRejected(professionalId: string): Promise<void> {
  await recordBehaviorAdjustment(
    professionalId,
    -1,
    'Referral rejected',
    'referral_response',
  )
}

export async function onLateResponse(professionalId: string, hours: number): Promise<void> {
  if (hours > 48) {
    await recordBehaviorAdjustment(
      professionalId,
      -3,
      `Late response (${Math.round(hours)}h, exceeded 48h limit)`,
      'response_time',
    )
  }
}

export async function onScreeningPassed(candidateId: string): Promise<void> {
  await recordBehaviorAdjustment(
    candidateId,
    +5,
    'Passed screening',
    'screening',
  )
}

export async function onInactivity(userId: string, days: number): Promise<void> {
  if (days > 30) {
    await recordBehaviorAdjustment(
      userId,
      -2,
      `Inactive for ${days} days`,
      'inactivity',
    )
  }
}

// ── Apply Adjustments to Trust Score ───────────────────────────────────────

export async function applyBehaviorAdjustments(userId: string): Promise<TrustScore | null> {
  const { data: adjustments, error } = await supabase
    .from('trust_score_adjustments')
    .select('adjustment')
    .eq('user_id', userId)

  if (error) throw error

  const totalAdjustment = (adjustments ?? []).reduce(
    (sum, a) => sum + (a.adjustment ?? 0),
    0,
  )

  if (totalAdjustment === 0) {
    return await getTrustScore(userId)
  }

  const currentScore = await getTrustScore(userId)
  const baseScore = currentScore?.score ?? 50
  const adjustedScore = Math.max(0, Math.min(100, baseScore + totalAdjustment))

  const { data, error: updateError } = await supabase
    .from('trust_scores')
    .upsert({
      user_id: userId,
      score: adjustedScore,
      tier: adjustedScore >= 80 ? 'verified' : adjustedScore >= 50 ? 'provisional' : 'unverified',
      calculated_at: new Date().toISOString(),
      version: (currentScore?.version ?? 0) + 1,
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (updateError) throw updateError
  return data as TrustScore
}
