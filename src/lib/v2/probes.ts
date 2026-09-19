// ============================================================================
// DirectRefer V2.0 — Database Probe Checks
// ============================================================================
// Probes whether V2 tables exist. Caches in memory + localStorage.
// Used for graceful degradation when tables are missing.
// ============================================================================

import { supabase } from '@/lib/supabase'

const LS_PREFIX = 'dr_v2_probe_'

function readLs(key: string): boolean | null {
  try {
    const v = localStorage.getItem(LS_PREFIX + key)
    if (v === '1') return true
    if (v === '0') return false
  } catch { /* private mode or quota */ }
  return null
}

function writeLs(key: string, val: boolean) {
  try { localStorage.setItem(LS_PREFIX + key, val ? '1' : '0') } catch { /* private mode or quota */ }
}

let _trustScores: boolean | null = null
let _stateHistory: boolean | null = null
let _screening: boolean | null = null
let _applications: boolean | null = null
let _matches: boolean | null = null

async function probe(
  tableName: string,
  lsKey: string,
  selectCol: string,
): Promise<boolean> {
  const ls = readLs(lsKey)
  if (ls !== null) return ls
  try {
    const { error } = await supabase.from(tableName).select(selectCol).limit(1)
    const ok = !error
    writeLs(lsKey, ok)
    return ok
  } catch {
    writeLs(lsKey, false)
    return false
  }
}

export async function trustScoresSupported(): Promise<boolean> {
  if (_trustScores !== null) return _trustScores
  _trustScores = await probe('trust_scores', 'trust_scores', 'user_id')
  return _trustScores
}

export async function stateHistorySupported(): Promise<boolean> {
  if (_stateHistory !== null) return _stateHistory
  _stateHistory = await probe('state_history', 'state_history', 'id')
  return _stateHistory
}

export async function screeningSupported(): Promise<boolean> {
  if (_screening !== null) return _screening
  _screening = await probe('screening_criteria', 'screening', 'id')
  return _screening
}

export async function applicationsSupported(): Promise<boolean> {
  if (_applications !== null) return _applications
  _applications = await probe('applications', 'applications', 'id')
  return _applications
}

export async function matchesSupported(): Promise<boolean> {
  if (_matches !== null) return _matches
  _matches = await probe('matches', 'matches', 'id')
  return _matches
}

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
