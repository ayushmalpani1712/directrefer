import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowLeft, BookOpen, ChevronRight, LifeBuoy, Mail, Search, Send, Zap,
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

export default function Help() {
  const navigate = useNavigate()
  const [sent, setSent] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const filteredFaqs = searchQ.trim()
    ? FAQS.filter((f) => f.q.toLowerCase().includes(searchQ.toLowerCase()) || f.a.toLowerCase().includes(searchQ.toLowerCase()))
    : FAQS

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-12">
      <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <SectionHeader title="Help & Support" subtitle="Answers, guides, and a human when you need one" />

      {/* Email support — premium card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden border-0 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white shadow-glow">
          <CardContent className="flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <Mail className="h-7 w-7" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">Email support</h2>
                <p className="mt-1 text-sm text-white/70">support@directrefer.in · we reply within 12 hours</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 shrink-0"
              onClick={() => window.location.href = 'mailto:support@directrefer.in?subject=Support%20Request'}
            >
              Send email <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* FAQ */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold"><BookOpen className="h-4.5 w-4.5 text-primary" /> Frequently asked questions</h3>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search FAQs…" className="h-10 pl-9" />
        </div>
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
              <div className="mt-4 font-semibold">Ticket created</div>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Our team will reply within 12 hours. You'll also see updates in Notifications.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setSent(false)}>New ticket</Button>
            </motion.div>
          ) : (
            <form
              className="mt-4 grid gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                const body = `Category: ${category}\n\n${message}`
                setSent(true)
                toast.success('Opening email client...')
                window.location.href = `mailto:support@directrefer.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Subject</Label><Input required placeholder="e.g. Referral stuck in pending" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Category</Label><Input required placeholder="e.g. Referrals" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
              </div>
              <div className="space-y-1.5"><Label>Describe the issue</Label><Textarea required rows={4} placeholder="Tell us what happened and what you expected…" className="resize-none" value={message} onChange={(e) => setMessage(e.target.value)} /></div>
              <Button className="w-fit rounded-full bg-primary shadow-glow"><Send className="mr-1.5 h-4 w-4" /> Submit ticket</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
