# A11 Mathematical Diagram Boundary Integrity Audit

- Audit window: 2026-08-09 to 2026-08-10
- Agent lane: A11, coordinating A04, A05, A06, A18, A22, and A25
- Branch: `codex/a11-diagram-boundary-integrity`
- Branch point: `3f8f12c4d3fd2efe938d1b07cab6289315f108dd`
- Latest fetched integration target: `origin/main@867d17799140e7f45129c928b7af57a540402c75`
- Worktree: `/Volumes/Starship/MAIS-diagram-boundary-wt`
- Status: Integrated verification in progress; not yet pushed or merged

## Owner assignment

The owner asked to generalize the reported S4 angle-overrun defect, repair all confirmed defects of the same class, update GitHub, and merge the reviewed result into `main`. This authorizes the minimum cross-domain fixes needed in lesson, Practice, Visualization Lab, shared geometry helpers, focused tests, audit tooling, and evidence reports. It does not authorize deployment.

## Coordination and hygiene

- Primary dirty integration root was treated as read-only.
- All changes were made in the isolated worktree/branch above.
- The original branch-point commit is the PR #120 merge that already contains the exact screenshot correction.
- The latest fetched `origin/main` advances beyond the branch point; the current upstream change list has no path overlap with this audit slice.
- Generated `next-env.d.ts` route-type drift is excluded and will be restored before staging.
- No secrets, provider calls, production writes, deployment, destructive cleanup, or unrelated root changes are in scope.

## Root-cause model

The audit separates semantic endpoint overrun, paint-cap overrun, SVG/Canvas/WebGL drawing-frame overflow, annotation collision, responsive reachability, state-dependent overflow, and geometry distortion disguised by numeric clamp or clipping. Body/card `overflow:hidden` is not an accepted fix.

## Implemented audit layers

1. Repeatable inventory for all 490 live lessons, 270 CCSS modules, 27 structured Practice figures, 689 Visualization Lab routes, 299 live asset references, 53 public SVGs, 192 signature benches, 78 effective WebGL labs, and four standalone routes.
2. Strict semantic-angle contracts that validate the actual SVG path, radius, signed sweep, endpoints, and actual butt-capped paint.
3. Rendered DOM/SVG/container/page checks at five viewport widths and three languages/two themes.
4. Canvas 2D requested-paint interception with transform, DPR, clip, analytic Bézier extrema, text, resize/reset, compositor classification, explicit blank-canvas policy, and fail-closed unsupported-operation evidence.
5. SVG paint-effect auditing for nested diagram roots, actual marker geometry, filter regions, masks, and unsupported-effect accounting.
6. Actual Three.js scene projection through the live camera with per-renderable support accounting, final projected-label rectangles, formula collision checks, and fail-closed missing/unsupported state.
7. Dynamic breadth-first traversal for ordinary controls (`state-graph-v2`, 24-state/96-transition caps) plus explicit random, number/select, Shift-click, context-menu, click-grid, drag-grid, standalone image, stored figure, and Euler drag executors.
8. Full-mode environment validation that rejects narrowing, sharding, and invalid viewport tokens when the release matrix is requested.

## Confirmed repairs

- Exact angle/ray termination and full-turn semantics across lessons, Practice figures, Worked Examples, and configured/geometry labs.
- Reachable responsive Figure/FigureScroll behavior and mobile fixes across fixed SVG/HTML mathematical objects.
- Honest raw function/line geometry with plot-scoped clips instead of false boundary plateaus.
- Dynamic viewBoxes, stroke gutters, boundary-aware labels, duplicate/coincident-label handling, and degenerate-triangle/Euler gates.
- Responsive Practice figures, counting cards, restored Mistake Book diagram context, and handwriting stroke rescaling.
- Compact finite Canvas explanations for narrow Counting/Comparing bitmaps.
- Actual WebGL projection instrumentation and collision-aware formula placement.
- Page-shell min-content fixes required to make exact document-width auditing meaningful.

## Evidence collected so far

- Inventory: zero failures.
- `npm run type-check`: pass after integrated changes.
- `tests/e2e/math-diagram-source-geometry.test.ts`: 15/15 pass.
- `components/visualizations/mathDiagramGeometry.test.ts`: 12/12 pass.
- `components/lesson/ccss/mathDiagramBoundaryRegressions.test.ts`: 32/32 pass, including 28,392 distinct slope-explorer point pairs.
- `components/visualizations/mathDiagramResponsiveRegressions.test.ts`: 7/7 pass.
- Lesson Figure/angle/Worked Example focused contracts: 39/39 pass.
- Component runner: exit 0; changed Three.js/formula contract suite: 305/305 pass.
- Question-figure gate: 23/23 pass; visualization gate: 147/147 pass; CCSS textbook gate: 278 source files clean.
- Handwriting/onboarding focused gates: 35/35 pass.
- Synthetic angle/body/Canvas browser gate: 3/3 pass; Canvas/SVG paint hardening gates: 11/11 pass.
- `npm run type-check`: fresh pass after the final formula-evidence expectation repair.
- `git diff --check`: fresh pass before the evidence-report update.
- Actual rebuilt-product WebGL and full browser matrix evidence remain pending; no prior smoke result is being promoted as final proof.

## Remaining closure sequence

1. Commit exact evidence paths, integrate current `origin/main`, and build from the clean committed tree.
2. Run the rebuilt rendered boundary matrix and capture original-route proof screenshots.
3. Update final evidence, push, open the PR, wait for CI, merge into `main`, and verify the GitHub main SHA contains the commits.
4. Stop at merged-not-deployed; no Vercel or live claim is authorized.
