# A25 evidence archive — HK visualization labs loop WIP

- Generated: `2026-08-22T20:39:56Z` (`2026-08-23` Asia/Hong_Kong)
- Stage C final state: **evidence archive**
- Original branch: `codex/a06-hk-visualization-labs-loop`
- Original worktree: `/Volumes/Starship/MAIS-hk-viz-labs-wt`
- Original branch head: `3f8f12c4d3fd2efe938d1b07cab6289315f108dd`
- Archive commit: `d5595131afb3028e769689998e7a67090865afae`
- GitHub archive ref: `origin/archive/a06-hk-visualization-labs-loop-wip-20260823`
- GitHub PR for the original branch: none
- Repository visibility: `PRIVATE`

## Decision

Preserve the exact 182-path HK visualization/runtime/acceptance tree as a private evidence archive. Do not open a PR from this worktree and do not claim exhaustive HK browser or curriculum acceptance.

The archive records 202,564 insertions and 1,678 deletions. It combines production visualization components, HK and mainland models, live curriculum/question/RAG changes, session API/outbox/state semantics, generated session catalog, Playwright config, and more than 100 large machine-acceptance/oracle/ledger files. This is not one reviewable A06 feature slice.

The original head is contained by live main, but only 1 of 182 resulting worktree blobs exactly matches current `origin/main`; none matches the HK safe-closeout branch. PR #136 merged only two bounded HK visualization session-contract paths and explicitly excluded superseded HK outbox/full curriculum work. It therefore does not absorb this whole tree.

## Owner grouping

| Owner lane | Archived concern |
|---|---|
| A06 | HK visualization components, semantic controls/models and runtime routing |
| A18/A03/A04/A05 | curriculum fit and mixed live lesson/question/topic changes |
| A08/A12/A15 | shared state, visualization-session API/outbox/persistence and adaptive eligibility |
| A11/A22 | very large browser acceptance, process/ledger/oracle contracts and release harness |
| A21 | historical/RAG/content-derived artifacts |
| A25 | exact archive, private recovery ref, and closure evidence |

## Archive verification

- Secret-pattern scan: no private key or provider credential. One `sk-...` match was inspected with the value redacted and is an explicit synthetic secret in a diagnostic-redaction test fixture.
- Exact cached path count: 182.
- Live-main byte comparison: 1 of 182 paths equal `origin/main`; no whole-tree absorption.
- HK safe-closeout byte comparison: 0 of 182 paths equal `codex/a18-hk-safe-closeout-20260822`.
- Archive commit and GitHub archive ref: identical at `d5595131afb3028e769689998e7a67090865afae`.
- Post-commit worktree status: clean.
- `git diff --check`: three preserved warnings (two blank-at-EOF findings and one trailing space in a dependent-math contract type).
- Current-turn runtime/browser/content tests: NOT RUN; this is a stale-main, mixed-owner evidence archive, not an integration/release candidate.
- No browser authorization ledger, provider, live data, or deployment was mutated.
- No GitHub remote branch was deleted.

## Recovery

```sh
git fetch origin archive/a06-hk-visualization-labs-loop-wip-20260823
git worktree add /Volumes/Starship/MAIS-hk-viz-labs-recovered-wt d5595131afb3028e769689998e7a67090865afae
```

Any future use must start from fresh main, separate product runtime from content and acceptance machinery, route the session/state/API paths to A08/A12/A15, obtain A18 curriculum review, and run a new bounded A11/A22 browser/release package. The original worktree may be removed only with plain non-forced removal after manifest, clean/ref, and process checks. Retain both archive refs.

## Post-archive closure

At `2026-08-22T20:41:13Z`, A25 revalidated the manifest, clean status, identical local/private-remote archive tips, and absence of any process whose cwd was inside the worktree. Plain non-forced `git worktree remove /Volumes/Starship/MAIS-hk-viz-labs-wt` succeeded. The path and registration are absent.

The local branch `codex/a06-hk-visualization-labs-loop` and private GitHub archive ref remain at `d5595131afb3028e769689998e7a67090865afae`. No local or GitHub remote branch was deleted.
