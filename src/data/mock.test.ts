import { describe, it, expect } from 'vitest'
import { initials, timeAgo, PIPELINE_STAGES, GRADIENTS } from '@/data/mock'

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

describe('timeAgo', () => {
  it('formats days', () => {
    expect(timeAgo(15)).toBe('15d ago')
  })

  it('formats months', () => {
    expect(timeAgo(60)).toBe('2mo ago')
  })

  it('formats years', () => {
    expect(timeAgo(400)).toBe('1y ago')
  })
})

describe('PIPELINE_STAGES', () => {
  it('has 4 stages', () => {
    expect(PIPELINE_STAGES).toHaveLength(4)
  })

  it('starts with request_sent', () => {
    expect(PIPELINE_STAGES[0].key).toBe('request_sent')
  })

  it('ends with submitted', () => {
    expect(PIPELINE_STAGES[PIPELINE_STAGES.length - 1].key).toBe('submitted')
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
