# A25 lifecycle record — worktree sweep automation

| Field | Value |
| --- | --- |
| Worktree | `/Volumes/Starship/MAIS-sweep-wt` |
| Branch | `chore/sweep-merged-worktrees` (pushed, tracking `origin/`) |
| Owner | Dongpin HU (Peter) — authored by Claude Code session on request |
| Target PR | **pending** — branch pushed, PR not yet opened |
| Creation date | 2026-08-27 |
| Expected closeout | on PR merge; remove the worktree the same day |
| node_modules | symlink → `/Volumes/Starship/MAIS-MVP/node_modules` |
| Commit | `520d9f01a2` |

## What it does

`scripts/sweep-merged-worktrees.mjs` — dry run by default, `--apply` to remove.
Retires a linked worktree only when **all** hold: clean per `git status`; holds no git-ignored
content worth keeping; HEAD is an ancestor of `origin/HEAD` **or** the tip is contained in another
ref; no open PR; not the primary checkout, not bare, and not the default branch's own checkout.
Never uses `--force`, and re-checks each tree immediately before removing it.

Flags: `--apply`, `--json`, `--min-age-days N`, `--no-pr-check`.

## Validation

- 16 unit tests (`scripts/sweep-merged-worktrees.test.mjs`), all passing. Policy is a pure function;
  git and filesystem state is resolved by the caller.
- Dry run against the live 52-worktree fleet correctly kept every dirty tree, every open-PR branch
  (#189, #190 detected via `gh`), every branch holding commits found in no other ref, and the
  `main` reference worktree.
- `--apply` exercised end to end on one genuine candidate
  (`codex/a22-parent-production-release-1112f9af`): removed cleanly, and afterwards the branch ref
  survived, the shared `node_modules` was intact, and both the primary root and `MAIS-main-wt` were
  untouched. Fleet 52 → 51.

## Two bugs the dry run caught before any damage

1. **It wanted to retire `main`.** A checkout of the integration branch is merged-by-definition, so
   every other rule voted to delete the reference worktree. Now explicitly guarded and regression-tested.
2. **`.env.local.example` was flagged as a secret.** The name pattern over-matched a tracked example
   file. Ignored-ness is now confirmed with `git check-ignore` rather than inferred from the name.

## Not wired into CI

`package.json` script names are frozen — `scripts/release-governance.test.mjs:2286` deep-equals the
exact set, so **no new script name can be added**. The body of an already-allowlisted script may
change at the cost of recomputing one sha256 at `:2293`, which is a reviewed governance change and
was **not** done here. Until then invoke directly:

```bash
node scripts/sweep-merged-worktrees.mjs            # plan
node scripts/sweep-merged-worktrees.mjs --apply    # remove
```

`scripts/sweep-merged-worktrees.test.mjs` is likewise unwired; run it with
`node --test scripts/sweep-merged-worktrees.test.mjs`.
