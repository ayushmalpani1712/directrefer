-- ─────────────────────────────────────────────────────────────
-- Migration 15: Add relationship type & policy acknowledgment to referrals
-- ─────────────────────────────────────────────────────────────

-- Add relationship_type column (nullable for existing rows)
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS relationship_type text;

-- Add free-text relationship note
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS relationship_note text;

-- Add policy acknowledgment flag
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS policy_acknowledged boolean DEFAULT false;

-- Index for querying by relationship type
CREATE INDEX IF NOT EXISTS idx_referrals_relationship_type ON public.referrals (relationship_type);
