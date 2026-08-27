# California math — LIVE content variety & coverage audit

Repo: `/Volumes/Starship/MAIS-MVP` (read-only audit, branch `codex/edulab-mais`, 2026-08-26)
Every number below was produced by a script in this scratchpad
(`s1_dupes.js`, `s2_answers.js`, `s3_coverage.js`, `s4_topics.js`, `s5_reachable.js`,
`s6_allpaths.js`, `s7_examples.js`, `s8_exploit.js`, helpers `load.js` / `ccss.js`).

---

## 0. Scope confirmed

`data/usCaliforniaTopics.ts:206-217` assembles `questionPacks` from:

| Pack | File | Items | Grades present | Distinct `topicId` |
|---|---|---:|---|---:|
| **A** | `data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json` | 492 | K–G5 | 41 |
| **B** | `data/generated-content/ccss-textbook-practice-v1/question-pack.json` | 810 | **K–G12** | 62 (270 source lessons) |
| **C** | `data/generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json` | 1500 | G6–G12 | 35 |
| | **LIVE TOTAL** | **2802** | K–G12 | **76** |

`us-ca-math-k-g5-generated-bank-v3-deepseek-1500` is genuinely **not served**:
`practiceLive:false` and `adaptiveBetaPracticeLive:false` keep both its 1500 items and the
12 adaptive-beta ids out of `questionPacks`. Its 60 `topicId`s are exclusive to it
(0 overlap with live-question topics, 0 overlap with promoted lesson topics), so its
retirement **leaves no topic empty** — it simply removes 60 would-be K–G5 topics.

**Type/data mismatch (P2):** `GeneratedCaliforniaCcssTextbookPracticeQuestion` declares
`grade: CaliforniaK5GradeId`, but pack B actually contains **474 G6–G12 items**
(G6 69, G7 60, G8 66, G9 84, G10 90, G11 51, G12 54). The pack is imported with an
`as` cast so TypeScript never checks it.

### UI topic inventory (`usCaliforniaTopics`)

29 K–5 textbook-lesson topics + 12 G1 micro-lesson topics + 35 question-derived topics = **76 topics**.
Zero promoted lesson topics have zero questions.

---

## 1. Duplication — exact and near-duplicate

### 1.1 Per pack

| Pack | Items | Unique EN prompts | Exact-dup groups | Items in exact-dup groups | **% exact dup** | Unique **skeletons** (digits → `#`) | Items in near-dup groups | **% near dup** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A | 492 | 458 | 23 | 57 | **11.6%** | 259 | 332 | **67.5%** |
| B | 810 | 807 | 3 | 6 | **0.7%** | 745 | 92 | **11.4%** |
| C | 1500 | 1190 | 152 | 462 | **30.8%** | **102** | 1494 | **99.6%** |
| **All live** | 2802 | 2455 | 178 | 525 | **18.7%** | 1106 | 1918 | **68.5%** |

The pre-supplied numbers are confirmed exactly (C: 152 groups / 462 items; A: 23 / 57; B: 3 / 6).
Cross-pack exact-duplicate groups: **0** — the three packs never repeat each other's prompt text.

**The pack-C headline: 1500 items are only 102 distinct question sentences** (mean 14.7 items
per skeleton). "Variety" in that bank is entirely numeric re-parameterisation of ~100 stems.

Masking capitalized proper nouns on top of digits merges only 6 further groups in pack A and
**0** in packs B and C — i.e. person/object-name variation is essentially not used as a
variety mechanism anywhere.

**Prompt + answer both identical** (fully gameable by memory):
178 groups / **525 items = 18.7% of the live bank** — pack A 57 (11.6%), pack B 6 (0.7%), pack C 462 (30.8%).

**Contradictions: 0.** No prompt is ever served with two different answers. (Good.)

### 1.2 Per grade (all live packs combined)

| Grade | Items | Packs | Unique prompts | **Exact dup %** | Unique skeletons | **Near dup %** |
|---|---:|---|---:|---:|---:|---:|
| K | 102 | A+B | 92 | 14.7 | 60 | 60.8 |
| G1 | 237 | A+B | 224 | 8.4 | 171 | 43.9 |
| G2 | 111 | A+B | 108 | 5.4 | 81 | 41.4 |
| G3 | 120 | A+B | 117 | 5.0 | 77 | 52.5 |
| G4 | 138 | A+B | 136 | 2.9 | 102 | 37.0 |
| G5 | 120 | A+B | 117 | 5.0 | 74 | 47.5 |
| G6 | 284 | B+C | 252 | 18.0 | 77 | 77.8 |
| G7 | 275 | B+C | 239 | 20.0 | 68 | 79.6 |
| G8 | 281 | B+C | 250 | 15.7 | 82 | 77.6 |
| G9 | 299 | B+C | 271 | 15.1 | 109 | 71.2 |
| G10 | 305 | B+C | 233 | **32.1** | 101 | 70.5 |
| G11 | 264 | B+C | 208 | **32.6** | 63 | **80.7** |
| G12 | 266 | B+C | 212 | **30.5** | 70 | 79.3 |

### 1.3 Pack C — duplication × chapter (worst 10 of 35 chapters, all 42–43 items each)

| Chapter | Items | Unique prompts | **Exact dup %** | Unique skeletons | Unique answers |
|---|---:|---:|---:|---:|---:|
| G12 ch01 Quantities, Units, and Precision | 43 | 9 | **100** | 2 | 9 |
| G11 ch03 Trigonometric Functions and Graphs | 43 | 16 | 90.7 | 2 | 9 |
| G10 ch03 Circle Geometry | 43 | 19 | 81.4 | 2 | 12 |
| G8 ch04 Pythagorean Reasoning & Coordinate Geometry | 43 | 19 | 69.8 | 5 | 5 |
| G10 ch05 Conditional Probability | 43 | 22 | 67.4 | 2 | 16 |
| G6 ch01 Ratios, Rates, and Percent Reasoning | 43 | 26 | 65.1 | 2 | 14 |
| G10 ch02 Similarity & Right-Triangle Reasoning | 43 | 21 | 58.1 | 2 | 15 |
| G11 ch02 Exponential and Logarithmic Models | 43 | 28 | 58.1 | 2 | 14 |
| G7 ch04 Scale, Geometry, and Measurement | 43 | 25 | 55.8 | 2 | 24 |
| G11 ch05 Statistical Inference and Claims | 42 | 28 | 52.4 | 2 | 21 |

**Every single pack-C chapter is built from just 2–12 prompt skeletons.**

### 1.4 Pack C — duplication × `generationTemplate` (worst offenders)

| Template | Items | Unique prompts | Exact dup % | Unique answers |
|---|---:|---:|---:|---:|
| `t_hypotenuse` | 26 | 4 | **100** | 4 |
| `t_trig_ratio` | 25 | 3 | **100** | **2** |
| `t_kmh_to_ms` | 23 | 5 | **100** | 5 |
| `t_circle_circumference` | 22 | 5 | **100** | 5 |
| `t_period_degrees` | 21 | 4 | **100** | 4 |
| `t_sig_figs` | 20 | 4 | **100** | 4 |
| `t_arc_length` | 27 | 11 | 88.9 | 7 |
| `t_sampling_mean` | 23 | 10 | 87.0 | 5 |
| `t_amplitude` | 22 | 12 | 81.8 | 5 |
| `t_perpendicular_slope` | 22 | 10 | 77.3 | 10 |
| `t_conditional_probability` | 21 | 9 | 76.2 | 5 |
| `t_vertex_x` | 20 | 11 | 75.0 | 7 |

Template × answer collisions: **778 unique `(template, answer)` pairs for 1500 items;
1018 items (67.9%) sit in a colliding pair.** Worst: `t_sse_compare||f` ×23,
`t_residual_linear||-1` ×19, `t_trig_ratio||3/4` ×14.

Concrete example (G8 `t_hypotenuse`): "A right triangle has legs of 6 cm and 8 cm…" appears
**10 times verbatim** (ids `…s2-c04-q09/q10/q22/q31/q32/q33…`), all answering 10.
G10 `t_trig_ratio`: "…opposite angle A is 5 and adjacent is 12. What is tan A?" ×11, answer 5/12.

### 1.5 Pack A worst knowledge points (12 items each)

| Knowledge point | Unique prompts | Exact dup % | Unique skeletons | Near dup % |
|---|---:|---:|---:|---:|
| K Geometry: Shapes Position | 4 | **100** | 4 | 100 |
| K Measurement & Data: Attributes Data | 10 | 25.0 | 4 | 100 |
| G1 Measurement & Data: Measure Data | 11 | 16.7 | 2 | 100 |
| G3 Measurement & Data: Time/Data/Area/Perimeter | 11 | 16.7 | 3 | 100 |
| K Counting & Cardinality: Cardinality Compare | 12 | 0 | **1** | 100 |
| G1 Number & Ops Base Ten: Place Value | 12 | 0 | 2 | 100 |

### 1.6 Pack B

Cleanest of the three: 807/810 unique prompts, 745 skeletons. 270 lessons × 3 items.
Worst near-dup is at lesson level (3 items sharing 1 skeleton), e.g. "G2 Adding Four Numbers",
"G3 Rounding to 10 and 100", "G4 Using a Protractor".

---

## 2. Answer-value skew and the multiple-choice position exploit

### 2.1 No shuffling anywhere in the student path

- `data/usCaliforniaQuestions.ts:64` `optionsFor()` returns `question.options` untouched.
- `components/practice/PracticeQuestionCard.tsx:642` renders `question.options.map(...)` in order.
- `lib/server/questionStore.ts` `getPublicQuestionsFromStore` filters + caches, never sorts or shuffles.
- `reduceQuestionChoices()` (the "reduced answer choices" accommodation) explicitly
  *"preserv[es] the original option order"* — so it keeps the correct option first.
- The only `randomize` in the product is `randomizeQuestionOrder` on **teacher assessments**,
  and that shuffles question order, not option order.

**Therefore the authored correct-option index is exactly what the learner sees.**

### 2.2 Correct-option index distribution (all 1144 MC items are 4-option)

| Scope | MC items | idx 0 | idx 1 | idx 2 | idx 3 | χ²(3) vs uniform | Verdict |
|---|---:|---|---|---|---|---:|---|
| **ALL LIVE** | 1144 | **644 (56.3%)** | 178 (15.6%) | 197 (17.2%) | 125 (10.9%) | **607.2** | p ≪ .001 |
| Pack A | 135 | 38 (28.1%) | 24 (17.8%) | **72 (53.3%)** | 1 (0.7%) | **78.5** | p ≪ .001 |
| Pack B | 489 | **462 (94.5%)** | 25 (5.1%) | 2 (0.4%) | 0 (0%) | **1262.1** | p ≪ .001 |
| Pack C | 520 | 144 (27.7%) | 129 (24.8%) | 123 (23.7%) | 124 (23.8%) | 2.2 | uniform ✅ |

**"Always click the first option" scores:**
- All live MC: **56.3%** (chance = 25%)
- **Pack B: 94.5%** — the hand-checked CCSS-textbook pack, which *leads* every practice selection
- Pack A: best fixed position is index 2 → 53.3%
- Pack C: 27.7% — pack C is the only pack that is *not* gameable this way

**Per grade** (every grade is significant at p<.001; χ² critical = 16.27):

| Grade | MC | idx0 % | idx1 % | idx2 % | idx3 % | χ²(3) |
|---|---:|---:|---:|---:|---:|---:|
| K | 46 | 67.4 | 6.5 | 26.1 | 0 | 50.9 |
| G1 | 81 | 27.2 | 23.5 | 48.1 | 1.2 | 35.9 |
| G2 | 34 | 73.5 | 8.8 | 17.6 | 0 | 44.8 |
| G3 | 36 | 75.0 | 5.6 | 19.4 | 0 | 50.9 |
| G4 | 47 | **78.7** | 8.5 | 12.8 | 0 | 73.9 |
| G5 | 41 | 75.6 | 17.1 | 7.3 | 0 | 58.4 |
| G6 | 107 | 47.7 | 22.4 | 15.9 | 14.0 | 31.0 |
| G7 | 107 | 49.5 | 15.9 | 17.8 | 16.8 | 34.4 |
| G8 | 122 | 49.2 | 18.0 | 18.9 | 13.9 | 38.7 |
| G9 | 141 | 58.9 | 13.5 | 12.1 | 15.6 | 86.6 |
| G10 | 150 | 65.3 | 14.0 | 6.7 | 14.0 | 132.3 |
| G11 | 115 | 46.1 | 16.5 | 19.1 | 18.3 | 27.4 |
| G12 | 117 | 62.4 | 15.4 | 13.7 | 8.5 | 88.4 |

**32 of the 46 topics with ≥10 MC items let "always click option 1" score ≥50%.**
Two topics are at 100%: `us-ca-math-p5-5-nbt-decimals` (G5, 10/10 at index 0) and
`us-ca-math-p2-2-md-measure-data-money-time` (G2, 10/10 at index 0).
Also ≥75%: `us-ca-math-p5-5-nf-operations` 90.9%, `us-ca-math-p4-4-nf-fraction-decimal` 86.7%,
`us-ca-math-k-k-cc-cardinality-compare` 84.6%, `us-ca-math-p1-1-g-shape-reasoning` 81.8%,
`us-ca-math-k-k-g-shapes-position` 78.6%, `us-ca-math-s6-chapter-02` 75%, `us-ca-math-s4-chapter-05` 75%.

### 2.3 Answer-value concentration

Per grade, top answer share is moderate (3.3%–11.8%) and top-3 share 8.3%–24.9%.
The damage is concentrated at **topic** level:

| Topic | Grade | Items | Distinct answers | Modal answer | Share | Top-3 share |
|---|---|---:|---:|---|---:|---:|
| `us-ca-math-s5-chapter-04` (Data Modeling & Residuals) | G11 | 42 | **7** | `f` | **54.8%** | **81.0%** |
| `us-ca-math-s6-chapter-03` (Decision Statistics) | G12 | 42 | **5** | `2` | 42.9% | 78.6% |
| `us-ca-math-s2-chapter-04` (Pythagorean/Coordinate) | G8 | 43 | **5** | `10` | 32.6% | 76.7% |
| `us-ca-math-s4-chapter-02` (Similarity/Right-Triangle) | G10 | 43 | 15 | `3/4` | 32.6% | 67.4% |
| `us-ca-math-s4-chapter-05` (Conditional Probability) | G10 | 43 | 16 | `1/5` | 25.6% | 48.8% |
| `us-ca-math-k-k-cc-cardinality-compare` | K | 18 | 6 | `13`/`7` | 27.8–33.3% | 75.0% |
| `us-ca-math-p3-3-g-categories` | G3 | 18 | 6 | `4` | 33.3% | 66.7% |

**Templates whose answer is effectively a constant:**

| Template | Items | Distinct answers | Distribution | Grade |
|---|---:|---:|---|---|
| `t_sse_compare` | 23 | **1** | `f` ×23 (**100%**) | G11 |
| `t_trig_ratio` | 25 | 2 | `3/4` ×14, `5/12` ×11 | G10 |
| `t_distance_points` | 17 | 3 | `5` ×9, `10` ×4, `13` ×4 | G8 |
| `t_expected_value` | 14 | 3 | `2` ×8, `1` ×4, `3` ×2 | G12 |

`t_sse_compare` is a pure exploit: *"Model f has a sum of squared residuals of N, and model g
has M. Which model fits the data better?"* — the answer is **"f" every single time**, 23/23.

---

## 3. Standards coverage

Registry parsed from `data/ccss/{grades-k2,grades-35,grades-68,grade-hs}.ts` via `index.ts`:
**385 standards, 147 clusters, 65 domains** (K, 1–8, HS). `data/ccssStandards.ts` is a
*different, smaller* registry (229 K–8 standards, HS charted at domain level as sealed
aggregates) used only for the Math Universe / Class Sky map, not for practice selection.

### 3.1 Nominal tag coverage: 100% — and why that number is a mirage

| CCSS grade | Standards | Nominally tagged | Zero-tag | min / median / max items tagged |
|---|---:|---:|---:|---|
| K | 22 | 22 | 0 | 15 / 15 / 15 |
| 1 | 21 | 21 | 0 | 15 / 15 / **159** |
| 2 | 26 | 26 | 0 | 15 / 15 / 15 |
| 3 | 25 | 25 | 0 | 15 / 15 / 15 |
| 4 | 28 | 28 | 0 | 15 / 15 / 15 |
| 5 | 26 | 26 | 0 | 15 / 15 / 15 |
| 6 | 29 | 29 | 0 | 3 / 3 / 6 |
| 7 | 24 | 24 | 0 | 3 / 3 / 3 |
| 8 | 28 | 28 | 0 | 3 / 3 / 3 |
| HS | 156 | 156 | 0 | 3 / 3 / 3 |

Three things make this 100% meaningless:

1. **Pack C carries no standard-level tags at all.** Its 1500 items (53.5% of the live bank)
   are tagged only with 34 **domain-level pseudo-ids** — `CA.CCSS.Math.G6.RP`,
   `CA.CCSS.Math.HS.F-IF`, `CA.CCSS.Math.HS.Modeling`, etc. — none of which is a canonical
   CCSS id. Every standard-level claim for G6–G12 rests on **pack B alone**, which supplies
   **exactly 3 items per standard**.
2. **Tags are cluster-wide, not targeted.** Tag width across the live bank:
   531 items with 1 canonical tag, 504 with 2–3, 159 with 4–6, 108 with 7+, and 1500 with none.
   Only **173 of 385 standards (44.9%)** are ever named *alone* by some item —
   K 3/22 (13.6%), HS 43/156 (27.6%), G1 9/21 (42.9%), G5 15/26 (57.7%), G8 16/28 (57.1%).
3. **Extreme over-representation in G1.** `1.OA.A.1` carries 159 item-tags;
   `1.OA.B.4`, `1.OA.C.6`, `1.OA.D.7` carry 87 each; `1.OA.C.5` 75; `1.OA.D.8` 51 —
   the six 51+ standards are all Grade 1 Operations & Algebraic Thinking.
   Items-per-standard histogram over all 385: **236 standards at 3–5**, 1 at 6–10,
   142 at 11–20, 6 at 51+.

### 3.2 Reachable coverage — the honest number

A standard only counts if a learner can actually be served an item tagged with it.
Two models were computed against the real serving code (see §5 for the mechanics).

| Model | Zero-coverage standards | Zero clusters | Zero domains |
|---|---:|---:|---:|
| Nominal tag presence | 0 / 385 (0%) | 0 / 147 | 0 / 65 |
| **Free-selection practice** (topic × difficulty × type, first-5) | **65 / 385 (16.9%)** | **15 / 147** | **2 / 65** |
| **Union of all 3 serving paths** (free-selection + lesson checkpoint + adaptive) | **25 / 385 (6.5%)** | **8 / 147** | **1 / 65** |

Per-grade reachable coverage (union of all paths):

| CCSS grade | Standards | Reachable | **Zero-reachable** | % reachable |
|---|---:|---:|---:|---:|
| K–5 | 148 | 148 | 0 | 100% |
| 6 | 29 | 26 | **3** | 89.7% |
| 7 | 24 | 24 | 0 | 100% |
| 8 | 28 | 26 | **2** | 92.9% |
| **HS** | 156 | 136 | **20** | **87.2%** |

### 3.3 **NAMED uncovered standards** (union of all three serving paths — 25 total)

**Grade 6 (3)**
- `6.NS.C.6`, `6.NS.C.8` — *NS.C "Extend understanding of numbers to rational numbers"*
- `6.EE.B.8` — *EE.B "Reason about and solve one-variable equations and inequalities"*

**Grade 8 (2)**
- `8.EE.C.8` — *EE.C "Analyze and solve … pairs of simultaneous linear equations"*
- `8.G.C.9` — *G.C "Solve problems involving volume of cylinders, cones, and spheres"* — **whole cluster dead**

**High School (20)**
- `N-CN.7`, `N-CN.8`, `N-CN.9` — *N-CN.C "Use complex numbers in polynomial identities and equations"* — **whole cluster dead**
- `A-APR.1` — *A-APR.A "Perform arithmetic operations on polynomials"* — **whole cluster dead**
- `A-APR.4`, `A-APR.5` — *A-APR.C "Use polynomial identities to solve problems"* — **whole cluster dead**
- `A-APR.6`, `A-APR.7` — *A-APR.D "Rewrite rational expressions"* — **whole cluster dead**
- `F-TF.8`, `F-TF.9` — *F-TF.C "Prove and apply trigonometric identities"* — **whole cluster dead**
- `G-CO.11` — *G-CO.C "Prove geometric theorems"*
- `G-SRT.6`, `G-SRT.7` — *G-SRT.C "Define trigonometric ratios and solve right-triangle problems"*
- `G-GMD.1`, `G-GMD.2`, `G-GMD.3` — *G-GMD.A "Explain volume formulas…"* — **whole cluster dead**
- `G-GMD.4` — *G-GMD.B "Visualize relationships between 2-D and 3-D objects"* — **whole cluster dead**
  → **`G-GMD` (Geometric Measurement & Dimension) is an entire HS domain with zero reachable practice.**
- `S-ID.5` — *S-ID.B "Summarize, represent, and interpret data on two variables"*
- `S-CP.4` — *S-CP.A "Understand independence and conditional probability"*
- `S-CP.8` — *S-CP.B "Compute probabilities of compound events"*

### 3.4 Additional standards unreachable on the **default free-selection path**

If a learner never navigates into a lesson checkpoint or an adaptive plan (the plain
"pick a grade and topic and practise" flow), a further 40 standards go dark, taking the
total to **65 / 385 (16.9%)** and adding these fully-dead clusters:

`6.EE.C` (6.EE.C.9) · `8.G.C` · `HS N-CN.C` · `HS A-APR.A/C/D` · `HS A-REI.D` (A-REI.10/11/12)
· `HS F-TF.C` · `HS G-CO.B` (G-CO.6/7/8) · `HS G-CO.D` (G-CO.12/13) · `HS G-SRT.B` (G-SRT.4/5)
· `HS G-GMD.A` · `HS G-GMD.B` · `HS G-MG.A` (G-MG.1/2/3) · `HS S-ID.B`

plus a **second dead HS domain: `G-MG` (Modeling with Geometry)**. Also newly dark:
`6.NS.C.7`, `7.G.B.4`, `8.F.B.5`, `8.G.B.8`, `8.SP.A.4`, `N-VM.6–10`, `A-CED.3/4`,
`A-REI.7/8/9`, `F-IF.9`, `G-SRT.10/11`, `S-ID.6/8/9`, `S-IC.4/5/6`, `S-CP.3/6`.

---

## 4. Grade balance

| Grade | Live items | pack A | pack B | pack C | Topics | Unique prompts | Items/topic |
|---|---:|---:|---:|---:|---:|---:|---:|
| K | 102 | 72 | 30 | 0 | 6 | 92 | 17.0 |
| G1 | 237 | 192 | 45 | 0 | **16** | 224 | 14.8 |
| G2 | 111 | 48 | 63 | 0 | **4** | 108 | 27.8 |
| G3 | 120 | 60 | 60 | 0 | 5 | 117 | 24.0 |
| G4 | 138 | 60 | 78 | 0 | 5 | 136 | 27.6 |
| G5 | 120 | 60 | 60 | 0 | 5 | 117 | 24.0 |
| G6 | 284 | 0 | 69 | 215 | 5 | 252 | 56.8 |
| G7 | 275 | 0 | 60 | 215 | 5 | 239 | 55.0 |
| G8 | 281 | 0 | 66 | 215 | 5 | 250 | 56.2 |
| G9 | 299 | 0 | 84 | 215 | 5 | 271 | 59.8 |
| G10 | 305 | 0 | 90 | 215 | 5 | 233 | 61.0 |
| G11 | 264 | 0 | 51 | 213 | 5 | 208 | 52.8 |
| G12 | 266 | 0 | 54 | 212 | 5 | 212 | 53.2 |
| **Total** | **2802** | 492 | 810 | 1500 | **76** | 2455 | |

**K–G5: 828 items over 41 topics. G6–G12: 1974 items over 35 topics.**

What each student actually experiences:

- **K–G5** — small banks but *real, varied* content: 92–224 distinct prompts a year, 37–61%
  near-duplication, and MC that is heavily biased toward option 1 (67–79% at index 0 in
  K, G2–G5). A K–G5 student can be right most of the time without reading the question.
- **G2 is the topic-starved grade**: an entire school year is exposed as **4 selectable topics**
  (vs 16 in G1, 6 in K). G3/G4/G5 have 5 each.
- **G6–G12** — the banks look big (264–305 items) but are only 63–109 distinct prompt
  skeletons and, in G10/G11/G12, ~1/3 of items are literal verbatim repeats. Each grade is
  exposed as exactly **5 topics** (the 5 chapters), so a G12 student sees five buttons for the year.
- **HS band (G9–G12)** carries the worst combination in the product: highest exact-duplication
  (30–33%), most answer-concentrated topics, and 20 named CCSS standards with no reachable item.

---

## 5. Topic reachability & practice-session realism

### 5.1 Session size (grepped from the app)

| Constant | Value | Location |
|---|---:|---|
| `freeSelectionRoundQuestionCount` | **5** | `app/practice/page.tsx:185` |
| `requiredAdaptiveQuestionCount` | **5** | `app/practice/page.tsx:184` |
| `adaptiveQuestionSetSize` | **5** | `lib/adaptiveLearning.ts:27` |
| lesson checkpoint size | **8** | `selectPracticeQuestionIds()` → `.slice(0, 8)`, `data/usCaliforniaLessons.ts:208-230` |

**A practice round is 5 questions, and it is deterministic.**
`app/practice/page.tsx:1304` → `displayedQuestions.slice(0, freeSelectionRoundQuestionCount)`;
`selectAdaptiveQuestions` sorts by (difficulty order, type, id) then `.slice(0, limit)`;
`getPublicQuestionsFromStore` returns pack order and memoises the result in
`publicQuestionsCache`. There is no shuffle and no rotation anywhere.

### 5.2 Topic depth

All 76 topics have ≥9 items and ≥9 unique prompts — **no topic renders with <5 questions**.
Two topics have <5 distinct prompt *skeletons*. Topic size histogram:
9–12 items ×12, 13–20 ×8, 21–43 ×23, 44+ ×33.

### 5.3 How many distinct sessions a student really gets

**Default path** (pick topic, leave difficulty/type on "all"): the round is the *same 5 items
every time*, so there is exactly **one distinct round per topic**.

| Grade | Topics = distinct default rounds | Items ever served on this path | % of grade bank |
|---|---:|---:|---:|
| K | 6 | 30 | 29.4% |
| G1 | 16 | 80 | 33.8% |
| G2 | **4** | 20 | 18.0% |
| G3 | 5 | 25 | 20.8% |
| G4 | 5 | 25 | 18.1% |
| G5 | 5 | 25 | 20.8% |
| G6–G12 | **5 each** | 25 each | **8.2–9.5%** |

Across all grades that is **380 of 2802 items (13.6%)** ever served on the default path.

**Exhaustive path** (every combination of topic × difficulty filter × question-type filter):
**825 distinct rounds** total; 1878/2802 items (67.0%) reachable.

**Union of all three serving paths** (free-selection + 8-item lesson checkpoint + adaptive
across all stages and actions):

| Grade | Bank | Reachable | **Stranded** | % reachable | Distinct free rounds | **Non-repeating 5-q sessions** |
|---|---:|---:|---:|---:|---:|---:|
| K | 102 | 90 | 12 | 88.2 | 57 | 18 |
| G1 | 237 | 227 | 10 | 95.8 | 116 | 43 |
| G2 | 111 | 94 | 17 | 84.7 | 38 | 18 |
| G3 | 120 | 104 | 16 | 86.7 | 43 | 20 |
| G4 | 138 | 113 | 25 | 81.9 | 50 | 22 |
| G5 | 120 | 97 | 23 | 80.8 | 42 | 19 |
| G6 | 284 | 204 | 80 | 71.8 | 68 | 38 |
| G7 | 275 | 199 | 76 | 72.4 | 68 | 36 |
| G8 | 281 | 204 | 77 | 72.6 | 67 | 38 |
| G9 | 299 | 220 | 79 | 73.6 | 66 | 40 |
| G10 | 305 | 206 | 99 | 67.5 | 67 | 33 |
| G11 | 264 | 183 | 81 | 69.3 | 69 | 31 |
| G12 | 266 | 185 | 81 | 69.5 | 74 | 30 |
| **All** | **2802** | **2126** | **676 (24.1%)** | 75.9 | 825 | |

Path contribution: free-selection 1878 items · lesson checkpoint 608 · adaptive 988 · union 2126.

### 5.4 The 1500-item G6–G12 bank barely reaches a learner

Two independent mechanisms suppress pack C:

1. **`selectPracticeQuestionIds` difficulty-quota bug** (`data/usCaliforniaLessons.ts:208-230`).
   It filters on the **raw** `question.difficulty` against the quota list `Low/Medium/High`,
   but pack C's raw difficulties are `Foundation / Core / Challenge / Exam`. The quota pass is
   therefore a **complete no-op for all 1500 pack-C items**. (Everywhere else in the app the
   value goes through `mapDifficultyToActive()` first — `data/usCaliforniaQuestions.ts:106`.)
2. **"Hand-checked CCSS textbook practice leads"** — pack B is added to the checkpoint first.

Result: **31 of the 35 G6–G12 lesson checkpoints contain 0 items from the 1500-item pack C.**
Only `us-ca-math-s6-chapter-01` (5 of 8), `us-ca-math-s4-chapter-04` (2 of 8),
`us-ca-math-s5-chapter-04` (8 of 8) and `us-ca-math-s6-chapter-04` (8 of 8) draw from it.

The same is true of the default free-selection round: **32 of 34 G6–G12 topics serve a first-5
drawn entirely from pack B**; only `us-ca-math-s5-chapter-04` and `us-ca-math-s6-chapter-04`
show pack-C content, and `us-ca-math-s6-chapter-01` shows a mix.

**`us-ca-math-s5-chapter-04` (G11 "Data Modeling and Residuals") is the worst topic in the
product.** Its default first-5 round is 4 × *"Model f has a sum of squared residuals of N, and
model g has M. Which model fits the data better?"* → answer `f`, plus one residual question
(2 distinct answers in 5 questions). Its 8-question lesson checkpoint is 7 × `f` + 1 × `3`
(2 distinct answers in 8 questions). The whole 42-item topic has 7 distinct answers.

---

## 6. Findings by severity

### P0 — selectable but effectively unusable content

| # | Finding | Evidence |
|---|---|---|
| P0-1 | **`us-ca-math-s5-chapter-04` (G11, "Data Modeling and Residuals")** is selectable from the G11 topic list, and everything it serves is the same question. Default round: 4 of 5 items are `t_sse_compare` with answer `f`. Lesson checkpoint: 7 of 8 items answer `f`. The template has **1 distinct answer across all 23 of its items**. A learner "masters" the topic by typing `f`. | §2.3, §5.4 |
| P0-2 | **HS domain `G-GMD` (Geometric Measurement & Dimension) has zero reachable practice items on every serving path** — `G-GMD.1/2/3/4`. Volume formulas and 2-D/3-D cross-sections are a G9–G12 selectable strand with no practice behind it. A second HS domain, `G-MG` (Modeling with Geometry, `G-MG.1/2/3`), is dead on the default free-selection path. | §3.3, §3.4 |

### P1 — materially gameable or repetitive experience; whole CCSS clusters at zero

| # | Finding | Evidence |
|---|---|---|
| P1-1 | **MC correct answer sits at index 0 in 56.3% of all live MC items (χ²=607, p≪.001), and in 94.5% of pack B.** With no shuffling anywhere in the render path, "always click the first option" scores 56% overall and 94.5% on the pack that leads every checkpoint. 32 of 46 topics with ≥10 MC items are ≥50% gameable this way; two are 100%. The reduced-choice accommodation preserves order, so it *strengthens* the exploit for the students who need it most. | §2.1, §2.2 |
| P1-2 | **The 1500-item G6–G12 bank is 102 distinct question sentences** (99.6% of items sit in a near-duplicate group; 30.8% are verbatim repeats; 67.9% collide on `(template, answer)`). G12 ch01 has 43 items and 9 distinct prompts. `t_hypotenuse`, `t_trig_ratio`, `t_kmh_to_ms`, `t_circle_circumference`, `t_period_degrees`, `t_sig_figs` are 100% duplicated. | §1.1, §1.3, §1.4 |
| P1-3 | **8 CCSS clusters have zero reachable practice on every path** (`8.G.C`, `HS N-CN.C`, `A-APR.A`, `A-APR.C`, `A-APR.D`, `F-TF.C`, `G-GMD.A`, `G-GMD.B`); **15 clusters** on the default free-selection path, adding `6.EE.C`, `A-REI.D`, `G-CO.B`, `G-CO.D`, `G-SRT.B`, `G-MG.A`, `S-ID.B`. 25 named standards uncovered overall, 65 on the default path. | §3.3, §3.4 |
| P1-4 | **Practice never rotates.** Round selection is `.slice(0, 5)` over a memoised, unshuffled list. On the default path a student gets **one** 5-question round per topic — 4 rounds for the whole of G2, 5 for each of G6–G12 — reaching 8.2–9.5% of the G6–G12 bank and 13.6% of the live bank overall. | §5.1, §5.3 |
| P1-5 | **`selectPracticeQuestionIds` difficulty-quota bug** — raw `Foundation/Core/Challenge/Exam` never matches the `Low/Medium/High` quota list, so the difficulty balancing is a no-op for the entire G6–G12 bank, and **31 of 35 G6–G12 checkpoints contain 0 items from the 1500-item pack**. 1500 authored items are near-inert. | §5.4 |
| P1-6 | **Standards coverage is nominal, not real.** Pack C contributes **zero canonical standard tags** (34 domain-level pseudo-ids only); all G6–HS standard coverage is 3 items per standard from pack B. Only 173/385 standards (44.9%) are ever named alone by an item — K 13.6%, HS 27.6%. | §3.1 |

### P2 — imbalance worth noting

| # | Finding | Evidence |
|---|---|---|
| P2-1 | **G2 is exposed as 4 topics for the whole year** (K 6, G1 16, G3–G12 5 each). | §4 |
| P2-2 | **Grade-1 over-representation:** `1.OA.A.1` carries 159 item-tags vs a median of 15 for K–5 and 3 for G6–HS; the six 51+ standards are all G1 OA. | §3.1 |
| P2-3 | **676 live items (24.1%) are stranded** — present in the bank, never servable by any path. Worst: G10 99, G12 81, G11 81, G6 80. | §5.3 |
| P2-4 | **Pack A near-duplication is 67.5%** despite only 11.6% exact duplication — K "Geometry: Shapes Position" is 12 items / 4 prompts (100% exact dup); "K Cardinality Compare" is 12 items on a single skeleton. | §1.1, §1.5 |
| P2-5 | **Pack B is typed `CaliforniaK5GradeId`** in `data/usCaliforniaTopics.ts` but holds 474 G6–G12 items; the `as` cast hides it from the compiler. | §0 |
| P2-6 | **Retired DeepSeek pack is cleanly out** — `practiceLive:false`, not in `questionPacks`, its 60 topicIds are exclusive to it, so nothing renders empty. Its retirement is why K–G5 shows 41 topics rather than ~100. No action needed; confirmed only. | §0 |
