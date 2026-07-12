# A22 Typecheck Remediation Owner Work Order - A08

Generated: 2026-07-10T17:10:16.894Z

Owner: A08 State and analytics / shared types lead

Role: coordination-support

Top candidate: `codex/A22-us-region-alignment` at `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`

This work order is evidence and assignment guidance only. It does not authorize staging, committing, merging, pushing, deploying, cleanup, deletion, reset, pruning, broad candidate mutation, or physical lifecycle cleanup.

## Objective

Coordinate shared contract/type remediation needed by the A22 top clean candidate; do not edit non-owned feature surfaces without owner coordination.

## Scope

Allowed write scope:

- `components/providers/AppProviders.tsx`
- `lib/learningAnalytics.ts`
- `lib/learningAnalytics.test.ts`
- `lib/utils.ts`
- `types/index.ts`
- `lib/difficulty.ts`
- `lib/difficulty.test.ts`

Forbidden actions:

- Do not stage, commit, merge, push, deploy, clean, reset, delete, or prune from this work order.
- Do not edit outside the owner allowed write scope unless a separate coordination instruction names the exact files.
- Do not use the dirty root as a production deploy source.

## Error Summary

- Primary error rows: 0
- Coordination error rows: 97
- Total routed error rows: 97
- Coordination owners: none

| File | Error rows |
| --- | ---: |
| none | 0 |

| TypeScript code | Error rows |
| --- | ---: |
| `TS2305` | 80 |
| `TS2724` | 14 |
| `TS2307` | 3 |

| File | Line | Column | Code | Message |
| --- | ---: | ---: | --- | --- |
| none | n/a | n/a | n/a | none |

## Checks

- `npm run type-check` (A08, cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`) - Prove the owner remediation no longer contributes TypeScript errors in the A22 candidate context.
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
