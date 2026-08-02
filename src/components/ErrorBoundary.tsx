import { Component, type ReactNode, useCallback, useState } from 'react'
import { AlertTriangle, Copy, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}

export function ErrorFallback({ error, onRetry }: { error: Error; onRetry?: () => void }) {
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
        <h2 className="mt-4 text-lg font-semibold text-red-500">Something went wrong</h2>
        <pre className="mt-4 whitespace-pre-wrap break-all rounded-lg bg-background p-4 text-left text-sm text-muted-foreground">
          {error.message}
        </pre>
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
            onClick={() => {
              if (onRetry) onRetry()
              else window.location.reload()
            }}
            aria-label="Retry"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  )
}

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
