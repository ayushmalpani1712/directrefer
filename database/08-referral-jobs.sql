-- Phase 4 — Referral Jobs
-- Adds the fields that power the /referral-jobs discovery page:
--   1. jobs.application_url    -> link out to the company's own ATS page.
--   2. profiles_professional.college -> lets matching show a real "Same College"
--      affinity badge between a referrer and a job seeker (never fabricated).
-- Run this in the Supabase SQL Editor.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS application_url text;

ALTER TABLE profiles_professional
  ADD COLUMN IF NOT EXISTS college text;
