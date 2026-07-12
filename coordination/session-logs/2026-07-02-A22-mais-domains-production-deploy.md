# 2026-07-02 A22 MAIS Domains Production Deploy

- Agent: A22 Production reliability and release engineering lead.
- Objective: Deploy the current latest MAIS-MVP website to `www.mais.hk` and `www.mais.ac` through Vercel.
- Started: 2026-07-02 23:57 HKT.
- Allowed write scope: A22 release/deployment reports, release-readiness evidence, pruned Vercel staging artifacts under `.tmp/vercel-staging/`, and this session log.
- Forbidden scope: Feature source edits in `app/`, `components/`, `lib/`, or `data/`; real `.env*`; Vercel secret values; package upgrades; Git staging/commit/branch/push/reset/revert/delete; direct dirty-root production publish.
- Plan:
  1. Refresh A25-owned dirty-tree intake and identify current release path.
  2. Verify Vercel project/auth/env readiness with redacted evidence only.
  3. Prepare and verify a pruned staging package for the current latest runtime site.
  4. Deploy through Vercel production only from the pruned staging package.
  5. Inspect aliases and smoke-check both `www.mais.hk` and `www.mais.ac`.
- Scope confirmation: A22 will not deploy directly from the dirty root; production publish must use the pruned staging path or stop.

## Closeout - 2026-07-03 00:35 HKT

- A25 dirty-tree intake:
  - `npm run release:dirty-map -- --reason "2026-07-03 A22 production deploy after A06 build-gate type fixes for www.mais.hk and www.mais.ac"` passed.
  - Latest report: `coordination/release-intake/2026-07-03-A25-dirty-tree-map-20260702T161553Z.md`.
  - Expanded status entries: `3641`.
- A19 redacted Vercel env readiness:
  - `npm run release:env-preflight -- --json` passed after disk cleanup.
  - Production required variable names present: `15/15`; no secret values printed.
- A22 disk recovery:
  - Release guard initially failed with about `4.7 GB` free versus required `20 GB`.
  - Cleared package-manager and cache artifacts, preserving Playwright browser cache for smoke tests.
  - Env preflight then passed with more than `20 GB` free.
- A06 build-blocker fixes:
  - `components/visualizations/three/manim/mathSceneRunFromBeat.ts`: updated stale derived-summary helper type.
  - `components/visualizations/three/manim/mathSceneV2ObjectiveCompletionAudit.ts`: made `reviewSliceCount` return `number` with TypeScript-recognized narrowing.
  - `components/visualizations/three/manim/mathSceneV2OwnerGateRerunCommandPacket.ts`: reused `MathSceneV2CompletionRerunTarget` for command packet rerun targets.
- A06 focused tests:
  - `mathSceneRunFromBeat.test.ts`: passed `11/11`.
  - `mathSceneV2ObjectiveCompletionAudit.test.ts`: passed `3/3`.
  - `mathSceneV2OwnerGateRerunCommandPacket.test.ts`: passed `3/3`.
  - `mathSceneV2OwnerGateRerunCommandEvidenceIntake.test.ts`: passed `18/18`.
- A22 build/staging evidence:
  - `npm run release:build-gate -- --run-id a22-mais-domains-20260703-0031 --json`: passed; `222` static pages generated and required dashboard/API outputs present.
  - Pruned staging package `.tmp/vercel-staging/a22-mais-domains-20260703-0036`: `2187` files, `215221352` bytes, forbidden path count `0`.
  - Forbidden-path scan found no `.env*`, `All API Keys.docx`, `default accounts.md`, `.git`, `coordination/`, `.local`, `private/`, or `node_modules`.
- A22 production deployment:
  - Command: `vercel deploy /Users/dongpinhu/Desktop/MAIS-MVP/.tmp/vercel-staging/a22-mais-domains-20260703-0036 -y --prod --scope peter-dongpin-hu-s-projects --project mais-mvp --no-wait`.
  - Deployment id: `dpl_6ES8iUS634efb4GJLJGENDQLXUTG`.
  - Deployment URL: `https://mais-8menmz76p-peter-dongpin-hu-s-projects.vercel.app`.
  - Inspect URL: `https://vercel.com/peter-dongpin-hu-s-projects/mais-mvp/6ES8iUS634efb4GJLJGENDQLXUTG`.
  - Vercel inspect: Ready.
  - `https://www.mais.hk`: Ready on `dpl_6ES8iUS634efb4GJLJGENDQLXUTG`.
  - `https://www.mais.ac`: Ready on `dpl_6ES8iUS634efb4GJLJGENDQLXUTG`.
- A22/A11 production smoke:
  - Safe HTTP/API probes passed on both domains: home `200`, login `200`, anonymous `/api/me` `401`, empty login `400`, missing-user login `401`, public questions `200`, protected student lesson `307` to login, AI Tutor status `200`.
  - `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk npx playwright test tests/e2e/production-auth-api-preflight.spec.ts --project=desktop-chrome --reporter=line`: passed `1/1`.
- Report:
  - `coordination/reports/2026-07-03-A22-mais-domains-production-deploy.md`.
- Residual risks:
  - Deployment source was owner-requested current latest dirty-root state via pruned staging, not a clean Git commit.
  - Root remains heavily dirty; source-control closure/review-package slicing remains required.
  - Full staged-publish guard did not pass because release-source clean gate blocks dirty root; A22 used explicit pruned staging evidence and did not deploy directly from root.
