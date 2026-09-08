// ============================================================================
// DirectRefer V2.0 — Database Probe Checks
// ============================================================================
// Probes whether V2 tables exist. Caches result. Used for graceful degradation.
// ============================================================================

import { supabase } from '@/lib/supabase'

let trustScoresSupportedCache: boolean | null = null
let stateHistorySupportedCache: boolean | null = null
let screeningSupportedCache: boolean | null = null
let applicationsSupportedCache: boolean | null = null
let matchesSupportedCache: boolean | null = null

/**
 * Check if trust_scores table exists.
 */
export async function trustScoresSupported(): Promise<boolean> {
  if (trustScoresSupportedCache !== null) return trustScoresSupportedCache
  try {
    const { error } = await supabase
      .from('trust_scores')
      .select('user_id')
      .limit(1)
    trustScoresSupportedCache = !error
  } catch {
    trustScoresSupportedCache = false
  }
  return trustScoresSupportedCache
}

/**
 * Check if state_history table exists.
 */
export async function stateHistorySupported(): Promise<boolean> {
  if (stateHistorySupportedCache !== null) return stateHistorySupportedCache
  try {
    const { error } = await supabase
      .from('state_history')
      .select('id')
      .limit(1)
    stateHistorySupportedCache = !error
  } catch {
    stateHistorySupportedCache = false
  }
  return stateHistorySupportedCache
}

/**
 * Check if screening_criteria table exists.
 */
export async function screeningSupported(): Promise<boolean> {
  if (screeningSupportedCache !== null) return screeningSupportedCache
  try {
    const { error } = await supabase
      .from('screening_criteria')
      .select('id')
      .limit(1)
    screeningSupportedCache = !error
  } catch {
    screeningSupportedCache = false
  }
  return screeningSupportedCache
}

/**
 * Check if applications table exists.
 */
export async function applicationsSupported(): Promise<boolean> {
  if (applicationsSupportedCache !== null) return applicationsSupportedCache
  try {
    const { error } = await supabase
      .from('applications')
      .select('id')
      .limit(1)
    applicationsSupportedCache = !error
  } catch {
    applicationsSupportedCache = false
  }
  return applicationsSupportedCache
}

/**
 * Check if matches table exists.
 */
export async function matchesSupported(): Promise<boolean> {
  if (matchesSupportedCache !== null) return matchesSupportedCache
  try {
    const { error } = await supabase
      .from('matches')
      .select('id')
      .limit(1)
    matchesSupportedCache = !error
  } catch {
    matchesSupportedCache = false
  }
  return matchesSupportedCache
}

/**
 * Check all V2 features at once.
 */
export async function getV2FeatureFlags(): Promise<{
  trustScores: boolean
  stateHistory: boolean
  screening: boolean
  applications: boolean
  matches: boolean
}> {
  const [trustScores, stateHistory, screening, applications, matches] = await Promise.all([
    trustScoresSupported(),
    stateHistorySupported(),
    screeningSupported(),
    applicationsSupported(),
    matchesSupported(),
  ])
  return { trustScores, stateHistory, screening, applications, matches }
}
