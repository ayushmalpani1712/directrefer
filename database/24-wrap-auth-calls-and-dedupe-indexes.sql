-- ============================================================================
-- 24. Wrap the mig23 auth calls in subselects (clear 4 Auth RLS Init Plan
--     warnings) and drop exact-duplicate indexes (clear 2 Duplicate index
--     warnings)
-- ============================================================================
-- Run after 23.
--
--   A. The four policies created in 23 called auth.uid() directly in the
--      expression. Postgres can cache a STABLE function result per statement,
--      but the Performance Advisor's Auth RLS Init Plan rule (0003) still
--      flags bare auth.<fn>() calls in policies — the documented fix is to
--      wrap them in a subselect so they land in the init plan:
--      `(SELECT auth.uid()) IS NOT NULL`. Behavior is identical; the four
--      policies are dropped and recreated with the wrapped form.
--
--   B. blocked_users and profiles_professional each carry two indexes with
--      identical signature (same columns, opclasses, predicate, expression,
--      uniqueness). The OLDER index (lowest oid) is kept, the newer dropped.
--      Constraint-backed, primary, and replica-identity indexes are never
--      touched, so no constraint can be destroyed by this loop. The loop is
--      set-based over signature groups so N-way duplicates collapse to one
--      survivor rather than being dropped pairwise.
--
--   C. Verification rows — remaining 0003 candidates (expect none on these
--      tables), remaining duplicate index pairs (expect none), the recreated
--      policies, and the surviving indexes on the two tables.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. Recreate the four policies with the auth call wrapped in a subselect
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "job_skills_select" ON public.job_skills;
CREATE POLICY "job_skills_select"
  ON public.job_skills FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "cap_select_authenticated" ON public.professional_capacities;
CREATE POLICY "cap_select_authenticated"
  ON public.professional_capacities FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "skill_aliases_select" ON public.skill_aliases;
CREATE POLICY "skill_aliases_select"
  ON public.skill_aliases FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "utm_insert" ON public.utm_events;
CREATE POLICY "utm_insert"
  ON public.utm_events FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ---------------------------------------------------------------------------
-- B. Drop exact-duplicate indexes, keeping the oldest of each signature group
-- ---------------------------------------------------------------------------
DO $mig24$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    WITH idx AS (
      SELECT i.indexrelid,
             i.indrelid,
             i.indkey::int2[]  AS keys,
             i.indclass::oid[] AS ops,
             i.indisunique     AS uniq,
             i.indnkeyatts     AS nkey,
             coalesce(i.indexprs::text, '') AS exprs,
             coalesce(i.indpred::text, '')  AS pred,
             i.indisprimary    AS prim,
             i.indisreplident  AS repl,
             row_number() OVER (
               PARTITION BY i.indrelid, i.indkey::int2[], i.indclass::oid[],
                             i.indisunique, i.indnkeyatts,
                             coalesce(i.indexprs::text, ''), coalesce(i.indpred::text, '')
               ORDER BY i.indexrelid
             ) AS rn
        FROM pg_index i
        JOIN pg_class tc ON tc.oid = i.indrelid
        JOIN pg_namespace tn ON tn.oid = tc.relnamespace
       WHERE tn.nspname = 'public'
    )
    SELECT tn.relname        AS tbl,
           dropc.relname     AS drop_idx,
           keepc.relname     AS keep_idx
      FROM idx d
      JOIN idx k
        ON k.indrelid = d.indrelid
       AND k.keys  = d.keys
       AND k.ops   = d.ops
       AND k.uniq  = d.uniq
       AND k.nkey  = d.nkey
       AND k.exprs = d.exprs
       AND k.pred  = d.pred
       AND k.rn    = 1
      JOIN pg_class dropc ON dropc.oid = d.indexrelid
      JOIN pg_class keepc ON keepc.oid = k.indexrelid
      JOIN pg_class tn    ON tn.oid    = d.indrelid
     WHERE d.rn > 1
       AND NOT d.prim
       AND NOT d.repl
       AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conindid = d.indexrelid)
  LOOP
    EXECUTE format('DROP INDEX public.%I', r.drop_idx);
    RAISE NOTICE 'mig24: dropped public.% (duplicate of %)', r.drop_idx, r.keep_idx;
  END LOOP;
END $mig24$;

-- ---------------------------------------------------------------------------
-- C. Verification
-- ---------------------------------------------------------------------------

-- 1. Remaining 0003 candidates anywhere in public (bare auth call, no subselect)
SELECT schemaname || '.' || tablename || '.' || policyname || ' [' || cmd || ']' AS bare_auth_caller
  FROM pg_policies
 WHERE schemaname = 'public'
   AND ((qual ~ '(auth)\.(uid|jwt|role|email)\(\)' AND lower(qual) !~ 'select\s+auth\.')
        OR (with_check ~ '(auth)\.(uid|jwt|role|email)\(\)'
            AND lower(with_check) !~ 'select\s+auth\.'))
 ORDER BY tablename, policyname;

-- 2. Remaining exact-duplicate index pairs (expect zero rows)
SELECT tc.relname AS table_name, i1.relname AS index_a, i2.relname AS index_b
  FROM pg_index x1
  JOIN pg_index x2 ON x1.indrelid = x2.indrelid AND x1.indexrelid < x2.indexrelid
                  AND x1.indkey::int2[]  = x2.indkey::int2[]
                  AND x1.indclass::oid[] = x2.indclass::oid[]
                  AND x1.indisunique     = x2.indisunique
                  AND x1.indnkeyatts     = x2.indnkeyatts
                  AND coalesce(x1.indexprs::text, '') = coalesce(x2.indexprs::text, '')
                  AND coalesce(x1.indpred::text, '')  = coalesce(x2.indpred::text, '')
  JOIN pg_class i1 ON i1.oid = x1.indexrelid
  JOIN pg_class i2 ON i2.oid = x2.indexrelid
  JOIN pg_class tc ON tc.oid = x1.indrelid
  JOIN pg_namespace tn ON tn.oid = tc.relnamespace
 WHERE tn.nspname = 'public'
 ORDER BY tc.relname, i1.relname;

-- 3. The four recreated policies (expect the wrapped subselect form)
SELECT tablename, policyname, cmd, roles, qual, with_check
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('job_skills', 'professional_capacities', 'skill_aliases', 'utm_events')
 ORDER BY tablename, policyname;

-- 4. Surviving indexes on the two de-duplicated tables
SELECT tn.relname AS table_name, i.relname AS index_name, x.indisprimary AS is_primary
  FROM pg_index x
  JOIN pg_class i ON i.oid = x.indexrelid
  JOIN pg_class tn ON tn.oid = x.indrelid
  JOIN pg_namespace n ON n.oid = tn.relnamespace
 WHERE n.nspname = 'public'
   AND tn.relname IN ('blocked_users', 'profiles_professional')
 ORDER BY tn.relname, i.relname;
