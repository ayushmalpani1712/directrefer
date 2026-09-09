import { useState, useEffect, useCallback } from 'react'
import { Clock, Filter, Users, Trophy, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionHeader, StatCard } from '@/components/ui-kit'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { getJobStats, type ApplicationStatus } from '@/lib/v2/applications'
import {
  LazyBarChart, LazyBar, LazyCartesianGrid,
  LazyResponsiveContainer, LazyTooltip, LazyXAxis, LazyYAxis, LazyLegend,
} from '@/components/Charts'
import { EmptyState } from '@/components/ui-kit'

const TICK = { fill: '#9A9BA8', fontSize: 12 } as const

const STATUS_COLORS: Record<string, string> = {
  submitted: 'hsl(239 84% 67%)',
  under_review: 'hsl(258 90% 66%)',
  shortlisted: 'hsl(160 84% 39%)',
  rejected: 'hsl(350 89% 60%)',
  withdrawn: 'hsl(38 92% 50%)',
  hired: 'hsl(160 84% 39%)',
  draft: 'hsl(220 9% 46%)',
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  hired: 'Hired',
  draft: 'Draft',
}

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

interface JobStatRow {
  job_id: string
  title: string
  total: number
  by_status: Record<ApplicationStatus, number>
  avg_response_days: number
  screening_passed: number
  screening_total: number
}

export default function JobAnalytics() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [jobStats, setJobStats] = useState<JobStatRow[]>([])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('recruiter_id', user.id)
        .is('deleted_at', null)

      if (!jobs || jobs.length === 0) {
        setJobStats([])
        setLoading(false)
        return
      }

      const rows: JobStatRow[] = []
      for (const job of jobs) {
        const stats = await getJobStats(job.id)

        let screeningPassed = 0
        let screeningTotal = 0
        try {
          const { data: attempts } = await supabase
            .from('screening_attempts')
            .select('result')
            .eq('job_id', job.id)
          if (attempts) {
            screeningTotal = attempts.length
            screeningPassed = attempts.filter(a => a.result === 'pass').length
          }
        } catch {
          // screening table may not exist
        }

        rows.push({
          job_id: job.id,
          title: job.title,
          total: stats.total,
          by_status: stats.by_status,
          avg_response_days: stats.avg_response_days,
          screening_passed: screeningPassed,
          screening_total: screeningTotal,
        })
      }

      setJobStats(rows)
    } catch (err) {
      console.error('Failed to load job analytics:', err)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <DashboardSkeleton />

  const totalApps = jobStats.reduce((s, j) => s + j.total, 0)
  const avgResponse = jobStats.length > 0
    ? Math.round(jobStats.reduce((s, j) => s + j.avg_response_days, 0) / jobStats.length * 10) / 10
    : 0
  const totalScreened = jobStats.reduce((s, j) => s + j.screening_total, 0)
  const totalPassed = jobStats.reduce((s, j) => s + j.screening_passed, 0)
  const passRate = totalScreened > 0 ? Math.round((totalPassed / totalScreened) * 100) : 0
  const topJob = [...jobStats].sort((a, b) => b.total - a.total)[0]

  const barData = jobStats.map(j => {
    const row: Record<string, string | number> = { name: j.title.length > 20 ? j.title.slice(0, 20) + '...' : j.title }
    for (const [status, count] of Object.entries(j.by_status)) {
      row[STATUS_LABELS[status] ?? status] = count
    }
    return row
  })

  const allStatuses = Array.from(new Set(jobStats.flatMap(j => Object.keys(j.by_status))))

  return (
    <div className="space-y-6">
      <SectionHeader title="Job Analytics" subtitle="Per-job performance metrics for your listings" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total applications" value={totalApps} />
        <StatCard icon={Clock} label="Avg response time" value={`${avgResponse}d`} />
        <StatCard icon={Filter} label="Screening pass rate" value={`${passRate}%`} />
        <StatCard icon={Trophy} label="Top job" value={topJob?.title?.slice(0, 18) || '--'} />
      </div>

      {jobStats.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          description="Post a job to start seeing analytics for your listings."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Applications by status</CardTitle>
            </CardHeader>
            <CardContent>
              <LazyResponsiveContainer width="100%" height={320}>
                <LazyBarChart data={barData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <LazyCartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <LazyXAxis dataKey="name" axisLine={false} tickLine={false} tick={TICK} />
                  <LazyYAxis axisLine={false} tickLine={false} tick={TICK} />
                  <LazyTooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <LazyLegend wrapperStyle={{ fontSize: 12, color: '#9A9BA8' }} />
                  {allStatuses.map((status) => (
                    <LazyBar
                      key={status}
                      dataKey={STATUS_LABELS[status] ?? status}
                      stackId="a"
                      fill={STATUS_COLORS[status] ?? 'hsl(220 9% 46%)'}
                      radius={[0, 0, 0, 0]}
                      name={STATUS_LABELS[status] ?? status}
                    />
                  ))}
                </LazyBarChart>
              </LazyResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Screening results</CardTitle>
            </CardHeader>
            <CardContent>
              {totalScreened === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No screening data yet</p>
              ) : (
                <div className="space-y-4">
                  {jobStats.filter(j => j.screening_total > 0).map(j => {
                    const rate = j.screening_total > 0 ? Math.round((j.screening_passed / j.screening_total) * 100) : 0
                    return (
                      <div key={j.job_id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium">{j.title}</span>
                          <span className="text-muted-foreground">{rate}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{j.screening_passed} passed</span>
                          <span>{j.screening_total} total</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top performing jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...jobStats].sort((a, b) => b.total - a.total).slice(0, 5).map((j, i) => (
                  <div key={j.job_id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{j.title}</p>
                      <p className="text-xs text-muted-foreground">{j.total} applications · {j.avg_response_days}d avg response</p>
                    </div>
                    {j.screening_total > 0 && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {Math.round((j.screening_passed / j.screening_total) * 100)}% screened
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
