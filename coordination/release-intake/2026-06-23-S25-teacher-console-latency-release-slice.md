# S25 Teacher Console Latency Release Slice

- Date: 2026-06-23
- Session ID: S25
- Related owners: S13 teacher console, S08 shared provider state, S12 backend/API, S11 regression, S22 release engineering
- Objective: Map the clean release slice needed to ship the Teacher Scott 12-button Teacher Console latency fix without deploying unrelated dirty-root work.
- Status: Ready for S22 clean/pruned staging; root deploy remains blocked by dirty-tree policy.

## Current Production Baseline

Read-only S11/S22 live probe against `https://mais.hk` at 2026-06-23 00:39 HKT:

- Public demo login: Teacher Scott, `US_CA_MATH`, `P1`.
- Login completed in `1776 ms`.
- Initial `/teacher/dashboard` entry took `8318 ms`.
- Only `5/12` left-nav route clicks completed under the per-route cap.
- Completed routes averaged `18169 ms`, max `38161 ms`.
- Current production still fired `2` `/api/teacher/*` calls during teacher navigation:
  - `/api/teacher/dashboard`: `5682 ms`
  - `/api/teacher/gamification`: `12337 ms`
- Current production still fired `6` `/api/learning-events` calls during teacher navigation, including responses at `31066 ms`, `33042 ms`, `27300 ms`, `30473 ms`, and `34224 ms`.
- Route notes:
  - Overview completed in `2195 ms`.
  - Classes completed in `16743 ms` and triggered `/api/teacher/dashboard`.
  - Analytics timed out at `45034 ms`.
  - Rewards completed in `38161 ms`.
  - Lesson kits completed in `16146 ms` and triggered `/api/teacher/gamification`.
  - Live completed in `17598 ms`.
  - Assignments timed out at `45019 ms`.
  - Resources, Assessments, Reports, Inbox, and Operations could not recover navigation within the capped pass after previous slow routes.

Conclusion: production has not received the S13/S08/S12 latency slice yet, or is still serving an older/dirty build path. The live symptoms still match the owner report: dynamic teacher route work, background teacher API pressure, and slow learning-event traffic during teacher navigation.

## Local Candidate Evidence

Fresh local production smoke after `npm run build`, served on `http://127.0.0.1:3047` at 2026-06-23 00:42 HKT:

- Teacher Scott login: `22 ms`.
- Initial `/teacher/dashboard` entry: `943 ms`.
- All `12/12` left-nav route clicks completed.
- Average nav click-to-ready time: `58 ms`.
- Max nav click-to-ready time: `98 ms`.
- `0` `/api/teacher/*` calls during the 12 nav clicks.
- `0` `/api/learning-events` calls during the 12 nav clicks.

Fresh local gates:

- `node --import tsx --test components/providers/appProvidersTeacherAnalyticsBoundary.test.ts app/teacher/teacherNavigationPerformanceBoundary.test.ts lib/server/userStoreTeacherOpsReportPersistence.test.ts lib/server/teacherDashboardPageBoundary.test.ts` passed, `21/21`.
- `npm run type-check` passed.
- `npm run build` passed, `223` static pages generated. `/teacher/*` routes remain dynamic as expected because the teacher area reads auth cookies.

Release guards:

- `npm run release:preflight -- --json` passed.
- `npm run release:env-preflight -- --json` passed; required production variable names were present, no secret values inspected.
- `npm run release:root-deploy-preflight -- --json` failed protectively because the root worktree is dirty.
- `npm run release:dirty-map -- --reason "teacher console latency release slice"` refreshed the S25 map:
  - `coordination/release-intake/2026-06-23-S25-dirty-tree-map-20260622T164142Z.md`
  - Expanded status entries: `1074`
- `npm run release:publish-preflight -- --json` failed protectively after map refresh because direct root deploy is still blocked:
  - Status entries: `843`
  - Tracked modified: `355`
  - Untracked status entries: `488`
  - Untracked files: `719`

## Runtime Slice To Ship

S13 teacher-console latency slice:

- `app/teacher/getTeacherFoundation.ts`
- `app/teacher/layout.tsx`
- `app/teacher/dashboard/page.tsx`
- `app/teacher/classes/page.tsx`
- `app/teacher/analytics/page.tsx`
- `app/teacher/rewards/page.tsx`
- `app/teacher/lesson-kits/page.tsx`
- `app/teacher/classroom-sessions/page.tsx`
- `app/teacher/assignments/page.tsx`
- `app/teacher/resources/page.tsx`
- `app/teacher/assessments/page.tsx`
- `app/teacher/reports/page.tsx`
- `app/teacher/communications/inbox/page.tsx`
- `app/teacher/operations/renderOperationsPage.tsx`
- `app/teacher/emptyTeacherData.ts`
- `components/teacher/TeacherDashboardClient.tsx`
- `components/teacher/TeacherReportsView.tsx`
- `components/teacher/TeacherRewardsView.tsx`
- `components/teacher/TeacherLiveView.tsx`
- `lib/server/userStore/teacherOpsReportPersistence.ts`

S08/S12 shared request-pressure slice:

- `components/providers/AppProviders.tsx`
- `app/api/learning-events/route.ts`

Regression evidence files to keep with the reviewed slice:

- `app/teacher/teacherNavigationPerformanceBoundary.test.ts`
- `components/providers/appProvidersTeacherAnalyticsBoundary.test.ts`
- `lib/server/userStoreTeacherOpsReportPersistence.test.ts`
- `lib/server/teacherDashboardPageBoundary.test.ts`

Coordination evidence:

- `coordination/session-logs/2026-06-23-S08.md`
- `coordination/session-logs/2026-06-23-S12.md`
- `coordination/session-logs/2026-06-23-S13.md`
- `coordination/session-logs/2026-06-23-S25.md`
- `coordination/blockers/2026-06-23-S13-teacher-global-learning-events.md`
- This report.

## Dirty-Tree Slicing Notes

Do not assume every currently modified teacher file belongs to this latency release. The targeted status also includes older or separate teacher routing/workflow edits that should be reviewed as their own S13 slice unless the owner explicitly includes them:

- `app/teacher/page.tsx`
- `app/teacher/inbox/page.tsx`
- `app/teacher/live/page.tsx`
- `app/teacher/assessments/new/page.tsx`
- `app/teacher/assignments/[assignmentId]/page.tsx`
- `app/teacher/assignments/new/page.tsx`
- `app/teacher/students/[studentId]/page.tsx`

Some latency-slice files also contain larger pre-existing diffs. S22 should isolate only the reviewed latency hunks unless those broader edits are intentionally included:

- `components/teacher/TeacherLiveView.tsx`: include the no-class refresh-pressure guard, not unrelated live-session feature expansion unless separately approved.
- `components/teacher/TeacherRewardsView.tsx`: include the no-class `TeacherGamificationPanel` guard, not unrelated rewards-management expansion unless separately approved.
- `components/providers/AppProviders.tsx`: include the role-aware `recordLearningEvent()` guard; this file has other pre-existing changes.
- `app/api/learning-events/route.ts`: include the non-student `202` fast path; this file has other pre-existing LRS changes.

## S22 Recommended Release Path

1. Use a clean reviewed worktree or S22 pruned staging directory.
2. Apply only the runtime slice above plus matching regression tests and coordination evidence.
3. Re-run:
   - `node --import tsx --test components/providers/appProvidersTeacherAnalyticsBoundary.test.ts app/teacher/teacherNavigationPerformanceBoundary.test.ts lib/server/userStoreTeacherOpsReportPersistence.test.ts lib/server/teacherDashboardPageBoundary.test.ts`
   - `npm run type-check`
   - `npm run build`
   - `npm run release:preflight -- --json`
   - `npm run release:env-preflight -- --json`
   - S22 staging/publish preflight from the clean/pruned slice
4. Deploy preview first unless the owner explicitly requests production.
5. Run the same Teacher Scott 12-button live browser smoke against the deployment URL.
6. Promote/alias only if the deployed smoke shows:
   - 12/12 nav routes complete.
   - No no-class `/api/teacher/dashboard`, `/api/teacher/gamification`, or `/api/teacher/report-previews` during navigation.
   - No teacher-session `/api/learning-events` during navigation.
   - Reports first render does not wait for default preview generation.

## Stop Conditions

- Do not deploy directly from the current dirty root without explicit owner-approved dirty-root override.
- Do not stage, commit, branch, push, reset, delete, revert, or clean files from this report alone.
- If production after clean deploy still shows 10s+ nav delays with zero teacher/background API pressure, route to S22/S12 for Vercel/serverless/storage latency investigation.
- If a real-class teacher remains slow after this no-class fix, route back to S13/S12 for client-side teacher workspace data sharing or short-lived server-side foundation caching for non-empty teachers.

## 2026-06-23 00:52 HKT S22 Update

- A tiny clean candidate from `HEAD` was tested at `.tmp/release-candidates/20260623T0048-teacher-latency-clean`, but `HEAD` is not a viable release base for the current app surface; type-check fails before the latency patch because many current routes/types/helpers are not present in `HEAD`.
- S22 prepared a pruned staging package from the current buildable tree at `.tmp/vercel-staging/20260623T0049-teacher-latency`.
- Staging manifest: `2255` files, `166427961` bytes, `forbiddenPathCount: 0`.
- Staging targeted tests passed, `21/21`.
- Staging `npm run build` passed.
- Staging local production Teacher Scott smoke completed `12/12` routes with average `60 ms`, max `109 ms`, `0` `/api/teacher/*`, and `0` `/api/learning-events`.
- No deploy was performed. Preview/production deployment still needs explicit owner approval because the viable package is a S22 pruned staging package from the dirty current app state.
