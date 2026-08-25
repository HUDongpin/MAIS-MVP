# A11/A06 G07 C2 production-browser evidence contract

Date: 2026-08-20  
Lane: A11 QA with A06 Visualization Lab boundary  
Worktree: `/Volumes/Starship/MAIS-china-viz-labs-wt`  
Status: source contract complete; production browser proof unavailable and release gate closed

## Authorized slice

This source-only C2 slice adds the G07 receipt model, its mutation tests, the production-browser producer, and producer source canaries. It is bound to the approved G07 production plan canonical SHA-256 `c7d41297e48880c149f25f3e7aac13ac1d16518175aa37dbd3aab6362e2cd477`: seven exact labs, eight operational modes, 84 visual states, and 548 interaction states. It does not edit product code, the approved plan, Playwright configuration, runners, partitions, binders, supervisors, or C8.

## TDD record

The producer source suite was first run against an intentionally hollow producer and reported 1 pass / 10 failures. The implementation then made the exact-state, native-authority, analytics, input, swipe, UI-audit, durability, and attachment canaries green. The public receipt mutation suite rejects missing/surplus/duplicate/reordered labs, axes, and states; endpoint and reset drift; fallback/hollow UI; visual defects; analytics absence, corruption, delay, surplus, other-lab ownership, event reuse, ACK drift, and terminal mismatch; retry/skip/authority/release forgery; durability drift; and fake touch/swipe evidence.

Final source-only checks:

- `node --import tsx --test tests/e2e/china-mainland-g07-production-receipt.test.ts tests/e2e/china-mainland-g07-production-browser-source.test.ts` — PASS, 72/72 (61 receipt/validator tests plus 11 producer-source tests).
- `npx tsc --noEmit --incremental false --pretty false` — PASS, exit 0.
- Playwright `--list` — deliberately not run. Importing `playwright.config.ts` performs native prebuild-receipt validation and writes the path manifest; the supported wrapper owns a build. Running either path would violate this slice's no-build constraint. This omission is fail-closed and is not browser evidence.
- No Chrome/browser, build, network, database, or Git operation was run.

## Evidence and fail-closed boundary

The producer derives every state from the approved plan and requires all 12 visual axes plus both declared interaction axes without claiming a full visual-by-interaction Cartesian product. Every non-initial interaction is followed by reset. It requires desktop keyboard/mouse, mobile real touchscreen taps, two-direction CDP touch swipes with local-scroll before/after geometry, canonical scroll-position audits, collision/contrast/clipping/overflow/touch-target gates, and empty console/page/request diagnostics.

Every physical subaction must own exactly one retained raw `/api/learning-events` POST, exact event owner/source/topic/type/ID/timestamp-window evidence, a 200 ACK, and terminal raw/parsed/serialized/consumed equality. Delayed, malformed, other-lab, surplus, reused, and zero-event delivery sets fail. No event is mocked or synthesized.

The current product boundary remains a real blocker: G07 dispatches dedicated `SymbolicExpressionsLab` controls directly, while the generic configured surface owns the existing `recordLearningEvent` calls. The dedicated G07 control actions therefore do not currently provide the required independent per-subaction analytics evidence. A real browser run must fail at the first missing delivery; this contract does not weaken that requirement.

There is also no trusted native dedicated runner that can prove process-owned CLI selection and exit. Caller JSON/SHA and narrowed direct Playwright cannot authorize completion. The public schema consequently fixes `authorityAvailable: false`, `execution.complete: false`, and `releaseReady: false`. Source tests, TypeScript, and later collection-only checks must never be described as browser coverage or release proof.

## Frozen pre-review file hashes

- `tests/e2e/china-mainland-g07-production-receipt.ts` — `5a401c59c6c15d834a0ace514c58dac0def3c78bf53259d07521ee574a5f9aa3`
- `tests/e2e/china-mainland-g07-production-receipt.test.ts` — `b6c218b4e05c73724130a93d3b6a6c964cd64aa844aad59c9406e1032a330cfa`
- `tests/e2e/china-mainland-g07-production-browser.spec.ts` — `b1d080afed093b9e857a61a0821714626c734a04dc245015b7110c302526e2ee`
- `tests/e2e/china-mainland-g07-production-browser-source.test.ts` — `1581acdceff95b59b1de4fb7df4dd2bcf15a14e8a4562ec560eba85dbe873193`
- Approved plan source byte SHA-256 canary — `33e9e4c9c5b5cd68dbf21276e3d53aaa8074825dc611099e9a0e420e9570d700`

Independent review is required. This session does not self-approve and does not claim production browser completion.

## C3 review remediation freeze

The different C2 review returned HOLD with 0 P0, 6 P1, and 2 P2 findings. C3 addressed all findings in the same authorized four-file contract without product, runner, configuration, browser, build, network, database, or Git changes.

- Analytics events now use the production `LearningAnalyticsEventType` union with semantic mapping: range actions require `visualization-slider`, mode/setup/probe-style actions require `visualization-probe`, and reset actions require `visualization-reset`. Unsupported and semantically wrong types fail. Mobile CDP swipes are also independently analytics-bound as physical probe actions.
- Every lab explicitly applies and observes the declared interaction-axis locale/theme before the initial state and again after reload; exact observed `html.lang` and theme are serialized with durability evidence.
- Raw analytics capture uses one project-global exact `0..N-1` sequence, one wall/monotonic origin, strictly non-overlapping physical windows, plan-order lab serialization, and setup-to-primary-to-reset phase order. Mutation tests kill duplicate/noncontiguous sequence, phase/lab reorder, overlap, and clock-origin drift.
- Each visual state now proves finite positive scroll range; strict top/center/bottom order; common viewport, document maximum, and tolerance; and stable document-space root geometry.
- Mobile two-way swipe evidence is bound to the exact first G07 lab and `horizontal` local scroller, with equal geometry, first-to-second continuity, opposite displacement, and exact return. Each swipe has its own raw POST/ACK evidence.
- Executable validation pins approved plan SHA-256 `c7d41297e48880c149f25f3e7aac13ac1d16518175aa37dbd3aab6362e2cd477`. Raw source evidence now includes `SymbolicExpressionsModel.ts` plus the other plan inputs and the production analytics type source.
- Raw request/response bytes must match the captured serialization bytes exactly, while semantic equality is checked by parsing; a valid non-canonical JSON key order is accepted. Response status is insufficient until body-read completion is observed.
- Mobile range input uses one calibrated real touchscreen tap and fails closed unless the live input reports the exact requested value; its one physical tap must own one analytics delivery.

C3 verification:

- Intentional RED after new assertions: 73 pass / 18 fail.
- Final combined source-only command: `node --import tsx --test tests/e2e/china-mainland-g07-production-receipt.test.ts tests/e2e/china-mainland-g07-production-browser-source.test.ts` — PASS, 93/93 (82 receipt/positive/mutation tests plus 11 producer-source tests), 0 fail/skip/todo.
- G07-targeted TypeScript compiler-program check using repository `tsconfig.json` options and the four authorized root files — PASS, 0 diagnostics.
- A concurrent full repository `tsc --noEmit --incremental false --pretty false` attempt found four errors only in the separately owned G02 C2 slice (`calibrationEvidence`); it reported no G07 diagnostic. Root owns the settled full-repository rerun. No G02 file was changed here.
- Playwright `--list` remains skipped for the documented native-prebuild/build boundary. These checks are source/contract evidence only, not browser coverage.

The native dedicated runner remains unavailable and the current dedicated G07 controls still lack the required independent per-action analytics deliveries. `authorityAvailable`, `execution.complete`, and `releaseReady` therefore remain false. Fresh different review is required; C3 is not self-approved.

## C4 review remediation freeze

The different C3 review returned HOLD with 0 P0, 5 P1, and 2 P2 findings. C4 addressed the findings in the same authorized four-file plus session-log scope, again without product, plan, runner, configuration, partition, binder, supervisor, browser, build, network, database, or Git changes.

- Mobile range evidence is now an exact one-attempt bounded real-touch ledger. It binds touch-track geometry, the quantized requested value, the physical subaction delivery/event IDs, live value before/after, and the production reducer's expected accepted/rejected result. Accepted input must expose the exact requested live value; a rejected endpoint must record the exact requested physical attempt, the expected reducer error, and an unchanged live input. Every range touch remains included in the project-wide tap and analytics equality.
- Each lab carries an ordered unfiltered raw session checkpoint chain: post-registration empty; six siblings after seed; target plus six siblings after first; stable exact seven after reset, second action, reload, every visual axis, and final. Captured bytes parse to the retained full records; target/sibling projections are derived from those records; later bytes and records remain stable; and any surplus non-G07 record fails.
- One analytics request/response listener is installed once before relevant page actions and remains active across every lab and between-lab boundary until terminal project quiescence. The terminal and quiescent raw counts derive `lateDeliveryCount`; global captured/consumed equality is checked before the listener is disposed. There is no per-lab listener teardown blind interval.
- Every lab serializes an explicit phase boundary with lab index, common wall/monotonic origin, last interaction sequence, first/last visual sequences, final raw-session checkpoint time, and the exact next-lab first sequence. The gate proves interaction-before-visual order, checkpoint-after-visual order, and checkpoint-before-next-lab order in both clock domains.
- C4 used an exact ordered versioned source selection including the approved plan and key producer/runtime sources. It was still hand selected; C5 below corrects the over-broad closure label and retains a fail-closed, explicitly non-recursive contract.
- Mobile canonical scroll navigation reports `already-at-landmark` when no physical vertical swipe was needed; it no longer labels that path as a CDP swipe. Invalid project/method pairings fail.

C4 TDD and source-only gates:

- Intentional C4 RED: 94 pass / 23 fail before implementation.
- `node --import tsx --test tests/e2e/china-mainland-g07-production-receipt.test.ts tests/e2e/china-mainland-g07-production-browser-source.test.ts` — PASS, 124/124, 0 fail/skip/todo.
- G07-targeted TypeScript compiler-program check using repository `tsconfig.json` options and the four authorized root files — PASS, 0 diagnostics.
- Playwright `--list` remains deliberately skipped because importing the repository config invokes the native prebuild-receipt/path-manifest boundary and the supported wrapper owns a build. No browser or browser-coverage claim is made.

C4 frozen code-file SHA-256 values:

- `tests/e2e/china-mainland-g07-production-receipt.ts` — `9420aa8382dc97dfbfe6a27b26262fd33ff99fbb1fc7125b92113b6a8b0387c4`
- `tests/e2e/china-mainland-g07-production-receipt.test.ts` — `03f5f755751f265c63b0b8c5e09e6e4fd39b0f811edcbd341a470aa118a75556`
- `tests/e2e/china-mainland-g07-production-browser.spec.ts` — `c3412de71ee4a53b00abdfe0cea54e0b3efb3538573b3776de0d41b3a7cd4afd`
- `tests/e2e/china-mainland-g07-production-browser-source.test.ts` — `d779fd4adb78d1425dd670e7faa9aa89d7ccbc9b547ee972e8c1995af2a247b1`
- Approved plan source byte SHA-256 — `33e9e4c9c5b5cd68dbf21276e3d53aaa8074825dc611099e9a0e420e9570d700`; canonical plan SHA-256 remains `c7d41297e48880c149f25f3e7aac13ac1d16518175aa37dbd3aab6362e2cd477`.

The two external blockers remain unchanged and are not papered over: native dedicated runner authority does not exist, and the current product does not emit the required independent per-action G07 learning-event deliveries. The schema remains `authorityAvailable: false`, `execution.complete: false`, and `releaseReady: false`. C4 requires a fresh different review and is not self-approved.

## C5 review remediation freeze

The different C4 review returned HOLD with 3 P1 findings. C5 remediates those findings inside the same authorized four code/test files plus this log. It does not edit product, plan, runner, configuration, partition, binder, supervisor, or C8 files, and no browser, build, network, database, or Git operation was run.

- Every audited mobile physical input is now serialized into one project-lifetime ledger with an exact contiguous sequence and derived category/tap/swipe/move totals. The producer records locale-menu, locale-selector, locale-option, theme-toggle, mode, reset, calibrated range, horizontal-scroll, and vertical-scroll inputs. Only physical product subactions are analytics-bound; locale/theme navigation and vertical viewport scrolling remain an explicit unbound subset. Analytics-bound entries cross-bind exact delivery/event IDs and preserve the complete raw analytics equality gate.
- Each mobile scroll audit inspects and serializes its initial geometry. `already-at-landmark` is legal only when that initial geometry already satisfies the requested top/center/bottom landmark and no swipe attempt occurred. Otherwise, every real CDP vertical swipe records direction, four moves, before/after scroll positions, signed displacement, target result, state/lab identity, and the exact project-ledger sequence. The final attempt must reach the landmark; an all-`already-at-landmark` mobile project fails.
- Every raw session checkpoint now uses the exact project analytics `performance.timeOrigin`, has globally strict wall and monotonic chronology across all seven labs, and carries exact preceding/following analytics capture-sequence bindings. The validator checks each checkpoint inside those surrounding analytics windows and derives the semantic bindings for registration/seed, first primary, reset, second/reload, every visual axis, final, and the next-lab boundary. Origin drift, wall regression, cross-origin binding, and phase-window substitution fail.
- The source manifest is now honestly named `selectedCriticalSources`. It explicitly sets `transitiveClosureClaimed: false` and does not claim recursive import closure. Its exact ordered, hash-bound selection includes the producer/validator/plan, G07 model/control/visual inputs, configured renderer, scanners, catalog/provider/analytics clients, `tests/e2e/helpers.ts`, `lib/server/userStore.ts`, `lib/server/userStore/studentActivityPersistence.ts`, `lib/server/sessionCookie.ts`, auth/session eligibility, and the relevant API routes. Missing, surplus, reordered, selection-version, unsupported-claim, and SHA drift mutations fail. This bounded list does not elevate release readiness.

C5 TDD and source-only gates:

- Intentional C5 RED: 125 pass / 14 fail before implementation, isolated to the new physical-input, vertical-scroll, checkpoint-clock/window, and source-selection assertions.
- `node --import tsx --test tests/e2e/china-mainland-g07-production-receipt.test.ts tests/e2e/china-mainland-g07-production-browser-source.test.ts` — PASS, 140/140, 0 fail/skip/todo.
- G07-targeted TypeScript compiler-program check using repository `tsconfig.json` options and the four authorized roots — PASS, 0 diagnostics.
- A concurrent full repository `npx tsc --noEmit --incremental false --pretty false` attempt found five diagnostics only in the separately owned G02 C2 files and no G07 diagnostic. Root owns the settled full-repository rerun; no G02 file was changed here.
- Playwright `--list` remains deliberately skipped because repository configuration crosses the native prebuild/path-manifest boundary. These results are source-contract proof only, not browser coverage.

C5 frozen code-file SHA-256 values:

- `tests/e2e/china-mainland-g07-production-receipt.ts` — `71512ecf4a63eaefcace28bbd6879afc24ecee5ea45f35ecf87b1a495906fe8b`
- `tests/e2e/china-mainland-g07-production-receipt.test.ts` — `61428a7374050b35e21d708c8c4c7efa94bd8f8c27eda09d99afc3fe5eb2707d`
- `tests/e2e/china-mainland-g07-production-browser.spec.ts` — `0eb304e43afa38661e486db5fe0fdb1852b0102724bb7d4eb3dbb4b6152a939f`
- `tests/e2e/china-mainland-g07-production-browser-source.test.ts` — `57bcafd7d130d2b44e75b75c651225d89e3746461acbb95a57bf6cfedb9a7dd3`
- Approved plan source byte SHA-256 — `33e9e4c9c5b5cd68dbf21276e3d53aaa8074825dc611099e9a0e420e9570d700`; canonical plan SHA-256 remains `c7d41297e48880c149f25f3e7aac13ac1d16518175aa37dbd3aab6362e2cd477`.

The two external release blockers remain unchanged: no trusted native dedicated runner exists, and current G07 product controls do not emit the required independent per-action learning-event deliveries. The executable receipt stays `authorityAvailable: false`, `execution.complete: false`, and `releaseReady: false`. C5 requires fresh different review and is not self-approved.

## C6 review remediation freeze

The different C5 review returned HOLD with 2 P1 and 1 P2 findings. C6 remediates the findings in the unchanged authorized four code/test files plus this log, without product, plan, runner, configuration, partition, binder, supervisor, C8, browser, build, network, database, or Git changes.

- Every mobile locale/theme application is now an exact setup phase derived from observed before values and requested after values. The phase records lab/state/phase identity, normalized observed `html.lang`, locale and theme before/after, whether the mobile menu was actually visible, the exact required category sequence, and the exact project physical-input sequences. Locale changes require optional visible-menu activation followed by selector and option; theme changes require one theme toggle; unchanged values require no corresponding tap. The validator derives the sequence independently, enforces plan-order cardinality across before-initial, after-reload, and all six visual axes for every lab, checks cross-phase before/after continuity, and proves the exact union of all setup-category physical entries. Missing, surplus, reordered, before-state, category-order, or phase-binding mutations fail.
- Every mobile vertical-swipe attempt now retains full before/after page geometry in addition to direction, four moves, signed displacement, and project-ledger identity. Initial, final, and every attempt geometry must have `scrollY` inside `[0, documentMaxScrollY]`, common positive maximum/viewport/tolerance, stable document-space root bounds, and internally consistent viewport/root coordinates. `targetReached` is recomputed independently from the attempt's after geometry. Only the last attempt may reach the landmark and no attempt may follow success; negative, above-maximum, maximum-drift, false-result, and post-success mutations fail.
- Every raw mobile tap, including locale/menu/theme setup, range calibration, mode, and reset, now carries exact x/y coordinates, live viewport dimensions, the fresh post-`scrollIntoViewIfNeeded` target rectangle, semantic target identity, and a successful `document.elementFromPoint` containment result captured before the physical tap. The validator requires finite positive viewport/rectangle geometry, coordinates inside both viewport and target rectangle, exact entry/tap target identity, and the physical method. Range taps reuse the calibrated live track coordinate and now include the same y/rectangle/hit-test proof. Coordinate, rectangle, target-identity, and hit-test mutations fail.

C6 TDD and source-only gates:

- Intentional C6 RED: 142 pass / 19 fail before implementation, isolated to the new setup-phase, vertical-geometry, and raw-tap assertions and mutations.
- `node --import tsx --test tests/e2e/china-mainland-g07-production-receipt.test.ts tests/e2e/china-mainland-g07-production-browser-source.test.ts` — PASS, 161/161, 0 fail/skip/todo.
- G07-targeted TypeScript compiler-program check using repository `tsconfig.json` options and the four authorized roots — PASS, 0 diagnostics.
- A full repository `npx tsc --noEmit --incremental false --pretty false` attempt reported six diagnostics only in the concurrently owned G02 C2 files and no G07 diagnostic. Root owns the settled full-repository rerun; no G02 file was changed here.
- Playwright `--list` remains deliberately skipped at the documented native prebuild/path-manifest boundary. These gates are source-contract evidence only and are not browser execution or browser coverage.

C6 frozen code-file SHA-256 values:

- `tests/e2e/china-mainland-g07-production-receipt.ts` — `4337500b8f7ba8d3964a8fc4e8e7b143ca3d9606126b4df55ef463f04f424173`
- `tests/e2e/china-mainland-g07-production-receipt.test.ts` — `ed71dd0f5cc3fd9556868323578d1e11dbb18dbb7a0ecafcde11f11a22a722f5`
- `tests/e2e/china-mainland-g07-production-browser.spec.ts` — `86380e900b9e0516de623cc35cf165b0e8dc81b74a98df60a021061f92018601`
- `tests/e2e/china-mainland-g07-production-browser-source.test.ts` — `72ed78eb34e7067b3ce5f7ea6018555d6df2cce986d551339e9736091b33b0bd`
- Approved plan source byte SHA-256 — `33e9e4c9c5b5cd68dbf21276e3d53aaa8074825dc611099e9a0e420e9570d700`; canonical plan SHA-256 remains `c7d41297e48880c149f25f3e7aac13ac1d16518175aa37dbd3aab6362e2cd477`.

The external blockers remain explicit and unchanged: trusted native dedicated-runner authority is unavailable, and current G07 product controls do not emit the required independent per-action learning events. `authorityAvailable`, `execution.complete`, and `releaseReady` remain false. C6 requires fresh different review and is not self-approved.

## C7 review remediation freeze

The different C6 review returned HOLD with 2 P1 and 2 P2 findings. C7 remediates those findings in the same authorized four code/test files plus this log. No product, plan, runner, configuration, partition, binder, supervisor, C8, browser, build, network, database, or Git operation was performed.

- Mobile setup now observes the menu trigger's exact `aria-expanded` value, the actual conditional panel visibility, and whether the top-level locale selector and theme toggle are visible and enabled. The producer does not tap the menu merely because its trigger is visible: the current Navbar exposes both controls directly, so the normal path records a closed menu and activates only the needed locale/theme controls. If a needed control is not actionable, the contract requires a closed-to-open trigger transition, verifies the panel and required controls, and restores the exact original closed observation before UI scanning. Receipt validation independently derives open/selector/option/theme/restore actions; deleted observations, boolean flips, forged opening, and physical union/order drift fail.
- The mobile receipt now contains one exact project-lifetime ordered physical-step projection. It simulates the real plan/runtime order lab by lab: before-initial setup, first and second interaction analytics, after-reload setup, remaining interaction analytics, each visual setup/reset, the first two-way horizontal analytics pair, and every vertical attempt. The projection is an exact union of physical ledger sequences and distinguishes setup, ordinary analytics, horizontal, and vertical steps. Moving setup to the end, or crossing an analytics/vertical step across a state, fails.
- Tap coordinates use half-open viewport and target-rectangle bounds. Every tap stores a deterministic target fingerprint, the raw `document.elementFromPoint` fingerprint, and the resolved hit-target fingerprint; the resolved hit target must equal the intended target fingerprint in addition to the existing containment proof.
- Range geometry is no longer sampled before the analytics action window. After the recorder's pre-action quiet interval, the action callback performs `scrollIntoViewIfNeeded`, captures the final bounding box/viewport/coordinate/hit proof, and then calls the real touchscreen tap with no intervening await. The bounded accepted/rejected reducer evidence and one-delivery-per-physical-action equality remain unchanged.

C7 TDD and source-only gates:

- Intentional C7 RED: 163 pass / 12 fail across 175 tests before implementation, isolated to the new menu, physical-order, half-open hit-proof, and range-capture assertions.
- Final combined command: `STARSHIP_E2E_TMP_DIR=/Volumes/Starship/.tmp/g07-c7-final2 node --import tsx --test tests/e2e/china-mainland-g07-production-receipt.test.ts tests/e2e/china-mainland-g07-production-browser-source.test.ts` — PASS, 176/176, 0 fail/skip/todo.
- G07-targeted TypeScript compiler-program check using repository `tsconfig.json` options and the four authorized roots — PASS, 0 diagnostics.
- Playwright `--list` remains deliberately skipped at the documented native prebuild/path-manifest boundary. These are source/contract checks only and are not browser execution or browser coverage.

C7 frozen code-file SHA-256 values:

- `tests/e2e/china-mainland-g07-production-receipt.ts` — `0641f8ee1076ef8ef21ff6a8a0a777706513ce46717524ca60ab4e719a5b4add`
- `tests/e2e/china-mainland-g07-production-receipt.test.ts` — `ad40a4d641e8d066a302dc7b71bc320cd1869ede8032e9af4003b232e28155a9`
- `tests/e2e/china-mainland-g07-production-browser.spec.ts` — `245c28cd7a3c420a5bd9f50e094e5ae7e4334cde52127583e63c1a4ce3855f10`
- `tests/e2e/china-mainland-g07-production-browser-source.test.ts` — `07661f7b840452d4c7a0bbdc4e06a1097cd95b0ec52e2b4e32d9456219d8e598`
- Approved plan source byte SHA-256 — `33e9e4c9c5b5cd68dbf21276e3d53aaa8074825dc611099e9a0e420e9570d700`; canonical plan SHA-256 remains `c7d41297e48880c149f25f3e7aac13ac1d16518175aa37dbd3aab6362e2cd477`.

The external release blockers remain unchanged and explicit: trusted native dedicated-runner authority is unavailable, and the current G07 product still emits zero required independent per-action learning-event deliveries. `authorityAvailable`, `execution.complete`, and `releaseReady` remain false. C7 is frozen for fresh different review and is not self-approved.

## C8 review remediation freeze

The different C7 review returned HOLD with 2 P1 findings. C8 remediates both in the unchanged authorized four code/test files plus this log, without product, plan, runner, configuration, partition, binder, supervisor, C8-adjacent release infrastructure, browser, build, network, database, or Git changes.

- Tap evidence now distinguishes the raw node returned by `document.elementFromPoint` from the intended target. The browser computes deterministic DOM-path-plus-attribute fingerprints, records `rawHitFingerprint` from the actual hit node, and serializes the exact ancestor fingerprint path from that node to the target, together with an explicit `targetIsHit` result. The validator independently requires a nonempty unique path, raw fingerprint at index zero, target fingerprint at the terminal ancestor, resolved-hit equality to that terminal target, and `targetIsHit` exactly when the path has one node. A foreign raw overlay, jointly forged target/resolved-hit pair, or deleted ancestor fails.
- Each range attempt now serializes its exact physical-input sequence plus target rectangle, touch y-coordinate, and viewport dimensions. It cross-binds the same physical entry's range category, lab/state/target, analytics delivery/event, x/y, rectangle, and viewport. `trackStartX` and `trackEndX` are independently recomputed from that same rectangle using the producer thumb formula `Math.min(10, width / 20)`. The fixture now uses the same rectangle-derived track instead of its previous unrelated `0..100` oracle. Sequence, delivery, formula, and coordinated `+1000` stale-geometry mutations fail.

C8 TDD and source-only gates:

- Intentional C8-only RED: 2 pass / 9 fail across 11 focused tests before implementation.
- Final combined command: `STARSHIP_E2E_TMP_DIR=/Volumes/Starship/.tmp/g07-c8-final node --import tsx --test tests/e2e/china-mainland-g07-production-receipt.test.ts tests/e2e/china-mainland-g07-production-browser-source.test.ts` — PASS, 187/187, 0 fail/skip/todo.
- G07-targeted TypeScript compiler-program check using repository `tsconfig.json` options and the four authorized roots — PASS, 0 diagnostics.
- Playwright `--list` remains deliberately skipped at the documented native prebuild/path-manifest boundary. These gates are source/contract evidence only, not browser execution or browser coverage.

C8 frozen code-file SHA-256 values:

- `tests/e2e/china-mainland-g07-production-receipt.ts` — `528c9ea40355ab2fe48cbc2bf16a0064370210621e3ef284e59604deee2daabd`
- `tests/e2e/china-mainland-g07-production-receipt.test.ts` — `b22c4e65a07e9dea544c089ab37140a016c7876c115fd9adee44fc739d343c8b`
- `tests/e2e/china-mainland-g07-production-browser.spec.ts` — `7327b6303c83d7a6e1522d49c8253763c6e3a6848285e8dde0623ff64c9c1cf6`
- `tests/e2e/china-mainland-g07-production-browser-source.test.ts` — `2431af5d07f3a2b2c69bb553fd22096d345bed0e8d568e1d4993f5422c84a1e6`
- Approved plan source byte SHA-256 — `33e9e4c9c5b5cd68dbf21276e3d53aaa8074825dc611099e9a0e420e9570d700`; canonical plan SHA-256 remains `c7d41297e48880c149f25f3e7aac13ac1d16518175aa37dbd3aab6362e2cd477`.

The two external release blockers remain unchanged: no trusted native dedicated runner exists, and the current G07 product still emits zero required independent per-action learning-event deliveries. The executable receipt remains `authorityAvailable: false`, `execution.complete: false`, and `releaseReady: false`. C8 is frozen for fresh different review and is not self-approved.

## C9 review remediation freeze

The different C8 review returned HOLD with one P1 coordinated fingerprint self-attestation finding. C9 remediates it in the same authorized four code/test files plus this log. No product, approved-plan, runner, configuration, partition, binder, supervisor, C8-adjacent release infrastructure, browser, build, network, database, Git, or non-Starship cleanup operation was performed.

- Every physical tap now serializes three distinct raw identity surfaces: the actual `document.elementFromPoint` node, the intended locator element, and the exact element-by-element ancestry from the raw hit to the target. Each identity is an exact-key record over normalized tag, implicit/explicit role, id, name, type, aria-label, and G07 mode/range/reset data attributes. The public validator recomputes every SHA-256 identity fingerprint and requires raw/terminal identity equality with the ancestry endpoints; caller-supplied fingerprint strings can no longer self-attest.
- The intended target is validated independently from the tap-evidence fields. The validator indexes the exact ordered physical-step projection by physical sequence, cross-binds its step kind/lab/state/reference, derives the analytics target from the already plan-validated runtime subaction or the exact setup phase/category, and switches on the physical category to construct the required DOM contract. Mode buttons require exact `data-viz-mode-button` and planned mode ID; ranges require the planned `data-viz-parameter`, range input/slider semantics, and a nonempty live id; reset requires exact model/module/topic attributes; locale/menu/theme controls require their exact source-localized aria label, role, tag, and type for the observed setup transition.
- The bounded source selection advances to `china-mainland-g07-selected-critical-sources.v2` and adds the exact Navbar, LanguageToggle, ThemeToggle, and i18n sources that produce these target identities. It remains explicitly `transitiveClosureClaimed: false`; the release remains blocked and no recursive-closure claim is introduced.
- Mutation coverage now rejects a coordinated foreign raw/target/ancestry identity with every fingerprint recomputed, a theme-toggle identity substituted for the locale selector, and a reset role changed while the target and terminal fingerprints are jointly recomputed. Existing foreign-hit, ancestry, geometry, plan, analytics, durability, retry, skip, authority, and release-readiness mutations remain green.

C9 TDD and source-only gates:

- Intentional focused C9 RED: 1 pass / 6 fail across 7 tests before implementation, isolated to the new raw-identity, independent target-contract, and coordinated-forgery assertions.
- Focused GREEN after implementation: 7/7 PASS. A first combined regression exposed one obsolete C6 test assertion that still compared the new structured target identity with the old semantic string; the assertion was migrated to recompute the target fingerprint and the focused C6/C8/C9 regression passed 9/9.
- Final combined command: `STARSHIP_E2E_TMP_DIR=/Volumes/Starship/.tmp/g07-c9-final3 node --import tsx --test tests/e2e/china-mainland-g07-production-receipt.test.ts tests/e2e/china-mainland-g07-production-browser-source.test.ts` — PASS, 194/194, 0 fail/skip/todo.
- G07-targeted TypeScript compiler-program check using repository `tsconfig.json` options, explicit workspace alias base, and the four authorized roots — PASS, 0 diagnostics.
- Playwright `--list` remains deliberately skipped at the documented native prebuild/path-manifest boundary. These gates are source/contract evidence only and are not browser execution or browser coverage.

The two external release blockers remain unchanged: trusted native dedicated-runner authority is unavailable, and current G07 product controls still emit zero required independent per-action learning-event deliveries. The executable receipt therefore remains `authorityAvailable: false`, `execution.complete: false`, and `releaseReady: false`. C9 requires fresh different review and is not self-approved.

## C10 review remediation freeze

The different C9 review returned HOLD with 0 P0, 4 P1, and 0 P2 findings. C10 remediates the four P1 findings in the unchanged authorized receipt/test/browser/source-test files plus this log. No product, approved-plan, runner, configuration, partition, binder, supervisor, release infrastructure, browser, build, network, database, Git, or non-Starship temporary-file operation was performed.

- Range target authentication now derives the exact control ID from the physical plan target `range:<controlId>:<endpoint>`. Both the untrusted structural validator and fixture require the real DOM `data-viz-parameter=<controlId>` rather than the earlier impossible `<controlId>:<endpoint>` value.
- The zh-Hans light-theme target now matches the exact product label `切换至浅色模式`.
- Range identities normalize DOM `id` to `null` in the browser producer, fixture, and structural validator. A caller-selected range ID is no longer admitted into the authenticated identity surface.
- Receipt validation is split into `validateG07UntrustedStructuralReceipt`, whose name limits it to untrusted fixture/schema and mutation inspection, and `validateG07ProductionBrowserReceipt`, the public production boundary. The browser producer still calls the public boundary. After structural inspection, that public boundary always fails closed with an explicit native-physical-provenance-unavailable error because caller-sealed JSON and its caller-computable SHA-256 cannot authenticate browser hit-testing, exact DOM ancestry, or geometry. Consequently the browser producer cannot attach or claim completed production evidence until a trusted native authority exists.
- New public-boundary mutation canaries re-seal (1) a coordinated foreign raw hit plus arbitrary ancestry ending at the planned target and (2) a coordinated in-viewport one-pixel range geometry translation. Both are rejected at the production boundary. Structural tests continue to exercise every legacy schema, plan, analytics, ACK, session, durability, geometry, locale/theme/menu, vertical/horizontal, retry/skip, diagnostics, authority, and readiness mutation without relabeling those fixtures as physical production proof.

C10 TDD and source-only gates:

- Intentional focused RED before implementation: 0/9 pass and 9/9 fail. The failures were the two source-split/identity assertions, real range control-only identity, exact zh-Hans light label, range `id: null`, baseline public fail-closed provenance, and the two coordinated re-seals.
- Focused GREEN after implementation: `STARSHIP_E2E_TMP_DIR=/Volumes/Starship/.tmp/g07-c10-green TMPDIR=/Volumes/Starship/.tmp node --import tsx --test --test-name-pattern='G07 C10' tests/e2e/china-mainland-g07-production-receipt.test.ts tests/e2e/china-mainland-g07-production-browser-source.test.ts` — PASS, 9/9, 0 fail/skip/todo.
- Final combined command: `STARSHIP_E2E_TMP_DIR=/Volumes/Starship/.tmp/g07-c10-full TMPDIR=/Volumes/Starship/.tmp node --import tsx --test tests/e2e/china-mainland-g07-production-receipt.test.ts tests/e2e/china-mainland-g07-production-browser-source.test.ts` — PASS, 203/203, 0 fail/skip/todo. This retains the frozen 194 C9 tests and adds nine C10 tests/subtests.
- G07-targeted TypeScript compiler-program check using repository `tsconfig.json` options, explicit workspace alias base, and the four authorized roots — PASS, 0 diagnostics.
- No Playwright/browser execution or build was attempted. These remain source/contract checks, not physical browser coverage or release evidence.

C10 frozen code-file SHA-256 values:

- `tests/e2e/china-mainland-g07-production-receipt.ts` — `6439f5df5851f7fb6972b3748eb72b66b536d467b292b51e7b3b47f81fca9f8a`
- `tests/e2e/china-mainland-g07-production-receipt.test.ts` — `05d0cb89b20055baf8183f82e9118b5654c8aa97166326849a022d94b7cde059`
- `tests/e2e/china-mainland-g07-production-browser.spec.ts` — `6c064c742f77ab707bc73a9a8c3c9061b5bb68662e67825e56977694bfb4f164`
- `tests/e2e/china-mainland-g07-production-browser-source.test.ts` — `d7f7dc07f5c1758369d500e3e04624b5d157ac210d5b5004e3aa64a1b185c9b2`
- Approved plan source byte SHA-256 remains `33e9e4c9c5b5cd68dbf21276e3d53aaa8074825dc611099e9a0e420e9570d700`; canonical plan SHA-256 remains `c7d41297e48880c149f25f3e7aac13ac1d16518175aa37dbd3aab6362e2cd477`.

The exact seven-lab plan and aggregate 84 visual / 548 interaction state totals remain structurally enforced. The external release blockers remain explicit: trusted native physical authority is unavailable, and current G07 controls still emit zero required independent per-action learning-event deliveries. `authorityAvailable`, `execution.complete`, and `releaseReady` remain false. C10 is frozen for a fresh different review and is not self-approved.
