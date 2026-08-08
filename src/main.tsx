import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// ── Global error handlers (catch errors outside React tree) ─
window.addEventListener('error', (event) => {
  console.error('[GlobalError] Uncaught error:', event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UnhandledRejection]', event.reason)
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
