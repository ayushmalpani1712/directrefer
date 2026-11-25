-- ============================================================================
-- 29. Anon users phase — preflight (READ-ONLY)
-- ============================================================================
-- Run as ONE script in the Supabase SQL editor. Nothing here writes.
--
-- NOTE ON YOUR EDITOR: the SQL editor displays only the LAST statement's
-- result grid. Q1 (the live policy dump — the grid this phase needs) is
-- therefore placed LAST on purpose. If you run the whole file, the final
-- grid is the one to send back. Q2–Q5 are ordering-first so their grids
-- appear only when each statement is run individually.
--
-- Purpose: capture the live state the fix must rewrite:
--   * users_select_merged is built DYNAMICALLY by 22-consolidate-duplicate-
--     policies.sql (target = t || '_' || action || '_merged'), so its qual
--     text exists only on live — 29-anon-users-fix.sql is written from Q1.
--   * Q2 proves who can EXECUTE is_admin() (anon absent = the 42501 source).
--   * Q3/Q4 record the blanket grant the fix removes (anon = 41 columns,
--     including email/mobile — Supabase's pre-existing default).
--   * Q5 inventories every column so the fix's GRANT allowlist can exclude
--     email/mobile in every form (corrected Decision 3).
-- ============================================================================

-- Q5. full users column inventory — source for the fix's allowlist.
SELECT ordinal_position, column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'users'
 ORDER BY ordinal_position;

-- Q4. exact anon column list — proves which columns the blanket REVOKE kills
--     (email and mobile must appear here today; after the fix they must not).
SELECT column_name
  FROM information_schema.column_privileges
 WHERE table_schema = 'public'
   AND table_name = 'users'
   AND grantee = 'anon'
   AND privilege_type = 'SELECT'
 ORDER BY column_name;

-- Q3. current table-level SELECT footprint on users, per grantee.
SELECT grantee, count(*) AS column_count
  FROM information_schema.column_privileges
 WHERE table_schema = 'public'
   AND table_name = 'users'
   AND privilege_type = 'SELECT'
 GROUP BY grantee
 ORDER BY grantee;

-- Q2. who may EXECUTE is_admin() — anon should be ABSENT (that absence is
--     the 42501 the browser probe hit); authenticated should be present.
SELECT grantee, privilege_type
  FROM information_schema.routine_privileges
 WHERE routine_schema = 'public'
   AND routine_name = 'is_admin'
 ORDER BY grantee;

-- Q1. LIVE POLICIES ON USERS — the qual text the fix must rewrite. LAST, so
--     it is the grid your editor displays. Focus on users_select_merged:
--     which branches exist, which are gated by CASE current_user, and where
--     is_admin() sits.
SELECT policyname,
       roles,
       cmd,
       qual,
       with_check
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename = 'users'
 ORDER BY policyname;
