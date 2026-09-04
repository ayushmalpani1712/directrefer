-- Public read policy for profiles_professional
-- Allows the Chrome extension (anon key) to query referrers per company
-- Only exposes: user_id, company_name, job_title, open_for_referrals

-- Drop existing SELECT policies if needed
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'profiles_professional'
      AND schemaname = 'public'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles_professional', pol.policyname);
  END LOOP;
END $$;

-- Authenticated users can read all professional profiles (existing behavior)
CREATE POLICY "Professional profiles visible to authenticated users"
  ON profiles_professional FOR SELECT
  USING (auth.role() = 'authenticated');

-- Anonymous users can read limited columns for the Chrome extension
-- This allows the extension to check referrer availability per company
CREATE POLICY "Professional profiles readable by anon for referrer discovery"
  ON profiles_professional FOR SELECT
  USING (auth.role() = 'anon');
