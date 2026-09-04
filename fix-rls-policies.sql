-- Safe RLS policy creation (won't fail if already exists)
-- Run in Supabase SQL Editor

-- Conversations: allow participants to update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'conversations' 
    AND policyname = 'Participants can update conversations'
  ) THEN
    CREATE POLICY "Participants can update conversations" ON conversations
      FOR UPDATE USING (
        auth.uid() = user_a_id OR 
        auth.uid() = user_b_id
      );
  END IF;
END $$;

-- Bookmarks: allow users to delete their own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bookmarks' 
    AND policyname = 'Users can delete own bookmarks'
  ) THEN
    CREATE POLICY "Users can delete own bookmarks" ON bookmarks
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Availability: allow users to delete their own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'availability' 
    AND policyname = 'Users can delete own availability'
  ) THEN
    CREATE POLICY "Users can delete own availability" ON availability
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Verify final state
SELECT 
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
