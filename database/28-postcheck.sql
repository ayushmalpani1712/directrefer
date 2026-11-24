-- ============================================================================
-- 28c. POSTCHECK — run AFTER 28-fix-live-schema-drift.sql,
--                  28b-jobs-stage-status-sync.sql AND
--                  28d-jobs-status-transition.sql
-- ============================================================================
-- EXECUTION ORDER (do not deviate):
--   1. SNAPSHOT / BACKUP                     <- your only rollback path
--   2. database/28-preflight-checks.sql      (read-only; record P7 counts)
--   3. database/28-fix-live-schema-drift.sql (on STAGING first, then production)
--   4. database/28b-jobs-stage-status-sync.sql
--   5. database/28d-jobs-status-transition.sql
--   6. database/28-postcheck.sql             (this file; C5 must equal P7)
--
-- C1-C9 are pure SELECTs: no DDL, no DML, safe against production.
-- C10 is the only section that writes: it INSERTs 7 test rows (4 insert-only
-- tests + 3 rows it then UPDATEs) inside an explicit transaction that ALWAYS
-- ends in ROLLBACK — no test row survives, so it is safe too. Run the file as
-- ONE script in the SQL editor (do not run its statements on separate
-- connections).
--
-- PURPOSE: prove migration 28 + 28b did exactly what they claimed and nothing
-- more. Pair with 28-preflight-checks.sql — its P7 row counts are your baseline.
--
-- PASS CRITERIA (all must hold):
--   C1  every column 28 says it adds now exists, with the expected nullability
--   C2  backfills match their sources row-for-row (zero mismatches)
--   C3  all 3 unique indexes exist; C3c the notification_preferences primary
--       key is on id (moved off the legacy one-row-per-user user_id)
--   C4  profile_history + trust_score_adjustments exist with RLS on and the
--       expected policy counts (4 and 2)
--   C5  row counts are IDENTICAL to the preflight P7 baseline (28 is additive;
--       notification_preferences counts legacy type IS NULL rows only, since
--       the seeds add typed rows on top by design)
--   C6  screening_attempts.criteria_id is now nullable
--   C7  anon users policies still zero, and column grants unchanged from the
--       preflight P13 baseline (pre-existing Supabase default; 28 adds none)
--   C8  job_status enum labels are exactly draft/active/paused/closed and
--       every jobs.status value is a member of it
--   C9  PostgREST schema cache reloaded (API probe — see C9 comment)
--   C10 28b's stage<->status sync AND 28d's transition stamps work in BOTH
--       directions on INSERT and UPDATE, posted_at/closed_at still get
--       stamped, all 7 verdict rows read PASS, and 0 test rows survive the
--       ROLLBACK
-- ============================================================================

-- ── C1. columns added by 28 (expect every row: state = 'exists') ────────────
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
            THEN 'FAIL - still missing'
            ELSE 'PASS - exists' END AS state,
       c.data_type,
       c.is_nullable
  FROM expected e
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public'
   AND c.table_name = e.table_name
   AND c.column_name = e.column_name
 ORDER BY CASE WHEN c.column_name IS NULL THEN 0 ELSE 1 END,
          e.table_name, e.column_name;

-- ── C2. backfill consistency: every target must match its source ────────────
-- Each line returns rows ONLY where the backfill is wrong. Expected: 0 rows
-- on every line. Lines are grouped; a "column does not exist" error means 28
-- did not run or aborted — check C1 first.

-- 2a. jobs.status vs jobs.stage (0 = correct)
SELECT 'jobs.status vs stage' AS check_name, count(*) AS mismatches
  FROM public.jobs
 WHERE COALESCE(stage::text, 'draft') <> COALESCE(status::text, 'draft');

-- 2b. jobs.applicant_count vs applicants, referral_count vs referrals
SELECT 'jobs.applicant_count vs applicants' AS check_name,
       count(*) AS mismatches
  FROM public.jobs
 WHERE COALESCE(applicants, 0) <> COALESCE(applicant_count, 0);

SELECT 'jobs.referral_count vs referrals' AS check_name,
       count(*) AS mismatches
  FROM public.jobs
 WHERE COALESCE(referrals, 0) <> COALESCE(referral_count, 0);

-- 2c. jobs.created_at vs posted_at
SELECT 'jobs.created_at vs posted_at' AS check_name, count(*) AS mismatches
  FROM public.jobs
 WHERE posted_at IS NOT NULL
   AND created_at IS DISTINCT FROM posted_at;

-- 2d. announcements.content vs body, is_active vs active
SELECT 'announcements.content vs body' AS check_name, count(*) AS mismatches
  FROM public.announcements
 WHERE COALESCE(body, '') IS DISTINCT FROM COALESCE(content, '');

SELECT 'announcements.is_active vs active' AS check_name,
       count(*) AS mismatches
  FROM public.announcements
 WHERE COALESCE(active, true) IS DISTINCT FROM COALESCE(is_active, true);

-- 2e. screening_attempts.passed vs score >= 60
SELECT 'screening_attempts.passed vs score>=60' AS check_name,
       count(*) AS mismatches
  FROM public.screening_attempts
 WHERE COALESCE(passed, false) IS DISTINCT FROM COALESCE(score >= 60, false);

-- 2f. screening_criteria.name / category vs legacy criterion_* columns
SELECT 'screening_criteria.name IS NULL' AS check_name, count(*) AS mismatches
  FROM public.screening_criteria WHERE name IS NULL;

SELECT 'screening_criteria.category IS NULL' AS check_name,
       count(*) AS mismatches
  FROM public.screening_criteria WHERE category IS NULL;

-- 2g. professional_capacities.user_id vs professional_id, and seed values
SELECT 'capacities.user_id vs professional_id' AS check_name,
       count(*) AS mismatches
  FROM public.professional_capacities
 WHERE professional_id IS NOT NULL
   AND user_id IS DISTINCT FROM professional_id;

SELECT 'capacities.user_id IS NULL' AS check_name, count(*) AS mismatches
  FROM public.professional_capacities WHERE user_id IS NULL;

SELECT 'capacities.period_start IS NULL' AS check_name, count(*) AS mismatches
  FROM public.professional_capacities WHERE period_start IS NULL;

-- 2h. matches.match_score vs score
SELECT 'matches.match_score vs score' AS check_name, count(*) AS mismatches
  FROM public.matches
 WHERE COALESCE(score, 0) <> COALESCE(match_score, 0);

-- 2i. notification_preferences typed rows seeded from legacy booleans
-- (seeds read only legacy rows — type IS NULL — so expect >= the preflight P10
--  non-null counts; ON CONFLICT DO NOTHING means re-running never duplicates.
--  Typed rows sit ON TOP of the legacy rows, which is why C5 counts only
--  type IS NULL against the P7 baseline.)
SELECT 'notification_preferences typed rows' AS check_name,
       count(*) FILTER (WHERE type IS NOT NULL AND channel IS NOT NULL) AS typed_rows,
       count(*) AS total_rows
  FROM public.notification_preferences;

-- ── C3. unique indexes created by 28 (expect 3 rows) ────────────────────────
SELECT indexname, indexdef
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND indexname IN ('uq_professional_capacities_user_period',
                     'uq_notification_preferences_user_type_channel',
                     'uq_matches_job_candidate')
 ORDER BY indexname;

-- C3b. duplicate re-check (expect 0 rows on all three — proves the indexes
--      would have built even if 28's guard had skipped them)
SELECT 'uq_professional_capacities_user_period' AS index_name,
       count(*) AS dup_groups
  FROM (SELECT user_id, period_start FROM public.professional_capacities
         WHERE user_id IS NOT NULL AND period_start IS NOT NULL
         GROUP BY user_id, period_start HAVING count(*) > 1) d
UNION ALL
SELECT 'uq_notification_preferences_user_type_channel', count(*)
  FROM (SELECT user_id, type, channel FROM public.notification_preferences
         WHERE type IS NOT NULL AND channel IS NOT NULL
         GROUP BY user_id, type, channel HAVING count(*) > 1) d
UNION ALL
SELECT 'uq_matches_job_candidate', count(*)
  FROM (SELECT job_id, candidate_id FROM public.matches
         WHERE job_id IS NOT NULL AND candidate_id IS NOT NULL
         GROUP BY job_id, candidate_id HAVING count(*) > 1) d
 ORDER BY 1;

-- C3c. notification_preferences primary key columns (expect 1 row: id —
--      28 moved the PK off the legacy one-row-per-user user_id)
SELECT a.attname AS column_name
  FROM pg_constraint c
  JOIN pg_class rel ON rel.oid = c.conrelid
  JOIN pg_namespace ns ON ns.oid = rel.relnamespace
  JOIN pg_attribute a ON a.attrelid = rel.oid AND a.attnum = ANY (c.conkey)
 WHERE ns.nspname = 'public'
   AND rel.relname = 'notification_preferences'
   AND c.contype = 'p'
 ORDER BY a.attnum;

-- ── C4. new tables: exist, RLS enabled, expected policy counts ──────────────
-- expect 2 rows: profile_history (rls true, 4 policies),
--                 trust_score_adjustments (rls true, 2 policies)
SELECT t.table_name,
       (SELECT relrowsecurity FROM pg_class c
         WHERE c.oid = ('public.' || t.table_name)::regclass) AS rls_enabled,
       (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = t.table_name) AS policy_count
  FROM information_schema.tables t
 WHERE t.table_schema = 'public'
   AND t.table_name IN ('profile_history', 'trust_score_adjustments')
 ORDER BY t.table_name;

-- ── C5. row counts — must equal the preflight P7 baseline exactly ───────────
-- notification_preferences counts only legacy rows (type IS NULL): 28 seeds
-- typed rows on top of the baseline by design, and those are checked in 2i.
SELECT 'jobs' AS table_name, count(*) AS row_count FROM public.jobs
UNION ALL SELECT 'applications', count(*) FROM public.applications
UNION ALL SELECT 'announcements', count(*) FROM public.announcements
UNION ALL SELECT 'screening_criteria', count(*) FROM public.screening_criteria
UNION ALL SELECT 'screening_attempts', count(*) FROM public.screening_attempts
UNION ALL SELECT 'professional_capacities', count(*) FROM public.professional_capacities
UNION ALL SELECT 'notification_preferences', count(*) FILTER (WHERE type IS NULL) FROM public.notification_preferences
UNION ALL SELECT 'error_logs', count(*) FROM public.error_logs
UNION ALL SELECT 'profiles_job_seeker', count(*) FROM public.profiles_job_seeker
UNION ALL SELECT 'matches', count(*) FROM public.matches
UNION ALL SELECT 'users', count(*) FROM public.users
ORDER BY table_name;

-- ── C6. screening_attempts.criteria_id now nullable (expect NO) ─────────────
SELECT column_name, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'screening_attempts'
   AND column_name = 'criteria_id';

-- ── C7. anon users access — corrected Decision 3 ────────────────────────────
-- Expect 0 policy rows. Column grants are a PRE-EXISTING Supabase default
-- table-level SELECT (41 = one per users column), not a 28 product: 28/28b
-- write no anon GRANT, so this number must match the preflight P13 baseline.
-- Latent, not exploitable: anon's path through users_select_merged calls
-- is_admin(), whose EXECUTE anon lacks (42501) → 0 rows visible. The later
-- anon phase REVOKEs the blanket grant before any column-limited GRANT.
SELECT (SELECT count(*) FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'users'
           AND roles = '{anon}') AS anon_users_policies,
       (SELECT count(*) FROM information_schema.column_privileges
         WHERE table_schema = 'public' AND table_name = 'users'
           AND grantee = 'anon' AND privilege_type = 'SELECT') AS anon_users_column_grants;

-- ── C8. job_status enum integrity ───────────────────────────────────────────
-- 8a. labels (expect exactly draft/active/paused/closed)
SELECT e.enumlabel, e.enumsortorder
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  JOIN pg_namespace n ON n.oid = t.typnamespace
 WHERE n.nspname = 'public' AND t.typname = 'job_status'
 ORDER BY e.enumsortorder;

-- 8b. every jobs.status value must be a member of job_status (0 = valid;
--     the column type already guarantees this, this is belt-and-braces)
SELECT status, count(*) AS row_count
  FROM public.jobs
 GROUP BY status
 ORDER BY status;

-- 8c. jobs rows still on the legacy stage value vs the new status value
-- (must be 0: 28b keeps stage and status identical on every write; a non-zero
--  count means trg_jobs_stage_status_sync is missing or disabled — see C10a)
SELECT count(*) AS stage_status_drift_rows
  FROM public.jobs
 WHERE stage IS NOT NULL
   AND stage::text IS DISTINCT FROM status::text;

-- ── C9. Pgrst reload sanity ─────────────────────────────────────────────────
-- The NOTIFY pgrst, 'reload schema' at the end of 28 is fire-and-forget and
-- cannot be SELECTed back. Its effect is observable only through the API:
-- after 28, this client-side probe must return HTTP 200 instead of 400
-- PGRST204. Run it outside SQL, e.g. in PowerShell:
--
--   $k = (Get-Content .env | Select-String 'VITE_SUPABASE_ANON_KEY=').Line.Split('=')[1]
--   Invoke-WebRequest "$env:URL/rest/v1/jobs?select=status&limit=1" `
--     -Headers @{ apikey = $k; Authorization = "Bearer $k" }
--
-- Expect HTTP 200 with a JSON body (0 rows is fine — RLS, not schema).
-- HTTP 400 with "column jobs.status does not exist" = schema cache stale;
-- wait a few seconds and retry before re-running 28 (it is safe to re-run).
SELECT 'see C9 comment for the API probe — cannot be verified in SQL' AS note;

-- ── C10a. public.jobs trigger inventory — alphabetical order = firing order ─
-- PostgreSQL fires same-table BEFORE triggers alphabetically by trigger name,
-- so this listing IS the firing order. Expected at minimum:
--   trg_jobs_stage_status_sync   BEFORE INSERT OR UPDATE   (installed by 28b)
--   trg_jobs_status_transition   BEFORE UPDATE             (installed by 28d)
--   trg_jobs_updated_at          BEFORE UPDATE             (v2 schema)
-- The sync trigger must sort BEFORE the transition trigger ('g' < 't'), which
-- is what makes posted_at/closed_at in C10-4 and C10-5 work when only stage
-- was written. enabled_flag: O = enabled, D = disabled (a D here explains
-- every C10 FAIL below).
SELECT row_number() OVER (ORDER BY t.tgname) AS firing_order,
       t.tgname AS trigger_name,
       pg_get_triggerdef(t.oid) AS definition,
       t.tgenabled AS enabled_flag
  FROM pg_trigger t
 WHERE t.tgrelid = 'public.jobs'::regclass
   AND NOT t.tgisinternal
 ORDER BY t.tgname;

-- C10a-2. the two triggers C10 depends on + the name-ordering claim in 28b
-- (both booleans must be true; sync_sorts_before_transition proves 'g' < 't')
SELECT EXISTS (SELECT 1 FROM pg_trigger
                WHERE tgrelid = 'public.jobs'::regclass
                  AND tgname = 'trg_jobs_stage_status_sync')
         AS sync_trigger_installed,
       EXISTS (SELECT 1 FROM pg_trigger
                WHERE tgrelid = 'public.jobs'::regclass
                  AND tgname = 'trg_jobs_status_transition')
         AS transition_trigger_installed,
       'trg_jobs_stage_status_sync' < 'trg_jobs_status_transition'
         AS sync_sorts_before_transition;

-- C10a-3. column defaults the C10 INSERT tests rely on — 28b's pre-run probe,
-- recorded as post-run evidence. stage's default must be 'draft' or NULL and
-- status's default must be 'draft'; anything else makes C10-1 / C10-6 FAIL
-- (report the value back instead of re-running).
SELECT column_name, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'jobs'
   AND column_name IN ('stage', 'status')
 ORDER BY column_name;

-- ── C10b. direction matrix — WRITES; this transaction ALWAYS ends in ROLLBACK ─
-- 7 test rows (titles C10-1 … C10-7): C10-1/2/3/6 are INSERT-only tests,
-- C10-4/5/7 are INSERTed as a plain client-shape draft and then UPDATEd.
-- Every expectation comes straight from 28b's documented PRECEDENCE rules.
-- Test rows borrow an existing users.id for recruiter_id (NOT NULL + FK);
-- nothing outside this transaction is touched and nothing is committed.
--
-- Run the whole file as ONE script (see header): BEGIN … ROLLBACK must happen
-- on one connection. Expect 7 rows from the verdict query, all PASS.

DO $c10$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users) THEN
    RAISE EXCEPTION 'C10 cannot run: public.users has no rows to supply recruiter_id';
  END IF;
END $c10$;

BEGIN;

-- C10-1  INSERT, legacy api/ shape: stage supplied, status left at its default
--        -> stage wins: status := stage
INSERT INTO public.jobs (recruiter_id, title, type, stage)
VALUES ((SELECT id FROM public.users LIMIT 1),
        'C10-1 insert-stage-only', 'Full-time', 'active');

-- C10-2  INSERT, client shape: non-draft status supplied, stage omitted
--        -> status wins: stage := status
INSERT INTO public.jobs (recruiter_id, title, type, status)
VALUES ((SELECT id FROM public.users LIMIT 1),
        'C10-2 insert-status-only', 'Full-time', 'paused');

-- C10-3  INSERT with BOTH columns supplied and disagreeing
--        -> status wins: both end as 'active'
INSERT INTO public.jobs (recruiter_id, title, type, status, stage)
VALUES ((SELECT id FROM public.users LIMIT 1),
        'C10-3 insert-both-disagree', 'Full-time', 'active', 'closed');

-- C10-4  base row for the UPDATE stage-only test (client-shape draft)
INSERT INTO public.jobs (recruiter_id, title, type, status)
VALUES ((SELECT id FROM public.users LIMIT 1),
        'C10-4 update-stage-only', 'Full-time', 'draft');

-- C10-5  base row for the UPDATE status-only test (client-shape draft)
INSERT INTO public.jobs (recruiter_id, title, type, status)
VALUES ((SELECT id FROM public.users LIMIT 1),
        'C10-5 update-status-only', 'Full-time', 'draft');

-- C10-6  INSERT, client shape: status = 'draft' supplied, stage omitted
--        -> must stay 'draft'; FAILs loudly if jobs.stage's default is NOT
--           'draft'/NULL (28b header PRE-RUN PROBE / "direction 6")
INSERT INTO public.jobs (recruiter_id, title, type, status)
VALUES ((SELECT id FROM public.users LIMIT 1),
        'C10-6 insert-draft-shape', 'Full-time', 'draft');

-- C10-7  base row for the UPDATE both-changed test (client-shape draft)
INSERT INTO public.jobs (recruiter_id, title, type, status)
VALUES ((SELECT id FROM public.users LIMIT 1),
        'C10-7 update-both-disagree', 'Full-time', 'draft');

-- C10-4  UPDATE with ONLY stage changed (legacy api/ activate shape)
--        -> stage wins: status := stage; then trg_jobs_status_transition
--           (fires after the sync trigger) must stamp posted_at
UPDATE public.jobs
   SET stage = 'active'
 WHERE title = 'C10-4 update-stage-only';

-- C10-5  UPDATE with ONLY status changed (client close shape)
--        -> status wins: stage := status; closed_at must be stamped
UPDATE public.jobs
   SET status = 'closed'
 WHERE title = 'C10-5 update-status-only';

-- C10-7  UPDATE with BOTH columns changed and disagreeing
--        -> status wins: both end as 'active'
UPDATE public.jobs
   SET status = 'active', stage = 'paused'
 WHERE title = 'C10-7 update-both-disagree';

-- verdict — expect exactly 7 rows, every result = PASS. Fewer than 7 rows
-- means an INSERT failed and the transaction aborted before this point.
-- Diagnostic split for C10-4/C10-5: if status/stage read PASS but the
-- timestamp reads NULL, the sync trigger works and trg_jobs_status_transition
-- is absent on live (see C10a) — a pre-existing gap 28b did not cause.
SELECT 'C10-1 INSERT stage-only (legacy api/ shape)' AS direction,
       'status=active, stage=active' AS expected,
       'status=' || status::text || ', stage=' || COALESCE(stage::text, 'NULL')
         AS actual,
       CASE WHEN status = 'active' AND stage = 'active'
            THEN 'PASS' ELSE 'FAIL' END AS result
  FROM public.jobs WHERE title = 'C10-1 insert-stage-only'
UNION ALL
SELECT 'C10-2 INSERT status-only (client shape)',
       'status=paused, stage=paused',
       'status=' || status::text || ', stage=' || COALESCE(stage::text, 'NULL'),
       CASE WHEN status = 'paused' AND stage = 'paused'
            THEN 'PASS' ELSE 'FAIL' END
  FROM public.jobs WHERE title = 'C10-2 insert-status-only'
UNION ALL
SELECT 'C10-3 INSERT both supplied, disagree (status wins)',
       'status=active, stage=active',
       'status=' || status::text || ', stage=' || COALESCE(stage::text, 'NULL'),
       CASE WHEN status = 'active' AND stage = 'active'
            THEN 'PASS' ELSE 'FAIL' END
  FROM public.jobs WHERE title = 'C10-3 insert-both-disagree'
UNION ALL
SELECT 'C10-4 UPDATE stage-only -> status + posted_at',
       'status=active, stage=active, posted_at set',
       'status=' || status::text || ', stage=' || COALESCE(stage::text, 'NULL')
         || ', posted_at=' || CASE WHEN posted_at IS NOT NULL
                                   THEN 'set' ELSE 'NULL' END,
       CASE WHEN status = 'active' AND stage = 'active' AND posted_at IS NOT NULL
            THEN 'PASS' ELSE 'FAIL' END
  FROM public.jobs WHERE title = 'C10-4 update-stage-only'
UNION ALL
SELECT 'C10-5 UPDATE status-only -> stage + closed_at',
       'status=closed, stage=closed, closed_at set',
       'status=' || status::text || ', stage=' || COALESCE(stage::text, 'NULL')
         || ', closed_at=' || CASE WHEN closed_at IS NOT NULL
                                   THEN 'set' ELSE 'NULL' END,
       CASE WHEN status = 'closed' AND stage = 'closed' AND closed_at IS NOT NULL
            THEN 'PASS' ELSE 'FAIL' END
  FROM public.jobs WHERE title = 'C10-5 update-status-only'
UNION ALL
SELECT 'C10-6 INSERT client shape: status=draft, stage omitted',
       'status=draft, stage=draft',
       'status=' || status::text || ', stage=' || COALESCE(stage::text, 'NULL'),
       CASE WHEN status = 'draft' AND stage = 'draft'
            THEN 'PASS' ELSE 'FAIL' END
  FROM public.jobs WHERE title = 'C10-6 insert-draft-shape'
UNION ALL
SELECT 'C10-7 UPDATE both supplied, disagree (status wins)',
       'status=active, stage=active',
       'status=' || status::text || ', stage=' || COALESCE(stage::text, 'NULL'),
       CASE WHEN status = 'active' AND stage = 'active'
            THEN 'PASS' ELSE 'FAIL' END
  FROM public.jobs WHERE title = 'C10-7 update-both-disagree'
 ORDER BY 1;

ROLLBACK;

-- C10c. after the ROLLBACK: no test row survived (expect 0). If this is not
-- 0, the ROLLBACK did not run — delete the C10-* rows by hand.
SELECT count(*) AS surviving_test_rows
  FROM public.jobs
 WHERE title ~ '^C10-[1-7] ';

-- ============================================================================
-- END POSTCHECK. PASS = every C1-C10 result reads PASS/expected value,
-- C10c surviving_test_rows = 0, and C5 matches the preflight P7 baseline.
-- Next client-side verification: re-run the audit probes for
-- JobDetail, ReferralJobs, matching, capacity, notification preferences,
-- error logs and announcements, and confirm no 400 PGRST204 remains.
-- ============================================================================
