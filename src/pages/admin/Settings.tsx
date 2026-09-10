import { useState, useEffect, useCallback } from 'react'
import {
  Shield, Clock, Megaphone, ToggleLeft, Globe, Mail, FileText,
  Briefcase, MessageSquare, Wrench, ExternalLink, Plus, Send, Trash2, Award,
  ShieldCheck, Filter,
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
import { TrustBadge } from '@/components/TrustBadge'
import { manualOverrideTrustScore, type TrustTier } from '@/lib/v2/trust-score'
import { supabase } from '@/lib/supabase'
import { screeningTemplates } from '@/data/screeningTemplates'

type SettingsTab = 'feature-flags' | 'rate-limits' | 'auto-deletion' | 'announcements' | 'trust-scores' | 'gdpr' | 'screening-criteria'

const SETTINGS_TABS: { key: SettingsTab; label: string; icon: typeof Shield }[] = [
  { key: 'feature-flags', label: 'Feature Flags', icon: ToggleLeft },
  { key: 'rate-limits', label: 'Rate Limits', icon: Shield },
  { key: 'auto-deletion', label: 'Auto-Deletion', icon: Clock },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'trust-scores', label: 'Trust Scores', icon: Award },
  { key: 'screening-criteria', label: 'Screening Criteria', icon: Filter },
  { key: 'gdpr', label: 'GDPR', icon: ShieldCheck },
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
  const [professionals, setProfessionals] = useState<Array<{ user_id: string; full_name: string; trust_score: number; trust_tier: string; version: number }>>([])
  const [overrideUserId, setOverrideUserId] = useState<string | null>(null)
  const [overrideScore, setOverrideScore] = useState<number>(50)
  const [overrideTier, setOverrideTier] = useState<TrustTier>('provisional')

  const [gdprNoTerms, setGdprNoTerms] = useState<Array<{ id: string; full_name: string; email: string; created_at: string }>>([])
  const [gdprRetention, setGdprRetention] = useState<Array<{ id: string; full_name: string; email: string; data_retention_until: string }>>([])
  const [gdprLoading, setGdprLoading] = useState(false)

  const [screeningCriteria, setScreeningCriteria] = useState<Array<{ id: string; name: string; category: string; job_id: string | null; is_active: boolean }>>([])
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null)
  const [templateJobId, setTemplateJobId] = useState('')
  const [screeningJobs, setScreeningJobs] = useState<Array<{ id: string; title: string }>>([])

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

  const loadTrustScores = useCallback(async () => {
    try {
      const { data: trustData } = await supabase
        .from('trust_scores')
        .select('user_id, score, tier, version')

      const userIds = [...new Set((trustData ?? []).map((t) => t.user_id))]
      if (userIds.length === 0) { setProfessionals([]); return }

      const { data: profiles } = await supabase
        .from('profiles_professional')
        .select('user_id, full_name')
        .in('user_id', userIds)

      const nameMap = new Map<string, string>()
      for (const p of profiles ?? []) nameMap.set(p.user_id, p.full_name)

      setProfessionals(
        (trustData ?? []).map((t) => ({
          user_id: t.user_id,
          full_name: nameMap.get(t.user_id) ?? 'Unknown',
          trust_score: t.score,
          trust_tier: t.tier,
          version: t.version,
        }))
      )
    } catch {
      toast.error('Failed to load trust scores')
    }
  }, [])

  const loadGdprData = useCallback(async () => {
    setGdprLoading(true)
    try {
      const [noTermsRes, retentionRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, full_name, email, created_at')
          .is('terms_accepted_at', null)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('users')
          .select('id, full_name, email, data_retention_until')
          .not('data_retention_until', 'is', null)
          .order('data_retention_until', { ascending: true })
          .limit(100),
      ])

      setGdprNoTerms(noTermsRes.data ?? [])

      const now30 = new Date(Date.now() + 30 * 86_400_000)
      setGdprRetention(
        (retentionRes.data ?? []).filter(
          (u) => new Date(u.data_retention_until) < now30
        )
      )
    } catch {
      toast.error('Failed to load GDPR data')
    }
    setGdprLoading(false)
  }, [])

  const loadScreeningData = useCallback(async () => {
    try {
      const [criteriaRes, jobsRes] = await Promise.all([
        supabase
          .from('screening_criteria')
          .select('id, name, category, job_id, is_active')
          .order('created_at', { ascending: false }),
        supabase
          .from('jobs')
          .select('id, title')
          .order('created_at', { ascending: false }),
      ])
      setScreeningCriteria(criteriaRes.data ?? [])
      setScreeningJobs(jobsRes.data ?? [])
    } catch {
      toast.error('Failed to load screening data')
    }
  }, [])

  const handleApplyTemplate = async (templateId: string) => {
    const template = screeningTemplates.find(t => t.id === templateId)
    if (!template) return
    try {
      const inserts = template.criteria.map(c => ({
        name: c.name,
        category: c.category,
        criterion_type: c.criterion_type,
        criterion_key: c.criterion_key,
        criterion_value: c.criterion_value,
        weight: c.weight,
        job_id: templateJobId || null,
        is_active: true,
      }))
      const { error } = await supabase.from('screening_criteria').insert(inserts)
      if (error) throw error
      toast.success(`Applied "${template.name}" template`)
      logAdminAction('applied_screening_template', undefined, { template: template.name, job_id: templateJobId })
      setApplyingTemplate(null)
      setTemplateJobId('')
      loadScreeningData()
    } catch (err) {
      console.error('Failed to apply template:', err)
      toast.error('Failed to apply template')
    }
  }

  const handleExportUserData = async (userId: string, email: string) => {
    try {
      const [userRes, proRes, seekerRes, recRes, refsRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('profiles_professional').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('profiles_job_seeker').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('profiles_recruiter').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('referrals').select('*').or(`requester_id.eq.${userId},professional_id.eq.${userId}`),
      ])

      const exportData = {
        user: userRes.data,
        professional_profile: proRes.data,
        job_seeker_profile: seekerRes.data,
        recruiter_profile: recRes.data,
        referrals: refsRes.data,
        exported_at: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gdpr-export-${email || userId}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('User data exported')
      logAdminAction('gdpr_data_export', userId, { email })
    } catch {
      toast.error('Failed to export user data')
    }
  }

  const handleRequestDeletion = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ data_retention_until: new Date().toISOString() })
        .eq('id', userId)
      if (error) {
        toast.error('Failed to request deletion')
        return
      }
      toast.success('Deletion request recorded')
      logAdminAction('gdpr_deletion_request', userId)
      loadGdprData()
    } catch {
      toast.error('Failed to request deletion')
    }
  }

  useEffect(() => {
    if (settingsTab === 'feature-flags' || settingsTab === 'rate-limits' || settingsTab === 'auto-deletion') loadSettings()
    if (settingsTab === 'announcements') loadAnnouncements()
    if (settingsTab === 'trust-scores') loadTrustScores()
    if (settingsTab === 'gdpr') loadGdprData()
    if (settingsTab === 'screening-criteria') loadScreeningData()
  }, [settingsTab, loadSettings, loadAnnouncements, loadTrustScores, loadGdprData, loadScreeningData])

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
    const ok = await createAnnouncement(newAnnTitle, newAnnBody, newAnnType)
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

  const handleOverrideTrustScore = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); return }
    const ok = await manualOverrideTrustScore(userId, overrideScore, overrideTier, user.id)
    if (ok) {
      toast.success('Trust score overridden')
      logAdminAction('manual_trust_override', userId, { score: overrideScore, tier: overrideTier })
      setOverrideUserId(null)
      loadTrustScores()
    } else {
      toast.error('Failed to override trust score')
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
            <Card key={f.key} className={`${f.destructive && settings[f.key] === true ? 'border-rose-500/40 bg-rose-500/5' : ''}`}>
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
          <Card className="">
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
          <Card className="">
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
            <Card className="border-primary/20">
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
            <Card className=""><CardContent className="flex items-center justify-center p-8"><p className="text-sm text-muted-foreground">No announcements yet</p></CardContent></Card>
          ) : (
            announcements.map((a) => (
              <Card key={a.id} className="">
                <CardContent className="flex items-center gap-4 p-4">
                  <Megaphone className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{a.title}</span>
                      <Badge className={getFlagColor(a.type)}>{a.type}</Badge>
                      {!a.is_active && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{a.content}</p>
                    <div className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString()}</div>
                  </div>
                    <Switch checked={a.is_active} onCheckedChange={(v) => handleToggleAnnouncement(a.id, v)} />
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteAnnId(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {settingsTab === 'trust-scores' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Award className="h-4 w-4 text-primary" /> Trust Score Management</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">View and manually override professional trust scores.</p>
              {professionals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No professionals with trust scores found.</p>
              ) : (
                <div className="space-y-3">
                  {professionals.map((pro) => (
                    <div key={pro.user_id} className="flex items-center justify-between rounded-xl border border-border p-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{pro.full_name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Score: {pro.trust_score}</span>
                          <TrustBadge tier={pro.trust_tier as TrustTier} score={pro.trust_score} showScore />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setOverrideUserId(pro.user_id)
                          setOverrideScore(pro.trust_score)
                          setOverrideTier(pro.trust_tier as TrustTier)
                        }}
                      >
                        Override
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {overrideUserId && (
            <Card className="border-primary/20">
              <CardHeader><CardTitle className="text-base">Override Trust Score</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Editing: {professionals.find((p) => p.user_id === overrideUserId)?.full_name}
                </p>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Score (0-100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={overrideScore}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        setOverrideScore(v)
                        if (v >= 80) setOverrideTier('verified')
                        else if (v >= 50) setOverrideTier('provisional')
                        else setOverrideTier('unverified')
                      }}
                      className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tier</label>
                    <select
                      value={overrideTier}
                      onChange={(e) => setOverrideTier(e.target.value as TrustTier)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="verified">Verified</option>
                      <option value="provisional">Provisional</option>
                      <option value="unverified">Unverified</option>
                    </select>
                  </div>
                  <div className="mt-5">
                    <TrustBadge tier={overrideTier} score={overrideScore} showScore />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => handleOverrideTrustScore(overrideUserId)}>Save Override</Button>
                  <Button variant="ghost" size="sm" onClick={() => setOverrideUserId(null)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {settingsTab === 'screening-criteria' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4 text-primary" /> Screening Criteria Templates</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">Apply predefined screening criteria sets to jobs. Choose a template and optionally assign it to a specific job.</p>
              <div className="space-y-3">
                {screeningTemplates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{template.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{template.description}</div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {template.criteria.map((c, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{c.name} ({c.weight}%)</Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setApplyingTemplate(template.id)}
                    >
                      Use Template
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {applyingTemplate && (
            <Card className="border-primary/20">
              <CardHeader><CardTitle className="text-base">Apply Template</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Applying: {screeningTemplates.find(t => t.id === applyingTemplate)?.name}
                </p>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Assign to job (optional)</label>
                  <select
                    value={templateJobId}
                    onChange={(e) => setTemplateJobId(e.target.value)}
                    className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All jobs (global criteria)</option>
                    {screeningJobs.map((j) => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => handleApplyTemplate(applyingTemplate)}>Apply Template</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setApplyingTemplate(null); setTemplateJobId('') }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {screeningCriteria.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Existing criteria ({screeningCriteria.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {screeningCriteria.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Category: {c.category} {c.job_id ? `· Job: ${screeningJobs.find(j => j.id === c.job_id)?.title ?? 'Unknown'}` : '· Global'}
                        </div>
                      </div>
                      <Badge variant="outline" className={c.is_active ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500' : 'text-muted-foreground'}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {settingsTab === 'gdpr' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" /> GDPR Compliance</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">Monitor user consent status and data retention compliance.</p>
              {gdprLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Users without accepted terms ({gdprNoTerms.length})</h4>
                    {gdprNoTerms.length === 0 ? (
                      <p className="text-xs text-muted-foreground">All users have accepted terms.</p>
                    ) : (
                      <div className="space-y-2">
                        {gdprNoTerms.map((u) => (
                          <div key={u.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium">{u.full_name}</div>
                              <div className="text-xs text-muted-foreground">{u.email} — Joined {new Date(u.created_at).toLocaleDateString()}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleExportUserData(u.id, u.email)}>
                                Export Data
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRequestDeletion(u.id)}>
                                Request Deletion
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Data retention approaching ({gdprRetention.length})</h4>
                    <p className="text-xs text-muted-foreground mb-2">Users whose data retention expires within 30 days.</p>
                    {gdprRetention.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No users with upcoming data retention deadlines.</p>
                    ) : (
                      <div className="space-y-2">
                        {gdprRetention.map((u) => (
                          <div key={u.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium">{u.full_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {u.email} — Retention expires {new Date(u.data_retention_until).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleExportUserData(u.id, u.email)}>
                                Export Data
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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
