# DirectRefer V2.0 — Cutover Strategy

**Status:** Ready for Execution
**Date:** 2026-09-09
**Treatment:** REBUILD — hard cutover (no dual-running)

---

## 1. Strategy Selection: Hard Cutover

### Why Hard Cutover (Not Dual-Running)

| Factor | Dual-Running | Hard Cutover |
|--------|-------------|--------------|
| Complexity | High — need dual-write bridge, sync logic, conflict resolution | Low — single source of truth |
| Data divergence risk | Real — writes to V1 and V2 can conflict | None — only one system active |
| Duration | Extended — weeks of parallel operation | Single maintenance window |
| Rollback | Easier — just stop V2, V1 is still live | Requires database restore |

**Decision:** Hard cutover. The V1 and V2 schemas are too different for dual-running to be practical. The risk of data divergence outweighs the rollback convenience.

**Trade-off:** If cutover fails, we restore from V1 snapshot. Maximum data loss = changes made during the maintenance window (typically 0 if users are informed).

---

## 2. Pre-Cutover Checklist

### 2.1 Staging Environment (Week -2)

- [ ] Stand up staging Supabase project (or use local Postgres)
- [ ] Restore V1 snapshot to staging
- [ ] Run full migration script against staging
- [ ] Run validation queries from MIGRATION-MAPPING.md §8
- [ ] Deploy V2 application code to staging
- [ ] Test all critical flows:
  - [ ] Login (email/password, Google, LinkedIn)
  - [ ] Profile creation/editing (all 3 types)
  - [ ] Referral request → accept → submit → close
  - [ ] Job posting → apply
  - [ ] Messages
  - [ ] Notifications
  - [ ] Admin actions
- [ ] Load test with 10k+ rows
- [ ] Performance baseline for matching queries
- [ ] Document any issues found

### 2.2 Staging Validation Results

| Check | Result | Notes |
|-------|--------|-------|
| Row counts match V1 | | |
| No orphaned FKs | | |
| Trust scores computed | | |
| Skills migrated | | |
| RLS policies work | | |
| All API endpoints respond | | |
| Login flow works | | |
| Referral flow works | | |

### 2.3 Code Freeze (Week -1)

- [ ] V1 feature freeze — no new features on V1 after this point
- [ ] V2 code freeze — only bug fixes, no new features
- [ ] All V2 code merged to `main`
- [ ] All V2 tests passing
- [ ] Vercel preview deployment verified

### 2.4 User Communication (Week -1)

- [ ] Email to all users: "Scheduled maintenance on [date]"
- [ ] Banner on app: "Maintenance window: [time] to [time]"
- [ ] Social media announcement
- [ ] Status page updated

---

## 3. Cutover Execution

### Timeline: 2-hour maintenance window

| Step | Time | Action | Owner | Duration |
|------|------|--------|-------|----------|
| 1 | T+0 | Enable maintenance mode (Vercel header) | — | 1 min |
| 2 | T+1 | Take V1 database snapshot (pg_dump) | — | 5 min |
| 3 | T+6 | Run V2 migration script against production | — | 10 min |
| 4 | T+16 | Run validation queries | — | 5 min |
| 5 | T+21 | Deploy V2 application code | — | 3 min |
| 6 | T+24 | Smoke test critical flows | — | 15 min |
| 7 | T+39 | Disable maintenance mode | — | 1 min |
| 8 | T+40 | Monitor error rates for 1 hour | — | 60 min |

### Step 1: Enable Maintenance Mode

```bash
# Vercel: add maintenance header
# OR: Update vercel.json to serve maintenance page
```

### Step 2: Take V1 Snapshot

```bash
pg_dump "postgresql://[user]:[pass]@db.ecdqnysmosxmojhvxbdu.supabase.co:5432/postgres" > v1_pre_cutover_$(date +%Y%m%d_%H%M).sql
```

### Step 3: Run V2 Migration

```bash
# Connect to production database
psql "postgresql://[user]:[pass]@db.ecdqnysmosxmojhvxbdu.supabase.co:5432/postgres" < v2-schema/migrate-v1-to-v2.sql
```

### Step 4: Validation

Run all queries from MIGRATION-MAPPING.md §8. All must pass before proceeding.

### Step 5: Deploy V2 Code

```bash
git tag v2.0.0
git push origin v2.0.0
# Vercel auto-deploys from main branch
```

### Step 6: Smoke Test

Test these flows in production:
- [ ] Login as existing user
- [ ] View profile
- [ ] Create referral request
- [ ] Accept referral (as professional)
- [ ] Send message
- [ ] View notifications
- [ ] Admin panel access

### Step 7: Disable Maintenance Mode

Remove maintenance header/page from Vercel config.

### Step 8: Monitor

Watch for 1 hour:
- [ ] Vercel error rate
- [ ] Supabase database CPU/load
- [ ] API response times
- [ ] User-reported issues

---

## 4. Rollback Plan

### Trigger: Rollback if ANY of these occur

- Validation queries fail (orphaned FKs, missing data)
- Login flow broken for any user
- Referral flow broken
- Database error rate > 1% of requests
- Data loss detected (missing profiles, missing referrals)

### Rollback Procedure

**Maximum time to rollback: 15 minutes**

1. **Stop V2 traffic:**
   - Enable maintenance mode immediately
   - This prevents new V2 writes

2. **Restore V1 database:**
   ```bash
   # Drop V2 database
   dropdb directrefer_production
   
   # Restore V1 snapshot
   createdb directrefer_production
   psql directrefer_production < v1_pre_cutover_YYYYMMDD_HHMM.sql
   ```

3. **Redeploy V1 code:**
   ```bash
   git checkout v1.0.0  # or last V1 tag
   git push origin main
   # Vercel auto-deploys
   ```

4. **Disable maintenance mode**

5. **Communicate to users:**
   - "We experienced issues and have restored service"
   - "Your data is safe"

### Maximum Acceptable Data Loss

- **During cutover:** 0 rows (full restore from snapshot)
- **After cutover:** If V2 runs for hours before rollback, any V2-only data (new referrals, messages) is lost. Accept this risk by limiting the monitoring window before declaring cutover successful.

### Rollback Decision Authority

- **Auto-rollback:** If validation queries fail → rollback immediately
- **Manual rollback:** If error rate > 1% for 5 minutes → D1 decides
- **No rollback:** After 1 hour of stable operation → cutover declared successful

---

## 5. Post-Cutover

### Immediate (First 24 hours)
- [ ] Monitor error rates
- [ ] Monitor database performance
- [ ] Respond to user reports
- [ ] No new features — stability only

### Short-term (First week)
- [ ] Review audit logs for anomalies
- [ ] Check trust score distributions
- [ ] Verify email delivery
- [ ] Clean up any V1 artifacts (old API endpoints, unused code)

### Medium-term (First month)
- [ ] GDPR audit — verify consent flags are set correctly
- [ ] Performance optimization based on real query patterns
- [ ] User feedback collection
- [ ] Plan Phase 1 features

---

## 6. Contact & Escalation

| Role | Name | Contact |
|------|------|---------|
| D1 (Decision Maker) | Ayush | — |
| Database | — | — |
| Frontend | — | — |
| DevOps | — | — |

**Escalation path:** Issue → D1 → Rollback decision within 5 minutes.

---

## 7. Success Criteria

Cutover is declared successful when:

- [ ] All validation queries pass
- [ ] All critical flows work in production
- [ ] Error rate < 0.1% for 1 hour post-cutover
- [ ] No data loss reported
- [ ] Database performance within acceptable limits
