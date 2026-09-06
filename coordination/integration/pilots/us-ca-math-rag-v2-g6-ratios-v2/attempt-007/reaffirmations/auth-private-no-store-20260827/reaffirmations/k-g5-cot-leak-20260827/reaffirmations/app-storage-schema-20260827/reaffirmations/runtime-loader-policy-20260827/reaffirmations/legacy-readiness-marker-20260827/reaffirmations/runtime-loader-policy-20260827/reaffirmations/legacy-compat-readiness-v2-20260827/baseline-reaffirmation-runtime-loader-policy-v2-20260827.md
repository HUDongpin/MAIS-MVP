# Attempt 007 append-only baseline re-affirmation — legacy compatibility v2 runtime loader digest

- Pilot: `us-ca-math-rag-v2-g6-ratios-v2` / `attempt-007`
- Source re-affirmed baseline: `4c5cac64ae817131eb5e5454f03732ed0ce070c0`
- Re-affirmed target baseline: `52d41e39d1ab00c5f570ae01a51edd6cb2733ae8`
- Source Manifest: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/promotion-manifest.v2.json`
- Revision root: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827`
- Prepared: 2026-08-27 (Asia/Hong_Kong)
- Live boundary: `liveAllowed=false`

## Evidence boundary

The exact legacy-compatibility v2 Manifest validates every candidate, evidence,
baseline, and legacy-resolution binding but is blocked by
`V2_RUNTIME_GRAPH_DRIFT`. This append-only record repairs only the runtime
loader policy digest caused by the reviewed `lib/server/userStore.ts` source
hash and byte positions. It does not edit historical artifacts, change runtime
code, modify candidate content, authorize a database write or deployment,
remove localization holds, or change `liveAllowed=false`.

The A-role labels below are the repository routing taxonomy. One
owner-authorized integration session sequentially re-ran the role-specific
checks. This record does not claim nine independent human or agent reviews.

## Constrained runtime-policy proof

The repository repair tool materializes both exact Git baselines and runs the
same canonical runtime observer. It is permitted to refresh the Manifest only
when:

- the source Manifest differs from the observed source policy only in
  `fsReadAllowlistDigest`;
- the complete observed source and target runtime-policy objects are equal;
- the complete source and target file-read allowlists are equal, including
  source path, source hash, callee, byte position, argument shape, normalized
  expression digest, and policy;
- `fsReadAllowlistCount` remains exact; and
- `nextDynamicNonliteralImportCount` and `zeroBaselineCallCount` remain zero.

The protected-path diff from `4c5cac64ae817131eb5e5454f03732ed0ce070c0`
to `52d41e39d1ab00c5f570ae01a51edd6cb2733ae8` is empty. The target adds only
the committed legacy-compatibility v2 justification, role evidence, evidence
index, Manifest, and legacy-registry snapshot under
`coordination/integration/`. It cannot change the runtime graph or the exact
file-read allowlist observed at the source baseline.

## Role-by-role re-affirmation

| Role | Re-affirmed finding |
| --- | --- |
| A21 | Candidate package files, source identity, and aggregate digest remain unchanged. |
| A18 | Math, curriculum, answer, standards, and localization findings remain unchanged. |
| A23 | The candidate remains shadow-only and non-live; this revision repairs metadata only. |
| A04 | Practice content, grading semantics, and routing remain unchanged. |
| A05 | Lesson content, sequencing, remediation, and routing remain unchanged. |
| A11 | The legacy-compatibility v2 test evidence remains bound to its exact code commit; remote PR and post-merge checks remain separate. |
| A22 | Source and target runtime policies and complete file-read allowlists must be equal; loader blind-spot counters must remain zero. |
| A24 | Exact-layer remains `not_applicable`; metadata cannot alter visual geometry or labels. |
| A25 | The compared targets are exact Git objects with no protected-path delta and no secret, provider value, deployment, or production write. |

## Append-only integrity rule

The refreshed registry and nine evidence files must be committed first. A later
commit may bind only those exact immutable bytes in a new Manifest and evidence
index. Historical revisions remain unchanged.

Acceptance still requires clean validation, two semantic-stable Shadow runs,
exact Receipt verification, the Promotion Gate test suite, and the remote
required check. This revision is not a merge, deployment, production schema
mutation, or production-release approval.
