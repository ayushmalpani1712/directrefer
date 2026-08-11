import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  Award, BadgeCheck, Briefcase, Building2, CheckCircle2,
  Download, FileText, Github, GraduationCap, Languages, Linkedin, MapPin, Pencil, Plus,
  Sparkles, Trash2, Upload, Globe, X,
} from 'lucide-react'
import { toast } from 'sonner'
import ResumePreview from '@/components/ResumePreview'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import { Switch } from '@/components/ui/switch'
import { Chip, GAvatar, ProgressRing, StatusBadge } from '@/components/ui-kit'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ProfileSkeleton } from '@/components/ui/skeleton'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import { uploadResume, deleteResume } from '@/lib/db'

import { cn } from '@/lib/utils'

function Section({ title, icon: Icon, children, onAdd, actions, className }: { title: string; icon: typeof Award; children: React.ReactNode; onAdd?: () => void; actions?: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('shadow-soft', className)}>
      <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-0">
        <CardTitle className="flex items-center gap-2 text-base font-semibold"><Icon className="h-4 w-4 text-primary" /> {title}</CardTitle>
        <div className="flex items-center gap-1">
          {actions}
          {onAdd && <Button variant="ghost" size="sm" className="h-8 text-primary" onClick={onAdd}><Plus className="mr-1 h-4 w-4" /> Add</Button>}
        </div>
      </div>
      <CardContent className="pt-3">{children}</CardContent>
    </Card>
  )
}

export default function StudentProfile() {
  const {
    professionals, student, requests,
    updateStudent, addStudentSkill, addStudentProject,
    addStudentCertification, addStudentAchievement, setStudentResume,
    removeStudentCertification, removeStudentAchievement, removeStudentProject,
    removeStudentExperience,
    removeStudentEducation,
    removeStudentResume, removeStudentSkill,
    toggleStudentOpenToWork,
  } = useApp()
  const { user } = useAuth()
  const loading = usePageLoading(450)
  const s = student

  const [openToWork, setOpenToWork] = useState(s.openToWork)

  // Sync openToWork when DB data loads (only if value actually changed)
  useEffect(() => {
    setOpenToWork((prev) => (prev === s.openToWork ? prev : s.openToWork))
  }, [s.openToWork])

  // Sync header edit fields when DB data loads (only if values actually changed)
  useEffect(() => {
    setEditName((prev) => (prev === s.name ? prev : s.name))
    setEditHeadline((prev) => (prev === s.headline ? prev : s.headline))
    setEditLocation((prev) => (prev === s.location ? prev : s.location))
    setEditLinkedin((prev) => (prev === s.links.linkedin ? prev : s.links.linkedin))
    setEditGithub((prev) => (prev === s.links.github ? prev : s.links.github))
  }, [s.name, s.headline, s.location, s.links.linkedin, s.links.github])

  // Sync career preference edit fields when DB data loads (only if values actually changed)
  useEffect(() => {
    setEditPreferredRoles((prev) => (prev === s.preferredRoles.join(', ') ? prev : s.preferredRoles.join(', ')))
    setEditPreferredCompanies((prev) => (prev === s.preferredCompanies.join(', ') ? prev : s.preferredCompanies.join(', ')))
    setEditCareerInterests((prev) => (prev === s.careerInterests.join(', ') ? prev : s.careerInterests.join(', ')))
    setEditExpectedSalary((prev) => (prev === s.expectedSalary ? prev : s.expectedSalary))
    setEditLanguages((prev) => (prev === s.languages.join(', ') ? prev : s.languages.join(', ')))
  }, [s.preferredRoles, s.preferredCompanies, s.careerInterests, s.expectedSalary, s.languages])

  const myRequests = requests.filter((r) => r.requesterId === user?.id)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(s.name)
  const [editHeadline, setEditHeadline] = useState(s.headline)
  const [editLocation, setEditLocation] = useState(s.location)
  const [editLinkedin, setEditLinkedin] = useState(s.links.linkedin)
  const [editGithub, setEditGithub] = useState(s.links.github)

  const resumeInputRef = useRef<HTMLInputElement>(null)

  // Experience
  const [showExpForm, setShowExpForm] = useState(false)
  const [expTitle, setExpTitle] = useState('')
  const [expOrg, setExpOrg] = useState('')
  const [expPeriod, setExpPeriod] = useState('')
  const [expDesc, setExpDesc] = useState('')
  const [expEditIndex, setExpEditIndex] = useState<number | null>(null)
  const [expEditTitle, setExpEditTitle] = useState('')
  const [expEditOrg, setExpEditOrg] = useState('')
  const [expEditPeriod, setExpEditPeriod] = useState('')
  const [expEditDesc, setExpEditDesc] = useState('')
  const [expDeleteIndex, setExpDeleteIndex] = useState<number | null>(null)

  // Education
  const [showEduForm, setShowEduForm] = useState(false)
  const [eduSchool, setEduSchool] = useState('')
  const [eduDegree, setEduDegree] = useState('')
  const [eduPeriod, setEduPeriod] = useState('')
  const [eduDetail, setEduDetail] = useState('')
  const [eduEditIndex, setEduEditIndex] = useState<number | null>(null)
  const [eduEditSchool, setEduEditSchool] = useState('')
  const [eduEditDegree, setEduEditDegree] = useState('')
  const [eduEditPeriod, setEduEditPeriod] = useState('')
  const [eduEditDetail, setEduEditDetail] = useState('')
  const [eduDeleteIndex, setEduDeleteIndex] = useState<number | null>(null)

  // Projects (left)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [projName, setProjName] = useState('')
  const [projDesc, setProjDesc] = useState('')
  const [projTags, setProjTags] = useState('')
  const [projEditName, setProjEditName] = useState<string | null>(null)
  const [projEditDesc, setProjEditDesc] = useState('')
  const [projEditTags, setProjEditTags] = useState('')
  const [projDeleteName, setProjDeleteName] = useState<string | null>(null)

  // Certifications
  const [showCertForm, setShowCertForm] = useState(false)
  const [certName, setCertName] = useState('')
  const [certDeleteName, setCertDeleteName] = useState<string | null>(null)

  // Achievements
  const [showAchForm, setShowAchForm] = useState(false)
  const [achName, setAchName] = useState('')
  const [achDeleteName, setAchDeleteName] = useState<string | null>(null)

  // Skills
  const [showSkillInput, setShowSkillInput] = useState(false)
  const [skillName, setSkillName] = useState('')

  // Resume
  const [showResumeConfirm, setShowResumeConfirm] = useState(false)
  const [showResumePreview, setShowResumePreview] = useState(false)
  const [resumeUploading, setResumeUploading] = useState(false)

  // Career preferences
  const [showCareerEdit, setShowCareerEdit] = useState(false)
  const [editPreferredRoles, setEditPreferredRoles] = useState(s.preferredRoles.join(', '))
  const [editPreferredCompanies, setEditPreferredCompanies] = useState(s.preferredCompanies.join(', '))
  const [editCareerInterests, setEditCareerInterests] = useState(s.careerInterests.join(', '))
  const [editExpectedSalary, setEditExpectedSalary] = useState(s.expectedSalary)
  const [editLanguages, setEditLanguages] = useState(s.languages.join(', '))

  if (loading) {
    return (
      <ProfileSkeleton />
    )
  }

  function handleSaveProfile() {
    if (!editName.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    updateStudent({ name: editName.trim(), headline: editHeadline.trim(), location: editLocation.trim(), links: { linkedin: editLinkedin.trim(), github: editGithub.trim(), website: s.links.website } })
    setEditing(false)
    toast.success('Profile updated')
  }

  function handleCancelEdit() {
    setEditName(s.name)
    setEditHeadline(s.headline)
    setEditLocation(s.location)
    setEditLinkedin(s.links.linkedin)
    setEditGithub(s.links.github)
    setEditing(false)
  }

  function handleSaveCareer() {
    const parseList = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean)
    updateStudent({
      preferredRoles: parseList(editPreferredRoles),
      preferredCompanies: parseList(editPreferredCompanies),
      careerInterests: parseList(editCareerInterests),
      expectedSalary: editExpectedSalary.trim(),
      languages: parseList(editLanguages),
    })
    setShowCareerEdit(false)
    toast.success('Career preferences updated')
  }

  function handleCancelCareerEdit() {
    setEditPreferredRoles(s.preferredRoles.join(', '))
    setEditPreferredCompanies(s.preferredCompanies.join(', '))
    setEditCareerInterests(s.careerInterests.join(', '))
    setEditExpectedSalary(s.expectedSalary)
    setEditLanguages(s.languages.join(', '))
    setShowCareerEdit(false)
  }

  // --- Experience ---
  function handleAddExperience() {
    if (!expTitle.trim() || !expOrg.trim()) {
      toast.error('Title and organization are required')
      return
    }
    updateStudent({ experience: [...s.experience, { title: expTitle.trim(), org: expOrg.trim(), period: expPeriod.trim() || 'Present', desc: expDesc.trim() }] })
    setExpTitle(''); setExpOrg(''); setExpPeriod(''); setExpDesc('')
    setShowExpForm(false)
    toast.success('Experience added')
  }

  function startEditExp(i: number) {
    const e = s.experience[i]
    setExpEditIndex(i)
    setExpEditTitle(e.title)
    setExpEditOrg(e.org)
    setExpEditPeriod(e.period)
    setExpEditDesc(e.desc)
  }

  function handleSaveEditExp() {
    if (expEditIndex === null) return
    if (!expEditTitle.trim() || !expEditOrg.trim()) {
      toast.error('Title and organization are required')
      return
    }
    const updated = [...s.experience]
    updated[expEditIndex] = { title: expEditTitle.trim(), org: expEditOrg.trim(), period: expEditPeriod.trim() || 'Present', desc: expEditDesc.trim() }
    updateStudent({ experience: updated })
    setExpEditIndex(null)
    toast.success('Experience updated')
  }

  function handleDeleteExp() {
    if (expDeleteIndex === null) return
    removeStudentExperience(expDeleteIndex)
    setExpDeleteIndex(null)
    toast.success('Experience removed')
  }

  // --- Education ---
  function handleAddEducation() {
    if (!eduSchool.trim() || !eduDegree.trim()) {
      toast.error('School and degree are required')
      return
    }
    updateStudent({ education: [...s.education, { school: eduSchool.trim(), degree: eduDegree.trim(), period: eduPeriod.trim() || 'Present', detail: eduDetail.trim() }] })
    setEduSchool(''); setEduDegree(''); setEduPeriod(''); setEduDetail('')
    setShowEduForm(false)
    toast.success('Education added')
  }

  function startEditEdu(i: number) {
    const e = s.education[i]
    setEduEditIndex(i)
    setEduEditSchool(e.school)
    setEduEditDegree(e.degree)
    setEduEditPeriod(e.period)
    setEduEditDetail(e.detail)
  }

  function handleSaveEditEdu() {
    if (eduEditIndex === null) return
    if (!eduEditSchool.trim() || !eduEditDegree.trim()) {
      toast.error('School and degree are required')
      return
    }
    const updated = [...s.education]
    updated[eduEditIndex] = { school: eduEditSchool.trim(), degree: eduEditDegree.trim(), period: eduEditPeriod.trim() || 'Present', detail: eduEditDetail.trim() }
    updateStudent({ education: updated })
    setEduEditIndex(null)
    toast.success('Education updated')
  }

  function handleDeleteEdu() {
    if (eduDeleteIndex === null) return
    removeStudentEducation(eduDeleteIndex)
    setEduDeleteIndex(null)
    toast.success('Education removed')
  }

  // --- Projects (left) ---
  function handleAddProject() {
    if (!projName.trim()) {
      toast.error('Project name is required')
      return
    }
    addStudentProject({ name: projName.trim(), desc: projDesc.trim(), tags: projTags.split(',').map((t) => t.trim()).filter(Boolean) })
    setProjName(''); setProjDesc(''); setProjTags('')
    setShowProjectForm(false)
    toast.success('Project added')
  }

  function startEditProj(name: string) {
    const p = s.projects.find((x) => x.name === name)
    if (!p) return
    setProjEditName(p.name)
    setProjEditDesc(p.desc)
    setProjEditTags(p.tags.join(', '))
  }

  function handleSaveEditProj() {
    if (!projEditName) return
    if (!projEditName.trim()) {
      toast.error('Project name is required')
      return
    }
    removeStudentProject(projEditName)
    addStudentProject({ name: projEditName.trim(), desc: projEditDesc.trim(), tags: projEditTags.split(',').map((t) => t.trim()).filter(Boolean) })
    setProjEditName(null)
    toast.success('Project updated')
  }

  function handleDeleteProj(name: string) {
    removeStudentProject(name)
    setProjDeleteName(null)
    toast.success('Project removed')
  }

  // --- Certifications ---
  function handleAddCertification() {
    if (!certName.trim()) {
      toast.error('Certification name is required')
      return
    }
    addStudentCertification(certName.trim())
    setCertName('')
    setShowCertForm(false)
    toast.success('Certification added')
  }

  function handleDeleteCert(cert: string) {
    removeStudentCertification(cert)
    setCertDeleteName(null)
    toast.success('Certification removed')
  }

  // --- Achievements ---
  function handleAddAchievement() {
    if (!achName.trim()) {
      toast.error('Achievement name is required')
      return
    }
    addStudentAchievement(achName.trim())
    setAchName('')
    setShowAchForm(false)
    toast.success('Achievement added')
  }

  function handleDeleteAch(ach: string) {
    removeStudentAchievement(ach)
    setAchDeleteName(null)
    toast.success('Achievement removed')
  }

  // --- Skills ---
  function handleAddSkill() {
    if (!skillName.trim()) {
      toast.error('Skill name is required')
      return
    }
    addStudentSkill(skillName.trim())
    setSkillName('')
    setShowSkillInput(false)
    toast.success('Skill added')
  }

  // --- Resume ---
  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10 MB')
      return
    }
    if (file.size === 0) {
      toast.error('File is empty')
      return
    }
    if (!user) return
    setResumeUploading(true)
    try {
      const result = await uploadResume(user.id, file)
      if (result) {
        const sizeKB = result.size / 1024
        const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${Math.round(sizeKB)} KB`
        setStudentResume({ name: result.name, size: sizeStr, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), url: result.url })
        toast.success('Resume uploaded successfully')
      } else {
        toast.error('Failed to upload resume. Please try again.')
      }
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setResumeUploading(false)
    }
    e.target.value = ''
  }

  function handleDownloadResume() {
    if (!s.resumeFile) {
      toast.warning('No resume to download. Upload one first.')
      return
    }
    if (s.resumeFile.url) {
      window.open(s.resumeFile.url, '_blank', 'noopener,noreferrer')
    } else {
      const blob = new Blob([`Resume: ${s.resumeFile.name}`], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = s.resumeFile.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
    toast.success('Resume downloaded')
  }

  async function handleDeleteResume() {
    if (!user) return
    try {
      const result = await deleteResume(user.id)
      if (result) {
        removeStudentResume()
        setShowResumeConfirm(false)
        toast.success('Resume removed')
      } else {
        toast.error('Failed to delete resume. Please try again.')
      }
    } catch {
      toast.error('Failed to delete resume. Please try again.')
    }
  }

  return (
    <div className="space-y-6">


      <input ref={resumeInputRef} type="file" accept=".pdf" className="hidden" onChange={handleResumeUpload} />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden ">
          <div className="relative h-24 sm:h-36 md:h-44 bg-gradient-to-r from-[#3B5FE5] to-[#8B8FD4]">
            <div className="bg-grid absolute inset-0 opacity-20" />
          </div>
          <CardContent className="relative px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-3 sm:gap-4">
                <div className="relative -mt-10 sm:-mt-12 md:-mt-16">
                  <GAvatar name={s.name} gradient={s.gradient} className="h-20 w-20 border-4 border-card text-xl sm:h-24 sm:w-24 sm:text-2xl md:h-32 md:w-32 md:text-3xl" />
                </div>
                <div className="pb-1">
                  <h1 className="font-display flex items-center gap-2 text-xl sm:text-2xl font-bold">
                    {editing ? (
                      <input className="w-full bg-transparent border-b border-primary outline-none text-xl sm:text-2xl font-bold placeholder:text-muted-foreground/30" placeholder="Your full name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    ) : (
                      s.name
                    )}
                  </h1>
                  {editing ? (
                    <input className="mt-0.5 w-full bg-transparent border-b border-muted-foreground/30 outline-none text-sm text-muted-foreground placeholder:text-muted-foreground/40" placeholder="e.g. Software Engineer | React & Node.js" value={editHeadline} onChange={(e) => setEditHeadline(e.target.value)} />
                  ) : (
                    <div className="mt-0.5 text-sm text-muted-foreground">{s.headline}</div>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    {editing ? (
                      <input className="bg-transparent border-b border-muted-foreground/30 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40" placeholder="e.g. Pune, India" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                    ) : (
                      <>
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.location)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground transition-colors"><MapPin className="h-3.5 w-3.5" /> {s.location}</a>
                      </>
                    )}
                  </div>
                  {editing && (
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <div className="flex items-center gap-2">
                        <Linkedin className="h-3.5 w-3.5 text-[#0A66C2] shrink-0" />
                        <input className="w-full sm:w-56 bg-transparent border-b border-muted-foreground/30 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40" placeholder="e.g. linkedin.com/in/yourname" value={editLinkedin} onChange={(e) => setEditLinkedin(e.target.value)} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Github className="h-3.5 w-3.5 shrink-0" />
                        <input className="w-full sm:w-56 bg-transparent border-b border-muted-foreground/30 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40" placeholder="e.g. github.com/yourname" value={editGithub} onChange={(e) => setEditGithub(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:pb-1">
                {s.resumeFile?.url ? (
                  <Button variant="outline" className="rounded-full" onClick={() => setShowResumePreview(true)}><FileText className="mr-1.5 h-4 w-4" /> Resume</Button>
                ) : (
                  <Button variant="outline" className="rounded-full" onClick={handleDownloadResume}><Download className="mr-1.5 h-4 w-4" /> Resume</Button>
                )}
                {editing ? (
                  <>
                    <Button variant="outline" className="rounded-full" onClick={handleCancelEdit}><X className="mr-1.5 h-4 w-4" /> Cancel</Button>
                    <Button className="rounded-full bg-primary shadow-glow" onClick={handleSaveProfile}><CheckCircle2 className="mr-1.5 h-4 w-4" /> Save</Button>
                  </>
                ) : (
                  <Button className="rounded-full bg-primary shadow-glow" onClick={() => { setEditName(s.name); setEditHeadline(s.headline); setEditLocation(s.location); setEditing(true) }}><Pencil className="mr-1.5 h-4 w-4" /> Edit profile</Button>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div
                role="presentation"
                className={cn(
                  'flex items-center gap-2.5 rounded-full border px-4 py-2 transition-colors',
                  openToWork
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-border bg-transparent'
                )}
              >
                <Switch
                  checked={openToWork}
                  onCheckedChange={async (v) => {
                    setOpenToWork(v)
                    const ok = await toggleStudentOpenToWork(v)
                    if (ok) toast.success(v ? 'You are now visible to recruiters' : 'Profile hidden from recruiters')
                  }}
                />
                <span className={cn(
                  'text-sm font-medium',
                  openToWork
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
                )}>Open to work</span>
              </div>
              {s.links.linkedin ? (
                <a href={s.links.linkedin.startsWith('http') ? s.links.linkedin : `https://linkedin.com/in/${s.links.linkedin}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"><Linkedin className="h-4 w-4 text-[#0A66C2]" /> LinkedIn</a>
              ) : (
                <button type="button" onClick={() => { setEditName(s.name); setEditHeadline(s.headline); setEditLocation(s.location); setEditLinkedin(s.links.linkedin); setEditGithub(s.links.github); setEditing(true) }} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 bg-background px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"><Linkedin className="h-4 w-4" /> Add LinkedIn</button>
              )}
              {s.links.github ? (
                <a href={s.links.github.startsWith('http') ? s.links.github : `https://github.com/${s.links.github}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"><Github className="h-4 w-4" /> GitHub</a>
              ) : (
                <button type="button" onClick={() => { setEditName(s.name); setEditHeadline(s.headline); setEditLocation(s.location); setEditLinkedin(s.links.linkedin); setEditGithub(s.links.github); setEditing(true) }} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 bg-background px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"><Github className="h-4 w-4" /> Add GitHub</button>
              )}
              {s.links.website ? (
                <a href={s.links.website.startsWith('http') ? s.links.website : `https://${s.links.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"><Globe className="h-4 w-4 text-primary" /> Website</a>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3 items-stretch">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Experience */}
          <Section title="Experience" icon={Briefcase} onAdd={() => setShowExpForm(!showExpForm)}>
            <div className="space-y-5">
              {showExpForm && (
                <div className="rounded-xl border border-primary/30 bg-muted/30 p-4 space-y-3">
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Job title *" value={expTitle} onChange={(e) => setExpTitle(e.target.value)} />
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Organization *" value={expOrg} onChange={(e) => setExpOrg(e.target.value)} />
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Period (e.g. Jan 2024 - Present)" value={expPeriod} onChange={(e) => setExpPeriod(e.target.value)} />
                  <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none" rows={2} placeholder="Description" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddExperience}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowExpForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              {s.experience.length === 0 && !showExpForm && <p className="text-sm text-muted-foreground">No experience yet.</p>}
              {s.experience.map((e, i) => (
                <div key={i}>
                  {expEditIndex === i ? (
                    <div className="rounded-xl border border-primary/30 bg-muted/30 p-4 space-y-3">
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Job title *" value={expEditTitle} onChange={(ev) => setExpEditTitle(ev.target.value)} />
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Organization *" value={expEditOrg} onChange={(ev) => setExpEditOrg(ev.target.value)} />
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Period (e.g. Jan 2024 - Present)" value={expEditPeriod} onChange={(ev) => setExpEditPeriod(ev.target.value)} />
                      <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none" rows={2} placeholder="Description" value={expEditDesc} onChange={(ev) => setExpEditDesc(ev.target.value)} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEditExp}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setExpEditIndex(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted"><Building2 className="h-5 w-5 text-muted-foreground" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">{e.title}</div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEditExp(i)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" onClick={() => setExpDeleteIndex(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">{e.org} · {e.period}</div>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{e.desc}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <ConfirmDialog
            open={expDeleteIndex !== null}
            onOpenChange={(open) => { if (!open) setExpDeleteIndex(null) }}
            title="Delete experience?"
            description="This will permanently remove this experience entry from your profile."
            onConfirm={handleDeleteExp}
          />

          {/* Projects */}
          <Section title="Projects" icon={Sparkles} onAdd={() => setShowProjectForm(!showProjectForm)}>
            {showProjectForm && (
              <div className="mb-3 rounded-xl border border-primary/30 bg-muted/30 p-4 space-y-3">
                <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Project name *" value={projName} onChange={(e) => setProjName(e.target.value)} />
                <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Description" value={projDesc} onChange={(e) => setProjDesc(e.target.value)} />
                <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Tags (comma-separated)" value={projTags} onChange={(e) => setProjTags(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddProject}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowProjectForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {s.projects.length === 0 && !showProjectForm && <p className="text-sm text-muted-foreground">No projects yet.</p>}
              {s.projects.map((p) => (
                <div key={p.name}>
                  {projEditName === p.name ? (
                    <div className="rounded-xl border border-primary/30 bg-muted/30 p-4 space-y-3">
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Project name *" value={projEditName ?? ''} onChange={(e) => setProjEditName(e.target.value)} />
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Description" value={projEditDesc} onChange={(e) => setProjEditDesc(e.target.value)} />
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Tags (comma-separated)" value={projEditTags} onChange={(e) => setProjEditTags(e.target.value)} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEditProj}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setProjEditName(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">{p.name}</div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEditProj(p.name)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" onClick={() => setProjDeleteName(p.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">{p.tags.map((t) => <Chip key={t}>{t}</Chip>)}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <ConfirmDialog
            open={projDeleteName !== null}
            onOpenChange={(open) => { if (!open) setProjDeleteName(null) }}
            title="Delete project?"
            description={`This will permanently remove the project "${projDeleteName}" from your profile.`}
            onConfirm={() => { if (projDeleteName) handleDeleteProj(projDeleteName) }}
          />

          {/* Education */}
          <Section title="Education" icon={GraduationCap} onAdd={() => setShowEduForm(!showEduForm)}>
            <div className="space-y-4">
              {showEduForm && (
                <div className="rounded-xl border border-primary/30 bg-muted/30 p-4 space-y-3">
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="School *" value={eduSchool} onChange={(e) => setEduSchool(e.target.value)} />
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Degree *" value={eduDegree} onChange={(e) => setEduDegree(e.target.value)} />
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Period (e.g. 2020 - 2024)" value={eduPeriod} onChange={(e) => setEduPeriod(e.target.value)} />
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Detail (e.g. GPA, honors)" value={eduDetail} onChange={(e) => setEduDetail(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddEducation}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowEduForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              {s.education.length === 0 && !showEduForm && <p className="text-sm text-muted-foreground">No education yet.</p>}
              {s.education.map((e, i) => (
                <div key={i}>
                  {eduEditIndex === i ? (
                    <div className="rounded-xl border border-primary/30 bg-muted/30 p-4 space-y-3">
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="School *" value={eduEditSchool} onChange={(ev) => setEduEditSchool(ev.target.value)} />
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Degree *" value={eduEditDegree} onChange={(ev) => setEduEditDegree(ev.target.value)} />
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Period (e.g. 2020 - 2024)" value={eduEditPeriod} onChange={(ev) => setEduEditPeriod(ev.target.value)} />
                      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Detail (e.g. GPA, honors)" value={eduEditDetail} onChange={(ev) => setEduEditDetail(ev.target.value)} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEditEdu}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEduEditIndex(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted"><GraduationCap className="h-5 w-5 text-muted-foreground" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">{e.school}</div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEditEdu(i)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" onClick={() => setEduDeleteIndex(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">{e.degree} · {e.period}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{e.detail}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <ConfirmDialog
            open={eduDeleteIndex !== null}
            onOpenChange={(open) => { if (!open) setEduDeleteIndex(null) }}
            title="Delete education?"
            description="This will permanently remove this education entry from your profile."
            onConfirm={handleDeleteEdu}
          />

          {/* Certifications & achievements */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Section title="Certifications" icon={BadgeCheck} onAdd={() => setShowCertForm(!showCertForm)}>
              {showCertForm && (
                <div className="mb-2 rounded-xl border border-primary/30 bg-muted/30 p-3 space-y-2">
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Certification name *" value={certName} onChange={(e) => setCertName(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddCertification}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowCertForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <div className="space-y-2.5">
                {s.certifications.length === 0 && !showCertForm && <p className="text-sm text-muted-foreground">No certifications yet.</p>}
                {s.certifications.map((c) => (
                  <div key={c} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> {c}</div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" onClick={() => setCertDeleteName(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            </Section>

            <ConfirmDialog
              open={certDeleteName !== null}
              onOpenChange={(open) => { if (!open) setCertDeleteName(null) }}
              title="Delete certification?"
              description={`This will permanently remove "${certDeleteName}" from your certifications.`}
              onConfirm={() => { if (certDeleteName) handleDeleteCert(certDeleteName) }}
            />

            <Section title="Achievements" icon={Award} onAdd={() => setShowAchForm(!showAchForm)}>
              {showAchForm && (
                <div className="mb-2 rounded-xl border border-primary/30 bg-muted/30 p-3 space-y-2">
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Achievement name *" value={achName} onChange={(e) => setAchName(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddAchievement}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAchForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <div className="space-y-2.5">
                {s.achievements.length === 0 && !showAchForm && <p className="text-sm text-muted-foreground">No achievements yet.</p>}
                {s.achievements.map((a) => (
                  <div key={a} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2.5"><Award className="h-4 w-4 shrink-0 text-amber-500" /> {a}</div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" onClick={() => setAchDeleteName(a)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            </Section>

            <ConfirmDialog
              open={achDeleteName !== null}
              onOpenChange={(open) => { if (!open) setAchDeleteName(null) }}
              title="Delete achievement?"
              description={`This will permanently remove "${achDeleteName}" from your achievements.`}
              onConfirm={() => { if (achDeleteName) handleDeleteAch(achDeleteName) }}
            />
          </div>

          {/* Referral history */}
          <Section title="Referral history" icon={FileText} className="flex-1">
            <div className="space-y-3">
              {myRequests.length === 0 && <p className="text-sm text-muted-foreground">No referral history yet.</p>}
              {myRequests.map((r) => {
                const p = professionals.find((x) => x.id === r.professionalId)
                if (!p) return null
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border p-3.5">
                    <GAvatar name={p.name} gradient={p.gradient} className="h-9 w-9 text-[10px]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.role}</div>
                      <div className="text-xs text-muted-foreground">via {p.name} · {p.company} · {r.date}</div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                )
              })}
              <Button variant="outline" size="sm" className="w-full" asChild><Link to="/job-seeker/applications">View full history</Link></Button>
            </div>
          </Section>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Profile completion */}
          <Card className="shadow-soft">
            <CardContent className="flex items-center gap-4 p-5">
              <ProgressRing value={s.profileCompletion} size={64} />
              <div>
                <div className="text-sm font-semibold">Profile strength</div>
                <p className="mt-0.5 text-xs text-muted-foreground">Add 1 certification and 2 skills to hit 90%.</p>
                <Button variant="link" size="sm" className="mt-0.5 h-auto p-0 text-xs text-primary" onClick={() => {
                  if (!s.headline || s.skills.length === 0) toast.success('Keep adding details to strengthen your profile!')
                  else toast.success('Your profile is looking great!')
                }}>Complete profile</Button>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="shadow-soft">
      <CardHeader className="">
              <CardTitle className="text-base">Skills</CardTitle>
              <Button data-slot="card-action" variant="ghost" size="sm" className="h-8 text-primary" onClick={() => setShowSkillInput(!showSkillInput)}><Plus className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="pt-0">
              {showSkillInput && (
                <div className="mb-3 flex gap-2">
                  <input className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Skill name" value={skillName} onChange={(e) => setSkillName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()} />
                  <Button size="sm" onClick={handleAddSkill}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowSkillInput(false); setSkillName('') }}><X className="h-4 w-4" /></Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {s.skills.length === 0 && !showSkillInput && <p className="text-sm text-muted-foreground">No skills yet.</p>}
                {s.skills.map((sk) => (
                  <div key={sk} className="group relative inline-flex">
                    <Chip tone="primary">
                      {sk}
                      <button className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-primary-foreground/60 opacity-0 transition-opacity hover:bg-primary-foreground/20 group-hover:opacity-100" onClick={() => { removeStudentSkill(sk); toast.success('Skill removed') }}><X className="h-2.5 w-2.5" /></button>
                    </Chip>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Career preferences</CardTitle>
              {!showCareerEdit && (
                <Button data-slot="card-action" variant="ghost" size="sm" className="h-8 text-primary" onClick={() => setShowCareerEdit(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4 pt-0 text-sm">
              {showCareerEdit ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferred roles</label>
                    <input className="mt-1.5 w-full bg-transparent border-b border-muted-foreground/30 outline-none text-sm" placeholder="e.g. Frontend Engineer, PM" value={editPreferredRoles} onChange={(e) => setEditPreferredRoles(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferred companies</label>
                    <input className="mt-1.5 w-full bg-transparent border-b border-muted-foreground/30 outline-none text-sm" placeholder="e.g. Google, Microsoft" value={editPreferredCompanies} onChange={(e) => setEditPreferredCompanies(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Career interests</label>
                    <input className="mt-1.5 w-full bg-transparent border-b border-muted-foreground/30 outline-none text-sm" placeholder="e.g. AI, Cloud Computing" value={editCareerInterests} onChange={(e) => setEditCareerInterests(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expected salary</label>
                    <input className="mt-1.5 w-full bg-transparent border-b border-muted-foreground/30 outline-none text-sm" placeholder="e.g. 8-12 LPA" value={editExpectedSalary} onChange={(e) => setEditExpectedSalary(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Languages</label>
                    <input className="mt-1.5 w-full bg-transparent border-b border-muted-foreground/30 outline-none text-sm" placeholder="e.g. English, Hindi" value={editLanguages} onChange={(e) => setEditLanguages(e.target.value)} />
                  </div>
                  <p className="text-xs text-muted-foreground">Separate values with commas</p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="rounded-full bg-primary" onClick={handleSaveCareer}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Save</Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelCareerEdit}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferred roles</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">{s.preferredRoles.length > 0 ? s.preferredRoles.map((r) => <Chip key={r}>{r}</Chip>) : <span className="text-xs text-muted-foreground">Not set</span>}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferred companies</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">{s.preferredCompanies.length > 0 ? s.preferredCompanies.map((c) => <Chip key={c} tone="outline">{c}</Chip>) : <span className="text-xs text-muted-foreground">Not set</span>}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Career interests</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">{s.careerInterests.length > 0 ? s.careerInterests.map((c) => <Chip key={c}>{c}</Chip>) : <span className="text-xs text-muted-foreground">Not set</span>}</div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Expected salary</span>
                    <span className="font-semibold">{s.expectedSalary || <span className="text-xs text-muted-foreground">Not set</span>}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Languages className="h-4 w-4" /> Languages</span>
                    <span className="text-right font-medium">{s.languages.length > 0 ? s.languages.join(', ') : <span className="text-xs text-muted-foreground">Not set</span>}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Resume */}
          <Card className="shadow-soft flex-1">
            <CardHeader className="">
              <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" /> Resume</CardTitle>
              <div data-slot="card-action" className="flex items-center gap-1">
                {s.resumeFile && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" onClick={() => setShowResumeConfirm(true)}><Trash2 className="h-3.5 w-3.5" /></Button>
                )}
                <Button variant="ghost" size="sm" className="h-8 text-primary" onClick={() => resumeInputRef.current?.click()}><Plus className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-xl border border-dashed border-border p-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/30">
                {resumeUploading ? (
                  <>
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="mt-2 text-sm font-medium text-primary">Uploading...</p>
                    <p className="mt-1 text-xs text-muted-foreground">Please wait</p>
                  </>
                ) : (
                  <>
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium">Drop your PDF here or click to upload</p>
                    <p className="mt-1 text-xs text-muted-foreground">PDF, max 10 MB</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => resumeInputRef.current?.click()}>
                      <Upload className="mr-1.5 h-3.5 w-3.5" /> Choose file
                    </Button>
                  </>
                )}
              </div>
              {s.resumeFile ? (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-border p-3.5">
                  <FileText className="h-8 w-8 text-rose-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.resumeFile.name}</div>
                    <div className="text-xs text-muted-foreground">{s.resumeFile.size} · Uploaded {s.resumeFile.date}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {s.resumeFile.url && (
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={() => setShowResumePreview(true)}>
                        Preview
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleDownloadResume}><Download className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-border p-3.5">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-muted-foreground">No resume uploaded</div>
                    <div className="text-xs text-muted-foreground">Upload a PDF to get started</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <ConfirmDialog
            open={showResumeConfirm}
            onOpenChange={setShowResumeConfirm}
            title="Delete resume?"
            description="This will permanently remove your uploaded resume from your profile."
            onConfirm={handleDeleteResume}
          />

          {s.resumeFile?.url && (
            <ResumePreview
              url={s.resumeFile.url}
              fileName={s.resumeFile.name}
              open={showResumePreview}
              onOpenChange={setShowResumePreview}
            />
          )}
        </div>
      </div>
    </div>
  )
}
