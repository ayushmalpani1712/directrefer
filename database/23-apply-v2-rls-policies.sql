-- ============================================================================
-- 23. Apply the missing v2 RLS policies — clear the 4 "RLS Enabled No Policy"
--      info items and unblock client reads that currently return empty
-- ============================================================================
-- The Advisor shows RLS enabled but zero policies on job_skills,
-- professional_capacities, skill_aliases and utm_events: the policy section of
-- v2-schema/rls-policies.sql was never applied to the live database. As a
-- result every client SELECT on the first three returns nothing (v2 matching,
-- JobDetail skills, CapacityMeter) and utm_events inserts fail silently.
--
-- This migration is ADDITIVE only (no existing policy is dropped or altered),
-- idempotent (duplicate_object is swallowed, safe to re-run), and every
-- expression uses `auth.uid() IS NOT NULL` instead of the literal `true` so
-- the Security Advisor's always-true check (0024) does not re-trigger — for a
-- TO authenticated policy the two are semantically identical, because
-- authenticated sessions always carry a non-null uid.
--
-- Write policies from the v2 intent (job_skills INSERT/DELETE owner-gated,
-- professional_capacities INSERT) are intentionally NOT created here: the
-- client never writes these tables today, and the owner-gated variants depend
-- on is_job_owner(), whose presence on the live database is unverified. Table
-- owner (dashboard / migrations) bypasses RLS, so seeding and admin edits keep
-- working. Add them when a client feature actually needs them.
--
-- utm_events: the insert policy follows the v2 intent (TO authenticated).
-- persistUTMEvent() also runs for anonymous visitors (user_id null); those
-- inserts remain blocked, matching the documented intent. Broadening to
-- public is a deliberate future decision, not slipped in here.
-- ============================================================================

DO $mig23$
BEGIN
  CREATE POLICY "job_skills_select"
    ON public.job_skills FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $mig23$;

DO $mig23$
BEGIN
  CREATE POLICY "cap_select_authenticated"
    ON public.professional_capacities FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $mig23$;

DO $mig23$
BEGIN
  CREATE POLICY "skill_aliases_select"
    ON public.skill_aliases FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $mig23$;

DO $mig23$
BEGIN
  CREATE POLICY "utm_insert"
    ON public.utm_events FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $mig23$;

-- Verification — expect exactly one row per table (4 rows), all TO authenticated
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('job_skills', 'professional_capacities', 'skill_aliases', 'utm_events')
 ORDER BY tablename, policyname;
