# A25 Owner Package Blocker Routing

Generated: 2026-07-08T14:14:19.549Z

Dirty map signature: `4892e406613fc3846378621b84ba0f486bb8ebf371c35837eae544472596f318`

Expanded dirty entries: 6130

Source matrix generated: 2026-07-08T14:14:19.425Z

This is blocker routing evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, or any other physical cleanup.

## Summary

- Matrix rows: 16
- Matrix ready rows: 1
- Matrix blocked rows: 15
- Routing rows: 15
- Cleanup-authorized rows: 0
- Executable rows: 0
- Rows with package resync recommendations: 1
- Type-check error lines routed: 9907

| Wave | Package | Package owners | Route to owners | Failed checks | Type errors | Resyncs |
| --- | --- | --- | --- | ---: | ---: | ---: |
| `wave-01-governance-release-hygiene` | `wave-01-governance-release-hygiene` | A25, A22, A10 | A13 (150), A06 (25), A20 (23), A12 (9) | 1 | 404 | 1 |
| `wave-02-shared-contracts` | `wave-02-shared-contracts` | A08, A12 | A06 (253), A18 (186), A03 (95), A04 (91) | 4 | 689 | 0 |
| `wave-03-shell-dashboard-roadmap` | `a01-app-shell` | A01 | A06 (243), A13 (142), A25 (17), A20 (13) | 2 | 697 | 0 |
| `wave-03-shell-dashboard-roadmap` | `a02-a15-dashboard-adaptive` | A02, A15 | A06 (243), A13 (142), A15 (20), A25 (19) | 3 | 738 | 0 |
| `wave-03-shell-dashboard-roadmap` | `a03-roadmap` | A03 | A06 (227), A13 (142), A03 (95), A18 (95) | 2 | 841 | 0 |
| `wave-04-practice-lesson-content` | `a04-practice` | A04 | A06 (243), A13 (142), A04 (91), A18 (91) | 3 | 885 | 0 |
| `wave-04-practice-lesson-content` | `a05-lesson` | A05 | A06 (243), A13 (142), A03 (35), A18 (35) | 2 | 723 | 0 |
| `wave-04-practice-lesson-content` | `a18-a21-a23-a24-content-evidence` | A18, A21, A23, A24 | A06 (243), A13 (142), A25 (14), A20 (13) | 3 | 756 | 0 |
| `wave-05-visualization-ai-runtime` | `a06-visualization` | A06 | A06 (274), A13 (142), A20 (13) | 3 | 655 | 0 |
| `wave-05-visualization-ai-runtime` | `a07-ai-tutor` | A07 | A06 (243), A13 (142), A20 (13), A07 (12) | 2 | 680 | 0 |
| `wave-05-visualization-ai-runtime` | `a09-copy-i18n-accessibility` | A09 | A06 (254), A13 (142), A20 (13) | 1 | 654 | 0 |
| `wave-05-visualization-ai-runtime` | `a11-regression-evidence` | A11 | A06 (243), A13 (142), A11 (30), A20 (13) | 2 | 697 | 0 |
| `wave-05-visualization-ai-runtime` | `a13-a14-console` | A13, A14 | A13 (305), A06 (227) | 2 | 865 | 0 |
| `wave-05-visualization-ai-runtime` | `a17-a20-game-motivation` | A17, A20 | A06 (265), A13 (142) | 2 | 623 | 0 |
| `wave-06-final-root-and-compose-lifecycle` | `wave-06-final-root-and-compose-lifecycle` | A25, A22 | n/a | 2 | 0 | 0 |

## A25/A10/A22 governance and release hygiene

- Matrix ID: `wave-01-governance-release-hygiene:wave-01-governance-release-hygiene`
- Package owners: A25, A22, A10
- Route to owners: A13 (cross-owner-blocker, 150 type errors), A06 (cross-owner-blocker, 25 type errors), A20 (cross-owner-blocker, 23 type errors), A12 (cross-owner-blocker, 9 type errors)
- Failed checks: typeCheck
- Blocking reasons: 1 held package-resync row remains: wave01-resync-01-tsconfig-json; npm run type-check failed
- Resync recommendations: 1
- Next actions:
  - Use the Wave01 governance frontier as the current source of truth: six A25 artifact-clean rows are owner-authorized but still need a separate execution instruction.
  - Keep wave01-resync-01-tsconfig-json held; do not restore tsconfig.json until the owner explicitly changes that hold.
  - Do not run restore, clean, discard, or file deletion in the package worktree until an exact owner execution instruction is recorded.
  - Keep package-only resync or uncovered-path rows non-executable until the recorded owner input and execution-instruction gates both pass.
  - Route type-check top-file blockers to the inferred cross-owner agents before the package owner attempts a reviewed commit.
  - After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.
- Top type-check files:
  - `components/teacher/TeacherPrepViews.tsx` (36) -> A13
  - `components/teacher/TeacherOperationsView.tsx` (32) -> A13
  - `lib/teacherReviewLesson.ts` (30) -> A13
  - `components/teacher/TeacherReviewLessonView.tsx` (25) -> A13
  - `lib/teacherReviewLessonPptx.ts` (18) -> A13
  - `components/visualizations/VisualizationLabPage.tsx` (16) -> A06
  - `components/games/MathVirusBlasterGame.tsx` (13) -> A20
  - `components/games/MightyTankBattleGame.tsx` (10) -> A20

## A08/A12 shared contracts and storage/API stability

- Matrix ID: `wave-02-shared-contracts:wave-02-shared-contracts`
- Package owners: A08, A12
- Route to owners: A06 (cross-owner-blocker, 253 type errors), A18 (cross-owner-blocker, 186 type errors), A03 (cross-owner-blocker, 95 type errors), A04 (cross-owner-blocker, 91 type errors), A15 (cross-owner-blocker, 24 type errors), A20 (cross-owner-blocker, 13 type errors)
- Failed checks: testAnalytics, testBackend, typeCheck, build
- Blocking reasons: testAnalytics failed; testBackend failed; typeCheck failed; build failed
- Resync recommendations: 0
- Next actions:
  - Route type-check top-file blockers to the inferred cross-owner agents before the package owner attempts a reviewed commit.
  - The owning package session must inspect the named failed checks in its isolated worktree and either fix in scope or produce a blocker report.
  - After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.
- Top type-check files:
  - `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` (206) -> A06
  - `data/questions.ts` (91) -> A04, A18
  - `data/topics.ts` (49) -> A03, A18
  - `data/mainlandPepPrimaryTopics.ts` (24) -> A03, A18
  - `lib/adaptiveLearning.ts` (24) -> A15
  - `data/mainlandPepHighTopics.ts` (22) -> A03, A18
  - `components/visualizations/three/ThreeDGraphCanvas.tsx` (21) -> A06
  - `components/visualizations/VisualizationLabPage.tsx` (14) -> A06

## A01 app shell

- Matrix ID: `wave-03-shell-dashboard-roadmap:a01-app-shell`
- Package owners: A01
- Route to owners: A06 (cross-owner-blocker, 243 type errors), A13 (cross-owner-blocker, 142 type errors), A25 (cross-owner-blocker, 17 type errors), A20 (cross-owner-blocker, 13 type errors)
- Failed checks: typeCheck, appShellPlaywright
- Blocking reasons: A01 app shell typeCheck failed; A01 app shell appShellPlaywright failed
- Resync recommendations: 0
- Next actions:
  - Route type-check top-file blockers to the inferred cross-owner agents before the package owner attempts a reviewed commit.
  - The owning package session must inspect the named failed checks in its isolated worktree and either fix in scope or produce a blocker report.
  - After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.
- Top type-check files:
  - `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` (206) -> A06
  - `components/teacher/TeacherPrepViews.tsx` (36) -> A13
  - `components/teacher/TeacherOperationsView.tsx` (32) -> A13
  - `lib/teacherReviewLesson.ts` (30) -> A13
  - `components/teacher/TeacherReviewLessonView.tsx` (25) -> A13
  - `components/visualizations/three/ThreeDGraphCanvas.tsx` (21) -> A06
  - `lib/teacherReviewLessonPptx.ts` (19) -> A13
  - `app/login/page.tsx` (17) -> A25

## A02/A15 dashboard adaptive

- Matrix ID: `wave-03-shell-dashboard-roadmap:a02-a15-dashboard-adaptive`
- Package owners: A02, A15
- Route to owners: A06 (cross-owner-blocker, 243 type errors), A13 (cross-owner-blocker, 142 type errors), A15 (package-owner, 20 type errors), A25 (cross-owner-blocker, 19 type errors)
- Failed checks: testAnalytics, typeCheck, dashboardAdaptivePlaywright
- Blocking reasons: A02/A15 dashboard adaptive testAnalytics failed; A02/A15 dashboard adaptive typeCheck failed; A02/A15 dashboard adaptive dashboardAdaptivePlaywright failed
- Resync recommendations: 0
- Next actions:
  - Route type-check top-file blockers to the inferred cross-owner agents before the package owner attempts a reviewed commit.
  - The owning package session must inspect the named failed checks in its isolated worktree and either fix in scope or produce a blocker report.
  - After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.
- Top type-check files:
  - `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` (206) -> A06
  - `components/teacher/TeacherPrepViews.tsx` (36) -> A13
  - `components/teacher/TeacherOperationsView.tsx` (32) -> A13
  - `lib/teacherReviewLesson.ts` (30) -> A13
  - `components/teacher/TeacherReviewLessonView.tsx` (25) -> A13
  - `components/visualizations/three/ThreeDGraphCanvas.tsx` (21) -> A06
  - `lib/adaptiveLearning.ts` (20) -> A15
  - `lib/curriculumProfile.ts` (19) -> A25

## A03 roadmap

- Matrix ID: `wave-03-shell-dashboard-roadmap:a03-roadmap`
- Package owners: A03
- Route to owners: A06 (cross-owner-blocker, 227 type errors), A13 (cross-owner-blocker, 142 type errors), A03 (package-owner, 95 type errors), A18 (cross-owner-blocker, 95 type errors)
- Failed checks: typeCheck, roadmapPlaywright
- Blocking reasons: A03 roadmap typeCheck failed; A03 roadmap roadmapPlaywright failed
- Resync recommendations: 0
- Next actions:
  - Route type-check top-file blockers to the inferred cross-owner agents before the package owner attempts a reviewed commit.
  - The owning package session must inspect the named failed checks in its isolated worktree and either fix in scope or produce a blocker report.
  - After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.
- Top type-check files:
  - `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` (206) -> A06
  - `data/topics.ts` (49) -> A03, A18
  - `components/teacher/TeacherPrepViews.tsx` (36) -> A13
  - `components/teacher/TeacherOperationsView.tsx` (32) -> A13
  - `lib/teacherReviewLesson.ts` (30) -> A13
  - `components/teacher/TeacherReviewLessonView.tsx` (25) -> A13
  - `data/mainlandPepPrimaryTopics.ts` (24) -> A03, A18
  - `data/mainlandPepHighTopics.ts` (22) -> A03, A18

## A04 practice

- Matrix ID: `wave-04-practice-lesson-content:a04-practice`
- Package owners: A04
- Route to owners: A06 (cross-owner-blocker, 243 type errors), A13 (cross-owner-blocker, 142 type errors), A04 (package-owner, 91 type errors), A18 (cross-owner-blocker, 91 type errors), A25 (cross-owner-blocker, 27 type errors)
- Failed checks: testQuestionBank, typeCheck, practicePlaywright
- Blocking reasons: A04 practice testQuestionBank failed; A04 practice typeCheck failed; A04 practice practicePlaywright failed
- Resync recommendations: 0
- Next actions:
  - Route type-check top-file blockers to the inferred cross-owner agents before the package owner attempts a reviewed commit.
  - The owning package session must inspect the named failed checks in its isolated worktree and either fix in scope or produce a blocker report.
  - After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.
- Top type-check files:
  - `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` (206) -> A06
  - `data/questions.ts` (91) -> A04, A18
  - `components/teacher/TeacherPrepViews.tsx` (36) -> A13
  - `components/teacher/TeacherOperationsView.tsx` (32) -> A13
  - `lib/teacherReviewLesson.ts` (30) -> A13
  - `lib/mainlandPepHighQuestionBank.test.ts` (27) -> A25
  - `components/teacher/TeacherReviewLessonView.tsx` (25) -> A13
  - `components/visualizations/three/ThreeDGraphCanvas.tsx` (21) -> A06

## A05 lesson

- Matrix ID: `wave-04-practice-lesson-content:a05-lesson`
- Package owners: A05
- Route to owners: A06 (cross-owner-blocker, 243 type errors), A13 (cross-owner-blocker, 142 type errors), A03 (cross-owner-blocker, 35 type errors), A18 (cross-owner-blocker, 35 type errors)
- Failed checks: typeCheck, lessonPlaywright
- Blocking reasons: A05 lesson typeCheck failed; A05 lesson lessonPlaywright failed
- Resync recommendations: 0
- Next actions:
  - Route type-check top-file blockers to the inferred cross-owner agents before the package owner attempts a reviewed commit.
  - The owning package session must inspect the named failed checks in its isolated worktree and either fix in scope or produce a blocker report.
  - After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.
- Top type-check files:
  - `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` (206) -> A06
  - `components/teacher/TeacherPrepViews.tsx` (36) -> A13
  - `components/teacher/TeacherOperationsView.tsx` (32) -> A13
  - `lib/teacherReviewLesson.ts` (30) -> A13
  - `components/teacher/TeacherReviewLessonView.tsx` (25) -> A13
  - `components/visualizations/three/ThreeDGraphCanvas.tsx` (21) -> A06
  - `data/usCaliforniaLessons.ts` (20) -> A03, A18
  - `lib/teacherReviewLessonPptx.ts` (19) -> A13

## A18/A21/A23/A24 content evidence

- Matrix ID: `wave-04-practice-lesson-content:a18-a21-a23-a24-content-evidence`
- Package owners: A18, A21, A23, A24
- Route to owners: A06 (cross-owner-blocker, 243 type errors), A13 (cross-owner-blocker, 142 type errors), A25 (cross-owner-blocker, 14 type errors), A20 (cross-owner-blocker, 13 type errors)
- Failed checks: testRag, testQuestionBank, typeCheck
- Blocking reasons: A18/A21/A23/A24 content evidence has 110 dirty entries outside its pathspec union; A18/A21/A23/A24 content evidence testRag failed; A18/A21/A23/A24 content evidence testQuestionBank failed; A18/A21/A23/A24 content evidence typeCheck failed
- Resync recommendations: 0
- Next actions:
  - A25/A10/A22 must keep package-only resync or uncovered-path rows parked until canonical owner input plus execution-instruction gates both pass; no restore, clean, or discard is authorized by this routing row.
  - Keep package-only resync or uncovered-path rows non-executable until the recorded owner input and execution-instruction gates both pass.
  - Route type-check top-file blockers to the inferred cross-owner agents before the package owner attempts a reviewed commit.
  - The owning package session must inspect the named failed checks in its isolated worktree and either fix in scope or produce a blocker report.
  - After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.
- Top type-check files:
  - `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` (206) -> A06
  - `components/teacher/TeacherPrepViews.tsx` (36) -> A13
  - `components/teacher/TeacherOperationsView.tsx` (32) -> A13
  - `lib/teacherReviewLesson.ts` (30) -> A13
  - `components/teacher/TeacherReviewLessonView.tsx` (25) -> A13
  - `components/visualizations/three/ThreeDGraphCanvas.tsx` (21) -> A06
  - `lib/teacherReviewLessonPptx.ts` (19) -> A13
  - `components/visualizations/VisualizationLabPage.tsx` (16) -> A06

## A06 visualization

- Matrix ID: `wave-05-visualization-ai-runtime:a06-visualization`
- Package owners: A06
- Route to owners: A06 (package-owner, 274 type errors), A13 (cross-owner-blocker, 142 type errors), A20 (cross-owner-blocker, 13 type errors)
- Failed checks: typeCheck, visualizationNodeTests, visualizationPlaywright
- Blocking reasons: A06 visualization typeCheck failed; A06 visualization visualizationNodeTests failed; A06 visualization visualizationPlaywright failed
- Resync recommendations: 0
- Next actions:
  - Route type-check top-file blockers to the inferred cross-owner agents before the package owner attempts a reviewed commit.
  - The owning package session must inspect the named failed checks in its isolated worktree and either fix in scope or produce a blocker report.
  - After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.
- Top type-check files:
  - `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` (216) -> A06
  - `components/teacher/TeacherPrepViews.tsx` (36) -> A13
  - `components/teacher/TeacherOperationsView.tsx` (32) -> A13
  - `lib/teacherReviewLesson.ts` (30) -> A13
  - `components/teacher/TeacherReviewLessonView.tsx` (25) -> A13
  - `components/visualizations/three/manim/MathSceneRuntime.tsx` (25) -> A06
  - `components/visualizations/three/ThreeDGraphCanvas.tsx` (21) -> A06
  - `lib/teacherReviewLessonPptx.ts` (19) -> A13

## A07 AI tutor

- Matrix ID: `wave-05-visualization-ai-runtime:a07-ai-tutor`
- Package owners: A07
- Route to owners: A06 (cross-owner-blocker, 243 type errors), A13 (cross-owner-blocker, 142 type errors), A20 (cross-owner-blocker, 13 type errors), A07 (package-owner, 12 type errors), A12 (cross-owner-blocker, 12 type errors)
- Failed checks: typeCheck, aiTutorPlaywright
- Blocking reasons: A07 AI tutor typeCheck failed; A07 AI tutor aiTutorPlaywright failed
- Resync recommendations: 0
- Next actions:
  - Route type-check top-file blockers to the inferred cross-owner agents before the package owner attempts a reviewed commit.
  - The owning package session must inspect the named failed checks in its isolated worktree and either fix in scope or produce a blocker report.
  - After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.
- Top type-check files:
  - `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` (206) -> A06
  - `components/teacher/TeacherPrepViews.tsx` (36) -> A13
  - `components/teacher/TeacherOperationsView.tsx` (32) -> A13
  - `lib/teacherReviewLesson.ts` (30) -> A13
  - `components/teacher/TeacherReviewLessonView.tsx` (25) -> A13
  - `components/visualizations/three/ThreeDGraphCanvas.tsx` (21) -> A06
  - `lib/teacherReviewLessonPptx.ts` (19) -> A13
  - `components/visualizations/VisualizationLabPage.tsx` (16) -> A06

## A09 copy/i18n/accessibility

- Matrix ID: `wave-05-visualization-ai-runtime:a09-copy-i18n-accessibility`
- Package owners: A09
- Route to owners: A06 (cross-owner-blocker, 254 type errors), A13 (cross-owner-blocker, 142 type errors), A20 (cross-owner-blocker, 13 type errors)
- Failed checks: typeCheck
- Blocking reasons: A09 copy/i18n/accessibility typeCheck failed
- Resync recommendations: 0
- Next actions:
  - Route type-check top-file blockers to the inferred cross-owner agents before the package owner attempts a reviewed commit.
  - After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.
- Top type-check files:
  - `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` (206) -> A06
  - `components/teacher/TeacherPrepViews.tsx` (36) -> A13
  - `components/teacher/TeacherOperationsView.tsx` (32) -> A13
  - `lib/teacherReviewLesson.ts` (30) -> A13
  - `components/teacher/TeacherReviewLessonView.tsx` (25) -> A13
  - `components/visualizations/three/ThreeDGraphCanvas.tsx` (20) -> A06
  - `lib/teacherReviewLessonPptx.ts` (19) -> A13
  - `components/visualizations/VisualizationLabPage.tsx` (16) -> A06

## A11 regression evidence

- Matrix ID: `wave-05-visualization-ai-runtime:a11-regression-evidence`
- Package owners: A11
- Route to owners: A06 (cross-owner-blocker, 243 type errors), A13 (cross-owner-blocker, 142 type errors), A11 (package-owner, 30 type errors), A20 (cross-owner-blocker, 13 type errors)
- Failed checks: typeCheck, regressionPlaywright
- Blocking reasons: A11 regression evidence typeCheck failed; A11 regression evidence regressionPlaywright failed
- Resync recommendations: 0
- Next actions:
  - Route type-check top-file blockers to the inferred cross-owner agents before the package owner attempts a reviewed commit.
  - The owning package session must inspect the named failed checks in its isolated worktree and either fix in scope or produce a blocker report.
  - After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.
- Top type-check files:
  - `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` (206) -> A06
  - `components/teacher/TeacherPrepViews.tsx` (36) -> A13
  - `components/teacher/TeacherOperationsView.tsx` (32) -> A13
  - `lib/mvpReadiness.test.ts` (30) -> A11
  - `lib/teacherReviewLesson.ts` (30) -> A13
  - `components/teacher/TeacherReviewLessonView.tsx` (25) -> A13
  - `components/visualizations/three/ThreeDGraphCanvas.tsx` (21) -> A06
  - `lib/teacherReviewLessonPptx.ts` (19) -> A13

## A13/A14 console

- Matrix ID: `wave-05-visualization-ai-runtime:a13-a14-console`
- Package owners: A13, A14
- Route to owners: A13 (package-owner, 305 type errors), A06 (cross-owner-blocker, 227 type errors)
- Failed checks: typeCheck, consolePlaywright
- Blocking reasons: A13/A14 console typeCheck failed; A13/A14 console consolePlaywright failed
- Resync recommendations: 0
- Next actions:
  - Route type-check top-file blockers to the inferred cross-owner agents before the package owner attempts a reviewed commit.
  - The owning package session must inspect the named failed checks in its isolated worktree and either fix in scope or produce a blocker report.
  - After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.
- Top type-check files:
  - `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` (206) -> A06
  - `components/teacher/TeacherResourceAssessmentViews.tsx` (96) -> A13
  - `components/teacher/TeacherLiveView.tsx` (36) -> A13
  - `components/teacher/TeacherPrepViews.tsx` (36) -> A13
  - `components/teacher/TeacherOperationsView.tsx` (32) -> A13
  - `components/teacher/TeacherManagementViews.tsx` (31) -> A13
  - `lib/teacherReviewLesson.ts` (30) -> A13
  - `components/teacher/TeacherReviewLessonView.tsx` (25) -> A13

## A17/A20 games and motivation

- Matrix ID: `wave-05-visualization-ai-runtime:a17-a20-game-motivation`
- Package owners: A17, A20
- Route to owners: A06 (cross-owner-blocker, 265 type errors), A13 (cross-owner-blocker, 142 type errors)
- Failed checks: typeCheck, gameMotivationPlaywright
- Blocking reasons: A17/A20 games and motivation typeCheck failed; A17/A20 games and motivation gameMotivationPlaywright failed
- Resync recommendations: 0
- Next actions:
  - Route type-check top-file blockers to the inferred cross-owner agents before the package owner attempts a reviewed commit.
  - The owning package session must inspect the named failed checks in its isolated worktree and either fix in scope or produce a blocker report.
  - After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.
- Top type-check files:
  - `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` (206) -> A06
  - `components/teacher/TeacherPrepViews.tsx` (36) -> A13
  - `components/teacher/TeacherOperationsView.tsx` (32) -> A13
  - `lib/teacherReviewLesson.ts` (30) -> A13
  - `components/teacher/TeacherReviewLessonView.tsx` (25) -> A13
  - `components/visualizations/three/ThreeDGraphCanvas.tsx` (21) -> A06
  - `lib/teacherReviewLessonPptx.ts` (19) -> A13
  - `components/visualizations/VisualizationLabPage.tsx` (16) -> A06

## Final root and compose/legacy lifecycle closure

- Matrix ID: `wave-06-final-root-and-compose-lifecycle:wave-06-final-root-and-compose-lifecycle`
- Package owners: A25, A22
- Route to owners: n/a
- Failed checks: releaseSourceClean, strictWorktreeLifecycle
- Blocking reasons: A22 release-source clean gate failed; A25 strict worktree lifecycle gate failed
- Resync recommendations: 0
- Next actions:
  - A25/A22 must keep this as a lifecycle decision until the release-source clean gate and strict worktree lifecycle gate both pass.
  - The owning package session must inspect the named failed checks in its isolated worktree and either fix in scope or produce a blocker report.
  - After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.
- Top type-check files:
  - n/a
