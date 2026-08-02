import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import {
  Bell, Check, CreditCard, Globe, KeyRound, Laptop, Lock, Mail, Monitor, Moon, Palette,
  ShieldCheck, Smartphone, Sun, Trash2, User, Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionHeader } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { ROLE_META } from '@/data/mock'
import { fetchNotificationPreferences, updateNotificationPreferences, type NotificationPreferences } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

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
  const { role, student, updateStudent } = useApp()
  const { theme, setTheme } = useTheme()
  const [twoFA, setTwoFA] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([
    { id: 's1', device: 'MacBook Pro · San Francisco, CA', isCurrent: true },
    { id: 's2', device: 'iPhone 17 · San Francisco, CA', isCurrent: false },
    { id: 's3', device: 'Chrome on Windows · Seattle, WA', isCurrent: false },
  ])
  const [name, setName] = useState(student.name)
  const [email, setEmail] = useState(student.email)
  const [location, setLocation] = useState(student.location)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNew, setConfirmNew] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    referral_updates: true, new_messages: true, profile_views: true,
    completion_reminders: true, product_announcements: false, weekly_digest: false, email_opt_out: false,
  })

  useEffect(() => {
    fetchNotificationPreferences().then(setNotifPrefs)
  }, [])

  const handleNotifPrefChange = async (key: keyof NotificationPreferences, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value }
    setNotifPrefs(updated)
    const ok = await updateNotificationPreferences({ [key]: value })
    if (ok) {
      toast.success('Preference saved')
    } else {
      toast.error('Failed to save preference')
    }
  }

  const handleSaveProfile = () => {
    updateStudent({ name, email, location })
    toast.success('Profile updated successfully')
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
      <SectionHeader title="Settings" subtitle="Manage your account, preferences and security" />

      <Tabs defaultValue="profile">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="profile"><User className="mr-1.5 h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-1.5 h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="privacy"><Lock className="mr-1.5 h-4 w-4" /> Privacy</TabsTrigger>
          <TabsTrigger value="security"><ShieldCheck className="mr-1.5 h-4 w-4" /> Security</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="mr-1.5 h-4 w-4" /> Appearance</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="mr-1.5 h-4 w-4" /> Billing</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-5 space-y-5">
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Personal information</CardTitle><CardDescription>Shown on your public {ROLE_META[role].label.toLowerCase()} profile</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Role</Label><Input value={ROLE_META[role].label} disabled /></div>
              <div className="sm:col-span-2"><Button onClick={handleSaveProfile}>Save changes</Button></div>
            </CardContent>
          </Card>
          <Card className="shadow-soft border-rose-500/30">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base text-rose-500"><Trash2 className="h-4 w-4" /> Danger zone</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-muted-foreground">Permanently delete your account and all referral history. This cannot be undone.</p>
              <Button variant="outline" className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10" onClick={() => toast.error('Account deletion requires email confirmation')}>Delete account</Button>
            </CardContent>
          </Card>
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
              <Row title="Public profile" desc="Appear in search results for professionals and recruiters"><Switch defaultChecked /></Row>
              <Row title="Show salary expectations" desc="Visible to verified recruiters only"><Switch /></Row>
              <Row title="Activity status" desc="Show when you're online in messages"><Switch defaultChecked /></Row>
              <Row title="Search engine indexing" desc="Allow your public profile to appear on Google"><Switch /></Row>
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
            <CardHeader><CardTitle className="text-base">Two-factor authentication</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"><Smartphone className="h-5 w-5" /></div>
                  <div>
                    <div className="text-sm font-semibold">Authenticator app</div>
                    <div className="text-xs text-muted-foreground">{twoFA ? 'Enabled — codes from your authenticator app' : 'Add an extra layer of security'}</div>
                  </div>
                </div>
                <Switch checked={twoFA} onCheckedChange={(v) => { setTwoFA(v); toast.success(v ? '2FA enabled' : '2FA disabled') }} />
              </div>
              <Separator className="my-4" />
              <div className="text-sm font-medium">Active sessions</div>
              {sessions.map((s) => (
                <div key={s.id} className="mt-2.5 flex items-center justify-between rounded-lg border border-border px-3.5 py-2.5 text-sm">
                  <span className="flex items-center gap-2"><Laptop className="h-4 w-4 text-muted-foreground" /> {s.device}</span>
                  {s.isCurrent ? <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10">This device</Badge> : <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-500" onClick={() => { setSessions((prev) => prev.filter((sess) => sess.id !== s.id)); toast.success('Session revoked') }}>Revoke</Button>}
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
                <Select defaultValue="en"><SelectTrigger><SelectValue /></SelectTrigger>
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
                <Select defaultValue="pt"><SelectTrigger><SelectValue /></SelectTrigger>
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

        {/* Billing */}
        <TabsContent value="billing" className="mt-5 space-y-5">
          <Card className="overflow-hidden border-0 bg-gradient-to-r from-[#3B5FE5] to-[#8B8FD4] text-white shadow-glow">
            <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
              <div>
                <Badge className="border-0 bg-white/20 text-white hover:bg-white/20">Current plan</Badge>
                <div className="font-display mt-2 text-2xl font-bold">Premium · $12/mo</div>
                <div className="mt-1 text-sm text-white/70">Unlimited referral requests · AI resume review · Priority messaging</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10" onClick={() => toast.info('Opening billing portal — you can manage your plan, update payment methods, and view invoices here.')}>Manage</Button>
                <Button className="bg-white text-[#3B5FE5] hover:bg-white/90" onClick={() => toast.success('Upgraded to Premium+')}>Upgrade</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Payment method</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-14 items-center justify-center rounded-md bg-gradient-to-br from-slate-700 to-slate-900 text-[10px] font-bold italic text-white">VISA</div>
                  <div>
                    <div className="text-sm font-medium">Visa ···· 4242</div>
                    <div className="text-xs text-muted-foreground">Expires 08/28</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast.info('Update your payment method — add a new card, update your billing address, or set a default payment option.')}>Update</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Billing history</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {['Jul 1, 2026', 'Jun 1, 2026', 'May 1, 2026'].map((d) => (
                <div key={d} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
                  <span>{d}</span>
                  <span className="text-muted-foreground">Premium monthly</span>
                  <span className="font-semibold">$12.00</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => toast.success('Invoice downloaded')}>Invoice</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
