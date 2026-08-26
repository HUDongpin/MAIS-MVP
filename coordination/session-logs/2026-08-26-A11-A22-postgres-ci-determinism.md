# A11/A22 session — PostgreSQL CI determinism

- Owner lanes: A11 QA / A22 release reliability
- Branch: `codex/a11-a22-postgres-ci-determinism-20260826`
- Target PR: [#170](https://github.com/HUDongpin/MAIS-MVP/pull/170)
- Created: 2026-08-26
- Expected closeout: 2026-08-26
- Clean baseline: `1e056b84c87a86ea9def50b9108ed70d5cea8112` (`origin/main` after PR #168)
- Approved slice: `lib/server/userStoreNovaPostgresIntegration.test.ts` and this session log

## Trigger

Promotion finalization PR #169 ran the same immutable head twice. Its PostgreSQL 16 Nova job failed both attempts after the test controller opened more than one pooled connection. The existing assertion counted every backend except the single backend executing `pg_stat_activity`, so it treated another idle controller-pool backend as an integration-worker leak.

PR #170's first exact GitHub run proved that correction: the worker-close subtest passed. It then exposed a separate transient test-harness contention path. While intentional concurrent readiness/mutation checks held PostgreSQL relations, a later semantic worker could hit the one-second DDL lock timeout and return the stable fail-closed error `Postgres storage readiness is unavailable.` before reaching the semantic condition under test.

## Change

The integration controller and default worker clients now use distinct stable PostgreSQL `application_name` values. Worker cleanup checks exclude all controller-pool backends, continue to fail closed on every non-controller client backend, and allow up to five seconds for PostgreSQL to observe a worker socket close.

Semantic workers may start a new immutable process up to four times only when the preceding process exits `1` with that exact fail-closed readiness error. A success or any specific semantic failure returns immediately; exhausting the bounded attempts still fails the caller. Harness assertions prove that neither exit-code-zero results nor different error messages enter this path. No product code, runtime registry, deployment surface, credentials, or live data path changed.

## Verification

- Red baseline on local PostgreSQL 16.15: 7/9 tests passed; `worker must close every postgres.js client before exit` miscounted one controller backend.
- Fixed exact PostgreSQL 16 gate, consecutive run 1: 9/9 passed.
- Fixed exact PostgreSQL 16 gate, consecutive run 2: 9/9 passed.
- Fixed exact PostgreSQL 16 gate, consecutive run 3 under concurrent TypeScript checking: 9/9 passed.
- Fixed exact PostgreSQL 16 gate after freezing the default worker application name: 9/9 passed.
- PR #170 first-head PostgreSQL 16 job: worker cleanup passed; later guardian semantic check exposed the independent transient readiness contention described above.
- Final bounded-semantic-outcome version, run 1 under concurrent TypeScript checking: 9/9 passed.
- Final bounded-semantic-outcome version, consecutive run 2: 9/9 passed.
- Final bounded-semantic-outcome version, consecutive run 3: 9/9 passed.
- Final `npm run type-check`: passed.
- Final `npm run test:postgres-readiness`: 1/1 runner-contract test and 56/56 readiness tests passed.
- Final `git diff --check`: passed.
- `npm run test:parent-console` on the PR #168 baseline: 400/400 passed with zero skips.

## Handoff

Update focused PR #170, require the normal `validate` and PostgreSQL integration jobs to pass on its exact head, merge normally, and then update Promotion finalization PR #169 to the resulting latest `origin/main` before replaying its checks. `liveAllowed` remains `false`.
