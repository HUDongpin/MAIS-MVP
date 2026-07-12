# S11 Mobile Lesson Page Bug Detection

- Date: 2026-06-04
- Session: S11 QA and release quality
- Target: MAIS-MVP Lesson Page on mobile
- Viewport: Pixel 5, 393 x 852, mobile/touch enabled
- Scope: bug detection only; no Lesson code changes

## Executive Summary

Current local Lesson mobile E2E is green after rerun, and production direct Lesson routes load correctly after the galaxy intro. I found one confirmed mobile UI bug:

- P2: the default Nova onboarding tip can cover/intercept the `Learning Galaxy` button on mobile, so first-time users cannot open the galaxy directory until they dismiss the tip.

No confirmed P0/P1 Lesson Page bug remained after long-wait verification. Direct lesson slugs initially looked stuck on the galaxy loading screen in a short probe, but a 25-30 second verification showed the pages loading normally, usually after about 3 seconds.

## Confirmed Finding

### P2 - Nova onboarding tip blocks the Learning Galaxy button on mobile

- Owner route: S05 Lesson UI with S07/Nova copy/onboarding coordination if needed.
- Routes reproduced:
  - `https://www.mais.hk/lesson/p1-addition-subtraction`
  - `https://www.mais.hk/lesson/linear-equations`
  - `https://www.mais.hk/lesson/quadratic-functions`
  - `https://www.mais.hk/lesson/functions`
- Repro:
  1. Open a Lesson route on Pixel 5/mobile.
  2. Wait for the Lesson body and the delayed Nova onboarding tip.
  3. Tap `Learning Galaxy`.
- Expected: `Learning Galaxy` opens `#lesson-galaxy-directory`.
- Actual: click is intercepted by the Nova onboarding card. Playwright reports the `<p>Ask Nova by Selecting</p>` subtree intercepts pointer events. `#lesson-galaxy-directory` remains closed.
- Control check: after dismissing the Nova tip, the same `Learning Galaxy` button opens the directory successfully.
- Evidence:
  - `output/playwright/2026-06-04-S11-mobile-lesson-page/nova-tip-overlap-before.png`
  - `output/playwright/2026-06-04-S11-mobile-lesson-page/nova-tip-overlap-after-dismiss.png`
  - `output/playwright/2026-06-04-S11-mobile-lesson-page/mobile-lesson-long-probe-results.json`
- Root-cause hypothesis: `NovaLensOnboardingTip` is absolutely positioned below the Nova button in the same top action area. On narrow mobile layouts it overlaps the adjacent `Learning Galaxy` CTA and retains pointer events.
- Fix direction: on mobile, place the onboarding tip below the whole action cluster, render it as a non-overlapping popover/sheet, or auto-dismiss/move it before adjacent CTA taps. Keep the dismiss button accessible.
- Verification after fix: on Pixel 5, first-load Lesson page with the tip visible, tap `Learning Galaxy`, and confirm the directory opens without force click.

## Passed / No Bug Found

- Production direct slugs loaded after long wait:
  - `/lesson/p1-addition-subtraction`: matched in ~3.1s.
  - `/lesson/linear-equations`: matched in ~3.1s.
  - `/lesson/quadratic-functions`: matched in ~3.1s.
  - `/lesson/functions`: matched in ~3.0s.
- Production `/lesson` guest entry eventually redirected to `/lesson/quadratic-functions` in the 30s probe.
- Invalid slug `/lesson/s11-mobile-invalid-lesson` rendered the not-found state.
- No horizontal overflow detected on tested routes.
- No clipped visible controls detected on tested routes.
- No `.katex-error` rendered on tested routes.
- No visible `undefined` or `NaN` token rendered.
- Nova lesson text selection popover appeared on tested direct Lesson routes.
- Embedded Lesson practice question interaction produced feedback on tested direct Lesson routes.

## Candidate / Low-Severity Noise

- Guest production Lesson routes consistently log `401 https://www.mais.hk/api/me?includeLessonEntry=false` as a console error.
- This appears to be an expected unauthenticated `/api/me` probe rather than a user-visible Lesson failure, so I did not classify it as P1/P2. It is worth quieting if console cleanliness is a release goal.
- Production demo-account login was not accepted by this black-box probe, so authenticated production Lesson entry was not treated as verified. The local mobile Lesson/Nova E2E authenticated student path passed.

## Checks Run

- `npm run type-check`: passed.
- `PLAYWRIGHT_PORT=3065 ... npx playwright test tests/e2e/lesson-ai-selection.spec.ts --project=mobile-chrome --reporter=list`: passed, 3/3 tests.
- Production mobile long probe:
  - `mobile-lesson-long-probe-results.json`
  - `guest-lesson-entry-30s.png`
  - `long-p1-addition-subtraction.png`
  - `long-s2-linear-equations.png`
  - `long-s3-quadratic-functions.png`
  - `long-s4-functions.png`
  - `long-invalid-slug.png`
- Precision reproduction:
  - `nova-tip-overlap-before.png`
  - `nova-tip-overlap-after-dismiss.png`

## Checks Not Run

- Full all-slug mobile regression matrix was not run.
- Production authenticated Lesson entry was not verified because demo login did not complete in the black-box probe.
- Live LLM/Nova provider responses were not called.

## Notes

- The worktree changed during the audit due to existing parallel-session activity. Earlier local build/dev probes saw transient shared-server errors, but the final current-tree checks passed.
- Temporary QA harness/artifact files were written under `output/playwright/2026-06-04-S11-mobile-lesson-page/`; a temporary Playwright tsconfig was also created for the local rerun path.
