# A25 evidence archive — mixed A05 15-bug loop WIP

- Generated: `2026-08-22T20:33:28Z` (`2026-08-23` Asia/Hong_Kong)
- Stage C final state: **evidence archive**
- Original branch: `codex/a05-15-bug-loop`
- Original worktree: `/Volumes/Starship/MAIS-15-bug-loop-wt`
- Original branch head: `867d17799140e7f45129c928b7af57a540402c75`
- Archive commit: `8c4d06ab2760b82b34ab2946d0688e75b8740e29`
- GitHub archive ref: `origin/archive/a05-15-bug-loop-wip-20260823`
- GitHub PR for the original branch: none
- Repository visibility: `PRIVATE`

## Decision

Preserve the exact mixed worktree as evidence. Do not treat it as one reviewed “15 bug” feature package and do not open a PR from it.

This tree contains 83 changed paths, 55,700 insertions, and 1,537 deletions across lesson/practice behavior, answer matching and persistence, visualization/content QA, production certification, Playwright ownership/provisioning infrastructure, and E2E suites. It also contains an unresolved `Oops.rej`, proving the mechanical browser-runner slice was not cleanly applied. The original branch head is contained by live main, but zero of the 83 working paths exactly match live `origin/main`.

An active clean worktree exists on `codex/a04-a05-fix-15-product-bugs`; A25 inspected it read-only and did not modify it. Zero of this archive's 83 working blobs exactly match that active branch either. Consequently, the active branch is not exact supersession evidence, and this archive is retained independently.

## Owner grouping

| Owner lane | Archived concern |
|---|---|
| A04/A05 | Practice keyboard, LessonView and lesson-world interactions |
| A08/A12 | answer matching, limits/units, question store and submission persistence |
| A06/A18/A21 | visualization evidence and content/solvability tooling |
| A10/A22 | CI, package/config, production certification and very large browser ownership/provisioning machinery |
| A11 | Playwright/E2E regression suites |
| A25 | exact archive, private recovery ref, and closure evidence |

## Archive verification

- Secret-pattern gate: PASS.
- Exact cached path count: 83.
- Live-main byte comparison: 0 of 83 paths exactly equal `origin/main`.
- Active successor byte comparison: 0 of 83 paths exactly equal `codex/a04-a05-fix-15-product-bugs`.
- Archive commit and GitHub archive ref: identical at `8c4d06ab2760b82b34ab2946d0688e75b8740e29`.
- Post-commit worktree status: clean.
- `git diff --check`: WARNING only in preserved `Oops.rej` (two trailing-space lines and one blank line at EOF).
- Current-turn product tests: NOT RUN; this is an incomplete, mixed-owner evidence archive, not an integration candidate.
- The active successor worktree was not changed or closed.
- No GitHub remote branch was deleted.

## Recovery

```sh
git fetch origin archive/a05-15-bug-loop-wip-20260823
git worktree add /Volumes/Starship/MAIS-a05-15-bug-loop-recovered-wt 8c4d06ab2760b82b34ab2946d0688e75b8740e29
```

Any reuse must be split by the owner groups above and replayed selectively onto fresh main. Do not replay `Oops.rej` or the 40k-plus-line browser ownership machinery without a separate design/security review. The original worktree may be removed only with plain non-forced removal after manifest, clean/ref, and process checks. Retain both archive refs.

## Post-archive closure

At `2026-08-22T20:34:56Z`, A25 revalidated the manifest, clean worktree, identical local/private-remote archive tips, and absence of any process whose cwd was inside the worktree. Plain non-forced `git worktree remove /Volumes/Starship/MAIS-15-bug-loop-wt` completed successfully. The path and registration are absent.

The local branch `codex/a05-15-bug-loop` and private GitHub archive ref remain at `8c4d06ab2760b82b34ab2946d0688e75b8740e29`. The active `codex/a04-a05-fix-15-product-bugs` worktree remains untouched. No local or GitHub remote branch was deleted.
