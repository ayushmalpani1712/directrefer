import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  emailVerified: boolean
  needsVerification: boolean
  professionalVerified: boolean
  recruiterVerified: boolean
  activeWorkspace: string
  signUp: (email: string, password: string, meta?: { full_name?: string; role?: string }) => Promise<{ error?: string; needsVerification?: boolean }>
  signIn: (email: string, password: string) => Promise<{ error?: string; needsVerification?: boolean }>
  signInWithGoogle: () => Promise<{ error?: string }>
  signInWithLinkedIn: () => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refreshWorkspaceStatus: () => Promise<void>
}

const AuthCtx = createContext<AuthState | null>(null)

async function ensureUserRow(user: User) {
  const meta = user.user_metadata
  const role = (meta?.role as string) || 'job_seeker'
  // Only create/update users row for students — admin/professional/recruiter rows are managed via admin dashboard
  if (role !== 'job_seeker' && role !== 'student') return
  const fullName = meta?.full_name || meta?.name || user.email?.split('@')[0] || 'User'
  const provider = user.app_metadata?.provider || 'email'

  // Single upsert — eliminates the SELECT → INSERT/UPDATE waterfall
  await supabase.from('users').upsert({
    id: user.id,
    email: user.email || '',
    full_name: fullName,
    role,
    email_verified: provider !== 'email',
    verified: provider !== 'email',
    last_login_at: new Date().toISOString(),
  }, { onConflict: 'id', ignoreDuplicates: false })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailVerified, setEmailVerified] = useState(true)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [professionalVerified, setProfessionalVerified] = useState(false)
  const [recruiterVerified, setRecruiterVerified] = useState(false)
  const [activeWorkspace, setActiveWorkspace] = useState('job_seeker')
  const initializedRef = useRef(false)

  const syncAuthState = async (u: User) => {
    setEmailVerified(true)
    try {
      const { data: wsData } = await supabase
        .from('users')
        .select('professional_verified, recruiter_verified, active_workspace')
        .eq('id', u.id)
        .single()
      if (wsData) {
        setProfessionalVerified(wsData.professional_verified ?? false)
        setRecruiterVerified(wsData.recruiter_verified ?? false)
        setActiveWorkspace(wsData.active_workspace ?? 'job_seeker')
      }
    } catch (err) {
      console.error('Failed to sync auth state:', err)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        // Run ensureUserRow + workspace fetch in parallel instead of sequentially
        await Promise.all([
          ensureUserRow(s.user).catch((err) => console.error('Failed to ensure user row:', err)),
          syncAuthState(s.user),
        ])
      }
      setLoading(false)
      initializedRef.current = true
    }).catch((err) => {
      console.error('getSession failed:', err)
      setLoading(false)
      initializedRef.current = true
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      // Skip INITIAL_SESSION — already handled by getSession() above
      if (!initializedRef.current && event === 'INITIAL_SESSION') return

      setSession(s)
      // Only update user reference on sign-in/sign-out — not on TOKEN_REFRESHED
      // (avoids triggering loadRealData re-runs that overwrite toggle state)
      if (event !== 'TOKEN_REFRESHED') {
        setUser(s?.user ?? null)
      }

      // Only run full auth state sync on sign-in/sign-out events, not on token refresh
      if (s?.user && event !== 'TOKEN_REFRESHED') {
        await syncAuthState(s.user)
      } else if (!s?.user) {
        setEmailVerified(true)
        setProfessionalVerified(false)
        setRecruiterVerified(false)
        setActiveWorkspace('job_seeker')
      }
      setLoading(false)

      if (event === 'SIGNED_IN') {
        const h = window.location.hash
        const hasOAuthTokens = h.includes('access_token') || h.includes('code=')
        const hasCodeInSearch = window.location.search.includes('code=')
        if (hasOAuthTokens || hasCodeInSearch) {
          window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0])
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = useCallback(async (email: string, password: string, meta?: { full_name?: string; role?: string }) => {
    if (password.length < 6) return { error: 'Password must be at least 6 characters' }

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
    if (error) {
      const msg = error.message
      if (msg.includes('already registered')) return { error: 'An account with this email already exists. Please sign in.' }
      if (msg.includes('valid email')) return { error: 'Please enter a valid email address.' }
      return { error: msg }
    }

    // Ensure user row exists for all roles (also handled by SQL trigger as fallback)
    if (data.user) {
      try { await ensureUserRow(data.user) } catch (err) { console.error('ensureUserRow failed:', err) }
    }

    // If Supabase email confirmation is enabled, data.session will be null
    const needsVerification = !data.session
    if (needsVerification) setNeedsVerification(true)

    return { needsVerification }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }

    setNeedsVerification(false)
    setEmailVerified(true)
    if (data.user) {
      try { await ensureUserRow(data.user) } catch (err) { console.error('ensureUserRow failed:', err) }
    }
    return {}
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) return { error: error.message }
    return {}
  }, [])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    }
    setUser(null)
    setSession(null)
    setEmailVerified(true)
    setNeedsVerification(false)
    setProfessionalVerified(false)
    setRecruiterVerified(false)
    setActiveWorkspace('job_seeker')
  }, [])

  const refreshWorkspaceStatus = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('users')
        .select('professional_verified, recruiter_verified, active_workspace')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfessionalVerified(data.professional_verified ?? false)
        setRecruiterVerified(data.recruiter_verified ?? false)
        setActiveWorkspace(data.active_workspace ?? 'job_seeker')
      }
    } catch (err) {
      console.error('Failed to fetch workspace status:', err)
    }
  }, [user])

  const value = useMemo<AuthState>(() => ({
    user, session, loading, emailVerified, needsVerification, professionalVerified, recruiterVerified, activeWorkspace, signUp, signIn, signInWithGoogle, signInWithLinkedIn, signOut, refreshWorkspaceStatus,
  }), [user, session, loading, emailVerified, needsVerification, professionalVerified, recruiterVerified, activeWorkspace, signUp, signIn, signInWithGoogle, signInWithLinkedIn, signOut, refreshWorkspaceStatus])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
