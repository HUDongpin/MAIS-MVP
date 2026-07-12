# 2026-06-27 A22 Current-Version Production Deploy

- Date: 2026-06-27 10:10 HKT
- Agent: A22 production reliability and release engineering
- Supporting agents: A25 git hygiene/release intake; A19 API configuration readiness; A11 QA and release quality; A06 visualization source consumed by deploy slice
- Request: Deploy the current MAIS-MVP version to `www.mais.ac` and `www.mais.hk` through Vercel.
- Status: Completed. Both requested domains resolve to the new Ready production deployment.

## Production Deployment

- Command: `vercel deploy .tmp/vercel-staging/a22-current-version-20260627-prod -y --prod --scope peter-dongpin-hu-s-projects --project mais-mvp --no-wait`
- Deployment id: `dpl_78BcRgUAAUjcYEpHL7KbkY4URZu7`
- Deployment URL: `https://mais-cw19043ev-peter-dongpin-hu-s-projects.vercel.app`
- Vercel inspect URL: `https://vercel.com/peter-dongpin-hu-s-projects/mais-mvp/78BcRgUAAUjcYEpHL7KbkY4URZu7`
- Target: `production`
- Final status: `Ready`
- Created: 2026-06-27 10:06:52 HKT

## Alias Evidence

`vercel inspect` confirmed both production domains point to `dpl_78BcRgUAAUjcYEpHL7KbkY4URZu7` with status `Ready`.

- `https://www.mais.hk`
- `https://www.mais.ac`

Deployment aliases also include `https://mais.hk`, `https://mais.ac`, and the project Vercel aliases.

## Rollback Target Before Deploy

Before this deployment, both requested domains resolved to:

- Deployment id: `dpl_9jLfwwz7d9ZGdEbvt2hozf5pZ7pm`
- Deployment URL: `https://mais-flkwofkhe-peter-dongpin-hu-s-projects.vercel.app`
- Target: `production`
- Status: `Ready`
- Created: 2026-06-27 00:33:07 HKT

Rollback command if needed:

```bash
vercel rollback dpl_9jLfwwz7d9ZGdEbvt2hozf5pZ7pm --scope peter-dongpin-hu-s-projects
```

## A25 Dirty-Tree Intake

- Initial command: `npm run release:dirty-map -- --reason "A25 intake before A22 production deploy to www.mais.ac and www.mais.hk" --json`
- Initial report: `coordination/release-intake/2026-06-27-A25-dirty-tree-map-20260627T015640Z.md`
- Initial expanded entries: `1686`
- Refreshed command after staging source drift: `npm run release:dirty-map -- --reason "A25 refresh after staging-build source drift before production deploy" --json`
- Refreshed report: `coordination/release-intake/2026-06-27-A25-dirty-tree-map-20260627T020442Z.md`
- Refreshed expanded entries: `1691`
- A25 did not stage, commit, branch, push, reset, delete, revert, clean, preview deploy, or production deploy.

## Release Hygiene And Staging

- Disk guard initially failed with about `11.7 GB` free against the `20 GB` release floor.
- Required A22 generated-artifact cleanup sequence:
  - `node scripts/cleanup-generated-artifacts.mjs --dry-run`: found `.next` and `.tmp`, about `62.4 GB` reclaimable.
  - `node scripts/cleanup-generated-artifacts.mjs --apply`: completed after confirming prior `.tmp` evidence was generated/local and durable summaries were already in `coordination/reports/`.
- Post-cleanup free disk: about `74 GB`.
- Direct root deploy remained blocked by guard because the root is dirty:
  - Status entries: `980`
  - Tracked modified: `368`
  - Untracked status entries: `612`
  - Untracked files: `1318`
- A22 deployed only from a pruned staging directory, not from the repository root.
- Staging script hygiene patch: `scripts/prepare-vercel-staging.mjs` now excludes colocated `*.test.*`, `*.spec.*`, `test`, `tests`, and `__tests__` paths from production staging.
- Final staging source package:
  - Directory: `.tmp/vercel-staging/a22-current-version-20260627-prod`
  - Files in manifest: `2029`
  - Source bytes in manifest: `164671449`
  - Forbidden scan hits: `0`
  - No `.env*`, `All API Keys.docx`, `default accounts.md`, `.git`, `.local`, `coordination`, `tests`, `test`, `__tests__`, `*.test.*`, or `*.spec.*` paths were found in the final source package scan.

## Vercel And Environment Readiness

- Vercel CLI: `54.9.0`
- Authenticated account: local Vercel CLI account available.
- Team scope: `peter-dongpin-hu-s-projects`
- Project: `mais-mvp`
- `npm run release:env-preflight -- --json`: passed.
- Required production environment variable names present: `15/15`.
- Secret values were not printed, copied, stored, or summarized.

## Build And Verification Gates

- `npm run release:preflight -- --json`: passed after generated-artifact cleanup.
- `npm run release:root-deploy-preflight -- --json`: failed protectively because the root worktree is dirty.
- `npm run type-check -- --pretty false`: passed.
- Root build: `NEXT_DIST_DIR=.tmp/a22-current-version-build-20260627 NEXT_TSCONFIG_PATH=tsconfig.next.json NEXT_TELEMETRY_DISABLED=1 npm run build`: passed, built `223` static pages.
- A transient Next-generated include for `.tmp/a22-current-version-build-20260627/types/**/*.ts` was removed from `tsconfig.next.json` after the root build.
- Staging `npm ci`: passed. npm audit reported `2` findings: `1 moderate`, `1 high`.
- First staging build failed because the staging package copied a stale A06-owned visualization file before the current helper was present.
- A25 map and staging package were refreshed; final staging source included `absoluteCommandValues` and `endpointForCommand`.
- Final staging build: `NEXT_TELEMETRY_DISABLED=1 npm run build`: passed, built `223` static pages.

## Production Smoke

A11-owned safe Playwright production preflight:

- Command: `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk npx playwright test tests/e2e/production-auth-api-preflight.spec.ts --project=desktop-chrome`
- Result: passed, `1/1`.

Equivalent read-only HTTP/API probes after alias cutover:

| Domain | Home | Login | Anonymous storage health | Public questions | Public lesson API | Student lesson route | Dashboard protected |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `https://www.mais.hk` | 200 | 200 | 401 | 200 | 200 | 307 | 307 |
| `https://www.mais.ac` | 200 | 200 | 401 | 200 | 200 | 307 | 307 |

The `307` student route/dashboard responses redirect to login and are expected for anonymous requests.

## Checks Not Run

- Production-writing auth/storage smoke was not run because it requires explicit write opt-in.
- Production game smoke was not run because it writes gamification/game state.
- Full production visualization sweep was not run to avoid unnecessary production load.
- No Git staging, commit, branch, push, merge, rebase, reset, delete, or revert was performed.

## Residual Risks

- Repository root remains heavily dirty and uncommitted.
- This deploy came from a pruned current-root staging package, not a clean Git commit.
- npm audit still reports `1 moderate` and `1 high` dependency finding.
- The staging script hygiene patch is currently an uncommitted local release-tooling change.
