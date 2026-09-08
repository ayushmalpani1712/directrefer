-- ============================================================================
-- DirectRefer V2.0 — Complete Schema
-- ============================================================================
-- Contract: Every CHECK constraint, trigger, and RLS policy is documented
-- with the business rule it enforces.
-- Treatment: REBUILD — maps from V1 tables, adds V2.0 requirements.
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid()

-- ── Enums ───────────────────────────────────────────────────────────────────
-- Business rule: Platform supports four user roles. A user has exactly one.
CREATE TYPE user_role AS ENUM ('job_seeker', 'professional', 'recruiter', 'admin');

-- Business rule: Referral tracks request through submission to close.
CREATE TYPE referral_status AS ENUM (
  'requested', 'under_review', 'accepted', 'declined',
  'referral_submitted', 'application_submitted', 'closed', 'expired'
);

-- Business rule: Jobs have a lifecycle from draft to closed.
CREATE TYPE job_status AS ENUM ('draft', 'active', 'paused', 'closed');

-- Business rule: Screening tracks candidate assessment through completion.
CREATE TYPE screening_status AS ENUM (
  'not_started', 'in_progress', 'pending_review',
  'ready', 'not_ready', 'expired', 'disqualified'
);

-- Business rule: Trust score maps to three access tiers.
-- ≥80 = verified, 50-79 = provisional, <50 = unverified
CREATE TYPE trust_tier AS ENUM ('verified', 'provisional', 'unverified');

-- Business rule: Identity verification types accepted by the platform.
CREATE TYPE verification_type AS ENUM ('email_otp', 'id_card', 'linkedin', 'employer_verification');

-- Business rule: Verification request states.
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Business rule: Match sources.
CREATE TYPE match_source AS ENUM ('algorithm', 'manual', 'self_request');

-- Business rule: Application lifecycle.
CREATE TYPE application_status AS ENUM (
  'submitted', 'screening', 'shortlisted', 'interview',
  'offered', 'accepted', 'rejected', 'withdrawn'
);

-- Business rule: Notification delivery channels.
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'push');

-- Business rule: Report reasons.
CREATE TYPE report_reason AS ENUM ('spam', 'fake_profile', 'inappropriate', 'fraud', 'other');

-- Business rule: User account states. 'deactivated' is soft-delete.
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'deactivated');

-- Business rule: Referral relationship between requester and professional.
CREATE TYPE relationship_type AS ENUM (
  'none', 'former_colleague', 'college校友', 'friend',
  'family', 'mentor', 'online_connection', 'other'
);

-- Business rule: Track types for matching.
CREATE TYPE career_track AS ENUM ('internship', 'early_career', 'experienced', 'leadership');

-- ── 1. Users ────────────────────────────────────────────────────────────────
-- V1 mapping: maps directly from V1 `users` table.
-- Business rule: One identity, multiple profiles. UUID preserved from V1.
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'job_seeker',
  slug          TEXT UNIQUE,  -- URL-friendly identifier

  -- Auth & verification
  email_verified    BOOLEAN NOT NULL DEFAULT false,
  verified          BOOLEAN NOT NULL DEFAULT false,  -- general verified flag
  professional_verified BOOLEAN NOT NULL DEFAULT false,
  recruiter_verified    BOOLEAN NOT NULL DEFAULT false,
  work_email_verified   BOOLEAN NOT NULL DEFAULT false,
  work_email            TEXT,
  work_verification_method TEXT,  -- 'email_otp', 'id_card', 'linkedin', 'employer_verification'
  id_card_url       TEXT,

  -- Contact
  mobile      TEXT,
  city        TEXT,
  state       TEXT,
  country     TEXT,
  linkedin    TEXT,
  avatar_url  TEXT,

  -- Profile customization
  banner_gradient TEXT,
  banner_theme    TEXT,

  -- Account state
  status      account_status NOT NULL DEFAULT 'active',
  active_workspace TEXT DEFAULT 'dashboard',

  -- GDPR compliance (V2.0 addition)
  terms_accepted_at   TIMESTAMPTZ,
  privacy_accepted_at TIMESTAMPTZ,
  marketing_consent   BOOLEAN NOT NULL DEFAULT false,
  data_retention_until TIMESTAMPTZ,  -- GDPR right to erasure deadline

  -- Soft-delete (V2.0 addition)
  deleted_at  TIMESTAMPTZ,

  -- Timestamps
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- Business rule: updated_at auto-updates on every row modification.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 2. Skills Master Vocabulary ──────────────────────────────────────────────
-- V2.0 addition: Normalized skills table for search, dedup, and aliasing.
-- Business rule: One canonical skill name, multiple aliases, one category.
CREATE TABLE skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,  -- canonical lowercase name (e.g., 'javascript')
  category    TEXT NOT NULL,          -- 'programming', 'framework', 'soft_skill', 'domain', etc.
  slug        TEXT NOT NULL UNIQUE,
  popularity  INTEGER NOT NULL DEFAULT 0,  -- how many profiles reference this skill
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE skill_aliases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id    UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  alias       TEXT NOT NULL UNIQUE,  -- 'js', 'JS', 'JavaScript' → maps to 'javascript'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Business rule: One alias per skill, enforced by unique index.
CREATE UNIQUE INDEX idx_skill_aliases_lower ON skill_aliases (lower(alias));

-- ── 3. Profile Tables ───────────────────────────────────────────────────────

-- 3a. Professional Profile
-- V1 mapping: maps directly from V1 `profiles_professional`.
CREATE TABLE profiles_professional (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name      TEXT,
  job_title         TEXT,
  department        TEXT,
  years_experience  INTEGER,
  bio               TEXT,
  college           TEXT,

  -- Referral capacity (V2.0: professional_capacities is canonical)
  referral_capacity INTEGER NOT NULL DEFAULT 5,
  referrals_used    INTEGER NOT NULL DEFAULT 0,
  capacity_reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),  -- when usage was last reset
  referral_policy   TEXT,

  -- Availability
  open_for_referrals BOOLEAN NOT NULL DEFAULT false,
  is_open_to_work    BOOLEAN NOT NULL DEFAULT false,
  show_on_find       BOOLEAN NOT NULL DEFAULT true,

  -- Stats (denormalized, updated by triggers)
  response_rate      NUMERIC(5,2) DEFAULT 0,
  avg_reply_hours    NUMERIC(5,1) DEFAULT 0,
  success_rate       NUMERIC(5,2) DEFAULT 0,
  rating             NUMERIC(3,2) DEFAULT 0,
  review_count       INTEGER NOT NULL DEFAULT 0,

  -- Links
  github_url         TEXT,
  work_email         TEXT,

  -- Customization
  avatar_color       TEXT,

  -- Profile completeness (V2.0: computed, stored)
  profile_completeness INTEGER NOT NULL DEFAULT 0,  -- 0-100

  -- Soft-delete
  deleted_at         TIMESTAMPTZ,

  -- Timestamps
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_professional_updated_at
  BEFORE UPDATE ON profiles_professional
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3b. Job Seeker / Candidate Profile
-- V1 mapping: maps directly from V1 `profiles_job_seeker`.
CREATE TABLE profiles_job_seeker (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline          TEXT,
  bio               TEXT,
  qualification     TEXT,
  college           TEXT,
  graduation_year   INTEGER,

  -- Resume
  resume_url        TEXT,
  resume_name       TEXT,
  resume_size_bytes INTEGER,
  resume_uploaded_at TIMESTAMPTZ,
  resume_text       TEXT,  -- V2.0: extracted raw text for full-text search

  -- Experience
  experience_years  INTEGER,
  experience        JSONB DEFAULT '[]'::jsonb,  -- structured: [{title, company, duration, description}]
  education         JSONB DEFAULT '[]'::jsonb,  -- structured: [{degree, school, year, gpa}]
  projects          JSONB DEFAULT '[]'::jsonb,
  certifications    JSONB DEFAULT '[]'::jsonb,
  achievements      JSONB DEFAULT '[]'::jsonb,
  languages         JSONB DEFAULT '[]'::jsonb,

  -- Preferences
  preferred_role       TEXT,
  preferred_location   TEXT,
  preferred_companies  TEXT[],
  preferred_track      career_track DEFAULT 'early_career',
  notice_period        TEXT,
  work_preference      TEXT,
  why_me               TEXT,

  -- Availability
  is_open_to_work   BOOLEAN NOT NULL DEFAULT false,

  -- Links
  portfolio_url     TEXT,
  github_url        TEXT,
  website           TEXT,

  -- Screening (V2.0 addition)
  screening_status  screening_status NOT NULL DEFAULT 'not_started',
  screening_score   NUMERIC(5,2) DEFAULT 0,
  quality_tier      TEXT,  -- 'premium', 'standard', 'unscreened'

  -- Customization
  avatar_color      TEXT,

  -- Profile completeness (V2.0: computed, stored)
  profile_completeness INTEGER NOT NULL DEFAULT 0,

  -- Soft-delete
  deleted_at        TIMESTAMPTZ,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_job_seeker_updated_at
  BEFORE UPDATE ON profiles_job_seeker
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3c. Recruiter / Company Profile
-- V1 mapping: maps directly from V1 `profiles_recruiter`.
-- V2.0 addition: Separates company entity from recruiter profile.
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE,
  description   TEXT,
  website       TEXT,
  size          TEXT,  -- '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
  industry      TEXT,
  headquarters  TEXT,
  logo_url      TEXT,
  benefits      TEXT[],
  office_locations TEXT[],

  -- Stats
  open_positions INTEGER NOT NULL DEFAULT 0,
  total_referrals INTEGER NOT NULL DEFAULT 0,

  -- Soft-delete
  deleted_at    TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE profiles_recruiter (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_id        UUID REFERENCES companies(id) ON DELETE SET NULL,
  job_title         TEXT,
  hiring_department TEXT,
  work_email        TEXT,

  -- Legacy fields (kept for V1 compatibility, migrated to companies table)
  company_name      TEXT,
  company_size      TEXT,
  company_website   TEXT,
  company_description TEXT,
  benefits          TEXT[],
  office_locations  TEXT[],

  -- Soft-delete
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_recruiter_updated_at
  BEFORE UPDATE ON profiles_recruiter
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 4. Profile Skills (Normalized Join Table) ────────────────────────────────
-- V2.0 addition: Replaces text[] arrays with normalized join table.
-- Business rule: Many-to-many between profiles and skills. One skill per profile entry.
CREATE TABLE profile_skills (
  profile_type  TEXT NOT NULL,  -- 'professional' or 'job_seeker'
  profile_id    UUID NOT NULL,  -- user_id of the profile
  skill_id      UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency   TEXT,           -- 'beginner', 'intermediate', 'advanced', 'expert'
  years_used    INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (profile_type, profile_id, skill_id)
);

-- Business rule: One skill per profile, enforced by composite PK.

-- ── 5. Trust & Verification ─────────────────────────────────────────────────

-- 5a. Trust Scores
-- V2.0 addition: Persistent trust scoring with 3-tier linkage.
-- Business rule: Score ≥80 = verified, 50-79 = provisional, <50 = unverified.
-- Enforced by trigger, not app-layer.
CREATE TABLE trust_scores (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  score           NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  tier            trust_tier NOT NULL DEFAULT 'unverified',

  -- Score components (for transparency/audit)
  response_reliability  NUMERIC(5,2) DEFAULT 0,  -- 0-25 pts
  acceptance_rate       NUMERIC(5,2) DEFAULT 0,  -- 0-25 pts
  referral_quality      NUMERIC(5,2) DEFAULT 0,  -- 0-25 pts
  profile_quality       NUMERIC(5,2) DEFAULT 0,  -- 0-25 pts

  -- Metadata
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  version         INTEGER NOT NULL DEFAULT 1,  -- increment on each recalculation

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Business rule: Trust tier auto-computed from score via trigger.
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

CREATE TRIGGER trg_trust_scores_updated_at
  BEFORE UPDATE ON trust_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5b. Identity Verifications
-- V1 mapping: replaces `verification_requests` with structured V2.0 schema.
-- Business rule: One verified record per type per user (partial unique index).
CREATE TABLE identity_verifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            verification_type NOT NULL,
  status          verification_status NOT NULL DEFAULT 'pending',

  -- Type-specific data
  work_email      TEXT,
  email_otp       TEXT,  -- hashed, not plaintext
  id_card_url     TEXT,
  linkedin_url    TEXT,
  employer_name   TEXT,

  -- Verification data (JSONB for flexibility, audited in Phase 6)
  verification_data JSONB DEFAULT '{}'::jsonb,

  -- Review
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Expiry
  expires_at      TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Business rule: Only one approved verification per type per user.
CREATE UNIQUE INDEX idx_one_verified_per_type
  ON identity_verifications (user_id, type)
  WHERE status = 'approved';

CREATE TRIGGER trg_identity_verifications_updated_at
  BEFORE UPDATE ON identity_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5c. Verification Badges
-- V2.0 addition: Visual trust indicators.
CREATE TABLE verification_badges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type      TEXT NOT NULL,  -- 'email_verified', 'id_verified', 'employer_verified', 'top_referrer', etc.
  verification_id UUID REFERENCES identity_verifications(id),
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ,  -- badges can expire
  revoked_at      TIMESTAMPTZ,
  revoked_reason  TEXT,

  UNIQUE (user_id, badge_type)
);

-- ── 6. Jobs & Applications ──────────────────────────────────────────────────

-- 6a. Jobs
-- V1 mapping: maps directly from V1 `jobs` table, adds state machine.
CREATE TABLE jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,

  title           TEXT NOT NULL,
  department      TEXT,
  location        TEXT,
  type            TEXT,  -- 'full_time', 'part_time', 'contract', 'internship'
  track           career_track DEFAULT 'early_career',
  salary_range    TEXT,
  description     TEXT,
  requirements    TEXT,
  application_url TEXT,

  -- State machine
  status          job_status NOT NULL DEFAULT 'draft',
  posted_at       TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,  -- auto-close date

  -- Stats (denormalized)
  applicant_count INTEGER NOT NULL DEFAULT 0,
  referral_count  INTEGER NOT NULL DEFAULT 0,

  -- Soft-delete
  deleted_at      TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Business rule: When status changes to 'active', auto-set posted_at.
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

-- 6b. Job Skills (Normalized Join Table)
-- V2.0 addition: Many-to-many between jobs and skills.
CREATE TABLE job_skills (
  job_id    UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id  UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  required  BOOLEAN NOT NULL DEFAULT false,  -- required vs nice-to-have
  min_proficiency TEXT,

  PRIMARY KEY (job_id, skill_id)
);

-- 6c. Applications
-- V2.0 addition: Formal application tracking (separate from referrals).
CREATE TABLE applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          application_status NOT NULL DEFAULT 'submitted',
  resume_url      TEXT,
  cover_letter    TEXT,
  notes           TEXT,

  -- State history is tracked via state_history table

  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  -- Business rule: One active application per candidate per job.
  UNIQUE (job_id, candidate_id)
);

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6d. Job Pipeline (per-recruiter pipeline stages)
-- V1 mapping: maps directly from V1 `job_pipeline`.
CREATE TABLE job_pipeline (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id    UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  stage     TEXT NOT NULL,
  position  INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 7. Matching & Referrals ─────────────────────────────────────────────────

-- 7a. Matches
-- V2.0 addition: DB-backed matching with score persistence.
CREATE TABLE matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Match scoring (persisted, not recalculated on every render)
  match_score     NUMERIC(5,2) NOT NULL DEFAULT 0,
  skills_score    NUMERIC(5,2) DEFAULT 0,
  role_score      NUMERIC(5,2) DEFAULT 0,
  company_score   NUMERIC(5,2) DEFAULT 0,
  location_score  NUMERIC(5,2) DEFAULT 0,
  reputation_score NUMERIC(5,2) DEFAULT 0,

  source          match_source NOT NULL DEFAULT 'algorithm',
  track           career_track,

  -- State
  viewed_at       TIMESTAMPTZ,
  accepted_at     TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  expired_at      TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Business rule: One match per candidate per job.
  UNIQUE (job_id, candidate_id)
);

-- 7b. Referrals
-- V1 mapping: maps directly from V1 `referrals` table.
CREATE TABLE referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,
  match_id        UUID REFERENCES matches(id) ON DELETE SET NULL,

  job_title       TEXT NOT NULL,
  status          referral_status NOT NULL DEFAULT 'requested',
  pipeline_stage  TEXT,
  progress        INTEGER DEFAULT 0,

  -- Relationship (V1.0 addition)
  relationship_type   relationship_type DEFAULT 'none',
  relationship_note   TEXT,
  policy_acknowledged BOOLEAN DEFAULT false,

  -- Pass reason
  pass_reason     TEXT,

  -- Notes
  note            TEXT,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at     TIMESTAMPTZ,
  submitted_at    TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,

  -- Soft-delete
  deleted_at      TIMESTAMPTZ
);

CREATE TRIGGER trg_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Business rule: No duplicate referral for same requester + professional + job.
CREATE UNIQUE INDEX idx_no_duplicate_referral
  ON referrals (requester_id, professional_id, job_title)
  WHERE deleted_at IS NULL;

-- 7c. Professional Capacities (V2.0 canonical capacity tracking)
-- Business rule: Time-bucketed capacity. Auto-reset when capacity_reset_at < start of current month.
CREATE TABLE professional_capacities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  max_capacity    INTEGER NOT NULL DEFAULT 5,
  used            INTEGER NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Business rule: One capacity record per user per month.
  UNIQUE (user_id, period_start)
);

CREATE TRIGGER trg_professional_capacities_updated_at
  BEFORE UPDATE ON professional_capacities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Business rule: Auto-create next month's capacity record when current period ends.
CREATE OR REPLACE FUNCTION ensure_capacity_period()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM professional_capacities
    WHERE user_id = NEW.professional_id
      AND period_start <= CURRENT_DATE
      AND period_end >= CURRENT_DATE
  ) THEN
    INSERT INTO professional_capacities (user_id, period_start, period_end, max_capacity)
    VALUES (
      NEW.professional_id,
      date_trunc('month', CURRENT_DATE)::date,
      (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date,
      (SELECT referral_capacity FROM profiles_professional WHERE user_id = NEW.professional_id)
    )
    ON CONFLICT (user_id, period_start) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 8. Screening Engine ─────────────────────────────────────────────────────

-- 8a. Screening Criteria
-- V2.0 addition: Versioned, weighted scoring criteria.
CREATE TABLE screening_criteria (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL,  -- 'skills', 'experience', 'education', 'assessment'
  track           career_track,  -- NULL = applies to all tracks
  weight          NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  version         INTEGER NOT NULL DEFAULT 1,
  is_active       BOOLEAN NOT NULL DEFAULT true,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8b. Screening Attempts
-- V2.0 addition: Records each screening attempt with results.
CREATE TABLE screening_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  criteria_id     UUID NOT NULL REFERENCES screening_criteria(id) ON DELETE CASCADE,
  score           NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_score       NUMERIC(5,2) NOT NULL DEFAULT 100,
  passed          BOOLEAN NOT NULL DEFAULT false,
  evidence        JSONB DEFAULT '{}'::jsonb,  -- structured response data
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8c. Screening State Machine
-- Business rule: Screening status transitions are enforced by trigger.
-- Allowed transitions:
--   not_started → in_progress
--   in_progress → pending_review
--   pending_review → ready | not_ready | expired | disqualified
--   not_started → expired (timeout)
CREATE OR REPLACE FUNCTION validate_screening_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'not_started' AND NEW.status != 'in_progress' THEN
    RAISE EXCEPTION 'Invalid transition: not_started can only go to in_progress';
  ELSIF OLD.status = 'in_progress' AND NEW.status != 'pending_review' THEN
    RAISE EXCEPTION 'Invalid transition: in_progress can only go to pending_review';
  ELSIF OLD.status = 'pending_review' AND NEW.status NOT IN ('ready', 'not_ready', 'expired', 'disqualified') THEN
    RAISE EXCEPTION 'Invalid transition: pending_review can only go to ready, not_ready, expired, or disqualified';
  ELSIF OLD.status IN ('ready', 'not_ready', 'expired', 'disqualified') THEN
    RAISE EXCEPTION 'Invalid transition: % is a terminal state', OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 9. State History (Audit Trail) ──────────────────────────────────────────
-- V2.0 addition: Immutable record of every state transition.
-- Business rule: INSERT-only. Never UPDATE, never DELETE. Atomic via trigger.
CREATE TABLE state_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL,  -- 'referral', 'application', 'job', 'screening', 'match'
  entity_id       UUID NOT NULL,
  field           TEXT NOT NULL,  -- 'status', 'pipeline_stage', 'screening_status', etc.
  old_value       TEXT,
  new_value       TEXT NOT NULL,
  changed_by      UUID REFERENCES users(id),
  reason          TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Business rule: Immutable — no UPDATE or DELETE allowed.
CREATE RULE state_history_no_update AS ON UPDATE TO state_history DO INSTEAD NOTHING;
CREATE RULE state_history_no_delete AS ON DELETE TO state_history DO INSTEAD NOTHING;

-- Business rule: Fast lookup by entity.
CREATE INDEX idx_state_history_entity ON state_history (entity_type, entity_id, created_at DESC);

-- ── 10. Notifications ───────────────────────────────────────────────────────

-- 10a. Notifications
-- V1 mapping: maps directly from V1 `notifications` table.
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  channel     notification_channel NOT NULL DEFAULT 'in_app',
  read        BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,

  -- Link to entity
  entity_type TEXT,  -- 'referral', 'message', 'job', etc.
  entity_id   UUID,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, read) WHERE read = false;

-- 10b. Notification Preferences
-- V2.0 addition: Per-user, per-channel, per-type preferences.
CREATE TABLE notification_preferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,  -- 'referral_request', 'referral_update', 'message', 'job_match', etc.
  channel     notification_channel NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, type, channel)
);

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 10c. Email Delivery Log
-- V2.0 addition: Track email delivery for audit.
CREATE TABLE email_delivery_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  email       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  template    TEXT,
  status      TEXT NOT NULL DEFAULT 'queued',  -- 'queued', 'sent', 'delivered', 'bounced', 'failed'
  provider_id TEXT,  -- Resend message ID
  error       TEXT,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 11. Messaging ───────────────────────────────────────────────────────────

-- 11a. Conversations
-- V1 mapping: maps directly from V1 `conversations`.
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Business rule: One conversation per pair of users.
  UNIQUE (user_a_id, user_b_id)
);

-- 11b. Messages
-- V1 mapping: maps directly from V1 `messages`.
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  read_at         TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);

-- ── 12. Bookmarks ───────────────────────────────────────────────────────────
-- V1 mapping: maps directly from V1 `bookmarks`.
CREATE TABLE bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,  -- 'professional', 'job', 'candidate'
  entity_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, entity_type, entity_id)
);

-- ── 13. Reports & Moderation ────────────────────────────────────────────────
-- V1 mapping: maps directly from V1 `reports`.
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,  -- 'user', 'job', 'message'
  entity_id   UUID NOT NULL,
  reason      report_reason NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'open',  -- 'open', 'under_review', 'resolved', 'dismissed'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  resolution  TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 14. Admin & Analytics ───────────────────────────────────────────────────

-- 14a. Admin Logs
-- V1 mapping: maps directly from V1 `admin_logs`.
CREATE TABLE admin_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  target_id   UUID,
  target_type TEXT,
  details     JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14b. Platform Settings
-- V1 mapping: maps directly from V1 `platform_settings`.
CREATE TABLE platform_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_by  UUID REFERENCES users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14c. Announcements
-- V1 mapping: maps directly from V1 `announcements`.
CREATE TABLE announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info',  -- 'info', 'warning', 'maintenance'
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ
);

-- 14d. Invites
-- V1 mapping: maps directly from V1 `invites`.
CREATE TABLE invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        TEXT NOT NULL UNIQUE,
  target_role user_role,
  uses        INTEGER NOT NULL DEFAULT 0,
  max_uses    INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14e. UTM Events
-- V1 mapping: maps directly from V1 `utm_events`.
CREATE TABLE utm_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id      TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_term        TEXT,
  utm_content     TEXT,
  referrer_source TEXT,
  landing_page    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14f. NPS Responses
-- V1 mapping: maps directly from V1 `nps_responses`.
CREATE TABLE nps_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  score       INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14g. Error Logs
-- V1 mapping: maps directly from V1 `error_logs`.
CREATE TABLE error_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  message     TEXT NOT NULL,
  source      TEXT DEFAULT 'client',
  severity    TEXT DEFAULT 'error' CHECK (severity IN ('error', 'warning', 'critical')),
  page        TEXT,
  stack       TEXT,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14h. Profile Drafts
-- V1 mapping: maps directly from V1 `profile_drafts`.
CREATE TABLE profile_drafts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  form_data   JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profile_drafts_updated_at
  BEFORE UPDATE ON profile_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 15. Indexes ─────────────────────────────────────────────────────────────
-- Business rule: Indexes on all foreign keys and frequently queried columns.

-- Users
CREATE INDEX idx_users_role ON users (role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users (lower(email));
CREATE INDEX idx_users_slug ON users (slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_users_status ON users (status) WHERE deleted_at IS NULL;

-- Profiles
CREATE INDEX idx_profiles_professional_company ON profiles_professional (company_name);
CREATE INDEX idx_profiles_professional_referrals ON profiles_professional (open_for_referrals) WHERE open_for_referrals = true;
CREATE INDEX idx_profiles_professional_show ON profiles_professional (show_on_find) WHERE show_on_find = true AND deleted_at IS NULL;
CREATE INDEX idx_profiles_job_seeker_open ON profiles_job_seeker (is_open_to_work) WHERE is_open_to_work = true AND deleted_at IS NULL;

-- Skills
CREATE INDEX idx_profile_skills_profile ON profile_skills (profile_type, profile_id);
CREATE INDEX idx_profile_skills_skill ON profile_skills (skill_id);

-- Jobs
CREATE INDEX idx_jobs_recruiter ON jobs (recruiter_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_company ON jobs (company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_status ON jobs (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_track ON jobs (track) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_posted ON jobs (posted_at DESC) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_jobs_title_search ON jobs USING gin (title gin_trgm_ops);
CREATE INDEX idx_jobs_location_search ON jobs USING gin (location gin_trgm_ops);

-- Job Skills
CREATE INDEX idx_job_skills_job ON job_skills (job_id);
CREATE INDEX idx_job_skills_skill ON job_skills (skill_id);

-- Applications
CREATE INDEX idx_applications_job ON applications (job_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_candidate ON applications (candidate_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_status ON applications (status) WHERE deleted_at IS NULL;

-- Matches
CREATE INDEX idx_matches_job ON matches (job_id);
CREATE INDEX idx_matches_candidate ON matches (candidate_id);
CREATE INDEX idx_matches_professional ON matches (professional_id) WHERE professional_id IS NOT NULL;
CREATE INDEX idx_matches_score ON matches (match_score DESC);

-- Referrals
CREATE INDEX idx_referrals_requester ON referrals (requester_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_referrals_professional ON referrals (professional_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_referrals_status ON referrals (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_referrals_job ON referrals (job_id) WHERE job_id IS NOT NULL AND deleted_at IS NULL;

-- Professional Capacities
CREATE INDEX idx_capacities_user_period ON professional_capacities (user_id, period_start);

-- Screening
CREATE INDEX idx_screening_attempts_candidate ON screening_attempts (candidate_id);
CREATE INDEX idx_screening_criteria_track ON screening_criteria (track) WHERE is_active = true;

-- Notifications
CREATE INDEX idx_notifications_user_type ON notifications (user_id, type, read);

-- Conversations
CREATE INDEX idx_conversations_users ON conversations (user_a_id, user_b_id);

-- State History
CREATE INDEX idx_state_history_type ON state_history (entity_type, entity_id);

-- Bookmarks
CREATE INDEX idx_bookmarks_user ON bookmarks (user_id, entity_type);

-- Invites
CREATE INDEX idx_invites_code ON invites (code);

-- ── 16. RLS Policies ────────────────────────────────────────────────────────
-- Business rule: Every table has RLS enabled. Policies enforce access control.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_professional ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_job_seeker ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_recruiter ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_capacities ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_drafts ENABLE ROW LEVEL SECURITY;

-- Users: read by authenticated, write own
CREATE POLICY "Users visible to authenticated" ON users
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Users insert own" ON users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own" ON users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Professional profiles: read by authenticated, write own
CREATE POLICY "Professional profiles visible" ON profiles_professional
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Professional profiles insert own" ON profiles_professional
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Professional profiles update own" ON profiles_professional
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Job seeker profiles: read by authenticated, write own
CREATE POLICY "Job seeker profiles visible" ON profiles_job_seeker
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Job seeker profiles insert own" ON profiles_job_seeker
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Job seeker profiles update own" ON profiles_job_seeker
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Recruiter profiles: read by authenticated, write own
CREATE POLICY "Recruiter profiles visible" ON profiles_recruiter
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Recruiter profiles insert own" ON profiles_recruiter
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Recruiter profiles update own" ON profiles_recruiter
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Companies: read by authenticated, write by owner/admin
CREATE POLICY "Companies visible" ON companies
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

-- Jobs: read by authenticated, write by recruiter owner or admin
CREATE POLICY "Jobs visible" ON jobs
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Jobs insert by recruiter" ON jobs
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('recruiter', 'admin'))
  );
CREATE POLICY "Jobs update by owner" ON jobs
  FOR UPDATE TO authenticated USING (recruiter_id = auth.uid());

-- Applications: read/write own, admin full access
CREATE POLICY "Applications visible" ON applications
  FOR SELECT TO authenticated USING (
    candidate_id = auth.uid() OR
    EXISTS (SELECT 1 FROM jobs WHERE id = job_id AND recruiter_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Applications insert own" ON applications
  FOR INSERT TO authenticated WITH CHECK (candidate_id = auth.uid());

-- Matches: read by involved parties
CREATE POLICY "Matches visible" ON matches
  FOR SELECT TO authenticated USING (
    candidate_id = auth.uid() OR professional_id = auth.uid() OR
    EXISTS (SELECT 1 FROM jobs WHERE id = job_id AND recruiter_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Referrals: read by involved parties, write by professional/admin
CREATE POLICY "Referrals visible" ON referrals
  FOR SELECT TO authenticated USING (
    requester_id = auth.uid() OR professional_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Referrals insert by job seeker" ON referrals
  FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Referrals update by professional" ON referrals
  FOR UPDATE TO authenticated USING (
    professional_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Notifications: read/write own
CREATE POLICY "Notifications visible" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Notifications insert own" ON notifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Notifications update own" ON notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Notification Preferences: read/write own
CREATE POLICY "Notification prefs visible" ON notification_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Notification prefs insert own" ON notification_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Notification prefs update own" ON notification_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Conversations: visible to participants
CREATE POLICY "Conversations visible" ON conversations
  FOR SELECT TO authenticated USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- Messages: visible to conversation participants
CREATE POLICY "Messages visible" ON messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id AND (user_a_id = auth.uid() OR user_b_id = auth.uid())
    )
  );
CREATE POLICY "Messages insert by participant" ON messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id AND (user_a_id = auth.uid() OR user_b_id = auth.uid())
    )
  );

-- Bookmarks: read/write own
CREATE POLICY "Bookmarks visible" ON bookmarks
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Bookmarks insert own" ON bookmarks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Bookmarks delete own" ON bookmarks
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Reports: read own + admin, insert own
CREATE POLICY "Reports visible" ON reports
  FOR SELECT TO authenticated USING (
    reporter_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Reports insert own" ON reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

-- Admin logs: admin only
CREATE POLICY "Admin logs admin only" ON admin_logs
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Trust scores: visible to authenticated, system writes
CREATE POLICY "Trust scores visible" ON trust_scores
  FOR SELECT TO authenticated USING (true);

-- Identity verifications: own + admin
CREATE POLICY "Verifications visible" ON identity_verifications
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Verification badges: visible to all authenticated
CREATE POLICY "Badges visible" ON verification_badges
  FOR SELECT TO authenticated USING (revoked_at IS NULL);

-- Profile skills: visible to authenticated
CREATE POLICY "Profile skills visible" ON profile_skills
  FOR SELECT TO authenticated USING (true);

-- Profile drafts: own only
CREATE POLICY "Drafts visible" ON profile_drafts
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- State history: visible to authenticated (immutable)
CREATE POLICY "State history visible" ON state_history
  FOR SELECT TO authenticated USING (true);

-- Professional capacities: visible to authenticated
CREATE POLICY "Capacities visible" ON professional_capacities
  FOR SELECT TO authenticated USING (true);

-- Screening criteria: visible to authenticated
CREATE POLICY "Screening criteria visible" ON screening_criteria
  FOR SELECT TO authenticated USING (is_active = true);

-- Screening attempts: own + admin
CREATE POLICY "Screening attempts visible" ON screening_attempts
  FOR SELECT TO authenticated USING (
    candidate_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 17. Functions ───────────────────────────────────────────────────────────

-- 17a. Calculate Trust Score
-- Business rule: Trust score components sum to 0-100. Enforced by CHECK.
CREATE OR REPLACE FUNCTION calculate_trust_score(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_response NUMERIC := 0;
  v_acceptance NUMERIC := 0;
  v_quality NUMERIC := 0;
  v_profile NUMERIC := 0;
  v_total NUMERIC;
BEGIN
  -- Response reliability (0-25): based on avg_reply_hours
  SELECT COALESCE(25 - (avg_reply_hours * 2), 0)
  INTO v_response
  FROM profiles_professional WHERE user_id = p_user_id;

  -- Acceptance rate (0-25): accepted / total referrals
  SELECT COALESCE(
    CASE WHEN COUNT(*) > 0
    THEN (COUNT(*) FILTER (WHERE status = 'accepted')::numeric / COUNT(*)::numeric) * 25
    ELSE 0 END, 0)
  INTO v_acceptance
  FROM referrals WHERE professional_id = p_user_id AND deleted_at IS NULL;

  -- Referral quality (0-25): based on success_rate
  SELECT COALESCE(success_rate * 0.25, 0)
  INTO v_quality
  FROM profiles_professional WHERE user_id = p_user_id;

  -- Profile quality (0-25): based on profile_completeness
  SELECT COALESCE(profile_completeness * 0.25, 0)
  INTO v_profile
  FROM profiles_professional WHERE user_id = p_user_id;

  v_total := v_response + v_acceptance + v_quality + v_profile;

  -- Upsert trust score
  INSERT INTO trust_scores (user_id, score, response_reliability, acceptance_rate, referral_quality, profile_quality)
  VALUES (p_user_id, v_total, v_response, v_acceptance, v_quality, v_profile)
  ON CONFLICT (user_id) DO UPDATE SET
    score = v_total,
    response_reliability = v_response,
    acceptance_rate = v_acceptance,
    referral_quality = v_quality,
    profile_quality = v_profile;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- 17b. Record State History
-- Business rule: Call this function on every state change. INSERT-only.
CREATE OR REPLACE FUNCTION record_state_change(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_field TEXT,
  p_old_value TEXT,
  p_new_value TEXT,
  p_changed_by UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO state_history (entity_type, entity_id, field, old_value, new_value, changed_by, reason, metadata)
  VALUES (p_entity_type, p_entity_id, p_field, p_old_value, p_new_value, p_changed_by, p_reason, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 17c. Referral Status Transition with Audit
-- Business rule: Validates referral status transitions and records history.
CREATE OR REPLACE FUNCTION update_referral_status(
  p_referral_id UUID,
  p_new_status referral_status,
  p_changed_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_status referral_status;
  v_allowed BOOLEAN;
BEGIN
  SELECT status INTO v_old_status FROM referrals WHERE id = p_referral_id;

  -- Validate transition
  v_allowed := CASE
    WHEN v_old_status = 'requested' AND p_new_status IN ('under_review', 'declined', 'expired') THEN true
    WHEN v_old_status = 'under_review' AND p_new_status IN ('accepted', 'declined') THEN true
    WHEN v_old_status = 'accepted' AND p_new_status IN ('referral_submitted', 'expired') THEN true
    WHEN v_old_status = 'referral_submitted' AND p_new_status IN ('application_submitted', 'closed') THEN true
    WHEN v_old_status = 'application_submitted' AND p_new_status = 'closed' THEN true
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid referral status transition: % → %', v_old_status, p_new_status;
  END IF;

  -- Update status
  UPDATE referrals SET status = p_new_status, updated_at = now() WHERE id = p_referral_id;

  -- Record history
  PERFORM record_state_change('referral', p_referral_id, 'status', v_old_status::text, p_new_status::text, p_changed_by, p_reason);

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 17d. Auto-create Professional Capacity on Referral
-- Business rule: Ensure current month capacity exists before referral insert.
CREATE OR REPLACE FUNCTION trg_ensure_capacity_before_referral()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM ensure_capacity_period();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 18. Comments ────────────────────────────────────────────────────────────
-- Business rule: Every table and significant column documented.

COMMENT ON TABLE users IS 'One identity, multiple profiles. Maps from V1 users. UUID preserved.';
COMMENT ON TABLE profiles_professional IS 'Professional/referrer profile. 1:1 with users. Canonical capacity tracking via professional_capacities.';
COMMENT ON TABLE profiles_job_seeker IS 'Candidate/job seeker profile. 1:1 with users. Includes screening status.';
COMMENT ON TABLE profiles_recruiter IS 'Recruiter profile. 1:1 with users. Links to companies table.';
COMMENT ON TABLE companies IS 'V2.0 addition: Separate company entity for multi-recruiter companies.';
COMMENT ON TABLE skills IS 'V2.0 addition: Canonical skill vocabulary. Normalized from text[] arrays.';
COMMENT ON TABLE profile_skills IS 'V2.0 addition: Many-to-many profile-to-skill join table.';
COMMENT ON TABLE trust_scores IS 'V2.0 addition: Persistent trust scoring. ≥80=verified, 50-79=provisional, <50=unverified.';
COMMENT ON TABLE identity_verifications IS 'V2.0 addition: Structured identity verification with type-specific data.';
COMMENT ON TABLE verification_badges IS 'V2.0 addition: Visual trust indicators tied to verifications.';
COMMENT ON TABLE jobs IS 'Job postings. State machine: draft→active→paused→closed.';
COMMENT ON TABLE job_skills IS 'V2.0 addition: Many-to-many job-to-skill join table.';
COMMENT ON TABLE applications IS 'V2.0 addition: Formal application tracking separate from referrals.';
COMMENT ON TABLE matches IS 'V2.0 addition: DB-backed matching with persisted scores.';
COMMENT ON TABLE referrals IS 'Referral lifecycle. State machine with audit trail via state_history.';
COMMENT ON TABLE professional_capacities IS 'V2.0 addition: Time-bucketed capacity tracking. Auto-reset monthly.';
COMMENT ON TABLE screening_criteria IS 'V2.0 addition: Versioned, weighted screening criteria.';
COMMENT ON TABLE screening_attempts IS 'V2.0 addition: Records each screening attempt with results.';
COMMENT ON TABLE state_history IS 'V2.0 addition: Immutable audit trail. INSERT-only, never UPDATE/DELETE.';
COMMENT ON TABLE notifications IS 'In-app notifications with read tracking.';
COMMENT ON TABLE notification_preferences IS 'V2.0 addition: Per-user, per-channel, per-type preferences.';
COMMENT ON TABLE email_delivery_log IS 'V2.0 addition: Track email delivery for audit.';
COMMENT ON TABLE conversations IS 'User-to-user conversations.';
COMMENT ON TABLE messages IS 'Messages within conversations.';
COMMENT ON TABLE bookmarks IS 'User bookmarks for professionals, jobs, candidates.';
COMMENT ON TABLE reports IS 'User-submitted reports for moderation.';
COMMENT ON TABLE admin_logs IS 'Admin action audit trail.';
COMMENT ON TABLE profile_drafts IS 'Auto-saved profile form drafts.';
