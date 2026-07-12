# 2026-06-26 A25 Effective Work Order - A12 backend/API platform

- Owner: A12 backend/API platform
- Priority: P2
- Reason: High-risk API/storage package.
- Entries: 169
- From P0 proposals: 9
- Dominant slice: runtime app/API/data/public: 113
- Pathspec: `coordination/release-intake/latest-A25-effective-owner-a12-backend-api-platform.pathspec`

## Required Final State

Reviewed commit, owner-approved discard, evidence archive, or blocker.

## Suggested Commands

```bash
git status --short --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a12-backend-api-platform.pathspec
git diff --stat --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a12-backend-api-platform.pathspec
```

## Status Buckets

- `??`: 132
- `M`: 37

## P0 Proposal Confidence

- medium: 9

## Path Sample

- `M` `app/api/analytics/export/route.ts`
- `M` `app/api/analytics/summary/route.ts`
- `M` `app/api/attempts/route.ts`
- `M` `app/api/auth/login/route.ts`
- `M` `app/api/auth/logout/route.ts`
- `M` `app/api/auth/password-change/route.ts`
- `M` `app/api/auth/password-reset/confirm/route.ts`
- `M` `app/api/auth/password-reset/request/route.ts`
- `M` `app/api/auth/register/route.ts`
- `M` `app/api/dashboard/route.ts`
- `M` `app/api/handwriting-recognition/route.ts`
- `M` `app/api/learning-events/route.ts`
- `M` `app/api/lesson-entry/route.ts`
- `M` `app/api/lessons/[slug]/route.ts`
- `M` `app/api/me/profile/route.ts`
- `M` `app/api/me/route.ts`
- `M` `app/api/me/settings/route.ts`
- `M` `app/api/parent/children/link/route.ts`
- `M` `app/api/parent/messages/[threadId]/reply/route.ts`
- `M` `app/api/parent/messages/route.ts`
- `M` `app/api/questions/route.ts`
- `M` `app/api/teacher/assessments/[assessmentId]/route.ts`
- `M` `app/api/teacher/assessments/route.ts`
- `M` `app/api/teacher/assignments/[assignmentId]/route.ts`
- `M` `app/api/teacher/assignments/route.ts`
- `M` `app/api/teacher/resources/route.ts`
- `M` `app/api/visualization-sessions/route.ts`
- `M` `lib/server/answerGrading.ts`
- `M` `lib/server/auth.ts`
- `M` `lib/server/internalCaliforniaFastLogin.test.ts`
- `M` `lib/server/internalCaliforniaFastLogin.ts`
- `M` `lib/server/llmProvider.test.ts`
- `M` `lib/server/llmProvider.ts`
- `M` `lib/server/teacherDashboardPageBoundary.test.ts`
- `M` `lib/server/userStore.ts`
- `M` `lib/server/userStoreLessonPerformance.test.ts`
- `M` `middleware.ts`
- `??` `app/api/attempts/routeFastPath.test.ts`
- `??` `app/api/forum/notifications/route.ts`
- `??` `app/api/forum/route.ts`
- `??` `app/api/forum/threads/[threadId]/pulses/route.ts`
- `??` `app/api/forum/threads/[threadId]/replies/route.ts`
- `??` `app/api/forum/threads/[threadId]/reports/route.ts`
- `??` `app/api/forum/threads/[threadId]/route.ts`
- `??` `app/api/lesson-audio/route.ts`
- `??` `app/api/nova-lens/runs/route.ts`
- `??` `app/api/parent/notices/[recipientId]/ack/route.ts`
- `??` `app/api/parent/notices/route.ts`
- `??` `app/api/questions/routeQuestionStore.test.ts`
- `??` `app/forum/page.tsx` (from P0 proposal)
- `??` `components/forum/ForumWorkspace.tsx` (from P0 proposal)
- `??` `data/forum.ts` (from P0 proposal)
- `??` `lib/forum.ts` (from P0 proposal)
- `??` `lib/server/aiGovernance.test.ts`
- `??` `lib/server/aiGovernance.ts`
- `??` `lib/server/answerMatching.test.ts`
- `??` `lib/server/answerMatching.ts`
- `??` `lib/server/hongKongBaseQuestions.ts`
- `??` `lib/server/practiceAttemptStore.test.ts`
- `??` `lib/server/practiceAttemptStore.ts`
- `??` `lib/server/questionStore.test.ts`
- `??` `lib/server/questionStore.ts`
- `??` `lib/server/userStore/aiGovernance.ts`
- `??` `lib/server/userStore/aiGovernancePersistence.ts`
- `??` `lib/server/userStore/aiGovernanceStore.ts`
- `??` `lib/server/userStore/auth.ts`
- `??` `lib/server/userStore/authAdminStoragePersistence.ts`
- `??` `lib/server/userStore/authProvisioningPersistence.ts`
- `??` `lib/server/userStore/authSessionPersistence.ts`
- `??` `lib/server/userStore/authStore.ts`
- `??` `lib/server/userStore/curriculumAvailability.ts`
- `??` `lib/server/userStore/domainContracts.ts`
- `??` `lib/server/userStore/gamification.ts`
- `??` `lib/server/userStore/gamificationCampaignPersistence.ts`
- `??` `lib/server/userStore/gamificationEventPersistence.ts`
- `??` `lib/server/userStore/gamificationGamePersistence.ts`
- `??` `lib/server/userStore/gamificationRewardRedemptionPersistence.ts`
- `??` `lib/server/userStore/gamificationSeedRecords.ts`
- `??` `lib/server/userStore/gamificationStore.ts`
- `??` `lib/server/userStore/gamificationSummaryPersistence.ts`
