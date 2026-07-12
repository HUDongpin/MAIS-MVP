# 2026-06-06 Student P0/P1/P2 Bug Audit - Simple Interim Report

## Scope

- Session: S11 QA/release quality.
- Target: Student-facing flows in the current dirty working tree.
- Mode: Discovery only. No product code, API code, data, tests, or secrets were changed.
- Status: Interim report requested before the full overnight audit was completed.

## Checks Run

- `npm run type-check`: passed.
- Core student matrix:
  - Command: `PLAYWRIGHT_RUN_ID=student-audit-core PLAYWRIGHT_PORT=3020 npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/student-frontend.spec.ts tests/e2e/student-button-dropdown-matrix.spec.ts --project=desktop-chrome --project=mobile-chrome --reporter=line`
  - Result: 24 tests attempted; 10 failed, 2 passed, 8 skipped, 4 did not run.
- Deep student sweep:
  - Command: `PLAYWRIGHT_RUN_ID=student-audit-deep PLAYWRIGHT_PORT=3021 npx playwright test tests/e2e/lesson-all.spec.ts tests/e2e/practice-pager.spec.ts tests/e2e/visualization-lab-stress.spec.ts tests/e2e/visualization-overlap.spec.ts --project=desktop-chrome --project=mobile-chrome --reporter=line`
  - Result: 26 tests attempted; 22 failed, 4 passed.
- Assignment/game flow batch:
  - Command: `PLAYWRIGHT_RUN_ID=student-audit-flows PLAYWRIGHT_PORT=3022 npx playwright test tests/e2e/california-student-assignment-flow.spec.ts tests/e2e/adventure-island.spec.ts tests/e2e/fishing-game.spec.ts tests/e2e/fishing-master-adventure.spec.ts --project=desktop-chrome --project=mobile-chrome --reporter=line`
  - Result: stopped early after user requested this simple report; partial failures were captured for Adventure Island and Fishing unlock paths.

## Main Bugs Found

### BUG-01 - P1 - Learner setup modal blocks Practice Arena and game interactions

- Impact: Students cannot reliably click Practice Arena controls or game-start controls because the `15 秒设置` learner setup dialog remains over the page and intercepts pointer events.
- Seen in:
  - Practice pager `Jump`
  - Practice `Next question`
  - Practice answer choice buttons
  - Practice `Reset`
  - Handwriting canvas expand button
  - Adventure Island `Start Game`
  - Fishing free-selection answer choices
- Evidence:
  - Repeated Playwright failures reported `<div class="fixed inset-y-0 left-0 z-[150] ...">` intercepting pointer events.
  - Flow screenshots:
    - `.tmp/e2e-run-student-audit-flows/test-results/adventure-island-topic-bou-d9886-rd-once-from-a-trophy-clear-desktop-chrome/test-failed-1.png`
    - `.tmp/e2e-run-student-audit-flows/test-results/fishing-game-Practice-Aren-f68e5-ock-Adventure-Island-at-80--desktop-chrome/test-failed-1.png`
- Likely owner: S04/S20 with S08/S01 coordination, depending on whether the setup gate state lives in provider/layout or practice/game surfaces.

### BUG-02 - P1 - Direct student lesson slugs do not render expected lesson pages

- Impact: Known student lesson URLs fail to show the requested lesson heading, so students may not be able to open assigned/current lesson pages directly.
- Seen routes:
  - `/student/lessons/polynomials`
  - `/student/lessons/algebra-basics`
  - `/student/lessons/circles`
  - `/student/lessons/integers`
- Evidence:
  - Desktop and mobile tests repeatedly failed waiting for expected H1s such as `Polynomials`, `Algebra Basics: Expressions and Simple Equations`, `Circles: Chords, Tangents, Arcs, Angles`, and `Integers: Direction, Zero, and Operations`.
- Likely owner: S05 lesson, with S03/S08 if grade/current-lesson redirect state is involved.

### BUG-03 - P1 - Student dashboard welcome surface is missing after login/register

- Impact: After student login or registration, `/dashboard` loads but the expected personalized heading is not visible. This blocks multiple student smoke workflows immediately after authentication.
- Seen in:
  - Fresh registered students on desktop and mobile.
  - Demo student `HK Student Peter` on mobile and API-login flows.
- Evidence:
  - Core matrix failed waiting for `Welcome back, <student name>` on `/dashboard`.
- Likely owner: S02 dashboard, with S08/S12 if provider/auth hydration is involved.

### BUG-04 - P1 - Handwriting conversion button stays disabled after drawing

- Impact: Students using handwriting input cannot convert handwritten work to answer text, even after drawing strokes.
- Evidence:
  - Desktop and mobile `practice-pager` tests failed because `Convert handwriting to answer text` remained disabled after `drawDraftStroke(...)`.
- Likely owner: S04 practice, with S12/S19 only if provider/OCR state is involved.

### BUG-05 - P1/P2 - Practice free-selection grade filter expected by QA is absent

- Impact: The math keyboard/fill-in practice flow could not select a grade because the `Grade` combobox was not visible.
- Evidence:
  - Desktop and mobile `practice-pager` tests timed out waiting for `getByRole("combobox", { name: /Grade/i })`.
- Note: Needs product-intent confirmation. If logged-in students are intentionally grade-locked, this may be a test/spec mismatch; if free selection should support grade choice, it is a P1 practice regression.
- Likely owner: S04 practice, S08 for student grade lock state.

### BUG-06 - P2 - Visualization Lab does not expose all catalog labs after expand

- Impact: The expected final catalog lab card is not reachable after clicking the expand/explore-all control, so students may not be able to access the full visualization catalog.
- Missing card:
  - `lab-example-capstone-hk-mainland-crosswalk-explorer`
- Evidence:
  - Desktop and mobile `visualization-lab-stress` and `visualization-overlap` both failed waiting for that lab card.
- Likely owner: S06 visualization.

### BUG-07 - P2 - Homepage KPI/CTA link for `Grades: 12` is missing

- Impact: Guest homepage navigation/marketing stats no longer expose the expected `Grades: 12` link to `/student/roadmap`.
- Evidence:
  - Core matrix failed on `getByRole("link", { name: /Grades:\s*12/i })`.
- Likely owner: S01 home/app shell.

### BUG-08 - P2/P1 - Teacher demo login failed during student resource setup

- Impact: Student resource/assignment smoke setup could not create the teacher-side assignment because `HK Teacher Chan / 12345` stayed on `/login` instead of routing to `/teacher`.
- Evidence:
  - `student-frontend.spec.ts` failed at `loginAs(page, "HK Teacher Chan", "12345", /\/teacher/)`.
- Note: This is cross-role setup evidence, not purely a student UI bug. It can still block student assignment/resource coverage.
- Likely owner: S12 auth/backend or S13 teacher console.

## QA / Environment Risks

- The full `lesson-all` sweep timed out after 900 seconds on both desktop and mobile while validating lesson practice questions. This is a release-gate risk and may also indicate very heavy lesson/practice runtime.
- Mobile `lesson-all` also hit `ENOSPC: no space left on device, write` during the long run. Current `.tmp` artifact use became large during testing; future overnight runs should either disable video except on failure or clean old S11 audit artifacts first.
- The current worktree is very dirty, including student-facing tracked and untracked changes. Findings are valid for the current tree, but root-cause ownership should account for parallel-session changes.

## Current Priority

1. Fix or gate BUG-01 first. The learner setup modal blocks many unrelated student paths and makes Practice Arena, Adventure Island, and Fishing flows unreliable.
2. Investigate BUG-02 next. Direct lesson slugs are a core student learning path.
3. Confirm BUG-03 dashboard behavior with a focused manual screenshot/repro.
4. Then address handwriting conversion and visualization catalog access.
