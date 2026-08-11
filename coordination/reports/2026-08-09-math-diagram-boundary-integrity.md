# Mathematical Diagram Boundary Integrity Audit

- Audit window: 2026-08-09 to 2026-08-11
- Owner lane: A11 QA, coordinating A04 Practice, A05 Lessons, A06 Visualization Lab, A18 curriculum QA, A22 release engineering, and A25 release intake
- Initial audit baseline / PR #120 merge: `3f8f12c4d3fd2efe938d1b07cab6289315f108dd`
- Final local integration baseline / last fetched `origin/main`: `20c8fb983e7f4f6d39b9bbb09f58c64887f2e72b`
- Verified code/test commit: `9c2379d902c72ed766c1a86daff9e7830f302dd9` (tree `c43afec4419d1fb70f6682294f90e11f8de350b8`)
- Working branch: `codex/a11-diagram-boundary-integrity`

This report records local source, build, and rendered-browser evidence. It does not claim GitHub merge, deployment, or live-production verification; those states must be established separately.

## Reusable problem description

The short user-facing description is:

> A mathematical-diagram boundary-integrity defect occurs when a line, angle arc, curve, point, label, formula, image, Canvas/WebGL mark, or its painted stroke leaves the diagram's intended drawing area, crosses a semantic endpoint, becomes clipped or unreachable, collides with another required mark, or expands the page at a reachable responsive or interactive state.

For issue reports, use this taxonomy instead of the ambiguous phrase "the angle goes outside":

1. **Semantic endpoint overrun** — an angle arc or segment continues past its defining ray, vertex, endpoint, or intersection.
2. **Paint overrun** — the mathematical centerline ends correctly, but a round cap, stroke width, shadow, marker, or filter paints beyond the endpoint or frame.
3. **Drawing-frame overflow** — SVG, Canvas 2D, or projected WebGL paint leaves its own `viewBox`, bitmap, plot frame, or canvas.
4. **Annotation collision or clipping** — a label, number, unit, tick, formula, or title overlaps another required mark or is cut off.
5. **Responsive reachability failure** — an intrinsically wide diagram starts from a negative scroll origin, is silently clipped, or makes the document wider than the viewport.
6. **State-dependent overflow** — default geometry is valid, but a slider extreme, stepper endpoint, random outcome, select/number input, mode, drag, Shift-click, or context-menu state is not.
7. **Semantic distortion disguised as containment** — coordinates are numerically clamped or geometry is erased instead of retaining the true mathematical object and applying an explicit plot clip or edge indicator.

`overflow: hidden` on the body, card, or figure is never accepted as the sole correction. A scalable diagram must fit. A legitimately wide diagram must have a bounded, labelled, keyboard-focusable scroll region whose left and right content edges are reachable. Infinite mathematical objects may use an explicit plot-scoped clip, but their source coordinates must remain mathematically honest.

## Acceptance contract

- Every semantic angle arc has a machine-readable contract. Both actual path endpoints lie on the positive defining rays; radius and signed sweep match; the browser-resolved line cap is `butt`; and the rays paint above the arc endpoints.
- SVG geometry, effects, strokes, markers, and required labels remain inside the root `viewBox` with a real gutter.
- Canvas 2D requested paint remains inside the backing bitmap after transform and DPR normalization. Unsupported paint and ambiguous joins fail closed; a blank canvas is accepted only under the explicit `intentional-empty-v1` policy.
- Three.js/WebGL renderables are projected through the live camera into CSS-pixel canvas bounds. Missing content roots and unsupported renderables fail closed.
- Formula panels and projected labels use the final measured viewport and final rendered rectangles; neither may be hidden or renamed to make a collision disappear.
- The document must satisfy exact `scrollWidth === clientWidth`. An element-level tolerance cannot excuse page overflow.
- Responsive content either fits or is fully reachable in its local scroll region.
- Default, finite control extremes, mode states, exceptional random/pointer/context-menu states, drag states, and resize states are audited after stable-layout waits.

## Authoritative source inventory

Repeatable command:

```sh
node --import tsx scripts/audit-math-diagram-inventory.ts --output coordination/reports/2026-08-09-math-diagram-inventory.json
```

| Surface | Count | Coverage meaning |
| --- | ---: | --- |
| Live lesson routes | 490 | Canonical authenticated lesson graph |
| Registered CCSS interactive lessons | 270 | Every registration resolves to a live route |
| CCSS lessons with inline SVG | 127 | 132 literal SVG roots |
| CCSS button controls | 531 in 244 modules | State-graph and exceptional-state policy coverage |
| CCSS range controls | 40 in 38 modules | Minimum, quartiles, maximum, restoration |
| CCSS number/select controls | 1 / 2 | Finite-number and full unit-cross-product policy |
| Structured Practice figures | 27 | Schema-backed figure inventory |
| Visualization Lab routes | 689 | 613 configured and 76 signature routes |
| Effective Three.js routes | 78 | 90 declare 3D; 12 resolve to signature Canvas |
| Signature benches | 192 | 188 reachable; 4 ported but intentionally unassigned |
| Live asset references | 299 | 239 unique files |
| Public SVG assets | 53 | Every file has an explicit `viewBox` |
| Source surface files | 523 | 302 inline SVGs, 208 Canvas uses, 270 HTML `Figure` uses |
| HTML-only Figure files | 143 | Kept distinct from SVG/Canvas counts |
| `FigureScroll` uses | 27 | Wide-diagram reachability surfaces |
| Semantic angle marks/contracts | 16 / 16 | No uncontracted semantic angle mark |
| Standalone diagram routes | 4 | Textbook images, Adventure SVG, Mistake figure, Euler drag demo |

The inventory completed with zero failures. It records discovery under declared `app`/`components`/`data`/`public` roots, a deterministic SHA-256 digest of all discovered rows, reviewed minimum coverage baselines, ownership, source classification, asset existence, semantic contracts, and exceptional-state declarations. It does not replace rendered containment checks, and an intentional inventory reduction requires an explicit baseline review.

## Original screenshot

Reported route: `/student/lessons/us-ca-math-s4-chapter-01`, lesson `precise-definitions`, Angle state.

- PR #120 commit `e4518c4d10` corrected the arc endpoint to `(73.282, 97.812)`.
- Its endpoint radius is `39.99998585` for the declared radius `40`; the ray cross product is approximately `-9.1e-13`.
- The arc is butt-capped and paints before both defining rays, so its stroke cannot visually protrude past either ray.
- This slice preserves that repair, makes it a semantic source/browser contract, and audits related endpoint, paint, frame, annotation, responsiveness, and interaction failures rather than treating the screenshot as an isolated pixel fix.
- The rebuilt route passed at `phone-320` and `desktop-1440` for `precise-definitions`, `constructions`, and every exposed diagram state in final monitored Run 59 (`1/1`, 4.8m).

## Confirmed repair classes

| Class | Representative surfaces | Implemented repair | Evidence |
| --- | --- | --- | --- |
| Semantic angle / paint overrun | Precise Definitions, congruence, right-triangle, unit-circle, sector/fraction angles, Worked Examples, Practice figures, configured labs | Exact ray/arc geometry, two-arc full turns, machine-readable contracts, actual path sampling, butt caps, paint-order assertions | 16/16 source contracts; Run 39 4/4; Run 35 original-route pass |
| Construction-arc clipping | Perpendicular-bisector construction | Exact compass arcs terminate at the in-frame intersections instead of clipped full circles | Source contract and Run 35 |
| Shared mobile clipping and page min-content | CCSS `Figure`/`FigureScroll`, fixed HTML/SVG lessons, Practice shell, navigation | Removed blanket clipping; bounded reachable scrolling; `min-w-0` and responsive reflow | 394/394 source/component suite; earlier Runs 34, 35, 38 |
| SVG/viewBox gutters | Place value, area/perimeter, mass/volume, clocks, circles, triangles, prisms, proof canvases | Expanded/dynamic frames, inset axes/labels, painted-stroke gutters | Enumerated source regressions |
| Honest plot geometry | Functions, residuals, systems, inequalities, conics, slope explorer | Raw mathematical geometry plus plot-scoped clips or edge indicators; no false plateaus | Source regressions and Run 40 |
| Static/dynamic annotation layout | Elementary exact scenes, coordinate/probability/statistics/trig labels, proof readouts | Dedicated lanes, footprint-aware anchors, wrapping, de-duplication, coincident-label grouping | 394/394 and targeted rendered evidence |
| Four-quadrant endpoints and self-reflection | Legal coordinates at `±6`, axes, origin, and reflection states | Flip endpoint labels inward; move quadrant labels around text/markers; render a point on the selected axis only once and state that it is unchanged | All 338 point/axis/reflection states, including 26 self-reflections; focused Run 33 and full Run 34 |
| Euler drag collision | Vertex labels versus O/G/H/N dots and labels | Joint candidate placement around all vertex halos, center dots, and previously placed labels | Exact replays through C=`(480,150)`, `(243.5,328)`, and `(414,310)`, plus more than 2,000 reachable source states; earlier Run 38 |
| Practice figures and handwriting | Graphs, ten-frames, counting cards, stored mistakes, resized handwriting | Unique plot clips, responsive frames, durable stored-figure context, logical-size stroke rescaling | Focused tests and Run 38 |
| Canvas requested-paint overflow | Counting, Comparing, Canvas-backed labs | Transform/DPR-aware pre-paint probe, analytic Bézier extrema, compositor classification, explicit blank policy | 394/394 and earlier Run 39 |
| SVG painted effects | Marker/filter/mask diagrams | Actual local marker and filter bounds; unsupported effects fail closed | Synthetic and rendered gates |
| WebGL projection and formula/label collision | Effective 3D contract; Advanced Functions at 226×127 and threshold-adjacent widths | Live projection of every supported renderable; final rendered text-footprint bounds; joint search across formula width, corner, and 12/8/4px edge inset; the DOM consumes the exact diagnostic `x/y/w/h`; the scrollable formula and both required projected labels remain visible | Run 31 preserves the original 113×53.34 primary-label collision; Run 44 preserves the real `family-probe` collision; Run 51 preserves the real 0.30-width residual collision. Current source replays resolve Run 31's three captured states to the widest safe width/inset pairs 113px/8px, 101.7px/4px, and 113px/8px; Run 44 resolves to 67.8px/top-left/12px and Run 51 to 79.1px/bottom-right/4px with explicit minimum gaps. Final monitored Run 52 validates the live DOM rectangles, diagnostics, three protected states, visible `active f(x)` and `(x,f(x))`, and zero overlap. |
| Degenerate/off-grid geometry | Triangle/Euler and coordinate transformations | Minimum-area/finite-center gates; preserve raw coordinates and disclose continuation | Exhaustive helper regressions |

## Local source and build gates

| Gate | Result and immutable evidence |
| --- | --- |
| Source identity | Clean worktree at code/test commit `9c2379d902c72ed766c1a86daff9e7830f302dd9`, tree `c43afec4419d1fb70f6682294f90e11f8de350b8`, with `origin/main` `20c8fb983e7f4f6d39b9bbb09f58c64887f2e72b` as an ancestor; `.tmp/a11-final9-20260811/source-identity.status.log` |
| Consolidated changed-area suite | PASS, 394/394; `.tmp/a11-final9-20260811/unit/changed-area/result.status.log`; 2026-08-11 06:27:36Z–06:27:40Z, exit 0; exact HEAD/tree recorded in the log |
| TypeScript strict check | PASS; `.tmp/a11-final9-20260811/unit/typecheck/result.status.log`; 2026-08-11 06:27:40Z–06:28:07Z, exit 0; same exact HEAD/tree |
| Inventory | PASS, counts above and zero failures; `.tmp/a11-final9-20260811/unit/inventory/result.status.log`; 2026-08-11 06:28:07Z–06:28:10Z, exit 0; same exact HEAD/tree |
| Production build | PASS, Next.js 15.5.20, 236/236 pages; `.tmp/a11-final9-20260811/build/result.status.log`; 2026-08-11 06:28:55Z–06:30:02Z, exit 0; same exact HEAD/tree |
| `git diff --check` | PASS on the code/test slice; repeated after the documentation-only evidence update before commit |

The build-generated `next-env.d.ts`, `tsconfig.json`, and `tsconfig.next.json` drift was restored; none is part of this slice.

These gates cover the exact implementation, regression, and inventory tree used by the final rendered audit. This report was refreshed afterward as a documentation-only change; it does not alter the verified product or test tree.

## Final continuously monitored Starship rendered evidence

The final E2E root is:

`/Volumes/Starship/MAIS-diagram-boundary-wt/.tmp/a11-final9-20260811`

All final9 evidence stayed on `/Volumes/Starship`. Every accepted E2E target browser/profile and logged E2E temp, cache, browser, build, database, output, report, trace, screenshot, and service-log path was beneath the named final9 root; the source/type/inventory wrappers and build wrapper used the disclosed Starship-resident sibling TMPDIRs `.tmp/f9t` and `.tmp/f9b`. The wrapper continuously sampled live process arguments, required the target browser executable and `--user-data-dir` beneath final9, rejected any `playwright_chromiumdev_profile-*` outside `/Volumes/Starship`, and failed closed on an unobserved or lingering target profile. From Run 54c onward, the Playwright Node 24.14.0 controller itself was also copied beneath final9 and launched with `--no-concurrent-sparkplug` after two preserved Node/V8 shutdown deadlocks; this changes runner scheduling only, not product or browser assertions.

| Run | Result | Scope |
| --- | --- | --- |
| `52-advanced-functions-webgl-final9` | PASS, 1/1, 2.4m | Focused Advanced Functions live WebGL projection; Run 31/44/51 formula and both visible projected-label states; exact diagnostic/DOM geometry |
| `53-core-angle-canvas-final9` | PASS, 4/4, 3.8s | Reported angle, all semantic angle contracts, body clipping, Canvas 2D probe |
| `54c-ccss-exceptional-final9` | PASS, 1/1, 44.7s | Random, metric cross-product, context menu, modifier, click grid, and drag grid exceptional states |
| `55-standalone-full-final9` | PASS, 1/1, 14.7s | Complete four-route standalone image/SVG/stored-figure/Euler matrix |
| `56-practice-smoke-final9` | PASS, 1/1, 12.5s | Practice figures, counting cards, and resized handwriting |
| `57b-public-assets-final9` | PASS, 1/1, 6.8s | Public SVG and live raster asset containment with the correct `public-asset` surface |
| `58-visualization-fallback-final9` | PASS, 1/1, 1.0m | Functions and original S4 configured Visualization Lab fallback, control extremes, and modes |
| `59-original-s4-lesson-final9` | PASS, 1/1, 4.8m | Reported `us-ca-math-s4-chapter-01` lesson route at phone/desktop across every exposed diagram state |

The final accepted set comprises eight commands and 11 Playwright tests. Every accepted row recorded `observed_target_browser=1`, `outside_starship_profile=0`, `lingering_target_profile=0`, `process_audit_failed=0`, `playwright_exit_code=0`, and final `exit_code=0`. Concurrent browsers from other tasks appeared during some runs, but their profiles were also beneath `/Volumes/Starship`, were recorded as `target=0`, and were never terminated or counted as this task's target.

These are targeted rendered gates, not a claim that every Cartesian combination of 490 lessons, 689 labs, five widths, three languages, and two themes was opened in a browser. Exhaustive breadth comes from the source inventory and finite-state regressions; browser depth concentrates on the reported route, confirmed failures, rendering engines, standalone surfaces, exceptional controls, and phone/desktop endpoints. Run 52 is deliberately a focused Advanced Functions WebGL gate, not a claim that all 78 effective WebGL labs were browser-opened in that run.

## Preserved red and excluded evidence

- **Run 31 (final5) — real product failure.** On an Advanced Functions 226×127 canvas, the original 113×53.34 formula panel collided with the visible primary label `active f(x)` in three reachable states. All four normal corners collided. This result remains red and motivated the adaptive-width fix; it was not overwritten.
- **Run 44 (final7) — real product failure.** The active scene legitimately rendered both `active f(x)` and the moving `family-probe` label `(x,f(x))`; the narrowest then-available 79.1×53.3px panel at the 12px bottom-left placement still overlapped the probe by approximately 6.28×12.56 CSS pixels. This established that projected-label collision must include every active binding, not only the primary label.
- **Run 51 (final8) — real product failure.** Adding a 67.8×53.3px width alone was insufficient at the former 12px bottom-left placement in another reachable 226×127 state: the formula and moving probe still overlapped by approximately 1.30×10.23 CSS pixels. This motivated the joint width/corner/edge-inset search and exact diagnostic-to-DOM coordinate contract; the red result remains preserved.
- **Run 36 (`36-standalone-full-final6`) — real runtime finding, not a diagram-boundary failure.** The California middle-school textbook route emitted one React production hydration recovery error #418. The route still returned 200, rendered all 15 lesson/image assertions, and its final diagram audit had `issues=[]`. Trace timing places the error about 9 ms after DOM content loaded and before test style/audit mutations or the app language effect.
- The same final6 build/browser/canvas probe produced no hydration diagnostic in a three-navigation instrumented probe; exact uninstrumented Run 37 and the complete Run 38 also passed. Because instrumentation changes timing, these results do not erase Run 36. The honest classification is a genuine, timing-sensitive one-off hydration recovery signal with no deterministic owner established; no allowlist, suppression, or speculative product change was added.
- **Run 50 (final8) — rejected environment evidence.** A concurrent browser created a system-temporary Playwright profile; the fail-closed wrapper returned 78. Its assertions cannot count green even if product checks completed.
- **Runs 54 and 54b (final9) — runner shutdown failures, not accepted green.** Both printed `1 passed` and closed the target browser, then Node 24.15.0 deadlocked while joining a V8 concurrent-baseline worker during process shutdown. They were precisely terminated with exit 143 and preserved. Run 54c used the Starship-local Node 24.14.0 runner with concurrent Sparkplug disabled and completed the same product scope naturally with exit 0.
- **Run 57 (final9) — rejected skipped scope.** It requested `lesson,practice,visualization`, so the `public-asset` test skipped and no target browser was observed; the wrapper returned 78. Run 57b used the correct `public-asset` surface and is the accepted 1/1 result.
- **Pre-integration r2 build attempt — harness/process-isolation failure, not product evidence.** `.tmp/a11-preintegration-20260811-r2/build/result.status.log` exited 1 because this task's existing final6 `next-server` PID 64791 was still active. After that exact owned service was stopped, the same recorded source diff built successfully in the new r3 root. The failed attempt remains preserved and is not rewritten as green.
- Earlier runs `06`, `07`, `09`, and `10` exposed stale Mistake fixtures, the Euler drag-label collision, and four-quadrant collisions. Their red artifacts remain evidence.
- Old final3 runs `17`–`23` were functionally green but used a repository-root/default temporary TypeScript path outside their declared named run root. They are excluded from accepted release evidence. Earlier npm/npx/default-temp and non-Starship browser-profile attempts are likewise excluded.

## Manual-review boundary

- File/DOM metadata cannot prove the semantic composition inside a raster bitmap. The gate proves existence, decode, non-zero intrinsic size, containment, and responsiveness; bitmap semantics still require human review.
- Infinite lines, inequalities, and function tails are accepted only when raw geometry remains intact and an explicit plot clip exists.
- The Canvas probe fails closed on paint calls it cannot reconstruct reliably, including unsupported `Path2D` or image-data cases.

## Proof-state separation

| State | Status at this report snapshot |
| --- | --- |
| Local inventory/source/unit/type evidence | Final exact code/test tree green, 394/394 and zero inventory/type failures |
| Clean custom-dist production build | Final exact code/test tree green, 236/236 pages |
| Targeted Starship-only browser evidence | Final continuously monitored Runs 52, 53, 54c, 55, 56, 57b, 58, and 59 green; preserved red/invalid runs remain disclosed |
| Exhaustive every-route browser Cartesian matrix | Not claimed |
| GitHub branch/PR/CI/main | Pending at this local-evidence snapshot |
| Vercel deployment | Not requested and not performed |
| Live `mais.ac` verification of this branch | Not claimed |

A merged Git commit must not be described as deployed or live until a separately authorized deployment and production verification occur.
