import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

const CHECK_INTERVAL = 5 * 60 * 1000
const IGNORE_KEY = 'dr_version_ignore'

async function fetchVersionSignature(): Promise<string | null> {
  try {
    const res = await fetch('/index.html', {
      cache: 'no-store',
      headers: { Accept: 'text/html' },
    })
    if (!res.ok) return null
    const text = await res.text()
    const match = text.match(/<script[^>]+src="\/assets\/([^"]+)"/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export function useVersionCheck() {
  const currentRef = useRef<string | null>(null)
  const dismissedRef = useRef(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    let active = true

    async function check() {
      if (dismissedRef.current || !active) return
      const sig = await fetchVersionSignature()
      if (!active) return
      if (!sig) return
      if (currentRef.current === null) {
        currentRef.current = sig
        return
      }
      if (currentRef.current !== sig) {
        const ignored = sessionStorage.getItem(IGNORE_KEY)
        if (ignored === sig) return
        toast.info('New version available', {
          description: 'A new version of DirectRefer is ready. Refresh to get the latest.',
          duration: 30000,
          action: {
            label: 'Refresh',
            onClick: () => {
              sessionStorage.removeItem(IGNORE_KEY)
              window.location.reload()
            },
          },
          onDismiss: () => {
            sessionStorage.setItem(IGNORE_KEY, sig)
            dismissedRef.current = true
          },
        })
      }
    }

    check()
    timer = setInterval(check, CHECK_INTERVAL)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])
}
