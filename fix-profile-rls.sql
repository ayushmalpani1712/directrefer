-- Fix RLS policies for profiles_professional toggle persistence
-- Run this in Supabase SQL Editor

-- profiles_professional: allow users to update their own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles_professional' 
    AND policyname = 'Users can update own professional profile'
  ) THEN
    CREATE POLICY "Users can update own professional profile" ON profiles_professional
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- profiles_professional: allow users to insert their own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles_professional' 
    AND policyname = 'Users can insert own professional profile'
  ) THEN
    CREATE POLICY "Users can insert own professional profile" ON profiles_professional
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- profiles_professional: allow authenticated users to read all (for search feeds)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles_professional' 
    AND policyname = 'Authenticated users can read professional profiles'
  ) THEN
    CREATE POLICY "Authenticated users can read professional profiles" ON profiles_professional
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- profiles_job_seeker: allow users to update their own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles_job_seeker' 
    AND policyname = 'Users can update own job seeker profile'
  ) THEN
    CREATE POLICY "Users can update own job seeker profile" ON profiles_job_seeker
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- profiles_job_seeker: allow users to insert their own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles_job_seeker' 
    AND policyname = 'Users can insert own job seeker profile'
  ) THEN
    CREATE POLICY "Users can insert own job seeker profile" ON profiles_job_seeker
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- profiles_job_seeker: allow authenticated users to read all (for search feeds)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles_job_seeker' 
    AND policyname = 'Authenticated users can read job seeker profiles'
  ) THEN
    CREATE POLICY "Authenticated users can read job seeker profiles" ON profiles_job_seeker
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- profiles_recruiter: allow users to update their own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles_recruiter' 
    AND policyname = 'Users can update own recruiter profile'
  ) THEN
    CREATE POLICY "Users can update own recruiter profile" ON profiles_recruiter
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- profiles_recruiter: allow users to insert their own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles_recruiter' 
    AND policyname = 'Users can insert own recruiter profile'
  ) THEN
    CREATE POLICY "Users can insert own recruiter profile" ON profiles_recruiter
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
