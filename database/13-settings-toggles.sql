-- ============================================================
-- FIX: Settings Toggles — Public Profile + Activity Status
-- Run in: Supabase SQL Editor
-- ============================================================

-- 1. Add public_profile column to users (default true = visible)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS public_profile boolean DEFAULT true;

-- 2. Add activity_status column to users (default true = visible)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS activity_status boolean DEFAULT true;

-- 3. Backfill existing users to have public_profile = true
UPDATE public.users SET public_profile = true WHERE public_profile IS NULL;
UPDATE public.users SET activity_status = true WHERE activity_status IS NULL;

-- 4. Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('public_profile', 'activity_status');
