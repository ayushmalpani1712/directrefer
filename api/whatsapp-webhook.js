import { createClient } from '@supabase/supabase-js';

// ── WhatsApp Cloud API Webhook ─────────────────────────────
// Handles:
// 1. GET verification challenge from Meta (setup mode)
// 2. POST incoming messages (opt-in START, opt-out STOP, conversation window tracking)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'directrefer-verify';

function getDb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function extractPhone(waId) {
  if (!waId) return null;
  const digits = waId.replace(/\D/g, '');
  return digits.startsWith('+') ? `+${digits}` : `+${digits}`;
}

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return `+${digits}`;
}

async function handleOptIn(db, phone, timestamp) {
  const { data: existing } = await db
    .from('users')
    .select('id, notification_preferences')
    .eq('mobile', phone)
    .single();

  if (!existing) {
    // Phone not linked to any account — store pending, will link when user provides code
    return { linked: false, phone };
  }

  const prefs = existing.notification_preferences ?? {};
  const updatedPrefs = {
    ...prefs,
    whatsapp_opt_out: false,
    whatsapp_phone: phone,
    whatsapp_opt_in_at: timestamp,
    whatsapp_last_user_message_at: timestamp,
  };

  await db.from('users').update({ notification_preferences: updatedPrefs }).eq('id', existing.id);
  return { linked: true, userId: existing.id };
}

async function handleOptOut(db, phone) {
  const { data: existing } = await db
    .from('users')
    .select('id, notification_preferences')
    .eq('mobile', phone)
    .single();

  if (!existing) return;

  const prefs = existing.notification_preferences ?? {};
  const updatedPrefs = {
    ...prefs,
    whatsapp_opt_out: true,
    whatsapp_opt_out_at: new Date().toISOString(),
  };

  await db.from('users').update({ notification_preferences: updatedPrefs }).eq('id', existing.id);
}

async function handleUserMessage(db, phone, timestamp) {
  // Update the 24-hour conversation window timestamp
  const { data: existing } = await db
    .from('users')
    .select('id, notification_preferences')
    .eq('mobile', phone)
    .single();

  if (!existing) return;

  const prefs = existing.notification_preferences ?? {};
  const updatedPrefs = {
    ...prefs,
    whatsapp_last_user_message_at: timestamp,
  };

  await db.from('users').update({ notification_preferences: updatedPrefs }).eq('id', existing.id);
}

async function handleVerification(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(challenge);
  } else {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
  }
}

async function handleIncomingMessage(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;

  try {
    const data = JSON.parse(body);

    // Verify this is a WhatsApp message webhook
    if (data.object !== 'whatsapp_business_account') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ignored' }));
    }

    const db = getDb();

    for (const entry of data.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const messages = value.messages ?? [];
        const contacts = value.contacts ?? [];

        for (const msg of messages) {
          if (msg.type !== 'text') continue;

          const text = (msg.text?.body || '').trim().toUpperCase();
          const phone = extractPhone(msg.from);
          const timestamp = new Date(parseInt(msg.timestamp) * 1000).toISOString();

          if (!phone) continue;

          if (text === 'START' || text === 'NOTIFY') {
            const result = await handleOptIn(db, phone, timestamp);
            // Send confirmation reply via Cloud API
            await sendCloudApiMessage(phone, 'You\'re opted in to DirectRefer notifications! You\'ll get alerts here when someone messages you or responds to a referral.\n\nReply STOP anytime to opt out.');
          } else if (text === 'STOP' || text === 'UNSUBSCRIBE' || text === 'CANCEL') {
            await handleOptOut(db, phone);
            await sendCloudApiMessage(phone, 'You\'ve been unsubscribed from DirectRefer notifications. Reply START anytime to re-enable.');
          } else {
            // Any other message updates the conversation window
            await handleUserMessage(db, phone, timestamp);
          }
        }
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } catch (err) {
    console.error('whatsapp-webhook error:', err);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'error' }));
  }
}

async function sendCloudApiMessage(to, text) {
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error('WhatsApp Cloud API credentials not configured');
    return;
  }

  try {
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
      console.error('Cloud API send error:', res.status, err);
    }
  } catch (err) {
    console.error('Cloud API fetch error:', err);
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === 'GET') return handleVerification(req, res);
  if (req.method === 'POST') return handleIncomingMessage(req, res);

  res.writeHead(405);
  res.end('Method not allowed');
}
