-- ============================================================
-- COMPREHENSIVE FIX: Toggle RLS Policies + RPC Functions
-- Safe to run multiple times (idempotent)
-- Run in: Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. RLS POLICIES FOR PROFILE TABLES
-- ============================================================

-- ── profiles_professional ────────────────────────────────────

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'profiles_professional' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles_professional', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Professional profiles visible to authenticated users"
  ON profiles_professional FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own professional profile"
  ON profiles_professional FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own professional profile"
  ON profiles_professional FOR UPDATE
  USING (auth.uid() = user_id);

-- ── profiles_job_seeker ──────────────────────────────────────

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'profiles_job_seeker' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles_job_seeker', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Job seeker profiles visible to authenticated users"
  ON profiles_job_seeker FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own job seeker profile"
  ON profiles_job_seeker FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job seeker profile"
  ON profiles_job_seeker FOR UPDATE
  USING (auth.uid() = user_id);

-- ── profiles_recruiter ───────────────────────────────────────

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'profiles_recruiter' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles_recruiter', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Recruiter profiles visible to authenticated users"
  ON profiles_recruiter FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own recruiter profile"
  ON profiles_recruiter FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recruiter profile"
  ON profiles_recruiter FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 2. RLS POLICIES FOR USERS TABLE
-- ============================================================

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'users' AND schemaname = 'public' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users visible to authenticated users"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'Users can insert own row' AND schemaname = 'public'
  ) THEN
    CREATE POLICY "Users can insert own row"
      ON users FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'Users can update own row' AND schemaname = 'public'
  ) THEN
    CREATE POLICY "Users can update own row"
      ON users FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END $$;

-- ============================================================
-- 3. RPC FUNCTIONS (SECURITY DEFINER — bypass RLS)
-- ============================================================

-- ── upsert_professional_toggle ───────────────────────────────
-- Called by: toggleProfessionalOpenForReferrals, toggleProfessionalOpenToWork
-- Dynamically updates any boolean column on profiles_professional

CREATE OR REPLACE FUNCTION public.upsert_professional_toggle(
  p_user_id uuid,
  p_field text,
  p_value boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Upsert the profile row (creates if missing)
  INSERT INTO profiles_professional (user_id, open_for_referrals, is_open_to_work)
  VALUES (p_user_id, false, false)
  ON CONFLICT (user_id) DO NOTHING;

  -- Dynamically set the requested field
  EXECUTE format(
    'UPDATE profiles_professional SET %I = $1 WHERE user_id = $2',
    p_field
  ) USING p_value, p_user_id;
END;
$$;

-- ── upsert_jobseeker_toggle ──────────────────────────────────
-- Called by: toggleStudentOpenToWork
-- Dynamically updates any boolean column on profiles_job_seeker

CREATE OR REPLACE FUNCTION public.upsert_jobseeker_toggle(
  p_user_id uuid,
  p_field text,
  p_value boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Upsert the profile row (creates if missing)
  INSERT INTO profiles_job_seeker (user_id, is_open_to_work)
  VALUES (p_user_id, false)
  ON CONFLICT (user_id) DO NOTHING;

  -- Dynamically set the requested field
  EXECUTE format(
    'UPDATE profiles_job_seeker SET %I = $1 WHERE user_id = $2',
    p_field
  ) USING p_value, p_user_id;
END;
$$;

-- ============================================================
-- 4. ENSURE ALL EXISTING USERS HAVE PROFILE ROWS
-- ============================================================

-- Create professional profiles for any professional user missing one
INSERT INTO profiles_professional (user_id)
SELECT u.id FROM users u
LEFT JOIN profiles_professional p ON p.user_id = u.id
WHERE u.role = 'professional' AND p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Create job seeker profiles for any job_seeker user missing one
INSERT INTO profiles_job_seeker (user_id)
SELECT u.id FROM users u
LEFT JOIN profiles_job_seeker p ON p.user_id = u.id
WHERE u.role = 'job_seeker' AND p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Create recruiter profiles for any recruiter user missing one
INSERT INTO profiles_recruiter (user_id)
SELECT u.id FROM users u
LEFT JOIN profiles_recruiter p ON p.user_id = u.id
WHERE u.role = 'recruiter' AND p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 5. GRANT PERMISSIONS
-- ============================================================

-- Ensure authenticated role can execute the RPC functions
GRANT EXECUTE ON FUNCTION public.upsert_professional_toggle(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_jobseeker_toggle(uuid, text, boolean) TO authenticated;

-- ============================================================
-- 6. VERIFY
-- ============================================================

-- Check all policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'profiles_professional', 'profiles_job_seeker', 'profiles_recruiter')
ORDER BY tablename, cmd;

-- Check RPC functions exist
SELECT proname, prokind, prosecdef
FROM pg_proc
WHERE proname IN ('upsert_professional_toggle', 'upsert_jobseeker_toggle');

-- Check profile row counts vs user counts
SELECT
  (SELECT count(*) FROM users WHERE role = 'professional') AS pro_users,
  (SELECT count(*) FROM profiles_professional) AS pro_profiles,
  (SELECT count(*) FROM users WHERE role = 'job_seeker') AS js_users,
  (SELECT count(*) FROM profiles_job_seeker) AS js_profiles,
  (SELECT count(*) FROM users WHERE role = 'recruiter') AS rec_users,
  (SELECT count(*) FROM profiles_recruiter) AS rec_profiles;
