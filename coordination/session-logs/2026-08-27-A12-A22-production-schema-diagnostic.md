# A12/A22 production schema partial-state diagnostic

- Session slice: `codex/a12-a22-production-schema-diagnostic-20260827`
- Baseline: `439750ed525ab3d1bca793562338c095f1533cc8`
- Owner: A12 backend/API platform with A22 production reliability
- Target PR: https://github.com/HUDongpin/MAIS-MVP/pull/198
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

The re-affirmation was executed in the required committed phases:

- justification commit: `18eb8a8682`;
- evidence commit: `6af78172a8`;
- manifest/evidence-index binding commit: `c014c4d4e0`;
- canonical receipt commit: `abe993edb7`;
- workflow-selection commit: `14fb6ed008`.

The new manifest passed current validation. Two independent shadow runs used
different run IDs but produced the same semantic receipt digest; both receipts
passed the receipt verifier. The canonical proof records zero network requests,
database writes, and production writes. `npm run test:promotion-gate` passed
`40/40` after the workflow selection was updated.

## Live-main synchronization re-affirmation justification

Live `origin/main` advanced to
`91523e8333b6e7904f3288f9404eab0210cf1d6c` while PR #198 was running. It was
merged without conflict into this session branch, producing the exact target
`0551503db66ee4596cedec1fddc22cbb32719754`. The append-only revision root is
`coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/main-sync-schema-diagnostic-20260827`.

The exact independent re-affirming roles are A21, A18, A23, A04, A05, A11,
A22, A24, and A25. The synchronized protected runtime paths are the six
reviewed Hong Kong question/topic and answer-matching/question-store files
already merged through PR #176; the synchronized protected test paths are
`lib/mvpReadiness.test.ts`, `lib/server/answerMatching.test.ts`, and
`lib/server/questionStore.test.ts`. The schema diagnostic implementation and
its fail-closed deployment controls are unchanged by the live-main merge.
Candidate bytes remain unchanged and `liveAllowed: false` remains mandatory.

## Visualization live-main synchronization re-affirmation justification

Live `origin/main` next advanced to
`7efebfe5d0e617819233c3a61d4465b813d62b16` through reviewed PR #179. It was
merged without conflict into this session branch, producing the exact target
`cca547df300e5a199322d61d9873eb37b0e33040`. The append-only revision root is
`coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/main-sync-schema-diagnostic-20260827/reaffirmations/visualization-main-sync-20260827`.

The exact independent re-affirming roles are A21, A18, A23, A04, A05, A11,
A22, A24, and A25. The synchronized protected runtime paths are the reviewed
Visualization Lab route map, lesson data, and lab data files from PR #179; its
focused bespoke-lab routing test is the only synchronized protected test path.
The schema diagnostic implementation and fail-closed production release
controls are unchanged. Candidate bytes remain unchanged and
`liveAllowed: false` remains mandatory.
