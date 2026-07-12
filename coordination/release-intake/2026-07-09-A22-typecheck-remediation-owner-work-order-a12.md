# A22 Typecheck Remediation Owner Work Order - A12

Generated: 2026-07-09T13:47:28.722Z

Owner: A12 Backend/API platform lead

Role: primary-remediation

Top candidate: `codex/A22-us-region-alignment` at `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`

This work order is evidence and assignment guidance only. It does not authorize staging, committing, merging, pushing, deploying, cleanup, deletion, reset, pruning, broad candidate mutation, or physical lifecycle cleanup.

## Objective

Reduce this owner's A22 top clean candidate TypeScript error rows to zero or record a concrete owner-routed blocker inside the approved owner scope.

## Scope

Allowed write scope:

- `app/api/`
- `lib/server/auth.ts`
- `lib/server/sessionCookie.ts`
- `lib/server/userStore.ts`
- `lib/server/userStore/`

Forbidden actions:

- Do not stage, commit, merge, push, deploy, clean, reset, delete, or prune from this work order.
- Do not edit outside the owner allowed write scope unless a separate coordination instruction names the exact files.
- Do not use the dirty root as a production deploy source.

## Error Summary

- Primary error rows: 105
- Coordination error rows: 16
- Total routed error rows: 121
- Coordination owners: A08, A13

| File | Error rows |
| --- | ---: |
| `app/api/teacher/review-lessons/[reviewLessonId]/route.ts` | 9 |
| `app/api/assignments/[assignmentId]/corrections/route.ts` | 8 |
| `app/api/assignments/[assignmentId]/submissions/route.ts` | 8 |
| `app/api/classroom/live/[sessionId]/work-samples/route.ts` | 8 |
| `app/api/me/learner-profile/route.ts` | 7 |
| `app/api/classroom/live/actions/route.ts` | 6 |
| `app/api/teacher/lesson-kits/[kitId]/route.ts` | 5 |
| `app/api/admin/nova-lens/policy/route.ts` | 4 |
| `app/api/media-objects/route.ts` | 4 |
| `app/api/teacher/classes/[classId]/collaborators/route.ts` | 3 |
| `app/api/teacher/lesson-kits/route.ts` | 3 |
| `app/api/teacher/notices/route.ts` | 3 |

| TypeScript code | Error rows |
| --- | ---: |
| `TS2305` | 72 |
| `TS2724` | 26 |
| `TS7006` | 13 |
| `TS2307` | 7 |
| `TS2339` | 2 |
| `TS2459` | 1 |

| File | Line | Column | Code | Message |
| --- | ---: | ---: | --- | --- |
| `app/api/admin/ai-governance/summary/route.ts` | 3 | 43 | `TS2307` | Cannot find module '@/lib/server/aiGovernance' or its corresponding type declarations. |
| `app/api/admin/ai-governance/summary/route.ts` | 4 | 10 | `TS2305` | Module '"@/lib/server/userStore"' has no exported member 'getAiGovernanceSummaryForAdmin'. |
| `app/api/admin/nova-lens/policy/route.ts` | 3 | 10 | `TS2305` | Module '"@/lib/server/userStore"' has no exported member 'getNovaLensPolicy'. |
| `app/api/admin/nova-lens/policy/route.ts` | 3 | 29 | `TS2305` | Module '"@/lib/server/userStore"' has no exported member 'listNovaLensPolicyEventsForAdmin'. |
| `app/api/admin/nova-lens/policy/route.ts` | 3 | 63 | `TS2305` | Module '"@/lib/server/userStore"' has no exported member 'updateNovaLensPolicy'. |
| `app/api/admin/nova-lens/policy/route.ts` | 4 | 15 | `TS2305` | Module '"@/types"' has no exported member 'NovaLensPolicy'. |
| `app/api/admin/storage/hot-auth/backfill/route.ts` | 3 | 10 | `TS2305` | Module '"@/lib/server/userStore"' has no exported member 'backfillPostgresHotAuthTablesForAdmin'. |
| `app/api/admin/storage/temporary-bootstrap-admins/route.ts` | 3 | 10 | `TS2305` | Module '"@/lib/server/userStore"' has no exported member 'cleanupTemporaryBootstrapAdminsForAdmin'. |
| `app/api/assignments/[assignmentId]/corrections/route.ts` | 3 | 10 | `TS2305` | Module '"@/lib/server/userStore"' has no exported member 'recordAiGovernanceEvent'. |
| `app/api/assignments/[assignmentId]/corrections/route.ts` | 3 | 35 | `TS2305` | Module '"@/lib/server/userStore"' has no exported member 'submitAssignmentWork'. |
| `app/api/assignments/[assignmentId]/corrections/route.ts` | 4 | 100 | `TS2307` | Cannot find module '@/lib/server/aiGovernance' or its corresponding type declarations. |
| `app/api/assignments/[assignmentId]/corrections/route.ts` | 10 | 15 | `TS2305` | Module '"@/types"' has no exported member 'AssignmentSubmissionInputType'. |

## Checks

- `npm run type-check` (A12, cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`) - Prove the owner remediation no longer contributes TypeScript errors in the A22 candidate context.
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
