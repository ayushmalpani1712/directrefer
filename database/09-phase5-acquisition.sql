-- Phase 5 — Organic Acquisition
-- Adds invite tracking and UTM analytics tables.

CREATE TABLE IF NOT EXISTS invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  target_role text,
  uses integer DEFAULT 0,
  max_uses integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_inviter ON invites(inviter_id);

CREATE TABLE IF NOT EXISTS utm_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  referrer_source text,
  landing_page text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_utm_events_source ON utm_events(utm_source);
CREATE INDEX IF NOT EXISTS idx_utm_events_user ON utm_events(user_id);

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS pass_reason text;
