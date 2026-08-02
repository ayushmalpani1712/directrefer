import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Download, FileText, MessageSquare, Send, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CompanyChip, EmptyState, GAvatar, SectionHeader, StatCard, StatusBadge } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { type ReferralStatus, PIPELINE_STAGES, type PipelineStage } from '@/data/mock'
import { usePageLoading } from '@/hooks/usePageLoading'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { exportReferralsCSV } from '@/lib/export'
import { toast } from 'sonner'

const STAGES: { key: ReferralStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Declined' },
]

const STAGE_ICONS: Record<PipelineStage, typeof Send> = {
  request_sent: Send,
  under_review: Clock,
  accepted: CheckCircle2,
  submitted: FileText,
}

const STAGE_COLORS: Record<PipelineStage, string> = {
  request_sent: 'text-blue-500',
  under_review: 'text-amber-500',
  accepted: 'text-emerald-500',
  submitted: 'text-[#8B8FD4]',
}

function PipelineTracker({ stage, status }: { stage: PipelineStage; status: ReferralStatus }) {
  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === stage)
  const isRejected = status === 'rejected'

  return (
    <div className="mt-5">
      {isRejected ? (
        <div className="flex items-center gap-2.5 rounded-xl bg-rose-500/5 p-3.5 text-sm text-rose-600 dark:text-rose-400">
          <XCircle className="h-4.5 w-4.5 shrink-0" />
          Request declined — you can try a different referrer or re-apply later.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Referral Progress</span>
            <span className="text-xs font-medium text-primary">{currentIdx + 1} of {PIPELINE_STAGES.length}</span>
          </div>
          <div className="relative flex items-start">
            {PIPELINE_STAGES.map((s, j) => {
              const Icon = STAGE_ICONS[s.key]
              const isComplete = j < currentIdx
              const isCurrent = j === currentIdx
              const isFuture = j > currentIdx
              return (
                <div key={s.key} className="flex flex-1 items-start last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <motion.div
                      className={cn(
                        'relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                        isComplete && 'border-emerald-500 bg-emerald-500 text-white',
                        isCurrent && 'border-primary bg-primary/10 text-primary',
                        isFuture && 'border-border bg-background text-muted-foreground/40',
                      )}
                      animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                      transition={isCurrent ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Icon className={cn('h-4 w-4', isCurrent && STAGE_COLORS[s.key])} />
                      )}
                      {isCurrent && (
                        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary animate-pulse" />
                      )}
                    </motion.div>
                    <span className={cn(
                      'text-center text-[10px] font-medium leading-tight max-w-[60px]',
                      isComplete && 'text-emerald-600 dark:text-emerald-400',
                      isCurrent && 'text-primary font-semibold',
                      isFuture && 'text-muted-foreground/50',
                    )}>
                      {s.label}
                    </span>
                  </div>
                  {j < PIPELINE_STAGES.length - 1 && (
                    <div className="mx-1.5 mt-4 h-0.5 flex-1 rounded-full overflow-hidden bg-border">
                      <motion.div
                        className={cn('h-full rounded-full', isComplete ? 'bg-emerald-500' : isCurrent ? 'bg-primary/40' : 'bg-transparent')}
                        initial={{ width: '0%' }}
                        animate={{ width: isComplete ? '100%' : isCurrent ? '50%' : '0%' }}
                        transition={{ duration: 0.6, delay: j * 0.1 }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function MyReferrals() {
  const loading = usePageLoading(400)
  const { requests, professionals, student } = useApp()
  const [tab, setTab] = useState<'all' | ReferralStatus>('all')
  const mine = requests.filter((r) => r.student === student.name)
  const filtered = useMemo(() => (tab === 'all' ? mine : mine.filter((r) => r.status === tab)), [mine, tab])

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader title="My Referrals" subtitle="Track every referral from request to interview" />
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => { exportReferralsCSV(mine); toast.success('Referrals exported as CSV') }}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
          <Button className="rounded-full bg-primary shadow-glow" asChild>
            <Link to="/professionals"><Send className="mr-1.5 h-4 w-4" /> New request</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Send} label="Total sent" value={mine.length} />
        <StatCard icon={CheckCircle2} label="Accepted" value={mine.filter((r) => r.status === 'accepted' || r.status === 'offered').length} />
        <StatCard icon={Clock} label="Awaiting reply" value={mine.filter((r) => r.status === 'pending').length} />
        <StatCard icon={XCircle} label="Declined" value={mine.filter((r) => r.status === 'rejected').length} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="h-auto flex-wrap">
          {STAGES.map((s) => (
            <TabsTrigger key={s.key} value={s.key} className="gap-1.5">
              {s.label}
              <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                {s.key === 'all' ? mine.length : mine.filter((r) => r.status === s.key).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No referrals yet"
          description={tab === 'all' ? 'Request your first referral to get started.' : `No ${tab} requests right now.`}
          action={<Button asChild><Link to="/professionals">Request your first referral</Link></Button>}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((r, i) => {
            const p = professionals.find((x) => x.id === r.professionalId)
            if (!p) return null
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="shadow-soft card-hover transition-colors hover:border-primary/20">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <Link to={`/professionals/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3.5 group">
                        <GAvatar name={p.name} gradient={p.gradient} className="h-12 w-12 text-sm" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold group-hover:text-primary transition-colors">{r.role}</div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <CompanyChip name={p.company} className="h-4.5 w-4.5 text-[8px]" />
                            {p.company} · via {p.name} · {r.date}
                          </div>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        <Button variant="outline" size="sm" className="rounded-full" asChild><Link to="/messages"><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Message</Link></Button>
                      </div>
                    </div>

                    <PipelineTracker stage={r.pipelineStage} status={r.status} />
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
