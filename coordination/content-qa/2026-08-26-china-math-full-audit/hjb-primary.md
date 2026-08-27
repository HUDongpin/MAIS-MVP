# 沪教版小学数学 (hjb-primary, P1–P6, 1500 items) — 教研审读报告

## Coverage

**Items read in full: 332 of 1500 (22.1%)** — prompt + options + answer + explanation displayed and reviewed.

| grade | items in slice | read in full |
|---|---|---|
| P1 | 250 | 63 |
| P2 | 250 | 56 |
| P3 | 250 | 44 |
| P4 | 250 | 62 |
| P5 | 250 | 49 |
| P6 | 250 | 58 |

**Method**
1. *Stratified sample (140 items)* — deterministic FNV-hash ordering within each of the 70 topicIds, 2 items per topic. Covers every topic in every grade; spans all 3 `type` values and all 3 `difficulty` values.
2. *Full census of one topic* — all 20 items of `hjb-primary-p1-upper-school-math-habits` (task 2).
3. *Targeted pulls (~190 items)* — every item flagged by any of the automated verifiers below, plus every currency item, every unit-selection item, every `answerInPrompt` item, and every item in the near-duplicate topic pairs.

**Programmatic verification run over all 1500 items** (nothing eyeballed; every number recomputed in `node`):
- **Equality-chain arithmetic**: 1583 raw `… = …` equations extracted from `prompt`, `explanation` and the key option; after filtering remainder-division (`47÷5=9余2`), 带分数, fraction notation and chained `a=b=c`, **1044 integer/decimal chains** and **60 rational (fraction) chains** were evaluated exactly. 28 survived filtering and were triaged by hand; 26 proved to be parser artefacts, 2 were real errors (F2, F4).
- **Money-composition verifier**: every MC option parsed into 分 and compared with the price(s) in the stem (4 items).
- **Number-theory MC verifier**: 因数∩因数 / 因数∩倍数 / 倍数∩倍数 / 质数 / 商>1 / 分数相等 patterns, 11 items.
- **Statistics-claim verifier**: data series parsed from the stem, each option's claim (倍数 / 比…多少 / 最多最少) evaluated, 6 items.
- **Range-constraint verifier**: the `下面哪个数比#大，比#小？` skeleton, 5 items (task 3).
- **RMB denomination check**: every `N张/枚 D元/角/分` token checked against denominations actually in circulation.
- **Language/encoding scans**: zh-Hant leakage, Latin-script leakage, LaTeX leakage, `term-XXXX` placeholders, option-label consistency, multi-blank separator consistency — all 1500 items.

**Not covered**
- The ~1170 items never read in full. In particular the long tail of P3/P5 word problems: automated verification only proves a stated equation is *internally* consistent, not that the *model* of the word problem is right. Items whose defect is semantic (wrong quantity chosen, wrong relationship) and which contain no explicit equation are largely uninspected.
- Diagram-dependent items ("看图填空", 折线统计图, 钟面) — I judged only the text; I could not see whether a figure is actually rendered, and several stems presuppose one.
- Pedagogical register was judged on the 332 items read, not slice-wide.
- Defect *rates* below are counts within what I read; where I extrapolate I say so explicitly.

---

## Corrections to the pre-scan (do not carry these forward)

**C1 — the single flagged arithmetic error is a FALSE POSITIVE.** `scan.json` reports
`hjb-primary-ds-v1-p3-014` as `["45×6","398",270]`. The item is:

> 用递等式计算：128 + 45 × 6 — answer `398` — 先算乘法：45 × 6 = 270，再算加法：128 + 270 = 398

`128 + 45*6 = 398`. **The item is correct.** The pre-scan regex anchored on the trailing
`45 × 6` and ignored `128 +`. The error class it *represents* is real, though — see F2/F4:
explanations that state an equation which does not hold. My chain-aware sweep found those.

**C2 — the 8 `tradLeak` flags are FALSE POSITIVES.** All 8 (`p4-097/101/104/107/111/115/121`, `p6-217`) trip only on **限** (in 无限延伸 / 有限). 限 is standard 简体. Verified against `prompt`, `options`, `explanation` and `answer`: **learner-visible zh-Hant leakage in this slice is zero.** (zh-Hant *does* pollute `acceptedAnswers` — see F11 — but that array is a matcher, not display text.)

**C3 — 24 of the 26 `answerInPrompt` flags are benign.** See F14 for the 2 genuine ones.

**C4 — template monotony is NOT a problem in this slice.** 1459 distinct skeletons / 1500 items = 1.03x reuse, 0 exact duplicate prompts. This is by far the healthiest variety of any slice in the corpus. The largest cluster is 5 items.

---

## Findings

### F1 — Answer key contradicts the explanation's own arithmetic (4/6 > 5/8)
- **severity**: blocker
- **category**: answer-key
- **affected**: `hjb-primary-ds-v1-p4-064`, 1 item
- **evidence**:
  > P: 下面哪幅图表示的分数最大？ A. 把一个圆平均分成6份，涂色部分占2份。 B. 把一个圆平均分成6份，涂色部分占4份。 C. 把一个圆平均分成8份，涂色部分占3份。 D. 把一个圆平均分成8份，涂色部分占5份。
  > A: `"D"`
  > E: A是2/6≈0.33，**B是4/6≈0.67**，C是3/8=0.375，**D是5/8=0.625**。D最大。
- **why**: 4/6 = 0.6667 > 5/8 = 0.625. The correct answer is **B**. The explanation computes both values correctly and then draws the opposite conclusion — the key is wrong, and the explanation shown after a wrong attempt visibly contradicts itself, so a learner who answered B correctly is told they are wrong *and* shown the numbers proving they were right.
- **fix**: `answer` → `"B"`; explanation → `4/6≈0.67 最大`. Also add the intended teaching point (通分为 24 分母: 8/24, 16/24, 9/24, 15/24).

### F2 — P2 pattern item: the rule stated in the stem is false for its own sequence; key wrong
- **severity**: blocker
- **category**: math-error
- **affected**: `hjb-primary-ds-v1-p2-232`, 1 item
- **evidence**:
  > P: …小丁发现了一组数：2，4，8，14，22，32。他发现从第三个数开始，每个数都是前两个数的和再加2。按照这个规律，32后面的一个数是多少？
  > A: `"56"`
  > E: 验证：8=2+4+2，14=4+8+2，**22=8+14+2**，**32=14+22+2**。所以下一个数是22+32+2=56。
- **why**: computed: `8+14+2 = 24 ≠ 22` and `14+22+2 = 38 ≠ 32`. The stated rule holds for only the first two applications and then fails. The sequence's actual rule is 逐差递增2 (first differences 2,4,6,8,10), so the next term is **44**. The explanation contains two equations that are simply false, and the key 56 is produced by applying a rule the data contradicts.
- **fix**: either keep the rule and fix the data → `2，4，8，14，24，40`（next = 66）; or keep the data and fix the rule → 「相邻两数的差依次多2」, answer **44**, explanation 「差是 2、4、6、8、10，下一个差是 12，32+12=44」. Recommend the latter: 逐差法 is the standard 沪教版二下 数学广场 探究内容.

### F3 — P3 fraction item: three rope segments each claimed to be 1/4 of the whole
- **severity**: blocker
- **category**: math-error
- **affected**: `hjb-primary-ds-v1-p3-108`, 1 item
- **evidence**:
  > P: 一根绳子对折一次后，从中间剪开，得到几段？其中一段是原来绳子的几分之一？
  > A: `"3段，其中一段是原来绳子的1/4"`
  > E: 对折后绳子变成2层，从中间剪开，两端是半个对折段，中间是完整对折段，共3段。**每段占原长的1/4。**
- **why**: cutting the folded rope at its midpoint cuts the original at L/4 and 3L/4, giving segments of **1/4, 1/2, 1/4**. Three segments each of 1/4 sum to 3/4 ≠ 1 — the claim is impossible. The explanation's own preceding sentence ("中间是完整对折段") is correct and implies 1/2, so the final sentence contradicts it.
- **fix**: answer → 「3段；两端的两段各是原来的 1/4，中间一段是原来的 1/2」; explanation → 「对折段长 1/2，从它的中点剪开，两端各得 1/4，中间一段是完整的对折段即 1/2。1/4+1/2+1/4=1」. The stem should also be rewritten — "其中一段是几分之一" has no unique answer as posed.

### F4 — P3 place-value analysis in the key is wrong (十位多6/个位少6, not 5/4)
- **severity**: blocker
- **category**: answer-key
- **affected**: `hjb-primary-ds-v1-p3-011`, 1 item
- **evidence**:
  > P: 小马虎计算 528 + 196 时，把 528 看成了 582，算出的结果是 778。…他看错的数在百位、十位、个位上分别发生了什么变化？正确的和是多少？
  > A: `"百位不变，十位多了5个十，个位少了4个一；正确的和是724"`
  > E: 582比528**十位多5，个位少4**。错误和778多加了50又少加了4，实际多加了**46**。正确和是**778 - 46 = 724**。
- **why**: computed: 528 → 582 changes 十位 2→8 (**+6 个十 = +60**) and 个位 8→2 (**−6 个一 = −6**); net **+54**, and `582 − 528 = 54`. The key's "多了5个十…少了4个一" is wrong, and so is "实际多加了46". The final number 724 is right (`528+196 = 724`) but is reached by a route that does not work: `778 − 46 = 732`, not 724. The place-value analysis is the *main thing the question asks for*, and it is the part that is wrong — a learner who answers correctly (多6个十、少6个一) is marked wrong.
- **fix**: answer → 「百位不变，十位多了6个十，个位少了6个一；正确的和是724」; explanation → 「582 比 528 多 60−6=54，所以错误的和多了 54，778−54=724」.

### F5 — Multiple-choice items with more than one true option
- **severity**: blocker
- **category**: answer-key
- **affected**: `p2-028`, `p2-031`, `p2-043`, `p3-249`, `p4-163`, `p5-148` — **6 items confirmed**; each verified by recomputing every option
- **evidence / verification**:

| id | grade | stem | options that are true | key |
|---|---|---|---|---|
| `p2-028` | P2 | 哪种付钱方式正好能买一个价格为3元8角的卷笔刀？ | **A** 2张1元+3张5角+3张1角 = 3元8角; **B** 1张2元+1张1元+1张5角+3张1角 = 3元8角; **C** 3张1元+1张5角+3张1角 = 3元8角 | C |
| `p2-031` | P2 | 笔记本2元5角+铅笔8角，哪种付钱方式正好够付？ | **A** 2元+5角+8角 = 3元3角; **B** 2元+5角+5角+3角 = 3元3角 | B |
| `p2-043` | P2 | 哪种付钱方法正好能买一本6元5角的笔记本？ | **A** 5元+1元+5角 = 6元5角; **D** 5元+3×5角 = 6元5角 | A |
| `p3-249` | P3 | 足球12 篮球8 乒乓球10 羽毛球6，哪种说法正确？ | **A** 12 = 2×6 ✓; **B** 10−8 = 2 ✓; **D** 6 是最小 ✓ | B |
| `p4-163` | P4 | 下面各数中，去掉"0"而大小不变的是？ | **8.030**→8.03 ✓; **8.300**→8.3 ✓; **80.30**→80.3 ✓ (only 8.003 fails) | 8.300 |
| `p5-148` | P5 | 下面哪个数既是42的因数，又是7的倍数？ | **14** (42÷14=3, 14=7×2) ✓; **21** ✓ | 21 |

  Every one of these six explanations asserts the other options are wrong, e.g.
  > `p3-249` E: 篮球8人，乒乓球10人，10-8=2… **其他选项计算错误。**
  > `p5-148` E: 42的因数有1,2,3,6,7,**14**,21,42。7的倍数有7,**14**,21,28,35,…。**同时满足的只有21。**
  (`p5-148` lists 14 in *both* sets and then denies it satisfies both.)
- **why**: a learner who reasons correctly and picks a different true option is marked wrong and shown a false justification. This is the single largest defect class I found and it spans P2–P5.
- **fix**: per item — `p2-028` replace A and B with 3元7角/3元9角 compositions; `p2-031` replace A (see also F6); `p2-043` change D to 「1张5元、2张5角」= 6元; `p3-249` change A to 「喜欢足球的人数是羽毛球的3倍」and D to 「喜欢篮球的人数最少」; `p4-163` rewrite the stem as 「去掉**末尾**的"0"而大小不变的是」and change 8.030→8.043, 80.30→80.03; `p5-148` change option 14 to 49. **Systemic fix**: add a build-time gate that, for every MC item with a machine-checkable predicate (因数/倍数/质数/分数相等/金额组合/统计比较), asserts exactly one option satisfies it.

### F6 — Currency items use RMB denominations that do not exist
- **severity**: major
- **category**: terminology
- **affected**: `hjb-primary-ds-v1-p2-028`, `p2-031`, `p2-043`, 3 items
- **evidence**:
  > `p2-031` options: 「一张2元，一张5角，一张**8角**」 / 「一张2元，一张5角，一张5角，一张**3角**」(the key) / …
  > `p2-028` options: 「1张**2元**，1张1元，1张5角，2张**2角**」
  > `p2-043` option C: 「1张5元、1张**2元**、1枚5角」
- **why**: **3角 and 8角 have never existed** in any series of 人民币. **2元 and 2角** (第四套) ceased circulation on 2018-05-01 and are absent from 第五套; a Shanghai 二年级 pupil in a 人民币与购物 unit has never seen either. 沪教版二年级上册《人民币的认识》 teaches exactly the circulating set: 纸币 100/50/20/10/5/1元, 硬币 1元/5角/1角. Teaching composition with a fictional 3角 note actively mis-teaches the unit's core content. Separately, the **量词 is wrong**: 角 are 硬币 and take **枚**, not 张 — `p2-028`/`p2-031` write 「3张1角」「一张5角」while `p2-027`/`p2-041`/`p2-043` in the same topic correctly write 「4枚5角硬币」「1枚5角」, so the slice is internally inconsistent.
- **fix**: restrict every denomination token to {100,50,20,10,5,1}元 and {5,1}角; use 张 for 纸币 and 枚 for 硬币 throughout. Add a lint rule on the `(\d+)(张|枚)(\d+)(元|角)` pattern.

### F7 — P1 "math learning habits" items are classroom-behaviour items, not mathematics
- **severity**: major
- **category**: pedagogy
- **affected**: `hjb-primary-ds-v1-p1-001, -003, -004, -007, -009, -010, -013, -015, -017, -020` — **10 of the 20 items** in `hjb-primary-p1-upper-school-math-habits`; plus `p1-109` and `p3-130` elsewhere. **12 items total; 10 of P1's 250 = 4.0% of P1.**
- **census of the topic (all 20 items read)**:
  - **Zero mathematical demand — 6 items**: `001` (which child obeyed the instruction), `007` (best listening behaviour), `009` (what to do when a classmate is speaking), `013` (which child behaved best), `017` and `020` (write the teacher's instruction back verbatim; no quantity is computed).
  - **Meta-judgement about what counts as maths, no mathematical operation — 4 items**: `003` (which words are 数学语言 — key `"颜色、最多"`), `004`, `010` (whose remark is a 数学发现), `015`.
  - **Genuine mathematics — 9 items**: `002`(3+5), `005`(比3多2), `006`, `008`(2+1+2), `011`(2+3), `012`(4+2), `014`, `018`, `019`(数序).
  - **Conflated — 1 item**: `016` — the maths (3比2多1) is correct, but options A and C give the *same* correct number and differ only in whether the child consulted their deskmate first, so a learner with correct arithmetic is failed on etiquette.
- **evidence**:
  > `p1-009` P: 请你说一说，在数学课上，当其他小朋友在发言时，你应该怎么做？
  > A: `"认真听，不插话，等小朋友说完再举手说自己的想法。"`
  > `p1-001` A: `"C. 先拿出糖果，一颗一颗数，然后告诉同桌「我拿了5颗」"` — the discriminating axis across A–D is compliance, not counting.
- **why / verdict on whether they belong**: the *topic* has a legitimate basis — 沪教版一年级第一学期 opens with 「学前准备」(数一数、比一比、分一分、看一看摆一摆) and the 教材 does carry 学习习惯 guidance. But in the 教材 those habits are teacher-facing sidebars, never assessable items; the 学前准备 unit's assessable content is *pre-number mathematics* (一一对应、多少比较、分类). **These 10 items do not belong in a graded math question bank**: (a) they carry no mathematical demand, so they cannot diagnose anything a math product exists to diagnose; (b) six of them are free-text or open MC whose "correct answer" is a single etiquette sentence, so the grader marks a 6-year-old wrong for phrasing; (c) `p1-009`, `p1-017`, `p1-020` require a 一年级 pupil to *type* a full Chinese sentence at a point in the year when they have barely begun 识字 — they are unanswerable in the product's own input modality.
- **fix**: delete the 6 zero-maths items and `p1-016`'s etiquette axis; convert the 4 meta items into concrete 学前准备 tasks (数一数图中有几只小鸟 / 比一比哪一排多 / 把物体按形状分一分). Retain the 9 genuine items. If 习惯 content is a product requirement, route it to a non-scored onboarding surface, not the question bank.

### F8 — P1 measurement items require multiplication and answers in the hundreds
- **severity**: major
- **category**: curriculum-alignment
- **affected**: `hjb-primary-ds-v1-p1-218`, `p1-222`, `p1-228`, `p1-230` — 4 items, all in `p1-lower-body-rulers-math-square`
- **evidence**:
  > `p1-218` P: 小丽用"步"来测量教室的长度，她走了15步。如果她的一步长约40厘米，教室的长度大约是多少厘米？ A: `"600厘米"`
  > E: 一步长约40厘米，15步就是15个40厘米，**40+40+40+40+40+40+40+40+40+40+40+40+40+40+40=600厘米**。
  > `p1-222`: 8×40 = 320厘米; `p1-228`: 8×30 = 240厘米; `p1-230`: 120×2 = 240厘米
- **why**: 沪教版一年级第二学期 covers 100以内的数 and 100以内的加减法; **乘法 is not introduced until 二年级第一学期《乘法引入与九九表》**, and 万以内的数 not until 二年级第二学期. All four items need a product beyond 100. The explanation for `p1-218` gives itself away — it writes out fifteen addends because multiplication is unavailable, producing a 15-term addition chain that no 一年级 pupil can execute. This is 超纲 against **both** 沪教版编排 and 《义务教育数学课程标准（2022年版）》第一学段 (which places 乘法 and 万以内数 in 二年级). Note the *activity* (用身体尺估测) is authentic 沪教版一下 content — only the magnitudes are wrong.
- **fix**: keep the 身体尺 context, cap the arithmetic at 100以内加减: 「小丽的一步长约10厘米，她走了8步，教室的一段长约多少厘米？」(80). Or re-express in 米: 「一步约半米，走8步大约几米？」(4米).

### F9 — The curriculum spine is not 沪教版 at P5-下 and P6-下; two chapters are taught twice
- **severity**: major
- **category**: curriculum-alignment
- **affected**: the topic spine — `p5-lower-factors-multiples` (31), `p5-lower-fractions-equivalence-operations` (31), `p5-lower-cuboid-cube` (31), `p6-lower-ratio-proportion` (18), `p6-lower-circle-sector` (18), `p6-lower-cylinder-cone` (18), `p6-lower-probability-statistics` (18). **~165 items sit on a spine that is not 沪教版.**
- **evidence (verified from the data, not from memory)**: near-duplicate content across topic pairs, measured by 2-gram Jaccard on prompts:

  | pair | near-dup pairs (>0.5) | worst case |
  |---|---|---|
  | `p6-upper-ratio-proportion` ↔ `p6-lower-ratio-proportion` | 7 | `p6-048` vs `p6-077` |
  | `p6-upper-circle-sector` ↔ `p6-lower-circle-sector` | 11 | `p6-063` vs `p6-107` |
  | `p6-upper-divisibility` ↔ `p5-lower-factors-multiples` | 8 | `p6-010` vs `p5-136` |
  | `p6-upper-fractions` ↔ `p5-lower-fractions-equivalence-operations` | 8 | `p6-026` vs `p5-161` |
  | `p6-lower-cuboid` ↔ `p5-lower-cuboid-cube` | 6 | `p6-239` vs `p5-205` |

  > `p6-048` (topic 比和比例): 在比例尺为1:4000000的地图上，量得甲、乙两城的距离为8.5厘米。一辆汽车以每小时85千米的速度从甲城开往乙城，需要多少小时**到达**？ A: `"4小时"`
  > `p6-077` (topic 比与比例): 在比例尺为1:4000000的地图上，量得甲、乙两城的距离为8.5厘米。一辆汽车以每小时85千米的速度从甲城开往乙城，需要多少小时？ A: `"4"`
  > — same numbers, byte-identical explanation, two different "chapters".
- **why**: 沪教版 is 五四学制. Its authentic sequence is 六年级第一学期 = 数的整除 / 分数 / 比和比例 / 圆和扇形, and 六年级第二学期 = 有理数 / 一次方程(组)和一次不等式(组) / 线段与角的画法 / 长方体的再认识. **P6-上 matches this exactly — it is authentic 沪教版.** P6-下 carries the four authentic 六下 chapters *plus* duplicates of 六上's 比和比例 and 圆和扇形, *plus* 圆柱与圆锥 (a 人教版六年级下册 unit that 沪教版 小学 does not contain). P5-下's four topics — 因数倍数 / 分数意义性质与加减 / 长方体正方体与体积 / 统计 — are the 人教版五年级下册 unit list; in 沪教版 those are 六上第一、二章 and 六下第八章. So 沪教版 material is being pre-taught a year early *and* re-taught later in the same slice.
- **explicit note on 超纲 (per brief)**: relative to 沪教版 this is 超前, but relative to 《义务教育数学课程标准（2022年版）》 第三学段(5–6年级) 因数倍数/分数/长方体体积 are all in band — **this is NOT a 课标 超纲 and must not be reported as one.** The two standards disagree and the honest statement is: *the placement is legal nationally, wrong for 沪教版, and internally redundant.*
- **fix**: pick one spine. If the slice is to be 沪教版, move `p5-lower-factors-multiples` / `-fractions-` / `-cuboid-cube` into P6-上/P6-下 and delete the duplicated `p6-lower-ratio-proportion` / `p6-lower-circle-sector` topics; drop or relabel `p6-lower-cylinder-cone`. At minimum, deduplicate the 40 near-identical items so a learner is not served the same 比例尺 problem in two "chapters".

### F10 — Raw LaTeX rendered to P5 learners
- **severity**: blocker
- **category**: data-integrity
- **affected**: `hjb-primary-ds-v1-p5-171`, `-172`, `-173`, `-174`, `-175`, `-188` — 6 items
- **evidence**:
  > `p5-172` P: `下面哪个分数与 \\(\frac{9}{12}\\) 相等？`
  > `p5-171` A: `"\\frac{4}{15}"`
  > `p5-175` A: `"\\frac{7}{10} - \\frac{1}{4}"`
- **why**: these are the **only** 6 items in 1500 that use LaTeX; the other ~200 fraction items in this slice write `3/8`, `2/5` as plain text. The corpus therefore has no LaTeX renderer contract, and `\\(\frac{9}{12}\\)` will be shown verbatim to a 五年级 pupil. the `answer` field itself is a LaTeX string in 5 of the 6 (`p5-171` `\frac{4}{15}`, `p5-172`/`p5-174` `\frac{3}{4}`, `p5-175` `\frac{7}{10} - \frac{1}{4}`, `p5-188` `\frac{3}{8}`), and that is exactly what the grader displays as `correctAnswer` on a wrong attempt — no learner can type it. `p5-188` is self-contradictory: its `answer` is `\frac{3}{8}` while its own explanation writes 「3÷8 = 3/8（米）」 in plain text.
- **fix**: convert all 6 to the slice's plain-text convention (`9/12`, `4/15`, `7/10 - 1/4`). Add a lint rule rejecting `\frac`, `\\(`, `$` in any zh-Hans field.

### F11 — `acceptedAnswers` polluted with broken machine translation and placeholder tokens
- **severity**: major
- **category**: data-integrity
- **affected**: **461 items (30.7%)** contain a `term-XXXX` placeholder; **688 (45.9%)** contain Latin-script words; **393 (26.2%)** contain zh-Hant. Distribution of the `term-` defect: P1 85, P2 89, P3 84, P4 92, P5 64, P6 47.
- **evidence**:
  > `p3-011` acceptedAnswers[2]: `"term-767e place not variant, ten place more 5items ten, items place less 4items one; correct of sum is 724"`
  > `p1-117` acceptedAnswers[2]: `"8+5 = 13, not is 12. term-5979 can can term-5fd8 remember term-8fdb place, put8+5 calculate become8+2+2 = 12, less calculate 1."`
  > `p2-247` acceptedAnswers[1]: `"use result term-675f when interval subtract remove term-5f00-term-59cb when interval see is term-5426 equal at30 minute"`
- **why**: `schema-sample.json` shows `acceptedAnswers` is the flattened `{en, zh, zhHans}` triple. The `en` leg is a word-by-word gloss of very poor quality, and in 461 records the gloss pipeline failed outright and emitted `term-<unicode-codepoint>` placeholders (`term-767e` = 白, `term-5979` = 她). Three consequences: (1) the `en` locale of this slice is unusable if the product ever renders it; (2) these strings are live in the accepted-answer matcher, so English fragments can be graded correct on a zh-Hans item; (3) the `zh` (Hant) leg is itself half-converted — `"C. 先拿出糖果，一颗一颗數，然後告诉同桌…"` mixes 简 (颗, 告诉) and 繁 (數, 然後) in one string.
- **fix**: regenerate or drop the `en` leg for MAINLAND slices; fail the build on any `term-[0-9a-f]{4}` token; either produce a clean zh-Hant conversion or drop the `zh` leg for mainland content. Note the learner-visible `answer` field is clean (7 Latin hits, all legitimate geometry labels like `∠AOB`, `OA = OB` — plus the 6 LaTeX ones in F10).

### F12 — Multiple-choice option labelling is inconsistent, and 79 explanations cite labels the options do not carry
- **severity**: major
- **category**: data-integrity
- **affected**: 537 MC items have unlabelled options, 52 carry an `A. ` prefix inside the option text, 11 have options that are *only* the bare letters `["A","B","C","D"]` with the choice text buried in the prompt. **79 items** have unlabelled options but an explanation that refers to 选项A/B/C/D or 第三个选项.
- **evidence**:
  > `p1-187` O: `["时针指向3，分针指向12","时针指向6和7之间，分针指向6", …]` E: 半时的时候…**选项B**符合这个特征
  > `p2-004` E: …**选项四**符合这个结构
  > `p2-010` O: `["A","B","C","D"]`, with `A. 对，因为 44 + 47 = 91 / B. 不对，因为…` inside the prompt
  > `p3-097` O: `["A","B","C","D"]`, four figure descriptions inside the prompt
- **why**: the three conventions are mutually exclusive under any single renderer. If the UI prepends A/B/C/D then the 52 prefixed items render as "A. A. …"; if it does not, the 79 explanations reference labels the learner never saw, and the 11 bare-letter items give the learner four unlabelled letters to choose between. `p3-097` and `p4-064` (see F1) are both bare-letter items, which is likely why F1's key slipped through review.
- **fix**: pick one convention (recommend: option text carries no label, renderer supplies A/B/C/D), strip the 52 embedded prefixes, migrate the 11 bare-letter items' text out of the prompt into `options`, and rewrite the 79 explanations to name the option's *content* rather than its letter.

### F13 — Same solid, two contradictory 有盖/无盖 assumptions
- **severity**: major
- **category**: pedagogy
- **affected**: `hjb-primary-ds-v1-p6-131` vs `p6-136`, 2 items
- **evidence**:
  > `p6-131` P: 一个圆柱形**铁桶**，底面直径是4分米，高是5分米。做这个铁桶至少需要多少平方分米的铁皮？ A: `"88"` (E: 12.56×2+62.8 = 87.92 — **two** bases)
  > `p6-136` P: 一个圆柱形铁皮水桶（**无盖**），底面半径是2分米，高是5分米。制作这个水桶至少需要多少平方分米的铁皮？ A: `"75.36"` (E: 侧面积+**一个**底面积)
- **why**: identical solid (r = 2分米, h = 5分米), identical task ("至少需要多少铁皮"), opposite modelling assumptions. `p6-136` and `p6-127` and `p6-244` all state the open face explicitly; `p6-131` does not, yet its key requires the learner to assume a lidded drum — which contradicts both everyday sense (桶 is open) and the convention the slice itself uses three other times. A learner who answers 75.36 is marked wrong. The word 至少 makes it worse, since 75.36 < 87.92.
- **fix**: add 「有盖」 to `p6-131`'s stem, or change its key to 75.36. Establish a slice-wide rule: any 表面积 application item must state which faces are included.

### F14 — Only 2 of the 26 `answerInPrompt` flags are genuine giveaways
- **severity**: minor
- **category**: pedagogy
- **affected**: genuine — `hjb-primary-ds-v1-p3-155`, `hjb-primary-ds-v1-p4-208` (2 items). Benign — the other 24.
- **evidence (genuine)**:
  > `p3-155` P: 估算 198×4 时，把 198 看作 200，**200×4=800**，所以 198×4 的积大约是（ ）。 A: `"800"` — the stem performs the entire computation; the blank requires nothing.
  > `p4-208` P: 用三角尺画一条直线L的垂线时，应该把三角尺的一条（ ）边与直线L重合，然后沿**另一条直角边**画线。 A: `"直角"` — the later clause in the same sentence names the answer.
- **why the other 24 are benign**: 10 are selection-from-a-list tasks where the answer is *supposed* to be one of the listed objects/names/labels (`p1-032` 魔方, `p1-035` 粉笔盒, `p1-204` 小芳, `p1-214` 小亚, `p4-059` 小刚, `p4-186` 星期三, `p4-190` 第3周, `p5-236` 第6天, `p4-206` table look-up, `p3-218`); 6 are two-or-three-way choices whose options are printed in the stem by design (`p4-035` 升/毫升, `p4-196` 上升/下降, `p4-200` 增加/减少, `p4-228` 垂直/平行, `p5-074` 变大/变小/不变, `p4-029`); 3 are deliberate 乘除互逆 items where showing the product *is* the pedagogy (`p4-002`, `p4-014`, `p4-017`); 2 are substring artefacts (`p4-131` `"38"` inside `384720`, `p4-179` `"3.05"` inside `3.050`); 3 are numeric coincidences that still require the full computation (`p3-202`, `p4-198`, `p5-113` where 周一's 12.5 happens to equal the weekly mean, `p5-240` where 小敏's 142 happens to equal the mean).
- **fix**: `p3-155` — delete 「200×4=800，」 from the stem. `p4-208` — reword to 「…把三角尺的一条（ ）边与直线L重合，然后沿另一条边画线」. For the two coincidence cases (`p5-113`, `p5-240`) consider changing one datum so the mean is not also a listed value, since a guesser can copy it.

### F15 — Inconsistent multi-blank answer separators
- **severity**: minor
- **category**: data-integrity
- **affected**: 102 multi-blank fill-in items use 5 different separators: `,` (43), `，` (37), `；` (16), `、` (4), `;` (2)
- **evidence**:
  > `p1-038` A: `"1；5"`  ·  `p2-035` A: `"2,10"`  ·  `p1-011` A: `"2,3,5"`  ·  `p2-128` A: `"（1）10；（2）5；（3）36"`  ·  `p4-117` A: `"50386000，50400000"`  ·  `p3-228` A: `"5，5"`
- **why**: with five separator conventions the grader cannot normalise multi-blank input reliably; a learner typing `1,5` fails `p1-038` and one typing `1；5` fails `p2-035`.
- **fix**: normalise to one separator (recommend `，` for zh-Hans) and have the matcher treat all five as equivalent.

### F16 — P5 statistics items set in a 四年级 classroom
- **severity**: minor
- **category**: data-integrity
- **affected**: `hjb-primary-ds-v1-p5-099`, `-102`, `-117`, `-124`, `-240` — 5 items
- **evidence**:
  > `p5-240` (grade P5, topic 统计表达与综合应用) P: 下面是**四（1）班**第一小组5名同学的身高数据…
- **why**: a 五年级 learner is shown a task framed around a 四年级 class. Cosmetic, but it is a reliable tell that items were lifted from a 四年级 pool, which corroborates F9.
- **fix**: rewrite the class label to 五（1）班.

### F17 — Miscellaneous item-level issues found in the 332 read
- **severity**: minor
- **category**: pedagogy / notation
- `p4-115` option D: 「直径是半径的2倍，所以半径是直径的一半，这句话在**任何圆中**都正确。」 is marked false on the grounds that 同圆或等圆 must be stated — but "在任何圆中" already scopes the claim to a single circle, so D is arguably true and the item has a second defensible answer. Reword D to 「不同的两个圆中，直径也一定是半径的2倍」.
- `p3-074`: 「竖式计算 407 × 5 时，十位上的 0 × 5 得 0，这个 0 应该写在积的（ ）位上」 A `"十"`. The column answer is right, but the explanation's 「写在积的十位上，**不能省略**」 is misleading — 407×5 = 2035, whose 十位 is **3**, because the carry from 7×5=35 lands there. Use a carry-free example (e.g. 304×2 = 608) or drop 「不能省略」.
- `p4-241` invents a non-existent rounding rule 「五舍六入」 in order to have 小马虎 misuse it; the key (3.5) is correct but introducing a fake rule to 四年级 learners risks teaching it.
- `p1-128` A `"连减"` — correct, but 沪教版一年级第二学期 names this method **平十法**; `acceptedAnswers` should include 平十/平十法/分拆减数.
- `p6-027` explanation ends 「整体相同，比较分子即可」 without the 通分 precondition that the preceding sentence supplies. Reword to 「通分后分母相同，比较分子即可」.
- `p3-004` uses fullwidth operators (`456－200＋1`) while the rest of P3 uses halfwidth (`456 + 198`). Normalise.

### F18 — Things I checked and found clean (so they are not re-litigated)
- **Range skeleton `下面哪个数比#大，比#小？` (task 3): CLEAN.** All 5 instances (`p1-043`, `-058`, `-088`, `-139`, `-154`) verified programmatically: exactly one option lies strictly between the bounds in every case, and the key matches it. No blocker.
- **All currency word-problem arithmetic: CLEAN.** 18 元角分 computations recomputed in 分 (`p2-024/025/026/027/030/032/033/036/037/039/040/041/042/045/046/132`, `p4-165`, `p5-009/016`, `p3-179/181/184/186/192`, `p4-171`) — every key correct. The currency defects are confined to option composition (F5) and denominations (F6).
- **All fraction arithmetic: CLEAN.** 60 rational chains evaluated exactly; the 7 flags were 带分数 notation (`2又1/3=7/3`), deliberate distractors (`p5-183`), and a truncated decimal (`2.5/10=1/4`). No fraction errors found.
- **All geometry formulas: CLEAN.** 101 distinct formula statements extracted and checked — 梯形/三角形/平行四边形面积, 长方形/正方形周长, 长方体表面积与体积, 正方体表面积, 圆面积与周长, 扇形面积与弧长, 圆柱表面积与体积, 圆锥体积. All correct, all with correct units.
- **Grade placement P1–P4 and P6-上: authentic 沪教版.** P4-上 (复习与提高/数与量/分数的初步认识(二)/整数的四则运算/几何小实践/整理与提高) and P4-下 (复习与提高/小数的认识与加减法/统计/几何小实践/整理与提高) map onto the 沪教版四年级 教材目录 unit-for-unit; P6-上 (数的整除/分数/比和比例/圆和扇形) maps onto 沪教版六年级第一学期 chapter-for-chapter.
- **P6 有理数 / 一元一次方程 / 二元一次方程组 / 线段与角 / 简单的代数式 are NOT 超纲.** 沪教版 runs on 五四学制, so 六年级 is 初中预备; 沪教版六年级第二学期 第五章 有理数, 第六章 一次方程(组)和一次不等式(组), 第七章 线段与角的画法, 第八章 长方体的再认识 place all of this in 六年级 by design. Against 《义务教育数学课程标准（2022年版）》 these sit in 第四学段(7–9年级), so a naive 课标 check will flag them — **that flag would be wrong for 沪教版 and must be suppressed.** The real risk is routing: if a 人教版/北师大版 六年级 learner is ever served `hjb-primary` P6, they will meet 有理数 and 二元一次方程组 two years early. Gate P6 content on `publisher == MAINLAND_HJB`.
- Likewise **扇形面积与弧长 at P6** is authentic 沪教版六上第四章, not 超纲, even though 人教版 defers 弧长/扇形面积 to 九年级.

---

## Slice health verdict

**Not shippable as-is, but much closer than the corpus average.** The mathematics is overwhelmingly sound — 1044 arithmetic chains, 60 fraction chains and 101 geometry formulas all verified clean, every currency computation correct, and 1459 distinct prompt skeletons across 1500 items (1.03x reuse, zero exact duplicates) makes this the highest-variety slice in the corpus by a wide margin. The pre-scan's two negative signals for this slice — one arithmetic error and eight zh-Hant leaks — are both false positives, and 24 of its 26 `answerInPrompt` flags are benign.

The blocking defects are narrow and fixable: **10 items** carry a wrong or non-unique answer key (F1–F5), and the dominant pattern is a **distractor that is accidentally also true** — six MC items where a correct learner is marked wrong and then shown an explanation asserting their answer was impossible. Two more (F2, F4) ship explanations containing equations that do not hold. Six P5 items render raw LaTeX (F10). All 10 are point fixes; the systemic fix is a build-time gate asserting exactly one option satisfies the stem's predicate for every machine-checkable MC family, which would have caught all six of F5 and both money-composition errors.

Two structural problems need a product decision rather than a content edit. First, **P1's 学习习惯 topic is half classroom-etiquette items** (F7) — 10 items with no mathematical demand, three of which require a 一年级 pupil to type a full sentence; these should not be in a graded bank. Second, **the curriculum spine is not consistently 沪教版** (F9): P5-下 and part of P6-下 sit on a 人教版 spine, so 因数倍数, 分数 and 长方体体积 are each taught twice, ~40 items are near-duplicates across the two placements, and 比和比例/圆和扇形 exist as duplicate chapters in both P6 semesters. This is *not* a 课标 超纲 — nationally the placement is legal — but it is wrong for 沪教版 and internally redundant, and it must not be reported as 超纲. Conversely, P6's 有理数/一元一次方程/二元一次方程组 correctly reflect Shanghai's 五四学制 and should be left alone, with routing gated on publisher.

Fix F1–F5 and F10 (10 items) plus F6's three currency items before release; treat F7, F9, F11 and F12 as the next content sprint.
