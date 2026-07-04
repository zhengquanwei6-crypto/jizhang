/* Couple Ledger service worker.
   - Navigations (HTML): network-first, so a new deploy is picked up immediately,
     with an offline cache fallback.
   - Hashed build assets (/assets/*): cache-first (content-hashed, safe to cache).
   - Never cache /api or /ws.
   Bump CACHE_VERSION on each release to evict old caches. */
const CACHE_VERSION = 'cl-v2-3-72-polish'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`
const OFFLINE_URLS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(OFFLINE_URLS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws')) return

  // HTML navigations -> network-first.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(STATIC_CACHE).then((c) => c.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/index.html'))),
    )
    return
  }

  // Hashed assets -> cache-first.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone()
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy))
            return res
          }),
      ),
    )
  }
})
