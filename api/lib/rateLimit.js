import { createClient } from '@supabase/supabase-js';

/**
 * In-memory rate limit store for serverless functions.
 * Resets on cold start, but sufficient for per-request throttling.
 * Structure: { key: { count: number, resetAt: number } }
 */
const store = new Map();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

/**
 * Check rate limit for a given action.
 * @param {string} key - Unique identifier (e.g., IP + action, or email + action)
 * @param {number} maxPerMinute - Maximum requests per minute
 * @param {number} maxPerHour - Maximum requests per hour
 * @returns {{ allowed: boolean, retryAfterMs?: number }}
 */
export function checkRateLimit(key, maxPerMinute = 10, maxPerHour = 100) {
  cleanup();
  const now = Date.now();

  const minKey = `${key}:min`;
  const hrKey = `${key}:hr`;

  // Check per-minute limit
  const minEntry = store.get(minKey);
  if (minEntry && now <= minEntry.resetAt) {
    if (minEntry.count >= maxPerMinute) {
      return { allowed: false, retryAfterMs: minEntry.resetAt - now };
    }
    minEntry.count++;
  } else {
    store.set(minKey, { count: 1, resetAt: now + 60_000 });
  }

  // Check per-hour limit
  const hrEntry = store.get(hrKey);
  if (hrEntry && now <= hrEntry.resetAt) {
    if (hrEntry.count >= maxPerHour) {
      return { allowed: false, retryAfterMs: hrEntry.resetAt - now };
    }
    hrEntry.count++;
  } else {
    store.set(hrKey, { count: 1, resetAt: now + 3_600_000 });
  }

  return { allowed: true };
}

/**
 * Get client IP from request headers.
 */
export function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    '127.0.0.1'
  );
}
