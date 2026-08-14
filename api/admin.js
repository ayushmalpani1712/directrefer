import { handleCors } from './lib/cors.js';
import { authenticate, requireAdmin } from './lib/auth.js';
import { getServiceClient } from './lib/db.js';
import { success, error, parseBody } from './lib/response.js';
import { validateBody, UpdateUserRoleSchema, BanUserSchema, AdminJobUpdateSchema } from './lib/validation.js';

// ─── USERS ─────────────────────────────────────────────

async function listUsers(req, res, params) {
  const supabase = getServiceClient();
  const { page, limit, search, role, status, sort, order } = params;
  let query = supabase.from('users').select('*', { count: 'exact' });
  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  if (role) query = query.eq('role', role);
  if (status) query = query.eq('status', status);
  const offset = (page - 1) * limit;
  query = query.order(sort, { ascending: order === 'asc' });
  query = query.range(offset, offset + limit - 1);
  const { data, error: dbError, count } = await query;
  if (dbError) return error(res, dbError.message, 500);
  return success(res, { users: data, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
}

async function updateUserRole(req, res, userId, body) {
  const { data, error: ve } = validateBody(UpdateUserRoleSchema, body);
  if (ve) return error(res, 'Validation failed', 400, ve);
  const auth = await authenticate(req);
  if (auth.profile.id === userId) return error(res, 'Cannot change your own role', 400);
  const supabase = getServiceClient();
  const { data: updated, error: dbError } = await supabase.from('users').update({ role: data.role }).eq('id', userId).select().single();
  if (dbError) return error(res, dbError.message, 500);
  await supabase.from('admin_logs').insert({ admin_id: auth.profile.id, action: 'update_user_role', target_id: userId, details: { new_role: data.role } });
  return success(res, updated);
}

async function updateUserStatus(req, res, userId, body) {
  const { data, error: ve } = validateBody(BanUserSchema, body);
  if (ve) return error(res, 'Validation failed', 400, ve);
  const auth = await authenticate(req);
  if (auth.profile.id === userId) return error(res, 'Cannot change your own status', 400);
  const supabase = getServiceClient();
  const { data: updated, error: dbError } = await supabase.from('users').update({ status: data.status }).eq('id', userId).select().single();
  if (dbError) return error(res, dbError.message, 500);
  await supabase.from('admin_logs').insert({ admin_id: auth.profile.id, action: `user_${data.status}`, target_id: userId, details: { reason: data.reason } });
  return success(res, updated);
}

async function deleteUser(req, res, userId) {
  const auth = await authenticate(req);
  if (auth.profile.id === userId) return error(res, 'Cannot delete your own account', 400);
  const supabase = getServiceClient();
  const { error: dbError } = await supabase.from('users').delete().eq('id', userId);
  if (dbError) return error(res, dbError.message, 500);
  try { await supabase.auth.admin.deleteUser(userId); } catch { /* auth deletion is best-effort */ }
  await supabase.from('admin_logs').insert({ admin_id: auth.profile.id, action: 'delete_user', target_id: userId, details: {} });
  return success(res, { deleted: true });
}

// ─── JOBS ──────────────────────────────────────────────

async function listAllJobs(req, res, params) {
  const supabase = getServiceClient();
  const { page, limit, search, stage, sort, order } = params;
  let query = supabase.from('jobs').select('*', { count: 'exact' });
  if (search) query = query.or(`title.ilike.%${search}%,company_name.ilike.%${search}%`);
  if (stage) query = query.eq('stage', stage);
  const offset = (page - 1) * limit;
  query = query.order(sort, { ascending: order === 'asc' });
  query = query.range(offset, offset + limit - 1);
  const { data, error: dbError, count } = await query;
  if (dbError) return error(res, dbError.message, 500);
  return success(res, { jobs: data, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
}

async function updateJobStatus(req, res, jobId, body) {
  const { data, error: ve } = validateBody(AdminJobUpdateSchema, body);
  if (ve) return error(res, 'Validation failed', 400, ve);
  const auth = await authenticate(req);
  const supabase = getServiceClient();
  const { data: updated, error: dbError } = await supabase.from('jobs').update({ stage: data.stage }).eq('id', jobId).select().single();
  if (dbError) return error(res, dbError.message, 500);
  if (!updated) return error(res, 'Job not found', 404);
  await supabase.from('admin_logs').insert({ admin_id: auth.profile.id, action: 'update_job_status', target_id: jobId, details: { new_status: data.stage } });
  return success(res, updated);
}

async function deleteAdminJob(req, res, jobId) {
  const auth = await authenticate(req);
  const supabase = getServiceClient();
  const { error: dbError } = await supabase.from('jobs').delete().eq('id', jobId);
  if (dbError) return error(res, dbError.message, 500);
  await supabase.from('admin_logs').insert({ admin_id: auth.profile.id, action: 'delete_job', target_id: jobId, details: {} });
  return success(res, { deleted: true });
}

// ─── ROUTER ────────────────────────────────────────────

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  const auth = await authenticate(req);
  if (auth.error) return error(res, auth.error, auth.status);
  const roleCheck = requireAdmin(auth.profile);
  if (roleCheck) return error(res, roleCheck.error, roleCheck.status);

  const urlNoQuery = req.url.split('?')[0];
  const parts = urlNoQuery.split('/').filter(Boolean);
  // parts: ['api', 'admin', ...]

  try {
    // Parse body once for methods that need it (POST, PATCH)
    let body = {};
    if (req.method === 'POST' || req.method === 'PATCH') {
      body = await parseBody(req);
    }

    // Users
    if (parts[2] === 'users' && parts.length === 3 && req.method === 'GET') {
      const params = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
      return await listUsers(req, res, {
        page: Number(params.page) || 1, limit: Math.min(Number(params.limit) || 20, 100),
        search: params.search || '', role: params.role || undefined, status: params.status || undefined,
        sort: params.sort || 'created_at', order: params.order || 'desc',
      });
    }
    if (parts[2] === 'users' && parts[4] === 'role' && req.method === 'PATCH') {
      return await updateUserRole(req, res, parts[3], body);
    }
    if (parts[2] === 'users' && parts[4] === 'status' && req.method === 'PATCH') {
      return await updateUserStatus(req, res, parts[3], body);
    }
    if (parts[2] === 'users' && parts.length === 4 && req.method === 'DELETE') {
      return await deleteUser(req, res, parts[3]);
    }

    // Jobs
    if (parts[2] === 'jobs' && parts.length === 3 && req.method === 'GET') {
      const params = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
      return await listAllJobs(req, res, {
        page: Number(params.page) || 1, limit: Math.min(Number(params.limit) || 20, 100),
        search: params.search || '', stage: params.stage || undefined,
        sort: params.sort || 'posted_at', order: params.order || 'desc',
      });
    }
    if (parts[2] === 'jobs' && parts[4] === 'status' && req.method === 'PATCH') {
      return await updateJobStatus(req, res, parts[3], body);
    }
    if (parts[2] === 'jobs' && parts.length === 4 && req.method === 'DELETE') {
      return await deleteAdminJob(req, res, parts[3]);
    }

    return error(res, 'Not found', 404);
  } catch (e) {
    console.error('Admin API error:', e);
    return error(res, 'Internal server error', 500);
  }
}
