import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Users, Briefcase, MessageSquare, Clock, TrendingUp, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { fetchPlatformAnalytics, type PlatformAnalytics } from '@/lib/db'

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }

const ROLE_COLORS: Record<string, string> = {
  student: 'bg-blue-500',
  professional: 'bg-emerald-500',
  recruiter: 'bg-purple-500',
  admin: 'bg-amber-500',
  unknown: 'bg-gray-400',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/25',
  accepted: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25',
  rejected: 'bg-rose-500/10 text-rose-600 border-rose-500/25',
  expired: 'bg-gray-500/10 text-gray-600 border-gray-500/25',
}

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchPlatformAnalytics()
      setAnalytics(data)
    } catch {
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAnalytics() }, [loadAnalytics])

  if (loading || !analytics) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="shadow-soft">
              <CardContent className="p-6">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const maxRoleCount = Math.max(...analytics.usersByRole.map((r) => r.count), 1)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <motion.div {...fadeUp} transition={{ delay: 0 }}>
          <Link to="/admin/users">
            <Card className="shadow-soft cursor-pointer transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{analytics.totalUsers}</div>
                  <div className="text-xs text-muted-foreground">Total Users</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
          <Link to="/admin/referrals">
            <Card className="shadow-soft cursor-pointer transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Target className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{analytics.totalReferrals}</div>
                  <div className="text-xs text-muted-foreground">Total Referrals</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
          <Link to="/admin/messages">
            <Card className="shadow-soft cursor-pointer transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{analytics.totalMessages}</div>
                  <div className="text-xs text-muted-foreground">Messages</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <Card className="shadow-soft cursor-default">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Briefcase className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{analytics.totalJobs}</div>
                <div className="text-xs text-muted-foreground">Jobs</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <Link to="/admin/users">
            <Card className="shadow-soft cursor-pointer transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                  <Clock className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{analytics.activeUsersThisWeek}</div>
                  <div className="text-xs text-muted-foreground">Active This Week</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
          <Link to="/admin/referrals">
            <Card className="shadow-soft cursor-pointer transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10">
                  <TrendingUp className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{analytics.referralsThisWeek}</div>
                  <div className="text-xs text-muted-foreground">Referrals This Week</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Users by Role</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-2">
              {analytics.usersByRole.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No user data</p>
              ) : (
                analytics.usersByRole.map((r) => (
                  <div key={r.role} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize font-medium">{r.role.replace('_', ' ')}</span>
                      <span className="text-muted-foreground">{r.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className={`h-full rounded-full ${ROLE_COLORS[r.role] || ROLE_COLORS.unknown}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(r.count / maxRoleCount) * 100}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Referral Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {analytics.referralStatusBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No referral data</p>
              ) : (
                analytics.referralStatusBreakdown.map((r) => (
                  <div key={r.status} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`capitalize text-xs ${STATUS_COLORS[r.status] || ''}`}>
                        {r.status}
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold">{r.count}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {analytics.conversionRate > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
          <Card className="shadow-soft border-primary/20 bg-gradient-to-br from-primary/[0.03] to-[#8B5CF6]/[0.03]">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{analytics.conversionRate}%</div>
                <div className="text-sm text-muted-foreground">Referral Conversion Rate</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
