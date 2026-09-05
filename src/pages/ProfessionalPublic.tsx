import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowLeft, BadgeCheck, Bookmark, BookmarkCheck, Briefcase, Calendar,
  Globe, Linkedin, MapPin, MessageSquare, Phone, Send, TrendingUp, Star,
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
import { getMessagesPath, calculateReputationScore, BADGE_DEFINITIONS, type Professional } from '@/data/mock'
import { getBannerStyle, getProfileTheme } from '@/lib/utils'
import NotFound from '@/pages/NotFound'

interface PublicProfessional {
  id: string; slug?: string; name: string; designation: string; company: string; location: string
  yearsExp: number; verified: boolean; gradient: string; bio: string; skills: string[]
  openPositions: string[]; openForReferrals: boolean; maxPerMonth: number
  usedThisMonth: number; referralDuration: string; avgReplyHours: number
  referralsCompleted: number; rating: number; linkedinUrl: string; githubUrl: string
  email: string; phone: string; whatsapp: string
  responseRate?: number; successRate?: number; joinedDaysAgo?: number; referralPolicy?: string
}

function toProfessional(p: PublicProfessional): Professional {
  return {
    id: p.id, slug: p.slug, name: p.name, designation: p.designation, company: p.company,
    industry: '', location: p.location, yearsExp: p.yearsExp, skills: p.skills,
    responseRate: p.responseRate ?? 0, avgReplyHours: p.avgReplyHours,
    referralsCompleted: p.referralsCompleted, rating: p.rating, reviews: 0,
    verified: p.verified, openForReferrals: p.openForReferrals, isOpenToWork: false,
    maxPerMonth: p.maxPerMonth, usedThisMonth: p.usedThisMonth,
    successRate: p.successRate ?? 0, followers: 0,
    joinedDaysAgo: p.joinedDaysAgo ?? 0, activityScore: 0,
    referralPolicy: p.referralPolicy ?? '', openPositions: p.openPositions,
    bio: p.bio, badges: [], gradient: p.gradient, phone: p.phone,
    whatsapp: p.whatsapp, email: p.email, hiringTimeline: [],
    referralDuration: p.referralDuration, linkedinUrl: p.linkedinUrl,
    githubUrl: p.githubUrl,
  }
}

async function resolveUserId(paramId: string): Promise<string | null> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (UUID_RE.test(paramId)) return paramId
  const { data } = await supabase.from('users').select('id').eq('slug', paramId).single()
  if (data?.id) return data.id
  const { data: fallback } = await supabase.from('users').select('id').ilike('slug', `%/${paramId}`).single()
  return fallback?.id ?? null
}

export default function ProfessionalPublic() {
  const { id: paramId } = useParams()
  const navigate = useNavigate()
  const app = useApp()
  const { bookmarks, toggleBookmark, requests, student } = app ?? {}
  const loading = usePageLoading(400)
  const [pro, setPro] = useState<PublicProfessional | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [bannerTheme, setBannerTheme] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!paramId) return
    const fetchPro = async () => {
      setLoadingData(true)
      try {
        const userId = await resolveUserId(paramId)
        if (!userId) { setLoadingData(false); return }
        setUserId(userId)
        const { data } = await supabase
          .from('profiles_professional')
          .select('*')
          .eq('user_id', userId)
          .single()
        if (!data) { setLoadingData(false); return }
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, email, mobile, city, state, country, linkedin, slug, verified, professional_verified, work_email_verified, banner_theme')
          .eq('id', userId)
          .single()
        const locationParts = [userData?.city, userData?.state].filter(Boolean).join(', ')
        setBannerTheme(userData?.banner_theme ?? null)
        setPro({
          id: userId,
          slug: userData?.slug || undefined,
          name: userData?.full_name || 'Professional',
          designation: data.job_title || 'Professional',
          company: data.company_name || 'Company',
          location: locationParts || '',
          yearsExp: data.years_experience || 0,
          verified: !!(userData?.verified || userData?.professional_verified || userData?.work_email_verified),
          gradient: 'from-[#6366F1] to-[#8B5CF6]',
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
          phone: userData?.mobile || '',
          whatsapp: userData?.mobile || '',
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
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

      {/* Hero card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          {(() => { const bs = getBannerStyle(userId, bannerTheme); return (
            <div className="h-32 relative sm:h-40" style={bs.style}>
              <div className="bg-grid absolute inset-0 opacity-20" />
            </div>
          ) })()}
          <CardContent className="relative px-6 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="-mt-12 sm:-mt-14">
                  <GAvatar name={pro.name} gradient={pro.gradient} color={getProfileTheme(bannerTheme).avatar} className="h-24 w-24 border-4 border-card text-2xl sm:h-28 sm:w-28" />
                </div>
                <div className="pb-1">
                  <h1 className="font-display flex items-center gap-2 text-2xl font-bold tracking-tight">
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
              {hasAcceptedReferral ? (
                <>
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
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground/50"><Linkedin className="h-4 w-4" /> <Globe className="h-4 w-4" /> Profile links hidden until you're accepted</span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reputation badges */}
      {pro && (() => {
        const rep = calculateReputationScore(toProfessional(pro))
        if (rep.badges.length === 0) return null
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold">Trust Badges</span>
                  <span className="text-xs text-muted-foreground">({rep.score}/100 reputation)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {rep.badges.map((badgeId) => {
                    const def = BADGE_DEFINITIONS.find((b) => b.id === badgeId)
                    if (!def) return null
                    return (
                      <div key={badgeId} className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium" title={def.description}>
                        <span>{def.icon}</span> {def.label}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })()}

      {/* Demand signal */}
      {pro && requests && (() => {
        const companyRequests = requests.filter((r) => {
          const proUser = app?.professionals?.find((p) => p.id === r.professionalId)
          return proUser?.company === pro.company && (r.status === 'requested' || r.status === 'under_review')
        }).length
        if (companyRequests === 0) return null
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
              <TrendingUp className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">{companyRequests} candidate{companyRequests !== 1 ? 's' : ''}</strong> {companyRequests === 1 ? 'is' : 'are'} looking for referrals at {pro.company} right now
              </span>
            </div>
          </motion.div>
        )
      })()}

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
