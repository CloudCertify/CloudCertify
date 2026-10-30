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
sets the browser API address at build time; `API_URL` optionally overrides it
for server requests. Both default to `https://api-cloudcertify.snowye.dev`.
Never put credentials in a `NEXT_PUBLIC_` variable.

Home, the catalog and quiz details render on the server from anonymous API
reads cached for five minutes per URL and language. Auth, progress and attempt
requests stay in the browser and never touch that cache. The language cookie
takes priority over `Accept-Language`.

Regenerate the API client with `pnpm api:generate` when the API schema changes.
