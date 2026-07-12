# S11 Live Visualization Lab Bug Check

- Date: 2026-06-20 12:35 HKT
- Session: S11 QA and release quality lead
- Consuming owner: S06 Visualization lead
- Production target: `https://www.mais.hk`
- Attachment reviewed: `Weekly Deliverables and Reporting_Template 6_16-6_19.docx`
- Evidence artifacts: `coordination/reports/2026-06-20-s11-live-viz-lab-bug-check-artifacts/`

## Scope

S11 dynamically checked whether the production site still shows the three reported Visualization Lab issues:

1. Tangent Gradient panel: x/y scale numbers not shown.
2. Differentiation Intro / Calculus graph: equation curve or graph point does not fit within the graph scale.
3. Complex Numbers lab: imaginary part can cross outside the graphing scale.

No feature code, tests, config, secrets, branches, staging, commits, pushes, resets, deletes, or reverts were performed.

## Routes Covered

- `https://www.mais.hk/lesson/calculus`
- `https://www.mais.hk/visualization-lab`
- Production `/visualization-lab` flow: `Explore all labs` -> `S6`
- Target DOM roots:
  - `lab-example-differentiation-intro`
  - `lab-example-calculus`
  - `lab-example-pep-high-s4-complex-numbers`
  - `lab-example-bnu-high-s4-复数`
  - `lab-example-hjb-high-s4-复数`

Route note for S22/S06: production `https://www.mais.hk/student/tools/visualizations` returned 404 during this check, while `https://www.mais.hk/visualization-lab` is the live navigation route. Query parameters on `/visualization-lab` did not reliably deep-link to a target lab; S11 used the production UI controls instead.

## Findings

### 1. Tangent Gradient Axis Tick Labels

Status: Reproduced on production.

Evidence:

- `https://www.mais.hk/lesson/calculus` tangent SVG text nodes: `["f'(2) = 0.04"]`
- Numeric axis tick text count: `0`
- Same result on `lab-example-differentiation-intro` and `lab-example-calculus` across default, min, and max slider states.
- Screenshot: `www-mais-hk-lesson-calculus.png`

Conclusion: The production Tangent/Calculus panel still lacks x/y numeric scale labels.

### 2. Differentiation / Calculus Curve Bounds

Status: Reproduced on production.

Evidence:

- Checked frame: `[x=42..598, y=42..378]`
- `lab-example-differentiation-intro` curve stats at default/min/max:
  - point count: `180`
  - y range: `-1.31..588.56`
  - outside-frame points: `29`
  - outside ratio: `0.161`
  - clip path: `null`
- `lab-example-calculus` returned the same curve bounds and no clip path.
- `https://www.mais.hk/lesson/calculus` returned the same curve bounds and no clip path.
- Screenshot: `calculus-visual-lab-0.png`

Conclusion: The curve still extends beyond the visible graph scale on production. The current production SVG path is not clipped or clamped to the graph frame.

### 3. Complex Numbers Imaginary Boundary

Status: Reproduced on production at max controls.

Evidence:

- Checked frame: `[x=34..606, y=34..326]`
- Controls set to Real part `9`, Imaginary part `9`.
- All three tested Complex Numbers roots produced out-of-frame items:
  - `z` mode: `outsideCount = 6`
  - `Conjugate` mode: `outsideCount = 8`
  - `i times z` mode: `outsideCount = 10`
- Representative out-of-frame coordinates:
  - `complex point`: `cx=482`, `cy=28`, `r=12`
  - label `9 + 9i`: `x=498`, `y=16`
  - `conjugate point`: `cx=482`, `cy=352`, `r=12`
  - `i times point`: `cx=158`, `cy=28`, `r=12`
- Summary evidence: `summary.json`

Conclusion: The Complex Numbers lab still allows the imaginary extreme to place points and labels outside the graph frame on production.

## Result

All three attachment-described issues still reproduce on `www.mais.hk` as of 2026-06-20 12:35 HKT.

S11 recommends S06 verify whether the local fixes that render ticks/clamp graph geometry have actually reached production. S22 should also reconcile the live route mismatch between `/visualization-lab` and `/student/tools/visualizations` before using the newer production Playwright specs as deployment evidence.

## Checks Run

- DOCX text extraction for relevant bug descriptions.
- Playwright one-off production navigation and interaction.
- Production DOM/SVG inspection for text labels, path coordinates, graph frames, range controls, and mode buttons.
- Screenshot capture for representative target states.

## Checks Not Run

- No production write actions such as `Mark explored`.
- No repeated load/stress run.
- No feature-code fix or local build.
- Mobile full-page sweep was not run; this check focused on reproducing the reported visual/math bugs on desktop production.
