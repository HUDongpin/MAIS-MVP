# Attempt 007 append-only baseline re-affirmation — app-storage partial diagnostic

- Pilot: `us-ca-math-rag-v2-g6-ratios-v2` / `attempt-007`
- Source re-affirmed baseline: `55608eaca1d631b0475cb27d7e4a30ff5c362de5`
- Re-affirmed target baseline: `e8606e3fd47b68b70cb34fb79524e197b9ecbb4c`
- Source Manifest: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/promotion-manifest.v2.json`
- Revision root: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/app-storage-partial-diagnostic-20260827`
- Prepared: 2026-08-27 (Asia/Hong_Kong)
- Live boundary: `liveAllowed=false`

## Evidence boundary

This append-only record re-affirms the selected candidate-only Promotion
evidence against the exact app-storage partial-diagnostic target. It does not
edit historical evidence, authorize a database write, select a schema
operation, execute a deployment, promote candidate content, remove the
localization hold, or change `liveAllowed=false`.

The A-role labels below are repository routing taxonomy. One owner-authorized
integration session sequentially re-ran the role-specific checks. This record
does not claim nine independent human or agent reviews.

Promotion Shadow run `33067047225` completed two semantically identical Shadow
executions, exact Receipt verification, artifact-set validation, and artifact
upload. Its final outcome blocked only because current validation reported
`V2_TARGET_BASELINE_DRIFT` for one runtime path. This record addresses that
exact drift and does not waive or pre-claim the next remote gate result.

## Exact protected-path delta and production safety

Between source baseline `55608eaca1d631b0475cb27d7e4a30ff5c362de5`
and target `e8606e3fd47b68b70cb34fb79524e197b9ecbb4c`, the
diagnostic changes one protected runtime path, `lib/server/userStore.ts`, and
one protected test-only path,
`lib/server/userStoreNovaPostgresIntegration.test.ts`. Gate, worker, focused
unit-test, and session-log changes are under `scripts/` and `coordination/`,
outside the Promotion protected-path set. No candidate content, curriculum,
grading, lesson, visualization, public asset, middleware, Next configuration,
or shared TypeScript configuration changes.

The runtime change preserves the existing state-only production inspector and
mutation path. It adds a read-only evidence result whose partial reason is one
of eleven fixed contract categories. The protected gate independently
allowlists those categories, rejects unknown values before evidence build, and
retains the generic `app-storage-partial` fallback. Successful preflight
bindings, confirmation digests, operation names, and transaction behavior are
unchanged. No PostgreSQL catalog row, relation count, function body, production
hash, snapshot value, URL, identity, credential, or provider diagnostic can
enter the public result.

## Verification bound to the target

- Focused production-schema gate tests: `25/25` pass.
- PostgreSQL schema fast-path tests: `9/9` pass.
- PostgreSQL readiness tests: `57/57` pass.
- Release-governance tests: `91/91` pass with `11` deliberate skips.
- TypeScript type-check: pass.
- Fresh optimized Next.js build: pass, including all `202` static pages.
- PR run `33067047272` real PostgreSQL 16 Nova migration and rollback gate:
  pass. It covers exact canonical, canonical without marker, exact legacy-v1,
  physical-relation drift, function-source drift, and function-search-path
  drift.
- The local parent-console suite passed `75/76`; its sole macOS `/private/tmp`
  path-safety expectation ordering difference is unchanged from protected
  `main`. The responsible configuration and test files are byte-identical to
  the baseline, while the exact Ubuntu baseline check is green.

## Role-by-role re-affirmation

| Role | Re-affirmed finding |
| --- | --- |
| A21 | Candidate generation evidence remains valid because candidate package files, source identity, and aggregate candidate digest are unchanged. |
| A18 | Independent math and curriculum QA remain valid; the diagnostic does not alter questions, answers, standards mapping, lessons, or the localization hold. |
| A23 | Shadow readiness remains candidate-only and non-live; the diagnostic neither registers content nor authorizes a schema operation. |
| A04 | Practice semantics remain exact because practice bytes, grading behavior, accepted-answer policy, and practice routing are unchanged. |
| A05 | Lesson semantics remain exact because lesson bytes, instructional sequence, remediation targets, and lesson routing are unchanged. |
| A11 | Focused, build, and real PostgreSQL regression evidence is bound to the target; new remote PR and post-merge results remain separate gates. |
| A22 | Production inspection remains read-only, advisory-lock protected, repeatable-read, fail-closed, and restricted to redacted allowlisted output. |
| A24 | Exact-layer remains `not_applicable`; the diagnostic cannot alter visual geometry, formulas, coordinates, units, labels, or illustration assets. |
| A25 | Exact Git objects were compared; the slice contains reviewed runtime, tests, scripts, and bounded evidence only, with no secret, provider value, production row, deployment, or production write. |

## Append-only integrity rule

The re-affirmed legacy-registry snapshot and nine role-evidence artifacts must
be committed first. Only a later commit may bind those immutable bytes in the
new Manifest and evidence index. Historical revisions remain unchanged. If the
runtime loader digest changes because `userStore.ts` source positions moved, it
must be repaired through a separate constrained nested append-only revision.

Acceptance still requires clean Manifest validation, two distinct
semantic-stable Shadow runs, exact Receipt verification, the full Promotion
Gate test suite, and the remote required check. This record is not a merge,
deployment, production schema mutation, or production-release approval.
