# CloudCertify web

Next.js 16 App Router, React, TypeScript and Tailwind. Run commands from `web/`.

```sh
pnpm install
pnpm dev         # localhost:5173
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm start       # production, localhost:4173
```

Copy `.env.example` to `.env.local` to use a local API. `NEXT_PUBLIC_API_URL`
sets the browser API address at build time. `API_URL` optionally overrides it
for server requests. Both default to `https://api-cloudcertify.snowye.dev`.
Never put credentials in a `NEXT_PUBLIC_` variable.

Home, the catalog and quiz details render API content and localized metadata
on the server. Anonymous public reads use Next's five-minute data cache, keyed
by URL and language. Auth, progress and attempt requests remain browser-side;
their responses never enter that shared cache. Missing quizzes return 404.
Public reads time out after 10 seconds; Home then renders an empty roadmap.

The language cookie is request-local. It takes priority over Accept-Language;
legacy localStorage preferences migrate after hydration. EN/PT share URLs, so
there are no hreflang claims for separate localized pages. The sitemap lists
public catalog entries; utility routes use noindex. Search engines choose
whether and when to index content. Structured data describes visible facts.

Native App Router routing, code splitting, metadata, error handling, robots and
sitemap replace the Vite SPA/prerender pipeline. Client providers stay mounted
across navigation. Existing interactive quiz screens and styles are retained.

PWA installation and offline support are maintained separately in PR #93.
Regenerate the API client with `pnpm api:generate` when the API schema changes.
