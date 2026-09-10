import { type ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTrustScore } from '@/hooks/useTrustScore'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type TrustTier = 'verified' | 'provisional' | 'unverified'

const TIER_ORDER: Record<TrustTier, number> = {
  verified: 3,
  provisional: 2,
  unverified: 1,
}

const TIER_LABELS: Record<TrustTier, string> = {
  verified: 'Verified Professional',
  provisional: 'Provisional',
  unverified: 'Unverified',
}

interface TrustGateProps {
  requiredTier: TrustTier
  children: ReactNode
  fallback?: ReactNode
  userId?: string
}

export function TrustGate({ requiredTier, children, fallback, userId }: TrustGateProps) {
  const { score, loading } = useTrustScore(userId)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground text-sm">
        Checking trust level…
      </div>
    )
  }

  const currentTier: TrustTier = score?.tier ?? 'unverified'
  const hasAccess = TIER_ORDER[currentTier] >= TIER_ORDER[requiredTier]

  if (hasAccess) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'relative rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-6',
            'flex flex-col items-center justify-center gap-3 text-center select-none',
            'cursor-not-allowed opacity-60',
          )}>
            <Lock className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Requires {TIER_LABELS[requiredTier]} trust level
            </p>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex flex-col gap-1">
            <p className="font-medium">Trust tier too low</p>
            <p className="text-xs text-muted-foreground">
              Current: {TIER_LABELS[currentTier]} · Required: {TIER_LABELS[requiredTier]}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface UseTrustGateReturn {
  hasAccess: boolean
  currentTier: TrustTier
  requiredTier: TrustTier
  loading: boolean
}

export function useTrustGate(requiredTier: TrustTier, userId?: string): UseTrustGateReturn {
  const { score, loading } = useTrustScore(userId)
  const currentTier: TrustTier = score?.tier ?? 'unverified'

  return {
    hasAccess: TIER_ORDER[currentTier] >= TIER_ORDER[requiredTier],
    currentTier,
    requiredTier,
    loading,
  }
}
