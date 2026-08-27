# A25 Closure Blocker — fix/starship-canonical-root

- Generated at: `2026-08-22T19:37:10Z` (`2026-08-23` Asia/Hong_Kong)
- Final state: `blocker report`
- Branch: `fix/starship-canonical-root`
- Worktree: `/Volumes/Starship/MAIS-MVP/.claude/worktrees/cool-lamarr-a66bd6`
- Branch HEAD: `ee9b5e63fe8e2666850ae5bed7855cffa7d6b7dc`
- Same-name remote tip: `ee9b5e63fe8e2666850ae5bed7855cffa7d6b7dc`
- Merged PR: `#92` (`39f0a8f80829b30cf2027ef662b12924391244b7`)
- Live `origin/main` at classification: `39f0a8f80829b30cf2027ef662b12924391244b7`
- Cleanup authorized: `false`
- Worktree removal authorized: `false`
- Local branch deletion authorized: `false`
- Remote branch deletion authorized: `false`

## Dirty inventory

| Status | Path | Bytes | Git blob | SHA-256 |
|---|---|---:|---|---|
| tracked, unstaged | `.claude/launch.json` | 4,518 | `4c51ce94ce34e70ca3e87fa1049898a2418a8c92` | `de3aab536b297e4e156e545944508cc88bc233aba9013dc32d7f581ac03fbe2c` |
| tracked, unstaged | `next-env.d.ts` | 291 | `64d31b8def9f551326a4d714e500a9aa7705d837` | `d8bbd40664ddf67a6d4634ef0a215bf9f7e8c9425c2f341f4c7fd4c5bcece83c` |
| untracked | `.codex/hooks.json` | 412 | `3fe56d21b1db4715a83e871f8099bc58aba352a3` | `5d2499224b7a00452dec09997bc3a27ac198051299dfd35971d848bc568a52d3` |

The tracked binary-capable patch for `.claude/launch.json` plus `next-env.d.ts` hashes to `d39d40cf3f05f8b887260d98a24c649d3e0febb82ed2bbf014ae447cc4eabe42` with SHA-256. No matching dev server was listening on configured port 3466 at inspection time.

## Ownership and collision finding

The canonical-root fix itself is complete: branch HEAD is a parent of the live-main merge commit for PR #92, and the remote branch exactly contains the local tip. The remaining dirty paths are not one coherent follow-up package:

1. `.claude/launch.json` adds a unique `mais-dev-starship-wt` launcher. This belongs to A10/A22 launch and build-isolation governance. Live `origin/main` independently added `mais-dev-ff-loop` at the same insertion point, so the launcher must be integrated and revalidated on current main rather than committed blindly from this old branch.
2. `next-env.d.ts` changes only the generated route-type reference from `.next/types/routes.d.ts` to `.tmp/starship-wt-session/next-dist/types/routes.d.ts`. The file itself says it should not be edited. It is generated state from the isolated launcher, not an independently reviewable source change.
3. `.codex/hooks.json` is byte-identical to the unresolved guard file already recorded for `security/ai-tutor-voice-moderation` and to the file in local-only commit `a444b0dcc6a86b7a679a48fe14703c98aa0f0cf6`. It remains absent from live GitHub main and requires A10/A25 disposition.

Committing all three paths would mix launcher configuration, generated output, and repository guard policy. Restoring or deleting them now would discard unique owner state before the A10/A22/A25 owners decide whether to promote or archive it.

## Required resolution

Resolve the worktree through one owner-controlled package:

1. transplant the `mais-dev-starship-wt` launcher onto fresh live main alongside the existing `mais-dev-ff-loop` launcher, then review it through an A10/A22 commit or PR;
2. route `.codex/hooks.json` through the shared A10/A25 guard decision, proving exact-byte inclusion if promoted;
3. record `next-env.d.ts` as generated/reproducible output and obtain an evidence-archive or explicit discard disposition; and
4. only after all three paths have recovery proof, clean the original worktree and reassess non-forced removal.

Until then, preserve the files and worktree exactly as found. Do not force-remove it. The merged canonical-root feature remains recoverable from PR #92, remote branch `origin/fix/starship-canonical-root`, and live main.
