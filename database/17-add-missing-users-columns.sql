-- 17. Add missing columns to users table
-- These columns are referenced by AuthContext.tsx and AppContext.tsx
-- but are missing from the live database, causing 401 errors.

ALTER TABLE users ADD COLUMN IF NOT EXISTS professional_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recruiter_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_workspace TEXT DEFAULT 'dashboard';
