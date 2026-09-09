export { getServiceClient, getUserClient } from './lib/db.js';
export { authenticate, requireRole, requireAdmin } from './lib/auth.js';
export { getCorsHeaders, handleCors } from './lib/cors.js';
export { jsonResponse, success, created, error, parseBody, parseQuery, extractPathParam } from './lib/response.js';
export { validateBody, PaginationSchema, UuidParamSchema, CreateJobSchema, UpdateJobSchema, JobStatusSchema, CreateReferralSchema, UpdateReferralStatusSchema, UpdateUserRoleSchema, BanUserSchema, AdminJobUpdateSchema, CreateReportSchema } from './lib/validation.js';

const rateLimitStore = new Map();
let lastCleanup = Date.now();

function cleanupRateLimit() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}

export function checkRateLimit(key, maxPerMinute = 10, maxPerHour = 100) {
  cleanupRateLimit();
  const now = Date.now();
  const minKey = `${key}:min`;
  const hrKey = `${key}:hr`;
  const minEntry = rateLimitStore.get(minKey);
  if (minEntry && now <= minEntry.resetAt) {
    if (minEntry.count >= maxPerMinute) return { allowed: false, retryAfterMs: minEntry.resetAt - now };
    minEntry.count++;
  } else {
    rateLimitStore.set(minKey, { count: 1, resetAt: now + 60_000 });
  }
  const hrEntry = rateLimitStore.get(hrKey);
  if (hrEntry && now <= hrEntry.resetAt) {
    if (hrEntry.count >= maxPerHour) return { allowed: false, retryAfterMs: hrEntry.resetAt - now };
    hrEntry.count++;
  } else {
    rateLimitStore.set(hrKey, { count: 1, resetAt: now + 3_600_000 });
  }
  return { allowed: true };
}

export function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    '127.0.0.1'
  );
}
