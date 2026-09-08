// ============================================================================
// DirectRefer V2.0 — Professional Onboarding Checklist
// ============================================================================
// Guides new professionals through completing their V2 profile.
// ============================================================================

import { useState } from 'react'
import { Link } from 'react-router'
import { CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'

interface ChecklistItem {
  id: string
  label: string
  description: string
  href: string
  done: boolean
}

export function OnboardingChecklist() {
  const { professionals } = useApp()
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('v2_onboarding_dismissed') === 'true'
  )

  const pro = professionals.find(p => p.id === user?.id)

  const items: ChecklistItem[] = [
    {
      id: 'bio',
      label: 'Write a bio',
      description: 'Tell candidates what you do and how you can help',
      href: '/professional/profile',
      done: (pro?.bio?.length ?? 0) > 50,
    },
    {
      id: 'skills',
      label: 'Add your skills',
      description: 'Help candidates find you by matching their needs',
      href: '/professional/profile',
      done: (pro?.skills?.length ?? 0) >= 3,
    },
    {
      id: 'open_positions',
      label: 'List open positions',
      description: 'Show candidates which roles you can refer for',
      href: '/professional/profile',
      done: (pro?.openPositions?.length ?? 0) > 0,
    },
    {
      id: 'referral_policy',
      label: 'Set referral policy',
      description: 'Let candidates know your referral criteria',
      href: '/professional/profile',
      done: (pro?.referralPolicy?.length ?? 0) > 0,
    },
    {
      id: 'availability',
      label: 'Set availability',
      description: 'Toggle open for referrals to receive requests',
      href: '/professional/profile',
      done: pro?.openForReferrals === true,
    },
  ]

  const completedCount = items.filter(i => i.done).length
  const allDone = completedCount === items.length

  if (dismissed || allDone) return null

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Complete your profile</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {completedCount}/{items.length} steps done — a complete profile gets 3x more referral requests
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.setItem('v2_onboarding_dismissed', 'true')
              setDismissed(true)
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                item.done
                  ? 'text-muted-foreground'
                  : 'hover:bg-muted'
              )}
            >
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              )}
              <div className="flex-1 min-w-0">
                <span className={cn('font-medium', item.done && 'line-through opacity-60')}>
                  {item.label}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">{item.description}</span>
              </div>
              {!item.done && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
