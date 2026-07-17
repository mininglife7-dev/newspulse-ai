/*
 * Minimal, safe service worker for the Governor PWA.
 *
 * Strategy: network-first for navigations with an app-shell fallback, so the
 * installed Home Screen app still opens when offline. It caches nothing eagerly
 * and never intercepts API calls, so it cannot serve stale data for /api/*.
 */
const CACHE = 'governor-v1';
const APP_SHELL = '/';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(APP_SHELL))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET navigations. Never touch API or cross-origin.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put(APP_SHELL, copy))
            .catch(() => {});
          return response;
        })
        .catch(() => caches.match(APP_SHELL).then((r) => r || Response.error()))
    );
  }
});
