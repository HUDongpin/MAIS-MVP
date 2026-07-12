# 2026-06-21 S25/S22/S10 Release Hygiene Tooling Report

Sessions: S25 git hygiene and release intake; S22 production reliability and release engineering; S10 tooling, docs, and report.

## Position

The release hygiene tooling/config slice is complete for handoff. No runtime preview or production release was attempted. The repository remains heavily dirty, so runtime release remains paused until S25 refreshes the dirty-tree map immediately before release and S22 uses a clean reviewed worktree or pruned staging path.

## Tooling Changes

- Added `scripts/refresh-dirty-tree-map.mjs` to generate S25 owner/slice dirty-tree maps and assert that the latest map matches current `git status --porcelain=v1 -uall`.
- Updated `scripts/release-env-guard.mjs` with `runtime-release` preflight and S25 dirty-tree map freshness checks.
- Updated production publish preflight so it requires a current S25 dirty-tree map before env/root/staging checks.
- Updated `scripts/deploy-vercel-preview.mjs` so direct preview wrapper use runs runtime-release preflight.
- Added package scripts:
  - `release:dirty-map`
  - `release:runtime-preflight`
- Kept `vercel:preview` routed through the guarded wrapper.

## Runtime Release Gate

Before any runtime preview or production release:

1. S25 runs `npm run release:dirty-map -- --reason "runtime release preflight"`.
2. S22 runs `npm run release:runtime-preflight -- --json`.
3. For production, S22/S19 also run publish/env preflight and record redacted env parity.
4. S11 and owning feature/content sessions provide focused regression evidence for the chosen runtime slice.
5. S22 releases only from a clean reviewed worktree or pruned staging package, never direct dirty root.

The dirty-tree map guard defaults to a 120-minute freshness window via `MAIS_DIRTY_TREE_MAP_MAX_AGE_MINUTES`; runtime owners can lower it for a stricter release window.

## Verification

- `node --test scripts/release-env-guard.test.mjs`: passed.
- `node scripts/prepare-vercel-staging.mjs --dry-run --json --run-id s25-s22-s10-release-hygiene-20260621`: passed with `forbiddenPathCount: 0`.
- `npm run release:dirty-map -- --json --run-id s25-s22-s10-release-hygiene-20260621 --reason "runtime release preflight"`: refreshed latest S25 map.
- `npm run release:runtime-preflight -- --json`: passed against latest S25 map.
- `npm run release:preflight -- --json`: passed disk, isolated E2E root, and staging-root checks.
- `npm run release:root-deploy-preflight -- --json`: failed protectively because the root worktree is dirty, as intended.

## Latest S25 Map

- Latest JSON: `coordination/release-intake/latest-S25-dirty-tree-map.json`.
- Latest Markdown: `coordination/release-intake/latest-S25-dirty-tree-map.md`.
- Run artifact: `coordination/release-intake/2026-06-21-S25-dirty-tree-map-s25-s22-s10-release-hygiene-20260621.md`.
- Treat the latest JSON/Markdown map as the source of truth for live counts because concurrent sessions are still moving the dirty tree.

## Non-Actions

No Git staging, commit, branch, push, merge, rebase, reset, delete, revert, cleanup, preview deploy, production deploy, or secret inspection was performed.
