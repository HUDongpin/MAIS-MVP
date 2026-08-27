# 沪教版 初高中 (hjb-junior S1–S3, hjb-high S4–S6) — 中国大陆数学内容 QA

Auditor role: 沪教版初高中数学教研员. Reference standards:
《义务教育数学课程标准（2022年版）》(S1–S3) and
《普通高中数学课程标准（2017年版2020年修订）》(S4–S6), judged against the
沪教版 volume/unit sequence (上海二期课改教材). Every numeric claim below was
computed (python3/sympy/numpy or `node`), never eyeballed.

## Coverage

**hjb-high — 1500 items (S4 500, S5 500, S6 500)**
- **Read in full** (prompt + options + answer + explanation): **261 items**
  - S4: 226 — *every* item in the slice that is not template-generated (see F1); plus 15 targeted re-reads
  - S5: 8 — one exemplar per prompt skeleton (each S5 topic has exactly one skeleton)
  - S6: 12 — one exemplar per prompt skeleton, plus the two 数量积 clusters
- **Answer keys machine-verified: 1274 of 1500 (84.9%)** — I wrote a regex+`Fraction`/`sympy`
  verifier for all 20 prompt skeletons of size ≥7 and recomputed every key from the
  prompt's own numbers. This is 100% of the template-generated population, including all
  130 mean-of-three items.
- 10 further S4 keys re-derived individually in sympy/numpy (F6–F10).
- All 1500 items scanned programmatically for: duplicate prompts, MC answer∈options,
  duplicate/ambiguous options, missing fields, figure references, traditional characters,
  Latin text, LaTeX delimiters, `term-XXXX` placeholders, distractor spread.

**hjb-junior — 1500 items (S1 500, S2 500, S3 500)**
- **Read in full: 226 items** = 186 stratified random (62 per grade, `random.seed(20260826)`)
  + 40 targeted (all 6 「整数解」 items, all 5 statistics-variance mismatches, 变式 exemplars,
  embedded-option items, all off-syllabus circle-theorem items).
  Per grade read: S1 ≈ 79, S2 ≈ 70, S3 ≈ 77.
- **Answer keys machine-verified: 143 items** — 40 statistics items (mean/median/mode/variance
  recomputed from the printed data), 19 因式分解 (sympy `expand` round-trip), 15 解方程,
  16 化简/计算, 53 in small geometry/arithmetic families (中位数, 勾股, 相似, 平行四边形角,
  一元一次不等式, 内错角, DE∥BC).
- All 1500 scanned programmatically as above.

**Selection method**: skeleton clustering first (to find the structural story), then
exhaustive reading of the non-templated residue in hjb-high, then stratified random
sampling in hjb-junior, then targeted greps driven by defect hypotheses.

**NOT covered / limits**
- I did not read the ~1240 hjb-high templated items individually; their **keys** are 100%
  machine-verified but their explanations were only sampled.
- ~85% of hjb-junior was not read in full. Defect *rates* quoted for hjb-junior are
  explicitly labelled as extrapolations from the 226-item read sample.
- I inspected the JSONL only. I did **not** verify how the runtime renders `\(...\)` LaTeX,
  how `acceptedAnswers` is used by the grader, or whether `acceptedAnswers` is ever
  displayed. F14/F31/F32 severities depend on that.
- Free-response/proof items were checked for mathematical correctness but not for whether
  the grading pipeline can score them.
- No item in either slice references an absent figure (verified: 0 hits for
  如图/下图/图中/图示/见图 across prompts and options), so there are **no figure-dependent
  UNSOLVABLE items**. The unsolvable/ill-posed items I did find are F26 and F27.

---

## Findings

### F1 — hjb-high 难度坍塌：S5/S6 每一个课题都只有一条题干模板 (headline)
- severity: major (rubric); **this is the single ship-blocking finding for hjb-high**
- category: curriculum-alignment
- affected: **1274 of 1500 items (84.9%)**; S4 274/500 (54.8%), **S5 500/500 (100%), S6 500/500 (100%)**
- evidence:
  Skeleton clustering (digits → `#`) gives 241 skeletons for 1500 items. 20 skeletons of
  size ≥7 absorb 1274 items. Per-topic distinct-skeleton counts:

  | 年级 | 课题 | n | 不同题干 | 模板占比 |
  |---|---|---|---|---|
  | S5 | 数列 / 圆锥曲线 / 空间向量及其应用 / 平面直角坐标系中的直线 | 70 each | **1** | 100% |
  | S5 | 统计 / 概率初步 / 空间直线与平面 / 简单几何体 | 55 each | **1** | 100% |
  | S6 | 导数及其运用 / 计数原理 / 概率初步续 / 成对数据的统计分析 | 75 each | **1** | 100% |
  | S6 | 全部 8 个「综合复习」课题 | 20–25 each | **1** | 100% |
  | S4 | 三角函数 / 复数 / 平面向量 | 63/62/62 | **1** | 100% |
  | S4 | 集合与逻辑 / 等式与不等式 | 50 each | 48 | 0% |

  The single skeleton for 成对数据的统计分析 (75 items) is
  > `一组数据为 3，16，29，求这组数据的平均数。`

  and **0 of those 75 items mention 相关关系、回归、散点图、列联表、独立性检验 or 相关系数** —
  i.e. the entire 选择性必修 chapter is represented by nothing but the arithmetic mean of
  three integers.
- why: The 2017/2020 高中课标 defines three 学业质量水平 and six 核心素养
  (数学抽象、逻辑推理、数学建模、直观想象、数学运算、数据分析). A bank in which one prompt
  template covers an entire chapter can only ever probe 水平一 单一知识点的直接运用, and for
  many clusters not even that. The **topic spine itself is correct** — S4 = 沪教版必修一/二,
  S5 = 沪教版高二, S6 = 沪教版高三 — so this is **not 超纲/欠纲 by topic; it is 欠纲 by 认知水平**.
- fix: The S5/S6 halves of this slice cannot be repaired item-by-item; they must be
  re-authored. Minimum acceptance bar per topic: ≥12 distinct prompt skeletons, ≥40% of
  items requiring ≥2 reasoning steps, and at least one 建模/论证 item per 课题.

### F2 — 582 高中题实为小学/初中题（其中 130 题为「三个数求平均数」）
- severity: major
- category: curriculum-alignment
- affected: 582 of 1500 (38.8%) — the subset of F1 that requires **zero** senior-high knowledge
- evidence (each row is one skeleton; all keys machine-verified, all correct):

  | n | 题干 | 实际认知要求 | 对应学段 |
  |---:|---|---|---|
  | **130** | `一组数据为 3，16，29，求这组数据的平均数。` | 三数求平均 | 小学四~五年级 |
  | 95 | `椭圆 x²/225+y²/25=1 中，求 c²=a²-b² 的值。` | 题干已给公式，只做减法 | 小学减法 |
  | 75 | `长方体中同一顶点出发的两条互相垂直棱长分别为 5 和 17，这两条棱围成的矩形面积是多少？` | 长方形面积 | 小学三年级 |
  | 75 | `若事件 A 有 8 种情况，且每种 A 情况下事件 B 有 19 种情况，则按分步计数共有多少种结果？` | 两位数乘法 | 小学三~四年级 |
  | 75 | `袋中有 6 个红球和 13 个蓝球，随机取出 1 个，取到红球的概率是多少？` | 古典概型单次抽取 | 初三（义教课标） |
  | 55 | `一个长方体的长、宽、高分别为 8、8、7，求体积。` | 长方体体积 | 小学五年级 |
  | 37 | `已知 f(x)=9x+9，求 f(14)。` | 一次函数求值 | 初二 |
  | 33 | `在三角形 ABC 中，若 AB=12，AC=10，求边 AB 与边 AC 的长度乘积。` | 两数相乘 | 小学 |
  | 7 | `函数 f(x)=10^x，求 f(2)。` | 乘方 | 初一 |

  A further 692 items (46.1%) are on the correct 高中 topic but are a single substitution
  into one formula (等差数列通项、斜率公式、|p|²、f'(x)、C(n,2)、T=2π/ω、坐标数量积、复数实部、
  对数恒等式).
- why: 130/1500 = **1 in every 11.5 items in the entire 高中 bank** is "average of three
  numbers", split S5 55 / S6 75. 平均数 enters the 义务教育课标 at 第二学段 (小四). Serving it
  to a 高二/高三 mainland learner under the topic labels 统计 and 成对数据的统计分析 is not a
  difficulty-calibration slip; it is a category error.
- fix: Delete all 582; re-author against the 沪教版高二/高三 chapter objectives. For
  成对数据的统计分析 specifically: 散点图与相关性判断、样本相关系数、经验回归方程、
  2×2 列联表与 χ² 独立性检验.

### F3 — 130 道「三数平均数」答案键：130/130 全部正确（已逐题机器核算）
- severity: n/a — verified negative, reported because it was the assigned question
- category: answer-key
- affected: all 130 items sharing skeleton `一组数据为 #，#，#，求这组数据的平均数。`
- evidence: parsed the three integers from each prompt, computed `(a+b+c)/3` as an exact
  `Fraction`, compared to `answer`. **pass 130, fail 0.** 21 distinct answer values across
  the 130 items; the most common answer (`14`) covers 10%.
- why: The keys are arithmetically sound. The defect is entirely F2 (wrong 学段), not
  wrong mathematics. Do not let a "keys are clean" report hide that.
- fix: none needed to the keys; the items themselves must go.

### F4 — `AB·AC` 的答案键忽略 ∠A，与同一切片内的向量题自相矛盾
- severity: **blocker**
- category: answer-key
- affected: `hjb-high-ds-v2-s4-281` … `hjb-high-ds-v2-s4-300`, **20 items** (S4 三角)
- evidence:
  > P: `在三角形 ABC 中，若 AB=5，AC=14，且 ∠A=60°，表达式 AB·AC 的值是多少？`
  > A: `70`
  > E: `AB·AC 只表示两边长度乘积，5×14=70。`

  Machine check of all 20: key = `AB×AC` in **20/20**; key = `AB·AC·cos∠A` in **0/20**.
  Meanwhile in the same slice:
  > `hjb-high-ds-v2-s6-421` P: `…AB=10，AC=14，且 ∠A=60°，求向量 \overrightarrow{AB} 与 \overrightarrow{AC} 的数量积。` A: `70` (=10×14×cos60°) ✔
- why: In 沪教版必修二 第七章 平面向量 — which is in this same S4 slice, 62 items — the dot
  notation between two segments of a triangle with the included angle supplied is the
  **数量积** and nothing else. The `∠A=60°` datum is otherwise completely superfluous; it is
  in the prompt only because the item was authored as a dot-product item and then given the
  wrong key. Correct value for s4-281 is 5×14×cos60° = **35**, not 70. A learner who has
  covered 平面向量 answers 35 and is marked wrong.
- fix: Either (a) set the key to `AB·AC·cos∠A` and rewrite the prompt as
  `求 \overrightarrow{AB}·\overrightarrow{AC}`, or (b) delete `∠A=60°` and write
  `求 AB 与 AC 的长度之积` (which is what cluster `s4-251…` already does correctly, 33 items).
  Do not ship both readings of `·` in one bank.

### F5 — 204 组重复题干：答案无冲突，但难度标签/年级/题型互相矛盾
- severity: major
- category: data-integrity
- affected: hjb-high — **128 duplicate-prompt groups covering 332 items (204 redundant copies)**
- evidence (all computed on whitespace-normalised prompts):
  - **groups whose duplicates carry DIFFERENT answers: 0.** The blocker case you asked me
    to hunt for does not occur in this slice.
  - groups whose duplicates carry **different `difficulty`: 82 groups / 237 items**
    > `函数 y=11sin(2x+1π/6) 的最小正周期是多少？`
    > `s4-315` short-answer **Medium** | `s4-329` fill-in **Low** | `s4-351` short-answer **Medium** | `s4-361` multiple-choice **High` — identical text, answer `π` in all four.
  - groups spanning **two different grades: 42 groups / 96 items**
    > `已知 f(x)=8x+11，求 f(11)。` → `s4-214` (S4 函数的概念、性质及应用) and `s6-401` (S6 函数、导数与不等式综合)
    > `长方体中…棱长分别为 5 和 17…` → `s5-001` (S5 空间直线与平面) and `s6-450` (S6 立体几何与空间向量综合)
  - groups with **different `type`: 90 groups / 255 items**
  - largest single group: `从 5 个不同元素中选 2 个组成一个无序组合，共有多少种选法？` × **11**
  - hjb-junior has **0** exact duplicate prompts — but only because of the artifact in F6.
- why: `difficulty` is the field a spaced-repetition/adaptive engine uses to sequence work.
  When the *same* item is simultaneously Low and High, the label carries no information;
  measured across the whole slice, the mean-of-three cluster is labelled High 50 / Low 40 /
  Medium 40, i.e. indistinguishable from random assignment. The cross-grade duplicates mean
  a S6 learner is re-served S5 items verbatim under a "综合复习" banner.
- fix: De-duplicate on normalised prompt; keep one canonical record per prompt; derive
  `difficulty` from measured p-values, not from the authoring template.

### F6 — hjb-junior 题干中残留 `变式 N` 授权工件，并掩盖 47 份重复
- severity: major
- category: data-integrity
- affected: **72 items** (S1 15, S2 24, S3 33)
- evidence:
  > `hjb-junior-ds-v2-s1-103` prompt: `'下列因式分解中，正确的是（ ）\n变式 1'`
  > `hjb-junior-ds-v2-s1-270/273/276` prompt: `'解不等式 2(x - 1) ≤ x + 4。\n变式 1' / '变式 2' / '变式 3'` — same options (none), same answer `x ≤ 6`, same explanation, difficulty Medium/Low/Medium.

  Literal forms present: `变式 1` ×25, `变式 2` ×25, `变式 3` ×15, `变式 4` ×4, `变式 5` ×3.
  All 72 sit at the **end of the prompt**, on their own line, learner-facing. `变式` appears
  in 0 options, 0 answers, 0 explanations — it is a prompt-only artifact.

  Stripping `变式\s*\d+$` collapses the slice into **25 duplicate groups / 72 items /
  47 redundant copies**, of which **16 groups are byte-identical** in answer + options +
  explanation. So the artifact is functioning as a de-duplication key.
- why: 「变式」 is 教研 shorthand meaning "variant N of the same problem". Rendering it to a
  学生 is meaningless at best; here it is worse, because it is the only thing distinguishing
  47 copies of the same question. One group is *not* a true variant set and is actively
  broken: `s1-103` and `s1-121` share the prompt `下列因式分解中，正确的是（ ）变式 N` but have
  completely different option sets and answers (`x² + 7x + 12 = (x + 3)(x + 4)` vs
  `a² - 16 = (a - 4)(a + 4)`) — the prompt carries none of the information needed to tell
  them apart, so the "prompt" is not a question at all.
- fix: Strip `变式\s*\d+` from all 72 prompts. Then de-duplicate the 47 exposed copies. For
  `s1-103`/`s1-121` the prompt must be replaced with a self-contained stem or the options
  must be inlined.

### F7 — hjb-junior 答案键错误（逐题 sympy 验证）
- severity: **blocker**
- category: answer-key / math-error
- affected: 7 items — `s1-060`, `s1-275`, `s2-186`, `s2-217`, `s2-401`, `s3-293`, `s3-492`
  (+ `s3-447`, see F8)

**F7a `hjb-junior-ds-v2-s1-275`** (S1 一元一次不等式, fill-in)
> P: `不等式 3(x - 1) ≥ 5x + 7 的最大整数解是______。`  A: `-6`  acceptedAnswers: `['-6']`
- 3(x−1) ≥ 5x+7 ⟺ −2x ≥ 10 ⟺ **x ≤ −5**. The explanation itself derives `x ≤ -5` and then
  writes `最大整数解为 -6`. Verified: at x=−5, LHS=−18, RHS=−18, −18 ≥ −18 ✔ — so −5 *is* a
  solution and is larger than −6. Correct key: **−5**.
- I swept all 6 「整数解」 items in the slice; the other five (`s1-255`, `s1-268`, `s1-278`,
  `s1-290`, `s1-293`) are all correct. This is an isolated slip, not a family.

**F7b `hjb-junior-ds-v2-s1-060`** (S1 整式的乘除, short-answer)
> P: `已知 A = 2x³ - 5x² + 4x - 1，B = x² - 3x + 2，求 A ÷ B 的商式和余式。`  A: `商式为 2x+1，余式为 9x-3`
- `sympy.div(2x³−5x²+4x−1, x²−3x+2)` → quotient `2x+1`, **remainder `3x−3`**.
  Check: (2x+1)(x²−3x+2) + (3x−3) = 2x³−5x²+4x−1 ✔; with the key's 9x−3 you get
  2x³−5x²+**10x**−1 ✘. Correct key: **余式 3x−3**.
- Additionally **超纲**: 义务教育课标 2022 limits 初中整式除法 to 单项式÷单项式 and
  多项式÷单项式. 多项式的带余除法 is not in 沪教版七年级上第九章 整式.

**F7c `hjb-junior-ds-v2-s2-186`** (S2 一元二次方程, short-answer)
> P: `…x² - (2k+1)x + k² + k = 0 …(2) 若两根为 α、β 且 α² + β² = 7，求 k 的值。`  A: `k = 1 或 k = -2`
- α+β = 2k+1, αβ = k²+k ⇒ α²+β² = (2k+1)²−2(k²+k) = **2k²+2k+1**. Setting = 7 gives
  k²+k−3 = 0, **k = (−1±√13)/2**. Verified by substitution: k=1 → roots {1,2} → α²+β² = **5**;
  k=−2 → roots {−2,−1} → α²+β² = **5**. Neither key value satisfies the stated condition.
- Part (1) (Δ = 1 > 0) is correct. The item was almost certainly authored for α²+β² = 5.
- fix: change the condition to `α² + β² = 5` (then k = 1 or −2 is right), or change the key.

**F7d `hjb-junior-ds-v2-s2-217`** (S2 直角三角形, multiple-choice)
> P: `在△ABC中，AB=5，BC=12，AC=13，AD是∠A的平分线，交BC于点D。则点D到AC的距离为（ ）。`
> O: `["5","12","60/13","13/2"]`  A: `60/13`
- ∠B = 90°. D lies on the bisector of ∠A ⇒ dist(D, AB) = dist(D, AC) = x, and
  S△ABD + S△ACD = S△ABC ⇒ ½·5·x + ½·13·x = 30 ⇒ 9x = 30 ⇒ **x = 10/3**.
  `60/13` is the **altitude from B to AC** (2·30/13) — a different segment entirely.
- **Internal contradiction**: `hjb-junior-ds-v2-s2-238` is the *same* triangle and the *same*
  bisector and correctly answers `10/3`. Two items in one slice give incompatible answers to
  the same geometric quantity. `10/3` is not even among s2-217's four options.
- fix: key → `10/3`, and add `10/3` to the options (replace `13/2`).

**F7e `hjb-junior-ds-v2-s3-293`** (S3 圆与正多边形, fill-in)
> P: `在⊙O中，弦AB与弦CD相交于点E，∠AEC=70°，弧AD的度数为100°。求弧BC的度数。`  A: `40°`
> E: `圆内角∠AEC的度数等于它所对弧的度数和的一半，即(弧AD+弧BC)/2=70°…`
- The 两弦相交所成角 theorem: ∠AEC intercepts **arc AC and arc BD**, not arc AD and arc BC.
  (弧AD + 弧BC)/2 is ∠AE**D**, the supplement. So ∠AED = 110° ⇒ 100 + 弧BC = 220 ⇒
  **弧BC = 120°**.
  Verified by construction: placing A,C,B,D on a unit circle with arcs AC=70°, CB=120°,
  BD=70°, DA=100° and intersecting the chords numerically gives ∠AEC = **70.0000°** ✔ with
  弧BC = 120°. With 弧BC = 40° the angle would be 110°, not 70°.
- fix: key → `120°`; correct the explanation to `(弧AC + 弧BD)/2 = ∠AEC`.
- (This item is also part of F9 — the theorem is off-syllabus.)

**F7f `hjb-junior-ds-v2-s3-492`** (S3 统计初步, multiple-choice)
> P: `…得分为：78，85，92，88，76，81。这组数据的方差最接近下列哪个值？` O: `['32','36','40','44']` A: `36`
> E: `…≈187.33÷6≈31.22，四舍五入得31，最接近选项36。`
- Population variance (the 义务教育课标 definition, ÷n) = 281/9 = **31.222**. |31.22−32| = 0.78
  vs |31.22−36| = 4.78 ⇒ the closest option is **32**. The explanation computes 31.22 and then
  contradicts itself in the very next clause.
- (The key 36 matches the *sample* variance 562/15 = 37.47, which 初中 does not teach.)
- fix: key → `32`.

**F7g `hjb-junior-ds-v2-s2-401`** (S2 一次函数, fill-in) — see F8.

### F8 — 题干条件与答案键自相矛盾（题目本身不可解 / 数据与解法不符）
- severity: **blocker**
- category: math-error / data-integrity
- affected: `s2-401` (+ its contradictory twin `s2-416`), `s3-447`

**F8a `hjb-junior-ds-v2-s2-401` vs `hjb-junior-ds-v2-s2-416`** — identical scenario, incompatible keys
> P (both, verbatim identical): `某快递公司收费标准如下：每件包裹首重1千克收费10元，续重每千克收费4元（不足1千克按1千克计算）。设包裹质量为x千克（x≥1），总费用为y元。`
> `s2-401` A: `y=4x+6`   |   `s2-416` A: `y=10+4(⌈x⌉-1)`
- With 「不足1千克按1千克计算」 the function is a **step function**. At x = 1.5 kg the rule
  gives y = 10 + 4 = 14, while y = 4x+6 gives 12. **`s2-401`'s key is wrong**; its
  `acceptedAnswers` contains only the wrong linear forms (`['y=6+4x','y = 4x+6']`).
- `s2-416`'s key is mathematically right but uses `⌈x⌉` (向上取整), which is not 初中 notation
  in any mainland textbook; 沪教版 introduces it nowhere in 初中.
- fix: `s2-401` — delete the 「不足1千克按1千克计算」 clause (then y = 4x+6 is correct), or
  change the key. `s2-416` — replace `⌈x⌉` with a piecewise/table description, or move the
  item out of 初中.

**F8b `hjb-junior-ds-v2-s3-447`** — printed data ≠ the data the solution uses
> P: `…22名学生…成绩如下：68, 72, 75, 70, 68, 74, 72, 76, 70, 72, 74, 68, 76, 72, 70, 74, 68, 72, 76, 70, 74, 72。这组数据的方差是______（保留两位小数）。`  A: `7.27`
> E: `平均数=(68×4+70×4+72×6+74×4+76×4)/22=1584/22=72…160/22≈7.27`
- Actual tally of the printed list: 68×4, 70×4, 72×6, 74×4, **75×1, 76×3** = 22 values,
  sum **1583**, mean **71.9545**, population variance **3365/484 = 6.9525**.
  The solution silently assumes 76×4 and no 75 (sum 1584, mean 72, variance 160/22 = 7.2727).
- The printed item's answer is 6.95; **7.27 is unattainable from the data shown**. A `75`
  has been typo'd for a `76`.
- fix: change the third value `75` → `76`; then the key 7.27 is correct.
- I recomputed **all 40** machine-checkable statistics items in the slice
  (mean/median/mode/variance from the printed data). Apart from F7f and F8b, all pass; the
  other three apparent mismatches (`s3-427` 9.67→10, `s3-437` 29.67→30, `s3-443`) are
  correct rounding or my parser picking the wrong data series.

### F9 — hjb-junior 初三几何：13 题依赖已从义教课标删除的定理
- severity: major
- category: curriculum-alignment
- affected: 13 items — 相交弦定理 `s3-270, s3-303, s3-307, s3-308, s3-330, s3-342, s3-354, s3-365, s3-293`;
  切割线/割线定理 `s3-372`; 射影定理 `s3-074, s3-083`; 托勒密定理+四点共圆 `s3-346`.
  (10 items match `弦AB与弦CD相交`, whose only text-derivable solution route is 相交弦定理.)
- evidence:
  > `hjb-junior-ds-v2-s3-330` E: `由相交弦定理得AE·EB=CE·ED，即3×5=2×ED，解得ED=7.5 cm。`
- why: 相交弦定理、切割线定理、弦切角定理、射影定理、托勒密定理 were removed from
  《义务教育数学课程标准（2011年版）》 and are **not restored in the 2022 版**. They do not appear
  in 沪教版九年级下册第二十七章「圆与正多边形」 (which covers 圆的确定、圆心角/弧/弦/弦心距、
  垂径定理、直线与圆及圆与圆的位置关系、正多边形与圆). They survive only in 竞赛/拓展 material.
  Note I explicitly checked this **against the 沪教版 sequence, not the 人教版 one**, because
  Shanghai does run ahead in several places — but not here.
- fix: Move these 13 to a 拓展/竞赛 pool, or re-author them using 垂径定理 + 相似三角形, which
  *is* on-syllabus and yields the same results.

### F10 — hjb-junior 其他课标与命题缺陷
- severity: major
- category: curriculum-alignment / math-error
- affected: `s3-479`, `s3-062`, `s3-086`, `s3-135`, `s1-374`
- evidence & why:
  - `hjb-junior-ds-v2-s3-479` — filed under **统计初步**, but is a three-set
    **容斥原理** problem (`总人数=15+12+8-5-3-2+1=26`). 容斥原理 is 高中集合 content, not
    义务教育; and the topic label is simply wrong (no statistics is involved).
  - `hjb-junior-ds-v2-s3-062` — `①∠ADE=∠C；②AD/AB=AE/AC；③DE∥BC。其中能判定△ADE∽△ABC的条件序号是`
    A: `①②③`. With the common ∠A, `∠ADE=∠ACB` yields **△ADE ∽ △ACB**, not △ADE ∽ △ABC — the
    two correspondences coincide only if AB=AC, which is not given. Mainland textbooks are
    strict about 相似记号的对应顺序. Correct answer: `②③`.
  - `hjb-junior-ds-v2-s3-086` and `hjb-junior-ds-v2-s3-135` — both contain the condition
    > `已知点A、点B和大树底部D在同一直线上，且AD垂直于地面，大树垂直于地面。`
    A, B, D are collinear **on the ground**, so AD *lies in* the ground; asserting
    `AD垂直于地面` while also asserting `大树(CD)垂直于地面` makes the configuration
    geometrically impossible. The solutions silently ignore the clause. Note
    `hjb-junior-ds-v2-s3-089` is the *same* problem **without** the bad clause and is clean
    (key `10(√3+1)米`, verified). So the defect was introduced by editing, not by design.
  - `hjb-junior-ds-v2-s1-374` — `PA = 3, PB = 4, PC = 5，则点P到直线l的距离可能是______cm`
    A: `2`, acceptedAnswers = 23 hand-picked decimals `['2.5','1','1.5','2.8','3','0.5','0.1','0.01','2.1',…]`.
    The true answer set is the whole interval (0, 3]; a learner answering `2.05` or `√5/2`
    is marked wrong. Ungradeable as posed.
- fix: re-file `s3-479` (or drop it); `s3-062` key → `②③`; delete `且AD垂直于地面` from
  `s3-086`/`s3-135`; rewrite `s1-374` as a multiple-choice or bound question.

### F11 — hjb-high S4 答案键错误 / 选项不唯一（逐题 sympy·numpy 验证）
- severity: **blocker**
- category: answer-key / math-error
- affected: 5 items — `s4-125`, `s4-158`, `s4-226`, `s4-241`, `s4-269`

**F11a `hjb-high-ds-v2-s4-125`** (幂、指数与对数, fill-in)
> P: `若 3ᵃ = 4ᵇ = 36，则 1/a + 1/b = ______。`  A: `1/2`
> E: `1/a+1/b = log₃₆3 + log₃₆4 = log₃₆12 = 1/2`
- log₃₆12 = ln12/ln36 = **0.693426…**, not 0.5. (36^0.5 = 6 ≠ 12.) Correct key:
  **log₃₆12 = 2/(1+log₂3) ≈ 0.6934** — i.e. the item has no clean closed form and should not
  be posed this way.
- The companion item `hjb-high-ds-v2-s4-117` asks `2/a + 1/b` for the same setup and is
  **correct** (= log₃₆36 = 1). The `1/2` key looks like a botched copy of that item.
- fix: change the question to `2/a + 1/b`, or change the constant to `3ᵃ = 4ᵇ = 6` (then
  1/a+1/b = log₆12, still not 1/2) — cleanest is to restore the `2/a + 1/b` form.

**F11b `hjb-high-ds-v2-s4-158`** (幂函数、指数函数与对数函数, fill-in)
> P: `若函数 f(x)=aˣ 与 g(x)=log_a x 的图像有且仅有一个公共点，则 a 的取值范围是 ______。`
> A: `(0, 1) ∪ {e^(1/e)}`
- Numerically scanned x ∈ [10⁻⁵, 60] with sign-change root-finding: at **a = 0.03 there are
  three intersections** (x ≈ 0.05613, 0.32262, 0.82133); likewise a = 0.02, 0.04, 0.05, 0.06.
  From a ≈ 0.07 upward there is exactly one. The classical threshold is **a = e^{−e} ≈ 0.06599**.
  Correct answer: **[e^{−e}, 1) ∪ {e^{1/e}}**. The key over-claims on (0, e^{−e}).
- Also **超纲 for S4**: establishing max_{x>0} x^{1/x} = e^{1/e} requires 导数, which in 沪教版
  is 高三 (this slice's own S6 导数及其运用). The same objection applies to
  `hjb-high-ds-v2-s4-186` (`√2 < a ≤ e^(1/e)`), which additionally uses `交于点P` (implying a
  unique intersection) while its own answer range admits two.
- fix: move both to S6, and correct the lower bound to e^{−e}.

**F11c `hjb-high-ds-v2-s4-226`** (函数的概念、性质及应用, multiple-choice)
> P: `已知函数 f(x) 的定义域为 R，且 f(x+2) 为偶函数，f(2x+1) 为奇函数，则下列结论正确的是（ ）`
> O: `["周期为 2","周期为 4","周期为 8","不是周期函数"]`  A: `周期为 8`
- f(x+2) even ⇒ f(2+x)=f(2−x). f(2x+1) odd ⇒ f(1+t)=−f(1−t) ⇒ (t=1−x) f(x)=−f(2−x).
  Combining: **f(x+2) = −f(x) ⇒ f(x+4) = f(x)**. Period **4**.
  Witness: f(x)=cos(πx/2) satisfies both hypotheses (checked at 201 sample points) and has
  minimal period 4.
- So option B (周期为 4) is **true** and is marked wrong; and because 4 | 8, option C is also
  true — the item has **two correct options**. Standard mainland convention takes the
  smallest derivable period, i.e. B.
- fix: key → `周期为 4`, and remove `周期为 8` from the options (it is not a distractor, it is
  a second correct answer).

**F11d `hjb-high-ds-v2-s4-241`** (函数的概念、性质及应用, multiple-choice)
> P: `…f(x+1) 为奇函数，f(x+2) 为偶函数。若 f(1)=0，则下列选项中正确的是（ ）`
> O: `["f(3)=0","f(4)=0","f(5)=0","f(6)=0"]`  A: `f(3)=0`
- Same hypotheses as F11c ⇒ f(x+2) = −f(x) ⇒ f(5) = f(1) = 0 as well. Witness
  f(x)=cos(πx/2): f(3) = 0 ✔, f(5) = 0 ✔, f(4) = 1 ≠ 0, f(6) = −1 ≠ 0. **Options A and C are
  both forced true.**
- fix: replace `f(5)=0` with a genuinely false statement (e.g. `f(4)=0`, already present —
  so replace `f(5)=0` with `f(2)=0`, which is not determined).

**F11e `hjb-high-ds-v2-s4-269`** (三角, fill-in)
> P: `已知扇形的周长为10 cm，面积为4 cm²，则该扇形的圆心角的弧度数为______。`  A: `1/2 或 8`
- Solving 2r + l = 10, ½lr = 4 gives r ∈ {1, 4} ⇒ θ = l/r ∈ {8, 1/2}. But a 扇形 central
  angle must satisfy **0 < θ < 2π ≈ 6.2832**, so **θ = 8 rad is geometrically impossible** and
  must be discarded (the "sector" would wrap past a full turn). Correct key: **1/2**.
- A learner giving the correct single answer `1/2` is marked wrong.
- fix: key → `1/2`; add the rejection step (`θ = 8 > 2π，舍去`) to the explanation.

### F12 — hjb-high S4「解集右端常数」：术语错误 + 初一内容置于高一
- severity: major
- category: terminology / curriculum-alignment
- affected: `hjb-high-ds-v2-s4-075`, `s4-087`, `s4-094` (3 items, S4 等式与不等式)
- evidence:
  > P: `解不等式 x+3>4，并写出解集右端常数的值。`  A: `1`
  > E: `两边同时减去 3，得 x>4-3=1，所以解集右端常数为 1。`
- why: The solution set of x > 1 is the interval **(1, +∞)**. Its 右端 is +∞; `1` is the
  **左端点**. 「解集右端常数」 is not a term in any mainland textbook and, read literally, gives
  the wrong answer. Separately, `x+3>4` is 一元一次不等式 — 沪教版六年级第二学期第六章 — served
  here as 高一必修一「等式与不等式」.
- fix: Delete these three items. If a trivial warm-up is wanted, phrase it as
  `解不等式 x+3>4，用区间表示解集。` and expect `(1, +∞)`.

### F13 — hjb-high S4 使用高二/高三工具（导数、笛卡尔积）
- severity: major
- category: curriculum-alignment
- affected: `s4-213`, `s4-243`, `s4-248` (导数); `s4-018` (笛卡尔积); `s4-158`, `s4-186` (see F11b)
- evidence:
  > `s4-213` E: `f'(x)=3x²+2ax+b。由极值条件：f'(-1)=3-2a+b=0…`
  > `s4-248` E: `f'(x)=-(2x-2)/(x²-2x-3)²…`
  > `s4-018` P: `请写出 A × B 的一个子集，要求该子集含有两个元素，且这两个元素的第一个坐标之和为 3。` A: `{(1,1), (2,2)} 或 {(1,2), (2,1)} 等`
- why: 导数 sits in 沪教版高三 (this slice's own S6 导数及其运用). 笛卡尔积 appears in **no**
  mainland 高中 教材 — neither 沪教版必修第一册第一章 集合与逻辑 nor 人教A版必修一. `s4-018`'s
  answer also ends in 「等」, making it ungradeable by exact match.
- fix: move the three 导数 items to S6; delete `s4-018` or replace 笛卡尔积 with 子集/真子集.

### F14 — 记号系统不统一：Unicode 数学与裸 LaTeX 混排
- severity: major
- category: notation
- affected: hjb-high 47 items (22 with `\(…\)` delimiters, **25 with bare LaTeX macros and no
  delimiter at all**); hjb-junior 131 items with `\(…\)`
- evidence:
  > `hjb-high-ds-v2-s4-145` options: `["log_a (M + N) = log_a M + log_a N", "log_a (M - N) = \\frac{\\log_a M}{\\log_a N}", "log_a M^n = (\\log_a M)^n", "\\log_a \\sqrt[n]{M} = \\frac{1}{n} \\log_a M"]`
  > — two options are plain text, two are LaTeX, **inside one question**.
  > `hjb-high-ds-v2-s4-102` answer: `\frac{3 + ab}{1 + a + ab}` — no `\(`, no `$`.
  > `hjb-high-ds-v2-s4-147` prompt: `化简：\sqrt{(\lg 5)^2 - \lg 25 + 1}。`
  > `hjb-junior-ds-v2-s1-053` prompt: `计算：\(a^5 \cdot a^3 \div (a^2)^3 = \underline{\hspace{2cm}}\)。`
- why: 1453 of 1500 hjb-high items use Unicode math (`x²`, `√`, `π`, `∁_U`); a 47-item
  minority uses LaTeX, and 25 of those omit the delimiters entirely. Whichever way the
  renderer is configured, one of the two populations displays as garbage. `\hspace{2cm}` and
  `\underline{}` are pure typesetting macros with no place in an answer-bearing string.
- fix: Pick one notation system per publisher and normalise. If LaTeX, delimit every
  expression; if Unicode, convert the 178 outliers.

### F15 — 干扰项无诊断价值：50% 的数值型选择题干扰项都在正确答案 ±3 之内
- severity: major
- category: pedagogy
- affected: **264 of 528** all-numeric MC items in hjb-high (50.0%)
- evidence:
  > `hjb-high-ds-v2-s5-166` `一组数据为 3，16，29，求这组数据的平均数。` O: `["16","17","15","18"]` A: `16`
  > `hjb-high-ds-v2-s6-076` `从 13 个不同元素中选 2 个…` O: `["79","77","80","78"]` A: `78`
  > `hjb-high-ds-v2-s5-361` `空间向量 p=(3,8,5)，求 |p|²。` O: `["101","95","104","98"]` A: `98`
- why: Distractors generated as key±1, ±2 correspond to no misconception. They cannot
  diagnose "student used a²+b² instead of a²+b²+c²", "student computed A(n,2) instead of
  C(n,2)", "student divided by 2 instead of 3". They only test arithmetic slips.
- fix: Derive each distractor from a named error mode and record that mapping.

### F16 — 模板设计系统性回避该课题的实际技能
- severity: major
- category: pedagogy
- affected: the F1 clusters; specific counts below
- evidence (all machine-confirmed over the full cluster):
  - `函数 y=#sin(#x+#π/#) 的最小正周期是多少？` — **63 items, ω = 2 in all 63, so the answer
    is `π` in 63/63.** A learner can score 100% without reading the question. 48/63 also
    carry an unreduced or improper phase (`10π/6`, `9π/6`, `6π/6`, `7π/6`) and 8/63 write
    `1π/6` instead of `π/6`.
  - `椭圆 x²/A+y²/B=1 中，求 c²=a²-b² 的值` — 95 items, RHS `=1` in 95/95 and **A > B in
    95/95**, so the learner never has to identify the major axis; and asking for `c²` rather
    than `c` removes the square root. The prompt supplies the relation, so no 圆锥曲线
    knowledge is used at all.
  - `空间向量 p=(a,b,c)，求 |p|²` — 95 items, always `|p|²`, never `|p|`: the square root is
    systematically dodged.
  - `从 n 个不同元素中选 k 个…无序组合` — 75 items, **k = 2 in 75/75** (n takes only 12 values,
    3–14). The whole 计数原理 chapter (分类加法/分步乘法/排列/组合/二项式定理) reduces to n(n−1)/2.
  - `袋中有 r 个红球和 b 个蓝球，随机取出 n 个` — 75 items, **n = 1 in 75/75**: no
    放回/不放回, no 组合计数, no 条件概率.
  - `函数 f(x)=ax²+b，求 f'(c)` — 75 items, the form is `ax²+b` in **75/75**: never a cubic,
    never a product, quotient or composite, so 求导法则 is never exercised.
  - `∠A=60°` in **40/40** of the two 数量积 clusters.
- fix: parameterise the *structure*, not just the digits.

### F17 — hjb-junior 选项渲染缺陷：选项文本重复出现在题干中
- severity: major
- category: data-integrity
- affected: **18 MC items**; of these **5** have a content-free options array
- evidence:
  > `hjb-junior-ds-v2-s1-139` prompt: `'下列因式分解中，正确的是（  ）。\nA. \(x^2 - 4y^2 = (x - 2y)^2\)\nB. …\nD. \(m^3 - m = m(m + 1)(m - 1)\)'`  options: `["A","B","C","D"]`  answer: `"D"`
  > `hjb-junior-ds-v2-s1-043` prompt embeds `A. … D. …` **and** options = `["A. \(3a + 2b = 5ab\)", …]` — the four choices render twice.
  - options array is literally `["A","B","C","D"]`: `s1-067`, `s1-070`, `s1-097`, `s1-100`, `s1-139`
  - embedded **and** real options (double-rendered): 13 items incl. `s1-028`, `s1-043`, `s1-073`, `s1-088`, `s2-013`, `s2-028`, `s2-052`, `s2-148`
- why: In the 5-item case the answer stored is a bare letter, so `acceptedAnswers` can never
  accept the mathematical content the learner would naturally type. In the 13-item case the
  learner sees every option twice.
- fix: move option text out of the prompt into `options` (or vice versa) — never both.

### F18 — `acceptedAnswers` 中残留机器翻译占位符与英文散文
- severity: major
- category: data-integrity / language
- affected: **153 hjb-junior + 19 hjb-high items** carry `term-XXXX` placeholder tokens;
  **188 hjb-junior + 19 hjb-high** items carry full English prose in `acceptedAnswers`
- evidence:
  > `hjb-junior-ds-v2-s1-060` acceptedAnswers: `['商式2x+1，余式9x-3', '商式：2x+1，余式：9x-3', 'term-5546 expression is 2x+1, remainder expression is 9x-3', '商式為 2x+1，餘式為 9x-3', …]`
  > `hjb-junior-ds-v2-s2-186` acceptedAnswers: `['(1) term-8bc1 clear: Δ = (2k+1)^2 - 4(k^2+k) = … so equation total have two items not same equal of real number root. (2) k = 1 or k = -2', …]`
  > `hjb-junior-ds-v2-s1-216` acceptedAnswers: `["A'(4,0), same equal, because term-5e73 translate not term-6539 variant term-56fe shape of shape term-72b6 sum term-5927-term-5c0f."]`
- why: `term-5546` = 商, `term-5e73` = 平, `term-8bc1` = 证 — these are unresolved
  glyph-substitution placeholders from a translation pipeline that failed and was shipped
  anyway. The surrounding English ("so equation total have two items not same equal of real
  number root") is word-for-word machine translation of Chinese. If any of this is ever
  surfaced as `correctAnswer` on a wrong attempt — which is exactly how the pre-scan's
  pep-primary/pep-junior English-answer defect surfaces — a mainland learner is shown
  gibberish. Even if never displayed, it is dead weight in the matcher.
- fix: strip every `acceptedAnswers` entry containing `term-[0-9a-f]{4}` or English prose;
  keep only zh-Hans and pure-symbol variants.

### F19 — 繁体字泄漏：预扫描的 79 项在学习者可见文本中为 0（已澄清）
- severity: minor
- category: language
- affected: **0** learner-facing items. Verified true counts: 240 hjb-junior items and
  24 hjb-high items contain ≥1 traditional-only character, **100% of them inside
  `acceptedAnswers` and nowhere else**.
- evidence: I built a 260-character traditional-only set (為/數/點/線/對/個/時/標/頂/兩/邊/當/從/
  圖/圓/實/證/稱/與/長 …, identity pairs excluded) and scanned prompt, options, answer,
  explanation and acceptedAnswers separately.
  - hjb-junior: prompt 0, options 0, answer 0, explanation 0, **acceptedAnswers 240**
  - hjb-high: prompt 0, options 0, answer 0, explanation 0, **acceptedAnswers 24**
  > `hjb-junior-ds-v2-s1-001` acceptedAnswers: `['B. 2a²b 与 -5a²b', 'B. 2a^2b and -5a^2b', 'B. 2a²b 與 -5a²b']`
- why: The traditional entries are deliberate **input-tolerance** variants of the zh-Hans key,
  i.e. a feature for a HK/TW learner typing 與, not a zh-Hans authoring error. The pre-scan's
  "hjb-junior 79" flag is a **false positive at the learner-facing level**. It becomes a real
  defect only if `acceptedAnswers[i]` can be displayed as `correctAnswer` — the same code path
  that produces the confirmed pep-primary English-answer bug.
- fix: no content change needed. Confirm the grader never renders `acceptedAnswers`; if it
  can, restrict display to `answer`.

### F20 — 拉丁字母泄漏：148 项全部为 LaTeX 宏或顶点标号，无自然英语（已澄清）
- severity: minor
- category: language
- affected: hjb-junior 148 prompts, hjb-high 34 prompts contain a Latin run of ≥4 letters
- evidence: full frequency table of the matched words —
  hjb-junior: `ABCD` 59, `frac` 51, `sqrt` 32, `ABCDEF` 22, `cdot` 10, `sinA` 7, `underline` 4,
  `angle` 4, `tanA` 4, `cosA` 3, `hspace` 2, `qquad` 2, `circ` 2, `ABCDEFGH` 2, `times`/`left`/
  `right`/`ldots`/`ABFE`/`EFGH`/`DGFB`/`DBCE`/`tanB`/`sinB`/`cosB` 1 each.
  hjb-high: `overrightarrow` 40, `frac` 21, `cdot` 4, `left` 3, `right` 3, `sqrt` 2.
- why: Every hit is either a LaTeX control word or a polygon vertex label — both correct
  mainland practice. **There is no natural-English learner-facing text in either slice**
  (unlike the confirmed pep-primary `"sphere"` / pep-junior `"x=12 or x=17"` defect). The
  real problem in these strings is F14 (notation), not language.
- fix: none for language. See F14.

### F21 — 难度标签与内容无关
- severity: minor
- category: data-integrity
- affected: hjb-high slice-wide
- evidence: within the mean-of-three cluster (130 identical-difficulty items) the labels are
  High 50 / Low 40 / Medium 40. `hjb-high-ds-v2-s4-039` — a 反证法 proof requiring
  三元配方 — is labelled **Low**; `hjb-high-ds-v2-s5-166` (`(3+16+29)/3`) is labelled **High**.
  See also F5 (82 groups of identical prompts with conflicting labels).
- fix: derive from measured p-values.

### F22 — 自由作答/证明题无法自动判分
- severity: minor
- category: data-integrity
- affected: hjb-high 6 (`s4-018`, `s4-039`, `s4-150`, `s4-174`, `s4-222`, `s4-240`);
  hjb-junior 41 items whose answer is non-unique or prose
- evidence:
  > `hjb-high-ds-v2-s4-150` A: `证明见解析`
  > `hjb-high-ds-v2-s4-018` A: `{(1,1), (2,2)} 或 {(1,2), (2,1)} 等`
- why: `证明见解析` can never match learner input. The 41 hjb-junior cases are mostly handled
  well (`s1-379` 第三边为整数 lists all of 5–9; `s1-385` 偶数 lists 6 and 8) — the failures are
  `s1-374` (F10) and the prose-answer geometry items.
- fix: route proof items to a rubric/manual path, or convert to structured fill-in.

### F23 — hjb-junior 其余小缺陷
- severity: minor
- category: terminology / pedagogy
- affected & evidence:
  - **11 MC items** describe a number-line picture *in words* instead of showing it
    (`s1-253, s1-256, s1-265, s1-277, s1-283, s1-286, s1-298, s1-307, s1-313, …`). 2 of them
    use the non-standard term **`实心射线`** (`s1-253`, `s1-307`) — mainland usage is
    「实心圆点 + 射线」; 1 uses `画阴影` (`s1-256`) where 数轴 convention is 画射线.
  - **Option letter-prefix style is inconsistent**: 107 of 600 MC items prefix options with
    `A.`/`B.`/`C.`/`D.` (and store the letter inside `answer`), 493 do not.
  - **Superfluous conditions**: `s2-247` supplies `AB=10` which is unused; `s4-090` supplies a
    恒成立 condition that is irrelevant (a+b+c = f(1) = 2 directly); `s1-056` appends a second
    condition that cannot change the answer.
  - **Self-contradictory reasoning in an otherwise correct item**: `s3-072` A:
    `不相似，因为AD/AB=3/8，AE/AC=1/3，两边成比例但夹角不一定相等` — the two sides are **not**
    proportional (that is the actual reason) and the included angle **is** equal (shared ∠A).
  - **No 参考数据 supplied** for non-special trig values: `s3-153` needs sin35°, `s3-299` needs
    sin22.5°, while sibling items (`s3-130`, `s3-133`, `s3-136`) do supply them.
- fix: mechanical clean-up.

### F24 — 课标符合性（正面结论，用于对照 F1）
- severity: n/a — verified positive
- category: curriculum-alignment
- affected: both slices' topic spines
- evidence: mapping the topic lists against the 沪教版 volume sequence —
  - **hjb-junior S1** = 沪教版七年级 (整式的加减/乘除/因式分解 七上第九章; 分式 七上第十章;
    图形的运动 七下第十一章; 相交线与平行线 七下第十三章; 三角形/等腰三角形 七下第十四章) ✔
  - **hjb-junior S2** = 沪教版八年级 (二次根式 八上第十六章; 一元二次方程 第十七章;
    反比例函数 第十八章; 直角三角形/几何证明 第十九章; 一次函数 八下第二十章; 四边形 第二十二章) ✔
  - **hjb-junior S3** = 沪教版九年级 (相似三角形 九上第二十三章; 锐角的三角比 第二十四/五章;
    二次函数 九下第二十六章; 圆与正多边形 第二十七章; 统计初步 第二十八章) ✔
  - **hjb-high S4/S5/S6** = 沪教版必修一二 / 高二 / 高三 ✔
  Two mild re-placements only: 一元一次不等式 (沪教版六年级第二学期第六章) sits in S1, and
  实数 (沪教版七年级第二学期第十二章) sits in S2.
- why: I checked this deliberately so that F1/F2 are not misread as topic 超纲. Shanghai does
  run ahead of the 人教版 sequence in several places, and I have **not** counted any of those
  as defects. The hjb defects are 认知水平 (F1, F2), 答案键 (F4, F7, F8, F11), and specific
  deleted-from-课标 theorems (F9, F13) — not topic placement.
- fix: none.

---

## Slice health verdict

**hjb-high (S4–S6): NOT shippable to mainland senior-high learners.** This is not a
patch-and-go slice. 1274 of 1500 items (84.9%) come from 20 prompt templates; **every one of
the 22 topics in S5 and S6 has exactly one prompt skeleton**, and 582 items (38.8%) require
no senior-high mathematics whatsoever — including 130 items ("平均数 of three integers",
1 in every 11.5 items in the bank, whose keys are 130/130 arithmetically correct) filed under
统计 and 成对数据的统计分析, a chapter in which **zero** items mention 相关、回归、散点图 or
列联表. The 226 non-templated S4 items are genuinely good 沪教版必修一 material and are worth
keeping; the other 1274 must be re-authored. On top of that sit 25 wrong-key items
(20 × `AB·AC`, plus `s4-125`, `s4-158`, `s4-226`, `s4-241`, `s4-269`), two of which mark the
*correct* mainland answer wrong.

**hjb-junior (S1–S3): shippable only after the 7 wrong keys and 2 broken items are fixed.**
Structurally this slice is much healthier — 1414 distinct skeletons for 1500 items, zero MC
answer/option mismatches, zero missing fields, zero figure-dependent items, and a topic spine
that tracks 沪教版七/八/九年级 accurately. But it carries **7 confirmed wrong answer keys**
(`s1-060`, `s1-275`, `s2-186`, `s2-217`, `s2-401`, `s3-293`, `s3-492`), one item whose printed
data contradicts its own solution (`s3-447`), two geometrically impossible prompts
(`s3-086`, `s3-135`), and a direct internal contradiction where `s2-217` and `s2-238` give
incompatible answers for the same triangle. Extrapolating the 7 keys found in the 226 items I
read in full gives a **~3.1% wrong-key rate (7/226)** — that is an extrapolation from a
226-item sample, not a measured slice-wide rate, and the true rate could be higher because I
targeted defect-prone families. Add the 72 `变式 N` authoring artifacts in learner-facing text
(masking 47 duplicate copies), 13 items resting on theorems deleted from the 义教课标, and 172
items shipping `term-XXXX` machine-translation debris in `acceptedAnswers`.

**Highest-leverage fixes, in order:** (1) re-author hjb-high S5/S6 from scratch;
(2) fix the 25 + 7 wrong keys; (3) strip `变式 N` and the `term-XXXX` debris;
(4) normalise the notation system.
