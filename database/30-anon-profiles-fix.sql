-- ============================================================================
-- 30. anon phase — column-limited SELECT on profiles_recruiter / profiles_job_seeker
-- ============================================================================
-- Run after 29 (29 installed, anon probes P1-P7 as expected). Makes the two
-- public profile routes render for logged-out visitors:
--
--   /company/:slug        (RecruiterPublic -> profiles_recruiter)
--   /job-seekers/:slug    (JobSeekerPublic  -> profiles_job_seeker)
--
-- Today both pages run as anon and return 0 rows: the only SELECT policies are
-- authenticated-only (preflight 30-profiles-anon-preflight.sql), so the pages
-- fall through to their NotFound/skeleton states. The deeper problem the
-- preflight exposed is the grant surface underneath that RLS:
--
--   anon holds a blanket table-level grant on both tables
--   (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER) PLUS
--   per-column grants on every column — including work_email, resume_url,
--   resume_text, screening_score, quality_tier, bio, qualification.
--
-- Only "0 rows returned by RLS" stands between that and a PII leak: a single
-- permissive policy (or one careless USING (true) added later) would expose
-- the whole table. This file inverts the default — deny at the grant level,
-- allow exactly the columns the public pages render — so the safe state is
-- the one that survives an RLS mistake. Same shape as 29-anon-users-fix.sql.
--
-- Pairing frontend change (ships with this SQL — column grants reject select('*')):
--   RecruiterPublic.tsx  select('*') -> the 8-column allowlist below
--   JobSeekerPublic.tsx  select('*') -> the 17-column allowlist below
--                        (also drops the dead profileData.linkedin_url
--                         reference — the column has never existed live)
--
-- Steps, in this order (each statement is independently safe, so no explicit
-- transaction is needed and pooled-connection statement splitting cannot
-- strand a partial state):
--
--   1. REVOKE ALL ON profiles_recruiter FROM anon
--   2. REVOKE ALL ON profiles_job_seeker  FROM anon
--        Removes the blanket table grant; per the PostgreSQL REVOKE docs,
--        revoking a table privilege also revokes the corresponding column
--        privileges on every column — the 96/156 per-column baseline from
--        preflight goes to 0. Fail-closed: until step 3/4 anon gets 42501.
--   3. GRANT SELECT (8 columns) ON profiles_recruiter TO anon
--        The exact union of every logged-out read: RecruiterPublic's profile
--        object + its user_id filter, and HeadManager's company_name,
--        company_description, hiring_department, company_size (a subset).
--   4. GRANT SELECT (17 columns) ON profiles_job_seeker TO anon
--        The exact union of JobSeekerPublic's profile object + user_id filter.
--   5. CREATE profiles_recruiter_select_public USING (true) — before anything
--        is dropped, so authenticated never goes one statement without a
--        SELECT policy. Qual contains zero function calls, so anon's plan
--        can never hit a plan-time EXECUTE error (the phase-29 is_admin lesson).
--   6. DROP the authenticated-only recruiter SELECT policy.
--   7-8. same pair for profiles_job_seeker (drop profiles_job_seeker_select_merged).
--        authenticated's effective visibility is unchanged on both tables: its
--        old quals evaluated true for every row it could see, so USING (true)
--        is row-for-row equivalent for it.
--   9. NOTIFY pgrst, 'reload schema'.
--  10. Verification grid — last statement, so it is the one your editor
--        displays (12 rows: per-table anon columns, grant totals, write-grant
--        residue, the SELECT policy set + qual, untouched write policies).
--
-- anon / authenticated visibility after each statement:
--   start        0 rows via RLS   full access to every column + all writes
--   after 1-2    42501 fail-closed full access        (grants stripped)
--   after 3-4    0 rows, no writes full access        (grant surface = 8/17 cols)
--   after 5-6    8 cols, no PII    full access        (recruiter page live)
--   after 7-8    17 cols, no PII   full access        (target state)
-- No intermediate state exposes more to anon than the final state, and
-- authenticated never sees fewer rows than before.
--
-- PII stays out in every form: work_email, resume_url, resume_name,
-- resume_size_bytes, resume_uploaded_at, resume_text, screening_status,
-- screening_score, quality_tier, profile_completeness, bio, qualification,
-- college, graduation_year, cover_url, avatar_color, banner_style,
-- preferred_location, preferred_companies, languages, deleted_at, updated_at
-- and every remaining column are ungranted. email/mobile live on users and
-- were locked down in 29.
--
-- Note: USING (true) does not filter deleted_at — nothing in src/ sets it and
-- both tables have 0 such rows (preflight). If soft-delete is ever wired up,
-- add "AND deleted_at IS NULL" here for anon and authenticated alike.
--
-- Idempotent: REVOKE/GRANT/DROP IF EXISTS/conditional CREATE are no-ops once
-- applied, so the file can be re-run safely.
--
-- Post-run anon probes (same shape as 28-postcheck C9 / 29's):
--   GET /rest/v1/profiles_recruiter?select=user_id,company_name,company_description
--     -> 200 with the 3 rows
--   GET /rest/v1/profiles_job_seeker?select=user_id,headline,skills
--     -> 200 with the 25 rows
--   GET /rest/v1/profiles_recruiter?select=work_email
--     -> 42501 permission denied — work_email never leaves the table for anon
--   GET /rest/v1/profiles_job_seeker?select=resume_text,screening_score
--     -> 42501 permission denied
--   GET /rest/v1/profiles_job_seeker?select=*
--     -> 42501 permission denied for table (column grants reject SELECT *)

-- 1-2. strip the blanket grant (table-level and every column-level privilege)
REVOKE ALL ON public.profiles_recruiter FROM anon;
REVOKE ALL ON public.profiles_job_seeker FROM anon;

-- 3. exactly the logged-out allowlist — no work_email, no resume_*, no screening_*
GRANT SELECT (
  user_id, company_name, hiring_department, company_size,
  company_website, company_description, benefits, office_locations
) ON public.profiles_recruiter TO anon;

-- 4. exactly the logged-out allowlist — no resume_*, no screening_*, no bio
GRANT SELECT (
  user_id, headline, preferred_role, is_open_to_work, skills,
  experience_years, experience, education, projects, certifications,
  achievements, portfolio_url, github_url, website,
  notice_period, work_preference, why_me
) ON public.profiles_job_seeker TO anon;

-- 5. anon-safe SELECT policy — created first so it can never be absent
DO $mig30$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'profiles_recruiter'
       AND policyname = 'profiles_recruiter_select_public'
  ) THEN
    CREATE POLICY profiles_recruiter_select_public
      ON public.profiles_recruiter FOR SELECT
      USING (true);
  END IF;
END $mig30$;

-- 6. drop the authenticated-only qual (anon's 0-row source)
DROP POLICY IF EXISTS "Recruiter profiles visible to authenticated users"
  ON public.profiles_recruiter;

-- 7. anon-safe SELECT policy for job seekers — created first, same reasoning
DO $mig30$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'profiles_job_seeker'
       AND policyname = 'profiles_job_seeker_select_public'
  ) THEN
    CREATE POLICY profiles_job_seeker_select_public
      ON public.profiles_job_seeker FOR SELECT
      USING (true);
  END IF;
END $mig30$;

-- 8. drop the authenticated-only qual (anon's 0-row source)
DROP POLICY IF EXISTS profiles_job_seeker_select_merged
  ON public.profiles_job_seeker;

-- 9. reload PostgREST's schema cache
NOTIFY pgrst, 'reload schema';

-- 10. verification — the grid your editor displays
SELECT 'recruiter_anon_select_columns' AS check_name,
       coalesce(string_agg(a.attname, ', ' ORDER BY a.attnum), 'NONE') AS actual,
       'exactly the 8 allowlisted columns' AS expected
  FROM pg_attribute a
 WHERE a.attrelid = 'public.profiles_recruiter'::regclass
   AND a.attnum > 0 AND NOT a.attisdropped
   AND has_column_privilege('anon', 'public.profiles_recruiter', a.attname, 'SELECT')
UNION ALL
SELECT 'recruiter_anon_select_column_count',
       count(*)::text,
       '8'
  FROM pg_attribute a
 WHERE a.attrelid = 'public.profiles_recruiter'::regclass
   AND a.attnum > 0 AND NOT a.attisdropped
   AND has_column_privilege('anon', 'public.profiles_recruiter', a.attname, 'SELECT')
UNION ALL
SELECT 'job_seeker_anon_select_columns',
       coalesce(string_agg(a.attname, ', ' ORDER BY a.attnum), 'NONE'),
       'exactly the 17 allowlisted columns'
  FROM pg_attribute a
 WHERE a.attrelid = 'public.profiles_job_seeker'::regclass
   AND a.attnum > 0 AND NOT a.attisdropped
   AND has_column_privilege('anon', 'public.profiles_job_seeker', a.attname, 'SELECT')
UNION ALL
SELECT 'job_seeker_anon_select_column_count',
       count(*)::text,
       '17'
  FROM pg_attribute a
 WHERE a.attrelid = 'public.profiles_job_seeker'::regclass
   AND a.attnum > 0 AND NOT a.attisdropped
   AND has_column_privilege('anon', 'public.profiles_job_seeker', a.attname, 'SELECT')
UNION ALL
SELECT 'anon_column_grants_total',
       count(*)::text,
       '25 (8 + 17, SELECT only)'
  FROM information_schema.column_privileges
 WHERE grantee = 'anon'
   AND table_name IN ('profiles_recruiter', 'profiles_job_seeker')
UNION ALL
SELECT 'anon_column_write_grants',
       count(*)::text,
       '0'
  FROM information_schema.column_privileges
 WHERE grantee = 'anon'
   AND table_name IN ('profiles_recruiter', 'profiles_job_seeker')
   AND privilege_type <> 'SELECT'
UNION ALL
SELECT 'anon_table_grants',
       coalesce(string_agg(p.priv, ', ' ORDER BY p.priv), 'NONE'),
       'NONE'
  FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) AS p(priv)
 WHERE has_table_privilege('anon', 'public.profiles_recruiter', p.priv)
    OR has_table_privilege('anon', 'public.profiles_job_seeker', p.priv)
UNION ALL
SELECT 'recruiter_select_policies',
       coalesce((SELECT string_agg(policyname, ', ' ORDER BY policyname)
                   FROM pg_policies
                  WHERE schemaname = 'public'
                    AND tablename = 'profiles_recruiter'
                    AND cmd = 'SELECT'), 'NONE'),
       'profiles_recruiter_select_public'
UNION ALL
SELECT 'recruiter_select_public_qual',
       coalesce((SELECT qual FROM pg_policies
                  WHERE schemaname = 'public'
                    AND tablename = 'profiles_recruiter'
                    AND policyname = 'profiles_recruiter_select_public'), 'MISSING'),
       'true'
UNION ALL
SELECT 'job_seeker_select_policies',
       coalesce((SELECT string_agg(policyname, ', ' ORDER BY policyname)
                   FROM pg_policies
                  WHERE schemaname = 'public'
                    AND tablename = 'profiles_job_seeker'
                    AND cmd = 'SELECT'), 'NONE'),
       'profiles_job_seeker_select_public'
UNION ALL
SELECT 'job_seeker_select_public_qual',
       coalesce((SELECT qual FROM pg_policies
                  WHERE schemaname = 'public'
                    AND tablename = 'profiles_job_seeker'
                    AND policyname = 'profiles_job_seeker_select_public'), 'MISSING'),
       'true'
UNION ALL
SELECT 'write_policies_untouched',
       coalesce((SELECT string_agg(tablename || ': ' || policyname || '[' || cmd || ']', ', '
                                   ORDER BY tablename, policyname)
                   FROM pg_policies
                  WHERE schemaname = 'public'
                    AND tablename IN ('profiles_recruiter', 'profiles_job_seeker')
                    AND cmd <> 'SELECT'), 'NONE'),
       'informational: INSERT/UPDATE policies untouched by this file';
