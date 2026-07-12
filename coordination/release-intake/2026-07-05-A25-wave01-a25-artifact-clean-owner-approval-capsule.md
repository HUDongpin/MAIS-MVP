# A25 Wave01 A25 Artifact Clean Owner Approval Capsule

Generated: 2026-07-05T11:12:46.507Z

Dirty map signature: `fc405946dbb9033f749aa5e537f14edc23d82355d6b8e796759a4856fcbefeef`

Expanded dirty entries: 4737

This capsule is evidence-only. It isolates the six Wave01 A25 dirty-map artifact clean rows for owner review, while holding the `tsconfig.json` restore row for A10/A22 release-hygiene review. It does not authorize git clean, git restore, cleanup, stage, commit, merge, reset, push, deploy, worktree removal, branch deletion, or file deletion.

## Summary

- Ready for owner decision: yes
- Clean approval rows: 6
- Held rows: 1
- Total clean file bytes: 724865
- Copyable clean authorization texts: 6
- Acceptance checks: 10/10
- Cleanup-authorized rows: 0
- Executable rows: 0

## Approval Scope

- Scope ID: `wave01-a25-artifact-clean-only`
- Owner: A25 git hygiene and release intake
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`
- Target authorization input, if owner later approves: `coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations.json`
- Strategy: `approve-six-a25-artifact-clean-rows-hold-tsconfig`
- Owner decision text: Approve only the six Wave01 A25 dirty-map artifact clean rows; keep wave01-resync-01-tsconfig-json held for A10/A22 release-hygiene review.

## Clean Approval Rows

| # | Approval ID | Path | Bytes | Exact command |
| --- | --- | --- | ---: | --- |
| 1 | `wave01-resync-02-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-json` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json` | 237783 | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json` |
| 2 | `wave01-resync-03-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-md` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md` | 3372 | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md` |
| 3 | `wave01-resync-04-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-json` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json` | 238255 | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json` |
| 4 | `wave01-resync-05-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-md` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md` | 3388 | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md` |
| 5 | `wave01-resync-06-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-json` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json` | 238695 | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json` |
| 6 | `wave01-resync-07-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-md` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md` | 3372 | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md` |

## Held Rows

| Approval ID | Path | Exact command | Hold reason |
| --- | --- | --- | --- |
| `wave01-resync-01-tsconfig-json` | `tsconfig.json` | `git restore --source=HEAD -- tsconfig.json` | The tsconfig change adds release/build artifact excludes and may be useful; do not restore it without A10/A22 review. |

## Acceptance Checks

| # | Check | Status | Label | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `source-currentness-green` | pass | Source Wave01 owner-review capsule and gate are current | sourceCurrentnessFailures=0 |
| 2 | `review-capsule-ready` | pass | The source Wave01 owner-review capsule is ready for owner decision | ready=true failedChecks=0 |
| 3 | `six-a25-clean-rows` | pass | Exactly six A25 artifact clean rows are isolated | cleanRows=6 |
| 4 | `single-held-tsconfig-row` | pass | Exactly one tsconfig restore row is held for A10/A22 review | heldRows=1 held=wave01-resync-01-tsconfig-json |
| 5 | `tsconfig-not-in-clean-scope` | pass | The clean approval scope excludes tsconfig.json | tsconfigCleanRows=0 |
| 6 | `clean-commands-allowlisted` | pass | Every clean row is limited to a Wave01 A25 dirty-map artifact git clean command | allowed=6/6 |
| 7 | `clean-file-impact-positive` | pass | The clean rows have concrete file-size impact evidence | totalCleanFileBytes=724865 |
| 8 | `copyable-clean-authorization-texts` | pass | Each clean row has copyable owner authorization text | texts=6/6 |
| 9 | `authorization-input-clean-approval-recorded` | pass | Wave01 owner authorization input records the six A25 clean approvals while holding tsconfig | authorized=6 pending=1 executable=0 |
| 10 | `non-executable-clean-approval-capsule` | pass | The capsule is evidence-only and non-executable | cleanup=0 executable=0 |

## Copyable Clean Authorization Texts

These texts are review-ready only. They become active only if the owner copies the selected rows into `coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations.json` with approval metadata and the validators accept them.

### 1. `wave01-resync-02-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-json`

```text
Authorize approvalId=wave01-resync-02-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-json; worktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; path=coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json; selectedAction=owner-approved-package-untracked-clean; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

### 2. `wave01-resync-03-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-md`

```text
Authorize approvalId=wave01-resync-03-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-md; worktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; path=coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md; selectedAction=owner-approved-package-untracked-clean; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

### 3. `wave01-resync-04-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-json`

```text
Authorize approvalId=wave01-resync-04-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-json; worktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; path=coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json; selectedAction=owner-approved-package-untracked-clean; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

### 4. `wave01-resync-05-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-md`

```text
Authorize approvalId=wave01-resync-05-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-md; worktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; path=coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md; selectedAction=owner-approved-package-untracked-clean; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

### 5. `wave01-resync-06-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-json`

```text
Authorize approvalId=wave01-resync-06-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-json; worktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; path=coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json; selectedAction=owner-approved-package-untracked-clean; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

### 6. `wave01-resync-07-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-md`

```text
Authorize approvalId=wave01-resync-07-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-md; worktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; path=coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md; selectedAction=owner-approved-package-untracked-clean; command=git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

