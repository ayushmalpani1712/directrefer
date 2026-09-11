import { useState } from 'react'
import {
  MapPin, Pencil, Linkedin, Github, Globe, Palette, Share2, Download, CheckCircle2, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { GAvatar } from '@/components/ui-kit'
import { TrustBadge } from '@/components/TrustBadge'
import { BannerColorModal } from '@/components/BannerColorModal'
import { cn, getBannerStyle } from '@/lib/utils'
import type { StudentProfile } from '@/context/AppContext'

interface ProfileHeaderProps {
  student: StudentProfile
  userId?: string
  editing: boolean
  editName: string
  editHeadline: string
  editLocation: string
  editLinkedin: string
  editGithub: string
  setEditName: (v: string) => void
  setEditHeadline: (v: string) => void
  setEditLocation: (v: string) => void
  setEditLinkedin: (v: string) => void
  setEditGithub: (v: string) => void
  handleSaveProfile: () => void
  handleCancelEdit: () => void
  startEditing: () => void
  openToWork: boolean
  onToggleOpenToWork: (v: boolean) => void
  bannerTheme: string | null
  onBannerThemeChange: (g: string | null) => void
  resumeFile?: StudentProfile['resumeFile']
  onResumeDownload: () => void
}

export function ProfileHeader({
  student: s,
  userId,
  editing,
  editName, editHeadline, editLocation, editLinkedin, editGithub,
  setEditName, setEditHeadline, setEditLocation, setEditLinkedin, setEditGithub,
  handleSaveProfile, handleCancelEdit, startEditing,
  openToWork, onToggleOpenToWork,
  bannerTheme, onBannerThemeChange,
  onResumeDownload,
}: ProfileHeaderProps) {
  const [bannerModalOpen, setBannerModalOpen] = useState(false)
  const bs = getBannerStyle(userId, bannerTheme)

  return (
    <Card className="w-full overflow-hidden">
      <div className="relative h-48 sm:h-52" style={bs.style}>
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
      <BannerColorModal
        open={bannerModalOpen}
        onOpenChange={setBannerModalOpen}
        value={bannerTheme}
        onChange={(g) => { onBannerThemeChange(g) }}
      />

      <CardContent className="relative px-4 pb-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4 min-w-0">
            <div className="-mt-14 shrink-0">
              <GAvatar
                name={s.name}
                color={s.gradient}
                className="h-24 w-24 border-4 border-card text-2xl"
              />
            </div>
            <div className="pb-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight truncate">
                  {editing ? (
                    <input
                      className="w-full bg-transparent border-b border-primary outline-none text-xl sm:text-2xl font-bold placeholder:text-muted-foreground/30"
                      placeholder="Your full name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  ) : s.name}
                </h1>
                <TrustBadge tier="verified" />
              </div>
              {editing ? (
                <input
                  className="mt-0.5 w-full bg-transparent border-b border-muted-foreground/30 outline-none text-sm text-muted-foreground placeholder:text-muted-foreground/40"
                  placeholder="e.g. Software Engineer | React & Node.js"
                  value={editHeadline}
                  onChange={(e) => setEditHeadline(e.target.value)}
                />
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground truncate">{s.headline}</p>
              )}
              <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground min-w-0">
                {editing ? (
                  <input
                    className="bg-transparent border-b border-muted-foreground/30 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40"
                    placeholder="e.g. Pune, India"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                  />
                ) : (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground transition-colors truncate"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0" /> {s.location}
                  </a>
                )}
                <div className="h-3.5 w-px bg-border" />
                <div
                  role="presentation"
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3 py-1 transition-colors text-xs font-medium',
                    openToWork ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' : 'border-border text-muted-foreground'
                  )}
                >
                  <Switch
                    checked={openToWork}
                    onCheckedChange={onToggleOpenToWork}
                  />
                  <span className={cn(
                    'text-sm font-medium',
                    openToWork ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                  )}>Open to work</span>
                </div>
              </div>
              {editing && (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Linkedin className="h-3.5 w-3.5 text-[#0A66C2] shrink-0" />
                    <input
                      className="w-full sm:w-56 bg-transparent border-b border-muted-foreground/30 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40"
                      placeholder="e.g. linkedin.com/in/yourname"
                      value={editLinkedin}
                      onChange={(e) => setEditLinkedin(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Github className="h-3.5 w-3.5 shrink-0" />
                    <input
                      className="w-full sm:w-56 bg-transparent border-b border-muted-foreground/30 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40"
                      placeholder="e.g. github.com/yourname"
                      value={editGithub}
                      onChange={(e) => setEditGithub(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:pb-0.5 shrink-0">
            {editing ? (
              <>
                <Button variant="outline" size="sm" className="rounded-full" onClick={handleCancelEdit}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
                </Button>
                <Button size="sm" className="rounded-full" onClick={handleSaveProfile}>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" className="rounded-full" onClick={startEditing}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Profile
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
                  <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share Profile
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={onResumeDownload}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download Resume
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm min-w-0">
          {s.links.linkedin ? (
            <a
              href={s.links.linkedin.startsWith('http') ? s.links.linkedin : `https://linkedin.com/in/${s.links.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <Linkedin className="h-4 w-4 text-[#0A66C2]" /> LinkedIn
            </a>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 bg-background px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors shrink-0"
            >
              <Linkedin className="h-4 w-4" /> Add LinkedIn
            </button>
          )}
          {s.links.github ? (
            <a
              href={s.links.github.startsWith('http') ? s.links.github : `https://github.com/${s.links.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 bg-background px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors shrink-0"
            >
              <Github className="h-4 w-4" /> Add GitHub
            </button>
          )}
          {s.links.website ? (
            <a
              href={s.links.website.startsWith('http') ? s.links.website : `https://${s.links.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <Globe className="h-4 w-4 text-primary" /> Website
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
