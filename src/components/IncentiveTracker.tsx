import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Gift, Trophy, TrendingUp, Star, Clock, CircleDollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui-kit'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { getIncentives, getTotalIncentives, type Incentive, type IncentiveSummary } from '@/lib/incentives'
import { ListSkeleton } from '@/components/ui/skeleton'
import {
  LazyBarChart, LazyBar, LazyXAxis, LazyYAxis, LazyTooltip, LazyResponsiveContainer,
} from '@/components/Charts'

const TIER_THRESHOLDS = [
  { label: 'Starter', min: 0, color: 'text-muted-foreground' },
  { label: 'Bronze', min: 300, color: 'text-amber-600' },
  { label: 'Silver', min: 700, color: 'text-slate-400' },
  { label: 'Gold', min: 1500, color: 'text-yellow-500' },
  { label: 'Platinum', min: 3000, color: 'text-violet-500' },
]

function getNextTier(points: number) {
  const current = TIER_THRESHOLDS.filter((t) => points >= t.min).pop() ?? TIER_THRESHOLDS[0]
  const nextIdx = TIER_THRESHOLDS.indexOf(current) + 1
  const next = nextIdx < TIER_THRESHOLDS.length ? TIER_THRESHOLDS[nextIdx] : null
  return { current, next }
}

function statusColor(s: string) {
  switch (s) {
    case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/25'
    case 'approved': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
    case 'paid': return 'bg-primary/10 text-primary border-primary/25'
    default: return ''
  }
}

function typeIcon(t: string) {
  switch (t) {
    case 'points': return <Star className="h-4 w-4 text-amber-500" />
    case 'badge': return <Trophy className="h-4 w-4 text-violet-500" />
    case 'monetary': return <CircleDollarSign className="h-4 w-4 text-emerald-500" />
    default: return <Gift className="h-4 w-4" />
  }
}

export function IncentiveTracker() {
  const { user } = useAuth()
  const [incentives, setIncentives] = useState<Incentive[]>([])
  const [summary, setSummary] = useState<IncentiveSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      getIncentives(user.id),
      getTotalIncentives(user.id),
    ])
      .then(([incs, sum]) => { setIncentives(incs); setSummary(sum) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const monthlyData = useMemo(() => {
    const byMonth: Record<string, number> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleString('en-US', { month: 'short' })
      byMonth[key] = 0
    }
    for (const inc of incentives) {
      if (inc.incentive_type !== 'points') continue
      const d = new Date(inc.created_at)
      const key = d.toLocaleString('en-US', { month: 'short' })
      if (key in byMonth) byMonth[key] += inc.amount
    }
    return Object.entries(byMonth).map(([month, points]) => ({ month, points }))
  }, [incentives])

  if (loading) return <ListSkeleton count={3} />

  if (!summary) return null

  const totalPoints = summary.total_points
  const { current: currentTier, next: nextTier } = getNextTier(totalPoints)
  const progressPct = nextTier
    ? Math.min(100, ((totalPoints - currentTier.min) / (nextTier.min - currentTier.min)) * 100)
    : 100

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                  <Star className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalPoints}</div>
                  <div className="text-xs text-muted-foreground">Total Points</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10">
                  <Trophy className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{summary.total_badges}</div>
                  <div className="text-xs text-muted-foreground">Badges Earned</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <CircleDollarSign className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">${summary.total_monetary}</div>
                  <div className="text-xs text-muted-foreground">Monetary Earned</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Tier Progress</span>
            </div>
            <Badge variant="outline" className={cn('text-xs', currentTier.color)}>
              {currentTier.label}
            </Badge>
          </div>
          <Progress value={progressPct} className="h-2" />
          {nextTier && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {nextTier.min - totalPoints} points to {nextTier.label}
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history"><Clock className="mr-1.5 h-3.5 w-3.5" /> History</TabsTrigger>
          <TabsTrigger value="chart"><TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Monthly</TabsTrigger>
          <TabsTrigger value="referrals"><Gift className="mr-1.5 h-3.5 w-3.5" /> Referral Conversion</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          {incentives.length === 0 ? (
            <EmptyState icon={Gift} title="No incentives yet" description="Earn points and badges by referring candidates who get accepted." />
          ) : (
            <div className="space-y-2">
              {incentives.map((inc, i) => (
                <motion.div
                  key={inc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="transition-colors hover:border-border/80">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        {typeIcon(inc.incentive_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold capitalize">{inc.incentive_type}</span>
                          <Badge className={cn('text-[10px]', statusColor(inc.status))}>{inc.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {inc.incentive_type === 'monetary' ? `$${inc.amount}` : `${inc.amount} pts`}
                          {' · '}
                          {new Date(inc.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chart" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Monthly Points Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <LazyResponsiveContainer width="100%" height="100%">
                  <LazyBarChart data={monthlyData}>
                    <LazyXAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <LazyYAxis tick={{ fontSize: 12 }} />
                    <LazyTooltip />
                    <LazyBar dataKey="points" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </LazyBarChart>
                </LazyResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="mt-4">
          {incentives.length === 0 ? (
            <EmptyState icon={Gift} title="No referral conversions" description="Referral incentive data will appear here once candidates are accepted." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incentives.map((inc) => (
                        <tr key={inc.id} className="border-b border-border/50 last:border-0">
                          <td className="px-4 py-3 flex items-center gap-2">
                            {typeIcon(inc.incentive_type)}
                            <span className="capitalize">{inc.incentive_type}</span>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {inc.incentive_type === 'monetary' ? `$${inc.amount}` : `${inc.amount} pts`}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={cn('text-[10px]', statusColor(inc.status))}>{inc.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(inc.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
