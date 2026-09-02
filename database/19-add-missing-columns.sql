-- =============================================================
-- Migration 19: Add missing columns
-- 1. profiles_professional.skills — referenced throughout the
--    app but never created via migration.
-- 2. referrals.created_at — referenced in System Health queries.
-- =============================================================

-- 1. skills column on profiles_professional (text[], used everywhere)
ALTER TABLE public.profiles_professional
  ADD COLUMN IF NOT EXISTS skills text[];

-- 2. created_at on referrals (if missing)
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
