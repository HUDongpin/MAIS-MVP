# A25 Wave01 Artifact-Clean Batch Execution Instruction Request

Generated: 2026-07-10T17:05:37.410Z

Dirty map signature: `e30d647e1b51432945713f42ac78b0a2466fcb17192de0235a801ac877a0801f`

Expanded dirty entries: 7636

This capsule is request-only. It does not record an execution instruction and does not authorize staging, committing, merging, cleanup, worktree removal, branch deletion, reset, clean, push, deploy, or Vercel release.

## Summary

- Batch status: post-clean-verified
- Request rows: 6
- Command rows: 6
- Pending ready instruction rows: 0
- Instruction rows in file: 0
- Valid instruction rows: 0
- Acceptance checks: 8/8
- Cleanup-authorized rows: 0
- Executable rows: 0

## Batch Copyable Owner Execution Text

```text
Authorize separate Wave01 A25 artifact-clean batch execution; approvalId=wave01-resync-02-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-json; approvalId=wave01-resync-03-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-md; approvalId=wave01-resync-04-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-json; approvalId=wave01-resync-05-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-md; approvalId=wave01-resync-06-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-json; approvalId=wave01-resync-07-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-md; cwd=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md; No cleanup beyond the exact listed command sequence; no broad staging, commit, merge, push, reset, branch deletion, worktree removal, deploy, or unrelated file operation is authorized; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

## Exact Command Sequence

| # | Approval ID | Command | Package file |
| ---: | --- | --- | --- |
| 1 | `wave01-resync-02-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-json` | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json` |
| 2 | `wave01-resync-03-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-md` | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md` |
| 3 | `wave01-resync-04-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-json` | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json` |
| 4 | `wave01-resync-05-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-md` | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md` |
| 5 | `wave01-resync-06-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-json` | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json` |
| 6 | `wave01-resync-07-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-md` | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md` |

## How This Is Used After Owner Approval

- The batch text can be copied into each of the six matching instruction rows as `executionText`.
- Each instruction row must still preserve its own `approvalId`, `command`, `cwd`, blank-free owner fields, and `cleanupAuthorized=false` / `executableNow=false` until the validated executor consumes it.
- This batch request excludes `wave01-resync-01-tsconfig-json`, which remains on hold.

## Acceptance Checks

| Check | Status | Detail |
| --- | --- | --- |
| `source-current` | pass | expanded=7636 |
| `source-gates-passing` | pass | requestGateFailures=0; guardedPlanGateFailures=0 |
| `six-wave01-artifact-clean-requests` | pass | rows=6; allWave01ArtifactClean=true |
| `single-a25-closure-governance-cwd` | pass | cwdRows=1 |
| `exact-git-clean-commands` | pass | commands=6 |
| `tsconfig-hold-preserved` | pass | batch request excludes wave01-resync-01-tsconfig-json |
| `batch-text-complete` | pass | batch text includes each approvalId, exact command, cwd, no-cleanup, no-broad-staging, and no-deploy terms |
| `non-executable-boundary` | pass | source packets remain request-only and non-executable |

## Boundary

- Records execution instruction: false.
- Stage authorized: false.
- Commit authorized: false.
- Merge authorized: false.
- Cleanup authorized: false.
- Executable now: false.
- Destructive Git authorized: false.
- Deploy authorized: false.
