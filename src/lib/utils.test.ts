import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    const result = cn('text-red-500', 'text-blue-500')
    expect(result).toContain('text-blue-500')
  })

  it('handles conditional classes', () => {
    // eslint-disable-next-line no-constant-binary-expression
    const result = cn('base', false && 'hidden', true && 'visible')
    expect(result).toContain('base')
    expect(result).toContain('visible')
    expect(result).not.toContain('hidden')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })

  it('merges tailwind classes correctly', () => {
    const result = cn('px-4 py-2', 'px-8')
    expect(result).toContain('px-8')
    expect(result).toContain('py-2')
  })
})
