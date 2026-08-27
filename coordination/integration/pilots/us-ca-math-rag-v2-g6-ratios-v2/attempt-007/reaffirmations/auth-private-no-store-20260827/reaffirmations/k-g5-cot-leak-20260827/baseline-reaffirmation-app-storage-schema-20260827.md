# Attempt 007 append-only baseline re-affirmation — app storage after K–G5 content repair

- Pilot: `us-ca-math-rag-v2-g6-ratios-v2` / `attempt-007`
- Source re-affirmed baseline: `de31ec494bea1679d1889cace0ef1ad701e31b82`
- Re-affirmed target baseline: `46c67e56e61193697054c71387121db6a8def69d`
- Source Manifest: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/promotion-manifest.v2.json`
- Revision root: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827`
- Prepared: 2026-08-27 (Asia/Hong_Kong)
- Live boundary: `liveAllowed=false`

## Evidence boundary

This record re-affirms the latest K–G5 content-repair candidate-only findings
against the reviewed production app-storage schema change after a normal merge
of current `main`. It does not overwrite the K–G5 revision, any earlier storage
revision, the finalized attempt-007 artifacts, or their canonical Receipts. It
does not promote candidate content, modify candidate bytes, remove the
localization hold, authorize a production write, execute a deployment, or change
`liveAllowed=false`.

The A-role labels below are the repository routing taxonomy. One owner-authorized
integration session sequentially re-ran the role-specific checks. This record
does not claim that nine separate humans or nine independent agent sessions
performed the re-affirmation.

## Exact integration and protected-path delta

Remote `main` advanced from `f001a9570f2a0ef066b1a83a33619f72215ff354`
to `0ff0cb0d76dd6e8192e1f3ca54b4a4238569c69e` while the app-storage PR CI was
running. The new main commit carried the reviewed K–G5 chain-of-thought content
repair and its own append-only Promotion re-affirmation. The app-storage branch
merged that exact main normally. The only textual merge conflicts were the
Promotion workflow pointer and its static contract test; both selected the
newer main K–G5 Manifest until this combined revision is finalized. The static
workflow contract passed `3/3` after resolution.

Between the K–G5 source baseline and the merged target, the complete protected
path diff is:

- runtime: `lib/server/userStore.ts`;
- test-only: `lib/server/userStoreAuthAdminStoragePersistence.test.ts`;
- zero additional changes under `app/`, `components/`, `data/`, or `public/`;
- zero changes to `middleware.ts`, `next.config.ts`, or `tsconfig.json`.

The runtime edit exposes read-only production-schema inspection and a guarded
schema-install entry point while reusing the canonical app-state bootstrap. The
guarded installer is restricted to the protected `main` production-deploy
workflow-dispatch context, serializes the empty-state check and DDL on one
connection, rechecks after its advisory lock, and requires an exact postflight
contract. It adds no curriculum, grading, question, lesson, visualization,
candidate-content, or content-registration dependency.

The candidate package remains byte-identical to its immutable source commit
`faf57280778c4b6543d15ce675638ac480b42864`. Its aggregate candidate digest
remains `c83c47392c79256ee47726dafe3c53b72e5e7454edcb313a421eb3b32066cbf6`.
The K–G5 repair is already part of the source baseline; this target adds no
further generated-content delta.

## Role-by-role re-affirmation

| Role | Re-affirmed finding |
| --- | --- |
| A21 | Candidate generation evidence remains valid because all four candidate package files and their aggregate digest are unchanged; the source K–G5 repair remains intact. |
| A18 | Independent math and curriculum QA remain valid: ordered-ratio semantics, numeric oracle `12`, accepted answers, standards mapping, K–G5 repair, and localization hold are untouched. |
| A23 | Shadow readiness remains candidate-only and non-live; the target combines two reviewed histories and creates no candidate-content live registration. |
| A04 | Practice semantics remain exact because practice bytes, grading code, accepted-answer policy, and practice registration are unchanged after the K–G5 source baseline. |
| A05 | Lesson semantics remain exact because lesson bytes, instructional spine, remediation targets, and lesson routing are unchanged. |
| A11 | The app-storage head independently passed CI run `33038421238`, including all teacher/parent E2E and validate jobs; Promotion run `33038421244` passed. The combined merge awaits a fresh remote run and is not treated as proved yet. |
| A22 | Type-check, real PostgreSQL 16 integration, exact-source deployment tests, production build, and parent isolated build passed on the app-storage head; the merge worktree is clean and the combined SHA remains pending remote proof. |
| A24 | Exact-layer remains `not_applicable`; app-storage schema installation cannot alter candidate geometry, formula, coordinate, unit, or label fields. |
| A25 | The merged target has one runtime and one test-only protected-path delta beyond the source baseline, both parent histories remain reachable, and this re-affirmation contains no secret, provider value, database mutation, deployment, or production write. |

## Append-only integrity rule

The re-affirmed legacy-registry snapshot and nine revision evidence artifacts
must be committed first. Only after that immutable evidence commit exists may a
new revision Manifest and evidence index bind their exact reviewed commit, raw
SHA-256, semantic digest, and currentness. Historical artifacts and both parent
re-affirmation chains must remain unchanged.

After both phases, acceptance requires any loader-policy digest drift to be
repaired through a separate constrained append-only revision, followed by clean
Manifest validation, two distinct semantic-stable Shadow runs, exact Receipt
verification, the full Promotion Gate test suite, and the remote required check.
Until all of those gates pass, this re-affirmation is not a merge, deployment,
or production-release approval.
