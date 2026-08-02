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
import { Skeleton } from '@/components/ui/skeleton'
import { CompanyChip, GAvatar, ReportDialog } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import NotFound from '@/pages/NotFound'

export default function ProfessionalPublic() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { visibleProfessionals: professionals, student, bookmarks, toggleBookmark, requests } = useApp()
  const loading = usePageLoading(400)
  const p = professionals.find((x) => x.id === id)

  if (loading && p) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Skeleton className="h-32 w-full rounded-none sm:h-40" />
          <div className="relative px-6 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <Skeleton className="relative -mt-12 h-24 w-24 rounded-full border-4 border-card sm:-mt-14 sm:h-28 sm:w-28" />
                <div className="space-y-2 pb-1">
                  <Skeleton className="h-7 w-48 rounded-md" />
                  <Skeleton className="h-4 w-56 rounded-md" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-36 rounded-full" />
                <Skeleton className="h-9 w-28 rounded-full" />
              </div>
            </div>
            <div className="mt-5 flex gap-4">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3 items-stretch">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <Skeleton className="h-5 w-36 rounded-md" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-24 rounded-full" />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <Skeleton className="h-5 w-32 rounded-md" />
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-2.5 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <Skeleton className="h-5 w-32 rounded-md" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-16 rounded-md" />
                    <Skeleton className="h-4 w-32 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!p) return <NotFound />
  const saved = bookmarks.includes(p.id)
  const hasAcceptedReferral = requests.some(
    (r) => r.professionalId === p.id && r.student === student.name && (r.status === 'accepted' || r.status === 'offered')
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to search
        </Button>
      </div>

      {/* Hero card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className={`h-32 bg-gradient-to-r ${p.gradient} relative sm:h-40`}>
            <div className="bg-grid absolute inset-0 opacity-20" />
          </div>
          <CardContent className="relative px-6 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="-mt-12 sm:-mt-14">
                  <GAvatar name={p.name} gradient={p.gradient} className="h-24 w-24 border-4 border-card text-2xl sm:h-28 sm:w-28" />
                </div>
                <div className="pb-1">
                  <h1 className="font-display flex items-center gap-2 text-2xl font-bold">
                    {p.name} {p.verified && <BadgeCheck className="h-5.5 w-5.5 text-sky-500" />}
                  </h1>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <span>{p.designation}</span><span>·</span>
                    <span className="flex items-center gap-1.5"><CompanyChip name={p.company} className="h-5 w-5 text-[8px]" />{p.company}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 sm:pb-1">
                <Button
                  className="rounded-full bg-primary shadow-glow"
                  disabled={!p.openForReferrals}
                  asChild={p.openForReferrals}
                >
                  {p.openForReferrals
                    ? <Link to={`/request-referral/${p.id}`}><Send className="mr-1.5 h-4 w-4" /> Request Referral</Link>
                    : <span>At capacity</span>}
                </Button>
                <Button variant="outline" className="rounded-full" onClick={() => navigate('/messages')}><MessageSquare className="mr-1.5 h-4 w-4" /> Message</Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => { toggleBookmark(p.id); toast(saved ? 'Removed from bookmarks' : 'Saved to bookmarks') }}>
                  {saved ? <BookmarkCheck className="h-4.5 w-4.5 text-primary" /> : <Bookmark className="h-4.5 w-4.5" />}
                </Button>
                <ReportDialog targetUserId={p.id} targetUserName={p.name} />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {p.location}</span>
              <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {p.yearsExp} years experience</span>
              {p.linkedinUrl ? (
                <a href={p.linkedinUrl.startsWith('http') ? p.linkedinUrl : `https://linkedin.com/in/${p.linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline transition-colors"><Linkedin className="h-4 w-4" /> LinkedIn</a>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground/50"><Linkedin className="h-4 w-4" /> LinkedIn</span>
              )}
              {p.githubUrl ? (
                <a href={p.githubUrl.startsWith('http') ? p.githubUrl : `https://github.com/${p.githubUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline transition-colors"><Globe className="h-4 w-4" /> Portfolio</a>
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
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{p.bio}</p>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="shadow-soft">
            <CardContent className="p-6">
              <h2 className="text-base font-semibold">Skills & technologies</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.skills.map((s) => (
                  <span key={s} className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{s}</span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Openings */}
          {p.openPositions.length > 0 && (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <h2 className="text-base font-semibold">Current openings</h2>
                <div className="mt-3 space-y-2.5">
                  {p.openPositions.map((o, i) => (
                    <div key={o} className="flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:border-primary/20">
                      <div className="flex items-center gap-3">
                        <CompanyChip name={p.company} className="h-9 w-9 rounded-lg text-xs" />
                        <div>
                          <div className="text-sm font-semibold">{o}</div>
                          <div className="text-xs text-muted-foreground">{p.location} · Full-time</div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.max(0, (p.referralsCompleted - i * 3) % 15 + 5)} referred</span>
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
                  <div className="text-sm font-medium">{p.referralDuration}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {p.openForReferrals
                      ? `${p.maxPerMonth - p.usedThisMonth} of ${p.maxPerMonth} slots remaining`
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
                <span className="font-semibold">{p.usedThisMonth} / {p.maxPerMonth}</span>
              </div>
              <Progress value={(p.usedThisMonth / p.maxPerMonth) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {p.openForReferrals
                  ? `${p.maxPerMonth - p.usedThisMonth} referral slots remaining — requests are reviewed in the order received.`
                  : 'Fully booked for this month. Check back later or send a message.'}
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0 text-primary" /> Typically replies {p.avgReplyHours <= 8 ? 'same day' : p.avgReplyHours <= 16 ? 'within a day' : 'within 2 days'}
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
                      <div className="text-sm font-medium">{p.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">WhatsApp</div>
                      <div className="text-sm font-medium">{p.whatsapp}</div>
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
                      <div className="text-sm font-medium">{p.email}</div>
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
  )
}
