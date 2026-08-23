import { handleCors, authenticate, success, error } from './_lib.js';

/**
 * GET /api/me
 * Returns the authenticated user's profile with role, concatenated in a single round-trip.
 */
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') {
    return error(res, 'Method not allowed', 405);
  }

  const auth = await authenticate(req);
  if (auth.error) return error(res, auth.error, auth.status);

  const { profile } = auth;

  return success(res, {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role,
    avatar_url: profile.avatar_url,
    status: profile.status,
    verified: profile.verified,
    city: profile.city,
    state: profile.state,
    country: profile.country,
    linkedin: profile.linkedin,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  });
}
