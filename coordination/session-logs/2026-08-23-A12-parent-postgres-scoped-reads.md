# A12 Parent Postgres Scoped Reads — 2026-08-23

- Owner/lane: A12 Backend/API platform
- Branch: `codex/a12-parent-postgres-scoped-reads-20260823`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a12-parent-postgres-scoped-reads-20260823`
- Exact baseline: `c5335f42ac892670374a7025cbfc627f50d083a4`
- Target PR: pending
- Created: 2026-08-23
- Expected closeout: 2026-08-23 after independent spec and code-quality reviews

## Assigned slice

Implement read-only, fail-closed, parent/family-scoped PostgreSQL loading for Parent Console foundation, child summary, reports, messages, and notices. Preserve the legacy SQLite reader and every mutation/idempotency path. Do not change providers, UI, package/CI wiring, production, or deployment.

## Design

- One PostgreSQL statement reads one MVCC snapshot across the metadata-validated `app_state` slices, existing projection tables, and existing activity hot tables.
- The already-existing student-activity schema readiness is now reusable outside the write fast path. It runs in a transaction with local lock/statement timeouts, clears its latch after failure, and completes before the parent snapshot query can reference `practice_attempts`, `mistake_book_items`, or `learning_events`.
- The parent snapshot statement itself runs inside a PostgreSQL transaction with a transaction-local 5-second `statement_timeout`. A database cancellation rejects through the existing parent handler boundary as a private no-store 503; transaction cleanup prevents a cancelled statement from poisoning a pooled connection.
- The query never selects or returns the complete `app_state.payload`; it extracts only the eight legacy arrays not already represented by projections/hot tables.
- Exact non-disabled parent projection plus active guardian links establish the student scope. Enrollments establish the class scope. Authority-bearing projection scalar columns and their JSON record keys must match through `IS NOT DISTINCT FROM`; drift is excluded fail closed. Reports, message threads/entries, notice recipients/notices, assignments/submissions, activity, rewards, users, settings, and teacher context are restricted to those scopes.
- A pure result scoper repeats the tenant-local family checks in JavaScript before hydration. Missing/disabled parent projections and malformed result collections throw a stable internal error; there is no PostgreSQL-to-full-snapshot fallback.
- A valid parent with no active child link receives an empty family scope so the Parent Console can still render its child-binding entry. An explicit child/thread/recipient request remains fail closed in the existing domain stores.
- Read-only Parent GET stores accept an optional scoped reader. SQLite/tests retain the existing reader by default. Parent mutations continue through the existing transactional full-state path.

## TDD evidence

Focused RED evidence captured before implementation/refinement:

- Scoped reader/source contract: `./node_modules/.bin/tsx --test lib/server/userStoreParentPostgresScopedReads.test.ts` initially failed 3/3 because no parent-scoped reader or dependency existed.
- Result sanitizer module: `./node_modules/.bin/tsx --test lib/server/userStoreParentPostgresScopedCollections.test.ts` failed with `MODULE_NOT_FOUND` before the module existed.
- Disabled parent defense: the two scoped-read tests failed 2 assertions before both SQL and JavaScript rejected `disabled_at`.
- Message-entry collision: the mixed-family fixture retained a foreign participant entry on an allowed thread until exact sender/recipient checking was added.
- App-state slicing refinements each failed first for missing `MATERIALIZED` single-state extraction, missing assignment-attempt scope, and missing enrolled-report-class scope.
- SQL authorization final gate: `node --import tsx --test lib/server/userStoreParentPostgresScopedReads.test.ts` failed 1/5 until the final SELECT cross-joined `authorized_parent`.
- Full collection defense: `node --import tsx --test lib/server/userStoreParentPostgresScopedCollections.test.ts` failed 1/4 with a foreign topic/activity family sentinel until every activity, topic/question, tutor, and reward collection was re-scoped in JavaScript.
- Independent spec review requested changes because the JavaScript defense layer collapsed wrong-type optional fields to an empty string. Two new regression tests produced a fresh RED result of 4/6: a numeric `disabled_at` parent was accepted and a numeric report `class_id` was retained. The helper now distinguishes absent/null/empty legacy values from invalid numeric/object/array values; invalid `disabled_at` fails the parent scope and invalid report/message/notice `class_id` rejects the record. The focused helper suite is GREEN at 6/6.
- Independent code-quality review then requested three Important amendments: cold activity-table readiness, projection scalar/record parity, and a database-side statement timeout. The first amendment run was RED at 7/11 with four expected failures: the activity readiness export was absent, the parent reader did not invoke it, authority parity predicates were absent, and there was no transaction-local timeout. The minimal implementation moved that run to 11/11 GREEN.
- A follow-up readiness-boundary regression was RED at 3/4 because schema DDL was not transaction bounded. The reusable readiness now applies local lock/statement timeouts, uses the transaction executor for every DDL statement, and clears the readiness latch on rejection; the suite moved to 4/4 GREEN.

Latest GREEN evidence after the code-quality amendments:

- Focused persistence/scoped-reader suite: 72/72 passed (the original 69 plus three review-driven regressions).
- Activity readiness plus scoped source suite: 12/12 passed.
- Parent-safe DTO/API/RSC suite: 13/13 passed.
- `npm run type-check`: passed.
- `npm run check:imports`: passed.
- `git diff --check`: passed.

Second independent code-quality amendment (projection scalar/record parity):

- RED: `node --import tsx --test --test-name-pattern='parent authority CTEs' lib/server/userStoreParentPostgresScopedReads.test.ts` failed 0/1 on the first missing contract, `projection_teacher_classes.grade`, before the SQL change.
- The source contract now freezes teacher-message `teacher_id`, teacher-class `grade`, student-profile `user_id`/`grade`, and school-membership `user_id`/null-safe `class_id`/`role` parity. `student_grades` consumes only the already parity-filtered `student_profile_records` CTE.
- GREEN: the same targeted command passed 1/1; the focused persistence/scoped-reader suite passed 72/72; activity-readiness plus source contracts passed 12/12; parent-safe DTO/API/RSC passed 13/13; `npm run type-check`, `npm run check:imports`, and `git diff --check` passed.
- A bounded read-only Docker daemon probe again produced no result within 10 seconds, so no real PostgreSQL drift fixture was claimed. Real PostgreSQL query execution remains an explicit integration boundary.

Independent spec re-review: PASS before the code-quality amendments. Independent code-quality re-review of the three amendments remains required before commit/push.

The formal `npm run test:parent-console` command currently stops at its manifest guard before runtime execution because the A11-owned runner has not yet listed the two new Slice B test files. The failure names only `userStoreParentPostgresScopedCollections.test.ts` and `userStoreParentPostgresScopedReads.test.ts` as unlisted; this backend slice does not edit package/CI wiring. The 72 focused tests and 13 parent-safe route/RSC tests above execute those new contracts directly while A11 integration remains pending.

## Boundaries and dependencies

- No real PostgreSQL statement execution was obtained: a fresh local Docker-daemon probe produced no response within 10 seconds and was interrupted. Static SQL contracts, TypeScript, and pure mixed-family fixtures are green; real PostgreSQL parsing, 42P01 bootstrap, 57014 cancellation, and post-cancellation connection reuse remain explicit integration boundaries.
- `ensurePostgresStateTable()` still uses the baseline bootstrap/readiness implementation. The separately reviewed Slice A revisions (metadata-only readiness/bootstrap/timeouts/schema contract) must land before this slice can prove the cold/warm performance target end to end.
- No new schema or migration is added. The reader reuses the existing student-activity schema bootstrap, existing projection/hot tables, and schema-version-1 app-state arrays. Missing/malformed required slices fail closed.
- No mutation, idempotency, notification-provider, UI, package/CI, production, or deployment path was changed.
