import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MobileCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  action?: ReactNode
}

export function MobileCard({ children, className, onClick, action }: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl bg-card p-4 transition-all duration-150',
        onClick && 'cursor-pointer active:scale-[0.98] active:bg-muted/50',
        'border border-border/40',
        className
      )}
    >
      {children}
      {action && (
        <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-3">
          {action}
        </div>
      )}
    </div>
  )
}
