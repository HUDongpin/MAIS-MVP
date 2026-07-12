# A25 Physical Lifecycle Approval Requests

Generated: 2026-06-30T15:52:19.676Z

Dirty map signature: `8dbbd196455c11167eaa0529013073982e266963e3fee15f002f4a68e8b0f82f`

Expanded dirty entries: 2471

Worktrees: 25

Requests: 22

- Root package requests: 1
- Dirty linked worktree requests: 16
- Clean-diverged branch requests: 5

This artifact is approval support only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, or worktree removal. Every destructive action still requires a separate explicit owner instruction naming the exact branch, worktree, or pathspec package.

| Approval ID | Branch | Kind | Current blocker | Owner decision needed from | Allowed final states |
| --- | --- | --- | --- | --- | --- |
| `root-main` | `main` | root-owner-package | dirty 2471 | A25, A10, A22, effective file owners | reviewed owner package commit; owner-approved exact-path discard; evidence archive with release-source blocker; blocker |
| `codex-a01-app-shell-closure` | `codex/A01-app-shell-closure` | dirty-linked-worktree | dirty 26 | A01 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-a01-shell-lazy-load` | `codex/A01-shell-lazy-load` | dirty-linked-worktree | dirty 8 | A01 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-a06-manim-three-closure` | `codex/A06-manim-three-closure` | dirty-linked-worktree | dirty 351 | A06 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-a06-visualization-closure` | `codex/A06-visualization-closure` | dirty-linked-worktree | dirty 437 | A06, A22 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-a07-a15-a08-ai-adaptive-types` | `codex/A07-A15-A08-ai-adaptive-types` | dirty-linked-worktree | dirty 30 | A07, A08, A15 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-a07-ai-tutor-classroom-switches` | `codex/A07-ai-tutor-classroom-switches` | dirty-linked-worktree | dirty 82 | A07 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-a08-a12-shared-contract-closure` | `codex/A08-A12-shared-contract-closure` | dirty-linked-worktree | dirty 185 | A08, A12 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-a10-a22-a08-a12-a06-compose-20260628` | `codex/A10-A22-A08-A12-A06-compose-20260628` | dirty-diverged-worktree | dirty 743 | A06, A08, A10, A12, A22 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-a10-a22-release-governance` | `codex/A10-A22-release-governance` | clean-diverged-branch | behind 0, ahead 2 | A10, A22 | owner-approved PR or review package; archive-state record; owner-approved branch or worktree retirement; blocker |
| `codex-a12-google-oauth-login` | `codex/A12-google-oauth-login` | dirty-linked-worktree | dirty 16 | A12 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-a12-userstore-storage-contract` | `codex/A12-userstore-storage-contract` | dirty-linked-worktree | dirty 170 | A12 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-a19-vercel-postgres-region` | `codex/A19-vercel-postgres-region` | clean-diverged-branch | behind 0, ahead 8 | A19 | owner-approved PR or review package; archive-state record; owner-approved branch or worktree retirement; blocker |
| `codex-a22-missing-module-release-slice` | `codex/A22-missing-module-release-slice` | dirty-linked-worktree | dirty 1016 | A22 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-a22-next-15-5-19-audit` | `codex/A22-next-15-5-19-audit` | dirty-linked-worktree | dirty 4 | A22 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-a22-p1-release-hygiene-security` | `codex/A22-p1-release-hygiene-security` | dirty-linked-worktree | dirty 27 | A22 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-a22-us-region-alignment` | `codex/A22-us-region-alignment` | clean-diverged-branch | behind 0, ahead 1 | A22 | owner-approved PR or review package; archive-state record; owner-approved branch or worktree retirement; blocker |
| `codex-a25-dirty-closure-governance` | `codex/A25-dirty-closure-governance` | dirty-linked-worktree | dirty 1018 | A25 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-a25-full-dirty-compose-verification` | `codex/A25-full-dirty-compose-verification` | dirty-linked-worktree | dirty 2423 | A25 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-visualization-production-release` | `codex/visualization-production-release` | dirty-diverged-worktree | dirty 16 | A06, A22 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `codex-california-practice-beta-clean` | `codex/california-practice-beta-clean` | clean-diverged-branch | behind 12, ahead 1 | A21, A18, A04, A22 | owner-approved PR or review package; archive-state record; owner-approved branch or worktree retirement; blocker |
| `codex-s22-release-hygiene-2026-06-15` | `codex/s22-release-hygiene-2026-06-15` | clean-diverged-branch | behind 12, ahead 1 | A22, A10 | owner-approved PR or review package; archive-state record; owner-approved branch or worktree retirement; blocker |

## root-main

- Branch: `main`
- Path: `/Users/dongpinhu/Desktop/MAIS-MVP`
- State: `dirty-open-decision`
- Current blocker: dirty 2471
- Owner decision needed from: A25, A10, A22, effective file owners
- Evidence:
  - `coordination/release-intake/latest-A25-dirty-tree-map.md`
  - `coordination/release-intake/latest-A25-effective-disposition-queue.md`
  - `coordination/release-intake/latest-A25-owner-disposition-queue.md`
- Allowed final states:
  - reviewed owner package commit: An owning agent commits a reviewed root package from an isolated clean worktree, then A25 refreshes inventory.
  - owner-approved exact-path discard: A separately authorized Git operation discards only the exact approved paths after evidence review.
  - evidence archive with release-source blocker: A25 preserves evidence and keeps root excluded from release sources until the package is closed.
  - blocker: A25 records the unresolved owner, package, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "root-main",
  "branch": "main",
  "path": "/Users/dongpinhu/Desktop/MAIS-MVP",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-dirty-tree-map.md",
    "coordination/release-intake/latest-A25-effective-disposition-queue.md",
    "coordination/release-intake/latest-A25-owner-disposition-queue.md"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a01-app-shell-closure

- Branch: `codex/A01-app-shell-closure`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-app-shell-closure`
- State: `dirty-open-decision`
- Current blocker: dirty 26
- Owner decision needed from: A01
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A01-app-shell-closure.status.txt`
  - `coordination/release-intake/archive/codex-A01-app-shell-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A01-app-shell-closure.patch`
  - `coordination/release-intake/archive/codex-A01-app-shell-closure.untracked.txt`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a01-app-shell-closure",
  "branch": "codex/A01-app-shell-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-app-shell-closure",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A01-app-shell-closure.status.txt",
    "coordination/release-intake/archive/codex-A01-app-shell-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A01-app-shell-closure.patch",
    "coordination/release-intake/archive/codex-A01-app-shell-closure.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a01-shell-lazy-load

- Branch: `codex/A01-shell-lazy-load`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-shell-lazy-load`
- State: `dirty-open-decision`
- Current blocker: dirty 8
- Owner decision needed from: A01
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A01-shell-lazy-load.status.txt`
  - `coordination/release-intake/archive/codex-A01-shell-lazy-load.diffstat.txt`
  - `coordination/release-intake/archive/codex-A01-shell-lazy-load.patch`
  - `coordination/release-intake/archive/codex-A01-shell-lazy-load.untracked.txt`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a01-shell-lazy-load",
  "branch": "codex/A01-shell-lazy-load",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-shell-lazy-load",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A01-shell-lazy-load.status.txt",
    "coordination/release-intake/archive/codex-A01-shell-lazy-load.diffstat.txt",
    "coordination/release-intake/archive/codex-A01-shell-lazy-load.patch",
    "coordination/release-intake/archive/codex-A01-shell-lazy-load.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a06-manim-three-closure

- Branch: `codex/A06-manim-three-closure`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-manim-three-closure`
- State: `dirty-open-decision`
- Current blocker: dirty 351
- Owner decision needed from: A06
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A06-manim-three-closure.status.txt`
  - `coordination/release-intake/archive/codex-A06-manim-three-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A06-manim-three-closure.patch`
  - `coordination/release-intake/archive/codex-A06-manim-three-closure.untracked.txt`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a06-manim-three-closure",
  "branch": "codex/A06-manim-three-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-manim-three-closure",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A06-manim-three-closure.status.txt",
    "coordination/release-intake/archive/codex-A06-manim-three-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A06-manim-three-closure.patch",
    "coordination/release-intake/archive/codex-A06-manim-three-closure.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a06-visualization-closure

- Branch: `codex/A06-visualization-closure`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure`
- State: `dirty-open-decision`
- Current blocker: dirty 437
- Owner decision needed from: A06, A22
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A06-visualization-closure.status.txt`
  - `coordination/release-intake/archive/codex-A06-visualization-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A06-visualization-closure.patch`
  - `coordination/release-intake/archive/codex-A06-visualization-closure.untracked.txt`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a06-visualization-closure",
  "branch": "codex/A06-visualization-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A06-visualization-closure.status.txt",
    "coordination/release-intake/archive/codex-A06-visualization-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A06-visualization-closure.patch",
    "coordination/release-intake/archive/codex-A06-visualization-closure.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a07-a15-a08-ai-adaptive-types

- Branch: `codex/A07-A15-A08-ai-adaptive-types`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-A15-A08-ai-adaptive-types`
- State: `dirty-open-decision`
- Current blocker: dirty 30
- Owner decision needed from: A07, A08, A15
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.status.txt`
  - `coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.diffstat.txt`
  - `coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.patch`
  - `coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.untracked.txt`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a07-a15-a08-ai-adaptive-types",
  "branch": "codex/A07-A15-A08-ai-adaptive-types",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-A15-A08-ai-adaptive-types",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.status.txt",
    "coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.diffstat.txt",
    "coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.patch",
    "coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a07-ai-tutor-classroom-switches

- Branch: `codex/A07-ai-tutor-classroom-switches`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-classroom-switches`
- State: `dirty-open-decision`
- Current blocker: dirty 82
- Owner decision needed from: A07
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.status.txt`
  - `coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.diffstat.txt`
  - `coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.patch`
  - `coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.untracked.txt`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a07-ai-tutor-classroom-switches",
  "branch": "codex/A07-ai-tutor-classroom-switches",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-classroom-switches",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.status.txt",
    "coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.diffstat.txt",
    "coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.patch",
    "coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a08-a12-shared-contract-closure

- Branch: `codex/A08-A12-shared-contract-closure`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A08-A12-shared-contract-closure`
- State: `dirty-open-decision`
- Current blocker: dirty 185
- Owner decision needed from: A08, A12
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.status.txt`
  - `coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.patch`
  - `coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.untracked.txt`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a08-a12-shared-contract-closure",
  "branch": "codex/A08-A12-shared-contract-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A08-A12-shared-contract-closure",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.status.txt",
    "coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.patch",
    "coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a10-a22-a08-a12-a06-compose-20260628

- Branch: `codex/A10-A22-A08-A12-A06-compose-20260628`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-A08-A12-A06-compose-20260628`
- State: `dirty-open-decision`
- Current blocker: dirty 743
- Owner decision needed from: A06, A08, A10, A12, A22
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.status.txt`
  - `coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.diffstat.txt`
  - `coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.patch`
  - `coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.untracked.txt`
  - `coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.dirty-diverged.ahead-log.txt`
  - `coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.dirty-diverged.diffstat.txt`
  - `coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.dirty-diverged.patch`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a10-a22-a08-a12-a06-compose-20260628",
  "branch": "codex/A10-A22-A08-A12-A06-compose-20260628",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-A08-A12-A06-compose-20260628",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.status.txt",
    "coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.diffstat.txt",
    "coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.patch",
    "coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.untracked.txt",
    "coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md",
    "coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.dirty-diverged.ahead-log.txt",
    "coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.dirty-diverged.diffstat.txt",
    "coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.dirty-diverged.patch"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a10-a22-release-governance

- Branch: `codex/A10-A22-release-governance`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-release-governance`
- State: `clean-diverged-open-decision`
- Current blocker: behind 0, ahead 2
- Owner decision needed from: A10, A22
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.status.txt`
  - `coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.ahead-log.txt`
  - `coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.name-status.txt`
  - `coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.diffstat.txt`
  - `coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.patch`
  - `coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.untracked.txt`
- Allowed final states:
  - owner-approved PR or review package: The owning agent promotes the branch through review without using the dirty root as release source.
  - archive-state record: A25 records the branch as preserved evidence; a real Git tag still needs separate explicit approval.
  - owner-approved branch or worktree retirement: A separately authorized Git operation may retire the branch or remove the worktree after archive review.
  - blocker: A25 records the unresolved owner, branch, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a10-a22-release-governance",
  "branch": "codex/A10-A22-release-governance",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-release-governance",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md",
    "coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.status.txt",
    "coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.ahead-log.txt",
    "coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.name-status.txt",
    "coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.diffstat.txt",
    "coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.patch",
    "coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a12-google-oauth-login

- Branch: `codex/A12-google-oauth-login`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A12-google-oauth-login`
- State: `dirty-open-decision`
- Current blocker: dirty 16
- Owner decision needed from: A12
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A12-google-oauth-login.status.txt`
  - `coordination/release-intake/archive/codex-A12-google-oauth-login.diffstat.txt`
  - `coordination/release-intake/archive/codex-A12-google-oauth-login.patch`
  - `coordination/release-intake/archive/codex-A12-google-oauth-login.untracked.txt`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a12-google-oauth-login",
  "branch": "codex/A12-google-oauth-login",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A12-google-oauth-login",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A12-google-oauth-login.status.txt",
    "coordination/release-intake/archive/codex-A12-google-oauth-login.diffstat.txt",
    "coordination/release-intake/archive/codex-A12-google-oauth-login.patch",
    "coordination/release-intake/archive/codex-A12-google-oauth-login.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a12-userstore-storage-contract

- Branch: `codex/A12-userstore-storage-contract`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A12-userstore-storage-contract`
- State: `dirty-open-decision`
- Current blocker: dirty 170
- Owner decision needed from: A12
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A12-userstore-storage-contract.status.txt`
  - `coordination/release-intake/archive/codex-A12-userstore-storage-contract.diffstat.txt`
  - `coordination/release-intake/archive/codex-A12-userstore-storage-contract.patch`
  - `coordination/release-intake/archive/codex-A12-userstore-storage-contract.untracked.txt`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a12-userstore-storage-contract",
  "branch": "codex/A12-userstore-storage-contract",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A12-userstore-storage-contract",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A12-userstore-storage-contract.status.txt",
    "coordination/release-intake/archive/codex-A12-userstore-storage-contract.diffstat.txt",
    "coordination/release-intake/archive/codex-A12-userstore-storage-contract.patch",
    "coordination/release-intake/archive/codex-A12-userstore-storage-contract.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a19-vercel-postgres-region

- Branch: `codex/A19-vercel-postgres-region`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A19-vercel-postgres-region`
- State: `clean-diverged-open-decision`
- Current blocker: behind 0, ahead 8
- Owner decision needed from: A19
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.status.txt`
  - `coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.ahead-log.txt`
  - `coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.name-status.txt`
  - `coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.diffstat.txt`
  - `coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.patch`
  - `coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.untracked.txt`
- Allowed final states:
  - owner-approved PR or review package: The owning agent promotes the branch through review without using the dirty root as release source.
  - archive-state record: A25 records the branch as preserved evidence; a real Git tag still needs separate explicit approval.
  - owner-approved branch or worktree retirement: A separately authorized Git operation may retire the branch or remove the worktree after archive review.
  - blocker: A25 records the unresolved owner, branch, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a19-vercel-postgres-region",
  "branch": "codex/A19-vercel-postgres-region",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A19-vercel-postgres-region",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md",
    "coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.status.txt",
    "coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.ahead-log.txt",
    "coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.name-status.txt",
    "coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.diffstat.txt",
    "coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.patch",
    "coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a22-missing-module-release-slice

- Branch: `codex/A22-missing-module-release-slice`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-missing-module-release-slice`
- State: `dirty-open-decision`
- Current blocker: dirty 1016
- Owner decision needed from: A22
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A22-missing-module-release-slice.status.txt`
  - `coordination/release-intake/archive/codex-A22-missing-module-release-slice.diffstat.txt`
  - `coordination/release-intake/archive/codex-A22-missing-module-release-slice.patch`
  - `coordination/release-intake/archive/codex-A22-missing-module-release-slice.untracked.txt`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a22-missing-module-release-slice",
  "branch": "codex/A22-missing-module-release-slice",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-missing-module-release-slice",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A22-missing-module-release-slice.status.txt",
    "coordination/release-intake/archive/codex-A22-missing-module-release-slice.diffstat.txt",
    "coordination/release-intake/archive/codex-A22-missing-module-release-slice.patch",
    "coordination/release-intake/archive/codex-A22-missing-module-release-slice.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a22-next-15-5-19-audit

- Branch: `codex/A22-next-15-5-19-audit`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-next-15-5-19-audit`
- State: `dirty-open-decision`
- Current blocker: dirty 4
- Owner decision needed from: A22
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A22-next-15-5-19-audit.status.txt`
  - `coordination/release-intake/archive/codex-A22-next-15-5-19-audit.diffstat.txt`
  - `coordination/release-intake/archive/codex-A22-next-15-5-19-audit.patch`
  - `coordination/release-intake/archive/codex-A22-next-15-5-19-audit.untracked.txt`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a22-next-15-5-19-audit",
  "branch": "codex/A22-next-15-5-19-audit",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-next-15-5-19-audit",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A22-next-15-5-19-audit.status.txt",
    "coordination/release-intake/archive/codex-A22-next-15-5-19-audit.diffstat.txt",
    "coordination/release-intake/archive/codex-A22-next-15-5-19-audit.patch",
    "coordination/release-intake/archive/codex-A22-next-15-5-19-audit.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a22-p1-release-hygiene-security

- Branch: `codex/A22-p1-release-hygiene-security`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-p1-release-hygiene-security`
- State: `dirty-open-decision`
- Current blocker: dirty 27
- Owner decision needed from: A22
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.status.txt`
  - `coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.diffstat.txt`
  - `coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.patch`
  - `coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.untracked.txt`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a22-p1-release-hygiene-security",
  "branch": "codex/A22-p1-release-hygiene-security",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-p1-release-hygiene-security",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.status.txt",
    "coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.diffstat.txt",
    "coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.patch",
    "coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a22-us-region-alignment

- Branch: `codex/A22-us-region-alignment`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`
- State: `clean-diverged-open-decision`
- Current blocker: behind 0, ahead 1
- Owner decision needed from: A22
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.status.txt`
  - `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.ahead-log.txt`
  - `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.name-status.txt`
  - `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.diffstat.txt`
  - `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.patch`
  - `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.untracked.txt`
- Allowed final states:
  - owner-approved PR or review package: The owning agent promotes the branch through review without using the dirty root as release source.
  - archive-state record: A25 records the branch as preserved evidence; a real Git tag still needs separate explicit approval.
  - owner-approved branch or worktree retirement: A separately authorized Git operation may retire the branch or remove the worktree after archive review.
  - blocker: A25 records the unresolved owner, branch, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a22-us-region-alignment",
  "branch": "codex/A22-us-region-alignment",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md",
    "coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.status.txt",
    "coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.ahead-log.txt",
    "coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.name-status.txt",
    "coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.diffstat.txt",
    "coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.patch",
    "coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a25-dirty-closure-governance

- Branch: `codex/A25-dirty-closure-governance`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`
- State: `dirty-open-decision`
- Current blocker: dirty 1018
- Owner decision needed from: A25
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A25-dirty-closure-governance.status.txt`
  - `coordination/release-intake/archive/codex-A25-dirty-closure-governance.diffstat.txt`
  - `coordination/release-intake/archive/codex-A25-dirty-closure-governance.patch`
  - `coordination/release-intake/archive/codex-A25-dirty-closure-governance.untracked.txt`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a25-dirty-closure-governance",
  "branch": "codex/A25-dirty-closure-governance",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A25-dirty-closure-governance.status.txt",
    "coordination/release-intake/archive/codex-A25-dirty-closure-governance.diffstat.txt",
    "coordination/release-intake/archive/codex-A25-dirty-closure-governance.patch",
    "coordination/release-intake/archive/codex-A25-dirty-closure-governance.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-a25-full-dirty-compose-verification

- Branch: `codex/A25-full-dirty-compose-verification`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-full-dirty-compose-verification`
- State: `dirty-open-decision`
- Current blocker: dirty 2423
- Owner decision needed from: A25
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.status.txt`
  - `coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.diffstat.txt`
  - `coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.patch`
  - `coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.untracked.txt`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-a25-full-dirty-compose-verification",
  "branch": "codex/A25-full-dirty-compose-verification",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-full-dirty-compose-verification",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.status.txt",
    "coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.diffstat.txt",
    "coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.patch",
    "coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-visualization-production-release

- Branch: `codex/visualization-production-release`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/visualization-production-release`
- State: `dirty-open-decision`
- Current blocker: dirty 16
- Owner decision needed from: A06, A22
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-visualization-production-release.status.txt`
  - `coordination/release-intake/archive/codex-visualization-production-release.diffstat.txt`
  - `coordination/release-intake/archive/codex-visualization-production-release.patch`
  - `coordination/release-intake/archive/codex-visualization-production-release.untracked.txt`
  - `coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md`
  - `coordination/release-intake/archive/codex-visualization-production-release.dirty-diverged.ahead-log.txt`
  - `coordination/release-intake/archive/codex-visualization-production-release.dirty-diverged.diffstat.txt`
  - `coordination/release-intake/archive/codex-visualization-production-release.dirty-diverged.patch`
- Allowed final states:
  - owner-reviewed commit or package extraction: The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package.
  - owner-approved exact-path discard: A separately authorized Git operation discards only approved dirty paths after archive review.
  - evidence archive with retained-worktree blocker: A25 keeps the worktree retained and blocked after preserving patch and untracked evidence.
  - owner-approved worktree removal after dirty state closure: A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed.
  - blocker: A25 records the unresolved owner, worktree, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-visualization-production-release",
  "branch": "codex/visualization-production-release",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/visualization-production-release",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-visualization-production-release.status.txt",
    "coordination/release-intake/archive/codex-visualization-production-release.diffstat.txt",
    "coordination/release-intake/archive/codex-visualization-production-release.patch",
    "coordination/release-intake/archive/codex-visualization-production-release.untracked.txt",
    "coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md",
    "coordination/release-intake/archive/codex-visualization-production-release.dirty-diverged.ahead-log.txt",
    "coordination/release-intake/archive/codex-visualization-production-release.dirty-diverged.diffstat.txt",
    "coordination/release-intake/archive/codex-visualization-production-release.dirty-diverged.patch"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-california-practice-beta-clean

- Branch: `codex/california-practice-beta-clean`
- Path: `/Users/dongpinhu/Desktop/MAIS-MVP-worktrees/MAIS-MVP-california-practice-beta-clean`
- State: `clean-diverged-open-decision`
- Current blocker: behind 12, ahead 1
- Owner decision needed from: A21, A18, A04, A22
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md`
  - `coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.status.txt`
  - `coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.ahead-log.txt`
  - `coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.name-status.txt`
  - `coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.diffstat.txt`
  - `coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.patch`
  - `coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.untracked.txt`
- Allowed final states:
  - owner-approved PR or review package: The owning agent promotes the branch through review without using the dirty root as release source.
  - archive-state record: A25 records the branch as preserved evidence; a real Git tag still needs separate explicit approval.
  - owner-approved branch or worktree retirement: A separately authorized Git operation may retire the branch or remove the worktree after archive review.
  - blocker: A25 records the unresolved owner, branch, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-california-practice-beta-clean",
  "branch": "codex/california-practice-beta-clean",
  "path": "/Users/dongpinhu/Desktop/MAIS-MVP-worktrees/MAIS-MVP-california-practice-beta-clean",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md",
    "coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.status.txt",
    "coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.ahead-log.txt",
    "coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.name-status.txt",
    "coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.diffstat.txt",
    "coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.patch",
    "coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```

## codex-s22-release-hygiene-2026-06-15

- Branch: `codex/s22-release-hygiene-2026-06-15`
- Path: `/Users/dongpinhu/Desktop/MAIS-MVP-worktrees/s22-release-hygiene-2026-06-15`
- State: `clean-diverged-open-decision`
- Current blocker: behind 12, ahead 1
- Owner decision needed from: A22, A10
- Evidence:
  - `coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md`
  - `coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.status.txt`
  - `coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.ahead-log.txt`
  - `coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.name-status.txt`
  - `coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.diffstat.txt`
  - `coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.patch`
  - `coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.untracked.txt`
- Allowed final states:
  - owner-approved PR or review package: The owning agent promotes the branch through review without using the dirty root as release source.
  - archive-state record: A25 records the branch as preserved evidence; a real Git tag still needs separate explicit approval.
  - owner-approved branch or worktree retirement: A separately authorized Git operation may retire the branch or remove the worktree after archive review.
  - blocker: A25 records the unresolved owner, branch, and reason blocking closure.
- Approval template:

```json
{
  "approvalId": "codex-s22-release-hygiene-2026-06-15",
  "branch": "codex/s22-release-hygiene-2026-06-15",
  "path": "/Users/dongpinhu/Desktop/MAIS-MVP-worktrees/s22-release-hygiene-2026-06-15",
  "selectedFinalState": "<one allowed final state from this request>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md",
    "coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.status.txt",
    "coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.ahead-log.txt",
    "coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.name-status.txt",
    "coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.diffstat.txt",
    "coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.patch",
    "coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.untracked.txt"
  ],
  "notes": "<scope, checks, and any exact paths if approving discard/removal>"
}
```
