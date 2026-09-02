import { Link } from 'react-router'
import { FileText } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 mt-auto" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Link to="/" className="flex items-center gap-2" aria-label="DirectRefer — Home">
              <svg viewBox="0 0 250 189" className="h-5 w-auto" aria-hidden="true">
                <image href="/logo-emblem.png" width="250" height="189" />
              </svg>
              <span className="font-display text-sm font-bold text-logo">DirectRefer</span>
            </Link>
            <p className="max-w-[200px] text-center text-[11px] text-muted-foreground leading-snug sm:text-left">Ask for the referral, without the awkward cold DM.</p>
            <div className="flex items-center gap-1.5">
              <a href="https://linkedin.com/in/direct-refer" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground hover:bg-muted" aria-label="LinkedIn">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
              <a href="https://x.com/directrefer" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground hover:bg-muted" aria-label="X (Twitter)">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href="mailto:hello@directrefer.in" className="flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground hover:bg-muted" aria-label="Email">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
              </a>
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5 sm:items-start sm:gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50 mb-1">Product</p>
            <Link to="/login" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5 min-h-[36px] flex items-center">Browse Professionals</Link>
            <Link to="/referral-jobs" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5 min-h-[36px] flex items-center">Referral Jobs</Link>
            <Link to="/guides" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5 min-h-[36px] flex items-center">Guides</Link>
          </div>
          <div className="flex flex-col items-center gap-0.5 sm:items-start sm:gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50 mb-1">Company</p>
            <Link to="/about" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5 min-h-[36px] flex items-center">About Us</Link>
            <a href="mailto:careers@directrefer.in" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5 min-h-[36px] flex items-center">Careers</a>
          </div>
          <div className="flex flex-col items-center gap-0.5 sm:items-start sm:gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50 mb-1">Support</p>
            <Link to="/help" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5 min-h-[36px] flex items-center">Help Center</Link>
            <Link to="/contact" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5 min-h-[36px] flex items-center">Contact Us</Link>
            <Link to="/login" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5 min-h-[36px] flex items-center">Sign in</Link>
          </div>
          <div className="flex flex-col items-center gap-0.5 sm:items-start sm:gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50 mb-1">Legal</p>
            <Link to="/privacy" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5 min-h-[36px] flex items-center">Privacy Policy</Link>
            <Link to="/terms" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5 min-h-[36px] flex items-center">Terms of Service</Link>
            <Link to="/cookies" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5 min-h-[36px] flex items-center">Cookie Policy</Link>
          </div>
        </div>
        <div className="mt-6 pt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">&copy; {new Date().getFullYear()} Direct Refer, Inc. All rights reserved.</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><FileText className="h-2.5 w-2.5" /> Made with care in India</p>
        </div>
      </div>
    </footer>
  )
}
