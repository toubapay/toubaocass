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

// Firebase Cloud Messaging: shows a system notification for pushes that
// arrive while no tab has focus (the foreground case is handled in-app via
// onMessage() in usePushNotifications.ts instead). This is a static file
// served as-is, so it can't read import.meta.env like the rest of the app —
// fill in the same (non-secret) values as VITE_FIREBASE_* in .env here.
//
// Wrapped in try/catch: until real Firebase credentials are filled in
// above, or if the gstatic.com scripts fail to load, this must not break
// the core service worker (installability, fetch passthrough) above.
try {
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: 'REPLACE_WITH_VITE_FIREBASE_API_KEY',
    authDomain: 'REPLACE_WITH_VITE_FIREBASE_AUTH_DOMAIN',
    projectId: 'REPLACE_WITH_VITE_FIREBASE_PROJECT_ID',
    storageBucket: 'REPLACE_WITH_VITE_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'REPLACE_WITH_VITE_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'REPLACE_WITH_VITE_FIREBASE_APP_ID',
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    self.registration.showNotification(payload.notification?.title ?? 'Intercity', {
      body: payload.notification?.body,
      icon: '/icons/icon-192.png',
    });
  });
} catch {
  // Firebase config not filled in yet, or the CDN scripts failed to load —
  // push notifications simply won't work until fixed, but the rest of the
  // service worker (and the PWA) keeps functioning normally.
}
