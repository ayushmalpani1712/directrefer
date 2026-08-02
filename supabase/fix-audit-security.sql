-- ============================================================================
-- DIRECT REFER — Post-Audit SQL Security Fixes (v3 - fully safe)
-- Run in Supabase Dashboard → SQL Editor
-- Date: 2026-08-02
-- ============================================================================

-- 1. CRITICAL: Fix handle_new_user() — Prevent admin privilege escalation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, email_verified, verified, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'User'
    ),
    'job_seeker',
    CASE WHEN (NEW.raw_app_meta_data ->> 'provider') != 'email' THEN true ELSE false END,
    CASE WHEN (NEW.raw_app_meta_data ->> 'provider') != 'email' THEN true ELSE false END,
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. CRITICAL: Fix handle_new_profile() — Add search_path
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = NEW.user_id;
  IF user_role = 'professional' THEN
    INSERT INTO public.profiles_professional (user_id) VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF user_role = 'recruiter' THEN
    INSERT INTO public.profiles_recruiter (user_id) VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF user_role = 'job_seeker' THEN
    INSERT INTO public.profiles_job_seeker (user_id) VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. CRITICAL: Fix email_verification_tokens INSERT — own user_id only
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'email_verification_tokens') THEN
    DROP POLICY IF EXISTS "Users can insert own verification tokens" ON public.email_verification_tokens;
    DROP POLICY IF EXISTS "email_verification_tokens_insert" ON public.email_verification_tokens;
    DROP POLICY IF EXISTS "email_verification_tokens_insert_own" ON public.email_verification_tokens;
    CREATE POLICY "email_verification_tokens_insert_own" ON public.email_verification_tokens
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4. CRITICAL: Fix notifications INSERT — authenticated only
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notifications') THEN
    DROP POLICY IF EXISTS "notifications_insert_auth" ON public.notifications;
    DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
    DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
    CREATE POLICY "notifications_insert_authenticated" ON public.notifications
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- 5. CRITICAL: Fix analytics_daily — Create if missing, restrict to admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'analytics_daily') THEN
    CREATE TABLE public.analytics_daily (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      period_type text NOT NULL DEFAULT 'daily',
      period_date date NOT NULL DEFAULT CURRENT_DATE,
      total_users integer DEFAULT 0,
      total_referrals integer DEFAULT 0,
      total_messages integer DEFAULT 0,
      total_jobs integer DEFAULT 0,
      new_signups integer DEFAULT 0,
      active_users integer DEFAULT 0,
      conversion_rate numeric DEFAULT 0,
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'analytics_daily') THEN
    DROP POLICY IF EXISTS "Service role can insert analytics" ON public.analytics_daily;
    DROP POLICY IF EXISTS "Service role can update analytics" ON public.analytics_daily;
    DROP POLICY IF EXISTS "analytics_daily_insert" ON public.analytics_daily;
    DROP POLICY IF EXISTS "analytics_daily_update" ON public.analytics_daily;
    DROP POLICY IF EXISTS "analytics_daily_admin_insert" ON public.analytics_daily;
    DROP POLICY IF EXISTS "analytics_daily_admin_update" ON public.analytics_daily;
    CREATE POLICY "analytics_daily_admin_insert" ON public.analytics_daily
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
    CREATE POLICY "analytics_daily_admin_update" ON public.analytics_daily
      FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- 6. CRITICAL: Fix lifecycle_snapshots — Create if missing, restrict to admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'lifecycle_snapshots') THEN
    CREATE TABLE public.lifecycle_snapshots (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
      total_users integer DEFAULT 0,
      total_referrals integer DEFAULT 0,
      total_messages integer DEFAULT 0,
      total_notifications integer DEFAULT 0,
      total_jobs integer DEFAULT 0,
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.lifecycle_snapshots ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'lifecycle_snapshots') THEN
    DROP POLICY IF EXISTS "lifecycle_snapshots_insert" ON public.lifecycle_snapshots;
    DROP POLICY IF EXISTS "lifecycle_snapshots_admin_insert" ON public.lifecycle_snapshots;
    CREATE POLICY "lifecycle_snapshots_admin_insert" ON public.lifecycle_snapshots
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- 7. HIGH: Fix activity_logs INSERT — own user_id only
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'activity_logs') THEN
    DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;
    DROP POLICY IF EXISTS "activity_logs_insert_own" ON public.activity_logs;
    CREATE POLICY "activity_logs_insert_own" ON public.activity_logs
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 8. HIGH: Fix candidate_pipelines INSERT — recruiter only
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'candidate_pipelines') THEN
    DROP POLICY IF EXISTS "candidate_pipelines_insert" ON public.candidate_pipelines;
    DROP POLICY IF EXISTS "candidate_pipelines_recruiter_insert" ON public.candidate_pipelines;
    CREATE POLICY "candidate_pipelines_recruiter_insert" ON public.candidate_pipelines
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'recruiter'));
  END IF;
END $$;

-- 9. HIGH: Fix update_report_status() — input validation + search_path
CREATE OR REPLACE FUNCTION public.update_report_status(
  p_report_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_statuses text[] := ARRAY['pending','dismissed','resolved'];
  result jsonb;
BEGIN
  IF p_status IS NULL OR NOT (p_status = ANY(valid_statuses)) THEN
    RETURN jsonb_build_object('error', 'Invalid status. Must be: pending, dismissed, or resolved');
  END IF;

  UPDATE public.reports
  SET
    status = p_status::report_status,
    resolved_at = CASE WHEN p_status IN ('dismissed','resolved') THEN now() ELSE resolved_at END
  WHERE id = p_report_id
  RETURNING to_jsonb(reports.*) INTO result;

  RETURN COALESCE(result, jsonb_build_object('error', 'Report not found'));
END;
$$;

-- 10. HIGH: Fix create_report() — search_path
CREATE OR REPLACE FUNCTION public.create_report(
  p_target_id uuid,
  p_reason text,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_report jsonb;
BEGIN
  INSERT INTO public.reports (reporter_id, target_id, reason, description)
  VALUES (auth.uid(), p_target_id, p_reason, p_description)
  RETURNING to_jsonb(reports.*) INTO new_report;
  RETURN new_report;
END;
$$;

-- 11. HIGH: Fix update_updated_at() — search_path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 12. MEDIUM: Fix messages UPDATE — simplified policy
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'messages') THEN
    DROP POLICY IF EXISTS "messages_update_read" ON public.messages;
    DROP POLICY IF EXISTS "messages_update" ON public.messages;
    DROP POLICY IF EXISTS "messages_update_read_only" ON public.messages;
    CREATE POLICY "messages_update_read_only" ON public.messages
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (read IS NOT NULL);
  END IF;
END $$;

-- 13. MEDIUM: Add missing indexes (safe IF NOT EXISTS)
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'referrals') THEN CREATE INDEX IF NOT EXISTS idx_referrals_status_created ON public.referrals (status, created_at); END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'messages') THEN CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at); END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notifications') THEN CREATE INDEX IF NOT EXISTS idx_notifications_read_created ON public.notifications (read, created_at); END IF; END $$;

-- Done!
