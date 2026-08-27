# A12/A22 production app-storage partial-state diagnostic v2

- Session slice: `codex/a12-a22-production-schema-diagnostic-v2-20260827`
- Baseline: `3d1204d54e7d6cb3e240080fb19f6d78713d84f3`
- Owner: A12 backend/API platform with A22 production reliability
- Target PR: pending
- Created: 2026-08-27
- Expected closeout: 2026-08-27 after protected-main read-only preflight diagnosis

## Scope

The exact protected-main production schema preflight reached the real
PostgreSQL provider and failed closed with `reason: app-storage-partial` and
`component: legacy-other-contract`. It made no mutation and authorized no
deployment.

This slice replaces that final coarse component with a read-only,
allowlisted inspection result from the canonical app-storage contract. It can
distinguish relation-set, physical-relation, catalog, compatibility, hot-auth,
readiness-artifact, snapshot, invalidation, and marker drift. The public gate
contract remains `reason: app-storage-partial`; only a fixed safe `component`
is refined. Unknown values still become `unknown`.

The inspection runs under `REPEATABLE READ, READ ONLY`, returns no row values,
and cannot authorize a migration, deployment, or production write. The
existing independent target-bound confirmation remains mandatory before any
schema mutation.

## Verification

- Regression test was observed red before implementation because the new safe
  mapping export did not exist.
- Production schema gate unit tests: `25/25` pass.
- `npm run type-check`: pass.
- `npm run test:postgres-readiness`: runner `1/1`; readiness suite `57/57`.
- `npm run test:parent-console`: tooling `76/76`; runtime `402/402`; zero
  skipped and zero failed.
- PostgreSQL 16 integration assertions cover exact, legacy, physical-relation,
  catalog, compatibility, hot-auth, and snapshot classifications. Local Docker
  Desktop did not become ready in the bounded attempt, so the PR PostgreSQL 16
  service remains the authoritative execution gate for those assertions.

No credential value, database URL, production row, function source, schema
confirmation, or notification payload is recorded in this handoff.
