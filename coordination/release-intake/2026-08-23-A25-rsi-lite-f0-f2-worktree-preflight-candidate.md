# A25 worktree preflight candidate: RSI-lite F2-R

- Protocol: `MAIS-RSI-LITE-CAL-V1` `1.1.1-f2-r`
- Current status: `STALE AFTER F2-R PATH CHANGES; REQUIRES FRESH INDEPENDENT A25 REVIEW`
- A25 decision: `NOT YET PROVIDED`
- F3 implication: `BLOCKED`

## Session slice

- Owner/lane: A16, with owner-approved F2-R remediation scope.
- Branch: `codex/a16-rsi-lite-calibration-f0-f2-20260823`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a16-rsi-lite-calibration-f0-f2-20260823`.
- Baseline/live main at creation: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- Target PR: `pending`.
- Creation date: 2026-08-23 Asia/Hong_Kong.
- Expected closeout: 2026-08-24 Asia/Hong_Kong or earlier evidence handoff.
- Commit/push/PR authorization: absent.
- Formal 48-run, live-provider, production, and deployment authorization: absent.
- Git commit and push authorization: absent and separately controlled.

## Intended path slice

- `coordination/research/2026-08-23-A16-rsi-lite-matched-quadruplets-f0-f2-protocol.md`
- `coordination/research/2026-08-23-A16-rsi-lite-f0-f2-status-and-handoff.md`
- `coordination/content-qa/rsi-lite-calibration-v1/`
- `coordination/session-logs/2026-08-23-A16-rsi-lite-calibration-f0-f2.md`
- this candidate preflight file.
- ignored local-only `.local/rsi-lite-calibration-v1/` sealed evidence and external OS-temporary sacrificial attempts.

No app, component, lib, data, API, shared config, package, environment, test/e2e, deployment, or production path is in scope.

## Non-destructive evidence already observed

- The primary integration root was dirty and was not used for experiment writes.
- `.worktrees/` is ignored before worktree creation.
- The worktree began clean at the verified live-main SHA.
- Baseline `npm run type-check` passed.
- Baseline `npm run test:question-bank` passed 98/98.
- No staging, commit, push, merge, reset, restore, stash, or Git cleanup command has been run for this slice.

The authoring session changed the package path set after this candidate was first drafted. Therefore no earlier inventory can satisfy A25; the independent reviewer must take a fresh snapshot after F2-R handoff.

## Author handoff snapshot, not an A25 receipt

- Worktree HEAD: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- Fresh live `refs/heads/main`: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- The primary integration worktree currently reports a different local `main` HEAD, `a444b0dcc6a86b7a679a48fe14703c98aa0f0cf6`; this author packet makes no synchronization or release-readiness judgment about it.
- Tracked unstaged paths: 0.
- Staged paths: 0.
- Untracked candidate paths: 48, all under the declared content-QA, research, session-log, and release-intake slice.
- Restricted package files: 48; restricted files with group/other permission bits: 0.
- The repository has many other registered worktrees. This author snapshot makes no ownership or conflict verdict about them.

## Required independent A25 preflight before F3

1. Re-run non-destructive branch/worktree/dirty-tree inventory.
2. Confirm the exact changed/untracked paths remain inside the declared slice.
3. Confirm ignored sealed files are present, restricted, and absent from Git status without exposing their contents.
4. Check for overlapping writers or conflicting package paths.
5. Record live `origin/main` separately from this branch baseline.
6. Recommend the exact future pathspecs and final state: reviewed commit, owner-approved discard, evidence archive, or blocker report.
7. Do not stage, commit, push, merge, delete, reset, revert, or clean without a separate exact owner assignment.

## A25 sign-off

- Reviewer: ______________________  Date: __________
- Live origin/main: ____________________________________________________
- Dirty-path verdict: __________________________________________________
- Conflict verdict: ____________________________________________________
- F3 verdict: `approved-for-intake` / `needs-slicing` / `blocked`
- Independent receipt path: ___________________________________________

Until independently completed, this candidate does not satisfy the A25 gate.
