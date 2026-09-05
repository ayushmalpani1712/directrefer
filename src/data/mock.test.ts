import { describe, it, expect } from 'vitest'
import { initials, PIPELINE_STAGES, GRADIENTS } from '@/data/mock'

describe('initials', () => {
  it('returns first letters of each word', () => {
    expect(initials('Alex Morgan')).toBe('AM')
  })

  it('truncates to 2 chars', () => {
    expect(initials('Alex Benjamin Cruz')).toBe('AB')
  })

  it('handles single name', () => {
    expect(initials('Alex')).toBe('A')
  })

  it('handles lowercase', () => {
    expect(initials('alex morgan')).toBe('AM')
  })
})

describe('PIPELINE_STAGES', () => {
  it('has 6 stages', () => {
    expect(PIPELINE_STAGES).toHaveLength(6)
  })

  it('starts with requested', () => {
    expect(PIPELINE_STAGES[0].key).toBe('requested')
  })

  it('ends with closed', () => {
    expect(PIPELINE_STAGES[PIPELINE_STAGES.length - 1].key).toBe('closed')
  })
})

describe('GRADIENTS', () => {
  it('has at least 10 gradients', () => {
    expect(GRADIENTS.length).toBeGreaterThanOrEqual(10)
  })

  it('each gradient is a valid tailwind class string', () => {
    GRADIENTS.forEach((g) => {
      expect(g).toContain('from-')
      expect(g).toContain('to-')
    })
  })
})
