# MAIS-MVP Game Stability QA Report

- Date: 2026-05-16
- Session: S11 QA and release quality
- Scope: `/practice/quadratic-bonus`, `/practice/fishing-game`, related gamification completion APIs
- Result: Passed for release-quality smoke/regression. No P0/P1 bugs found.

## Executive Summary

Codex ran the planned automated and Playwright-driven gameplay checks for the two current games: the platform-style P5 Practice Quest Bonus game and the Practice Arena Fishing Game. Both games can be entered from their expected eligibility paths, render nonblank Phaser canvases, accept keyboard/game controls, show math challenges, recover from failure states, and submit rewards without duplicate-award regressions in the covered paths.

No severe or important bugs requiring immediate source-code changes were found. One non-blocking mobile visual observation is recorded for later polish.

## Checks Run

| Check | Result | Notes |
| --- | --- | --- |
| `npm run type-check` | Passed | TypeScript strict check completed with no errors. |
| `npx playwright test tests/e2e/quadratic-bonus.spec.ts tests/e2e/fishing-game.spec.ts --project=desktop-chrome` | Passed, 4/4 | Includes production build via Playwright webServer, Bonus trophy clear, Fishing reward, unlock/locked paths. |
| `npx playwright test tests/e2e/quadratic-bonus.spec.ts tests/e2e/fishing-game.spec.ts --project=mobile-chrome` | Passed, 4/4 | Same coverage on Pixel-style mobile project. |
| Playwright-driven manual QA pass | Passed | Desktop 1440x1100 and mobile 390x844; checked locked states, render, controls, challenge flow, Bonus failure/restart, Fishing catch/miss/end reward. |

Evidence screenshots are in `coordination/reports/2026-05-16-game-qa-evidence/`.

## Scenario Coverage

### Platform Bonus Game

- Verified unauthenticated locked state and Practice return path.
- Created local P5 test users, submitted five correct grade-level attempts, and confirmed the Bonus game unlocked.
- Confirmed canvas renders nonblank and HUD appears on desktop and mobile.
- Confirmed keyboard movement left/right changes player position.
- Confirmed wrong contact challenges reduce HP, return to ready state, and do not leave the character drifting.
- Confirmed second wrong challenge reaches game-over state and Restart restores ready state with two HP hearts.
- Existing E2E completed the full trophy-clear success path and verified `35 XP + 35 reward points`, badge unlock, and duplicate completion rejection.

### Fishing Game

- Verified unauthenticated/no-round locked state.
- Existing E2E verified Free Selection unlock at `>=80%` and hides the Fishing entry below 80%.
- Created local S3 test users, submitted correct quadratic attempts, stored an eligible fishing round payload, and entered the game.
- Confirmed welcome/start screen, canvas render, fish/creature movement, cannon controls, and HUD.
- Confirmed first catch opens a math challenge, correct answer grants one coin, and the run submits reward at end.
- Confirmed a miss path does not open a math challenge when the cast misses.
- Existing E2E verified coin-to-reward conversion and duplicate completion rejection.

## Findings

| ID | Severity | Area | Finding | Owner |
| --- | --- | --- | --- | --- |
| None | P0/P1 | Both games | No severe or important blocker found in covered desktop/mobile paths. | S11/S20 |
| QA-GAME-OBS-001 | P3 Low | Mobile Fishing UI | Full-page mobile evidence shows the sticky app navbar appearing between the Fishing controls and canvas after the page scrolls to the game area. It did not block Playwright gameplay, Fire net, challenge answering, or reward submission, but S20/S01 may consider an immersive game viewport polish pass later. | S20 with S01 if layout/nav changes are needed |

## Risks And Gaps

- Cross-browser manual gameplay was not run on Safari or Firefox.
- Live production/Vercel environment was not tested; all checks used a local isolated database and test accounts.
- The manual pass used deterministic API setup for eligibility, then played the actual game surfaces. This is suitable for stability QA but not a substitute for full end-user UAT.
- Accessibility was checked only indirectly through role-based Playwright interactions; no dedicated screen-reader audit was performed.

## Recommendation

No urgent game-source fix is required from this QA pass. Keep the two game E2E specs in release gating, and ask S20 to review the low-priority mobile Fishing layout observation when polishing the game surfaces.
