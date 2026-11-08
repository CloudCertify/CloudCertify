# CloudCertify

**Vision:** Evolve from a quiz simulator into an adaptive certification learning system.

**Focus:** Not quantity of questions, but adaptive learning, explanation quality, retention systems, misconception detection, and personalized remediation.

---

## V0 — Functional Exam Simulator (shipped)

Demand-validation MVP. Persists Recorded Answers, Confidence, Outcomes, Users, Providers, Reports, and Language.

**Core Features:**

- [x] AWS exam catalog: CLF-C02, SAA-C03, DVA-C02, SOA-C03, SCS-C03, ANS-C01 (seeded question banks, hash-based reseed)
- [x] Per-quiz question count (each available exam is a fixed length; AWS CLF-C02 is 65)
- [x] AWS-style multiple choice
- [x] Shuffled answer options
- [x] Domain-weighted scaled scoring (100-1000, pass ≥ 700) per exam via grading strategies
- [x] End-of-quiz summary: score, pass/fail, percentage
- [x] Future-proof question schema (domain, concepts, services, categories, difficulty, explanation)
- [x] Domain-scoped Drills (scored as a 0-100 percentage, for focused practice)
- [x] Server-authoritative attempts (anonymous via email, or logged-in)
- [x] Optional social login (Google/GitHub) with anonymous-submission claiming — identity building block for per-user behavioral data and personalization in V1/V2

**UX Priorities:**

- Fast feedback loops, low friction, rapid learning, instant correction
- Avoid: complex dashboards, excessive gamification, social features, forced onboarding

---

## Roadmap

**V1 — Real Learning Platform**

- [x] Per-you performance analytics: success rate plus Domain performance, logged-in only. Service performance moved to V2, where weighted quiz generation needs the same signal. Deferred: answer time, abandonment, most failed, score distribution
- [x] Domain grouped tests focused on user weaknesses: Drills drawn by Drill Mix (9 Missed / 4 Unseen / 2 Mastered) from a logged-in User's per-Question Outcomes, with the drill's make-up shown before the first Question, and correctness stamped on Recorded Answers. See ADR 0007, ADR 0008
- [x] Mistakes drill: one review draw across the whole quiz, serving what you missed plus what you only guessed at, capped at 15 and never padded up. Folds into Outcome asymmetrically — a wrong Check writes Missed, a right one writes nothing — so review cannot test you out of your own weak spots. See ADR 0011
- [x] Confidence scoring (Guess/Unsure/Confident, full quizzes only) to detect lucky guesses and misconceptions. See ADR 0006

**V2 — Adaptive Learning Engine**

- [ ] Spaced repetition: a per-Question Recall (0-1) that halves every half-life (1, 3, 7, 14, 30 days, one rung per proof), so mastery expires instead of standing forever. Standing becomes mean Recall. See ADR 0013
- [ ] Weighted quiz generation: drills draw the lowest Recall first (11 Missed/Due + 4 Unseen), and a whole-Quiz Mix drill sits on top of the Domain drills. See ADR 0013
- [ ] Per-Service performance, the second axis on the analytics fold and the input weighted generation needs
- [ ] Service comparison tables

---
