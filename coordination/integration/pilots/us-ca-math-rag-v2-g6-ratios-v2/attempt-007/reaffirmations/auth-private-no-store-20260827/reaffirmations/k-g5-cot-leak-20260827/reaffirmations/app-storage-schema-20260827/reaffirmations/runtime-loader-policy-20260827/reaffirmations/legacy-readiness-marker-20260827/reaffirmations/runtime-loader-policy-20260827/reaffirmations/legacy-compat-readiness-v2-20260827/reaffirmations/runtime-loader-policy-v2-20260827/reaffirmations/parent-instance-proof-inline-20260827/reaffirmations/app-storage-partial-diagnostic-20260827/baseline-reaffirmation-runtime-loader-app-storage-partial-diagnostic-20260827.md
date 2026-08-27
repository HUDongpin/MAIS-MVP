# Attempt 007 append-only baseline re-affirmation — app-storage diagnostic runtime loader digest

- Pilot: `us-ca-math-rag-v2-g6-ratios-v2` / `attempt-007`
- Source re-affirmed baseline: `e8606e3fd47b68b70cb34fb79524e197b9ecbb4c`
- Re-affirmed target baseline: `63e62ae7704f57c898d8bab1a786fd1c82cf4852`
- Source Manifest: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/app-storage-partial-diagnostic-20260827/promotion-manifest.v2.json`
- Revision root: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/app-storage-partial-diagnostic-20260827/reaffirmations/runtime-loader-app-storage-partial-diagnostic-20260827`
- Prepared: 2026-08-27 (Asia/Hong_Kong)
- Live boundary: `liveAllowed=false`

## Evidence boundary

The exact app-storage diagnostic Manifest validates its candidate, evidence,
baseline, and legacy-resolution bindings after the local repository history is
fully materialized, then blocks with `V2_RUNTIME_GRAPH_DRIFT`. This append-only
record is restricted to refreshing the runtime file-read allowlist digest that
moved with the reviewed `lib/server/userStore.ts` source. It does not edit
historical evidence, change runtime code, select or execute a database
operation, deploy, promote candidate content, remove the localization hold, or
change `liveAllowed=false`.

The A-role labels below are repository routing taxonomy. One owner-authorized
integration session sequentially re-ran the role-specific checks. This record
does not claim nine independent human or agent reviews.

## Constrained runtime-policy proof

The repository re-affirmation tool materializes both exact Git baselines and
permits this refresh only if all of the following remain true:

- the source expected policy differs from the observed source policy only in
  `fsReadAllowlistDigest`;
- complete observed source and target runtime-policy objects are equal;
- complete source and target file-read allowlists are equal, including source
  path, source hash, callee, byte position, argument shape, normalized
  expression digest, and policy;
- the exact file-read allowlist count is unchanged; and
- `nextDynamicNonliteralImportCount` and `zeroBaselineCallCount` remain zero.

The protected-path diff from `e8606e3fd47b68b70cb34fb79524e197b9ecbb4c`
to `63e62ae7704f57c898d8bab1a786fd1c82cf4852` is empty. The target adds only
the committed app-storage diagnostic justification, role evidence, evidence
index, Manifest, and legacy-registry snapshot under `coordination/integration/`.
It cannot alter runtime code or the exact loader graph observed at the source
baseline.

## Role-by-role re-affirmation

| Role | Re-affirmed finding |
| --- | --- |
| A21 | Candidate package files, source identity, and aggregate candidate digest remain unchanged. |
| A18 | Math, curriculum, answer, standards, and localization findings remain unchanged. |
| A23 | The candidate remains shadow-only and non-live; this revision repairs metadata only. |
| A04 | Practice content, grading semantics, and routing remain unchanged. |
| A05 | Lesson content, sequencing, remediation, and routing remain unchanged. |
| A11 | The app-storage diagnostic test evidence remains bound to its exact code target; remote PR and post-merge checks remain separate. |
| A22 | Source and target runtime policies and complete file-read allowlists must be equal; loader blind-spot counters must remain zero. |
| A24 | Exact-layer remains `not_applicable`; metadata cannot alter visual geometry or labels. |
| A25 | Exact Git objects have no protected-path delta and contain no secret, provider value, production row, deployment, or production write. |

## Append-only integrity rule

The refreshed registry and nine role-evidence files must be committed first. A
later commit may bind only those exact immutable bytes in a new Manifest and
evidence index. Historical revisions remain unchanged.

Acceptance still requires clean validation, two semantic-stable Shadow runs,
exact Receipt verification, the Promotion Gate test suite, and the remote
required check. This revision is not a merge, deployment, production schema
mutation, or production-release approval.
