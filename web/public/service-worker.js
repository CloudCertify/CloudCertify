// Bump this version whenever offline.html changes. Never cache the app or API data.
const OFFLINE_CACHE = 'cloudcertify-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))));
  // No skipWaiting: updates wait for open tabs to close, so a quiz is never interrupted.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names
    .filter((name) => name.startsWith('cloudcertify-offline-') && name !== OFFLINE_CACHE)
    .map((name) => caches.delete(name)))));
});

// Network-only page loads; the cached offline page is served only when the network fails.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error()));
});
