-- Clean URL Slugs for User Profiles
-- Run this in Supabase SQL Editor

-- 1. Add unique slug column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- 2. Create helper function to slugify full_name
CREATE OR REPLACE FUNCTION generate_profile_slug(full_name text, user_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  -- Lowercase and convert non-alphanumeric chars to hyphens
  base_slug := lower(regexp_replace(full_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);

  -- Fallback if name is empty
  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'user-' || substring(user_id::text from 1 for 8);
  END IF;

  final_slug := base_slug;

  -- Ensure uniqueness by appending numbers if duplicate exists
  WHILE EXISTS (SELECT 1 FROM public.users WHERE slug = final_slug AND id != user_id) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;

  RETURN final_slug;
END;
$$;

-- 3. Populate existing users with slugs
UPDATE public.users
SET slug = generate_profile_slug(full_name, id)
WHERE slug IS NULL;

-- 4. Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_users_slug ON public.users (slug);
