# Attempt 007 append-only baseline re-affirmation — production app storage schema

- Pilot: `us-ca-math-rag-v2-g6-ratios-v2` / `attempt-007`
- Source re-affirmed baseline: `9ab6c8cc9c88982eb8e94c293b25ad1f9eac9c4b`
- Re-affirmed target baseline: `c52e69679d99c64b64e0e336ad9f4bb5b49d2897`
- Source Manifest: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/promotion-manifest.v2.json`
- Revision root: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/app-storage-schema-20260827`
- Prepared: 2026-08-27 (Asia/Hong_Kong)
- Live boundary: `liveAllowed=false`

## Evidence boundary

This record re-affirms the existing candidate-only findings against one reviewed
production app-storage schema change. It does not overwrite the finalized
attempt-007 artifacts or the preceding authentication-cache re-affirmation. It
does not promote candidate content, modify candidate bytes, remove the
localization hold, authorize a production write, execute a deployment, or change
`liveAllowed=false`.

The A-role labels below are the repository routing taxonomy. One owner-authorized
integration session sequentially re-ran the role-specific checks. This record
does not claim that nine separate humans or nine independent agent sessions
performed the re-affirmation.

## Exact protected-path delta

Between the source re-affirmed baseline and the new target, the complete
protected-path diff is:

- runtime: `lib/server/userStore.ts`;
- test-only: `lib/server/userStoreAuthAdminStoragePersistence.test.ts`;
- zero changes under `app/`, `components/`, `data/`, or `public/`;
- zero changes to `middleware.ts`, `next.config.ts`, or `tsconfig.json`.

The runtime edit exposes read-only production-schema inspection and a guarded
schema-install entry point while reusing the canonical app-state bootstrap. The
guarded installer is restricted to the protected `main` production-deploy
workflow-dispatch context, serializes the empty-state check and DDL on one
connection, rechecks after its advisory lock, and requires an exact postflight
contract. It does not add any curriculum, grading, question, lesson,
visualization, candidate-content, or content-registration dependency.

The candidate package remains byte-identical to its immutable source commit
`faf57280778c4b6543d15ce675638ac480b42864`. Its aggregate candidate digest
remains `c83c47392c79256ee47726dafe3c53b72e5e7454edcb313a421eb3b32066cbf6`.
Neither candidate records nor their adapter, answer matching, practice store,
lesson, or visualization paths reference the changed storage bootstrap.

## Role-by-role re-affirmation

| Role | Re-affirmed finding |
| --- | --- |
| A21 | Candidate generation evidence remains valid because all four candidate package files and their aggregate digest are unchanged. |
| A18 | Independent math and curriculum QA remain valid: the ordered ratio, numeric oracle `12`, accepted answers, standards mapping, and localization hold are untouched. |
| A23 | Shadow readiness remains candidate-only and non-live; the new code installs general application persistence schema and creates no candidate-content live registration. |
| A04 | Practice semantics remain exact because practice bytes, grading code, accepted-answer policy, and practice registration are unchanged. |
| A05 | Lesson semantics remain exact because lesson bytes, instructional spine, remediation targets, and lesson routing are unchanged. |
| A11 | Parent governance and preflight tests passed `76/76`; the parent runtime suite passed `400/400`; exact-head CI run `33035921666` passed every required job, including the full teacher-parent E2E matrix. |
| A22 | Type-check, release governance (`91 pass / 11 explicit skip / 0 fail`), exact-source deployment tests (`161/161`), an isolated production build, Postgres readiness, and the real PostgreSQL 16 integration job passed for the target. |
| A24 | Exact-layer remains `not_applicable`; app-storage schema installation cannot alter candidate geometry, formula, coordinate, unit, or label fields. |
| A25 | The target has one runtime and one test-only protected-path change, the worktree was clean at target commit, historical source artifacts remain immutable, and this re-affirmation contains no secret, provider value, database mutation, deployment, or production write. |

## Append-only integrity rule

The re-affirmed legacy-registry snapshot and nine revision evidence artifacts
must be committed first. Only after that immutable evidence commit exists may a
new revision Manifest and evidence index bind its exact `reviewedCommit`, raw
SHA-256, recomputed semantic digest, and currentness. Historical commit fields
in the source evidence and legacy resolution records must not be rewritten.

After both phases, acceptance requires clean Manifest validation, two distinct
semantic-stable Shadow runs, exact Receipt verification, the full Promotion Gate
test suite, and the remote `promotion-shadow-gate` required check. Until those
gates pass, this re-affirmation is not a merge, deployment, or production-release
approval.
