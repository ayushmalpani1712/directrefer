-- ============================================================================
-- 19. Fix Supabase Security Advisor warnings (72 → ~10 by-design residual)
-- ============================================================================
-- Idempotent and safe to re-run. Runs as a single transaction in the SQL Editor
-- (any error rolls the whole script back — nothing half-applied).
--
-- Fixes:
--   1. function_search_path_mutable      — pin search_path on every public function lacking it
--   2. extension_in_public               — move dblink / http / pg_net into the extensions schema
--   3. rls_policy_always_true            — replace always-true policies on 9 tables
--   4. public_bucket_allows_listing      — drop bucket-specific SELECT policies on public buckets;
--                                          add an owner-scoped read policy (no bucket_id in qual,
--                                          so it never re-triggers the linter)
--   5. anon/authenticated SECURITY DEFINER EXECUTE — tiered revokes:
--        · client RPCs            → keep authenticated, revoke PUBLIC + anon
--        · RLS helpers / others   → decided at runtime (policy / invoker-fn / trigger usage)
--        · service_role + postgres→ always granted (service_role must never lose EXECUTE)
--
-- Expected AFTER running (~10 warnings, all by design):
--   * ~8-10 x authenticated SECURITY DEFINER executable — RPCs the web app must call:
--     upsert_jobseeker_toggle, upsert_professional_toggle, admin_toggle_show_on_find,
--     review_verification_request (x2), send_work_email_otp, verify_work_email_otp,
--     increment_invite_uses, plus is_admin if a legacy policy still references it.
--     Removing these would require moving the RPCs to Edge Functions (out of scope).
--   * 1 x auth_leaked_password_protection — dashboard only, no SQL:
--     Authentication → Settings → enable "Protect against leaked passwords".
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. function_search_path_mutable
--    Pin search_path on every function/procedure in public that lacks it.
--    'public, extensions' keeps unqualified calls resolving before/after the
--    extension move below; pg_temp last (required convention).
-- ----------------------------------------------------------------------------
DO $fix_searchpath$
DECLARE
  fn     RECORD;
  pinned int := 0;
BEGIN
  FOR fn IN
    SELECT p.oid, p.prokind
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prokind IN ('f', 'p')
       AND (p.proconfig IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'
            ))
  LOOP
    BEGIN
      IF fn.prokind = 'p' THEN
        EXECUTE format('ALTER PROCEDURE %s SET search_path = public, extensions, pg_temp',
                       fn.oid::regprocedure);
      ELSE
        EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp',
                       fn.oid::regprocedure);
      END IF;
      pinned := pinned + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'search_path not pinned on %: %', fn.oid::regprocedure, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'search_path pinned on % function(s)/procedure(s)', pinned;
END $fix_searchpath$;

-- ----------------------------------------------------------------------------
-- 2. extension_in_public
--    Move the 3 flagged extensions into the extensions schema. Each move is
--    exception-guarded (non-relocatable extensions stay put and keep their
--    warning instead of failing the run). Nothing in this codebase, in any
--    function body, or in any view references dblink/http/pg_net unqualified,
--    and section 1 pinned search_path on all public functions anyway.
-- ----------------------------------------------------------------------------
DO $move_ext$
DECLARE
  ext   RECORD;
  moved int := 0;
BEGIN
  IF to_regnamespace('extensions') IS NULL THEN
    CREATE SCHEMA extensions;
  END IF;

  FOR ext IN
    SELECT e.extname
      FROM pg_extension e
      JOIN pg_namespace ns ON ns.oid = e.extnamespace
     WHERE ns.nspname = 'public'
       AND e.extname IN ('dblink', 'http', 'pg_net')
  LOOP
    BEGIN
      EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', ext.extname);
      moved := moved + 1;
      RAISE NOTICE 'moved extension "%" to extensions schema', ext.extname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'extension "%" left in place (%)', ext.extname, SQLERRM;
    END;
  END LOOP;
END $move_ext$;

-- ----------------------------------------------------------------------------
-- 3. rls_policy_always_true
--    Every flagged table: drop the always-true policies of the affected
--    command, then recreate a restricted replacement that preserves the
--    app's real write paths (verified against src/).
-- ----------------------------------------------------------------------------

-- 3.1 applications: UPDATE (candidate / job recruiter / company member / admin)
DO $applications_rls$
DECLARE
  pol       RECORD;
  v_company text := '';
  v_sql     text;
BEGIN
  IF to_regclass('public.applications') IS NOT NULL THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'applications' AND cmd = 'UPDATE'
    LOOP
      EXECUTE format('DROP POLICY %I ON applications', pol.policyname);
    END LOOP;

    IF to_regclass('public.company_members') IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'company_id'
       ) THEN
      v_company := $c$
        OR EXISTS (
          SELECT 1 FROM jobs j
           WHERE j.id = applications.job_id AND j.company_id IS NOT NULL
             AND EXISTS (
               SELECT 1 FROM company_members cm
                WHERE cm.company_id = j.company_id AND cm.user_id = auth.uid()
             )
        )$c$;
    END IF;

    v_sql := $sql$
      CREATE POLICY "applications_update_authorized" ON applications
        FOR UPDATE TO authenticated
        USING (
          candidate_id = auth.uid()
          OR EXISTS (SELECT 1 FROM jobs j WHERE j.id = applications.job_id AND j.recruiter_id = auth.uid())
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin' AND u.deleted_at IS NULL)
          %s
        )
        WITH CHECK (
          candidate_id = auth.uid()
          OR EXISTS (SELECT 1 FROM jobs j WHERE j.id = applications.job_id AND j.recruiter_id = auth.uid())
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin' AND u.deleted_at IS NULL)
          %s
        )
    $sql$;
    EXECUTE format(v_sql, v_company, v_company);
    RAISE NOTICE 'applications: replaced UPDATE policy';
  END IF;
END $applications_rls$;

-- 3.2 error_logs: 2x INSERT (client logs with user_id = self or null; anon may
--     only log with user_id null so pre-login errors still land)
DO $error_logs_rls$
DECLARE
  pol RECORD;
BEGIN
  IF to_regclass('public.error_logs') IS NOT NULL THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'error_logs' AND cmd = 'INSERT'
    LOOP
      EXECUTE format('DROP POLICY %I ON error_logs', pol.policyname);
    END LOOP;

    CREATE POLICY "error_logs_insert_own" ON error_logs
      FOR INSERT TO authenticated, anon
      WITH CHECK (user_id IS NULL OR user_id = auth.uid());
    RAISE NOTICE 'error_logs: replaced INSERT policy';
  END IF;
END $error_logs_rls$;

-- 3.3 matches: INSERT (storeMatches writes rows where candidate = current user;
--     symmetric professional case allowed; admin allowed)
DO $matches_rls$
DECLARE
  pol     RECORD;
  v_expr  text := $e$
          candidate_id = auth.uid()
          OR professional_id = auth.uid()
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin' AND u.deleted_at IS NULL)$e$;
BEGIN
  IF to_regclass('public.matches') IS NOT NULL THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'matches' AND cmd = 'INSERT'
    LOOP
      EXECUTE format('DROP POLICY %I ON matches', pol.policyname);
    END LOOP;

    EXECUTE format('CREATE POLICY "matches_insert_own" ON matches FOR INSERT TO authenticated WITH CHECK (%s)', v_expr);

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'matches' AND cmd = 'UPDATE'
    ) THEN
      EXECUTE format('CREATE POLICY "matches_update_own" ON matches FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
                     v_expr, v_expr);
    END IF;
    RAISE NOTICE 'matches: replaced INSERT policy';
  END IF;
END $matches_rls$;

-- 3.4 page_views: INSERT (no client writes — tracking goes through the
--     SECURITY DEFINER track_page_view RPC or the service role; both bypass RLS)
DO $page_views_rls$
DECLARE
  pol RECORD;
BEGIN
  IF to_regclass('public.page_views') IS NOT NULL THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'page_views' AND cmd = 'INSERT'
    LOOP
      EXECUTE format('DROP POLICY %I ON page_views', pol.policyname);
    END LOOP;
    RAISE NOTICE 'page_views: dropped INSERT policy (no client writers)';
  END IF;
END $page_views_rls$;

-- 3.5 profile_skills: INSERT + DELETE (client only ever selects; writes are
--     owned by the profile itself or an admin)
DO $profile_skills_rls$
DECLARE
  pol    RECORD;
  v_expr text := $e$profile_id = auth.uid()
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin' AND u.deleted_at IS NULL)$e$;
BEGIN
  IF to_regclass('public.profile_skills') IS NOT NULL THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'profile_skills' AND cmd IN ('INSERT', 'DELETE')
    LOOP
      EXECUTE format('DROP POLICY %I ON profile_skills', pol.policyname);
    END LOOP;

    EXECUTE format('CREATE POLICY "ps_insert_own" ON profile_skills FOR INSERT TO authenticated WITH CHECK (%s)', v_expr);
    EXECUTE format('CREATE POLICY "ps_delete_own" ON profile_skills FOR DELETE TO authenticated USING (%s)', v_expr);
    RAISE NOTICE 'profile_skills: replaced INSERT/DELETE policies';
  END IF;
END $profile_skills_rls$;

-- 3.6 screening_attempts: INSERT (candidate inserts for self; professionals /
--     recruiters / admins run screening on behalf of a candidate — verified
--     ReferralInbox passes the requester's id while the professional is logged in)
DO $screening_attempts_rls$
DECLARE
  pol    RECORD;
  v_expr text := $e$
          candidate_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM users u
             WHERE u.id = auth.uid()
               AND u.role IN ('admin', 'recruiter', 'professional')
               AND u.deleted_at IS NULL
          )$e$;
BEGIN
  IF to_regclass('public.screening_attempts') IS NOT NULL THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'screening_attempts' AND cmd = 'INSERT'
    LOOP
      EXECUTE format('DROP POLICY %I ON screening_attempts', pol.policyname);
    END LOOP;

    EXECUTE format('CREATE POLICY "screening_attempts_insert_authorized" ON screening_attempts FOR INSERT TO authenticated WITH CHECK (%s)', v_expr);
    RAISE NOTICE 'screening_attempts: replaced INSERT policy';
  END IF;
END $screening_attempts_rls$;

-- 3.7 screening_criteria: INSERT + UPDATE (admin-managed; no client callers of
--     createCriteria exist today — kept admin-only for future use)
DO $screening_criteria_rls$
DECLARE
  pol    RECORD;
  v_expr text := $e$EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin' AND u.deleted_at IS NULL)$e$;
BEGIN
  IF to_regclass('public.screening_criteria') IS NOT NULL THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'screening_criteria' AND cmd IN ('INSERT', 'UPDATE')
    LOOP
      EXECUTE format('DROP POLICY %I ON screening_criteria', pol.policyname);
    END LOOP;

    EXECUTE format('CREATE POLICY "screening_criteria_insert_admin" ON screening_criteria FOR INSERT TO authenticated WITH CHECK (%s)', v_expr);
    EXECUTE format('CREATE POLICY "screening_criteria_update_admin" ON screening_criteria FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', v_expr, v_expr);
    RAISE NOTICE 'screening_criteria: replaced INSERT/UPDATE policies';
  END IF;
END $screening_criteria_rls$;

-- 3.8 state_history: INSERT (append-only audit; every caller in src/ passes
--     changed_by = current user or null; admins may record on behalf of others)
DO $state_history_rls$
DECLARE
  pol    RECORD;
  v_expr text := $e$
          changed_by IS NULL
          OR changed_by = auth.uid()
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin' AND u.deleted_at IS NULL)$e$;
BEGIN
  IF to_regclass('public.state_history') IS NOT NULL THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'state_history' AND cmd = 'INSERT'
    LOOP
      EXECUTE format('DROP POLICY %I ON state_history', pol.policyname);
    END LOOP;

    EXECUTE format('CREATE POLICY "state_history_insert_authorized" ON state_history FOR INSERT TO authenticated WITH CHECK (%s)', v_expr);
    RAISE NOTICE 'state_history: replaced INSERT policy';
  END IF;
END $state_history_rls$;

-- 3.9 waitlist_requests: INSERT (no client code writes to this table — the
--     waitlist UI was never shipped; service-role/edge flows bypass RLS anyway)
DO $waitlist_rls$
DECLARE
  pol RECORD;
BEGIN
  IF to_regclass('public.waitlist_requests') IS NOT NULL THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'waitlist_requests' AND cmd = 'INSERT'
    LOOP
      EXECUTE format('DROP POLICY %I ON waitlist_requests', pol.policyname);
    END LOOP;
    RAISE NOTICE 'waitlist_requests: dropped INSERT policy (no client writers)';
  END IF;
END $waitlist_rls$;

-- ----------------------------------------------------------------------------
-- 4. public_bucket_allows_listing
--    Drop every bucket-specific SELECT policy (qual matching bucket_id = '…')
--    on public buckets — this is exactly what the linter flags. Public-bucket
--    object GETs are served by storage via super-user (no RLS), so public URLs,
--    getPublicUrl() and /object/… iframe reads all keep working without policies.
--    Then add ONE owner-scoped read policy whose qual contains no bucket_id
--    reference (never re-triggers the linter in either linter variant) so
--    storage.from('resumes').list(userId) and own-file reads keep working.
-- ----------------------------------------------------------------------------
DO $public_buckets$
DECLARE
  pol     RECORD;
  dropped int := 0;
BEGIN
  FOR pol IN
    SELECT p.policyname
      FROM pg_policies p
     WHERE p.schemaname = 'storage'
       AND p.tablename = 'objects'
       AND p.cmd = 'SELECT'
       AND EXISTS (
         SELECT 1
           FROM storage.buckets b
          WHERE b.public
            AND p.qual ~* (E'bucket_id\\s*=\\s*' ||
                 replace(replace(replace(replace(replace(replace(replace(
                   quote_literal(b.id), '.', E'\\.'), '*', E'\\*'), '(', E'\\('), ')', E'\\)'),
                   '$', E'\\$'), '+', E'\\+'), '?', E'\\?'))
       )
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
    dropped := dropped + 1;
  END LOOP;

  EXECUTE 'DROP POLICY IF EXISTS "objects_owner_scoped_read" ON storage.objects';
  EXECUTE $sql$
    CREATE POLICY "objects_owner_scoped_read" ON storage.objects
      FOR SELECT TO authenticated
      USING (owner_id = (SELECT auth.uid()::text))
  $sql$;

  RAISE NOTICE 'storage: dropped % bucket-specific SELECT policy(ies) on public buckets; added owner-scoped read', dropped;
END $public_buckets$;

-- ----------------------------------------------------------------------------
-- 5. SECURITY DEFINER executable by anon (0028) / authenticated (0029)
--    Tiered revokes over the exact flagged function set:
--      · called by the web client  → keep authenticated (runtime list below)
--      · referenced by an RLS policy, an invoker function, a default or a
--        check constraint        → keep authenticated
--      · otherwise (trigger fns, service-side RPCs) → revoke authenticated too
--    PUBLIC and anon are always revoked; service_role and postgres always
--    granted. If a policy explicitly targets anon, anon is granted back.
-- ----------------------------------------------------------------------------
DO $definer_tiering$
DECLARE
  fn          RECORD;
  client_rpc  CONSTANT text[] := ARRAY[
    'upsert_jobseeker_toggle', 'upsert_professional_toggle', 'admin_toggle_show_on_find',
    'review_verification_request', 'send_work_email_otp', 'verify_work_email_otp',
    'increment_invite_uses'
  ];
  targets     CONSTANT text[] := client_rpc || ARRAY[
    'is_admin', 'get_user_role', 'update_professional_stats',
    'create_report', 'update_report_status', 'get_page_view_stats', 'track_page_view',
    'update_user_password', 'search_jobs', 'search_professionals',
    'handle_new_user', 'handle_new_profile'
  ];
  body_pat    text;
  used_policy boolean;
  keep_auth   boolean;
  kept        int := 0;
  revoked     int := 0;
  kept_names  text[] := ARRAY[]::text[];
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
       AND p.proname = ANY(targets)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn.oid::regprocedure);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn.oid::regprocedure);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn.oid::regprocedure);

    body_pat := '(?i)\m' || fn.proname || '\s*\(';

    SELECT EXISTS (
      SELECT 1 FROM pg_policies pp
       WHERE (pp.qual ILIKE '%' || fn.proname || '%'
           OR pp.with_check ILIKE '%' || fn.proname || '%')
    ) INTO used_policy;

    keep_auth := fn.proname = ANY(client_rpc)
      OR used_policy
      OR EXISTS (
        SELECT 1
          FROM pg_proc c
          JOIN pg_namespace cn ON cn.oid = c.pronamespace
          JOIN pg_language l ON l.oid = c.prolang
         WHERE c.prosecdef = false
           AND c.prokind = 'f'
           AND l.lname IN ('sql', 'plpgsql')
           AND pg_get_functiondef(c.oid) ~ body_pat
      )
      OR EXISTS (
        SELECT 1 FROM pg_attrdef d
         WHERE pg_get_expr(d.adbin, d.adrelid) ~ body_pat
      )
      OR EXISTS (
        SELECT 1 FROM pg_constraint ct
         WHERE pg_get_constraintdef(ct.oid) ~ body_pat
      );

    IF keep_auth THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.oid::regprocedure);
      kept := kept + 1;
      kept_names := kept_names || fn.proname;
    ELSE
      revoked := revoked + 1;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_policies pp
       WHERE (pp.qual ILIKE '%' || fn.proname || '%'
           OR pp.with_check ILIKE '%' || fn.proname || '%')
         AND 'anon' = ANY(pp.roles)
    ) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', fn.oid::regprocedure);
    END IF;

    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.oid::regprocedure);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO postgres', fn.oid::regprocedure);
  END LOOP;

  RAISE NOTICE 'definer EXECUTE: kept authenticated for % (%), revoked from %',
    kept, (SELECT COALESCE(string_agg(DISTINCT n, ', '), '-') FROM unnest(kept_names) n), revoked;
END $definer_tiering$;

-- ----------------------------------------------------------------------------
-- 6. Verification summary (also visible in the SQL Editor notices)
-- ----------------------------------------------------------------------------
DO $verify$
DECLARE
  n     int;
  names text;
BEGIN
  SELECT count(*), COALESCE(string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', ' ORDER BY p.proname), '-')
    INTO n, names
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
   WHERE ns.nspname = 'public'
     AND p.prosecdef
     AND has_function_privilege('authenticated', p.oid, 'EXECUTE');
  RAISE NOTICE 'SECURITY DEFINER executable by authenticated (by design residual): % — %', n, names;

  SELECT count(*) INTO n
    FROM pg_policies
   WHERE schemaname = 'public' AND (qual = 'true' OR with_check = 'true');
  RAISE NOTICE 'always-true policies remaining in public schema: %', n;

  SELECT count(*) INTO n
    FROM pg_policies p
   WHERE p.schemaname = 'storage'
     AND p.tablename = 'objects'
     AND p.cmd = 'SELECT'
     AND EXISTS (
       SELECT 1 FROM storage.buckets b
        WHERE b.public
          AND p.qual ~* (E'bucket_id\\s*=\\s*' ||
               replace(replace(replace(replace(replace(replace(replace(
                 quote_literal(b.id), '.', E'\\.'), '*', E'\\*'), '(', E'\\('), ')', E'\\)'),
                 '$', E'\\$'), '+', E'\\+'), '?', E'\\?'))
     );
  RAISE NOTICE 'bucket-specific SELECT policies on public buckets remaining: %', n;

  SELECT count(*) INTO n
    FROM pg_extension e
    JOIN pg_namespace ns ON ns.oid = e.extnamespace
   WHERE ns.nspname = 'public' AND e.extname IN ('dblink', 'http', 'pg_net');
  RAISE NOTICE 'flagged extensions still in public schema: %', n;
END $verify$;
