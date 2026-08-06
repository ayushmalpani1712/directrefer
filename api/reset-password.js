import { createClient } from '@supabase/supabase-js';
import { handleCors } from './lib/cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: requests, error: queryError } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('type', 'password_reset')
      .eq('otp_code', token)
      .eq('status', 'pending')
      .gt('otp_expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (queryError || !requests?.length) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }

    const request = requests[0];

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      request.user_id,
      { password }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({ error: 'Failed to update password. Please try again.' });
    }

    await supabase
      .from('verification_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', request.id);

    return res.status(200).json({ success: true, message: 'Password updated successfully.' });

  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
