# A25 Next Owner Authorized Command Manifest

Generated: 2026-07-05T11:15:39.156Z

Dirty map signature: `fc405946dbb9033f749aa5e537f14edc23d82355d6b8e796759a4856fcbefeef`

Expanded dirty entries: 4737

Source execution preview: `coordination/release-intake/latest-A25-next-owner-authorization-execution-preview.json`

This is a manifest-only safety bridge from validation into owner-approved execution review. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup. A separate owner instruction must name the exact approval ID and exact command before anything can execute.

## Summary

- Starter rows: 71
- Valid authorization rows: 7
- Pending authorization rows: 64
- Invalid authorization rows: 0
- Command preview rows: 6
- Authorized candidate rows: 7
- Ready for separate instruction rows: 6
- Blocked candidate rows: 1
- Pre-authorization ready rows: 71
- Pre-authorization attention rows: 0
- Cleanup-authorized rows: 0
- Executable rows: 0

## Candidates

| Approval ID | Owner | Status | Command | CWD | Blockers |
| --- | --- | --- | --- | --- | --- |
| `wave01-resync-02-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-json` | A25 git hygiene and release intake | ready-for-separate-instruction | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json` | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance` | separate owner execution instruction is still required |
| `wave01-resync-03-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-md` | A25 git hygiene and release intake | ready-for-separate-instruction | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md` | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance` | separate owner execution instruction is still required |
| `wave01-resync-04-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-json` | A25 git hygiene and release intake | ready-for-separate-instruction | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json` | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance` | separate owner execution instruction is still required |
| `wave01-resync-05-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-md` | A25 git hygiene and release intake | ready-for-separate-instruction | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md` | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance` | separate owner execution instruction is still required |
| `wave01-resync-06-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-json` | A25 git hygiene and release intake | ready-for-separate-instruction | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json` | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance` | separate owner execution instruction is still required |
| `wave01-resync-07-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-md` | A25 git hygiene and release intake | ready-for-separate-instruction | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md` | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance` | separate owner execution instruction is still required |
| `codex-a16-research-evidence-closure` | A16 | blocked | `none` | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A16-research-evidence-closure` | no exact command is available; use work-order/manual package review; separate owner execution instruction is still required |

## Boundary

This manifest is non-executable. It exists so A25/A22 can review exact commands after owner authorization and before any separate execution instruction is accepted.
