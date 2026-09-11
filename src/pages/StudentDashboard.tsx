import { useState, useMemo, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  ArrowRight, Briefcase, CheckCircle2, ChevronRight, Circle,
  Send, TrendingUp, Users, Eye, Upload, Shield, UserPlus,
} from 'lucide-react'
import { LazyArea, LazyAreaChart, LazyCartesianGrid, LazyResponsiveContainer, LazyTooltip, LazyXAxis, LazyYAxis } from '@/components/Charts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataCard } from '@/components/ui/card-primitives'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { ScrollArea } from '@/components/ui/scroll-area'
import { GAvatar, StatusBadge, ProgressRing } from '@/components/ui-kit'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { DateRangeSelector, type DateRange, getPresetRange } from '@/components/analytics/DateRangeSelector'
import { EmptyChart } from '@/components/analytics/EmptyChart'
import { useFilteredStudentWeekly, hasData } from '@/hooks/useAnalytics'
import { ROLE_ROUTE, getRoleFromPath, profileUrl } from '@/data/constants'
import { recommendJobsForCandidate, type JobRecommendation } from '@/lib/v2/matching'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 21) return 'Good evening'
  return 'Night owl'
}

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

export default function StudentDashboard() {
  const { visibleProfessionals: professionals, student, bookmarks, requests, activity, loading } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const prefix = ROLE_ROUTE[getRoleFromPath(pathname)]
  const [range, setRange] = useState<DateRange>(() => {
    const { from, to } = getPresetRange('6m')
    return { preset: '6m', from, to }
  })
  const [jobRecs, setJobRecs] = useState<JobRecommendation[]>([])

  useEffect(() => {
    if (!user?.id) return
    recommendJobsForCandidate(user.id, 5).then(setJobRecs).catch(() => {})
  }, [user?.id])

  const profilePct = useMemo(() => {
    let score = 0
    if (student.name) score += 20
    if ((student.experience?.length ?? 0) > 0) score += 20
    if ((student.skills?.length ?? 0) > 0) score += 20
    if (student.resumeFile?.name) score += 20
    if (student.headline) score += 20
    return score
  }, [student])

  const studentWeekly = useFilteredStudentWeekly(range)
  const myRequests = requests.filter((r) => r.requesterId === user?.id)
  const totalRequests = myRequests.length
  const acceptedCount = myRequests.filter((r) => r.status === 'accepted').length
  const acceptanceRate = totalRequests > 0 ? Math.round((acceptedCount / totalRequests) * 100) : 0
  const activeCount = myRequests.filter((r) => r.status === 'requested' || r.status === 'under_review').length
  const profileViews = Math.floor(Math.random() * 50) + 10
  const saved = professionals.filter((p) => bookmarks.includes(p.id))

  const acceptanceTrend = useMemo(() => {
    if (totalRequests < 2) return undefined
    const half = Math.floor(totalRequests / 2)
    const recentAccepted = myRequests.slice(-half).filter((r) => r.status === 'accepted').length
    const olderAccepted = myRequests.slice(0, half).filter((r) => r.status === 'accepted').length
    const recentRate = recentAccepted / Math.max(1, half)
    const olderRate = olderAccepted / Math.max(1, half)
    if (olderRate === 0 && recentRate > 0) return { value: 100, direction: 'up' as const }
    if (olderRate === 0) return undefined
    const diff = Math.round(((recentRate - olderRate) / olderRate) * 100)
    if (diff === 0) return undefined
    return { value: Math.abs(diff), direction: diff > 0 ? 'up' as const : 'down' as const }
  }, [myRequests, totalRequests])

  const messages = useMemo(() => {
    if (profilePct <= 25) return { greeting: 'Welcome to DirectRefer', sub: 'Complete your profile to unlock referrals.' }
    if (profilePct <= 50) return { greeting: 'Build your profile', sub: 'A stronger profile means more referral opportunities.' }
    if (profilePct <= 79) return { greeting: 'Almost there', sub: 'Add a few more details to reach 80% and unlock all features.' }
    return { greeting: `${(student.name || 'User').split(' ')[0]}, your referral pipeline is ${activeCount > 0 ? 'active' : 'ready to go'}`, sub: `${getGreeting()}. Here's your overview.` }
  }, [profilePct, student.name, activeCount])

  const profileChecklist = useMemo(() => [
    { label: 'Basic Information', done: !!student.name },
    { label: 'Work Experience', done: (student.experience?.length ?? 0) > 0 },
    { label: 'Skills & Expertise', done: (student.skills?.length ?? 0) > 0 },
    { label: 'Resume', done: !!student.resumeFile?.name },
    { label: 'About You', done: !!student.headline },
  ], [student])

  const missingItem = profileChecklist.find((i) => !i.done)

  if (loading) return <DashboardSkeleton />

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NEW USER — Profile 0–25%
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (profilePct <= 25) {
    return (
      <div className="space-y-6">
        <div
          className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
          style={{ background: 'var(--gradient-welcome)' }}
        >
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {messages.greeting}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{messages.sub}</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-2 w-48 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.max(profilePct, 8)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{profilePct}%</span>
              </div>
            </div>
            <Button asChild className="rounded-full bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200 w-fit">
              <Link to="/job-seeker/profile">
                Continue Profile <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {[
                  { icon: Upload, label: 'Upload Resume', desc: 'Show employers your experience', href: '/job-seeker/profile' },
                  { icon: Briefcase, label: 'Add Experience', desc: 'Detail your work history', href: '/job-seeker/profile' },
                  { icon: Shield, label: 'Verify Identity', desc: 'Build trust with referrals', href: '/job-seeker/profile' },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={() => navigate(a.href)}
                    className="group flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{a.label}</div>
                      <div className="text-xs text-muted-foreground">{a.desc}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold">Why Complete Your Profile?</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-3">
                {[
                  'Get matched with relevant professionals',
                  'Stand out with a verified profile',
                  'Receive personalized job recommendations',
                  'Increase your referral acceptance rate',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold">Browse Jobs</CardTitle>
              <span data-slot="card-action" className="shrink-0">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary/70" asChild>
                  <Link to="/job-seeker/browse-jobs">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </span>
            </CardHeader>
            <CardContent className="pt-0">
              {jobRecs.length > 0 ? (
                <div className="space-y-2">
                  {jobRecs.slice(0, 3).map((j) => (
                    <Link
                      to={`/job-seeker/job/${j.job_id}`}
                      key={j.job_id}
                      className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">{j.title}</div>
                        <div className="text-xs text-muted-foreground">{j.company}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-primary">{j.score}%</div>
                        <div className="text-[10px] text-muted-foreground">match</div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Briefcase}
                  title="No jobs yet"
                  description="Complete your profile to see personalized job recommendations."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PARTIAL USER — Profile 26–79%
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (profilePct < 80) {
    const nextStep = missingItem
      ? `Add ${missingItem.label.toLowerCase()} to reach ${Math.min(profilePct + 20, 100)}%.`
      : 'Almost there!'

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card px-5 py-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ProgressRing value={profilePct} size={40} stroke={3} />
              <div>
                <span className="text-sm font-medium text-foreground">Profile {profilePct}% complete.</span>
                <span className="text-sm text-muted-foreground ml-1.5">{nextStep}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link to="/job-seeker/profile">Continue <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={Send}
            label="Referrals sent"
            value={totalRequests}
            trend={totalRequests > 0 ? { value: Math.round((totalRequests / Math.max(1, totalRequests + 2)) * 100), direction: 'up' } : undefined}
            emptyState={{ message: 'Send your first referral request to get started.', action: { label: 'Find professionals', onClick: () => navigate('/job-seeker/professionals') } }}
          />
          <StatCard
            icon={TrendingUp}
            label="Acceptance rate"
            value={totalRequests > 0 ? `${acceptanceRate}%` : '0%'}
            trend={acceptanceTrend}
            emptyState={{ message: 'Your acceptance rate will appear after your first referral.', action: { label: 'Browse professionals', onClick: () => navigate('/job-seeker/professionals') } }}
          />
          <StatCard
            icon={Users}
            label="Active referrals"
            value={activeCount}
            emptyState={{ message: 'No active referrals yet. Send a request to get the ball rolling.', action: { label: 'Start browsing', onClick: () => navigate('/job-seeker/professionals') } }}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="flex flex-col gap-5 lg:col-span-2">
            <Link to={`${prefix}/analytics`} className="block">
              <Card className="cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
                <CardHeader className="pb-2">
                  <div>
                    <CardTitle className="text-[15px] font-semibold">Application momentum</CardTitle>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">Applications & referrals · last 8 weeks</p>
                  </div>
                  <span data-slot="card-action" className="shrink-0">
                    <Button variant="ghost" size="sm" className="h-9 text-xs text-primary hover:text-primary/70">
                      Full analytics <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </span>
                </CardHeader>
                <CardContent className="pt-0">
                  {hasData(studentWeekly) ? (
                    <div className="h-[220px]">
                      <LazyResponsiveContainer width="100%" height={220}>
                        <LazyAreaChart data={studentWeekly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gApp2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gInt2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity={0.10} />
                              <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <LazyCartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <LazyXAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                          <LazyYAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                          <LazyTooltip content={<ChartTooltip />} />
                          <LazyArea type="monotone" dataKey="applications" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gApp2)" name="Referrals sent" />
                          <LazyArea type="monotone" dataKey="responses" stroke="hsl(160 84% 39%)" strokeWidth={2} fill="url(#gInt2)" name="Referrals accepted" />
                        </LazyAreaChart>
                      </LazyResponsiveContainer>
                    </div>
                  ) : <EmptyChart />}
                </CardContent>
              </Card>
            </Link>

            <Link to="/job-seeker/applications" className="block">
              <Card className="cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[15px] font-semibold">Referral requests</CardTitle>
                  <span data-slot="card-action" className="shrink-0">
                    <Button variant="ghost" size="sm" className="h-9 text-xs text-primary hover:text-primary/70">
                      View all <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </span>
                </CardHeader>
                <CardContent className="pt-0">
                  {myRequests.length === 0 ? (
                    <EmptyState
                      icon={Send}
                      title="No referrals yet"
                      description="Browse verified professionals and send your first request."
                      action={{ label: 'Find professionals', href: '/job-seeker/professionals' }}
                    />
                  ) : (
                    <div className="space-y-2">
                      {myRequests.slice(0, 4).map((r) => {
                        const p = professionals.find((x) => x.id === r.professionalId)
                        if (!p) return null
                        return (
                          <Link to={profileUrl('professional', p.id, p.slug)} key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-border/80 hover:bg-card">
                            <GAvatar name={p.name} color={p.gradient} className="h-9 w-9 text-[10px]" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-[14px] font-medium text-foreground">{p.name}</span>
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

            {jobRecs.length > 0 && (
              <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[15px] font-semibold">Recommended jobs</CardTitle>
                  <span data-slot="card-action" className="shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary/70" asChild>
                      <Link to="/job-seeker/browse-jobs">Browse all <ArrowRight className="ml-1 h-3 w-3" /></Link>
                    </Button>
                  </span>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {jobRecs.slice(0, 3).map((j) => (
                      <Link to={`/job-seeker/job/${j.job_id}`} key={j.job_id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-border/80 hover:bg-card">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-medium text-foreground truncate">{j.title}</div>
                          <div className="text-[13px] text-muted-foreground">{j.company} · {j.location}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {j.matching_skills.slice(0, 3).map((s) => (
                              <span key={s} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{s}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-primary">{j.score}%</div>
                          <div className="text-[10px] text-muted-foreground">match</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <Link to="/job-seeker/profile" className="block">
              <Card className="cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[15px] font-semibold">Profile Completion</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <ProgressRing value={profilePct} size={64} stroke={4} />
                    </div>
                    <div>
                      <div className="text-[14px] font-medium text-foreground">
                        {profilePct >= 70 ? 'Great job!' : 'Almost there'}
                      </div>
                      <div className="text-[13px] text-muted-foreground">
                        {profilePct >= 70
                          ? "You're almost there. Complete the remaining sections to boost your visibility."
                          : 'Complete your profile to increase referral success.'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {profileChecklist.map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/15">
                        <div className="flex items-center gap-2.5 text-sm">
                          {item.done ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
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

            <Link to={`${prefix}/activity`} className="block flex-1">
              <Card className="flex h-full flex-col cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTIVE USER — Profile 80%+
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-[28px] font-bold leading-tight text-foreground">
            {messages.greeting}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{messages.sub}</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DataCard
          title="Referrals Sent"
          value={totalRequests}
          subtitle={`${activeCount} active`}
          trend={totalRequests > 0 ? { value: Math.round((totalRequests / Math.max(1, totalRequests + 2)) * 100), direction: 'up' } : undefined}
          icon={<Send className="h-5 w-5" />}
        />
        <DataCard
          title="Acceptance Rate"
          value={`${acceptanceRate}%`}
          subtitle={`${acceptedCount} accepted`}
          trend={acceptanceTrend}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <DataCard
          title="Active Referrals"
          value={activeCount}
          subtitle="awaiting response"
          icon={<Users className="h-5 w-5" />}
        />
        <DataCard
          title="Profile Views"
          value={profileViews}
          subtitle="this month"
          trend={{ value: 12, direction: 'up' }}
          icon={<Eye className="h-5 w-5" />}
        />
      </div>

      <Link to="/job-seeker/professionals" className="block">
        <Card className="group cursor-pointer border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary/25">
              <UserPlus className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold text-foreground">Find Professionals Who Can Refer You</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Browse verified professionals at top companies</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
          </CardContent>
        </Card>
      </Link>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Link to="/job-seeker/applications" className="block">
            <Card className="cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[15px] font-semibold">Your Referrals</CardTitle>
                <span data-slot="card-action" className="shrink-0">
                  <Button variant="ghost" size="sm" className="h-9 text-xs text-primary hover:text-primary/70">
                    View all <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </span>
              </CardHeader>
              <CardContent className="pt-0">
                {myRequests.length === 0 ? (
                  <EmptyState
                    icon={Send}
                    title="No referrals yet"
                    description="Start your referral journey by browsing verified professionals."
                    action={{ label: 'Find professionals', href: '/job-seeker/professionals' }}
                  />
                ) : (
                  <div className="space-y-2">
                    {myRequests.slice(0, 5).map((r) => {
                      const p = professionals.find((x) => x.id === r.professionalId)
                      if (!p) return null
                      return (
                        <Link to={profileUrl('professional', p.id, p.slug)} key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-border/80 hover:bg-card">
                          <GAvatar name={p.name} color={p.gradient} className="h-9 w-9 text-[10px]" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-[14px] font-medium text-foreground">{p.name}</span>
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

          <Link to={`${prefix}/analytics`} className="block">
            <Card className="cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
              <CardHeader className="pb-2">
                <div>
                  <CardTitle className="text-[15px] font-semibold">Application momentum</CardTitle>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">Applications & referrals · last 8 weeks</p>
                </div>
                <span data-slot="card-action" className="shrink-0">
                  <Button variant="ghost" size="sm" className="h-9 text-xs text-primary hover:text-primary/70">
                    Full analytics <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </span>
              </CardHeader>
              <CardContent className="pt-0">
                {hasData(studentWeekly) ? (
                  <div className="h-[220px]">
                    <LazyResponsiveContainer width="100%" height={220}>
                      <LazyAreaChart data={studentWeekly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gApp3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gInt3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity={0.10} />
                            <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <LazyCartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <LazyXAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <LazyYAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <LazyTooltip content={<ChartTooltip />} />
                        <LazyArea type="monotone" dataKey="applications" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gApp3)" name="Referrals sent" />
                        <LazyArea type="monotone" dataKey="responses" stroke="hsl(160 84% 39%)" strokeWidth={2} fill="url(#gInt3)" name="Referrals accepted" />
                      </LazyAreaChart>
                    </LazyResponsiveContainer>
                  </div>
                ) : <EmptyChart />}
              </CardContent>
            </Card>
          </Link>

          {jobRecs.length > 0 && (
            <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[15px] font-semibold">Recommended jobs</CardTitle>
                <span data-slot="card-action" className="shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary/70" asChild>
                    <Link to="/job-seeker/browse-jobs">Browse all <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </span>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {jobRecs.slice(0, 3).map((j) => (
                    <Link to={`/job-seeker/job/${j.job_id}`} key={j.job_id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-border/80 hover:bg-card">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium text-foreground truncate">{j.title}</div>
                        <div className="text-[13px] text-muted-foreground">{j.company} · {j.location}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {j.matching_skills.slice(0, 3).map((s) => (
                            <span key={s} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-primary">{j.score}%</div>
                        <div className="text-[10px] text-muted-foreground">match</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {saved.length > 0 && (
            <Link to={`${prefix}/bookmarks`} className="block">
              <Card className="cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[15px] font-semibold">Saved professionals</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {saved.slice(0, 4).map((p) => (
                      <Link to={profileUrl('professional', p.id, p.slug)} key={p.id} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/15">
                        <GAvatar name={p.name} color={p.gradient} className="h-8 w-8 text-[10px]" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{p.company}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          <Link to={`${prefix}/activity`} className="block flex-1">
            <Card className="flex h-full flex-col cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
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
