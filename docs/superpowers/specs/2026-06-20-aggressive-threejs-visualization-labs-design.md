# Aggressive Three.js Visualization Labs Design

Date: 2026-06-20
Owner: S06 Visualization lead
Status: Approved direction; implementation not started in this spec step

## Goal

Convert the MAIS Visualization Lab program to a Three.js-first architecture while preserving the current broad catalog and release safety.

The target end state is:

- Every existing visualization template has a Three.js-backed scene family.
- The program exposes 24-28 reusable 3D lab families.
- The catalog keeps its existing topic breadth.
- Premium/deep coverage marks 80-100 topic-specific pages.
- Regional premium allocation includes Mainland China 35-45 pages, California 10-15 pages, and Hong Kong 8-10 pages.

## Current Evidence

- `package.json` already includes `three`, `@react-three/fiber`, and `@react-three/drei`.
- `/visualization-lab` redirects to `/student/tools/visualizations`.
- `data/visualizationLabs.ts` currently exports 695 visualization labs in this worktree.
- The current catalog has 335 Mainland China labs, 76 California labs, and 49 Hong Kong labs.
- The current catalog has 18 visualization template IDs.
- Only `vector-conic-3d/strategy-map` currently has a React Three Fiber canvas path, through `components/visualizations/three/ThreeDGraphCanvas.tsx`.
- `ConfiguredVisualizationLab.tsx` still renders most templates through deterministic SVG/React surfaces.

## Design Choice

Use the aggressive approach, but phase it.

This means S06 will build toward Three.js coverage for every existing template, not only the premium subset. The migration still keeps the existing SVG/React renderer as a fallback until each family has:

- deterministic math attributes,
- nonblank canvas evidence,
- keyboard/touch controls,
- dark/light readability,
- mobile layout verification,
- S11 regression coverage,
- S22 build and release readiness.

The broad catalog remains intact. The regional page counts are interpreted as the premium 3D launch subset, not as a reduction of the full catalog.

## Template Migration Map

The existing 18 templates map to 18 baseline Three.js families:

| Existing template | Three.js family ID | Core scene |
| --- | --- | --- |
| `number-line` | `three-number-line` | 3D rail, counters, hops, interval brackets |
| `base-ten` | `three-base-ten-blocks` | unit cubes, rods, flats, regrouping trays |
| `array-area` | `three-array-area-blocks` | tiled prisms, area walls, perimeter rails |
| `fraction-bar` | `three-fraction-slices` | partitioned bars, circular slices, equivalent stacks |
| `clock-money-data` | `three-clock-money-data` | clock face, coin trays, bar towers |
| `measurement-scale` | `three-measurement-scale` | ruler beams, liquid columns, unit markers |
| `angle-geometry` | `three-angle-geometry` | rotatable rays, polygons, angle arcs |
| `right-triangle-pythagorean` | `three-right-triangle-pythagorean` | right triangles, square areas, space diagonal option |
| `coordinate-transform` | `three-coordinate-transform` | 3D grid, points, transformations, traces |
| `equation-balance` | `three-equation-balance` | balance scale, algebra tiles, operation animation |
| `function-graph` | `three-function-graph` | curve ribbon, roots, vertex markers |
| `function-family` | `three-function-family` | transformable function surface/curve families |
| `complex-plane` | `three-complex-plane` | Argand plane, modulus tower, rotation arcs |
| `trig-unit-wave` | `three-trig-unit-wave` | unit circle, wave ribbon, phase/amplitude controls |
| `probability-simulation` | `three-probability-machine` | trial machine, bins, sample paths |
| `statistics-distribution` | `three-statistics-distribution` | dot stacks, histogram towers, mean/spread overlays |
| `calculus-rate-area` | `three-calculus-rate-area` | tangent plane/line, accumulation slabs |
| `vector-conic-3d/strategy-map` | `three-vector-conic-strategy` | vectors, conic slices, surface/solid synthesis |

## Premium Family Additions

Add 8 premium-only families to bring total family coverage to 26:

| Premium family ID | Purpose |
| --- | --- |
| `three-solid-nets-folding` | Nets, folding, prisms, cylinders, cones |
| `three-cross-section-slicer` | Plane slices through solids and cones |
| `three-space-vectors-lines-planes` | Lines, planes, dot product, projections |
| `three-conic-sections-deep` | Ellipse, parabola, hyperbola from cone geometry |
| `three-optimization-modeling` | Volume/area/rate optimization scenes |
| `three-statistical-inference-lab` | Sampling, confidence, experimental variation |
| `three-curriculum-crosswalk-map` | HK, Mainland, and California topic comparison |
| `three-exam-strategy-capstone` | Multi-representation strategy lab for capstone topics |

## Regional Premium Subset

The first launch subset should contain 61 regional anchors:

- Mainland China: 40 pages.
- California: 12 pages.
- Hong Kong: 9 pages.

This satisfies the stated regional bands. Add 19-39 cross-region, capstone, and family-applied pages to reach the 80-100 topic-specific premium target.

The current first-pass anchor selection favors templates already closest to 3D learning value:

- Mainland: vectors, conics, solid geometry, complex plane, derivatives, trigonometry.
- California: functions, rate of change, trigonometry, quadratic structure, probability, statistics.
- Hong Kong: calculus, differentiation, trigonometry, functions, quadratic patterns, probability.

## Data Model

Extend visualization lab metadata without breaking existing consumers:

```ts
type ThreeDFamilyId = string;
type ThreeDCoverageTier = "standard-3d" | "premium-3d" | "capstone-3d";

type ThreeDVisualizationMetadata = {
  enabled: boolean;
  familyId: ThreeDFamilyId;
  coverageTier: ThreeDCoverageTier;
  regionalPriority?: "mainland" | "california" | "hong-kong" | "cross-region";
  premiumLaunch?: boolean;
  fallbackTemplateId: VisualizationTemplateId;
};
```

Add this as an optional property on `FeaturedLabDefinition`. Existing labs can remain valid during rollout. A lab is Three.js-first when `threeD.enabled === true`.

## Rendering Architecture

Add a shared Three.js shell under `components/visualizations/three/`:

- `ThreeDLabCanvas.tsx`: React Three Fiber canvas, camera, lights, resize handling, WebGL detection, reduced-motion handling, screenshot-friendly drawing buffer, and common `data-viz-*` attributes.
- `ThreeDLabSceneRegistry.tsx`: maps `ThreeDFamilyId` to scene components.
- `threeDSceneMath.ts`: pure math state builders shared by scenes and tests.
- `threeDSceneTypes.ts`: typed scene state, controls, labels, and diagnostics.
- Family files such as `NumberLineScene.tsx`, `BaseTenBlocksScene.tsx`, and `TrigUnitWaveScene.tsx`.

`ConfiguredVisualizationLab.tsx` becomes the bridge:

1. Read the active lab and template.
2. Build existing control state.
3. If the lab has a ready Three.js family, render `ThreeDLabCanvas`.
4. If WebGL is unavailable or the family is not yet ready, render the current deterministic SVG/React surface.

## Interaction Contract

Every Three.js scene must expose:

- `data-viz-surface`
- `data-viz-renderer="three-r3f"`
- `data-viz-canvas-ready`
- `data-viz-family-id`
- `data-viz-template-id`
- `data-viz-state-summary`
- at least one `data-viz-mark`
- finite numeric attributes for the main math state

Controls must preserve current range inputs where possible so existing Playwright sweeps still work. Direct manipulation can be added, but slider/keyboard alternatives remain required.

## Phased Rollout

Phase 1: Foundation

- Add shared Three.js shell and registry.
- Keep current `ThreeDGraphCanvas` behavior working.
- Add contract tests for renderer readiness, fallback behavior, and scene-state summaries.

Phase 2: Low-risk primary families

- Convert `number-line`, `base-ten`, `array-area`, `fraction-bar`, `measurement-scale`, and `clock-money-data`.
- Goal: prove simple manipulatives, mobile layout, and fallback contracts.

Phase 3: Geometry and algebra families

- Convert `angle-geometry`, `right-triangle-pythagorean`, `coordinate-transform`, and `equation-balance`.
- Goal: prove direct manipulation, exact labels, and accessible alternatives.

Phase 4: Graph, probability, and statistics families

- Convert `function-graph`, `function-family`, `probability-simulation`, and `statistics-distribution`.
- Goal: prove curves, distributions, accumulated trials, and deterministic math summaries.

Phase 5: Advanced and premium families

- Convert `complex-plane`, `trig-unit-wave`, `calculus-rate-area`, and `vector-conic-3d/strategy-map`.
- Add the 8 premium-only families.
- Mark the 80-100 premium/deep topic pages.

Phase 6: Three.js-first default

- Switch ready families to Three.js-first.
- Keep SVG/React fallback for WebGL failure and deterministic test fallback.
- S11/S22 evidence decides when fallback is hidden from normal users.

## QA And Release Gates

S06 local gates:

- TypeScript passes for touched files.
- Pure math tests pass for family state builders.
- Targeted browser checks prove canvas is nonblank and controls change finite math state.
- Desktop and mobile viewports show no overlap.

S18 curriculum QA gates:

- Family-to-topic fit is accepted for Mainland, California, and Hong Kong anchors.
- California source policy uses identifiers and MAIS-authored summaries only.
- Mainland and Hong Kong content remains curriculum-aligned without unverified claims.

S11 regression gates:

- Existing `visualization-values` and `visualization-overlap` tests continue to pass or are updated with equivalent stronger assertions.
- New Three.js tests cover renderer readiness, canvas pixels, range extremes, keyboard reset, and fallback.

S22 release gates:

- Build passes in an isolated release slice.
- Bundle size and client chunk impact are reviewed.
- Dev-server and production smoke checks prove no blank canvas surfaces.

## Implementation Boundaries

S06 may edit visualization runtime and catalog metadata:

- `components/visualizations/`
- `components/visualizations/three/`
- `data/visualizationLabs.ts`
- S06 coordination logs and approved design/planning artifacts

S06 must coordinate before editing:

- package files,
- broad tests in `tests/e2e/`,
- shared types in `types/index.ts`,
- app shell,
- API routes,
- curriculum source files outside visualization metadata.

No Git staging, commit, branch, merge, rebase, push, reset, clean, or revert is allowed unless the owner explicitly assigns that exact Git operation.

## Acceptance Criteria

The aggressive Three.js migration is complete only when:

- All 18 current template IDs have ready Three.js families.
- The catalog exposes 24-28 total 3D family IDs.
- 80-100 topic-specific pages are marked premium/deep 3D.
- The premium subset includes Mainland China 35-45 pages, California 10-15 pages, and Hong Kong 8-10 pages.
- Each ready family renders a nonblank Three.js canvas on desktop and mobile.
- Each ready family has deterministic fallback.
- Each ready family exposes machine-readable math state for tests.
- S18, S11, and S22 gates are recorded before production release language claims full completion.

## Spec Self-review

- Placeholder scan: no placeholders remain.
- Internal consistency: the design preserves the broad catalog while making Three.js the target renderer for every template.
- Scope check: the design is too large for one code pass, so implementation is intentionally phased.
- Ambiguity check: regional numbers are defined as the premium launch subset, not the full catalog size.
- Git check: this design document is not committed because project instructions forbid Git operations without explicit owner assignment.
