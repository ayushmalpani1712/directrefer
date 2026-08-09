-- Fix RLS policies for users table — allow INSERT/UPDATE for authenticated users
-- Run this in Supabase SQL Editor

-- INSERT: users can create their own row (needed during signup)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users'
    AND policyname = 'Users can insert own row'
    AND schemaname = 'public'
  ) THEN
    CREATE POLICY "Users can insert own row"
      ON users FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- UPDATE: users can update their own row (needed for ensureUserRow, last_login_at, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users'
    AND policyname = 'Users can update own row'
    AND schemaname = 'public'
  ) THEN
    CREATE POLICY "Users can update own row"
      ON users FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END $$;
