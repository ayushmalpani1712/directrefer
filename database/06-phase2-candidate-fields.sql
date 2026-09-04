-- Phase 2 — Candidate Experience
-- Adds structured candidate profile fields used by the referral request flow.
-- Run this in the Supabase SQL Editor.

ALTER TABLE profiles_job_seeker
  ADD COLUMN IF NOT EXISTS notice_period text,
  ADD COLUMN IF NOT EXISTS work_preference text,
  ADD COLUMN IF NOT EXISTS why_me text;
