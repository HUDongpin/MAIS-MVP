# 2026-06-28 A22 Dashboard Neon Release Readiness

- Responsible roles: A02 dashboard UI, A12 backend/API/storage, A17 gamification secondary panels, A22 release engineering, A11 verification, A25 dirty-tree intake, A19 env readiness.
- Scope: Enterprise fixes for the Neon-backed student dashboard loading stall where `Loading dashboard data...` remained visible too long on the online dashboard.

## Implemented Fixes

1. A12 added a narrow Neon dashboard fast path so the student dashboard can read projected dashboard data before the full user-store database load.
2. A12 added short TTL caching, in-flight request dedupe, and cache invalidation for student dashboard mutations.
3. A12 added a cache generation guard so stale in-flight Neon responses cannot repopulate the dashboard cache after invalidation.
4. A02 stabilized the dashboard loading lifecycle with settings readiness checks, a stable request key, and abort handling.
5. A17/A02 deferred secondary dashboard panels until primary dashboard data has loaded, reducing first-view contention.
6. A22 added dashboard latency smoke gates for preview and production release wrappers.
7. A22 updated the preview wrapper to wait for `vercel inspect --wait --timeout 5m` before running dashboard latency smoke.
8. A22 added browser-level dashboard UI loading smoke so releases verify that `Loading dashboard data...` clears on the actual dashboard page.
9. A19/A22 added redacted dashboard smoke auth readiness precheck so release operators can verify smoke credentials are present before a real deploy without printing secret values.
10. A22 updated preview and production deploy wrappers to reuse the shared redacted auth precheck helper before any real Vercel deployment is created.

## Verification

- PASS: targeted dashboard UI and A12 persistence tests, 57 tests.
- PASS: A22 release guard, preview deploy wrapper, and production deploy wrapper source-contract tests, 5 tests.
- PASS: dashboard latency smoke self-test.
- PASS: `npm run type-check`.
- Earlier PASS: staged production dry run with no deployment, 2060 staged files, 0 forbidden paths.
- PASS: isolated staging production build generated 223 static pages and included `/api/auth/login` plus `/api/dashboard`.
- PASS: preview, production, and release-guard wrapper source-contract tests, 5 tests, after adding preview inspect wait.
- PASS: dashboard UI loading smoke self-test.
- PASS: preview and production wrapper source-contract tests after adding dashboard UI loading gates.
- PASS final: `npm run type-check` after the transient A06 Manim missing-module state cleared in the current worktree.
- PASS: `npm run smoke:dashboard-auth-ready -- --self-test`.
- PASS: `node --test scripts/dashboard-smoke-auth-precheck.test.mjs`, 3 tests.
- CURRENT ENV NOT READY: `npm run smoke:dashboard-auth-ready -- --json` reports `DASHBOARD_SMOKE_COOKIE`, `DASHBOARD_SMOKE_USERNAME`, and `DASHBOARD_SMOKE_PASSWORD` as missing in this shell. No credential values were printed.
- PASS final A22 wrapper/guard set: `node --test scripts/dashboard-smoke-auth-precheck.test.mjs scripts/cleanup-generated-artifacts.test.mjs scripts/deploy-vercel-preview.test.mjs scripts/deploy-vercel-production.test.mjs scripts/release-env-guard.test.mjs`, 10 tests.
- PASS after sharing auth precheck helper: same wrapper/guard test set, 11 tests.
- APPLIED scoped cleanup after disk guard fell below threshold again: `node scripts/cleanup-generated-artifacts.mjs --scope next-builds --apply`, reclaimed about 2.5 GB without selecting Playwright evidence.
- PASS final preview dry run after scoped cleanup and A25 refresh: 2064 staged files, 0 forbidden paths, no deployment.
- PASS final production dry run after scoped cleanup and A25 refresh: 2064 staged files, 0 forbidden paths, no deployment.
- PASS final preview dry run after A25 refresh: 2063 staged files, 0 forbidden paths, no deployment.
- PASS final production dry run after A25 refresh: 2063 staged files, 0 forbidden paths, no deployment.
- CURRENT TYPE-CHECK BLOCKER OUTSIDE A22 SLICE: `npm run type-check` now fails on A06-owned `components/visualizations/three/manim/mathSceneReviewPackages.test.ts` because `./mathSceneReviewPackages` is missing. This is outside the dashboard/Neon release tooling slice.
- RESOLVED: staged production publish preflight and production dry run were temporarily blocked by the A22 disk guard, then restored through scoped generated-artifact cleanup. See `coordination/reports/2026-06-28-A22-dashboard-neon-disk-guard-blocker.md`.
- PASS after scoped cleanup: staged production publish preflight, with 43.2 GB free disk.
- PASS after scoped cleanup: `npm run vercel:production -- --dry-run --json`, no deployment, 2061 staged files, 0 forbidden paths.
- PASS: `npm run vercel:preview -- --dry-run --json`, no deployment, 2061 staged files, 0 forbidden paths.

## Production Status

- No preview or production deployment was performed in this session.
- Direct dirty-root production publish remains protectively blocked by A22 guardrails.
- The staged production wrapper currently passes dry-run again after scoped generated-artifact cleanup.
- The preview wrapper now also supports dry-run verification without dashboard smoke credentials or Vercel deployment creation.
- A real preview/production deploy still requires `npm run smoke:dashboard-auth-ready -- --json` to pass in the release shell, or the wrapper will fail before creating a Vercel deployment.
- Narrow cleanup dry-run paths are available through `npm run clean:vercel-staging -- --json` and `npm run clean:next-builds -- --json`.
- Current production on `https://www.mais.ac` still fails the dashboard latency smoke before this slice is deployed:
  - Session: 1939 ms, pass.
  - Dashboard: 8502 ms, fail against the 6000 ms threshold.
  - Assignments: 8360 ms, pass against the 12000 ms secondary threshold.
  - Gamification summary: 8659 ms, pass against the 12000 ms secondary threshold.
  - Rewards: 8309 ms, pass against the 12000 ms secondary threshold.

## Release Gate

Production completion still requires explicit owner authorization to run the staged Vercel deployment wrapper with dashboard smoke credentials available through environment variables. The wrapper now requires:

- Pre-deploy dashboard smoke auth readiness.
- Vercel inspect readiness on the deployment URL.
- Dashboard latency smoke against the deployment URL before promotion.
- Dashboard UI loading smoke against the deployment URL before promotion.
- Dashboard latency smoke against the configured production domain after promotion.
- Dashboard UI loading smoke against the configured production domain after promotion.

## Release Slice Handoff

The exact dashboard release slice is recorded in `coordination/release-intake/2026-06-28-A22-A25-dashboard-neon-release-slice.md`. The current root remains broadly dirty, so A22 should keep using pruned staging and must not publish directly from the repository root.

The completion audit for the accepted enterprise fixes is recorded in `coordination/reports/2026-06-28-A22-dashboard-neon-completion-audit.md`.
