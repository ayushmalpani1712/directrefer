-- ============================================================================
-- 28b. jobs stage <-> status sync trigger
-- ============================================================================
-- Run AFTER 28-fix-live-schema-drift.sql and BEFORE 28-postcheck.sql.
--
-- EXECUTION ORDER (do not deviate):
--   1. SNAPSHOT / BACKUP                     <- your only rollback path
--   2. database/28-preflight-checks.sql      (read-only; record P7 counts)
--   3. database/28-fix-live-schema-drift.sql (on STAGING first, then production)
--   4. database/28b-jobs-stage-status-sync.sql   (this file)
--   5. database/28-postcheck.sql             (C5 must equal P7; C10 tests 28b)
--
-- WHY: migration 28 copies stage -> status once and stops. From then on the
-- React client writes ONLY status while the legacy serverless api/ layer
-- (api/jobs.js:27-30,51 and api/admin.js:76) writes ONLY stage - the two
-- columns drift apart again on the first legacy write. This BEFORE trigger
-- keeps them identical on every write, which is what makes postcheck C2a and
-- C8c (mismatch = 0) permanent instead of a point-in-time result.
--
-- PRECEDENCE - explicit rules, no heuristics:
--   INSERT:
--     * status at its default ('draft', or NULL defensively) + stage supplied
--       with a non-'draft' value  -> stage wins:  status := stage
--     * status supplied explicitly (any value <> 'draft') -> status wins:
--       stage := status
--   UPDATE (the column that changed - IS DISTINCT FROM OLD - wins):
--     * status changed (alone or together with stage) -> status wins:
--       stage := status   (both-changed-and-disagree is covered here: status)
--     * only stage changed and carries a value -> stage wins: status := stage
--     * only stage changed to NULL -> no copy (status is NOT NULL)
--     * neither column changed -> no-op, except the invariant below
--   INVARIANT (every INSERT and UPDATE, after the rules above):
--     stage IS NULL OR stage <> status  ->  stage := status
--     A NULL stage carries no information, so it is re-derived from status
--     rather than propagated; nothing in this function can raise on NULLs.
--
-- PRE-RUN PROBE (read-only) - confirm jobs.stage's default is 'draft' or NULL:
--   SELECT is_nullable, column_default
--     FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'jobs'
--      AND column_name = 'stage';
-- A non-'draft' default would make an INSERT that omits stage but sends
-- status = 'draft' inherit that default and be overwritten by rule 1 above.
-- Postcheck C10 direction 6 tests exactly that client shape and will FAIL
-- loudly if the default is wrong - report back before deploying the client.
--
-- FIRING ORDER vs trg_jobs_status_transition (posted_at / closed_at):
--   PostgreSQL fires same-table BEFORE triggers in alphabetical order by
--   trigger name. The names on public.jobs:
--       trg_jobs_stage_status_sync   (this file)
--       trg_jobs_status_transition   (v2-schema/schema.sql:506)
--       trg_jobs_updated_at          (v2-schema/schema.sql:489)
--   "trg_jobs_st-age..." sorts before "trg_jobs_st-atus..." ('g' < 't'), so
--   this trigger ALWAYS fires BEFORE trg_jobs_status_transition: the
--   transition trigger reads the already-synced NEW.status, so posted_at and
--   closed_at are computed from the final value even when only stage was
--   written (a legacy api/ activate/close now stamps timestamps correctly -
--   before 28b the transition trigger saw an unchanged status and skipped).
--   This trigger never writes posted_at or closed_at itself, so it cannot
--   fight that logic. On INSERT the transition trigger does not fire at all
--   (it is BEFORE UPDATE only) - unchanged from v2 behavior. Confirm the live
--   inventory with postcheck C10a (pg_trigger listing in firing order).
--
-- GUARDS / IDEMPOTENCY:
--   * One DO block. The function and trigger are created only when BOTH
--     public.jobs.stage and public.jobs.status columns AND both enum types
--     (job_stage, job_status) exist; otherwise a NOTICE explains the skip.
--   * CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS + CREATE TRIGGER:
--     safe to re-run any number of times.
--   * Writes no data, no columns, no grants - DDL on trigger objects only.
--     No NOTIFY pgrst needed: PostgREST does not expose triggers.
--
-- VERIFICATION: database/28-postcheck.sql section C10 proves both sync
-- directions (stage->status and status->stage) on INSERT and UPDATE inside a
-- transaction that ends in ROLLBACK - no test row survives.
--
-- ROLLBACK of this file alone (no snapshot needed):
--   DROP TRIGGER IF EXISTS trg_jobs_stage_status_sync ON public.jobs;
--   DROP FUNCTION IF EXISTS public.jobs_stage_status_sync();
--   (also recorded in 28-rollback-notes.md)
-- ============================================================================

DO $mig28b$
DECLARE
  v_cols  boolean;
  v_types boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'stage'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'status'
  ) INTO v_cols;

  SELECT to_regtype('public.job_stage') IS NOT NULL
     AND to_regtype('public.job_status') IS NOT NULL INTO v_types;

  IF NOT (v_cols AND v_types) THEN
    RAISE NOTICE '28b: SKIP - columns present: %, enum types present: %; sync trigger NOT installed',
                 v_cols, v_types;
    RETURN;
  END IF;

  CREATE OR REPLACE FUNCTION public.jobs_stage_status_sync()
  RETURNS TRIGGER AS $fn$
  BEGIN
    IF TG_OP = 'INSERT' THEN
      -- status at its default means the writer did not choose a status:
      -- stage wins. Any other status was supplied explicitly: status wins.
      IF NEW.status IS NULL OR NEW.status = 'draft' THEN
        IF NEW.stage IS NOT NULL AND NEW.stage::text <> 'draft' THEN
          NEW.status := NEW.stage::text::public.job_status;
        END IF;
      ELSE
        NEW.stage := NEW.status::text::public.job_stage;
      END IF;
    ELSE
      -- UPDATE: whichever column changed wins; when both changed (and thus
      -- disagree) status wins. A NULL stage carries no value and is skipped.
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.stage := NEW.status::text::public.job_stage;
      ELSIF NEW.stage IS DISTINCT FROM OLD.stage AND NEW.stage IS NOT NULL THEN
        NEW.status := NEW.stage::text::public.job_status;
      END IF;
    END IF;

    -- invariant: stage must never be NULL or diverge from status
    IF NEW.stage IS NULL OR NEW.stage::text IS DISTINCT FROM NEW.status::text THEN
      NEW.stage := NEW.status::text::public.job_stage;
    END IF;

    RETURN NEW;
  END;
  $fn$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_jobs_stage_status_sync ON public.jobs;
  CREATE TRIGGER trg_jobs_stage_status_sync
    BEFORE INSERT OR UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.jobs_stage_status_sync();

  RAISE NOTICE '28b: trg_jobs_stage_status_sync installed (fires before trg_jobs_status_transition)';
END $mig28b$;
