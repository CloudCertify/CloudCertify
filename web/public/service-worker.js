// Bump this version whenever offline.html changes. Never cache the app or API data.
const OFFLINE_CACHE = 'cloudcertify-offline-v1';
const OFFLINE_URL = '/offline.html';
// Only known app documents get a fallback; auth callbacks and API URLs bypass it.
const APP_ROUTE = /^\/(?:quiz(?:\/\d+(?:\/session|\/drill\/\d+\/session)?)?|dashboard|progress)?\/?$/;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch(new Request(OFFLINE_URL, {
      cache: 'reload',
      credentials: 'omit'
    }));
    if (
      !response.ok || response.redirected ||
      !response.headers.get('content-type')?.includes('text/html') ||
      !(await response.clone().text()).includes('<meta name="cloudcertify-offline" content="1"')
    ) {
      throw new Error('Offline document unavailable; keeping the existing worker.');
    }
    const cache = await caches.open(OFFLINE_CACHE);
    await cache.put(OFFLINE_URL, response);
  })());
  // Let updates wait for all existing tabs to close. Never interrupt a quiz.
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith('cloudcertify-offline-') && name !== OFFLINE_CACHE)
      .map((name) => caches.delete(name)));
    // Start online documents in parallel with worker startup where supported.
    await self.registration.navigationPreload?.enable().catch(() => {
      // Preload is an optimization; network-first navigation still works without it.
    });
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    request.mode !== 'navigate' ||
    url.origin !== self.location.origin ||
    request.headers.has('Authorization') ||
    !APP_ROUTE.test(url.pathname)
  ) {
    return;
  }

  event.respondWith((async () => {
    try {
      return (await event.preloadResponse) || await fetch(request);
    } catch {
      // No runtime caching, queued submissions, retries, or automatic reloads.
      const cache = await caches.open(OFFLINE_CACHE);
      const offline = await cache.match(OFFLINE_URL);
      return offline ? new Response(offline.body, {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
      }) : Response.error();
    }
  })());
});
