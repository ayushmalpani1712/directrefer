import { type ReactNode } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Star, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { initials, type ReferralStatus } from '@/data/mock'

// ── Gradient avatar (local, always renders) ─────────────────
export function GAvatar({ name, gradient, className, ring }: { name: string; gradient: string; className?: string; ring?: boolean }) {
  return (
    <div
      className={cn(
        'flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white',
        gradient,
        ring && 'ring-2 ring-background',
        className ?? 'h-10 w-10 text-sm',
      )}
    >
      {initials(name)}
    </div>
  )
}

// ── Company chip ────────────────────────────────────────────
export function CompanyChip({ name, className }: { name: string; className?: string }) {
  return (
    <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-slate-700 to-slate-900 text-[10px] font-bold text-white dark:from-slate-200 dark:to-slate-400 dark:text-slate-900', className)}>
      {name.replace(/[^A-Za-z ]/g, '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
    </div>
  )
}

// ── Stars ───────────────────────────────────────────────────
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn('h-3.5 w-3.5', i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted')} />
      ))}
    </span>
  )
}

// ── Status badge ────────────────────────────────────────────
const STATUS_STYLES: Record<ReferralStatus, { label: string; cls: string; dot: string }> = {
  pending: { label: 'Pending', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25', dot: 'bg-amber-500' },
  accepted: { label: 'Accepted', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-500' },
  rejected: { label: 'Declined', cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25', dot: 'bg-rose-500' },
  offered: { label: 'Offer', cls: 'bg-primary/10 text-primary border-primary/25', dot: 'bg-primary' },
  hired: { label: 'Hired', cls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25', dot: 'bg-violet-500' },
}

export function StatusBadge({ status }: { status: ReferralStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', s.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </Badge>
  )
}

// ── Stat card ───────────────────────────────────────────────
export function StatCard({
  icon: Icon, label, value, delta, deltaLabel, spark, delay: _delay, href,
}: {
  icon: LucideIcon; label: string; value: string | number; delta?: number; deltaLabel?: string; spark?: ReactNode; delay?: number; href?: string
}) {
  const inner = (
    <div className="h-full transition-all duration-200">
      <Card className={cn('shadow-soft flex h-full flex-col transition-all duration-200', href && 'hover:border-primary/15 hover:translate-y-[-1px]')}>
        <CardContent className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-[18px] w-[18px]" />
            </div>
            {delta !== undefined && (
              <span className={cn('inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium', delta >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500')}>
                {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(delta)}%
              </span>
            )}
          </div>
          <div className="mt-3 truncate text-[34px] font-bold leading-none tracking-tight text-foreground">{value}</div>
          <div className="mt-1.5 truncate text-[14px] text-muted-foreground">{label}{deltaLabel ? <span className="text-muted-foreground/50"> · {deltaLabel}</span> : null}</div>
          {spark && <div className="mt-3">{spark}</div>}
        </CardContent>
      </Card>
    </div>
  )

  if (href) return <Link to={href} className="block">{inner}</Link>
  return inner
}

// ── Section header ──────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[22px] font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[14px] text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Empty state ─────────────────────────────────────────────

export interface EmptyStateProps {
  /** Legacy: Lucide icon fallback when no illustration is provided */
  icon?: LucideIcon
  /** Full SVG illustration component (replaces the icon circle) */
  illustration?: ReactNode
  title: string
  description: string
  /** Legacy: pass a full button/link node */
  action?: ReactNode
  /** Primary CTA text — renders a styled Button linking to primaryCtaHref */
  primaryCtaLabel?: string
  /** Route or external URL for the primary CTA */
  primaryCtaHref?: string
  /** Click handler for primary CTA (used instead of href for modals/drawers) */
  onPrimaryCtaClick?: () => void
  /** Secondary CTA text (ghost button) */
  secondaryCtaLabel?: string
  /** Click handler for secondary CTA */
  onSecondaryCtaClick?: () => void
  /** Allow removing the dashed border for inline contexts */
  bordered?: boolean
}

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  primaryCtaLabel,
  primaryCtaHref,
  onPrimaryCtaClick,
  secondaryCtaLabel,
  onSecondaryCtaClick,
  bordered = true,
}: EmptyStateProps) {
  const hasPrimary = primaryCtaLabel && (primaryCtaHref || onPrimaryCtaClick)

  const primaryButton = primaryCtaLabel && primaryCtaHref ? (
    <Button className="rounded-full bg-gradient-to-r from-[#4F7CFF] to-[#7C5CFF] text-white shadow-sm hover:opacity-90" asChild>
      <Link to={primaryCtaHref}>{primaryCtaLabel}</Link>
    </Button>
  ) : primaryCtaLabel && onPrimaryCtaClick ? (
    <Button className="rounded-full bg-gradient-to-r from-[#4F7CFF] to-[#7C5CFF] text-white shadow-sm hover:opacity-90" onClick={onPrimaryCtaClick}>
      {primaryCtaLabel}
    </Button>
  ) : null

  const secondaryButton = secondaryCtaLabel && onSecondaryCtaClick ? (
    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onSecondaryCtaClick}>
      {secondaryCtaLabel}
    </Button>
  ) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl py-16 text-center',
        bordered && 'border border-dashed border-border/60',
      )}
    >
      {illustration ? (
        <div className="relative">{illustration}</div>
      ) : Icon ? (
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/8">
            <Icon className="h-7 w-7 text-primary/60" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background bg-primary/20" />
        </div>
      ) : null}
      <h3 className="mt-5 text-[15px] font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      {(action || hasPrimary || secondaryButton) && (
        <div className="mt-5 flex flex-col items-center gap-2.5 sm:flex-row">
          {action}
          {primaryButton}
          {secondaryButton}
        </div>
      )}
    </motion.div>
  )
}

// ── Progress ring ───────────────────────────────────────────
export function ProgressRing({ value, size = 64, stroke = 5, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeLinecap="round"
          className="fill-none stroke-primary"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * value) / 100 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold">{value}%</span>
        {label && <span className="text-[8px] text-muted-foreground">{label}</span>}
      </div>
    </div>
  )
}

// ── Skill chip ──────────────────────────────────────────────
export function Chip({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'primary' | 'outline' }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      tone === 'default' && 'bg-muted text-muted-foreground',
      tone === 'primary' && 'bg-primary/10 text-primary',
      tone === 'outline' && 'border border-border text-muted-foreground',
    )}>
      {children}
    </span>
  )
}

// ── Report User Dialog ───────────────────────────────────────

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { createReport } from '@/lib/db'
import { checkRateLimit, checkServerRateLimit } from '@/lib/rateLimit'

const REPORT_REASONS = [
  'Spam or fake profile',
  'Inappropriate content',
  'Harassment or abuse',
  'Scam or fraud',
  'Wrong role / impersonation',
  'Other',
]

export function ReportDialog({ targetUserId, targetUserName }: { targetUserId: string; targetUserName: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason')
      return
    }
    if (!checkRateLimit('report-submit', 3, 300_000)) {
      toast.error('Too many reports. Please wait 5 minutes before reporting again.')
      return
    }
    if (!await checkServerRateLimit('report', 3, 300)) {
      toast.error('Report rate limit exceeded. Please wait before reporting again.')
      return
    }
    setLoading(true)
    try {
      const ok = await createReport(targetUserId, reason, description)
      if (ok) {
        toast.success('Report submitted. Our team will review it.')
        setOpen(false)
        setReason('')
        setDescription('')
      } else {
        toast.error('Failed to submit report')
      }
    } catch {
      toast.error('Failed to submit report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-rose-500">
          <Flag className="h-3.5 w-3.5" /> Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {targetUserName}</DialogTitle>
          <DialogDescription>Help us keep the community safe. Your report is anonymous.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left text-sm transition-all',
                  reason === r ? 'border-rose-500 bg-rose-500/10 text-rose-500' : 'border-border hover:border-muted-foreground/30',
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Additional details (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="bg-rose-500 hover:bg-rose-600" onClick={handleSubmit} disabled={loading || !reason}>
            {loading ? 'Submitting...' : 'Submit report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
