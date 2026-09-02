import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CHUNK_RELOAD_KEY } from '@/lib/retryLazy'

// ── Global error handlers (catch errors outside React tree) ─
window.addEventListener('error', (event) => {
  const msg = (event.error?.message || event.message || '') as string
  const isChunkError = (
    msg.includes('dynamically imported module') ||
    msg.includes('dynamically resolved module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('Failed to fetch') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('is not a module object')
  )
  if (isChunkError && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
    console.warn('[GlobalChunkRetry] Stale chunk detected via error event. Reloading...')
    window.location.reload()
  } else if (!isChunkError) {
    console.error('[GlobalError] Uncaught error:', event.error || event.message)
  }
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  const msg = (reason instanceof Error ? reason.message : String(reason)) || ''
  const isChunkError = (
    msg.includes('dynamically imported module') ||
    msg.includes('dynamically resolved module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('Failed to fetch') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('is not a module object')
  )
  if (isChunkError) {
    if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
      console.warn('[GlobalChunkRetry] Stale chunk detected via unhandledrejection. Reloading...')
      window.location.reload()
    } else {
      console.error('[GlobalChunkRetry] Already reloaded once. Letting error boundary handle.')
    }
  } else {
    console.error('[UnhandledRejection]', reason)
  }
})

// ── Render ──────────────────────────────────────────────────
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fullScreen>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
