import { useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CheckCheck, ChevronRight, FileText, Inbox, MessageSquare, Search, Share2, ShieldCheck, Users, XCircle, Send, FileCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Chip, EmptyState, GAvatar, SectionHeader, StatCard, StatusBadge } from '@/components/ui-kit'
import { ReportDialog } from '@/components/ui-kit'
import CandidateCard from '@/components/CandidateCard'
import { InboxIllustration } from '@/components/illustrations'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import type { ReferralStatus, PipelineStage } from '@/data/constants'
import { PIPELINE_STAGES, getMessagesPath, REFERRAL_RELATIONSHIPS, DECLINE_REASONS } from '@/data/constants'
import { usePageLoading } from '@/hooks/usePageLoading'
import { useMobile } from '@/hooks/use-mobile'
import { useNavigate } from 'react-router'
import { cn } from '@/lib/utils'
import { ListSkeleton } from '@/components/ui/skeleton'
import ResumePreview from '@/components/ResumePreview'
import { runCandidateScreening } from '@/lib/v2/api'
import { onReferralAccepted, onReferralRejected } from '@/lib/v2/behaviorScore'
import { autoAwardOnAcceptance } from '@/lib/incentives'

const TABS: { key: ReferralStatus | 'all'; label: string }[] = [
  { key: 'requested', label: 'New' },
  { key: 'under_review', label: 'Reviewing' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'referral_submitted', label: 'Submitted' },
  { key: 'declined', label: 'Declined' },
  { key: 'all', label: 'All' },
]

function InlinePipeline({ stage, requestId }: { stage: PipelineStage; requestId: string }) {
  const { advancePipelineStage } = useApp()
  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === stage)
  const isLast = currentIdx >= PIPELINE_STAGES.length - 1

  const handleAdvance = () => {
    if (!isLast) {
      advancePipelineStage(requestId)
      const nextStage = PIPELINE_STAGES[currentIdx + 1]
      toast.success(`Advanced to "${nextStage.label}" — candidate notified`)
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="flex items-center gap-1 flex-1">
        {PIPELINE_STAGES.slice(0, 4).map((s, j) => (
          <div key={s.key} className="flex items-center">
            <div className={cn(
              'flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold',
              j < currentIdx && 'bg-emerald-500 text-white',
              j === currentIdx && 'bg-primary text-primary-foreground',
              j > currentIdx && 'bg-muted text-muted-foreground/50',
            )}>
              {j + 1}
            </div>
            {j < 3 && (
              <div className={cn('mx-0.5 h-0.5 w-3', j < currentIdx ? 'bg-emerald-500' : 'bg-border')} />
            )}
          </div>
        ))}
        <span className="ml-2 text-[11px] font-medium text-muted-foreground">{PIPELINE_STAGES[currentIdx]?.label}</span>
      </div>
      {!isLast && (
        <Button size="sm" variant="outline" className="h-7 gap-1 rounded-full text-xs" onClick={handleAdvance}>
          Advance <ChevronRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

function ShareOnLinkedIn({ role, professionalName }: { student: string; role: string; professionalName: string }) {
  const shareText = encodeURIComponent(
    `Excited to share that I've been referred by ${professionalName} for the ${role} position! Grateful for the opportunity. #referral #hiring #jobsearch`
  )
  const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://www.directrefer.in')}&summary=${shareText}`

  return (
    <Button
      size="sm"
      variant="ghost"
      className="rounded-lg gap-1.5 text-xs text-[#0A66C2] hover:text-[#0A66C2]/80 hover:bg-[#0A66C2]/10"
      onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
    >
      <Share2 className="h-3.5 w-3.5" /> Share on LinkedIn
    </Button>
  )
}

const MOBILE_TABS: { key: ReferralStatus | 'all'; label: string }[] = [
  { key: 'requested', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'all', label: 'All' },
]

function MobilePipeline({ stage }: { stage: PipelineStage }) {
  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === stage)
  const stages = PIPELINE_STAGES.slice(0, 4)
  return (
    <div className="flex items-center gap-1.5">
      {stages.map((s, j) => (
        <div key={s.key} className="flex items-center">
          <div className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold',
            j < currentIdx && 'bg-emerald-500 text-white',
            j === currentIdx && 'bg-primary text-primary-foreground',
            j > currentIdx && 'bg-muted text-muted-foreground/50',
          )}>
            {j + 1}
          </div>
          {j < stages.length - 1 && (
            <div className={cn('mx-0.5 h-0.5 w-2', j < currentIdx ? 'bg-emerald-500' : 'bg-border')} />
          )}
        </div>
      ))}
      <span className="ml-1 text-[10px] font-medium text-muted-foreground truncate">{PIPELINE_STAGES[currentIdx]?.label}</span>
    </div>
  )
}

function MobileInboxCard({
  request,
  onAccept,
  onDecline,
  onSubmitReferral,
  onMessage,
  onResume,
  screeningLoading,
  screeningResult,
}: {
  request: { id: string; student: string; role: string; company?: string; date: string; status: ReferralStatus; pipelineStage: PipelineStage; note: string; requesterId?: string; studentResumeUrl?: string; relationshipType?: string; relationshipNote?: string; policyAcknowledged?: boolean; professionalId: string }
  onAccept: () => void
  onDecline: () => void
  onSubmitReferral: () => void
  onMessage: () => void
  onResume: () => void
  screeningLoading: boolean
  screeningResult?: { passed: boolean; summary: string }
}) {
  const r = request
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <GAvatar name={r.student} color="#5C5D66" className="h-10 w-10 text-xs shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold truncate">{r.student}</span>
              <StatusBadge status={r.status} />
            </div>
            <p className="text-xs text-muted-foreground truncate">{r.role}{r.company ? ` · ${r.company}` : ''}</p>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Role:</span> {r.role}
          </div>
          {r.company && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Company:</span> {r.company}
            </div>
          )}
        </div>

        {(r.status === 'accepted' || r.status === 'requested' || r.status === 'under_review' || r.status === 'referral_submitted') && (
          <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2">
            <p className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pipeline</p>
            <MobilePipeline stage={r.pipelineStage} />
          </div>
        )}

        {r.status === 'requested' && r.policyAcknowledged && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-500/5 px-2.5 py-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3 w-3 shrink-0" />
            Policy acknowledged
          </div>
        )}
        {r.status === 'requested' && !r.policyAcknowledged && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-500/5 px-2.5 py-1.5 text-[11px] text-amber-600 dark:text-amber-400">
            <ShieldCheck className="h-3 w-3 shrink-0" />
            Policy not yet acknowledged
          </div>
        )}
        {r.status === 'accepted' && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-violet-500/5 px-2.5 py-1.5 text-[11px] text-violet-600 dark:text-violet-400">
            <FileCheck className="h-3 w-3 shrink-0" />
            Ready to submit referral
          </div>
        )}
        {screeningResult && (
          <div className={`mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] ${
            screeningResult.passed
              ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/5 text-amber-600 dark:text-amber-400'
          }`}>
            <ShieldCheck className="h-3 w-3 shrink-0" />
            Screening: {screeningResult.passed ? 'Passed' : 'Review needed'}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.studentResumeUrl && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 rounded-full text-xs" onClick={onResume}>
              <FileText className="h-3 w-3" /> Resume
            </Button>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          {r.status === 'requested' || r.status === 'under_review' ? (
            <>
              <Button size="sm" className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700" disabled={screeningLoading} onClick={onAccept}>
                {screeningLoading ? 'Processing...' : <><CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Accept</>}
              </Button>
              <Button size="sm" variant="ghost" className="rounded-lg" onClick={onDecline}>
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Decline
              </Button>
            </>
          ) : r.status === 'accepted' ? (
            <>
              <Button size="sm" className="flex-1 rounded-lg bg-violet-600 hover:bg-violet-700" onClick={onSubmitReferral}>
                <FileCheck className="mr-1.5 h-3.5 w-3.5" /> Submit Referral
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg" disabled={!r.requesterId} onClick={onMessage}>
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" className="rounded-lg" disabled={!r.requesterId} onClick={onMessage}>
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Message
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function MobileEmptyState({ tab }: { tab: ReferralStatus | 'all' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Inbox className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {tab === 'all' ? 'No referral requests yet' : tab === 'accepted' ? 'No accepted requests' : 'No pending requests'}
      </h3>
      <p className="mt-1.5 text-xs text-muted-foreground max-w-[240px]">
        {tab === 'all'
          ? "When job seekers request referrals, they'll appear here."
          : tab === 'accepted'
            ? "Accepted referrals will appear here."
            : "When job seekers request referrals, they'll appear here."}
      </p>
    </div>
  )
}

export default function ReferralInbox() {
  const loading = usePageLoading(400)
  const isMobile = useMobile()
  const { requests, setRequestStatus, submitReferral, professionals, student, startConversation, role } = useApp()
  const { user } = useAuth()
  const [tab, setTab] = useState<ReferralStatus | 'all'>('requested')
  const [q, setQ] = useState('')
  const [viewingResume, setViewingResume] = useState<{ url: string; name: string } | null>(null)
  const [passDialog, setPassDialog] = useState<{ requestId: string; studentName: string } | null>(null)
  const [passReason, setPassReason] = useState('')
  const [screeningResults, setScreeningResults] = useState<Record<string, { passed: boolean; summary: string }>>({})
  const [screeningLoading, setScreeningLoading] = useState<string | null>(null)
  const navigate = useNavigate()

  const ME = professionals.find((p) => p.id === user?.id) ?? { id: user?.id ?? '', name: student.name || (user?.email?.split('@')[0] ?? 'User'), email: user?.email ?? '' }
  const inbox = ME ? requests.filter((r) => r.professionalId === ME.id) : []
  const filtered = useMemo(
    () => inbox.filter((r) => (tab === 'all' || r.status === tab) && [r.student, r.role, r.note].join(' ').toLowerCase().includes(q.toLowerCase())),
    [inbox, tab, q],
  )
  const counts = (s: ReferralStatus) => inbox.filter((r) => r.status === s).length

  const handleAcceptWithScreening = useCallback(async (requestId: string, studentName: string, requesterId?: string) => {
    setRequestStatus(requestId, 'accepted')
    toast.success(`Accepted ${studentName} — they'll be notified`)
    if (ME.id) {
      onReferralAccepted(ME.id).catch(() => {})
      autoAwardOnAcceptance(requestId, ME.id).catch(() => {})
    }
    // Run screening in background
    if (requesterId) {
      setScreeningLoading(requestId)
      try {
        const result = await runCandidateScreening(requesterId, requestId)
        setScreeningResults(prev => ({
          ...prev,
          [requestId]: { passed: result.all_passed, summary: result.summary }
        }))
      } catch {
        // Screening is optional — don't block UI
      } finally {
        setScreeningLoading(null)
      }
    }
  }, [setRequestStatus])

  if (loading) return <ListSkeleton count={5} />

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="px-1">
          <h1 className="text-lg font-bold">Referral Inbox</h1>
          <p className="text-xs text-muted-foreground">Review and manage referral requests</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="mx-1 h-9 w-[calc(100%-8px)]">
            {MOBILE_TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="flex-1 gap-1 text-xs">
                {t.label}
                <span className="rounded-full bg-muted px-1.5 text-[9px] font-semibold text-muted-foreground">
                  {t.key === 'all' ? inbox.length : counts(t.key)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative mx-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search requests…" className="pl-9 h-9 text-sm" />
        </div>

        {filtered.length === 0 ? (
          <MobileEmptyState tab={tab} />
        ) : (
          <div className="space-y-3 px-1">
            {filtered.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <MobileInboxCard
                  request={r}
                  screeningLoading={screeningLoading === r.id}
                  screeningResult={screeningResults[r.id]}
                  onAccept={() => handleAcceptWithScreening(r.id, r.student, r.requesterId)}
                  onDecline={() => setPassDialog({ requestId: r.id, studentName: r.student })}
                  onSubmitReferral={() => { submitReferral(r.id); toast.success(`Referral submitted for ${r.student}`) }}
                  onMessage={async () => { if (!r.requesterId) return; const convId = await startConversation(r.requesterId); if (convId) navigate(`${getMessagesPath(role)}?conversation=${convId}`) }}
                  onResume={() => r.studentResumeUrl && setViewingResume({ url: r.studentResumeUrl, name: `${r.student}_Resume.pdf` })}
                />
              </motion.div>
            ))}
          </div>
        )}

        {viewingResume && <ResumePreview url={viewingResume.url} fileName={viewingResume.name} open={!!viewingResume} onOpenChange={(open) => { if (!open) setViewingResume(null) }} />}

        <Dialog open={!!passDialog} onOpenChange={(open) => { if (!open) { setPassDialog(null); setPassReason('') } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Decline {passDialog?.studentName}</DialogTitle>
              <DialogDescription>Select a reason (optional) — this helps improve matching quality.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {DECLINE_REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 rounded-lg border border-border/50 p-2.5 cursor-pointer hover:bg-accent transition-colors">
                  <input type="radio" name="pass-reason" value={r.value} checked={passReason === r.value} onChange={() => setPassReason(r.value)} className="accent-primary" />
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setPassDialog(null); setPassReason('') }}>Cancel</Button>
              <Button variant="destructive" onClick={() => {
                if (passDialog) {
                  setRequestStatus(passDialog.requestId, 'declined', passReason || undefined)
                  toast.success(`Declined ${passDialog.studentName}${passReason ? ` — ${DECLINE_REASONS.find((r) => r.value === passReason)?.label || passReason}` : ''}`)
                  if (ME.id) {
                    onReferralRejected(ME.id).catch(() => {})
                  }
                  setPassDialog(null)
                  setPassReason('')
                }
              }}>Decline</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Referral requests" subtitle="Review, accept, and track candidates through the pipeline" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Inbox} label="New requests" value={counts('requested')} />
        <StatCard icon={CheckCheck} label="Accepted" value={counts('accepted')} />
        <StatCard icon={Send} label="Submitted" value={counts('referral_submitted')} />
        <StatCard icon={XCircle} label="Declined" value={counts('declined')} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="h-auto flex-wrap">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                {t.label}
                <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                  {t.key === 'all' ? inbox.length : counts(t.key)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search requests…" className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          illustration={<InboxIllustration />}
          title={tab === 'all' ? "No referral requests yet" : `No ${tab} requests`}
          description={tab === 'all'
            ? "When students send referral requests, they'll appear here. Make sure your profile is complete so candidates can find you."
            : `No ${tab} requests right now. Check back later.`}
          primaryCtaLabel="Complete your profile"
          primaryCtaHref="/professional/profile"
        />
      ) : (
        <div className="space-y-3.5">
          {filtered.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <GAvatar name={r.student} color="#5C5D66" className="h-12 w-12 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{r.student}</span>
                        <StatusBadge status={r.status} />
                        {r.relationshipType && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            <Users className="h-2.5 w-2.5" /> {REFERRAL_RELATIONSHIPS.find((rel) => rel.value === r.relationshipType)?.label}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{r.role} · {r.date}</div>
                      {r.relationshipNote && (
                        <div className="mt-1 text-xs text-muted-foreground italic">"{r.relationshipNote}"</div>
                      )}
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">"{r.note}"</p>
                      <CandidateCard request={r} />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.studentResumeUrl && <Chip>Resume attached</Chip>}
                        {r.note && <Chip>Note</Chip>}
                      </div>
                      {(r.status === 'accepted' || r.status === 'requested' || r.status === 'under_review' || r.status === 'referral_submitted') && (
                        <InlinePipeline stage={r.pipelineStage} requestId={r.id} />
                      )}
                      {r.status === 'requested' && r.policyAcknowledged && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-500/5 px-2.5 py-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-3 w-3 shrink-0" />
                          Candidate acknowledged referral etiquette
                        </div>
                      )}
                      {r.status === 'requested' && !r.policyAcknowledged && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-500/5 px-2.5 py-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                          <ShieldCheck className="h-3 w-3 shrink-0" />
                          Policy not yet acknowledged — remind candidate if needed
                        </div>
                      )}
                      {r.status === 'accepted' && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-violet-500/5 px-2.5 py-1.5 text-[11px] text-violet-600 dark:text-violet-400">
                          <FileCheck className="h-3 w-3 shrink-0" />
                          Accepted — ready to submit referral when you have the candidate's details
                        </div>
                      )}
                      {screeningResults[r.id] && (
                        <div className={`mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] ${
                          screeningResults[r.id].passed
                            ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/5 text-amber-600 dark:text-amber-400'
                        }`}>
                          <ShieldCheck className="h-3 w-3 shrink-0" />
                          Screening: {screeningResults[r.id].passed ? 'Passed' : 'Review needed'} — {screeningResults[r.id].summary}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {r.status === 'requested' || r.status === 'under_review' ? (
                        <>
                          <Button size="sm" className="rounded-lg bg-emerald-600 hover:bg-emerald-700" disabled={screeningLoading === r.id} onClick={() => handleAcceptWithScreening(r.id, r.student, r.requesterId)}>
                            {screeningLoading === r.id ? (
                              <>Processing...</>
                            ) : (
                              <><CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Accept</>
                            )}
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setPassDialog({ requestId: r.id, studentName: r.student })}>
                            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Decline
                          </Button>
                        </>
                      ) : r.status === 'accepted' ? (
                        <>
                          <Button size="sm" className="rounded-lg bg-violet-600 hover:bg-violet-700" onClick={() => { submitReferral(r.id); toast.success(`Referral submitted for ${r.student}`) }}>
                            <FileCheck className="mr-1.5 h-3.5 w-3.5" /> Submit Referral
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg" disabled={!r.requesterId} onClick={async () => { if (!r.requesterId) return; const convId = await startConversation(r.requesterId); if (convId) navigate(`${getMessagesPath(role)}?conversation=${convId}`) }}>
                            <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Message
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" className="rounded-lg" disabled={!r.requesterId} onClick={async () => { if (!r.requesterId) return; const convId = await startConversation(r.requesterId); if (convId) navigate(`${getMessagesPath(role)}?conversation=${convId}`) }}>
                          <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Message
                        </Button>
                      )}
                      {r.requesterId && <ReportDialog targetUserId={r.requesterId} targetUserName={r.student} />}
                      <Button size="sm" variant="ghost" className="rounded-lg" disabled={!r.studentResumeUrl} onClick={() => r.studentResumeUrl && setViewingResume({ url: r.studentResumeUrl, name: `${r.student}_Resume.pdf` })}>
                        <FileText className="mr-1.5 h-3.5 w-3.5" /> View resume
                      </Button>
                      {r.status === 'accepted' && (
                        <ShareOnLinkedIn student={r.student} role={r.role} professionalName={professionals.find((p) => p.id === r.professionalId)?.name || 'Professional'} />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {viewingResume && <ResumePreview url={viewingResume.url} fileName={viewingResume.name} open={!!viewingResume} onOpenChange={(open) => { if (!open) setViewingResume(null) }} />}

      <Dialog open={!!passDialog} onOpenChange={(open) => { if (!open) { setPassDialog(null); setPassReason('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline {passDialog?.studentName}</DialogTitle>
            <DialogDescription>Select a reason (optional) — this helps improve matching quality.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {DECLINE_REASONS.map((r) => (
              <label key={r.value} className="flex items-center gap-2 rounded-lg border border-border/50 p-2.5 cursor-pointer hover:bg-accent transition-colors">
                <input type="radio" name="pass-reason" value={r.value} checked={passReason === r.value} onChange={() => setPassReason(r.value)} className="accent-primary" />
                <span className="text-sm">{r.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setPassDialog(null); setPassReason('') }}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (passDialog) {
                setRequestStatus(passDialog.requestId, 'declined', passReason || undefined)
                toast.success(`Declined ${passDialog.studentName}${passReason ? ` — ${DECLINE_REASONS.find((r) => r.value === passReason)?.label || passReason}` : ''}`)
                if (ME.id) {
                  onReferralRejected(ME.id).catch(() => {})
                }
                setPassDialog(null)
                setPassReason('')
              }
            }}>Decline</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
