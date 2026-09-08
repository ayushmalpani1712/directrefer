// ============================================================================
// DirectRefer V2.0 — Match Score Component
// ============================================================================
// Shows a visual match score indicator on professional/job cards.
// ============================================================================

import { Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MatchScoreProps {
  score: number
  confidence?: 'high' | 'medium' | 'low'
  className?: string
  showLabel?: boolean
}

export function MatchScore({ score, confidence, className, showLabel = true }: MatchScoreProps) {
  const tier = score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low'
  const color = tier === 'high' ? 'text-emerald-500' : tier === 'medium' ? 'text-amber-500' : 'text-muted-foreground'
  const bgColor = tier === 'high' ? 'bg-emerald-500/10 border-emerald-500/30' : tier === 'medium' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-muted/50 border-border'

  return (
    <div className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
      bgColor,
      color,
      className,
    )}>
      <Target className="h-3 w-3" />
      {showLabel && <span>{score}%</span>}
      {!showLabel && <span>{score}</span>}
      {confidence && (
        <span className="ml-0.5 opacity-70">({confidence})</span>
      )}
    </div>
  )
}

/**
 * Compact match score bar for inline display.
 */
export function MatchScoreBar({ score, className }: { score: number; className?: string }) {
  const tier = score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low'
  const color = tier === 'high' ? 'bg-emerald-500' : tier === 'medium' ? 'bg-amber-500' : 'bg-muted-foreground/40'

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="h-1 flex-1 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{score}%</span>
    </div>
  )
}
