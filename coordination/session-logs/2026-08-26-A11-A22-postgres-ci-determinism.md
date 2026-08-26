# A11/A22 session — PostgreSQL CI determinism

- Owner lanes: A11 QA / A22 release reliability
- Branch: `codex/a11-a22-postgres-ci-determinism-20260826`
- Target PR: pending
- Created: 2026-08-26
- Expected closeout: 2026-08-26
- Clean baseline: `1e056b84c87a86ea9def50b9108ed70d5cea8112` (`origin/main` after PR #168)
- Approved slice: `lib/server/userStoreNovaPostgresIntegration.test.ts` and this session log

## Trigger

Promotion finalization PR #169 ran the same immutable head twice. Its PostgreSQL 16 Nova job failed both attempts after the test controller opened more than one pooled connection. The existing assertion counted every backend except the single backend executing `pg_stat_activity`, so it treated another idle controller-pool backend as an integration-worker leak. The false failure then allowed later test work to overlap PostgreSQL cleanup and produced secondary readiness/lock errors.

## Change

The integration controller and default worker clients now use distinct stable PostgreSQL `application_name` values. Worker cleanup checks exclude all controller-pool backends, continue to fail closed on every non-controller client backend, and allow up to five seconds for PostgreSQL to observe a worker socket close. No product code, runtime registry, deployment surface, credentials, or live data path changed.

## Verification

- Red baseline on local PostgreSQL 16.15: 7/9 tests passed; `worker must close every postgres.js client before exit` miscounted one controller backend.
- Fixed exact PostgreSQL 16 gate, consecutive run 1: 9/9 passed.
- Fixed exact PostgreSQL 16 gate, consecutive run 2: 9/9 passed.
- Fixed exact PostgreSQL 16 gate, consecutive run 3 under concurrent TypeScript checking: 9/9 passed.
- Fixed exact PostgreSQL 16 gate after freezing the default worker application name: 9/9 passed.
- `npm run type-check`: passed.
- `npm run test:postgres-readiness`: 1/1 runner-contract test and 56/56 readiness tests passed.
- `npm run test:parent-console` on the PR #168 baseline: 400/400 passed with zero skips.

## Handoff

Create a focused PR, require the normal `validate` and PostgreSQL integration jobs to pass on its exact head, merge normally, and then update Promotion finalization PR #169 to the resulting latest `origin/main` before replaying its checks. `liveAllowed` remains `false`.
