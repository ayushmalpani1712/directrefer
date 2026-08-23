import { handleCors, authenticate, requireRole, getServiceClient, success, created, error, parseBody, validateBody, CreateJobSchema, UpdateJobSchema } from './lib.js';

async function listJobs(req, res, params, profile) {
  const supabase = getServiceClient();
  const { page, limit, search, stage, recruiter_id, sort, order } = params;
  let query = supabase.from('jobs').select('*', { count: 'exact' });
  if (profile.role === 'recruiter') {
    query = query.or(`recruiter_id.eq.${profile.id},stage.eq.active`);
  } else if (profile.role !== 'admin') {
    query = query.eq('stage', 'active');
  }
  if (search) query = query.or(`title.ilike.%${search}%,company_name.ilike.%${search}%,location.ilike.%${search}%`);
  if (stage && profile.role === 'admin') query = query.eq('stage', stage);
  if (recruiter_id && profile.role === 'admin') query = query.eq('recruiter_id', recruiter_id);
  const offset = (page - 1) * limit;
  query = query.order(sort, { ascending: order === 'asc' });
  query = query.range(offset, offset + limit - 1);
  const { data, error: dbError, count } = await query;
  if (dbError) return error(res, dbError.message, 500);
  return success(res, { jobs: data, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
}

async function createJob(req, res, body, profile) {
  const { data, error: ve } = validateBody(CreateJobSchema, body);
  if (ve) return error(res, 'Validation failed', 400, ve);
  const supabase = getServiceClient();
  const { data: job, error: dbError } = await supabase.from('jobs').insert({
    recruiter_id: profile.id, title: data.title, company_name: data.company_name || null,
    department: data.department || null, location: data.location || null, description: data.description || null,
    type: data.type, salary_range: data.salary_range || null, stage: data.stage,
  }).select().single();
  if (dbError) return error(res, dbError.message, 500);
  return created(res, job);
}

async function getJob(req, res, jobId, profile) {
  const supabase = getServiceClient();
  const { data: job, error: dbError } = await supabase.from('jobs').select('*').eq('id', jobId).single();
  if (dbError || !job) return error(res, 'Job not found', 404);
  if (profile.role !== 'admin' && job.recruiter_id !== profile.id && job.stage !== 'active') return error(res, 'Job not found', 404);
  return success(res, job);
}

async function updateJob(req, res, jobId, body, profile) {
  const { data, error: ve } = validateBody(UpdateJobSchema, body);
  if (ve) return error(res, 'Validation failed', 400, ve);
  const supabase = getServiceClient();
  const { data: existing } = await supabase.from('jobs').select('recruiter_id').eq('id', jobId).single();
  if (!existing) return error(res, 'Job not found', 404);
  if (profile.role !== 'admin' && existing.recruiter_id !== profile.id) return error(res, 'Not authorized', 403);
  const { data: updated, error: dbError } = await supabase.from('jobs').update(data).eq('id', jobId).select().single();
  if (dbError) return error(res, dbError.message, 500);
  return success(res, updated);
}

async function deleteJob(req, res, jobId, profile) {
  const supabase = getServiceClient();
  const { data: existing } = await supabase.from('jobs').select('recruiter_id').eq('id', jobId).single();
  if (!existing) return error(res, 'Job not found', 404);
  if (profile.role !== 'admin' && existing.recruiter_id !== profile.id) return error(res, 'Not authorized', 403);
  const { error: dbError } = await supabase.from('jobs').delete().eq('id', jobId);
  if (dbError) return error(res, dbError.message, 500);
  return success(res, { deleted: true });
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  const auth = await authenticate(req);
  if (auth.error) return error(res, auth.error, auth.status);
  const { profile } = auth;
  const urlNoQuery = req.url.split('?')[0];
  const parts = urlNoQuery.split('/').filter(Boolean);
  const jobId = parts.length >= 3 ? parts[2] : null;

  try {
    if (req.method === 'GET' && !jobId) {
      const params = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
      return await listJobs(req, res, {
        page: Number(params.page) || 1, limit: Math.min(Number(params.limit) || 20, 100),
        search: params.search || '', stage: params.stage || undefined,
        recruiter_id: params.recruiter_id || undefined, sort: params.sort || 'posted_at', order: params.order || 'desc',
      }, profile);
    }
    if (req.method === 'POST' && !jobId) {
      const rc = requireRole(profile, ['recruiter', 'admin']);
      if (rc) return error(res, rc.error, rc.status);
      return await createJob(req, res, await parseBody(req), profile);
    }
    if (req.method === 'GET' && jobId) return await getJob(req, res, jobId, profile);
    if (req.method === 'PUT' && jobId) {
      const rc = requireRole(profile, ['recruiter', 'admin']);
      if (rc) return error(res, rc.error, rc.status);
      return await updateJob(req, res, jobId, await parseBody(req), profile);
    }
    if (req.method === 'DELETE' && jobId) {
      const rc = requireRole(profile, ['recruiter', 'admin']);
      if (rc) return error(res, rc.error, rc.status);
      return await deleteJob(req, res, jobId, profile);
    }
    return error(res, 'Not found', 404);
  } catch (e) {
    console.error('Jobs API error:', e);
    return error(res, 'Internal server error', 500);
  }
}
