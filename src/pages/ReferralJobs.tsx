import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowRight, BadgeCheck, Briefcase, Building2, CheckCircle2, Clock, ExternalLink, FileText, GraduationCap, MapPin, Search, Send, Sparkles, Users, X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Chip, CompanyChip, EmptyState, SectionHeader } from '@/components/ui-kit'
import { supabase } from '@/lib/supabase'
import { applicationUrlSupported, professionalCollegeSupported } from '@/lib/db'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { PIPELINE_STAGES, type PipelineStage } from '@/data/mock'
import { cn } from '@/lib/utils'

interface JobRow {
  id: string
  title: string
  department: string | null
  location: string | null
  type: string | null
  salary_range: string | null
  description: string | null
  skills: string[] | null
  posted_at: string
  stage: string
  recruiter_id: string | null
  application_url?: string | null
}

interface ReferrerRow {
  user_id: string
  full_name: string
  slug: string | null
  company_name: string | null
  job_title: string | null
  skills: string[] | null
  college?: string | null
  verified: boolean
  open_for_referrals: boolean
}

function normalizeCompany(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/gi, '')
}

function normalizeText(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function parseSkills(description: string | null, stored: string[] | null | undefined): string[] {
  if (stored && stored.length > 0) return stored.slice(0, 12)
  const lower = (description ?? '').toLowerCase()
  const known = [
    'react', 'node', 'typescript', 'javascript', 'python', 'java', 'go', 'rust',
    'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'sql', 'postgres', 'mongodb',
    'graphql', 'rest', 'ci/cd', 'terraform', 'machine learning', 'data', 'excel',
    'communication', 'leadership', 'product', 'design', 'figma', 'sales', 'marketing',
    'mobile', 'ios', 'android', 'flutter', 'swift', 'kotlin', 'c#', 'c++',
  ]
  return known.filter((s) => lower.includes(s)).map((s) => s.toUpperCase()).slice(0, 12)
}

function extractExperience(description: string | null): string | null {
  const lower = (description ?? '').toLowerCase()
  const match = lower.match(/(\d+)\+?\s*(?:years|yrs)?\s*(?:of)?\s*experience/)
  if (match) return `${match[1]}+ years`
  if (lower.includes('fresher') || lower.includes('entry level') || lower.includes('entry-level')) return 'Entry level'
  if (lower.includes('senior')) return 'Senior'
  return null
}

const PIPELINE_STAGE_META: Record<PipelineStage, { label: string; icon: typeof Send; cls: string }> = {
  request_sent: { label: 'Requested', icon: Send, cls: 'text-blue-500' },
  under_review: { label: 'Under Review', icon: Clock, cls: 'text-amber-500' },
  accepted: { label: 'Accepted', icon: CheckCircle2, cls: 'text-emerald-500' },
  submitted: { label: 'Referred', icon: FileText, cls: 'text-violet-500' },
  hired: { label: 'Closed', icon: CheckCircle2, cls: 'text-foreground' },
}

function PipelineProgress({ stage }: { stage: PipelineStage }) {
  const idx = PIPELINE_STAGES.findIndex((s) => s.key === stage)
  const current = Math.max(0, idx)
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider">Your referral status</span>
        <span className="font-medium text-primary">{current + 1} of {PIPELINE_STAGES.length}</span>
      </div>
      <div className="mt-2 flex items-center gap-1">
        {PIPELINE_STAGES.map((s, i) => {
          const meta = PIPELINE_STAGE_META[s.key]
          const done = i <= current
          return (
            <div key={s.key} className="flex-1">
              <div className={cn('h-1.5 rounded-full transition-colors', done ? 'bg-primary' : 'bg-muted')} />
              <div className={cn('mt-1 flex items-center gap-1 text-[10px] font-medium', done ? meta.cls : 'text-muted-foreground/60')}>
                <meta.icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{meta.label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AffinityBadges({ job, referrer, student }: {
  job: JobRow
  referrer: ReferrerRow | undefined
  student: ReturnType<typeof useApp>['student']
}) {
  const badges: { label: string; tone: string; icon: typeof GraduationCap }[] = []

  const studentSchools = (student?.education ?? []).map((e) => normalizeText(e.school))
  const studentOrgs = (student?.experience ?? []).map((e) => normalizeText(e.org))

  if (referrer?.college && studentSchools.length > 0) {
    const refCollege = normalizeText(referrer.college)
    if (studentSchools.some((s) => s.includes(refCollege) || refCollege.includes(s))) {
      badges.push({ label: `Same college as ${referrer.full_name.split(' ')[0] || 'referrer'}`, tone: 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400', icon: GraduationCap })
    }
  }

  const jobCompany = normalizeText(job.department)
  if (jobCompany && studentOrgs.some((o) => o.includes(jobCompany) || jobCompany.includes(o))) {
    badges.push({ label: `Ex-colleague at ${job.department}`, tone: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400', icon: Building2 })
  }

  if (badges.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <Badge key={b.label} variant="outline" className={cn('font-medium', b.tone)}>
          <b.icon className="mr-1 h-3 w-3" /> {b.label}
        </Badge>
      ))}
    </div>
  )
}

function MatchExplanation({ job, hasReferrer, referrerCount, skillsList, studentSkills }: {
  job: JobRow
  hasReferrer: boolean
  referrerCount: number
  skillsList: string[]
  studentSkills: string[]
}) {
  const overlap = skillsList.filter((s) => studentSkills.includes(s.toLowerCase()))
  const reasons: string[] = []

  if (hasReferrer) {
    reasons.push(`${referrerCount} verified referrer${referrerCount > 1 ? 's' : ''} at ${job.department || 'this company'} who can refer you`)
  } else {
    reasons.push('No verified referrer attached yet — request and our matching will route it to the best-fit referrer')
  }
  const exp = extractExperience(job.description)
  if (exp) reasons.push(`Role expects ${exp} experience`)
  if (overlap.length > 0) reasons.push(`${overlap.length} of your skills (${overlap.join(', ')}) align with this role`)

  return (
    <div className="mt-3 rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5 font-medium text-foreground">
        <Sparkles className="h-3 w-3 text-primary" /> Why this match
      </div>
      <ul className="mt-2 space-y-1.5">
        {reasons.map((reason) => (
          <li key={reason} className="flex items-start gap-1.5">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" /> {reason}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ReferralJobs() {
  const { student, requests } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [jobs, setJobs] = useState<JobRow[]>([])
  const [referrers, setReferrers] = useState<ReferrerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [applyOk, collegeOk] = await Promise.all([
          applicationUrlSupported(),
          professionalCollegeSupported(),
        ])
        if (cancelled) return

        const [jobsRes, refsRes] = await Promise.all([
          supabase
            .from('jobs')
            .select(`id, title, department, location, type, salary_range, description, skills, posted_at, stage, recruiter_id${applyOk ? ', application_url' : ''}`)
            .eq('stage', 'Active')
            .order('posted_at', { ascending: false })
            .limit(100),
          supabase
            .from('profiles_professional')
            .select(`user_id, job_title, company_name, skills, open_for_referrals${collegeOk ? ', college' : ''}`),
        ])

        if (cancelled) return
        const jobRows = (jobsRes.data ?? []) as unknown as JobRow[]
        const proRows = (refsRes.data ?? []) as unknown as Array<{ user_id: string; job_title: string | null; company_name: string | null; skills: string[] | null; open_for_referrals: boolean; college?: string | null }>

        // Only surface professional users who are real, verified, and open to referrals
        const proIds = [...new Set(proRows.map((p) => p.user_id))]
        const { data: userRows } = await supabase
          .from('users')
          .select('id, full_name, slug, verified, professional_verified, work_email_verified')
          .in('id', proIds)

        const userMap = new Map<string, { full_name: string | null; slug: string | null; verified: boolean }>()
        for (const u of (userRows ?? []) as unknown as Array<{ id: string; full_name: string | null; slug: string | null; verified: boolean; professional_verified: boolean; work_email_verified: boolean }>) {
          userMap.set(u.id, {
            full_name: u.full_name,
            slug: u.slug,
            verified: !!(u.verified || u.professional_verified || u.work_email_verified),
          })
        }

        const enriched: ReferrerRow[] = proRows
          .filter((p) => userMap.get(p.user_id)?.verified)
          .map((p) => {
            const u = userMap.get(p.user_id)!
            return {
              user_id: p.user_id,
              full_name: u.full_name ?? '',
              slug: u.slug,
              company_name: p.company_name,
              job_title: p.job_title,
              skills: p.skills,
              college: p.college ?? undefined,
              verified: true,
              open_for_referrals: p.open_for_referrals,
            }
          })

        if (cancelled) return
        setJobs(jobRows)
        setReferrers(enriched)
      } catch (err) {
        console.error('ReferralJobs load failed:', err)
        if (cancelled) return
        setJobs([])
        setReferrers([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const studentSkills = useMemo(
    () => (student?.skills ?? []).map((s) => s.trim().toLowerCase()),
    [student?.skills],
  )

  const enrichedJobs = useMemo(
    () => jobs
      .filter((j) => (j.title?.length ?? 0) > 0 && (j.department?.length ?? 0) > 0)
      .map((job) => {
        const matches = referrers.filter(
          (r) => r.company_name && normalizeCompany(r.company_name) === normalizeCompany(job.department),
        )
        const available = matches.filter((r) => r.open_for_referrals)
        return {
          ...job,
          company: job.department,
          skillsList: parseSkills(job.description, job.skills),
          referrers: available,
          referrerCount: matches.length,
          hasReferrer: available.length > 0,
        }
      }),
    [jobs, referrers],
  )

  const types = useMemo(() => [...new Set(enrichedJobs.map((j) => j.type).filter(Boolean))] as string[], [enrichedJobs])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return enrichedJobs.filter((job) => {
      if (typeFilter !== 'all' && (job.type ?? '').toLowerCase() !== typeFilter) return false
      if (!term) return true
      const haystack = [job.title, job.department, job.location, ...job.skillsList].join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [enrichedJobs, q, typeFilter])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="h-8 w-64 animate-pulse rounded-xl bg-muted" />
        <div className="mt-8 h-10 w-full max-w-sm animate-pulse rounded-xl bg-muted/60" />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          title="Referral Jobs"
          subtitle="Open roles at companies where verified referrers are available — no cold applying."
        />
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search roles, companies, skills…" className="pl-9 rounded-full" />
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
        </div>
      </div>

      {types.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {['all', ...types.map((t) => t.toLowerCase())].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                typeFilter === t ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'all' ? 'All types' : t}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyState
              icon={Briefcase}
              title="No matching roles right now"
              description="Try a different search, or check back soon — recruiters post new roles regularly."
            />
          </div>
        ) : (
          filtered.map((job) => {
            const topReferrer = job.hasReferrer ? job.referrers[0] : undefined
            const myRequest = user
              ? requests.find((r) => r.requesterId === user.id && r.professionalId === topReferrer?.user_id && normalizeText(r.role) === normalizeText(job.title))
              : undefined
            return (
              <motion.div key={job.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="h-full shadow-soft">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start gap-3">
                      <CompanyChip name={job.company ?? ''} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold leading-tight">{job.title}</h3>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" /> {job.company}
                            </p>
                          </div>
                          {job.hasReferrer ? (
                            <Badge variant="outline" className="shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <BadgeCheck className="mr-1 h-3 w-3" /> Referrer available
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0 border-muted text-muted-foreground">No referrer yet</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      {job.location && (
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                      )}
                      {job.type && (
                        <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {job.type}</span>
                      )}
                      {job.salary_range && (
                        <span className="inline-flex items-center gap-1 font-medium text-foreground">{job.salary_range}</span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Updated {Math.max(0, Math.floor((Date.now() - new Date(job.posted_at).getTime()) / 86_400_000))}d ago
                      </span>
                    </div>

                    {job.skillsList.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {job.skillsList.map((s) => <Chip key={s}>{s}</Chip>)}
                      </div>
                    )}

                    <AffinityBadges job={job} referrer={topReferrer} student={student} />

                    <MatchExplanation
                      job={job}
                      hasReferrer={job.hasReferrer}
                      referrerCount={job.referrerCount}
                      skillsList={job.skillsList}
                      studentSkills={studentSkills}
                    />

                    {myRequest && (
                      <PipelineProgress stage={myRequest.pipelineStage} />
                    )}

                    <div className="mt-4 flex flex-1 flex-wrap items-end gap-2">
                      {myRequest ? (
                        <Button size="sm" variant="outline" className="rounded-full" asChild>
                          <Link to="/job-seeker/applications">Track this referral <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                        </Button>
                      ) : job.hasReferrer ? (
                        <Button size="sm" className="rounded-full bg-primary shadow-glow" onClick={() => {
                          if (!user) { navigate('/login'); return }
                          navigate(`/job-seeker/request-referral/${topReferrer?.user_id}?role=${encodeURIComponent(job.title)}`)
                        }}>
                          <Users className="mr-1.5 h-3.5 w-3.5" /> Request referral
                          <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="rounded-full" disabled>
                          No referrer attached yet
                        </Button>
                      )}
                      {topReferrer?.slug && (
                        <Button size="sm" variant="ghost" className="rounded-full" asChild>
                          <Link to={`/p/${topReferrer.slug}`}><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View referrer</Link>
                        </Button>
                      )}
                      {job.application_url && (
                        <Button size="sm" variant="outline" className="rounded-full" asChild>
                          <a href={job.application_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Apply on company site</a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })
        )}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Referrer availability and affinity badges are shown only when real, verified data backs them — never fabricated.
      </p>
    </div>
  )
}