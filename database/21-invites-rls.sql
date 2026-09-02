-- Migration 21: RLS policies for invites table
-- The invites table was created in migration 09 but never had RLS policies,
-- causing 403 Forbidden errors on all invite queries.

-- ============================================================
-- 1. ENABLE RLS (idempotent)
-- ============================================================
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. DROP EXISTING POLICIES (safe re-run)
-- ============================================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'invites' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON invites', pol.policyname);
  END LOOP;
END $$;

-- ============================================================
-- 3. AUTHENTICATED USER POLICIES
-- ============================================================

-- Users can read their own invites
CREATE POLICY "Users can read own invites"
  ON invites FOR SELECT
  USING (auth.uid() = inviter_id);

-- Users can create invites for themselves
CREATE POLICY "Users can create own invites"
  ON invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

-- Users can update their own invites (e.g. increment uses)
CREATE POLICY "Users can update own invites"
  ON invites FOR UPDATE
  USING (auth.uid() = inviter_id);

-- ============================================================
-- 4. PUBLIC POLICY FOR INVITE VALIDATION (login page)
-- ============================================================

-- Allow public read of invite codes for validation purposes.
-- This is needed because validateInviteCode() runs on the login page
-- before the user is authenticated.
CREATE POLICY "Public can validate invite codes"
  ON invites FOR SELECT
  USING (true);

-- ============================================================
-- 5. SECURITY DEFINER RPC FOR INCREMENTING USES
-- ============================================================

-- The increment_invite_uses RPC is called by recordInviteUse() in invites.ts
-- but was never created. This function increments uses atomically.
CREATE OR REPLACE FUNCTION public.increment_invite_uses(invite_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE invites SET uses = uses + 1 WHERE code = invite_code;
END;
$$;

-- ============================================================
-- 6. GRANT PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.increment_invite_uses(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_invite_uses(text) TO anon;

-- ============================================================
-- 7. VERIFY
-- ============================================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'invites'
ORDER BY cmd;
