-- ============================================================================
-- 28d. jobs status transition trigger (posted_at / closed_at stamps)
-- ============================================================================
-- Run AFTER 28b-jobs-stage-status-sync.sql and BEFORE 28-postcheck.sql.
--
-- WHY: postcheck C10's first run failed 6 of 7 directions, and the
-- pg_trigger/pg_proc probe proved two things about live:
--   * 28b's sync trigger AND function did not exist at all (28b never
--     executed - re-running it fixes that; its guard passes today because
--     both columns and both enums are present);
--   * live NEVER had the v2 transition trigger either: trg_jobs_status_
--     transition and jobs_status_transition() were both absent, so
--     status -> 'closed' never stamped closed_at (C10-5) and C10a-2's
--     transition_trigger_installed boolean was false. This is a PRE-EXISTING
--     gap - migration 28 and 28b never created it and never claimed to - but
--     postcheck C10a-2 requires it and C10-4/C10-5 timestamps depend on it.
-- This file installs the v2 definition VERBATIM from
-- v2-schema/schema.sql:494-508 (same body, same BEFORE UPDATE shape).
--
-- WHAT IT DOES (v2 business rules, unchanged):
--   * status changes to 'active' -> posted_at = COALESCE(posted_at, now())
--   * status changes to 'closed' -> closed_at = now()
--   * BEFORE UPDATE FOR EACH ROW - never fires on INSERT (v2 behaviour).
--
-- FIRING ORDER on public.jobs (PostgreSQL fires same-table BEFORE triggers
-- alphabetically by trigger name):
--     trg_jobs_stage_status_sync   (28b)   'g' < 't' < 'u'
--     trg_jobs_status_transition   (this file)
--     trg_jobs_updated             (live's updated-at trigger; v2-schema
--                                   names its counterpart trg_jobs_updated_at)
-- so the sync trigger still runs FIRST: the transition trigger reads the
-- already-synced NEW.status and stamps posted_at/closed_at from the final
-- value even when only the legacy stage column was written (a legacy api/
-- activate/close now stamps timestamps correctly). The sync trigger never
-- writes posted_at or closed_at, so the two cannot fight. C10a prints the
-- live inventory and definitions as evidence.
--
-- GUARDS / IDEMPOTENCY:
--   * One DO block; skipped with a NOTICE unless public.jobs has the status,
--     posted_at and closed_at columns the function touches.
--   * CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS + CREATE TRIGGER:
--     safe to re-run any number of times.
--   * DDL on trigger objects only - no data, no columns, no grants. Trigger
--     functions need no EXECUTE grant (PostgreSQL does not check it for
--     triggers), so no anon/authenticated changes are involved.
--
-- VERIFICATION: database/28-postcheck.sql - C10 all 7 verdict rows PASS
-- (C10-4 posted_at and C10-5 closed_at included), C10a-2 reports
-- sync_trigger_installed = transition_trigger_installed = true, C10c = 0.
--
-- ROLLBACK of this file alone (no snapshot needed):
--   DROP TRIGGER IF EXISTS trg_jobs_status_transition ON public.jobs;
--   DROP FUNCTION IF EXISTS public.jobs_status_transition();
--   (also recorded in 28-rollback-notes.md)
-- ============================================================================

DO $mig28d$
DECLARE
  v_cols boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'status'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'posted_at'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'closed_at'
  ) INTO v_cols;

  IF NOT v_cols THEN
    RAISE NOTICE '28d: SKIP - jobs columns (status, posted_at, closed_at) present: %; transition trigger NOT installed',
                 v_cols;
    RETURN;
  END IF;

  CREATE OR REPLACE FUNCTION public.jobs_status_transition()
  RETURNS TRIGGER AS $fn$
  BEGIN
    IF NEW.status = 'active' AND OLD.status != 'active' THEN
      NEW.posted_at = COALESCE(NEW.posted_at, now());
    ELSIF NEW.status = 'closed' AND OLD.status != 'closed' THEN
      NEW.closed_at = now();
    END IF;
    RETURN NEW;
  END;
  $fn$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_jobs_status_transition ON public.jobs;
  CREATE TRIGGER trg_jobs_status_transition
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.jobs_status_transition();

  RAISE NOTICE '28d: trg_jobs_status_transition installed (fires after trg_jobs_stage_status_sync, before trg_jobs_updated)';
END $mig28d$;
