# A22 Top Clean Candidate Type-Check

Generated: 2026-07-07T15:07:51.833Z

Dirty map signature: `84e0553381630f5c29322b7cd071032a65d4d5b479cd222bba15314f9269b4e0`

Expanded dirty entries: 5717

This evidence runs only `npm run type-check` in the top A22 clean candidate worktree. It records a pass or fail result and checks that the candidate worktree remains clean. It does not run build, select a release source, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, record execution instruction, or authorize cleanup.

## Summary

- Type-check status: failed
- Top candidate branch: `codex/A22-us-region-alignment`
- Top candidate path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`
- Command: `npm run type-check`
- Command cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`
- Exit status: 2
- TypeScript error lines: 652
- Worktree status entries before type-check: 0
- Worktree status entries after type-check: 0
- Mutation detected: no
- tsconfig.tsbuildinfo present after: no
- .next present after: yes
- Ignored entries after type-check: 2
- .next ignored after: yes
- Promotion eligible now: no
- Release source selected: no
- Cleanup-authorized rows: 0
- Executable rows: 0

## Validation Rows

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
| `candidate-package-present` | A22 production reliability and release engineering | passed | yes | Top candidate package.json exists. |
| `candidate-type-check-command-run` | A22 production reliability and release engineering | completed | yes | npm run type-check completed with exit=2. |
| `candidate-type-check-passed` | A22 production reliability and release engineering | failed | no | Candidate-specific type-check failed with 652 TypeScript error line(s). |
| `candidate-type-check-no-mutation` | A25 git hygiene and release intake | passed | yes | Candidate worktree status stayed clean before/after type-check; mutationDetected=false. |

## Top Error Files

| File | Error lines |
| --- | ---: |
| `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 206 |
| `components/teacher/TeacherPrepViews.tsx` | 36 |
| `components/teacher/TeacherOperationsView.tsx` | 32 |
| `lib/teacherReviewLesson.ts` | 30 |
| `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| `components/visualizations/three/ThreeDGraphCanvas.tsx` | 21 |
| `lib/teacherReviewLessonPptx.ts` | 19 |
| `components/visualizations/VisualizationLabPage.tsx` | 16 |
| `components/games/MathVirusBlasterGame.tsx` | 13 |
| `components/visualizations/three/manim/MathSceneRuntime.tsx` | 12 |
| `components/games/MightyTankBattleGame.tsx` | 10 |
| `components/visualizations/three/ThreeDLabCanvas.tsx` | 10 |
| `app/api/teacher/review-lessons/[reviewLessonId]/route.ts` | 9 |
| `components/visualizations/three/threeDSceneMath.catalog.test.ts` | 9 |
| `lib/server/teacherReviewLessonLLM.ts` | 9 |
| `lib/teacherAssessmentAnalysis.ts` | 9 |
| `app/api/assignments/[assignmentId]/corrections/route.ts` | 8 |
| `app/api/assignments/[assignmentId]/submissions/route.ts` | 8 |
| `app/api/classroom/live/[sessionId]/work-samples/route.ts` | 8 |
| `app/api/me/learner-profile/route.ts` | 7 |

## Top Error Codes

| Code | Error lines |
| --- | ---: |
| `TS2339` | 272 |
| `TS7006` | 158 |
| `TS2305` | 122 |
| `TS2307` | 32 |
| `TS2724` | 32 |
| `TS2322` | 17 |
| `TS2367` | 4 |
| `TS7031` | 4 |
| `TS2769` | 3 |
| `TS7053` | 3 |
| `TS2345` | 2 |
| `TS2353` | 2 |
| `TS2459` | 1 |

## First Error Lines

- `app/api/admin/ai-governance/summary/route.ts(3,43): error TS2307: Cannot find module '@/lib/server/aiGovernance' or its corresponding type declarations.`
- `app/api/admin/ai-governance/summary/route.ts(4,10): error TS2305: Module '"@/lib/server/userStore"' has no exported member 'getAiGovernanceSummaryForAdmin'.`
- `app/api/admin/nova-lens/policy/route.ts(3,10): error TS2305: Module '"@/lib/server/userStore"' has no exported member 'getNovaLensPolicy'.`
- `app/api/admin/nova-lens/policy/route.ts(3,29): error TS2305: Module '"@/lib/server/userStore"' has no exported member 'listNovaLensPolicyEventsForAdmin'.`
- `app/api/admin/nova-lens/policy/route.ts(3,63): error TS2305: Module '"@/lib/server/userStore"' has no exported member 'updateNovaLensPolicy'.`
- `app/api/admin/nova-lens/policy/route.ts(4,15): error TS2305: Module '"@/types"' has no exported member 'NovaLensPolicy'.`
- `app/api/admin/storage/hot-auth/backfill/route.ts(3,10): error TS2305: Module '"@/lib/server/userStore"' has no exported member 'backfillPostgresHotAuthTablesForAdmin'.`
- `app/api/admin/storage/temporary-bootstrap-admins/route.ts(3,10): error TS2305: Module '"@/lib/server/userStore"' has no exported member 'cleanupTemporaryBootstrapAdminsForAdmin'.`
- `app/api/assignments/[assignmentId]/corrections/route.ts(3,10): error TS2305: Module '"@/lib/server/userStore"' has no exported member 'recordAiGovernanceEvent'.`
- `app/api/assignments/[assignmentId]/corrections/route.ts(3,35): error TS2305: Module '"@/lib/server/userStore"' has no exported member 'submitAssignmentWork'.`
- `app/api/assignments/[assignmentId]/corrections/route.ts(4,100): error TS2307: Cannot find module '@/lib/server/aiGovernance' or its corresponding type declarations.`
- `app/api/assignments/[assignmentId]/corrections/route.ts(10,15): error TS2305: Module '"@/types"' has no exported member 'AssignmentSubmissionInputType'.`
- `app/api/assignments/[assignmentId]/corrections/route.ts(10,46): error TS2305: Module '"@/types"' has no exported member 'AssignmentSubmissionOcrResult'.`
- `app/api/assignments/[assignmentId]/corrections/route.ts(34,13): error TS7006: Parameter 'error' implicitly has an 'any' type.`
- `app/api/assignments/[assignmentId]/corrections/route.ts(72,15): error TS7006: Parameter 'error' implicitly has an 'any' type.`
- `app/api/assignments/[assignmentId]/corrections/route.ts(94,15): error TS7006: Parameter 'error' implicitly has an 'any' type.`
- `app/api/assignments/[assignmentId]/submissions/route.ts(3,10): error TS2305: Module '"@/lib/server/userStore"' has no exported member 'recordAiGovernanceEvent'.`
- `app/api/assignments/[assignmentId]/submissions/route.ts(3,35): error TS2305: Module '"@/lib/server/userStore"' has no exported member 'submitAssignmentWork'.`
- `app/api/assignments/[assignmentId]/submissions/route.ts(4,100): error TS2307: Cannot find module '@/lib/server/aiGovernance' or its corresponding type declarations.`
- `app/api/assignments/[assignmentId]/submissions/route.ts(10,15): error TS2305: Module '"@/types"' has no exported member 'AssignmentSubmissionInputType'.`

## Boundary

This type-check evidence makes the candidate validation state more concrete. A failed type-check remains a promotion blocker and does not make the candidate mergeable or deployable.
