# A25 evidence archive — Next 16.3 parity HOLD

- Generated: `2026-08-22T20:24:08Z` (`2026-08-23` Asia/Hong_Kong)
- Stage C final state: **evidence archive**
- Original branch: `codex/next16-3-parity`
- Original worktree: `/Volumes/Starship/MAIS-MVP-next16-3-parity`
- Original branch head: `dc7ae1429f050412111e0b50eddbc7afa6838671`
- Archive commit: `02a6145dd9ccac86c7f4f4571a32ae9eac14f6d8`
- GitHub archive ref: `origin/archive/next16-3-parity-hold-20260823`
- GitHub PR for the original branch: none

## Decision

Preserve the exact Next 16.3 migration package as a remote evidence archive, with its recorded `HOLD` state intact. Do not open a merge PR or treat it as a reviewed release package.

Live `origin/main` still declares Next `15.5.23` and React/React DOM `^19.1.0`; the archived tree declares Next `16.3.0` and React/React DOM `19.2.8`. The original branch head was contained by live main, but none of the 29 dirty path endpoints exactly matched live main. The archive records 28 Git change entries because `middleware.ts -> proxy.ts` is one rename, with 727 insertions and 236 deletions.

The preserved A22 session log records substantial historical local verification, but it also explicitly records release state `HOLD`: A12 runtime review was outstanding, one browser assertion remained unresolved, preview and soak were not run, and the complete release gate was not green. Those are integration gates, not reasons to lose the work.

## Owner grouping

| Owner lane | Archived concern |
|---|---|
| A22 | Next/build/Playwright lifecycle, release-gate implementation and historical evidence |
| A10 | package, lockfile, CI, config, release-governance manifests and scripts |
| A12 | `middleware.ts -> proxy.ts` and two Next 16 cache-invalidation API changes |
| A05 | lesson access policy compatibility test |
| A11 | Playwright worker-cleanup contract and unresolved browser gate |
| A25 | exact archive, remote recovery ref, and worktree closure evidence |

## Archive verification

- Secret-pattern gate: PASS.
- `git diff --check`: PASS.
- Exact working-tree comparison: 0 of 29 path endpoints equal live `origin/main`.
- Archive commit and GitHub archive ref: identical at `02a6145dd9ccac86c7f4f4571a32ae9eac14f6d8`.
- Post-commit worktree status: clean.
- Current-turn product tests: NOT RUN; the archive retains the historical A22 verification log but remains explicitly non-releaseable.
- No deploy was attempted and no GitHub remote branch was deleted.

## Recovery

```sh
git fetch origin archive/next16-3-parity-hold-20260823
git worktree add /Volumes/Starship/MAIS-next16-3-parity-recovered-wt 02a6145dd9ccac86c7f4f4571a32ae9eac14f6d8
```

Future integration must begin from current `origin/main`, selectively replay this archive, repeat A12/A10/A11/A22 review, run a clean preview and soak, and obtain a fresh complete release gate. The original worktree may be removed only with plain non-forced removal after clean/ref/process checks. Retain both archive refs.

## Post-archive closure

At `2026-08-22T20:24:24Z`, A25 revalidated the manifest, clean status, identical local and GitHub archive tips, and absence of any process whose cwd was inside the worktree. Plain non-forced `git worktree remove /Volumes/Starship/MAIS-MVP-next16-3-parity` succeeded. The path and registration are absent.

The local branch `codex/next16-3-parity` and GitHub archive ref remain at `02a6145dd9ccac86c7f4f4571a32ae9eac14f6d8`. No local or GitHub remote branch was deleted.
