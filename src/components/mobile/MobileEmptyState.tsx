import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { MobileButton } from './MobileButton'

interface MobileEmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function MobileEmptyState({ icon, title, description, action, className }: MobileEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-[18px] font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">{description}</p>
      )}
      {action && (
        <MobileButton variant="primary" className="mt-6 h-12 rounded-xl" onClick={action.onClick}>
          {action.label}
        </MobileButton>
      )}
    </div>
  )
}
