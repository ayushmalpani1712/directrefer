import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Copy, Loader2, ShieldCheck, ShieldOff, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const TOTP_LENGTH = 6

interface TwoFactorSetupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TwoFactorSetup({ open, onOpenChange }: TwoFactorSetupProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'setup' | 'verify' | 'done'>('idle')
  const [factorId, setFactorId] = useState('')
  const [totpUri, setTotpUri] = useState('')
  const [totpSecret, setTotpSecret] = useState('')

  const [totpCode, setTotpCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!open || !user) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (cancelled) return
        const hasMfa = data?.nextLevel === 'aal2' || data?.currentLevel === 'aal2'
        if (hasMfa) {
          setEnabled(true)
          setPhase('done')
        } else {
          setEnabled(false)
          setPhase('idle')
        }
      } catch {
        if (!cancelled) {
          setEnabled(false)
          setPhase('idle')
        }
      }
    })()
    return () => { cancelled = true }
  }, [open, user])

  useEffect(() => {
    if (open) {
      setResult(null)
      setTotpCode('')
    }
  }, [open])

  const handleStartSetup = useCallback(async () => {
    setLoading(true)
    setResult(null)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'DirectRefer',
      })
      if (error) throw error
      setFactorId(data.id)
      setTotpUri(data.totp.uri)
      setTotpSecret(data.totp.secret)
      setPhase('setup')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start 2FA setup'
      setResult({ type: 'error', message: msg })
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCopySecret = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(totpSecret)
      setCopied(true)
      toast.success('Secret copied to clipboard.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy.')
    }
  }, [totpSecret])

  const handleVerifyCode = useCallback(async () => {
    if (totpCode.length !== TOTP_LENGTH) {
      setResult({ type: 'error', message: 'Please enter the 6-digit code.' })
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: totpCode,
      })
      if (verifyError) throw verifyError

      setEnabled(true)
      setPhase('done')
      setResult({ type: 'success', message: 'Two-factor authentication enabled!' })
      toast.success('2FA enabled successfully.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed'
      setResult({ type: 'error', message: msg })
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [totpCode, factorId])

  const handleDisable = useCallback(async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) throw error
      setEnabled(false)
      setPhase('idle')
      setFactorId('')
      setTotpUri('')
      setTotpSecret('')
      setResult({ type: 'success', message: 'Two-factor authentication disabled.' })
      toast.success('2FA disabled.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to disable 2FA'
      setResult({ type: 'error', message: msg })
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [factorId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Two-Factor Authentication
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Add an extra layer of security to your account with TOTP-based 2FA.
          </p>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {phase === 'idle' && !enabled && (
            <div className="space-y-4">
              <div className="rounded-lg border border-muted p-4 text-sm text-muted-foreground">
                When enabled, you'll need to enter a code from your authenticator app each time you sign in.
              </div>
              <Button onClick={handleStartSetup} disabled={loading} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Enable 2FA
              </Button>
            </div>
          )}

          {phase === 'setup' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>1. Add this secret to your authenticator app</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-muted px-3 py-2 font-mono text-xs break-all select-all">
                    {totpSecret}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopySecret} className="shrink-0">
                    {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copy this secret into your authenticator app (Google Authenticator, Authy, etc.)
                </p>
              </div>

              {totpUri && (
                <div className="space-y-2">
                  <Label>Or scan this URI</Label>
                  <div className="rounded-lg bg-muted p-3 text-xs font-mono break-all select-all">
                    {totpUri}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>2. Enter the code from your app</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={TOTP_LENGTH}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  className="font-mono text-lg tracking-[0.3em] text-center"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setPhase('idle'); setFactorId(''); setTotpUri(''); setTotpSecret('') }} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleVerifyCode} disabled={loading || totpCode.length !== TOTP_LENGTH} className="flex-1">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Verify & Enable
                </Button>
              </div>
            </motion.div>
          )}

          {(phase === 'done' || enabled) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">2FA is enabled</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Your account is protected with an additional verification step.</p>
                </div>
              </div>
              <Button variant="destructive" onClick={handleDisable} disabled={loading} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldOff className="mr-2 h-4 w-4" />}
                Disable 2FA
              </Button>
            </motion.div>
          )}

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-3 text-sm',
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
        </div>
      </DialogContent>
    </Dialog>
  )
}

export async function checkTwoFactorEnabled(_userId?: string): Promise<boolean> {
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    return data?.nextLevel === 'aal2' || data?.currentLevel === 'aal2'
  } catch {
    return false
  }
}

export async function verifyTwoFactorCode(code: string, factorId: string): Promise<boolean> {
  try {
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    })
    if (challengeError) return false

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    })
    return !verifyError
  } catch {
    return false
  }
}
