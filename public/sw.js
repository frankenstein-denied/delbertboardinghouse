const CACHE_NAME = 'delbert-shell-v1'
const APP_SHELL = ['/', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

// App-shell caching only — network-first so residents always see live posts/
// messages when online, falling back to the cached shell when offline.
// No push, no background sync: not requested (see spec's Out of Scope).
//
// Same-origin only, and only fall back to the cached HTML shell for page
// navigations: without the origin guard this handler also claimed
// cross-origin Firestore/Auth SDK traffic (firestore.googleapis.com,
// identitytoolkit.googleapis.com), and a failed Firestore API call would
// resolve with a 200 response containing the cached app shell instead of a
// clean network error — worse than no service worker at all, and a source
// of flaky realtime behavior. Non-navigation same-origin requests that fail
// now fall through to `caches.match(event.request)` (cache-or-nothing)
// rather than silently substituting the shell.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  event.respondWith(
    fetch(event.request).catch(() => {
      if (event.request.mode === 'navigate') return caches.match('/')
      return caches.match(event.request)
    }),
  )
})
