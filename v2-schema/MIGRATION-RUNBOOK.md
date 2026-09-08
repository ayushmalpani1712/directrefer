# DirectRefer V2.0 — Migration Runbook

## Prerequisites

1. Access to Supabase Dashboard (project ref: `ecdqnysmosxmojhvxbdu`)
2. PostgreSQL client (`psql`) installed locally
3. V1 database backup completed

## Step 1: Backup V1 Database

```bash
# From Supabase Dashboard > Settings > Database > Connection string
# Use the "Transaction" mode connection string

pg_dump "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" > v1-backup-$(date +%Y%m%d).sql

# Verify backup
wc -l v1-backup-*.sql
```

## Step 2: Run V2 Schema

```bash
# Apply schema (tables, enums, indexes, triggers, functions)
psql "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" -f v2-schema/schema.sql

# Apply RLS policies
psql "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" -f v2-schema/rls-policies.sql

# Apply index optimization
psql "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" -f v2-schema/index-optimization.sql
```

## Step 3: Run V1→V2 Migration

```bash
# Run migration (adds V2 columns, migrates data, creates triggers)
psql "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" -f v2-schema/migrate-v1-to-v2.sql
```

**What this does:**
- Adds V2 columns to existing tables (`trust_score`, `trust_tier`, etc.)
- Creates V2 tables (`trust_scores`, `state_history`, `screening_criteria`, etc.)
- Migrates skills to normalized `skills` + `profile_skills` tables
- Creates companies from recruiter profiles
- Migrates verification requests
- Backfills trust scores for all professionals
- Seeds default screening criteria
- Creates state history entries for existing referrals
- Creates notification preferences for all users
- Creates triggers for `updated_at` columns
- Creates trust tier computation trigger
- Creates job status transition trigger
- Creates screening state machine trigger
- Creates immutable state_history trigger

## Step 4: Seed Data (Optional - Dev/Staging Only)

```bash
# WARNING: This adds 10k+ rows. Skip for production.
psql "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" -f v2-schema/seed-data.sql
```

## Step 5: Verify Migration

Run these queries in Supabase SQL Editor:

```sql
-- Check V2 tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('trust_scores', 'state_history', 'screening_criteria', 'screening_attempts', 'applications', 'matches', 'professional_capacities', 'notification_preferences', 'skill_aliases', 'job_skills')
ORDER BY table_name;

-- Check trust scores were backfilled
SELECT COUNT(*) as trust_score_count FROM trust_scores;

-- Check state history was seeded
SELECT COUNT(*) as state_history_count FROM state_history;

-- Check skills were normalized
SELECT COUNT(*) as skills_count FROM skills;
SELECT COUNT(*) as profile_skills_count FROM profile_skills;

-- Check companies were created
SELECT COUNT(*) as companies_count FROM companies;

-- Verify RLS policies
SELECT schemaname, tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY indexname;
```

## Step 6: Deploy V2 Frontend

The V2 frontend code is already deployed to `main`. Vercel auto-deploys.

**V2 features are gracefully degraded** until migration runs:
- Trust scores show as `—` (not calculated)
- State history recording is skipped
- Screening returns "not available yet"
- Applications use V1 flow

After migration, V2 features activate automatically via probe checks.

## Step 7: Post-Migration Validation

1. **Trust Scores**: Visit a professional's profile → Trust badge should show verified/provisional/unverified
2. **State History**: Accept a referral → Check `state_history` table for new entry
3. **Screening**: Accept a referral → Screening banner should appear
4. **Matching**: Visit FindProfessionals → Match scores should show on cards
5. **Onboarding**: Visit ProfessionalDashboard → Onboarding checklist should appear

## Rollback Procedure

If migration fails:

```bash
# Restore V1 backup
psql "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" < v1-backup-*.sql
```

V2 frontend will gracefully degrade (probe checks return false).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `relation "trust_scores" already exists` | Schema already applied, skip Step 2 |
| `column "trust_score" already exists` | Migration already run, skip Step 3 |
| Trust scores show `—` | Run Step 3 migration, wait 24h for cache expiry |
| Screening shows "not available" | Check `screening_criteria` table has rows |
| RLS errors | Re-run Step 2 RLS policies |
