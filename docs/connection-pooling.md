# Connection Pooling — DirectRefer

## Overview

DirectRefer uses Supabase, which provides built-in connection pooling via **PgBouncer**. Supabase databases have two connection paths:

- **Direct connections** — port `5432` (default), limited to ~60 connections on the Pro plan
- **Pooler connections** — port `6543`, uses PgBouncer, supports thousands of concurrent connections

Most Supabase client usage in DirectRefer goes through the **direct port (5432)** since it uses the `@supabase/supabase-js` SDK with short-lived requests. For serverless functions (Vercel Edge Functions), the **pooler port (6543)** is strongly recommended because each invocation spins up a new connection.

## How Supabase Connection Pooling Works

Supabase provisions a single PostgreSQL database with PgBouncer running in front:

```
Client (supabase-js) → PgBouncer (port 6543) → PostgreSQL (port 5432)
```

**Transaction mode** (default): PgBouncer holds connections open only for the duration of a transaction, then returns them to the pool. This is ideal for serverless functions where each invocation is a single transaction.

**Session mode**: The connection is held for the lifetime of the client session. Better for long-running operations but uses more connections.

## PgBouncer Configuration (Supabase)

Supabase manages PgBouncer internally. You can view the current configuration in the Supabase Dashboard under **Settings > Database > Connection Pooling**:

| Setting | Recommended Value |
|---|---|
| `pool_mode` | `transaction` |
| `default_pool_size` | 20 |
| `max_client_conn` | 100 |
| `server_idle_timeout` | 300 |

### Finding Your Pooler Connection String

In the Supabase Dashboard:
1. Go to **Settings > Database**
2. Under **Connection string**, copy the `Transaction` mode URL
3. It looks like: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

## Best Practices for Connection Management

### 1. Use the Pooler for Serverless Functions

In Vercel API routes and Edge Functions, always use port `6543` (pooler) instead of `5432` (direct):

```typescript
// Server-side Supabase client for Vercel functions
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    global: {
      headers: { 'x-my-custom-header': 'my-app-name' },
    },
  }
)
```

### 2. Reuse Clients Across Invocations

In Node.js server environments, reuse the Supabase client instance rather than creating a new one per request:

```typescript
// lib/supabase-admin.ts — singleton pattern
import { createClient } from '@supabase/supabase-js'

let supabase: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}
```

### 3. Keep Transactions Short

Avoid holding transactions open while doing external API calls or heavy computation:

```typescript
// BAD — transaction held open during external call
const { data } = await supabase.from('referrals').select('*').eq('id', id).single()
await sendEmail(data.email) // This could take seconds
await supabase.from('referrals').update({ notified: true }).eq('id', id)

// GOOD — transaction completes quickly
const { data } = await supabase.from('referrals').select('*').eq('id', id).single()
await supabase.from('referrals').update({ notified: true }).eq('id', id)
await sendEmail(data.email) // Send after transaction
```

### 4. Set Connection Timeouts

The Supabase client has built-in timeout handling. For direct PostgreSQL connections (migrations, scripts), always set timeouts:

```typescript
// For scripts that connect directly
import pg from 'pg'
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
})
```

### 5. Handle Connection Errors Gracefully

```typescript
async function fetchWithRetry(fn: () => Promise<unknown>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === retries - 1) throw err
      // Exponential backoff
      await new Promise(r => setTimeout(r, 100 * Math.pow(2, i)))
    }
  }
}
```

## Monitoring Queries

### Check Active Connections

Run in Supabase SQL Editor:

```sql
-- Total active connections
SELECT count(*) FROM pg_stat_activity;

-- Connections by state
SELECT state, count(*)
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;

-- Connections by application name (identify what's using connections)
SELECT application_name, state, count(*)
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY application_name, state
ORDER BY count DESC;
```

### Detect Connection Leaks

```sql
-- Long-running idle connections (potential leaks)
SELECT pid, state, state_change, now() - state_change AS idle_duration
FROM pg_stat_activity
WHERE datname = current_database()
  AND state = 'idle'
ORDER BY idle_duration DESC
LIMIT 20;
```

### Query Performance Under Load

```sql
-- Slow queries in the last hour
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Troubleshooting Connection Exhaustion

### Symptoms

- `FATAL: too many connections for role` error
- `FATAL: connection limit exceeded` error
- Application timeouts that correlate with high traffic
- Vercel function timeouts

### Diagnosis Steps

1. **Check current connection count:**
   ```sql
   SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();
   ```

2. **Check connection limit:**
   ```sql
   SHOW max_connections;
   ```

3. **Identify the culprit:**
   ```sql
   SELECT application_name, client_addr, state, count(*)
   FROM pg_stat_activity
   WHERE datname = current_database()
   GROUP BY application_name, client_addr, state
   ORDER BY count DESC;
   ```

### Resolution

| Cause | Fix |
|---|---|
| Too many direct connections from serverless | Switch to pooler port (6543) |
| Connection leak (idle connections) | Add connection timeout, restart affected services |
| Burst traffic exhausting pool | Enable PgBouncer with `transaction` pool mode |
| Long-running queries holding connections | Optimize queries, add indexes, set `statement_timeout` |

### Emergency: Kill Idle Connections

```sql
-- Terminate connections idle for more than 5 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND state = 'idle'
  AND state_change < now() - interval '5 minutes';
```

## DirectRefer Connection Usage

| Component | Port | Pooling | Notes |
|---|---|---|---|
| Frontend (supabase-js) | 5432 | No (direct) | Short-lived browser requests |
| Vercel API routes | 6543 | Yes (transaction) | Serverless, high concurrency |
| Load testing scripts | 5432 | No (direct) | Testing only, low concurrency |
| Database migrations | 5432 | No (direct) | Admin operations only |

## Reference

- [Supabase Connection Management](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [PgBouncer Documentation](https://www.pgbouncer.org/config.html)
- [Supabase Scaling Guide](https://supabase.com/docs/guides/platform/compute-and-disk)
