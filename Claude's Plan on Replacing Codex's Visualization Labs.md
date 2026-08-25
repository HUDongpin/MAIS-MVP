# Claude's Plan on Replacing Codex's Visualization Labs

**Date:** 2026-08-25
**Author:** Claude (Fable 5), from a full read of the visualization-lab runtime, data registries, lesson pipeline, and coordination records
**Scope:** US California math curriculum only (`us-ca-math-*` topics, publisher `US_CA_MATH`). Arkansas, Florida, North Carolina, Hong Kong, and Mainland tracks are explicitly out of scope.
**Goal:** Every visualization a California student reaches should be a Claude-family lab — curriculum-aligned, mathematically exact, mutation-audited, and easy to use. Codex-family labs leave the California experience.

---

## Implementation status (2026-08-25, branch `claude/ca-codex-viz-replacement`)

| Phase | Status | Notes |
|---|---|---|
| 1 — lesson embeds → signature benches | **Done** | `LessonSignatureLab` + per-bench importer map; registry flip in `LessonView`; regression tests pin the wiring and bundle boundaries. Owner decisions applied as recommended: EN benches in localized chrome, primary bench only. |
| 2a — CA premium-3D descope | **Done** | 12 launch rows removed; `california` band pinned 0-0; retired URLs redirect to `/visualization-lab?lab=<id>`; contract tests updated (also healed the pre-existing premium-module violation in `threeDSceneMath.catalog.test.ts`). |
| 2b — Claude 3D benches | Open | One `claude/bench-3d-*` branch per concept (G-GMD solids, 3D distance, N-VM vectors), per §3 Phase 2 step 2. |
| 3 — gap benches | Open | Priority order per §3 Phase 3: G-GMD.2 Cavalieri, N-CN.8, study-design cluster, grade-3 fluency set. Each its own `claude/bench-*` branch with a mutation-tested audit. |
| 4 — truthfulness & teardown | **Done** (this branch) | Safeguard/student-note copy now describes the bench where one renders; lesson block copy names the bench; COVERAGE.md surface map updated. Left in place pending A06-lane confirmation: `generated/premiumThreeDDirectCatalog.generated.ts` (orphaned — no importers, generator script absent) and `usesAuditedTwoDimensionalValueRenderer`'s dead s6-ch04 special case. |
| Post-plan verification (2026-08-25) | **Done** | Math verification (all 192 audits + 44 edited-bench diff review; 3 defects fixed) and curriculum-alignment audit (all 76 primaries deep-read + adversarially verified; **12 primaries re-anchored** — Appendix A's primary column is superseded for those rows by `data/signatureLabAssignments.ts`). Records: `coordination/content-qa/2026-08-25-*`. |

---

## 1. The two lab families, and how to tell them apart

| | **Claude family — "signature benches"** | **Codex family — "configured template labs"** |
|---|---|---|
| Code home | `components/visualizations/signature/*.jsx` (387 files: 192 benches + audits/manifest) | `components/visualizations/ConfiguredVisualizationLab.tsx` (one 3,787-line renderer, 18 template types) + `components/visualizations/three/` (3D canvas stack) |
| Origin | Ported byte-for-byte from the Claude Math Visual library (187 benches) + 5 MAIS-authored benches in the same house style | Original Codex app snapshot (2026-05-28 "Initial local project snapshot") and A06 (Codex) integration slices |
| Aesthetic | Light "paper" canvas surface (`#fbfbf8`), staged `STEPS` lesson flow, dials that unlock per step, predict-then-check, one calibration capstone | Dark-chrome SVG/3D panels, sliders, accent neon palette (`#22d3ee`, `#facc15`, …), "Read me first" note, generic per-template formula strip |
| Mathematical guarantees | Every bench ships an `audit-*.mjs` machine proof — model sliced from the shipped file, every quiz key re-derived, calibration stamp proven exact (integer / reduced-fraction equality), mutation-tested (e.g. 18 seeded defects, 18 caught) | Keyword-matched template heuristic (`templateForTopic`) picks 1 of 18 generic scenes per topic; no per-topic mathematical proof; alignment text is generated |
| Registration | `signatureLabIds` + `SignatureLabRoutes` (tsc-enforced via `satisfies`) + `data/signatureLabAssignments.ts` (primary + related per topic, with rationale) | `data/visualizationLabs.ts` `createTopicLab()` fan-out over all topics |
| Renderer contract | `SignatureLabAdapter` supplies surface/mark probes, analytics, reset-by-remount; each bench is its own ~50KB dynamic chunk | Self-contained; hosts the 2D/3D toggle (`ThreeDLabCanvas` mounts inside it) |

A quick fingerprint when auditing any surface: a light paper canvas with staged steps and a "CALIBRATED" stamp is Claude; a dark slider panel with an accent-colored formula strip (or any Three.js scene) is Codex.

---

## 2. Findings — every Codex lab a California student can still reach

The Visualization Lab hub is **already fully Claude** for California: all 76 `us-ca-math-*` topics in `visualizationLabCatalog` resolve `moduleId: "signature-lab"` (verified by enumeration on 2026-08-25 — `{"signature-lab": 76}`, zero configured), and the hub's curriculum scoping (`labMatchesLearnerCurriculum`) shows a `US_CA_MATH` student only those 76. The Codex family survives in California on **two surfaces plus one text layer**:

### Finding A — All 76 California lesson embeds render the Codex template lab (the big one)

Every one of the **76 California lesson seeds** embeds a visualization block (`californiaVisualizationBlock` in [data/usCaliforniaLessons.ts:422](data/usCaliforniaLessons.ts:422)), placed before checkpoint practice. The block correctly carries `moduleId: "signature-lab"` — but the lesson renderer deliberately maps it back to the Codex renderer:

```ts
// components/lesson/LessonView.tsx:583
"configured-visualization-lab": ConfiguredVisualizationLab,
// Scope boundary (Phase 0): signature benches render on the Visualization Lab
// page only. In-lesson embeds keep the template renderer, so a signature topic
// shows its bench in the lab and the template inside the lesson. Deliberate —
// wiring the lesson embed is Phase 1 and needs its own regression evidence.
"signature-lab": ConfiguredVisualizationLab
```

So a California student sees the Claude bench in the hub and **the Codex template for the same topic inside every lesson**. This is the documented-but-never-executed "Phase 1". It is the largest and cheapest-to-close Codex surface: 76 lessons × 15 Codex template variants (distribution: 12 number-line, 11 equation-balance, 8 statistics-distribution, 7 fraction-bar, 6 base-ten, 6 function-family, 5 angle-geometry, 5 array-area, 4 measurement-scale, 4 coordinate-transform, 2 each probability-simulation / function-graph / right-triangle-pythagorean, 1 each clock-money-data / trig-unit-wave).

The complete 76-row topic-by-topic inventory (Codex template now shown in the lesson vs. the Claude bench that should replace it) is **Appendix A**.

### Finding B — 12 California premium-3D experiences are Codex-built

Twelve senior CA topics (S2–S6) are premium-3D launch labs. Three distinct Codex artifacts serve them:

1. **The direct route** `/student/tools/visualizations/[labId]` → `PremiumThreeDDirectRouteShell` + the Three.js scene stack (`components/visualizations/three/`), statically generated via `buildPremiumThreeDTopicStaticParams()`.
2. **The in-lab 3D canvas**: `ThreeDLabCanvas` mounts *inside* `ConfiguredVisualizationLab` ([ConfiguredVisualizationLab.tsx:3617](components/visualizations/ConfiguredVisualizationLab.tsx:3617)) when `threeD.enabled` — so the Finding-A lesson embeds also expose the Codex 3D view on these 12 topics.
3. **Hand-written CA rows** in `components/visualizations/premiumThreeDDirectLabs.ts`: the 12 topic ids in two template maps (lines ~225–236 and ~245–256) and a fully hand-authored `FeaturedLabDefinition` for `us-ca-math-s4-chapter-05` with `moduleId: "configured-visualization-lab"` — the direct 3D route for Conditional Probability bypasses the signature system entirely.

The 12 topics: `s2-ch02, s3-ch02, s3-ch03, s4-ch04, s4-ch05, s5-ch01, s5-ch02, s5-ch03, s6-ch02, s6-ch03, s6-ch04, s6-ch05` (flagged **YES** in Appendix A). Every one already has a rigorous Claude signature primary (`FunctionLab`, `ExponentialFunctionLab`, `QuadraticEquationLab`, `ConditionalLab`, `UnitCircleLab`, …).

Context: the 3D/Manim stack is an active **Codex A06 lane** (archive record `coordination/release-intake/2026-08-23-A25-a06-ca-visualization-labs-loop-evidence-archive.md`; active branch `codex/a06-ca-viz-resume-20260819`; PR #136 landed a bounded 61-path CA runtime slice). Phase 2 below must coordinate with that lane, not race it.

### Finding C — Codex-era text still describes the template even where the bench renders

`californiaStudentNoteForTopic` and the heuristic safeguard reviews (`data/visualizationLabs.ts` ~2270–2285) generate "Read me first: This ‹template category› is a deterministic California standards-aligned practice visualization…" from the **template id** — text that is attached to all 76 CA labs, including the ones now rendering a signature bench. After Phase 1 this copy is doubly wrong (wrong renderer described in lessons too). Truthfulness cleanup is Phase 4.

### Explicitly NOT Codex-in-CA (no work needed / out of scope)

- **Hub lab cards for CA** — already 100% signature (verified enumeration).
- **Lesson illustrations** (`usCaliforniaLessonIllustrations.ts`, `usCaliforniaHighSchoolLessonIllustrations.ts`, `usCaliforniaPracticeFigures.ts`) — static SVG figures inside lesson prose, not interactive labs. Excluded from this plan's definition of "visualization lab"; flag for a separate aesthetic review if desired.
- **Other US states** (AR/FL/NC keep the template renderer by design — no CCSS join key), **HK/Mainland/Capstone** tracks.
- The four calculus benches (`DerivativeLab`, `IntegralLab`, `LimitLab`, `SeriesLab`) stay homeless — CCSS-M has no calculus standards; curriculum fact, not a gap.

---

## 3. Replacement plan

Four phases, each an independent branch/PR with its own regression evidence, ordered by student impact per unit risk. Phases 1 and 2 remove Codex labs; Phase 3 raises the Claude library's curriculum coverage; Phase 4 makes the record truthful and retires dead Codex code.

### Phase 1 — Flip all 76 California lesson embeds to the Claude signature bench

**Outcome:** the lesson block that today renders `ConfiguredVisualizationLab` renders the topic's signature primary through `SignatureLabAdapter`, for CA topics only. One student-visible change, 76 lessons at once, fully revertible by a one-line registry change.

Implementation sketch (small, surgical):

1. Add a `LessonSignatureLab` client component: resolve `getSignatureLabAssignment(topicId)` → look up the bench in the same dynamic-import registry the hub uses (`SignatureLabRoutes`), wrap in `SignatureLabAdapter` via `createSignatureLab`, `ssr: false`, per-bench chunk. Fall back to `ConfiguredVisualizationLab` when the topic has no assignment — this keeps every non-CA track byte-identical by construction, since `signatureLabAssignments` contains only `us-ca-math-*` keys.
2. Point the `"signature-lab"` entry of `lessonVisualizationRegistry` ([LessonView.tsx:588](components/lesson/LessonView.tsx:588)) at it. `StudentLessonPage.resolveVisualizationLabForLesson` already ships the right `FeaturedLabDefinition` server-side; no data plumbing changes.
3. Decide (owner call, see §5) whether the lesson embed shows only the primary bench or also the `related` chip switcher. Recommendation: **primary only** in lessons — the lesson block is a focused pre-practice station; the fan-out belongs in the hub.

**Must-verify list before merge** (each is a known contract, not a guess):

- **Completion/analytics parity.** `SignatureLabAdapter` emits `visualization-probe` and `visualization-reset`. Confirm what the lesson block uses to mark the visualization step complete (`visualization-complete` consumers: gamification quests, assignments, learning-path steps) and wire the same emission the template path produces, or lesson/quest progress silently regresses.
- **Ready-probe & snapshot contracts** (`data-viz-surface` / `data-viz-mark`) — the adapter already supplies them; confirm the lesson page's probe (if any) matches the hub's.
- **Bundle boundaries.** Extend `visualizationBundleBoundaries.test.ts`: benches must stay out of the shared lesson bundle (each bench is its own ~50KB chunk; 76 lessons must not pull 192 chunks eagerly).
- **Localization.** Verified: **0 of 387 signature files contain CJK text** — benches are English-only, light-paper by decision D2, while lessons serve zh/zhHans UI too. Options: (a) accept EN bench inside localized chrome (adapter already localizes frame + reset button), (b) keep the template for zh/zhHans sessions. Recommendation: **(a)** — California is an English-curriculum track and the hub already shows these benches to the same students untranslated; but this is an owner decision (§5).
- **The 12 premium-3D topics** keep their 3D affordance through the lesson embed only if we keep `ConfiguredVisualizationLab` mounted — they won't after the flip. That is the intended direction (Phase 2 decides the 3D fate); note it in the PR so it reads as a decision, not a regression.

**Evidence for the PR:** targeted vitest (new lesson-embed regression spec mirroring `visualizationLabPageRegressions.test.ts`), `npm run type-check`, Playwright e2e on three lessons spanning the range (a K micro-lesson, `us-ca-math-p6-chapter-02`, `us-ca-math-s5-chapter-03`) in the honest isolated-app mode, plus before/after screenshots. Beware the two known e2e traps: stale `.next` build state fails every Playwright run (delete the stale dist first), and dev-vs-production isolated-app modes must match the spec's assumptions.

### Phase 2 — Retire or rebuild the 12 Codex premium-3D California experiences

**Outcome:** no California route serves an unaudited Codex 3D scene as the topic's mathematical model.

Recommended sequence:

1. **Short term (with Phase 1): descope California from the premium-3D launch list.** Remove the 12 CA ids from `premiumThreeDLaunchLabIds` / the two CA template maps / `usCaliforniaS4ConditionalProbabilityLab`, and have `/student/tools/visualizations/<ca-lab-id>` redirect to the hub's signature bench for that topic (avoid 404s — the route is statically generated and linked from dashboards and Manim review routes). **Gate:** `validateThreeDLaunchCoverage()` enforces min/max regional bands including `california` — the descope PR must adjust `threeDLaunchCoverageRequirement.regionalCounts` in the same commit or the coverage contract test fails.
2. **Medium term: rebuild genuinely-3D concepts as Claude benches.** Only where 3D is the mathematics, not decoration — the depth audit and the 3D suggestions memo (2026-08-11) already scoped this: solids/cross-sections (`G-GMD`, incl. the uncovered `G-GMD.2` Cavalieri argument), 3D distance, vectors (`N-VM`). Method per that memo: Professor Hu's interactive-math-bench skill as the primary standard (staged STEPS, dials, predict-then-check, exact-arithmetic calibration) + the 3blue1brown handbook layer for camera/anchor/color discipline, on the react-three-fiber stack already in the repo; each new 3D bench ships a mutation-tested `audit-*.mjs` like the 2D benches. Skip img2threejs (evaluated and rejected).
3. **Coordination guardrail:** the `three/` + Manim stack is Codex lane A06's active territory with an unresolved evidence archive. Before deleting any shared 3D file, check `codex/a06-ca-viz-resume-20260819` and the A25 archive record; prefer *descoping CA ids from registries* (pure data change) over deleting runtime files other tracks and lanes still use.

### Phase 3 — Close the curriculum gaps no lab covers (the "more aligned, more rigorous" half)

Replacing Codex labs with existing benches gets California to the signature library's current ceiling: **329/385 CCSS-M standards reachable (85%)**. The remaining gaps are where new Claude benches raise alignment beyond anything the Codex family ever offered. Priority order from the 2026-07-25 depth audit:

| Priority | Gap | Build |
|---|---|---|
| 1 | `G-GMD.2` (nothing at all) | Cavalieri bench — two stacks of slices, shear one, equal cross-sections ⇒ equal volume; sits beside `PyramidLab` without colliding (dissection vs. cross-section are different arguments) |
| 2 | `N-CN.8` (nothing at all) | Extend `ComplexArithmeticLab` (MAIS-authored, already carries N-CN.3–6) or add a small factoring-over-ℂ bench |
| 3 | Study design — `S-IC.2/.3/.5/.6`, `S-MD.6/.7` (0 of 6 anywhere) | One randomization/simulation-design bench (survey vs. experiment vs. observational; simulate the null) — the only categorically absent cluster |
| 4 | `3.OA.3`, `3.OA.7`, `3.NBT.3` (flagged in assignment rationales as "build work, deliberately not faked") | Word-problem-to-equation and fluency benches at grade 3 |

House rules (non-negotiable, learned the hard way and recorded in `signature/COVERAGE.md`): exact-arithmetic calibration stamps only; structural test assertions, never word-ban distinctness checks; a CCSS tag may be added in `signatureLabCcssOverrides.ts` **only if** the bench's own lesson teaches that standard; extend an existing override entry rather than adding a duplicate key (TS1117 guards this); register each bench in `signatureLabIds` + `SignatureLabRoutes` + a chapter/related list; re-run `scripts/build-signature-lab-candidates.ts` rather than hand-editing assignments.

### Phase 4 — Truthfulness and teardown

1. Regenerate CA `studentNote` / safeguard copy to describe the **bench** that actually renders (Finding C), or derive the note from `moduleId` at build time so it can never drift again.
2. Remove now-dead Codex CA artifacts: the CA rows in `premiumThreeDDirectLabs.ts` maps, `usCaliforniaS4ConditionalProbabilityLab`, CA-specific template overrides that no longer influence any rendered surface (`topicTemplateOverrides` CA rows — verify nothing else reads `templateId` first: the 3D fallback and analytics `source` still do until Phase 2 lands; delete only after both phases).
3. Update `signature/COVERAGE.md` with the new surface map (hub + lessons + 3D fate) and refresh the numbers via the generator.
4. Start watching `npm run report:bench-usage -- --file <export>` `switchRate` after Phase 1 — lesson embeds will multiply bench opens; near-zero switch rate tells us whether `related` fan-out needs a lesson-side entry point after all.

---

## 4. Sequencing, branches, and governance

| Phase | Branch (one worktree each, per session contract) | Size | Depends on |
|---|---|---|---|
| 1 | `claude/ca-lesson-signature-embeds` | ~1 new component, 1 registry line, tests | — |
| 2a | `claude/ca-premium3d-descope` | data/registry only + coverage-band edit + redirect | 1 (messaging) |
| 2b | `claude/bench-3d-<concept>` (one per bench) | 1 bench + audit each | 2a |
| 3 | `claude/bench-<standard>` (one per bench) | 1 bench + audit each | — (parallel) |
| 4 | `claude/ca-viz-truthfulness` | copy + teardown + COVERAGE.md | 1, 2a |

- Work in sibling worktrees (`../MAIS-<scope>-wt`), never the integration root; record owner / target PR / creation + closeout dates per the A25 lifecycle rules; push the first reviewable commit with `-u` promptly; remove each worktree the same day its PR lands.
- **Frozen `package.json` scripts** — no new npm scripts; any new checker runs via `npx tsx scripts/...` like `build-signature-lab-candidates.ts` does.
- Do not mutate anything under the A06/A22 evidence boundary (`archive/a06-ca-visualization-labs-loop-wip-20260823`, the residual `/Volumes/Starship/MAIS-ca-viz-labs-wt` directory, the consumed browser-authorization receipt).
- Rollback story: Phase 1 reverts with one registry line; Phase 2a reverts by restoring registry rows + bands; every assignment change stays per-line revertible in `signatureLabAssignments.ts` as designed.

## 5. Decisions needed from the owner before Phase 1 merges

1. **zh/zhHans lesson sessions:** accept English-only benches inside localized chrome (recommended — matches the hub today), or keep the Codex template for Chinese-language sessions?
2. **Lesson embed fan-out:** primary bench only (recommended), or include the `related` switcher chips in lessons?
3. **Premium-3D fate for CA:** descope now and rebuild selectively as Claude 3D benches (recommended), or keep the Codex 3D routes live until each replacement exists?
4. **Coverage bands:** approve editing `threeDLaunchCoverageRequirement.regionalCounts.california` as part of 2a (mechanically required by the descope).

---

## Appendix A — The 76 California topics: Codex template in the lesson vs. Claude signature bench

Columns: topic id · grade · **Codex template the lesson currently renders** · **Claude signature primary that replaces it** · related-bench count (hub switcher) · premium-3D flag · chapter.

| Topic id | Grade | Codex template (lesson today) | Claude bench (replacement) | Related | 3D | Chapter |
|---|---|---|---|---|---|---|
| `us-ca-math-k-k-cc-count-sequence` | K | `number-line` | `HundredChartLab` | 2 related |  | K-A.1 Kindergarten Counting and Cardinality: Count Sequence |
| `us-ca-math-k-k-cc-cardinality-compare` | K | `number-line` | `CountingLab` | 1 related |  | K-B.1 Kindergarten Counting and Cardinality: Cardinality Compare |
| `us-ca-math-k-k-oa-compose-decompose` | K | `number-line` | `SubtractionLab` | 2 related |  | K-C.1 Kindergarten Operations and Algebraic Thinking: Compose and Decompose |
| `us-ca-math-k-k-nbt-teen-numbers` | K | `base-ten` | `TeenNumbersLab` | 0 related |  | K-D.1 Kindergarten Number and Operations in Base Ten: Teen Numbers |
| `us-ca-math-k-k-md-attributes-data` | K | `measurement-scale` | `LengthComparisonLab` | 2 related |  | K-E.1 Kindergarten Measurement and Data: Attributes and Data |
| `us-ca-math-k-k-g-shapes-position` | K | `angle-geometry` | `PositionLab` | 2 related |  | K-F.1 Kindergarten Geometry: Shapes and Position |
| `us-ca-math-p1-1-oa-add-subtract` | P1 | `number-line` | `AssociativeAdditionLab` | 5 related |  | 1-A.1 Grade 1 Operations and Algebraic Thinking: Add Subtract |
| `us-ca-math-p1-1-nbt-place-value` | P1 | `base-ten` | `HundredChartLab` | 7 related |  | 1-B.1 Grade 1 Number and Operations in Base Ten: Place Value |
| `us-ca-math-p1-1-md-measure-data` | P1 | `measurement-scale` | `LengthComparisonLab` | 1 related |  | 1-C.1 Grade 1 Measurement and Data: Measure Data |
| `us-ca-math-p1-1-g-shape-reasoning` | P1 | `angle-geometry` | `PositionLab` | 3 related |  | 1-D.1 Grade 1 Geometry: Shape Reasoning |
| `us-ca-math-p2-2-oa-fluency-arrays` | P2 | `array-area` | `OddEvenLab` | 0 related |  | 2-A.1 Grade 2 Operations and Algebraic Thinking: Fluency Arrays |
| `us-ca-math-p2-2-nbt-three-digit-place-value` | P2 | `base-ten` | `TwoDigitNumberLab` | 5 related |  | 2-B.1 Grade 2 Number and Operations in Base Ten: Three Digit Place Value |
| `us-ca-math-p2-2-md-measure-data-money-time` | P2 | `clock-money-data` | `MeasurementLab` | 4 related |  | 2-C.1 Grade 2 Measurement and Data: Measure Data Money Time |
| `us-ca-math-p2-2-g-partition-shapes` | P2 | `fraction-bar` | `ShapesLab` | 1 related |  | 2-D.1 Grade 2 Geometry: Partition Shapes |
| `us-ca-math-p3-3-oa-mult-div` | P3 | `array-area` | `MultiplicationLab` | 7 related |  | 3-A.1 Grade 3 Operations and Algebraic Thinking: Mult Div |
| `us-ca-math-p3-3-nbt-arithmetic` | P3 | `base-ten` | `RoundingLab` | 2 related |  | 3-B.1 Grade 3 Number and Operations in Base Ten: Arithmetic |
| `us-ca-math-p3-3-nf-fraction-meaning` | P3 | `fraction-bar` | `FractionLab` | 2 related |  | 3-C.1 Grade 3 Number and Operations - Fractions: Fraction Meaning |
| `us-ca-math-p3-3-md-time-data-area-perimeter` | P3 | `measurement-scale` | `TimeLab` | 7 related |  | 3-D.1 Grade 3 Measurement and Data: Time Data Area Perimeter |
| `us-ca-math-p3-3-g-categories` | P3 | `angle-geometry` | `EqualAreasLab` | 1 related |  | 3-E.1 Grade 3 Geometry: Categories |
| `us-ca-math-p4-4-oa-factors-patterns` | P4 | `array-area` | `MultiplicativeComparisonLab` | 5 related |  | 4-A.1 Grade 4 Operations and Algebraic Thinking: Factors Patterns |
| `us-ca-math-p4-4-nbt-multi-digit` | P4 | `base-ten` | `ComparingLab` | 5 related |  | 4-B.1 Grade 4 Number and Operations in Base Ten: Multi Digit |
| `us-ca-math-p4-4-nf-fraction-decimal` | P4 | `fraction-bar` | `EquivalentFractionsLab` | 4 related |  | 4-C.1 Grade 4 Number and Operations - Fractions: Fraction Decimal |
| `us-ca-math-p4-4-md-conversion-angles` | P4 | `measurement-scale` | `UnitConversionLab` | 4 related |  | 4-D.1 Grade 4 Measurement and Data: Conversion Angles |
| `us-ca-math-p4-4-g-lines-shapes` | P4 | `angle-geometry` | `AngleTurnLab` | 3 related |  | 4-E.1 Grade 4 Geometry: Lines Shapes |
| `us-ca-math-p5-5-oa-expressions-patterns` | P5 | `equation-balance` | `OperationsLab` | 1 related |  | 5-A.1 Grade 5 Operations and Algebraic Thinking: Expressions Patterns |
| `us-ca-math-p5-5-nbt-decimals` | P5 | `base-ten` | `DecimalLab` | 5 related |  | 5-B.1 Grade 5 Number and Operations in Base Ten: Decimals |
| `us-ca-math-p5-5-nf-operations` | P5 | `fraction-bar` | `FractionAdditionLab` | 6 related |  | 5-C.1 Grade 5 Number and Operations - Fractions: Operations |
| `us-ca-math-p5-5-md-volume-data` | P5 | `array-area` | `UnitConversionLab` | 2 related |  | 5-D.1 Grade 5 Measurement and Data: Volume Data |
| `us-ca-math-p5-5-g-coordinate-shapes` | P5 | `coordinate-transform` | `PointLab` | 1 related |  | 5-E.1 Grade 5 Geometry: Coordinate Shapes |
| `us-ca-math-p1-1-h1-picture-join-stories-to-10` | P1 | `number-line` | `SubtractionLab` | 2 related |  | 1-H.1 Picture Join Stories to Ten |
| `us-ca-math-p1-1-h2-picture-story-addition-equations` | P1 | `equation-balance` | `EqualSignLab` | 1 related |  | 1-H.2 Picture Story Addition Equations |
| `us-ca-math-p1-1-h3-cube-train-join-models-to-10` | P1 | `number-line` | `SubtractionLab` | 2 related |  | 1-H.3 Cube-Train Join Models to Ten |
| `us-ca-math-p1-1-h4-join-stories-within-10` | P1 | `number-line` | `NumberBondLab` | 2 related |  | 1-H.4 Join Stories Within Ten |
| `us-ca-math-p1-1-h5-model-equation-join-stories-to-10` | P1 | `equation-balance` | `SubtractionLab` | 2 related |  | 1-H.5 Model-and-Equation Join Stories |
| `us-ca-math-p1-1-h6-equation-match-join-stories-to-10` | P1 | `equation-balance` | `EqualSignLab` | 1 related |  | 1-H.6 Equation Match for Join Stories |
| `us-ca-math-p1-1-l1-picture-take-away-stories-to-10` | P1 | `number-line` | `SubtractionLab` | 2 related |  | 1-L.1 Picture Take-Away Stories to Ten |
| `us-ca-math-p1-1-l2-picture-story-subtraction-equations` | P1 | `equation-balance` | `SubtractionLab` | 2 related |  | 1-L.2 Picture Story Subtraction Equations |
| `us-ca-math-p1-1-l3-cube-train-take-away-models-to-10` | P1 | `number-line` | `SubtractionLab` | 2 related |  | 1-L.3 Cube-Train Take-Away Models to Ten |
| `us-ca-math-p1-1-l4-take-away-stories-within-10` | P1 | `number-line` | `SubtractionLab` | 2 related |  | 1-L.4 Take-Away Stories Within Ten |
| `us-ca-math-p1-1-l5-model-equation-take-away-stories-to-10` | P1 | `equation-balance` | `SubtractionLab` | 2 related |  | 1-L.5 Model-and-Equation Take-Away Stories |
| `us-ca-math-p1-1-l6-break-apart-subtraction-equations-to-10` | P1 | `equation-balance` | `SubtractionLab` | 2 related |  | 1-L.6 Break-Apart Subtraction Equations |
| `us-ca-math-p6-chapter-01` | P6 | `fraction-bar` | `RatioLab` | 2 related |  | 6-A.1 Ratios, Rates, and Percent Reasoning |
| `us-ca-math-p6-chapter-02` | P6 | `number-line` | `FractionDivisionLab` | 11 related |  | 6-B.1 Rational Numbers and the Number Line |
| `us-ca-math-p6-chapter-03` | P6 | `equation-balance` | `OperationsLab` | 10 related |  | 6-C.1 Expressions, Equations, and Variables |
| `us-ca-math-p6-chapter-04` | P6 | `array-area` | `VolumeLab` | 4 related |  | 6-D.1 Geometry: Area, Surface Area, and Volume |
| `us-ca-math-p6-chapter-05` | P6 | `statistics-distribution` | `StatisticalQuestionLab` | 7 related |  | 6-E.1 Statistics and Data Distributions |
| `us-ca-math-s1-chapter-01` | S1 | `fraction-bar` | `ProportionalLab` | 1 related |  | 7-A.1 Proportional Relationships |
| `us-ca-math-s1-chapter-02` | S1 | `number-line` | `AbsoluteValueLab` | 3 related |  | 7-B.1 Operations with Rational Numbers |
| `us-ca-math-s1-chapter-03` | S1 | `equation-balance` | `CommutativeLab` | 4 related |  | 7-C.1 Linear Expressions and Equations |
| `us-ca-math-s1-chapter-04` | S1 | `fraction-bar` | `ScaleDrawingLab` | 6 related |  | 7-D.1 Scale, Geometry, and Measurement |
| `us-ca-math-s1-chapter-05` | S1 | `probability-simulation` | `SamplingLab` | 3 related |  | 7-E.1 Sampling, Probability, and Inference |
| `us-ca-math-s2-chapter-01` | S2 | `equation-balance` | `ExponentRulesLab` | 11 related |  | 8-A.1 Linear Equations and Systems Readiness |
| `us-ca-math-s2-chapter-02` | S2 | `function-family` | `FunctionLab` | 4 related | **YES** | 8-B.1 Functions and Rate of Change |
| `us-ca-math-s2-chapter-03` | S2 | `coordinate-transform` | `CongruenceLab` | 11 related |  | 8-C.1 Transformations and Similarity |
| `us-ca-math-s2-chapter-04` | S2 | `coordinate-transform` | `CongruenceLab` | 11 related |  | 8-D.1 Pythagorean Reasoning and Coordinate Geometry |
| `us-ca-math-s2-chapter-05` | S2 | `statistics-distribution` | `BestFitLab` | 2 related |  | 8-E.1 Bivariate Data and Claims |
| `us-ca-math-s3-chapter-01` | S3 | `equation-balance` | `FormulaLab` | 7 related |  | 9-A.1 Equations from Context |
| `us-ca-math-s3-chapter-02` | S3 | `function-family` | `FunctionLab` | 8 related | **YES** | 9-B.1 Function Notation and Interpretation |
| `us-ca-math-s3-chapter-03` | S3 | `function-graph` | `ExponentialFunctionLab` | 1 related | **YES** | 9-C.1 Linear and Quadratic Models |
| `us-ca-math-s3-chapter-04` | S3 | `coordinate-transform` | `CircleLab` | 11 related |  | 9-D.1 Coordinate Geometry Methods |
| `us-ca-math-s3-chapter-05` | S3 | `statistics-distribution` | `BoxPlotLab` | 8 related |  | 9-E.1 Modeling with Evidence |
| `us-ca-math-s4-chapter-01` | S4 | `right-triangle-pythagorean` | `CongruenceLab` | 5 related |  | 10-A.1 Congruence and Proof |
| `us-ca-math-s4-chapter-02` | S4 | `right-triangle-pythagorean` | `DilationsLab` | 2 related |  | 10-B.1 Similarity and Right-Triangle Reasoning |
| `us-ca-math-s4-chapter-03` | S4 | `angle-geometry` | `CircleTheoremsLab` | 5 related |  | 10-C.1 Circle Geometry |
| `us-ca-math-s4-chapter-04` | S4 | `function-graph` | `QuadraticEquationLab` | 3 related | **YES** | 10-D.1 Quadratic Structure |
| `us-ca-math-s4-chapter-05` | S4 | `probability-simulation` | `ConditionalLab` | 2 related | **YES** | 10-E.1 Conditional Probability |
| `us-ca-math-s5-chapter-01` | S5 | `function-family` | `SequencesLab` | 3 related | **YES** | 11-A.1 Function Transformations and Inverses |
| `us-ca-math-s5-chapter-02` | S5 | `function-family` | `ExponentialFunctionLab` | 4 related | **YES** | 11-B.1 Exponential and Logarithmic Models |
| `us-ca-math-s5-chapter-03` | S5 | `trig-unit-wave` | `UnitCircleLab` | 8 related | **YES** | 11-C.1 Trigonometric Functions and Graphs |
| `us-ca-math-s5-chapter-04` | S5 | `statistics-distribution` | `BoxPlotLab` | 8 related |  | 11-D.1 Data Modeling and Residuals |
| `us-ca-math-s5-chapter-05` | S5 | `statistics-distribution` | `SamplingLab` | 1 related |  | 11-E.1 Statistical Inference and Claims |
| `us-ca-math-s6-chapter-01` | S6 | `statistics-distribution` | `VectorLab` | 7 related |  | 12-A.1 Quantities, Units, and Precision |
| `us-ca-math-s6-chapter-02` | S6 | `function-family` | `PolynomialArithmeticLab` | 5 related | **YES** | 12-B.1 Polynomial Structure and Behavior |
| `us-ca-math-s6-chapter-03` | S6 | `statistics-distribution` | `ExpectedValueLab` | 0 related | **YES** | 12-C.1 Decision Statistics |
| `us-ca-math-s6-chapter-04` | S6 | `function-family` | `FunctionLab` | 8 related | **YES** | 12-D.1 Function Analysis and Rates |
| `us-ca-math-s6-chapter-05` | S6 | `statistics-distribution` | `CompareFunctionsLab` | 5 related | **YES** | 12-E.1 Capstone Modeling |

---

**Verification provenance (2026-08-25):** catalog enumeration via `npx tsx` against `data/visualizationLabs.ts` (76/76 CA topics = signature-lab in hub; 76/76 CA lesson seeds embed a visualization block; 12 premium-3D CA ids), lesson registry read at `components/lesson/LessonView.tsx:583`, CJK scan of `components/visualizations/signature/*.jsx` (0 hits), A06 lane context from `coordination/release-intake/2026-08-23-A25-a06-ca-visualization-labs-loop-evidence-archive.md`.
