# A12 Parent Postgres Scoped Mutations

- Owner/lane: A12 Backend/API platform
- Branch: `codex/a12-parent-postgres-scoped-mutations-20260823`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a12-parent-postgres-scoped-mutations-20260823`
- Baseline: `c5335f42ac892670374a7025cbfc627f50d083a4`
- Target PR: pending
- Created: 2026-08-23
- Expected closeout: 2026-08-24
- Scope: Postgres-only scoped mutations for parent message creation, parent message replies, and parent notice acknowledgements; focused tests and this lifecycle log.
- Exclusions: guardian links, teacher provider/UI, shared types, package/CI configuration, E2E, deployment, and real provider operations.

## Handoff status

Candidate implementation complete; independent specification and code-quality reviews are pending. This slice is not merged, deployed, or production-verified.

## Implemented boundary

- Postgres message create, message reply, and notice acknowledgement use a narrow adapter instead of the generic full-snapshot mutation path.
- Each write locks the exact canonical `app_state` marker, reloads the minimum authorization/idempotency scope inside that transaction, validates the existing synchronous domain mutator's exact delta, applies only the permitted JSONB record/array patch, and increments the state revision.
- Message create/reply upsert the single corresponding `projection_teacher_messages` row in the same transaction. There is no notice acknowledgement projection table in the current schema.
- Message replay prechecks are narrow and unlocked. A replay that would bypass rate limiting is reconfirmed under the same transaction/row lock before returning any prior thread or entry.
- Parent role, active guardian link, current class/teacher authorization, exact IDs, idempotency hashes, active-account state, and recipient ownership are rechecked fail closed. Final write SQL independently guards `role = parent` and an empty `disabled_at` value.
- SQLite and non-Postgres stores retain the pre-existing generic persistence semantics.

## TDD evidence

- Initial RED: `npx tsx --tsconfig tsconfig.json --test lib/server/userStore/parentPostgresScopedMutations.test.ts` exited 1 with `Cannot find module '@/lib/server/userStore/parentPostgresScopedMutations'` before the adapter existed.
- Family-isolation RED: `npx tsx --tsconfig tsconfig.json --test --test-name-pattern='other family' lib/server/userStore/parentPostgresScopedMutations.test.ts` exited 1 because `other-family-secret` survived the first defensive projection.
- Replay-authorization RED: `npx tsx --tsconfig tsconfig.json --test --test-name-pattern='replay prechecks reconfirm' lib/server/userStore/parentPostgresScopedMutations.test.ts` exited 1 because a previously idempotent reply was returned after the active guardian link had been revoked between precheck and locked recheck.
- Missing-schema RED: `npx tsx --tsconfig tsconfig.json --test --test-name-pattern='locks an exact state row|malformed scoped arrays' lib/server/userStore/parentPostgresScopedMutations.test.ts` exited 1 because the SQL did not yet return `schema_valid` and a missing array reached the generic field error instead of the explicit scoped-schema boundary.
- Focused GREEN: the new adapter suite completed 11/11; the parent message/notice route and persistence combination completed 48/48.
- Frozen type GREEN: `npm run type-check` exited 0.
- Frozen gate GREEN: `npm run test:parent-console` verified 265/265, 0 skipped. The new adapter test remains separately executed because this slice is forbidden from changing the package/CI manifest.
- Hygiene GREEN: `git diff --check` exited 0 and no tracked `next-env.d.ts` change appeared.

## Residual boundaries

- The lock is the canonical `app_state` row, so these writes remain globally serialized with other snapshot writers. This slice reduces payload transfer and projection work, not the row-level serialization domain.
- Authorization/idempotency arrays are filtered inside PostgreSQL and only the scoped aggregates cross the connection, but PostgreSQL still scans relevant JSONB arrays server-side because `app_state.payload` remains canonical.
- The cached schema-readiness gate performs only its small marker check on a cold process when current. If the marker is absent, the pre-existing one-time bootstrap can seed/synchronize a full initial snapshot; this is migration/bootstrap behavior, not a per-mutation fallback, and was not redesigned here.
- No usable local PostgreSQL server or `POSTGRES_URL` was available. Tagged-SQL shape, transaction ordering, rollback intent, and concurrent logic have focused contract tests, but real PostgreSQL syntax execution, rollback, cross-process same-key contention, connection failure timing, and load performance remain unproved.
- No provider, network, or deployment work is included. The adapter contains no fetch/logging path, requires a synchronous mutator, and rejects thenables before any state patch; this prevents holding its database transaction across awaited provider or transport I/O in the owned paths.
