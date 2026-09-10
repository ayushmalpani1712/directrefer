import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Search, CheckCircle2, XCircle, Loader2, FileText, Clock,
  Star, ChevronLeft, History,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GAvatar } from '@/components/ui-kit'
import { GRADIENTS } from '@/data/constants'
import { cn } from '@/lib/utils'
import { ListSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/db'
import { VideoPlayer } from '@/components/VideoPlayer'

interface ScreeningAttempt {
  id: string
  candidate_id: string
  criteria_id: string
  job_id: string | null
  score: number
  max_score: number
  passed: boolean | null
  evidence: Record<string, unknown>
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  candidate_name?: string
  candidate_email?: string
  candidate_resume_url?: string
  criteria_name?: string
  job_title?: string
}

interface ReviewHistoryEntry {
  reviewed_at: string
  score: number
  passed: boolean
  reviewer_name: string
  notes: string
}

export default function ReviewerScoring() {
  const [attempts, setAttempts] = useState<ScreeningAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [selectedAttempt, setSelectedAttempt] = useState<ScreeningAttempt | null>(null)
  const [score, setScore] = useState([50])
  const [qualityTier, setQualityTier] = useState('standard')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryEntry[]>([])

  const loadAttempts = useCallback(async () => {
    setLoading(true)
    try {
      const { data: attemptsData, error } = await supabase
        .from('screening_attempts')
        .select('id, candidate_id, criteria_id, job_id, score, max_score, passed, evidence, created_at, reviewed_at, reviewed_by')
        .is('reviewed_at', null)
        .order('created_at', { ascending: false })

      if (error || !attemptsData) {
        toast.error('Failed to load screening attempts')
        setLoading(false)
        return
      }

      const candidateIds = [...new Set(attemptsData.map(a => a.candidate_id))]
      const criteriaIds = [...new Set(attemptsData.map(a => a.criteria_id).filter(Boolean))]
      const jobIds = [...new Set(attemptsData.map(a => a.job_id).filter(Boolean))]

      const [candidatesRes, criteriaRes, jobsRes, profilesRes] = await Promise.all([
        candidateIds.length > 0
          ? supabase.from('users').select('id, full_name, email').in('id', candidateIds)
          : { data: [] },
        criteriaIds.length > 0
          ? supabase.from('screening_criteria').select('id, name').in('id', criteriaIds)
          : { data: [] },
        jobIds.length > 0
          ? supabase.from('jobs').select('id, title').in('id', jobIds)
          : { data: [] },
        candidateIds.length > 0
          ? supabase.from('profiles_job_seeker').select('user_id, resume_url').in('user_id', candidateIds)
          : { data: [] },
      ])

      const nameMap = new Map<string, { full_name: string; email: string }>()
      for (const u of (candidatesRes.data ?? [])) nameMap.set(u.id, { full_name: u.full_name, email: u.email })
      const critMap = new Map<string, string>()
      for (const c of (criteriaRes.data ?? [])) critMap.set(c.id, c.name)
      const jobMap = new Map<string, string>()
      for (const j of (jobsRes.data ?? [])) jobMap.set(j.id, j.title)
      const profileMap = new Map<string, string | null>()
      for (const p of (profilesRes.data ?? [])) profileMap.set(p.user_id, p.resume_url)

      setAttempts(attemptsData.map(a => ({
        ...a,
        candidate_name: nameMap.get(a.candidate_id)?.full_name ?? 'Unknown',
        candidate_email: nameMap.get(a.candidate_id)?.email ?? '',
        candidate_resume_url: profileMap.get(a.candidate_id) ?? undefined,
        criteria_name: critMap.get(a.criteria_id) ?? 'Unknown',
        job_title: a.job_id ? (jobMap.get(a.job_id) ?? 'Unknown') : 'General',
      })))
    } catch {
      toast.error('Failed to load screening data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAttempts() }, [loadAttempts])

  useEffect(() => {
    if (!selectedAttempt) return
    setScore([Math.round((selectedAttempt.score / selectedAttempt.max_score) * 100)])
    setQualityTier('standard')
    setNotes('')
    loadReviewHistory(selectedAttempt.candidate_id)
  }, [selectedAttempt])

  const loadReviewHistory = async (candidateId: string) => {
    try {
      const { data } = await supabase
        .from('screening_attempts')
        .select('reviewed_at, score, passed, reviewed_by, evidence')
        .eq('candidate_id', candidateId)
        .not('reviewed_at', 'is', null)
        .order('reviewed_at', { ascending: false })
        .limit(10)

      if (!data) { setReviewHistory([]); return }

      const reviewerIds = [...new Set(data.map(d => d.reviewed_by).filter(Boolean))]
      const { data: reviewers } = reviewerIds.length > 0
        ? await supabase.from('users').select('id, full_name').in('id', reviewerIds)
        : { data: [] }
      const reviewerMap = new Map<string, string>()
      for (const r of (reviewers ?? [])) reviewerMap.set(r.id, r.full_name)

      setReviewHistory(data.map(d => ({
        reviewed_at: d.reviewed_at ?? '',
        score: d.score,
        passed: d.passed ?? false,
        reviewer_name: d.reviewed_by ? (reviewerMap.get(d.reviewed_by) ?? 'Unknown') : 'System',
        notes: ((d.evidence as Record<string, unknown>)?.admin_notes as string) ?? '',
      })))
    } catch {
      setReviewHistory([])
    }
  }

  const handleReview = async (passed: boolean) => {
    if (!selectedAttempt) return
    setSaving(true)
    try {
      const normalizedScore = score[0]
      await supabase
        .from('screening_attempts')
        .update({
          passed,
          score: normalizedScore,
          reviewed_at: new Date().toISOString(),
          evidence: {
            ...(selectedAttempt.evidence ?? {}),
            admin_score: normalizedScore,
            quality_tier: qualityTier,
            admin_notes: notes || null,
          },
        })
        .eq('id', selectedAttempt.id)

      if (selectedAttempt.candidate_id) {
        try {
          await supabase
            .from('profiles_job_seeker')
            .update({ screening_score: normalizedScore, quality_tier: qualityTier })
            .eq('user_id', selectedAttempt.candidate_id)
        } catch { /* non-critical */ }
      }

      if (selectedAttempt.candidate_id && selectedAttempt.job_id) {
        try {
          const { data: app } = await supabase
            .from('applications')
            .select('id')
            .eq('candidate_id', selectedAttempt.candidate_id)
            .eq('job_id', selectedAttempt.job_id)
            .maybeSingle()
          if (app) {
            const { updateApplicationStatus } = await import('@/lib/v2/applications')
            await updateApplicationStatus(app.id, passed ? 'shortlisted' : 'rejected', 'admin', notes)
          }
        } catch { /* non-critical */ }
      }

      toast.success(`Candidate ${passed ? 'approved' : 'rejected'} with score ${normalizedScore}`)
      logAdminAction(passed ? 'scoring_approved' : 'scoring_rejected', selectedAttempt.id, { score: normalizedScore, qualityTier })
      setSelectedAttempt(null)
      loadAttempts()
    } catch {
      toast.error('Failed to save review')
    } finally {
      setSaving(false)
    }
  }

  const filtered = attempts.filter(a =>
    q === '' ||
    a.candidate_name?.toLowerCase().includes(q.toLowerCase()) ||
    a.criteria_name?.toLowerCase().includes(q.toLowerCase()) ||
    a.job_title?.toLowerCase().includes(q.toLowerCase())
  )

  if (loading) return <div className="space-y-6 p-6"><ListSkeleton count={5} /></div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold tracking-tight">Reviewer Scoring</h2>
        <p className="mt-0.5 text-[14px] text-muted-foreground">
          Score and review screening attempts awaiting evaluation
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className={cn('space-y-3', selectedAttempt ? 'lg:w-[380px] lg:flex-none' : 'flex-1')}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search candidates..." className="pl-9" />
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No pending attempts to review</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
              {filtered.map((attempt, i) => (
                <motion.div key={attempt.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <Card
                    className={cn('cursor-pointer transition-all duration-200 hover:border-border/80 hover:shadow-sm', selectedAttempt?.id === attempt.id && 'border-primary/50 ring-1 ring-primary/20')}
                    onClick={() => setSelectedAttempt(attempt)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <GAvatar name={attempt.candidate_name ?? 'U'} color={GRADIENTS[Math.abs((attempt.candidate_id ?? '').charCodeAt(0)) % GRADIENTS.length]} className="h-9 w-9 shrink-0 text-xs" />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium truncate">{attempt.candidate_name}</h4>
                          <p className="text-xs text-muted-foreground truncate">{attempt.criteria_name}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="text-[10px] border-amber-500/25 bg-amber-500/10 text-amber-500">
                            <Clock className="mr-1 h-2.5 w-2.5" /> Pending
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {selectedAttempt ? (
          <div className="flex-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{selectedAttempt.candidate_name}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedAttempt(null)}>
                    <ChevronLeft className="h-4 w-4" /> Back to list
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Screening Answers</h4>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-2">
                      {Object.entries(selectedAttempt.evidence).filter(([k]) => !['admin_notes', 'admin_score', 'quality_tier', 'video_url', 'video_duration_seconds', 'skills_results'].includes(k)).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium text-foreground">{key}:</span>
                          <p className="text-muted-foreground mt-0.5">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedAttempt.candidate_resume_url ? (
                      <>
                        <h4 className="text-sm font-medium">Resume Preview</h4>
                        <iframe src={selectedAttempt.candidate_resume_url} className="w-full h-[300px] rounded-lg border border-border" title="Resume" />
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 bg-muted/30 rounded-lg">
                        <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground">No resume available</p>
                      </div>
                    )}
                  </div>
                </div>

                {Boolean((selectedAttempt.evidence as Record<string, unknown>)?.video_url) && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    <h4 className="text-sm font-medium">Video Interview</h4>
                    <VideoPlayer
                      src={(selectedAttempt.evidence as Record<string, unknown>).video_url as string}
                      className="w-full rounded-lg"
                    />
                  </div>
                )}

                <div className="space-y-3 pt-3 border-t border-border">
                  <h4 className="text-sm font-medium">Scoring</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Score</span>
                        <Badge variant="secondary" className="text-sm font-mono">{score[0]}/100</Badge>
                      </div>
                      <Slider value={score} onValueChange={setScore} min={0} max={100} step={1} />
                    </div>
                    <div className="w-[180px] space-y-1">
                      <label className="text-sm text-muted-foreground">Quality Tier</label>
                      <Select value={qualityTier} onValueChange={setQualityTier}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="unscreened">Unscreened</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add review notes..." className="min-h-[80px]" />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" className="gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400" disabled={saving} onClick={() => handleReview(true)}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
                    </Button>
                    <Button variant="outline" className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400" disabled={saving} onClick={() => handleReview(false)}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Reject
                    </Button>
                  </div>
                </div>

                {reviewHistory.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-border">
                    <h4 className="text-sm font-medium flex items-center gap-1.5"><History className="h-3.5 w-3.5" /> Previous Reviews</h4>
                    <div className="space-y-1">
                      {reviewHistory.map((h, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs rounded-lg bg-muted/30 px-3 py-2">
                          <Badge variant="outline" className={cn('text-[10px]', h.passed ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500' : 'border-rose-500/25 bg-rose-500/10 text-rose-500')}>
                            {h.passed ? 'Passed' : 'Failed'}
                          </Badge>
                          <span className="font-mono">{h.score}/100</span>
                          <span className="text-muted-foreground">by {h.reviewer_name}</span>
                          <span className="text-muted-foreground/70 ml-auto">{new Date(h.reviewed_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Star className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-semibold">Select an Attempt</h3>
              <p className="mt-2 text-sm text-muted-foreground">Choose a screening attempt from the list to begin scoring</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
