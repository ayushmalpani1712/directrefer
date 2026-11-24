-- 28-verify-one-shot.sql — ONE read-only query, ONE row of answers.
-- Run after 28 + 28b + 28-postcheck. Nothing here writes; safe any time.
-- Answers, left to right:
--   job_status_labels  = enum labels migration 28 / postcheck C8a expects to be
--                        exactly draft/active/paused/closed (4 labels, sorts 0-3)
--   job_stage_labels   = the LEGACY stage enum (provenance of any stray labels)
--   live_stage_values  = distinct non-NULL stage values actually on jobs rows
--   status_dist        = jobs.status values with row counts (8b)
--   total_jobs         = row count of public.jobs
--   drift_rows         = postcheck 8c — MUST be 0 (stage <> status on same row)
--   matches_source_type= postcheck Verification 6 (expect match_source, or text)
--   notif_rows         = notification_preferences total (compare with C5 / P7)
SELECT
  (SELECT string_agg(e.enumlabel || '(' || e.enumsortorder || ')', ',' ORDER BY e.enumsortorder)
     FROM pg_enum e
     JOIN pg_type t ON t.oid = e.enumtypid
     JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'job_status') AS job_status_labels,

  (SELECT string_agg(e.enumlabel || '(' || e.enumsortorder || ')', ',' ORDER BY e.enumsortorder)
     FROM pg_enum e
     JOIN pg_type t ON t.oid = e.enumtypid
     JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'job_stage') AS job_stage_labels,

  (SELECT string_agg(DISTINCT stage::text, ',' ORDER BY stage::text)
     FROM public.jobs WHERE stage IS NOT NULL) AS live_stage_values,

  (SELECT string_agg(status::text || '=' || c::text, ',' ORDER BY status::text)
     FROM (SELECT status, count(*) AS c FROM public.jobs GROUP BY status) s) AS status_dist,

  (SELECT count(*) FROM public.jobs) AS total_jobs,

  (SELECT count(*) FROM public.jobs
    WHERE stage IS NOT NULL AND stage::text IS DISTINCT FROM status::text) AS drift_rows,

  (SELECT udt_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'matches' AND column_name = 'source') AS matches_source_type,

  (SELECT count(*) FROM public.notification_preferences) AS notif_rows;
