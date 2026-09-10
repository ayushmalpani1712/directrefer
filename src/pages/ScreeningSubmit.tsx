import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, FileText, AlertCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ListSkeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

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

  useEffect(() => {
    if (!jobId || !user) return
    const load = async () => {
      setLoading(true)
      try {
        const { data: job } = await supabase.from('jobs').select('title').eq('id', jobId).single()
        if (job) setJobTitle(job.title)

        const { data: existing } = await supabase
          .from('screening_attempts')
          .select('id, passed')
          .eq('candidate_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existing && existing.passed) {
          setExistingAttempt(existing.id)
          setLoading(false)
          return
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
              <div>
                <h1 className="text-lg font-bold">Screening: {jobTitle}</h1>
                <p className="text-sm text-muted-foreground">
                  Answer all {criteria.length} questions to complete the screening
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
      </div>

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
