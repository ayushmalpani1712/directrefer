import { handleCors, authenticate, requireRole, getServiceClient, success, created, error, parseBody, validateBody, CreateReferralSchema, UpdateReferralStatusSchema } from './_lib.js';

async function listReferrals(req, res, params, profile) {
  const supabase = getServiceClient();
  const { page, limit, status, professional_id, sort, order } = params;
  let query = supabase.from('referrals').select('*', { count: 'exact' });
  if (profile.role === 'admin') {
    // see all
  } else if (profile.role === 'professional') {
    query = query.eq('professional_id', profile.id);
  } else {
    query = query.eq('requester_id', profile.id);
  }
  if (status) query = query.eq('status', status);
  if (professional_id && profile.role === 'admin') query = query.eq('professional_id', professional_id);
  const offset = (page - 1) * limit;
  query = query.order(sort, { ascending: order === 'asc' });
  query = query.range(offset, offset + limit - 1);
  const { data, error: dbError, count } = await query;
  if (dbError) return error(res, dbError.message, 500);
  return success(res, { referrals: data, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
}

async function createReferral(req, res, body, profile) {
  const { data, error: ve } = validateBody(CreateReferralSchema, body);
  if (ve) return error(res, 'Validation failed', 400, ve);
  const supabase = getServiceClient();
  const { data: pro } = await supabase.from('profiles_professional')
    .select('user_id, open_for_referrals, referrals_used, referral_capacity')
    .eq('user_id', data.professional_id).single();
  if (!pro) return error(res, 'Professional not found', 404);
  if (!pro.open_for_referrals) return error(res, 'Professional is not accepting referrals', 400);
  if (pro.referrals_used >= pro.referral_capacity) return error(res, 'Professional is at capacity', 400);
  const { data: existing } = await supabase.from('referrals')
    .select('id').eq('requester_id', profile.id).eq('professional_id', data.professional_id)
    .eq('job_title', data.job_title).maybeSingle();
  if (existing) return error(res, 'Referral request already exists for this job', 409);
  const { data: referral, error: dbError } = await supabase.from('referrals').insert({
    requester_id: profile.id, professional_id: data.professional_id, job_id: data.job_id || null,
    job_title: data.job_title, note: data.note || null, status: 'pending', progress: 15,
  }).select().single();
  if (dbError) return error(res, dbError.message, 500);
  await supabase.from('notifications').insert({
    user_id: data.professional_id, type: 'referral_request', title: 'New referral request',
    description: `${profile.full_name} requested a referral for ${data.job_title}`,
  });
  return created(res, referral);
}

async function getReferral(req, res, refId, profile) {
  const supabase = getServiceClient();
  const { data: ref, error: dbError } = await supabase.from('referrals').select('*').eq('id', refId).single();
  if (dbError || !ref) return error(res, 'Referral not found', 404);
  if (profile.role !== 'admin' && ref.requester_id !== profile.id && ref.professional_id !== profile.id) return error(res, 'Not authorized', 403);
  return success(res, ref);
}

async function updateReferralStatus(req, res, refId, body, profile) {
  const { data, error: ve } = validateBody(UpdateReferralStatusSchema, body);
  if (ve) return error(res, 'Validation failed', 400, ve);
  const supabase = getServiceClient();
  const { data: existing } = await supabase.from('referrals').select('requester_id, professional_id').eq('id', refId).single();
  if (!existing) return error(res, 'Referral not found', 404);
  if (profile.role !== 'admin' && existing.professional_id !== profile.id) return error(res, 'Not authorized', 403);
  const progressMap = { pending: 15, accepted: 40, offered: 70, hired: 100, rejected: 0 };
  const updateData = { status: data.status };
  if (progressMap[data.status] !== undefined) updateData.progress = progressMap[data.status];
  const { data: updated, error: dbError } = await supabase.from('referrals').update(updateData).eq('id', refId).select().single();
  if (dbError) return error(res, dbError.message, 500);
  await supabase.from('notifications').insert({
    user_id: existing.requester_id, type: data.status === 'accepted' ? 'referral_accepted' : 'referral_rejected',
    title: `Referral ${data.status}`, description: `Your referral request has been ${data.status}`,
  });
  return success(res, updated);
}

async function deleteReferral(req, res, refId, profile) {
  const supabase = getServiceClient();
  const { data: existing } = await supabase.from('referrals').select('requester_id, status').eq('id', refId).single();
  if (!existing) return error(res, 'Referral not found', 404);
  if (profile.role !== 'admin') {
    if (existing.requester_id !== profile.id) return error(res, 'Not authorized', 403);
    if (existing.status !== 'pending') return error(res, 'Can only delete pending referrals', 400);
  }
  const { error: dbError } = await supabase.from('referrals').delete().eq('id', refId);
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
  const refId = parts.length >= 3 ? parts[2] : null;

  try {
    if (req.method === 'GET' && !refId) {
      const params = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
      return await listReferrals(req, res, {
        page: Number(params.page) || 1, limit: Math.min(Number(params.limit) || 20, 100),
        status: params.status || undefined, professional_id: params.professional_id || undefined,
        sort: params.sort || 'created_at', order: params.order || 'desc',
      }, profile);
    }
    if (req.method === 'POST' && !refId) {
      const rc = requireRole(profile, ['job_seeker', 'admin']);
      if (rc) return error(res, rc.error, rc.status);
      return await createReferral(req, res, await parseBody(req), profile);
    }
    if (req.method === 'GET' && refId) return await getReferral(req, res, refId, profile);
    if (req.method === 'PATCH' && refId) {
      const rc = requireRole(profile, ['professional', 'admin']);
      if (rc) return error(res, rc.error, rc.status);
      return await updateReferralStatus(req, res, refId, await parseBody(req), profile);
    }
    if (req.method === 'DELETE' && refId) return await deleteReferral(req, res, refId, profile);
    return error(res, 'Not found', 404);
  } catch (e) {
    console.error('Referrals API error:', e);
    return error(res, 'Internal server error', 500);
  }
}
