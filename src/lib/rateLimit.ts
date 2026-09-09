interface RateLimitEntry {
  count: number
  resetAt: number
}

const LS_PREFIX = 'dr_rl_'
const MAX_STORAGE_ENTRIES = 200

function readStore(): Record<string, RateLimitEntry> {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}store`)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, RateLimitEntry>
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, RateLimitEntry>) {
  try {
    const keys = Object.keys(store)
    if (keys.length > MAX_STORAGE_ENTRIES) {
      const sorted = keys
        .map((k) => ({ k, resetAt: store[k].resetAt }))
        .sort((a, b) => a.resetAt - b.resetAt)
      for (const { k } of sorted.slice(0, keys.length - MAX_STORAGE_ENTRIES)) {
        delete store[k]
      }
    }
    localStorage.setItem(`${LS_PREFIX}store`, JSON.stringify(store))
  } catch {
    // storage full — clear old entries
    try { localStorage.removeItem(`${LS_PREFIX}store`) } catch { /* ignore */ }
  }
}

function cleanupExpired(store: Record<string, RateLimitEntry>): Record<string, RateLimitEntry> {
  const now = Date.now()
  let changed = false
  for (const key of Object.keys(store)) {
    if (now > store[key].resetAt) {
      delete store[key]
      changed = true
    }
  }
  return changed ? store : store
}

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const store = cleanupExpired(readStore())
  const entry = store[key]

  if (!entry || now > entry.resetAt) {
    store[key] = { count: 1, resetAt: now + windowMs }
    writeStore(store)
    return true
  }

  if (entry.count >= max) {
    writeStore(store)
    return false
  }

  entry.count++
  writeStore(store)
  return true
}

/**
 * Server-side rate limit check via localStorage (persists across tabs).
 * Falls back to allowing the request if localStorage is unavailable.
 */
export async function checkServerRateLimit(
  action: string,
  maxPerMinute = 10,
  maxPerHour = 100,
): Promise<boolean> {
  const minuteKey = `${LS_PREFIX}${action}_min`
  const hourKey = `${LS_PREFIX}${action}_hr`

  const minuteOk = checkRateLimit(minuteKey, maxPerMinute, 60_000)
  if (!minuteOk) return false

  const hourOk = checkRateLimit(hourKey, maxPerHour, 3_600_000)
  return hourOk
}

export function getRateLimitRemaining(key: string, max: number, _windowMs: number): number {
  const now = Date.now()
  const store = cleanupExpired(readStore())
  const entry = store[key]
  if (!entry || now > entry.resetAt) return max
  return Math.max(0, max - entry.count)
}

export function getRateLimitResetIn(key: string, _windowMs: number): number {
  const store = readStore()
  const entry = store[key]
  if (!entry) return 0
  const remaining = entry.resetAt - Date.now()
  return remaining > 0 ? remaining : 0
}
