import { cn } from '@/lib/utils'

interface MobileSkeletonProps {
  className?: string
  variant?: 'card' | 'list' | 'profile' | 'job'
}

export function MobileSkeleton({ className, variant = 'card' }: MobileSkeletonProps) {
  if (variant === 'list') {
    return (
      <div className={cn('space-y-3 px-4', className)}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 animate-pulse">
            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'profile') {
    return (
      <div className={cn('flex flex-col items-center px-4 py-6', className)}>
        <div className="mb-3 h-20 w-20 rounded-full bg-muted animate-pulse" />
        <div className="mb-1 h-4 w-32 rounded bg-muted animate-pulse" />
        <div className="h-3 w-24 rounded bg-muted/60 animate-pulse" />
        <div className="mt-4 flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 w-16 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'job') {
    return (
      <div className={cn('rounded-xl border border-border/40 bg-card p-4 space-y-3', className)}>
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/3 rounded bg-muted/60 animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-6 w-20 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
        <div className="flex justify-between pt-1">
          <div className="h-3 w-16 rounded bg-muted/60 animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted/60 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl bg-card p-4 space-y-3', className)}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-muted/60 animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted/40 animate-pulse" />
        <div className="h-3 w-4/5 rounded bg-muted/40 animate-pulse" />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-8 px-4">
      <div className="h-24 rounded-2xl bg-muted/50 animate-pulse" />
      <div className="h-12 rounded-xl bg-muted/50 animate-pulse" />
      <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-24 rounded bg-muted/60 animate-pulse" />
          </div>
          <div className="h-9 w-20 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="space-y-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2.5 py-0.5">
              <div className="h-3.5 w-3.5 rounded-full bg-muted animate-pulse" />
              <div className="h-3 w-28 rounded bg-muted/60 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card p-3.5 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-muted/60 animate-pulse" />
              </div>
              <div className="h-4 w-4 rounded bg-muted/40 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted/60 animate-pulse" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="h-4 w-10 rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-8 rounded bg-muted/40 animate-pulse" />
              </div>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-5 w-14 rounded-full bg-muted/50 animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function JobListSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="h-7 w-24 rounded-lg bg-muted animate-pulse" />
            <div className="h-5 w-12 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-muted/60 animate-pulse" />
          <div className="flex gap-1.5">
            {[1, 2].map((j) => (
              <div key={j} className="h-5 w-16 rounded-full bg-muted/50 animate-pulse" />
            ))}
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-5 w-14 rounded bg-muted/40 animate-pulse" />
            ))}
          </div>
          <div className="flex justify-between pt-1">
            <div className="h-3 w-20 rounded bg-muted/60 animate-pulse" />
            <div className="h-8 w-28 rounded-lg bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="px-4 space-y-4">
      <div className="h-28 rounded-2xl bg-muted/50 animate-pulse" />
      <div className="flex flex-col items-center -mt-10">
        <div className="h-20 w-20 rounded-full bg-muted animate-pulse ring-4 ring-card" />
        <div className="mt-3 h-5 w-36 rounded bg-muted animate-pulse" />
        <div className="mt-1.5 h-3.5 w-28 rounded bg-muted/60 animate-pulse" />
        <div className="mt-3 flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-20 rounded-full bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
      <div className="space-y-3 pt-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
            <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
            <div className="h-3 w-full rounded bg-muted/40 animate-pulse" />
            <div className="h-3 w-4/5 rounded bg-muted/40 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReferralSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-3 animate-pulse">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted/60" />
          </div>
          <div className="h-6 w-16 rounded-full bg-muted/50" />
        </div>
      ))}
    </div>
  )
}
