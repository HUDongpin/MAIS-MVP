# California Math — Content QA Report

**Date:** 2026-08-26
**Scope:** all live California-track math content — 2,802 practice items across 3 packs, 44 textbook lessons, 87 figure specs, 20,190 localized fields, and the pipeline that serves them.
**Method:** lead-session mechanical measurement over the full corpus + 8 parallel QA agents. **Every headline finding was re-verified by the lead against raw pack data or source before inclusion**; where two agents disagreed, the lead re-measured and the corrected figure is used (see §2.2). Claims that could not be re-verified are marked.
**Status:** complete — 8 of 8 agents reported.

---

## ⚠️ Correction — audit ref, issued 2026-08-26 after publication

**This review audited `codex/edulab-mais` (`a0a325f18d`), which is 357 commits behind `origin/main` (`1e056b84c8`).** Three of those commits fix defects reported here. All findings were re-verified against `origin/main`; the results are marked inline below and summarised here:

| Finding | Status on `origin/main` |
|---|---|
| Trailing period `9.` rejected on all 1,658 non-MC items | ✅ **already fixed** — `f0ed7749cc fix(grading): accept standard typed forms of a correct answer`. `answerMatches("9.","9")` → ACCEPT |
| Thousands comma `1,500` rejected (32 items) | ✅ **already fixed** — same commit. → ACCEPT |
| `divide-two-digit-q02` keyed `21` instead of `22` | ✅ **already fixed** — `17a92b3d3e` / `527bb5fe78`. Key is `22` |
| `x = 7`, articles, plurals, stem-noun, clock format, Chinese answers | ❌ **still broken** — all re-tested against the real grader |
| `17 km` accepted for key `17 cm` (22 items) | ❌ **still broken** |
| Everything in §2.4–§2.7, §3, §4, §5, §6, §7, §8 | ❌ **still present** — `L()`, `extractFocusText`, `textbookCoreBlocks`, `exactLayerSrc`, `practiceDifficultyQuotas`, MC 94.5%, terminology counts all re-verified on `main` |

The error was mine: the audit ran in the primary checkout without checking that branch against `main`. Every count below not marked ✅ was re-confirmed on `main`.

**Already landed since:** the §4.4 terminology corrections and the §2.5 translation scaffold are implemented on `i18n/ca-translation-scaffold` (`d8cb9362e4`).

---

## TL;DR

| | Finding | Blast radius |
|---|---|---|
| ~~🔴 P0~~ | ~~Typing `9.` instead of `9` is marked wrong~~ | ✅ **fixed on `main`** — see the correction above |
| 🔴 **P0** | **The grader still rejects `x = 7`, `a circle`, `9 objects`, `4 o'clock`, and every Chinese word answer** — and accepts `17 km` for a key of `17 cm` | 43 + 22 + 22 + 13 + 10 + 3 items |
| 🔴 **P0** | **810 live items have no Chinese translation at all** — and that pack *leads* practice selection, so **76.3% of practice slots are guaranteed English-only** | 464 of 608 slots |
| 🔴 **P0** | **99 K–5 items (20.1%)** mark a correct child answer wrong — articles, plurals, the stem's own noun, two-part answers | 1 in 5 of all live K–5 practice |
| 🔴 **P0** | **22 K–5 items ask in Chinese and accept only English** — proven by executing the live grader | 22 items, no workaround |
| ⚫ **Meta** | **California's "independently solvable" guarantee is a tautology.** For all 1,144 MC items `independentAnswer` is set to `question.answer` itself — the check compares each answer to itself. **No CA question's mathematics is ever re-derived from its prompt.** | the reason every gate is green |
| 🔴 **P0** | 5 Grade-10 items say *"Using π ≈ 3.14"* but key the answer as an unreduced fraction (`314/75`) | any student who follows the instruction |
| 🔴 **P0** | Live student figure badges print **false equations** — `8^2 = 64` renders as **"2 = 64"** | live middle-school route |
| 🔴 **P0** | A G7 lesson marked `approved-for-production` teaches a **sign error as its explanation** | rendered twice on a live page |
| 🟠 **P1** | **"Always click option 1" scores 94.5%** on the pack that leads every checkpoint. No option shuffling anywhere | 1,144 MC items |
| 🟠 **P1** | All **29 K–5 lesson bodies are dead code** — students see 270 interactive lessons that **no one has ever audited** | the entire K–5 teaching surface |
| 🟠 **P1** | The 1,500-item G6–G12 bank is **102 distinct question sentences**, and a code bug leaves it **near-inert** | 54% of live content |
| 🟠 **P1** | `standardIds` assigned **by position in the CCSS domain list, not by content** | 342 + 48 + 81 items mistagged |
| 🟡 **Gov** | **71% of live items** come from packs whose own metadata says they are *not* cleared for live serving | 1,992 of 2,802 items |

**The single most important fact:** CI is green. `audit:us-math-items` reports `P0: 0, P1: 0` for California — all 10 of its findings are Arkansas. The diagram audits pass. The Chinese audit passes *because it is structurally blind to every question pack*. Every defect above is outside what any enforced gate can currently see.

**The second most important fact:** the arithmetic is genuinely good. 508 CCSS-pack items re-solved → 0.39% wrong-key rate; 422 K–5 keys recomputed → **0 mismatches**; all 44 lesson worked examples compute correctly. What is broken is everything *around* the mathematics — grading tolerance, language, alignment, variety, figures, and what actually gets served.

---

## 0 · Scope: what "live California math" actually is

| Pack | Items | Band | Live? | Evidence |
|---|---|---|---|---|
| `us-ca-k5-knowledge-point-practice-v1` | 492 | K–G5 | ✅ | `knowledgePointPracticeLive: true`, `data/usCaliforniaTopics.ts:178` |
| `ccss-textbook-practice-v1` | 810 | K–G12 | ✅ **and leads selection** | unconditional in `questionPacks` |
| `us-ca-math-g6-g12-generated-bank-v2-1500` | 1,500 | G6–G12 | ⚠️ live but near-inert (§3.3) | `data/usCaliforniaTopics.ts:215` |
| `us-ca-math-k-g5-generated-bank-v3-deepseek-1500` | 1,500 | K–G5 | ❌ retired | `practiceLive: false` — confirmed fully out; its 60 topicIds are exclusive, so nothing renders empty |
| `us-ca-math-k-g5-textbooks-v1` | 29 lessons | K–G5 | ⚠️ live but **inert** (§5.1) | `textbookLive: true` |
| `us-ca-math-middle-school-textbooks-v2` | 15 lessons | G6–G8 | ✅ direct-URL only | `livePromotion` block |
| `components/lesson/ccss/lessons/*.tsx` | **270 lessons** | K–G12 | ✅ **the real K–5 teaching surface** | rendered in place of the above (§5.1) |

**Live practice totals:** K–G5 = 828 items (492 + the 336-item K–5 slice of `ccss-textbook-practice-v1`). G6–G12 = 1,974 items (1,500 + 474). **Total 2,802.**

---

## 1 · The baseline that makes this report necessary

`audit:us-math-items` re-solves all 1,500 templated CA items from their student-visible prompts and checks key integrity, duplicate/multi-correct options, and arithmetic in explanations across all three live CA packs:

```
Findings: 10 (P0: 0, P1: 0, P2: 10)
```

**All 10 are Arkansas.** California is clean. The illustration audits agree: `audit-lesson-illustration-assets.mjs` → `PASS — 284 assets`; `audit-math-diagram-inventory.ts` → `PASS`; `buildPracticeFigureAuditReport()` → `Checked: 10, Passed: 10, Failed: 0`. And `audit:zh-hans` → `Critical: 0, Warnings: 0`.

This was predicted in the repo's own records — `coordination/decisions/2026-07-18-deepseek-k-g5-pack-decision.md`: *"the live 492 pack passed `fullQuestionBankSolvability` yet still shipped the P1 Kindergarten cardinality/attributes bugs fixed on 2026-07-18."*

Machine gates verify keys, arithmetic, asset existence and viewBox contracts. They have never verified pedagogy, alignment, variety, language, or **whether a figure's mathematics matches its text**.

### 1.1 ⚫ Why every gate is green: the solvability check is a tautology for California

`data/usCaliforniaQuestions.ts:135` —
```ts
independentAnswer: question.type === "multiple-choice"
  ? question.answer                    // ← the "independent" answer IS the answer
  : question.independentAnswer,
```
and `independentUnitedStatesCaliforniaAnswer` falls back to `question.answer` again. `lib/questionBankSolvability.ts:1224` resolves the "independent" answer through exactly this path.

So for all **1,144 MC items** the solvability gate compares each answer **to itself**, and for the other 1,658 it compares two fields written by the same generator in the same run. **No California question's mathematics is ever re-derived from its prompt.** Mainland PEP High gets a real prompt-derived solver (`:1239`); California does not.

This is why the "0 answer vs independentAnswer disagreements across 2,802 items" result is worthless — it is 0 *by construction*. Three further blind spots compound it:
- **Only the accept direction is tested** (`:1380-1386`) — stored accepted answers are checked to pass; no plausible student variant (`7.`, `x = 7`, `1,500`, `a circle`, `圓形`) is ever fed to the grader.
- **The over-loose probe is one neighbour deep** — `wrongAnswerFor` (`:1310-1319`) tries only `±1, ±10, 999999`, so unit-swap acceptances survive.
- **The bilingual alias tests exclude California by predicate** — `lib/mvpReadiness.test.ts:144` `isCoreBilingualAnswerQuestion` returns `question.region !== "US" && …`, so no CA item is ever inspected; and `answerNeedsAliases` returns `false` for any bare integer, exempting all 1,339 integer-key items.
- **Nothing asserts option-position entropy, figure coverage, or session assembly.**

60 assertions across the five CA suites, **0 failures** — green because of what they choose not to look at.

---

## 2 · P0 — the student is marked wrong when right

### 2.1 The answer-matching rule (established first, so the rest is provable)

`practiceAttemptStore.ts:195` → `questionAnswerMatches` (`lib/server/answerMatching.ts:392`), fed by `data/usCaliforniaQuestions.ts:60` as `unique([answer, independentAnswer, ...acceptedAnswers])`.

`normalizeAnswer` (`:61-81`) applies NFKC, trim, lower-case, `−–—`→`-`, `×`→`*`, `÷`→`/`, partial LaTeX unwrapping, whitespace collapse, then deletes spaces around `= , + - * / : ^ ( ) ° $`. A match succeeds iff the student string and an accepted string share a *variant* (`:301-339`) or their parsed scalars agree to **1e-6** (`:371-390`).

Lead-verified by reading `parseScalarAnswer` (`:341-369`) — the numeric test is `/^-?\d+(?:\.\d+)?$/` after unit-stripping. Consequences:

- **A trailing period fails.** `"9."` does not match that regex (the optional group needs `\.\d+`), so it parses to `null` and no variant matches `"9"`. **Rejected.**
- **A thousands comma fails.** `normalizeAnswer` *preserves* commas, and `"1,500"` fails the numeric regex. **Rejected.**
- **`x = 7` fails.** The trailing-`=` unwrap fires only when the left side is pure arithmetic that evaluates to the right side; `x` is not. **Rejected.**
- **Units are blind within an 18-word allow-list.** `"17 km"` and `"17 cm"` both strip to `17`. **`17 km` is accepted for a key of `17 cm`.**
- It **never** strips terminal punctuation, articles, or a plural `s`. Number words parse only to "ninety"+"hundred", so `"one fourth"` does not parse.

**Multiple choice is language-safe** — a final fallback (`:392-404`) matches student text and accepted answer to the *same* option across `en/zh/zhHans`, which is what makes Chinese-UI clicking work. Verified by executing the real grader across all 1,144 MC items: **0 failures**. **Free response is not** — with no options, only `answer`/`acceptedAnswers` are compared, and Chinese answer text is never translated.

### 2.1a 🔴 The grader itself rejects correct answers on every free-response item

Re-tested against the real grader on `origin/main`:

| Student types | Key | Result on `main` | Items affected |
|---|---|---|---|
| `9.` | `9` | ✅ accepted — **fixed** | — |
| `1,500` | `1500` | ✅ accepted — **fixed** | — |
| `x = 7` (prompt asks `x = ?`) | `7` | ❌ wrong | 10 items |
| `a circle`, `the square` | `circle` | ❌ wrong | 43/43 word-answer items |
| `9 objects` (the stem's own noun) | `9` | ❌ wrong | 13 items |
| `4 o'clock` | `4:00` | ❌ wrong | 3 items |
| `圓形` on a Chinese prompt | `circle` | ❌ wrong | 22 items |
| `17 km` | `17 cm` | ✅ **accepted** | 22 items — wrong answer marked right |

Worked examples: `ccss-textbook-practice-v1-solve-one-step-equations-q01` — *"Solve x + 5 = 12. x = ?"*, key `7`; a student who writes `x = 7` is marked wrong. `us-ca-g6-g12-v2-s1-c04-q05` — *"actual area … in square meters"*, key `1500`; `1,500` is marked wrong.

These are **grader** defects, not item defects — one fix in `answerMatching.ts` clears the whole column.

### 2.2 🔴 22 K–5 items ask in Chinese and accept only English

```
us-ca-math-k-k-md-attributes-data-q02
  zh prompt : 幼兒園測量與資料練習：班級圖表有 6 個圓形和 5 個正方形。哪一類比較多？
  accepted  : ["circles"]
```

Proven by running the live grader on `p1-1-g-shape-reasoning-q02` (`「…這是什麼圖形？」`, `answer: "triangle"`, no options): **`三角形` → false, `triangle` → true** — while the explanation shown afterwards tells the child the answer *is* 三角形.

> **Correction — the agents disagreed here (83 / 26 / 22) and the lead re-measured.** 83 non-MC items have a word-bearing primary answer, and one agent reported all 83 as blocked. That over-counts: 61 of them also accept a numeric-only alternative (e.g. `"9"` alongside `"9 cards"`) that a Chinese-reading child can type. Filtering to items where **no** accepted entry is Chinese **and none** is numeric-only gives the lead-verified figure: **22 items with no typable valid answer at all**. A third agent reported 26 using a looser test (the natural Chinese response is rejected even where a numeric fallback exists). **Use 22 as the hard-blocked count, 26 as the count of items that reject the natural Chinese answer.**

### 2.3 🔴 99 K–5 items (20.1%) reject a correct child answer

| Class | Items | Example |
|---|---|---|
| Article rejected | 20 | `k-k-g-shapes-position-q02` accepts `["square"]` — *"a square"* is wrong. Same for circle, triangle, rectangle, hexagon, pentagon, *"a right angle"*, *"an acute angle"* |
| Stem's own noun rejected | 13 | `k-k-cc-count-sequence-q02` asks *"How many **objects**"* but accepts `["9","9 cards"]` — *"9 objects"* fails |
| Two-part question, one-part key | 12 | `p1-1-md-measure-data-q02` *"Which fruit has more, and by how many?"* accepts `["2 more apples","2"]` — *"apples, 2"* rejected, while answering **half** the question (`2`) is marked right |
| Clock format | 3 | Three G2 items accept only `"4:00"` — not *"4 o'clock"*, *"4"*, or the a.m./p.m. form `2.MD.C.7` explicitly teaches |

Root cause: `acceptedAnswers` was authored ad hoc — 4 of 24 word-answer families got variants; the other 20 got none.

### 2.4 🔴 5 Grade-10 items contradict their own instruction

```
us-ca-g6-g12-v2-s4-c03-q14   (also q05, q18, q38, q41)
Prompt : "A circle has radius 2 cm. Using π ≈ 3.14, what is the area of a
          sector with a central angle of 120°?"
Key    : "314/75"     accepted: ["314/75", "314/75 cm^2"]
```

`(1/3) × 3.14 × 4 = 4.1866…`. The prompt tells the student to use a decimal approximation; the key is an unreduced improper fraction. With a 1e-6 matcher tolerance and no options to fall back on, a student who types `4.19` is **marked wrong**.
*Caveat:* rests on reading the tolerance in matcher source (unambiguous); a UI-level normalisation not inspected could in principle alter it. The mis-keying itself is verified.

### 2.5 🔴 810 live items have no Chinese translation — and they lead selection

`ccss-textbook-practice-v1`, measured across all 810:

| Measure | Count |
|---|---|
| `prompt.zh === prompt.en` | **810 / 810 (100%)** |
| Untranslated localized fields (prompt + options + explanation) | **2,694** |
| Prompts with English prose and **zero** Chinese characters | 725 |

The pack's own header admits it: `"languageVariant": "en-first (owner decision 2026-07-19…)"` — but `packageStatus: "live"`, and `usCaliforniaLessons.ts:214` seeds **every topic from it first**.

**Served blast radius — this is the number that matters:** 62 of 76 topics contain pack B; **52 of 76 topics have all 8 practice slots filled by it**; **464 of 608 slots (76.3%) are guaranteed English-only.** A Chinese-medium student does not meet English "sometimes" — it is the default.

Example: `ccss-textbook-practice-v1-absolute-value-q03` — `prompt.zh = "|−6| compared with |−3|:"`, all four options English.

### 2.6 🔴 Three individually verified wrong keys / explanations

- **`inequalities-q01` (G6)** — *"Which value makes x > 3 true?"*, options `["5","3","1","6"]`, key `"5"`. **6 > 3 is also true.**
- ~~**`divide-two-digit-q02` (G5)**~~ — ✅ **already fixed on `main`** (key `22`). ⚠️ **But the fix was applied to the build OUTPUT, not its source** — until `i18n/ca-translation-scaffold`, re-running `scripts/build-ccss-practice-pack.mjs` silently reverted it to `21` and dropped `31.4` from `circle-pi-q02`'s accepted answers. Fixed at source in that branch; the pack is regenerable again.
- **`…-s1-7-ns-rational-operations` (G7 lesson)** — *"Compute -2.5 + 6.75."* → answer `4.25` (correct), explanation *"The positive amount is 4.25 greater than the negative amount."* 6.75 is **9.25** greater than −2.5. It silently swaps −2.5 for |−2.5| — **exactly the misconception the same lesson lists**. Rendered twice on the live page; stamped `approved-for-production` / `mathQaStatus: passed`.

### 2.7 🔴 Kindergarten "counting" items state the count in the prompt

All 12 `k-cc-count-sequence` items read *"Count the collection: 10 cubes are on a mat. How many objects are on the mat?"* → key `10`. The number is in the sentence and **no collection renders**. It tests reading, not cardinality, and cannot assess `K.CC.A.1–A.3` as claimed.

Root cause is admitted in the pack's own QA report: *"No answer-critical visuals are included."* Items were rewritten to work without a visual by inlining the data the visual was meant to carry — which removes the mathematics.

---

## 3 · P1 — gameable, misaligned, or inert

### 3.1 🟠 "Always click option 1" scores 94.5%

No option shuffling anywhere in the student path — `optionsFor` returns authored order, `PracticeQuestionCard` maps in order, `getPublicQuestionsFromStore` caches pack order, `reduceQuestionChoices` explicitly preserves order.

Lead-measured correct-option index across all 1,144 live MC items:

| Pack | MC items | Position counts `[0,1,2,3]` | Index 0 |
|---|---|---|---|
| `ccss-textbook-practice-v1` | 489 | `[462, 25, 2, 0]` | **94.5%** |
| `us-ca-k5-knowledge-point-practice-v1` | 135 | `[38, 24, 72, 1]` | 28.1% — index 3 is correct **once in 135 items** |
| `us-ca-math-g6-g12-generated-bank-v2-1500` | 520 | `[144, 129, 123, 124]` | 27.7% — clean |
| **All live** | **1,144** | `[644, 178, 197, 125]` | **56.3%**, χ²(3)=607, p≪.001 |

The 94.5% pack is the one that **leads every checkpoint** — so it is the pack students see most. In 16 K–5 knowledge points (71 MC items) the key index never moves; always-C scores 100% on `p3-3-oa-mult-div`.

### 3.2 🟠 The 1,500-item G6–G12 bank is 102 distinct question sentences

| Pack | Items | Unique prompts | Exact-dup | **Distinct prompt skeletons** |
|---|---|---|---|---|
| G6–G12 bank | 1,500 | 1,190 | **30.8%** | **102** |
| K–5 knowledge point | 492 | 458 | 11.6% | 259 |
| CCSS textbook | 810 | 807 | 0.7% | 745 |

Normalising digits to a placeholder collapses 1,500 items to 102 skeletons. G12 chapter 1 is 43 items across 9 distinct prompts. `t_hypotenuse`, `t_trig_ratio`, `t_kmh_to_ms`, `t_circle_circumference`, `t_period_degrees`, `t_sig_figs` are 100% duplicated. 67.9% of the pack collides on `(template, answer)`.

In the K–5 pack, `us-ca-math-k-k-g-shapes-position` is **4 distinct questions repeated 3×** (q01≡q05≡q09, …) differing only in item `type` — against an advertised `questionsPerKnowledgePoint: 12`.

### 3.3 🟠 A code bug leaves the 1,500-item bank near-inert

`data/usCaliforniaLessons.ts:97` —
```ts
const practiceDifficultyQuotas: Array<[Difficulty, number]> = [
  ["Low", 2], ["Medium", 3], ["High", 3]
];
```
`selectPracticeQuestionIds` (`:207`) filters `question.difficulty === difficulty` against those quotas. But the G6–G12 pack's difficulties are **`Foundation` / `Core` / `Challenge` / `Exam`** — so **the quota pass matches zero of its 1,500 items**. Combined with the "CCSS textbook leads" rule immediately above it, **31 of 35 G6–G12 checkpoints draw 0 items from the 1,500-item pack**, and 32 of 34 default free-selection rounds are pure `ccss-textbook-practice-v1`.

The largest pack in the product is, for most students, not being served — and this is the same mechanism that makes §2.5's English-only exposure 76.3%.
*Second, smaller bug:* `ccss-textbook-practice-v1` is typed `CaliforniaK5GradeId` in `data/usCaliforniaTopics.ts` but holds 474 G6–G12 items — hidden by an `as` cast.

### 3.4 🟠 `standardIds` are assigned by position, not by content

**342 items (22.8%)** of the G6–G12 bank carry standards assigned by index into the canonical CCSS domain list rather than by what the item tests: S3-c05 line-of-best-fit tagged `HS.G-GPE`; S3-c01 word problems tagged `HS.N-RN`; S2-c03 point reflections tagged `G8.F`; S6-c03 / S6-c04 simply **swapped** (`F-IF` ↔ `S-MD`).

In the K–5 pack, **4 knowledge points (48 items) test no standard they cite** — `p3-3-nbt-arithmetic` (all 12 are `2.NBT.A.3`), `p4-4-nbt-multi-digit`, `p5-5-nbt-decimals`, `p5-5-nf-operations` (cites `5.NF.A.1`, *unlike* denominators; every item has **like** denominators). 108 K–5 items sit below their labelled grade.

In the middle-school lesson pack, **all 81 CCSS codes are non-canonical** (`"6.RP.1"` not `"6.RP.A.1"`) and **81/81 fail to resolve** against `data/ccss/*.ts` — yet render as badges to teachers. K–G5 lessons are clean (148/148 resolve). The v1 textbook-pack is worse: domain-level pseudo-codes, 0/33 resolve.

Standards tagging is **not currently trustworthy as an alignment signal** — undermining coverage claims, teacher-facing standards reports, and any adaptive routing that reads it.

### 3.5 🟠 Standards coverage: 25 standards unreachable, one dead HS domain

Nominal tag coverage is 385/385 = 100%, which is a mirage — the G6–G12 pack carries **zero canonical standard tags** (34 domain-level pseudo-ids only), so all G6–HS coverage rests on ~3 items/standard from the CCSS pack.

- **25 of 385 standards (6.5%) are unreachable on every serving path**; **65 (16.9%) on the default path**.
- Named: G6 `6.NS.C.6`, `6.NS.C.8`, `6.EE.B.8`; G8 `8.EE.C.8`, `8.G.C.9`; HS `N-CN.7/8/9`, `A-APR.1/4/5/6/7`, `F-TF.8/9`, `G-CO.11`, `G-SRT.6/7`, `G-GMD.1/2/3/4`, `S-ID.5`, `S-CP.4/8`.
- **`G-GMD` is a whole dead high-school domain.** `G-MG` dies too on the default path. 8 dead clusters (15 on the default path).

*Not independently re-verified by the lead.*

### 3.6 🟠 Content that is mathematically or pedagogically wrong

| Item(s) | Grade | Defect |
|---|---|---|
| `t_sse_compare` ×23 | 11 | **Every item's answer is `f`.** Typing `f` scores 23/23. Topic `us-ca-math-s5-chapter-04` is 54.8% `f` |
| `s1-c05-q13`, `-q19`, `s4-c05-q04` | 7, 10 | Probabilities outside [0,1] offered as options — `"4.125"`, `"4.9"`, `"9"`, `"4.25"`, from an `answer + 4` generator |
| `t_expected_value` ×14 | 11 | Every raffle has **positive** expected net gain — the opposite of what `S-MD` exists to teach |
| S2-c03 ×43 | 8 | Chapter titled *"Transformations and Similarity"* has zero similarity, zero dilations, zero rotations — all 43 ask only for a y-coordinate |
| `add-subtract-bignum-q03` | 4 | Padded option prints **"4,000 + 2,000 = 9,000"** — a false equation shown to a G4 student learning that exact operation |
| `scaled-graphs-q01` | 3 | Stem says *"A row shows 4 **books**"*, key (20) needs it read as 4 **symbols**; sibling q02 correctly says "6 symbols" |
| `function-notation-q03` | 9 | Keyed option *"the integers (counting numbers)"* is self-contradictory; a sequence's domain is ℕ, not ℤ |
| `protractor-q01/02/03` | 4 | Tagged `4.MD.C.6` (*measure* with a protractor); all three only *name* an angle from a given measure |
| `constructions` ×3 | 10 | `G-CO.12/13` requires *performing* constructions; all three are vocabulary MC |
| `p2-2-oa-fluency-arrays` | 2 | Teaches multiplication (*"5 × 7 = 35"*) where `2.OA.C.4` specifies repeated addition, ≤5 columns |
| 3 G3 explanations | 3 | *"Perimeter is twice length plus width"* — reads as 2ℓ+w, not 2(ℓ+w) |
| 3 fraction items | 4–5 | Grade the **stem's own fraction** as correct (`1/8` passes *"name a fraction equivalent to 1/8"*) |
| 105 items | 8–11 | Grade-8 `SP` residual/prediction content reused verbatim in Math I **and** Math III; `s2-c05-q26` ≡ `s3-c05-q16` |
| 256 of 514 numeric MC (49.8%) | 6–12 | At least one distractor is `answer ± k` (k ≤ 5), unrelated to any parameter — diagnostically worthless |

### 3.7 🟠 The high-school course sequence is neither CCSS pathway

CCSS Appendix A defines exactly two three-year high-school sequences, and California's framework is neutral between them: **Traditional** (Algebra I → Geometry → Algebra II) and **Integrated** (Mathematics I → II → III). The G6–G12 pack's own `courseLabel` fields:

| Grade | `courseLabel` | Reads as |
|---|---|---|
| S3 / G9 | High School **Mathematics I**: *Algebra and Functions* (MAIS sequence) | traditional **Algebra I** |
| S4 / G10 | High School **Mathematics II**: *Geometry and Quantitative Reasoning* (MAIS sequence) | traditional **Geometry** |
| S5 / G11 | High School **Mathematics III**: *Advanced Functions, Trigonometry, and Statistics* | traditional **Algebra II** |
| S6 / G12 | High School **Mathematics IV**: *Modeling, Statistics, and Calculus Readiness* | **Precalculus** |

This is **integrated naming wrapped around traditional content**, in a four-year sequence neither pathway defines, self-described as an in-house "(MAIS sequence)". Genuine Integrated Math I is not "Algebra and Functions" — it deliberately mixes coordinate geometry, congruence and one-variable statistics into year one. A California district reading "Mathematics I / II / III" will expect integrated content and receive traditional.

**Consequence for this report:** the placement findings below were scored against the traditional pathway, and the subtitles confirm traditional intent — so they stand:

- `geometric-series` → G10 Geometry (likely word-matched on "geometric"; series belongs in Alg II / Math III)
- `conic-sections` → G9
- `matrix-equations` → G9 while its siblings sit at G12
- `G-GPE` coordinate geometry → G9 *(this one would have been **correct** under a real integrated pathway — it is only an error because the sequence is traditional in substance)*

**Recommendation:** either rename the courses to Algebra I / Geometry / Algebra II / Precalculus to match their content, or genuinely re-distribute the standards to the integrated pathway. The current hybrid misrepresents the sequence to any CA-aligned buyer.

---

## 4 · Bilingual quality

**Clean results worth stating up front:** **zero** Simplified characters leaking into `zh`, **zero** Traditional leaking into `zhHans` (cross-checked with two independent character sets); zero empty locale fields; zero option-count or missing-locale defects; zero numeric drift between language variants after prefix normalisation; zero cross-language MC grading failures across all 1,144 MC items.

### 4.1 The gates are structurally blind

`scripts/audit-zh-hans.mjs:8` sets `scanRoots = ["app","components","data","lib","types"]` with `sourceExtensions = {.ts,.tsx}` and matches `zh: "…"` with a source regex. `scripts/audit-hk-chinese.mjs` is a TS-AST walker over the same directories. **Neither can open a `.json` question pack.** Verbatim run:

```
Scanned files: 1694   Localized zh strings found: 7408
Issues: 5149   Critical: 0   Warnings: 0   Advisory: 5149
```

Filtering all 253 output lines for `generated-content` / `usCalifornia` / any `data/` path gives **0 matches**. It is green because it is blind. And `audit:zh-hans` is not in CI at all.

*(Note: `hkChineseGlossary.ts` is HK-track governance — it rejects `一年級`, which the CA track correctly uses. Do not apply it to CA.)*

### 4.2 The sanitizer's rules are dead code for live content

`sanitizeStudentText` (`data/usCaliforniaQuestions.ts:39`) strips `Activity N:` / `練習活動 N：`, `DeepSeek` / `深度求索`. Across all 20,190 localized fields of the three live packs there are **0 hits** — every rule targets the **retired** DeepSeek pack (whose 1,500 prompts all begin `Activity 1: DeepSeek practice:`). It is also applied to `prompt` **only**; `options` and `explanation` pass through raw.

Meanwhile the artifact that *does* survive is unhandled: `"<KnowledgePoint> checkpoint: "` on **492/492** English prompts, plus the lesson code `"1-H.1 …"` on 144 Grade-1 prompts. The Chinese side substitutes a generic grade+domain label instead, so the knowledge-point identity is lost for Chinese readers and the two languages disagree.

### 4.3 Localization defects

| Sev | Finding | Count |
|---|---|---|
| P0 | Pack B untranslated + leads selection (§2.5) | 810 items / 464 slots |
| P0 | Free-response asks in Chinese, accepts only English (§2.2) | 22 items |
| P1 | Grade-1/2 work labelled **kindergarten** in Chinese — `幼兒園幾何練習：` while `grade` is `P1`/`P2` (`p1-1-g-shape-reasoning-q02/03/04/08/09/10`, `p2-2-g-partition-shapes-q01/02/06/07/08/12`) | 12 items |
| P1 | `zhHans` prompts carry an extra clause absent from `zh` and `en` — `在教室垫上，选出最合适的答案：` — wrong on fill-in items where there is nothing to choose | 37 items |
| P1 | English distractors inside Chinese pack-C questions (`both fit equally well`, `cannot be determined`) — never the key, so grading is unaffected | 12 items |
| P2 | Topic labels render English for Chinese readers — `usCaliforniaTopics.ts:257-258` wraps English-only titles in `localized()`, which defaults `zh = zhHans = en` | all topics |
| P2 | Explanations drop the data set (`Mean = (19, 21, 27, 29) sum 96 ÷ 4` → `平均數 = 總和 96 ÷ 4`); ~17 similar-triangle prompts drop "scale factor of N" | ~37 items |
| P2 | ASCII `x` for multiplication in Chinese text (`5 x 7 = 35`); pack C correctly uses `×` | 56 items |

### 4.4 Terminology — fix list

| Concept | Found | Should be | Note |
|---|---|---|---|
| square corner | `方角` ×18 | **`直角`** ×115 | `方角` is **not a mathematical term**; the same items' own explanations already say `直角` |
| number line | `数线` ×65 | **`数轴`** | `数线` is not PRC standard; `数轴` appears **0** times anywhere |
| perimeter | `周界` ×6 | **`周長`/`周长`** ×44 | `周界` is HK EDB usage — and `audit-zh-hans.mjs` already lists it as a **critical** violation; it simply cannot see these files |
| base ten | `十进位` ×72 | **`十进制`** | PRC standard |
| "not enough information" | `资料不足` ×6 | **`信息不足`** | `资料` means *documents* in PRC usage |
| equal groups | `相等組`/`相等组` ×35 | `每組數量相同` | calque |
| cubes (manipulative) | `立方塊`/`立方块` ×42 | `積木` / `小正方体` | K–2 register |
| objects | `物件` ×27 | `物品` | zhHans `物件` reads as a software *object* |
| coordinate | `座標` ×1 | `坐標`/`坐标` ×161 | one-off inconsistency |
| data | `資料` ×78 (pack A) vs `數據` ×171 (pack C) | pick one per track | cross-pack inconsistency |
| jumps | `跳距` ×3 | `等分` / `間隔` | |
| mean | `平均數` ×114 vs `平均值` ×28 | unify | both correct; low priority |

*Verified as correct and deliberately not flagged:* `算式` (K–5) vs `代數式` (G6+) is a correct register split; `對邊` vs `斜邊` are different concepts. ~30 further terms checked and consistent.

**Not covered:** English source correctness, rendered UI (font fallback, line-breaking, diagram labels), native-speaker tone review. Trad/Simp detection used a ~1,500-pair table, not full OpenCC.

---

## 5 · Lessons and textbooks

**Zero wrong final answers.** Every worked example, guided-practice item and checkpoint across all 44 live lessons — and all 305 numeric items in the v1 textbook-pack — computes correctly. The damage is structural.

### 5.1 🟠 All 29 K–5 lesson bodies are dead code

`data/usCaliforniaLessons.ts:587` —
```ts
function textbookCoreBlocks(lesson) {
  const topicId = lesson.metadata.topicId;
  if (hasCcssLessonAssignment(topicId)) {
    return ccssInteractiveLessonBlocks(topicId);   // ← always taken
  }
  …                                                // ← generated body: never reached
}
```
Lead-verified: **29 of 29** K–5 topics have a CCSS assignment. So `launch`, `conceptExplanation`, `workedExample` and the **entire `answerKey`** never render.

Consequences:
- Students get a guided-practice question with **no answer anywhere in the product**.
- The 29 lessons that received S18 QA sign-off are **not what students see**.
- **The 270 interactive lessons in `components/lesson/ccss/lessons/` (26,980 lines) are the real K–5 teaching surface — and no one has ever audited them.** Two independent agents flagged this as their blocking coverage gap. This is the single largest unknown in this report.

### 5.2 🟠 Lesson-level structural defects

- **28/29** K–5 guided-practice prompts are verbatim copies of the worked example (*"Find 246 + 130."* twice).
- **15/15** middle-school checkpoints are the guided-practice question — with its answer displayed directly above in the same view.
- **6/29** K–5 `deterministicChecks` report `"pass"` for a *different problem*: `p3-3-g-categories` validates `"pentagon"` for a lesson whose answer is `1/4`; `p4-4-nbt-multi-digit` validates `"347"` for `34 × 7 = 238`.
- **Grade-level violations:** G6 `6.NS` teaches via `2 − (−3.5)` (a 7.NS method); G6 `6.EE` solves two-step equations (`6.EE.B.7` is one-step only); G6 `6.G` gives whole-number prism volume (a 5.MD problem); G8 `8.SP` "bivariate data" poses a **one-variable** percent problem; K `K.MD` measures in iterated cube units (1.MD).
- **Standards over-claim:** 229 standards claimed across 44 lessons that have exactly **one** worked example each. `p2-2-md-measure-data-money-time` claims 10 standards — tell-time, money, bar graphs — and delivers `14 − 8 = 6`.
- **v1 textbook-pack:** its 245-problem practice corpus collapses to **3 templates**; a Grade-11 trig chapter's seven practice problems are all *"A design team uses 24 tiles for 6 identical panels…"*. The whole Grade-9 book is standard-shifted (0/5 correct domains); S6 ch3/ch4 are swapped.

### 5.3 Reachability

- **Middle school (15 lessons):** all render, all concept PNGs resolve — but **no navigation anywhere links to `/lesson/california-middle-school-textbook`**. Direct-URL only.
- **v1 textbook-pack:** declares `integrationStatus: "not-integrated-into-live-lessons"`, yet is served at `/lesson/california-middle-school-textbook/review`, which `middleware.ts` gates for **any signed-in user, including students**.
- No UI entry points at missing lessons — orphaning runs data→UI only.

---

## 6 · Diagrams and figures

**87 of 87 figure specs verified.** The practice-figure layer is genuinely healthy; the worked-example layer is not.

**Healthy:** `QuestionDiagram` → renderer is **5/5** (`coordinate-grid`, `plane-figure`, `number-line`, `solid-figure`, `ten-frame`), with trilingual alt text and `language` correctly threaded.

**Broken:**

1. 🔴 **No CA high-school figure `kind` reaches a renderer.** `exactLayerSrc` has **zero consumers** anywhere in `components/ app/ lib/ tests/` — lead-verified: it appears only in `data/usCaliforniaHighSchoolLessonIllustrations.ts` itself. Both CA HS pages call `WorkedExampleIllustration`, which re-infers a kind from English prompt text and collapses all 40 worked examples onto **2 generic scenes**. All 15 authored kinds are discarded; all 40 authored SVGs are dead assets.
2. 🔴 **`CoordinateFunctionScene` hardcodes a false table.** All 35 of those figures print the same rising line and the same table `1→3, 2→5, 3→7` (y = 2x + 1) — beside *"find the vertex of x² − 6x + 5"*, *"arc length in terms of pi"*, *"△ABC ≅ △DEF by SAS"*, *"P(t) = 500(1.08)^t"*.
3. 🔴 **Two parabolas peak in the wrong place.** `s3-chapter-03/worked-example-2.svg` labels a marker `vertex t=1.5` at **t = 7.5**; `s6-chapter-05/worked-example-2.svg` labels `max 900 at p=15` where the curve peaks at **p = 7.5**. The generator forces the vertex to the plot midpoint.
4. 🔴 **A copy-pasted figure.** `s5-chapter-02/worked-example-1.svg` is byte-identical to `s3-chapter-02`'s — an exponential problem illustrated by a straight line labelled `f(8)=21`.
5. 🔴 **False equation badges on a live route** — see R5 below.
6. 🔴 **Interval diagrams have openness backwards.** Three examples share one hardcoded segment with an *open* left dot and *closed* right dot. `[0.48, 0.64]` and `[69, 75]` are closed; `[12.35, 12.45)` is exactly inverted. Endpoints are labelled `left`/`right` — no numbers.
7. 🔴 **Geometry templates ignore their problem.** `s4-chapter-02` draws two *identical-size* triangles for "scale factor = 2" and two *non-right* triangles for "legs 9 and 12". `s4-chapter-03` ships an unsubstituted placeholder reading literally **"r = 6 or 5"**.
8. 🔴 **The flagship CA Grade-1 concept image is wrong in three places.** `add-subtract-stories-single-panel-source-hd.png`: the ten-frame draws **10** counters but is labelled **"= 11"**; the part–part–whole tray draws **9** counters (story says 8) under a "whole = 11" card; the hand-off card carries **4** green counters, not 3. The number line and equation panel *are* correct (8 + 3 = 11) — so the image contradicts itself.
9. 🟠 **Coverage.** Diagram coverage on live CA questions is **10 / 2,802 = 0.36%**. Zero figures across all 44 lesson records, while 25 name a representation in the student text (13 middle-school lessons instruct *"Use vertical number line to explain the reasoning"*). **48** live questions reference a visual with no diagram — including `k-nbt-teen-numbers-q09` whose own siblings q01/q05 *do* get one.

**Blast-radius note:** `CaliforniaHighSchoolTextbookStudentPage` is unmounted dead code and the only live CA HS surface is a `noindex` QA route — so findings 1–4, 6, 7 have low real-world exposure today. **Findings 5 and 8 are on live student routes.**

**None of this is caught by the existing audits**, which check asset existence, route/owner reachability and viewBox contracts — never whether a figure's mathematics matches its text, never `kind`→renderer alignment, never whether an asset is referenced at all.

---

## 7 · Root causes — traced to source

Three separate findings collapse into one file: `scripts/build-ccss-practice-pack.mjs`.

**R1 · The 810 untranslated items are one 3-line function.**
```js
// scripts/build-ccss-practice-pack.mjs:169
function L(en) { return { en, zh: en, zhHans: en }; }
```
Applied to every localized field: `prompt: L(question.prompt)`, `options: options.map(L)`, `explanation: L(question.explanation)`. The pack was **never translated** — the builder stubs the Chinese fields with English. One-function fix plus a translation pass, not 810 individual repairs.
*The same pattern recurs twice more:* `data/usCaliforniaLessonIllustrations.ts` uses `localized(en) → { en, zh: en, zhHans: en }`, and `usCaliforniaTopics.ts:257-258` wraps English-only titles the same way.

**R2 · The multi-correct P0 was manufactured by the option-padder.**
Upstream has 3 options (479 items) or 2 (10 items); MAIS requires 4, so the builder pads **all 489**:
```js
// scripts/build-ccss-practice-pack.mjs:150 — first candidate is answer + 1
const candidates = [answer + 1, answer - 1, answer + 2, answer * 2, …];
```
For `inequalities-q01` (key `5`) this synthesized `6`, which also satisfies `x > 3`. The padder checks only for **duplicate** options (line 231), never for a second **correct** one. *Lead sweep: of all MC items whose prompt encodes a machine-checkable inequality, **1 of 1** has multiple correct options here; **0** in the G6–G12 pack. The mechanism is systemic (489/489 items); the realized defect is one item. Fix the padder, then re-audit.*

**R3 · `difficulty` is a pure function of grade.**
```js
difficulty: lowGrades.has(grade) ? "Low" : highGrades.has(grade) ? "High" : "Medium"
```
The 138/393/279 split is literally K–P2 / P3–S2 / S3–S6 — **zero within-grade discrimination in 810 live items**. In the G6–G12 pack the field is *rotated* rather than derived: 106 prompts carry conflicting Low/Medium/High labels. Both feed `questionStore.ts` and `teacherAssignmentGeneration.ts` filtering. Compounding it, the share of no-number definition-recall MC rises from 9% at Grade 4 to **76% at Grade 10** — 90 items, all labelled "High", mostly vocabulary; 48 lessons (18%) have no computational practice at all.

**R4 · `manualQaStatus` is hardcoded by the builder, not earned per item.**
`manualQaStatus: "accepted-ccss-textbook-hand-check"` sits in the shared `base` object stamped onto all 810 items. The upstream hand-check covers stem, key and explanation — but **option sets are machine-generated after that stamp**, and `acceptedAnswers` is always a single string. That label is what let the padder-generated P0 through.

**R5 · A regex that silently drops `^` puts false equations on live student figures.**
`components/lesson/workedExampleIllustrationMetadata.ts:393` `extractFocusText` matches number-operator runs over `+ - x * / = :` — **`^` is not in the operator set**, so matching restarts *after* the caret and the exponent's base is lost:

| Source text | Badge rendered | Truth |
|---|---|---|
| `8^2 = 64` | **"2 = 64"** | false |
| `9^2 + 12^2` | **"2 + 12"** (= 14) | shown beside the answer 15 |
| `3.14 × 4^2` | **"3.14 x 4"** (= 12.56) | πr² = 50.24 |

Lead-verified at source. Route: `/student/lessons/california-middle-school-textbook` — **a live student route**.

---

## 8 · Governance — the provenance layer does not match reality

**8.1 · Three of five live packs are stamped "not live-approved".**

| Pack | Live? | Self-declared status |
|---|---|---|
| `us-ca-k5-knowledge-point-practice-v1` | ✅ all K–5 practice | `packageStatus: "candidate-only"`, `integrationStatus: "candidate-only-not-live"`, `excludedScope: ["live data/usCaliforniaQuestions.ts imports"]` |
| `us-ca-math-g6-g12-generated-bank-v2-1500` | ✅ 1,500 items | **no status fields at all** |
| `ccss-textbook-practice-v1` | ✅ | `live` / `upstream-hand-checked` — consistent |
| `us-ca-math-k-g5-textbooks-v1` | ✅ `textbookLive` | `"approved-for-review"`, `"…s18-human-sampling-required"`, `integrationStatus: "candidate-only"` — while `toTextbookLessonSeed` hard-codes `productionReady: true`. **Nothing in the code reads the pack's own status.** |
| `us-ca-math-middle-school-textbooks-v2` | ✅ | `approved-for-production` — consistent |

**1,992 of 2,802 live items (71%)** come from packs whose own metadata does not authorise live serving.

**8.2 · The 492-pack's QA report disclaims the state it is now in.** `coordination/content-qa/us-ca-k5-knowledge-point-practice-v1/qa-report.md` verdict `candidate-only-two-round-qa-pass` — *"remains explicitly not live-integrated… not an approval for S04/S05 live data edits, route exposure, public curriculum claims, or production release."* It lists *"Live files intentionally not edited: `data/usCaliforniaQuestions.ts`, `data/usCaliforniaTopics.ts`"* — both of which now serve it. `checksNotRun`: `["live app integration", "browser regression for practice filters", "human classroom trial"]`.

Its three named open risks were never closed — and **all three are confirmed defects in this report**: *"topic-adapted seed bank, not a complete production bank"* (§3.5), *"bilingual Chinese fields… should receive S09 language polish"* (§4), *"No answer-critical visuals are included"* (§2.7, §6.9).

**8.3 · The largest live pack has no committed QA evidence.** All 1,500 G6–G12 rows are stamped `manualQaStatus: "accepted-auto-sample"`, `deepseekQaStatus: "not-run-not-needed"` — uniform, no per-row distinction. `coordination/session-logs/2026-06-01-S18.md:456` records the review as `--auto-accept-sample` accepting **63 rows (4.2%)**. The log lists `coordination/content-qa/us-ca-math-g6-g12-generated-bank-v2-1500/` under "Files changed" — that directory **does not exist and has no git history**. The repo's own inventory agrees (`2026-06-21-S21-…-restoration-inventory.md:28`).

**8.4 · Other false status claims.** `mathQaStatus: "passed-deterministic-check"` is false for 6 K–5 lessons (§5.2). `unresolvedRisks: []` in 44/44 lessons. The v1 pack's 15 middle-school chapters claim `"s18-approved-for-…-student-route"` while their own parent book says `"generated-pending-human-curriculum-review"`. `WorkedExampleIllustration` hardcodes `qa.status: "qa-pass"` in a data literal.

**8.5 · Half the content audits that exist are not enforced.**
CI runs `audit:us-math-items` ✅, `audit:lesson-illustrations` ✅, `test:question-bank` ✅, `test:ccss-textbook` ✅.
CI does **not** run `audit:zh-hans` ❌, `check:hk-zh` ❌, `qa:full-question-bank` ❌, `audit:ccss-depth` ❌.

**8.6 · Source-policy compliance.** `claimsNotAllowed` and source policy **PASS** for the K–5 and middle-school lesson packs — a longest-common-run scan against all 229 CCSS descriptions found a maximum overlap of 9 words (*"a function assigns exactly one output to each input"*, the standard definition). The v1 textbook-pack is the exception: its stricter `prohibitedUse[0]` bans *paraphrase*, and 8 of its `learningGoals` closely restate CCSS operative clauses in three languages.

---

## 9 · What a student actually experiences

A practice round is **5 questions** (`freeSelectionRoundQuestionCount` / `adaptiveQuestionSetSize`; lesson checkpoint = 8), selected as `.slice(0,5)` over a memoised **unshuffled** list.

- On the default path a student gets **exactly one distinct round per topic** — 4 rounds for all of Grade 2, 5 for each of Grades 6–12.
- That reaches **8–9% of the G6–G12 bank** and 13.6% of the live bank.
- Across every filter combination: 825 rounds, 67% of items reachable. Union of all three serving paths: 2,126 / 2,802 — **676 items (24.1%) are stranded and can never be served.**
- Non-repeating 5-question sessions per grade: K 18, G1 43, G2 18, G3 20, G4 22, G5 19, G6 38, G7 36, G8 38, G9 40, G10 33, G11 31, G12 30.

**Topic starvation is worse than item counts suggest:** Grade 2 has **4 topics for the entire year**; Grades 6–12 have **5 topics each**. Items per grade: K 102, G1 237, G2 111, G3 120, G4 138, G5 120, G6 284, G7 275, G8 281, G9 299, G10 305, G11 264, G12 266.

---

## 10 · Coverage of this review

**All 8 agents reported.** CCSS textbook practice (810/810 reviewed, 508 re-solved) · G6–G12 correctness (350/1500 read in full, 67/67 templates + 14 programmatic axes) · K–5 knowledge point (492/492 loaded, 360 read in full, 422 keys recomputed, every acceptance claim proved against the real grader) · coverage/variety (full-corpus mechanical) · textbook lessons (44/44 lessons + 35/35 chapters + 12 micro-lessons) · diagrams (87/87 figure specs) · localization (2,802 items / 20,190 fields) · student answer path (grader traced and executed, all 5 CA test suites run) · plus the lead's own full-corpus measurement and source tracing.

### Classes actively hunted and found clean

- **No contradictory answer keys** — every identical-prompt group across all three live packs shares an identical key. 0 conflicts.
- **No cross-pack duplication** — 0 identical prompts between any pair of the three live packs.
- **No chain-of-thought leakage** — 0/810 in the CCSS pack, 0/1500 in the G6–G12 pack.
- **No Traditional/Simplified leakage** in either direction, in any pack.
- **No cross-language MC grading failures** — all 1,144 MC items verified against the executed grader.
- **No phantom CCSS codes** in the practice packs — all 385 resolve.
- **No MC item lacks options, and no MC answer sits outside its own option set** — 0/1,144. No distractor is ever accepted; no duplicate options survive normalisation.
- **Every answer key grades itself correct** — 1,658/1,658 non-MC items.
- **`sanitizeStudentText` destroys nothing** — it changes only 57 of 8,406 strings, all pure double-space collapses; 0 emptied, 0 losing mathematical content.
- **No item is genuinely unanswerable without a figure** — every visual-referencing stem restates its numbers in text. (That is also §2.7's defect seen from the other side.)
- ⚠️ **"No `answer` vs `independentAnswer` disagreement" (0/2,802) is NOT a clean result** — it is 0 by construction; see §1.1.
- **Arithmetic accuracy** — 508 CCSS-pack items re-solved: 2 wrong keys (0.39%). K–G3: 0 wrong in 198. High school: 0 wrong in 138. K–5 pack: 422 keys recomputed, **0 mismatches**. All 44 lesson worked examples correct. Sig-fig rounding re-verified on all 20 items.
- **The retired DeepSeek pack is genuinely out** — nothing renders empty without it.

### Explicitly NOT covered — treat as unknown, not clean

1. **The 270 CCSS interactive lessons** (`components/lesson/ccss/lessons/`, 26,980 lines) — **the actual K–5 teaching surface** (§5.1). Never audited by anyone. **This is the top follow-up.**
2. **Chinese mathematical *accuracy*** — completeness, script integrity and terminology were measured; whether each translated sentence states the same mathematics was spot-checked, not exhaustively verified.
3. 1,150 of 1,500 G6–G12 items never read individually (33 templates seen at only 2 examples each).
4. Rendered UI — nothing verified in a running app: font fallback, line-breaking, dark mode, zh/zhHans rendering, narrow-phone ten-frame wrap, figure legibility.
5. `conceptIds` / `competencyTags`, `evidenceCardIds` / `sourceIds` provenance, teacher-facing surfaces.
6. ~~HS grade-placement calls assume the CA traditional pathway.~~ **Resolved from the data — see §3.7.** The pack's own `courseLabel` subtitles follow the traditional pathway, so the §3.6/§3.7 placement findings stand as scored.

### Environment problem you should know about

This machine's boot volume (`/System/Volumes/Data`, 460 GiB) is **100% full** — it fell to 190 MiB free mid-run and repeatedly broke all shell execution for both the lead session and the agents. I deliberately did **not** launch the 270-lesson audit as a further multi-agent pass, because at ~1.3 GiB headroom it would likely have exhausted the disk and destroyed in-flight work. This needs fixing independently of this report; it will keep breaking builds, tests, and agent runs.

---

## 10a · These are platform defects, not California defects

An independent seven-lane QA of the **Hong Kong** math track, run the same day against 989 questions, found the same four structural problems (`HK Math Content QA Report 2026-08-26.md`, repo root):

| Defect | California | Hong Kong |
|---|---|---|
| Grader marks correct free-response answers wrong | trailing period breaks all 1,658 non-MC items | 90/795 items (one lane measured 54% of its slice) |
| No option shuffling anywhere in the practice path | "click option 1" = **94.5%** on the leading pack | "always tap A" = **60.3%** of the MC bank |
| Solvability gate compares the answer to itself | `independentAnswer = question.answer` for all 1,144 MC | *"for MCQ it compares `question.answer` against itself"* |
| Chinese audit walks only `.ts`/`.tsx`, never the JSON packs | `audit-zh-hans.mjs:8` | `audit-hk-chinese.mjs` — never scanned the 701-item pack |

Both tracks also report the same headline shape: **the mathematics is sound; the pipeline around it is not.**

**This changes the fix economics.** Items 0, 4, 14 and 15 below are not California work — they are single fixes in `lib/server/answerMatching.ts`, the option-serving path, CI config, and the solvability harness that repair **every curriculum track at once** (CA, HK, and by inspection AR and FL, which share the same grader and gates). Scope them platform-wide and the cost per track collapses.

---

## 11 · Recommended order of work

Ranked by student harm per unit of effort. Items 1–6 are small and mechanical, and together remove **every P0 in this report** plus the two worst systemic exploits.

| # | Action | Effort | Fixes |
|---|---|---|---|
| 0 | **Finish the grader** in `lib/server/answerMatching.ts`. Terminal punctuation and thousands commas are already handled on `main`; still missing: accept a leading `<var> =` when the prompt asks for that variable, tolerate a leading article and plural `s` on word answers, accept the stem's own noun and common clock formats — and **stop treating `km` and `cm` as interchangeable** | XS–S | 43 article + 22 unit-false-accept + 13 stem-noun + 10 `x =` + 3 clock |
| 1 | Add Chinese accepted-answers for the 22 hard-blocked items; broaden `acceptedAnswers` for stem-nouns and two-part answers | S | the remaining K–5 P0s |
| — | ~~§4.4 terminology + §2.5 translation scaffold~~ | ✅ | **done** — `i18n/ca-translation-scaffold` (`d8cb9362e4`) |
| 2 | Re-key the 5 π-sector items to decimals; fix `inequalities-q01`, `divide-two-digit-q02`, the G7 sign-error explanation; add an `answer+1` correctness check to the option-padder | S | 9 P0 items + the mechanism |
| 3 | Add `^` to the `extractFocusText` operator set (or match exponents explicitly) | XS | false equations on a live student route |
| 4 | Shuffle MC options at serve time, or re-order in the packs | S | kills a 94.5% exploit across 1,144 items |
| 5 | Fix `practiceDifficultyQuotas` to recognise `Foundation/Core/Challenge/Exam` | XS | un-strands 1,500 items; also reduces the 76.3% English-only exposure |
| 6 | Strip `"<Cluster> checkpoint:"` and `"1-H.1"` in `sanitizeStudentText`; retire its dead DeepSeek rules | XS | all 492 K–5 items |
| 7 | **Audit the 270 CCSS interactive lessons** — the real K–5 teaching surface, currently unreviewed | L | the largest unknown in the product |
| 8 | Replace `L(en)` with a real translation pass over `ccss-textbook-practice-v1`; same for `usCaliforniaLessonIllustrations` and `usCaliforniaTopics` titles; apply the §4.4 terminology fixes | M | 810 items + all CA figure captions and topic labels |
| 9 | Either wire `exactLayerSrc` into `WorkedExampleIllustration` or delete the 40 dead SVGs and 15 unused kinds; fix the parabola-vertex and interval-openness generators; correct the G1 concept PNG | M | figure layer is currently decorative and sometimes false |
| 10 | Decide what the 29 dead K–5 lesson bodies are for — restore them, or delete them and their QA records | S | removes a whole class of false status claims |
| 11 | Re-derive `standardIds` from content, not list position; canonicalise the 81 middle-school codes | M | 342 + 48 + 81 mistagged; unblocks standards features |
| 12 | Author real variety for the G6–G12 bank (102 skeletons → target ≥400) and raise topic counts (G2 has 4 topics/year) | L | the core content-depth problem |
| 13 | Reconcile pack status metadata with reality; commit or re-run the missing G6–G12 QA evidence | S | governance |
| 14 | Wire `audit:zh-hans`, `qa:full-question-bank`, `audit:ccss-depth` into CI; **extend the zh audit to scan `data/generated-content/**/*.json`**; add a figure-vs-text consistency check | S | stops regression — today the zh gate is green because it is blind |
| 15 | **Give California a real prompt-derived solver** (as Mainland PEP High already has) instead of `independentAnswer = answer`; add reject-direction grader tests fed with plausible student variants; assert option-position entropy and figure coverage | M | §1.1 — without this, the next QA pass will also come back green |

**Suggested immediate next step:** items 0–6 are roughly a day of mechanical work and clear every P0 that remains. Item 0 is still the best hour: `main` already accepts `9.` and `1,500`, so finishing the same function — articles, plurals, stem nouns, `x =`, clock formats, and the `km`/`cm` false-accept — closes ~110 more items in one file.

Item 7 is the one that should worry you most: it is the content K–5 students actually see, and nobody has ever looked at it.

Item 15 is what stops this from recurring — until California's solvability check re-derives answers from prompts, a green gate tells you nothing.

---

*Full per-agent findings files (item-level tables, ~2,500 lines total) are in this session's scratchpad at `/private/tmp/claude-501/-Volumes-Starship-MAIS-MVP/88fea60a-f98b-4e96-943c-59d4a8885613/scratchpad/qa-ca-*.md`. Copy them somewhere durable before that volume is cleared.*
