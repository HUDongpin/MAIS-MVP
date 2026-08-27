# A12/A22 production schema partial-state diagnostic

- Session slice: `codex/a12-a22-production-schema-diagnostic-20260827`
- Baseline: `439750ed525ab3d1bca793562338c095f1533cc8`
- Owner: A12 backend/API platform with A22 production reliability
- Target PR: pending
- Created: 2026-08-27
- Expected closeout: 2026-08-27 after protected-main read-only preflight diagnosis

## Scope

The protected production schema preflight reaches the real PostgreSQL provider
but rejects the current app-storage contract as `app-storage-partial`. This
slice adds a second, read-only catalog diagnostic only after that fail-closed
classification. The diagnostic emits one allowlisted component code and never
returns database URLs, credentials, row values, snapshot payloads, family
identifiers, notification data, provider diagnostics, or function source.

The component code cannot authorize a migration or deployment. The original
`app-storage-partial` rejection remains the controlling result, and production
schema mutation still requires an independently generated target-bound
confirmation in the serialized protected-main deployment workflow.

## Verification

- `npm run type-check`: pass.
- Production schema gate unit tests: `24/24` pass.
- Local isolated PostgreSQL 16 integration: `11/11` pass, including exact
  classification of relation-contract and compatibility-contract drift.
- Parent console gate: tooling `76/76`; runtime `401/401`, zero skipped.
- No runtime `app/`, `components/`, `lib/server/userStore.ts`, environment,
  migration-plan, or production-data changes.

No credential value, database URL, production row, function source, or schema
confirmation is recorded in this handoff.

## Promotion baseline re-affirmation justification

The immutable promotion baseline is re-affirmed from its current finalized
manifest to the exact diagnostic target
`d96cb3c38c0b76cea24f46c3be1ac7470c772eda`. The append-only revision root is
`coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827`.

The exact independent re-affirming roles are A21, A18, A23, A04, A05, A11,
A22, A24, and A25. The protected runtime diff is empty; the only protected
test-only path is
`lib/server/userStoreNovaPostgresIntegration.test.ts`. Candidate bytes,
live-content reachability, runtime loader policy, and the fail-closed
`liveAllowed: false` posture remain unchanged. The new catalog diagnostic and
schema-gate script changes are read-only release tooling: they cannot mutate
production, authorize a migration, or authorize deployment.
