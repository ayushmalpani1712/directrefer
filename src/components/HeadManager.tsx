import { useEffect } from 'react'
import { useLocation } from 'react-router'

const PAGE_META: Record<string, { title: string; description: string }> = {
  '/': { title: 'Direct Refer — Get Referred, Get Hired', description: 'Connect with verified professionals who refer you into the world\'s best companies. Track referrals, message professionals, and land your dream role.' },
  '/login': { title: 'Sign In', description: 'Sign in to your Direct Refer account. Access referrals, messaging, and analytics.' },
  '/dashboard': { title: 'Dashboard', description: 'Your referral dashboard. Track applications, messages, and analytics.' },
  '/profile': { title: 'My Profile', description: 'Manage your professional profile, resume, and referral preferences.' },
  '/professionals': { title: 'Find Professionals', description: 'Browse verified professionals from top companies. Filter by skills, location, and availability.' },
  '/applications': { title: 'My Referrals', description: 'Track your referral requests from submission to interview.' },
  '/requests': { title: 'Referral Requests', description: 'Review and manage incoming referral requests.' },
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
const OG_IMAGE = 'https://directrefer.in/og-image.png'
const BASE_URL = 'https://directrefer.in'

export function HeadManager() {
  const { pathname } = useLocation()
  const meta = PAGE_META[pathname] || { title: SITE_NAME, description: DEFAULT_DESCRIPTION }
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

    // Open Graph
    setProperty('og:title', fullTitle)
    setProperty('og:description', meta.description)
    setProperty('og:type', 'website')
    setProperty('og:url', `${BASE_URL}${pathname}`)
    setProperty('og:image', OG_IMAGE)
    setProperty('og:site_name', SITE_NAME)

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', fullTitle)
    setMeta('twitter:description', meta.description)
    setMeta('twitter:image', OG_IMAGE)

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', `${BASE_URL}${pathname}`)
  }, [pathname, fullTitle, meta.description])

  return null
}
