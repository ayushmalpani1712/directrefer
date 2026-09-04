import { getServiceClient } from './db.js';

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
