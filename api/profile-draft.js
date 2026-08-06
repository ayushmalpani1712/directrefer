import { handleCors } from './lib/cors.js';
import { authenticate } from './lib/auth.js';
import { getServiceClient } from './lib/db.js';
import { success, error, parseBody, parseQuery } from './lib/response.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  // ── GET: Fetch the latest draft ──────────────────────────
  if (req.method === 'GET') {
    const auth = await authenticate(req);
    if (auth.error) return error(res, auth.error, auth.status);

    const { formId } = parseQuery(req.url);
    if (!formId) return error(res, 'formId is required', 400);

    try {
      const supabase = getServiceClient();
      const { data, error: dbError } = await supabase
        .from('profile_drafts')
        .select('form_id, values, updated_at')
        .eq('user_id', auth.user.id)
        .eq('form_id', formId)
        .single();

      if (dbError && dbError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine
        console.error('Failed to fetch draft:', dbError);
        return error(res, 'Failed to fetch draft', 500);
      }

      return success(res, data || null);
    } catch (err) {
      console.error('Draft fetch error:', err);
      return error(res, 'Failed to fetch draft', 500);
    }
  }

  // ── PATCH: Upsert draft ──────────────────────────────────
  if (req.method === 'PATCH') {
    const auth = await authenticate(req);
    if (auth.error) return error(res, auth.error, auth.status);

    let body;
    try {
      body = await parseBody(req);
    } catch {
      return error(res, 'Invalid JSON body', 400);
    }

    const { formId, values } = body;
    if (!formId || !values || typeof values !== 'object') {
      return error(res, 'formId and values (object) are required', 400);
    }

    try {
      const supabase = getServiceClient();
      const { error: upsertError } = await supabase
        .from('profile_drafts')
        .upsert(
          {
            user_id: auth.user.id,
            form_id: formId,
            values,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,form_id' }
        );

      if (upsertError) {
        console.error('Failed to save draft:', upsertError);
        return error(res, 'Failed to save draft', 500);
      }

      return success(res, { formId, saved: true });
    } catch (err) {
      console.error('Draft save error:', err);
      return error(res, 'Failed to save draft', 500);
    }
  }

  // ── DELETE: Clear a draft ────────────────────────────────
  if (req.method === 'DELETE') {
    const auth = await authenticate(req);
    if (auth.error) return error(res, auth.error, auth.status);

    const { formId } = parseQuery(req.url);
    if (!formId) return error(res, 'formId is required', 400);

    try {
      const supabase = getServiceClient();
      const { error: delError } = await supabase
        .from('profile_drafts')
        .delete()
        .eq('user_id', auth.user.id)
        .eq('form_id', formId);

      if (delError) {
        console.error('Failed to delete draft:', delError);
        return error(res, 'Failed to delete draft', 500);
      }

      return success(res, { formId, deleted: true });
    } catch (err) {
      console.error('Draft delete error:', err);
      return error(res, 'Failed to delete draft', 500);
    }
  }

  return error(res, 'Method not allowed', 405);
}
