# A25 Next Owner Authorization Focus Batch Canonical Recording Apply Report

Generated: 2026-07-10T15:38:09.824Z

Mode: `apply-recording`

Recorder status: `not-ready-check-failures`

Dirty map signature: `37c9d353a7710b8e92d3d766006b7230936ca194044a47770a99ab12d7c6cef1`

Expanded dirty entries: 7221

This recorder is fail-closed. Dry-run mode writes evidence only. Apply-recording mode can update only `coordination/release-intake/latest-A25-next-owner-authorizations.json`, and only after explicit owner approval fields and owner approval text cover every focus-batch row. It never records execution instructions, executes cleanup, performs Git operations, merges, pushes, or deploys.

## Summary

- Approval rows: 1
- Existing authorization rows: 1
- Proposed authorization rows not applied: 1
- Owner approval fields present: 1
- Owner approval text covers rows: true
- Owner approval text keeps negative boundaries: true
- Recording checks: 7/9
- Apply requested: true
- Apply permitted: false
- Mutations performed: true
- Records authorization rows: 1
- Cleanup-authorized rows: 0
- Executable rows: 0

## Proposed Authorization Rows Do Not Apply

| # | Approval ID | Owner | Selected final state | approvedBy | approvedAt | Cleanup authorized | Executable |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `manual-a10-a25-owner-assignment-required` | Manual A10/A25 owner assignment required | reviewed commit | dongpinhu | 2026-07-10T15:38:09Z | no | no |

## Recording Checks

| Check | Status | Detail |
| --- | --- | --- |
| `mode-is-explicit` | pass | mode=apply-recording |
| `source-current` | fail | sourceCurrentnessFailures=1 |
| `preview-rows-match-current-focus-batch` | pass | previewRows=1; pendingRows=1; previewStatus=ready-for-owner-review |
| `no-partial-existing-authorizations` | pass | existingTargetRows=1 |
| `owner-approval-text-covers-rows` | pass | approvalTextCoversRows=true |
| `owner-approval-text-keeps-negative-boundaries` | pass | cleanup=true; deploy=true; merge=true; destructive-git=true; physical-lifecycle-cleanup=true |
| `proposed-rows-safe-boundary` | pass | proposed authorization rows must not authorize cleanup or execution |
| `recording-status-coherent` | pass | recordingStatus=not-ready-source-stale |
| `apply-requires-ready-status` | fail | mode=apply-recording; status=not-ready-source-stale |

## Boundary

- Records owner approval: true
- Promotes canonical rows: true
- Records execution instruction: false
- Stage authorized: false
- Commit authorized: false
- Merge authorized: false
- Cleanup authorized: false
- Executable now: false
- Destructive Git authorized: false
- Deploy authorized: false
- Requires explicit apply-recording flag: true
- Requires owner approval text covering all rows: true
- Requires owner approval text negative boundaries: true
