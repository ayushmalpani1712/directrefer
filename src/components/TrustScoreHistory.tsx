import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getTrustScoreHistory, getTrustScore, getTierLabel, getTierColor, type TrustTier } from '@/lib/v2/trust-score'

interface Props {
  userId: string
}

interface HistoryEntry {
  score: number
  tier: TrustTier
  calculated_at: string
  version: number
}

export function TrustScoreHistory({ userId }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [current, setCurrent] = useState<{ score: number; tier: TrustTier } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [historyData, currentData] = await Promise.all([
        getTrustScoreHistory(userId),
        getTrustScore(userId),
      ])
      if (cancelled) return
      setHistory(historyData)
      setCurrent(currentData ? { score: currentData.score, tier: currentData.tier } : null)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  if (loading) {
    return (
      <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 animate-pulse" /> Loading trust history…
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!current || history.length === 0) {
    return (
      <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground">No trust score history available.</div>
        </CardContent>
      </Card>
    )
  }

  const prevScore = history.length >= 2 ? history[history.length - 2].score : null
  const trend = prevScore === null ? 'stable' : current.score > prevScore ? 'up' : current.score < prevScore ? 'down' : 'stable'

  const trendIcon = {
    up: <TrendingUp className="h-4 w-4 text-emerald-500" />,
    down: <TrendingDown className="h-4 w-4 text-red-500" />,
    stable: <Minus className="h-4 w-4 text-muted-foreground" />,
  }[trend]

  const trendLabel = {
    up: 'Improving',
    down: 'Declining',
    stable: 'Stable',
  }[trend]

  const maxScore = Math.max(...history.map(h => h.score), 100)

  return (
    <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Trust Score History</h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-bold">{current.score}</span>
              <span className={cn('text-sm font-medium', getTierColor(current.tier))}>
                {getTierLabel(current.tier)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium">
            {trendIcon}
            <span>{trendLabel}</span>
          </div>
        </div>

        <div className="mt-5 flex items-end gap-1.5" style={{ height: 80 }}>
          {history.map((entry, i) => {
            const height = Math.max(8, (entry.score / maxScore) * 80)
            const isLatest = i === history.length - 1
            return (
              <motion.div
                key={entry.version}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height, opacity: 1 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className={cn(
                  'flex-1 rounded-t-sm transition-colors',
                  isLatest ? 'bg-primary' : 'bg-primary/30',
                )}
                title={`v${entry.version}: ${entry.score} (${entry.tier})`}
              />
            )
          })}
        </div>

        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>v{history[0]?.version}</span>
          <span>v{history[history.length - 1]?.version}</span>
        </div>
      </CardContent>
    </Card>
  )
}
