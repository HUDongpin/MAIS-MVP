# Parent Console Privacy and State Closure

- Date: 2026-06-06 17:54 HKT
- Sessions: S12 backend/API storage, S14 parent UI, S11 E2E regression
- Goal: Close Parent Console P1/P2 privacy and state findings from `2026-06-06-parent-console-p0-p2-bug-audit.md`.

## Status

Closed for the focused Parent Console queue.

The current worktree contains S12/S14/S11 fixes and regression coverage for all 10 findings:

| Finding | Closure evidence |
| --- | --- |
| PC-P1-001 invite-code derivability | Parent invite codes are stored random secrets on student creation/backfill; legacy SHA1-derived codes are rejected by the focused regression. |
| PC-P1-002 parent-safe receipt action | Parent-safe review notice cards expose the same confirm-receipt action and acknowledge through the parent-scoped ack route. |
| PC-P1-003 navigation child focus | ParentShell navigation preserves `studentId` across parent overview, reports, messages, and notices. |
| PC-P2-004 notice filtering | Parent notice API/page accept `studentId` and filter recipients/notices to the linked child. |
| PC-P2-005 notice recipient deep links | Parent notice API/page accept `recipientId`, scope to the exact recipient notice, and canonicalize the matching `studentId` in the UI. |
| PC-P2-006 message thread deep links | Parent message API resolves an accessible `thread` before default child selection, so multi-child thread links select the correct child/thread. |
| PC-P2-007 message URL state | Clicking a thread writes stable `studentId` and `thread` params. |
| PC-P2-008 compose/thread state mismatch | Compose child state is separate from selected-thread state. |
| PC-P2-009 message default scope | Direct `/parent/messages` shows all linked-child threads instead of silently hiding non-first-child threads. |
| PC-P2-010 relationship validation | Invalid relationship values return 400 and do not create or mutate a guardian link. |

## Verification

- Passed: `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_ISOLATED_FORCE_DEV=1 PLAYWRIGHT_RUN_ID=parent-close-$(date +%s) npx playwright test tests/e2e/parent-console-stress.spec.ts --project=desktop-chrome --grep "parent child-link rejects derived invite codes|multi-child parent scope keeps child focus" --reporter=list`
- Passed: `npm run type-check`
- Passed: `git diff --check` on tracked Parent Console API/UI/test files.
- Passed: direct trailing-whitespace scan on the untracked Parent Console notice files, stress spec, constraints helper, and coordination notes.

## Handoff

- No Git staging, commit, branch, push, reset, or unrelated cleanup was performed.
- This closure does not claim broad mobile/full-suite release readiness; it closes the focused P1/P2 Parent Console privacy/state queue and leaves any broader release matrix to S11/S22.
