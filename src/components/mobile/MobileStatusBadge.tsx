import { cn } from '@/lib/utils'

type Status = 'submitted' | 'screening' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn'

interface MobileStatusBadgeProps {
  status: Status
  className?: string
}

const STATUS_CONFIG: Record<Status, { label: string; dot: string; bg: string; text: string }> = {
  submitted: { label: 'Submitted', dot: 'bg-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  screening: { label: 'Screening', dot: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  shortlisted: { label: 'Shortlisted', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  accepted: { label: 'Accepted', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  rejected: { label: 'Rejected', dot: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  withdrawn: { label: 'Withdrawn', dot: 'bg-gray-400', bg: 'bg-gray-400/10', text: 'text-gray-500 dark:text-gray-400' },
}

export function MobileStatusBadge({ status, className }: MobileStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}
