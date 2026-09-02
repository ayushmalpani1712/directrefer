import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// ── db.js ──

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

/**
 * Service-role client — bypasses RLS.
 * Use ONLY in serverless API handlers after verifying the caller's role.
 */
export function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * User-scoped client — respects RLS.
 * Used for operations that should be subject to row-level policies.
 */
export function getUserClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// ── cors.js ──

const ALLOWED_ORIGINS = [
  'https://www.directrefer.in',
  'https://directrefer.in',
  'http://localhost:5173',
  'http://localhost:3000',
];

export function getCorsHeaders(req) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCors(req, res) {
  const headers = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return true;
  }
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  return false;
}

// ── response.js ──

/**
 * Standard JSON response helper.
 */
export function jsonResponse(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * Success response.
 */
export function success(res, data, status = 200) {
  return jsonResponse(res, status, { success: true, data });
}

/**
 * Created response.
 */
export function created(res, data) {
  return jsonResponse(res, 201, { success: true, data });
}

/**
 * Error response.
 */
export function error(res, message, status = 500, details = null) {
  const body = { success: false, error: message };
  if (details) body.details = details;
  return jsonResponse(res, status, body);
}

/**
 * Parse JSON body from request.
 */
export function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Extract query parameters from URL.
 */
export function parseQuery(url) {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  const params = new URLSearchParams(url.slice(idx));
  const obj = {};
  for (const [k, v] of params) obj[k] = v;
  return obj;
}

/**
 * Extract path parameters (e.g., /api/jobs/:id).
 */
export function extractPathParam(url, pattern) {
  const urlParts = url.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);
  if (urlParts.length !== patternParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = urlParts[i];
    } else if (urlParts[i] !== patternParts[i]) {
      return null;
    }
  }
  return params;
}

// ── validation.js ──

/**
 * Validate request body against a Zod schema.
 * Returns { data, error } where data is the parsed result or error is the formatted issues.
 */
export function validateBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map(i => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return { data: null, error: issues };
  }
  return { data: result.data, error: null };
}

// ── Shared Schemas ──

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  sort: z.enum(['created_at', 'updated_at', 'title', 'name']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const UuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});

// ── Job Schemas ──

export const CreateJobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  company_name: z.string().max(200).optional(),
  department: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  type: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote']).default('Full-time'),
  salary_range: z.string().max(100).optional(),
  stage: z.enum(['active', 'paused', 'draft', 'closed']).default('draft'),
});

export const UpdateJobSchema = CreateJobSchema.partial();

export const JobStatusSchema = z.object({
  stage: z.enum(['active', 'paused', 'draft', 'closed']),
});

// ── Referral Schemas ──

export const CreateReferralSchema = z.object({
  professional_id: z.string().uuid('Invalid professional ID'),
  job_id: z.string().uuid().optional(),
  job_title: z.string().min(1, 'Job title is required').max(200),
  note: z.string().max(2000).optional(),
});

export const UpdateReferralStatusSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'offered', 'hired']),
});

// ── User/Admin Schemas ──

export const UpdateUserRoleSchema = z.object({
  role: z.enum(['job_seeker', 'professional', 'recruiter', 'admin']),
});

export const BanUserSchema = z.object({
  status: z.enum(['suspended', 'deactivated', 'active']),
  reason: z.string().max(500).optional(),
});

export const AdminJobUpdateSchema = z.object({
  stage: z.enum(['active', 'paused', 'draft', 'closed']),
});

// ── Report Schema ──

export const CreateReportSchema = z.object({
  target_id: z.string().uuid('Invalid target user ID'),
  reason: z.string().min(1, 'Reason is required').max(200),
  description: z.string().max(2000).optional(),
});

// ── auth.js ──

/**
 * Authenticate the request by verifying the JWT from the Authorization header.
 * Returns { user, profile, error, status }.
 *
 * user = Supabase auth user object
 * profile = row from public.users (includes role)
 */
export async function authenticate(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header', status: 401 };
  }

  const token = authHeader.slice(7);
  const supabase = getServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'User profile not found', status: 404 };
  }

  if (profile.status !== 'active') {
    return { error: 'Account is not active', status: 403 };
  }

  return { user, profile, supabase };
}

/**
 * Require the authenticated user to have one of the specified roles.
 * Call AFTER authenticate().
 */
export function requireRole(profile, allowedRoles) {
  if (!allowedRoles.includes(profile.role)) {
    return { error: `Requires one of: ${allowedRoles.join(', ')}`, status: 403 };
  }
  return null;
}

/**
 * Require the authenticated user to be an admin.
 */
export function requireAdmin(profile) {
  return requireRole(profile, ['admin']);
}
