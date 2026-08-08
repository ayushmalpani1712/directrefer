import { cn } from '@/lib/utils'

interface IllustrationProps {
  className?: string
  size?: number
}

// ── Referrals illustration ──────────────────────────────────
export function ReferralIllustration({ className, size = 120 }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={cn('', className)} aria-hidden="true">
      {/* Background circle */}
      <circle cx="60" cy="60" r="56" fill="hsl(var(--primary) / 0.06)" stroke="hsl(var(--primary) / 0.12)" strokeWidth="1" />

      {/* Document / referral form */}
      <rect x="35" y="28" width="50" height="64" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <rect x="42" y="38" width="28" height="3" rx="1.5" fill="hsl(var(--primary) / 0.25)" />
      <rect x="42" y="46" width="20" height="2.5" rx="1.25" fill="hsl(var(--muted-foreground) / 0.15)" />
      <rect x="42" y="53" width="36" height="2.5" rx="1.25" fill="hsl(var(--muted-foreground) / 0.15)" />
      <rect x="42" y="60" width="24" height="2.5" rx="1.25" fill="hsl(var(--muted-foreground) / 0.15)" />
      <rect x="42" y="67" width="32" height="2.5" rx="1.25" fill="hsl(var(--muted-foreground) / 0.15)" />
      <rect x="42" y="76" width="16" height="8" rx="4" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1" />

      {/* Send arrow */}
      <circle cx="82" cy="36" r="14" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary) / 0.2)" strokeWidth="1" />
      <path d="M78 36L84 30M78 36L84 42M84 36H76" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Subtle person avatar */}
      <circle cx="38" cy="90" r="8" fill="hsl(var(--secondary) / 0.12)" stroke="hsl(var(--secondary) / 0.2)" strokeWidth="1" />
      <circle cx="38" cy="88" r="3" fill="hsl(var(--secondary) / 0.2)" />
      <path d="M33 94c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="hsl(var(--secondary) / 0.2)" strokeWidth="1" fill="none" />
    </svg>
  )
}

// ── Messages illustration ───────────────────────────────────
export function MessageIllustration({ className, size = 120 }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={cn('', className)} aria-hidden="true">
      {/* Background circle */}
      <circle cx="60" cy="60" r="56" fill="hsl(var(--primary) / 0.06)" stroke="hsl(var(--primary) / 0.12)" strokeWidth="1" />

      {/* Left chat bubble */}
      <rect x="24" y="34" width="40" height="30" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <path d="M30 64l4 8-8-2" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="32" y="43" width="24" height="2.5" rx="1.25" fill="hsl(var(--muted-foreground) / 0.15)" />
      <rect x="32" y="49" width="18" height="2.5" rx="1.25" fill="hsl(var(--muted-foreground) / 0.15)" />
      <rect x="32" y="55" width="28" height="2.5" rx="1.25" fill="hsl(var(--primary) / 0.15)" />

      {/* Right chat bubble (reply) */}
      <rect x="52" y="56" width="44" height="28" rx="10" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--primary) / 0.15)" strokeWidth="1.5" />
      <path d="M90 84l-4 8 8-2" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--primary) / 0.15)" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="60" y="65" width="28" height="2.5" rx="1.25" fill="hsl(var(--primary) / 0.2)" />
      <rect x="60" y="71" width="20" height="2.5" rx="1.25" fill="hsl(var(--primary) / 0.2)" />
      <rect x="60" y="77" width="24" height="2.5" rx="1.25" fill="hsl(var(--primary) / 0.2)" />

      {/* Typing indicator dots */}
      <circle cx="66" cy="98" r="2.5" fill="hsl(var(--primary) / 0.3)" />
      <circle cx="72" cy="98" r="2.5" fill="hsl(var(--primary) / 0.2)" />
      <circle cx="78" cy="98" r="2.5" fill="hsl(var(--primary) / 0.1)" />
    </svg>
  )
}

// ── Jobs illustration ───────────────────────────────────────
export function JobIllustration({ className, size = 120 }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={cn('', className)} aria-hidden="true">
      {/* Background circle */}
      <circle cx="60" cy="60" r="56" fill="hsl(var(--primary) / 0.06)" stroke="hsl(var(--primary) / 0.12)" strokeWidth="1" />

      {/* Briefcase body */}
      <rect x="30" y="42" width="60" height="40" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />

      {/* Briefcase handle */}
      <path d="M48 42V34c0-2.21 1.79-4 4-4h16c2.21 0 4 1.79 4 4v8" stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" />

      {/* Clasp */}
      <rect x="54" y="56" width="12" height="8" rx="2" fill="hsl(var(--primary) / 0.12)" stroke="hsl(var(--primary) / 0.25)" strokeWidth="1" />
      <circle cx="60" cy="60" r="1.5" fill="hsl(var(--primary) / 0.4)" />

      {/* Job posting lines */}
      <rect x="38" y="72" width="18" height="2.5" rx="1.25" fill="hsl(var(--muted-foreground) / 0.12)" />
      <rect x="64" y="72" width="18" height="2.5" rx="1.25" fill="hsl(var(--muted-foreground) / 0.12)" />

      {/* Plus badge */}
      <circle cx="86" cy="36" r="12" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary) / 0.2)" strokeWidth="1" />
      <path d="M86 30v12M80 36h12" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />

      {/* Small document */}
      <rect x="22" y="84" width="18" height="22" rx="3" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" />
      <rect x="26" y="90" width="10" height="2" rx="1" fill="hsl(var(--muted-foreground) / 0.12)" />
      <rect x="26" y="95" width="8" height="2" rx="1" fill="hsl(var(--muted-foreground) / 0.12)" />
      <rect x="26" y="100" width="12" height="2" rx="1" fill="hsl(var(--primary) / 0.15)" />
    </svg>
  )
}

// ── Inbox / requests illustration ───────────────────────────
export function InboxIllustration({ className, size = 120 }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={cn('', className)} aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="hsl(var(--primary) / 0.06)" stroke="hsl(var(--primary) / 0.12)" strokeWidth="1" />

      {/* Inbox tray */}
      <path d="M28 50h64c2.21 0 4 1.79 4 4v24c0 2.21-1.79 4-4 4H28c-2.21 0-4-1.79-4-4V54c0-2.21 1.79-4 4-4z" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <path d="M28 50l8-14h48l8 14" stroke="hsl(var(--border))" strokeWidth="1.5" fill="hsl(var(--card))" strokeLinejoin="round" />

      {/* Inbox slot lines */}
      <rect x="36" y="58" width="48" height="2.5" rx="1.25" fill="hsl(var(--primary) / 0.12)" />
      <rect x="42" y="64" width="36" height="2.5" rx="1.25" fill="hsl(var(--muted-foreground) / 0.1)" />
      <rect x="38" y="70" width="44" height="2.5" rx="1.25" fill="hsl(var(--muted-foreground) / 0.08)" />

      {/* Envelope floating above */}
      <rect x="42" y="26" width="36" height="24" rx="4" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--primary) / 0.15)" strokeWidth="1" />
      <path d="M42 30l18 12 18-12" stroke="hsl(var(--primary) / 0.2)" strokeWidth="1" fill="none" />

      {/* Notification dot */}
      <circle cx="82" cy="32" r="5" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1" />
      <text x="82" y="35" textAnchor="middle" fontSize="8" fontWeight="bold" fill="hsl(var(--primary))">!</text>
    </svg>
  )
}
