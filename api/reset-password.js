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
    return res.status(429).json({ ok: false, error: 'Too many requests' })
  }

  const { email, token, newPassword } = req.body
  if (!email || !token || !newPassword) {
    return res.status(400).json({ ok: false, error: 'Missing email, token, or password' })
  }

  if (typeof email !== 'string' || typeof token !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ ok: false, error: 'Invalid input types' })
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ ok: false, error: 'Server configuration error' })
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Validate token
    const { data: otpRows, error: queryError } = await supabase
      .from('password_reset_otps')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('otp', `token:${token}`)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .limit(1)

    if (queryError || !otpRows || otpRows.length === 0) {
      return res.status(400).json({ ok: false, error: 'Invalid or expired reset token' })
    }

    // Mark token as used
    await supabase
      .from('password_reset_otps')
      .update({ used: true })
      .eq('id', otpRows[0].id)

    // Find user
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) {
      return res.status(500).json({ ok: false, error: 'Failed to find user' })
    }

    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (!user) {
      return res.status(400).json({ ok: false, error: 'User not found' })
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    })

    if (updateError) {
      return res.status(500).json({ ok: false, error: 'Failed to update password' })
    }

    return res.status(200).json({ ok: true })
  } catch {
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
