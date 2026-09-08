-- ============================================================================
-- DirectRefer V2.0 — V1 → V2 Migration Script
-- ============================================================================
-- Treatment: REBUILD — runs against V1 Supabase database
-- Prerequisites: V1 database dump loaded, schema.sql already applied
-- Estimated runtime: < 5 minutes on 10k rows
-- ============================================================================

-- ── 0. Pre-flight checks ───────────────────────────────────────────────────
DO $$
DECLARE
  v_user_count INTEGER;
  v_referral_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM users;
  SELECT COUNT(*) INTO v_referral_count FROM referrals;
  RAISE NOTICE 'V1 users: %', v_user_count;
  RAISE NOTICE 'V1 referrals: %', v_referral_count;
  IF v_user_count = 0 THEN
    RAISE EXCEPTION 'No users found. Are you running against the V1 database?';
  END IF;
END $$;

-- ── 1. Add V2 columns to existing tables ───────────────────────────────────

-- 1a. users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS data_retention_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill GDPR consent for existing users (implicit consent on signup)
UPDATE users SET
  terms_accepted_at = COALESCE(terms_accepted_at, created_at),
  privacy_accepted_at = COALESCE(privacy_accepted_at, created_at),
  updated_at = COALESCE(updated_at, now())
WHERE terms_accepted_at IS NULL OR privacy_accepted_at IS NULL;

-- 1b. profiles_professional
ALTER TABLE profiles_professional ADD COLUMN IF NOT EXISTS capacity_reset_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE profiles_professional ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0;
ALTER TABLE profiles_professional ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE profiles_professional ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Compute profile_completeness
UPDATE profiles_professional SET profile_completeness = (
  CASE WHEN bio IS NOT NULL AND length(bio) > 10 THEN 20 ELSE 0 END +
  CASE WHEN skills IS NOT NULL AND array_length(skills, 1) > 0 THEN 20 ELSE 0 END +
  CASE WHEN company_name IS NOT NULL THEN 15 ELSE 0 END +
  CASE WHEN job_title IS NOT NULL THEN 15 ELSE 0 END +
  CASE WHEN years_experience IS NOT NULL THEN 10 ELSE 0 END +
  CASE WHEN github_url IS NOT NULL THEN 10 ELSE 0 END +
  CASE WHEN work_email IS NOT NULL THEN 10 ELSE 0 END
);

-- 1c. profiles_job_seeker
ALTER TABLE profiles_job_seeker ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles_job_seeker ADD COLUMN IF NOT EXISTS resume_text TEXT;
ALTER TABLE profiles_job_seeker ADD COLUMN IF NOT EXISTS preferred_track TEXT DEFAULT 'early_career';
ALTER TABLE profiles_job_seeker ADD COLUMN IF NOT EXISTS screening_status TEXT DEFAULT 'not_started';
ALTER TABLE profiles_job_seeker ADD COLUMN IF NOT EXISTS screening_score NUMERIC(5,2) DEFAULT 0;
ALTER TABLE profiles_job_seeker ADD COLUMN IF NOT EXISTS quality_tier TEXT DEFAULT 'unscreened';
ALTER TABLE profiles_job_seeker ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0;
ALTER TABLE profiles_job_seeker ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE profiles_job_seeker ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Compute preferred_track from experience_years
UPDATE profiles_job_seeker SET preferred_track = CASE
  WHEN experience_years IS NULL OR experience_years < 1 THEN 'internship'
  WHEN experience_years <= 3 THEN 'early_career'
  WHEN experience_years <= 10 THEN 'experienced'
  ELSE 'leadership'
END;

-- Compute profile_completeness
UPDATE profiles_job_seeker SET profile_completeness = (
  CASE WHEN headline IS NOT NULL AND length(headline) > 5 THEN 15 ELSE 0 END +
  CASE WHEN skills IS NOT NULL AND array_length(skills, 1) > 0 THEN 20 ELSE 0 END +
  CASE WHEN experience IS NOT NULL AND experience != '[]' THEN 20 ELSE 0 END +
  CASE WHEN education IS NOT NULL AND education != '[]' THEN 15 ELSE 0 END +
  CASE WHEN resume_url IS NOT NULL THEN 15 ELSE 0 END +
  CASE WHEN github_url IS NOT NULL OR portfolio_url IS NOT NULL THEN 10 ELSE 0 END +
  CASE WHEN qualification IS NOT NULL THEN 5 ELSE 0 END
);

-- 1d. profiles_recruiter
ALTER TABLE profiles_recruiter ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE profiles_recruiter ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE profiles_recruiter ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 1e. referrals
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS match_id UUID;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Backfill referral timestamps from status
UPDATE referrals SET accepted_at = updated_at WHERE status IN ('accepted', 'referral_submitted', 'application_submitted', 'closed') AND accepted_at IS NULL;
UPDATE referrals SET submitted_at = updated_at WHERE status IN ('referral_submitted', 'application_submitted', 'closed') AND submitted_at IS NULL;
UPDATE referrals SET closed_at = updated_at WHERE status = 'closed' AND closed_at IS NULL;

-- 1f. jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS track TEXT DEFAULT 'early_career';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS requirements TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill closed_at
UPDATE jobs SET closed_at = now() WHERE status = 'closed' AND closed_at IS NULL;

-- 1g. conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

-- Backfill from latest message
UPDATE conversations c SET last_message_at = (
  SELECT MAX(created_at) FROM messages m WHERE m.conversation_id = c.id
);

-- 1h. messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
UPDATE messages SET read_at = now() WHERE is_read = true AND read_at IS NULL;

-- 1i. notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'in_app';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
UPDATE notifications SET read_at = now() WHERE read = true AND read_at IS NULL;

-- 1j. bookmarks
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 1k. reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 1l. profile_drafts
ALTER TABLE profile_drafts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ── 2. Create V2 tables ────────────────────────────────────────────────────

-- 2a. skills master
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'general',
  slug TEXT NOT NULL UNIQUE,
  popularity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  alias TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2b. profile_skills join table
CREATE TABLE IF NOT EXISTS profile_skills (
  profile_type TEXT NOT NULL,
  profile_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency TEXT,
  years_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_type, profile_id, skill_id)
);

-- 2c. companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  website TEXT,
  size TEXT,
  industry TEXT,
  headquarters TEXT,
  logo_url TEXT,
  benefits TEXT[],
  office_locations TEXT[],
  open_positions INTEGER NOT NULL DEFAULT 0,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2d. trust_scores
CREATE TABLE IF NOT EXISTS trust_scores (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'unverified',
  response_reliability NUMERIC(5,2) DEFAULT 0,
  acceptance_rate NUMERIC(5,2) DEFAULT 0,
  referral_quality NUMERIC(5,2) DEFAULT 0,
  profile_quality NUMERIC(5,2) DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2e. identity_verifications
CREATE TABLE IF NOT EXISTS identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  work_email TEXT,
  id_card_url TEXT,
  linkedin_url TEXT,
  employer_name TEXT,
  verification_data JSONB DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2f. verification_badges
CREATE TABLE IF NOT EXISTS verification_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  verification_id UUID REFERENCES identity_verifications(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  UNIQUE (user_id, badge_type)
);

-- 2g. job_skills
CREATE TABLE IF NOT EXISTS job_skills (
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  required BOOLEAN NOT NULL DEFAULT false,
  min_proficiency TEXT,
  PRIMARY KEY (job_id, skill_id)
);

-- 2h. applications
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted',
  resume_url TEXT,
  cover_letter TEXT,
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (job_id, candidate_id)
);

-- 2i. matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES users(id) ON DELETE SET NULL,
  match_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  skills_score NUMERIC(5,2) DEFAULT 0,
  role_score NUMERIC(5,2) DEFAULT 0,
  company_score NUMERIC(5,2) DEFAULT 0,
  location_score NUMERIC(5,2) DEFAULT 0,
  reputation_score NUMERIC(5,2) DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'algorithm',
  track TEXT,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, candidate_id)
);

-- 2j. professional_capacities
CREATE TABLE IF NOT EXISTS professional_capacities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 5,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);

-- 2k. screening_criteria
CREATE TABLE IF NOT EXISTS screening_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  track TEXT,
  weight NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2l. screening_attempts
CREATE TABLE IF NOT EXISTS screening_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES screening_criteria(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  passed BOOLEAN NOT NULL DEFAULT false,
  evidence JSONB DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2m. state_history
CREATE TABLE IF NOT EXISTS state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutable rules
CREATE RULE state_history_no_update AS ON UPDATE TO state_history DO INSTEAD NOTHING;
CREATE RULE state_history_no_delete AS ON DELETE TO state_history DO INSTEAD NOTHING;

-- 2n. notification_preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, channel)
);

-- 2o. email_delivery_log
CREATE TABLE IF NOT EXISTS email_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  provider_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. Migrate skills to normalized tables ──────────────────────────────────

-- 3a. Extract all unique skills
INSERT INTO skills (name, category, slug)
SELECT DISTINCT
  lower(trim(skill_name)),
  'general',
  lower(trim(skill_name))
FROM (
  SELECT unnest(skills) AS skill_name FROM profiles_professional WHERE skills IS NOT NULL
  UNION
  SELECT unnest(skills) FROM profiles_job_seeker WHERE skills IS NOT NULL
) sub
WHERE length(trim(skill_name)) > 0
ON CONFLICT (name) DO NOTHING;

-- 3b. Populate profile_skills for professionals
INSERT INTO profile_skills (profile_type, profile_id, skill_id)
SELECT 'professional', p.user_id, s.id
FROM profiles_professional p
CROSS JOIN unnest(p.skills) AS skill_name
JOIN skills s ON s.name = lower(trim(skill_name))
ON CONFLICT DO NOTHING;

-- 3c. Populate profile_skills for job seekers
INSERT INTO profile_skills (profile_type, profile_id, skill_id)
SELECT 'job_seeker', p.user_id, s.id
FROM profiles_job_seeker p
CROSS JOIN unnest(p.skills) AS skill_name
JOIN skills s ON s.name = lower(trim(skill_name))
ON CONFLICT DO NOTHING;

-- 3d. Update skill popularity
UPDATE skills SET popularity = (
  SELECT COUNT(*) FROM profile_skills WHERE skill_id = skills.id
);

-- ── 4. Migrate companies from recruiter profiles ────────────────────────────

INSERT INTO companies (name, size, website, description, benefits, office_locations)
SELECT DISTINCT ON (company_name)
  company_name,
  company_size,
  company_website,
  company_description,
  benefits,
  office_locations
FROM profiles_recruiter
WHERE company_name IS NOT NULL AND company_name != ''
ON CONFLICT DO NOTHING;

-- Link recruiters to companies
UPDATE profiles_recruiter r
SET company_id = c.id
FROM companies c
WHERE r.company_name = c.name AND r.company_id IS NULL;

-- Link jobs to companies
UPDATE jobs j
SET company_id = c.id
FROM companies c
WHERE j.company_name = c.name AND j.company_id IS NULL;

-- Update company open_positions count
UPDATE companies c SET open_positions = (
  SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id AND j.status = 'active' AND j.deleted_at IS NULL
);

-- ── 5. Migrate verification_requests → identity_verifications ───────────────

INSERT INTO identity_verifications (id, user_id, type, status, work_email, id_card_url, reviewed_at, created_at)
SELECT
  id,
  user_id,
  request_type,
  status,
  work_email,
  id_card_url,
  reviewed_at,
  created_at
FROM verification_requests
ON CONFLICT DO NOTHING;

-- Create verification badges for approved verifications
INSERT INTO verification_badges (user_id, badge_type, verification_id, granted_at)
SELECT user_id, type || '_verified', id, reviewed_at
FROM identity_verifications
WHERE status = 'approved'
ON CONFLICT (user_id, badge_type) DO NOTHING;

-- ── 6. Backfill trust scores ────────────────────────────────────────────────

-- Grandfather verified users
INSERT INTO trust_scores (user_id, score, tier, response_reliability, acceptance_rate, referral_quality, profile_quality)
SELECT
  id,
  CASE WHEN verified THEN 85.0 ELSE 30.0 END,
  CASE WHEN verified THEN 'verified' ELSE 'unverified' END,
  0, 0, 0, 0
FROM users
WHERE role IN ('professional', 'job_seeker')
ON CONFLICT (user_id) DO NOTHING;

-- Recalculate for active professionals
UPDATE trust_scores ts SET
  response_reliability = COALESCE((
    SELECT GREATEST(25 - (p.avg_reply_hours * 2), 0)
    FROM profiles_professional p WHERE p.user_id = ts.user_id
  ), 0),
  acceptance_rate = COALESCE((
    SELECT CASE WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE status = 'accepted')::numeric / COUNT(*)::numeric) * 25
      ELSE 0 END
    FROM referrals WHERE professional_id = ts.user_id AND deleted_at IS NULL
  ), 0),
  referral_quality = COALESCE((
    SELECT p.success_rate * 0.25
    FROM profiles_professional p WHERE p.user_id = ts.user_id
  ), 0),
  profile_quality = COALESCE((
    SELECT p.profile_completeness * 0.25
    FROM profiles_professional p WHERE p.user_id = ts.user_id
  ), 0),
  score = COALESCE((
    SELECT GREATEST(25 - (p.avg_reply_hours * 2), 0)
    FROM profiles_professional p WHERE p.user_id = ts.user_id
  ), 0) + COALESCE((
    SELECT CASE WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE status = 'accepted')::numeric / COUNT(*)::numeric) * 25
      ELSE 0 END
    FROM referrals WHERE professional_id = ts.user_id AND deleted_at IS NULL
  ), 0) + COALESCE((
    SELECT p.success_rate * 0.25
    FROM profiles_professional p WHERE p.user_id = ts.user_id
  ), 0) + COALESCE((
    SELECT p.profile_completeness * 0.25
    FROM profiles_professional p WHERE p.user_id = ts.user_id
  ), 0),
  tier = CASE
    WHEN score >= 80 THEN 'verified'
    WHEN score >= 50 THEN 'provisional'
    ELSE 'unverified'
  END,
  calculated_at = now(),
  version = version + 1
WHERE EXISTS (SELECT 1 FROM profiles_professional WHERE user_id = ts.user_id AND open_for_referrals = true);

-- ── 7. Backfill professional capacities ─────────────────────────────────────

INSERT INTO professional_capacities (user_id, period_start, period_end, max_capacity, used)
SELECT
  user_id,
  date_trunc('month', CURRENT_DATE)::date,
  (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date,
  referral_capacity,
  referrals_used
FROM profiles_professional
WHERE open_for_referrals = true
ON CONFLICT (user_id, period_start) DO NOTHING;

-- ── 8. Seed notification preferences ────────────────────────────────────────

INSERT INTO notification_preferences (user_id, type, channel, enabled)
SELECT
  u.id,
  unnest(ARRAY['referral_request', 'referral_update', 'message', 'job_match', 'system']),
  unnest(ARRAY['in_app', 'in_app', 'in_app', 'in_app', 'in_app']),
  true
FROM users u
WHERE u.deleted_at IS NULL
ON CONFLICT (user_id, type, channel) DO NOTHING;

-- ── 9. Seed state_history for existing referrals ────────────────────────────

INSERT INTO state_history (entity_type, entity_id, field, old_value, new_value, changed_by, reason, created_at)
SELECT
  'referral',
  id,
  'status',
  'requested',
  status::text,
  professional_id,
  'Migration from V1',
  created_at
FROM referrals
WHERE deleted_at IS NULL;

-- ── 10. Seed default screening criteria ─────────────────────────────────────

INSERT INTO screening_criteria (name, description, category, track, weight) VALUES
('Skills Match', 'Does the candidate have the required technical skills?', 'skills', NULL, 1.0),
('Experience Level', 'Does the candidate have sufficient experience for the role?', 'experience', NULL, 0.8),
('Education', 'Does the candidate meet minimum education requirements?', 'education', NULL, 0.5),
('Portfolio Quality', 'Is the candidate portfolio/projects impressive?', 'assessment', NULL, 0.7),
('Communication', 'Can the candidate communicate effectively?', 'assessment', NULL, 0.6),
('Cultural Fit', 'Does the candidate align with company values?', 'assessment', NULL, 0.4),
('Internship readiness', 'Is the candidate ready for an internship?', 'skills', 'internship', 1.0),
('Early career readiness', 'Is the candidate ready for early career roles?', 'skills', 'early_career', 1.0);

-- ── 11. Create triggers ────────────────────────────────────────────────────

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables that need it
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'users', 'profiles_professional', 'profiles_job_seeker', 'profiles_recruiter',
    'companies', 'trust_scores', 'identity_verifications', 'notification_preferences',
    'reports', 'profile_drafts', 'professional_capacities'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Trust tier auto-computation
CREATE OR REPLACE FUNCTION compute_trust_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.score >= 80 THEN
    NEW.tier = 'verified';
  ELSIF NEW.score >= 50 THEN
    NEW.tier = 'provisional';
  ELSE
    NEW.tier = 'unverified';
  END IF;
  NEW.calculated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trust_scores_compute_tier
  BEFORE UPDATE ON trust_scores
  FOR EACH ROW EXECUTE FUNCTION compute_trust_tier();

-- Job status transition trigger
CREATE OR REPLACE FUNCTION jobs_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    NEW.posted_at = COALESCE(NEW.posted_at, now());
  ELSIF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.closed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jobs_status_transition
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION jobs_status_transition();

-- ── 12. Create indexes ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users (lower(email));
CREATE INDEX IF NOT EXISTS idx_users_slug ON users (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_professional_company ON profiles_professional (company_name);
CREATE INDEX IF NOT EXISTS idx_profiles_professional_referrals ON profiles_professional (open_for_referrals) WHERE open_for_referrals = true;
CREATE INDEX IF NOT EXISTS idx_profiles_professional_show ON profiles_professional (show_on_find) WHERE show_on_find = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_job_seeker_open ON profiles_job_seeker (is_open_to_work) WHERE is_open_to_work = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profile_skills_profile ON profile_skills (profile_type, profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_skills_skill ON profile_skills (skill_id);

CREATE INDEX IF NOT EXISTS idx_jobs_recruiter ON jobs (recruiter_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs (company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_track ON jobs (track) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_posted ON jobs (posted_at DESC) WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_skills_job ON job_skills (job_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill ON job_skills (skill_id);

CREATE INDEX IF NOT EXISTS idx_applications_job ON applications (job_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications (candidate_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_matches_job ON matches (job_id);
CREATE INDEX IF NOT EXISTS idx_matches_candidate ON matches (candidate_id);
CREATE INDEX IF NOT EXISTS idx_matches_professional ON matches (professional_id) WHERE professional_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_score ON matches (match_score DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_requester ON referrals (requester_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_professional ON referrals (professional_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals (status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_capacities_user_period ON professional_capacities (user_id, period_start);

CREATE INDEX IF NOT EXISTS idx_screening_attempts_candidate ON screening_attempts (candidate_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications (user_id, type, read);

CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations (user_a_id, user_b_id);

CREATE INDEX IF NOT EXISTS idx_state_history_entity ON state_history (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks (user_id, entity_type);

-- ── 13. Enable RLS ─────────────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_professional ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_job_seeker ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_recruiter ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_capacities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (see schema.sql for full definitions)
-- Minimal policies to get V2 working:

CREATE POLICY "Users visible to authenticated" ON users
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Users insert own" ON users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own" ON users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Professional profiles visible" ON profiles_professional
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Professional profiles insert own" ON profiles_professional
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Professional profiles update own" ON profiles_professional
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Job seeker profiles visible" ON profiles_job_seeker
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Job seeker profiles insert own" ON profiles_job_seeker
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Job seeker profiles update own" ON profiles_job_seeker
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Recruiter profiles visible" ON profiles_recruiter
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Recruiter profiles insert own" ON profiles_recruiter
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Recruiter profiles update own" ON profiles_recruiter
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Jobs visible" ON jobs
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "Referrals visible" ON referrals
  FOR SELECT TO authenticated USING (
    requester_id = auth.uid() OR professional_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Notifications visible" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Conversations visible" ON conversations
  FOR SELECT TO authenticated USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

CREATE POLICY "Messages visible" ON messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND (user_a_id = auth.uid() OR user_b_id = auth.uid()))
  );

CREATE POLICY "Trust scores visible" ON trust_scores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Badges visible" ON verification_badges
  FOR SELECT TO authenticated USING (revoked_at IS NULL);

CREATE POLICY "Profile skills visible" ON profile_skills
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "State history visible" ON state_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Screening criteria visible" ON screening_criteria
  FOR SELECT TO authenticated USING (is_active = true);

-- ── 14. Validation ─────────────────────────────────────────────────────────

DO $$
DECLARE
  v_users INTEGER;
  v_pro INTEGER;
  v_js INTEGER;
  v_ref INTEGER;
  v_jobs INTEGER;
  v_skills INTEGER;
  v_trust INTEGER;
  v_companies INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_users FROM users WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_pro FROM profiles_professional WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_js FROM profiles_job_seeker WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_ref FROM referrals WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_jobs FROM jobs WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_skills FROM skills;
  SELECT COUNT(*) INTO v_trust FROM trust_scores;
  SELECT COUNT(*) INTO v_companies FROM companies;

  RAISE NOTICE '=== Migration Validation ===';
  RAISE NOTICE 'Users: %', v_users;
  RAISE NOTICE 'Professional profiles: %', v_pro;
  RAISE NOTICE 'Job seeker profiles: %', v_js;
  RAISE NOTICE 'Referrals: %', v_ref;
  RAISE NOTICE 'Jobs: %', v_jobs;
  RAISE NOTICE 'Skills (normalized): %', v_skills;
  RAISE NOTICE 'Trust scores: %', v_trust;
  RAISE NOTICE 'Companies: %', v_companies;
  RAISE NOTICE '=== Migration Complete ===';
END $$;
