# A25 Evidence Archive — codex/a04-practice-two-doors

- Generated at: `2026-08-22T20:07:05Z` (`2026-08-23` Asia/Hong_Kong)
- Stage C final state: `evidence archive`
- Original branch: `codex/a04-practice-two-doors`
- Original worktree: `/Volumes/Starship/MAIS-practice-two-doors-wt`
- Original branch HEAD before archive: `758ebed96cd279c733574e0e0753d72f95bf3ddf`
- Exact archive commit: `f48f118c3da2e5396d5d6a49bd589272dbf264e0`
- Remote recovery ref: `origin/archive/a04-practice-two-doors-pre-review-20260823`
- Semantic review successor: `codex/a04-practice-two-doors-review-20260822`
- Successor pull request: `#141` (`MERGED` at `e9b6243a423e18a5141bf1c6d140fea0f25b7b20`)
- Owner/session: A04 Practice; A11 focused E2E; A25 closure intake
- Worktree removal authorized after manifest validation: `true`
- Local archive branch deletion authorized: `false`
- Remote archive deletion authorized: `false`

## Why this is an archive, not a reviewed feature commit

The original worktree contained five tracked, unstaged Practice files. A related clean review branch had two later commits that preserved the same feature direction and added lifecycle hardening, but only `PracticeQuestPager.tsx` was byte-identical. The other four working files differed from the reviewed tree. A25 therefore did not claim exact supersession or push the old branch as a feature PR.

Instead, A25 committed exactly the five original working files as an explicitly labelled archive commit. No generated, untracked, unrelated, or test-output path entered that commit. `git diff --cached --check` passed before commit.

## Exact archived inventory

| Path | Archived Git blob |
|---|---|
| `app/practice/page.tsx` | `d22a58cad1c0e5309ed71be6565eb9e67c95e61f` |
| `app/practice/practiceArenaPageRegressions.test.ts` | `36f1816ea26ff62ddaf78a7a14f9abb6b1993a08` |
| `components/practice/PracticeAdventureArenaShell.tsx` | `0cecdc7e9160b3b267eb2802094996d3ec50b74a` |
| `components/practice/PracticeQuestPager.tsx` | `9a26b8b33895a9ad8798dd5627d668158c2d96f7` |
| `components/practice/practiceAdventureArenaShell.test.ts` | `e7a4a4234f3ab4f7e813667054f4228b97d40c3b` |

Archive commit `f48f118c3d` records 1,263 insertions and 566 deletions across exactly those five paths. The local branch now tracks the remote archive ref, and the local/remote tips are identical.

## Semantic successor evidence

The review branch was brought forward with a non-rebase merge of live `origin/main` and kept an eight-path PR diff: five Practice files plus three focused E2E helper/spec updates. Verification performed on that successor:

- focused Practice source-contract tests: 53/53 passed before and after live-main merge;
- `npm run type-check`: passed after live-main merge;
- Playwright discovery: five targeted Practice entry/navigation tests;
- bundled-Chromium E2E: four tests passed in the combined run; the fifth hit one final-request `ECONNRESET` and then passed 1/1 on isolated retry;
- PR #141 is open and `MERGEABLE`; GitHub checks were in progress at archive time.

The semantic successor does not replace the archive as exact recovery evidence until the owner explicitly decides the old bytes are no longer needed. Therefore retain both the local archive branch and the remote archive ref even after the old worktree is removed.

## Recovery

```sh
git fetch origin archive/a04-practice-two-doors-pre-review-20260823
git worktree add /Volumes/Starship/MAIS-practice-two-doors-recovered-wt f48f118c3da2e5396d5d6a49bd589272dbf264e0
```

The old worktree may be removed only with plain `git worktree remove` after rechecking that it is clean and both archive refs resolve to `f48f118c3d`. Do not delete the local branch or GitHub archive ref in this stage.

## Post-archive closure

At `2026-08-22T20:08:51Z`, A25 revalidated the JSON manifest, clean worktree state, local branch tip, upstream archive tip, GitHub archive tip, and absence of a `node`/`npm`/`next` process using the path. Plain non-forced `git worktree remove /Volumes/Starship/MAIS-practice-two-doors-wt` then succeeded. `git worktree prune --dry-run --verbose` reported no leftover registration for that path.

The local branch `codex/a04-practice-two-doors` and GitHub ref `archive/a04-practice-two-doors-pre-review-20260823` both remain at `f48f118c3d`. No local branch or GitHub remote branch was deleted.

## Semantic-successor PR closure

At `2026-08-22T20:25:08Z`, all required PR #141 checks were successful and the PR head remained exactly `a1379c643f3e18d43a137f30593135375b7bcac0`. A25 merged it with the exact-head guard. GitHub recorded merge commit `e9b6243a423e18a5141bf1c6d140fea0f25b7b20`, and live `origin/main` contains the reviewed head.

GitHub automatically deleted the PR head branch despite this stage's remote-retention policy. A25 immediately recreated `origin/codex/a04-practice-two-doors-review-20260822` at the exact reviewed head. After clean/ref/process checks, plain non-forced removal closed `/Volumes/Starship/MAIS-a04-practice-two-doors-review-wt`, and the merged local review branch was deleted with `git branch -d`. The recreated GitHub head branch and the separate evidence archive remain recoverable; no GitHub branch was intentionally deleted by A25.
