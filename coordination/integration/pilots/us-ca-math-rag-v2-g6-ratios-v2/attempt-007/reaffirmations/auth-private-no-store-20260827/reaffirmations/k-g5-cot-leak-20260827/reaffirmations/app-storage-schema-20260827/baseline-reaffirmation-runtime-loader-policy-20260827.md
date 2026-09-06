# Attempt 007 append-only baseline re-affirmation — merged runtime loader policy digest

- Pilot: `us-ca-math-rag-v2-g6-ratios-v2` / `attempt-007`
- Source re-affirmed baseline: `46c67e56e61193697054c71387121db6a8def69d`
- Re-affirmed target baseline: `ba4bad6fdb2da2d3fc0b68e73529a382d87ca7c3`
- Source Manifest: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/promotion-manifest.v2.json`
- Revision root: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827`
- Prepared: 2026-08-27 (Asia/Hong_Kong)
- Live boundary: `liveAllowed=false`

## Evidence boundary

This record repairs one stale runtime-loader policy digest inherited by the
merged app-storage revision from the K–G5 source Manifest. It is append-only: it
does not edit or replace the K–G5 revision, the merged app-storage Manifest,
their evidence, registries, or any finalized attempt artifact. It does not
promote candidate content, modify candidate bytes, remove the localization hold,
authorize a production write, execute a deployment, or change
`liveAllowed=false`.

The A-role labels below are the repository routing taxonomy. One owner-authorized
integration session sequentially re-ran the role-specific checks. This record
does not claim that nine separate humans or nine independent agent sessions
performed the re-affirmation.

## Exact runtime-policy review

The source app-storage Manifest correctly binds its baseline to
`46c67e56e61193697054c71387121db6a8def69d`, but it intentionally retained the
K–G5 source `fsReadAllowlistDigest` pending a separate constrained review. The
canonical runtime observer therefore reports `V2_RUNTIME_GRAPH_DRIFT`; every
other baseline and evidence binding passes.

The constrained repair tool materializes the exact source baseline from Git and
compares it with the clean target worktree using the same canonical parser and
runtime observer. It permits a refresh only when all of the following are true:

- the source Manifest differs from the observed source baseline only in
  `fsReadAllowlistDigest`;
- the complete observed source and target runtime-policy objects are equal;
- the complete source and target file-read allowlists are equal, including
  source path, source hash, callee, position, argument shape, normalized
  expression digest, and policy;
- `fsReadAllowlistCount` remains exact;
- `nextDynamicNonliteralImportCount` and `zeroBaselineCallCount` remain zero.

For this target, the protected-path diff from the merged source baseline is
empty. A separate exact projection comparison between the K–G5 source target
`de31ec494bea1679d1889cace0ef1ad701e31b82` and the merged app-storage target
confirms:

- five file-read allowlist entries before and after;
- identical source paths, callees, argument shapes, normalized expressions, and
  policies for all five entries;
- only the `lib/server/userStore.ts` entry changes source hash and byte position,
  because reviewed schema code was inserted before its unchanged legacy JSON
  read;
- every runtime-policy field other than `fsReadAllowlistDigest` is unchanged.

The target adds only the already-committed app-storage re-affirmation
justification. It changes no file under `app/`, `components/`, `data/`, `lib/`,
or `public/`, and does not change `middleware.ts`, `next.config.ts`, or
`tsconfig.json` relative to the merged source baseline.

## Role-by-role re-affirmation

| Role | Re-affirmed finding |
| --- | --- |
| A21 | Candidate generation evidence remains valid because all candidate package files, their source commit, and aggregate digest are unchanged. |
| A18 | Independent math and curriculum QA remain valid: ordered-ratio semantics, numeric oracle `12`, accepted answers, standards mapping, K–G5 repair, and localization hold are untouched. |
| A23 | Shadow readiness remains candidate-only and non-live; this revision repairs only an observed metadata digest and creates no live content path. |
| A04 | Practice semantics remain exact because practice bytes, grading code, accepted-answer policy, and practice registration are unchanged. |
| A05 | Lesson semantics remain exact because lesson bytes, instructional spine, remediation targets, and lesson routing are unchanged. |
| A11 | Both parent histories retain their recorded green evidence; the combined branch remains pending a fresh remote run and this metadata repair makes no product assertion by itself. |
| A22 | The source and target canonical runtime-policy objects and complete file-read allowlists are equal; loader blind-spot counters remain zero and there is no protected runtime delta after the merged target. |
| A24 | Exact-layer remains `not_applicable`; a metadata digest repair cannot alter geometry, formula, coordinate, unit, or label fields. |
| A25 | Source and target were compared from exact Git objects in a clean worktree; both parent histories remain reachable and the revision contains no secret, provider value, database mutation, deployment, or production write. |

## Append-only integrity rule

The refreshed legacy-registry snapshot and nine revision evidence artifacts must
be committed first. Only after that immutable evidence commit exists may a new
revision Manifest and evidence index bind their exact reviewed commit, raw
SHA-256, semantic digest, and constrained runtime-policy proof. The K–G5 and
merged app-storage revisions remain unchanged.

After both phases, acceptance requires clean Manifest validation, two distinct
semantic-stable Shadow runs, exact Receipt verification, the full Promotion Gate
test suite, and the remote `promotion-shadow-gate` required check on the combined
head. Until those gates pass, this revision is not a merge, deployment, or
production-release approval.
