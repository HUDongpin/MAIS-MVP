# A22 Typecheck Remediation Owner Work Order - A10

Generated: 2026-07-10T15:31:24.235Z

Owner: A10 Tooling, docs, report lead

Role: primary-remediation

Top candidate: `codex/A22-us-region-alignment` at `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`

This work order is evidence and assignment guidance only. It does not authorize staging, committing, merging, pushing, deploying, cleanup, deletion, reset, pruning, broad candidate mutation, or physical lifecycle cleanup.

## Objective

Reduce this owner's A22 top clean candidate TypeScript error rows to zero or record a concrete owner-routed blocker inside the approved owner scope.

## Scope

Allowed write scope:

- `README.md`
- `AGENTS.md`
- `.gitignore`
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `app/globals.css`
- `coordination/`

Forbidden actions:

- Do not stage, commit, merge, push, deploy, clean, reset, delete, or prune from this work order.
- Do not edit outside the owner allowed write scope unless a separate coordination instruction names the exact files.
- Do not use the dirty root as a production deploy source.

## Error Summary

- Primary error rows: 36
- Coordination error rows: 0
- Total routed error rows: 36
- Coordination owners: A08, A12, A13

| File | Error rows |
| --- | ---: |
| `lib/server/teacherReviewLessonLLM.ts` | 9 |
| `lib/server/teacherAssignmentGeneration.ts` | 5 |
| `lib/server/userStoreAdminExport.test.ts` | 3 |
| `lib/server/userStoreAuth.test.ts` | 3 |
| `components/practice/PracticeMissionSetupControls.tsx` | 2 |
| `lib/server/wecomNotifications.ts` | 2 |
| `app/lesson/page.tsx` | 1 |
| `components/learning/StudentRoadmapPage.tsx` | 1 |
| `components/lesson/CaliforniaMiddleSchoolReplacementTextbookPage.tsx` | 1 |
| `components/lesson/CaliforniaMiddleSchoolTextbookPage.tsx` | 1 |
| `components/lesson/LessonEntryClient.tsx` | 1 |
| `components/lesson/StudentLessonEntryPage.tsx` | 1 |

| TypeScript code | Error rows |
| --- | ---: |
| `TS2305` | 13 |
| `TS7006` | 9 |
| `TS2307` | 6 |
| `TS2322` | 3 |
| `TS2339` | 2 |
| `TS2459` | 1 |
| `TS2724` | 1 |
| `TS2769` | 1 |

| File | Line | Column | Code | Message |
| --- | ---: | ---: | --- | --- |
| `app/lesson/page.tsx` | 3 | 35 | `TS2307` | Cannot find module '@/app/lesson/LessonEntryClient' or its corresponding type declarations. |
| `components/learning/StudentRoadmapPage.tsx` | 87 | 24 | `TS2322` | Type '{ mode: string; }' is not assignable to type 'IntrinsicAttributes & LearningRoadmapProps'. |
| `components/lesson/CaliforniaMiddleSchoolReplacementTextbookPage.tsx` | 3 | 26 | `TS2307` | Cannot find module '@/data/generated-content/us-ca-math-middle-school-textbooks-v2/live-lessons.json' or its corresponding type declarations. |
| `components/lesson/CaliforniaMiddleSchoolTextbookPage.tsx` | 3 | 30 | `TS2307` | Cannot find module '@/data/generated-content/us-ca-math-textbooks-v1/textbook-pack.json' or its corresponding type declarations. |
| `components/lesson/LessonEntryClient.tsx` | 9 | 10 | `TS2305` | Module '"@/lib/lessonLinks"' has no exported member 'studentLessonsPath'. |
| `components/lesson/StudentLessonEntryPage.tsx` | 4 | 10 | `TS2305` | Module '"@/lib/lessonLinks"' has no exported member 'studentLessonsPath'. |
| `components/lesson/StudentLessonPage.tsx` | 82 | 71 | `TS2322` | Type '{ slug: string; initialLesson: LessonDetail \| null; gradeLessons: LessonSummary[]; }' is not assignable to type 'IntrinsicAttributes & LessonViewProps'. |
| `components/practice/PracticeMissionSetupControls.tsx` | 6 | 49 | `TS2307` | Cannot find module '@/lib/difficulty' or its corresponding type declarations. |
| `components/practice/PracticeMissionSetupControls.tsx` | 108 | 53 | `TS7006` | Parameter 'difficulty' implicitly has an 'any' type. |
| `lib/server/internalCaliforniaFastLogin.ts` | 51 | 25 | `TS2769` | No overload matches this call. |
| `lib/server/mediaObjectStore.ts` | 9 | 8 | `TS2307` | Cannot find module './aiGovernance' or its corresponding type declarations. |
| `lib/server/teacherAssignmentGeneration.ts` | 8 | 3 | `TS2724` | '"@/lib/server/llmProvider"' has no exported member named 'readQwenImageProviderConfig'. Did you mean 'readLLMProviderConfig'? |

## Checks

- `npm run type-check` (A10, cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`) - Prove the owner remediation no longer contributes TypeScript errors in the A22 candidate context.
- `node coordination/release-intake/generate-a22-top-clean-candidate-typecheck.mjs` (A22, cwd: `/Users/dongpinhu/Desktop/MAIS-MVP`) - Refresh structured A22 top-candidate type-check evidence after owner remediation.
- `node coordination/release-intake/assert-a22-top-clean-candidate-typecheck-current.mjs` (A22, cwd: `/Users/dongpinhu/Desktop/MAIS-MVP`) - Confirm refreshed type-check evidence is current.
- `node coordination/release-intake/generate-a22-top-clean-candidate-typecheck-remediation-routing.mjs` (A25, cwd: `/Users/dongpinhu/Desktop/MAIS-MVP`) - Refresh owner routing after remediation.
- `node coordination/release-intake/assert-a22-top-clean-candidate-typecheck-remediation-routing-current.mjs` (A25, cwd: `/Users/dongpinhu/Desktop/MAIS-MVP`) - Confirm routing is current after remediation.
- `node coordination/release-intake/generate-a22-typecheck-remediation-owner-work-orders.mjs` (A25, cwd: `/Users/dongpinhu/Desktop/MAIS-MVP`) - Refresh this owner work-order bundle.
- `node coordination/release-intake/assert-a22-typecheck-remediation-owner-work-orders-current.mjs` (A25, cwd: `/Users/dongpinhu/Desktop/MAIS-MVP`) - Confirm this owner work-order bundle is current.
- `node coordination/release-intake/generate-a22-top-clean-candidate-build-snapshot.mjs` (A22, cwd: `/Users/dongpinhu/Desktop/MAIS-MVP`) - Refresh A22 build evidence after type-check remediation.

## Acceptance Criteria

- Owner-owned TypeScript error rows are remediated in an isolated owner worktree or explicitly approved compose worktree.
- Any shared type/API dependency is coordinated with the listed coordination owners before changing shared contracts.
- Fresh A22 type-check evidence is green, or this work order records a precise owner-routed blocker with files and error codes.
- A22 build evidence is refreshed only after type-check remediation evidence is current.

## Stop Conditions

- The fix requires editing outside this owner's allowed write scope.
- The fix requires package upgrades, secret/env changes, deploy, merge, cleanup, reset, or destructive Git.
- The A22 candidate path is missing or no longer matches the routing packet.
- The clean-source validation queue is not fallback-candidate-green-await-clean-source-selection-review.

## Boundary

- Cleanup authorized: false
- Executable now: false
- Candidate mutation authorized: false
