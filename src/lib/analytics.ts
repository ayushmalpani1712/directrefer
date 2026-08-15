export interface UTMParams {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
}

export function captureUTMFromURL(): UTMParams {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const utm: UTMParams = {}
  if (params.get('utm_source')) utm.source = params.get('utm_source')!
  if (params.get('utm_medium')) utm.medium = params.get('utm_medium')!
  if (params.get('utm_campaign')) utm.campaign = params.get('utm_campaign')!
  if (params.get('utm_term')) utm.term = params.get('utm_term')!
  if (params.get('utm_content')) utm.content = params.get('utm_content')!
  return utm
}

export function storeUTMParams(utm: UTMParams): void {
  if (typeof window === 'undefined') return
  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem('utm_params', JSON.stringify(utm))
  }
}

export function getStoredUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {}
  try {
    const stored = sessionStorage.getItem('utm_params')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export function getReferrerSource(): string | null {
  if (typeof window === 'undefined') return null
  const ref = document.referrer
  if (!ref) return null
  try {
    const url = new URL(ref)
    if (url.hostname.includes('linkedin.com')) return 'linkedin'
    if (url.hostname.includes('twitter.com') || url.hostname.includes('x.com')) return 'twitter'
    if (url.hostname.includes('google.com')) return 'google'
    if (url.hostname.includes('facebook.com')) return 'facebook'
    if (url.hostname.includes('reddit.com')) return 'reddit'
    return url.hostname
  } catch {
    return null
  }
}

export function getSourceLabel(utm: UTMParams, referrerSource: string | null): string {
  if (utm.source) return utm.source
  if (referrerSource) return referrerSource
  return 'direct'
}

export function trackPageVisit(page: string, metadata?: Record<string, string>): void {
  if (typeof window === 'undefined') return
  const event = {
    page,
    timestamp: new Date().toISOString(),
    ...getStoredUTMParams(),
    referrer: getReferrerSource(),
    ...metadata,
  }
  const events = JSON.parse(sessionStorage.getItem('page_visits') || '[]')
  events.push(event)
  sessionStorage.setItem('page_visits', JSON.stringify(events.slice(-50)))
}

export function getPageVisits(): Array<Record<string, string>> {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(sessionStorage.getItem('page_visits') || '[]')
  } catch {
    return []
  }
}
