// ============================================================================
// DirectRefer V2.0 — Match Result Export
// ============================================================================
// Exports match results to CSV or JSON for company-side analysis.
// ============================================================================

import type { MatchResult } from '@/lib/v2/matching'

export interface MatchExportRow {
  candidate_id: string
  professional_id: string
  match_score: number
  skills_score: number
  experience_score: number
  location_score: number
  confidence: string
  reasons: string
}

function matchesToRows(matches: MatchResult[], _jobId: string): MatchExportRow[] {
  return matches.map((m) => ({
    candidate_id: m.candidate_id,
    professional_id: m.professional_id,
    match_score: m.match_score,
    skills_score: m.skills_score,
    experience_score: m.role_score,
    location_score: m.location_score,
    confidence: m.confidence,
    reasons: m.match_reasons.join('; '),
  }))
}

function toCSV(rows: MatchExportRow[]): string {
  const headers = [
    'Candidate Name',
    'Match Score',
    'Skills Score',
    'Experience Score',
    'Location Score',
    'Confidence',
    'Reasons',
  ]
  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push([
      escape(row.candidate_id),
      row.match_score,
      row.skills_score,
      row.experience_score,
      row.location_score,
      escape(row.confidence),
      escape(row.reasons),
    ].join(','))
  }
  return lines.join('\n')
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportMatchesCSV(matches: MatchResult[], jobId: string): void {
  const rows = matchesToRows(matches, jobId)
  const csv = toCSV(rows)
  const timestamp = new Date().toISOString().split('T')[0]
  downloadFile(csv, `matches-${jobId}-${timestamp}.csv`, 'text/csv;charset=utf-8')
}

export function exportMatchesJSON(matches: MatchResult[], jobId: string): void {
  const rows = matchesToRows(matches, jobId)
  const json = JSON.stringify(rows, null, 2)
  const timestamp = new Date().toISOString().split('T')[0]
  downloadFile(json, `matches-${jobId}-${timestamp}.json`, 'application/json')
}
