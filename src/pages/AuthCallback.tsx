import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const { user, loading } = useAuth()
  const navigated = useRef(false)
  const codeExchanged = useRef(false)

  const goToDashboard = useCallback(() => {
    if (navigated.current) return
    navigated.current = true
    navigate('/dashboard', { replace: true })
  }, [navigate])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setError('Login timed out. Please try again.')
    }, 15000)

    const searchParams = new URLSearchParams(window.location.search)
    const hashParts = window.location.hash.split('?')
    const hashParams = new URLSearchParams(hashParts.length > 1 ? hashParts[1] : '')
    const code = searchParams.get('code') || hashParams.get('code')

    async function handleAuth() {
      if (code && !codeExchanged.current) {
        codeExchanged.current = true
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setError('Login failed. Please try again.')
          return
        }
        // Wait a moment for onAuthStateChange to fire and set user in context
        // Then verify the session actually exists before navigating
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 100))
          const { data } = await supabase.auth.getSession()
          if (data.session) {
            clearTimeout(timeout)
            goToDashboard()
            return
          }
        }
        // If we still don't have a session after retries, try navigating anyway
        clearTimeout(timeout)
        goToDashboard()
        return
      }

      // Fallback: check if session already exists
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        clearTimeout(timeout)
        goToDashboard()
        return
      }

      // Check for access_token in hash (implicit flow)
      if (hashParams.has('access_token')) {
        clearTimeout(timeout)
        goToDashboard()
        return
      }
    }

    handleAuth()

    return () => clearTimeout(timeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Also navigate when user appears in auth context (backup path)
  useEffect(() => {
    if (!loading && user && !navigated.current) {
      navigated.current = true
      navigate('/dashboard', { replace: true })
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
