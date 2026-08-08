const CACHE_NAME = 'directrefer-v5'
const ASSET_CACHE = 'directrefer-assets-v2'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== ASSET_CACHE).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('supabase')) return
  if (event.request.url.includes('googleapis')) return
  if (event.request.url.includes('gstatic')) return

  const url = new URL(event.request.url)

  // Hashed assets (Vite content-hashed): stale-while-revalidate
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(ASSET_CACHE).then((cache) => cache.put(event.request, clone))
          }
          return response
        }).catch(() => cached)
        return cached || networkFetch
      })
    )
    return
  }

  // Everything else (HTML, API, etc.): always network, never cache
  event.respondWith(fetch(event.request))
})
