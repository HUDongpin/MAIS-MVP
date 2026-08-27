# A25 evidence archive — HK full-math lesson QA WIP

- Generated: `2026-08-22T20:38:25Z` (`2026-08-23` Asia/Hong_Kong)
- Stage C final state: **evidence archive**
- Original branch: `codex/a18-hk-all-math-lesson-qa`
- Original worktree: `/Volumes/Starship/MAIS-hk-content-qa-wt`
- Original branch head: `3f8f12c4d3fd2efe938d1b07cab6289315f108dd`
- Archive commit: `47dc3395521044ac8728d790c90d30516b9c94fa`
- GitHub archive ref: `origin/archive/a18-hk-all-math-lesson-qa-wip-20260823`
- GitHub PR for the original branch: none
- Repository visibility: `PRIVATE`

## Decision

Preserve the exact 84-path curriculum/content QA tree as a private evidence archive. Do not open a PR from this mixed worktree and do not claim full HK curriculum acceptance.

The archive records 632,411 insertions and 1,247 deletions. Most insertions are derived full-question-bank JSON/CSV evidence, but the same tree also changes live lesson/question/topic/RAG data, lesson/practice rendering, answer grading, persistence, adaptive routes, shared types, and content tooling. That crosses A03/A04/A05/A08/A12/A18/A21 ownership and cannot be reviewed as one commit.

The original head is contained by live `origin/main`, but only 1 of 84 resulting worktree blobs exactly matches current main. The HK safe-closeout branch has no exact matching blob among these 84 paths. PR #136 explicitly excluded full Hong Kong curriculum commits, so its merge is not whole-tree absorption evidence.

## Owner grouping

| Owner lane | Archived concern |
|---|---|
| A18 | curriculum alignment, adjudications and QA evidence |
| A03/A04/A05 | grades/topics, live question data, lesson data/rendering |
| A08 | shared types and cross-surface semantics |
| A12/A15 | persistence and adaptive API/data eligibility |
| A21 | historical snapshots, RAG/content-pipeline artifacts and large derived audits |
| A25 | exact archive, private recovery ref, and closure evidence |

## Archive verification

- Secret-pattern gate: PASS.
- Exact cached path count: 84.
- Live-main byte comparison: 1 of 84 paths equal `origin/main`; no whole-tree absorption.
- HK safe-closeout byte comparison: 0 of 84 paths equal `codex/a18-hk-safe-closeout-20260822`.
- Archive commit and GitHub archive ref: identical at `47dc3395521044ac8728d790c90d30516b9c94fa`.
- Post-commit worktree status: clean.
- `git diff --check`: WARNING in preserved derived evidence (six CSV hard-break/trailing-space lines) plus three historical blank-at-EOF findings; these bytes were not rewritten during archival.
- Current-turn product/content tests: NOT RUN; the package remains mixed, stale-main, and explicitly outside PR #136's accepted slices.
- No live data, provider, release, or deployment action was performed.
- No GitHub remote branch was deleted.

## Recovery

```sh
git fetch origin archive/a18-hk-all-math-lesson-qa-wip-20260823
git worktree add /Volumes/Starship/MAIS-hk-content-qa-recovered-wt 47dc3395521044ac8728d790c90d30516b9c94fa
```

Any future use must begin with a fresh-main content diff, separate derived evidence from product paths, and route each live data/API/type/rendering slice to its owner before A18 independent acceptance and A11/A22 release gates. The original worktree may be removed only with plain non-forced removal after manifest, clean/ref, and process checks. Retain both archive refs.

## Post-archive closure

At `2026-08-22T20:39:19Z`, A25 revalidated the manifest, clean status, identical local/private-remote archive tips, and absence of any process whose cwd was inside the worktree. Plain non-forced `git worktree remove /Volumes/Starship/MAIS-hk-content-qa-wt` succeeded. The path and registration are absent.

The local branch `codex/a18-hk-all-math-lesson-qa` and private GitHub archive ref remain at `47dc3395521044ac8728d790c90d30516b9c94fa`. No local or GitHub remote branch was deleted.
