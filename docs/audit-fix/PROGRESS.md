# Audit Fix — Progress Log

**Date:** 2026-09-22
**Scope:** Full audit of broken routes, links, and API queries in DirectRefer.
**Status:** Batches 1-3 implemented and gated. Review pass complete (R1-R7).
**Nothing committed, pushed, or deployed. No SQL executed against any database.**

---

## Decisions (locked)

### Decision 1 — Orphan `MyReferrals` page
**Chosen: Route it at `/job-seeker/referrals`.**
`src/pages/MyReferrals.tsx` is a fully built student referral-tracking page
(pipeline tracker, CSV export) that was never imported in `App.tsx`. Routing it
fixes both the orphan file and the command palette's dead student "Referrals"
link in one move.

### Decision 2 — Recruiter Applications link
**Chosen: Retarget link to `/recruiter/jobs`.**
`layout.tsx` linked to `/recruiter/applications`, which is not a URL —
Applications is a non-URL-driven tab inside `/recruiter/jobs`
(`<Tabs defaultValue="jobs">`). Simple, zero-risk one-line retarget.

### Decision 3 — Public profile access (CORRECTED)
**Original proposal:** grant `email` + `mobile` to the anon role so
`ProfessionalPublic`'s contact card works for logged-out visitors.

**CORRECTED decision (supersedes the original):**
> **Do NOT grant `email` or `mobile` to the anon role, in ANY form — column
> grant, view, or RPC. Logged-out visitors must never see them. If
> `ProfessionalPublic` shows email/mobile, hide those fields for logged-out
> visitors and show them only to authenticated users.**

Additionally: **no anon-access SQL is written in this phase** — that belongs to
a later phase.

**Implementation applied:**
- `ProfessionalPublic.tsx` now branches its `users` select: `email, mobile` are
  only requested when `user` (authenticated) exists.
- The contact card renders real details only when `hasAcceptedReferral && user`;
  otherwise it renders the locked placeholder ("Accept a referral request to
  unlock contact details.") — which already existed in the code.
- `RecruiterPublic.tsx`'s `select('*, slug')` was narrowed to an explicit column
  list (`id, full_name, slug, email, banner_theme`) as prerequisite hygiene for
  any future anon grant.
- `database/28-fix-live-schema-drift.sql` contains **zero** anon GRANT/policy
  statements. Its verification query 8 asserts anon grants on `users` do **not**
  exist (expects 0 rows).

---

## Edits made

### Batch 1 — Navigation (6 broken links + 1 orphan route)

| File | Before | After |
|---|---|---|
| `src/pages/Applications.tsx:239` | `` navigate(`/job-seeker/job/${...job_id}`) `` | `` navigate(`/jobs/${...job_id}`) `` |
| `src/pages/StudentDashboard.tsx:74` | `` to={`/job-seeker/job/${job.job_id}`} `` | `` to={`/jobs/${job.job_id}`} `` |
| `src/pages/StudentDashboard.tsx:278` | `` to={`/job-seeker/job/${j.job_id}`} `` | `` to={`/jobs/${j.job_id}`} `` |
| `src/pages/StudentDashboard.tsx:384` | `` to={`/job-seeker/job/${j.job_id}`} `` | `` to={`/jobs/${j.job_id}`} `` |
| `src/pages/StudentDashboard.tsx:532` | `` to={`/job-seeker/job/${j.job_id}`} `` | `` to={`/jobs/${j.job_id}`} `` |
| `src/pages/ProfessionalDashboard.tsx:198` | `to="/professional/talent-search"` | `to="/professional/talent"` |
| `src/pages/ProfessionalDashboard.tsx:300` | `href: '/professional/talent-search'` | `href: '/professional/talent'` |
| `src/components/CommandPaletteInner.tsx:25` | student `href: '/job-seeker/referrals'` (no route) | unchanged — route now exists (see below) |
| `src/components/CommandPaletteInner.tsx:47` | `href: '/admin/dashboard'` (no route) | `href: '/admin/overview'` |
| `src/components/layout.tsx:109` | `` href: `${prefix}/applications` `` (no route) | `href: '/recruiter/jobs'` |
| `src/App.tsx` (lazy imports) | — | `+ const MyReferrals = lazyWithRetry(() => import('@/pages/MyReferrals'))` |
| `src/App.tsx` (routes) | — | `+ <Route path="/job-seeker/referrals" element={<RequireRole allowed={['student','admin']}><MyReferrals /></RequireRole>} />` |

All other nav hrefs in `layout.tsx` were verified against `App.tsx` routes
(`bookmarks`, `activity`, `analytics` for all three roles) — all valid.

### Batch 2 — jobs `stage` → `status` unification (v2 source of truth)

Live DB has the legacy `stage` enum with **lowercase** values
(`draft/active/paused/closed`). v2 schema and `AppContext.updateJob` already
write `status`. All DB reads/writes switched to `status`.

| File:line | Before | After |
|---|---|---|
| `src/lib/db.ts:754` | `.select('... applicants, referrals, stage, posted_at ...')` | `.select('... applicants, referrals, status, expires_at, posted_at ...')` |
| `src/lib/db.ts:800-805` | `row.stage === 'active' ? ... : row.stage === 'paused' ? 'Paused' : 'Draft'` | `row.status === 'active' ? ... : 'paused' ? 'Paused' : 'closed' ? 'Closed' : 'Draft'` + `expires_at: row.expires_at ?? undefined` |
| `src/pages/ReferralJobs.tsx:213` | `.select('... description, skills, posted_at, stage, ...')` | `.select('... description, posted_at, status, ...')` (dropped nonexistent `skills`) |
| `src/pages/ReferralJobs.tsx:214` | `.eq('stage', 'Active')` (invalid enum value → 400) | `.eq('status', 'active')` |
| `src/pages/ReferralJobs.tsx` (JobRow type) | `skills: string[] \| null` / `stage: string` | `skills?: string[] \| null` / `status: string` |
| `src/pages/RecruiterJobs.tsx:57` | `.update({ stage: 'closed' })` | `.update({ status: 'closed' })` |
| `src/pages/RecruiterJobs.tsx:696` | `stage: 'draft'` | `status: 'draft'` |
| `src/pages/RecruiterJobs.tsx:710` | `stage: (data.stage === 'active' ? ... ) as 'Active'\|'Paused'\|'Draft'` | `stage: (data.status === 'active' ... 'closed' ? 'Closed' : 'Draft') as ...\|'Closed'` |

`AppContext.updateJob` already writes `dbPatch.status` + `expires_at` — no
client change needed; it becomes correct once migration 28 runs.
Legacy `stage` column is **kept**, just no longer read/written.

### Batch 3 — Query correctness

| File:line | Before | After | Why |
|---|---|---|---|
| `src/lib/v2/applications.ts:115` | `company: j.company_name ?? j.company` | `company: j.department` | Neither `company_name` nor `company` exists on live `jobs` — page always showed "Unknown Company" |
| `src/lib/v2/applications.ts:147-155` | `.from('profiles_job_seeker').select('user_id, full_name, email').in('user_id', ...)` | `.from('users').select('id, full_name, email').in('id', ...)` | Names/emails live on `users` |
| `src/lib/v2/matching.ts:361` | `.eq('open_to_work', true)` | `.eq('is_open_to_work', true)` | Real column name |
| `src/lib/v2/matching.ts:458-462` | `.from('profiles_job_seeker')...eq('user_id', ...)` | `.from('users')...eq('id', ...)` | `full_name` lives on `users` |
| `src/pages/admin/Settings.tsx:106-112` | `.from('profiles_professional').select('user_id, full_name')` | `.from('users').select('id, full_name')` | `full_name` lives on `users` |
| `src/hooks/useVerification.ts:149` | `type: 'id_card'` | `request_type: 'id_card'` | Live column is `request_type` (CHECK: `email_otp\|id_card`) |
| `src/pages/Settings.tsx:137` | `type: 'id_card'` | `request_type: 'id_card'` | Same |
| `src/components/AnnouncementBanner.tsx:26,32-34` | `if (localStorage.dr_ann_unsupported === '1') return` + on error `localStorage.setItem('dr_ann_unsupported','1')` | flag logic removed; `if (error \|\| !data) return` | The flag permanently disabled the banner for returning users after the first 400 |
| `src/pages/RecruiterPublic.tsx:67` | `.select('*, slug')` | `.select('id, full_name, slug, email, banner_theme')` | Narrowed to consumed columns (prerequisite for any future anon grant) |

### Decision-3 correction — `src/pages/ProfessionalPublic.tsx`

| Location | Before | After |
|---|---|---|
| imports | — | `+ import { useAuth } from '@/context/AuthContext'` |
| component | — | `+ const { user, loading: authLoading } = useAuth()` |
| fetch guard | `if (!paramId) return` | `if (!paramId \|\| authLoading) return` |
| users select | always `select('full_name, email, mobile, city, ...')` | branches: authenticated → includes `email, mobile`; anonymous → **excludes** them |
| result typing | inferred | explicit cast shape (supabase type parser can't handle interpolated select strings) |
| effect deps | `[paramId]` | `[paramId, authLoading, user]` |
| contact card | `{hasAcceptedReferral ? (` | `{hasAcceptedReferral && user ? (` — logged-out visitors always get the locked placeholder |

---

## Migration file (run 3 SUCCEEDED — 28 + 28b applied; postcheck ran)

**Companion files (all new):**
- `database/28-preflight-checks.sql` (28a) — 15 read-only preflight checks
- `database/28b-jobs-stage-status-sync.sql` — DDL: idempotent sync trigger +
  function keeping `jobs.stage` ↔ `jobs.status` identical on every write
- `database/28d-jobs-status-transition.sql` — DDL: idempotent v2 transition
  trigger + function stamping `posted_at`/`closed_at` on status changes
  (added after C10's first run proved live never had it)
- `database/28-postcheck.sql` (28c) — C1–C9 read-only check groups + C10, which
  writes 7 test rows inside a transaction that always ends in `ROLLBACK`
- `database/28-rollback-notes.md` — 28 rollback = restore snapshot; 28b/28d
  rollback = four DROP statements

`database/28-fix-live-schema-drift.sql` — guarded, idempotent, non-destructive
(modeled on `database/27-fix-live-schema-drift.sql`), ends with
`NOTIFY pgrst, 'reload schema'`. Covers: `jobs` (+`status` backfilled from
`stage`, `track`, `requirements`, `expires_at`, `company_id`, `applicant_count`,
`referral_count`, `created_at`, `closed_at`), `applications`, `announcements`,
`screening_criteria`, `screening_attempts`, `professional_capacities`,
`notification_preferences`, `error_logs`, `profiles_job_seeker.bio`,
`matches`, new `profile_history` and `trust_score_adjustments` tables.

**Contains NO anon-access SQL** (per corrected Decision 3). Includes trailing
verification SELECTs; verification 8 asserts anon `users` grants do not exist.

**Run attempt 1 — FAILED, whole DO block rolled back, database untouched
(preflight P7 baseline still valid).** Error `23505 duplicate key value
violates unique constraint "notification_preferences_pkey"` / `DETAIL: Key
(user_id)=(…) already exists` at the first seed INSERT (file line 491 =
PL/pgSQL line 414). Root cause: live `notification_preferences` has its PK on
the legacy one-row-per-user `user_id`; section 7 added `id` but never moved
the PK to `id`, so the seed's second row per user tripped the PK — `ON CONFLICT
(user_id, type, channel)` covers only the new unique index.

**Fix (section 7 PK move) executed in run #2 — PROVEN:** sections 1–9 all
completed inside the transaction, including the PK drop/add, id regeneration
and the four seeds.

**Run attempt 2 — FAILED at section 10 (matches), rolled back; DB still
untouched, P7 baseline still valid.** Error `42701: column "source" of
relation "matches" already exists` on `ADD COLUMN source public.match_source
NOT NULL DEFAULT 'algorithm'`. Root cause, same bug class: live `matches`
already has `source` (the anon PostgREST drift probe mis-reported it as
missing — stale schema cache; preflight P5 did list `matches.source` and its
matrix would have shown "exists" — missed in review), while section 10
guarded all seven column ADDs behind only `match_score`'s absence.

**Fix applied (not yet executed):** every column in section 10 now has its
own `IF NOT EXISTS` guard — a pre-existing `source` skips with a NOTICE
instead of aborting. Sections 11–12 re-verified safe (table-existence
guards, `DROP POLICY IF EXISTS`, `CREATE INDEX IF NOT EXISTS`).

**Run 3 — SUCCESS.** `28-fix-live-schema-drift.sql` completed (PK moved to
`id`, seeds applied, `matches.source` skipped with NOTICE), then `28b` and
`28-postcheck.sql` ran to completion; **C10c surviving_test_rows = 0**.
**Postcheck C10 first run — 6 of 7 FAIL** (C10-6 passed only because both
column defaults are `'draft'` — a false green with zero triggers installed).
Root cause from the `pg_trigger`/`pg_proc` probe: **28b never executed on
live** (`sync_installed=false`, `sync_fn_exists=false`), and **live never had
the v2 transition trigger either** (`trg_jobs_status_transition` +
`jobs_status_transition()` both absent — a pre-existing gap, not a 28/28b
product; `posted_at default=now()` explained C10-4's lone anomaly).
**Fix:** run `28d-jobs-status-transition.sql` (installs the v2 transition
trigger verbatim from `v2-schema/schema.sql`) + re-run 28b (idempotent), then
re-run postcheck → expect C10 7×PASS, C10a-2 both true, C10c = 0.
**Fix APPLIED (2026-11-24):** ran 28b (re-run, idempotent) + new
`28d-jobs-status-transition.sql`. pg_trigger probe confirms
`sync_installed=true`, `transition_installed=true`, firing order
`trg_jobs_stage_status_sync [O] < trg_jobs_status_transition [O] <
trg_jobs_updated [O]` — all three enabled.
**Green so far:** C7 (0 policies / 41 pre-existing grants);
`28-verify-one-shot.sql` (drift_rows = 0, job_status = 4 v2 labels,
matches.source = `match_source`, notif_rows = 105); **C9 = HTTP 200 `[]`**
(PostgREST sees `jobs.status`; `[]` = anon sees 0 rows under RLS — correct);
C10c surviving_test_rows = 0 across three runs; **C5 captured** —
announcements 0, applications 0, error_logs 6, jobs 4, matches 0,
notification_preferences legacy 21, professional_capacities 7,
profiles_job_seeker 23, screening_attempts 0, screening_criteria 21,
users 27.
**P7 substitution:** the P7 baseline was never persisted to disk (no file
contains it). Source proof stands in: `28-fix-live-schema-drift.sql` has
ZERO `DELETE FROM` — its 15 UPDATEs are guarded column backfills — so no
count can have dropped below P7; the only rows 28 inserts are typed
notification_preferences seeds, excluded by C5's `type IS NULL` filter.
Any real delta vs P7 would be growth (live traffic), never loss.
**C10 verdict grid RECEIVED: 7/7 PASS (both screenshots, run 4).** The two
rows the old failure mode broke — C10-4 `posted_at=set` and C10-5
`closed_at=set` — confirm `trg_jobs_stage_status_sync` and
`trg_jobs_status_transition` both fire correctly on live. C10c = 0 test rows
survived. **Phase 28 verification is complete: all checks green.**

**C7 finding (post-run):** Verification 8 / C7 report
`anon_users_column_grants = 41`, `anon_users_policies = 0`. **Not a 28
regression** — repo-wide, the only anon GRANT/REVOKE SQL in project history
is function-EXECUTE in migrations 19/20; 28/28b contain none. 41 = one row
per column = Supabase's pre-existing default table-level `SELECT` grant.
Functional test `SET ROLE anon; SELECT count(*) FROM public.users` fails
with **`42501 permission denied for function is_admin`** — anon's path
through the `users` SELECT qual calls `is_admin()`, whose EXECUTE anon
lacks → **anon sees 0 rows, zero exposure, Decision 3 holds in effect; the
grants are latent only.** P13/C7's "expect 0 grants" criterion corrected in
both files (Supabase default privileges make 0 unattainable without an
explicit REVOKE). Remediation shipped as **phase 29** (see Open item 2):
REVOKE blanket → 12-column GRANT (no email/mobile) → replace
`users_select_merged` with a zero-function `USING (true)` policy. The
preflight diagnostic proved the CASE gate cannot hide the call — EXECUTE is
checked when the query is PLANNED, so `is_admin()` had to leave anon's plan
entirely, not merely sit behind a branch.

---

## Gates (real output)

### `npm run build` — exit code 0
```
> directrefer@0.0.0 build
> tsc -b && vite build

vite v7.3.6 building client environment for production...
transforming...
✓ 3354 modules transformed.
rendering chunks...
computing gzip size...
...
dist/assets/MyReferrals-CsSFWCIO.js                    8.74 kB │ gzip:  3.21 kB
dist/assets/ProfessionalPublic-CRxG9rIn.js            17.00 kB │ gzip:  5.02 kB
dist/assets/index-Btq6O867.js                        355.91 kB │ gzip: 108.12 kB
✓ built in 17.02s

=== npm run build exit code: 0 ===
```
(Only pre-existing Vite warnings about mixed dynamic/static imports of
`supabase.ts` and `db.ts` — present before this work, not introduced here.)

### `npx eslint src --quiet` — exit code 0
```
--- npx eslint src --quiet ---
=== eslint exit code: 0 ===
```
(no output = no errors)

### `git diff --stat`
```
 src/App.tsx                            |  2 ++
 src/components/AnnouncementBanner.tsx  |  7 +-----
 src/components/CommandPaletteInner.tsx |  2 +-
 src/components/layout.tsx              |  2 +-
 src/hooks/useVerification.ts           |  2 +-
 src/lib/db.ts                          | 11 ++++++----
 src/lib/v2/applications.ts             | 12 +++++------
 src/lib/v2/matching.ts                 |  6 +++---
 src/pages/Applications.tsx             |  2 +-
 src/pages/ProfessionalDashboard.tsx    |  4 ++--
 src/pages/ProfessionalPublic.tsx       | 39 +++++++++++++++++++++++++++-------
 src/pages/RecruiterJobs.tsx            |  6 +++---
 src/pages/RecruiterPublic.tsx          |  2 +-
 src/pages/ReferralJobs.tsx             |  8 +++----
 src/pages/Settings.tsx                 |  2 +-
 src/pages/StudentDashboard.tsx         |  8 +++----
 src/pages/admin/Settings.tsx           |  8 +++----
 17 files changed, 73 insertions(+), 50 deletions(-)

?? database/28-fix-live-schema-drift.sql   (new, untracked)
```

---

## Review pass (2026-09-22, second session — no features, no SQL run, no commits)

### R1. RecruiterPublic.tsx — `email` removed from select
Evidence: `email` appeared exactly twice in the file — the `RecruiterData.user`
interface type (line 20) and the select (line 68). Grepping the file for
`email|mobile|phone` returned only those two lines: **the component never
renders email, mobile, or phone.** The only contact affordance is the
"Contact Recruiter" button, which calls `startConversation` (lines 148-153) —
a conversation, not a contact-detail reveal.

Therefore no `useAuth` gating was needed (unlike ProfessionalPublic, which does
render a contact card). Changes applied:
- `select('id, full_name, slug, email, banner_theme')` →
  `select('id, full_name, slug, banner_theme')`
- removed `email: string` from the `RecruiterData.user` interface so the
  `userData as RecruiterData['user']` cast still type-checks

### R2. AnnouncementBanner.tsx — one-time flag cleanup + visible errors
- Added a try/catch `localStorage.removeItem('dr_ann_unsupported')` at the top
  of the load effect: one-time cleanup so users who hit the old permanent
  short-circuit get banners again.
- Replaced the silent `if (error || !data) return` with
  `if (error) { console.error('Failed to load announcements:', error); return }`
  followed by a separate `if (!data) return`.

### R3. Migration 28 review answers
**(a) jobs.status backfill mapping.** Lines 112-114:
```sql
ALTER TABLE public.jobs ADD COLUMN status public.job_status NOT NULL DEFAULT 'draft';
UPDATE public.jobs
   SET status = COALESCE(stage::text, 'draft')::public.job_status;
```
It is a **direct text cast, not a CASE mapping** — `stage::text` is reinterpreted
as `job_status`, with NULL → `'draft'`. This works because the labels are
identical. Verification of the labels (two independent sources):
- `v2-schema/schema.sql:25` — `CREATE TYPE job_status AS ENUM ('draft', 'active', 'paused', 'closed');`
- **live re-probe this session** (read-only HTTP GET against `/rest/v1/jobs`):
  - `stage=eq.active` → HTTP 200 `[]`
  - `stage=eq.draft` → HTTP 200 `[]`
  - `stage=eq.paused` → HTTP 200 `[]`
  - `stage=eq.closed` → HTTP 200 `[]`
  - `stage=eq.Active` → **HTTP 400** `invalid input value for enum job_stage: "Active"`
  → live enum type is `job_stage`, labels are lowercase, and `Active` is
  rejected. The cast is safe for all four values; a fifth unexpected label
  would abort the transaction (guarded against by preflight check P3).

**(b) unique indexes created — exactly three:**
1. `uq_professional_capacities_user_period` on `(user_id, period_start)` — line 458
2. `uq_notification_preferences_user_type_channel` on `(user_id, type, channel)` — line 487
3. `uq_matches_job_candidate` on `(job_id, candidate_id)` — line 580

All three are `CREATE UNIQUE INDEX IF NOT EXISTS` **and** each sits behind a
duplicate-count guard (`IF v_cnt = 0 ... ELSE RAISE NOTICE ... SKIPPED`), so a
duplicate-laden table skips the index instead of erroring. Two further
non-unique indexes exist (`idx_profile_history_user`,
`idx_trust_score_adjustments_user`, both `IF NOT EXISTS`).

**(c) idempotency / NOTIFY / GRANT-anon:**
- **Idempotent: YES.** Every `CREATE TYPE` is guarded by a `pg_type` lookup;
  every `ALTER TABLE ADD COLUMN` by an `information_schema.columns` lookup;
  `CREATE TABLE` by `information_schema.tables`; `CREATE POLICY` is preceded by
  `DROP POLICY IF EXISTS`; all indexes are `IF NOT EXISTS` plus duplicate
  guards; the notification seed uses `ON CONFLICT DO NOTHING`. Backfills run
  only inside the "column was just added" branch, so a second run is a no-op.
  Verified by scanning all 100 mutating statements against the 92 guard
  boundaries — no unguarded DDL/DML.
- **Ends with NOTIFY: YES.** Line 683, `NOTIFY pgrst, 'reload schema';` is the
  last statement of the DO block (before `END $mig28$;` line 685).
- **NO GRANT / anon policy: YES for anon** — zero `TO anon` statements; the
  only GRANTs are lines 628 and 669, both `TO authenticated` on the two newly
  created tables (`profile_history`, `trust_score_adjustments`). Comment block
  lines 40-42 and 677-678 record the deferral; verification query 8
  (lines 757-766) asserts anon `users` policies and column grants return zero
  rows.

### R4. Companion files created (read-only / additive)
- `database/28-preflight-checks.sql` — 15 read-only checks: enum types, enum
  labels, stage→status mapping verdict (P3 critical gate), `jobs.stage`
  existence (P4), full column-existence matrix (P5), backfill source columns
  (P6), row-count baseline (P7), one duplicate check per unique index (P8a-c),
  FK orphan check (P9), preference-boolean source counts (P10), new-table
  absence (P11), `criteria_id` nullability (P12), anon `users` = 0 (P13), the
  live `users` SELECT policies for question 5 evidence (P14), and
  `notification_preferences` constraints/indexes recording the pre-28 PK on
  `user_id` (P15).
- `database/28-postcheck.sql` (28c) — C1–C9 read-only check groups: column
  existence (C1), 11 backfill-consistency mismatch counts that must all be 0
  (C2), the 3 unique indexes + duplicate re-check (C3/C3b) +
  `notification_preferences` PK columns = `id` (C3c), new tables RLS +
  policy counts (C4), row counts vs preflight baseline (C5 — notification_preferences
  counts legacy `type IS NULL` rows only, since the seeds add typed rows by
  design), `criteria_id`
  nullable (C6), anon `users` still 0/0 (C7), enum integrity (C8), API probe
  note (C9) — plus **C10**, which proves 28b's sync trigger in both directions
  on INSERT and UPDATE (7 verdict rows, all must read PASS), confirms
  `posted_at`/`closed_at` still get stamped, and ends in `ROLLBACK` so 0 test
  rows survive (C10c). C10a inventories the `jobs` triggers in firing order.
- `database/28-rollback-notes.md` — scope table (additive changes + the
  `notification_preferences` PK swap), why rollback =
  restore snapshot, required order snapshot → preflight → migrate → postcheck,
  snapshot procedure, rollback steps, what is safe to re-run, what 28
  deliberately does not do, and 5 residual risks.

### R5. `v2/applications.ts` users query under RLS — recruiter view
`getJobApplications` (applications.ts:147-150) runs
`.from('users').select('id, full_name, email').in('id', candidateIds)` as an
authenticated recruiter (callers: `RecruiterJobs.tsx:273-274, 537-538`).

Evidence in repo — both candidate live policies are permissive for any
authenticated user, with no ownership or role condition:
- `v2-schema/rls-policies.sql:88-90` —
  `CREATE POLICY "users_select_authenticated" ON users FOR SELECT TO authenticated USING (deleted_at IS NULL);`
- `database/05-fix-toggle-rls-and-rpcs.sql:101-103` and `fix-profile-rls.sql:122-124` —
  `CREATE POLICY "Users visible to authenticated users" ON users FOR SELECT USING (auth.role() = 'authenticated');`

Both grant SELECT on **all** user rows to every authenticated session, so a
recruiter can read candidate `id, full_name, email`. Column existence is
supported by `AuthContext.tsx:37-45`, which upserts `email` and `full_name`
into `users` on every login — a path that works in production.

**VERDICT: works, per code/schema evidence — but the live policy variant is
UNVERIFIED.** Only the `anon` role was probed against `users` (401); no
authenticated session was available to confirm which of the two policy variants
is actually installed. One behavioural caveat: if the live policy is the
`deleted_at IS NULL` variant, soft-deleted candidates are silently omitted from
`byUser`, so their name/email render blank rather than erroring. Preflight
check **P14** records the live policies so this resolves to verified at
preflight time.

### R6. ReferralJobs `.eq('status', 'active')` vs v2 enum labels
`ReferralJobs.tsx:214` filters `.eq('status', 'active')`.
`v2-schema/schema.sql:25`:
```sql
CREATE TYPE job_status AS ENUM ('draft', 'active', 'paused', 'closed');
```
and `v2-schema/schema.sql:473`:
```sql
status          job_status NOT NULL DEFAULT 'draft',
```
**MATCH** — `'active'` is a member label, lowercase, exactly as written.

### R7. Required execution order
```
1. SNAPSHOT / BACKUP                      ← the only rollback path
2. database/28-preflight-checks.sql        (read-only; record P7 row counts)
3. database/28-fix-live-schema-drift.sql   (STAGING first, then production)
4. database/28b-jobs-stage-status-sync.sql (DDL: stage <-> status sync trigger)
5. database/28-postcheck.sql               (28c; C1-C9 read-only, C10 writes
                                            inside a transaction that always
                                            ends in ROLLBACK; C5 must equal P7)
```
Staging must pass 3–5 before production runs 3. No step has been executed in
this session — all four companion files are new and untracked.

### Review-pass gates (real output)
```
=== npm run build exit code: 0 ===   (tsc -b && vite build, ✓ built)
=== eslint exit code: 0 ===          (no output = no errors)
```

## Open items / next phases

1. **Phase 28 — DONE, all checks green.** The 5-step SQL order ran to
   completion (attempt 1's `notification_preferences` PK failure was fixed
   in-file and re-run; P7 baseline stayed valid), 28b + 28d installed, the 3
   `jobs` triggers enabled in firing order, C10c = 0, C9 = HTTP 200 `[]`, C5
   all 11 rows captured, **C10 verdict 7/7 PASS**, build/eslint/secret-scan
   green, pushed and deploy-verified (live bundle `index-BWc8bqKj.js`).
2. **Anon access phase — DONE (phase 29, `29-anon-users-fix.sql`).** Order:
   `REVOKE SELECT ON public.users FROM anon` (41 column rows → 0; PostgreSQL
   revokes table-level and column-level together) → `GRANT SELECT (12 public
   columns)` = `id, full_name, slug, avatar_url, city, state, country,
   linkedin, banner_theme, verified, professional_verified,
   work_email_verified` — the exact union of every logged-out call site;
   **`email`/`mobile`/`work_email` never granted, in any form** → CREATE
   `users_select_public USING (true)` **before** dropping
   `users_select_merged` (authenticated never went a statement without a
   SELECT policy; qual has zero function calls so anon's plan cannot mention
   `is_admin()`; authenticated's effective visibility is unchanged — its old
   right disjunct `auth.role() = 'authenticated'` was always true) →
   `NOTIFY pgrst, 'reload schema'`. Every statement-boundary state is
   fail-closed, so no transaction was needed (pooled-connection safe), and
   the file is idempotent. Verification grid 6/6 as expected (anon = 12
   columns, only `users_select_public`, qual `true`). **Anon probes: the
   exact request that returned 401 now returns 200 with allowlisted columns
   only; `select=email` / `mobile` / `work_email` / `*` all fail 401/42501.**
   Logged-out `users` selects were already narrowed, but the pages still
   rendered skeletons — see open item 3. Known-fail-closed remainder:
   insert/update/delete merged quals still mention `is_admin()`; anon has no
   logged-out write path to `users` and any attempt 42501s exactly as before
   (pre-existing, untouched, informational only).
3. **`AppContext` data gate never cleared for logged-out visitors (fixed).**
   `loading` is `useState(true)` and its only `setLoading(false)` lived inside
   the authenticated branch of the data effect, whose `!user` arm returned
   early — so for a logged-out visitor `usePageLoading` returned `true`
   forever and any page gated on it showed a skeleton indefinitely. This hid
   the phase-29 401s behind a spinner rather than surfacing them. Pre-existing
   committed code (last touched `519f782`), not a 28/29 regression. Fix: an
   effect keyed on `[user?.id, authLoading]` that sets `loading` when a session
   appears and clears it once auth resolves with none. Verified locally: the
   three public profile pages render logged-out with a clean console.
4. **`profiles_recruiter` / `profiles_job_seeker` are still anon-blind
   (open, needs a decision).** Both tables' SELECT policies are
   `TO authenticated` only, so anon reads them as 0 rows — `RecruiterPublic`
   and `JobSeekerPublic` resolve the user fine now, then `.single()` on the
   profile row returns PGRST116/406 and the page renders NotFound.
   `profiles_professional` works only because `fix-extension-rls.sql` added an
   anon SELECT policy for the Chrome extension. Granting anon access here is
   NOT a mechanical repeat of phase 29: both pages use `select('*')`, and
   `profiles_job_seeker` carries `resume_url`, `resume_text`,
   `screening_status`, `screening_score`, `notice_period`, `why_me`, while
   `profiles_recruiter` carries `work_email`. Column grants would break
   `select('*')`, so this needs a narrowed frontend select plus an explicit
   column allowlist — deferred as phase 30 pending approval.
5. **Commit/push/deploy:** requires explicit user approval. Nothing has been
   committed; working tree holds all changes above.

## Deferred (identified, deliberately NOT fixed this phase)

1. **Capacity `.single()` fail-open (PGRST116).** Both capacity reads use
   `.single()` and ignore `error`, so a missing `professional_capacities` row
   silently disables the limit instead of being handled:
   - `src/components/CapacityMeter.tsx:211-217` — no row ⇒ `data` is null and
     the component keeps its local default, reporting a capacity that was
     never read from the DB.
   - `src/lib/v2/matching.ts:322-326` — no row ⇒ `capacity` is null and the
     `used >= max_capacity` guard at `matching.ts:328` is skipped, so matching
     proceeds regardless of capacity (fail-open).
   Fix shape (later phase): `.maybeSingle()` + an explicit no-row policy.
2. **Legacy `api/` layer writes only `stage`.** `api/jobs.js:30` (insert),
   `api/jobs.js:51` (update) and `api/admin.js:76` (admin status update) write
   `stage` and never `status`. The layer is frozen this phase; 28b's
   `trg_jobs_stage_status_sync` is what keeps `status` correct for these
   writes. If the layer is ever retired, the trigger can be retired with it —
   DROP lines in `database/28-rollback-notes.md`.

## Known remaining console errors (root-caused, pending migration 28)

- `JobDetail` selects `requirements, track, status, expires_at` → fixed by mig 28
- Application submit writes `resume_url, notes` → fixed by mig 28
- Recruiter pause/close writes `status, expires_at` → fixed by mig 28
- Matching `match_score` order/upsert columns → fixed by mig 28
- Capacity meter `user_id, period_start, period_end, max_capacity, used` → mig 28
- Notification prefs `type, channel, enabled` → mig 28
- Error logging `page, stack, metadata` → mig 28
- `trust_score_adjustments`, `profile_history` 404 → created by mig 28
- Public profile pages 401 for logged-out visitors → deferred to anon phase
