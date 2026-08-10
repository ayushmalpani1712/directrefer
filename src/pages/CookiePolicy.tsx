import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

const LAST_UPDATED = 'August 10, 2026'

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Cookie Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. What Are Cookies</h2>
            <p>
              Cookies are small text files placed on your device when you visit a website. They help the site function properly and provide usage information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. How We Use Cookies</h2>
            <p>Direct Refer uses cookies sparingly and only for essential purposes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Authentication Cookies:</strong> Keep you signed in and maintain your session. These are strictly necessary for the Service to function.</li>
              <li><strong>Preference Cookies:</strong> Store your theme (dark/light mode), sidebar state, and workspace preferences.</li>
              <li><strong>Security Cookies:</strong> Help protect against cross-site request forgery (CSRF) and other attacks.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Cookies We Do NOT Use</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Advertising or marketing cookies</li>
              <li>Third-party analytics tracking cookies</li>
              <li>Social media tracking cookies</li>
              <li>Cross-site tracking cookies</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Third-Party Services</h2>
            <p>Our hosting and infrastructure providers may set their own cookies:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Vercel:</strong> CDN and hosting — may set cookies for performance and routing.</li>
              <li><strong>Supabase:</strong> Authentication and database — session management cookies.</li>
            </ul>
            <p>We do not control these cookies. Refer to each provider's privacy policy for details.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Managing Cookies</h2>
            <p>
              You can control cookies through your browser settings. Disabling essential cookies may prevent the Service from functioning properly (e.g., you may not be able to stay signed in).
            </p>
            <p>
              Most browsers allow you to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>View and delete cookies</li>
              <li>Block third-party cookies</li>
              <li>Block all cookies (may break site functionality)</li>
              <li>Set cookie preferences per site</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Changes to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated revision date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Contact</h2>
            <p>
              Questions about our cookie usage? Contact us at <a href="mailto:hello@directrefer.in" className="text-primary hover:underline">hello@directrefer.in</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
