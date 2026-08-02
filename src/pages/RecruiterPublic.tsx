import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowLeft, BadgeCheck, Briefcase, Building2, Globe, Send, Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Chip, CompanyChip, ReportDialog, Stars } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import { supabase } from '@/lib/supabase'
import NotFound from '@/pages/NotFound'

interface RecruiterData {
  user: { id: string; full_name: string; email: string; avatar_url?: string; linkedin?: string }
  company_name: string
  hiring_department: string
  company_size: string
  company_website: string
  company_description: string
}

export default function RecruiterPublic() {
  const { id } = useParams()
  const loading = usePageLoading(400)
  const { jobs } = useApp()
  const [recruiter, setRecruiter] = useState<RecruiterData | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoadingData(true)
      const { data: profile } = await supabase
        .from('profiles_recruiter')
        .select('*')
        .eq('user_id', id)
        .single()
      if (!profile) {
        setLoadingData(false)
        return
      }
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
      setRecruiter({
        user: userData as RecruiterData['user'],
        company_name: profile.company_name ?? 'Company',
        hiring_department: profile.hiring_department ?? 'Technology',
        company_size: profile.company_size ?? '50-100',
        company_website: profile.company_website ?? '',
        company_description: profile.company_description ?? '',
      })
      setLoadingData(false)
    }
    load()
  }, [id])

  if (loading || loadingData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!recruiter) return <NotFound />

  const c = recruiter
  const activeJobs = jobs.filter((j) => j.stage === 'Active')

  return (
    <div className="space-y-6">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="relative h-40 bg-gradient-to-r from-[#3B5FE5] to-[#8B8FD4] sm:h-52">
            <div className="bg-grid absolute inset-0 opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
          <CardContent className="relative px-6 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="-mt-10 sm:-mt-12">
                  <CompanyChip name={c.company_name} className="h-20 w-20 rounded-2xl border-4 border-card text-2xl sm:h-24 sm:w-24" />
                </div>
                <div className="pb-1">
                  <h1 className="font-display flex items-center gap-2 text-2xl font-bold">
                    {c.company_name} <BadgeCheck className="h-5.5 w-5.5 text-sky-500" />
                  </h1>
                  <div className="mt-0.5 text-sm text-muted-foreground">{c.hiring_department}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {c.hiring_department}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.company_size} employees</span>
                    {c.company_website && (
                      <a href={`https://${c.company_website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        <Globe className="h-3.5 w-3.5" /> {c.company_website}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => toast.info('Contact request sent!')}>
                  <Send className="mr-1.5 h-4 w-4" /> Contact Recruiter
                </Button>
                <ReportDialog targetUserId={id ?? ''} targetUserName={c.company_name} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3 items-stretch">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="shadow-soft">
            <CardHeader className=""><CardTitle className="text-base">About {c.company_name}</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm leading-relaxed text-muted-foreground">{c.company_description || 'No description provided yet.'}</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="">
              <CardTitle className="flex items-center gap-2 text-base"><Briefcase className="h-4 w-4 text-primary" /> Open positions ({activeJobs.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {activeJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active job postings right now.</p>
              ) : activeJobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
                  <div>
                    <div className="text-sm font-semibold">{j.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{j.location} &middot; {j.type} &middot; {j.salary}</div>
                  </div>
                  <Link to="/request-referral">
                    <Button size="sm" variant="outline" className="rounded-full text-xs">
                      <Send className="mr-1 h-3 w-3" /> Get Referral
                    </Button>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className=""><CardTitle className="text-base">Benefits & perks</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {['Health insurance', '401k matching', 'Stock options', 'Remote friendly', 'Unlimited PTO'].map((b) => (
                  <Chip key={b} tone="primary">{b}</Chip>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="shadow-soft">
            <CardHeader className=""><CardTitle className="text-base">Hiring stats</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <div className="text-lg font-bold text-primary">{activeJobs.length}</div>
                <div className="text-[11px] text-muted-foreground">Active jobs</div>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <div className="text-lg font-bold text-primary">92%</div>
                <div className="text-[11px] text-muted-foreground">Response rate</div>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-lg font-bold text-amber-500">
                  <Stars value={4.5} /> 4.5
                </div>
                <div className="text-[11px] text-muted-foreground">Employer rating</div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-primary/25 bg-gradient-to-br from-primary/[0.05] to-[#8B8FD4]/[0.05]">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold"><BadgeCheck className="h-4 w-4 text-sky-500" /> Verified employer</div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Domain and incorporation verified. Verification lifts applicant trust scores by 41%.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
