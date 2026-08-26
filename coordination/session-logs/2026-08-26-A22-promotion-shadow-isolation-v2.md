# 2026-08-26 A22 Promotion Shadow Isolation Preflight v2

- Owner: A22 production reliability and release engineering lead
- Branch: `codex/a22-promotion-shadow-isolation-v2-20260826`
- Worktree: `.worktrees/a22-promotion-shadow-isolation-v2-20260826`
- Target PR: draft PR #162
- Created: 2026-08-26 (Asia/Hong_Kong)
- Expected closeout: 2026-08-27
- Baseline: A23 composition commit `a743a49489` on top of target runtime baseline `d7ce01d9406d717451b7c43b6d7c48d70fd99ec1`
- Declared slice: clean build/CI isolation, generated-sidecar restoration, and non-live release evidence.
- Hard boundary: no Preview, Vercel, provider, database, production write, alias, or live promotion.

## Result

- `npm ci`, `npm run type-check`, and the production Next build passed in this clean owner worktree.
- The first build exposed a tracked `next-env.d.ts` side effect. The build wrapper now captures the byte preimage and restores it in `finally`; 47 build/path-safety tests and a second 225-page production build passed with the tracked preimage restored.
- No deployment occurred. No candidate source or runtime/live source byte changed as part of the build proof.
- A22 post-run confirmation remains required after the real Shadow receipt exists.
