import { useState, useEffect, useCallback } from 'react'
import { LazyArea, LazyAreaChart, LazyBar, LazyBarChart, LazyCartesianGrid, LazyCell, LazyFunnel, LazyFunnelChart, LazyLabelList, LazyLegend, LazyLine, LazyLineChart, LazyPie, LazyPieChart, LazyResponsiveContainer, LazyTooltip, LazyXAxis, LazyYAxis } from '@/components/Charts'
import { BarChart3, Calendar, CheckCheck, Download, Send, Target, TrendingUp, Trophy, Users, CheckCircle, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SectionHeader, StatCard } from '@/components/ui-kit'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { useApp } from '@/context/AppContext'
import { PIPELINE_STAGES } from '@/data/mock'
import { DateRangeSelector, type DateRange, getPresetRange } from '@/components/analytics/DateRangeSelector'
import { ChartCard, ChartCardGrid } from '@/components/analytics/ChartCard'
import { EmptyChart } from '@/components/analytics/EmptyChart'
import { useFilteredStudentWeekly, useFilteredProMonthly, useFilteredProResponseTime, useFilteredRecruiterWeekly, useFilteredStats, hasData } from '@/hooks/useAnalytics'
import { EmptyState } from '@/components/ui-kit'
import { exportAnalyticsCSV } from '@/lib/export'
import { supabase } from '@/lib/supabase'

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

function StudentAnalytics({ range }: { range: DateRange }) {
  const studentWeekly = useFilteredStudentWeekly(range)
  const [totalAppsVal, setTotalAppsVal] = useState(0)
  const [acceptRateVal, setAcceptRateVal] = useState(0)
  const [reviewConvVal, setReviewConvVal] = useState(0)
  const [conversion, setConversion] = useState<{ name: string; value: number; fill: string }[]>([
    { name: 'Pending', value: 0, fill: 'hsl(38 92% 50%)' },
    { name: 'Accepted', value: 0, fill: 'hsl(160 84% 39%)' },
    { name: 'In Review', value: 0, fill: 'hsl(239 84% 67%)' },
    { name: 'Declined', value: 0, fill: 'hsl(350 89% 60%)' },
  ])
  const [pipelineData, setPipelineData] = useState<{ name: string; count: number }[]>([])
  const [statusBreakdown, setStatusBreakdown] = useState<{ name: string; value: number; fill: string }[]>([
    { name: 'Pending', value: 0, fill: 'hsl(38 92% 50%)' },
    { name: 'Accepted', value: 0, fill: 'hsl(160 84% 39%)' },
    { name: 'Declined', value: 0, fill: 'hsl(350 89% 60%)' },
  ])

  const fetchStudentData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? null
      if (!userId) return

      const { data: rows } = await supabase
        .from('referrals')
        .select('status, pipeline_stage')
        .eq('requester_id', userId)

      if (!rows) return

      const total = rows.length
      const accepted = rows.filter((r) => r.status === 'accepted').length
      const pending = rows.filter((r) => r.status === 'pending').length
      const rejected = rows.filter((r) => r.status === 'rejected').length
      const inReview = rows.filter((r) => r.pipeline_stage === 'under_review').length

      setTotalAppsVal(total)
      setAcceptRateVal(total > 0 ? Math.round((accepted / total) * 100) : 0)
      setReviewConvVal(total > 0 ? Math.round((inReview / total) * 100) : 0)

      setConversion([
        { name: 'Pending', value: pending, fill: 'hsl(38 92% 50%)' },
        { name: 'Accepted', value: accepted, fill: 'hsl(160 84% 39%)' },
        { name: 'In Review', value: inReview, fill: 'hsl(239 84% 67%)' },
        { name: 'Declined', value: rejected, fill: 'hsl(350 89% 60%)' },
      ])

      const stageCounts: Record<string, number> = {}
      for (const r of rows) {
        const stage = r.pipeline_stage || 'request_sent'
        stageCounts[stage] = (stageCounts[stage] || 0) + 1
      }

      setPipelineData(
        PIPELINE_STAGES.map((s) => ({
          name: s.label,
          count: stageCounts[s.key] || 0,
        }))
      )

      setStatusBreakdown([
        { name: 'Pending', value: pending, fill: 'hsl(38 92% 50%)' },
        { name: 'Accepted', value: accepted, fill: 'hsl(160 84% 39%)' },
        { name: 'Declined', value: rejected, fill: 'hsl(350 89% 60%)' },
      ])
    } catch (err) {
      console.error('Failed to load student analytics:', err)
      toast.error('Failed to load analytics data')
    }
  }, [])

  useEffect(() => { fetchStudentData() }, [fetchStudentData])

  const totalApps = useFilteredStats(range, { value: totalAppsVal, delta: 0 })
  const acceptRate = useFilteredStats(range, { value: acceptRateVal, delta: 0 })
  const reviewConv = useFilteredStats(range, { value: reviewConvVal, delta: 0 })

  const pipelineBarColors = ['hsl(239 84% 67%)', 'hsl(258 90% 66%)', 'hsl(160 84% 39%)', 'hsl(330 81% 60%)', 'hsl(38 92% 50%)']

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Send} label="Total applications" value={totalApps.value} delta={totalApps.delta} />
        <StatCard icon={CheckCheck} label="Referral accept rate" value={`${acceptRate.value}%`} delta={acceptRate.delta} />
        <StatCard icon={Calendar} label="Review conversion" value={`${reviewConv.value}%`} delta={reviewConv.delta} />
        <StatCard icon={Trophy} label="Accepted referrals" value={acceptRate.value} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCardGrid title="Weekly activity" data={studentWeekly.map((w) => ({ week: w.label, ...w }))} filename="student-weekly" span="lg:col-span-2">
          {hasData(studentWeekly) ? (
            <LazyResponsiveContainer width="100%" height={280}>
              <LazyBarChart data={studentWeekly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <LazyCartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <LazyXAxis dataKey="label" axisLine={false} tickLine={false} tick={TICK} />
                <LazyYAxis axisLine={false} tickLine={false} tick={TICK} />
                <LazyTooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <LazyLegend wrapperStyle={{ fontSize: 12, color: '#9A9BA8' }} />
                <LazyBar dataKey="applications" stackId="a" fill="hsl(239 84% 67%)" radius={[0, 0, 0, 0]} name="Applications" />
                <LazyBar dataKey="referrals" stackId="a" fill="hsl(258 90% 66%)" name="Referrals" />
                <LazyBar dataKey="responses" stackId="a" fill="hsl(330 81% 60%)" radius={[4, 4, 0, 0]} name="Responses" />
              </LazyBarChart>
            </LazyResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCardGrid>
        <ChartCard title="Request outcomes" data={conversion} filename="request-outcomes">
          <LazyResponsiveContainer width="100%" height={220}>
            <LazyPieChart>
              <LazyPie data={conversion} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                {conversion.map((c) => <LazyCell key={c.name} fill={c.fill} />)}
              </LazyPie>
              <LazyTooltip content={<ChartTooltip />} />
              <LazyLegend wrapperStyle={{ fontSize: 12, color: '#9A9BA8' }} />
            </LazyPieChart>
          </LazyResponsiveContainer>
        </ChartCard>
      </div>
      <ChartCard title="Success rate over time" data={studentWeekly.map((w) => ({ month: w.label, rate: Math.round((w.responses / Math.max(w.applications, 1)) * 100) }))} filename="success-rate">
        {hasData(studentWeekly) ? (
          <LazyResponsiveContainer width="100%" height={240}>
            <LazyLineChart data={studentWeekly.map((w) => ({ month: w.label, rate: Math.round((w.responses / Math.max(w.applications, 1)) * 100) }))} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <LazyCartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <LazyXAxis dataKey="month" axisLine={false} tickLine={false} tick={TICK} />
              <LazyYAxis axisLine={false} tickLine={false} tick={TICK} unit="%" />
              <LazyTooltip content={<ChartTooltip />} />
              <LazyLine type="monotone" dataKey="rate" stroke="hsl(160 84% 39%)" strokeWidth={2.5} dot={{ r: 3 }} name="Success rate" />
            </LazyLineChart>
          </LazyResponsiveContainer>
        ) : <EmptyChart />}
      </ChartCard>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Referral pipeline" data={pipelineData} filename="referral-pipeline">
          <LazyResponsiveContainer width="100%" height={260}>
            <LazyBarChart data={pipelineData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <LazyCartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <LazyXAxis dataKey="name" axisLine={false} tickLine={false} tick={TICK} />
              <LazyYAxis axisLine={false} tickLine={false} tick={TICK} />
              <LazyTooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <LazyBar dataKey="count" radius={[5, 5, 0, 0]} name="Referrals">
                {pipelineData.map((_, i) => <LazyCell key={i} fill={pipelineBarColors[i % pipelineBarColors.length]} />)}
              </LazyBar>
            </LazyBarChart>
          </LazyResponsiveContainer>
        </ChartCard>
        <ChartCard title="Status breakdown" data={statusBreakdown} filename="status-breakdown">
          <LazyResponsiveContainer width="100%" height={260}>
            <LazyPieChart>
              <LazyPie data={statusBreakdown} dataKey="value" innerRadius={55} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                {statusBreakdown.map((c) => <LazyCell key={c.name} fill={c.fill} />)}
              </LazyPie>
              <LazyTooltip content={<ChartTooltip />} />
              <LazyLegend wrapperStyle={{ fontSize: 12, color: '#9A9BA8' }} />
            </LazyPieChart>
          </LazyResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

function ProfessionalAnalytics({ range }: { range: DateRange }) {
  const proMonthly = useFilteredProMonthly(range)
  const proResponseTime = useFilteredProResponseTime(range)
  const { requests } = useApp()

  const receivedCount = requests.length
  const acceptedCount = requests.filter((r) => r.status === 'accepted').length
  const rejectedCount = requests.filter((r) => r.status === 'declined').length
  const pendingCount = requests.filter((r) => r.status === 'requested' || r.status === 'under_review').length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Send} label="Requests received" value={receivedCount} delta={0} />
        <StatCard icon={CheckCircle} label="Accepted" value={acceptedCount} delta={0} />
        <StatCard icon={XCircle} label="Rejected" value={rejectedCount} delta={0} />
        <StatCard icon={Clock} label="Pending" value={pendingCount} delta={0} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Requests vs accepted" data={proMonthly.map((m) => ({ month: m.label, ...m }))} filename="pro-requests">
          {hasData(proMonthly) ? (
            <LazyResponsiveContainer width="100%" height={260}>
              <LazyAreaChart data={proMonthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(239 84% 67%)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(239 84% 67%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <LazyCartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <LazyXAxis dataKey="label" axisLine={false} tickLine={false} tick={TICK} />
                <LazyYAxis axisLine={false} tickLine={false} tick={TICK} />
                <LazyTooltip content={<ChartTooltip />} />
                <LazyLegend wrapperStyle={{ fontSize: 12, color: '#9A9BA8' }} />
                <LazyArea type="monotone" dataKey="referrals" stroke="hsl(239 84% 67%)" strokeWidth={2.5} fill="url(#a1)" name="Received" />
                <LazyArea type="monotone" dataKey="accepted" stroke="hsl(160 84% 39%)" strokeWidth={2.5} fill="transparent" name="Accepted" />
              </LazyAreaChart>
            </LazyResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Response time by day" data={proResponseTime.map((d) => ({ day: d.label, hours: d.hours }))} filename="response-time">
            <LazyResponsiveContainer width="100%" height={260}>
              <LazyBarChart data={proResponseTime} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <LazyCartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <LazyXAxis dataKey="label" axisLine={false} tickLine={false} tick={TICK} />
                <LazyYAxis axisLine={false} tickLine={false} tick={TICK} />
                <LazyTooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <LazyBar dataKey="hours" radius={[5, 5, 0, 0]} name="Hours to reply">
                  {proResponseTime.map((d, i) => <LazyCell key={d.label} fill={i === 4 ? 'hsl(160 84% 39%)' : 'hsl(239 84% 67%)'} />)}
                </LazyBar>
              </LazyBarChart>
            </LazyResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

function RecruiterAnalytics({ range }: { range: DateRange }) {
  const recruiterWeekly = useFilteredRecruiterWeekly(range)
  const [applicantsVal, setApplicantsVal] = useState(0)
  const [reviewConvVal, setReviewConvVal] = useState(0)
  const [offerConvVal, setOfferConvVal] = useState(0)
  const [funnelData, setFunnelData] = useState<{ stage: string; value: number; fill: string }[]>([
    { stage: 'Applied', value: 0, fill: 'hsl(239 84% 67%)' },
    { stage: 'Screened', value: 0, fill: 'hsl(258 90% 66%)' },
    { stage: 'Review', value: 0, fill: 'hsl(280 65% 58%)' },
    { stage: 'Offer', value: 0, fill: 'hsl(330 81% 60%)' },
    { stage: 'Hired', value: 0, fill: 'hsl(160 84% 39%)' },
  ])

  const fetchRecruiterData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? null
      if (!userId) return

      const { from, to } = range.preset === 'all' ? getPresetRange('all') : range

      const { data: rows } = await supabase
        .from('referrals')
        .select('status, pipeline_stage, created_at')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: true })

      if (!rows) return

      const total = rows.length
      const inReview = rows.filter((r) => r.pipeline_stage === 'under_review').length
      const offers = rows.filter((r) => r.pipeline_stage === 'submitted' || r.pipeline_stage === 'hired').length

      setApplicantsVal(total)
      setReviewConvVal(total > 0 ? Math.round((inReview / total) * 100) : 0)
      setOfferConvVal(total > 0 ? Math.round((offers / total) * 100) : 0)

      const stageMap: Record<string, string> = {
        request_sent: 'Applied',
        under_review: 'Screened',
        accepted: 'Review',
        submitted: 'Offer',
        hired: 'Hired',
      }
      const counts: Record<string, number> = { Applied: 0, Screened: 0, Review: 0, Offer: 0, Hired: 0 }
      for (const row of rows) {
        const mapped = stageMap[row.pipeline_stage] ?? 'Applied'
        counts[mapped] = (counts[mapped] || 0) + 1
      }
      setFunnelData([
        { stage: 'Applied', value: counts.Applied, fill: 'hsl(239 84% 67%)' },
        { stage: 'Screened', value: counts.Screened, fill: 'hsl(258 90% 66%)' },
        { stage: 'Review', value: counts.Review, fill: 'hsl(280 65% 58%)' },
        { stage: 'Offer', value: counts.Offer, fill: 'hsl(330 81% 60%)' },
        { stage: 'Hired', value: counts.Hired, fill: 'hsl(160 84% 39%)' },
      ])
    } catch (err) {
      console.error('Failed to load recruiter analytics:', err)
      toast.error('Failed to load analytics data')
    }
  }, [range])

  useEffect(() => { fetchRecruiterData() }, [fetchRecruiterData])

  const applicants = useFilteredStats(range, { value: applicantsVal, delta: 0 })
  const reviewConv = useFilteredStats(range, { value: reviewConvVal, delta: 0 })
  const offerConv = useFilteredStats(range, { value: offerConvVal, delta: 0 })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total applicants" value={applicants.value} delta={applicants.delta} />
        <StatCard icon={Target} label="Review conversion" value={`${reviewConv.value}%`} delta={reviewConv.delta} />
        <StatCard icon={CheckCheck} label="Offer conversion" value={`${offerConv.value}%`} delta={offerConv.delta} />
        <StatCard icon={TrendingUp} label="Time-to-hire" value="--" delta={0} deltaLabel="" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Hiring funnel" data={funnelData.map((f) => ({ stage: f.stage, value: f.value }))} filename="hiring-funnel">
          <LazyResponsiveContainer width="100%" height={250}>
            <LazyFunnelChart>
              <LazyTooltip content={<ChartTooltip />} />
              <LazyFunnel dataKey="value" data={funnelData} isAnimationActive>
                {funnelData.map((f) => <LazyCell key={f.stage} fill={f.fill} />)}
                <LazyLabelList position="right" fill="#9A9BA8" stroke="none" dataKey="stage" fontSize={11} />
              </LazyFunnel>
            </LazyFunnelChart>
          </LazyResponsiveContainer>
        </ChartCard>
        <ChartCardGrid title="Applications & hires" data={recruiterWeekly.map((w) => ({ week: w.label, ...w }))} filename="recruiter-weekly" span="lg:col-span-2">
          {hasData(recruiterWeekly) ? (
            <LazyResponsiveContainer width="100%" height={250}>
              <LazyAreaChart data={recruiterWeekly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="r1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(239 84% 67%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(239 84% 67%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <LazyCartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <LazyXAxis dataKey="label" axisLine={false} tickLine={false} tick={TICK} />
                <LazyYAxis axisLine={false} tickLine={false} tick={TICK} />
                <LazyTooltip content={<ChartTooltip />} />
                <LazyLegend wrapperStyle={{ fontSize: 12, color: '#9A9BA8' }} />
                <LazyArea type="monotone" dataKey="applications" stroke="hsl(239 84% 67%)" strokeWidth={2.5} fill="url(#r1)" name="Applications" />
                <LazyArea type="monotone" dataKey="hires" stroke="hsl(160 84% 39%)" strokeWidth={2.5} fill="transparent" name="Hires" />
              </LazyAreaChart>
            </LazyResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCardGrid>
      </div>
    </div>
  )
}

export default function Analytics() {
  const { role, loading } = useApp()
  const [range, setRange] = useState<DateRange>(() => {
    const { from, to } = getPresetRange('6m')
    return { preset: '6m', from, to }
  })
  const studentWeekly = useFilteredStudentWeekly(range)
  const proMonthly = useFilteredProMonthly(range)
  const recruiterWeekly = useFilteredRecruiterWeekly(range)

  const handleExport = () => {
    if (role === 'student') {
      exportAnalyticsCSV(studentWeekly.map((w) => ({ label: w.label, applications: w.applications, referrals: w.referrals, responses: w.responses })))
    } else if (role === 'professional' || role === 'admin') {
      exportAnalyticsCSV(proMonthly.map((m) => ({ label: m.label, applications: m.referrals, referrals: m.accepted, responses: 0 })))
    } else {
      exportAnalyticsCSV(recruiterWeekly.map((w) => ({ label: w.label, applications: w.applications, referrals: w.hires, responses: 0 })))
    }
    toast.success('Analytics exported as CSV')
  }

  if (loading) return <DashboardSkeleton />

  const noData =
    (role === 'student' && !hasData(studentWeekly)) ||
    ((role === 'professional' || role === 'admin') && !hasData(proMonthly)) ||
    (role === 'recruiter' && !hasData(recruiterWeekly))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          title="Analytics"
          subtitle={role === 'student' ? 'Your job-search performance at a glance' : role === 'professional' || role === 'admin' ? 'Your referral impact, measured' : 'Hiring performance across every stage'}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={handleExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
          </Button>
          <DateRangeSelector value={range} onChange={setRange} />
        </div>
      </div>
      {noData ? (
        <EmptyState
          icon={BarChart3}
          title="No analytics data yet"
          description="Start sending or receiving referrals to see your performance metrics here."
        />
      ) : (
        <>
          {role === 'student' && <StudentAnalytics range={range} />}
          {(role === 'professional' || role === 'admin') && <ProfessionalAnalytics range={range} />}
          {role === 'recruiter' && <RecruiterAnalytics range={range} />}
        </>
      )}
    </div>
  )
}
