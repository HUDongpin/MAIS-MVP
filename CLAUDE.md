# MAIS-MVP — Session contract

Multiple Claude/agent sessions run concurrently against this repository.
These rules exist because branch state and uncommitted files are shared per
checkout: one session's `git switch`/`stash`/`add -A` silently corrupts the
others' in-progress work.

## Working-tree discipline

- One session = one worktree = one branch.
- The primary root (`/Users/dongpinhu/Desktop/MAIS-MVP`) is INTEGRATION-ONLY:
  review, merge, run gates, answer questions. Before editing any file for
  feature work here, create/enter a git worktree and do the work there.
  Convention: sibling dirs `../MAIS-<scope>-wt` with `node_modules` symlinked
  from the root.
- Never run `git switch`, `git checkout`, or `git stash` in the primary root —
  it moves HEAD/stash state under every other live session. Use `git restore`
  for files; use a worktree for branches.
- Never `git add -A` / `git add .` anywhere. Inspect `git status`, stage only
  files/hunks you authored this session (shared hotspots where foreign edits
  land: `lib/server/userStore.ts`, `types/index.ts`, `data/ccssStandards.ts`).
- First commit on a new branch: push with `-u` immediately.
- After a branch lands: remove its worktree the same day
  (`git worktree remove <dir> && git worktree prune`) — stale or dirty
  worktrees fail the A25 release lifecycle gate and block production deploys.
- Dev servers: run from THIS checkout's directory with a unique port and an
  isolated `NEXT_DIST_DIR` (the managed preview server roots at the main repo
  and will silently serve the wrong code for worktree branches).

Hard guardrails back the two most dangerous rules: `.claude/settings.json`
denies `git add -A`/`git add .`, and `scripts/claude-root-git-guard.mjs`
blocks switch/checkout/stash when run from the primary root.

Full agent role/ownership system: `AGENTS.md`. Production deploys: `RELEASE.md`.
