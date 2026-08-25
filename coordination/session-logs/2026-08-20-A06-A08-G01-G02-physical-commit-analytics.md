# 2026-08-20 A06/A08 G01/G02 physical-commit analytics

- Lanes: A06 Visualization Lab product integration and A08 shared analytics state.
- Worktree: `/Volumes/Starship/MAIS-china-viz-labs-wt`.
- Authorized scope: the dedicated G01/G02 learner components, their narrow configured host adapter, `AppProviders`, `lib/learningAnalytics.ts`, focused product/helper tests, and this log. No API route, public event type/schema, G03-G06 producer, browser-contract, runner, config, build, browser, network, database, or Git mutation was performed.

## Outcome

- G01 `MultiDigitOperationsLab` now records exactly one `visualization-slider` on each of its three native range `pointerup` commits and each allowed native range-adjustment `keyup`, including unchanged/no-op commits. Its operation buttons, estimate-operation select, and rounding-place select each record one `visualization-probe`; reset records one `visualization-reset`. Range `onChange` remains state-only.
- G02 `DecimalArithmeticLab` now records exactly one `visualization-slider` on each native `pointerup` commit and each allowed native range-adjustment `keyup` for all four range controls. This includes every mobile calibration tap and native no-op tap. Operation choices record one `visualization-probe`; reset records one `visualization-reset`. Range `onChange` remains state-only.
- `ConfiguredVisualizationLab` passes the dedicated callback to exactly the G01 and G02 branches. It uses the live catalog `analyticsSource` and `topicId`; `AppProviders.recordLearningEvent` supplies the authenticated student identity and selected grade. G03-G06 and all generic/dedicated siblings receive no new callback.
- The A08 adapter adds the explicit `preservePhysicalCommit` option only for G01/G02 slider/probe commits. Reset remains on the ordinary non-high-frequency path. Default callers retain the prior semantic coalescing path.
- The private physical marker is a symbol plus monotonic capture sequence. It is stripped before the public API request, is absent from persisted JSON and receipts, and is recovered only from the private exact-user outbox record key. Each preserved physical commit has its own durable key and singleton delivery batch, preserving order through restart, in-flight delivery, failure/retry, ACK, and readback without replaying or deleting a sibling commit.
- C2 remediation now rewrites every opted-in physical commit to a fresh, server-visible `physical:<UUID>` event ID at capture. Reused caller IDs and the resettable private sequence therefore cannot collide in the outbox, client merge, ACK set, or server idempotency key across reloads. The caller ID is not exposed through a second field or schema extension.
- The settings-context projection now clones every event through the delivery sanitizer. Internal state retains the private Symbol needed for ordering/coalescing, while public consumers receive zero Symbol keys.
- Range `keyup` telemetry now uses an exact native range-key allowlist: the four Arrow keys, Home, End, PageUp, and PageDown. Tab, character keys, modifier keys, and modified key combinations do not emit telemetry. Pointer-up behavior, including an unchanged native no-op, remains exactly one event.
- A final mixed same-millisecond audit found and closed a non-transitive ordering gap: default records sort before preserved physical records at an equal timestamp, while preserved records sort by their capture sequence. Default-only timestamp/ID order remains unchanged.

## Strict TDD evidence

- Baseline before product wiring: existing G01/G02/dispatch component tests passed `19/19`.
- A08 helper/runtime RED then GREEN rounds covered:
  - absent `preservePhysicalLearningAnalyticsCommit` helper;
  - opt-in no-coalesce mixed with unchanged default coalescing and no-op commits;
  - marker stripping from public delivery and stored JSON;
  - exact-user durable readback, independent failure retention and ACK;
  - same-millisecond physical sequence across restart;
  - singleton delivery selection and the explicit `AppProviders` source path.
- A06 component contract first ran `1 pass / 1 fail` because G01/G02/host wiring was absent. After the minimal component and host implementation it passed `4/4`, including zero events on SSR/render/state derivation and no callback in the G03-G06 host branches.
- The mixed default/physical same-millisecond extension was independently RED: actual order was `a-second-physical-id, m-default-peer, z-first-physical-id`. The minimal total-order comparator correction turned it GREEN with `m-default-peer, z-first-physical-id, a-second-physical-id`.
- C2 collision RED proved that two preserved events with the same caller ID had no collision-safe creation API. GREEN rewrites their public IDs before persistence, then proves same-millisecond order across restart, an append while the first event is in flight, failed delivery retention, first ACK sibling preservation, second batching, and final ACK deletion.
- C2 public-projection RED found no marker-free settings projection helper. GREEN proves the internal event has a Symbol while its public clone has none, and the provider source contract proves that only the clone reaches `SettingsContext`.
- C2 keyboard RED first found no dedicated range-key commit path. The positive slice added all eight native adjustment keys; a second RED showed unrelated and modified keyups still emitted, and the allowlist turned that slice GREEN. A separate component-contract RED then drove G01/G02 wiring without adding any `onChange` analytics call.

## Final pure gates

- Combined full analytics plus focused G01/G02/helper/component/dispatch gate: `109/109` GREEN.
- Full `lib/learningAnalytics.test.ts`: `84/84` GREEN.
- G01/G02 production browser-source and receipt validators, without Playwright/browser execution: `312/312` GREEN. These confirm the production request/HTTP-200 ACK schema and exact source/topic/user/event-ID ownership contract; they do not claim browser coverage.
- Whole-tree `tsc --noEmit --pretty false --incremental false`: GREEN with exit `0` and no diagnostics. Cache and temp directories were redirected under `/Volumes/Starship/g01-g02-c2-tdd-fHNW3FB0`.
- `next-env.d.ts` remained byte-stable at `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`.

## Frozen implementation and focused-test hashes

- `lib/learningAnalytics.ts`: `eca1db7e3a31a32c085bdb062f30d7290a83d5bab4efb33701b80a1993e381db`
- `lib/learningAnalytics.test.ts`: `176d45ed4e86b976249bfe6d87d581fc76b321a3d5b0cd27c102f12eeae56934`
- `components/providers/AppProviders.tsx`: `79264ccd8fdd77d81777df1b4f88d36655eb8e10a7bef044eae9d336ce6e4169`
- `components/visualizations/ConfiguredVisualizationLab.tsx`: `4d3e8cf8bea320a75e7f7e9ad22d9b2183903e7bbdb6eba379e75bc4841dc68b`
- `components/visualizations/mainland/MainlandPhysicalCommitAnalytics.ts`: `2ec901a26b37845aaded16fb2d68693477904d8ff8c068cbeaac2b7d8fb3f104`
- `components/visualizations/mainland/MainlandPhysicalCommitAnalytics.test.ts`: `b132756f0d2625594b1aed81f9b01279486f36e6c51c1543045c77b1e8cac02e`
- `components/visualizations/mainland/MainlandPhysicalCommitComponentContracts.test.tsx`: `23c08db8436617feb17e9463938ce0aafb8d36a06be32544ae55ce14bc97db38`
- `components/visualizations/mainland/MultiDigitOperationsLab.tsx`: `3f3c96b1f29d7fbf269e705e6fe1096462379f029b9ac0fb0fa3e0c351acf4d0`
- `components/visualizations/mainland/DecimalArithmeticLab.tsx`: `7e6146510dcbc4fdf205c268ded1937ade06e7f79e21904d53b78b5b84dcd12e`

## G03-G06 non-regression boundary

- G03 `SignedRealNumberLineLab.tsx`: `1d244020c0f1cd8d17a67c8311eb8e7891dc005e9e35a869e39de95697d30986`; filesystem modification time remains `2026-08-11T17:06:09+0800`.
- G04 `FractionOperationsLab.tsx`: `44a8a7b8daf3ebb4f7775de5b2b6749a4fd912e1a3870c3dfcbd5a482ad5eccd`; modification time remains `2026-08-11T18:12:07+0800`.
- G05 `PercentApplicationsLab.tsx`: `668c0530b6bb40922266cffd0849a2769d787ff43ca7483f6783faaf5290ca2d`; modification time remains `2026-08-11T15:43:57+0800`.
- G06 `RatioProportionScaleLab.tsx`: `869e6f6a126c40cae63e8847029ac48e5ccc6e3bc400fbd9a650c7155934b705`; modification time remains `2026-08-11T17:28:10+0800`.
- Those producer bytes were untouched by this 2026-08-20 slice. The host source contract proves that their branches contain no `onLearningEvent`, and the analytics suite proves that generic/default high-frequency events retain the original semantic coalescing behavior.

## Handoff

- No browser/build/Git/network/database action was run. The pure gates are not browser or release evidence.
- The server route remained out of scope and unedited; its final observed hash is `a0998057c4978fdc041b0ca4ef450121810253e1783cdc4607f91bde334be073`.
- Editing state: frozen pending a DIFFERENT-agent code review. This A06/A08 author has not self-approved.
