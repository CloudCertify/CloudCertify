# CloudCertify

Adaptive certification learning system. V0 ships a functional cloud-exam
simulator (CLF-C02) and is collecting behavioral data to justify later
adaptive-learning work.

## Language

**Quiz**:
A full certification exam definition (e.g. CLF-C02). Owns its questions,
domain weights, and grading rules. A Quiz is the exam, not a single attempt.
_Avoid_: Exam, Test, Simulation

**Subquiz**:
A focused, single-Domain practice drill carved out of a parent Quiz's
questions. Answered one Question at a time with instant feedback (Check),
unlike a full Quiz. Scored as a simple 0-100 percentage (pass ≥ 70), distinct
from a full Quiz attempt's scaled score.
_Avoid_: Mini-quiz, Practice test, Section

**Check**:
The act of committing a single Question's selected answers during a Subquiz to
get back immediate correctness, the correct answers, and the Question's
explanation. A Check is per-Question and final — once checked a Question is not
re-answered. Distinct from Submit, which finishes a whole attempt.
_Avoid_: Submit (one question), Grade, Reveal, Try

**Submission**:
One attempt at a Quiz or Subquiz. Holds the finished state and final score; a
Subquiz Submission also accumulates the visitor's Recorded Answers as they are
checked. Born with exactly one of: a User (logged-in) or a self-reported
email (anonymous); an Anonymous Submission later Claimed has both.
_Avoid_: Attempt, Session, Result, Try

**User**:
A person with an account, created via social login. Has one or more Providers
and carries only provider-sourced profile data (email, display name, avatar).
Optional — quizzes work without one; login exists only for richer data and
experience.
_Avoid_: Account, Member, Visitor

**Provider**:
An external identity (Google, GitHub) linked to a User. A User can have
several; each Provider belongs to exactly one User. A new Provider whose
provider-verified email matches an existing User auto-links to that User;
unverified emails never auto-link and create a separate User instead.
_Avoid_: Social account, Login method

**Anonymous Submission**:
A Submission made without a logged-in User, identified only by a
self-reported email.

**Claiming**:
Automatically attaching past Anonymous Submissions to a User when the
Submission's email matches any of the User's provider-verified emails. Runs on
every login; idempotent.
_Avoid_: Merging, Importing

**Recorded Answer**:
One Question's selected answers committed to a Subquiz Submission at Check time.
Immutable once recorded; the set of Recorded Answers is what a Subquiz's final
score is computed from at finish. Full Quiz attempts have no Recorded Answers —
they are graded from the answers sent in one batch at Submit.
_Avoid_: Response, Choice, Pick

**Navigator**:
The numbered jump control shown during a full Quiz attempt. Marks every
served Question as answered, unanswered, or current, and moves directly to
any Question before Submit. Exists for a full Quiz only — a Subquiz is
forward-only because a Check is final.
_Avoid_: Grid, Palette, Question map, Review screen

**Domain**:
An exam content area defined by the certification body (e.g. "Security and
Compliance"). Carries an official Weight in a full Quiz's grade and is the
unit a Subquiz is scoped to.
_Avoid_: Topic, Category, Section, Area

**Scaled Score**:
A full Quiz result expressed on AWS's 100-1000 scale (pass ≥ 700), computed
from Domain-weighted correctness. Applies to a full Quiz only — never to a
Subquiz.
_Avoid_: Score, Grade, Points

**Language**:
The locale a Submission is served in — `en-US` (default) or `pt-BR`. Chosen
via `Accept-Language` when the attempt starts, fixed on the Submission for its
whole life (no mid-attempt switch), and applied to Question text, Answer text,
and Explanations. Missing translations fall back to `en-US` per field. Quiz and
Subquiz titles/descriptions are not yet localized.
_Avoid_: Locale, Culture, Translation (the act, not the choice)

**Grading Strategy**:
The per-Quiz rule for turning answered Questions into a result. CLF-C02 uses
Domain-weighted scaled scoring; a Subquiz uses flat percentage; everything
else uses a default percentage-on-the-1000-scale fallback.
_Avoid_: Scorer, Grader, Marker
