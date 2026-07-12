# S22/S25 Release Hygiene: California Type-Check And Nested Checkout Cleanup

- Date: 2026-06-07 Asia/Hong_Kong
- Sessions: S22 release engineering and S25 release intake gate artifact, prepared in the owner-requested cross-session release closure pass
- Scope: resolve local type-check blocker from `MAIS-MVP-california-practice-beta-clean/`, keep cleanup non-destructive, and record remaining release hygiene status

## Decision

`LOCAL_TYPE_CHECK_BLOCKER_RESOLVED`

`DIRECT_ROOT_PRODUCTION_DEPLOY_STILL_BLOCKED`

The nested local checkout is no longer included in root TypeScript checks or Playwright-generated temporary TypeScript checks. The directory was not deleted.

## Root Cause

- Root `tsconfig.json` included `**/*.ts` and `**/*.tsx`.
- The untracked nested directory `MAIS-MVP-california-practice-beta-clean/` is itself a full Git/Next project.
- Root `npm run type-check` compiled that nested copy and failed on stale provider/type/module mismatches inside the nested checkout.
- Playwright also generated a temporary tsconfig that reset `exclude` to only `node_modules`, reintroducing the same nested checkout during Next builds.

## Fixes Applied

- `tsconfig.json`: added local-output and nested-checkout excludes, including `MAIS-MVP-*`.
- `.gitignore`: added `.next-*/`, `.s??-*/`, and `MAIS-MVP-*/` so local session scratch folders and nested release copies do not pollute release intake.
- `playwright.config.ts`: added the same nested-checkout/output excludes to generated Playwright tsconfig content while preserving `.tmp` so isolated Next type output remains available.

## Checks Run

- Initial `npm run type-check`: failed only from `MAIS-MVP-california-practice-beta-clean/`.
- Post-fix `npm run type-check`: passed.
- Initial targeted Playwright run: failed during Next build for the same nested checkout root cause.
- Post-Playwright-config targeted E2E: passed, 2/2.
- Final `npm run type-check`: passed.

## Remaining Release Hygiene

- Do not deploy directly from the dirty root workspace.
- Existing S22/S19 publish preflight still blocks production deploy on dirty root and missing production env readiness.
- Use a clean reviewed source or the guarded staging path; do not blanket-stage the workspace.
- Keep public name as `California Math Practice Beta` unless owner explicitly approves a later upgrade after all formal-curriculum gates pass.
