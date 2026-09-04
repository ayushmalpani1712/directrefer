// ============================================================================
// Direct Refer — Export Utilities
// ============================================================================
// CSV and PDF export helpers for analytics and referral data.
// ============================================================================

import type { ReferralRequest } from '@/data/mock'

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return

  const sanitizeCell = (val: string): string => {
    if (val.startsWith('=') || val.startsWith('+') || val.startsWith('-') || val.startsWith('@')) {
      val = "'" + val
    }
    return val.includes(',') || val.includes('"') || val.includes('\n')
      ? `"${val.replace(/"/g, '""')}"`
      : val
  }

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => sanitizeCell(String(row[h] ?? ''))).join(',')
    ),
  ]

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function exportReferralsCSV(referrals: ReferralRequest[]) {
  const data = referrals.map((r) => ({
    'Student': r.student,
    'Role': r.role,
    'Status': r.status,
    'Pipeline Stage': r.pipelineStage,
    'Date': r.date,
    'Note': r.note,
    'Progress': `${r.progress}%`,
  }))
  exportToCSV(data, 'referral-history')
}

export function exportAnalyticsCSV(analytics: {
  label: string
  applications: number
  referrals: number
  responses: number
}[]) {
  const data = analytics.map((a) => ({
    'Week': a.label,
    'Applications': a.applications,
    'Referrals': a.referrals,
    'Responses': a.responses,
  }))
  exportToCSV(data, 'analytics-export')
}

export function exportUsersCSV(users: {
  name: string
  email: string
  role: string
  lastActive: string
  daysInactive: number
}[]) {
  const data = users.map((u) => ({
    'Name': u.name,
    'Email': u.email,
    'Role': u.role,
    'Last Active': u.lastActive,
    'Days Inactive': u.daysInactive,
  }))
  exportToCSV(data, 'users-export')
}
