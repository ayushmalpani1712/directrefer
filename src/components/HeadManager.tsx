import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'

const PAGE_META: Record<string, { title: string; description: string }> = {
  '/': { title: 'Direct Refer — Get Referred, Get Hired', description: 'Connect with verified professionals who refer you at top companies. Track referrals, message professionals, and land your dream role.' },
  '/login': { title: 'Sign In', description: 'Sign in to your Direct Refer account. Access referrals, messaging, and analytics.' },
  '/dashboard': { title: 'Dashboard', description: 'Your referral dashboard. Track applications, messages, and analytics.' },
  '/job-seeker/profile': { title: 'My Profile', description: 'Manage your professional profile, resume, and referral preferences on Direct Refer.' },
  '/job-seeker/professionals': { title: 'Browse Verified Professionals', description: 'Find verified professionals at top companies who can refer you. Filter by company, skills, location, and referral availability.' },
  '/job-seeker/applications': { title: 'My Referrals', description: 'Track your referral requests from submission to interview.' },
  '/professional/referrals': { title: 'Referral Requests', description: 'Review and manage incoming referral requests.' },
  '/messages': { title: 'Messages', description: 'Chat with professionals and recruiters in real-time.' },
  '/analytics': { title: 'Analytics', description: 'Deep insights into your referral performance, conversion rates, and pipeline.' },
  '/admin': { title: 'Admin Panel', description: 'Platform management, user oversight, and system health.' },
  '/settings': { title: 'Settings', description: 'Manage your account, preferences, and security settings.' },
  '/help': { title: 'Help & Support', description: 'Answers, guides, and support for using Direct Refer.' },
  '/verify-email': { title: 'Verify Email', description: 'Verify your email address to access your account.' },
  '/forgot-password': { title: 'Forgot Password', description: 'Reset your Direct Refer password.' },
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
    const fetchCompany = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles_recruiter')
          .select('company_name, company_description, hiring_department, company_size')
          .eq('user_id', companyId)
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
      const pro = visibleProfessionals.find((p) => p.id === proMatch[1])
      if (pro) return { title: `${pro.name} — ${pro.designation} at ${pro.company}`, description: `${pro.name} is a verified ${pro.designation} at ${pro.company} with ${pro.yearsExp}+ years of experience. Request a referral, view skills, and connect on Direct Refer.` }
    }
    const companyMatch = pathname.match(/^\/company\/(.+)$/)
    if (companyMatch && companyMeta) return companyMeta
    return null
  })()

  const meta = dynamicMeta || PAGE_META[pathname] || { title: SITE_NAME, description: DEFAULT_DESCRIPTION }
  const fullTitle = pathname === '/' ? meta.title : `${meta.title} | ${SITE_NAME}`

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
    setMeta('robots', 'index, follow')
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
  }, [pathname, fullTitle, meta.description, companyMeta])

  return null
}
