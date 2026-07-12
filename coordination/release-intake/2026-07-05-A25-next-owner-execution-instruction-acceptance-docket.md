# A25 Next Owner Execution Instruction Acceptance Docket

Generated: 2026-07-05T11:15:43.053Z

Dirty map signature: `fc405946dbb9033f749aa5e537f14edc23d82355d6b8e796759a4856fcbefeef`

Expanded dirty entries: 4737

This docket is evidence-only. It defines how the next owner execution instruction will be accepted, but it does not record an execution instruction and does not authorize staging, committing, merging, cleanup, worktree removal, branch deletion, reset, clean, push, deploy, or Vercel release.

## Summary

- Acceptance rows: 6
- Ready instruction request rows: 6
- Effective pending ready instruction rows: 6
- Instruction rows in file: 0
- Valid instruction rows: 0
- Owner-input instruction rows: 1
- Owner-input valid instruction rows: 1
- Pre-execution validation ready: yes
- Passing acceptance checks: 9/9
- Cleanup-authorized rows: 0
- Executable rows: 0

## Acceptance Rows

| Approval ID | Status | Commands | Package files | Owner instruction rows | Package fingerprint SHA256 |
| --- | --- | ---: | ---: | ---: | --- |
| `wave01-resync-02-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-json` | waiting-for-owner-execution-instruction | 1 | 1 | 0 | `n/a` |
| `wave01-resync-03-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-md` | waiting-for-owner-execution-instruction | 1 | 1 | 0 | `n/a` |
| `wave01-resync-04-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-json` | waiting-for-owner-execution-instruction | 1 | 1 | 0 | `n/a` |
| `wave01-resync-05-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-md` | waiting-for-owner-execution-instruction | 1 | 1 | 0 | `n/a` |
| `wave01-resync-06-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-json` | waiting-for-owner-execution-instruction | 1 | 1 | 0 | `n/a` |
| `wave01-resync-07-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-md` | waiting-for-owner-execution-instruction | 1 | 1 | 0 | `n/a` |

## Acceptance Checks

| Check | Status | Detail |
| --- | --- | --- |
| `source-current` | pass | source currentness failures=0 |
| `ready-request-rows-aligned` | pass | ready request rows=6 |
| `pending-ready-instruction-row` | pass | pending=6, instructionGatePending=6, ownerInputReady=0 |
| `no-recorded-execution-instruction-yet` | pass | Current state is request-only until the owner records a separate execution instruction. |
| `a16-pre-execution-ready` | pass | pre-execution checks=13/13 |
| `package-files-present` | pass | request rows=6 |
| `exact-commands-present` | pass | request rows=6 |
| `copyable-execution-text-complete` | pass | Request row carries the exact owner-facing execution instruction text. |
| `non-executable-boundary` | pass | Acceptance docket does not authorize cleanup or executable rows. |

## Acceptance Row: wave01-resync-02-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-json

Status: waiting-for-owner-execution-instruction

Target input file: `coordination/release-intake/latest-A25-next-owner-execution-instructions.json`

Expected instruction id: `wave01-resync-02-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-json-execution-instruction`

Expected owner execution text:

```text
Authorize separate execution approvalId=wave01-resync-02-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-json; cwd=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json; No cleanup beyond the exact listed command sequence; no broad staging, commit, merge, push, reset, branch deletion, worktree removal, deploy, or unrelated file operation is authorized; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

Exact command sequence:

1. `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json`

Required evidence:

- `coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json`
- `coordination/release-intake/latest-A25-a16-execution-instruction-owner-input.json`
- `coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json`
- `coordination/release-intake/latest-A25-next-owner-authorized-command-manifest.json`

Acceptance criteria:

- Owner instruction row must match the draft approvalId, instructionId, owner, target cwd, package file, and exact command sequence.
- executionText must include the separate-execution wording, target cwd, exact command, and the no-cleanup/no-broad-staging exclusions.
- cleanupAuthorized and executableNow must remain false; separate owner instruction permits only the listed command after pre-checks pass.
- This request packet does not execute, stage, commit, merge, clean, remove, push, deploy, or otherwise mutate the worktree.

## Acceptance Row: wave01-resync-03-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-md

Status: waiting-for-owner-execution-instruction

Target input file: `coordination/release-intake/latest-A25-next-owner-execution-instructions.json`

Expected instruction id: `wave01-resync-03-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-md-execution-instruction`

Expected owner execution text:

```text
Authorize separate execution approvalId=wave01-resync-03-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-md; cwd=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md; No cleanup beyond the exact listed command sequence; no broad staging, commit, merge, push, reset, branch deletion, worktree removal, deploy, or unrelated file operation is authorized; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

Exact command sequence:

1. `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md`

Required evidence:

- `coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json`
- `coordination/release-intake/latest-A25-a16-execution-instruction-owner-input.json`
- `coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json`
- `coordination/release-intake/latest-A25-next-owner-authorized-command-manifest.json`

Acceptance criteria:

- Owner instruction row must match the draft approvalId, instructionId, owner, target cwd, package file, and exact command sequence.
- executionText must include the separate-execution wording, target cwd, exact command, and the no-cleanup/no-broad-staging exclusions.
- cleanupAuthorized and executableNow must remain false; separate owner instruction permits only the listed command after pre-checks pass.
- This request packet does not execute, stage, commit, merge, clean, remove, push, deploy, or otherwise mutate the worktree.

## Acceptance Row: wave01-resync-04-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-json

Status: waiting-for-owner-execution-instruction

Target input file: `coordination/release-intake/latest-A25-next-owner-execution-instructions.json`

Expected instruction id: `wave01-resync-04-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-json-execution-instruction`

Expected owner execution text:

```text
Authorize separate execution approvalId=wave01-resync-04-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-json; cwd=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json; No cleanup beyond the exact listed command sequence; no broad staging, commit, merge, push, reset, branch deletion, worktree removal, deploy, or unrelated file operation is authorized; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

Exact command sequence:

1. `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json`

Required evidence:

- `coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json`
- `coordination/release-intake/latest-A25-a16-execution-instruction-owner-input.json`
- `coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json`
- `coordination/release-intake/latest-A25-next-owner-authorized-command-manifest.json`

Acceptance criteria:

- Owner instruction row must match the draft approvalId, instructionId, owner, target cwd, package file, and exact command sequence.
- executionText must include the separate-execution wording, target cwd, exact command, and the no-cleanup/no-broad-staging exclusions.
- cleanupAuthorized and executableNow must remain false; separate owner instruction permits only the listed command after pre-checks pass.
- This request packet does not execute, stage, commit, merge, clean, remove, push, deploy, or otherwise mutate the worktree.

## Acceptance Row: wave01-resync-05-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-md

Status: waiting-for-owner-execution-instruction

Target input file: `coordination/release-intake/latest-A25-next-owner-execution-instructions.json`

Expected instruction id: `wave01-resync-05-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-md-execution-instruction`

Expected owner execution text:

```text
Authorize separate execution approvalId=wave01-resync-05-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-md; cwd=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md; No cleanup beyond the exact listed command sequence; no broad staging, commit, merge, push, reset, branch deletion, worktree removal, deploy, or unrelated file operation is authorized; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

Exact command sequence:

1. `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md`

Required evidence:

- `coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json`
- `coordination/release-intake/latest-A25-a16-execution-instruction-owner-input.json`
- `coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json`
- `coordination/release-intake/latest-A25-next-owner-authorized-command-manifest.json`

Acceptance criteria:

- Owner instruction row must match the draft approvalId, instructionId, owner, target cwd, package file, and exact command sequence.
- executionText must include the separate-execution wording, target cwd, exact command, and the no-cleanup/no-broad-staging exclusions.
- cleanupAuthorized and executableNow must remain false; separate owner instruction permits only the listed command after pre-checks pass.
- This request packet does not execute, stage, commit, merge, clean, remove, push, deploy, or otherwise mutate the worktree.

## Acceptance Row: wave01-resync-06-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-json

Status: waiting-for-owner-execution-instruction

Target input file: `coordination/release-intake/latest-A25-next-owner-execution-instructions.json`

Expected instruction id: `wave01-resync-06-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-json-execution-instruction`

Expected owner execution text:

```text
Authorize separate execution approvalId=wave01-resync-06-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-json; cwd=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json; No cleanup beyond the exact listed command sequence; no broad staging, commit, merge, push, reset, branch deletion, worktree removal, deploy, or unrelated file operation is authorized; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

Exact command sequence:

1. `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json`

Required evidence:

- `coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json`
- `coordination/release-intake/latest-A25-a16-execution-instruction-owner-input.json`
- `coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json`
- `coordination/release-intake/latest-A25-next-owner-authorized-command-manifest.json`

Acceptance criteria:

- Owner instruction row must match the draft approvalId, instructionId, owner, target cwd, package file, and exact command sequence.
- executionText must include the separate-execution wording, target cwd, exact command, and the no-cleanup/no-broad-staging exclusions.
- cleanupAuthorized and executableNow must remain false; separate owner instruction permits only the listed command after pre-checks pass.
- This request packet does not execute, stage, commit, merge, clean, remove, push, deploy, or otherwise mutate the worktree.

## Acceptance Row: wave01-resync-07-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-md

Status: waiting-for-owner-execution-instruction

Target input file: `coordination/release-intake/latest-A25-next-owner-execution-instructions.json`

Expected instruction id: `wave01-resync-07-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-md-execution-instruction`

Expected owner execution text:

```text
Authorize separate execution approvalId=wave01-resync-07-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-md; cwd=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md; No cleanup beyond the exact listed command sequence; no broad staging, commit, merge, push, reset, branch deletion, worktree removal, deploy, or unrelated file operation is authorized; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

Exact command sequence:

1. `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md`

Required evidence:

- `coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json`
- `coordination/release-intake/latest-A25-a16-execution-instruction-owner-input.json`
- `coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json`
- `coordination/release-intake/latest-A25-next-owner-authorized-command-manifest.json`

Acceptance criteria:

- Owner instruction row must match the draft approvalId, instructionId, owner, target cwd, package file, and exact command sequence.
- executionText must include the separate-execution wording, target cwd, exact command, and the no-cleanup/no-broad-staging exclusions.
- cleanupAuthorized and executableNow must remain false; separate owner instruction permits only the listed command after pre-checks pass.
- This request packet does not execute, stage, commit, merge, clean, remove, push, deploy, or otherwise mutate the worktree.


## Boundary

- Records execution instruction: false.
- Stage authorized: false.
- Commit authorized: false.
- Merge authorized: false.
- Cleanup authorized: false.
- Executable now: false.
- Destructive Git authorized: false.
- Deploy authorized: false.
- Requires separate owner execution instruction: true.
