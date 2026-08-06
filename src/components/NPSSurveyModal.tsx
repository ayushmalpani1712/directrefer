import { useCallback, useState } from 'react'
import { Star, MessageSquare, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const NPS_STORAGE_KEY = 'directrefer_nps_submitted'

function markNPSSubmitted(): void {
  try {
    localStorage.setItem(NPS_STORAGE_KEY, 'true')
  } catch { /* ignore */ }
}

interface NPSSurveyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Very unlikely',
  2: 'Unlikely',
  3: 'Somewhat unlikely',
  4: 'Neutral',
  5: 'Neutral',
  6: 'Somewhat likely',
  7: 'Likely',
  8: 'Very likely',
  9: 'Extremely likely',
  10: 'Absolutely!',
}

const SCORE_COLORS: Record<number, string> = {
  1: 'bg-red-500 text-white',
  2: 'bg-red-400 text-white',
  3: 'bg-orange-400 text-white',
  4: 'bg-orange-300 text-white',
  5: 'bg-yellow-400 text-white',
  6: 'bg-yellow-300 text-white',
  7: 'bg-lime-400 text-white',
  8: 'bg-green-400 text-white',
  9: 'bg-green-500 text-white',
  10: 'bg-emerald-500 text-white',
}

export function NPSSurveyModal({ open, onOpenChange, userId }: NPSSurveyModalProps) {
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (score === null) return
    setSubmitting(true)
    try {
      if (userId) {
        await supabase.from('nps_responses').insert({
          user_id: userId,
          score,
          feedback: feedback.trim() || null,
        })
      }
      markNPSSubmitted()
      setSubmitted(true)
      setTimeout(() => {
        onOpenChange(false)
        // Reset state after close animation
        setTimeout(() => {
          setScore(null)
          setFeedback('')
          setSubmitted(false)
        }, 300)
      }, 2000)
    } catch (err) {
      console.error('Failed to submit NPS:', err)
      setSubmitting(false)
    } finally {
      setSubmitting(false)
    }
  }, [score, feedback, userId, onOpenChange])

  const handleSkip = useCallback(() => {
    markNPSSubmitted()
    onOpenChange(false)
    setTimeout(() => {
      setScore(null)
      setFeedback('')
      setSubmitted(false)
    }, 300)
  }, [onOpenChange])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="NPS Survey"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleSkip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center px-8 py-12 text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                    <Star className="h-8 w-8 text-emerald-500" fill="currentColor" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">Thank you!</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your feedback helps us build a better referral experience for everyone.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-8 pt-8 pb-6"
                >
                  <div className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-foreground">
                      How likely are you to recommend DirectRefer?
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Rate on a scale of 1–10 to a friend or colleague.
                    </p>
                  </div>

                  {/* Score selector */}
                  <div className="mt-6 grid grid-cols-5 gap-2 sm:grid-cols-10">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button
                        key={n}
                        onClick={() => setScore(n)}
                        className={cn(
                          'relative flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-all duration-150',
                          score === n
                            ? SCORE_COLORS[n]
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
                          score === n && 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-105',
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  {score !== null && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-center text-xs font-medium text-muted-foreground"
                    >
                      {SCORE_LABELS[score]}
                    </motion.p>
                  )}

                  {/* Feedback textarea */}
                  <div className="mt-5">
                    <label htmlFor="nps-feedback" className="text-sm font-medium text-foreground">
                      What could we improve? <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <Textarea
                      id="nps-feedback"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Tell us what would make DirectRefer better for you..."
                      rows={3}
                      className="mt-2 resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex flex-col gap-2.5">
                    <Button
                      className="w-full rounded-full bg-gradient-to-r from-[#4F7CFF] to-[#7C5CFF] text-white shadow-sm hover:opacity-90"
                      onClick={handleSubmit}
                      disabled={score === null || submitting}
                    >
                      {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={handleSkip}
                    >
                      Skip for now
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
