import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Briefcase, ExternalLink, GraduationCap,
  Globe, Github, MapPin, MessageSquare, Send, Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { GAvatar, Chip } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import { supabase } from '@/lib/supabase'
import { GRADIENTS } from '@/data/mock'
import NotFound from '@/pages/NotFound'

interface PublicJobSeeker {
  id: string; name: string; headline: string; location: string
  openToWork: boolean; gradient: string; skills: string[]
  experienceYears: number; preferredRole: string
  experience: { title: string; org: string; period: string; desc: string }[]
  education: { school: string; degree: string; period: string; detail: string }[]
  projects: { name: string; desc: string; tags: string[] }[]
  certifications: string[]; achievements: string[]
  links: { linkedin: string; github: string; website: string }
}

export default function JobSeekerPublic() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addRequest, visibleProfessionals: professionals } = useApp()
  const loading = usePageLoading(400)
  const [seeker, setSeeker] = useState<PublicJobSeeker | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!id) return
    const fetchSeeker = async () => {
      setLoadingData(true)
      try {
        const { data: profileData } = await supabase
          .from('profiles_job_seeker')
          .select('*')
          .eq('user_id', id)
          .single()
        if (!profileData) { setLoadingData(false); return }

        const { data: userData } = await supabase
          .from('users')
          .select('full_name, city, state, country')
          .eq('id', id)
          .single()

        const safeJson = <T,>(val: unknown): T[] => {
          if (Array.isArray(val)) return val as T[]
          if (typeof val === 'string') { try { return JSON.parse(val) as T[] } catch { return [] } }
          return []
        }

        const city = userData?.city ?? ''
        const state = userData?.state ?? ''
        const locationParts = [city, state].filter(Boolean)

        setSeeker({
          id,
          name: userData?.full_name || 'Job Seeker',
          headline: profileData.headline || profileData.preferred_role || 'Job Seeker',
          location: locationParts.join(', ') || 'Remote',
          openToWork: profileData.is_open_to_work ?? false,
          gradient: GRADIENTS[0],
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
        })
      } catch {
        setSeeker(null)
      }
      setLoadingData(false)
    }
    fetchSeeker()
  }, [id])

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
    )
  }

  if (!seeker) return <NotFound />

  const isOwnProfile = user?.id === seeker.id

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link to="/professional/talent" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to talent search
        </Link>

        {/* Hero card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="relative h-32 bg-gradient-to-r from-[#3B5FE5] to-[#8B8FD4] sm:h-40">
              <div className="bg-grid absolute inset-0 opacity-20" />
            </div>
            <CardContent className="relative px-6 pb-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  <div className="-mt-12 sm:-mt-14">
                    <GAvatar name={seeker.name} gradient={seeker.gradient} className="h-24 w-24 border-4 border-card text-2xl sm:h-28 sm:w-28" />
                  </div>
                  <div className="pb-1">
                    <h1 className="font-display text-2xl font-bold">{seeker.name}</h1>
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
                    </div>
                  </div>
                </div>
                {!isOwnProfile && (
                  <div className="flex gap-2 sm:pb-1">
                    <Button className="rounded-full bg-primary shadow-glow" onClick={() => {
                      const pro = professionals?.find((p) => p.id === user?.id)
                      if (!pro) return
                      addRequest({
                        id: `r${Date.now()}`,
                        student: seeker.name,
                        studentEmail: user?.email,
                        professionalId: pro.id,
                        role: seeker.preferredRole || 'Referral',
                        status: 'pending',
                        pipelineStage: 'request_sent',
                        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                        note: `Referral request for ${seeker.name} — ${seeker.headline}`,
                        progress: 15,
                      })
                    }}>
                      <Send className="mr-1.5 h-4 w-4" /> Request Referral
                    </Button>
                    <Button variant="outline" className="rounded-full" onClick={() => navigate('/messages')}>
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
          <div className="space-y-6 lg:col-span-2">
            {/* Skills */}
            {seeker.skills.length > 0 && (
              <Card className="shadow-soft">
                <CardContent className="p-6">
                  <h3 className="mb-3 text-sm font-semibold">Skills</h3>
                  <div className="flex flex-wrap gap-2">{seeker.skills.map((s) => <Chip key={s}>{s}</Chip>)}</div>
                </CardContent>
              </Card>
            )}

            {/* Experience */}
            {seeker.experience.length > 0 && (
              <Card className="shadow-soft">
                <CardContent className="p-6">
                  <h3 className="mb-3 text-sm font-semibold">Experience</h3>
                  <div className="space-y-4">
                    {seeker.experience.map((e, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <div>
                          <div className="text-[14px] font-medium">{e.title}</div>
                          <div className="text-[13px] text-muted-foreground">{e.org} · {e.period}</div>
                          {e.desc && <p className="mt-1 text-[13px] text-muted-foreground">{e.desc}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Projects */}
            {seeker.projects.length > 0 && (
              <Card className="shadow-soft">
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
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Education */}
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

            {/* Certifications */}
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

            {/* Links */}
            {(seeker.links.linkedin || seeker.links.github || seeker.links.website) && (
              <Card className="shadow-soft">
                <CardContent className="p-6">
                  <h3 className="mb-3 text-sm font-semibold">Links</h3>
                  <div className="space-y-2">
                    {seeker.links.linkedin && (
                      <a href={seeker.links.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-primary hover:underline">
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
        </div>
      </div>
    </div>
  )
}
