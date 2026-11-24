# Migration 28 — Rollback Notes

**Scope:** `database/28-fix-live-schema-drift.sql` (step 3),
`database/28b-jobs-stage-status-sync.sql` (step 4) and
`database/28d-jobs-status-transition.sql` (step 5)
**Nature:** 28 is additive except for one constraint swap (the
`notification_preferences` primary key moves `user_id` → `id`, no data touched)
— **rollback = restore snapshot**. 28b and 28d are each one trigger + one
function — **rollback = the four DROP statements** at the end of this file.

---

## Why "restore the snapshot" is the rollback

Migration 28 makes only these kinds of changes:

| Change type | Examples |
|---|---|
| `ADD COLUMN` (new columns) | `jobs.status`, `jobs.track`, `applications.resume_url`, `announcements.content`, `matches.match_score`, … |
| `CREATE TYPE` (new enums) | `job_status`, `career_track`, `notification_channel`, `match_source` |
| `CREATE TABLE` (new tables) | `profile_history`, `trust_score_adjustments` |
| `CREATE INDEX` (new indexes) | the 3 `uq_*` indexes + 2 `idx_*` indexes |
| `CREATE POLICY` / `GRANT TO authenticated` | RLS on the 2 new tables only |
| **Data backfills into the new columns** | `status ← stage`, `content ← body`, `is_active ← active`, `applicant_count ← applicants`, `match_score ← score`, `passed ← score >= 60`, … |
| One constraint relaxation | `screening_attempts.criteria_id` NOT NULL → NULL |
| One constraint swap | `notification_preferences` primary key: legacy PK on `user_id` dropped, new PK on `id` added (no data touched) |

There are **no `DROP COLUMN` statements, no row deletions, no data overwrites of
pre-existing columns** in migration 28. The only object dropped is the legacy
`notification_preferences` **primary-key constraint on `user_id`**, immediately
replaced by a primary key on `id` (the v2 shape from `v2-schema/schema.sql`) —
a structural swap: every row keeps its `user_id` and boolean values, and the
new typed rows can now coexist with the legacy row per user.

Every legacy column (`stage`, `body`,
`active`, `criterion_key`, `criterion_type`, `score`, `applicants`, `referrals`,
`posted_at`, and the four `notification_preferences` boolean columns) is
**kept intact** — the new columns are written alongside them.

That means:

- **Dropping** the added columns would throw away the backfilled values and
  leave any client build that reads them broken. It is not a clean rollback;
  it is a second, destructive migration.
- **Restoring a snapshot** returns the database to the exact pre-28 state in
  one step, with no judgement calls about which columns to drop.

**Therefore: snapshot first, rollback = restore snapshot.**

---

## Required order (do not deviate)

```
1. SNAPSHOT / BACKUP          ← this is your only rollback path
2. database/28-preflight-checks.sql        (read-only, record P7 row counts)
3. database/28-fix-live-schema-drift.sql   (on STAGING first, then production)
4. database/28b-jobs-stage-status-sync.sql (DDL: sync trigger + function)
5. database/28-postcheck.sql               (C1-C9 read-only; C10 writes inside
                                            a transaction that ends in ROLLBACK)
```

Staging must complete steps 3–5 cleanly before production runs step 3.

---

## Taking the snapshot

Take it **before step 2**, so the preflight baseline and the snapshot describe
the same database state.

- **Supabase Dashboard → Database → Backups** (point-in-time / manual backup), or
- `pg_dump` of the `public` schema plus data, stored off-platform.

Record the snapshot's timestamp/ID next to the preflight P7 row counts. If
production ever needs a rollback, you will restore exactly that snapshot.

---

## If a rollback is genuinely required

1. **Stop deploys.** Do not ship or keep running the client build that reads
   the new columns — it will 400 against a rolled-back schema.
2. **Restore the snapshot** taken in step 1 (Supabase restore, or `pg_restore`).
3. **Re-run `NOTIFY pgrst, 'reload schema'`** (or wait for PostgREST's cache
   refresh) so the API reflects the restored schema.
4. **Re-run `28-postcheck.sql`** — on a restored *pre*-28 schema only C1, C4
   and C7 are meaningful (C1 rows all "FAIL - still missing", C4 returns 0
   rows, C7 still 0/0). C2, C8 and C10 will raise `column jobs.status does
   not exist` — that error is itself the confirmation; skip to step 5.
5. **Deploy the previous client build** (`git` — the commit before the
   `stage` → `status` client switch), so the app matches the restored schema.
6. Re-run `28-preflight-checks.sql` before attempting 28 again.

There is no supported "partial rollback" (e.g. drop only `jobs.status`). The
schema and the client are coupled: once the client writes `status`, the column
must exist, and rolling one back without the other breaks the app.

---

## Rolling back 28b alone (no snapshot needed)

28b changes nothing but two trigger-function objects. Undo it with:

```sql
DROP TRIGGER IF EXISTS trg_jobs_stage_status_sync ON public.jobs;
DROP FUNCTION IF EXISTS public.jobs_stage_status_sync();
```

Afterwards the two columns drift apart again on the first legacy `api/` write
(pre-28b behaviour), so postcheck **C2a/C8c will report mismatches** — that is
the expected signature of a deliberate 28b rollback, not a failed migration.

---

## Rolling back 28d alone (no snapshot needed)

28d changes nothing but two trigger-function objects. Undo it with:

```sql
DROP TRIGGER IF EXISTS trg_jobs_status_transition ON public.jobs;
DROP FUNCTION IF EXISTS public.jobs_status_transition();
```

Afterwards `posted_at`/`closed_at` stop being stamped on status transitions,
so postcheck **C10-4/C10-5 timestamps FAIL again** — the expected signature of
a deliberate 28d rollback, not a failed migration. (Live never had this
trigger before 28d — it is a v2-schema component that was missing from
production — so this restores the pre-28d *live* status quo, not a
v2-consistent one.)

---

## What is safe to re-run

- **`28-fix-live-schema-drift.sql` is idempotent.** Every DDL is guarded by an
  `information_schema`/`pg_catalog` existence check, backfills only execute
  inside the "column was just added" branch, FK and unique-index creation is
  skipped with a `NOTICE` when orphans/duplicates would make it fail, the
  `notification_preferences` seed uses `ON CONFLICT DO NOTHING` and reads only
  legacy `type IS NULL` rows, and the PK move only drops a PK that is exactly
  `(user_id)` and only adds `notification_preferences_pkey (id)` when no PK
  exists yet. Re-running it after a partial failure is the intended recovery
  path — prefer this over rolling back if the failure was transient.
- **The three companion SQL files:**
  - `28-preflight-checks.sql` — read-only, re-runnable any number of times.
  - `28-postcheck.sql` — C1–C9 read-only; C10 writes 7 test rows inside an
    explicit transaction that **always ends in `ROLLBACK`** (run it as one
    script, not statement-by-statement on separate connections), so it is
    re-runnable too. C10c proves 0 test rows survived.
  - `28b-jobs-stage-status-sync.sql` — DDL, but idempotent (`CREATE OR REPLACE
    FUNCTION` + `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`), safe to re-run.
  - `28d-jobs-status-transition.sql` — same idempotent shape (`CREATE OR
    REPLACE FUNCTION` + `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`), safe to
    re-run; its guard skips with a NOTICE when `jobs.status`/`posted_at`/
    `closed_at` are absent.

---

## Things migration 28 deliberately does NOT do

- **No anon grants on `users`** — corrected Decision 3: `email` and `mobile`
  must never be anon-readable, in any form (column grant, view, or RPC). Any
  anon `users` access is a *later* phase and must exclude those two columns.
  Postcheck **C7 asserts this stays 0/0**; a non-zero result is a regression.
- **No `DROP` of legacy columns** — `stage`, `body`, `active`,
  `criterion_key`/`criterion_type`, `score`, and the four preference booleans
  remain, unused by the new client but intact for rollback safety.
- **No row deletions or updates to pre-existing column values** — backfills
  only populate columns that did not exist before. (The only values 28
  overwrites are its own `notification_preferences.id` fast-default
  duplicates, regenerated in the same transaction before the PK lands on
  that column.)

---

## Residual risks after a successful run

1. **`NOTIFY pgrst, 'reload schema'` is fire-and-forget** and cannot be
   verified from SQL. Confirm it landed with the API probe in
   `28-postcheck.sql` comment C9 (expect HTTP 200 on
   `/rest/v1/jobs?select=status&limit=1`). If it returns
   `PGRST204 column jobs.status does not exist`, wait and retry — do not
   re-run the migration just for a stale cache.
2. **Unique indexes are conditional.** If preflight P8 reported duplicates,
   migration 28 skips that index with a `NOTICE` and the dependent client
   upsert keeps failing. Postcheck C3b re-checks; resolve duplicates, then
   re-run 28.
3. **FK constraints are conditional** on zero orphans (preflight P9a). A skipped
   FK is a data-integrity gap, not a functional break.
4. **Backfills are one-shot.** They run only when the column is newly added.
   Rows written into a *legacy* column after migration 28 are mirrored only
   where a trigger does it: `jobs.stage` ↔ `jobs.status` is kept in sync by
   28b, but the other legacy columns (`body`, `active`, `applicants`,
   `referrals`, preference booleans, …) are **not** mirrored — the client
   stops writing those, so it only matters if an external tool still does.
5. **`screening_attempts.criteria_id` NOT NULL is permanently relaxed.**
   Restoring the snapshot is the only way back to NOT NULL.
