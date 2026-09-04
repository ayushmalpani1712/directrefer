# DirectRefer Backend API Documentation

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Client (React)                     │
│  Supabase anon client (RLS-respected reads/writes)  │
└──────────────┬──────────────────────────┬───────────┘
               │ GET /api/me              │ CRUD via Supabase client
               │ Admin operations         │ (RLS enforced)
               │ Job/Referral management  │
               ▼                          ▼
┌─────────────────────────────────────────────────────┐
│              Vercel Serverless Functions              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  /api/me     │  │ /api/admin/* │  │ /api/jobs  │ │
│  │  /api/ref/*  │  │              │  │            │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                │                 │         │
│    ┌────▼────────────────▼─────────────────▼────┐   │
│    │           Auth Middleware                    │   │
│    │  1. Extract Bearer token from header        │   │
│    │  2. Verify JWT via supabase.auth.getUser()  │   │
│    │  3. Fetch profile from users table          │   │
│    │  4. Check role against required roles       │   │
│    └────────────────────┬───────────────────────┘   │
│                         │                           │
│    ┌────────────────────▼───────────────────────┐   │
│    │      Service-role Supabase Client           │   │
│    │  Bypasses RLS (server-side only)            │   │
│    │  Used AFTER auth verification               │   │
│    └────────────────────┬───────────────────────┘   │
└─────────────────────────┼───────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────┐
│                  PostgreSQL (Supabase)                │
│  RLS policies enforce row-level access               │
│  Triggers auto-create profiles on signup             │
│  SECURITY DEFINER functions for admin operations     │
└─────────────────────────────────────────────────────┘
```

## Authentication

All protected endpoints require a valid JWT in the `Authorization` header:

```
Authorization: Bearer <supabase_access_token>
```

### How It Works

1. Client calls `supabase.auth.getSession()` to get the access token
2. Token is sent in `Authorization: Bearer <token>` header
3. Server verifies token via `supabase.auth.getUser(token)` (service-role client)
4. Server fetches the user's profile from `public.users` to get the `role`
5. If role is not in the allowed list, returns 403

### Role Extraction

Roles are stored in the `public.users` table (set on signup via the `on_auth_user_created` trigger). The role is NOT in the JWT claims — it's fetched from the database on each API call. This ensures:
- Role changes take effect immediately (no stale JWT)
- No client-side JWT manipulation possible
- Single source of truth in the database

## API Endpoints

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/me` | Required | Get current user profile |

### Jobs

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/api/jobs` | Required | All | List jobs (filtered by role) |
| `POST` | `/api/jobs` | Required | recruiter, admin | Create a job |
| `GET` | `/api/jobs/:id` | Required | All | Get a single job |
| `PUT` | `/api/jobs/:id` | Required | recruiter (own), admin | Update a job |
| `DELETE` | `/api/jobs/:id` | Required | recruiter (own), admin | Delete a job |

### Referrals

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/api/referrals` | Required | All (filtered) | List referrals |
| `POST` | `/api/referrals` | Required | job_seeker, admin | Create a referral request |
| `GET` | `/api/referrals/:id` | Required | Owner, professional, admin | Get a single referral |
| `PATCH` | `/api/referrals/:id/status` | Required | professional (own), admin | Update referral status |
| `DELETE` | `/api/referrals/:id` | Required | requester (pending), admin | Delete a referral |

### Admin

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/api/admin/users` | Required | admin | List all users |
| `PATCH` | `/api/admin/users/:id/role` | Required | admin | Change user role |
| `PATCH` | `/api/admin/users/:id/status` | Required | admin | Ban/suspend/reactivate user |
| `DELETE` | `/api/admin/users/:id` | Required | admin | Delete user |
| `GET` | `/api/admin/jobs` | Required | admin | List all jobs |
| `PATCH` | `/api/admin/jobs/:id/status` | Required | admin | Change job status |
| `DELETE` | `/api/admin/jobs/:id` | Required | admin | Delete a job |

## Request/Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Created Response (201)

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "details": [
    { "path": "title", "message": "Required" }
  ]
}
```

### Pagination Response

```json
{
  "success": true,
  "data": {
    "jobs": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

## RBAC Matrix

| Resource | job_seeker | professional | recruiter | admin |
|----------|-----------|--------------|-----------|-------|
| **Own profile** | Read/Update | Read/Update | Read/Update | Full |
| **Other profiles** | Read (active) | Read (active) | Read (active) | Full |
| **Jobs** | Read (active) | Read (active) | CRUD (own) + Read (active) | Full |
| **Referrals** | Create (own) + Read (own) | Read (own) + Update (own) | — | Full |
| **Notifications** | Read/Update (own) | Read/Update (own) | Read/Update (own) | Full |
| **Reports** | Create + Read (own) | Create + Read (own) | Create + Read (own) | Full |
| **Admin logs** | — | — | — | Read/Create |
| **Platform settings** | Read | Read | Read | Full |

## Validation

All input payloads are validated using Zod schemas:

- **CreateJob**: title (required, max 200), company_name, department, location, description, type, salary_range, stage
- **CreateReferral**: professional_id (UUID), job_id (UUID, optional), job_title (required), note
- **UpdateReferralStatus**: status (enum: accepted, rejected, offered, hired)
- **UpdateUserRole**: role (enum: job_seeker, professional, recruiter, admin)
- **BanUser**: status (enum: suspended, deactivated, active), reason

## Rate Limiting

Rate limiting is enforced at the Vercel/CDN level. For additional protection:
- Admin endpoints: logged to `admin_logs` table
- All mutations: server-side validation prevents injection
- JWT verification: prevents token replay

## CORS

API endpoints accept requests from:
- `https://www.directrefer.in`
- `https://directrefer.in`
- `http://localhost:5173` (development)
- `http://localhost:3000` (development)

## File Structure

```
api/
├── lib/
│   ├── auth.js          # JWT verification + role checking
│   ├── cors.js          # CORS headers + preflight handling
│   ├── db.js            # Supabase clients (service + user-scoped)
│   ├── response.js      # JSON response helpers
│   └── validation.js    # Zod schemas for all inputs
├── me.js                # GET /api/me
├── admin.js             # /api/admin/users + /api/admin/jobs (RBAC-guarded)
├── jobs.js              # /api/jobs + /api/jobs/:id
├── referrals.js         # /api/referrals + /api/referrals/:id
├── forgot-password.js   # Password reset token generation (Resend)
└── reset-password.js    # Password reset token validation
```
