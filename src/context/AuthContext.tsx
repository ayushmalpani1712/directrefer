import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { sendVerificationEmail } from '@/lib/email'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  emailVerified: boolean
  needsVerification: boolean
  signUp: (email: string, password: string, meta?: { full_name?: string; role?: string }) => Promise<{ error?: string; needsVerification?: boolean }>
  signIn: (email: string, password: string) => Promise<{ error?: string; needsVerification?: boolean }>
  signInWithGoogle: () => Promise<{ error?: string }>
  signInWithLinkedIn: () => Promise<{ error?: string }>
  signOut: () => Promise<void>
  getUserRole: () => string | null
}

const AuthCtx = createContext<AuthState | null>(null)

async function ensureUserRow(user: User) {
  const meta = user.user_metadata
  const fullName = meta?.full_name || meta?.name || user.email?.split('@')[0] || 'User'
  const role = (meta?.role as string) || 'job_seeker'
  const provider = user.app_metadata?.provider || 'email'

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existing) {
    await supabase.from('users').upsert({
      id: user.id,
      email: user.email || '',
      full_name: fullName,
      role,
      email_verified: provider !== 'email',
      verified: provider !== 'email',
    }, { onConflict: 'id' })
  }
}

async function checkEmailVerified(userId: string, email?: string): Promise<boolean> {
  if (email) {
    const lower = email.toLowerCase()
    if (lower.endsWith('@demo.com')) return true
  }
  const { data } = await supabase
    .from('users')
    .select('email_verified, role')
    .eq('id', userId)
    .single()
  if (!data) return true
  if (data.role === 'job_seeker') return true
  return data.email_verified === true
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailVerified, setEmailVerified] = useState(true)
  const [needsVerification, setNeedsVerification] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        try {
          await ensureUserRow(s.user)
        } catch {
          // Non-blocking
        }
        try {
          const verified = await checkEmailVerified(s.user.id, s.user.email)
          setEmailVerified(verified)
        } catch {
          setEmailVerified(true)
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        try {
          await ensureUserRow(s.user)
        } catch {
          // Non-blocking
        }
        try {
          const verified = await checkEmailVerified(s.user.id, s.user.email)
          setEmailVerified(verified)
        } catch {
          setEmailVerified(true)
        }
      } else {
        setEmailVerified(true)
      }
      setLoading(false)

      if (event === 'SIGNED_IN') {
        const h = window.location.hash
        const hasOAuthTokens = h.includes('access_token') || h.includes('code=')
        const hasCodeInSearch = window.location.search.includes('code=')
        if (hasOAuthTokens || hasCodeInSearch) {
          window.history.replaceState({}, '', window.location.pathname)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = useCallback(async (email: string, password: string, meta?: { full_name?: string; role?: string }) => {
    const allowedRoles = ['job_seeker', 'professional', 'recruiter']
    const roleMap: Record<string, string> = {
      student: 'job_seeker',
      professional: 'professional',
      recruiter: 'recruiter',
    }
    const requestedRole = roleMap[meta?.role || ''] || 'job_seeker'
    const safeRole = allowedRoles.includes(requestedRole) ? requestedRole : 'job_seeker'
    const dbMeta = meta ? { ...meta, role: safeRole } : { role: 'job_seeker' }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: dbMeta },
    })
    if (error) return { error: error.message }

    const frontendRole = meta?.role || 'student'
    if (frontendRole === 'professional' || frontendRole === 'recruiter') {
      if (data.user) {
        try { await ensureUserRow(data.user) } catch { /* non-blocking */ }
        await supabase
          .from('users')
          .update({ email_verified: false })
          .eq('id', data.user.id)
        setEmailVerified(false)
        setNeedsVerification(true)

        const tokenVal = crypto.randomUUID()
        await supabase
          .from('email_verification_tokens')
          .insert({ user_id: data.user.id, token: tokenVal })

        const verifyUrl = `${window.location.origin}/verify-email?token=${tokenVal}&uid=${data.user.id}`

        try {
          await sendVerificationEmail(email, verifyUrl)
        } catch {
          // Email failed — verification link available via forgot-password flow
        }

        return { needsVerification: true }
      }
    }

    return {}
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }

    if (data.user) {
      setUser(data.user)
      setSession(data.session)
      try { await ensureUserRow(data.user) } catch { /* non-blocking */ }
      try {
        const verified = await checkEmailVerified(data.user.id, data.user.email)
        setEmailVerified(verified)
        if (!verified) return { needsVerification: true }
      } catch { setEmailVerified(true) }
    }
    return {}
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/#/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) return { error: error.message }
    return {}
  }, [])

  const signInWithLinkedIn = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/#/auth/callback`,
      },
    })
    if (error) return { error: error.message }
    return {}
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setEmailVerified(true)
    setNeedsVerification(false)
  }, [])

  const getUserRole = useCallback(() => {
    return (user?.user_metadata?.role as string) || null
  }, [user])

  const value = useMemo<AuthState>(() => ({
    user, session, loading, emailVerified, needsVerification, signUp, signIn, signInWithGoogle, signInWithLinkedIn, signOut, getUserRole,
  }), [user, session, loading, emailVerified, needsVerification, signUp, signIn, signInWithGoogle, signInWithLinkedIn, signOut, getUserRole])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
