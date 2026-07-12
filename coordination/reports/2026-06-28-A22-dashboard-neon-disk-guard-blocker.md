# 2026-06-28 A22 Dashboard Neon Disk Guard Blocker

- Responsible roles: A22 production reliability and release engineering, A25 git hygiene and release intake, A11 verification.
- Context: Continuing the dashboard/Neon enterprise fix release path after adding the release-slice handoff.

## Blocker Status

Resolved by scoped generated-artifact cleanup. The staged production preflight was blocked by the A22 disk-space guard:

- `npm run release:staged-publish-preflight`: FAIL
- `npm run vercel:production -- --dry-run --json`: FAIL
- Guard reason: only about 18.0 GB free by the guard calculation; minimum is 20 GB.
- `df -h /Users/dongpinhu/Desktop/MAIS-MVP` reported 16 GiB available on `/System/Volumes/Data`.

This was a release-environment blocker, not a dashboard runtime regression.

## Non-Destructive Evidence Collected

- PASS: `node --test scripts/deploy-vercel-preview.test.mjs scripts/deploy-vercel-production.test.mjs scripts/release-env-guard.test.mjs`
  - Tests: 5 pass, 0 fail.
- PASS: `npm run smoke:dashboard-latency -- --self-test`
- PASS: `npm run type-check`
- PASS: `node --test scripts/cleanup-generated-artifacts.test.mjs`
  - Tests: 1 pass, 0 fail.
- PASS after adding `next-builds` scope: `node --test scripts/cleanup-generated-artifacts.test.mjs`
  - Tests: 2 pass, 0 fail.
- DRY RUN ONLY: `node scripts/cleanup-generated-artifacts.mjs --dry-run`
  - Targets: 4.
  - Reclaimable: about 31.7 GB.
  - Targets listed: `.next`, `.tmp`, and two temporary Playwright tsconfig files.
- DRY RUN ONLY: `npm run clean:vercel-staging -- --json`
  - Targets: 1.
  - Target: `.tmp/vercel-staging`.
  - Reclaimable: about 9.2 GB.
  - No Playwright report, trace, screenshot, video, or `.tmp/e2e-run-*` target was selected.
- DRY RUN ONLY: `npm run clean:next-builds -- --json`
  - Targets: Next build artifacts and `next-dist` directories only.
  - Reclaimable before apply: about 27.4 GB.
  - No Playwright report, trace, screenshot, video, or test-results target was selected.
- APPLIED: `node scripts/cleanup-generated-artifacts.mjs --scope vercel-staging --apply`
  - Removed old Vercel staging packages.
  - Reclaimed about 8.6 GB.
- APPLIED: `node scripts/cleanup-generated-artifacts.mjs --scope next-builds --apply`
  - Removed Next build artifacts and `next-dist` directories.
  - Reclaimed about 27.1 GB.
- APPLIED after final dry-run: `node scripts/cleanup-generated-artifacts.mjs --scope next-builds --apply`
  - Removed two newly generated Next build artifact targets.
  - Reclaimed about 2.6 GB.
- PASS after scoped cleanup: `npm run release:staged-publish-preflight`
  - Free disk: 43.2 GB, above the 20 GB minimum.
- PASS after scoped cleanup: `npm run vercel:production -- --dry-run --json`
  - No deployment performed.
  - Staging file count: 2061.
  - Staging size: 166382905 bytes.
  - Forbidden paths: 0.

## Cleanup Caution

Broad cleanup was not applied. The `.tmp` directory still contains Playwright reports, traces, screenshots, and videos from other A11/A22 evidence runs. The applied cleanup scopes avoided those evidence paths.

Safer narrow cleanup paths are now available as dry runs:

- `npm run clean:vercel-staging -- --json`
- `npm run clean:next-builds -- --json`

These narrow scopes target old Vercel staging packages and Next build artifacts while leaving Playwright evidence directories out of scope.

Large generated directories observed under `.tmp` include:

- `.tmp/vercel-staging`: about 8.7 GB.
- `.tmp/next-build-cache-backups`: about 3.4 GB.
- `.tmp/e2e-isolated`: about 3.1 GB.
- Several `.tmp/e2e-run-*` directories around 2.5-2.6 GB each.
- `.tmp/a22-current-version-build-20260627`: about 2.4 GB.
- `.tmp/a22-preview-3137-next`: about 2.2 GB.

## Required Next Step

Before production or preview deployment, A22 should continue to use pruned staging, refresh the A25 dirty-tree map, and rerun:

- `npm run clean:vercel-staging -- --json`
- `npm run clean:next-builds -- --json`
- `npm run release:staged-publish-preflight`
- `npm run vercel:production -- --dry-run --json`
