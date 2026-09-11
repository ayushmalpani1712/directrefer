import { useState, useMemo, useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import {
  ArrowRight, CheckCheck, ChevronRight, Clock, Copy, Inbox,
  MessageSquare, Search, Share2, XCircle,
  Users, Eye, Handshake, Briefcase,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CompanyChip, GAvatar, StatusBadge } from '@/components/ui-kit'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { DataCard } from '@/components/ui/card-primitives'
import { EmptyState } from '@/components/ui/empty-state'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { type DateRange, getPresetRange } from '@/components/analytics/DateRangeSelector'
import { EmptyChart } from '@/components/analytics/EmptyChart'
import { useFilteredProMonthly, hasData } from '@/hooks/useAnalytics'
import type { Professional } from '@/data/constants'
import { getMessagesPath, ROLE_ROUTE, getRoleFromPath } from '@/data/constants'
import { generateInviteCode, fetchUserInviteStats, getInviteUrl } from '@/lib/invites'
import { OnboardingChecklist } from '@/components/OnboardingChecklist'
import { TrustScoreHistory } from '@/components/TrustScoreHistory'
import { LazyArea, LazyAreaChart, LazyCartesianGrid, LazyResponsiveContainer, LazyTooltip, LazyXAxis, LazyYAxis } from '@/components/Charts'

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

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function CapacityMeter({ used, max }: { used: number; max: number }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0
  const remaining = Math.max(max - used, 0)

  let color = 'bg-emerald-500'
  let textColor = 'text-emerald-400'
  let bgTrack = 'bg-emerald-500/10'
  if (pct >= 80) {
    color = 'bg-red-500'
    textColor = 'text-red-400'
    bgTrack = 'bg-red-500/10'
  } else if (pct >= 60) {
    color = 'bg-amber-500'
    textColor = 'text-amber-400'
    bgTrack = 'bg-amber-500/10'
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-sm">
        <span className="text-muted-foreground">
          Monthly Capacity: <span className="font-semibold text-foreground">{used}</span> of <span className="font-semibold text-foreground">{max}</span> used
        </span>
        <span className={`font-semibold ${textColor}`}>{remaining} remaining</span>
      </div>
      <div className={`h-3 w-full overflow-hidden rounded-full ${bgTrack}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function ProfessionalDashboard() {
  const { professionals, conversations, requests, setRequestStatus, student, loading, role } = useApp()
  const { user } = useAuth()
  const { pathname } = useLocation()
  const prefix = ROLE_ROUTE[getRoleFromPath(pathname)]
  const [range] = useState<DateRange>(() => {
    const { from, to } = getPresetRange('6m')
    return { preset: '6m', from, to }
  })
  const proMonthly = useFilteredProMonthly(range)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteStats, setInviteStats] = useState<{ totalInvites: number; successfulSignups: number } | null>(null)

  useEffect(() => {
    if (!user?.id) return
    fetchUserInviteStats(user.id).then(setInviteStats)
  }, [user?.id])

  const handleGenerateInvite = async () => {
    if (!user?.id) return
    const code = await generateInviteCode(user.id)
    if (code) {
      setInviteCode(code)
      const stats = await fetchUserInviteStats(user.id)
      setInviteStats(stats)
      toast.success('Invite link generated!')
    } else {
      toast.error('Failed to generate invite link')
    }
  }

  const handleCopyInvite = async () => {
    if (!inviteCode) return
    const url = await getInviteUrl(inviteCode)
    await navigator.clipboard.writeText(url)
    toast.success('Invite link copied!')
  }

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
    gradient: 'from-[#6366F1] to-[#8B5CF6]',
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

  const inbox = ME ? requests.filter((r) => r.professionalId === ME.id) : []
  const pending = inbox.filter((r) => r.status === 'requested' || r.status === 'under_review')
  const remaining = Math.max((ME.maxPerMonth || 5) - (ME.usedThisMonth || 0), 0)
  const greeting = getGreeting()

  return (
    <div className="space-y-6">
      {/* Hero Greeting + Capacity */}
      <Card className="overflow-hidden border border-border bg-card">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <GAvatar name={ME.name || 'User'} color={ME.gradient} className="h-12 w-12 text-base" ring />
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold leading-tight text-foreground">
                  {greeting}, {(ME.name || 'User').split(' ')[0]}.
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  You have <span className="font-semibold text-foreground">{remaining}</span> referral slot{remaining !== 1 ? 's' : ''} remaining this month.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <CapacityMeter used={ME.usedThisMonth || 0} max={ME.maxPerMonth || 5} />
          </div>
        </CardContent>
      </Card>

      {/* V2 Onboarding Checklist */}
      <OnboardingChecklist />

      {/* Trust Score History */}
      {user?.id && <TrustScoreHistory userId={user.id} />}

      {/* Find Candidates CTA */}
      <Link to="/professional/talent-search" className="block">
        <Card className="cursor-pointer border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Search className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground">Find Candidates to Refer</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Browse screened candidates and submit referrals to grow your network.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-primary shrink-0" />
            </div>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by role, skill, or company..."
                  className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  readOnly
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DataCard
          title="Candidates Referred"
          value={ME.usedThisMonth || 0}
          subtitle="This month"
          icon={<Users className="h-5 w-5" />}
        />
        <DataCard
          title="Acceptance Rate"
          value={`${ME.successRate || 0}%`}
          subtitle="Overall"
          trend={ME.successRate >= 50 ? { value: ME.successRate, direction: 'up' } : { value: 100 - ME.successRate, direction: 'down' }}
          icon={<Handshake className="h-5 w-5" />}
        />
        <DataCard
          title="Hired Through Referrals"
          value={ME.referralsCompleted || 0}
          subtitle="All time"
          icon={<Briefcase className="h-5 w-5" />}
        />
        <DataCard
          title="Profile Views"
          value={ME.followers || 0}
          subtitle="Last 30 days"
          icon={<Eye className="h-5 w-5" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Pending Referrals */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Pending Referrals</CardTitle>
                {pending.length > 0 && (
                  <Link to="/professional/referrals" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center">
                    View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {pending.length > 0 ? (
                <div className="space-y-3">
                  {pending.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
                      <GAvatar name={r.student} color="#5C5D66" className="h-10 w-10 text-xs shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{r.student}</span>
                          <StatusBadge status={r.status} />
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{r.role} · {r.date}</div>
                        {r.note && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">"{r.note}"</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="rounded-lg bg-emerald-600 hover:bg-emerald-700" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRequestStatus(r.id, 'accepted'); toast.success(`Accepted ${r.student}'s request`) }}>
                          <CheckCheck className="mr-1 h-3.5 w-3.5" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRequestStatus(r.id, 'declined'); toast('Request declined') }}>
                          <XCircle className="mr-1 h-3.5 w-3.5" /> Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Inbox}
                  title="No pending referrals"
                  description="You have not referred any candidates yet. Browse screened candidates to get started."
                  action={{ label: 'Find Candidates', href: '/professional/talent-search' }}
                />
              )}
            </CardContent>
          </Card>

          {/* Analytics Chart */}
          <Link to={`${prefix}/analytics`} className="block">
            <Card className="cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
              <CardHeader>
                <div>
                  <CardTitle className="text-base font-semibold">Referral Analytics</CardTitle>
                  <p className="mt-0.5 text-sm text-muted-foreground">Requests received vs accepted · last 6 months</p>
                </div>
                <span data-slot="card-action" className="shrink-0"><Button variant="ghost" size="sm" className="h-9 text-primary">Details <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></span>
              </CardHeader>
              <CardContent className="pt-2">
                {hasData(proMonthly) ? (
                  <div className="h-[220px]">
                    <LazyResponsiveContainer width="100%" height={220}>
                      <LazyAreaChart data={proMonthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gRef" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <LazyCartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <LazyXAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <LazyYAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <LazyTooltip content={<ChartTooltip />} />
                        <LazyArea type="monotone" dataKey="referrals" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gRef)" name="Received" />
                        <LazyArea type="monotone" dataKey="accepted" stroke="hsl(160 84% 39%)" strokeWidth={2} fill="transparent" name="Accepted" />
                      </LazyAreaChart>
                    </LazyResponsiveContainer>
                  </div>
                ) : <EmptyChart />}
              </CardContent>
            </Card>
          </Link>

          {/* Recent Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {inbox.length > 0 ? (
                <div className="space-y-4">
                  {inbox.slice(0, 6).map((r) => (
                    <div key={r.id} className="flex items-start gap-3">
                      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                        r.status === 'accepted' ? 'bg-emerald-500' :
                        r.status === 'declined' ? 'bg-red-500' :
                        'bg-amber-500'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{r.student}</span>
                          <span className="text-muted-foreground"> — {r.role}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{r.date}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Clock}
                  title="No activity yet"
                  description="Your referral activity will appear here once you start referring candidates."
                  className="py-8"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Company Info */}
          <Link to="/professional/profile" className="block">
            <Card className="cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
              <CardHeader><CardTitle className="text-base font-semibold">Your Company</CardTitle></CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-center gap-3">
                  <CompanyChip name={ME.company} className="h-10 w-10 rounded-lg text-sm" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{ME.company}</div>
                    <div className="text-xs text-muted-foreground">{ME.industry || 'Employer'}</div>
                  </div>
                </div>
                {ME.openPositions.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open positions</div>
                    {ME.openPositions.map((p) => (
                      <div key={p} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
                        {p} <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Invite Friends */}
          <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
            <CardHeader><CardTitle className="text-base font-semibold">Invite Friends</CardTitle></CardHeader>
            <CardContent className="pt-2">
              <p className="text-xs text-muted-foreground mb-3">Share DirectRefer with colleagues. When they sign up and get verified, you both grow the network.</p>
              {inviteStats && (
                <div className="flex gap-4 mb-3 text-xs">
                  <span className="text-muted-foreground">Sent: <strong className="text-foreground">{inviteStats.totalInvites}</strong></span>
                  <span className="text-muted-foreground">Signups: <strong className="text-foreground">{inviteStats.successfulSignups}</strong></span>
                </div>
              )}
              {inviteCode ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={handleCopyInvite}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => {
                    const url = `${window.location.origin}/login?invite=${inviteCode}`
                    if (navigator.share) navigator.share({ title: 'Join DirectRefer', url }).catch(() => {})
                    else handleCopyInvite()
                  }}>
                    <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
                  </Button>
                </div>
              ) : (
                <Button className="h-10 rounded-lg bg-primary w-full" onClick={handleGenerateInvite}>
                  Generate invite link
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Messages Preview */}
          <Link to={getMessagesPath(role)} className="block flex-1">
            <Card className="cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm h-full">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Messages</CardTitle>
                <span data-slot="card-action" className="shrink-0"><Button variant="ghost" size="sm" className="h-9 text-primary">Open</Button></span>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-2">
                {conversations.length > 0 ? conversations.slice(0, 3).map((c) => (
                  <Link to={`${getMessagesPath(role)}?conversation=${c.id}`} key={c.id} className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/20">
                    <GAvatar name={c.name} color={c.gradient} className="h-8 w-8 text-[10px]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{c.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{c.lastMessage}</div>
                    </div>
                    {c.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{c.unread}</span>}
                  </Link>
                )) : (
                  <EmptyState
                    icon={MessageSquare}
                    title="No messages"
                    description="Start a conversation with a candidate or recruiter."
                    className="py-6"
                  />
                )}
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
