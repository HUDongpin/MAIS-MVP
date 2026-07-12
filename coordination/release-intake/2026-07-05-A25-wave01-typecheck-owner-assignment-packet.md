# A25 Wave 01 Type-Check Owner Assignment Packet

Generated: 2026-07-05T11:12:44.960Z

Dirty map signature: `fc405946dbb9033f749aa5e537f14edc23d82355d6b8e796759a4856fcbefeef`

Expanded dirty entries: 4737

Source handoff generated: 2026-07-05T11:12:44.870Z

This is assignment evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, feature fixes, or any physical cleanup.

## Summary

- Assignments: 6
- Read-scope files: 23
- Write-scope candidates: 16
- Coordination-required file links: 8
- Cleanup-authorized rows: 0
- Executable rows: 0

| Agent | Role | Read files | Write candidates | Coordination required | Cleanup authorized | Executable |
| --- | --- | ---: | ---: | ---: | --- | --- |
| A13 | Teacher console lead | 8 | 3 | 5 | no | no |
| A12 | Backend/API platform lead | 7 | 6 | 2 | no | no |
| A20 | Game design and game-based learning lead | 3 | 3 | 0 | no | no |
| A06 | Visualization lead | 2 | 2 | 0 | no | no |
| A05 | Lesson lead | 2 | 2 | 0 | no | no |
| A07 | AI tutor/provider integration lead | 1 | 0 | 1 | no | no |

## A13 Teacher console lead

- Objective: Resolve or formally block the Wave 01 type-check blockers routed to A13 without widening the A25/A10/A22 governance package.
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure`
- Read scope:
  - `components/teacher/TeacherPrepViews.tsx` (36 errors)
  - `components/teacher/TeacherOperationsView.tsx` (32 errors)
  - `lib/teacherReviewLesson.ts` (30 errors)
  - `components/teacher/TeacherReviewLessonView.tsx` (25 errors)
  - `lib/teacherReviewLessonPptx.ts` (18 errors)
  - `app/api/teacher/review-lessons/[reviewLessonId]/route.ts` (9 errors); co-owners: A12
  - `lib/server/teacherReviewLessonLLM.ts` (9 errors); co-owners: A12, A07
  - `lib/teacherAssessmentAnalysis.ts` (9 errors)
- Write scope candidates:
  - `components/teacher/TeacherPrepViews.tsx`
  - `components/teacher/TeacherOperationsView.tsx`
  - `components/teacher/TeacherReviewLessonView.tsx`
- Coordination required:
  - `lib/teacherReviewLesson.ts`: outside this owner's AGENTS.md write scope
  - `lib/teacherReviewLessonPptx.ts`: outside this owner's AGENTS.md write scope
  - `app/api/teacher/review-lessons/[reviewLessonId]/route.ts`: co-owned with A12
  - `lib/server/teacherReviewLessonLLM.ts`: co-owned with A12, A07
  - `lib/teacherAssessmentAnalysis.ts`: outside this owner's AGENTS.md write scope
- Forbidden scope:
  - general API implementation
  - parent/student UI
  - AI Tutor
  - adaptive engine
  - shared types/i18n except coordinated copy-only edits
- Acceptance criteria:
  - Every listed file is either fixed inside the owner's allowed write scope or covered by an owner-routed blocker report.
  - No runtime/source file outside the listed write scope is edited without explicit owner expansion.
  - No dirty-root deploy, broad staging, or physical cleanup is performed.
  - Suggested checks are rerun, or failures are recorded with exact owning-agent blockers.
  - A25 can rerun Wave 01 governance readiness and the aggregate currentness gate after the owner session hands off.
- Checks:
  - `npm run type-check -- --pretty false`
  - `npx playwright test tests/e2e/teacher-workspace.spec.ts --project=desktop-chrome`
  - `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
  - `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix needs files outside this owner's AGENTS.md write scope.
  - Stop if the fix needs secrets, provider credential values, or real env files.
  - Stop if the package needs staging, commit, branch, push, reset, restore, clean, worktree removal, pruning, deploy, or file deletion without exact owner approval.
  - After owner resolution or blocker report, ask A25 to rerun Wave 01 governance readiness and the aggregate currentness gate.
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.

## A12 Backend/API platform lead

- Objective: Resolve or formally block the Wave 01 type-check blockers routed to A12 without widening the A25/A10/A22 governance package.
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A12-backend-api-closure`
- Read scope:
  - `app/api/teacher/review-lessons/[reviewLessonId]/route.ts` (9 errors); co-owners: A13
  - `lib/server/teacherReviewLessonLLM.ts` (9 errors); co-owners: A13, A07
  - `app/api/assignments/[assignmentId]/corrections/route.ts` (8 errors)
  - `app/api/assignments/[assignmentId]/submissions/route.ts` (8 errors)
  - `app/api/classroom/live/[sessionId]/work-samples/route.ts` (8 errors)
  - `app/api/me/learner-profile/route.ts` (7 errors)
  - `app/api/classroom/live/actions/route.ts` (6 errors)
- Write scope candidates:
  - `app/api/teacher/review-lessons/[reviewLessonId]/route.ts`
  - `app/api/assignments/[assignmentId]/corrections/route.ts`
  - `app/api/assignments/[assignmentId]/submissions/route.ts`
  - `app/api/classroom/live/[sessionId]/work-samples/route.ts`
  - `app/api/me/learner-profile/route.ts`
  - `app/api/classroom/live/actions/route.ts`
- Coordination required:
  - `app/api/teacher/review-lessons/[reviewLessonId]/route.ts`: co-owned with A13
  - `lib/server/teacherReviewLessonLLM.ts`: co-owned with A13, A07
- Forbidden scope:
  - app/api/ai-tutor/
  - app/api/adaptive-learning/
  - feature UI pages
  - real .env*
  - LLM prompt/provider behavior without A07/A15 coordination
- Acceptance criteria:
  - Every listed file is either fixed inside the owner's allowed write scope or covered by an owner-routed blocker report.
  - No runtime/source file outside the listed write scope is edited without explicit owner expansion.
  - No dirty-root deploy, broad staging, or physical cleanup is performed.
  - Suggested checks are rerun, or failures are recorded with exact owning-agent blockers.
  - A25 can rerun Wave 01 governance readiness and the aggregate currentness gate after the owner session hands off.
- Checks:
  - `npm run type-check -- --pretty false`
  - `npx playwright test tests/e2e/backend-api.spec.ts --project=desktop-chrome`
  - `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
  - `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix needs files outside this owner's AGENTS.md write scope.
  - Stop if the fix needs secrets, provider credential values, or real env files.
  - Stop if the package needs staging, commit, branch, push, reset, restore, clean, worktree removal, pruning, deploy, or file deletion without exact owner approval.
  - After owner resolution or blocker report, ask A25 to rerun Wave 01 governance readiness and the aggregate currentness gate.
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.

## A20 Game design and game-based learning lead

- Objective: Resolve or formally block the Wave 01 type-check blockers routed to A20 without widening the A25/A10/A22 governance package.
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure`
- Read scope:
  - `components/games/MathVirusBlasterGame.tsx` (13 errors)
  - `components/games/MightyTankBattleGame.tsx` (10 errors)
  - `components/games/MathMatchQuestGame.tsx` (6 errors)
- Write scope candidates:
  - `components/games/MathVirusBlasterGame.tsx`
  - `components/games/MightyTankBattleGame.tsx`
  - `components/games/MathMatchQuestGame.tsx`
- Coordination required:
  - none
- Forbidden scope:
  - reward economy
  - badges/streaks/leaderboards
  - broad gamification storage/API
  - curriculum correctness without A18
  - question-bank edits without A04/A18
- Acceptance criteria:
  - Every listed file is either fixed inside the owner's allowed write scope or covered by an owner-routed blocker report.
  - No runtime/source file outside the listed write scope is edited without explicit owner expansion.
  - No dirty-root deploy, broad staging, or physical cleanup is performed.
  - Suggested checks are rerun, or failures are recorded with exact owning-agent blockers.
  - A25 can rerun Wave 01 governance readiness and the aggregate currentness gate after the owner session hands off.
- Checks:
  - `npm run type-check -- --pretty false`
  - `npx playwright test tests/e2e/adventure-island.spec.ts tests/e2e/fishing-game.spec.ts tests/e2e/gamification.spec.ts --project=desktop-chrome`
  - `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
  - `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix needs files outside this owner's AGENTS.md write scope.
  - Stop if the fix needs secrets, provider credential values, or real env files.
  - Stop if the package needs staging, commit, branch, push, reset, restore, clean, worktree removal, pruning, deploy, or file deletion without exact owner approval.
  - After owner resolution or blocker report, ask A25 to rerun Wave 01 governance readiness and the aggregate currentness gate.
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.

## A06 Visualization lead

- Objective: Resolve or formally block the Wave 01 type-check blockers routed to A06 without widening the A25/A10/A22 governance package.
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure`
- Read scope:
  - `components/visualizations/VisualizationLabPage.tsx` (16 errors)
  - `components/visualizations/three/threeDSceneMath.catalog.test.ts` (9 errors)
- Write scope candidates:
  - `components/visualizations/VisualizationLabPage.tsx`
  - `components/visualizations/three/threeDSceneMath.catalog.test.ts`
- Coordination required:
  - none
- Forbidden scope:
  - AI route
  - provider state
  - curriculum/content final signoff
- Acceptance criteria:
  - Every listed file is either fixed inside the owner's allowed write scope or covered by an owner-routed blocker report.
  - No runtime/source file outside the listed write scope is edited without explicit owner expansion.
  - No dirty-root deploy, broad staging, or physical cleanup is performed.
  - Suggested checks are rerun, or failures are recorded with exact owning-agent blockers.
  - A25 can rerun Wave 01 governance readiness and the aggregate currentness gate after the owner session hands off.
- Checks:
  - `npm run type-check -- --pretty false`
  - `node --test components/visualizations/configuredVisualizationLabRegressions.test.ts components/visualizations/three/threeDCanvasContract.test.ts components/visualizations/visualizationDiagnostics.test.ts`
  - `npx playwright test tests/e2e/visualization-values.spec.ts tests/e2e/visualization-overlap.spec.ts --project=desktop-chrome`
  - `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
  - `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix needs files outside this owner's AGENTS.md write scope.
  - Stop if the fix needs secrets, provider credential values, or real env files.
  - Stop if the package needs staging, commit, branch, push, reset, restore, clean, worktree removal, pruning, deploy, or file deletion without exact owner approval.
  - After owner resolution or blocker report, ask A25 to rerun Wave 01 governance readiness and the aggregate currentness gate.
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.

## A05 Lesson lead

- Objective: Resolve or formally block the Wave 01 type-check blockers routed to A05 without widening the A25/A10/A22 governance package.
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A05-lesson-closure`
- Read scope:
  - `components/lesson/CaliforniaHighSchoolTextbookPage.tsx` (7 errors)
  - `components/lesson/CaliforniaHighSchoolTextbookStudentPage.tsx` (7 errors)
- Write scope candidates:
  - `components/lesson/CaliforniaHighSchoolTextbookPage.tsx`
  - `components/lesson/CaliforniaHighSchoolTextbookStudentPage.tsx`
- Coordination required:
  - none
- Forbidden scope:
  - dashboard
  - practice
  - visualization lab
  - AI route
  - global config
- Acceptance criteria:
  - Every listed file is either fixed inside the owner's allowed write scope or covered by an owner-routed blocker report.
  - No runtime/source file outside the listed write scope is edited without explicit owner expansion.
  - No dirty-root deploy, broad staging, or physical cleanup is performed.
  - Suggested checks are rerun, or failures are recorded with exact owning-agent blockers.
  - A25 can rerun Wave 01 governance readiness and the aggregate currentness gate after the owner session hands off.
- Checks:
  - `npm run type-check -- --pretty false`
  - `manual lesson page smoke for affected lesson/textbook routes`
  - `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
  - `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix needs files outside this owner's AGENTS.md write scope.
  - Stop if the fix needs secrets, provider credential values, or real env files.
  - Stop if the package needs staging, commit, branch, push, reset, restore, clean, worktree removal, pruning, deploy, or file deletion without exact owner approval.
  - After owner resolution or blocker report, ask A25 to rerun Wave 01 governance readiness and the aggregate currentness gate.
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.

## A07 AI tutor/provider integration lead

- Objective: Resolve or formally block the Wave 01 type-check blockers routed to A07 without widening the A25/A10/A22 governance package.
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-closure`
- Read scope:
  - `lib/server/teacherReviewLessonLLM.ts` (9 errors); co-owners: A13, A12
- Write scope candidates:
  - none until owner scope is expanded
- Coordination required:
  - `lib/server/teacherReviewLessonLLM.ts`: co-owned with A13, A12
- Forbidden scope:
  - real .env* secret files
  - visualization logic
  - analytics test logic
  - feature UI outside AI tutor
- Acceptance criteria:
  - Every listed file is either fixed inside the owner's allowed write scope or covered by an owner-routed blocker report.
  - No runtime/source file outside the listed write scope is edited without explicit owner expansion.
  - No dirty-root deploy, broad staging, or physical cleanup is performed.
  - Suggested checks are rerun, or failures are recorded with exact owning-agent blockers.
  - A25 can rerun Wave 01 governance readiness and the aggregate currentness gate after the owner session hands off.
- Checks:
  - `npm run type-check -- --pretty false`
  - `coordinate any LLM provider behavior change with A07-owned provider contracts`
  - `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
  - `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix needs files outside this owner's AGENTS.md write scope.
  - Stop if the fix needs secrets, provider credential values, or real env files.
  - Stop if the package needs staging, commit, branch, push, reset, restore, clean, worktree removal, pruning, deploy, or file deletion without exact owner approval.
  - After owner resolution or blocker report, ask A25 to rerun Wave 01 governance readiness and the aggregate currentness gate.
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.

