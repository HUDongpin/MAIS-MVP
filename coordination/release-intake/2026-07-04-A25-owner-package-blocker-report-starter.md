# A25 Owner Package Blocker Report Starter

Generated: 2026-07-04T15:49:48.439Z

Dirty map signature: `0ed815279a9afc7897df7ef48f2e250da494e4a227adc0a6da14547ba9048571`

Expanded dirty entries: 4323

Source assignment packet generated: 2026-07-04T15:49:48.243Z

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
- Report fingerprint: `024b5eeb734bb50cba3fa909ef963699b164833b993ee111b62fdd9d7406e178`
- Reported by: (blank)
- Reported at: (blank)
- Owner decision: (blank)
- Cleanup authorized: false
- Executable now: false
- Package blockers:
  - `wave-01-governance-release-hygiene:wave-01-governance-release-hygiene`: 7 package-only dirty entries need owner-approved package resync authorization; npm audit --audit-level=high failed; release helper tests failed; npm run type-check failed
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
- Report fingerprint: `cd99a0f09c0e9db6fbb1141b72e0b97a230f2fdbcf8ea6551e64a65bf5635e32`
- Reported by: (blank)
- Reported at: (blank)
- Owner decision: (blank)
- Cleanup authorized: false
- Executable now: false
- Package blockers:
  - `wave-01-governance-release-hygiene:wave-01-governance-release-hygiene`: 7 package-only dirty entries need owner-approved package resync authorization; npm audit --audit-level=high failed; release helper tests failed; npm run type-check failed
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
- Report fingerprint: `696e1a067af467d5038a6d1857a64c708525209c63a2fd7bb7d4833dbc239f61`
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
- Report fingerprint: `93867058eeb4ba01fed976c8143c78495f208ae03ebd601015ca36e19a17d522`
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
- Report fingerprint: `4f062a8219b1e8122f5808bf7cca2187ee846382da3f6c10ff2f810ea36301a3`
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
- Report fingerprint: `aec9d0c5aa7645674dbc2db53d46836cda36d606922675bf7154969af35851cb`
- Reported by: (blank)
- Reported at: (blank)
- Owner decision: (blank)
- Cleanup authorized: false
- Executable now: false
- Package blockers:
  - `wave-01-governance-release-hygiene:wave-01-governance-release-hygiene`: 7 package-only dirty entries need owner-approved package resync authorization; npm audit --audit-level=high failed; release helper tests failed; npm run type-check failed
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
- Report fingerprint: `b4782dec744f85e5f3976caec648b7ab83997baab8fda55d057ee0330d7acf63`
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
- Report fingerprint: `d62f9766efafc7739407f876a9cf9f3cc470fc7a3ccd5f09a47749acaf7288da`
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
- Report fingerprint: `a83a9c7565d30e99ed3d14d76728af2c864b57d0fc0f1c7d5e81577510974f65`
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
- Report fingerprint: `9a1be9da4696353735fcf4b95a81757bbee99a9b823822ef60cfa1ec5f18c385`
- Reported by: (blank)
- Reported at: (blank)
- Owner decision: (blank)
- Cleanup authorized: false
- Executable now: false
- Package blockers:
  - `wave-01-governance-release-hygiene:wave-01-governance-release-hygiene`: 7 package-only dirty entries need owner-approved package resync authorization; npm audit --audit-level=high failed; release helper tests failed; npm run type-check failed
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
- Report fingerprint: `712561ecf78280db080691721a64b9ace4c33e2303b035e70be741d1c50d3ef8`
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
