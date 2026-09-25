-- ============================================================================
-- 19. Fix Supabase Security Advisor warnings (72 → ~10 by-design residual)
-- ============================================================================
-- Idempotent and safe to re-run. Runs as a single transaction in the SQL Editor;
-- EVERY section has its own exception guard, so a failure in one section is
-- reported as a WARNING and rolls back only that section — the rest still
-- applies. No single error can abort the whole script anymore.
--
-- Run 1 failed at section 3.8: live state_history has no changed_by column
-- (repo schema and client code both expect it — the client insert was already
-- failing with 400s). Section 0 now aligns the live table with the schema the
-- client code requires, then 3.8 can create the policy.
--
-- Fixes:
--   0. state_history schema alignment — add missing columns the client writes
--   1. function_search_path_mutable      — pin search_path on every public function lacking it
--   2. extension_in_public               — move dblink / http / pg_net into the extensions schema
--   3. rls_policy_always_true            — replace always-true policies on 9 tables
--   4. public_bucket_allows_listing      — drop bucket-specific SELECT policies on public buckets;
--                                          add an owner-scoped read policy (no bucket_id in qual)
--   5. anon/authenticated SECURITY DEFINER EXECUTE — tiered revokes (client RPC list
--      verified against every `.rpc(` call in src/ this run)
--
-- Expected AFTER running (~10 warnings, all by design):
--   * ~8-10 x authenticated SECURITY DEFINER executable — RPCs the web app must call
--   * 1 x auth_leaked_password_protection — dashboard only:
--     Authentication → Settings → enable "Protect against leaked passwords".
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. state_history schema alignment
--    The live table predates the V2 schema: no changed_by column, so every
--    recordStateTransition() insert 400s today. Add any missing client-written
--    columns (no FK constraints — plain types, zero failure risk). Each column
--    is added in its own sub-block so one failure never blocks the others.
--    Ends with a NOTICE printing the live column list (ground truth).
-- ----------------------------------------------------------------------------
DO $sh_align$
DECLARE
  c      RECORD;
  v_cols text;
BEGIN
  IF to_regclass('public.state_history') IS NOT NULL THEN
    FOR c IN
      SELECT * FROM (VALUES
        ('changed_by',  'uuid'),
        ('entity_type', 'text'),
        ('entity_id',   'uuid'),
        ('field',       'text'),
        ('old_value',   'text'),
        ('new_value',   'text'),
        ('reason',      'text'),
        ('metadata',    'jsonb DEFAULT ''{}''::jsonb'),
        ('created_at',  'timestamptz DEFAULT now()'),
        ('id',          'uuid DEFAULT gen_random_uuid()')
      ) AS t(col, def)
    LOOP
      BEGIN
        EXECUTE format('ALTER TABLE state_history ADD COLUMN IF NOT EXISTS %I %s', c.col, c.def);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'state_history: could not add column "%": %', c.col, SQLERRM;
      END;
    END LOOP;

    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'state_history'
           AND column_name = 'id' AND data_type = 'uuid'
      ) THEN
        EXECUTE 'ALTER TABLE state_history ALTER COLUMN id SET DEFAULT gen_random_uuid()';
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'state_history'
           AND column_name = 'created_at' AND data_type = 'timestamp with time zone'
      ) THEN
        EXECUTE 'ALTER TABLE state_history ALTER COLUMN created_at SET DEFAULT now()';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'state_history: could not set column defaults: %', SQLERRM;
    END;

    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) INTO v_cols
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'state_history';
    RAISE NOTICE 'state_history columns (live): %', COALESCE(v_cols, '(none)');
  ELSE
    RAISE NOTICE 'state_history table not present — skipped alignment';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'section 0 (state_history alignment) failed: %', SQLERRM;
END $sh_align$;

-- ----------------------------------------------------------------------------
-- 1. function_search_path_mutable
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
  RAISE NOTICE 'section 1: search_path pinned on % function(s)/procedure(s)', pinned;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'section 1 (search_path) failed: %', SQLERRM;
END $fix_searchpath$;

-- ----------------------------------------------------------------------------
-- 2. extension_in_public
-- ----------------------------------------------------------------------------
DO $move_ext$
DECLARE
  ext RECORD;
BEGIN
  IF to_regnamespace('extensions') IS NULL THEN
    BEGIN
      CREATE SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'could not create extensions schema: %', SQLERRM;
    END;
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
      RAISE NOTICE 'moved extension "%" to extensions schema', ext.extname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'extension "%" left in place (%)', ext.extname, SQLERRM;
    END;
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'section 2 (extensions) failed: %', SQLERRM;
END $move_ext$;

-- ----------------------------------------------------------------------------
-- 3. rls_policy_always_true
--    Columns referenced below were verified by run 1: sections 3.1-3.7 all
--    executed without error before the run aborted at 3.8.
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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'section 3.1 (applications) failed: %', SQLERRM;
END $applications_rls$;

-- 3.2 error_logs: 2x INSERT (user_id = self or null; anon only null)
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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'section 3.2 (error_logs) failed: %', SQLERRM;
END $error_logs_rls$;

-- 3.3 matches: INSERT (self symmetric + admin)
DO $matches_rls$
DECLARE
  pol    RECORD;
  v_expr text := $e$
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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'section 3.3 (matches) failed: %', SQLERRM;
END $matches_rls$;

-- 3.4 page_views: INSERT dropped (grep confirms no client writes/reads at all)
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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'section 3.4 (page_views) failed: %', SQLERRM;
END $page_views_rls$;

-- 3.5 profile_skills: INSERT + DELETE (own or admin)
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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'section 3.5 (profile_skills) failed: %', SQLERRM;
END $profile_skills_rls$;

-- 3.6 screening_attempts: INSERT (self or admin/recruiter/professional)
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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'section 3.6 (screening_attempts) failed: %', SQLERRM;
END $screening_attempts_rls$;

-- 3.7 screening_criteria: INSERT + UPDATE (admin-managed)
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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'section 3.7 (screening_criteria) failed: %', SQLERRM;
END $screening_criteria_rls$;

-- 3.8 state_history: INSERT. Every current call site passes changed_by =
--     auth.uid() (verified: JobDetail, AppContext, ReviewerScoring,
--     ScreeningQueue, RecruiterJobs, RecruiterScreening, ScreeningSubmit,
--     Applications-withdraw) or null. Guarded: the policy is only dropped
--     after confirming changed_by exists (section 0 guarantees it).
DO $state_history_rls$
DECLARE
  pol    RECORD;
  v_expr text;
BEGIN
  IF to_regclass('public.state_history') IS NOT NULL THEN
    IF to_regcolumn('public.state_history.changed_by') IS NOT NULL THEN
      FOR pol IN
        SELECT policyname FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'state_history' AND cmd = 'INSERT'
      LOOP
        EXECUTE format('DROP POLICY %I ON state_history', pol.policyname);
      END LOOP;

      v_expr := $e$
              changed_by IS NULL
              OR changed_by = auth.uid()
              OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin' AND u.deleted_at IS NULL)$e$;
      EXECUTE format('CREATE POLICY "state_history_insert_authorized" ON state_history FOR INSERT TO authenticated WITH CHECK (%s)', v_expr);
      RAISE NOTICE 'state_history: replaced INSERT policy';
    ELSE
      RAISE WARNING 'state_history still lacks changed_by (section 0 failed?) — INSERT policy left untouched';
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'section 3.8 (state_history) failed: %', SQLERRM;
END $state_history_rls$;

-- 3.9 waitlist_requests: INSERT dropped (no client writers)
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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'section 3.9 (waitlist_requests) failed: %', SQLERRM;
END $waitlist_rls$;

-- ----------------------------------------------------------------------------
-- 4. public_bucket_allows_listing
--    Public-bucket object GETs are served by storage via super-user (no RLS),
--    so public URLs / getPublicUrl() / iframe reads keep working without
--    policies. The new owner-scoped policy has no bucket_id in its qual, so it
--    never re-triggers the linter; it keeps list(userId) working.
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

  RAISE NOTICE 'section 4: dropped % bucket-specific SELECT policy(ies); added owner-scoped read', dropped;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'section 4 (storage) failed: %', SQLERRM;
END $public_buckets$;

-- ----------------------------------------------------------------------------
-- 5. SECURITY DEFINER executable by anon / authenticated
--    client_rpc = every distinct `.rpc(` call in src/ except
--    trim_password_history (not flagged by the linter — left untouched).
--    service_role + postgres always granted.
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
  v_sig       text;
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
    BEGIN
      v_sig := format('public.%I(%s)', fn.proname, pg_get_function_identity_arguments(fn.oid));

      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', v_sig);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', v_sig);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', v_sig);

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
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_sig);
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
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', v_sig);
      END IF;

      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO postgres', v_sig);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'tiering failed for %: %', fn.proname, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'section 5: definer EXECUTE kept authenticated for % (%), revoked from %',
    kept, COALESCE(NULLIF(array_to_string(kept_names, ', '), ''), '-'), revoked;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'section 5 (definer tiering) failed: %', SQLERRM;
END $definer_tiering$;

-- ----------------------------------------------------------------------------
-- 6. Verification summary (SQL Editor notices)
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
     AND has_function_privilege('authenticated', p.oid::regprocedure, 'EXECUTE');
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

  SELECT COALESCE(string_agg(policyname, ', '), '(none)') INTO names
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'state_history' AND cmd = 'INSERT';
  RAISE NOTICE 'state_history INSERT policies: %', names;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'section 6 (verify) failed: %', SQLERRM;
END $verify$;
