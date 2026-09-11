import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface TimelineStep {
  label: string
  time?: string
  status: 'done' | 'active' | 'pending'
}

interface MobileTimelineProps {
  steps: TimelineStep[]
  className?: string
}

export function MobileTimeline({ steps, className }: MobileTimelineProps) {
  return (
    <div className={cn('relative flex flex-col', className)}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2',
                  step.status === 'done' && 'border-emerald-500 bg-emerald-500',
                  step.status === 'active' && 'border-primary bg-primary',
                  step.status === 'pending' && 'border-muted-foreground/30 bg-muted'
                )}
              >
                {step.status === 'done' && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                {step.status === 'active' && <span className="h-2 w-2 rounded-full bg-white" />}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-[24px]',
                    step.status === 'done' ? 'bg-emerald-500' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </div>
            <div className={cn('pb-6', isLast && 'pb-0')}>
              <p
                className={cn(
                  'text-sm font-medium',
                  step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground'
                )}
              >
                {step.label}
              </p>
              {step.time && (
                <p className="mt-0.5 text-xs text-muted-foreground">{step.time}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
