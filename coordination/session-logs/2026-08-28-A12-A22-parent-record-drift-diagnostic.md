# A12/A22 parent record-drift diagnostic

## Session identity

- Owner lanes: A12 backend/API platform and A22 production reliability.
- Branch: `codex/a12-a22-parent-record-drift-diagnostic-20260828`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a12-a22-parent-record-drift-diagnostic-20260828`.
- Baseline: protected `main` commit
  `ec89fe62dd528106044f338e731596275bb867bc`.
- Target PR: pending.
- Created: 2026-08-28.
- Expected closeout: 2026-08-28 after merge, post-merge gates, and one
  protected-main read-only diagnostic.

## Evidence and scope

The first protected-main parent-access record diagnostic completed read-only
and reported one allowlisted legacy field path, while the in-memory virtual
repair still failed the canonical current snapshot contract. That result
prohibits the previously considered repair and every deploy path.

This slice adds only a second, separately named read-only diagnostic. It emits
fixed record-drift reason codes after the same in-memory parent-access virtual
repair. It does not add a mutation, confirmation, schema operation, deployment,
record value, identifier, count, URL, payload, or credential output.

## Design

- Keep the existing record-contract diagnostic unchanged.
- Add a fixed reason-code allowlist inside the release-only production schema
  gate while consuming the existing canonical snapshot-contract export.
- Reuse exported record validators plus canonical completeness. Known codes are
  candidate indicators only; whenever completeness remains false,
  `unclassified` is also emitted to preserve unmapped/parity uncertainty.
- Require reason-code uniqueness and canonical ordering.
- Require `virtualRepairComplete` to be exactly equivalent to an empty reason
  list.
- Query the one canonical snapshot in `REPEATABLE READ, READ ONLY` under the
  shared storage-contract advisory lock.
- Add a distinct protected-main workflow mode named
  `parent-access-record-drift-diagnostic`; its read-only command is the final
  job step and cannot emit a confirmation.

## Verification

- Red phase: focused schema-gate import failed because the new builder did not
  exist.
- Focused schema gate: 36 passed, 0 failed.
- Workflow contract: 10 passed, 0 failed.
- `npm run type-check`: pass.
- `git diff ec89fe62dd528106044f338e731596275bb867bc --
  lib/server/userStore.ts`: empty; application runtime bytes are unchanged.
- Fresh isolated PostgreSQL 16.15: 13 passed, 0 failed. The new worker probe
  returned only fixed reason codes and preserved payload digest, revision, and
  timestamp. One earlier rerun was rejected as infrastructure evidence after
  PostgreSQL `53100` and tsx `ENOSPC` proved the system disk was full. Three
  exact, stopped, disposable `mais-pg16.*` directories were permanently
  removed; the final fresh run passed 13/13 and its instance/directory were
  stopped and removed.
- Postgres readiness/fast-path contracts: 11 passed, 0 failed.
- Release governance: 91 passed, 11 explicit skips, 0 failed.
- Parent/CI distribution gates: 15 passed, 0 failed.
- `npm run test:parent-console`: harness 76/76 and explicit runtime manifest
  403/403 passed, 0 skipped, 0 failed.
- `node --check scripts/teacher-notice-production-schema-gate.mjs`: pass.
- `git diff --check`: pass.

Production mutation and deployment remain closed.

## Promotion runtime-boundary correction

The first PR head correctly failed Promotion with
`V2_TARGET_BASELINE_DRIFT`: the diagnostic-only classifier had been exported
from `lib/server/userStore.ts`, creating one unnecessary application-runtime
path change. All receipt/replay/artifact checks passed, so rerunning would not
have changed the outcome.

The classifier and its fixed reason-code allowlist were moved into
`scripts/teacher-notice-production-schema-gate.mjs`. The application runtime
file now has zero diff from baseline commit
`ec89fe62dd528106044f338e731596275bb867bc`. No new Promotion reaffirmation is
needed for release-tooling-only diagnosis.
