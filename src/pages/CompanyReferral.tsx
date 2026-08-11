import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, FileText, Shield, Users, Zap, Building2, MapPin, Briefcase, Star } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { getCompanyBySlug, getRoleBySlug, getLocationBySlug, COMPANIES, ROLES, LOCATIONS } from '@/data/referral-seo'

function generateStructuredData(company: string, role?: string, location?: string) {
  const companyData = getCompanyBySlug(company)
  const roleData = role ? getRoleBySlug(role) : undefined
  const locationData = location ? getLocationBySlug(location) : undefined

  const title = roleData && locationData
    ? `Get Referred at ${companyData?.name || company} as ${roleData.label} in ${locationData.label}`
    : roleData
    ? `Get Referred at ${companyData?.name || company} as ${roleData.label}`
    : locationData
    ? `Get Referred at ${companyData?.name || company} in ${locationData.label}`
    : `Get Referred at ${companyData?.name || company}`

  const description = companyData
    ? `Connect with verified ${companyData.name} employees who can refer you for ${roleData?.label || 'open positions'}${locationData ? ` in ${locationData.label}` : ''}. Skip the resume black hole and get your application seen.`
    : `Connect with verified professionals who can refer you at top companies.`

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: `https://www.directrefer.in/referral/${company}${role ? '/' + role : ''}${location ? '/' + location : ''}`,
    publisher: {
      '@type': 'Organization',
      name: 'Direct Refer',
      url: 'https://www.directrefer.in',
    },
    mainEntity: {
      '@type': 'JobPosting',
      title: roleData ? `${roleData.label} at ${companyData?.name || company}` : `Positions at ${companyData?.name || company}`,
      description: description,
      hiringOrganization: {
        '@type': 'Organization',
        name: companyData?.name || company,
      },
      jobLocation: locationData ? {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: locationData.label,
          addressCountry: locationData.country === 'India' ? 'IN' : locationData.country === 'USA' ? 'US' : locationData.country === 'UK' ? 'GB' : locationData.country,
        },
      } : undefined,
    },
    FAQPage: {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `How do I get a referral at ${companyData?.name || company}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Sign up on Direct Refer, browse verified ${companyData?.name || company} employees, and send a referral request. Our platform connects you directly with professionals who can refer you internally.`,
          },
        },
        {
          '@type': 'Question',
          name: `How much does a referral at ${companyData?.name || company} typically pay?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `${companyData?.name || company} referral bonuses typically range from ${companyData?.averageReferralBonus || '$3,000 - $7,000'}. Professionals are incentivized to refer qualified candidates.`,
          },
        },
        {
          '@type': 'Question',
          name: `Is Direct Refer free for job seekers?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! Direct Refer is completely free for job seekers. Create your profile, browse professionals, and send referral requests at no cost.',
          },
        },
      ],
    },
  }
}

export default function CompanyReferral() {
  const { company, role, location } = useParams<{ company: string; role?: string; location?: string }>()

  const companyData = company ? getCompanyBySlug(company) : undefined
  const roleData = role ? getRoleBySlug(role) : undefined
  const locationData = location ? getLocationBySlug(location) : undefined

  const title = useMemo(() => {
    if (!companyData) return 'Page Not Found'
    if (roleData && locationData) return `Get Referred at ${companyData.name} as ${roleData.label} in ${locationData.label}`
    if (roleData) return `Get Referred at ${companyData.name} as ${roleData.label}`
    if (locationData) return `Get Referred at ${companyData.name} in ${locationData.label}`
    return `Get Referred at ${companyData.name}`
  }, [companyData, roleData, locationData])

  const description = useMemo(() => {
    if (!companyData) return ''
    return `Connect with verified ${companyData.name} employees who can refer you for ${roleData?.label || 'open positions'}${locationData ? ` in ${locationData.label}` : ''}. Skip the resume black hole and get your application seen.`
  }, [companyData, roleData, locationData])

  useEffect(() => {
    if (title) {
      document.title = `${title} | Direct Refer`
    }
    const meta = document.querySelector('meta[name="description"]')
    if (meta && description) {
      meta.setAttribute('content', description)
    }
  }, [title, description])

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify(generateStructuredData(company || '', role, location))
    script.id = 'referral-structured-data'
    document.head.appendChild(script)
    return () => {
      const existing = document.getElementById('referral-structured-data')
      if (existing) existing.remove()
    }
  }, [company, role, location])

  if (!companyData) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold">Company Not Found</h1>
            <p className="text-muted-foreground">The company you're looking for doesn't exist on our platform yet.</p>
            <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Browse All Companies
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const relatedCompanies = COMPANIES.filter(c => c.slug !== company).slice(0, 6)
  const relatedRoles = ROLES.slice(0, 6)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link to="/login" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/referral" className="hover:text-foreground transition-colors">Referrals</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{companyData.name}</span>
          {roleData && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">{roleData.label}</span>
            </>
          )}
          {locationData && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">{locationData.label}</span>
            </>
          )}
        </nav>

        {/* Hero */}
        <div className="mb-12 space-y-6">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{companyData.logo}</span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {companyData.industry}</span>
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {companyData.headquarters}</span>
                {roleData && <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" /> {roleData.label}</span>}
              </div>
            </div>
          </div>
          <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">{description}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Find {companyData.name} Referrers <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Become a Referrer
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-5 text-center space-y-1">
            <div className="text-2xl font-bold text-primary">50+</div>
            <div className="text-sm text-muted-foreground">Verified Referrers</div>
          </div>
          <div className="rounded-xl border border-border p-5 text-center space-y-1">
            <div className="text-2xl font-bold text-primary">85%</div>
            <div className="text-sm text-muted-foreground">Response Rate</div>
          </div>
          <div className="rounded-xl border border-border p-5 text-center space-y-1">
            <div className="text-2xl font-bold text-primary">48h</div>
            <div className="text-sm text-muted-foreground">Avg. Response Time</div>
          </div>
        </div>

        {/* How It Works */}
        <section className="mb-12 space-y-6">
          <h2 className="text-2xl font-bold">How to Get Referred at {companyData.name}</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">1</div>
              <h3 className="font-semibold">Create Your Profile</h3>
              <p className="text-sm text-muted-foreground">Sign up for free and build your profile with skills, experience, and target roles at {companyData.name}.</p>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">2</div>
              <h3 className="font-semibold">Find Verified Referrers</h3>
              <p className="text-sm text-muted-foreground">Browse {companyData.name} employees who are verified and willing to refer qualified candidates.</p>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">3</div>
              <h3 className="font-semibold">Request & Get Hired</h3>
              <p className="text-sm text-muted-foreground">Send a referral request, track your pipeline, and get your application seen by the hiring team.</p>
            </div>
          </div>
        </section>

        {/* Why Use Direct Refer */}
        <section className="mb-12 space-y-6">
          <h2 className="text-2xl font-bold">Why Use Direct Refer for {companyData.name} Referrals</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-border p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-medium">Verified Professionals</h3>
                <p className="text-sm text-muted-foreground">Every referrer is verified through work email or ID. No fake profiles.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border p-4">
              <Zap className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-medium">Fast Response</h3>
                <p className="text-sm text-muted-foreground">Get responses within 48 hours on average. No waiting weeks.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border p-4">
              <Shield className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-medium">Privacy First</h3>
                <p className="text-sm text-muted-foreground">Contact details are only shared when both parties agree.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border p-4">
              <Users className="h-5 w-5 text-violet-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-medium">Pipeline Tracking</h3>
                <p className="text-sm text-muted-foreground">Track your referral from request to hire in real-time.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Referral Tips */}
        {companyData.referralTips.length > 0 && (
          <section className="mb-12 space-y-6">
            <h2 className="text-2xl font-bold">Tips for Getting Referred at {companyData.name}</h2>
            <div className="rounded-xl border border-border bg-muted/30 p-6">
              <ul className="space-y-3">
                {companyData.referralTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Star className="h-4 w-4 text-amber-500 mt-1 shrink-0" />
                    <span className="text-sm text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mb-12 space-y-6">
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-5 space-y-2">
              <h3 className="font-semibold">How do I get a referral at {companyData.name}?</h3>
              <p className="text-sm text-muted-foreground">Sign up on Direct Refer, browse verified {companyData.name} employees, and send a referral request. Our platform connects you directly with professionals who can refer you internally.</p>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-2">
              <h3 className="font-semibold">How much does a referral at {companyData.name} typically pay?</h3>
              <p className="text-sm text-muted-foreground">{companyData.name} referral bonuses typically range from {companyData.averageReferralBonus}. Professionals are incentivized to refer qualified candidates.</p>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-2">
              <h3 className="font-semibold">Is Direct Refer free for job seekers?</h3>
              <p className="text-sm text-muted-foreground">Yes! Direct Refer is completely free for job seekers. Create your profile, browse professionals, and send referral requests at no cost.</p>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-2">
              <h3 className="font-semibold">How are {companyData.name} employees verified?</h3>
              <p className="text-sm text-muted-foreground">We verify professionals through work email domains, LinkedIn verification, and ID confirmation. Every profile is reviewed before going live.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-12 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">Ready to Get Referred at {companyData.name}?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Join thousands of job seekers who have landed their dream jobs through employee referrals.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {/* Related Companies */}
        <section className="mb-12 space-y-6">
          <h2 className="text-2xl font-bold">Referrals at Other Companies</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedCompanies.map(c => (
              <Link
                key={c.slug}
                to={`/referral/${c.slug}`}
                className="flex items-center gap-3 rounded-xl border border-border p-4 hover:bg-muted/50 transition-colors"
              >
                <span className="text-2xl">{c.logo}</span>
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.industry}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Related Roles */}
        <section className="mb-12 space-y-6">
          <h2 className="text-2xl font-bold">Popular Roles</h2>
          <div className="flex flex-wrap gap-2">
            {relatedRoles.map(r => (
              <Link
                key={r.slug}
                to={`/referral/${company}/${r.slug}`}
                className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {r.label}
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-7xl min-w-0">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <Logo />
              <p className="max-w-xs text-center text-xs text-muted-foreground sm:text-left">The referral platform that connects job seekers with verified professionals.</p>
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Product</p>
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
              <Link to="/help" className="text-sm text-muted-foreground hover:text-foreground">Help & Support</Link>
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Legal</p>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link>
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Account</p>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
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
