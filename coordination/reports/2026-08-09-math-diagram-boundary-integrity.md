# Mathematical Diagram Boundary Integrity Audit

Audit window: 2026-08-09 to 2026-08-10  
Owner lane: A11 QA, with A04 Practice, A05 Lessons, A06 Visualization Lab, A18 curriculum QA, A22 release engineering, and A25 release intake  
Branch point: `3f8f12c4d3fd2efe938d1b07cab6289315f108dd`  
Latest fetched `origin/main` before integration: `867d17799140e7f45129c928b7af57a540402c75`  
Working branch: `codex/a11-diagram-boundary-integrity`

## Reusable problem description

The short user-facing description is:

> A mathematical-diagram boundary-integrity defect occurs when a line, angle arc, curve, point, label, formula, image, Canvas/WebGL mark, or its painted stroke leaves the diagram's intended drawing area, crosses a semantic endpoint, becomes clipped or unreachable, collides with another required mark, or expands the page at a reachable responsive or interactive state.

For issue reports, use the following taxonomy instead of the ambiguous phrase "the angle goes outside":

1. **Semantic endpoint overrun** — an angle arc or segment continues past its defining ray, vertex, endpoint, or intersection.
2. **Paint overrun** — the mathematical centerline ends correctly, but a round line cap, stroke width, shadow, or marker paints beyond the endpoint or frame.
3. **Drawing-frame overflow** — SVG, Canvas 2D, or projected WebGL paint leaves its own `viewBox`, bitmap, plot frame, or canvas.
4. **Annotation collision or clipping** — a label, number, unit, tick, formula, or title overlaps another required mark or is cut off.
5. **Responsive reachability failure** — an intrinsically wide diagram is centred from a negative scroll origin, silently clipped, or makes the page wider than the viewport.
6. **State-dependent overflow** — default geometry is valid, but a slider extreme, stepper endpoint, random outcome, select/number input, mode, drag, Shift-click, or context-menu state is not.
7. **Semantic distortion disguised as containment** — coordinates are numerically clamped or geometry is erased instead of retaining the true mathematical object and applying an explicit plot clip/edge indicator.

`overflow: hidden` on the body, card, or figure is never accepted as the sole correction. A scalable diagram must fit. A legitimately wide diagram must have a bounded, labelled, keyboard-focusable scroll region whose left and right content edges are reachable. Infinite mathematical objects may use an explicit plot-scoped clip, but their source coordinates must remain mathematically honest.

## Acceptance contract

A corrected surface must satisfy all applicable clauses:

- Every semantic angle arc has an explicit machine-readable contract. Both actual SVG path endpoints lie on the positive defining rays, the painted radius and signed sweep match the contract, and actual browser `stroke-linecap` is `butt` so paint does not continue beyond either ray.
- SVG geometry and required labels remain inside the root `viewBox`; strokes receive a real gutter rather than relying on clipping.
- Canvas 2D requested paint remains inside the backing bitmap after transforms and DPR normalization. Cubic/quadratic extrema, joins, caps, compositor modes, and reset/resize transitions are accounted for; unsupported paint APIs and ambiguous miter joins fail closed instead of silently passing. A blank canvas is accepted only with the explicit `intentional-empty-v1` policy.
- SVG paint auditing includes nested labelled/data diagram roots, real marker geometry, filter regions, masks, and unsupported effects. Effects are counted separately as audited or audit-incomplete; incomplete effects fail the release gate.
- Actual Three.js/WebGL renderables are projected through the live camera into CSS-pixel canvas bounds. Every renderable is supported; missing content roots or unsupported geometry fail closed.
- The document has exact `scrollWidth === clientWidth`; an element-level tolerance cannot excuse page overflow.
- At 320, 375, 768, 1024, and 1440 px, content either fits or remains completely reachable through its local scroll region.
- English, Traditional Chinese, Simplified Chinese, light theme, and dark theme do not change the boundary result.
- Default, finite control extremes, mode states, exceptional random/pointer/context-menu states, and resize states are audited with stable-layout waits.

## Authoritative source inventory

The repeatable command is:

```sh
node --import tsx scripts/audit-math-diagram-inventory.ts --output coordination/reports/2026-08-09-math-diagram-inventory.json
```

| Surface | Current count | Coverage meaning |
| --- | ---: | --- |
| Live lesson routes | 490 | Canonical authenticated lesson route graph |
| Registered CCSS interactive lessons | 270 | All registrations resolve to a canonical live route |
| CCSS lessons with inline SVG | 127 | 132 literal SVG roots |
| CCSS button controls | 531 in 244 modules | Explicit browser state protocol plus source policies |
| CCSS range controls | 40 in 38 modules | Minimum, quartiles, maximum, and restoration |
| CCSS number controls | 1 | Explicit metric-conversion exceptional-state policy |
| CCSS select controls | 2 | Full 4 x 4 metric-unit cross-product with two finite number extremes |
| Structured Practice figures | 27 | Schema-backed figure inventory |
| Visualization Lab routes | 689 | 613 configured and 76 signature routes |
| Effective Three.js routes | 78 | 90 declare 3D; 12 declarations correctly resolve to signature Canvas instead |
| Signature benches | 192 | 188 reachable; 4 deliberately ported but unassigned |
| Live asset references | 299 | 239 unique files |
| Public SVG assets | 53 | All require explicit `viewBox` |
| Source surface files | 523 | 302 inline SVG roots, 208 Canvas uses, 270 HTML `Figure` uses |
| HTML-only Figure source files | 143 | Kept separate from SVG/Canvas source counts |
| Semantic angle marks/contracts | 16 / 16 | No uncontracted semantic angle mark |
| Standalone diagram routes | 4 | Replacement textbook images, Adventure SVG, stored Mistake figure, Euler drag demo |

The source inventory proves registration, ownership, source classification, asset existence, and required semantic contracts. It does not by itself prove rendered containment. HTML-only `Figure` sources and browser-rendered `[data-figure-stage]` surfaces are therefore reported separately rather than hidden inside the SVG count.

## Original screenshot

The reported route is `/student/lessons/us-ca-math-s4-chapter-01`, `precise-definitions`, Angle state.

- The exact centerline correction was already merged in PR #120, commit `e4518c4d10`: the arc endpoint changed to `(73.282, 97.812)`.
- The endpoint radius is `39.99998585` for the declared radius `40`.
- The endpoint/ray cross product is approximately `-9.1e-13`, numerically collinear.
- The arc uses a butt line cap and is painted before both defining rays, so the rays remain visually authoritative at the two endpoints.
- This branch retains that geometry, adds stable state-enumeration hooks, and makes the exact paint-order rule a browser regression rather than relying on a screenshot comparison.

## Confirmed root causes and implemented repair classes

| Class | Representative surfaces | Repair | Evidence state |
| --- | --- | --- | --- |
| Semantic angle and paint overrun | `precise-definitions`, congruence, right-triangle solving, unit circle, sector/fraction angles, Worked Examples, Practice `QuestionFigure`, configured angle/complex-plane labs | Shared exact ray/arc geometry; two-arc full turns; semantic contracts; actual-path sampling; butt-capped semantic arcs | Static geometry and focused synthetic browser contracts green; rebuilt product-browser rerun pending |
| Shared mobile clipping | CCSS `Figure`, `FigureScroll`, fixed-width HTML/SVG lessons | Removed blanket clipping; bounded local scrolling only when needed; keyboard/region semantics; left-origin anchoring; responsive scale/wrap fixes | Component and source contracts green; rebuilt browser rerun pending |
| Page min-content overflow | lesson practice grid, Practice avatar, Navbar, Adventure shell | `minmax(0,1fr)`, `min-w-0`, zero-width absolute wrapper, mobile shell breakpoints | Source regression green; browser rerun pending |
| SVG/viewBox gutters | place-value blocks, area/perimeter, volume/mass, clocks, circles, triangles, prisms | Expanded or dynamically fitted frames; place-value uses a 1-unit coordinate inset, viewBox dimensions +2, and at least 0.25 SVG-unit painted-stroke margin | Enumerated source regression green |
| Honest plot geometry | functions, residuals, systems, inequalities, conics, slope explorer | Raw mathematical paths/segments plus plot-scoped clips; no boundary plateaus; steep lines clipped to the plotting square | Exhaustive finite-state source regression green |
| Labels and annotations | Grade 1 exact scenes, coordinate/probability/statistics/trig axes, clocks/money/data, right triangles, Euler centers | Separate label lanes, boundary-aware anchors, duplicate rejection, coincident-center grouping, exact-scene header de-duplication | Component/source regression green |
| Practice figures and handwriting | graph plots, ten-frames, counting cards, stored mistakes, resized handwriting | Unique plot clips, responsive frames, wrapping cards, restored Mistake context, stroke rescaling/redraw on logical resize | Question-figure and handwriting/onboarding gates green |
| Canvas requested-paint overflow | `CountingLab`, `ComparingLab`, all Canvas-backed reachable labs | Pre-paint Canvas 2D probe; DPR/transform-aware bounds; analytic Bézier extrema; compositor classification; explicit intentional-blank policy; compact two-line zero/equality messages | Synthetic hardening gate green; real rebuilt-browser rerun pending |
| SVG painted-effect overflow | arrowed/vector diagrams and filtered graph/geometry explorers | Actual local marker geometry and filter-region bounds; shared nested-root discovery; masks and unsupported effects fail closed | Focused synthetic paint gate green; rebuilt product-browser rerun pending |
| WebGL projected overflow | 78 effective Three.js Visualization Labs | Live-scene boundary probe projects supported BufferGeometry, Line, Points, Sprites, and meshes through current camera; projected labels expose final rectangles and formula overlay selects a safe corner | Pure Three.js/formula contracts green; rebuilt product-browser matrix pending |
| Off-grid mathematical state | configured coordinate transformations | Preserve raw coordinates, clamp only the visible indicator, and disclose continuation direction | Component regression green |
| Degenerate geometry | triangle drag/Euler line | Minimum area, finite-center, complete circumcircle, and nine-point-circle containment gates | Exhaustive helper regression green |

The three new product helpers that must travel with their consumers are:

- `lib/mathDiagramGeometry.ts`
- `components/visualizations/rawCurveGeometry.ts`
- `components/visualizations/eulerLineGeometry.ts`

The actual Three.js product probe is `components/visualizations/three/ThreeDSceneBoundaryProbe.tsx`.

## Automated gates

| Gate | Result at report update |
| --- | --- |
| Inventory and source graph | PASS — current counts above, zero inventory failures |
| Strict angle/source/browser-root contracts | PASS — 15/15 source tests |
| Shared math geometry | PASS — 12/12 tests |
| CCSS finite-state/source boundary regressions | PASS — 32/32 tests |
| Responsive visualization source regressions | PASS — 7/7 tests |
| TypeScript strict check | PASS |
| Lesson Figure/angle/Worked Example focused contracts | PASS — 39/39 tests |
| Component discovery gate | PASS — component runner exit 0; changed Three.js/formula contracts additionally pass 305/305 |
| Question-figure gate | PASS — 23/23 tests |
| Visualization gate | PASS — 147/147 tests |
| CCSS textbook gate | PASS — 278 source files clean |
| Handwriting/onboarding focused gates | PASS — 35/35 tests |
| Synthetic angle/body/Canvas browser gate | PASS — 3/3 scenarios |
| Canvas/SVG paint hardening browser gates | PASS — 11/11 scenarios |
| Production build from clean integrated commit | PENDING |
| Rendered browser matrix | PENDING |
| GitHub PR CI | PENDING |

The rendered browser gate measures semantic angle contracts, actual SVG path geometry and painted markers/filters, SVG/viewBox containment, explicit plot clips, HTML figure reachability, hidden clipping, label/mark collisions, Canvas requested paint, actual WebGL projections, media decoding/container bounds, and exact document width. Its ordinary-control explorer is a fail-closed dynamic breadth-first state graph (`state-graph-v2`, 24-state/96-transition caps) rather than a fixed initial button list. It also covers the four standalone routes and exceptional CCSS random, Shift-click, context-menu, click-grid, drag-grid, number, and select states through explicit executors.

Full-matrix mode accepts only `MATH_DIAGRAM_AUDIT_FULL=0|1`; when enabled it rejects surface, ID, viewport, language, theme, and shard narrowing. Every requested viewport token is validated, so a typo cannot silently shrink release coverage.

## Manual-review boundary

- DOM and file metadata cannot prove the semantic composition inside a raster bitmap. The gate proves the referenced bitmap exists, decodes, has non-zero intrinsic dimensions, and stays inside its responsive container; human visual review remains the semantic-bitmap check.
- Intentional infinite lines, unbounded inequalities, and function tails are accepted only when raw geometry remains intact and an explicit plot clip is present.
- The Canvas probe deliberately fails closed on paint calls whose geometry cannot be reconstructed reliably, including unsupported `Path2D`/image-data cases.

## Proof-state separation

| State | Status |
| --- | --- |
| Local source/unit/type evidence | Green for the gates listed above; clean-build/browser closure remains |
| Clean production build | Pending |
| GitHub branch pushed | Pending |
| PR created and CI green | Pending |
| Merged into GitHub `main` | Pending |
| Vercel deployment | Not requested and not performed |
| Live `mais.ac` verification of this branch | Not claimed |

This report will be updated with the final local build/browser evidence before the branch is pushed. GitHub merge evidence belongs to the PR/merge record. A merged commit must not be described as deployed or live until a separately authorized deployment and production verification occur.
