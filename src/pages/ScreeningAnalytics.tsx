import { useState, useEffect, useCallback } from 'react'
import { Users, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionHeader, StatCard } from '@/components/ui-kit'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  LazyBarChart, LazyBar, LazyCartesianGrid,
  LazyResponsiveContainer, LazyTooltip, LazyXAxis, LazyYAxis, LazyLegend,
  LazyPieChart, LazyPie, LazyCell,
} from '@/components/Charts'

const TICK = { fill: '#9A9BA8', fontSize: 12 } as const

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#13141A', border: '1px solid #26272F', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#F2F2F5' }}>
      {label && <div style={{ marginBottom: 4, fontWeight: 600, color: '#F2F2F5' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#F2F2F5' }}>
          {p.name} : {p.value}
        </div>
      ))}
    </div>
  )
}

interface ScreeningRow {
  id: string
  passed: boolean
  score: number
  max_score: number
  created_at: string
  reviewed_at: string | null
  criteria_id: string | null
  criteria_category: string
}

export default function ScreeningAnalytics() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [attempts, setAttempts] = useState<ScreeningRow[]>([])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: attemptsData, error } = await supabase
        .from('screening_attempts')
        .select('id, passed, score, max_score, created_at, reviewed_at, criteria_id')
        .order('created_at', { ascending: false })

      if (error || !attemptsData) {
        setAttempts([])
        setLoading(false)
        return
      }

      const criteriaIds = [...new Set(attemptsData.map(a => a.criteria_id).filter(Boolean))]
      const critMap = new Map<string, string>()
      if (criteriaIds.length > 0) {
        const { data: critData } = await supabase
          .from('screening_criteria')
          .select('id, category')
          .in('id', criteriaIds)
        for (const c of critData ?? []) critMap.set(c.id, c.category ?? 'general')
      }

      setAttempts(attemptsData.map(a => ({
        ...a,
        criteria_category: critMap.get(a.criteria_id ?? '') ?? 'general',
      })))
    } catch (err) {
      console.error('Failed to load screening analytics:', err)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <DashboardSkeleton />

  const total = attempts.length
  const passed = attempts.filter(a => a.passed).length
  const failed = attempts.filter(a => !a.passed).length
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
  const failRate = total > 0 ? Math.round((failed / total) * 100) : 0

  const reviewed = attempts.filter(a => a.reviewed_at)
  const avgReviewHours = reviewed.length > 0
    ? Math.round(reviewed.reduce((sum, a) => {
        const created = new Date(a.created_at).getTime()
        const reviewedAt = new Date(a.reviewed_at!).getTime()
        return sum + (reviewedAt - created) / (1000 * 60 * 60)
      }, 0) / reviewed.length * 10) / 10
    : 0

  const categoryMap = new Map<string, { pass: number; fail: number; total: number }>()
  for (const a of attempts) {
    const cat = a.criteria_category
    if (!categoryMap.has(cat)) categoryMap.set(cat, { pass: 0, fail: 0, total: 0 })
    const entry = categoryMap.get(cat)!
    entry.total++
    if (a.passed) entry.pass++
    else entry.fail++
  }

  const categoryData = Array.from(categoryMap.entries()).map(([category, counts]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    ...counts,
  }))

  const pieData = [
    { name: 'Passed', value: passed, color: 'hsl(160 84% 39%)' },
    { name: 'Failed', value: failed, color: 'hsl(350 89% 60%)' },
  ].filter(d => d.value > 0)

  const funnelData = [
    { stage: 'Submitted', count: total },
    { stage: 'Passed', count: passed },
    { stage: 'Failed', count: failed },
  ]

  return (
    <div className="space-y-6">
      <SectionHeader title="Screening Analytics" subtitle="Metrics and insights for candidate screening performance" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total screenings" value={total} />
        <StatCard icon={CheckCircle2} label="Pass rate" value={`${passRate}%`} />
        <StatCard icon={XCircle} label="Fail rate" value={`${failRate}%`} />
        <StatCard icon={Clock} label="Avg review time" value={avgReviewHours > 0 ? `${avgReviewHours}h` : '--'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Screening funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-4">
              {funnelData.map((stage) => {
                const widthPercent = total > 0 ? Math.max((stage.count / total) * 100, 12) : 12
                return (
                  <div key={stage.stage} className="w-full flex items-center gap-4">
                    <span className="w-32 text-right text-sm text-muted-foreground">{stage.stage}</span>
                    <div className="flex-1 flex items-center justify-center">
                      <div
                        className="h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center transition-all duration-500"
                        style={{ width: `${widthPercent}%` }}
                      >
                        <span className="text-sm font-semibold text-primary">{stage.count}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {total === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No screening data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Screening by result</CardTitle>
          </CardHeader>
          <CardContent>
            {total === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
            ) : (
              <LazyResponsiveContainer width="100%" height={240}>
                <LazyPieChart>
                  <LazyPie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                    {pieData.map((entry) => (
                      <LazyCell fill={entry.color} />
                    ))}
                  </LazyPie>
                  <LazyTooltip content={<ChartTooltip />} />
                  <LazyLegend wrapperStyle={{ fontSize: 12, color: '#9A9BA8' }} />
                </LazyPieChart>
              </LazyResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Screening by category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
            ) : (
              <LazyResponsiveContainer width="100%" height={240}>
                <LazyBarChart data={categoryData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <LazyCartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <LazyXAxis dataKey="category" axisLine={false} tickLine={false} tick={TICK} />
                  <LazyYAxis axisLine={false} tickLine={false} tick={TICK} />
                  <LazyTooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <LazyLegend wrapperStyle={{ fontSize: 12, color: '#9A9BA8' }} />
                  <LazyBar dataKey="pass" stackId="a" fill="hsl(160 84% 39%)" name="Passed" />
                  <LazyBar dataKey="fail" stackId="a" fill="hsl(350 89% 60%)" name="Failed" radius={[4, 4, 0, 0]} />
                </LazyBarChart>
              </LazyResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {categoryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryData.map((cat) => {
                const rate = cat.total > 0 ? Math.round((cat.pass / cat.total) * 100) : 0
                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cat.category}</span>
                      <span className="text-muted-foreground">{rate}% pass rate ({cat.total} total)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${rate}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{cat.pass} passed</span>
                      <span>{cat.fail} failed</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
