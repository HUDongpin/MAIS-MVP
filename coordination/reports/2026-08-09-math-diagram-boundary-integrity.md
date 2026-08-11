# Mathematical Diagram Boundary Integrity Audit

- Audit window: 2026-08-09 to 2026-08-11
- Owner lane: A11 QA, coordinating A04 Practice, A05 Lessons, A06 Visualization Lab, A18 curriculum QA, A22 release engineering, and A25 release intake
- Initial audit baseline / PR #120 merge: `3f8f12c4d3fd2efe938d1b07cab6289315f108dd`
- Pre-release integration baseline / merge-base with the last fetched `origin/main`: `c69a949cf22b03372ac475af6b0366604b896638`
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
- The rebuilt route passed at `phone-320` and `desktop-1440` for `precise-definitions`, `constructions`, and every exposed diagram state.

## Confirmed repair classes

| Class | Representative surfaces | Implemented repair | Evidence |
| --- | --- | --- | --- |
| Semantic angle / paint overrun | Precise Definitions, congruence, right-triangle, unit-circle, sector/fraction angles, Worked Examples, Practice figures, configured labs | Exact ray/arc geometry, two-arc full turns, machine-readable contracts, actual path sampling, butt caps, paint-order assertions | 16/16 source contracts; Run 39 4/4; Run 35 original-route pass |
| Construction-arc clipping | Perpendicular-bisector construction | Exact compass arcs terminate at the in-frame intersections instead of clipped full circles | Source contract and Run 35 |
| Shared mobile clipping and page min-content | CCSS `Figure`/`FigureScroll`, fixed HTML/SVG lessons, Practice shell, navigation | Removed blanket clipping; bounded reachable scrolling; `min-w-0` and responsive reflow | 393/393 source/component suite; earlier Runs 34, 35, 38 |
| SVG/viewBox gutters | Place value, area/perimeter, mass/volume, clocks, circles, triangles, prisms, proof canvases | Expanded/dynamic frames, inset axes/labels, painted-stroke gutters | Enumerated source regressions |
| Honest plot geometry | Functions, residuals, systems, inequalities, conics, slope explorer | Raw mathematical geometry plus plot-scoped clips or edge indicators; no false plateaus | Source regressions and Run 40 |
| Static/dynamic annotation layout | Elementary exact scenes, coordinate/probability/statistics/trig labels, proof readouts | Dedicated lanes, footprint-aware anchors, wrapping, de-duplication, coincident-label grouping | 393/393 and targeted rendered evidence |
| Four-quadrant endpoints and self-reflection | Legal coordinates at `±6`, axes, origin, and reflection states | Flip endpoint labels inward; move quadrant labels around text/markers; render a point on the selected axis only once and state that it is unchanged | All 338 point/axis/reflection states, including 26 self-reflections; focused Run 33 and full Run 34 |
| Euler drag collision | Vertex labels versus O/G/H/N dots and labels | Joint candidate placement around all vertex halos, center dots, and previously placed labels | Exact replays through C=`(480,150)`, `(243.5,328)`, and `(414,310)`, plus more than 2,000 reachable source states; earlier Run 38 |
| Practice figures and handwriting | Graphs, ten-frames, counting cards, stored mistakes, resized handwriting | Unique plot clips, responsive frames, durable stored-figure context, logical-size stroke rescaling | Focused tests and Run 38 |
| Canvas requested-paint overflow | Counting, Comparing, Canvas-backed labs | Transform/DPR-aware pre-paint probe, analytic Bézier extrema, compositor classification, explicit blank policy | 393/393 and earlier Run 39 |
| SVG painted effects | Marker/filter/mask diagrams | Actual local marker and filter bounds; unsupported effects fail closed | Synthetic and rendered gates |
| WebGL projection and formula/label collision | Effective 3D contract; Advanced Functions at 226×127 and threshold-adjacent widths | Live projection of every supported renderable; final text-footprint bounds; formula panel retries progressively narrower widths and keeps the widest safe scrollable panel on both sides of the 480px threshold | Run 31's captured coordinates reproduce the 113×53.34 collision and resolve to a 90.4×53.34 top-right helper placement; 480/481/500px helpers stay safe. In final6 live Run 32 the label had already reflowed, so the widest safe live panel remained 113×53.328 at top-left; that separate rendered result also passed. |
| Degenerate/off-grid geometry | Triangle/Euler and coordinate transformations | Minimum-area/finite-center gates; preserve raw coordinates and disclose continuation | Exhaustive helper regressions |

## Local source and build gates

| Gate | Result and immutable evidence |
| --- | --- |
| Consolidated changed-area suite | PASS, 393/393; `.tmp/a11-preintegration-20260811-r4/unit/changed-area/result.status.log`; 2026-08-11 05:19:30Z–05:19:35Z; recorded source diff `c735266ddc5d23a0b99ec2c27eb0d9a261601f88099a7382f043b6050c50e611` |
| TypeScript strict check | PASS; `.tmp/a11-preintegration-20260811-r4/unit/typecheck/result.status.log`; 2026-08-11 05:19:27Z–05:19:57Z, exit 0; same recorded source diff |
| Inventory | PASS, counts above and zero failures; `.tmp/a11-preintegration-20260811-r4/unit/inventory/result.status.log`; 2026-08-11 05:19:20Z–05:19:23Z, exit 0; same recorded source diff |
| Production build | PASS, Next.js 15.5.20, 236/236 pages; `.tmp/a11-preintegration-20260811-r4/build/result.status.log`; 2026-08-11 05:20:18Z–05:21:31Z, exit 0; same recorded source diff |
| `git diff --check` | PASS on the pre-integration slice; must be repeated after integration and final evidence edits |

The build-generated `next-env.d.ts`, `tsconfig.json`, and `tsconfig.next.json` drift was restored; none is part of this slice.

These pre-integration checks cover the current implementation, regression, and inventory content. The evidence prose itself was refreshed afterward; a new exact-commit gate remains required after integrating the latest `origin/main`.

## Earlier targeted rendered evidence (not the final integration gate)

The earlier targeted E2E used this named root:

`/Volumes/Starship/MAIS-diagram-boundary-wt/.tmp/final6`

Controllable paths were explicitly bound beneath it:

- runtime temp: `.tmp/final6/tmp`
- Node/npm/XDG caches: `.tmp/final6/cache`
- Playwright browser cache: `.tmp/final6/ms-playwright`
- production build: `.tmp/final6/build-next`
- service log: `.tmp/final6/service/service.status.log`
- test database: `.tmp/final6/db/hk-math-db.sqlite`
- output/report/trace/screenshots: `.tmp/final6/playwright/<run-name>`

Run 32 additionally captured the actual target process while it was live. The Playwright API resolved `.tmp/final6/ms-playwright/chromium-1217/.../Google Chrome for Testing`, while the launched process was `.tmp/final6/ms-playwright/chromium_headless_shell-1217/.../chrome-headless-shell` with `--user-data-dir=.tmp/final6/tmp/playwright_chromiumdev_profile-EmtTOP`; both actual paths were beneath Starship. Runs 33–40 bound all controllable paths to `final6` and checked for non-Starship profiles before and after each command, but did not continuously capture the browser process while it was alive. They therefore remain useful product evidence but cannot serve as the final Starship-only release gate. The post-integration wrapper must monitor every run while it executes, record the actual executable and `--user-data-dir`, and fail if any browser profile or controllable artifact leaves its named Starship root. npm/npx defaults, `/var/folders/...` profiles, system-volume caches, or artifacts outside that root cannot count green.

| Run | Result | Scope |
| --- | --- | --- |
| `32-webgl-projection-focused-final6` | INTERMEDIATE PASS, 1/1, 3.1m | Focused Advanced Functions WebGL projection and narrow formula/label states; includes live Starship process capture |
| `33-four-quadrant-endpoints-final6` | INTERMEDIATE PASS, 1/1, 11.1s | Focused endpoint/axis/origin/self-reflection replay |
| `34-ccss-exceptional-final6` | INTERMEDIATE PASS, 1/1, 46.9s | Random, metric cross-product, context menu, modifier, click grid, drag grid |
| `35-original-route-final6` | INTERMEDIATE PASS, 1/1, 5.7m | Original S4 route at phone/desktop across exposed states |
| `37-california-hydration-reproduction-final6` | INTERMEDIATE PASS, 1/1, 7.4s | Exact California standalone route reproduction after Run 36 |
| `38-standalone-full-reproduction-final6` | INTERMEDIATE PASS, 1/1, 15.3s | Complete four-route standalone matrix |
| `39-core-angle-and-canvas-final6` | INTERMEDIATE PASS, 4/4, 4.7s | Reported angle, all semantic angles, body clipping, Canvas probe |
| `40-visualization-fallback-final6` | INTERMEDIATE PASS, 1/1, 59.7s | Functions and original S4 visualization surfaces |

These are targeted rendered gates, not a claim that every Cartesian combination of 490 lessons, 689 labs, five widths, three languages, and two themes was opened in a browser. Exhaustive breadth comes from the source inventory and finite-state regressions; browser depth concentrates on the reported route, confirmed failures, rendering engines, standalone surfaces, exceptional controls, and phone/desktop endpoints.

## Preserved red and excluded evidence

- **Run 31 (final5) — real product failure.** On an Advanced Functions 226×127 canvas, the original 113×53.34 formula panel collided with the visible primary label `active f(x)` in three reachable states. All four normal corners collided. This result remains red and motivated the adaptive-width fix; it was not overwritten.
- **Run 36 (`36-standalone-full-final6`) — real runtime finding, not a diagram-boundary failure.** The California middle-school textbook route emitted one React production hydration recovery error #418. The route still returned 200, rendered all 15 lesson/image assertions, and its final diagram audit had `issues=[]`. Trace timing places the error about 9 ms after DOM content loaded and before test style/audit mutations or the app language effect.
- The same final6 build/browser/canvas probe produced no hydration diagnostic in a three-navigation instrumented probe; exact uninstrumented Run 37 and the complete Run 38 also passed. Because instrumentation changes timing, these results do not erase Run 36. The honest classification is a genuine, timing-sensitive one-off hydration recovery signal with no deterministic owner established; no allowlist, suppression, or speculative product change was added.
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
| Local inventory/source/unit/type evidence | Pre-integration green, 393/393 and zero inventory/type failures |
| Clean custom-dist production build | Green, 236/236 pages |
| Targeted Starship-only browser evidence | Earlier targeted runs passed and Run 36 remains disclosed; final continuously monitored post-integration gate pending |
| Exhaustive every-route browser Cartesian matrix | Not claimed |
| GitHub branch/PR/CI/main | Pending at this local-evidence snapshot |
| Vercel deployment | Not requested and not performed |
| Live `mais.ac` verification of this branch | Not claimed |

A merged Git commit must not be described as deployed or live until a separately authorized deployment and production verification occur.
