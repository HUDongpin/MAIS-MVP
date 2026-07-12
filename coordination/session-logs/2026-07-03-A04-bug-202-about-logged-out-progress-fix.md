# 2026-07-03 A04 Bug 202 About Logged-Out Progress Fix

Agent IDs: A04 practice lead implementing the practice showcase fix; A11 QA consuming the previous verification and validating the bug closure.

Objective: Fix Bug 202: logged-out `/about` showed both `Start` and `In progress` in the public practice mission showcase.

Scope:
- `components/practice/PersonalizedPracticeMissionShowcase.tsx`
- `tests/e2e/reported-bug-source-regressions.test.ts`
- A04/A11 handoff report in `coordination/reports/`

Non-scope:
- No unrelated practice route or question-bank changes.
- No Git staging, commit, branch, merge, rebase, push, reset, clean, delete, or revert.
- No secret access.

Root cause:
- The public `PersonalizedPracticeMissionShowcase` rendered a static `missionSteps` first item with `state: "active"`, which produced the learner-progress label `In progress` even for logged-out visitors on `/about`.
- The same public preview used progressbar semantics and visible `Round progress` / `0/5` copy, reinforcing the false logged-out progress state.

Implementation:
- Changed the first checkpoint state from `active` to `ready`.
- Changed the checkpoint status copy from `In progress` to `Ready`.
- Changed the public dial copy from `Round progress` / `0/5 required` to `Preview set` / `5 required questions`.
- Removed progressbar role and progress ARIA from the static public preview.
- Added a regression asserting the public showcase keeps `Start` and `Ready`, and does not contain `In progress`, `Round progress`, `Personalized set progress`, or `aria-valuenow`.

Verification:
- Red first: `npx tsx --test tests/e2e/reported-bug-source-regressions.test.ts` failed on the new regression before the implementation.
- Green: `npx tsx --test tests/e2e/reported-bug-source-regressions.test.ts` passed `18/18`.
- Browser: local dev server on `http://localhost:3112/about` in a fresh Playwright context showed the mission section had `Start` and `Ready`, no `In progress`, no `Round progress`, and zero progressbars.

Report:
- `coordination/reports/2026-07-03-A04-A11-bug-202-about-logged-out-progress-fix.md`
