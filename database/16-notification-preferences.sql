-- 16-notification-preferences.sql
-- Add notification_preferences column to users table for persistent email/notification settings

ALTER TABLE users
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{
  "referral_received": true,
  "referral_status": true,
  "new_messages": true,
  "weekly_digest": false,
  "product_announcements": false,
  "email_opt_out": false
}'::jsonb;

-- Backfill existing users with default preferences
UPDATE users
SET notification_preferences = '{
  "referral_received": true,
  "referral_status": true,
  "new_messages": true,
  "weekly_digest": false,
  "product_announcements": false,
  "email_opt_out": false
}'::jsonb
WHERE notification_preferences IS NULL;
