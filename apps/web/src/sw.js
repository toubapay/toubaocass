import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

// Injected at build time by vite-plugin-pwa (injectManifest) with the real
// list of built assets — precaching these is what makes the app shell
// (JS/CSS/HTML/icons) load offline after the first successful visit.
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// SPA offline support: a direct/refreshed navigation while offline still
// gets the precached index.html instead of the browser's own "no internet"
// page, so client-side routing can take over once back in-app.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// Mostly-static reference data (cities, module on/off flags, the landing
// page's marketing content) — safe to serve from cache when offline or the
// API is slow, but still tries the network first since none of it is
// frequent enough to justify ever showing it stale on a normal connection.
registerRoute(
  ({ url }) => ['/cities', '/modules/status', '/landing-page'].some((path) => url.pathname.endsWith(path)),
  new NetworkFirst({ cacheName: 'api-reference-data', networkTimeoutSeconds: 4 }),
);

// Firebase Cloud Messaging: shows a system notification for pushes that
// arrive while no tab has focus (the foreground case is handled in-app via
// onMessage() in usePushNotifications.ts instead). This is a static file
// served as-is, so it can't read import.meta.env like the rest of the app —
// fill in the same (non-secret) values as VITE_FIREBASE_* in .env here.
//
// Wrapped in try/catch: until real Firebase credentials are filled in
// above, or if the gstatic.com scripts fail to load, this must not break
// the core service worker (precaching, offline navigation) above.
try {
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: 'AIzaSyApu6NvW2RWVS9-oEKkmXFZMr5wKgGRjJQ',
    authDomain: 'ocass-a1f8f.firebaseapp.com',
    projectId: 'ocass-a1f8f',
    storageBucket: 'ocass-a1f8f.firebasestorage.app',
    messagingSenderId: '1070944386226',
    appId: '1:1070944386226:web:ee1bfa949f57e999f69dab',
  });

  const messaging = firebase.messaging();

  // Backend sends data-only FCM messages (no top-level "notification" key)
  // specifically so nothing but this handler ever displays one — a payload
  // with both fields gets auto-displayed by the browser AND handled here,
  // showing the same push twice.
  messaging.onBackgroundMessage((payload) => {
    self.registration.showNotification(payload.data?.title ?? 'Intercity', {
      body: payload.data?.body,
      icon: '/icons/icon-192.png',
    });
  });
} catch {
  // Firebase config not filled in yet, or the CDN scripts failed to load —
  // push notifications simply won't work until fixed, but the rest of the
  // service worker (and the PWA) keeps functioning normally.
}
