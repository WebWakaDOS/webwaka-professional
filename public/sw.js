/**
 * WebWaka Professional — Service Worker
 * Blueprint Reference: Part 9.1 — "PWA First, Offline First"
 * Blueprint Reference: Part 9.1 — CORE-1 Universal Offline Sync Engine integration
 *
 * Strategy: Cache-first for static assets, Network-first with offline fallback for API calls.
 * Background sync processes the Dexie mutation queue when connectivity is restored.
 */

const CACHE_NAME = 'webwaka-professional-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// ─────────────────────────────────────────────────────────────────────────────
// INSTALL — Cache static shell
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATE — Clean up old caches
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// FETCH — Network first with cache fallback (Offline First Invariant)
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // For API/sync/publish requests: network only — Dexie mutation queue handles offline data
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/sync') || url.pathname.includes('/publish')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ success: false, errors: ['You are offline. Changes will sync when reconnected.'] }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // For navigation requests: network first, fallback to cached index.html (SPA routing)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html').then((cached) => {
          return cached ?? caches.match('/offline.html');
        });
      })
    );
    return;
  }

  // For static assets: cache first, then network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND SYNC — Process CORE-1 mutation queue when back online
// Blueprint Reference: Part 9.1 — CORE-1 Universal Offline Sync Engine
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'webwaka-professional-sync') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_REQUESTED', tag: 'webwaka-professional-sync' });
        });
      })
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS — for hearing reminders and invoice due dates
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'WebWaka Professional', {
      body: data.body ?? '',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: data.tag ?? 'webwaka-professional',
      data: data.url ? { url: data.url } : undefined
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data?.url) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url)
    );
  }
});
