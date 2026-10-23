# PWA behavior

The manifest and Apple icon are linked by Next root metadata. Install icons reuse
the existing cloud mark and primary color. The app assumes root hosting.

Registration runs only in production, in a secure context, after window load.
The worker caches only `/offline.html`, fetched without credentials. Installation
rejects redirects, non-HTML, HTTP errors, and missing offline markers. The offline
page uses the app's system font, colors and stored EN/PT preference.

Known same-origin GET navigations use network first. Network failures receive
the offline document with HTTP 503 and no-store. Online HTTP errors are preserved.
API, RSC fetches, submissions, assets, Authorization and auth callbacks bypass the
worker. No app or API response caching, offline exams, submission queue or retries.

Updates wait until existing controlled tabs close. There is no skipWaiting,
clients.claim or automatic reload. Bump OFFLINE_CACHE when offline.html changes;
keep the known-navigation allowlist current when adding routes. Offline fallback
requires a previous successful worker installation and retained browser storage.

From `web/`, run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`,
then `pnpm start` and `node scripts/check-next.mjs`.

Browser verification should cover an ordinary navigation after installation,
offline EN/PT pages, 200% zoom, cache contents, a waiting update while an attempt
is open, and API/auth bypasses. A forced reload bypasses the worker in Chromium.
Check manifest/icon presentation and standalone launch on actual target devices.
Unit tests and Lighthouse do not establish full installability or accessibility.

References: [worker lifecycle](https://web.dev/articles/service-worker-lifecycle),
[offline fallback](https://web.dev/articles/offline-fallback-page),
[installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
