-- ============================================================================
-- 28a. PREFLIGHT CHECKS (READ-ONLY) — run BEFORE 28-fix-live-schema-drift.sql
-- ============================================================================
-- Pure SELECTs and read-only DO blocks (SELECT + RAISE only). No DDL, no DML,
-- no writes of any kind. Safe to run against production.
--
-- PURPOSE: prove that migration 28 will do what its header claims, and surface
-- every condition under which it would error or silently mis-map data.
--
-- READ THE RESULT SETS IN ORDER:
--   P1  enum types: which of the 4 types migration 28 creates already exist
--   P2  enum labels: live job_stage labels vs v2 job_status labels
--   P3  stage value mapping verdict — FAIL here means the backfill UPDATE in
--       migration 28 (line ~114, SET status = stage::text::job_status) will
--       raise "invalid input value for enum job_status" and abort the whole
--       transaction. FIX THE DATA OR THE MAPPING BEFORE RUNNING 28.
--   P4  jobs.stage column existence — if MISSING, the backfill source does not
--       exist and every job would get status = 'draft' (silent data loss of
--       lifecycle state). DO NOT RUN 28 IF THIS SAYS MISSING.
--   P5  column existence matrix: exactly which ADD COLUMN statements 28 will
--       execute vs skip (its "already exists" branches)
--   P6  backfill source columns: verdict per column 28 reads — a MISSING row
--       means 28 will abort on that backfill; fix before running it
--   P7  row counts: record these; 28 is additive and must not change them
--   P8  duplicate checks: one per unique index 28 creates. 8a checks the
--       source pair 28 backfills from (DO block, prints PASS/FAIL as NOTICE),
--       8b reports column existence, 8c is a direct duplicate query. A FAIL
--       means 28 will SKIP that index (by design) and the client upsert that
--       depends on it will keep failing — resolve duplicates, re-run 28.
--   P9  FK orphan checks: 28 skips a FK when orphans exist (NOTICE only)
--   P10 notification_preferences legacy booleans: the backfill source rows
--   P11 new tables: profile_history / trust_score_adjustments must NOT exist
--   P12 screening_attempts.criteria_id nullability (28 will DROP NOT NULL)
--   P13 anon users access baseline: 0 policies + record the default
--       column-grant count (pre-existing; 28 must not change it)
--   P14 existing users SELECT policies (live policy variant for question 5)
--   P15 notification_preferences constraints + indexes — expect the PK on
--       user_id before 28; 28 moves it to id before seeding typed rows
-- ============================================================================

-- ── P1. enum types that migration 28 creates ────────────────────────────────
SELECT t.typname AS enum_type,
       CASE WHEN t.typname = 'job_stage' THEN 'live legacy (expected present)'
            ELSE 'migration 28 will CREATE TYPE (IF NOT EXISTS guard)' END AS note
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
 WHERE n.nspname = 'public'
   AND t.typname IN ('job_stage', 'job_status', 'career_track',
                     'notification_channel', 'match_source')
 ORDER BY t.typname;

-- ── P2. enum labels: live stage enum vs v2 job_status enum ──────────────────
-- Expected v2 labels (v2-schema/schema.sql:25):
--   CREATE TYPE job_status AS ENUM ('draft', 'active', 'paused', 'closed');
SELECT t.typname AS enum_type,
       e.enumlabel AS label,
       e.enumsortorder AS position
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  JOIN pg_namespace n ON n.oid = t.typnamespace
 WHERE n.nspname = 'public'
   AND t.typname IN ('job_stage', 'job_status')
 ORDER BY t.typname, e.enumsortorder;

-- ── P3. stage -> status mapping verdict (CRITICAL GATE) ─────────────────────
-- PASS only if every distinct live stage value is a member of job_status.
-- NULL stage is handled by migration 28 as COALESCE(stage::text, 'draft').
SELECT s.stage_value,
       COALESCE(j.row_count, 0) AS row_count,
       CASE
         WHEN s.stage_value IS NULL THEN 'NULL - maps to draft (COALESCE)'
         WHEN s.stage_value IN ('draft', 'active', 'paused', 'closed')
           THEN 'PASS - direct member of job_status'
         ELSE 'FAIL - not a job_status label; migration 28 backfill will ABORT'
       END AS verdict
  FROM (SELECT DISTINCT stage::text AS stage_value FROM public.jobs) s
  LEFT JOIN (SELECT stage::text AS sv, count(*) AS row_count
               FROM public.jobs GROUP BY 1) j ON j.sv = s.stage_value
 ORDER BY s.stage_value NULLS FIRST;

-- ── P4. jobs.stage must exist (backfill source) ─────────────────────────────
SELECT CASE
         WHEN EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = 'jobs'
                         AND column_name = 'stage')
           THEN 'PASS - jobs.stage present; backfill source available'
         ELSE 'FAIL - jobs.stage MISSING; DO NOT RUN migration 28'
       END AS stage_column_check,
       CASE
         WHEN EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = 'jobs'
                         AND column_name = 'status')
           THEN 'jobs.status ALREADY EXISTS - migration 28 backfill will be SKIPPED (no-op branch)'
         ELSE 'jobs.status absent - migration 28 will add + backfill'
       END AS status_column_check;

-- ── P5. column existence matrix (what 28 will add vs skip) ──────────────────
WITH expected(table_name, column_name) AS (
  VALUES
    ('jobs', 'status'), ('jobs', 'track'), ('jobs', 'requirements'),
    ('jobs', 'expires_at'), ('jobs', 'company_id'), ('jobs', 'applicant_count'),
    ('jobs', 'referral_count'), ('jobs', 'created_at'), ('jobs', 'closed_at'),
    ('applications', 'resume_url'), ('applications', 'notes'),
    ('applications', 'created_at'), ('applications', 'deleted_at'),
    ('announcements', 'content'), ('announcements', 'is_active'),
    ('screening_criteria', 'name'), ('screening_criteria', 'category'),
    ('screening_criteria', 'description'), ('screening_criteria', 'track'),
    ('screening_criteria', 'version'),
    ('screening_attempts', 'max_score'), ('screening_attempts', 'passed'),
    ('screening_attempts', 'evidence'), ('screening_attempts', 'reviewed_by'),
    ('screening_attempts', 'reviewed_at'),
    ('professional_capacities', 'user_id'),
    ('professional_capacities', 'period_start'),
    ('professional_capacities', 'period_end'),
    ('professional_capacities', 'max_capacity'),
    ('professional_capacities', 'used'),
    ('notification_preferences', 'id'), ('notification_preferences', 'type'),
    ('notification_preferences', 'channel'), ('notification_preferences', 'enabled'),
    ('error_logs', 'page'), ('error_logs', 'stack'), ('error_logs', 'metadata'),
    ('profiles_job_seeker', 'bio'),
    ('matches', 'match_score'), ('matches', 'skills_score'),
    ('matches', 'role_score'), ('matches', 'company_score'),
    ('matches', 'location_score'), ('matches', 'reputation_score'),
    ('matches', 'source')
)
SELECT e.table_name,
       e.column_name,
       CASE WHEN c.column_name IS NULL
            THEN 'MISSING - migration 28 will ADD this'
            ELSE 'exists - migration 28 skips (no-op)' END AS state,
       c.data_type,
       c.is_nullable
  FROM expected e
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public'
   AND c.table_name = e.table_name
   AND c.column_name = e.column_name
 ORDER BY e.table_name, e.column_name;

-- ── P6. backfill sources — every column migration 28 READS ──────────────────
-- 28's backfills are plain UPDATE / INSERT … SELECT statements inside one DO
-- block: if ANY source below is missing, 28 aborts on that statement and the
-- whole migration rolls back. Expect every row: state = 'PASS - present'.
-- (jobs.stage also has the stronger P4 "DO NOT RUN" gate.)
WITH expected(table_name, column_name, used_by) AS (
  VALUES
    ('jobs', 'stage', 'status <- stage'),
    ('jobs', 'applicants', 'applicant_count <- applicants'),
    ('jobs', 'referrals', 'referral_count <- referrals'),
    ('jobs', 'posted_at', 'created_at <- posted_at'),
    ('applications', 'submitted_at', 'created_at <- submitted_at'),
    ('announcements', 'body', 'content <- body'),
    ('announcements', 'active', 'is_active <- active'),
    ('screening_criteria', 'criterion_key', 'name <- criterion_key'),
    ('screening_criteria', 'criterion_type', 'name/category <- criterion_type'),
    ('screening_attempts', 'score', 'passed <- score >= 60'),
    ('professional_capacities', 'professional_id', 'user_id <- professional_id'),
    ('professional_capacities', 'created_at', 'period_start <- month(created_at)'),
    ('profiles_professional', 'referral_capacity', 'max_capacity <- referral_capacity'),
    ('profiles_professional', 'referrals_used', 'used <- referrals_used'),
    ('profiles_professional', 'user_id', 'join key for the capacity seed'),
    ('notification_preferences', 'user_id', 'typed seed join column'),
    ('notification_preferences', 'referral_updates', 'seed referral_update'),
    ('notification_preferences', 'new_messages', 'seed message'),
    ('notification_preferences', 'profile_views', 'seed profile_view'),
    ('notification_preferences', 'marketing', 'seed product_announcement'),
    ('matches', 'score', 'match_score <- score'),
    ('matches', 'job_id', 'unique (job_id, candidate_id) index'),
    ('matches', 'candidate_id', 'unique (job_id, candidate_id) index')
)
SELECT e.table_name,
       e.column_name,
       CASE WHEN c.column_name IS NULL
            THEN 'FAIL - MISSING: migration 28 will abort here'
            ELSE 'PASS - present' END AS state,
       e.used_by,
       c.data_type
  FROM expected e
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public'
   AND c.table_name = e.table_name
   AND c.column_name = e.column_name
 ORDER BY CASE WHEN c.column_name IS NULL THEN 0 ELSE 1 END,
          e.table_name, e.column_name;

-- ── P7. row counts (record for comparison with 28c postcheck) ───────────────
-- migration 28 is additive: these numbers must be IDENTICAL after it runs.
SELECT 'jobs' AS table_name, count(*) AS row_count FROM public.jobs
UNION ALL SELECT 'applications', count(*) FROM public.applications
UNION ALL SELECT 'announcements', count(*) FROM public.announcements
UNION ALL SELECT 'screening_criteria', count(*) FROM public.screening_criteria
UNION ALL SELECT 'screening_attempts', count(*) FROM public.screening_attempts
UNION ALL SELECT 'professional_capacities', count(*) FROM public.professional_capacities
UNION ALL SELECT 'notification_preferences', count(*) FROM public.notification_preferences
UNION ALL SELECT 'error_logs', count(*) FROM public.error_logs
UNION ALL SELECT 'profiles_job_seeker', count(*) FROM public.profiles_job_seeker
UNION ALL SELECT 'matches', count(*) FROM public.matches
UNION ALL SELECT 'users', count(*) FROM public.users
ORDER BY table_name;

-- ── P8. duplicate checks — one per unique index migration 28 creates ────────
-- A non-zero count means 28 will SKIP that index (it prints a NOTICE) and the
-- client code that upserts on it will keep failing. Dedupe before running 28.
-- NOTE: user_id/period_start and type/channel are columns 28 ADDS, so pre-28
-- these checks work on the sources 28 derives them from (8a) or on column
-- existence (8b). The authoritative post-28 re-check of all three indexes is
-- postcheck C3b.

-- 8a. uq_professional_capacities_user_period — pre-28 source-pair proxy.
-- user_id / period_start do not exist yet; 28 backfills them as
--   user_id      <- professional_id
--   period_start <- date_trunc('month', COALESCE(created_at, now()))::date
-- so a duplicate in THAT derived pair is exactly what would make the unique
-- index fail. Runs as a DO block (SELECT + RAISE only) so a missing source
-- column becomes a NOTICE instead of killing the rest of the preflight.
DO $p8a$
DECLARE
  r          record;
  v_sources  boolean;
  v_dups     integer := 0;
BEGIN
  SELECT (EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'professional_capacities'
                     AND column_name = 'professional_id')
      AND EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'professional_capacities'
                     AND column_name = 'created_at')) INTO v_sources;
  IF NOT v_sources THEN
    RAISE NOTICE 'P8a SKIPPED - professional_capacities.professional_id/created_at missing (see P6)';
    RETURN;
  END IF;

  FOR r IN EXECUTE $q$
    SELECT professional_id,
           date_trunc('month', COALESCE(created_at, now()))::date AS period_start_proxy,
           count(*) AS dup_rows,
           count(*) - count(created_at) AS null_created_at_rows
      FROM public.professional_capacities
     GROUP BY professional_id, date_trunc('month', COALESCE(created_at, now()))::date
    HAVING count(*) > 1
     ORDER BY dup_rows DESC
  $q$ LOOP
    v_dups := v_dups + 1;
    RAISE NOTICE 'P8a DUP: professional_id=%, period_start_proxy=%, dup_rows=%, null_created_at_rows=%',
                 r.professional_id, r.period_start_proxy, r.dup_rows, r.null_created_at_rows;
  END LOOP;

  IF v_dups = 0 THEN
    RAISE NOTICE 'P8a PASS - no duplicate (professional_id, month(created_at)) pairs';
  ELSE
    RAISE NOTICE 'P8a FAIL - % duplicate pair(s); dedupe before running 28', v_dups;
  END IF;
END $p8a$;

-- 8b. uq_notification_preferences_user_type_channel — pre-28 verdict.
-- type/channel do not exist before 28, so duplicates cannot exist either:
-- 28 creates the index while every value is NULL (unique index satisfied)
-- and seeds it with ON CONFLICT DO NOTHING — the index cannot be skipped.
SELECT 'uq_notification_preferences_user_type_channel' AS index_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_schema = 'public'
                            AND table_name = 'notification_preferences'
                            AND column_name IN ('type', 'channel'))
            THEN 'columns already exist - confirm zero duplicates via postcheck C3b'
            ELSE 'PASS - PRE-28: type/channel absent, no duplicates possible'
       END AS verdict;

-- 8c. uq_matches_job_candidate (job_id, candidate_id)
-- Guarded like 8a: if either column is missing the check prints a NOTICE
-- instead of aborting the preflight before P9-P14.
DO $p8c$
DECLARE
  r         record;
  v_cols    boolean;
  v_dups    integer := 0;
BEGIN
  SELECT (EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'matches'
                     AND column_name = 'job_id')
      AND EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'matches'
                     AND column_name = 'candidate_id')) INTO v_cols;
  IF NOT v_cols THEN
    RAISE NOTICE 'P8c SKIPPED - matches.job_id/candidate_id missing (see P6)';
    RETURN;
  END IF;

  FOR r IN EXECUTE $q$
    SELECT job_id, candidate_id, count(*) AS dup_rows
      FROM public.matches
     WHERE job_id IS NOT NULL AND candidate_id IS NOT NULL
     GROUP BY job_id, candidate_id
    HAVING count(*) > 1
     ORDER BY dup_rows DESC
  $q$ LOOP
    v_dups := v_dups + 1;
    RAISE NOTICE 'P8c DUP: job_id=%, candidate_id=%, dup_rows=%',
                 r.job_id, r.candidate_id, r.dup_rows;
  END LOOP;

  IF v_dups = 0 THEN
    RAISE NOTICE 'P8c PASS - no duplicate (job_id, candidate_id) pairs';
  ELSE
    RAISE NOTICE 'P8c FAIL - % duplicate pair(s); dedupe before running 28', v_dups;
  END IF;
END $p8c$;

-- ── P9. FK orphan checks (28 skips an FK when orphans exist) ────────────────
-- 9a. professional_capacities.user_id (backfilled from professional_id)
SELECT count(*) AS orphan_capacity_rows_without_user
  FROM public.professional_capacities pc
 WHERE pc.professional_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = pc.professional_id);

-- 9b. screening_attempts.reviewed_by is added by 28, so no orphan risk yet;
--     listed for completeness after the first run of 28.

-- ── P10. notification_preferences legacy booleans (backfill source rows) ────
SELECT
  count(*) FILTER (WHERE referral_updates IS NOT NULL) AS rows_referral_updates,
  count(*) FILTER (WHERE new_messages     IS NOT NULL) AS rows_new_messages,
  count(*) FILTER (WHERE profile_views    IS NOT NULL) AS rows_profile_views,
  count(*) FILTER (WHERE marketing        IS NOT NULL) AS rows_marketing,
  count(*) AS total_rows
  FROM public.notification_preferences;

-- ── P11. new tables must NOT already exist (28 creates them) ────────────────
SELECT table_name,
       CASE WHEN table_name IN ('profile_history', 'trust_score_adjustments')
            THEN 'EXISTS - migration 28 skips creation (no-op branch)'
            ELSE 'absent - migration 28 will CREATE it' END AS state
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name IN ('profile_history', 'trust_score_adjustments')
 ORDER BY table_name;

-- ── P12. screening_attempts.criteria_id nullability ─────────────────────────
-- SkillsAssessment inserts criteria_id = NULL. If this says NOT NULL, 28 will
-- DROP the constraint (guarded by is_nullable = 'NO').
SELECT column_name, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'screening_attempts'
   AND column_name = 'criteria_id';

-- ── P13. anon users access — baseline BEFORE 28 ─────────────────────────────
-- Decision 3 (corrected): 28 must not add any anon grant on users.
-- Expect 0 policy rows. Column grants are Supabase's pre-existing default
-- table-level SELECT (one row per column — typically 41 on users); RECORD
-- the number as the baseline: it is pre-existing, and 28 must not change it.
SELECT (SELECT count(*) FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'users'
           AND roles = '{anon}') AS anon_users_policies,
       (SELECT count(*) FROM information_schema.column_privileges
         WHERE table_schema = 'public' AND table_name = 'users'
           AND grantee = 'anon' AND privilege_type = 'SELECT') AS anon_users_column_grants;

-- ── P14. existing users SELECT policies (context for question 5) ────────────
-- Records which policy variant is actually live, so the applications.ts
-- users-query behaviour can be judged against the real policy, not a guess.
SELECT policyname, cmd, roles, qual
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'users'
 ORDER BY policyname;

-- ── P15. notification_preferences constraints + indexes ─────────────────────
-- 28 moves the primary key from the legacy one-row-per-user user_id to id
-- before seeding typed rows. Expect BEFORE 28: one PK constraint on user_id
-- only (notification_preferences_pkey), no other constraints, no unique index
-- yet. Record what is actually there — 28's PK move is shape-guarded (drops
-- only a PK that is exactly (user_id), adds only when none exists).
SELECT c.conname AS constraint_name,
       c.contype AS constraint_type,
       pg_get_constraintdef(c.oid) AS definition
  FROM pg_constraint c
  JOIN pg_class rel ON rel.oid = c.conrelid
  JOIN pg_namespace ns ON ns.oid = rel.relnamespace
 WHERE ns.nspname = 'public'
   AND rel.relname = 'notification_preferences'
 ORDER BY c.contype, c.conname;

SELECT indexname, indexdef
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND tablename = 'notification_preferences'
 ORDER BY indexname;

-- ============================================================================
-- END PREFLIGHT. If every FAIL above is resolved, run in this order:
--   1. snapshot / backup
--   2. 28-preflight-checks.sql             (this file) — record P7 row counts
--   3. 28-fix-live-schema-drift.sql        (on staging first)
--   4. 28b-jobs-stage-status-sync.sql      (stage <-> status sync trigger)
--   5. 28d-jobs-status-transition.sql      (posted_at / closed_at stamps)
--   6. 28-postcheck.sql                    — C5 vs P7; C10 tests 28b + 28d
-- ============================================================================
