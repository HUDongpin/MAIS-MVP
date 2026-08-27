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

## Promotion baseline re-affirmation justification

The immutable promotion baseline will be re-affirmed from the currently
selected finalized Manifest to the exact implementation target
`9aa15be57c182d388c324823a5d936d3d9f81e1a`. The append-only revision root is
`coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/reviewed-main-runtime-graph-20260827/reaffirmations/production-schema-diagnostic-v2-20260827`.

The exact independent re-affirming roles are A21, A18, A23, A04, A05, A11,
A22, A24, and A25. The protected runtime diff is limited to the canonical
`lib/server/userStore.ts` schema inspector, while the protected test diff is
limited to `lib/server/userStoreNovaPostgresIntegration.test.ts`. The observed
runtime dependency policy is unchanged and can be retained without a policy
refresh. Candidate content bytes, live-content reachability, and the
fail-closed `liveAllowed: false` posture remain unchanged. This diagnostic is
read-only and cannot authorize a schema mutation or production deployment.

## Loader-position-preserving re-affirmation justification

The first generated revision above remains append-only but is not eligible for
workflow selection: validation correctly detected that inserting the new
inspector before the existing legacy JSON `readFile` call changed that
allowlisted callsite's byte position. The call count, callee, source path,
argument shape, normalized expression digest, and read-only policy were
unchanged, but the frozen policy intentionally rejected the positional drift.

The implementation was therefore laid out again without weakening the policy:
the original inspector and the existing allowlisted `readFile` call retain
their original source bytes and position, and the new read-only evidence
inspector is declared after that callsite. The exact new implementation target
is `ee3cf01c506562ffd330fb3b8887b37f85094d90`. The new append-only revision
root is
`coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/reviewed-main-runtime-graph-20260827/reaffirmations/production-schema-diagnostic-v2-layout-20260827`.

The exact independent re-affirming roles are A21, A18, A23, A04, A05, A11,
A22, A24, and A25. Protected runtime scope remains only
`lib/server/userStore.ts`, protected test scope remains only
`lib/server/userStoreNovaPostgresIntegration.test.ts`, candidate content bytes
remain unchanged, and `liveAllowed: false` remains mandatory. No policy
refresh or reviewed-policy exception is requested.
