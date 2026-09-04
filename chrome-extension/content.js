// Credentials are loaded from config.js (gitignored). See config.example.js for setup.
let SUPABASE_URL = 'YOUR_SUPABASE_URL';
let SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const SITE_URL = 'https://www.directrefer.in';

try {
  if (typeof CONFIG !== 'undefined') {
    SUPABASE_URL = CONFIG.SUPABASE_URL || SUPABASE_URL;
    SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  }
} catch (e) {}

const COMPANY_SYNONYMS = {
  'google': 'Google India',
  'alphabet': 'Google India',
  'microsoft': 'Microsoft India',
  'amazon': 'Amazon India',
  'aws': 'Amazon India',
  'flipkart': 'Flipkart',
  'infosys': 'Infosys',
  'tcs': 'TCS',
  'tata consultancy': 'TCS',
  'wipro': 'Wipro',
  'hcl': 'HCL Technologies',
  'hcltech': 'HCL Technologies',
  'tech mahindra': 'Tech Mahindra',
  'mahindra': 'Tech Mahindra',
  'ibm': 'IBM India',
  'accenture': 'Accenture India',
  'cognizant': 'Cognizant',
  'capgemini': 'Capgemini India',
  'oracle': 'Oracle India',
  'samsung': 'Samsung India',
  'adobe': 'Adobe India',
  'salesforce': 'Salesforce India',
  'atlassian': 'Atlassian India',
  'uber': 'Uber India',
  'olympus': 'Olympus',
  'razorpay': 'Razorpay',
  'paytm': 'Paytm',
  'phonepe': 'PhonePe',
  'swiggy': 'Swiggy',
  'zomato': 'Zomato',
  'byju': "BYJU'S",
  'byjus': "BYJU'S",
  'freshworks': 'Freshworks',
  'freshdesk': 'Freshworks',
  'zoho': 'Zoho',
  'dell': 'Dell India',
  'hp': 'HP India',
  'cisco': 'Cisco India',
  'intel': 'Intel India',
  'nvidia': 'NVIDIA India',
  'qualcomm': 'Qualcomm India',
  'vmware': 'VMware India',
  'sap': 'SAP India',
  'nike': 'Nike India',
  'goldman': 'Goldman Sachs India',
  'jpmorgan': 'JPMorgan Chase India',
  'morgan stanley': 'Morgan Stanley India',
  'visa': 'Visa India',
  'mastercard': 'Mastercard India',
  'paypal': 'PayPal India',
  'linkedin': 'LinkedIn India',
  'meta': 'Meta India',
  'facebook': 'Meta India',
  'apple': 'Apple India',
}

let currentCompany = null
let sidebarEl = null

function detectPlatform() {
  const host = window.location.hostname
  if (host.includes('linkedin.com')) return 'linkedin'
  if (host.includes('naukri.com')) return 'naukri'
  return null
}

function detectCompanyLinkedIn() {
  const selectors = [
    '.job-details-jobs-unified-top-card__company-name a',
    '.job-details-jobs-unified-top-card__company-name',
    '.artdeco-entity-lockup__subtitle a',
    '.artdeco-entity-lockup__subtitle',
    '[data-test="job-details-company-name"]',
    '.jobs-unified-top-card__company-name a',
    '.jobs-unified-top-card__company-name',
    '.job-details__company-details a',
    '.job-details__company-details',
    'section.artdeco-card .t-14.t-bold',
  ]

  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el) {
      const text = el.textContent?.trim()
      if (text && text.length > 1 && text.length < 100) return text
    }
  }

  const scripts = document.querySelectorAll('script[type="application/ld+json"]')
  for (const s of scripts) {
    try {
      const json = JSON.parse(s.textContent)
      if (json.hiringOrganization?.name) return json.hiringOrganization.name
      if (json.Organization?.name) return json.Organization.name
    } catch { /* malformed JSON-LD — skip */ }
  }

  const title = document.title
  const match = title.match(/(?:at|@)\s+(.+?)(?:\s+in|\s+[-|]|$)/i)
  if (match) return match[1].trim()

  return null
}

function detectCompanyNaukri() {
  const selectors = [
    '.company-name',
    '.jd-header .company',
    'a[title][class*="company"]',
    '.job-details .company-name',
    '.jd-emp-details .company-name',
    '[data-test="company-name"]',
    '.styles_jd-header__companyName__GTEMT',
    'h2 a[title]',
    '.jobHeader .company',
  ]

  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el) {
      const text = el.textContent?.trim() || el.getAttribute('title')
      if (text && text.length > 1 && text.length < 100) return text
    }
  }

  const scripts = document.querySelectorAll('script[type="application/ld+json"]')
  for (const s of scripts) {
    try {
      const json = JSON.parse(s.textContent)
      if (json.hiringOrganization?.name) return json.hiringOrganization.name
    } catch { /* malformed JSON-LD — skip */ }
  }

  return null
}

function normalizeCompany(rawName) {
  if (!rawName) return null
  let name = rawName.trim()
  const lower = name.toLowerCase()

  for (const [key, canonical] of Object.entries(COMPANY_SYNONYMS)) {
    if (lower.includes(key)) return canonical
  }

  if (lower.endsWith(' india')) name = name.slice(0, -6).trim()

  return name || null
}

async function fetchReferrers(companyName) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles_professional?select=user_id,job_title,open_for_referrals&company_name=eq.${encodeURIComponent(companyName)}&open_for_referrals=eq.true`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return { company: companyName, count: data.length, referrers: data }
  } catch {
    return null
  }
}

function removeSidebar() {
  if (sidebarEl) {
    sidebarEl.remove()
    sidebarEl = null
  }
}

function createSidebar(data) {
  removeSidebar()

  const slug = data.company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-')
  const referralUrl = `${SITE_URL}/referral/${slug}`
  const hasReferrers = data.count > 0

  sidebarEl = document.createElement('div')
  sidebarEl.id = 'directrefer-sidebar'

  sidebarEl.innerHTML = `
    <div class="dr-header">
      <div class="dr-logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span>DirectRefer</span>
      </div>
      <button class="dr-close" id="dr-close-sidebar" aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    </div>
    <div class="dr-body">
      <div class="dr-company">${data.company}</div>
      ${hasReferrers ? `
        <div class="dr-stat">
          <span class="dr-count">${data.count}</span>
          <span class="dr-label">verified referrer${data.count !== 1 ? 's' : ''} available</span>
        </div>
        <a href="${referralUrl}" target="_blank" rel="noopener noreferrer" class="dr-btn dr-btn-primary">
          Request a Referral
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 17 17 7"/><path d="M7 7h10v10"/>
          </svg>
        </a>
      ` : `
        <div class="dr-empty">
          <span class="dr-empty-icon">📋</span>
          <span>No verified referrers yet at ${data.company}</span>
          <span class="dr-empty-sub">Be the first — sign up as a referrer</span>
        </div>
        <a href="${SITE_URL}/signup" target="_blank" rel="noopener noreferrer" class="dr-btn dr-btn-secondary">
          Join as a Referrer
        </a>
      `}
    </div>
  `

  document.body.appendChild(sidebarEl)

  sidebarEl.querySelector('#dr-close-sidebar')?.addEventListener('click', () => {
    removeSidebar()
    chrome.storage?.local?.set({ dr_hidden: true })
  })
}

let debounceTimer = null

function onPageChange() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const platform = detectPlatform()
    if (!platform) return

    const hidden = await new Promise((resolve) => {
      chrome.storage?.local?.get('dr_hidden', (result) => {
        resolve(result?.dr_hidden || false)
      })
    })
    if (hidden) return

    const rawCompany = platform === 'linkedin'
      ? detectCompanyLinkedIn()
      : detectCompanyNaukri()

    const company = normalizeCompany(rawCompany)

    if (!company || company === currentCompany) return
    currentCompany = company

    const data = await fetchReferrers(company)
    if (data) createSidebar(data)
  }, 1500)
}

const observer = new MutationObserver(onPageChange)
observer.observe(document.body, { childList: true, subtree: true })

onPageChange()

window.addEventListener('popstate', () => {
  currentCompany = null
  removeSidebar()
  onPageChange()
})

const origPushState = history.pushState
history.pushState = function () {
  origPushState.apply(this, arguments)
  currentCompany = null
  removeSidebar()
  onPageChange()
}
