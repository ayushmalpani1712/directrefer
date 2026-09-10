// ============================================================================
// DirectRefer V2.0 — Referral Incentive Tracking
// ============================================================================
// Manages incentive awards, approvals, and balance tracking for professionals
// who successfully refer candidates.
// ============================================================================

import { supabase } from '@/lib/supabase'

export type IncentiveType = 'points' | 'badge' | 'monetary'
export type IncentiveStatus = 'pending' | 'approved' | 'paid'

export interface Incentive {
  id: string
  referral_id: string
  professional_id: string
  incentive_type: IncentiveType
  amount: number
  status: IncentiveStatus
  approved_by: string | null
  approved_at: string | null
  paid_at: string | null
  created_at: string
}

export interface IncentiveSummary {
  total_points: number
  total_badges: number
  total_monetary: number
  pending_count: number
  approved_count: number
  paid_count: number
}

// ── CRUD Operations ────────────────────────────────────────────────────────

/**
 * Award an incentive for a completed referral.
 */
export async function awardIncentive(
  referralId: string,
  professionalId: string,
  type: IncentiveType,
  amount: number
): Promise<Incentive> {
  const { data, error } = await supabase
    .from('referral_incentives')
    .insert({
      referral_id: referralId,
      professional_id: professionalId,
      incentive_type: type,
      amount,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data as Incentive
}

/**
 * Fetch all incentives for a professional.
 */
export async function getIncentives(
  professionalId: string,
  type?: IncentiveType
): Promise<Incentive[]> {
  let query = supabase
    .from('referral_incentives')
    .select('*')
    .eq('professional_id', professionalId)
    .order('created_at', { ascending: false })

  if (type) {
    query = query.eq('incentive_type', type)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Incentive[]
}

/**
 * Get total incentives summed by type for a professional.
 */
export async function getTotalIncentives(
  professionalId: string
): Promise<IncentiveSummary> {
  const incentives = await getIncentives(professionalId)

  const summary: IncentiveSummary = {
    total_points: 0,
    total_badges: 0,
    total_monetary: 0,
    pending_count: 0,
    approved_count: 0,
    paid_count: 0,
  }

  for (const inc of incentives) {
    if (inc.incentive_type === 'points') summary.total_points += inc.amount
    else if (inc.incentive_type === 'badge') summary.total_badges += inc.amount
    else if (inc.incentive_type === 'monetary') summary.total_monetary += inc.amount

    if (inc.status === 'pending') summary.pending_count++
    else if (inc.status === 'approved') summary.approved_count++
    else if (inc.status === 'paid') summary.paid_count++
  }

  return summary
}

/**
 * Approve a pending incentive (admin action).
 */
export async function approveIncentive(
  incentiveId: string,
  approvedBy: string
): Promise<Incentive> {
  const { data, error } = await supabase
    .from('referral_incentives')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', incentiveId)
    .select()
    .single()

  if (error) throw error
  return data as Incentive
}

/**
 * Auto-award points when a referral is accepted.
 * Awards +100 points to the professional.
 */
export async function autoAwardOnAcceptance(
  referralId: string,
  professionalId: string
): Promise<Incentive | null> {
  try {
    return await awardIncentive(referralId, professionalId, 'points', 100)
  } catch (err) {
    console.error('Failed to auto-award incentive:', err)
    return null
  }
}
