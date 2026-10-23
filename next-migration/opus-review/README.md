# Opus review corrections

Before: f85078e. After: 7ec6ef7. Production Next server with API_URL pointing to an unavailable local upstream. Screenshots at 390x900 and 1440x900 show the same outage before and after. Home previously rendered the route error; now the landing content remains available with an empty catalog roadmap. No styling changes.

Parent verification: 219 tests, lint, typecheck, production build, and 20 HTTP checks passed. Public API requests now abort after 10 seconds. Browser capture used the repository CDP workflow after two T3 snapshot timeouts.
