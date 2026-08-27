# Item design quality & variety — 9 mainland China slices (17,700 items)

Scope: assessment **design** quality — variety, distractor construction, answer
predictability, difficulty calibration, item-type mix, misconception use,
explanation quality. Mathematical correctness of individual items is owned by
other agents and is not re-adjudicated here.

## Coverage

**Programmatic (exact, no sampling):** every statistic below was computed over
**all 17,700 items** in all 9 slices (`SPDIR/slices/*.jsonl`), plus the
**11 raw mainland question packs** under
`/Volumes/Starship/MAIS-MVP/data/generated-content/mainland-*/` (15,900 raw
records) for the misconception-tag work, plus the runtime code path
(`components/practice/PracticeQuestionCard.tsx`, `types/index.ts`,
`lib/adaptiveLearning.ts`, `lib/difficulty.ts`) to confirm how options and tags
are actually consumed. Scripts:
`SPDIR/ped/{lib,t1_skel,t1b_topic20,t2_mc,t2b_offsets,t2c_exploit,t3_fillin,t4_diff,t5_mix,t5b_typelabel,t6_misc,t7_expl,t7b_expqual,t7c_fix,t8b,t8c,t9_final,t10,t11,t12,t13}.py`.

**Items I read in full (196 total)** — used only for the qualitative
explanation classification (F9) and for verifying every quoted example:

| slice | read | how selected |
|---|---|---|
| pep-primary | 24 | 20 stratified random (seed 424242) + 4 targeted (heuristic-solvable topic) |
| pep-junior | 24 | 20 stratified random + 4 targeted |
| pep-high | 25 | 12 stratified random + 6 "explanation never reaches answer" + 4 targeted + 3 scaffold |
| bnu-primary | 38 | 30 stratified random (5 per grade P1–P6, seed 20260826) + 8 option-letter checks |
| bnu-junior | 19 | 15 stratified random (5 per grade S1–S3) + 4 QA-leak items |
| bnu-high | 7 | 4 targeted + 3 scaffold |
| hjb-primary | 30 | stratified random, 5 per grade P1–P6 |
| hjb-junior | 7 | stratified random S1 (5) + S2 (2) |
| hjb-high | 22 | 18 whole-topic dumps (3 topics × 6) + 4 targeted |

**Not covered:** I did not verify the arithmetic of individual items (other
agents' scope); I did not read diagrams/`questionAssets`; the "diagnostic
distractor" test in F8 runs only on **numeric** MC options, which is 1,373 of
6,520 MC items — the Chinese-text-option MC items could not be machine-tested
for misconception alignment; the explanation classification in F9 is from the
196-item read sample, not the full corpus, and is reported as such.

---

## Findings

### F1 — pep-high: the correct option is A in **100%** of its multiple-choice items; bnu-high: B in **100%**
- severity: blocker
- category: pedagogy
- affected: all 1,620 pep-high MC items (`pep-high-s4-*-mc-*`, `-s5-`, `-s6-`);
  all 525 bnu-high MC items (`bnu-high-ds-v1-s4/s5/s6-*`). 2,145 items.
- evidence: position of the correct option among the 4 stored options,
  computed over every MC item:

| slice | MC | A% | B% | C% | D% | χ²(3) | always-best-position score |
|---|---|---|---|---|---|---|---|
| pep-high | 1620 | **100.0** | 0.0 | 0.0 | 0.0 | 4860.0 | **100.0%** |
| bnu-high | 525 | 0.0 | **100.0** | 0.0 | 0.0 | 1575.0 | **100.0%** |
| bnu-primary | 1200 | 44.4 | 30.3 | 18.7 | 6.6 | 376.7 | 44.4% |
| bnu-junior | 525 | 44.0 | 29.9 | 18.7 | 7.4 | 154.1 | 44.0% |
| hjb-junior | 600 | 39.7 | 27.8 | 22.3 | 10.2 | 108.1 | 39.7% |
| hjb-primary | 600 | 37.2 | 36.7 | 18.3 | 7.8 | 149.6 | 37.2% |
| hjb-high | 600 | 28.3 | 24.2 | 24.0 | 23.5 | 3.6 | ns |
| pep-primary | 335 | 25.7 | 24.2 | 24.5 | 25.7 | 0.2 | ns |
| pep-junior | 333 | 23.7 | 24.0 | 25.5 | 26.7 | 0.8 | ns |

  It holds uniformly per grade (pep-high S4/S5/S6 = 100.0/100.0/100.0% A;
  bnu-high S4/S5/S6 = 100.0/100.0/100.0% B).
- why: `components/practice/PracticeQuestionCard.tsx:642` renders
  `(question.options ?? []).map(...)` in stored array order. There is **no
  shuffle anywhere in the question path** (the only `shuffle` in the repo is
  `MathMatchQuestGame.tsx`'s board). So the stored index *is* the rendered
  position. A learner who clicks the first tile every time scores **100%** on
  every pep-high MC item and **0%** on every bnu-high one, without reading a
  single question. Worse than a wasted item: every correct attempt writes
  mastery gain (`lib/server/practiceAttemptStore.ts:395`, `masteryDelta = +0.08`)
  and advances the adaptive state, so the product will report S4–S6 mastery
  that the learner does not have.
- fix: (a) shuffle options at serve time with a per-(user,item) deterministic
  seed, so the position carries no signal and the item stays stable on reload;
  (b) independently, re-randomise the stored `options` arrays so the data itself
  is not a single-position bank; (c) add a CI gate asserting the correct-option
  position distribution per slice is within ±5pp of 25% (χ²(3) < 7.81).

### F2 — "pick the 2nd-smallest number" beats the whole high-school bank
- severity: blocker
- category: pedagogy
- affected: 1,436 pep-high, 478 bnu-high, 498 hjb-high numeric MC items (2,412).
- evidence: rank of the correct answer among the four options sorted numerically:

| slice | numeric MC | rank1% | **rank2%** | rank3% | rank4% |
|---|---|---|---|---|---|
| pep-high | 1436 | 0.0 | **100.0** | 0.0 | 0.0 |
| bnu-high | 478 | 0.0 | **100.0** | 0.0 | 0.0 |
| hjb-high | 498 | 0.0 | **99.0** | 1.0 | 0.0 |

  The cause is a fixed distractor formula `{a−d, a, a+d, a+2d}`, which matches
  **100.0%** of pep-high, **100.0%** of bnu-high and **96.2%** of hjb-high
  numeric MC items. Concretely `hjb-high-ds-v2-s5-432`:
  > 等差数列首项为 8，公差为 1，求第 12 项。 options `['20','18','19','21']`, answer `19`
  and `hjb-high-ds-v2-s6-001`:
  > 函数 f(x)=11x²+13，求 f'(5)。 options `['121','110','99','132']`, answer `110`
  (= a−11, a, a+11, a+22).
- why: with a rigid arithmetic-progression distractor set the answer is
  algebraically determined by the option values alone. Corpus-wide, a strategy
  of "click the 2nd-smallest number, else the first option" scores
  **4,079 / 6,338 = 64.4%** of all scorable MC items in the mainland bank —
  and 100 / 91 / 89% on pep-high / bnu-high / hjb-high. Every one of these
  distractors is also pedagogically empty: ±1 and ±2 are not errors a student
  actually makes on 复数实部 or 导数代入.
- fix: generate each distractor from a named error process, not an offset —
  e.g. for `a_n=a_1+(n−1)d` use the off-by-one `a_1+nd`, the swapped
  `a_1·(n−1)+d`, and the "forgot the +a₁" `(n−1)d`. Add a gate rejecting any
  MC item whose four numeric options form an arithmetic progression.

### F3 — A-position bias in the four primary/junior banks (37–44% vs 25% chance)
- severity: major
- category: pedagogy
- affected: bnu-primary 1200, bnu-junior 525, hjb-primary 600, hjb-junior 600 =
  2,925 items.
- evidence: table in F1. Every one of these four slices is significant at
  p < .001 (χ²(3) = 376.7 / 154.1 / 149.6 / 108.1). Worst single grade:
  `bnu-primary` P2 = **52.0% A**, `hjb-primary` P6 = **55.0% A**.
- why: a primary-school guesser scores 1.5–2.2× chance. Below the
  4-option floor this is a smaller exploit than F1/F2, but it still corrupts
  every mastery estimate derived from a P1–S3 multiple-choice attempt.
- fix: same serve-time shuffle as F1; the position gate should run per slice
  **and per grade**.

### F4 — Template monotony: 24 hjb-high topics have exactly **one** prompt skeleton for the entire topic
- severity: major
- category: variety
- affected: 1,187 items in 24 hjb-high topics with a single skeleton; 4,345
  items in 73 topics (n≥20) where 20 consecutive items yield fewer than 5
  distinct skeletons (pep-primary 20 topics, pep-junior 10, bnu-high 19,
  hjb-high 24).
- evidence: I clustered prompts three ways and improved on the brief's crude
  count. **L1 = surface skeleton** (digits masked). **L2 = solution-method
  skeleton** (`type` + number-masked *explanation*, i.e. how many distinct
  solution methods exist). **L3 = structural** (L1+L2 with CJK runs collapsed,
  leaving only the maths frame). Gini is over cluster sizes.

| slice | n | L1 | L2 | L3 | reuse(L1) | Gini(L1) | Gini(L2) |
|---|---|---|---|---|---|---|---|
| pep-primary | 1200 | 161 | **62** | 98 | 7.5× | 0.731 | 0.479 |
| pep-junior | 1200 | 39 | **41** | 47 | 30.8× | 0.281 | 0.322 |
| pep-high | 4800 | 2328 | 778 | 966 | 2.1× | 0.441 | 0.428 |
| bnu-primary | 3000 | 2963 | 2974 | 2876 | 1.0× | 0.012 | 0.009 |
| bnu-junior | 1500 | 1489 | 1485 | 1487 | 1.0× | 0.007 | 0.010 |
| bnu-high | 1500 | 78 | **77** | 88 | 19.2× | 0.476 | 0.509 |
| hjb-primary | 1500 | 1465 | 1481 | 1484 | 1.0× | 0.023 | 0.013 |
| hjb-junior | 1500 | 1418 | 1416 | 1444 | 1.1× | 0.053 | 0.055 |
| hjb-high | 1500 | 241 | 281 | 280 | 6.2× | **0.790** | 0.707 |

  Worst grades: **hjb-high S5 = 8 skeletons for 500 items**, **bnu-high S6 = 9
  for 500**, **pep-junior S3 = 7 for 400**, pep-primary P4/P5 = 6 solution
  methods for 200 items each (top-5 methods cover 98.0% / 95.0% of the grade).

  **The practical question — "practise 20 items in a topic, how many
  structurally different items do you see?"** I computed the exact expectation
  E[distinct clusters] for a simple random sample of 20 drawn without
  replacement from each topic's pool (335 topics), item-weighted per slice:

| slice | topics | E[distinct skeletons in 20] | E[distinct methods in 20] | worst topic |
|---|---|---|---|---|
| bnu-junior | 35 | **19.93** | 19.91 | 19.22 |
| bnu-primary | 97 | **19.87** | 19.90 | 17.45 |
| hjb-junior | 22 | **19.59** | 19.55 | 18.80 |
| hjb-primary | 70 | **19.10** | 19.20 | 16.00 |
| pep-high | 22 | **17.45** | 15.24 | 16.67 |
| bnu-high | 24 | **4.11** | 4.06 | 2.00 |
| hjb-high | 30 | **3.96** | 5.61 | **1.00** |
| pep-primary | 24 | **3.79** | 2.39 | 1.80 |
| pep-junior | 11 | **3.49** | 3.45 | 3.00 |

  Worst topics by id (E[distinct in 20] = 1.00 — the learner sees the *same*
  template 20 times in a row): all 24 hjb-high topics, e.g.
  `hjb-high-s4-复数` (62 items), `hjb-high-s5-数列` (70),
  `hjb-high-s6-导数及其运用` (75), `hjb-high-s5-圆锥曲线` (70),
  `hjb-high-s6-计数原理` (75), `hjb-high-s6-数列综合复习` (25),
  `hjb-high-s6-函数-导数与不等式综合` (20).
  Then `pep-primary-p1-upper-number-sense` (1.80, n=50),
  `pep-primary-p3-upper-operations-fractions` (1.80, n=50),
  `pep-primary-p6-lower-negative-review` (1.99, n=50),
  `bnu-high-s4-立体几何初步` (2.00, n=35),
  `pep-primary-p5-lower-volume-data` (2.20, n=50),
  `pep-primary-p2-upper-multiplication-arrays` (2.60, n=50).
  > `hjb-high-s4-复数`, all 62 items: 复数 z=(4+1i)+(5−1i)，求 z 的实部。 /
  > 复数 z=(10+11i)+(14−11i)，求 z 的实部。 / 复数 z=(7+2i)+(9−2i)，求 z 的实部。
  The imaginary part always cancels by construction, so a 高一 student who
  works this whole topic never once handles a complex number with a surviving
  imaginary part.
- why: 20 items of one template is drilling one keystroke, not learning a
  concept; it cannot discriminate mastery from pattern-matching, and it is far
  from any mainland 同步练习 or 单元卷, which vary 数式/图形/应用 within a unit.
- fix: set a per-topic floor — a topic of n items must carry at least
  `max(6, n/8)` distinct L2 solution skeletons, gated in CI on the exact
  E[distinct-in-20] statistic (target ≥ 10). For `hjb-high-s4-复数`
  specifically, the topic needs 求虚部 / 求模 / 共轭 / 乘除 / 化简 i 的幂次
  variants, not 62 copies of "实部相加".

### F5 — Fill-in answers are recoverable from the prompt without doing the mathematics
- severity: major
- category: pedagogy
- affected: **1,446 of 6,010 fill-in items (24.1%)** corpus-wide are solved by
  at least one of 16 fixed surface heuristics applied to the numbers in the
  prompt (a±b, a×b, a÷b, sum, product, max, min, max−min, first, last, …).
- evidence:

| slice | fill-in | solved by a fixed heuristic | share | strongest single heuristic |
|---|---|---|---|---|
| pep-junior | 400 | 166 | **41.5%** | `prod` 37.3% of numeric answers |
| pep-primary | 450 | 171 | **38.0%** | `a+b` / `sum` 52.8% of numeric answers |
| hjb-high | 525 | 194 | **37.0%** | `prod` 21.9% |
| pep-high | 1590 | 351 | 22.1% | `last` 6.4% |
| hjb-junior | 525 | 103 | 19.6% | `max` 11.7% |
| bnu-high | 450 | 84 | 18.7% | `l2diff` 6.5% |
| bnu-primary | 1080 | 198 | 18.3% | `max−min` 8.4% |
| hjb-primary | 540 | 99 | 18.3% | `prod` 11.0% |
| bnu-junior | 450 | 80 | 17.8% | `max−min` 7.3% |

  Topics where **one** heuristic solves ≥ 94% of the fill-ins:
  `pep-junior-s3-lower-inverse-similarity-trigonometry` (100%, n=67, `prod`;
  e.g. `pep-junior-v2-s3-k11-fi-001`),
  `pep-high-s4-trigonometry` (100%, n=54, `last`; `pep-high-s4-fi-005`),
  `pep-primary-p4-lower-decimals-average` (100%, n=50, `a+b`;
  `pep-primary-p4-l-fi-101`),
  `pep-junior-s1-lower-lines-coordinates` (100%, n=33, `sum`),
  `pep-primary-p3-upper-measurement-time-geometry` (100%, n=25, `max−min`),
  `hjb-high-s6-概率初步续` (100%, n=25, `a×b`; `hjb-high-ds-v2-s6-152`),
  `bnu-high-s5-圆锥曲线` (100%, n=24, `l2diff`; `bnu-high-ds-v1-s5-075`),
  `pep-junior-s1-upper-rational-numbers` (100%, n=23, `b−a`),
  `hjb-high-s5-圆锥曲线` (100%, n=23, `a−b`),
  `pep-junior-s1-upper-geometric-figures` (100%, n=22, `first÷2`),
  `hjb-high-s4-复数` (100%, n=19, `sum`),
  `hjb-high-s5-空间直线与平面` (100%, n=18, `a×b`),
  `hjb-high-s4-三角` (94.7%, n=19, `a×b`).
  > `pep-high-s4-fi-005`: 对于 \(y=1\sin 3x\)，写出正弦函数内部 \(x\) 的系数。 answer `3`
  — the answer is literally the last number printed in the prompt, for all 54
  fill-ins in that topic (and the topic only ever uses answers 1/3/2).
- evidence (answer-value clustering): answer values are also highly
  concentrated. Distinct numeric fill-in answers per slice: bnu-high **46**
  values for 402 items, pep-high **99** for 1464, bnu-junior 70 for 219,
  hjb-junior 74 for 299. Guessing the single most common answer scores
  6–8% in most slices. 22.7–37.1% of numeric answers are multiples of 5.
- why: an item whose answer can be produced by a surface rule ("multiply the
  two numbers you see") does not assess the intended 知识点; it assesses
  pattern spotting. `hjb-high-s5-圆锥曲线` reduces 圆锥曲线 to "subtract the
  last two numbers", and `bnu-high-s5-圆锥曲线` items all fix `b²=9`.
- fix: within a topic, vary which quantity is unknown (给 c² 求 b²; 给 2a 求 a),
  include items where the surface rule gives the wrong value, and gate on the
  heuristic-solvable share per topic (< 30%).

### F6 — Difficulty labels (Low/Medium/High) are not calibrated to anything measurable
- severity: major
- category: pedagogy
- affected: all 17,700 items.
- evidence: Spearman ρ between the ordered tag and six measurable proxies,
  over every item in each slice:

| slice | maxOperand | #numbers | explLen | #operators | #steps | promptLen |
|---|---|---|---|---|---|---|
| pep-primary | **−0.218** | 0.269 | 0.173 | 0.348 | — | −0.100 |
| pep-junior | −0.051 | 0.089 | −0.146 | −0.116 | 0.176 | 0.362 |
| pep-high | 0.003 | −0.151 | −0.031 | 0.093 | 0.015 | −0.030 |
| bnu-primary | 0.104 | 0.197 | 0.214 | 0.136 | 0.174 | 0.219 |
| bnu-junior | 0.047 | 0.113 | 0.102 | 0.092 | 0.088 | 0.207 |
| bnu-high | −0.073 | 0.164 | 0.087 | 0.230 | −0.109 | 0.161 |
| hjb-primary | 0.108 | 0.105 | 0.243 | 0.156 | 0.172 | 0.231 |
| hjb-junior | 0.098 | 0.179 | 0.101 | 0.143 | 0.014 | 0.224 |
| hjb-high | −0.108 | 0.009 | 0.012 | 0.018 | 0.079 | 0.064 |

  No |ρ| exceeds 0.37; only three of 53 exceed 0.25. **pep-primary is
  inverted**: median max operand is 24 for `Low` and 8 for `High`.
  **hjb-high is flat**: median explanation length 24 / 24 / 24 chars and median
  max operand 13 / 13 / 12 for Low / Medium / High.

  Direct proof the tag is assigned at random rather than derived from the item:
  among prompt skeletons occurring ≥6 times, the share carrying **more than one**
  difficulty tag is hjb-high **95.0%** (and 95.0% carry *all three*), bnu-high
  **87.5%** (53.1% all three), pep-primary 54.8%. That covers 80.8% of hjb-high
  items and 86.1% of bnu-high items. Stronger still: **237 hjb-high items and
  240 pep-primary items have byte-identical prompt text under conflicting
  difficulty tags** (82 prompt groups in each slice).
  > `bnu-high-ds-v1-s5-075` [Low] 椭圆满足 a²=16, b²=9，求 c²  → 7
  > `bnu-high-ds-v1-s5-078` [High] 椭圆满足 a²=15, b²=9，求 c² → 6
  > `bnu-high-ds-v1-s5-081` [Medium] 椭圆满足 a²=14, b²=9，求 c² → 5
- why: `Difficulty` drives item selection, the adaptive ladder
  (`lib/adaptiveLearning.ts` `isChallengeDifficulty`) and the learner-visible
  difficulty filter. If the tag is noise, the ladder is noise. pep-high is
  additionally degenerate: **76.7% of its 4,800 items are tagged `High`**
  (entropy 0.922 bits of a possible 1.585), so the filter cannot separate
  anything.
- fix: derive difficulty from item structure (operand magnitude band, number of
  distinct steps in the worked solution, whether the unknown is in a
  non-canonical position) rather than assigning it per position; add a gate
  that fails when one prompt skeleton spans all three tags, and when identical
  prompt text carries different tags.

### F7 — There is no 解答题 anywhere in the bank; the item-type label is assigned by a round-robin
- severity: major
- category: pedagogy
- affected: all 5,145 items typed `short-answer`; acutely the 2,490 高中
  short-answers (pep-high 1590, bnu-high 525, hjb-high 375).
- evidence (mix per slice per grade — the mix itself is defensible):
  pep-primary shifts 45/40/15 (P1) → 30/35/35 (P6) MC/fill/short;
  pep-junior and pep-high sit at ≈33/33/33; bnu-primary and hjb-primary at
  40/36/24; bnu-junior, bnu-high at 35/30/35; hjb-junior, hjb-high at 40/35/25.
  That is broadly in line with 选择/填空/解答 proportions on a mainland 单元卷.

  But the `short-answer` label does not correspond to a 解答题:

| slice | short-answer n | answer is a bare number | worked solution ≥3 steps (boilerplate stripped) | median prompt chars, MC / fill / short |
|---|---|---|---|---|
| pep-high | 1590 | **95.2%** | 51.7% | 65 / 65 / 66 |
| bnu-high | 525 | **91.0%** | **2.3%** | 44 / 46 / 40 |
| hjb-high | 375 | **73.3%** | 16.0% | 28 / 30 / 33 |
| pep-primary | 300 | 36.7% | **0.0%** | 24 / 23 / 22 |
| pep-junior | 400 | 30.2% | **0.0%** | 24 / 27 / 33 |
| bnu-primary | 720 | 18.2% | 65.8% | 39 / 48 / 52 |
| hjb-primary | 360 | 23.3% | 71.7% | 38 / 46 / 51 |
| bnu-junior | 525 | 12.6% | 76.2% | 58 / 63 / 71 |
| hjb-junior | 375 | 25.6% | 69.9% | 47 / 48 / 54 |

  And the label is literally positional. Reading each slice in file order, the
  type sequence is a strict repeating cycle over long stretches:
  bnu-junior and bnu-high run `m,s,f` for **453 consecutive items**;
  hjb-junior and hjb-high run `m,f,s` for **378**; bnu-primary and hjb-primary
  for **183**; pep-high runs `s,s` for 266. In hjb-high, **85.1% of items sit
  under a prompt skeleton that also appears under a different type**, and 7.1%
  of its skeletons appear under all three types.
  > `hjb-high-ds-v2-s6-001` [multiple-choice] 函数 f(x)=11x²+13，求 f'(5)。
  > `hjb-high-ds-v2-s6-002` [fill-in] 函数 f(x)=5x²+7，求 f'(15)。
  > `hjb-high-ds-v2-s6-003` [short-answer] 函数 f(x)=9x²+7，求 f'(13)。
  Three "different item types", one item.
- why: 解答题 is where the mainland exam actually lives — 需写出文字说明、证明
  过程或演算步骤, and it is the only place 数学表达 and 逻辑推理 are assessed.
  A 高三 learner preparing for 高考 gets **zero** 解答题 practice from bnu-high
  (91% bare-number answers, 2.3% multi-step solutions) or hjb-high. The bands
  to flag as having no real 解答题 are **bnu-high S4–S6, hjb-high S4–S6,
  pep-primary P1–P6 and pep-junior S1–S3** (0.0% of their "short-answer" items
  carry a ≥3-step solution). bnu/hjb primary and junior are the only slices
  where the label means something (66–76% multi-step).
- fix: stop assigning `type` by index. Author 解答题 as their own items with a
  多问 structure ((1)(2)(3)), a required 过程, and a rubric; at minimum, gate
  that a `short-answer` item's reference solution has ≥3 steps and its answer is
  not a bare number.

### F8 — `misconceptionTags` are decorative: topic-level constants, in English, dropped before the learner path — and where they *do* surface, they surface as raw English inside Chinese prose
- severity: major
- category: pedagogy
- affected: 9,000 items whose source pack carries tags; 8,700 items whose source
  carries none; 1,500 pep-high items that print an English misconception string
  to the learner.
- evidence:
  1. **Coverage is partial.** Tagged packs: bnu-primary v1+v2 (3,000),
     bnu-junior (1,500), bnu-high (1,500), hjb-primary (1,500), hjb-junior
     (1,500) — 100% of records tagged. **Untagged**: all four
     `mainland-hjb-high-generated-bank-v1..v4` packs (0%),
     `mainland-pep-junior-generated-bank-v2-1200` (0%), and pep-primary /
     pep-high, which are hand-authored TS with no such field.
  2. **The tag is a topic-level constant, not an item property.** Mean number of
     *distinct* tag-sets per topic: bnu-primary **1.00** (97 topics),
     bnu-junior **1.00** (35), hjb-primary **1.00** (70), hjb-junior **1.00**
     (22), bnu-high 1.17 (24). Every item in a topic carries the identical list,
     so no tag can discriminate between two items, let alone between two
     distractors.
     > `bnu-primary-ds-v1-p1-001` and `-002` (an MC and a fill-in on different
     > skills) both carry `["counting sequence without matching objects",
     > "last counting word not linked to total quantity",
     > "zero treated as a normal counting object"]`.
  3. **100% of the tag strings are ASCII English** in a zh-Hans bank (162 / 104 /
     271 / 65 / 207 distinct strings per pack).
  4. **The field never reaches the learner path.** The runtime `Question` type
     (`types/index.ts:1792`) has no `misconceptionTags`. What
     `lib/adaptiveLearning.ts:140` calls `misconceptionTags` is *synthesised* —
     `` `${topicId}-concept-gap` `` plus `` `${type}-error` `` — and
     `lib/server/practiceAttemptStore.ts:398` writes the literal
     `["needs-review"]` on every wrong answer. The authored pedagogy is
     discarded at the pack→runtime boundary.
  5. **Distractors do not encode the tagged misconception.** On the numeric MC
     items that can be machine-tested, the share whose distractor set is purely
     mechanical (`answer ± k`, k ≤ 4) is bnu-high **96.4%**, bnu-junior 71.4%,
     hjb-junior 39.7%, bnu-primary v1 21.8% / v2 18.8%, hjb-primary 21.8%.
  6. **Where a tag does reach the learner it is a raw English fragment glued to
     a Chinese sentence.** 1,500 pep-high explanations (31.3% of the slice) end
     with `…并提醒避免<English phrase>。`, 54 distinct phrases:
     > `pep-high-s4-rag3-fi-115`: …训练概念辨析，并提醒避免imaginary unit power cycle error。
     > `pep-high-s6-rag3-fi-006`: …训练综合压轴题，并提醒避免binomial term index error。
     > `pep-high-s4-rag3-mc-099`: …训练建模应用，并提醒避免coordinate decomposition mismatch。
- why: 错因分析 is the single highest-value feature of a Chinese practice bank —
  it is what turns a wrong answer into a 错题本 entry. Here it is metadata that
  is authored, never wired, never reflected in a distractor, and when it does
  render it renders in a language the learner does not read.
- fix: (a) move the tag from topic level to the *distractor* level — each MC
  option carries the misconception it diagnoses; (b) translate the vocabulary to
  zh-Hans (762 distinct tag strings across the five tagged packs); (c) add
  `misconceptionTags` (or a `distractorRationale` map) to `Question` and feed
  the real value into `practiceAttemptStore` instead of `"needs-review"`;
  (d) strip the English fragment from the 1,500 pep-high explanations.

### F9 — Explanations in pep-high / bnu-high / hjb-high do not teach; pep-high prints a generic topic blurb that never solves the item
- severity: major
- category: pedagogy
- affected: 4,800 pep-high, 1,500 bnu-high, 1,500 hjb-high items.
- evidence (full-corpus measures):
  - **Explanation reaches the answer** (numeric-normalised — does the worked
    text actually produce the answer value?): bnu-high 100.0%, hjb-high 98.5%,
    pep-junior 97.2%, hjb-junior 92.0%, pep-primary 91.1%, bnu-junior 89.1%,
    bnu-primary 86.0%, hjb-primary 85.9%, **pep-high 70.9%** — i.e. **1,397
    pep-high items whose 解析 never arrives at the answer**.
  - **Item-specific vs generic** (does the explanation body, after stripping
    boilerplate, reuse any number from its own prompt?): pep-primary 100.0%,
    hjb-primary 96.0%, hjb-high 95.8%, hjb-junior 95.2%, bnu-high 94.9%,
    bnu-primary 93.9%, bnu-junior 92.4%, pep-junior 91.8%, **pep-high 48.4%**
    (S4 **26.6%**, S6 38.6%, S5 80.0%). Over half of pep-high explanations would
    print identically for any item in the topic.
  - **How few explanations serve a whole pep-high topic**:
    `pep-high-s4-complex-numbers`, `-plane-vectors`, `-probability`,
    `-solid-geometry-intro`, `-statistics`, `-trigonometry` each have **3
    distinct explanation bodies for 160 items**, with 88.8–90.0% of items
    sharing the single most common one.
  - **900 pep-high explanations (18.8%)** carry a marketing sentence
    (`这道 MAIS 原创练习同时训练…，解完后要回到题设条件复核。`, 5 variants)
    that inflates length while teaching nothing.
  - **Length**: median explanation length is 21–24 chars in bnu-high (55–78% of
    items ≤ 25 chars) and 23–24 in hjb-high S5/S6 (66.6% / 69.2% ≤ 25 chars);
    15–27 chars across pep-primary (100% of P1 and P3 ≤ 25 chars). By contrast
    bnu-junior/hjb-junior sit at 60–68 chars median.
- evidence (classification, **stated sample: 89 explanations read in full** —
  20 pep-primary, 20 pep-junior, 12 pep-high stratified random seed 424242;
  22 hjb-high, 7 bnu-high, 8 targeted). Classes: **T** = names a rule/formula
  and applies it; **R** = restates the arithmetic only; **A** = generic or
  answer-only, does not produce the answer from this item's data.

| slice | sample | T (teaches) | R (restates) | A (no method) |
|---|---|---|---|---|
| pep-primary | 20 | 15 (75%) | 5 (25%) | 0 |
| pep-junior | 20 | 18 (90%) | 2 (10%) | 0 |
| pep-high | 12 | **0 (0%)** | 5 (42%) | **7 (58%)** |
| bnu-high | 7 | 2 (29%) | 5 (71%) | 0 |
| hjb-high | 22 | 4 (18%) | 18 (82%) | 0 |
| bnu-primary / bnu-junior / hjb-primary / hjb-junior | 82 (read separately) | high — genuine multi-step 解析 with 验算 and 错因 commentary | — | — |

  > `pep-high-s5-fi-066`: 已知 \(\vec a=(3,5,3)\)，\(\vec b=(5,6,5)\)，求 \(\vec a\cdot\vec b\)。 answer `60`
  > explanation: 数量积是对应坐标乘积之和；模长平方是各坐标平方之和。
  > `pep-high-s4-fi-008`: 一个长方体的三条棱长为 \(5, 3, 6\)。求它的体积。 answer `90`
  > explanation: 根据题意使用长方体表面积、体积公式，或空间勾股关系。
  > `pep-high-s6-rag4-sa-099` (a **parabola** item): …椭圆中使用 \(c^2=a^2-b^2\) 和长轴长 \(2a\)；抛物线 \(y^2=2px\) 可直接读出 \(p\)。
- why: the explanation is the only teaching surface the product has after a
  wrong answer. A 高三 learner who gets 数量积 wrong is told the definition of
  数量积 — which they already read in the prompt — and never sees
  3×5+5×6+3×5=60. The slices to flag as **non-teaching** are
  **pep-high (all grades, worst at S4), bnu-high S4–S6, hjb-high S5–S6**.
  bnu-primary, bnu-junior, hjb-primary and hjb-junior are the opposite — their
  解析 name the rule, show the steps, add 验算 and often call out the
  misconception ("不能直接读11，要减去起点刻度") — this is publishable quality.
- fix: require every explanation to contain at least one number from its own
  prompt and to end at the answer value (both are cheap CI gates); delete the
  `MAIS 原创练习` sentence; rewrite the 113 distinct generic bodies that
  currently stand in for 2,476 pep-high explanations into per-item worked
  solutions.

### F10 — 115 bnu-junior items ship internal QA-review commentary as the learner-facing 解析, and 70 of them tell the learner the answer is wrong
- severity: blocker
- category: pedagogy
- affected: 115 bnu-junior items (S1 32, S2 53, S3 30; short-answer 44,
  fill-in 39, multiple-choice 32). e.g. `bnu-junior-ds-v1-s1-014`, `-017`,
  `-019`, `-026`.
- evidence:
  > `bnu-junior-ds-v1-s1-014`, answer `（1）10个面；（2）20条棱；（3）12个顶点`
  > explanation: 根据题意复核计算，正确结果为（1）10个面；（2）20条棱；（3）12个顶点。 **复核要点**：两个正方体拼接时，重合面消失，面数为10正确；但棱数计算错误：每个正方体12条棱，拼接处有4条棱重合，总棱数应为12+12-4=20，**而非24**；顶点数：…总顶点数应为8+8-4=12，**而非16**。

  > `bnu-junior-ds-v1-s1-026`, answer `√145 cm`
  > explanation: 根据题意复核计算，正确结果为√145 cm。 复核要点：…其中√145≈12.04最小，**但答案却给出√185，与解释矛盾，**

  > `bnu-junior-ds-v1-s1-019`
  > explanation: …总数为5，**似乎可行？但需验证：**若前排第1列2个…

  Counts: 115 items match `复核要点|根据题意复核计算`; **70** of those also
  assert that a stated answer/option is wrong (`而非|应为|不唯一|与…矛盾`);
  **28 end mid-sentence** (no terminal punctuation — the reviewer's note was
  truncated). Median explanation length for these items is 105 chars vs 64 for
  the rest of the slice.
- why: this is reviewer scratch text in production. The learner is shown a
  paragraph arguing with the answer key they were just graded against — it
  destroys trust, and in 70 cases it is an on-screen admission that the
  displayed `correctAnswer` is wrong. Independently of whether the maths is
  right, no learner may see this.
- fix: these 115 explanations must be regenerated from the corrected answer
  before ship. Add a CI gate rejecting any learner-facing string matching
  `复核要点|根据题意复核计算|需验证|似乎可行|待复核`, and rejecting any
  explanation that does not end in terminal punctuation.

### F11 — Generator scaffolding is printed to the learner in the prompt: 4,521 items
- severity: major
- category: pedagogy
- affected: pep-high **3,021 of 4,800 (62.9%)**; bnu-high **1,500 of 1,500 (100%)**.
- evidence: pep-high prompts carry `RAG-v3` build labels (1,500),
  `原创…练习 N：` counters (900), `建模情境/参数讨论/概念辨析/证明推理…任务`
  task labels (639) and a generic instruction preamble (621):
  > `pep-high-s4-rag3-mc-099`: **RAG-v3 建模情境 99（平面向量及其应用）：建模情境选择题任务：**已知 \(\vec a=(1,2)\)…
  > `pep-high-s5-rag2-fi-052`: **原创计算练习 52：**已知椭圆 \(\frac{x^2}{64}+\frac{y^2}{16}=1\)，求 \(c^2\)。
  > `pep-high-s4-rag4-fi-001`: **先明确所求量，再套用公式。写出题目要求的值。优先使用精确值，不用猜测小数。**在 \(U=\{1,2,\ldots,19\}\) 中…

  Every bnu-high prompt begins with its own internal batch id plus a publisher
  self-advertisement:
  > `bnu-high-ds-v1-s4-001`: **题组s4-001：在北师大版高中预备知识练习中，**已知 3x + 2 = 11，求 x = （ ）
- why: no mainland 教辅 prints "RAG-v3 建模情境 99" or "题组s4-001" above a
  question. The three-sentence preamble is worse than noise — it is identical
  across items and trains the learner to skip the first line, which is exactly
  where the 题干 begins in a real exam. 100% of bnu-high prompts also leak the
  publisher name into the 题干.
- fix: strip everything before the actual 题干 at pack-build time; add a gate
  rejecting prompts matching `RAG-v\d|题组\s*[a-z0-9-]+：|原创[^：]{0,10}练习\s*\d+：|任务[:：]`.

### F12 — Within-topic operand constancy: a "variable" that never varies
- severity: minor
- category: variety
- affected: 57 (topic, operand-position) pairs across 34 topics with a ≥90%
  constant operand; 19 pairs at exactly 100%, all in bnu-high and hjb-high.
- evidence: `bnu-high-s5-圆锥曲线` (n=72) — the 4th number is **9 in 100% of
  items** (`b²=9` always) and the 1st is **5 in 100%** (the id prefix `s5`);
  `bnu-high-s6-数列` (n=225) — operand 3 is `1` in 100% (`d=1` always);
  `hjb-high-s6-计数原理` (n=75) — operand 2 is `2` in 100%;
  `bnu-high-s5-统计案例` (n=71) — operands 3 and 4 fixed at 11 and 14.
- why: a 圆锥曲线 topic in which `b²` is always 9 teaches "subtract 9", not the
  `c²=a²−b²` relation. It also means the fill-in answer set collapses (46
  distinct answers for 402 bnu-high fill-ins).
- fix: sample every operand in the template, not just one, and gate that no
  single operand position is constant across more than 40% of a topic.

### F13 — Inconsistent `A./B./C./D.` prefixes baked into option text
- severity: minor
- category: notation
- affected: 272 items — hjb-junior 107, bnu-primary 66, hjb-primary 52,
  bnu-junior 37, hjb-high 10.
- evidence: `bnu-primary-ds-v1-p2-223` options
  `['A. 6分钟','B. 30分钟','C. 6小时','D. 30小时']`, answer `'B. 30分钟'`; the
  neighbouring item `bnu-primary-ds-v1-p2-209` has bare options with no prefix.
  The renderer (`PracticeQuestionCard.tsx:642`) draws options as a 2-column
  grid and supplies no letter of its own, so 272 items show letters and 6,248
  do not.
- why: cosmetic inconsistency, and the baked-in letter becomes wrong the moment
  F1's shuffle fix lands.
- fix: strip the prefix from option and answer strings; let the renderer own
  the label.

### F14 — checked and clean: explanations that name an option letter
- severity: (no defect)
- category: pedagogy
- I tested whether explanations that assert a specific letter ("故选 C",
  "选项 B 正确", "答案是 A") agree with the position the answer actually renders
  at. **103 such assertions across the corpus, 103 matches, 0 mismatches.**
  Recorded here because an earlier looser regex produced 70 apparent mismatches
  that were all false positives (the first letter mentioned is usually a
  distractor being discussed). No action needed.

---

## Slice health verdict

**Not shippable as-is: pep-high, bnu-high, hjb-high.** In pep-high every
multiple-choice answer is option A (1,620/1,620) and in bnu-high every one is
option B (525/525), so a learner scores 100% or 0% on those banks without
reading a question — and the resulting mastery gain is written to the adaptive
state. All three high-school slices additionally answer to "pick the
2nd-smallest number" (100/100/99%), carry generator scaffolding in the prompt
(pep-high 62.9%, bnu-high 100%), have difficulty tags uncorrelated with anything
measurable (all |ρ| ≤ 0.11 in hjb-high; 95% of its repeated skeletons carry all
three tags), contain no real 解答题 despite labelling 25–35% of items as such,
and — in pep-high — print a generic topic blurb that never reaches the answer
for 1,397 items. hjb-high has 24 topics with a single prompt template each: 20
items in a row is 20 copies of one question.

**Blocked on a content fix but structurally sound: bnu-junior.** Its item
design, distractors and 解析 are the best in the corpus (E[distinct in 20] =
19.93, 76% of short-answers carry a multi-step solution), but 115 items ship
internal QA-review paragraphs as the learner-facing explanation, 70 of which
tell the learner the displayed answer is wrong. Those 115 must be regenerated
before any release.

**Shippable after the option-shuffle fix: bnu-primary, hjb-primary,
hjb-junior.** Near-perfect item variety (E[distinct in 20] = 19.1–19.9),
genuinely teaching 解析 with 验算 and 错因 commentary, and a defensible
选择/填空/解答 mix. Their one systematic design flaw is the A-position bias
(37–44% vs 25% chance), which is a serve-time fix, not a content rewrite.

**pep-primary and pep-junior need a variety rebuild, not a patch.** Only 62 and
41 distinct solution methods for 1,200 items each; a learner practising any
pep-primary topic sees 3.8 structurally distinct items in 20, and 38–42% of
their fill-in answers fall out of a one-line arithmetic heuristic applied to the
numbers on screen. Across the corpus, `misconceptionTags` are topic-level
English constants that the runtime `Question` type discards entirely, so no
distractor anywhere in the mainland bank is built to diagnose a specific error.
