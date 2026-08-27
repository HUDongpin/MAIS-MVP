# A25 lifecycle record — main reference worktree

## Worktree registration (CLAUDE.md working-tree discipline)

| Field | Value |
| --- | --- |
| Path | `/Volumes/Starship/MAIS-main-wt` |
| Branch | `main` (fast-forwarded to `origin/main`) |
| Owner | Dongpin HU (Peter) — created by Claude Code session on request |
| Target PR | n/a — reference/integration checkout, not a feature branch |
| Creation date | 2026-08-27 |
| Expected closeout | Open-ended while it serves as the on-main reference checkout. Review 2026-09-27 (30 days) and remove if unused. |
| node_modules | symlink → `/Volumes/Starship/MAIS-MVP/node_modules` |

## Why it exists

The primary root `/Volumes/Starship/MAIS-MVP` sits on `codex/edulab-mais`, which carries
**open PR #161** and is far behind `origin/main`. Because the PreToolUse hook executes
`scripts/claude-root-git-guard.mjs` from the on-disk working tree, that stale branch's copy —
which still names the pre-move `/Users/dongpinhu/Desktop/MAIS-MVP` — makes the guard exit 0 for
every command. The canonical-root fix landed on main in `ee9b5e63fe`.

This worktree provides an on-main checkout **without any HEAD-moving operation in the primary
root**, so PR #161 and the root's 79 uncommitted entries are untouched.

## Verification at creation

Guard behaviour, exercised by piping simulated PreToolUse payloads at the worktree's copy:

| cwd | `git switch` | `git stash` | `git reset --hard` | `git rebase` |
| --- | --- | --- | --- | --- |
| `/Volumes/Starship/MAIS-main-wt` (linked worktree) | allow | allow | allow | — |
| `/Volumes/Starship/MAIS-MVP` (primary root) | **block** | **block** | **block** | **block** |

Linked worktrees are exempt by design; the root is protected. Guard's `CANONICAL_ROOT` in this
tree reads `/Volumes/Starship/MAIS-MVP`.

Primary root confirmed unchanged after creation: still `codex/edulab-mais` @ `a0a325f18d`,
4 modified / 75 untracked — identical to pre-creation state.

## Fleet counts at creation (2026-08-27)

| Metric | Count |
| --- | --- |
| Local branches | 126 |
| Registered worktrees | 121 |
| Detached worktrees | 10 |
| Primary root dirty entries | 79 (4 modified, 75 untracked) |
| `origin/main` (live `git ls-remote`) | `f001a9570f` |
| `origin/main` (local ref) | `f001a9570f` |
| This worktree vs `origin/main` | 0 ahead / 0 behind |

Local `main` was 321 commits behind `origin/main` before this worktree fast-forwarded it.
