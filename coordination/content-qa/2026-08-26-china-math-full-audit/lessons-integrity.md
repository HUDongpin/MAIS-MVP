# China lesson content + data plumbing — integrity audit

Scope: mainland lesson packs, lesson modules, illustrations, topic/question
wiring, curriculum routing, and the answer grader. **Not** per-item math.
Read-only audit; no repo file was modified.

## Coverage

**Computed over 100% of the corpus** (every number below came from a script I ran,
not from a sample):
- 335 mainland lesson seeds, 335 mainland topics, 17,700 mainland questions,
  162 live mainland lesson illustrations
- cross-checked against the aggregated banks: 24,566 questions, 684 topics,
  490 production lesson seeds (`data/questions.ts`, `data/topics.ts`,
  `data/lessons.ts`)
- 5 generated lesson JSON packs parsed directly

**Lesson bodies read in full: 9 of 335** —
`hjb-junior[0]`, `hjb-junior[11]`, `bnu-primary[0]`, `bnu-primary[50]`,
`hjb-high[0]`, `bnu-high[5]`, `pep-primary[3]`, `pep-high[7]`, `pep-junior[4]`.
Selection: one from each of the 9 publisher×band slices, plus a second from the
two slices whose structural metrics looked most anomalous (hjb-junior: 1 distinct
skeleton; bnu-primary: shortest median body). All 335 were analysed
programmatically (skeleton clustering, slug regex, boilerplate grouping, length).

**Grading tested by execution** against the real
`lib/server/answerMatching.ts` via `npx tsx`:
- 46 hand-built normalisation probes on `answerMatches()`
- 12 mechanical transformations applied to **all 11,180** non-MC mainland items
  through the production path `questionAnswerMatches()` (~60,000 graded calls)
- 9 targeted probes (Chinese units, 或, ², √, π, ≈, prose, judgement tokens)

**Tests run:** `npm run test:question-bank` (the repo's own gate),
`npm run audit:lesson-illustrations`, `npm run audit:zh-hans`.

**Not covered:** per-item mathematical correctness; multiple-choice option
quality; the `en` and traditional-`zh` lesson channels; RAG evidence packs;
browser rendering of lesson blocks; `npm run test:rag` (not run — long, and RAG
packs are out of scope).

---

## Corrections to the briefed "established facts"

**C1 — the three lesson packs DO contain `lessons` arrays.** The premise that
`mainland-hjb-junior-lessons-v1` has `notes` as its array key,
`mainland-pep-junior-lessons-v1` has `languageModes`, and
`mainland-pep-primary-lessons-v1` has `generationPolicy` is an artefact of a
"first array-valued key" heuristic. Parsing all five packs:

| pack | top-level keys | `lessons` array |
|---|---|---|
| mainland-pep-primary-lessons-v1 | packId, generatedAt, sourceBaseline, generationPolicy[3], lessons | **24** |
| mainland-pep-junior-lessons-v1 | schemaVersion … languageModes[3], lessonCount, expectedLessonCount, lessons | **11** |
| mainland-pep-high-lessons-v1 | schemaVersion … reviewStatus, lessons | **22** |
| mainland-bnu-junior-lessons-v1 | schemaVersion … integrationGate, lessons | **105** |
| mainland-hjb-junior-lessons-v1 | version, generatedFrom, status, notes[3], lessons | **22** |

`notes` / `languageModes` / `generationPolicy` are 3-element metadata arrays that
happen to sort first. Every pack has a real `lessons` array.

**C2 — the `curriculumTrack: "MAINLAND_PEP_HIGH"` + publisher-disambiguation
scheme routes correctly. I could not break it.** I evaluated
`contentMatchesCurriculumProfile` for every mainland question, topic and lesson
seed against all five live profiles:

```
slice          MAINLAND/PEP  MAINLAND/BNU  MAINLAND/HJB   HK/MERS   US/CA   total
bnu-high                  0          1500             0         0       0    1500
bnu-junior                0          1500             0         0       0    1500
bnu-primary               0          3000             0         0       0    3000
hjb-high                  0             0          1500         0       0    1500
hjb-junior                0             0          1500         0       0    1500
hjb-primary               0             0          1500         0       0    1500
pep-high               4800             0             0         0       0    4800
pep-junior             1200             0             0         0       0    1200
pep-primary            1200             0             0         0       0    1200
```
Reachable by no profile: **0**. Visible to more than one profile: **0**.
The same partition holds for the 335 topics and the 335 lesson seeds
(PEP 57, BNU 156, HJB 122; HK and US see 0).

The 4,800 pep-high items are indeed the only mainland content with neither
`publisher` nor `region` (mainland topics all carry both). I traced every reader
of those fields. The `MAINLAND_PEP` default is applied consistently at:
`lib/curriculumProfile.ts:134` (`curriculumProfileForTrack`),
`:190` (`contentMatchesCurriculumProfile`),
`lib/server/userStore.ts:2202` and `:2246` (seed record stamping),
`lib/server/userStore.ts:11035` (`COALESCE(...,'MAINLAND_PEP')` in the SQL topic
filter), `lib/server/questionStore.ts:214`,
`lib/server/userStore/curriculumAvailability.ts:66`,
`lib/mainlandPepQuestionAssets.ts:62-63`, `components/lesson/lessonEntryTarget.ts:15`.
**Exactly one reader omits the default** — see F14. It is telemetry-only, not a
routing break.

---

## Findings

### F1 — Every hjb-junior lesson is the same mad-libs template; no mathematics is taught
- severity: **blocker**
- category: pedagogy
- affected: all 22 `mainlandHjbJuniorLessonSeeds` (topicIds `hjb-junior-s1-upper-*`
  … `hjb-junior-s3-lower-*`), backing 1,500 hjb-junior questions
- evidence: masking every CJK run of ≥2 characters and every digit collapses all
  22 lessons to **1 distinct skeleton** (all other slices: 22–97 distinct out of
  22–97). Two lessons, verbatim, differ only in the substituted topic/keyword:

  > 整式的加减 lesson, worked example 1: 「先辨认结构：面对一个新的**整式的加减**问题，先判断它更接近"**代数式意义**"还是"**整式识别**"，并写出第一步理由。 答案：先圈出题目中的对象和条件，再把它们对应到**代数式意义**。」

  > 一元二次方程 lesson, worked example 1: 「先辨认结构：面对一个新的**一元二次方程**问题，先判断它更接近"**方程概念**"还是"**配方法**"，并写出第一步理由。 答案：先圈出题目中的对象和条件，再把它们对应到**方程概念**。」

  The 一元二次方程 lesson never writes `ax²+bx+c=0`, never performs 配方, never
  mentions the discriminant, and contains no numbers at all.
- why: the "lesson" contains zero subject content. A 初二 learner who reads it
  and then enters the 8-question practice checkpoint has been taught nothing
  about quadratics. The pack is nevertheless marked
  `status: "lesson-only-production-integrated"` and every seed ships
  `productionReady: true`.
- fix: withdraw all 22 hjb-junior lesson seeds from `productionLessonSeeds`
  (set `productionReady: false` in `data/mainlandHjbJuniorLessons.ts`) until the
  pack carries per-topic 讲解 and 例题 with actual worked arithmetic/algebra, as
  the pep-junior and bnu-junior packs already do.

### F2 — The grader has no Chinese-unit normalisation; correct answers with 单位 are marked wrong
- severity: **blocker**
- category: answer-key
- affected: measured on 243 items where the zh prompt literally asks 多少&lt;unit&gt;
  and the key is a bare number — **76 rejected (31.3%)**. Worst slices:
  bnu-primary 107/136, hjb-primary 49/58, bnu-junior 10/20.
  Whole-corpus scale: of 6,432 bare-numeric mainland answers, appending a unit is
  accepted for only 34 (个), 33 (厘米), 19 (元), 17 (米), 13 (度), 9 (千克), 3 (分钟).
- evidence:
  > `pep-primary-p1-l-fi-101` prompt 「晨晨原来有66张积木，送出10张，现在有多少张？」 key `"56"` — learner types `56张` → **rejected**
  > `pep-primary-p1-l-fi-102` prompt 「…现在记录多少个？」 key `"57"` — learner types `57个` → **rejected**

  `normalizeAnswer()` (`lib/server/answerMatching.ts:59`) applies NFKC and strips
  only `cm^2|cm2|cm^3|cm3|cm|ml|l|km/h|kmh|km|°|%`; `knownAnswerUnitWords`
  (`:38`) is English-only (`blocks, buttons, cards, cm, counters, cubes, degrees,
  dollars, items, minutes, pencils, shells, side, sides, stickers, tiles, units`).
  There is no 个/张/本/元/米/厘米/千克/分钟/度/人 in the whole file.
- why: writing the unit is the standard, taught habit in mainland primary maths
  (「答：还有56张。」). The product marks it wrong. The reverse also fails: for the
  267 items whose key *carries* a unit, typing the bare number is rejected 20
  times (e.g. `bnu-primary-ds-v1-p1-218` key `"45人"` vs typed `45`); the other
  247 are saved only by hand-authored `acceptedAnswers`, not by the grader.
- fix: add a mainland unit table to `stripKnownUnitSuffix` / `parseScalarAnswer`
  (个 张 本 人 只 条 块 支 双 件 把 棵 朵 辆 页 颗 袋 盒 排 层 次 种 元 角 分 米 厘米
  分米 毫米 千米 平方米 平方厘米 平方分米 立方米 立方厘米 克 千克 吨 升 毫升 度
  岁 天 小时 分钟 秒), stripped before scalar comparison exactly as `cm` is today.

### F3 — √, π and ² answers accept only the exact glyph
- severity: **blocker**
- category: answer-key / notation
- affected: 113/120 √ probes rejected (94.2%), 49/49 π probes rejected (100%),
  51/102 ² ³ probes rejected (50.0%). Concentrated in bnu-junior (45/46 √,
  28/45 ²), hjb-junior (62/64 √, 21/48 ²), hjb-high (42/42 π).
- evidence:
  > `bnu-junior-ds-v1-s1-026` key `"√145 cm"` — learner types `sqrt(145) cm` → **rejected**
  > `hjb-high-ds-v2-s4-323` key `"π"`, `acceptedAnswers: ["π"]` — learner types `pi` → **rejected**
  > `bnu-junior-ds-v1-s1-099` key `"5x² - 10x + 11，x² 项的系数为 5"` — learner types `5x^2 - 10x + 11，x^2 项的系数为 5` → **rejected**
- why: `normalizeAnswer` maps `×→*`, `÷→/`, `−–—→-` but has no rule for `√↔sqrt`,
  `π↔pi`, or `²³↔^2 ^3`. `answerCandidateStrings` only adds `^{n}→^n`. 42 of the
  49 π failures are hjb-high items whose *entire* accepted set is `["π"]` — there
  is no fallback at all.
- fix: in `normalizeAnswer`, add `.replace(/[²]/g,"^2").replace(/[³]/g,"^3")` and
  a `√x`/`√(x)` ↔ `sqrt(x)` canonicalisation, and treat `π` and `pi` as one token.

### F4 — 或 (multiple roots) is compared as a literal string
- severity: **blocker**
- category: answer-key
- affected: 49 short algebraic answers containing 或. Learner writes a comma →
  **41 rejected (83.7%)**. Learner writes the two roots in the other order →
  **42 of 48 rejected (87.5%)**. Learner writes `or` → 16 rejected.
- evidence:
  > `bnu-junior-ds-v1-s1-342` key `"5或8"` — typed `5,8` → **rejected**; typed `8或5` → **rejected**
  > `bnu-junior-ds-v1-s1-138` key `"50° 或 150°"` — typed `50°,150°` → **rejected**
  > `bnu-junior-ds-v1-s2-029` key `"5或√7"` — typed `√7或5` → **rejected**
- why: `answerCandidateStrings` splits on the last `=` only. It never tokenises
  a multi-root answer, so `{5,8}` and `{8,5}` are different strings. A quadratic
  has an unordered solution set; root order is not part of the answer.
- fix: split candidates on `或 | or | , | ，| 、| ;` into a set, compare the sets
  element-wise with the existing scalar comparison.

### F5 — 580 items require typing a Chinese paragraph verbatim
- severity: **major**
- category: pedagogy / answer-key
- affected: 580 of 11,180 non-MC mainland items have an `answer` that is Chinese
  prose of ≥10 CJK characters (bnu-primary 258, bnu-junior 132, hjb-primary 121,
  hjb-junior 66, hjb-high 3). Of the 446 that end in `。`, **429 (96.2%) are
  rejected if the learner omits that final full stop.**
- evidence:
  > `bnu-primary-ds-v1-p5-102` answer: 「落在红色和蓝色区域的可能性一样大，落在黄色区域的可能性最小。因为红色和蓝色区域都是3个，黄色区域只有2个，所以指针落在红色和蓝色区域的机会相等且最大，落在黄色区域的机会最小。」 (85 characters, exact match required)
  > `bnu-junior-ds-v1-s1-008` answer 「水的体积为 192 cm³，翻转后水没有完全淹没原来朝下的面。」 — dropping the trailing 。 → **rejected**
- why: exact string matching cannot grade free-form 说理题. These items are
  effectively ungradeable: a correct explanation in the learner's own words is
  always wrong, and on a wrong attempt the full paragraph is shown back as
  `correctAnswer`.
- fix: either retype these as `type: "open-response"` and route them away from
  the exact-match grader (rubric or tutor-assisted), or at minimum strip trailing
  `。`/`.` in `normalizeAnswer` (one line, fixes 429 of them immediately).

### F6 — 3,399 non-MC mainland items ship with no `acceptedAnswers` safety net
- severity: **major**
- category: answer-key / data-integrity
- affected: pep-high 2,978, pep-primary 255, pep-junior 166 (0 in BNU/HJB slices).
  Distribution across all 11,180 non-MC items: 0 aliases → 3,399; 1 → 3,665;
  2 → 1,517; 3 → 991; 4 → 1,215; 5+ → 393.
- why: with F2/F3/F4 unfixed, `acceptedAnswers` is the *only* thing rescuing
  Chinese answer variants — and 30% of the mainland non-MC bank has none.
  `withGeneratedAnswerAliases` in `data/questions.ts` only fires on English/HK
  patterns (`cm`, `o'clock`, `HK$`), so pep-high gets nothing.
- fix: generate mainland aliases (unit-stripped, root-permuted, punctuation-
  normalised) at bank build time, or fix the grader per F2–F4 so aliases stop
  being load-bearing.

### F7 — 222 of 335 lessons print raw English kebab-case slugs to Chinese learners
- severity: **major**
- category: language
- affected: 737 occurrences across bnu-primary 97/97 (283), hjb-high 30/30 (109),
  bnu-high 24/24 (107), hjb-primary 69/70 (232), pep-junior 2/11 (6).
- evidence:
  > `bnu-primary-p1-upper-life-number-sense` concept block: 「生活中的数以北师大版一年级上册已审核小学单元展开，重点关注**p1-number-sense、within-10-numbers、counting-cardinality**、生活中的数、10以内数。」
  > `hjb-high-s4-等式与不等式`: 「…重点关注**inequality-properties、quadratic-equations、quadratic-inequalities、basic-inequality**。」
  > `bnu-high-s4-立体几何初步`: 「…正式课围绕**solid-geometry、spatial-lines-planes、parallel-perpendicular、surface-volume、spatial-reasoning**展开。」
- why: the four topic-derived lesson generators
  (`mainlandBnuPrimaryLessons.ts:146`, `mainlandBnuHighLessons.ts:172`,
  `mainlandHjbPrimaryLessons.ts:126`, `mainlandHjbHighLessons.ts:132` — all
  `Topics.map(toProductionLessonSeed)`) interpolate the topic's internal
  `knowledgePoints`/`focus` slug array straight into the zh-Hans concept
  sentence. A P1 learner is shown English engineering identifiers.
- fix: give each topic a `zhHans` keyword list and interpolate that, or drop the
  「重点关注…」 clause entirely from the generated concept block.

### F8 — 221 lessons carry identical boilerplate and no lesson-specific objectives
- severity: **major**
- category: pedagogy
- affected: checklist and extension blocks are byte-identical across
  bnu-primary 97/97, hjb-primary 70/70, hjb-high 30/30, bnu-high 24/24
  (largest identical group = the whole slice, in each case). By contrast
  pep-primary 24/24, pep-junior 11/11, pep-high 22/22, hjb-junior 22/22 and
  bnu-junior 103/105 checklists are distinct.
  Objective-bearing language (目标/能说出/能选择/学会/掌握) appears in
  **0/24 pep-primary, 0/97 bnu-primary, 0/70 hjb-primary, 0/30 hjb-high** lessons.
- evidence: every one of the 97 bnu-primary lessons ends with the same four items
  > 「先读题，并圈出已知数量。/ 说出正在使用的北师大版单元思想。/ 写出一个清楚的计算、画图或推理步骤。/ 检查答案是否符合单位和题目问法。」
- why: 教学目标 is a required element of a mainland lesson; these 221 lessons have
  a generic study-skills checklist instead. Median zh body length confirms the
  thinness: bnu-primary 406 chars, hjb-high 365, bnu-high 498, hjb-primary 427 —
  versus bnu-junior 2,499 and hjb-junior 1,230 (and hjb-junior's is F1's template).
- fix: derive the checklist from each topic's own objectives, as
  `mainlandPepHighLessons.ts:74` (`checklistItems`) already does from
  `studentLesson.zhHans.objectives`.

### F9 — 1,914 mainland items carry machine-translation placeholders in `acceptedAnswers`
- severity: **major**
- category: data-integrity
- affected: 1,914 of 17,700; the primary `answer` field is clean in all 17,700
  (0 affected), so this is not learner-visible today.
- evidence:
  > `bnu-primary-ds-v1-p1-075` answer `"小鹿、小猴、小兔、小狗"`, acceptedAnswers[2] = `"term-5c0f-term-9e7f, term-5c0f-term-7334, term-5c0f-term-5154, term-5c0f-term-72d7"`
  > `bnu-primary-ds-v1-p3-033` acceptedAnswers[1] = `"term-4f30 calculate: therefore event write term-5927-term-7ea6270books, …"`

  `term-XXXX` is the CJK codepoint in hex (`5c0f` = 小, `9e7f` = 鹿) — an
  untranslated placeholder from the localisation pipeline.
- why: these slots were meant to hold English variants. They hold garbage, they
  inflate the apparent alias coverage in F6, and they are one refactor away from
  being rendered (`correctAnswer` already surfaces `answer`; any future change
  that surfaces aliases would leak them).
- fix: drop every `acceptedAnswers` entry matching `/term-[0-9a-f]{4}/`.

### F10 — PEP lessons have no curated practice set; the checkpoint dumps the whole topic
- severity: **major**
- category: data-integrity / pedagogy
- affected: all 57 PEP lesson seeds (pep-primary 24, pep-junior 11, pep-high 22)
  ship `practiceQuestionIds: undefined`. `lib/server/userStore.ts:2313`
  (`lessonSeed.practiceQuestionIds ?? topicQuestions`) then fills the practice
  block with **every** question on the topic:

  | slice | practice-block size | source |
  |---|---|---|
  | pep-primary | 50 / 50 / 50 (min/med/max) | fallback = all topic questions |
  | pep-junior | 66 / 99 / 200 | fallback |
  | pep-high | 160 / 227 / 320 | fallback |
  | bnu-*, hjb-* | 8 / 8 / 8 | curated |

- why: lesson completion is computed as
  `attemptedQuestionIds.size / practiceQuestionIds.size`
  (`lib/server/userStore.ts:7330`). A pep-high learner needs up to 320 attempts to
  reach 100% on one lesson; a BNU learner needs 8. Progress %, mastery signals and
  any completion-gated reward are silently 20–40× harder for PEP learners.
- fix: add a `selectPracticeQuestionIds` quota selector to the three PEP lesson
  modules, copying `mainlandBnuJuniorLessons.ts:97` (Low 2 / Medium 3 / High 3,
  capped at 8).

### F11 — Gate coverage: 6,000 questions and all 335 lessons are untested
- severity: **major**
- category: data-integrity
- affected / evidence:
  - `npm run test:question-bank` runs **98 tests, 98 pass, 0 fail** (98.7 s),
    61 of them mainland-named. It compiles and runs test files for pep-high,
    pep-primary, pep-junior, bnu-primary, bnu-junior only. There is **no
    `lib/mainland{BnuHigh,HjbPrimary,HjbJunior,HjbHigh}QuestionBank.test.ts`** —
    those four slices (6,000 questions, 40% of the mainland corpus) have no
    dedicated gate. (bnu-high, hjb-primary, hjb-junior and hjb-high *are*
    partially covered by assertions living inside
    `lib/mainlandPepHighQuestionBank.test.ts:206-414`.)
  - `data/productionLessonsNearTransfer.test.ts` — the only test that inspects
    mainland lesson *bodies* — is referenced by **no npm script and no
    `scripts/run-*.mjs` runner**. It never executes in CI. (It would not have
    caught F1 anyway: it only checks that a concept block and its worked example
    do not reuse the same numeric example.)
  - `npm run audit:zh-hans` scans 1,694 files and 7,408 localized strings and
    reports **0 mainland hits** — it reads string literals in `.ts`/`.tsx` and
    never opens `data/generated-content/**/lessons.json`, nor can it see the
    template-interpolated output of the four topic-derived lesson generators.
    That is why F7 (737 English slugs in zh-Hans learner text) passes the gate.
  - `npm run audit:lesson-illustrations` → PASS, 284 assets across 5 live
    exports, 4 withdrawn drafts skipped.
- fix: add the four missing question-bank test files; wire
  `productionLessonsNearTransfer.test.ts` into an existing runner (it needs no new
  npm script — `scripts/run-component-tests.mjs` already compiles `data/`);
  extend `audit-zh-hans.mjs` to walk the composed `productionLessonSeeds` array
  rather than source literals.

### F12 — Internal question-bank ids are printed in learner-facing lesson text
- severity: **major**
- category: language
- affected: 24 occurrences, all 24 bnu-high lessons
- evidence:
  > `bnu-high-s4-立体几何初步` worked example: 「**题组s4-466**：长方体的长、宽、高分别为 4，5，3，求体积 = 答案：60。」
  > `bnu-high-s4-对数运算与对数函数` → 「题组s4-109」, `bnu-high-s4-复数` → 「题组s4-431」
- why: `s4-466` is an internal generated-bank row id. Also note the malformed
  「求体积 = 答案：60」 — the prompt's trailing `=` is concatenated to 答案.
- fix: drop the id prefix in `mainlandBnuHighLessons.ts`'s worked-example
  formatter and trim a trailing `=`/`：` from the borrowed prompt.

### F13 — The ideographic comma 、 is not normalised
- severity: **major**
- category: notation
- affected: 65 mainland answers contain 、; replacing it with `,` is rejected for
  **46 (70.8%)**. Conversely `2、3` never matches `2,3` or `2，3`
  (both probes fail on `answerMatches`).
- why: NFKC folds `，`→`,`, `；`→`;`, `：`→`:`, `（）`→`()`, `－`→`-`, `０-９`→`0-9`
  (all verified accepted: 976/976, 259/259, 224/224, 256/256, 10,527/10,527), but
  U+3001 `、` has no NFKC decomposition and no rule in `normalizeAnswer`. It is
  the standard mainland list separator between enumerated items.
- fix: `.replace(/、/g, ",")` in `normalizeAnswer`.

### F14 — Practice-attempt telemetry stores NULL publisher/region for all 4,800 pep-high items
- severity: minor
- category: data-integrity
- affected: 4,800 questions → every attempt row they generate
- evidence: `lib/server/practiceAttemptStore.ts:170-175`
  ```ts
  function profileFields(question: Question) {
    return {
      curriculumTrack: question.curriculumTrack,
      curriculumRegion: question.region ?? question.curriculumProfile?.region ?? null,
      textbookPublisher: question.publisher ?? question.curriculumProfile?.publisher ?? null
    };
  }
  ```
  This is the **only** reader of `question.publisher` in the codebase that does
  not apply the `MAINLAND_PEP_HIGH → MAINLAND_PEP` default that
  `lib/server/userStore.ts:2202` and `lib/curriculumProfile.ts:190` both apply.
- why: not a functional break — the single `SELECT … FROM practice_attempts`
  (`:449`) filters on `user_id`/`topic_id` only. But every pep-high attempt lands
  with `textbook_publisher = NULL`, so no publisher-sliced report over the
  attempts table can attribute PEP senior-secondary practice.
- fix: `?? (question.curriculumTrack === "MAINLAND_PEP_HIGH" ? "MAINLAND_PEP" : null)`,
  matching `userStore.ts:2202`.

### F15 — Generated unit aliases use Hong Kong/Taiwan units, not mainland units
- severity: minor
- category: terminology
- affected: `data/questions.ts:2205-2220`, applied to every question in the bank
- evidence: the alias generator emits `公升`, `公里`, `公里每小時`, `${n}時`
  for `L`, `km`, `km/h`, `o'clock`. Mainland maths uses **升**, **千米**,
  **千米每小时**, **时/点**; 公里 in particular is not PEP/BNU/HJB primary usage.
  It also mixes a traditional character (`時`) into an alias list used by the
  simplified corpus.
- why: a mainland learner typing `5千米` is rejected while `5公里` is accepted —
  the alias table rewards the wrong regional convention.
- fix: add mainland forms alongside (not instead of) the HK forms.

### F16 — 52 orphan illustration assets shipped in `public/`
- severity: minor
- category: data-integrity
- affected: `public/lesson-illustrations/mainland-pep-primary-v2-refresh/` — 52
  PNGs referenced by **no** TypeScript module (`grep -rl pep-primary-v2-refresh`
  over `data/ lib/ components/ app/` → no matches).
- why: dead weight in the deployed bundle; also a trap, since
  `mainlandPepPrimaryLessonIllustrations` is withdrawn to `[]` while 48 draft
  entries point at the *other*, empty `mainland-pep-primary/` directory.
- fix: delete the directory or wire it to the withdrawn drafts.

### F17 — Double full stops in lesson bodies
- severity: minor
- category: language
- affected: 91 occurrences — hjb-junior 44 (in **22/22** lessons), bnu-junior 39
  (7/35), bnu-primary 4, hjb-primary 4
- evidence: > 「参考：因为它直接对应题目中的条件和目标**。。**先选方法再计算…」
- why: the lesson-assembly templates join a checkpoint `answer` that already ends
  in `。` with an `explanation` using another `。`.
- fix: trim a trailing `。` before joining in the checkpoint formatters.

### F18 — 7 of 9 mainland slices ship lessons with zero illustrations
- severity: minor
- category: pedagogy
- affected: live illustration exports are **empty arrays** for pep-primary,
  pep-high, hjb-junior, hjb-high (withdrawn, with recorded reasons) and were never
  authored for bnu-primary, bnu-junior, bnu-high (no illustration module exists).
  Only pep-junior (22) and hjb-primary (140) have live art — 162 assets, and
  **all 162 files exist on disk and bind to a real topic and a real lesson**
  (0 unbound, 0 missing; `npm run audit:lesson-illustrations` PASS).
- why: not a defect in the data — the withdrawal notes at
  `mainlandHjbHighLessonIllustrations.ts:1300`, `mainlandPepPrimaryLessonIllustrations.ts:1035`,
  `mainlandPepHighLessonIllustrations.ts:17` are honest and correct. Flagged so the
  gap is visible: 152 draft entries are retained in-tree (pep-primary 48,
  hjb-high 60, hjb-junior 44, covering 76 lessons) and every one of them points at
  a PNG that does not exist — they will 404 if re-enabled without asset production.

---

## Referential integrity — all clean

Every check below was run programmatically over the full corpus; **all returned zero**.

| check | result |
|---|---|
| questions whose `topicId` is not in the slice's topic module | **0** / 17,700 |
| questions whose `topicId` is not in `data/topics.ts` | **0** / 17,700 |
| lesson `practiceQuestionIds` that do not resolve to a question | **0** / 2,224 refs |
| illustrations not bound to a real topic | **0** / 162 |
| illustrations not bound to a real lesson | **0** / 162 |
| illustration `src` files missing on disk | **0** / 162 |
| duplicate mainland question ids | **0** (17,700 ids, 17,700 distinct) |
| duplicate mainland topic ids | **0** (335 / 335) |
| duplicate lesson `topicId` (mainland) | **0** (335 / 335) |
| duplicate question ids in the whole bank incl. HK + US | **0** (24,566 / 24,566) |
| duplicate topic ids in the whole bank | **0** (684 / 684) |
| mainland ids missing from the aggregated `questions` export | **0** |
| mainland topic ids missing from `data/topics.ts` | **0** |
| duplicate lesson `topicId` across all 490 production seeds | **0** (`productionLessonByTopicId.size === 490`) |
| lesson seeds whose `topicId` is not a real topic | **0** |

## Topic → lesson coverage — 100%, in every slice

| slice | topics | lessons | coverage | topics with questions but no lesson | lessons with no questions |
|---|---|---|---|---|---|
| pep-primary | 24 | 24 | 100% | 0 | 0 |
| pep-junior | 11 | 11 | 100% | 0 | 0 |
| pep-high | 22 | 22 | 100% | 0 | 0 |
| bnu-primary | 97 | 97 | 100% | 0 | 0 |
| bnu-junior | 35 | 35 | 100% | 0 | 0 |
| bnu-high | 24 | 24 | 100% | 0 | 0 |
| hjb-primary | 70 | 70 | 100% | 0 | 0 |
| hjb-junior | 22 | 22 | 100% | 0 | 0 |
| hjb-high | 30 | 30 | 100% | 0 | 0 |
| **total** | **335** | **335** | **100%** | **0** | **0** |

**Zero mainland questions belong to a topic with no lesson.** No learner
practises a topic nobody taught — but see F1/F7/F8: 221 of the 335 lessons are
generated from topic metadata rather than authored, and 22 (hjb-junior) teach
nothing at all, so *nominal* coverage is 100% while *effective* coverage is much
lower. Where the lesson pack is authored, the counts are: pep-primary 24 raw → 24
seeds, pep-junior 11 → 11, pep-high 22 → 22, hjb-junior 22 → 22, bnu-junior
**105 raw lessons → 35 seeds** (grouped by `topicId`, exported as
`mainlandBnuJuniorSourceLessonCount = 105`; no lesson is dropped by the
`approvedForProduction` filter in any pack).

## Grading normalisation — what works and what does not

Run against the real `answerMatches()` / `questionAnswerMatches()`.

**Handled correctly (NFKC does the work):**

| case | result |
|---|---|
| full-width digits `１２` ↔ `12` | 10,527 / 10,527 accepted |
| full-width comma `，` ↔ `,` | 976 / 976 |
| full-width parens `（）` ↔ `()` | 256 / 256 |
| full-width semicolon `；` / colon `：` | 259 / 259, 224 / 224 |
| `×`→`*`, `÷`→`/` | 207 / 207 |
| full-width minus `－`, en/em dash | accepted |
| `°` with full-width digits | accepted |
| whitespace collapse | 1,555 / 1,557 (2 mixed-number edge cases) |
| equivalent fractions `2/4` ↔ `1/2` | accepted |
| `1/2` vs `\frac{1}{2}` | **rejected** — but only 39 mainland items use `\frac` at all, so this is near-theoretical here |

**Broken (a correct Chinese answer is graded wrong):**

| case | measured rejection |
|---|---|
| Chinese unit on a numeric answer (F2) | 76 / 243 targeted (31.3%); 6,398 / 6,432 for `个` |
| `√` vs `sqrt()` (F3) | 113 / 120 (94.2%) |
| `π` vs `pi` (F3) | 49 / 49 (100%) |
| `²`/`³` vs `^2`/`^3` (F3) | 51 / 102 (50.0%) |
| 或 → comma (F4) | 41 / 49 (83.7%) |
| 或 with roots reversed (F4) | 42 / 48 (87.5%) |
| trailing `。` dropped (F5) | 429 / 446 (96.2%) |
| ideographic comma `、` (F13) | 46 / 65 (70.8%) |
| `≈` prefix dropped | 10 / 10 (100%) |
| 是/否 ↔ 对/错 ↔ √/× ↔ 正确/错误 | 17 / 17 (100%) — only 5 items affected |
| 百分之二十 ↔ `20%`; `20%` ↔ `0.2`; 十二 ↔ `12` | rejected (no Chinese numeral or 百分之 parsing) |

Of 46 hand-built probes modelling how a mainland learner actually types,
**17 passed and 29 failed**.

## Slice health verdict

The **plumbing is sound**: referential integrity is perfect (0 orphans, 0
dangling references, 0 duplicate ids across 24,566 questions and 684 topics),
topic→lesson coverage is 100% in all nine slices, all 162 live illustrations
resolve to real files, and the `curriculumTrack: "MAINLAND_PEP_HIGH"` +
publisher scheme partitions content across the three mainland profiles exactly,
with no leak and nothing unreachable — the 4,800 publisher-less pep-high items
are correctly defaulted by every consumer except one telemetry writer (F14).

The **content and the grader are not shippable as-is**. Two independent
blockers: (1) all 22 hjb-junior lessons are one mad-libs template that teaches no
mathematics, and 221 of 335 lessons are generated from topic metadata with
identical boilerplate, no 教学目标, and English engineering slugs printed into
zh-Hans learner text; (2) the answer grader has no mainland normalisation at
all — Chinese units, 或, `、`, `√`, `π`, `²` and trailing `。` each mark
demonstrably correct answers wrong, at rates from 31% to 100% on the items where
they apply, and 3,399 items have no `acceptedAnswers` to fall back on.

Current gates would not catch any of this: `test:question-bank` passes 98/98,
`audit:zh-hans` reports 0 mainland findings, `audit:lesson-illustrations` passes,
and the one test that reads lesson bodies is wired to no runner.
Recommend: withdraw hjb-junior lessons, fix `normalizeAnswer` (F2/F3/F4/F5/F13 are
roughly 30 lines in one file and would flip thousands of items), then re-gate.
