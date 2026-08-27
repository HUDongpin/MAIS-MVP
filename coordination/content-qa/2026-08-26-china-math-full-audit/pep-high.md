# 人教版高中数学 (pep-high, S4–S6, 4800 items) — Mathematical Correctness & 课标 Audit

Auditor role: mainland-China senior-high math content specialist (人教版高中数学教研员).
Reference: 《普通高中数学课程标准（2017年版2020年修订）》 + 人教A版必修第一/二册、选择性必修第一/二/三册.

## Coverage

**Answer keys: 4800 of 4800 verified programmatically (100%).**
The slice collapses to **100 machine-parseable stem skeletons** (47 mathematical
families). I wrote a parser (`work/verify2.py`, run under a sympy venv) that
regex-extracted every parameter from every prompt, re-derived the answer
independently (Fraction / sympy for radicals, logs, trig), and compared it to
the stored `answer`. **Parse coverage was 4800/4800 — no item was skipped or
eyeballed.** Verified families and counts:

| family | n | family | n | family | n |
|---|---|---|---|---|---|
| deriv-quad-eval | 367 | prob-bag | 256 | dot3 / arith-an | 214 each |
| ellipse-major | 184 | ellipse-c2 | 183 | parabola-p / deriv-quad-solve | 180 each |
| binom-期望 | 157 | count-选出 | 155 | reg-pred / deriv-pow-eval | 150 each |
| bag-ordered | 131 | log-eval | 108 | slope / lin-eval | 108 each |
| circle-r / circle-r2 / dot2 / arith-Sn | 106 each | complex-* | 160 | norm3 | 106 |
| cuboid-* | 160 | set-* | 160 | stat3-* | 160 |
| trig-k/amp/special | 160 | count-有序选取 | 77 | reg-resid | 79 |
| binom-方差 | 75 | prob-equal | 76 | quad-* | 160 |

**Items read in full (prompt + options + answer + explanation), by grade:**
- S4 (高一): 40 — stratified random, 4 per topicId × 10 topics
- S5 (高二): 20 — 4 per topicId × 5 topics
- S6 (高三): 28 — 4 per topicId × 7 topics
- plus ~45 targeted reads during template discovery and defect confirmation
- **total individually read: ~133 of 4800 (2.8%)**

**Method:** (a) skeleton clustering (numbers → `#`) to enumerate every template;
(b) whole-population programmatic re-solution of all 4800 answer keys;
(c) stratified random full reads (seed 20260826) for qualitative/curricular judgement;
(d) targeted greps for figure references, terminology, LaTeX well-formedness,
duplicate/answer-conflict detection, MC key-position, difficulty distribution;
(e) source inspection of `components/math/MathText.tsx`,
`components/practice/PracticeQuestionCard.tsx`, `lib/server/answerMatching.ts`
to establish how prompts render and how answers are graded.

**Not covered:** I did not read the 4667 items I did not open individually — for
those, correctness is established by whole-population computation, not by
reading. I did not evaluate `topic.en` translations, difficulty *calibration*
against learner telemetry, or cross-slice duplication with bnu-/hjb- (other
agents' scope). Any percentage below is a census of the 4800, not an
extrapolation, unless explicitly labelled.

---

## Findings

### F1 — Every multiple-choice key is option A; the whole MC bank is answerable without doing any math
- severity: **blocker**
- category: `data-integrity` / `pedagogy`
- affected: **all 1620 multiple-choice items in pep-high** (100.0%)
- evidence: census of `options.index(answer)` across all 1620 MC items →
  `{0: 1620}`. Contrast with sibling slices computed the same way:
  `hjb-high {0:170, 1:145, 2:144, 3:141}`, `bnu-primary {0:533, 1:364, 2:224, 3:79}`.
  Examples: `pep-high-s5-rag3-mc-069` options `["14","15","13","16"]` answer `"14"`;
  `pep-high-s4-rag2-mc-049` options `["1/2","0","2","sqrt(3)/2"]` answer `"1/2"`;
  `pep-high-s6-rag4-mc-008` options `["36","45","27","54"]` answer `"36"`.
- why: `components/practice/PracticeQuestionCard.tsx:642` renders
  `(question.options ?? []).map(...)` in stored order — there is **no shuffle
  anywhere in the question-serving path** (grep for `shuffle` over `lib/`,
  `app/`, `components/` returns only unrelated visualization labs). A learner who
  always taps the first choice scores 100% on 1620 questions. Mastery signals,
  adaptive routing and any teacher-facing analytics built on this slice are
  therefore measuring nothing. This is the single most damaging defect in the slice.
- fix: either (a) deterministically permute `options` per item at build time and
  update `answer` accordingly, or (b) seed-shuffle options per learner+item at
  render time in `PracticeQuestionCard`. Add a CI assertion that no slice has
  >40% of keys at any single index.

### F2 — 19 answer keys are rounded decimals; the exact (correct) answer is graded WRONG
- severity: **blocker**
- category: `answer-key`
- affected: 19 items —
  `pep-high-s5-rag2-sa-085`, `pep-high-s5-rag3-sa-141`, `-146`, `-156`, `-161`,
  `pep-high-s5-rag4-sa-147`, `-152`, `-157`, `-162`,
  `pep-high-s5-sa-035`, `pep-high-s5-sa-060`,
  `pep-high-s6-rag2-sa-051`, `-056`,
  `pep-high-s6-rag3-sa-084`, `-089`,
  `pep-high-s6-rag4-sa-086`, `-091`,
  `pep-high-s6-sa-053`, `pep-high-s6-sa-088`
- evidence:
  > `pep-high-s6-rag4-sa-086` — prompt: 「先核对题目条件。写出结果并给出简要理由。**优先使用精确值，不用猜测小数**。已知 \(f(x)=3x^2+1x+1\)，解 \(f'(x)=0\)。」 answer: `"-0.167"`
  > `pep-high-s5-rag3-sa-141` — 「已知 \(f(x)=3x^2+2x+1\)，解 \(f'(x)=0\)。」 answer: `"-0.333"`
- why: \(f'(x)=6x+1=0 \Rightarrow x=-\tfrac16 = -0.1\overline{6}\), and
  \(f'(x)=6x+2=0 \Rightarrow x=-\tfrac13\). `lib/server/answerMatching.ts:385`
  compares numerically with `Math.abs(selected - accepted) < 0.000001`.
  `|(-1/6) - (-0.167)| = 3.3e-4 > 1e-6`, so a learner who writes the **exact and
  correct** `-1/6` (or `-1/3`) is marked wrong. None of the 19 carries
  `acceptedAnswers`. The prompt on 4 of them literally instructs the learner to
  prefer exact values over decimals, then punishes them for it.
- fix: store the exact fraction as `answer` (`-1/6`, `1/6`, `-1/3`, `1/3`) and put
  the decimal in `acceptedAnswers`, matching the pattern already used correctly on
  the 202 probability items (e.g. `pep-high-s4-fi-010` answer `4/7`,
  `acceptedAnswers ["4 / 7","0.5714"]`). Ban 3-dp rounding of non-terminating
  rationals at generation time.

### F3 — Internal generation-pipeline scaffolding is printed to learners inside the question stem
- severity: **major**
- category: `data-integrity`
- affected: **3900 of 4800 items (81.3%)** carry non-mathematical boilerplate in
  `prompt`; of these **1500 expose internal pipeline identifiers** (`RAG-vN …任务：`),
  900 carry `原创XX练习 N：`, 1500 carry a 3-sentence generic advice preamble.
  Only 900 items (18.8%) are a bare mathematical stem.
- evidence:
  > `pep-high-s4-rag3-mc-109`: 「**RAG-v3 反例判断 109（复数）：反例判断选择题任务：**求 \((2+4i)+(3+3i)\) 的实部。」
  > `pep-high-s5-rag4-sa-134`: 「**先核对题目条件。写出结果并给出简要理由。只要条件用全，简短计算即可。**已知 \(f(x)=1x^2-1x+1\)，解 \(f'(x)=0\)。」
  > `pep-high-s6-rag3-fi-143`: 「…综合拆步填空题任务：**一个原创综合练习模型中，**\(f(x)=2x^3\)。求 \(f'(4)\)。」
- why: `RAG-v3`, `反例判断`, `填空题任务` are generator metadata, not 题干. No
  mainland 教辅 prints the internal item-type tag inside the question. The advice
  preambles are content-free and identical across unrelated topics, so they add
  reading load with no instructional value and make the stem harder to parse for
  a 高中生 under time pressure.
- fix: strip everything before the mathematical stem at export. If pedagogical
  hints are wanted, move them to a separate `hint` field rendered behind a
  disclosure control, and make them topic-specific.

### F4 — Untranslated English error-phrases spliced mid-sentence into Chinese explanations
- severity: **major**
- category: `language`
- affected: **1500 of 4800 items (31.3%)** — every `rag3` item. Same defect class
  as the pre-scan's pep-primary/pep-junior English-answer finding, but in
  `explanation` and at 22× the volume.
- evidence:
  > `pep-high-s4-rag3-fi-001`: 「…本题依据安全 RAG 卡片抽象生成，训练概念辨析，并提醒避免**confusing element and subset**。」
  > `pep-high-s5-rag3-mc-069`: 「…并提醒避免**parameter range not checked**。」
  > `pep-high-s6-rag3-sa-034`: 「…并提醒避免**expectation interpreted as guaranteed outcome**。」

  30 distinct English phrases; top by volume: `parameter range not checked` (58),
  `sign chart interval error` (58), `focus position swapped` (57),
  `derivative zero treated as automatic extremum` (57),
  `endpoint in optimization ignored` (56), `phase shift sign reversed` (41).
- why: the phrase is concatenated with **no space and no punctuation** after
  「避免」, producing 「避免confusing element and subset。」. A mainland 高中生 sees a
  Chinese sentence that terminates in untranslated English jargon. It is also
  the *only* diagnostic content in the explanation, so the pedagogical payload is
  exactly the part the learner cannot read.
- fix: translate the pitfall vocabulary once (e.g. `focus position swapped` →
  「混淆焦点所在的坐标轴」, `derivative zero treated as automatic extremum` →
  「误把 \(f'(x)=0\) 直接当作极值点」, `parameter range not checked` → 「未讨论参数取值范围」)
  and gate export on `/[A-Za-z]{3,}\s+[A-Za-z]{2,}/` after LaTeX stripping.

### F5 — 课标 coverage: 22 topics are served by 47 templates; whole mandated subtopics have zero items
- severity: **major**
- category: `curriculum-alignment`
- affected: all 4800 items / all 22 topicIds
- evidence: every (grade, topicId) bucket is served by exactly 2–3 templates:
  ```
  S4 集合与常用逻辑用语   -> 只有「U 中 a 的倍数与 b 的倍数」的 |A∪B| / |A∩B| / 补集计数
  S4 一元二次函数、方程和不等式 -> 只有顶点式求值 / 对称轴 / 最小值
  S4 函数的概念与性质     -> 只有 f(x)=ax+b 求值 / 解方程
  S4 指数函数与对数函数    -> 只有 log_b n 求值 / c·log_b n
  S4 三角函数          -> 只有 y=A sin kx 读 A、读 k、tan45°/sin30°/cos60°（仅 3 个不同角）
  S4 平面向量及其应用     -> 只有二维数量积 / |a|²
  S4 立体几何初步       -> 只有长方体体积 / 表面积 / 体对角线平方
  S4 统计            -> 只有三数平均数 / 极差 / 方差的三倍
  S4 概率            -> 只有 P(红球) / 不放回有序结果数
  S4 复数            -> 只有 (a+bi)+(c+di) 的实部 / 虚部 / |z|²
  S5 圆锥曲线的方程      -> 只有椭圆 c² / 长轴长 / 抛物线 p
  S5 一元函数的导数及其应用  -> 只有多项式 f'(x₀) / 解 f'(x)=0
  S5 直线和圆的方程      -> 只有两点斜率 / 圆半径 / r²
  S5 数列            -> 只有等差 aₙ / Sₙ
  S5 空间向量与立体几何    -> 只有三维数量积 / |a|²
  S6 计数原理         -> 只有 C(n,2) / A(n,2)
  S6 随机变量及其分布     -> 只有 B(n,p) 的 E、D
  S6 成对数据的统计分析    -> 只有 ŷ=ax+b 预测值 / 残差
  S6 高考风格综合练习     -> 只有 f(x)=ax^n 的 f'(x₀) 与古典概型 m/n
  S6 解析几何综合/导数综合/概率统计综合 -> 与 S5/S4 完全同模板
  ```
  Verified-absent (0 items) mandated content includes:
  **双曲线**（选必一 3.2，圆锥曲线章节缺一整条曲线）、**离心率/准线/直线与圆锥曲线**、
  **等比数列**（选必二 4.3，数列 320 题中 0 题）、**二项式定理**（选必三 6.3）、
  **条件概率与全概率公式、超几何分布、正态分布**（选必三 7.1/7.4/7.5）、
  **2×2 列联表独立性检验与相关系数 r**（选必三 8.1/8.3）、
  **充分必要条件与全称/存在量词**（必一 1.4/1.5 — 「常用逻辑用语」半个章节标题在 topic 名里却无一题）、
  **一元二次不等式与基本不等式**（必一 2.2/2.3 — topic 名叫「…和不等式」却无一道不等式）、
  **函数单调性/奇偶性/定义域值域**（必一 3.2）、**指数函数与指数幂运算**（必一 4.1/4.2）、
  **弧度制、诱导公式、同角三角函数关系、三角恒等变换、图象变换**（必一 5.2–5.6）、
  **正弦定理与余弦定理**（必二 6.4.3）、**空间点线面位置关系与平行/垂直判定**（必二 8.4–8.6）、
  **柱锥台球的表面积与体积**（必二 8.3）、**分层随机抽样、百分位数、频率分布直方图**（必二 9.1/9.2）、
  **互斥/对立/独立事件与概率的基本性质**（必二 10.1/10.2）、
  **导数的几何意义与切线、单调性/极值/最值、复合函数与三角指对求导**（选必二 5.1–5.3）、
  **直线方程的五种形式、两直线位置关系、点到直线距离、直线与圆及圆与圆的位置关系**（选必一 2.2–2.5）、
  **空间向量求线面角/二面角/距离**（选必一 1.4 — 这正是「空间向量与立体几何」整章的目的）。
- why: topic *placement* is correct (S4 = 必修一/二, S5 = 选必一/二, S6 = 选必三 +
  复习, all consistent with 人教A版 编排). The defect is depth: each 课标 主题 is
  represented by one or two one-step recall operations. 高三「高考风格综合练习」 is a
  monomial derivative plus a 古典概型 fraction — nothing in the slice resembles a
  高考 解答题 (无证明、无讨论、无多步建模). A learner completing all 1600 items of a
  grade will still have met none of the章节 that carry the most 高考 weight.
- fix: treat this slice as a *drill* bank, not a curriculum. Before shipping as
  「人教版高中数学」, add at minimum: 双曲线, 等比数列, 二项式定理, 条件概率/正态分布,
  独立性检验, 充要条件, 一元二次不等式, 解三角形, 线面位置关系, 导数应用（单调性/极值/切线）,
  空间向量求角。 Gate each topicId on a minimum distinct-template count (≥8) and on
  explicit 课标 学业要求 tags.

### F6 — 15 items call the circle \(x^2/16+y^2/16=1\) an 「椭圆」 and ask for its 长轴长
- severity: **major**
- category: `math-error`
- affected: 15 items — `pep-high-s5-mc-058`, `pep-high-s5-rag2-mc-043`, `-058`,
  `pep-high-s5-rag3-mc-076`, `-091`, `pep-high-s6-mc-005`, `-040`, `-075`,
  `pep-high-s6-rag2-mc-059`, `pep-high-s6-rag3-mc-099`, `-114`,
  `pep-high-s6-rag4-mc-103`, `-108`, `-113`, `-118`
- evidence:
  > `pep-high-s6-rag4-mc-118`: 「已知**椭圆** \(\frac{x^2}{16}+\frac{y^2}{16}=1\)，求长轴长。」 options `["8","9","7","10"]`, answer `"8"`
- why: \(a^2=b^2=16\Rightarrow c=0\); the curve is the circle \(x^2+y^2=16\).
  人教A版选择性必修第一册 3.1.1 defines 椭圆 by \(|MF_1|+|MF_2|=2a>|F_1F_2|>0\) — two
  **distinct** foci — so a circle is not an 椭圆 and has no 长轴. The stored `8` is
  numerically the diameter, so the grader accepts it, but the item trains the
  misconception that a circle is an ellipse and that \(c^2=a^2-b^2=0\) is a legal
  ellipse parameter. This is exactly the 圆锥曲线 参数混淆 class the item was
  supposed to test.
- fix: constrain the generator to \(a^2 \neq b^2\) (and preferably \(a^2>b^2\) or
  handle the y-major branch explicitly). Delete or re-parameterise the 15 items.

### F7 — Non-standard 人教版 terminology
- severity: **major**
- category: `terminology`
- affected: 291 items across four phrasings
- evidence & why:
  - **「虚部系数」 (52 items,** e.g. `pep-high-s4-fi-007`: 「求 \((-3+3i)+(5-1i)\) 的**虚部系数**。」**)** —
    人教A版必修第二册 7.1.1: 「复数 \(z=a+bi\)，\(a\) 叫做复数的**实部**，\(b\) 叫做复数的**虚部**」.
    The 虚部 *is* \(b\); 「虚部系数」 is not a term in the mainland curriculum and
    implies 虚部 = \(bi\), which is precisely the misconception 教材 works to prevent.
    Fix: 「求…的虚部」.
  - **「方差的三倍」 (54 items,** `pep-high-s4-rag4-sa-137`: 「对于数据 \(3,5,7\)，求**方差的三倍**。」**)** —
    a quantity that exists nowhere in 教材 or 高考; it is a generator trick to keep
    the answer an integer (\(3s^2=\sum(x_i-\bar x)^2\)). Fix: ask for 方差 directly
    and choose data whose 方差 is an integer, or ask for \(\sum(x_i-\bar x)^2\) by name.
  - **「体对角线长度的平方」 (54 items)** — same integer-forcing trick; 教材 asks for
    体对角线长 (\(\sqrt{a^2+b^2+c^2}\)). Fix: choose Pythagorean triples so the
    diagonal is an integer.
  - **「按具体球区分时，有多少种有序结果？」 (131 items)** — opaque phrasing; the standard
    mainland wording is 「若把球看作互不相同，依次不放回摸出两球，共有多少种不同的摸法？」
- fix: run a terminology pass against 人教A版 术语表 before export.

### F8 — Two-digit subscripts are unbraced, so KaTeX renders \(a_{11}\) as \(a_1 1\)
- severity: **major**
- category: `notation`
- affected: 119 items (`a_10` 26, `a_11` 27, `a_12` 27, `S_10` 13, `S_11` 13, `S_12` 13)
- evidence:
  > `pep-high-s5-fi-019`: 「等差数列满足 \(a_1=2\)，\(d=5\)。求 \(a_11\)。」 answer `52`
  > `pep-high-s5-rag2-sa-067`: 「…求 \(S_10\)。」 answer `240`
- why: `components/math/MathText.tsx` renders `\(...\)` through
  `katex.renderToString`. In (Ka)TeX `_` takes a single token, so `a_11` typesets
  as \(a_1 1\) and `S_10` as \(S_1 0\). The learner sees 「求 a₁1」 and cannot tell
  whether the 11th term or something else is wanted; the stored answer (52 =
  \(2+10\times5\)) only makes sense for \(a_{11}\).
- why it is not caught by the LaTeX linter: braces *are* balanced — there are no
  braces at all. See F-neg-2.
- fix: emit `a_{11}` / `S_{10}`. Add an export rule: any `_` or `^` followed by
  more than one character must be braced.

### F9 — 214 items are labelled 「图像信息」 but contain no figure; pitfall notes are randomly mismatched to content
- severity: **major**
- category: `pedagogy` / `data-integrity`
- affected: 214 (图像信息 mislabel) + 71 (`pep-high-s6-exam-practice` items with
  off-topic pitfall notes)
- evidence:
  > `pep-high-s4-rag3-fi-003`: 「RAG-v3 **图像信息** 3（集合与常用逻辑用语）：**图像信息**填空题任务：在 \(U=\{1,2,\ldots,19\}\) 中…求 \(|A\cup B|\)。」 — no graph, no diagram, pure counting.
  > `pep-high-s6-rag3-fi-143`: 「…求 \(f'(4)\)。」 explanation: 「…并提醒避免**period formula error**。」 — a trigonometric-period warning on a polynomial derivative.
  > `pep-high-s6-rag3-sa-148`: 「…某事件在 11 个等可能结果中有 4 个有利结果。求该事件的概率。」 explanation: 「…**训练函数图像**，并提醒避免**degree-radian confusion**。」 — 函数图像 training tag and a radian warning on a classical-probability item.
- why: the 「图像信息」/「训练…」/「提醒避免…」 tags are drawn independently of the item
  content, so the metadata actively misinforms. A learner told to expect graph
  reading gets integer counting; a learner warned about radians is doing 排列组合.
- note: **no item in the slice references a figure that is absent** — greps for
  `如图|下图|图中|右图|图示|见图` return 0 hits across 4800 prompts. So there are **no
  unsolvable-for-missing-diagram items** in pep-high. The 「图像信息」 label is a
  mislabel, not a missing asset.
- fix: derive these tags from the item's actual template, or drop them.

### F10 — Difficulty is a per-template constant, not a per-item property; 76.7% is labelled High
- severity: **major**
- category: `data-integrity` / `pedagogy`
- affected: 4800 items; 3680 `High`, 960 `Medium`, 160 `Low`
- evidence: 97 of the 100 stem skeletons carry exactly **one** difficulty label
  for every one of their items. `求 \(\log_2 64\)` → High (all 108).
  `求 \(\tan 45^\circ\)` → High (all 54). 长方体表面积 → High (all 54).
  等差数列 \(a_n\) → High (all 214). Meanwhile 集合计数 → Low (all 160) and
  两点斜率 → Medium (all 108). The three exceptions merely reflect 2D vs 3D
  variants being different families.
- why: difficulty does not vary with the numbers, the number of steps, or the
  cognitive demand — it is a constant attached to the template. Labelling
  \(\log_2 64\) and \(\tan 45^\circ\) as `High` for 高中生 is indefensible
  (both are 必修一 recall). Any adaptive engine or 难度分层 report reading this field
  is being fed a constant.
- fix: recompute difficulty from step count / operation type, or remove the field
  from this slice until it can be derived honestly.

### F11 — The 4800 items contain only 1513 distinct mathematical questions
- severity: **major**
- category: `variety`
- affected: 3287 items (68.5%) are exact repeats of another item once
  generator boilerplate is stripped
- evidence: after removing `RAG-vN …任务：`, `原创XX练习 N：`, the advice preamble and
  the 「一个原创综合练习模型中，」 wrapper, `len(set(prompt)) = 1513`. Worst reuse:
  「已知抛物线 \(y^2=6x\)，求 \(y^2=2px\) 中的 \(p\)。」 appears **61 times**;
  「从 7 个不同元素中，有多少种选出 2 个的方法？」 33 times. Even before stripping,
  580 prompts are byte-identical duplicates (381 groups).
  Two items in my random sample differed only in the advice sentence:
  `pep-high-s4-rag4-mc-121` and `-131` are both 「一个长方体的三条棱长为 \(3,4,6\)。求它的表面积。」,
  same options, same key.
  **110 items in 24 groups are byte-identical across grades** — e.g.
  「袋中有 4 个红球和 3 个蓝球，求 \(P(\text{摸到红球})\)。」 is served as
  `pep-high-s4-fi-010` (高一 概率) and as `pep-high-s6-fi-013/-048/-083` +
  `s6-mc-013/-048/-083` (高三 概率统计综合).
- why: a 高三 learner doing 「概率统计综合」 is re-served verbatim 高一 items. The
  三年 progression is an illusion.
- fix: deduplicate on the boilerplate-stripped stem; require distinct parameter
  sets per grade; forbid a stem from appearing in more than one grade band.

### F12 — Degenerate coefficient printing: `1x`, `+0x`, `(x-0)`, `1i`, `1\sin`, `ŷ=1x`
- severity: minor
- category: `notation`
- affected: 620 distinct items carry at least one artifact
  (`±1x` 156, `±0` constant 213, `(x±0)` 28, `±1i` 79, `y=1\sin` 21,
  `\hat y=1x` 46, plus 80 explanations printing `f'(x)=2x+0`)
- evidence:
  > `pep-high-s5-rag3-mc-152`: 「已知 \(f(x)=**1**x^2-**1**x+1\)，求 \(f'(3)\)。」
  > `pep-high-s5-rag3-sa-144`: 「已知 \(f(x)=1x^2**+0x**+1\)，解 \(f'(x)=0\)。」 explanation: 「先求导得 \(f'(x)=2x**+0**\)…」
  > `pep-high-s4-fi-007`: 「求 \((-3+3i)+(5-**1i**)\) 的虚部系数。」
  > `pep-high-s4-fi-005`: 「对于 \(y=**1**\sin 3x\)，写出正弦函数内部 \(x\) 的系数。」
  > `pep-high-s4-rag2-fi-013`: 「已知圆 \((x**-0**)^2+(y-2)^2=4\)，求半径。」
  > `pep-high-s6-rag3-mc-054`: 「回归模型为 \(\hat y=**1**x-2\)。」
- why: no 教材 or 高考卷 writes \(1x^2\), \(+0x\), \(5-1i\) or \((x-0)^2\).
  It signals machine generation, and 「\(y=1\sin 3x\)」 additionally makes the
  companion 求振幅 item degenerate.
- fix: a coefficient formatter — drop coefficient 1 / −1 (keep the sign), drop
  zero terms, drop zero offsets in the circle centre, print `i` / `-i`.

### F13 — ASCII `sqrt(3)/2` mixed with LaTeX, and out-of-range distractors
- severity: minor
- category: `notation` / `pedagogy`
- affected: 54 MC items (all of the special-angle 三角 items)
- evidence:
  > `pep-high-s4-mc-005`: 「求 \(\tan 45^\circ\)。」 options `["1","0","2","sqrt(3)/2"]`
  > `pep-high-s4-rag2-mc-043`: 「求 \(\cos 60^\circ\)。」 options `["1/2","0","2","sqrt(3)/2"]`
- why: the stem is LaTeX-rendered but the option is raw ASCII `sqrt(3)/2` rather
  than \(\frac{\sqrt3}{2}\). Additionally the distractor `2` is impossible for a
  sine/cosine (\(|\cos\theta|\le1\)) and so is never a live option for any learner —
  the item is effectively 3-way. Only **3 distinct angles** (tan45°, sin30°,
  cos60°) exist in the entire 三角函数 special-value bank.
- fix: emit `\(\frac{\sqrt{3}}{2}\)`; replace impossible distractors with
  misconception-bearing ones (e.g. for \(\cos60^\circ\): \(\frac{\sqrt3}{2}\)
  [confusing with \(\sin60^\circ\)], \(\frac{\sqrt2}{2}\), \(\sqrt3\)); widen the
  angle set to 0/30/45/60/90/120/135/150/180.

### F14 — Explanations are circular and reveal the key instead of deriving it
- severity: minor
- category: `pedagogy`
- affected: 3000 items state the answer outright — 1020 with 「唯一匹配选项为 X。」,
  1980 with 「最终答案为 X。」; the surrounding text is a per-family constant.
- evidence:
  > `pep-high-s5-rag3-mc-069` (椭圆 长轴长): 「椭圆中使用 \(c^2=a^2-b^2\) 和长轴长 \(2a\)；抛物线 \(y^2=2px\) 可直接读出 \(p\)。 **唯一匹配选项为 14。** 本题依据安全 RAG 卡片抽象生成…」
  > `pep-high-s4-fi-002` (求 \(f(3)\) for \((x+2)^2-1\)): 「顶点式可直接看出顶点为 \((-2,-1)\)。**若题目要求函数值，再代入对应的 \(x\)。**」 — never computes \(5^2-1=24\).
- why: 「唯一匹配选项为 14」 is not a justification, it is a restatement of the key.
  The generic first sentence covers the whole family (it discusses 抛物线 in an
  椭圆 item), so the learner who got it wrong receives no diagnosis. Only the
  slope / circle / log families actually substitute the item's own numbers.
- fix: template the explanation with the item's own substitution, as the slope
  family already does (`pep-high-s5-rag4-mc-039`: 「本题 \(\frac{4-2}{4-2}=1\)」).

### F15 — 分步乘法计数原理 content placed in 高一 概率
- severity: minor
- category: `curriculum-alignment`
- affected: 54 items in `pep-high-s4-probability` (the 「不放回依次摸出两个球…有序结果」 family)
- evidence:
  > `pep-high-s4-sa-010`: 「袋中有 4 个红球和 3 个蓝球，不放回依次摸出两个球。按具体球区分时，有多少种有序结果？」 answer `42`
- why: \(n(n-1)\) ordered outcomes is 排列 / 分步乘法计数原理, 人教A版**选择性必修第三册** 6.1–6.2.
  高一必修二第十章 concerns 古典概型 via 列举/树状图, not 排列数. It is answerable by
  enumeration, so this is 超前 rather than 超纲 — but it is mis-shelved.
- fix: move to `pep-high-s6-counting`, or reword as an explicit 树状图 enumeration
  task with small \(n\).

---

## Verified negatives (do not re-investigate)

- **F-neg-1 — answer keys are otherwise sound.** 4781 of 4800 keys (99.60%)
  reproduce exactly under independent computation. Specifically **zero** errors in:
  椭圆 \(c^2\)/长轴长 (367 — and all 183 \(c^2\) items are x-major, so there is **no
  a/b/c orientation confusion**), 抛物线 \(p\) (180), 圆 半径/\(r^2\) (212),
  等差数列 \(a_n\)/\(S_n\) (320 — **no 首项/项数 off-by-one anywhere**),
  二项分布 \(E(X)\)/\(D(X)\) (232), 排列/组合 (232), 古典概型 (332),
  复数 实部/虚部/\(|z|^2\) (160), 数量积/模 (480), 导数求值 (517),
  回归预测/残差 (229), 总体方差 (54, correctly \(\div n\) per 人教A版必修二 9.2.4),
  集合计数 (160), 长方体 (160), 对数 (160), 特殊角三角值 (54).
- **F-neg-2 — the LaTeX is well-formed.** Across all 4800 prompts *and* all 4800
  explanations: 0 unbalanced `{}`, 0 mismatched `\(`/`\)` counts, 0 `$` delimiters
  (so no `$` vs `\(` inconsistency), 0 double-escaped macros (`\\frac`).
  KaTeX renders every prompt. The pre-scan's **1157 "Latin word ≥4 chars" flags are
  100% false positives** — they are exactly five KaTeX macros: `frac` (734),
  `cdot` (320), `text` (256), `ldots` (160), `circ` (54). The only genuine LaTeX
  defect is the unbraced multi-character subscript (F8), which a brace-balance
  check cannot see.
- **F-neg-3 — no traditional-character leakage.** The slice uses 339 distinct CJK
  characters; every one is the Simplified form. The pre-scan's **160 `tradLeak`
  flags all come from the single character 「限」** (in 「有限全集」), which is
  identical in Simplified and Traditional and is wrongly listed in
  `scan.mjs:7 TRAD_STRICT`. 100% false positive — 限 is the only character in that
  class that is shared between the two scripts, and it is the only one this slice
  contains. Recommend deleting 限 from `TRAD_STRICT` and re-running the pre-scan;
  the pep-high traditional-leak count then drops to 0.
- **F-neg-4 — the 580 duplicate prompts do NOT disagree on answers.** 381 duplicate
  groups covering 961 items; **0 groups have conflicting `answer` values** and
  **0 groups have conflicting `explanation`s**. 292 groups differ only in
  `options` because the same stem is issued once as `fill-in` and once as
  `multiple-choice`. So duplication is a variety defect (F11), not an answer-key
  defect.
- **F-neg-5 — no unsolvable items.** 0 of 4800 prompts reference a figure
  (`如图|下图|图中|右图|图示|见图`), and every item's data is sufficient to determine
  the answer — my parser recovered a unique answer for 4800/4800. The pre-scan's
  13 `answerInPrompt` flags are false positives (the key coincides with a
  parameter, e.g. `pep-high-s4-rag4-fi-019` 「\(f(x)=(x-2)^2-2\)，求 \(f(2)\)」 → −2).
  0 MC items have the key missing from options; 0 have duplicate option strings.

---

## Slice health verdict

**Not shippable to mainland learners as-is.** The mathematics is, to my surprise,
almost entirely correct — 4781 of 4800 keys verify exactly, with no 圆锥曲线
参数混淆, no 数列 off-by-one, no 概率 放回/不放回 error and no missing-figure items —
but the slice fails as an assessment and as a 人教版 curriculum. The correct
option is the **first option in all 1620 multiple-choice items**, so a learner
can clear the entire MC bank without doing any mathematics and every mastery
signal derived from it is void (F1); 19 short-answer keys are rounded decimals
that the 1e-6 grader rejects when the learner writes the exact fraction (F2).

Beyond correctness, 81% of prompts carry generator scaffolding (`RAG-v3 反例判断
109（复数）：…任务：`), 31% of explanations end in untranslated English
(「并提醒避免parameter range not checked。」), and the 4800 items reduce to 1513
distinct questions built from 47 templates — so 双曲线, 等比数列, 二项式定理,
条件概率, 正态分布, 独立性检验, 充要条件, 一元二次不等式, 解三角形, 线面位置关系,
导数的应用 and 空间向量求角 have **zero** items despite being 课标 必修/选择性必修
requirements, and 高三「高考风格综合练习」 is a monomial derivative.

Recommended gate before any mainland release: fix F1 and F2 (blockers, both
mechanical), strip F3 scaffolding, translate F4, and re-scope the slice honestly
as a 「基础运算训练」 drill bank rather than 「人教版高中数学」 coverage until F5 is
addressed.
