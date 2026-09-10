import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, ArrowLeft, CheckCircle2, XCircle, Clock,
  AlertCircle, Trophy, RotateCcw, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { ScreeningQuestion, Category } from '@/data/screeningQuestions'
import { screeningQuestions, CATEGORIES } from '@/data/screeningQuestions'

interface SkillsAssessmentProps {
  jobId: string
  userId: string
  onComplete: (results: AssessmentResults) => void
  onCancel: () => void
  categories?: Category[]
  questionCount?: number
  timePerQuestionSeconds?: number
}

interface UserAnswer {
  questionId: string
  answer: string
  isCorrect: boolean
  timeSpentSeconds: number
}

interface AssessmentResults {
  totalQuestions: number
  correctAnswers: number
  score: number
  categoryScores: Record<Category, { correct: number; total: number }>
  answers: UserAnswer[]
  durationSeconds: number
}

const DIFFICULTY_WEIGHT: Record<string, number> = { easy: 1, medium: 1.5, hard: 2 }

export function SkillsAssessment({
  jobId,
  userId,
  onComplete,
  onCancel,
  categories,
  questionCount = 10,
  timePerQuestionSeconds,
}: SkillsAssessmentProps) {
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<UserAnswer[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [assessmentComplete, setAssessmentComplete] = useState(false)
  const [results, setResults] = useState<AssessmentResults | null>(null)
  const [startTime] = useState(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const filtered = categories && categories.length > 0
      ? screeningQuestions.filter(q => categories.includes(q.category))
      : screeningQuestions

    const shuffled = [...filtered].sort(() => Math.random() - 0.5)
    setQuestions(shuffled.slice(0, Math.min(questionCount, shuffled.length)))
  }, [categories, questionCount])

  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!currentQuestion || showFeedback || assessmentComplete) {
      clearTimer()
      return
    }

    const limit = timePerQuestionSeconds ?? currentQuestion.timeLimitSeconds
    if (!limit) {
      setTimeLeft(null)
      return
    }

    setTimeLeft(limit)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearTimer()
          handleSubmitAnswer(true)
          return null
        }
        return prev - 1
      })
    }, 1000)

    return clearTimer
  }, [currentIndex, showFeedback, assessmentComplete, timePerQuestionSeconds, currentQuestion, clearTimer])

  const handleSubmitAnswer = useCallback((timedOut = false) => {
    if (!currentQuestion || showFeedback) return

    const timeSpent = currentQuestion.timeLimitSeconds
      ? (currentQuestion.timeLimitSeconds - (timedOut ? 0 : (timeLeft ?? 0)))
      : 0

    let isCorrect = false
    if (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false') {
      isCorrect = selectedAnswer === currentQuestion.correctAnswer
    } else {
      isCorrect = selectedAnswer.trim().length > 10
    }

    const userAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      answer: selectedAnswer,
      isCorrect,
      timeSpentSeconds: timeSpent,
    }

    setAnswers(prev => [...prev, userAnswer])
    setShowFeedback(true)
  }, [currentQuestion, selectedAnswer, showFeedback, timeLeft])

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedAnswer('')
      setShowFeedback(false)
    } else {
      clearTimer()
      const allAnswers = answers
      const totalDuration = Math.round((Date.now() - startTime) / 1000)

      const weightedCorrect = allAnswers.reduce((sum, a) => {
        const q = questions.find(q => q.id === a.questionId)
        const weight = q ? (DIFFICULTY_WEIGHT[q.difficulty] ?? 1) : 1
        return sum + (a.isCorrect ? weight : 0)
      }, 0)
      const weightedTotal = questions.reduce((sum, q) => sum + (DIFFICULTY_WEIGHT[q.difficulty] ?? 1), 0)

      const categoryScores: Record<Category, { correct: number; total: number }> = {} as Record<Category, { correct: number; total: number }>
      for (const cat of CATEGORIES) {
        categoryScores[cat.value] = { correct: 0, total: 0 }
      }
      for (const q of questions) {
        categoryScores[q.category].total++
        const answer = allAnswers.find(a => a.questionId === q.id)
        if (answer?.isCorrect) categoryScores[q.category].correct++
      }

      const score = Math.round((weightedCorrect / weightedTotal) * 100)
      const assessmentResults: AssessmentResults = {
        totalQuestions: questions.length,
        correctAnswers: allAnswers.filter(a => a.isCorrect).length,
        score,
        categoryScores,
        answers: allAnswers,
        durationSeconds: totalDuration,
      }

      setResults(assessmentResults)
      setAssessmentComplete(true)
    }
  }, [currentIndex, questions, answers, startTime, clearTimer])

  const submitResults = async () => {
    if (!results) return
    try {
      await supabase.from('screening_attempts').insert({
        candidate_id: userId,
        criteria_id: null,
        score: results.score,
        max_score: 100,
        passed: results.score >= 60,
        evidence: {
          type: 'skills_assessment',
          jobId,
          results,
        },
      })
      onComplete(results)
    } catch (err) {
      console.error('Failed to save assessment results:', err)
      toast.error('Failed to save results')
    }
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (assessmentComplete && results) {
    const passed = results.score >= 60
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto space-y-6">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className={cn(
              'mx-auto flex h-16 w-16 items-center justify-center rounded-full',
              passed ? 'bg-emerald-500/10' : 'bg-amber-500/10',
            )}>
              {passed ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-amber-500" />
              )}
            </div>
            <h2 className="text-xl font-bold">
              {passed ? 'Assessment Passed!' : 'Assessment Completed'}
            </h2>
            <div className="flex items-center justify-center gap-2">
              <Trophy className={cn('h-5 w-5', passed ? 'text-emerald-500' : 'text-amber-500')} />
              <span className="text-3xl font-bold">{results.score}%</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {results.correctAnswers} of {results.totalQuestions} correct
              {passed ? ' — Well done!' : ' — You need 60% to pass.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-semibold">Category Breakdown</h3>
            {CATEGORIES.filter(c => results.categoryScores[c.value].total > 0).map(cat => {
              const cs = results.categoryScores[cat.value]
              const pct = Math.round((cs.correct / cs.total) * 100)
              return (
                <div key={cat.value} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{cat.label}</span>
                    <span className="font-medium">{cs.correct}/{cs.total} ({pct}%)</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          {!passed && (
            <Button variant="outline" onClick={onCancel} className="flex-1 gap-2">
              <RotateCcw className="h-4 w-4" /> Retake
            </Button>
          )}
          <Button onClick={submitResults} className="flex-1 bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200 gap-2">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Question {currentIndex + 1} of {questions.length}
        </span>
        {timeLeft !== null && (
          <Badge variant={timeLeft <= 10 ? 'destructive' : 'secondary'} className="gap-1.5">
            <Clock className="h-3 w-3" /> {timeLeft}s
          </Badge>
        )}
      </div>

      <Progress value={progress} className="h-2" />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">
                  {currentQuestion.category.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                  {currentQuestion.difficulty}
                </Badge>
                <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                  {currentQuestion.type.replace('_', ' ')}
                </Badge>
              </div>

              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {currentQuestion.question}
              </div>

              {(currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false') &&
                currentQuestion.options && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option, idx) => {
                      const isSelected = selectedAnswer === option
                      const isCorrect = option === currentQuestion.correctAnswer
                      const showCorrect = showFeedback && isCorrect
                      const showWrong = showFeedback && isSelected && !isCorrect

                      return (
                        <button
                          key={idx}
                          onClick={() => !showFeedback && setSelectedAnswer(option)}
                          disabled={showFeedback}
                          className={cn(
                            'w-full text-left rounded-lg border p-3 text-sm transition-all duration-150',
                            !showFeedback && isSelected && 'border-primary bg-primary/5 ring-1 ring-primary/20',
                            !showFeedback && !isSelected && 'hover:border-border/80 hover:bg-muted/50',
                            showCorrect && 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20',
                            showWrong && 'border-rose-500 bg-rose-500/5 ring-1 ring-rose-500/20',
                            showFeedback && !showCorrect && !showWrong && 'opacity-50',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                              isSelected && !showFeedback && 'border-primary bg-primary text-primary-foreground',
                              showCorrect && 'border-emerald-500 bg-emerald-500 text-white',
                              showWrong && 'border-rose-500 bg-rose-500 text-white',
                              !isSelected && !showCorrect && 'border-muted-foreground/25 text-muted-foreground',
                            )}>
                              {showCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                               showWrong ? <XCircle className="h-3.5 w-3.5" /> :
                               String.fromCharCode(65 + idx)}
                            </div>
                            <span>{option}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

              {currentQuestion.type === 'short_answer' && (
                <Textarea
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  disabled={showFeedback}
                  placeholder="Type your answer here..."
                  className="min-h-[120px] text-sm"
                />
              )}

              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'rounded-lg border p-4 text-sm',
                    answers[answers.length - 1]?.isCorrect
                      ? 'border-emerald-500/25 bg-emerald-500/5'
                      : 'border-rose-500/25 bg-rose-500/5',
                  )}
                >
                  <div className="flex items-center gap-2 font-medium mb-2">
                    {answers[answers.length - 1]?.isCorrect ? (
                      <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Correct!</>
                    ) : (
                      <><XCircle className="h-4 w-4 text-rose-500" /> Incorrect</>
                    )}
                  </div>
                  {currentQuestion.type !== 'short_answer' && (
                    <p className="text-xs text-muted-foreground mb-1">
                      Correct answer: <span className="font-medium text-foreground">{currentQuestion.correctAnswer}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{currentQuestion.explanation}</p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="gap-1.5 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Cancel
        </Button>

        <div className="flex gap-2">
          {!showFeedback && selectedAnswer && (
            <Button
              onClick={() => handleSubmitAnswer()}
              className="bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200 gap-1.5"
            >
              Submit Answer
            </Button>
          )}
          {showFeedback && (
            <Button
              onClick={handleNext}
              className="bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200 gap-1.5"
            >
              {currentIndex < questions.length - 1 ? (
                <>Next <ChevronRight className="h-4 w-4" /></>
              ) : (
                <>View Results <Trophy className="h-4 w-4" /></>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
