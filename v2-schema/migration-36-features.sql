-- ============================================================================
-- DirectRefer V2.0 — Migration: 36 Missing Features
-- ============================================================================
-- Run after main v2-schema migration. Adds tables, columns, functions,
-- and triggers needed for the 36 NOT-STARTED features.
-- ============================================================================

-- ── AUTH-011: Password History Enforcement ──────────────────────────────────
CREATE TABLE IF NOT EXISTS password_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history (user_id, created_at DESC);

-- ── AUTH-012: Session Invalidation at Cutover ───────────────────────────────
CREATE TABLE IF NOT EXISTS session_invalidations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL DEFAULT 'cutover',
  invalidated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- ── SEC-002: Consent Version Management ─────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT 'v2.0';
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_version TEXT;

-- ── SEC-014: Suspicious Activity Detection ──────────────────────────────────
CREATE TABLE IF NOT EXISTS suspicious_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,  -- 'mass_referral', 'rapid_screening', 'bulk_login', 'data_scraper'
  details     JSONB DEFAULT '{}'::jsonb,
  ip_address  TEXT,
  severity    TEXT NOT NULL DEFAULT 'low',  -- 'low', 'medium', 'high', 'critical'
  resolved    BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user ON suspicious_activity (user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_severity ON suspicious_activity (severity, resolved);

-- ── TRUST-010: Behavior-Based Score Adjustments ────────────────────────────
CREATE TABLE IF NOT EXISTS trust_score_adjustments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  adjustment  NUMERIC(5,2) NOT NULL,  -- positive or negative
  reason      TEXT NOT NULL,
  category    TEXT NOT NULL,  -- 'referral_bonus', 'late_response', 'screening_pass', 'inactivity'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── PROF-013: Company Team Management ───────────────────────────────────────
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'recruiter', 'viewer');

CREATE TABLE IF NOT EXISTS company_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        team_role NOT NULL DEFAULT 'recruiter',
  invited_by  UUID REFERENCES users(id),
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'accepted', 'declined'
  UNIQUE(company_id, user_id)
);

-- ── SCRN-006: Video Interview Upload ────────────────────────────────────────
ALTER TABLE screening_attempts ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE screening_attempts ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER;

-- ── SCRN-007: Reference Contact Form ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screening_references (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id  UUID NOT NULL REFERENCES screening_attempts(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ref_name    TEXT NOT NULL,
  ref_title   TEXT,
  ref_company TEXT,
  ref_email   TEXT NOT NULL,
  ref_phone   TEXT,
  relationship TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'contacted', 'responded'
  response    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── SCRN-011: Quality Tier Assignment ───────────────────────────────────────
CREATE OR REPLACE FUNCTION assign_quality_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.passed = true AND NEW.score >= 80 THEN
    NEW.quality_tier := 'premium';
  ELSIF NEW.passed = true AND NEW.score >= 50 THEN
    NEW.quality_tier := 'standard';
  ELSIF NEW.passed = false THEN
    NEW.quality_tier := 'unscreened';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_assign_quality_tier') THEN
    CREATE TRIGGER trg_assign_quality_tier
      BEFORE INSERT OR UPDATE ON screening_attempts
      FOR EACH ROW EXECUTE FUNCTION assign_quality_tier();
  END IF;
END $$;

-- ── MATCH-019: Referral Incentive Tracking ──────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_incentives (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  incentive_type TEXT NOT NULL DEFAULT 'points',  -- 'points', 'badge', 'monetary'
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'paid'
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── PERF-008: Connection Pooling Monitoring ─────────────────────────────────
CREATE TABLE IF NOT EXISTS connection_stats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_connections INTEGER,
  idle_connections INTEGER,
  waiting_clients INTEGER,
  pool_size   INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── SCRN-001: Add validation_rules to screening_criteria ────────────────────
ALTER TABLE screening_criteria ADD COLUMN IF NOT EXISTS validation_rules JSONB DEFAULT '[]'::jsonb;

-- ── Job Alerts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keywords TEXT,
  location TEXT,
  remote_only BOOLEAN DEFAULT false,
  min_salary INTEGER,
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  is_active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE job_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alerts" ON job_alerts
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_job_alerts_user ON job_alerts(user_id) WHERE is_active = true;

-- ── Schema Complete ─────────────────────────────────────────────────────────
