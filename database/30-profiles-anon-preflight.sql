-- Phase 30 preflight — READ-ONLY diagnostic. Run in the Supabase SQL editor.
--
-- Answers, for profiles_recruiter and profiles_job_seeker:
--   1. exact live column list (confirms created_at / linkedin_url absence)
--   2. what anon can currently read (table-level vs column-level grant)
--   3. every RLS policy, with role and qual
--   4. total row counts, and whether the public-page test users have rows
--
-- The SQL editor shows only the LAST statement's result grid, so every check
-- is aggregated into the final SELECT as a check/value grid.

WITH cols AS (
  SELECT table_name,
         string_agg(column_name, ', ' ORDER BY ordinal_position) AS v
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('profiles_recruiter', 'profiles_job_seeker')
  GROUP BY table_name
),
tbl AS (
  SELECT table_name,
         string_agg(privilege_type, ', ' ORDER BY privilege_type) AS v
  FROM information_schema.table_privileges
  WHERE table_schema = 'public'
    AND grantee = 'anon'
    AND table_name IN ('profiles_recruiter', 'profiles_job_seeker')
  GROUP BY table_name
),
colg AS (
  SELECT table_name,
         (count(*) || ' cols: ' || string_agg(column_name, ', ' ORDER BY column_name)) AS v
  FROM information_schema.column_privileges
  WHERE table_schema = 'public'
    AND grantee = 'anon'
    AND table_name IN ('profiles_recruiter', 'profiles_job_seeker')
  GROUP BY table_name
),
pols AS (
  SELECT tablename,
         string_agg(policyname || ' [' || cmd || ' -> ' || array_to_string(roles, ', ')
                    || '] qual=' || coalesce(qual, 'null'),
                    ' | ' ORDER BY policyname) AS v
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('profiles_professional', 'profiles_recruiter', 'profiles_job_seeker')
  GROUP BY tablename
),
rc AS (
  SELECT 'profiles_recruiter'::text AS t, count(*) AS v FROM public.profiles_recruiter
  UNION ALL
  SELECT 'profiles_job_seeker', count(*) FROM public.profiles_job_seeker
  UNION ALL
  SELECT 'profiles_professional', count(*) FROM public.profiles_professional
)
SELECT 'cols: profiles_recruiter' AS check_name,
       COALESCE((SELECT v FROM cols WHERE table_name = 'profiles_recruiter'), 'MISSING') AS value
UNION ALL
SELECT 'cols: profiles_job_seeker',
       COALESCE((SELECT v FROM cols WHERE table_name = 'profiles_job_seeker'), 'MISSING')
UNION ALL
SELECT 'anon table-level grants (recruiter)',
       COALESCE((SELECT v FROM tbl WHERE table_name = 'profiles_recruiter'), 'NONE')
UNION ALL
SELECT 'anon table-level grants (job_seeker)',
       COALESCE((SELECT v FROM tbl WHERE table_name = 'profiles_job_seeker'), 'NONE')
UNION ALL
SELECT 'anon column-level grants (recruiter)',
       COALESCE((SELECT v FROM colg WHERE table_name = 'profiles_recruiter'), 'NONE')
UNION ALL
SELECT 'anon column-level grants (job_seeker)',
       COALESCE((SELECT v FROM colg WHERE table_name = 'profiles_job_seeker'), 'NONE')
UNION ALL
SELECT 'policies: profiles_professional',
       COALESCE((SELECT v FROM pols WHERE tablename = 'profiles_professional'), 'NONE')
UNION ALL
SELECT 'policies: profiles_recruiter',
       COALESCE((SELECT v FROM pols WHERE tablename = 'profiles_recruiter'), 'NONE')
UNION ALL
SELECT 'policies: profiles_job_seeker',
       COALESCE((SELECT v FROM pols WHERE tablename = 'profiles_job_seeker'), 'NONE')
UNION ALL
SELECT 'total rows: ' || t, v::text FROM rc
UNION ALL
SELECT 'recruiter row for e2e-test-recruiter',
       (SELECT count(*)::text FROM public.profiles_recruiter pr
         WHERE pr.user_id = (SELECT id FROM public.users WHERE slug = 'e2e-test-recruiter'))
UNION ALL
SELECT 'job_seeker row for e2e-test-student',
       (SELECT count(*)::text FROM public.profiles_job_seeker pj
         WHERE pj.user_id = (SELECT id FROM public.users WHERE slug = 'e2e-test-student'))
UNION ALL
SELECT 'recruiter rows with deleted_at set',
       (SELECT count(*)::text FROM public.profiles_recruiter WHERE deleted_at IS NOT NULL)
UNION ALL
SELECT 'job_seeker rows with deleted_at set',
       (SELECT count(*)::text FROM public.profiles_job_seeker WHERE deleted_at IS NOT NULL);
