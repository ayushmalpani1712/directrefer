import { useState, useEffect, useCallback } from 'react'
import {
  Shield, Clock, Megaphone, ToggleLeft, Globe, Mail, FileText,
  Briefcase, MessageSquare, Wrench, ExternalLink, Plus, Send, Trash2,
  RefreshCw, BadgeCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  fetchPlatformSettings, updatePlatformSetting,
  fetchAnnouncements, createAnnouncement, deleteAnnouncement, toggleAnnouncement,
  logAdminAction,
  type Announcement,
} from '@/lib/db'

type SettingsTab = 'feature-flags' | 'rate-limits' | 'auto-deletion' | 'announcements'

const SETTINGS_TABS: { key: SettingsTab; label: string; icon: typeof Shield }[] = [
  { key: 'feature-flags', label: 'Feature Flags', icon: ToggleLeft },
  { key: 'rate-limits', label: 'Rate Limits', icon: Shield },
  { key: 'auto-deletion', label: 'Auto-Deletion', icon: Clock },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
]

export default function AdminSettings() {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('feature-flags')
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [maintenanceMessage, setMaintenanceMessage] = useState('We are currently performing scheduled maintenance. Please check back later.')
  const [retentionDays, setRetentionDays] = useState(180)
  const [notifyBefore, setNotifyBefore] = useState(30)
  const [cleanupEnabled, setCleanupEnabled] = useState(true)
  const [rateLimitTarget, setRateLimitTarget] = useState<string | null>(null)
  const [rateLimits, setRateLimits] = useState([
    { role: 'Student', limit: 3, window: '24 hours', description: 'Maximum referral requests per day' },
    { role: 'Professional', limit: 10, window: '24 hours', description: 'Maximum referrals processed per day' },
    { role: 'Recruiter', limit: 20, window: '24 hours', description: 'Maximum candidate messages per day' },
  ])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false)
  const [newAnnTitle, setNewAnnTitle] = useState('')
  const [newAnnBody, setNewAnnBody] = useState('')
  const [newAnnType, setNewAnnType] = useState('info')
  const [newAnnTarget, setNewAnnTarget] = useState('all')
  const [deleteAnnId, setDeleteAnnId] = useState<string | null>(null)

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
    } catch {
      toast.error('Failed to load settings')
    }
  }, [])

  const loadAnnouncements = useCallback(async () => {
    try {
      const anns = await fetchAnnouncements()
      setAnnouncements(anns)
    } catch {
      toast.error('Failed to load announcements')
    }
  }, [])

  useEffect(() => {
    if (settingsTab === 'feature-flags' || settingsTab === 'rate-limits' || settingsTab === 'auto-deletion') loadSettings()
    if (settingsTab === 'announcements') loadAnnouncements()
  }, [settingsTab, loadSettings, loadAnnouncements])

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
    } catch {
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
    } catch {
      toast.error('Failed to update announcement')
    }
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/50 p-1">
        {SETTINGS_TABS.map(({ key, label, icon: Icon }) => (
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

      {settingsTab === 'rate-limits' && (
        <div className="space-y-4">
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
        </div>
      )}

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
    </div>
  )
}
