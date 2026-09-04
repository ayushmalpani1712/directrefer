-- ============================================================
-- FIX: Toggle defaults — ensure no NULL values in toggle columns
-- Safe to run multiple times (idempotent)
-- Run in: Supabase SQL Editor
-- ============================================================

-- 1. Set open_for_referrals to false where NULL
UPDATE profiles_professional SET open_for_referrals = false WHERE open_for_referrals IS NULL;

-- 2. Set is_open_to_work to false where NULL (professional)
UPDATE profiles_professional SET is_open_to_work = false WHERE is_open_to_work IS NULL;

-- 3. Set is_open_to_work to false where NULL (job seeker)
UPDATE profiles_job_seeker SET is_open_to_work = false WHERE is_open_to_work IS NULL;

-- 4. Set column defaults so future inserts get safe values
ALTER TABLE profiles_professional ALTER COLUMN open_for_referrals SET DEFAULT false;
ALTER TABLE profiles_professional ALTER COLUMN is_open_to_work SET DEFAULT false;
ALTER TABLE profiles_job_seeker ALTER COLUMN is_open_to_work SET DEFAULT false;

-- 5. Verify no NULLs remain
SELECT 'profiles_professional.open_for_referrals' AS field, COUNT(*) AS null_count FROM profiles_professional WHERE open_for_referrals IS NULL
UNION ALL
SELECT 'profiles_professional.is_open_to_work', COUNT(*) FROM profiles_professional WHERE is_open_to_work IS NULL
UNION ALL
SELECT 'profiles_job_seeker.is_open_to_work', COUNT(*) FROM profiles_job_seeker WHERE is_open_to_work IS NULL;
