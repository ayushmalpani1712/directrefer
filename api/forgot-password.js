import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { handleCors } from './lib/cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      console.error('Missing env vars');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const normalizedEmail = email.toLowerCase().trim();

    // Use listUsers without filter (safe from injection), then match in code
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    const matchedUser = users?.users?.find((u) => u.email === normalizedEmail);

    if (userError || !matchedUser) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.'
      });
    }

    const user = matchedUser;

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await supabase.from('verification_requests').upsert({
      user_id: user.id,
      type: 'password_reset',
      otp_code: token,
      otp_expires_at: expiresAt,
      status: 'pending',
      work_email: normalizedEmail,
    }, { onConflict: 'user_id,type,status' });

    const resetLink = `https://directrefer.in/reset-password?code=${token}`;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'DirectRefer <noreply@directrefer.in>',
        to: [normalizedEmail],
        subject: 'Reset your DirectRefer password',
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:#2563EB;padding:32px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:24px;">DirectRefer</h1>
  </div>
  <div style="padding:32px;">
    <h2 style="color:#1a1a2e;margin:0 0 16px;font-size:20px;">Reset your password</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 24px;">We received a request to reset your password. Click the button below to create a new password.</p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${resetLink}" style="display:inline-block;padding:14px 32px;background:#2563EB;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Reset Password</a>
    </div>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:0 0 8px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:0;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${resetLink}" style="color:#2563EB;word-break:break-all;">${resetLink}</a></p>
  </div>
  <div style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
    <p style="color:#aaa;font-size:12px;margin:0;">© 2026 DirectRefer. All rights reserved.</p>
  </div>
</div></body></html>`
      })
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error('Resend failed:', emailResponse.status, errText);
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.'
    });

  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(200).json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.'
    });
  }
}
