import { useState, useEffect, useCallback } from 'react'
import { X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { promptInstall, isStandalone } from '@/lib/pwa'

const COOLDOWN_DAYS = 7
const COOLDOWN_KEY = 'dr_pwa_dismissed_at'
const DELAY_MS = 30_000

function isInCooldown(): boolean {
  try {
    const ts = localStorage.getItem(COOLDOWN_KEY)
    if (!ts) return false
    const elapsed = Date.now() - Number(ts)
    return elapsed < COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function markDismissed() {
  try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())) } catch { /* noop */ }
}

export function PwaInstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (isInCooldown()) return

    let timer: ReturnType<typeof setTimeout> | null = null

    const handler = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setShow(true), DELAY_MS)
    }

    window.addEventListener('pwa-installable', handler)
    return () => {
      window.removeEventListener('pwa-installable', handler)
      if (timer) clearTimeout(timer)
    }
  }, [])

  const dismiss = useCallback(() => {
    markDismissed()
    setShow(false)
  }, [])

  const handleInstall = useCallback(async () => {
    const accepted = await promptInstall()
    setShow(false)
    if (!accepted) {
      markDismissed()
    }
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="rounded-xl border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Install DirectRefer</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add to your home screen for quick access and notifications.</p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="h-9 rounded-full text-xs" onClick={handleInstall}>
                Install
              </Button>
              <Button size="sm" variant="ghost" className="h-9 rounded-full text-xs" onClick={dismiss}>
                Not now
              </Button>
            </div>
          </div>
          <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
