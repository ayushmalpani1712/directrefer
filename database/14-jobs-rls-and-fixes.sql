-- 14 — Jobs Table RLS Policies + Stage Fixes
-- Fixes:
--   1. Enables RLS on jobs table (if not already)
--   2. Public read for active/paused jobs (Browse Jobs, Referral Jobs)
--   3. Recruiter full CRUD on their own jobs (edit, delete, publish)
--   4. Stage column defaults to 'draft'
-- Run this in the Supabase SQL Editor.

-- Enable RLS (safe to run even if already enabled)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (clean slate)
DROP POLICY IF EXISTS "Public can read active jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can read own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can insert own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can update own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can delete own jobs" ON public.jobs;

-- Public read: anyone authenticated can see active/paused jobs
CREATE POLICY "Public can read active jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (stage IN ('active', 'paused'));

-- Recruiter read: see own jobs regardless of stage (includes drafts)
CREATE POLICY "Recruiters can read own jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (recruiter_id = auth.uid());

-- Recruiter insert: create jobs as their own
CREATE POLICY "Recruiters can insert own jobs"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (recruiter_id = auth.uid());

-- Recruiter update: edit their own jobs
CREATE POLICY "Recruiters can update own jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (recruiter_id = auth.uid())
  WITH CHECK (recruiter_id = auth.uid());

-- Recruiter delete: remove their own jobs
CREATE POLICY "Recruiters can delete own jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (recruiter_id = auth.uid());

-- Ensure stage column defaults to 'draft' for new jobs
ALTER TABLE public.jobs ALTER COLUMN stage SET DEFAULT 'draft';
