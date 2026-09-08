# AGENTS.md — DirectRefer Project

## Project Overview
DirectRefer is a professional referral platform built with React 19, TypeScript, Vite, Tailwind CSS, and Supabase.

## Tech Stack
- **Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS 3, shadcn/ui
- **State:** TanStack Query (server state), Zustand (client state), Context API (legacy)
- **Forms:** React Hook Form + Zod
- **Routing:** React Router v7
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Deployment:** Vercel (auto-deploy from `main` branch)

## Code Conventions
- **Imports:** Use `@/` path alias for `src/` imports
- **Components:** shadcn/ui primitives in `src/components/ui/`, custom in `src/components/`
- **Atomic design:** `atoms/`, `molecules/`, `organisms/` barrel exports in `src/components/`
- **Hooks:** Custom hooks in `src/hooks/`, React Query hooks in `src/hooks/useQueryHooks.ts`
- **Types:** Domain types in `src/types/domain.ts`, mock types in `src/data/mock.ts`
- **Styling:** Tailwind CSS with `cn()` utility (clsx + tailwind-merge)
- **No comments** in code unless explicitly requested

## Key Files
- `src/main.tsx` — Entry point with QueryClient provider
- `src/App.tsx` — Route definitions
- `src/context/AppContext.tsx` — Global state (legacy, migrating to Zustand/React Query)
- `src/lib/db.ts` — Supabase CRUD helpers
- `src/lib/v2/` — V2 modules (trust, screening, matching, state history)
- `v2-schema/` — Database schema, migration, seed data

## Workflow
1. Inspect → Change → Test → Build → Commit → Push
2. Run `npm run build` before committing (TypeScript + Vite build)
3. Run `npx eslint src --quiet` to check for errors
4. Never commit secrets or API keys
5. Vercel auto-deploys on push to `main`

## V2 Features (Active)
- Trust scoring (trust_scores table, TrustBadge component)
- Skill matching (profile_skills, MatchScore component)
- Screening (screening_criteria, screening_attempts)
- State history (immutable audit trail)
- Applications tracking
