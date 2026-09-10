# Implementation Plan: Admin Screening & Impersonation Features

## Overview
Implement 4 admin features: screening review queue (ADMIN-005), video review component (ADMIN-006), reviewer scoring interface (ADMIN-007), and admin impersonation capability (ADMIN-014).

## Architecture Decisions
- All pages follow existing admin patterns: `src/pages/admin/` directory, `AdminShell` nav integration, lazy-loaded via `App.tsx`
- Use existing Supabase client, `sonner` toasts, `framer-motion` animations, shadcn/ui components
- Screen attempts table uses `DataTable` component where possible, manual card layouts for complex interactions
- No VideoPlayer component exists — ADMIN-006 creates a self-contained `AdminVideoReview` with native HTML5 video
- Impersonation uses `localStorage` for state + Supabase admin_logs for audit trail
- All DB queries follow existing patterns from `RecruiterScreening.tsx` and `Approvals.tsx`

## Task List

### Task 1: Screening Review Queue (ADMIN-005)
- [ ] Create `src/pages/admin/ScreeningQueue.tsx` with table of all screening attempts
- [ ] Add filters: status tabs, search, date range, score range
- [ ] Bulk select with approve/reject actions
- [ ] Links to candidate profile and job detail
- [ ] Real-time updates via Supabase subscription
- [ ] Register route `/admin/screening` in `App.tsx`
- [ ] Add nav item in `AdminShell.tsx`

### Task 2: Video Review Component (ADMIN-006)
- [ ] Create `src/components/AdminVideoReview.tsx`
- [ ] Native HTML5 video player with admin controls
- [ ] Review notes overlay, timestamp-based note taking
- [ ] Approve/reject buttons below video
- [ ] Link to candidate profile
- [ ] Store notes in `screening_attempts.evidence`

### Task 3: Reviewer Scoring Interface (ADMIN-007)
- [ ] Create `src/pages/admin/ReviewerScoring.tsx`
- [ ] List of screening attempts awaiting review
- [ ] Per-attempt scoring form: score slider (0-100), quality tier dropdown, notes textarea
- [ ] Side-by-side: candidate resume preview + screening answers
- [ ] Previous review history
- [ ] Register route `/admin/scoring` in `App.tsx`
- [ ] Add nav item in `AdminShell.tsx`

### Task 4: Impersonation Capability (ADMIN-014)
- [ ] Create `src/lib/impersonation.ts` with start/stop/isImpersonating functions
- [ ] Create `src/components/ImpersonationBanner.tsx` fixed top banner
- [ ] Log impersonation to `admin_logs`
- [ ] Render banner in `App.tsx` when impersonating

### Checkpoint: Complete
- [ ] All files created with proper TypeScript types
- [ ] Routes registered, nav items added
- [ ] Build passes
