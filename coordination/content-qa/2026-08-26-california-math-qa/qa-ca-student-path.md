# QA audit — California math practice, end-to-end student path (pipeline, not content)

Repo: `/Volumes/Starship/MAIS-MVP` @ `codex/edulab-mais` (a0a325f18d). Audit was **read-only**: no repo
file was created, edited or deleted; no dev server was started; no git state was mutated. All scratch
artefacts live under
`/private/tmp/claude-501/-Volumes-Starship-MAIS-MVP/88fea60a-f98b-4e96-943c-59d4a8885613/scratchpad/`
(`stageA..I.mts`).

---

## 0. What is actually live

`data/usCaliforniaTopics.ts:172-186` gates the packs. `practiceLive:false` and
`adaptiveBetaPracticeLive:false`, so the 1,500-question DeepSeek K–G5 pack is **not served**.
`data/usCaliforniaTopics.ts:209-219` assembles the live set:

| pack | file | count | types | difficulty vocabulary |
|---|---|---|---|---|
| `us-ca-k5-knowledge-point-practice-v1` | `data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json` | 492 | MC 135 / fill-in 232 / short-answer 125 | Low/Medium/High |
| `us-ca-g6-g12-v2` | `data/generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json` | 1500 | MC 520 / fill-in 490 / short-answer 490 | Foundation 320 / Core 605 / Challenge 340 / Exam 235 |
| `ccss-textbook-practice-v1` | `data/generated-content/ccss-textbook-practice-v1/question-pack.json` | 810 | MC 489 / fill-in 321 | Low/Medium/High |

**Live total 2,802** (`data/usCaliforniaQuestions.ts:149-154`, `expectedUnitedStatesCaliforniaQuestionCount`).

---

## 1. Traced pipeline (pack → screen → grade)

```
data/generated-content/<pack>/question-pack.json
  └─ data/usCaliforniaTopics.ts:219   generatedCaliforniaQuestions = packs.flatMap(p => p.questions)
      └─ data/usCaliforniaQuestions.ts:92-116   toQuestion()  ← the only transform
          · :107  difficulty  = mapDifficultyToActive(...)        (lib/difficulty.ts:32-36)
          · :109  prompt      = sanitizeLocalizedText(...)        (:52-58 → :42-50)
          · :110  options     = optionsFor(...)                   (:64-67)
          · :112  acceptedAnswers = acceptedAnswersFor(...)       (:60-62)
          · :114  diagram     = usCaliforniaPracticeFigureFor(id) (data/usCaliforniaPracticeFigures.ts:183-185)
      └─ data/usCaliforniaQuestions.ts:154  export usCaliforniaQuestions: Question[]

SERVE
  lib/server/questionStore.ts:136-146  unitedStatesQuestions() → dynamic import of usCaliforniaQuestions
  lib/server/questionStore.ts:274-289  questionMatchesFilters(): curriculum profile + grade + topicId + difficulty
  lib/server/questionStore.ts:242-259  toPublicQuestion(): answer / acceptedAnswers / explanation are STRIPPED,
                                        diagram + options + prompt survive
  app/api/questions/route.ts:61-134    GET /api/questions; authenticated learners are pinned to their own
                                        curriculumProfile (:99-105); anonymous callers get only the first 20 (:13,:123-131)
  app/practice/page.tsx:1940-1976      client fetch → setVisibleQuestions
  app/practice/page.tsx:1297-1306      displayedQuestions = dedupePracticeQuestions(filtered);
                                        freeSelectionRoundQuestions = displayedQuestions.slice(0, 5)
  components/practice/PracticeQuestionCard.tsx:614-615  <QuestionFigure diagram={question.diagram} …>
  components/practice/PracticeQuestionCard.tsx:641-672  options rendered in pack order; click sets
                                        selected = localized option text

GRADE
  components/practice/PracticeQuestionCard.tsx:434-462  POST /api/attempts {questionId, selectedAnswer}
  app/api/attempts/route.ts:129         selectedAnswer = body.selectedAnswer.trim().slice(0, 500); empty → 400
  app/api/attempts/route.ts:151         submitQuestionAttemptFast(...)
  lib/server/practiceAttemptStore.ts:194-209  attemptFeedback() → questionAnswerMatches({answer, accepted_answers, options})
  lib/server/answerMatching.ts:392-404  questionAnswerMatches
  lib/server/answerMatching.ts:371-390  answerMatches
  lib/server/answerMatching.ts:61-81    normalizeAnswer
```

Grading is **server-side only**; there is no client-side shortcut. `lib/server/answerGrading.ts:1-25`
re-exports the same functions for the seed path, and `lib/server/userStore.ts:6102-6103, 9374-9375`
injects the identical function into the cold store — one grading rule for the whole product.

### 1a. `sanitizeStudentText` (`data/usCaliforniaQuestions.ts:42-50`) — **clean, effectively inert**

Ran it over all 2,802 live items × 3 locales (8,406 strings, `stageA.mts`):

* **57 strings change** (19 distinct items × en/zh/zhHans). **100 % of the changes are the
  `\s{2,}` → `" "` collapse.** Examples: `"Which symbol makes it true?  3 __ 8"` →
  `"Which symbol makes it true? 3 __ 8"`; `"Solve x + 5 = 12.  x = ?"` → `"Solve x + 5 = 12. x = ?"`.
* **0 strings become empty**; **0 lose mathematical content**; **0 prompts contain a newline**, so the
  space collapse cannot destroy column-arithmetic or ASCII-table alignment.
* The `Activity N:` / `練習活動 N：` / `DeepSeek practice:` / `深度求索練習` strippers **never fire on
  any live prompt** — they were written for the retired DeepSeek K–G5 pack. They are dead code for the
  served bank, not a hazard.
* Residual (theoretical, not triggered): the `\bDeepSeek\b\s*(?:practice)?\s*:?\s*` rule is `/gi`
  and unanchored, so a prompt legitimately naming "DeepSeek" mid-sentence would be mangled. No live
  item does. **P2 — latent only.**

**Verdict: no content-destroying behaviour on the live bank.** Grade: clean.

### 1b. `acceptedAnswersFor` (`data/usCaliforniaQuestions.ts:60-62`) — **0 P0 findings**

`uniqueNonEmpty([answer, independentAnswer, ...acceptedAnswers])`.

* Items where `independentAnswer` disagrees with `answer`/`acceptedAnswers` under
  `answerMatches`: **0 of 2,802.**
* Items where the merge therefore *widens* the accepted set: **0.**
* Missing/blank `independentAnswer`: **0.**

So the "silently accept a wrong answer" P0 the merge could have caused **does not occur**. See §5 for
why this is a weaker guarantee than it looks (`independentAnswer` is generator-authored, not
re-derived).

### 1c. `optionsFor`, difficulty, topic labels

* `optionsFor` (`:64-67`): MC items with 0 options: **0**. MC with <2 options: **0**.
  Non-MC items carrying options that get silently dropped: **0**.
* MC items whose stored answer matches **no** option under the grader's own matcher: **0 of 1,144**.
  (All MC items have exactly 4 options — enforced by `lib/questionBankSolvability.ts:1396`.)
* `mapDifficultyToActive` (`lib/difficulty.ts:17-22`): `Foundation→Low, Core→Medium, Challenge→High,
  Exam→High`. Only the G6–G12 pack uses the legacy vocabulary. **340 Challenge + 235 Exam items collapse
  into a single served `High` tier**, so a student can never select "exam-level" separately, and the
  difficulty filter (`lib/difficulty.ts:38-40`) maps both sides so the collapse is at least consistent.
  Served distribution: Low 581 / Medium 1,244 / High 977. **P2.**
* Topic labels: `topicLabelFor` (`:69-74`) only feeds *metadata*; the student-visible topic is
  `topic.title` from `usCaliforniaTopicById` (`:106`). No degradation found; every live `topicId`
  resolves (a miss would throw at module load, `:94`).

---

## 2. The exact grading rule

**One paragraph.** A submitted answer is correct iff, after Unicode NFKC normalisation, trimming,
lower-casing, mapping `− – —`→`-`, `×`→`*`, `÷`→`/`, unwrapping `\(`/`\)`, `\text{…}`, `\,`, `^{…}`→`^…`,
collapsing all whitespace runs to one space and then **deleting the spaces around `= , + - * / : ^ ( )`,
`°` and `$`** (`lib/server/answerMatching.ts:61-81`), the student string and the accepted string share a
member of their *variant sets*, or their parsed scalar values agree to 1e-6
(`answerMatching.ts:371-390`). The variant set of a string (`:301-339`) adds: the whole-value-bracket /
`\boxed{}` / `\textcircled{}` unwrapping (`:198-210`, interior brackets are preserved on purpose), the
right-hand side of a trailing `=` **only when the left-hand side is a pure-arithmetic expression that
evaluates to it** (`:280-299`, `:212-278`), the improper-fraction form of a mixed number (`1 3/7`→`10/7`,
`:170-178`), the fully space-stripped form, `hk$`↔`$` swaps, the bare number behind a `%` or `°`, and the
`N/D` + decimal forms of an "N out of D" phrase (`:127-145`). `parseScalarAnswer` (`:341-369`) additionally
understands English number words up to "ninety" plus "hundred" (`:92-119`), the phrase-fraction, mixed
numbers, `a/b`, a leading `$`/`hk$`, and a trailing `cm cm2 cm3 ml l km km/h ° %`; `stripKnownUnitSuffix`
(`:83-90`) pops trailing words from a fixed 18-word allow-list (`blocks buttons cards cm counters cubes
degree(s) dollars items minutes pencils shells side(s) stickers tiles units`). For multiple-choice there is
a final fallback (`:392-404`): if the student's text and some accepted answer both match the *same*
option across its `en`/`zh`/`zhHans` localisations, it is correct — this is what makes a Chinese-UI click
grade correctly. **Case is folded; whitespace is normalised; Unicode is NFKC-folded (`８`→`8`); LaTeX is
partially unwrapped; fractions and decimals are equivalent; units are stripped only from the allow-list;
Chinese answer *text* is never translated.**

Verified normaliser behaviour (`stageE.mts`, key ← student input → verdict):

| key | input | result | |
|---|---|---|---|
| `7` | `" 7 "` / `7.0` / `07` | ✅ | whitespace, trailing zero, leading zero |
| `7` | `7.` | ❌ | **trailing period rejected** |
| `1500` | `1,500` | ❌ | **thousands separator rejected** |
| `12` | `x = 12` / `x=12` / `= 12` | ❌ | **variable restatement rejected** |
| `12` | `5+7=12` | ✅ | LHS evaluates to RHS |
| `12` | `twelve` / `twelve items` / `12 counters` / `12 cm` | ✅ | word numbers, allow-list units |
| `12` | `12 apples` | ❌ | `apples` not in the allow-list |
| `0.5` | `1/2` | ✅ | `0.5` | `50%` | ❌ |
| `1/2` | `2/4` / `0.50` | ✅ | `1/2` | `½` | ❌ |
| `1 1/2` | `3/2` / `1.5` | ✅ | mixed-number handling is correct |
| `-5` | `−5` (U+2212) / `(-5)` | ✅ | |
| `90°` | `90` / `90 degrees` | ✅ | `$4` | `4` / `4 dollars` | ✅ |
| `(3, 4)` | `3,4` | ✅ | `(3, 4)` | `3 4` | ❌ |
| `12 cm` | `12` | ✅ | `12 cm` | `12 km` | ✅ **(over-loose, unit-blind)** |
| `y = 2x + 1` | `y=2x+1` | ✅ | `y = 2x + 1` | `2x+1` | ❌ |
| `>` | `greater than` | ❌ | `2:30` | `half past 2` | ❌ |

---

## 3. False negatives — a reasonable correct student answer marked WRONG

Scope: the **1,658 non-MC live CA items** (kp 357 + g6g12 980 + ccss 321). Baseline sanity: the stored
answer key itself is accepted for **1,658/1,658**, so nothing is broken outright.

Answer-key shapes: integer 1,339 · fraction 133 · decimal 72 · number+unit 57 · English words 43 ·
other 14. **835 of 1,658 (50.4 %) carry no alias at all beyond the exact key string.**

### P0-A — trailing period: **1,658 / 1,658 items (100 %)**
`9.` is rejected for key `9`. Cause: `normalizeAnswer` never strips terminal sentence punctuation, and
`parseScalarAnswer`'s `^-?\d+(?:\.\d+)?$` (`answerMatching.ts:363`) requires digits after the dot.
Every single non-MC CA item is affected. Concrete:
`us-ca-k5-knowledge-point-practice-v1-us-ca-math-k-k-cc-count-sequence-q02`, key `"9"`, input `"9."` → wrong.

### P0-B — "x = N": **10 items where the prompt literally asks the student to solve for a variable**
(the grader rejects `x = <key>` for **every** numeric item in the bank — there is no rule for it at all;
the 10 below are the ones whose stem actively invites that form)
`answerCandidateStrings` (`answerMatching.ts:287-296`) only harvests the RHS of `=` when the LHS is a
*pure-arithmetic* expression; `safeEvaluateArithmeticExpression` (`:214`) rejects any letter, so `x` never
parses and the candidate is never added.

| id | prompt | key | student input |
|---|---|---|---|
| `ccss-textbook-practice-v1-solve-one-step-equations-q01` | `Solve x + 5 = 12.  x = ?` | `7` | `x = 7` → **wrong** |
| `ccss-textbook-practice-v1-solve-one-step-equations-q02` | `Solve 4x = 20.  x = ?` | `5` | `x = 5` → **wrong** |
| `ccss-textbook-practice-v1-solve-one-step-equations-q03` | `Solve x − 3 = 8.  x = ?` | `11` | `x = 11` → **wrong** |
| `ccss-textbook-practice-v1-two-step-equations-q01` | `Solve 3x + 4 = 19.  x = ?` | `5` | `x = 5` → **wrong** |
| `ccss-textbook-practice-v1-two-step-equations-q02` | `Solve 2x − 5 = 11.  x = ?` | `8` | `x = 8` → **wrong** |
| `ccss-textbook-practice-v1-linear-equations-q01` | `Solve 3x + 2 = x + 6.  x = ?` | `2` | `x = 2` → **wrong** |
| `ccss-textbook-practice-v1-solve-equations-steps-q01` | `Solve 3x + 2 = x + 10.` | `4` | `x = 4` → **wrong** |
| `ccss-textbook-practice-v1-rational-radical-equations-q01` | `Solve √(x + 3) = 4.` | `13` | `x = 13` → **wrong** |
| `ccss-textbook-practice-v1-systems-elimination-q03` | `Solve 2x + y = 7, x − y = 2 for x.` | `3` | `x = 3` → **wrong** |
| `ccss-textbook-practice-v1-metric-conversion-q03` | `5 m = ? centimeters` | `500` | `500 cm` ✅ but `5 m = 500` → **wrong** |

The prompt *invites* the rejected form (`x = ?`). This is the highest-confidence P0 on the list.

### P0-C — Chinese-language answers on a Chinese-language prompt: **26 items**
A zh / zh-Hans student sees a fully translated Chinese stem but the accepted answers are English-only.
The MC option fallback (`answerMatching.ts:396-403`) saves multiple-choice, but **fill-in / short-answer
has no such escape**. All 26 are in the kp pack; a Chinese answer is rejected for **26 / 26**:

| id | zh prompt | key + aliases | Chinese answer |
|---|---|---|---|
| `…us-ca-math-k-k-g-shapes-position-q04` | `一個平面圖形完全是圓的，沒有直邊也沒有角。這是什麼圖形？` | `["circle"]` | `圓形` → **wrong** |
| `…us-ca-math-k-k-g-shapes-position-q02` | `…有 4 條一樣長的邊和 4 個方角…` | `["square"]` | `正方形` → **wrong** |
| `…us-ca-math-k-k-md-attributes-data-q02` | `班級圖表有 6 個圓形和 5 個正方形。哪一類比較多？` | `["circles"]` | `圓形` → **wrong** |
| `…us-ca-math-k-k-md-attributes-data-q03` | `蠟筆比鉛筆短，鉛筆比馬克筆短。哪一件物件最長？` | `["marker","the marker"]` | `馬克筆` → **wrong** |
| `…us-ca-math-p1-1-g-shape-reasoning-q02` | (triangle) | `["triangle"]` | `三角形` → **wrong** |
| `…us-ca-math-p4-4-g-lines-shapes-q06` | (right angle) | `["right angle","right"]` | `直角` → **wrong** |

Also affected: `rectangle`, `hexagon`, `pentagon`, `parallel`, `acute angle`, `third`, `fourth`.
This is a Kindergarten–Grade 4 population being asked a Chinese question and required to type English.

### P0-D — article-prefixed word answer: **43 / 43 word-answer items**
`a circle` / `the square` / `an acute angle` are rejected (`normalizeAnswer` does not strip articles; only
3 of the 43 items happen to carry a `the …` alias, and those still fail on `a …`). Concrete:
`…us-ca-math-k-k-g-shapes-position-q04`, key `"circle"`, input `"a circle"` → wrong, while the stem is
literally "What shape is it?".

### P0-E — thousands separator: **32 items**
`1,500` rejected for key `1500`. `normalizeAnswer:75` *preserves* the comma and `parseScalarAnswer` has no
comma rule. Concrete: `us-ca-g6-g12-v2-s1-c04-q05` ("actual area … in square meters", key `1500`,
aliases `1500 m^2`, `1500 square meters`) rejects `1,500`; `us-ca-g6-g12-v2-s5-c02-q02` (bacteria
population, key `1600`) rejects `1,600`.

### P1-F — singular/plural flip: **43 / 43 word-answer items**
`circle` for key `circles`, `markers` for key `marker` — both wrong.

### P1-G — clock time: **9 rejections over 3 items**
`us-ca-k5-knowledge-point-practice-v1-us-ca-math-p2-2-md-measure-data-money-time-q02` (key `4:00`) rejects
`4 o'clock`, `04:00` and `4`. Same for `…-q06` (`9:00`) and `…-q10` (`6:00`). Grade-2 students are the
population most likely to write "4 o'clock".

### P1-H — ordered pair without a comma: `9 6` rejected for key `(9, 6)` (12 coordinate items; `9, 6` works).

### P1-I — percent form of a decimal probability: 1 item
`ccss-textbook-practice-v1-independence-q02`, key `0.25`, rejects `25%`. (The stem does say
"(as a decimal)", so this is borderline.)

### P2-J — rounding: 1 item — `us-ca-g6-g12-v2-s5-c05-q25`, key `0.725`, rejects `0.72`.

### Probes that came back CLEAN (no false negative)
`" 7 "`, `7.0`, `07`, uppercase, English number words (754 items), allow-list units `units`/`cm`
(1,339 items each), fraction↔decimal both directions (133 items), unsimplified equivalent fractions,
improper↔mixed, `%` added when the stem asks for a percent (18), `$` added when the stem mentions
dollars (45), unit stripped from a unit-bearing key (57), `square meters` where aliased (13).

---

## 4. Over-loose matching (wrong input accepted)

Systematic sweep over all 1,658 non-MC items (`stageF.mts`), **accepted-wrong counts**:

| probe | applicable | accepted-wrong |
|---|---|---|
| answer + 1 | 1,339 | **0** |
| answer negated | 1,329 | **0** |
| answer × 10 | 1,329 | **0** |
| numerator only / denominator only / reciprocal | 133 / 133 / 120 | **0 / 0 / 0** |
| blank, `0`, `?`, `idk`, `answer`, `banana` | 1,658 each | **0** |
| digits reversed | 668 | **0** |
| a different shape word | 40 | **0** |
| **wrong unit swap (`17 cm` key ← `17 km`)** | 22 | **22** |

Plus, MC-side (`stageE.mts`): **0** distractors are accepted by the grader across all 1,144 MC items, and
**0** option pairs collide under normalisation. `questionAnswerMatches`'s option fallback requires the
student text and the accepted answer to hit the *same* option, so it cannot cross-accept.

**The only over-loose class is unit-blindness** (`parseScalarAnswer:354` strips `cm|km|ml|l|km/h|°|%` before
comparing, and `stripKnownUnitSuffix` pops allow-list words): 22 K–1 measurement items accept `17 km`
for a `17 cm` answer, and `12` is accepted for `12 cm`. Severity note: the task brief calls over-loose
matching P1, while the severity rubric calls "wrong answer accepted" P0 — recorded here as **P1**, low
real-world frequency, but it is a genuine grading defect.

### Chinese-UI MC grading — works
`components/practice/PracticeQuestionCard.tsx:642` submits `text(option)` — the option in the *current UI
language*. `answerMatching.ts:396-403` then matches the Chinese option text back to the English answer key
via the shared option. The kp and g6g12 packs carry real zh/zhHans option text, and 0 MC items fail the
answer-in-options check, so **Chinese-UI multiple-choice grades correctly**. Chinese-UI *typed* answers
do not — see P0-C.

### Localisation defect that feeds the grader
`ccss-textbook-practice-v1` has **`prompt.zh === prompt.zhHans === prompt.en` for all 810 items**
(`stageB.mts`). 29 % of the live CA bank shows raw English to a Chinese-UI student, including K–2
material. kp (492) and g6g12 (1,500) are properly translated. **P1.**

---

## 5. Session assembly

* **Session size = 5.** `app/practice/page.tsx:184-185`:
  `requiredAdaptiveQuestionCount = 5`, `freeSelectionRoundQuestionCount = 5`. The e2e suite asserts the
  same ("must be in the active five-question round", `tests/e2e/math-diagram-boundary.spec.ts:766`).
* **No shuffling anywhere.** `displayedQuestions` (`page.tsx:1297-1302`) preserves API order;
  `freeSelectionRoundQuestions = displayedQuestions.slice(0, 5)` (`:1304-1306`). The API preserves
  `usCaliforniaQuestions` order (`questionStore.ts:283-289`) and **memoises the result per filter key**
  (`questionStore.ts:277-289`, `publicQuestionsCache`). There is **no `Math.random`, no sort, no seed**
  on this path. A given grade+topic+difficulty always yields the same first five questions, forever.
* **Option order is fixed from the pack.** `PracticeQuestionCard.tsx:641-672` maps
  `question.options` directly; the correct-option position is never randomised at serve time.
* **Filtering**: curriculum profile (locked to the signed-in user, `app/api/questions/route.ts:99-105`)
  + grade + topicId + active difficulty (`questionStore.ts:274-280`), then a client-side question-type
  filter (`page.tsx:1300`).
* **Repeats within a session**: `dedupePracticeQuestions` (`lib/practiceQuestionDeduping.ts:50-59`) keys on
  topic + normalised prompt, so the same prompt cannot appear twice in one round. It removes **344 of
  2,802 CA items (12.3 %)** as unreachable duplicates — the effective CA bank is **2,458**. 343 exact
  duplicate prompts exist inside a single grade+topic bucket (e.g. `…k-k-g-shapes-position-q01` vs `-q05`
  vs `-q09`, identical stems). 76 grade+topic buckets exist; **none** falls below 5 questions.
* **Anonymous preview** is capped at 20 questions (`app/api/questions/route.ts:13,123-131`).

### Gameability — correct-option position is non-uniform (**P1**)

Correct-option index across the 1,144 live CA MC items:

| pack | n | idx 0 | idx 1 | idx 2 | idx 3 |
|---|---|---|---|---|---|
| `ccss-textbook-practice-v1` | 489 | **462 (94.5 %)** | 25 (5.1 %) | 2 (0.4 %) | **0 (0 %)** |
| `us-ca-g6-g12-v2` | 520 | 144 (27.7 %) | 129 (24.8 %) | 123 (23.7 %) | 124 (23.8 %) |
| `us-ca-k5-knowledge-point-practice-v1` | 135 | 38 (28.1 %) | 24 (17.8 %) | **72 (53.3 %)** | 1 (0.7 %) |
| **all CA** | **1,144** | **644 (56.3 %)** | 178 (15.6 %) | 197 (17.2 %) | 125 (10.9 %) |

Because nothing is shuffled, this is directly exploitable: on the 810-question CCSS textbook pack a
student who always clicks **option A** scores **94.5 %** and never needs to read the question; option D is
**never** correct there. On the K–G5 knowledge-point pack, always clicking **C** scores **53.3 %**. Over the
actual served first-5 rounds across all 76 buckets, 40.7 % of MC answers sit at index 2 and 31.9 % at
index 0 (vs 25 % for a uniform layout).

---

## 6. Figures / diagrams

* `data/usCaliforniaPracticeFigures.ts` defines **10** ten-frame specs (`:40-177`), all
  `us-ca-k5-knowledge-point-practice-v1-…`; all 10 resolve to live questions; **0 orphans**.
  `toQuestion` attaches them at `data/usCaliforniaQuestions.ts:95,114`; `toPublicQuestion` forwards
  `diagram` (`lib/server/questionStore.ts:255`); `PracticeQuestionCard.tsx:614-615` renders it. The path
  is intact end-to-end.
* **10 of 2,802 served CA items (0.36 %) receive a figure.** All 10 are ten-frames; K and Grade 1 only.
* `data/usCaliforniaLessonIllustrations.ts` (78 lines) is **lesson**-scoped, not practice-scoped — it is
  not consulted by `toQuestion` and contributes **zero** practice figures.
* Live CA items whose stem uses deictic visual language (`ten-frame`, `number line`, `the picture/figure/
  diagram/graph/table/array/model`, `X below/above/shown`, `dot plot / histogram / box plot / scatter plot /
  bar model / area model / pictograph / tally chart`, `count the counters`): **149**. Of those, **147
  receive no figure**; only 2 do.
  * by term: "the picture/this picture" 71, statistical-display nouns 49, ten-frame 21, number line 6
  * by pack: g6g12 106, kp 22, ccss 19
* **Genuinely unanswerable-as-served: 0.** Every visual-referencing stem restates the numbers in text
  ("A ten-frame shows 10 counters and 2 more counters"; "A number line from 0 to 1 is split into 6 equal
  jumps. A point is at jump 4"; "A line of best fit … is ŷ = 8x + 7"; "The graph shows 6 dogs, 4 cats and
  8 fish"). Many of the 106 G6–G12 hits are false positives where "image" is the *geometric* image of a
  transformed point. **So the figure gap is a pedagogy gap (P1/P2), not a P0 answerability gap.** That is
  the honest reading and it should not be inflated.
* **Real inconsistency (P2, but visible to a child):** within one skill, `…k-k-nbt-teen-numbers-q01`
  ("A ten-frame shows 10 counters and 3 more") and `-q05` ("…and 7 more") get a ten-frame, while
  `-q09` ("…and 2 more"), the identical construction, does not. 8 of the 10 specs are attached to items
  whose stem never mentions a picture at all ("A tray has 2 red counters and 3 blue counters"), so figure
  placement does not track stem language.
* `scripts/audit-math-diagram-inventory.ts` is read-only unless `--output` is passed (`:596-604`). Ran it
  bare — **PASS**, `practiceFigureCount: 27` (all banks; CA contributes 10),
  `semanticSvgMissingViewBoxCount: 0`, `ccssUnsafeButtonTypeCount: 0`,
  `ccssControlSideEffectSignalCount: 0`. It counts figures and checks asset ownership/viewBox contracts;
  **it never asks whether a question that needs a figure has one.**
  `tests/e2e/math-diagram-boundary.spec.ts` (3,060 lines) is a Playwright lesson-surface suite (hydration
  contract, angle-paint geometry, horizontal-overflow); it was **not run** (would need a dev server).

---

## 7. Existing test coverage — verbatim results and the honest gap

Note: this repo has **no vitest** (`package.json` has no vitest dependency; tests run as
`tsc → node --test`, and package scripts are frozen). Everything below was run with the repo's own
`node_modules/.bin/tsx --tsconfig tsconfig.json --test <file>`, which writes nothing into the repo.
`npx vitest` fails here with a rolldown native-binding error — that is an npx artefact, not a test failure.

```
$ tsx --test data/usCaliforniaMathematicalPractices.test.ts
✔ all eight Standards for Mathematical Practice are present and ordered (0.703542ms)
✔ each practice standard uses the canonical CCSS identifier (0.100417ms)
✔ every practice standard carries trilingual title and description (0.1115ms)
✔ lookup map resolves every code (0.051375ms)
✔ practice standards are re-exported from the California knowledge-points surface (0.059959ms)
ℹ tests 5  ℹ pass 5  ℹ fail 0

$ tsx --test data/usCaliforniaLessons.test.ts
✔ California K-5 textbook lessons and 492-question knowledge-point practice are live (6.31475ms)
✔ California lesson titles use MAIS knowledge-point codes instead of module wrappers (1.370417ms)
✔ California K-5 textbook concept explanations are unit-specific student-facing copy (0.982459ms)
✔ California K-5 worked examples use near-transfer values instead of repeating concept examples (1.87525ms)
✔ California live topic IDs are unique so lesson blocks render once (0.350625ms)
✔ California worked examples hide generator and QA wrapper labels (1.06325ms)
✔ California practice questions hide generated activity wrapper labels (5.172459ms)
✔ California assigned topics carry a teacher guide with full CCSS standard text (3.915334ms)
✔ California worked examples put answers and reasoning on separate lines (56.261167ms)
✔ California Grade 1 Add Subtract lesson leads with interactive CCSS lessons (sticker illustration preserved) (21.266291ms)
✔ California Grade 1 H/L micro-lessons are individual MAIS knowledge points (52.654083ms)
✔ California Kindergarten cardinality compare lesson teaches cardinality, not joining addition (2.801709ms)
ℹ tests 12  ℹ pass 12  ℹ fail 0

$ tsx --test data/ccssLessonAssignments.test.ts
✔ every referenced lesson is actually ported (0.506041ms)
✔ every assignment targets a real K–G5 textbook topic or G6–G12 chapter topic (0.094833ms)
✔ every assigned K–G5 lesson shares at least one CCSS standard with its topic (0.215083ms)
✔ every ported lesson is reachable from some topic (0.126ms)
✔ primary is never also listed as related, and related has no duplicates (0.105792ms)
✔ every assignment carries a curation rationale (0.0685ms)
✔ every ported lesson has a non-empty read-aloud narration and metadata (0.186125ms)
✔ every K–2 lesson has a hand-authored narration, not the summary fallback (0.131917ms)
ℹ tests 8  ℹ pass 8  ℹ fail 0

$ tsx --test lib/fullQuestionBankSolvability.test.ts
✔ full question bank is independently solvable and answer-key matched (60019.813542ms)
✔ Hong Kong EASE Practice V1 exposes only S18 green text-only questions across HK publishers (1.115209ms)
✔ Mainland PEP full question bank emits row-level solvability and answer-key QA verdicts (2563.670666ms)
ℹ tests 3  ℹ pass 3  ℹ fail 0

$ tsx --test lib/mvpReadiness.test.ts
✔ seed content has at least one practice question for every practice-backed roadmap topic (2.976417ms)
✔ seed question IDs are unique (1.957ms)
✔ each practice-backed roadmap topic has a useful minimum question set (380.089084ms)
✔ practice question bank does not export generated coverage filler (1.103ms)
✔ practice graph questions use suitable topics and valid coordinate ranges (19.36825ms)
✔ auto-graded non-multiple-choice answers include aliases for brittle formats (8.218833ms)
✔ prose short answers include Chinese aliases for bilingual grading (4.434541ms)
✔ Simplified Chinese fallback follows PRC character and terminology rules (2.278875ms)
✔ Simplified Chinese uses explicit zhHans copy before fallback conversion (0.841959ms)
✔ Simplified Chinese grade labels use Mainland school-stage wording (0.366292ms)
✔ visualization lab topic IDs exist in the roadmap topics (0.286708ms)
✔ visualization catalog covers every roadmap topic plus five capstones (0.903125ms)
✔ roadmap visualization suite has labels for every roadmap topic (0.1455ms)
✔ every roadmap topic has exactly one production-ready lesson seed (0.655125ms)
✔ mainland PEP junior and high-school lesson seeds cover every S1-S6 topic (3.614541ms)
✔ Florida B.E.S.T. middle-school textbook beta has topics, questions, and lesson seeds (0.20025ms)
✔ production lesson seeds meet the authored block standard (1.301458ms)
✔ Mainland PEP high lesson illustrations stay withdrawn pending owner-approved redraw (0.206208ms)
✔ Mainland PEP junior lesson illustrations cover approved concept and worked-example assets (0.342042ms)
✔ Mainland PEP primary lesson illustrations stay withdrawn pending approved asset promotion (0.090917ms)
✔ Mainland HJB primary lesson illustrations cover approved concept and worked-example assets (16.127875ms)
✔ US Arkansas middle-school lessons stay live while S24 exact-layer illustrations remain withdrawn (0.646ms)
✔ worked-example illustration renderer covers all curriculum lesson units (20.145208ms)
✔ California textbook worked examples have visual QA coverage (1.429292ms)
✔ production lessons with visualization blocks reuse primary lab mappings (0.323667ms)
✔ production-ready lesson seeds do not use generic placeholder phrasing (17.236083ms)
✔ current recommended and showcase lessons use data-backed production content (0.145458ms)
✔ client-referenced API routes are implemented (0.105417ms)
✔ roadmap lesson links use slugs served by the lesson API route (0.175042ms)
✔ session tokens require an explicit production secret (0.406333ms)
✔ session tokens verify with a configured secret (33.586666ms)
✔ parent console API surface and authorization hooks are present (1.190667ms)
ℹ tests 32  ℹ pass 32  ℹ fail 0

$ tsx scripts/audit-math-diagram-inventory.ts
PASS: every live inventoried surface has a reachable owner and required source/viewBox contract;
      4 ported non-live signature benches remain intentionally unassigned
```

**60 assertions, 0 failures.** Why they are green while the defects above are real:

1. **"independently solvable" is a tautology for California.**
   `lib/questionBankSolvability.ts:1224` resolves the "independent" answer via
   `independentUnitedStatesCaliforniaAnswer`, which is
   `usCaliforniaQuestionGenerationMetadata[id].independentAnswer ?? question.answer`
   (`data/usCaliforniaQuestions.ts:159-161`). That metadata field is set at
   `data/usCaliforniaQuestions.ts:135` to **`question.answer` for every multiple-choice item** and to the
   pack's own `independentAnswer` JSON field otherwise. So for 1,144 MC items the test compares the
   answer to itself, and for the other 1,658 it compares two fields written by the same generator run.
   **No CA question's mathematics is ever re-derived from its prompt.** (Contrast: Mainland PEP high gets
   `mainlandIndependentAnswer`, a real prompt-derived solver, `:1239`.) This is exactly why my
   "independentAnswer disagrees with answer" count is 0 — it is 0 by construction, not by verification.
2. **The over-loose check is one neighbour deep.** `wrongAnswerFor` (`:1310-1319`) only tries
   `±1, ±10, 999999`. It has no unit-swap probe, which is why the 22 `cm`←`km` acceptances survive.
3. **The false-negative direction is not tested at all.** `:1380-1386` only checks that each *stored*
   accepted answer is accepted. Nothing ever feeds a plausible *student* variant (`7.`, `x = 7`, `1,500`,
   `a circle`, `圓形`) into the grader.
4. **The alias tests exclude California by predicate.**
   `lib/mvpReadiness.test.ts:144-146`: `isCoreBilingualAnswerQuestion` returns
   `question.region !== "US" && …`, so the "prose short answers include Chinese aliases for bilingual
   grading" test (`:273-282`) **never inspects a single CA item** — which is precisely where the 26
   Chinese-answer rejections live. And `answerNeedsAliases` (`:98-102`) returns `false` for any bare
   integer/decimal, so the "brittle formats" test (`:263-271`) never demands an alias for the 1,339
   integer-key CA items where `7.` / `1,500` / `x = 7` fail.
5. **Explanations are never checked to reach the answer for CA.**
   `requireExplanationAnswerReach` is passed only for the Mainland `rag-v4` batch
   (`lib/questionBankSolvability.ts:1750`).
6. **Nothing asserts option-position entropy.** The audit checks option *count* (=4,
   `:1396`) and *uniqueness* (`:1397`) but never the distribution of the correct index — hence 94.5 %-at-A
   passes cleanly.
7. **Nothing asserts figure coverage.** The figure audit
   (`lib/practiceFigureAudit.ts`, invoked from the solvability row check `:1360-1370`) validates that a
   *present* diagram reconciles with the stem; it never asks whether a stem that says "a ten-frame shows…"
   *has* a diagram.
8. **Session assembly is untested.** No unit test covers the `.slice(0, 5)` round, the absence of
   shuffling, or the deterministic ordering.
9. `data/usCaliforniaLessons.test.ts` "California practice questions hide generated activity wrapper
   labels" is the only test touching `sanitizeStudentText`, and it asserts the *absence* of wrapper
   labels — which is trivially true because no live prompt ever had one.

---

## 8. Severity roll-up

| ID | Class | Severity | Live items affected |
|---|---|---|---|
| P0-A | Trailing period `9.` rejected | P0 | 1,658 / 1,658 non-MC |
| P0-B | `x = 7` rejected on a prompt that asks `x = ?` | P0 | 10 explicit (the rule is absent bank-wide) |
| P0-C | Chinese answer rejected on a Chinese prompt (fill-in/short-answer) | P0 | 26 |
| P0-D | `a circle` / `the square` rejected | P0 | 43 / 43 word-answer items |
| P0-E | `1,500` rejected for key `1500` | P0 | 32 |
| P1-F | singular/plural flip rejected | P1 | 43 |
| P1-G | `4 o'clock` / `04:00` rejected for `4:00` | P1 | 3 items (9 input forms) |
| P1-H | `9 6` rejected for `(9, 6)` | P1 | 12 |
| P1-I | `25%` rejected for key `0.25` | P1 | 1 |
| P1-J | **Correct option at index 0 in 94.5 % of the 489 CCSS-pack MC items; never at index 3. No shuffling anywhere.** | P1 | 1,144 MC |
| P1-K | Over-loose unit blindness (`17 km` accepted for `17 cm`) | P1 | 22 |
| P1-L | `ccss-textbook-practice-v1` shows English to Chinese-UI students (`zh === en`) | P1 | 810 |
| P1-M | 147 stems use visual language with no figure; only 10 figures exist bank-wide | P1 | 147 |
| P1-N | Deterministic session: same 5 questions forever per grade+topic+difficulty | P1 | all 76 buckets |
| P2-O | `Challenge` + `Exam` collapse to one served `High` tier | P2 | 575 |
| P2-P | 344 items (12.3 %) unreachable — deduped-away duplicate prompts | P2 | 344 |
| P2-Q | Figure placement inconsistent inside one skill (teen-numbers q01/q05 vs q09) | P2 | 1 skill |
| P2-R | `0.72` rejected for key `0.725` | P2 | 1 |
| P2-S | `sanitizeStudentText` DeepSeek rule is unanchored `/gi` — latent only | P2 | 0 live |

**Not defects (verified clean):** `independentAnswer` never disagrees with `answer` (0/2,802);
no MC item lacks options or has its answer outside its options (0/1,144); no MC distractor is accepted
(0); no duplicate options after normalisation (0); the answer key itself always grades correct
(1,658/1,658); `sanitizeStudentText` never empties or mathematically damages a live prompt (0/8,406
strings); no live CA item is genuinely unanswerable without a figure (0).
