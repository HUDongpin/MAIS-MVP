# S11 Visualization Lab Mobile Bug Detection

- Date: 2026-06-04 10:43 HKT
- Session ID: S11
- Scope: `/visualization-lab` mobile functional and UI bug detection
- Target: local current worktree at `http://127.0.0.1:3187/visualization-lab`
- Evidence folder: `output/playwright/2026-06-04-S11-visualization-lab-mobile/`
- Structured evidence: `output/playwright/2026-06-04-S11-visualization-lab-mobile/visualization-lab-mobile-audit.json`

## Executive Summary

Visualization Lab core lab rendering is healthy in the tested local tree: after expanding all labs, all 389 lab cards rendered one visualization surface each, with 0 missing surfaces, 0 missing visual marks, and 0 NaN/Infinity health failures across the mobile viewport matrix.

The confirmed mobile bug is in the shared mobile header/app shell on the narrowest phone width. At 320 px, the header controls overflow horizontally and the mobile menu button is pushed beyond the visible viewport; the theme toggle intercepts the tap, so the user cannot open navigation from the Visualization Lab page.

## Confirmed Bugs

### P1 - 320 px mobile header overflow makes the menu button unusable

- Repro:
  1. Open `/visualization-lab` at `320x568`, mobile/touch viewport.
  2. Try tapping the `Open mobile menu` button in the top nav.
- Actual:
  - Playwright cannot click the menu button within 3.5s.
  - Hit testing reports the `Switch to dark mode` button's icon intercepts pointer events.
  - Document horizontal overflow is present: `scrollWidth=369`, viewport width `320`.
  - The menu button rect is `x=325 width=40 right=365`, outside the 320 px viewport.
- Expected:
  - The menu button remains visible, tappable, and inside the viewport at 320 px.
- Evidence:
  - Screenshot: `output/playwright/2026-06-04-S11-visualization-lab-mobile/iphone-se-initial.png`
  - Screenshot after expand/dark mode: `output/playwright/2026-06-04-S11-visualization-lab-mobile/iphone-se-after-expand.png`
  - JSON: `guest[iphone-se].mobileMenuClick.ok=false`
- Suspected owner:
  - S01 App shell / Navbar.
- Likely source area:
  - `components/layout/Navbar.tsx` header control group around `LanguageToggle`, `ThemeToggle`, and mobile menu.
  - `components/ui/LanguageToggle.tsx` fixed-size segmented buttons.
  - `components/ui/ThemeToggle.tsx` fixed `h-10 w-10` icon button.

### P2 - Mobile header tap targets are below comfortable touch size

- Repro:
  1. Open `/visualization-lab` on phone viewports from `320x568` through `414x896`.
  2. Inspect visible buttons/links in the header.
- Actual:
  - Language buttons measure about `48-50 x 32`.
  - Theme and mobile menu buttons measure `40 x 40`.
  - These are below the common 44 px mobile touch-target floor and contribute to the 320 px collision.
- Expected:
  - Primary touch controls should be at least 44 px in both dimensions or have equivalent touch padding.
- Evidence:
  - JSON `smallTaps` entries in all guest viewport results.
  - Example at Pixel 5: `Use English 50x32`, `Switch to dark mode 40x40`, `Open mobile menu 40x40`.
- Suspected owner:
  - S01 for layout/control sizing.
  - S09 if remediation is copy/accessibility-only.

## Passed Coverage

| Area | Result |
| --- | --- |
| Initial guest load | Passed on 320, 375, 390, 414, and 667x375 landscape. |
| Expand all labs | Passed on all tested viewports. |
| Lab inventory | 389 lab cards after expand. |
| Visualization surfaces | 389 surfaces after expand; 0 failed lab health checks. |
| Track filters | Passed: All 389, HK 327, PEP primary 24, PEP junior 11, PEP high 22, Capstone 5. |
| Hash preview links | Passed: sampled anchors updated `location.hash` and brought targets into reasonable view. |
| Page/runtime errors | No `pageerror`; no same-origin request failures. Guest `/api/me` 401 console messages were expected. |
| TypeScript | `npm run type-check` passed. |

## Checks Run

- `git status --short`
  - Result: large dirty worktree with many pre-existing owner/session changes. No unrelated files were reverted, staged, or committed.
- `command -v npx`
  - Result: available at `/usr/local/bin/npx`.
- Local dev server:
  - `NEXT_DIST_DIR=/tmp/mais-s11-viz-next-3187 AUTH_SESSION_SECRET=... HK_MATH_DB_PATH=/tmp/mais-s11-viz-db-3187.sqlite HK_MATH_ENABLE_DEMO_USER=true npm run dev -- --hostname 127.0.0.1 --port 3187`
  - Result: server started and `/visualization-lab` returned 200.
  - Note: Next dev briefly attempted to add the custom `/tmp/mais-s11-viz-next-3187` dist types path to `tsconfig.json`; S11 removed only that S11-caused path. Remaining `tsconfig.json` include diffs belong to pre-existing/concurrent work and were left untouched.
- Existing stress spec:
  - `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3187 VISUALIZATION_STRESS_REPORT_PATH=output/playwright/2026-06-04-S11-visualization-lab-mobile/visualization-lab-stress-mobile.json npx playwright test tests/e2e/visualization-lab-stress.spec.ts --project=mobile-chrome --reporter=list`
  - Result: the body reached `389/389 labs checked`, then failed in teardown/stat collection because the page/context closed and Playwright could not open a trace zip. No stress JSON was produced.
- Custom mobile audit:
  - 5 guest viewports: `320x568`, `375x667`, `390x844`, `414x896`, `667x375`.
  - Demo-student attempt: login state was not completed; see blockers.
  - Result: JSON and screenshots written under the evidence folder.
- `npm run type-check`
  - Result: passed.

## Blockers And Non-Final Evidence

- Demo-student login-state Visualization Lab coverage was blocked. One run timed out waiting for `/dashboard`; a focused login repro timed out waiting for the login username field. The screenshot still showed guest/selected-learner state, not a confirmed logged-in student state. This is not counted as a Visualization Lab bug without a clean login repro.
- During the first dev-server run, Turbopack logged transient missing-export compile errors through `RoadmapVisualizationSuite` / `LearningRoadmap` / topic imports. A later direct page check returned 200, `npm run type-check` passed, and no user-visible error text was present. Treat this as a local dev hot-compile instability note, not a confirmed current P0.

## Recommended Fix Direction

- For S01:
  - At `<=360px`, reduce header density: hide the `MAIS` wordmark, move language toggles into the mobile menu, or collapse language/theme into a compact menu.
  - Keep `Open mobile menu` inside viewport and above adjacent controls in hit testing.
  - Raise touch targets to at least 44 px or add invisible hit padding.
  - Add a targeted 320 px mobile Playwright assertion for menu clickability and `documentElement.scrollWidth <= clientWidth + 2`.
- For S11:
  - After S01 fixes, rerun the 320/375/390 viewport matrix and the mobile stress spec.
