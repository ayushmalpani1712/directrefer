// ============================================================================
// DirectRefer V2.0 — Migration Readiness Indicator
// ============================================================================
// Shows V2 feature status in admin/settings. Useful for monitoring migration.
// ============================================================================

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Loader2, Database } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getV2FeatureFlags } from '@/lib/v2/probes'

interface FeatureFlag {
  name: string
  supported: boolean
  description: string
}

export function MigrationReadiness() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getV2FeatureFlags().then((f) => {
      setFlags([
        { name: 'Trust Scores', supported: f.trustScores, description: 'Professional reputation scoring' },
        { name: 'State History', supported: f.stateHistory, description: 'Immutable referral state transitions' },
        { name: 'Screening', supported: f.screening, description: 'Candidate screening criteria' },
        { name: 'Applications', supported: f.applications, description: 'Job application tracking' },
        { name: 'Matches', supported: f.matches, description: 'Candidate-professional matching' },
      ])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Checking V2 migration status...</span>
        </CardContent>
      </Card>
    )
  }

  const supportedCount = flags.filter(f => f.supported).length
  const allReady = supportedCount === flags.length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4 text-primary" />
          V2 Migration Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {flags.map((flag) => (
            <div key={flag.name} className="flex items-center gap-3">
              {flag.supported ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              )}
              <div className="flex-1 min-w-0">
                <span className={cn('text-sm font-medium', !flag.supported && 'text-muted-foreground')}>
                  {flag.name}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">{flag.description}</span>
              </div>
              <span className={cn(
                'text-xs font-medium',
                flag.supported ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
              )}>
                {flag.supported ? 'Ready' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            {allReady
              ? 'All V2 features are active. Migration complete.'
              : `${supportedCount}/${flags.length} features active. Run V2 migration to enable remaining features.`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
