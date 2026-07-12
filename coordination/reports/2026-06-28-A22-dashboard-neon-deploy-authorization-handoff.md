# 2026-06-28 A22 Dashboard Neon Deploy Authorization Handoff

- Responsible roles: A02 dashboard UI, A12 backend/API/storage, A17 gamification summary, A19 smoke auth readiness, A22 release engineering, A25 dirty-tree intake, A11 verification.
- Objective: owner-approved deployment and live Neon smoke evidence for the accepted five-point enterprise dashboard fix.
- Status: implementation and non-deploy release gates are ready; completion is still blocked on owner deployment authorization and passing live smoke on the new deployment.

## Why This Handoff Exists

The current online Neon-backed production deployment still fails the dashboard API latency gate:

- Current-production API smoke at 2026-06-28 12:05 HKT:
  - `DASHBOARD_SMOKE_USE_DEMO_LOGIN=1 DASHBOARD_SMOKE_SAMPLES=1 DASHBOARD_SMOKE_ARTIFACT_DIR=coordination/reports/dashboard-neon-current-production-latency-20260628 npm run smoke:dashboard-latency -- --base-url https://mais.ac --json`
  - Result: FAIL.
  - `/api/dashboard?grade=P1`: 7966 ms against the 6000 ms threshold.
  - Artifact: `coordination/reports/dashboard-neon-current-production-latency-20260628/last-run.json`.
- Current-production UI smoke at 2026-06-28 12:06 HKT:
  - `DASHBOARD_SMOKE_USE_DEMO_LOGIN=1 DASHBOARD_UI_SMOKE_ARTIFACT_DIR=coordination/reports/dashboard-neon-current-production-ui-20260628 npm run smoke:dashboard-ui-loading -- --base-url https://mais.ac --json`
  - Result: PASS.
  - Loading hidden: 2463 ms; dashboard ready: 3246 ms.
  - Artifact: `coordination/reports/dashboard-neon-current-production-ui-20260628/last-run.json`.

Interpretation: the visible loading message can clear on a favorable sample, but current production still does not prove the Neon API fix is live. The release must be deployed and smoke-tested on the new Vercel deployment before the goal can be marked complete.

## Owner Approval Options

Preferred first step:

```bash
DASHBOARD_SMOKE_USE_DEMO_LOGIN=1 npm run vercel:preview -- --json
```

This creates a Vercel preview deployment, waits for `vercel inspect`, then runs:

- Dashboard API latency smoke on the preview URL.
- Dashboard UI loading smoke on the preview URL.

Production option only if the owner explicitly approves production publish:

```bash
DASHBOARD_SMOKE_USE_DEMO_LOGIN=1 npm run vercel:production -- --json
```

This creates a production deployment with `--skip-domain`, verifies the new deployment first, then promotes it only if pre-promotion gates pass. After promotion, it runs dashboard smoke on the production domain.

## Required Completion Evidence

A11/A22 may mark the dashboard/Neon goal complete only after all relevant live checks pass:

1. Deployment command and timestamp recorded.
2. Vercel deployment URL recorded.
3. `vercel inspect --wait` succeeded for the deployment URL.
4. Preview or pre-promotion dashboard API latency smoke passed.
5. Preview or pre-promotion dashboard UI loading smoke passed.
6. For production publish, promotion succeeded.
7. For production publish, production-domain dashboard API latency smoke passed on `https://mais.ac` or configured production base URL.
8. For production publish, production-domain dashboard UI loading smoke passed on the production base URL.

## Stop Conditions

Stop and do not claim completion if any of these happen:

- Owner has not explicitly approved preview or production deployment.
- A25 dirty-tree currentness guard fails.
- Release environment or staged publish preflight fails.
- Dashboard smoke auth precheck fails.
- Local release build gate fails or required outputs are missing.
- Vercel deploy succeeds but does not return a deployment URL.
- `vercel inspect --wait` fails.
- Any dashboard API or UI smoke gate fails.
- Production deploy is created but pre-promotion smoke fails; in that case current production domains remain on the previous deployment because the wrapper uses `--skip-domain`.

## Non-Deploy Evidence Already In Place

- Preview dry-run passed at 2026-06-28 11:53 HKT:
  - 2064 staged files.
  - 166434965 bytes.
  - Forbidden paths: 0.
  - `deployed: false`.
  - Required outputs present: `BUILD_ID`, auth login route, dashboard API route, gamification summary API route, rewards API route, and `dashboard.html`.
- Production dry-run passed at 2026-06-28 11:54 HKT:
  - 2064 staged files.
  - 166435031 bytes.
  - Forbidden paths: 0.
  - Production base URL: `https://mais.ac`.
  - `deployed: false`.
  - Required outputs present.
- Release build gate hygiene passed:
  - `tsconfig.next.json` is snapshotted and restored around build gate runs.
  - Restore-check build produced all required outputs and left no `release-build-gate-next` include or temp directory.
- Latest focused release tooling gate before this handoff:
  - `node --check scripts/release-build-gate.mjs && node --check scripts/next-clean-build.mjs && node --test scripts/release-build-gate.test.mjs scripts/next-clean-build.test.mjs scripts/dashboard-smoke-auth-precheck.test.mjs scripts/cleanup-generated-artifacts.test.mjs scripts/deploy-vercel-preview.test.mjs scripts/deploy-vercel-production.test.mjs scripts/release-env-guard.test.mjs`
  - Tests: 21 pass, 0 fail.
- Latest type gate before this handoff:
  - `npm run type-check`
  - PASS.

## Recommended Owner Response

For the lowest-risk live proof, approve a preview deployment first with:

`Approve A22 preview deploy for the dashboard/Neon fix using demo-login smoke.`

Production should remain a separate explicit approval after preview smoke passes.

## Current Handoff Guards

- A25 dirty-tree map refreshed for this handoff:
  - Command: `npm run release:dirty-map -- --reason "dashboard-neon-deploy-authorization-handoff-2026-06-28"`.
  - Latest report: `coordination/release-intake/2026-06-28-A25-dirty-tree-map-20260628T041040Z.md`.
  - Expanded status entries: 1917.
- A25 currentness assertion passed:
  - Generated at: `2026-06-28T04:10:47.363Z`.
- A22 disk guard is currently above threshold:
  - Available disk: 33 GiB.
  - Release minimum: 20 GiB.
- A19/A22 smoke auth readiness for demo-login passed:
  - Command: `DASHBOARD_SMOKE_USE_DEMO_LOGIN=1 npm run smoke:dashboard-auth-ready -- --json`.
  - Auth mode: `demo-login`.
  - No private credential values were printed.
- A22 residual process check found no active deploy/build/smoke process except the check command itself.
