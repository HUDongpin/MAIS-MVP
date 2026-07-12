# 2026-06-26 A22 Post-Production Bug/UI Release Readiness

- Date: 2026-06-26 19:45 HKT
- Agent: A22 production reliability and release engineering
- Supporting agents: A25 git hygiene/release intake; A10 tooling/docs/report; A11 QA and release quality
- Objective: Prepare, but not deploy, a stable Vercel release candidate for `www.mais.hk` and `www.mais.ac` that uses the current production staging snapshot plus only post-production bug/UI fixes.
- Status: Ready for owner deploy-approval decision. No production deployment was performed.

## Release Shape

This candidate does not use clean `HEAD` as the base. A clean-HEAD overlay was tested and rejected because `HEAD` lacks many current runtime dependencies and produced broad unrelated type errors.

The validated candidate uses:

- Baseline: `.tmp/vercel-staging/a22-current-version-20260626-1655`
- Baseline production deploy: `dpl_3vKBNELKAQA8K4CvVrk6GXPjd4Bs`, already live on `www.mais.hk` and `www.mais.ac`
- Overlay pathspec: `coordination/release-intake/2026-06-26-A22-post-production-bug-ui-overlay.pathspec`
- Final source staging package: `.tmp/vercel-staging/a22-post-production-bug-ui-20260626-1945`

## Overlay Scope

Included post-production bug/UI surfaces:

- A01-owned Messages receiver fix: `/messages` receiver selector plus US CA example class enrollment support.
- A01-owned mobile home CTA/title polish: `components/home/PedaNovaHomeHero.tsx`.
- A02-owned dashboard/profile/assignments/reward-shop fixes.
- A04-owned Practice Arena/About page UI fixes.
- A06-owned visible Visualization Lab Quest label sizing fix.

Explicitly not promoted as a new broad release scope:

- The full dirty-root runtime state.
- A06 Manim v2 diagnostic expansion beyond files needed by the visible UI overlay.
- Top-level E2E test files in the deploy package.
- Coordination reports, local artifacts, secrets, `.next`, or `node_modules`.

## A25 Dirty Intake

- Fresh A25 map: `coordination/release-intake/2026-06-26-A25-dirty-tree-map-20260626T112308Z.md`
- Expanded dirty entries: `1650`
- Direct dirty-root deploy remains blocked.

## Package Scan

Final source staging package:

- Path: `.tmp/vercel-staging/a22-post-production-bug-ui-20260626-1945`
- Files: `2301`
- Size: about `198 MB`
- Overlay copied: `20` deploy files
- Overlay skipped for deploy: `1` top-level E2E spec
- Missing overlay files: `0`
- Forbidden scan: `0` matches for `.env*`, `All API Keys.docx`, `default accounts.md`, `.git`, `.local`, `coordination`, `node_modules`, `.next`, or top-level `tests`.

## Verification

Clean-HEAD overlay check:

- Result: rejected as invalid release base.
- Reason: clean `HEAD` plus selected files failed type-check with broad missing runtime dependencies and type exports. This proved the correct base is current production snapshot, not stale `HEAD`.

Production-baseline overlay check:

- Temp verification slice: `/var/folders/zr/vf0vw1p93rd19t00wbxpmnnh0000gn/T/mais-a22-prod-plus-bug-ui-l6Qh2t`
- `npm ci`: passed; npm audit still reports `1 moderate` and `1 high`.
- `NEXT_DIST_DIR=.tmp/a22-post-production-bug-ui-build NEXT_TELEMETRY_DISABLED=1 npm run build`: passed; generated `223` static pages.
- Focused source/unit tests passed, `32/32`:
  - `lib/server/userStoreTeacherOpsClassPersistence.test.ts`
  - `components/dashboard/studentProfileAvatarUpload.test.ts`
  - `components/dashboard/studentRewardsPanelLayout.test.ts`
  - `app/practice/practiceArenaPageRegressions.test.ts`
  - `components/visualizations/visualizationLabPageRegressions.test.ts`
- Full `npm run type-check` in the pruned verification slice failed only on pruning/test artifacts: excluded `coordination`, excluded `scripts`, missing top-level `tests/e2e/helpers.ts`, and a test-only A06 Manim contract. This is not used as the deployment gate for the pruned package.

Safe local HTTP smoke from the built candidate:

| Probe | Status |
| --- | ---: |
| `/` | 200 |
| `/login` | 200 |
| `/about` | 200 |
| `/practice` | 200 |
| `/messages` unauthenticated | 307 to login |
| `/personalized-learning` | 200 |
| `/student/assignments` | 200 |
| `/student/tools/visualizations?grade=P1&track=US` | 200 |
| `/api/questions?grade=P1` | 200 |
| `/api/lesson-entry?grade=P1` unauthenticated | 401 |
| `/api/me` unauthenticated | 401 |

Local authenticated browser smoke with dummy local-only `AUTH_SESSION_SECRET`:

- Login as public demo Student Shirleen: passed with session cookie.
- `/dashboard`: `Shortcuts` visible; `Open reward shop` text present.
- Shortcuts menu: Assignments link visible after clicking `Shortcuts`.
- `/messages`: `Message receiver` visible and `California Grade 1 Mathematics` class visible.
- `/student/assignments`: Assignments heading visible.
- `/personalized-learning`: `All assignments` link visible.
- `/student/tools/visualizations?grade=P1&track=US`: `Visualization Lab` and `Lab Quest` visible.

## Go / No-Go

Go for owner-approved production deploy from the final source staging package, not from dirty root.

Required approval wording:

> approve A22 production deploy of `.tmp/vercel-staging/a22-post-production-bug-ui-20260626-1945` to `www.mais.hk` and `www.mais.ac`

Recommended deploy command after approval:

```bash
vercel deploy .tmp/vercel-staging/a22-post-production-bug-ui-20260626-1945 -y --prod --scope peter-dongpin-hu-s-projects --project mais-mvp --no-wait
```

## Residual Risks

- Root remains heavily dirty and uncommitted.
- This is a production-baseline-plus-overlay package, not a clean Git commit.
- Full pruned-package `tsc` is not meaningful because deployment pruning excludes QA-only imports; production build and focused tests are green.
- npm audit still reports `1 moderate` and `1 high`.
- A25/A10 still need source-control closure for the accepted release slice after any deployment.
