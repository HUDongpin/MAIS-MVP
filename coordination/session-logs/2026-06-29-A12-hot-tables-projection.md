# 2026-06-29 A12 Session Log - Hot Tables And Projections

## Agent ID

- A12 Backend/API platform lead.

## Objective

Continue the hot-table plus projection database model so Dashboard, Teacher Console, and Practice high-frequency reads/writes avoid full JSON snapshot scans during classroom concurrency.

## Write Scope

- `app/api/learning-events/route.ts`
- `lib/server/practiceAttemptStore.ts`
- `lib/server/practiceAttemptStore.test.ts`
- `lib/server/userStore.ts`
- `lib/server/userStoreStudentActivityPersistence.test.ts`
- `lib/server/userStoreTeacherOpsOperationsPersistence.test.ts`
- `coordination/session-logs/2026-06-29-A12-hot-tables-projection.md`

## Plan And Scope Check

1. Extend the Postgres fast path for practice attempts and learning events with standard tables and indexes.
2. Add rebuildable dashboard and teacher projection tables synced from normalized state.
3. Rewrite hot student and teacher projection queries to indexed projection tables plus hot activity rows, without `app_state` JSONB lateral scans.
4. Add focused persistence tests and run type/build/backend checks.

The edits stayed inside A12-owned backend/API storage surfaces plus focused test coverage and this session log. No Git staging, commit, branch, push, reset, clean, or revert was performed.

## Changes

- Added a hot `learning_events` append path for `/api/learning-events` with direct Postgres inserts, conflict-safe batching, clear markers, and indexed topic/question/time access.
- Added `learning_event_clears` and additional btree indexes for practice attempts, mistake book rows, and learning events.
- Added rebuildable `projection_*` Postgres tables for student dashboard, teacher shell, teacher dashboard, teacher analytics, assignment, messaging, lesson progress, visualization, reward, and gamification read models.
- Added projection-table sync from normalized database state after Postgres state normalization and writes.
- Reworked student dashboard, teacher shell, teacher dashboard, and teacher analytics Postgres projections to read from indexed projection tables plus hot `practice_attempts`, `mistake_book_items`, and `learning_events`.
- Preserved legacy snapshot fallback behavior when projection rows are not yet populated.
- Added static regression tests to prevent the hot dashboard/teacher projection paths from falling back to `app_state` and `jsonb_array_elements`.

## Checks

- `npm run type-check` - passing.
- `npx tsx --test lib/server/practiceAttemptStore.test.ts lib/server/userStoreStudentActivityPersistence.test.ts lib/server/userStoreTeacherOpsOperationsPersistence.test.ts` - passing, 78 tests.
- `npm run build` - passing.
- `npm run test:backend` - 4 passed, 1 failed. The failure is outside this A12 storage slice: `tests/e2e/backend-api.spec.ts:765` expected AI Tutor status `configured` to be `false`, but the current environment returned `true`. This is A07/A19-owned AI Tutor/provider environment drift.

## Handoff Notes

- The current root checkout was already heavily dirty; unrelated session-log and feature changes were left untouched.
- Projection rows use relational filter columns plus JSONB record payloads as an incremental read-model step. The high-frequency filters now hit indexed tables instead of `app_state.payload` scans.
- First read in an existing Postgres environment with empty projection tables falls back to the legacy snapshot path until normalization or a write syncs projections.
- Some lower-priority read paths, such as gamification summary and lesson performance projections, still contain JSONB scans and should be handled in later A12/A17/A22 slices if they become classroom-hot.
