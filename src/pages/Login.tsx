import { useRef, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Send,
  Shield,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'
import { useApp } from '@/context/AppContext'
import { ROLE_META, ROLE_ROUTE, type Role } from '@/data/mock'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { captureUTMFromURL, storeUTMParams } from '@/lib/analytics'
import { validateInviteCode, recordInviteUse } from '@/lib/invites'

const ROLE_CARDS: { role: Role; icon: typeof GraduationCap; label: string }[] = [
  { role: 'student', icon: GraduationCap, label: 'Job Seeker' },
  { role: 'professional', icon: Briefcase, label: 'Professional' },
  { role: 'recruiter', icon: Users, label: 'Recruiter' },
]

const PIPELINE_STEPS = [
  { icon: Send, label: 'Request Sent', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { icon: Clock, label: 'Under Review', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { icon: CheckCircle2, label: 'Accepted', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
]

export default function Login() {
  const { signIn, signUp, signInWithGoogle, signInWithLinkedIn } = useAuth()
  const { role, roleLoaded, authed } = useApp()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Role>('student')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [fullName, setFullName] = useState('')
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [readyToNavigate, setReadyToNavigate] = useState(false)
  const preventNavRef = useRef(false)

  useEffect(() => {
    const utm = captureUTMFromURL()
    storeUTMParams(utm)
    const params = new URLSearchParams(window.location.search)
    const code = params.get('invite')
    if (code) {
      validateInviteCode(code).then((result) => {
        if (result.valid) setInviteCode(code)
      })
    }
  }, [])

  useEffect(() => {
    if (readyToNavigate && authed && roleLoaded) {
      navigate(ROLE_ROUTE[role] || '/job-seeker', { replace: true })
    }
  }, [readyToNavigate, authed, roleLoaded, role, navigate])

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!email || !password) {
      setError('Please enter email and password.')
      return
    }
    setLoading(true)
    try {
      if (isSignUp) {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.')
          setLoading(false)
          return
        }
        const { error: signUpError, needsVerification } = await signUp(email, password, {
          full_name: fullName || email.split('@')[0],
          role: selected,
        })
        if (signUpError) {
          setError(signUpError)
          setLoading(false)
          return
        }
        if (needsVerification) {
          const { error: signInError } = await signIn(email, password)
          if (signInError) {
            toast.success('Account created! Please check your email to verify your account, then sign in.')
            setIsSignUp(false)
            setLoading(false)
            return
          }
        }
        toast.success('Account created! Taking you to your dashboard...')
        preventNavRef.current = true
        setReadyToNavigate(true)
        if (inviteCode) recordInviteUse(inviteCode)
      } else {
        const { error: signInError } = await signIn(email, password)
        if (signInError) {
          const msg = signInError.toLowerCase()
          if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('wrong password')) {
            setError('Invalid email or password. Please try again.')
          } else if (msg.includes('email not confirmed')) {
            setError('Please verify your email first. Check your inbox.')
          } else {
            setError(signInError)
          }
          setLoading(false)
          return
        }
        preventNavRef.current = true
        setReadyToNavigate(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) setError(error)
  }

  const handleLinkedIn = async () => {
    setError(null)
    const { error } = await signInWithLinkedIn()
    if (error) setError(error)
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <h1 className="sr-only">Sign in to Direct Refer</h1>

      <div className="relative hidden md:flex flex-col justify-between overflow-hidden bg-black p-10 lg:p-14">
        <div className="pointer-events-none absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary/[0.07] blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-[300px] w-[300px] rounded-full bg-secondary/[0.04] blur-[80px]" />

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/" className="group inline-flex items-center gap-3" aria-label="DirectRefer — Go to homepage">
            <svg viewBox="0 0 250 189" className="h-12 w-auto" aria-hidden="true">
              <image href="/logo-emblem.png" width="250" height="189" />
            </svg>
            <span className="font-display text-2xl font-bold tracking-tight text-white">DirectRefer</span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="max-w-md"
        >
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-white lg:text-[44px]">
            Connect directly with{' '}
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              verified corporate insiders.
            </span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            Skip the noise. Get real referrals from people who actually work at your dream companies.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-sm"
        >
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-slate-500">Referral Pipeline</p>
          <div className="flex items-center gap-3">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-3 flex-1">
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', step.bg)}>
                    <step.icon className={cn('h-4.5 w-4.5', step.color)} />
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 text-center leading-tight">{step.label}</span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="mb-6 h-px flex-1 bg-gradient-to-r from-white/10 to-white/5" />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="relative flex items-center justify-center bg-black px-5 py-10 sm:px-8 md:py-12">
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-[400px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.03] blur-[100px]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-[420px]"
        >
          <div className="mb-8 flex justify-center md:hidden">
            <Link to="/" className="group inline-flex items-center gap-3" aria-label="DirectRefer — Go to homepage">
              <svg viewBox="0 0 250 189" className="h-10 w-auto" aria-hidden="true">
                <image href="/logo-emblem.png" width="250" height="189" />
              </svg>
              <span className="font-display text-2xl font-bold tracking-tight text-white">DirectRefer</span>
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {isSignUp ? 'Join the referral network and start connecting.' : 'Sign in to your workspace to continue'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-300"
              >
                <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="shrink-0 mt-0.5 text-rose-400 transition-colors hover:text-rose-300"
                  aria-label="Dismiss error"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </motion.div>
            )}

            {isSignUp && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-300">Full name</Label>
                <Input
                  id="fullname"
                  type="text"
                  placeholder="Alex Morgan"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); if (error) setError(null) }}
                  className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder:text-slate-500 transition-[border-color,box-shadow] duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                {inviteCode && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> You were invited by a colleague
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(null) }}
                className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder:text-slate-500 transition-[border-color,box-shadow] duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-slate-300">Password</Label>
                {!isSignUp && (
                  <Link to="/forgot-password" className="text-xs font-medium text-primary transition-colors duration-200 hover:text-primary/80 hover:underline">
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(null) }}
                  className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] pr-10 text-white placeholder:text-slate-500 transition-[border-color,box-shadow] duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-200 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Label className="text-xs font-medium text-slate-300">I am a…</Label>
              <div className="grid grid-cols-3 gap-2.5">
                {ROLE_CARDS.map((card) => {
                  const active = selected === card.role
                  return (
                    <button
                      key={card.role}
                      type="button"
                      onClick={() => setSelected(card.role)}
                      className={cn(
                        'group flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center transition-[border-color,background-color,box-shadow] duration-200',
                        active
                          ? 'border-blue-500/60 bg-blue-500/[0.08] shadow-[0_0_24px_-6px_rgba(59,130,246,0.3)]'
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]',
                      )}
                    >
                      <div className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-200',
                        active ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.06] text-slate-400 group-hover:text-slate-300',
                      )}>
                        <card.icon className="h-4 w-4" />
                      </div>
                      <span className={cn(
                        'text-xs font-semibold leading-tight',
                        active ? 'text-white' : 'text-slate-400 group-hover:text-slate-300',
                      )}>
                        {card.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className={cn(
                  'relative h-11 w-full rounded-xl bg-blue-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-[box-shadow] duration-300',
                  'hover:bg-blue-600 hover:shadow-blue-500/30',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <span className="relative flex items-center justify-center">
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
                  {!loading ? ` as ${ROLE_META[selected].label}` : ''}
                </span>
              </Button>
            </div>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <Separator className="flex-1 bg-white/[0.08]" />
            <span className="text-xs text-slate-500">or continue with</span>
            <Separator className="flex-1 bg-white/[0.08]" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              disabled={loading}
              className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.02] font-medium text-slate-300 transition-[border-color,background-color] duration-200 hover:bg-white/[0.06] hover:border-white/[0.15]"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleLinkedIn}
              disabled={loading}
              className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.02] font-medium text-slate-300 transition-[border-color,background-color] duration-200 hover:bg-white/[0.06] hover:border-white/[0.15]"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#0A66C2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-400">
            {isSignUp ? 'Already have an account?' : 'New to Direct Refer?'}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
              className="font-semibold text-primary transition-colors duration-200 hover:text-primary/80 hover:underline"
            >
              {isSignUp ? 'Sign in' : (
                <span className="inline-flex items-center gap-1">
                  Create an account <ArrowRight className="inline h-3.5 w-3.5" />
                </span>
              )}
            </button>
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            {[
              { icon: Shield, label: 'SSO Protected' },
              { icon: Sparkles, label: 'SOC 2 Type II' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Icon className="h-3 w-3" />
                <span>{label}</span>
              </div>
            ))}
            <a href="mailto:support@directrefer.in" className="text-[11px] font-medium text-slate-500 transition-colors duration-200 hover:text-slate-300 hover:underline">
              Support
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
