# A12/A22 parent session-lifecycle diagnostic

## Session identity

- Owner lanes: A12 backend/API platform and A22 production reliability.
- Branch: `codex/a12-a22-parent-session-lifecycle-diagnostic-20260828`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a12-a22-parent-session-lifecycle-diagnostic-20260828`.
- Baseline: protected `main` commit
  `c3546b53ceb53ec66953cce4b823fa78050e8565`.
- Target PR: pending.
- Created: 2026-08-28.
- Expected closeout: 2026-08-28 after merge, post-merge gates, and one
  protected-main read-only diagnostic.

## Evidence and scope

Protected-main production diagnostic run `33147181819` reported only safe
fields and remained read-only. After the already proven in-memory guardian
repair it identified `users-session-lifecycle` plus conservative
`unclassified`, while the canonical snapshot contract remained incomplete.
That result prohibits production mutation.

This slice adds one separately named read-only virtual probe. It does not add a
schema operation, confirmation, mutation, deployment, record value, ID, count,
URL, payload, or credential output.

## Exact contract

- Reuse the existing guardian virtual repair: add the absent independent
  `guardian_invitations` array and remove only the two deprecated parent-access
  fields in memory.
- Inspect only own-property presence for `user.session_revision` and
  `user.disabled_at`.
- Preserve every present value. Validate present values with canonical
  `authSessionRevision` and `authDisabledAt`; malformed values fail closed.
- For absent properties only, apply the canonical in-memory defaults:
  `session_revision = 1` and `disabled_at = null`.
- Emit only ordered allowlisted `missingFields`, two default-applied booleans,
  `legacyFields`, canonical `virtualRepairComplete`, and explicit
  `residualUncertainty`.
- Query the one canonical snapshot under the shared advisory lock in a
  `REPEATABLE READ, READ ONLY` transaction.
- Add a distinct protected-main workflow mode named
  `parent-access-session-lifecycle-diagnostic`; the diagnostic is the final
  step and cannot emit a confirmation.
- Keep `lib/server/userStore.ts` application runtime bytes unchanged.

## Verification

- Red phase: focused import failed because the new diagnostic builder did not
  exist; the first implementation then failed because a canonical validation
  error was not yet redacted to the fixed diagnostic boundary.
- Focused schema gate: 39 passed, 0 failed.
- Workflow contract: 11 passed, 0 failed.
- Combined focused schema/workflow gate: 50 passed, 0 failed.
- `npm run type-check`: pass.
- Fresh isolated Homebrew PostgreSQL 16.15 on the Starship volume: 13
  passed, 0 failed. The new session-lifecycle diagnostic preserved the
  snapshot payload digest, revision, and `updated_at` timestamp. The temporary
  server stopped and port 55440 closed after the run.
- An earlier disposable `/tmp` attempt is rejected as test evidence: the
  internal disk had only 136 MiB free and PostgreSQL WAL reported `ENOSPC`.
  The successful Starship-volume run above used a new cluster and is the valid
  PG16 result.
- Postgres fast-path/readiness contract tests: 11 passed, 0 failed.
- Formal Postgres readiness runner: manifest contract 1 passed, then runtime
  readiness 57 passed; 0 failed and 0 skipped.
- Release governance: 91 passed, 11 explicit skips, 0 failed.
- Parent/CI distribution gates: 15 passed, 0 failed.
- `npm run test:parent-console`: tooling 76/76 and explicit runtime manifest
  403/403 passed, with 0 skipped and 0 failed.
- `node --check scripts/teacher-notice-production-schema-gate.mjs`: pass.
- `git diff --check`: pass.
- `git diff c3546b53ceb53ec66953cce4b823fa78050e8565 --
  lib/server/userStore.ts`: empty; application runtime bytes remain unchanged.

Production mutation and deployment remain closed.
