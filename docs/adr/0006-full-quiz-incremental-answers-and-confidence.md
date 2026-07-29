# 0006 — Full Quiz attempts commit answers incrementally, and carry Confidence

- Status: Accepted
- Date: 2026-08-02
- Amends: ADR 0002 (Recorded Answers are no longer Subquiz-only, and no longer
  unconditionally immutable)
- Related: ADR 0001, README V1 ("Behavioral data capture", "Confidence scoring")

## Context

V1 is gated on behavioral capture: per-question answer time, abandonment, and
misconception detection all require knowing what happened *during* an attempt.
Today only a Subquiz produces per-question state — a full Quiz sends one batch
at Submit (ADR 0001/0002), so the exam surface, which is where the interesting
signal lives, is a black box.

Confidence scoring is the first consumer of that capture, and it forced the
decision: there is nowhere to put a per-Question rating in a batch-submitted
attempt without inventing a throwaway batch shape.

## Decision

1. A full Quiz attempt commits each Question's answer as the visitor answers it,
   persisting a **Recorded Answer** — the same concept the Subquiz uses, widened
   rather than duplicated.
2. A full Quiz's Recorded Answer is **revisable until Submit**. Immutability was
   never intrinsic to the record; it was a property of Check being final. The
   Navigator explicitly allows returning to any Question, so the full Quiz's
   commits are mutable and the Subquiz's stay immutable.
3. A Recorded Answer in a full Quiz carries an optional **Confidence** —
   `Guess | Unsure | Confident`. Optional means optional: it never blocks Submit,
   and an unrated answer stores no Confidence (no `Unrated` member — that is a
   null wearing a costume, and it would appear as a phantom bucket in every
   `GROUP BY`).
4. Confidence **never affects grading**. Grading Strategies and the Scaled Score
   are untouched.
5. Results surface Confidence back to the visitor: lucky-guess and misconception
   counts on the results screen, and a per-Question Confidence badge in review
   next to the explanation.
6. Confidence is **not collected in a Subquiz** — it exists only where
   correctness is deferred.

## Consequences

**ADR 0002's prohibition still stands, and is the line to watch.** That ADR
warns a future reader not to extend Check to the full Quiz, because per-Question
correctness reveal leaks exam answers one Question at a time. This ADR extends
*commit*, not *feedback*: a full Quiz's incremental endpoint persists the answer
and returns nothing about correctness. Exam realism and the
server-authoritative posture of ADR 0001 are preserved — grading still runs at
Submit against `ServedQuestionIds`, so unanswered served Questions still count
as wrong.

**Answer time is measured to answer selection, not to rating.** Otherwise the
Confidence prompt sits inside the timed window and inflates every duration,
corrupting one V1 signal to collect another.

## Considered and rejected

- **Confidence on Subquizzes first** (cheapest — Recorded Answers already exist
  there, and a Check captures the rating pre-reveal, which is the cleanest
  possible capture). Rejected: a Check reveals correctness immediately, so the
  drill already gives the visitor what the rating would tell them; the signal is
  only load-bearing when correctness is deferred. Realism and Subquiz friction
  were supporting, not deciding, reasons.
- **Batch Confidence in the Submit body.** Avoids incremental capture, but
  invents a payload shape to be discarded at the next milestone and produces a
  "Recorded Answer" recorded at Submit rather than at answer time.
- **A separate Draft/Pending Answer concept** promoted to a Recorded Answer at
  Submit. Keeps "Recorded = immutable" pristine at the cost of two near-identical
  concepts, two tables, and a union in every future behavioral query.
- **Append-only revisions** (every answer change writes a new row, latest wins).
  Tempting — it yields answer-change history, a strong misconception signal — but
  it prices in an unvalidated V2 analytics question before basic capture ships.
  Can be added later as a separate event stream.
- **A 1–5 scale** (as the README originally said). Both use cases are 3-bucket
  predicates, mid-scale ratings are noisy, and `Guess` is exactly the predicate
  the planned "retry guessed" review mode needs. An enum also prevents
  `confidence > 3` magic numbers, and widening an enum later is safer than
  reinterpreting stored integers.
- **Confidence-weighted scoring.** Would break the Scaled Score's promise to
  mirror AWS's 100–1000 scale, and would teach visitors to always answer
  `Confident` — destroying the signal. Self-reported data must never be
  score-bearing.
