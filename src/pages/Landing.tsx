import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Briefcase,
  ChartColumn,
  CheckCircle2,
  FileText,
  GraduationCap,
  Menu,
  Pause,
  Play,
  Search,
  Send,
  ShieldCheck,
  ShieldOff,
  SkipBack,
  SkipForward,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { GAvatar } from '@/components/ui-kit'
import { Logo } from '@/components/layout'
import { FadeIn } from '@/components/FadeIn'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { profileUrl, RECRUITER_VISIBLE } from '@/data/mock'
import { GlowCard } from '@/components/GlowCard'
import { SpotlightCard } from '@/components/SpotlightCard'
import { captureUTMFromURL, storeUTMParams, trackPageVisit } from '@/lib/analytics'

const ROLES = [
  {
    icon: GraduationCap,
    title: 'For Job Seekers',
    desc: 'Skip the queue. Request referrals from verified insiders, track every application, and know exactly where you stand.',
    points: ['One-click referral requests', 'Real-time pipeline tracking', 'Verified professional network'],
  },
  {
    icon: Briefcase,
    title: 'For Professionals',
    desc: 'Give back — without the noise. Manage inbound referrals with capacity controls, analytics, and a reputation that compounds.',
    points: ['Smart request inbox', 'Referral analytics', 'Capacity controls'],
  },
  ...(RECRUITER_VISIBLE ? [{
    icon: Users,
    title: 'For Recruiters',
    desc: 'Access referral-warmed talent that other recruiters can\u2019t find. Run your pipeline and measure every stage of the hiring funnel.',
    points: ['Talent search', 'Pipeline kanban', 'Hiring funnel analytics'],
  }] : []),
]

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ── Typewriter hook ──────────────────────────────────────────
function useTypewriter(text: string, speed = 40, active = true) {
  const [output, setOutput] = useState('')
  useEffect(() => {
    if (!active) { setOutput(''); return }
    setOutput('')
    let i = 0
    const iv = setInterval(() => {
      i++
      setOutput(text.slice(0, i))
      if (i >= text.length) clearInterval(iv)
    }, speed)
    return () => clearInterval(iv)
  }, [text, speed, active])
  return output
}

// ── Count-up hook ────────────────────────────────────────────
function useCountUp(target: number, duration = 1500, active = true) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) { setValue(0); return }
    setValue(0)
    const start = Date.now()
    const iv = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      setValue(Math.round(progress * target))
      if (progress >= 1) clearInterval(iv)
    }, 16)
    return () => clearInterval(iv)
  }, [target, duration, active])
  return value
}

// ═══════════════════════════════════════════════════════════════
// Scene components for the interactive carousel
// ═══════════════════════════════════════════════════════════════

function TheProblemScene({ active }: { active: boolean }) {
  const apps = useCountUp(200, 1800, active)
  const responses = useCountUp(12, 1200, active)
  const referrals = useCountUp(0, 600, active)
  return (
    <div className="flex flex-col items-center gap-6 px-4 py-6 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: active ? 1 : 0, y: active ? 0 : 10 }} transition={{ delay: 0.2 }} className="text-center">
        <p className="text-xs sm:text-sm text-muted-foreground/70 font-medium uppercase tracking-wider">Meanwhile on LinkedIn</p>
      </motion.div>
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
        {[{ label: 'Applications', value: apps, color: 'text-foreground' }, { label: 'Responses', value: responses, color: 'text-amber-400' }, { label: 'Referrals', value: referrals, color: 'text-rose-400' }].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.8 }} transition={{ delay: 0.3 + i * 0.15 }} className="text-center">
            <div className={`font-display text-3xl sm:text-5xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="mt-1 text-[10px] sm:text-xs text-muted-foreground/60">{s.label}</div>
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: active ? 1 : 0, y: active ? 0 : 10 }} transition={{ delay: 1.2 }} className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-5 py-3 text-center">
        <p className="text-sm sm:text-base font-semibold text-rose-400">Cold applications have a 2% callback rate.</p>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: active ? 1 : 0 }} transition={{ delay: 2 }} className="mt-2 flex items-center gap-2 text-xs text-muted-foreground/50">
        <X className="h-3.5 w-3.5 text-rose-400" />
        <span>No referral. No pipeline. No visibility.</span>
      </motion.div>
    </div>
  )
}

const MOCK_PROS = [
  { name: 'Priya Sharma', role: 'SDE-2', company: 'Google', rating: 4.9, referrals: 47, gradient: 'from-[#6366F1] to-[#8B5CF6]' },
  { name: 'Arjun Patel', role: 'Senior SWE', company: 'Google', rating: 4.8, referrals: 32, gradient: 'from-sky-500 to-cyan-400' },
  { name: 'Neha Gupta', role: 'Product Manager', company: 'Google', rating: 4.7, referrals: 28, gradient: 'from-emerald-500 to-teal-400' },
]

function DiscoverScene({ active }: { active: boolean }) {
  const typed = useTypewriter('Google', 80, active)
  return (
    <div className="flex flex-col gap-4 px-2 sm:px-4 py-4 sm:py-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: active ? 1 : 0, y: active ? 0 : 8 }} transition={{ delay: 0.2 }} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground/60 shrink-0" />
        <span className="text-sm text-foreground">{typed}<span className="animate-pulse text-primary">|</span></span>
        <Badge className="ml-auto shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]"><ShieldCheck className="mr-1 h-3 w-3" /> Verified</Badge>
      </motion.div>
      <div className="space-y-2.5">
        {MOCK_PROS.map((p, i) => (
          <motion.div key={p.name} initial={{ opacity: 0, x: 30 }} animate={{ opacity: active ? 1 : 0, x: active ? 0 : 30 }} transition={{ delay: 0.6 + i * 0.2, type: 'spring', stiffness: 120 }} className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-white text-xs font-bold shrink-0 ${p.gradient}`}>{p.name.split(' ').map(n => n[0]).join('')}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground">{p.name} <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0" /></div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{p.role} {'\u2022'} {p.company}</div>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] sm:text-xs text-muted-foreground shrink-0">
              <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{p.rating}</span>
              <span>{p.referrals}</span>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 rounded-full text-[10px] sm:text-xs h-7 sm:h-8">Request</Button>
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: active ? 1 : 0, y: active ? 0 : 6 }} transition={{ delay: 1.5 }} className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-muted-foreground/60">
        <ShieldCheck className="h-3 w-3 text-emerald-400" />
        <span>Google {'\u2022'} Microsoft {'\u2022'} Amazon {'\u2022'} 50+ companies</span>
      </motion.div>
    </div>
  )
}

function RequestScene({ active }: { active: boolean }) {
  const typed = useTypewriter("Hi Priya, I'm interested in the SDE-2 role at Google. I have 3 years of experience in React and Node.js.", 25, active)
  const [showResume, setShowResume] = useState(false)
  const [showSend, setShowSend] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!active) { setShowResume(false); setShowSend(false); setElapsed(0); return }
    const t1 = setTimeout(() => setShowResume(true), 2000)
    const t2 = setTimeout(() => setShowSend(true), 3200)
    const iv = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(iv) }
  }, [active])

  return (
    <div className="flex flex-col gap-4 px-2 sm:px-4 py-4 sm:py-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: active ? 1 : 0, y: active ? 0 : 8 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[10px] font-bold">PS</div>
          <div>
            <div className="text-xs font-semibold text-foreground">Priya Sharma <ShieldCheck className="inline h-3 w-3 text-emerald-400" /></div>
            <div className="text-[10px] text-muted-foreground">SDE-2 {'\u2022'} Google</div>
          </div>
        </div>
        <div className="rounded-lg bg-muted/30 p-3 min-h-[60px]">
          <p className="text-xs text-foreground leading-relaxed">{typed}<span className="animate-pulse text-primary">|</span></p>
        </div>
        {showResume && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">resume_alex.pdf</span>
            <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-400" />
          </motion.div>
        )}
        {showSend && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-between">
            <Button size="sm" className="rounded-full bg-primary text-white text-xs h-8 shadow-glow"><Send className="mr-1.5 h-3 w-3" /> Send Request</Button>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />{elapsed}s elapsed
            </div>
          </motion.div>
        )}
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: active ? 1 : 0 }} transition={{ delay: 1 }} className="text-center">
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs">60 seconds. Not 60 minutes.</Badge>
      </motion.div>
    </div>
  )
}

const PIPELINE_STEPS = ['Request Sent', 'Under Review', 'Accepted', 'Submitted', 'Hired']

function TrackScene({ active }: { active: boolean }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!active) { setStep(0); return }
    let i = 0
    const iv = setInterval(() => { i++; setStep(i); if (i >= 3) clearInterval(iv) }, 800)
    return () => clearInterval(iv)
  }, [active])

  return (
    <div className="flex flex-col gap-5 px-2 sm:px-4 py-6 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: active ? 1 : 0, y: active ? 0 : 8 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border/40 bg-card p-4">
        <div className="text-xs font-medium text-muted-foreground mb-3">Referral Pipeline</div>
        <div className="flex gap-2">
          {PIPELINE_STEPS.map((label, i) => (
            <div key={label} className="flex-1 text-center">
              <motion.div className={`h-2 rounded-full mb-2 ${i < step ? 'bg-emerald-400' : 'bg-muted/30'}`} initial={{ scaleX: 0 }} animate={{ scaleX: i < step ? 1 : 0.3 }} transition={{ delay: 0.3 + i * 0.3, duration: 0.4, ease: 'easeOut' }} style={{ transformOrigin: 'left' }} />
              <span className={`text-[9px] sm:text-[10px] ${i < step ? 'text-emerald-400 font-medium' : 'text-muted-foreground/50'}`}>{label}</span>
              {i < step && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.3, type: 'spring' }}>
                  <CheckCircle2 className="mx-auto mt-1 h-3 w-3 text-emerald-400" />
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
      {step >= 3 && (
        <motion.div initial={{ opacity: 0, y: -10, x: 10 }} animate={{ opacity: 1, y: 0, x: 0 }} transition={{ type: 'spring', stiffness: 100 }} className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 mx-auto">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-400">Referral submitted!</p>
            <p className="text-[10px] text-muted-foreground/60">Priya submitted your referral to Google hiring team</p>
          </div>
        </motion.div>
      )}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: active ? 1 : 0 }} transition={{ delay: 2.5 }} className="text-center">
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">No more &ldquo;did they see it?&rdquo; messages</Badge>
      </motion.div>
    </div>
  )
}

function GetReferredScene({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-5 px-4 py-8 sm:py-12">
      <motion.img initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.8 }} transition={{ delay: 0.2, type: 'spring', stiffness: 100 }} src="/logo-emblem.png" alt="DirectRefer" className="h-16 w-16 object-contain" />
      <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: active ? 1 : 0, y: active ? 0 : 10 }} transition={{ delay: 0.5 }} className="font-display text-lg sm:text-xl font-bold text-foreground text-center">Stop applying into the void.</motion.h3>
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: active ? 1 : 0, y: active ? 0 : 8 }} transition={{ delay: 0.8 }} className="text-sm text-muted-foreground text-center max-w-xs">Get referred into your next role. It&rsquo;s free for job seekers.</motion.p>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: active ? 1 : 0, y: active ? 0 : 8 }} transition={{ delay: 1.1 }}>
        <Button size="lg" className="rounded-full bg-primary px-8 shadow-glow text-sm">Find a professional {'\u2014'} it&rsquo;s free</Button>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: active ? 1 : 0 }} transition={{ delay: 1.5 }}>
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px]">Pre-launch {'\u2022'} Early access</Badge>
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Interactive Mock – 5-scene carousel
// ═══════════════════════════════════════════════════════════════

const SCENES = [
  { label: 'The Problem', component: TheProblemScene },
  { label: 'Discover', component: DiscoverScene },
  { label: 'Request', component: RequestScene },
  { label: 'Track', component: TrackScene },
  { label: 'Get Referred', component: GetReferredScene },
]
const SCENE_COUNT = 5
const SCENE_INTERVAL = 5000

function SceneCarousel() {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const next = () => setIdx(i => Math.min(i + 1, SCENE_COUNT - 1))
  const prev = () => setIdx(i => Math.max(i - 1, 0))

  useEffect(() => {
    if (!playing || idx === SCENE_COUNT - 1) return
    const t = setTimeout(next, SCENE_INTERVAL)
    return () => clearTimeout(t)
  }, [idx, playing])

  const Scene = SCENES[idx].component

  return (
    <div className="mx-auto max-w-3xl px-0 sm:px-4">
      <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-border/60 bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-3 sm:px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="ml-3 hidden sm:flex h-6 flex-1 max-w-xs items-center rounded-md bg-muted/30 px-2.5 text-[11px] text-muted-foreground">www.directrefer.in</div>
          <div className="ml-auto flex items-center gap-1">
            <Badge variant="outline" className="hidden sm:inline-flex border-border/60 text-[10px] text-muted-foreground">{idx + 1}/{SCENE_COUNT}</Badge>
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-border/30 bg-muted/10 px-3 sm:px-4 py-2">
          <span className="text-[10px] sm:text-xs font-medium text-muted-foreground/70">{SCENES[idx].label}</span>
          <div className="flex items-center gap-1">
            {SCENES.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} className={`h-2.5 min-w-[10px] rounded-full transition-all duration-300 ${i === idx ? 'w-7 bg-primary' : i < idx ? 'w-2.5 bg-primary/40' : 'w-2.5 bg-muted-foreground/20'}`} aria-label={`Go to scene ${i + 1}`} />
            ))}
          </div>
        </div>
        <div className="h-[300px] sm:h-[360px]">
          <AnimatePresence mode="wait">
            <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <Scene active />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex items-center justify-between border-t border-border/30 bg-muted/10 px-3 sm:px-4 py-2.5">
          <Button variant="ghost" size="sm" className="h-11 w-11 p-0 text-muted-foreground hover:text-foreground" onClick={prev} disabled={idx === 0}><SkipBack className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" className="h-11 w-11 p-0 text-muted-foreground hover:text-foreground" onClick={() => setPlaying(p => !p)}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
          <Button variant="ghost" size="sm" className="h-11 w-11 p-0 text-muted-foreground hover:text-foreground" onClick={next} disabled={idx === SCENE_COUNT - 1}><SkipForward className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Interactive Mock – tabbed dashboard preview
// ═══════════════════════════════════════════════════════════════

const MOCK_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Users },
  { id: 'professionals', label: 'Professionals', icon: Users },
  { id: 'referrals', label: 'Referrals', icon: FileText },
]

function DashboardTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-[#9A9BA8]">Good morning,</div>
          <div className="font-display text-lg font-bold text-white">Alex</div>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="font-display text-2xl font-bold text-[#6366F1]">12</div>
            <div className="text-[10px] text-[#9A9BA8]">Referrals sent</div>
          </div>
          <div className="h-10 w-px bg-[rgba(255,255,255,0.07)]" />
          <div className="text-center">
            <div className="font-display text-2xl font-bold text-[#34D399]">78</div>
            <div className="text-[10px] text-[#9A9BA8]">Profile score</div>
          </div>
          <div className="h-10 w-px bg-[rgba(255,255,255,0.07)]" />
          <div className="text-center">
            <div className="font-display text-2xl font-bold text-[#E8B44C]">3</div>
            <div className="text-[10px] text-[#9A9BA8]">Interviews</div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge className="border border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.1)] text-[#34D399] text-[10px]">Accepted {'\u2022'} Flipkart</Badge>
        <Badge className="border border-[rgba(99, 102, 241,0.2)] bg-[rgba(99, 102, 241,0.1)] text-[#6366F1] text-[10px]">Applied {'\u2022'} Razorpay</Badge>
        <Badge className="border border-[rgba(232,180,76,0.2)] bg-[rgba(232,180,76,0.1)] text-[#E8B44C] text-[10px]">Under Review {'\u2022'} Google</Badge>
      </div>
      <div className="rounded-xl bg-[rgba(255,255,255,0.05)] p-4">
        <div className="text-xs font-medium text-[#9A9BA8] mb-3">Pipeline</div>
        <div className="flex gap-3">
          {['Request Sent', 'Under Review', 'Accepted', 'Submitted', 'Hired'].map((step, i) => (
            <div key={step} className="flex-1 text-center">
              <div className={`h-1.5 rounded-full mb-1.5 ${i <= 2 ? 'bg-[#6366F1]' : 'bg-[rgba(255,255,255,0.07)]'}`} />
              <span className={`text-[9px] ${i <= 2 ? 'text-[#6366F1]' : 'text-[#5C5D66]'}`}>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProfessionalsTab() {
  const pros = [
    { name: 'Priya Sharma', role: 'SDE-2', company: 'Google', rating: 4.9, referrals: 47, gradient: 'from-[#6366F1] to-[#8B5CF6]' },
    { name: 'Arjun Patel', role: 'Senior SWE', company: 'Microsoft', rating: 4.8, referrals: 32, gradient: 'from-sky-500 to-cyan-400' },
    { name: 'Neha Gupta', role: 'Product Manager', company: 'Amazon', rating: 4.7, referrals: 28, gradient: 'from-emerald-500 to-teal-400' },
    { name: 'Rohit Kumar', role: 'ML Engineer', company: 'Flipkart', rating: 4.9, referrals: 19, gradient: 'from-rose-500 to-pink-400' },
  ]
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg bg-[rgba(255,255,255,0.05)] px-3 py-2">
        <Search className="h-3.5 w-3.5 text-[#5C5D66]" />
        <span className="text-xs text-[#5C5D66]">Search by company, skill, or role...</span>
      </div>
      {pros.map(p => (
        <div key={p.name} className="flex items-center gap-3 rounded-xl bg-[rgba(255,255,255,0.05)] p-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-white text-xs font-bold ${p.gradient}`}>{p.name.split(' ').map(n => n[0]).join('')}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">{p.name} <ShieldCheck className="h-3 w-3 text-[#34D399]" /></div>
            <div className="text-[11px] text-[#9A9BA8]">{p.role} {'\u2022'} {p.company}</div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[#9A9BA8]">
            <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-[#E8B44C] text-[#E8B44C]" />{p.rating}</span>
            <span>{p.referrals} referrals</span>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 rounded-full border-[rgba(255,255,255,0.06)] text-[10px] text-white hover:bg-[rgba(255,255,255,0.05)]">Request</Button>
        </div>
      ))}
    </div>
  )
}

function ReferralsTab() {
  const jobs = [
    { company: 'Flipkart', role: 'SDE-2', stage: 'Accepted', color: '#34D399', date: '2 days ago' },
    { company: 'Razorpay', role: 'Frontend Engineer', stage: 'Applied', color: '#6366F1', date: '5 days ago' },
    { company: 'Google', role: 'L3 SWE', stage: 'Under Review', color: '#E8B44C', date: '1 week ago' },
  ]
  return (
    <div className="space-y-3">
      {jobs.map(j => (
        <div key={j.company + j.role} className="flex items-center gap-3 rounded-xl bg-[rgba(255,255,255,0.05)] p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.05)]"><Briefcase className="h-4.5 w-4.5 text-[#9A9BA8]" /></div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white">{j.role}</div>
            <div className="text-[11px] text-[#9A9BA8]">{j.company}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-medium" style={{ color: j.color }}>{j.stage}</div>
            <div className="mt-0.5 text-[9px] text-[#5C5D66]">{j.date}</div>
          </div>
        </div>
      ))}
      <div className="rounded-xl bg-[rgba(255,255,255,0.05)] p-3">
        <div className="text-[10px] font-medium text-[#9A9BA8] mb-2">Pipeline Progress</div>
        <div className="flex items-center gap-1">
          {['Sent', 'Review', 'Accepted', 'Submitted', 'Hired'].map((step, i) => (
            <div key={step} className="flex-1">
              <div className={`h-1 rounded-full ${i < 2 ? 'bg-[#34D399]' : 'bg-[rgba(255,255,255,0.07)]'}`} />
              <span className={`text-[8px] mt-1 block ${i < 2 ? 'text-[#34D399]' : 'text-[#5C5D66]'}`}>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const TAB_CONTENT: Record<string, React.FC> = { dashboard: DashboardTab, professionals: ProfessionalsTab, referrals: ReferralsTab }

function InteractiveMock() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const ActiveContent = TAB_CONTENT[activeTab]

  return (
    <div className="hero-mock-anim relative mx-auto mt-12 max-w-4xl px-0 sm:px-4">
      <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#13141A]">
        <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.05)] px-3 sm:px-4 py-2 sm:py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="ml-3 hidden sm:flex h-6 flex-1 max-w-xs items-center rounded-md bg-muted/60 px-2.5 text-[11px] text-muted-foreground">www.directrefer.in/{activeTab}</div>
        </div>
        <div className="flex border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] px-2 gap-1">
          {MOCK_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-[11px] font-medium transition-all ${activeTab === tab.id ? 'bg-[rgba(255,255,255,0.05)] text-white border-t border-x border-[rgba(255,255,255,0.06)]' : 'text-[#5C5D66] hover:text-[#9A9BA8]'}`}>
              <tab.icon className="h-3 w-3" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="p-3 sm:p-6 min-h-[280px]">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <ActiveContent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// Main Landing page
// ═══════════════════════════════════════════════════════════════

export default function Landing() {
  const { visibleProfessionals: professionals } = useApp()
  const { user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const utm = captureUTMFromURL()
    storeUTMParams(utm)
    trackPageVisit('/')
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* ── Nav ── */}
      <header className="glass-nav sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <Link to="/referral-jobs" className="hover:text-foreground">Referral Jobs</Link>
            <Link to="/browse-professionals" className="hover:text-foreground">Professionals</Link>
            <button type="button" onClick={() => scrollTo('how-it-works')} className="hover:text-foreground">How it works</button>
            <button type="button" onClick={() => scrollTo('trust')} className="hover:text-foreground">Why Trust</button>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {user ? (
              <Button size="sm" className="rounded-[14px] bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] shadow-sm text-xs sm:text-sm" asChild>
                <Link to="/dashboard">Go to Dashboard <ArrowRight className="ml-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /></Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild><Link to="/login">Sign in</Link></Button>
                <Button size="sm" className="rounded-[14px] bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] shadow-sm text-xs sm:text-sm" asChild>
                  <Link to="/login">Get started <ArrowRight className="ml-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /></Link>
                </Button>
              </>
            )}
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-border/50 bg-background px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
              <Link to="/referral-jobs" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 min-h-[44px] flex items-center hover:bg-muted hover:text-foreground">Referral Jobs</Link>
              <Link to="/browse-professionals" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 min-h-[44px] flex items-center hover:bg-muted hover:text-foreground">Professionals</Link>
              <button type="button" onClick={() => { scrollTo('how-it-works'); setMobileMenuOpen(false) }} className="rounded-lg px-3 py-3 min-h-[44px] text-left hover:bg-muted hover:text-foreground">How it works</button>
              <button type="button" onClick={() => { scrollTo('trust'); setMobileMenuOpen(false) }} className="rounded-lg px-3 py-3 min-h-[44px] text-left hover:bg-muted hover:text-foreground">Why Trust</button>
              {!user && (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 min-h-[44px] flex items-center hover:bg-muted hover:text-foreground">Sign in</Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <main id="main-content">
        {/* ── 1. Hero ── */}
        <section className="relative overflow-hidden px-4 pb-14 pt-10 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
          <div className="absolute inset-0 bg-premium-grid opacity-30" />
          <div className="absolute left-1/2 top-0 -z-10 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-primary/[0.03] blur-[100px]" />
          <div className="absolute right-0 top-1/2 -z-10 h-[250px] w-[350px] rounded-full bg-secondary/[0.02] blur-[80px]" />
          <div className="mx-auto max-w-3xl text-center relative z-10">
            <div className="hero-anim-1">
              <Badge variant="outline" className="gap-1.5 rounded-full border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary  badge-shine">
                <Sparkles className="h-3 w-3" /> <span>Ask for the referral, without the awkward cold DM</span>
              </Badge>
            </div>
              <h1 className="hero-anim-2 font-display mt-6 text-2xl font-bold leading-[1.08] tracking-tight sm:text-4xl lg:text-6xl">
              Get referred into<br className="hidden sm:block" /> your dream company
            </h1>
            <p className="hero-anim-3 mx-auto mt-5 max-w-xl text-sm sm:text-lg text-muted-foreground">
              Stop sending resumes into the void. Find verified professionals at real companies &mdash; then request a referral in two clicks.
            </p>
            <div className="hero-anim-4 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="rounded-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-6 sm:px-8 text-white shadow-glow hover:shadow-[0_4px_30px_-4px_rgba(99,102,241,0.5)] transition-all duration-300 text-sm sm:text-base" asChild>
                <Link to={user ? '/dashboard' : '/login'}><GraduationCap className="mr-2 h-4 w-4" /> {user ? 'Go to Dashboard' : "Find a professional \u2014 it's free"} <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
            <p className="hero-anim-4 mt-4 text-xs text-muted-foreground/70">
              Free for job seekers. No spam. Request limits protect every professional.
            </p>
            <div className="hero-anim-4 mt-5">
              <Link to="/referral-jobs" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline hover:underline-offset-4 transition-all">
                <Briefcase className="h-3.5 w-3.5" /> Browse referral jobs with live professional availability
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <InteractiveMock />
        </section>

        {/* ── 2. Social Proof Bar ── */}
        <section className="border-t border-border/50 px-4 py-6 sm:py-8">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground/70">
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary/70" /> Direct connections</span>
              <span className="hidden sm:inline text-border">{'\u2022'}</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary/70" /> Verified profiles</span>
              <span className="hidden sm:inline text-border">{'\u2022'}</span>
              <span className="flex items-center gap-1.5"><ChartColumn className="h-3.5 w-3.5 text-primary/70" /> Transparent tracking</span>
            </div>
          </div>
        </section>

        {/* ── 3. How It Works ── */}
        <section id="how-it-works" className="border-t border-border/50 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <FadeIn className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[30px] lg:text-[34px]">Three steps. One referral. Zero cold applications.</h2>
              <p className="mt-3 text-muted-foreground">No fees. No job board. Just a direct line to someone who can refer you.</p>
            </FadeIn>
            <div className="mt-12 grid gap-8 sm:grid-cols-3 items-stretch">
              {[
                { step: '1', title: 'Find your insider', desc: 'Search verified professionals by company, role, and availability.', icon: Users },
                { step: '2', title: 'Request in 60 seconds', desc: 'Write a short note, attach your resume \u2014 it goes directly to a real employee.', icon: Send },
                { step: '3', title: 'Know where you stand', desc: 'Track your referral from sent to accepted. No more guessing.', icon: TrendingUp },
              ].map((s, i) => (
                <FadeIn key={s.step} delay={i * 0.12} className="text-center group h-full flex flex-col items-center">
                  <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white shadow-glow-lg group-hover:scale-110 transition-transform duration-300" style={{ animationDelay: `${i * 0.5}s` }}>
                    <s.icon className="h-7 w-7" />
                    <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-bold text-primary border-2 border-primary/20">{s.step}</div>
                  </div>
                  <h3 className="mt-5 text-base sm:text-[18px] font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-xs sm:text-[14px] text-muted-foreground max-w-xs mx-auto">{s.desc}</p>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. See It In Action ── */}
        <section className="border-t border-border/50 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <FadeIn className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-2xl sm:text-[30px] lg:text-[34px] font-bold tracking-tight">See it in action</h2>
              <p className="mt-3 text-muted-foreground">60 seconds from signup to referral request. Here&rsquo;s how DirectRefer works.</p>
            </FadeIn>
            <FadeIn delay={0.15} className="mt-10">
              <SceneCarousel />
            </FadeIn>
          </div>
        </section>

        {/* ── 5. Why Trust DirectRefer ── */}
        <section id="trust" className="border-t border-border/50 bg-muted/5 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <FadeIn className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[30px] lg:text-[34px]">Trust is the product</h2>
              <p className="mt-3 text-muted-foreground">A referral marketplace only works when both sides feel safe.</p>
            </FadeIn>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
              {[
                { icon: ShieldCheck, title: 'Verified professionals', desc: 'Professionals verify their employment through work email or ID review before earning a verified badge.' },
                { icon: Users, title: 'Request limits', desc: 'Candidates can hold up to 5 active requests \u2014 no spam, no unlimited messages.' },
                { icon: Send, title: 'Private contacts', desc: 'Contact details are hidden until a request is accepted. No cold outreach to inboxes.' },
                { icon: FileText, title: 'Honest outcomes', desc: 'A referral is an opportunity, not a guarantee. No fabricated jobs, users, or success stories.' },
              ].map((t, i) => (
                <FadeIn key={t.title} delay={i * 0.08}>
                  <SpotlightCard className="h-full rounded-2xl border border-border/60 bg-card p-4 sm:p-5 glass-premium gradient-border transition-[border-color,box-shadow] duration-300 hover:border-primary/20 hover:shadow-[0_8px_32px_-8px_var(--card-glow)]">
                    <div className="icon-gradient flex h-10 w-10 items-center justify-center rounded-xl text-primary"><t.icon className="h-5 w-5" /></div>
                    <h3 className="mt-4 text-sm sm:text-base font-semibold text-foreground">{t.title}</h3>
                    <p className="mt-1.5 text-xs sm:text-[14px] text-muted-foreground leading-relaxed">{t.desc}</p>
                  </SpotlightCard>
                </FadeIn>
              ))}
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-4 text-center items-stretch">
              {[
                { stat: '13\u00d7', label: 'More likely to be hired', source: 'Jobvite' },
                { stat: '55%', label: 'Faster time-to-fill', source: 'SHRM' },
                { stat: '46%', label: 'Higher retention rate', source: 'Employee Referrals Benchmark' },
                { stat: '2.6\u00d7', label: 'Higher offer acceptance', source: 'Jobvite' },
              ].map(item => (
                <GlowCard key={item.label} className="p-5 bg-card">
                  <div className="font-display text-3xl sm:text-4xl font-extrabold text-gradient">{item.stat}</div>
                  <div className="mt-2 text-xs sm:text-[13px] text-muted-foreground">{item.label}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground/60">Source: {item.source}</div>
                </GlowCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. Why Not Just Use LinkedIn? ── */}
        <section className="border-t border-border/50 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <FadeIn className="text-center">
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[30px] lg:text-[34px]">Why not just use LinkedIn?</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">LinkedIn is great for networking. But when you need a referral, it has three critical gaps.</p>
            </FadeIn>
            <div className="mt-12 grid gap-5 sm:grid-cols-3 items-stretch">
              {[
                { icon: Search, title: "You don\u2019t know who refers", problem: 'LinkedIn shows 900M+ profiles. Finding someone who can actually refer you at a specific company is a needle-in-a-haystack problem.', solution: "DirectRefer shows you exactly who\u2019s verified, available, and accepting referral requests \u2014 filtered by company and role." },
                { icon: ShieldOff, title: 'No verification layer', problem: 'Anyone can claim to work anywhere on LinkedIn. You can\u2019t tell real insiders from people who just updated their headline.', solution: 'Every professional on DirectRefer is verified through work email or ID review. You see a verified badge or you don\u2019t.' },
                { icon: Send, title: 'Cold DMs get ignored', problem: 'The average LinkedIn InMail gets a 10-15% response rate. Most referral asks disappear into the void.', solution: "DirectRefer requests are structured, professional, and include your resume + note. Professionals have capacity limits \u2014 so they actually read them." },
              ].map((item, i) => (
                <FadeIn key={item.title} delay={i * 0.1}>
                  <SpotlightCard className="flex flex-col h-full rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
                    <div className="icon-gradient flex h-10 w-10 items-center justify-center rounded-xl text-primary"><item.icon className="h-5 w-5" /></div>
                    <h3 className="mt-4 text-sm sm:text-base font-semibold text-foreground">{item.title}</h3>
                    <div className="mt-4 flex flex-1 flex-col gap-2">
                      <div className="flex-1 rounded-lg bg-rose-500/5 border border-rose-500/10 p-3">
                        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">On LinkedIn</p>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.problem}</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">On DirectRefer</p>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.solution}</p>
                      </div>
                    </div>
                  </SpotlightCard>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. Featured Professionals ── */}
        <section className="border-t border-border/50 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <FadeIn className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[30px] lg:text-[34px]">Your next referral is one click away</h2>
                <p className="mt-3 max-w-xl text-muted-foreground">Verified insiders from the companies you actually want to work at.</p>
              </div>
              <Button variant="outline" className="rounded-full border-border/60 hover:border-primary/30 hover:bg-muted/30" asChild>
                <Link to={user ? '/dashboard' : '/login'}>Browse all professionals <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
            </FadeIn>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
              {professionals.slice(0, 4).map((p, i) => (
                <FadeIn key={p.id} delay={i * 0.08}>
                  <Link to={profileUrl('professional', p.id, p.slug)}>
                    <GlowCard className="h-full shadow-soft cursor-pointer transition-[border-color,box-shadow] duration-300 hover:shadow-glow group">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                          <GAvatar name={p.name} color={p.gradient} className="h-12 w-12 text-sm ring-2 ring-background group-hover:ring-primary/30 transition-all" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 truncate text-xs sm:text-[14px] font-semibold text-foreground">{p.name} <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#34D399]" /></div>
                            <div className="truncate text-xs sm:text-[13px] text-muted-foreground">{p.designation}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs sm:text-[13px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-[#E8B44C] text-[#E8B44C]" /> {p.rating}</span>
                          <span>{p.referralsCompleted} referrals</span>
                          <span className="text-[#34D399]">{p.responseRate}% replies</span>
                        </div>
                      </CardContent>
                    </GlowCard>
                  </Link>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── 8. Candidate / Referrer Paths ── */}
        <section id="roles" className="border-t border-border/50 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <FadeIn className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[30px] lg:text-[34px]">Built for the referral workflow</h2>
              <p className="mt-3 text-muted-foreground">Every role gets its own dashboard, navigation, and workflow &mdash; purpose-built, not one-size-fits-all.</p>
            </FadeIn>
            <div className="mt-12 grid gap-5 md:grid-cols-3 items-stretch">
              {ROLES.map((r, i) => (
                <FadeIn key={r.title} delay={i * 0.1}>
                  <GlowCard className="h-full shadow-soft transition-[border-color,box-shadow] duration-300 hover:shadow-glow group">
                    <CardContent className="p-6">
                      <div className="icon-gradient flex h-12 w-12 items-center justify-center rounded-xl text-primary group-hover:scale-110 transition-transform">
                        <r.icon className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-base sm:text-[18px] font-semibold text-foreground">{r.title}</h3>
                      <p className="mt-2 text-sm sm:text-[14px] leading-relaxed text-muted-foreground">{r.desc}</p>
                      <ul className="mt-4 space-y-2.5">
                        {r.points.map(p => (
                          <li key={p} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-[#34D399] shrink-0" /> {p}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </GlowCard>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── 9. FAQ ── */}
        <section className="border-t border-border/50 bg-muted/5 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <FadeIn className="text-center">
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[30px] lg:text-[34px]">Frequently asked questions</h2>
              <p className="mt-3 text-muted-foreground">Everything you need to know about Direct Refer.</p>
            </FadeIn>
            <div className="mt-12 space-y-4">
              {[
                { q: 'Is Direct Refer free for job seekers?', a: 'Yes. Creating an account, browsing professionals, and sending referral requests are completely free.' },
                { q: 'What happens after I send a referral request?', a: 'The professional receives your request with your note and resume. They can accept, pass, or message you back. You get real-time updates as your referral request moves through the pipeline.' },
                { q: 'How is this different from LinkedIn?', a: 'LinkedIn has 900M+ profiles \u2014 finding a real professional is a needle-in-a-haystack problem. DirectRefer shows only verified, available professionals with structured referral workflows. No cold DMs. No ghosting. Real outcomes.' },
                { q: 'Are referrals guaranteed?', a: 'No. A referral is an opportunity to be considered, not a guarantee of a job or interview. Professionals participate voluntarily and within their employer policies.' },
              ].map((item, i) => (
                <FadeIn key={item.q} delay={i * 0.06}>
                  <GlowCard className="p-4 sm:p-5 transition-all duration-300">
                    <h3 className="text-sm sm:text-[15px] font-semibold text-foreground">{item.q}</h3>
                    <p className="mt-2 text-xs sm:text-[14px] leading-relaxed text-muted-foreground">{item.a}</p>
                  </GlowCard>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── 10. CTA ── */}
        <section className="relative overflow-hidden border-t border-border/50 px-4 py-12 text-center sm:px-6 sm:py-20 lg:px-8">
          <div className="absolute inset-0 bg-premium-grid opacity-20" />
          <div className="absolute left-1/2 top-1/2 -z-10 h-[380px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.05] blur-[100px]" />
          <FadeIn>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[30px] lg:text-[34px] text-foreground">
              Don&rsquo;t just apply.<br /><span className="text-gradient">Get referred.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">Referred candidates are 13× more likely to be hired. Your next role starts with one intro.</p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="rounded-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-6 sm:px-8 text-white shadow-glow hover:shadow-[0_4px_30px_-4px_rgba(99,102,241,0.5)] transition-all duration-300 text-sm sm:text-base" asChild>
                <Link to={user ? '/dashboard' : '/login'}>{user ? 'Go to Dashboard' : 'Find a professional'} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-6 sm:px-8 text-sm sm:text-base border-border/60 hover:border-primary/30 hover:bg-muted/30" asChild>
                <Link to="/referral-jobs">Browse referral jobs</Link>
              </Button>
            </div>
          </FadeIn>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 bg-muted/30 px-4 py-10 sm:px-6 sm:py-14 lg:px-8" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <Link to="/" className="flex items-center gap-2.5" aria-label="DirectRefer — Home">
                <svg viewBox="0 0 512 385" className="h-7 w-auto" aria-hidden="true">
                  <image href="/logo-emblem.png" width="512" height="385" />
                </svg>
                <span className="font-display text-base font-bold text-foreground">DirectRefer</span>
              </Link>
              <p className="max-w-[220px] text-center text-xs text-muted-foreground leading-relaxed sm:text-left">Ask for the referral, without the awkward cold DM.</p>
              <div className="flex items-center gap-2">
                <a href="https://linkedin.com/in/direct-refer" target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground hover:bg-muted" aria-label="LinkedIn">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </a>
                <a href="https://x.com/directrefer" target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground hover:bg-muted" aria-label="X (Twitter)">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
                <a href="mailto:hello@directrefer.in" className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground hover:bg-muted" aria-label="Email">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                </a>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2.5 sm:items-start">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">Product</p>
              <Link to="/browse-professionals" className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">Browse Professionals</Link>
              <Link to="/referral-jobs" className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">Referral Jobs</Link>
              <Link to="/data-hub" className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">Data Hub</Link>
              <Link to="/guides" className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">Guides</Link>
            </div>
            <div className="flex flex-col items-center gap-2.5 sm:items-start">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">Company</p>
              <Link to="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">About Us</Link>
              <Link to="/careers" className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">Careers</Link>
              <Link to="/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">Pricing</Link>
            </div>
            <div className="flex flex-col items-center gap-2.5 sm:items-start">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">Support</p>
              <Link to="/help" className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">Help Center</Link>
              <Link to="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">Contact Us</Link>
              {user ? (
                <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">Dashboard</Link>
              ) : (
                <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">Sign in</Link>
              )}
              <div className="mt-1 flex flex-col items-center gap-1.5 sm:items-start">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">Legal</p>
                <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">Privacy Policy</Link>
                <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">Terms of Service</Link>
                <Link to="/cookies" className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">Cookie Policy</Link>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-border/50 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground/50">&copy; {new Date().getFullYear()} Direct Refer, Inc. All rights reserved.</p>
            <p className="text-[11px] text-muted-foreground/50">Made with care in India</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
