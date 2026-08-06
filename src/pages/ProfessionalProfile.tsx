import { useEffect, useRef, useState } from 'react'
import {
  Check, Github, Linkedin, Pencil, Plus,
  ShieldCheck, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Chip, CompanyChip } from '@/components/ui-kit'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import type { Professional } from '@/data/mock'
import { useAutoSaveForm, DraftStatusIndicator } from '@/hooks/useAutoSaveForm'
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard'
import { ProfileHeader } from '@/components/ProfileHeader'

export default function ProfessionalProfile() {
  const { professionals, updateProfessional, student } = useApp()
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
    openForReferrals: false,
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
  const draftRestoredRef = useRef(false)

  // ── Auto-Save Draft ──
  const draftSnapshot = {
    editName, editDesignation, editCompany, editLocation, editIndustry,
    linkedinUrl, githubUrl, bio, referralPolicy,
  }
  const { status: draftStatus, lastSavedAt, clearDraft, onFormSaved, restoreDraft, hasUnsavedChanges } = useAutoSaveForm({
    userId: user?.id ?? '',
    formId: 'professional-profile',
    values: draftSnapshot,
    enabled: !loading && !!user,
  })
  useUnsavedChangesGuard({ enabled: hasUnsavedChanges })

  useEffect(() => {
    if (draftStatus !== 'restored' || !user) return
    try {
      const raw = localStorage.getItem(`draft:${user.id}:professional-profile`)
      if (!raw) return
      const entry = JSON.parse(raw)
      if (!entry?.values) return
      const v = entry.values
      if (v.editName !== undefined) setEditName(v.editName)
      if (v.editDesignation !== undefined) setEditDesignation(v.editDesignation)
      if (v.editCompany !== undefined) setEditCompany(v.editCompany)
      if (v.editLocation !== undefined) setEditLocation(v.editLocation)
      if (v.editIndustry !== undefined) setEditIndustry(v.editIndustry)
      if (v.linkedinUrl !== undefined) setLinkedinUrl(v.linkedinUrl)
      if (v.githubUrl !== undefined) setGithubUrl(v.githubUrl)
      if (v.bio !== undefined) setBio(v.bio)
      if (v.referralPolicy !== undefined) setReferralPolicy(v.referralPolicy)
      restoreDraft(v)
      draftRestoredRef.current = true
    } catch { /* corrupted draft — ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftStatus])

  // Sync local state when ME changes (DB data loads)
  useEffect(() => {
    // Always sync toggles from DB (not affected by draft)
    setOpen(ME.openForReferrals)
    setIsOpenToWork(ME.isOpenToWork)
    // Skip form field sync if draft was just restored to avoid overwriting draft values
    if (draftRestoredRef.current) {
      draftRestoredRef.current = false
      return
    }
    setCapacity(ME.maxPerMonth)
    setBio(ME.bio)
    setReferralPolicy(ME.referralPolicy)
    setEditName(ME.name)
    setEditDesignation(ME.designation)
    setEditCompany(ME.company)
    setEditLocation(ME.location)
    setEditIndustry(ME.industry)
    setLinkedinUrl(ME.linkedinUrl)
    setGithubUrl(ME.githubUrl)
    capacityRef.current = ME.maxPerMonth
  }, [ME.openForReferrals, ME.isOpenToWork, ME.maxPerMonth, ME.bio, ME.referralPolicy, ME.name, ME.designation, ME.company, ME.location, ME.industry, ME.linkedinUrl, ME.githubUrl])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
    )
  }

  const p = ME

  return (
    <div className="space-y-6">
      {/* Draft status indicator */}
      {(draftStatus === 'saved' || draftStatus === 'restored' || draftStatus === 'syncing') && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
          {hasUnsavedChanges && (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={clearDraft}>Discard draft</Button>
          )}
        </div>
      )}


      <ProfileHeader
        role="professional"
        name={editingHeader ? editName : p.name}
        gradient={p.gradient}
        designation={editingHeader ? editDesignation : p.designation}
        company={editingHeader ? editCompany : p.company}
        industry={editingHeader ? editIndustry : p.industry}
        location={editingHeader ? editLocation : p.location}
        yearsExp={p.yearsExp}
        linkedin={editingHeader ? linkedinUrl : p.linkedinUrl}
        github={editingHeader ? githubUrl : p.githubUrl}
        editing={editingHeader}
        onStartEdit={() => setEditingHeader(true)}
        onCancelEdit={() => {
          setEditName(ME.name)
          setEditDesignation(ME.designation)
          setEditCompany(ME.company)
          setEditLocation(ME.location)
          setEditIndustry(ME.industry)
          setLinkedinUrl(ME.linkedinUrl)
          setGithubUrl(ME.githubUrl)
          setEditingHeader(false)
          clearDraft()
        }}
        onSave={() => {
          updateProfessional(ME.id, {
            name: editName,
            designation: editDesignation,
            company: editCompany,
            location: editLocation,
            industry: editIndustry,
            linkedinUrl,
            githubUrl,
          })
          setEditingHeader(false)
          toast.success('Profile saved')
          onFormSaved()
        }}
        toggles={[
          {
            label: 'Open for referrals',
            activeLabel: 'Now accepting referrals',
            checked: open,
            onCheckedChange: (v) => { setOpen(v); updateProfessional(ME.id, { openForReferrals: v }); toast.success(v ? 'Now accepting referral requests' : 'Referral requests paused') },
          },
          {
            label: 'Open to work',
            checked: isOpenToWork,
            onCheckedChange: (v) => { setIsOpenToWork(v); updateProfessional(ME.id, { isOpenToWork: v }); toast.success(v ? 'You are now visible to recruiters' : 'Profile hidden from recruiters') },
          },
        ]}
        editFields={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-center gap-2">
              <Linkedin className="h-3.5 w-3.5 text-[#0A66C2] shrink-0" />
              <input className="w-full sm:w-56 bg-transparent border-b border-muted-foreground/30 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40" placeholder="linkedin.com/in/yourname" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Github className="h-3.5 w-3.5 shrink-0" />
              <input className="w-full sm:w-56 bg-transparent border-b border-muted-foreground/30 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40" placeholder="github.com/yourname" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
            </div>
          </div>
        }
      />

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
                    <Button size="sm" className="rounded-full bg-primary shadow-glow" onClick={() => { updateProfessional(ME.id, { bio }); setEditingAbout(false); toast.success('About section saved'); onFormSaved() }}><Check className="mr-1 h-3.5 w-3.5" /> Save</Button>
                  </div>
                </div>
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
                        <input
                          value={editingPositionValue}
                          onChange={(e) => setEditingPositionValue(e.target.value)}
                          placeholder="Position title"
                          className="h-7 w-40 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
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
                        className="h-7 w-40 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
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
                      className="h-7 w-32 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
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
