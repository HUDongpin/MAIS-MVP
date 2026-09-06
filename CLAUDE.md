# MAIS-MVP — Session contract

Multiple Claude/agent sessions run concurrently against this repository.
These rules exist because branch state and uncommitted files are shared per
checkout: one session's `git switch`/`stash`/`add -A` silently corrupts the
others' in-progress work.

## Working-tree discipline

- One session = one worktree = one branch.
- The primary root (`/Volumes/Starship/MAIS-MVP`) is INTEGRATION-ONLY:
  review, merge, run gates, answer questions. Before editing any file for
  feature work here, create/enter a git worktree and do the work there.
  Convention: sibling dirs `../MAIS-<scope>-wt` with `node_modules` symlinked
  from the root.
- Never run `git switch`, `git checkout`, `git stash`, `git rebase`, or
  `git reset --hard` in the primary root — it moves HEAD/stash/file state
  under every other live session. Use `git restore` for files; use a
  worktree for branches.
- Never `git add -A` / `git add .` anywhere. Inspect `git status`, stage only
  files/hunks you authored this session (shared hotspots where foreign edits
  land: `lib/server/userStore.ts`, `types/index.ts`, `data/ccssStandards.ts`).
- At branch/worktree creation, record `owner`, `target PR` (number/URL or
  `pending`), `creation date`, and `expected closeout date` in the session log
  or A25 lifecycle record.
- Once branch creation and commits are authorized, push the first valid,
  reviewable commit with `-u` promptly so the only recoverable copy never
  remains local.
  This does not authorize pushing `main`, unrelated refs, local-only work, or
  a push forbidden by a stricter role-specific rule such as A25's mutation ban.
- Keep an open-PR branch until the PR completes or is explicitly closed.
- After a branch lands: prove its linked worktree is clean, then remove that
  worktree the same day (`git worktree remove <dir> && git worktree prune`).
  Never remove a worktree with staged, unstaged, or untracked content.
- A branch with no PR, no recorded owner, and age greater than 7 calendar days
  from its recorded creation date enters the A25 review queue; it is never
  automatically deleted.
- Never use `git stash` for multi-worktree isolation. Never use
  `git branch -D $(...)`, wildcard/bulk branch deletion,
  `git worktree remove --force`, `git clean -fdx`, or `git reset --hard`.
- After every authorized cleanup batch, freshly record local branch, registered
  worktree, dirty worktree, and detached worktree counts plus `origin/main`
  alignment; use a live remote query before claiming remote-main state.
- Dev servers: run from THIS checkout's directory with a unique port and an
  isolated `NEXT_DIST_DIR` (the managed preview server roots at the main repo
  and will silently serve the wrong code for worktree branches).

Hard guardrails mechanically enforce part of this policy:
`.claude/settings.json` denies `git add -A`/`git add .`, and
`scripts/claude-root-git-guard.mjs` blocks switch/checkout/stash/rebase/
hard-reset when run from the primary root. The remaining lifecycle rules are
mandatory process controls even where a script does not yet enforce them.

Full agent role/ownership system: `AGENTS.md`. Production deploys: `RELEASE.md`.
