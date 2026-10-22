# Search and production evidence

Compared original main `8504508` with the integrated stack, using local production builds and fresh Chromium profiles.

- `before-no-js-*` / `after-no-js-*`: 390px and 1440px home with JavaScript disabled. Before is an empty app root; after contains the real public homepage.
- `before-en-US-*`, `before-pt-BR-*` / corresponding `after-*`: live homepage at both widths. Earlier stack layers account for mobile header wrapping.
- `before-stats`, `before-sample`, `before-pricing` / corresponding `after-*`: contrast corrections exposed by making initially hidden content readable. Existing colors/layout remain; text uses black ink or stronger opacity.
- [Homepage loading video](home-hydration.mp4) records the production HTML-to-React handoff.
- `browser-checks.json`: rendered metadata, raw-route checks, response types and viewport geometry. Home alone contains prerendered body/canonical. Utility documents use the empty SPA shell. The anonymous session URL redirects to quiz detail because there is no active attempt; its recorded final URL makes that explicit.
- `ios-safari-home.png` / `ios-safari-portuguese.png`: iPhone 18 Pro, iOS 27 simulator Safari, production preview. Checked initial page and language switching; accessibility tree exposes main, skip link and named controls. Add to Home Screen was not completed, so no standalone-install claim is made.
- `lighthouse.json`: Lighthouse 13.5.0 settings, environment, timestamps, scores and metrics for each production stage. Initial motion baseline: 86 performance / 94 accessibility / 100 best practices / 91 SEO. Combined: 97 / 100 / 100 / 100, LCP 2.1s, CLS 0, TBT 0ms. These are individual local lab runs, not field metrics or indexing guarantees.

204 tests, ESLint, TypeScript, production build and generated-artifact checks passed. Hydration tests pause animation frames to confirm that the heading does not disappear and displayed counts do not reset. Browser runs reported no runtime exceptions. The initial JavaScript remains 649.11 kB raw / 208.70 kB gzip, above Vite's warning threshold.

Catalog/details still need JavaScript; languages share URLs. Unknown paths still return HTTP 200 with client noindex. Vercel preview rewrites, utility noindex headers, crawl/PWA content types and no-cache worker headers passed, recorded in `vercel-preview.json`. Vercel adds noindex to preview deployments, including public home; check production headers after merge. This work makes content crawlable and supplies factual metadata; it cannot guarantee inclusion in search or answer engines. Manual screen-reader and real-device install checks remain outside the automated results.
