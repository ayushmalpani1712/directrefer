import { ArrowLeft, Mail, Linkedin, MessageSquare, MapPin, Clock } from 'lucide-react'
import { Link } from 'react-router'

export default function Contact() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
          <p className="text-lg text-muted-foreground">
            We'd love to hear from you. Reach out for support, partnerships, feedback, or any questions.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-6 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Email</h3>
            <p className="text-sm text-muted-foreground">For general inquiries, support, and feedback.</p>
            <a href="mailto:hello@directrefer.in" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              hello@directrefer.in
            </a>
          </div>

          <div className="rounded-xl border border-border p-6 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Linkedin className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">LinkedIn</h3>
            <p className="text-sm text-muted-foreground">Connect with our founder for partnerships and press.</p>
            <a href="https://linkedin.com/in/ayushmalpani" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              Ayush Malpani
            </a>
          </div>

          <div className="rounded-xl border border-border p-6 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">In-App Support</h3>
            <p className="text-sm text-muted-foreground">Already have an account? Use the help section inside the app for faster response.</p>
            <Link to="/help" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              Visit Help Center
            </Link>
          </div>

          <div className="rounded-xl border border-border p-6 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Location</h3>
            <p className="text-sm text-muted-foreground">We're a remote-first company, building for professionals everywhere.</p>
            <p className="text-sm text-muted-foreground">India</p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Response Times</h2>
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">We typically respond within 24-48 hours</p>
                <p className="text-xs text-muted-foreground">Support emails are prioritized on business days (Mon-Fri, IST).</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Common Questions</h2>
          <div className="space-y-3">
            <div className="rounded-xl border border-border p-4 space-y-1">
              <p className="font-medium text-foreground text-sm">I'm a recruiter — how do I get started?</p>
              <p className="text-sm text-muted-foreground">Sign up as a recruiter, complete your company profile, and start posting jobs. Candidates can find you through search.</p>
            </div>
            <div className="rounded-xl border border-border p-4 space-y-1">
              <p className="font-medium text-foreground text-sm">I want to verify my account — how?</p>
              <p className="text-sm text-muted-foreground">Go to Settings &gt; Verification and choose between work email OTP or ID card verification.</p>
            </div>
            <div className="rounded-xl border border-border p-4 space-y-1">
              <p className="font-medium text-foreground text-sm">I found a bug or security issue</p>
              <p className="text-sm text-muted-foreground">Please email us directly at <a href="mailto:hello@directrefer.in" className="text-primary hover:underline">hello@directrefer.in</a> with details.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
