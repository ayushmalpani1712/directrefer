import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowLeft, CheckCircle2, XCircle, Trophy, RotateCcw,
  ChevronRight, FileText, Clock, Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ListSkeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface AttemptRecord {
  id: string
  score: number
  max_score: number
  passed: boolean
  evidence: Record<string, unknown>
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

interface ScreeningResults {
  bestScore: number
  latestScore: number
  passed: boolean
  attempts: AttemptRecord[]
  totalAttempts: number
  qualityTier: string
  feedback: string | null
}

const COOLDOWN_DAYS = 7

export default function ScreeningResults() {
  const { jobId } = useParams<{ jobId: string }>()
  const { user } = useAuth()
  const [results, setResults] = useState<ScreeningResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [jobTitle, setJobTitle] = useState('')
  const [canRetake, setCanRetake] = useState(false)
  const [cooldownRemaining, setCooldownRemaining] = useState('')

  useEffect(() => {
    if (!jobId || !user) return
    loadResults()
  }, [jobId, user])

  const loadResults = async () => {
    if (!user || !jobId) return
    setLoading(true)
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select('title')
        .eq('id', jobId)
        .single()
      if (job) setJobTitle(job.title)

      const { data: attempts } = await supabase
        .from('screening_attempts')
        .select('id, score, max_score, passed, evidence, created_at, reviewed_at, reviewed_by')
        .eq('candidate_id', user.id)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })

      if (!attempts || attempts.length === 0) {
        setLoading(false)
        return
      }

      const bestScore = Math.max(...attempts.map(a => a.score))
      const latestScore = attempts[0].score
      const passed = attempts.some(a => a.passed)

      let feedback: string | null = null
      const reviewedAttempt = attempts.find(a => a.reviewed_at && a.evidence?.admin_notes)
      if (reviewedAttempt?.evidence?.admin_notes) {
        feedback = reviewedAttempt.evidence.admin_notes as string
      }

      // Determine quality tier
      let qualityTier = 'unscreened'
      if (bestScore >= 80) qualityTier = 'premium'
      else if (bestScore >= 60) qualityTier = 'standard'

      // Check cooldown for retake
      const lastAttempt = attempts[0]
      const lastAttemptDate = new Date(lastAttempt.created_at)
      const cooldownEnd = new Date(lastAttemptDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
      const now = new Date()

      if (!passed && now >= cooldownEnd) {
        setCanRetake(true)
      } else if (!passed && now < cooldownEnd) {
        const remaining = cooldownEnd.getTime() - now.getTime()
        const days = Math.ceil(remaining / (24 * 60 * 60 * 1000))
        setCooldownRemaining(`${days} day${days !== 1 ? 's' : ''}`)
      }

      setResults({
        bestScore,
        latestScore,
        passed,
        attempts,
        totalAttempts: attempts.length,
        qualityTier,
        feedback,
      })
    } catch (err) {
      console.error('Failed to load screening results:', err)
      toast.error('Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  const tierConfig: Record<string, { label: string; color: string; bgClass: string }> = {
    premium: { label: 'Premium', color: 'text-amber-500', bgClass: 'bg-amber-500/10 border-amber-500/25' },
    standard: { label: 'Standard', color: 'text-emerald-500', bgClass: 'bg-emerald-500/10 border-emerald-500/25' },
    unscreened: { label: 'Unscreened', color: 'text-muted-foreground', bgClass: 'bg-muted border-border' },
  }

  if (loading) return <div className="space-y-6 p-6 max-w-2xl mx-auto"><ListSkeleton count={3} /></div>

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <FileText className="h-12 w-12 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold">No Screening Results</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          You haven&apos;t completed the screening for this position yet.
        </p>
        <Link to="/job-seeker/browse-jobs">
          <Button className="bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200">Browse Jobs</Button>
        </Link>
      </div>
    )
  }

  const tier = tierConfig[results.qualityTier] || tierConfig.unscreened

  // Category breakdown from evidence
  const categoryScores: Record<string, { correct: number; total: number }> = {}
  for (const attempt of results.attempts) {
    const evidence = attempt.evidence as Record<string, unknown>
    const resultsData = evidence?.results as Record<string, unknown> | undefined
    const scores = resultsData?.categoryScores as Record<string, { correct: number; total: number }> | undefined
    if (scores) {
      for (const [cat, val] of Object.entries(scores)) {
        if (!categoryScores[cat]) categoryScores[cat] = { correct: 0, total: 0 }
        categoryScores[cat].correct += val.correct
        categoryScores[cat].total += val.total
      }
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Link to="/job-seeker/browse-jobs" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-xs text-muted-foreground">Back to jobs</span>
      </div>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className={cn(
              'mx-auto flex h-20 w-20 items-center justify-center rounded-full',
              results.passed ? 'bg-emerald-500/10' : 'bg-amber-500/10',
            )}>
              {results.passed ? (
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              ) : (
                <XCircle className="h-10 w-10 text-amber-500" />
              )}
            </div>

            <div>
              <h1 className="text-lg font-bold">Screening Results</h1>
              <p className="text-sm text-muted-foreground">{jobTitle}</p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="flex items-center gap-1.5">
                  <Trophy className={cn('h-5 w-5', results.passed ? 'text-emerald-500' : 'text-amber-500')} />
                  <span className="text-3xl font-bold">{results.bestScore}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Best Score</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold">{results.totalAttempts}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Attempts</p>
              </div>
            </div>

            <Badge variant="outline" className={cn('border gap-1.5', tier.bgClass, tier.color)}>
              <Star className="h-3 w-3" />
              {tier.label} Quality
            </Badge>

            <p className={cn(
              'text-sm font-medium',
              results.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
            )}>
              {results.passed
                ? 'Congratulations! You passed the screening.'
                : 'You did not pass this time. You can retake after the cooldown period.'}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Score breakdown */}
      {Object.keys(categoryScores).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-semibold">Category Breakdown</h3>
              {Object.entries(categoryScores).map(([cat, scores]) => {
                const pct = scores.total > 0 ? Math.round((scores.correct / scores.total) * 100) : 0
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground capitalize">{cat.replace('_', ' ')}</span>
                      <span className="font-medium">{scores.correct}/{scores.total} ({pct}%)</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Reviewer feedback */}
      {results.feedback && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardContent className="p-5 space-y-2">
              <h3 className="text-sm font-semibold">Reviewer Feedback</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{results.feedback}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Attempt history */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-semibold">Attempt History</h3>
            <div className="space-y-2">
              {results.attempts.map((attempt, idx) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">#{results.totalAttempts - idx}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{attempt.score}%</span>
                        {attempt.passed ? (
                          <Badge variant="success" className="text-[10px]">Passed</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Failed</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(attempt.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Actions */}
      <div className="flex gap-3">
        {results.passed ? (
          <Link to="/job-seeker/browse-jobs" className="flex-1">
            <Button className="w-full bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200 gap-2">
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <>
            {canRetake ? (
              <Link to={`/job-seeker/screening/${jobId}`} className="flex-1">
                <Button className="w-full bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200 gap-2">
                  <RotateCcw className="h-4 w-4" /> Retake Screening
                </Button>
              </Link>
            ) : (
              <div className="flex-1">
                <Button disabled className="w-full gap-2">
                  <RotateCcw className="h-4 w-4" /> Retake in {cooldownRemaining}
                </Button>
              </div>
            )}
            <Link to="/job-seeker/browse-jobs" className="flex-1">
              <Button variant="outline" className="w-full">Browse Jobs</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
