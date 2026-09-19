// Handles push notifications while the app is closed or in the background.
// Registered by components/pwa/push-notifications.tsx under its own scope
// (/firebase-cloud-messaging-push-scope) so it never competes with sw.js for
// the root scope. FCM only needs a service worker registration to mint a
// token; displaying the notification is done here directly, with no Firebase
// library (and no CDN dependency) in the worker.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { notification: { body: event.data ? event.data.text() : '' } }
  }
  // FCM delivers either { notification, data, fcmOptions } (notification
  // messages, incl. Console test messages) or just { data } (data messages).
  const n = payload.notification || payload.data || {}
  const link = (payload.fcmOptions && payload.fcmOptions.link) || (payload.data && payload.data.link) || '/'
  // Browsers require every push to show a notification, so always do.
  event.waitUntil(
    self.registration.showNotification(n.title || 'Delbert', {
      body: n.body || '',
      icon: n.icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: n.tag || undefined,
      data: { link },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = (event.notification.data && event.notification.data.link) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const open = clients.find((c) => 'focus' in c)
      return open ? open.focus() : self.clients.openWindow(link)
    }),
  )
})
