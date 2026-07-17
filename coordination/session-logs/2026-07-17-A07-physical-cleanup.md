# A07 Classroom Policy Physical-Cleanup Slice — 2026-07-17

- Agent ID: `A07` (AI Tutor lead).
- Objective: extract the classroom AI policy controls from the dirty `A07-ai-tutor-classroom-switches` worktree into the clean physical-cleanup integration worktree without regressing the later c0, ec22, or A02 contracts.
- Source inspected read-only: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-classroom-switches`.
- Integration workspace: `/Users/dongpinhu/Desktop/MAIS-MVP/.worktrees/A25-physical-cleanup-20260717`.

## Write scope

- Classroom policy API routes under `app/api/ai-tutor/classroom-policy/` and `app/api/teacher/classes/[classId]/ai-tutor-policy/`.
- Classroom-policy-only hunks in the text resolver, speech/voice routes, AI Tutor provider, teacher management UI, AI governance, modular user-store boundaries, and shared types.
- `lib/server/aiGovernanceClassroomPolicy.test.ts` and this session log.

## Plan and boundary checks

1. Compare every source file with the clean integration baseline and reject whole-file copying where the source baseline is older.
2. Add the classroom policy test first and confirm the expected red result.
3. Port only classroom-policy fields and behavior, preserving c0 region, provider-profile, offline-fixture, and error contracts plus ec22/A02 modular persistence.
4. Verify targeted governance, API security, auth, persistence, domain-contract, import, and TypeScript gates.
5. Stage and commit only the explicit A07 file list.

## Changes

- Added `open`, `limited`, and `fallback-only` classroom policy types, bounded limits, strictest-policy merging, and durable policy persistence.
- Added teacher read/update access with owner, co-teacher, viewer, and admin authorization behavior.
- Added student policy resolution across enrolled classes; the strictest policy wins.
- Applied limited-mode rate limits only to the text resolver. Speech and voice retain their existing capability limits and are blocked only in fallback-only mode.
- Added teacher controls and student-side polling, local-hint fallback, voice/attachment shutdown, and paused-state messaging.
- Kept `app/api/ai-tutor/route.ts` and `app/api/ai-tutor/status/route.ts` untouched.

## Verification evidence

- TDD red: `node --import tsx --test lib/server/aiGovernanceClassroomPolicy.test.ts` -> 0 passed, 5 failed because the new policy functions did not yet exist.
- TDD green: the same command -> 5 passed, 0 failed.
- Required targeted group: `node --import tsx --test lib/server/aiGovernanceClassroomPolicy.test.ts lib/server/apiSurfaceSecurity.test.ts lib/server/userStoreAuth.test.ts` -> 17 passed, 0 failed.
- Related backend group: `node --import tsx --test lib/server/aiGovernance.test.ts lib/server/userStoreAiGovernancePersistence.test.ts lib/server/userStoreDomainContracts.test.ts` -> 41 passed, 0 failed.
- `npm run check:imports` -> all local import targets resolved.
- `npm run type-check` -> passed after making the new persistence collection backward-compatible with legacy test/database snapshots.
- `git diff --check` -> passed before staging.

## Assumptions and risks

- A missing or legacy classroom policy defaults to open mode with bounded pilot limits.
- Policy storage remains in the existing application-state persistence path; no provider secret or environment value was read or written.
- A11 Bug129's direct WebSocket transport fix and package dependency are intentionally excluded from this A07 commit and must be layered separately onto the final voice route.
- A12 Google OAuth work is outside this slice and was not modified.
