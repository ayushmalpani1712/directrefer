import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowRight, CheckCheck, ChevronRight, Clock, Inbox,
  MessageSquare, Search, TrendingUp, XCircle,
} from 'lucide-react'
import { LazyArea, LazyAreaChart, LazyBar, LazyBarChart, LazyCartesianGrid, LazyResponsiveContainer, LazyTooltip, LazyXAxis, LazyYAxis } from '@/components/Charts'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CompanyChip, GAvatar, StatCard, StatusBadge } from '@/components/ui-kit'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { DateRangeSelector, type DateRange, getPresetRange } from '@/components/analytics/DateRangeSelector'
import { EmptyChart } from '@/components/analytics/EmptyChart'
import { useFilteredProMonthly, useFilteredProResponseTime, hasData } from '@/hooks/useAnalytics'
import type { Professional } from '@/data/mock'
import { getMessagesPath } from '@/data/mock'

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1A2028', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#F5F7FA' }}>
      {label && <div style={{ marginBottom: 4, fontWeight: 600, color: '#F5F7FA' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#F5F7FA' }}>
          {p.name} : {p.value}
        </div>
      ))}
    </div>
  )
}

export default function ProfessionalDashboard() {
  const { professionals, conversations, requests, setRequestStatus, student, candidates, loading, startConversation, role } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [range, setRange] = useState<DateRange>(() => {
    const { from, to } = getPresetRange('6m')
    return { preset: '6m', from, to }
  })
  const proMonthly = useFilteredProMonthly(range)
  const proResponseTime = useFilteredProResponseTime(range)

  const fallback = useMemo<Professional>(() => ({
    id: user?.id ?? '',
    name: student.name || (user?.email?.split('@')[0] ?? 'User'),
    designation: 'Professional',
    company: '',
    industry: '',
    location: '',
    yearsExp: 0,
    skills: [],
    responseRate: 0,
    avgReplyHours: 0,
    referralsCompleted: 0,
    rating: 0,
    reviews: 0,
    verified: false,
    openForReferrals: false,
    isOpenToWork: false,
    maxPerMonth: 5,
    usedThisMonth: 0,
    successRate: 0,
    followers: 0,
    joinedDaysAgo: 0,
    activityScore: 0,
    referralPolicy: '',
    openPositions: [],
    bio: '',
    badges: [],
    gradient: 'from-[#4F7CFF] to-[#7C5CFF]',
    phone: '',
    whatsapp: '',
    email: user?.email ?? '',
    hiringTimeline: [],
    referralDuration: '',
    linkedinUrl: '',
    githubUrl: '',
  }), [user?.id, student.name, user?.email])
  const ME = professionals.find((p) => p.id === user?.id) ?? fallback
  if (loading) return <DashboardSkeleton />
  const PRO_USER = { name: ME.name || 'User', designation: ME.designation, company: ME.company, email: ME.email || '', location: ME.location || '', gradient: ME.gradient }
  const inbox = ME ? requests.filter((r) => r.professionalId === ME.id) : []
  const pending = inbox.filter((r) => r.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <Card className="overflow-hidden border border-border bg-card shadow-soft">
          <CardContent className="relative p-4 sm:p-5">
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <GAvatar name={PRO_USER.name} gradient={ME.gradient} className="h-12 w-12 text-base" ring />
                <div>
                  <div className="text-[13px] text-muted-foreground">{PRO_USER.designation} · {PRO_USER.company}</div>
                  <h1 className="font-display text-[28px] font-bold leading-tight text-foreground">Welcome back, {(ME.name || 'User').split(' ')[0]}</h1>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-end">
        <DateRangeSelector value={range} onChange={setRange} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
        <StatCard icon={Inbox} label="Pending requests" value={pending.length} delta={pending.length} deltaLabel="pending" delay={0.05} href="/professional/referrals" />
        <StatCard icon={CheckCheck} label="Referrals this month" value={ME.usedThisMonth} delta={ME.usedThisMonth} deltaLabel="this month" delay={0.1} href="/professional/referrals" />
        <StatCard icon={TrendingUp} label="Acceptance rate" value={`${ME.successRate}%`} delta={ME.successRate} deltaLabel="% rate" delay={0.15} href="/analytics" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 items-stretch">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Analytics */}
          <Link to="/analytics" className="block">
          <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15">
            <CardHeader className="">
              <div>
                <CardTitle className="text-[15px] font-semibold">Referral analytics</CardTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">Requests received vs accepted · last 6 months</p>
              </div>
              <span data-slot="card-action" className="shrink-0"><Button variant="ghost" size="sm" className="text-primary">Details <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></span>
            </CardHeader>
            <CardContent className="pt-2">
              {hasData(proMonthly) ? (
              <LazyResponsiveContainer width="100%" height={220}>
                <LazyAreaChart data={proMonthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRef" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4F7CFF" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#4F7CFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <LazyCartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <LazyXAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <LazyYAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <LazyTooltip content={<ChartTooltip />} />
                  <LazyArea type="monotone" dataKey="referrals" stroke="#4F7CFF" strokeWidth={2} fill="url(#gRef)" name="Received" />
                  <LazyArea type="monotone" dataKey="accepted" stroke="#22C55E" strokeWidth={2} fill="transparent" name="Accepted" />
                </LazyAreaChart>
              </LazyResponsiveContainer>
              ) : <EmptyChart />}
            </CardContent>
          </Card>
          </Link>

          {/* Pending requests */}
          <Link to="/professional/referrals" className="block">
          <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15">
            <CardHeader className="">
                <CardTitle className="text-[15px] font-semibold">Recent requests</CardTitle>
              <span data-slot="card-action" className="shrink-0"><Button variant="ghost" size="sm" className="text-primary">Open inbox <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></span>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {inbox.slice(0, 4).map((r) => (
                <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
                  <GAvatar name={r.student} gradient="from-slate-500 to-slate-700" className="h-10 w-10 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold">{r.student}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-muted-foreground">{r.role} · {r.date}</div>
                    <p className="mt-1 line-clamp-1 text-[13px] text-muted-foreground">"{r.note}"</p>
                  </div>
                  {r.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button size="sm" className="rounded-lg bg-emerald-600 hover:bg-emerald-700" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRequestStatus(r.id, 'accepted'); toast.success(`Accepted ${r.student}'s request`) }}>
                        <CheckCheck className="mr-1 h-3.5 w-3.5" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRequestStatus(r.id, 'rejected'); toast('Request declined') }}>
                        <XCircle className="mr-1 h-3.5 w-3.5" /> Decline
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={async () => { const convId = await startConversation(r.requesterId || r.professionalId); if (convId) navigate(`${getMessagesPath(role)}?conversation=${convId}`) }}>
                      <MessageSquare className="mr-1 h-3.5 w-3.5" /> Message
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          </Link>

          {/* Discover Job Seekers */}
          <Link to="/professional/talent" className="block">
          <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15">
            <CardHeader className="">
              <CardTitle className="text-[15px] font-semibold">Discover Job Seekers</CardTitle>
              <span data-slot="card-action" className="shrink-0"><Button variant="ghost" size="sm" className="text-primary">Browse all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></span>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {candidates.filter((c) => c.source === 'Open to work' && c.id !== user?.id).slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/20 cursor-pointer" onClick={() => navigate(`/job-seekers/${c.id}`)}>
                  <GAvatar name={c.name} gradient={c.gradient} className="h-9 w-9 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-foreground">{c.name}</div>
                    <div className="text-[13px] text-muted-foreground">{c.role} · {c.exp}y exp</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.skills.slice(0, 3).map((s) => <span key={s} className="rounded-full bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">{s}</span>)}
                    </div>
                  </div>
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
              {candidates.filter((c) => c.source === 'Open to work' && c.id !== user?.id).length === 0 && (
                <p className="py-2 text-center text-[13px] text-muted-foreground">No open-to-work seekers yet. Check back soon.</p>
              )}
            </CardContent>
          </Card>
          </Link>

          {/* Response time */}
          <Link to="/analytics" className="block flex-1">
          <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15 h-full">
            <CardHeader className="">
              <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4 text-primary" /> Response time this week</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {hasData(proResponseTime) ? (
              <LazyResponsiveContainer width="100%" height={160}>
                <LazyBarChart data={proResponseTime} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <LazyCartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <LazyXAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <LazyYAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <LazyTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <LazyBar dataKey="hours" radius={[5, 5, 0, 0]} fill="#4F7CFF" name="Hours to reply" />
                </LazyBarChart>
              </LazyResponsiveContainer>
              ) : <EmptyChart />}
            </CardContent>
          </Card>
          </Link>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Company info */}
          <Link to="/professional/profile" className="block">
          <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15">
            <CardHeader className=""><CardTitle className="text-[15px] font-semibold">Your company</CardTitle></CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center gap-3">
                <CompanyChip name={ME.company} className="h-10 w-10 rounded-lg text-sm" />
                <div>
                  <div className="text-[14px] font-semibold text-foreground">{ME.company}</div>
                  <div className="text-[13px] text-muted-foreground">{ME.industry || 'Employer'}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Open positions you can refer to</div>
                {ME.openPositions.map((p) => (
                  <div key={p} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-[14px] text-foreground">
                    {p} <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </Link>

          {/* Messages preview */}
          <Link to={getMessagesPath(role)} className="block flex-1">
          <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15 h-full">
            <CardHeader className="">
              <CardTitle className="text-[15px] font-semibold">Messages</CardTitle>
              <span data-slot="card-action" className="shrink-0"><Button variant="ghost" size="sm" className="text-primary">Open</Button></span>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-2">
              {conversations.slice(0, 3).map((c) => (
                <Link to={`${getMessagesPath(role)}?conversation=${c.id}`} key={c.id} className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/20">
                  <GAvatar name={c.name} gradient={c.gradient} className="h-8 w-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-foreground">{c.name}</div>
                    <div className="truncate text-[13px] text-muted-foreground">{c.lastMessage}</div>
                  </div>
                  {c.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{c.unread}</span>}
                </Link>
              ))}
            </CardContent>
          </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
