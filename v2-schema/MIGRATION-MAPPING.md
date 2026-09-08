# DirectRefer V2.0 — V1 → V2 Migration Mapping

**Status:** Ready for Execution
**Date:** 2026-09-09
**Treatment:** REBUILD — existing users, data, and referral history must be preserved.

---

## 0. Pre-Migration Requirements

### 0.1 Get V1 Database Dump
```bash
# From Supabase dashboard or pg_dump
pg_dump "postgresql://[user]:[pass]@db.ecdqnysmosxmojhvxbdu.supabase.co:5432/postgres" > v1_snapshot.sql
```

### 0.2 Load into Local Postgres
```bash
createdb directrefer_v1
psql directrefer_v1 < v1_snapshot.sql
```

### 0.3 Audit V1 Data Quality
Run these checks BEFORE writing migration scripts:

```sql
-- Row counts per table
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables
ORDER BY n_tup_ins DESC;

-- Orphaned foreign keys (users referenced in profiles but user doesn't exist)
SELECT 'profiles_professional' AS tbl, p.user_id
FROM profiles_professional p
LEFT JOIN users u ON u.id = p.user_id
WHERE u.id IS NULL
UNION ALL
SELECT 'profiles_job_seeker', p.user_id
FROM profiles_job_seeker p
LEFT JOIN users u ON u.id = p.user_id
WHERE u.id IS NULL
UNION ALL
SELECT 'profiles_recruiter', p.user_id
FROM profiles_recruiter p
LEFT JOIN users u ON u.id = p.user_id
WHERE u.id IS NULL;

-- Nulls in "non-nullable" fields
SELECT COUNT(*) AS null_emails FROM users WHERE email IS NULL;
SELECT COUNT(*) AS null_roles FROM users WHERE role IS NULL;
SELECT COUNT(*) AS null_names FROM users WHERE full_name IS NULL;

-- Encoding issues
SELECT id, full_name FROM users WHERE full_name !~ '^[[:print:]]*$';

-- Referral integrity
SELECT COUNT(*) AS orphaned_referrals
FROM referrals r
LEFT JOIN users u ON u.id = r.requester_id
WHERE u.id IS NULL;
```

---

## 1. Table Mapping: V1 → V2

### Legend
- **Maps Directly** = V1 table name and columns map 1:1 to V2
- **Splits** = V1 table data goes into multiple V2 tables
- **Merges** = Multiple V1 tables combine into one V2 table
- **Transforms** = V1 data needs transformation during migration
- **New** = V2 table has no V1 equivalent (seed with defaults)
- **Discarded** = V1 data not migrated (documented reason)

---

### 1.1 `users` → `users`

| V1 Column | V2 Column | Action | Notes |
|-----------|-----------|--------|-------|
| `id` | `id` | **KEEP** | UUID preserved. All FK references use this. |
| `email` | `email` | **KEEP** | Unique constraint preserved. |
| `full_name` | `full_name` | **KEEP** | |
| `role` | `role` | **KEEP** | Map V1 string to V2 enum: 'job_seeker', 'professional', 'recruiter', 'admin' |
| `mobile` | `mobile` | **KEEP** | |
| `city` | `city` | **KEEP** | |
| `state` | `state` | **KEEP** | |
| `country` | `country` | **KEEP** | |
| `verified` | `verified` | **KEEP** | |
| `professional_verified` | `professional_verified` | **KEEP** | |
| `recruiter_verified` | `recruiter_verified` | **KEEP** | |
| `work_email_verified` | `work_email_verified` | **KEEP** | |
| `work_email` | `work_email` | **KEEP** | |
| `work_verification_method` | `work_verification_method` | **KEEP** | |
| `id_card_url` | `id_card_url` | **KEEP** | |
| `email_verified` | `email_verified` | **KEEP** | |
| `linkedin` | `linkedin` | **KEEP** | |
| `slug` | `slug` | **KEEP** | |
| `status` | `status` | **KEEP** | Map to V2 enum: 'active', 'suspended', 'deactivated' |
| `avatar_url` | `avatar_url` | **KEEP** | |
| `active_workspace` | `active_workspace` | **KEEP** | |
| `banner_gradient` | `banner_gradient` | **KEEP** | |
| `banner_theme` | `banner_theme` | **KEEP** | |
| `last_login_at` | `last_login_at` | **KEEP** | |
| — | `terms_accepted_at` | **NEW** | Set to `created_at` for existing users (implicit consent) |
| — | `privacy_accepted_at` | **NEW** | Set to `created_at` for existing users |
| — | `marketing_consent` | **NEW** | Default `false` |
| — | `data_retention_until` | **NEW** | Default `NULL` (no expiry) |
| — | `deleted_at` | **NEW** | Default `NULL` (not deleted) |
| — | `updated_at` | **NEW** | Set to `now()` |

**Migration SQL:**
```sql
-- Add V2 columns to V1 users table
ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE users ADD COLUMN privacy_accepted_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE users ADD COLUMN marketing_consent BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN data_retention_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- Create updated_at trigger
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### 1.2 `profiles_professional` → `profiles_professional`

| V1 Column | V2 Column | Action | Notes |
|-----------|-----------|--------|-------|
| `user_id` | `user_id` | **KEEP** | FK → users.id |
| `company_name` | `company_name` | **KEEP** | Will migrate to `companies` table later |
| `job_title` | `job_title` | **KEEP** | |
| `department` | `department` | **KEEP** | |
| `years_experience` | `years_experience` | **KEEP** | |
| `open_for_referrals` | `open_for_referrals` | **KEEP** | |
| `is_open_to_work` | `is_open_to_work` | **KEEP** | |
| `referral_capacity` | `referral_capacity` | **KEEP** | |
| `referrals_used` | `referrals_used` | **KEEP** | Will sync with `professional_capacities` |
| `referral_policy` | `referral_policy` | **KEEP** | |
| `bio` | `bio` | **KEEP** | |
| `skills` | `skills` | **MIGRATE** | Move to `profile_skills` join table |
| `open_positions` | — | **DISCARD** | JSON string, unused in V2 |
| `response_rate` | `response_rate` | **KEEP** | |
| `avg_reply_hours` | `avg_reply_hours` | **KEEP** | |
| `success_rate` | `success_rate` | **KEEP** | |
| `rating` | `rating` | **KEEP** | |
| `review_count` | `review_count` | **KEEP** | |
| `github_url` | `github_url` | **KEEP** | |
| `avatar_color` | `avatar_color` | **KEEP** | |
| `college` | `college` | **KEEP** | |
| `show_on_find` | `show_on_find` | **KEEP** | |
| `work_email` | `work_email` | **KEEP** | |
| — | `capacity_reset_at` | **NEW** | Default `now()` |
| — | `profile_completeness` | **NEW** | Compute from existing data |
| — | `deleted_at` | **NEW** | Default `NULL` |
| — | `updated_at` | **NEW** | Set to `now()` |

**Migration SQL:**
```sql
ALTER TABLE profiles_professional ADD COLUMN capacity_reset_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE profiles_professional ADD COLUMN profile_completeness INTEGER DEFAULT 0;
ALTER TABLE profiles_professional ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE profiles_professional ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- Compute profile_completeness from existing data
UPDATE profiles_professional SET profile_completeness = (
  CASE WHEN bio IS NOT NULL AND length(bio) > 10 THEN 20 ELSE 0 END +
  CASE WHEN skills IS NOT NULL AND array_length(skills, 1) > 0 THEN 20 ELSE 0 END +
  CASE WHEN company_name IS NOT NULL THEN 15 ELSE 0 END +
  CASE WHEN job_title IS NOT NULL THEN 15 ELSE 0 END +
  CASE WHEN years_experience IS NOT NULL THEN 10 ELSE 0 END +
  CASE WHEN github_url IS NOT NULL THEN 10 ELSE 0 END +
  CASE WHEN work_email IS NOT NULL THEN 10 ELSE 0 END
);
```

---

### 1.3 `profiles_job_seeker` → `profiles_job_seeker`

| V1 Column | V2 Column | Action | Notes |
|-----------|-----------|--------|-------|
| `user_id` | `user_id` | **KEEP** | FK → users.id |
| `resume_url` | `resume_url` | **KEEP** | |
| `resume_name` | `resume_name` | **KEEP** | |
| `resume_size_bytes` | `resume_size_bytes` | **KEEP** | |
| `resume_uploaded_at` | `resume_uploaded_at` | **KEEP** | |
| `headline` | `headline` | **KEEP** | |
| `skills` | `skills` | **MIGRATE** | Move to `profile_skills` join table |
| `experience` | `experience` | **TRANSFORM** | Convert JSON string → JSONB |
| `experience_years` | `experience_years` | **KEEP** | |
| `education` | `education` | **TRANSFORM** | Convert JSON string → JSONB |
| `preferred_role` | `preferred_role` | **KEEP** | |
| `preferred_location` | `preferred_location` | **KEEP** | |
| `preferred_companies` | `preferred_companies` | **KEEP** | |
| `is_open_to_work` | `is_open_to_work` | **KEEP** | |
| `portfolio_url` | `portfolio_url` | **KEEP** | |
| `github_url` | `github_url` | **KEEP** | |
| `website` | `website` | **KEEP** | |
| `languages` | `languages` | **TRANSFORM** | Convert JSON string → JSONB |
| `certifications` | `certifications` | **TRANSFORM** | Convert JSON string → JSONB |
| `achievements` | `achievements` | **TRANSFORM** | Convert JSON string → JSONB |
| `projects` | `projects` | **TRANSFORM** | Convert JSON string → JSONB |
| `qualification` | `qualification` | **KEEP** | |
| `college` | `college` | **KEEP** | |
| `graduation_year` | `graduation_year` | **KEEP** | |
| `notice_period` | `notice_period` | **KEEP** | |
| `work_preference` | `work_preference` | **KEEP** | |
| `why_me` | `why_me` | **KEEP** | |
| `avatar_color` | `avatar_color` | **KEEP** | |
| — | `bio` | **NEW** | Default NULL |
| — | `resume_text` | **NEW** | Extract from resume if possible, else NULL |
| — | `preferred_track` | **NEW** | Compute from experience_years: <1='internship', 1-3='early_career', 3-10='experienced', 10+='leadership' |
| — | `screening_status` | **NEW** | Default 'not_started' |
| — | `screening_score` | **NEW** | Default 0 |
| — | `quality_tier` | **NEW** | Default 'unscreened' |
| — | `profile_completeness` | **NEW** | Compute from existing data |
| — | `deleted_at` | **NEW** | Default `NULL` |
| — | `updated_at` | **NEW** | Set to `now()` |

**Migration SQL:**
```sql
-- Transform JSON strings to JSONB
ALTER TABLE profiles_job_seeker ADD COLUMN experience_new JSONB;
UPDATE profiles_job_seeker SET experience_new = experience::jsonb WHERE experience IS NOT NULL;
ALTER TABLE profiles_job_seeker DROP COLUMN experience;
ALTER TABLE profiles_job_seeker RENAME COLUMN experience_new TO experience;

-- (repeat for education, languages, certifications, achievements, projects)

-- Add V2 columns
ALTER TABLE profiles_job_seeker ADD COLUMN bio TEXT;
ALTER TABLE profiles_job_seeker ADD COLUMN resume_text TEXT;
ALTER TABLE profiles_job_seeker ADD COLUMN preferred_track career_track DEFAULT 'early_career';
ALTER TABLE profiles_job_seeker ADD COLUMN screening_status screening_status DEFAULT 'not_started';
ALTER TABLE profiles_job_seeker ADD COLUMN screening_score NUMERIC(5,2) DEFAULT 0;
ALTER TABLE profiles_job_seeker ADD COLUMN quality_tier TEXT DEFAULT 'unscreened';
ALTER TABLE profiles_job_seeker ADD COLUMN profile_completeness INTEGER DEFAULT 0;
ALTER TABLE profiles_job_seeker ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE profiles_job_seeker ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- Compute preferred_track from experience_years
UPDATE profiles_job_seeker SET preferred_track = CASE
  WHEN experience_years IS NULL OR experience_years < 1 THEN 'internship'::career_track
  WHEN experience_years <= 3 THEN 'early_career'::career_track
  WHEN experience_years <= 10 THEN 'experienced'::career_track
  ELSE 'leadership'::career_track
END;
```

---

### 1.4 `profiles_recruiter` → `profiles_recruiter` + `companies`

| V1 Column | V2 Table | V2 Column | Action |
|-----------|----------|-----------|--------|
| `user_id` | `profiles_recruiter` | `user_id` | **KEEP** |
| `company_name` | `companies` | `name` | **SPLIT** → create company, link via `company_id` |
| `job_title` | `profiles_recruiter` | `job_title` | **KEEP** |
| `hiring_department` | `profiles_recruiter` | `hiring_department` | **KEEP** |
| `work_email` | `profiles_recruiter` | `work_email` | **KEEP** |
| `company_size` | `companies` | `size` | **SPLIT** |
| `company_website` | `companies` | `website` | **SPLIT** |
| `company_description` | `companies` | `description` | **SPLIT** |
| `benefits` | `companies` | `benefits` | **SPLIT** |
| `office_locations` | `companies` | `office_locations` | **SPLIT** |

**Migration SQL:**
```sql
-- Create companies from unique recruiter company_name values
INSERT INTO companies (name, size, website, description, benefits, office_locations)
SELECT DISTINCT ON (company_name)
  company_name, company_size, company_website, company_description, benefits, office_locations
FROM profiles_recruiter
WHERE company_name IS NOT NULL
ON CONFLICT DO NOTHING;

-- Link recruiters to companies
UPDATE profiles_recruiter r
SET company_id = c.id
FROM companies c
WHERE r.company_name = c.name;

-- Keep legacy fields on profiles_recruiter for backward compatibility
```

---

### 1.5 `referrals` → `referrals`

| V1 Column | V2 Column | Action |
|-----------|-----------|--------|
| `id` | `id` | **KEEP** |
| `requester_id` | `requester_id` | **KEEP** |
| `professional_id` | `professional_id` | **KEEP** |
| `job_id` | `job_id` | **KEEP** |
| `job_title` | `job_title` | **KEEP** |
| `status` | `status` | **MAP** to V2 enum |
| `pipeline_stage` | `pipeline_stage` | **KEEP** |
| `progress` | `progress` | **KEEP** |
| `created_at` | `created_at` | **KEEP** |
| `note` | `note` | **KEEP** |
| `pass_reason` | `pass_reason` | **KEEP** |
| `relationship_type` | `relationship_type` | **KEEP** |
| `relationship_note` | `relationship_note` | **KEEP** |
| `policy_acknowledged` | `policy_acknowledged` | **KEEP** |
| — | `match_id` | **NEW** | Default NULL |
| — | `updated_at` | **NEW** | Set to `now()` |
| — | `accepted_at` | **NEW** | Derive from status history if available |
| — | `submitted_at` | **NEW** | Derive from status history if available |
| — | `closed_at` | **NEW** | Derive from status history if available |
| — | `deleted_at` | **NEW** | Default `NULL` |

**Migration SQL:**
```sql
ALTER TABLE referrals ADD COLUMN match_id UUID REFERENCES matches(id);
ALTER TABLE referrals ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE referrals ADD COLUMN accepted_at TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN submitted_at TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN closed_at TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN deleted_at TIMESTAMPTZ;

-- Backfill timestamps from status
UPDATE referrals SET accepted_at = updated_at WHERE status IN ('accepted', 'referral_submitted', 'application_submitted', 'closed');
UPDATE referrals SET submitted_at = updated_at WHERE status IN ('referral_submitted', 'application_submitted', 'closed');
UPDATE referrals SET closed_at = updated_at WHERE status = 'closed';
```

---

### 1.6 `jobs` → `jobs`

| V1 Column | V2 Column | Action |
|-----------|-----------|--------|
| All V1 columns | V2 columns | **KEEP** (1:1 mapping) |
| — | `company_id` | **NEW** | Link to companies table |
| — | `track` | **NEW** | Default 'early_career' |
| — | `closed_at` | **NEW** | Derive from status |
| — | `expires_at` | **NEW** | Default NULL |
| — | `deleted_at` | **NEW** | Default `NULL` |
| — | `updated_at` | **NEW** | Set to `now()` |

---

### 1.7 `conversations` → `conversations`

| V1 Column | V2 Column | Action |
|-----------|-----------|--------|
| All V1 columns | V2 columns | **KEEP** (1:1 mapping) |
| — | `last_message_at` | **NEW** | Derive from latest message |

---

### 1.8 `messages` → `messages`

| V1 Column | V2 Column | Action |
|-----------|-----------|--------|
| All V1 columns | V2 columns | **KEEP** (1:1 mapping) |
| `read` | `is_read` | **RENAME** |
| — | `read_at` | **NEW** | Default NULL |

---

### 1.9 `notifications` → `notifications`

| V1 Column | V2 Column | Action |
|-----------|-----------|--------|
| All V1 columns | V2 columns | **KEEP** (1:1 mapping) |
| — | `channel` | **NEW** | Default 'in_app' |
| — | `entity_type` | **NEW** | Default NULL |
| — | `entity_id` | **NEW** | Default NULL |
| — | `read_at` | **NEW** | Derive from `read` flag |

---

### 1.10 `verification_requests` → `identity_verifications`

| V1 Column | V2 Column | Action |
|-----------|-----------|--------|
| `id` | `id` | **KEEP** |
| `user_id` | `user_id` | **KEEP** |
| `request_type` | `type` | **MAP** 'email_otp' → 'email_otp', 'id_card' → 'id_card' |
| `status` | `status` | **MAP** 'pending' → 'pending', 'approved' → 'approved', 'rejected' → 'rejected' |
| `work_email` | `work_email` | **KEEP** |
| `id_card_url` | `id_card_url` | **KEEP** |
| `created_at` | `created_at` | **KEEP** |
| `reviewed_at` | `reviewed_at` | **KEEP** |
| — | `verification_data` | **NEW** | Default '{}' |
| — | `reviewed_by` | **NEW** | Default NULL |
| — | `rejection_reason` | **NEW** | Default NULL |
| — | `expires_at` | **NEW** | Default NULL |
| — | `linkedin_url` | **NEW** | Default NULL |
| — | `employer_name` | **NEW** | Default NULL |
| — | `updated_at` | **NEW** | Set to `now()` |

---

### 1.11 Other Tables (1:1 mapping, minimal changes)

| V1 Table | V2 Table | Action |
|----------|----------|--------|
| `bookmarks` | `bookmarks` | Add `deleted_at` |
| `admin_logs` | `admin_logs` | No changes |
| `error_logs` | `error_logs` | No changes |
| `reports` | `reports` | Add `updated_at` |
| `platform_settings` | `platform_settings` | No changes |
| `announcements` | `announcements` | No changes |
| `invites` | `invites` | No changes |
| `utm_events` | `utm_events` | No changes |
| `nps_responses` | `nps_responses` | No changes |
| `profile_drafts` | `profile_drafts` | Add `updated_at` |

---

### 1.12 New V2 Tables (No V1 Equivalent)

| V2 Table | Seed Strategy |
|----------|---------------|
| `skills` | Seed from V1 `profiles_professional.skills` + `profiles_job_seeker.skills` arrays (deduplicate) |
| `skill_aliases` | Seed common aliases (e.g., 'js' → 'javascript') |
| `profile_skills` | Migrate from V1 `skills` text[] arrays on both profile tables |
| `companies` | Migrate from `profiles_recruiter.company_name` (deduplicate) |
| `trust_scores` | Compute from V1 data using `calculate_trust_score()` |
| `identity_verifications` | Migrate from `verification_requests` |
| `verification_badges` | Compute from V1 `users.verified` + `users.professional_verified` |
| `job_skills` | Empty (no V1 equivalent) |
| `applications` | Empty (no V1 equivalent) |
| `matches` | Empty (no V1 equivalent) |
| `professional_capacities` | Derive from V1 `profiles_professional.referral_capacity` + `referrals_used` |
| `screening_criteria` | Seed with default criteria |
| `screening_attempts` | Empty (no V1 equivalent) |
| `state_history` | Empty (no V1 equivalent — starts fresh at cutover) |
| `notification_preferences` | Seed with defaults for all existing users |
| `email_delivery_log` | Empty (no V1 equivalent) |

---

## 2. Identity Reconciliation

### Decision: Keep V1 UUIDs
- **Action:** Preserve all V1 `users.id` UUIDs in V2
- **Rationale:** All FK references (profiles, referrals, jobs, messages, etc.) depend on user UUIDs. Regenerating would require updating every FK in every table.
- **Risk:** Low. UUIDs are globally unique and portable.

### Password Migration
- **V1:** Supabase Auth with PKCE flow
- **V2:** Same Supabase Auth
- **Action:** No password migration needed. Supabase Auth handles password hashing internally. V1 users log in with same credentials.
- **Edge case:** If V1 used a different Supabase project, passwords don't transfer. But we're using the SAME Supabase project, so this is not an issue.

### Session Invalidation
- **Action:** At cutover, Supabase Auth will continue managing sessions. No forced re-login needed unless we rotate the JWT secret.
- **Recommendation:** Do NOT rotate JWT secret at cutover. This avoids forcing all users to re-login.

---

## 3. Skills Migration

### Step 1: Extract all unique skills from V1
```sql
-- From professional profiles
SELECT DISTINCT unnest(skills) AS skill FROM profiles_professional WHERE skills IS NOT NULL
UNION
-- From job seeker profiles
SELECT DISTINCT unnest(skills) AS skill FROM profiles_job_seeker WHERE skills IS NOT NULL;
```

### Step 2: Insert into skills table
```sql
INSERT INTO skills (name, category, slug)
SELECT DISTINCT
  lower(trim(unnested)),
  'general',  -- default category, refine later
  lower(trim(unnested))
FROM (
  SELECT unnest(skills) AS unnested FROM profiles_professional WHERE skills IS NOT NULL
  UNION
  SELECT unnest(skills) FROM profiles_job_seeker WHERE skills IS NOT NULL
) sub
ON CONFLICT (name) DO NOTHING;
```

### Step 3: Populate profile_skills join table
```sql
-- Professional skills
INSERT INTO profile_skills (profile_type, profile_id, skill_id)
SELECT 'professional', p.user_id, s.id
FROM profiles_professional p
CROSS JOIN unnest(p.skills) AS skill_name
JOIN skills s ON s.name = lower(trim(skill_name))
ON CONFLICT DO NOTHING;

-- Job seeker skills
INSERT INTO profile_skills (profile_type, profile_id, skill_id)
SELECT 'job_seeker', p.user_id, s.id
FROM profiles_job_seeker p
CROSS JOIN unnest(p.skills) AS skill_name
JOIN skills s ON s.name = lower(trim(skill_name))
ON CONFLICT DO NOTHING;
```

### Step 4: Update skill popularity
```sql
UPDATE skills SET popularity = (
  SELECT COUNT(*) FROM profile_skills WHERE skill_id = skills.id
);
```

---

## 4. Trust Score Backfill

```sql
-- Grandfather V1 verified users to 'verified' tier
INSERT INTO trust_scores (user_id, score, tier, response_reliability, acceptance_rate, referral_quality, profile_quality)
SELECT
  id,
  CASE WHEN verified THEN 85 ELSE 30 END,
  CASE WHEN verified THEN 'verified' ELSE 'unverified' END,
  0, 0, 0, 0  -- will be recalculated by trigger
FROM users
WHERE role IN ('professional', 'job_seeker')
ON CONFLICT (user_id) DO NOTHING;

-- Recalculate scores for active professionals
SELECT calculate_trust_score(user_id)
FROM profiles_professional
WHERE open_for_referrals = true;
```

---

## 5. Capacity Backfill

```sql
-- Create current month capacity for all professionals
INSERT INTO professional_capacities (user_id, period_start, period_end, max_capacity, used)
SELECT
  user_id,
  date_trunc('month', CURRENT_DATE)::date,
  (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date,
  referral_capacity,
  referrals_used
FROM profiles_professional
WHERE open_for_referrals = true
ON CONFLICT (user_id, period_start) DO NOTHING;
```

---

## 6. Notification Preferences Seed

```sql
-- Create default preferences for all existing users
INSERT INTO notification_preferences (user_id, type, channel, enabled)
SELECT
  u.id,
  unnest(ARRAY['referral_request', 'referral_update', 'message', 'job_match', 'system']),
  unnest(ARRAY['in_app', 'in_app', 'in_app', 'in_app', 'in_app']),
  true
FROM users u
WHERE u.deleted_at IS NULL
ON CONFLICT (user_id, type, channel) DO NOTHING;
```

---

## 7. State History Seeding

V1 referral state changes are lost (overwrites). At cutover, create initial state_history entries for all existing referrals:

```sql
-- Create initial state_history for existing referrals
INSERT INTO state_history (entity_type, entity_id, field, old_value, new_value, changed_by, reason, created_at)
SELECT
  'referral',
  id,
  'status',
  'requested',
  status::text,
  professional_id,
  'Migration from V1',
  created_at
FROM referrals
WHERE deleted_at IS NULL;
```

---

## 8. Validation Queries

After migration, run these to verify:

```sql
-- Row count comparison
SELECT 'users' AS tbl, (SELECT COUNT(*) FROM users) AS v2_count
UNION ALL SELECT 'profiles_professional', (SELECT COUNT(*) FROM profiles_professional)
UNION ALL SELECT 'profiles_job_seeker', (SELECT COUNT(*) FROM profiles_job_seeker)
UNION ALL SELECT 'referrals', (SELECT COUNT(*) FROM referrals WHERE deleted_at IS NULL)
UNION ALL SELECT 'jobs', (SELECT COUNT(*) FROM jobs WHERE deleted_at IS NULL)
UNION ALL SELECT 'conversations', (SELECT COUNT(*) FROM conversations)
UNION ALL SELECT 'messages', (SELECT COUNT(*) FROM messages);

-- FK integrity
SELECT 'orphaned_professional_profiles' AS issue, COUNT(*)
FROM profiles_professional p LEFT JOIN users u ON u.id = p.user_id WHERE u.id IS NULL
UNION ALL
SELECT 'orphaned_jobseeker_profiles', COUNT(*)
FROM profiles_job_seeker p LEFT JOIN users u ON u.id = p.user_id WHERE u.id IS NULL
UNION ALL
SELECT 'orphaned_referrals', COUNT(*)
FROM referrals r LEFT JOIN users u ON u.id = r.requester_id WHERE u.id IS NULL
UNION ALL
SELECT 'orphaned_jobs', COUNT(*)
FROM jobs j LEFT JOIN users u ON u.id = j.recruiter_id WHERE u.id IS NULL;

-- Trust score distribution
SELECT tier, COUNT(*) FROM trust_scores GROUP BY tier;

-- Skills migration
SELECT 'skills_master' AS tbl, COUNT(*) FROM skills
UNION ALL SELECT 'profile_skills_rows', COUNT(*) FROM profile_skills;

-- Profile completeness
SELECT 'avg_completeness_professional' AS metric, AVG(profile_completeness) FROM profiles_professional
UNION ALL SELECT 'avg_completeness_jobseeker', AVG(profile_completeness) FROM profiles_job_seeker;
```

---

## 9. Rollback Procedure

If migration fails:

1. **Restore V1 snapshot:**
   ```bash
   dropdb directrefer_v2
   createdb directrefer_v2
   psql directrefer_v2 < v1_snapshot.sql
   ```

2. **Repoint application to V1 database** (update `SUPABASE_URL` and `SUPABASE_ANON_KEY` if needed)

3. **Maximum acceptable data loss:** 0 rows (full restore from snapshot)

---

## 10. Migration Script Execution Order

1. Create V2 extensions and types
2. Create V2 tables (all new tables first)
3. Add V2 columns to existing tables
4. Transform data (JSON strings → JSONB, skills arrays → join tables)
5. Seed new tables (skills, companies, trust_scores, capacities, preferences)
6. Backfill computed fields (profile_completeness, preferred_track)
7. Create triggers and functions
8. Enable RLS and create policies
9. Create indexes
10. Run validation queries
