import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { motion } from 'framer-motion'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/layout'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++

  if (score <= 1) return { score, label: 'Weak', color: 'bg-rose-500' }
  if (score <= 2) return { score, label: 'Fair', color: 'bg-amber-500' }
  if (score <= 3) return { score, label: 'Good', color: 'bg-blue-500' }
  return { score, label: 'Strong', color: 'bg-emerald-500' }
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [validToken, setValidToken] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const [otpToken, setOtpToken] = useState('')

  useEffect(() => {
    const email = searchParams.get('email')
    const token = searchParams.get('token')
    if (email && token) {
      setOtpEmail(email)
      setOtpToken(token)
      setValidToken(true)
      return
    }

    // Legacy hash fragment flow (Supabase magic link)
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      const tokenStr = hash.substring(1)
      const params = new URLSearchParams(tokenStr)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      if (type !== 'recovery' || !accessToken || !refreshToken) {
        setError('Invalid or expired reset link. Please request a new one.')
        return
      }

      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error: sessionError }) => {
        if (sessionError) {
          setError('Invalid or expired reset link. Please request a new one.')
        } else {
          setValidToken(true)
        }
      })
      return
    }

    setError('No reset token found. Please request a new link from the login page.')
  }, [searchParams])

  const strength = getPasswordStrength(password)
  const passwordsMatch = password.length > 0 && password === confirmPassword

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!password || !confirmPassword) {
      toast.error('Please fill in both fields')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      if (otpEmail && otpToken) {
        // OTP flow: call serverless function
        const res = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: otpEmail, token: otpToken, newPassword: password }),
        })
        const data = await res.json()
        if (!data.ok) {
          toast.error(data.error || 'Failed to update password')
          return
        }
      } else {
        // Legacy flow: use Supabase session
        const { error } = await supabase.auth.updateUser({ password })
        if (error) {
          toast.error(error.message)
          return
        }
      }

      setSuccess(true)
      toast.success('Password updated!')
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch {
      toast.error('Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-lg">
          <div className="mb-6 flex justify-center"><Logo /></div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-foreground">Reset link invalid</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to="/forgot-password"
              className="inline-flex items-center justify-center rounded-lg bg-[#4F7CFF] px-6 py-2.5 text-sm font-semibold text-white"
            >
              Request a new code
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-lg">
          <div className="mb-6 flex justify-center"><Logo /></div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-foreground">Password updated!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Redirecting to sign in in 3 seconds…
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Go to sign in now
          </Link>
        </motion.div>
      </div>
    )
  }

  if (!validToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-lg">
          <div className="mb-6 flex justify-center"><Logo /></div>
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h2 className="mt-6 text-xl font-bold text-foreground">Verifying reset link…</h2>
          <p className="mt-2 text-sm text-muted-foreground">This won't take long.</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-2xl border border-border bg-card p-10 shadow-lg">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold text-foreground">Set new password</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Choose a strong password for your account.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-foreground">New password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 pr-10 bg-background text-foreground"
                autoFocus
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < strength.score ? strength.color : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Password strength: <span className="font-medium">{strength.label}</span>
                </p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-foreground">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 pr-10 bg-background text-foreground"
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {passwordsMatch ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                  )}
                </div>
              )}
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-rose-500">Passwords do not match</p>
            )}
          </div>
          <Button
            type="submit"
            disabled={loading || !password || !confirmPassword || !passwordsMatch}
            className="h-10 w-full rounded-lg bg-[#4F7CFF] font-semibold text-white hover:bg-[#4F7CFF]/90"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
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
