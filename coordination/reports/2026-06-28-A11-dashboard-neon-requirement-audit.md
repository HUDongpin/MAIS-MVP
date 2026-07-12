# 2026-06-28 A11 Dashboard Neon Requirement Audit

- Responsible roles: A02 dashboard UI, A12 backend/API/storage, A17 gamification secondary panels, A19 smoke auth readiness, A22 release engineering, A25 dirty-tree intake, A11 verification.
- Objective audited: the accepted five-point enterprise fix for the Neon-backed dashboard loading stall.
- Audit status: non-deploy implementation evidence is in place; final completion still requires owner-approved deployment plus live smoke on the new deployment.

## Requirement Matrix

| Requirement | Authoritative evidence inspected | Current result | Remaining gap |
| --- | --- | --- | --- |
| A12 Neon dashboard fast path avoids full app-state load for `/api/dashboard`. | `lib/server/userStore.ts` defines `getStudentDashboardDataFromPostgresProjection`; it reads narrow JSONB slices plus hot `practice_attempts`, `mistake_book_items`, and `learning_events`, then calls `studentActivityDashboardDataForDatabase`. `lib/server/userStore/studentActivityPersistence.ts` exports the reusable builder. | Implemented for Postgres/Neon path with fallback on projection failure. | Live Neon latency smoke on the new deployment. |
| A12 dashboard cache bounds repeated dashboard loads and avoids stale in-flight repopulation. | `lib/server/userStore.ts` uses `studentDashboardCache`, `studentDashboardInflight`, per-key version tracking, and `invalidateStudentDashboardDataCache` hooks. Focused persistence tests cover fast path, cache, and invalidation behavior. | Implemented and covered by focused tests. | Live Neon smoke remains required because cache effectiveness depends on deployed runtime and Neon data shape. |
| A02 dashboard UI loading state clears predictably. | `app/dashboard/page.tsx` gates on `settingsReady`, uses `AbortController`, sets `isLoading` false in non-aborted `finally`, renders `dashboard.loading` only while loading, and uses `loadError` for failure. | Implemented. Local production UI smoke previously showed loading hidden in 832 ms and dashboard ready in 835 ms. | Live browser smoke on the new deployment must prove the online `Loading dashboard data...` clears. |
| A17/A02 secondary panels do not block the primary dashboard. | `app/dashboard/page.tsx` sets `loadSecondaryPanels` only after settings are ready, current user is student, primary loading is false, and no load error exists. `lib/server/userStore/gamificationSummaryPersistence.ts` supports `getFastStudentGamificationSummary`; `lib/server/userStore.ts` wires a Postgres projection for gamification summary. | Implemented and covered by focused gamification summary tests. | Live smoke should confirm secondary endpoints no longer dominate perceived dashboard readiness. |
| A19/A22 release path proves auth, buildability, staging safety, and smoke gates. | `scripts/dashboard-smoke-auth-precheck.mjs`, `scripts/dashboard-latency-smoke.mjs`, and `scripts/dashboard-ui-loading-smoke.mjs` support explicit demo login. Preview/production deploy wrappers run preflight, local release build gate, pruned staging, and then live dashboard smoke gates after real deploy. Dry-runs report `deployed: false`. | Non-deploy release path implemented. Build gate verifies `BUILD_ID`, `/api/auth/login`, `/api/dashboard`, `/api/gamification/summary`, `/api/rewards`, and `dashboard.html`. | Owner-approved preview or production deployment plus Vercel inspect/alias evidence and live smoke results. |

## Completion Decision

The goal is not complete yet. The implementation and non-deploy gates are strong enough for an owner-approved preview attempt, but the original symptom occurred online against Neon. Therefore the decisive evidence must come from the deployed Neon-backed runtime:

1. Create an owner-approved preview or production deployment through the A22 wrapper.
2. Record deployment URL, target, inspect/readiness, and alias or promotion status.
3. Run dashboard API latency smoke against the new deployment.
4. Run dashboard UI loading smoke against the new deployment and confirm `Loading dashboard data...` clears within threshold.
5. For production, run post-promotion production-domain dashboard API and UI smoke.

Until those live checks pass, completion is intentionally unclaimed.

## Latest Non-Deploy Gate Evidence

- A22/A19 wrapper hardening rechecked at 2026-06-28 11:53-11:54 HKT:
  - Real deploy path runs dashboard smoke auth precheck before local release build gate, so missing smoke auth fails before spending a full build.
  - Dry-run path still avoids real credential requirements and reports `deployed: false`.
- PASS: preview dry-run staged 2064 files, 166434965 bytes, 0 forbidden paths, `deployed: false`.
- PASS: production dry-run staged 2064 files, 166435031 bytes, 0 forbidden paths, production base URL `https://mais.ac`, `deployed: false`.
- PASS: both preview and production dry-runs verified required build outputs: `BUILD_ID`, auth login route, dashboard API route, gamification summary API route, rewards API route, and `dashboard.html`.
- Cleanup decision: A22 did not apply `next-builds` cleanup after the final dry-runs because the dry-run targets were old A11-owned manim E2E `next-dist` evidence, not the A22 dashboard/Neon wrapper outputs.
- A22 release build gate hygiene follow-up: `tsconfig.next.json` is snapshotted and restored around the local build gate, stale `release-build-gate-next-*` include entries were removed, and a restore-check build completed with all required outputs present and no lingering release-build-gate include or directory.

A11 verification status remains: implementation evidence passes locally and release wrappers are protective, but online Neon completion still requires owner-approved deploy plus live dashboard API/UI smoke.

## Current Production Recheck

- A22/A11 ran non-deploy current-production smoke at 2026-06-28 12:05-12:06 HKT using explicit demo-login mode.
- API latency smoke against `https://mais.ac` resolved to `https://www.mais.ac` and failed:
  - `/api/dashboard?grade=P1`: 7966 ms against the 6000 ms threshold.
  - Other sampled endpoints were below their thresholds: session 1620 ms, assignments 7482 ms, gamification summary 8116 ms, rewards 7450 ms.
  - Artifact: `coordination/reports/dashboard-neon-current-production-latency-20260628/last-run.json`.
- Browser UI loading smoke on the same existing production domain passed in this sample:
  - Loading text hidden in 2463 ms against the 8000 ms threshold.
  - Dashboard ready in 3246 ms against the 12000 ms threshold.
  - Artifact: `coordination/reports/dashboard-neon-current-production-ui-20260628/last-run.json`.

A11 decision: current production remains insufficient as completion evidence because the Neon-backed dashboard API gate is still red. The passing UI sample is useful, but it does not prove the enterprise fix is live or complete.

## Release Authorization Pointer

- A22 created the owner-facing deploy authorization handoff:
  - `coordination/reports/2026-06-28-A22-dashboard-neon-deploy-authorization-handoff.md`
- A11 verification recommends preview first:
  - `DASHBOARD_SMOKE_USE_DEMO_LOGIN=1 npm run vercel:preview -- --json`
- A11 should not mark this goal complete until the new deployment URL has passing dashboard API latency smoke and dashboard UI loading smoke.
