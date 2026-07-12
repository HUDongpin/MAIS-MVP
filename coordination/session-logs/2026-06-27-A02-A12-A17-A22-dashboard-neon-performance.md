# 2026-06-27 A02/A12/A17/A22 Dashboard Neon Performance

- Agent roles: A02 dashboard UI, A12 backend/API/storage, A17 gamification secondary panels, A22 release/performance smoke, A11 verification support.
- Objective: Implement the accepted enterprise performance fixes for the student dashboard loading stall on the online Neon-backed version.

## Changes

- Added a student dashboard fast path before the full database fallback.
- Implemented a Neon/Postgres projection for student dashboard data that reads narrow JSONB slices and overlays hot tables: `practice_attempts`, `mistake_book_items`, and `learning_events`.
- Added short per-student dashboard caching and in-flight request de-duplication keyed by student, grade, and curriculum scope.
- Added a cache generation guard so stale in-flight dashboard projection results cannot repopulate cache after a mutation invalidates it.
- Invalidated the student dashboard cache after student learning events, mistake mastery, visualization completion, lesson progress, and practice attempts.
- Delayed dashboard secondary reward/motivation panels until primary dashboard data is loaded.
- Guarded primary dashboard and assignments requests on settings readiness and stable user identity keys.
- Added a dashboard latency smoke script with JSON artifact output and production/local thresholds.
- Added an A22 clean Next build wrapper so repeated `npm run build` runs do not reuse stale `.next` chunks.
- Updated root TypeScript excludes so ignored generated scratch folders such as `tmp/`, `.tmp/`, and `var/` no longer pollute the main type-check gate.

## Files

- `app/dashboard/page.tsx`
- `app/dashboard/dashboardPagePerformanceBoundary.test.ts`
- `lib/server/userStore.ts`
- `lib/server/userStore/studentActivityPersistence.ts`
- `lib/server/userStoreStudentActivityPersistence.test.ts`
- `scripts/dashboard-latency-smoke.mjs`
- `scripts/next-clean-build.mjs`
- `scripts/prepare-vercel-staging.mjs`
- `package.json`
- `tsconfig.json`
- `tsconfig.next.json`

## Checks

- PASS: `node --import tsx --test app/dashboard/dashboardPagePerformanceBoundary.test.ts lib/server/userStoreStudentActivityPersistence.test.ts --test-name-pattern "student dashboard waits|student dashboard defers|student dashboard fast path|student dashboard Neon projection"`
- PASS: `node --import tsx --test lib/server/userStoreStudentActivityPersistence.test.ts --test-name-pattern "student dashboard fast path|student dashboard Neon projection|student dashboard cache|student dashboard cache safely"`
- PASS: `node --import tsx --test app/dashboard/dashboardPagePerformanceBoundary.test.ts`
- PASS: `npm run smoke:dashboard-latency -- --self-test`
- PASS: `npm run build`
- PASS: `npm run type-check`
- PASS on final verification: `node --import tsx --test app/dashboard/dashboardPagePerformanceBoundary.test.ts lib/server/userStoreStudentActivityPersistence.test.ts --test-name-pattern "student dashboard waits|student dashboard defers|student dashboard fast path|student dashboard Neon projection|student dashboard cache|student dashboard cache safely"`
  - Tests: 57 pass, 0 fail.
- PASS on final verification: `npm run smoke:dashboard-latency -- --self-test`
- PASS on final verification: `npm run type-check`
- PASS on final verification after isolating a stale `.next` cache: `npm run build`
  - Two immediate build attempts failed during page-data collection with `.next` chunk/runtime mismatches (`/login` prerender and missing `./5611.js`).
  - Existing `.next` was moved to `.tmp/next-build-cache-backups/next-20260627T2352-build-mismatch`.
  - The clean rebuild completed successfully and generated 223 static pages.
- PASS after adding the A22 clean build wrapper: `npm run build`
  - Completed successfully and generated 223 static pages.
- PASS repeatability check after adding the A22 clean build wrapper: `npm run build`
  - A second immediate build also completed successfully and generated 223 static pages.
- PASS from isolated A22 staging directory: `npm run build`
  - Working directory: `.tmp/vercel-staging/dashboard-clean-build-wrapper-slice`
  - Completed successfully and generated 223 static pages, including `/api/auth/login` and `/api/dashboard`.
- PASS after warm-up: `DASHBOARD_SMOKE_USERNAME='Student Shirleen' DASHBOARD_SMOKE_PASSWORD='[redacted]' node scripts/dashboard-latency-smoke.mjs --base-url http://localhost:3001 --samples 1`
  - Session: 1168 ms
  - Dashboard: 316 ms
  - Assignments: 348 ms
  - Gamification summary: 477 ms
  - Rewards: 316 ms
- PASS after `npm run start -- --port 3001`: `DASHBOARD_SMOKE_USERNAME='Student Shirleen' DASHBOARD_SMOKE_PASSWORD='[redacted]' node scripts/dashboard-latency-smoke.mjs --base-url http://localhost:3001 --samples 1`
  - Session: 453 ms
  - Dashboard: 16 ms
  - Assignments: 12 ms
  - Gamification summary: 54 ms
  - Rewards: 17 ms
- FAIL on the currently deployed online version before deploying this slice: `DASHBOARD_SMOKE_USERNAME='Student Shirleen' DASHBOARD_SMOKE_PASSWORD='[redacted]' DASHBOARD_SMOKE_SAMPLES=2 npm run smoke:dashboard-latency -- --base-url https://mais.ac`
  - The smoke script now follows the apex-to-www login redirect and authenticates against `https://www.mais.ac`.
  - Session: p50 2268 ms, p95 4730 ms, pass.
  - Dashboard: p50 8481 ms, p95 8731 ms, fail against the 6000 ms threshold.
  - Assignments: p50 8685 ms, p95 8790 ms, pass against the secondary 12000 ms threshold.
  - Gamification summary: p50 8445 ms, p95 8494 ms, pass against the secondary 12000 ms threshold.
  - Rewards: p50 7995 ms, p95 9501 ms, pass against the secondary 12000 ms threshold.
- PASS: `npm run release:dirty-map -- --reason "dashboard-neon-production-smoke-failed-current-online"`
- PASS: `npm run release:env-preflight`
- PASS: `npm run release:runtime-preflight`
- FAIL protectively: `npm run vercel:production -- --dry-run --json`
  - Direct dirty-root production publish was blocked by A22 release preflight.
- PASS: direct A22 staging preparation for `dashboard-neon-release-slice`
  - Staging directory: `.tmp/vercel-staging/dashboard-neon-release-slice`
  - Files: 2059
  - Size: 166092484 bytes
  - Forbidden paths: 0
  - Runtime files present: `app/dashboard/page.tsx`, `lib/server/userStore.ts`, `lib/server/userStore/studentActivityPersistence.ts`, `package.json`, `tsconfig.json`, `tsconfig.next.json`.
  - This staging directory is a broad pruned snapshot of the current dirty runtime tree, not a reviewed single-fix release slice.
- PASS: `node scripts/prepare-vercel-staging.mjs --dry-run --run-id dashboard-clean-build-wrapper --json`
  - Files: 2060
  - Size: 166099448 bytes
  - Forbidden paths: 0
- PASS: `node scripts/prepare-vercel-staging.mjs --run-id dashboard-clean-build-wrapper-slice --json`
  - Staging directory: `.tmp/vercel-staging/dashboard-clean-build-wrapper-slice`
  - Files: 2060
  - Size: 166099448 bytes
  - Forbidden paths: 0
  - Manifest confirms `scripts/next-clean-build.mjs`, `package.json`, `app/dashboard/page.tsx`, and `lib/server/userStore.ts` are present.
- NOT RUN to completion: local runtime smoke from `.tmp/vercel-staging/dashboard-clean-build-wrapper-slice`
  - Starting the staging package without env returned HTTP 503 on login, as expected because `.env.local` is excluded from deploy packages.
  - Shell-sourcing root `.env.local` failed because the file is not pure shell syntax; secret values were not printed or copied.
  - Do not copy `.env.local` into staging. Vercel preview/production should use platform env injection, then run `npm run smoke:dashboard-latency` against the deployment URL.

## Notes And Risks

- Local dev cold or hot-reload runs can still show multi-second latency because Next compiles routes on demand.
- Multiple `next dev` processes are currently running from the repository root and can write to root `.next`; root `next start` is therefore not a reliable production smoke source until those dev servers are stopped or the smoke runs from an isolated staging/worktree.
- Production evidence still requires deployment from an owner-approved clean release slice or preview package and then running `npm run smoke:dashboard-latency` against `https://mais.ac` with an authenticated student session.
- Current online `https://mais.ac` evidence still shows the old slow Neon-backed dashboard behavior because the new code has not been deployed/promoted.
- `npm run vercel:preview` and `npm run vercel:production` wrappers exist and use A22 staging rather than direct dirty-root deployment, but they perform real Vercel deploys and were not executed without explicit owner approval.
- Root `npm run type-check` and `npm run build` are green after generated scratch folders were excluded from TypeScript checks.
- A local build blocker was caused by stale `.next` build output; `npm run build` now uses `scripts/next-clean-build.mjs` to remove `.next` before invoking Next build, and the wrapper was verified with two consecutive successful builds.
- The new A22 staging package is still a broad pruned snapshot of the dirty runtime tree. It is safer than dirty-root deploy, but it is not the same as a clean branch/worktree release slice.
- The local dev/start servers used for smoke verification were stopped after their runs.
