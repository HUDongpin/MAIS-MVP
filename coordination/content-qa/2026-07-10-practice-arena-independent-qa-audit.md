# Practice Arena Independent QA Audit — 2026-07-10

> **UPDATE (same day): all defects behind the three core standards are FIXED and
> verified.** See "Fixes applied (2026-07-10)" at the end of this report and
> `2026-07-10-practice-arena-verdicts-post-fix.json` (0 grade-appropriateness
> failures, 0 solvability failures, 0 answer-correctness failures across all
> 23,753 questions; 45 warn-level grading-robustness notes remain, plus the
> out-of-scope HJB English display corruption). The defect lists below describe
> the state BEFORE the fixes and are kept for the record.

Systematic check of **every question the practice arena can serve** (23,753 unique
questions across all eight curriculum profiles), judged against: **(1) grade
appropriateness, (2) solvability, (3) answer correctness**, plus a fourth de-facto
standard, **display/metadata integrity**.

Companion data (same directory):

- `2026-07-10-practice-arena-verdicts.json` — per-question verdicts for all 23,753 questions on all four axes.
- `2026-07-10-practice-arena-defects.csv` — the 3,605 rows with at least one hard failure.
- `2026-07-10-S18-full-question-bank-solvability-audit.{md,json,csv}` — fresh run of the repo's own deterministic audit (green: 23,753/23,753 pass), regenerated today for cross-reference.

## Method (independent of the repo's own solvers)

1. Exported the exact arena-served inventory (with answer keys) through the
   production code path (`lib/server/questionStore.ts`,
   `getPublicQuestionsFromStore` + `getQuestionForAttemptFromStore`) for all eight
   profiles. Counts: HK 986, PEP 7,200, BNU 6,000, HJB 4,500, US-CA 1,992,
   US-AR 3,000, US-FL 75, US-NC 0. All 23,753 resolvable for attempts.
2. Built an independent Python audit engine that **mirrors the production grader
   semantics** (`lib/server/answerMatching.ts` normalization, numeric-equivalence,
   per-option MC matching) so every "would grade wrong" claim reflects how the app
   actually grades:
   - independent re-solving of ~950 questions across 15 template families
     (means, linear equations incl. `ax+b=cx+d`, expression evaluation, quadratic
     vertex max/time, rectangle/cuboid mensuration, GCD/LCM, percent-of, etc.);
   - verification of every arithmetic equality chain in all 23,753 explanations
     (Fraction-exact, unit-aware, superscript/LaTeX/万亿-aware);
   - consistency check of every `acceptedAnswers` alias against the primary key
     under grader semantics;
   - structural checks (MC key present exactly once among options as graded,
     duplicate options, figure references vs. checked-in assets, graph diagrams);
   - grade-floor checks with **publisher-aware curricula** (PEP 人教 / BNU 北师大 /
     HJB 沪教(五四学制) / CCSS for CA-AR-FL / HK) and below-grade content
     detection;
   - display integrity (placeholder leakage, missing/English localization).
3. Every flag class was validated by hand; flagged items were individually
   reviewed (all high-severity rows read one-by-one; the calibration loop removed
   ~40 verifier false-positive classes before anything below was accepted).

## Headline verdicts

| Standard | Result |
|---|---|
| 1. Grade-appropriate | **784 questions fail** — 754 of 1,500 in the US-CA G6–G12 v2 bank, 30 of 75 in US-FL. All mainland banks, HK, and US-AR pass after publisher-correct calibration. |
| 2. Solvable | **23,752 / 23,753 solvable as displayed** (in the student's default language). 1 corrupted prompt (`hk-ease-1271`). 50 "如图/figure" references all verified to carry the needed data inline. |
| 3. Answer correct | **38 questions fail**: 18 wrong primary keys, 8 MC with poisoned aliases that grade a distractor as correct, 12 HK-EASE items whose aliases accept a wrong value. 113 more get warnings (rounded keys, brittle long-form keys, grader mixed-number hole). |
| 4. Display integrity | **2,785 HJB questions are unreadable in English mode** (machine-mangled `term-xxxx` text in prompt/options; Chinese is intact; 501 more have mangled English explanations only). 75 US-FL + 86 HK zh fields hold English. Cosmetic: malformed AR topic labels. |

Per-bank axis summary (fail / warn / info out of bank total):

| Bank | Grade | Solvable | Answer | Display |
|---|---|---|---|---|
| HK (986) | pass | 1 fail | 12 fail, 5 warn | 86 info |
| PEP (7,200) | pass | pass | pass | pass |
| BNU (6,000) | pass | pass | 8 fail, 3 warn | 1 info |
| HJB (4,500) | pass | pass | 5 fail, 3 warn | **2,785 fail-EN**, 501 warn |
| US-CA (1,992) | **754 fail** | pass | pass | pass |
| US-AR (3,000) | pass | pass | 13 fail, 102 warn | 4 info |
| US-FL (75) | **30 fail** | pass | pass | 75 info |

## P0 — wrong answer keys (fix the data)

Every item below was independently re-solved; the stored key is mathematically
wrong (several contradict their own explanations):

1. `bnu-junior-ds-v1-s3-461` (S3 MC, statistics) — data has mode **7 only** (7
   appears 6×, 8 appears 5×), so the keyed option "众数是7和8" is false while
   option B "中位数是7" is true. The explanation also states mean 7.1 (true 7.15)
   and non-sequiturs "7出现6次，8出现5次，众数为7和8".
2. `hjb-junior-ds-v2-s1-039` (S1 short-answer) — simplify-then-evaluate gives
   −5a²b−7ab → −20+14 = **−6**; keyed **34** (and "-20 + 14 = 34" appears verbatim
   in the explanation).
3. `hjb-junior-ds-v2-s3-208` (S3 MC, quadratic) — constraints force a=−7/4, b=7,
   c=−4 so a+b+c = **5/4**; keyed option "a+b+c=3" is false and **no option is
   correct**.
4. `hjb-junior-ds-v2-s2-204` (S2 short-answer, geometry) — BD=√65 is
   unobtainable; valid configurations give √102.4 or √217.6 (the question is also
   configuration-ambiguous). Explanation visibly derails ("∠BCD=90°+90°=180°？实际上…").
5. `us-ar-g6-g12-v1-g07-c03-q022` — flower area = 864−144 = **720 m²**; keyed 648
   (explanation asserts 864−144=648).
6. `us-ar-g6-g12-v1-g10-c04-q024` — AD = AC²/AB = **144/13 ≈ 11.08**; keyed 25/13
   (that value is BD, the other hypotenuse segment).
7. `us-ar-g6-g12-v1-g08-c02-q023` — line y=2x+1 shifted down 3 → intercept **−2**
   (its own explanation says −2); keyed 1. Same template bug:
   `…-g08-c03-q016` (keyed 1, true **−7**) and `…-g08-c03-q028` (m·b keyed 2, true
   **−14** per its own explanation).
8. `us-ar-g6-g12-v1-g11-c04-q003/-q006/-q009/-q012/-q018/-q027/-q033/-q036`
   (8 items, "residual" template) — residual = 330 − 200e^0.5 ≈ **0.26**; keyed
   0.42–0.49. Sibling questions (q001, q010, q043) key 0.26 correctly, and several
   of the broken items' explanations derive 0.256→"0.26" before contradicting
   themselves.
9. `bnu-junior-ds-v1-s1-012` (S1 cube-net) — in the 礼物盒子 row, 礼 is opposite
   **盒** (positions 1↔3); the flaps 开/心 are the top/bottom pair. Keyed 心.

## P0 — grading accepts wrong answers (poisoned `acceptedAnswers`)

- **8 mainland primary MC items where a wrong alias equals a decimal-shift
  distractor**, so clicking the wrong option grades correct:
  `bnu-primary-ds-v2-p3-109` (accepts 1.5厘米 for 15厘米), `-p4-160` (50.6 for
  5.06), `-p4-183` (76元 for 7.6元), `-p4-187` (51元 for 5.1元), `-p5-001` (64 for
  6.4), `-p5-013` (66元 for 6.6元), `hjb-primary-ds-v1-p5-031` (accepts "…等于12"
  variant, the text of distractor C), `hjb-primary-ds-v1-p6-061` (314厘米 for
  31.4厘米).
- **12 HK-EASE items with space-collapsed mixed-number aliases** that accept a
  wrong value (e.g. key `1 3/7` correct, alias `13/7` ≈1.86 wrong):
  `hk-ease-10506, 10507, 10510, 188, 1189, 1190, 1193, 1194, 1197, 1198, 1200, 1201`.
- **1 corrupted prompt**: `hk-ease-1271` displays `68/15÷(9.6-61/3)` — the source
  `6 8/15 ÷ (9.6 − 6 1/3)` lost its mixed-number spaces; a student solving what is
  shown gets −68/161, but the key is 2.

## P1 — HJB English localization is machine-mangled (display)

3,286 of 4,500 HJB questions contain `term-xxxx` placeholder tokens and
token-glued pseudo-English in their **English** fields — 2,785 in
student-visible prompt/options (e.g. *"OEterm-5e73 part∠AOD"*, *"put24items
term-82f9 result sum 36items…"*). Chinese (zh/zhHans) is intact, and mainland
students default to zh-Hans, so exposure is English-mode only.
`components/practice/hjbPracticeEnglish.ts` only rewrites CJK topic titles — it
does **not** repair these tokens. Recommendation: regenerate HJB English from
zhHans, or force zh fallback for HJB in English mode until regenerated.

## P1 — US-CA G6–G12 v2 bank is grade-inappropriate filler

All 1,500 items are "Task N (chapter topic): Checkpoint N." wrappers around ~12
rotating generic micro-templates (mean of three numbers, one-step linear solve,
slope through two points, spinner probability, f(x)/g(x) evaluation, prism
volume…), independent of the chapter label or grade:

- **650 items sit ≥2 grade levels below their assigned grade** (e.g. "Find the
  mean of 14, 18, 22" at S4 "Quadratic Structure", S5 "Data Modeling", S6);
  191 more are 1 level below.
- **83 items are above grade level** (function notation f(x)/g(x), quadratic
  evaluation at P6/S1 — CCSS introduces function notation in HS).
- Topic labels do not govern content (statistics chapters serve algebra tasks and
  vice versa), so topic-filtered practice misleads students and teachers.
- US-FL shares the disease in miniature: 30 of 75 items are the same
  mean-of-samples template at S1/S2 "High"-difficulty labels.

The old K–G5 v3 bank was deliberately downlisted for quality; this v2 G6–G12 bank
warrants the same treatment or regeneration. (Its keys are at least correct: 0
answer failures.)

## P2 — grading robustness (warn-level, 113 items)

- **Grader mixed-number hole (114 items flagged, incl. 102 US-AR)**:
  `parseScalarAnswer` in `lib/server/answerMatching.ts` strips whitespace, so
  "7 1/2" parses as 71/2 = 35.5. Questions whose key or alias is a mixed number
  both accept the misparsed wrong value (a student typing 35.5 grades correct)
  and, where only mixed forms are listed, reject unlisted correct improper/decimal
  forms. Fix in the grader: parse `a b/c` as a+b/c.
- **Rounded keys (23 US-AR physics items)**: keys like 13.5/1.53/22.4 with exact
  values 1321/98, 75/49, 1098/49 — a student answering exactly (13.48, 1.53…) can
  be marked wrong where the rounded string is the only accepted form.
- **22 long multi-part keys** (lists/subset enumerations/hypothesis conclusions,
  and one "Draw two bars…" drawing task as fill-in) — unmatchable by exact-string
  grading for legitimately-phrased correct answers.

## Cosmetic / metadata

- US-AR topic labels are malformed ("Arkansas AR.Math.HS.F-LE: And Logarithmic",
  "A-REI: And Quadratic Models") — truncated standard names.
- 75 US-FL and 86 HK items carry English text in zh fields.
- PEP-high v4 prompts carry boilerplate scaffolding prefixes ("先比较相关数量，再计算。…" before a one-line task).
- HK-EASE serves deliberately-easy remedial items at S1 (32+29 etc.) — flagged
  and reviewed as intentional bridging content, not defects.

## Cross-check vs. the repo's own audit

The repo's deterministic audit (rerun today) reports **23,753/23,753 pass**. It
verifies that stored keys are *derivable and alias-matched under its per-family
rules*, but those rules share provenance with the generators, so it cannot see:
wrong keys the generator itself produced (all 18 above), aliases that poison
grading (20 above), grade/topic misplacement (784), or localization corruption
(2,785). The 189-row PEP manual-review queue it maintains is unrelated to the
failures found here.

## Reproducibility

- Harness: `.tmp/tsconfig.qa-fullbank.json` (narrowed compile that avoids the
  `.next/types` glob race with a running dev server) + `.tmp/export-arena-inventory.js`
  (exports the arena-served inventory through production loaders).
- Engine + verdict builder (with every manual disposition encoded):
  session scratchpad `audit_engine.py` / `build_verdicts.py`; outputs copied here.

## Fixes applied (2026-07-10)

All defects behind standards 1-3 were repaired the same day and re-verified
end-to-end. Scripts: `.tmp/fix-answer-keys-2026-07-10.py` (surgical key
repairs, assertion-guarded) and `.tmp/regen-ca-fl-2026-07-10.py` (deterministic
topic-aligned regeneration).

**Answer correctness**

- 18 wrong primary keys corrected in the packs (answers, acceptedAnswers,
  `independentAnswer`, and self-contradicting explanations): the two BNU-junior
  items (statistics MC re-keyed to the true median option with corrected
  mean 7.15/variance 1.4275; cube-net 心→盒), the three HJB-junior items
  (34→−6; the no-correct-option quadratic MC now carries "a + b + c = 5/4";
  the impossible BD=√65 ask rewritten to the clean quadrilateral area 36), and
  the thirteen US-AR items (translated-line family −2/−7/−14, garden 648→720,
  altitude AD 25/13→144/13, residual family ×8 → 0.26).
- 8 mainland-primary MC alias poisonings and 12 HK-EASE collapsed aliases were
  root-caused to two CODE bugs and fixed at the source: `normalizeAlias` in
  `data/hjbQuestionLocalization.ts` no longer strips digit-internal decimal
  points (so "1.5厘米" can never join the aliases of "15厘米"), and
  `generatedAnswerAliases` in `data/questions.ts` now emits the true improper
  fraction/decimal for mixed-number answers instead of the collapsed string
  ("1 3/7" → "10/7"/"1.4286", never "13/7").
- Production grader hole closed in `lib/server/answerMatching.ts`:
  `parseScalarAnswer` and answer variants now parse mixed numbers as
  whole + fraction ("7 1/2" = 7.5, not 71/2 = 35.5), with unit tails and signs
  handled; 12 new unit tests in `answerMatching.test.ts` (10/10 files pass).

**Solvability**

- `hk-ease-1271` English prompt restored to "6 8/15÷(9.6-6 1/3)" (the Chinese
  prompt already carried the correct spacing; key 2 verified: 98/15 ÷ 49/15 = 2).

**Grade appropriateness**

- The US-CA G6-G12 v2 bank was regenerated **in full (all 1,500 items)** — the
  initial 754-item pass showed the remaining items were the same checkpoint
  filler under unmatched templates — using 70 topic- and grade-aligned
  trilingual (en/zh/zhHans) template families, two per chapter across all 35
  grade×chapter units, deterministic per-item seeds, exact-arithmetic keys,
  numerically-deduped MC distractors, and updated
  `independentAnswer`/`independentSolution`/`parameters` metadata. Types,
  difficulty tiers, ids, and counts preserved. Zero "Checkpoint" boilerplate
  remains.
- All 75 US-FL practice problems regenerated the same way (FL chapters mirror
  the CA chapter topics 1:1).

**Verification (all green)**

- Repo deterministic audit: 23,753/23,753 pass, 0 failing rows (reports in this
  directory regenerated).
- Question-bank test battery: 85/85 (three sqlite "database is locked" flakes
  under parallel test files pass serialized — pre-existing concurrency flake,
  not content).
- `audit:zh-hans:strict`: pass.
- Independent audit engine re-run over the re-exported arena inventory:
  0 answer-correctness, 0 solvability, 0 grade-appropriateness failures; the
  post-fix per-question verdicts are in
  `2026-07-10-practice-arena-verdicts-post-fix.json`.
- Live end-to-end against an isolated dev server (production register →
  /api/questions → /api/attempts flow): 27/27 checks pass — every fixed key
  grades its true answer correct and the old wrong answer incorrect, distractor
  aliases no longer grade correct, the restored prompt serves, regenerated
  CA S4 "Quadratic Structure" serves 43 on-topic questions (graded both ways),
  and FL S2 serves no filler.
- Known unrelated failure: `mvpReadiness` has 1 pre-existing failure
  ("p6-speed: source function-model !== geometry", lesson/lab mapping data this
  work never touched).

**Out of scope (unchanged, still open)**: the HJB English `term-xxxx` display
corruption (2,785 prompts; Chinese intact — display/metadata axis), zh fields
holding English in US-FL/HK EASE, malformed AR topic labels, and the 45
warn-level grading-robustness notes (23 rounded physics keys, 22 brittle
long-form keys).
