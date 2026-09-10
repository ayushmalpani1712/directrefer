# Staging Environment Setup — DirectRefer

## Overview

DirectRefer uses a staging environment that mirrors production to safely test changes before deployment. The staging stack consists of:

- **Supabase staging project** — separate database with production-like data
- **Vercel preview deployments** — automatic preview URLs for every PR
- **Environment isolation** — completely separate credentials and data

## Supabase Staging Project Setup

### 1. Create the Staging Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Configure:
   - **Organization**: Same as production
   - **Project name**: `directrefer-staging`
   - **Database password**: Generate a strong, unique password
   - **Region**: Same as production (closest to target users)
   - **Pricing plan**: Free tier is sufficient for staging
4. Wait for project provisioning (~2 minutes)

### 2. Initialize Schema

Apply all database migrations to the staging project:

```bash
# Option A: Via Supabase CLI
supabase link --project-ref <staging-project-ref>
supabase db push

# Option B: Via SQL Editor
# Run each SQL file in order from database/ directory:
psql "$STAGING_DATABASE_URL" -f database/03-verification-requests.sql
psql "$STAGING_DATABASE_URL" -f database/04-message-read-receipts.sql
# ... continue for all migration files
```

### 3. Apply V2 Schema

```bash
# Apply the V2 schema from v2-schema/ directory
psql "$STAGING_DATABASE_URL" -f v2-schema/001-schema.sql
psql "$STAGING_DATABASE_URL" -f v2-schema/002-seed.sql
```

### 4. Configure Auth Providers

In the Supabase Dashboard for staging:

1. Go to **Authentication > Providers**
2. Enable Google OAuth (if using in production)
3. Use **separate** Google Cloud credentials for staging
4. Set redirect URLs:
   ```
   https://<staging-project-ref>.supabase.co/auth/v1/callback
   http://localhost:5173/auth/callback
   ```

### 5. Configure Storage Buckets

```sql
-- Run in SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;
```

### 6. Set Up RLS Policies

All RLS policies from production must be applied to staging. Verify with:

```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Environment Variables Configuration

### Staging Environment Variables

Create these in the Vercel project under **Settings > Environment Variables > Preview**:

| Variable | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<staging-ref>.supabase.co` | Staging project URL |
| `VITE_SUPABASE_ANON_KEY` | `<staging-anon-key>` | Staging anon key |
| `SUPABASE_URL` | `https://<staging-ref>.supabase.co` | Server-side (same) |
| `SUPABASE_SERVICE_ROLE_KEY` | `<staging-service-role-key>` | Staging service role |
| `VITE_GOOGLE_CLIENT_ID` | `<staging-google-client-id>` | Separate Google project |
| `RESEND_API_KEY` | `<staging-resend-key>` | Use test domain |
| `FROM_EMAIL` | `DirectRefer <noreply@staging.directrefer.in>` | Staging email |
| `RESUME_SIGNING_SECRET` | `<staging-signing-secret>` | Different from production |

### .env.staging Template

```bash
# Supabase Staging
VITE_SUPABASE_URL=https://<staging-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<staging-anon-key>

# Google OAuth (Staging)
VITE_GOOGLE_CLIENT_ID=<staging-google-client-id>

# Supabase Server-Side (Staging)
SUPABASE_URL=https://<staging-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>

# Resend (Staging)
RESEND_API_KEY=<staging-resend-key>
FROM_EMAIL=DirectRefer <noreply@staging.directrefer.in>

# Resume Token Signing (Staging)
RESUME_SIGNING_SECRET=<staging-signing-secret>

# VAPID (Staging)
VAPID_PUBLIC_KEY=<staging-vapid-public-key>
VAPID_PRIVATE_KEY=<staging-vapid-private-key>
VITE_VAPID_PUBLIC_KEY=<staging-vapid-public-key>

# WhatsApp (Staging)
WHATSAPP_PHONE_NUMBER_ID=<staging-phone-number-id>
WHATSAPP_ACCESS_TOKEN=<staging-access-token>
WHATSAPP_VERIFY_TOKEN=<staging-verify-token>
VITE_WHATSAPP_BUSINESS_NUMBER=<staging-business-number>
```

## Vercel Preview Deployment Setup

### 1. Link Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import the DirectRefer repository
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`

### 2. Configure Branch Deployments

In **Settings > Git**:

| Branch | Domain | Purpose |
|---|---|---|
| `main` | `www.directrefer.in` | Production |
| `staging` | `directrefer-staging.vercel.app` | Staging |
| PR branches | `directrefer-git-<branch>.vercel.app` | Preview |

### 3. Set Up Preview Environment Variables

In Vercel **Settings > Environment Variables**:

1. Select **Preview** environment
2. Add all staging variables from the table above
3. Scope them to the `staging` branch and PR branches

### 4. Configure Automatic Preview Deployments

Vercel automatically creates preview deployments for every push. To ensure they use staging data:

1. Create `.vercel/project.json`:
   ```json
   {
     "projectId": "<vercel-project-id>",
     "orgId": "<vercel-org-id>"
   }
   ```

2. In **Settings > Build & Development**:
   - **Preview Comments**: Enabled
   - **Build Command**: `npm run build`
   - **Node.js version**: 20

### 5. Custom Domain for Staging

Optional: Add a custom subdomain for staging:

1. In Vercel, go to **Settings > Domains**
2. Add `staging.directrefer.in`
3. Add DNS CNAME record:
   ```
   staging.directrefer.in → cname.vercel-dns.com
   ```

## Data Seeding for Staging

### Option A: Copy Production Data (Subset)

```bash
# Dump production data (exclude sensitive tables)
pg_dump "$PRODUCTION_DATABASE_URL" \
  --data-only \
  --table=users \
  --table=profiles_professional \
  --table=profiles_job_seeker \
  --table=jobs \
  --where="created_at > '2025-01-01'" \
  -f staging-seed.sql

# Anonymize sensitive data
sed -i "s/@.*\.com/@test.example.com/g" staging-seed.sql
sed -i "s/+[0-9]*/+0000000000/g" staging-seed.sql

# Load into staging
psql "$STAGING_DATABASE_URL" -f staging-seed.sql
```

### Option B: Generate Test Data

```sql
-- Generate 50 test users
INSERT INTO users (id, email, full_name, role, created_at)
SELECT
  gen_random_uuid(),
  'user' || i || '@test.example.com',
  'Test User ' || i,
  CASE (i % 3)
    WHEN 0 THEN 'job_seeker'
    WHEN 1 THEN 'professional'
    WHEN 2 THEN 'recruiter'
  END,
  now() - (random() * interval '365 days')
FROM generate_series(1, 50) AS i
ON CONFLICT (id) DO NOTHING;

-- Generate professional profiles for professional users
INSERT INTO profiles_professional (user_id, company_name, job_title, skills, open_for_referrals)
SELECT
  u.id,
  'Company ' || (random() * 100)::int,
  'Software Engineer',
  ARRAY['JavaScript', 'React', 'Node.js'],
  true
FROM users u
WHERE u.role = 'professional'
  AND NOT EXISTS (
    SELECT 1 FROM profiles_professional p WHERE p.user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- Generate 20 test referrals
INSERT INTO referrals (id, requester_id, professional_id, job_title, status, created_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM users WHERE role = 'job_seeker' ORDER BY random() LIMIT 1),
  (SELECT id FROM users WHERE role = 'professional' ORDER BY random() LIMIT 1),
  'Software Engineer',
  (ARRAY['pending', 'accepted', 'rejected', 'referral_submitted'])[1 + (random() * 3)::int],
  now() - (random() * interval '90 days')
FROM generate_series(1, 20)
ON CONFLICT (id) DO NOTHING;
```

### Option C: Use Seed Script

```bash
# If a seed script exists in the project
node scripts/seed-staging.js

# Or via Supabase CLI
supabase db seed --db-url "$STAGING_DATABASE_URL"
```

## Parity Verification Checklist

Verify staging matches production configuration:

### Database Schema

- [ ] All tables present (compare `information_schema.tables`)
- [ ] All columns match (compare `information_schema.columns`)
- [ ] All indexes present (compare `pg_indexes`)
- [ ] All RLS policies active (compare `pg_policies`)
- [ ] All functions defined (compare `pg_proc`)
- [ ] Row counts are representative (>100 rows per major table)

### Authentication

- [ ] Google OAuth flow works end-to-end
- [ ] Email signup/login works
- [ ] Password reset works
- [ ] Session persistence works
- [ ] Auth callback redirects correctly

### API Endpoints

- [ ] `/api/me` returns user profile
- [ ] `/api/jobs` returns job listings
- [ ] `/api/referrals` operations work
- [ ] Edge functions respond correctly

### Frontend

- [ ] Landing page loads
- [ ] Login/signup flows complete
- [ ] Dashboard renders data
- [ ] Professional search works
- [ ] Referral request flow works
- [ ] Messaging works
- [ ] File uploads work (resumes, avatars)

### Performance

- [ ] Initial page load <3s
- [ ] API response times <1s
- [ ] No console errors
- [ ] Build succeeds (`npm run build`)
- [ ] Lighthouse score >80

### Security

- [ ] RLS prevents unauthorized access
- [ ] Service role key not exposed to client
- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] CSP headers present

### Integration

- [ ] Email delivery works (or is mocked)
- [ ] Push notifications work (or are disabled)
- [ ] WhatsApp integration works (or is mocked)
- [ ] Google OAuth works with staging credentials

## Running Staging Locally

```bash
# Use staging environment variables
cp .env.staging .env.local

# Start development server
npm run dev

# The app now connects to staging Supabase
```

## Troubleshooting Staging

| Issue | Cause | Fix |
|---|---|---|
| Login fails | Wrong OAuth credentials | Verify Google Client ID in staging env |
| Data not showing | RLS policies missing | Apply all RLS policies from production |
| Build fails | Missing env vars | Check all required vars are set in Vercel |
| Slow performance | Staging on free tier | Upgrade Supabase plan or reduce test data |
| CORS errors | Wrong origin configured | Update Supabase allowed origins |
| Email not sent | Wrong Resend key | Verify staging Resend API key |

## Reference

- [Supabase Projects](https://supabase.com/docs/guides/platform)
- [Vercel Preview Deployments](https://vercel.com/docs/deployments/preview-deployments)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
