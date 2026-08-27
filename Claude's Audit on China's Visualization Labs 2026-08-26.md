# Claude's Audit on China's Visualization Labs

**Date:** 2026-08-26
**Question asked:** California's visualization labs are now reliable and beautiful. Are China's labs as good?
**Answer:** No. Not on any of the eight dimensions measured, and the gap is structural, not cosmetic.
**Scope:** Mainland PEP (人教版), BNU (北师大版), HJB (沪教版), plus Hong Kong as the nearest comparison.
**Baseline:** `origin/main` as of 2026-08-26 (this checkout, `codex/edulab-mais`, is 102 commits behind; every claim below was re-verified against `main`).
**Method:** eight parallel code audits + adversarial verification of every blocker/major claim; then a **full runtime census — all 335 mainland labs rendered, screenshotted and adjudicated** (§4.2). Details and caveats in §9.

---

## 1. The one-paragraph answer

California's 76 topics each render a hand-authored **signature bench** — a light-paper canvas with a staged 6-step lesson, predict-then-check questions, and an exact-arithmetic "CALIBRATED" capstone — and each one ships a `audit-*.mjs` machine proof that re-derives every quiz key and is itself mutation-tested. China's 335 mainland topics all render the **same 3,787-line generic template component**, picked by a regex over the topic's text, with no lesson flow, no question, no completion state, no standards alignment, no student note, no content-safety review, and no mathematical proof of any kind. A Chinese student also never meets a visualization *inside a lesson at all*: **0 of 335 mainland lesson seeds contain a visualization block**, versus 76 of 76 in California. The single number that captures it: a Californian reaches **54 distinct, individually-proven interactive benches**; a mainland student reaches **18 generic templates, zero of them proven**. Rendering and adjudicating all 335 mainland labs puts a number on the consequence: **8 are apt (2.4 %), 156 weak, and 171 — 51 % — are wrong**, meaning the picture shows different mathematics from the chapter it claims to teach.

---

## 2. Scoreboard

| Dimension | China parity vs CA | Headline |
|---|:--:|---|
| Surface reachability | **1 / 10** | 0 lesson embeds vs 76/76; hub is the only surface |
| Curriculum/template fit | **1 / 10** | measured census: 2.4 % apt, **51 % wrong**; 109 pictures for 335 chapters |
| Mathematical correctness | **1 / 10** | 0 machine proofs vs 192; 14 concrete falsehoods found in one read |
| Visual & interaction design | **1 / 10** | 0 authored steps, 0 questions, 0 completion states |
| Test & QA evidence | **1 / 10** | 0 audits, 0 safeguard reviews, 0 alignment records, 0 CI coverage |
| Curriculum coverage | **1 / 10** | 0 of ~20 distinctively-Chinese representations expressible |
| 3D stack | **2 / 10** | 66 China labs on an unproven 2.8 MB stack CA just walked away from |
| Chinese-language quality | **3 / 10** | 435 strings still render Traditional characters to PRC students |

Scores are the auditing agents' own, on a scale where 10 = full parity with a California signature bench.

---

## 3. What a Chinese student actually sees

I ran the app and captured this. Screenshots are in [`output/china-viz-audit-2026-08-26/`](output/china-viz-audit-2026-08-26/).

### 3.1 The California bar

![California K bench](output/china-viz-audit-2026-08-26/01-california-signature-bench-K.png)

`us-ca-math-k-k-cc-cardinality-compare` — light paper canvas, serif display face, five countable apples in a ten-frame, a live readout strip (HOW MANY / IN WORDS / ONE MORE / ONE LESS), **STEP 1 OF 6** with a progress rail, two dials that say "unlocks soon 🔒" until the step earns them, a predict-then-check question with three choices, and a bench switcher chip (Counting · primary / Comparing). Total page text: 1,203 characters of authored pedagogy.

### 3.2 The China reality — Grade 1, Shanghai edition

![HJB solids](output/china-viz-audit-2026-08-26/05-mainland-hjb-p1-solids-intro-zh.png)

`hjb-primary-p1-upper-solids-introduction` — **「认识立体图形」(Recognising Solid Figures)**, the Grade-1 chapter about cubes, cylinders, cones and spheres. It renders **a flat 5 × 4 coloured rectangle array labelled 「行 × 列 = 面积」(rows × columns = area)**. A lesson about 3-D solids shows a 2-D multiplication grid. There is no step flow, no question, no note, no standard reference. Total page content: a title, one diagram, two sliders, and a reset button.

Cause: `templateForTopic` ([data/visualizationLabs.ts:2336](data/visualizationLabs.ts:2336)) tests the `array-area` volume rule — which matches `\bcubes?\b|\bcylinders?\b|\bcones?\b` — **before** the primary-grade solids rule at line 2349. The topic's English description mentions cubes and cylinders, so the area grid wins.

### 3.3 The China reality — Grade 7, Beijing Normal edition

![BNU spatial figures](output/china-viz-audit-2026-08-26/08-mainland-bnu-s1-spatial-figures-zh.png)

`bnu-junior-s1-upper-spatial-figures` — **「丰富的图形世界」**, the BNU Grade-7 opening chapter on solids, nets and three-view drawings. The student gets:

- an **English** formula strip: `SA = 2(lw + lh + wh); V = lwh; net → solid; θ = 49.27°; scale = 1.40`
- **English** concept chips: `net`, `theta`, `SA`, `V`
- a 3-D scene showing an arrow and a wireframe plane — **no solid at all**
- and an entire **internal authoring console, in English, shipped to the student**: `Reset camera · Guide · Explore · 3. folded-solid · Live · Alpha · Shot · Video · Pause · 9.8s / 10.7s · Primary value · # checkpoint · Paste · Save · Restore 0 · Undo · Redo · Beat 1: surface net · Final`

That console is a Manim scene-authoring/review harness. It is not gated behind any role or flag.

### 3.4 The same lab on a phone — the dominant China device

![Mobile BNU](output/china-viz-audit-2026-08-26/11-mobile-mainland-bnu-s1-spatial-zh.png)

On a 390 px Android viewport the formula clips mid-token (`lwh; net →`), the 3-D scene collapses to an unreadable sliver, and the English authoring console occupies roughly 60 % of the screen. The mathematics gets about 15 %.

For contrast, the California bench on the same viewport ([`12-mobile-california-signature-K.png`](output/china-viz-audit-2026-08-26/12-mobile-california-signature-K.png)) reflows cleanly: title, chips, canvas, readout, step panel, all legible.

### 3.5 A case where the template is roughly right, and still thin

![BNU quadratic](output/china-viz-audit-2026-08-26/09-mainland-bnu-s3-quadratic-eq-zh.png)

`bnu-junior-s3-upper-quadratic-equations` — 「一元二次方程」. This gets a parabola grapher, which is defensible. But the chapter is about *solving* equations (配方法 / 公式法 / 因式分解) and it shows a *function* grapher; one of its three tabs is 「指数」 (exponential), irrelevant here; and the axis label reads `y = ax^2 + bx + c` in ASCII caret notation rather than `y = ax² + bx + c`. Even the good case is generic.

---

## 4. The eight dimensions, with the numbers

### 4.1 Surface reachability — a Chinese student reaches one surface, and it is the weakest one

| | Mainland | California |
|---|---|---|
| Labs rendering a proven signature bench | **0 / 335** | 76 / 76 |
| Distinct audited interactive visualizations reachable | **0** | 54 primaries (188 benches reachable via related-chips) |
| Lessons carrying an in-lesson visualization block | **0 / 335** | 76 / 76 |
| Interactive textbook lesson blocks | **0** | 286 blocks across 64 of 76 topics |
| Labs visible in the hub after curriculum scoping | PEP 62 · HJB 127 · BNU 161 | 76 |
| Premium-3D direct-route ids after CA's descope | **47 mainland** | 0 (retired, URLs redirect) |

`data/signatureLabAssignments.ts` on `main` has **76 keys, all `us-ca-math-*`, zero non-California** — verified by enumerating the exported object, not by grep. Because `createTopicLab` sets `moduleId = hasSignatureLab(topic.id) ? "signature-lab" : "configured-visualization-lab"` ([data/visualizationLabs.ts:2513](data/visualizationLabs.ts:2513)), every China topic falls to the template by construction.

The lesson-embed gap is the sharpest one. All nine mainland lesson seed files (`data/mainland{Pep,Bnu,Hjb}{Primary,Junior,High}Lessons.ts`) return `grep -c 'type: "visualization"'` = **0**, on this branch and on `main`. Mainland lessons are built from generated JSON packs whose block types are only concept / worked-example / checklist / extension / teacher-guide. So when a Chinese student opens a lesson, there is no visualization at all — the comparison is not "bench vs template", it is **"bench vs nothing"**.

**Hong Kong is the exception and the cheap win:** 29 of 49 HK lessons *do* carry a visualization block (all `configured-visualization-lab`). HK is 20 lessons short of full embed coverage; mainland is 335 short.

### 4.2 Template fit — the visualization is chosen by regex over machine-written English prose

`templateForTopic` ([data/visualizationLabs.ts:2312-2362](data/visualizationLabs.ts:2312)) is a 30-rule regex cascade over `lowerTopicText`, which is one lowercased blob of `topic.id + title.{en,zh,zhHans} + description.{en,zh,zhHans}`. It is Chinese-aware — the rules do test 数轴, 因式分解, 立体几何 and so on — but the Chinese title is just one of six strings in a bag, and the bag is dominated by generated English.

Measured consequences:

- **49 of 279** heuristic-decided mainland labs (17.6 %) **change template if the Latin/English text is stripped**. The picture a Chinese chapter gets is partly decided by English marketing prose.
- **34 of 279** (12.2 %) change if the machine-written description is removed.
- **278 of 335** mainland topics have raw Latin concept slugs spliced into their Chinese description — **156/156 BNU and 122/122 HJB, but 0/57 PEP** (PEP topics are hand-written and clean). Example: `description.zhHans = "北师大版二年级上册《2-5的乘法口诀》小学单元，围绕multiplication-facts、2-to-5-times-tables、乘法口诀、2到5乘法开展概念…"`.
- **23 of 278** fall through to the terminal `return "number-line"` fallback at line 2361 — including whole 数学好玩 / 整理复习 chapters.
- **57 of 335** mainland topics (17 %) already carry a **manual override** in `topicTemplateOverrides` ([data/visualizationLabs.ts:249-375](data/visualizationLabs.ts:249)) — the team has been patching the heuristic topic by topic. One override is a no-op (`bnu-primary-p4-lower-observe-objects` sets the template the heuristic already returns).
- **1 of 18 templates is unreachable** from the heuristic: `right-triangle-pythagorean` — precisely the one 勾股定理 needs.
- **140 of 335** chapter titles name more than one strand (e.g. 「二次函数、圆与概率初步」), which a single scene cannot cover.

Canonical failure, verified end to end: **`bnu-primary-p2-upper-multiplication-facts-2-to-5` (2-5的乘法口诀) renders a number line**, because its English gloss contains "skip counting" and the `skip counting → number-line` rule at line 2323 fires 15 lines before the multiplication rule at 2339.

Downstream, the choice barely matters anyway. `templateConfigForTopic` emits six fields; `ConfiguredVisualizationLab.tsx` reads exactly **two** of them — `accent` (:765) and `formula` (:2907). `variant` (the topic id), `focus`, `xLabel`, `yLabel` are never rendered. And the three control values are hard-coded identically for all 689 labs (`useState(5)`, `useState(4)`, `useState(0)` at :2891-2893), so **on first paint every lab within a family is bit-identical**.

#### Measured census — all 335 mainland labs rendered and adjudicated

The earlier draft of this report carried a hand-sample estimate of ~39 % apt / ~31 % weak / ~31 % wrong
and flagged it as unreproducible. That estimate has now been **replaced by a full census**: every one of
the 335 mainland labs was rendered live in a 简体中文 session, screenshotted, and adjudicated by PRC
curriculum experts against its own textbook chapter (method in §9).

| Verdict | Labs | Share | Earlier estimate |
|---|--:|--:|--:|
| **apt** — the mathematics on screen *is* the chapter's mathematics | **8** | **2.4 %** | ~39 % |
| **weak** — related but shallow, off-scale, or covers one strand of several | 156 | 46.6 % | ~31 % |
| **wrong** — depicts different mathematics, or is actively misleading | **171** | **51.0 %** | ~31 % |

**The hand sample overstated aptness roughly sixteen-fold.** Eight of 335 Chinese chapters get a picture a
competent PRC teacher would actually use, and a clear majority are wrong.

Objective flags recorded per lab:

| Flag | Labs | Share |
|---|--:|--:|
| notation violating PRC convention (`ax^2`, `->`, `deg` for °, 数线 for 数轴) | 325 | **97 %** |
| Latin text visible in the 简体中文 render | 219 | 65 % |
| multi-strand chapter one scene cannot cover | 194 | 58 % |
| numbers on screen contradict the chapter's scale | 113 | 34 % |

By publisher and by renderer:

| Slice | n | apt | wrong |
|---|--:|--:|--:|
| BNU 北师大版 | 156 | 4 (2.6 %) | 87 (**55.8 %**) |
| HJB 沪教版 | 122 | 3 (2.5 %) | 54 (44.3 %) |
| PEP 人教版 | 57 | 1 (1.8 %) | 30 (52.6 %) |
| 2-D template | 283 | 8 (2.8 %) | 147 (51.9 %) |
| **3-D stack** | **52** | **0 (0 %)** | 24 (46.2 %) |

**Not one of the 52 3-D labs is apt.** That is the stack China inherited when California descoped.

**Why only 8 are apt.** The template is apt exactly when the chapter happens to be what the template
already draws — fractions on a fraction bar (分数的意义), multiplication tables on an array (表内乘法),
area on unit squares (面积与周长), coordinates on a coordinate plane (位置与坐标, 平面直角坐标系), length
on a ruler (长度的比较与测量), quadratics on a parabola (二次函数 ×2). Eight coincidences. Every one still
carries a defect: 表内乘法 is captioned 「行 x 列 = **面积**」 to Grade-2 pupils who have not met area, and
both 二次函数 labs print `y = ax^2` in ASCII.

**The scene-collapse behind the numbers.** Rendering all 335 shows **109 distinct pictures** for 335
chapters (mean 3.1 chapters per picture); **260 of 335 share their picture with at least one other
chapter**. The largest groups (full table: [`duplicate-scenes.md`](output/china-viz-sweep-2026-08-26/duplicate-scenes.md)):

| Chapters | One identical picture | Includes |
|--:|---|---|
| 29 | `5 x 4 = 20 · 行 x 列 = 面积` | 表内除法与有余数除法 — an area grid cannot show a remainder |
| 28 | `0 -> 5; step = 5`, axis 0…18 | **负数与小学总复习**, **有理数与数轴基础** — negative-number chapters on an axis with no negative region |
| 18 | `5 > 4; diff = 1` balance beam | 因式分解, 分式, **集合与逻辑**, 一元一次不等式 — the beam is drawn *level* while printing `5 > 4` |
| 17 | `4/6 = 8/12 · 部分 / 整体` | 百分数, 比例, 正比例与反比例 |
| **16** | one vector-and-conic 3-D scene | **the entire BNU + HJB senior-high geometry curriculum** (below) |
| 15 | `A = 90 deg, B = 72 deg` + pentagon | **观察物体 ×3**, 等腰三角形, 圆与正多边形 — a circle chapter with no circle |

The 16-chapter group is the sharpest single finding in this audit. One scene — an arrow, a conic, and a
decorative arch — is served identically to: 立体几何初步 · 空间向量与立体几何 · 空间直线与平面 · 简单几何体 ·
圆锥曲线 ×3 · 平面向量 ×3 · 解析几何综合 · 立体几何与空间向量综合 · 空间向量综合复习 · 三角、向量与解析几何综合 ·
数学建模活动（三）. This runtime result independently reproduces the static-analysis finding in §4.7,
which derived the same 16 labs from the code.

**A defect class only live rendering could find:** in the 3-D labs the formula badge contradicts its own
sliders — 圆柱 prints `r=1.06, h=1.15` while its dials read `r=5, h=4`; 三角函数 prints amplitude `0.44`
against a `振幅 A=4` dial; 复数 prints `|z|=1.12` against 实部 5 / 虚部 4. The 锐角三角比 chapter renders
`θ = 180°`. No static check in the repo can see any of this, because the 3-D labs emit no SVG text at all.

### 4.3 Mathematical correctness — 0 proofs vs 192

California ships **192 `audit-*.mjs` machine proofs**, one per bench. I ran all 192 this session: **192/192 exit 0**, and the 145 whose output parses report **17,330,983 individual numeric checks**. They slice the model out of the shipped JSX, re-run the lab's own functions, re-derive every quiz key independently, prove the calibration stamp exact (exact target ⇒ RMS 0; one dial step ⇒ never stamps), and are themselves mutation-tested with **170 seeded defects across 16 audits**. CI gates them (`.github/workflows/ci.yml:139`).

China has **zero**. Not one file in the repo evaluates a single number the template renderer produces.

The 14 CI-gated visualization test files contain 150 tests and **225 `assert.match(source, /regex/)` assertions against `ConfiguredVisualizationLab.tsx` read in as a string**. They check that a `data-viz-name` attribute exists, that a label clears a title badge, that a clipPath id is wired. They cannot check mathematics — and structurally never could: all 18 model functions are module-private (the file has exactly two exports, at :3772 and :3776), so there is no seam to test through. The signature benches deliberately expose a sliceable `MODEL:START/END` region; this file is the opposite.

What the templates structurally cannot represent, with 2026-08-26 mainland lab counts:

| Template | Mainland labs | Hard limit |
|---|--:|---|
| `angle-geometry` | 38 | Angles quantised to multiples of 18° (`Math.round(value) * 18`, :503) — **45° is unreachable**; draws two rays plus a hard-coded decorative pentagon; cannot draw a circle or a similar-triangle pair |
| `equation-balance` | 25 | A balance beam holding **integers 0–9 only** (:740-754) — no negatives, no fractions, no variables, no Venn diagram, no area model |
| `array-area` | 53 | One rectangular grid; carries every 圆柱/圆锥/体积 topic |

Also: **`median`, `quartile`, `IQR` and `standard deviation` appear zero times in the entire renderer** — yet it serves every 统计 chapter. And 26 `comparisonNote` explanation strings are computed and then discarded (their absence is *pinned by a regression test*, `configuredVisualizationLabRegressions.test.ts:255-262`).

The audit found **14 concrete, reachable mathematical falsehoods** in the template and 3-D code in a single read. Full list is in the workflow transcript; the most consequential is in §4.7.

### 4.4 Design and interaction — the difference is authorship density, not chrome colour

| | Configured template (all China) | Signature bench (California) |
|---|--:|--:|
| Authored lesson steps | **0** | 1,290 (mean 6.7/bench, 192/192) |
| Predict-then-check questions | **0** | 1,104 (mean 5.8/bench) |
| Benches ending in a CALIBRATED capstone | **0** | 186 / 192 |
| Distinct diagram designs | 18 | 54 hand-drawn primaries |
| Live region announcing model state | 0 (1 `role=alert` on 1 of 18) | 181 / 192 (`aria-live=polite`) |
| Focus-indicator contrast, light page | **1.81 : 1** | 12.70 : 1 |
| Accent colours failing WCAG 3:1 on the day canvas | **8 of 8** (worst `#a3e635` at 1.51:1) | fixed 4-colour semantic palette |
| Type system | 79 weight declarations, 100 % bold/black, 2 sizes | 3 voices: serif display (566 uses), mono numerics (633), sans UI |
| Mobile | SVG pinned `min-w-[640px]` below `lg` → horizontal pan on a 375 px phone | fluid canvas, ResizeObserver + DPR clamp, 192/192 |

`grep -c 'STEPS\|predict\|calib\|CALIBRATED\|quiz\|feedback'` on `ConfiguredVisualizationLab.tsx` returns **0**. There is no lesson flow, no question, no completion state, and no per-topic prose — the "Read me first" note, focus text and comparison note were deliberately deleted, and the deletion is now locked by a regression test.

To be fair to the template: in light mode it is *tidy*. It is not ugly. It is empty.

### 4.5 Chinese-language quality — the axis California never had to face

This is where China is least bad (3/10) and where the defects are most fixable.

- **4,915 of 7,408** `zh:` strings repo-wide (66.3 %) have **no `zhHans` sibling**, so they pass through a hand-maintained 423-entry character map plus 42 ordered phrase rules (`lib/i18n.ts:517-521`).
- **435 of them still render Traditional characters on a mainland student's screen** — including 對稱軸, 銳角, 鈍角, 陣列, 共軛, 虛部 **on the visualization components themselves**.
- **The shipped guard is a tautology.** `scripts/audit-zh-hans.mjs:140` tests only characters that are already keys of the conversion map — i.e. exactly the characters that always get converted. It reports "Critical: 0" while 435 leaks ship. It also never inspects authored `zhHans` text at all, and is blind to the 52 call sites that pass bare Chinese literals to `simplifyChineseText`.
- **The map contains a wrong entry:** `lib/i18n.ts:415` maps `覆: "复"`. 覆 is *retained* in Simplified Chinese, so the map corrupts correct text (覆蓋 → 复蓋).
- **The phrase pipeline is order-dependent and self-corrupting:** `toPrcSimplifiedText("小一至中六")` returns `"小学一年级至高初三年级"` — ungrammatical. (An earlier claim that this reaches the Visualization Lab H1 was refuted on verification; the corruption is real, the specific surface was wrong.)
- **Terminology is HK-first, not PRC-first.** `data/visualizationLabs.ts:149` sets the number-line category to `zh: "數線", zhHans: "数线"`. 数线 is the HK/TW term; PRC textbooks use **数轴**. That label sits on **35 mainland labs**. The source of truth is `data/hkChineseGlossary.ts:317 preferredZh: "數線"` — a Hong Kong glossary being character-converted into a Mainland product.
- **Same class of error in the footer of every page**, including every lab page: `lib/i18n.ts:843` has only a Traditional string containing 應用程式 → converts to 应用程式, the Taiwan/HK term. PRC uses **应用程序**.
- **~11 hard-coded English strings are painted straight into the SVG**, hitting **146 of 335** mainland labs: `"deg"`, `"step ="`, `"diff = 3 cm"`, `"P(success) not defined yet: 0 trials"`, `"Sample point"`, `"24 sides"`. Visible in §3.2's screenshot as `0 -> 5; step = 5`.
- **All 335 mainland grade chips use HK grade codes** — the screenshots show `S4 · 人教版高中`, mixing an HK band label with a PRC publisher.
- **Zero CJK characters exist in all 387 signature files**, and zero of them read the locale. **No California bench can be shown to a Chinese student without being localized first.**

### 4.6 Test and QA evidence

| | Mainland | California |
|---|--:|--:|
| Machine math proofs | **0** | 192 |
| Content safeguard reviews (8 dimensions) | **0 / 335** | 76 / 76 |
| Standards-alignment records | **0 / 335** | 76 / 76 |
| "Read me first" student notes | **0 / 335** | 76 / 76 |
| Curated bench assignments with written rationale | **0** | 76 primaries + 303 related, mean rationale 245 chars |
| Track-named test blocks in the CI viz gate (150 total) | 9 | 7 |
| Coordination QA records on `main` | **0** | COVERAGE.md + SOURCE.md + port-manifest.json + plan doc |

Verified in code: `studentNote`, `safeguard` and `californiaAlignment` are all gated on `californiaAlignment` being truthy ([data/visualizationLabs.ts:2606-2607](data/visualizationLabs.ts:2606) on `main`). Non-California labs get `undefined` by construction. My own enumeration of all 689 catalog rows returns alignment/note/safeguard counts of **0 for every China and HK track** and 76 for US.

Three mechanisms *actively* exclude mainland from QA:

1. The catalog-wide curriculum-review audit is built from five **English** focus-phrase rules; it matches 244/300 US labs and **0/389 non-US labs**. It is structurally incapable of flagging a mainland lab.
2. The `mvpReadiness` lesson-embed gate returns `[]` for any lesson without a visualization block — so all 335 mainland lessons pass it vacuously.
3. The entire `three/` test directory (213 files, with 8 admitted pre-existing failures) is **excluded from CI** — and that is the stack carrying 52 mainland 3-D labs.

### 4.7 The 3-D stack — China inherited what California just walked away from

California's premium-3D descope **did land on `main`**: `threeDSceneMath.ts:288` pins `california: { min: 0, max: 0 }` with a comment explaining that a reappearing CA id must fail the coverage contract. After that, **47 of the 68 remaining launch ids are mainland** (HJB 19, BNU 16, PEP_HIGH 11, PEP_JUNIOR 1) and 9 are HK. China now owns the majority of a stack California judged unfit.

What that stack is:

- **All 27 Manim scene builders are topic-blind.** `mathSceneRegistry.ts` (4,039 lines) contains **zero** occurrences of `labId` or `topicId`; every builder's signature is `({ accent, state })`, and **none of them even destructures `accent`**. The dispatcher keys only on `familyId`. Two labs in the same family render **byte-identical geometry**.
- **16 mainland labs — essentially the entire BNU/HJB solid-geometry and space-vector corpus** (立体几何初步, 空间向量与立体几何, 空间直线与平面, 简单几何体, 圆锥曲线, 立体几何与空间向量综合…) — collapse onto **one 123-line scene**, `buildVectorConicStrategyMathSceneSpec`, which renders no solid, no plane and no dihedral angle: an arbitrary arrow, a mode-switched conic, and a decorative sine arch literally named `"strategy-path"`. Four HJB labs share the same accent and are therefore pixel-identical.
- **The one genuinely good China-only scene has a provable error.** `pep-high-s5-space-vectors` on `three-space-vectors-lines-planes` is real, well-built 3-D that California has no equivalent of — but its "intersection point" concept is bound to a probe sliding along a line that **never touches the plane on the rendered segment** (`mathSceneRegistry.ts:1026,1047-1048`; the signed gap runs 0.42 → 0.18 and roots at t = 1.75, off-segment). Independently reproduced by the verifier.
- **Bundle:** 2,818,678 B minified / **641,264 B gzipped** — versus **9,261 B gzipped** for a comparable signature bench. That is **69× the download** for a mainland student, most of them on mobile data.
- **385 KB minified of that is test/diagnostic instrumentation shipped to students with no production gating** (`mathEvidenceHarness.ts` 272 KB + `threeDCanvasSurfaceContract.ts` 113 KB). This is the authoring console visible in §3.3.
- **Zero Chinese characters in all 207 non-test source files** (79,123 lines) of the Manim stack. Every formula token — `plane`, `normal`, `intersection`, `locus` — reaches mainland students in English.
- **Zero audits.** No proof file exists for any 3-D scene.

**The one place China is genuinely ahead:** 立体几何 and 空间向量 are chapters where 3-D *is* the mathematics, and PEP's two good scenes have no California counterpart. That is a real asset — 2 labs out of 52.

### 4.8 Curriculum coverage — what the 18 templates structurally cannot teach

HJB is **沪教版** (Shanghai Education Press), confirmed at `data/visualizationLabs.ts:2368` and `data/mainlandHjbPrimaryTopics.ts:194`.

Across the three publishers there are **335 topics served by 18 distinct pictures** — 18.6 Chinese topics per renderer, against California's 76 topics over 54 distinct primary benches. A **13× difference in representational variety**.

Of roughly 20 distinctively-Chinese pedagogical representations, **the 18 templates can express none**:

竖式计算 (column algorithms) · 线段图 (segment/bar models for word problems) · 天平方程模型 with negatives · 因式分解面积模型 · 三视图 (three-view projections) · 展开图 (nets) · 尺规作图 (compass-and-straightedge) · 数形结合 · 扇形统计图 · 折线统计图 · 频数分布直方图 · 概率树状图/列表法 · 集合与逻辑 (Venn) · 数列 · 导数与切线 · 空间向量 · 圆的性质 · 二次函数图象变换 · 解析几何 · 万/亿 place value.

`grep -ci` over the renderer returns **zero matches** for `carry`, `borrow`, `regroup`, `long division`, `column algorithm`, and `竖式`. Every "column" hit is array-grid mechanics.

**The transferable asset:** the 192 signature benches are 257,833 lines of authored, proven mathematics. A large share of them map cleanly onto Chinese topics — `FractionLab`, `AreaLab`, `AngleLab`, `CircleLab`, `QuadraticFunctionLab`, `UnitCircleLab`, `ProbabilityLab`, `BoxPlotLab` and so on all have direct 人教版/北师大版 counterparts. The blocker is not authorship; **it is that all 387 files are English-only and locale-blind**.

---

## 5. Defects worth fixing regardless of China strategy

These are live on `main` and hurt whoever touches them.

| # | Defect | Where | Severity |
|---|---|---|---|
| 1 | Manim authoring console (Reset camera / Shot / Video / Paste / Save / Undo / Redo) ships to students, ungated — **measured on 52 of 52 mainland 3-D labs, no exceptions** | `three/` stack | **Blocker** |
| 2 | 385 KB of diagnostic instrumentation in the student bundle | `mathEvidenceHarness.ts`, `threeDCanvasSurfaceContract.ts` | **Blocker** |
| 3 | 3-D bundle 641 KB gzipped (69× a bench) with no CI byte budget | `three/ThreeDLabCanvas.tsx` | **Blocker** |
| 4 | Space-vector scene labels a non-intersection as an intersection | `mathSceneRegistry.ts:1026,1047-1048` | Major |
| 5 | zh-Hans audit is tautological — reports 0 criticals while 435 leaks ship | `scripts/audit-zh-hans.mjs:140` | Major |
| 6 | `覆: "复"` is a wrong simplification and corrupts correct text | `lib/i18n.ts:415` | Major |
| 7 | 数线 (HK term) shipped as the PRC label on 35 labs; should be 数轴 | `data/visualizationLabs.ts:149` | Major |
| 7b | **219 of 335 mainland labs (65 %) render Latin text in a 简体中文 session** — 52 the full console, 167 diagram English (`step` 35, `deg` 33, `diff` 32, `success` 18, `mean`/`spread` 10) | measured live | Major |
| 8 | 应用程式 (TW/HK) in the footer of every page; PRC is 应用程序 | `lib/i18n.ts:843` | Moderate |
| 9 | 278 mainland topics have raw Latin slugs inside their Chinese descriptions | BNU 156/156, HJB 122/122 | Moderate |
| 10 | `array-area` beats the primary-solids rule → 立体图形 renders an area grid | `data/visualizationLabs.ts:2336` vs `:2349` | Moderate |
| 11 | `right-triangle-pythagorean` template unreachable from the heuristic | `templateForTopic` | Moderate |
| 12 | Focus ring 1.81:1 and all 8 accents below WCAG 3:1 on the day canvas | `ConfiguredVisualizationLab.tsx` | Moderate |
| 13 | `min-w-[640px]` forces horizontal pan on every phone below `lg` | `ConfiguredVisualizationLab.tsx:880` | Moderate |
| 14 | All 335 mainland topics carry `curriculumTrack: "MAINLAND_PEP_HIGH"` | `data/mainland*Topics.ts` | See note |
| 15 | Stale evidence string "all 7,128 pairs" (generator emits 7,209) | `audit-decimalarithmetic.mjs:72` | Minor (gate still sound) |

**Note on #14:** every mainland topic — BNU primary included — is tagged `MAINLAND_PEP_HIGH`. This is **not** a live routing bug: `MAINLAND_PEP_HIGH` is used as the umbrella mainland enum and disambiguated by `publisher` (`lib/curriculumProfile.ts:190`), and the visualization layer derives its own track independently. But it is a trap: any code keying on `curriculumTrack` alone without checking `publisher` will mis-handle BNU and HJB. `lib/mainlandPepQuestionAssets.ts:63` is exactly such a site.

**Note on the 192 CA audits:** the verifier found that "machine proof" covers three different things. Of 192 audits, **112 slice-and-eval the shipped `.jsx`**, 11 only grep it, and **69 never open it** — they are hand-copied mirrors of the model (`audit-mean.mjs:10`: "copies of the model helpers from MeanLab.jsx"). For those 69, a divergence between the bench and its mirror would go undetected. The California guarantee is strong but not uniform, and this matters when you cite it as the standard to hit.

---

## 6. What generalizes to other K-12 markets

You are aiming at many countries. Three things in the current architecture will reproduce this exact gap in every new market, and one will not.

**Will reproduce:**

1. **The join key problem.** California works because CCSS standard ids give a deterministic topic↔bench join. No other track has a standards ontology in `data/`. Mainland topics *do* carry a `conceptIds` field — but `Topic` in `types/index.ts:1626-1640` has no such field, so it is structurally unreachable from `createTopicLab`. **Every new market needs a standards or concept join before it can have curated visualizations.** This is the single highest-leverage architectural fix.
2. **The regex fallback.** Any market added without an ontology falls to `templateForTopic`, which reads generated English prose and picks 1 of 18 pictures. It will be wrong about a third of the time, and the failures will be invisible because no audit covers non-CA labs.
3. **Localization as character conversion.** The pipeline converts Traditional→Simplified characters but not *lexicon* (数線→数线 instead of 数轴; 應用程式→应用程式 instead of 应用程序), has no idempotence test, no coverage test, and no order-independence test — and its own guard is tautological. Any locale added this way will ship the same class of defect. **Adding a market means adding a terminology authority for it, not a character map.**

**Will not reproduce, and is your moat:** the signature-bench *format* — staged steps, dials that unlock, predict-then-check, exact-arithmetic calibration, and a mutation-tested proof beside every bench — is curriculum-agnostic. The mathematics of a fraction bar or a unit circle does not change across borders. **192 proven benches are a genuine multi-market asset trapped behind an English-only, locale-blind rendering layer.** Making them localizable is the cheapest way to make every future market start at California's bar instead of at China's.

---

## 7. Recommended backlog, sized

Ordered by student impact per unit of risk. Each row is an independent branch/PR.

| # | Action | Effort | Why now |
|---|---|:--:|---|
| 1 | **Ungate the Manim authoring console and strip diagnostics from the student bundle** | S | A Grade-7 student is looking at `Paste / Save / Undo / Redo` today; also removes 385 KB |
| 2 | **Fix the zh-Hans audit to test real Traditional coverage, then clear the 435 leaks** | S | The guard currently certifies a false green; fix the guard before the content |
| 3 | **Localize the terminology layer for PRC** (数轴, 应用程序, PRC grade chips, the ~11 in-SVG English strings) | S–M | Cheapest visible credibility win in the China market |
| 4 | **Make signature benches locale-aware** — a `t()` seam in `SignatureLabAdapter` + a per-bench string table | **M** | **Unlocks 192 proven benches for every non-English market. Highest leverage item on this list.** |
| 5 | **Give mainland topics a real join key** — surface `conceptIds` on `Topic`, or add a 课程标准 ontology in `data/` | M | Without this, every China curation decision stays a regex |
| 6 | **Wire the mainland lesson embed** (the mainland analogue of CA Phase 1) | M | 335 lessons currently show no visualization at all; all 335 already have a catalog lab, so this is wiring, not authoring |
| 7 | **Prove Hong Kong first** — 29/49 HK lessons already embed; close the remaining 20 and use HK as the pilot | S–M | Smallest complete second market; de-risks 4–6 before committing to 335 |
| 8 | **Author ~52 China-specific benches** (三视图, 竖式, 线段图, 展开图, 割补转化, 计数器/数位顺序表, 元角分, 频数分布直方图, 尺规作图) | **XL** | Now measured, not guessed: the census marks **52 of 335 labs (16 %)** as needing a bench that does not exist. The other **283 (84 %) map onto 104 benches already in the library** — which is why item 4 outranks this one |
| 9 | **Descope or rebuild the 47 mainland premium-3D ids**, mirroring CA Phase 2a | M | China should not inherit a stack California rejected; keep the 2 good PEP scenes |
| 10 | **Fix the 14 mathematical defects** and add a mainland-reachable audit harness | M | Today no test in the repo can catch a wrong number in a China lab |
| 11 | **Retire or repair the 3 unreachable/no-op heuristic rules** and the `array-area` ordering bug | S | Cheap correctness while the heuristic still runs |

Sequencing note: **4 → 7 → 6 → 5 → 8** is the path that reaches "China at California's bar" with the least wasted work, because item 4 converts the existing 192-bench library into the supply for every market at once.

**Evidence gap worth closing before committing to item 8.** The apt/weak/wrong rate in §4.2 is the one number in this report I had to hedge (§9). It can be replaced with a measured figure: render all 335 mainland labs headlessly, capture each screenshot plus its page text, and adjudicate topic-vs-scene per lab. That produces a per-lab verdict table, an exact count of §3.2-class mismatches, and the concrete authoring list for item 8 — instead of an extrapolation from 62 topics. Roughly 30–40 minutes of wall-clock capture and ~1 GB of PNGs.

---

## 8. Direct answer to the question asked

> Are China's visualization labs as good as California's?

**No.** California's labs are hand-authored, individually proven, curriculum-joined, embedded in lessons, and content-reviewed. China's labs are 335 instances of one generic component chosen by a regex, with no proof, no alignment, no review, no lesson presence, and — on the 3-D path — an English developer console on 52 of 52 labs and a 69× bundle.

Having now rendered and adjudicated every one of them, the answer is sharper than "not as good": **51 % of Chinese chapters are served a picture of different mathematics**, 46.6 % get something shallow or off-scale, and **2.4 % — eight labs — are apt**. A chapter on negative numbers renders a number line with no negative region; the entire senior-high geometry curriculum of two publishers renders one identical arrow-and-conic scene. On present evidence a Chinese student's visualization experience is **not a weaker version of the California experience; it is a different and much thinner product**.

The encouraging part is that most of the gap is *wiring and localization*, not authorship. Mainland already has a catalog lab for all 335 topics, and the 192 proven benches already exist. The expensive part — item 8 — is real but bounded at about 25 new benches.

---

## 9. Method, and what to distrust

**How the census was produced (§4.2).** A headless Chromium sweep rendered all 335 mainland labs against a
dev server in a `zh-Hans` session, capturing for each: a screenshot, the full page text, every `<svg><text>`
node, every control label, and the Latin tokens present. Captures were validated structurally — a 3-D lab
must produce a `<canvas>`, a 2-D lab must produce SVG text — and **95 labs that failed that check under
4-way concurrency were re-captured serially** with artifact-based waits; all 95 then passed, 0 remained
degraded. This mattered: before repair the authoring console appeared on **0** labs, because the labs that
expose it were exactly the ones whose canvas had not mounted. After repair it is **52 of 52**. Reporting the
first-pass number would have been exactly backwards.

The 335 records were then adjudicated by 16 PRC-curriculum agents over disjoint slices (every lab scored, no
sampling), each calibrated on four already-verified cases so that "wrong" means the same thing across slices.
A further 6 agents **blind re-scored** 197 of the labs without seeing the first verdicts: **87.8 % exact
agreement, 24 adjacent disagreements (weak↔apt or weak↔wrong), and zero apt↔wrong flips**. The boundary that
carries the argument — apt versus wrong — was never crossed by an independent rater.

Per-lab verdicts, reasons and suggested benches: [`census.json`](output/china-viz-sweep-2026-08-26/census.json).
Screenshots and page-text records: [`output/china-viz-sweep-2026-08-26/`](output/china-viz-sweep-2026-08-26/).

**How the code audit was produced.** Eight parallel code audits (surface reachability, template fit, mathematical correctness, localization, design/accessibility, QA evidence, 3-D stack, curriculum coverage), each followed by an adversarial verifier instructed to refute rather than confirm, re-enumerating every count from source. 16 agents total. Plus live runtime capture: a dev server on port 3100 with an isolated dist, driven headlessly at 1400×950 and 390×844.

**Corrections applied.** This checkout (`codex/edulab-mais`) is **102 commits behind `main`**, which caused two auditors to report false regressions:

- "The CA premium-3D descope did not land" — **wrong**; `main` pins `california: {min:0, max:0}`.
- "CA lesson embeds still render the template" — **wrong**; `main:622` maps `"signature-lab": LessonSignatureLab`.

Every China-side claim in this report was independently re-verified against `origin/main` (signature assignments: 76 keys / 0 non-CA; `studentNote`/`safeguard` still CA-gated; `templateForTopic` unchanged; all 9 mainland lesson files still 0 visualization blocks).

**What to distrust.**

- The 62-topic hand sample is **superseded** by the full census in §4.2 and should not be cited. It overstated aptness by roughly sixteen-fold (~39 % vs a measured 2.4 %).
- The "183 reachable benches" figure in `COVERAGE.md:66` is a stale doc number; **188** is the value computed from code.
- Contrast ratios and bundle sizes were computed by the agents and spot-reproduced by verifiers (bundle figures matched within 0.02 %); they are measurements, not vendor specs.

**Environment note.** The Mac's internal data volume hit **100 % full** twice during this session (down to 137 MB free) and blocked tool writes, which is why the runtime capture was limited to 12 representative labs rather than a full sweep. Space was freed afterwards — **1.5 GB available at time of writing** — so a broader capture is now possible; see §7 note below.

**Artifacts.** Hand-picked comparison screenshots: [`output/china-viz-audit-2026-08-26/`](output/china-viz-audit-2026-08-26/) (12 PNGs + `.txt`). Full census: [`output/china-viz-sweep-2026-08-26/`](output/china-viz-sweep-2026-08-26/) — 335 screenshots, `records.jsonl` (per-lab render capture), `census.json` (per-lab verdicts), `duplicate-scenes.md` (identical-scene groups), `bench-inventory.txt`. **`output/` is gitignored**, so these do not travel with a commit — move them if this report is to be shared. No repository source file was modified by this audit.
