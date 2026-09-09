import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  Briefcase, MapPin, Clock, DollarSign, Building2, ArrowLeft,
  Bookmark, BookmarkCheck, Share2, Users, Star, ExternalLink, Copy,
  CalendarClock, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CompanyChip } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { ListSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { profileUrl } from '@/data/mock'

interface JobDetail {
  id: string
  title: string
  department: string
  location: string
  type: string
  salary: string
  description: string
  requirements: string
  application_url: string
  track: string
  status: string
  posted_at: string
  expires_at: string
  recruiter_id: string
  applicants: number
  referrals: number
  recruiter_name: string
  recruiter_slug: string
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { role } = useApp()
  const [job, setJob] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const { data: jobRow, error: jobErr } = await supabase
          .from('jobs')
          .select('id, title, department, location, type, salary_range, description, requirements, application_url, track, status, posted_at, expires_at, recruiter_id, applicants, referrals')
          .eq('id', id)
          .single()

        if (jobErr || !jobRow) {
          toast.error('Job not found')
          setLoading(false)
          return
        }

        let recruiterName = ''
        let recruiterSlug = ''
        if (jobRow.recruiter_id) {
          const { data: u } = await supabase
            .from('users')
            .select('full_name, slug')
            .eq('id', jobRow.recruiter_id)
            .single()
          if (u) {
            recruiterName = u.full_name ?? ''
            recruiterSlug = u.slug ?? ''
          }
        }

        setJob({
          ...jobRow,
          salary: jobRow.salary_range ?? '',
          description: jobRow.description ?? '',
          requirements: jobRow.requirements ?? '',
          application_url: jobRow.application_url ?? '',
          track: jobRow.track ?? '',
          status: jobRow.status ?? 'active',
          expires_at: jobRow.expires_at ?? '',
          recruiter_name: recruiterName,
          recruiter_slug: recruiterSlug,
        })
      } catch (err) {
        console.error('Failed to load job:', err)
        toast.error('Failed to load job details')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (!user || !id) return
    const check = async () => {
      const { data } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('job_id', id)
        .maybeSingle()
      setBookmarked(!!data)
    }
    check()
  }, [user, id])

  const toggleBookmark = async () => {
    if (!user || !id) return
    setBookmarkLoading(true)
    try {
      if (bookmarked) {
        await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('job_id', id)
        setBookmarked(false)
        toast.success('Bookmark removed')
      } else {
        await supabase.from('bookmarks').insert({ user_id: user.id, job_id: id })
        setBookmarked(true)
        toast.success('Job bookmarked')
      }
    } catch {
      toast.error('Failed to update bookmark')
    } finally {
      setBookmarkLoading(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareNative = () => {
    if (navigator.share && job) {
      navigator.share({ title: job.title, url: window.location.href })
    } else {
      copyLink()
    }
  }

  if (loading) return <div className="space-y-6 p-6"><ListSkeleton count={3} /></div>

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Briefcase className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Job not found</p>
        <Link to={role === 'recruiter' ? '/recruiter/jobs' : '/job-seeker/browse-jobs'}>
          <Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Back to jobs</Button>
        </Link>
      </div>
    )
  }

  const postedDate = new Date(job.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const daysAgo = Math.floor((Date.now() - new Date(job.posted_at).getTime()) / 86400000)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to={role === 'recruiter' ? '/recruiter/jobs' : '/job-seeker/browse-jobs'} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-xs text-muted-foreground">Back to jobs</span>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {job.recruiter_id ? (
                <Link to={profileUrl('recruiter', job.recruiter_id, job.recruiter_slug)}>
                  <CompanyChip name={job.recruiter_name || 'Co'} className="h-12 w-12 rounded-xl text-sm hover:ring-2 hover:ring-primary/30 transition-all" />
                </Link>
              ) : (
                <CompanyChip name={job.recruiter_name || 'Co'} className="h-12 w-12 rounded-xl text-sm" />
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold">{job.title}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {job.recruiter_name && (
                    <Link to={profileUrl('recruiter', job.recruiter_id, job.recruiter_slug)} className="hover:text-foreground transition-colors">
                      {job.recruiter_name}
                    </Link>
                  )}
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {job.type}</span>
                  {job.salary && <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {job.salary}</span>}
                  {job.department && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {job.department}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-500/25 bg-emerald-500/10 text-emerald-500 text-xs">Active</Badge>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={toggleBookmark}
                  disabled={bookmarkLoading}
                >
                  {bookmarked ? <BookmarkCheck className="h-4 w-4 text-primary fill-primary" /> : <Bookmark className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={shareNative}>
                  {copied ? <Copy className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {job.applicants} applicants</span>
              <span className="flex items-center gap-1 text-primary"><Star className="h-4 w-4" /> {job.referrals} referrals</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Posted {postedDate} ({daysAgo}d ago)</span>
            </div>

            {job.expires_at && (() => {
              const deadline = new Date(job.expires_at)
              const now = new Date()
              const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              const isExpired = daysLeft <= 0
              const isUrgent = daysLeft > 0 && daysLeft <= 7
              return (
                <div className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                  isExpired
                    ? 'border-rose-500/25 bg-rose-500/5 text-rose-500'
                    : isUrgent
                    ? 'border-amber-500/25 bg-amber-500/5 text-amber-500'
                    : 'border-border bg-muted/30 text-foreground'
                }`}>
                  {isExpired ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CalendarClock className="h-4 w-4 shrink-0" />}
                  <span className="font-medium">
                    {isExpired
                      ? 'Application deadline has passed'
                      : isUrgent
                      ? `Application deadline in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
                      : `Application deadline: ${deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                    }
                  </span>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {job.description && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-base font-semibold">About the role</h2>
                  <Separator className="my-3" />
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-muted-foreground">
                    {job.description}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {job.requirements && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-base font-semibold">Requirements</h2>
                  <Separator className="my-3" />
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-muted-foreground">
                    {job.requirements}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {!job.description && !job.requirements && (
            <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Briefcase className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No detailed description available for this position.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Contact the recruiter for more information.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-base font-semibold">Job details</h2>
                <Separator />
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{job.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Job type</span>
                    <span className="font-medium">{job.type}</span>
                  </div>
                  {job.salary && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Salary</span>
                      <span className="font-medium">{job.salary}</span>
                    </div>
                  )}
                  {job.department && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Department</span>
                      <span className="font-medium">{job.department}</span>
                    </div>
                  )}
                  {job.track && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Track</span>
                      <span className="font-medium capitalize">{job.track}</span>
                    </div>
                  )}
                  {job.expires_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deadline</span>
                      <span className="font-medium">
                        {new Date(job.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
              <CardContent className="p-6 space-y-3">
                <h2 className="text-base font-semibold">Actions</h2>
                <Separator />
                {role === 'student' && (
                  <>
                    {job.expires_at && new Date(job.expires_at) < new Date() ? (
                      <Button className="w-full" disabled>
                        Applications Closed
                      </Button>
                    ) : (
                      <Link to="/job-seeker/request-referral" className="block">
                        <Button className="w-full bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200">
                          Request Referral
                        </Button>
                      </Link>
                    )}
                    <Link to="/job-seeker/professionals" className="block">
                      <Button variant="outline" className="w-full">
                        Find a Professional
                      </Button>
                    </Link>
                  </>
                )}
                {role === 'professional' && (
                  <Link to="/professional/professionals" className="block">
                    <Button className="w-full bg-primary text-white shadow-sm hover:shadow-md transition-all duration-200">
                      View Referral Requests
                    </Button>
                  </Link>
                )}
                {job.application_url && (
                  <a href={job.application_url} target="_blank" rel="noopener noreferrer" className="block">
                    <Button variant="outline" className="w-full gap-2">
                      Apply directly <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {job.recruiter_id && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-base font-semibold mb-3">Posted by</h2>
                  <Link to={profileUrl('recruiter', job.recruiter_id, job.recruiter_slug)} className="flex items-center gap-3 group">
                    <CompanyChip name={job.recruiter_name || 'Co'} className="h-10 w-10 rounded-xl text-xs group-hover:ring-2 group-hover:ring-primary/30 transition-all" />
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{job.recruiter_name || 'Recruiter'}</p>
                      <p className="text-xs text-muted-foreground">View company profile</p>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
