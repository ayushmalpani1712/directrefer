import { useEffect, useRef, useCallback, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            use_fedcm_for_prompt?: boolean
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean; isDismissedMoment: () => boolean; getNotDisplayedReason: () => string; getSkippedReason: () => string; getDismissedReason: () => string }) => void) => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const GOOGLE_OAUTH_ORIGIN = 'https://accounts.google.com'

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Google GSI script'))
    document.head.appendChild(s)
  })
}

function isMobileDevice(): boolean {
  return !window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function buildGoogleOAuthUrl(nonce: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/callback`,
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce,
    prompt: 'select_account',
  })
  return `${GOOGLE_OAUTH_ORIGIN}/o/oauth2/v2/auth?${params.toString()}`
}

interface Props {
  onError?: (msg: string) => void
  disabled?: boolean
}

export default function GoogleSignInButton({ onError, disabled }: Props) {
  const { signInWithGoogleIdToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const initialized = useRef(false)
  const popupRef = useRef<Window | null>(null)

  const handleCredentialResponse = useCallback(async (response: { credential: string }) => {
    setLoading(true)
    const { error } = await signInWithGoogleIdToken(response.credential)
    if (error) onError?.(error)
    setLoading(false)
  }, [signInWithGoogleIdToken, onError])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    if (!GOOGLE_CLIENT_ID) return

    loadScript(GSI_SCRIPT_URL).then(() => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          use_fedcm_for_prompt: true,
          auto_select: false,
          cancel_on_tap_outside: false,
        })
      }
    }).catch(() => {
      // GSI script failed to load — OAuth fallback will be used
    })
  }, [handleCredentialResponse])

  const redirectToGoogle = useCallback(() => {
    const nonce = crypto.randomUUID()
    sessionStorage.setItem('google_oauth_nonce', nonce)
    window.location.href = buildGoogleOAuthUrl(nonce)
  }, [])

  const openGooglePopup = useCallback((): boolean => {
    const nonce = crypto.randomUUID()
    sessionStorage.setItem('google_oauth_nonce', nonce)

    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    popupRef.current = window.open(
      buildGoogleOAuthUrl(nonce),
      'google-oauth',
      `width=${width},height=${height},left=${left},top=${top},popup=yes`,
    )

    return popupRef.current !== null
  }, [])

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'google-oauth-id-token') return

      const { idToken, nonce } = event.data
      popupRef.current = null

      if (idToken) {
        setLoading(true)
        signInWithGoogleIdToken(idToken, nonce)
          .then(({ error }) => { if (error) onError?.(error) })
          .finally(() => setLoading(false))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [signInWithGoogleIdToken, onError])

  const handleClick = async () => {
    if (loading || disabled) return

    if (window.google?.accounts?.id && GOOGLE_CLIENT_ID) {
      setLoading(true)
      window.google.accounts.id.prompt((notification) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          if (isMobileDevice()) {
            redirectToGoogle()
          } else {
            const opened = openGooglePopup()
            if (!opened) redirectToGoogle()
          }
        }
        setLoading(false)
      })
    } else {
      if (isMobileDevice()) {
        redirectToGoogle()
      } else {
        const opened = openGooglePopup()
        if (!opened) redirectToGoogle()
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] font-medium text-slate-300 transition-[border-color,background-color] duration-200 hover:bg-white/[0.06] hover:border-white/[0.15] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      )}
      Google
    </button>
  )
}
