import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { motion } from 'framer-motion'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/layout'
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
  const [verifying, setVerifying] = useState(true)
  const [resetToken, setResetToken] = useState('')
  const tokenValid = useRef(false)

  useEffect(() => {
    const handleRecovery = async () => {
      const code = searchParams.get('code')
      if (code) {
        setResetToken(code)
        tokenValid.current = true
        setVerifying(false)
        window.history.replaceState({}, '', '/reset-password')
        return
      }

      const hash = window.location.hash
      if (hash && hash.includes('type=recovery')) {
        setError('This type of reset link is no longer supported. Please request a new one.')
        setVerifying(false)
        return
      }

      setError('No reset token found. Please request a new link from the login page.')
      setVerifying(false)
    }

    handleRecovery()
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
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to update password. Please try again.')
        return
      }

      setSuccess(true)
      toast.success('Password updated!')
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
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white"
            >
              Request a new link
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-foreground">Password updated!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your password has been changed. Redirecting to sign in…
          </p>
          <Button onClick={() => navigate('/login', { replace: true })} className="mt-6 h-10 w-full rounded-lg bg-primary font-semibold text-white">
            Sign in with new password
          </Button>
        </motion.div>
      </div>
    )
  }

  if (verifying) {
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
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 pr-10 bg-background text-foreground"
                autoFocus
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                placeholder="Re-enter password"
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
            className="h-10 w-full rounded-lg bg-primary font-semibold text-white"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
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
