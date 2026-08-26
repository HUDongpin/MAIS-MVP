# A22 Guardian Exit Race Fix

- Date: 2026-08-26
- Agent ID: A22, with narrow A11 ownership for the isolated-app regression
- Owner: Codex parent-console production acceptance session
- Branch: `codex/a22-guardian-exit-race-fix-20260826`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a22-guardian-exit-race-fix-20260826`
- Baseline: exact `origin/main` commit `042e6e8f01b0954170964917e067e809ddb10caa`
- Target PR: pending at session creation; open against `main` before handoff
- Creation date: 2026-08-26
- Expected closeout date: 2026-08-26 after review and merge; do not remove while the PR is open

## Objective and scope

Diagnose the final-main `validate` failure in the guardian-crash SQLite lease regression and make the smallest deterministic fix without weakening its fail-closed cleanup boundary. Writes are restricted to the isolated-app runtime helpers, guardian, focused regression, and this session log. The shared root and other A22/A13 worktrees are read-only.

## Root cause

The existing process-group liveness probes treated `kill(-pgid, 0)` success or `EPERM` as proof that executable work remained. A real POSIX zombie-only fixture demonstrated that the same probe can report `EPERM` while `ps` reports the group's only member as `Z`. Under Linux runner reaping delays, the orphaned supervisor can therefore make the bounded exit wait time out even though no process can execute or retain runtime resources.

## Change

- Use one shared process-group liveness helper in the worker, guardian, and tests.
- On Linux, keep the fast fail-closed path for a live group leader; when the leader is gone or zombie, inspect all group members.
- Treat a group as exited only when every verifiable member is zombie/dead.
- Keep unreadable, missing, or malformed membership inspection fail-closed.
- Strengthen the existing guardian-crash regression with a real unreaped zombie-only group fixture; no skips, ignored errors, or unbounded waits were added.

## Verification evidence

- RED: zombie-only regression failed against the original liveness helper with `true !== false`.
- GREEN: focused guardian-crash regression passed 50 consecutive runs after the fix.
- Full `tests/e2e/isolated-app-preflight.test.ts`: 33 passed, 0 failed, 0 skipped.
- `npm run type-check`: passed.
- Full `npm run test:parent-console`: to be run after the reviewable PR is opened if time permits; GitHub CI remains authoritative for Linux.

## Handoff

- Dirty-state final action: reviewed commit planned from the exact paths listed above.
- Worktree lifecycle action: retain clean with an open PR; do not merge from this session.
- Residual boundary: local evidence is macOS plus a real POSIX zombie fixture. The PR's Linux CI must pass before integration.
