-- Migration 20: Add banner_style to profile tables
-- Stores a preset gradient identifier for the profile banner
-- Defaults to 'default' which maps to the current indigo-to-purple gradient

ALTER TABLE profiles_professional
ADD COLUMN IF NOT EXISTS banner_style text DEFAULT 'default';

ALTER TABLE profiles_job_seeker
ADD COLUMN IF NOT EXISTS banner_style text DEFAULT 'default';

ALTER TABLE profiles_recruiter
ADD COLUMN IF NOT EXISTS banner_style text DEFAULT 'default';

COMMENT ON COLUMN profiles_professional.banner_style IS 'Preset gradient identifier for profile banner (e.g. default, teal, amber, rose, indigo, slate)';
COMMENT ON COLUMN profiles_job_seeker.banner_style IS 'Preset gradient identifier for profile banner (e.g. default, teal, amber, rose, indigo, slate)';
COMMENT ON COLUMN profiles_recruiter.banner_style IS 'Preset gradient identifier for profile banner (e.g. default, teal, amber, rose, indigo, slate)';
