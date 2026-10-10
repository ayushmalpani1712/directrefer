-- ============================================================================
-- 25. Finish the profiles_professional dedup — prefer PRIMARY as the survivor
-- ============================================================================
-- Run after 24. Migration 24 kept the OLDEST index of each identical-signature
-- group and never dropped a primary, so when the primary-key index is the
-- NEWER of a redundant pair the group collapsed to nothing: the older plain
-- unique index became the keeper and the primary was protected from dropping.
-- That is exactly the profiles_professional case —
-- profiles_professional_pkey and profiles_professional_user_id_unique are
-- both unique btree indexes on (user_id), so one of them is pure overhead
-- (the PK's unique index already enforces the same uniqueness; a plain unique
-- index cannot be an FK target, so nothing can depend on the twin).
--
-- This pass re-ranks each signature group with keeper preference
--   1. primary-key index  (never dropped)
--   2. constraint-backed index  (never dropped — dropping it would drop the
--      constraint; handled by excluding constrained indexes from the drop set)
--   3. oldest remaining
-- and drops every other member of the group that is safe to remove (not
-- primary, not constraint-backed, not replica-identity). Re-running migration
-- 24's exact-match query afterwards must return zero pairs.
-- ============================================================================

DO $mig25$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    WITH base AS (
      SELECT i.indexrelid,
             i.indrelid,
             i.indkey::int2[]  AS keys,
             i.indclass::oid[] AS ops,
             i.indisunique     AS uniq,
             i.indnkeyatts     AS nkey,
             coalesce(i.indexprs::text, '') AS exprs,
             coalesce(i.indpred::text, '')  AS pred,
             i.indisprimary   AS prim,
             i.indisreplident AS repl,
             EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conindid = i.indexrelid) AS constrained
        FROM pg_index i
        JOIN pg_class tc ON tc.oid = i.indrelid
        JOIN pg_namespace tn ON tn.oid = tc.relnamespace
       WHERE tn.nspname = 'public'
    ),
    ranked AS (
      SELECT b.*,
             row_number() OVER (
               PARTITION BY b.indrelid, b.keys, b.ops, b.uniq, b.nkey, b.exprs, b.pred
               ORDER BY CASE WHEN b.prim THEN 0
                             WHEN b.constrained THEN 1
                             ELSE 2 END,
                        b.indexrelid
             ) AS rn
        FROM base b
    )
    SELECT tn.relname    AS tbl,
           dropc.relname AS drop_idx,
           keepc.relname AS keep_idx
      FROM ranked d
      JOIN ranked k
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
       AND NOT d.constrained
  LOOP
    EXECUTE format('DROP INDEX public.%I', r.drop_idx);
    RAISE NOTICE 'mig25: dropped public.% (redundant, kept %)', r.drop_idx, r.keep_idx;
  END LOOP;
END $mig25$;

-- Verification 1: remaining exact-duplicate index pairs anywhere in public
-- (expect zero rows)
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

-- Verification 2: surviving indexes on profiles_professional
-- (expect pkey + one index per distinct column set, no twin on user_id)
SELECT i.relname AS index_name,
       x.indisunique AS is_unique,
       x.indisprimary AS is_primary,
       (SELECT string_agg(att.attname, ', ' ORDER BY k.ord)
          FROM unnest(x.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord)
          JOIN pg_attribute att ON att.attrelid = x.indrelid AND att.attnum = k.attnum) AS columns
  FROM pg_index x
  JOIN pg_class i ON i.oid = x.indexrelid
  JOIN pg_class t ON t.oid = x.indrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
 WHERE n.nspname = 'public' AND t.relname = 'profiles_professional'
 ORDER BY x.indexrelid;
