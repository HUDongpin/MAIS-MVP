# A22 Typecheck Remediation Owner Work Order - A13

Generated: 2026-07-10T15:31:24.235Z

Owner: A13 Teacher console lead

Role: primary-remediation

Top candidate: `codex/A22-us-region-alignment` at `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`

This work order is evidence and assignment guidance only. It does not authorize staging, committing, merging, pushing, deploying, cleanup, deletion, reset, pruning, broad candidate mutation, or physical lifecycle cleanup.

## Objective

Reduce this owner's A22 top clean candidate TypeScript error rows to zero or record a concrete owner-routed blocker inside the approved owner scope.

## Scope

Allowed write scope:

- `app/teacher/`
- `components/teacher/`
- `lib/teacher`

Forbidden actions:

- Do not stage, commit, merge, push, deploy, clean, reset, delete, or prune from this work order.
- Do not edit outside the owner allowed write scope unless a separate coordination instruction names the exact files.
- Do not use the dirty root as a production deploy source.

## Error Summary

- Primary error rows: 178
- Coordination error rows: 50
- Total routed error rows: 228
- Coordination owners: A08, A12

| File | Error rows |
| --- | ---: |
| `components/teacher/TeacherPrepViews.tsx` | 36 |
| `components/teacher/TeacherOperationsView.tsx` | 32 |
| `lib/teacherReviewLesson.ts` | 30 |
| `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| `lib/teacherReviewLessonPptx.ts` | 18 |
| `lib/teacherAssessmentAnalysis.ts` | 9 |
| `lib/teacherAssessmentAnalysis.test.ts` | 6 |
| `lib/teacherLessonKitGenerator.ts` | 5 |
| `lib/teacherLessonKitGenerator.test.ts` | 3 |
| `lib/teacherReviewLesson.test.ts` | 2 |
| `app/teacher/assessments/[assessmentId]/edit/page.tsx` | 1 |
| `app/teacher/assessments/[assessmentId]/review-lessons/[reviewLessonId]/page.tsx` | 1 |

| TypeScript code | Error rows |
| --- | ---: |
| `TS7006` | 95 |
| `TS2305` | 77 |
| `TS2724` | 27 |
| `TS2339` | 18 |
| `TS2322` | 7 |
| `TS2353` | 2 |
| `TS7053` | 2 |

| File | Line | Column | Code | Message |
| --- | ---: | ---: | --- | --- |
| `app/teacher/assessments/[assessmentId]/edit/page.tsx` | 18 | 73 | `TS2322` | Type 'TeacherAssessmentCreateData \| { classes: TeacherClass[]; resources: never[]; topicOptions: never[]; questionBank: never[]; }' is not assignable to type 'TeacherAssessmentCreateData'. |
| `app/teacher/assessments/[assessmentId]/review-lessons/[reviewLessonId]/page.tsx` | 3 | 10 | `TS2724` | '"@/lib/server/userStore"' has no exported member named 'getTeacherReviewLessonDetailData'. Did you mean 'getTeacherClassDetailData'? |
| `app/teacher/assignments/[assignmentId]/submissions/[submissionId]/page.tsx` | 19 | 55 | `TS2322` | Type '{ detail: TeacherAssignmentDetailData; initialSubmissionId: string; }' is not assignable to type 'IntrinsicAttributes & { detail: TeacherAssignmentDetailData; }'. |
| `app/teacher/classes/[classId]/students/[studentId]/page.tsx` | 15 | 55 | `TS2322` | Type '{ profile: TeacherStudentProfileData; backHref: string; activeClassId: string; }' is not assignable to type 'IntrinsicAttributes & { profile: TeacherStudentProfileData; }'. |
| `app/teacher/classroom-sessions/[sessionId]/controller/page.tsx` | 3 | 10 | `TS2724` | '"@/lib/server/userStore"' has no exported member named 'getTeacherLiveSessionById'. Did you mean 'endTeacherLiveSession'? |
| `app/teacher/classroom-sessions/[sessionId]/presenter/page.tsx` | 3 | 10 | `TS2724` | '"@/lib/server/userStore"' has no exported member named 'getTeacherLiveSessionById'. Did you mean 'endTeacherLiveSession'? |
| `app/teacher/classroom-sessions/page.tsx` | 15 | 39 | `TS2322` | Type '{ live: TeacherLiveData; initialClassId: string; }' is not assignable to type 'IntrinsicAttributes & { live: TeacherLiveData; }'. |
| `app/teacher/lesson-kits/[kitId]/page.tsx` | 3 | 10 | `TS2724` | '"@/lib/server/userStore"' has no exported member named 'getTeacherLessonKitDetailData'. Did you mean 'getTeacherClassDetailData'? |
| `app/teacher/lesson-kits/new/page.tsx` | 3 | 10 | `TS2724` | '"@/lib/server/userStore"' has no exported member named 'getTeacherLessonKitCreateData'. Did you mean 'getTeacherAssessmentCreateData'? |
| `app/teacher/lesson-kits/page.tsx` | 3 | 10 | `TS2724` | '"@/lib/server/userStore"' has no exported member named 'getTeacherLessonKitListData'. Did you mean 'getTeacherAssessmentListData'? |
| `app/teacher/operations/renderOperationsPage.tsx` | 3 | 10 | `TS2724` | '"@/lib/server/userStore"' has no exported member named 'getTeacherOperationsData'. Did you mean 'getTeacherFoundationData'? |
| `app/teacher/review-lessons/[reviewLessonId]/page.tsx` | 2 | 10 | `TS2724` | '"@/lib/server/userStore"' has no exported member named 'getTeacherReviewLessonDetailData'. Did you mean 'getTeacherClassDetailData'? |

## Checks

- `npm run type-check` (A13, cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`) - Prove the owner remediation no longer contributes TypeScript errors in the A22 candidate context.
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
