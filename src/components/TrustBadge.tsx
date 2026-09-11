// ============================================================================
// DirectRefer V2.0 — Trust Badge Component
// ============================================================================
// Displays trust tier with visual indicator on professional profile cards.
// ============================================================================

import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TrustTier = 'verified' | 'provisional' | 'unverified'

interface TrustBadgeProps {
  tier: TrustTier
  score?: number
  className?: string
  showScore?: boolean
}

const TIER_CONFIG: Record<TrustTier, {
  label: string
  icon: typeof ShieldCheck
  colors: string
  bgColor: string
}> = {
  verified: {
    label: 'Verified',
    icon: ShieldCheck,
    colors: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30',
  },
  provisional: {
    label: 'Provisional',
    icon: ShieldAlert,
    colors: 'text-amber-500',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
  },
  unverified: {
    label: 'Unverified',
    icon: ShieldX,
    colors: 'text-muted-foreground',
    bgColor: 'bg-muted/50 border-border',
  },
}

export function TrustBadge({ tier, score, className, showScore = false }: TrustBadgeProps) {
  const config = TIER_CONFIG[tier]
  const Icon = config.icon

  return (
    <div className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0',
      config.bgColor,
      config.colors,
      className,
    )}>
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
      {showScore && score !== undefined && (
        <span className="ml-0.5 opacity-70">({score})</span>
      )}
    </div>
  )
}

/**
 * Trust score bar — visual representation of score 0-100.
 */
export function TrustScoreBar({ score, className }: { score: number; className?: string }) {
  const tier = score >= 80 ? 'verified' : score >= 50 ? 'provisional' : 'unverified'
  const color = tier === 'verified' ? 'bg-emerald-500' : tier === 'provisional' ? 'bg-amber-500' : 'bg-muted-foreground/40'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 flex-1 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{score}</span>
    </div>
  )
}
