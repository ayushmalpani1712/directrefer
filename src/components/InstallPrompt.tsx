import { useState, useEffect, useCallback } from 'react'
import { X, Download, Share, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DISMISSED_KEY = 'pwa_install_dismissed'
const INSTALLED_KEY = 'pwa_installed'

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    // Don't show if already dismissed or installed
    if (localStorage.getItem(DISMISSED_KEY) || localStorage.getItem(INSTALLED_KEY)) return
    // Don't show if already standalone
    if (isStandalone()) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show banner after a short delay to not be intrusive
      setTimeout(() => setShowBanner(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // For iOS: show after delay if no native prompt
    if (isIOS() && !localStorage.getItem(DISMISSED_KEY)) {
      const timer = setTimeout(() => setShowBanner(true), 5000)
      return () => {
        window.removeEventListener('beforeinstallprompt', handler)
        clearTimeout(timer)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = useCallback(async () => {
    if (isIOS()) {
      setShowIOSInstructions(true)
      return
    }

    if (!deferredPrompt) return

    setIsInstalling(true)
    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        localStorage.setItem(INSTALLED_KEY, 'true')
        setShowBanner(false)
      }
    } catch (err) {
      console.error('Install prompt failed:', err)
    } finally {
      setIsInstalling(false)
      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setShowBanner(false)
    setShowIOSInstructions(false)
    localStorage.setItem(DISMISSED_KEY, 'true')
  }, [])

  // Listen for successful install
  useEffect(() => {
    const handler = () => {
      localStorage.setItem(INSTALLED_KEY, 'true')
      setShowBanner(false)
    }
    window.addEventListener('appinstalled', handler)
    return () => window.removeEventListener('appinstalled', handler)
  }, [])

  if (!showBanner || isStandalone()) return null

  // iOS instructions modal
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 pb-safe" role="dialog" aria-modal="true" aria-label="Install instructions">
        <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">Add to Home Screen</h3>
              <button onClick={handleDismiss} className="rounded-full p-1 hover:bg-muted transition-colors" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p className="text-foreground font-medium">Install DirectRefer on your iPhone:</p>
              <ol className="space-y-3 list-none">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                  <span>Tap the <strong className="text-foreground">Share</strong> button <Share className="inline h-3.5 w-3.5 text-primary -mt-0.5" /> in Safari&apos;s toolbar</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                  <span>Scroll down and tap <strong className="text-foreground">Add to Home Screen</strong> <Plus className="inline h-3.5 w-3.5 text-primary -mt-0.5" /></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
                  <span>Tap <strong className="text-foreground">Add</strong> to confirm</span>
                </li>
              </ol>
              <p className="text-xs text-muted-foreground/70 pt-1">DirectRefer will appear on your home screen like a native app.</p>
            </div>
            <Button onClick={handleDismiss} className="w-full mt-5 rounded-full" variant="outline">Got it</Button>
          </div>
        </div>
      </div>
    )
  }

  // Install banner
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] p-4 pb-safe pointer-events-none">
      <div className="mx-auto max-w-md pointer-events-auto">
        <div className={cn(
          'flex items-center gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-4',
          'animate-in slide-in-from-bottom-4 duration-500'
        )}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Install DirectRefer</div>
            <div className="text-xs text-muted-foreground">
              {isAndroid() ? 'Add to your home screen for quick access' : 'Get the app experience'}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              className="rounded-full px-3.5 text-xs font-semibold"
              onClick={handleInstall}
              disabled={isInstalling}
            >
              {isInstalling ? 'Installing…' : 'Install'}
            </Button>
            <button
              onClick={handleDismiss}
              className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Dismiss install prompt"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
