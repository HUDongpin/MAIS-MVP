# Attempt 007 append-only baseline re-affirmation — parent instance-proof runtime loader digest

- Pilot: `us-ca-math-rag-v2-g6-ratios-v2` / `attempt-007`
- Source re-affirmed baseline: `684b8d8573157a10077f7cab3c65b8da4f80f7e3`
- Re-affirmed target baseline: `06139c8d2b8707af68f62fa2304b428214839d6a`
- Source Manifest: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-20260827/promotion-manifest.v2.json`
- Revision root: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-20260827/reaffirmations/runtime-loader-parent-instance-proof-20260827`
- Prepared: 2026-08-27 (Asia/Hong_Kong)
- Live boundary: `liveAllowed=false`

## Evidence boundary

The parent instance-proof Manifest validates its candidate, evidence, baseline,
and legacy-resolution bindings but correctly stops with
`V2_RUNTIME_GRAPH_DRIFT` and observed policy digest
`412ef0c3199aca843ec2654f0585f90f99abeb8045efb1deb052c8d91d8d3c9c`.
This append-only record may repair only the stale runtime file-read allowlist
digest introduced by the reviewed server import. It does not edit historical
artifacts, change runtime code, modify candidate content, authorize a database
write or deployment, remove localization holds, or change
`liveAllowed=false`.

The A-role labels below are the repository routing taxonomy. One
owner-authorized integration session sequentially re-ran the role-specific
checks. This record does not claim nine independent humans or agent sessions.

## Constrained runtime-policy proof

The repository repair tool materializes both exact Git baselines and runs the
same canonical runtime observer. It may refresh the Manifest only when:

- the source Manifest differs from the observed source policy only in
  `fsReadAllowlistDigest`;
- the complete observed source and target runtime-policy objects are equal;
- the complete source and target file-read allowlists are equal, including
  source path and hash, callee, byte position, argument shape, normalized
  expression digest, and policy;
- `fsReadAllowlistCount` remains exact; and
- `nextDynamicNonliteralImportCount` and `zeroBaselineCallCount` remain zero.

The protected-path diff from `684b8d8573157a10077f7cab3c65b8da4f80f7e3`
to `06139c8d2b8707af68f62fa2304b428214839d6a` is empty. The target adds only
the committed parent instance-proof justification, nine role-evidence files,
one legacy-registry snapshot, one evidence index, and one Manifest under
`coordination/integration/`. It cannot change the runtime graph or the exact
file-read allowlist observed at the source baseline.

## Role-by-role re-affirmation

| Role | Re-affirmed finding |
| --- | --- |
| A21 | Candidate package files, source identity, and aggregate digest remain unchanged. |
| A18 | Math, curriculum, answer, standards, and localization findings remain unchanged. |
| A23 | The candidate remains shadow-only and non-live; this revision repairs metadata only. |
| A04 | Practice content, grading semantics, accepted answers, and routing remain unchanged. |
| A05 | Lesson content, sequencing, remediation, and routing remain unchanged. |
| A11 | The 401-test parent evidence remains bound to its exact code target; remote PR and post-merge checks remain separate. |
| A22 | Source and target policies and complete file-read allowlists must be equal; loader blind-spot counters must remain zero. |
| A24 | Exact-layer remains `not_applicable`; metadata cannot alter geometry, formulas, coordinates, units, labels, or assets. |
| A25 | Exact Git objects have no protected-path delta and contain no secret, provider value, deployment, or production write. |

## Append-only integrity rule

The refreshed registry and nine evidence files must be committed first. A later
commit may bind only those exact immutable bytes in a new Manifest and evidence
index. Historical revisions remain unchanged.

Acceptance still requires clean validation, two semantic-stable Shadow runs,
exact Receipt verification, the Promotion Gate test suite, and the remote
required check. This revision is not a merge, deployment, production schema
mutation, or production-release approval.
