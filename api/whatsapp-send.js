import { createClient } from '@supabase/supabase-js';
import { handleCors, authenticate } from './_lib.js';

// ── WhatsApp Cloud API Send ─────────────────────────────────
// Sends notifications as free service messages (replies within 24h CSW).
// Checks the 24-hour window before sending — skips if expired.

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

function getDb() {
  return createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in ms

function isWindowActive(prefs) {
  const lastMsg = prefs.whatsapp_last_user_message_at;
  if (!lastMsg) return false;
  return (Date.now() - new Date(lastMsg).getTime()) < WINDOW_MS;
}

async function sendCloudApiMessage(to, text) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error('WhatsApp Cloud API not configured');
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to.replace(/\D/g, ''),
      type: 'text',
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Cloud API error:', res.status, err);
    throw new Error(`WhatsApp API error: ${res.status}`);
  }

  return res.json();
}

// ── Message templates ──────────────────────────────────────
function renderTemplate(template, p) {
  const siteUrl = 'https://www.directrefer.in';
  switch (template) {
    case 'referral_request':
      return `📩 *New Referral Request*\n\nHi ${p.professionalName}, ${p.studentName} requested a referral for *${p.jobTitle}* on DirectRefer.\n\nReview now: ${p.url || siteUrl + '/professional/referrals'}`;
    case 'referral_update':
      return `📋 *Referral Update*\n\nHi ${p.studentName}, your referral for *${p.jobTitle}* has been *${p.status}*.\n\nView details: ${p.url || siteUrl + '/job-seeker/applications'}`;
    case 'new_message':
      return `💬 *New Message*\n\nHi ${p.recipientName}, ${p.senderName} sent you a message on DirectRefer:\n\n"${p.preview}"\n\nReply here: ${p.url || siteUrl + '/messages'}`;
    case 'reminder':
      return `⏰ *Pending Referral*\n\nHi ${p.professionalName}, ${p.studentName}'s referral request for *${p.jobTitle}* is waiting for your response.\n\nReview: ${p.url || siteUrl + '/professional/referrals'}`;
    default:
      return p.text || '';
  }
}

// ── Handler ────────────────────────────────────────────────
export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }

  try {
    const auth = await authenticate(req);
    if (auth.error) {
      res.writeHead(auth.status, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: auth.error }));
    }

    const { userId, template, params, body } = JSON.parse(req.body || '{}');

    if (!userId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Missing userId' }));
    }

    const db = getDb();

    // Fetch the target user's WhatsApp opt-in data
    const { data: targetUser } = await db
      .from('users')
      .select('id, mobile, notification_preferences')
      .eq('id', userId)
      .single();

    if (!targetUser?.mobile) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, reason: 'no_phone', message: 'User has no phone number' }));
    }

    const prefs = targetUser.notification_preferences ?? {};

    // Check opt-in
    if (prefs.whatsapp_opt_out) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, reason: 'opted_out', message: 'User opted out of WhatsApp' }));
    }

    // Check 24-hour service window
    if (!isWindowActive(prefs)) {
      // Window expired — do NOT send (would require paid template)
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: false,
        reason: 'window_expired',
        message: '24h service window expired — falling back to email/push',
      }));
    }

    // Render message
    let text;
    if (template) {
      text = renderTemplate(template, params || {});
    } else if (body) {
      text = body;
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Missing template or body' }));
    }

    if (!text) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Empty message' }));
    }

    // Send via Cloud API (free service message reply)
    await sendCloudApiMessage(targetUser.mobile, text);

    // Log delivery
    try {
      await db.from('notification_log').insert({
        user_id: userId,
        channel: 'whatsapp',
        template: template || 'custom',
        status: 'sent',
        window_status: 'active',
      }).then(() => {}, () => {});
    } catch { /* log table may not exist */ }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, channel: 'whatsapp', window: 'active' }));
  } catch (err) {
    console.error('whatsapp-send error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: err.message || 'Internal server error' }));
  }
}
