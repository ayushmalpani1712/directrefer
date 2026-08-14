import { GraduationCap, MapPin, ShieldCheck, Sparkles, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Chip } from '@/components/ui-kit'
import type { ReferralRequest } from '@/data/mock'
import { cn } from '@/lib/utils'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{children}</span>
    </div>
  )
}

function AffinityBadge({ candidate }: { candidate: NonNullable<ReferralRequest['candidate']> }) {
  const bits: { label: string; tone: string }[] = []
  if (candidate.college) bits.push({ label: candidate.college, tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' })
  if (candidate.workPreference) bits.push({ label: candidate.workPreference, tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' })

  if (bits.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Affinity</span>
      {bits.map((b) => (
        <Badge key={b.label} variant="outline" className={cn('font-medium', b.tone)}>{b.label}</Badge>
      ))}
    </div>
  )
}

/**
 * Standardized candidate card for the referrer feed.
 * Order: Target Role → Experience → Skills → Location → Notice Period → Resume → Why Fit → Affinity → Match explanation.
 */
export default function CandidateCard({ request }: { request: ReferralRequest }) {
  const c = request.candidate
  const experience = c?.experience ?? []
  const skills = c?.skills ?? []
  const hasBasics = c && (!!c.headline || !!c.noticePeriod || !!c.whyFit || skills.length > 0 || experience.length > 0)

  if (!c || !hasBasics) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3.5 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> This candidate hasn't completed a structured profile yet.</p>
        <p className="mt-1 text-muted-foreground/70">Their message and resume (if attached) below are the best signal.</p>
      </div>
    )
  }

  const roleLine = c.headline || request.role

  return (
    <div className="mt-3 rounded-xl border border-primary/15 bg-primary/[0.02] p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
        <ShieldCheck className="h-3.5 w-3.5" /> Candidate snapshot
      </div>

      <div className="mt-2 space-y-1">
        <Row label="Target role">{roleLine}</Row>

        {experience.length > 0 && (
          <Row label="Experience">
            {experience.slice(0, 2).map((e) => (
              <div key={`${e.title}-${e.org}`} className="text-right">
                <div className="font-semibold">{e.title}</div>
                <div className="text-xs text-muted-foreground">{e.org}</div>
              </div>
            ))}
          </Row>
        )}

        {skills.length > 0 && (
          <div className="py-1.5">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skills</div>
            <div className="flex flex-wrap justify-end gap-1.5">
              {skills.slice(0, 8).map((s) => <Chip key={s}>{s}</Chip>)}
              {skills.length > 8 && <Chip>+{skills.length - 8} more</Chip>}
            </div>
          </div>
        )}

        {c.education && c.education.length > 0 && (
          <Row label="Education">
            <span className="flex items-center justify-end gap-1">
              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
              {c.education[0].degree} · {c.education[0].school}
            </span>
          </Row>
        )}

        {c.noticePeriod && <Row label="Notice period">{c.noticePeriod}</Row>}

        <div className="py-1.5">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resume</div>
          <div className="text-right">
            {request.studentResumeUrl ? (
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Attached — view below</span>
            ) : (
              <span className="text-xs text-muted-foreground">Not uploaded</span>
            )}
          </div>
        </div>

        {c.whyFit && (
          <div className="mt-1 rounded-lg bg-background/60 p-2.5 text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Why they're a fit: </span>{c.whyFit}
          </div>
        )}

        <AffinityBadge candidate={c} />
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
        <MapPin className="h-3 w-3" /> This snapshot is shown so you can decide quickly — contacts stay private until you accept.
      </div>

      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary/5 p-2 text-[11px] text-muted-foreground">
        <Sparkles className="h-3 w-3 shrink-0 text-primary" />
        <span>Match: request targets <b className="text-foreground">{request.role}</b> — review skills &amp; experience above to gauge fit.</span>
      </div>
    </div>
  )
}
