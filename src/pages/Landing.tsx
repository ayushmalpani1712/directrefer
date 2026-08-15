import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowRight, Briefcase, CheckCircle2, FileText, GraduationCap, Building2, MapPin, Clock, Linkedin, Mail, Menu, Send, ShieldCheck, Sparkles, Star, TrendingUp, Users, X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Chip, GAvatar } from '@/components/ui-kit'
import { Logo } from '@/components/layout'
import { FadeIn } from '@/components/FadeIn'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { profileUrl } from '@/data/mock'
import { supabase } from '@/lib/supabase'
import { captureUTMFromURL, storeUTMParams, trackPageVisit } from '@/lib/analytics'

const ROLES = [
  {
    icon: GraduationCap,
    title: 'For Job Seekers',
    desc: 'Request referrals from verified professionals, track every application, and land your dream role.',
    points: ['One-click referral requests', 'Real-time pipeline tracking', 'Verified referrer network'],
  },
  {
    icon: Briefcase,
    title: 'For Professionals',
    desc: 'Manage inbound referrals like a pro — with capacity controls, analytics and a reputation that compounds.',
    points: ['Smart request inbox', 'Referral analytics', 'Capacity controls'],
  },
  {
    icon: Users,
    title: 'For Recruiters',
    desc: 'Discover referral-warmed talent, run your pipeline, and measure every stage of the hiring funnel.',
    points: ['Talent search', 'Pipeline kanban', 'Hiring funnel analytics'],
  },
]

interface JobRow {
  id: string
  title: string
  department: string | null
  location: string | null
  type: string | null
  skills: string[] | null
  posted_at: string
}

function HeroMock() {
  const { visibleProfessionals } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const pros = visibleProfessionals.slice(0, 3)
  return (
    <div className="hero-mock-anim relative mx-auto mt-16 max-w-4xl px-0 sm:px-4">
      <div className="absolute -inset-x-4 sm:-inset-x-8 -top-10 bottom-0 -z-10 rounded-[2rem] bg-primary opacity-[0.03]" />
      <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#151A21]">
        <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="ml-3 hidden sm:flex h-6 flex-1 max-w-xs items-center rounded-md bg-[#0F1115] px-2.5 text-[11px] text-[#9CA3AF]">
            www.directrefer.in/dashboard
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[#9CA3AF]">Good morning,</div>
              <div className="font-display text-lg sm:text-xl font-bold text-white">Alex</div>
            </div>
            <div className="flex gap-3">
              <div className="text-center">
                <div className="font-display text-xl sm:text-2xl font-bold text-primary">12</div>
                <div className="text-[10px] sm:text-xs text-[#9CA3AF]">Referrals sent</div>
              </div>
              <div className="h-10 w-px bg-[rgba(255,255,255,0.06)]" />
              <div className="text-center">
                <div className="font-display text-xl sm:text-2xl font-bold text-[#4ADE80]">78</div>
                <div className="text-[10px] sm:text-xs text-[#9CA3AF]">Profile score</div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="border border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.1)] text-[#4ADE80] hover:bg-[rgba(74,222,128,0.1)] text-[10px] sm:text-xs">Accepted · Flipkart</Badge>
            <Badge className="border border-[rgba(59,95,229,0.2)] bg-[rgba(59,95,229,0.1)] text-primary hover:bg-[rgba(59,95,229,0.1)] text-[10px] sm:text-xs">Applied · Razorpay</Badge>
          </div>
          <div className="space-y-3">
            {pros.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#1A2028] p-3.5 transition-colors hover:border-[rgba(59,95,229,0.2)]">
                <GAvatar name={p.name} gradient={p.gradient} className="h-10 w-10 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs sm:text-[14px] font-semibold text-white">
                    {p.name} <ShieldCheck className="h-3.5 w-3.5 text-[#4ADE80]" />
                  </div>
                  <div className="truncate text-xs text-[#9CA3AF]">{p.designation} · {p.company}</div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                  <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-[#FBBF24] text-[#FBBF24]" />{p.rating}</span>
                  <span className="hidden sm:inline">{p.referralsCompleted} referrals</span>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 rounded-full border-[rgba(255,255,255,0.06)] text-xs text-white hover:bg-[rgba(255,255,255,0.04)]" onClick={() => navigate(user ? '/dashboard' : '/login')}>{user ? 'View' : 'Request'}</Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function Landing() {
  const { visibleProfessionals: professionals } = useApp()
  const { user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [featuredJobs, setFeaturedJobs] = useState<JobRow[]>([])

  useEffect(() => {
    const utm = captureUTMFromURL()
    storeUTMParams(utm)
    trackPageVisit('/')
    supabase.from('jobs').select('id, title, department, location, type, skills, posted_at').order('posted_at', { ascending: false }).limit(6).then(({ data }) => {
      if (data) setFeaturedJobs(data)
    })
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Nav */}
      <header className="glass sticky top-0 z-40 border-b border-border/50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <Link to="/referral-jobs" className="hover:text-foreground">Referral Jobs</Link>
            <button type="button" onClick={() => scrollTo('how-it-works')} className="hover:text-foreground">How it works</button>
            <button type="button" onClick={() => scrollTo('trust')} className="hover:text-foreground">Why Trust</button>
            <button type="button" onClick={() => scrollTo('roles')} className="hover:text-foreground">Who it's for</button>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {user ? (
              <Button size="sm" className="rounded-[14px] bg-gradient-to-r from-[#4F7CFF] to-[#7C5CFF] shadow-sm text-xs sm:text-sm" asChild>
                <Link to="/dashboard">Go to Dashboard <ArrowRight className="ml-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /></Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild><Link to="/login">Sign in</Link></Button>
                <Button size="sm" className="rounded-[14px] bg-gradient-to-r from-[#4F7CFF] to-[#7C5CFF] shadow-sm text-xs sm:text-sm" asChild>
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
              <button type="button" onClick={() => { scrollTo('how-it-works'); setMobileMenuOpen(false) }} className="rounded-lg px-3 py-3 min-h-[44px] text-left hover:bg-muted hover:text-foreground">How it works</button>
              <button type="button" onClick={() => { scrollTo('trust'); setMobileMenuOpen(false) }} className="rounded-lg px-3 py-3 min-h-[44px] text-left hover:bg-muted hover:text-foreground">Why Trust</button>
              <button type="button" onClick={() => { scrollTo('roles'); setMobileMenuOpen(false) }} className="rounded-lg px-3 py-3 min-h-[44px] text-left hover:bg-muted hover:text-foreground">Who it's for</button>
              {!user && (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 min-h-[44px] flex items-center hover:bg-muted hover:text-foreground">Sign in</Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <main id="main-content">
      {/* ── 1. Hero ── */}
      <section className="relative overflow-hidden px-4 pb-14 pt-12 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="hero-anim-1">
            <Badge variant="outline" className="gap-1.5 rounded-full border-[rgba(59,95,229,0.3)] bg-[rgba(59,95,229,0.08)] px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Referrals, reimagined
            </Badge>
          </div>
          <h1 className="hero-anim-2 font-display mt-6 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl lg:text-6xl">
            Stop applying blindly.<br />Find a real opportunity and get<br /><span className="text-gradient">referred by a verified professional.</span>
          </h1>
          <p className="hero-anim-3 mx-auto mt-5 max-w-xl text-base sm:text-lg text-muted-foreground">
            Find the right opportunity and request a referral from a verified professional at top companies — instead of cold-applying into the void.
          </p>
          <div className="hero-anim-4 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="rounded-full bg-primary px-6 sm:px-7 shadow-glow text-sm sm:text-base" asChild>
              <Link to={user ? '/dashboard' : '/login'}><GraduationCap className="mr-2 h-4 w-4" /> {user ? 'Go to Dashboard' : "I'm a candidate — get referred"} <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-6 sm:px-7 text-sm sm:text-base" asChild>
              <Link to={user ? '/dashboard' : '/login'}><Briefcase className="mr-2 h-4 w-4" /> I'm a professional — refer talent</Link>
            </Button>
          </div>
          <p className="hero-anim-4 mt-4 text-xs text-muted-foreground/70">
            No spam. Request limits protect every referrer. Verification protects every candidate.
          </p>
          <div className="hero-anim-4 mt-5">
            <Link to="/referral-jobs" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
              <Briefcase className="h-3.5 w-3.5" /> Browse referral jobs with live referrer availability
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
        <HeroMock />
      </section>

      {/* ── 2. Referral Opportunities ── */}
      <section className="border-t border-border/50 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FadeIn className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl sm:text-[30px] lg:text-[34px] font-bold tracking-tight">Referral opportunities with verified insiders</h2>
            <p className="mt-3 text-muted-foreground">Real roles at real companies — with verified professionals ready to refer you.</p>
          </FadeIn>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredJobs.length === 0 ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted/50" />
              ))
            ) : (
              featuredJobs.map((job, i) => (
                <FadeIn key={job.id} delay={i * 0.06}>
                  <Link to="/referral-jobs">
                    <Card className="h-full shadow-soft transition-all duration-200 hover:border-primary/15 cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold leading-tight text-foreground">{job.title}</h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">{job.department}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                            <ShieldCheck className="mr-1 h-3 w-3" /> Referrer
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>}
                          {job.type && <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {job.type}</span>}
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.max(0, Math.floor((Date.now() - new Date(job.posted_at).getTime()) / 86_400_000))}d ago</span>
                        </div>
                        {job.skills && job.skills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {job.skills.slice(0, 3).map((s) => <Chip key={s}>{s}</Chip>)}
                            {job.skills.length > 3 && <Chip>+{job.skills.length - 3}</Chip>}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </FadeIn>
              ))
            )}
          </div>
          <div className="mt-8 text-center">
            <Button variant="outline" className="rounded-full" asChild>
              <Link to="/referral-jobs">Browse all referral jobs <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── 3. How It Works ── */}
      <section id="how-it-works" className="border-t border-border/50 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FadeIn className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[30px] lg:text-[34px]">How it works</h2>
            <p className="mt-3 text-muted-foreground">Three simple steps to your next referral.</p>
          </FadeIn>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { step: '1', title: 'Find a professional', desc: 'Browse verified professionals from your target companies who are open to referrals.', icon: Users },
              { step: '2', title: 'Send a request', desc: 'Write a personalized note explaining why you are a fit, and attach your resume.', icon: Send },
              { step: '3', title: 'Track & get hired', desc: 'Follow your referral through every stage of the pipeline — from request to offer.', icon: TrendingUp },
            ].map((s, i) => (
              <FadeIn key={s.step} delay={i * 0.12} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-glow">
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="mt-4 text-xs font-bold uppercase tracking-widest text-primary">Step {s.step}</div>
                <h3 className="mt-2 text-base sm:text-[18px] font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-xs sm:text-[14px] text-muted-foreground">{s.desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Why Trust DirectRefer ── */}
      <section id="trust" className="border-t border-border/50 bg-muted/5 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FadeIn className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[30px] lg:text-[34px]">Trust is the product</h2>
            <p className="mt-3 text-muted-foreground">A referral marketplace only works when both sides feel safe.</p>
          </FadeIn>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: 'Verified referrers', desc: 'Professionals verify their employment through work email or ID review before earning a verified badge.' },
              { icon: Users, title: 'Request limits', desc: 'Candidates can hold up to 5 active requests — no spam, no unlimited messages.' },
              { icon: Send, title: 'Private contacts', desc: 'Contact details are hidden until a request is accepted. No cold outreach to inboxes.' },
              { icon: FileText, title: 'Honest outcomes', desc: 'A referral is an opportunity, not a guarantee. No fabricated jobs, users, or success stories.' },
            ].map((t, i) => (
              <FadeIn key={t.title} delay={i * 0.08}>
                <div className="h-full rounded-xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:border-primary/15">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(59,95,229,0.08)] text-primary"><t.icon className="h-4.5 w-4.5" /></div>
                  <h3 className="mt-3.5 text-sm sm:text-base font-semibold text-foreground">{t.title}</h3>
                  <p className="mt-1 text-xs sm:text-[14px] text-muted-foreground">{t.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-4 text-center">
            {[
              { stat: '13×', label: 'More likely to be hired', source: 'Jobvite' },
              { stat: '55%', label: 'Faster time-to-fill', source: 'SHRM' },
              { stat: '46%', label: 'Higher retention rate', source: 'Employee Referrals Benchmark' },
              { stat: '2.6×', label: 'Higher offer acceptance', source: 'Jobvite' },
            ].map((item) => (
              <div key={item.label}>
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">{item.stat}</div>
                <div className="mt-1 text-xs sm:text-[13px] text-muted-foreground">{item.label}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground/60">Source: {item.source}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Featured Professionals ── */}
      <section className="border-t border-border/50 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FadeIn className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[30px] lg:text-[34px]">Featured professionals</h2>
              <p className="mt-3 max-w-xl text-muted-foreground">Verified insiders from the companies you actually want to work at.</p>
            </div>
            <Button variant="outline" className="rounded-full" asChild>
              <Link to={user ? '/dashboard' : '/login'}>Browse all professionals <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          </FadeIn>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {professionals.slice(0, 4).map((p, i) => (
              <FadeIn key={p.id} delay={i * 0.08}>
                <Link to={profileUrl('professional', p.id, p.slug)}>
                  <Card className="shadow-soft cursor-pointer transition-all duration-200 hover:border-primary/15">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <GAvatar name={p.name} gradient={p.gradient} className="h-11 w-11 text-sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 truncate text-xs sm:text-[14px] font-semibold text-foreground">{p.name} <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#4ADE80]" /></div>
                          <div className="truncate text-xs sm:text-[13px] text-muted-foreground">{p.designation}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs sm:text-[13px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-[#FBBF24] text-[#FBBF24]" /> {p.rating}</span>
                        <span>{p.referralsCompleted} referrals</span>
                        <span className="text-[#4ADE80]">{p.responseRate}% replies</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Candidate / Referrer Paths ── */}
      <section id="roles" className="border-t border-border/50 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FadeIn className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[30px] lg:text-[34px]">One platform, three superpowers</h2>
            <p className="mt-3 text-muted-foreground">Every role gets its own dashboard, navigation and workflow — purpose-built, not one-size-fits-all.</p>
          </FadeIn>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {ROLES.map((r, i) => (
              <FadeIn key={r.title} delay={i * 0.1}>
                <Card className="h-full shadow-soft transition-all duration-200 hover:border-primary/15">
                  <CardContent className="p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(59,95,229,0.08)] text-primary">
                      <r.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base sm:text-[18px] font-semibold text-foreground">{r.title}</h3>
                    <p className="mt-2 text-sm sm:text-[14px] leading-relaxed text-muted-foreground">{r.desc}</p>
                    <ul className="mt-4 space-y-2">
                      {r.points.map((p) => (
                        <li key={p} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-[#4ADE80]" /> {p}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. FAQ ── */}
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
              { q: 'Can recruiters use the platform too?', a: 'Recruiters get a dedicated workspace to post jobs, search referral-warmed talent, manage a hiring pipeline, and track funnel analytics — all in one place.' },
              { q: 'How is this different from LinkedIn?', a: 'Direct Refer focuses specifically on the referral workflow. Instead of cold-applying, you connect with verified insiders who can refer you directly — improving your chances of getting noticed.' },
              { q: 'Are referrals guaranteed?', a: 'No. A referral is an opportunity to be considered, not a guarantee of a job or interview. Referrers participate voluntarily and within their employer policies.' },
            ].map((item, i) => (
              <FadeIn key={item.q} delay={i * 0.06}>
                <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
                  <h3 className="text-sm sm:text-[15px] font-semibold text-foreground">{item.q}</h3>
                  <p className="mt-2 text-xs sm:text-[14px] leading-relaxed text-muted-foreground">{item.a}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. CTA ── */}
      <section className="relative overflow-hidden border-t border-border/50 px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
        <div className="absolute left-1/2 top-1/2 -z-10 h-[380px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-[0.04]" />
        <FadeIn>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-5xl font-bold tracking-tight text-foreground">Your next role is one<br /><span className="text-primary">referral away</span></h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">Join candidates and verified professionals on Direct Refer.</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" className="rounded-full bg-primary px-6 sm:px-8 shadow-glow text-sm sm:text-base" asChild>
              <Link to={user ? '/dashboard' : '/login'}>{user ? 'Go to Dashboard' : "I'm a candidate"} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-6 sm:px-8 text-sm sm:text-base" asChild>
              <Link to={user ? '/dashboard' : '/login'}>{user ? 'Go to Dashboard' : "I'm a professional — refer talent"}</Link>
            </Button>
          </div>
        </FadeIn>
      </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 py-8 sm:px-6 sm:py-10 lg:px-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto max-w-7xl min-w-0">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <Logo />
              <p className="max-w-xs text-center text-xs text-muted-foreground sm:text-left">The referral platform that connects job seekers with verified professionals.</p>
              <div className="flex items-center gap-3">
                <a href="https://linkedin.com/in/direct-refer" target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground" aria-label="LinkedIn">
                  <Linkedin className="h-4 w-4" />
                </a>
                <a href="mailto:hello@directrefer.in" className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground" aria-label="Email">
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Product</p>
              <Link to="/referral-jobs" className="text-sm text-muted-foreground hover:text-foreground">Referral Jobs</Link>
              <Link to="/for/freshers" className="text-sm text-muted-foreground hover:text-foreground">For Freshers</Link>
              <Link to="/for/mba-students" className="text-sm text-muted-foreground hover:text-foreground">For MBA Students</Link>
              <Link to="/guides" className="text-sm text-muted-foreground hover:text-foreground">Guides</Link>
              <Link to="/success-stories" className="text-sm text-muted-foreground hover:text-foreground">Success Stories</Link>
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Legal</p>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link>
              <Link to="/cookies" className="text-sm text-muted-foreground hover:text-foreground">Cookie Policy</Link>
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
              <Link to="/help" className="text-sm text-muted-foreground hover:text-foreground">Help & Support</Link>
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Account</p>
              {user ? (
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
              ) : (
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
              )}
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact Us</Link>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70 sm:justify-start sm:border-t sm:border-border/50 sm:pt-6">
            <FileText className="h-3.5 w-3.5" /> © {new Date().getFullYear()} Direct Refer, Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
