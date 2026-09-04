import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  Briefcase, ChevronRight, Clock, MapPin, Pause, Play, Plus, Search, Star, Trash2, Pencil, Users, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Chip, CompanyChip, EmptyState, GAvatar, SectionHeader } from '@/components/ui-kit'
import { JobIllustration } from '@/components/illustrations'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ListSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { profileUrl } from '@/data/mock'

const STAGE_COLORS: Record<string, string> = {
  Applied: 'border-t-slate-400',
  Screened: 'border-t-sky-500',
  Review: 'border-t-[#6366F1]',
  Offer: 'border-t-emerald-500',
}

const STAGES = ['Applied', 'Screened', 'Review', 'Offer'] as const

function nextStage(stage: string): string | null {
  const idx = STAGES.indexOf(stage as typeof STAGES[number])
  if (idx < 0 || idx >= STAGES.length - 1) return null
  return STAGES[idx + 1]
}

export function BrowseJobsView() {
  const { jobs, loading } = useApp()
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [recruiterNames, setRecruiterNames] = useState<Record<string, string>>({})
  const loadedRef = useRef(false)

  useEffect(() => {
    const loadRecruiters = async () => {
      if (loadedRef.current) return
      loadedRef.current = true
      try {
        const { data } = await supabase
          .from('profiles_recruiter')
          .select('user_id, company_name')
        if (data) {
          const map: Record<string, string> = {}
          data.forEach((r: { user_id: string; company_name: string }) => { map[r.user_id] = r.company_name })
          setRecruiterNames(map)
        }
      } catch (err) {
        console.error('Failed to load recruiter names:', err)
        toast.error('Failed to load company data')
      }
    }
    loadRecruiters()
  }, [])

  const filtered = jobs
    .filter((j) => j.stage === 'Active')
    .filter((j) => j.title.toLowerCase().includes(q.toLowerCase()) || j.location.toLowerCase().includes(q.toLowerCase()))
    .filter((j) => typeFilter === 'all' || j.type.toLowerCase() === typeFilter)

  if (loading) return <ListSkeleton count={4} />

  return (
    <div className="space-y-6">
      <SectionHeader title="Browse Jobs" subtitle="Discover open positions and request referrals from professionals" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs by title or location..." className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'full-time', 'part-time', 'contract'].map((t) => (
            <Button key={t} size="sm" variant={typeFilter === t ? 'default' : 'outline'} className="rounded-full text-xs capitalize" onClick={() => setTypeFilter(t)}>
              {t === 'all' ? 'All' : t}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          illustration={<JobIllustration />}
          title={q || typeFilter !== 'all' ? "No jobs match your search" : "No active jobs yet"}
          description={q || typeFilter !== 'all'
            ? "Try adjusting your search terms or clearing the filters to see more results."
            : "There are no active job postings right now. Check back later or browse professionals to build your pipeline."}
          primaryCtaLabel={q || typeFilter !== 'all' ? "Clear filters" : undefined}
          onPrimaryCtaClick={q || typeFilter !== 'all' ? () => { setQ(''); setTypeFilter('all') } : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((j, i) => (
            <motion.div key={j.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="shadow-soft h-full transition-colors hover:border-primary/20">
                <CardContent className="flex flex-col p-5">
                  <div className="flex items-start gap-3">
                    {j.recruiterId ? (
                      <Link to={profileUrl('recruiter', j.recruiterId ?? '', j.recruiterSlug)}>
                        <CompanyChip name={recruiterNames[j.recruiterId ?? ''] ?? 'Co'} className="h-10 w-10 rounded-xl text-xs hover:ring-2 hover:ring-primary/30 transition-all" />
                      </Link>
                    ) : (
                      <CompanyChip name={recruiterNames[j.recruiterId ?? ''] ?? 'Co'} className="h-10 w-10 rounded-xl text-xs" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{j.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {j.location}</span>
                        <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {j.type}</span>
                        {j.salary && <span>{j.salary}</span>}
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {j.postedDaysAgo}d ago</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/25 bg-emerald-500/10 text-emerald-500 text-[10px]">Active</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {j.applicants} applicants</span>
                    <span className="flex items-center gap-1 text-primary"><Star className="h-3.5 w-3.5" /> {j.referrals} referrals</span>
                  </div>
                  <div className="mt-auto flex gap-2 pt-4">
                    <Link to="/job-seeker/request-referral" className="flex-1">
                      <Button size="sm" className="w-full rounded-full bg-primary shadow-glow text-xs">Request Referral</Button>
                    </Link>
                    <Link to="/job-seeker/professionals" className="flex-1">
                      <Button size="sm" variant="outline" className="w-full rounded-full text-xs">Find Referrer</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RecruiterJobs() {
  const { role } = useApp()

  if (role === 'student' || role === 'professional') {
    return <BrowseJobsView />
  }

  return <RecruiterJobsManager />
}

function RecruiterJobsManager() {
  const { jobs, setJobs, candidates, updateJob, professionals, loading } = useApp()
  const { user } = useAuth()
  const [recruiterCompany, setRecruiterCompany] = useState({ name: '', tagline: '', industry: '', size: '', website: '', founded: 0, locations: [] as string[], description: '', benefits: [] as string[], hiringStats: { timeToHire: 0, offerAccept: 0, referralShare: 0, activeJobs: jobs.filter((j) => j.stage === 'Active').length }, responseRate: 0, verified: false })
  const profileLoadedRef = useRef(false)

  useEffect(() => {
    const loadCompany = async () => {
      if (!user) return
      if (profileLoadedRef.current) return
      profileLoadedRef.current = true
      try {
        const { data } = await supabase
          .from('profiles_recruiter')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (data) {
          setRecruiterCompany((prev) => ({
            ...prev,
            name: data.company_name ?? data.company ?? prev.name,
            tagline: data.company_tagline ?? prev.tagline,
            industry: data.industry ?? data.hiring_department ?? prev.industry,
            size: data.company_size ?? prev.size,
            website: data.company_website ?? prev.website,
            founded: data.founded ?? prev.founded,
            locations: data.locations ?? prev.locations,
            benefits: data.benefits ?? prev.benefits,
            hiringStats: {
              timeToHire: data.time_to_hire ?? 0,
              offerAccept: data.offer_accept_rate ?? 0,
              referralShare: data.referral_share ?? 0,
              activeJobs: jobs.filter((j) => j.stage === 'Active').length,
            },
          }))
        }
      } catch (err) {
        console.error('Failed to load company profile:', err)
        toast.error('Could not load company profile')
      }
    }
    loadCompany()
  }, [user])
  const [q, setQ] = useState('')
  const [candidateStages, setCandidateStages] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    candidates.forEach((c) => { map[c.id] = c.stage })
    return map
  })

  useEffect(() => {
    setCandidateStages((prev) => {
      const next = { ...prev }
      candidates.forEach((c) => { if (!(c.id in next)) next[c.id] = c.stage })
      return next
    })
  }, [candidates])

  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSalary, setEditSalary] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [pauseTargetId, setPauseTargetId] = useState<string | null>(null)
  const [addingToStage, setAddingToStage] = useState<string | null>(null)
  const [addCandidateQuery, setAddCandidateQuery] = useState('')
  const [extraCandidates, setExtraCandidates] = useState<typeof candidates>([])
  const [mobileStage, setMobileStage] = useState<string>(STAGES[0])

  const allCandidates = [...candidates, ...extraCandidates]

  const advanceCandidate = (candidateId: string) => {
    const currentStage = candidateStages[candidateId] || 'Applied'
    const next = nextStage(currentStage)
    if (!next) {
      toast(`${allCandidates.find((c) => c.id === candidateId)?.name} is already at Offer stage`)
      return
    }
    setCandidateStages((prev) => ({ ...prev, [candidateId]: next }))
    toast(`${allCandidates.find((c) => c.id === candidateId)?.name} moved to ${next}`)
  }

  const addCandidateToStage = (pro: typeof professionals[number], stage: string) => {
    const id = pro.id
    if (candidateStages[id]) {
      toast(`${pro.name} is already in the pipeline (${candidateStages[id]})`)
      return
    }
    setCandidateStages((prev) => ({ ...prev, [id]: stage }))
    setExtraCandidates((prev) => [...prev, {
      id: pro.id,
      name: pro.name,
      role: pro.designation || 'Professional',
      company: pro.company || '',
      stage,
      rating: 0,
      source: 'Manual',
      gradient: pro.gradient || 'from-[#6366F1] to-[#8B5CF6]',
      skills: pro.skills || [],
      location: pro.location || '',
      exp: pro.yearsExp || 0,
      profileRole: 'professional',
    }])
    setAddingToStage(null)
    setAddCandidateQuery('')
    toast(`${pro.name} added to ${stage}`)
  }

  const startEdit = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId)
    if (!job) return
    setEditingJobId(jobId)
    setEditTitle(job.title)
    setEditSalary(job.salary)
    setEditLocation(job.location)
  }

  const saveEdit = () => {
    if (!editingJobId) return
    updateJob(editingJobId, { title: editTitle, salary: editSalary, location: editLocation })
    toast.success('Job updated')
    setEditingJobId(null)
  }

  const cancelEdit = () => {
    setEditingJobId(null)
  }

  const handleDelete = () => {
    if (!deleteTargetId) return
    updateJob(deleteTargetId, { stage: 'Closed' })
    toast.success('Job deleted')
    setDeleteTargetId(null)
  }

  const handlePauseResume = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId)
    if (!job) return
    const newStage = job.stage === 'Active' ? 'Paused' : 'Active'
    updateJob(jobId, { stage: newStage })
    toast.success(`Job ${newStage === 'Paused' ? 'paused' : 'resumed'}`)
  }

  const handlePostJob = async () => {
    try {
      const { data, error } = await supabase.from('jobs').insert({
        recruiter_id: user?.id,
        title: 'New Job Posting',
        department: 'Engineering',
        location: 'Remote',
        type: 'Full-time',
        stage: 'draft',
      }).select('*').single()
      if (error) throw error
      if (data) {
        const newJob = {
          id: data.id,
          title: data.title,
          department: data.department ?? '',
          location: data.location ?? '',
          type: data.type ?? 'Full-time',
          salary: data.salary_range ?? '',
          applicants: data.applicants ?? 0,
          referrals: data.referrals ?? 0,
          stage: (data.stage === 'active' ? 'Active' : data.stage === 'paused' ? 'Paused' : 'Draft') as 'Active' | 'Paused' | 'Draft',
          postedDaysAgo: 0,
          pipeline: [],
          recruiterId: data.recruiter_id,
        }
        setJobs((prev) => [newJob, ...prev])
        toast.success('Job draft created! Edit it to add details.')
      }
    } catch (err) {
      console.error('Failed to create job:', err)
      toast.error('Failed to create job. Please try again.')
    }
  }

  if (loading) return <ListSkeleton count={4} />

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader title="Jobs & pipeline" subtitle="Manage postings and move candidates through the funnel" />
        <Button className="rounded-full bg-primary shadow-glow" onClick={handlePostJob}><Plus className="mr-1.5 h-4 w-4" /> Post a job</Button>
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs"><Briefcase className="mr-1.5 h-4 w-4" /> Job postings</TabsTrigger>
          <TabsTrigger value="pipeline"><Users className="mr-1.5 h-4 w-4" /> Pipeline board</TabsTrigger>
        </TabsList>

        {/* ── Jobs list ── */}
        <TabsContent value="jobs" className="mt-5 space-y-4">
          <div className="relative sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs…" className="pl-9" />
          </div>
          {jobs.length === 0 ? (
            <EmptyState
              illustration={<JobIllustration />}
              title="No jobs posted yet"
              description="Publish your first open position to start receiving referrals and building your candidate pipeline."
              primaryCtaLabel="Post your first job"
              onPrimaryCtaClick={handlePostJob}
            />
          ) : jobs.filter((j) => j.title.toLowerCase().includes(q.toLowerCase())).length === 0 ? (
            <EmptyState
              illustration={<JobIllustration />}
              title="No jobs match your search"
              description="Try adjusting your search terms to find the job posting you're looking for."
              primaryCtaLabel="Clear search"
              onPrimaryCtaClick={() => setQ('')}
            />
          ) : (
            jobs.filter((j) => j.title.toLowerCase().includes(q.toLowerCase())).map((j, i) => (
              <motion.div key={j.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="shadow-soft transition-colors hover:border-primary/20">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <CompanyChip name={recruiterCompany.name} className="h-11 w-11 rounded-xl text-xs" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {editingJobId === j.id ? (
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="h-7 w-full max-w-xs text-sm font-semibold"
                          />
                        ) : (
                          <span className="font-semibold">{j.title}</span>
                        )}
                        <Badge variant="outline" className={cn(
                          j.stage === 'Active' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500',
                          j.stage === 'Paused' && 'border-amber-500/25 bg-amber-500/10 text-amber-500',
                          j.stage === 'Draft' && 'text-muted-foreground',
                        )}>{j.stage}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {editingJobId === j.id ? (
                          <>
                            <Input
                              value={editLocation}
                              onChange={(e) => setEditLocation(e.target.value)}
                              className="h-6 w-40 text-xs"
                            />
                            <Input
                              value={editSalary}
                              onChange={(e) => setEditSalary(e.target.value)}
                              className="h-6 w-40 text-xs"
                            />
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {j.location}</span>
                            <span>{j.type}</span><span>{j.salary}</span>
                          </>
                        )}
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> posted {j.postedDaysAgo}d ago</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center"><div className="text-lg font-bold">{j.applicants}</div><div className="text-[11px] text-muted-foreground">applicants</div></div>
                      <div className="text-center"><div className="text-lg font-bold text-primary">{j.referrals}</div><div className="text-[11px] text-muted-foreground">referrals</div></div>
                      <div className="flex items-center gap-1">
                        {editingJobId === j.id ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={saveEdit} className="text-emerald-600">Save</Button>
                            <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => startEdit(j.id)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {j.stage === 'Active' && (
                              <Button variant="ghost" size="icon" onClick={() => setPauseTargetId(j.id)}>
                                <Pause className="h-4 w-4 text-amber-500" />
                              </Button>
                            )}
                            {j.stage === 'Paused' && (
                              <Button variant="ghost" size="icon" onClick={() => handlePauseResume(j.id)}>
                                <Play className="h-4 w-4 text-emerald-500" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTargetId(j.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    {j.pipeline.map((s) => (
                      <div key={s.stage} className="flex-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{s.stage}</span><span className="font-semibold text-foreground">{s.count}</span>
                        </div>
                        <Progress value={j.pipeline[0]?.count > 0 ? (s.count / j.pipeline[0].count) * 100 : 0} className="mt-1 h-1.5" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )))}
        </TabsContent>

        {/* ── Pipeline kanban ── */}
        <TabsContent value="pipeline" className="mt-5">
          {/* Mobile: stage selector tabs */}
          <div className="mb-4 md:hidden">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {STAGES.map((stage) => {
                const cands = allCandidates.filter((c) => candidateStages[c.id] === stage)
                return (
                  <button
                    key={stage}
                    onClick={() => setMobileStage(stage)}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                      mobileStage === stage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {stage}
                    <Badge variant="outline" className={cn('ml-0.5 h-5 min-w-[20px] justify-center text-[10px]', mobileStage === stage && 'border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground')}>
                      {cands.length}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mobile: single stage view */}
          <div className="md:hidden">
            {(() => {
              const stage = mobileStage
              const cands = allCandidates.filter((c) => candidateStages[c.id] === stage)
              const isAdding = addingToStage === stage
              const query = addCandidateQuery.toLowerCase()
              const pool = professionals.filter((p) => {
                if (candidateStages[p.id]) return false
                if (query && !p.name.toLowerCase().includes(query) && !p.company.toLowerCase().includes(query) && !p.industry.toLowerCase().includes(query)) return false
                return true
              })
              return (
                <div className={cn('rounded-xl border border-border border-t-4 bg-muted/30 p-3', STAGE_COLORS[stage])}>
                  <div className="mb-3 flex items-center justify-between px-1">
                    <span className="text-sm font-semibold">{stage}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{cands.length}</Badge>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary hover:bg-primary/10" onClick={() => { setAddingToStage(isAdding ? null : stage); setAddCandidateQuery('') }}>
                        {isAdding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                  {isAdding && (
                    <div className="mb-3 space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input value={addCandidateQuery} onChange={(e) => setAddCandidateQuery(e.target.value)} placeholder="Search professionals..." className="h-8 pl-8 text-xs" autoFocus />
                      </div>
                      <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-background p-1.5">
                        {pool.length === 0 && <p className="py-3 text-center text-[11px] text-muted-foreground">No available candidates</p>}
                        {pool.slice(0, 8).map((p) => (
                          <button key={p.id} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted/50 transition-colors" onClick={() => addCandidateToStage(p, stage)}>
                            <GAvatar name={p.name} gradient={p.gradient} className="h-7 w-7 text-[9px]" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-semibold">{p.name}</div>
                              <div className="truncate text-[10px] text-muted-foreground">{p.designation} · {p.company}</div>
                            </div>
                            <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {cands.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">No candidates in this stage</p>
                  ) : (
                    <div className="space-y-2">
                      {cands.map((c) => {
                        const next = nextStage(stage)
                        return (
                          <div key={c.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-background p-2.5">
                            <GAvatar name={c.name} gradient={c.gradient} className="h-8 w-8 text-[10px]" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-semibold">{c.name}</div>
                              <div className="truncate text-[10px] text-muted-foreground">{c.role} · {c.company}</div>
                            </div>
                            {next && (
                              <Button variant="ghost" size="sm" className="h-7 shrink-0 text-[10px] text-primary hover:bg-primary/10" onClick={() => advanceCandidate(c.id)}>
                                Move to {next}
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Desktop: 4-column kanban */}
          <div className="hidden md:grid md:grid-cols-4 md:gap-4">
            {(STAGES).map((stage) => {
              const cands = allCandidates.filter((c) => candidateStages[c.id] === stage)
              const isAdding = addingToStage === stage
              const query = addCandidateQuery.toLowerCase()
              const pool = professionals.filter((p) => {
                if (candidateStages[p.id]) return false
                if (query && !p.name.toLowerCase().includes(query) && !p.company.toLowerCase().includes(query) && !p.industry.toLowerCase().includes(query)) return false
                return true
              })
              return (
                <div key={stage} className={cn('rounded-xl border border-border border-t-4 bg-muted/30 p-3', STAGE_COLORS[stage])}>
                  <div className="mb-3 flex items-center justify-between px-1">
                    <span className="text-sm font-semibold">{stage}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{cands.length}</Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-primary hover:bg-primary/10" onClick={() => { setAddingToStage(isAdding ? null : stage); setAddCandidateQuery('') }}>
                        {isAdding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                  {isAdding && (
                    <div className="mb-3 space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input value={addCandidateQuery} onChange={(e) => setAddCandidateQuery(e.target.value)} placeholder="Search professionals..." className="h-8 pl-8 text-xs" autoFocus />
                      </div>
                      <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-background p-1.5">
                        {pool.length === 0 && <p className="py-3 text-center text-[11px] text-muted-foreground">No available candidates</p>}
                        {pool.slice(0, 8).map((p) => (
                          <button key={p.id} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted/50 transition-colors" onClick={() => addCandidateToStage(p, stage)}>
                            <GAvatar name={p.name} gradient={p.gradient} className="h-7 w-7 text-[9px]" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-semibold">{p.name}</div>
                              <div className="truncate text-[10px] text-muted-foreground">{p.designation} · {p.company}</div>
                            </div>
                            <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2.5">
                    {cands.map((c) => (
                      <motion.div key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="shadow-soft card-hover cursor-grab active:cursor-grabbing">
                          <CardContent className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <GAvatar name={c.name} gradient={c.gradient} className="h-8 w-8 text-[10px]" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold">{c.name}</div>
                                <div className="truncate text-[11px] text-muted-foreground">{c.role} · {c.exp}y</div>
                              </div>
                              <span className="flex items-center gap-0.5 text-xs font-semibold"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{c.rating}</span>
                            </div>
                            <div className="mt-2 truncate text-[11px] text-muted-foreground">for {c.company}</div>
                            <div className="mt-2 flex items-center justify-between">
                              <Chip tone={c.source === 'Referral' ? 'primary' : 'default'}>{c.source}</Chip>
                              <button className="flex items-center text-[11px] font-medium text-primary hover:underline" onClick={() => advanceCandidate(c.id)}>
                                Advance <ChevronRight className="h-3 w-3" />
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                    {cands.length === 0 && !isAdding && (
                      <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">No candidates yet</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}
        title="Delete job posting"
        description="This will permanently remove this job posting. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={pauseTargetId !== null}
        onOpenChange={(open) => { if (!open) setPauseTargetId(null) }}
        title="Pause job posting"
        description="This will pause the job posting and hide it from candidates."
        confirmLabel="Pause"
        variant="default"
        onConfirm={() => {
          if (pauseTargetId) handlePauseResume(pauseTargetId)
          setPauseTargetId(null)
        }}
      />
    </div>
  )
}
