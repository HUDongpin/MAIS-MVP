# A25 Wave 04 Practice Lesson Content Readiness

Generated: 2026-07-05T11:15:11.610Z

Dirty map signature: `fc405946dbb9033f749aa5e537f14edc23d82355d6b8e796759a4856fcbefeef`

Expanded dirty entries: 4737

This is readiness evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup.

## Result

- Commit ready: no
- Blocking reasons: A04 practice testQuestionBank failed; A04 practice typeCheck failed; A04 practice practicePlaywright failed; A05 lesson typeCheck failed; A05 lesson lessonPlaywright failed; A18/A21/A23/A24 content evidence has 110 dirty entries outside its pathspec union; A18/A21/A23/A24 content evidence testRag failed; A18/A21/A23/A24 content evidence testQuestionBank failed; A18/A21/A23/A24 content evidence typeCheck failed
- Ready packages: 0/3
- Missing worktrees: 0
- Status entries inspected: 404
- Covered entries: 294
- Uncovered entries: 110
- Checks: 0/8 passed, 8 failed, 0 skipped
- Type-check errors: 2364

## Packages

| Package | Worktree | Ready | Status entries | Covered | Uncovered | Blocking reasons |
| --- | --- | --- | ---: | ---: | ---: | --- |
| A04 practice | present | no | 56 | 56 | 0 | A04 practice testQuestionBank failed; A04 practice typeCheck failed; A04 practice practicePlaywright failed |
| A05 lesson | present | no | 126 | 126 | 0 | A05 lesson typeCheck failed; A05 lesson lessonPlaywright failed |
| A18/A21/A23/A24 content evidence | present | no | 222 | 112 | 110 | A18/A21/A23/A24 content evidence has 110 dirty entries outside its pathspec union; A18/A21/A23/A24 content evidence testRag failed; A18/A21/A23/A24 content evidence testQuestionBank failed; A18/A21/A23/A24 content evidence typeCheck failed |

## Checks

| Package | Check | Result | Status | Command |
| --- | --- | --- | ---: | --- |
| A04 practice | testQuestionBank | fail | 1 | `npm run test:question-bank` |
| A04 practice | typeCheck | fail | 2 | `npm run type-check -- --pretty false` |
| A04 practice | practicePlaywright | fail | 1 | `npx playwright test tests/e2e/practice-pager.spec.ts tests/e2e/student-smoke.spec.ts --project=desktop-chrome` |
| A05 lesson | typeCheck | fail | 2 | `npm run type-check -- --pretty false` |
| A05 lesson | lessonPlaywright | fail | 1 | `npx playwright test tests/e2e/lesson-all.spec.ts tests/e2e/mainland-pep-high-lessons.spec.ts tests/e2e/california-k5-textbook-lessons.spec.ts --project=desktop-chrome` |
| A18/A21/A23/A24 content evidence | testRag | fail | 1 | `npm run test:rag` |
| A18/A21/A23/A24 content evidence | testQuestionBank | fail | 1 | `npm run test:question-bank` |
| A18/A21/A23/A24 content evidence | typeCheck | fail | 2 | `npm run type-check -- --pretty false` |

## Type-Check Hotspots

| Package | File | Errors |
| --- | --- | ---: |
| A04 practice | `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 206 |
| A04 practice | `data/questions.ts` | 91 |
| A04 practice | `components/teacher/TeacherPrepViews.tsx` | 36 |
| A04 practice | `components/teacher/TeacherOperationsView.tsx` | 32 |
| A04 practice | `lib/teacherReviewLesson.ts` | 30 |
| A04 practice | `lib/mainlandPepHighQuestionBank.test.ts` | 27 |
| A04 practice | `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| A04 practice | `components/visualizations/three/ThreeDGraphCanvas.tsx` | 21 |
| A05 lesson | `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 206 |
| A05 lesson | `components/teacher/TeacherPrepViews.tsx` | 36 |
| A05 lesson | `components/teacher/TeacherOperationsView.tsx` | 32 |
| A05 lesson | `lib/teacherReviewLesson.ts` | 30 |
| A05 lesson | `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| A05 lesson | `components/visualizations/three/ThreeDGraphCanvas.tsx` | 21 |
| A05 lesson | `data/usCaliforniaLessons.ts` | 20 |
| A05 lesson | `lib/teacherReviewLessonPptx.ts` | 19 |
| A18/A21/A23/A24 content evidence | `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 206 |
| A18/A21/A23/A24 content evidence | `components/teacher/TeacherPrepViews.tsx` | 36 |
| A18/A21/A23/A24 content evidence | `components/teacher/TeacherOperationsView.tsx` | 32 |
| A18/A21/A23/A24 content evidence | `lib/teacherReviewLesson.ts` | 30 |
| A18/A21/A23/A24 content evidence | `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| A18/A21/A23/A24 content evidence | `components/visualizations/three/ThreeDGraphCanvas.tsx` | 21 |
| A18/A21/A23/A24 content evidence | `lib/teacherReviewLessonPptx.ts` | 19 |
| A18/A21/A23/A24 content evidence | `components/visualizations/VisualizationLabPage.tsx` | 16 |
