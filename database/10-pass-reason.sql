-- Adds pass_reason column so referrer pass decisions can be analyzed later.
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS pass_reason text;
