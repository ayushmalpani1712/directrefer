import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, Check, Github, GraduationCap, Linkedin, MapPin, Pencil, Plus,
  ShieldCheck, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Chip, CompanyChip, GAvatar } from '@/components/ui-kit'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import type { Professional } from '@/data/mock'
import { cn } from '@/lib/utils'
import { ProfileSkeleton } from '@/components/ui/skeleton'

export default function ProfessionalProfile() {
  const { professionals, updateProfessional, student, toggleProfessionalOpenForReferrals, toggleProfessionalOpenToWork } = useApp()
  const { user } = useAuth()
  const loading = usePageLoading(450)
  const fallback: Professional = {
    id: user?.id ?? '',
    name: student.name || (user?.email?.split('@')[0] ?? 'User'),
    designation: 'Professional',
    company: '',
    industry: '',
    location: '',
    yearsExp: 0,
    skills: [],
    responseRate: 0,
    avgReplyHours: 0,
    referralsCompleted: 0,
    rating: 0,
    reviews: 0,
    verified: false,
    openForReferrals: true,
    isOpenToWork: false,
    maxPerMonth: 5,
    usedThisMonth: 0,
    successRate: 0,
    followers: 0,
    joinedDaysAgo: 0,
    activityScore: 0,
    referralPolicy: '',
    openPositions: [],
    bio: '',
    badges: [],
    gradient: 'from-[#4F7CFF] to-[#7C5CFF]',
    phone: '',
    whatsapp: '',
    email: user?.email ?? '',
    hiringTimeline: [],
    referralDuration: '',
    linkedinUrl: '',
    githubUrl: '',
  }

  const ME = professionals.find((p) => p.id === user?.id) ?? fallback

  const [open, setOpen] = useState(ME.openForReferrals)
  const [isOpenToWork, setIsOpenToWork] = useState(ME.isOpenToWork)
  const [capacity, setCapacity] = useState(ME.maxPerMonth)
  const [editingHeader, setEditingHeader] = useState(false)
  const [editingAbout, setEditingAbout] = useState(false)
  const [bio, setBio] = useState(ME.bio)
  const [referralPolicy, setReferralPolicy] = useState(ME.referralPolicy)
  const [editName, setEditName] = useState(ME.name)
  const [editDesignation, setEditDesignation] = useState(ME.designation)
  const [editCompany, setEditCompany] = useState(ME.company)
  const [editLocation, setEditLocation] = useState(ME.location)
  const [editIndustry, setEditIndustry] = useState(ME.industry)
  const [editCollege, setEditCollege] = useState(ME.college ?? '')
  const [linkedinUrl, setLinkedinUrl] = useState(ME.linkedinUrl)
  const [githubUrl, setGithubUrl] = useState(ME.githubUrl)
  const [newPosition, setNewPosition] = useState('')
  const [showPositionInput, setShowPositionInput] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [showSkillInput, setShowSkillInput] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: 'skill' | 'position'; value: string }>({ open: false, type: 'skill', value: '' })
  const [editingPosition, setEditingPosition] = useState<string | null>(null)
  const [editingPositionValue, setEditingPositionValue] = useState('')
  const capacityRef = useRef(ME.maxPerMonth)

  // Sync local state when ME changes (DB data loads)
  useEffect(() => {
    setOpen((prev) => prev === ME.openForReferrals ? prev : ME.openForReferrals)
    setIsOpenToWork((prev) => prev === ME.isOpenToWork ? prev : ME.isOpenToWork)
    setCapacity((prev) => prev === ME.maxPerMonth ? prev : ME.maxPerMonth)
    setBio((prev) => prev === ME.bio ? prev : ME.bio)
    setReferralPolicy((prev) => prev === ME.referralPolicy ? prev : ME.referralPolicy)
    setEditName((prev) => prev === ME.name ? prev : ME.name)
    setEditDesignation((prev) => prev === ME.designation ? prev : ME.designation)
    setEditCompany((prev) => prev === ME.company ? prev : ME.company)
    setEditLocation((prev) => prev === ME.location ? prev : ME.location)
    setEditIndustry((prev) => prev === ME.industry ? prev : ME.industry)
    setEditCollege((prev) => prev === (ME.college ?? '') ? prev : (ME.college ?? ''))
    setLinkedinUrl((prev) => prev === ME.linkedinUrl ? prev : ME.linkedinUrl)
    setGithubUrl((prev) => prev === ME.githubUrl ? prev : ME.githubUrl)
    capacityRef.current = ME.maxPerMonth
  }, [ME.openForReferrals, ME.isOpenToWork, ME.maxPerMonth, ME.bio, ME.referralPolicy, ME.name, ME.designation, ME.company, ME.location, ME.industry, ME.college, ME.linkedinUrl, ME.githubUrl])

  if (loading) {
    return (
      <ProfileSkeleton />
    )
  }

  const p = ME

  return (
    <div className="space-y-6">


      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden glass-card">
          <div className="relative h-32 sm:h-44 md:h-52 overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse 80% 60% at 20% 40%, #3B5FE5cc 0%, transparent 60%),
                  radial-gradient(ellipse 70% 50% at 80% 30%, #8B8FD4aa 0%, transparent 55%),
                  radial-gradient(ellipse 50% 80% at 50% 80%, #3B5FE544 0%, transparent 50%),
                  radial-gradient(ellipse 90% 40% at 60% 10%, #8B8FD466 0%, transparent 45%),
                  linear-gradient(135deg, #3B5FE5 0%, #8B8FD4 100%)
                `,
              }}
            />
            <div className="bg-grid absolute inset-0 opacity-15" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card/80" />
          </div>
          <CardContent className="relative px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="relative -mt-12 sm:-mt-14 md:-mt-18">
                  <div className="rounded-full p-[3px] bg-gradient-to-br from-[#3B5FE5] via-[#8B8FD4] to-[#3B5FE5] shadow-glow">
                    <GAvatar name={p.name} gradient={p.gradient} className="h-22 w-22 border-[3px] border-card text-xl sm:h-26 sm:w-26 sm:text-2xl md:h-34 md:w-34 md:text-3xl" />
                  </div>
                </div>
                <div className="pb-1">
                  <h1 className="font-display flex items-center gap-2 text-xl sm:text-2xl font-bold tracking-tight">
                    {editingHeader ? (
                      <input className="w-full bg-transparent border-b border-primary outline-none text-xl sm:text-2xl font-bold placeholder:text-muted-foreground/30" placeholder="Your full name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    ) : (
                      p.name
                    )}
                  </h1>
                  {editingHeader ? (
                    <div className="mt-0.5 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-2">
                      <input className="bg-transparent border-b border-muted-foreground/30 outline-none text-sm text-muted-foreground placeholder:text-muted-foreground/40" placeholder="Professional title" value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} />
                      <span className="hidden sm:inline">at</span>
                      <input className="bg-transparent border-b border-muted-foreground/30 outline-none text-sm text-muted-foreground placeholder:text-muted-foreground/40" placeholder="Company" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} />
                    </div>
                  ) : (
                    <div className="mt-0.5 text-sm text-muted-foreground">{p.designation} at <CompanyChip name={p.company} className="h-5 w-5 text-[8px]" /> {p.company}</div>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {editingHeader ? (
                      <>
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> <input className="bg-transparent border-b border-muted-foreground/30 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40" placeholder="e.g. Pune, India" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} /></span>
                        <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> <input className="bg-transparent border-b border-muted-foreground/30 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40" placeholder="e.g. Technology" value={editIndustry} onChange={(e) => setEditIndustry(e.target.value)} /></span>
                        <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> <input className="bg-transparent border-b border-muted-foreground/30 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40" placeholder="College (for affinity matching)" value={editCollege} onChange={(e) => setEditCollege(e.target.value)} /></span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {p.location}</span>
                        <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {p.industry}</span>
                        {p.college && <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {p.college}</span>}
                      </>
                    )}
                  </div>
                  {editingHeader && (
                    <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                      <div className="flex items-center gap-2">
                        <Linkedin className="h-3.5 w-3.5 text-[#0A66C2] shrink-0" />
                        <input className="w-full sm:w-56 bg-transparent border-b border-muted-foreground/30 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40" placeholder="linkedin.com/in/yourname" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Github className="h-3.5 w-3.5 shrink-0" />
                        <input className="w-full sm:w-56 bg-transparent border-b border-muted-foreground/30 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40" placeholder="github.com/yourname" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 sm:pb-1">
                {editingHeader ? (
                  <>
                    <Button variant="outline" className="rounded-full" onClick={() => {
                      setEditName(ME.name)
                      setEditDesignation(ME.designation)
                      setEditCompany(ME.company)
                      setEditLocation(ME.location)
                      setEditIndustry(ME.industry)
                      setEditCollege(ME.college ?? '')
                      setLinkedinUrl(ME.linkedinUrl)
                      setGithubUrl(ME.githubUrl)
                      setEditingHeader(false)
                    }}><X className="mr-1.5 h-4 w-4" /> Cancel</Button>
                    <Button className="rounded-full bg-gradient-to-r from-[#3B5FE5] to-[#8B8FD4] text-white shadow-glow hover:opacity-90" onClick={() => {
                      updateProfessional(ME.id, {
                        name: editName,
                        designation: editDesignation,
                        company: editCompany,
                        location: editLocation,
                        industry: editIndustry,
                        college: editCollege.trim() || undefined,
                        linkedinUrl,
                        githubUrl,
                      })
                      setEditingHeader(false)
                      toast.success('Profile saved')
                    }}><Check className="mr-1.5 h-4 w-4" /> Save</Button>
                  </>
                ) : (
                  <Button className="rounded-full bg-gradient-to-r from-[#3B5FE5] to-[#8B8FD4] text-white shadow-glow hover:opacity-90" onClick={() => setEditingHeader(true)}>
                    <Pencil className="mr-1.5 h-4 w-4" /> Edit profile
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-4">
                <div className="glass-card rounded-xl px-3 py-2 text-center badge-shine min-w-[90px]">
                  <div className="text-base font-bold text-gradient">{p.referralsCompleted}</div>
                  <div className="text-[10px] text-muted-foreground">Referrals done</div>
                </div>
                <div className="glass-card rounded-xl px-3 py-2 text-center badge-shine min-w-[72px]">
                  <div className="text-base font-bold text-gradient">{p.rating > 0 ? p.rating.toFixed(1) : '—'}</div>
                  <div className="text-[10px] text-muted-foreground">Rating</div>
                </div>
                <div className="glass-card rounded-xl px-3 py-2 text-center badge-shine min-w-[80px]">
                  <div className="text-base font-bold text-gradient">{p.responseRate}%</div>
                  <div className="text-[10px] text-muted-foreground">Response</div>
                </div>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div
                role="presentation"
                className={cn(
                  'flex items-center gap-2.5 rounded-full border px-4 py-2 transition-colors',
                  open
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-border bg-transparent'
                )}
              >
                <Switch checked={open} onCheckedChange={async (v) => { setOpen(v); const ok = await toggleProfessionalOpenForReferrals(v); if (ok) toast.success(v ? 'Now accepting referral requests' : 'Referral requests paused') }} />
                <span className={cn(
                  'text-sm font-medium',
                  open
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
                )}>Open for referrals</span>
              </div>
              <div
                role="presentation"
                className={cn(
                  'flex items-center gap-2.5 rounded-full border px-4 py-2 transition-colors',
                  isOpenToWork
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-border bg-transparent'
                )}
              >
                <Switch
                  checked={isOpenToWork}
                  onCheckedChange={async (v) => { setIsOpenToWork(v); const ok = await toggleProfessionalOpenToWork(v); if (ok) toast.success(v ? 'You are now visible to recruiters' : 'Profile hidden from recruiters') }}
                />
                <span className={cn(
                  'text-sm font-medium',
                  isOpenToWork
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
                )}>Open to work</span>
              </div>
              {p.linkedinUrl ? (
                <a href={p.linkedinUrl.startsWith('http') ? p.linkedinUrl : `https://linkedin.com/in/${p.linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"><Linkedin className="h-4 w-4 text-[#0A66C2]" /> LinkedIn</a>
              ) : (
                <button type="button" onClick={() => { setEditName(ME.name); setEditDesignation(ME.designation); setEditCompany(ME.company); setEditLocation(ME.location); setEditIndustry(ME.industry); setLinkedinUrl(ME.linkedinUrl); setGithubUrl(ME.githubUrl); setEditingHeader(true) }} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 bg-background px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"><Linkedin className="h-4 w-4" /> Add LinkedIn</button>
              )}
              {p.githubUrl ? (
                <a href={p.githubUrl.startsWith('http') ? p.githubUrl : `https://github.com/${p.githubUrl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"><Github className="h-4 w-4" /> GitHub</a>
              ) : (
                <button type="button" onClick={() => { setEditName(ME.name); setEditDesignation(ME.designation); setEditCompany(ME.company); setEditLocation(ME.location); setEditIndustry(ME.industry); setLinkedinUrl(ME.linkedinUrl); setGithubUrl(ME.githubUrl); setEditingHeader(true) }} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 bg-background px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"><Github className="h-4 w-4" /> Add GitHub</button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3 items-stretch">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* About */}
          <Card className="shadow-soft">
            <CardHeader className="">
              <CardTitle className="text-base">About</CardTitle>
              {!editingAbout && <Button data-slot="card-action" variant="ghost" size="sm" className="h-8 text-primary" onClick={() => { setBio(ME.bio); setEditingAbout(true) }}><Pencil className="h-3.5 w-3.5" /></Button>}
            </CardHeader>
            <CardContent className="pt-0">
              {editingAbout ? (
                <div className="space-y-3">
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="resize-none text-sm leading-relaxed" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setBio(ME.bio); setEditingAbout(false) }}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
                    <Button size="sm" className="rounded-full bg-primary shadow-glow" onClick={() => { updateProfessional(ME.id, { bio }); setEditingAbout(false); toast.success('About section saved') }}><Check className="mr-1 h-3.5 w-3.5" /> Save</Button>
                  </div>
                </div>
              ) : (
                <p className="min-h-[2.5rem] text-sm leading-relaxed text-muted-foreground">{p.bio}</p>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Years of experience', value: `${p.yearsExp} yrs` },
                  { label: 'Industry', value: p.industry },
                ].map((x) => (
                  <div key={x.label} className="rounded-xl bg-muted/50 p-3.5 text-center">
                    <div className="text-lg font-bold">{x.value}</div>
                    <div className="text-xs text-muted-foreground">{x.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Referral settings */}
          <Card className="shadow-soft border-primary/25">
            <CardHeader className=""><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" /> Referral settings</CardTitle></CardHeader>
            <CardContent className="space-y-5 pt-0">
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="text-sm font-semibold">Open for referrals</div>
                  <div className="text-xs text-muted-foreground">You'll appear in student search results</div>
                </div>
                <Switch checked={open} onCheckedChange={async (v) => { setOpen(v); const ok = await toggleProfessionalOpenForReferrals(v); if (ok) toast.success(v ? 'Now accepting referral requests' : 'Referral requests paused') }} />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Max referrals per month</span>
                  <span className="font-bold text-primary">{capacity}</span>
                </div>
                <Slider value={[capacity]} min={1} max={20} step={1} onValueChange={([v]) => { setCapacity(v); capacityRef.current = v }} className="mt-2.5" onValueCommit={() => { updateProfessional(ME.id, { maxPerMonth: capacityRef.current }); toast.success(`Capacity set to ${capacityRef.current}/month`) }} />
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-medium">Your referral policy</div>
                <Textarea value={referralPolicy} onChange={(e) => setReferralPolicy(e.target.value)} rows={3} className="resize-none" onBlur={() => { try { updateProfessional(ME.id, { referralPolicy }); toast.success('Policy saved') } catch { toast.error('Failed to save policy') } }} />
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-medium">Available positions</div>
                <div className="flex flex-wrap gap-2">
                  {p.openPositions.map((o) => (
                    editingPosition === o ? (
                      <div key={o} className="flex items-center gap-1">
                        <input
                          value={editingPositionValue}
                          onChange={(e) => setEditingPositionValue(e.target.value)}
                          placeholder="Position title"
                          className="h-7 w-full sm:w-40 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editingPositionValue.trim()) {
                              const updated = p.openPositions.map((pos) => pos === o ? editingPositionValue.trim() : pos)
                              updateProfessional(ME.id, { openPositions: updated })
                              setEditingPosition(null)
                              setEditingPositionValue('')
                              toast.success('Position updated')
                            }
                            if (e.key === 'Escape') {
                              setEditingPosition(null)
                              setEditingPositionValue('')
                            }
                          }}
                        />
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingPosition(null); setEditingPositionValue('') }}>Cancel</Button>
                      </div>
                    ) : (
                      <div key={o} className="inline-flex items-center gap-1">
                        <Chip tone="primary">{o}</Chip>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setEditingPosition(o); setEditingPositionValue(o) }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setDeleteConfirm({ open: true, type: 'position', value: o })}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  ))}
                  {showPositionInput ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={newPosition}
                        onChange={(e) => setNewPosition(e.target.value)}
                        placeholder="Position title"
                        className="h-7 w-full sm:w-40 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newPosition.trim()) {
                            updateProfessional(ME.id, { openPositions: [...p.openPositions, newPosition.trim()] })
                            setNewPosition('')
                            setShowPositionInput(false)
                            toast.success('Position added')
                          }
                          if (e.key === 'Escape') {
                            setNewPosition('')
                            setShowPositionInput(false)
                          }
                        }}
                      />
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setNewPosition(''); setShowPositionInput(false) }}>Cancel</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={() => setShowPositionInput(true)}><Plus className="mr-1 h-3 w-3" /> Add</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <Card className="shadow-soft">
            <CardHeader className=""><CardTitle className="text-base">Company</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-3">
                <CompanyChip name={p.company} className="h-11 w-11 rounded-xl text-sm" />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold">{p.company}</div>
                  <div className="text-xs text-muted-foreground">{p.industry || 'Employer'}{p.company ? ` · ${p.company}` : ''}</div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {p.openPositions.map((o) => (
                  <div key={o} className="rounded-lg border border-border px-3 py-2.5 text-sm">{o}</div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft flex-1">
            <CardHeader className="">
              <CardTitle className="text-base">Skills & technologies</CardTitle>
              <Button data-slot="card-action" variant="ghost" size="sm" className="h-8 text-primary" onClick={() => setShowSkillInput(true)}><Plus className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {p.skills.map((s) => (
                  <div key={s} className="inline-flex items-center gap-1">
                    <Chip tone="primary">{s}</Chip>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setDeleteConfirm({ open: true, type: 'skill', value: s })}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {showSkillInput && (
                  <div className="flex items-center gap-1">
                    <input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Skill name"
                      className="h-7 w-full sm:w-32 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSkill.trim()) {
                          updateProfessional(ME.id, { skills: [...p.skills, newSkill.trim()] })
                          setNewSkill('')
                          setShowSkillInput(false)
                          toast.success('Skill added')
                        }
                        if (e.key === 'Escape') {
                          setNewSkill('')
                          setShowSkillInput(false)
                        }
                      }}
                    />
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setNewSkill(''); setShowSkillInput(false) }}>Cancel</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm((prev) => ({ ...prev, open }))}
        title={`Remove ${deleteConfirm.type === 'skill' ? 'skill' : 'position'}?`}
        description={`This will remove "${deleteConfirm.value}" from your ${deleteConfirm.type === 'skill' ? 'skills' : 'available positions'}.`}
        confirmLabel="Remove"
        onConfirm={() => {
          if (deleteConfirm.type === 'skill') {
            updateProfessional(ME.id, { skills: p.skills.filter((s) => s !== deleteConfirm.value) })
            toast.success('Skill removed')
          } else {
            updateProfessional(ME.id, { openPositions: p.openPositions.filter((o) => o !== deleteConfirm.value) })
            toast.success('Position removed')
          }
          setDeleteConfirm({ open: false, type: 'skill', value: '' })
        }}
      />
    </div>
  )
}
