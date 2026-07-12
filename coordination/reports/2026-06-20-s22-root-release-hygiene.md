# 2026-06-20 S22 Root Release Hygiene Report

Session: S22 production reliability and release engineering lead
S25 input: `coordination/release-intake/2026-06-20-S25-S22-root-release-hygiene-map.md`

## Release Position

Production release should remain paused from the repository root. The direct root deploy guard is working and blocks the current dirty tree. S22 created a pruned staging package for inspection only; it is clean of forbidden paths but not content-approved for deployment.

## Guard Evidence

`npm run release:root-deploy-preflight -- --json` failed with the expected protective block:

- Status entries: 543.
- Tracked modified: 325.
- Tracked deleted: 0.
- Untracked status entries: 218.
- Untracked files: 326.
- Required action: use S22 pruned staging or a clean reviewed release worktree.

Current dirty tree observed after staging checks:

- `git status --porcelain=v1`: 545 collapsed entries.
- `git status --porcelain=v1 -uall`: 653 file entries.
- `git ls-files --others --exclude-standard`: 328 untracked files.

Post-write verification after the S25/S22 reports were created:

- Root deploy preflight still fails protectively.
- Status entries: 546.
- Tracked modified: 325.
- Tracked deleted: 0.
- Untracked status entries: 221.
- Untracked files: 330.
- `git status --porcelain=v1 -uall`: 655 file entries.

## Staging Package

Path:

`/Users/dongpinhu/Desktop/MAIS-MVP/.tmp/vercel-staging/s25-s22-current-root-slice-20260620`

Manifest:

`/Users/dongpinhu/Desktop/MAIS-MVP/.tmp/vercel-staging/s25-s22-current-root-slice-20260620/vercel-staging-manifest.json`

Result:

- `dryRun: false`.
- `fileCount: 1979`.
- `totalBytes: 146106298`.
- `forbiddenPathCount: 0`.
- Exclusion policy active for `data/ease`, `public/question-illustrations`, local secrets, and generated local outputs.
- Explicit checks confirmed `.env.local`, `coordination/`, `node_modules/`, `.git/`, and `public/question-illustrations/` are absent.

This package is suitable as a staging artifact for S22/S25 inspection. It is not suitable for publish until the mixed owner slices are reviewed and validated.

## Preflight Status

- `npm run release:preflight -- --json`: passed disk, E2E isolation, and staging-root checks.
- `npm run release:env-preflight -- --json`: failed before env inventory because Vercel CLI could not load the user after TLS disconnect. No secret values were read or logged.
- Root deploy preflight: failed by design on dirty worktree.

## Required Next Gate

Before any new preview or production release:

1. S25 refreshes the dirty-tree map because concurrent work is active.
2. S22/S10 approve the release-hygiene tooling/config slice.
3. Owning sessions approve one runtime slice at a time.
4. S11 runs focused regression for the chosen runtime slice.
5. S19 reruns redacted Vercel env parity when the CLI/network is healthy.
6. S22 builds from a clean worktree or pruned staging package, never dirty root.

## Non-Actions

S22 did not publish, preview deploy, stage Git files, commit, branch, push, reset, delete, revert, or clean the repository.
