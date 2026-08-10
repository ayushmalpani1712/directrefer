-- =============================================================
-- Migration 04: Fix message read receipts
-- Renames `read` → `is_read` and adds `read_at` timestamp.
-- Run this in the Supabase SQL Editor before deploying the app.
-- =============================================================

-- 1. Rename column (safe — no FK / index depends on the column name)
ALTER TABLE public.messages
  RENAME COLUMN read TO is_read;

-- 2. Add read_at timestamp for precise "seen at" tracking
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- 3. Back-fill read_at for messages already marked as read
UPDATE public.messages
SET    read_at = created_at
WHERE  is_read = TRUE
  AND  read_at IS NULL;

-- 4. Ensure the default is FALSE so new messages are always unread
ALTER TABLE public.messages
  ALTER COLUMN is_read SET DEFAULT FALSE;
