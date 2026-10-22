# Quiz motion evidence

Recorded from the real React quiz components at `/prototype/quiz-motion`, a development-only route with local sample questions and no API writes.

- [Desktop practice video](practice-desktop.mp4): selection, Check, explanation expansion, Continue.
- [Mobile exam video](exam-mobile.mp4): forward/back navigation, multiple selection, retained answers and viewport handoff at 390 × 844.
- [Before feedback](before-feedback.png) and [after feedback](after-feedback.png): same existing styling, with the earlier iteration as the visual baseline.

Keyboard actions and reduced-motion mode skip animation. Shortcuts operate only inside the focused quiz and exclude forms, dialogs and menus. Named progress, connected selection instructions, persistent result announcements and answer descriptions use the existing EN/PT dictionaries.

Validation: 99 tests passed across 18 files, full ESLint and production build passed. Mobile browser geometry confirmed question headings return into view after Continue. The anonymous header overflow found at 320px is addressed by the separate accessibility PR.

These recordings use sample data. They do not verify a real submission against the backend or manual VoiceOver/TalkBack output.
