import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router'
import { CheckCircle2, Circle, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  label: string
  href: string
  done: boolean
}

interface OnboardingChecklistProps {
  role: 'student' | 'professional' | 'recruiter'
  steps: Step[]
  className?: string
}

const STORAGE_KEY_PREFIX = 'dr_onboarding_dismissed_'

export function OnboardingChecklist({ role, steps, className }: OnboardingChecklistProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${role}`
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === 'true' } catch { return false }
  })

  const completedCount = useMemo(() => steps.filter((s) => s.done).length, [steps])
  const allDone = completedCount === steps.length

  useEffect(() => {
    if (allDone && !dismissed) {
      setDismissed(true)
      try { localStorage.setItem(storageKey, 'true') } catch {}
    }
  }, [allDone, dismissed, storageKey])

  if (dismissed || steps.length === 0) return null

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(storageKey, 'true') } catch {}
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5', className)}>
      <button
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
        aria-label="Dismiss checklist"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold text-foreground">Get started</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {completedCount === 0
              ? 'Complete these steps to make the most of DirectRefer.'
              : `${completedCount} of ${steps.length} done. Keep going!`}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {steps.map((step) => (
          <Link
            key={step.label}
            to={step.href}
            onClick={dismiss}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-primary/[0.06]"
          >
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#34D399]" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
            )}
            <span className={step.done ? 'text-muted-foreground line-through' : 'text-foreground'}>{step.label}</span>
          </Link>
        ))}
      </div>

      {completedCount > 0 && completedCount < steps.length && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted/30">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
