# DirectRefer V2.0 — Database Schema & Migration

## Overview

Complete V2.0 database schema for DirectRefer with 40+ tables, 15 enums, 50+ indexes, 30+ RLS policies, and TypeScript implementations for trust scoring, state history, screening, applications, and matching.

## Files

| File | Description |
|------|-------------|
| `schema.sql` | Complete V2.0 schema (tables, enums, indexes, RLS, triggers, functions) |
| `rls-policies.sql` | Full RLS policy definitions with helper functions |
| `index-optimization.sql` | Composite + partial indexes for high-traffic queries |
| `migrate-v1-to-v2.sql` | V1→V2 migration SQL (run against V1 database) |
| `seed-data.sql` | Production-like seed data (10k+ rows) |
| `MIGRATION-MAPPING.md` | V1→V2 table mapping with SQL snippets |
| `CUTOVER-STRATEGY.md` | Hard cutover plan, rollback procedure, success criteria |
| `api-contracts.yaml` | OpenAPI 3.1.0 API specification |

## TypeScript Modules

Located in `src/lib/v2/`:

| Module | Description |
|--------|-------------|
| `trust-score.ts` | Trust score calculation (4 components, 0-100 scale) |
| `state-history.ts` | Immutable state transition recording & querying |
| `screening.ts` | Screening criteria management & execution |
| `applications.ts` | Job application CRUD & status tracking |
| `matching.ts` | Candidate-professional matching algorithm |
| `index.ts` | Barrel exports |

## Trust Score Components

| Component | Weight | Calculation |
|-----------|--------|-------------|
| Response Reliability | 25 | Based on avg_reply_hours (<2h = 25, >48h = 5) |
| Acceptance Rate | 25 | accepted_referrals / total_referrals × 25 |
| Referral Quality | 25 | Based on success_rate (≥80% = 25, <20% = 5) |
| Profile Quality | 25 | profile_completeness% × 25 |

**Tiers:** Verified (≥80), Provisional (50-79), Unverified (<50)

## Matching Algorithm

| Component | Weight | Calculation |
|-----------|--------|-------------|
| Skill Overlap | 40 | matching_required_skills / job_required_skills × 40 |
| Experience Relevance | 25 | Exponential decay based on experience gap |
| Preference Fit | 20 | Industry overlap (10) + location (5) + education (5) |
| Location Proximity | 10 | Exact match (10), region match (6), remote possible (3) |
| Recency | 5 | Exponential decay based on days since last active |

## Referral State Machine

```
requested → under_review → accepted → referral_submitted → application_submitted → closed
                   ↓              ↓
               declined       declined
```

## Applying Migrations

```bash
# 1. Backup V1 database
pg_dump -h db.<ref>.supabase.co -U postgres -d postgres > v1-backup.sql

# 2. Run V2 schema
psql -f v2-schema/schema.sql

# 3. Run RLS policies
psql -f v2-schema/rls-policies.sql

# 4. Run index optimization
psql -f v2-schema/index-optimization.sql

# 5. Run V1→V2 migration
psql -f v2-schema/migrate-v1-to-v2.sql

# 6. Seed data (optional, for dev)
psql -f v2-schema/seed-data.sql
```

## Seed Data Summary

| Table | Rows |
|-------|------|
| skills | 75 |
| skill_aliases | 35 |
| companies | 15 |
| users (job seekers) | 500 |
| users (professionals) | 200 |
| users (recruiters) | 100 |
| jobs | 300 |
| referrals | 500 |
| conversations | 200 |
| messages | 1,000 |
| notifications | 300 |
| bookmarks | 300 |
| applications | 400 |
| matches | 600 |
| state_history | 800 |
| screening_attempts | 250 |
| nps_responses | 40 |
