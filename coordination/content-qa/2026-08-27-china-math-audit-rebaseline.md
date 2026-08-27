# China Math Audit — Re-baseline against current `main`

**Re-measured:** 2026-08-27 against `/Volumes/Starship/MAIS-main-wt` @ `1112f9af33` (clean, unmodified)
**Original:** 2026-08-26 audit + v2 remediation plan, run against `codex/edulab-mais`, 360+ commits behind main
**Method:** 7 specialist re-measurement agents + lead-auditor spot checks. Every number below came from a command run against current main.
**Corpus delta:** 17,700 → **11,700** China items · 24,566 → **16,499** whole bank · 335 → **138** China topics · 9 → **6** shipped slices

---

## 1. Verdict

**The audit survived almost entirely intact, and the parts that did not survive got worse rather than better.** Of the headline findings, the overwhelming majority are byte-identical on main — same mechanism, same ids, same counts. Nothing in the mathematics, the grader, the gate, the option-position bias, the duplication, or the curriculum gaps was fixed by content work: every shipped China question module last changed on **2026-07-17**, five weeks before the audit, and no China item has been authored, repaired, or re-reviewed since. What did change is that 6,000 items were **unplugged** from `data/questions.ts` by one commit (`cf1a4822a9`, "de-reach unapproved practice candidates"), removing three slices — bnu-primary, hjb-primary, hjb-high. That subtraction is real governance progress and it deserves credit, but it is not remediation, and treating the smaller corpus as progress is a misread in three measurable ways: the shipped duplication rate **rose 7.0% → 8.5%**, the zero-knowledge multiple-choice exploit **rose 64.4% → 66.6%**, and the China topic spine **fell 335 → 138** because the two withdrawn primary packs were the two the audit itself named as the best content in the library. The single most damaging correction to the audit runs the other way: the one slice that appeared to demonstrate a working independent-answer path (US_AR, "64 genuinely independent rows") now measures **17 rows, none of them an actual independent derivation** — so platform-wide there is currently **zero** evidence that any part of this pipeline can verify an answer key against anything but itself.

---

## 2. The survival table

### SURVIVES — unchanged on main, most consequential first

| Finding | Original | On main now | Verdict |
|---|---|---|---|
| **G1 — the release gate cannot fail.** `independentAnswer` is a copy of `question.answer` | 17,700/17,700 China self-verified; gate Green | **11,700/11,700 (100.0%)**. `isExpectedAnswerRepresented` still `questionBankSolvability.ts:612`, called `:1377`; all 6 wrapper lines untouched since `2294d3cab6`. Gate: `passRows 16499, failingRows 0`, `Green`. Platform self-verification 99.7% → **99.90%** | SURVIVES |
| ↳ the smoking-gun row | `pep-primary-p1-u-mc-051` storedAnswer `"sphere"` / independentAnswer `"sphere"` / `pass` / notes `["OK"]` | **Emitted verbatim.** Item still keyed `sphere` against options 正方体/圆柱/球/长方体 | SURVIVES |
| ↳ two live self-verification routes the audit never named | — | pep-junior 1,200 items verify via `visibleMath` formatting pass; pep-primary 1,200 verify by **replaying `draftForFamily(...).answer`** — presents as a solver, is a tautology. **6,900 of 11,700 live China rows self-verify** | SURVIVES, worse |
| **B1 — a student who knows no maths scores 64%** | pep-high A in 1,620/1,620; bnu-high B in 525/525; no shuffle in serving path | **1,620/1,620 A (100.0%)**, **525/525 B (100.0%)**. Zero `shuffle` in the question path; `reduceQuestionChoices` documents "preserving the original option order"; render at `PracticeQuestionCard.tsx:757` (was `:642`). `masteryDelta = +0.08 / −0.12` at `practiceAttemptStore.ts:406` | SURVIVES |
| ↳ AP distractor formula `{a−d, a, a+d, a+2d}` | pep-high 1,436 / bnu-high 478 items | **Item sets byte-identical.** "2nd-smallest" scores **95.62%** and **96.38%** post-shuffle — reproduces the plan's C1 correction to 2 d.p. | SURVIVES |
| **B2 — the grader marks correct mainland answers wrong** | `knownAnswerUnitWords` is English-only | 18 entries, **0 CJK characters in the entire file**. Only change since audit is `f0ed7749cc` (ASCII formatting) | SURVIVES |
| **B4 — 198 non-Chinese answer keys** | 198 (`sphere`, `Quadrant IV`, `3 R 5`) | **Exactly 198** (pep-primary 97, pep-junior 101). **40 of 40** MC items in this class have a key that is **not one of the displayed options** | SURVIVES |
| **B3 — 19 rounded-decimal pep-high keys** | 19 items, 1e-6 tolerance, no `acceptedAnswers` | **19/19 present, identical keys, still zero `acceptedAnswers`**. Tolerance still `< 0.000001`, now `answerMatching.ts:404` | SURVIVES |
| **Root cause: `answer: string`** | `types/index.ts:1804-1808` | Verbatim: `prompt: LocalizedText` (1804), `options?: LocalizedText[]` (1805), **`answer: string` (1806)** | SURVIVES |
| **B5 — PEP lessons ship no practice set** | 57/57 `practiceQuestionIds: undefined`; 160–320 vs 8 | **57/57 exactly.** pep-high mean 218.2, range 160–320 → **exactly 20.0×–40.0×**. New: pep-junior 66–200 (8.3–25×), pep-primary 50 (6.3×) | SURVIVES |
| **Pipeline labels in prompts** | 3,972 items | **3,972 — exact.** bnu-high 1,500/1,500 `题组`; pep-high 2,400/4,800 (**50.0%**, not the report's 62.9%); hjb-junior 72 `变式 N` | SURVIVES |
| **Pipeline boilerplate in explanations** | 2,515 items, English error tags | **2,515 — exact.** 54 distinct tags, **all 54 pure-ASCII English** | SURVIVES |
| **115 bnu-junior QA reviewer memos as 解析** | 115, 28 truncated | **115 — exact.** 28 truncated, 16 ending mid-clause | SURVIVES (one sub-claim dead — see CHANGED) |
| **pep-primary duplication** | 588 items (49.0%), 724 distinct prompts, one item served 13× | **588 / 49.0% / 724 distinct / max repeat 13** — the 13× item is still keyed `"cuboid"` | SURVIVES |
| **bnu-high duplication** | 561 distinct of 1,500 (85.6%) after `题组` strip | **561 distinct, 1,284 items (85.6%) in a group, max repeat 32** | SURVIVES |
| **pep-high duplication** | 580 dup prompts confined to seed-v1 / rag-v2 | **580; seed-v1 47.1%, rag-v2 17.3%, rag-v3 0%, rag-v4 0%.** Cross-generation raw overlap **0** | SURVIVES |
| **pep-high mathematical monotony** | 1,513 distinct after boilerplate strip (68.5% repeats) | **1,513 / 4,800; 3,287 repeats.** Worst stem **61×**. New: post-strip skeleton reuse **63.2×** — the worst monotony figure in the shipped bank, never measured before | SURVIVES, worse |
| **圆 = 0 in PEP junior** | 0 items, in a topic literally named 「…**圆**与概率初步」 | **0 / 1,200**, topicId included. Topic `pep-junior-s3-upper-quadratics-circle-probability` still ships 200 items, 4 skeletons, zero circle | SURVIVES |
| **绝对值 / 尺规作图 / 实数 / 科学记数法 = 0** | 0 in PEP junior | 0/1,200 each — and **尺规作图 and 科学记数法 are 0 across all 11,700** | SURVIVES, broader |
| **pep-high missing 10 课标 topics** | 双曲线, 等比数列, 二项式定理, 条件概率, 正态分布, 独立性检验, 充要条件, 一元二次不等式, 解三角形, 导数的应用 | **All ten confirmed 0 / 4,800.** `pep-high-s4-quadratic-inequalities` still contains 50 items and zero inequalities | SURVIVES |
| **bnu-high 高三 = 数列 + 导数 only** | no probability, statistics, analytic geometry, solid geometry | S6 = **3 topics / 500 items**. Across all 1,500: 分布列 0, 方差 0, 回归 0, 独立性检验 0, 双曲线 0, 抛物线 0, 空间向量 0, 解三角形 0 | SURVIVES verbatim |
| **PEP spine too coarse** | 24 primary / 11 junior (S3 = 2) / 57 total | **24 / 11 / S3 = 2 / 57.** All three modules last touched `1f8ce0c9d0` (2026-07-17) | SURVIVES |
| **22 hjb-junior lessons are one mad-libs template** | 22 lessons, 1 skeleton, `productionReady: true` | **22 lessons, 1 distinct skeleton**, quoted text character-for-character, all still `productionReady: true` | SURVIVES |
| **6,000 questions have no dedicated bank test** | bnu-high, hjb-primary, hjb-junior, hjb-high untested | `test:question-bank` still runs 6 mainland test files. **bnu-high 1,500 + hjb-junior 1,500 = 3,000 shipped items with no bank test.** `productionLessonsNearTransfer.test.ts` still wired to nothing | SURVIVES |
| **Zero diagrams** *(lead measurement)* | 0 of 17,700 | **0 of 11,700** carry `diagram`; 17 in the whole bank; 80 China prompts reference 三视图/统计图/数轴/如图 | SURVIVES |
| **87 confirmed-wrong answer keys** | ~90 items; 134 ids named across the per-slice files | **87 of 134 named ids are in shipped slices and all 87 are present with byte-identical wrong keys** (pep-high 34, bnu-junior 25, pep-junior 19, hjb-junior 8, pep-primary 1). 12/12 spot re-derivations still wrong; the 11 impossible SSS triangles reproduce exactly | SURVIVES |

### CHANGED — still true, number moved materially

| Finding | Original | On main now | Verdict |
|---|---|---|---|
| **"US_AR has 64 genuinely independent rows"** | 64 rows (2.1%) — the one counterexample | **17 rows (1.1%), and none is an independent derivation.** All 17 are the same value with a unit, comma, or label stripped (`"8 apples"`/`"8"`, `"406,231"`/`"406231"`). **Platform-wide, rows where a second derivation produced a different value: 0** | CHANGED — the *"independent"* reading is **DEAD** |
| **Zero-knowledge MC score** | 64.4% of 6,338 scorable MC | **66.6% of 5,923** (best attacker: numeric → 2nd-smallest, else first option). China-only **69.6%**. Always-A alone 56.7%. Chance 25.0% | CHANGED — **worse** |
| **Corpus duplication rate** | 1,246 items / 7.0% of 17,700 | **997 items / 8.5% of 11,700.** Zero duplicates were removed by content work; the withdrawn packs were the clean ones | CHANGED — **worse** |
| **Chinese unit rejected on a numeric key** | 76/243 (31.3%) | **7,301 / 7,307 (99.9%)** for bare-numeric keys + 个. Full mainland sentence 「答：X个。」 → **7,307/7,307 (100%)**. The original 31.3% is **not reproducible and internally inconsistent** (its own per-slice breakdown already exceeds it) — discard it | CHANGED — **far worse** |
| **繁體 shipped to mainland children under `zh`** *(lead measurement)* | plan: 9,608 of 17,700 prompts | **4,486 of 11,700 items** (4,432 prompts) render traditional characters under language `zh`, which `toggleLanguage` reaches in one click. Per slice: **bnu-high 1,500/1,500, bnu-junior 1,497/1,500, hjb-junior 1,489/1,500; all three PEP slices 0.** `textForLanguage` returns `value.zh` unmodified (`i18n.ts:516-519`). zh-Hans is genuinely clean (7 items, all 覆, a valid simplified character) | CHANGED — halved, still 100% of three shipped slices |
| **`term-XXXX` placeholders** | 1,914 in `acceptedAnswers`; plan's correction: 3,286 in client-rendered `.en` | `acceptedAnswers` **415** (bnu-junior 262, hjb-junior 153 — surviving-slice figures byte-identical). Client-rendered `.en` **1,277, all hjb-junior** (prompt.en 951, explanation.en 1,170, options[].en 81). **Root cause is one file**: `hjbQuestionLocalization.ts:687` mints the placeholder, `:754-771` pushes it into the grading key | CHANGED — 61–78% moot, 1,277 still rendered to learners |
| **Traditional characters in `acceptedAnswers`** | 2,028 items | **589** (bnu-junior 347, hjb-junior 242) / 2,915 instances | CHANGED |
| **222 of 335 lessons print English kebab slugs** | 222 | **24, all bnu-high, 188 occurrences.** 196 rode out with the withdrawn packs; the claimed pep-junior 2 **does not reproduce** (0 slugs). Generators still interpolate raw slug arrays at `mainlandBnuPrimaryLessons.ts:84`, `mainlandHjbPrimaryLessons.ts:63`, `mainlandHjbHighLessons.ts:69` | CHANGED |
| **221 lessons: boilerplate, no 教学目标** | 221 of 335 | **24** (the same bnu-high 24, 1 distinct body). Objective language: pep-primary **0/24**, pep-junior 1/11 — both confirmed | CHANGED |
| **578 Latin units on 厘米 questions** | 578 | **577 of 578 original ids still exist**; strict independent re-scan **504**. But **all 504 carry a Chinese-unit `acceptedAnswers` entry** — a child typing 39厘米 is graded correct. **This is a display defect, not a grading defect** | CHANGED — narrower than it reads |
| **O7 — 530-item shuffle opt-out list** | 530 (letter-in-both 272, bare ABCD 37, prose-position 263) | **~157 shipped** (letter-in-both 144, bare-ABCD 6, prose ≤15). The 263-item prose component is **not reproducible under any defensible definition** — it appears to have counted 下列/以下 stems, which shuffle fine | CHANGED + one sub-claim DEAD |
| **O3 — option-length leak** | "longest option" wins 40/43 HK (93.0%) and 21/21 pep-junior | **Neither denominator exists.** pep-junior scores **51/400 (12.8%)** — opposite sign. The HK leak is real and independently confirmed at a different size: **119/194 (61.3%)**, which beats always-A (60.3%), and 78.2% where the longest option is unique | Claim DEAD as stated; phenomenon SURVIVES in HK only |
| **Grader sub-rejections** | π 49/49 · `^2` 51/102 · trailing 。 429/446 · `、` 46/65 · `或` 41/49 · root order 42/48 · `sqrt` 113/120 | π **12/12** · `^2` **15/92** short keys · 。 **168/172 (97.7%)** · `、` **23/23 (100%)** · `或` **27/33** · root order **27/33** · `sqrt` **186/188 (98.9%)** | CHANGED — π and `²` collapse; the rest hold |
| **54 identical items served at two grades** | 54 groups, "concentrated in hjb-high" | **27 groups / 110 items, all pep-high** (S5↔S6 18, S4↔S6 9). The other 27 were hjb-high | CHANGED — half moot |
| **Public answer leak on `/about`** *(lead measurement)* | samples the full 24,566-item bank, renders first two options | Payload **fixed** — now a 390-item grade-stratified preview. Leak **not fixed**: **50 of 85 China preview MC items expose the correct answer in the two rendered chips**, and **30 of 30 pep-high preview items show it as chip #1**, on an unauthenticated page | CHANGED — payload fixed, leak live |
| **"70 memos say the displayed answer is wrong"** | 70 | **Does not reproduce.** The audit's own predicate fires on 54; nothing yields 70. Worse for the audit: in **all 115** cases the memo's own 正确结果 **equals** the stored `answer` — 0 mismatches | Class SURVIVES; sub-claim **DEAD** |
| **"4 prompts demand exact values then punish them"** | 4 | **2** (`pep-high-s6-rag4-sa-086`, `-091`) | CHANGED — keep the finding, drop the flourish |
| **"others <1% duplication"** | bnu-junior 5, hjb-junior 5, bnu-primary 10, hjb-primary 10 | bnu-junior and hjb-junior have **exactly 0 internal duplication**; all 10 items are 5 cross-publisher pairs. Cross-publisher identical groups: 15 → **5** | CHANGED — belongs to a different finding |

### FIXED — genuinely repaired on main

| Finding | Original | On main now | Verdict |
|---|---|---|---|
| **QA status laundered from "pending" to "pass"** | 4,500 items recorded approved when the source says never reviewed | **Zero shipped China items carry a laundered QA status.** hjb-high's wrapper literals were replaced with `manualQaStatus: "not-approved"` (`cf1a4822a9`); bnu-primary and hjb-primary were de-reached. bnu-junior/hjb-junior wrappers still hard-code `"pass"/"approved"` but their sources are **1500/1500 pass/approved** — cosmetic, verified | **FIXED for shipped content** |
| **HJB high ships the un-remediated pack** | `mainlandHjbHighQuestions = v2`, 1,468/1,500 pending-manual | `mainlandHjbHighQuestions.length === 0`; `expectedMainlandHjbHighQuestionCount = 0` | **FIXED by withdrawal** (see the caveat in §4) |
| **Grader rejects standard typed forms** | not in the audit — found by the CA checkpoint audit | `f0ed7749cc` (2026-08-25) landed leniency for leading `+`, bare trailing `.`, terminal sentence punctuation, digit-grouping commas, bare leading `.`; 608 CA checkpoint questions now pass. Correctly separates `parseScalarAnswer` from `normalizeAnswer` | **FIXED** (US-shaped; no CJK) |
| **`/about` ships the whole bank to the browser** | ~1.7 MB payload, full aggregate | Rewritten to a 390-item grade-stratified sample | **FIXED** |
| **Root git guard inert** | plan §3 already retracted this | `ee9b5e63fe` repaired it on main; the audit branch's inertness was branch staleness, not a defect | **FIXED / was never broken on main** |

### MOOT — scoped to a withdrawn slice

Every one of these reproduces **byte-for-byte on the pack still sitting in `data/`**, and re-promotion is a one-line change to `data/questions.ts`. Book none of them as remediated.

| Finding | Original | On main now | Would it return? |
|---|---|---|---|
| **hjb-high S5/S6 single-skeleton** | S5 500/500, S6 500/500; 582/1,500 trivial; 130 平均数 items; 54 at both grades | Pack ships 0 rows. Re-measured on the untouched v2 JSON: **S5 8 skeletons, S6 12, 500/500 in single-skeleton topics at both grades**, 130 平均数 items, **all 130** on a skeleton served at two grades. The "582 trivial" figure did not reproduce; a defensible proxy gives **739/1,500** | Yes, **worse than reported** |
| **hjb-high duplication + exploitability** | 229 items (15.3%); 99.0% rank-2; 96.2% AP | Reproduces on the pack: 229/15.3%, 241 skeletons, 99.0% rank-2, 96.8% AP. The v3/v4 "remediated" successors are **more** monotonous — 40 skeletons for 1,500 items (37.5× reuse) vs v2's 241 | Yes; promoting v3/v4 makes it worse |
| **bnu-primary defects** | 8 impossible 三视图 items, `p3-091` weekday error, 44.4% A-bias, 1,019 `term-XXXX`, 168 opt-out items | All absent from the shipped bank; all reproduce on the pack (44.4% A over 1,200 MC, 12 named wrong ids present) | Yes, verbatim |
| **hjb-primary defects** | 6 multi-true MC, `p4-064`, 37.2% A-bias, 461 `term-XXXX`, 119 opt-out items | Same — 37.2% over 600 MC, 10 named wrong ids present | Yes, verbatim |
| **47 of the 134 named wrong keys** | hjb-high 25, bnu-primary 12, hjb-primary 10 | All 47 absent from the shipped corpus; all 47 present in the packs | Yes |
| **`、` splitting grades an ordered 排列 correct** | plan C2 hazard, `bnu-primary-ds-v1-p2-090` | 23 live items contain `、` in the key; **0** have a prompt signalling order | Yes, on re-promotion — **do not let this block the `、` fix now** |
| **196 lessons with English kebab slugs** | of the 222 | Withdrawn, but the three generators still interpolate raw slug arrays | Yes, all 196 |
| **4,500 laundered QA rows** | bnu-primary 3,000 + hjb-primary 1,500 | Withdrawn. Wrappers still hard-code `"pass"/"approved"` at `mainlandBnuPrimaryQuestions.ts:143-145` and `mainlandHjbPrimaryQuestions.ts:108-110` | Yes, in full |

---

## 3. What is still broken and still in front of learners

Scoped to the six shipped slices — pep-primary, pep-junior, pep-high, bnu-junior, bnu-high, hjb-junior. In order of how badly it hurts a real child.

1. **The gate certifies nothing.** 11,700/11,700 China rows verify the answer key against a copy of itself; 6,900 of them by direct copy or generator replay. `releaseRecommendation` is Green. Every other item on this list got through here, and `lib/fullQuestionBankSolvability.test.ts:35` pins the Green in CI — any honest solver that disagrees with one stored key breaks the build.
2. **198 items show a Chinese child an answer key in English**, and in **40 of them the key is not one of the four options on screen** — a 一年级 child is told 「正確答案：sphere」 when the options read 正方体/圆柱/球/长方体, and it is written into their 错题本.
3. **The grader rejects the answer the textbook taught.** 7,301 of 7,307 numeric keys reject the unit; 7,307 of 7,307 reject the standard 「答：X个。」 sentence. 168 items reject a dropped ideographic 。; 188 reject `sqrt` for `√`.
4. **pep-high and bnu-high are not assessments.** 1,620/1,620 and 525/525 items have the key in a fixed position, options are served in stored order, and every false correct writes `+0.08` mastery. Corpus-wide a zero-knowledge learner scores **66.6%**.
5. **4,486 items render 繁體 to mainland children** the moment they toggle to `zh` — 100% of bnu-high, 99.8% of bnu-junior, 99.3% of hjb-junior. The audit's "zero traditional leakage" was true only for `zh-Hans`.
6. **6,487 items print pipeline scaffolding**: 3,972 prompts open with a generator label (bnu-high 1,500/1,500), 2,515 explanations close with English error tags spliced into Chinese prose. Plus **1,277 hjb-junior items** whose `prompt.en` / `explanation.en` / `options[].en` contain `term-XXXX` codepoint placeholders — rendered verbatim to any learner on the English UI.
7. **115 bnu-junior items print an internal reviewer's memo as the 解析**, 28 of them cut off mid-sentence.
8. **87 confirmed-wrong answer keys**, including 11 pep-junior SSS items whose triangles violate the triangle inequality — in the unit that teaches 三边关系.
9. **A 人教版 learner's progress bar moves 20.0×–40.0× slower** than a 北师大版 learner's for identical work; 57/57 PEP lessons ship no curated practice set.
10. **The bank is thinner than it looks.** pep-high's 4,800 items are 1,513 distinct questions (63.2× post-boilerplate skeleton reuse); bnu-high's 1,500 are 561; pep-primary's 1,200 are 724, with one item served 13 times.
11. **Curriculum holes with no place to send the learner**: 圆 = 0 in a topic named 圆; 尺规作图 and 科学记数法 = 0 across all 11,700; **综合与实践 = 0 across the entire China corpus**; ten 课标 topics absent from pep-high; bnu-high 高三 is 数列 and 导数 only.
12. **The public `/about` page advertises the answer.** 50 of 85 China preview MC items expose the key in the two rendered chips, and **30 of 30 pep-high preview items show it as chip #1** — an unauthenticated demonstration of the position bias.
13. **New, not in the audit: pep-primary carries a shuffle-invariant 50% floor.** On 372 of its 450 numeric MC items the correct option is **never the smallest or largest** (rank distribution 0.0 / 56.2 / 43.8 / 0.0). Two of four options are eliminable with no mathematics. pep-junior is similar (0.0 at rank 4). The audit cleared both slices as position-clean, and no gate the plan proposes would catch this.

---

## 4. What the remediation plan must change

### Moot, or already done

- **Item 1, "drop dead packs" half — DONE.** `cf1a4822a9` landed it on 2026-08-26, before the plan was circulated. Do not budget it.
- **Item 1, "de-launder" half — MOOT for shipped content.** Zero shipped China items carry a laundered status. The plan's O6 (de-laundering breaks the type-check for HJB high, TS2339) is dead: hjb-high already reports `not-approved` and its test compiled fine. **Cost: 1 day → ~0.25 day**, and what remains is not a fix but a *gate condition* — the bnu-primary and hjb-primary wrappers still hard-code `"pass"/"approved"` and must be repaired **before** either pack is re-promoted.
- **C3 (keep hjb-high v2, delete 3 imports, 6.4 MB)** — the behaviour risk is gone since the pack ships zero rows; the bundle win is still there and is now free. Reclassify as janitorial.
- **O4 (drop one distractor per learner)** — the pep-high/bnu-high halves stand, but its headline arithmetic included hjb-high and was never re-measured on 11,700. Re-derive before quoting.
- **O7 (530-item opt-out list) — largely dead.** ~157 shipped items, and the plan's line *"four of the five slices the plan wanted to shuffle are exactly these"* no longer holds: two of those four no longer ship. The 263-item prose component is not reproducible.
- **O3's option-length correction — half dead.** The 40/43 HK and 21/21 pep-junior figures are unreconstructable; pep-junior now measures the opposite sign. Keep the HK residual claim, restate it as 119/194 (61.3%).
- **Item 10's hjb-high dedup clause, and every hjb-high task in §3.4 and §5** — moot as shipped work, retained as re-promotion gate conditions.

### Changes in cost or justification

| Plan item | Was | Now |
|---|---|---|
| **2 — Grader + unit-equivalence table** | 4 days | **4 days, unchanged, but rewrite the case.** Drop the 31.3% figure — it is bad arithmetic. The defensible number is **7,301/7,307**, and **7,307/7,307** for the taught 「答：…。」 sentence. Re-scope three sub-items: `²` is a **no-op** under NFKC with 15 short-key items behind it; π is 12 items; the `、` ordering hazard has **zero** live instances. Load-bearing order: Chinese units (7,307) → ideographic 。 (168, *not* covered by the 2026-08-25 ASCII fix) → `√`/`sqrt` (188) → `或` sets (33). Implement in `questionAnswerMatches` anchored on `question.answer`: **548 items have a key that *is* number+unit**, so a symmetric strip in `answerMatches` is a regression. **O1's CI-red estimate (149–1,287 defect rows) is stale** — it was computed on 17,700 and 1,499 of the term-/Hant rows it tripped on are withdrawn. Re-measure before scheduling. |
| **3 — Bleed-stop** | 1 day | **1 day, unchanged, and it should lead.** 198/198 intact, 40 with off-menu keys. pep-primary is byte-identical to the audited tree, so O5's caveats (350 rows lose the bare-number alias; the `:376` desync on 325 rows) are almost certainly intact — but re-verify rather than inherit. |
| **4 — Honest gate** | 3 days | **3 days + the test rewrite in the same PR.** `lib/fullQuestionBankSolvability.test.ts:35` asserts `passRows === expectedFullQuestionBankCount` and `failingRows === []` with **no independence assertion at all** — it currently blocks the fix, so it cannot be a follow-up. **The ratchet number cannot be 19,766**; recompute against 16,499. And fix a new hole: the withdrawal set `expectedMainland{BnuPrimary,HjbPrimary,HjbHigh}QuestionCount = 0` and the tests now assert those zeros, so **suppression is recorded as a satisfied expectation** rather than as withheld content. |
| **Shuffle MC options** | 7 days + 209/530 opt-outs | **Cheaper allowlist (~157), much lower value.** The two slices where shuffling actually paid — bnu-primary 44.4%→29.5% and hjb-primary 37.2%→30.3% — are withdrawn. On the shipped bank the best shuffle-invariant attacker still scores **56.9%**, so shuffling buys ~9.7pp, not 40. **The distractor-generator rebuild is the load-bearing fix**, exactly as C1 said, and it is now the *only* one that moves pep-high and bnu-high. |
| **10 — De-duplicate** | 4 targets | **3 targets.** pep-primary (49%, rebuild the pool), bnu-high (85.6%, re-author — cannot be patched), pep-high (drop seed-v1 + rag-v2 removes 100% of raw duplicates in one line — **then** fix F11 separately, because 68.5% mathematical repetition and 63.2× skeleton reuse survive that drop untouched). Strike the "others <1%" row entirely: bnu-junior and hjb-junior have **zero** internal duplication. |
| **8/9 — Wrong-key repair** | ~90 items, plus re-solve bnu-junior and hjb-junior | **87 named ids, all live**, minus 47 that went with the withdrawn packs. Item 9 is unaffected — both slices still ship. |
| **12 — Thicken the PEP spine** | "PEP gap", 57 → ~151 | **Escalate.** China's spine went 335 → 138 topics because the withdrawal removed the two granular publishers (97 + 70 topics). PEP is now essentially the whole China spine, and this stopped being a quality goal. |
| **5 — Strip pipeline text** | 3,972 + 2,515 + 1,914 + 115 | **Split it.** The 3,972 prompt labels and 2,515 explanation tails are 100% intact and are the largest block of learner-visible garbage — keep the estimate. The `term-XXXX` half is **much smaller than budgeted and has a single root cause**: `hjbQuestionLocalization.ts:687` mints the placeholder and `:754-771` pushes it into the grading key. One file fix plus a re-derive clears 415 `acceptedAnswers` rows, the 1,277 client-rendered hjb-junior rows, **and** inoculates all three withdrawn packs. |
| **New — not in the plan** | — | (a) **4,486 items ship 繁體 under `zh`**, one toggle click from a mainland child; (b) **pep-primary's shuffle-invariant 50% floor** on 372/450 MC — no proposed gate catches it, so the CI gate needs a third assertion: *reject any numeric MC where the correct option is systematically non-extremal across a topic*; (c) the **`/about` chip-#1 leak**, 30/30 pep-high preview items. |

### Path A must be replaced

Path A was "ship bnu-primary + hjb-primary + hjb-junior." **Two of the three no longer ship.** Path A as written is dead — do not re-plan around it, and do not quietly redefine it.

There are only two honest successors:

**Path A′ — repair, then re-promote bnu-primary and hjb-primary (recommended).** These two packs are still the best content the product has: 1.01× and 1.03× skeleton reuse, **zero internal duplication**, 97 + 70 topics tracking the 北师大版 and 沪教版 volume sequences, and the **only** 综合与实践 content in the entire library (278 数学好玩 + 102 数学广场 items — that 课标 领域 is now at zero product-wide). The withdrawal removed 4,500 near-pristine items and left the padding, which is precisely why the shipped duplication rate went *up*. But re-promotion re-imports, unmodified: 4,500 laundered QA rows, 1,480 `term-XXXX` rows, 1,439 traditional `acceptedAnswers` rows, 22 named wrong keys, 287 shuffle-opt-out items, 196 slug-bearing lessons, and 44.4% / 37.2% A-bias. So Path A′ is a **strict sequence, not a parallel track**: (1) fix G1 and land the honest gate; (2) fix `hjbQuestionLocalization.ts` and re-derive — one file clears the term-/Hant/machine-English residue across all three withdrawn packs at once; (3) repair the two wrappers' hard-coded `"pass"/"approved"`; (4) fix the 22 named keys and the slug interpolation in the two lesson generators; (5) *then* re-promote. Any step (5) that runs before step (1) restores 4,500 tautologically-verified rows with no gate objection whatsoever.

**Path A″ — ship hjb-junior alone.** The only Path A slice still live. 1,500 items, structurally sound, 22 topics, zero internal duplication. But it carries 1,277 client-rendered `term-XXXX` items, 1,489/1,500 traditional-under-`zh`, 107 letter-in-both MC items, 72 `变式 N` labels, 8 named wrong keys, and 22 lessons that are one mad-libs skeleton still flagged `productionReady: true`. It is a real slice after a focused fix list, but 1,500 items is not a market.

**The two questions the plan said must be answered before choosing are still unanswered, and one of them got sharper.** The 双减 objection now bites *harder* on Path A′ — bnu-primary and hjb-primary are 4,500 items of pure 义务教育阶段 K-6 content, the exact category frozen for online paid 学科类 tutoring, while the three slices that *do* ship (pep-high, bnu-high, and the junior packs) skew older. And the live-learner question — `SELECT count(*), count(distinct user_id) FROM practice_attempts` against production, five minutes — is still not run. Every harm claim in section 3, including the `+0.08` mastery writes and the permanent 错题本 rows, is conditional on that number.

---

## 5. What got better

Credit where it is owed, and there is real work here:

- **`cf1a4822a9` de-reached three unapproved packs on 2026-08-26 — the same day the audit was written.** That removed 6,000 items from the runtime, including all 4,500 whose QA status was being laundered from `pending-s18-review` to `pass` on export. It is a fast, correct governance response to the audit's §3.5 and it landed *before* the remediation plan existed. It also did the honest thing on hjb-high: the hard-coded `mathQaStatus: "pass" / manualQaStatus: "approved"` literals were replaced with `manualQaStatus: "not-approved"`, not deleted.
- **The result is measurable: zero shipped China items now carry a laundered QA status.** Verified against the packs themselves — bnu-junior and hjb-junior wrappers still hard-code `pass/approved`, but their sources are 1500/1500 pass/approved, so it is cosmetic, exactly as the plan's O6 predicted.
- **`f0ed7749cc` (2026-08-25) is a genuine grader fix** — leading `+`, bare trailing `.`, terminal sentence punctuation, digit-grouping commas, bare leading `.`; 608 CA checkpoint questions now grade correctly. It does not touch CJK, but it is built the right way: the scalar leniencies live in `parseScalarAnswer` while `normalizeAnswer` keeps algebraic strings intact, and digit-grouping requires full three-digit groups so `"3,4"` stays distinct from `34`. **That separation is the correct shape for the CJK work** and should be extended, not redesigned.
- **The `/about` payload fix landed.** `practiceMissionPreviewSample.ts` now builds a 390-item grade-stratified sample instead of shipping the full aggregate — the RSC payload problem is solved even though the answer-visibility problem is not.
- **The structural integrity the audit praised is still intact at the new size.** The gate run reports `content-error: 0, solver-gap: 0, answer-mismatch: 0, ambiguous-mc: 0, grader-gap: 0` across all 16,499 rows, zero duplicate ids, and clean curriculum routing.
- **The withdrawal was recorded, not hidden** — expected-count constants were updated and the audit trail (`2026-08-26-A04-promotion-legacy-live-repair.md`) was written alongside the code.

That is the complete list. No China content defect was repaired, because no China content module has been edited since 2026-07-17.

---

## 6. Confidence and gaps

**High confidence** in everything in the SURVIVES table: those numbers were produced by running the product's own functions (`buildFullQuestionBankSolvabilityAudit`, `questionAnswerMatches`, `buildPracticeMissionPreviewSample`, `traditionalToSimplifiedMap`) against the real corpus on main, and in several cases two independent passes reproduced the audit's figures to the decimal, which cross-validates both.

**What this re-baseline did not verify, and would not bet a quarter on:**

- **The 5.1% bnu-junior wrong-key rate and its extrapolation (~75 + ~45 unidentified wrong keys).** The plan itself called this "the most load-bearing number in the package" and asked for a fresh stratified sample with a different adjudicator. **Nobody has re-run it.** The 87 confirmed ids are solid; the *rate* is one sample by one agent, and item 9's entire justification rests on it.
- **pep-high's mathematical correctness.** 4,800/4,800 rows agree with a prompt-parsing solver on the first pass — but that solver and the generator were written against the same ~20 topic-family templates. A 100.0% match between two expressions of one generator is not corroboration. The audit's "4,781/4,800 keys exact" inherits this. Classify pep-high explicitly and write the classification down, as the plan's own Week-1 note demanded.
- **Rendering was never observed.** The app has still not been driven in a browser. The 1,424 measured rendering hazards (604 raw newlines, 537 markdown pipes, 283 unbraced LaTeX subscripts) are exactly what code inspection cannot confirm or refute. My own 繁體 count is a character-map heuristic applied to the fields `textForLanguage` returns — the mechanism is confirmed at `i18n.ts:516-519`, the pixels are not.
- **Live learners.** The production `practice_attempts` count is still unrun. Every severity argument on this page is conditional on it, in both directions.
- **O1's CI-red range (149–1,287 defect rows) and O4's distractor-drop arithmetic** — both computed on the 17,700-item tree, neither re-measured on 11,700. Do not schedule against them.
- **HK, US_CA, US_AR** were measured only where they intersected China findings. The gate numbers are exact; the content is not re-audited. Note that HK is the one track where the option-length leak (61.3%) *beats* the position leak, so its post-shuffle residual is genuinely non-zero.
- **The "115 unexecuted test files" claim**, difficulty calibration against telemetry, the ~44 bnu-primary combinatorics items, and legal exposure (textbook-brand marks in 36 bnu-high stems, PIPL minors' obligations, ICP filing) — all still uncovered, exactly as the original stated.
- **Withdrawn-slice numbers** were re-measured against the on-disk JSON packs, which is the right proxy for "what returns on re-promotion," but not against a live re-promoted build.

**One governance gap worth naming.** Neither `2026-08-26-china-math-full-audit-report.md` nor `2026-08-26-china-math-remediation-plan.md` exists on `main` — both live only in the audit checkout at `/Volumes/Starship/MAIS-MVP/coordination/content-qa/`, on a branch 360+ commits stale. The decision record for a quarter of engineering is currently unmerged, on the one branch in this repo whose git guard was inert. Land it, with this re-baseline attached, before anyone schedules against it.