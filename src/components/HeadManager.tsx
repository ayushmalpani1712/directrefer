import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'

const PAGE_META: Record<string, { title: string; description: string }> = {
  '/': { title: 'Direct Refer — Get Referred by Verified Professionals', description: 'Find the right opportunity and request a referral from a verified professional at top companies. Track your referral pipeline instead of cold-applying.' },
  '/login': { title: 'Sign In', description: 'Sign in to your Direct Refer account. Access referrals, messaging, and analytics.' },
  '/dashboard': { title: 'Dashboard', description: 'Your referral dashboard. Track applications, messages, and analytics.' },
  '/job-seeker/profile': { title: 'My Profile', description: 'Manage your professional profile, resume, and referral preferences on Direct Refer.' },
  '/job-seeker/professionals': { title: 'Browse Verified Professionals', description: 'Find verified professionals at top companies who can refer you. Filter by company, skills, location, and referral availability.' },
  '/job-seeker/applications': { title: 'My Referrals', description: 'Track your referral requests from submission to interview.' },
  '/professional/referrals': { title: 'Referral Requests', description: 'Review and manage incoming referral requests.' },
  '/job-seeker/messages': { title: 'Messages', description: 'Chat with professionals and recruiters in real-time.' },
  '/professional/messages': { title: 'Messages', description: 'Chat with professionals and recruiters in real-time.' },
  '/recruiter/messages': { title: 'Messages', description: 'Chat with professionals and recruiters in real-time.' },
  '/admin/messages': { title: 'Messages', description: 'Chat with professionals and recruiters in real-time.' },
  '/analytics': { title: 'Analytics', description: 'Deep insights into your referral performance, conversion rates, and pipeline.' },
  '/admin': { title: 'Admin Panel', description: 'Platform management, user oversight, and system health.' },
  '/settings': { title: 'Settings', description: 'Manage your account, preferences, and security settings.' },
  '/help': { title: 'Help & Support', description: 'Answers, guides, and support for using Direct Refer.' },
  '/referral-jobs': { title: 'Referral Jobs', description: 'Browse open roles at companies with verified referrers available. Filter by company, role, location, and skills, then request a referral instead of cold-applying.' },
  '/verify-email': { title: 'Verify Email', description: 'Verify your email address to access your account.' },
  '/forgot-password': { title: 'Forgot Password', description: 'Reset your Direct Refer password.' },
  '/privacy': { title: 'Privacy Policy', description: 'How Direct Refer collects, uses, and protects your personal information. Read our privacy practices.' },
  '/terms': { title: 'Terms of Service', description: 'The rules and guidelines governing your use of the Direct Refer platform.' },
  '/cookies': { title: 'Cookie Policy', description: 'How Direct Refer uses cookies to provide and improve our service.' },
  '/about': { title: 'About Us', description: 'Learn about Direct Refer — our mission to make job referrals accessible, fair, and transparent for everyone.' },
  '/contact': { title: 'Contact Us', description: 'Get in touch with the Direct Refer team for support, partnerships, or feedback.' },
}

const SITE_NAME = 'Direct Refer'
const DEFAULT_DESCRIPTION = 'Get referred into top companies. Connect with verified professionals, track your referral pipeline, and land your dream role.'
const OG_IMAGE = 'https://www.directrefer.in/og-image.png'
const BASE_URL = 'https://www.directrefer.in'

export function HeadManager() {
  const { pathname } = useLocation()
  const { visibleProfessionals = [] } = useApp()
  const [companyMeta, setCompanyMeta] = useState<{ title: string; description: string } | null>(null)

  // Fetch company data for /company/:id routes
  useEffect(() => {
    const companyMatch = pathname.match(/^\/company\/(.+)$/)
    if (!companyMatch) {
      setCompanyMeta(null)
      return
    }

    const companyId = companyMatch[1]
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const resolvedId = UUID_RE.test(companyId) ? companyId : null
    const fetchCompany = async () => {
      try {
        let userId = resolvedId
        if (!userId) {
          const { data: slugUser } = await supabase.from('users').select('id').eq('slug', companyId).single()
          userId = slugUser?.id
        }
        if (!userId) return
        const { data: profile } = await supabase
          .from('profiles_recruiter')
          .select('company_name, company_description, hiring_department, company_size')
          .eq('user_id', userId)
          .single()

        if (profile) {
          const name = profile.company_name || 'Company'
          const dept = profile.hiring_department || 'Technology'
          const desc = profile.company_description
            ? profile.company_description.slice(0, 160)
            : `View ${name}'s open positions, benefits, and referral opportunities on Direct Refer.`
          setCompanyMeta({
            title: `${name} — ${dept} | Careers & Referrals`,
            description: desc,
          })
        }
      } catch {
        setCompanyMeta(null)
      }
    }
    fetchCompany()
  }, [pathname])

  const dynamicMeta = (() => {
    const proMatch = pathname.match(/^\/professionals\/(.+)$/)
    if (proMatch) {
      const param = proMatch[1]
      const pro = visibleProfessionals.find((p) => p.id === param || p.slug === param)
      if (pro) return { title: `${pro.name} — ${pro.designation} at ${pro.company}`, description: `${pro.name} is a verified ${pro.designation} at ${pro.company} with ${pro.yearsExp}+ years of experience. Request a referral, view skills, and connect on Direct Refer.` }
    }
    const companyMatch = pathname.match(/^\/company\/(.+)$/)
    if (companyMatch && companyMeta) return companyMeta
    return null
  })()

  const meta = dynamicMeta || PAGE_META[pathname] || { title: SITE_NAME, description: DEFAULT_DESCRIPTION }
  const fullTitle = pathname === '/' ? meta.title : `${meta.title} | ${SITE_NAME}`

  // Private/app routes must not be indexed
  const NOINDEX_PATTERNS = [
    /^\/(dashboard|admin|settings|job-seeker|professional|recruiter|auth)/,
    /^\/(forgot-password|reset-password|verify-email)/,
  ]
  const noindex = NOINDEX_PATTERNS.some((re) => re.test(pathname))
  const robotsValue = noindex ? 'noindex, nofollow' : 'index, follow'

  useEffect(() => {
    document.title = fullTitle

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('name', name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    const setProperty = (prop: string, content: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', prop)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    setMeta('description', meta.description)
    setMeta('robots', robotsValue)
    setMeta('theme-color', '#0F172A')

    setProperty('og:title', fullTitle)
    setProperty('og:description', meta.description)
    setProperty('og:type', 'website')
    setProperty('og:url', `${BASE_URL}${pathname}`)
    setProperty('og:image', OG_IMAGE)
    setProperty('og:site_name', SITE_NAME)

    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', fullTitle)
    setMeta('twitter:description', meta.description)
    setMeta('twitter:image', OG_IMAGE)

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', `${BASE_URL}${pathname}`)
  }, [pathname, fullTitle, meta.description, robotsValue, companyMeta])

  return null
}
