import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowRight, BarChart3, Bookmark, Briefcase, CheckCircle2, ChevronRight, Command,
  FileText, GraduationCap, Linkedin, Mail, Menu, MessageSquare, Moon, Send, ShieldCheck, Sparkles, Star, TrendingUp, Users, X, Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GAvatar } from '@/components/ui-kit'
import { Logo } from '@/components/layout'
import { FadeIn } from '@/components/FadeIn'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { profileUrl } from '@/data/mock'

const ROLES = [
  {
    icon: GraduationCap,
    title: 'For Job Seekers',
    desc: 'Request referrals from verified professionals, track every application, and land your dream role.',
    points: ['One-click referral requests'],
    gradient: 'from-[#4F7CFF] to-[#7C5CFF]',
  },
  {
    icon: Briefcase,
    title: 'For Professionals',
    desc: 'Manage inbound referrals like a pro — with capacity controls, analytics and a reputation that compounds.',
    points: ['Smart request inbox', 'Referral analytics', 'Leaderboard & badges'],
    gradient: 'from-sky-500 to-cyan-400',
  },
  {
    icon: Users,
    title: 'For Recruiters',
    desc: 'Discover referral-warmed talent, run your pipeline, and measure every stage of the hiring funnel.',
    points: ['Talent search', 'Pipeline kanban', 'Hiring funnel analytics'],
    gradient: 'from-[#4F7CFF] to-[#7C5CFF]',
  },
]

const FEATURES = [
  { icon: Command, title: 'Command palette', desc: 'Every page, person and action — one ⌘K away.' },
  { icon: Moon, title: 'Dark & light mode', desc: 'A pixel-perfect theme system that follows your OS.' },
  { icon: MessageSquare, title: 'Real-time messaging', desc: 'Chat with professionals, share resumes inline.' },
  { icon: BarChart3, title: 'Deep analytics', desc: 'Referral, review and hiring-funnel insights.' },
  { icon: ShieldCheck, title: 'Verified network', desc: 'Company-verified professionals you can trust.' },
  { icon: Bookmark, title: 'Bookmarks & feeds', desc: 'Save people, follow activity, never lose track.' },
]

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
          <div className="flex gap-2">
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
                  <span>{p.referralsCompleted} referrals</span>
                </div>
                <Button size="sm" variant="outline" className="rounded-full border-[rgba(255,255,255,0.06)] text-xs text-white hover:bg-[rgba(255,255,255,0.04)]" onClick={() => navigate(user ? '/dashboard' : '/login')}>{user ? 'View' : 'Request'}</Button>
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
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Nav */}
      <header className="glass sticky top-0 z-40 border-b border-border/50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <button onClick={() => scrollTo('roles')} className="hover:text-foreground">Who it's for</button>
            <button onClick={() => scrollTo('features')} className="hover:text-foreground">Features</button>
            <button onClick={() => scrollTo('network')} className="hover:text-foreground">Network</button>
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
              className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-border/50 bg-background px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
              <button onClick={() => { scrollTo('roles'); setMobileMenuOpen(false) }} className="rounded-lg px-3 py-2.5 text-left hover:bg-muted hover:text-foreground">Who it's for</button>
              <button onClick={() => { scrollTo('features'); setMobileMenuOpen(false) }} className="rounded-lg px-3 py-2.5 text-left hover:bg-muted hover:text-foreground">Features</button>
              <button onClick={() => { scrollTo('network'); setMobileMenuOpen(false) }} className="rounded-lg px-3 py-2.5 text-left hover:bg-muted hover:text-foreground">Network</button>
              {!user && (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-muted hover:text-foreground">Sign in</Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <main id="main-content">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-14 pt-12 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="hero-anim-1">
            <Badge variant="outline" className="gap-1.5 rounded-full border-[rgba(59,95,229,0.3)] bg-[rgba(59,95,229,0.08)] px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Referrals, reimagined
            </Badge>
          </div>
          <h1 className="hero-anim-2 font-display mt-6 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl lg:text-6xl">
            Get referred.<br />Get <span className="text-gradient">hired.</span>
          </h1>
          <p className="hero-anim-3 mx-auto mt-5 max-w-xl text-base sm:text-lg text-muted-foreground">
            Direct Refer connects job seekers with verified professionals who can refer them at top companies — and gives recruiters a warmer pipeline.
          </p>
          <div className="hero-anim-4 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="rounded-full bg-primary px-6 sm:px-7 shadow-glow text-sm sm:text-base" asChild>
              <Link to={user ? '/dashboard' : '/login'}>{user ? 'Go to Dashboard' : 'Start free'} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-6 sm:px-7 text-sm sm:text-base" onClick={() => scrollTo('network')}>
              Explore the network <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
        <HeroMock />
      </section>

      {/* Why referrals */}
      <section className="border-t border-border/50 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FadeIn className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl sm:text-[30px] lg:text-[34px] font-bold tracking-tight">Why referrals change everything</h2>
            <p className="mt-3 text-muted-foreground">The data is clear — referred candidates win.</p>
          </FadeIn>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: TrendingUp, stat: '13×', label: 'More likely to be hired than job board applicants', color: 'text-[#4ADE80]' },
              { icon: Zap, stat: '55%', label: 'Faster time-to-fill compared to other sourcing channels', color: 'text-primary' },
              { icon: Users, stat: '46%', label: 'Higher retention rate after one year of employment', color: 'text-amber-500' },
              { icon: BarChart3, stat: '2.6×', label: 'Higher offer acceptance rate for referred candidates', color: 'text-rose-500' },
            ].map((item, i) => (
              <FadeIn key={item.label} delay={i * 0.08}>
                <div className="rounded-xl border border-border bg-card p-6 text-center shadow-soft transition-all duration-200 hover:border-primary/15">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(59,95,229,0.08)]">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div className="mt-4 font-display text-2xl sm:text-3xl font-extrabold text-foreground">{item.stat}</div>
                  <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-muted-foreground">{item.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground/60">Sources: Jobvite, Employee Referrals Benchmark Report, SHRM</p>
        </div>
      </section>

      {/* Roles */}
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

      {/* Features */}
      <section id="features" className="border-t border-border/50 bg-muted/5 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FadeIn className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[30px] lg:text-[34px]">Designed like the tools you love</h2>
            <p className="mt-3 text-muted-foreground">The polish of Linear, the warmth of Airbnb, the speed of Vercel — applied to your career.</p>
          </FadeIn>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={(i % 3) * 0.08}>
                <div className="h-full rounded-xl border border-[rgba(255,255,255,0.06)] bg-card p-5 shadow-soft transition-all duration-200 hover:border-primary/15">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(59,95,229,0.08)] text-primary"><f.icon className="h-4.5 w-4.5" /></div>
                  <h3 className="mt-3.5 text-sm sm:text-base font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1 text-xs sm:text-[14px] text-muted-foreground">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Network */}
      <section id="network" className="border-t border-border/50 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FadeIn className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[30px] lg:text-[34px]">A network that opens doors</h2>
              <p className="mt-3 max-w-xl text-muted-foreground">Verified professionals from the companies you actually want to work at.</p>
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

      {/* How it works */}
      <section className="border-t border-border/50 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FadeIn className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[30px] lg:text-[34px]">How it works</h2>
            <p className="mt-3 text-muted-foreground">Three simple steps to your next referral.</p>
          </FadeIn>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { step: '1', title: 'Find a professional', desc: 'Browse verified professionals from your target companies.', icon: Users },
              { step: '2', title: 'Send a request', desc: 'Write a personalized note and attach your resume.', icon: Send },
              { step: '3', title: 'Track & get hired', desc: 'Follow your referral through every stage of the pipeline.', icon: TrendingUp },
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

      {/* FAQ */}
      <section className="border-t border-border/50 bg-muted/5 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <FadeIn className="text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[30px] lg:text-[34px]">Frequently asked questions</h2>
            <p className="mt-3 text-muted-foreground">Everything you need to know about Direct Refer.</p>
          </FadeIn>
          <div className="mt-12 space-y-4">
            {[
              { q: 'Is Direct Refer free for job seekers?', a: 'Yes. Creating an account, browsing professionals, and sending referral requests are completely free. You only pay if you choose a premium plan for advanced features.' },
              { q: 'How are professionals verified?', a: 'Professionals verify their identity and employment through LinkedIn and company email confirmation. Verified badges indicate confirmed employment at their listed company.' },
              { q: 'What happens after I send a referral request?', a: 'The professional receives your request with your note and resume. They can accept, decline, or message you back. You get real-time updates as your referral moves through the pipeline.' },
              { q: 'Can recruiters use the platform too?', a: 'Absolutely. Recruiters get a dedicated workspace to post jobs, search referral-warmed talent, manage a hiring pipeline, and track funnel analytics — all in one place.' },
              { q: 'How is this different from LinkedIn?', a: 'Direct Refer focuses specifically on the referral workflow. Instead of cold-applying, you connect with verified insiders who can refer you directly — dramatically improving your chances of landing an interview.' },
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

      {/* Founder Note */}
      <section className="border-t border-border/50 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-soft">
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
                <div className="shrink-0">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#4F7CFF] to-[#7C5CFF] text-2xl font-bold text-white shadow-glow">
                    AM
                  </div>
                </div>
                <div className="mt-5 sm:mt-0 sm:ml-6">
                  <div className="text-xs font-bold uppercase tracking-widest text-primary">Built by the founder</div>
                  <h3 className="mt-2 font-display text-xl font-bold text-foreground">Ayush Malpani</h3>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                    I built Direct Refer because I was tired of cold-applying into the void. Referrals changed my career trajectory — and I want to make that accessible to everyone. This platform exists to help job seekers connect with verified insiders who can open doors.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-3 sm:justify-start">
                    <a href="https://linkedin.com/in/direct-refer" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </a>
                    <a href="mailto:hello@directrefer.in" className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">
                      <Mail className="h-4 w-4" /> Contact
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border/50 px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
        <div className="absolute left-1/2 top-1/2 -z-10 h-[380px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-[0.04]" />
        <FadeIn>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-5xl font-bold tracking-tight text-foreground">Your next role is one<br /><span className="text-primary">referral away</span></h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">Join professionals and job seekers on Direct Refer.</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" className="rounded-full bg-primary px-6 sm:px-8 shadow-glow text-sm sm:text-base" asChild>
              <Link to={user ? '/dashboard' : '/login'}>{user ? 'Go to Dashboard' : 'Create free account'} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-6 sm:px-8 text-sm sm:text-base" asChild>
              <Link to={user ? '/dashboard' : '/login'}>{user ? 'Go to Dashboard' : "I'm a professional — join now"}</Link>
            </Button>
          </div>
        </FadeIn>
      </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 py-8 sm:px-6 sm:py-10 lg:px-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto max-w-7xl min-w-0">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
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

            {/* Product */}
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Product</p>
              <button onClick={() => scrollTo('features')} className="text-sm text-muted-foreground hover:text-foreground">Features</button>
              <button onClick={() => scrollTo('network')} className="text-sm text-muted-foreground hover:text-foreground">Network</button>
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
              <Link to="/help" className="text-sm text-muted-foreground hover:text-foreground">Help & Support</Link>
            </div>

            {/* Legal */}
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Legal</p>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link>
              <Link to="/cookies" className="text-sm text-muted-foreground hover:text-foreground">Cookie Policy</Link>
            </div>

            {/* Account */}
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
