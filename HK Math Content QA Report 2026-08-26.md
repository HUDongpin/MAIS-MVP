# Hong Kong Math — Content QA Report

**Date:** 2026-08-26  **Branch:** `codex/edulab-mais`  **Scope:** the 989 live HK math questions, 49 HK topics, 49 HK lesson seeds
**Method:** 7 parallel review lanes (6 LLM agents + 1 deterministic lane run directly against the production code)

---

## Bottom line

The HK math bank's **arithmetic is sound** — across 989 questions and 49 lessons, the seven lanes found essentially no wrong answer *values* and no false mathematical statements. Traditional-Chinese terminology is also in good shape. The defects are all in the layer above the mathematics: **how answers are stored, how items are labelled, and how much curriculum they actually cover.**

Three things are shipping today that a HK teacher would call blockers:

1. **~16% of free-response items mark a correct student wrong** — verified by running the production grader. *(Revised up from 11% by the addendum at the end of this report; all of them are EASE items.)*
2. **60% of the multiple-choice bank is answerable by always tapping option A** — no shuffling anywhere.
3. **71% of the bank generates no adaptive-learning signal** — its topic IDs never enter the topics table.

None of these is a content-authoring mistake. They are all *pipeline* defects, which is good news: they are fixable in bulk, mostly by script.

---

## Severity summary

| Lane | Scope | Reviewed | P0 | P1 | P2 |
|---|---|---|---|---|---|
| L0 · systems/structural (run directly) | full bank + grader + store | 989 | 3 | 3 | 2 |
| L1 · EASE primary math | 267 items (P3/P4/P5) | 267 | 11 | 21 | 7 |
| L2 · EASE S1 math | 434 items (S1) | 434 | 10 | 22 | 15 |
| L3 · curriculum bank math | 288 items + generator | 288 | 3 | 14 | 20 |
| L4 · HK Chinese / bilingual | full bank | 989 | 19 | 7 | 7 |
| L5 · curriculum alignment | 49 topics vs EDB/NSS | 989 | 0 | 14 | 6 |
| L6 · pedagogy & explanations | full bank | 989 | 2 | 8 | 9 |
| L7 · lesson seeds | 49 lessons | 49 | 0 | 15 | 21 |
| **Total** | | | **48** | **93** | **85** |

L4's 19 P0s are answer-format rejections confirmed against the production grader — they overlap the P0-1 population below rather than adding a separate class.

Findings JSON: `tmp/hk-math-qa-20260826/findings/` (gitignored).

---

## The bank, in numbers

| | |
|---|---|
| Live HK questions | **989** |
| — EASE import (`hk-ease-*`) | 701 (71%) |
| — curriculum bank (`q*`/`pq-*`/`supp-*`/`graph-*`) | 288 (29%) |
| HK topics in `data/topics.ts` | 49 (P1–P6, S1–S6) |
| HK lesson seeds | 49, all flagged production-ready |
| Item types | 621 fill-in · 194 MC · 157 short-answer · 17 graph |

**EASE source funnel** (`data/ease/ease_questions_summary.json` → shipped pack):

| Stage | Count | % of source |
|---|---|---|
| Source export from `ease.eduhk.hk` | 9,339 questions / 145 topics / 572 knowledge points | 100% |
| Reviewed by the upstream QA pass | 800 | 8.6% |
| **Shipped** | **701 / 16 topics / 55 knowledge points** | **7.5%** |

The shipped slice covers **11% of source topics** and **9.6% of source knowledge points**. 1,137 downloaded assets were dropped wholesale under the `text-only-first-batch` policy, which is why the bank is 88% fill-in.

Half the shipped EASE items are **AI-generated**: 267 Gemini + 84 Poe/Poe Assistant = **351 of 701 (50.1%)**. The remaining 350 come from six named HK schools. No exam-board (`CE/DSE`) or publisher (`EPH`) items made it into the shipped set — worth recording, because 2,704 such items *are* present in the source and would carry real IP exposure if a later batch pulls them in.

---

## P0-1 · The grader marks correct students wrong

**Verified directly** against `lib/server/answerMatching.ts` → `questionAnswerMatches`, the same function `answerGrading.ts` uses to grade a real attempt.

**90 of 795 free-response HK items (11.3%)** reject at least one form a correct student would plausibly type. 89 of the 90 are EASE items. By grade: P3 9 · P4 49 · P5 3 · S1 28 · S3 1.

Two mechanisms, both from the same root cause — **the answer key was stored as display text, not as a value**:

**(a) Key holds LaTeX or a Chinese unit** (55 items)
```
hk-ease-10650   key "\frac{2}{3}"   → student types "2/3"   → WRONG
hk-ease-10564   key "25厘米"         → student types "25"    → WRONG
```
The normaliser strips English units (`cm`, `degrees`, `dollars`) but no Chinese ones, and has no `\frac` parser.

**(b) Key holds the whole working line** (36 items)
```
hk-ease-919    key "100 - 4 - 8×5 = 100 - 4 - 40 = 56，剩餘56塊。"   → student types "56"    → WRONG
hk-ease-10394  key "(4500 - 2650) × 15 = 1850 × 15 = 27750"        → student types "27750" → WRONG
hk-ease-303    key "H.C.F. = 35, L.C.M. = 210"                      → student types "210"   → WRONG
```

The `acceptedAnswers` list does not rescue this: for 408 of 701 EASE items it contains only the answer string itself, and where it has extra entries they are LaTeX-decoration variants (`\mathbf{...}`) of the same string — never a plain-text student form.

**Worst individual cases, each confirmed against the live grader:**

- `hk-ease-1205` — "計算 2¼ × ⅔". Key `"3/2 (or 1 1/2)"`. **Every** correct form fails: `3/2` WRONG, `1 1/2` WRONG, `1.5` WRONG. The item is ungradeable.
- `hk-ease-10569` / `hk-ease-10599` — key is stored in **Simplified** Chinese `两者相等`. A HK student writing correct Traditional `兩者相等` is marked **WRONG**; the Simplified form passes. In a Traditional-Chinese product this is backwards.
- `hk-ease-10671` — the accepted list contains `"14/5kg"` (= 2.8 kg) for a problem whose answer is 1⅘ kg (1.8 kg), while `1 4/5`, `9/5` and `1.8` all fail. A wrong value passes and every right one is rejected.

L1 ran a wider input set over its 267-item lane and puts the reject rate at **144/267 (54%)** for EASE primary. My 11.3% figure is a strict lower bound over a narrower set of input variants — treat 11% as the floor, not the estimate.

**Fix:** one migration pass over the pack that separates `answer` (canonical value) from `displayAnswer` (worked line), plus adding `\frac` and Chinese-unit handling to `normalizeAnswer`. Both are mechanical.

---

## P0-2 · The multiple-choice bank is beatable without doing any maths

**Verified directly.** Across 194 HK multiple-choice items the correct option sits at:

| A | B | C | D |
|---|---|---|---|
| **117** | 34 | 24 | 19 |

**Always tapping A scores 60.3%.** The bias is entirely from the generated `supp-*` items: **all 98 have the key in slot A** (EASE MC is close to uniform — A11/B19/C11/D17).

There is no shuffle. `components/practice/PracticeQuestionCard.tsx:642` renders `(question.options ?? []).map(...)` in authored order, and `shuffle` appears nowhere in the practice path.

Compounding it, those same 98 items share just **two** hard-coded distractor triples (`data/questions.ts:2001-2011`) — "Guess from appearance only", "Use the longest formula first", "Ignore labels and units". After one exposure they are answerable by elimination.

**Fix:** shuffle options at serve time (seeded by attempt ID so re-renders are stable), and rewrite the `supp-*` generator.

---

## P0-3 · 71% of the bank is invisible to adaptive learning

**Verified directly.** The `topics` table is seeded only from `data/topics.ts` (`seedTopicRecords`, `lib/server/userStore.ts:2249`). Nothing ever upserts a topic from a question. `data/topics.ts` contains **zero** `hk-ease-*` entries.

`lib/server/userStore.ts:10330` then builds the adaptive policy's `gradeTopicIds` from that table and filters both attempts and active mistakes through it:

```ts
const gradeTopicIds = new Set(database.topics.filter(...).map(t => t.id));
const attempts = database.attempts.filter(a => ... gradeTopicIds.has(question.topic_id));
```

So every attempt on all 701 EASE questions is dropped from the adaptive signal:

| Grade | Questions invisible to grade-topic mastery |
|---|---|
| P3 | 32 / 56 (57%) |
| **P4** | **225 / 251 (90%)** |
| P5 | 10 / 35 (29%) |
| **S1** | **434 / 459 (95%)** |

A P4 or S1 HK student doing the overwhelming majority of the practice available to them generates **no** mastery signal, no mistake tracking, and no adaptive progression.

The same 16 orphan topics also have **no lesson seed** — 701 questions sit behind topic tiles with no learn path.

> **Correction to a lane finding:** L5 reported that these questions surface to students under raw IDs like `hk-ease-4n7`. That is **not** the case. `topicLabelForQuestion` (`lib/server/questionStore.ts:232`) returns `question.topic` when present, and every EASE item carries proper `{en, zh}` titles. Students see 「小數 (一)」, not `hk-ease-4n7`. The raw-ID fallback never fires here.

**What students *do* see is still bad**, because the practice catalogue is built from the questions themselves rather than from `topics.ts`. The P4 catalogue therefore shows **16 topic tiles**, 12 of them EASE, with near-duplicate names:

```
   7q  topic✓ lesson✓  p4-decimals    小數
  31q  topic✗ lesson✗  hk-ease-4n7    小數 (一)
  21q  topic✗ lesson✗  hk-ease-4n8    小數 (二)
```

Three "decimals" tiles at the same grade, only one with a lesson. And S1 shows five curriculum topics of 5 questions each alongside one bucket called 基礎計算 holding **434 items — 94.6% of all S1 practice**.

Three EASE topic titles also carry literal formatting bugs: `四則運算(一 )`, `四則運算(二 )`, `四邊形 (三 )` — stray space before the closing bracket, half-width brackets throughout.

---

## P1-1 · Curriculum coverage is far thinner than the topic count suggests

Of the 288 curriculum-bank items, **98 (34%) are not maths questions**. They are two templates repeated verbatim across all 49 topics (verified):

```
49×  開始處理「X」題目時，哪一步最有用？     (which step is most useful when starting X?)
49×  哪項檢查最能避免「X」常見錯誤？         (which check best avoids common X mistakes?)
```

That leaves **~190 real maths items across 49 topics — under 4 per topic.** L5 estimates ~2 genuinely distinct skills per topic once numeric re-skins are collapsed, and puts the gap to a usable bank (~30 items/topic) at roughly **1,280 items**.

L5's strand-coverage verdict against the EDB curriculum:

- **Data Handling missing at P1, P3, P4** — no pictogram items exist anywhere in the bank
- **Shape and Space missing at P2 and P5** — triangle/parallelogram/trapezium area never appears
- **Algebra absent across all of KS2 (P4–P6)** — students meet S1 algebra with no prior exposure
- **P6 covers only 2 of 5 strands**; its fourth topic slot holds study-skills templates
- **S1–S3**: nine major junior units have zero items — Pythagoras, congruence/similarity, simultaneous equations, inequalities, indices/scientific notation, percentage applications, mensuration of solids, significant figures, variation
- **S4–S6 is not a credible NSS Compulsory Part map** — 11–12 of ~18 Compulsory learning units have no items at all

The 16 EASE MTR codes *are* genuine EDB-convention learning-unit codes (`<level><strand><unit>`), but they contain **no D (Data Handling) and no A (Algebra) code** — so importing more EASE content cannot repair the two missing strands.

## P1-2 · M1/M2 content is being served as core

`differentiation-intro` (S5) and `calculus` (S6) teach differentiation and integration inside the S4–S6 Compulsory sequence. Neither is in the NSS Compulsory Part — both are M1/M2. `statistics-s6` advertises normal distribution and sampling (M1) while its items only test standard score, and Compulsory dispersion content is absent. Nothing anywhere in the system distinguishes Compulsory from Module, and `data/rag/hongKongMathEdB.ts` compounds it by listing `differentiation-intro` in `seniorCompulsoryTopicIds`.

L6 adds that **S6 is 70% non-mathematical** — only 6 of its 20 items carry S6 maths, the rest being `exam-revision` / `mixed-problem-solving` study-skills slots.

## P1-3 · Grade tagging is unreliable in the S1 bucket

L2 reports **~155 of 434 S1 EASE items (36%) are P3–P6 content tagged S1** — `計算32+29`, `計算54-37`, `計算5.2+6.3`. Spot-checked and confirmed on `hk-ease-919`, a two-step P3-level word problem carrying `grade: "S1"`. Only the factor/multiple/index/HCF–LCM strand is genuine EDB Secondary 1.

L2 also finds `hk-ease-n1` is masking **at least seven distinct sub-topics**: HCF/LCM (95), fraction+decimal arithmetic (86), divisibility (70), order of operations (69), primes/factorisation (40), index notation (30), factors/multiples (13).

---

## P1-4 · Display corruption in the EASE import

Verified individually:

| Item | Defect |
|---|---|
| `hk-ease-1265` | `3.36 + 7.4 ´ 4.6` — `×` stored as mojibake `´` |
| `hk-ease-1266` | `6.54 ¸ 1.2 - 3.15` — `÷` stored as mojibake `¸` |
| `hk-ease-1790` | Stem lists `A.36 B.34 C.28 D.30`; the real options array is `['36','34','28','40']` and the key is `40`. **The printed stem contains no correct option.** |
| `hk-ease-920` | ZH renders 1⅕ as `11/5`; the answer key leaks internal reviewer commentary to students: `…標準答案僅給數值結論，但解釋可推導，匹配。` |
| `hk-ease-1041` | An 18-cell tick/cross divisibility table flattened into whitespace-separated text, with sub-answers (a)–(e) in one short-answer field — ungradeable |

L1 adds 16 English prompts corrupted by dollar-escape mangling (`at \(\\)12\(each`), 4 English prompts that are entirely Chinese, and 6 items with option labels stripped to empty. L2 adds 9 items whose *Chinese* field contains English only, 10 MC items with Chinese text in the English option field, and 7 answers carrying leaked QA commentary (`標準答案匹配`, `答案正確`) plus a stray mark allocation `(1分)`.

---

## P1-5 · Two grading defects that let students pass without the skill

L3 found the mirror image of P0-1 — **false accepts** — which I confirmed against the live grader:

```
supp-p5-fractions-operations-guided-example   "約簡 9/12"                   → student types "9/12" → CORRECT
pq-p3-fractions-intro-2                       "與 1/2 等值而分母為 4"        → student types "1/2"  → CORRECT
supp-p3-fractions-intro-guided-example        "與 2/3 等值而分母為 6"        → student types "2/3"  → CORRECT
```

`answerMatches` falls through to numeric comparison, so on any *form-changing* item (simplify, rewrite with denominator N) the untransformed input grades correct. These items cannot test what they claim to test.

Related: `terminatingDecimalAlias` (`data/questions.ts:2122`) never checks for termination — it just rounds to 4 d.p. — so the bank asserts `1/3 = 0.3333` and `4/6 = 0.6667` as accepted answers.

---

## P2 · Explanations do not teach

**All 701 EASE explanations are boilerplate** (verified — 701/701):

> 答案：245。此題已通過 S18 文字題答案核驗。
> *Answer: 245. This text-only item passed S18 answer-key verification.*

That is a QA audit note, not an explanation, and it is what a student sees after answering.

L6 classified the 288 curriculum explanations:

| Class | Count | % |
|---|---|---|
| Worked solution with method | 29 | 10.1% |
| Bare computation, no method | 86 | 29.9% |
| Circular — restates the key | 98 | 34.0% |
| Bare assertion | 46 | 16.0% |
| Principle only, no computation | 29 | 10.1% |

**Bank-wide, 29 of 989 items (2.9%) have a worked solution.**

Only one explanation was found with wrong reasoning behind a right answer (`supp-p4-large-numbers-key-fact` — tells P4 pupils to compare the hundreds place of 23,780 vs 23,708, where both are 7).

**Difficulty labels are decorative.** For the curriculum bank the label is a pure lookup on slot + grade band (key-fact Low 49/49, common-check Medium 49/49). Correlation between labelled difficulty and actual demand: Spearman **−0.19** on operation count. For EASE, difficulty tracks **prompt length** (+0.424), not mathematics (−0.103 on operation count). 39 of 65 topics have zero "High" items — there is no adaptive headroom to climb into.

**Repetition:** 989 items reduce to 756 normalised stems; 131 clusters of ≥2 cover **364 items (36.8%)**. The largest single cluster is 19 items of `判別#是否可被#整除。`

---

## P1-6 · Traditional Chinese: better than feared, but the gate is blind

L4 built a proper detector (OpenCC `STCharacters.txt` + zhconv, counting a character as Simplified-only when it is *not* among its own listed Traditional variants — which correctly clears 角 and 里, the two that broke my first attempt).

Result: **6 items contain Simplified-only characters, and none of them is in a student-facing `zh` prompt.** All sit in EASE P4 answer keys and explanations (`hk-ease-10569/10578/10599/10605/10606`) — chars 两 样 长 错 为 条 边 义 — plus one low-confidence 群 in `supp-data-handling-key-fact`. Two of those keys are the ones that reject correct Traditional input (§P0-1).

**Terminology is in good shape.** Only 7 items carry a non-HK term (素數→質數, 棱→稜/邊, 數位→小數位, plus 4 currency items). Corpus-wide controls all come out correct: 概率 5 / 機率 0 · 周界 20 / 周長 0 · 平均數 11 / 平均值 0 · 厘米 41 / 公分 0 · 坐標 13 / 座標 0 · 速率 12 / 速度 0.

**But the repo's own gate cannot see 71% of the content.** `scripts/audit-hk-chinese.mjs` walks only `.ts`/`.tsx` under `app/components/data/lib/types`, so `data/generated-content/hk-ease-practice-bank-v1/question-pack.json` has **never been scanned** — `coordination/reports/hk-zh-word-audit.md` contains zero hits for `hk-ease` or `generated-content`. Its hand-rolled `SIMPLIFIED_CHAR_HINTS` set should also be replaced with the dictionary-derived detector.

**Bilingual parity, exact split of the 87 identical EN/ZH prompts:** 74 are legitimately language-neutral (bare arithmetic), **9 are English worksheet text sitting in the `zh` field** (`hk-ease-3663–3672`, so HK students get English-only prompts), and **4 are Chinese sitting in `en`** (`hk-ease-10521/10522/10536/10537`). Beyond those, **134 items carry Han characters in an English-side field** — 130 `expEn` boilerplate splicing untranslated Chinese into English prose, plus 10 S1 MC items whose 40 `options[].en` strings are byte-identical Chinese.

**Currency:** those same 4 money items use Mainland RMB denominations 元/角/分 rather than HK 元/毫/仙 — and 「角」 in a P4 maths context reads as *angle*, so it actively misleads.

**Orthographic split traceable to the import:** 甚麼 (26 items, all curriculum bank) vs 什麼 (20 items, all EASE); 裏 2 vs 裡 2.

## P1-7 · Lesson seeds: correct, but over-promising — and `productionReady` means nothing

L7 reviewed all 49 HK lesson seeds and re-derived all 55 numeric claims in them. **Every one is correct — zero P0.** Verdicts: **23 ship · 18 fix · 8 rewrite.**

The dominant theme is scope-vs-delivery: **8 lessons promise content in their title, description or extension that the body never delivers.**

- `calculus` — a 65-minute S6 lesson with **no integration content at all**, yet 2 of its 5 practice items are integration (`supp-calculus-key-fact`: "Integrate 2x" → x²+C). Its worked example is non-computational.
- `mixed-problem-solving` — a 60-minute lesson whose worked-example block contains no mathematics; it restates the concept block.
- `coordinate-geometry` — promises gradient, distance **and** midpoint; only gradient is derived. Distance and midpoint formulas are never stated, yet both are examined and its own extension asks students to use midpoint.

Structure is uniform (concept / worked-example / checklist / extension, + visualization in 29), but content volume is flat while lesson length is not: S5–S6 lessons run ~10–13 EN characters per minute against ~30 for P1.

**Verified structural findings:**

- **`productionReady` is hardcoded `true`** in the `lesson()` builder (`data/lessons.ts:127`). All 49 HK seeds carry it, which makes the `liveProductionLessonSeeds` filter at `:2180` a no-op. The flag is evidence of nothing — and it is not defensible for the 8 rewrite lessons.
- **No HK seed sets `practiceQuestionIds`** — 0 of 49, while every mainland and CA lesson family does. Lessons and practice are not linked on the HK track.
- **`p2-money-time` teaches HK pupils to write money in 角** (`data/lessons.ts:410` and `:422` — 「金錢答案要寫元或角」). Hong Kong currency has no 角; the units are 元/毫/仙. Independently flagged by L4.
- 35 of 49 lessons **pre-answer a graded practice item verbatim** in their worked example.

L7 also reconciled the prior pass: `tmp/mais-hk-lesson-qa-zh-report.md` is not a lesson QA report but the repo-wide Chinese word audit. Only 2 of its 9,225 issues touch `data/lessons.ts` (both 速度→速率) and **both still reproduce** at the same lines — nothing in the HK lesson range has been fixed. It re-scanned all 49 lessons for Simplified contamination and found none.

It withdrew three candidate findings after checking them against the authentic HK EASE corpus rather than assumption — 反角, 變量 and 轉折點 are all correct HK usage. Recorded so they are not re-raised.

---

## What is actually fine

Worth stating plainly, because the defect list above is long:

- **The mathematics is correct.** L1 found exactly **one** wrong answer key in 267 items (`hk-ease-10455` — the ZH prompt asks cloths-per-group, the key answers groups). L2 found **zero** wrong answer values in 434 items. L3 found **zero** in 288, having independently re-derived 105 computational keys. I machine-evaluated all 61 pure-numeric prompts — all 61 keys exact.
- **No unsolvable items, no false mathematical statements** in prompt text.
- **The 17 graph items are fine.** My extract dropped the `diagram` field, which made them *look* asset-less; L3 and L6 independently caught this. All 17 carry a valid coordinate-grid diagram, serialised at `questionStore.ts:255` and rendered at `PracticeQuestionCard.tsx:614`. L3 verified every diagram against its key.
- **No prompt-injection or instruction-like text** in any of the 989 items (checked by L1, L2, L3).
- **Multiple-choice keys are all present in their option lists**, and no duplicate question IDs exist.
- **Primary Chinese register is authentically HK** — 膠擦, 課室, 棒形圖, 周界 (L3). Only 7 items in 989 carry a non-HK term, and every corpus-wide terminology control comes out correct (L4).
- **Simplified-Chinese leakage is minimal and never student-facing in a prompt** — 6 items, all in answer keys or explanations (L4, dictionary-verified).
- **The 49 lesson seeds are mathematically clean** — all 55 numeric claims re-derived, zero P0, and no Simplified contamination (L7).

---

## Where this QA is incomplete

- **L3 could not complete its scripted EN/ZH numeric-parity diff** because the root volume hit ENOSPC mid-run. It checked all 288 visually and saw no mismatch, but records this as unproven.
- **Simplified-Chinese detection is only as good as its dictionary.** L4's method is sound, but it deliberately did not report 170 ambiguous characters across 888 items where the Traditional/Simplified mapping is many-to-one. My own first attempt at a hand-rolled character list produced false positives on 角 and 里 and was discarded — do not trust one for this.
- **L4 did not verify arithmetic** and L1/L2/L3 did not verify language; where the two overlap (`hk-ease-10399`, the worked-equation keys) the findings are cross-tagged rather than independently re-checked.
- **Lesson visualizations were not reviewed.** 29 of 49 HK lessons carry a `visualizationConfig`; L7 assessed lesson prose and structure, not whether the visualization modules render correctly or teach the stated concept.
- **Two agent claims did not survive verification** and are excluded above: L5's raw-topic-ID claim (§P0-3), and L2's claim that `hk-ease-1799` rejects `"1"` (it grades correct — `question.answer` is always included in the accepted set). L6's "key is the longest option in 99/194" also did not reproduce on my zh-only measure (I get 4/194); the key-*position* figures did reproduce exactly and are the ones cited.
- **The 55/36/90 grader counts are lower bounds**, derived from a conservative set of input variants. L1's wider probe suggests the true rate is several times higher.

⚠️ **Environment note:** the boot volume ran out of space during this run (233 MiB free of 460 GiB), which killed tool calls and disrupted two lanes. `/private/tmp` holds ~2.4 GB of stale temp directories from other sessions (`uais-p1-node_modules-partial-20260821`, `uais-inp-plan-b-*`, `uais-p1-staging-remote-*`). Worth clearing before the next large run — I did not delete them, as they may belong to live sessions.

---

## Recommended sequence

Ordered by (student harm × effort). Items 1–3 are scripted bulk fixes; 4–6 are content work.

**1 · Stop marking correct students wrong** — *days, mechanical*
Migrate the EASE pack to separate `answer` (canonical value) from `displayAnswer` (worked line); add `\frac` parsing and Chinese-unit stripping to `normalizeAnswer`. Fix the two Simplified-Chinese keys and `hk-ease-10671`'s wrong accepted value. Retire `hk-ease-1205` and `hk-ease-1041` until re-authored.

**2 · Shuffle MC options at serve time** — *hours*
Seeded by attempt ID. This alone removes the always-tap-A exploit on 60% of the MC bank.

**3 · Seed the 16 EASE topics into `data/topics.ts`** — *hours*
Restores adaptive signal to 71% of the bank. Do it together with a naming pass: merge or clearly differentiate the duplicate P4 tiles (小數 / 小數(一) / 小數(二)), fix the three malformed titles, and split `hk-ease-n1`'s 434 items across the seven sub-topics L2 identified.

**4 · Delete the 98 study-skill template items** — *hours*
They are 34% of the curriculum bank, contribute no mathematics, and cause the MC key-position bias. Removing them shrinks the bank to an honest 190 items — which is the real starting point for planning content work.

**5 · Decide the M1/M2 question** — *needs your call*
Either add an explicit Compulsory/M1/M2 track dimension, or move `differentiation-intro` / `calculus` / the `statistics-s6` description out of the S4–S6 core sequence. Right now every S6 student is served Module content as core.

**6 · Commission content against the coverage matrix** — *the large one*
The gap is roughly 1,280 items. The highest-value targets are the strands that are missing entirely rather than merely thin: Data Handling (P1/P3/P4), Shape and Space (P2/P5), Algebra across KS2, and the 11–12 uncovered NSS Compulsory units. Note that more EASE imports cannot fill these — the EASE MTR codes contain no D or A strand.

**7 · Repair the two blind gates** — *hours, high leverage*
Both of the repo's HK quality gates currently certify nothing:
- `scripts/audit-hk-chinese.mjs` walks only `.ts`/`.tsx`, so it has never scanned the 701-item JSON pack. Point it at `data/generated-content/**` and swap its hand-rolled `SIMPLIFIED_CHAR_HINTS` for L4's dictionary-derived detector.
- `productionReady` is hardcoded `true` at `data/lessons.ts:127`, making the `liveProductionLessonSeeds` filter a no-op. Either make the flag mean something or delete it — right now it reads as assurance and provides none.

**8 · Link HK lessons to practice** — *hours*
No HK seed sets `practiceQuestionIds` (0 of 49) although every mainland and CA family does. Do this after step 3, since the topic seeding determines what can be linked.

**Also worth deciding:** the upstream QA gate that certified this batch cannot fail on a bad EASE key. For the 58 MCQ items it compares `question.answer` against itself, and for the rest it compares against `qa.independentAnswer` stored in the same generated file. `gate: {solvabilityStatus: "pass"}` on this pack is self-certifying — it should not be read as independent assurance when the next batch lands.

---

*Findings JSON, extracted datasets and every verification script: `tmp/hk-math-qa-20260826/`*

---

# Addendum — 2026-08-26, after the first pass

## The shipped batch is 8.5% of what was already usable

Measured directly against `data/ease/ease_questions_all.json` (9,339 rows):

| | Count | Share |
|---|---|---|
| Rows with no usable answer | 73 | 0.8% |
| Rows carrying question images | 1,000 | 10.7% |
| **Text-only *and* carrying a real answer** | **8,295** | **88.8%** |
| Actually shipped | 701 | **8.5% of those** |

The `text-only-first-batch` policy was not the constraint — **8,295 items were already eligible under that exact rule.** Nor were assets the blocker: all 425 spot-checked images resolve, and `public/ease_question_assets/` holds **57 MB across 1,010 directories, tracked in the repo and referenced by no question in the bank.**

## The defects are inherited from source, not introduced at import

- **14% of source answers contain prose or multi-part text; 21% contain LaTeX** — the exact shapes that break the grader today.
- **Source grade tags are unreliable** — where a prompt names its own level, the `grade` field disagrees 6 times in 17. The S1 mis-tagging was inherited.
- **Source metadata is Simplified** — `levelZh` is 小学 / 初中 / 高中 throughout.

**Consequence:** patching the 701 shipped items fixes 701 items. Every future batch from this source reproduces the same prose keys, LaTeX keys and bad grade tags. Normalisation has to live in the **import pipeline**, or this report gets rewritten after the next import.

## Revised grader measurement

A more rigorous variant generator (canonical rational parsing, unit and gloss stripping, mixed/improper/decimal re-rendering, multi-value and prose keys deliberately excluded):

| EASE bank · 701 items | Count | Share |
|---|---|---|
| Grader rejects a correct answer *(was 90 / 11.3%)* | **126** | **18.0%** |
| Answer key is prose or multi-part — ungradeable in one text box | 114 | 16.3% |
| English sitting in the Chinese prompt field | 62 | 8.8% |
| Internal QA commentary leaked into the answer | 7 | 1.0% |
| Chinese sitting in the English prompt field | 4 | 0.6% |
| Mojibake operator in prompt | 2 | 0.3% |
| Boilerplate explanation, no worked solution | 701 | 100% |
| **Defect beyond the universal explanation problem** | **270** | **38.5%** |

All 126 grader failures are EASE; the curriculum bank contributes none. By grade: P3 10 · P4 62 · P5 5 · S1 49. Leading causes: LaTeX fraction in key (50), Chinese unit in key (30), bilingual gloss such as `"東北 (Northeast)"` (24), numeric form mismatch (21).

## Revised recommendation

Steps 1–4 stand unchanged. **Step 6 changes:** do not retrofit explanations onto this batch. Rebuild the importer to normalise at ingest — canonical answer separated from display form, grade re-derived rather than trusted, Traditional-Chinese enforced, explanation generated at import, topics mapped to real `Topic` records, and the 1,010 asset directories already on disk wired up. Then commission content only for the strands EASE cannot fill (Data Handling, Shape and Space, KS2 Algebra, the uncovered NSS Compulsory units).

---

# Addendum 2 — gap closure (25-agent workflow + direct verification)

Both gaps the first pass left open are now closed.

## Visualization gap — nobody chose these models

**Root cause.** Only **6 of 29** HK visualizations are assigned deliberately (`topicTemplateOverrides`, `data/visualizationLabs.ts:249-256`). The other **23 come from `templateForTopic`** (`:2312-2361`) — 27 regexes matched against topic id + EN/ZH title + description, first match wins, ending in a silent `return "number-line"`. The branch `/area|array|multiplication|division|volume|…/` routes **"volume" itself** to `array-area`.

**The instruments cannot do the lessons** (each verified against component source):

| Lesson | Template | Capability |
|---|---|---|
| `p2-place-value` "Place Value to 1000" | `base-ten` | `total = tens*10 + ones`, sliders 0–9 → ceiling **99**. Worked example is 482; extension asks about 507. |
| `p4-decimals` "Tenths, Hundredths" | `number-line` | Integer line + shared slider hardcoded `step="1"` (`:2874`). **Cannot place a tenth.** |
| `integers` (S1) | `number-line` | `clamp(value, 0, 18)` — **cannot display a negative number**. Sliders cap at 9, so half the axis is dead. |
| `p1-counting-number-bonds` | `number-line` | No part–whole model; reachable max 9 for a "to 20" lesson. |
| `p5-volume` | `array-area` | Flat rows×columns, `threeD.enabled: false`. |
| `p5-fractions-operations` | `fraction-bar` | One fraction + its doubling only — **1/4 + 2/4 unrenderable**. |
| `angles` (S1) | `angle-geometry` | 18° quantisation → 65°/115° unsettable. |
| `p6-speed` | `array-area` | Cannot plot distance vs time; **hand-pinned**, not regex-derived. |

**The cheapest fix is not new code.** Purpose-built labs exist and are unreachable — `GeometryExplorer` has real branches for the fraction lessons, perimeter-area and volume; `FunctionModelComparer:236` has a percent/ratio bar lab; `CoordinatePlaneDemo` has a `SpeedGraphLab`. `LessonView.tsx:576-588` already maps `"geometry-explorer"` and `"function-model-comparer"` — but **zero lessons declare those moduleIds**. They carry unit tests, so they pass CI while being dead to every student.

**Coverage.** 20 of 49 lessons (41%) have no visualization, and all 20 already have a complete lab record. `clock-money-data` and `equation-balance` reach no HK student at all. Of the 29 that do have one, **at most 4 are ship-quality**.

## Simplified-Chinese gap — 2 defects in 1,854 occurrences

34 characters, **1,854 occurrences, 888 items**, all now adjudicated in context. **Exactly two are wrong**, both in `hk-ease-883` (卷 → 捲). **99.89% clean.** A scan of the full 9,339-item upstream export returns one item — there is no reservoir waiting to leak in.

**But the mechanism behind the two Simplified answer keys is new.** The pack builder ships `qa.independentAnswer` — the DeepSeek QA model's own answer — as the canonical `answer`, demoting the publisher's `standardAnswer` to `acceptedAnswers[1]`. For **643/643 free-response items (100%)** the shipped key is byte-identical to the model's answer, and for **249 (39%)** it differs from the publisher's. That is the *proof* of self-certification the first pass only inferred.

**Negative result worth keeping:** do not build the language gate on a raw scan or on OpenCC. A naive scan flags 97 items — 92 are reviewer notes the importer drops (pupil-visible: 5). OpenCC additionally contradicts `data/hkChineseGlossary.ts` on 厘米→釐米 (171) and 坐標→座標 (28).

## Corrections — including two of my own

- **My "square units" claim was wrong.** `array-area`'s 平方單位 string lives only in `controlCopy.comparisonNote`, which has zero consumers — and `configuredVisualizationLabRegressions.test.ts:257` asserts it is never read. The template mismatch is real; the units contradiction is not.
- **My ground truth on the purpose-built modules was wrong** — `LessonView` does map them for lesson embeds; lessons simply never request them.
- **My opening suspicion was wrong** — `visualizationConfig.source` is an analytics tag, matching each lab's own `analyticsSource` for all 29.
- **The earlier lesson lane's "copy honoured" verdict was measured wrong** — prose vs prose, never against the renderer. ≥8 primary and ≥9 secondary lessons it cleared are broken.
- **The `statistics-s6` z-score claim is a misreading** — `z` at `:2515` is a local shaping the bell curve; no z is rendered.

## New steps 9–11, plus two amendments

9. **Re-route the five topics that already have a purpose-built lab** — hours, mechanical. Do before any authoring.
10. **Replace the regex cascade with an explicit table**; make the fallback throw in CI; lint lesson copy against template capability — days.
11. **Repair ranges first, then build missing models, then the 20 empty lessons** — the large one.

**Step 1 amendment:** re-derive the canonical key from the publisher's `standardAnswer`, not `qa.independentAnswer`; add a Traditional-script assertion and Han-script folding to `normalizeAnswer`.
**Step 7 amendment:** scope `audit-hk-chinese.mjs` to shipped fields only.
**10-minute fixes:** `hk-ease-883` 卷→捲, `hk-ease-812` 俊稀→俊希 — patch `data/ease/` upstream too.
