# Migration Rehearsal & Rollback — DirectRefer

## Overview

This document covers procedures for rehearsing database migrations before applying them to production, validating their success, and rolling back if something goes wrong. DirectRefer uses Supabase managed PostgreSQL, so rollback relies on `pg_restore` and backup snapshots.

## Step-by-Step Rehearsal Procedure

### Phase 1: Pre-Migration (Production)

1. **Create a backup of production**
   ```bash
   # Via Supabase Dashboard: Settings > Database > Backups > Create backup
   # Or via CLI:
   supabase db dump --db-url "$DATABASE_URL" -f pre-migration-backup.sql
   ```

2. **Record current state**
   ```sql
   -- Run in Supabase SQL Editor and save results
   SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name)))
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;

   -- Record row counts
   SELECT 'users' as tbl, count(*) FROM users
   UNION ALL SELECT 'referrals', count(*) FROM referrals
   UNION ALL SELECT 'conversations', count(*) FROM conversations
   UNION ALL SELECT 'messages', count(*) FROM messages
   UNION ALL SELECT 'jobs', count(*) FROM jobs
   UNION ALL SELECT 'profiles_professional', count(*) FROM profiles_professional
   UNION ALL SELECT 'profiles_job_seeker', count(*) FROM profiles_job_seeker;
   ```

3. **Document current migration version**
   ```sql
   -- Check which migrations have been applied
   SELECT * FROM supabase_migrations.schema_migrations
   ORDER BY version DESC LIMIT 5;
   ```

### Phase 2: Rehearsal on Staging

4. **Apply migration to staging**
   ```bash
   # Via Supabase CLI
   supabase db push --db-url "$STAGING_DATABASE_URL"

   # Or apply specific SQL file
   psql "$STAGING_DATABASE_URL" -f database/migration.sql
   ```

5. **Run validation queries** (see Validation Queries section below)

6. **Test application against staging**
   ```bash
   # Point local app at staging
   VITE_SUPABASE_URL=$STAGING_SUPABASE_URL VITE_SUPABASE_ANON_KEY=$STAGING_ANON_KEY npm run dev
   ```

7. **Load test staging** (if schema changes affect query performance)
   ```bash
   node scripts/load-test.js --url $STAGING_URL --concurrent 10 --duration 30
   ```

### Phase 3: Production Deployment

8. **Apply migration to production**
   ```bash
   supabase db push --db-url "$DATABASE_URL"
   # Or via Supabase Dashboard SQL Editor
   ```

9. **Run validation queries** (see below)

10. **Smoke test production**
    - Login with test account
    - Create a referral request
    - Send a message
    - Verify all core flows work

11. **Monitor for 15 minutes**
    - Check Supabase Dashboard > Database > Connection pool
    - Monitor Vercel function logs for errors
    - Watch for elevated error rates

## Validation Queries

Run these after every migration to confirm correctness:

### Schema Validation

```sql
-- 1. Verify new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('trust_scores', 'profile_skills', 'screening_criteria')
ORDER BY table_name;

-- 2. Verify new columns exist
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('notice_period', 'work_preference', 'why_me', 'application_url', 'college')
ORDER BY table_name, column_name;

-- 3. Verify indexes were created
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename;
```

### Data Integrity Validation

```sql
-- 4. No orphaned foreign keys
SELECT 'referrals without valid requester' as check, count(*)
FROM referrals r
LEFT JOIN users u ON r.requester_id = u.id
WHERE u.id IS NULL
UNION ALL
SELECT 'referrals without valid professional', count(*)
FROM referrals r
LEFT JOIN users u ON r.professional_id = u.id
WHERE u.id IS NULL
UNION ALL
SELECT 'messages without valid conversation', count(*)
FROM messages m
LEFT JOIN conversations c ON m.conversation_id = c.id
WHERE c.id IS NULL;

-- 5. Check for NULL values in NOT NULL columns
SELECT column_name, table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND is_nullable = 'NO'
  AND column_name IN ('user_id', 'created_at')
ORDER BY table_name, column_name;

-- 6. Verify RLS policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'referrals', 'conversations', 'messages')
ORDER BY tablename, policyname;
```

### Performance Validation

```sql
-- 7. Check for missing indexes on foreign keys
SELECT
  c.relname AS table_name,
  a.attname AS column_name
FROM pg_constraint con
JOIN pg_class c ON con.conrelid = c.oid
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
WHERE con.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.oid
      AND a.attnum = ANY(i.indkey)
  )
  AND c.relname IN ('referrals', 'messages', 'conversations', 'bookmarks', 'notifications');

-- 8. Verify no table bloat
SELECT
  schemaname || '.' || tablename AS table,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 10;

-- 9. Check query plan for critical queries
EXPLAIN (ANALYZE, BUFFERS)
SELECT r.*, u.full_name
FROM referrals r
JOIN users u ON r.professional_id = u.id
WHERE r.professional_id = 'test-user-id'
ORDER BY r.created_at DESC
LIMIT 20;
```

## Rollback Steps Using pg_restore

### Option A: Restore from Supabase Dashboard Backup

1. Go to **Supabase Dashboard > Database > Backups**
2. Select the backup created before migration
3. Click **Restore**
4. Wait for restoration to complete (may take minutes depending on DB size)
5. Verify data integrity

### Option B: Restore from SQL Dump

```bash
# 1. Restore the pre-migration backup
psql "$DATABASE_URL" -f pre-migration-backup.sql

# 2. If the backup was a custom format dump
pg_restore -d "$DATABASE_URL" --clean --if-exists pre-migration-backup.dump

# 3. Verify restoration
psql "$DATABASE_URL" -c "SELECT count(*) FROM users;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM referrals;"
```

### Option C: Selective Rollback (Revert Specific Changes)

If only part of the migration failed, manually revert:

```sql
-- Drop a newly added table that caused issues
DROP TABLE IF EXISTS new_problematic_table CASCADE;

-- Remove a problematic column
ALTER TABLE existing_table DROP COLUMN IF EXISTS problematic_column;

-- Revert a data migration
UPDATE table_name
SET column_name = old_value
WHERE condition;
```

### Option D: Rollback via Migration History

If using Supabase migrations (`supabase/migrations/`):

```bash
# List applied migrations
supabase migration list

# Reset to a specific migration (⚠️ DANGEROUS — drops all data after that point)
supabase db reset --db-url "$DATABASE_URL" --version <migration_version>
```

## Success Criteria Checklist

After every migration, verify ALL of the following:

- [ ] **Schema changes applied** — new tables/columns/indexes exist
- [ ] **No data loss** — row counts match pre-migration baseline (±tolerance)
- [ ] **No orphaned records** — foreign key integrity checks pass
- [ ] **RLS policies active** — security rules applied to new tables
- [ ] **Application loads** — login, dashboard, core flows work
- [ ] **API endpoints respond** — Vercel functions return correct data
- [ ] **No connection errors** — connection pool not exhausted
- [ ] **Performance acceptable** — critical queries complete in <200ms
- [ ] **No console errors** — frontend shows no JavaScript errors
- [ ] **Build succeeds** — `npm run build` completes without errors

## Timing Benchmarks

Record migration duration for each step:

| Operation | Expected Time | Acceptable Max | Notes |
|---|---|---|---|
| Single table CREATE | <1s | 5s | Depends on size |
| Column ADD (nullable) | <1s | 2s | Non-blocking |
| Column ADD (NOT NULL with default) | 1-30s | 60s | Rewrites table if large |
| CREATE INDEX (non-concurrent) | 1-60s | 300s | Locks table |
| CREATE INDEX CONCURRENTLY | 1-60s | 300s | No lock |
| Full table ALTER (rewrite) | 30s-5min | 15min | Depends on row count |
| pg_restore (small DB <100MB) | 1-5min | 15min | Full restore |
| pg_restore (medium DB 100MB-1GB) | 5-30min | 60min | Full restore |
| pg_restore (large DB >1GB) | 30min-2hr | 4hr | Full restore |

### Timing the Migration

```bash
# Record start time
START=$(date +%s)
echo "Migration started at: $(date)"

# Run migration
psql "$DATABASE_URL" -f migration.sql

# Record end time
END=$(date +%s)
DURATION=$((END - START))
echo "Migration completed in: ${DURATION}s"
```

## Pre-Migration Checklist

Before running any migration:

- [ ] Migration tested on staging
- [ ] Backup created
- [ ] Rollback plan documented
- [ ] Team notified of maintenance window (if applicable)
- [ ] Monitoring alerts configured
- [ ] Migration script reviewed
- [ ] No breaking changes to API contracts (or versioned)

## Post-Migration Checklist

After migration completes:

- [ ] Validation queries pass
- [ ] Application smoke test passes
- [ ] Error rates within normal range
- [ ] No increased latency
- [ ] Team notified of completion
- [ ] Migration recorded in changelog

## Reference

- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)
- [Supabase Migration Guide](https://supabase.com/docs/guides/cli/database-migrations)
