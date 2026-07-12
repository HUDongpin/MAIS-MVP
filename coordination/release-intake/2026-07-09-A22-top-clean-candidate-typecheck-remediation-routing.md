# A22 Top Clean Candidate Type-Check Remediation Routing

Generated: 2026-07-09T13:47:20.563Z

Dirty map signature: `b3d232fd2b9ef81d4efc95903d2e3b316db664d6e9ec6ab366181395b3966be7`

Expanded dirty entries: 6604

This packet routes the current A22 top-candidate `npm run type-check` errors to owning sessions before clean-source selection. It does not edit the candidate, copy root files, stage, commit, merge, deploy, clean, delete, reset, prune, record owner approval, or authorize physical lifecycle cleanup.

## Summary

- Remediation status: owner-routed-cross-owner-remediation-required
- Top candidate branch: `codex/A22-us-region-alignment`
- Top candidate path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`
- Clean-source queue status: fallback-candidate-green-await-clean-source-selection-review
- Type-check status: failed
- TypeScript error lines: 360
- Structured error rows: 360
- Owner routes: 5
- Primary owners: A06, A10, A12, A13
- Coordination owners: A08, A12, A13
- Direct A22 candidate mutation permitted: no
- Candidate mutation rows: 0
- Cleanup-authorized rows: 0
- Executable rows: 0

## Owner Routes

| Owner | Label | Primary error rows | Coordination error rows | Coordination owners | Remediation kinds |
| --- | --- | ---: | ---: | --- | --- |
| `A13` | Teacher console lead | 178 | 50 | A08, A12 | missing-shared-contract-or-module-parity:104; strict-typing-cleanup:95; object-contract-drift:18; assignment-type-drift:7; targeted-owner-code-remediation:4 |
| `A12` | Backend/API platform lead | 105 | 16 | A08, A13 | missing-shared-contract-or-module-parity:105; strict-typing-cleanup:13; object-contract-drift:2; targeted-owner-code-remediation:1 |
| `A08` | State and analytics / shared types lead | 0 | 97 | none | missing-shared-contract-or-module-parity:97 |
| `A06` | Visualization lead | 41 | 0 | none | object-contract-drift:23; targeted-owner-code-remediation:9; assignment-type-drift:7; missing-shared-contract-or-module-parity:1; strict-typing-cleanup:1 |
| `A10` | Tooling, docs, report lead | 36 | 0 | A08, A12, A13 | missing-shared-contract-or-module-parity:20; strict-typing-cleanup:9; assignment-type-drift:3; object-contract-drift:2; targeted-owner-code-remediation:2 |

## Top Routed Files

| File | Error rows | Primary owners |
| --- | ---: | --- |
| `components/teacher/TeacherPrepViews.tsx` | 36 | A13 |
| `components/teacher/TeacherOperationsView.tsx` | 32 | A13 |
| `lib/teacherReviewLesson.ts` | 30 | A13 |
| `components/teacher/TeacherReviewLessonView.tsx` | 25 | A13 |
| `lib/teacherReviewLessonPptx.ts` | 18 | A13 |
| `components/visualizations/VisualizationLabPage.tsx` | 16 | A06 |
| `app/api/teacher/review-lessons/[reviewLessonId]/route.ts` | 9 | A12 |
| `components/visualizations/three/threeDSceneMath.catalog.test.ts` | 9 | A06 |
| `lib/server/teacherReviewLessonLLM.ts` | 9 | A10 |
| `lib/teacherAssessmentAnalysis.ts` | 9 | A13 |
| `app/api/assignments/[assignmentId]/corrections/route.ts` | 8 | A12 |
| `app/api/assignments/[assignmentId]/submissions/route.ts` | 8 | A12 |
| `app/api/classroom/live/[sessionId]/work-samples/route.ts` | 8 | A12 |
| `app/api/me/learner-profile/route.ts` | 7 | A12 |
| `app/api/classroom/live/actions/route.ts` | 6 | A12 |
| `lib/teacherAssessmentAnalysis.test.ts` | 6 | A13 |
| `app/api/teacher/lesson-kits/[kitId]/route.ts` | 5 | A12 |
| `components/visualizations/visualizationDiagnostics.test.ts` | 5 | A06 |
| `components/visualizations/visualizationDiagnostics.ts` | 5 | A06 |
| `lib/server/teacherAssignmentGeneration.ts` | 5 | A10 |
| `lib/teacherLessonKitGenerator.ts` | 5 | A13 |
| `app/api/admin/nova-lens/policy/route.ts` | 4 | A12 |
| `app/api/media-objects/route.ts` | 4 | A12 |
| `app/api/teacher/classes/[classId]/collaborators/route.ts` | 3 | A12 |
| `app/api/teacher/lesson-kits/route.ts` | 3 | A12 |
| `app/api/teacher/notices/route.ts` | 3 | A12 |
| `lib/server/userStoreAdminExport.test.ts` | 3 | A10 |
| `lib/server/userStoreAuth.test.ts` | 3 | A10 |
| `lib/teacherLessonKitGenerator.test.ts` | 3 | A13 |
| `app/api/admin/ai-governance/summary/route.ts` | 2 | A12 |

## Validation Rows

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
| `typecheck-error-rows-structured` | A22 production reliability and release engineering | passed | yes | structured=360; errorLineCount=360 |
| `clean-source-queue-is-typecheck-build-remediation` | A22 production reliability and release engineering | passed | yes | queueStatus=fallback-candidate-green-await-clean-source-selection-review |
| `owner-routes-present` | A25 git hygiene and release intake | passed | yes | ownerRoutes=5; routedErrorRows=360 |
| `a22-direct-feature-mutation-blocked` | A22 production reliability and release engineering | passed | yes | Routing packet records owner work orders only; A22 does not mutate cross-owner feature/API/type files. |
| `merge-deploy-cleanup-still-blocked` | A25 git hygiene and release intake | passed | yes | cleanupAuthorizedRows=0; executableRows=0; releaseSourceSelected=false. |

## Boundary

This is routing evidence only. A22 remains blocked from clean-source promotion until the owner-routed type-check remediation is completed and fresh A22 type-check/build evidence is green or explicitly accepted by the release gate.
