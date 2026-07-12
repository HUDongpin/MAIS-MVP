
# 2026-06-26 A25 A06 Type-Fix Slice Manifest

- Generated: 2026-06-26 11:22:54 HKT
- Agents: A10 tooling/docs/report; A25 git hygiene/release intake
- Baseline: `main` at `cef544e0`
- Dirty map snapshot: `coordination/release-intake/2026-06-26-A25-dirty-tree-map-20260626T032131Z.json`
- Moving latest pointer: `coordination/release-intake/latest-A25-dirty-tree-map.json`
- Status signature: `c8c133649f8784377ba9ad3da651f82400150120ffd2b7bc3cc5ec58276a9f9f`
- Status: current root type-check and focused A06 tests pass.
- Pathspec: `coordination/release-intake/2026-06-26-A25-a06-type-fix-slice.pathspec`

## Direct Priority Files

| Status | Path | Owner | Slice |
| --- | --- | --- | --- |
| `??` | `components/visualizations/three/manim/mathEvidenceHarness.ts` | A06 visualization lead | runtime app/API/data/public |
| `??` | `components/visualizations/three/manim/mathMobjectLayout.ts` | A06 visualization lead | runtime app/API/data/public |
| `??` | `components/visualizations/three/manim/mathMobjectLayout.test.ts` | A06 visualization lead | tests/regression evidence |
| `??` | `components/visualizations/three/manim/mathEvidenceHarness.test.ts` | A06 visualization lead | tests/regression evidence |
| `M` | `components/visualizations/three/ThreeDLabCanvas.tsx` | A06 visualization lead | runtime app/API/data/public |
| `M` | `components/visualizations/three/threeDCanvasContract.test.ts` | A06 visualization lead | tests/regression evidence |
| `M` | `components/visualizations/three/threeDCanvasSurfaceContract.ts` | A06 visualization lead | runtime app/API/data/public |
| `??` | `components/visualizations/three/manim/mathAlwaysMethodUpdater.ts` | A06 visualization lead | runtime app/API/data/public |
| `??` | `components/visualizations/three/manim/mathAlwaysMethodUpdater.test.ts` | A06 visualization lead | tests/regression evidence |
| `??` | `components/visualizations/three/manim/mathAlwaysRedraw.ts` | A06 visualization lead | runtime app/API/data/public |
| `??` | `components/visualizations/three/manim/mathAlwaysRedraw.test.ts` | A06 visualization lead | tests/regression evidence |
| `M` | `components/visualizations/three/manim/mathUpdaterRegistry.ts` | A06 visualization lead | runtime app/API/data/public |
| `??` | `coordination/session-logs/2026-06-26-A06.md` | A10 tooling, docs, and report | docs/coordination evidence |

## Dependency Closure

- Dirty dependency-closure paths: `149`
- Full closure is recorded in `coordination/release-intake/2026-06-26-A25-a06-type-fix-slice-manifest.json` and the pathspec file.

## Current Verification

- `npm run type-check -- --pretty false`: passed.
- `./node_modules/.bin/tsx --test --test-reporter=dot components/visualizations/three/manim/mathAlwaysMethodUpdater.test.ts components/visualizations/three/manim/mathAlwaysRedraw.test.ts components/visualizations/three/manim/mathMobjectLayout.test.ts components/visualizations/three/manim/mathEvidenceHarness.test.ts`: passed with exit 0.

## Review Notes

- The dependency closure is large, so this is not yet a small A06 review package.
- A06 should either accept the closure as the Manim v2 feature/type-check package or extract a smaller type-fix patch in an isolated worktree.
- A10/A25 did not edit A06 runtime code.
