# 北师大版小学数学（bnu-primary，P1–P6，3000题）内容审读报告

## Coverage

- **items read in full (prompt + options + answer + explanation): 225 of 3000**
  - P1 38 · P2 22 · P3 23 · P4 44 · P5 54 · P6 44
- **items covered by programmatic whole-slice checks: 3000 of 3000** (see method)
- **method**
  1. *Whole-corpus deterministic passes (3000/3000):* v1↔v2 prompt/skeleton overlap;
     within-slice exact + near-duplicate detection; arithmetic-chain evaluation of every
     `a=b=c` equality in prompt+explanation (3028 chains, 1680 cross-segment comparisons);
     answer-vs-explanation numeric consistency; number-magnitude-vs-grade caps;
     number+unit realism ranges; concept/terminology-vs-BNU-volume leak scan (12 term
     families); class-label («四（1）班») vs item grade; `acceptedAnswers` corruption scan;
     LaTeX/English/Traditional-character scan; figure-reference scan.
  2. *Whole-cluster machine verification:* 68 rectangle perimeter/area items, 24
     cuboid surface-area/volume items, 14 circle/annulus items, 18 平均数 items,
     2 fraction-probability items, all 7 day-of-week items (checked against the real
     Gregorian calendar with `Date.UTC`), 8 三视图 minimum-cube items (brute-forced).
  3. *Full enumeration + hand reading* of every item flagged by the pre-scan
     (66 `answerInPrompt`), every item containing 星期 (11), every 找规律 item (23),
     every three-view 最少几个小正方体 item (8), and the whole 五下「数据的表示和分析」
     unit head (10).
  4. *Stratified random reading:* seeded shuffle, 12 items each from P5/P6 and 9 items
     each from P1–P4 (60 items), plus ~60 targeted items surfaced by the scans above.
- **not covered**
  - I did not read all 2775 unread items; defect rates below are **counts of verified
    defects, not extrapolations**, unless explicitly labelled as an extrapolation.
  - I did not verify the ~44 combinatorics/搭配 items, the 已知/未知 multi-part 综合应用
    items in 数学好玩 units, or most P2 一 items beyond the random sample.
  - I did not audit the `zh` (Traditional) and `en` locale variants of prompts —
    only the `zhHans` strings that mainland learners actually see, plus the flat
    `answer`/`acceptedAnswers` arrays that are shared across all locales.
  - I could not verify rendering (whether `3/5`-style fractions or the two LaTeX
    strings display correctly in the product UI); I judged the source strings only.

---

## Priority answer: v1 vs v2 relationship

**Result: v1 and v2 do NOT overlap and do NOT contradict each other. This is the
healthiest slice in the corpus on variety.**

Measured over all 3000 items:

| measure | value |
|---|---|
| v1 items / v2 items | 1500 / 1500 |
| distinct normalized prompts | **3000 / 3000** (zero exact duplicates, within or across packs) |
| prompt strings present in *both* v1 and v2 | **0** |
| distinct prompt skeletons (digits → `#`) | **2963 / 3000 → 1.01× reuse** |
| skeletons occurring in both v1 and v2 | 21 skeletons, 46 items |
| near-duplicate groups (punctuation/filler-stripped) | 6 groups, 12 items |
| topic coverage | identical: every one of the 97 BNU topics gets an exact 50/50 v1/v2 split |

So the two packs are **complementary, not redundant**: they were generated against the
same 97-topic spine with a 50/50 quota per topic and produced disjoint items. Compare
pep-junior (30.8× skeleton reuse) and bnu-high (19.2×) — bnu-primary at 1.01× is an
order of magnitude better. A learner will not see the same item twice, and there is no
item that ships under two different keys.

The 6 near-duplicate groups are worth one cleanup pass (see F9), and one of them
(`v1-p6-158` vs `v2-p6-158`) shows a **key-formatting** divergence, not a
key-**value** divergence: same question, keys `"5"` vs `"5厘米"`.

---

## Findings

### F1 — 星期几推算答案错误：星期六 + 30 天被算成星期日（应为星期一）
- severity: **blocker**
- category: `answer-key` / `math-error`
- affected: `bnu-primary-ds-v1-p3-091`, 1 item (the only wrong day-of-week key of 7 checked)
- evidence:
  > P: 2025年3月1日是星期六，那么2025年3月31日是星期几？
  > O: ["星期五","星期六","星期日","星期一"]
  > A: "星期日"
  > E: 从3月1日到3月31日经过30天。30÷7=4周余2天。星期六往后推2天是星期日。
- why: 30 ÷ 7 = 4 周余 **2** 天（explanation gets this right），but 星期六往后推 2 天
  是**星期一**，不是星期日（六→日是1天，六→一才是2天）。Verified against the real
  calendar: `new Date(Date.UTC(2025,2,31)).getUTCDay()` → 1 = 星期一; 2025年3月1日 is
  indeed a Saturday, so both the premise and my check agree. The correct answer
  **星期一 is present in the option list**, so a learner who reasons correctly is marked
  wrong and is then shown "星期日" as the authoritative correct answer — the worst
  possible failure mode. Note the identical skeleton is handled **correctly** in
  `v2-p3-100`（2024年6月1日星期六 +30天 → 星期一）, so this is an isolated slip, not a
  systematic rule error.
- fix: change `answer` and `acceptedAnswers` to `星期一`; rewrite the last clause of the
  explanation to 「星期六往后推2天是星期一（六→日是1天，日→一是2天）」.
- (The other 6 day-of-week keys — `v1-p3-099`, `v1-p3-100`, `v2-p3-091`, `v2-p3-100`,
  `v2-p3-101`, `v2-p3-105` — are all correct, **including the 2024 leap-year February
  item**, which handles 29 天 correctly. `v2-p3-099`（某月有5个星期日，1日可能是星期几 →
  星期五、星期六、星期日）is also correct: 31天月首3个星期几各5次、30天月首2个、闰年2月首1个，
  并集正是五/六/日。)
- curriculum note: 推算星期几 **is** within scope — 北师大版三年级上册第七单元「年、月、日」
  includes 看日历 and 有余数除法 is 二下/三上, so mod-7 推算 is a legitimate 拓展 for P3.
  It is not 超纲. All 8 calendar items sit correctly in `p3-upper-calendar-time`.

### F2 — 三视图「最少几个小正方体」整簇不成立：正面图与左面图的高度互相矛盾
- severity: **blocker**
- category: `math-error`
- affected: `bnu-primary-ds-v2-p6-039`（答案错误）；
  `v2-p6-042`, `v2-p6-043`, `v2-p6-045`, `v2-p6-047`, `v2-p6-048`, `v2-p6-049`,
  `v1-p4-197`, `v1-p4-203`（题设几何上不可能）。**9 items verified broken; 1 of the
  10 three-view items checked (`v1-p6-043`) is sound.**
- evidence:
  > `v2-p6-049`: 从正面看是2个小正方形左右并排，从上面看是2个小正方形左右并排，
  > 从左面看是2个小正方形上下排列。这个立体图形最少由几个小正方体搭成？ A: "3个"
  >
  > `v2-p6-039`: 从正面看是 4 个小正方形排成两行两列，从上面看是 4 个…两行两列，
  > 从左面看也是 4 个…两行两列。最少需要多少个小正方体？ A: "4 个"
  > E: 可以搭成 2×2×1 的长方体，即底层 4 个，没有第二层，共 4 个。
- why: 正面图和左面图**共用竖直（高）轴**。`v2-p6-049` 的正面图是「左右并排」→ 最大高度
  为 1 层；左面图是「上下排列」→ 最大高度为 2 层。两者不可能同时成立，任何搭法都不满足题设，
  所以「3个」无从谈起。同样的矛盾出现在 `v2-p6-042/043/045/047/048` 和 `v1-p4-197/203`。
  `v2-p6-039` 题设自洽，但答案错：上面看 2×2 说明 4 个位置都有；正面看两行说明**每一列**
  都要达到 2 层；左面看两行说明**每一排**都要达到 2 层。穷举 3⁴ 种高度分布，最小值是
  **6 个**（例如高度矩阵 [[1,2],[2,1]]），不是 4 个；解析里的 2×2×1 长方体从正面看只有
  2 个小正方形，与题设的「两行两列」直接冲突。
- 系统性根因：出题者把「正面图」当成只给宽度、把「左面图」当成只给高度，忽略了两者共享高度轴。
  这解释了为什么 `v2-p6-047` 的答案 5 恰好等于「无视正面图高度」时的答案。
- fix: 整簇重写。规则：设俯视图占位矩阵 h[x][y]（层数），正面图第 x 列高 = maxᵧ h[x][y]，
  左面图第 y 列高 = maxₓ h[x][y]；出题前必须校验
  `max(正面图各列高) == max(左面图各列高)` 且 `正面图列数 == 俯视图列数`、
  `左面图列数 == 俯视图行数`。`v2-p6-039` 立即把答案改为 **6个**，解析改为
  「对角放两摞2层、另两格各1层」。`v1-p6-043` 可作为正确范例保留。

### F3 — 「改错题」的错误答案与正确答案相同，题目自相矛盾
- severity: **blocker**
- category: `math-error`
- affected: `bnu-primary-ds-v2-p4-149`, 1 item
- evidence:
  > P: 在计算小数加减法时，小马虎把5.4+3.26算成了5.4+3.26=8.66，他忘了把小数点对齐。
  > 正确的计算结果应该是______。
  > A: "8.66"
- why: `5.4 + 3.26 = 8.66`（computed）。题干把 8.66 说成是「没对齐小数点」的错误结果，
  又把 8.66 当作正确答案。学生无论怎样理解都会困惑：题目声称的错误值就是标准答案。
  真正的「不对齐」典型错误是把 5.4 当作 0.54 或把末位对齐得 3.80 / 8.30。
- fix: 把题干的错误结果改成真正的错误值，例如「小马虎末位对齐，算成 3.26 + 0.54 = 3.80」，
  正确答案仍为 8.66；或换一组数（如 6.7 + 2.35，错误值 9.02 → 正确 9.05）。

### F4 — 自指悖论题：判定「只有一人完全正确」时把课本标准算法判为错误
- severity: **major**
- category: `pedagogy` / `math-error`
- affected: `bnu-primary-ds-v2-p6-140`, 1 item
- evidence:
  > 步骤二：小华说：「半径是6厘米，所以圆的面积是3.14×6²=113.04平方厘米。」
  > 步骤三：小丽说：「我不同意小华的算法，因为3.14是圆周率的近似值，直接用3.14计算会
  > 得到近似面积，不是精确值。」
  > 步骤五：小红说：「我检查了大家的说法，发现只有一个人的说法是完全正确的，其他人都有错误。」
  > A: "小丽"
- why: 两重问题。(1) **逻辑自指**：若小丽是唯一完全正确的人，则小红「只有一人完全正确」
  这句话本身也是正确的 → 完全正确的人变成两个 → 小红的话又变成错的 → 矛盾。题目无解。
  (2) **教学导向有害**：小华用的 `3.14×6²=113.04` 正是北师大版六上「圆的面积」的标准算法与
  标准答案；把它判为「不完全正确」会让学生认为课本方法是错的。「3.14是近似值」是正确的常识，
  但不构成对小华解法的否定。
- fix: 删掉小红这一步（消除自指），并把小华的说法改成一个**真正的**错误（例如
  「面积是3.14×6=18.84」，把 r² 写成 r），答案改为小华；或把设问改为
  「谁的说法**不完整**？」并明确要求答「小华的结果是近似值，应写成约113.04平方厘米」。

### F5 — 超纲：概念/术语出现在北师大教材尚未编排的年级
- severity: **major**
- category: `curriculum-alignment`
- affected: **17 verified items**
  - 圆的面积 / π 用于 P5：`v1-p5-084`（五上「组合图形的面积」，含半圆 + π取3.14）
  - 百分数用于 P5：`v2-p5-243`（五下「数学好玩与总复习」，问「多百分之几」）
  - 质数 / 合数用于 P4：`v1-p4-117`, `v1-p4-120`（四上「可能性」）
  - 直径 / 半径 / 圆心用于 P1–P4：`v2-p1-175`（一下「观察物体」，「高和底面直径相等的圆柱」）、
    `v2-p2-047`, `v2-p2-052`（二上「图形的变化」，「圆形沿任意一条直径对折」）、
    `v2-p4-026`（四上「线与角」，解析用「圆心角」）
  - 对角线 / 等腰·等边三角形 / 底边上的高 / 轴对称图形用于 P2 上：`v2-p2-052`,
    `v2-p2-055`（等边三角形、椭圆形）, `v1-p2-049`, `v1-p2-055`（平行四边形+等腰三角形+
    轴对称图形），`v2-p2-053`（「对角线」出现在解析里）——二上早于二下「认识图形」
    （平行四边形）和四下「认识三角形和四边形」（等腰/等边）、五上（三角形的高）
  - 除数是小数的除法用于 P4：`v1-p4-180`（4.8÷0.6）、`v1-p4-188`（2.4÷0.35），
    均在四下「小数乘法」单元内
- evidence:
  > `v2-p2-052`（二年级上册）：下面哪个图形沿虚线对折后两边不能完全重合？
  > A. 正方形沿对角线对折 B. 圆形沿任意一条直径对折
  > C. 平行四边形沿一条对角线对折 D. 等腰三角形沿底边上的高对折
  >
  > `v1-p5-084`（五年级上册）：一个组合图形由一个正方形和一个半圆组成，正方形边长8米……
  > （π取3.14） A: "89.12"
- why: 北师大版编排：**圆**在六年级上册第一单元；**百分数**在六年级上册第四单元；
  **质数与合数**在五年级上册第三单元「倍数与因数」；**平行四边形/对角线**在二年级下册
  第六单元及四年级下册第二单元；**三角形的高**在五年级上册第四单元；**小数除法**在
  五年级上册第一单元。`v2-p2-052` 一题同时用到对角线、直径、等腰三角形、底边上的高、
  轴对称图形五个未学概念，二年级学生无法作答。所有这些题的**数学答案本身都是对的**
  （`v1-p5-084` 的 64 + 3.14×4²÷2 = 89.12 已验算），问题纯粹是学段错配。
- fix: 按单元下沉/上移：`v1-p5-084` → 六上「圆」；`v2-p5-243` → 六上「百分数的应用」；
  `v1-p4-117/120` 把「质数/合数」改成「单数/双数」或「大于3的数」；`v2-p2-052` 改为
  「长方形左右对折 / 正方形沿对角线对折 / 平行四边形左右对折」并去掉「直径」「等腰」
  「底边上的高」；`v2-p1-175` 改为「从正面看是正方形、从上面看是圆形，这是什么？」并删去
  「高和底面直径相等」；`v1-p4-180/188` → 五上「小数除法」。

### F6 — 欠纲：单元的核心新知几乎没有题
- severity: **major**
- category: `curriculum-alignment`
- affected: 4 units（合计 124 items 的教学目标覆盖不全）
- evidence（counts over the whole slice, 3000/3000 scanned）:

  | 单元 | 单元核心新知 | 命中题数 |
  |---|---|---|
  | 四下「数据的表示和分析」(30题) | 折线统计图 | **0 / 30**（全片仅13题提到，且多为选项干扰项） |
  | 五下「数据的表示和分析」(28题) | 复式条形统计图 / 复式折线统计图 | **2 / 28** 和 **0 / 28**（全片0题） |
  | 三上「年、月、日」(30题) | 24时计时法 | **0 / 30**（全片仅1题） |
  | 五下「确定位置」(28题) | 用方向和距离确定位置 | 18/28 尚可；但四上「方向与位置」的数对只有 **3 / 32** |
- why: 北师大版四下「数据的表示和分析」的两个主课时是「栽蒜苗（一）（二）」——
  1格表示多个单位的条形统计图 + **折线统计图**；五下同名单元的全部新知是**复式**条形/折线
  统计图。现在这两个单元里大量题目其实是四下平均数与单式条形统计图的重复，五下单元里
  6 道题连班级名都还写着「四（1）班」（见 F8），说明是从 P4 单元复制过来的。三上「年、月、日」
  缺了「一天的时间」（24时计时法）这一必考课时。
- fix: 为每个单元补齐核心课时配额：四下补 ≥8 题折线统计图（含「从图中读出上升/下降最快的
  一段」）；五下补 ≥10 题复式条形/复式折线（含「两组数据比较」的读图与作图描述）；
  三上补 ≥6 题 24时计时法（普通计时法 ↔ 24时计时法互化、经过时间计算）；
  四上补数对题至 ≥8 题。

### F7 — `acceptedAnswers` 里混入机器翻译残渣（`term-XXXX` 占位符）与繁体变体
- severity: **major**
- category: `data-integrity`
- affected: **1019 items（34.0%）含 `term-XXXX` 占位符；616 items 含英文单词；
  813 items 含繁体字。全片 3000/3000 扫描所得，非抽样外推。**
- evidence:
  > `v1-p4-035` acceptedAnswers 包含：
  > `"not opposite. incorrect in at308×20 of product correspond term-8be5 is 6160,
  > other term-6f0f write term-672b-term-5c3e of 0. correct Calculate: 308×25, ..."`
  >
  > `v1-p2-021`（一支铅笔8角）acceptedAnswers 包含 `"7 angle"` — 人民币单位「角」被
  > 当成几何「角」翻译。
  >
  > `v1-p1-029` acceptedAnswers 包含 `"8thousand term-514b"`（8千克）。
  >
  > `v2-p4-141` acceptedAnswers 包含 `"② multiply method result combine term-5f8b"`。
- why: `answer` 和 `acceptedAnswers` 在运行时 schema 里是**扁平的字符串/字符串数组**
  （不像 `prompt`/`explanation` 有 `{en, zh, zhHans}` 三语结构，见 `schema-sample.json`），
  所以这些垃圾串和整套判分用的正确答案混在同一个数组里。直接后果有二：
  (1) 判分逻辑若做「包含匹配」，`term-` 串可能与学生输入产生意外匹配；
  (2) 任何把 acceptedAnswers 回显给学生/教师（错题本、家长报告、题目导出）的界面都会
  漏出乱码。这与预扫描已确认的 pep-primary/pep-junior 的 `answer` 英文问题**不是同一处**
  ——那是 `answer` 字段，这是 `acceptedAnswers` 数组，且本片 `answer` 字段基本干净
  （0 个 `term-` 占位符，仅 2 个含英文，1 个含繁体）。
- fix: 生成管线里对 `acceptedAnswers` 只保留 zh-Hans 变体；过滤规则：丢弃匹配
  `/term-[0-9a-f]{4}/` 或含 ≥2 个英文单词的条目；繁体变体若要保留，应移到独立的
  `acceptedAnswersZhHant` 字段而不是混入同一数组。

### F8 — 66 个 `answerInPrompt` 告警：7 个是真的送分，56 个是误报
- severity: **major**（送分题）/ n/a（误报）
- category: `pedagogy`
- affected: 见下逐条 id
- **真·送分（答案在题干里被当作事实陈述，无需任何思考）—— 7 items：**
  - `bnu-primary-ds-v1-p1-137` — 「先把6分成2和4，8+2=10，10+4=**14**。请填空：8+6=____」→ 答案 14
  - `bnu-primary-ds-v1-p1-050` — 「把下面的水果按**「是不是红色」**分成两类……分类标准是______」→ 答案「是不是红色」
  - `bnu-primary-ds-v1-p2-077` — 「小明的文具盒长大约**20厘米**。这个长度用什么单位表示比较合适？请写出完整长度。」→ 答案「20厘米」
  - `bnu-primary-ds-v1-p5-011` — 「……得到的结果是**18**。他检查后发现两数的小数点同时右移一位，**商不变**。正确的商是多少？」→ 答案 18（题干已把结论说完）
  - `bnu-primary-ds-v2-p1-128` — 「时针指向**12**，分针指向12。这是______时。」→ 答案 12
  - `bnu-primary-ds-v2-p1-202` — 「图形：**长方形1个，正方形1个，三角形3个，圆2个**。」→ 答案逐字相同
  - `bnu-primary-ds-v2-p5-134` — 「先通分得到 8/**20** + 5/20……请问他通分时用的公分母是多少？」→ 答案 20
- **图转文造成的结构性送分（原题依赖插图，改写成文字后答案必然出现在题干）—— 3 items：**
  `bnu-primary-ds-v2-p1-161`、`bnu-primary-ds-v2-p1-170`、`bnu-primary-ds-v1-p1-167`
  （「前面有一扇**红色的门**……小丽站在房子的前面，她能看到______」）
- **误报 —— 56 items**，两类：
  - **题干显式给出候选词的填空**（中国小学卷面标准格式「填『多』『少』或『同样多』」），
    答案当然出现在题干里，但学生仍需判断：`v1-p1-020`, `v1-p1-023`, `v1-p1-032`,
    `v1-p2-053`, `v1-p2-056`, `v1-p2-210`, `v1-p4-119`, `v1-p4-125`, `v1-p4-128`,
    `v1-p5-092`, `v1-p5-095`, `v1-p6-116`, `v1-p6-131`, `v1-p6-212`, `v1-p6-214`,
    `v1-p6-216`, `v2-p2-086`, `v2-p4-119`, `v2-p6-131`, `v2-p6-182`, `v2-p6-186` 等
  - **数值巧合或子串误匹配**：`v2-p3-089`（6×( )=480，答案 80 只是「480」的子串）、
    `v2-p4-208`（答案「4厘米」，题干有「24厘米」）、`v2-p5-222`（答案「5千克」，题干有
    「15千克」）、`v2-p6-056`（0.65→65%）、以及一批平均数恰好等于某个数据的题
    （`v1-p4-226` 132、`v1-p5-224` 35、`v1-p5-226` 45、`v2-p4-234` 140、`v2-p5-224` 20、
    `v2-p5-228` 10、`v2-p5-232` 140、`v2-p5-234` 17 —— 全部经计算验证答案正确）
- fix: 只需修 7 道真送分题：`v1-p1-137` 改为「用凑十法计算 8+6，先把6分成2和4，8+2=10，
  10+____=____」；`v1-p2-077` 删去题干里的「20」；`v1-p5-011` 删去「得到的结果是18」
  或删去「商不变」这句提示；`v2-p1-202` 需要配图，否则删除；其余同理。
  同时把检测器改成：仅当 `answer` 不是题干列出的候选项、且不是题干数字的子串时才告警
  ——现有实现的误报率是 **56/66 = 85%**。

### F9 — 键值格式在近似重复题之间不一致
- severity: `minor`
- category: `answer-key`
- affected: `v1-p6-158`/`v2-p6-158`、`v1-p6-160`/`v2-p6-157`、`v1-p3-185`/`v1-p3-193`、
  `v1-p3-062`/`v2-p3-064`、`v1-p3-004`/`v1-p6-034`、`v1-p6-163`/`v2-p6-163`
  — 6 groups / 12 items（全片仅有的近似重复）
- evidence:
  > 同一题干「一个圆锥的体积是47.1立方厘米，底面半径是3厘米，它的高是多少厘米？」
  > `v1-p6-158` A: `"5"` ｜ `v2-p6-158` A: `"5厘米"`
- why: 数学都对（47.1 = ⅓×3.14×3²×h → h=5，已验算），但同一道题在两个 pack 里一个要求
  带单位一个不带。若判分做严格串比较，学生答「5厘米」在 v1 会被判错、答「5」在 v2 会被
  判错。`v1-p3-185`/`v1-p3-193` 则是 v1 内部的重复（同一张卷子里同一道载重题出现两次）。
- fix: 统一填空/简答题的单位规则（建议：题干若已写「……是多少厘米？」则 `answer` 不带单位、
  `acceptedAnswers` 同时收录带单位形式），并删去 `v1-p3-185`/`v1-p3-193` 中的一道。

### F10 — 五下统计单元的题目仍带着四年级班级名
- severity: `minor`
- category: `pedagogy`
- affected: 11 items（全片扫描）：`v1-p5-223`, `v1-p5-229`, `v1-p5-236`,
  `v2-p5-223`, `v2-p5-227`, `v2-p5-236`, `v1-p6-073`, `v1-p6-099`, `v2-p6-073`,
  `v1-p3-224`, `v2-p2-014`
- evidence:
  > `v1-p5-229`（P5）：下面是**四（2）班**第一小组同学的身高数据……
  > `v2-p2-014`（P2）：**一（2）班**图书角原来有故事书45本……
- why: 五年级学生做题时看到「四（2）班」会出戏；更重要的是这 6 道 P5 题连内容都是四下水平
  （单式条形统计图 + 平均数），与 F6 的欠纲判断互相印证——它们是从 P4 单元整体搬运过来的。
  另 205 道点名年级/班级的题里其余 194 道是一致的，说明这是复制残留而非普遍问题。
- fix: 把班级名改成与题目年级一致（五（1）班 / 六（2）班），并按 F6 用复式统计图题替换其中
  6 道 P5 题。

### F11 — 文字描述的图形几何上不成立或欠定
- severity: `minor`→`major`（逐题不同）
- category: `pedagogy`
- affected: 已核实 4 items：`v1-p5-087`, `v1-p5-078`, `v2-p1-204`, `v2-p1-247`
  （全片 64 道题在文字中引用「下图/如图/统计图/下面的图形」，而 schema 中**没有任何
  图片字段**，故这 64 题全部依赖散文描述）
- evidence:
  > `v1-p5-087`：一个组合图形由一个长方形和一个梯形组成，长方形长15米、宽8米，
  > 梯形上底8米、下底12米、高5米，**梯形的一条腰与长方形的一条边完全重合**。
  >
  > `v2-p1-204`：用两个完全一样的三角形可以拼成一个什么图形？请写出两种不同的拼法。
  > A: "正方形，平行四边形"
  >
  > `v2-p1-247`：第一层放3块，第二层放2块，第三层放1块……如果搭4层，第四层应该放几块？
  > A: "0块"
- why: `v1-p5-087` 的梯形腰长并未给出，说它与长为15或宽为8的边「完全重合」与上底8、下底12、
  高5 的梯形不相容——描述无法还原成一个确定图形（面积 120+50=170 的算术本身是对的）。
  `v1-p5-078` 说「挖去一个边长4厘米的正方形（正方形的**一个顶点**在长方形内部）」，
  按字面只有部分正方形在长方形内，挖去面积不等于 16。`v2-p1-204` 的「两个完全一样的三角形」
  只有在等腰直角三角形时才能拼出正方形，题干未作限定，答案「正方形」不成立（一般三角形
  只能拼出平行四边形）。`v2-p1-247` 答「第四层放0块」自相矛盾——放 0 块就不存在第四层。
- fix: 组合图形题必须给出可还原的完整边长关系（或配图）；`v2-p1-204` 加上「两个完全一样的
  **等腰直角**三角形」或把答案改成「长方形、平行四边形」并说明需直角三角形；
  `v2-p1-247` 改问「照这样搭下去，最多能搭几层？」（答 3 层）。

### F12 — 分数记法不统一：139 题用 `3/5`，2 题用裸 LaTeX
- severity: `minor`
- category: `notation`
- affected: `bnu-primary-ds-v2-p5-062`, `bnu-primary-ds-v2-p5-131`（2 items）
- evidence:
  > `v2-p5-062` A: `"\frac{3}{5}"`（acceptedAnswers 里才是 `"3/5"`）
  > `v2-p5-131` P: `小明做一道分数加法题：\(\frac{3}{8} + \frac{1}{4}\)。`
- why: 全片 139 道题的分数写成 `3/5` 形式、61 道用「几分之几」中文表述，只有这 2 道用
  LaTeX。若前端不渲染数学，学生看到的是字面的反斜杠；`v2-p5-062` 的 `answer` 就是
  `\frac{3}{5}`，会被当作 `correctAnswer` 原样显示。
  另需注意 `9/10÷3/4`（`v1-p5-190` 解析）这种无括号斜杠写法在纯文本下有歧义。
- fix: 统一为 `3/5` 内联写法（或全部改 LaTeX 并确认渲染器）；除号两侧的分数加括号：
  `(9/10) ÷ (3/4)`。

### F13 — 术语：「大10倍 / 扩大10倍」不符合 2011 版以后的课标表述
- severity: `minor`
- category: `terminology`
- affected: `bnu-primary-ds-v2-p5-009`（answer `"大10倍"`，acceptedAnswers `"扩大10倍"`）；
  同类表述另见解析用语，全片 `扩大.{0,3}倍` 命中较少，未逐条统计
- evidence:
  > P: 把被除数17.5错看成了175，得到的商比正确的商（ ）。
  > A: "大10倍"  acceptedAnswers: ["扩大10倍","是原来的10倍","term-592710times"]
- why: 现行说法是「**扩大到原来的10倍**」。「大10倍 / 扩大10倍」在汉语数学表述中歧义
  （「多10倍」＝11倍），2011 版课标起教材已统一改为「扩大到原来的n倍 / 缩小到原来的
  几分之一」。同一条 acceptedAnswers 里「是原来的10倍」才是正确表述。
- fix: `answer` 改为「扩大到原来的10倍」，acceptedAnswers 保留「是原来的10倍」「大10倍」
  作为宽松接受，并全片替换「扩大n倍」→「扩大到原来的n倍」。

### F13b — 出题者的备注漏进了学生看到的选项
- severity: `minor`
- category: `language`
- affected: `bnu-primary-ds-v1-p2-049`（全片扫描后确认只此 1 题）
- evidence:
  > O: ["长方形","正方形","**平行四边形（非特殊）**","等腰三角形"]  A: "平行四边形（非特殊）"
- why: 「（非特殊）」是出题者写给自己的限定备注（排除菱形/矩形），不是中国小学卷面会印出的
  文字；二年级学生读不懂，而且 `answer` 也必须逐字带上这个括号才判对。
- fix: 选项改为「平行四边形」，把限定条件放进解析（「这里指一般的平行四边形，不包括
  长方形、正方形和菱形」）。

### F14 — 数据完整性旁注：`curriculumTrack` 对所有大陆内容都写成 `MAINLAND_PEP_HIGH`
- severity: `minor`
- category: `data-integrity`
- affected: 全部 3000 items（并非本片独有——9 个 slice 的样本记录都是这个值）
- evidence:
  > `schema-sample.json` 里 bnu-primary 的 P1 首题：
  > `"curriculumTrack": "MAINLAND_PEP_HIGH", "publisher": "MAINLAND_BNU", "grade": "P1"`
- why: 这是 `types/index.ts` 里写死的字面量类型（一个覆盖全大陆内容的伞形轨道名），
  真正区分出版社的是 `publisher` 字段，所以**不是逐题的数据错误**。但一条北师大一年级
  的题带着字面写作 "PEP_HIGH" 的轨道名，会误导路由、埋点和任何按 track 过滤的报表。
- fix: 重命名为 `MAINLAND`（或按 `MAINLAND_PEP` / `MAINLAND_BNU` / `MAINLAND_HJB` 拆分），
  这是代码改动，不是内容改动。

---

## 已验证为**正确**的部分（避免下游重复排查）

- **算术与答案键总体极准。** 全片 3028 条等式链、1680 次跨段比较，扣除解析器伪报后
  **没有发现一处算错**。手工复算的簇全部通过：24 道长方体表/体积（如 `v1-p5-144`
  游泳池四周+底面 = 250+100+40 = 390 ✓、`v2-p5-178` 60000cm³ = 0.06m³ ✓）、
  14 道圆/圆环（`v1-p6-001` 3.14×(25−16)=28.26 ✓、`v2-p6-227` 比例尺1:500 → 314m² ✓）、
  18 道平均数、68 道长方形周长/面积、`v2-p4-165` 三角形第三边 4–12 ✓、
  `v1-p4-140` 四舍五入到万位区间 95000–104999 ✓、`v1-p4-129` 除数看错还原 774÷36=21…18 ✓。
- **`answer` 与 `explanation` 的数值一致性 2997/3000**（3 例是多部分答案的解析差异，非错误）。
- **单位量级全部合理**：按 19 个单位的合理区间扫描 3000 题，无一处荒谬量级
  （没有「小孩背500千克」这类问题）。元/角/分、千克/克/吨、米/厘米/千米、升/毫升 用法均
  符合大陆小学习惯；`v2-p2-185`「家到学校约2千米」、`v2-p2-083`「大树高约8米」、
  `v2-p2-077`「食指约5厘米」均属实。
- **学段数值上限**：P1 题最大数均在 100 以内、P2 在万以内，无越界。全片唯一的一上数值
  越界是 `v1-p1-019`（一上「比较」里比较 25/22/28 千克，两位数比大小属一下「生活中的数」），
  1 题，`minor`。
- **97 个 topicId 与北师大版单元序列逐一吻合**（一上「生活中的数/比较/加与减(一)/分类/
  位置与顺序/认识图形/加与减(二)/认识钟表」… 六下「圆柱与圆锥/比例/图形的运动/正比例与
  反比例/数学好玩/整理与总复习」），无多余、无缺失 topic，v1/v2 各占一半。
  北师大特有的编排（一上先立体图形、一下再平面图形；三下才认识分数；五上倍数与因数）
  都被正确遵守。
- **文化与语境自然**：人名（小明/小红/小丽/小宇/小雯…）、场景（跳绳、植树节、图书角、
  升国旗、数学好玩、四（1）班）、货币「元/角/分」、气温「℃」用法均为大陆小学惯例，
  无港台用语渗透（`answer` 字段仅 1 例繁体、2 例英文）。
- **模板重复度是全语料最低的**：2963 个骨架 / 3000 题（1.01×），无一对完全重复的题干。

---

## Slice health verdict

这一片是本轮大陆语料里质量最高的：题干零重复、骨架复用率 1.01×、97 个单元与北师大版
编排逐条吻合、答案键在数千次机器复算中几乎全对、单位与语境完全符合大陆小学课堂。
**但它现在还不能原样上线**，原因是三处会直接把正确答案判错的硬伤：`v1-p3-091` 的星期几
答案错误（且正确选项就在选项里）、六上/四下三视图簇里 9 道题几何上不成立（含 `v2-p6-039`
最少块数应为 6 而非 4）、以及 `v2-p4-149` 把错误值和正确值写成同一个数。这 11 道题必须
先修或先下架。除此之外，34% 的题在 `acceptedAnswers` 里混着机器翻译残渣（`term-XXXX`、
"7 angle"），这是判分与任何答案回显界面的隐患，应在发布前用一条过滤规则清掉。
中期还需补两块课标缺口——四下折线统计图、五下复式统计图在 58 道相关题里几乎为零，
三上 24 时计时法完全缺席——以及把 17 道超纲题（P5 的圆与百分数、P4 的质数合数与小数除法、
P2 的对角线/等腰三角形/直径）下沉到正确年级。修完 F1–F3 与 F7 即可发布；F5、F6 建议排入
下一个内容迭代。
