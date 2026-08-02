import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Briefcase, CheckCircle2, GraduationCap, Loader2, Users, Zap, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Logo } from '@/components/layout'
import { useAuth } from '@/context/AuthContext'
import { ROLE_META, type Role } from '@/data/mock'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const ROLE_CARDS: { role: Role; icon: typeof GraduationCap; desc: string; gradient: string }[] = [
  { role: 'student', icon: GraduationCap, desc: 'Get referred into top companies', gradient: 'from-[#3B5FE5] to-[#8B8FD4]' },
  { role: 'professional', icon: Briefcase, desc: 'Refer great talent, build reputation', gradient: 'from-sky-500 to-cyan-400' },
  { role: 'recruiter', icon: Users, desc: 'Discover referral-warmed candidates', gradient: 'from-[#5B6FE5] to-[#8B8FD4]' },
]

export default function Login() {
  const { signIn, signUp, signInWithGoogle, signInWithLinkedIn } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Role>('student')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [fullName, setFullName] = useState('')

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }
    setLoading(true)
    try {
      if (isSignUp) {
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
          const isDemoOrAdmin = email.toLowerCase() === 'ayushmalpani479@gmail.com' || email.toLowerCase().endsWith('@demo.com')
          if (isDemoOrAdmin) {
            navigate('/dashboard')
          } else {
            navigate('/verify-email')
          }
          return
        }
        toast.success('Account created! Check your email to verify, then sign in.')
        setIsSignUp(false)
      } else {
        const { error, needsVerification } = await signIn(email, password)
        if (error) {
          toast.error(error)
          setLoading(false)
          return
        }
        if (needsVerification) {
          const isDemoOrAdmin = email.toLowerCase() === 'ayushmalpani479@gmail.com' || email.toLowerCase().endsWith('@demo.com')
          if (isDemoOrAdmin) {
            navigate('/dashboard')
          } else {
            navigate('/verify-email')
          }
          return
        }
        navigate('/dashboard')
      }
    } catch (err) {
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
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — form */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="font-display text-2xl font-bold tracking-tight">{isSignUp ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{isSignUp ? 'Join the referral network' : 'Sign in to your workspace to continue'}</p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}
            onSubmit={submit}
            className="mt-8 space-y-4"
          >
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="fullname">Full name</Label>
                <Input id="fullname" type="text" placeholder="Alex Morgan" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-10" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!isSignUp && (
                <div className="text-right">
                  <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <Label>I am a…</Label>
              <div className="grid gap-2">
                {ROLE_CARDS.map((r) => (
                  <button
                    type="button"
                    key={r.role}
                    onClick={() => setSelected(r.role)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border border-border p-3 text-left transition-all hover:border-primary/40 hover:bg-muted/50',
                      selected === r.role && 'border-primary bg-primary/5',
                    )}
                  >
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white', r.gradient)}>
                      <r.icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{ROLE_META[r.role].label}</div>
                      <div className="text-xs text-muted-foreground">{r.desc}</div>
                    </div>
                    {selected === r.role && <CheckCircle2 className="h-4.5 w-4.5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={loading} className="h-10 w-full rounded-lg bg-gradient-to-r from-[#3B5FE5] to-[#8B8FD4] shadow-glow font-semibold">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
            </Button>
          </motion.form>

          <div className="mt-6 flex items-center gap-3">
            <Separator className="flex-1" /><span className="text-xs text-muted-foreground">or continue with</span><Separator className="flex-1" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={handleGoogle}>Google</Button>
            <Button variant="outline" onClick={handleLinkedIn}>LinkedIn</Button>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : 'New to Direct Refer?'}{' '}
            <button onClick={() => setIsSignUp(!isSignUp)} className="font-medium text-primary hover:underline">
              {isSignUp ? 'Sign in' : <>{'Create an account'} <ArrowRight className="inline h-3.5 w-3.5" /></>}
            </button>
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground">Protected by SSO · SOC 2 Type II · <Link to="/help" className="underline">Support</Link></p>
      </div>

      {/* Right — brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#3B5FE5] to-[#8B8FD4] lg:block">
        <div className="bg-grid absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative flex h-full flex-col justify-center px-14 text-white">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
            <h2 className="font-display text-4xl font-bold leading-tight">The referral network<br />that works as hard<br />as you do.</h2>
            <ul className="mt-8 space-y-4">
              {[
                'Verified professionals at 900+ companies',
                '38% of referrals turn into offers',
                'Real-time messaging and referral tracking',
                'Analytics for every side of the marketplace',
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 text-white/90">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-12 rounded-2xl bg-white/10 p-5 backdrop-blur">
              <p className="text-sm leading-relaxed text-white/90">"I got my Stripe referral 9 days after my first request. The tracking and messaging made the whole process feel effortless."</p>
              <div className="mt-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">AM</div>
                <div className="text-xs"><span className="font-semibold">Alex Morgan</span> · SWE @ Stripe</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
