import { useState, useEffect, useCallback, useRef } from 'react'
import { AlertTriangle, LogOut, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'

const INACTIVITY_WARNING_MS = 30 * 60 * 1000
const INACTIVITY_LOGOUT_MS = 35 * 60 * 1000
const ACTIVITY_STORAGE_KEY = 'dr_last_activity'

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'] as const

function getLastActivity(): number {
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY)
    if (!raw) return Date.now()
    return Number(raw) || Date.now()
  } catch {
    return Date.now()
  }
}

function setLastActivity() {
  try {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()))
  } catch { /* ignore */ }
}

function formatMinutesRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min > 0) return `${min}m ${sec}s`
  return `${sec}s`
}

export function SessionTimeout() {
  const { user, signOut } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const countdownRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const signedOutRef = useRef(false)

  const handleSignOut = useCallback(async () => {
    signedOutRef.current = true
    clearTimeout(warningTimerRef.current)
    clearTimeout(logoutTimerRef.current)
    clearInterval(countdownRef.current)
    setShowWarning(false)
    await signOut()
  }, [signOut])

  const resetTimers = useCallback(() => {
    if (signedOutRef.current) return
    clearTimeout(warningTimerRef.current)
    clearTimeout(logoutTimerRef.current)
    clearInterval(countdownRef.current)
    setShowWarning(false)

    setLastActivity()

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      const logoutTime = getLastActivity() + INACTIVITY_LOGOUT_MS
      setCountdown(Math.max(0, logoutTime - Date.now()))

      countdownRef.current = setInterval(() => {
        const remaining = Math.max(0, logoutTime - Date.now())
        setCountdown(remaining)
        if (remaining <= 0) {
          clearInterval(countdownRef.current)
          handleSignOut()
        }
      }, 1000)
    }, INACTIVITY_WARNING_MS)

    logoutTimerRef.current = setTimeout(() => {
      handleSignOut()
    }, INACTIVITY_LOGOUT_MS)
  }, [handleSignOut])

  useEffect(() => {
    if (!user) {
      clearTimeout(warningTimerRef.current)
      clearTimeout(logoutTimerRef.current)
      clearInterval(countdownRef.current)
      setShowWarning(false)
      return
    }

    signedOutRef.current = false
    resetTimers()

    const onActivity = () => {
      if (showWarning) return
      resetTimers()
    }

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, onActivity, { passive: true })
    })

    return () => {
      clearTimeout(warningTimerRef.current)
      clearTimeout(logoutTimerRef.current)
      clearInterval(countdownRef.current)
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, onActivity)
      })
    }
  }, [user?.id])

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Session Expiring</h3>
                <p className="text-sm text-zinc-400">You've been inactive for a while</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 mb-4">
              Your session will expire in <span className="font-mono font-semibold text-amber-400">{formatMinutesRemaining(countdown)}</span> due to inactivity.
            </p>

            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-5">
              <Clock className="h-3.5 w-3.5" />
              <span>Move your mouse or press a key to stay logged in</span>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowWarning(false)
                  resetTimers()
                }}
                className="flex-1 h-10 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
              >
                Stay logged in
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="flex-1 h-10 rounded-xl border-white/10 bg-white/5 text-zinc-300 font-medium hover:bg-white/10 transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
