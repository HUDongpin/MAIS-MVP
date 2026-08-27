# 人教版 PEP — pep-primary (P1–P6) + pep-junior (S1–S3) 数学内容审核

Auditor slice: `pep-primary` (1200) and `pep-junior` (1200). Reference:
《义务教育数学课程标准（2022年版）》 and the 人教版 volume/unit sequence
(一年级上册 … 九年级下册).

## Coverage

**Method.** Both slices were loaded and clustered by digit-normalised prompt
skeleton (`\d+ → #`, grade-scoped). Every cluster representative was read in
full (prompt + options + answer + acceptedAnswers + explanation). Answer keys
were then **recomputed programmatically for whole clusters** with `node`,
not eyeballed — parsers per skeleton, compared against `answer`, with
side-checks for distractor correctness, option duplication, triangle
inequality, integrality, reducibility and explanation/answer agreement.

| slice | clusters read | keys independently recomputed | arithmetic mismatches found |
|---|---|---|---|
| pep-junior | **35 / 35** (100% of skeletons) | **1200 / 1200** | **0** |
| pep-primary | **158 / 158** (100% of skeletons) | **1143 / 1200** | **0** |

Per grade, keys recomputed by the consolidated pass: P1 149/200, P2 199/200,
P3 200/200, P4 198/200, P5 197/200, P6 200/200 (the P1 deficit is the 立体图形
identification items, which contain no arithmetic); S1 400/400, S2 400/400,
S3 400/400.

**Not covered / not machine-checkable.** 57 pep-primary items — 51 of them P1
立体图形 naming ("下面描述的是哪种立体图形：…"), the rest one-off story wordings —
were read as cluster representatives only; their "keys" are shape names or
single-step subtractions judged by reading, not computation. Rendering,
diagrams/images (the corpus has none), grader behaviour at runtime, and the
other seven slices are out of scope. I did **not** verify the zh-Hans strings
against a character-level 简繁 converter; the pre-scan's 34 pep-junior
`tradLeak` hits were inspected and are false positives (they are the
`Quadrant IV` English-answer cluster, `pep-junior-v2-s1-k04-sa-*`).

**Notable negative result (checked, NOT a defect — do not re-file).** The 17
P3 items whose fraction key is unreduced (`3/6`, `2/4`) are **correct**: 人教版
三年级上册《分数的初步认识》 precedes 约分 (五年级下册), so the unreduced form is
the intended answer, and no option in any of those items is numerically equal
to the key. Similarly, the 115 pep-primary / 67 pep-junior MC items whose
`answer` string is absent from `options` (pre-scan finding #1) all have an
`acceptedAnswers` entry that *does* match an option — the defect is display
only, grading is unaffected.

---

## Findings

### F1 — Two correct options in the same MC item (internal scaffolding leaked into learner-facing choices)
- severity: **blocker**
- category: `answer-key`
- affected: `pep-junior-v2-s1-k03-mc-008`, `-009`, `-010`, `-011`, `-012`,
  `-020`, `pep-junior-v2-s1-k04-mc-004`, `-030` — **8 items**
- evidence:
  > `pep-junior-v2-s1-k03-mc-008` 两个角组成平角，其中一个角是91°，另一个角是多少？
  > options `["89°","91°","180°","89°（少一步）"]`, answer `"89°"`
  >
  > `pep-junior-v2-s1-k04-mc-004` options `["(2,2)","(-10,2)","(2,4)","(2,2)（少一步）"]`, answer `"(2,2)"`
- why: `89°（少一步）` and `89°` are the same number. The item has two correct
  options, only one of which is the key, so a student who reasons correctly can
  still be marked wrong. `（少一步）` ("one step short") is authoring metadata —
  a note about *why* a distractor was generated — that was written into the
  option text itself. It is visible to learners and it labels the option as
  incomplete, which is also a giveaway on the six items where the annotated
  option is *not* the key.
- fix: strip any `（…）` annotation from option strings at generation time and
  re-run the "no two options numerically equal" invariant over every MC item in
  every slice. For these 8, regenerate the fourth distractor (e.g. for
  `mc-008`: `89°` → key, distractors `91°`, `180°`, `271°`).

### F2 — 11 congruence items specify triangles that cannot exist
- severity: **blocker**
- category: `math-error`
- affected: `pep-junior-v2-s2-k06-sa-018` … `-028` (11 consecutive) — **11 of the
  33 items in this cluster (33%)**
- evidence:
  > `sa-019` 在△ABC和△DEF中，AB=DE=5厘米，BC=EF=25厘米，AC=DF=8厘米。可用哪一种判定说明两个三角形全等？ answer `"SSS"`
  >
  > `sa-028` … AB=DE=14厘米，BC=EF=20厘米，AC=DF=35厘米。
  > Also: 4/23/34, 6/27/11, 7/6/14, 8/8/17, 9/10/20, 10/12/23, 11/14/26, 12/16/29, 13/18/32.
- why: 5+8=13 < 25 — 三角形两边之和必须大于第三边 (人教版八年级上册 11.1.1).
  No triangle has these sides, so "△ABC" and "△DEF" do not exist and the
  question of their congruence is vacuous. This is exactly the misconception the
  三边关系 lesson is meant to prevent, so the item actively teaches the error.
  I verified all 33 items in the cluster: 22 are geometrically valid, 11 are not.
- fix: add a triangle-inequality guard to the side-length generator
  (`a+b>c` for the sorted triple) and regenerate the 11 items. E.g. `sa-019`
  → AB=DE=5, BC=EF=6, AC=DF=8.

### F3 — 有余数除法 item with zero remainder, key omits the remainder the question asks for
- severity: **blocker**
- category: `answer-key`
- affected: `pep-primary-p2-l-fi-128` — 1 item (the only zero-remainder case in a
  46-item cluster)
- evidence:
  > 阅读区有18个材料，每3个装一袋，**可以装几袋，还剩几个**？ answer `"6"`,
  > acceptedAnswers absent, explanation `3x6+0=18，所以结果是6。`
- why: the stem asks two things; the key answers one. Every other item in the
  cluster answers in the form `"6 R 5"` / `6余5`, so a student following the
  established pattern answers `6余0` or `6袋，还剩0个` and is marked wrong. The
  unit is 人教版二年级下册《有余数的除法》, where 余数 must be non-zero for the
  item to exercise the target skill at all.
- fix: constrain the generator to `a % b != 0` for this template; regenerate
  `fi-128` (e.g. 19 个材料，每 3 个装一袋 → `6 R 1`). If a zero-remainder case is
  kept deliberately, the key must be `6 R 0` with `6余0`/`6` both accepted.

### F4 — 有理数加减运算 required at P6 (超纲 by one year)
- severity: **major**
- category: `curriculum-alignment`
- affected: whole cluster `pep-primary-p6-l-sa-151` … `-200` — **50 items**;
  42 start from a negative temperature, **26 require crossing zero**, 16 have a
  negative result
- evidence:
  > `p6-l-sa-151` 气温是-3°C，升高9°C后是多少摄氏度？ answer `6°C`,
  > explanation `-3+9=6，所以新的气温是6°C。`
- why: 人教版六年级下册第一单元《负数》 covers 认识负数、读写、比较大小、在数轴上
  表示 only. 有理数的加减法 is 七年级上册第一章 (1.3). 《课标2022》第三学段 says
  "了解负数的意义，会用负数表示日常生活中的量" — no arithmetic. Asking a P6
  student to evaluate `-3+9` requires the 数轴平移/绝对值 model they have not been
  taught; the explanation just asserts `-3+9=6` and teaches nothing.
- fix: for P6, replace the operation with a comparison/representation task
  ("哪天更冷？把 -3℃、-8℃、2℃ 在数轴上表示并从小到大排列"). Move the arithmetic
  form to the S1 `有理数与数轴基础` topic, where an equivalent cluster already
  exists (`pep-junior-v2-s1-k01-mc-*`).

### F5 — 平面直角坐标系 terminology and negative/zero coordinates used in a 小学 数对 item
- severity: **major**
- category: `curriculum-alignment` + `terminology`
- affected: whole cluster `pep-primary-p6-u-fi-061` … `-mc-060`
  (`pep-primary-p6-upper-coordinate-data`) — **50 items; only 7 are valid at
  primary level** (31 contain a negative coordinate, 21 contain a 0)
- evidence:
  > `p6-u-fi-063` 点A的**横坐标**是-3，**纵坐标**是-2，请写出它的**数对**。 answer `(-3, -2)`
  >
  > `p6-u-mc-051` options `["(-1, -1)","(0, -2)","(-1, -2)","(-2, -1)"]`
- why: two separate problems. (a) 数对 in 人教版五年级上册《位置》 is
  **(列，行)** — both entries are positive integers counted from 1; negative and
  zero values do not exist in that model, so 43 of the 50 items ask for something
  undefined at this grade. (b) 横坐标/纵坐标 is 平面直角坐标系 vocabulary from
  人教版七年级下册 7.1; primary never uses it. The item mixes the primary word
  (数对) with the junior-high concept and the junior-high value range.
- fix: for P6, restrict to positive integers and phrase as 数对（列，行）
  ("小明坐在第3列第5行，用数对表示他的位置"). The signed-coordinate version
  belongs in `pep-junior-s1-lower-lines-coordinates`, which already has the
  象限/平移 clusters.

### F6 — "斜率" (senior-high term) used for 一次函数 at S2
- severity: **major**
- category: `terminology`
- affected: `pep-junior-v2-s2-k09-fi-001` … `-033` — **33 items**
- evidence:
  > 一次函数图象经过点(2,5)和(4,15)，它的**斜率**是____。 answer `5`,
  > explanation `斜率=(15-5)÷(4-2)=5。`
- why: 人教版八年级下册 19.2《一次函数》 defines `y=kx+b` and calls `k`
  「比例系数」/「k 的值」. 斜率 is introduced only in 高中 (人教A版 选择性必修第一册
  《直线的倾斜角与斜率》), where it is defined via 倾斜角 and 正切. Using it at S2
  imports an undefined term and, worse, the "rise over run" formula given here
  is not the definition the student will later be taught.
- fix: rewrite as 「求 k 的值」 or 「求这个一次函数的表达式」; explanation
  「把两点代入 y=kx+b，得 5=2k+b、15=4k+b，两式相减得 2k=10，k=5」 — which also
  raises the item from a plug-in to the intended 待定系数法 exercise.

### F7 — "邻补角" (S1 term) used at P4
- severity: **major**
- category: `terminology`
- affected: `pep-primary-p4-u-fi-078`, `pep-primary-p4-u-fi-100`,
  `pep-primary-p4-u-mc-075` — 3 items
- evidence:
  > 手工桌的角度卡显示一个角为57°，它的**邻补角**是多少度？ answer `123°`,
  > explanation `平角是180°，所以另一个角是180°-57°=123°。`
- why: 邻补角 is defined in 人教版七年级下册 5.1.1《相交线》. 四年级上册《角的度量》
  gives 锐角/直角/钝角/平角/周角 only. The explanation itself silently drops the
  term and falls back to 平角 — proof that the word is not needed and not
  supported by the item's own reasoning.
- fix: use the wording already used by the other 42 items in the same cluster:
  「两个角组成一个平角，其中一个角是57°，另一个角是多少度？」

### F8 — 平均数 taught a full volume early (P3下 vs 人教版四年级下册)
- severity: **major**
- category: `curriculum-alignment`
- affected: `pep-primary-p3-l-sa-151` … `-200` (topic
  `pep-primary-p3-lower-statistics-review`) — **50 items**
- evidence:
  > `p3-l-sa-156` 求8、10、12这三个数的平均数。 answer `10`
  > `p3-l-sa-*` 乐乐三次跳绳成绩是12下、14下、16下，平均每次多少下？
- why: 人教版三年级下册 has 《复式统计表》 only; 平均数 is 四年级下册第八单元
  《平均数与条形统计图》. (《课标2022》 places 平均数 in 第二学段, i.e. 3–4年级, so this
  is a **教材编排 misalignment rather than a 课标 violation** — but the product
  claims PEP sequencing, and a P3 learner following 人教版 will not have met
  平均数 or the ÷3 it requires when this appears.)
- fix: move the cluster to `pep-primary-p4-lower-decimals-average` (which is the
  matching 四年级下册 topic and already exists) and backfill P3下 with 复式统计表
  reading items.

### F9 — 46 items with no mathematical content (the answer is the number in the question)
- severity: **major**
- category: `pedagogy`
- affected: topic `pep-primary-p3-upper-measurement-time-geometry` —
  **46 of 50 items** (`p3-u-fi-076`, `-077`, `-079` … , `p3-u-mc-074`, `-075`)
- evidence:
  > 阅读活动从12:00开始，**持续50分钟**。活动**持续了多少分钟**？ answer `50 min`,
  > explanation `题目给出的持续时间就是50分钟。`
  >
  > MC variant `p3-u-mc-106` options `["30分钟","9分钟","35分钟","40分钟"]`,
  > where `9分钟` is the start hour reused as a distractor.
- why: the stem states the duration and asks for the duration. The start time
  is never used. I verified all 46: in every one, `answer == the minute value
  printed in the prompt`. The explanation admits it. The intended 人教版三年级上册
  《时、分、秒》 skill is 计算经过时间 (end − start), which no item in this topic
  exercises — so the entire 时间 strand of P3上 is unassessed (see also F11).
- fix: invert the template — 「阅读活动从12:00开始，13:20结束，一共持续多少分钟？」
  (answer 80). Keep the given-duration form only as a 起止时刻 question
  (「持续50分钟，什么时候结束？」).

### F10 — 33 fill-in items whose answer is printed verbatim in the stem
- severity: **major**
- category: `pedagogy`
- affected: `pep-junior-v2-s1-k04-fi-001` … `-033` — **33 items** (33 of the 34
  ids on the pre-scan's `answerInPrompt` list for this slice)
- evidence:
  > 两条平行直线被一条截线所截，一组同位角中一个角为**89°**，另一个同位角为____。
  > answer `89°`
- why: 同位角相等 means the answer is always numerically identical to the given
  angle, so the item is answerable by copying without knowing what a 同位角 is,
  and it cannot distinguish a student who confuses 同位角 with 同旁内角 (who
  would answer 91°). A genuine 平行线 item must mix 同位角/内错角/同旁内角 so that
  the relation, not the copy, determines the answer.
- fix: rotate the relation across the cluster —
  「…一组**同旁内角**中一个角为89°，另一个为____」(91°), and
  「…一组**内错角**…」(89°) — so 1/3 of items require 180°−x.
  I confirmed the pre-scan's other 3 `answerInPrompt` flags are coincidences and
  need no action: `pep-junior-v2-s1-k02-fi-015` (5x+10=60, x=10),
  `pep-primary-p1-l-fi-124` (40−20=20), `pep-primary-p4-u-fi-085` (180−90=90);
  `pep-primary-p4-u-fi-095` is a substring artefact (40 inside 140).

### F11 — Topic titles promise 人教版 units that contain zero items
- severity: **major**
- category: `curriculum-alignment`
- affected: 9 topics across both slices, ~900 items sitting under misleading
  titles. Verified by keyword probe over the full slices:

| topic id | title | unit with **0 items** |
|---|---|---|
| `pep-primary-p5-lower-factors-fractions` | 因数倍数与分数运算 | 因数/倍数/质数/合数/公因数/公倍数 = 0; 约分/通分 = 0 (all 50 items are same-denominator fraction addition) |
| `pep-primary-p5-lower-volume-data` | 长方体正方体与数据 | 表面积 = 0 |
| `pep-primary-p3-upper-measurement-time-geometry` | 测量、年月日与几何 | 年/月/日 = 0 (see F9) |
| `pep-primary-p1-lower-money-data-review` | 人民币、时间与数据 | 人民币 = 5 items of 50; 43 of 50 are the same "哪个最多" comparison |
| `pep-primary-p6-lower-ratio-proportion-scale` | 比、比例与比例尺 | 比例 = 0, 比例尺 = 0, 折扣 = 0 |
| (whole primary slice) | — | 圆 (人教版六年级上册第五单元: 圆的周长/面积) = **0 items in all 1200** |
| `pep-junior-s3-upper-quadratics-circle-probability` | 一元二次方程、二次函数、**圆**与概率初步 | 圆/弧/切线/圆心角/圆周角 = **0 of 200 items**; 旋转 = 0 |
| `pep-junior-s2-upper-triangles-congruence` (title 三角形、全等与**轴对称**) | | 轴对称 = 0 |
| `pep-junior-s1-lower-lines-coordinates` (title 相交线、平行线、**实数**与平面直角坐标系) | | 实数/平方根/无理数 = 0; also 绝对值 = 0 across the whole junior slice |
- why: 圆 (六上第五单元 and 九上第二十四章) is one of the largest units in the
  中国 curriculum and is entirely absent from both slices, while a topic is
  literally named "…、圆与概率初步". A learner completing every item in
  `pep-junior-s3-upper-quadratics-circle-probability` has practised no circle
  geometry at all. Same for 因数与倍数 under a topic named 因数倍数.
- fix: either author the missing units or rename the topics to describe what
  they actually contain. The 圆 gap should be treated as a content-completeness
  release blocker for the China curriculum regardless of naming.

### F12 — Templates degenerate: the parameter that should vary is frozen
- severity: **major**
- category: `variety` / `pedagogy`
- affected: verified counts below (this is *beyond* the pre-scan's skeleton
  count — these are cases where the numbers vary but the mathematics does not)

| ids | n | what is frozen |
|---|---|---|
| `pep-primary-p6-u-*` (coordinate) | 50 | **1 skeleton for the entire P6上 topic** |
| `pep-primary-p6-l-sa-151…200` | 50 | **1 skeleton for the entire P6下 topic**; operation is 升高 in 50/50, never 下降 |
| `pep-junior-v2-s3-k11-sa-*` | 67 | 仰角 = **45° in 67/67**, so the item only ever tests `tan45°=1` and the answer always equals the given distance |
| `pep-junior-v2-s3-k11-fi-*` | 67 | 相似比 is `k:1` in **67/67** — never a genuine ratio such as 3:2, so 对应边 is always a whole-number multiple |
| `pep-primary-p6-l-fi/sa-*` | 50 | ratio is **2:3 in 50/50** |
| `pep-junior-v2-s1-k05-mc-*` | 33 | stem is `2x-N > N` in **33/33**, so the answer is always `x>N` — the number is printed twice in the question |
| `pep-junior-v2-s1-k05-sa-*` | 33 | three values are always in arithmetic progression, so **the mean equals the middle value in 33/33** |
| `pep-primary-p3-l-sa-*` | 50 | same — mean equals the middle value in **50/50** |
| `pep-primary-p1-l-fi/sa-*` | 43 | one "which is most" skeleton for 43 of the 50-item topic |
- why: a student can score 100% on `pep-junior-v2-s3-k11-sa-*` by copying the
  distance without knowing what a 仰角 or a 正切 is, and on the 平均数 clusters by
  reading the middle number. Frozen parameters make the *measured* skill
  different from the *intended* skill, which corrupts mastery signals.
- fix: constrain generators to vary the structural parameter, not just the
  digits: 仰角 ∈ {30°,45°,60°}; 相似比 ∈ {3:2, 5:3, …}; 比 ∈ {1:4, 3:5, 2:7};
  inequality constants drawn independently; data sets not in AP.

### F13 — "公升" (Taiwan/HK usage) in accepted answers
- severity: **major**
- category: `terminology`
- affected: **46 items**, e.g. `pep-primary-p6-l-fi-101`, `-104`, …
- evidence:
  > acceptedAnswers `["18升","18","18L","18 公升"]`
- why: mainland standard is 升 (L); 公升 is the Taiwan/Hong Kong form and does not
  appear in 人教版 or in 《国家法定计量单位》 usage for school material. Accepting it
  is harmless to grading but it will surface in any answer-key display or
  "correct answers include…" affordance, and it signals non-mainland authorship.
  (Checked and clean: 公尺/公分/公斤/公克 = 0 occurrences in both slices.)
- fix: drop `公升` from `acceptedAnswers`; keep `升`/`L`.

### F14 — Non-standard mathematical notation throughout
- severity: **minor** (high volume)
- category: `notation`
- affected / evidence (verified counts):
  - **400** pep-primary explanations use ASCII `x` as the multiplication sign:
    > `长方体体积=长x宽x高，4x4x3=48立方厘米。` (`p5-l-sa-151`)
    > `三角形面积=底x高÷2，10x4÷2=20平方厘米。`
    This is actively confusing from P5 onward, where `x` is simultaneously
    introduced as the unknown in 简易方程 (`5x+10=25`, `p5-u-mc-008`).
  - **46** pep-primary prompts do the same: `计算：16x32=？` (`p4-u-mc-004`).
  - **150** answers use caret units `48 cm^2`, `48 cm^3` instead of 平方厘米/
    立方厘米 or cm²/cm³.
  - **50** items write `°C` where 人教版 writes `℃` (`气温是-3°C`).
  - **45** answers use `6 R 5` for 有余数除法; 人教版 writes `6……5`
    (「6 余 5」 is in acceptedAnswers, so this is display only).
  - pep-junior mixes `x^3` (33 items, `计算：3x^3·10x^2=____`) with `x²`
    (99 items, `因式分解：x²+9x+14`) for the same superscript.
- why: mainland textbooks use `×` (or `·` for algebra), `℃`, `cm²`, and `……`.
  Mixed ASCII/Unicode notation within one slice also makes the corpus
  un-renderable consistently.
- fix: normalise at generation: `×` for arithmetic, `·`/juxtaposition for
  algebra, `℃`, `cm²`/`cm³` (or the Chinese unit words), `……` for remainder,
  Unicode superscripts throughout.

### F15 — Explanations that restate the answer instead of deriving it
- severity: **minor**
- category: `pedagogy`
- affected: **36** pep-junior + **30** pep-primary items match the tautology
  `a/b = a/b`, plus the 46 items of F9
- evidence:
  > `pep-junior-v2-s3-k10-sa-001` 共有29个球，其中红球17个，所以概率是**17/29=17/29**。
  > `pep-primary-p5-l-fi-104` 分母相同，分子相加：**5/8=5/8**。
- why: the template writes `原分数=化简后分数`; when the fraction is already in
  lowest terms it prints the same value on both sides. The P5 case is worse —
  it omits the actual computation `3/8+2/8`, so the one line the learner needs
  ("分子 3+2=5") is exactly what is missing.
- fix: emit the derivation, and suppress the `=` clause when numerator/
  denominator are unchanged: `分母相同，分子相加：3/8+2/8=(3+2)/8=5/8`.

### F16 — Solid-shape clue is not uniquely satisfied
- severity: **minor**
- category: `math-error`
- affected: `pep-primary-p1-u-fi-091`, `-092`, `-096`, … (13 fill-in + 1
  variant) — 14 items with no options
- evidence:
  > 下面描述的是哪种立体图形：**相对的面是长方形**？ answer `cuboid` / 长方体
- why: a 正方体 also has 相对的面 that are rectangles (a square is a rectangle),
  and 正方体 is an option in the MC siblings of this cluster. For the fill-in
  form there is nothing to disambiguate. 人教版一年级上册 treats 长方形 and 正方形
  as distinct at this stage, so the item works in practice, but the clue as
  written is not exclusive.
- fix: use the discriminating clue the textbook uses: 「6 个面**都是长方形**（也可能
  有两个面是正方形）」 or contrast by feature: 「长长方方，有平平的面」.

### F17 — Malformed / implausible distractors
- severity: **minor**
- category: `pedagogy`
- affected: `pep-junior-v2-s1-k02-mc-001`, `-011`, `-021` — 3 items
- evidence:
  > 化简：(3x+9)+(3x-4)。 options `["6x+13","15x-4","0x+5","6x+5"]`
- why: `0x+5` is not a form any student produces — nobody writes a zero
  coefficient — so the option is dead weight and the item is effectively
  3-choice. (`6x+13` = sign error and `15x-4` = concatenating coefficients are
  both good distractors; only the third is wasted.)
- fix: replace with `6x+13`-style near-misses, e.g. `9x+5` (adding the
  coefficient to the constant) or `6x-5`.

### F18 — Difficulty labels do not track difficulty
- severity: **minor**
- category: `data-integrity`
- affected: whole pep-junior slice; distribution S3 = 200 `High` / 170 `Medium`
  / 30 `Low` vs S1 = 60 `High` / 210 `Medium` / 130 `Low`
- evidence:
  > `pep-junior-v2-s3-k11-fi-001` difficulty `High` — 相似比3:1，小边14 → 大边
  > 3×14=42 (one multiplication)
  > `pep-junior-v2-s1-k05-sa-001` difficulty `High` — 求 41、44、47 的平均数
  > `pep-junior-v2-s2-k09-sa-001` difficulty `High` — 求 38、40、42、44 的中位数
- why: difficulty appears to be assigned per topic/chapter, not per item, so
  every item in the S3下 topic is `High` regardless of whether it is a one-step
  substitution. Any adaptive sequencing or mastery estimate built on this field
  will be wrong.
- fix: derive difficulty from step count/operation type per item, or drop the
  field until it is meaningful.

### F19 — Question asks two things, key answers one
- severity: **minor**
- category: `answer-key`
- affected: `pep-junior-v2-s2-k07-sa-001` … `-033` — 33 items
- evidence:
  > 化简分式(3x+12)/(x+4)，**并注明x不能等于什么**。 answer `"3"`,
  > acceptedAnswers `["3，x≠-4"]`
- why: the primary key is `3`, so a student who omits the 分式有意义的条件 — the
  whole point of 人教版八年级上册 15.1 — is marked fully correct, while the complete
  answer is only reachable through the secondary list. The teaching signal is
  inverted.
- fix: make `3，x≠-4` the primary `answer` and keep `3` out of the accepted set
  (or split into two sub-questions).

---

## Slice health verdict

**Not shippable as-is to mainland learners.** The answer keys themselves are in
good shape — 2343 of 2400 items had their key recomputed independently and
**zero arithmetic errors** were found — but three defects put wrong or
impossible content in front of students (8 MC items with two correct options,
11 congruence items whose triangles violate the triangle inequality, 1
remainder item with an incomplete key), and these are cheap, mechanical fixes.

The deeper problem is curricular, not computational. Four clusters totalling
~180 items sit at the wrong grade or use vocabulary from a later volume
(有理数运算 and 平面直角坐标系 at P6, 斜率 at S2, 邻补角 at P4, 平均数 at P3), and
~900 items sit under topic titles naming 人教版 units that contain **no items at
all** — most seriously 圆, which is absent from all 2400 items while a topic is
named "…、圆与概率初步". Combined with frozen template parameters (仰角 45° in
67/67, 相似比 k:1 in 67/67, 比 2:3 in 50/50, 平均数 = middle value in 83/83, two
P6 topics with a single skeleton for 50 items each), a learner can post high
mastery scores on skills the corpus never actually tests.

Recommended gating: F1–F3 before any release; F4–F8 and F11 before marketing
the content as 人教版-aligned; F12 before trusting any mastery or adaptive
signal derived from these slices.
