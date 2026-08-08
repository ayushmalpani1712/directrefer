import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Ban, CheckCircle2, Clock, Download, FileText, Mail,
  Shield, Trash2, Users, Eye, Settings, Pencil, Sparkles,
  RefreshCw, History, Search, Megaphone, Flag, BarChart3,
  Globe, MessageSquare, Briefcase, Plus, Send, ToggleLeft, ExternalLink, Wrench, Loader2, BadgeCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { GAvatar, SectionHeader, StatCard } from '@/components/ui-kit'
import { DashboardSkeleton, ListSkeleton } from '@/components/ui/skeleton'
import { useApp } from '@/context/AppContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import { GRADIENTS } from '@/data/mock'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  fetchAllUsersFull, banUser, unbanUser, deleteUser, updateUserRole,
  fetchPlatformAnalytics, fetchReportsWithUsers, updateReportStatus,
  fetchPlatformSettings, updatePlatformSetting,
  fetchAnnouncements, createAnnouncement, deleteAnnouncement, toggleAnnouncement,
  fetchAuditLogs, logAdminAction, fetchSystemHealth,
  fetchUserDetail, updateUserProfileAdmin,

  dismissReportAndBanUser,
  type AdminUserFull, type PlatformAnalytics, type ReportWithUsers,
  type Announcement, type AuditLogEntry, type SystemHealth,
  type AdminUserDetail,
} from '@/lib/db'
import { exportUsersCSV } from '@/lib/export'

type Tab = 'overview' | 'workspaces' | 'messages' | 'settings'
type WorkspaceTab = 'job-seekers' | 'professionals'
type SettingsTab = 'feature-flags' | 'rate-limits' | 'auto-deletion' | 'announcements' | 'verification' | 'audit-log'

const VALID_TABS: Tab[] = ['overview', 'workspaces', 'messages', 'settings']

export default function Admin() {
  const { tab: tabParam } = useParams()
  const navigate = useNavigate()
  const { demoMode, toggleDemoMode, role } = useApp()
  const loading = usePageLoading(400)

  const tab: Tab = VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : 'overview'
  const setTab = (t: Tab) => navigate(`/admin/${t}`, { replace: true })

  // Sub-tab state for workspaces and settings
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('job-seekers')
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('feature-flags')

  if (role !== 'admin') {
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

  // ── Users ──
  const [allUsers, setAllUsers] = useState<AdminUserFull[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editUserRole, setEditUserRole] = useState('')
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  // ── Master Editor ──
  const [masterEditorUser, setMasterEditorUser] = useState<AdminUserDetail | null>(null)
  const [masterEditorLoading, setMasterEditorLoading] = useState(false)
  const [masterEditName, setMasterEditName] = useState('')
  const [masterEditRole, setMasterEditRole] = useState('')
  const [masterEditBio, setMasterEditBio] = useState('')
  const [masterEditCity, setMasterEditCity] = useState('')
  const [masterEditLinkedin, setMasterEditLinkedin] = useState('')
  const [masterEditVerified, setMasterEditVerified] = useState(false)
  const [masterEditStatus, setMasterEditStatus] = useState('active')
  const [masterSaving, setMasterSaving] = useState(false)

  // ── Analytics ──
  const [platformAnalytics, setPlatformAnalytics] = useState<PlatformAnalytics | null>(null)

  // ── Flagged ──
  const [flaggedAccounts, setFlaggedAccounts] = useState<ReportWithUsers[]>([])
  const [deleteFlagId, setDeleteFlagId] = useState<string | null>(null)
  const [suspendedIds, setSuspendedIds] = useState<Set<string>>(new Set())

  // ── Flagged: Ban ──
  const [banFromFlagId, setBanFromFlagId] = useState<{ reportId: string; userId: string } | null>(null)

  // ── Announcements ──
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false)
  const [newAnnTitle, setNewAnnTitle] = useState('')
  const [newAnnBody, setNewAnnBody] = useState('')
  const [newAnnType, setNewAnnType] = useState('info')
  const [newAnnTarget, setNewAnnTarget] = useState('all')
  const [deleteAnnId, setDeleteAnnId] = useState<string | null>(null)

  // ── Feature Flags ──
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [maintenanceMessage, setMaintenanceMessage] = useState('We are currently performing scheduled maintenance. Please check back later.')

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



  // ── Load functions ──
  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const users = await fetchAllUsersFull()
      setAllUsers(users)
      setSuspendedIds(new Set(users.filter((u) => u.status === 'suspended').map((u) => u.id)))
    } catch (err) {
      console.error('Failed to load users:', err)
      toast.error('Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const s = await fetchPlatformSettings()
      setSettings(s)
      setRetentionDays(Number(s.retention_days) || 180)
      setNotifyBefore(Number(s.notify_before_deletion) || 30)
      setCleanupEnabled(s.auto_deletion_enabled !== false)
      if (s.maintenance_message) setMaintenanceMessage(String(s.maintenance_message))
      setRateLimits((prev) => prev.map((rl) => ({
        ...rl,
        limit: Number(s[`rate_limit_${rl.role.toLowerCase()}`]) || rl.limit,
      })))
    } catch (err) {
      console.error('Failed to load settings:', err)
      toast.error('Failed to load settings')
    }
  }, [])



  const loadAnnouncements = useCallback(async () => {
    try {
      const anns = await fetchAnnouncements()
      setAnnouncements(anns)
    } catch (err) {
      console.error('Failed to load announcements:', err)
      toast.error('Failed to load announcements')
    }
  }, [])

  const loadFlagged = useCallback(async () => {
    try {
      const reports = await fetchReportsWithUsers()
      setFlaggedAccounts(reports)
    } catch (err) {
      console.error('Failed to load flagged accounts:', err)
      toast.error('Failed to load reports')
    }
  }, [])

  const loadAuditLogs = useCallback(async () => {
    try {
      const logs = await fetchAuditLogs(50)
      setAuditLogs(logs)
    } catch (err) {
      console.error('Failed to load audit logs:', err)
      toast.error('Failed to load audit logs')
    }
  }, [])

  const loadSystemHealth = useCallback(async () => {
    try {
      const health = await fetchSystemHealth()
      setSystemHealth(health)
    } catch (err) {
      console.error('Failed to load system health:', err)
      toast.error('Failed to load system health')
    }
  }, [])

  // ── Tab-based loading ──
  useEffect(() => {
    if (tab === 'overview') {
      fetchPlatformAnalytics().then(setPlatformAnalytics).catch((err) => console.error('Failed to load analytics:', err))
      loadSystemHealth()
      loadFlagged()
      loadUsers()
      loadAnnouncements()
    }
    if (tab === 'workspaces') loadUsers()
    if (tab === 'settings' && settingsTab === 'announcements') loadAnnouncements()
    if (tab === 'settings' && settingsTab === 'feature-flags') loadSettings()
    if (tab === 'settings' && settingsTab === 'rate-limits') loadSettings()
    if (tab === 'settings' && settingsTab === 'auto-deletion') loadSettings()
    if (tab === 'settings' && settingsTab === 'audit-log') loadAuditLogs()
  }, [tab, settingsTab, loadUsers, loadSettings, loadAnnouncements, loadFlagged, loadAuditLogs, loadSystemHealth])

  if (loading) {
    return <DashboardSkeleton />
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
    try {
      if (suspendedIds.has(id)) {
        const ok = await unbanUser(id)
        if (!ok) { toast.error('Failed to reactivate account'); return }
        setSuspendedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
        setAllUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: 'active', banned: false } : u))
        toast.success('Account reactivated')
        logAdminAction('reactivated_user', id)
      } else {
        const ok = await banUser(id)
        if (!ok) { toast.error('Failed to suspend account'); return }
        setSuspendedIds((prev) => new Set(prev).add(id))
        setAllUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: 'suspended', banned: true } : u))
        toast.success('Account suspended')
        logAdminAction('suspended_user', id)
      }
    } catch (err) {
      console.error('Suspend/reactivate failed:', err)
      toast.error('Operation failed')
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteUserId) return
    try {
      const ok = await deleteUser(deleteUserId)
      if (ok) {
        setAllUsers((prev) => prev.filter((u) => u.id !== deleteUserId))
        toast.success('User deleted')
        logAdminAction('deleted_user', deleteUserId)
      } else {
        toast.error('Failed to delete user')
      }
    } catch (err) {
      console.error('Delete user failed:', err)
      toast.error('Failed to delete user')
    }
    setDeleteUserId(null)
  }

  const saveEditUser = async () => {
    if (!editingUserId) return
    try {
      const ok = await updateUserRole(editingUserId, editUserRole)
      if (!ok) { toast.error('Failed to update role'); setEditingUserId(null); return }
      setAllUsers((prev) => prev.map((u) => u.id === editingUserId ? { ...u, role: editUserRole } : u))
      toast.success('User role updated')
      logAdminAction('updated_user_role', editingUserId, { role: editUserRole })
    } catch (err) {
      console.error('Update role failed:', err)
      toast.error('Failed to update role')
    }
    setEditingUserId(null)
  }

  const handleDeleteFlag = async () => {
    if (!deleteFlagId) return
    try {
      const ok = await updateReportStatus(deleteFlagId, 'dismissed')
      if (!ok) { toast.error('Failed to dismiss report'); setDeleteFlagId(null); return }
      setFlaggedAccounts((prev) => prev.filter((a) => a.id !== deleteFlagId))
      toast.success('Report dismissed')
      logAdminAction('dismissed_report', deleteFlagId)
    } catch (err) {
      console.error('Dismiss report failed:', err)
      toast.error('Failed to dismiss report')
    }
    setDeleteFlagId(null)
  }

  const handleConfirmBulkDelete = async () => {
    let deleted = 0
    const failedIds: string[] = []
    for (const u of inactiveUsers) {
      const ok = await deleteUser(u.id)
      if (ok) deleted++
      else failedIds.push(u.id)
    }
    if (failedIds.length > 0) {
      setAllUsers((prev) => prev.filter((u) => !failedIds.includes(u.id)))
    }
    setAllUsers((prev) => prev.filter((u) => u.daysInactive >= retentionDays))
    toast.success(`${deleted} inactive accounts deleted${failedIds.length > 0 ? ` (${failedIds.length} failed)` : ''}`)
    logAdminAction('bulk_deleted_users', undefined, { count: deleted, failed: failedIds.length })
    setBulkDeleteOpen(false)
  }

  const handleCreateAnnouncement = async () => {
    if (!newAnnTitle.trim() || !newAnnBody.trim()) {
      toast.error('Title and body are required')
      return
    }
    const ok = await createAnnouncement(newAnnTitle, newAnnBody, newAnnType, undefined, newAnnTarget)
    if (ok) {
      toast.success('Announcement created')
      logAdminAction('created_announcement', undefined, { title: newAnnTitle, target: newAnnTarget })
      setNewAnnTitle('')
      setNewAnnBody('')
      setNewAnnType('info')
      setNewAnnTarget('all')
      setShowNewAnnouncement(false)
      loadAnnouncements()
    } else {
      toast.error('Failed to create announcement')
    }
  }

  const handleDeleteAnnouncement = async () => {
    if (!deleteAnnId) return
    try {
      const ok = await deleteAnnouncement(deleteAnnId)
      if (!ok) { toast.error('Failed to delete announcement'); setDeleteAnnId(null); return }
      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteAnnId))
      toast.success('Announcement deleted')
      logAdminAction('deleted_announcement', deleteAnnId)
    } catch (err) {
      console.error('Delete announcement failed:', err)
      toast.error('Failed to delete announcement')
    }
    setDeleteAnnId(null)
  }

  const handleToggleAnnouncement = async (id: string, active: boolean) => {
    try {
      const ok = await toggleAnnouncement(id, active)
      if (!ok) { toast.error('Failed to update announcement'); return }
      setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, active } : a))
      toast.success(active ? 'Announcement activated' : 'Announcement deactivated')
    } catch (err) {
      console.error('Toggle announcement failed:', err)
      toast.error('Failed to update announcement')
    }
  }

  // ── Master Editor ──
  const openMasterEditor = async (userId: string) => {
    setMasterEditorLoading(true)
    setMasterEditorUser(null)
    try {
      const detail = await fetchUserDetail(userId)
      if (detail) {
        setMasterEditorUser(detail)
        setMasterEditName(detail.full_name)
        setMasterEditRole(detail.role)
        setMasterEditBio(detail.bio || '')
        setMasterEditCity(detail.city || '')
        setMasterEditLinkedin(detail.linkedin || '')
        setMasterEditVerified(detail.verified)
        setMasterEditStatus(detail.status)
      }
    } catch (err) {
      console.error('Failed to load user detail:', err)
      toast.error('Failed to load user details')
    }
    setMasterEditorLoading(false)
  }

  const saveMasterEditor = async () => {
    if (!masterEditorUser) return
    setMasterSaving(true)
    const ok = await updateUserProfileAdmin(masterEditorUser.id, {
      full_name: masterEditName,
      role: masterEditRole,
      verified: masterEditVerified,
      status: masterEditStatus,
      city: masterEditCity,
      linkedin: masterEditLinkedin,
      bio: masterEditBio,
    })
    if (ok) {
      toast.success('User profile updated')
      logAdminAction('updated_user_profile', masterEditorUser.id, { fields: 'full_profile' })
      // Refresh user list
      const users = await fetchAllUsersFull()
      setAllUsers(users)
      setSuspendedIds(new Set(users.filter((u) => u.status === 'suspended').map((u) => u.id)))
    } else {
      toast.error('Failed to update user')
    }
    setMasterSaving(false)
    setMasterEditorUser(null)
  }



  // ── Flagged: Ban + Delete ──
  const handleBanFromFlag = async () => {
    if (!banFromFlagId) return
    try {
      const ok = await dismissReportAndBanUser(banFromFlagId.reportId, banFromFlagId.userId)
      if (ok) {
        setFlaggedAccounts((prev) => prev.filter((a) => a.id !== banFromFlagId.reportId))
        setSuspendedIds((prev) => new Set(prev).add(banFromFlagId.userId))
        setAllUsers((prev) => prev.map((u) => u.id === banFromFlagId.userId ? { ...u, status: 'suspended', banned: true } : u))
        toast.success('User banned and report resolved')
        logAdminAction('banned_user_from_report', banFromFlagId.userId, { reportId: banFromFlagId.reportId })
      } else {
        toast.error('Failed to ban user')
      }
    } catch (err) {
      console.error('Ban from flag failed:', err)
      toast.error('Failed to ban user')
    }
    setBanFromFlagId(null)
  }

  // ── Helpers ──
  const getFlagColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-500/10 text-blue-600 border-blue-500/25'
      case 'warning': return 'bg-amber-500/10 text-amber-600 border-amber-500/25'
      case 'maintenance': return 'bg-rose-500/10 text-rose-600 border-rose-500/25'
      case 'update': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getTargetRoleBadge = (targetRole: string) => {
    switch (targetRole) {
      case 'student': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/25">Students</Badge>
      case 'professional': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/25">Professionals</Badge>
      case 'recruiter': return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/25">Recruiters</Badge>
      case 'admin': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/25">Admins</Badge>
      default: return <Badge variant="outline">All users</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Dashboard Header ── */}
      {tab === 'overview' && (
        <>
          <SectionHeader title="Dashboard" subtitle="Platform overview and key metrics" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} label="Active Job Seekers" value={platformAnalytics?.usersByRole?.find(r => r.role === 'student')?.count ?? 0} />
            <StatCard icon={Briefcase} label="Active Professionals" value={platformAnalytics?.usersByRole?.find(r => r.role === 'professional')?.count ?? 0} />
            <StatCard icon={Clock} label="Pending Approvals" value={flaggedAccounts.length + (platformAnalytics?.totalReferrals ?? 0) - (platformAnalytics?.conversionRate ?? 0)} />
            <StatCard icon={MessageSquare} label="Unread Messages" value={platformAnalytics?.totalMessages ?? 0} />
          </div>
        </>
      )}

      {tab === 'workspaces' && (
        <SectionHeader title="Workspaces" subtitle="Manage job seekers and professionals" />
      )}

      {tab === 'messages' && (
        <SectionHeader title="Messages" subtitle="Platform messaging center" />
      )}

      {tab === 'settings' && (
        <SectionHeader title="Settings" subtitle="System configuration and access control" />
      )}

      {/* ── Tab Navigation ── */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="h-auto">
          <TabsTrigger value="overview"><BarChart3 className="mr-1 h-3.5 w-3.5" />Dashboard</TabsTrigger>
          <TabsTrigger value="workspaces"><Users className="mr-1 h-3.5 w-3.5" />Workspaces</TabsTrigger>
          <TabsTrigger value="messages"><MessageSquare className="mr-1 h-3.5 w-3.5" />Messages</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="mr-1 h-3.5 w-3.5" />Settings</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DASHBOARD OVERVIEW                                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Platform Health */}
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
                <span className="text-sm font-semibold">{platformAnalytics?.totalUsers ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Jobs</span>
                <span className="text-sm font-semibold">{platformAnalytics?.totalJobs ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Alerts & Actions */}
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
                <Badge variant="outline">{announcements.filter((a) => a.active).length}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Recent Signups</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-2">
              {allUsers.slice(0, 4).map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-lg p-1.5">
                  <GAvatar name={u.name} gradient={u.gradient} className="h-8 w-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{u.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{u.role} {u.company_name && `· ${u.company_name}`}</div>
                  </div>
                </div>
              ))}
              {allUsers.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No users yet</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* UNIFIED WORKSPACES HUB                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'workspaces' && (
        <div className="space-y-4">
          {/* Workspace Tab Controller */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
            <button
              onClick={() => setWorkspaceTab('job-seekers')}
              className={cn(
                'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all',
                workspaceTab === 'job-seekers'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Users className="mr-2 inline h-4 w-4" />
              Job Seekers
              <Badge variant="outline" className="ml-2 text-xs">
                {allUsers.filter(u => u.role === 'student').length}
              </Badge>
            </button>
            <button
              onClick={() => setWorkspaceTab('professionals')}
              className={cn(
                'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all',
                workspaceTab === 'professionals'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Briefcase className="mr-2 inline h-4 w-4" />
              Professionals
              <Badge variant="outline" className="ml-2 text-xs">
                {allUsers.filter(u => u.role === 'professional').length}
              </Badge>
            </button>
          </div>

          {/* Unified Search & Filters */}
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
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <Button variant="ghost" size="sm" onClick={loadUsers}><RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh</Button>
            {allUsers.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => { exportUsersCSV(allUsers.map((u) => ({ name: u.name, email: u.email, role: u.role, lastActive: u.lastActive || 'Never', daysInactive: u.daysInactive }))); toast.success('Users exported') }}>
                <Download className="mr-1 h-3.5 w-3.5" />Export
              </Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            {usersLoading ? 'Loading...' : `Showing ${filteredUsers.filter(u => workspaceTab === 'job-seekers' ? u.role === 'student' : u.role === 'professional').length} ${workspaceTab === 'job-seekers' ? 'job seekers' : 'professionals'}`}
          </div>

          {/* User List */}
          {filteredUsers.filter(u => workspaceTab === 'job-seekers' ? u.role === 'student' : u.role === 'professional').length === 0 ? (
            <Card className="shadow-soft"><CardContent className="flex items-center justify-center p-8"><p className="text-sm text-muted-foreground">{usersLoading ? 'Loading users...' : 'No users found'}</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filteredUsers
                .filter(u => workspaceTab === 'job-seekers' ? u.role === 'student' : u.role === 'professional')
                .map((u) => (
                <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card className="shadow-soft">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                      <GAvatar name={u.name} gradient={u.gradient} className="h-10 w-10 text-xs" />
                      <div className="min-w-0 flex-1">
                        {editingUserId === u.id ? (
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-semibold">{u.name}</div>
                            <select value={editUserRole} onChange={(e) => setEditUserRole(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-0.5 text-xs">
                              <option value="student">Student</option>
                              <option value="professional">Professional</option>
                              <option value="recruiter">Recruiter</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                        ) : (
                          <>
                            <div className="truncate text-sm font-semibold">{u.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {u.email} · <span className="capitalize">{u.role}</span>
                              {u.company_name && ` · ${u.company_name}`}
                              {u.job_title && ` · ${u.job_title}`}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : '?'} · Last active {u.lastActivity}
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
                            <Button variant="ghost" size="icon" title="Open master editor" onClick={() => openMasterEditor(u.id)}><Pencil className="h-3.5 w-3.5" /></Button>
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
      {/* MESSAGES CENTER                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'messages' && (
        <div className="space-y-4">
          <Card className="shadow-soft">
            <CardContent className="flex items-center justify-center p-12">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">Messages Center</h3>
                <p className="mt-2 text-sm text-muted-foreground">Access the full messaging interface to communicate with users.</p>
                <Button className="mt-4" onClick={() => navigate('/messages')}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Open Messages
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SETTINGS (with sub-tabs)                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'settings' && (
        <div className="space-y-4">
          {/* Settings Sub-Tab Controller */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
            {([
              { key: 'feature-flags', label: 'Feature Flags', icon: ToggleLeft },
              { key: 'rate-limits', label: 'Rate Limits', icon: Shield },
              { key: 'auto-deletion', label: 'Auto-Deletion', icon: Clock },
              { key: 'announcements', label: 'Announcements', icon: Megaphone },
              { key: 'verification', label: 'Verification', icon: BadgeCheck },
              { key: 'audit-log', label: 'Audit Log', icon: History },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSettingsTab(key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  settingsTab === key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Feature Flags */}
          {settingsTab === 'feature-flags' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Kill Switches — Toggle platform features on/off</h3>
              {[
                { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Show maintenance page to non-admin users.', icon: Wrench, destructive: true },
                { key: 'referral_requests_enabled', label: 'Referral Requests', desc: 'Allow users to send referral requests globally.', icon: FileText },
                { key: 'job_postings_enabled', label: 'Job Postings', desc: 'Allow recruiters to post jobs.', icon: Briefcase },
                { key: 'messaging_enabled', label: 'Messaging', desc: 'Enable direct messaging between users.', icon: MessageSquare },
                { key: 'google_oauth_enabled', label: 'Google OAuth', desc: 'Allow users to sign in with Google.', icon: Globe },
                { key: 'linkedin_oauth_enabled', label: 'LinkedIn OAuth', desc: 'Allow users to sign in with LinkedIn.', icon: ExternalLink },
                { key: 'email_auth_enabled', label: 'Email/Password Auth', desc: 'Allow email and password sign in.', icon: Mail },
              ].map((f) => (
                <Card key={f.key} className={`shadow-soft ${f.destructive && settings[f.key] === true ? 'border-rose-500/40 bg-rose-500/5' : ''}`}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <f.icon className={`h-5 w-5 shrink-0 ${f.destructive && settings[f.key] === true ? 'text-rose-500' : 'text-primary'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{f.label}</div>
                      <div className="text-xs text-muted-foreground">{f.desc}</div>
                      {f.key === 'maintenance_mode' && settings[f.key] === true && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={maintenanceMessage}
                            onChange={(e) => setMaintenanceMessage(e.target.value)}
                            onBlur={() => handleSaveSetting('maintenance_message', maintenanceMessage)}
                            placeholder="Maintenance message shown to users..."
                            className="w-full max-w-md rounded-lg border border-rose-500/30 bg-background px-3 py-1.5 text-xs"
                          />
                        </div>
                      )}
                    </div>
                    <Switch
                      checked={f.key in settings ? settings[f.key] !== false : false}
                      onCheckedChange={(v) => handleSaveSetting(f.key, v)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Rate Limits */}
          {settingsTab === 'rate-limits' && (
            <div className="space-y-4">
              <Card className="shadow-soft border-primary/20 bg-gradient-to-br from-primary/[0.03] to-[#8B8FD4]/[0.03]">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Demo Mode</CardTitle></CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center justify-between rounded-xl border border-border p-4">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">{demoMode ? 'Demo Mode is ON' : 'Demo Mode is OFF'}</div>
                      <div className="text-xs text-muted-foreground">{demoMode ? 'Demo accounts are visible and usable.' : 'Demo accounts are hidden from login and search.'}</div>
                    </div>
                    <Switch checked={demoMode} onCheckedChange={async (v) => { await handleSaveSetting('demo_mode', v); if (v !== demoMode) toggleDemoMode() }} />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader><CardTitle className="text-base">Referral Rate Limits</CardTitle></CardHeader>
                <CardContent className="pt-2">
                  <p className="mb-4 text-sm text-muted-foreground">Enforce rate limits per role.</p>
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
            </div>
          )}

          {/* Auto-Deletion */}
          {settingsTab === 'auto-deletion' && (
            <div className="space-y-4">
              <Card className="shadow-soft">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4 text-primary" /> Auto-Deletion Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between rounded-xl border border-border p-4">
                    <div>
                      <div className="text-sm font-medium">Enable auto-deletion</div>
                      <div className="text-xs text-muted-foreground">Automatically delete inactive accounts</div>
                    </div>
                    <Switch checked={cleanupEnabled} onCheckedChange={async (v) => { await handleSaveSetting('auto_deletion_enabled', v); setCleanupEnabled(v) }} />
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

          {/* Announcements */}
          {settingsTab === 'announcements' && (
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
                    <div className="flex flex-wrap items-center gap-3">
                      <select value={newAnnType} onChange={(e) => setNewAnnType(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="update">Update</option>
                      </select>
                      <select value={newAnnTarget} onChange={(e) => setNewAnnTarget(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                        <option value="all">All users</option>
                        <option value="student">Students only</option>
                        <option value="professional">Professionals only</option>
                        <option value="recruiter">Recruiters only</option>
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
                          {getTargetRoleBadge(a.target_role)}
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

          {/* Verification */}
          {settingsTab === 'verification' && <VerificationReviewTab />}

          {/* Audit Log */}
          {settingsTab === 'audit-log' && (
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
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MASTER USER EDITOR DIALOG                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <ConfirmDialog
        open={masterEditorUser !== null}
        onOpenChange={(o) => { if (!o) setMasterEditorUser(null) }}
        title="Master User Editor"
        description={masterEditorLoading ? 'Loading user data...' : `Editing ${masterEditorUser?.full_name}`}
        confirmLabel={masterSaving ? 'Saving...' : 'Save Changes'}
        onConfirm={saveMasterEditor}
      >
        {masterEditorLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : masterEditorUser ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex items-center gap-4">
              <GAvatar name={masterEditName} gradient={masterEditorUser.id ? GRADIENTS[0] : GRADIENTS[1]} className="h-14 w-14 text-lg" />
              <div>
                <div className="text-sm font-semibold">{masterEditorUser.email}</div>
                <div className="text-xs text-muted-foreground">ID: {masterEditorUser.id.slice(0, 8)}...</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Full Name</label>
                <input value={masterEditName} onChange={(e) => setMasterEditName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Role</label>
                <select value={masterEditRole} onChange={(e) => setMasterEditRole(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option value="student">Student</option>
                  <option value="professional">Professional</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Bio / Headline</label>
              <textarea value={masterEditBio} onChange={(e) => setMasterEditBio(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">City</label>
                <input value={masterEditCity} onChange={(e) => setMasterEditCity(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">LinkedIn</label>
                <input value={masterEditLinkedin} onChange={(e) => setMasterEditLinkedin(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <Switch checked={masterEditVerified} onCheckedChange={setMasterEditVerified} />
                <span className="text-sm font-medium"><BadgeCheck className="mr-1 inline h-3.5 w-3.5 text-sky-500" />Verified</span>
              </label>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Status</label>
                <select value={masterEditStatus} onChange={(e) => setMasterEditStatus(e.target.value)} className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="deactivated">Deactivated</option>
                </select>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <div className="grid grid-cols-2 gap-2">
                <div>Created: {new Date(masterEditorUser.created_at).toLocaleDateString()}</div>
                <div>Last login: {masterEditorUser.last_login_at ? new Date(masterEditorUser.last_login_at).toLocaleDateString() : 'Never'}</div>
                {masterEditorUser.company_name && <div>Company: {masterEditorUser.company_name}</div>}
                {masterEditorUser.designation && <div>Title: {masterEditorUser.designation}</div>}
              </div>
            </div>
          </div>
        ) : null}
      </ConfirmDialog>

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
      <ConfirmDialog open={deleteAnnId !== null} onOpenChange={(o) => { if (!o) setDeleteAnnId(null) }} title="Delete announcement" description="This will permanently delete this announcement." confirmLabel="Delete" onConfirm={handleDeleteAnnouncement} />

      <ConfirmDialog open={banFromFlagId !== null} onOpenChange={(o) => { if (!o) setBanFromFlagId(null) }} title="Ban user & dismiss report" description="This will suspend the reported user's account AND dismiss this report. The user will be locked out immediately." confirmLabel="Ban & Dismiss" variant="destructive" onConfirm={handleBanFromFlag} />
    </div>
  )
}

// ── Verification Review Tab ──────────────────────────────────
function VerificationReviewTab() {
  const [requests, setRequests] = useState<{ id: string; user_id: string; type: string; work_email: string | null; id_card_url: string | null; status: string; created_at: string; user_name: string; user_email: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('id, user_id, type, work_email, id_card_url, status, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch user names for each request
      const userIds = [...new Set((data || []).map((r: { user_id: string }) => r.user_id))]
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds)

      const userMap = new Map((usersData || []).map((u: { id: string; full_name?: string; email?: string }) => [u.id, u]))
      const enriched = (data || []).map((r: { user_id: string; id: string; type: string; work_email: string | null; id_card_url: string | null; status: string; created_at: string }) => ({
        ...r,
        user_name: userMap.get(r.user_id)?.full_name || 'Unknown',
        user_email: userMap.get(r.user_id)?.email || 'Unknown',
      }))
      setRequests(enriched)
    } catch (err) {
      console.error('Failed to load verification requests:', err)
      toast.error('Failed to load verification requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadRequests() }, [loadRequests])

  const handleReview = async (requestId: string, approve: boolean) => {
    setReviewingId(requestId)
    try {
      const { data, error } = await supabase.rpc('review_verification_request', {
        p_request_id: requestId,
        p_approve: approve,
      })
      if (error) throw error
      if (data?.success) {
        toast.success(approve ? 'Verification approved' : 'Verification rejected')
        loadRequests()
      } else {
        toast.error(data?.message || 'Failed to review request')
      }
    } catch (err) {
      console.error('Failed to review request:', err)
      toast.error('Failed to review request')
    } finally {
      setReviewingId(null)
    }
  }

  const pending = requests.filter((r) => r.status === 'pending')
  const reviewed = requests.filter((r) => r.status !== 'pending')

  if (loading) {
    return <ListSkeleton count={5} />
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Verification Requests" subtitle={`${pending.length} pending, ${reviewed.length} reviewed`} />

      {pending.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">No pending verification requests</p>
          </CardContent>
        </Card>
      ) : (
        pending.map((req) => (
          <Card key={req.id} className="shadow-soft">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <GAvatar name={req.user_name} gradient={GRADIENTS[0]} className="h-10 w-10 text-xs" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{req.user_name}</div>
                <div className="text-xs text-muted-foreground">{req.user_email}</div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {req.type === 'email_otp' ? 'Email OTP' : 'ID Card'}
                  </Badge>
                  {req.work_email && <span className="text-xs text-muted-foreground">{req.work_email}</span>}
                  {req.type === 'id_card' && req.id_card_url && (
                    <a href={req.id_card_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                      View ID Card
                    </a>
                  )}
                  <span className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                  disabled={reviewingId === req.id}
                  onClick={() => handleReview(req.id, true)}
                >
                  {reviewingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
                  disabled={reviewingId === req.id}
                  onClick={() => handleReview(req.id, false)}
                >
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {reviewed.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground">Recently reviewed</h3>
          {reviewed.slice(0, 10).map((req) => (
            <Card key={req.id} className="shadow-soft opacity-60">
              <CardContent className="flex items-center gap-4 p-4">
                <GAvatar name={req.user_name} gradient={GRADIENTS[0]} className="h-8 w-8 text-[10px]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{req.user_name}</div>
                  <div className="text-xs text-muted-foreground">{req.type === 'email_otp' ? req.work_email : 'ID Card'}</div>
                </div>
                <Badge variant="outline" className={
                  req.status === 'approved'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-600'
                }>
                  {req.status === 'approved' ? 'Approved' : 'Rejected'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}
