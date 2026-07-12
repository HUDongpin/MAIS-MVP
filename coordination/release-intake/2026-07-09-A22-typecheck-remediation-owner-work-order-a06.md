# A22 Typecheck Remediation Owner Work Order - A06

Generated: 2026-07-09T13:47:28.722Z

Owner: A06 Visualization lead

Role: primary-remediation

Top candidate: `codex/A22-us-region-alignment` at `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`

This work order is evidence and assignment guidance only. It does not authorize staging, committing, merging, pushing, deploying, cleanup, deletion, reset, pruning, broad candidate mutation, or physical lifecycle cleanup.

## Objective

Reduce this owner's A22 top clean candidate TypeScript error rows to zero or record a concrete owner-routed blocker inside the approved owner scope.

## Scope

Allowed write scope:

- `app/visualization-lab/`
- `app/student/tools/visualizations/`
- `components/visualizations/`
- `data/visualizationLabs.ts`
- `lib/math.ts`

Forbidden actions:

- Do not stage, commit, merge, push, deploy, clean, reset, delete, or prune from this work order.
- Do not edit outside the owner allowed write scope unless a separate coordination instruction names the exact files.
- Do not use the dirty root as a production deploy source.

## Error Summary

- Primary error rows: 41
- Coordination error rows: 0
- Total routed error rows: 41
- Coordination owners: none

| File | Error rows |
| --- | ---: |
| `components/visualizations/VisualizationLabPage.tsx` | 16 |
| `components/visualizations/three/threeDSceneMath.catalog.test.ts` | 9 |
| `components/visualizations/visualizationDiagnostics.test.ts` | 5 |
| `components/visualizations/visualizationDiagnostics.ts` | 5 |
| `app/student/tools/visualizations/[labId]/page.tsx` | 1 |
| `components/visualizations/three/manim/MathFormulaOverlay.tsx` | 1 |
| `components/visualizations/three/manim/mathObjectTransform.ts` | 1 |
| `components/visualizations/three/ThreeDGraphCanvas.tsx` | 1 |
| `components/visualizations/three/ThreeDLabCanvas.tsx` | 1 |
| `components/visualizations/visualizationDiagnostics.premiumSmoke.test.ts` | 1 |

| TypeScript code | Error rows |
| --- | ---: |
| `TS2339` | 23 |
| `TS2322` | 7 |
| `TS2367` | 4 |
| `TS2345` | 2 |
| `TS2769` | 2 |
| `TS2724` | 1 |
| `TS7006` | 1 |
| `TS7053` | 1 |

| File | Line | Column | Code | Message |
| --- | ---: | ---: | --- | --- |
| `app/student/tools/visualizations/[labId]/page.tsx` | 32 | 13 | `TS2339` | Property 'threeD' does not exist on type 'FeaturedLabDefinition'. |
| `components/visualizations/three/manim/MathFormulaOverlay.tsx` | 26 | 69 | `TS2322` | Type '{ text: string; ariaLabel: string; normalizeMath: boolean; }' is not assignable to type 'IntrinsicAttributes & MathTextProps<"span">'. |
| `components/visualizations/three/manim/mathObjectTransform.ts` | 139 | 103 | `TS2339` | Property 'aligned' does not exist on type '{ kind: "curve"; aligned: AlignedCurveSamples; } \| { kind: "empty"; } \| { kind: "vector"; sourceFrom: Vec3; sourceTo: Vec3; targetFrom: Vec3; targetTo: Vec3; }'. |
| `components/visualizations/three/ThreeDGraphCanvas.tsx` | 323 | 11 | `TS2322` | Type '{ text: string; ariaLabel: string; normalizeMath: boolean; }' is not assignable to type 'IntrinsicAttributes & MathTextProps<"span">'. |
| `components/visualizations/three/ThreeDLabCanvas.tsx` | 283 | 92 | `TS2322` | Type '{ text: string; ariaLabel: string; normalizeMath: boolean; }' is not assignable to type 'IntrinsicAttributes & MathTextProps<"span">'. |
| `components/visualizations/three/threeDSceneMath.catalog.test.ts` | 14 | 69 | `TS2339` | Property 'threeD' does not exist on type 'FeaturedLabDefinition'. |
| `components/visualizations/three/threeDSceneMath.catalog.test.ts` | 15 | 63 | `TS2339` | Property 'threeD' does not exist on type 'FeaturedLabDefinition'. |
| `components/visualizations/three/threeDSceneMath.catalog.test.ts` | 26 | 19 | `TS2339` | Property 'threeD' does not exist on type 'FeaturedLabDefinition'. |
| `components/visualizations/three/threeDSceneMath.catalog.test.ts` | 27 | 5 | `TS7053` | Element implicitly has an 'any' type because expression of type 'any' can't be used to index type 'Record<ThreeDRegionalPriority, number>'. |
| `components/visualizations/three/threeDSceneMath.catalog.test.ts` | 27 | 23 | `TS2339` | Property 'threeD' does not exist on type 'FeaturedLabDefinition'. |
| `components/visualizations/three/threeDSceneMath.catalog.test.ts` | 41 | 25 | `TS2339` | Property 'threeD' does not exist on type 'FeaturedLabDefinition'. |
| `components/visualizations/three/threeDSceneMath.catalog.test.ts` | 47 | 94 | `TS2339` | Property 'threeD' does not exist on type 'FeaturedLabDefinition'. |

## Checks

- `npm run type-check` (A06, cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`) - Prove the owner remediation no longer contributes TypeScript errors in the A22 candidate context.
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
