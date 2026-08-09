import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCheck, ChevronRight, FileText, Inbox, MessageSquare, Search, Share2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Chip, EmptyState, GAvatar, SectionHeader, StatCard, StatusBadge } from '@/components/ui-kit'
import { InboxIllustration } from '@/components/illustrations'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import type { ReferralStatus, PipelineStage } from '@/data/mock'
import { PIPELINE_STAGES, getMessagesPath } from '@/data/mock'
import { usePageLoading } from '@/hooks/usePageLoading'
import { useNavigate } from 'react-router'
import { cn } from '@/lib/utils'
import { ListSkeleton } from '@/components/ui/skeleton'
import ResumePreview from '@/components/ResumePreview'

const TABS: { key: ReferralStatus | 'all'; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Declined' },
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
      toast.success(`Advanced to "${nextStage.label}" — student notified`)
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="flex items-center gap-1 flex-1">
        {PIPELINE_STAGES.map((s, j) => (
          <div key={s.key} className="flex items-center">
            <div className={cn(
              'flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold',
              j < currentIdx && 'bg-emerald-500 text-white',
              j === currentIdx && 'bg-primary text-primary-foreground',
              j > currentIdx && 'bg-muted text-muted-foreground/50',
            )}>
              {j + 1}
            </div>
            {j < PIPELINE_STAGES.length - 1 && (
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

export default function ReferralInbox() {
  const loading = usePageLoading(400)
  const { requests, setRequestStatus, professionals, student, startConversation, role } = useApp()
  const { user } = useAuth()
  const [tab, setTab] = useState<ReferralStatus | 'all'>('pending')
  const [q, setQ] = useState('')
  const [viewingResume, setViewingResume] = useState<{ url: string; name: string } | null>(null)
  const navigate = useNavigate()

  const ME = professionals.find((p) => p.id === user?.id) ?? { id: user?.id ?? '', name: student.name || (user?.email?.split('@')[0] ?? 'User'), email: user?.email ?? '' }
  const inbox = ME ? requests.filter((r) => r.professionalId === ME.id) : []
  const filtered = useMemo(
    () => inbox.filter((r) => (tab === 'all' || r.status === tab) && [r.student, r.role, r.note].join(' ').toLowerCase().includes(q.toLowerCase())),
    [inbox, tab, q],
  )
  const counts = (s: ReferralStatus) => inbox.filter((r) => r.status === s).length

  if (loading) return <ListSkeleton count={5} />

  return (
    <div className="space-y-6">
      <SectionHeader title="Referral requests" subtitle="Review, accept, and track candidates through the pipeline" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Inbox} label="Pending review" value={counts('pending')} />
        <StatCard icon={CheckCheck} label="Accepted" value={counts('accepted')} />
        <StatCard icon={XCircle} label="Declined" value={counts('rejected')} />
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
              <Card className="shadow-soft">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <GAvatar name={r.student} gradient="from-slate-500 to-slate-700" className="h-12 w-12 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{r.student}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{r.role} · {r.date}</div>
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">"{r.note}"</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.studentResumeUrl && <Chip>Resume attached</Chip>}
                        {r.note && <Chip>Note</Chip>}
                      </div>
                      {(r.status === 'accepted' || r.status === 'pending') && (
                        <InlinePipeline stage={r.pipelineStage} requestId={r.id} />
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {r.status === 'pending' ? (
                        <>
                          <Button size="sm" className="rounded-lg bg-emerald-600 hover:bg-emerald-700" onClick={() => { setRequestStatus(r.id, 'accepted'); toast.success(`Accepted ${r.student} — they'll be notified`) }}>
                            <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Accept
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => { setRequestStatus(r.id, 'rejected'); toast.success('Declined with feedback sent') }}>
                            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Decline
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" className="rounded-lg" disabled={!r.requesterId} onClick={async () => { if (!r.requesterId) return; const convId = await startConversation(r.requesterId); if (convId) navigate(`${getMessagesPath(role)}?conversation=${convId}`) }}>
                          <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Message
                        </Button>
                      )}
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
    </div>
  )
}
