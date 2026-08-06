import { supabase } from '@/lib/supabase'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

/**
 * Client-side rate limit check (instant feedback, per-tab)
 */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= max) {
    return false
  }

  entry.count++
  return true
}

/**
 * Server-side rate limit check via Supabase RPC.
 * Call this in addition to client-side check for real enforcement.
 * Returns true if allowed, false if rate limited.
 */
export async function checkServerRateLimit(
  action: string,
  maxPerMinute = 10,
  maxPerHour = 100,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('rate_limit_check', {
      p_action: action,
      p_max_per_minute: maxPerMinute,
      p_max_per_hour: maxPerHour,
    })
    if (error) return true // fail open — don't block on RPC errors
    return (data as { allowed?: boolean })?.allowed !== false
  } catch {
    return true // fail open
  }
}
