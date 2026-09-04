import { Component, type ReactNode, useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Copy, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logClientError } from '@/lib/db'

// ── Sentry safe integration ─────────────────────────────────
// Checks if Sentry is available on the global scope (initialized elsewhere)
// or falls back gracefully when not installed.
function getSentry(): { captureException: (err: Error, opts?: { extra?: Record<string, unknown> }) => void } | null {
  try {
    // @ts-expect-error -- Sentry may not be installed
    const s = window.Sentry
    if (s && typeof s.captureException === 'function') return s
  } catch { /* ignore */ }
  return null
}

// ── Types ───────────────────────────────────────────────────
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  /** When true, fills the full viewport (for root-level boundaries) */
  fullScreen?: boolean
}

interface ErrorBoundaryState {
  error: Error | null
  componentStack: string | null
}

// ── ErrorBoundary class ─────────────────────────────────────
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: null }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console with stack trace
    console.error('[ErrorBoundary] Caught error:', error)
    if (errorInfo.componentStack) {
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
    }

    // Log to Supabase error_logs for System Health monitoring
    logClientError(
      error.message || 'Unknown error',
      'error-boundary',
      'critical',
      window.location.pathname,
      error.stack,
    )

    // Sentry integration — safe check
    const sentry = getSentry()
    if (sentry) {
      sentry.captureException(error, {
        extra: { componentStack: errorInfo.componentStack ?? undefined },
      })
    }

    this.setState({ componentStack: errorInfo.componentStack ?? null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <ErrorFallback
          error={this.state.error}
          componentStack={this.state.componentStack}
          fullScreen={this.props.fullScreen}
          onRetry={() => this.setState({ error: null, componentStack: null })}
        />
      )
    }
    return this.props.children
  }
}

// ── ErrorFallback UI ────────────────────────────────────────
export function ErrorFallback({
  error,
  componentStack,
  fullScreen = false,
}: {
  error: Error
  componentStack?: string | null
  fullScreen?: boolean
  onRetry?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const timerRef = useState(() => ({ current: null as ReturnType<typeof setTimeout> | null }))[0]

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current) } }, [timerRef])

  const handleCopy = useCallback(() => {
    const details = [
      `Error: ${error.message}`,
      '',
      'Stack:',
      error.stack || 'N/A',
      '',
      'Component Stack:',
      componentStack || 'N/A',
    ].join('\n')
    navigator.clipboard.writeText(details).then(() => {
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }, [error, componentStack, timerRef])

  const handleReload = useCallback(() => {
    window.location.reload()
  }, [])

  const handleGoHome = useCallback(() => {
    window.location.href = '/'
  }, [])

  const isDev = import.meta.env.DEV

  return (
    <div
      className={`flex items-center justify-center p-6 ${fullScreen ? 'min-h-screen' : 'min-h-[60vh]'}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="w-full max-w-lg rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" aria-hidden="true" />

        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Your data is safe — try reloading the page to continue.
        </p>

        {/* Dev-only: error details */}
        {isDev && (
          <div className="mt-4 rounded-lg bg-background border border-border p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Error Details (dev only)
            </p>
            <pre className="whitespace-pre-wrap break-all text-xs text-red-500 font-mono">
              {error.message}
            </pre>
            {error.stack && (
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-[11px] text-muted-foreground font-mono">
                {error.stack}
              </pre>
            )}
            {componentStack && (
              <>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Component Stack
                </p>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all text-[11px] text-muted-foreground font-mono">
                  {componentStack}
                </pre>
              </>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <Button
            className="rounded-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white shadow-sm hover:opacity-90"
            onClick={handleReload}
            aria-label="Reload page"
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Reload page
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={handleGoHome}
            aria-label="Go to homepage"
          >
            <Home className="mr-1.5 h-4 w-4" />
            Go to homepage
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={handleCopy}
            aria-label="Copy error details"
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {copied ? 'Copied!' : 'Copy error details'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── LazyErrorFallback (for lazy-loaded route chunks) ────────
export function LazyErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useState(() => ({ current: null as ReturnType<typeof setTimeout> | null }))[0]

  const handleCopy = useCallback(() => {
    const details = `Error: ${error.message}\n\nStack:\n${error.stack || 'N/A'}`
    navigator.clipboard.writeText(details).then(() => {
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }, [error, timerRef])

  return (
    <div
      className="flex min-h-[60vh] items-center justify-center p-6"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-lg rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold text-red-500">Failed to load page</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            aria-label="Copy error details"
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {copied ? 'Copied!' : 'Copy error details'}
          </Button>
          <Button
            size="sm"
            onClick={resetErrorBoundary}
            aria-label="Retry loading page"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  )
}
