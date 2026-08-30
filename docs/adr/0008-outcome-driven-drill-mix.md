# 0008 — Subquizzes are drawn by Drill Mix; full Quizzes stay random

- Status: Accepted
- Date: 2026-08-09
- Related: ADR 0001 (unanswered served Questions count as wrong), ADR 0003
  (optional social login, Claiming), ADR 0006 (Confidence), ADR 0007 (stored
  correctness — the evidence this reads)
- Supersedes the README V1 bullet "Persist per-domain results per attempt"
- Amended by: ADR 0010 (Subquiz is Drill; Drill Mix is one Draw Rule on
  Practice, not the only practice draw), ADR 0011 (Mistakes is another; a
  practice attempt is no longer always 15 Questions; a Mistakes right Check
  does not write Mastered)

## Context

A Subquiz draws 15 Questions uniformly at random from its Domain, with no memory
of previous attempts. A visitor who misses a Question has no better chance of
seeing it again than one who aced it, so the drill cannot teach — it can only
sample.

The V1 goal is a learning platform, not a sampler: the Questions you miss should
come back, and the ones you know should get out of the way.

## Decision

1. **Outcome** is the visitor's latest evidence on one Question — `Missed`,
   `Mastered`, or `Unseen` — read from their **finished** Submissions across both
   full Quizzes and Subquizzes. The most recent Exam or Drill Mix attempt wins
   outright. A Mistakes attempt is the exception in decision 8.
2. A served Question with **no Recorded Answer** in a finished attempt is
   `Missed`, mirroring how grading already treats it (ADR 0001). An **unfinished**
   Submission contributes nothing at all.
3. A Subquiz attempt is drawn to a **Drill Mix** of 15: **9 Missed, 4 Unseen,
   2 Mastered**, each bucket filled at random from its pool, `Missed` ordered
   most-recently-missed first. A short bucket **spills** — `Missed` → `Unseen` →
   `Mastered`, `Unseen` → `Missed` → `Mastered`, `Mastered` → `Unseen` →
   `Missed`. The drill is always 15.
4. A **soft cooldown**: prefer Questions not served in the visitor's last
   finished attempt in that Domain. Dropped whenever honouring it would leave a
   bucket short.
5. Outcomes belong to a **User**. An anonymous attempt is drawn uniformly at
   random, exactly as today, and the drill start says so — signing in is what
   turns the drill adaptive.
6. **Full Quizzes are never adapted.** They feed evidence in; they are always
   drawn uniformly at random.
7. Correctness alone decides an Outcome. Confidence does not.
8. **A Mistakes right Check does not write Mastered.** Apply that attempt per
   Question: a wrong Check, or a served Question with no Recorded Answer, writes
   `Missed` (recency and miss count included). A right Check is a no-op for
   that Question's Outcome. The attempt still has a percentage score. Progress
   uses this same fold, so Standing does not rise from review rights.
   [Do review-mode attempts feed Outcome?](https://github.com/CloudCertify/CloudCertify/issues/65).

## Consequences

**A full Quiz's Scaled Score keeps meaning what it claims.** The moment an exam
oversamples a visitor's weak Questions, its score stops predicting the real exam
and the pass/fail promise is a lie. Evidence flows in from exams — they are the
richest source, 65 answers to a drill's 15 — but adaptivity flows out only to
drills. This is the line to watch: a future "make the exam adaptive too" is not
an extension of this ADR, it is a reversal of it.

**Signing in is the hook, and it pays out immediately.** Claiming (ADR 0003)
retro-attaches past Anonymous Submissions on login, so a visitor's first
logged-in drill is already built from the attempts they made before they had an
account. The prompt promises progress preserved, not progress started.

**Degradation is graceful everywhere.** No history → 15 Unseen, byte-identical to
today's behaviour, no special case in the code. Fully mastered Domain → 4 Unseen
+ 11 Mastered, a light review pass. Tiny Domain bank → cooldown drops and the
drill repeats Questions rather than shrinking.

**Improvement is visible on Exam and Drill Mix.** A corrected Question leaves
the Missed pool when those attempts write Mastered, so the mix shrinks toward
Unseen as the visitor learns there. A right Check on Mistakes does not. The
composition line at Drill Mix start (`9 review · 4 new · 2 refresh`) is therefore
also the progress indicator for that drill, not for the review list.

**Ratios, bucket sizes, spill order and cooldown scope are tuning knobs**, not
decisions of record. Change them with data; they are deliberately not fixed here
beyond the starting values.

## Considered and rejected

- **Weighted random sampling** over a per-Question score (miss count, recency
  decay, unseen prior). More expressive, and the natural home for the deferred
  ideas below. Rejected for now: it can hand a struggling visitor 15 fresh
  Questions by chance, it needs a seeded RNG or statistical tests to assert, and
  it cannot honestly state its own composition to the visitor. Buckets guarantee
  the mix and can be explained in four words.
- **Cumulative weakness** (`wrong_count` vs `right_count`). Punishes visible
  improvement and keeps a long-since-learned Question in the drill. Miss count
  survives as a *tiebreak within* the Missed bucket, which is where it belongs.
- **Concept-level weakness** — oversampling unseen Questions tagged with the
  Concepts a visitor keeps missing. Teaches the concept rather than the answer
  key, and `Question.Concepts` already exists. Deferred, not rejected: tag
  coverage is unverified and the signal is noisier. It enters later as another
  term in the same selection, not a rewrite.
- **Time-based cooldown** ("not within 12 hours"). Feels principled, but makes
  identical actions produce different drills, invites an unanswerable tuning
  argument, and is a half-built spaced-repetition scheduler — the V2 concept this
  milestone deliberately does not start.
- **Confidence-aware Outcomes** (a lucky guess — `Guess` + correct — counting as
  Missed). Directly serves what ADR 0006 collected Confidence *for*, and costs one
  clause. Deferred to keep this milestone's rule single-signal and its results
  attributable; it changes what is served next, never what is graded, so ADR 0006's
  "Confidence never affects a score" invariant would still hold when it lands.
- **Per-Question badging before the answer** ("you missed this last time").
  Primes the visitor, turns recall into recognition, and corrupts the very
  Outcome being collected. The same message *after* a Check is a reward, not a
  hint, and stays on the table.
- **Adaptivity for anonymous visitors**, keyed on the self-reported email.
  Reaches more visitors, and Claiming makes the identity nearly free. Rejected as
  a product decision: the feature is the reason to sign in, and it is worth more
  as an incentive than as a default.
- **Persisting a per-attempt domain breakdown** (the original V1 bullet).
  Cheaper, but a Domain-level tally cannot answer "which Question do I re-serve?",
  and per-Question Outcomes roll up to a Domain breakdown anyway.
- **Full feed from Mistakes** (a right Check Masters, same as Drill Mix). One
  fold, no special case. Rejected: the visitor was just shown a list of their
  misses, so a correct Check is recognition, and V2's spaced practice would
  inherit Mastered rows that were never retrieved cold.
- **Mistakes attempts produce no Outcomes.** Clean, but a wrong Check on a lucky
  guess would leave it Mastered, and Drill Mix would never learn the fail.
- **N-correct discount before a review can Master.** Closest to a strength bar,
  and a tiny scheduler V1 does not otherwise have. Rejected; Exam and Drill Mix
  still Master in one Check, which is enough retrieval for this milestone.
