import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowLeft, BadgeCheck, Bookmark, BookmarkCheck, Briefcase, Calendar,
  Globe, Linkedin, MapPin, MessageSquare, Phone, Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

import { SkeletonCard } from '@/components/ui/skeleton'
import { CompanyChip, GAvatar, ReportDialog } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import { supabase } from '@/lib/supabase'
import { getMessagesPath } from '@/data/mock'
import NotFound from '@/pages/NotFound'

interface PublicProfessional {
  id: string; slug?: string; name: string; designation: string; company: string; location: string
  yearsExp: number; verified: boolean; gradient: string; bio: string; skills: string[]
  openPositions: string[]; openForReferrals: boolean; maxPerMonth: number
  usedThisMonth: number; referralDuration: string; avgReplyHours: number
  referralsCompleted: number; rating: number; linkedinUrl: string; githubUrl: string
  email: string; phone: string; whatsapp: string
}

async function resolveUserId(paramId: string): Promise<string | null> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (UUID_RE.test(paramId)) return paramId
  const { data } = await supabase.from('users').select('id').eq('slug', paramId).single()
  return data?.id ?? null
}

export default function ProfessionalPublic() {
  const { id: paramId } = useParams()
  const navigate = useNavigate()
  const app = useApp()
  const { bookmarks, toggleBookmark, requests, student } = app ?? {}
  const loading = usePageLoading(400)
  const [pro, setPro] = useState<PublicProfessional | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!paramId) return
    const fetchPro = async () => {
      setLoadingData(true)
      try {
        const userId = await resolveUserId(paramId)
        if (!userId) { setLoadingData(false); return }
        const { data } = await supabase
          .from('profiles_professional')
          .select('*')
          .eq('user_id', userId)
          .single()
        if (!data) { setLoadingData(false); return }
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, email, city, state, country, linkedin, slug')
          .eq('id', userId)
          .single()
        const locationParts = [userData?.city, userData?.state].filter(Boolean).join(', ')
        const GRADIENTS = ['from-[#3B5FE5] to-[#8B8FD4]', 'from-[#4F7CFF] to-[#7C5CFF]', 'from-[#6366F1] to-[#8B5CF6]', 'from-[#0EA5E9] to-[#6366F1]']
        const gradientIndex = userId ? userId.charCodeAt(0) % GRADIENTS.length : 0
        setPro({
          id: userId,
          slug: userData?.slug || undefined,
          name: userData?.full_name || 'Professional',
          designation: data.job_title || 'Professional',
          company: data.company_name || 'Company',
          location: locationParts || '',
          yearsExp: data.years_experience || 0,
          verified: true,
          gradient: GRADIENTS[gradientIndex],
          bio: data.bio || '',
          skills: Array.isArray(data.skills) ? data.skills : [],
          openPositions: Array.isArray(data.open_positions) ? data.open_positions : [],
          openForReferrals: data.open_for_referrals ?? true,
          maxPerMonth: data.referral_capacity || 5,
          usedThisMonth: data.referrals_used || 0,
          referralDuration: '2 weeks',
          avgReplyHours: data.avg_reply_hours || 12,
          referralsCompleted: data.referrals_used || 0,
          rating: data.rating || 4.8,
          linkedinUrl: userData?.linkedin || '',
          githubUrl: data.github_url || '',
          email: userData?.email || '',
          phone: '',
          whatsapp: '',
        })
      } catch {
        setPro(null)
      }
      setLoadingData(false)
    }
    fetchPro()
  }, [paramId])

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (!pro) return <NotFound />
  const saved = bookmarks?.includes(pro.id) ?? false
  const hasAcceptedReferral = requests?.some(
    (r) => r.professionalId === pro.id && r.student === student?.name && r.status === 'accepted'
  ) ?? false

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <button onClick={() => window.history.back()} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

      {/* Hero card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className={`h-32 bg-gradient-to-r ${pro.gradient} relative sm:h-40`}>
            <div className="bg-grid absolute inset-0 opacity-20" />
          </div>
          <CardContent className="relative px-6 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="-mt-12 sm:-mt-14">
                  <GAvatar name={pro.name} gradient={pro.gradient} className="h-24 w-24 border-4 border-card text-2xl sm:h-28 sm:w-28" />
                </div>
                <div className="pb-1">
                  <h1 className="font-display flex items-center gap-2 text-2xl font-bold">
                    {pro.name} {pro.verified && <BadgeCheck className="h-5.5 w-5.5 text-sky-500" />}
                  </h1>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <span>{pro.designation}</span><span>·</span>
                    <span className="flex items-center gap-1.5"><CompanyChip name={pro.company} className="h-5 w-5 text-[8px]" />{pro.company}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 sm:pb-1">
                <Button
                  className="rounded-full bg-primary shadow-glow"
                  disabled={!pro.openForReferrals}
                  asChild={pro.openForReferrals}
                >
                  {pro.openForReferrals
                    ? <Link to={`/job-seeker/request-referral/${pro.id}`}><Send className="mr-1.5 h-4 w-4" /> Request Referral</Link>
                    : <span>At capacity</span>}
                </Button>
                <Button variant="outline" className="rounded-full" onClick={async () => {
                  const convId = await app.startConversation(pro.id)
                  if (convId) navigate(`${getMessagesPath(app.role)}?conversation=${convId}`)
                }}><MessageSquare className="mr-1.5 h-4 w-4" /> Message</Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => { toggleBookmark?.(pro.id); toast(saved ? 'Removed from bookmarks' : 'Saved to bookmarks') }}>
                  {saved ? <BookmarkCheck className="h-4.5 w-4.5 text-primary" /> : <Bookmark className="h-4.5 w-4.5" />}
                </Button>
                <ReportDialog targetUserId={pro.id} targetUserName={pro.name} />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {pro.location}</span>
              <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {pro.yearsExp} years experience</span>
              {pro.linkedinUrl ? (
                <a href={pro.linkedinUrl.startsWith('http') ? pro.linkedinUrl : `https://linkedin.com/in/${pro.linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline transition-colors"><Linkedin className="h-4 w-4" /> LinkedIn</a>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground/50"><Linkedin className="h-4 w-4" /> LinkedIn</span>
              )}
              {pro.githubUrl ? (
                <a href={pro.githubUrl.startsWith('http') ? pro.githubUrl : `https://github.com/${pro.githubUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline transition-colors"><Globe className="h-4 w-4" /> Portfolio</a>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground/50"><Globe className="h-4 w-4" /> Portfolio</span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3 items-stretch">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* About */}
          <Card className="shadow-soft">
            <CardContent className="p-6">
              <h2 className="text-base font-semibold">About</h2>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{pro.bio}</p>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="shadow-soft">
            <CardContent className="p-6">
              <h2 className="text-base font-semibold">Skills & technologies</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {pro.skills.map((s) => (
                  <span key={s} className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{s}</span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Openings */}
          {pro.openPositions.length > 0 && (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <h2 className="text-base font-semibold">Current openings</h2>
                <div className="mt-3 space-y-2.5">
                  {pro.openPositions.map((o, i) => (
                    <div key={o} className="flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:border-primary/20">
                      <div className="flex items-center gap-3">
                        <CompanyChip name={pro.company} className="h-9 w-9 rounded-lg text-xs" />
                        <div>
                          <div className="text-sm font-semibold">{o}</div>
                          <div className="text-xs text-muted-foreground">{pro.location} · Full-time</div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.max(0, (pro.referralsCompleted - i * 3) % 15 + 5)} referred</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Referral Availability */}
          <Card className="shadow-soft flex-1">
            <CardContent className="p-6">
              <h2 className="text-base font-semibold">Referral availability</h2>
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-border p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">{pro.referralDuration}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {pro.openForReferrals
                      ? `${pro.maxPerMonth - pro.usedThisMonth} of ${pro.maxPerMonth} slots remaining`
                      : 'Currently at capacity'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <Card className="shadow-soft">
            <CardContent className="space-y-3 p-6">
              <h3 className="text-sm font-semibold">Capacity this month</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Slots used</span>
                <span className="font-semibold">{pro.usedThisMonth} / {pro.maxPerMonth}</span>
              </div>
              <Progress value={(pro.usedThisMonth / pro.maxPerMonth) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {pro.openForReferrals
                  ? `${pro.maxPerMonth - pro.usedThisMonth} referral slots remaining — requests are reviewed in the order received.`
                  : 'Fully booked for this month. Check back later or send a message.'}
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0 text-primary" /> Typically replies {pro.avgReplyHours <= 8 ? 'same day' : pro.avgReplyHours <= 16 ? 'within a day' : 'within 2 days'}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft flex-1">
            <CardContent className="space-y-4 p-6">
              <h3 className="text-sm font-semibold">Contact Information</h3>
              {hasAcceptedReferral ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Phone</div>
                      <div className="text-sm font-medium">{pro.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">WhatsApp</div>
                      <div className="text-sm font-medium">{pro.whatsapp}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Email</div>
                      <div className="text-sm font-medium">{pro.email}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { icon: Phone, label: 'Phone' },
                    { icon: MessageSquare, label: 'WhatsApp' },
                    { icon: () => (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    ), label: 'Email' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground">{item.label}</div>
                        <div className="text-sm font-medium text-muted-foreground">••••••••</div>
                      </div>
                      <svg className="h-4 w-4 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Accept a referral request to unlock contact details.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </div>
  )
}
