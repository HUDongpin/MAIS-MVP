# Language, terminology, notation & rendering audit (中国大陆 zh-Hans)

Scope: language correctness, mainland terminology conformance, notation and
renderability across all 9 slices. Mathematical correctness is out of scope
(other agents). Every count below is stated with its exact computation scope.

## Coverage

**Programmatic — 100 % coverage (not a sample).** Every check in this report
was computed over **all 17,700 items**, i.e. **103,178 learner-facing field
strings / 2,532,008 characters**: `prompt` (17,700), `options[]` (26,080),
`answer` (17,700), `acceptedAnswers[]` (23,998), `explanation` (17,700).
Where a count is restricted to a subset of fields (e.g. "prompt only") the
report says so on the line.

Traditional/simplified detection is **not** a regex. I extracted the complete
Han-character inventory of the corpus (**1,749 distinct characters**) and ran
each character through OpenCC's `t2s` character mapping (installed
`opencc-python-reimplemented` locally); 242 distinct characters convert, i.e.
are traditional-only. I then read all 242 to confirm none is a legitimate
mainland form. Counts are exact per slice, per grade, per field.

**Manual reading — sample, stated honestly.** I read **33 complete records**
(all fields, untruncated) and roughly **250 field-level excerpts**
(90–150 chars each) surfaced by the checks. Full records per grade:
P1 4, P2 3, P3 3, P4 2, P5 2, P6 2, S1 3, S2 2, S3 1, S4 4, S5 3, S6 4.
Selection: (a) top-N representatives of every defect class the programmatic
pass flagged, (b) the 15 longest P1–P3 prompts, (c) a seeded pseudo-random
stratified draw of 3 items per grade for P4–P6/S2/S5/S6 to catch classes my
patterns might have missed (this draw found two new classes: `a_11` unbraced
subscripts and the `原创…练习` prompt prefix).

**Not covered.** (1) Whether the mathematics or the answer key is *correct* —
other agents. (2) Per-item pedagogical register judgements beyond the length
and vocabulary statistics given in F18 — I read 15 long P1–P3 prompts, not all
2,850 primary-lower items. (3) The product UI shell (I noticed
`components/dashboard/LearningAnalyticsReport.tsx:307` renders `"答對題目"`
— traditional — but the UI is outside this corpus brief and I did not audit
it). (4) Rendering was judged from the source strings; I did not run the
strings through the live MathJax/markdown renderer.

Full id lists for every finding: `findings/language-terminology-ids.json`
(keyed `F1_…`, `F2_…`, … matching the finding numbers below).

---

## Findings

### F1 — Traditional Chinese (zh-Hant) shipped inside mainland zh-Hans packs
- severity: **major**
- category: `language`
- affected: **2,028 items (11.5 % of corpus), 8,125 traditional character
  instances**, 100 % of them inside `acceptedAnswers[]`.
  Per slice: bnu-primary 956 / 3000 (31.9 %), hjb-primary 459 / 1500 (30.6 %),
  bnu-junior 347 / 1500 (23.1 %), hjb-junior 242 / 1500 (16.1 %),
  hjb-high 24 / 1500 (1.6 %). **Zero** in pep-primary, pep-junior, pep-high,
  bnu-high. By grade: P1 287, P2 265, P3 235, P4 265, P5 168, P6 195,
  S1 190, S2 201, S3 198, S4 24.
  Sample ids: `bnu-primary-ds-v1-p1-081`, `bnu-primary-ds-v1-p3-137`,
  `hjb-primary-ds-v1-p3-150`, `bnu-junior-ds-v1-s1-065`,
  `hjb-junior-ds-v2-s3-339`, `hjb-high-ds-v2-s4-099`.
- evidence:
  > `hjb-junior-ds-v2-s3-339` acceptedAnswers[1]:
  > 「證明：因為OA是半徑，且l⊥OA於A，根據切線的判定定理"經過半徑外端且垂直於這條半徑的直線是圓的切線"，所以l是⊙O的切線。」
  > `hjb-primary-ds-v1-p3-150` acceptedAnswers[4]: 「168 ÷ 6 = 28（本），**驗算**：28 × 6 = 168」
  > `bnu-primary-ds-v1-p1-081` acceptedAnswers[3]: 「**長方體**：鞋盒；**正方體**：魔方；**圓柱**：茶叶罐；球：皮球」
  Most frequent offending characters (corpus-wide instance counts):
  個 721, 數 554, 為 464, 長 252, 時 250, 邊 230, 線 183, 點 170, 對 166,
  兩 154, 計 132, 體 130, 學 114, 積 114, 圓 113, 圖 104, 層 104, 條 102.
- why: a mainland pack must contain no traditional-only characters at all. The
  polluted field is the free-response grading key: a P1 child who types the
  correct simplified answer is graded against a list half of whose entries are
  Hant, and any surface that echoes accepted answers (the solvability CSV
  export at `lib/questionBankSolvability.ts:2009/2059`, teacher review views)
  shows 繁体 to mainland teachers. It also means the mainland packs were
  produced by fanning a source answer through a HK/TW conversion step.
- fix: delete every Hant variant from `acceptedAnswers` in the mainland packs
  (or run `t2s` over them and de-duplicate), and add a build-time gate: any
  character whose `t2s` image differs from itself fails the zh-Hans pack.
- **correction to pre-scan item 5**: the pre-scan's suspicion (bnu-junior 55,
  hjb-junior 79, pep-high 160) is **100 % false positives**. I re-ran its
  `TRAD_STRICT` class: it fires on 360 items and in **all 360** the matching
  character is **限**, which is a standard simplified character (极限, 有限,
  限制). The pre-scan also looked only at prompt/options/explanation, which is
  exactly where the corpus is clean. Prompts, options and explanations contain
  **zero** traditional characters; the real leak is 7× larger and lives in a
  field the pre-scan never inspected.

### F2 — `term-XXXX` machine-translation placeholders in the grading key
- severity: **major**
- category: `data-integrity` / `language`
- affected: **1,914 items** (bnu-primary 1,019, hjb-primary 461, bnu-junior
  262, hjb-junior 153, hjb-high 19), all in `acceptedAnswers[]`.
  Sample ids: `bnu-primary-ds-v1-p1-015`, `bnu-primary-ds-v1-p3-135`,
  `hjb-primary-ds-v1-p5-016`, `hjb-junior-ds-v2-s2-496`.
- evidence:
  > `bnu-junior-ds-v1-s1-224` acceptedAnswers[0]:
  > 「term-8c03-term-67e5-term-95ee-term-9898: you term-6bcf days complete
  > term-5bb6-term-5ead make term-4e1a-term-5927-term-7ea6-term-9700 requires
  > more less hour ？…」
  > `hjb-primary-ds-v1-p5-016` acceptedAnswers[1]: 「term-5927-term-7ea622 yuan」
  The suffix is the Unicode code point of the character the pipeline failed to
  translate: 8c03=调, 67e5=查, 95ee=问, 9898=题, 5b69=孩, 96c6=集.
- why: a broken localisation pipeline wrote its own failure tokens into a
  shipped content field. These strings can never match a learner response, and
  they leak the internal token scheme to anyone who sees the field.
- fix: drop every `acceptedAnswers` entry matching `/term-[0-9a-f]{4}/i`;
  add a pack-lint rule rejecting the pattern anywhere in content.

### F3 — Machine-English "answers" in the grading key of Chinese items
- severity: **major**
- category: `language`
- affected: **639 items / 642 entries** (bnu-primary 248, hjb-primary 140,
  hjb-junior 103, bnu-junior 87, pep-primary 50, hjb-high 12).
- evidence:
  > `bnu-primary-ds-v1-p1-030` acceptedAnswers[3]: 「boys term-5b69 more, more 2items」
  > `bnu-primary-ds-v1-p6-091` acceptedAnswers[1]: 「14people」
  > `hjb-high-ds-v2-s4-099` acceptedAnswers[0]: 「whena < 1 when, solve term-96c6
  > is (a,1); whena = 1 when, solve term-96c6 is blank term-96c6; …」
- why: word-for-word gloss of the Chinese key, not English and not Chinese.
  Unusable as an accepted answer for a mainland learner.
- fix: same as F2 — strip; regenerate accepted-answer variants from the
  Chinese key only (punctuation/spacing/unit variants).

**F1+F2+F3 combined: 2,817 items (15.9 % of the corpus) have at least one
polluted `acceptedAnswers` entry** — bnu-primary 46.9 %, hjb-primary 42.5 %,
bnu-junior 26.8 %, hjb-junior 19.2 %, pep-primary 4.2 %, hjb-high 2.1 %.

### F4 — Internal authoring/generator labels printed in the learner's prompt
- severity: **major**
- category: `data-integrity` / `pedagogy`
- affected: **3,972 items**, `prompt` field:
  - `bnu-high` **1,500 / 1,500 (100 %)** — every prompt begins `题组s4-001：`
    (`F4a`); 36 of them additionally contain the publisher self-reference
    `在北师大版高中预备知识练习中，` (`F4e`).
  - `pep-high` **2,400 / 4,800 (50 %)** — 1,500 begin
    `RAG-v3 <卡片类型> N（<topic>）：<类型><题型>任务：` (`F4b`, 7 card types:
    参数讨论/反例判断/图像信息/建模情境/误区诊断/综合拆步/概念辨析) and 900
    begin `原创诊断练习 N：` / `原创计算练习 N：` / `原创建模练习 N：` /
    `原创推理练习 N：` / `原创复习练习 N：` (`F4c`). S4/S5/S6 = 800 each.
  - `hjb-junior` **72** prompts end with a bare `变式 1` / `变式 2` line (`F4d`).
- evidence:
  > `bnu-high-ds-v1-s4-001`: 「**题组s4-001：在北师大版高中预备知识练习中，**已知 3x + 2 = 11，求 x = （ ）」
  > `pep-high-s4-rag3-fi-001`: 「**RAG-v3 参数讨论 1（集合与常用逻辑用语）：参数讨论填空题任务：**在 \(U=\{1,2,\ldots,22\}\) 中，…」
  > `hjb-junior-ds-v2-s1-103`: 「下列因式分解中，正确的是（ ）\n**变式 1**」
- why: 题干 in a mainland textbook never carries the item's internal batch id,
  the retrieval pipeline version, the card taxonomy, or a self-referential
  "in the BNU high-school prep exercises" frame. It reads as unfinished
  machine output, tells the student which template family the item came from
  (a metacognitive hint), and `变式 1` is meaningless without the parent item.
- fix: strip everything up to and including the first `：` for the
  `题组…` / `RAG-v3…任务：` / `原创…练习 N：` families; delete the trailing
  `变式 N` line; move all of it to non-rendered metadata fields.

### F5 — Pipeline boilerplate and internal QA verdicts inside `explanation`
- severity: **major**
- category: `data-integrity` / `language`
- affected: **2,515 items**
  - `pep-high` **2,400**: 1,500 explanations end
    `本题依据安全 RAG 卡片抽象生成，训练<X>，并提醒避免<English phrase>。`
    (`F5a`; 54 distinct English tails, e.g. `sign chart interval error` 58,
    `focus position swapped` 57, `derivative zero treated as automatic
    extremum` 57, `degree-radian confusion` 40) and 900 end
    `这道 MAIS 原创练习同时训练<X>，解完后要回到题设条件复核。` (`F5b`).
  - `bnu-junior` **115**: explanations replaced by an internal review verdict
    (`F5c`), 16–28 of which are **truncated mid-sentence** (`F5d`).
- evidence:
  > `pep-high-s4-rag3-fi-001` explanation: 「…结果为 13。 最终答案为 13。
  > **本题依据安全 RAG 卡片抽象生成，训练概念辨析，并提醒避免confusing element and subset。**」
  > `bnu-junior-ds-v1-s1-434` explanation: 「**根据题意复核计算**，正确结果为(6, 3)。
  > **复核要点**：题目可解，但直线BC为x=4，…解析中也指出原记录错误并更正为(6,3)，但**提供的answer仍为(2,-1)**，与正确结果不符。」
  > `bnu-junior-ds-v1-s1-019` explanation ends mid-clause: 「…**解释合理，**」
- why: the explanation is the highest-trust surface in the product. Here it
  tells a Chinese high-schooler, in English, which error tag the generator
  attached; it names the vendor pipeline ("MAIS 原创练习", "安全 RAG 卡片");
  and in bnu-junior it exposes an internal reviewer arguing with the item's own
  answer key ("提供的answer…与正确结果不符", one instance ends "…判定为fail").
  A student reading `bnu-junior-ds-v1-s1-434` learns the product ships items
  whose stored answer is known-wrong.
- fix: truncate every explanation at the last sentence of genuine mathematics;
  move error tags to metadata and translate them if they must be shown
  (`避免符号错误`, `避免焦点位置颠倒`, …); remove the 115 review verdicts and
  restore real 解析; add a lint rule for explanations ending in `，`/`、`/`；`.

### F6 — Answer key displayed to the learner is not mainland Chinese
- severity: **blocker** (this is the string shown as `correctAnswer` on a wrong
  attempt)
- category: `answer-key` / `language`
- affected: **198 items**, `answer` field:
  - `pep-primary` 52 English nouns — `cuboid` 15, `cube` 14, `cylinder` 13,
    `sphere` 8, other 2 (`F6a`, ids `pep-primary-p1-u-fi-091…100`,
    `pep-primary-p1-u-mc-051…092`).
  - `pep-junior` 34 × `Quadrant IV` (`pep-junior-v2-s1-k04-sa-001…034`) plus
    67 × `x=12 or x=17`-style (`F6b`, `pep-junior-v2-s3-k10-mc-001…067`).
  - `pep-primary` 45 × US remainder notation `3 R 5` (`F6c`,
    `pep-primary-p2-l-fi-101…145`), with acceptedAnswers `3 remainder 5`.
- evidence:
  > `pep-primary-p1-u-mc-051` prompt 「小林摸到一个立体图形，它从各个方向都能滚动。这个图形最可能是什么？」
  > options `["正方体","圆柱","球","长方体"]` answer **`"sphere"`** acceptedAnswers `["球"]`
  > `pep-primary-p2-l-fi-101` prompt 「小林把23张卡片按每6张一份整理，商和余数是多少？」
  > answer **`"3 R 5"`** acceptedAnswers `["3余5","3 remainder 5","3R5"]`
- why: extends pre-scan item 1 with exact classes. `sphere` is not one of the
  four options, so the grader shows a "correct answer" that does not exist on
  screen. `Quadrant IV` must be `第四象限`; `or` must be `或`. `3 R 5` is the
  US/HK convention — mainland 人教版二年级下册 writes `23÷6=3……5`, read
  「商是3，余数是5」; `R` is never taught.
- fix: answer ← `球` / `第四象限` / `x=12或x=17` / `3……5`; keep the English and
  `R` forms only as accepted variants if leniency is wanted, never as the key.

### F7 — Latin unit abbreviations in the answer key of Chinese-unit questions
- severity: **major**
- category: `notation` / `language`
- affected: **578 items** (pep-primary 348, pep-junior 224, bnu-junior 5,
  hjb-primary 1). Rule: `answer` contains no Han character, every Latin token
  is a unit (`cm`, `m`, `kg`, `min`, `cm^2`, …), and the prompt asks in Chinese
  units (厘米/米/千克/分钟/…).
- evidence:
  > `pep-primary-p2-u-fi-091` prompt 「…另一条**长多少厘米**？」 answer **`"39 cm"`**
  > (acceptedAnswers correctly contain `39厘米`)
  > 28 items answer `"8 cm"`, 14 `"12 cm"`, 9 `"16 cm^2"`, 7 `"50 min"` …
- why: a P2 child is asked in 厘米 and shown `39 cm`. Mainland primary
  textbooks write the unit in Chinese through P3 and only introduce the
  symbol alongside it; `cm^2` is additionally an ASCII-superscript hack for
  cm²/平方厘米.
- fix: answer ← `39厘米` (P1–P3), `39 cm` acceptable only from P4 and only if
  the prompt itself uses the symbol; never mix within one item.

### F8 — Generator artefacts `1x`, `0x`, `1i`, `0i` in prompts
- severity: **major**
- category: `notation`
- affected: **709 items**, `prompt` field (pep-high 526, bnu-high 169,
  pep-junior 11, hjb-high 3).
- evidence:
  > `pep-high-s5-fi-005`: 「已知 \(f(x)=**1x^2**+2x+1\)，求 \(f'(2)\)。」
  > `pep-high-s5-fi-030`: 「已知 \(f(x)=1x^2**+0x**+1\)，求 \(f'(4)\)。」
  > `bnu-high-ds-v1-s6-499`: 「题组s6-499：函数 f(x) = **1x²** - **1x** + 2，求 f'(6) = （ ）」
  > `pep-high-s4-rag2-fi-061`: 「求 \((-1+3i)+(2+**0i**)\) 的虚部系数。」
  > `pep-high-s4-fi-005`: 「对于 \(y=**1\sin** 3x\)…」
  > `pep-junior-v2-s1-k02-mc-002`: 「化简：(4x+3)+(**1x**-2)。」
- why: 系数1 and 系数0 are never written in any Chinese textbook (or any
  mathematics). It is a template-substitution artefact, immediately legible to
  a teacher as machine-generated content, and `+0x` changes the item's
  difficulty signal.
- fix: normalise coefficients at generation time (1→omit, −1→−, 0→drop the
  whole term); re-render the 709 prompts.

### F9 — Unbraced multi-digit LaTeX subscripts render wrongly
- severity: **major**
- category: `notation`
- affected: **176 items** (pep-high 119, hjb-high 56, bnu-junior 1), in
  `prompt` (119) and `explanation` (57).
- evidence:
  > `pep-high-s5-fi-019`: 「等差数列满足 \(a_1=2\)，\(d=5\)。求 \(**a_11**\)。」
  > `pep-high-s5-rag3-sa-106`: 「…求 \(**S_10**\)。」
  `a_11` renders as *a*₁1 and `S_10` as *S*₁0 — the learner sees "a-sub-1
  then 1", i.e. a different quantity from the intended a₁₁ / S₁₀.
- why: LaTeX subscripts take a single token unless braced.
- fix: `a_{11}`, `S_{10}`. (`\log_264` is *not* affected — there the trailing
  digits are the argument; I excluded that pattern from the count.)

### F10 — Fractions written as `a/b` in primary content
- severity: **major**
- category: `notation`
- affected: **523 primary items** (bnu-primary 249, pep-primary 150,
  hjb-primary 124) — by grade P3 90, P4 40, P5 213, P6 180 — in prompts,
  options, answers and explanations (acceptedAnswers excluded).
- evidence:
  > `pep-primary-p3-u-mc-001` prompt 「小林把一张纸平均分成8份，涂色7份。涂色部分占**几分之几**？」
  > options `["7/8","8/7","8/8","7/9"]` answer `"7/8"`
  > `pep-primary-p6-u-mc-005` explanation: 「20%表示**20/100**，所以170x20/100=34。」
  The same corpus writes fractions correctly elsewhere — 106 items use
  `几分之几` wording (`三分之一`, `四分之一`).
- why: 三年级上册《分数的初步认识》 teaches the stacked form and the reading
  「八分之七」. A P3 child who has never seen a solidus is shown `7/8` as an
  option, and `8/7`/`7/9` distractors become visually indistinguishable.
- fix: render fractions as real fractions (`\frac{7}{8}` in the LaTeX slices,
  a fraction component elsewhere); in P3 also give the Chinese reading.

### F11 — ASCII `x` used as the multiplication sign
- severity: **major** (P1–P3), minor above
- category: `notation`
- affected: **438 items** (pep-primary 400, pep-junior 33, bnu-junior 2,
  hjb-primary 2, hjb-junior 1); fields: explanation 355, prompt 46,
  acceptedAnswers 37.
- evidence:
  > `pep-primary-p2-l-fi-101` explanation: 「**6x3**+5=23，所以结果是3余5。」
  > `pep-primary-p6-u-mc-005` explanation: 「所以**170x20**/100=34。」
- why: mainland notation is `×` (and `·` from 初中). Showing `6x3` to a P2
  child who is about to meet `x` as an unknown in 初一 is the exact confusion
  the standard tries to prevent. 8 further items use `*` (`5*4=20`,
  `1/2*6*8`), also non-standard.
- fix: `6×3`; `*` → `×` or `\cdot`.

### F12 — Two incompatible math-notation systems inside one corpus
- severity: **major**
- category: `notation`
- affected (delimiter census, whole corpus):
  | slice | items with `\(…\)` | items with `$…$` | items with any LaTeX macro | items with no delimiter |
  |---|---|---|---|---|
  | pep-high | 4,361 | 0 | 847 | 439 |
  | hjb-junior | 128 | 3 | 82 | 1,369 |
  | bnu-junior | 31 | 1 | 28 | 1,468 |
  | hjb-high | 22 | 0 | 23 | 1,478 |
  | hjb-primary | 5 | 0 | 6 | 1,495 |
  | bnu-primary | 1 | 0 | 2 | 2,999 |
  | pep-primary / pep-junior / bnu-high | 0 | 0 | 0 | all |

  Plus **1,736 items** that express exponents with Unicode superscripts
  (`x²`, `a³`, `x⁵`, `₁`) instead of markup: pep-junior 166, bnu-primary 113,
  bnu-junior 289, bnu-high 382, hjb-primary 40, hjb-junior 387, hjb-high 359.
  And **27 items** carry a bare LaTeX macro with no delimiters at all, in a
  slice that otherwise never uses LaTeX — these will display literally:
  `bnu-primary-ds-v2-p5-062` answer `\frac{3}{5}`;
  `hjb-primary-ds-v1-p5-171/172/174/175`; `bnu-junior-ds-v1-s2-184` option
  `\begin{cases} y = 45x \\ y = 60(x - 1) - 15 \end{cases}`;
  `bnu-junior-ds-v1-s1-125` prompt uses `$…$` while its slice-mates use none.
- evidence: `pep-junior-v2-s2-k07-mc-001` 「因式分解：**x²**+9x+14。」 versus
  `pep-high-s4-fi-001` 「…求 **\(|A\cup B|\)**。」 — same product, same
  language, same subject.
- why: mixed systems mean the renderer cannot be configured correctly for all
  slices at once. Unicode `²` cannot express `x^{n+1}`, breaks copy-paste into
  a calculator, and is read by screen readers as "x squared two". The 27 bare
  macros are guaranteed visible defects.
- fix: pick one system per band and enforce it (recommend LaTeX everywhere
  above P4, plain Unicode below); lint for `\\[a-zA-Z]+` outside delimiters
  and for `[²³¹⁰⁴-⁹₀-₉]` in LaTeX slices.

### F13 — Character hygiene: full-width, look-alike and stray glyphs
- severity: **minor**
- category: `notation`
- affected (all learner-facing fields unless noted):
  - full-width operators `＋－＝＜＞％` — **172 items**
    (bnu-primary 67, hjb-primary 35, pep-junior 33, bnu-junior 23,
    hjb-junior 14), e.g. `pep-junior-v2-s1-k05-mc-001` acceptedAnswers `x＞34`
    while the option itself uses `>`.
  - Unicode minus U+2212 `−` mixed with ASCII `-` — **105 items**
    (`bnu-primary-ds-v1-p3-002` 「计算45−18÷3时…」).
  - ideographic space U+3000 inside prompts — **134 items**.
  - ratio colon U+2236 `∶` — **17 items** (`2∶3`); the rest of the corpus uses
    `:`; mainland typography does want `∶` for ratios, so the defect is the
    inconsistency, not the glyph.
  - vulgar fractions `½ ¼ ⅓` — **14 items** (`hjb-junior-ds-v2-s1-486`
    「∠BAD=**½**∠BAC=40°」) — unusable in a fraction-teaching product.
  - `≅` used once (`hjb-junior-ds-v2-s3-016` option `△ABC≅△DEF`) where the
    corpus's other 38 congruence-symbol occurrences use the mainland `≌`.
  - emoji/pictographs in prompts — **10 items**: `bnu-primary-ds-v2-p1-002`
    「文具盒里有铅笔：✏️✏️✏️✏️✏️」, `bnu-primary-ds-v2-p1-005` 「🐟🐟🐟🐟」,
    plus ☆/△ used as figures.
  - no full-width digits and no full-width Latin letters anywhere (clean).
- fix: normalise to half-width ASCII operators inside math, `-`→ consistent
  minus, delete U+3000, `½`→`\frac{1}{2}`, `≅`→`≌`, replace emoji with real
  images or Chinese nouns.

### F14 — Chinese punctuation defects
- severity: **minor**
- category: `language`
- affected:
  - ASCII `"` used as Chinese quotation marks — **5 items**, all
    hjb-primary prompts (`hjb-primary-ds-v1-p2-116/119/120/121/131`), e.g.
    「小华在整理错题时发现一道题：**"**小明有3张5元…**"**」 — must be 「“…”」.
    The rest of the corpus uses “ ” correctly (1,150 occurrences).
  - ASCII `,` / `;` between Chinese clauses — **43 items**
    (`bnu-primary-ds-v1-p1-081` acceptedAnswers 「长方体**:**鞋盒**;**正方体…」).
  - half-width `( )` used for a Chinese fill-in bracket — **22 items**
    (bnu-primary 16, hjb-primary 6), against 全角 `（ ）` in ~1,880 others.
  - prompt ends with no terminal punctuation, no blank and no option list —
    **220 items** (hjb-junior 74, bnu-high 48, bnu-primary 45, bnu-junior 30,
    hjb-primary 23).
  - blank-marker convention is not standardised: `____` in 2,215 prompts,
    `（ ）` in ~1,880, `□` in ~52, and 32 prompts mix two styles.
  - no 「」/『』 anywhere (good — those would be HK/TW/JP style).
- fix: a punctuation pass; settle one blank convention per item type
  (mainland practice: `______` for 填空, `（　）` for 选择).

### F15 — Option letters duplicated in `options[]` and `answer`
- severity: **minor**
- category: `data-integrity`
- affected: **272 items** whose option strings carry their own `A. `/`B. `
  prefix and **273** whose `answer` repeats the letter (bnu-primary 66/67,
  hjb-junior 107, hjb-primary 52, bnu-junior 37, hjb-high 10) — the other
  6,248 of the 6,520 MC items store bare option text.
- evidence:
  > `hjb-junior-ds-v2-s2-496` options `["A. k = 12，…","B. k = -12，…", …]`
  > answer `"B. k = -12，图像的两支分别位于第二、四象限"`
- why: the UI adds its own A/B/C/D, so these render as "A. A. k = 12…", and
  string-matching the answer against the option list depends on the prefix
  surviving normalisation.
- fix: strip `^[A-D][.、．)）]\s*` from options and answers at ingest.

### F16 — Options repeated inside the prompt text
- severity: **minor**
- category: `data-integrity`
- affected: **134 MC items** where ≥2 option strings also appear in the prompt
  (bnu-primary 48, bnu-junior 28, hjb-primary 22, hjb-junior 21, bnu-high 7,
  pep-primary 3, hjb-high 3, pep-high 2).
- evidence:
  > `bnu-primary-ds-v1-p1-022` prompt 「下面哪根绳子最长？\nA. 一根绳子长4米\nB. …\nD. 一根绳子长2米」
  > with `options` holding the same four strings.
- fix: keep the option list in `options[]` only.

### F17 — Markdown/layout syntax and dangling figure references
- severity: **minor** (major for the 15 figure-less items)
- category: `data-integrity` / `pedagogy`
- affected:
  - markdown tables inside prompts — **72 items** (hjb-primary 28,
    bnu-primary 25, bnu-junior 18, hjb-junior 1), e.g.
    `hjb-primary-ds-v1-p2-114` 「| 运动项目 | 人数 |\n|----------|------|…」
    — a P2 statistics item whose table cells are *empty by design* ("请完成
    统计表") but which the learner can only answer in a single text box.
  - embedded newlines in prompts — **604 items** (bnu-primary 222,
    hjb-junior 141, hjb-primary 121, bnu-junior 119).
  - circled numerals ①②③ as sub-question markers — **97 items**; fine
    typographically, but combined with a single answer box they force
    multi-part answers into one string.
  - 图-referencing prompts with no figure — **15 items**
    (`bnu-primary-ds-v2-p1-005` 「**看图**写数。鱼缸里有几条鱼？🐟🐟🐟🐟」,
    `bnu-primary-ds-v2-p2-041` 「**看图**填一填…」,
    `bnu-junior-ds-v1-s2-467` 「…则**图中**全等三角形的对数是（ ）」).
- fix: real table/figure components, or rewrite the item so the text is
  self-contained; never say 看图/如图 without a figure.

### F18 — Register and length are wrong for the lower primary grades
- severity: **major** (bnu-primary / hjb-primary P1–P3), minor elsewhere
- category: `pedagogy` / `language`
- affected: measured over **all 17,700 prompts** (characters, incl. digits):

  | grade | n | mean | median | p90 | p99 | max |
  |---|---|---|---|---|---|---|
  | P1 | 950 | 38.4 | 32 | 69 | 123 | **243** |
  | P2 | 950 | 40.0 | 33 | 69 | 145 | 235 |
  | P3 | 950 | 45.8 | 39 | 78 | 141 | 211 |
  | P4 | 950 | 50.5 | 42 | 95 | 176 | 250 |
  | P5 | 950 | 49.2 | 42 | 89 | 175 | 293 |
  | P6 | 950 | 50.9 | 42 | 91 | 199 | 412 |
  | S1 | 1400 | 52.3 | 41 | 92 | 232 | 485 |
  | S3 | 1400 | 63.7 | 50 | 124 | 203 | 304 |
  | S4–S6 | 2600 ea | 53.7 / 54.4 / 52.0 | ~48 | ~80 | ~110 | ~140 |

  The publishers diverge sharply at the same grade: **P1 mean 23.7 chars in
  pep-primary (max 39) vs 42.5 in bnu-primary (max 243) and 41.9 in
  hjb-primary (max 171)**. Prompts exceeding a defensible ceiling
  (P1 > 60, P2 > 80, P3 > 100 chars): **P1 129** (bnu 83, hjb 46),
  **P2 59** (bnu 30, hjb 29), **P3 41** (bnu 25, hjb 16) — 229 items, none of
  them in pep-primary. Multi-clause density: **P1 124 / P2 120 / P3 172**
  primary prompts contain ≥6 clause breaks.
- evidence (worst offenders, read in full):
  > `bnu-primary-ds-v2-p1-248` — **243 characters for 一年级**: 「小乐在整理自己的
  > 数学学习卡片。他发现下面四张卡片中，有三张卡片上的内容可以用"凑十法"来解释，只有一张…
  > 卡片A：计算8+5时，先从5里面分出2，把8凑成10，10再加剩下的3等于13。卡片B：…」
  > `hjb-primary-ds-v1-p1-029` — 171 chars, P1: 「数一数…积木堆描述：最下面一层从左到右
  > 放着：一个长方体（鞋盒形状），一个正方体（骰子形状），一个圆柱（易拉罐形状）。上面一层：…」
  > `bnu-primary-ds-v2-p2-214` — 201 chars of pure prose describing four
  > geometric figures a P2 child is supposed to hold in memory.
- why: a 一年级 pupil reads ~1,600 characters total in the whole 语文上册; the
  P1 mathematics 题干 in 人教版/北师大版 is typically 10–30 characters, often
  with a picture carrying the information. A 243-character, four-branch,
  pure-text comparison task is a reading test, not a mathematics item — and
  the items that need a picture (F17) put the picture *into prose*
  ("积木堆描述：…"), which is the worst of both.
- fix: cap P1 at ~40, P2 at ~55, P3 at ~70 characters; move enumerated cases
  into options or a figure; the 229 over-length items need rewriting, not
  trimming.

### F19 — Mainland terminology: small number of genuine deviations
- severity: **minor**
- category: `terminology`
- affected: **65 items total** across five classes — the corpus is otherwise
  clean on this axis:
  - `乘数` / `被乘数` (pre-2001 terminology; the 2001+ standard and current
    人教版/北师大版 say **因数**) — **18 items** (bnu-primary 12, hjb-primary 6),
    e.g. `bnu-primary-ds-v1-p4-132` 「把其中一个**乘数**24看成了42」,
    `bnu-primary-ds-v1-p4-178` 「下面哪个算式的积大于第一个**乘数**？」.
  - `圆柱体` / `圆锥体` / `球体` (textbook terms are 圆柱/圆锥/球) —
    **35 items** (bnu-primary 27, hjb-primary 7, bnu-junior 1), e.g.
    `bnu-primary-ds-v1-p6-148` option 「B. 圆锥的体积等于**圆柱体积**的三分之一」,
    `bnu-primary-ds-v1-p1-174` answer 「因为篮球是**球体**」.
  - `公里` where textbooks use **千米** — **9 items**, all the same taxi-fare
    template (`bnu-junior-ds-v1-s2-124/128/130/151`,
    `hjb-junior-ds-v2-s2-386/396/406/421/430`).
  - `数线` (Taiwan term for 数轴) — **2 items**,
    `bnu-primary-ds-v2-p4-100`, `bnu-primary-ds-v2-p4-139`: 「在**数线**上，
    点 A 表示 -3…」. (The rest of the corpus correctly uses 数轴.)
  - `因子` where mainland says 因数/因式 — **1 item**,
    `hjb-junior-ds-v2-s2-122` 「注意提取完全平方**因子**」.
- **verified clean** (0 occurrences, whole corpus): 公斤, 公分, 公尺, 公升 in
  learner text, 素数, 机率/或然率, 方程式, 座標/座标, 聯集/联集, 空集合,
  畢氏定理, 直式, 周界, 被加数, 擴分, 英制单位, 「」/『』. 集合/函数/方程/
  概率/平均数/众数/中位数/正方体/长方体/圆柱/数轴/因数/倍数/质数/被减数/
  被除数/商/余数/分子/分母/最简分数/通分/约分/千克/米/厘米/毫米 are all used
  in their mainland forms. `Rt△ABC` and `∽`/`≌` follow mainland convention.
- fix: 乘数→因数; 圆柱体→圆柱; 公里→千米; 数线→数轴; 因子→因数.

### F20 — Chain-of-thought / answer leakage in prompts: essentially absent
- severity: **minor** (negative finding, reported for completeness)
- category: `pedagogy`
- affected: I searched all 17,700 prompts for 首先 / 第一步 / 我们先 / 让我们 /
  接下来我们 / 由此可得 / 因为…所以 / 解：/ 答：/ 证明：/ 最终答案 / 答案是.
  - `首先/第一步/…` — **5 items**, and all five are legitimate item content,
    not leakage (`bnu-junior-ds-v1-s1-184` 「解方程…时，**第一步**去括号正确的是
    （ ）」 asks *about* the first step).
  - `因为…所以` — **18 items**, all quoting a fictional student's reasoning for
    the learner to critique (`bnu-junior-ds-v1-s1-231` 「小明说："**因为**选择运动
    的人数最多，**所以**全…"」) — correct 说理 pedagogy.
  - `答案是` — **5 items**, all "他写的答案是…请分析错误" 错题 items.
  - `解：/答：/证明：` opener, `由此可得` — **0 items**.
  - answer string appearing verbatim in a non-MC prompt — 583 raw hits, but
    after excluding coincidental short numerals only 267 remain and the
    sample I read is dominated by legitimate cases (`两个角互余，其中一个角是
    45°。求另一个角` — the answer *is* 45°). I do **not** report this as a
    defect class; it needs item-level mathematical review, not a text rule.
  - 80 fill-in prompts do show a worked equation (`bnu-primary-ds-v1-p1-137`
    「用"凑十法"计算8+6：先把6分成2和4，8+2=10，10+4=14。请填空：8+6=____。」),
    which is intended 教学 scaffolding in 一年级, not leakage.
- conclusion: the corpus does not leak solutions into prompts. The leakage
  problem is the reverse direction — pipeline metadata leaking *in* (F4/F5).

---

## Slice health verdict

**Not shippable to mainland learners as-is — no slice is clean, and four are
disqualified by a single systemic defect each.** `bnu-high` is 100 % blocked:
every one of its 1,500 prompts opens with the internal batch id `题组sN-NNN：`.
`pep-high` is 50 % blocked: 2,400 items print the generator's card taxonomy
(`RAG-v3 …任务：`, `原创…练习 N：`) in the 题干 and its English error tags
(`sign chart interval error`) in the 解析. `bnu-primary` and `hjb-primary` ship
a grading key that is 30–47 % polluted with traditional Chinese, `term-XXXX`
placeholders and machine-English, and their P1–P3 prompts run 1.8× the length
of the pep-primary items at the same grade (max 243 characters for 一年级).
`pep-primary` and `pep-junior` are the cleanest on language but carry the
blocker-class answer keys (`sphere`, `Quadrant IV`, `3 R 5`, `39 cm`).

The encouraging half: **terminology is genuinely mainland** — 65 deviating
items in 17,700 (0.4 %), no Taiwan/HK vocabulary of consequence, and **zero
traditional characters in any prompt, option or explanation** (the pre-scan's
294 suspected leaks were all the simplified character 限). Prompts do not leak
solutions. So the corpus does not need a linguistic rewrite; it needs (1) a
strip pass on the four metadata families in F4/F5, (2) a purge and
regeneration of `acceptedAnswers`, (3) an answer-key normalisation pass
(F6/F7/F8/F9/F10/F11), and (4) a rewrite of the 229 over-length P1–P3 items.
Items (1)–(3) are mechanical and cover ~7,900 items (44.9 % of the corpus);
item (4) is editorial.
