-- Add banner_theme column to users table for profile theme customization
-- Stores a single text key like 'indigo', 'teal', 'obsidian' etc.
-- NULL means use the default (Royal Indigo) theme.

ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_theme TEXT;
