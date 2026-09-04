import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary, ErrorFallback } from '@/components/ErrorBoundary'

function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('Test error message')
  return <div>All good</div>
}

describe('ErrorBoundary', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  afterEach(() => {
    consoleSpy.mockClear()
  })

  it('renders children normally when no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('Normal content')).toBeInTheDocument()
  })

  it('catches errors and shows error fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('renders "Copy error details" button', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('button', { name: /copy error details/i })).toBeInTheDocument()
  })

  it('renders "Retry" button', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Custom fallback')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('Retry button resets error state and re-renders children', () => {
    let shouldThrow = true
    function ConditionalThrower() {
      if (shouldThrow) throw new Error('fail')
      return <div>Recovered</div>
    }

    const { rerender } = render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    rerender(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Recovered')).toBeInTheDocument()
  })
})

describe('ErrorFallback', () => {
  it('renders error message in pre element', () => {
    const error = new Error('Boom')
    render(<ErrorFallback error={error} />)
    expect(screen.getByText('Boom')).toBeInTheDocument()
  })

  it('calls onRetry when Retry button is clicked', () => {
    const onRetry = vi.fn()
    render(<ErrorFallback error={new Error('x')} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('copies error details to clipboard on copy click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    const error = new Error('Copy me')
    error.stack = 'Error: Copy me\n    at test.ts:1:1'
    render(<ErrorFallback error={error} />)

    fireEvent.click(screen.getByRole('button', { name: /copy error details/i }))
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('Copy me'),
    )

    vi.unstubAllGlobals()
  })
})
