// ============================================================================
// DirectRefer V2.0 — State History Engine
// ============================================================================
// Immutable append-only audit trail for referrals, applications, matches.
// Business rule: state_history must never be updated or deleted.
// ============================================================================

import { supabase } from '@/lib/supabase'

export type EntityType = 'referral' | 'application' | 'match' | 'screening'

export interface StateHistoryEntry {
  id: string
  entity_type: EntityType
  entity_id: string
  field: string
  old_value: string | null
  new_value: string
  changed_by: string | null
  reason: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// ── Recording ──────────────────────────────────────────────────────────────

/**
 * Record a state transition. This is an immutable append-only operation.
 */
export async function recordStateTransition(params: {
  entity_type: EntityType
  entity_id: string
  from_state: string | null
  to_state: string
  triggered_by?: string | null
  metadata?: Record<string, unknown> | null
}): Promise<StateHistoryEntry> {
  if (!isValidTransition(params.entity_type, params.from_state, params.to_state)) {
    console.warn(`Invalid transition: ${params.entity_type} ${params.from_state} → ${params.to_state}`)
  }
  const { data, error } = await supabase
    .from('state_history')
    .insert({
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      field: 'status',
      old_value: params.from_state,
      new_value: params.to_state,
      changed_by: params.triggered_by ?? null,
      reason: params.metadata?.reason as string ?? null,
      metadata: params.metadata ?? {},
    })
    .select()
    .single()

  if (error) throw error
  return data as StateHistoryEntry
}

// ── Querying ───────────────────────────────────────────────────────────────

/**
 * Get full state history for an entity, newest first.
 */
export async function getEntityHistory(
  entityType: EntityType,
  entityId: string
): Promise<StateHistoryEntry[]> {
  const { data, error } = await supabase
    .from('state_history')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as StateHistoryEntry[]
}

/**
 * Get all state transitions for a user across all entities.
 */
export async function getUserStateHistory(
  userId: string,
  limit = 50
): Promise<StateHistoryEntry[]> {
  const { data, error } = await supabase
    .from('state_history')
    .select('*')
    .eq('changed_by', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as StateHistoryEntry[]
}

/**
 * Get state transitions within a time range.
 */
export async function getHistoryByDateRange(
  from: Date,
  to: Date,
  entityType?: EntityType
): Promise<StateHistoryEntry[]> {
  let query = supabase
    .from('state_history')
    .select('*')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at', { ascending: false })

  if (entityType) {
    query = query.eq('entity_type', entityType)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as StateHistoryEntry[]
}

/**
 * Get current state of an entity from its history.
 */
export async function getCurrentState(
  entityType: EntityType,
  entityId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('state_history')
    .select('new_value')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return (data as { new_value: string } | null)?.new_value ?? null
}

// ── Analytics ──────────────────────────────────────────────────────────────

/**
 * Get state transition counts for an entity type.
 */
export async function getStateTransitionCounts(
  entityType: EntityType,
  since?: Date
): Promise<Record<string, number>> {
  let query = supabase
    .from('state_history')
    .select('new_value')
    .eq('entity_type', entityType)

  if (since) {
    query = query.gte('created_at', since.toISOString())
  }

  const { data, error } = await query
  if (error) throw error

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.new_value] = (counts[row.new_value] ?? 0) + 1
  }
  return counts
}

/**
 * Get average time in each state for referrals.
 */
export async function getAvgTimeInState(
  entityId: string
): Promise<Record<string, number>> {
  const history = await getEntityHistory('referral', entityId)
  const durations: Record<string, number> = {}

  for (let i = 0; i < history.length - 1; i++) {
    const from = new Date(history[i].created_at)
    const to = new Date(history[i + 1].created_at)
    const hours = (to.getTime() - from.getTime()) / (1000 * 60 * 60)
    durations[history[i].new_value] = (durations[history[i].new_value] ?? 0) + hours
  }

  return durations
}

// ── Validation ─────────────────────────────────────────────────────────────

/**
 * Valid state transitions for referrals.
 */
export const REFERRAL_TRANSITIONS: Record<string, string[]> = {
  requested: ['under_review', 'declined'],
  under_review: ['accepted', 'declined'],
  accepted: ['referral_submitted', 'declined'],
  referral_submitted: ['application_submitted', 'closed'],
  application_submitted: ['closed'],
  declined: [],
  closed: [],
}

/**
 * Check if a state transition is valid.
 */
export function isValidTransition(
  entityType: EntityType,
  fromState: string | null,
  toState: string
): boolean {
  if (entityType === 'referral') {
    if (fromState === null) return toState === 'requested'
    const allowed = REFERRAL_TRANSITIONS[fromState]
    return allowed ? allowed.includes(toState) : false
  }
  // Application, match, screening transitions follow similar patterns
  return true
}
