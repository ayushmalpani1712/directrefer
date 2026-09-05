import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Briefcase, Clock, ExternalLink, GraduationCap,
  Globe, Github, MapPin, MessageSquare, Send, Sparkles, Star, Trophy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { SkeletonCard } from '@/components/ui/skeleton'
import { GAvatar, Chip } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import { supabase } from '@/lib/supabase'
import { GRADIENTS, getMessagesPath } from '@/data/mock'
import { getBannerStyle, getProfileTheme } from '@/lib/utils'
import NotFound from '@/pages/NotFound'

interface PublicJobSeeker {
  id: string; slug?: string; name: string; headline: string; location: string
  openToWork: boolean; gradient: string; skills: string[]
  experienceYears: number; preferredRole: string
  experience: { title: string; org: string; period: string; desc: string }[]
  education: { school: string; degree: string; period: string; detail: string }[]
  projects: { name: string; desc: string; tags: string[] }[]
  certifications: string[]; achievements: string[]
  links: { linkedin: string; github: string; website: string }
  noticePeriod?: string; workPreference?: string; whyFit?: string
}

async function resolveUserId(paramId: string): Promise<string | null> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (UUID_RE.test(paramId)) return paramId
  const { data } = await supabase.from('users').select('id').eq('slug', paramId).single()
  if (data?.id) return data.id
  const { data: fallback } = await supabase.from('users').select('id').ilike('slug', `%/${paramId}`).single()
  return fallback?.id ?? null
}

export default function JobSeekerPublic() {
  const { id: paramId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addRequest, visibleProfessionals: professionals, startConversation, role } = useApp()
  const loading = usePageLoading(400)
  const [seeker, setSeeker] = useState<PublicJobSeeker | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [bannerTheme, setBannerTheme] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!paramId) return
    const fetchSeeker = async () => {
      setLoadingData(true)
      try {
        const userId = await resolveUserId(paramId)
        if (!userId) { setLoadingData(false); return }
        setUserId(userId)
        const { data: profileData } = await supabase
          .from('profiles_job_seeker')
          .select('*')
          .eq('user_id', userId)
          .single()
        if (!profileData) { setLoadingData(false); return }

        const { data: userData } = await supabase
          .from('users')
          .select('full_name, city, state, country, slug, banner_theme')
          .eq('id', userId)
          .single()

        const safeJson = <T,>(val: unknown): T[] => {
          if (Array.isArray(val)) return val as T[]
          if (typeof val === 'string') { try { return JSON.parse(val) as T[] } catch { return [] } }
          return []
        }

        const city = userData?.city ?? ''
        const state = userData?.state ?? ''
        const locationParts = [city, state].filter(Boolean)
        const gradientIndex = userId ? userId.charCodeAt(0) % GRADIENTS.length : 0
        setBannerTheme(userData?.banner_theme ?? null)

        setSeeker({
          id: userId,
          slug: userData?.slug || undefined,
          name: userData?.full_name || 'Job Seeker',
          headline: profileData.headline || profileData.preferred_role || 'Job Seeker',
          location: locationParts.join(', ') || 'Remote',
          openToWork: profileData.is_open_to_work ?? false,
          gradient: GRADIENTS[gradientIndex],
          skills: Array.isArray(profileData.skills) ? profileData.skills : [],
          experienceYears: profileData.experience_years ?? 0,
          preferredRole: profileData.preferred_role || '',
          experience: safeJson<{ title: string; org: string; period: string; desc: string }>(profileData.experience),
          education: safeJson<{ school: string; degree: string; period: string; detail: string }>(profileData.education),
          projects: safeJson<{ name: string; desc: string; tags: string[] }>(profileData.projects),
          certifications: Array.isArray(profileData.certifications) ? profileData.certifications : safeJson(profileData.certifications),
          achievements: Array.isArray(profileData.achievements) ? profileData.achievements : safeJson(profileData.achievements),
          links: {
            linkedin: profileData.portfolio_url || profileData.linkedin_url || '',
            github: profileData.github_url || '',
            website: profileData.website || '',
          },
          noticePeriod: profileData.notice_period || undefined,
          workPreference: profileData.work_preference || undefined,
          whyFit: profileData.why_me || undefined,
        })
      } catch {
        setSeeker(null)
      }
      setLoadingData(false)
    }
    fetchSeeker()
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

  if (!seeker) return <NotFound />

  const isOwnProfile = user?.id === seeker.id

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
              <div className="relative h-32 sm:h-40" style={bs.style}>
                <div className="bg-grid absolute inset-0 opacity-20" />
              </div>
            ) })()}
            <CardContent className="relative px-6 pb-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  <div className="-mt-12 sm:-mt-14">
                    <GAvatar name={seeker.name} gradient={seeker.gradient} color={getProfileTheme(bannerTheme).avatar} className="h-24 w-24 border-4 border-card text-2xl sm:h-28 sm:w-28" />
                  </div>
                  <div className="pb-1">
                    <h1 className="font-display text-2xl font-bold tracking-tight">{seeker.name}</h1>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      <span>{seeker.headline}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {seeker.location}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {seeker.openToWork && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Open to work
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                        <Briefcase className="h-3 w-3" /> {seeker.experienceYears}y experience
                      </span>
                      {seeker.noticePeriod && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {seeker.noticePeriod}
                        </span>
                      )}
                      {seeker.workPreference && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                          <Briefcase className="h-3 w-3" /> {seeker.workPreference}
                        </span>
                      )}
                    </div>
                    {seeker.whyFit && (
                      <p className="mt-3 max-w-xl rounded-xl border border-primary/20 bg-primary/[0.03] px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                        <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-primary" /> {seeker.whyFit}
                      </p>
                    )}
                  </div>
                </div>
                {!isOwnProfile && (
                  <div className="flex gap-2 sm:pb-1">
                    <Button className="rounded-full bg-primary shadow-glow" onClick={() => {
                      const pro = professionals?.find((p) => p.id === user?.id)
                      if (!pro) return
                      addRequest({
                        id: `r${crypto.randomUUID()}`,
                        student: seeker.name,
                        studentEmail: user?.email,
                        requesterId: user?.id,
                        professionalId: pro.id,
                        role: seeker.preferredRole || 'Referral',
                        status: 'requested',
                        pipelineStage: 'requested',
                        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                        note: `Referral request for ${seeker.name} — ${seeker.headline}`,
                        progress: 15,
                      })
                    }}>
                      <Send className="mr-1.5 h-4 w-4" /> Request Referral
                    </Button>
                    <Button variant="outline" className="rounded-full" onClick={async () => {
                      const convId = await startConversation(seeker.id)
                      if (convId) navigate(`${getMessagesPath(role)}?conversation=${convId}`)
                    }}>
                      <MessageSquare className="mr-1.5 h-4 w-4" /> Message
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Row 1: Skills + Education */}
          {seeker.skills.length > 0 && (
            <Card className="lg:col-span-2 shadow-soft">
              <CardContent className="p-6">
                <h3 className="mb-3 text-sm font-semibold">Skills</h3>
                <div className="flex flex-wrap gap-2">{seeker.skills.map((s) => <Chip key={s}>{s}</Chip>)}</div>
              </CardContent>
            </Card>
          )}
          {seeker.education.length > 0 && (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><GraduationCap className="h-4 w-4 text-primary" /> Education</h3>
                <div className="space-y-3">
                  {seeker.education.map((e, i) => (
                    <div key={i}>
                      <div className="text-[14px] font-medium">{e.school}</div>
                      <div className="text-[13px] text-muted-foreground">{e.degree} · {e.period}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Row 2: Experience + Certifications */}
          {(() => {
            const validExp = seeker.experience.filter((e) => (e.title && e.title.trim() && e.title.trim() !== '.') || (e.org && e.org.trim() && e.org.trim() !== '.'))
            return validExp.length > 0 && (
              <Card className="lg:col-span-2 shadow-soft">
                <CardContent className="p-6">
                  <h3 className="mb-3 text-sm font-semibold">Experience</h3>
                  <div className="space-y-4">
                    {validExp.map((e, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <div>
                          {e.title && e.title.trim() && e.title.trim() !== '.' && <div className="text-[14px] font-medium">{e.title}</div>}
                          <div className="text-[13px] text-muted-foreground">
                            {e.org && e.org.trim() && e.org.trim() !== '.' ? e.org : ''}
                            {e.org && e.org.trim() && e.org.trim() !== '.' && e.period ? ' · ' : ''}
                            {e.period && e.period.trim() ? e.period.trim() : 'Present'}
                          </div>
                          {e.desc && <p className="mt-1 text-[13px] text-muted-foreground">{e.desc}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })()}
          {seeker.certifications.length > 0 && (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Star className="h-4 w-4 text-amber-400" /> Certifications</h3>
                <ul className="space-y-1.5 text-[13px] text-muted-foreground">
                  {seeker.certifications.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Row 3: Projects + Achievements/Links */}
          {seeker.projects.length > 0 && (
            <Card className="lg:col-span-2 shadow-soft">
              <CardContent className="p-6">
                <h3 className="mb-3 text-sm font-semibold">Projects</h3>
                <div className="space-y-4">
                  {seeker.projects.map((p, i) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <div className="text-[14px] font-medium">{p.name}</div>
                      <p className="mt-1 text-[13px] text-muted-foreground">{p.desc}</p>
                      {p.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">{p.tags.map((t) => <Chip key={t}>{t}</Chip>)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {(seeker.achievements.length > 0 || seeker.links.linkedin || seeker.links.github || seeker.links.website) && (
            <div className="space-y-6">
              {seeker.achievements.length > 0 && (
                <Card className="shadow-soft">
                  <CardContent className="p-6">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Trophy className="h-4 w-4 text-primary" /> Achievements</h3>
                    <ul className="space-y-1.5 text-[13px] text-muted-foreground">
                      {seeker.achievements.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {(seeker.links.linkedin || seeker.links.github || seeker.links.website) && (
                <Card className="shadow-soft">
                  <CardContent className="p-6">
                    <h3 className="mb-3 text-sm font-semibold">Links</h3>
                    <div className="space-y-2">
                      {seeker.links.linkedin && (
                        <a href={seeker.links.linkedin.startsWith('http') ? seeker.links.linkedin : `https://${seeker.links.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-primary hover:underline">
                          <ExternalLink className="h-3.5 w-3.5" /> LinkedIn
                        </a>
                      )}
                      {seeker.links.github && (
                        <a href={seeker.links.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-primary hover:underline">
                          <Github className="h-3.5 w-3.5" /> GitHub
                        </a>
                      )}
                      {seeker.links.website && (
                        <a href={seeker.links.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-primary hover:underline">
                          <Globe className="h-3.5 w-3.5" /> Website
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
