-- Fix RLS policies for cross-user profile visibility
-- Run this in Supabase SQL Editor
-- This script DROPs existing policies first, then CREATEs them
-- Safe to run multiple times (idempotent)

-- ============================================================
-- profiles_professional
-- ============================================================

-- Drop all existing policies on profiles_professional
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'profiles_professional' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles_professional', pol.policyname);
  END LOOP;
END $$;

-- SELECT: any authenticated user can read all professional profiles
CREATE POLICY "Professional profiles visible to authenticated users"
  ON profiles_professional FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT: users can insert their own row
CREATE POLICY "Users can insert own professional profile"
  ON profiles_professional FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can update their own row
CREATE POLICY "Users can update own professional profile"
  ON profiles_professional FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- profiles_job_seeker
-- ============================================================

-- Drop all existing policies on profiles_job_seeker
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'profiles_job_seeker' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles_job_seeker', pol.policyname);
  END LOOP;
END $$;

-- SELECT: any authenticated user can read all job seeker profiles
CREATE POLICY "Job seeker profiles visible to authenticated users"
  ON profiles_job_seeker FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT: users can insert their own row
CREATE POLICY "Users can insert own job seeker profile"
  ON profiles_job_seeker FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can update their own row
CREATE POLICY "Users can update own job seeker profile"
  ON profiles_job_seeker FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- profiles_recruiter
-- ============================================================

-- Drop all existing policies on profiles_recruiter
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'profiles_recruiter' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles_recruiter', pol.policyname);
  END LOOP;
END $$;

-- SELECT: any authenticated user can read all recruiter profiles
CREATE POLICY "Recruiter profiles visible to authenticated users"
  ON profiles_recruiter FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT: users can insert their own row
CREATE POLICY "Users can insert own recruiter profile"
  ON profiles_recruiter FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can update their own row
CREATE POLICY "Users can update own recruiter profile"
  ON profiles_recruiter FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- users table: ensure cross-user reads work for profiles
-- ============================================================

-- Drop any restrictive SELECT policies on users that block cross-user reads
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'users' AND schemaname = 'public'
    AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
  END LOOP;
END $$;

-- Allow authenticated users to read basic user info (name, location, status)
-- This is needed for profile discovery pages to show user data
CREATE POLICY "Users visible to authenticated users"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');
