# 0011 — One review drill: Mistakes draws misses and low-confidence answers

- Status: Accepted
- Date: 2026-08-27, amended 2026-08-28, 2026-08-30
- Related: ADR 0003 (Claiming), ADR 0006 (Confidence), ADR 0008 (Drill Mix),
  ADR 0010 (Mode and Drill),
  [Define the Low Confidence draw rule](https://github.com/CloudCertify/CloudCertify/issues/63),
  [Is "retry incorrect" distinct from the existing Drill Mix?](https://github.com/CloudCertify/CloudCertify/issues/64),
  [Do review-mode attempts feed Outcome?](https://github.com/CloudCertify/CloudCertify/issues/65)
- Amends: ADR 0008 (a practice drill is no longer only a Drill Mix; a
  practice attempt is no longer always 15 questions; a Mistakes right Check
  does not write Mastered)

## Context

ADR 0006 collected Confidence so a later review could re-serve lucky guesses
and other weak ratings. ADR 0008 then deferred confidence-aware Outcomes, so
Drill Mix still selects on correctness alone. Confidence is full-Quiz-only and
optional, so a Check does not collect it and an unrated visitor has an empty
set.

The README listed two review modes, "retry incorrect" and Low Confidence. They
turn out to be one feature. Both re-serve questions the visitor is weak on,
both run across the whole parent Quiz, both need a User, and both would carry
the same gate, the same cooldown and the same catalog slot. Two drills would
have meant two rows, two rules and two buttons over one intent.

Drill Mix cannot serve either of them. Guess plus correct is Mastered, and that
is exactly the answer a review exists to catch. A 15/0/0 Drill Mix is not the
same rule with a parameter: a 15/0/0 that still spills is Drill Mix again, and
a 15/0/0 that refuses to start is this rule wearing mix numbers.

## Decision

1. **One Draw Rule, named Mistakes.** The Draw Rule discriminator is `Uniform`,
   `DrillMix`, `Mistakes`. `LowConfidence` is not a Draw Rule. One seeded Drill
   per parent Quiz, `Domain` unset.
2. **Membership is a union of two sets.** A Question is in if its latest
   Outcome is Missed, or its latest non-null Confidence on a finished full Quiz
   is Guess or Unsure. Correctness does not matter to the second half, so a
   lucky guess is in. Unrated does not join and does not evict; silence is not
   a vote. Confident leaves. Unfinished attempts contribute nothing. A Question
   in both halves takes one seat. Claiming attaches prior Anonymous full-Quiz
   ratings to the User, same as other evidence.
3. **This drill writes Missed, not Mastered, and never Confidence.** Apply a
   finished Mistakes attempt per Question: a wrong Check or a served skip
   writes Missed; a right Check does not write Mastered, recency, or miss
   count. The Confidence half moves only after the next finished full Quiz.
   Membership stays the union in decision 2. There is no second Missed set.
   A 100% review score can leave every served Question Missed. Progress uses
   the same fold, so Standing does not rise from those rights.
4. **The draw is the whole parent Quiz, capped at 15, with no minimum.** Three
   in the union means three Questions. No padding, ever: not Unseen, not
   Mastered. This is the one drill that may be shorter than 15.
5. **Missed seats first.** Most recently missed first, miss count breaking
   ties, then Guess or Unsure by rating recency. A Question is served at most
   once. Shuffle is presentation, never selection.
6. **Empty does not start.** No misses and no low ratings: visible, not
   startable. Anonymous: locked, since both halves need a User.
7. **Threshold is fixed Guess plus Unsure.** No Guess-only control.
8. **Soft cooldown is a tuning knob**, default on: prefer Questions not served
   in the last finished Mistakes attempt. Drop it rather than skip a member or
   refuse to start. Tiny bank: repeat rather than shrink.
9. **No Drill Composition. A count instead.** Start shows `12 mistakes`. A
   three-bucket line would be a lie on a single-bucket draw, and `12 · 0 · 0`
   says nothing the count does not.

## Consequences

Drill Mix stays the Domain-scoped correctness draw, unchanged: 9 Missed, 4
Unseen, 2 Mastered, one Domain, always 15, short buckets spill. Mistakes is a
separate rule on the same practice attempt shape, Check and percentage score.
ADR 0010's nullable Domain is what lets it run across the Quiz.

Missed-first seating has a cost worth stating plainly. A visitor with 15 or
more Missed Questions sees no low-confidence Question until they work the
misses down. The alternative, one recency order across the union, has the
mirror cost and a worse one: misses accumulate faster than ratings, since a
served Question with no Recorded Answer already counts Missed, so guesses would
be pushed off the list indefinitely rather than temporarily.

Variable length is new. Every existing draw returns 15, and the UI, the tests
and the Drill Composition slot all assumed it. A Mistakes attempt of 3 is
correct, not a bug.

The empty gate is now rare. It fires only for a visitor with no misses and no
low ratings, which in practice means someone who has barely started or has
genuinely cleared the bank.

A right Check on this drill cannot shrink the Missed half. Graduation is an
Exam or Drill Mix Check, where the Question was not sitting on a known-miss
list. That is the V1 fold V2's spaced practice can inherit without unwinding
recognition that looked like Mastery.

## Considered and rejected

- **Two review drills**, Mistakes and Low Confidence side by side. One
  feature, one intent, one catalog slot. Two rows and two buttons would have
  asked the visitor to classify their own weakness before practising it.
- **Membership as a function of Outcome alone.** Drops lucky guesses, which is
  what ADR 0006 collected Confidence for.
- **Drill Mix with the mix set to 15/0/0.** ADR 0008's ratios are knobs, but
  ADR 0010's Draw Rules are named rules, not mix tuples. Spilling makes it
  Drill Mix; refusing to spill makes it this rule under a worse name.
- **Latest row wins, including unrated.** A skipped rating would evict a lucky
  guess after a later correct answer, and graduate silence.
- **Padding a short set** with Unseen, or with Mastered. Padding is the spill
  trick again, and it turns a 3-question review into a 15-question drill the
  visitor did not ask for.
- **One recency order across the union.** See Consequences.
- **Collect Confidence on this drill** so the set can shrink without a full
  Quiz. Rejected to keep ADR 0006's line: Confidence exists only where
  correctness is deferred.
- **Anonymous review** keyed on email. Signing in is the lock, as adaptivity is
  elsewhere.
- **Shipping a `LowConfidence` Draw Rule value** alongside `Mistakes`. Nothing
  would draw with it.
- **A right Check on this drill writes Mastered.** Same fold as Drill Mix.
  Rejected in
  [Do review-mode attempts feed Outcome?](https://github.com/CloudCertify/CloudCertify/issues/65):
  recognition on a known-miss list is not retrieval, and V2 would treat those
  rows as learned.
- **Skip the whole Mistakes Submission in the fold.** A wrong Check on a lucky
  guess would never write Missed.
- **A right Check also evicts Guess or Unsure membership.** That would write
  a third set, or move Confidence from a Check. Rejected: the rating half still
  waits for the next Exam.
