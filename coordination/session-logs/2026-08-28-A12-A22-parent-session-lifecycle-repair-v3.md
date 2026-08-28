# A12/A22 parent session-lifecycle repair v3

## Session identity

- Owner lanes: A12 backend/API platform and A22 production reliability.
- Branch: `codex/a12-a22-session-lifecycle-repair-v3-20260828`.
- Worktree:
  `/Volumes/Starship/MAIS-MVP/.worktrees/a12-a22-session-lifecycle-repair-v3-20260828`.
- Baseline: protected `main` commit
  `4b27f605388f841b10560740279a97a5cf3ff873`, tree
  `2aae9334f5cccf65d2c13deb6a908e291790ef3c`.
- Target PR: pending.
- Created: 2026-08-28.
- Expected closeout: 2026-08-28 after merge, post-merge gates,
  protected preflight, confirmed repair/deploy, and live login acceptance.

## Admitted production evidence

Protected-main production diagnostic run `33152020058` was read-only and
reported only allowlisted fields. It proved this exact virtual repair closes
the canonical snapshot contract:

- legacy field: `guardian_links.invite_code`;
- absent lifecycle fields: `users.session_revision` and
  `users.disabled_at`;
- canonical absent-field defaults: `1` and `null`;
- `virtualRepairComplete=true` and `residualUncertainty=false`;
- `mutation=false`; schema preflight, deploy, and every other diagnostic job
  were skipped.

No production mutation or deployment was admitted by that run.

## Exact repair contract

- Add only the independently proven empty `guardian_invitations` collection.
- Remove only the proven deprecated `guardian_links.invite_code` property.
- Require the exact production legacy-field fingerprint; any additional
  deprecated parent field rejects the v3 operation.
- Validate and preserve every present `session_revision` and `disabled_at`
  value. Fill only absent properties with canonical defaults
  `session_revision=1` and `disabled_at=null`.
- Require the repaired in-memory payload to satisfy the canonical snapshot
  contract. Any additional collection or record drift rejects the operation.
- Bind the operation name
  `app-storage-repair-parent-session-lifecycle-v3` without changing v1 or v2
  behavior.
- Reuse the reviewed exclusive advisory lock, table locks, single-row identity,
  revision CAS, `revision + 1`, exact returned-payload checks, canonical
  postflight, and transaction rollback boundary.
- Keep application runtime code, login routes, and provider behavior
  unchanged.

## Verification

- TDD red phase: focused schema gate had 36 passed and 3 expected failures;
  v3 builder, plan state, and apply operation were not yet implemented.
- Focused schema gate: 39 passed, 0 failed.
- Combined focused schema/workflow gate: 50 passed, 0 failed.
- `npm run type-check`: pass.
- Fresh isolated Homebrew PostgreSQL 16.15 on the Starship volume: 14 passed,
  0 failed. The dedicated v3 case proved exact payload preservation, wrong
  version rejection, zero-write rollback on residual drift, one-success-only
  concurrency, revision increment by exactly one, repeat rejection, and
  readiness completion. The temporary server stopped and port 55440 closed.
- Formal Postgres readiness runner: manifest contract 1 passed, then runtime
  readiness 57 passed; 0 failed and 0 skipped.
- Release governance: 91 passed, 11 explicit skips, 0 failed.
- Parent/CI distribution gates: 15 passed, 0 failed.
- `npm run test:parent-console`: tooling 76/76 and explicit runtime manifest
  403/403 passed, with 0 skipped and 0 failed.
- `node --check scripts/teacher-notice-production-schema-gate.mjs`: pass.
- `git diff --check`: pass.
- `git diff 4b27f605388f841b10560740279a97a5cf3ff873 --
  lib/server/userStore.ts`: empty; application runtime bytes remain unchanged.
- Independent pre-commit code review: no actionable findings. The reviewer
  confirmed fail-closed v2-to-v3 selection, the exact production fingerprint,
  present-value preservation, canonical completeness, lock/CAS/rollback and
  concurrent/repeat behavior, preflight/apply ordering, parameter binding,
  redacted output, and zero application-runtime/workflow diff. Reviewed diff
  hash:
  `33a1345dbf8617d42e3514cd24b8707814ebf8152c9e6678a7b799200f5ec45c`.

Production preflight, mutation, deployment, and live-login claims remain
closed.
