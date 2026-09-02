-- Migration 22: Add referred_by column for invite attribution
-- Links a new user to the professional who invited them.

-- ============================================================
-- 1. ADD COLUMN (idempotent)
-- ============================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- ============================================================
-- 2. INDEX (idempotent)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON public.users(referred_by);

-- ============================================================
-- 3. VERIFY
-- ============================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'referred_by';
