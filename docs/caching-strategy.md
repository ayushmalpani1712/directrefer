# Caching Strategy — DirectRefer

## Overview

DirectRefer uses a multi-layer caching strategy to balance data freshness with performance. Caching happens at three levels: client-side (React Query + localStorage), CDN (Vercel), and application-level (future Redis).

## Client-Side Caching

### React Query (TanStack Query)

React Query is the primary caching mechanism for server state. It manages stale-while-revalidate, background refetching, and cache invalidation.

```typescript
// src/hooks/useQueryHooks.ts

// Professionals query — cached for 5 minutes, refetches on window focus
export function useProfessionals(enabled = true) {
  return useQuery({
    queryKey: ['professionals'],
    queryFn: fetchProfessionalsFromSupabase,
    staleTime: 5 * 60 * 1000,      // 5 minutes
    gcTime: 30 * 60 * 1000,        // 30 minutes (garbage collection)
    refetchOnWindowFocus: true,
    enabled,
  })
}
```

**Cache configuration guidelines:**

| Data Type | `staleTime` | `gcTime` | `refetchOnWindowFocus` | Rationale |
|---|---|---|---|---|
| User profile | 2 min | 10 min | Yes | Changes infrequently, but should stay current |
| Professional list | 5 min | 30 min | Yes | Expensive query, can tolerate slight staleness |
| Referrals | 1 min | 10 min | Yes | Changes frequently, needs near-real-time |
| Messages | 30s | 5 min | Yes | Real-time expected, use polling as fallback |
| Jobs | 5 min | 30 min | Yes | Changes infrequently |
| Notifications | 30s | 5 min | Yes | Should appear quickly |

### Cache Invalidation

React Query invalidates cache entries explicitly when mutations occur:

```typescript
import { useQueryClient } from '@tanstack/react-query'

export function useReferralMutations() {
  const queryClient = useQueryClient()

  async function createReferral(params: CreateReferralParams) {
    const result = await createReferral(params)
    if (result) {
      // Invalidate related queries so they refetch
      queryClient.invalidateQueries({ queryKey: ['referrals'] })
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
    return result
  }

  return { createReferral }
}
```

**Invalidation rules:**

- After creating/updating a referral → invalidate `['referrals']`, `['professionals']`, `['notifications']`
- After sending a message → invalidate `['conversations']`, `['messages']`
- After updating a profile → invalidate `['userProfile']`, `['professionals']`
- After accepting/rejecting a referral → invalidate `['referrals']`, `['candidates']`

### localStorage Caching

Used for data that persists across sessions and doesn't require real-time freshness:

| Key | Contents | TTL | Purpose |
|---|---|---|---|
| `dr_onboarding_complete` | Boolean | Session | Skip onboarding screens |
| `dr_selected_role` | String | Session | Remember role context |
| `dr_theme` | String | Permanent | Dark/light mode preference |
| `dr_search_filters` | Object | 24 hours | Remember search filters |
| `dr_profile_draft` | Object | 24 hours | Draft profile data |

**Implementation pattern:**

```typescript
// Utility for localStorage with TTL
function setCacheItem<T>(key: string, value: T, ttlMs: number): void {
  const entry = {
    value,
    expiresAt: Date.now() + ttlMs,
  }
  try {
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // Private browsing or quota exceeded — silently ignore
  }
}

function getCacheItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw) as { value: T; expiresAt: number }
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(key)
      return null
    }
    return entry.value
  } catch {
    return null
  }
}
```

## CDN Caching (Vercel)

Vercel's edge network caches static assets and responses based on `Cache-Control` headers defined in `vercel.json`:

```jsonc
{
  "headers": [
    {
      "source": "/index.html",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }
      ]
    }
  ]
}
```

**CDN caching strategy:**

| Asset Type | `Cache-Control` | Why |
|---|---|---|
| `index.html` | `no-cache, no-store, must-revalidate` | SPA entry — must always serve latest version |
| `/assets/*` (hashed bundles) | `max-age=31536000, immutable` | Vite hashes filenames — safe to cache forever |
| `sw.js` | `no-cache, no-store, must-revalidate` | Service worker must update immediately |
| Fonts | `max-age=604800` (1 week) | Fonts rarely change |
| API responses | `no-store` | Dynamic data — never cache at CDN edge |

### Cache Busting

Vite automatically hashes bundle filenames (`app.a1b2c3.js`), so the browser fetches new versions when the HTML references them. No manual cache busting needed for static assets.

For the `index.html`, Vercel's `no-cache` header ensures the latest version is always served, which in turn references the latest hashed bundles.

## Supabase Edge Function Caching

Edge Functions can set their own cache headers:

```typescript
// supabase/functions/my-function/index.ts
Deno.serve(async (req) => {
  const data = await fetchData()

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, s-maxage=120',
      // CDN caches for 2 min, browser caches for 1 min
    },
  })
})
```

**Recommended edge function cache times:**

| Function Type | `max-age` | `s-maxage` | Rationale |
|---|---|---|---|
| Public data (job listings) | 60 | 120 | Changes infrequently |
| User-specific data | 0 | 0 | Never cache personal data |
| Auth-dependent | 0 | 0 | Always fresh auth state |

## Cache Invalidation Strategies

### Time-Based Expiration

The simplest strategy — data expires after a fixed TTL. Used for:
- React Query `staleTime`
- localStorage TTLs
- CDN `max-age` headers

### Event-Based Invalidation

Explicitly invalidate cache when data changes. Used when:
- A mutation occurs (create/update/delete referral)
- A real-time event arrives (new message, referral status change)
- User performs a specific action (mark notification read)

### Version-Based Invalidation

Invalidate if the server reports a newer version:
```typescript
// Check if cached data is still current
const { data: latest } = await supabase
  .from('profiles_professional')
  .select('updated_at')
  .eq('user_id', userId)
  .single()

const cached = getCacheItem(`profile_${userId}`)
if (cached && cached.updatedAt !== latest.updated_at) {
  // Cache is stale — refetch
  invalidateProfile(userId)
}
```

### Real-Time Invalidation

Supabase Realtime subscriptions automatically invalidate relevant cache entries when the underlying data changes:

```typescript
const channel = supabase
  .channel('referral-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'referrals',
  }, () => {
    queryClient.invalidateQueries({ queryKey: ['referrals'] })
  })
  .subscribe()
```

## Future: Redis Integration

For server-side caching (Edge Functions, API routes), Redis provides:

- **Shared cache** across all Vercel function invocations
- **Sub-millisecond** reads for frequently accessed data
- **TTL-based** automatic expiration
- **Pub/Sub** for cache invalidation events

### Planned Redis Use Cases

| Data | TTL | Invalidation |
|---|---|---|
| Professional profile summary | 5 min | On profile update |
| Job listings count | 10 min | On job create/update |
| Search results | 2 min | On any data mutation |
| Rate limiting counters | 1 min | Automatic expiry |
| Session metadata | 30 min | On logout |

### Redis Configuration

```typescript
// lib/redis.ts (planned)
import { createClient } from 'redis'

const redis = createClient({
  url: process.env.REDIS_URL,
})

redis.on('error', (err) => console.error('Redis error:', err))

export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)

  const data = await fetcher()
  await redis.setEx(key, ttlSeconds, JSON.stringify(data))
  return data
}
```

## Monitoring Cache Performance

### React Query DevTools

In development, use React Query DevTools to inspect cache state:
- Cache hit/miss ratio
- Stale vs fresh data
- Background refetch frequency

### Vercel Analytics

Monitor CDN cache performance:
- **Cache hit rate** — should be >80% for static assets
- **Bandwidth saved** — from cached responses
- **Edge latency** — cached responses served in <50ms

### Custom Metrics

```typescript
// Track cache effectiveness
const cacheHits = new Map<string, number>()
const cacheMisses = new Map<string, number>()

function trackCacheHit(key: string) {
  cacheHits.set(key, (cacheHits.get(key) || 0) + 1)
}

function trackCacheMiss(key: string) {
  cacheMisses.set(key, (cacheMisses.get(key) || 0) + 1)
}
```

## Reference

- [React Query Caching](https://tanstack.com/query/latest/docs/framework/react/guides/caching)
- [Vercel CDN Caching](https://vercel.com/docs/edge-network/caching)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
