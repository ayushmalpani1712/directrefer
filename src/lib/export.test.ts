import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportToCSV, exportReferralsCSV, exportAnalyticsCSV, exportUsersCSV } from '@/lib/export'
import type { ReferralRequest } from '@/data/mock'

describe('exportToCSV', () => {
  beforeEach(() => {
    // Mock URL.createObjectURL and link.click
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    })
    vi.stubGlobal('document', {
      ...document,
      createElement: vi.fn(() => ({ click: vi.fn(), href: '', download: '' })),
    })
  })

  it('creates CSV from data array', () => {
    const data = [
      { name: 'Alice', email: 'alice@test.com' },
      { name: 'Bob', email: 'bob@test.com' },
    ]
    expect(() => exportToCSV(data, 'test')).not.toThrow()
  })

  it('handles empty data', () => {
    expect(() => exportToCSV([], 'test')).not.toThrow()
  })

  it('handles commas in values', () => {
    const data = [{ name: 'San Francisco, CA', role: 'Engineer' }]
    expect(() => exportToCSV(data, 'test')).not.toThrow()
  })
})

describe('exportReferralsCSV', () => {
  it('exports referral data', () => {
    const mockReferrals: ReferralRequest[] = [
      {
        id: 'r1',
        student: 'Alex Morgan',
        professionalId: 'p1',
        role: 'SWE',
        status: 'requested',
        pipelineStage: 'requested',
        date: '2026-01-15',
        note: 'Looking for referral',
        progress: 0,
      },
    ]
    expect(() => exportReferralsCSV(mockReferrals)).not.toThrow()
  })
})

describe('exportAnalyticsCSV', () => {
  it('exports analytics data', () => {
    const data = [
      { label: 'Week 1', applications: 10, referrals: 5, responses: 3 },
    ]
    expect(() => exportAnalyticsCSV(data)).not.toThrow()
  })
})

describe('exportUsersCSV', () => {
  it('exports user data', () => {
    const data = [
      { name: 'Alice', email: 'alice@test.com', role: 'student', lastActive: '2 days ago', daysInactive: 2 },
    ]
    expect(() => exportUsersCSV(data)).not.toThrow()
  })
})
