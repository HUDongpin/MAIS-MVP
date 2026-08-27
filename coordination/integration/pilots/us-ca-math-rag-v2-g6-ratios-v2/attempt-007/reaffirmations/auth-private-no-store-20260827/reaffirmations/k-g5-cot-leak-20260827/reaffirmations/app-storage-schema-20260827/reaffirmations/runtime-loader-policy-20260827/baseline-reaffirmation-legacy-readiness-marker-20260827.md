# Attempt 007 append-only baseline re-affirmation — legacy readiness marker completion

- Pilot: `us-ca-math-rag-v2-g6-ratios-v2` / `attempt-007`
- Source re-affirmed baseline: `ba4bad6fdb2da2d3fc0b68e73529a382d87ca7c3`
- Re-affirmed target baseline: `6beae84637642bfb9143f7dd9c102014a158cfb2`
- Source Manifest: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/promotion-manifest.v2.json`
- Revision root: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827`
- Prepared: 2026-08-27 (Asia/Hong_Kong)
- Live boundary: `liveAllowed=false`

## Evidence boundary

This append-only record re-affirms the selected candidate-only Promotion
evidence against the reviewed production app-storage legacy-marker completion
commit. It does not edit or replace any historical Manifest, evidence file,
registry, Receipt, closure, or lifecycle record. It does not promote candidate
content, modify candidate bytes, remove the localization hold, authorize a
production write, execute a deployment, or change `liveAllowed=false`.

The A-role labels below are the repository routing taxonomy. One
owner-authorized integration session sequentially re-ran the role-specific
checks. This record does not claim that nine separate humans or nine independent
agent sessions performed the re-affirmation.

## Exact protected-path delta and database safety

Between the selected source baseline and target `6beae84637642bfb9143f7dd9c102014a158cfb2`,
the relevant protected runtime delta is confined to
`lib/server/userStore.ts`. Protected test changes cover the PostgreSQL readiness
contract and real PostgreSQL 16 integration. Deployment-plan and evidence-parser
changes remain under `scripts/` and are outside the Promotion protected-path
set. No candidate content, curriculum, grading, lesson, visualization, public
asset, middleware, Next configuration, or shared TypeScript configuration is
changed.

The runtime change adds one fail-closed state for an exact legacy app-storage
catalog missing only `app_state_readiness_markers`. Before any DDL, the same
transaction obtains the exclusive storage advisory lock and table locks, then
re-attests all eight existing relations, required columns and primary keys,
hot-auth v4, the exact compatibility trigger and function, one canonical
complete snapshot, and absence of orphan readiness artifacts. The migration
creates only the marker table, invalidation function, invalidation trigger, and
one current marker row. Any additional partial state, repeated execution,
catalog drift, or failed post-attestation rolls back the whole transaction.

A read-only production inspection observed the exact allowlisted legacy shape:
eight of nine canonical relations, one canonical snapshot identity, one
compatibility trigger, hot-auth v4 present, no orphan invalidation function, and
only the marker table absent. The inspection returned no snapshot content and
performed no database mutation. This observation is a preflight boundary, not
production apply or live proof.

## Verification bound to the target

- `npm run type-check`: pass.
- Focused production schema, deploy-evidence, and fast-path tests: `42/42`.
- `npm run test:postgres-readiness`: `56/56`.
- `npm run test:parent-console`: `400/400`.
- `npm run test:teacher-notice-outbox`: `107/107`.
- Real isolated PostgreSQL 16 integration: `10/10`; the legacy completion kept
  the snapshot payload digest, revision, and `updated_at` byte-for-byte
  semantically unchanged, rejected a repeat, and left no marker artifacts after
  injected RLS drift.
- `npm run test:release-governance`: `91` pass, `11` explicit skips, `0` fail.
- Fresh production build: pass with BUILD_ID `ThLM8_jI0pHaE85ZbIumb`; tracked
  `next-env.d.ts` remained unchanged.

These are local exact-commit results. PR CI, Promotion Shadow, merge, post-merge
main, deployment, production schema apply, and live-domain behavior remain
separate gates.

## Role-by-role re-affirmation

| Role | Re-affirmed finding |
| --- | --- |
| A21 | Candidate generation evidence remains valid because all candidate package files, source identity, and aggregate candidate digest are unchanged. |
| A18 | Independent math and curriculum QA remain valid; the storage migration does not alter questions, answers, standards mapping, lessons, or the existing localization hold. |
| A23 | Shadow readiness remains candidate-only and non-live; the new operation is a protected workflow schema gate and creates no candidate-content live registration. |
| A04 | Practice semantics remain exact because practice bytes, grading behavior, accepted-answer policy, and practice routing are unchanged. |
| A05 | Lesson semantics remain exact because lesson bytes, instructional sequence, remediation targets, and lesson routing are unchanged. |
| A11 | The focused, parent, readiness, outbox, release-governance, build, and real PostgreSQL tests passed locally on the target; remote PR and post-merge evidence remain pending and are not pre-claimed. |
| A22 | The migration is additive, transactionally locked, exact-state gated, post-attested, rollback-tested, and built from a clean isolated worktree without `next-env.d.ts` pollution. |
| A24 | Exact-layer remains `not_applicable`; the migration cannot alter geometry, formulas, coordinates, units, labels, or illustration assets. |
| A25 | The target and source were compared from exact Git objects; the slice contains the reviewed runtime/test/scripts delta only and no secret, provider value, production row, deployment, or production write. |

## Append-only integrity rule

The re-affirmed legacy-registry snapshot and nine revision evidence artifacts
must be committed first. Only after that immutable evidence commit exists may a
new Manifest and evidence index bind their exact reviewed commit, raw SHA-256,
semantic digest, and currentness. If the runtime loader digest changes because
the reviewed `userStore.ts` source hash moved, it must be repaired through a
separate constrained nested append-only revision.

Acceptance requires clean Manifest validation, two distinct semantic-stable
Shadow runs, exact Receipt verification, the full Promotion Gate test suite,
and the remote required check. Until those gates pass, this re-affirmation is
not a merge, deployment, schema mutation, or production-release approval.
