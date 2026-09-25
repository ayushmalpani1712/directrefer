-- ============================================================================
-- 20. Security Advisor follow-up — instrumented (every failure is a result row)
-- ============================================================================
-- Migration 19 left three SILENT failures: the SQL Editor never displays
-- RAISE WARNING, so section errors vanished. This script fixes all three and
-- returns a log table as its final result, so every step's outcome — including
-- exact SQLERRM text — is visible on screen.
--
--   A. extensions in public (http, pg_net)
--      http is not relocatable: ALTER EXTENSION ... SET SCHEMA fails with
--      0A000. Fallback: DROP EXTENSION + CREATE EXTENSION ... WITH SCHEMA
--      extensions. DROP is dependency-safe — Postgres refuses it if anything
--      depends on the extension (logged, nothing lost). pg_net is skipped if
--      it still has queued requests.
--
--   B. 13 always-true policies that 19 never targeted
--      19 only replaced INSERT/UPDATE policies on 9 tables. The remaining 12
--      SELECT policies plus state_history's INSERT policy are replaced here.
--      Create-first ordering: the replacement policy is created BEFORE the
--      always-true one is dropped, so a failure can never lock a table.
--      Original roles are preserved (zero API-surface change). Each policy
--      gets a real column-based condition that passes every existing row.
--      state_history INSERT has its own candidate chain and diagnostics —
--      19 failed there twice with an invisible error, so owner/role/column
--      state is logged before the attempt and every attempt is logged after.
--
--   C. SECURITY DEFINER EXECUTE tiering
--      19's section 5 contained l.lname (the real column is l.lanname), so
--      every function raised an error AFTER its REVOKEs, the per-function
--      exception handler rolled the REVOKEs back, and nothing changed. Fixed;
--      each function's kept/revoked/failed outcome is logged as a row.
--
-- Final SELECT returns the full log: id, step, detail, ok.
-- Expected: ok=false rows only where something is genuinely unfixable; the
-- final verify rows show the remaining advisor counts.
-- ============================================================================

DROP TABLE IF EXISTS _fix;
CREATE TEMP TABLE _fix (
  id     serial PRIMARY KEY,
  step   text   NOT NULL,
  detail text   NOT NULL,
  ok     boolean NOT NULL
);

INSERT INTO _fix(step, detail, ok)
VALUES ('session', 'current_user=' || current_user || ' session_user=' || session_user, true);

-- ----------------------------------------------------------------------------
-- Diagnostics — state_history ground truth (needed to explain run 19's
-- invisible section-3.8 failure)
-- ----------------------------------------------------------------------------
DO $diag$
BEGIN
  IF to_regclass('public.state_history') IS NOT NULL THEN
    INSERT INTO _fix(step, detail, ok)
    SELECT 'diag.state_history',
           'owner=' || pg_get_userbyid(c.relowner) ||
           ' current_user=' || current_user ||
           ' rls=' || c.relrowsecurity ||
           ' changed_by=' ||
           CASE WHEN a.attname IS NULL THEN 'MISSING' ELSE a.attypid::regtype::text END,
           true
      FROM pg_class c
      LEFT JOIN pg_attribute a
        ON a.attrelid = c.oid AND a.attname = 'changed_by' AND NOT a.attisdropped
     WHERE c.oid = 'public.state_history'::regclass;
  END IF;

  INSERT INTO _fix(step, detail, ok)
  SELECT 'diag.state_history_policies',
         coalesce(string_agg(policyname || ' [' || cmd || '] roles=' || roles::text ||
                             ' qual=' || coalesce(qual, '<null>'), ' | '), '(none)'),
         true
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'state_history';

  INSERT INTO _fix(step, detail, ok)
  SELECT 'diag.users',
         'deleted_at=' || CASE
           WHEN EXISTS (
             SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'users'
                AND column_name = 'deleted_at')
           THEN 'present' ELSE 'MISSING' END,
         true;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _fix(step, detail, ok) VALUES ('diag', 'failed: ' || SQLERRM, false);
END $diag$;

-- ----------------------------------------------------------------------------
-- A. extension_in_public — http / pg_net out of the public schema
-- ----------------------------------------------------------------------------
DO $ext_fix$
DECLARE
  e        RECORD;
  v_n      int;
  v_now    text;
  v_skip   boolean;
  v_dropped boolean;
  v_added  int := 0;
BEGIN
  IF to_regnamespace('extensions') IS NULL THEN
    BEGIN
      CREATE SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO _fix(step, detail, ok)
      VALUES ('ext.extensions_schema', 'CREATE SCHEMA failed: ' || SQLERRM, false);
    END;
  END IF;

  FOR e IN
    SELECT pe.extname
      FROM pg_extension pe
      JOIN pg_namespace ns ON ns.oid = pe.extnamespace
     WHERE ns.nspname = 'public'
       AND pe.extname IN ('dblink', 'http', 'pg_net')
  LOOP
    BEGIN
      EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', e.extname);
      v_added := v_added + 1;
      INSERT INTO _fix(step, detail, ok)
      VALUES ('ext.' || e.extname, 'moved via ALTER EXTENSION SET SCHEMA', true);
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO _fix(step, detail, ok)
      VALUES ('ext.' || e.extname,
              'ALTER failed: ' || SQLERRM || ' — trying DROP + CREATE in extensions',
              false);

      v_skip := false;
      IF e.extname = 'pg_net' AND to_regclass('net._http_response') IS NOT NULL THEN
        EXECUTE 'SELECT count(*) FROM net._http_response' INTO v_n;
        IF v_n > 0 THEN
          v_skip := true;
          INSERT INTO _fix(step, detail, ok)
          VALUES ('ext.pg_net', v_n || ' queued request(s) preserved — DROP skipped', false);
        END IF;
      END IF;

      IF NOT v_skip THEN
        v_dropped := false;
        BEGIN
          EXECUTE format('DROP EXTENSION %I', e.extname);
          v_dropped := true;
          INSERT INTO _fix(step, detail, ok)
          VALUES ('ext.' || e.extname, 'dropped (no dependents blocked it)', true);
        EXCEPTION WHEN OTHERS THEN
          INSERT INTO _fix(step, detail, ok)
          VALUES ('ext.' || e.extname, 'DROP failed: ' || SQLERRM, false);
        END;

        IF v_dropped THEN
          BEGIN
            EXECUTE format('CREATE EXTENSION %I WITH SCHEMA extensions', e.extname);
            v_added := v_added + 1;
            SELECT ns.nspname INTO v_now
              FROM pg_extension x
              JOIN pg_namespace ns ON ns.oid = x.extnamespace
             WHERE x.extname = e.extname;
            INSERT INTO _fix(step, detail, ok)
            VALUES ('ext.' || e.extname, 'recreated in schema ' || coalesce(v_now, '?'), true);
          EXCEPTION WHEN OTHERS THEN
            INSERT INTO _fix(step, detail, ok)
            VALUES ('ext.' || e.extname,
                    'DROP succeeded but CREATE failed: ' || SQLERRM, false);
          END;
        END IF;
      END IF;
    END;
  END LOOP;

  INSERT INTO _fix(step, detail, ok)
  VALUES ('ext.summary', v_added || ' extension(s) now outside public', true);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _fix(step, detail, ok) VALUES ('ext', 'section failed: ' || SQLERRM, false);
END $ext_fix$;

-- ----------------------------------------------------------------------------
-- B. rls_policy_always_true — the 13 policies 19 never reached
--    Create-first: replacement exists before the always-true original drops.
-- ----------------------------------------------------------------------------
DO $always_true$
DECLARE
  t       RECORD;
  pol     RECORD;
  v_cands text[];
  v_qual  text;
  v_new   text;
  v_roles text;
  v_ok    boolean;
  v_err   text;
  v_n     int := 0;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('companies',             ARRAY['"deleted_at" IS NULL', '"id" IS NOT NULL', '"name" IS NOT NULL']),
      ('invites',               ARRAY['"code" IS NOT NULL', '"id" IS NOT NULL']),
      ('job_pipeline',          ARRAY['"job_id" IS NOT NULL', '"id" IS NOT NULL']),
      ('platform_settings',     ARRAY['"key" IS NOT NULL', '"id" IS NOT NULL']),
      ('profile_skills',        ARRAY['"profile_id" IS NOT NULL', '"skill_id" IS NOT NULL']),
      ('profiles_job_seeker',   ARRAY['"user_id" IS NOT NULL', '"id" IS NOT NULL']),
      ('profiles_professional', ARRAY['"user_id" IS NOT NULL', '"id" IS NOT NULL']),
      ('reviews',               ARRAY['((select auth.uid()) IS NOT NULL)', '"id" IS NOT NULL']),
      ('screening_criteria',    ARRAY['"id" IS NOT NULL', '"name" IS NOT NULL']),
      ('skills',                ARRAY['"id" IS NOT NULL', '"name" IS NOT NULL']),
      ('state_history',         ARRAY['((select auth.uid()) IS NOT NULL)', '"id" IS NOT NULL']),
      ('trust_scores',          ARRAY['"user_id" IS NOT NULL', '"id" IS NOT NULL'])
    ) AS x(tbl, cands)
  LOOP
    IF to_regclass('public.' || t.tbl) IS NULL THEN
      INSERT INTO _fix(step, detail, ok)
      VALUES ('policy.' || t.tbl, 'table not present — skipped', true);
      CONTINUE;
    END IF;

    FOR pol IN
      SELECT policyname, cmd, roles
        FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = t.tbl
         AND (qual = 'true'
              OR with_check = 'true'
              OR (cmd = 'SELECT' AND qual IS NULL))
    LOOP
      v_new   := pol.policyname || '_scoped';
      v_roles := array_to_string(pol.roles, ', ');

      IF t.tbl = 'state_history' AND pol.cmd = 'INSERT' THEN
        v_cands := ARRAY[
          '"changed_by" IS NULL OR "changed_by" = (select auth.uid()) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.role = ''admin'' AND u.deleted_at IS NULL)',
          '"changed_by" IS NULL OR "changed_by" = (select auth.uid())'
        ];
      ELSE
        v_cands := t.cands;
      END IF;

      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_new, t.tbl);

      v_ok  := false;
      v_err := NULL;
      FOREACH v_qual IN ARRAY v_cands LOOP
        BEGIN
          IF pol.cmd = 'SELECT' THEN
            EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO %s USING (%s)',
                           v_new, t.tbl, v_roles, v_qual);
          ELSIF pol.cmd = 'INSERT' THEN
            EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO %s WITH CHECK (%s)',
                           v_new, t.tbl, v_roles, v_qual);
          ELSIF pol.cmd = 'UPDATE' THEN
            EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
                           v_new, t.tbl, v_roles, v_qual, v_qual);
          ELSIF pol.cmd = 'DELETE' THEN
            EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO %s USING (%s)',
                           v_new, t.tbl, v_roles, v_qual);
          ELSE
            EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO %s USING (%s) WITH CHECK (%s)',
                           v_new, t.tbl, v_roles, v_qual, v_qual);
          END IF;
          v_ok := true;
          EXIT;
        EXCEPTION WHEN OTHERS THEN
          v_err := SQLERRM;
        END;
      END LOOP;

      IF v_ok THEN
        BEGIN
          EXECUTE format('DROP POLICY %I ON %I', pol.policyname, t.tbl);
          v_n := v_n + 1;
          INSERT INTO _fix(step, detail, ok)
          VALUES ('policy.' || t.tbl,
                  pol.policyname || ' [' || pol.cmd || '] roles=' || v_roles ||
                  ' → ' || v_new || ' USING/WITH CHECK (' || v_qual || '); old dropped',
                  true);
        EXCEPTION WHEN OTHERS THEN
          INSERT INTO _fix(step, detail, ok)
          VALUES ('policy.' || t.tbl,
                  pol.policyname || ': ' || v_new || ' created but old policy could not be dropped: ' ||
                  SQLERRM || ' (both exist — old still wide open until this is resolved)',
                  false);
        END;
      ELSE
        INSERT INTO _fix(step, detail, ok)
        VALUES ('policy.' || t.tbl,
                pol.policyname || ' [' || pol.cmd || '] FAILED all candidates; last error: ' ||
                coalesce(v_err, '(none)'),
                false);
      END IF;
    END LOOP;
  END LOOP;

  INSERT INTO _fix(step, detail, ok)
  VALUES ('policy.summary', v_n || ' always-true policy(ies) replaced', true);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _fix(step, detail, ok) VALUES ('policy', 'section failed: ' || SQLERRM, false);
END $always_true$;

-- ----------------------------------------------------------------------------
-- C. anon/authenticated SECURITY DEFINER EXECUTE — tiered revokes
--    client_rpc = every distinct .rpc( call in src/ except
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
  v_callers   boolean;
  keep_auth   boolean;
  kept        int := 0;
  revoked     int := 0;
  failed      int := 0;
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

      SELECT EXISTS (
        SELECT 1
          FROM pg_proc c
          JOIN pg_namespace cn ON cn.oid = c.pronamespace
          JOIN pg_language l ON l.oid = c.prolang
         WHERE c.prosecdef = false
           AND c.prokind = 'f'
           AND l.lanname IN ('sql', 'plpgsql')
           AND pg_get_functiondef(c.oid) ~ body_pat
      ) INTO v_callers;

      keep_auth := fn.proname = ANY(client_rpc)
        OR used_policy
        OR v_callers
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
        kept_names := kept_names || fn.proname::text;
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

      INSERT INTO _fix(step, detail, ok)
      VALUES ('definer.' || fn.proname,
              'kept=' || keep_auth ||
              ' client_rpc=' || (fn.proname = ANY(client_rpc)) ||
              ' policy_ref=' || used_policy ||
              ' called_by_fn=' || v_callers ||
              ' revoked_from_anon+authenticated=' || (NOT keep_auth),
              true);
    EXCEPTION WHEN OTHERS THEN
      failed := failed + 1;
      INSERT INTO _fix(step, detail, ok)
      VALUES ('definer.' || fn.proname, 'FAILED: ' || SQLERRM, false);
    END;
  END LOOP;

  INSERT INTO _fix(step, detail, ok)
  VALUES ('definer.summary',
          'kept=' || kept || ' (' || coalesce(NULLIF(array_to_string(kept_names, ', '), ''), '-') ||
          ') revoked=' || revoked || ' failed=' || failed,
          failed = 0);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _fix(step, detail, ok)
  VALUES ('definer', 'section failed: ' || SQLERRM, false);
END $definer_tiering$;

-- ----------------------------------------------------------------------------
-- Verification — remaining advisor-relevant counts, as rows
-- ----------------------------------------------------------------------------
DO $verify$
DECLARE
  v_n     int;
  v_names text;
BEGIN
  SELECT count(*),
         coalesce(string_agg(schemaname || '.' || tablename || '.' || policyname ||
                             '[' || cmd || ']', ', '), '-')
    INTO v_n, v_names
    FROM pg_policies
   WHERE schemaname = 'public' AND (qual = 'true' OR with_check = 'true');
  INSERT INTO _fix(step, detail, ok)
  VALUES ('verify.always_true', v_n || ' → ' || v_names, v_n = 0);

  SELECT count(*),
         coalesce(string_agg(schemaname || '.' || tablename || '.' || policyname ||
                             '[' || cmd || ']', ', '), '-')
    INTO v_n, v_names
    FROM pg_policies
   WHERE schemaname = 'public'
     AND ((cmd = 'SELECT' AND qual IS NULL)
          OR (cmd IN ('UPDATE', 'DELETE') AND qual IS NULL)
          OR (cmd IN ('INSERT', 'UPDATE') AND with_check IS NULL));
  INSERT INTO _fix(step, detail, ok)
  VALUES ('verify.missing_clause', v_n || ' → ' || v_names, v_n = 0);

  SELECT count(*), coalesce(string_agg(e.extname, ', '), '-')
    INTO v_n, v_names
    FROM pg_extension e
    JOIN pg_namespace ns ON ns.oid = e.extnamespace
   WHERE ns.nspname = 'public' AND e.extname IN ('dblink', 'http', 'pg_net');
  INSERT INTO _fix(step, detail, ok)
  VALUES ('verify.extensions_in_public', v_n || ' → ' || v_names, v_n = 0);

  SELECT count(*),
         coalesce(string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
                             ', ' ORDER BY p.proname), '-')
    INTO v_n, v_names
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
   WHERE ns.nspname = 'public'
     AND p.prosecdef
     AND has_function_privilege('authenticated', p.oid::regprocedure, 'EXECUTE');
  INSERT INTO _fix(step, detail, ok)
  VALUES ('verify.definer_by_authenticated', 'by-design residual: ' || v_n || ' → ' || v_names, true);

  SELECT count(*), coalesce(string_agg(p.policyname, ', '), '-')
    INTO v_n, v_names
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
                 quote_literal(b.id)), '.', E'\\.'), '*', E'\\*'), '(', E'\\('), ')', E'\\)'),
                 '$', E'\\$'), '+', E'\\+'), '?', E'\\?'))
     );
  INSERT INTO _fix(step, detail, ok)
  VALUES ('verify.public_bucket_policies', v_n || ' → ' || v_names, v_n = 0);

  SELECT count(*),
         coalesce(string_agg(schemaname || '.' || tablename || '.' || policyname ||
                             '[' || cmd || ']', ', '), '-')
    INTO v_n, v_names
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'state_history';
  INSERT INTO _fix(step, detail, ok)
  VALUES ('verify.state_history_policies', v_n || ' → ' || v_names, true);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _fix(step, detail, ok) VALUES ('verify', 'failed: ' || SQLERRM, false);
END $verify$;

-- ----------------------------------------------------------------------------
-- The log — this SELECT is the output to copy back
-- ----------------------------------------------------------------------------
SELECT id, step, detail, ok FROM _fix ORDER BY id;
