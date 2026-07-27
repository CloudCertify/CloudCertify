# 0005 — Reports flag Question defects; they never appeal a score or snapshot content

- Status: Accepted
- Date: 2026-07-21
- Related: ADR 0001, ADR 0002, ADR 0004, issues #40, #41

## Context

Visitors hit Questions with wrong answer keys, stale AWS facts, and rough
`pt-BR` text, and had nowhere to say so. "This question is wrong" is ambiguous
between two demands: *fix the content* and *fix my score*. The two look similar
at the point of complaint and diverge completely afterwards — one edits a
Question, the other reaches back into a graded Submission.

## Decision

A **Report** is a claim about a Question's content, and nothing else.

1. **A Report never re-grades a Submission.** Resolving a Report may change the
   Question; it never changes a past attempt's score, and a reporter is told
   nothing about their own result. ADR 0001's server-authoritative attempts and
   ADR 0002's immutable Recorded Answers stay literally true: no path exists
   that mutates a graded Submission after the fact.
2. **A Report stores no copy of the content it complains about.** No Question
   text, no answer key, no explanation is snapshotted onto the Report.
   `Question` gains an `UpdatedAt` instead; a Report older than the Question's
   last edit is stale by definition.
3. A Report is filed only after a **Check**, so it always hangs off a Recorded
   Answer — keyed `(SubmissionId, QuestionId)`, exactly like `RecordedAnswer`.
   That pairing is the evidence (*they picked B, we said C*) and doubles as the
   abuse limit: a Submission can file at most one Report per Question it was
   served, and cannot report a Question it was never shown. This is why
   anonymous visitors can report without any rate limiter.
4. `Language` is copied from the Submission, never read from the request
   (ADR 0004). There is deliberately **no** `BadTranslation` reason: the pair
   `UnclearWording` + `pt-BR` already names `TextPt` as the culprit.

## Considered options

**Re-grading on an upheld report.** Rejected: it makes every finished
Submission provisional, contradicts ADR 0001, and buys nothing for a V0 whose
stated purpose is collecting behavioral data rather than issuing credentials.
A grade appeal is just a defect report with an opinion attached — the same
signal arrives either way.

**Snapshotting Question content onto each Report.** Rejected: it duplicates
content on every row for provenance that only matters while a report is open.
`Report.CreatedAt` vs `Question.UpdatedAt` answers the only question triage
actually asks — *has this been dealt with since?* — for the cost of one column.

## Consequences

Fixing a Question implicitly resolves every Report filed before the edit, so
**editing the content is the bulk resolution workflow**; the `Open / Resolved /
Rejected` status exists for triage memory across passes, not as a queue anyone
is obliged to drain. There is no admin UI — triage is SQL, grouping by
Question and reason.

The provenance loss is real and unrecoverable: once a Question is edited, an
older Report's exact complaint cannot be reconstructed. Accepted, because a
stale report on an already-edited Question is one you'd discard anyway.

Reporting is **scoped to Subquizzes** for now, but the endpoint is standalone
(`POST /reports`, not nested under the Subquiz routes) because Questions are
not owned by Subquizzes and full-Quiz reporting is deferred rather than
cancelled. The Subquiz-only restriction lives in validation, not in the URL.
