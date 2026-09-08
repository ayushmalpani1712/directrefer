-- ============================================================================
-- DirectRefer V2.0 — Full RLS Policy Definitions
-- ============================================================================
-- Apply AFTER schema.sql and migrate-v1-to-v2.sql
-- Business rule: Every table has RLS enabled. Policies enforce access control.
-- ============================================================================

-- ── Helper function: Check if user is admin ─────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Helper function: Check if user owns profile ─────────────────────────────
CREATE OR REPLACE FUNCTION owns_profile(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT auth.uid() = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Helper function: Check if user is conversation participant ──────────────
CREATE OR REPLACE FUNCTION is_conversation_participant(p_conv_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = p_conv_id AND (user_a_id = auth.uid() OR user_b_id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Helper function: Check if user is referral participant ──────────────────
CREATE OR REPLACE FUNCTION is_referral_participant(p_ref_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM referrals
    WHERE id = p_ref_id AND (requester_id = auth.uid() OR professional_id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Helper function: Check if user is match participant ─────────────────────
CREATE OR REPLACE FUNCTION is_match_participant(p_match_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM matches WHERE id = p_match_id
    AND (candidate_id = auth.uid() OR professional_id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Helper function: Check if user is job owner ─────────────────────────────
CREATE OR REPLACE FUNCTION is_job_owner(p_job_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM jobs WHERE id = p_job_id AND recruiter_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- DROP existing policies (idempotent)
-- ============================================================================
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'users', 'profiles_professional', 'profiles_job_seeker', 'profiles_recruiter',
    'companies', 'jobs', 'applications', 'matches', 'referrals',
    'notifications', 'conversations', 'messages', 'bookmarks',
    'trust_scores', 'identity_verifications', 'verification_badges',
    'notification_preferences', 'profile_skills', 'state_history',
    'profile_drafts', 'screening_criteria', 'screening_attempts',
    'professional_capacities', 'reports', 'admin_logs', 'skill_aliases',
    'job_skills', 'email_delivery_log', 'nps_responses', 'error_logs',
    'platform_settings', 'announcements', 'invites', 'utm_events',
    'job_pipeline'
  ])
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- USERS
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_authenticated"
  ON users FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "users_select_own"
  ON users FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_insert_own"
  ON users FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own"
  ON users FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_update_admin"
  ON users FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "users_delete_admin"
  ON users FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================================
-- PROFESSIONAL PROFILES
-- ============================================================================
ALTER TABLE profiles_professional ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pro_select_authenticated"
  ON profiles_professional FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "pro_select_own"
  ON profiles_professional FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "pro_insert_own"
  ON profiles_professional FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "pro_update_own"
  ON profiles_professional FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "pro_update_admin"
  ON profiles_professional FOR UPDATE TO authenticated
  USING (is_admin());

-- ============================================================================
-- JOB SEEKER PROFILES
-- ============================================================================
ALTER TABLE profiles_job_seeker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "js_select_authenticated"
  ON profiles_job_seeker FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "js_select_own"
  ON profiles_job_seeker FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "js_insert_own"
  ON profiles_job_seeker FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "js_update_own"
  ON profiles_job_seeker FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "js_update_admin"
  ON profiles_job_seeker FOR UPDATE TO authenticated
  USING (is_admin());

-- ============================================================================
-- RECRUITER PROFILES
-- ============================================================================
ALTER TABLE profiles_recruiter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rec_select_authenticated"
  ON profiles_recruiter FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "rec_insert_own"
  ON profiles_recruiter FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "rec_update_own"
  ON profiles_recruiter FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- COMPANIES
-- ============================================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select_authenticated"
  ON companies FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "companies_insert_admin"
  ON companies FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "companies_update_admin"
  ON companies FOR UPDATE TO authenticated
  USING (is_admin());

-- ============================================================================
-- JOBS
-- ============================================================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_select_authenticated"
  ON jobs FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "jobs_insert_recruiter"
  ON jobs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('recruiter', 'admin'))
  );

CREATE POLICY "jobs_update_owner"
  ON jobs FOR UPDATE TO authenticated
  USING (recruiter_id = auth.uid() OR is_admin());

CREATE POLICY "jobs_delete_owner"
  ON jobs FOR DELETE TO authenticated
  USING (recruiter_id = auth.uid() OR is_admin());

-- ============================================================================
-- JOB SKILLS
-- ============================================================================
ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_skills_select"
  ON job_skills FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "job_skills_insert_owner"
  ON job_skills FOR INSERT TO authenticated
  WITH CHECK (is_job_owner(job_id) OR is_admin());

CREATE POLICY "job_skills_delete_owner"
  ON job_skills FOR DELETE TO authenticated
  USING (is_job_owner(job_id) OR is_admin());

-- ============================================================================
-- APPLICATIONS
-- ============================================================================
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apps_select_candidate"
  ON applications FOR SELECT TO authenticated
  USING (candidate_id = auth.uid());

CREATE POLICY "apps_select_recruiter"
  ON applications FOR SELECT TO authenticated
  USING (is_job_owner(job_id));

CREATE POLICY "apps_select_admin"
  ON applications FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "apps_insert_own"
  ON applications FOR INSERT TO authenticated
  WITH CHECK (candidate_id = auth.uid());

CREATE POLICY "apps_update_recruiter"
  ON applications FOR UPDATE TO authenticated
  USING (is_job_owner(job_id) OR is_admin());

-- ============================================================================
-- MATCHES
-- ============================================================================
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select_candidate"
  ON matches FOR SELECT TO authenticated
  USING (candidate_id = auth.uid());

CREATE POLICY "matches_select_professional"
  ON matches FOR SELECT TO authenticated
  USING (professional_id = auth.uid());

CREATE POLICY "matches_select_recruiter"
  ON matches FOR SELECT TO authenticated
  USING (is_job_owner(job_id));

CREATE POLICY "matches_select_admin"
  ON matches FOR SELECT TO authenticated
  USING (is_admin());

-- ============================================================================
-- REFERRALS
-- ============================================================================
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ref_select_requester"
  ON referrals FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

CREATE POLICY "ref_select_professional"
  ON referrals FOR SELECT TO authenticated
  USING (professional_id = auth.uid());

CREATE POLICY "ref_select_admin"
  ON referrals FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "ref_insert_requester"
  ON referrals FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "ref_update_professional"
  ON referrals FOR UPDATE TO authenticated
  USING (professional_id = auth.uid() OR is_admin());

CREATE POLICY "ref_delete_requester_pending"
  ON referrals FOR DELETE TO authenticated
  USING (requester_id = auth.uid() AND status = 'requested');

CREATE POLICY "ref_delete_admin"
  ON referrals FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================================
-- PROFESSIONAL CAPACITIES
-- ============================================================================
ALTER TABLE professional_capacities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cap_select_authenticated"
  ON professional_capacities FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "cap_insert_system"
  ON professional_capacities FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- ============================================================================
-- TRUST SCORES
-- ============================================================================
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trust_select_authenticated"
  ON trust_scores FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "trust_select_own"
  ON trust_scores FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- IDENTITY VERIFICATIONS
-- ============================================================================
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verif_select_own"
  ON identity_verifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "verif_select_admin"
  ON identity_verifications FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "verif_insert_own"
  ON identity_verifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "verif_update_admin"
  ON identity_verifications FOR UPDATE TO authenticated
  USING (is_admin());

-- ============================================================================
-- VERIFICATION BADGES
-- ============================================================================
ALTER TABLE verification_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_select_authenticated"
  ON verification_badges FOR SELECT TO authenticated
  USING (revoked_at IS NULL);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select_own"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notif_insert_own"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notif_update_own"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- NOTIFICATION PREFERENCES
-- ============================================================================
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_pref_select_own"
  ON notification_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notif_pref_insert_own"
  ON notification_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notif_pref_update_own"
  ON notification_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_select_participant"
  ON conversations FOR SELECT TO authenticated
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- ============================================================================
-- MESSAGES
-- ============================================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg_select_participant"
  ON messages FOR SELECT TO authenticated
  USING (is_conversation_participant(conversation_id));

CREATE POLICY "msg_insert_participant"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND is_conversation_participant(conversation_id)
  );

-- ============================================================================
-- BOOKMARKS
-- ============================================================================
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bm_select_own"
  ON bookmarks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "bm_insert_own"
  ON bookmarks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "bm_delete_own"
  ON bookmarks FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- SKILLS & PROFILE SKILLS
-- ============================================================================
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skills_select"
  ON skills FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "skills_insert_admin"
  ON skills FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "ps_select"
  ON profile_skills FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "ps_insert_own"
  ON profile_skills FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() OR is_admin());

CREATE POLICY "ps_delete_own"
  ON profile_skills FOR DELETE TO authenticated
  USING (profile_id = auth.uid() OR is_admin());

CREATE POLICY "sa_select"
  ON skill_aliases FOR SELECT TO authenticated
  USING (true);

-- ============================================================================
-- STATE HISTORY (immutable)
-- ============================================================================
ALTER TABLE state_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sh_select_authenticated"
  ON state_history FOR SELECT TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies — enforced by rules in schema.sql

-- ============================================================================
-- SCREENING
-- ============================================================================
ALTER TABLE screening_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sc_select"
  ON screening_criteria FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "sc_insert_admin"
  ON screening_criteria FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "sa_select_own"
  ON screening_attempts FOR SELECT TO authenticated
  USING (candidate_id = auth.uid() OR is_admin());

-- ============================================================================
-- REPORTS
-- ============================================================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_own"
  ON reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "reports_select_admin"
  ON reports FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "reports_insert_own"
  ON reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "reports_update_admin"
  ON reports FOR UPDATE TO authenticated
  USING (is_admin());

-- ============================================================================
-- ADMIN LOGS (admin only)
-- ============================================================================
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_logs_admin_only"
  ON admin_logs FOR ALL TO authenticated
  USING (is_admin());

-- ============================================================================
-- PROFILE DRAFTS
-- ============================================================================
ALTER TABLE profile_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drafts_select_own"
  ON profile_drafts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "drafts_insert_own"
  ON profile_drafts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "drafts_update_own"
  ON profile_drafts FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "drafts_delete_own"
  ON profile_drafts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- OTHER TABLES (minimal RLS)
-- ============================================================================
ALTER TABLE email_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE utm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "edl_admin" ON email_delivery_log FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "nps_own" ON nps_responses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nps_admin" ON nps_responses FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "err_insert" ON error_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "err_admin" ON error_logs FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "ps_select" ON platform_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ps_admin" ON platform_settings FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "ann_select" ON announcements FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "ann_admin" ON announcements FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "inv_select_own" ON invites FOR SELECT TO authenticated USING (inviter_id = auth.uid());
CREATE POLICY "inv_insert_own" ON invites FOR INSERT TO authenticated WITH CHECK (inviter_id = auth.uid());
CREATE POLICY "utm_insert" ON utm_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "utm_admin" ON utm_events FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "jp_select" ON job_pipeline FOR SELECT TO authenticated USING (true);
CREATE POLICY "jp_insert_owner" ON job_pipeline FOR INSERT TO authenticated USING (is_job_owner(job_id) OR is_admin());
