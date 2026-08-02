import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Ban, Bell, CheckCircle2, Clock, Download, FileText, Hammer, Mail,
  Shield, Trash2, Users, Activity, Eye, Settings, TrendingUp, Zap, X, Pencil, Sparkles,
  Database, RefreshCw, History, HardDrive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { GAvatar, SectionHeader, StatCard } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import { GRADIENTS } from '@/data/mock'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { fetchAllUsers, banUser, updateUserRole, fetchPlatformAnalytics, fetchReports, updateReportStatus, type AdminUser, type PlatformAnalytics, type Report } from '@/lib/db'
import { exportUsersCSV } from '@/lib/export'
import {
  runLifecyclePipeline,
  runCleanup,
  fetchRetentionPolicies,
  fetchLifecycleJobs,
  fetchSnapshots,
  type RetentionPolicy,
  type LifecycleJob,
  type SystemSnapshot,
} from '@/lib/lifecycle'

const ACTIVITY_TYPES = [
  { type: 'Login', icon: LogIn, description: 'User logged into the platform', resetsTimer: true },
  { type: 'Profile Update', icon: Settings, description: 'User updated profile information', resetsTimer: true },
  { type: 'Referral Activity', icon: FileText, description: 'Sent or received a referral', resetsTimer: true },
  { type: 'Messaging', icon: Mail, description: 'Sent or received a message', resetsTimer: true },
  { type: 'Platform Usage', icon: Zap, description: 'Any other platform interaction', resetsTimer: true },
]

const UPCOMING_DELETIONS: Array<{ id: string; name: string; role: string; company?: string; daysLeft: number; lastActivity: string; lastActivityDate: string; gradient: string }> = []

const FLAGGED_ACCOUNTS_INIT: Array<{ id: string; name: string; role: string; reason: string; reported: string; gradient: string }> = []

interface RateLimit {
  role: string
  limit: number
  window: string
  description: string
}

const RATE_LIMITS_INIT: RateLimit[] = [
  { role: 'Student', limit: 3, window: '24 hours', description: 'Maximum referral requests per day' },
  { role: 'Professional', limit: 10, window: '24 hours', description: 'Maximum referrals processed per day' },
  { role: 'Recruiter', limit: 20, window: '24 hours', description: 'Maximum candidate messages per day' },
]

function LogIn(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" x2="3" y1="12" y2="12" />
    </svg>
  )
}

export default function Admin() {
  const { professionals, jobs, demoMode, toggleDemoMode, role } = useApp()
  const { user } = useAuth()
  const loading = usePageLoading(400)

  if (role !== 'admin' && user?.email !== 'ayushmalpani479@gmail.com') {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Access Denied</h2>
          <p className="mt-2 text-sm text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }
  const [tab, setTab] = useState<'overview' | 'users' | 'flagged' | 'upcoming' | 'cleanup' | 'settings' | 'lifecycle'>('overview')
  const [inactiveUsers, setInactiveUsers] = useState<AdminUser[]>([])
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [platformAnalytics, setPlatformAnalytics] = useState<PlatformAnalytics | null>(null)
  const [upcomingDeletions, setUpcomingDeletions] = useState(UPCOMING_DELETIONS)
  const [flaggedAccounts, setFlaggedAccounts] = useState(FLAGGED_ACCOUNTS_INIT)
  const [, setReports] = useState<Report[]>([])
  const [suspendedIds, setSuspendedIds] = useState<Set<string>>(new Set())
  const [rateLimits, setRateLimits] = useState<RateLimit[]>(RATE_LIMITS_INIT)
  const [retentionDays, setRetentionDays] = useState(180)
  const [cleanupEnabled, setCleanupEnabled] = useState(true)
  const [lastCleanup, setLastCleanup] = useState('Jul 18, 2026, 3:00 AM')
  const [nextCleanup, setNextCleanup] = useState('Jul 19, 2026, 3:00 AM')
  const [notifyBefore, setNotifyBefore] = useState(30)

  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editUserRole, setEditUserRole] = useState('')
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [deleteFlagId, setDeleteFlagId] = useState<string | null>(null)
  const [rateLimitTarget, setRateLimitTarget] = useState<string | null>(null)
  const [runCleanupOpen, setRunCleanupOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [deactivateTargetId, setDeactivateTargetId] = useState<string | null>(null)

  // ── Lifecycle state ──────────────────────────────────────────
  const [lifecyclePolicies, setLifecyclePolicies] = useState<RetentionPolicy[]>([])
  const [lifecycleJobs, setLifecycleJobs] = useState<LifecycleJob[]>([])
  const [lifecycleSnapshots, setLifecycleSnapshots] = useState<SystemSnapshot[]>([])
  const [lifecycleRunning, setLifecycleRunning] = useState(false)
  const [cleanupRunning, setCleanupRunning] = useState(false)

  // ── Load real users from Supabase ──
  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    const users = await fetchAllUsers()
    setAllUsers(users)
    setInactiveUsers(users.filter((u) => u.daysInactive >= 30))
    setUsersLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'users' || tab === 'overview') loadUsers()
    if (tab === 'overview') {
      fetchPlatformAnalytics().then(setPlatformAnalytics)
    }
  }, [tab, loadUsers])

  const loadLifecycleData = useCallback(async () => {
    const [policiesRes, jobsRes, snapsRes] = await Promise.all([
      fetchRetentionPolicies(),
      fetchLifecycleJobs(20),
      fetchSnapshots(30),
    ])
    if (policiesRes.data) setLifecyclePolicies(policiesRes.data)
    if (jobsRes.data) setLifecycleJobs(jobsRes.data)
    if (snapsRes.data) setLifecycleSnapshots(snapsRes.data)
  }, [])

  useEffect(() => {
    if (tab === 'lifecycle') loadLifecycleData()
  }, [tab, loadLifecycleData])

  useEffect(() => {
    fetchReports().then((data) => {
      setReports(data)
      setFlaggedAccounts(data.map((r) => {
        const daysAgo = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86_400_000)
        return {
          id: r.id,
          name: r.target_id,
          role: 'unknown',
          reason: r.reason,
          reported: daysAgo < 1 ? 'Today' : `${daysAgo}d ago`,
          gradient: GRADIENTS[0],
        }
      }))
    })
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-7 w-32 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <Skeleton className="h-5 w-32 rounded-md" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg p-1.5">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-3 w-48 rounded-md" />
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <Skeleton className="h-5 w-32 rounded-md" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-4 w-12 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const handleRunPipeline = async () => {
    setLifecycleRunning(true)
    const result = await runLifecyclePipeline()
    setLifecycleRunning(false)
    if (result.error) {
      toast.error(`Pipeline failed: ${result.error}`)
    } else {
      toast.success(`Pipeline complete — ${result.steps.length} steps executed`)
      loadLifecycleData()
    }
  }

  const handleRunCleanupNow = async () => {
    setCleanupRunning(true)
    const result = await runCleanup()
    setCleanupRunning(false)
    if (result.error) {
      toast.error(`Cleanup failed: ${result.error}`)
    } else {
      const total = result.results.reduce((sum, r) => sum + r.rows_deleted, 0)
      toast.success(`Cleanup complete — ${total} rows removed`)
      loadLifecycleData()
    }
  }

  const handleRunCleanup = () => {
    const eligibleCount = inactiveUsers.filter((u) => u.daysInactive >= retentionDays).length
    setInactiveUsers((prev) => prev.filter((u) => u.daysInactive < retentionDays))
    setLastCleanup(new Date().toLocaleString())
    const next = new Date()
    next.setDate(next.getDate() + 1)
    next.setHours(3, 0, 0, 0)
    setNextCleanup(next.toLocaleString())
    toast.success(`Cleanup complete — ${eligibleCount} accounts deleted`)
  }

  const handleDismissDeletion = (id: string) => {
    setUpcomingDeletions((prev) => prev.filter((u) => u.id !== id))
    toast.success('Deletion cancelled — activity timer reset')
  }

  const handleSuspendAccount = async (id: string) => {
    setSuspendedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        toast.success('Account reactivated')
      } else {
        next.add(id)
        banUser(id)
        toast.success('Account suspended')
      }
      return next
    })
  }

  const startEditUser = (userId: string) => {
    const user = inactiveUsers.find((u) => u.id === userId)
    if (!user) return
    setEditingUserId(userId)
    setEditUserRole(user.role)
  }

  const saveEditUser = async () => {
    if (!editingUserId) return
    setInactiveUsers((prev) =>
      prev.map((u) => u.id === editingUserId ? { ...u, role: editUserRole } : u)
    )
    await updateUserRole(editingUserId, editUserRole)
    toast.success('User role updated')
    setEditingUserId(null)
  }

  const cancelEditUser = () => {
    setEditingUserId(null)
  }

  const handleDeactivateUser = () => {
    if (!deactivateTargetId) return
    setInactiveUsers((prev) => prev.filter((u) => u.id !== deactivateTargetId))
    toast.success('Account deactivated')
    setDeactivateTargetId(null)
  }

  const handleDeleteFlag = async () => {
    if (!deleteFlagId) return
    await updateReportStatus(deleteFlagId, 'dismissed')
    setFlaggedAccounts((prev) => prev.filter((a) => a.id !== deleteFlagId))
    toast.success('Report dismissed')
    setDeleteFlagId(null)
  }

  const handleConfirmBulkDelete = () => {
    const count = inactiveUsers.length
    setInactiveUsers([])
    toast.success(`${count} inactive accounts deleted`)
    setBulkDeleteOpen(false)
  }

  const handleConfirmRateLimit = (role: string) => {
    setRateLimitTarget(null)
    handleEditRateLimit(role)
  }

  const handleConfirmCleanup = () => {
    setRunCleanupOpen(false)
    handleRunCleanup()
  }

  const handleEditRateLimit = (role: string) => {
    setRateLimits((prev) =>
      prev.map((rl) => {
        if (rl.role !== role) return rl
        const increments: Record<string, number[]> = {
          Student: [1, 3, 5, 10],
          Professional: [5, 10, 15, 25],
          Recruiter: [10, 20, 30, 50],
        }
        const steps = increments[role] ?? [5, 10, 15, 25]
        const currentIdx = steps.indexOf(rl.limit)
        const nextIdx = (currentIdx + 1) % steps.length
        return { ...rl, limit: steps[nextIdx] }
      })
    )
    toast.success(`${role} rate limit updated`)
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Admin Panel" subtitle="Platform management and user oversight" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={platformAnalytics?.totalUsers ?? 0} />
        <StatCard icon={Activity} label="Active this week" value={platformAnalytics?.activeUsersThisWeek ?? 0} />
        <StatCard icon={FileText} label="Referrals sent" value={platformAnalytics?.totalReferrals ?? 0} />
        <StatCard icon={TrendingUp} label="Conversion rate" value={`${platformAnalytics?.conversionRate ?? 0}%`} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Deletions</TabsTrigger>
          <TabsTrigger value="flagged">Flagged Accounts</TabsTrigger>
          <TabsTrigger value="cleanup">Cleanup Scheduler</TabsTrigger>
          <TabsTrigger value="lifecycle">Data Lifecycle</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-soft">
            <CardHeader className="">
              <CardTitle className="text-base">Recent signups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {professionals.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg p-1.5">
                  <GAvatar name={p.name} gradient={p.gradient} className="h-8 w-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{p.designation} · {p.company}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">{p.joinedDaysAgo}d ago</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="">
              <CardTitle className="text-base">Platform health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active professionals</span>
                <span className="text-sm font-semibold">{professionals.filter((p) => p.openForReferrals).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total referrals</span>
                <span className="text-sm font-semibold">{platformAnalytics?.totalReferrals ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total messages</span>
                <span className="text-sm font-semibold">{platformAnalytics?.totalMessages ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active job postings</span>
                <span className="text-sm font-semibold">{platformAnalytics?.totalJobs ?? jobs.filter((j) => j.stage === 'Active').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Flagged accounts</span>
                <span className="text-sm font-semibold text-rose-500">{flaggedAccounts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Upcoming deletions (30d)</span>
                <span className="text-sm font-semibold text-amber-500">{upcomingDeletions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Auto-deletion</span>
                <Badge className={cleanupEnabled ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25' : 'bg-muted text-muted-foreground'}>
                  {cleanupEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">System status</span>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/25">Healthy</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {usersLoading ? 'Loading users...' : `All users (${allUsers.length}) · Inactive ${retentionDays}+ days (${inactiveUsers.length})`}
            </h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={loadUsers}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
              </Button>
              {allUsers.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => { exportUsersCSV(allUsers.map((u) => ({ ...u, lastActive: u.lastActive || 'Never' }))); toast.success('Users exported as CSV') }}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Export
                </Button>
              )}
              {inactiveUsers.length > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete inactive ({inactiveUsers.length})
                </Button>
              )}
            </div>
          </div>
          {inactiveUsers.length === 0 ? (
            <Card className="shadow-soft">
              <CardContent className="flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground">No inactive accounts to clean up</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {inactiveUsers.map((u) => (
                <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Card className="shadow-soft">
                    <CardContent className="flex items-center gap-4 p-4">
                      <GAvatar name={u.name} gradient={u.gradient} className="h-10 w-10 text-xs" />
                      <div className="min-w-0 flex-1">
                        {editingUserId === u.id ? (
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-semibold">{u.name}</div>
                            <select
                              value={editUserRole}
                              onChange={(e) => setEditUserRole(e.target.value)}
                              className="rounded-lg border border-border bg-background px-2 py-0.5 text-xs"
                            >
                              <option value="professional">Professional</option>
                              <option value="recruiter">Recruiter</option>
                              <option value="student">Student</option>
                            </select>
                          </div>
                        ) : (
                          <>
                            <div className="truncate text-sm font-semibold">{u.name}</div>
                            <div className="text-xs text-muted-foreground">{u.role} {u.company && `· ${u.company}`} · Last active: {u.lastActive}</div>
                          </>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Last: {u.lastActivity}
                      </Badge>
                      {u.daysInactive >= retentionDays && (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/25">
                          <AlertTriangle className="mr-1 h-3 w-3" /> Delete eligible
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        {editingUserId === u.id ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={saveEditUser} className="text-emerald-600">Save</Button>
                            <Button variant="ghost" size="sm" onClick={cancelEditUser}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => startEditUser(u.id)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeactivateTargetId(u.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'upcoming' && (
        <div className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader className="">
              <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-amber-500" /> 30-Day Deletion Notices</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="mb-4 text-sm text-muted-foreground">Users are notified {notifyBefore} days before automatic deletion. Any activity resets the countdown timer.</p>
              {upcomingDeletions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming deletions</p>
              ) : (
                <div className="space-y-2">
                  {upcomingDeletions.map((u) => (
                    <Card key={u.id} className="shadow-soft">
                      <CardContent className="flex items-center gap-4 p-4">
                        <GAvatar name={u.name} gradient={u.gradient} className="h-10 w-10 text-xs" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.role} {u.company && `· ${u.company}`} · Last activity: {u.lastActivity} ({u.lastActivityDate})</div>
                        </div>
                        <Badge className={u.daysLeft <= 7 ? 'bg-rose-500/10 text-rose-600 border-rose-500/25' : 'bg-amber-500/10 text-amber-600 border-amber-500/25'}>
                          <Clock className="mr-1 h-3 w-3" /> {u.daysLeft}d left
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => handleDismissDeletion(u.id)}>
                          Reset timer
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'flagged' && (
        <div className="space-y-2">
          {flaggedAccounts.length === 0 ? (
            <Card className="shadow-soft">
              <CardContent className="flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground">No flagged accounts</p>
              </CardContent>
            </Card>
          ) : (
            flaggedAccounts.map((a) => {
              const isSuspended = suspendedIds.has(a.id)
              return (
                <Card key={a.id} className="shadow-soft">
                  <CardContent className="flex items-center gap-4 p-4">
                    <GAvatar name={a.name} gradient={a.gradient} className="h-10 w-10 text-xs" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{a.role} · Reported: {a.reported}</div>
                    </div>
                    {isSuspended ? (
                      <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/25">
                        <Ban className="mr-1 h-3 w-3" /> Suspended
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/25">
                        <Ban className="mr-1 h-3 w-3" /> {a.reason}
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuspendAccount(a.id)}
                    >
                      {isSuspended ? (
                        <>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Reactivate
                        </>
                      ) : (
                        <>
                          <Ban className="mr-1 h-3.5 w-3.5" /> Suspend
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => setDeleteFlagId(a.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {tab === 'cleanup' && (
        <div className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader className="">
              <CardTitle className="flex items-center gap-2 text-base"><Hammer className="h-4 w-4 text-primary" /> Cleanup Scheduler</CardTitle>
              <div data-slot="card-action" className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{cleanupEnabled ? 'Enabled' : 'Disabled'}</span>
                <Switch checked={cleanupEnabled} onCheckedChange={(v) => { setCleanupEnabled(v); toast.success(v ? 'Auto-cleanup enabled' : 'Auto-cleanup disabled') }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last cleanup</div>
                  <div className="mt-1 text-sm font-medium">{lastCleanup}</div>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next scheduled cleanup</div>
                  <div className="mt-1 text-sm font-medium">{nextCleanup}</div>
                </div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Schedule</div>
                <div className="mt-1 text-sm font-medium">Runs daily at 3:00 AM UTC</div>
              </div>
              <Button onClick={() => setRunCleanupOpen(true)} className="w-full">
                <Hammer className="mr-1.5 h-4 w-4" /> Run cleanup now
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="">
              <CardTitle className="text-base">Activity Types That Reset Timer</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="mb-4 text-sm text-muted-foreground">Any of the following activities resets the inactivity countdown timer for an account.</p>
              <div className="space-y-2">
                {ACTIVITY_TYPES.map((at) => (
                  <div key={at.type} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <at.icon className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{at.type}</div>
                      <div className="text-xs text-muted-foreground">{at.description}</div>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/25">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Resets timer
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-4">
          <Card className="shadow-soft border-primary/20 bg-gradient-to-br from-primary/[0.03] to-[#8B8FD4]/[0.03]">
            <CardHeader className="">
              <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Demo Mode</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">{demoMode ? 'Demo Mode is ON' : 'Demo Mode is OFF'}</div>
                  <div className="text-xs text-muted-foreground">
                    {demoMode
                      ? 'All demo accounts (Job Seeker, Corporate Professional, Recruiter) are visible and usable for demonstrations.'
                      : 'All demo accounts are hidden from login, search results, and the website. Only real accounts are accessible.'}
                  </div>
                </div>
                <Switch checked={demoMode} onCheckedChange={toggleDemoMode} />
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Job Seeker', active: demoMode },
                  { label: 'Professional', active: demoMode },
                  { label: 'Recruiter', active: demoMode },
                ].map((d) => (
                  <div key={d.label} className={`rounded-lg border p-2.5 text-xs font-medium transition-colors ${d.active ? 'border-primary/25 bg-primary/5 text-primary' : 'border-border bg-muted/30 text-muted-foreground line-through'}`}>
                    {d.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="">
              <CardTitle className="text-base">Referral Rate Limits</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="mb-4 text-sm text-muted-foreground">Enforce rate limits to prevent abuse and ensure fair platform usage.</p>
              <div className="space-y-3">
                {rateLimits.map((rl) => (
                  <div key={rl.role} className="flex items-center justify-between rounded-xl border border-border p-4">
                    <div>
                      <div className="text-sm font-semibold">{rl.role}</div>
                      <div className="text-xs text-muted-foreground">{rl.description}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm">{rl.limit} per {rl.window}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => setRateLimitTarget(rl.role)}>Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="">
              <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4 text-primary" /> Auto-Deletion Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="text-sm font-medium">Enable auto-deletion</div>
                  <div className="text-xs text-muted-foreground">Automatically delete inactive professional/recruiter accounts</div>
                </div>
                <Switch checked={cleanupEnabled} onCheckedChange={(v) => { setCleanupEnabled(v); toast.success(v ? 'Auto-deletion enabled' : 'Auto-deletion disabled') }} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="text-sm font-medium">Retention period</div>
                  <div className="text-xs text-muted-foreground">Days of inactivity before account is flagged for deletion</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={retentionDays}
                    onChange={(e) => { setRetentionDays(Number(e.target.value)); toast.success(`Retention set to ${e.target.value} days`) }}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  >
                    <option value={90}>90 days</option>
                    <option value={120}>120 days</option>
                    <option value={150}>150 days</option>
                    <option value={180}>180 days</option>
                    <option value={365}>365 days</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="text-sm font-medium">Notify before deletion</div>
                  <div className="text-xs text-muted-foreground">Send email notification N days before automatic deletion</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={notifyBefore}
                    onChange={(e) => { setNotifyBefore(Number(e.target.value)); toast.success(`Notification set to ${e.target.value} days before deletion`) }}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="">
              <CardTitle className="text-base">Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-border p-4">
                  <Shield className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Mutual Contact Visibility</div>
                    <div className="text-xs text-muted-foreground">Contact details (phone, email, WhatsApp) are only visible to both parties after a referral request is accepted. Before acceptance, contact info is masked.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-border p-4">
                  <Eye className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Profile Visibility</div>
                    <div className="text-xs text-muted-foreground">Professional profiles are public for discovery. Student profiles are only visible to professionals after a referral request is sent.</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deleteUserId !== null}
        onOpenChange={(open) => { if (!open) setDeleteUserId(null) }}
        title="Delete user account"
        description="This will permanently remove this user account. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteUserId) {
            setInactiveUsers((prev) => prev.filter((u) => u.id !== deleteUserId))
            toast.success('User deleted')
          }
          setDeleteUserId(null)
        }}
      />

      <ConfirmDialog
        open={deactivateTargetId !== null}
        onOpenChange={(open) => { if (!open) setDeactivateTargetId(null) }}
        title="Deactivate account"
        description="This will deactivate the user account and remove it from the inactive list."
        confirmLabel="Deactivate"
        onConfirm={handleDeactivateUser}
      />

      {/* ── Lifecycle Management Tab ──────────────────────────────── */}
      {tab === 'lifecycle' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleRunPipeline} disabled={lifecycleRunning} className="gap-2">
              {lifecycleRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {lifecycleRunning ? 'Running pipeline...' : 'Run Full Pipeline'}
            </Button>
            <Button variant="outline" onClick={handleRunCleanupNow} disabled={cleanupRunning} className="gap-2">
              {cleanupRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {cleanupRunning ? 'Cleaning...' : 'Run Cleanup Only'}
            </Button>
            <Button variant="ghost" onClick={loadLifecycleData} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Database} label="Aggregate tables" value={lifecyclePolicies.filter((p) => p.category === 'analytics').length} />
            <StatCard icon={Trash2} label="Retention policies" value={lifecyclePolicies.filter((p) => p.retention_days !== null).length} />
            <StatCard icon={History} label="Total job runs" value={lifecycleJobs.length} />
            <StatCard icon={HardDrive} label="Snapshots" value={lifecycleSnapshots.length} />
          </div>

          <Card className="shadow-soft">
            <CardHeader className="">
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4 text-primary" /> Data Retention Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2">
                {lifecyclePolicies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No retention policies found. Run the lifecycle migration in Supabase SQL Editor first.</p>
                ) : (['permanent', 'temporary', 'analytics'] as const).map((cat) => {
                  const items = lifecyclePolicies.filter((p) => p.category === cat)
                  if (items.length === 0) return null
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{cat} ({items.length})</div>
                      {items.map((p) => (
                        <div key={p.table_name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <code className="shrink-0 text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{p.table_name}</code>
                            <span className="truncate text-xs text-muted-foreground">{p.description}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            {p.retention_days !== null ? (
                              <Badge variant="outline" className="text-xs">{p.retention_days}d</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Forever</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-primary" /> Recent Lifecycle Jobs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {lifecycleJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No lifecycle jobs have been run yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {lifecycleJobs.slice(0, 10).map((job) => (
                    <div key={job.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">{job.status}</Badge>
                        <span className="font-medium">{job.job_type}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{job.rows_affected} rows</span>
                        <span>{new Date(job.started_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="">
              <CardTitle className="flex items-center gap-2 text-base">
                <HardDrive className="h-4 w-4 text-primary" /> System Health Snapshots
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {lifecycleSnapshots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No snapshots yet. Run the pipeline to capture system state.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4">Date</th>
                        <th className="pb-2 pr-4">Users</th>
                        <th className="pb-2 pr-4">Referrals</th>
                        <th className="pb-2 pr-4">Messages</th>
                        <th className="pb-2 pr-4">Notifications</th>
                        <th className="pb-2">Jobs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lifecycleSnapshots.slice(-10).reverse().map((s) => (
                        <tr key={s.snapshot_date} className="border-b border-border/50">
                          <td className="py-2 pr-4 font-medium">{s.snapshot_date}</td>
                          <td className="py-2 pr-4">{s.total_users.toLocaleString()}</td>
                          <td className="py-2 pr-4">{s.total_referrals.toLocaleString()}</td>
                          <td className="py-2 pr-4">{s.total_messages.toLocaleString()}</td>
                          <td className="py-2 pr-4">{s.total_notifications.toLocaleString()}</td>
                          <td className="py-2">{s.total_jobs.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deleteFlagId !== null}
        onOpenChange={(open) => { if (!open) setDeleteFlagId(null) }}
        title="Dismiss flagged account"
        description="This will dismiss the flag report and remove this account from the flagged list."
        confirmLabel="Dismiss"
        variant="default"
        onConfirm={handleDeleteFlag}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete all inactive accounts"
        description={`This will permanently delete all ${inactiveUsers.length} inactive accounts. This action cannot be undone.`}
        confirmLabel="Delete all"
        onConfirm={handleConfirmBulkDelete}
      />

      <ConfirmDialog
        open={rateLimitTarget !== null}
        onOpenChange={(open) => { if (!open) setRateLimitTarget(null) }}
        title="Update rate limit"
        description={`This will update the rate limit for ${rateLimitTarget ?? ''} users. Continue?`}
        confirmLabel="Update"
        variant="default"
        onConfirm={() => { if (rateLimitTarget) handleConfirmRateLimit(rateLimitTarget) }}
      />

      <ConfirmDialog
        open={runCleanupOpen}
        onOpenChange={setRunCleanupOpen}
        title="Run cleanup now"
        description={`This will immediately delete all accounts inactive for ${retentionDays}+ days. This action cannot be undone.`}
        confirmLabel="Run cleanup"
        onConfirm={handleConfirmCleanup}
      />
    </div>
  )
}
