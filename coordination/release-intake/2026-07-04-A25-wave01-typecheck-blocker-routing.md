# A25 Wave 01 Type-Check Blocker Routing

Generated: 2026-07-04T15:56:40.947Z

Dirty map signature: `0ed815279a9afc7897df7ef48f2e250da494e4a227adc0a6da14547ba9048571`

Expanded dirty entries: 4323

Wave 01 readiness generated: 2026-07-04T15:56:40.882Z

This is blocker routing evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Type-check passed: no
- Type-check errors: 404
- Top files routed: 20
- Cross-owner blocker files: 20
- Wave 01 owner files: 0
- Cleanup-authorized rows: 0
- Executable rows: 0

## Owner Routes

| Owner ID | Owner | Route kind | Files | Errors |
| --- | --- | --- | ---: | ---: |
| A13 | A13 teacher console lead | cross-owner-blocker | 8 | 168 |
| A12 | A12 backend/API platform lead | cross-owner-blocker | 7 | 55 |
| A20 | A20 game design and game-based learning lead | cross-owner-blocker | 3 | 29 |
| A06 | A06 visualization lead | cross-owner-blocker | 2 | 25 |
| A05 | A05 lesson lead | cross-owner-blocker | 2 | 14 |
| A07 | A07 AI tutor lead | cross-owner-blocker | 1 | 9 |

## Top File Routes

| File | Errors | Inferred owners |
| --- | ---: | --- |
| `components/teacher/TeacherPrepViews.tsx` | 36 | A13 cross-owner-blocker |
| `components/teacher/TeacherOperationsView.tsx` | 32 | A13 cross-owner-blocker |
| `lib/teacherReviewLesson.ts` | 30 | A13 cross-owner-blocker |
| `components/teacher/TeacherReviewLessonView.tsx` | 25 | A13 cross-owner-blocker |
| `lib/teacherReviewLessonPptx.ts` | 18 | A13 cross-owner-blocker |
| `components/visualizations/VisualizationLabPage.tsx` | 16 | A06 cross-owner-blocker |
| `components/games/MathVirusBlasterGame.tsx` | 13 | A20 cross-owner-blocker |
| `components/games/MightyTankBattleGame.tsx` | 10 | A20 cross-owner-blocker |
| `app/api/teacher/review-lessons/[reviewLessonId]/route.ts` | 9 | A12 cross-owner-blocker, A13 cross-owner-blocker |
| `components/visualizations/three/threeDSceneMath.catalog.test.ts` | 9 | A06 cross-owner-blocker |
| `lib/server/teacherReviewLessonLLM.ts` | 9 | A13 cross-owner-blocker, A12 cross-owner-blocker, A07 cross-owner-blocker |
| `lib/teacherAssessmentAnalysis.ts` | 9 | A13 cross-owner-blocker |
| `app/api/assignments/[assignmentId]/corrections/route.ts` | 8 | A12 cross-owner-blocker |
| `app/api/assignments/[assignmentId]/submissions/route.ts` | 8 | A12 cross-owner-blocker |
| `app/api/classroom/live/[sessionId]/work-samples/route.ts` | 8 | A12 cross-owner-blocker |
| `app/api/me/learner-profile/route.ts` | 7 | A12 cross-owner-blocker |
| `components/lesson/CaliforniaHighSchoolTextbookPage.tsx` | 7 | A05 cross-owner-blocker |
| `components/lesson/CaliforniaHighSchoolTextbookStudentPage.tsx` | 7 | A05 cross-owner-blocker |
| `app/api/classroom/live/actions/route.ts` | 6 | A12 cross-owner-blocker |
| `components/games/MathMatchQuestGame.tsx` | 6 | A20 cross-owner-blocker |

## Required Next Actions

- A25/A10/A22 must keep Wave 01 non-commit-ready while these off-scope type-check blockers remain.
- A25 must route the listed cross-owner files to their owning sessions instead of folding runtime fixes into the governance package.
- After the owning sessions resolve or explicitly block their rows, rerun `node coordination/release-intake/generate-wave01-governance-readiness.mjs` and the A25 aggregate currentness gate.
