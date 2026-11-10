# 0007 — Correctness is stamped on a Recorded Answer when it is committed

- Status: Accepted
- Date: 2026-08-09
- Related: ADR 0001 (server-authoritative attempts), ADR 0005 (Reports change
  Questions, never past scores), ADR 0006 (Recorded Answers on full Quizzes),
  ADR 0008 (the first consumer)
- Amended: 2026-11-09, issue #103 (decision 3 reversed: the stamp is the input
  to the score; see Amendment below)

## Context

Whether a visitor got a Question right has always been a transient value:
`QuestionCorrectness.IsCorrect` runs during grading, feeds the score, and is
thrown away. `RecordedAnswer` stores only the selected answer ids.

That was fine while correctness only ever mattered inside a single attempt. It
stops being fine the moment a learning signal is built on top of it (ADR 0008),
because the signal spans attempts and outlives them.

Correctness is derivable — join a Recorded Answer's selected ids against the
Question's current `Answer.IsCorrect` rows. The question is whether deriving it
is *correct*.

## Decision

1. A Recorded Answer carries **`IsCorrect`**, judged and stored at the moment the
   answer is committed — at Check for a Subquiz, at answer-commit for a full
   Quiz, re-stamped on revision until Submit (ADR 0006).
2. It is never recomputed afterwards. Nothing re-judges a stored Recorded Answer.
3. ~~Grading is unchanged. Strategies keep judging against `ServedQuestionIds` at
   Submit, so an unanswered served Question still counts as wrong (ADR 0001) and
   the Scaled Score is untouched. `IsCorrect` is a record of what happened, not
   an input to the score.~~ Reversed by the 2026-11-09 amendment: grading reads
   `IsCorrect`.
4. No aggregate table. Per-visitor rollups stay derivable from Recorded Answers.

## Consequences

**A Report resolution can no longer rewrite history.** ADR 0005 already settled
that fixing a defective Question changes the Question but never re-grades a past
attempt. Deriving correctness by live join would have quietly broken exactly that
rule through the back door: correct an answer key, and every past visitor
retroactively "knew" — or stopped knowing — a Question they never saw in its
corrected form. Their next drill would then be built from that fiction. Stamping
at commit time extends ADR 0005's principle from scores to the learning signal,
which is the same promise: an attempt is a closed historical fact.

**Denormalized data can drift, and here that is the point.** A stored
`IsCorrect` that disagrees with today's answer key is not a bug to reconcile —
it is the record that the visitor answered a different Question than the one that
now exists. Do not add a job that "repairs" these rows.

**Cost is one boolean per answer**, written on a path that already writes.

**Analytics gets the cheap version for free.** Success rate and most-failed
questions (README V1) become a `GROUP BY` over Recorded Answers instead of a
three-table join through the answer key.

## Considered and rejected

- **Live join against `Answer.IsCorrect`.** Zero schema change, always
  "consistent" — with the present, which is the wrong thing to be consistent
  with. Rejected on the ADR 0005 grounds above.
- **A `QuestionMastery` aggregate keyed by (User, Question)** holding counts and
  timestamps. Faster reads, but it is a cache of a fact the attempts already
  contain, needing a backfill path forever and drifting silently when a write
  path forgets it. It remains available later as a rollup rebuildable from
  Recorded Answers; the reverse is not true, which is why this direction is the
  safe one to take first.
- **Storing the correct answer ids alongside the selection**, so correctness
  stays derivable from the row itself. Strictly more faithful, and genuinely
  tempting for a future "what did the key say back then?" review screen. Rejected
  as speculative width: no consumer asks for it, and it can be added later
  without invalidating the boolean.
- **Persisting per-domain results per attempt** (the original README bullet).
  Cheap, but it stores an aggregate whose per-Question detail is the thing the
  learning signal actually needs — the wrong grain. A domain breakdown is a
  `GROUP BY Question.Domain` over this boolean.

## Amendment (2026-11-09): the stamp is the input to the score

Decision 3 gave every answer two verdicts: the stamp, read by Outcome, Recall,
Standing, the Progress trend and the Mistakes draw, and a second judgement made
at Submit against the answer key of that moment. Most of the time they agree.
When a Report is resolved during someone's attempt, they don't: the Score counts
the Question one way and the learning signal counts it the other, and an Exam's
stored Scaled Score and its Progress point come from two definitions of correct.

So grading now reads the stamp, and the answer key is no longer an input:

- A served Question counts as correct only when its Recorded Answer's
  `IsCorrect` is true. No Recorded Answer counts as wrong, which preserves ADR
  0001. A null stamp counts as wrong too; the Outcome fold already treats it as
  not proven.
- `QuestionCorrectness` stays the only exact-match judge. It runs at commit
  time (Check in Practice, answer-commit in an Exam, re-stamped on revision),
  and nowhere else.
- The Score, the Domain breakdown, the lucky-guess and misconception counts,
  and the per-Question verdict in the results payload all come from that one
  judgement. The web review list reads that verdict and stops deriving its own.

ADR 0005's promise that resolving a Report never re-grades now covers an
attempt in progress too: a key fix changes the Question for future attempts and
leaves alone whatever an attempt has already recorded. Finished Submissions keep
the Score they were given; nothing is re-graded or migrated.
