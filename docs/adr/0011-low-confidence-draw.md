# 0011 — Low Confidence is a Confidence draw, not an Outcome draw

- Status: Accepted
- Date: 2026-08-27
- Related: ADR 0003 (Claiming), ADR 0006 (Confidence), ADR 0008 (Drill Mix),
  ADR 0010 (Mode and Drill),
  [Define the Low Confidence draw rule](https://github.com/CloudCertify/CloudCertify/issues/63)
- Amends: ADR 0008 (a practice drill is no longer only a Drill Mix)

## Context

ADR 0006 collected Confidence so a later review could re-serve lucky guesses
and other weak ratings. ADR 0008 then deferred confidence-aware Outcomes, so
Drill Mix still selects on correctness alone. The review mode named Low
Confidence is the first consumer of the rating. It cannot be a second Drill Mix
with a different label: Guess+correct is Mastered, and that is the question the
mode exists to catch.

Confidence is full-Quiz-only and optional. A practice Check does not collect
it. An unrated visitor has an empty set.

## Decision

1. **Membership is latest non-null Confidence on a finished full Quiz.**
   Guess or Unsure is in. Correctness is ignored, so a lucky guess is in.
   Unrated does not join and does not evict (silence is not a vote). Confident
   leaves. Unfinished attempts contribute nothing. Claiming attaches prior
   Anonymous full-Quiz ratings to the User, same as other evidence.
2. **This drill does not write Confidence.** The set moves only after the next
   finished full Quiz. If the visitor never rates again, the drill does not
   shrink.
3. **The draw is 15 questions, whole parent Quiz, cross-Domain.** Seat Low
   Confidence first, most recently rated Guess/Unsure first, then random. A
   question is served at most once.
4. **Short (1–14) pads Missed, then Unseen. Never Mastered.** Failed questions
   that were never Guess/Unsure can still appear as Missed padding. They are
   not Low Confidence.
5. **Empty does not start.** Logged-in with none in the set: visible, not
   startable. Anonymous: locked. Empty padding would be a missed-first drill
   wearing this name.
6. **Threshold is fixed Guess+Unsure.** No Guess-only control.
7. **Soft cooldown is a tuning knob**, default on: prefer questions not served
   in the last finished Low Confidence attempt. Drop it if honouring it would
   block start or drop Guess/Unsure already in the set. Tiny bank: drop
   cooldown and repeat rather than shrink. Ratios and cooldown are knobs, as
   in ADR 0008.

## Consequences

Drill Mix stays the Domain-scoped correctness draw. Low Confidence is a
separate draw rule on the same practice attempt shape (Check, percentage
score). The attempt-model remodel's nullable Domain exists so this draw can
run across the Quiz.

A Check here can still feed Outcome (that is a later ticket). It cannot
graduate Low Confidence membership.

## Considered and rejected

- **Two modes, Guess vs Guess+Unsure.** Guess-only nests inside Guess+Unsure.
  One button.
- **Membership as a function of Outcome.** Drops lucky guesses, which is what
  ADR 0006 collected Confidence for.
- **Latest row wins, including unrated.** A skipped rating would evict a lucky
  guess after a later correct answer, and graduate silence.
- **Spill when empty** into Missed then Unseen. Makes this retry-incorrect
  under another name.
- **Collect Confidence on this drill** so the set can shrink without a full
  Quiz. Rejected to keep ADR 0006's line: Confidence exists only where
  correctness is deferred.
- **Anonymous Low Confidence** keyed on email. Signing in is the lock, as
  adaptivity is elsewhere.
- **Pad with Mastered.** This is not a refresh drill.
