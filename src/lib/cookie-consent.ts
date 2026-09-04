const CONSENT_KEY = 'dr_cookie_consent'

export function hasCookieConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'accepted'
  } catch {
    return false
  }
}

export function setCookieConsent(accepted: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, accepted ? 'accepted' : 'rejected')
  } catch {
    // localStorage unavailable
  }
}
