# CloudCertify

Adaptive certification learning system. The shipped product is a functional
cloud-exam simulator across six available exams; V1 is the current effort.

## Language

**Quiz**:
A full certification exam definition (e.g. CLF-C02). Owns its questions,
domain weights, and grading rules. A Quiz is the cataloged exam, not an
attempt. Do not call the Quiz an Exam: Exam is a Submission Mode.
_Avoid_: Exam, Test, Simulation

**Drill**:
A named selector over a parent Quiz's questions. Has a Title, Slug,
availability, and a linkable route. Does not own questions; questions belong
to the Quiz. May be scoped to one Domain or run across the Quiz. At attempt
start it selects a subset by Domain and Draw Rule. Answered with Check.
Scored as a 0-100 percentage (pass ≥ 70), never a Scaled Score.
_Avoid_: Subquiz, Mini-quiz, Practice test, Section

**Mode**:
Which attempt shape a Submission is. Practice starts from exactly one Drill:
Check, forward-only, percentage, no Confidence, no Navigator. Exam starts a
full Quiz with no Drill: deferred correctness, Navigator, Scaled Score,
optional Confidence. Those behaviours follow Mode, not which Drill was picked.
_Avoid_: Attempt type, Kind, Style

**Draw Rule**:
How a Drill chooses which of the Quiz's questions to serve. Domain-scoped
Uniform (no Outcomes) and Drill Mix; Mistakes across the whole Quiz.
An Exam has no Draw Rule: it draws uniformly from the whole Quiz so the
Scaled Score still predicts the real exam.
_Avoid_: Selection, Algorithm

**Feedback Timing**:
When the visitor learns whether they were right. Practice reveals at Check.
Exam reveals only at Submit. Check never belongs on an Exam: that would leak
answers one Question at a time.
_Avoid_: Reveal, Instant feedback

**Check**:
The act of committing a single Question's selected answers during Practice to
get back immediate correctness, the correct answers, and the Question's
explanation. A Check is per-Question and final — once checked a Question is not
re-answered. Distinct from Submit, which finishes a whole attempt.
_Avoid_: Submit (one question), Grade, Reveal, Try

**Submission**:
One attempt at a Quiz, carrying a Mode. Holds the finished state and final
score; a Practice Submission also accumulates the visitor's Recorded Answers
as they are checked. Born with exactly one of: a User (logged-in) or a
self-reported email (anonymous); an Anonymous Submission later Claimed has
both.
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
One Question's selected answers committed to a Submission, whether they were
correct, plus the visitor's Confidence in a full Quiz. Correctness is judged and
stamped when the answer is committed and never re-judged afterwards, so a later
fix to a Question's answer key cannot rewrite what the visitor knew at the time.
Every attempt accumulates them, but their lifecycle
follows the Mode: in Practice a Recorded Answer is committed at Check
and is immutable, because a Check is final; in an Exam it is committed as
the visitor answers and stays revisable until Submit, because the Navigator
allows returning to any Question. Either way, the accumulated Recorded Answers
are what the attempt's final score is computed from.
_Avoid_: Response, Choice, Pick

**Confidence**:
The visitor's self-reported certainty about a Question's answer — Guess,
Unsure, or Confident — committed with the answer itself and revisable with it.
Names the two things a score cannot: a _lucky guess_ (Guess, correct) and a
_misconception_ (Confident, incorrect). Optional; an unrated answer is normal
and carries no Confidence. Never affects a score — it is reported back, not
graded on. Exists only where correctness is deferred, so an Exam has
Confidence and Practice does not: a Check reveals correctness immediately, so
the drill already tells the visitor what a rating would have. Low Confidence
reads the latest non-null rating; a Check never writes one.
_Avoid_: Certainty, Sureness, Conviction

**Low Confidence**:
The visitor's latest non-null Confidence on a finished full Quiz, when that
rating is Guess or Unsure. Correctness does not matter, so a lucky guess is in.
An unrated answer does not join and does not evict. Not a Draw Rule: it is one
of the two sets Mistakes draws from, alongside Missed. Belongs to a User.
The set moves only after the next finished full Quiz.
_Avoid_: Flagged, Guessed, Retry guessed

**Report**:
A visitor's claim that a Question's content is defective — wrong answer key,
bad wording, stale fact, bad translation. About the Question itself, never
about a Submission's score: resolving a Report may change the Question, but
never re-grades a past attempt. Filed from Practice only, and only after the
Question has been Checked, so every Report carries the reporter's Recorded
Answer as evidence. Anonymous visitors may file. Carries the Submission's
Language, so a Report always names which language's text was defective — there
is no separate "bad translation" reason.
_Avoid_: Flag, Complaint, Dispute, Feedback, Appeal

**Navigator**:
The numbered jump control shown during a full Quiz attempt. Marks every
served Question as answered, unanswered, or current, and moves directly to
any Question before Submit. Exists for an Exam only — Practice is
forward-only because a Check is final.
_Avoid_: Grid, Palette, Question map, Review screen

**Domain**:
An exam content area defined by the certification body (e.g. "Security and
Compliance"). Carries an official Weight in a full Quiz's grade. A Drill Mix
Drill is scoped to one Domain; Mistakes is not.
_Avoid_: Topic, Category, Section, Area

**Scaled Score**:
A full Quiz result expressed on AWS's 100-1000 scale (pass ≥ 700), computed
from Domain-weighted correctness. Applies to an Exam only — never to Practice.
_Avoid_: Score, Grade, Points

**Language**:
The locale a Submission is served in — `en-US` (default) or `pt-BR`. Chosen
via `Accept-Language` when the attempt starts, fixed on the Submission for its
whole life (no mid-attempt switch), and applied to Question text, Answer text,
and Explanations. Missing translations fall back to `en-US` per field. Quiz and
Drill titles/descriptions are not yet localized.
_Avoid_: Locale, Culture, Translation (the act, not the choice)

**Outcome**:
The visitor's latest evidence on a single Question — Missed, Mastered, or
Unseen. Read from their finished Submissions only, across both Exam and
Practice; the most recent attempt wins outright, so improvement erases a past
miss. A served Question with no Recorded Answer counts as Missed, matching the
way grading treats it. Belongs to a User: an attempt without one produces no
Outcomes. Not a quantity — it does not accumulate, and it is not a score.
_Avoid_: Mastery, Level, Score, Weakness, Streak

**Progress**:
A User's evidence on one Quiz, folded the same way an Outcome is — finished
Submissions only, latest attempt wins — and then read per Domain rather than
per Question. Covers one Quiz at a time and never combines Domains across
certifications. Belongs to a User, so an anonymous visitor has none. Shares
Outcome's definition deliberately: the same evidence drives what a drill serves
and what the visitor is told about themselves, so the two can never disagree.
_Avoid_: Analytics (implies population metrics, which V1 does not have),
Dashboard (the exam catalog), Stats, Report

**Standing**:
Progress narrowed to one Domain: the share of the Domain's seen Questions the
User has Mastered, as a percentage. Answers the question "where am I weak",
which is why it names the Domain to drill next. Distinct from a Score, which
grades one attempt, and from a Scaled Score, which is exam-scale — a Standing
is about a Quiz's Domain over the visitor's whole history, not about any single
attempt.
_Avoid_: Score, Mastery, Progress (the whole, not the slice), Rating

**Drill Mix**:
The target make-up of a Domain-scoped Drill Mix attempt's served Questions,
stated in Outcomes: mostly Missed, some Unseen, a little Mastered. A short
bucket spills into the others rather than shortening the drill, so every Drill
Mix attempt is full-length and a visitor with no history simply gets all-Unseen.
One Draw Rule, not the Mistakes draw. An Exam is drawn uniformly at
random so its Scaled Score keeps predicting the real exam.
_Avoid_: Weighting, Algorithm, Selection, Adaptive quiz

**Mistakes**:
The review draw. A Draw Rule across the parent Quiz, not one Domain: it serves
the Questions whose latest Outcome is Missed together with the Questions the
visitor last rated Guess or Unsure, so a lucky guess comes back even though it
was correct. Missed seats first, most recently missed before the rest; low
ratings take the remaining seats. At most 15, and the only draw that may be
shorter: 3 in the set is a 3-Question drill, never padded up. An empty set does
not start. Logged-in only, since both halves need a User. Draws the two sets,
writes neither.
_Avoid_: Retry incorrect, Missed drill, Review mode, Mistakes list

**Drill Composition**:
What a Drill Mix attempt actually came out as — how many of the served
Questions were Missed, Unseen and Mastered going in. Reported once, at start,
and shown before the first Question so the adaptivity is visible; the shrinking
Missed count doubles as progress. Exists only for a logged-in User on a Drill
Mix: an anonymous Drill Mix is random, so it has none, and the sign-in pitch
takes that slot instead. Not attached to Mistakes, which shows a plain count of
what it seated. Never attached to an individual Question before it is answered —
that would turn recall into recognition.
_Avoid_: Breakdown, Stats, Mix report

**Grading Strategy**:
The per-Quiz rule for turning answered Questions into a result. CLF-C02 Exam uses
Domain-weighted scaled scoring; Practice uses flat percentage; everything
else uses a default percentage-on-the-1000-scale fallback.
_Avoid_: Scorer, Grader, Marker
