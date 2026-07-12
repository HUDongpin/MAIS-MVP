# A25 Wave 05 Visualization AI Runtime Readiness

Generated: 2026-07-02T15:47:22.644Z

Dirty map signature: `aab9818713f7df7ad2d9e281c7534227bc41a877b346ef4339ea49f3b0123cb2`

Expanded dirty entries: 3505

This is readiness evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup.

## Result

- Commit ready: no
- Blocking reasons: A06 visualization typeCheck failed; A06 visualization visualizationNodeTests failed; A06 visualization visualizationPlaywright failed; A07 AI tutor typeCheck failed; A07 AI tutor aiTutorPlaywright failed; A09 copy/i18n/accessibility typeCheck failed; A11 regression evidence typeCheck failed; A11 regression evidence regressionPlaywright failed; A13/A14 console typeCheck failed; A13/A14 console consolePlaywright failed; A17/A20 games and motivation typeCheck failed; A17/A20 games and motivation gameMotivationPlaywright failed
- Ready packages: 1/7
- Missing worktrees: 0
- Status entries inspected: 586
- Covered entries: 586
- Uncovered entries: 0
- Checks: 0/12 passed, 12 failed, 0 skipped
- Type-check errors: 4174

## Packages

| Package | Worktree | Ready | Status entries | Covered | Uncovered | Blocking reasons |
| --- | --- | --- | ---: | ---: | ---: | --- |
| A06 visualization | present | no | 437 | 437 | 0 | A06 visualization typeCheck failed; A06 visualization visualizationNodeTests failed; A06 visualization visualizationPlaywright failed |
| A07 AI tutor | present | no | 12 | 12 | 0 | A07 AI tutor typeCheck failed; A07 AI tutor aiTutorPlaywright failed |
| A09 copy/i18n/accessibility | present | no | 5 | 5 | 0 | A09 copy/i18n/accessibility typeCheck failed |
| A11 regression evidence | present | no | 62 | 62 | 0 | A11 regression evidence typeCheck failed; A11 regression evidence regressionPlaywright failed |
| A13/A14 console | present | no | 43 | 43 | 0 | A13/A14 console typeCheck failed; A13/A14 console consolePlaywright failed |
| A16 research evidence | present | yes | 6 | 6 | 0 | none |
| A17/A20 games and motivation | present | no | 21 | 21 | 0 | A17/A20 games and motivation typeCheck failed; A17/A20 games and motivation gameMotivationPlaywright failed |

## Checks

| Package | Check | Result | Status | Command |
| --- | --- | --- | ---: | --- |
| A06 visualization | typeCheck | fail | 2 | `npm run type-check -- --pretty false` |
| A06 visualization | visualizationNodeTests | fail | 1 | `node --test components/visualizations/configuredVisualizationLabRegressions.test.ts components/visualizations/three/threeDCanvasContract.test.ts components/visualizations/visualizationDiagnostics.test.ts` |
| A06 visualization | visualizationPlaywright | fail | 1 | `npx playwright test tests/e2e/visualization-values.spec.ts tests/e2e/visualization-overlap.spec.ts --project=desktop-chrome` |
| A07 AI tutor | typeCheck | fail | 2 | `npm run type-check -- --pretty false` |
| A07 AI tutor | aiTutorPlaywright | fail | 1 | `npx playwright test tests/e2e/ai-tutor-deepseek.spec.ts tests/e2e/ai-tutor-live-text.spec.ts --project=desktop-chrome` |
| A09 copy/i18n/accessibility | typeCheck | fail | 2 | `npm run type-check -- --pretty false` |
| A11 regression evidence | typeCheck | fail | 2 | `npm run type-check -- --pretty false` |
| A11 regression evidence | regressionPlaywright | fail | 1 | `npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/backend-api.spec.ts --project=desktop-chrome` |
| A13/A14 console | typeCheck | fail | 2 | `npm run type-check -- --pretty false` |
| A13/A14 console | consolePlaywright | fail | 1 | `npx playwright test tests/e2e/teacher-workspace.spec.ts tests/e2e/parent-console.spec.ts tests/e2e/class-forum.spec.ts --project=desktop-chrome` |
| A17/A20 games and motivation | typeCheck | fail | 2 | `npm run type-check -- --pretty false` |
| A17/A20 games and motivation | gameMotivationPlaywright | fail | 1 | `npx playwright test tests/e2e/adventure-island.spec.ts tests/e2e/fishing-game.spec.ts tests/e2e/gamification.spec.ts --project=desktop-chrome` |

## Type-Check Hotspots

| Package | File | Errors |
| --- | --- | ---: |
| A06 visualization | `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 216 |
| A06 visualization | `components/teacher/TeacherPrepViews.tsx` | 36 |
| A06 visualization | `components/teacher/TeacherOperationsView.tsx` | 32 |
| A06 visualization | `lib/teacherReviewLesson.ts` | 30 |
| A06 visualization | `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| A06 visualization | `components/visualizations/three/manim/MathSceneRuntime.tsx` | 25 |
| A06 visualization | `components/visualizations/three/ThreeDGraphCanvas.tsx` | 21 |
| A06 visualization | `lib/teacherReviewLessonPptx.ts` | 19 |
| A07 AI tutor | `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 206 |
| A07 AI tutor | `components/teacher/TeacherPrepViews.tsx` | 36 |
| A07 AI tutor | `components/teacher/TeacherOperationsView.tsx` | 32 |
| A07 AI tutor | `lib/teacherReviewLesson.ts` | 30 |
| A07 AI tutor | `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| A07 AI tutor | `components/visualizations/three/ThreeDGraphCanvas.tsx` | 21 |
| A07 AI tutor | `lib/teacherReviewLessonPptx.ts` | 19 |
| A07 AI tutor | `components/visualizations/VisualizationLabPage.tsx` | 16 |
| A09 copy/i18n/accessibility | `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 206 |
| A09 copy/i18n/accessibility | `components/teacher/TeacherPrepViews.tsx` | 36 |
| A09 copy/i18n/accessibility | `components/teacher/TeacherOperationsView.tsx` | 32 |
| A09 copy/i18n/accessibility | `lib/teacherReviewLesson.ts` | 30 |
| A09 copy/i18n/accessibility | `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| A09 copy/i18n/accessibility | `components/visualizations/three/ThreeDGraphCanvas.tsx` | 20 |
| A09 copy/i18n/accessibility | `lib/teacherReviewLessonPptx.ts` | 19 |
| A09 copy/i18n/accessibility | `components/visualizations/VisualizationLabPage.tsx` | 16 |
| A11 regression evidence | `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 206 |
| A11 regression evidence | `components/teacher/TeacherPrepViews.tsx` | 36 |
| A11 regression evidence | `components/teacher/TeacherOperationsView.tsx` | 32 |
| A11 regression evidence | `lib/mvpReadiness.test.ts` | 30 |
| A11 regression evidence | `lib/teacherReviewLesson.ts` | 30 |
| A11 regression evidence | `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| A11 regression evidence | `components/visualizations/three/ThreeDGraphCanvas.tsx` | 21 |
| A11 regression evidence | `lib/teacherReviewLessonPptx.ts` | 19 |
| A13/A14 console | `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 206 |
| A13/A14 console | `components/teacher/TeacherResourceAssessmentViews.tsx` | 96 |
| A13/A14 console | `components/teacher/TeacherLiveView.tsx` | 36 |
| A13/A14 console | `components/teacher/TeacherPrepViews.tsx` | 36 |
| A13/A14 console | `components/teacher/TeacherOperationsView.tsx` | 32 |
| A13/A14 console | `components/teacher/TeacherManagementViews.tsx` | 31 |
| A13/A14 console | `lib/teacherReviewLesson.ts` | 30 |
| A13/A14 console | `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| A17/A20 games and motivation | `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 206 |
| A17/A20 games and motivation | `components/teacher/TeacherPrepViews.tsx` | 36 |
| A17/A20 games and motivation | `components/teacher/TeacherOperationsView.tsx` | 32 |
| A17/A20 games and motivation | `lib/teacherReviewLesson.ts` | 30 |
| A17/A20 games and motivation | `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| A17/A20 games and motivation | `components/visualizations/three/ThreeDGraphCanvas.tsx` | 21 |
| A17/A20 games and motivation | `lib/teacherReviewLessonPptx.ts` | 19 |
| A17/A20 games and motivation | `components/visualizations/VisualizationLabPage.tsx` | 16 |
