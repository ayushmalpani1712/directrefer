// ============================================================================
// DirectRefer V2.0 — Layout Components
// ============================================================================
// Layout wrappers for different page contexts.
// ============================================================================

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ── Auth Layout ─────────────────────────────────────────────────────────────
// Centered card for login, signup, verification pages.

export function AuthLayout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-h-screen bg-background flex items-center justify-center px-4 py-12', className)}>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}

// ── Public Layout ───────────────────────────────────────────────────────────
// Simplified nav for public-facing pages (landing, job board, public profiles).

export function PublicLayout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
}

// ── Dashboard Layout ────────────────────────────────────────────────────────
// Main authenticated layout: sidebar + content area.

export function DashboardLayout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {children}
    </div>
  )
}

// ── Settings Layout ─────────────────────────────────────────────────────────
// Sidebar tabs + content area for settings screens.

export function SettingsLayout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto max-w-4xl min-w-0 overflow-x-hidden space-y-6', className)}>
      {children}
    </div>
  )
}

// ── Wizard Layout ───────────────────────────────────────────────────────────
// Full-width stepper at top, centered content, sticky footer with nav buttons.

export function WizardLayout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-h-screen bg-background flex flex-col', className)}>
      <div className="flex-1 mx-auto w-full max-w-3xl px-4 py-8">
        {children}
      </div>
    </div>
  )
}
