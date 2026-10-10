-- ============================================================================
-- 27. Fix live schema drift causing console API errors
-- ============================================================================
-- The deployed client expects columns/tables/FKs that the live DB is missing,
-- producing 400/404/406 errors in the browser console:
--
--   1. screening_attempts.job_id — code selects and inserts it
--      (ReviewerScoring, ScreeningQueue, RecruiterScreening, ScreeningSubmit)
--      but schema.sql and migrate-v1-to-v2.sql never created the column.
--      Also missing: result, details, status (inserted by ScreeningSubmit).
--
--   2. applications.job_id → jobs.id FK — PostgREST cannot resolve the
--      relationship ("PGRST200: Could not find a relationship between
--      'applications' and 'jobs' in the schema cache"), so embeds fail.
--      (The client was also fixed to stop using embeds; the FK is added here
--      for data integrity and so any future embed works.)
--
--   3. profile_drafts table — useProfileDraft probes it and gets 404.
--
-- Ends with NOTIFY pgrst, 'reload schema' so PostgREST picks up the changes
-- immediately instead of serving a stale schema cache.
--
-- Guards: every precondition uses SELECT EXISTS(...) — EXISTS always returns
-- exactly one row, so SELECT INTO can never assign NULL and `IF NOT ...` can
-- never fail open. Re-runnable: every DDL is IF NOT EXISTS / guarded.
--
--   Verification — expect from the trailing SELECTs:
--     screening_attempts: job_id, result, details, status present
--     applications_job_fk: present
--     profile_drafts: exists with RLS enabled and 4 policies
-- ============================================================================

DO $mig27$
DECLARE
  v_job_id_exists boolean;
  v_result_exists boolean;
  v_details_exists boolean;
  v_status_exists boolean;
  v_fk_exists boolean;
  v_orphans integer;
  v_drafts_exists boolean;
BEGIN
  -- ── 1. screening_attempts: add columns the code expects ───────────────────
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'screening_attempts' AND column_name = 'job_id'
  ) INTO v_job_id_exists;

  IF NOT v_job_id_exists THEN
    ALTER TABLE public.screening_attempts
      ADD COLUMN job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL;
    RAISE NOTICE 'mig27: added screening_attempts.job_id';
  ELSE
    RAISE NOTICE 'mig27: screening_attempts.job_id already exists';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'screening_attempts' AND column_name = 'result'
  ) INTO v_result_exists;

  IF NOT v_result_exists THEN
    ALTER TABLE public.screening_attempts ADD COLUMN result TEXT;
    RAISE NOTICE 'mig27: added screening_attempts.result';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'screening_attempts' AND column_name = 'details'
  ) INTO v_details_exists;

  IF NOT v_details_exists THEN
    ALTER TABLE public.screening_attempts ADD COLUMN details JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'mig27: added screening_attempts.details';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'screening_attempts' AND column_name = 'status'
  ) INTO v_status_exists;

  IF NOT v_status_exists THEN
    ALTER TABLE public.screening_attempts
      ADD COLUMN status TEXT NOT NULL DEFAULT 'pending_review';
    RAISE NOTICE 'mig27: added screening_attempts.status';
  END IF;

  IF NOT v_job_id_exists THEN
    CREATE INDEX IF NOT EXISTS idx_sa_job ON public.screening_attempts (job_id);
    RAISE NOTICE 'mig27: created idx_sa_job';
  END IF;

  -- ── 2. applications.job_id → jobs.id FK ───────────────────────────────────
  -- Only added when the column has no orphaned references (job rows that no
  -- longer exist), otherwise the FK build fails atomically and rolls back
  -- everything. Orphan cleanup is intentionally NOT performed automatically.
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint con
      JOIN pg_class t ON t.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public' AND t.relname = 'applications'
       AND con.contype = 'f'
       AND pg_get_constraintdef(con.oid) LIKE '%(job_id)%'
       AND pg_get_constraintdef(con.oid) LIKE '%jobs%'
  ) INTO v_fk_exists;

  IF v_fk_exists THEN
    RAISE NOTICE 'mig27: applications.job_id → jobs.id FK already exists';
  ELSE
    SELECT count(*) INTO v_orphans
      FROM public.applications a
     WHERE a.job_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = a.job_id);

    IF v_orphans > 0 THEN
      RAISE NOTICE 'mig27: % orphaned applications.job_id references — FK NOT added. Run: SELECT id, job_id FROM applications WHERE job_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM jobs WHERE jobs.id = applications.job_id); then delete/fix those rows and re-run this migration.', v_orphans;
    ELSE
      ALTER TABLE public.applications
        ADD CONSTRAINT applications_job_id_fkey
        FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
      RAISE NOTICE 'mig27: added applications.job_id → jobs.id FK';
    END IF;
  END IF;

  -- ── 3. profile_drafts table ───────────────────────────────────────────────
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'profile_drafts'
  ) INTO v_drafts_exists;

  IF NOT v_drafts_exists THEN
    CREATE TABLE public.profile_drafts (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      form_data   JSONB NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION public.update_updated_at()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_profile_drafts_updated_at
      BEFORE UPDATE ON public.profile_drafts
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

    ALTER TABLE public.profile_drafts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "drafts_select_own" ON public.profile_drafts;
    CREATE POLICY "drafts_select_own"
      ON public.profile_drafts FOR SELECT TO authenticated
      USING (user_id = (SELECT auth.uid()));

    DROP POLICY IF EXISTS "drafts_insert_own" ON public.profile_drafts;
    CREATE POLICY "drafts_insert_own"
      ON public.profile_drafts FOR INSERT TO authenticated
      WITH CHECK (user_id = (SELECT auth.uid()));

    DROP POLICY IF EXISTS "drafts_update_own" ON public.profile_drafts;
    CREATE POLICY "drafts_update_own"
      ON public.profile_drafts FOR UPDATE TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));

    DROP POLICY IF EXISTS "drafts_delete_own" ON public.profile_drafts;
    CREATE POLICY "drafts_delete_own"
      ON public.profile_drafts FOR DELETE TO authenticated
      USING (user_id = (SELECT auth.uid()));

    RAISE NOTICE 'mig27: created profile_drafts with RLS and 4 policies';
  ELSE
    RAISE NOTICE 'mig27: profile_drafts already exists';
  END IF;

  -- ── 4. Refresh PostgREST schema cache ─────────────────────────────────────
  NOTIFY pgrst, 'reload schema';
  RAISE NOTICE 'mig27: notified pgrst to reload schema';
END $mig27$;

-- Verification 1: screening_attempts columns
-- (expect job_id, result, details, status rows all present)
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'screening_attempts'
   AND column_name IN ('job_id', 'result', 'details', 'status')
 ORDER BY column_name;

-- Verification 2: applications → jobs FK
-- (expect one row: applications_job_id_fkey)
SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
  FROM pg_constraint con
  JOIN pg_class t ON t.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
 WHERE n.nspname = 'public' AND t.relname = 'applications'
   AND con.contype = 'f'
   AND pg_get_constraintdef(con.oid) LIKE '%jobs%';

-- Verification 3: profile_drafts existence, RLS, policies
-- (expect exists=true, rls_enabled=true, 4)
SELECT
  (SELECT count(*) > 0 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profile_drafts') AS exists,
  (SELECT relrowsecurity FROM pg_class
    WHERE oid = 'public.profile_drafts'::regclass) AS rls_enabled,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profile_drafts') AS policy_count;
