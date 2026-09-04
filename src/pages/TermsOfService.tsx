import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

const LAST_UPDATED = 'August 10, 2026'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Direct Refer (the "Service") at directrefer.in, you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p>
              Direct Refer is a referral platform that connects job seekers with verified professionals and recruiters. The Service enables users to request, manage, and track employee referrals at various companies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Eligibility</h2>
            <p>You must be at least 16 years old to use the Service. By using the Service, you represent that you meet this age requirement and have the legal capacity to enter into these Terms.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Account Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You must provide accurate, current, and complete information during registration.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Acceptable Use</h2>
            <p>You agree NOT to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Service for any unlawful purpose or in violation of any applicable law.</li>
              <li>Impersonate another person or misrepresent your affiliation with a company.</li>
              <li>Submit false, misleading, or fraudulent referral requests.</li>
              <li>Spam, harass, or abuse other users through the messaging system.</li>
              <li>Attempt to gain unauthorized access to other accounts or system infrastructure.</li>
              <li>Scrape, harvest, or collect user data from the platform.</li>
              <li>Use automated tools (bots, scripts) to interact with the Service.</li>
              <li>Circumvent rate limits, referral capacity caps, or other platform controls.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Referral Process</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Referral requests are evaluated by professionals at their sole discretion.</li>
              <li>Accepting a referral request does not guarantee employment or an interview.</li>
              <li>Professionals may set capacity limits on monthly referrals.</li>
              <li>Job seekers should not pressure professionals for referrals beyond reasonable follow-ups.</li>
              <li>Direct Refer does not guarantee the outcome of any referral.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are owned by Direct Refer and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. User Content</h2>
            <p>
              You retain ownership of any content you submit to the Service (profiles, resumes, messages, job postings). By submitting content, you grant Direct Refer a non-exclusive license to display, store, and process your content solely for the purpose of operating the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Termination</h2>
            <p>
              We may suspend or terminate your account at any time for violation of these Terms or for any other reason at our discretion. Upon termination, your right to use the Service ceases immediately. You may also delete your account at any time through Settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE ARE NOT RESPONSIBLE FOR THE CONDUCT OF ANY USER ON THE PLATFORM.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, DIRECT REFER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of competent jurisdiction in India.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Material changes will be communicated via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">14. Contact</h2>
            <p>
              Questions about these Terms? Contact us at <a href="mailto:hello@directrefer.in" className="text-primary hover:underline">hello@directrefer.in</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
