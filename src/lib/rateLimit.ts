import { useCallback, useRef } from 'react'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

/**
 * Simple client-side rate limiter.
 * Usage: const { check, reset } = useRateLimit('referral-request', { max: 5, windowMs: 60_000 })
 * if (!check()) return toast.error('Too many requests')
 */
export function useRateLimit(key: string, opts: { max: number; windowMs: number }) {
  const keyRef = useRef(key)
  keyRef.current = key

  const check = useCallback(() => {
    const now = Date.now()
    const entry = store.get(keyRef.current)

    if (!entry || now > entry.resetAt) {
      store.set(keyRef.current, { count: 1, resetAt: now + opts.windowMs })
      return true
    }

    if (entry.count >= opts.max) {
      return false
    }

    entry.count++
    return true
  }, [opts.max, opts.windowMs])

  const reset = useCallback(() => {
    store.delete(keyRef.current)
  }, [])

  const remaining = useCallback(() => {
    const entry = store.get(keyRef.current)
    if (!entry || Date.now() > entry.resetAt) return opts.max
    return Math.max(0, opts.max - entry.count)
  }, [opts.max])

  return { check, reset, remaining }
}

/**
 * Check rate limit without hook (for use in callbacks)
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
