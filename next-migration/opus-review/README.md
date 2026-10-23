# Opus review corrections

Before: f85078e. After: 7ec6ef7. Production Next server with API_URL pointing to an unavailable local upstream. Screenshots at 390x900 and 1440x900 show the same outage before and after. Home previously rendered the route error; now the landing content remains available with an empty catalog roadmap. No styling changes.

Parent verification: 219 tests, lint, typecheck, production build, and 20 HTTP checks passed. Public API requests now abort after 10 seconds. Browser capture used the repository CDP workflow after two T3 snapshot timeouts.

## Keyboard focus correction

Before: 7ec6ef7. After: 92072f6. Real Chromium at 390x900, production server, keyboard Enter events. All API writes intercepted locally, never submitted upstream. Start, Check, and Send report previously moved focus to BODY while pending and after failure/reveal. They now keep focus on the same button. Repeat Enter sends one request per action. JSON files record focus and request counts; screenshots show matching states. No motion timing or visual styling was changed; pending opacity remains 50%.

Parent checks after integration: Next 221 tests, ESLint and production build with TypeScript; Vite/PWA layer 179 tests, ESLint, TypeScript and production build. Next raw HTTP suite 20/20. Earliest fixes are in PR91 for Check/Continue, PR92 for report/Start, preserved by PR93/PR94. Manual touch-screen-reader behavior remains unverified.
