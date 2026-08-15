import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Briefcase, CheckCircle2, GraduationCap, Loader2, Users, Zap, Eye, EyeOff, Shield, Sparkles } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'
import { ROLE_META, ROLE_ROUTE, type Role } from '@/data/mock'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { captureUTMFromURL, storeUTMParams } from '@/lib/analytics'
import { validateInviteCode, recordInviteUse } from '@/lib/invites'

const ROLE_CARDS: { role: Role; icon: typeof GraduationCap; desc: string; gradient: string; darkGradient: string }[] = [
  { role: 'student', icon: GraduationCap, desc: 'Get referred into top companies', gradient: 'from-blue-500 to-blue-400', darkGradient: 'from-blue-400 to-cyan-300' },
  { role: 'professional', icon: Briefcase, desc: 'Refer great talent, build reputation', gradient: 'from-blue-600 to-indigo-500', darkGradient: 'from-blue-300 to-violet-300' },
  { role: 'recruiter', icon: Users, desc: 'Discover referral-warmed candidates', gradient: 'from-indigo-500 to-violet-400', darkGradient: 'from-violet-300 to-fuchsia-300' },
]

export default function Login() {
  const { signIn, signUp, signInWithGoogle, signInWithLinkedIn } = useAuth()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [selected, setSelected] = useState<Role>('student')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [fullName, setFullName] = useState('')
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  // Capture UTM params and invite code from URL on mount
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

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }
    setLoading(true)
    try {
      if (isSignUp) {
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters')
          setLoading(false)
          return
        }
        const { error, needsVerification } = await signUp(email, password, {
          full_name: fullName || email.split('@')[0],
          role: selected,
        })
        if (error) {
          toast.error(error)
          setLoading(false)
          return
        }
        if (needsVerification) {
          const { error: signInError } = await signIn(email, password)
          if (signInError) {
            toast.success('Account created! Please check your email to verify your account, then sign in.')
            setIsSignUp(false)
          } else {
            toast.success('Account created! Taking you to your dashboard...')
            navigate(ROLE_ROUTE[selected] || '/job-seeker')
          }
        } else {
          toast.success('Account created! Taking you to your dashboard...')
          navigate(ROLE_ROUTE[selected] || '/job-seeker')
        }
        if (inviteCode) recordInviteUse(inviteCode)
      } else {
        const { error } = await signIn(email, password)
        if (error) {
          const msg = error.toLowerCase()
          if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('wrong password')) {
            toast.error('Invalid email or password. Please try again.')
          } else if (msg.includes('email not confirmed')) {
            toast.error('Please verify your email first. Check your inbox.')
          } else {
            toast.error(error)
          }
          setLoading(false)
          return
        }
        // Use selected role for workspace routing
        navigate(ROLE_ROUTE[selected] || '/job-seeker')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    const { error } = await signInWithGoogle()
    if (error) toast.error(error)
  }

  const handleLinkedIn = async () => {
    const { error } = await signInWithLinkedIn()
    if (error) toast.error(error)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 transition-colors duration-300">
      {/* ── Background Layer ─────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {dark ? (
          <div className="absolute inset-0 bg-[#080C14]" />
        ) : (
          <div className="absolute inset-0 bg-[#F8FAFC]" />
        )}
      </div>

      {/* ── Card Container ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'w-full max-w-[420px] rounded-3xl border p-8 sm:p-10 transition-all duration-300',
          dark
            ? 'border-white/[0.08] bg-white/[0.04] shadow-lg'
            : 'border-slate-200/80 bg-white/90 shadow-lg',
        )}
      >
        {/* ── Logo ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex justify-center"
        >
          <Link to="/" className="group flex items-center gap-3" aria-label="Direct Refer — Go to homepage">
            <div className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110',
              dark
                ? 'bg-gradient-to-br from-blue-500/20 to-violet-500/20 shadow-[0_0_20px_-4px_rgba(79,124,255,0.3)]'
                : 'bg-gradient-to-br from-blue-500/10 to-violet-500/10 shadow-[0_2px_12px_-2px_rgba(79,124,255,0.15)]',
            )}>
              <img src="/logo-letters.svg" alt="DR" className="h-6 w-auto transition-transform duration-300 group-hover:scale-110" />
            </div>
            <span className={cn(
              'font-display text-[26px] font-bold tracking-tight bg-clip-text text-transparent transition-colors duration-300',
              dark
                ? 'bg-gradient-to-r from-white to-slate-400'
                : 'bg-gradient-to-r from-slate-900 to-slate-600',
            )}>
              DirectRefer
            </span>
          </Link>
        </motion.div>

        {/* ── Heading ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-8 text-center"
        >
          <h1 className={cn(
            'font-display text-[28px] font-bold tracking-tight bg-clip-text text-transparent',
            dark
              ? 'bg-gradient-to-b from-white to-slate-300'
              : 'bg-gradient-to-b from-slate-900 to-slate-600',
          )}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className={cn('mt-2 text-sm', dark ? 'text-slate-400' : 'text-slate-500')}>
            {isSignUp ? 'Join the referral network' : 'Sign in to your workspace to continue'}
          </p>
        </motion.div>

        {/* ── Form ──────────────────────────────────────── */}
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          onSubmit={submit}
          className="space-y-4"
        >
          {isSignUp && (
            <div className="space-y-1.5">
              <Label className={cn('text-xs font-medium', dark ? 'text-slate-300' : 'text-slate-600')}>Full name</Label>
              <Input
                id="fullname"
                type="text"
                placeholder="Alex Morgan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={cn(
                  'h-11 rounded-xl border transition-all duration-200',
                  dark
                    ? 'border-white/[0.08] bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                    : 'border-slate-200 bg-white/50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10',
                )}
              />
              {inviteCode && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> You were invited by a colleague
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className={cn('text-xs font-medium', dark ? 'text-slate-300' : 'text-slate-600')}>Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                'h-11 rounded-xl border transition-all duration-200',
                dark
                  ? 'border-white/[0.08] bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                  : 'border-slate-200 bg-white/50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10',
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={cn('text-xs font-medium', dark ? 'text-slate-300' : 'text-slate-600')}>Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  'h-11 rounded-xl border pr-10 transition-all duration-200',
                  dark
                    ? 'border-white/[0.08] bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                    : 'border-slate-200 bg-white/50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10',
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200',
                  dark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600',
                )}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {!isSignUp && (
              <div className="text-right">
                <Link to="/forgot-password" className={cn('text-xs font-medium transition-colors duration-200 hover:underline', dark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700')}>
                  Forgot password?
                </Link>
              </div>
            )}
          </div>

          {/* ── Role Selector (sign-in & sign-up) ──────────── */}
          <div className="space-y-2.5 pt-1">
            <Label className={cn('text-xs font-medium', dark ? 'text-slate-300' : 'text-slate-600')}>I am a…</Label>
            <div className="grid gap-2">
              {ROLE_CARDS.map((r) => {
                const active = selected === r.role
                return (
                  <button
                    type="button"
                    key={r.role}
                    onClick={() => setSelected(r.role)}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200',
                      dark
                        ? cn(
                            'border-white/[0.06] bg-white/[0.02]',
                            active && 'border-blue-500/50 bg-blue-500/[0.08] shadow-[0_0_20px_-6px_rgba(79,124,255,0.2)]',
                            !active && 'hover:border-white/[0.12] hover:bg-white/[0.04]',
                          )
                        : cn(
                            'border-slate-200/80 bg-white/40',
                            active && 'border-blue-500 bg-blue-50/80 shadow-[0_0_20px_-6px_rgba(79,124,255,0.12)]',
                            !active && 'hover:border-slate-300 hover:bg-white/60',
                          ),
                    )}
                  >
                    <div className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white transition-all duration-200',
                      dark ? r.darkGradient : r.gradient,
                      active && 'shadow-[0_0_12px_-2px_rgba(79,124,255,0.4)]',
                    )}>
                      <r.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-sm font-semibold', dark ? 'text-white' : 'text-slate-900')}>
                        {ROLE_META[r.role].label}
                      </div>
                      <div className={cn('text-xs truncate', dark ? 'text-slate-400' : 'text-slate-500')}>
                        {r.desc}
                      </div>
                    </div>
                    {active && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        <CheckCircle2 className={cn('h-4.5 w-4.5', dark ? 'text-blue-400' : 'text-blue-600')} />
                      </motion.div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Submit Button ────────────────────────────── */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="pt-2"
          >
            <Button
              type="submit"
              disabled={loading}
              className={cn(
                'relative h-11 w-full rounded-xl font-semibold text-white shadow-lg transition-all duration-300',
                'bg-gradient-to-r from-blue-600 to-indigo-600',
                'hover:from-blue-500 hover:to-indigo-500',
                'hover:shadow-[0_4px_30px_-4px_rgba(79,124,255,0.5)]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="relative flex items-center justify-center">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}{!loading ? ` as ${ROLE_META[selected].label}` : ''}
              </span>
            </Button>
          </motion.div>
        </motion.form>

        {/* ── Divider ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex items-center gap-3"
        >
          <Separator className={cn('flex-1', dark ? 'bg-white/[0.08]' : 'bg-slate-200')} />
          <span className={cn('text-xs', dark ? 'text-slate-500' : 'text-slate-400')}>or continue with</span>
          <Separator className={cn('flex-1', dark ? 'bg-white/[0.08]' : 'bg-slate-200')} />
        </motion.div>

        {/* ── Social Buttons ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-4 grid grid-cols-2 gap-3"
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={loading}
            className={cn(
              'h-11 rounded-xl border transition-all duration-200 font-medium',
              dark
                ? 'border-white/[0.08] bg-white/[0.02] text-slate-300 hover:bg-white/[0.06] hover:border-white/[0.15]'
                : 'border-slate-200 bg-white/50 text-slate-700 hover:bg-slate-50 hover:border-slate-300',
            )}
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
            className={cn(
              'h-11 rounded-xl border transition-all duration-200 font-medium',
              dark
                ? 'border-white/[0.08] bg-white/[0.02] text-slate-300 hover:bg-white/[0.06] hover:border-white/[0.15]'
                : 'border-slate-200 bg-white/50 text-slate-700 hover:bg-slate-50 hover:border-slate-300',
            )}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#0A66C2">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </Button>
        </motion.div>

        {/* ── Toggle Sign In / Sign Up ─────────────────── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={cn('mt-6 text-center text-sm', dark ? 'text-slate-400' : 'text-slate-500')}
        >
          {isSignUp ? 'Already have an account?' : 'New to Direct Refer?'}{' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className={cn(
              'font-semibold transition-colors duration-200 hover:underline',
              dark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700',
            )}
          >
            {isSignUp ? 'Sign in' : (
              <span className="inline-flex items-center gap-1">
                Create an account <ArrowRight className="inline h-3.5 w-3.5" />
              </span>
            )}
          </button>
        </motion.p>

        {/* ── Trust Badges ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center justify-center gap-4"
        >
          {[
            { icon: Shield, label: 'SSO Protected' },
            { icon: Sparkles, label: 'SOC 2 Type II' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className={cn('flex items-center gap-1.5 text-[11px]', dark ? 'text-slate-500' : 'text-slate-400')}>
              <Icon className="h-3 w-3" />
              <span>{label}</span>
            </div>
          ))}
          <a href="mailto:support@directrefer.in" className={cn('text-[11px] font-medium transition-colors duration-200 hover:underline', dark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}>
            Support
          </a>
        </motion.div>
      </motion.div>
    </div>
  )
}
