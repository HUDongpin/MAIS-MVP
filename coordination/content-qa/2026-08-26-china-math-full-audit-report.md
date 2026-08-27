# China Math Content QA — Full Audit Report

- **Date:** 2026-08-26
- **Scope:** All Mainland China mathematics content shipped by MAIS — 17,700 questions, 335 topics, 335 lessons, across 3 publishers (人教版 PEP / 北师大版 BNU / 沪教版 HJB) and 12 grades (P1–P6, S1–S6)
- **Method:** 10 parallel specialist agents + a deterministic whole-corpus pre-scan and gate audit
- **Verdict:** **Do not ship any China slice as-is.** The mathematics is largely correct; the assessment layer, the grading layer and the release gate around it are not.

---

## 1. Executive summary

The single most important finding is not a content defect. It is that **the quality gate protecting this content cannot fail.**

`buildFullQuestionBankSolvabilityAudit()` verifies every answer key against an
"independent answer". For all 17,700 China items, that independent answer is a
copy of the answer key itself. The gate therefore reports:

> `passRows: 24566, failingRows: 0` — `releaseRecommendation: "Green: all current questions are deterministically solvable and answer-key matched."`

while certifying, among others, this row:

> `{"questionId":"pep-primary-p1-u-mc-051","grade":"P1","storedAnswer":"sphere","independentAnswer":"sphere","status":"pass","severity":"none","notes":["OK"]}`

That is a 一年级 item whose answer key is the English word "sphere", options
正方体/圆柱/球/长方体, shown to the child as 「正確答案：sphere」 after a wrong
attempt and written permanently into their 错题本. The gate says OK.

Everything in section 3 got through because of this. **This is also not a China
problem** — measured platform-wide, 24,502 of 24,566 rows (99.7%) are self-verified,
including HK 989/989 and US_CA 2,802/2,802.

**The good news, stated plainly:** where agents independently re-derived answers,
the mathematics held up well. 4,800/4,800 pep-high keys re-derived with sympy
(19 wrong), 1,500/1,500 bnu-high keys (0 wrong), 2,343 pep-primary/junior keys
(0 arithmetic errors), 1,274/1,500 hjb-high templated keys (130/130 correct on
the largest cluster). Terminology is genuinely mainland — only 65 deviating
items in 17,700, no Taiwan/HK vocabulary of consequence, and **zero traditional
characters in any learner-facing prompt, option or explanation** (all three
pre-scan "traditional leakage" signals were false positives caused by the
character 限, which is simplified).

The failure is not in the maths. It is that the bank does not work as an
assessment, the grader rejects correct Chinese answers, and internal pipeline
text is printed to learners.

---

## 2. Slice health at a glance

| Slice | Items | Ship? | Decisive reason |
|---|---:|---|---|
| **pep-primary** 人教·小学 | 1,200 | ❌ Rebuild | Only **724 distinct prompts** (49% duplicates); one item served 13× |
| **pep-junior** 人教·初中 | 1,200 | ❌ Rebuild | **39 skeletons** for 1,200 items; 圆 = **0 items**; 11 impossible triangles |
| **pep-high** 人教·高中 | 4,800 | ❌ Fix + re-scope | Correct option is **A in 100%** of 1,620 MC items |
| **bnu-primary** 北师·小学 | 3,000 | ⚠️ Conditional | Strongest slice; blocked by 11 wrong-key items + 34% `acceptedAnswers` debris |
| **bnu-junior** 北师·初中 | 1,500 | ❌ Repair | ~**5.1%** wrong-key rate; 115 items print QA reviewer memos to learners |
| **bnu-high** 北师·高中 | 1,500 | ❌ Rebuild | Correct option is **B in 100%** of 525 MC; 85.6% duplicates |
| **hjb-primary** 沪教·小学 | 1,500 | ⚠️ Conditional | Healthiest bank; blocked by 10 key-level items + 6 multi-true MC |
| **hjb-junior** 沪教·初中 | 1,500 | ⚠️ Conditional | Structurally sound; 7 wrong keys, 13 deleted-theorem items |
| **hjb-high** 沪教·高中 | 1,500 | ❌ Re-author S5/S6 | **S5 500/500 and S6 500/500** are one template per topic |

---

## 3. Blockers, ranked

### 3.1 The bank does not function as an assessment

**B1 — A student who knows no mathematics scores 64.4% on the multiple-choice bank.**
The correct option is **A in 1,620/1,620 pep-high MC items (100%)** and
**B in 525/525 bnu-high MC items (100%)**. Options are rendered in stored order;
there is no shuffle anywhere in the serving path
(`PracticeQuestionCard.tsx:642`). Separately, a fixed distractor formula
`{a−d, a, a+d, a+2d}` covers 100% / 100% / 96% of numeric MC in pep-high /
bnu-high / hjb-high, so "always pick the 2nd-smallest number" scores 100/100/99%.
Corpus-wide a zero-knowledge strategy scores **4,079 of 6,338 scorable MC items
(64.4%)** — and every false correct writes `+0.08` mastery into the adaptive state.
*Found independently by two agents.*

**B2 — The grader marks correct mainland answers wrong.** `normalizeAnswer()`
(`lib/server/answerMatching.ts:59`) strips only English units
(`blocks, buttons, cards, cm, counters, cubes, degrees, dollars, …`). There is no
个 张 本 元 米 厘米 千克 分钟 度 in the file. Measured rejection rates for a
correct learner:

| Learner writes | Rejected |
|---|---|
| 「56张」 where key is `56` (the taught mainland habit 「答：还有56张。」) | **76 / 243 (31.3%)** |
| `sqrt(145)` where key is `√145` | **113 / 120 (94.2%)** |
| `pi` where key is `π` | **49 / 49 (100%)** |
| `x^2` where key is `x²` | **51 / 102 (50.0%)** |
| `5,8` where key is `5或8` | **41 / 49 (83.7%)** |
| `8或5` where key is `5或8` (root order) | **42 / 48 (87.5%)** |
| omits the trailing 。 on a 说理题 | **429 / 446 (96.2%)** |

**B3 — 19 pep-high keys are rounded decimals, so the exact answer is graded wrong.**
Keys stored as `-0.167` for −1/6 and `-0.333` for −1/3; `answerMatching.ts:385`
uses a 1e-6 tolerance. Four of these prompts literally instruct
「优先使用精确值，不用猜测小数」.

**B4 — 198 items display a non-Chinese answer key to Chinese learners**
(`sphere`, `cuboid`, `Quadrant IV`, `x=12 or x=17`, US-style `3 R 5` where
mainland writes `3……5`), plus **578 items** answering a 厘米 question with `39 cm`.
Root cause is type-level: in `types/index.ts:1804-1808`, `prompt`, `options` and
`explanation` are `LocalizedText`, but **`answer` is a bare `string`** — the only
learner-facing content field with no language dimension. It is rendered raw at six
sites, three of them student-facing.

**B5 — PEP lessons ship no curated practice set, so PEP learners need 20–40× more work for the same progress.**
All 57 PEP lesson seeds ship `practiceQuestionIds: undefined`, so `userStore.ts:2313`
falls back to *every* question on the topic. A pep-high lesson's practice block holds
**160–320 questions**; every BNU and HJB lesson holds **8**. Because completion is
computed as `attempted / practiceIds` (`userStore.ts:7330`), a 人教版 learner's lesson
progress bar moves 20–40× slower than a 北师大版 learner's for identical effort.

### 3.2 Wrong mathematics

Roughly **90 items are confirmed wrong or ambiguous** by item-by-item re-derivation,
plus extrapolated rates from random samples.

- **11 pep-junior SSS congruence items** (`s2-k06-sa-018…028`) give side triples that violate the triangle inequality (5/8/25, 4/23/34, 14/20/35). The triangles do not exist — in the very unit 三边关系 is meant to teach.
- **8 pep-junior MC items have two correct options** because authoring metadata leaked into the choices: `["89°","91°","180°","89°（少一步）"]`.
- **8 bnu-primary 三视图 items are geometrically impossible**; the author treats 正面图 as width-only and 左面图 as height-only, forgetting the shared vertical axis. `v2-p6-039` is keyed 4; brute force gives **6**.
- **`bnu-primary-ds-v1-p3-091`**: 2025年3月1日星期六 + 30 天 keyed 星期日; correct is **星期一**, and 星期一 is on the option list.
- **`hjb-primary-p4-064`**: keyed D (5/8 = 0.625) when B (4/6 = 0.667) is larger — the explanation prints both values correctly, then states the wrong conclusion.
- **6 hjb-primary MC items have more than one true option** (`p2-028`, `p2-031`, `p2-043`, `p3-249`, `p4-163`, `p5-148`).
- **20 hjb-high `AB·AC` items** are keyed as a plain length product while supplying ∠A=60°, contradicting the slice's own 数量积 items.
- **bnu-junior: 10 wrong keys in a 197-item stratified random sample = 5.1%** (Wilson CI 2.8–9.1%), including 5 items whose conditions are self-contradictory, and 6 of 10 parallel-line items keyed against geometric fact.

### 3.3 Internal pipeline text printed to learners

- **115 bnu-junior items ship an internal QA reviewer's memo as the learner-facing 解析** — 70 of them explicitly state the displayed answer is wrong (「总棱数应为20，**而非24**」, 「但答案却给出√185，**与解释矛盾**」); 28 are truncated mid-sentence.
- **3,972 prompts print generator labels.** bnu-high is **1,500/1,500 (100%)** — every item begins `题组s4-001：在北师大版…`. pep-high is 3,021/4,800 (62.9%) — `RAG-v3 参数讨论 1（集合与常用逻辑用语）：参数讨论填空题任务：`.
- **2,515 explanations end in pipeline boilerplate** with untranslated English error tags spliced into Chinese prose: 「并提醒避免sign chart interval error。」
- **1,914 items** carry `term-XXXX` machine-translation placeholders in `acceptedAnswers` (the codepoint of the character that failed to translate), e.g. `"8thousand term-514b"`, `"boys term-5b69 more"`; **2,028 items** carry traditional Chinese there. This field is used for grading, so the garbage is live.
- **All 22 hjb-junior lessons are the same mad-libs template**, teaching no mathematics. **222 of 335 lessons print raw English kebab-case slugs** to Chinese learners.

### 3.4 Curriculum coverage

- **圆 appears 0 times in all 2,400 PEP junior items**, while the S3上 topic is literally named 「一元二次方程、二次函数、**圆**与概率初步」. Also 0 hits for 绝对值, 尺规作图, 实数, 科学记数法. A 人教版 learner has an entire 中考 chapter missing with no topic to navigate to.
- **人教版 spine is far too coarse**: 24 primary topics against 106 textbook units; 11 junior topics for 3 years (S3 = 2 topics for the whole year). Minimum viable would be ~151 topics vs the current 57 — BNU's 156 is the right reference granularity.
- **hjb-high S5 and S6 are 500/500 and 500/500 single-skeleton per topic.** 582 of 1,500 items (38.8%) require zero senior-high mathematics. The 130 「一组数据为8，13，18，求这组数据的平均数」 items are 1 in every 11.5 items in the whole 高中 bank — and 54 of them are served at **both** 高二 and 高三.
- **bnu-high 高三 contains only 数列 and 导数** — zero probability, statistics, analytic geometry or solid geometry. After stripping the `题组` prefix, its 1,500 items collapse to **561 distinct questions (85.6% duplicates)**.
- **综合与实践 — one of the four 课标 领域 — has 0 items across all 7,200 PEP items.**
- **pep-high has zero items** for 双曲线, 等比数列, 二项式定理, 条件概率, 正态分布, 独立性检验, 充要条件, 一元二次不等式, 解三角形, 导数的应用 — all 课标 requirements.

### 3.5 Governance

- **QA status is laundered from "pending" to "pass" in the export layer.** Every item in the BNU primary (3,000) and HJB primary (1,500) packs carries `mathQaStatus: "pending-s18-review"` and `reviewNotes: "candidate QA package only, not approved for public integration"`. `data/mainlandBnuPrimaryQuestions.ts:143-145` and `data/mainlandHjbPrimaryQuestions.ts:107-109` hard-code `mathQaStatus: "pass", manualQaStatus: "approved"` on export. **4,500 items** are recorded as approved when the source says never reviewed.
- **HJB high ships the un-remediated pack.** `mainlandHjbHighQuestions = mainlandHjbHighV2Questions` (1,468/1,500 `pending-manual`), while v3-remediated and v4-remediated are imported, bundled (~4.3 MB) and unused. The recorded BNU launch guardrail says "Product code must continue importing approved/remediated packs only."
- **The test suite passes but does not cover this content.** `npm run test:question-bank` is **98/98 green** (61 mainland-named tests). But there is no dedicated question-bank test for bnu-high, hjb-primary, hjb-junior or hjb-high — **6,000 questions**. `data/productionLessonsNearTransfer.test.ts`, the only test that reads lesson bodies, is wired to no npm script and no runner, so it **never executes**. And `audit:zh-hans` scans 1,694 files and returns **0 mainland hits** because it reads source literals and never opens the lesson packs or the template-interpolated generator output — which is precisely why 737 English slugs in lesson text pass today.

---

## 4. What is actually working

Worth protecting, and worth saying to a team that has clearly done real work:

- **bnu-primary is a genuinely good bank.** 3,000 items, 2,963 distinct skeletons (1.01× reuse), v1 and v2 fully disjoint with zero contradictory keys, 97 topicIds matching the 北师大版 volume sequence exactly, and idiomatic mainland contexts — correct 元/角/分, sane magnitudes, no HK/TW usage.
- **hjb-primary and hjb-junior are structurally sound** — 1.03× and 1.07× skeleton reuse, zero exact duplicates, spines that track 沪教版 accurately.
- **The mathematics is mostly right.** 4,781/4,800 pep-high keys exact, with no 圆锥曲线 a/b/c confusion, no 数列 off-by-one, no 概率 with/without-replacement error. 1,500/1,500 bnu-high. 0 arithmetic errors in 2,343 pep-primary/junior recomputations.
- **Terminology is mainland-correct** — 65 deviating items in 17,700.
- **Zero traditional-character leakage** in learner-facing prompts, options or explanations; **zero chain-of-thought leakage**; **zero missing-figure unsolvable items** in pep-high; LaTeX well-formed (0 unbalanced braces across 4,800 items).
- **Referential integrity is spotless.** 0 orphan `topicId`s across 17,700 questions, 0 dangling `practiceQuestionIds` across 2,224 references, 0 unbound or missing illustrations (162 live, all assets present), 0 duplicate ids anywhere (17,700 mainland / 24,566 whole bank / 684 topics / 490 seeds), and **topic→lesson coverage is 100% in all nine slices** — no question belongs to an untaught topic.
- **Curriculum routing is correct.** Every mainland item carries `curriculumTrack: "MAINLAND_PEP_HIGH"` with `publisher` as the discriminator, which looks alarming but was verified exhaustively: `contentMatchesCurriculumProfile` over all 17,700 questions, 335 topics and 490 lesson seeds against all 5 live profiles gives a perfect 1:1 partition — 0 items reachable by no profile, 0 visible to more than one. The 4,800 pep-high items with no `publisher` field fall through the `MAINLAND_PEP` default at `lib/curriculumProfile.ts:190` consistently in all 9 readers. The one omission, `practiceAttemptStore.ts:173`, is write-only telemetry and costs publisher attribution in analytics, not routing.
- **沪教版 grade placement was judged correctly**: P6 有理数/一元一次方程 is *not* 超纲 because 沪教版 runs 五四学制. A naive 课标 check would have produced a false finding here.

---

## 5. Recommended sequence

**P0 — before any China release (mechanical, days not weeks)**
1. Fix the gate: `independentAnswer` must come from a solver that never reads `question.answer`; report self-verified rows as `unverified`, not `pass`; block Green while any track is 100% self-verified.
2. Shuffle MC options at serve time, seeded per learner+item. Single highest-value fix in the report — it restores meaning to every mastery signal.
3. Add mainland unit/notation normalisation to the grader (个 张 本 元 米 厘米 千克 …; `√↔sqrt`, `π↔pi`, `²↔^2`; tokenise 或/、/, into an unordered set; tolerate a trailing 。).
4. Promote `answer` to `LocalizedText` and backfill the 198 non-Chinese keys + 578 Latin-unit keys.
5. Strip pipeline text: 3,972 prompt labels, 2,515 explanation tails, 1,914 `term-XXXX` placeholders, and the 115 bnu-junior QA memos.
6. Stop laundering QA status; stop shipping the un-remediated HJB high pack.
7. Give the 57 PEP lesson seeds real `practiceQuestionIds` (8–12 each), matching BNU/HJB — a 人教版 learner's progress bar currently moves 20–40× slower for the same work.

**P1 — content repair (weeks)**
8. Fix the ~90 confirmed wrong/ambiguous keys, item by item, with the ids in the agent reports.
9. Re-solve bnu-junior and hjb-junior in full — sampled rates of 5.1% and ~3.1% imply roughly 75 and 45 more wrong keys not yet individually identified.
10. De-duplicate: pep-primary (49%), bnu-high (85.6% after prefix strip), hjb-high (204 groups), and drop pep-high's two legacy generations (removes all 580 of its duplicates in one line).
11. Close the test gaps: add question-bank tests for the 6,000 untested bnu-high / hjb-* items, wire `productionLessonsNearTransfer.test.ts` to a runner, and make `audit:zh-hans` open the lesson packs and generator output rather than only source literals. Note that `package.json` scripts are frozen by a CI governance gate, so wiring a new runner needs that gate's sign-off rather than a new npm script.

**P2 — rebuild (a quarter)**
12. Thicken the 人教版 spine from 57 to ~151 topics, 1:1 with textbook units. PEP is the most-used textbook in China and currently has the thinnest spine in the library.
13. Re-author hjb-high S5/S6 and bnu-high — these cannot be patched item-by-item.
14. Retire the hard-coded TypeScript template generators (pep-primary, pep-high seed-v1) in favour of the per-item generation path that produced bnu-primary and hjb-junior. **Source density is not the binding constraint** — hjb-junior produced 1,403 distinct skeletons from 22 source cards, while pep-junior produced 39 from 11. Method matters more than card count.

---

## 6. What this means for Japan, Korea and the wider international plan

Three of the findings are platform-level, not China-level, and every new country
inherits them:

1. **The gate** returns Green for HK (989/989 self-verified), US_CA (2,802/2,802) and US_FL (75/75) on exactly the same logic. Onboarding 日本 or 한국 content today means onboarding it behind a gate that checks nothing.
2. **`answer: string`** cannot hold a localized answer in any language. Japanese and Korean content will reproduce the "sphere" defect on day one.
3. **The grader's normalisation table is English-only.** Japanese (個, 円, センチメートル) and Korean (개, 원, 센티미터) counters and units will be rejected exactly as 张 and 个 are today.

Fixing these three before generating the next country's content is far cheaper
than fixing them in four countries afterwards.

---

## 7. Method and coverage

Ten specialist agents ran in parallel over a frozen corpus dump of the runtime
question set, each required to state its sample size and to verify arithmetic by
computation rather than inspection.

| Agent | Scope | Coverage achieved |
|---|---|---|
| pep-primary + pep-junior | 2,400 items | 2,343 keys recomputed; all 193 skeleton clusters read |
| pep-high | 4,800 items | **4,800/4,800 keys re-derived** (Fraction + sympy); 133 read in full |
| bnu-primary | 3,000 items | 225 read in full; whole-cluster verification of 6 families |
| bnu-junior + bnu-high | 3,000 items | **bnu-high 1,500/1,500 keys re-derived**; bnu-junior 238 read (15.9%) |
| hjb-primary | 1,500 items | 332 read in full (22.1%); 1,044 equality chains recomputed |
| hjb-junior + hjb-high | 3,000 items | 1,274/1,500 hjb-high keys machine-verified; 487 read in full |
| curriculum alignment | 335 topics | 100% of spine; 305 items read |
| language + terminology | 17,700 items | **100% programmatic** over 103,178 field strings, 2.53M chars |
| pedagogy + variety | 17,700 items | 100% statistical; 196 read for qualitative classification |
| lessons + data integrity | 335 lessons + grader | 100% referential; grading probes executed against the real functions |

**Not covered:** runtime rendering verified by code inspection rather than by
driving the app; `zh`/`en` locale variants of China items; difficulty calibration
against real learner telemetry; the ~44 bnu-primary combinatorics items.

**Two pre-scan signals were disproven by the agents and should not be actioned:**
traditional-character leakage in learner-facing text (0 items — all 360 flags were
the simplified character 限) and Latin-word leakage in pep-high prompts
(0 items — all 1,157 were KaTeX macros).

---

## 8. Appendix — detailed agent reports

Full per-finding detail, with every affected question id, lives in:

```
findings/gate-and-governance.md      findings/pep-primary-junior.md
findings/pep-high.md                 findings/bnu-primary.md
findings/bnu-secondary.md            findings/hjb-primary.md
findings/hjb-secondary.md            findings/curriculum-alignment.md
findings/language-terminology.md     findings/language-terminology-ids.json
findings/pedagogy-variety.md         findings/lessons-integrity.md
```
