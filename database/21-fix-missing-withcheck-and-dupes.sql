-- ============================================================================
-- 21. Security Advisor follow-up 2 — 0024 missing WITH CHECK + 0006 duplicates
-- ============================================================================
-- Run after 20. Instrumented: the final SELECT returns the _fix log, so every
-- step's outcome (including SQLERRM) is a visible result row.
--
--   A. 0024_permissive_rls_policy — the docs list "Missing WITH CHECK clause
--      on permissive INSERT/UPDATE policies" as a detected pattern. Migration
--      20's verify found 10 UPDATE policies with with_check IS NULL.
--      Postgres defaults WITH CHECK to USING for UPDATE, so recreating them
--      with an explicit WITH CHECK identical to USING is a zero-behavior-change
--      fix. Create-first: a temp policy exists before the original drops, so
--      a failure can never leave the table unprotected.
--
--   B. state_history has two permissive INSERT policies after 20
--      (state_history_insert_authorized from 19 + state_history_insert_scoped).
--      They enforce the same rule; the duplicate only triggers
--      0006_multiple_permissive_policies. The scoped policy (wider role set,
--      auth.uid() already wrapped) stays.
--
--   C. Generic 0006 dedup — same table + command, both permissive, identical
--      definitions (whitespace-normalised), and the keeper covers the
--      duplicate's roles → drop the duplicate. Groups with differing
--      definitions are left alone and logged for manual review.
--
--   D. 0003_auth_rls_initplan — bare auth.uid()/jwt()/role()/email() in
--      policy expressions is re-evaluated per row. Each occurrence is wrapped
--      in (select ...) ONLY when the expression contains no already-wrapped
--      auth.* call, so nothing can be double-wrapped. Mixed expressions are
--      skipped and counted.
--
--   E. Verification rows: 0024 residue, always-true residue, remaining
--      duplicate groups, remaining bare-auth policies, state_history policy
--      list, public tables with RLS disabled (0013 candidates).
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
-- A. 0024 — UPDATE policies missing WITH CHECK
-- ----------------------------------------------------------------------------
DO $missing_wc$
DECLARE
  pol     RECORD;
  v_roles text;
  v_n     int := 0;
BEGIN
  FOR pol IN
    SELECT policyname, tablename, roles, qual, permissive
      FROM pg_policies
     WHERE schemaname = 'public'
       AND cmd = 'UPDATE'
       AND with_check IS NULL
       AND permissive = 'PERMISSIVE'
  LOOP
    IF pol.qual IS NULL THEN
      INSERT INTO _fix(step, detail, ok)
      VALUES ('wc.' || pol.tablename,
              pol.policyname || ': USING is also NULL — cannot infer WITH CHECK; manual fix required',
              false);
      CONTINUE;
    END IF;

    v_roles := array_to_string(pol.roles, ', ');
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', '_tmp_wc_21', pol.tablename);
      EXECUTE format('CREATE POLICY %I ON %I AS %s FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
                     '_tmp_wc_21', pol.tablename, pol.permissive, v_roles, pol.qual, pol.qual);
      EXECUTE format('DROP POLICY %I ON %I', pol.policyname, pol.tablename);
      EXECUTE format('CREATE POLICY %I ON %I AS %s FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
                     pol.policyname, pol.tablename, pol.permissive, v_roles, pol.qual, pol.qual);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', '_tmp_wc_21', pol.tablename);
      v_n := v_n + 1;
      INSERT INTO _fix(step, detail, ok)
      VALUES ('wc.' || pol.tablename,
              pol.policyname || ' [' || v_roles || '] explicit WITH CHECK (' || pol.qual || ') added',
              true);
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO _fix(step, detail, ok)
      VALUES ('wc.' || pol.tablename,
              pol.policyname || ' FAILED: ' || SQLERRM,
              false);
    END;
  END LOOP;

  INSERT INTO _fix(step, detail, ok)
  VALUES ('wc.summary', v_n || ' UPDATE policy(ies) given an explicit WITH CHECK', true);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _fix(step, detail, ok) VALUES ('wc', 'section failed: ' || SQLERRM, false);
END $missing_wc$;

-- ----------------------------------------------------------------------------
-- B. state_history — drop the duplicate INSERT policy from 19
-- ----------------------------------------------------------------------------
DO $state_dup$
DECLARE
  v_def text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'state_history'
       AND policyname = 'state_history_insert_authorized'
  ) THEN
    SELECT coalesce(qual, '<null>') || ' WITH CHECK ' || coalesce(with_check, '<null>')
      INTO v_def
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'state_history'
       AND policyname = 'state_history_insert_authorized';

    EXECUTE 'DROP POLICY "state_history_insert_authorized" ON public.state_history';
    INSERT INTO _fix(step, detail, ok)
    VALUES ('dup.state_history',
            'dropped state_history_insert_authorized (same rule as state_history_insert_scoped, wider role set); was: ' ||
            v_def,
            true);
  ELSE
    INSERT INTO _fix(step, detail, ok)
    VALUES ('dup.state_history', 'state_history_insert_authorized not present — skipped', true);
  END IF;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _fix(step, detail, ok) VALUES ('dup.state_history', 'failed: ' || SQLERRM, false);
END $state_dup$;

-- ----------------------------------------------------------------------------
-- C. 0006 — generic duplicate-permissive-policy dedup (identical definitions)
-- ----------------------------------------------------------------------------
DO $dedup$
DECLARE
  g         RECORD;
  pol       RECORD;
  v_keeper  text;
  v_qual    text;
  v_wc      text;
  v_dropped int := 0;
  v_review  int := 0;
  v_kept    int;
BEGIN
  FOR g IN
    SELECT tablename, cmd
      FROM pg_policies
     WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
     GROUP BY tablename, cmd
    HAVING count(*) > 1
  LOOP
    v_kept := 0;

    FOR pol IN
      SELECT policyname, qual, with_check, roles
        FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = g.tablename
         AND cmd = g.cmd
         AND permissive = 'PERMISSIVE'
       ORDER BY policyname
    LOOP
      v_qual := coalesce(regexp_replace(pol.qual, '\s+', ' ', 'g'), '');
      v_wc   := coalesce(regexp_replace(pol.with_check, '\s+', ' ', 'g'), '');
      v_keeper := NULL;

      SELECT p2.policyname INTO v_keeper
        FROM pg_policies p2
       WHERE p2.schemaname = 'public'
         AND p2.tablename = g.tablename
         AND p2.cmd = g.cmd
         AND p2.permissive = 'PERMISSIVE'
         AND p2.policyname < pol.policyname
         AND coalesce(regexp_replace(p2.qual, '\s+', ' ', 'g'), '') = v_qual
         AND coalesce(regexp_replace(p2.with_check, '\s+', ' ', 'g'), '') = v_wc
         AND ('public' = ANY(p2.roles) OR pol.roles <@ p2.roles)
       ORDER BY p2.policyname
       LIMIT 1;

      IF v_keeper IS NOT NULL THEN
        EXECUTE format('DROP POLICY %I ON %I', pol.policyname, g.tablename);
        v_dropped := v_dropped + 1;
        INSERT INTO _fix(step, detail, ok)
        VALUES ('dup.' || g.tablename,
                g.cmd || ': dropped ' || pol.policyname || ' (identical to ' || v_keeper || ')',
                true);
      ELSE
        v_kept := v_kept + 1;
      END IF;
    END LOOP;

    IF v_kept > 1 THEN
      v_review := v_review + 1;
      INSERT INTO _fix(step, detail, ok)
      VALUES ('dup.' || g.tablename,
              g.cmd || ' still has ' || v_kept ||
              ' permissive policies with DIFFERENT definitions — manual review required',
              true);
    END IF;
  END LOOP;

  INSERT INTO _fix(step, detail, ok)
  VALUES ('dup.summary',
          v_dropped || ' duplicate policy(ies) dropped, ' || v_review || ' group(s) left for manual review',
          true);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _fix(step, detail, ok) VALUES ('dup', 'section failed: ' || SQLERRM, false);
END $dedup$;

-- ----------------------------------------------------------------------------
-- D. 0003 — wrap bare auth.* calls in policy expressions
-- ----------------------------------------------------------------------------
DO $auth_wrap$
DECLARE
  pol    RECORD;
  v_qual text;
  v_wc   text;
  v_ch_q boolean;
  v_ch_w boolean;
  v_stmt text;
  v_n    int := 0;
  v_skip int := 0;
BEGIN
  FOR pol IN
    SELECT policyname, tablename, qual, with_check
      FROM pg_policies
     WHERE schemaname = 'public'
       AND (qual ~ '(auth)\.(uid|jwt|role|email)\(\)'
            OR with_check ~ '(auth)\.(uid|jwt|role|email)\(\)')
  LOOP
    v_ch_q := false;
    v_ch_w := false;
    v_qual := pol.qual;
    v_wc   := pol.with_check;

    IF pol.qual IS NOT NULL
       AND pol.qual ~ '(auth)\.(uid|jwt|role|email)\(\)'
       AND lower(pol.qual) !~ 'select\s+auth\.'
    THEN
      v_qual := replace(replace(replace(replace(pol.qual,
                 'auth.uid()', '(select auth.uid())'),
                 'auth.jwt()', '(select auth.jwt())'),
                 'auth.role()', '(select auth.role())'),
                 'auth.email()', '(select auth.email())');
      v_ch_q := true;
    END IF;

    IF pol.with_check IS NOT NULL
       AND pol.with_check ~ '(auth)\.(uid|jwt|role|email)\(\)'
       AND lower(pol.with_check) !~ 'select\s+auth\.'
    THEN
      v_wc := replace(replace(replace(replace(pol.with_check,
                 'auth.uid()', '(select auth.uid())'),
                 'auth.jwt()', '(select auth.jwt())'),
                 'auth.role()', '(select auth.role())'),
                 'auth.email()', '(select auth.email())');
      v_ch_w := true;
    END IF;

    IF v_ch_q OR v_ch_w THEN
      BEGIN
        v_stmt := format('ALTER POLICY %I ON %I', pol.policyname, pol.tablename);
        IF v_ch_q THEN
          v_stmt := v_stmt || format(' USING (%s)', v_qual);
        END IF;
        IF v_ch_w THEN
          v_stmt := v_stmt || format(' WITH CHECK (%s)', v_wc);
        END IF;
        EXECUTE v_stmt;
        v_n := v_n + 1;
        INSERT INTO _fix(step, detail, ok)
        VALUES ('auth.' || pol.tablename,
                pol.policyname || ': wrapped bare auth.* call(s) in (select ...)',
                true);
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO _fix(step, detail, ok)
        VALUES ('auth.' || pol.tablename, pol.policyname || ' FAILED: ' || SQLERRM, false);
      END;
    ELSE
      v_skip := v_skip + 1;
    END IF;
  END LOOP;

  INSERT INTO _fix(step, detail, ok)
  VALUES ('auth.summary',
          v_n || ' policy expression(s) wrapped, ' || v_skip || ' already wrapped or mixed — left untouched',
          true);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _fix(step, detail, ok) VALUES ('auth', 'section failed: ' || SQLERRM, false);
END $auth_wrap$;

-- ----------------------------------------------------------------------------
-- E. Verification — remaining advisor-relevant counts, as rows
-- ----------------------------------------------------------------------------
DO $verify21$
DECLARE
  v_n     int;
  v_names text;
BEGIN
  SELECT count(*),
         coalesce(string_agg(schemaname || '.' || tablename || '.' || policyname ||
                             '[' || cmd || ']', ', '), '-')
    INTO v_n, v_names
    FROM pg_policies
   WHERE schemaname = 'public'
     AND permissive = 'PERMISSIVE'
     AND ((cmd = 'SELECT' AND qual IS NULL)
          OR (cmd IN ('UPDATE', 'DELETE') AND qual IS NULL)
          OR (cmd IN ('INSERT', 'UPDATE') AND with_check IS NULL));
  INSERT INTO _fix(step, detail, ok)
  VALUES ('verify.missing_clause', v_n || ' → ' || v_names, v_n = 0);

  SELECT count(*),
         coalesce(string_agg(schemaname || '.' || tablename || '.' || policyname ||
                             '[' || cmd || ']', ', '), '-')
    INTO v_n, v_names
    FROM pg_policies
   WHERE schemaname = 'public'
     AND (qual = 'true' OR with_check = 'true');
  INSERT INTO _fix(step, detail, ok)
  VALUES ('verify.always_true', v_n || ' → ' || v_names, v_n = 0);

  SELECT count(*), coalesce(string_agg(g.grp, ', '), '-')
    INTO v_n, v_names
    FROM (
      SELECT tablename || ' ' || cmd || ': ' ||
             string_agg(policyname, ', ' ORDER BY policyname) AS grp
        FROM pg_policies
       WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
       GROUP BY tablename, cmd
      HAVING count(*) > 1
    ) g;
  INSERT INTO _fix(step, detail, ok)
  VALUES ('verify.duplicate_groups', v_n || ' → ' || v_names, v_n = 0);

  SELECT count(*),
         coalesce(string_agg(schemaname || '.' || tablename || '.' || policyname, ', '), '-')
    INTO v_n, v_names
    FROM pg_policies
   WHERE schemaname = 'public'
     AND ((qual ~ '(auth)\.(uid|jwt|role|email)\(\)'
           AND lower(qual) !~ 'select\s+auth\.')
          OR (with_check ~ '(auth)\.(uid|jwt|role|email)\(\)'
              AND lower(with_check) !~ 'select\s+auth\.'));
  INSERT INTO _fix(step, detail, ok)
  VALUES ('verify.bare_auth', '0003 candidates: ' || v_n || ' → ' || v_names, v_n = 0);

  SELECT count(*), coalesce(string_agg(policyname || '[' || cmd || ']', ', '), '-')
    INTO v_n, v_names
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'state_history';
  INSERT INTO _fix(step, detail, ok)
  VALUES ('verify.state_history', v_n || ' → ' || v_names, true);

  SELECT count(*), coalesce(string_agg(c.relname, ', '), '-')
    INTO v_n, v_names
    FROM pg_class c
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;
  INSERT INTO _fix(step, detail, ok)
  VALUES ('verify.rls_disabled_public', v_n || ' → ' || v_names, v_n = 0);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _fix(step, detail, ok) VALUES ('verify', 'failed: ' || SQLERRM, false);
END $verify21$;

-- ----------------------------------------------------------------------------
-- The log — this SELECT is the output to copy back
-- ----------------------------------------------------------------------------
SELECT id, step, detail, ok FROM _fix ORDER BY id;
