import { type ComponentType, lazy } from 'react'

export const CHUNK_RELOAD_KEY = 'dr_chunk_reload_attempted'
const CHUNK_RELOAD_PATH_KEY = 'dr_chunk_reload_path'

const CHUNK_ERROR_PATTERNS = [
  'dynamically imported module',
  'dynamically resolved module',
  'Loading chunk',
  'Loading CSS chunk',
  'Importing a module script failed',
  'Failed to fetch',
  'is not a module object',
]

function isChunkLoadError(error: unknown): boolean {
  let msg = ''
  if (error instanceof Error) {
    msg = error.message || String(error)
  } else if (typeof error === 'string') {
    msg = error
  } else if (error && typeof error === 'object' && 'message' in error) {
    msg = String((error as { message: unknown }).message)
  } else {
    msg = String(error)
  }
  return CHUNK_ERROR_PATTERNS.some((p) => msg.includes(p))
}

/**
 * Wraps a React.lazy() import so that if a stale-chunk error occurs
 * (common after Vite deployments with new chunk hashes), the app
 * automatically reloads once to fetch the current bundle.
 *
 * Loop protection: only one reload per navigation path is attempted
 * via sessionStorage. If the reload doesn't fix it, the standard
 * ErrorBoundary takes over.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function retryLazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((error: unknown) => {
      if (isChunkLoadError(error)) {
        console.warn('[ChunkRetry] Stale chunk detected:', error)

        // Check if we've already tried reloading for this same navigation path
        const currentPath = window.location.pathname + window.location.search
        const lastReloadPath = sessionStorage.getItem(CHUNK_RELOAD_PATH_KEY)
        const alreadyAttempted = sessionStorage.getItem(CHUNK_RELOAD_KEY)

        if (alreadyAttempted && lastReloadPath === currentPath) {
          // Already reloaded once for this exact path — let the ErrorBoundary handle it
          console.error('[ChunkRetry] Reload already attempted for this path. Falling through to ErrorBoundary.')
          throw error
        }

        // Mark that we've attempted a reload for this path
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
        sessionStorage.setItem(CHUNK_RELOAD_PATH_KEY, currentPath)

        console.warn('[ChunkRetry] Performing automatic page reload to fetch current bundle...')
        // Use a small delay to ensure the console.warn is flushed
        setTimeout(() => window.location.reload(), 50)
      }

      // Re-throw so the ErrorBoundary catches non-chunk errors normally
      throw error
    })
  )
}

/**
 * Clears the chunk reload flag. Call this when the user successfully
 * navigates to a new page (to allow reload on a different path later).
 */
export function clearChunkReloadFlag(): void {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY)
  sessionStorage.removeItem(CHUNK_RELOAD_PATH_KEY)
}
