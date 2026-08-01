# 0009 — A Report may carry a suggested edit, stored as a sparse patch and never auto-applied

- Status: Proposed
- Date: 2026-07-28
- Related: ADR 0004, ADR 0005, issues #40, #41

## Context

ADR 0005 made a Report a *claim*: reasons plus an optional 200-char comment.
Triage then has to guess which part of the Question is broken — and for the
most common defect, a single wrong option or one badly worded answer, the claim
does not say which option. Free text does not fix this: it is unqueryable, and
it is the field people skip.

Reporters usually know the correction. They have just read the Question, the
key and the Explanation. Asking them only to categorise their complaint throws
away the part of their knowledge that is expensive for us to reproduce.

## Decision

A Report may carry an optional **Suggestion** — the reporter's proposed
correction to the Question they were served.

1. **A Suggestion is a sparse patch, not a snapshot.** Only fields the reporter
   actually changed are stored:

   ```
   Suggestion?
     QuestionText?  string                             // absent = unchanged
     Answers[]      { AnswerId, Text?, IsCorrect? }     // only touched answers
   ```

   ADR 0005's "no copy of the reported content" holds: we store what the text
   *should* say, never a duplicate of what it said. `Report.CreatedAt` versus
   `Question.UpdatedAt` still answers whether the patch is stale.

2. **A Suggestion is never applied automatically.** It is read by a human, who
   edits the Question by hand. No path exists from a visitor's text to
   published content. This keeps anonymous reporting safe without a moderation
   queue, and keeps ADR 0001 intact — nothing here touches a graded Submission.

3. **The patch must be coherent to be accepted.** `AnswerId`s must belong to
   that Question, and if any `IsCorrect` is supplied the resulting key must be
   valid for the Question's type: exactly one correct answer for
   `multiple_choice`, exactly `SelectCount` for `multiple_response`. An
   inapplicable patch is rejected at the endpoint rather than discovered in
   triage.

4. **Patched text is Language-scoped by the Submission** (ADR 0004): a patch
   from a `pt-BR` Submission proposes new `TextPt`, never `TextEn`. The client
   still supplies no language.

5. **Reasons are inferred from the patch, and remain overridable.** Toggling
   correctness implies `WrongAnswerKey`; editing question or answer text implies
   `UnclearWording`. The reporter demonstrated the category by making the edit;
   asking them to also tick it is asking twice. At least one reason is still
   required, so a patch-only Report is well formed by construction.

6. **Filing again while `Status = Open` upserts.** ADR 0005's one Report per
   `(SubmissionId, QuestionId)` stays the key, but a reporter who files a claim
   and then returns to suggest a fix must not be blocked by their own 409. A
   Report that is `Resolved` or `Rejected` still conflicts.

## Considered options

**An `AnswerIds[]` pointer instead of a patch.** Cheaper: one column, names the
offending option, no free text. Rejected as the end state because it captures
*where* the defect is and not *what is wrong with it* — for a wrong key, the
correction is the entire signal. The pointer is subsumed: an edited answer is
the pointer.

**A separate `AnswerReport` entity.** Rejected: it duplicates the report
pipeline for what is a field on an existing row, and answers have no triage
lifecycle of their own.

**Applying accepted Suggestions programmatically.** Rejected for now: it needs
the patch to survive answer-id drift and Question edits, plus a moderation
surface, for a workflow whose bottleneck is a human reading the diff — not
typing the result.

## Consequences

**Triage stops being SQL alone.** A JSON patch read in psql is workable for
tens of reports and miserable at hundreds. This pulls the admin surface that
issue #40 deferred back onto the roadmap; it is the real cost of this ADR, and
it is deferred deliberately, not overlooked.

**The abuse surface grows.** Anonymous free text goes from 200 characters to
several fields of Question-length text. The Recorded Answer gate still caps
volume at one Report per served Question, and per-field caps mirroring the
content columns cap size, but this is thinner than before and may eventually
need a rate limit.

**Suggesting stays optional and second.** The default control remains a
one-click claim; the editor is progressive disclosure behind a second step. If
the editor becomes the only path, report volume falls — the cheap signal is
worth more than the rich one is.
