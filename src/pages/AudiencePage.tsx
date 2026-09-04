import { useEffect, useMemo } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Briefcase, Building2, GraduationCap, Users } from 'lucide-react'
import { Logo } from '@/components/layout'

export interface AudiencePageProps {
  audience: 'freshers' | 'mba-students' | 'career-switchers' | 'experienced'
}

const AUDIENCE_CONFIG = {
  freshers: {
    title: 'Employee Referrals for Freshers — Get Referred Before You Apply',
    description: 'Fresh graduates: get referred by verified professionals at top companies. Employee referrals increase your chance of landing your first tech job by 10x.',
    hero: 'Get Your First Job Through Employee Referrals',
    subhero: 'Fresh graduates are 10x more likely to get hired through employee referrals. Skip the black hole of online applications.',
    stats: [
      { value: '10x', label: 'Higher callback rate' },
      { value: '60%', label: 'Of jobs filled via referrals' },
      { value: '0', label: 'Cost to you' },
    ],
    benefits: [
      { icon: Building2, title: 'Skip the ATS', text: 'Your resume reaches a human, not an applicant tracking system' },
      { icon: Users, title: 'Trusted introduction', text: 'A current employee vouches for you before the interview' },
      { icon: Briefcase, title: 'Insider context', text: 'Learn what the team actually needs — not just the job description' },
    ],
    faqs: [
      { q: 'Do I need experience to get a referral?', a: 'No. Many professionals are happy to refer fresh graduates from their college or community.' },
      { q: 'How does it work?', a: 'Browse available referral opportunities, find a professional at your target company, and send a referral request with your resume and a short note.' },
      { q: 'Is it really free?', a: 'Yes. DirectRefer is free for candidates. You only pay if you choose a premium feature.' },
    ],
    cta: 'Browse Referral Opportunities',
    ctaLink: '/referral-jobs',
    canonical: 'https://www.directrefer.in/for/freshers',
  },
  'mba-students': {
    title: 'Employee Referrals for MBA Students — Get Referred to Top Companies',
    description: 'MBA students: get employee referrals for consulting, product, and finance roles at top companies. Your degree + a referral = interview.',
    hero: 'Turn Your MBA Into Interviews With Employee Referrals',
    subhero: 'Your MBA opens doors — but a referral opens them faster. Get referred to consulting, product, and finance roles.',
    stats: [
      { value: '3x', label: 'Faster interview process' },
      { value: '45%', label: 'Of MBA hires via referrals' },
      { value: '100+', label: 'Verified referrers' },
    ],
    benefits: [
      { icon: GraduationCap, title: 'MBA-targeted roles', text: 'Find referral opportunities specifically for consulting, PM, and finance roles' },
      { icon: Building2, title: 'Top companies', text: 'Get referred to McKinsey, BCG, Google, Amazon, and other top employers' },
      { icon: Users, title: 'Alumni network', text: 'Connect with MBA alumni who can vouch for your skills and potential' },
    ],
    faqs: [
      { q: 'Which companies can I get referred to?', a: 'We have verified referrers at 50+ top companies including Google, Microsoft, Amazon, McKinsey, and leading Indian companies.' },
      { q: 'Do I need to be at a top-tier MBA?', a: 'No. We have referrers from various backgrounds who are happy to help motivated candidates.' },
      { q: 'How long does a referral take?', a: 'Most referrals are reviewed within 3-5 business days. Some companies respond faster.' },
    ],
    cta: 'Find MBA Referral Opportunities',
    ctaLink: '/referral-jobs',
    canonical: 'https://www.directrefer.in/for/mba-students',
  },
  'career-switchers': {
    title: 'Employee Referrals for Career Switchers — Get Referred to Your New Role',
    description: 'Switching careers? Get referred by employees at your target company. Referrals help career switchers bypass resume screening.',
    hero: 'Switch Careers Faster With Employee Referrals',
    subhero: 'Career switchers face the hardest screening. A referral puts your application on top of the pile.',
    stats: [
      { value: '5x', label: 'More likely to get interviewed' },
      { value: '30%', label: 'Of career switchers hired via referrals' },
      { value: '48hrs', label: 'Average response time' },
    ],
    benefits: [
      { icon: Users, title: 'Insider perspective', text: 'Learn what skills actually matter for the role you want to switch into' },
      { icon: Building2, title: 'Bypass resume filters', text: 'ATS systems often reject career changers — referrals bypass this entirely' },
      { icon: Briefcase, title: 'Contextual introduction', text: 'Your referrer explains your transferable skills better than a resume ever could' },
    ],
    faqs: [
      { q: 'Can I get referred even without direct experience?', a: 'Yes. Referrals help by highlighting transferable skills that ATS systems miss.' },
      { q: 'What roles are best for career switchers?', a: 'Product management, data analytics, and frontend development are popular switches with strong referral support.' },
      { q: 'How do I explain my career switch in a referral request?', a: 'Focus on transferable skills and genuine interest. Your referrer can advocate for your potential.' },
    ],
    cta: 'Explore Referral Opportunities',
    ctaLink: '/referral-jobs',
    canonical: 'https://www.directrefer.in/for/career-switchers',
  },
  experienced: {
    title: 'Employee Referrals for Experienced Professionals — Get Referred to Senior Roles',
    description: 'Senior professionals: get referred to leadership and specialist roles. Employee referrals are the #1 way executives find new positions.',
    hero: 'Land Senior Roles Through Employee Referrals',
    subhero: 'The best senior roles are filled through referrals. Get introduced to decision-makers at top companies.',
    stats: [
      { value: '80%', label: 'Of senior roles via referrals' },
      { value: '2x', label: 'Higher salary negotiation leverage' },
      { value: '72hrs', label: 'Average time to first interview' },
    ],
    benefits: [
      { icon: Building2, title: 'Executive access', text: 'Get introduced directly to hiring managers, not HR screening' },
      { icon: Users, title: 'Industry connections', text: 'Connect with senior professionals who understand your expertise' },
      { icon: Briefcase, title: 'Contextual matching', text: 'Your referrer advocates for your specific skills and leadership style' },
    ],
    faqs: [
      { q: 'Are there senior-level referrers?', a: 'Yes. Our verified professionals include directors, VPs, and senior leads at top companies.' },
      { q: 'How does this differ from executive search?', a: 'DirectRefer gives you direct access to current employees who can refer you internally, often before roles are publicly posted.' },
      { q: 'Can I refer others too?', a: 'Absolutely. Senior professionals often refer peers and build their network through the platform.' },
    ],
    cta: 'Browse Senior Referral Opportunities',
    ctaLink: '/referral-jobs',
    canonical: 'https://www.directrefer.in/for/experienced',
  },
}

export default function AudiencePage({ audience }: AudiencePageProps) {
  const config = AUDIENCE_CONFIG[audience]

  useEffect(() => {
    document.title = config.title
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', config.description)
  }, [config])

  const structuredData = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: config.title,
    description: config.description,
    url: config.canonical,
    publisher: {
      '@type': 'Organization',
      name: 'Direct Refer',
      url: 'https://www.directrefer.in',
    },
  }), [config])

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Log in</Link>
            <Link to="/login" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Sign up free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-16 text-center sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{config.hero}</h1>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">{config.subhero}</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to={config.ctaLink} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              {config.cta} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/about" className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-accent transition-colors">
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/50 bg-muted/30 px-4 py-12">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-8 text-center">
          {config.stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-primary">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Why referrals work for {audience.replace('-', ' ')}</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3 items-stretch">
            {config.benefits.map((b) => (
              <div key={b.title} className="rounded-xl border border-border/50 bg-card p-6 shadow-soft">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border/50 bg-muted/30 px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">How it works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3 items-stretch">
            {[
              { step: '1', title: 'Create your profile', text: 'Sign up and complete your profile with skills, experience, and target roles.' },
              { step: '2', title: 'Find a referrer', text: 'Browse verified professionals at your target companies who are open to referrals.' },
              { step: '3', title: 'Request a referral', text: 'Send a personalized request. Your referrer reviews and submits an internal referral.' },
            ].map((s) => (
              <div key={s.step}>
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{s.step}</div>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Frequently asked questions</h2>
          <div className="mt-8 space-y-4">
            {config.faqs.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-border/50 bg-card p-5 shadow-soft [&_summary]:cursor-pointer">
                <summary className="font-medium">{faq.q}</summary>
                <p className="mt-3 text-sm text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/50 bg-muted/30 px-4 py-16 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to get referred?</h2>
          <p className="mt-3 text-muted-foreground">Join thousands of professionals and candidates using DirectRefer.</p>
          <Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Get started — it's free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 py-8 text-center text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">DirectRefer</Link> &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}
