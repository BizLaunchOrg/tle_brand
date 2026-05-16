/* Minimal service worker: push + notification click only (no precache). */
self.addEventListener('install', function () {
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', function (event) {
  var data = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch (_) {
      try {
        data = { body: event.data.text() || '' }
      } catch (__) {
        data = {}
      }
    }
  }
  var title = data.title || 'TOBILICIOUS BY LADY EMMA'
  var options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    data: { url: data.url || '/' },
    tag: data.tag || 'tle-admin',
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var url = (event.notification.data && event.notification.data.url) || '/'
  if (self.clients.openWindow) {
    event.waitUntil(self.clients.openWindow(url))
  }
})
