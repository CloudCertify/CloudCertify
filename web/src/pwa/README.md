# PWA and route loading

## Behavior

- Root-hosted manifest and Apple icon links live in `index.html`. Install icons
  reuse the existing cloud-upload mark, primary color, and maskable-safe padding.
- Registration runs only in production/secure contexts, after window load;
  failures do not prevent startup. Worker update checks bypass HTTP cache.
- The worker caches only `/offline.html`, fetched without credentials. Install
  rejects HTTP errors, redirects, non-HTML, and accidental SPA rewrites.
- Only known same-origin GET app navigations receive network-first handling.
  API/fetch/XHR, submissions, assets, Authorization, and auth callbacks bypass it.
- Network failures receive the offline page with HTTP 503 and `no-store`.
  Online HTTP errors remain unchanged. Optional navigation preload avoids waiting
  for worker startup. No runtime caching, submission queue, retry, or auto-reload.
- Updates wait for existing controlled tabs to close. No skipWaiting/clients.claim.
  Cleanup touches only obsolete `cloudcertify-offline-*` caches.
- Bump `OFFLINE_CACHE` in `public/service-worker.js` when `offline.html` changes.
  Update its route allowlist when adding app routes.
- The self-contained offline page uses existing system sans typography/tokens,
  saved EN/PT choice or browser preference, and warns it cannot confirm saved
  answers. It makes no font/network requests and retries only when clicked.
- Home stays eager; seven other routes load on demand. Providers remain mounted.
  Loading/error copy uses shared typed dictionaries. Retry is explicit.
- After pathname navigation, successful content hands focus to main after its lazy
  commit. Initial load and fallbacks do not focus; active inputs retain focus.

## Evidence and limitations

At `8504508` there were only 24px SVG favicons, no manifest/worker/offline page,
and eight eager routes. Before route splitting this worktree built 768.95 kB
entry JS / 238.66 kB gzip; after corrections 642.18 kB / 206.29 kB gzip.
Existing CSS remains 50.94 kB / 9.19 kB gzip, hash `CCIvJRQ_`. The entry still
exceeds Vite's 500 kB warning. These are build-size results, not Lighthouse gains.
The parent's uncommitted code makes its baseline different.

Offline fallback requires a successful prior installation and retained storage;
it cannot cover a first offline visit. There is no offline exam taking or attempt
persistence. Existing API errors/submission handling remain the app's concern.
Browser lifecycle, installation, deployment MIME/rewrites, and Lighthouse evidence
are the parent's remaining verification. Unit tests do not establish compliance.

## Checks and browser scenarios

From `web/`:
```sh
rtk pnpm exec tsc --noEmit -p tsconfig.app.json
rtk pnpm exec tsc --noEmit -p tsconfig.node.json
rtk pnpm run lint
rtk pnpm exec node --check public/service-worker.js
rtk pnpm exec vitest run src/pwa src/App.test.tsx src/route-boundary.test.tsx
rtk pnpm build
```

Use a production HTTPS preview and separate clean profiles for before/after:

1. Capture online Home at 390x844 and 1440x900; existing styling must match.
2. Check manifest errors/MIME, install dialog, Android maskable icon, iOS Apple
   icon, and standalone launch. Static files must bypass the SPA rewrite.
3. After a controlled visit, go offline and hard-navigate `/`, `/quiz`,
   `/quiz/1/session`, `/dashboard`. Capture EN/PT at mobile size and 200% zoom;
   verify title/lang, keyboard retry, original URL, and honest attempt warning.
4. Keep an attempt in tab A while tab B goes offline or receives a new worker.
   Verify A's answer remains, update waits, no reload/false submit success, and
   Cache Storage holds only offline.html. Close controlled tabs to activate.
5. Check API GET/POST and auth callback bypasses with test credentials; never
   include real tokens in evidence. Failed install must preserve the old worker.
6. Throttle/block lazy chunks: capture localized loading/recovery, then successful
   focus on main. Initial load, fallback, and typing must not lose focus/value.
   Test all routes, direct URLs, OAuth, retry, and Back/Forward.
7. Compare repeated cold mobile Lighthouse runs in the same environment; report
   versions/throttling, median LCP/CLS/TBT and bytes. Confirm post-load worker
   registration, route chunks on demand, and no duplicate preload navigation.

References: [installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [worker lifecycle](https://web.dev/articles/service-worker-lifecycle), [offline fallback](https://web.dev/articles/offline-fallback-page), [maskable icons](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons), [React lazy](https://react.dev/reference/react/lazy), [effect timing](https://react.dev/reference/react/useLayoutEffect).
