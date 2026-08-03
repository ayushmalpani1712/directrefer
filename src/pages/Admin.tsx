import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Ban, CheckCircle2, Clock, Download, FileText, Mail,
  Shield, Trash2, Users, Activity, Eye, Settings, TrendingUp, X, Pencil, Sparkles,
  Database, RefreshCw, History, HardDrive, Search, Megaphone, Flag, BarChart3,
  Globe, MessageSquare, Briefcase, Plus, Send, ToggleLeft, ExternalLink, Wrench,
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
import {
  fetchAllUsersFull, banUser, unbanUser, deleteUser, updateUserRole,
  fetchPlatformAnalytics, fetchReportsWithUsers, updateReportStatus,
  fetchPlatformSettings, updatePlatformSetting,
  fetchAnnouncements, createAnnouncement, deleteAnnouncement, toggleAnnouncement,
  fetchAllReferrals, fetchAuditLogs, logAdminAction, fetchSystemHealth,
  type AdminUserFull, type PlatformAnalytics, type ReportWithUsers,
  type Announcement, type AdminReferral, type AuditLogEntry, type SystemHealth,
} from '@/lib/db'
import { exportUsersCSV } from '@/lib/export'
import {
  runLifecyclePipeline, runCleanup,
  fetchRetentionPolicies, fetchLifecycleJobs, fetchSnapshots,
  type RetentionPolicy, type LifecycleJob, type SystemSnapshot,
} from '@/lib/lifecycle'

type Tab = 'overview' | 'users' | 'referrals' | 'flagged' | 'announcements' | 'flags' | 'settings' | 'lifecycle' | 'audit'

export default function Admin() {
  const { demoMode, toggleDemoMode, role } = useApp()
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

  const [tab, setTab] = useState<Tab>('overview')

  // ── Users ──
  const [allUsers, setAllUsers] = useState<AdminUserFull[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editUserRole, setEditUserRole] = useState('')
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  // ── Analytics ──
  const [platformAnalytics, setPlatformAnalytics] = useState<PlatformAnalytics | null>(null)

  // ── Flagged ──
  const [flaggedAccounts, setFlaggedAccounts] = useState<ReportWithUsers[]>([])
  const [deleteFlagId, setDeleteFlagId] = useState<string | null>(null)
  const [suspendedIds, setSuspendedIds] = useState<Set<string>>(new Set())

  // ── Referrals ──
  const [allReferrals, setAllReferrals] = useState<AdminReferral[]>([])
  const [referralStatusFilter, setReferralStatusFilter] = useState('all')
  const [referralsLoading, setReferralsLoading] = useState(false)

  // ── Announcements ──
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false)
  const [newAnnTitle, setNewAnnTitle] = useState('')
  const [newAnnBody, setNewAnnBody] = useState('')
  const [newAnnType, setNewAnnType] = useState('info')
  const [deleteAnnId, setDeleteAnnId] = useState<string | null>(null)

  // ── Feature Flags ──
  const [settings, setSettings] = useState<Record<string, unknown>>({})

  // ── Settings ──
  const [retentionDays, setRetentionDays] = useState(180)
  const [notifyBefore, setNotifyBefore] = useState(30)
  const [cleanupEnabled, setCleanupEnabled] = useState(true)
  const [rateLimitTarget, setRateLimitTarget] = useState<string | null>(null)
  const [rateLimits, setRateLimits] = useState([
    { role: 'Student', limit: 3, window: '24 hours', description: 'Maximum referral requests per day' },
    { role: 'Professional', limit: 10, window: '24 hours', description: 'Maximum referrals processed per day' },
    { role: 'Recruiter', limit: 20, window: '24 hours', description: 'Maximum candidate messages per day' },
  ])

  // ── Audit ──
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])

  // ── System Health ──
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)

  // ── Lifecycle ──
  const [lifecyclePolicies, setLifecyclePolicies] = useState<RetentionPolicy[]>([])
  const [lifecycleJobs, setLifecycleJobs] = useState<LifecycleJob[]>([])
  const [lifecycleSnapshots, setLifecycleSnapshots] = useState<SystemSnapshot[]>([])
  const [lifecycleRunning, setLifecycleRunning] = useState(false)
  const [cleanupRunning, setCleanupRunning] = useState(false)
  const [runCleanupOpen, setRunCleanupOpen] = useState(false)

  // ── Computed ──
  const inactiveUsers = useMemo(() => allUsers.filter((u) => u.daysInactive >= retentionDays), [allUsers, retentionDays])

  const filteredUsers = useMemo(() => {
    let result = allUsers
    if (userSearch) {
      const q = userSearch.toLowerCase()
      result = result.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    if (userRoleFilter !== 'all') {
      result = result.filter((u) => u.role === userRoleFilter)
    }
    return result
  }, [allUsers, userSearch, userRoleFilter])

  const filteredReferrals = useMemo(() => {
    if (referralStatusFilter === 'all') return allReferrals
    return allReferrals.filter((r) => r.status === referralStatusFilter)
  }, [allReferrals, referralStatusFilter])

  // ── Load functions ──
  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    const users = await fetchAllUsersFull()
    setAllUsers(users)
    setUsersLoading(false)
  }, [])

  const loadSettings = useCallback(async () => {
    const s = await fetchPlatformSettings()
    setSettings(s)
    setRetentionDays(Number(s.retention_days) || 180)
    setNotifyBefore(Number(s.notify_before_deletion) || 30)
    setCleanupEnabled(s.auto_deletion_enabled !== false)
    setRateLimits((prev) => prev.map((rl) => ({
      ...rl,
      limit: Number(s[`rate_limit_${rl.role.toLowerCase()}`]) || rl.limit,
    })))
  }, [])

  const loadReferrals = useCallback(async () => {
    setReferralsLoading(true)
    const refs = await fetchAllReferrals()
    setAllReferrals(refs)
    setReferralsLoading(false)
  }, [])

  const loadAnnouncements = useCallback(async () => {
    const anns = await fetchAnnouncements()
    setAnnouncements(anns)
  }, [])

  const loadFlagged = useCallback(async () => {
    const reports = await fetchReportsWithUsers()
    setFlaggedAccounts(reports)
  }, [])

  const loadAuditLogs = useCallback(async () => {
    const logs = await fetchAuditLogs(50)
    setAuditLogs(logs)
  }, [])

  const loadSystemHealth = useCallback(async () => {
    const health = await fetchSystemHealth()
    setSystemHealth(health)
  }, [])

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

  // ── Tab-based loading ──
  useEffect(() => {
    if (tab === 'overview') {
      fetchPlatformAnalytics().then(setPlatformAnalytics)
      loadSystemHealth()
      loadFlagged()
    }
    if (tab === 'users') loadUsers()
    if (tab === 'referrals') loadReferrals()
    if (tab === 'flagged') loadFlagged()
    if (tab === 'announcements') loadAnnouncements()
    if (tab === 'flags' || tab === 'settings') loadSettings()
    if (tab === 'lifecycle') loadLifecycleData()
    if (tab === 'audit') loadAuditLogs()
  }, [tab, loadUsers, loadSettings, loadReferrals, loadAnnouncements, loadFlagged, loadAuditLogs, loadSystemHealth, loadLifecycleData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1"><Skeleton className="h-7 w-32 rounded-md" /><Skeleton className="h-4 w-64 rounded-md" /></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="rounded-xl border border-border bg-card p-5 space-y-2"><Skeleton className="h-4 w-24 rounded-md" /><Skeleton className="h-7 w-16 rounded-md" /></div>))}
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    )
  }

  // ── Handlers ──
  const handleSaveSetting = async (key: string, value: unknown) => {
    const ok = await updatePlatformSetting(key, value)
    if (ok) {
      setSettings((prev) => ({ ...prev, [key]: value }))
      toast.success('Setting saved')
      logAdminAction(`updated_setting_${key}`, undefined, { key, value })
    } else {
      toast.error('Failed to save setting')
    }
  }

  const handleSaveRateLimit = async (role: string, limit: number) => {
    const key = `rate_limit_${role.toLowerCase()}`
    await handleSaveSetting(key, limit)
  }

  const handleSuspendAccount = async (id: string) => {
    if (suspendedIds.has(id)) {
      await unbanUser(id)
      setSuspendedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
      setAllUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: 'active', banned: false } : u))
      toast.success('Account reactivated')
      logAdminAction('reactivated_user', id)
    } else {
      await banUser(id)
      setSuspendedIds((prev) => new Set(prev).add(id))
      setAllUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: 'suspended', banned: true } : u))
      toast.success('Account suspended')
      logAdminAction('suspended_user', id)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteUserId) return
    const ok = await deleteUser(deleteUserId)
    if (ok) {
      setAllUsers((prev) => prev.filter((u) => u.id !== deleteUserId))
      toast.success('User deleted')
      logAdminAction('deleted_user', deleteUserId)
    } else {
      toast.error('Failed to delete user')
    }
    setDeleteUserId(null)
  }

  const saveEditUser = async () => {
    if (!editingUserId) return
    await updateUserRole(editingUserId, editUserRole)
    setAllUsers((prev) => prev.map((u) => u.id === editingUserId ? { ...u, role: editUserRole } : u))
    toast.success('User role updated')
    logAdminAction('updated_user_role', editingUserId, { role: editUserRole })
    setEditingUserId(null)
  }

  const handleDeleteFlag = async () => {
    if (!deleteFlagId) return
    await updateReportStatus(deleteFlagId, 'dismissed')
    setFlaggedAccounts((prev) => prev.filter((a) => a.id !== deleteFlagId))
    toast.success('Report dismissed')
    logAdminAction('dismissed_report', deleteFlagId)
    setDeleteFlagId(null)
  }

  const handleConfirmBulkDelete = async () => {
    const count = inactiveUsers.length
    for (const u of inactiveUsers) {
      await deleteUser(u.id)
    }
    setAllUsers((prev) => prev.filter((u) => u.daysInactive < retentionDays))
    toast.success(`${count} inactive accounts deleted`)
    logAdminAction('bulk_deleted_users', undefined, { count })
    setBulkDeleteOpen(false)
  }

  const handleCreateAnnouncement = async () => {
    if (!newAnnTitle.trim() || !newAnnBody.trim()) {
      toast.error('Title and body are required')
      return
    }
    const ok = await createAnnouncement(newAnnTitle, newAnnBody, newAnnType)
    if (ok) {
      toast.success('Announcement created')
      logAdminAction('created_announcement', undefined, { title: newAnnTitle })
      setNewAnnTitle('')
      setNewAnnBody('')
      setNewAnnType('info')
      setShowNewAnnouncement(false)
      loadAnnouncements()
    } else {
      toast.error('Failed to create announcement')
    }
  }

  const handleDeleteAnnouncement = async () => {
    if (!deleteAnnId) return
    await deleteAnnouncement(deleteAnnId)
    setAnnouncements((prev) => prev.filter((a) => a.id !== deleteAnnId))
    toast.success('Announcement deleted')
    logAdminAction('deleted_announcement', deleteAnnId)
    setDeleteAnnId(null)
  }

  const handleToggleAnnouncement = async (id: string, active: boolean) => {
    await toggleAnnouncement(id, active)
    setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, active } : a))
    toast.success(active ? 'Announcement activated' : 'Announcement deactivated')
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

  const handleConfirmCleanup = () => {
    setRunCleanupOpen(false)
    handleRunCleanupNow()
  }

  const getFlagColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-500/10 text-blue-600 border-blue-500/25'
      case 'warning': return 'bg-amber-500/10 text-amber-600 border-amber-500/25'
      case 'maintenance': return 'bg-rose-500/10 text-rose-600 border-rose-500/25'
      case 'update': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/25'
      case 'accepted': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
      case 'rejected': return 'bg-rose-500/10 text-rose-600 border-rose-500/25'
      case 'completed': return 'bg-blue-500/10 text-blue-600 border-blue-500/25'
      default: return 'bg-muted text-muted-foreground'
    }
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="overview"><BarChart3 className="mr-1 h-3.5 w-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="users"><Users className="mr-1 h-3.5 w-3.5" />Users</TabsTrigger>
          <TabsTrigger value="referrals"><FileText className="mr-1 h-3.5 w-3.5" />Referrals</TabsTrigger>
          <TabsTrigger value="flagged"><Flag className="mr-1 h-3.5 w-3.5" />Flagged</TabsTrigger>
          <TabsTrigger value="announcements"><Megaphone className="mr-1 h-3.5 w-3.5" />Announcements</TabsTrigger>
          <TabsTrigger value="flags"><ToggleLeft className="mr-1 h-3.5 w-3.5" />Feature Flags</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="mr-1 h-3.5 w-3.5" />Settings</TabsTrigger>
          <TabsTrigger value="lifecycle"><Database className="mr-1 h-3.5 w-3.5" />Lifecycle</TabsTrigger>
          <TabsTrigger value="audit"><History className="mr-1 h-3.5 w-3.5" />Audit Log</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* OVERVIEW                                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Recent signups</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-2">
              {allUsers.slice(0, 5).map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-lg p-1.5">
                  <GAvatar name={u.name} gradient={u.gradient} className="h-8 w-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{u.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{u.job_title || u.role} {u.company_name && `· ${u.company_name}`}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">{u.lastActivity}</Badge>
                </div>
              ))}
              {allUsers.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No users yet</p>}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Platform health</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total users</span>
                <span className="text-sm font-semibold">{platformAnalytics?.totalUsers ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total referrals</span>
                <span className="text-sm font-semibold">{platformAnalytics?.totalReferrals ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total messages</span>
                <span className="text-sm font-semibold">{platformAnalytics?.totalMessages ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active job postings</span>
                <span className="text-sm font-semibold">{platformAnalytics?.totalJobs ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Flagged accounts</span>
                <span className="text-sm font-semibold text-rose-500">{flaggedAccounts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Inactive 180+ days</span>
                <span className="text-sm font-semibold text-amber-500">{inactiveUsers.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active announcements</span>
                <span className="text-sm font-semibold">{announcements.filter((a) => a.active).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">System status</span>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/25">Healthy</Badge>
              </div>
              {systemHealth && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">API response</span>
                    <span className="text-sm font-semibold">{systemHealth.apiResponseTime}ms</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Role distribution</CardTitle></CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(platformAnalytics?.usersByRole || []).map((r) => (
                  <div key={r.role} className="rounded-xl border border-border p-3 text-center">
                    <div className="text-lg font-bold">{r.count}</div>
                    <div className="text-xs text-muted-foreground capitalize">{r.role.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* USER MANAGEMENT                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All roles</option>
              <option value="student">Students</option>
              <option value="professional">Professionals</option>
              <option value="recruiter">Recruiters</option>
              <option value="admin">Admins</option>
            </select>
            <Button variant="ghost" size="sm" onClick={loadUsers}><RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh</Button>
            {allUsers.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => { exportUsersCSV(allUsers.map((u) => ({ name: u.name, email: u.email, role: u.role, lastActive: u.lastActive || 'Never', daysInactive: u.daysInactive }))); toast.success('Users exported') }}>
                <Download className="mr-1 h-3.5 w-3.5" />Export
              </Button>
            )}
            {inactiveUsers.length > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />Delete inactive ({inactiveUsers.length})
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {usersLoading ? 'Loading...' : `Showing ${filteredUsers.length} of ${allUsers.length} users · ${inactiveUsers.length} inactive (${retentionDays}+ days)`}
          </div>
          {filteredUsers.length === 0 ? (
            <Card className="shadow-soft"><CardContent className="flex items-center justify-center p-8"><p className="text-sm text-muted-foreground">{usersLoading ? 'Loading users...' : 'No users found'}</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card className="shadow-soft">
                    <CardContent className="flex items-center gap-4 p-4">
                      <GAvatar name={u.name} gradient={u.gradient} className="h-10 w-10 text-xs" />
                      <div className="min-w-0 flex-1">
                        {editingUserId === u.id ? (
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-semibold">{u.name}</div>
                            <select value={editUserRole} onChange={(e) => setEditUserRole(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-0.5 text-xs">
                              <option value="professional">Professional</option>
                              <option value="recruiter">Recruiter</option>
                              <option value="student">Student</option>
                            </select>
                          </div>
                        ) : (
                          <>
                            <div className="truncate text-sm font-semibold">{u.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {u.email} · <span className="capitalize">{u.role}</span>
                              {u.company_name && ` · ${u.company_name}`}
                              {u.job_title && ` · ${u.job_title}`}
                              {' · Last: '}{u.lastActivity}
                            </div>
                          </>
                        )}
                      </div>
                      {u.status === 'suspended' && <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/25"><Ban className="mr-1 h-3 w-3" />Suspended</Badge>}
                      {u.daysInactive >= retentionDays && u.status !== 'suspended' && (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/25"><AlertTriangle className="mr-1 h-3 w-3" />Inactive</Badge>
                      )}
                      <div className="flex items-center gap-1">
                        {editingUserId === u.id ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={saveEditUser} className="text-emerald-600">Save</Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingUserId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingUserId(u.id); setEditUserRole(u.role) }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className={u.status === 'suspended' ? 'text-emerald-600' : 'text-rose-600'} onClick={() => handleSuspendAccount(u.id)}>
                              {u.status === 'suspended' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteUserId(u.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* REFERRALS MANAGEMENT                                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'referrals' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-semibold">{referralsLoading ? 'Loading...' : `${filteredReferrals.length} referrals${referralStatusFilter !== 'all' ? ` (${referralStatusFilter})` : ''}`}</h3>
            <select
              value={referralStatusFilter}
              onChange={(e) => setReferralStatusFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
            <Button variant="ghost" size="sm" onClick={loadReferrals}><RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh</Button>
          </div>
          {filteredReferrals.length === 0 ? (
            <Card className="shadow-soft"><CardContent className="flex items-center justify-center p-8"><p className="text-sm text-muted-foreground">{referralsLoading ? 'Loading referrals...' : 'No referrals found'}</p></CardContent></Card>
          ) : (
            <Card className="shadow-soft">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="p-4">Requester</th>
                        <th className="p-4">Professional</th>
                        <th className="p-4">Job Title</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReferrals.map((r) => (
                        <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="p-4">
                            <div className="font-medium">{r.requester_name}</div>
                            <div className="text-xs text-muted-foreground">{r.requester_email}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium">{r.professional_name}</div>
                            <div className="text-xs text-muted-foreground">{r.professional_email}</div>
                          </td>
                          <td className="p-4">{r.job_title}</td>
                          <td className="p-4"><Badge className={getStatusColor(r.status)}>{r.status}</Badge></td>
                          <td className="p-4 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FLAGGED ACCOUNTS                                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'flagged' && (
        <div className="space-y-2">
          {flaggedAccounts.length === 0 ? (
            <Card className="shadow-soft"><CardContent className="flex items-center justify-center p-8"><p className="text-sm text-muted-foreground">No flagged accounts</p></CardContent></Card>
          ) : (
            flaggedAccounts.map((a) => {
              const isSuspended = suspendedIds.has(a.target_id) || a.status === 'resolved'
              return (
                <Card key={a.id} className="shadow-soft">
                  <CardContent className="flex items-center gap-4 p-4">
                    <GAvatar name={a.target_name} gradient={GRADIENTS[0]} className="h-10 w-10 text-xs" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{a.target_name}</div>
                      <div className="text-xs text-muted-foreground">
                        <span className="capitalize">{a.target_role.replace('_', ' ')}</span>
                        {' · Reported by '}{a.reporter_name}
                        {' · '}{a.created_at ? `${Math.floor((Date.now() - new Date(a.created_at).getTime()) / 86_400_000)}d ago` : 'Unknown'}
                      </div>
                      {a.description && <div className="text-xs text-muted-foreground mt-1 italic">"{a.description}"</div>}
                    </div>
                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/25"><Ban className="mr-1 h-3 w-3" />{a.reason}</Badge>
                    <Button variant="outline" size="sm" onClick={() => handleSuspendAccount(a.target_id)}>
                      {isSuspended ? <><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Reactivate</> : <><Ban className="mr-1 h-3.5 w-3.5" />Suspend</>}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setDeleteFlagId(a.id)}><X className="h-3.5 w-3.5" /></Button>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ANNOUNCEMENTS                                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{announcements.length} announcements</h3>
            <Button size="sm" onClick={() => setShowNewAnnouncement(!showNewAnnouncement)}>
              <Plus className="mr-1 h-3.5 w-3.5" />New Announcement
            </Button>
          </div>

          {showNewAnnouncement && (
            <Card className="shadow-soft border-primary/20">
              <CardHeader><CardTitle className="text-base">Create Announcement</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <input type="text" placeholder="Title" value={newAnnTitle} onChange={(e) => setNewAnnTitle(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                <textarea placeholder="Body..." value={newAnnBody} onChange={(e) => setNewAnnBody(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" />
                <div className="flex items-center gap-3">
                  <select value={newAnnType} onChange={(e) => setNewAnnType(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="update">Update</option>
                  </select>
                  <Button size="sm" onClick={handleCreateAnnouncement}><Send className="mr-1 h-3.5 w-3.5" />Publish</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowNewAnnouncement(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {announcements.length === 0 ? (
            <Card className="shadow-soft"><CardContent className="flex items-center justify-center p-8"><p className="text-sm text-muted-foreground">No announcements yet</p></CardContent></Card>
          ) : (
            announcements.map((a) => (
              <Card key={a.id} className="shadow-soft">
                <CardContent className="flex items-center gap-4 p-4">
                  <Megaphone className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{a.title}</span>
                      <Badge className={getFlagColor(a.type)}>{a.type}</Badge>
                      {!a.active && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{a.body}</p>
                    <div className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString()}</div>
                  </div>
                  <Switch checked={a.active} onCheckedChange={(v) => handleToggleAnnouncement(a.id, v)} />
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteAnnId(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FEATURE FLAGS                                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'flags' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Toggle platform features on/off</h3>
          {[
            { key: 'google_oauth_enabled', label: 'Google OAuth', desc: 'Allow users to sign in with Google', icon: Globe },
            { key: 'linkedin_oauth_enabled', label: 'LinkedIn OAuth', desc: 'Allow users to sign in with LinkedIn', icon: ExternalLink },
            { key: 'email_auth_enabled', label: 'Email/Password Auth', desc: 'Allow email and password sign in', icon: Mail },
            { key: 'messaging_enabled', label: 'Messaging', desc: 'Enable direct messaging between users', icon: MessageSquare },
            { key: 'referral_requests_enabled', label: 'Referral Requests', desc: 'Allow users to send referral requests', icon: FileText },
            { key: 'job_postings_enabled', label: 'Job Postings', desc: 'Allow recruiters to post jobs', icon: Briefcase },
            { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Show maintenance page to non-admin users', icon: Wrench },
          ].map((f) => (
            <Card key={f.key} className="shadow-soft">
              <CardContent className="flex items-center gap-4 p-4">
                <f.icon className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{f.label}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
                <Switch
                  checked={settings[f.key] !== false}
                  onCheckedChange={(v) => handleSaveSetting(f.key, v)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SETTINGS                                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'settings' && (
        <div className="space-y-4">
          <Card className="shadow-soft border-primary/20 bg-gradient-to-br from-primary/[0.03] to-[#8B8FD4]/[0.03]">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Demo Mode</CardTitle></CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">{demoMode ? 'Demo Mode is ON' : 'Demo Mode is OFF'}</div>
                  <div className="text-xs text-muted-foreground">{demoMode ? 'Demo accounts are visible and usable.' : 'Demo accounts are hidden from login and search.'}</div>
                </div>
                <Switch checked={demoMode} onCheckedChange={(v) => { toggleDemoMode(); handleSaveSetting('demo_mode', v) }} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Referral Rate Limits</CardTitle></CardHeader>
            <CardContent className="pt-2">
              <p className="mb-4 text-sm text-muted-foreground">Enforce rate limits per role. Changes are saved to the database.</p>
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
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4 text-primary" /> Auto-Deletion Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="text-sm font-medium">Enable auto-deletion</div>
                  <div className="text-xs text-muted-foreground">Automatically delete inactive accounts</div>
                </div>
                <Switch checked={cleanupEnabled} onCheckedChange={(v) => { setCleanupEnabled(v); handleSaveSetting('auto_deletion_enabled', v) }} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="text-sm font-medium">Retention period</div>
                  <div className="text-xs text-muted-foreground">Days of inactivity before deletion</div>
                </div>
                <select value={retentionDays} onChange={(e) => { setRetentionDays(Number(e.target.value)); handleSaveSetting('retention_days', Number(e.target.value)) }} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
                  <option value={90}>90 days</option><option value={120}>120 days</option><option value={150}>150 days</option><option value={180}>180 days</option><option value={365}>365 days</option>
                </select>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="text-sm font-medium">Notify before deletion</div>
                  <div className="text-xs text-muted-foreground">Send notification N days before deletion</div>
                </div>
                <select value={notifyBefore} onChange={(e) => { setNotifyBefore(Number(e.target.value)); handleSaveSetting('notify_before_deletion', Number(e.target.value)) }} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
                  <option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={60}>60 days</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Privacy Policy</CardTitle></CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-border p-4">
                  <Shield className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Mutual Contact Visibility</div>
                    <div className="text-xs text-muted-foreground">Contact details are only visible after a referral request is accepted.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-border p-4">
                  <Eye className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Profile Visibility</div>
                    <div className="text-xs text-muted-foreground">Professional profiles are public. Student profiles are only visible after a referral request.</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DATA LIFECYCLE                                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'lifecycle' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleRunPipeline} disabled={lifecycleRunning} className="gap-2">
              {lifecycleRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {lifecycleRunning ? 'Running...' : 'Run Full Pipeline'}
            </Button>
            <Button variant="outline" onClick={handleRunCleanupNow} disabled={cleanupRunning} className="gap-2">
              {cleanupRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {cleanupRunning ? 'Cleaning...' : 'Run Cleanup Only'}
            </Button>
            <Button variant="ghost" onClick={loadLifecycleData} className="gap-2"><RefreshCw className="h-4 w-4" />Refresh</Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Database} label="Aggregate tables" value={lifecyclePolicies.filter((p) => p.category === 'analytics').length} />
            <StatCard icon={Trash2} label="Retention policies" value={lifecyclePolicies.filter((p) => p.retention_days !== null).length} />
            <StatCard icon={History} label="Total job runs" value={lifecycleJobs.length} />
            <StatCard icon={HardDrive} label="Snapshots" value={lifecycleSnapshots.length} />
          </div>

          <Card className="shadow-soft">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4 text-primary" /> Data Retention Policies</CardTitle></CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2">
                {lifecyclePolicies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No retention policies found.</p>
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
                          {p.retention_days !== null ? <Badge variant="outline" className="text-xs">{p.retention_days}d</Badge> : <Badge variant="secondary" className="text-xs">Forever</Badge>}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4 text-primary" /> Recent Lifecycle Jobs</CardTitle></CardHeader>
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
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><HardDrive className="h-4 w-4 text-primary" /> System Health Snapshots</CardTitle></CardHeader>
            <CardContent className="pt-2">
              {lifecycleSnapshots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No snapshots yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4">Users</th><th className="pb-2 pr-4">Referrals</th><th className="pb-2 pr-4">Messages</th><th className="pb-2 pr-4">Notifications</th><th className="pb-2">Jobs</th>
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

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* AUDIT LOG                                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent admin actions</h3>
            <Button variant="ghost" size="sm" onClick={loadAuditLogs}><RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh</Button>
          </div>
          {auditLogs.length === 0 ? (
            <Card className="shadow-soft"><CardContent className="flex items-center justify-center p-8"><p className="text-sm text-muted-foreground">No audit logs yet</p></CardContent></Card>
          ) : (
            <Card className="shadow-soft">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="p-4">Admin</th><th className="p-4">Action</th><th className="p-4">Target</th><th className="p-4">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="p-4 font-medium">{log.admin_name}</td>
                          <td className="p-4"><Badge variant="outline" className="text-xs">{log.action.replace(/_/g, ' ')}</Badge></td>
                          <td className="p-4 text-muted-foreground">{log.target_name || '—'}</td>
                          <td className="p-4 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DIALOGS                                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <ConfirmDialog open={deleteUserId !== null} onOpenChange={(o) => { if (!o) setDeleteUserId(null) }} title="Delete user account" description="This will permanently remove this user account. This action cannot be undone." confirmLabel="Delete" onConfirm={handleDeleteUser} />
      <ConfirmDialog open={deleteFlagId !== null} onOpenChange={(o) => { if (!o) setDeleteFlagId(null) }} title="Dismiss flagged account" description="This will dismiss the flag report." confirmLabel="Dismiss" variant="default" onConfirm={handleDeleteFlag} />
      <ConfirmDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen} title="Delete all inactive accounts" description={`This will permanently delete all ${inactiveUsers.length} inactive accounts. This action cannot be undone.`} confirmLabel="Delete all" onConfirm={handleConfirmBulkDelete} />
      <ConfirmDialog open={rateLimitTarget !== null} onOpenChange={(o) => { if (!o) setRateLimitTarget(null) }} title="Update rate limit" description={`Update the rate limit for ${rateLimitTarget ?? ''} users.`} confirmLabel="Update" variant="default" onConfirm={() => {
        if (!rateLimitTarget) return
        const increments: Record<string, number[]> = { Student: [1, 3, 5, 10], Professional: [5, 10, 15, 25], Recruiter: [10, 20, 30, 50] }
        const steps = increments[rateLimitTarget] || [5, 10, 15, 25]
        const rl = rateLimits.find((r) => r.role === rateLimitTarget)
        const currentIdx = rl ? steps.indexOf(rl.limit) : 0
        const nextLimit = steps[(currentIdx + 1) % steps.length]
        setRateLimits((prev) => prev.map((r) => r.role === rateLimitTarget ? { ...r, limit: nextLimit } : r))
        handleSaveRateLimit(rateLimitTarget, nextLimit)
        setRateLimitTarget(null)
      }} />
      <ConfirmDialog open={runCleanupOpen} onOpenChange={setRunCleanupOpen} title="Run cleanup now" description={`This will run the lifecycle cleanup pipeline.`} confirmLabel="Run cleanup" onConfirm={handleConfirmCleanup} />
      <ConfirmDialog open={deleteAnnId !== null} onOpenChange={(o) => { if (!o) setDeleteAnnId(null) }} title="Delete announcement" description="This will permanently delete this announcement." confirmLabel="Delete" onConfirm={handleDeleteAnnouncement} />
    </div>
  )
}
