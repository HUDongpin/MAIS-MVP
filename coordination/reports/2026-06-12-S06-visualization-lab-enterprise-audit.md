# 2026-06-12 S06 Visualization Lab Enterprise Audit

## Scope

- Session: S06 Visualization Lead.
- Owner objective: make MAIS Visualization Lab run through as an enterprise-grade feature and systematically identify labs that are unplayable or have obvious math, coordinate, or function errors.
- Route audited: `/student/tools/visualizations`, with legacy `/visualization-lab` redirect preserved.
- Catalog size at audit time: 756 labs.

## Runtime Playability Evidence

### Desktop Full Deep-Link Sweep

- Result: 756/756 PASS.
- Variant: desktop deep-link full interaction sweep.
- Time: 2026-06-12T12:26:26.172Z to 2026-06-12T12:39:26.560Z.
- Coverage:
  - Opened every catalog lab via `?track=all&lab={labId}`.
  - Verified stable `#lab-example-{labId}` root.
  - Verified at least one `[data-viz-surface]`.
  - Verified visual marks exist.
  - Checked rendered text and SVG/DOM attributes for `NaN` / `Infinity`.
  - Swept range controls and safe in-lab buttons while skipping navigation/practice/persistence buttons.
- Hard runtime failures found: 0.

### Current-State Desktop Smoke After Mapping Fixes

- Result: 756/756 PASS.
- Variant: desktop current full smoke.
- Coverage: every catalog lab deep-linked after the template-rule changes, checking surface, marks, `NaN` / `Infinity`, invalid numeric attributes, and horizontal overflow.
- Hard runtime failures found: 0.

### Mobile Representative Sweep

- Result: 31/31 PASS.
- Viewport: 390 x 844 mobile.
- Coverage: old P0 rows, coordinate, linear equation, probability/statistics, function, trig, calculus, PEP/BNU/HJB/US samples.
- Hard mobile runtime/layout failures found: 0.

### Changed-Mapping Desktop/Mobile Sweep

- Result: 16/16 desktop PASS and 16/16 mobile PASS.
- Samples included: `integers`, BNU/HJB rational and real numbers, BNU inequalities/factorization/classification, PEP sets/logic and exponential-log functions, US time/money standards, and `p5-rates`.
- Hard runtime failures found: 0.

### Template-Intent Audit and Follow-Up Smoke

- Result: high-confidence hard template-intent suspects: 0.
- Catalog size: 756 labs.
- Static audit buckets cleared:
  - counting/sequence topics incorrectly mapped to function graphs.
  - number-line/rational-number topics incorrectly mapped to algebra balance.
  - coordinate-plane line/circle topics incorrectly mapped to algebra balance.
  - derivative/tangent-line topics incorrectly mapped to trigonometry.
  - paired/bivariate/regression data topics incorrectly mapped away from statistics.
  - triangle/quadrilateral/circle/Pythagorean geometry topics incorrectly mapped to statistics.
  - operation-law/algebraic-fraction topics incorrectly mapped to coordinate transformations.
  - primary consolidation/review topics incorrectly mapped to advanced geometry through the `solid` substring.
  - primary solid/cuboid/cylinder/cone topics incorrectly mapped to advanced geometry strategy maps.
  - time/money/fraction-title topics incorrectly mapped to statistics.
- Targeted browser smoke: 30/30 PASS.
- Viewports: 15 changed-mapping labs x desktop and mobile.
- Coverage: deep-linked each lab, verified `#lab-example-{labId}`, `[data-viz-surface]`, `[data-viz-mark]`, no `NaN` / `Infinity` text or SVG/DOM attributes, swept first two range controls through min/max/mid, and checked mobile horizontal overflow.
- Hard runtime failures found: 0.

### Function/Trig/Calculus Math-State Consistency

- Result: 6/6 PASS.
- Viewports: desktop and mobile.
- Samples:
  - `pep-high-s4-exp-log` for `function-family`.
  - `pep-high-s4-trigonometry` for `trig-unit-wave`.
  - `pep-high-s5-derivatives` for `calculus-rate-area`.
- Coverage:
  - Verified function sample point now uses the same function model as the rendered curve.
  - Verified trigonometry angle, phase, amplitude, unit-circle radius, projection line, and sine wave use the same theta/amplitude state.
  - Verified calculus curve, tangent/secant slope, probe point, and area strips use a single quadratic model.
  - Verified no `NaN` / `Infinity`, no invalid SVG attributes, no missing surfaces/marks, and no mobile horizontal overflow.
- Static invariant check: 243 value/comparison/mode combinations passed for function sample points, trigonometric state, calculus slope, and positive area-strip dimensions.
- Hard function/trig/calculus state failures found: 0.

### Advanced Geometry Vector/Conic/3D Math-State Consistency

- Result: 2/2 PASS.
- Viewports: desktop and mobile.
- Sample: `capstone-hk-mainland-crosswalk-explorer` for `vector-conic-3d/strategy-map`.
- Coverage:
  - Verified vector mode uses exact x/y components, endpoint coordinates, magnitude, and matching slider display values.
  - Verified conic mode renders an ellipse with ordered semi-major/semi-minor axes, two foci, and `c^2 = a^2 - b^2` consistency.
  - Verified 3D mode renders a cuboid with positive width/height/depth units and exact `V = width x height x depth` volume.
  - Swept range controls to extreme values and switched through Vector, Conic, and 3D modes on desktop and mobile.
  - Verified no `NaN` / `Infinity`, no missing surfaces/marks, and no fatal browser runtime errors; expected guest `/api/me` 401 noise was ignored.
- Static invariant check: 243 value/comparison/mode combinations passed for vector frame bounds, ellipse axis/focus math, and cuboid bounds/volume.
- Hard advanced-geometry state failures found: 0.

### Core Configured Template Exactness Sweep

- Result: 22/22 PASS.
- Viewports: desktop and mobile.
- Samples:
  - `p4-large-numbers` for `number-line`.
  - `bnu-primary-p1-lower-within-100-number-sense` for `base-ten`.
  - `p3-multiplication-division` for `array-area`.
  - `p6-ratio-proportion` for `fraction-bar`.
  - `p1-measurement-time` for `clock-money-data`.
  - `p3-measurement` for `measurement-scale`.
  - `circles` for `angle-geometry`.
  - `pep-junior-s1-lower-lines-coordinates` for `coordinate-transform`.
  - `algebra-basics` for `equation-balance`.
  - `probability-s5` for `probability-simulation`.
  - `statistics-s1` for `statistics-distribution`.
- Coverage:
  - Verified number-line start/end/step consistency.
  - Verified base-ten `10 * tens + ones` total.
  - Verified array `columns x rows = area`.
  - Verified fraction/equivalent-fraction equality and part-whole bounds.
  - Verified clock hand geometry and minute values.
  - Verified measurement object width equals unit count.
  - Verified angle degree and difference attributes.
  - Verified coordinate transform translate/reflect/dilate modes stay inside the panel with finite coordinates.
  - Verified equation-balance difference equals left minus right.
  - Verified probability `success / trials` and statistics mean/spread attributes.
  - Verified no `NaN` / `Infinity`, no invalid SVG attributes, no missing marks/surfaces, and no fatal browser runtime errors.
- Static invariant check: 2,430 value/comparison/mode checks passed across number-line, base-ten, array-area, fraction-bar, clock-money-data, measurement-scale, angle-geometry, coordinate-transform, probability-simulation, and statistics-distribution.
- Hard core-template state failures found: 0.

### Legacy Function Graph Boundary and Coordinate Consistency

- Result: 4/4 PASS.
- Viewports: desktop and mobile.
- Samples:
  - `quadratic-patterns` for `FunctionGraphExplorer`.
  - `functions` for `FunctionModelComparer`.
- Coverage:
  - Pushed the quadratic graph to an off-scale vertex case and verified the visible vertex marker stays inside the graph frame while preserving true vertex coordinates in `data-viz-x` / `data-viz-y`.
  - Pushed the function model comparer to an off-scale exponential sample point and verified the visible point/path stay inside the graph frame while preserving true mathematical sample value in `data-viz-y`.
  - Verified rendered paths contain no `NaN` / `Infinity` and no y-coordinates outside the graph frame.
- Static invariant check: 32,037 graph/path/point boundary checks passed across quadratic coefficients and polynomial/exponential/logarithmic model settings.
- Hard legacy function graph failures found: 0.

### Legacy Probability / Trigonometry / Calculus Exactness

- Result: 10/10 browser checks PASS.
- Viewports: desktop and mobile.
- Samples:
  - `p5-charts-averages` for chart mean consistency.
  - `probability-s2` for dice frequency and theoretical/experimental even probability.
  - `trigonometry-s5` for sine amplitude/period/phase and sample-point coordinates.
  - `calculus` for cubic tangent point, derivative slope, and graph-frame clipping.
  - `statistics-s6` for normal-distribution z-score and relative-density semantics.
- Coverage:
  - Added machine-readable `data-viz-*` attributes for chart bars, mean line, dice outcome bars, last roll, probability summary, sine wave state, sample point/projection, cubic curve, tangent line, tangent point, normal curve, and observed z marker.
  - Verified the chart mean equals `sum(values) / count` after slider changes.
  - Verified dice bar counts sum to total rolls, `P(even)` equals even counts divided by total rolls, and theoretical `P(even)` remains `0.5`.
  - Verified sine sample `y = A sin(2*pi*(x-phase)/period)` under extreme slider values.
  - Clipped the visible calculus curve/tangent to the graph frame while preserving true tangent point, derivative slope, and unclipped line-end values in attributes.
  - Renamed the normal curve y-axis semantics to relative density and exposed both relative density and true pdf at the observed value.
- Static invariant check: 6,504 checks passed across extreme trig parameters, tangent-line clipping, normal z-score/pdf formulas, and probability frequency bounds.
- Hard legacy probability/trig/calculus failures found: 0.

### Geometry Exactness and Audit Instrumentation

- Result: 10/10 browser checks PASS.
- Viewports: desktop and mobile.
- Samples:
  - `p3-fractions-intro` for numerator/denominator/segment shading.
  - `p4-angles` for degree value, angle type, and rotating-ray endpoint.
  - `p4-perimeter-area` for grid area, perimeter, and outline size.
  - `p5-volume` for unit-cube count and volume.
  - `angles` for draggable triangle side lengths, area, perimeter, vertex bounds, and 180-degree angle sum.
- Coverage:
  - Added exact attributes to primary shape patterns, array counters, length bars, fraction bars/segments, mirror-line geometry, growing right-angle paths, angle rays/arcs, area unit squares, perimeter outline, and unit cubes.
  - Added triangle polygon attributes for vertex coordinates, side lengths, perimeter, area, individual angles, and angle sum.
  - Added vertex attributes for draggable triangle points so future S11 tests can verify drag bounds and geometry updates.
  - Verified fraction values, angle endpoints, area/perimeter formulas, cuboid volume, and triangle angle sum in real browser routes.
- Static invariant check: 663 checks passed across primary geometry formulas, angle classification, mirror symmetry, volume, and triangle geometry.
- Hard geometry failures found: 0.

### Coordinate Plane and Guest Exploration Persistence

- Result: 14/14 browser checks PASS.
- Viewports: desktop and mobile.
- Samples:
  - `p1-counting-number-bonds` for number-bond counters and guest save.
  - `p1-addition-subtraction` for addition/subtraction jumps on a 0-10 number line.
  - `p2-place-value` for hundreds/tens/ones.
  - `p4-decimals` for decimal marker placement.
  - `p6-speed` for speed-distance-time graph scaling.
  - `coordinates` for coordinate transforms and clipped visible points.
- Issues found and fixed:
  - `p1-addition-subtraction` could render a subtraction endpoint outside the 0-10 number line when jump size exceeded the current start. The lab now clamps `start` and `jump` together and exposes `start`, `jump`, `end`, operation, and expression attributes.
  - `p6-speed` could render the maximum `6 km/h * 6 h = 36 km` point above a graph whose y-axis stopped at 30 km. The graph now expands its y-axis to 40 km for that case and exposes `distance` and `y-axis-max` attributes.
  - Coordinate transforms could move already-plotted edge points outside the coordinate frame. Visible points and paths are now clipped to the frame while true transformed coordinates remain available in `data-viz-*`.
  - Guest users could click the exploration completion button and receive a save error because the server persistence route is authenticated. Guest exploration now saves locally in `localStorage` and the card exposes `data-viz-save-state`.
- Coverage:
  - Added exact attributes for number-bond counters, number-line jumps, place-value blocks, decimal markers, speed graph points, transformed coordinate points, selected coordinates, and exploration cards.
  - Verified guest local save, number-bond sums, number-line bounds, place-value totals, decimal marker position, speed graph bounds, and coordinate transform clipping in real browser routes.
- Static invariant check: 977 checks passed across number-line bounds, speed y-axis scaling, coordinate transform clipping, number-bond sums, and place-value ranges.
- Hard coordinate-plane / guest persistence failures found after fixes: 0.

## High-Confidence Math/Template Fixes

Fixed in `data/visualizationLabs.ts`:

- Prevented `line` from matching `linear`, which had pushed `linear-equations` into the advanced geometry strategy template.
- Prevented `data` from matching `metadata`, which had incorrectly sent many US standard strands to statistics.
- Prevented `position` from matching `proposition`, which incorrectly sent sets/logic to coordinate transformations.
- Moved function-specific detection before generic coordinate/transform detection, fixing exponential/logarithmic function labs.
- Moved inequality-specific detection before generic function detection, fixing inequalities and systems of inequalities.
- Kept vector/conic topics protected as advanced geometry before equation fallback.
- Added factorization as algebra/equation template content.
- Added classification/sorting as statistics/data content.
- Moved time/money detection before generic geometry/measurement, and added coins/dollars/pennies/dimes.
- Prevented `ratio` from matching `operations`, fixing integer/rational-number topics that should remain number-line based.
- Prevented English `unit` from matching textbook unit/chapter descriptions, while keeping real measurement keywords.
- Added word-boundary `rate` / `rates` for measurement labs without matching `generated`.
- Included Chinese title/description text in template intent matching so simplified/traditional topic names contribute to routing.
- Added word-boundary protection for `solid`, preventing `consolidation` / `consolidates` from being misread as solid geometry.
- Moved derivative/calculus detection ahead of the trigonometric `tangent` cue.
- Added title-priority rules for counting sequences, coordinate-plane lines/circles, circle geometry, Pythagorean/quadrilateral geometry, primary solid geometry, multiplication/division equal-groups, and fraction titles.
- Kept algebraic fractions and fractional equations on algebra/equation templates instead of sending them to generic fraction bars.

Fixed in `components/visualizations/ConfiguredVisualizationLab.tsx`:

- Reused one function-point calculation for both rendered curves and the highlighted sample point so the point is actually on the function graph.
- Made `trig-unit-wave` use a single `theta` / amplitude state for the unit-circle radius, sine projection, and sine wave.
- Changed trigonometry controls from generic phase integers to `0 phase`, `+45 deg`, `+90 deg`, `Angle theta`, and `Amplitude A`, with live `y = A sin(x + theta)` feedback.
- Rebuilt `calculus-rate-area` around one quadratic model, with exact tangent/secant slope attributes, a probe point, and positive area-strip heights.
- Added calculus-specific controls and live formula feedback for `f(x)`, probe `x`, and `f'(x)`.
- Added an `advancedGeometryState` model for the `vector-conic-3d/strategy-map` configured template.
- Replaced the generic strategy-network fallback with exact vector-component, ellipse/foci, and cuboid-volume modes.
- Made advanced-geometry slider badges show the mathematical display values actually being rendered: x/y components, semi-axes, and width/height/depth units.
- Added exact state models for core configured templates:
  - number-line start/end/step;
  - base-ten tens/ones/total;
  - array columns/rows/area;
  - fraction numerator/denominator and equivalent fraction;
  - clock hour/minute hand geometry;
  - measurement unit widths;
  - angle degrees and differences;
  - coordinate translate/reflect/dilate transformations;
  - equation-balance difference/status;
  - probability success/trials/probability;
  - statistics mean/spread.
- Updated control labels and slider badges where raw 1-9 slider positions differed from the rendered mathematical value.
- Clamped legacy function graph paths and key visible markers to the graph frame while keeping true off-scale mathematical coordinates in machine-readable attributes.

Representative corrected mappings:

| Lab | Corrected Template |
| --- | --- |
| `linear-equations` | `equation-balance` |
| `pep-high-s4-sets-logic` | `equation-balance` |
| `pep-high-s4-exp-log` | `function-family` |
| `bnu-junior-s1-upper-linear-equations` | `equation-balance` |
| `bnu-junior-s2-lower-inequalities-systems` | `equation-balance` |
| `bnu-junior-s2-lower-factorization` | `equation-balance` |
| `bnu-primary-p1-upper-classification` | `statistics-distribution` |
| `integers` | `number-line` |
| `bnu-junior-s1-upper-rational-numbers` | `number-line` |
| `hjb-high-s6-数列与计数综合` | `function-family` |
| `us-ar-math-k-gm-7` | `clock-money-data` |
| `us-ar-math-k-gm-8` | `clock-money-data` |
| `p5-rates` | `measurement-scale` |
| `p3-multiplication-division` | `array-area` |
| `pep-primary-p1-upper-shapes-position-time` | `clock-money-data` |
| `pep-junior-s1-upper-rational-numbers` | `number-line` |
| `pep-high-s5-lines-circles` | `coordinate-transform` |
| `bnu-junior-s3-lower-circle` | `angle-geometry` |
| `bnu-primary-p4-upper-operation-laws` | `equation-balance` |
| `bnu-primary-p5-upper-polygon-area` | `angle-geometry` |
| `bnu-primary-p6-upper-circles` | `angle-geometry` |
| `hjb-high-s5-平面直角坐标系中的直线` | `coordinate-transform` |
| `hjb-high-s6-成对数据的统计分析` | `statistics-distribution` |
| `us-ar-math-k-npv-1` | `number-line` |
| `us-ca-math-g5-unit-05-fraction-division-ideas` | `fraction-bar` |
| `us-ca-math-g5-unit-06-volume-by-layers` | `array-area` |
| `pep-high-s5-derivatives` | `calculus-rate-area` |
| `us-ar-math-g10-chapter-03-circle-geometry` | `angle-geometry` |

## Full Current-State Browser Sweep

Completed a full desktop deep-link smoke sweep against the current app state on port `3033`.

- Route pattern: `/student/tools/visualizations?lab={labId}`.
- Catalog coverage: 756/756 exported Visualization Labs.
- Result: 756/756 PASS.
- Failures: 0.
- Warnings: 0.
- Elapsed time: 1602 seconds.
- Expected unauthenticated noise: `/api/me` 401 only.
- Checks performed per lab:
  - waited for the exact `data-viz-card[data-viz-topic-id="{topicId}"]`;
  - waited for a visible `[data-viz-surface]`;
  - required at least one `[data-viz-mark]`;
  - scanned visible text and `data-viz-*` attributes for `NaN`, `Infinity`, `-Infinity`, and `undefined`;
  - checked SVG/HTML mark bounding boxes for large off-frame coordinate warnings.

Module coverage from the full sweep:

| Module | Labs |
| --- | ---: |
| `configured-visualization-lab` | 727 |
| `geometry-explorer` | 10 |
| `coordinate-plane-demo` | 9 |
| `function-model-comparer` | 3 |
| `calculus-stats-lab` | 3 |
| `probability-simulator` | 2 |
| `function-graph-explorer` | 1 |
| `trig-wave-explorer` | 1 |

Template coverage from the full sweep:

| Template | Labs |
| --- | ---: |
| `angle-geometry` | 119 |
| `number-line` | 97 |
| `array-area` | 80 |
| `fraction-bar` | 71 |
| `statistics-distribution` | 65 |
| `function-family` | 56 |
| `base-ten` | 50 |
| `clock-money-data` | 42 |
| `equation-balance` | 42 |
| `coordinate-transform` | 39 |
| `probability-simulation` | 26 |
| `trig-unit-wave` | 20 |
| `calculus-rate-area` | 16 |
| `vector-conic-3d/strategy-map` | 15 |
| `measurement-scale` | 15 |
| `complex-plane` | 3 |

## Extreme-State Math Fixes After Full Sweep

The full sweep proved default-state playability. A follow-up slider-extreme audit found and fixed two mathematical rendering issues that were not visible in default deep-link smoke:

- `complex-plane` configured labs:
  - Issue: the real/imaginary sliders allow values up to 9, but the previous equal scale placed high-imaginary points and the modulus circle outside the visible coordinate frame. The worst case `9 + 9i` placed the point at y = 28 and the modulus circle radius at 229.1 SVG units.
  - Fix: moved the complex plane to a shared equal scale of 8 SVG units per mathematical unit so all slider states keep the complex point and modulus circle inside the visible frame while preserving equal x/y units.
  - QA attributes added: `data-viz-real`, `data-viz-imaginary`, `data-viz-modulus`, and `data-viz-scale` on the modulus circle; real/imaginary attributes on the complex vector and point.
  - Static audit: all 81 real/imaginary combinations from 1..9 now keep the complex point and modulus circle in frame.
  - Browser audit: `pep-high-s4-complex-numbers` at `9 + 9i` rendered point `(392,118)`, modulus radius `101.823`, scale `8`, and passed in-frame checks.
- `calculus-rate-area` configured labs:
  - Issue: the area-strip model forced a minimum mathematical strip width of 0.3. For left-side probes this over-drew area beyond the real interval; at comparison = 1 the intended right endpoint was `-3.2`, but strips covered to about `-1.2`.
  - Fix: strip width now exactly partitions `[areaLeft, areaRight]`; only the SVG pixel width has a tiny visual minimum.
  - QA attributes added: `data-viz-left`, `data-viz-right`, `data-viz-midpoint`, and `data-viz-height` on each area strip.
  - Static audit: all comparison slider states 1..9 now end exactly at the true `areaRight`.
  - Browser audit: `pep-high-s5-derivatives` with comparison = 1 rendered 8 strips from `-3.6` to `-3.2`, with no NaN/Infinity text and no non-401 console errors.

## Function And Transform Scale Fixes

A second follow-up audit checked whether configured templates used the same mathematical coordinates for their grid labels and rendered marks.

- `function-family` configured labs:
  - Issue: the rendered curve used x-domain `[-2.5, 2.5]` and y-scale `12`, while the grid labels used x-domain `[-5, 5]` and y-scale `28`. The graph was playable but the coordinate reading was mathematically inconsistent.
  - Red audit result: `function-x-scale-mismatch` and `function-y-scale-mismatch` both failed before the fix.
  - Fix: introduced a shared configured-function frame and reused it for curve points, grid ticks, and QA attributes.
  - The function grid now labels `x = -2.5, -2, -1, 0, 1, 2, 2.5` and uses the same `xScale = 99.2`, `yScale = 12` used by the curve.
  - The main function path exposes `data-viz-x-min`, `data-viz-x-max`, `data-viz-x-scale`, and `data-viz-y-scale`.
  - The sample point exposes true `data-viz-x`, `data-viz-y`, and `data-viz-clipped`.
  - The logarithmic-growth formula text now uses the visible x-domain: `5 ln(k(x + 2.5) + 1)` instead of an unexplained `t`.
  - Browser audit: `pep-high-s4-exp-log` passed with sample point `(x=0, y=-1)` mapped to `(cx=320, cy=228)` using `xScale=99.2`, `yScale=12`.
- `coordinate-transform` configured labs:
  - Issue: 106 slider/mode combinations could place transformed triangle points below the current visible y-frame, especially translate/dilate states with `dy = -3`.
  - Red audit result: first failing state was `value=1`, `comparison=1`, `mode=translate`, transformed point `(-6, -3.75)` mapping to `svgY = 305`.
  - Fix: introduced a shared coordinate-transform frame and changed the y-scale to `21`, covering every translate, reflect, and dilate state produced by sliders 1..9 while preserving the x-scale.
  - Reflection-line rendering now uses the same shared `state.scale.x` instead of a hard-coded `32`.
  - Static audit: all 243 value/comparison/mode combinations now stay inside the visible y-frame.
  - Browser audit: `bnu-junior-s2-lower-transformations` with `dx=-4`, `dy=-3` rendered transformed triangle points `128,278.75 160,244.1 224,278.75`, all inside the frame.

## Count-Exact Manipulative Fixes

A third follow-up audit checked whether concrete manipulatives show the same counts as their mathematical readouts at slider extremes.

- `equation-balance` configured labs:
  - Issue: visual token counts were clamped to 2..8 while the left/right mathematical values were 1..9. This made value 1 draw 2 tokens and value 9 draw only 8 tokens.
  - Red audit result: four failures, covering left = 1, left = 9, right = 1, and right = 9.
  - Fix: token rendering now uses exact counts 1..9. Tokens also expose `data-viz-side` and `data-viz-token-index`.
  - Static audit: all left/right values 1..9 now render exact token counts.
  - Browser audit: `linear-equations` passed at `(left,right)=(1,9)` and `(9,1)`, with token counts matching the `data-viz-left` and `data-viz-right` beam values.
- `array-area` configured labs:
  - Issue: rows/columns were clamped to 2..9 while sliders and readouts allow 1..9. This made `1 x n` or `n x 1` arrays visually incorrect.
  - Red audit result: two failures, columns = 1 and rows = 1.
  - Fix: row/column state now uses exact values 1..9.
  - Static audit: all row/column values 1..9 now match rendered state.
  - Browser audit: `pep-primary-p2-upper-multiplication-arrays` passed at `1 x 1`, rendering one cell with `data-viz-columns=1`, `data-viz-rows=1`, and `data-viz-area=1`.

## Remaining Review Queue

No currently detected hard runtime-unplayable labs remain under the probes above.

Remaining work is curriculum/math-signoff rather than browser playability:

- Multi-domain review/capstone labs such as `exam-revision`, `mixed-problem-solving`, and broad review/integration rows still need S18 judgment because one generic template cannot prove exact topic fit.
- Mixed primary review rows such as `bnu-primary-p3-lower-math-play-review` remain curriculum-choice items rather than hard runtime failures; their descriptions intentionally span division, transformations, mass, area, fractions, and data.
- Dual-domain rows such as `p2-length-data` remain acceptable but should be reviewed if S18 wants measurement-first instead of statistics-first modeling.
- Probability/statistics overlap rows such as random variables, distributions, and synthesis topics need S18 to decide whether `probability-simulation` or `statistics-distribution` is the preferred learning model.
- Configured templates now have stronger internal math-state consistency across the main primary, algebra, geometry, coordinate, probability, statistics, calculus, trigonometry, complex-plane, and advanced-geometry surfaces.
- Legacy quadratic and model-comparison graphs now keep curves/key points visible under extreme controls without losing the underlying function values.
- Remaining S18/S24 review is about topic-specific theorem/model fit and exact-layer textbook alignment, not currently detected template-level runtime or basic formula correctness.
- Existing S11/S18 Playwright artifacts should be updated from the old all-cards-expanded assumption to deep-linked per-lab routes using `data-viz-lab-tile` and `#lab-example-{labId}`.

## Verification Notes

- Final full-current-state browser sweep: 756/756 labs passed, 0 failures, 0 warnings.
- Follow-up extreme-state audits fixed complex-plane coordinate scaling and calculus area-strip interval accuracy.
- Follow-up coordinate-scale audits fixed configured function graph grid/curve scale consistency and configured coordinate-transform y-frame bounds.
- Follow-up count-exact manipulative audits fixed equation-balance token counts and array-area 1-row/1-column states.
- Guest `/api/me` 401 responses occurred during browser sweeps and were treated as expected unauthenticated-session noise.
- Dev server on `3033` was stopped after the full sweep; `lsof -iTCP:3033 -sTCP:LISTEN` returned no listener.
- The temporary Next dev include `.tmp/viz-next-3033/types/**/*.ts` was removed from `tsconfig.next.json` after the run.
- No secrets were read or printed.
- No git staging, committing, branching, pushing, reset, or deletion was performed.
