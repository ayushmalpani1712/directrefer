import { lazy } from 'react'

const CHUNK_RELOAD_KEY = 'dr_chunk_reload'

function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : ''
  if (!msg) return false
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('loading module') ||
    (msg.includes('fetch') && msg.includes('network'))
  )
}

function hasExceededReloadLimit(): boolean {
  const count = parseInt(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0', 10)
  return count >= 1
}

function incrementReloadCount(): void {
  const count = parseInt(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0', 10)
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(count + 1))
}

function clearReloadCount(): void {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY)
}

type LazyComponent = React.LazyExoticComponent<React.ComponentType<any>>

export function lazyWithRetry(factory: () => Promise<{ default: React.ComponentType<any> }>): LazyComponent {
  return lazy(async () => {
    try {
      const mod = await factory()
      clearReloadCount()
      return mod
    } catch (error) {
      if (isChunkLoadError(error) && !hasExceededReloadLimit()) {
        incrementReloadCount()
        window.location.reload()
        return { default: () => null }
      }
      throw error
    }
  })
}
