# 2026-06-28 A22/A25 Dashboard Neon Release Slice Handoff

- Responsible roles: A02 dashboard UI, A12 backend/API/storage, A17 gamification secondary panels, A22 release engineering, A25 git hygiene and release intake, A11 verification.
- Objective: Package the accepted enterprise dashboard/Neon loading-stall fixes as a reviewed release slice without deploying from the dirty root.
- Dirty-tree source: `coordination/release-intake/2026-06-28-A25-dirty-tree-map-20260627T171649Z.md`.

## Include In Dashboard Release Slice

Runtime/dashboard behavior:

- `app/dashboard/page.tsx`
- `lib/server/userStore.ts`
- `lib/server/userStore/studentActivityPersistence.ts`

Focused regression tests:

- `app/dashboard/dashboardPagePerformanceBoundary.test.ts`
- `lib/server/userStoreStudentActivityPersistence.test.ts`

Release tooling and smoke gates:

- `scripts/cleanup-generated-artifacts.mjs`
- `scripts/cleanup-generated-artifacts.test.mjs`
- `scripts/dashboard-latency-smoke.mjs`
- `scripts/dashboard-smoke-auth-precheck.mjs`
- `scripts/dashboard-smoke-auth-precheck.test.mjs`
- `scripts/dashboard-ui-loading-smoke.mjs`
- `scripts/deploy-vercel-preview.mjs`
- `scripts/deploy-vercel-preview.test.mjs`
- `scripts/deploy-vercel-production.mjs`
- `scripts/deploy-vercel-production.test.mjs`
- `scripts/next-clean-build.mjs`
- `scripts/prepare-vercel-staging.mjs`
- `scripts/release-env-guard.mjs`
- `scripts/release-env-guard.test.mjs`
- `package.json`
- `tsconfig.json`
- `tsconfig.next.json`

Coordination evidence:

- `coordination/reports/2026-06-28-A22-dashboard-neon-release-readiness.md`
- `coordination/reports/2026-06-28-A22-dashboard-neon-disk-guard-blocker.md`
- `coordination/reports/2026-06-28-A22-dashboard-neon-completion-audit.md`
- `coordination/session-logs/2026-06-28-A02-A12-A17-A22-dashboard-neon-performance-continuation.md`
- `coordination/release-intake/2026-06-28-A22-A25-dashboard-neon-release-slice.md`

## Keep Out Of This Slice Unless Separately Approved

The current root still contains broad unrelated dirty work. Use `coordination/release-intake/latest-A25-dirty-tree-map.json` for the current count before any release operation. These are not part of this dashboard release slice unless a separate owner-approved package explicitly includes them:

- Existing dirty release-hygiene files not authored as part of this dashboard slice, including `.vercelignore`, `next.config.ts`, `package-lock.json`, and `playwright.config.ts`.
- Visualization, content/RAG, generated asset, QA backlog, and broad coordination files outside the include list above.
- Secret/env files, local generated outputs, `.next`, `.tmp`, private corpus, and raw credentials.

## Current Verified Gates

- PASS: `npm run release:dirty-map -- --reason "dashboard-neon-release-slice-refresh-2026-06-28"`
  - Expanded status entries: 1823.
- PASS: `node --test scripts/deploy-vercel-preview.test.mjs scripts/deploy-vercel-production.test.mjs scripts/release-env-guard.test.mjs`
  - Tests: 5 pass, 0 fail.
- PASS: `node --check scripts/deploy-vercel-preview.mjs`
- PASS: `npm run vercel:preview -- --dry-run --json`
  - No deployment performed.
  - Staging file count: 2061.
  - Forbidden paths: 0.
- PASS: `npm run smoke:dashboard-ui-loading -- --self-test`
  - Browser-level dashboard loading smoke helpers validated.
- PASS: `npm run smoke:dashboard-auth-ready -- --self-test`
- PASS: `node --test scripts/dashboard-smoke-auth-precheck.test.mjs`
  - Tests: 3 pass, 0 fail.
- CURRENT ENV NOT READY: `npm run smoke:dashboard-auth-ready -- --json`
  - `DASHBOARD_SMOKE_COOKIE`: missing.
  - `DASHBOARD_SMOKE_USERNAME`: missing.
  - `DASHBOARD_SMOKE_PASSWORD`: missing.
  - No credential values printed.
- PASS final after A25 refresh: `npm run vercel:preview -- --dry-run --json`
  - No deployment performed.
  - Staging file count: 2063.
  - Forbidden paths: 0.
- PASS final after A25 refresh: `npm run vercel:production -- --dry-run --json`
  - No deployment performed.
  - Staging file count: 2063.
  - Forbidden paths: 0.
- CURRENT TYPE-CHECK BLOCKER OUTSIDE THIS SLICE: A06-owned `components/visualizations/three/manim/mathSceneReviewPackages.test.ts` imports missing `./mathSceneReviewPackages`.
- PASS: `npm run release:staged-publish-preflight`
  - Staged production publish preflight passed.
  - Vercel staging root: `.tmp/vercel-staging`.
  - Vercel env target: production.
- CURRENT BLOCKED after additional report/handoff files were written: `npm run release:staged-publish-preflight`
  - Reason: A22 disk guard reports only about 18.0 GB free, below the 20 GB threshold.
  - Cleanup status: dry-run only; no generated artifacts were removed.
- PASS: `node --test scripts/cleanup-generated-artifacts.test.mjs`
  - Tests: 1 pass, 0 fail.
- PASS dry-run only: `npm run clean:vercel-staging -- --json`
  - Target: `.tmp/vercel-staging`.
  - Reclaimable: about 9.2 GB.
  - No Playwright evidence paths selected.
- PASS dry-run only: `npm run clean:next-builds -- --json`
  - Targets: Next build artifacts and `next-dist` directories.
  - No Playwright evidence paths selected.
- APPLIED: `node scripts/cleanup-generated-artifacts.mjs --scope vercel-staging --apply`
  - Reclaimed about 8.6 GB.
- APPLIED: `node scripts/cleanup-generated-artifacts.mjs --scope next-builds --apply`
  - Reclaimed about 27.1 GB.
- PASS after scoped cleanup: `npm run release:staged-publish-preflight`
  - Free disk: 43.2 GB.
- PASS after scoped cleanup: `npm run vercel:production -- --dry-run --json`
  - No deployment performed.
  - Staging file count: 2061.
  - Forbidden paths: 0.

## Release Path

Use A22 pruned staging only. Do not publish from the dirty repository root.

Preview remains the preferred next step unless the owner explicitly authorizes production. Preview deployment now requires dashboard smoke credentials before deployment, waits for `vercel inspect --wait --timeout 5m`, and then runs dashboard latency smoke against the preview URL before release handoff.

Production deployment remains gated by staged publish preflight, Vercel inspect, AI Tutor latency smoke, dashboard latency smoke against the deployment URL before promotion, and dashboard latency smoke against the production domain after promotion.

Before a real preview or production deploy, run `npm run smoke:dashboard-auth-ready -- --json` in the release shell and confirm it reports `ok: true` with either `cookie` or `username-password` auth mode.

Preview and production wrappers now reuse the same redacted auth helper before creating any real Vercel deployment. Missing credentials fail before deploy and report only `present`/`missing` status for the relevant variable names.

Latest non-deploy dry-run after shared auth helper and scoped cleanup:

- Preview: 2064 staged files, 166412374 bytes, 0 forbidden paths, `deployed: false`.
- Production: 2064 staged files, 166412374 bytes, 0 forbidden paths, `deployed: false`.
