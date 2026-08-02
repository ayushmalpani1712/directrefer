import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, Mail, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/layout'
import { supabase } from '@/lib/supabase'
import { sendVerificationEmail } from '@/lib/email'
import { toast } from 'sonner'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const userId = searchParams.get('uid')
  const [verifying, setVerifying] = useState(!!token)
  const [verified, setVerified] = useState(false)
  const [resending, setResending] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const verifyToken = useCallback(async () => {
    if (!token || !userId) return
    setVerifying(true)
    try {
      const { data, error } = await supabase
        .from('email_verification_tokens')
        .select('user_id, expires_at')
        .eq('token', token)
        .single()

      if (error || !data) {
        toast.error('Invalid or expired verification link')
        setVerifying(false)
        return
      }

      if (new Date(data.expires_at) < new Date()) {
        toast.error('Verification link has expired. Please request a new one.')
        setVerifying(false)
        return
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ email_verified: true })
        .eq('id', data.user_id)

      if (updateError) {
        toast.error('Failed to verify email')
        setVerifying(false)
        return
      }

      await supabase.from('email_verification_tokens').delete().eq('token', token)

      setVerified(true)
      toast.success('Email verified! Redirecting...')
      timerRef.current = setTimeout(() => navigate('/dashboard'), 2000)
    } catch {
      toast.error('Verification failed')
    } finally {
      setVerifying(false)
    }
  }, [token, userId, navigate])

  useEffect(() => {
    if (token && userId) {
      verifyToken()
    }
  }, [token, userId, verifyToken])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email)
    })
  }, [])

  const handleResend = async () => {
    setResending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Not logged in')
        return
      }

      const tokenVal = crypto.randomUUID()
      const { error: tokenError } = await supabase
        .from('email_verification_tokens')
        .insert({ user_id: user.id, token: tokenVal })

      if (tokenError) {
        toast.error('Failed to generate verification link')
        return
      }

      const verifyUrl = `${window.location.origin}/verify-email?token=${tokenVal}&uid=${user.id}`

      try {
        await sendVerificationEmail(user.email!, verifyUrl)
        toast.success('Verification email sent! Check your inbox.')
      } catch {
        toast.info(`Verification link: ${verifyUrl}`)
      }
    } finally {
      setResending(false)
    }
  }

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#3B5FE5] to-[#8B8FD4]">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl bg-white p-10 text-center shadow-2xl">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h2 className="mt-6 text-xl font-bold">Verifying your email…</h2>
        </motion.div>
      </div>
    )
  }

  if (verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#3B5FE5] to-[#8B8FD4]">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl bg-white p-10 text-center shadow-2xl">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h2 className="mt-6 text-xl font-bold">Email Verified!</h2>
          <p className="mt-2 text-sm text-muted-foreground">Redirecting to your dashboard…</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#3B5FE5] to-[#8B8FD4]">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-2xl bg-white p-10 shadow-2xl">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold">Verify your email</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          We sent a verification link to<br />
          <span className="font-medium text-foreground">{userEmail || 'your email'}</span>
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Professionals and recruiters must verify their email before accessing the platform. Check your inbox and click the verification link.
        </p>
        <Button onClick={handleResend} disabled={resending} className="mt-6 h-10 w-full rounded-lg bg-primary font-semibold">
          {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {resending ? 'Sending…' : 'Resend verification email'}
        </Button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Didn't receive it? Check your spam folder, or{' '}
          <button onClick={() => navigate('/login')} className="font-medium text-primary hover:underline">sign in with a different account</button>
        </p>
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mt-2 h-10 w-full rounded-lg text-muted-foreground">
          Skip for now
        </Button>
      </motion.div>
    </div>
  )
}
