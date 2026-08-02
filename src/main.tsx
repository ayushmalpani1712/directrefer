import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

// Suppress noisy Supabase Realtime heartbeat/network errors in console
const origError = console.error.bind(console)
console.error = (...args: unknown[]) => {
  const msg = args.map(String).join(' ')
  if (msg.includes('Failed to load resource') && msg.includes('400')) return
  if (msg.includes('Failed to load resource') && msg.includes('403')) return
  origError(...args)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
