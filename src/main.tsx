import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// ── Suppress noisy console errors ───────────────────────────
const origError = console.error.bind(console)
console.error = (...args: unknown[]) => {
  const msg = args.map(String).join(' ')
  if (msg.includes('Failed to load resource') && (msg.includes('400') || msg.includes('403'))) return
  origError(...args)
}

// ── Global error handlers (catch errors outside React tree) ─
window.addEventListener('error', (event) => {
  console.error('[GlobalError] Uncaught error:', event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UnhandledRejection]', event.reason)
})

// ── Service worker registration ─────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

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
