import { useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Mail, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/layout'
import { toast } from 'sonner'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e?: React.FormEvent) => {
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

    setLoading(true)
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to send reset email. Please try again.')
        return
      }
      setSent(true)
      toast.success(data.message || 'Reset link sent! Check your email.')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-10 shadow-lg"
        >
          <div className="mb-6 flex justify-center"><Logo /></div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <Mail className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="mt-6 text-center text-2xl font-bold text-foreground">Check your email</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            We sent a password reset link to<br />
            <span className="font-medium text-foreground">{email}</span>
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Didn't receive it? Check your spam folder, or{' '}
            <button type="button" onClick={() => { setSent(false); setEmail('') }} className="font-medium text-primary hover:underline">
              try a different email
            </button>
          </p>
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-10 shadow-lg"
      >
        <div className="mb-6 flex justify-center"><Logo /></div>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Send className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold text-foreground">Forgot your password?</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your email and we'll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
            className="h-10 w-full rounded-lg bg-primary font-semibold text-white"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            {loading ? 'Sending…' : 'Send reset link'}
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
