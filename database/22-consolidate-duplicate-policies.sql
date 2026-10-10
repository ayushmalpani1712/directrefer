-- ============================================================================
-- 22. Consolidate duplicate permissive policies — clear the 0006 warnings
-- ============================================================================
-- Run after 21. Instrumented: the query returns the log, so every step's
-- outcome (including SQLERRM) is a visible result row.
--
--   The whole migration lives inside ONE function invoked by ONE SELECT, and
--   the helper tables are TEMP tables created inside that call. The SQL Editor
--   can run statements on pooled connections, so session-scoped temp tables do
--   NOT reliably survive from one statement to the next — a plain
--   multi-statement script fails with `relation "_act" does not exist`. A
--   single function call executes as one statement on one connection, so
--   every helper table and the log exist exactly as long as they are needed.
--   The function also works if the editor sends each top-level statement on a
--   different connection, because the logic is entirely inside the SELECT.
--
--   Helper tables are named _m22* so a bare `DROP TABLE IF EXISTS _m22*` can
--   never resolve to a permanent table in public (unqualified names fall back
--   to the search path only when no temp table of that name exists).
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
--          when any source is public. `public` is emitted by OMITTING the TO
--          clause, which is PostgreSQL's documented default (applies to all
--          roles) — avoids relying on a `TO public` keyword form;
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

DROP FUNCTION IF EXISTS public.mig22_run();

CREATE FUNCTION public.mig22_run()
RETURNS TABLE (rid int, rstep text, rdetail text, rok boolean)
LANGUAGE plpgsql
AS $mig22$
DECLARE
  t         text;
  a         text;
  s         RECORD;
  p         RECORD;
  d         RECORD;
  x         text;
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
  v_pn      int;
  v_created text[];
  v_abort   text;
  v_cn      int;
  v_dn      int;
  v_roles   name[];
  v_q       text;
  v_w       text;
  v_n       int;
  v_names   text;
BEGIN
  -- ------------------------------------------------------------------------
  -- Setup — helper tables and the log, all TEMP, all inside this call
  -- ------------------------------------------------------------------------
  CREATE TEMP TABLE _m22fix (
    id     serial PRIMARY KEY,
    step   text   NOT NULL,
    detail text   NOT NULL,
    ok     boolean NOT NULL
  );
  CREATE TEMP TABLE _m22act (
    tablename  text,
    policyname text,
    action     text,
    qual       text,
    with_check text,
    roles_csv  text
  );
  CREATE TEMP TABLE _m22dup (
    tablename text,
    action    text
  );
  CREATE TEMP TABLE _m22plan (
    tablename text,
    action    text,
    target    text,
    stmt      text
  );

  INSERT INTO _m22fix(step, detail, ok)
  VALUES ('session',
          'current_user=' || current_user::text ||
          ' session_user=' || session_user::text, true);

  -- ------------------------------------------------------------------------
  -- A. Work list — action-expanded rows + duplicate groups
  -- ------------------------------------------------------------------------
  BEGIN
    DELETE FROM _m22act;
    INSERT INTO _m22act (tablename, policyname, action, qual, with_check, roles_csv)
    SELECT pol.tablename, pol.policyname, va.action, pol.qual, pol.with_check,
           array_to_string(pol.roles, ',')
      FROM pg_policies pol
     CROSS JOIN LATERAL (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) va(action)
     WHERE pol.schemaname = 'public'
       AND pol.permissive = 'PERMISSIVE'
       AND (pol.cmd = 'ALL' OR pol.cmd = va.action);

    DELETE FROM _m22dup;
    INSERT INTO _m22dup
    SELECT tablename, action
      FROM _m22act
     GROUP BY tablename, action
    HAVING count(*) > 1;

    INSERT INTO _m22fix(step, detail, ok)
    SELECT 'dup.detected', coalesce(string_agg(ln.k, ', ' ORDER BY ln.k), 'none'), true
      FROM (
        SELECT du.tablename || ' ' || du.action || ': ' ||
               string_agg(ac.policyname, ', ' ORDER BY ac.policyname) AS k
          FROM _m22dup du
          JOIN _m22act ac ON ac.tablename = du.tablename AND ac.action = du.action
         GROUP BY du.tablename, du.action
      ) ln;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _m22fix(step, detail, ok)
    VALUES ('worklist', 'section failed: ' || SQLERRM, false);
  END;

  -- ------------------------------------------------------------------------
  -- B. Plan — compose one target policy per affected action (no DDL yet)
  -- ------------------------------------------------------------------------
  BEGIN
    DELETE FROM _m22plan;

    v_pn := 0;

    FOR t IN SELECT tablename FROM _m22dup GROUP BY tablename ORDER BY tablename LOOP
      v_why := NULL;

      SELECT array_agg(DISTINCT policyname ORDER BY policyname) INTO v_drop
        FROM _m22act
       WHERE tablename = t
         AND action IN (SELECT action FROM _m22dup WHERE tablename = t);

      SELECT array_agg(DISTINCT action ORDER BY action) INTO v_acts
        FROM _m22act
       WHERE tablename = t
         AND policyname = ANY(v_drop);

      IF v_drop IS NULL OR v_acts IS NULL THEN
        v_why := 'empty drop/affected set (internal)';
      END IF;

      IF v_why IS NULL THEN
        FOR a IN SELECT unnest(v_acts) LOOP
          SELECT array_agg(DISTINCT trim(z.tok) ORDER BY trim(z.tok)) INTO v_toks
            FROM _m22act src,
     LATERAL unnest(string_to_array(src.roles_csv, ',')) AS z(tok)
           WHERE src.tablename = t AND src.action = a;

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
                      FROM _m22act
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

          v_stmt := format('CREATE POLICY %I ON %I AS PERMISSIVE FOR %s',
                           v_target, t, a);
          IF v_un <> 'public' THEN
            v_stmt := v_stmt || format(' TO %s', v_un);
          END IF;
          IF a IN ('SELECT', 'DELETE', 'UPDATE') THEN
            v_stmt := v_stmt || format(' USING (%s)', array_to_string(v_parts_u, ' OR '));
          END IF;
          IF a IN ('INSERT', 'UPDATE') THEN
            v_stmt := v_stmt || format(' WITH CHECK (%s)', array_to_string(v_parts_w, ' OR '));
          END IF;

          INSERT INTO _m22plan (tablename, action, target, stmt)
          VALUES (t, a, v_target, v_stmt);
        END LOOP;
      END IF;

      IF v_why IS NOT NULL THEN
        DELETE FROM _m22plan WHERE tablename = t;
        INSERT INTO _m22fix(step, detail, ok)
        VALUES ('rw.' || t, 'SKIPPED — ' || v_why || '; table untouched', false);
        CONTINUE;
      END IF;

      SELECT pg_get_userbyid(c.relowner)::text INTO v_owner
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = t;

      INSERT INTO _m22fix(step, detail, ok)
      VALUES ('plan.' || t,
              'owner=' || coalesce(v_owner, '?') ||
              '; actions [' || array_to_string(v_acts, ', ') || ']' ||
              '; dropping [' || array_to_string(v_drop, ', ') || ']',
              true);
      v_pn := v_pn + 1;
    END LOOP;

    INSERT INTO _m22fix(step, detail, ok)
    VALUES ('plan.summary', v_pn::text || ' table(s) planned for rewrite', true);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _m22fix(step, detail, ok) VALUES ('plan', 'section failed: ' || SQLERRM, false);
  END;

  -- ------------------------------------------------------------------------
  -- C. Apply — create all targets per table, then drop the originals
  -- ------------------------------------------------------------------------
  BEGIN
    v_cn := 0;
    v_dn := 0;

    FOR t IN SELECT DISTINCT tablename FROM _m22plan ORDER BY tablename LOOP
      v_created := '{}';
      v_abort := NULL;

      FOR p IN SELECT * FROM _m22plan WHERE tablename = t ORDER BY action LOOP
        BEGIN
          EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p.target, p.tablename);
          EXECUTE p.stmt;
          v_created := v_created || p.target;
          v_cn := v_cn + 1;
          INSERT INTO _m22fix(step, detail, ok)
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
        INSERT INTO _m22fix(step, detail, ok)
        VALUES ('rw.' || t,
                'ABORTED — ' || v_abort || '; ' ||
                coalesce(array_length(v_created, 1), 0)::text ||
                ' created target(s) rolled back; originals untouched',
                false);
        CONTINUE;
      END IF;

      FOR d IN
        SELECT policyname
          FROM _m22act
         WHERE tablename = t
           AND action IN (SELECT action FROM _m22dup WHERE tablename = t)
         GROUP BY policyname
         ORDER BY policyname
      LOOP
        BEGIN
          SELECT roles, qual, with_check INTO v_roles, v_q, v_w
            FROM pg_policies
           WHERE schemaname = 'public' AND tablename = t AND policyname = d.policyname;
          EXECUTE format('DROP POLICY %I ON %I', d.policyname, t);
          v_dn := v_dn + 1;
          INSERT INTO _m22fix(step, detail, ok)
          VALUES ('rw.' || t,
                  'dropped ' || d.policyname || ' [' || array_to_string(v_roles, ', ') ||
                  '] USING (' || coalesce(v_q, '<null>') ||
                  ') WITH CHECK (' || coalesce(v_w, '<null>') || ')',
                  true);
        EXCEPTION WHEN OTHERS THEN
          INSERT INTO _m22fix(step, detail, ok)
          VALUES ('rw.' || t, 'dropped ' || d.policyname || ' FAILED: ' || SQLERRM, false);
        END;
      END LOOP;
    END LOOP;

    INSERT INTO _m22fix(step, detail, ok)
    VALUES ('rw.summary',
            (SELECT count(DISTINCT tablename) FROM _m22plan)::text || ' table(s): ' ||
            v_cn::text || ' target policy(ies) created, ' || v_dn::text || ' original(s) dropped',
            true);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _m22fix(step, detail, ok) VALUES ('apply', 'section failed: ' || SQLERRM, false);
  END;

  -- ------------------------------------------------------------------------
  -- D. Verification — advisor-relevant counts after the rewrite, as rows
  -- ------------------------------------------------------------------------
  BEGIN
    SELECT count(*), coalesce(string_agg(gg.k, ', '), '-')
      INTO v_n, v_names
      FROM (
        SELECT pol.tablename || ' ' || va.action || ': ' ||
               string_agg(pol.policyname, ', ' ORDER BY pol.policyname) AS k
          FROM pg_policies pol
         CROSS JOIN LATERAL (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) va(action)
         WHERE pol.schemaname = 'public'
           AND pol.permissive = 'PERMISSIVE'
           AND (pol.cmd = 'ALL' OR pol.cmd = va.action)
         GROUP BY pol.tablename, va.action
        HAVING count(*) > 1
      ) gg;
    INSERT INTO _m22fix(step, detail, ok)
    VALUES ('verify.expanded_dups', '0006 replica: ' || v_n::text || ' -> ' || v_names, v_n = 0);

    SELECT count(*),
           coalesce(string_agg(pol.schemaname || '.' || pol.tablename || '.' || pol.policyname ||
                               '[' || pol.cmd || ']', ', '), '-')
      INTO v_n, v_names
      FROM pg_policies pol
     WHERE pol.schemaname = 'public'
       AND pol.permissive = 'PERMISSIVE'
       AND ((pol.cmd = 'SELECT' AND pol.qual IS NULL)
            OR (pol.cmd IN ('UPDATE', 'DELETE') AND pol.qual IS NULL)
            OR (pol.cmd IN ('INSERT', 'UPDATE') AND pol.with_check IS NULL));
    INSERT INTO _m22fix(step, detail, ok)
    VALUES ('verify.missing_clause', v_n::text || ' -> ' || v_names, v_n = 0);

    SELECT count(*),
           coalesce(string_agg(pol.schemaname || '.' || pol.tablename || '.' || pol.policyname ||
                               '[' || pol.cmd || ']', ', '), '-')
      INTO v_n, v_names
      FROM pg_policies pol
     WHERE pol.schemaname = 'public'
       AND (pol.qual = 'true' OR pol.with_check = 'true');
    INSERT INTO _m22fix(step, detail, ok)
    VALUES ('verify.always_true', v_n::text || ' -> ' || v_names, v_n = 0);

    SELECT count(*),
           coalesce(string_agg(pol.schemaname || '.' || pol.tablename || '.' || pol.policyname, ', '), '-')
      INTO v_n, v_names
      FROM pg_policies pol
     WHERE pol.schemaname = 'public'
       AND ((pol.qual ~ '(auth)\.(uid|jwt|role|email)\(\)'
             AND lower(pol.qual) !~ 'select\s+auth\.')
            OR (pol.with_check ~ '(auth)\.(uid|jwt|role|email)\(\)'
                AND lower(pol.with_check) !~ 'select\s+auth\.'));
    INSERT INTO _m22fix(step, detail, ok)
    VALUES ('verify.bare_auth', '0003 candidates: ' || v_n::text || ' -> ' || v_names, v_n = 0);

    SELECT count(*), coalesce(string_agg(c.relname, ', '), '-')
      INTO v_n, v_names
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;
    INSERT INTO _m22fix(step, detail, ok)
    VALUES ('verify.rls_disabled_public', v_n::text || ' -> ' || v_names, v_n = 0);

    SELECT coalesce(string_agg(mm.k, ' | '), '-') INTO v_names
      FROM (
        SELECT pol.tablename || ': ' ||
               string_agg(pol.policyname || '[' || pol.cmd || ']', ', ' ORDER BY pol.policyname) AS k
          FROM pg_policies pol
         WHERE pol.schemaname = 'public'
           AND pol.tablename IN (SELECT DISTINCT tablename FROM _m22plan)
         GROUP BY pol.tablename
         ORDER BY pol.tablename
      ) mm;
    INSERT INTO _m22fix(step, detail, ok)
    VALUES ('verify.merged_tables', v_names, true);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _m22fix(step, detail, ok) VALUES ('verify', 'failed: ' || SQLERRM, false);
  END;

  -- ------------------------------------------------------------------------
  -- The log — returned as this query's result set
  -- ------------------------------------------------------------------------
  RETURN QUERY SELECT id, step, detail, ok FROM _m22fix ORDER BY id;

  BEGIN
    DROP TABLE IF EXISTS _m22act;
    DROP TABLE IF EXISTS _m22dup;
    DROP TABLE IF EXISTS _m22plan;
    DROP TABLE IF EXISTS _m22fix;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN;
END;
$mig22$;

SELECT * FROM public.mig22_run();

DROP FUNCTION IF EXISTS public.mig22_run();
