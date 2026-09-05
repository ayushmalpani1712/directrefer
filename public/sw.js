const ASSET_CACHE = 'directrefer-assets-v3'
const IMAGE_CACHE = 'directrefer-images-v1'
const FONT_CACHE = 'directrefer-fonts-v1'

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
        keys.filter((k) => k !== ASSET_CACHE && k !== IMAGE_CACHE && k !== FONT_CACHE)
          .map((k) => caches.delete(k))
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

  // Images: cache-first with network fallback
  if (event.request.destination === 'image' || /\.(png|jpg|jpeg|gif|webp|svg|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(IMAGE_CACHE).then((cache) => cache.put(event.request, clone))
          }
          return response
        }).catch(() => new Response('', { status: 408 }))
      })
    )
    return
  }

  // Fonts: cache-first
  if (event.request.destination === 'font' || url.pathname.includes('/fonts/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(FONT_CACHE).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // HTML navigation: network-first with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    )
    return
  }

  // Everything else: network
  event.respondWith(fetch(event.request))
})
