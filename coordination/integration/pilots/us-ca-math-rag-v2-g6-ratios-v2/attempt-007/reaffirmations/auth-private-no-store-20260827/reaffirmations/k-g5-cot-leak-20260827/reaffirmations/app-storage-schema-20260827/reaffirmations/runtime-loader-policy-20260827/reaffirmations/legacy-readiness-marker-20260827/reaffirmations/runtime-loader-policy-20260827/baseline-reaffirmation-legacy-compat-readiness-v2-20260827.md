# Attempt 007 append-only baseline re-affirmation — exact legacy compatibility readiness v2

- Pilot: `us-ca-math-rag-v2-g6-ratios-v2` / `attempt-007`
- Source re-affirmed baseline: `187b31811db2a021de2f488277ecd91a7c319b87`
- Re-affirmed target baseline: `4c5cac64ae817131eb5e5454f03732ed0ce070c0`
- Source Manifest: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/promotion-manifest.v2.json`
- Revision root: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827`
- Prepared: 2026-08-27 (Asia/Hong_Kong)
- Live boundary: `liveAllowed=false`

## Evidence boundary

This append-only record re-affirms the selected candidate-only Promotion
evidence against the reviewed exact-legacy compatibility readiness v2 target.
It does not edit or replace any historical Manifest, evidence file, registry,
Receipt, closure, or lifecycle record. It does not promote candidate content,
modify candidate bytes, remove the localization hold, authorize a production
write, execute a deployment, or change `liveAllowed=false`.

The A-role labels below are the repository routing taxonomy. One
owner-authorized integration session sequentially re-ran the role-specific
checks. This record does not claim that nine separate humans or nine independent
agent sessions performed the re-affirmation.

The current Promotion run reached two successful, semantically identical Shadow
executions and exact Receipt verification before the current-input gate blocked
with `V2_TARGET_BASELINE_DRIFT`. Its protected-path summary reports one runtime
path and three test-only paths. This record addresses only that exact drift; it
does not waive the gate or pre-claim its next result.

## Exact protected-path delta and database safety

Between source baseline `187b31811db2a021de2f488277ecd91a7c319b87`
and target `4c5cac64ae817131eb5e5454f03732ed0ce070c0`, the sole protected runtime
path is `lib/server/userStore.ts`. The three protected test-only paths are
`lib/server/userStore/postgresStorageReadiness.test.ts`,
`lib/server/userStoreNovaPostgresAdmission.test.ts`, and
`lib/server/userStoreNovaPostgresIntegration.test.ts`. Deployment-plan,
production-schema parser, fixture, worker, workflow-contract test, and session
evidence changes remain under `scripts/` and `coordination/`, outside the
Promotion protected-path set. No candidate content, curriculum, grading,
lesson, visualization, public asset, middleware, Next configuration, or shared
TypeScript configuration changes.

The target recognizes only the exact historical production compatibility
contract whose normalized source SHA-256 is allowlisted in committed code. It
requires all eight existing canonical relations, columns, primary keys, RLS and
persistence settings, one exact historical trigger/function ownership and
dependency graph, no orphan readiness invalidation artifact, hot-auth v4, and
one complete valid snapshot. Any source, `search_path`, dependency, trigger,
schema, snapshot, or authorization drift fails closed.

The v2 completion transaction takes the exclusive storage advisory lock and
table locks, re-attests the historical contract, preserves the complete
snapshot, installs the shared current compatibility function, creates the
readiness-marker contract, and then post-attests the exact canonical schema.
Injected drift, repeated execution, or failed post-attestation rolls back the
whole transaction. It never treats an unknown legacy contract as eligible.

## Verification bound to the target

- `npm run type-check`: pass.
- Focused admission, readiness, deployment-plan, production-schema, and
  fast-path suite: `85/85` pass.
- `npm run test:parent-console`: `400/400` pass.
- Real isolated PostgreSQL 16 integration: `11/11` pass, repeated in two fresh
  clusters; the exact historical upgrade preserved snapshot payload digest,
  revision, and `updated_at`, rejected repeat execution, rejected function
  source and `search_path` drift, and left no marker artifacts after injected
  failure.
- Fresh production build: pass with BUILD_ID `GBCbGPauXuciqk63SW0Kl`;
  tracked `next-env.d.ts` remained unchanged.
- Current PR CI already passed snapshot, visualization-browser,
  teacher-notice outbox PostgreSQL 16, and Resend webhook PostgreSQL checks at
  the time this record was prepared. Remaining PR checks, merge, post-merge
  main, a fresh exact-SHA release build, deployment, production schema apply,
  and live-domain behavior remain separate gates.

## Role-by-role re-affirmation

| Role | Re-affirmed finding |
| --- | --- |
| A21 | Candidate generation evidence remains valid because every candidate package file, source identity, and aggregate candidate digest is unchanged. |
| A18 | Independent math and curriculum QA remain valid; the storage upgrade does not alter questions, answers, standards mapping, lessons, or the existing localization hold. |
| A23 | Shadow readiness remains candidate-only and non-live; the exact-state schema operation creates no candidate-content live registration. |
| A04 | Practice semantics remain exact because practice bytes, grading behavior, accepted-answer policy, and practice routing are unchanged. |
| A05 | Lesson semantics remain exact because lesson bytes, instructional sequence, remediation targets, and lesson routing are unchanged. |
| A11 | Focused, parent, build, and real PostgreSQL regression evidence is bound to the target; remote PR and post-merge evidence remain separate and are not pre-claimed. |
| A22 | The migration is exact-state gated, transactionally locked, post-attested, rollback-tested, and built from a clean isolated worktree without `next-env.d.ts` pollution. |
| A24 | Exact-layer remains `not_applicable`; the migration cannot alter geometry, formulas, coordinates, units, labels, or illustration assets. |
| A25 | Exact Git objects were compared; the slice contains the reviewed runtime, tests, scripts, and bounded evidence only, with no secret value, provider credential, production row, deployment, or production write. |

## Append-only integrity rule

The re-affirmed legacy-registry snapshot and nine revision evidence artifacts
must be committed first. Only after that immutable evidence commit exists may a
new Manifest and evidence index bind their exact reviewed commit, raw SHA-256,
semantic digest, and currentness. If the runtime loader digest changes because
the reviewed `userStore.ts` source hash or byte positions moved, it must be
repaired through a separate constrained nested append-only revision.

Acceptance requires clean Manifest validation, two distinct semantic-stable
Shadow runs, exact Receipt verification, the full Promotion Gate test suite,
and the remote required check. Until those gates pass, this re-affirmation is
not a merge, deployment, schema mutation, or production-release approval.
