-- ============================================================================
-- DirectRefer V2.0 — Index Optimization
-- ============================================================================
-- Composite + partial indexes for high-traffic query patterns.
-- Applied AFTER schema.sql and rls-policies.sql.
-- ============================================================================

-- ── Users ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_lookup ON users(email) WHERE deleted_at IS NULL;

-- ── Professional Profiles ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pro_open ON profiles_professional(open_for_referrals) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pro_company ON profiles_professional(company) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pro_location ON profiles_professional USING gin(to_tsvector('english', coalesce(location, ''))) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pro_completeness ON profiles_professional(profile_completeness DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pro_trust ON profiles_professional(trust_score DESC) WHERE deleted_at IS NULL;

-- ── Job Seeker Profiles ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_js_open ON profiles_job_seeker(open_to_work) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_js_location ON profiles_job_seeker USING gin(to_tsvector('english', coalesce(location, ''))) WHERE deleted_at IS NULL;

-- ── Jobs ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter ON jobs(recruiter_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_posted ON jobs(posted_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs USING gin(to_tsvector('english', coalesce(location, ''))) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_salary ON jobs(salary_min, salary_max) WHERE deleted_at IS NULL AND salary_min IS NOT NULL;

-- ── Applications ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_apps_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_apps_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_apps_submitted ON applications(submitted_at DESC);

-- ── Matches ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_matches_candidate ON matches(candidate_id);
CREATE INDEX IF NOT EXISTS idx_matches_professional ON matches(professional_id);
CREATE INDEX IF NOT EXISTS idx_matches_job ON matches(job_id);
CREATE INDEX IF NOT EXISTS idx_matches_score ON matches(score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_composite ON matches(job_id, score DESC);

-- ── Referrals ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ref_requester ON referrals(requester_id);
CREATE INDEX IF NOT EXISTS idx_ref_professional ON referrals(professional_id);
CREATE INDEX IF NOT EXISTS idx_ref_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_ref_created ON referrals(created_at DESC);

-- ── Notifications ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notif_user_recent ON notifications(user_id, created_at DESC);

-- ── Messages ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_sender ON messages(sender_id);

-- ── Trust Scores ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trust_user ON trust_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_tier ON trust_scores(tier);
CREATE INDEX IF NOT EXISTS idx_trust_score ON trust_scores(score DESC);

-- ── State History ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sh_entity ON state_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sh_triggered ON state_history(triggered_by);
CREATE INDEX IF NOT EXISTS idx_sh_created ON state_history(created_at DESC);

-- ── Screening ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sa_candidate ON screening_attempts(candidate_id);
CREATE INDEX IF NOT EXISTS idx_sa_job ON screening_attempts(job_id);
CREATE INDEX IF NOT EXISTS idx_sa_result ON screening_attempts(result);

-- ── Bookmarks ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bm_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bm_entity ON bookmarks(entity_type, entity_id);

-- ── Reports ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);

-- ── Invites ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inv_code ON invites(code);
CREATE INDEX IF NOT EXISTS idx_inv_inviter ON invites(inviter_id);

-- ── UTM Events ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_utm_source ON utm_events(source);
CREATE INDEX IF NOT EXISTS idx_utm_created ON utm_events(created_at DESC);

-- ── Email Delivery Log ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_edl_message ON email_delivery_log(message_id);
CREATE INDEX IF NOT EXISTS idx_edl_status ON email_delivery_log(status);

-- ── NPS Responses ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_nps_created ON nps_responses(created_at DESC);

-- ── Professional Capacities ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cap_user ON professional_capacities(user_id);
CREATE INDEX IF NOT EXISTS idx_cap_remaining ON professional_capacities(remaining_capacity DESC);

-- ── Job Pipeline ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jp_job ON job_pipeline(job_id);
CREATE INDEX IF NOT EXISTS idx_jp_candidate ON job_pipeline(candidate_id);

-- ── Profile Skills (cross-reference) ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ps_skill ON profile_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_ps_composite ON profile_skills(profile_id, skill_id);

-- ── Job Skills ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_js_skill ON job_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_js_composite ON job_skills(job_id, skill_id);
