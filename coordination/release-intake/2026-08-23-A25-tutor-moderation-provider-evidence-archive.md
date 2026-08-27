# A25 Evidence Archive — feat/tutor-moderation-provider

- Generated at: `2026-08-22T20:15:11Z` (`2026-08-23` Asia/Hong_Kong)
- Stage C final state: `evidence archive`
- Original branch: `feat/tutor-moderation-provider`
- Original worktree: `/Volumes/Starship/MAIS-tutor-moderation-wt`
- Original branch HEAD before archive: `07e993f04484cfc838a374c652f72acba6624dbe`
- Exact archive commit: `919d15eb78d54ad26919c2ce9a8cbfda2e75b1d9`
- Remote recovery ref: `origin/archive/tutor-moderation-provider-pre-hardening-20260823`
- Live-main successor commits: `66d326dc15b66227fb5c080048e82892a9d2f75f`, `5073eb0b9d5f4a7cec1a9479f57d3a8584c3be17`
- Merged successor PR: `#135`
- Owner/session: A07 provider; A12 route integration; A25 closure intake
- Worktree removal authorized after manifest validation: `true`
- Local archive branch deletion authorized: `false`
- Remote archive deletion authorized: `false`

## Classification

The original branch ref itself was 63 commits behind live main and was a live-main ancestor. All five dirty paths now exist in live main, but the evidence split into two classes:

1. `lib/server/tutorModerationProvider.ts` and its test had working blobs that appeared exactly in commits `66d326dc15` and `5073eb0b9d`, both contained by live main.
2. The dirty `resolve/route.ts`, test runner, and moderation tsconfig blobs never appeared in any reachable commit. Their integration intent was later replaced by more complete versions in the merged hardening sequence.

That is strong semantic-successor evidence but not exact whole-worktree absorption. A25 therefore archived the exact five-file tree rather than claiming the old integration was a reviewed feature commit or discarding it.

## Exact archived inventory

| Path | Archived Git blob |
|---|---|
| `app/api/ai-tutor/resolve/route.ts` | `c5ad32382ad96f96c42f9acf3c5a03e5b5f99d6d` |
| `scripts/run-tutor-moderation-tests.mjs` | `b202109f8b65fa36e0378b1adf5c3c221f8d7996` |
| `tsconfig.tutor-moderation.json` | `d8c8a896632dac66dfa43ae17ba46f2988f600ed` |
| `lib/server/tutorModerationProvider.test.ts` | `b7f86e73715ec22b2cb5f674911c92e62efdc4d5` |
| `lib/server/tutorModerationProvider.ts` | `5f0d3796c033652438829a20840ca3e3180ada93` |

Archive commit `919d15eb78` records exactly those five paths: 1,444 insertions and 66 deletions. Before staging, a filename-only secret-pattern gate found no private-key marker or long `sk-` token. `git diff --cached --check` passed. The local branch tracks the archive remote and both tips are identical.

## Recovery

```sh
git fetch origin archive/tutor-moderation-provider-pre-hardening-20260823
git worktree add /Volumes/Starship/MAIS-tutor-moderation-recovered-wt 919d15eb78d54ad26919c2ce9a8cbfda2e75b1d9
```

The original worktree may be removed only with plain non-forced `git worktree remove` after revalidating the report, clean status, both archive tips, and no owner process using the directory. Retain the local branch and GitHub archive ref; remote deletion is a separate, unauthorized stage.

## Post-archive closure

At `2026-08-22T20:16:12Z`, A25 revalidated the JSON manifest, clean status, local and remote archive SHA, and absence of a `node`/`npm`/`next` cwd owner. Plain non-forced `git worktree remove /Volumes/Starship/MAIS-tutor-moderation-wt` succeeded, and the dry-run prune check found no leftover registration for that path.

The local branch `feat/tutor-moderation-provider` and GitHub archive ref remain at `919d15eb78`. No local branch or GitHub remote branch was deleted.
