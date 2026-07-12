# S22 Teacher Console Latency Staging Evidence

- Date: 2026-06-23
- Session ID: S22
- Related sessions: S13 teacher console, S08 shared provider state, S12 backend/API, S25 release intake, S11 regression
- Objective: Prepare and verify a pruned Vercel staging package for the Teacher Scott 12-button Teacher Console latency fix.
- Status: Staging package verified locally; preview deployment performed after owner approval; production deployment not performed.

## Context

S13/S08/S12 fixed the local runtime path for Teacher Scott/no-class teacher navigation. S25 confirmed current `https://mais.hk` still serves the slow path: initial teacher dashboard entry took `8318 ms`, only `5/12` nav clicks completed under the capped live probe, completed routes averaged `18169 ms`, and production still fired `/api/teacher/*` and `/api/learning-events` during teacher navigation.

## Clean Candidate Attempt

S22 created a disposable clean candidate from `HEAD` at:

- `.tmp/release-candidates/20260623T0048-teacher-latency-clean`

That candidate was not viable as a release base because `HEAD` itself is not type-clean for the current app surface. Before applying any latency patch, `npm run type-check` failed with broad missing current-feature exports and type drift, including:

- Missing `@/lib/server/aiGovernance`.
- Missing multiple current `userStore` exports used by current routes.
- Missing current teacher lesson-kit/review/operations symbols.
- Existing teacher `initialClassId` prop drift between `/teacher/classroom-sessions/page.tsx` and `TeacherLiveView`.

Conclusion: a tiny patch against `HEAD` is not a safe deploy base for the current app. The viable path is a S22 pruned staging package from the current buildable tree, matching the previous S22 production-release pattern.

## Staging Package

S22 refreshed the S25 dirty-tree map:

- `coordination/release-intake/2026-06-23-S25-dirty-tree-map-20260622T164856Z.md`
- Expanded status entries: `1078`
- Collapsed status entries: `844`
- Tracked modified: `355`
- Untracked status entries: `489`
- Untracked files: `723`

S22 then prepared a pruned Vercel staging package:

- Staging directory: `.tmp/vercel-staging/20260623T0049-teacher-latency`
- Files: `2255`
- Total bytes: `166427961`
- Forbidden path count: `0`
- Excluded by staging policy:
  - `data/ease`
  - `public/question-illustrations`
  - local secrets and generated outputs

## Gates Run

- `npm run release:runtime-preflight -- --json` passed with the refreshed S25 map.
- `node scripts/prepare-vercel-staging.mjs --dry-run --json --run-id 20260623T0049-teacher-latency` passed:
  - `fileCount: 2255`
  - `forbiddenPathCount: 0`
- `node scripts/prepare-vercel-staging.mjs --json --run-id 20260623T0049-teacher-latency` passed and wrote the staging package.
- From the staging directory, `node --import tsx --test components/providers/appProvidersTeacherAnalyticsBoundary.test.ts app/teacher/teacherNavigationPerformanceBoundary.test.ts lib/server/userStoreTeacherOpsReportPersistence.test.ts lib/server/teacherDashboardPageBoundary.test.ts` passed, `21/21`.
- From the staging directory, `npm run build` passed, generating `223` static pages. `/teacher/*` routes remain dynamic as expected.

## Type-Check Note

From the staging directory, `npm run type-check` and `npx tsc --noEmit --incremental false -p tsconfig.next.json` failed because the pruned staging package intentionally excludes `coordination/` and `scripts/`, while repository test files inside `lib/` import those excluded non-runtime paths:

- `lib/mainlandBnuJuniorQuestionBank.test.ts` imports `../coordination/content-qa/.../approved-question-pack.json`.
- `lib/mainlandPepHighQuestionBank.test.ts` imports `../scripts/compare-mainland-high-question-quality`.

This is a staging-package/tooling issue for the repo-wide standalone TypeScript command, not evidence of a Teacher Console runtime failure. The staging Next build completed successfully and is the relevant Vercel compile gate for this package.

## Staging Runtime Smoke

S22 ran a local production server from the staging build on `http://127.0.0.1:3049`.

Teacher Scott read-only 12-button smoke:

- Login: `22 ms`
- Initial `/teacher/dashboard` entry: `933 ms`
- Completed routes: `12/12`
- Average nav click-to-ready: `60 ms`
- Max nav click-to-ready: `109 ms`
- `/api/teacher/*` during nav: `0`
- `/api/learning-events` during nav: `0`

Per-route nav timings:

- Overview: `109 ms`
- Classes: `54 ms`
- Analytics: `66 ms`
- Rewards: `52 ms`
- Lesson kits: `53 ms`
- Live: `48 ms`
- Assignments: `61 ms`
- Resources: `51 ms`
- Assessments: `42 ms`
- Reports: `64 ms`
- Inbox: `42 ms`
- Operations: `76 ms`

## Deploy Gate

Preview deployment was performed after explicit owner approval from `.tmp/vercel-staging/20260623T0049-teacher-latency`.

Preview evidence is recorded in:

- `coordination/reports/2026-06-23-s22-teacher-console-latency-preview.md`

Preview deployment:

- Deployment ID: `dpl_5gTL8BgpAMWdoXAMYRaJ7KDiZTP6`
- Preview URL: `https://mais-h9mgva3cp-peter-dongpin-hu-s-projects.vercel.app`
- Vercel inspect status: `Ready`

Preview Teacher Scott smoke is blocked before teacher navigation by missing Preview environment parity:

- `/api/auth/login` returns `503`
- Response code: `session-secret-missing`
- Missing Preview variable name includes `AUTH_SESSION_SECRET`

No production deployment, alias promotion, Git staging, commit, branch, push, reset, delete, or revert was performed.

Production publish still requires explicit owner approval because the only viable package is a S22 pruned staging package from the current dirty but buildable tree. Direct dirty-root deploy remains blocked by release policy; this staging path avoids forbidden files but still represents the current dirty app state.

Recommended next step after owner approval:

1. S19 should add or scope the required Preview environment variables, especially `AUTH_SESSION_SECRET` or `NEXTAUTH_SECRET`.
2. S22/S11 should rerun the Teacher Scott 12-button smoke against the Ready preview URL.
3. If preview matches local staging evidence, request explicit owner approval to publish/alias to `mais.hk`.
4. After approval and production publish, run the same live smoke against `https://mais.hk`.

## Residual Risk

- The staging package includes the current buildable app surface, not a minimal patch against `HEAD`.
- The root tree remains highly dirty and should be sliced/committed separately before normal release cadence resumes.
- If production remains slow after this package is deployed and smoke shows no background teacher/API pressure, the next owner is S22/S12 for Vercel/serverless/storage latency.
