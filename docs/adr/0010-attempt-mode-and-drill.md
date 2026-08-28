# 0010 — An attempt is a Mode; a Drill is a named selector, not a behaviour preset

- Status: Accepted
- Date: 2026-08-28
- Related: ADR 0001, ADR 0002, ADR 0006, ADR 0008, ADR 0011,
  [Decide the attempt-model remodel shape](https://github.com/CloudCertify/CloudCertify/issues/59)
- Amends: ADR 0002, ADR 0008
- Amended by: ADR 0011 (the review Draw Rule is `Mistakes`, not `LowConfidence`)

## Context

`Subquiz` bundled three independent axes (draw rule, feedback timing, grading)
into two presets, and `Submission` discriminated behaviour on a nullable
`SubquizId`. A cross-Domain review drill is a new combination of those
axes and cannot be expressed: `Subquiz.Domain` is non-null. A third attempt
type as a third nullable FK is the same smell again.

ADR 0002 and ADR 0008 both assume the Subquiz preset. 0002's prohibition is
load-bearing: per-Question correctness reveal must not leak into a full Quiz.

## Decision

1. **`Submission.Mode` is `Practice | Exam`.** Mode is the sole discriminator
   for the forked behaviours: draw, feedback timing, grading, mutability,
   Confidence, Navigator. Every `SubquizId == null` behaviour check is retired
   in favour of reading Mode.
2. **`Subquiz` is renamed `Drill`** and generalised into a named selector over
   a parent Quiz's questions. `Domain` becomes nullable. A **Draw Rule**
   discriminator is added (`Uniform`, `DrillMix`, `LowConfidence`; renamed to
   `Mistakes` by ADR 0011, which merged the two review modes into one). A Drill
   keeps catalog identity: Title, Slug, IsAvailable, and its linkable route.
3. **A Drill never owns questions** and is not the questions' link to a Quiz.
   Questions belong to a Quiz via `Question.QuizId`. A Drill points into the
   Quiz and, at attempt start, selects a subset by Domain and/or Draw Rule. An
   Exam attempt uses no Drill and draws from the whole `quiz.Questions` pool.
4. **The cross-Domain review is one seeded Drill row:**
   `Domain = null`, `DrawRule = Mistakes`, with a Slug and Title,
   computing its questions per user when the attempt starts. The draw itself
   is ADR 0011.
5. **Start-path invariant**, held at the start paths, not as a runtime guard
   on a representable combo:
   - Start a full Quiz → `Mode = Exam`, no Drill.
   - Start a drill → `Mode = Practice`, exactly one Drill.
   Because a full Quiz never references a Drill, the combos ADR 0002 and
   ADR 0008 forbid (an adaptive or immediate-feedback exam that still emits a
   Scaled Score) stay unrepresentable.
6. **`Mode.Exam` keeps the word Exam.** `Quiz` still lists Exam on its Avoid
   line: that ban is about the catalog entity. Mode names how a Submission
   behaves. Different axes. Recorded in `CONTEXT.md`.
7. **Migration is additive.** Existing `Subquiz` rows become Drills with
   `DrawRule = DrillMix` and their current Domain. The table, the
   `/quiz/:id/subquiz/:subquizId/session` route, and the `MeController`
   mapping rename to Drill. `OutcomeSnapshot.Build` currently requires a
   `domainQuestionIds` set; a null-Domain Drill needs a path over the whole
   parent-Quiz question set.

**ADR 0002's prohibition survives.** Check is a Practice behaviour. Extending
it to Exam would leak exam answers one Question at a time. ADR 0006 already
extended *commit* to the full Quiz, not *feedback*; this ADR does not change
that line.

**ADR 0008 is narrowed, not reversed.** Drill Mix remains the Domain-scoped
correctness draw. It is no longer the only practice draw: Mistakes is
another Draw Rule on the same Practice shape (ADR 0011). Full Quizzes stay
uniformly random. Evidence still flows in from every finished attempt;
adaptivity still flows out only through Practice draws.

## Considered and rejected

- **(a) Drop the Drill row for a Mode-plus-params `Submission`.** Deletes
  shipped Title, Slug, IsAvailable, and the linkable route. The migration
  stops being additive.
- **(c) Split the three axes free.** Makes the exam-leak combo a representable
  state and moves the invariant into a runtime guard. Buys flexibility
  nothing in V1 needs.
