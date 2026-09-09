import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { motion } from 'framer-motion'
import { Eye, CheckCircle2, XCircle, FileText, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionHeader } from '@/components/ui-kit'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { ListSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { notifyScreeningUpdate } from '@/lib/notifications'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ScreeningAttempt {
  id: string
  candidate_id: string
  criteria_id: string
  score: number
  max_score: number
  passed: boolean
  evidence: Record<string, unknown>
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  candidate_name?: string
  criteria_name?: string
}

export default function RecruiterScreening() {
  const { jobId } = useParams<{ jobId: string }>()
  const { user } = useAuth()
  const [attempts, setAttempts] = useState<ScreeningAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkAction, setBulkAction] = useState<'pass' | 'fail' | null>(null)

  useEffect(() => {
    loadAttempts()
  }, [jobId, user])

  const loadAttempts = async () => {
    if (!user) return
    setLoading(true)
    try {
      const query = supabase
        .from('screening_attempts')
        .select('id, candidate_id, criteria_id, score, max_score, passed, evidence, created_at, reviewed_at, reviewed_by')
        .order('created_at', { ascending: false })

      const { data: attemptsData, error } = await query
      if (error || !attemptsData) {
        setLoading(false)
        return
      }

      const candidateIds = [...new Set(attemptsData.map(a => a.candidate_id))]
      const criteriaIds = [...new Set(attemptsData.map(a => a.criteria_id).filter(Boolean))]

      const [candidatesRes, criteriaRes] = await Promise.all([
        candidateIds.length > 0
          ? supabase.from('users').select('id, full_name').in('id', candidateIds)
          : { data: [] },
        criteriaIds.length > 0
          ? supabase.from('screening_criteria').select('id, name, category').in('id', criteriaIds)
          : { data: [] },
      ])

      const nameMap = new Map<string, string>()
      for (const u of (candidatesRes.data ?? [])) nameMap.set(u.id, u.full_name)
      const critMap = new Map<string, { name: string; category: string }>()
      for (const c of (criteriaRes.data ?? [])) critMap.set(c.id, { name: c.name, category: c.category })

      setAttempts(attemptsData.map(a => ({
        ...a,
        candidate_name: nameMap.get(a.candidate_id) ?? 'Unknown',
        criteria_name: critMap.get(a.criteria_id)?.name ?? 'Unknown',
      })))
    } catch (err) {
      console.error('Failed to load screening attempts:', err)
      toast.error('Failed to load screening data')
    } finally {
      setLoading(false)
    }
  }

  const reviewAttempt = async (attemptId: string, passed: boolean, notes?: string) => {
    if (!user) return
    try {
      const attempt = attempts.find((a) => a.id === attemptId)
      await supabase
        .from('screening_attempts')
        .update({
          passed,
          score: passed ? 100 : 0,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          evidence: { admin_notes: notes ?? null },
        })
        .eq('id', attemptId)
      toast.success(`Candidate ${passed ? 'approved' : 'rejected'}`)
      if (attempt) {
        notifyScreeningUpdate(
          attempt.candidate_name ?? 'Candidate',
          'screening',
          passed ? 'pass' : 'fail',
        )
      }
      loadAttempts()
    } catch (err) {
      console.error('Failed to review attempt:', err)
      toast.error('Failed to update screening')
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
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
      setSelectedIds(new Set(filtered.map((a) => a.id)))
    }
  }

  const executeBulkAction = async () => {
    if (!user || !bulkAction) return
    try {
      const pendingSelected = filtered.filter((a) => selectedIds.has(a.id) && !a.reviewed_at)
      await Promise.all(
        pendingSelected.map(async (attempt) => {
          const isPass = bulkAction === 'pass'
          await supabase
            .from('screening_attempts')
            .update({
              passed: isPass,
              score: isPass ? 100 : 0,
              reviewed_by: user.id,
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', attempt.id)
          notifyScreeningUpdate(attempt.candidate_name ?? 'Candidate', 'screening', bulkAction)
        })
      )
      toast.success(`${pendingSelected.length} candidate${pendingSelected.length !== 1 ? 's' : ''} ${bulkAction === 'pass' ? 'approved' : 'rejected'}`)
      setSelectedIds(new Set())
      loadAttempts()
    } catch (err) {
      console.error('Bulk action failed:', err)
      toast.error('Failed to complete bulk action')
    } finally {
      setBulkDialogOpen(false)
      setBulkAction(null)
    }
  }

  const filtered = attempts
    .filter(a => {
      if (tab === 'pending') return !a.reviewed_at
      if (tab === 'pass') return a.passed
      if (tab === 'fail') return !a.passed && a.reviewed_at
      return true
    })
    .filter(a =>
      q === '' ||
      a.candidate_name?.toLowerCase().includes(q.toLowerCase()) ||
      a.criteria_name?.toLowerCase().includes(q.toLowerCase())
    )

  const pendingCount = attempts.filter(a => !a.reviewed_at).length
  const passCount = attempts.filter(a => a.passed).length
  const failCount = attempts.filter(a => !a.passed && a.reviewed_at).length

  if (loading) return <div className="space-y-6 p-6"><ListSkeleton count={4} /></div>

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Screening Review"
        subtitle={jobId ? "Review screening submissions for this job" : "Review candidate screening submissions across all jobs"}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by candidate, job, or criteria..." className="pl-9" />
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
              onClick={() => { setBulkAction('pass'); setBulkDialogOpen(true) }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400"
              onClick={() => { setBulkAction('fail'); setBulkDialogOpen(true) }}
            >
              <XCircle className="h-3.5 w-3.5" /> Reject
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">All <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{attempts.length}</Badge></TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">Pending <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{pendingCount}</Badge></TabsTrigger>
          <TabsTrigger value="pass" className="gap-1.5">Passed <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{passCount}</Badge></TabsTrigger>
          <TabsTrigger value="fail" className="gap-1.5">Failed <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{failCount}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-3">
          {filtered.length === 0 ? (
            <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No screening submissions found</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {tab === 'pending' && (
                <div className="flex items-center gap-2 px-1">
                  <Checkbox
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-xs text-muted-foreground">Select all pending</span>
                </div>
              )}
              {filtered.map((attempt, i) => (
              <motion.div
                key={attempt.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {!attempt.reviewed_at && (
                          <Checkbox
                            checked={selectedIds.has(attempt.id)}
                            onCheckedChange={() => toggleSelect(attempt.id)}
                            className="mt-0.5"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold truncate">{attempt.candidate_name}</h3>
                            <Badge variant="outline" className={cn(
                              'text-[10px] capitalize',
                              attempt.passed && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500',
                              !attempt.passed && attempt.reviewed_at && 'border-rose-500/25 bg-rose-500/10 text-rose-500',
                              !attempt.reviewed_at && 'border-amber-500/25 bg-amber-500/10 text-amber-500',
                            )}>
                              {!attempt.reviewed_at ? 'pending' : attempt.passed ? 'pass' : 'fail'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {attempt.criteria_name}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {new Date(attempt.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedId(expandedId === attempt.id ? null : attempt.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!attempt.reviewed_at && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
                              onClick={() => reviewAttempt(attempt.id, true)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Pass
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400"
                              onClick={() => reviewAttempt(attempt.id, false)}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Fail
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {expandedId === attempt.id && (
                      <div className="mt-3 pt-3 border-t border-border/60">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Score:</p>
                        <p className="text-sm text-foreground">
                          {attempt.score}/{attempt.max_score} ({attempt.passed ? 'Passed' : 'Failed'})
                        </p>
                        {attempt.evidence && Object.keys(attempt.evidence).length > 0 && (
                          <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(attempt.evidence, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            </>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === 'pass' ? 'Bulk Approve' : 'Bulk Reject'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === 'pass'
                ? `Approve ${selectedIds.size} pending screening attempt${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`
                : `Reject ${selectedIds.size} pending screening attempt${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkAction}>
              {bulkAction === 'pass' ? 'Approve All' : 'Reject All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
