import { ArrowLeft, Mail, Linkedin, Target, Users, Shield, Zap } from 'lucide-react'
import { Link } from 'react-router'

export default function About() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        {/* Hero */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">About Direct Refer</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            We believe getting referred should be as easy as sending a message. Direct Refer connects job seekers with verified professionals who can refer them at top companies — making the hiring process fairer, faster, and more transparent.
          </p>
        </div>

        {/* Mission */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Our Mission</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            The best jobs are often filled through referrals, but most candidates don't have the network to get one. We're building the bridge between talent and opportunity — so your skills matter more than who you know.
          </p>
        </section>

        {/* Values */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What We Stand For</h2>
          <div className="grid gap-4 sm:grid-cols-2 items-stretch">
            <div className="rounded-xl border border-border p-4 space-y-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-foreground">Trust & Verification</h3>
              <p className="text-sm text-muted-foreground">Every professional is verified through work email or ID confirmation. No fake profiles, no guesswork.</p>
            </div>
            <div className="rounded-xl border border-border p-4 space-y-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-foreground">Fair Access</h3>
              <p className="text-sm text-muted-foreground">We believe everyone deserves a fair shot at great opportunities, regardless of their existing network.</p>
            </div>
            <div className="rounded-xl border border-border p-4 space-y-2">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-foreground">Speed & Transparency</h3>
              <p className="text-sm text-muted-foreground">Track your referral pipeline in real-time. No more wondering what happened to your application.</p>
            </div>
            <div className="rounded-xl border border-border p-4 space-y-2">
              <Mail className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-foreground">Privacy First</h3>
              <p className="text-sm text-muted-foreground">Contact details are only shared when both parties agree. You control who reaches you and how.</p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How It Works</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">1</span>
              <div>
                <p className="font-medium text-foreground">Create your profile</p>
                <p className="text-sm text-muted-foreground">Sign up as a job seeker or professional. Build your profile with skills, experience, and preferences.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">2</span>
              <div>
                <p className="font-medium text-foreground">Find or get found</p>
                <p className="text-sm text-muted-foreground">Job seekers browse verified professionals at target companies. Professionals can also discover open-to-work candidates.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">3</span>
              <div>
                <p className="font-medium text-foreground">Request & manage referrals</p>
                <p className="text-sm text-muted-foreground">Send referral requests, track pipeline stages, message directly, and get hired — all in one place.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Founder */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Built by</h2>
          <div className="flex items-center gap-4 rounded-xl border border-border p-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-lg font-bold text-primary">AM</div>
            <div>
              <p className="font-semibold text-foreground">Ayush Malpani</p>
              <p className="text-sm text-muted-foreground">Founder & Developer</p>
              <a href="https://linkedin.com/in/direct-refer" target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </a>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="rounded-xl border border-border bg-muted/30 p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold">Get in Touch</h2>
          <p className="text-sm text-muted-foreground">Have questions, feedback, or want to partner with us?</p>
          <a href="mailto:hello@directrefer.in" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Mail className="h-4 w-4" /> hello@directrefer.in
          </a>
        </section>
      </div>
    </div>
  )
}
