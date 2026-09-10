import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Search, CheckCircle2, XCircle, Eye, Loader2, FileText,
  Calendar, SlidersHorizontal, ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GAvatar } from '@/components/ui-kit'
import { GRADIENTS } from '@/data/constants'
import { cn } from '@/lib/utils'
import { ListSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/db'
import { AdminVideoReview } from '@/components/AdminVideoReview'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  criteria_name?: string
  job_title?: string
  video_url?: string
  status?: string
}

export default function ScreeningQueue() {
  const [attempts, setAttempts] = useState<ScreeningAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('pending')
  const [statusFilter, setStatusFilter] = useState('all')
  const [trackFilter, setTrackFilter] = useState('all')
  const [scoreMin, setScoreMin] = useState('')
  const [scoreMax, setScoreMax] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkAction, setBulkAction] = useState<'pass' | 'fail' | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const loadAttempts = useCallback(async () => {
    setLoading(true)
    try {
      const { data: attemptsData, error } = await supabase
        .from('screening_attempts')
        .select('id, candidate_id, criteria_id, job_id, score, max_score, passed, evidence, created_at, reviewed_at, reviewed_by')
        .order('created_at', { ascending: false })

      if (error || !attemptsData) {
        toast.error('Failed to load screening attempts')
        setLoading(false)
        return
      }

      const candidateIds = [...new Set(attemptsData.map(a => a.candidate_id))]
      const criteriaIds = [...new Set(attemptsData.map(a => a.criteria_id).filter(Boolean))]
      const jobIds = [...new Set(attemptsData.map(a => a.job_id).filter(Boolean))]

      const [candidatesRes, criteriaRes, jobsRes] = await Promise.all([
        candidateIds.length > 0
          ? supabase.from('users').select('id, full_name, email').in('id', candidateIds)
          : { data: [] },
        criteriaIds.length > 0
          ? supabase.from('screening_criteria').select('id, name, category').in('id', criteriaIds)
          : { data: [] },
        jobIds.length > 0
          ? supabase.from('jobs').select('id, title').in('id', jobIds)
          : { data: [] },
      ])

      const nameMap = new Map<string, { full_name: string; email: string }>()
      for (const u of (candidatesRes.data ?? [])) nameMap.set(u.id, { full_name: u.full_name, email: u.email })
      const critMap = new Map<string, string>()
      for (const c of (criteriaRes.data ?? [])) critMap.set(c.id, c.name)
      const jobMap = new Map<string, string>()
      for (const j of (jobsRes.data ?? [])) jobMap.set(j.id, j.title)

      setAttempts(attemptsData.map(a => ({
        ...a,
        candidate_name: nameMap.get(a.candidate_id)?.full_name ?? 'Unknown',
        candidate_email: nameMap.get(a.candidate_id)?.email ?? '',
        criteria_name: critMap.get(a.criteria_id) ?? 'Unknown',
        job_title: a.job_id ? (jobMap.get(a.job_id) ?? 'Unknown') : 'General',
        video_url: (a.evidence as Record<string, unknown>)?.video_url as string | undefined,
        status: a.reviewed_at ? (a.passed ? 'passed' : 'failed') : 'pending',
      })))
    } catch {
      toast.error('Failed to load screening data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAttempts() }, [loadAttempts])

  useEffect(() => {
    const channel = supabase
      .channel('screening-queue-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'screening_attempts' },
        () => { loadAttempts() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadAttempts])

  const reviewAttempt = async (attemptId: string, passed: boolean, notes?: string) => {
    setProcessingId(attemptId)
    try {
      const attempt = attempts.find(a => a.id === attemptId)
      await supabase
        .from('screening_attempts')
        .update({
          passed,
          score: passed ? 100 : 0,
          reviewed_at: new Date().toISOString(),
          evidence: { ...(attempt?.evidence ?? {}), admin_notes: notes ?? null },
        })
        .eq('id', attemptId)

      if (attempt?.candidate_id && attempt?.job_id) {
        try {
          const { data: app } = await supabase
            .from('applications')
            .select('id')
            .eq('candidate_id', attempt.candidate_id)
            .eq('job_id', attempt.job_id)
            .maybeSingle()
          if (app) {
            const { updateApplicationStatus } = await import('@/lib/v2/applications')
            await updateApplicationStatus(app.id, passed ? 'shortlisted' : 'rejected', 'admin', notes)
          }
        } catch { /* non-critical */ }
      }

      toast.success(`Candidate ${passed ? 'approved' : 'rejected'}`)
      logAdminAction(passed ? 'screening_approved' : 'screening_rejected', attemptId)
      loadAttempts()
    } catch {
      toast.error('Failed to update screening')
    } finally {
      setProcessingId(null)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id)))
    }
  }

  const executeBulkAction = async () => {
    if (!bulkAction) return
    try {
      const pendingSelected = filtered.filter(a => selectedIds.has(a.id) && !a.reviewed_at)
      await Promise.all(
        pendingSelected.map(async attempt => {
          const isPass = bulkAction === 'pass'
          await supabase
            .from('screening_attempts')
            .update({
              passed: isPass,
              score: isPass ? 100 : 0,
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', attempt.id)
        })
      )
      toast.success(`${pendingSelected.length} candidate${pendingSelected.length !== 1 ? 's' : ''} ${bulkAction === 'pass' ? 'approved' : 'rejected'}`)
      logAdminAction(`bulk_screening_${bulkAction}`, undefined, { count: pendingSelected.length })
      setSelectedIds(new Set())
      loadAttempts()
    } catch {
      toast.error('Failed to complete bulk action')
    } finally {
      setBulkDialogOpen(false)
      setBulkAction(null)
    }
  }

  const filtered = useMemo(() => {
    return attempts
      .filter(a => {
        if (tab === 'pending') return !a.reviewed_at
        if (tab === 'passed') return a.passed === true
        if (tab === 'failed') return a.passed === false && a.reviewed_at
        return true
      })
      .filter(a => {
        if (statusFilter !== 'all') {
          if (statusFilter === 'pending' && a.reviewed_at) return false
          if (statusFilter === 'passed' && a.passed !== true) return false
          if (statusFilter === 'failed' && a.passed !== false) return false
        }
        return true
      })
      .filter(a => {
        if (scoreMin && a.score < Number(scoreMin)) return false
        if (scoreMax && a.score > Number(scoreMax)) return false
        return true
      })
      .filter(a => {
        if (dateFrom && new Date(a.created_at) < new Date(dateFrom)) return false
        if (dateTo && new Date(a.created_at) > new Date(dateTo)) return false
        return true
      })
      .filter(a =>
        q === '' ||
        a.candidate_name?.toLowerCase().includes(q.toLowerCase()) ||
        a.criteria_name?.toLowerCase().includes(q.toLowerCase()) ||
        a.job_title?.toLowerCase().includes(q.toLowerCase())
      )
  }, [attempts, tab, statusFilter, scoreMin, scoreMax, dateFrom, dateTo, q])

  const pendingCount = attempts.filter(a => !a.reviewed_at).length
  const passedCount = attempts.filter(a => a.passed === true).length
  const failedCount = attempts.filter(a => a.passed === false && a.reviewed_at).length

  if (loading) return <div className="space-y-6 p-6"><ListSkeleton count={5} /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">Screening Queue</h2>
          <p className="mt-0.5 text-[14px] text-muted-foreground">
            Review candidate screening submissions across all jobs
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadAttempts}>
          <Loader2 className="mr-1 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by candidate, job, or criteria..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={trackFilter} onValueChange={setTrackFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Track" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tracks</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
              <SelectItem value="early_career">Early Career</SelectItem>
              <SelectItem value="experienced">Experienced</SelectItem>
              <SelectItem value="leadership">Leadership</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px]" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Score:</span>
          <Input type="number" value={scoreMin} onChange={e => setScoreMin(e.target.value)} placeholder="Min" className="w-[70px]" />
          <span className="text-xs text-muted-foreground">-</span>
          <Input type="number" value={scoreMax} onChange={e => setScoreMax(e.target.value)} placeholder="Max" className="w-[70px]" />
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" className="gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400" onClick={() => { setBulkAction('pass'); setBulkDialogOpen(true) }}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400" onClick={() => { setBulkAction('fail'); setBulkDialogOpen(true) }}>
            <XCircle className="h-3.5 w-3.5" /> Reject
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">All <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{attempts.length}</Badge></TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">Pending <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{pendingCount}</Badge></TabsTrigger>
          <TabsTrigger value="passed" className="gap-1.5">Passed <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{passedCount}</Badge></TabsTrigger>
          <TabsTrigger value="failed" className="gap-1.5">Failed <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{failedCount}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No screening submissions found</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {tab === 'pending' && (
                <div className="flex items-center gap-2 px-1">
                  <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
                  <span className="text-xs text-muted-foreground">Select all pending</span>
                </div>
              )}
              {filtered.map((attempt, i) => (
                <motion.div key={attempt.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {!attempt.reviewed_at && (
                            <Checkbox checked={selectedIds.has(attempt.id)} onCheckedChange={() => toggleSelect(attempt.id)} className="mt-0.5" />
                          )}
                          <GAvatar name={attempt.candidate_name ?? 'U'} color={GRADIENTS[Math.abs((attempt.candidate_id ?? '').charCodeAt(0)) % GRADIENTS.length]} className="h-10 w-10 shrink-0 text-xs" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold truncate">{attempt.candidate_name}</h3>
                              <Badge variant="outline" className={cn('text-[10px] capitalize', attempt.passed && attempt.reviewed_at && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500', attempt.passed === false && attempt.reviewed_at && 'border-rose-500/25 bg-rose-500/10 text-rose-500', !attempt.reviewed_at && 'border-amber-500/25 bg-amber-500/10 text-amber-500')}>
                                {attempt.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {attempt.criteria_name} &middot; {attempt.job_title}
                            </p>
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground/70">
                              <span>Score: {attempt.score}/{attempt.max_score}</span>
                              <span>{new Date(attempt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {attempt.job_id && (
                            <Link to={`/jobs/${attempt.job_id}`}>
                              <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                            </Link>
                          )}
                          <Link to={attempt.candidate_id ? `/job-seekers/${attempt.candidate_id}` : '#'}>
                            <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                          </Link>
                          {attempt.video_url && (
                            <Button variant="ghost" size="sm" onClick={() => setReviewingId(attempt.id)}>
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {!attempt.reviewed_at && (
                            <>
                              <Button variant="outline" size="sm" className="gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400" disabled={processingId === attempt.id} onClick={() => reviewAttempt(attempt.id, true)}>
                                {processingId === attempt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Pass
                              </Button>
                              <Button variant="outline" size="sm" className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400" disabled={processingId === attempt.id} onClick={() => reviewAttempt(attempt.id, false)}>
                                {processingId === attempt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Fail
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>

      {reviewingId && (() => {
        const attempt = attempts.find(a => a.id === reviewingId)
        if (!attempt) return null
        return (
          <AdminVideoReview
            attemptId={attempt.id}
            candidateId={attempt.candidate_id}
            candidateName={attempt.candidate_name ?? 'Unknown'}
            videoUrl={attempt.video_url}
            screeningAnswers={attempt.evidence}
            onClose={() => setReviewingId(null)}
            onReviewed={() => { setReviewingId(null); loadAttempts() }}
          />
        )
      })()}

      <AlertDialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{bulkAction === 'pass' ? 'Bulk Approve' : 'Bulk Reject'}</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === 'pass'
                ? `Approve ${selectedIds.size} pending screening attempt${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`
                : `Reject ${selectedIds.size} pending screening attempt${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkAction}>{bulkAction === 'pass' ? 'Approve All' : 'Reject All'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
