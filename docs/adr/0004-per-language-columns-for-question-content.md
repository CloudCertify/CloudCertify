# Per-language columns for Question content, resolved server-side

Question content localization (PT-BR alongside default EN-US) is stored as
nullable per-language columns (`TextPt`, `ExplanationPt` on Question, `TextPt`
on Answer) rather than a translation table or JSONB map. The server resolves
the language — from `Accept-Language` at attempt start, then fixed on the
Submission — and DTOs keep their single `text`/`explanation` fields, falling
back to EN-US per field when a translation is missing.

## Considered Options

- **Translation table / JSONB map**: new languages without migrations, but
  more ceremony, weaker typing, and join/mapping cost — rejected; adding a
  language is a rare, deliberate event and a migration is an acceptable price.
- **Shipping both languages in responses**: instant client-side switching, but
  ~2x payloads and pick-logic duplicated in every client — rejected;
  mid-attempt language switching is deliberately unsupported.

## Consequences

- A third language means a schema migration plus code touches in the seeder
  payloads and DTO resolution.
- Translated GET endpoints must send `Vary: Accept-Language` so HTTP caches
  key on language.
- Check/Submit responses use the Submission's stored Language and ignore the
  current request header.
