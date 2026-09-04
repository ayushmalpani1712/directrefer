import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

const LAST_UPDATED = 'August 10, 2026'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
            <p>
              Direct Refer ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our referral platform at directrefer.in (the "Service").
            </p>
            <p>
              By using the Service, you agree to the collection and use of information in accordance with this policy. If you do not agree, please discontinue use of the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
            <h3 className="text-base font-medium text-foreground">2.1 Information You Provide</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Information:</strong> Name, email address, password, mobile number, and professional role (job seeker, professional, or recruiter).</li>
              <li><strong>Profile Data:</strong> Work history, skills, education, resume, bio, company name, job title, location, and professional links (LinkedIn, GitHub, portfolio).</li>
              <li><strong>Referral Data:</strong> Referral requests, messages, job postings, and application materials shared through the platform.</li>
              <li><strong>Verification Data:</strong> Work email for OTP verification, government ID for identity verification.</li>
              <li><strong>Communications:</strong> Messages sent through the platform, support inquiries, and feedback.</li>
            </ul>

            <h3 className="text-base font-medium text-foreground">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Usage Data:</strong> Pages visited, features used, actions taken, timestamps, and referral pipeline interactions.</li>
              <li><strong>Device Data:</strong> Browser type, operating system, device type, and screen resolution.</li>
              <li><strong>Log Data:</strong> IP address, access times, and referring URLs.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide, maintain, and improve the referral platform.</li>
              <li>To facilitate connections between job seekers, professionals, and recruiters.</li>
              <li>To process referral requests and track pipeline progress.</li>
              <li>To verify professional identities and maintain platform trust.</li>
              <li>To send transactional notifications (referral updates, messages, system alerts).</li>
              <li>To detect and prevent fraud, abuse, and security incidents.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. How We Share Your Information</h2>
            <p>We do not sell your personal information. We may share information with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Other Users:</strong> Your name, professional profile, and company are visible to other users as part of the referral workflow.</li>
              <li><strong>Service Providers:</strong> Third-party vendors who assist in hosting, analytics, and platform operations (e.g., Vercel, Supabase).</li>
              <li><strong>Legal Requirements:</strong> When required by law, subpoena, or government request.</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed to provide the Service. You may delete your account at any time from Settings. Upon deletion, we will remove your personal data within 30 days, except where retention is required by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption in transit (TLS) and at rest, row-level security policies, and regular security audits. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access, correct, or delete your personal data.</li>
              <li>Export your data in a portable format.</li>
              <li>Opt out of non-essential data processing.</li>
              <li>Withdraw consent at any time.</li>
            </ul>
            <p>
              You can manage most of your data directly through the Settings page. For additional requests, contact us at <a href="mailto:hello@directrefer.in" className="text-primary hover:underline">hello@directrefer.in</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Cookies</h2>
            <p>
              We use minimal cookies necessary for authentication and session management. We do not use third-party advertising cookies. See our <Link to="/cookies" className="text-primary hover:underline">Cookie Policy</Link> for details.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Children's Privacy</h2>
            <p>
              The Service is not intended for users under the age of 16. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be communicated via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, contact us at:
            </p>
            <p>
              <strong>Direct Refer</strong><br />
              Email: <a href="mailto:hello@directrefer.in" className="text-primary hover:underline">hello@directrefer.in</a><br />
              Website: <a href="https://www.directrefer.in" className="text-primary hover:underline">www.directrefer.in</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
