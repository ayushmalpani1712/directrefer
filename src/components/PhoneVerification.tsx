import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, Phone, ShieldCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const COUNTRY_CODES = [
  { code: '+1', country: 'US', label: 'United States' },
  { code: '+44', country: 'GB', label: 'United Kingdom' },
  { code: '+91', country: 'IN', label: 'India' },
  { code: '+61', country: 'AU', label: 'Australia' },
  { code: '+1', country: 'CA', label: 'Canada' },
  { code: '+49', country: 'DE', label: 'Germany' },
  { code: '+33', country: 'FR', label: 'France' },
  { code: '+81', country: 'JP', label: 'Japan' },
  { code: '+86', country: 'CN', label: 'China' },
  { code: '+55', country: 'BR', label: 'Brazil' },
] as const

interface PhoneVerificationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function PhoneVerification({ open, onOpenChange, onSuccess }: PhoneVerificationProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [countryCode, setCountryCode] = useState('+1')
  const [phone, setPhone] = useState('')
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [cooldown, setCooldown] = useState(0)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  useEffect(() => {
    if (open) {
      setOtpSent(false)
      setOtpDigits(['', '', '', '', '', ''])
      setResult(null)
      setPhone('')
      setCooldown(0)
    }
  }, [open])

  const fullPhone = useMemo(() => `${countryCode}${phone.replace(/\D/g, '')}`, [countryCode, phone])

  const handleSendOtp = useCallback(async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 6) {
      setResult({ type: 'error', message: 'Please enter a valid phone number.' })
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone })
      if (error) throw error
      setOtpSent(true)
      setCooldown(60)
      toast.success('OTP sent to your phone number.')
      setResult({ type: 'success', message: 'Code sent! Check your phone.' })
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP'
      setResult({ type: 'error', message: msg })
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [phone, fullPhone])

  const handleVerifyOtp = useCallback(async () => {
    const code = otpDigits.join('')
    if (code.length !== 6) {
      setResult({ type: 'error', message: 'Please enter the 6-digit code.' })
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: fullPhone, token: code, type: 'sms' })
      if (error) throw error

      if (user) {
        await supabase.from('users').update({ phone_verified: true, mobile: fullPhone }).eq('id', user.id)
      }

      setResult({ type: 'success', message: 'Phone number verified!' })
      toast.success('Phone number verified successfully.')
      setTimeout(() => {
        onOpenChange(false)
        onSuccess?.()
      }, 1200)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed'
      setResult({ type: 'error', message: msg })
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [otpDigits, fullPhone, user, onOpenChange, onSuccess])

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1)
    if (!/^\d*$/.test(value)) return

    const newDigits = [...otpDigits]
    newDigits[index] = value
    setOtpDigits(newDigits)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }, [otpDigits])

  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }, [otpDigits])

  const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const newDigits = pasted.split('').concat(Array(6).fill('')).slice(0, 6)
    setOtpDigits(newDigits)
    const nextEmpty = newDigits.findIndex((d) => !d)
    inputRefs.current[nextEmpty === -1 ? 5 : Math.min(nextEmpty, 5)]?.focus()
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Phone className="h-5 w-5 text-primary" />
            Verify Phone Number
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Add your phone number for account recovery and SMS notifications.
          </p>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          <div className="space-y-2">
            <Label>Phone number</Label>
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode} disabled={otpSent || loading}>
                <SelectTrigger className="w-[120px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map((c) => (
                    <SelectItem key={`${c.code}-${c.country}`} value={c.code}>
                      {c.country} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s\-()]/g, ''))}
                disabled={otpSent || loading}
                className="flex-1"
              />
            </div>
          </div>

          {!otpSent ? (
            <Button onClick={handleSendOtp} disabled={loading || !phone} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
              Send Verification Code
            </Button>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <Label>Enter 6-digit code</Label>
                <div className="flex justify-between gap-2">
                  {otpDigits.map((digit, i) => (
                    <Input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      disabled={loading}
                      className="w-11 h-12 text-center font-mono text-lg"
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleVerifyOtp}
                    disabled={loading || otpDigits.join('').length !== 6}
                    className="flex-1"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Verify
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSendOtp}
                    disabled={loading || cooldown > 0}
                    className="shrink-0"
                  >
                    {cooldown > 0 ? `${cooldown}s` : 'Resend'}
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
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
