import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { ROLE_ROUTE, type Role } from '@/data/mock'

async function getRoleRoute(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return '/job-seeker'
    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    const dbRole = (userRow?.role as Role) || 'student'
    return ROLE_ROUTE[dbRole] || '/job-seeker'
  } catch {
    return '/job-seeker'
  }
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const { user, loading, signInWithGoogleIdToken } = useAuth()
  const navigated = useRef(false)
  const handled = useRef(false)

  const goToDashboard = useCallback(async () => {
    if (navigated.current) return
    navigated.current = true
    const route = await getRoleRoute()
    navigate(route, { replace: true })
  }, [navigate])

  const idTokenRef = useRef<string | null>(null)
  const codeRef = useRef<string | null>(null)
  const isPopupRef = useRef(false)

  if (!handled.current) {
    handled.current = true

    const searchParams = new URLSearchParams(window.location.search)
    const hashStr = window.location.hash.substring(1)
    const queryStart = hashStr.indexOf('?')
    const hashParams = new URLSearchParams(queryStart >= 0 ? hashStr.substring(queryStart + 1) : hashStr)

    codeRef.current = searchParams.get('code') || hashParams.get('code')
    idTokenRef.current = hashParams.get('id_token')
    isPopupRef.current = !!window.opener

    if (idTokenRef.current || codeRef.current || hashParams.has('access_token')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setError('Login timed out. Please try again.')
    }, 10000)

    const idToken = idTokenRef.current
    const code = codeRef.current
    const isPopup = isPopupRef.current

    async function handleAuth() {
      try {
        if (idToken && isPopup) {
          const nonce = sessionStorage.getItem('google_oauth_nonce')
          sessionStorage.removeItem('google_oauth_nonce')
          try {
            window.opener!.postMessage({ type: 'google-oauth-id-token', idToken, nonce }, window.location.origin)
          } catch { /* ignore */ }
          clearTimeout(timeout)
          window.close()
          return
        }

        if (idToken && !isPopup) {
          const nonce = sessionStorage.getItem('google_oauth_nonce')
          sessionStorage.removeItem('google_oauth_nonce')
          const { error: signInError } = await signInWithGoogleIdToken(idToken, nonce || undefined)
          clearTimeout(timeout)
          if (signInError) {
            setError('Login failed. Please try again.')
            return
          }
          goToDashboard()
          return
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          clearTimeout(timeout)
          if (exchangeError) {
            setError('Login failed. Please try again.')
            return
          }
          goToDashboard()
          return
        }

        const { data } = await supabase.auth.getSession()
        clearTimeout(timeout)
        if (data.session) {
          goToDashboard()
          return
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        clearTimeout(timeout)
        setError('Login failed. Please try again.')
      }
    }

    handleAuth()

    return () => clearTimeout(timeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading && user && !navigated.current) {
      navigated.current = true
      getRoleRoute().then((route) => navigate(route, { replace: true }))
    }
  }, [user, loading, navigate])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <div className="text-sm font-medium text-destructive mb-3">{error}</div>
          <button onClick={() => navigate('/login', { replace: true })} className="text-sm text-primary hover:underline">
            Return to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  )
}
