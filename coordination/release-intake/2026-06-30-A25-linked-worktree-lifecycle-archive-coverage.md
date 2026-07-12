# 2026-06-30 A25 Linked Worktree Lifecycle Archive Coverage

- Date: 2026-06-30 22:36:04 HKT
- Agent ID: A25 git hygiene and release intake
- Scope: linked-worktree lifecycle evidence only
- Result: archive evidence complete for all currently dirty or clean-diverged linked worktrees; physical cleanup remains blocked pending separately authorized Git actions.

## Current Inventory

- Root dirty entries: 2442.
- Worktrees listed: 24.
- Physical lifecycle closure decisions: 22.
- Dirty open physical decisions: 17, including root `main`.
- Clean-diverged open physical decisions: 5.
- Root `main` is excluded from linked-worktree archive tarballs because it is governed by owner pathspec packages, the effective disposition queue, and release-source clean gates.

## Archive Coverage

- Manifest: `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.json`.
- Manifest markdown: `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`.
- Manifest generated: 2026-06-30T14:28:56.434Z.
- Archived linked entries: 21.
- Dirty linked worktrees archived: 16 of 16.
- Clean-diverged linked branches archived: 5 of 5.
- Clean-diverged untracked proof files: 5 of 5.
- Archived dirty status entries across linked worktrees: 6546.
- Archived untracked entries across linked worktrees: 5284.
- Tracked patch bytes across archive entries: 63716427.
- Compressed untracked archive bytes: 176695815.
- Clean-diverged ahead commits represented in archive entries: 13.
- Archive directory size: 233M.

## Dirty Linked Worktrees Archived

| Branch | Status entries | Untracked entries | Untracked tar bytes |
| --- | ---: | ---: | ---: |
| `codex/A01-app-shell-closure` | 26 | 9 | 6129370 |
| `codex/A01-shell-lazy-load` | 8 | 5 | 19806 |
| `codex/A06-manim-three-closure` | 351 | 288 | 654168 |
| `codex/A06-visualization-closure` | 437 | 373 | 827460 |
| `codex/A07-A15-A08-ai-adaptive-types` | 30 | 13 | 15088 |
| `codex/A07-ai-tutor-classroom-switches` | 82 | 70 | 294925 |
| `codex/A08-A12-shared-contract-closure` | 185 | 139 | 9225225 |
| `codex/A10-A22-A08-A12-A06-compose-20260628` | 737 | 495 | 3214076 |
| `codex/A12-google-oauth-login` | 16 | 13 | 18453 |
| `codex/A12-userstore-storage-contract` | 170 | 133 | 9218265 |
| `codex/A22-missing-module-release-slice` | 1016 | 678 | 7387743 |
| `codex/A22-next-15-5-19-audit` | 4 | 2 | 2479 |
| `codex/A22-p1-release-hygiene-security` | 27 | 22 | 39426 |
| `codex/A25-dirty-closure-governance` | 1018 | 996 | 23043678 |
| `codex/A25-full-dirty-compose-verification` | 2423 | 2033 | 116389130 |
| `codex/visualization-production-release` | 16 | 15 | 216523 |

## Clean-Diverged Linked Branches Archived

| Branch | Ahead commits | Artifact prefix |
| --- | ---: | --- |
| `codex/A10-A22-release-governance` | 2 | `coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged` |
| `codex/A19-vercel-postgres-region` | 8 | `coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged` |
| `codex/A22-us-region-alignment` | 1 | `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged` |
| `codex/california-practice-beta-clean` | 1 | `coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged` |
| `codex/s22-release-hygiene-2026-06-15` | 1 | `coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged` |

## Owner Decision Boundary

This report records evidence coverage only. It does not authorize staging, committing, tagging, pushing, pruning, deleting, resetting, reverting, cleaning, deploying, or removing worktrees.

Allowed next actions still require explicit owner approval by exact branch, worktree, or pathspec package:

- A25/A10/A22/effective owner packages: review root dirty packages and produce clean commits, exact-path discards, archive-only blockers, or package-specific blocker reports.
- Dirty linked worktrees: owning agents review the archived patch and untracked tarball, then produce a reviewed commit/package extraction, exact discard approval, retained-worktree blocker, or owner-approved worktree removal after dirty state is resolved.
- Clean-diverged linked branches: owning agents review the ahead-log and patch evidence, then produce an owner-approved PR/review package, archive-state record, explicit tag instruction, or branch/worktree retirement approval.
- A22 release engineering must continue to treat root `main` as a non-release source until `node coordination/release-intake/assert-release-source-clean.mjs` passes from a clean source.

## Verification Notes

- `git status --porcelain -uall | wc -l`: 2442.
- `git worktree list | wc -l`: 24.
- `find coordination/release-intake/archive -maxdepth 1 -name '*.untracked.tar.gz' -print | wc -l`: 16.
- `find coordination/release-intake/archive -maxdepth 1 -name '*.clean-diverged.metadata.json' -print | wc -l`: 5.
- `du -sh coordination/release-intake/archive`: 233M.
- A25 refresh commands regenerated the dirty map, worktree hygiene dashboard, owner disposition queue, unmapped owner/manual proposals, effective owner overlay, effective disposition queue, lifecycle ledger, decision requests, closure runbook, owner approval matrix, and physical lifecycle closure decision packet.
- Non-strict/currentness gates passed: dirty-map assert-current, owner pathspecs, unmapped owner/manual proposals, effective owner overlay, effective disposition queue, lifecycle ledger, lifecycle requests, lifecycle closure runbook, owner approval matrix, secret/env quarantine, disposition evidence, and physical lifecycle decision packet.
- Expected hard gates remain red: `node coordination/release-intake/assert-release-source-clean.mjs` fails because root `main` has 2442 expanded dirty entries; `node coordination/release-intake/assert-worktree-lifecycle.mjs --strict` fails with 17 dirty open physical decisions and 5 clean-diverged open physical decisions.
- Next required A25 step: owner-approved physical closure actions by exact branch, worktree, or owner pathspec package. No destructive cleanup is authorized by this report.
