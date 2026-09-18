import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Briefcase, Check, Clock, Globe, Heart, Info, Linkedin, MapPin, Pencil, Plus, Trophy, Users, X, Palette,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getBannerStyle } from '@/lib/utils'
import { BannerColorModal } from '@/components/BannerColorModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Chip, CompanyChip } from '@/components/ui-kit'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import { useIsMobile } from '@/hooks/use-mobile'
import { useProfileDraft } from '@/hooks/useProfileDraft'
import { supabase } from '@/lib/supabase'
import { ProfileSkeleton } from '@/components/ui/skeleton'


export default function RecruiterProfile() {
  const { jobs, updateRecruiter, candidates, activity } = useApp()
  const { user } = useAuth()
  const loading = usePageLoading(400)
  const [recruiterCompany, setRecruiterCompany] = useState({ name: '', industry: '', size: '', website: '', linkedin: '', description: '', highlights: [] as string[], hiringStats: { timeToHire: 0, offerAccept: 0, referralShare: 0, activeJobs: jobs.filter((j) => j.stage === 'Active').length }, responseRate: 0, verified: false })
  const c = recruiterCompany
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const profileLoadedRef = useRef(false)
  const [bannerTheme, setBannerTheme] = useState<string | null>(null)
  const [bannerModalOpen, setBannerModalOpen] = useState(false)

  // Load banner theme from DB
  useEffect(() => {
    if (!user?.id) return
    supabase.from('users').select('banner_theme').eq('id', user.id).single()
      .then(({ data }) => setBannerTheme(data?.banner_theme ?? null))
  }, [user?.id])

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
            name: data.company_name ?? prev.name,
            industry: data.hiring_department ?? prev.industry,
            size: data.company_size ?? prev.size,
            website: data.company_website ?? prev.website,
            description: data.company_description ?? prev.description,
            highlights: data.company_highlights ?? prev.highlights,
            hiringStats: {
              timeToHire: data.time_to_hire ?? prev.hiringStats.timeToHire,
              offerAccept: data.offer_accept_rate ?? prev.hiringStats.offerAccept,
              referralShare: data.referral_share ?? prev.hiringStats.referralShare,
              activeJobs: jobs.filter((j) => j.stage === 'Active').length,
            },
          }))
          if (data.company_description) setDescription(data.company_description)
          if (data.company_highlights) setHighlights(data.company_highlights)
          if (Array.isArray(data.benefits) && data.benefits.length > 0) setBenefits(data.benefits)
          if (Array.isArray(data.office_locations) && data.office_locations.length > 0) setLocations(data.office_locations)
        }
      } catch (err) {
        console.error('Failed to load recruiter profile:', err)
        toast.error('Failed to load company profile')
      }
    }
    loadCompany()
  }, [user])

  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState(c.description)
  const [editName, setEditName] = useState(c.name)
  const [editIndustry, setEditIndustry] = useState(c.industry)
  const [editSize, setEditSize] = useState(c.size)
  const [editWebsite, setEditWebsite] = useState(c.website)
  const [editLinkedin, setEditLinkedin] = useState(c.linkedin)
  const [editingCard, setEditingCard] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<string[]>(c.highlights)
  const [editHighlights, setEditHighlights] = useState('')
  const [benefits, setBenefits] = useState<string[]>([])
  const [editBenefits, setEditBenefits] = useState('')
  const [locations, setLocations] = useState<string[]>([])
  const [editLocations, setEditLocations] = useState('')
  const [savingHeader, setSavingHeader] = useState(false)
  const [savingAbout, setSavingAbout] = useState(false)

  const { loadDraft, markSaved, clearDraft } = useProfileDraft(user?.id, {
    name: editName, industry: editIndustry, size: editSize, website: editWebsite, linkedin: editLinkedin,
  })

  useEffect(() => {
    if (!user?.id || editing) return
    loadDraft().then((draft) => {
      if (draft && typeof draft === 'object') {
        if (draft.name) setEditName(String(draft.name))
        if (draft.industry) setEditIndustry(String(draft.industry))
        if (draft.size) setEditSize(String(draft.size))
        if (draft.website) setEditWebsite(String(draft.website))
        if (draft.linkedin) setEditLinkedin(String(draft.linkedin))
        setEditing(true)
      }
    })
  }, [user?.id])

  // Sync local state when DB data loads
  useEffect(() => {
    setEditName((prev) => prev === c.name ? prev : c.name)
    setEditIndustry((prev) => prev === c.industry ? prev : c.industry)
    setEditSize((prev) => prev === c.size ? prev : c.size)
    setEditWebsite((prev) => prev === c.website ? prev : c.website)
    setEditLinkedin((prev) => prev === c.linkedin ? prev : c.linkedin)
    setDescription((prev) => prev === c.description ? prev : c.description)
    setHighlights((prev) => prev === c.highlights ? prev : c.highlights)
  }, [c.name, c.industry, c.size, c.website, c.linkedin, c.description, c.highlights])

  if (loading) {
    return (
      <ProfileSkeleton />
    )
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 h-12">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs font-medium text-primary"
            onClick={() => { setEditName(c.name); setEditIndustry(c.industry); setEditSize(c.size); setEditWebsite(c.website); setEditLinkedin(c.linkedin); setEditing(true) }}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit Profile
          </Button>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative h-32 bg-gradient-to-br from-primary/30 via-card to-card">
            <div className="absolute inset-0 bg-grid opacity-10" />
          </div>

          <div className="px-4 -mt-12 relative z-10">
            <div className="flex items-end gap-3">
              <CompanyChip name={c.name} className="h-20 w-20 border-[3px] border-primary/40 ring-2 ring-primary/10 text-xl shrink-0" />
            </div>
            <div className="mt-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h1
                  className="font-display text-lg font-bold tracking-tight"
                  style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
                >
                  {editing ? (
                    <input
                      className="w-full bg-transparent border-b border-primary outline-none text-lg font-bold placeholder:text-muted-foreground/30"
                      placeholder="Company name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  ) : c.name}
                </h1>
                {c.verified && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
              {editing ? (
                <input
                  className="mt-0.5 w-full bg-transparent border-b border-muted-foreground/30 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40"
                  placeholder="e.g. Technology"
                  value={editIndustry}
                  onChange={(e) => setEditIndustry(e.target.value)}
                />
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground" style={{ overflowWrap: 'break-word' }}>{c.industry}</p>
              )}
            </div>
          </div>

          <div className="px-4 mt-3 flex overflow-x-auto gap-2 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {c.website && (
              <a
                href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted hover:border-primary/30 hover:bg-primary/5 transition-colors shrink-0"
              >
                <Globe className="h-3.5 w-3.5 text-primary" /> Website
              </a>
            )}
            {c.linkedin && (
              <a
                href={c.linkedin.startsWith('http') ? c.linkedin : `https://${c.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted hover:border-primary/30 hover:bg-primary/5 transition-colors shrink-0"
              >
                <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" /> LinkedIn
              </a>
            )}
            {!c.website && !c.linkedin && !editing && (
              <button
                type="button"
                onClick={() => { setEditing(true) }}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors shrink-0"
              >
                <Globe className="h-3.5 w-3.5" /> Add links
              </button>
            )}
          </div>

          {editing && (
            <div className="px-4 mt-3 flex gap-2">
              <Button variant="outline" size="sm" className="rounded-full flex-1" onClick={() => {
                setEditName(c.name); setEditIndustry(c.industry); setEditSize(c.size); setEditWebsite(c.website); setEditLinkedin(c.linkedin); setEditing(false); clearDraft()
              }}>Cancel</Button>
              <Button size="sm" className="rounded-full flex-1" disabled={savingHeader} onClick={async () => {
                setSavingHeader(true)
                try {
                  setRecruiterCompany((prev) => ({ ...prev, name: editName, industry: editIndustry, size: editSize, website: editWebsite, linkedin: editLinkedin, description }))
                  await updateRecruiter({ company_name: editName, hiring_department: editIndustry, company_size: editSize, company_website: editWebsite, company_description: description, company_linkedin: editLinkedin })
                  setEditing(false); markSaved(); toast.success('Profile saved')
                } catch { toast.error('Failed to save. Please try again.') } finally { setSavingHeader(false) }
              }}>Save</Button>
            </div>
          )}
        </motion.div>

        <div className="px-4 mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border p-3">
            <div className="text-xs text-muted-foreground">Team size</div>
            <div className="mt-0.5 text-sm font-bold">{c.size || '—'}</div>
          </div>
          <div className="rounded-xl border border-border p-3">
            <div className="text-xs text-muted-foreground">Active jobs</div>
            <div className="mt-0.5 text-sm font-bold text-primary">{jobs.filter((j) => j.stage === 'Active').length}</div>
          </div>
        </div>

        <div className="px-4 mt-3">
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm font-semibold">Hiring stats</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Response rate</span>
                <span className="font-semibold tabular-nums">{c.responseRate > 0 ? `${c.responseRate}%` : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg. rating</span>
                <span className="font-semibold tabular-nums">{c.hiringStats.offerAccept > 0 ? `${c.hiringStats.offerAccept}%` : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Referral share</span>
                <span className="font-semibold tabular-nums">{c.hiringStats.referralShare > 0 ? `${c.hiringStats.referralShare}%` : '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 mt-3">
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-semibold">Active jobs ({jobs.filter((j) => j.stage === 'Active').length})</span>
              </div>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={() => navigate('/recruiter/jobs')}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2.5">
              {jobs.filter((j) => j.stage === 'Active').map((j) => (
                <div key={j.id} className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:border-primary/30">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{j.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{j.location} · {j.type}</div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-sm font-bold text-primary">{j.applicants}</div>
                    <div className="text-[11px] text-muted-foreground">applied</div>
                  </div>
                </div>
              ))}
              {jobs.filter((j) => j.stage === 'Active').length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No active jobs posted yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 mt-3 pb-6">
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm font-semibold">About {c.name}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed break-words">{description || 'No description added yet.'}</p>
            {highlights.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {highlights.map((h) => <Chip key={h} tone="primary">{h}</Chip>)}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">


      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          {(() => { const bs = getBannerStyle(user?.id, bannerTheme); return (
            <div className="relative h-28 sm:h-36" style={bs.style}>
              <div className="absolute inset-0 bg-grid opacity-10" />
              <button
                type="button"
                onClick={() => setBannerModalOpen(true)}
                className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-black/60"
              >
                <Palette className="h-3.5 w-3.5" />
                Edit Banner
              </button>
            </div>
          ) })()}
          <BannerColorModal
            open={bannerModalOpen}
            onOpenChange={setBannerModalOpen}
            value={bannerTheme}
            onChange={async (g) => { setBannerTheme(g); if (user?.id) await supabase.from('users').update({ banner_theme: g }).eq('id', user.id) }}
          />
          <CardContent className="relative px-4 pb-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="-mt-10 sm:-mt-12">
                  <CompanyChip name={c.name} className="h-16 w-16 rounded-2xl border-4 border-card text-lg sm:h-20 sm:w-20 sm:text-xl" />
                </div>
                <div className="pb-0.5 min-w-0">
                  {editing ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="font-display text-xl sm:text-2xl font-bold bg-transparent border-b border-primary outline-none w-full placeholder:text-muted-foreground/30 tracking-tight"
                      placeholder="Company name"
                    />
                  ) : (
                    <h1 className="font-display text-2xl font-bold tracking-tight truncate">{c.name}</h1>
                  )}
                  {editing ? (
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      <input
                        value={editIndustry}
                        onChange={(e) => setEditIndustry(e.target.value)}
                        className="bg-transparent border-b border-muted-foreground/30 outline-none w-full text-sm placeholder:text-muted-foreground/40"
                        placeholder="e.g. Technology"
                      />
                    </div>
                  ) : (
                    <p className="mt-0.5 text-sm text-muted-foreground">{c.industry}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {editing ? (
                        <select
                          value={editSize}
                          onChange={(e) => setEditSize(e.target.value)}
                          className="bg-transparent border-b border-muted-foreground/30 outline-none text-xs cursor-pointer"
                        >
                          {['1-10', '11-50', '51-200', '201-500', '500-1000', '1000+'].map((s) => (
                            <option key={s} value={s}>{s} employees</option>
                          ))}
                        </select>
                      ) : `${c.size} employees`}
                    </span>
                  </div>
                  {editing && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5 text-primary" />
                        <input
                          value={editWebsite}
                          onChange={(e) => setEditWebsite(e.target.value)}
                          className="bg-transparent border-b border-primary/50 outline-none w-full sm:w-36 text-xs text-primary placeholder:text-muted-foreground/40"
                          placeholder="e.g. acme.com"
                        />
                      </span>
                      <span className="flex items-center gap-1">
                        <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                        <input
                          value={editLinkedin}
                          onChange={(e) => setEditLinkedin(e.target.value)}
                          className="bg-transparent border-b border-[#0A66C2]/50 outline-none w-full sm:w-44 text-xs text-[#0A66C2] placeholder:text-muted-foreground/40"
                          placeholder="e.g. linkedin.com/company/acme"
                        />
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:pb-0.5">
                {editing ? (
                  <>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => {
                      setEditName(c.name)
                      setEditIndustry(c.industry)
                      setEditSize(c.size)
                      setEditWebsite(c.website)
                      setEditLinkedin(c.linkedin)
                      setEditing(false)
                      clearDraft()
                    }}><X className="mr-1.5 h-3.5 w-3.5" /> Cancel</Button>
                    <Button size="sm" className="rounded-full" disabled={savingHeader} onClick={async () => {
                      setSavingHeader(true)
                      try {
                        setRecruiterCompany((prev) => ({
                          ...prev,
                          name: editName,
                          industry: editIndustry,
                          size: editSize,
                          website: editWebsite,
                          linkedin: editLinkedin,
                          description,
                        }))
                        await updateRecruiter({
                          company_name: editName,
                          hiring_department: editIndustry,
                          company_size: editSize,
                          company_website: editWebsite,
                          company_description: description,
                          company_linkedin: editLinkedin,
                        })
                        setEditing(false)
                        markSaved()
                        toast.success('Profile saved')
                      } catch {
                        toast.error('Failed to save. Please try again.')
                      } finally {
                        setSavingHeader(false)
                      }
                    }}><Check className="mr-1.5 h-3.5 w-3.5" /> {savingHeader ? 'Saving...' : 'Save'}</Button>
                  </>
                ) : (
                  <Button size="sm" className="rounded-full" onClick={() => {
                    setEditName(c.name)
                    setEditIndustry(c.industry)
                    setEditSize(c.size)
                    setEditWebsite(c.website)
                    setEditLinkedin(c.linkedin)
                    setEditing(true)
                  }}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit profile</Button>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm">
              <span className="text-muted-foreground"><strong className="text-foreground">{jobs.filter((j) => j.stage === 'Active').length}</strong> jobs posted</span>
              <span className="text-muted-foreground"><strong className="text-foreground">{candidates.filter((c) => c.stage === 'Screened').length}</strong> hires</span>
              <span className="text-muted-foreground"><strong className="text-foreground">{c.size || '—'}</strong> team size</span>
              <div className="h-4 w-px bg-border hidden sm:block" />
              {c.linkedin ? (
                <a href={c.linkedin.startsWith('http') ? c.linkedin : `https://${c.linkedin}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"><Linkedin className="h-4 w-4" /> LinkedIn</a>
              ) : (
                <button type="button" onClick={() => { setEditName(c.name); setEditIndustry(c.industry); setEditSize(c.size); setEditWebsite(c.website); setEditLinkedin(c.linkedin); setEditing(true) }} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 bg-background px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"><Linkedin className="h-4 w-4" /> Add LinkedIn</button>
              )}
              {c.website ? (
                <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"><Globe className="h-4 w-4" /> Website</a>
              ) : (
                <button type="button" onClick={() => { setEditName(c.name); setEditIndustry(c.industry); setEditSize(c.size); setEditWebsite(c.website); setEditLinkedin(c.linkedin); setEditing(true) }} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 bg-background px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"><Globe className="h-4 w-4" /> Add Website</button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3 items-stretch">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><Info className="h-4 w-4 text-primary" /> About {c.name}</CardTitle>
              {editingCard !== 'about' && <Button data-slot="card-action" variant="ghost" size="sm" className="h-8 text-primary" onClick={() => { setEditHighlights(highlights.join(', ')); setEditingCard('about') }}><Pencil className="h-3.5 w-3.5" /></Button>}
            </CardHeader>
            <CardContent className="pt-0">
              {editingCard === 'about' ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Company overview</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm leading-relaxed text-muted-foreground focus:border-primary focus:outline-none"
                      rows={4}
                      placeholder="Tell candidates what your company does, its history, and culture..."
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Highlights</label>
                    <input
                      value={editHighlights}
                      onChange={(e) => setEditHighlights(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none"
                      placeholder="Separate highlights with commas..."
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {editHighlights.split(',').map((h) => h.trim()).filter(Boolean).map((h) => <Chip key={h} tone="primary">{h}</Chip>)}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditingCard(null)}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
                    <Button size="sm" className="rounded-full bg-primary " disabled={savingAbout} onClick={async () => {
                      setSavingAbout(true)
                      try {
                        const parsedHighlights = editHighlights.split(',').map((h) => h.trim()).filter(Boolean)
                        setHighlights(parsedHighlights)
                        setRecruiterCompany((prev) => ({ ...prev, description, highlights: parsedHighlights }))
                        updateRecruiter({ company_description: description, company_highlights: parsedHighlights })
                        setEditingCard(null)
                        toast.success('About section saved')
                      } finally {
                        setSavingAbout(false)
                      }
                    }}><Check className="mr-1 h-3.5 w-3.5" /> {savingAbout ? 'Saving...' : 'Save'}</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                  {highlights.length > 0 && (
                    <div className="flex flex-wrap gap-2">{highlights.map((h) => <Chip key={h} tone="primary">{h}</Chip>)}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><Briefcase className="h-4 w-4 text-primary" /> Open positions ({jobs.filter((j) => j.stage === 'Active').length})</CardTitle>
              <Button data-slot="card-action" variant="ghost" size="sm" className="h-8 text-primary" onClick={() => { toast.success('Opening job creation form — fill in the role details, requirements, and benefits'); navigate('/recruiter/jobs') }}><Plus className="h-3.5 w-3.5" /></Button>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {jobs.filter((j) => j.stage === 'Active').map((j) => (
                <div key={j.id} className="flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
                  <div>
                    <div className="text-sm font-semibold">{j.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{j.location} · {j.type} · {j.salary}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">{j.applicants}</div>
                    <div className="text-[11px] text-muted-foreground">applicants</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><Heart className="h-4 w-4 text-primary" /> Benefits & perks</CardTitle>
              {editingCard !== 'benefits' && <Button data-slot="card-action" variant="ghost" size="sm" className="h-8 text-primary" onClick={() => { setEditBenefits(benefits.join(', ')); setEditingCard('benefits') }}><Pencil className="h-3.5 w-3.5" /></Button>}
            </CardHeader>
            <CardContent className="pt-0">
              {editingCard === 'benefits' ? (
                <div className="space-y-3">
                  <input
                    value={editBenefits}
                    onChange={(e) => setEditBenefits(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none"
                    placeholder="Separate benefits with commas..."
                  />
                  <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    {editBenefits.split(',').map((b) => b.trim()).filter(Boolean).map((b) => <Chip key={b} tone="primary">{b}</Chip>)}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditingCard(null)}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
                    <Button size="sm" className="rounded-full bg-primary " onClick={async () => {
                      const newBenefits = editBenefits.split(',').map((b) => b.trim()).filter(Boolean)
                      const prevBenefits = [...benefits]
                      setBenefits(newBenefits)
                      setEditingCard(null)
                      if (user) {
                        const { error } = await supabase.from('profiles_recruiter').update({ benefits: newBenefits }).eq('user_id', user.id)
                        if (error) { setBenefits(prevBenefits); toast.error('Failed to save benefits'); return }
                      }
                      toast.success('Benefits saved')
                    }}><Check className="mr-1 h-3.5 w-3.5" /> Save</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">{benefits.map((b) => <Chip key={b} tone="primary">{b}</Chip>)}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4 text-primary" /> Office locations</CardTitle>
              {editingCard !== 'locations' && <Button data-slot="card-action" variant="ghost" size="sm" className="h-8 text-primary" onClick={() => { setEditLocations(locations.join(', ')); setEditingCard('locations') }}><Pencil className="h-3.5 w-3.5" /></Button>}
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {editingCard === 'locations' ? (
                <div className="space-y-3">
                  <input
                    value={editLocations}
                    onChange={(e) => setEditLocations(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none"
                    placeholder="Separate locations with commas..."
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {editLocations.split(',').map((l) => l.trim()).filter(Boolean).map((l) => (
                      <span key={l} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {l}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditingCard(null)}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
                    <Button size="sm" className="rounded-full bg-primary " onClick={async () => {
                      const newLocations = editLocations.split(',').map((l) => l.trim()).filter(Boolean)
                      const prevLocations = [...locations]
                      setLocations(newLocations)
                      setEditingCard(null)
                      if (user) {
                        const { error } = await supabase.from('profiles_recruiter').update({ office_locations: newLocations }).eq('user_id', user.id)
                        if (error) { setLocations(prevLocations); toast.error('Failed to save locations'); return }
                      }
                      toast.success('Office locations saved')
                    }}><Check className="mr-1 h-3.5 w-3.5" /> Save</Button>
                  </div>
                </div>
              ) : (
                locations.map((l) => (
                  <div key={l} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" /> {l}</div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-primary" /> Selected candidates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {(() => {
                const selected = candidates.filter((c) => c.stage === 'Screened')
                if (selected.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground py-2">No candidates selected yet.</p>
                  )
                }
                return selected.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-amber-500/30">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-sm font-bold text-white">
                      {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.role}</div>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-500">Selected</span>
                  </div>
                ))
              })()}
            </CardContent>
          </Card>

          <Card className="">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4 text-primary" /> Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No recent activity.</p>
              ) : (
                <div className="space-y-0">
                  {activity.slice(0, 5).map((a) => {
                    const icon = a.kind.includes('referral') ? '🤝' : a.kind.includes('message') ? '💬' : a.kind.includes('job') ? '💼' : '📌'
                    return (
                      <div key={a.id} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0 last:pb-0 first:pt-0">
                        <span className="mt-0.5 text-sm">{icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground leading-snug">{a.text}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{a.time}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
