# Blocker Report

- Date: 2026-06-23
- Session ID: S13
- Task: Teacher Console online navigation latency
- Blocker type: Scope conflict
- Status: Resolved locally by S08/S12; pending S22/S25 release and live retest

## What Happened

S13 local production measurement for the no-class Teacher Scott path showed the teacher-specific page work is now light: 12/12 Teacher Console left-nav routes averaged `1047 ms`, maxed at `1495 ms`, and generated `0` `/api/teacher/*` calls during route clicks.

The remaining observed slow background work was shared app analytics traffic:

- `/api/learning-events` POST: `4038 ms`
- `/api/learning-events` POST: `3341 ms`
- `/api/learning-events` POST: `3397 ms`

These requests come from shared `components/providers/AppProviders.tsx` page-view tracking and `app/api/learning-events/route.ts`. They do not appear to block teacher page readiness locally, but they still add browser/serverless/storage pressure during Teacher Console navigation and match the owner-reported global request concern.

## Files Involved

- S08-owned shared provider state: `components/providers/AppProviders.tsx`
- S12-owned API route: `app/api/learning-events/route.ts`
- S12-owned LRS/server analytics helper: `lib/server/lrsClient.ts`

## Why S13 Stopped

The fix requires changing shared provider behavior or backend/API analytics behavior, which is outside S13's allowed Teacher Console UI/page-level scope.

## Decision Needed From Owner

Choose the desired analytics policy for teacher/admin console page-view events:

- Do not record teacher/admin page-view learning events.
- Record them only locally and avoid LRS/slow storage flushing.
- Keep recording but make `/api/learning-events` fire-and-forget/non-blocking for page-view batches.

## Safe Next Step

Assign S08 shared provider state plus S12 backend/API to make teacher/admin page-view tracking role-aware, then rerun the S13 Teacher Scott 12-button local measurement and S11/S22 live matrix after deployment.

## Resolution Evidence

- S08 added a provider guard so `recordLearningEvent()` only queues events for student sessions.
- S12 added an API fast path so non-student `/api/learning-events` requests return `202` before JSON parsing, LRS delivery, or storage append.
- `node --import tsx --test components/providers/appProvidersTeacherAnalyticsBoundary.test.ts` passed, 2/2.
- `node --import tsx --test components/providers/appProvidersTeacherAnalyticsBoundary.test.ts app/teacher/teacherNavigationPerformanceBoundary.test.ts lib/server/userStoreTeacherOpsReportPersistence.test.ts lib/server/teacherDashboardPageBoundary.test.ts` passed, 21/21.
- `npm run type-check` passed.
- `npm run build` passed.
- Local production Teacher Scott browser measurement after rebuild: 12/12 Teacher Console nav routes averaged `957 ms`, max `1017 ms`, with `0` `/api/teacher/*` calls and `0` `/api/learning-events` calls during route clicks.
