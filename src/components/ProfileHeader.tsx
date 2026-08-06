import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase, Building2, Check, FileText, Github, Globe, Linkedin, MapPin, Pencil, Users, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { GAvatar, CompanyChip } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

/* ── Toggle pill ────────────────────────────────────────────── */
function TogglePill({ checked, onCheckedChange, label, activeLabel }: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label: string
  activeLabel?: string
}) {
  return (
    <label className={cn(
      'flex items-center gap-2.5 rounded-full border px-4 py-2 transition-colors',
      checked ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-transparent'
    )}>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <span className={cn(
        'text-sm font-medium',
        checked ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
      )}>{checked && activeLabel ? activeLabel : label}</span>
    </label>
  )
}

/* ── Social link button ─────────────────────────────────────── */
function SocialLink({ href, icon: Icon, label, color, onAdd }: {
  href?: string
  icon: typeof Linkedin
  label: string
  color?: string
  onAdd?: () => void
}) {
  if (href) {
    const url = href.startsWith('http') ? href : `https://${href}`
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        <Icon className={cn('h-4 w-4', color)} /> {label}
      </a>
    )
  }
  if (onAdd) {
    return (
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 bg-background px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
      >
        <Icon className="h-4 w-4" /> Add {label}
      </button>
    )
  }
  return null
}

/* ── Main component ─────────────────────────────────────────── */
export interface ProfileHeaderProps {
  role: 'student' | 'professional' | 'recruiter'

  // Identity
  name: string
  gradient?: string
  headline?: string          // student: "Software Engineer | React"
  designation?: string       // professional: "Senior Engineer"
  company?: string           // professional: "Google"
  industry?: string          // professional / recruiter
  location?: string
  website?: string
  linkedin?: string
  github?: string

  // Stats (professional only)
  yearsExp?: number

  // Recruiter size
  companySize?: string

  // Toggles
  toggles?: {
    label: string
    checked: boolean
    onCheckedChange: (v: boolean) => void
    activeLabel?: string
  }[]

  // Edit state
  editing: boolean
  onStartEdit?: () => void
  onCancelEdit?: () => void
  onSave?: () => void
  saveDisabled?: boolean
  saveLabel?: string

  // Edit fields (children rendered when editing)
  editFields?: ReactNode

  // Resume (student only)
  onResume?: () => void
}

export function ProfileHeader({
  role,
  name, gradient, headline, designation, company, industry, location, website, linkedin, github,
  yearsExp,
  companySize,
  toggles = [],
  editing,
  onStartEdit, onCancelEdit, onSave, saveDisabled, saveLabel = 'Save',
  editFields,
  onResume,
}: ProfileHeaderProps) {
  const isCompany = role === 'recruiter'

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden">
        {/* Banner */}
        <div className={cn(
          'relative bg-gradient-to-r from-[#3B5FE5] to-[#8B8FD4]',
          isCompany ? 'h-28 sm:h-40 md:h-52' : 'h-24 sm:h-36 md:h-44'
        )}>
          <div className="bg-grid absolute inset-0 opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        <CardContent className="relative px-4 pb-4 sm:px-6 sm:pb-6">
          {/* Top row: avatar + identity + actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-3 sm:gap-4">
              {/* Avatar */}
              <div className={cn(
                'relative',
                isCompany
                  ? '-mt-8 sm:-mt-10 md:-mt-12'
                  : '-mt-10 sm:-mt-12 md:-mt-16'
              )}>
                {isCompany ? (
                  <CompanyChip
                    name={name}
                    className={cn(
                      'rounded-2xl border-4 border-card text-xl',
                      'h-16 w-16 sm:h-20 sm:w-20 sm:text-2xl md:h-24 md:w-24'
                    )}
                  />
                ) : (
                  <GAvatar
                    name={name}
                    gradient={gradient ?? 'from-[#4F7CFF] to-[#7C5CFF]'}
                    className={cn(
                      'border-4 border-card text-xl',
                      'h-20 w-20 sm:h-24 sm:w-24 sm:text-2xl md:h-32 md:w-32 md:text-3xl'
                    )}
                  />
                )}
              </div>

              {/* Identity */}
              <div className="pb-1 min-w-0">
                {/* Name */}
                <h1 className="font-display flex items-center gap-2 text-xl sm:text-2xl font-bold truncate">
                  {name}
                </h1>

                {/* Headline / Designation */}
                {designation ? (
                  <div className="mt-0.5 text-sm text-muted-foreground truncate">
                    {designation}
                    {company && (
                      <>
                        {' at '}
                        {isCompany ? (
                          <CompanyChip name={company} className="inline-flex h-5 w-5 text-[8px] align-middle" />
                        ) : null}
                        {' '}{company}
                      </>
                    )}
                  </div>
                ) : headline ? (
                  <div className="mt-0.5 text-sm text-muted-foreground truncate">{headline}</div>
                ) : null}

                {/* Meta row */}
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {location}
                    </span>
                  )}
                  {industry && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {industry}
                    </span>
                  )}
                  {yearsExp !== undefined && yearsExp > 0 && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      {yearsExp} yrs exp
                    </span>
                  )}
                  {companySize && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {companySize}
                    </span>
                  )}
                  {website && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-primary" />
                      <a
                        href={website.startsWith('http') ? website : `https://${website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate max-w-[160px]"
                      >
                        {website}
                      </a>
                    </span>
                  )}
                  {linkedin && role !== 'recruiter' && (
                    <span className="flex items-center gap-1">
                      <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                      <a
                        href={linkedin.startsWith('http') ? linkedin : `https://linkedin.com/in/${linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0A66C2] hover:underline truncate max-w-[180px]"
                      >
                        {linkedin}
                      </a>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 sm:pb-1 shrink-0">
              {editing ? (
                <>
                  <Button variant="outline" className="rounded-full" onClick={onCancelEdit}>
                    <X className="mr-1.5 h-4 w-4" /> Cancel
                  </Button>
                  <Button className="rounded-full bg-primary shadow-glow" disabled={saveDisabled} onClick={onSave}>
                    <Check className="mr-1.5 h-4 w-4" /> {saveDisabled ? 'Saving...' : saveLabel}
                  </Button>
                </>
              ) : (
                <>
                  {role === 'student' && onResume && (
                    <Button variant="outline" className="rounded-full" onClick={onResume}>
                      <FileText className="mr-1.5 h-4 w-4" /> Resume
                    </Button>
                  )}
                  <Button className="rounded-full bg-primary shadow-glow" onClick={onStartEdit}>
                    <Pencil className="mr-1.5 h-4 w-4" /> Edit profile
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Edit fields (inline inputs) */}
          {editing && editFields && (
            <div className="mt-3">{editFields}</div>
          )}

          {/* Toggles + Social links */}
          <div className={cn(
            'flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-6 sm:gap-y-3',
            role === 'professional' ? 'mt-3 sm:mt-5' : 'mt-5'
          )}>
            {toggles.map((t, i) => (
              <TogglePill key={i} {...t} />
            ))}

            {role === 'student' && (
              <>
                <SocialLink href={linkedin} icon={Linkedin} label="LinkedIn" color="text-[#0A66C2]" onAdd={onStartEdit} />
                <SocialLink href={github} icon={Github} label="GitHub" onAdd={onStartEdit} />
              </>
            )}
            {role === 'professional' && (
              <>
                <SocialLink href={linkedin} icon={Linkedin} label="LinkedIn" color="text-[#0A66C2]" onAdd={onStartEdit} />
                <SocialLink href={github} icon={Github} label="GitHub" onAdd={onStartEdit} />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
