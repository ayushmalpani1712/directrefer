import { createClient } from '@supabase/supabase-js'

const rateLimitMap = new Map()

function checkRateLimit(ip, limit = 5, windowMs = 60_000) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.start > windowMs) {
    rateLimitMap.set(ip, { start: now, count: 1 })
    return true
  }
  entry.count++
  return entry.count <= limit
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown'
  if (!checkRateLimit(ip, 5, 60_000)) {
    return res.status(429).json({ ok: false, reason: 'rate_limited' })
  }

  const { to, subject, html, token } = req.body
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing to, subject, or html' })
  }

  if (typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 254) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  if (typeof subject !== 'string' || subject.length > 200) {
    return res.status(400).json({ error: 'Invalid subject' })
  }

  if (typeof html !== 'string' || html.length > 50_000) {
    return res.status(400).json({ error: 'Invalid email body' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  if (token && supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data: { user } } = await supabase.auth.getUser(token)
      if (!user) {
        return res.status(401).json({ ok: false, reason: 'unauthorized' })
      }
    } catch {
      return res.status(401).json({ ok: false, reason: 'auth_error' })
    }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res.status(200).json({ ok: false, reason: 'not_configured' })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from: 'Direct Refer <onboarding@resend.dev>', to, subject, html }),
    })

    const data = await response.json()
    if (!response.ok) {
      return res.status(200).json({ ok: false, reason: 'provider_error' })
    }

    res.status(200).json({ ok: true, id: data.id })
  } catch {
    res.status(200).json({ ok: false, reason: 'network_error' })
  }
}
