import { describe, it, expect } from 'vitest'
import { initials, PIPELINE_STAGES, GRADIENTS, AVATAR_COLORS, avatarColor } from '@/data/mock'

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

describe('AVATAR_COLORS / GRADIENTS', () => {
  it('has exactly 5 avatar colors', () => {
    expect(AVATAR_COLORS).toHaveLength(5)
  })

  it('GRADIENTS is the same as AVATAR_COLORS', () => {
    expect(GRADIENTS).toEqual(AVATAR_COLORS)
  })

  it('each color is a valid hex string', () => {
    AVATAR_COLORS.forEach((c) => {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })

  it('avatarColor returns a consistent color for the same userId', () => {
    const c1 = avatarColor('user-abc-123')
    const c2 = avatarColor('user-abc-123')
    expect(c1).toBe(c2)
  })

  it('avatarColor always returns a color from the palette', () => {
    for (let i = 0; i < 100; i++) {
      const c = avatarColor(`test-user-${i}`)
      expect(AVATAR_COLORS).toContain(c)
    }
  })
})
