// ============================================================================
// Direct Refer — Lifecycle Service (Supabase Free Tier)
// ============================================================================
// All operations call Supabase RPC functions. No pg_cron needed.
// Pipeline auto-runs on app load with 30-min cooldown.
// ============================================================================

import { supabase } from '@/lib/supabase'

export interface LifecycleJob {
  id: string
  job_type: string
  status: string
  started_at: string
  completed_at: string | null
  rows_affected: number
  details: Record<string, unknown> | null
}

export interface SystemSnapshot {
  snapshot_date: string
  total_users: number
  total_referrals: number
  total_messages: number
  total_notifications: number
  total_jobs: number
}

export interface RetentionPolicy {
  table_name: string
  category: 'permanent' | 'temporary' | 'analytics'
  retention_days: number | null
  description: string | null
  enabled: boolean
}

// ── Pipeline ───────────────────────────────────────────────────

export async function runLifecyclePipeline(): Promise<{
  steps: Array<{ step: string; status: string; detail: string }>
  error?: string
}> {
  try {
    const { data, error } = await supabase.rpc('lifecycle_run_pipeline')
    if (error) return { steps: [], error: error.message }
    return { steps: data as Array<{ step: string; status: string; detail: string }> }
  } catch (err) {
    return { steps: [], error: String(err) }
  }
}

export async function runCleanup(): Promise<{
  results: Array<{ table_name: string; rows_deleted: number }>
  error?: string
}> {
  try {
    const { data, error } = await supabase.rpc('lifecycle_cleanup_expired')
    if (error) return { results: [], error: error.message }
    return { results: data as Array<{ table_name: string; rows_deleted: number }> }
  } catch (err) {
    return { results: [], error: String(err) }
  }
}

// ── Snapshots ──────────────────────────────────────────────────

export async function fetchSnapshots(days = 30): Promise<{
  data: SystemSnapshot[]
  error?: string
}> {
  try {
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)
    const { data, error } = await supabase
      .from('lifecycle_snapshots')
      .select('*')
      .gte('snapshot_date', fromDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true })
    if (error) return { data: [], error: error.message }
    return { data: (data || []) as SystemSnapshot[] }
  } catch (err) {
    return { data: [], error: String(err) }
  }
}

// ── Retention ──────────────────────────────────────────────────

export async function fetchRetentionPolicies(): Promise<{
  data: RetentionPolicy[]
  error?: string
}> {
  try {
    const { data, error } = await supabase.from('lifecycle_retention').select('*').order('category')
    if (error) return { data: [], error: error.message }
    return { data: (data || []) as RetentionPolicy[] }
  } catch (err) {
    return { data: [], error: String(err) }
  }
}

// ── Jobs ───────────────────────────────────────────────────────

export async function fetchLifecycleJobs(limit = 20): Promise<{
  data: LifecycleJob[]
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from('lifecycle_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)
    if (error) return { data: [], error: error.message }
    return { data: (data || []) as LifecycleJob[] }
  } catch (err) {
    return { data: [], error: String(err) }
  }
}

// ── Auto-run (non-blocking) ───────────────────────────────────

let lastRun: number | null = null
const COOLDOWN_MS = 30 * 60 * 1000

export function maybeRunPipeline(): void {
  if (lastRun && Date.now() - lastRun < COOLDOWN_MS) return
  lastRun = Date.now()
  runLifecyclePipeline().catch(() => {})
}
