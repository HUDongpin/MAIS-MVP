# 2026-07-03 A04/A11 Bug 202 About Logged-Out Progress Fix

- Agents: A04 practice lead for implementation, A11 QA and release quality lead for verification.
- Source bug: Bug 202 from `/Users/dongpinhu/Downloads/20260704_Deliverable Bug and QA Report (1).docx`.
- Scope: remove live-progress wording from the public logged-out `/about` mission showcase.
- Git posture: dirty root; no staging, commit, branch, merge, rebase, push, reset, clean, or revert.

## Change

- Updated `components/practice/PersonalizedPracticeMissionShowcase.tsx`.
- The first public checkpoint is now a `ready` preview state instead of an `active`/`In progress` state.
- The dial is now a static "Preview set" / "5 required questions" preview instead of a progressbar with `0/5`, `Round progress`, and progress ARIA.
- Added a focused regression in `tests/e2e/reported-bug-source-regressions.test.ts` so the public showcase must keep `Start` and `Ready` while excluding `In progress`, `Round progress`, `Personalized set progress`, and `aria-valuenow`.

## Verification

- Red first: `npx tsx --test tests/e2e/reported-bug-source-regressions.test.ts` failed on the new Bug 202 regression before the implementation.
- Green after fix: `npx tsx --test tests/e2e/reported-bug-source-regressions.test.ts` passed `18/18`.
- Local render check: `npm run dev -- --port 3112`, then fresh Playwright browser context to `http://localhost:3112/about`.
- Browser evidence for the mission section:
  - `hasStart: true`
  - `hasReady: true`
  - `hasInProgress: false`
  - `hasRoundProgress: false`
  - `hasPreviewSet: true`
  - `progressbarsInSection: 0`

## Notes

- The dev server was stopped after verification.
- `tests/e2e/reported-bug-source-regressions.test.ts` is untracked in this dirty root, but it already existed before this pass; A04/A11 only added the Bug 202 regression inside it.
