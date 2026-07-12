# 2026-06-26 A22 Current Version Production Deploy Readiness

- Date: 2026-06-26 16:56 HKT
- Agent: A22 production reliability and release engineering
- Supporting agents: A25 git hygiene/release intake; A19 API configuration readiness; A06 visualization type-check recheck
- Request: Deploy the current MAIS version to `www.mais.ac` and `www.mais.hk` through Vercel.
- Status: Completed. Current MAIS production deployment is Ready and aliased to both `www.mais.ac` and `www.mais.hk`.

## Current Production State

`vercel inspect` confirms both requested domains currently point to the earlier Ready production deployment:

- `https://www.mais.ac`
  - Deployment id: `dpl_zPM4JDa3NRJwXhyuUzD2dhGf1XNf`
  - Deployment URL: `https://mais-kee15xvpk-peter-dongpin-hu-s-projects.vercel.app`
  - Status: Ready
  - Created: 2026-06-26 01:57:11 HKT
- `https://www.mais.hk`
  - Deployment id: `dpl_zPM4JDa3NRJwXhyuUzD2dhGf1XNf`
  - Deployment URL: `https://mais-kee15xvpk-peter-dongpin-hu-s-projects.vercel.app`
  - Status: Ready
  - Created: 2026-06-26 01:57:11 HKT

Superseded by the current-version production deployment below.

## Current-Version Production Deploy

- Owner approval received after readiness report:
  - `approve dirty-root pruned staging production deploy for current MAIS to www.mais.ac and www.mais.hk`
- Deployment command:
  - `vercel deploy .tmp/vercel-staging/a22-current-version-20260626-1655 -y --prod --scope peter-dongpin-hu-s-projects --project mais-mvp --no-wait`
- Deployment id:
  - `dpl_3vKBNELKAQA8K4CvVrk6GXPjd4Bs`
- Production deployment URL:
  - `https://mais-ca1joi9ae-peter-dongpin-hu-s-projects.vercel.app`
- Vercel inspect URL:
  - `https://vercel.com/peter-dongpin-hu-s-projects/mais-mvp/3vKBNELKAQA8K4CvVrk6GXPjd4Bs`
- Target:
  - `production`
- Final Vercel status:
  - `Ready`
- Created:
  - 2026-06-26 17:00:06 HKT
- Alias evidence:
  - `vercel inspect https://www.mais.ac --scope peter-dongpin-hu-s-projects` fetched `dpl_3vKBNELKAQA8K4CvVrk6GXPjd4Bs`, status `Ready`.
  - `vercel inspect https://www.mais.hk --scope peter-dongpin-hu-s-projects` fetched `dpl_3vKBNELKAQA8K4CvVrk6GXPjd4Bs`, status `Ready`.
  - Deployment aliases include `https://www.mais.ac` and `https://www.mais.hk`.

## A25 Dirty-Tree Intake

- Fresh dirty map for the deployment request:
  - `coordination/release-intake/2026-06-26-A25-dirty-tree-map-20260626T084650Z.md`
  - Expanded status entries: `1262`
  - Tracked modified: `366`
  - Untracked status entries: `588`
  - Untracked files: `896`
- Post-staging dirty map:
  - `coordination/release-intake/2026-06-26-A25-dirty-tree-map-20260626T085613Z.md`
  - Expanded status entries: `1264`
- A25 did not stage, commit, branch, push, reset, delete, revert, clean, preview deploy, or production deploy.

## Vercel And Environment Readiness

- Vercel CLI: `54.9.0`
- Authenticated account: available through local Vercel CLI.
- Team scope: `peter-dongpin-hu-s-projects`
- Project: `mais-mvp`
- Linked project: `.vercel/project.json` present with org/project ids redacted in logs.
- `npm run release:env-preflight`: passed.
- Required production environment variable names present in Vercel: `7/7`.
- Secret values were not printed, copied, stored, or summarized.

## Release Guard Results

- `npm run release:preflight -- --json`: passed.
- `npm run release:root-deploy-preflight -- --json`: failed protectively because the root worktree is dirty.
- `npm run release:publish-preflight`: failed protectively because the root worktree is dirty.
- `node scripts/cleanup-generated-artifacts.mjs --dry-run`: passed dry run; reclaimable `.next` and `.tmp` total was about `9.1 GB`; no files removed.
- Direct dirty-root production publish remains forbidden by `AGENTS.md` and the release guard unless the owner explicitly approves the named dirty-root/pruned-staging risk.

## Build And Staging Evidence

- Root type-check:
  - `npm run type-check -- --pretty false`: passed after A06 recheck; no A06 source patch was needed.
- Root production build:
  - `NEXT_DIST_DIR=.tmp/a22-current-version-build NEXT_TELEMETRY_DISABLED=1 npm run build`: passed.
  - Built `223` static pages.
  - Next briefly added `.tmp/a22-current-version-build/types/**/*.ts` to `tsconfig.json`; A22 removed that build-induced config churn.
- Pruned Vercel staging package:
  - Run id: `a22-current-version-20260626-1655`
  - Staging dir: `.tmp/vercel-staging/a22-current-version-20260626-1655`
  - Files: `2296`
  - Size: about `169 MB` payload, `198 MB` on disk after local install/build work
  - Forbidden paths: `0`
  - No `.env*`, `All API Keys.docx`, `default accounts.md`, `.git`, `.local`, or `coordination/` paths found in staging package scan.
- Staging install:
  - `npm ci`: passed.
  - npm audit reported `2` findings: `1 moderate`, `1 high`.
- Staging production build:
  - `NEXT_TELEMETRY_DISABLED=1 npm run build`: passed.
  - Built `223` static pages.
- Staging full `npm run type-check -- --pretty false`: failed on pruning-only QA/test imports because the staging package intentionally excludes `coordination/` and some `scripts/` files. Root type-check and staging production build are green.

## A06 Recheck

- Initial A22 type-check run saw transient A06-owned Manim checkpoint-paste type errors.
- A06 inspected the relevant files and confirmed runtime tests pass:
  - `./node_modules/.bin/tsx --test --test-reporter=dot components/visualizations/three/manim/mathCheckpointPastePlan.test.ts components/visualizations/three/manim/mathEvidenceHarness.test.ts`: passed.
- Fresh root `npm run type-check -- --pretty false`: passed.
- No source patch was applied.

## Blocker Resolution

The initial blocker was missing explicit dirty-root pruned-staging approval. The owner later provided the exact approval, and A22 deployed the verified pruned staging package.

## Production Smoke

Safe production smoke checks ran after alias cutover.

Playwright:

- `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk npx playwright test tests/e2e/production-auth-api-preflight.spec.ts --project=desktop-chrome`: passed, 1/1.
- The same spec intentionally skipped for `www.mais.ac` because the spec is hard-coded to `https://www.mais.hk`.

Equivalent safe HTTP/API probes then ran for both domains at 2026-06-26T09:05:15Z:

| Domain | Home | Login | Anonymous storage health | Malformed login | Missing-user login | Public questions | Public lesson |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `https://www.mais.ac` | 200 | 200 | 401 | 400 | 401 | 200 | 200 |
| `https://www.mais.hk` | 200 | 200 | 401 | 400 | 401 | 200 | 200 |

## Residual Risks

- The repository root remains heavily dirty and uncommitted.
- The staging package is a pruned current-root package, not a clean Git commit.
- Full staged type-check is not meaningful without including QA-only files excluded by deployment policy; root type-check and staged production build are the relevant gates currently green.
- npm audit reports `2` dependency findings.
