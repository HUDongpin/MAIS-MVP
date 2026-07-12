# 2026-06-26 A25 Owner Approval Selection

Approved at: 2026-06-26T11:11:01Z

Approved by: owner via Codex thread

## Selected Final States

| Decision ID | Selected final state |
| --- | --- |
| `root-dirty-packages` | `evidence archive` |
| `dirty-visualization-production-release` | `evidence archive with worktree removal blocker` |
| `california-practice-beta-clean` | `archive tag` |
| `s22-release-hygiene-2026-06-15` | `archive tag` |

## Boundary

These are conservative non-destructive final-state approvals. A25 records `archive tag` as an archive-state approval only; it does not create a Git tag without a separate explicit tag instruction.

A25 still must not stage, commit, branch, merge, rebase, push, delete, reset, revert, clean, deploy, or create a Git tag without separate explicit approval for that exact operation.
