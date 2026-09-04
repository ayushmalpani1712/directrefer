import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Ban, CheckCircle2, Trash2, Search, Download, RefreshCw, Pencil,
  Users, Eye, Loader2, BadgeCheck, UserSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { GAvatar } from '@/components/ui-kit'
import { GRADIENTS } from '@/data/mock'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  fetchAllUsersFull, banUser, unbanUser, deleteUser, updateUserRole,
  fetchUserDetail, logAdminAction, toggleShowOnFind, adminToggleProfessionalField, adminToggleJobSeekerField,
  type AdminUserFull, type AdminUserDetail,
} from '@/lib/db'
import { exportUsersCSV } from '@/lib/export'

type RoleTab = 'all' | 'job-seekers' | 'professionals' | 'recruiters'

const ROLE_TABS: { key: RoleTab; label: string; icon: typeof Users; role: string | null }[] = [
  { key: 'all', label: 'All Users', icon: Users, role: null },
  { key: 'job-seekers', label: 'Job Seekers', icon: Users, role: 'student' },
  { key: 'professionals', label: 'Professionals', icon: Eye, role: 'professional' },
  { key: 'recruiters', label: 'Recruiters', icon: UserSquare, role: 'recruiter' },
]

export default function AdminUsers() {
  const [allUsers, setAllUsers] = useState<AdminUserFull[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState<RoleTab>('all')
  const [userStatusFilter, setUserStatusFilter] = useState('all')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editUserRole, setEditUserRole] = useState('')
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
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
  const [suspendedIds, setSuspendedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkSuspendOpen, setBulkSuspendOpen] = useState(false)

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const users = await fetchAllUsersFull()
      setAllUsers(users)
      setSuspendedIds(new Set(users.filter((u) => u.status === 'suspended').map((u) => u.id)))
    } catch {
      toast.error('Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const filteredUsers = useMemo(() => {
    const activeTab = ROLE_TABS.find((t) => t.key === userRoleFilter)
    let result = activeTab?.role ? allUsers.filter((u) => u.role === activeTab.role) : allUsers
    if (userSearch) {
      const q = userSearch.toLowerCase()
      result = result.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    if (userStatusFilter !== 'all') {
      result = result.filter((u) => u.status === userStatusFilter)
    }
    return result
  }, [allUsers, userSearch, userRoleFilter, userStatusFilter])

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
    } catch {
      toast.error('Operation failed')
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteUserId) return
    try {
      const ok = await deleteUser(deleteUserId)
      if (ok) {
        setAllUsers((prev) => prev.filter((u) => u.id !== deleteUserId))
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(deleteUserId); return n })
        toast.success('User deleted')
        logAdminAction('deleted_user', deleteUserId)
      } else {
        toast.error('Failed to delete user')
      }
    } catch {
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
    } catch {
      toast.error('Failed to update role')
    }
    setEditingUserId(null)
  }

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
    } catch {
      toast.error('Failed to load user details')
    }
    setMasterEditorLoading(false)
  }

  const saveMasterEditor = async () => {
    if (!masterEditorUser) return
    setMasterSaving(true)
    try {
      const ok = await updateUserRole(masterEditorUser.id, masterEditRole as 'student' | 'professional' | 'recruiter' | 'admin')
      if (ok) {
        toast.success('User profile updated')
        logAdminAction('updated_user_profile', masterEditorUser.id, { fields: 'role' })
        const users = await fetchAllUsersFull()
        setAllUsers(users)
        setSuspendedIds(new Set(users.filter((u) => u.status === 'suspended').map((u) => u.id)))
      } else {
        toast.error('Failed to update user')
      }
    } catch {
      toast.error('Failed to update user')
    }
    setMasterSaving(false)
    setMasterEditorUser(null)
  }

  const handleToggleShowOnFind = async (userId: string, currentValue: boolean) => {
    const ok = await toggleShowOnFind(userId, !currentValue)
    if (ok) {
      setAllUsers((prev) => prev.map((u) => u.id === userId ? { ...u, show_on_find: !currentValue } : u))
      toast.success(currentValue ? 'Hidden from Find Professionals' : 'Shown on Find Professionals')
      logAdminAction('toggled_show_on_find', userId, { show_on_find: !currentValue })
    } else {
      toast.error('Failed to update visibility')
    }
  }

  const handleToggleOpenForReferrals = async (userId: string, currentValue: boolean) => {
    const ok = await adminToggleProfessionalField(userId, 'open_for_referrals', !currentValue)
    if (ok) {
      setAllUsers((prev) => prev.map((u) => u.id === userId ? { ...u, open_for_referrals: !currentValue } : u))
      toast.success(currentValue ? 'Closed for referrals' : 'Opened for referrals')
      logAdminAction('toggled_open_for_referrals', userId, { open_for_referrals: !currentValue })
    } else {
      toast.error('Failed to update referral toggle')
    }
  }

  const handleToggleProfessionalOpenToWork = async (userId: string, currentValue: boolean) => {
    const ok = await adminToggleProfessionalField(userId, 'is_open_to_work', !currentValue)
    if (ok) {
      setAllUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_open_to_work: !currentValue } : u))
      toast.success(currentValue ? 'Hidden from recruiters' : 'Visible to recruiters')
      logAdminAction('toggled_professional_open_to_work', userId, { is_open_to_work: !currentValue })
    } else {
      toast.error('Failed to update open-to-work toggle')
    }
  }

  const handleToggleJobSeekerOpenToWork = async (userId: string, currentValue: boolean) => {
    const ok = await adminToggleJobSeekerField(userId, 'is_open_to_work', !currentValue)
    if (ok) {
      setAllUsers((prev) => prev.map((u) => u.id === userId ? { ...u, job_seeker_open_to_work: !currentValue } : u))
      toast.success(currentValue ? 'Hidden from recruiters' : 'Visible to recruiters')
      logAdminAction('toggled_job_seeker_open_to_work', userId, { is_open_to_work: !currentValue })
    } else {
      toast.error('Failed to update open-to-work toggle')
    }
  }

  const handleBatchSuspend = async () => {
    const ids = Array.from(selectedIds)
    let count = 0
    for (const id of ids) {
      if (suspendedIds.has(id)) continue
      const ok = await banUser(id)
      if (ok) {
        count++
        setSuspendedIds((prev) => new Set(prev).add(id))
        setAllUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: 'suspended', banned: true } : u))
      }
    }
    if (count > 0) {
      toast.success(`${count} account${count > 1 ? 's' : ''} suspended`)
      logAdminAction('batch_suspended_users', undefined, { count })
    }
    setSelectedIds(new Set())
    setBulkSuspendOpen(false)
  }

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds)
    let count = 0
    for (const id of ids) {
      const ok = await deleteUser(id)
      if (ok) count++
    }
    if (count > 0) {
      setAllUsers((prev) => prev.filter((u) => !selectedIds.has(u.id)))
      toast.success(`${count} user${count > 1 ? 's' : ''} deleted`)
      logAdminAction('batch_deleted_users', undefined, { count })
    }
    setSelectedIds(new Set())
    setBulkDeleteOpen(false)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredUsers.map((u) => u.id)))
    }
  }

  const toggleSelectUser = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const roleLabel = userRoleFilter === 'all' ? 'users' : ROLE_TABS.find((t) => t.key === userRoleFilter)?.label.toLowerCase() ?? 'users'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">Manage all platform users, roles, and access</p>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ROLE_TABS.map(({ key, label, icon: Icon, role }) => (
          <button
            key={key}
            onClick={() => { setUserRoleFilter(key); setSelectedIds(new Set()) }}
            className={cn(
              'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all',
              userRoleFilter === key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="mr-2 inline h-4 w-4" />
            {label}
            <Badge variant="outline" className="ml-2 text-xs">
              {allUsers.filter((u) => !role || u.role === role).length}
            </Badge>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] max-w-md">
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
          value={userStatusFilter}
          onChange={(e) => setUserStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <Button variant="ghost" size="sm" onClick={loadUsers}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh
        </Button>
        {allUsers.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => {
            exportUsersCSV(allUsers.map((u) => ({ name: u.name, email: u.email, role: u.role, lastActive: u.lastActive || 'Never', daysInactive: u.daysInactive })))
            toast.success('Users exported')
          }}>
            <Download className="mr-1 h-3.5 w-3.5" />Export
          </Button>
        )}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <Button variant="destructive" size="sm" onClick={() => setBulkSuspendOpen(true)}>
              <Ban className="mr-1 h-3.5 w-3.5" />Bulk Suspend ({selectedIds.size})
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />Bulk Delete ({selectedIds.size})
            </Button>
          </div>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        {usersLoading ? 'Loading...' : `Showing ${filteredUsers.length} ${roleLabel}`}
      </div>

      {filteredUsers.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">{usersLoading ? 'Loading users...' : 'No users found'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 rounded-lg border border-border bg-muted/50 px-4 py-2">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredUsers.length && filteredUsers.length > 0}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-xs font-medium text-muted-foreground w-10">Select</span>
            <span className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">User</span>
            <span className="hidden sm:block w-32 text-xs font-medium text-muted-foreground">Role</span>
            <span className="hidden sm:block w-24 text-xs font-medium text-muted-foreground">Status</span>
            {userRoleFilter === 'all' && <span className="hidden lg:block w-20 text-xs font-medium text-muted-foreground">Referrals</span>}
            {userRoleFilter === 'all' && <span className="hidden lg:block w-20 text-xs font-medium text-muted-foreground">Open to work</span>}
            {userRoleFilter === 'professionals' || userRoleFilter === 'all' ? <span className="hidden sm:block w-28 text-xs font-medium text-muted-foreground">Find Pro listing</span> : null}
            {userRoleFilter === 'job-seekers' || userRoleFilter === 'all' ? <span className="hidden sm:block w-28 text-xs font-medium text-muted-foreground">Seeker visibility</span> : null}
            <span className="hidden md:block w-28 text-xs font-medium text-muted-foreground">Joined</span>
            <span className="w-20 sm:w-24 text-xs font-medium text-muted-foreground text-right">Actions</span>
          </motion.div>

          {filteredUsers.map((u) => (
            <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
              <Card className="shadow-soft">
                <CardContent className="flex items-center gap-4 p-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(u.id)}
                    onChange={() => toggleSelectUser(u.id)}
                    className="h-4 w-4 shrink-0 rounded border-border"
                  />
                  <GAvatar name={u.name} gradient={u.gradient} className="h-10 w-10 shrink-0 text-xs" />
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
                        <div className="truncate text-xs text-muted-foreground">
                          {u.email}
                          {u.company_name && <> · {u.company_name}</>}
                          {u.job_title && <> · {u.job_title}</>}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="hidden sm:block w-32 shrink-0">
                    <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
                  </div>
                   <div className="hidden sm:block w-24 shrink-0">
                    {u.status === 'suspended' ? (
                      <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/25"><Ban className="mr-1 h-3 w-3" />Suspended</Badge>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/25"><CheckCircle2 className="mr-1 h-3 w-3" />Active</Badge>
                    )}
                  </div>
                  {userRoleFilter === 'all' && (
                    <>
                      <div className="hidden lg:block w-20 shrink-0">
                        {u.role === 'professional' && (
                          <Switch
                            checked={u.open_for_referrals ?? true}
                            onCheckedChange={() => handleToggleOpenForReferrals(u.id, u.open_for_referrals ?? true)}
                            aria-label="Open for referrals"
                          />
                        )}
                      </div>
                      <div className="hidden lg:block w-20 shrink-0">
                        {u.role === 'professional' ? (
                          <Switch
                            checked={u.is_open_to_work ?? false}
                            onCheckedChange={() => handleToggleProfessionalOpenToWork(u.id, u.is_open_to_work ?? false)}
                            aria-label="Open to work (professional)"
                          />
                        ) : u.role === 'job-seeker' ? (
                          <Switch
                            checked={u.job_seeker_open_to_work ?? false}
                            onCheckedChange={() => handleToggleJobSeekerOpenToWork(u.id, u.job_seeker_open_to_work ?? false)}
                            aria-label="Open to work (job seeker)"
                          />
                        ) : null}
                      </div>
                      <div className="hidden sm:block w-28 shrink-0">
                        {u.role === 'professional' && (
                          <Switch
                            checked={u.show_on_find ?? true}
                            onCheckedChange={() => handleToggleShowOnFind(u.id, u.show_on_find ?? true)}
                            aria-label="Show on Find Professionals"
                          />
                        )}
                      </div>
                      <div className="hidden sm:block w-28 shrink-0">
                        {u.role === 'job-seeker' && (
                          <Switch
                            checked={u.job_seeker_open_to_work ?? false}
                            onCheckedChange={() => handleToggleJobSeekerOpenToWork(u.id, u.job_seeker_open_to_work ?? false)}
                            aria-label="Open to work (seeker visibility)"
                          />
                        )}
                      </div>
                    </>
                  )}
                  {userRoleFilter === 'professionals' && (
                    <div className="hidden sm:block w-28 shrink-0">
                      <Switch
                        checked={u.show_on_find ?? true}
                        onCheckedChange={() => handleToggleShowOnFind(u.id, u.show_on_find ?? true)}
                        aria-label="Show on Find Professionals"
                      />
                    </div>
                  )}
                  {userRoleFilter === 'job-seekers' && (
                    <div className="hidden sm:block w-28 shrink-0">
                      <Switch
                        checked={u.job_seeker_open_to_work ?? false}
                        onCheckedChange={() => handleToggleJobSeekerOpenToWork(u.id, u.job_seeker_open_to_work ?? false)}
                        aria-label="Open to work"
                      />
                    </div>
                  )}
                  <div className="hidden md:block w-28 shrink-0 text-xs text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '?'}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 w-20 sm:w-24 justify-end">
                    {editingUserId === u.id ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={saveEditUser} className="text-emerald-600">Save</Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingUserId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" title="Open master editor" onClick={() => openMasterEditor(u.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className={u.status === 'suspended' ? 'text-emerald-600' : 'text-rose-600'} onClick={() => handleSuspendAccount(u.id)}>
                          {u.status === 'suspended' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteUserId(u.id)}>
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

      <ConfirmDialog
        open={deleteUserId !== null}
        onOpenChange={(o) => { if (!o) setDeleteUserId(null) }}
        title="Delete user account"
        description="This will permanently remove this user account. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteUser}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Bulk delete users"
        description={`This will permanently delete ${selectedIds.size} selected user(s). This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size} user(s)`}
        onConfirm={handleBatchDelete}
      />

      <ConfirmDialog
        open={bulkSuspendOpen}
        onOpenChange={setBulkSuspendOpen}
        title="Bulk suspend users"
        description={`This will suspend ${selectedIds.size} selected user(s). They will be locked out of the platform.`}
        confirmLabel={`Suspend ${selectedIds.size} user(s)`}
        onConfirm={handleBatchSuspend}
      />

      <ConfirmDialog
        open={masterEditorUser !== null}
        onOpenChange={(o) => { if (!o) setMasterEditorUser(null) }}
        title="Master User Editor"
        description={masterEditorLoading ? 'Loading user data...' : `Editing ${masterEditorUser?.full_name}`}
        confirmLabel={masterSaving ? 'Saving...' : 'Save Changes'}
        variant="default"
        onConfirm={saveMasterEditor}
      >
        {masterEditorLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : masterEditorUser ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex items-center gap-4">
              <GAvatar name={masterEditName} gradient={GRADIENTS[0]} className="h-14 w-14 text-lg" />
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
    </div>
  )
}
