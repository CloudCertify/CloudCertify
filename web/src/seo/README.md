# Public search metadata

## Audit evidence

Baseline commit: `85045083baaeed0534a4cf0456c87acc45798080`.
Checked on 2026-10-21 in the workspace's America/Sao_Paulo timezone.

- `API/Program.cs` names `https://cloudcertify.snowye.dev` as the frontend
  origin in its CORS example. A read-only HTTPS request to that host returned
  HTTP 200, Vercel response headers, and the matching CloudCertify SPA shell.
  This is stronger evidence than inferring a frontend origin from the API URL.
- The original `index.html` reused the same title and description on every
  route. It had no canonical URL, robots metadata, or structured data.
- Live requests to `/robots.txt` and `/sitemap.xml` both returned HTTP 200,
  `Content-Type: text/html; charset=utf-8`, content length 1405, and the same
  ETag as `/`. These were SPA fallbacks, not usable crawl files.
- `/progress` returned the same HTML without an `X-Robots-Tag` header.
- The public API catalog confirmed `/quiz/1` is CLF-C02 and `/quiz/4` is SAA-C03.
  Those IDs are suitable for validation scenarios, not a permanent static
  sitemap contract. The API is the source of catalog IDs.
- `SUBAGENTS.md` is referenced by `AGENTS.md` but absent from this checkout
  and the project's main checkout. This slice did not delegate further work.

## Implemented boundaries

- `/`: localized title/description, production canonical and `WebSite` JSON-LD.
- `/dashboard`: public certification catalog, localized metadata, canonical
  and `CollectionPage` JSON-LD. Despite its name this is not private progress.
- `/quiz/:id`: positive API integer IDs receive metadata from the same query
  used by the visible page. Loaded titles/descriptions produce a canonical
  and basic `WebPage` JSON-LD. An absent description falls back to the visible
  localized full-exam summary. Failed or missing responses receive `noindex`.
- Pending public quizzes remain indexable so Google can render them. A
  shared initial `noindex` could stop rendering before data becomes available.
- `/quiz` is the legacy sample attempt. It, exam/drill session routes,
  `/progress`, auth routes, invalid IDs and unknown paths receive client
  `noindex, follow`, with no canonical or page JSON-LD.
- Vercel adds `X-Robots-Tag: noindex, follow` before JavaScript for the known
  utility routes. These rules need verification on a deployed preview.
- `robots.txt` allows crawling, including utility pages so crawlers can see
  `noindex`. The sitemap lists the stable `/` and `/dashboard` URLs. Public
  quiz details remain discoverable through existing rendered `<a href>` links.
  No fake modification times, ratings, FAQ answers, affiliations or search
  actions are added.

## Rendering and language limits

This change does not make the SPA server-rendered. The shared raw HTML has
generic English metadata and an empty root. Route canonicals and JSON-LD are
added after routing; a static homepage canonical would incorrectly label every
deep link as the homepage. Public content and detail metadata still require
JavaScript, API access and successful rendering. Social crawlers that do not
execute JavaScript still see the generic fallback. Unknown paths still receive
the host's HTTP 200 fallback; client `noindex` mitigates indexing but is not a
real HTTP 404. A failed JavaScript load can prevent that mitigation.

The existing `LanguageProvider` controls `<html lang>`. Language detection uses
stored choice, browser preferences, then English. Metadata follows that context
without changing dictionaries or routing. Both languages share each URL; there
are no separately addressable translations to advertise with `hreflang`.
Portuguese discovery is therefore not guaranteed.

The smallest follow-up for reliable non-JavaScript discovery is prerendering
the public homepage/catalog and available quiz details using the existing page
components and authoritative catalog data. Emit their body content, matching
metadata/canonicals and a generated catalog sitemap. Keep session/auth/progress
routes outside prerendering and give unknown routes real 404 responses. Verify
hydration, language selection and API failure behavior before adopting this.
Separately addressable locale URLs are needed before adding language alternates.
That requires coordination with build/routing/i18n owners; this slice changes
neither the Vite configuration nor package/build scripts.

## Verification

From `web/`, with all commands prefixed by `rtk`:

```sh
rtk proxy pnpm exec tsc -p tsconfig.app.json --noEmit
rtk proxy pnpm exec tsc -p tsconfig.node.json --noEmit
rtk proxy pnpm run lint
rtk proxy pnpm exec vitest run src/seo/page-metadata.test.tsx src/seo/page-metadata.integration.test.tsx src/components/language-switcher.test.tsx src/pages/quiz-detail.test.tsx
```

Tests cover public/private/error boundaries, pending data, metadata transitions,
localized descriptions and schema, canonical cleanup, safe API text, single
metadata tags, actual query request sharing and static crawl assets. They do
not simulate Google indexing or Vercel's deployed routing engine.

Result: 35 tests passed across four targeted files. Both TypeScript checks,
the full ESLint run and `git diff --check` passed.

`pnpm install --frozen-lockfile` installed the cached dependencies but reported
`ERR_PNPM_IGNORED_BUILDS` for package lifecycle scripts. The installed TypeScript,
ESLint and Vitest tools ran successfully without approving package scripts.
No dev server, application build, deployment or browser session was started.

## Parent evidence checklist

Take before/after viewport screenshots at 390 x 844 and 1440 x 1000 for:

1. `/` in English, then switch to Portuguese. The page's appearance should
   match the baseline. Capture browser title and head metadata separately.
2. `/dashboard` in English and Portuguese, with the AWS catalog loaded.
3. `/quiz/1` with CLF-C02 loaded, then `/quiz/4` with SAA-C03 loaded. Confirm
   each browser title/canonical/description matches the visible quiz, and
   that only one quiz-detail GET occurs per navigation.
4. `/quiz/1` followed by an exam session, and a drill session from that detail
   page. Confirm the session head has `noindex` and no public canonical,
   `og:url`, or JSON-LD. Use a local/test attempt, not production submissions.
5. `/progress` signed out and signed in; confirm `noindex` in both states.
6. `/quiz/2147483647` after the API's missing response, and `/missing`.
   Confirm `noindex`, no canonical/schema, and document the remaining HTTP
   200 fallback. The empty unknown-route UI is unchanged by this slice.

After deployment, capture response headers and bodies, not just screenshots:

- `/robots.txt` is plain text, `/sitemap.xml` is XML, and neither is SPA HTML.
- `/`, `/dashboard` and `/quiz/1` have no `noindex` response header.
- `/progress`, `/auth/callback`, `/quiz`, `/quiz/1/session` and
  `/quiz/1/drill/1/session` have `X-Robots-Tag: noindex, follow`, including
  direct reloads and query strings. Do not use a real auth token in evidence.
- Inspect raw HTML versus rendered HTML and test `/` and `/quiz/1` with
  JavaScript disabled. Report the SPA limitation visibly in the PR.
- Validate rendered JSON-LD with Schema.org's validator and inspect deployed
  public URLs through Search Console when owner access is available. Basic
  WebPage markup is not a claim of rich-result eligibility or ranking gains.

## Primary sources checked

- [Google JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics): rendered metadata/canonical support, initial noindex caveat, links and soft errors.
- [Google canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): absolute preferred URLs and consistent signals.
- [Google robots metadata](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag): meta and HTTP noindex directives require crawl access.
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): canonical URLs and truthful modification dates.
- [Google multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites): separate language URLs and browser-adaptive discovery limits.
- [Google structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies): visible, accurate content; no guaranteed search treatment.
- [Google AI features](https://developers.google.com/search/docs/appearance/ai-features): existing SEO foundations apply; no special AI markup is required.
- [Google site names](https://developers.google.com/search/docs/appearance/site-names) and [Schema.org WebSite](https://schema.org/WebSite): restrained site identity markup.
- [Vercel headers configuration](https://vercel.com/docs/project-configuration/vercel-json#headers): source patterns and response headers on static deployments.
