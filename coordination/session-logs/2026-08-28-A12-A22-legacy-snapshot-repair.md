# A12/A22 production legacy snapshot missing-collection repair

- Session slice: `codex/a12-a22-legacy-snapshot-repair-20260828`
- Baseline: `56b4c1bb644725effe14d58cca0596202a36c7eb`
- Owner: A12 backend/API platform with A22 production reliability
- Explicit cross-lane scope: A10 release tooling/runbook, A11 PostgreSQL
  assertions, A19 value-free environment parity, and A23 append-only evidence
  archive
- Target PR: https://github.com/HUDongpin/MAIS-MVP/pull/207
- Created: 2026-08-28
- Expected closeout: 2026-08-28 after protected-main schema preflight and release

## Production evidence and interpretation

The exact protected-main read-only preflight run `33110288448` reached the real
PostgreSQL provider and failed closed with `reason: app-storage-partial` and
`component: legacy-snapshot-missing-collections`. The deploy job was skipped;
no schema or application mutation ran.

Following the explicitly requested Andrej Karpathy coding guidance, this slice
uses the smallest repair consistent with that evidence. It adds only missing
top-level empty collection containers. It preserves every existing key and
value, refuses malformed state, refuses missing hot-auth or compatibility-
projection collections, and requires the repaired payload to satisfy the full
current snapshot contract before any write is admitted.

The first implementation placed the repair inside `lib/server/userStore.ts`.
Promotion correctly rejected that candidate as runtime-graph drift because it
would move an existing filesystem-read capability in a protected source file.
The final tree supersedes that implementation: `lib/server/userStore.ts` and
its readiness unit test are byte-identical to baseline `56b4c1bb64`. The repair
is now owned only by the serialized production schema script.

## Safety boundary

- Read-only inspection returns the new state only when the additive repair is
  provably complete under the exact validated production seed/storage env.
- The existing marker-only legacy operations remain snapshot-preserving and
  contain no `UPDATE public.app_state`.
- Phase 1 runs only in the serialized protected-main production workflow. It
  takes the storage-contract exclusive advisory lock plus the established
  relation and row locks, re-runs the fixed diagnostic under those locks,
  performs exactly one revision-CAS update, checks the returned payload,
  revision, and state identity, and validates the complete snapshot contract.
- Phase 2 invokes the unchanged, baseline `userStore` legacy-marker operation
  against the exact state returned by phase 1. It installs or upgrades the
  existing readiness contract and independently post-attests exact state.
- A phase-1 failure rolls back the complete update. A phase-2 failure leaves a
  complete, validated legacy snapshot without a readiness marker. That state
  remains fail closed to normal runtime and is recoverable by the existing
  marker-completion operation on the next serialized preflight; it is never
  reported as exact prematurely.
- Any high-risk missing collection, malformed collection, record drift,
  concurrent revision change, trigger rewrite, catalog drift, or postflight
  mismatch fails closed. High-risk keys include user, student profile, auth
  settings/reset state, teacher class/enrollment state, and AI Tutor state.

## Verification

- The pure additive-repair test was observed red before implementation because
  the repair helper did not exist.
- The production-plan and deployment-evidence tests were observed red before
  the new state/operation existed.
- The production-env binding test was observed red before read-only inspection
  ran inside the validated production configuration.
- `npm run type-check`: pass.
- Production schema gate plus PostgreSQL fast-path: `36/36` pass.
- Deployment workflow/evidence plus storage-readiness unit coverage: `50/50`
  pass.
- `npm run test:parent-console`: tooling `76/76`; runtime `403/403`; zero
  skipped and zero failed.
- `npm run test:promotion-gate`: `40/40` pass. The selected c0 manifest also
  validated on clean implementation commit `56bd25e272`; result `pass`, with
  `liveAllowed: false`. A final log-only commit requires the same validation to
  be replayed on its resulting exact SHA before handoff.
- PostgreSQL 16 integration coverage is wired for safe additive repair,
  high-risk rejection, recoverable no-marker postflight, revision increment,
  payload digest preservation, later marker attestation, and repeated-plan
  rejection. Local Docker did not answer the bounded probe, so PR CI remains
  the authoritative real PostgreSQL result.
- PR #207's first PostgreSQL 16 run reached the new repair scenario and exposed
  a test-only fixture assertion: after intentionally dropping the marker table,
  the test queried that absent table to assert a zero row count. The product
  repair completed, but the helper query correctly failed and left the next
  subtest with an unrestored fixture. The amendment queries `pg_catalog` for
  relation absence instead. Type-check passes; the exact-head PostgreSQL rerun
  remains the merge gate.

No production row, secret, cookie, database URL, notification payload, or
guardian identifier is recorded in this handoff.

## Promotion evidence disposition

The append-only `legacy-snapshot-repair-20260828` revision records the rejected
runtime implementation and remains preserved as unselected audit evidence. It
must not be selected by the Promotion workflow. The final script-only tree
retains the already selected
`c0-i18n-content-legacy-byte-review-20260828/promotion-manifest.v2.json` because
the final protected runtime diff is empty: `lib/server/userStore.ts` and
`lib/server/userStore/postgresStorageReadiness.test.ts` match baseline exactly.
The current workflow pointer is unchanged, legacy candidate bytes and runtime
loader policy remain unchanged, and `liveAllowed: false` remains mandatory.

## Final handoff contract

### Files changed relative to baseline

- `RELEASE.md`
- `coordination/session-logs/2026-08-28-A12-A22-legacy-snapshot-repair.md`
- `lib/server/userStoreNovaPostgresIntegration.test.ts`
- `scripts/deploy-vercel-production.mjs`
- `scripts/deploy-vercel-production.test.mjs`
- `scripts/nova-postgres-integration-worker.ts`
- `scripts/postgres-schema-fast-path.test.mjs`
- `scripts/teacher-notice-production-schema-diagnostic.mjs`
- `scripts/teacher-notice-production-schema-gate.mjs`
- `scripts/teacher-notice-production-schema-gate.test.mjs`
- Under the unselected A23 evidence-archive root
  `.../c0-i18n-content-legacy-byte-review-20260828/reaffirmations/legacy-snapshot-repair-20260828/`:
  `promotion-manifest.v2.json`, `inputs/evidence-index.v2.json`,
  `inputs/legacy-resolution-registry.v2.6.json`, and the nine exact role files
  `a04-practice-semantics.v2.6.json`, `a05-lesson-semantics.v2.6.json`,
  `a11-independent-preflight.v2.6.json`, `a18-independent-qa.v2.6.json`,
  `a21-candidate-generation.v2.6.json`, `a22-build-isolation.v2.6.json`,
  `a23-shadow-readiness.v2.6.json`, `a24-exact-layer.v2.6.json`, and
  `a25-release-intake.v2.6.json`.

`lib/server/userStore.ts` and
`lib/server/userStore/postgresStorageReadiness.test.ts` have no net baseline
diff and remain outside the final files-changed set.

### Checks and current boundary

- Current review-amended local checks: type-check pass; schema gate, deploy,
  workflow, and fast-path `54/54`; parent tooling `76/76`; parent runtime
  `403/403`, zero skipped and zero failed. Earlier Promotion tests were `40/40`
  and selected-manifest validation passed with `liveAllowed: false`; both must
  be replayed after the final amendment commit because they bind exact HEAD.
- Real PostgreSQL 16 was not run locally because the bounded Docker probe did
  not answer. PR #207's exact-head `postgres-integration` job is mandatory.
- Production schema preflight, database mutation, deployment, domain smoke,
  provider delivery, monitoring drill, dedicated-family writes, and manual
  assistive-technology acceptance are not performed by this slice.

### Assumptions, risks, blockers, and disposition

- Assumption: only a field whose absence can be converted to an empty container
  with independent schema-evolution evidence is repairable. Version 1 permits
  only `teacher_notice_delivery_attempts`; every other missing array/object is
  rejected. Marker admission requires the closed set of every array in the
  current complete snapshot plus `nova_lens_policy` before preflight or marker
  completion can succeed.
- Risk: phase 1 is an additive database mutation and revision increment that an
  alias rollback cannot undo. A phase-2 failure deliberately leaves a complete
  no-marker state for a newly confirmed serialized recovery run. One
  session-level storage-contract advisory lock now spans both phases and the
  closed-set collection recheck, preventing cooperating runtime writers from
  entering the inter-phase boundary.
- Review findings closed in this amendment: caller-supplied environment objects
  cannot authorize the mutator; high-risk-only loss is rejected before marker
  completion; every current snapshot array is covered by the closed-set marker
  predicate; all nine high-risk keys are covered in pure and PostgreSQL
  matrices; non-allowlisted data/audit/policy collections are rejected; and two
  real repair workers queue behind one session advisory barrier so exactly one
  revision-CAS repair can succeed.
- Merge blockers: no unresolved Critical/Important review issue; exact-head
  PostgreSQL integration, CI validate/build, parent E2E, and Promotion Shadow
  must all pass.
- Dirty-state final action: reviewed commits plus an A23 evidence archive for
  the rejected runtime attempt; no discard, cleanup, or history rewrite.
- Worktree lifecycle: retain clean with PR #207 open; remove only after merge
  and after proving no uncommitted or untracked work needs preservation.
