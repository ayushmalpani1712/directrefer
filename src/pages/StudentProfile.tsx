import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  Briefcase, FileText, BadgeCheck, Award, Download,
} from 'lucide-react'
import { toast } from 'sonner'
import ResumePreview from '@/components/ResumePreview'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GAvatar, StatusBadge, Chip } from '@/components/ui-kit'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ProfileSkeleton } from '@/components/ui/skeleton'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { usePageLoading } from '@/hooks/usePageLoading'
import { useProfileDraft } from '@/hooks/useProfileDraft'
import { uploadResume, deleteResume } from '@/lib/db'

import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileSidebar } from '@/components/profile/ProfileSidebar'
import { AboutTab } from '@/components/profile/AboutTab'
import { ExperienceTab } from '@/components/profile/ExperienceTab'
import { EducationTab } from '@/components/profile/EducationTab'
import { ProjectsTab } from '@/components/profile/ProjectsTab'
import { SkillsTab } from '@/components/profile/SkillsTab'

export default function StudentProfile() {
  const {
    professionals, student, requests,
    updateStudent, addStudentSkill, addStudentProject,
    setStudentResume,
    removeStudentProject,
    removeStudentExperience,
    removeStudentEducation,
    removeStudentResume, removeStudentSkill,
    toggleStudentOpenToWork,
  } = useApp()
  const { user } = useAuth()
  const loading = usePageLoading(450)
  const s = student

  const [openToWork, setOpenToWork] = useState(s.openToWork)
  const [bannerTheme, setBannerTheme] = useState<string | null>(s.bannerTheme ?? null)

  useEffect(() => {
    setOpenToWork((prev) => (prev === s.openToWork ? prev : s.openToWork))
  }, [s.openToWork])

  useEffect(() => {
    setBannerTheme(s.bannerTheme ?? null)
  }, [s.bannerTheme])

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(s.name)
  const [editHeadline, setEditHeadline] = useState(s.headline)
  const [editLocation, setEditLocation] = useState(s.location)
  const [editLinkedin, setEditLinkedin] = useState(s.links.linkedin)
  const [editGithub, setEditGithub] = useState(s.links.github)

  useEffect(() => {
    setEditName((prev) => (prev === s.name ? prev : s.name))
    setEditHeadline((prev) => (prev === s.headline ? prev : s.headline))
    setEditLocation((prev) => (prev === s.location ? prev : s.location))
    setEditLinkedin((prev) => (prev === s.links.linkedin ? prev : s.links.linkedin))
    setEditGithub((prev) => (prev === s.links.github ? prev : s.links.github))
  }, [s.name, s.headline, s.location, s.links.linkedin, s.links.github])

  const { loadDraft, markSaved } = useProfileDraft(user?.id, {
    name: editName, headline: editHeadline, location: editLocation,
    linkedin: editLinkedin, github: editGithub,
  })

  useEffect(() => {
    if (!user?.id || editing) return
    loadDraft().then((draft) => {
      if (draft && typeof draft === 'object') {
        if (draft.name) setEditName(String(draft.name))
        if (draft.headline) setEditHeadline(String(draft.headline))
        if (draft.location) setEditLocation(String(draft.location))
        if (draft.linkedin) setEditLinkedin(String(draft.linkedin))
        if (draft.github) setEditGithub(String(draft.github))
        setEditing(true)
      }
    })
  }, [user?.id])

  const resumeInputRef = useRef<HTMLInputElement>(null)
  const myRequests = requests.filter((r) => r.requesterId === user?.id)

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

  // Job preferences
  const [showJobPrefEdit, setShowJobPrefEdit] = useState(false)
  const [editNoticePeriod, setEditNoticePeriod] = useState(s.noticePeriod || '')
  const [editWorkPreference, setEditWorkPreference] = useState(s.workPreference || '')
  const [editWhyFit, setEditWhyFit] = useState(s.whyFit || '')

  useEffect(() => {
    setEditPreferredRoles((prev) => (prev === s.preferredRoles.join(', ') ? prev : s.preferredRoles.join(', ')))
    setEditPreferredCompanies((prev) => (prev === s.preferredCompanies.join(', ') ? prev : s.preferredCompanies.join(', ')))
    setEditCareerInterests((prev) => (prev === s.careerInterests.join(', ') ? prev : s.careerInterests.join(', ')))
    setEditExpectedSalary((prev) => (prev === s.expectedSalary ? prev : s.expectedSalary))
    setEditLanguages((prev) => (prev === s.languages.join(', ') ? prev : s.languages.join(', ')))
  }, [s.preferredRoles, s.preferredCompanies, s.careerInterests, s.expectedSalary, s.languages])

  useEffect(() => {
    setEditNoticePeriod((prev) => (prev === (s.noticePeriod || '') ? prev : (s.noticePeriod || '')))
    setEditWorkPreference((prev) => (prev === (s.workPreference || '') ? prev : (s.workPreference || '')))
    setEditWhyFit((prev) => (prev === (s.whyFit || '') ? prev : (s.whyFit || '')))
  }, [s.noticePeriod, s.workPreference, s.whyFit])

  // --- Handlers ---
  function handleSaveProfile() {
    if (!editName.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    updateStudent({ name: editName.trim(), headline: editHeadline.trim(), location: editLocation.trim(), links: { linkedin: editLinkedin.trim(), github: editGithub.trim(), website: s.links.website } })
    setEditing(false)
    markSaved()
    toast.success('Profile updated')
  }

  function handleCancelEdit() {
    setEditName(s.name)
    setEditHeadline(s.headline)
    setEditLocation(s.location)
    setEditLinkedin(s.links.linkedin)
    setEditGithub(s.links.github)
    setEditing(false)
    markSaved()
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

  function handleSaveJobPrefs() {
    updateStudent({
      noticePeriod: editNoticePeriod.trim(),
      workPreference: editWorkPreference.trim(),
      whyFit: editWhyFit.trim(),
    })
    setShowJobPrefEdit(false)
    toast.success('Job preferences updated')
  }

  function handleCancelJobPrefEdit() {
    setEditNoticePeriod(s.noticePeriod || '')
    setEditWorkPreference(s.workPreference || '')
    setEditWhyFit(s.whyFit || '')
    setShowJobPrefEdit(false)
  }

  function handleAddExperience(exp: { title: string; org: string; period: string; desc: string }) {
    updateStudent({ experience: [...s.experience, exp] })
    toast.success('Experience added')
  }

  function handleEditExperience(i: number, exp: { title: string; org: string; period: string; desc: string }) {
    const updated = [...s.experience]
    updated[i] = exp
    updateStudent({ experience: updated })
    toast.success('Experience updated')
  }

  function handleDeleteExperience(i: number) {
    removeStudentExperience(i)
    toast.success('Experience removed')
  }

  function handleAddEducation(edu: { school: string; degree: string; period: string; detail: string }) {
    updateStudent({ education: [...s.education, edu] })
    toast.success('Education added')
  }

  function handleEditEducation(i: number, edu: { school: string; degree: string; period: string; detail: string }) {
    const updated = [...s.education]
    updated[i] = edu
    updateStudent({ education: updated })
    toast.success('Education updated')
  }

  function handleDeleteEducation(i: number) {
    removeStudentEducation(i)
    toast.success('Education removed')
  }

  function handleAddProject(proj: { name: string; desc: string; tags: string[] }) {
    addStudentProject(proj)
    toast.success('Project added')
  }

  function handleEditProject(oldName: string, proj: { name: string; desc: string; tags: string[] }) {
    removeStudentProject(oldName)
    addStudentProject(proj)
    toast.success('Project updated')
  }

  function handleDeleteProject(name: string) {
    removeStudentProject(name)
    toast.success('Project removed')
  }

  function handleAddSkill(skill: string) {
    addStudentSkill(skill)
    toast.success('Skill added')
  }

  function handleRemoveSkill(skill: string) {
    removeStudentSkill(skill)
    toast.success('Skill removed')
  }

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

  if (loading) return <ProfileSkeleton />

  return (
    <div className="space-y-6">
      <input ref={resumeInputRef} type="file" accept=".pdf" className="hidden" onChange={handleResumeUpload} />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <ProfileHeader
          student={s}
          userId={user?.id}
          editing={editing}
          editName={editName}
          editHeadline={editHeadline}
          editLocation={editLocation}
          editLinkedin={editLinkedin}
          editGithub={editGithub}
          setEditName={setEditName}
          setEditHeadline={setEditHeadline}
          setEditLocation={setEditLocation}
          setEditLinkedin={setEditLinkedin}
          setEditGithub={setEditGithub}
          handleSaveProfile={handleSaveProfile}
          handleCancelEdit={handleCancelEdit}
          startEditing={() => { setEditName(s.name); setEditHeadline(s.headline); setEditLocation(s.location); setEditing(true) }}
          openToWork={openToWork}
          onToggleOpenToWork={async (v) => {
            setOpenToWork(v)
            const ok = await toggleStudentOpenToWork(v)
            if (ok) toast.success(v ? 'You are now visible in search' : 'Profile hidden from search')
          }}
          bannerTheme={bannerTheme}
          onBannerThemeChange={(g) => { setBannerTheme(g); updateStudent({ bannerTheme: g }) }}
          onResumeDownload={handleDownloadResume}
        />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Left column — 66% */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="about" className="w-full">
            <TabsList className="w-full justify-start gap-0 bg-transparent border-b border-border rounded-none p-0 h-auto">
              <TabsTrigger
                value="about"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground transition-colors px-4 py-2.5"
              >
                About
              </TabsTrigger>
              <TabsTrigger
                value="experience"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground transition-colors px-4 py-2.5"
              >
                Experience
              </TabsTrigger>
              <TabsTrigger
                value="education"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground transition-colors px-4 py-2.5"
              >
                Education
              </TabsTrigger>
              <TabsTrigger
                value="projects"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground transition-colors px-4 py-2.5"
              >
                Projects
              </TabsTrigger>
              <TabsTrigger
                value="skills"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground transition-colors px-4 py-2.5"
              >
                Skills
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-0">
              <AboutTab student={s} onEdit={() => { setEditing(true) }} />
            </TabsContent>

            <TabsContent value="experience" className="mt-0">
              <ExperienceTab
                experience={s.experience}
                onAdd={handleAddExperience}
                onEdit={handleEditExperience}
                onDelete={handleDeleteExperience}
              />
            </TabsContent>

            <TabsContent value="education" className="mt-0">
              <EducationTab
                education={s.education}
                onAdd={handleAddEducation}
                onEdit={handleEditEducation}
                onDelete={handleDeleteEducation}
              />
            </TabsContent>

            <TabsContent value="projects" className="mt-0">
              <ProjectsTab
                projects={s.projects}
                onAdd={handleAddProject}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
              />
            </TabsContent>

            <TabsContent value="skills" className="mt-0">
              <SkillsTab
                skills={s.skills}
                onAdd={handleAddSkill}
                onRemove={handleRemoveSkill}
              />
            </TabsContent>
          </Tabs>

          {/* Referral History */}
          <Card className="w-full overflow-hidden mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Referral History</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {myRequests.length === 0 && <p className="text-sm text-muted-foreground">No referral history yet.</p>}
                {myRequests.map((r) => {
                  const p = professionals.find((x) => x.id === r.professionalId)
                  if (!p) return null
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border p-3.5">
                      <GAvatar name={p.name} color={p.gradient} className="h-9 w-9 text-[10px] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{r.role}</div>
                        <div className="truncate text-xs text-muted-foreground">via {p.name} &middot; {p.company} &middot; {r.date}</div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  )
                })}
                <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                  <Link to="/job-seeker/applications">View full history</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Certifications & Achievements */}
          <div className="grid gap-6 sm:grid-cols-2 mt-6">
            <Card className="w-full overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base min-w-0">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">Certifications</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2.5">
                {s.certifications.length === 0 && <p className="text-sm text-muted-foreground">No certifications yet.</p>}
                {s.certifications.map((c) => (
                  <div key={c} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate break-words">{c}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="w-full overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base min-w-0">
                  <Award className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">Achievements</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2.5">
                {s.achievements.length === 0 && <p className="text-sm text-muted-foreground">No achievements yet.</p>}
                {s.achievements.map((a) => (
                  <div key={a} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate break-words">{a}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Career Preferences */}
          <Card className="w-full overflow-hidden mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base min-w-0">
                <Briefcase className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Career Preferences</span>
              </CardTitle>
              {!showCareerEdit && (
                <Button data-slot="card-action" variant="ghost" size="sm" className="h-8 text-primary" onClick={() => setShowCareerEdit(true)}>
                  Edit
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
                    <Button size="sm" className="rounded-full bg-primary" onClick={handleSaveCareer}>Save</Button>
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Expected salary</span>
                    <span className="font-semibold text-right break-words">{s.expectedSalary || <span className="text-xs text-muted-foreground">Not set</span>}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Languages</span>
                    <span className="text-right font-medium break-words">{s.languages.length > 0 ? s.languages.join(', ') : <span className="text-xs text-muted-foreground">Not set</span>}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Job Preferences */}
          <Card className="w-full overflow-hidden mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base min-w-0">
                <Briefcase className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Job Preferences</span>
              </CardTitle>
              {!showJobPrefEdit && (
                <Button data-slot="card-action" variant="ghost" size="sm" className="h-8 text-primary" onClick={() => setShowJobPrefEdit(true)}>
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-sm">
              {showJobPrefEdit ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notice period</label>
                      <select className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" value={editNoticePeriod} onChange={(e) => setEditNoticePeriod(e.target.value)}>
                        <option value="">Select notice period</option>
                        <option value="Immediately available">Immediately available</option>
                        <option value="Within 15 days">Within 15 days</option>
                        <option value="Within 30 days">Within 30 days</option>
                        <option value="Within 60 days">Within 60 days</option>
                        <option value="Within 90 days">Within 90 days</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Work preference</label>
                      <select className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" value={editWorkPreference} onChange={(e) => setEditWorkPreference(e.target.value)}>
                        <option value="">Select work preference</option>
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="On-site">On-site</option>
                        <option value="Flexible">Flexible</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why I'm a fit</label>
                    <textarea className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none" rows={3} placeholder="e.g. 3 years building React apps at a fintech..." value={editWhyFit} onChange={(e) => setEditWhyFit(e.target.value)} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="rounded-full bg-primary" onClick={handleSaveJobPrefs}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelJobPrefEdit}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Notice period</span>
                    <span className="font-semibold text-right break-words">{s.noticePeriod || <span className="text-xs text-muted-foreground">Not set</span>}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Work preference</span>
                    <span className="font-semibold text-right break-words">{s.workPreference || <span className="text-xs text-muted-foreground">Not set</span>}</span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why I'm a fit</div>
                    {s.whyFit ? (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground break-words">{s.whyFit}</p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">Not set</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Resume */}
          <Card className="w-full overflow-hidden mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Resume</span>
              </CardTitle>
              <div data-slot="card-action" className="flex items-center gap-1 shrink-0">
                {s.resumeFile && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" onClick={() => setShowResumeConfirm(true)}>
                    <span className="sr-only">Delete</span>
                    <span className="text-xs">X</span>
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-8 text-primary" onClick={() => resumeInputRef.current?.click()}>
                  Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-xl border border-dashed border-border p-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/30">
                {resumeUploading ? (
                  <>
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="mt-2 text-sm font-medium text-primary">Uploading...</p>
                  </>
                ) : (
                  <>
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium break-words">Drop your PDF here or click to upload</p>
                    <p className="mt-1 text-xs text-muted-foreground">PDF, max 10 MB</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => resumeInputRef.current?.click()}>
                      Choose file
                    </Button>
                  </>
                )}
              </div>
              {s.resumeFile ? (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-border p-3.5">
                  <FileText className="h-8 w-8 text-rose-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.resumeFile.name}</div>
                    <div className="text-xs text-muted-foreground">{s.resumeFile.size} &middot; Uploaded {s.resumeFile.date}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {s.resumeFile.url && (
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={() => setShowResumePreview(true)}>
                        Preview
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleDownloadResume}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-border p-3.5">
                  <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
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

        {/* Right column — 33%, sticky */}
        <div className="lg:col-span-1">
          <ProfileSidebar
            profileCompletion={s.profileCompletion}
            resumeFile={s.resumeFile}
            hasExperience={s.experience.length > 0}
            hasEducation={s.education.length > 0}
            headline={s.headline}
          />
        </div>
      </div>
    </div>
  )
}
