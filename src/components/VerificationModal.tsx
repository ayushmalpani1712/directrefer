import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BadgeCheck, Building2, CheckCircle2, FileImage, Loader2, Mail, ShieldCheck, Upload, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useVerification, type VerificationTab } from '@/hooks/useVerification'
import { cn } from '@/lib/utils'

interface VerificationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: VerificationTab
}

export function VerificationModal({ open, onOpenChange, defaultTab = 'email_otp' }: VerificationModalProps) {
  const {
    loading, otpSent, otpCode, setOtpCode,
    idCardFile, setIdCardFile, idCardPreview, setIdCardPreview,
    activeTab, setActiveTab, status, fetchStatus, sendOtp, verifyOtp, uploadIdCard, reset,
  } = useVerification()

  const [emailInput, setEmailInput] = useState('')
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      fetchStatus()
      setActiveTab(defaultTab)
      reset()
      setResult(null)
      setEmailInput('')
    }
  }, [open, defaultTab, fetchStatus, setActiveTab, reset])

  const handleSendOtp = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      setResult({ type: 'error', message: 'Please enter a valid email address.' })
      return
    }
    const res = await sendOtp(emailInput)
    if (res.error) {
      setResult({ type: 'error', message: res.error })
    } else {
      setResult({ type: 'success', message: res.message || 'OTP sent!' })
      toast.success('OTP sent! For demo, check the console or use the code shown.')
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setResult({ type: 'error', message: 'Please enter the 6-digit code.' })
      return
    }
    const res = await verifyOtp(otpCode)
    if (res.error) {
      setResult({ type: 'error', message: res.error })
    } else {
      setResult({ type: 'success', message: res.message || 'Verified!' })
      toast.success('Work email verified! Your profile is now verified.')
      setTimeout(() => onOpenChange(false), 1500)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
    if (!allowed.includes(file.type)) {
      setResult({ type: 'error', message: 'Only PNG, JPG, WebP, or PDF files are allowed.' })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setResult({ type: 'error', message: 'File must be under 10MB.' })
      return
    }
    setIdCardFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setIdCardPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmitId = async () => {
    if (!idCardFile) {
      setResult({ type: 'error', message: 'Please select an ID card file.' })
      return
    }
    const res = await uploadIdCard(idCardFile)
    if (res.error) {
      setResult({ type: 'error', message: res.error })
    } else {
      setResult({ type: 'success', message: res.message || 'Submitted!' })
      toast.success('ID card submitted for review.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-5 w-5 text-primary" />
            Verify Work Identity
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Optional — verify your corporate email or employee ID to earn a verified badge on your profile.
          </p>
        </DialogHeader>

        {/* Current status */}
        {status.professionalVerified && (
          <div className="mx-6 mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <BadgeCheck className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Professional workspace verified
            </span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as VerificationTab); setResult(null); reset() }} className="w-full">
          <TabsList className="mx-6 grid w-auto grid-cols-2">
            <TabsTrigger value="email_otp" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Corporate Email
            </TabsTrigger>
            <TabsTrigger value="id_card" className="gap-1.5">
              <FileImage className="h-3.5 w-3.5" /> Company ID Card
            </TabsTrigger>
          </TabsList>

          {/* Email OTP Tab */}
          <TabsContent value="email_otp" className="px-6 pb-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="work-email">Official work email</Label>
                <div className="flex gap-2">
                  <Input
                    id="work-email"
                    type="email"
                    placeholder="name@company.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    disabled={otpSent || loading}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleSendOtp}
                    disabled={otpSent || loading || !emailInput}
                    className="shrink-0"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
                  </Button>
                </div>
                {status.workEmail && !otpSent && (
                  <p className="text-xs text-muted-foreground">
                    Previously verified: {status.workEmail}
                  </p>
                )}
              </div>

              <AnimatePresence>
                {otpSent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="otp-code">Enter 6-digit code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="otp-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        disabled={loading}
                        className="flex-1 font-mono text-lg tracking-[0.3em] text-center"
                      />
                      <Button
                        onClick={handleVerifyOtp}
                        disabled={loading || otpCode.length !== 6}
                        className="shrink-0"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                          <><CheckCircle2 className="mr-1.5 h-4 w-4" /> Verify</>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Code expires in 10 minutes. For this demo, the OTP is shown in the toast notification.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* ID Card Tab */}
          <TabsContent value="id_card" className="px-6 pb-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Upload corporate ID badge or employee badge</Label>
                <div
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors',
                    idCardFile
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-muted-foreground/20 hover:border-muted-foreground/40 cursor-pointer',
                  )}
                  onClick={() => !idCardFile && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {idCardPreview ? (
                    <div className="relative w-full">
                      {idCardFile?.type === 'application/pdf' ? (
                        <div className="flex h-32 items-center justify-center rounded-lg bg-muted">
                          <FileImage className="h-8 w-8 text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">{idCardFile.name}</span>
                        </div>
                      ) : (
                        <img src={idCardPreview} alt="ID Preview" className="mx-auto max-h-40 rounded-lg object-contain" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setIdCardFile(null); setIdCardPreview(null) }}
                        className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow-md hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/60">
                        PNG, JPG, or PDF — Max 10MB
                      </p>
                    </>
                  )}
                </div>
              </div>

              <Button
                onClick={handleSubmitId}
                disabled={loading || !idCardFile}
                className="w-full"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Submit ID for Verification
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Submissions are reviewed by our team within 24-48 hours.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Result message */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'mx-6 mb-6 flex items-center gap-2 rounded-lg px-4 py-3 text-sm',
                result.type === 'success'
                  ? 'border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                  : 'border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400',
              )}
            >
              {result.type === 'success' ? <ShieldCheck className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
              {result.message}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
