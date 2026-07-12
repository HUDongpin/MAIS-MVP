# S22/S12 Teacher First-Entry Cold-Start Follow-up

- Date: 2026-06-23
- Sessions: S22 production reliability and release engineering; S12 backend/API platform
- Related sessions: S13 teacher console, S11 regression, S25 release intake
- Target path: Teacher Scott login and first `/teacher/dashboard` entry

## Starting Evidence

S22's final production smoke for `dpl_2778dzv1jiPtbcmSryDomJzJYxjy` closed the 12-button Teacher Console navigation issue, but recorded a separate residual first-entry issue:

- Login submit to signed-in route: `24756 ms`
- Immediate dashboard entry after login: `2289 ms`
- Delayed 70-second dashboard entry: `19281 ms`
- Post-entry sidebar navigation: `12/12`, average about `0.54 s`

The residual issue is therefore not the previous sidebar click path. It is first dynamic entry, serverless startup, and/or storage/auth cold-start pressure.

## Implemented Change

S12 added a narrow fixed-demo fast path for the Teacher Scott no-class workspace:

- `lib/server/internalCaliforniaFastLogin.ts` now exposes storage-free Teacher Scott no-class session and shell helpers by user id.
- `app/teacher/getTeacherFoundation.ts` now verifies the session token first, resolves Teacher Scott's no-class auth/shell before storage-backed auth, and lazy-loads `@/lib/server/auth` and `@/lib/server/userStore` only after the fixed-demo fast path misses.
- Non-demo teachers, HK Teacher Chan, Teacher Phoebe, and internal Teacher Rhi remain on the storage-backed teacher/auth path.

This reduces the first Teacher Scott dashboard render's storage/userStore import pressure. It does not claim to remove all Vercel/serverless cold-start variance.

## Verification

- RED: `node --import tsx --test lib/server/internalCaliforniaFastLogin.test.ts` failed first on missing `getInternalFastNoClassTeacherSessionByUserId`.
- RED: `node --import tsx --test app/teacher/teacherNavigationPerformanceBoundary.test.ts` failed first because `app/teacher/getTeacherFoundation.ts` still had top-level storage-backed auth/userStore imports.
- GREEN: `node --import tsx --test app/teacher/teacherNavigationPerformanceBoundary.test.ts lib/server/internalCaliforniaFastLogin.test.ts` passed `14/14`.
- GREEN: `node --import tsx --test components/providers/appProvidersTeacherAnalyticsBoundary.test.ts app/teacher/teacherNavigationPerformanceBoundary.test.ts lib/server/userStoreTeacherOpsReportPersistence.test.ts lib/server/teacherDashboardPageBoundary.test.ts lib/server/internalCaliforniaFastLogin.test.ts` passed `31/31`.
- GREEN: `npm run type-check -- --pretty false` passed.
- GREEN: `git diff --check` passed for touched S12/S22 files.
- GREEN: conflict-marker scan passed for touched S12/S22 files.

## Build Caveat

`npm run build` compiled successfully, then failed during page-data collection with:

`ENOENT: no such file or directory, open '/Users/dongpinhu/Desktop/MAIS-MVP/.next/build-manifest.json'`

This matches the dirty-root `.next` build-manifest failure class already recorded by S22 during the production release loop. S22 did not mutate `.next`; release-relevant validation should use a clean/pruned staging package before any deploy.

## Recommended Next Gate

If the owner wants production timing evidence, S22 should package this S12/S22 slice through the existing pruned staging flow, run the focused teacher/auth regression bundle plus `npm run build` from staging, deploy only with approval, then rerun the Teacher Scott login and delayed first `/teacher/dashboard` smoke on the deployment URL.
