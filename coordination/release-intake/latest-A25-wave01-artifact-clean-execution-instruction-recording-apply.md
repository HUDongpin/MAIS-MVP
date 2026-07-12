# A25 Wave01 Artifact-Clean Execution Instruction Recording Apply Report

Generated: 2026-07-06T02:01:35.216Z

Mode: `apply-recording`

Recorder status: `not-ready-check-failures`

Intake status: `ready-to-record-instruction-rows`

Dirty map signature: `5fc283c94246a9b9b4772002cba938aeaf7cb774084a012cef1e4bab0aca9096`

Expanded dirty entries: 5056

This recorder is fail-closed. Dry-run mode writes evidence only. Apply-recording mode can update only `coordination/release-intake/latest-A25-next-owner-execution-instructions.json`, and only after owner input is complete and the intake gate is current. It never executes cleanup or deploy.

## Summary

- Approval rows: 6
- Existing instruction rows: 6
- Proposed instruction rows not applied: 6
- Recording checks: 6/8
- Apply requested: true
- Apply permitted: false
- Mutations performed: true
- Records execution-instruction rows: 6
- Cleanup-authorized rows: 0
- Executable rows: 0

## Proposed Instruction Rows Do Not Apply

| # | Approval ID | Command | CWD |
| ---: | --- | --- | --- |
| 1 | `wave01-resync-02-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-json` | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json` | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance` |
| 2 | `wave01-resync-03-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-md` | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md` | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance` |
| 3 | `wave01-resync-04-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-json` | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json` | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance` |
| 4 | `wave01-resync-05-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-md` | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md` | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance` |
| 5 | `wave01-resync-06-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-json` | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json` | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance` |
| 6 | `wave01-resync-07-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-md` | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md` | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance` |

## Recording Checks

| Check | Status | Detail |
| --- | --- | --- |
| `mode-is-explicit` | pass | mode=apply-recording |
| `source-current` | fail | source currentness failures=1 |
| `six-approval-ids` | pass | approvalIds=6 |
| `no-partial-existing-target-records` | pass | existingTargetRows=6 |
| `proposed-rows-match-status` | pass | intakeStatus=ready-to-record-instruction-rows; proposedRows=6 |
| `proposed-rows-safe-boundary` | pass | proposed rows must not authorize cleanup, execution, destructive git, or deploy |
| `recording-status-coherent` | pass | recordingStatus=not-ready-source-stale |
| `apply-requires-ready-status` | fail | mode=apply-recording; status=not-ready-source-stale |

## Boundary

- Records execution instruction: true
- Stage authorized: false
- Commit authorized: false
- Merge authorized: false
- Cleanup authorized: false
- Executable now: false
- Destructive Git authorized: false
- Deploy authorized: false
- Requires explicit apply-recording flag: true
- Requires separate guarded executor: true
