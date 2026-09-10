import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, AlertCircle, Send, RotateCcw, Clock, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ListSkeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { onScreeningPassed } from '@/lib/v2/behaviorScore'
import { ScreeningProgress } from '@/components/ScreeningProgress'
import { VideoUpload } from '@/components/VideoUpload'
import { SkillsAssessment } from '@/components/SkillsAssessment'

interface Criteria {
  id: string
  name: string
  description: string
  category: string
  weight: number
}

interface ScreeningAnswer {
  criteria_id: string
  answer: string
}

interface PreviousAttempt {
  id: string
  score: number
  max_score: number
  passed: boolean
  created_at: string
  attempt_number: number
}

const COOLDOWN_DAYS = 7

export default function ScreeningSubmit() {
  const { jobId } = useParams<{ jobId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [criteria, setCriteria] = useState<Criteria[]>([])
  const [answers, setAnswers] = useState<ScreeningAnswer[]>([])
  const [jobTitle, setJobTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [existingAttempt, setExistingAttempt] = useState<string | null>(null)
  const [previousAttempts, setPreviousAttempts] = useState<PreviousAttempt[]>([])
  const [bestScore, setBestScore] = useState<number | null>(null)
  const [canRetake, setCanRetake] = useState(true)
  const [cooldownRemaining, setCooldownRemaining] = useState('')
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [currentStep, setCurrentStep] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [skillsResults, setSkillsResults] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!jobId || !user) return
    const load = async () => {
      setLoading(true)
      try {
        const { data: job } = await supabase.from('jobs').select('title').eq('id', jobId).single()
        if (job) setJobTitle(job.title)

        const { data: allAttempts } = await supabase
          .from('screening_attempts')
          .select('id, score, max_score, passed, created_at')
          .eq('candidate_id', user.id)
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })

        if (allAttempts && allAttempts.length > 0) {
          const passedAttempt = allAttempts.find(a => a.passed)
          if (passedAttempt) {
            setExistingAttempt(passedAttempt.id)
            setLoading(false)
            return
          }

          const best = Math.max(...allAttempts.map(a => a.score))
          setBestScore(best)
          setAttemptNumber(allAttempts.length + 1)

          const mappedAttempts: PreviousAttempt[] = allAttempts.map((a, idx) => ({
            id: a.id,
            score: a.score,
            max_score: a.max_score,
            passed: a.passed,
            created_at: a.created_at,
            attempt_number: allAttempts.length - idx,
          }))
          setPreviousAttempts(mappedAttempts)

          const lastAttempt = allAttempts[0]
          const lastDate = new Date(lastAttempt.created_at)
          const cooldownEnd = new Date(lastDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
          const now = new Date()

          if (now < cooldownEnd) {
            setCanRetake(false)
            const remaining = cooldownEnd.getTime() - now.getTime()
            const days = Math.ceil(remaining / (24 * 60 * 60 * 1000))
            setCooldownRemaining(`${days} day${days !== 1 ? 's' : ''}`)
          }
        }

        const { data: crits } = await supabase
          .from('screening_criteria')
          .select('id, name, description, category, weight')
          .eq('is_active', true)

        if (crits) {
          setCriteria(crits)
          setAnswers(crits.map((c: Criteria) => ({ criteria_id: c.id, answer: '' })))
        }
      } catch (err) {
        console.error('Failed to load screening:', err)
        toast.error('Failed to load screening')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [jobId, user])

  const updateAnswer = (criteriaId: string, answer: string) => {
    setAnswers(prev => prev.map(a => a.criteria_id === criteriaId ? { ...a, answer } : a))
  }

  const allAnswered = answers.every(a => a.answer.trim().length > 0)

  const handleSubmit = async () => {
    if (!user || !jobId || !allAnswered) return
    setSubmitting(true)
    try {
      for (const crit of criteria) {
        const answer = answers.find(a => a.criteria_id === crit.id)
        await supabase.from('screening_attempts').insert({
          candidate_id: user.id,
          job_id: jobId,
          criteria_id: crit.id,
          result: 'pending',
          details: { answer: answer?.answer ?? '' },
          evidence: {
            video_url: videoUrl,
            video_duration_seconds: videoDuration,
            skills_results: skillsResults,
          },
          status: 'pending_review',
        })
      }
      const { data: app } = await supabase
        .from('applications')
        .select('id')
        .eq('candidate_id', user.id)
        .eq('job_id', jobId)
        .maybeSingle()
      if (app) {
        const { updateApplicationStatus } = await import('@/lib/v2/applications')
        await updateApplicationStatus(app.id, 'screening', user.id)
      }
      toast.success('Screening submitted successfully!')
      onScreeningPassed(user.id).catch(() => {})
      navigate('/job-seeker/browse-jobs')
    } catch (err) {
      console.error('Failed to submit screening:', err)
      toast.error('Failed to submit screening')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="space-y-6 p-6"><ListSkeleton count={4} /></div>

  if (existingAttempt) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <h2 className="text-lg font-semibold">Already Screened</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          You have already passed the screening for this position. You can proceed to request a referral.
        </p>
        <Link to="/job-seeker/browse-jobs">
          <Button className="bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200">Browse Jobs</Button>
        </Link>
      </div>
    )
  }

  if (!canRetake && previousAttempts.length > 0) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Link to="/job-seeker/browse-jobs" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-xs text-muted-foreground">Back to jobs</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold">Cooldown Period</h2>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                You can retake the screening in <span className="font-medium text-foreground">{cooldownRemaining}</span>.
                Minimum {COOLDOWN_DAYS} days between attempts.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Attempt history */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-sm font-semibold">Attempt History</h3>
              <div className="space-y-2">
                {previousAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground">#{attempt.attempt_number}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{attempt.score}%</span>
                          {attempt.passed ? (
                            <Badge variant="success" className="text-[10px]">Passed</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Failed</Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(attempt.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {bestScore !== null && (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
                  <span className="text-muted-foreground">Best Score</span>
                  <span className="font-medium">{bestScore}%</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <Link to="/job-seeker/browse-jobs">
          <Button variant="outline" className="w-full">Browse Jobs</Button>
        </Link>
      </div>
    )
  }

  const screeningSteps = [
    { id: 'questionnaire', label: 'Questionnaire', icon: FileText, timeEstimate: '~5 min' },
    { id: 'skills', label: 'Skills Assessment', icon: Trophy, timeEstimate: '~10 min' },
    { id: 'video', label: 'Video Interview', icon: Send, timeEstimate: '~15 min' },
    { id: 'complete', label: 'Submit', icon: CheckCircle2, timeEstimate: '' },
  ]

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Link to="/job-seeker/browse-jobs" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-xs text-muted-foreground">Back to jobs</span>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold">Screening: {jobTitle}</h1>
                  {attemptNumber > 1 && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <RotateCcw className="h-2.5 w-2.5" /> Attempt #{attemptNumber}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Answer all {criteria.length} questions to complete the screening
                </p>
              </div>
              {bestScore !== null && (
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                    {bestScore}%
                  </div>
                  <p className="text-[10px] text-muted-foreground">Previous best</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <ScreeningProgress
        steps={screeningSteps}
        currentStepIndex={currentStep}
        variant="compact"
      />

      {previousAttempts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-xs font-semibold mb-2">Previous Attempts</h3>
              <div className="flex flex-wrap gap-2">
                {previousAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5"
                  >
                    <span className="text-[10px] font-mono text-muted-foreground">#{attempt.attempt_number}</span>
                    <span className={cn(
                      'text-xs font-medium',
                      attempt.passed ? 'text-emerald-500' : 'text-muted-foreground',
                    )}>
                      {attempt.score}%
                    </span>
                    {attempt.passed && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {currentStep === 0 && (
        <div className="space-y-4">
          {criteria.map((crit, i) => {
            const answer = answers.find(a => a.criteria_id === crit.id)
            return (
              <motion.div
                key={crit.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * (i + 1) }}
              >
                <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">{crit.name}</h3>
                        {crit.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{crit.description}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">{crit.category}</Badge>
                    </div>
                    <Textarea
                      value={answer?.answer ?? ''}
                      onChange={(e) => updateAnswer(crit.id, e.target.value)}
                      placeholder="Type your answer here..."
                      className="min-h-[100px] text-sm"
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}

          {criteria.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {allAnswered ? (
                      <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> All questions answered</>
                    ) : (
                      <><AlertCircle className="h-4 w-4 text-amber-500" /> {answers.filter(a => !a.answer.trim()).length} questions remaining</>
                    )}
                  </div>
                  <Button
                    onClick={() => setCurrentStep(1)}
                    disabled={!allAnswered}
                    className="bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200 gap-2"
                  >
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      {currentStep === 1 && user && jobId && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <SkillsAssessment
            jobId={jobId}
            userId={user.id}
            onComplete={(results) => {
              setSkillsResults(results as unknown as Record<string, unknown>)
              setCurrentStep(2)
            }}
            onCancel={() => setCurrentStep(0)}
          />
        </motion.div>
      )}

      {currentStep === 2 && user && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <VideoUpload
            userId={user.id}
            jobId={jobId}
            onUploadComplete={(url, duration) => {
              setVideoUrl(url)
              setVideoDuration(duration)
              setCurrentStep(3)
            }}
            onCancel={() => setCurrentStep(1)}
          />
        </motion.div>
      )}

      {currentStep === 3 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-sm font-semibold">Review & Submit</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{criteria.length} questionnaire answers</span>
                </div>
                <div className="flex items-center gap-2">
                  {skillsResults ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span>Skills assessment completed</span></>
                  ) : (
                    <><AlertCircle className="h-3.5 w-3.5 text-amber-500" /><span>Skills assessment skipped</span></>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {videoUrl ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span>Video recorded ({videoDuration ?? 0}s)</span></>
                  ) : (
                    <><AlertCircle className="h-3.5 w-3.5 text-amber-500" /><span>Video interview skipped</span></>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                className="bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200 gap-2"
              >
                {submitting ? 'Submitting...' : <><Send className="h-4 w-4" /> Submit Screening</>}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
