import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Copy, Loader2, ShieldCheck, ShieldOff, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const LS_2FA_KEY = 'dr_2fa_enabled'
const LS_2FA_SECRET_KEY = 'dr_2fa_secret'
const LS_2FA_USER_KEY = 'dr_2fa_user'
const TOTP_PERIOD = 30
const TOTP_LENGTH = 6

function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let secret = ''
  const arr = new Uint8Array(20)
  crypto.getRandomValues(arr)
  for (let i = 0; i < 20; i++) {
    secret += chars[arr[i] % 32]
  }
  return secret
}

function generateTotpUri(secret: string, email: string): string {
  const encodedEmail = encodeURIComponent(email)
  const encodedSecret = encodeURIComponent(secret)
  return `otpauth://totp/DirectRefer:${encodedEmail}?secret=${encodedSecret}&issuer=DirectRefer&algorithm=SHA1&digits=${TOTP_LENGTH}&period=${TOTP_PERIOD}`
}

function computeTotp(secret: string, timeStep = TOTP_PERIOD): Promise<string> {
  const epoch = Math.floor(Date.now() / 1000)
  const counter = Math.floor(epoch / timeStep)
  const counterHex = counter.toString(16).padStart(16, '0')
  const counterBytes = new Uint8Array(8)
  for (let i = 0; i < 8; i++) {
    counterBytes[i] = parseInt(counterHex.slice(i * 2, i * 2 + 2), 16)
  }
  const secretBytes = base32Decode(secret)
  const combined = new Uint8Array(secretBytes.length + counterBytes.length)
  combined.set(secretBytes)
  combined.set(counterBytes, secretBytes.length)

  return crypto.subtle.importKey('raw', combined, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
    .then((key) => crypto.subtle.sign('HMAC', key, combined))
    .then((buf) => {
      const hash = new Uint8Array(buf)
      const offset = hash[hash.length - 1] & 0x0f
      const binary = ((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16) | ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff)
      return String(binary % 10 ** TOTP_LENGTH).padStart(TOTP_LENGTH, '0')
    })
}

function base32Decode(str: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const c of str.toUpperCase()) {
    const val = chars.indexOf(c)
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8))
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2)
  }
  return bytes
}

interface TwoFactorSetupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TwoFactorSetup({ open, onOpenChange }: TwoFactorSetupProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'setup' | 'verify' | 'done'>('idle')
  const [secret, setSecret] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    try {
      const is2FAEnabled = localStorage.getItem(LS_2FA_KEY) === 'true'
      const savedUser = localStorage.getItem(LS_2FA_USER_KEY)
      setEnabled(is2FAEnabled && savedUser === user?.id)
    } catch {
      setEnabled(false)
    }
  }, [user])

  useEffect(() => {
    if (open) {
      setResult(null)
      setTotpCode('')
      if (enabled) {
        setPhase('done')
      } else {
        setPhase('idle')
      }
    }
  }, [open, enabled])

  const handleStartSetup = useCallback(() => {
    const newSecret = generateSecret()
    setSecret(newSecret)
    setPhase('setup')
  }, [])

  const secretUri = useMemo(() => {
    if (!secret || !user?.email) return ''
    return generateTotpUri(secret, user.email)
  }, [secret, user])

  const handleCopySecret = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      toast.success('Secret copied to clipboard.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy.')
    }
  }, [secret])

  const handleVerifyCode = useCallback(async () => {
    if (totpCode.length !== TOTP_LENGTH) {
      setResult({ type: 'error', message: 'Please enter the 6-digit code.' })
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const validCode = await computeTotp(secret)
      if (totpCode !== validCode) {
        throw new Error('Invalid code. Please try again.')
      }

      try {
        localStorage.setItem(LS_2FA_KEY, 'true')
        localStorage.setItem(LS_2FA_SECRET_KEY, secret)
        if (user?.id) localStorage.setItem(LS_2FA_USER_KEY, user.id)
      } catch { /* ignore */ }

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
  }, [totpCode, secret, user])

  const handleDisable = useCallback(async () => {
    setLoading(true)
    try {
      try {
        localStorage.removeItem(LS_2FA_KEY)
        localStorage.removeItem(LS_2FA_SECRET_KEY)
        localStorage.removeItem(LS_2FA_USER_KEY)
      } catch { /* ignore */ }
      setEnabled(false)
      setPhase('idle')
      setSecret('')
      setResult({ type: 'success', message: 'Two-factor authentication disabled.' })
      toast.success('2FA disabled.')
    } finally {
      setLoading(false)
    }
  }, [])

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
              <Button onClick={handleStartSetup} className="w-full">
                <ShieldCheck className="mr-2 h-4 w-4" />
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
                    {secret}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopySecret} className="shrink-0">
                    {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copy this secret into your authenticator app (Google Authenticator, Authy, etc.)
                </p>
              </div>

              {secretUri && (
                <div className="space-y-2">
                  <Label>Or scan this URI</Label>
                  <div className="rounded-lg bg-muted p-3 text-xs font-mono break-all select-all">
                    {secretUri}
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
                <Button variant="outline" onClick={() => { setPhase('idle'); setSecret('') }} className="flex-1">
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

export function checkTwoFactorEnabled(userId?: string): boolean {
  try {
    const enabled = localStorage.getItem(LS_2FA_KEY) === 'true'
    const savedUser = localStorage.getItem(LS_2FA_USER_KEY)
    return enabled && (!userId || savedUser === userId)
  } catch {
    return false
  }
}

export async function verifyTwoFactorCode(code: string, userId?: string): Promise<boolean> {
  try {
    const savedUser = localStorage.getItem(LS_2FA_USER_KEY)
    if (userId && savedUser !== userId) return false

    const secret = localStorage.getItem(LS_2FA_SECRET_KEY)
    if (!secret) return false

    const validCode = await computeTotp(secret)
    return code === validCode
  } catch {
    return false
  }
}
