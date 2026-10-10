-- ============================================================================
-- 26. Drop the redundant profiles_professional_user_id_unique constraint
-- ============================================================================
-- Run after 25. Migration 25's signature-group dedup skipped this twin because
-- it is a unique CONSTRAINT (Postgres names `ADD CONSTRAINT x UNIQUE` indexes
-- after the constraint), and migration 25 deliberately never drops anything
-- constraint-backed — dropping the underlying index directly would either
-- fail or destroy the constraint without going through the proper catalog
-- path. The correct removal for a redundant unique constraint is
-- `ALTER TABLE ... DROP CONSTRAINT`, which is what this migration does.
--
-- Redundancy proof (from the 24-10-10 diagnostic): the table's PRIMARY KEY
-- already covers exactly (user_id) with the same btree/uuid equality semantics,
-- so the separate unique constraint on (user_id) enforces nothing new — the
-- PK's implicit unique index already guarantees it. No foreign key can be
-- bound to a table's columns without a unique constraint or primary key
-- covering them, and the PK already occupies that role, so no FK target is
-- removed by dropping the redundant twin. If some object nevertheless depends
-- on the constraint, DROP CONSTRAINT fails atomically and the whole batch
-- rolls back — nothing partial happens.
--
-- Safety: the constraint is only dropped after confirming, in the same block,
-- that the primary key of profiles_professional covers exactly (user_id). If
-- that precondition fails the block notices and exits without touching
-- anything.
--
-- Note on guards: every precondition uses SELECT EXISTS (...) — EXISTS always
-- returns exactly one row (true/false), so SELECT INTO can never assign NULL.
-- This matters because a bare SELECT INTO with zero rows assigns NULL to its
-- targets, and `IF NOT NULL` is falsy in PL/pgSQL, which would fail OPEN and
-- drop without the precondition having been proven.
--
--   Verification — expect: 0 exact-duplicate index pairs remaining in public,
--   and profiles_professional holding only the PK on user_id plus the three
--   functional indexes (company_name btree, skills gin, open_for_referrals
--   partial btree).
-- ============================================================================

DO $mig26$
DECLARE
  v_conname name;
  v_pkey_ok boolean := false;
BEGIN
  -- Precondition: the PRIMARY KEY must cover exactly (user_id)
  SELECT EXISTS (
    SELECT 1
      FROM pg_index x
      JOIN pg_class t ON t.oid = x.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public'
       AND t.relname = 'profiles_professional'
       AND x.indisprimary
       AND x.indnkeyatts = 1
       AND (SELECT att.attname
              FROM unnest(x.indkey::int2[]) AS k(attnum)
              JOIN pg_attribute att
                ON att.attrelid = x.indrelid AND att.attnum = k.attnum
           ) = 'user_id'
  ) INTO v_pkey_ok;

  IF NOT v_pkey_ok THEN
    RAISE NOTICE 'mig26: primary key of profiles_professional does not cover exactly (user_id) — skipping, nothing dropped';
    RETURN;
  END IF;

  -- Fetch the unique constraint's name if it exists on user_id
  SELECT con.conname
    INTO v_conname
    FROM pg_constraint con
    JOIN pg_class t ON t.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'profiles_professional'
     AND con.contype = 'u'
     AND con.conname = 'profiles_professional_user_id_unique';

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles_professional DROP CONSTRAINT %I', v_conname);
    RAISE NOTICE 'mig26: dropped unique constraint % (redundant with PK on user_id)', v_conname;
    RETURN;
  END IF;

  -- Not a constraint — is it a plain unique index?
  IF EXISTS (
    SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'profiles_professional_user_id_unique'
       AND c.relkind = 'i'
  ) THEN
    EXECUTE 'DROP INDEX public.profiles_professional_user_id_unique';
    RAISE NOTICE 'mig26: dropped plain unique index profiles_professional_user_id_unique (redundant with PK on user_id)';
  ELSE
    RAISE NOTICE 'mig26: profiles_professional_user_id_unique not found — nothing to do';
  END IF;
END $mig26$;

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
-- (expect only pkey on user_id plus idx_pp_company, idx_pp_skills, idx_pp_open)
SELECT i.relname AS index_name,
       x.indisunique AS is_unique,
       x.indisprimary AS is_primary,
       (SELECT string_agg(att.attname, ', ' ORDER BY k.ord)
          FROM unnest(x.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord)
          JOIN pg_attribute att
            ON att.attrelid = x.indrelid AND att.attnum = k.attnum) AS columns
  FROM pg_index x
  JOIN pg_class i ON i.oid = x.indexrelid
  JOIN pg_class t ON t.oid = x.indrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
 WHERE n.nspname = 'public' AND t.relname = 'profiles_professional'
 ORDER BY x.indexrelid;
