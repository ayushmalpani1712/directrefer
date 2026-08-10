import { useState, useEffect, useCallback } from 'react'
import { Users, Briefcase, MessageSquare, Flag, AlertTriangle, Megaphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GAvatar, StatCard } from '@/components/ui-kit'
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

export default function AdminOverview() {
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

  const studentCount = analytics?.usersByRole?.find(r => r.role === 'student')?.count ?? 0
  const professionalCount = analytics?.usersByRole?.find(r => r.role === 'professional')?.count ?? 0
  const recruiterCount = analytics?.usersByRole?.find(r => r.role === 'recruiter')?.count ?? 0
  const inactiveUsers = allUsers.filter(u => u.daysInactive >= 180)
  const activeAnnouncements = announcements.filter(a => a.active)

  const referralsSent = analytics?.totalReferrals ?? 0
  const referralsAccepted = analytics?.conversionRate ?? 0
  const conversionRate = referralsSent > 0 ? Math.round((referralsAccepted / referralsSent) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">Platform Operations</h1>
        <p className="text-sm text-muted-foreground">Real-time overview of platform health, metrics, and alerts</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Active Job Seekers" value={studentCount} />
        <StatCard icon={Briefcase} label="Verified Professionals" value={professionalCount} />
        <StatCard icon={Flag} label="Pending Reports" value={flaggedAccounts.length} />
        <StatCard icon={MessageSquare} label="Active Recruiters" value={recruiterCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Platform Health</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">System Status</span>
              {systemHealth ? (
                systemHealth.apiResponseTime > 2000 ? (
                  <Badge className="bg-red-500/10 text-red-600 border-red-500/25">Degraded</Badge>
                ) : systemHealth.apiResponseTime > 1000 ? (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/25">Slow</Badge>
                ) : (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/25">Healthy</Badge>
                )
              ) : (
                <Badge className="bg-muted text-muted-foreground">Checking...</Badge>
              )}
            </div>
            {systemHealth && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">API Response</span>
                <span className="text-sm font-semibold">{systemHealth.apiResponseTime}ms</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Users</span>
              <span className="text-sm font-semibold">{analytics?.totalUsers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Jobs</span>
              <span className="text-sm font-semibold">{analytics?.totalJobs ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Alerts & Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-2">
            {flaggedAccounts.length > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-rose-500" />
                  <span className="text-sm font-medium">Flagged Accounts</span>
                </div>
                <Badge className="bg-rose-500/10 text-rose-600">{flaggedAccounts.length}</Badge>
              </div>
            )}
            {inactiveUsers.length > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Inactive Users</span>
                </div>
                <Badge className="bg-amber-500/10 text-amber-600">{inactiveUsers.length}</Badge>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Active Announcements</span>
              </div>
              <Badge variant="outline">{activeAnnouncements.length}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Recent Signups</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-2">
            {allUsers.slice(0, 4).map(u => (
              <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 rounded-lg p-1.5">
                <GAvatar name={u.name} gradient={u.gradient} className="h-8 w-8 text-[10px]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{u.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{u.role} {u.company_name && `\u00B7 ${u.company_name}`}</div>
                </div>
              </motion.div>
            ))}
            {allUsers.length === 0 && <p className="text-center py-2 text-sm text-muted-foreground">No users yet</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-base">Referral Conversion Funnel</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="flex items-center gap-8">
            <div className="flex-1 space-y-1">
              <div className="text-sm text-muted-foreground">Referrals Sent</div>
              <div className="text-2xl font-bold">{referralsSent}</div>
            </div>
            <div className="flex-1 space-y-1">
              <div className="text-sm text-muted-foreground">Referrals Accepted</div>
              <div className="text-2xl font-bold">{referralsAccepted}</div>
            </div>
            <div className="flex-1 space-y-1">
              <div className="text-sm text-muted-foreground">Conversion Rate</div>
              <div className="text-2xl font-bold">{conversionRate}%</div>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${conversionRate}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
