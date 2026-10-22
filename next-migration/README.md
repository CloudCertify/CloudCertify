# PR 94: Next.js migration evidence

Application commits: `5cf48d5` and `f85078e`. Evidence lives only on
`review-evidence/web-readiness-20261022`, outside all application merge diffs.

Before images use the production Vite artifact from `788c9aa`; after images use
Next.js 16.4.2. Matched 390×900 and 1440×900 views cover Home, catalog and quiz
1 in English/Portuguese. No-JavaScript images show the catalog's empty old SPA
shell versus readable server-rendered content. The layout/palette are retained;
foundational/professional tier text now uses existing black ink for contrast.

`home-hydration.mp4` records the initial mobile render. `motion/practice.mp4`
and `motion/exam.mp4` exercise the development-only quiz preview under Next;
`motion/checks.json` records 18 checks, including keyboard/reduced motion.
Production exam navigation, selection, explicit finish confirmation and 320px
layout were checked separately with API POSTs intercepted using local fixtures.
No production attempts were created by those checks.

`http-checks.json` contains 20 production-server checks: EN/PT raw HTML,
canonical metadata, install links, real 404s, private noindex and static MIME.
`production-flows.json` also verifies that the production worker caches only
`offline.html`, controls subsequent navigation, and serves the offline fallback.
iPhone 18 Pro / iOS 27 simulator Safari passed catalog rendering and EN/PT switching.

## Lighthouse

Lighthouse 13.5.0, mobile default simulated throttling, headless Chrome, separate
clean profiles, local production servers, gzip enabled on both, warm server data
cache. One comparable run per route/version; these are lab results, not field data.
Earlier exploratory runs are excluded from this comparison.

| Route | Before P/A/BP/SEO | After P/A/BP/SEO | LCP before → after | Speed Index before → after |
| --- | --- | --- | --- | --- |
| Home | 97/100/100/100 | 96/100/100/100 | 2.3s → 2.8s | 2.0s → 0.8s |
| Catalog | 90/96/100/100 | 97/100/100/100 | 3.4s → 2.6s | 2.0s → 0.8s |

CLS is 0 in all four runs. Next TBT is 10ms versus 0ms in these before runs.
The migration improves catalog performance and raw HTML discovery; it does not
improve every homepage metric. Source JSON reports are included.

217 tests, lint, Next type generation/TypeScript, build and diff checks passed.
Parent review corrected duplicate starts during pending navigation, server-locale
refresh synchronization, metadata defaults and shared tier contrast.

Android emulator unavailable: no Android SDK. Manual screen-reader testing,
OS standalone installation, field performance and actual indexing are unverified.
EN/PT share URLs; API-provided certification titles/descriptions may remain English.
Vercel preview's platform noindex is expected; confirm production crawl headers
after merge. No ranking or answer-engine inclusion claim is made.
