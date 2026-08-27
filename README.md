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
- [x] Domain based subquizzes (scored as a 0-100 percentage, for focused practice)
- [x] Server-authoritative attempts (anonymous via email, or logged-in)
- [x] Optional social login (Google/GitHub) with anonymous-submission claiming — identity building block for per-user behavioral data and personalization in V1/V2

**UX Priorities:**

- Fast feedback loops, low friction, rapid learning, instant correction
- Avoid: complex dashboards, excessive gamification, social features, forced onboarding

---

## Roadmap

**V1 — Real Learning Platform** (in progress)

- [ ] Per-you performance analytics: success rate, plus Domain and Service performance (logged-in only). Deferred: answer time, abandonment, most failed, score distribution
- [x] Domain grouped tests focused on user weaknesses: Subquizzes drawn by Drill Mix (9 Missed / 4 Unseen / 2 Mastered) from a logged-in User's per-Question Outcomes, with the drill's make-up shown before the first Question; correctness stamped on Recorded Answers — ADR 0007, ADR 0008
- [ ] Review modes (retry incorrect, Low Confidence)
- [x] Confidence scoring (Guess/Unsure/Confident, full quizzes only) to detect lucky guesses and misconceptions — ADR 0006

**V2 — Adaptive Learning Engine**

- [ ] Weighted quiz generation (40% weak topics, 30% retention, 20% reinforcement, 10% stretch)
- [ ] Spaced repetition with forgetting curve tracking
- [ ] Service comparison tables

---
