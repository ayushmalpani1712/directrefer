import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import {
  ArrowRight, Briefcase, CheckCheck, FileText,
  Plus, Search, Star, UserCheck, Users,
} from 'lucide-react'
import { LazyBar, LazyBarChart, LazyCartesianGrid, LazyCell, LazyFunnel, LazyFunnelChart, LazyLabelList, LazyResponsiveContainer, LazyTooltip, LazyXAxis, LazyYAxis } from '@/components/Charts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Chip, CompanyChip, GAvatar, StatCard } from '@/components/ui-kit'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { DateRangeSelector, type DateRange, getPresetRange } from '@/components/analytics/DateRangeSelector'
import { EmptyChart } from '@/components/analytics/EmptyChart'
import { useFilteredRecruiterWeekly, hasData } from '@/hooks/useAnalytics'
import { ROLE_ROUTE, getRoleFromPath, profileUrl } from '@/data/mock'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface FunnelStage { stage: string; value: number; fill: string }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#13141A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#F2F2F5' }}>
      {label && <div style={{ marginBottom: 4, fontWeight: 600, color: '#F2F2F5' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#F2F2F5' }}>
          {p.name} : {p.value}
        </div>
      ))}
    </div>
  )
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
  const [range, setRange] = useState<DateRange>(() => {
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
  const inReview = jobs.reduce((a, j) => a + (j.pipeline.find((s) => s.stage === 'Review')?.count ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <Card className="overflow-hidden border border-border bg-card shadow-soft">
          <CardContent className="relative p-4 sm:p-5">
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <GAvatar name={RECRUITER_USER.name} gradient={RECRUITER_USER.gradient} className="h-12 w-12 text-base" ring />
                <div>
                  <div className="text-[13px] text-muted-foreground">{RECRUITER_USER.designation}</div>
                  <h1 className="font-display text-xl sm:text-[28px] font-bold leading-tight text-foreground">Hiring at {recruiterCompany.name}</h1>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <Badge className="border border-border bg-muted/30 text-muted-foreground hover:bg-muted/50">{recruiterCompany.hiringStats.activeJobs} active jobs</Badge>
                    <Badge className="border border-border bg-muted/30 text-muted-foreground hover:bg-muted/50">{recruiterCompany.hiringStats.offerAccept}% offer accept</Badge>
                    <Badge className="border border-border bg-muted/30 text-muted-foreground hover:bg-muted/50">{recruiterCompany.hiringStats.timeToHire}d avg time-to-hire</Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white shadow-sm hover:translate-y-[-1px]" asChild><Link to="/recruiter/jobs"><Plus className="mr-1.5 h-4 w-4" /> Post a job</Link></Button>
                <Button variant="outline" className="border-border bg-transparent text-foreground hover:bg-muted/30" asChild><Link to="/recruiter/talent"><Search className="mr-1.5 h-4 w-4" /> Search talent</Link></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-end">
        <DateRangeSelector value={range} onChange={setRange} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 items-stretch">
        <StatCard icon={Briefcase} label="Open jobs" value={jobs.filter((j) => j.stage === 'Active').length} delta={0} delay={0.05} href="/recruiter/jobs" />
        <StatCard icon={Users} label="Total applicants" value={totalApplicants} delta={0} delay={0.1} href="/recruiter/jobs" />
        <StatCard icon={UserCheck} label="In review" value={inReview} delta={0} delay={0.15} href="/recruiter/talent" />
        <StatCard icon={CheckCheck} label="Hires this quarter" value={jobs.filter((j) => j.stage === 'Active').reduce((a, j) => a + (j.pipeline.find((s) => s.stage === 'Hired')?.count ?? 0), 0)} delta={0} delay={0.2} href={`${prefix}/analytics`} />
      </div>

      {/* Discover Job Seekers */}
      <Link to={`${prefix}/talent`} className="block">
      <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15">
        <CardHeader className="">
          <CardTitle className="text-[15px] font-semibold">Discover Job Seekers</CardTitle>
          <span data-slot="card-action" className="shrink-0"><Button variant="ghost" size="sm" className="h-9 text-primary">Browse all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></span>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {candidates.filter((c) => c.source === 'Open to work' && c.id !== user?.id).slice(0, 4).map((c) => (
            <Link to={profileUrl('job-seeker', c.id, c.slug)} key={c.id} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/20">
              <GAvatar name={c.name} gradient={c.gradient} className="h-9 w-9 text-xs" />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-foreground">{c.name}</div>
                <div className="text-[13px] text-muted-foreground">{c.role} · {c.exp}y exp</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.skills.slice(0, 3).map((s) => <span key={s} className="rounded-full bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">{s}</span>)}
                </div>
              </div>
              <Search className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
          {candidates.filter((c) => c.source === 'Open to work' && c.id !== user?.id).length === 0 && (
            <p className="py-2 text-center text-[13px] text-muted-foreground">No open-to-work seekers yet. Check back soon.</p>
          )}
        </CardContent>
      </Card>
      </Link>

      <div className="grid gap-6 lg:grid-cols-3 items-stretch">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Funnel + weekly */}
          <div className="grid gap-6 md:grid-cols-2 items-stretch">
            <Link to={`${prefix}/analytics`} className="block h-full">
            <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15 h-full">
              <CardHeader className="">
                <CardTitle className="text-[15px] font-semibold">Hiring funnel</CardTitle>
                <p className="text-[13px] text-muted-foreground">All active jobs · Q3</p>
              </CardHeader>
              <CardContent>
                <div className="h-[230px]">
                <LazyResponsiveContainer width="100%" height={230}>
                  <LazyFunnelChart>
                    <LazyTooltip content={<ChartTooltip />} />
                    <LazyFunnel dataKey="value" data={funnelData} isAnimationActive>
                      {funnelData.map((f) => <LazyCell key={f.stage} fill={f.fill} />)}
                      <LazyLabelList position="right" fill="#9A9BA8" stroke="none" dataKey="stage" fontSize={11} />
                    </LazyFunnel>
                  </LazyFunnelChart>
                </LazyResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            </Link>
            <Link to={`${prefix}/analytics`} className="block h-full">
            <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15 h-full">
              <CardHeader className="">
                <CardTitle className="text-[15px] font-semibold">Applications & hires</CardTitle>
                <p className="text-[13px] text-muted-foreground">Last 8 weeks</p>
              </CardHeader>
              <CardContent className="pt-2">
                {hasData(recruiterWeekly) ? (
                <div className="h-[220px]">
                <LazyResponsiveContainer width="100%" height={220}>
                  <LazyBarChart data={recruiterWeekly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <LazyCartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <LazyXAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#9A9BA8', fontSize: 12 }} />
                    <LazyYAxis axisLine={false} tickLine={false} tick={{ fill: '#9A9BA8', fontSize: 12 }} />
                    <LazyTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <LazyBar dataKey="applications" radius={[4, 4, 0, 0]} fill="#6366F1" name="Applications" />
                    <LazyBar dataKey="hires" radius={[4, 4, 0, 0]} fill="#34D399" name="Hires" />
                  </LazyBarChart>
                </LazyResponsiveContainer>
                </div>
                ) : <EmptyChart />}
              </CardContent>
            </Card>
            </Link>
          </div>

          {/* Jobs */}
          <Link to="/recruiter/jobs" className="block">
          <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15">
            <CardHeader className="">
              <CardTitle className="text-[15px] font-semibold">Open jobs</CardTitle>
              <span data-slot="card-action" className="shrink-0"><Button variant="ghost" size="sm" className="h-9 text-primary">Manage all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></span>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {jobs.filter((j) => j.stage === 'Active').slice(0, 4).map((j) => (
                <Link to="/recruiter/jobs" key={j.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/20">
                  <CompanyChip name={recruiterCompany.name} className="h-10 w-10 rounded-lg text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-foreground">{j.title}</div>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">{j.location} · {j.type} · {j.salary}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Chip>{j.applicants} applicants</Chip>
                      <Chip tone="primary">{j.referrals} via referral</Chip>
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="text-[20px] font-bold text-primary">{j.pipeline.find((s) => s.stage === 'Review')?.count}</div>
                    <div className="text-[13px] text-muted-foreground">reviewing</div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
          </Link>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Saved candidates */}
          <Link to={`${prefix}/talent`} className="block">
          <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15">
            <CardHeader className="">
              <CardTitle className="flex items-center gap-2 text-base"><Star className="h-4 w-4 text-primary" /> Saved candidates</CardTitle>
              <span data-slot="card-action" className="shrink-0"><Button variant="ghost" size="sm" className="h-9 text-primary">All</Button></span>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-2">
              {saved.map((c) => (
                <Link to={profileUrl('job-seeker', c.id, c.slug)} key={c.id} className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/20">
                  <GAvatar name={c.name} gradient={c.gradient} className="h-8 w-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-foreground">{c.name}</div>
                    <div className="truncate text-[13px] text-muted-foreground">{c.role} · {c.exp}y exp</div>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {c.rating}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
          </Link>

          {/* Recent activity */}
          <Link to={`${prefix}/analytics`} className="block flex-1">
          <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15 h-full">
            <CardHeader className="">              <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" /> Recent activity</CardTitle></CardHeader>
            <CardContent className="space-y-3.5 pt-2">
              {activity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                activity.slice(0, 5).map((item, i) => (
                  <div key={item.id ?? i} className="relative flex gap-3 pl-4">
                    <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="text-[14px] leading-snug text-foreground">{item.text}</p>
                      <span className="text-[13px] text-muted-foreground">{item.time}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
