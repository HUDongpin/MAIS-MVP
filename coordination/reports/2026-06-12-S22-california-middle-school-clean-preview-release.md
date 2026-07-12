# S22/S25 Release Hygiene: California Middle School Clean Preview

- Date: 2026-06-12 Asia/Hong_Kong
- Sessions: S22 release engineering / S25 release intake
- Scope: unblock California middle-school textbook illustration release path from dirty-root and nested-checkout pollution
- Production deploy: not performed
- Git staging/commit/branch/push: not performed

## Decision

`CLEAN_PREVIEW_PATH_VERIFIED`

The prior blocker from `MAIS-MVP-california-practice-beta-clean/` polluting root type-check/build is resolved for the current workspace release path. Direct root production deploy remains blocked, correctly, because the root worktree is still heavily dirty. A pruned S22 staging source was generated, locally built, deployed to Vercel Preview, inspected as Ready, and smoke-checked through `vercel curl`.

## Preview Evidence

- Preview URL: `https://mais-gv909fdze-peter-dongpin-hu-s-projects.vercel.app`
- Deployment ID: `dpl_94yVZ82cpQq4WtXMApiDQ3HwW3VD`
- Vercel inspect status: `Ready`
- Target: `preview`
- Staging source: `.tmp/vercel-staging/ca-middle-school-release-20260612`
- Staging size: 2,175 files, 493,966,062 bytes

## What Changed

- Added `tsconfig.next.json` as the default Next.js build type-check boundary.
- Updated `next.config.ts` so `NEXT_TSCONFIG_PATH` still overrides the default, while ordinary `next build` uses `tsconfig.next.json`.
- Restored root `tsconfig.json` excludes for local generated output and nested `MAIS-MVP-*` release scratch copies.
- Updated the Playwright-generated temporary tsconfig excludes to recurse into `MAIS-MVP-*/**/*`.
- Added `MAIS-MVP-*/` to `.vercelignore`.
- Added `tsconfig.next.json` to the S22 pruned staging root-file whitelist.

## Checks Run

- `npx tsc --showConfig | rg 'MAIS-MVP-california-practice-beta-clean' || true`: no matches.
- `npx tsc -p tsconfig.next.json --showConfig | rg 'MAIS-MVP-california-practice-beta-clean' || true`: no matches.
- `npm run type-check`: passed.
- `node coordination/content-qa/us-ca-middle-school-lesson-illustrations-v1/validate-illustration-package.mjs`: passed, 15 opportunities and 15 candidate images.
- `node coordination/content-qa/us-ca-middle-school-lesson-illustrations-v1/validate-deterministic-exact-layers.mjs`: passed, 15 exact layers.
- `node coordination/content-qa/us-ca-math-textbooks-v1/validate_middle_school_release.mjs`: passed, 15 chapters, 180 localized task arrays, 74 math facts, 0 issues, 0 warnings.
- `npm run release:preflight -- --json`: passed.
- `npm run release:env-preflight -- --json`: passed; required production env variable names present, 0 missing.
- `npm run build`: passed using `tsconfig.next.json`.
- `npm run vercel:stage -- --json`: passed; generated pruned staging source.
- `PATH="$PWD/node_modules/.bin:$PATH" npm run build --prefix .tmp/vercel-staging/20260612T133438Z`: passed from pruned staging.
- `npm run vercel:preview -- --json --run-id ca-middle-school-release-20260612`: preview deployment created and inspect-verified.
- `vercel inspect mais-gv909fdze-peter-dongpin-hu-s-projects.vercel.app`: Ready after polling.
- `vercel curl /student/lessons/california-middle-school-textbook --deployment <preview-url>`: HTTP 200 through protection-aware CLI.
- Preview HTML smoke:
  - title present
  - student textbook marker present
  - 15 unique California chapter markers present
  - concept image path present
  - no `exact-layer-renders` path exposed on the student route
  - first concept PNG fetched with HTTP 200 and `image/png`

## Remaining Gates

- `npm run release:root-deploy-preflight -- --json` still blocks direct root deploy, as intended:
  - 3,545 status entries
  - 280 tracked modified
  - 4 tracked deleted
  - 3,261 untracked status entries
  - 33,939 untracked files
- Production promotion was not attempted. It still needs explicit owner approval and the production wrapper/preflight path.
- Current preview is protected; anonymous `fetch` returns 401. Smoke must use authenticated browser/SSO or `vercel curl`/approved protection bypass.
- Git hygiene remains open because this pass did not stage, commit, branch, push, delete, reset, or revert anything.

## Handoff

Use the S22 pruned staging or a clean reviewed worktree for any further preview/production action. Do not deploy directly from the root workspace unless the owner explicitly approves `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1` for an emergency exception.
