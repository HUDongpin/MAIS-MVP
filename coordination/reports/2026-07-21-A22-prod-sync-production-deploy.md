# 2026-07-21 A22 Production Sync Release Report

- Agent: A22 production reliability and release engineering.
- Supporting ownership: A25 git hygiene and release intake; A10 reporting; A19 redacted environment readiness; A20 game-runtime asset audit; A11 live-domain baseline.
- Run id: `20260721-prod-sync`.
- Requested target: Vercel production for `https://www.mais.ac` and `https://www.mais.hk`.
- Status: **BLOCKED / NO DEPLOYMENT CREATED OR PROMOTED**.

## Source And Release Intake

- Branch: `main`.
- Release candidate HEAD: `7356e3836cbe93c1e5af45348b484366bfc6361f`.
- Commit: `chore(release): A25 dirty-tree map evidence for 20260721-prod-sync`.
- Remote parity before the dry run: `origin/main...HEAD = 0/0`.
- Root status before the dry run: clean.
- Strict worktree lifecycle gate: one worktree; zero dirty, diverged, prunable, or indeterminate entries.
- Dated A25 evidence:
  - `coordination/release-intake/2026-07-21-A25-dirty-tree-map-20260721T110005Z.json`
  - `coordination/release-intake/2026-07-21-A25-dirty-tree-map-20260721T110005Z.md`
- Map generated: `2026-07-21T11:00:06.360Z` (`2026-07-21 19:00:06.360 HKT`).
- Reason: `production sync 20260721 (main@dd2c2bef64)`.
- Status signature: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- Dirty, unmapped, ambiguous, and secret-quarantine counts: `0`.
- Freshness: `node scripts/refresh-dirty-tree-map.mjs --assert-current --max-age-minutes 60 --json` passed immediately before the production dry run.

## Dry-Run Result

Command requested:

```bash
npm run vercel:production -- --dry-run --json --run-id 20260721-prod-sync
```

Result: exit `1` before build or staging. The canonical root is frozen by the A22 release-source guard even when clean. The supported path is a separate clean worktree or clone; the guard intentionally rejects attempts to relabel the canonical root as owner-approved pruned staging.

Because the command stopped before the build/staging phases, it produced no trustworthy `localBuildGate`, `stagingFileCount`, `stagingTotalBytes`, or `forbiddenPathCount`. A direct read-only staging audit was then run:

```bash
node scripts/prepare-vercel-staging.mjs --dry-run --json --run-id 20260721-prod-sync
```

Result: exit `1` with `Required deploy input is missing or unreadable: public/auth`. The same tracked staging manifest also requires absent `public/forum-assets` and `public/games` directories.

## Staging And Runtime Blockers

1. `public/auth` and `public/forum-assets` are stale required-directory entries. Their six image files were added by `4ab525a399` and deliberately removed by `7de8503d6d` (`chore(content): exclude unverified promotional assets`). Current code has no references to those filenames, so they must not be restored merely to satisfy staging.
2. `public/games` is a real runtime release blocker. Current code references five absent image files used by Math Match Quest, Math Virus Blaster, and Mighty Tank Battle. Both production domains currently serve those five URLs as `image/png` with HTTP `200`.
3. Each live game-image SHA-256 exactly matches its corresponding blob in preservation commit `c0ec06760d21bef754fa1f4f9da7d743271465b7`. The bytes are reproducible, but that commit is a pending-workspace snapshot rather than an approved content promotion onto `main`.
4. Deploying current HEAD without those files would remove visible artwork from live game routes. In addition, current HEAD redirects `/games/math-match-quest` to a student slug that its validator rejects, creating a separate route regression.
5. Local dashboard and AI Tutor production-smoke authentication are not configured in the current shell. Vercel Production required variable names passed the redacted `15/15` inventory; no secret values were printed or recorded.

## Current Production Baseline And Rollback Target

As of `2026-07-21 19:11:58 HKT`, both requested aliases still resolve to the same unchanged Ready deployment:

- Deployment id: `dpl_2oNoRhBQMyn1EUDkHEQ61S2BSNtj`.
- Deployment URL: `https://mais-j1om674we-peter-dongpin-hu-s-projects.vercel.app`.
- Created: `2026-07-13 15:25:38 HKT`.
- `https://www.mais.ac`: HTTP `200`; no redirect; title `MAIS`.
- `https://www.mais.hk`: HTTP `200`; no redirect; title `MAIS`.
- Baseline home ETag on both aliases: `a3d3777bfb5678e23f68726cab3c02b2`.

No rollback action is required because no new Vercel deployment was created, no promotion occurred, and neither production alias moved.

## Required Resolution Before Retry

Recommended release-preserving resolution:

1. A22/A10 remove only the obsolete `public/auth` and `public/forum-assets` requirements from the staging manifest.
2. The owner and A20 approve provenance for the five exact game blobs already serving production; then restore and track those five files in a reviewed release slice and replace the broad `public/games` directory check with an explicit required-file manifest.
3. Fix or explicitly accept the Math Match Quest redirect/slug regression.
4. Commit and push the reviewed fix, regenerate and commit fresh A25 evidence, and confirm `origin/main...HEAD = 0/0`.
5. Run both production commands from a non-canonical clean release source with approved dashboard and AI Tutor smoke authentication.
6. After promotion, independently inspect and smoke `www.mais.ac` and `www.mais.hk`; the automated post-promotion script covers only one configured production base URL.

## Final Disposition

- Release package state: `blocker report`.
- Vercel publish: not attempted after protective gates failed.
- Production aliases: unchanged.
- Secret handling: only variable names and redacted present/missing states were inspected; no credentials, cookies, tokens, database URLs, project ids, or org ids are recorded here.
