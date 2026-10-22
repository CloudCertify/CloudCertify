# Accessibility evidence

Captured against the original main commit `8504508` and the reviewed accessibility changes, using the same Chromium viewport and reduced-motion preference.

| Scenario | Before | After |
| --- | --- | --- |
| Header, 320px | [Photo](before-header-mobile.png) | [Photo](after-header-mobile.png) |
| Roadmap, 390px | [Photo](before-roadmap-mobile.png) | [Photo](after-roadmap-mobile.png) |
| Portuguese sample quiz, 320px | [Photo](before-sample-portuguese.png) | [Photo](after-sample-portuguese.png) |
| Portuguese auth recovery, 320px | [Photo](before-auth-portuguese.png) | [Photo](after-auth-portuguese.png) |

Document widths changed from 456/456/397/348px to 320/390/320/320px respectively. `geometry.json` contains the measurements. Decorative elements inside clipped containers are listed separately from document overflow.

Production Lighthouse accessibility increased from 94 to 100 in the local mobile run. Automated checks do not replace a manual screen-reader audit. The full suite passed 117 tests, ESLint, TypeScript, and the production build. No Android SDK is installed on this machine.
