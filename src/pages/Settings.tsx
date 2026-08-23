import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  BadgeCheck, Bell, Building2, Check, CreditCard, FileImage, Globe, KeyRound, Laptop, Lock, Mail, Monitor, Palette,
  ShieldCheck, Trash2, Upload, User, X, Zap, Loader2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SectionHeader } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Session {
  id: string
  device: string
  isCurrent: boolean
}

function useVerification() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [idCardFile, setIdCardFile] = useState<File | null>(null)
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('email_otp')
  const [status, setStatus] = useState({
    professionalVerified: false,
    recruiterVerified: false,
    workEmailVerified: false,
    workEmail: null as string | null,
    workVerificationMethod: null as string | null,
    idCardUrl: null as string | null,
    hasPendingRequest: false,
  })

  const fetchStatus = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('users')
        .select('professional_verified, recruiter_verified, work_email_verified, work_email, work_verification_method, id_card_url')
        .eq('id', user.id)
        .maybeSingle()
      if (!data) {
        setStatus({
          professionalVerified: false, recruiterVerified: false, workEmailVerified: false,
          workEmail: null, workVerificationMethod: null, idCardUrl: null, hasPendingRequest: false,
        })
        return
      }
      const { count } = await supabase
        .from('verification_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending')
      setStatus({
        professionalVerified: data.professional_verified ?? false,
        recruiterVerified: data.recruiter_verified ?? false,
        workEmailVerified: data.work_email_verified ?? false,
        workEmail: data.work_email ?? null,
        workVerificationMethod: data.work_verification_method ?? null,
        idCardUrl: data.id_card_url ?? null,
        hasPendingRequest: (count ?? 0) > 0,
      })
    } catch (err) {
      console.error('Failed to fetch verification status:', err)
    }
  }, [user])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const sendOtp = useCallback(async (email: string) => {
    if (!user) return { error: 'Not authenticated' }
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('send_work_email_otp', { p_user_id: user.id, p_email: email })
      if (error) throw error
      return data?.success
        ? (setOtpSent(true), setWorkEmail(email), { success: true, message: data.message })
        : { error: data?.message || 'Failed to send OTP' }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to send OTP' }
    } finally {
      setLoading(false)
    }
  }, [user])

  const verifyOtp = useCallback(async (code: string) => {
    if (!user) return { error: 'Not authenticated' }
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('verify_work_email_otp', { p_user_id: user.id, p_code: code })
      if (error) throw error
      return data?.success
        ? (setOtpSent(false), setOtpCode(''), setWorkEmail(''), await fetchStatus(), { success: true, message: data.message })
        : { error: data?.message || 'Verification failed' }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Verification failed' }
    } finally {
      setLoading(false)
    }
  }, [user, fetchStatus])

  const uploadIdCard = useCallback(async (file: File) => {
    if (!user) return { error: 'Not authenticated' }
    setLoading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/id-card-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('id-cards')
        .upload(path, file, { contentType: file.type, upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData, error: urlError } = await supabase.storage
        .from('id-cards')
        .createSignedUrl(path, 3600)
      if (urlError || !urlData?.signedUrl) throw new Error('Failed to get upload URL')
      const { error: insertError } = await supabase
        .from('verification_requests')
        .insert({ user_id: user.id, type: 'id_card', id_card_url: urlData.signedUrl, status: 'pending' })
      if (insertError) throw insertError
      await fetchStatus()
      return { success: true, message: 'ID card submitted for review. You will be notified once approved.' }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Upload failed' }
    } finally {
      setLoading(false)
    }
  }, [user, fetchStatus])

  const reset = useCallback(() => {
    setLoading(false)
    setOtpSent(false)
    setOtpCode('')
    setWorkEmail('')
    setIdCardFile(null)
    setIdCardPreview(null)
  }, [])

  return {
    loading, otpSent, otpCode, setOtpCode, workEmail, setWorkEmail,
    idCardFile, setIdCardFile, idCardPreview, setIdCardPreview,
    activeTab, setActiveTab, status, fetchStatus, sendOtp, verifyOtp, uploadIdCard, reset,
  }
}

function VerificationModal({
  open,
  onOpenChange,
  defaultTab = 'email_otp',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: string
}) {
  const {
    loading, otpSent, otpCode, setOtpCode, idCardFile, setIdCardFile,
    idCardPreview, setIdCardPreview, activeTab, setActiveTab,
    status, fetchStatus, sendOtp, verifyOtp, uploadIdCard, reset,
  } = useVerification()

  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      fetchStatus()
      setActiveTab(defaultTab)
      reset()
      setMessage(null)
      setEmail('')
    }
  }, [open, defaultTab, fetchStatus, setActiveTab, reset])

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      setMessage({ type: 'error', message: 'Please enter a valid email address.' })
      return
    }
    const result = await sendOtp(email)
    if (result.error) {
      setMessage({ type: 'error', message: result.error })
    } else {
      setMessage({ type: 'success', message: result.message || 'OTP sent!' })
      toast.success('OTP sent! For demo, check the console or use the code shown.')
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setMessage({ type: 'error', message: 'Please enter the 6-digit code.' })
      return
    }
    const result = await verifyOtp(otpCode)
    if (result.error) {
      setMessage({ type: 'error', message: result.error })
    } else {
      setMessage({ type: 'success', message: result.message || 'Verified!' })
      toast.success('Work email verified! Your profile is now verified.')
      setTimeout(() => onOpenChange(false), 1500)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'].includes(file.type)) {
      setMessage({ type: 'error', message: 'Only PNG, JPG, WebP, or PDF files are allowed.' })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', message: 'File must be under 10MB.' })
      return
    }
    setIdCardFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setIdCardPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmitId = async () => {
    if (!idCardFile) {
      setMessage({ type: 'error', message: 'Please select an ID card file.' })
      return
    }
    const result = await uploadIdCard(idCardFile)
    if (result.error) {
      setMessage({ type: 'error', message: result.error })
    } else {
      setMessage({ type: 'success', message: result.message || 'Submitted!' })
      toast.success('ID card submitted for review.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-5 w-5 text-primary" /> Verify Work Identity
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Optional — verify your corporate email or employee ID to earn a verified badge on your profile.
          </p>
        </DialogHeader>

        {status.professionalVerified && (
          <div className="mx-6 mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <BadgeCheck className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Professional workspace verified</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); setMessage(null); reset() }} className="w-full">
          <TabsList className="mx-6 grid w-auto grid-cols-2">
            <TabsTrigger value="email_otp" className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Corporate Email</TabsTrigger>
            <TabsTrigger value="id_card" className="gap-1.5"><FileImage className="h-3.5 w-3.5" /> Company ID Card</TabsTrigger>
          </TabsList>

          <TabsContent value="email_otp" className="px-6 pb-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="work-email">Official work email</Label>
                <div className="flex gap-2">
                  <Input id="work-email" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={otpSent || loading} className="flex-1" />
                  <Button variant="outline" onClick={handleSendOtp} disabled={otpSent || loading || !email} className="shrink-0">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
                  </Button>
                </div>
                {status.workEmail && !otpSent && (
                  <p className="text-xs text-muted-foreground">Previously verified: {status.workEmail}</p>
                )}
              </div>

              <AnimatePresence>
                {otpSent && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                    <Label htmlFor="otp-code">Enter 6-digit code</Label>
                    <div className="flex gap-2">
                      <Input id="otp-code" type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} disabled={loading} className="flex-1 font-mono text-lg tracking-[0.3em] text-center" />
                      <Button onClick={handleVerifyOtp} disabled={loading || otpCode.length !== 6} className="shrink-0">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-1.5 h-4 w-4" /> Verify</>}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Code expires in 10 minutes. For this demo, the OTP is shown in the toast notification.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="id_card" className="px-6 pb-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Upload corporate ID badge or employee badge</Label>
                <div className={cn('relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors', idCardFile ? 'border-primary/40 bg-primary/5' : 'border-muted-foreground/20 hover:border-muted-foreground/40 cursor-pointer')} onClick={() => !idCardFile && fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
                  {idCardPreview ? (
                    <div className="relative w-full">
                      {idCardFile?.type === 'application/pdf' ? (
                        <div className="flex h-32 items-center justify-center rounded-lg bg-muted">
                          <FileImage className="h-8 w-8 text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">{idCardFile.name}</span>
                        </div>
                      ) : (
                        <img src={idCardPreview} alt="ID Preview" className="mx-auto max-h-40 rounded-lg object-contain" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setIdCardFile(null); setIdCardPreview(null) }} className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow-md hover:bg-muted">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">Click to upload or drag and drop</p>
                      <p className="mt-1 text-xs text-muted-foreground/60">PNG, JPG, or PDF — Max 10MB</p>
                    </>
                  )}
                </div>
              </div>
              <Button onClick={handleSubmitId} disabled={loading || !idCardFile} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Submit ID for Verification
              </Button>
              <p className="text-xs text-muted-foreground text-center">Submissions are reviewed by our team within 24-48 hours.</p>
            </div>
          </TabsContent>
        </Tabs>

        <AnimatePresence>
          {message && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn('mx-6 mb-6 flex items-center gap-2 rounded-lg px-4 py-3 text-sm', message.type === 'success' ? 'border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' : 'border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400')}>
              {message.type === 'success' ? <ShieldCheck className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
              {message.message}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-6 py-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {desc && <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function Settings() {
  const { role, student, logout } = useApp()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'workspace'
  const setActiveTab = (t: string) => setSearchParams({ tab: t }, { replace: true })
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNew, setConfirmNew] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({
    referral_updates: true, new_messages: true, profile_views: true,
    completion_reminders: true, product_announcements: false, weekly_digest: false, email_opt_out: false,
  })
  const [privacy, setPrivacy] = useState({
    public_profile: true, show_salary: false, activity_status: true, search_indexing: false,
  })
  const [language, setLanguage] = useState('en')
  const [timezone, setTimezone] = useState('ist')

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
            device: `${device} \u00b7 ${city}`,
            isCurrent: true,
          }])
        }
      } catch {
        setSessions([{ id: 'current', device: 'Current session', isCurrent: true }])
      }
    }
    loadSecurity()
  }, [])

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
    <>
    <div className="mx-auto max-w-4xl min-w-0 overflow-x-hidden space-y-6">

      <SectionHeader title="Settings" subtitle="Manage your account, preferences and security" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="workspace"><Building2 className="mr-1.5 h-4 w-4" /> Workspace</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-1.5 h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="privacy"><Lock className="mr-1.5 h-4 w-4" /> Privacy</TabsTrigger>
          <TabsTrigger value="security"><ShieldCheck className="mr-1.5 h-4 w-4" /> Security</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="mr-1.5 h-4 w-4" /> Appearance</TabsTrigger>
          <TabsTrigger value="billing" className="opacity-50 pointer-events-none"><CreditCard className="mr-1.5 h-4 w-4" /> Billing <Lock className="ml-1 h-3 w-3" /></TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="mt-5 space-y-5">
          <WorkspaceVerificationCard />
        </TabsContent>

        <TabsContent value="notifications" className="mt-5">
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Notification preferences</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border">
              {([
                { key: 'referral_updates' as const, t: 'Referral status updates', d: 'Accepted, declined, review started \u2014 instantly', icon: Zap },
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

        <TabsContent value="security" className="mt-5 space-y-5">
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Password</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5"><Label>Current password</Label><Input type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>New password</Label><Input type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Confirm new</Label><Input type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" value={confirmNew} onChange={(e) => setConfirmNew(e.target.value)} /></div>
              <div><Button className="mt-1" onClick={handleUpdatePassword} disabled={passwordLoading}><KeyRound className="mr-1.5 h-4 w-4" /> {passwordLoading ? 'Updating...' : 'Update password'}</Button></div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Active sessions</CardTitle></CardHeader>
            <CardContent>
              {sessions.map((s) => (
                <div key={s.id} className="flex min-w-0 items-center justify-between rounded-lg border border-border px-3.5 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2 truncate"><Laptop className="h-4 w-4 shrink-0 text-muted-foreground" /> <span className="truncate">{s.device}</span></span>
                  {s.isCurrent ? <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10">This device</Badge> : <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-500" onClick={() => {
                    toast.info('To revoke all other sessions, change your password below. All sessions will be invalidated.')
                    setActiveTab('security')
                  }}>Revoke</Button>}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="shadow-soft border-rose-500/30">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base text-rose-500"><Trash2 className="h-4 w-4" /> Danger zone</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <p className="min-w-0 text-sm text-muted-foreground">Permanently delete your account and all referral history. This cannot be undone.</p>
              <Button variant="outline" className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10" disabled={deleting} onClick={() => {
                if (role === 'admin') { toast.error('Admin accounts cannot be self-deleted. Contact another admin.'); return }
                setDeleteDialogOpen(true)
              }}>{deleting ? 'Deleting...' : 'Delete account'}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-5 space-y-5">
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4 text-primary" /> Language & region</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select value={language} onValueChange={(v) => { setLanguage(v); saveSettings({ language: v }) }}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English (US)</SelectItem>
                    <SelectItem value="en-gb">English (UK)</SelectItem>
                    <SelectItem value="es">Espa\u00f1ol</SelectItem>
                    <SelectItem value="hi">\u0939\u093f\u0928\u094d\u0926\u0940</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={(v) => { setTimezone(v); saveSettings({ timezone: v }) }}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">Pacific Time (UTC\u22127)</SelectItem>
                    <SelectItem value="et">Eastern Time (UTC\u22124)</SelectItem>
                    <SelectItem value="ist">India Standard (UTC+5:30)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
    <ConfirmDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      title="Delete account"
      description="This will permanently delete your account and all data. This action cannot be undone."
      confirmLabel="Delete"
      onConfirm={async () => {
        setDeleting(true)
        try {
          const userId = (await supabase.auth.getUser()).data.user?.id
          if (!userId) { toast.error('Not authenticated'); return }
          const tables = ['notifications', 'bookmarks', 'messages', 'conversations', 'referrals', 'reports', 'admin_logs', 'profiles_job_seeker', 'profiles_professional', 'profiles_recruiter']
          const errors: string[] = []
          for (const table of tables) {
            const { error } = table === 'conversations'
              ? await supabase.from(table).delete().or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
              : table === 'referrals'
              ? await supabase.from(table).delete().or(`requester_id.eq.${userId},professional_id.eq.${userId}`)
              : table === 'reports'
              ? await supabase.from(table).delete().eq('reporter_id', userId)
              : table === 'admin_logs'
              ? await supabase.from(table).delete().eq('admin_id', userId)
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
      }}
    />
    </>
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
              'min-w-0 rounded-xl border p-4 transition-colors',
              professionalVerified ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-muted',
            )}>
              <div className="flex min-w-0 items-center justify-between">
                <span className="truncate text-sm font-medium">Professional</span>
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
              'min-w-0 rounded-xl border p-4 transition-colors',
              recruiterVerified ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-muted',
            )}>
              <div className="flex min-w-0 items-center justify-between">
                <span className="truncate text-sm font-medium">Recruiter</span>
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
