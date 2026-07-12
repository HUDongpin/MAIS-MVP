# A25 Owner Package Blocker Report Starter

Generated: 2026-07-05T11:15:23.790Z

Dirty map signature: `fc405946dbb9033f749aa5e537f14edc23d82355d6b8e796759a4856fcbefeef`

Expanded dirty entries: 4737

Source assignment packet generated: 2026-07-05T11:15:23.589Z

Target blocker report file: `coordination/release-intake/latest-A25-owner-package-blocker-reports.json`

This is a starter artifact only, not a blocker report and not authorization. It does not create or update the target blocker report file. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Starter rows: 11
- Pending rows: 11
- Package row links: 54
- Write-scope files: 20
- Coordination-required files: 32
- Cleanup-authorized rows: 0
- Executable rows: 0

| Report ID | Agent | Owner | Package rows | Write files | Coordination files | Status | Executable now |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `owner-package-blocker-report-a06` | A06 | A06 visualization lead | 14 | 6 | 5 | pending-owner-report | no |
| `owner-package-blocker-report-a13` | A13 | A13 teacher console lead | 13 | 6 | 6 | pending-owner-report | no |
| `owner-package-blocker-report-a18` | A18 | A18 curriculum QA and content quality lead | 4 | 0 | 6 | pending-owner-report | no |
| `owner-package-blocker-report-a03` | A03 | A03 curriculum roadmap lead | 3 | 1 | 5 | pending-owner-report | no |
| `owner-package-blocker-report-a04` | A04 | A04 practice lead | 2 | 1 | 1 | pending-owner-report | no |
| `owner-package-blocker-report-a20` | A20 | A20 game design and game-based learning lead | 8 | 2 | 2 | pending-owner-report | no |
| `owner-package-blocker-report-a25` | A25 | A25 git hygiene and release intake lead | 4 | 0 | 4 | pending-owner-report | no |
| `owner-package-blocker-report-a15` | A15 | A15 adaptive engine lead | 2 | 1 | 1 | pending-owner-report | no |
| `owner-package-blocker-report-a11` | A11 | A11 QA and release quality lead | 1 | 1 | 0 | pending-owner-report | no |
| `owner-package-blocker-report-a12` | A12 | A12 backend/API platform lead | 2 | 1 | 2 | pending-owner-report | no |
| `owner-package-blocker-report-a07` | A07 | A07 AI tutor lead | 1 | 1 | 0 | pending-owner-report | no |

## owner-package-blocker-report-a06

- Assignment ID: `owner-package-blocker-a06`
- Agent: A06
- Owner: A06 visualization lead
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure`
- Report fingerprint: `7905143048e4e10f69d153735a0de40a020e0819766d2fa262c9647bb19e0606`
- Reported by: (blank)
- Reported at: (blank)
- Owner decision: (blank)
- Cleanup authorized: false
- Executable now: false
- Package blockers:
  - `wave-01-governance-release-hygiene:wave-01-governance-release-hygiene`: 1 held package-resync row remains: wave01-resync-01-tsconfig-json; 6 owner-authorized Wave01 artifact-clean row(s) still need separate execution instruction; npm audit --audit-level=high failed or unavailable; release helper tests failed; npm run type-check failed
  - `wave-02-shared-contracts:wave-02-shared-contracts`: testAnalytics failed; testBackend failed; typeCheck failed; build failed
  - `wave-03-shell-dashboard-roadmap:a01-app-shell`: A01 app shell typeCheck failed; A01 app shell appShellPlaywright failed
  - `wave-03-shell-dashboard-roadmap:a02-a15-dashboard-adaptive`: A02/A15 dashboard adaptive testAnalytics failed; A02/A15 dashboard adaptive typeCheck failed; A02/A15 dashboard adaptive dashboardAdaptivePlaywright failed
  - `wave-03-shell-dashboard-roadmap:a03-roadmap`: A03 roadmap typeCheck failed; A03 roadmap roadmapPlaywright failed
  - `wave-04-practice-lesson-content:a04-practice`: A04 practice testQuestionBank failed; A04 practice typeCheck failed; A04 practice practicePlaywright failed
  - `wave-04-practice-lesson-content:a05-lesson`: A05 lesson typeCheck failed; A05 lesson lessonPlaywright failed
  - `wave-04-practice-lesson-content:a18-a21-a23-a24-content-evidence`: A18/A21/A23/A24 content evidence has 110 dirty entries outside its pathspec union; A18/A21/A23/A24 content evidence testRag failed; A18/A21/A23/A24 content evidence testQuestionBank failed; A18/A21/A23/A24 content evidence typeCheck failed
  - `wave-05-visualization-ai-runtime:a06-visualization`: A06 visualization typeCheck failed; A06 visualization visualizationNodeTests failed; A06 visualization visualizationPlaywright failed
  - `wave-05-visualization-ai-runtime:a07-ai-tutor`: A07 AI tutor typeCheck failed; A07 AI tutor aiTutorPlaywright failed
  - `wave-05-visualization-ai-runtime:a09-copy-i18n-accessibility`: A09 copy/i18n/accessibility typeCheck failed
  - `wave-05-visualization-ai-runtime:a11-regression-evidence`: A11 regression evidence typeCheck failed; A11 regression evidence regressionPlaywright failed
  - `wave-05-visualization-ai-runtime:a13-a14-console`: A13/A14 console typeCheck failed; A13/A14 console consolePlaywright failed
  - `wave-05-visualization-ai-runtime:a17-a20-game-motivation`: A17/A20 games and motivation typeCheck failed; A17/A20 games and motivation gameMotivationPlaywright failed
- Write scope candidates:
  - `components/visualizations/three/manim/MathSceneRuntime.tsx`
  - `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx`
  - `components/visualizations/three/ThreeDGraphCanvas.tsx`
  - `components/visualizations/three/ThreeDLabCanvas.tsx`
  - `components/visualizations/three/threeDSceneMath.catalog.test.ts`
  - `components/visualizations/VisualizationLabPage.tsx`
- Coordination required:
  - `components/visualizations/three/manim/MathSceneRuntime.tsx`: cross-owner blocker; coordinate with package owner before editing
  - `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx`: cross-owner blocker; coordinate with package owner before editing
  - `components/visualizations/three/ThreeDGraphCanvas.tsx`: cross-owner blocker; coordinate with package owner before editing
  - `components/visualizations/three/threeDSceneMath.catalog.test.ts`: cross-owner blocker; coordinate with package owner before editing
  - `components/visualizations/VisualizationLabPage.tsx`: cross-owner blocker; coordinate with package owner before editing
- Checks:
  - `npm audit --audit-level=high`
  - `/usr/local/bin/node --test scripts/cleanup-generated-artifacts.test.mjs scripts/deploy-vercel-preview.test.mjs scripts/deploy-vercel-production.test.mjs scripts/release-build-gate.test.mjs scripts/release-env-guard.test.mjs`
  - `npm run type-check -- --pretty false`
  - `npm run test:analytics`
  - `npm run test:backend`
  - `npm run build`
  - `npx playwright test tests/e2e/app-shell-auth.spec.ts tests/e2e/home-functional.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/adaptive-llm-smoke.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/mainland-hjb-roadmaps.spec.ts tests/e2e/mainland-pep-roadmaps.spec.ts --project=desktop-chrome`
  - `npm run test:question-bank`
  - `npx playwright test tests/e2e/practice-pager.spec.ts tests/e2e/student-smoke.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/lesson-all.spec.ts tests/e2e/mainland-pep-high-lessons.spec.ts tests/e2e/california-k5-textbook-lessons.spec.ts --project=desktop-chrome`
  - `npm run test:rag`
  - `node --test components/visualizations/configuredVisualizationLabRegressions.test.ts components/visualizations/three/threeDCanvasContract.test.ts components/visualizations/visualizationDiagnostics.test.ts`
  - `npx playwright test tests/e2e/visualization-values.spec.ts tests/e2e/visualization-overlap.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/ai-tutor-deepseek.spec.ts tests/e2e/ai-tutor-live-text.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/backend-api.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/teacher-workspace.spec.ts tests/e2e/parent-console.spec.ts tests/e2e/class-forum.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/adventure-island.spec.ts tests/e2e/fishing-game.spec.ts tests/e2e/gamification.spec.ts --project=desktop-chrome`
  - `node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-routing-current.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if a routed file is outside this owner's write scope and no explicit scope expansion exists.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.
  - Stop if the work would expose or edit real secrets.

## owner-package-blocker-report-a13

- Assignment ID: `owner-package-blocker-a13`
- Agent: A13
- Owner: A13 teacher console lead
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure`
- Report fingerprint: `871be6f027478937b09d49ced005d178b80bb26bc42f08875f9ed35ad22388f8`
- Reported by: (blank)
- Reported at: (blank)
- Owner decision: (blank)
- Cleanup authorized: false
- Executable now: false
- Package blockers:
  - `wave-01-governance-release-hygiene:wave-01-governance-release-hygiene`: 1 held package-resync row remains: wave01-resync-01-tsconfig-json; 6 owner-authorized Wave01 artifact-clean row(s) still need separate execution instruction; npm audit --audit-level=high failed or unavailable; release helper tests failed; npm run type-check failed
  - `wave-03-shell-dashboard-roadmap:a01-app-shell`: A01 app shell typeCheck failed; A01 app shell appShellPlaywright failed
  - `wave-03-shell-dashboard-roadmap:a02-a15-dashboard-adaptive`: A02/A15 dashboard adaptive testAnalytics failed; A02/A15 dashboard adaptive typeCheck failed; A02/A15 dashboard adaptive dashboardAdaptivePlaywright failed
  - `wave-03-shell-dashboard-roadmap:a03-roadmap`: A03 roadmap typeCheck failed; A03 roadmap roadmapPlaywright failed
  - `wave-04-practice-lesson-content:a04-practice`: A04 practice testQuestionBank failed; A04 practice typeCheck failed; A04 practice practicePlaywright failed
  - `wave-04-practice-lesson-content:a05-lesson`: A05 lesson typeCheck failed; A05 lesson lessonPlaywright failed
  - `wave-04-practice-lesson-content:a18-a21-a23-a24-content-evidence`: A18/A21/A23/A24 content evidence has 110 dirty entries outside its pathspec union; A18/A21/A23/A24 content evidence testRag failed; A18/A21/A23/A24 content evidence testQuestionBank failed; A18/A21/A23/A24 content evidence typeCheck failed
  - `wave-05-visualization-ai-runtime:a06-visualization`: A06 visualization typeCheck failed; A06 visualization visualizationNodeTests failed; A06 visualization visualizationPlaywright failed
  - `wave-05-visualization-ai-runtime:a07-ai-tutor`: A07 AI tutor typeCheck failed; A07 AI tutor aiTutorPlaywright failed
  - `wave-05-visualization-ai-runtime:a09-copy-i18n-accessibility`: A09 copy/i18n/accessibility typeCheck failed
  - `wave-05-visualization-ai-runtime:a11-regression-evidence`: A11 regression evidence typeCheck failed; A11 regression evidence regressionPlaywright failed
  - `wave-05-visualization-ai-runtime:a13-a14-console`: A13/A14 console typeCheck failed; A13/A14 console consolePlaywright failed
  - `wave-05-visualization-ai-runtime:a17-a20-game-motivation`: A17/A20 games and motivation typeCheck failed; A17/A20 games and motivation gameMotivationPlaywright failed
- Write scope candidates:
  - `components/teacher/TeacherLiveView.tsx`
  - `components/teacher/TeacherManagementViews.tsx`
  - `components/teacher/TeacherOperationsView.tsx`
  - `components/teacher/TeacherPrepViews.tsx`
  - `components/teacher/TeacherResourceAssessmentViews.tsx`
  - `components/teacher/TeacherReviewLessonView.tsx`
- Coordination required:
  - `app/api/teacher/review-lessons/[reviewLessonId]/route.ts`: outside this owner's AGENTS.md write scope
  - `components/teacher/TeacherOperationsView.tsx`: cross-owner blocker; coordinate with package owner before editing
  - `components/teacher/TeacherPrepViews.tsx`: cross-owner blocker; coordinate with package owner before editing
  - `components/teacher/TeacherReviewLessonView.tsx`: cross-owner blocker; coordinate with package owner before editing
  - `lib/teacherReviewLesson.ts`: outside this owner's AGENTS.md write scope
  - `lib/teacherReviewLessonPptx.ts`: outside this owner's AGENTS.md write scope
- Checks:
  - `npm audit --audit-level=high`
  - `/usr/local/bin/node --test scripts/cleanup-generated-artifacts.test.mjs scripts/deploy-vercel-preview.test.mjs scripts/deploy-vercel-production.test.mjs scripts/release-build-gate.test.mjs scripts/release-env-guard.test.mjs`
  - `npm run type-check -- --pretty false`
  - `npx playwright test tests/e2e/app-shell-auth.spec.ts tests/e2e/home-functional.spec.ts --project=desktop-chrome`
  - `npm run test:analytics`
  - `npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/adaptive-llm-smoke.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/mainland-hjb-roadmaps.spec.ts tests/e2e/mainland-pep-roadmaps.spec.ts --project=desktop-chrome`
  - `npm run test:question-bank`
  - `npx playwright test tests/e2e/practice-pager.spec.ts tests/e2e/student-smoke.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/lesson-all.spec.ts tests/e2e/mainland-pep-high-lessons.spec.ts tests/e2e/california-k5-textbook-lessons.spec.ts --project=desktop-chrome`
  - `npm run test:rag`
  - `node --test components/visualizations/configuredVisualizationLabRegressions.test.ts components/visualizations/three/threeDCanvasContract.test.ts components/visualizations/visualizationDiagnostics.test.ts`
  - `npx playwright test tests/e2e/visualization-values.spec.ts tests/e2e/visualization-overlap.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/ai-tutor-deepseek.spec.ts tests/e2e/ai-tutor-live-text.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/backend-api.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/teacher-workspace.spec.ts tests/e2e/parent-console.spec.ts tests/e2e/class-forum.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/adventure-island.spec.ts tests/e2e/fishing-game.spec.ts tests/e2e/gamification.spec.ts --project=desktop-chrome`
  - `node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-routing-current.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if a routed file is outside this owner's write scope and no explicit scope expansion exists.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.
  - Stop if the work would expose or edit real secrets.

## owner-package-blocker-report-a18

- Assignment ID: `owner-package-blocker-a18`
- Agent: A18
- Owner: A18 curriculum QA and content quality lead
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A18-A21-content-evidence-closure`
- Report fingerprint: `f327d2c3953f6feef9ca6cdad9908a208a6a7c0726a54a79b0e1f208c9df6537`
- Reported by: (blank)
- Reported at: (blank)
- Owner decision: (blank)
- Cleanup authorized: false
- Executable now: false
- Package blockers:
  - `wave-02-shared-contracts:wave-02-shared-contracts`: testAnalytics failed; testBackend failed; typeCheck failed; build failed
  - `wave-03-shell-dashboard-roadmap:a03-roadmap`: A03 roadmap typeCheck failed; A03 roadmap roadmapPlaywright failed
  - `wave-04-practice-lesson-content:a04-practice`: A04 practice testQuestionBank failed; A04 practice typeCheck failed; A04 practice practicePlaywright failed
  - `wave-04-practice-lesson-content:a05-lesson`: A05 lesson typeCheck failed; A05 lesson lessonPlaywright failed
- Write scope candidates:
  - none
- Coordination required:
  - `data/mainlandPepHighTopics.ts`: outside this owner's AGENTS.md write scope
  - `data/mainlandPepPrimaryTopics.ts`: outside this owner's AGENTS.md write scope
  - `data/questions.ts`: outside this owner's AGENTS.md write scope
  - `data/topics.ts`: outside this owner's AGENTS.md write scope
  - `data/usCaliforniaLessons.test.ts`: outside this owner's AGENTS.md write scope
  - `data/usCaliforniaLessons.ts`: outside this owner's AGENTS.md write scope
- Checks:
  - `npm run test:analytics`
  - `npm run test:backend`
  - `npm run type-check -- --pretty false`
  - `npm run build`
  - `npx playwright test tests/e2e/mainland-hjb-roadmaps.spec.ts tests/e2e/mainland-pep-roadmaps.spec.ts --project=desktop-chrome`
  - `npm run test:question-bank`
  - `npx playwright test tests/e2e/practice-pager.spec.ts tests/e2e/student-smoke.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/lesson-all.spec.ts tests/e2e/mainland-pep-high-lessons.spec.ts tests/e2e/california-k5-textbook-lessons.spec.ts --project=desktop-chrome`
  - `node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-routing-current.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if a routed file is outside this owner's write scope and no explicit scope expansion exists.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.
  - Stop if the work would expose or edit real secrets.

## owner-package-blocker-report-a03

- Assignment ID: `owner-package-blocker-a03`
- Agent: A03
- Owner: A03 curriculum roadmap lead
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A03-roadmap-closure`
- Report fingerprint: `06095ee2bacf07c43ffc4e7bb2ff6c7fd6573b9929b10ea2ba0134b39dbd731e`
- Reported by: (blank)
- Reported at: (blank)
- Owner decision: (blank)
- Cleanup authorized: false
- Executable now: false
- Package blockers:
  - `wave-02-shared-contracts:wave-02-shared-contracts`: testAnalytics failed; testBackend failed; typeCheck failed; build failed
  - `wave-03-shell-dashboard-roadmap:a03-roadmap`: A03 roadmap typeCheck failed; A03 roadmap roadmapPlaywright failed
  - `wave-04-practice-lesson-content:a05-lesson`: A05 lesson typeCheck failed; A05 lesson lessonPlaywright failed
- Write scope candidates:
  - `data/topics.ts`
- Coordination required:
  - `data/mainlandPepHighTopics.ts`: outside this owner's AGENTS.md write scope
  - `data/mainlandPepPrimaryTopics.ts`: outside this owner's AGENTS.md write scope
  - `data/topics.ts`: cross-owner blocker; coordinate with package owner before editing
  - `data/usCaliforniaLessons.test.ts`: outside this owner's AGENTS.md write scope
  - `data/usCaliforniaLessons.ts`: outside this owner's AGENTS.md write scope
- Checks:
  - `npm run test:analytics`
  - `npm run test:backend`
  - `npm run type-check -- --pretty false`
  - `npm run build`
  - `npx playwright test tests/e2e/mainland-hjb-roadmaps.spec.ts tests/e2e/mainland-pep-roadmaps.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/lesson-all.spec.ts tests/e2e/mainland-pep-high-lessons.spec.ts tests/e2e/california-k5-textbook-lessons.spec.ts --project=desktop-chrome`
  - `node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-routing-current.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if a routed file is outside this owner's write scope and no explicit scope expansion exists.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.
  - Stop if the work would expose or edit real secrets.

## owner-package-blocker-report-a04

- Assignment ID: `owner-package-blocker-a04`
- Agent: A04
- Owner: A04 practice lead
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A04-practice-closure`
- Report fingerprint: `f1b154ef923d6ddff87222964971520c8aa07e9a108555522e6499eae652eade`
- Reported by: (blank)
- Reported at: (blank)
- Owner decision: (blank)
- Cleanup authorized: false
- Executable now: false
- Package blockers:
  - `wave-02-shared-contracts:wave-02-shared-contracts`: testAnalytics failed; testBackend failed; typeCheck failed; build failed
  - `wave-04-practice-lesson-content:a04-practice`: A04 practice testQuestionBank failed; A04 practice typeCheck failed; A04 practice practicePlaywright failed
- Write scope candidates:
  - `data/questions.ts`
- Coordination required:
  - `data/questions.ts`: cross-owner blocker; coordinate with package owner before editing
- Checks:
  - `npm run test:analytics`
  - `npm run test:backend`
  - `npm run type-check -- --pretty false`
  - `npm run build`
  - `npm run test:question-bank`
  - `npx playwright test tests/e2e/practice-pager.spec.ts tests/e2e/student-smoke.spec.ts --project=desktop-chrome`
  - `node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-routing-current.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if a routed file is outside this owner's write scope and no explicit scope expansion exists.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.
  - Stop if the work would expose or edit real secrets.

## owner-package-blocker-report-a20

- Assignment ID: `owner-package-blocker-a20`
- Agent: A20
- Owner: A20 game design and game-based learning lead
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure`
- Report fingerprint: `6aa017f3911253b287060725ddb98b9e84c978229bb762b0b9182c958bf9b554`
- Reported by: (blank)
- Reported at: (blank)
- Owner decision: (blank)
- Cleanup authorized: false
- Executable now: false
- Package blockers:
  - `wave-01-governance-release-hygiene:wave-01-governance-release-hygiene`: 1 held package-resync row remains: wave01-resync-01-tsconfig-json; 6 owner-authorized Wave01 artifact-clean row(s) still need separate execution instruction; npm audit --audit-level=high failed or unavailable; release helper tests failed; npm run type-check failed
  - `wave-02-shared-contracts:wave-02-shared-contracts`: testAnalytics failed; testBackend failed; typeCheck failed; build failed
  - `wave-03-shell-dashboard-roadmap:a01-app-shell`: A01 app shell typeCheck failed; A01 app shell appShellPlaywright failed
  - `wave-04-practice-lesson-content:a18-a21-a23-a24-content-evidence`: A18/A21/A23/A24 content evidence has 110 dirty entries outside its pathspec union; A18/A21/A23/A24 content evidence testRag failed; A18/A21/A23/A24 content evidence testQuestionBank failed; A18/A21/A23/A24 content evidence typeCheck failed
  - `wave-05-visualization-ai-runtime:a06-visualization`: A06 visualization typeCheck failed; A06 visualization visualizationNodeTests failed; A06 visualization visualizationPlaywright failed
  - `wave-05-visualization-ai-runtime:a07-ai-tutor`: A07 AI tutor typeCheck failed; A07 AI tutor aiTutorPlaywright failed
  - `wave-05-visualization-ai-runtime:a09-copy-i18n-accessibility`: A09 copy/i18n/accessibility typeCheck failed
  - `wave-05-visualization-ai-runtime:a11-regression-evidence`: A11 regression evidence typeCheck failed; A11 regression evidence regressionPlaywright failed
- Write scope candidates:
  - `components/games/MathVirusBlasterGame.tsx`
  - `components/games/MightyTankBattleGame.tsx`
- Coordination required:
  - `components/games/MathVirusBlasterGame.tsx`: cross-owner blocker; coordinate with package owner before editing
  - `components/games/MightyTankBattleGame.tsx`: cross-owner blocker; coordinate with package owner before editing
- Checks:
  - `npm audit --audit-level=high`
  - `/usr/local/bin/node --test scripts/cleanup-generated-artifacts.test.mjs scripts/deploy-vercel-preview.test.mjs scripts/deploy-vercel-production.test.mjs scripts/release-build-gate.test.mjs scripts/release-env-guard.test.mjs`
  - `npm run type-check -- --pretty false`
  - `npm run test:analytics`
  - `npm run test:backend`
  - `npm run build`
  - `npx playwright test tests/e2e/app-shell-auth.spec.ts tests/e2e/home-functional.spec.ts --project=desktop-chrome`
  - `npm run test:rag`
  - `npm run test:question-bank`
  - `node --test components/visualizations/configuredVisualizationLabRegressions.test.ts components/visualizations/three/threeDCanvasContract.test.ts components/visualizations/visualizationDiagnostics.test.ts`
  - `npx playwright test tests/e2e/visualization-values.spec.ts tests/e2e/visualization-overlap.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/ai-tutor-deepseek.spec.ts tests/e2e/ai-tutor-live-text.spec.ts --project=desktop-chrome`
  - `npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/backend-api.spec.ts --project=desktop-chrome`
  - `node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-routing-current.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if a routed file is outside this owner's write scope and no explicit scope expansion exists.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.
  - Stop if the work would expose or edit real secrets.

## owner-package-blocker-report-a25

- Assignment ID: `owner-package-blocker-a25`
- Agent: A25
- Owner: A25 git hygiene and release intake lead
- Recommended worktree: `/Users/dongpinhu/Desktop/MAIS-MVP`
- Report fingerprint: `f27d965578d9720b8df8e56e07880d4b6581954ab3c1417f1a9c173a9847fe80`
- Reported by: (blank)
- Reported at: (blank)
- Owner decision: (blank)
- Cleanup authorized: false
- Executable now: false
- Package blockers:
  - `wave-03-shell-dashboard-roadmap:a01-app-shell`: A01 app shell typeCheck failed; A01 app shell appShellPlaywright failed
  - `wave-03-shell-dashboard-roadmap:a02-a15-dashboard-adaptive`: A02/A15 dashboard adaptive testAnalytics failed; A02/A15 dashboard adaptive typeCheck failed; A02/A15 dashboard adaptive dashboardAdaptivePlaywright failed
  - `wave-04-practice-lesson-content:a04-practice`: A04 practice testQuestionBank failed; A04 practice typeCheck failed; A04 practice practicePlaywright failed
  - `wave-04-practice-lesson-content:a18-a21-a23-a24-content-evidence`: A18/A21/A23/A24 content evidence has 110 dirty entries outside its pathspec union; A18/A21/A23/A24 content evidence testRag failed; A18/A21/A23/A24 content evidence testQuestionBank failed; A18/A21/A23/A24 content evidence typeCheck failed
- Write scope candidates:
  - none
- Coordination required:
  - `app/login/page.tsx`: outside this owner's AGENTS.md write scope
  - `lib/curriculumProfile.ts`: outside this owner's AGENTS.md write scope
  - `lib/mainlandPepHighQuestionBank.test.ts`: outside this owner's AGENTS.md write scope
  - `lib/rag/hongKongMath.ts`: outside this owner's AGENTS.md write scope
- Checks:
  - `npm run type-check -- --pretty false`
  - `npx playwright test tests/e2e/app-shell-auth.spec.ts tests/e2e/home-functional.spec.ts --project=desktop-chrome`
  - `npm run test:analytics`
  - `npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/adaptive-llm-smoke.spec.ts --project=desktop-chrome`
  - `npm run test:question-bank`
  - `npx playwright test tests/e2e/practice-pager.spec.ts tests/e2e/student-smoke.spec.ts --project=desktop-chrome`
  - `npm run test:rag`
  - `node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-routing-current.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if a routed file is outside this owner's write scope and no explicit scope expansion exists.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.
  - Stop if the work would expose or edit real secrets.

## owner-package-blocker-report-a15

- Assignment ID: `owner-package-blocker-a15`
- Agent: A15
- Owner: A15 adaptive engine lead
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A02-A15-dashboard-adaptive-closure`
- Report fingerprint: `d0a3856e693b5a2e00ba1980e4af733c61e0b27710bc9ce5c9396f23a427c135`
- Reported by: (blank)
- Reported at: (blank)
- Owner decision: (blank)
- Cleanup authorized: false
- Executable now: false
- Package blockers:
  - `wave-02-shared-contracts:wave-02-shared-contracts`: testAnalytics failed; testBackend failed; typeCheck failed; build failed
  - `wave-03-shell-dashboard-roadmap:a02-a15-dashboard-adaptive`: A02/A15 dashboard adaptive testAnalytics failed; A02/A15 dashboard adaptive typeCheck failed; A02/A15 dashboard adaptive dashboardAdaptivePlaywright failed
- Write scope candidates:
  - `lib/adaptiveLearning.ts`
- Coordination required:
  - `lib/adaptiveLearning.ts`: cross-owner blocker; coordinate with package owner before editing
- Checks:
  - `npm run test:analytics`
  - `npm run test:backend`
  - `npm run type-check -- --pretty false`
  - `npm run build`
  - `npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/adaptive-llm-smoke.spec.ts --project=desktop-chrome`
  - `node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-routing-current.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if a routed file is outside this owner's write scope and no explicit scope expansion exists.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.
  - Stop if the work would expose or edit real secrets.

## owner-package-blocker-report-a11

- Assignment ID: `owner-package-blocker-a11`
- Agent: A11
- Owner: A11 QA and release quality lead
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A11-regression-evidence-closure`
- Report fingerprint: `21bfc995234f06ba83247587f7573bf124a17f434b1c72d333328611a366210c`
- Reported by: (blank)
- Reported at: (blank)
- Owner decision: (blank)
- Cleanup authorized: false
- Executable now: false
- Package blockers:
  - `wave-05-visualization-ai-runtime:a11-regression-evidence`: A11 regression evidence typeCheck failed; A11 regression evidence regressionPlaywright failed
- Write scope candidates:
  - `lib/mvpReadiness.test.ts`
- Coordination required:
  - none
- Checks:
  - `npm run type-check -- --pretty false`
  - `npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/backend-api.spec.ts --project=desktop-chrome`
  - `node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-routing-current.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if a routed file is outside this owner's write scope and no explicit scope expansion exists.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.
  - Stop if the work would expose or edit real secrets.

## owner-package-blocker-report-a12

- Assignment ID: `owner-package-blocker-a12`
- Agent: A12
- Owner: A12 backend/API platform lead
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A08-A12-shared-contract-closure`
- Report fingerprint: `fba861b8e85373189bdc40f834869fd014da630f6acb8ccf4bc57aec13c44e5b`
- Reported by: (blank)
- Reported at: (blank)
- Owner decision: (blank)
- Cleanup authorized: false
- Executable now: false
- Package blockers:
  - `wave-01-governance-release-hygiene:wave-01-governance-release-hygiene`: 1 held package-resync row remains: wave01-resync-01-tsconfig-json; 6 owner-authorized Wave01 artifact-clean row(s) still need separate execution instruction; npm audit --audit-level=high failed or unavailable; release helper tests failed; npm run type-check failed
  - `wave-05-visualization-ai-runtime:a07-ai-tutor`: A07 AI tutor typeCheck failed; A07 AI tutor aiTutorPlaywright failed
- Write scope candidates:
  - `app/api/teacher/review-lessons/[reviewLessonId]/route.ts`
- Coordination required:
  - `app/api/ai-tutor/resolve/route.ts`: outside this owner's AGENTS.md write scope
  - `app/api/teacher/review-lessons/[reviewLessonId]/route.ts`: cross-owner blocker; coordinate with package owner before editing
- Checks:
  - `npm audit --audit-level=high`
  - `/usr/local/bin/node --test scripts/cleanup-generated-artifacts.test.mjs scripts/deploy-vercel-preview.test.mjs scripts/deploy-vercel-production.test.mjs scripts/release-build-gate.test.mjs scripts/release-env-guard.test.mjs`
  - `npm run type-check -- --pretty false`
  - `npx playwright test tests/e2e/ai-tutor-deepseek.spec.ts tests/e2e/ai-tutor-live-text.spec.ts --project=desktop-chrome`
  - `node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-routing-current.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if a routed file is outside this owner's write scope and no explicit scope expansion exists.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.
  - Stop if the work would expose or edit real secrets.

## owner-package-blocker-report-a07

- Assignment ID: `owner-package-blocker-a07`
- Agent: A07
- Owner: A07 AI tutor lead
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-closure`
- Report fingerprint: `79f57bedb86541339d75915d5db78de3960e79e3e2aa21db2650ca67f3ab54b5`
- Reported by: (blank)
- Reported at: (blank)
- Owner decision: (blank)
- Cleanup authorized: false
- Executable now: false
- Package blockers:
  - `wave-05-visualization-ai-runtime:a07-ai-tutor`: A07 AI tutor typeCheck failed; A07 AI tutor aiTutorPlaywright failed
- Write scope candidates:
  - `app/api/ai-tutor/resolve/route.ts`
- Coordination required:
  - none
- Checks:
  - `npm run type-check -- --pretty false`
  - `npx playwright test tests/e2e/ai-tutor-deepseek.spec.ts tests/e2e/ai-tutor-live-text.spec.ts --project=desktop-chrome`
  - `node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-routing-current.mjs`
  - `node coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- Stop conditions:
  - Stop if the fix requires adding/removing package dependencies without A10/A22 approval.
  - Stop if the fix requires shared type/schema changes without A08 coordination.
  - Stop if a routed file is outside this owner's write scope and no explicit scope expansion exists.
  - Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.
  - Stop if the work would expose or edit real secrets.
