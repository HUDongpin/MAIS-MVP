# A11 Mathematical Diagram Boundary Integrity Audit

- Audit window: 2026-08-09 to 2026-08-11
- Agent lane: A11, coordinating A04, A05, A06, A18, A22, and A25
- Branch: `codex/a11-diagram-boundary-integrity`
- Worktree: `/Volumes/Starship/MAIS-diagram-boundary-wt`
- Initial baseline / PR #120 merge: `3f8f12c4d3fd2efe938d1b07cab6289315f108dd`
- Pre-release merge-base with last fetched `origin/main`: `c69a949cf22b03372ac475af6b0366604b896638`
- Status at this entry: current implementation has pre-integration source/build closure; final continuously monitored Starship E2E and GitHub integration remain pending; deployment not authorized

## Owner assignment

The owner asked to generalize the screenshot-reported S4 angle-overrun defect, repair confirmed defects in the same boundary-integrity family, update GitHub, and merge the reviewed result to `main`. The assignment authorized the minimum cross-domain fixes needed in lessons, Practice, Visualization Lab, geometry helpers, audit tests/tooling, and evidence reports. It did not authorize deployment.

## Worktree and release hygiene

- The dirty primary integration root remained read-only.
- All edits were made in the isolated worktree and branch above.
- Staging is restricted to exact assigned pathspecs; no broad add, reset, stash, clean, or unrelated-file handling is permitted.
- Generated `next-env.d.ts` / `tsconfig*.json` drift was restored and excluded.
- Current pre-integration unit/type/inventory/build evidence is under `/Volumes/Starship/MAIS-diagram-boundary-wt/.tmp/a11-preintegration-20260811-r4`. Its controllable temp, cache, build, and log paths were bound beneath that named Starship root.
- The older final6 E2E wrapper configured its controllable paths beneath `.tmp/final6`; Run 32 alone additionally captured the actual live target browser executable and profile. Runs 33–40 had pre/post profile checks but no continuous in-run process capture, so final Starship-only acceptance remains pending fresh monitored post-integration E2E.
- Runs using npm/npx defaults, repository-root temporary paths outside the named run root, `/var/folders/...` Playwright profiles, or other non-Starship artifacts were rejected as harness evidence even if assertions passed.
- No secrets, provider calls, production writes, deployment, destructive cleanup, or unrelated root changes occurred.

## Reusable root-cause model

The audit separates semantic endpoint overrun, painted cap/stroke/effect overrun, SVG/Canvas/WebGL frame overflow, annotation collision/clipping, responsive reachability failure, state-dependent overflow, and semantic distortion hidden by clamping or blanket clipping. `overflow:hidden` is not an accepted repair.

## Implemented audit layers

1. Repeatable inventory for 490 live lessons, 270 CCSS modules, 27 Practice figures, 689 Visualization Labs, 299 live asset references, 53 public SVGs, 192 signature benches, 78 effective WebGL labs, 143 HTML-only Figure modules, and four standalone routes.
2. Semantic-angle contracts that validate actual paths, radius, sweep, endpoints, browser line cap, and paint order.
3. Rendered SVG/container/page checks with exact document-width enforcement and reachable local scrolling.
4. Canvas 2D interception with transform/DPR handling, analytic Bézier extrema, text, reset/resize, compositor classification, explicit blank policy, and fail-closed unsupported operations.
5. SVG marker/filter/mask auditing with incomplete-effect accounting.
6. Live Three.js projection with support accounting, final projected-label rectangles, formula collision checks, and fail-closed missing content.
7. Bounded ordinary-control state graphs plus explicit random, number/select, Shift-click, context-menu, click-grid, drag-grid, stored-figure, replacement-image, and Euler-drag executors.
8. Full-mode environment validation rejecting narrowing, sharding, and invalid viewport tokens when exhaustive mode is requested.

## Confirmed repairs

- Preserved the reported Precise Definitions arc endpoint/ray fix and converted it into a durable semantic/browser contract.
- Replaced clipped full compass circles with exact in-frame construction arcs.
- Made wide lesson figures locally scrollable from a reachable left origin and repaired page min-content expansion.
- Retained honest raw plot geometry under plot-scoped clips and edge indicators.
- Added viewBox/stroke gutters, dynamic frames, inset axes, footprint-aware labels, wrapped proof readouts, and coincident-label grouping.
- Corrected stored Mistake Book publisher/three-arc semantics and durable reread.
- Added Canvas, SVG-effect, and live WebGL projected-paint probes.
- Jointly placed Euler vertex labels around O/G/H/N dots/text, the full r=20 focused vertex halos, and one another, including the exact C-to-`(480,150)` failure and more than 2,000 reachable states.
- Corrected four-quadrant labels at all 338 legal states and rendered 26 selected-axis self-reflections only once.
- Reproduced Run 31's 226×127 Advanced Functions failure: a 113×53.34 formula panel collided with visible `active f(x)` in all four corners. The panel now tries progressively narrower widths on both sides of the 480px canvas threshold, retains its scroll/focus semantics, and selects the widest collision-free measured rectangle. The captured Run 31 coordinates resolve to a 90.4×53.34 helper placement without hiding the label; 480/481/500px helper regressions remain safe. In final6 live Run 32, projected-label reflow already made the wider 113×53.328 top-left panel safe, so that rendered run and the captured-coordinate helper regression are recorded as distinct evidence.

## Current pre-integration local evidence

- Changed-area source/component tests: **393/393 PASS**, `.tmp/a11-preintegration-20260811-r4/unit/changed-area/result.status.log`, recorded source diff `c735266ddc5d23a0b99ec2c27eb0d9a261601f88099a7382f043b6050c50e611`.
- TypeScript strict check: **PASS**, `.tmp/a11-preintegration-20260811-r4/unit/typecheck/result.status.log`, same recorded source diff.
- Inventory: **PASS**, zero failures, `.tmp/a11-preintegration-20260811-r4/unit/inventory/result.status.log`, same recorded source diff.
- The r2 build attempt failed closed because this task's owned final6 `next-server` PID 64791 remained active; `.tmp/a11-preintegration-20260811-r2/build/result.status.log` remains preserved as harness/process-isolation evidence.
- Current production build: **PASS**, Next.js 15.5.20, 236/236 pages, `.tmp/a11-preintegration-20260811-r4/build/result.status.log`, same recorded source diff.
- `git diff --check`: **PASS** on the pre-integration slice; repeat after integration and final documentation updates.

Earlier targeted browser runs (intermediate product evidence, not the final continuously monitored Starship gate):

- Run 32: focused Advanced Functions WebGL projection and narrow formula/label states — 1/1 PASS.
- Run 33: focused four-quadrant endpoint/axis/origin/self-reflection replay — 1/1 PASS.
- Run 34: full CCSS exceptional-state target — 1/1 PASS.
- Run 35: original S4 lesson route, phone/desktop, all exposed states — 1/1 PASS.
- Run 37: exact California standalone reproduction — 1/1 PASS.
- Run 38: complete four-route standalone matrix — 1/1 PASS.
- Run 39: reported angle, semantic angles, body clipping, Canvas probe — 4/4 PASS.
- Run 40: Visualization fallback target — 1/1 PASS.

Run 32 has an actual live target browser/profile capture beneath Starship. Runs 33–40 only have configured-path plus pre/post profile evidence. All of these runs also predate the current r2/r3 source diff, so a new monitored post-integration E2E set is required before release acceptance.

## Preserved red/excluded evidence

- Run 31 is the real formula/label collision that motivated the adaptive-width fix. Its red result is retained.
- Run 36 is a real React production hydration recovery #418 on the California textbook route, not a mathematical-boundary finding. Trace shows the pageerror before test mutations; all 15 lesson/image assertions and final boundary audit completed with `issues=[]`. The same build passed a three-navigation diagnostic probe, exact Run 37, and full Run 38, so the event is classified as timing-sensitive and non-deterministic—not suppressed, allowlisted, or rewritten as green.
- Earlier red fixture/Euler/four-quadrant runs remain preserved.
- Functionally green final3 runs 17–23 are excluded because a temporary TypeScript path escaped their declared named run root. Non-Starship/default-temp runs are also excluded.

## Handoff boundary

The inventory and finite-state source checks are exhaustive inside their declared graphs. Browser runs are targeted at the original route, confirmed failures, rendering engines, standalone surfaces, exceptional controls, and phone/desktop endpoints; no every-route Cartesian browser matrix is claimed.

Next release steps are: exact pathspec commit, fetch/review/integrate current `origin/main`, rerun source/type/inventory/build and every accepted E2E target from a new named Starship root with continuous actual-browser/profile monitoring, refresh this evidence, push, open the PR, require GitHub checks, merge to `main`, and stop at merged-not-deployed.
