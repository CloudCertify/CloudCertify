# 0013 — Recall: mastery decays on a half-life ladder, and drills draw the least recalled

- Status: Accepted
- Date: 2026-11-08
- Related: ADR 0008 (Drill Mix), ADR 0010 (Mode and Drill), ADR 0011 (Mistakes),
  [Specify the analytics read model and endpoint contract](https://github.com/CloudCertify/CloudCertify/issues/61)
- Amends: ADR 0008 (the 9 Missed / 4 Unseen / 2 Mastered buckets; Drill Mix is
  no longer Domain-only), #61 (Standing is no longer the share Mastered)

## Context

Outcome is latest-attempt-wins and never expires. A Question answered right
once in March is Mastered in November, so Drill Mix keeps it out of the way and
Standing keeps counting it, long after the visitor has forgotten it. The V2
roadmap asks for mastery that expires: a per-Question weight that decays with
time since the last proof.

Duolingo's first spaced repetition model was a Leitner ladder; it later moved to
a trained half-life regression. We have neither the data nor the need for a
trained model, but we can borrow its shape: recall halves every half-life, and
the half-life grows with each proof.

## Decision

1. **Recall** is a per-Question value from 0 to 1:
   `2^(-days since last proof / half-life)`. Missed is 0. Unseen has no Recall.
2. **The half-life climbs a fixed ladder**: 1, 3, 7, 14, 30 days, one rung per
   consecutive proof, capped at 30. A miss drops it to the first rung.
3. **A proof** is a right answer to a Question that is Due, or the first right
   answer after Unseen or Missed. A right answer before the Question is Due
   proves nothing: no rung, no clock restart. Exam answers prove; a Mistakes
   right Check does not (ADR 0011).
4. **Due** is a Mastered Question with Recall ≤ 0.5. It is not an Outcome.
5. **Recall is computed on read** by the same oldest-first fold that builds
   Outcome. The proof's time is its Submission's `CreatedAt`. No column, no
   migration.
6. **Drill Mix draws by Recall**: 11 seats for the lowest Recall among Missed
   and Due (Missed first, most recently missed first; then Due, lowest Recall
   first), 4 seats for Unseen. A short side spills into the other; a not-Due
   Mastered Question is a last resort. The soft cooldown stays. One rule for
   Domain-scoped and whole-Quiz drills.
7. **Drill Mix may run across the whole Quiz.** Each Quiz gets a seeded,
   null-Domain Drill Mix Drill, titled Mix, listed first on the Quiz page.
8. **Standing is mean Recall** of the Domain's seen Questions, as a percentage.
   It falls without review.
9. **Drill Composition** reports Missed, Due and Unseen (plus Mastered for
   last-resort seats).

## Consequences

- Standing and the drill read one fold, so they still cannot disagree.
- Standing now moves with the clock, not only with attempts. A visitor back
  after two weeks sees lower numbers. That is the intended signal.
- `Submission.CreatedAt` is the attempt's start, not the answer's time. A drill
  takes minutes and the shortest half-life is a day, so the error is noise. Add
  `FinishedAt` only if a real case needs it.
- Ladder rungs, the 0.5 threshold and the 11/4 split are tuning knobs, like
  ADR 0008's bucket sizes. Change them with data.
- No daily goal, streak or XP. Nothing here stops adding them later.
