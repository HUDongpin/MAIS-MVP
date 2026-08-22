# A11 Mathematical Diagram Boundary Integrity Audit

- Audit window: 2026-08-09 to 2026-08-11
- Agent lane: A11, coordinating A04, A05, A06, A18, A22, and A25
- Branch: `codex/a11-diagram-boundary-integrity`
- Worktree: `/Volumes/Starship/MAIS-diagram-boundary-wt`
- Initial baseline / PR #120 merge: `3f8f12c4d3fd2efe938d1b07cab6289315f108dd`
- Final local integration baseline / last fetched `origin/main`: `20c8fb983e7f4f6d39b9bbb09f58c64887f2e72b`
- Verified code/test commit: `9c2379d902c72ed766c1a86daff9e7830f302dd9` (tree `c43afec4419d1fb70f6682294f90e11f8de350b8`)
- Status at this entry: the exact implementation commit has 394/394 source tests, typecheck, inventory, 236/236 build, and the accepted final9 continuously monitored browser set green; historical product reds and harness-invalid attempts remain disclosed; GitHub integration is pending and deployment is not authorized

## Owner assignment

The owner asked to generalize the screenshot-reported S4 angle-overrun defect, repair confirmed defects in the same boundary-integrity family, update GitHub, and merge the reviewed result to `main`. The assignment authorized the minimum cross-domain fixes needed in lessons, Practice, Visualization Lab, geometry helpers, audit tests/tooling, and evidence reports. It did not authorize deployment.

## Worktree and release hygiene

- The dirty primary integration root remained read-only.
- All edits were made in the isolated worktree and branch above.
- Staging is restricted to exact assigned pathspecs; no broad add, reset, stash, clean, or unrelated-file handling is permitted.
- Generated `next-env.d.ts` / `tsconfig*.json` drift was restored and excluded.
- Exact-commit source/type/inventory/build and E2E evidence is under `/Volumes/Starship/MAIS-diagram-boundary-wt/.tmp/a11-final9-20260811`. All final9 evidence stayed on `/Volumes/Starship`; source gates used the disclosed short Starship TMPDIR `.tmp/f9t`, and the build used `.tmp/f9b`.
- Every accepted E2E target browser/profile and logged E2E temp, cache, browser, report, artifact, trace, screenshot, build, database, and service-log path was beneath the named final9 root. The fail-closed wrapper continuously sampled live arguments, rejected profiles outside `/Volumes/Starship`, required an observed target browser, and rejected target-profile leakage after exit.
- From Run 54c onward, the Playwright Node 24.14.0 controller was also copied under final9 and run with concurrent Sparkplug disabled after two preserved Node/V8 shutdown deadlocks. This is a runner-only scheduling mitigation; it does not change product or browser assertions.
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
- Preserved Run 31's 226×127 primary-label collision, Run 44's real moving `family-probe` collision, and Run 51's residual collision even at 67.8px. Width-only retries were insufficient. The final solver jointly searches readable widths, bounded 12/8/4px edge insets, and four corners, applies the selected diagnostic `x/y/w/h` to the rendered DOM, and keeps the scrollable formula plus both required labels visible. Source replays choose the widest safe Run 31 width/inset pairs 113px/8px, 101.7px/4px, and 113px/8px; they lock Run 44 at 67.8px/top-left/12px and Run 51 at 79.1px/bottom-right/4px with minimum gaps. Final monitored Run 52 validates exact diagnostic/DOM rectangles and zero live overlap.

## Exact-commit final9 local evidence

- Source identity: clean implementation commit `9c2379d902c72ed766c1a86daff9e7830f302dd9`, tree `c43afec4419d1fb70f6682294f90e11f8de350b8`; recorded `origin/main` `20c8fb983e7f4f6d39b9bbb09f58c64887f2e72b` is an ancestor.
- Changed-area source/component tests: **394/394 PASS**, `.tmp/a11-final9-20260811/unit/changed-area/result.status.log`, exit 0.
- TypeScript strict check: **PASS**, `.tmp/a11-final9-20260811/unit/typecheck/result.status.log`, exit 0.
- Inventory: **PASS**, zero failures and the report's reviewed count baselines, `.tmp/a11-final9-20260811/unit/inventory/result.status.log`, exit 0.
- Production build: **PASS**, Next.js 15.5.20, 236/236 pages, `.tmp/a11-final9-20260811/build/result.status.log`, exit 0.
- Generated `next-env.d.ts` / `tsconfig*.json` drift was restored. The final evidence-only document update is followed by `git diff --check` before its exact pathspec commit.

Final continuously monitored Starship browser gate:

- Run 52: focused Advanced Functions live WebGL and Run 31/44/51 formula-label geometry — **1/1 PASS, 2.4m**.
- Run 53: reported angle, semantic angles, body clipping, Canvas 2D probe — **4/4 PASS, 3.8s**.
- Run 54c: CCSS exceptional random/input/pointer states — **1/1 PASS, 44.7s**.
- Run 55: complete standalone route matrix — **1/1 PASS, 14.7s**.
- Run 56: Practice figures, counting cards, resized handwriting — **1/1 PASS, 12.5s**.
- Run 57b: public SVG and raster assets with the correct `public-asset` surface — **1/1 PASS, 6.8s**.
- Run 58: Functions and S4 Visualization fallback/control/mode states — **1/1 PASS, 1.0m**.
- Run 59: original `us-ca-math-s4-chapter-01` live lesson at phone/desktop across every exposed diagram state — **1/1 PASS, 4.8m**.

All eight accepted commands (11 Playwright tests) recorded an observed target browser, no profile outside `/Volumes/Starship`, no lingering target, no process-audit failure, Playwright exit 0, and wrapper exit 0. This is a targeted browser matrix, not an every-route Cartesian claim; Run 52 is focused on Advanced Functions rather than opening all 78 effective WebGL labs.

## Preserved red/excluded evidence

- Run 31 is the real formula/label collision that motivated the adaptive-width fix. Its red result is retained.
- Run 36 is a real React production hydration recovery #418 on the California textbook route, not a mathematical-boundary finding. Trace shows the pageerror before test mutations; all 15 lesson/image assertions and final boundary audit completed with `issues=[]`. The same build passed a three-navigation diagnostic probe, exact Run 37, and full Run 38, so the event is classified as timing-sensitive and non-deterministic—not suppressed, allowlisted, or rewritten as green.
- Run 44 is a real product failure: the 79.1×53.3 formula panel overlapped the legitimate visible moving `family-probe`; it established that primary-label-only avoidance was incomplete.
- Run 50 is harness-invalid: a non-Starship `/private/var/folders/.../playwright_chromiumdev_profile-*` appeared, and the fail-closed wrapper returned 78. It carries no product conclusion.
- Run 51 is a real product failure: even 67.8×53.3 at the former 12px placement still overlapped `family-probe` by approximately 1.30×10.23 CSS pixels; it motivated the final joint inset search.
- Runs 54 and 54b each printed one passing assertion result but deadlocked during Node/V8 shutdown and were terminated with exit 143. They are harness-invalid; only naturally exiting Run 54c counts green.
- Run 57 used the wrong surface set, produced `1 skipped`, observed no target browser, and returned 78. It is invalid; Run 57b is the accepted replacement.
- Earlier red fixture/Euler/four-quadrant runs remain preserved.
- Functionally green final3 runs 17–23 are excluded because a temporary TypeScript path escaped their declared named run root. Non-Starship/default-temp runs are also excluded.

## Handoff boundary

The inventory and finite-state source checks are exhaustive inside their declared graphs. Browser runs are targeted at the original route, confirmed failures, rendering engines, standalone surfaces, exceptional controls, and phone/desktop endpoints; no every-route Cartesian browser matrix is claimed.

Next release steps are: diff-check the evidence-only documents, commit them with exact pathspecs, fetch and recheck current `origin/main`, push the branch, open and review the PR, require GitHub checks, merge to `main`, and stop at merged-not-deployed.
