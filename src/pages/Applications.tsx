import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, Calendar, Building2, FileText, XCircle, Search, Clock, Star, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataCard } from '@/components/ui/card-primitives'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui-kit'
import { useAuth } from '@/context/AuthContext'
import { useMobile } from '@/hooks/use-mobile'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router'
import type { ApplicationStatus, Application } from '@/lib/v2/applications'

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'screening', label: 'Screening' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview' },
  { key: 'offered', label: 'Offered' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'withdrawn', label: 'Withdrawn' },
]

const MOBILE_STATUS_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'screening', label: 'Screening' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview' },
  { key: 'offered', label: 'Offered' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'referred', label: 'Referred' },
]

const STATUS_STYLES: Record<ApplicationStatus, { label: string; cls: string; dot: string }> = {
  submitted: { label: 'Submitted', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25', dot: 'bg-blue-500' },
  screening: { label: 'Screening', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25', dot: 'bg-amber-500' },
  shortlisted: { label: 'Shortlisted', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-500' },
  interview: { label: 'Interview', cls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25', dot: 'bg-violet-500' },
  offered: { label: 'Offered', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-500' },
  accepted: { label: 'Accepted', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25', dot: 'bg-rose-500' },
  withdrawn: { label: 'Withdrawn', cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25', dot: 'bg-slate-500' },
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function AppStatusBadge({ status }: { status: ApplicationStatus }) {
  const s = STATUS_STYLES[status]
  if (!s) return <Badge variant="outline">{status}</Badge>
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', s.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </Badge>
  )
}

interface JobInfo {
  title?: string
  company?: string
  location?: string
}

export default function Applications() {
  const { user } = useAuth()
  const isMobile = useMobile()
  const navigate = useNavigate()
  const [applications, setApplications] = useState<(Application & { jobs?: JobInfo })[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function loadApplications() {
      try {
        const { getCandidateApplications } = await import('@/lib/v2/applications')
        const apps = await getCandidateApplications(user!.id)
        if (!cancelled) setApplications(apps as (Application & { jobs?: JobInfo })[])
      } catch (err) {
        console.error('Failed to load applications:', err)
        toast.error('Failed to load applications')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadApplications()
    return () => { cancelled = true }
  }, [user?.id])

  const stats = useMemo(() => {
    const total = applications.length
    const submitted = applications.filter((a) => a.status === 'submitted').length
    const screening = applications.filter((a) => a.status === 'screening').length
    const shortlisted = applications.filter((a) => a.status === 'shortlisted').length
    return { total, submitted, screening, shortlisted }
  }, [applications])

  const filtered = useMemo(() => {
    let list = applications
    if (activeTab !== 'all') {
      list = list.filter((a) => a.status === activeTab)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((a) => {
        const job = a.jobs
        return (
          job?.title?.toLowerCase().includes(q) ||
          job?.company?.toLowerCase().includes(q) ||
          false
        )
      })
    }
    return list
  }, [applications, activeTab, searchQuery])

  const handleWithdraw = async (appId: string) => {
    if (!user) return
    try {
      const { withdrawApplication } = await import('@/lib/v2/applications')
      await withdrawApplication(appId, user.id)
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: 'withdrawn' as ApplicationStatus } : a))
      )
      toast.success('Application withdrawn')
    } catch (err) {
      console.error('Failed to withdraw application:', err)
      toast.error('Failed to withdraw application')
    }
  }

  if (loading) {
    return (
      <div className={cn('space-y-6', isMobile ? 'px-4 py-4' : 'p-6')}>
        <div className={cn('animate-pulse rounded-lg bg-muted/50', isMobile ? 'h-8 w-40' : 'h-8 w-48')} />
        <div className={cn('grid gap-4', isMobile ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4')}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={cn('animate-pulse rounded-xl bg-muted/50', isMobile ? 'h-20' : 'h-24')} />
          ))}
        </div>
        {isMobile && (
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-muted/50" />
            ))}
          </div>
        )}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn('animate-pulse rounded-xl bg-muted/50', isMobile ? 'h-24' : 'h-28')} />
          ))}
        </div>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="space-y-4 px-4 py-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">My Applications</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Track your job applications and their status</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by company or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MOBILE_STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-white">
              {activeTab === 'all' ? 'No applications yet' : `No ${MOBILE_STATUS_TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} applications`}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeTab === 'all' ? 'Start applying to jobs to track them here' : 'Try a different filter'}
            </p>
            {activeTab === 'all' && (
              <Button
                size="sm"
                className="mt-5 rounded-xl bg-indigo-500 px-5 text-xs font-medium text-white hover:bg-indigo-600"
                onClick={() => navigate('/job-seeker/browse-jobs')}
              >
                Browse Jobs
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((app, idx) => {
              const job = app.jobs
              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: idx * 0.03 }}
                >
                  <Card
                    className="cursor-pointer transition-all active:scale-[0.98]"
                    onClick={() => navigate(`/job-seeker/job/${(app as any).job_id ?? ''}`)}
                  >
                    <CardContent className="flex items-center gap-3 p-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Briefcase className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold text-white truncate">
                          {job?.title || 'Untitled Position'}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{job?.company || 'Unknown Company'}</span>
                          {job?.location && (
                            <>
                              <span className="text-slate-600">·</span>
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{job.location}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <AppStatusBadge status={app.status} />
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(app.submitted_at)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {(app.status === 'submitted' || app.status === 'screening') && (
                    <div className="mt-1.5 flex justify-end px-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleWithdraw(app.id) }}
                        className="h-7 rounded-lg px-2 text-[11px] text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Withdraw
                      </Button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track your job applications and their status</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DataCard title="Total Applications" value={stats.total} icon={<Briefcase className="h-5 w-5" />} />
        <DataCard title="Submitted" value={stats.submitted} icon={<FileText className="h-5 w-5" />} />
        <DataCard title="Under Review" value={stats.screening} icon={<Clock className="h-5 w-5" />} />
        <DataCard title="Shortlisted" value={stats.shortlisted} icon={<Star className="h-5 w-5" />} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="whitespace-nowrap shrink-0 px-2.5 py-2 text-[11px] sm:px-4 sm:py-2.5 sm:text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by company or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:w-64"
            />
          </div>
        </div>

        <TabsContent value={activeTab}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={activeTab === 'all' ? 'No applications yet' : `No ${STATUS_TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} applications`}
              description={activeTab === 'all' ? 'Start applying to jobs to track your applications here.' : 'Try a different filter.'}
              primaryCtaLabel={activeTab === 'all' ? 'Browse Jobs' : undefined}
              primaryCtaHref="/job-seeker/browse-jobs"
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((app, idx) => {
                const job = app.jobs
                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                  >
                    <Card className="transition-all duration-200 hover:border-border/80">
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Briefcase className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">
                              {job?.title || 'Untitled Position'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {job?.company || 'Unknown Company'}
                              </span>
                              {job?.location && (
                                <>
                                  <span className="text-slate-600">·</span>
                                  <span>{job.location}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(app.submitted_at)}
                          </div>
                          <AppStatusBadge status={app.status} />
                          {(app.status === 'submitted' || app.status === 'screening') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleWithdraw(app.id)}
                              className="h-8 rounded-lg border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              Withdraw
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
