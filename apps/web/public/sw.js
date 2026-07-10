// Minimal service worker: exists only to satisfy the browser's PWA
// installability checks (manifest + registered SW with a fetch handler).
// Deliberately does no caching — trip/booking data changes constantly, so
// serving stale responses would be worse than no offline support at all.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
