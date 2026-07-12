# A22 Top Clean Candidate Type-Check

Generated: 2026-07-10T15:58:47.418Z

Dirty map signature: `37c9d353a7710b8e92d3d766006b7230936ca194044a47770a99ab12d7c6cef1`

Expanded dirty entries: 7221

This evidence runs only `npm run type-check` in the top A22 clean candidate worktree. It records a pass or fail result and checks that the candidate worktree remains clean. It does not run build, select a release source, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, record execution instruction, or authorize cleanup.

## Summary

- Type-check status: failed
- Top candidate branch: `codex/A22-us-region-alignment`
- Top candidate path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`
- Command: `npm run type-check`
- Command cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`
- Exit status: 2
- TypeScript error lines: 360
- Worktree status entries before type-check: 7
- Worktree status entries after type-check: 7
- Bounded dirty accepted: yes
- Worktree status allowed before type-check: yes
- Worktree status allowed after type-check: yes
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
| `candidate-type-check-passed` | A22 production reliability and release engineering | failed | no | Candidate-specific type-check failed with 360 TypeScript error line(s). |
| `candidate-type-check-no-mutation` | A25 git hygiene and release intake | passed | yes | Candidate worktree status stayed within allowed bounds before/after type-check; mutationDetected=false. |

## Top Error Files

| File | Error lines |
| --- | ---: |
| `components/teacher/TeacherPrepViews.tsx` | 36 |
| `components/teacher/TeacherOperationsView.tsx` | 32 |
| `lib/teacherReviewLesson.ts` | 30 |
| `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| `lib/teacherReviewLessonPptx.ts` | 18 |
| `components/visualizations/VisualizationLabPage.tsx` | 16 |
| `app/api/teacher/review-lessons/[reviewLessonId]/route.ts` | 9 |
| `components/visualizations/three/threeDSceneMath.catalog.test.ts` | 9 |
| `lib/server/teacherReviewLessonLLM.ts` | 9 |
| `lib/teacherAssessmentAnalysis.ts` | 9 |
| `app/api/assignments/[assignmentId]/corrections/route.ts` | 8 |
| `app/api/assignments/[assignmentId]/submissions/route.ts` | 8 |
| `app/api/classroom/live/[sessionId]/work-samples/route.ts` | 8 |
| `app/api/me/learner-profile/route.ts` | 7 |
| `app/api/classroom/live/actions/route.ts` | 6 |
| `lib/teacherAssessmentAnalysis.test.ts` | 6 |
| `app/api/teacher/lesson-kits/[kitId]/route.ts` | 5 |
| `components/visualizations/visualizationDiagnostics.test.ts` | 5 |
| `components/visualizations/visualizationDiagnostics.ts` | 5 |
| `lib/server/teacherAssignmentGeneration.ts` | 5 |

## Top Error Codes

| Code | Error lines |
| --- | ---: |
| `TS2305` | 122 |
| `TS7006` | 118 |
| `TS2339` | 43 |
| `TS2724` | 32 |
| `TS2322` | 17 |
| `TS2307` | 13 |
| `TS2367` | 4 |
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
