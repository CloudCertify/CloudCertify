# PWA scope and validation

The app is deployed at the origin root. `public/manifest.webmanifest` declares
that identity and scope. The install icons reuse the existing `icon-dark.svg`
cloud-upload paths on the existing primary color. `public/icons/icon.svg` is the
source, with padding inside the maskable safe area. The PNGs are 192, 512, and
180 pixels, the last for Apple touch icons.

## HTML integration required

The SEO slice owns `index.html`. Add these tags to its head before shipping:

```html
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
```

Without the manifest link, the browser will not discover the install metadata.
The manifest uses `#2347d9` and `#f5f3ec`, matching the existing CSS tokens. It
does not change the page's existing theme-color metadata or styling.

## Cache and update boundaries

- Register only in production and secure contexts, after window load. Registration
  failure is handled without preventing app startup. HTTP cache is bypassed for
  worker update checks.
- Cache exactly one static resource, `/offline.html`, fetched without credentials.
  Reject HTTP errors, redirects, non-HTML responses, and HTML missing the offline
  document marker, including an accidental SPA rewrite.
- Handle only same-origin GET navigations to the currently known app routes.
  `Authorization` requests, API requests, fetch/XHR, assets, and auth callbacks
  bypass the worker. Update the route allowlist when adding app routes.
- Use the online document or navigation preload response first, including 4xx/5xx
  responses. Only a network failure gets the offline document, with HTTP 503 and
  `Cache-Control: no-store`. Navigation preload avoids waiting for worker startup
  on supported browsers.
- There is no application shell cache, API cache, background sync, submission queue,
  automatic retry, automatic reload, `skipWaiting`, or `clients.claim`. Existing
  attempts continue to use the app's current network/error behavior. This slice
  does not add offline exam taking or attempt persistence.
- Updates wait until existing controlled tabs close. Cleanup removes only old
  `cloudcertify-offline-*` caches. Other origin caches are untouched.
- **Bump `OFFLINE_CACHE` in `public/service-worker.js` whenever `offline.html`
  changes.** The browser detects worker changes by its contents, not by changes
  to cached resources.

The offline page has no network dependencies. It uses the app's stored language
choice, then the browser's supported language preferences, with English as a
fallback. It explicitly warns that it cannot confirm saved answers and asks users
to keep any existing attempt tab open. Its retry link navigates only when clicked.
It does not restore account, submission, or question data.

## Route loading

Home remains an eager import. The other seven route pages use module-level React
`lazy` imports. The existing Providers stay outside the route loading/error
boundary, so auth, locale, and query providers are not remounted during chunk
loading. Loading is announced with a localized `status`. Chunk failures show
localized recovery text and an explicit retry button; there is no automatic
reload. Navigating away from a failed route resets only the route boundary.

These three small strings live beside the boundary to avoid overlapping the
shared translations slice; all are typed against the existing `Language` union.
The retry label uses the existing shared messages.

## Audit baseline and measured limits

At commit `8504508`, `web/public` contained only two 24px SVG favicons. There was
no manifest, install icon, worker registration, or offline navigation fallback.
`App.tsx` eagerly imported all eight route pages, and `index.html` loaded the
Google Fonts stylesheet synchronously. Route splitting was subsequently
authorized in this slice; the fonts remain with the SEO/HTML owner.

The isolated production build before route splitting had one 768.95 kB entry JS
chunk, 238.66 kB gzip. After splitting, the entry is approximately 641.7 kB,
206.2 kB gzip, with seven page chunks plus shared route chunks loaded on demand.
About 127 kB raw and 32 kB gzip are deferred from Home's initial JS. CSS is
unchanged at 50.94 kB raw / 9.19 kB gzip, hash `CCIvJRQ_`. The entry still exceeds
Vite's 500 kB warning threshold. This is a build-size comparison within this
worktree, not a Lighthouse or runtime claim; the parent's uncommitted changes
make its baseline output different.

The production build is authorized and checked in this slice. No browser,
install prompt, network transfer comparison, Lighthouse, or Core Web Vitals
measurement was run in this worktree. The parent owns production/browser evidence.
Unit tests execute the actual shipped worker
and offline script, but cannot prove browser worker lifecycle or deployment
headers. Offline fallback needs a successful prior worker installation and
available browser cache storage. It cannot cover a first visit without a network
or storage evicted by the browser.

## Checks in this slice

Run from `web/`, with the repository's RTK prefix:

```sh
rtk pnpm exec tsc --noEmit -p tsconfig.app.json
rtk pnpm exec tsc --noEmit -p tsconfig.node.json
rtk pnpm run lint
rtk pnpm exec node --check public/service-worker.js
rtk pnpm exec vitest run src/pwa src/App.test.tsx src/route-boundary.test.tsx
rtk pnpm build
```

## Parent production validation and screenshot scenarios

Use an HTTPS production preview with the HTML integration above. Service workers
are intentionally absent under the Vite dev server. Compare with `8504508` in a
separate clean browser profile so an installed worker cannot affect the baseline.

1. On desktop Chrome and Android Chrome, visit `/`, wait for load/installation,
   then inspect the manifest in Application tools. Confirm name, standalone
   display, root identity/scope, no manifest errors, and actual 192/512 PNG
   dimensions. Capture the install dialog and installed home-screen/launcher icon,
   including an Android maskable icon preview. Open the installed app and capture
   its standalone `/` screen at 390x844. On iOS Safari, verify Add to Home Screen,
   the 180px icon, launch, and the offline state; installation UI differs by browser.
2. Capture the online `/` at 390x844 and 1440x900 before and after. The existing
   content, typography, colors, borders, and shadows should be unchanged.
3. After installation and a controlled navigation, enable offline mode. Hard
   navigate to `/`, `/quiz`, `/quiz/1/session`, and `/dashboard`. The baseline
   shows the browser network error. The new version shows only the offline page,
   preserving the requested URL. Capture mobile English and Portuguese, plus a
   desktop 200% zoom view. Keyboard focus must reach the retry link. Confirm title
   and document language match the stored choice, with browser preference fallback.
4. Keep an active attempt in tab A, answer a question without submitting it, and
   disconnect. Open a failed full navigation in tab B. Capture the offline warning
   and verify tab A still has its in-memory answer. Inspect Cache Storage after
   signed-in use and offline navigation: the only entry in this worker's cache
   must be `/offline.html`; no questions, tokens, account data, or submissions.
   Inspect failed attempt API calls: no HTML fallback, queued request, retry, or
   false success. Restore network and verify the app's existing submit flow.
5. While tab A has an active attempt, deploy a byte-different worker and navigate
   in another tab. Capture Application > Service Workers showing the update
   waiting. Confirm no reload or controller replacement in tab A and no changed
   answer. Close all controlled tabs, reopen, and verify the new worker activates.
6. Check `/auth/callback?token=...`, `/api/...`, and GET/POST API requests online
   and offline in Network tools using a test account/token. They must bypass the
   worker's response handling. Do not include real tokens in screenshots. Verify
   online HTTP 401/404/500 document responses retain their status and body.
7. Verify deployed `/service-worker.js` is JavaScript, `/offline.html` is HTML,
   and `/manifest.webmanifest` is manifest JSON, rather than the SPA rewrite.
   Check registration scope and update checks. Simulate an unavailable or invalid
   offline file on the preview and confirm the new install fails while the
   previous active worker remains usable.
8. Run repeated cold-cache mobile Lighthouse navigation audits before and after
   against the same environment. Record the median, URLs, tool/browser versions,
   throttling, network transfer, JS bytes, LCP, CLS, and TBT; inspect network timing
   to confirm worker registration and offline prefetch occur after page load.
   Repeat with a controlled page to check navigation preload does not duplicate
   document requests. Report results without claiming a score improvement until
   measured. Lighthouse alone does not establish installability or accessibility.
9. With a fresh online app load and slow network, click each non-home route.
   Capture the localized loading status and final page at 390x844. Confirm Network
   shows the relevant route chunk loading only after navigation. Exercise all
   direct URLs listed in `App.test.tsx`, OAuth callback, and Back/Forward.
   Block a route chunk in DevTools or go offline before its first SPA navigation.
   Capture English and Portuguese recovery states. Confirm no automatic reload,
   no provider reset, explicit retry after restoring network, and Back recovering
   the prior route. Do not capture real callback tokens. Lazy chunk failures are
   handled by the route boundary; only full document navigations use offline.html.

## Primary references

- [MDN installability and manifest discovery](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [Chrome service worker lifecycle and waiting updates](https://web.dev/articles/service-worker-lifecycle)
- [Chrome offline navigation fallback and navigation preload](https://web.dev/articles/offline-fallback-page)
- [MDN maskable icon safe area](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons)
- [React lazy loading and module-level declarations](https://react.dev/reference/react/lazy)
- [React Suspense loading boundaries](https://react.dev/reference/react/Suspense)
