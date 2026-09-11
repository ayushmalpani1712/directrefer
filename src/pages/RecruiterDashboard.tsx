import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import {
  ArrowRight, Briefcase, FileText,
  Plus, Star, UserCheck, Users,
  Pause, Eye, Pencil, Clock, BarChart3,
} from 'lucide-react'
import { LazyBar, LazyBarChart, LazyCartesianGrid, LazyCell, LazyFunnel, LazyFunnelChart, LazyLabelList, LazyResponsiveContainer, LazyTooltip, LazyXAxis, LazyYAxis } from '@/components/Charts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataCard } from '@/components/ui/card-primitives'
import { EmptyState } from '@/components/ui/empty-state'
import { GAvatar } from '@/components/ui-kit'
import { TrustBadge } from '@/components/TrustBadge'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { type DateRange, getPresetRange } from '@/components/analytics/DateRangeSelector'
import { EmptyChart } from '@/components/analytics/EmptyChart'
import { useFilteredRecruiterWeekly, hasData } from '@/hooks/useAnalytics'
import { ROLE_ROUTE, getRoleFromPath, profileUrl } from '@/data/constants'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Job } from '@/data/constants'
import { cn } from '@/lib/utils'

interface FunnelStage { stage: string; value: number; fill: string }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-xs shadow-md">
      {label && <div className="mb-1 font-semibold text-foreground">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

const STATUS_PILL: Record<Job['stage'], { label: string; className: string }> = {
  Active: { label: 'Published', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  Draft: { label: 'Draft', className: 'bg-muted/50 text-muted-foreground border border-border' },
  Paused: { label: 'Paused', className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  Closed: { label: 'Closed', className: 'bg-slate-500/10 text-slate-400 border border-slate-500/20' },
}

export default function RecruiterDashboard() {
  const { jobs, candidates, savedCandidates, activity, loading } = useApp()
  const { user } = useAuth()
  const { pathname } = useLocation()
  const prefix = ROLE_ROUTE[getRoleFromPath(pathname)]
  const [recruiterCompany, setRecruiterCompany] = useState({
    name: '', industry: '', size: '',
    website: '', description: '',
    hiringStats: { timeToHire: 0, offerAccept: 0, referralShare: 0, activeJobs: jobs.filter((j) => j.stage === 'Active').length },
    responseRate: 0, verified: false,
  })
  const profileLoadedRef = useRef(false)

  useEffect(() => {
    const loadCompany = async () => {
      if (!user) return
      if (profileLoadedRef.current) return
      profileLoadedRef.current = true
      try {
        const { data } = await supabase
          .from('profiles_recruiter')
          .select('company_name, hiring_department, company_size, company_website, time_to_hire, offer_accept_rate, referral_share')
          .eq('user_id', user.id)
          .single()
        if (data) {
          setRecruiterCompany((prev) => ({
            ...prev,
            name: data.company_name ?? prev.name,
            industry: data.hiring_department ?? prev.industry,
            size: data.company_size ?? prev.size,
            website: data.company_website ?? prev.website,
            hiringStats: {
              timeToHire: data.time_to_hire ?? 0,
              offerAccept: data.offer_accept_rate ?? 0,
              referralShare: data.referral_share ?? 0,
              activeJobs: jobs.filter((j) => j.stage === 'Active').length,
            },
          }))
        }
      } catch (err) {
        console.error('Failed to load company profile:', err)
        toast.error('Could not load company profile')
      }
    }
    loadCompany()
  }, [user])

  const RECRUITER_USER = { name: recruiterCompany.name || user?.email?.split('@')[0] || 'Recruiter', designation: recruiterCompany.industry || '', gradient: 'from-[#6366F1] to-[#8B5CF6]' }
  const saved = candidates.filter((c) => savedCandidates.includes(c.id))
  const [range] = useState<DateRange>(() => {
    const { from, to } = getPresetRange('6m')
    return { preset: '6m', from, to }
  })
  const recruiterWeekly = useFilteredRecruiterWeekly(range)

  const [funnelData, setFunnelData] = useState<FunnelStage[]>([
    { stage: 'Applied', value: 0, fill: 'hsl(239 84% 67%)' },
    { stage: 'Screened', value: 0, fill: 'hsl(258 90% 66%)' },
    { stage: 'Review', value: 0, fill: 'hsl(280 65% 58%)' },
    { stage: 'Offer', value: 0, fill: 'hsl(330 81% 60%)' },
    { stage: 'Hired', value: 0, fill: 'hsl(160 84% 39%)' },
  ])

  const fetchFunnel = useCallback(async () => {
    if (!user) return
    try {
      const { from, to } = range.preset === 'all' ? getPresetRange('all') : range

      const { data: rows } = await supabase
        .from('referrals')
        .select('pipeline_stage, created_at')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: true })

      if (!rows) return

      const stageMap: Record<string, string> = {
        request_sent: 'Applied',
        under_review: 'Screened',
        accepted: 'Review',
        submitted: 'Offer',
        hired: 'Hired',
      }

      const counts: Record<string, number> = {
        Applied: 0,
        Screened: 0,
        Review: 0,
        Offer: 0,
        Hired: 0,
      }

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
      console.error('Failed to load funnel data:', err)
      toast.error('Failed to load funnel data')
    }
  }, [user, range])

  useEffect(() => { fetchFunnel() }, [fetchFunnel])

  if (loading) return <DashboardSkeleton />

  const totalApplicants = jobs.reduce((a, j) => a + j.applicants, 0)
  const totalReferrals = jobs.reduce((a, j) => a + j.referrals, 0)
  const activeJobs = jobs.filter((j) => j.stage === 'Active')
  const avgTimeToHire = recruiterCompany.hiringStats.timeToHire || '—'

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.08),transparent)]" />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <GAvatar name={RECRUITER_USER.name} color={RECRUITER_USER.gradient} className="h-14 w-14 text-xl" ring />
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {recruiterCompany.name || 'Your'} Dashboard
                  </h1>
                  {recruiterCompany.verified && (
                    <TrustBadge tier="verified" showScore />
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{RECRUITER_USER.designation}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Badge className="border border-border bg-muted/30 text-muted-foreground hover:bg-muted/50">
                    {activeJobs.length} active {activeJobs.length === 1 ? 'job' : 'jobs'}
                  </Badge>
                  <Badge className="border border-border bg-muted/30 text-muted-foreground hover:bg-muted/50">
                    {recruiterCompany.hiringStats.offerAccept}% offer accept
                  </Badge>
                  <Badge className="border border-border bg-muted/30 text-muted-foreground hover:bg-muted/50">
                    {recruiterCompany.hiringStats.timeToHire ? `${recruiterCompany.hiringStats.timeToHire}d time-to-hire` : '— time-to-hire'}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              size="lg"
              className="bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 sm:w-auto w-full"
              asChild
            >
              <Link to="/recruiter/jobs">
                <Plus className="mr-2 h-4 w-4" />
                Post a New Job
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DataCard
          title="Active Jobs"
          value={activeJobs.length}
          subtitle="Currently hiring"
          icon={<Briefcase className="h-5 w-5" />}
        />
        <DataCard
          title="Total Applications"
          value={totalApplicants}
          subtitle="Across all active jobs"
          icon={<Users className="h-5 w-5" />}
        />
        <DataCard
          title="Referrals Received"
          value={totalReferrals}
          subtitle="Via professional network"
          icon={<UserCheck className="h-5 w-5" />}
        />
        <DataCard
          title="Avg Time to Hire"
          value={typeof avgTimeToHire === 'number' ? `${avgTimeToHire}d` : avgTimeToHire}
          subtitle="Days to close"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column — 2/3 */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Active Jobs */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Active Jobs</CardTitle>
              <span data-slot="card-action">
                <Button variant="ghost" size="sm" className="h-9 text-primary" asChild>
                  <Link to="/recruiter/jobs">Manage all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
                </Button>
              </span>
            </CardHeader>
            <CardContent>
              {activeJobs.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="No active jobs posted"
                  description="Create your first job listing to start receiving applications."
                  action={{ label: 'Post a New Job', href: '/recruiter/jobs' }}
                />
              ) : (
                <div className="space-y-3">
                  {activeJobs.slice(0, 4).map((j) => {
                    const pill = STATUS_PILL[j.stage] || STATUS_PILL.Active
                    return (
                      <div
                        key={j.id}
                        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/20 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[14px] font-semibold text-foreground">{j.title}</span>
                            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', pill.className)}>
                              {pill.label}
                            </span>
                          </div>
                          <div className="mt-1 text-[13px] text-muted-foreground">
                            {j.location} · {j.type} · {j.salary}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-[11px]">
                              {j.applicants} applications
                            </Badge>
                            <Badge variant="secondary" className="text-[11px]">
                              {j.referrals} via referral
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Pause">
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="View applications" asChild>
                            <Link to="/recruiter/jobs">
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referral Pipeline */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Referral Pipeline</CardTitle>
              <span data-slot="card-action">
                <Button variant="ghost" size="sm" className="h-9 text-primary" asChild>
                  <Link to={`${prefix}/analytics`}>View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
                </Button>
              </span>
            </CardHeader>
            <CardContent>
              {totalReferrals === 0 ? (
                <EmptyState
                  icon={UserCheck}
                  title="No referrals yet"
                  description="Referrals will appear here once professionals start referring candidates to your jobs."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-2.5 font-medium text-muted-foreground">Candidate</th>
                        <th className="pb-2.5 font-medium text-muted-foreground">Referrer</th>
                        <th className="pb-2.5 font-medium text-muted-foreground">Job</th>
                        <th className="pb-2.5 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {jobs.slice(0, 5).map((j) => (
                        <tr key={j.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 text-foreground font-medium">—</td>
                          <td className="py-3 text-muted-foreground">—</td>
                          <td className="py-3 text-foreground">{j.title}</td>
                          <td className="py-3">
                            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', STATUS_PILL[j.stage]?.className)}>
                              {STATUS_PILL[j.stage]?.label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            <Link to={`${prefix}/analytics`} className="block h-full">
              <Card className="cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm h-full">
                <CardHeader>
                  <CardTitle className="text-[15px] font-semibold">Hiring Funnel</CardTitle>
                  <p className="text-[13px] text-muted-foreground">All active jobs</p>
                </CardHeader>
                <CardContent>
                  <div className="h-[230px]">
                    <LazyResponsiveContainer width="100%" height={230}>
                      <LazyFunnelChart>
                        <LazyTooltip content={<ChartTooltip />} />
                        <LazyFunnel dataKey="value" data={funnelData} isAnimationActive>
                          {funnelData.map((f) => <LazyCell key={f.stage} fill={f.fill} />)}
                          <LazyLabelList position="right" fill="hsl(var(--muted-foreground))" stroke="none" dataKey="stage" fontSize={11} />
                        </LazyFunnel>
                      </LazyFunnelChart>
                    </LazyResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to={`${prefix}/analytics`} className="block h-full">
              <Card className="cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm h-full">
                <CardHeader>
                  <CardTitle className="text-[15px] font-semibold">Applications & Hires</CardTitle>
                  <p className="text-[13px] text-muted-foreground">Last 8 weeks</p>
                </CardHeader>
                <CardContent className="pt-2">
                  {hasData(recruiterWeekly) ? (
                    <div className="h-[220px]">
                      <LazyResponsiveContainer width="100%" height={220}>
                        <LazyBarChart data={recruiterWeekly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                          <LazyCartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <LazyXAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                          <LazyYAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                          <LazyTooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                          <LazyBar dataKey="applications" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" name="Applications" />
                          <LazyBar dataKey="hires" radius={[4, 4, 0, 0]} fill="hsl(160 84% 39%)" name="Hires" />
                        </LazyBarChart>
                      </LazyResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyChart />
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Right Column — 1/3 */}
        <div className="flex flex-col gap-6">
          {/* Saved Candidates */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-4 w-4 text-primary" /> Saved Candidates
              </CardTitle>
              <span data-slot="card-action">
                <Button variant="ghost" size="sm" className="h-9 text-primary" asChild>
                  <Link to={`${prefix}/talent`}>All</Link>
                </Button>
              </span>
            </CardHeader>
            <CardContent>
              {saved.length === 0 ? (
                <EmptyState
                  icon={Star}
                  title="No saved candidates"
                  description="Save candidates you're interested in and they'll appear here for quick access."
                />
              ) : (
                <div className="space-y-2.5">
                  {saved.map((c) => (
                    <Link
                      to={profileUrl('job-seeker', c.id, c.slug)}
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/20"
                    >
                      <GAvatar name={c.name} color={c.gradient} className="h-8 w-8 text-[10px]" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium text-foreground">{c.name}</div>
                        <div className="truncate text-[13px] text-muted-foreground">{c.role} · {c.exp}y exp</div>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {c.rating}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Activity */}
          <Card className="flex-1">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" /> Team Activity
              </CardTitle>
              <span data-slot="card-action">
                <Button variant="ghost" size="sm" className="h-9 text-primary" asChild>
                  <Link to={`${prefix}/analytics`}>View all</Link>
                </Button>
              </span>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No activity yet"
                  description="Team actions and updates will appear here as your hiring pipeline moves forward."
                />
              ) : (
                <div className="space-y-3.5">
                  {activity.slice(0, 5).map((item, i) => (
                    <div key={item.id ?? i} className="relative flex gap-3 pl-4">
                      <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary" />
                      <div className="min-w-0">
                        <p className="text-[14px] leading-snug text-foreground">{item.text}</p>
                        <span className="text-[13px] text-muted-foreground">{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
