-- ============================================================================
-- 29. anon phase — take is_admin() out of anon's path on users, keep PII out
-- ============================================================================
-- Run after 28 (28 + 28b + 28d installed, C10 verdict 7/7 PASS). Fixes the
-- pre-existing anon 401 on GET /rest/v1/users:
--
--   {"code":"42501","message":"permission denied for function is_admin"}
--
-- anon's SELECT runs through users_select_merged, whose qual references
-- is_admin() (SECURITY DEFINER, EXECUTE granted only to authenticated,
-- postgres, service_role). PostgreSQL checks function EXECUTE while PLANNING
-- the query, so the reference errors even when the branch would never run:
-- the preflight diagnostic proved that
--   CASE WHEN CURRENT_USER = 'authenticated' THEN is_admin() ELSE false END
-- raises 42501 for anon standing alone. No CASE gate can hide the call; the
-- only fix is to keep is_admin() out of anon's plan entirely.
--
-- Steps, in this order (each statement is independently safe, so no explicit
-- transaction is needed and pooled-connection statement splitting cannot
-- strand a partial state):
--
--   1. REVOKE SELECT ON public.users FROM anon
--        Removes Supabase's pre-existing blanket. Per the PostgreSQL REVOKE
--        docs, revoking a table privilege also revokes the corresponding
--        column privileges on every column — the41-per-column baseline from
--        preflight P13/C7 goes to 0.
--   2. GRANT SELECT (12 columns) TO anon
--        The exact union of every logged-out call site:
--          ProfessionalPublic (logged-out branch), RecruiterPublic,
--          JobSeekerPublic, ReferralJobs, Find-Professionals hook,
--          slug resolution (id), HeadManager (id), JobDetail (full_name,
--          slug). email, mobile, work_email, role, status, id_card_url and
--          all remaining columns stay invisible to anon in every form.
--   3. CREATE users_select_public USING (true) — before anything is dropped
--        authenticated never goes one statement without a SELECT policy.
--        The qual contains zero function calls, so anon's plan can never
--        mention is_admin(). authenticated's effective visibility is
--        unchanged: its old qual was
--          (CASE WHEN ... THEN is_admin() ELSE false END
--           OR (SELECT auth.role()) = 'authenticated')
--        and the right disjunct was always true for it — is_admin() was
--        redundant for SELECT.
--   4. DROP users_select_merged — the 42501 source.
--   5. NOTIFY pgrst, 'reload schema'.
--   6. Verification grid — last statement, so it is the one your editor
--        displays (6 rows: anon's surviving columns, the SELECT policy set,
--        the new qual, the full policy inventory, remaining is_admin
--        references).
--
-- anon / authenticated visibility after each statement:
--   start        401 is_admin      full access
--   after 1      permission denied full access   (fail-closed)
--   after 2      401 is_admin      full access   (today's state)
--   after 3      12 cols or 401    full access   (both policies OR'd)
--   after 4      12 cols, no PII   full access   (target state)
-- No intermediate state exposes more to anon than the final state, and
-- authenticated never sees fewer rows than before.
--
-- Idempotent: REVOKE/GRANT/DROP IF EXISTS/conditional CREATE are no-ops once
-- applied, so the file can be re-run safely.
--
-- Post-run anon probes (same shape as 28-postcheck C9):
--   GET /rest/v1/users?select=id,full_name,slug,verified,professional_verified,work_email_verified&id=eq.<uuid>
--     -> 200 with the row
--   GET /rest/v1/users?select=email
--     -> error (permission denied) — email never leaves the table for anon

-- 1. strip the blanket grant (table-level and every column-level SELECT)
REVOKE SELECT ON public.users FROM anon;

-- 2. exactly the logged-out allowlist — no email, no mobile, no work_email
GRANT SELECT (
  id, full_name, slug, avatar_url, city, state, country,
  linkedin, banner_theme, verified, professional_verified, work_email_verified
) ON public.users TO anon;

-- 3. anon-safe SELECT policy — created first so it can never be absent
DO $mig29$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'users'
       AND policyname = 'users_select_public'
  ) THEN
    CREATE POLICY users_select_public
      ON public.users FOR SELECT
      USING (true);
  END IF;
END $mig29$;

-- 4. drop the is_admin()-bearing qual (the 42501 source)
DROP POLICY IF EXISTS users_select_merged ON public.users;

-- 5. reload PostgREST's schema cache
NOTIFY pgrst, 'reload schema';

-- 6. verification — the grid your editor displays
SELECT 'anon_select_columns' AS check_name,
       coalesce(string_agg(a.attname, ', ' ORDER BY a.attnum), 'NONE') AS actual,
       'exactly the 12 allowlisted columns' AS expected
  FROM pg_attribute a
 WHERE a.attrelid = 'public.users'::regclass
   AND a.attnum > 0 AND NOT a.attisdropped
   AND has_column_privilege('anon', 'public.users', a.attname, 'SELECT')
UNION ALL
SELECT 'anon_select_column_count',
       count(*)::text,
       '12'
  FROM pg_attribute a
 WHERE a.attrelid = 'public.users'::regclass
   AND a.attnum > 0 AND NOT a.attisdropped
   AND has_column_privilege('anon', 'public.users', a.attname, 'SELECT')
UNION ALL
SELECT 'users_select_policies',
       coalesce((SELECT string_agg(policyname, ', ' ORDER BY policyname)
                   FROM pg_policies
                  WHERE schemaname = 'public'
                    AND tablename = 'users'
                    AND cmd = 'SELECT'), 'NONE'),
       'users_select_public'
UNION ALL
SELECT 'users_select_public_qual',
       coalesce((SELECT qual FROM pg_policies
                  WHERE schemaname = 'public'
                    AND tablename = 'users'
                    AND policyname = 'users_select_public'), 'MISSING'),
       'true'
UNION ALL
SELECT 'users_all_policies',
       coalesce((SELECT string_agg(policyname || '[' || cmd || ']', ', ' ORDER BY policyname)
                   FROM pg_policies
                  WHERE schemaname = 'public'
                    AND tablename = 'users'), 'NONE'),
       'users_delete_merged[DELETE], users_insert_merged[INSERT], users_select_public[SELECT], users_update_merged[UPDATE]'
UNION ALL
SELECT 'is_admin_still_referenced',
       coalesce((SELECT string_agg(policyname || '[' || cmd || ']', ', ' ORDER BY policyname)
                   FROM pg_policies
                  WHERE schemaname = 'public'
                    AND tablename = 'users'
                    AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%is_admin%'),
                 'none'),
       'informational: non-SELECT legacy quals may remain (anon cannot reach them)';
