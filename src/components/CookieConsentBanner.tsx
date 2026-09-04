import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { Cookie } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { hasCookieConsent, setCookieConsent } from '@/lib/cookie-consent'

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!hasCookieConsent()) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const accept = () => {
    setCookieConsent(true)
    setVisible(false)
  }

  const reject = () => {
    setCookieConsent(false)
    setVisible(false)
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            We use a single preference cookie to remember your sidebar state. No tracking, no analytics.
            <Link to="/cookies" className="ml-1 underline hover:text-foreground">Learn more</Link>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="ghost" onClick={reject}>Reject</Button>
          <Button size="sm" onClick={accept}>Accept</Button>
        </div>
      </div>
    </div>
  )
}
