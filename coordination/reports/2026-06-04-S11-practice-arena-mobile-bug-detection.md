# S11 Practice Arena Mobile Bug Detection

- Date: 2026-06-04
- Session: S11 QA and release quality
- Target: current local `MAIS-MVP` tree, `/practice`
- Scope: mobile functional and UI bug detection for Practice Arena. No feature code was edited.
- Evidence directory: `output/playwright/2026-06-04-S11-practice-arena-mobile/`

## Executive Summary

Current local Practice Arena mobile testing is blocked by app-wide/backend compile failures in the dirty tree. The mobile page cannot be release-cleared.

Highest-risk result:

- P0: `npx playwright test tests/e2e/practice-pager.spec.ts --project=mobile-chrome` could not start because the Playwright production web server build failed in `lib/server/userStore.ts`.
- P0: local `/api/auth/register` returned 500, so authenticated adaptive Practice Arena flows cannot be exercised.
- P0: local `/practice` returned 500 across 320x568, 375x667, 390x844, 414x896, and 667x375 mobile viewports in the quick snapshot run.
- P1: when `/practice` briefly rendered before later compile failures, the page showed the hero and footer only. Topic/question API failure produced no visible empty/error state for the learner.

## Confirmed Findings

### P0: Mobile Practice Arena E2E cannot start because production build fails

- Command: `npx playwright test tests/e2e/practice-pager.spec.ts --project=mobile-chrome`
- Result: web server exited with code 1 before tests ran.
- Observed build error: `lib/server/userStore.ts` mixed `||` and `??` without parentheses in assignment feedback fields.
- Original build output pointed to `lib/server/userStore.ts:12062-12063`.
- Impact: the existing mobile Practice Arena regression suite cannot run in the current tree.
- Owner route: S12/backend storage, with S10/S22 build coordination.

### P0: Authenticated Practice Arena path blocked by auth API 500

- Probe: `POST /api/auth/register`
- Result: 500. First manual curl took about 78 seconds before returning 500; the quick snapshot also recorded 500.
- Dev-server output during the probe reported `submissionAttemptsFor` defined multiple times in `lib/server/userStore.ts` for the auth register route.
- Current `npm run type-check` now fails at `lib/server/userStore.ts(3525,5)` with `TeacherLiveEvent.type` type mismatch, so the exact compiler symptom has shifted, but `userStore.ts` remains the current hard blocker.
- Impact: no authenticated student can enter the adaptive mission, submit answers, unlock free selection, or reach game handoff in local mobile QA.
- Owner route: S12 primary; S15/S04/S20 should rerun after backend compile is clean.

### P0: `/practice` returns 500 on mobile viewports in the quick snapshot

- Script: `output/playwright/2026-06-04-S11-practice-arena-mobile/mobile-practice-quick-snapshot.mjs`
- JSON: `output/playwright/2026-06-04-S11-practice-arena-mobile/mobile-practice-quick-snapshot.json`
- Viewports:
  - 320x568
  - 375x667
  - 390x844
  - 414x896
  - 667x375 landscape
- Result in all viewports: `/practice` response 500; `Practice Arena` heading did not become visible; P1 selection timed out.
- Dev-server output also reported Turbopack export-resolution failures around `data/topics.ts` imports while `/practice` was compiling.
- Impact: current local mobile Practice Arena cannot be opened reliably enough for functional release signoff.
- Owner route: S10/S22 to re-establish clean build/dev harness, S03/S21/S18 if topic exports are still reproducible after a clean run.

### P1: API failure can leave a blank Practice Arena body with no learner-facing error

- Evidence: `output/playwright/2026-06-04-S11-practice-arena-mobile/pixel-5-01-initial.png`
- Observed state: hero/title and CTA buttons render, then the page jumps to footer. No grade/topic filters, no question cards, and no visible “Could not load questions” message.
- Likely code path: `app/practice/page.tsx` topic preload catches failures by setting `allQuestions` to `[]`, and `shouldShowFreeSelection` requires `allQuestions.length > 0`; the topic-load failure itself has no visible error panel.
- Impact: mobile learners see an apparently empty Practice Arena rather than actionable recovery guidance.
- Owner route: S04 for Practice UI behavior; S09 for bilingual error copy.

## Static UI/Accessibility Risks

- `components/practice/PracticeQuestionCard.tsx`: photo upload text is hardcoded English (`Add photos`, remove label). This bypasses existing bilingual copy expectations.
- `app/practice/page.tsx`: the adaptive route map uses an internal `min-w-[60rem]` horizontal scroller. This may be intentional, but mobile QA should verify it does not feel like broken clipping once the page is unblocked.
- `app/practice/page.tsx`: the Practice summary dialog sets focus on close and supports Escape, but no focus trap was found in the static pass. Keyboard users may tab behind the modal.

## Checks Run

- `git status --short`
- Source inspection:
  - `app/practice/page.tsx`
  - `components/practice/PracticeQuestionCard.tsx`
  - `tests/e2e/practice-pager.spec.ts`
  - `playwright.config.ts`
- `npx playwright test tests/e2e/practice-pager.spec.ts --project=mobile-chrome`: failed before tests due build failure.
- Local dev server smoke on `http://127.0.0.1:3039/practice`: stopped after collecting failure evidence.
- `curl /api/questions?grade=S1`: initially returned questions before later compiler failures.
- `curl POST /api/auth/register`: returned 500.
- `node output/playwright/2026-06-04-S11-practice-arena-mobile/mobile-practice-quick-snapshot.mjs`: recorded 500s across all tested mobile viewports.
- `npm run type-check`: failed at `lib/server/userStore.ts(3525,5)`.

## Checks Not Completed

- Full mobile adaptive 5-question completion.
- Authenticated answer submission.
- Free-selection unlock.
- Fill-in, short-answer, graph, handwriting, math keyboard, and photo upload runtime interaction.
- Summary modal runtime fit.
- Adventure Island/Fishing Master handoff from Practice Arena.

Reason: current local tree has P0 build/API/page blockers before those flows can be reached.

## Handoff Recommendation

1. S12/S10/S22 should restore a clean build/dev baseline first, starting with `lib/server/userStore.ts`.
2. Rerun `npm run type-check`.
3. Rerun `npx playwright test tests/e2e/practice-pager.spec.ts --project=mobile-chrome`.
4. After the suite starts, rerun S11 mobile Practice Arena matrix for all question types, full 5-question summary, and game handoff.
5. S04 should add a visible mobile-safe empty/error state for question/topic API failure so `/practice` never silently collapses to hero plus footer.
