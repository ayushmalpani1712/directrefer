import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, ChevronRight, CircleHelp, LifeBuoy, Mail, MessageSquare, Search, Send, Video, Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SectionHeader } from '@/components/ui-kit'

const FAQS = [
  { q: 'How does a referral request work?', a: 'Pick a professional with open capacity, attach your resume and a short personal note, then send. The professional reviews your packet and can accept (they submit you internally), decline (with feedback), or message you first. You\'re notified at every step.' },
  { q: 'How are professionals verified?', a: 'Every professional verifies employment via corporate email, cross-checked against LinkedIn and company directories. Badges like "Top Referrer" are earned from real candidate outcomes.' },
  { q: 'Can I message a professional before requesting?', a: 'Yes — but a well-prepared referral request converts far better than a cold message. We recommend requesting first, then messaging to add context.' },
  { q: 'As a professional, how do I control request volume?', a: 'Set a monthly capacity in your profile, pause requests anytime, or turn on vacation mode. Your slots reset on the 1st of each month.' },
  { q: 'How do recruiters use Direct Refer?', a: 'Recruiters get a company workspace: post jobs, search referral-warmed talent, manage a pipeline kanban, and measure funnel conversion. Referral-sourced candidates are flagged so you can prioritize them.' },
]

const CHANNELS = [
  { icon: MessageSquare, title: 'Live chat', desc: 'Avg reply 3 min · 24/7', action: 'Start chat', cls: 'from-[#3B5FE5] to-[#8B8FD4]' },
  { icon: Mail, title: 'Email support', desc: 'support@directrefer.in · replies in < 12h', action: 'Send email', cls: 'from-sky-500 to-cyan-400' },
  { icon: Video, title: 'Book a demo', desc: '30 min walkthrough for teams & recruiters', action: 'Schedule', cls: 'from-[#5B6FE5] to-[#8B8FD4]' },
]

export default function Help() {
  const [sent, setSent] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const filteredFaqs = searchQ.trim()
    ? FAQS.filter((f) => f.q.toLowerCase().includes(searchQ.toLowerCase()) || f.a.toLowerCase().includes(searchQ.toLowerCase()))
    : FAQS

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <SectionHeader title="Help & Support" subtitle="Answers, guides, and a human when you need one" />

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden border-0 bg-gradient-to-r from-[#3B5FE5] to-[#8B8FD4] text-white shadow-glow">
          <CardContent className="p-8 text-center">
            <CircleHelp className="mx-auto h-8 w-8 text-white/80" />
            <h2 className="font-display mt-3 text-2xl font-bold">How can we help?</h2>
            <div className="relative mx-auto mt-5 max-w-lg">
              <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search help articles…" className="h-12 rounded-full border-0 bg-white pl-11 text-foreground" />
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
              {['verification', 'capacity', 'billing'].map((t) => (
                <button key={t} onClick={() => setSearchQ(t)} className="rounded-full bg-white/15 px-3 py-1 transition-colors hover:bg-white/25">{t}</button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Channels */}
      <div className="grid gap-4 sm:grid-cols-3">
        {CHANNELS.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="shadow-soft card-hover h-full">
              <CardContent className="p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary`}><c.icon className="h-5 w-5" /></div>
                <div className="mt-3 text-sm font-semibold">{c.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{c.desc}</div>
                <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs text-primary" onClick={() => toast.success(`${c.title} opened`)}>{c.action} <ChevronRight className="ml-0.5 h-3 w-3" /></Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* FAQ */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold"><BookOpen className="h-4.5 w-4.5 text-primary" /> Frequently asked questions</h3>
        <Card className="shadow-soft">
          <CardContent className="px-5 py-2">
            <Accordion type="single" collapsible>
              {filteredFaqs.map((f, i) => (
                <AccordionItem key={i} value={`f${i}`}>
                  <AccordionTrigger className="text-left text-sm font-medium">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* Contact form */}
      <Card className="shadow-soft">
        <CardContent className="p-6">
          <h3 className="flex items-center gap-2 text-base font-semibold"><LifeBuoy className="h-4.5 w-4.5 text-primary" /> Contact support</h3>
          {sent ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 flex flex-col items-center rounded-xl bg-emerald-500/5 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500"><Zap className="h-6 w-6" /></div>
              <div className="mt-4 font-semibold">Ticket #48213 created</div>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Our team will reply to alex.morgan@berkeley.edu within 12 hours. You'll also see updates in Notifications.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setSent(false)}>New ticket</Button>
            </motion.div>
          ) : (
            <form
              className="mt-4 grid gap-4"
              onSubmit={(e) => { e.preventDefault(); setSent(true); toast.success('Support ticket submitted') }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Subject</Label><Input required placeholder="e.g. Referral stuck in pending" /></div>
                <div className="space-y-1.5"><Label>Category</Label><Input required placeholder="e.g. Referrals" /></div>
              </div>
              <div className="space-y-1.5"><Label>Describe the issue</Label><Textarea required rows={4} placeholder="Tell us what happened and what you expected…" className="resize-none" /></div>
              <Button className="w-fit rounded-full bg-primary shadow-glow"><Send className="mr-1.5 h-4 w-4" /> Submit ticket</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
