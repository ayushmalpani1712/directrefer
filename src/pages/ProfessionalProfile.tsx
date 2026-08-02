import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BadgeCheck, Building2, Camera, Check, Download, Globe, Linkedin, MapPin, Pencil, Plus,
  ShieldCheck, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Chip, CompanyChip, GAvatar } from '@/components/ui-kit'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import type { Professional } from '@/data/mock'

export default function ProfessionalProfile() {
  const { professionals, updateProfessional } = useApp()
  const { user } = useAuth()
  const loading = usePageLoading(450)
  const fallback: Professional = {
    id: user?.id ?? '',
    name: user?.email?.split('@')[0] ?? 'User',
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
    openForReferrals: false,
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

  const ME = professionals.find((p) => p.id === user?.id) ?? professionals[0] ?? fallback

  const [open, setOpen] = useState(ME.openForReferrals)
  const [capacity, setCapacity] = useState(ME.maxPerMonth)
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState(ME.bio)
  const [referralPolicy, setReferralPolicy] = useState(ME.referralPolicy)
  const [editName, setEditName] = useState(ME.name)
  const [editDesignation, setEditDesignation] = useState(ME.designation)
  const [editCompany, setEditCompany] = useState(ME.company)
  const [editLocation, setEditLocation] = useState(ME.location)
  const [editIndustry, setEditIndustry] = useState(ME.industry)
  const [linkedinUrl, setLinkedinUrl] = useState(ME.linkedinUrl)
  const [githubUrl, setGithubUrl] = useState(ME.githubUrl)
  const [newPosition, setNewPosition] = useState('')
  const [showPositionInput, setShowPositionInput] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [showSkillInput, setShowSkillInput] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: 'skill' | 'position'; value: string }>({ open: false, type: 'skill', value: '' })
  const [editingPosition, setEditingPosition] = useState<string | null>(null)
  const [editingPositionValue, setEditingPositionValue] = useState('')
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const capacityRef = useRef(ME.maxPerMonth)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Skeleton className="h-36 w-full rounded-none sm:h-44" />
          <div className="relative px-6 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <Skeleton className="relative -mt-12 h-24 w-24 rounded-full border-4 border-card sm:-mt-16 sm:h-32 sm:w-32" />
                <div className="space-y-2 pb-1">
                  <Skeleton className="h-7 w-48 rounded-md" />
                  <Skeleton className="h-4 w-64 rounded-md" />
                  <Skeleton className="h-3 w-40 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3 items-stretch">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-4 w-48 rounded-md" />
              <Skeleton className="h-2.5 w-full rounded-md" />
            </div>
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <Skeleton className="h-5 w-40 rounded-md" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-24 rounded-full" />
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <Skeleton className="h-5 w-28 rounded-md" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-1.5 w-full rounded-md" />
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <Skeleton className="h-5 w-32 rounded-md" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const p = ME

  return (
    <div className="space-y-6">
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={() => { toast.success('Banner updated') }}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={() => { toast.success('Photo updated') }}
      />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="relative h-36 bg-gradient-to-r from-slate-800 via-[#1a2a5e] to-[#2a2a5e] sm:h-44">
            <div className="bg-dots absolute inset-0 opacity-25" />
            <Button size="sm" variant="secondary" className="absolute bottom-3 right-3 h-8 text-xs" onClick={() => bannerInputRef.current?.click()}><Camera className="mr-1.5 h-3.5 w-3.5" /> Edit banner</Button>
          </div>
          <CardContent className="relative px-6 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="relative -mt-12 sm:-mt-16">
                  <GAvatar name={p.name} gradient={p.gradient} className="h-24 w-24 border-4 border-card text-2xl sm:h-32 sm:w-32 sm:text-3xl" />
                  <button className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground" onClick={() => photoInputRef.current?.click()}>
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="pb-1">
                  <h1 className="font-display flex items-center gap-2 text-2xl font-bold">
                    {editing ? (
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-auto w-full max-w-xs p-0 text-2xl font-bold border-0 border-b-2 rounded-none focus-visible:ring-0" placeholder="Your name" />
                    ) : (
                      <> {p.name} <BadgeCheck className="h-5.5 w-5.5 text-sky-500" /></>
                    )}
                  </h1>
                  <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                    {editing ? (
                      <>
                        <Input value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} className="h-7 w-40 text-sm border-0 border-b rounded-none focus-visible:ring-0" placeholder="Designation" />
                        <span>at</span>
                        <Input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} className="h-7 w-40 text-sm border-0 border-b rounded-none focus-visible:ring-0" placeholder="Company" />
                      </>
                    ) : (
                      <>{p.designation} at <CompanyChip name={p.company} className="h-5 w-5 text-[8px]" /> {p.company}</>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {editing ? (
                      <>
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="h-6 w-32 text-xs border-0 border-b rounded-none focus-visible:ring-0" placeholder="Location" /></span>
                        <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> <Input value={editIndustry} onChange={(e) => setEditIndustry(e.target.value)} className="h-6 w-32 text-xs border-0 border-b rounded-none focus-visible:ring-0" placeholder="Industry" /></span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {p.location}</span>
                        <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {p.industry}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 sm:mb-1">
                <Button variant="outline" className="rounded-full"><Download className="mr-1.5 h-4 w-4" /> Resume</Button>
                {editing ? (
                  <>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => {
                        setBio(ME.bio)
                        setReferralPolicy(ME.referralPolicy)
                        setEditName(ME.name)
                        setEditDesignation(ME.designation)
                        setEditCompany(ME.company)
                        setEditLocation(ME.location)
                        setEditIndustry(ME.industry)
                        setLinkedinUrl(ME.linkedinUrl)
                        setGithubUrl(ME.githubUrl)
                        setEditing(false)
                      }}
                    ><X className="mr-1.5 h-4 w-4" /> Cancel</Button>
                    <Button
                      className="rounded-full bg-primary shadow-glow"
                      onClick={() => {
                        updateProfessional(ME.id, {
                          name: editName,
                          designation: editDesignation,
                          company: editCompany,
                          location: editLocation,
                          industry: editIndustry,
                          bio,
                          referralPolicy,
                          linkedinUrl,
                          githubUrl,
                        })
                        setEditing(false)
                        toast.success('Profile saved')
                      }}
                    ><Check className="mr-1.5 h-4 w-4" /> Save</Button>
                  </>
                ) : (
                  <Button className="rounded-full bg-primary shadow-glow" onClick={() => setEditing(true)}>
                    <Pencil className="mr-1.5 h-4 w-4" /> Edit profile
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="ml-auto flex items-center gap-3 text-sm text-primary">
                {editing ? (
                  <>
                    <div className="flex items-center gap-1">
                      <Linkedin className="h-4 w-4" />
                      <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="e.g. linkedin.com/in/yourname" className="h-7 w-52 text-xs" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="e.g. github.com/yourname" className="h-7 w-52 text-xs" />
                    </div>
                  </>
                ) : (
                  <>
                    <a href={p.linkedinUrl || '#'} target={p.linkedinUrl ? '_blank' : undefined} rel={p.linkedinUrl ? 'noopener noreferrer' : undefined} className={`flex items-center gap-1 ${p.linkedinUrl ? 'hover:underline' : 'opacity-50 cursor-not-allowed'}`} onClick={(e) => { if (!p.linkedinUrl) e.preventDefault() }}><Linkedin className="h-4 w-4" /> LinkedIn</a>
                    <a href={p.githubUrl || '#'} target={p.githubUrl ? '_blank' : undefined} rel={p.githubUrl ? 'noopener noreferrer' : undefined} className={`flex items-center gap-1 ${p.githubUrl ? 'hover:underline' : 'opacity-50 cursor-not-allowed'}`} onClick={(e) => { if (!p.githubUrl) e.preventDefault() }}><Globe className="h-4 w-4" /> GitHub</a>
                  </>
                )}
              </span>
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
              <Button data-slot="card-action" variant="ghost" size="sm" className="h-8 text-primary" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
            </CardHeader>
            <CardContent className="pt-0">
              {editing ? (
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="resize-none text-sm leading-relaxed" />
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">{p.bio}</p>
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
                <Switch checked={open} onCheckedChange={(v) => { setOpen(v); updateProfessional(ME.id, { openForReferrals: v }); toast.success(v ? 'Now accepting referral requests' : 'Referral requests paused') }} />
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
                <Textarea value={referralPolicy} onChange={(e) => setReferralPolicy(e.target.value)} rows={3} className="resize-none" onBlur={() => { updateProfessional(ME.id, { referralPolicy }); toast.success('Policy saved') }} />
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-medium">Available positions</div>
                <div className="flex flex-wrap gap-2">
                  {p.openPositions.map((o) => (
                    editingPosition === o ? (
                      <div key={o} className="flex items-center gap-1">
                        <Input
                          value={editingPositionValue}
                          onChange={(e) => setEditingPositionValue(e.target.value)}
                          placeholder="Position title"
                          className="h-7 w-40 text-xs"
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
                      <Input
                        value={newPosition}
                        onChange={(e) => setNewPosition(e.target.value)}
                        placeholder="Position title"
                        className="h-7 w-40 text-xs"
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
                  <div className="flex items-center gap-1.5 text-sm font-semibold">{p.company} <BadgeCheck className="h-4 w-4 text-sky-500" /></div>
                  <div className="text-xs text-muted-foreground">Fintech · 8,000+ employees</div>
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
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Skill name"
                      className="h-7 w-32 text-xs"
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
