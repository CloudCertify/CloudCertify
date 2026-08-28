# 0002 — Subquizzes are answered incrementally with per-question feedback

- Status: Accepted
- Date: 2026-06-30
- Supersedes for subquizzes: the batch `SubmitSubquiz` flow
- Related: ADR 0001, issue #12
- Amended by: ADR 0010 (the attempt that Checks is Practice on a Drill, not a
  Subquiz type; the prohibition below is unchanged)

## Context

Subquizzes are practice drills; the product goal (README) is fast feedback
loops, low friction, and instant correction. The existing flow batch-grades at
the end and, by issue #12's design, never reveals correctness mid-attempt — the
`SubmissionGrader` is stateless: it grades the answers sent in the submit body
against `ServedQuestionIds` and persists only `Score` and `Finished`.

## Decision

A Subquiz attempt is answered one Question at a time:

1. Each **Check** persists a **Recorded Answer** (the Question's selected answer
   ids) to the Submission and returns that Question's correctness, its correct
   answer ids, and its explanation.
2. A Recorded Answer is immutable once committed — a checked Question is not
   re-answered (no going back).
3. An explicit **finish** call grades the accumulated Recorded Answers via the
   existing subquiz `GradingStrategy` against `ServedQuestionIds` and marks the
   Submission `Finished`. The Grading Strategy stays the single source of the
   final 0-100 score.
4. The batch `SubmitSubquiz` path is retired.

ADR 0001 is preserved: finish grades against the served set, so an abandoned or
force-finished attempt with unchecked served Questions counts those as wrong and
the denominator stays stable.

## Trade-off & scope

This makes the subquiz grader **stateful**, diverging from the stateless quiz
grader (#12). Accepted because instant per-question feedback requires committed
per-question state to grade from at finish.

Per-question correctness reveal is **scoped to Subquizzes only**. The full
CLF-C02 Quiz stays batch-graded and never reveals answers mid-attempt — this
preserves exam realism and the server-authoritative posture of ADR 0001. A
future reader must not extend Check to the full Quiz: doing so leaks exam
answers one Question at a time.
