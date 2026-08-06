import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useTheme } from 'next-themes'
import {
  Bell, Building2, Check, CreditCard, Globe, KeyRound, Laptop, Lock, Mail, Monitor, Moon, Palette,
  ShieldCheck, Sun, Trash2, User, Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionHeader } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { VerificationModal } from '@/components/VerificationModal'
import { useVerification } from '@/hooks/useVerification'
import { ROLE_META } from '@/data/mock'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAutoSaveForm, DraftStatusIndicator } from '@/hooks/useAutoSaveForm'
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard'

interface Session {
  id: string
  device: string
  isCurrent: boolean
}

function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {desc && <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function Settings() {
  const { role, student, updateStudent, logout } = useApp()
  const { theme, setTheme } = useTheme()
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'profile'
  const setActiveTab = (t: string) => setSearchParams({ tab: t }, { replace: true })
  const [sessions, setSessions] = useState<Session[]>([])
  const [name, setName] = useState(student.name)
  const [location, setLocation] = useState(student.location)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNew, setConfirmNew] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({
    referral_updates: true, new_messages: true, profile_views: true,
    completion_reminders: true, product_announcements: false, weekly_digest: false, email_opt_out: false,
  })
  const [privacy, setPrivacy] = useState({
    public_profile: true, show_salary: false, activity_status: true, search_indexing: false,
  })
  const [language, setLanguage] = useState('en')
  const [timezone, setTimezone] = useState('ist')

  // ── Auto-Save Draft ──
  const draftSnapshot = { name, location }
  const { status: draftStatus, lastSavedAt, clearDraft, onFormSaved, restoreDraft, hasUnsavedChanges } = useAutoSaveForm({
    userId: user?.id ?? '',
    formId: 'settings-profile',
    values: draftSnapshot,
    enabled: !!user,
  })
  useUnsavedChangesGuard({ enabled: hasUnsavedChanges })

  useEffect(() => {
    if (draftStatus !== 'restored' || !user) return
    try {
      const raw = localStorage.getItem(`draft:${user.id}:settings-profile`)
      if (!raw) return
      const entry = JSON.parse(raw)
      if (!entry?.values) return
      const v = entry.values
      if (v.name !== undefined) setName(v.name)
      if (v.location !== undefined) setLocation(v.location)
      restoreDraft(v)
    } catch { /* corrupted draft — ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftStatus])

  useEffect(() => {
    setName(student.name)
    setLocation(student.location)
  }, [student.name, student.location])

  useEffect(() => {
    try {
      const prefs = localStorage.getItem('dr_notif_prefs')
      if (prefs) setNotifPrefs((prev) => ({ ...prev, ...JSON.parse(prefs) }))
      const priv = localStorage.getItem('dr_privacy_settings')
      if (priv) setPrivacy((prev) => ({ ...prev, ...JSON.parse(priv) }))
      const lang = localStorage.getItem('dr_language')
      if (lang) setLanguage(lang)
      const tz = localStorage.getItem('dr_timezone')
      if (tz) setTimezone(tz)
    } catch (e) {
      console.error('Failed to load settings from localStorage:', e)
    }
  }, [])

  const saveSettings = async (patch: Record<string, unknown>) => {
    try {
      if ('notification_prefs' in patch) localStorage.setItem('dr_notif_prefs', JSON.stringify(patch.notification_prefs))
      if ('privacy_settings' in patch) localStorage.setItem('dr_privacy_settings', JSON.stringify(patch.privacy_settings))
      if ('language' in patch) localStorage.setItem('dr_language', String(patch.language))
      if ('timezone' in patch) localStorage.setItem('dr_timezone', String(patch.timezone))
      toast.success('Settings saved')
    } catch (err) {
      console.error('Settings save failed:', err)
      toast.error('Failed to save settings')
    }
  }

  const handleNotifPrefChange = (key: string, value: boolean) => {
    const next = { ...notifPrefs, [key]: value }
    setNotifPrefs(next)
    saveSettings({ notification_prefs: next })
  }

  const handlePrivacyChange = (key: string, value: boolean) => {
    const next = { ...privacy, [key]: value }
    setPrivacy(next)
    saveSettings({ privacy_settings: next })
  }

  useEffect(() => {
    const loadSecurity = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const session = sessionData?.session
        if (session) {
          const ua = navigator.userAgent
          let device = 'Unknown device'
          if (ua.includes('Mac')) device = 'Mac'
          else if (ua.includes('Windows')) device = 'Windows PC'
          else if (ua.includes('iPhone')) device = 'iPhone'
          else if (ua.includes('Android')) device = 'Android device'
          else if (ua.includes('Linux')) device = 'Linux PC'

          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
          const city = tz.split('/').pop()?.replace(/_/g, ' ') || ''

          setSessions([{
            id: session.access_token.slice(-8),
            device: `${device} · ${city}`,
            isCurrent: true,
          }])
        }
      } catch {
        setSessions([{ id: 'current', device: 'Current session', isCurrent: true }])
      }
    }
    loadSecurity()
  }, [])

  const handleSaveProfile = () => {
    updateStudent({ name, location })
    toast.success('Profile updated successfully')
    onFormSaved()
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNew) {
      toast.error('Please fill in all password fields')
      return
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmNew) {
      toast.error('New passwords do not match')
      return
    }
    setPasswordLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: student.email,
        password: currentPassword,
      })
      if (signInError) {
        toast.error('Current password is incorrect')
        return
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Password updated')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmNew('')
      }
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Draft status indicator */}
      {(draftStatus === 'saved' || draftStatus === 'restored' || draftStatus === 'syncing') && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
          {hasUnsavedChanges && (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={clearDraft}>Discard draft</Button>
          )}
        </div>
      )}


      <SectionHeader title="Settings" subtitle="Manage your account, preferences and security" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="profile"><User className="mr-1.5 h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="workspace"><Building2 className="mr-1.5 h-4 w-4" /> Workspace</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-1.5 h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="privacy"><Lock className="mr-1.5 h-4 w-4" /> Privacy</TabsTrigger>
          <TabsTrigger value="security"><ShieldCheck className="mr-1.5 h-4 w-4" /> Security</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="mr-1.5 h-4 w-4" /> Appearance</TabsTrigger>
          <TabsTrigger value="billing" className="opacity-50 pointer-events-none"><CreditCard className="mr-1.5 h-4 w-4" /> Billing <Lock className="ml-1 h-3 w-3" /></TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-5 space-y-5">
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Personal information</CardTitle><CardDescription>Shown on your public {ROLE_META[role].label.toLowerCase()} profile</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input value={student.email} disabled className="opacity-60" /></div>
              <div className="space-y-1.5"><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Role</Label><Input value={ROLE_META[role].label} disabled /></div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <Button onClick={handleSaveProfile}>Save changes</Button>
                {hasUnsavedChanges && (
                  <Button variant="ghost" size="sm" onClick={() => { setName(student.name); setLocation(student.location); clearDraft() }}>Discard draft</Button>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft border-rose-500/30">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base text-rose-500"><Trash2 className="h-4 w-4" /> Danger zone</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-muted-foreground">Permanently delete your account and all referral history. This cannot be undone.</p>
              <Button variant="outline" className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10" disabled={deleting} onClick={async () => {
                if (role === 'admin') { toast.error('Admin accounts cannot be self-deleted. Contact another admin.'); return }
                if (!confirm('Are you absolutely sure? This will permanently delete your account and all data. This action cannot be undone.')) return
                setDeleting(true)
                try {
                  const userId = (await supabase.auth.getUser()).data.user?.id
                  if (!userId) { toast.error('Not authenticated'); return }
                  const tables = ['notifications', 'bookmarks', 'messages', 'conversations', 'referrals', 'profiles_job_seeker', 'profiles_professional', 'profiles_recruiter']
                  const errors: string[] = []
                  for (const table of tables) {
                    const { error } = table === 'conversations'
                      ? await supabase.from(table).delete().or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
                      : table === 'referrals'
                      ? await supabase.from(table).delete().or(`requester_id.eq.${userId},professional_id.eq.${userId}`)
                      : await supabase.from(table).delete().eq('user_id', userId)
                    if (error) errors.push(table)
                  }
                  const { error: userDelError } = await supabase.from('users').delete().eq('id', userId)
                  if (userDelError) errors.push('users')
                  if (errors.length > 0) {
                    toast.error(`Failed to delete data from: ${errors.join(', ')}. Please contact support.`)
                    return
                  }
                  logout()
                  await signOut()
                  toast.success('Account deleted successfully')
                  navigate('/')
                } catch {
                  toast.error('Failed to delete account. Please contact support.')
                } finally {
                  setDeleting(false)
                }
              }}>{deleting ? 'Deleting...' : 'Delete account'}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workspace Verification */}
        <TabsContent value="workspace" className="mt-5 space-y-5">
          <WorkspaceVerificationCard />
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-5">
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Notification preferences</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border">
              {([
                { key: 'referral_updates' as const, t: 'Referral status updates', d: 'Accepted, declined, review started — instantly', icon: Zap },
                { key: 'new_messages' as const, t: 'New messages', d: 'When someone messages you', icon: Mail },
                { key: 'profile_views' as const, t: 'Profile views', d: 'When a recruiter or professional views your profile', icon: User },
                { key: 'completion_reminders' as const, t: 'Profile completion reminders', d: 'Weekly nudge until you hit 90%', icon: Bell },
                { key: 'product_announcements' as const, t: 'Product announcements', d: 'New features and improvements', icon: Monitor },
                { key: 'weekly_digest' as const, t: 'Weekly digest email', d: 'A Sunday summary of your pipeline', icon: Mail },
              ]).map((n) => (
                <Row key={n.key} title={n.t} desc={n.d}>
                  <Switch checked={notifPrefs[n.key]} onCheckedChange={(v) => handleNotifPrefChange(n.key, v)} />
                </Row>
              ))}
              <Row title="Email notifications off" desc="Disable all email notifications (in-app notifications still work)">
                <Switch checked={notifPrefs.email_opt_out} onCheckedChange={(v) => handleNotifPrefChange('email_opt_out', v)} />
              </Row>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy */}
        <TabsContent value="privacy" className="mt-5">
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Privacy</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border">
              <Row title="Public profile" desc="Appear in search results for professionals and recruiters"><Switch checked={privacy.public_profile} onCheckedChange={(v) => handlePrivacyChange('public_profile', v)} /></Row>
              <Row title="Show salary expectations" desc="Visible to verified recruiters only"><Switch checked={privacy.show_salary} onCheckedChange={(v) => handlePrivacyChange('show_salary', v)} /></Row>
              <Row title="Activity status" desc="Show when you're online in messages"><Switch checked={privacy.activity_status} onCheckedChange={(v) => handlePrivacyChange('activity_status', v)} /></Row>
              <Row title="Search engine indexing" desc="Allow your public profile to appear on Google"><Switch checked={privacy.search_indexing} onCheckedChange={(v) => handlePrivacyChange('search_indexing', v)} /></Row>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="mt-5 space-y-5">
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Password</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5"><Label>Current password</Label><Input type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>New password</Label><Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Confirm new</Label><Input type="password" placeholder="••••••••" value={confirmNew} onChange={(e) => setConfirmNew(e.target.value)} /></div>
              <div><Button className="mt-1" onClick={handleUpdatePassword} disabled={passwordLoading}><KeyRound className="mr-1.5 h-4 w-4" /> {passwordLoading ? 'Updating...' : 'Update password'}</Button></div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Active sessions</CardTitle></CardHeader>
            <CardContent>
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3.5 py-2.5 text-sm">
                  <span className="flex items-center gap-2"><Laptop className="h-4 w-4 text-muted-foreground" /> {s.device}</span>
                  {s.isCurrent ? <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10">This device</Badge> : <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-500" onClick={async () => {
                    try {
                      await supabase.auth.signOut()
                      setSessions((prev) => prev.filter((sess) => sess.id !== s.id))
                      toast.success('Signed out from other session')
                    } catch {
                      toast.error('Failed to revoke session. Try changing your password instead.')
                    }
                  }}>Revoke</Button>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="mt-5 space-y-5">
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Theme</CardTitle><CardDescription>Choose how Direct Refer looks on this device</CardDescription></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {[
                { key: 'light', label: 'Light', icon: Sun },
                { key: 'dark', label: 'Dark', icon: Moon },
                { key: 'system', label: 'System', icon: Monitor },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTheme(t.key)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:border-primary/40',
                    theme === t.key ? 'border-primary bg-primary/5' : 'border-border',
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><t.icon className="h-4 w-4" /></div>
                  <span className="flex-1 text-sm font-medium">{t.label}</span>
                  {theme === t.key && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4 text-primary" /> Language & region</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select value={language} onValueChange={(v) => { setLanguage(v); saveSettings({ language: v }) }}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English (US)</SelectItem>
                    <SelectItem value="en-gb">English (UK)</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="hi">हिन्दी</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={(v) => { setTimezone(v); saveSettings({ timezone: v }) }}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">Pacific Time (UTC−7)</SelectItem>
                    <SelectItem value="et">Eastern Time (UTC−4)</SelectItem>
                    <SelectItem value="ist">India Standard (UTC+5:30)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing — locked */}
        <TabsContent value="billing" className="mt-5">
          <Card className="shadow-soft">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted"><CreditCard className="h-6 w-6 text-muted-foreground" /></div>
              <h3 className="mt-4 text-lg font-semibold">Billing & Payments</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">This feature is coming soon. Direct Refer is currently free for all users.</p>
              <Badge className="mt-4 border border-border bg-muted/50 text-muted-foreground"><Lock className="mr-1 h-3 w-3" /> Coming soon</Badge>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}

function WorkspaceVerificationCard() {
  const [verifyOpen, setVerifyOpen] = useState(false)
  const { status, fetchStatus } = useVerification()
  const { professionalVerified, recruiterVerified } = useAuth()

  useEffect(() => { fetchStatus() }, [])

  return (
    <>
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" /> Work Identity Verification
          </CardTitle>
          <CardDescription>Optional — verify your corporate credentials to earn a verified badge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={cn(
              'rounded-xl border p-4 transition-colors',
              professionalVerified ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-muted',
            )}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Professional</span>
                {professionalVerified ? (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Check className="mr-1 h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    Unverified
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {professionalVerified
                  ? 'You can give referrals, reviews, and mentorship.'
                  : 'Verify to earn a verified badge on your profile.'}
              </p>
            </div>
            <div className={cn(
              'rounded-xl border p-4 transition-colors',
              recruiterVerified ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-muted',
            )}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Recruiter</span>
                {recruiterVerified ? (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Check className="mr-1 h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    Unverified
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {recruiterVerified
                  ? 'You can post jobs and contact candidates.'
                  : 'Verify to earn a verified badge on your profile.'}
              </p>
            </div>
          </div>

          {!professionalVerified && !recruiterVerified && (
            <Button onClick={() => setVerifyOpen(true)} className="gap-2">
              <ShieldCheck className="h-4 w-4" /> Verify Work Identity
            </Button>
          )}
          {status.hasPendingRequest && (
            <p className="text-xs text-muted-foreground">A verification request is pending review.</p>
          )}
        </CardContent>
      </Card>
      <VerificationModal open={verifyOpen} onOpenChange={setVerifyOpen} />
    </>
  )
}
