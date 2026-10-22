# Public search foundations

- Origin: `https://cloudcertify.snowye.dev`, named in `API/Program.cs` and
  verified against the live Vercel SPA. Baseline `8504508` returned the same
  empty HTML for every route, including robots/sitemap requests.
- Public metadata: home, catalog at `/dashboard`, and loaded positive-integer
  `/quiz/:id` pages. Missing quizzes, attempts, progress, auth and unknown routes
  receive client noindex. Vercel also sends noindex headers on known utilities.
- Canonicals use the production origin. JSON-LD uses visible site/page facts,
  with no ratings or FAQ claims. The sitemap lists the stable home/catalog URLs.
- The build prerenders only the existing public `HomePage` components into
  `index.html`, with readable content, links, canonical and WebSite JSON-LD.
  It reads no visitor storage/auth data and makes no API request. Catalog
  placeholders remain placeholders; no database IDs or catalog facts are invented.
- The client hydrates the same anonymous English snapshot, then mounts the live
  app with actual language/auth preferences. Static counters show their existing
  target values; animation styling and page copy remain in their original components.
  Catalog/details still require JavaScript. Languages still share URLs, so no
  hreflang alternatives are advertised.

## Integration

Keep `prerenderHome()` in the Vite plugin list. Its module is separate from the
PWA configuration and runs in generateBundle before service-worker generation.
It emits `spa.html` from the untouched generated shell, then fills `index.html`.
Preserve both Vercel rewrites: home to index, other SPA routes to spa. The plugin
also preserves that distinction in Vite preview. Other static hosts must do so.

Preserve the manifest/Apple icon links, PWA cache headers, and utility noindex
headers. The worker caches only `/offline.html`; neither HTML shell nor API data
belongs in its cache. Online navigation uses the server rewrites above. Updates
wait until controlled tabs close. The hydration handoff suppresses initial
entrances and keeps displayed counts, avoiding a visible disappearance after
first paint. Live queries, language preferences, and ongoing motion still run.

## Checks and parent evidence

Run from `web/`, with `rtk proxy` before each command:
`pnpm run build`, `pnpm exec node scripts/check-prerender.mjs`,
`pnpm run lint`, and `pnpm exec vitest run src/seo`.
The artifact check requires real h1/content/links/schema and an empty SPA shell.
Hydration tests cover a preselected Portuguese preference and language switching.
Build, artifact checks, 37 targeted tests, TypeScript and full ESLint passed.
The build still warns about a JavaScript chunk above 500 kB.

Capture home before/after at 390x844 and 1440x1000, with JavaScript on and off;
inspect heading visibility, raw canonical/schema, then EN/PT switching.
Check direct loads of dashboard, quiz 1, progress, auth callback and sessions:
utility raw HTML must be empty SPA content, never the home body/canonical/schema.
On Vercel, verify utility noindex headers and real text/XML crawl-file responses.
Unknown routes still use HTTP 200 plus client noindex; prerendering other public
pages and localized URLs remain follow-ups. No ranking or indexing guarantee.

Primary guidance: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
[AI features](https://developers.google.com/search/docs/appearance/ai-features),
[structured data](https://developers.google.com/search/docs/appearance/structured-data/sd-policies),
[language URLs](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites),
[React hydration](https://react.dev/reference/react-dom/client/hydrateRoot),
[Vite SSR](https://vite.dev/guide/ssr.html).
