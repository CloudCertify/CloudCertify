# CloudCertify

**Vision:** Evolve from a quiz simulator into an adaptive certification learning system.

**Focus:** Not quantity of questions, but adaptive learning, explanation quality, retention systems, misconception detection, and personalized remediation.

---

## V0 — Functional Exam Simulator (MVP)

**Goal:** Ship fast to validate demand. V0 persists score + email only.

**Core Features:**

- [x] AWS exam catalog: CLF-C02, SAA-C03, DVA-C02, SOA-C03, SCS-C03, ANS-C01 (seeded question banks, hash-based reseed)
- [x] Per-quiz question count (AWS CLF-C02 is a fixed 65; ranged quizzes pick a count within a configured range)
- [x] AWS-style multiple choice
- [x] Shuffled answer options
- [x] Domain-weighted scaled scoring (100-1000, pass ≥ 700) per exam via grading strategies
- [x] End-of-quiz summary: score, pass/fail, percentage
- [x] Future-proof question schema (domain, concepts, services, categories, difficulty, explanation)
- [x] Domain based subquizzes (scored as a 0-100 percentage, for focused practice)
- [x] Server-authoritative attempts (anonymous via email, or logged-in)
- [x] Optional social login (Google/GitHub) with anonymous-submission claiming — identity building block for per-user behavioral data and personalization in V1/V2

**UX Priorities:**

- Fast feedback loops, low friction, rapid learning, instant correction
- Avoid: complex dashboards, excessive gamification, social features, forced onboarding

---

## Ongoing Roadmap

**V1 — Real Learning Platform**

> Critical path: behavioral/event capture gates everything below and all of V2.
> Per-question answer time requires recording answers as they happen in full
> quiz attempts (today only Subquizzes have Recorded Answers; full quizzes
> submit one batch) — data-model change, do first.

- [ ] Behavioral data capture + analytics tracking (success rate, most failed, answer time, abandonment, score distribution) — **next milestone**
- [ ] Persist per-domain results per attempt (grading already computes per-domain correctness; cheapest win)
- [ ] Domain grouped tests (focused on user weaknesses)
- [ ] Detailed explanations (why correct/wrong, exam strategy, common traps)
- [ ] Domain performance tracking by service/concept
- [ ] Review modes (retry incorrect, flagged, guessed)
- [ ] Confidence scoring (1-5) to detect lucky guesses and misconceptions

**V2 — Adaptive Learning Engine**

- [ ] Weighted quiz generation (40% weak topics, 30% retention, 20% reinforcement, 10% stretch)
- [ ] Spaced repetition with forgetting curve tracking
- [ ] Service comparison tables

---
