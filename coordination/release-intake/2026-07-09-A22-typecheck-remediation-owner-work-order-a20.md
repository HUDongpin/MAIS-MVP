# A22 Typecheck Remediation Owner Work Order - A20

Generated: 2026-07-09T04:07:23.795Z

Owner: A20 Game design and game-based learning lead

Role: primary-remediation

Top candidate: `codex/A22-us-region-alignment` at `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`

This work order is evidence and assignment guidance only. It does not authorize staging, committing, merging, pushing, deploying, cleanup, deletion, reset, pruning, broad candidate mutation, or physical lifecycle cleanup.

## Objective

Reduce this owner's A22 top clean candidate TypeScript error rows to zero or record a concrete owner-routed blocker inside the approved owner scope.

## Scope

Allowed write scope:

- `app/games/`
- `app/student/practice/games/`
- `components/games/`
- `lib/gameBasedLearning.ts`
- `lib/gameBasedLearning.test.ts`
- `data/gameBasedLearning.ts`
- `components/gamification/FishingGame.tsx`
- `components/gamification/AdventureIslandGame.tsx`
- `components/gamification/QuadraticBonusGame.tsx`
- `app/practice/fishing-game/`
- `app/practice/quadratic-bonus/`

Forbidden actions:

- Do not stage, commit, merge, push, deploy, clean, reset, delete, or prune from this work order.
- Do not edit outside the owner allowed write scope unless a separate coordination instruction names the exact files.
- Do not use the dirty root as a production deploy source.

## Error Summary

- Primary error rows: 6
- Coordination error rows: 0
- Total routed error rows: 6
- Coordination owners: none

| File | Error rows |
| --- | ---: |
| `components/games/MathMatchQuestGame.tsx` | 6 |

| TypeScript code | Error rows |
| --- | ---: |
| `TS7006` | 5 |
| `TS2307` | 1 |

| File | Line | Column | Code | Message |
| --- | ---: | ---: | --- | --- |
| `components/games/MathMatchQuestGame.tsx` | 10 | 8 | `TS2307` | Cannot find module '@/data/gameBasedLearning' or its corresponding type declarations. |
| `components/games/MathMatchQuestGame.tsx` | 215 | 54 | `TS7006` | Parameter 'question' implicitly has an 'any' type. |
| `components/games/MathMatchQuestGame.tsx` | 371 | 38 | `TS7006` | Parameter 'level' implicitly has an 'any' type. |
| `components/games/MathMatchQuestGame.tsx` | 567 | 46 | `TS7006` | Parameter 'option' implicitly has an 'any' type. |
| `components/games/MathMatchQuestGame.tsx` | 643 | 60 | `TS7006` | Parameter 'level' implicitly has an 'any' type. |
| `components/games/MathMatchQuestGame.tsx` | 890 | 38 | `TS7006` | Parameter 'option' implicitly has an 'any' type. |

## Checks

- `npm run type-check` (A20, cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`) - Prove the owner remediation no longer contributes TypeScript errors in the A22 candidate context.
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
- The clean-source validation queue is not waiting-top-candidate-typecheck-build-remediation.

## Boundary

- Cleanup authorized: false
- Executable now: false
- Candidate mutation authorized: false
