import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, ChevronRight, FileText } from 'lucide-react'
import { Logo } from '@/components/layout'
import { getCompanyBySlug, getRoleBySlug, getLocationBySlug, COMPANIES } from '@/data/referral-seo'

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
    ? `Connect with ${companyData.name} employees who can refer you for ${roleData?.label || 'open positions'}${locationData ? ` in ${locationData.label}` : ''}.`
    : `Connect with professionals who can refer you at top companies.`

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
    return `Connect with ${companyData.name} employees who can refer you for ${roleData?.label || 'open positions'}${locationData ? ` in ${locationData.label}` : ''}.`
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

  const relatedCompanies = COMPANIES.filter(c => c.slug !== company).slice(0, 9)

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
                <span>{companyData.industry}</span>
                <span>•</span>
                <span>{companyData.headquarters}</span>
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

        {/* CTA */}
        <section className="mb-12 rounded-xl border border-border bg-muted/30 p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">Ready to Get Referred at {companyData.name}?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Sign up on Direct Refer and connect with {companyData.name} employees.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {/* Related Companies */}
        <section className="mb-12 space-y-6">
          <h2 className="text-2xl font-bold">Other Companies</h2>
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
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-7xl min-w-0">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <Logo />
              <p className="max-w-xs text-center text-xs text-muted-foreground sm:text-left">The referral platform that connects job seekers with professionals.</p>
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
