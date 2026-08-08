import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowRight, Briefcase, CheckCircle2, ChevronRight, Circle,
  Clock, FileUp, Flame, GraduationCap, MapPin, Send, ShieldCheck, Target, TrendingUp, Users,
} from 'lucide-react'
import { LazyArea, LazyAreaChart, LazyCartesianGrid, LazyResponsiveContainer, LazyTooltip, LazyXAxis, LazyYAxis } from '@/components/Charts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { ScrollArea } from '@/components/ui/scroll-area'
import { CompanyChip, EmptyState, GAvatar, ProgressRing, StatCard, StatusBadge } from '@/components/ui-kit'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { DateRangeSelector, type DateRange, getPresetRange } from '@/components/analytics/DateRangeSelector'
import { EmptyChart } from '@/components/analytics/EmptyChart'
import { useFilteredStudentWeekly, hasData } from '@/hooks/useAnalytics'

const RATE_LIMIT = 3

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

const QUICK_ACTIONS = [
  { icon: Send, label: 'Apply for Referral', sublabel: 'Get referred to your dream role', href: '/job-seeker/professionals' },
  { icon: FileUp, label: 'Upload Resume', sublabel: 'Keep your profile updated', href: '/job-seeker/profile' },
  { icon: Target, label: 'Improve Profile', sublabel: 'Increase your chances', href: '/job-seeker/profile' },
  { icon: GraduationCap, label: 'Learning', sublabel: 'Resources & guides', href: '/help' },
]

export default function StudentDashboard() {
  const { visibleProfessionals: professionals, student, bookmarks, referralsSentToday, requests, activity, loading } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [range, setRange] = useState<DateRange>(() => {
    const { from, to } = getPresetRange('6m')
    return { preset: '6m', from, to }
  })

  const PROFILE_CHECKLIST = useMemo(() => [
    { label: 'Basic Information', done: !!student.name },
    { label: 'Work Experience', done: (student.experience?.length ?? 0) > 0 },
    { label: 'Skills & Expertise', done: (student.skills?.length ?? 0) > 0 },
    { label: 'Resume', done: !!student.resumeFile?.name },
    { label: 'About You', done: !!student.headline },
  ], [student])

  const studentWeekly = useFilteredStudentWeekly(range)
  const myRequests = requests.filter((r) => r.requesterId === user?.id)
  const saved = professionals.filter((p) => bookmarks.includes(p.id))
  const recommended = useMemo(() => {
    return [...professionals]
      .sort((a, b) => (b.responseRate * b.successRate) - (a.responseRate * a.successRate))
      .slice(0, 3)
  }, [professionals])

  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[13px] text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · Good morning
              </div>
              <h1 className="font-display mt-0.5 text-[28px] font-bold leading-tight text-foreground">
                {(student.name || 'User').split(' ')[0]}, your referral pipeline is {myRequests.filter((r) => r.status === 'pending').length > 0 ? 'active' : 'ready to go'}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="border border-border bg-muted/30 text-[13px] text-muted-foreground hover:bg-muted/50">
                  <Briefcase className="mr-1.5 h-4 w-4" /> {myRequests.length} referrals
                </Badge>
                <Badge className="border border-border bg-muted/30 text-[13px] text-muted-foreground hover:bg-muted/50">
                  <Flame className="mr-1.5 h-4 w-4" /> {myRequests.filter((r) => r.status === 'accepted').length} accepted
                </Badge>
                <Badge className="border border-border bg-muted/30 text-[13px] text-muted-foreground hover:bg-muted/50">
                  <Clock className="mr-1.5 h-4 w-4" /> {referralsSentToday}/{RATE_LIMIT} referrals today
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-center">
                <ProgressRing value={student.profileCompletion} size={92} stroke={6} />
                <div className="mt-2 text-[13px] font-medium text-muted-foreground">Profile Strength</div>
                <div className="text-[12px] text-muted-foreground/60">{student.profileCompletion >= 70 ? 'Good' : 'Needs work'}</div>
              </div>
            </div>
          </div>
        </div>

      {/* Stats */}
      <div className="flex items-center justify-end">
        <DateRangeSelector value={range} onChange={setRange} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
        <StatCard icon={Send} label="Referrals sent" value={myRequests.length} delta={myRequests.length > 0 ? Math.round((myRequests.length / Math.max(1, myRequests.length + 2)) * 100) : 0} deltaLabel="completion" delay={0.05} href="/job-seeker/applications" />
        <StatCard icon={TrendingUp} label="Acceptance rate" value={myRequests.length > 0 ? `${Math.round((myRequests.filter((r) => r.status === 'accepted').length / myRequests.length) * 100)}%` : '0%'} delta={myRequests.filter((r) => r.status === 'accepted').length} deltaLabel="accepted" delay={0.1} href="/job-seeker/applications" />
        <StatCard icon={Users} label="Active referrals" value={myRequests.filter((r) => r.status === 'pending').length} delta={myRequests.filter((r) => r.status === 'pending').length} deltaLabel="awaiting reply" delay={0.15} href="/job-seeker/applications" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.href)}
            className="group flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 text-left transition-all duration-200 hover:border-primary/15 hover:translate-y-[-1px]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <a.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium text-foreground">{a.label}</div>
              <div className="text-[13px] text-muted-foreground">{a.sublabel}</div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Application momentum chart */}
          <Link to="/analytics" className="block">
            <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15">
              <CardHeader className="pb-2">
                <div>
                  <CardTitle className="text-[15px] font-semibold">Application momentum</CardTitle>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">Applications & referrals · last 8 weeks</p>
                </div>
                <span data-slot="card-action" className="shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary/70">
                    Full analytics <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </span>
              </CardHeader>
              <CardContent className="pt-0">
                {hasData(studentWeekly) ? (
                  <LazyResponsiveContainer width="100%" height={220}>
                    <LazyAreaChart data={studentWeekly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gApp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4F7CFF" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#4F7CFF" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gInt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C5CFF" stopOpacity={0.10} />
                          <stop offset="100%" stopColor="#7C5CFF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <LazyCartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <LazyXAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <LazyYAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <LazyTooltip content={<ChartTooltip />} />
                      <LazyArea type="monotone" dataKey="applications" stroke="#4F7CFF" strokeWidth={2} fill="url(#gApp)" name="Referrals sent" />
                      <LazyArea type="monotone" dataKey="responses" stroke="#22C55E" strokeWidth={2} fill="url(#gInt)" name="Referrals accepted" />
                    </LazyAreaChart>
                  </LazyResponsiveContainer>
                ) : <EmptyChart />}
              </CardContent>
            </Card>
          </Link>

          {/* Referral requests */}
          <Link to="/job-seeker/applications" className="block">
            <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15">
              <CardHeader className="pb-2">
                <CardTitle className="text-[15px] font-semibold">Referral requests</CardTitle>
                <span data-slot="card-action" className="shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary/70">
                    View all <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </span>
              </CardHeader>
              <CardContent className="pt-0">
                {myRequests.length === 0 ? (
                  <EmptyState icon={Send} title="No referrals yet" description="Browse verified professionals and send your first request." action={<Button asChild><Link to="/job-seeker/professionals">Find professionals</Link></Button>} />
                ) : (
                  <div className="space-y-2">
                    {myRequests.slice(0, 4).map((r) => {
                      const p = professionals.find((x) => x.id === r.professionalId)
                      if (!p) return null
                      return (
                        <Link to={`/professionals/${p.id}`} key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/15 hover:bg-card">
                          <GAvatar name={p.name} gradient={p.gradient} className="h-9 w-9 text-[10px]" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-[14px] font-medium text-foreground">{p.name}</span>
                              <CompanyChip name={p.company} className="h-4 w-4 text-[7px]" />
                              <span className="hidden text-xs text-muted-foreground sm:inline">{p.company}</span>
                            </div>
                            <div className="mt-0.5 text-[13px] text-muted-foreground">{r.role} · {r.date}</div>
                          </div>
                          <StatusBadge status={r.status} />
                        </Link>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Recommended professionals */}
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold">Recommended professionals</CardTitle>
              <span data-slot="card-action" className="shrink-0">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary/70" asChild>
                   <Link to="/job-seeker/professionals">Browse all <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </span>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid flex-1 gap-4 sm:grid-cols-3">
                {recommended.map((p) => (
                  <div key={p.id} className="h-full">
                    <Link to={`/professionals/${p.id}`} className="block h-full">
                      <Card className="group h-full cursor-pointer transition-all duration-200 hover:border-primary/15 hover:bg-card">
                        <CardContent className="flex h-full flex-col p-5 text-center">
                          <div className="flex justify-center">
                            <GAvatar name={p.name} gradient={p.gradient} className="h-14 w-14 text-sm" />
                          </div>
                          <div className="mt-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="text-sm font-medium text-foreground">{p.name}</span>
                              {p.verified && <ShieldCheck className="h-3.5 w-3.5 text-[#4ADE80]" />}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{p.designation}</div>
                            <div className="text-xs text-muted-foreground/60">{p.company}</div>
                          </div>
                          <div className="mt-2.5 flex flex-col items-center gap-1 text-xs text-muted-foreground/80">
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.location}</span>
                            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {p.yearsExp}+ yrs</span>
                          </div>
                          <div className="mt-3 flex min-h-[2rem] flex-wrap items-center justify-center gap-1">
                            {p.skills.slice(0, 3).map((s) => (
                              <span key={s} className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{s}</span>
                            ))}
                            {p.skills.length > 3 && <span className="text-[10px] text-muted-foreground/50">+{p.skills.length - 3}</span>}
                          </div>
                          <div className="mt-auto pt-4">
                            <div className="mb-3 border-t border-border/50" />
                            <Button size="sm" className="w-full rounded-lg bg-gradient-to-r from-[#4F7CFF] to-[#7C5CFF] text-white hover:opacity-90" asChild>
                              <Link to={`/job-seeker/request-referral/${p.id}`}><Send className="mr-1.5 h-3.5 w-3.5" /> Request referral</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Profile completion */}
          <Link to="/job-seeker/profile" className="block">
            <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15">
              <CardHeader className="pb-2">
                <CardTitle className="text-[15px] font-semibold">Profile Completion</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <ProgressRing value={student.profileCompletion} size={64} stroke={4} />
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-foreground">
                      {student.profileCompletion >= 70 ? 'Great job!' : 'Almost there'}
                    </div>
                    <div className="text-[13px] text-muted-foreground">
                      {student.profileCompletion >= 70
                        ? "You're almost there. Complete the remaining sections to boost your visibility."
                        : 'Complete your profile to increase referral success.'}
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {PROFILE_CHECKLIST.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/15">
                      <div className="flex items-center gap-2.5 text-sm">
                        {item.done ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4ADE80]" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                        )}
                        <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Saved professionals */}
          {saved.length > 0 && (
            <Link to="/bookmarks" className="block">
              <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[15px] font-semibold">Saved professionals</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {saved.slice(0, 4).map((p) => (
                      <Link to={`/professionals/${p.id}`} key={p.id} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/15">
                        <GAvatar name={p.name} gradient={p.gradient} className="h-8 w-8 text-[10px]" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{p.company}</div>
                        </div>
                        <Badge variant="outline" className={p.openForReferrals ? 'border-[#4ADE80]/25 bg-[#4ADE80]/10 text-[#4ADE80]' : 'border-border text-muted-foreground/50'}>
                          {p.openForReferrals ? 'Open' : 'Full'}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Recent activity */}
          <Link to="/activity" className="block flex-1">
            <Card className="flex h-full flex-col shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15">
              <CardHeader className="pb-2">
                <CardTitle className="text-[15px] font-semibold">Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pt-0">
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {activity.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">No recent activity yet.</p>
                    ) : activity.slice(0, 5).map((a) => (
                      <div key={a.id} className="relative flex gap-3 pl-4">
                        <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                        <div className="min-w-0">
                          <p className="text-xs leading-snug text-foreground">{a.text}</p>
                          <span className="text-[11px] text-muted-foreground/60">{a.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
