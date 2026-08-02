import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, Mail, Send, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/layout'
import { supabase } from '@/lib/supabase'
import { sendPasswordResetOtpEmail } from '@/lib/email'
import { toast } from 'sonner'

type Step = 'email' | 'otp'

const RESEND_COOLDOWN = 60
const OTP_LENGTH = 6

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN)
  const [canResend, setCanResend] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (step !== 'otp' || countdown <= 0) return
    setCanResend(false)
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setCanResend(true)
          clearInterval(timer)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [step, countdown])

  const sendOtp = useCallback(async (targetEmail: string) => {
    setLoading(true)
    try {
      const normalizedEmail = targetEmail.trim().toLowerCase()

      // Invalidate old OTPs
      await supabase
        .from('password_reset_otps')
        .update({ used: true })
        .eq('email', normalizedEmail)
        .eq('used', false)

      // Generate and store OTP
      const otpCode = generateOtp()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      const { error: insertError } = await supabase
        .from('password_reset_otps')
        .insert({ email: normalizedEmail, otp: otpCode, expires_at: expiresAt })

      if (insertError) {
        toast.error('Failed to generate OTP. Please try again.')
        return
      }

      // Send OTP email
      sendPasswordResetOtpEmail(normalizedEmail, otpCode).catch(() => {})

      setStep('otp')
      setCountdown(RESEND_COOLDOWN)
      setCanResend(false)
      setOtp(new Array(OTP_LENGTH).fill(''))
      toast.success('OTP sent to your email')
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleEmailSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }
    await sendOtp(email.trim())
  }

  const handleResend = async () => {
    if (!canResend) return
    await sendOtp(email.trim())
  }

  const verifyOtp = useCallback(async (otpCode: string) => {
    setVerifying(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()

      // Query for valid OTP
      const { data, error } = await supabase
        .from('password_reset_otps')
        .select('id')
        .eq('email', normalizedEmail)
        .eq('otp', otpCode)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        toast.error('Invalid or expired OTP')
        setOtp(new Array(OTP_LENGTH).fill(''))
        otpRefs.current[0]?.focus()
        return
      }

      // Mark OTP as used
      await supabase
        .from('password_reset_otps')
        .update({ used: true })
        .eq('id', data.id)

      // Generate reset token
      const tokenBytes = new Uint8Array(32)
      crypto.getRandomValues(tokenBytes)
      const resetToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')

      // Store token (1 hour expiry)
      const tokenExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      await supabase
        .from('password_reset_otps')
        .insert({ email: normalizedEmail, otp: `token:${resetToken}`, expires_at: tokenExpires })

      // Redirect to reset page
      window.location.href = `/reset-password?email=${encodeURIComponent(normalizedEmail)}&token=${resetToken}`
    } catch {
      toast.error('Verification failed. Please try again.')
      setOtp(new Array(OTP_LENGTH).fill(''))
      otpRefs.current[0]?.focus()
    } finally {
      setVerifying(false)
    }
  }, [email])

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus()
    }

    if (newOtp.every((d) => d !== '')) {
      verifyOtp(newOtp.join(''))
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (pasted.length === OTP_LENGTH) {
      const newOtp = pasted.split('')
      setOtp(newOtp)
      otpRefs.current[OTP_LENGTH - 1]?.focus()
      verifyOtp(pasted)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-10 shadow-lg"
      >
        <div className="mb-6 flex justify-center"><Logo /></div>

        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Send className="h-8 w-8 text-primary" />
              </div>
              <h1 className="mt-6 text-center text-2xl font-bold text-foreground">Forgot your password?</h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Enter your email and we'll send you a one-time code.
              </p>
              <form onSubmit={handleEmailSubmit} className="mt-8 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 bg-background text-foreground"
                    autoFocus
                    autoComplete="email"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-10 w-full rounded-lg bg-[#4F7CFF] font-semibold text-white hover:bg-[#4F7CFF]/90"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  {loading ? 'Sending…' : 'Send OTP'}
                </Button>
              </form>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <KeyRound className="h-8 w-8 text-primary" />
              </div>
              <h1 className="mt-6 text-center text-2xl font-bold text-foreground">Enter verification code</h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                We sent a 6-digit code to
              </p>
              <p className="text-center text-sm font-medium text-foreground break-all">{email}</p>

              <div className="mt-8 flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    disabled={verifying}
                    className="h-12 w-10 rounded-lg border border-border bg-background text-center text-lg font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {verifying && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying…
                </div>
              )}

              <div className="mt-6 rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Didn't receive it? Check your spam folder, or wait{' '}
                  <span className="font-medium text-foreground">
                    {canResend ? '0' : `${countdown}s`}
                  </span>{' '}
                  to resend.
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <Button
                  onClick={handleResend}
                  disabled={!canResend || loading}
                  variant="outline"
                  className="h-10 rounded-lg font-semibold"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {canResend ? 'Resend OTP' : `Resend in ${countdown}s`}
                </Button>
                <Button
                  onClick={() => { setStep('email'); setOtp(new Array(OTP_LENGTH).fill('')) }}
                  variant="ghost"
                  className="h-10 rounded-lg font-semibold"
                >
                  Try a different email
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Link
          to="/login"
          className="mt-6 inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline w-full"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </motion.div>
    </div>
  )
}
