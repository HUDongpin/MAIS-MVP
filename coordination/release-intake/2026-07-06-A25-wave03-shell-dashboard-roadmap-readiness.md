# A25 Wave 03 Shell Dashboard Roadmap Readiness

Generated: 2026-07-06T15:49:49.440Z

Dirty map signature: `b26fe39c438a20cdbb9cf3943e3d000d9dc8dc04ccccedc13792c457c5942d3b`

Expanded dirty entries: 5183

This is readiness evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup.

## Result

- Commit ready: no
- Blocking reasons: A01 app shell typeCheck failed; A01 app shell appShellPlaywright failed; A02/A15 dashboard adaptive testAnalytics failed; A02/A15 dashboard adaptive typeCheck failed; A02/A15 dashboard adaptive dashboardAdaptivePlaywright failed; A03 roadmap typeCheck failed; A03 roadmap roadmapPlaywright failed
- Ready packages: 0/3
- Missing worktrees: 0
- Status entries inspected: 86
- Covered entries: 86
- Uncovered entries: 0
- Checks: 0/7 passed, 7 failed, 0 skipped
- Type-check errors: 2276

## Packages

| Package | Worktree | Ready | Status entries | Covered | Uncovered | Blocking reasons |
| --- | --- | --- | ---: | ---: | ---: | --- |
| A01 app shell | present | no | 26 | 26 | 0 | A01 app shell typeCheck failed; A01 app shell appShellPlaywright failed |
| A02/A15 dashboard adaptive | present | no | 30 | 30 | 0 | A02/A15 dashboard adaptive testAnalytics failed; A02/A15 dashboard adaptive typeCheck failed; A02/A15 dashboard adaptive dashboardAdaptivePlaywright failed |
| A03 roadmap | present | no | 30 | 30 | 0 | A03 roadmap typeCheck failed; A03 roadmap roadmapPlaywright failed |

## Checks

| Package | Check | Result | Status | Command |
| --- | --- | --- | ---: | --- |
| A01 app shell | typeCheck | fail | 2 | `npm run type-check -- --pretty false` |
| A01 app shell | appShellPlaywright | fail | 1 | `npx playwright test tests/e2e/app-shell-auth.spec.ts tests/e2e/home-functional.spec.ts --project=desktop-chrome` |
| A02/A15 dashboard adaptive | testAnalytics | fail | 1 | `npm run test:analytics` |
| A02/A15 dashboard adaptive | typeCheck | fail | 2 | `npm run type-check -- --pretty false` |
| A02/A15 dashboard adaptive | dashboardAdaptivePlaywright | fail | 1 | `npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/adaptive-llm-smoke.spec.ts --project=desktop-chrome` |
| A03 roadmap | typeCheck | fail | 2 | `npm run type-check -- --pretty false` |
| A03 roadmap | roadmapPlaywright | fail | 1 | `npx playwright test tests/e2e/mainland-hjb-roadmaps.spec.ts tests/e2e/mainland-pep-roadmaps.spec.ts --project=desktop-chrome` |

## Type-Check Hotspots

| Package | File | Errors |
| --- | --- | ---: |
| A01 app shell | `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 206 |
| A01 app shell | `components/teacher/TeacherPrepViews.tsx` | 36 |
| A01 app shell | `components/teacher/TeacherOperationsView.tsx` | 32 |
| A01 app shell | `lib/teacherReviewLesson.ts` | 30 |
| A01 app shell | `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| A01 app shell | `components/visualizations/three/ThreeDGraphCanvas.tsx` | 21 |
| A01 app shell | `lib/teacherReviewLessonPptx.ts` | 19 |
| A01 app shell | `app/login/page.tsx` | 17 |
| A02/A15 dashboard adaptive | `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 206 |
| A02/A15 dashboard adaptive | `components/teacher/TeacherPrepViews.tsx` | 36 |
| A02/A15 dashboard adaptive | `components/teacher/TeacherOperationsView.tsx` | 32 |
| A02/A15 dashboard adaptive | `lib/teacherReviewLesson.ts` | 30 |
| A02/A15 dashboard adaptive | `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| A02/A15 dashboard adaptive | `components/visualizations/three/ThreeDGraphCanvas.tsx` | 21 |
| A02/A15 dashboard adaptive | `lib/adaptiveLearning.ts` | 20 |
| A02/A15 dashboard adaptive | `lib/curriculumProfile.ts` | 19 |
| A03 roadmap | `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 206 |
| A03 roadmap | `data/topics.ts` | 49 |
| A03 roadmap | `components/teacher/TeacherPrepViews.tsx` | 36 |
| A03 roadmap | `components/teacher/TeacherOperationsView.tsx` | 32 |
| A03 roadmap | `lib/teacherReviewLesson.ts` | 30 |
| A03 roadmap | `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| A03 roadmap | `data/mainlandPepPrimaryTopics.ts` | 24 |
| A03 roadmap | `data/mainlandPepHighTopics.ts` | 22 |
