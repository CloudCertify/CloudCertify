# 0003 — Optional social login: API-owned OAuth, JWT returned via redirect fragment

- Status: Accepted
- Date: 2026-07-03

## Context

We want Google/GitHub login to build reliable cross-attempt identity and a
better experience, but quizzes must keep working anonymously (email-only).
The web app is a pure Vite SPA on Vercel; the API is a separate origin
(`api-cloudcertify.snowye.dev`). There is no server-rendered frontend, so the
API must own the OAuth flow (client secrets cannot live in the SPA).

The IETF "OAuth 2.0 for Browser-Based Apps" BCP recommends the BFF pattern:
server does the code exchange and the browser holds only an httpOnly cookie.
That would couple both apps to a shared parent cookie domain (`.snowye.dev`)
and require CORS-with-credentials plus CSRF handling.

## Decision

- The API implements the RFC 6749 authorization-code flow (with `state` and
  PKCE) for Google and GitHub.
- On callback the API upserts User + Provider, runs Claiming, signs its own
  self-contained JWT (UserId claim, 30-day expiry, no refresh tokens), and
  redirects to the SPA with the JWT in the **URL fragment**
  (`/auth/callback#token=...`). Fragments never reach server logs or Referer
  headers. The SPA stores it in localStorage and sends `Authorization: Bearer`.
- Auth is optional everywhere except `/me/*`: a bearer token overrides any
  body-supplied email; without a token, the email-only flow is unchanged.

## Consequences

- Deliberate deviation from the BCP's cookie recommendation: a JS-readable
  token is exposed to XSS. Accepted because the account protects only quiz
  history (no payments, no PII beyond provider profile), and it removes the
  cookie-domain coupling and CSRF surface.
- No revocation: logout is client-side (drop localStorage); a stolen token is
  valid until expiry. Revisit (shorter TTL + refresh, or cookie/BFF) if the
  account ever guards anything sensitive.

## Related domain rules (see CONTEXT.md)

- A User has 1..n Providers; auto-link only on provider-verified email.
- Claiming matches any of the User's provider-verified emails, runs on every
  login, is idempotent, and keeps the Submission's original email for
  provenance.
