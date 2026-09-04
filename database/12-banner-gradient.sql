-- Add banner_gradient column to users table for customizable profile banners
-- Stores the selected gradient class string (CSS-only, no image uploads)

ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_gradient TEXT;

-- Default: NULL means use deterministic getBannerGradient(userId) fallback
-- Stored values are Tailwind gradient class strings like:
-- 'from-[#6366F1] via-[#818CF8] to-[#8B5CF6]'
