-- Migration 16: Add avatar_color column for user-chosen avatar colors
-- Stores one of 5 approved hex colors from the DirectRefer palette:
-- #F45485 (pink), #F8971E (orange), #8378EE (purple), #34D399 (emerald), #38BDF8 (sky blue)
-- NULL means the user hasn't chosen (falls back to deterministic assignment)

ALTER TABLE profiles_professional ADD COLUMN IF NOT EXISTS avatar_color TEXT;
ALTER TABLE profiles_job_seeker ADD COLUMN IF NOT EXISTS avatar_color TEXT;
