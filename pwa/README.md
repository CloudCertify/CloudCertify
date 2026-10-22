# Production PWA evidence

Chromium production preview at `http://localhost:4173`, 390×844, fresh profile.

- [Before offline](before-offline.png), [after English](offline-en-US.png), [after Portuguese](offline-pt-BR.png).
- [Before online](before-online-mobile.png), [after online](online-mobile.png). The earlier accessibility PR accounts for header wrapping.
- `browser-checks.json`: manifest/installability errors empty; worker active after installation and controlling after navigation; only `/offline.html` cached; offline EN/PT fit the viewport; keyboard skip link reaches main; no runtime exceptions.
- `update-check.json`: a byte-changed worker remains installed/waiting while the current controller, document, and selected sample-quiz answer remain unchanged.

The integrated entry changed from 779.02 kB raw / 241.65 kB gzip to 645.26 / 207.27. Seven routes load on demand. Unused Google font requests were removed; computed body font remains the existing system sans stack. The production build still warns about the entry exceeding 500 kB.

Local Lighthouse mobile run before/after PWA integration: performance 86→91, accessibility 100→100, best practices 100→100, SEO 91→91. FCP 2.4→2.0s, LCP 3.7→3.3s, CLS 0→0. These are individual lab runs, not field metrics or guaranteed scores.

175 tests, TypeScript, ESLint, and production build passed. Browser checks do not establish real-device installation: Android SDK is unavailable, and iOS Add to Home Screen remains unverified. Offline fallback requires a prior successful installation and retained storage. Offline exams and submission queues are intentionally unsupported. Deployment must serve the manifest, worker, icons, and offline file directly with their correct MIME types; Vercel cache headers are configured but require deployment verification.
