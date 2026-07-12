# A25 Wave 01 Type-Check Owner Handoff Packet

Generated: 2026-07-07T15:56:24.412Z

Dirty map signature: `21bf7897e245ce5bceb31315d088e7024d2e12aa53a9a098945ea69c3440b015`

Expanded dirty entries: 5728

Source routing generated: 2026-07-07T15:56:24.323Z

This is owner handoff evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, feature fixes, or any physical cleanup.

## Summary

- Handoffs: 6
- Cross-owner handoffs: 6
- Wave 01 owner handoffs: 0
- Unique routed files: 20
- Owner file links: 23
- Type-check error lines in source readiness: 404
- Cleanup-authorized rows: 0
- Executable rows: 0

| Owner ID | Owner | Route kind | Files | Error links | Cleanup authorized | Executable |
| --- | --- | --- | ---: | ---: | --- | --- |
| A13 | A13 teacher console lead | cross-owner-blocker | 8 | 168 | no | no |
| A12 | A12 backend/API platform lead | cross-owner-blocker | 7 | 55 | no | no |
| A20 | A20 game design and game-based learning lead | cross-owner-blocker | 3 | 29 | no | no |
| A06 | A06 visualization lead | cross-owner-blocker | 2 | 25 | no | no |
| A05 | A05 lesson lead | cross-owner-blocker | 2 | 14 | no | no |
| A07 | A07 AI tutor lead | cross-owner-blocker | 1 | 9 | no | no |

## A13 A13 teacher console lead

- Route kind: cross-owner-blocker
- Files: 8
- Error links: 168
- Suggested checks:
  - `npm run type-check -- --pretty false`
  - `npx playwright test tests/e2e/teacher-workspace.spec.ts --project=desktop-chrome`
- Files:
  - `components/teacher/TeacherPrepViews.tsx` (36 errors)
  - `components/teacher/TeacherOperationsView.tsx` (32 errors)
  - `lib/teacherReviewLesson.ts` (30 errors)
  - `components/teacher/TeacherReviewLessonView.tsx` (25 errors)
  - `lib/teacherReviewLessonPptx.ts` (18 errors)
  - `app/api/teacher/review-lessons/[reviewLessonId]/route.ts` (9 errors); co-owners: A12
  - `lib/server/teacherReviewLessonLLM.ts` (9 errors); co-owners: A12, A07
  - `lib/teacherAssessmentAnalysis.ts` (9 errors)
- Next actions:
  - Use an isolated A13-owned worktree or owner-approved clean clone before changing any listed source file.
  - Inspect the listed top type-check files: components/teacher/TeacherPrepViews.tsx, components/teacher/TeacherOperationsView.tsx, lib/teacherReviewLesson.ts, components/teacher/TeacherReviewLessonView.tsx, lib/teacherReviewLessonPptx.ts, app/api/teacher/review-lessons/[reviewLessonId]/route.ts, lib/server/teacherReviewLessonLLM.ts, lib/teacherAssessmentAnalysis.ts.
  - Fix only in-scope owner files, or write a blocker report naming the upstream owner if the failure depends on shared types, API contracts, LLM provider behavior, or another owner package.
  - Rerun the suggested checks and record results in the owning session log.
  - Coordinate files with multiple inferred owners before implementation.
- Stop conditions:
  - Stop if the fix needs files outside this owner's AGENTS.md write scope.
  - Stop if the fix needs secrets, provider credential values, or real env files.
  - Stop if the package needs staging, commit, branch, push, reset, restore, clean, worktree removal, pruning, deploy, or file deletion without exact owner approval.
  - After owner resolution or blocker report, ask A25 to rerun Wave 01 governance readiness and the aggregate currentness gate.

## A12 A12 backend/API platform lead

- Route kind: cross-owner-blocker
- Files: 7
- Error links: 55
- Suggested checks:
  - `npm run type-check -- --pretty false`
  - `npx playwright test tests/e2e/backend-api.spec.ts --project=desktop-chrome`
- Files:
  - `app/api/teacher/review-lessons/[reviewLessonId]/route.ts` (9 errors); co-owners: A13
  - `lib/server/teacherReviewLessonLLM.ts` (9 errors); co-owners: A13, A07
  - `app/api/assignments/[assignmentId]/corrections/route.ts` (8 errors)
  - `app/api/assignments/[assignmentId]/submissions/route.ts` (8 errors)
  - `app/api/classroom/live/[sessionId]/work-samples/route.ts` (8 errors)
  - `app/api/me/learner-profile/route.ts` (7 errors)
  - `app/api/classroom/live/actions/route.ts` (6 errors)
- Next actions:
  - Use an isolated A12-owned worktree or owner-approved clean clone before changing any listed source file.
  - Inspect the listed top type-check files: app/api/teacher/review-lessons/[reviewLessonId]/route.ts, lib/server/teacherReviewLessonLLM.ts, app/api/assignments/[assignmentId]/corrections/route.ts, app/api/assignments/[assignmentId]/submissions/route.ts, app/api/classroom/live/[sessionId]/work-samples/route.ts, app/api/me/learner-profile/route.ts, app/api/classroom/live/actions/route.ts.
  - Fix only in-scope owner files, or write a blocker report naming the upstream owner if the failure depends on shared types, API contracts, LLM provider behavior, or another owner package.
  - Rerun the suggested checks and record results in the owning session log.
  - Coordinate files with multiple inferred owners before implementation.
- Stop conditions:
  - Stop if the fix needs files outside this owner's AGENTS.md write scope.
  - Stop if the fix needs secrets, provider credential values, or real env files.
  - Stop if the package needs staging, commit, branch, push, reset, restore, clean, worktree removal, pruning, deploy, or file deletion without exact owner approval.
  - After owner resolution or blocker report, ask A25 to rerun Wave 01 governance readiness and the aggregate currentness gate.

## A20 A20 game design and game-based learning lead

- Route kind: cross-owner-blocker
- Files: 3
- Error links: 29
- Suggested checks:
  - `npm run type-check -- --pretty false`
  - `npx playwright test tests/e2e/adventure-island.spec.ts tests/e2e/fishing-game.spec.ts tests/e2e/gamification.spec.ts --project=desktop-chrome`
- Files:
  - `components/games/MathVirusBlasterGame.tsx` (13 errors)
  - `components/games/MightyTankBattleGame.tsx` (10 errors)
  - `components/games/MathMatchQuestGame.tsx` (6 errors)
- Next actions:
  - Use an isolated A20-owned worktree or owner-approved clean clone before changing any listed source file.
  - Inspect the listed top type-check files: components/games/MathVirusBlasterGame.tsx, components/games/MightyTankBattleGame.tsx, components/games/MathMatchQuestGame.tsx.
  - Fix only in-scope owner files, or write a blocker report naming the upstream owner if the failure depends on shared types, API contracts, LLM provider behavior, or another owner package.
  - Rerun the suggested checks and record results in the owning session log.
- Stop conditions:
  - Stop if the fix needs files outside this owner's AGENTS.md write scope.
  - Stop if the fix needs secrets, provider credential values, or real env files.
  - Stop if the package needs staging, commit, branch, push, reset, restore, clean, worktree removal, pruning, deploy, or file deletion without exact owner approval.
  - After owner resolution or blocker report, ask A25 to rerun Wave 01 governance readiness and the aggregate currentness gate.

## A06 A06 visualization lead

- Route kind: cross-owner-blocker
- Files: 2
- Error links: 25
- Suggested checks:
  - `npm run type-check -- --pretty false`
  - `node --test components/visualizations/configuredVisualizationLabRegressions.test.ts components/visualizations/three/threeDCanvasContract.test.ts components/visualizations/visualizationDiagnostics.test.ts`
  - `npx playwright test tests/e2e/visualization-values.spec.ts tests/e2e/visualization-overlap.spec.ts --project=desktop-chrome`
- Files:
  - `components/visualizations/VisualizationLabPage.tsx` (16 errors)
  - `components/visualizations/three/threeDSceneMath.catalog.test.ts` (9 errors)
- Next actions:
  - Use an isolated A06-owned worktree or owner-approved clean clone before changing any listed source file.
  - Inspect the listed top type-check files: components/visualizations/VisualizationLabPage.tsx, components/visualizations/three/threeDSceneMath.catalog.test.ts.
  - Fix only in-scope owner files, or write a blocker report naming the upstream owner if the failure depends on shared types, API contracts, LLM provider behavior, or another owner package.
  - Rerun the suggested checks and record results in the owning session log.
- Stop conditions:
  - Stop if the fix needs files outside this owner's AGENTS.md write scope.
  - Stop if the fix needs secrets, provider credential values, or real env files.
  - Stop if the package needs staging, commit, branch, push, reset, restore, clean, worktree removal, pruning, deploy, or file deletion without exact owner approval.
  - After owner resolution or blocker report, ask A25 to rerun Wave 01 governance readiness and the aggregate currentness gate.

## A05 A05 lesson lead

- Route kind: cross-owner-blocker
- Files: 2
- Error links: 14
- Suggested checks:
  - `npm run type-check -- --pretty false`
  - `manual lesson page smoke for affected lesson/textbook routes`
- Files:
  - `components/lesson/CaliforniaHighSchoolTextbookPage.tsx` (7 errors)
  - `components/lesson/CaliforniaHighSchoolTextbookStudentPage.tsx` (7 errors)
- Next actions:
  - Use an isolated A05-owned worktree or owner-approved clean clone before changing any listed source file.
  - Inspect the listed top type-check files: components/lesson/CaliforniaHighSchoolTextbookPage.tsx, components/lesson/CaliforniaHighSchoolTextbookStudentPage.tsx.
  - Fix only in-scope owner files, or write a blocker report naming the upstream owner if the failure depends on shared types, API contracts, LLM provider behavior, or another owner package.
  - Rerun the suggested checks and record results in the owning session log.
- Stop conditions:
  - Stop if the fix needs files outside this owner's AGENTS.md write scope.
  - Stop if the fix needs secrets, provider credential values, or real env files.
  - Stop if the package needs staging, commit, branch, push, reset, restore, clean, worktree removal, pruning, deploy, or file deletion without exact owner approval.
  - After owner resolution or blocker report, ask A25 to rerun Wave 01 governance readiness and the aggregate currentness gate.

## A07 A07 AI tutor lead

- Route kind: cross-owner-blocker
- Files: 1
- Error links: 9
- Suggested checks:
  - `npm run type-check -- --pretty false`
  - `coordinate any LLM provider behavior change with A07-owned provider contracts`
- Files:
  - `lib/server/teacherReviewLessonLLM.ts` (9 errors); co-owners: A13, A12
- Next actions:
  - Use an isolated A07-owned worktree or owner-approved clean clone before changing any listed source file.
  - Inspect the listed top type-check files: lib/server/teacherReviewLessonLLM.ts.
  - Fix only in-scope owner files, or write a blocker report naming the upstream owner if the failure depends on shared types, API contracts, LLM provider behavior, or another owner package.
  - Rerun the suggested checks and record results in the owning session log.
  - Coordinate files with multiple inferred owners before implementation.
- Stop conditions:
  - Stop if the fix needs files outside this owner's AGENTS.md write scope.
  - Stop if the fix needs secrets, provider credential values, or real env files.
  - Stop if the package needs staging, commit, branch, push, reset, restore, clean, worktree removal, pruning, deploy, or file deletion without exact owner approval.
  - After owner resolution or blocker report, ask A25 to rerun Wave 01 governance readiness and the aggregate currentness gate.

