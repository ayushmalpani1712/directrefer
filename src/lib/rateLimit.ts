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
 * Currently disabled — the rate_limit_check RPC has not been deployed yet.
 * Client-side checkRateLimit() above handles enforcement.
 */
export async function checkServerRateLimit(
  _action: string,
  _maxPerMinute = 10,
  _maxPerHour = 100,
): Promise<boolean> {
  return true
}
