# 2026-07-03 A22 MAIS Domains Production Deploy

- Agent: A22 production reliability and release engineering.
- Supporting ownership: A25 dirty-tree release intake; A19 redacted Vercel env readiness; A06 Manim build-blocker fixes; A11 production auth/API preflight.
- Request: Deploy the current latest MAIS-MVP website to `www.mais.hk` and `www.mais.ac` through Vercel.
- Status: Completed. Both requested domains inspect to the new Ready production deployment.

## Deployment

- Vercel scope: `peter-dongpin-hu-s-projects`.
- Project: `mais-mvp`.
- Source path: pruned staging package `.tmp/vercel-staging/a22-mais-domains-20260703-0036`.
- Command: `vercel deploy /Users/dongpinhu/Desktop/MAIS-MVP/.tmp/vercel-staging/a22-mais-domains-20260703-0036 -y --prod --scope peter-dongpin-hu-s-projects --project mais-mvp --no-wait`.
- Deployment id: `dpl_6ES8iUS634efb4GJLJGENDQLXUTG`.
- Deployment URL: `https://mais-8menmz76p-peter-dongpin-hu-s-projects.vercel.app`.
- Inspect URL: `https://vercel.com/peter-dongpin-hu-s-projects/mais-mvp/6ES8iUS634efb4GJLJGENDQLXUTG`.
- Created: 2026-07-03 00:27:54 HKT.
- Final status: Ready.
- Aliases confirmed by Vercel inspect:
  - `https://www.mais.hk` -> `dpl_6ES8iUS634efb4GJLJGENDQLXUTG`, Ready.
  - `https://www.mais.ac` -> `dpl_6ES8iUS634efb4GJLJGENDQLXUTG`, Ready.

## Release Intake And Env

- A25 dirty-tree map before deploy: `coordination/release-intake/2026-07-03-A25-dirty-tree-map-20260702T161553Z.md`.
- Expanded status entries: `3641`.
- Vercel CLI: `54.9.0`.
- Vercel project link: `.vercel/project.json` present; org/project ids not logged.
- A19-owned env preflight: production required variable names present `15/15`; secret values were not read, printed, copied, or stored.
- Disk guard recovery: free space improved from about `4.7 GB` to above the `20 GB` release-guard threshold before env preflight by clearing package-manager and cache artifacts. After repeated local build attempts, free space fell below 20 GB again; final publish therefore used direct pruned-staging evidence rather than claiming the full staged-publish guard passed.

## Build And Staging Evidence

- A22 isolated root build gate:
  - Command: `npm run release:build-gate -- --run-id a22-mais-domains-20260703-0031 --json`.
  - Result: passed.
  - Static pages generated: `222`.
  - Required outputs present: `BUILD_ID`, `server/app/api/auth/login/route.js`, `server/app/api/dashboard/route.js`, `server/app/api/gamification/summary/route.js`, `server/app/api/rewards/route.js`, `server/app/dashboard.html`.
- A06 build-blocker fixes were limited to Manim runtime/type contracts:
  - `components/visualizations/three/manim/mathSceneRunFromBeat.ts`
  - `components/visualizations/three/manim/mathSceneV2ObjectiveCompletionAudit.ts`
  - `components/visualizations/three/manim/mathSceneV2OwnerGateRerunCommandPacket.ts`
- A06 focused tests:
  - `node --import tsx --test components/visualizations/three/manim/mathSceneRunFromBeat.test.ts`: passed `11/11`.
  - `node --import tsx --test components/visualizations/three/manim/mathSceneV2ObjectiveCompletionAudit.test.ts`: passed `3/3`.
  - `node --import tsx --test components/visualizations/three/manim/mathSceneV2OwnerGateRerunCommandPacket.test.ts`: passed `3/3`.
  - `node --import tsx --test components/visualizations/three/manim/mathSceneV2OwnerGateRerunCommandEvidenceIntake.test.ts`: passed `18/18`.
- Pruned staging package:
  - Run id: `a22-mais-domains-20260703-0036`.
  - Files: `2187`.
  - Payload bytes: `215221352`.
  - Forbidden path count: `0`.
  - Forbidden-path scan found no `.env*`, `All API Keys.docx`, `default accounts.md`, `.git`, `coordination/`, `.local`, `private/`, or `node_modules` paths.

## Production Smoke

Safe HTTP/API probes passed on both domains:

| Domain | Home | Login | Anonymous `/api/me` | Empty login | Missing-user login | Public questions | Protected student lesson | AI Tutor status |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `https://www.mais.hk` | 200 | 200 | 401 | 400 | 401 | 200 | 307 to `/login?next=...` | 200 |
| `https://www.mais.ac` | 200 | 200 | 401 | 400 | 401 | 200 | 307 to `/login?next=...` | 200 |

A11 production auth/API preflight:

- `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk npx playwright test tests/e2e/production-auth-api-preflight.spec.ts --project=desktop-chrome --reporter=line`
- Result: passed `1/1`.

## Residual Risks

- The source was the owner-requested current latest dirty-root state packaged through A22 pruned staging, not a clean Git commit.
- Root remains heavily dirty; A25/A10/A22 source-control closure and review-package slicing are still required.
- The full `npm run release:staged-publish-preflight` did not pass because the release-source clean gate blocks dirty root unless an approved pruned-staging package is supplied. This deployment used the pruned-staging package evidence above and did not deploy directly from root.
- A local `npm ci` inside the staging package was interrupted after being silent for several minutes; the partial staging `node_modules` was removed before deploy. Vercel performed the production remote build, and Vercel inspect confirms the resulting deployment is Ready.
