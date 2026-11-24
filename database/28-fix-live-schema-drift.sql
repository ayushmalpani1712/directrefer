-- ============================================================================
-- 28. Fix live schema drift v2 — columns and tables
-- ============================================================================
-- The deployed client (and v2-schema/schema.sql) expect objects the live DB is
-- missing. Every item below was confirmed by probing the live PostgREST API
-- with the anon key (400 PGRST204 "column not found" / 404 table not found /
-- 401 no anon grant). Full breakdown:
--
--   1. jobs            missing: status (client used the v2 name while live has
--                      the legacy `stage` enum), track, requirements,
--                      expires_at, company_id, applicant_count, referral_count,
--                      created_at, closed_at.
--                      Breaks: every job detail page ("Job not found"),
--                      recruiter pause/close/bulk actions, skill matching,
--                      admin jobs ordering, expired-job auto-close.
--   2. applications    missing: resume_url, notes, created_at, deleted_at.
--                      Breaks: job application submission and status updates.
--   3. announcements   missing: content, is_active (live has body, active).
--                      Breaks: announcement banner + admin CRUD.
--   4. screening_criteria missing: name, description, category, track, version
--                      (live has the legacy criterion_* columns). The client
--                      uses BOTH shapes, so nothing is dropped.
--   5. screening_attempts missing: max_score, passed, evidence, reviewed_by,
--                      reviewed_at; criteria_id is NOT NULL but SkillsAssessment
--                      inserts NULL (standalone assessments).
--   6. professional_capacities missing: user_id, period_start, period_end,
--                      max_capacity, used (live has only professional_id).
--                      Breaks: CapacityMeter + updateCapacity.
--   7. notification_preferences missing: id, type, channel, enabled + the
--                      unique (user_id, type, channel) the client upserts on,
--                      and its primary key still sits on the legacy
--                      one-row-per-user user_id (must move to id before the
--                      typed-row seeds can insert a second row per user).
--                      Breaks: Settings notification toggles.
--   8. error_logs      missing: page, stack, metadata. Breaks client error
--                      logging and the admin health activity feed.
--   9. profiles_job_seeker missing: bio.
--  10. matches         missing: match_score + the score breakdown the client
--                      upserts; unique (job_id, candidate_id) for the
--                      upsert's onConflict. NOTE: live already HAS `source`
--                      (the anon API probe mis-reported it as missing) — 28
--                      now guards every matches column individually and
--                      skips `source` if present.
--  11. profile_history (404) — ProfessionalProfile version history.
--  12. trust_score_adjustments (404) — behavior-score audit log.
--  13. users anon access — DEFERRED to a later phase by decision: this file
--                      writes NO anon grant in any form (column, view or RPC),
--                      and email/mobile must never be anon-readable. The three
--                      public profile pages stay broken for logged-out visitors
--                      until that later phase ships.
--
-- Ordering: RUN THIS BEFORE deploying the client build that accompanies it —
-- the client now writes jobs.status and expects the columns added here.
--
-- Guards: the whole script is one transaction (DO block). Every DDL is guarded
-- with information_schema/pg_catalog EXISTS checks, backfills only run inside
-- the "column was just added" branch, FK/unique-index creation is skipped
-- with a NOTICE when orphaned or duplicate rows would make it fail, and the
-- notification_preferences PK move only drops a PK that is exactly (user_id)
-- and only adds the new PK when none exists yet (NOTICE otherwise). Re-runnable.
--
-- Ends with NOTIFY pgrst, 'reload schema' so PostgREST picks up changes
-- immediately instead of serving a stale schema cache.
--
--   Verification — expect from the trailing SELECTs:
--     jobs: status, track, requirements, expires_at, applicant_count,
--           referral_count, created_at, closed_at present
--     applications: resume_url, notes, created_at present
--     announcements: content, is_active present
--     screening_criteria: name, description, category, track, version present
--     screening_attempts: max_score, passed, evidence, reviewed_by,
--           reviewed_at present; criteria_id nullable
--     professional_capacities: user_id, period_start, period_end,
--           max_capacity, used present
--     notification_preferences: id, type, channel, enabled present, primary
--           key on id, unique index on (user_id, type, channel)
--     error_logs: page, stack, metadata present
--     profiles_job_seeker: bio present
--     matches: match_score, skills_score, role_score, company_score,
--           location_score, reputation_score, source present with a unique
--           index on (job_id, candidate_id)
--     profile_history: exists with RLS enabled and 4 policies
--     trust_score_adjustments: exists with RLS enabled and 2 policies
-- ============================================================================

DO $mig28$
DECLARE
  v_col boolean;
  v_cnt integer;
  v_pname text;
BEGIN
  -- ══════════════════════════════════════════════════════════════════════
  -- 1. jobs
  -- ══════════════════════════════════════════════════════════════════════

  -- job_status enum (values mirror the live job_stage enum: lowercase)
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public' AND t.typname = 'job_status'
  ) THEN
    CREATE TYPE public.job_status AS ENUM ('draft', 'active', 'paused', 'closed');
    RAISE NOTICE 'mig28: created type job_status';
  END IF;

  -- career_track enum (jobs.track, screening_criteria.track)
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public' AND t.typname = 'career_track'
  ) THEN
    CREATE TYPE public.career_track AS ENUM ('internship', 'early_career', 'experienced', 'leadership');
    RAISE NOTICE 'mig28: created type career_track';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'status'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.jobs ADD COLUMN status public.job_status NOT NULL DEFAULT 'draft';
    UPDATE public.jobs
       SET status = COALESCE(stage::text, 'draft')::public.job_status;
    RAISE NOTICE 'mig28: added jobs.status and backfilled from stage';
  ELSE
    RAISE NOTICE 'mig28: jobs.status already exists';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'track'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.jobs ADD COLUMN track public.career_track DEFAULT 'early_career';
    RAISE NOTICE 'mig28: added jobs.track';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'requirements'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.jobs ADD COLUMN requirements TEXT;
    RAISE NOTICE 'mig28: added jobs.requirements';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'expires_at'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.jobs ADD COLUMN expires_at TIMESTAMPTZ;
    RAISE NOTICE 'mig28: added jobs.expires_at';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'company_id'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.jobs
      ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
    RAISE NOTICE 'mig28: added jobs.company_id';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'applicant_count'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.jobs ADD COLUMN applicant_count INTEGER NOT NULL DEFAULT 0;
    UPDATE public.jobs SET applicant_count = COALESCE(applicants, 0);
    RAISE NOTICE 'mig28: added jobs.applicant_count and backfilled from applicants';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'referral_count'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.jobs ADD COLUMN referral_count INTEGER NOT NULL DEFAULT 0;
    UPDATE public.jobs SET referral_count = COALESCE(referrals, 0);
    RAISE NOTICE 'mig28: added jobs.referral_count and backfilled from referrals';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'created_at'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.jobs ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    UPDATE public.jobs SET created_at = COALESCE(posted_at, now());
    RAISE NOTICE 'mig28: added jobs.created_at and backfilled from posted_at';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'closed_at'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.jobs ADD COLUMN closed_at TIMESTAMPTZ;
    RAISE NOTICE 'mig28: added jobs.closed_at';
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 2. applications
  -- ══════════════════════════════════════════════════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'resume_url'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.applications ADD COLUMN resume_url TEXT;
    RAISE NOTICE 'mig28: added applications.resume_url';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'notes'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.applications ADD COLUMN notes TEXT;
    RAISE NOTICE 'mig28: added applications.notes';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'created_at'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.applications ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    UPDATE public.applications SET created_at = COALESCE(submitted_at, now());
    RAISE NOTICE 'mig28: added applications.created_at and backfilled from submitted_at';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'deleted_at'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.applications ADD COLUMN deleted_at TIMESTAMPTZ;
    RAISE NOTICE 'mig28: added applications.deleted_at';
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 3. announcements (live has body/active; client + v2 use content/is_active)
  -- ══════════════════════════════════════════════════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'content'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.announcements ADD COLUMN content TEXT;
    UPDATE public.announcements SET content = COALESCE(body, '') WHERE content IS NULL;
    ALTER TABLE public.announcements ALTER COLUMN content SET NOT NULL;
    RAISE NOTICE 'mig28: added announcements.content and backfilled from body';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'is_active'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.announcements ADD COLUMN is_active BOOLEAN;
    UPDATE public.announcements SET is_active = COALESCE(active, true) WHERE is_active IS NULL;
    ALTER TABLE public.announcements
      ALTER COLUMN is_active SET NOT NULL,
      ALTER COLUMN is_active SET DEFAULT true;
    RAISE NOTICE 'mig28: added announcements.is_active and backfilled from active';
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 4. screening_criteria (keep legacy criterion_* — screeningTemplates and
  --    admin Settings still write them; add the v2 name/category shape)
  -- ══════════════════════════════════════════════════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'screening_criteria' AND column_name = 'name'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.screening_criteria ADD COLUMN name TEXT;
    UPDATE public.screening_criteria
       SET name = COALESCE(
         NULLIF(regexp_replace(initcap(COALESCE(criterion_key, '')), '_', ' ', 'g'), ''),
         criterion_type,
         'Criterion'
       )
     WHERE name IS NULL;
    ALTER TABLE public.screening_criteria ALTER COLUMN name SET NOT NULL;
    RAISE NOTICE 'mig28: added screening_criteria.name and backfilled from criterion_key';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'screening_criteria' AND column_name = 'category'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.screening_criteria ADD COLUMN category TEXT;
    UPDATE public.screening_criteria
       SET category = COALESCE(criterion_type, 'skills')
     WHERE category IS NULL;
    ALTER TABLE public.screening_criteria ALTER COLUMN category SET NOT NULL;
    RAISE NOTICE 'mig28: added screening_criteria.category and backfilled from criterion_type';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'screening_criteria' AND column_name = 'description'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.screening_criteria ADD COLUMN description TEXT;
    RAISE NOTICE 'mig28: added screening_criteria.description';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'screening_criteria' AND column_name = 'track'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.screening_criteria ADD COLUMN track public.career_track;
    RAISE NOTICE 'mig28: added screening_criteria.track';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'screening_criteria' AND column_name = 'version'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.screening_criteria ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    RAISE NOTICE 'mig28: added screening_criteria.version';
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 5. screening_attempts
  -- ══════════════════════════════════════════════════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'screening_attempts' AND column_name = 'max_score'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.screening_attempts ADD COLUMN max_score NUMERIC(5,2) NOT NULL DEFAULT 100;
    RAISE NOTICE 'mig28: added screening_attempts.max_score';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'screening_attempts' AND column_name = 'passed'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.screening_attempts ADD COLUMN passed BOOLEAN;
    UPDATE public.screening_attempts SET passed = COALESCE(score >= 60, false) WHERE passed IS NULL;
    ALTER TABLE public.screening_attempts
      ALTER COLUMN passed SET NOT NULL,
      ALTER COLUMN passed SET DEFAULT false;
    RAISE NOTICE 'mig28: added screening_attempts.passed and backfilled (score >= 60)';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'screening_attempts' AND column_name = 'evidence'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.screening_attempts ADD COLUMN evidence JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'mig28: added screening_attempts.evidence';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'screening_attempts' AND column_name = 'reviewed_by'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.screening_attempts
      ADD COLUMN reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'mig28: added screening_attempts.reviewed_by';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'screening_attempts' AND column_name = 'reviewed_at'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.screening_attempts ADD COLUMN reviewed_at TIMESTAMPTZ;
    RAISE NOTICE 'mig28: added screening_attempts.reviewed_at';
  END IF;

  -- SkillsAssessment inserts criteria_id = NULL for standalone assessments;
  -- relax NOT NULL when present so those saves stop failing.
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'screening_attempts'
       AND column_name = 'criteria_id' AND is_nullable = 'NO'
  ) INTO v_col;
  IF v_col THEN
    ALTER TABLE public.screening_attempts ALTER COLUMN criteria_id DROP NOT NULL;
    RAISE NOTICE 'mig28: relaxed screening_attempts.criteria_id NOT NULL';
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 6. professional_capacities (live has only id/professional_id/updated_at)
  -- ══════════════════════════════════════════════════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'professional_capacities' AND column_name = 'user_id'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.professional_capacities ADD COLUMN user_id UUID;
    UPDATE public.professional_capacities SET user_id = professional_id WHERE user_id IS NULL;

    SELECT count(*) INTO v_cnt FROM public.professional_capacities WHERE user_id IS NULL;
    IF v_cnt = 0 THEN
      ALTER TABLE public.professional_capacities ALTER COLUMN user_id SET NOT NULL;
      SELECT count(*) INTO v_cnt
        FROM public.professional_capacities pc
       WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = pc.user_id);
      IF v_cnt = 0 THEN
        ALTER TABLE public.professional_capacities
          ADD CONSTRAINT professional_capacities_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'mig28: added professional_capacities.user_id (NOT NULL + FK)';
      ELSE
        RAISE NOTICE 'mig28: added professional_capacities.user_id (NOT NULL); FK skipped — % orphaned rows', v_cnt;
      END IF;
    ELSE
      RAISE NOTICE 'mig28: added professional_capacities.user_id; NOT NULL skipped — % NULL rows', v_cnt;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'professional_capacities' AND column_name = 'period_start'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.professional_capacities ADD COLUMN period_start DATE;
    ALTER TABLE public.professional_capacities ADD COLUMN period_end DATE;
    UPDATE public.professional_capacities
       SET period_start = date_trunc('month', COALESCE(created_at, now()))::date,
           period_end   = (date_trunc('month', COALESCE(created_at, now())) + interval '1 month - 1 day')::date
     WHERE period_start IS NULL;
    RAISE NOTICE 'mig28: added professional_capacities.period_start/period_end and backfilled from created_at month';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'professional_capacities' AND column_name = 'max_capacity'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.professional_capacities ADD COLUMN max_capacity INTEGER NOT NULL DEFAULT 5;
    ALTER TABLE public.professional_capacities ADD COLUMN used INTEGER NOT NULL DEFAULT 0;
    UPDATE public.professional_capacities pc
       SET max_capacity = COALESCE(pp.referral_capacity, 5),
           used         = COALESCE(pp.referrals_used, 0)
      FROM public.profiles_professional pp
     WHERE pp.user_id = pc.user_id;
    RAISE NOTICE 'mig28: added professional_capacities.max_capacity/used and seeded from profiles_professional';
  END IF;

  -- One capacity row per user per month (v2 uniqueness). Skip when duplicates
  -- would make the index build fail.
  SELECT count(*) INTO v_cnt FROM (
    SELECT user_id, period_start
      FROM public.professional_capacities
     WHERE user_id IS NOT NULL AND period_start IS NOT NULL
     GROUP BY user_id, period_start
    HAVING count(*) > 1
  ) d;
  IF v_cnt = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_professional_capacities_user_period
      ON public.professional_capacities (user_id, period_start);
    RAISE NOTICE 'mig28: ensured unique (user_id, period_start) on professional_capacities';
  ELSE
    RAISE NOTICE 'mig28: unique (user_id, period_start) SKIPPED — % duplicate user/period groups', v_cnt;
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 7. notification_preferences
  -- ══════════════════════════════════════════════════════════════════════
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public' AND t.typname = 'notification_channel'
  ) THEN
    CREATE TYPE public.notification_channel AS ENUM ('in_app', 'email', 'push');
    RAISE NOTICE 'mig28: created type notification_channel';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'type'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.notification_preferences ADD COLUMN id UUID DEFAULT gen_random_uuid();
    ALTER TABLE public.notification_preferences ADD COLUMN type TEXT;
    ALTER TABLE public.notification_preferences ADD COLUMN channel public.notification_channel;
    ALTER TABLE public.notification_preferences ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT true;

    -- gen_random_uuid() is IMMUTABLE, so ADD COLUMN stored ONE missing value:
    -- every pre-existing row shares it (and any NULL would kill SET NOT NULL)
    IF (SELECT count(DISTINCT id) FROM public.notification_preferences)
         < (SELECT count(*) FROM public.notification_preferences) THEN
      UPDATE public.notification_preferences SET id = gen_random_uuid();
      RAISE NOTICE 'mig28: regenerated shared notification_preferences.id values';
    END IF;

    -- legacy PK is the one-row-per-user (user_id) shape; move it to id so the
    -- typed seed rows below can coexist. Shape-guarded: drop only a PK that is
    -- exactly (user_id), add only when no PK remains — a PK elsewhere skips
    -- with a NOTICE instead of aborting the transaction.
    SELECT c.conname INTO v_pname
      FROM pg_constraint c
      JOIN pg_class rel ON rel.oid = c.conrelid
      JOIN pg_namespace ns ON ns.oid = rel.relnamespace
     WHERE ns.nspname = 'public'
       AND rel.relname = 'notification_preferences'
       AND c.contype = 'p'
       AND array_length(c.conkey, 1) = 1
       AND c.conkey[1] = (SELECT a.attnum FROM pg_attribute a
                           WHERE a.attrelid = rel.oid AND a.attname = 'user_id');

    IF v_pname IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.notification_preferences DROP CONSTRAINT %I', v_pname);
      RAISE NOTICE 'mig28: dropped legacy notification_preferences primary key (%) on user_id', v_pname;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
        JOIN pg_class rel ON rel.oid = c.conrelid
        JOIN pg_namespace ns ON ns.oid = rel.relnamespace
       WHERE ns.nspname = 'public'
         AND rel.relname = 'notification_preferences'
         AND c.contype = 'p'
    ) THEN
      ALTER TABLE public.notification_preferences ALTER COLUMN id SET NOT NULL;
      ALTER TABLE public.notification_preferences
        ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);
      RAISE NOTICE 'mig28: notification_preferences primary key now on id';
    END IF;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_preferences_user_type_channel
      ON public.notification_preferences (user_id, type, channel);

    -- Seed typed rows from the legacy boolean columns, reading ONLY the legacy
    -- rows (type IS NULL) so no seed can re-read an earlier seed's output.
    -- Idempotent: ON CONFLICT DO NOTHING.
    INSERT INTO public.notification_preferences (user_id, type, channel, enabled)
    SELECT user_id, 'referral_update', 'in_app', referral_updates
      FROM public.notification_preferences
     WHERE referral_updates IS NOT NULL AND type IS NULL
    ON CONFLICT (user_id, type, channel) DO NOTHING;

    INSERT INTO public.notification_preferences (user_id, type, channel, enabled)
    SELECT user_id, 'message', 'in_app', new_messages
      FROM public.notification_preferences
     WHERE new_messages IS NOT NULL AND type IS NULL
    ON CONFLICT (user_id, type, channel) DO NOTHING;

    INSERT INTO public.notification_preferences (user_id, type, channel, enabled)
    SELECT user_id, 'profile_view', 'in_app', profile_views
      FROM public.notification_preferences
     WHERE profile_views IS NOT NULL AND type IS NULL
    ON CONFLICT (user_id, type, channel) DO NOTHING;

    INSERT INTO public.notification_preferences (user_id, type, channel, enabled)
    SELECT user_id, 'product_announcement', 'email', marketing
      FROM public.notification_preferences
     WHERE marketing IS NOT NULL AND type IS NULL
    ON CONFLICT (user_id, type, channel) DO NOTHING;

    RAISE NOTICE 'mig28: moved notification_preferences PK to id, added id/type/channel/enabled + unique index, seeded typed rows from legacy booleans';
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 8. error_logs
  -- ══════════════════════════════════════════════════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'error_logs' AND column_name = 'page'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.error_logs ADD COLUMN page TEXT;
    ALTER TABLE public.error_logs ADD COLUMN stack TEXT;
    ALTER TABLE public.error_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'mig28: added error_logs.page/stack/metadata';
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 9. profiles_job_seeker.bio
  -- ══════════════════════════════════════════════════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'profiles_job_seeker' AND column_name = 'bio'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.profiles_job_seeker ADD COLUMN bio TEXT;
    RAISE NOTICE 'mig28: added profiles_job_seeker.bio';
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 10. matches (storeMatches upserts the score breakdown + source)
  -- ══════════════════════════════════════════════════════════════════════
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public' AND t.typname = 'match_source'
  ) THEN
    CREATE TYPE public.match_source AS ENUM ('algorithm', 'manual', 'self_request');
    RAISE NOTICE 'mig28: created type match_source';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'matches' AND column_name = 'match_score'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.matches ADD COLUMN match_score NUMERIC(5,2);
    UPDATE public.matches SET match_score = COALESCE(score, 0) WHERE match_score IS NULL;
    ALTER TABLE public.matches
      ALTER COLUMN match_score SET NOT NULL,
      ALTER COLUMN match_score SET DEFAULT 0;
    RAISE NOTICE 'mig28: added matches.match_score and backfilled from score';
  END IF;

  -- every remaining column is guarded on its own: live already has `source`
  -- (run #2 hit 42701 there), so a pre-existing column must skip instead of
  -- aborting the whole transaction.
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'matches' AND column_name = 'skills_score'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.matches ADD COLUMN skills_score NUMERIC(5,2) DEFAULT 0;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'matches' AND column_name = 'role_score'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.matches ADD COLUMN role_score NUMERIC(5,2) DEFAULT 0;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'matches' AND column_name = 'company_score'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.matches ADD COLUMN company_score NUMERIC(5,2) DEFAULT 0;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'matches' AND column_name = 'location_score'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.matches ADD COLUMN location_score NUMERIC(5,2) DEFAULT 0;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'matches' AND column_name = 'reputation_score'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.matches ADD COLUMN reputation_score NUMERIC(5,2) DEFAULT 0;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'matches' AND column_name = 'source'
  ) INTO v_col;
  IF NOT v_col THEN
    ALTER TABLE public.matches
      ADD COLUMN source public.match_source NOT NULL DEFAULT 'algorithm';
    RAISE NOTICE 'mig28: added matches.source';
  ELSE
    RAISE NOTICE 'mig28: matches.source already exists — kept as-is (Verification 6 shows its type)';
  END IF;

  SELECT count(*) INTO v_cnt FROM (
    SELECT job_id, candidate_id
      FROM public.matches
     WHERE job_id IS NOT NULL AND candidate_id IS NOT NULL
     GROUP BY job_id, candidate_id
    HAVING count(*) > 1
  ) d;
  IF v_cnt = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_matches_job_candidate
      ON public.matches (job_id, candidate_id);
    RAISE NOTICE 'mig28: ensured unique (job_id, candidate_id) on matches';
  ELSE
    RAISE NOTICE 'mig28: unique (job_id, candidate_id) SKIPPED — % duplicate job/candidate pairs', v_cnt;
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 11. profile_history (ProfessionalProfile version snapshots)
  -- ══════════════════════════════════════════════════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'profile_history'
  ) INTO v_col;
  IF NOT v_col THEN
    CREATE TABLE public.profile_history (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      snapshot   JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_profile_history_user
      ON public.profile_history (user_id, created_at DESC);

    ALTER TABLE public.profile_history ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "profile_history_select_own" ON public.profile_history;
    CREATE POLICY "profile_history_select_own"
      ON public.profile_history FOR SELECT TO authenticated
      USING (user_id = (SELECT auth.uid()));

    DROP POLICY IF EXISTS "profile_history_insert_own" ON public.profile_history;
    CREATE POLICY "profile_history_insert_own"
      ON public.profile_history FOR INSERT TO authenticated
      WITH CHECK (user_id = (SELECT auth.uid()));

    DROP POLICY IF EXISTS "profile_history_update_own" ON public.profile_history;
    CREATE POLICY "profile_history_update_own"
      ON public.profile_history FOR UPDATE TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));

    DROP POLICY IF EXISTS "profile_history_delete_own" ON public.profile_history;
    CREATE POLICY "profile_history_delete_own"
      ON public.profile_history FOR DELETE TO authenticated
      USING (user_id = (SELECT auth.uid()));

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_history TO authenticated;

    RAISE NOTICE 'mig28: created profile_history with RLS and 4 policies';
  ELSE
    RAISE NOTICE 'mig28: profile_history already exists';
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 12. trust_score_adjustments (behavior-score audit log)
  --     INSERT is intentionally open to authenticated users: referral flow
  --     participants log adjustments against other users' scores.
  -- ══════════════════════════════════════════════════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'trust_score_adjustments'
  ) INTO v_col;
  IF NOT v_col THEN
    CREATE TABLE public.trust_score_adjustments (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      adjustment NUMERIC(5,2) NOT NULL DEFAULT 0,
      reason     TEXT,
      category   TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_trust_score_adjustments_user
      ON public.trust_score_adjustments (user_id, created_at DESC);

    ALTER TABLE public.trust_score_adjustments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "tsa_select_own" ON public.trust_score_adjustments;
    CREATE POLICY "tsa_select_own"
      ON public.trust_score_adjustments FOR SELECT TO authenticated
      USING (user_id = (SELECT auth.uid()));

    DROP POLICY IF EXISTS "tsa_insert_auth" ON public.trust_score_adjustments;
    CREATE POLICY "tsa_insert_auth"
      ON public.trust_score_adjustments FOR INSERT TO authenticated
      WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.trust_score_adjustments TO authenticated;

    RAISE NOTICE 'mig28: created trust_score_adjustments with RLS and 2 policies';
  ELSE
    RAISE NOTICE 'mig28: trust_score_adjustments already exists';
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 13. users anon access — intentionally NOT done here (deferred decision:
  --     no anon grant in any form; email/mobile must never be anon-readable)
  -- ══════════════════════════════════════════════════════════════════════

  -- Refresh PostgREST schema cache
  -- ══════════════════════════════════════════════════════════════════════
  NOTIFY pgrst, 'reload schema';
  RAISE NOTICE 'mig28: notified pgrst to reload schema';
END $mig28$;

-- Verification 1: jobs columns
-- (expect status, track, requirements, expires_at, applicant_count,
--  referral_count, created_at, closed_at rows all present)
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'jobs'
   AND column_name IN ('status', 'track', 'requirements', 'expires_at',
                       'applicant_count', 'referral_count', 'created_at', 'closed_at')
 ORDER BY column_name;

-- Verification 2: applications + announcements + error_logs columns
SELECT table_name, column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND ((table_name = 'applications' AND column_name IN ('resume_url', 'notes', 'created_at', 'deleted_at'))
     OR (table_name = 'announcements' AND column_name IN ('content', 'is_active'))
     OR (table_name = 'error_logs' AND column_name IN ('page', 'stack', 'metadata'))
     OR (table_name = 'profiles_job_seeker' AND column_name = 'bio'))
 ORDER BY table_name, column_name;

-- Verification 3: screening objects
-- (expect name/description/category/track/version on screening_criteria;
--  max_score/passed/evidence/reviewed_by/reviewed_at on screening_attempts;
--  criteria_id nullable)
SELECT table_name, column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND ((table_name = 'screening_criteria' AND column_name IN ('name', 'description', 'category', 'track', 'version'))
     OR (table_name = 'screening_attempts' AND column_name IN ('max_score', 'passed', 'evidence', 'reviewed_by', 'reviewed_at', 'criteria_id')))
 ORDER BY table_name, column_name;

-- Verification 4: capacity + notification preference objects
-- (expect user_id/period_start/period_end/max_capacity/used on capacities;
--  id/type/channel/enabled on preferences)
SELECT table_name, column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND ((table_name = 'professional_capacities' AND column_name IN ('user_id', 'period_start', 'period_end', 'max_capacity', 'used'))
     OR (table_name = 'notification_preferences' AND column_name IN ('id', 'type', 'channel', 'enabled')))
 ORDER BY table_name, column_name;

-- Verification 5: unique indexes the client's upserts depend on + the moved
-- notification_preferences primary key
-- (expect uq_notification_preferences_user_type_channel,
--  notification_preferences_pkey on id, uq_matches_job_candidate;
--  professional_capacities index appears unless duplicates skipped it)
SELECT indexname, indexdef
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND indexname IN ('uq_notification_preferences_user_type_channel',
                     'notification_preferences_pkey',
                     'uq_matches_job_candidate',
                     'uq_professional_capacities_user_period')
 ORDER BY indexname;

-- Verification 6: matches score columns
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'matches'
   AND column_name IN ('match_score', 'skills_score', 'role_score', 'company_score',
                       'location_score', 'reputation_score', 'source')
 ORDER BY column_name;

-- Verification 7: new tables (expect two rows, rls_enabled=true, 4 and 2 policies)
SELECT t.table_name,
       (SELECT relrowsecurity FROM pg_class c WHERE c.oid = ('public.' || t.table_name)::regclass) AS rls_enabled,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.table_name) AS policy_count
  FROM information_schema.tables t
 WHERE t.table_schema = 'public'
   AND t.table_name IN ('profile_history', 'trust_score_adjustments')
 ORDER BY t.table_name;

-- Verification 8: anon access on users must NOT exist yet (expect zero rows —
-- anon users grants are deferred to a later phase)
SELECT policyname, roles, cmd
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'users' AND roles = '{anon}';

SELECT count(*) AS anon_users_column_grants
  FROM information_schema.column_privileges
 WHERE table_schema = 'public' AND table_name = 'users'
   AND grantee = 'anon' AND privilege_type = 'SELECT';
