import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, FileText, FileUp, Github, Globe, Briefcase, Link2, Linkedin, Loader2,
  MessageSquare, PartyPopper, Save, Search, Send, ShieldCheck, Sparkles, User, UserX, Users, Handshake,
} from 'lucide-react'
import { toast } from 'sonner'
import { checkRateLimit, checkServerRateLimit } from '@/lib/rateLimit'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Chip, CompanyChip, EmptyState, GAvatar } from '@/components/ui-kit'
import { LinkedInShareButton } from '@/components/LinkedInShareButton'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import { type Professional, type RelationshipType, REFERRAL_RELATIONSHIPS, POLICY_ACKNOWLEDGMENT } from '@/data/mock'
import { uploadResume } from '@/lib/db'
import { cn } from '@/lib/utils'
import { ListSkeleton } from '@/components/ui/skeleton'

const STEPS = [
  { id: 1, label: 'Professional', icon: User },
  { id: 2, label: 'Relationship', icon: Users },
  { id: 3, label: 'Resume', icon: FileUp },
  { id: 4, label: 'Portfolio', icon: Link2 },
  { id: 5, label: 'Message', icon: MessageSquare },
  { id: 6, label: 'Review', icon: CheckCircle2 },
  { id: 7, label: 'Done', icon: PartyPopper },
]

// Max concurrent pending referral requests a candidate can hold.
// Slot is released when a request is accepted, declined or expired.
const MAX_ACTIVE_REQUESTS = 5

interface Draft {
  professionalId: string
  relationshipType: RelationshipType | ''
  relationshipNote: string
  policyAcknowledged: boolean
  resumeName: string
  resumeUrl: string
  portfolioUrl: string
  linkedinUrl: string
  githubUrl: string
  message: string
  role: string
}

const DEFAULT_MSG = (p?: Professional, s?: { name: string }) =>
  p ? `Hi ${p.name.split(' ')[0]}, I'm ${s?.name || 'a user'} — I'm very interested in the ${p.openPositions[0] ?? p.designation} role at ${p.company}. I'd be grateful for a referral and happy to share my resume and any additional information you need.` : ''

export default function RequestReferral() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addRequest, visibleProfessionals: professionals, student, requests } = useApp()
  const { user } = useAuth()
  const loading = usePageLoading(350)
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<Draft>({
    professionalId: id ?? '',
    relationshipType: '',
    relationshipNote: '',
    policyAcknowledged: false,
    resumeName: '', resumeUrl: '',
    portfolioUrl: student.links.website || '',
    linkedinUrl: student.links.linkedin || '',
    githubUrl: student.links.github || '',
    message: '', role: '',
  })
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [, setUploading] = useState(false)
  const [q, setQ] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Autosave (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      if (draft.professionalId || draft.message || draft.resumeName) {
        setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      }
    }, 900)
    return () => clearTimeout(t)
  }, [draft])

  const filtered = useMemo(
    () => professionals.filter((p) => p.openForReferrals && [p.name, p.company, p.designation].join(' ').toLowerCase().includes(q.toLowerCase())),
    [q, professionals],
  )

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const result = await uploadResume(user.id, file)
      if (result) {
        setDraft((d) => ({ ...d, resumeName: result.name, resumeUrl: result.url }))
      } else {
        toast.error('Failed to upload resume. Please try again.')
      }
    } catch {
      toast.error('Failed to upload resume. Please try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (loading) {
    return <ListSkeleton count={3} />
  }

  const pro = professionals.find((p) => p.id === draft.professionalId)

  if (id && !loading && !pro) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <EmptyState icon={UserX} title="Professional not found" description="This referral link may be outdated or the professional may have removed their profile." />
      </div>
    )
  }

  const canNext =
    step === 1 ? !!draft.professionalId
    : step === 2 ? !!draft.relationshipType && draft.policyAcknowledged
    : step === 3 ? !!draft.resumeName
    : step === 4 ? true
    : step === 5 ? draft.message.trim().length >= 40
    : true

  const next = () => {
    if (step === 5 && draft.message.trim().length < 40) {
      toast.error('Please write at least 40 characters — personal notes get 3× more accepts')
      return
    }
    if (step === 6) {
      submit()
      return
    }
    setStep((s) => Math.min(7, s + 1))
  }

  const submit = async () => {
    if (!checkRateLimit('referral-request', 5, 60_000)) {
      toast.error('Too many referral requests. Please wait a minute before trying again.')
      return
    }
    if (!await checkServerRateLimit('referral_request', 5, 60)) {
      toast.error('Rate limit exceeded. Please wait before sending more requests.')
      return
    }
    const activeCount = requests?.filter((r) => r.status === 'requested' || r.status === 'under_review').length ?? 0
    if (activeCount >= MAX_ACTIVE_REQUESTS) {
      toast.error(`You already have ${activeCount} pending referral requests. A slot frees up when one is accepted or declined.`)
      return
    }
    setSending(true)
    try {
      const snapshotParts: string[] = []
      if (student.noticePeriod) snapshotParts.push(`Notice: ${student.noticePeriod}`)
      if (student.workPreference) snapshotParts.push(`Work: ${student.workPreference}`)
      if (student.whyFit) snapshotParts.push(`Why fit: ${student.whyFit}`)
      const structuredNote = snapshotParts.length > 0
        ? `${draft.message}\n\n— Candidate snapshot —\n${snapshotParts.join('\n')}`
        : draft.message
      addRequest({
        id: `r${Date.now()}`,
        student: student.name,
        requesterId: user?.id,
        studentEmail: user?.email,
        professionalId: draft.professionalId,
        role: draft.role || pro?.openPositions[0] || 'Open role',
        status: 'requested',
        pipelineStage: 'requested',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        note: structuredNote,
        progress: 15,
        relationshipType: draft.relationshipType as RelationshipType || undefined,
        relationshipNote: draft.relationshipNote || undefined,
        policyAcknowledged: draft.policyAcknowledged,
      })
      setStep(6)
      toast.success(`Referral request sent to ${pro?.name ?? 'professional'} for ${draft.role || pro?.openPositions[0] || 'Open role'}`)
    } catch {
      toast.error('Failed to send referral request. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const pct = Math.round(((step - 1) / (STEPS.length - 1)) * 100)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => (step > 1 && step < 7 ? setStep(step - 1) : navigate(-1))}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> {step > 1 && step < 7 ? 'Previous step' : 'Back'}
        </Button>
        {savedAt && step < 7 && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Save className="h-3.5 w-3.5 text-emerald-500" /> Draft saved {savedAt}</span>
        )}
      </div>

      {/* Stepper */}
      <div>
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all',
                    step > s.id ? 'border-primary bg-primary text-primary-foreground'
                    : step === s.id ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {step > s.id ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                </div>
                <span className={cn('hidden text-[10px] font-medium sm:block', step >= s.id ? 'text-primary' : 'text-muted-foreground')}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn('mx-2 h-0.5 flex-1 rounded-full', step > s.id ? 'bg-primary' : 'bg-border')} />}
            </div>
          ))}
        </div>
        <Progress value={pct} className="mt-4 h-1.5" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          {/* STEP 1 — choose professional */}
          {step === 1 && (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-bold">Who would you like a referral from?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Pick a verified professional with open capacity.</p>
                <div className="relative mt-4">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search professionals…" className="h-11 rounded-xl pl-10" />
                </div>
                <div className="mt-4 max-h-[380px] space-y-2.5 overflow-y-auto pr-1">
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setDraft((d) => ({ ...d, professionalId: p.id, message: d.message || DEFAULT_MSG(p, student), role: d.role || p.openPositions[0] || '' }))}
                      className={cn(
                        'flex w-full items-center gap-3.5 rounded-xl border border-border p-3.5 text-left transition-all hover:border-primary/40',
                        draft.professionalId === p.id && 'border-primary bg-primary/5',
                      )}
                    >
                      <GAvatar name={p.name} gradient={p.gradient} className="h-11 w-11 text-xs" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-sm font-semibold">{p.name} {p.verified && <ShieldCheck className="h-3.5 w-3.5 text-sky-500" />}</div>
                        <div className="truncate text-xs text-muted-foreground">{p.designation} · {p.company}</div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div className="font-semibold text-emerald-500">{p.responseRate}% responds</div>
                        <div>{p.maxPerMonth - p.usedThisMonth} slots left</div>
                      </div>
                      {draft.professionalId === p.id && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2 — relationship type & policy */}
          {step === 2 && (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-bold">How do you know {pro?.name?.split(' ')[0]}?</h2>
                <p className="mt-1 text-sm text-muted-foreground">This helps the professional understand your connection and decide faster.</p>
                <div className="mt-4 space-y-2">
                  {REFERRAL_RELATIONSHIPS.map((rel) => (
                    <button
                      key={rel.value}
                      onClick={() => setDraft((d) => ({ ...d, relationshipType: rel.value }))}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border border-border p-3.5 text-left transition-all hover:border-primary/40',
                        draft.relationshipType === rel.value && 'border-primary bg-primary/5',
                      )}
                    >
                      <div className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors shrink-0',
                        draft.relationshipType === rel.value ? 'border-primary bg-primary' : 'border-border',
                      )}>
                        {draft.relationshipType === rel.value && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{rel.label}</div>
                        <div className="text-xs text-muted-foreground">{rel.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-1.5">
                  <Label htmlFor="rel-note">Additional context (optional)</Label>
                  <Textarea
                    id="rel-note"
                    value={draft.relationshipNote}
                    onChange={(e) => setDraft((d) => ({ ...d, relationshipNote: e.target.value }))}
                    rows={2}
                    className="resize-none"
                    placeholder="e.g. Worked together at Acme Corp on the payments team"
                  />
                </div>
                <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    <div>
                      <div className="text-sm font-semibold text-amber-700 dark:text-amber-400">Referral etiquette</div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{POLICY_ACKNOWLEDGMENT}</p>
                      <label className="mt-2.5 flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draft.policyAcknowledged}
                          onChange={(e) => setDraft((d) => ({ ...d, policyAcknowledged: e.target.checked }))}
                          className="mt-0.5 accent-amber-500"
                        />
                        <span className="text-xs font-medium text-foreground">I acknowledge and agree</span>
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3 — resume */}
          {step === 3 && (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-bold">Attach your resume</h2>
                <p className="mt-1 text-sm text-muted-foreground">PDF up to 10MB. We'll attach your resume automatically.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeUpload}
                />
                {!draft.resumeName ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12 transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><FileUp className="h-5 w-5" /></div>
                    <div className="mt-3 text-sm font-semibold">Click to upload or drag & drop</div>
                    <div className="mt-1 text-xs text-muted-foreground">PDF, DOC up to 10MB</div>
                  </button>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"><FileText className="h-5 w-5" /></div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{draft.resumeName}</div>
                        <div className="text-xs text-muted-foreground">Uploaded · 214 KB</div>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Replace file</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* STEP 4 — portfolio */}
          {step === 4 && (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-bold">Portfolio & links <span className="text-sm font-normal text-muted-foreground">(optional but recommended)</span></h2>
                <p className="mt-1 text-sm text-muted-foreground">Pre-filled from your profile. Edit if needed.</p>
                <div className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="li">LinkedIn profile</Label>
                    <Input id="li" value={draft.linkedinUrl} onChange={(e) => setDraft((d) => ({ ...d, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/in/yourname" className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gh">GitHub</Label>
                    <Input id="gh" value={draft.githubUrl} onChange={(e) => setDraft((d) => ({ ...d, githubUrl: e.target.value }))} placeholder="github.com/yourname" className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pf">Portfolio website</Label>
                    <Input id="pf" value={draft.portfolioUrl} onChange={(e) => setDraft((d) => ({ ...d, portfolioUrl: e.target.value }))} placeholder="https://yoursite.dev" className="h-11" />
                  </div>
                  {(draft.linkedinUrl || draft.githubUrl || draft.portfolioUrl) && (
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preview — what the professional will see</div>
                      <div className="flex flex-wrap gap-2">
                        {draft.linkedinUrl && (
                          <a href={draft.linkedinUrl.startsWith('http') ? draft.linkedinUrl : `https://linkedin.com/in/${draft.linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                            <Linkedin className="h-4 w-4 text-[#0A66C2]" /> LinkedIn
                          </a>
                        )}
                        {draft.githubUrl && (
                          <a href={draft.githubUrl.startsWith('http') ? draft.githubUrl : `https://github.com/${draft.githubUrl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                            <Github className="h-4 w-4" /> GitHub
                          </a>
                        )}
                        {draft.portfolioUrl && (
                          <a href={draft.portfolioUrl.startsWith('http') ? draft.portfolioUrl : `https://${draft.portfolioUrl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                            <Globe className="h-4 w-4 text-primary" /> Portfolio
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                    Profiles with a portfolio link get <b className="text-foreground">2.3× more accepts</b> from {pro?.company ?? 'top'} referrers.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 5 — message */}
          {step === 5 && (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-bold">Your referral message</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pro ? `${pro.name.split(' ')[0]}'s policy: "${pro.referralPolicy}"` : 'Be specific, be brief, be human.'}
                </p>
                <div className="mt-4 space-y-1.5">
                  <Label htmlFor="role">Target role</Label>
                  <Input id="role" value={draft.role} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))} className="h-11" placeholder="e.g. Software Engineer III" />
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="msg">Message</Label>
                    <span className={cn('text-xs', draft.message.length >= 40 ? 'text-emerald-500' : 'text-muted-foreground')}>{draft.message.length} / 40+ chars</span>
                  </div>
                  <Textarea
                    id="msg"
                    value={draft.message}
                    onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                    rows={7}
                    className="resize-none"
                    placeholder="Introduce yourself, name the exact role, and share one proof point…"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 6 — review */}
          {step === 6 && pro && (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-bold">Review & send</h2>
                <p className="mt-1 text-sm text-muted-foreground">Make sure everything looks right — this lands directly in {pro.name.split(' ')[0]}'s inbox.</p>
                <div className="mt-5 space-y-4">
                  <div className="flex items-center gap-3.5 rounded-xl border border-border p-4">
                    <GAvatar name={pro.name} gradient={pro.gradient} className="h-12 w-12 text-sm" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{pro.name}</div>
                      <div className="text-xs text-muted-foreground">{pro.designation} · {pro.company}</div>
                    </div>
                    <CompanyChip name={pro.company} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target role</div>
                        <button onClick={() => setStep(5)} className="text-[11px] font-medium text-primary hover:underline">Edit</button>
                      </div>
                      <div className="mt-1 text-sm font-medium">{draft.role || pro.openPositions[0] || 'Open role'}</div>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resume</div>
                        <button onClick={() => setStep(3)} className="text-[11px] font-medium text-primary hover:underline">Edit</button>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-sm font-medium"><FileText className="h-4 w-4 text-primary" /> {draft.resumeName}</div>
                    </div>
                  </div>
                  {draft.relationshipType && (
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Relationship</div>
                        <button onClick={() => setStep(2)} className="text-[11px] font-medium text-primary hover:underline">Edit</button>
                      </div>
                      <div className="mt-1 text-sm font-medium">{REFERRAL_RELATIONSHIPS.find((r) => r.value === draft.relationshipType)?.label}</div>
                      {draft.relationshipNote && <div className="mt-0.5 text-xs text-muted-foreground">{draft.relationshipNote}</div>}
                    </div>
                  )}
                  {(draft.linkedinUrl || draft.portfolioUrl || draft.githubUrl) && (
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Links</div>
                        <button onClick={() => setStep(4)} className="text-[11px] font-medium text-primary hover:underline">Edit</button>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {draft.linkedinUrl && <Chip tone="primary"><Linkedin className="mr-1 h-3 w-3 text-[#0A66C2]" /> {draft.linkedinUrl}</Chip>}
                        {draft.githubUrl && <Chip tone="primary"><Github className="mr-1 h-3 w-3" /> {draft.githubUrl}</Chip>}
                        {draft.portfolioUrl && <Chip tone="primary"><Globe className="mr-1 h-3 w-3 text-primary" /> {draft.portfolioUrl}</Chip>}
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</div>
                      <button onClick={() => setStep(5)} className="text-[11px] font-medium text-primary hover:underline">Edit</button>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">"{draft.message}"</p>
                  </div>
                  {(student.noticePeriod || student.workPreference || student.whyFit) && (
                    <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Candidate snapshot</div>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {student.noticePeriod && <Chip tone="primary"><Clock className="mr-1 h-3 w-3" /> {student.noticePeriod}</Chip>}
                        {student.workPreference && <Chip tone="primary"><Briefcase className="mr-1 h-3 w-3" /> {student.workPreference}</Chip>}
                        {student.whyFit && <Chip tone="primary"><Sparkles className="mr-1 h-3 w-3" /> Fit: {student.whyFit.length > 60 ? `${student.whyFit.slice(0, 60)}…` : student.whyFit}</Chip>}
                      </div>
                    </div>
                  )}
                  {!student.noticePeriod && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-sm text-amber-600 dark:text-amber-400">
                      <b>Tip:</b> Add your notice period to your profile — referrers are far more likely to accept when they know when you can start. <button onClick={() => navigate('/job-seeker/profile')} className="font-semibold underline">Add now</button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

           {/* STEP 7 — success */}
           {step === 7 && pro && (
             <Card className="overflow-hidden">
               <CardContent className="relative flex flex-col items-center px-6 py-14 text-center">
                 <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent" />
                 <motion.div
                   initial={{ scale: 0 }}
                   animate={{ scale: 1 }}
                   transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
                   className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white"
                 >
                   <Check className="h-10 w-10" strokeWidth={3} />
                 </motion.div>
                 <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative">
                   <h2 className="font-display mt-6 text-2xl font-bold">Referral request sent</h2>
                   <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                     {pro.name} typically replies within ~{pro.avgReplyHours} hours. We'll notify you the moment they respond, and you can track progress in My Referrals.
                   </p>
                   <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
                     <Button className="rounded-full bg-primary" asChild>
                       <Link to="/job-seeker/applications">Track my referrals <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                     </Button>
                     <Button variant="outline" className="rounded-full" asChild>
                       <Link to="/job-seeker/professionals">Request another</Link>
                     </Button>
                     <LinkedInShareButton role={draft.role || pro.openPositions[0] || 'this role'} company={pro.company} professionalName={pro.name} variant="outline" />
                   </div>
                 </motion.div>
               </CardContent>
             </Card>
           )}

           {/* Network effect: Become a Referrer CTA */}
           {step === 7 && (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
               <Card className="border-primary/20 bg-primary/[0.03]">
                 <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
                   <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                     <Users className="h-6 w-6 text-primary" />
                   </div>
                   <div className="flex-1">
                     <h3 className="text-sm font-semibold">Are you a professional at {pro?.company || 'a top company'}?</h3>
                     <p className="mt-1 text-xs text-muted-foreground">Help others get referred — build your professional reputation and help your community. Verified employees get priority visibility.</p>
                   </div>
                   <Button variant="outline" className="shrink-0 rounded-full" asChild>
                     <Link to="/login?role=professional">Become a Referrer</Link>
                   </Button>
                 </CardContent>
               </Card>
             </motion.div>
           )}
        </motion.div>
      </AnimatePresence>

      {/* Footer actions */}
      {step < 7 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Step {step} of {STEPS.length - 1}</div>
          {step < 6 ? (
            <Button onClick={next} disabled={!canNext} className="rounded-full bg-primary shadow-glow px-6">
              Continue <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={sending} className="rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-glow px-6">
              {sending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              {sending ? 'Sending…' : 'Send referral request'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
