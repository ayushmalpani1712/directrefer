-- ============================================================================
-- 22. Consolidate duplicate permissive policies — clear the 0006 warnings
-- ============================================================================
-- Run after 21. Instrumented: the final SELECT returns the _fix log, so every
-- step's outcome (including SQLERRM) is a visible result row.
--
--   A. Work list — every public PERMISSIVE policy is expanded into one row per
--      action it covers (cmd='ALL' -> SELECT/INSERT/UPDATE/DELETE); pairs with
--      more than one policy per (table, action) are duplicate groups. This
--      detects a SUPERSET of the Security Advisor's 0006 grouping (which is
--      per role + action): anything the advisor flags is found here.
--
--   B. Plan — one target policy per affected action, fully computed before any
--      DDL:
--        * dropped   = every policy contributing to a duplicate action;
--        * affected  = every action of every dropped policy (an ALL policy
--          dropped because of SELECT also gives up INSERT/UPDATE/DELETE, so
--          all four actions are rewritten from the same sources);
--        * roles     = union of the sources' roles, collapsed to `public`
--          when any source is public;
--        * expr      = OR of the sources' expressions. A source whose roles
--          are narrower than the union is wrapped in
--          `CASE WHEN current_user IN (<its roles>) THEN (<expr>) ELSE false
--            END`, which reproduces its TO-clause applicability exactly: for
--          every session role the merged policy evaluates the same set of
--          expressions as the originals did (no widening, no narrowing).
--          CASE guarantees the branch is not evaluated for roles outside the
--          source's TO clause, so roles like anon never touch gated
--          security-definer calls. current_user is a keyword — the gate adds
--          no function call, so no EXECUTE grants are needed or changed.
--        * INSERT gets WITH CHECK only; SELECT/DELETE get USING only; UPDATE
--          gets both. WITH CHECK falls back to USING, which is exactly
--          Postgres' documented default ("if no WITH CHECK expression is
--          defined, then the USING expression will be used ... and which new
--          rows will be allowed to be added"), so the split of an ALL policy
--          is behavior-identical.
--      A table whose sources cannot be composed (missing expression, name
--      collision) is skipped whole and logged — nothing partial is planned.
--
--   C. Apply — per table: create every target first; only when all creates
--      succeeded are the originals dropped. A failed create drops the targets
--      already made for that table and leaves the originals untouched. The
--      targets are the union of the originals, so at no instant is access
--      broader than before.
--
--   D. Verification rows — the 0006 replica after the rewrite (expect 0),
--      0024 missing-clause residue, always-true residue, bare auth.* residue,
--      public tables with RLS disabled, and the resulting policy list of
--      every rewritten table.
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
-- A. Work list — action-expanded rows + duplicate groups
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS _act;
CREATE TEMP TABLE _act (
  tablename  text,
  policyname text,
  action     text,
  qual       text,
  with_check text,
  roles_csv  text
);

INSERT INTO _act (tablename, policyname, action, qual, with_check, roles_csv)
SELECT p.tablename, p.policyname, v.action, p.qual, p.with_check,
       array_to_string(p.roles, ',')
  FROM pg_policies p
 CROSS JOIN LATERAL (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) v(action)
 WHERE p.schemaname = 'public'
   AND p.permissive = 'PERMISSIVE'
   AND (p.cmd = 'ALL' OR p.cmd = v.action);

DROP TABLE IF EXISTS _dup;
CREATE TEMP TABLE _dup AS
SELECT tablename, action
  FROM _act
 GROUP BY tablename, action
HAVING count(*) > 1;

INSERT INTO _fix(step, detail, ok)
SELECT 'dup.detected', coalesce(string_agg(x.k, ', ' ORDER BY x.k), 'none'), true
  FROM (
    SELECT d.tablename || ' ' || d.action || ': ' ||
           string_agg(a.policyname, ', ' ORDER BY a.policyname) AS k
      FROM _dup d
      JOIN _act a ON a.tablename = d.tablename AND a.action = d.action
     GROUP BY d.tablename, d.action
  ) x;

-- ----------------------------------------------------------------------------
-- B. Plan — compose one target policy per affected action (no DDL yet)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS _plan;
CREATE TEMP TABLE _plan (
  tablename text,
  action    text,
  target    text,
  stmt      text
);

DO $plan22$
DECLARE
  t         text;
  a         text;
  s         RECORD;
  v_drop    text[];
  v_acts    text[];
  v_toks    text[];
  v_soks    text[];
  v_un      text;
  v_pre     text;
  v_post    text;
  v_cover   boolean;
  v_gate    text;
  v_e       text;
  v_e2      text;
  v_parts_u text[];
  v_parts_w text[];
  v_target  text;
  v_stmt    text;
  v_why     text;
  v_owner   text;
  v_n       int := 0;
BEGIN
  FOR t IN SELECT tablename FROM _dup GROUP BY tablename ORDER BY tablename LOOP
    v_why := NULL;

    SELECT array_agg(DISTINCT policyname ORDER BY policyname) INTO v_drop
      FROM _act
     WHERE tablename = t
       AND action IN (SELECT action FROM _dup WHERE tablename = t);

    SELECT array_agg(DISTINCT action ORDER BY action) INTO v_acts
      FROM _act
     WHERE tablename = t
       AND policyname = ANY(v_drop);

    IF v_drop IS NULL OR v_acts IS NULL THEN
      v_why := 'empty drop/affected set (internal)';
    END IF;

    IF v_why IS NULL THEN
      FOR a IN SELECT unnest(v_acts) LOOP
        SELECT array_agg(DISTINCT trim(z.tok) ORDER BY trim(z.tok)) INTO v_toks
          FROM _act s2,
 LATERAL unnest(string_to_array(s2.roles_csv, ',')) AS z(tok)
         WHERE s2.tablename = t AND s2.action = a;

        IF v_toks IS NULL OR array_length(v_toks, 1) IS NULL THEN
          v_why := 'action ' || a || ': sources have no roles';
          EXIT;
        END IF;

        IF 'public' = ANY(v_toks) THEN
          v_un := 'public';
        ELSE
          SELECT string_agg(quote_ident(z2.tok), ', ' ORDER BY z2.tok) INTO v_un
            FROM unnest(v_toks) AS z2(tok);
          IF v_un IS NULL OR v_un = '' THEN
            v_why := 'action ' || a || ': could not build target roles';
            EXIT;
          END IF;
        END IF;

        v_parts_u := '{}';
        v_parts_w := '{}';

        FOR s IN SELECT policyname, qual, with_check, roles_csv
                    FROM _act
                   WHERE tablename = t AND action = a
                   ORDER BY policyname
        LOOP
          IF NOT (s.policyname = ANY(v_drop)) THEN
            v_why := 'action ' || a || ': source ' || s.policyname ||
                     ' is not in the drop set — internal inconsistency';
            EXIT;
          END IF;

          v_soks := string_to_array(s.roles_csv, ',');

          IF 'public' = ANY(v_soks) THEN
            v_cover := true;
          ELSIF 'public' = ANY(v_toks) THEN
            v_cover := false;
          ELSE
            v_cover := v_toks <@ v_soks;
          END IF;

          IF v_cover THEN
            v_pre  := '(';
            v_post := ')';
          ELSE
            SELECT coalesce('(current_user IN (' ||
                            string_agg(quote_literal(trim(z3.tok)), ', ') || '))', '')
              INTO v_gate
              FROM unnest(string_to_array(s.roles_csv, ',')) AS z3(tok)
             WHERE trim(z3.tok) <> '' AND trim(z3.tok) <> 'public';
            IF v_gate = '' THEN
              v_why := 'action ' || a || ': source ' || s.policyname ||
                       ' is narrower than the union but has no role tokens';
              EXIT;
            END IF;
            v_pre  := 'CASE WHEN ' || v_gate || ' THEN (';
            v_post := ') ELSE false END';
          END IF;

          IF a IN ('SELECT', 'DELETE') THEN
            IF s.qual IS NULL THEN
              v_why := 'action ' || a || ': source ' || s.policyname || ' has NULL USING';
              EXIT;
            END IF;
            v_parts_u := v_parts_u || (v_pre || s.qual || v_post);
          ELSIF a = 'INSERT' THEN
            v_e := coalesce(s.with_check, s.qual);
            IF v_e IS NULL THEN
              v_why := 'action INSERT: source ' || s.policyname ||
                       ' has neither WITH CHECK nor USING';
              EXIT;
            END IF;
            v_parts_w := v_parts_w || (v_pre || v_e || v_post);
          ELSIF a = 'UPDATE' THEN
            v_e  := coalesce(s.qual, s.with_check);
            v_e2 := coalesce(s.with_check, s.qual);
            IF v_e IS NULL THEN
              v_why := 'action UPDATE: source ' || s.policyname ||
                       ' has neither USING nor WITH CHECK';
              EXIT;
            END IF;
            v_parts_u := v_parts_u || (v_pre || v_e  || v_post);
            v_parts_w := v_parts_w || (v_pre || v_e2 || v_post);
          ELSE
            v_why := 'unexpected action ' || a;
            EXIT;
          END IF;
        END LOOP;

        EXIT WHEN v_why IS NOT NULL;

        IF a IN ('SELECT', 'DELETE', 'UPDATE') AND coalesce(array_length(v_parts_u, 1), 0) = 0 THEN
          v_why := 'action ' || a || ': no USING parts composed';
          EXIT;
        END IF;
        IF a IN ('INSERT', 'UPDATE') AND coalesce(array_length(v_parts_w, 1), 0) = 0 THEN
          v_why := 'action ' || a || ': no WITH CHECK parts composed';
          EXIT;
        END IF;

        v_target := t || '_' || lower(a) || '_merged';
        IF EXISTS (SELECT 1 FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = t AND policyname = v_target) THEN
          v_why := 'target policy ' || v_target || ' already exists';
          EXIT;
        END IF;

        v_stmt := format('CREATE POLICY %I ON %I AS PERMISSIVE FOR %s TO %s',
                         v_target, t, a, v_un);
        IF a IN ('SELECT', 'DELETE', 'UPDATE') THEN
          v_stmt := v_stmt || format(' USING (%s)', array_to_string(v_parts_u, ' OR '));
        END IF;
        IF a IN ('INSERT', 'UPDATE') THEN
          v_stmt := v_stmt || format(' WITH CHECK (%s)', array_to_string(v_parts_w, ' OR '));
        END IF;

        INSERT INTO _plan (tablename, action, target, stmt)
        VALUES (t, a, v_target, v_stmt);
      END LOOP;
    END IF;

    IF v_why IS NOT NULL THEN
      DELETE FROM _plan WHERE tablename = t;
      INSERT INTO _fix(step, detail, ok)
      VALUES ('rw.' || t, 'SKIPPED — ' || v_why || '; table untouched', false);
      CONTINUE;
    END IF;

    SELECT pg_get_userbyid(c.relowner) INTO v_owner
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = t;

    INSERT INTO _fix(step, detail, ok)
    VALUES ('plan.' || t,
            'owner=' || coalesce(v_owner, '?') ||
            '; actions [' || array_to_string(v_acts, ', ') || ']' ||
            '; dropping [' || array_to_string(v_drop, ', ') || ']',
            true);
    v_n := v_n + 1;
  END LOOP;

  INSERT INTO _fix(step, detail, ok)
  VALUES ('plan.summary', v_n || ' table(s) planned for rewrite', true);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _fix(step, detail, ok) VALUES ('plan', 'section failed: ' || SQLERRM, false);
END $plan22$;

-- ----------------------------------------------------------------------------
-- C. Apply — create all targets per table, then drop the originals
-- ----------------------------------------------------------------------------
DO $apply22$
DECLARE
  t         text;
  p         RECORD;
  d         RECORD;
  x         text;
  v_created text[] := '{}';
  v_abort   text;
  v_cn      int := 0;
  v_dn      int := 0;
  v_roles   text;
  v_q       text;
  v_w       text;
BEGIN
  FOR t IN SELECT DISTINCT tablename FROM _plan ORDER BY tablename LOOP
    v_created := '{}';
    v_abort := NULL;

    FOR p IN SELECT * FROM _plan WHERE tablename = t ORDER BY action LOOP
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p.target, p.tablename);
        EXECUTE p.stmt;
        v_created := v_created || p.target;
        v_cn := v_cn + 1;
        INSERT INTO _fix(step, detail, ok)
        VALUES ('rw.' || p.tablename, p.stmt, true);
      EXCEPTION WHEN OTHERS THEN
        v_abort := p.target || ' create FAILED: ' || SQLERRM;
      END;
      EXIT WHEN v_abort IS NOT NULL;
    END LOOP;

    IF v_abort IS NOT NULL THEN
      FOREACH x IN ARRAY v_created LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', x, t);
      END LOOP;
      INSERT INTO _fix(step, detail, ok)
      VALUES ('rw.' || t,
              'ABORTED — ' || v_abort || '; ' ||
              coalesce(array_length(v_created, 1), 0) ||
              ' created target(s) rolled back; originals untouched',
              false);
      CONTINUE;
    END IF;

    FOR d IN
      SELECT policyname
        FROM _act
       WHERE tablename = t
         AND action IN (SELECT action FROM _dup WHERE tablename = t)
       GROUP BY policyname
       ORDER BY policyname
    LOOP
      BEGIN
        SELECT roles, qual, with_check INTO v_roles, v_q, v_w
          FROM pg_policies
         WHERE schemaname = 'public' AND tablename = t AND policyname = d.policyname;
        EXECUTE format('DROP POLICY %I ON %I', d.policyname, t);
        v_dn := v_dn + 1;
        INSERT INTO _fix(step, detail, ok)
        VALUES ('rw.' || t,
                'dropped ' || d.policyname || ' [' || array_to_string(v_roles, ', ') ||
                '] USING (' || coalesce(v_q, '<null>') ||
                ') WITH CHECK (' || coalesce(v_w, '<null>') || ')',
                true);
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO _fix(step, detail, ok)
        VALUES ('rw.' || t, 'dropped ' || d.policyname || ' FAILED: ' || SQLERRM, false);
      END;
    END LOOP;
  END LOOP;

  INSERT INTO _fix(step, detail, ok)
  VALUES ('rw.summary',
          (SELECT count(DISTINCT tablename) FROM _plan) || ' table(s): ' ||
          v_cn || ' target policy(ies) created, ' || v_dn || ' original(s) dropped',
          true);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _fix(step, detail, ok) VALUES ('apply', 'section failed: ' || SQLERRM, false);
END $apply22$;

-- ----------------------------------------------------------------------------
-- D. Verification — advisor-relevant counts after the rewrite, as rows
-- ----------------------------------------------------------------------------
DO $verify22$
DECLARE
  v_n     int;
  v_names text;
BEGIN
  SELECT count(*), coalesce(string_agg(g.k, ', '), '-')
    INTO v_n, v_names
    FROM (
      SELECT p.tablename || ' ' || v.action || ': ' ||
             string_agg(p.policyname, ', ' ORDER BY p.policyname) AS k
        FROM pg_policies p
       CROSS JOIN LATERAL (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) v(action)
       WHERE p.schemaname = 'public'
         AND p.permissive = 'PERMISSIVE'
         AND (p.cmd = 'ALL' OR p.cmd = v.action)
       GROUP BY p.tablename, v.action
      HAVING count(*) > 1
    ) g;
  INSERT INTO _fix(step, detail, ok)
  VALUES ('verify.expanded_dups', '0006 replica: ' || v_n || ' → ' || v_names, v_n = 0);

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

  SELECT count(*), coalesce(string_agg(c.relname, ', '), '-')
    INTO v_n, v_names
    FROM pg_class c
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;
  INSERT INTO _fix(step, detail, ok)
  VALUES ('verify.rls_disabled_public', v_n || ' → ' || v_names, v_n = 0);

  SELECT coalesce(string_agg(m.k, ' | '), '-') INTO v_names
    FROM (
      SELECT p.tablename || ': ' ||
             string_agg(p.policyname || '[' || p.cmd || ']', ', ' ORDER BY p.policyname) AS k
        FROM pg_policies p
       WHERE p.schemaname = 'public'
         AND p.tablename IN (SELECT DISTINCT tablename FROM _plan)
       GROUP BY p.tablename
       ORDER BY p.tablename
    ) m;
  INSERT INTO _fix(step, detail, ok)
  VALUES ('verify.merged_tables', v_names, true);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _fix(step, detail, ok) VALUES ('verify', 'failed: ' || SQLERRM, false);
END $verify22$;

DROP TABLE IF EXISTS _act;
DROP TABLE IF EXISTS _dup;
DROP TABLE IF EXISTS _plan;

-- ----------------------------------------------------------------------------
-- The log — this SELECT is the output to copy back
-- ----------------------------------------------------------------------------
SELECT id, step, detail, ok FROM _fix ORDER BY id;
