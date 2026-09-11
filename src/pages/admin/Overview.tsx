import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import {
  Users,
  Briefcase,
  Flag,
  AlertTriangle,
  Megaphone,
  RefreshCw,
  Activity,
  Shield,
  FileWarning,
  ClipboardCheck,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Heart,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataCard } from '@/components/ui/card-primitives'
import { EmptyState } from '@/components/ui/empty-state'
import { RECRUITER_VISIBLE } from '@/data/constants'
import {
  fetchAllUsersFull,
  fetchPlatformAnalytics,
  fetchReportsWithUsers,
  fetchAnnouncements,
  fetchSystemHealth,
  type AdminUserFull,
  type PlatformAnalytics,
  type ReportWithUsers,
  type Announcement,
  type SystemHealth,
} from '@/lib/db'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

function HealthDot({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const colors = {
    healthy: 'bg-emerald-500 shadow-emerald-500/40',
    degraded: 'bg-amber-500 shadow-amber-500/40',
    down: 'bg-red-500 shadow-red-500/40',
  }
  return (
    <span className={cn('relative flex h-2.5 w-2.5 rounded-full shadow-lg', colors[status])}>
      <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', colors[status])} />
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', colors[status])} />
    </span>
  )
}

function MiniBarChart({ data, maxVal }: { data: number[]; maxVal: number }) {
  return (
    <div className="flex items-end gap-[3px] h-10">
      {data.map((v, i) => (
        <motion.div
          key={i}
          className="w-full rounded-sm bg-primary/60 min-h-[2px]"
          initial={{ height: 0 }}
          animate={{ height: `${maxVal > 0 ? (v / maxVal) * 100 : 0}%` }}
          transition={{ duration: 0.5, delay: i * 0.04 }}
        />
      ))}
    </div>
  )
}

function HorizontalFunnelBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export default function AdminOverview() {
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [flaggedAccounts, setFlaggedAccounts] = useState<ReportWithUsers[]>([])
  const [allUsers, setAllUsers] = useState<AdminUserFull[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  const loadData = useCallback(async () => {
    try {
      const [analyticsData, healthData, flaggedData, usersData, announcementsData] = await Promise.allSettled([
        fetchPlatformAnalytics(),
        fetchSystemHealth(),
        fetchReportsWithUsers(),
        fetchAllUsersFull(),
        fetchAnnouncements(),
      ])
      if (analyticsData.status === 'fulfilled') setAnalytics(analyticsData.value)
      if (healthData.status === 'fulfilled') setSystemHealth(healthData.value)
      if (flaggedData.status === 'fulfilled') setFlaggedAccounts(flaggedData.value)
      if (usersData.status === 'fulfilled') setAllUsers(usersData.value)
      if (announcementsData.status === 'fulfilled') setAnnouncements(announcementsData.value)
    } catch {
      toast.error('Failed to load dashboard data')
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const totalUsers = allUsers.length
  const studentCount = analytics?.usersByRole?.find(r => r.role === 'student')?.count ?? 0
  const professionalCount = analytics?.usersByRole?.find(r => r.role === 'professional')?.count ?? 0
  const recruiterCount = analytics?.usersByRole?.find(r => r.role === 'recruiter')?.count ?? 0
  const inactiveUsers = allUsers.filter(u => u.daysInactive >= 180)
  const activeAnnouncements = announcements.filter(a => a.is_active)

  const referralsSent = analytics?.totalReferrals ?? 0
  const referralsAccepted = analytics?.conversionRate ?? 0
  const conversionRate = referralsSent > 0 ? Math.round((referralsAccepted / referralsSent) * 100) : 0

  const healthScore = systemHealth
    ? systemHealth.criticalErrors24h > 0
      ? 45
      : systemHealth.apiResponseTime > 3000
        ? 60
        : systemHealth.apiResponseTime > 1500
          ? 75
          : systemHealth.errors24h > 10
            ? 82
            : 98
    : null

  const healthStatus: 'healthy' | 'degraded' | 'down' =
    systemHealth
      ? systemHealth.criticalErrors24h > 0 || systemHealth.apiResponseTime > 3000
        ? 'down'
        : systemHealth.apiResponseTime > 1500 || systemHealth.errors24h > 10
          ? 'degraded'
          : 'healthy'
      : 'degraded'

  const weeklyData = analytics?.weeklySignups ?? []
  const maxWeekly = Math.max(...weeklyData.map(w => w.count), 1)

  const pendingApprovals = flaggedAccounts.length
  const pendingDisputes = 0
  const pendingReports = flaggedAccounts.filter(r => r.status === 'pending').length
  const screeningReviews = flaggedAccounts.length

  const recentErrors = systemHealth?.recentErrors ?? []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Platform operations, metrics, and system health
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={loadData}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Hero Stat Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DataCard
          title="Total Users"
          value={totalUsers}
          subtitle={`${studentCount} seekers · ${professionalCount} pros${RECRUITER_VISIBLE ? ` · ${recruiterCount} recruiters` : ''}`}
          icon={<Users className="h-5 w-5" />}
          trend={{ value: analytics?.activeUsersThisWeek ?? 0, direction: 'up', }}
        />
        <DataCard
          title="Active Referrals"
          value={referralsSent}
          subtitle={`${referralsAccepted} accepted · ${conversionRate}% conversion`}
          icon={<Briefcase className="h-5 w-5" />}
        />
        <DataCard
          title="Pending Approvals"
          value={pendingApprovals}
          subtitle={`${flaggedAccounts.length} flagged accounts awaiting review`}
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
        <DataCard
          title="Platform Health"
          value={healthScore !== null ? `${healthScore}%` : '—'}
          subtitle={
            healthStatus === 'healthy'
              ? 'All systems operational'
              : healthStatus === 'degraded'
                ? 'Minor issues detected'
                : 'Critical issues found'
          }
          icon={<Heart className="h-5 w-5" />}
          className={
            healthStatus === 'healthy'
              ? 'border-emerald-500/20'
              : healthStatus === 'degraded'
                ? 'border-amber-500/20'
                : 'border-red-500/20'
          }
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Growth (line-like mini chart) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              User Growth
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {weeklyData.length > 0 ? (
              <div className="space-y-3">
                <MiniBarChart data={weeklyData.map(w => w.count)} maxVal={maxWeekly} />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{weeklyData[0]?.week ?? ''}</span>
                  <span>{weeklyData[weeklyData.length - 1]?.week ?? ''}</span>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Activity}
                title="No growth data"
                description="User signups will appear here once data is available."
              />
            )}
          </CardContent>
        </Card>

        {/* Referral Activity (bar chart) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Referral Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {analytics?.referralStatusBreakdown && analytics.referralStatusBreakdown.length > 0 ? (
              <div className="space-y-2.5">
                {analytics.referralStatusBreakdown.map((item) => {
                  const maxRef = Math.max(...analytics.referralStatusBreakdown.map(s => s.count), 1)
                  return (
                    <div key={item.status} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{item.status}</span>
                        <span className="font-medium tabular-nums">{item.count}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.count / maxRef) * 100}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={Briefcase}
                title="No referral data"
                description="Referral activity breakdown will appear here."
              />
            )}
          </CardContent>
        </Card>

        {/* Referral Funnel (horizontal bar) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              Referral Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <HorizontalFunnelBar
              label="Sent"
              value={referralsSent}
              total={referralsSent || 1}
              color="bg-primary"
            />
            <HorizontalFunnelBar
              label="Accepted"
              value={referralsAccepted}
              total={referralsSent || 1}
              color="bg-emerald-500"
            />
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conversion Rate</span>
                <span className="text-lg font-bold tabular-nums">{conversionRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Actions */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-4">Pending Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: 'Approvals',
              count: pendingApprovals,
              icon: ClipboardCheck,
              href: '/admin/approvals',
              color: 'text-blue-500',
              bg: 'bg-blue-500/10',
            },
            {
              label: 'Disputes',
              count: pendingDisputes,
              icon: Shield,
              href: '/admin/moderation',
              color: 'text-orange-500',
              bg: 'bg-orange-500/10',
            },
            {
              label: 'Reports',
              count: pendingReports,
              icon: FileWarning,
              href: '/admin/moderation',
              color: 'text-rose-500',
              bg: 'bg-rose-500/10',
            },
            {
              label: 'Screening Reviews',
              count: screeningReviews,
              icon: ClipboardCheck,
              href: '/admin/screening',
              color: 'text-violet-500',
              bg: 'bg-violet-500/10',
            },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.href)}
              className="group"
            >
              <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('rounded-lg p-2.5', action.bg)}>
                        <action.icon className={cn('h-5 w-5', action.color)} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-muted-foreground">{action.label}</p>
                        <p className="text-2xl font-bold tabular-nums">{action.count}</p>
                      </div>
                    </div>
                    <Badge
                      variant={action.count > 0 ? 'default' : 'outline'}
                      className={cn(
                        'text-xs tabular-nums',
                        action.count > 0 ? '' : 'text-muted-foreground'
                      )}
                    >
                      {action.count}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    View details <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>

      {/* System Health */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-4">System Health</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Uptime</p>
                  <div className="flex items-center gap-2">
                    <HealthDot status={healthStatus} />
                    <p className="text-lg font-bold">
                      {systemHealth
                        ? healthStatus === 'healthy'
                          ? '100%'
                          : healthStatus === 'degraded'
                            ? '~99%'
                            : '~95%'
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  'rounded-lg p-2.5',
                  healthStatus === 'healthy'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : healthStatus === 'degraded'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-red-500/10 text-red-500'
                )}>
                  {healthStatus === 'healthy' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Response Time</p>
                  <p className="text-lg font-bold tabular-nums">
                    {systemHealth ? `${systemHealth.apiResponseTime}ms` : '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    DB ping: {systemHealth ? `${systemHealth.dbPing}ms` : '—'}
                  </p>
                </div>
                <div className={cn(
                  'rounded-lg p-2.5',
                  systemHealth
                    ? systemHealth.apiResponseTime > 3000
                      ? 'bg-red-500/10 text-red-500'
                      : systemHealth.apiResponseTime > 1500
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-muted text-muted-foreground'
                )}>
                  <Zap className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Error Rate (24h)</p>
                  <p className="text-lg font-bold tabular-nums">
                    {systemHealth ? systemHealth.errors24h : '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {systemHealth?.criticalErrors24h ?? 0} critical
                  </p>
                </div>
                <div className={cn(
                  'rounded-lg p-2.5',
                  systemHealth
                    ? systemHealth.criticalErrors24h > 0
                      ? 'bg-red-500/10 text-red-500'
                      : systemHealth.errors24h > 0
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {systemHealth && systemHealth.errors24h > 0 ? (
                    <XCircle className="h-5 w-5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Requests/min</p>
                  <p className="text-lg font-bold tabular-nums">
                    {systemHealth ? systemHealth.requestsPerMinute : '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Success: {systemHealth ? `${systemHealth.successRate}%` : '—'}
                  </p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Admin Activity */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="p-0">
            {recentErrors.length > 0 ? (
              <div className="divide-y divide-border">
                {recentErrors.slice(0, 6).map((err) => (
                  <div key={err.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className={cn(
                      'rounded-lg p-2 shrink-0',
                      err.severity === 'critical'
                        ? 'bg-red-500/10 text-red-500'
                        : err.severity === 'warning'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-muted text-muted-foreground'
                    )}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{err.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{err.source}</span>
                        {err.page && (
                          <>
                            <span className="text-border">·</span>
                            <span>{err.page}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[11px]',
                          err.severity === 'critical'
                            ? 'bg-red-500/10 text-red-600 border-red-500/25'
                            : err.severity === 'warning'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/25'
                              : 'text-muted-foreground'
                        )}
                      >
                        {err.severity}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(err.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="No recent activity"
                description="System events and errors will appear here as they occur."
                className="py-12"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Quick Info Row */}
      {(flaggedAccounts.length > 0 || inactiveUsers.length > 0 || activeAnnouncements.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {flaggedAccounts.length > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Flag className="h-4 w-4 text-rose-500" />
                    <span className="text-sm font-medium">Flagged Accounts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/25">{flaggedAccounts.length}</Badge>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/admin/moderation')}>
                      Review
                    </Button>
                  </div>
                </div>
              )}
              {inactiveUsers.length > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Inactive Users (180+ days)</span>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/25">{inactiveUsers.length}</Badge>
                </div>
              )}
              {activeAnnouncements.length > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Megaphone className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Active Announcements</span>
                  </div>
                  <Badge variant="outline">{activeAnnouncements.length}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
