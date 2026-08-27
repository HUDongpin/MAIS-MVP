# California math content — bilingual localization QA (read-only audit)

Date: 2026-08-26 · Repo `/Volumes/Starship/MAIS-MVP` (branch `codex/edulab-mais`, no files modified)
Scope: the three packs wired live by `data/usCaliforniaTopics.ts`.

| key | pack | items | grades |
|---|---|---|---|
| A | `data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json` | 492 | K–P5 |
| B | `data/generated-content/ccss-textbook-practice-v1/question-pack.json` | 810 | K–S6 |
| C | `data/generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json` | 1500 | P6–S6 |

Total localized-string surface examined mechanically: **2 802 items / 20 190 localized fields**
(prompt + every option + explanation + chapterTitle). Hand-read sample: **209 items**
(A 60 across 6 grades, B 65 across 13 grades, C 84 across 7 grades) plus every item in each
defect class below.

---

## Part 0 — Ground truth

### 0.1 What `sanitizeStudentText` actually strips

`data/usCaliforniaQuestions.ts:39-47`:

```js
function sanitizeStudentText(value) {
  return value
    .replace(/^\s*(?:Activity|Practice activity)\s*\d+\s*:\s*(?:DeepSeek\s*practice\s*:\s*)?/i, "")
    .replace(/^\s*(?:練習活動|练习活动|活動|活动)\s*\d+\s*[：:]\s*(?:(?:DeepSeek|深度求索)\s*(?:練習|练习)\s*[：:]?\s*)?/i, "")
    .replace(/\bDeepSeek\b\s*(?:practice)?\s*:?\s*/gi, "")
    .replace(/深度求索\s*(?:練習|练习)\s*[：:]?\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
```

Findings about the sanitizer:

1. **It is applied to `prompt` only.** `toQuestion()` does
   `prompt: sanitizeLocalizedText(question.prompt)` but passes
   `options: optionsFor(question)` and `explanation: question.explanation` through
   **unsanitized**. Any artifact living in an option or an explanation reaches the student.
2. **Every rule in it is dead code for all three live packs.** Mechanical scan for
   `DeepSeek`, `深度求索`, `Activity N:`, `練習活動 N：` across all 20 190 fields of packs
   A/B/C: **0 hits**. Those rules exist for the *retired* pack
   `us-ca-math-k-g5-generated-bank-v3-deepseek-1500` (1500/1500 prompts start with
   `Activity N: DeepSeek practice:`), which `californiaK5LiveContentStatus.practiceLive:false`
   keeps out of the live set.
3. **One generator artifact does survive and is NOT stripped:** pack A carries the
   generator label `"<KnowledgePoint> checkpoint: "` at the head of **492/492 English
   prompts** (`"Count Sequence checkpoint: …"`, `"1-H.1 Picture Join Stories to Ten
   checkpoint: …"`). The sanitizer has no rule for `checkpoint:`. See P2-1.
4. Residual double-spaces exist in 19 pack-B prompts; the `\s{2,}` rule removes those in
   `prompt` only.

### 0.2 Repo localization tooling — what applies to the CA track

| tool | what it enforces | applies to CA packs? |
|---|---|---|
| `scripts/audit-zh-hans.mjs` | Parses `traditionalToSimplifiedMap` + phrase rules out of `lib/i18n.ts`; flags Traditional chars surviving conversion, PRC banned terms (`视觉化`,`课节`,`电邮`,`账户`,`小一`…`中六`,`函数图像`,`常态分布`,**`周界`→`周长`**,`位值`→`数位`), missing `zhHans`, CJK/Latin punctuation spacing. | **No.** `sourceExtensions = new Set([".ts", ".tsx"])` and the matcher is a source regex `/\bzh\s*:\s*(["'\`])…/`. The packs are `.json`, so **zero** CA pack content is scanned. Confirmed: the run below reports no `data/generated-content/**` path at all. |
| `scripts/audit-hk-chinese.mjs` | Same `DEFAULT_TARGET_DIRS = ["app","components","data","lib","types"]`, TypeScript-AST based; enforces `data/hkChineseGlossary.ts` / `hkChineseExceptions.ts`. | **No** — TS/TSX only, same blind spot. |
| `data/hkChineseGlossary.ts` | HK EDB 《數學科常用英漢辭彙》 + HK grade names 小一…中六, HK role names. Explicitly **HK-track** governance (`preferredZh: "小一"`, `rejectedZh: ["一年級","七年級"]`). | **HK track only.** The CA track uses `一年級/二年級…` (US grade names), which the HK glossary would *reject*. Do not apply the HK glossary to CA. |
| `data/hkChineseExceptions.ts` | Allow-listed Latin phrases (`MAIS`, `AI`, demo persona names) scoped to `app/**`,`components/**`,`data/**`,`lib/**`. | Scope strings would match `data/**` but the runner never reads `.json`, so inert for CA packs. |

**Net: the three live CA question packs are outside every existing localization gate in the repo.**

### 0.3 `node scripts/audit-zh-hans.mjs` — verbatim output (CA-relevant portion)

```
PRC Simplified Chinese Audit
Scanned files: 1694
Localized zh strings found: 7408
Issues: 5149
Critical: 0
Warnings: 0
Advisory: 5149

[missing-zhHans] 5048 issue(s)
[punctuation-spacing] 101 issue(s)
```

CA-relevant content in that output: **none.** Filtering the full 253-line report for
`generated-content`, `usCalifornia`, or any `data/` path yields 0 matches; every issue is in
`app/**` or `components/**` UI chrome. The audit is green (`Critical: 0`) *because it cannot
see the CA packs*, not because they are clean.

### 0.4 How answers are matched (needed for §6 severity)

`lib/server/answerMatching.ts:392` — the live grading entry point used by
`lib/server/practiceAttemptStore.ts:195`, `lib/server/answerGrading.ts:11`,
`lib/server/userStore.ts:6102/9374`, `lib/server/userStore/studentActivityPersistence.ts:1916`:

```ts
export function questionAnswerMatches(question: GradingQuestion, selectedAnswer: string) {
  const acceptedAnswers = [question.answer, ...(question.accepted_answers ?? [])];
  if (acceptedAnswers.some((answer) => answerMatches(selectedAnswer, answer))) return true;

  return (question.options ?? []).some((option) => {
    const localizedOptions = [option.en, option.zh, option.zhHans ?? ""].filter(Boolean);
    const selectedOption = localizedOptions.some((optionText) => answerMatches(selectedAnswer, optionText));
    const acceptedOption = acceptedAnswers.some((answer) =>
      localizedOptions.some((optionText) => answerMatches(answer, optionText))
    );
    return selectedOption && acceptedOption;
  });
}
```

Consequences, verified by executing the transpiled function against the real packs:

* **Multiple-choice is language-safe.** Because the correct option object carries the English
  answer text in `option.en`, picking its `zh`/`zhHans` sibling grades correct.
  Simulation on `…k-k-g-shapes-position-q01` (`answer:"triangle"`):
  `三角形→true`, `正方形→false`, `長方形→false`, `圓形→false`. Across all 1 144 MC items in
  A+B+C, **0** cases where selecting the Chinese text of the correct option grades wrong.
* **Free-response is NOT language-safe.** For `fill-in` / `short-answer` there are no
  `options`, so the fallback branch never runs and only `answer` + `acceptedAnswers` are
  compared. If the key holds English words only, a Chinese answer cannot match. This is the
  root of **P0-2** below. Simulation on `…p1-1-g-shape-reasoning-q02`
  (`answer:"triangle"`, `options: undefined`):
  `三角形→false`, `triangle→true`, `3角形→false`.

---

## Part 1 — Mechanical count tables

Method: `node` scripts over the raw JSON. Trad/Simp classification built from the repo's own
`traditionalToSimplifiedMap` (386 differing pairs) extended to ~1 500 pairs, with all
one-to-many ambiguous forms (`了 面 表 周 出 里 布 回 松 干 后 谷 系 台 复 …`) excluded from both
leak sets — an unfiltered set produced 663 false positives, all from those characters.

### 1.1 Class × pack (field-level occurrences)

| defect class | A (492) | B (810) | C (1500) | total | verdict |
|---|---:|---:|---:|---:|---|
| `zh` byte-identical to `en`, en has real words (**untranslated**) | 0 | **2 694** | 12 | 2 706 | REAL — P0/P1 |
| `zhHans` byte-identical to `en`, en has real words | 0 | **2 694** | 12 | 2 706 | REAL — P0/P1 |
| `zh`/`zhHans` == `en`, symbol/number-only field (`"12"`, `"3/4"`) | 436 | 882 | 2 068 | 3 386 | benign |
| `zh` empty / undefined | 0 | 0 | 0 | 0 | clean |
| `zhHans` empty / undefined | 0 | 0 | 0 | 0 | clean |
| Simplified chars leaking into `zh` | **0** | 0 | **0** | 0 | clean |
| Traditional chars leaking into `zhHans` | **0** | 0 | **0** | 0 | clean |
| `zh` == `zhHans` while text still holds Traditional-only chars | 0 | 0 | 0 | 0 | clean |
| number-multiset mismatch en↔zh (raw) | 150 | 0 | 83 | 233 | **all false positives** — see 1.3 |
| number-multiset mismatch en↔zh (prompt body, prefix-normalised) | **0** | **0** | 43 | 43 | 43 verified benign |
| `zh`↔`zhHans` content divergence (Han-count Δ>2 or number mismatch) | **37** | 0 | 0 | 37 | REAL — P1 |
| MC: correct answer unmatchable against any `zh` option text | 26 | 0 | 0 | 26 | display-only, grading OK |
| MC: correct answer unmatchable against any `zhHans` option text | 26 | 0 | 0 | 26 | display-only, grading OK |
| MC: option count differs across en/zh/zhHans | 0 | 0 | 0 | 0 | clean (options are `LocalizedText[]`, count is structural) |
| MC: an option missing `zh` or `zhHans` | 0 | 0 | 0 | 0 | clean |
| MC: duplicate option text within one language | 0 | 0 | 0 | 0 | clean |
| MC: picking the Chinese text of the correct option grades WRONG | **0** | 0 | **0** | 0 | clean |
| free-response with English-word-only answer key under a Chinese prompt | **22** | 0 | **0** | 22 | REAL — **P0** |
| generator artifacts (`DeepSeek`/`深度求索`/`Activity N:`) surviving sanitizer | 0 | 0 | 0 | 0 | clean |
| generator label `"… checkpoint:"` in `en` prompt (not sanitized) | **492** | 0 | 0 | 492 | REAL — P2 |
| Chinese prompt prefix states the wrong grade (幼兒園 on P1/P2 items) | **12** | 0 | 0 | 12 | REAL — P1 |
| stray Latin words inside Chinese text | 0 | 0 | 115 | 115 | **all benign** (`sin`, `tan`, `ABC`, `Bx`) |
| half-width `,`/`;`/`?` inside Chinese text | 13 | 0 | 143 | 156 | mostly benign coordinate pairs; ~40 real — P2 |
| markdown / LaTeX residue in Chinese text | 0 | 0 | 0 | 0 | clean |

### 1.2 Untranslated coverage, item-level

| pack | items | `prompt.zh === prompt.en` | `prompt.zh` contains no Han | `explanation.zh === en` | items with any Chinese at all |
|---|---:|---:|---:|---:|---:|
| A | 492 | 0 | 0 | 0 | **492** |
| B | 810 | **810 (100 %)** | **810 (100 %)** | **810 (100 %)** | **0** |
| C | 1500 | 0 | 0 | 0 | **1500** |

Pack B untranslated prompt counts by grade — every grade, no exceptions:
`K 30 · P1 45 · P2 63 · P3 60 · P4 78 · P5 60 · P6 69 · S1 60 · S2 66 · S3 84 · S4 90 · S5 51 · S6 54`.

### 1.3 Numeric-drift false-positive analysis (all 233 raw hits hand-verified)

| sub-pattern | n | example | verdict |
|---|---:|---|---|
| A: en prompt prefix carries a knowledge-point code (`1-H.1`, `…to Ten`) that the zh prefix drops | 144 | en `1-H.1 Picture Join Stories to Ten checkpoint: A tray has 4 red blocks and 5 blue blocks…` vs zh `一年級運算思維練習：托盤上有 4 個紅色積木和 5 個藍色積木…` | benign — body numbers identical |
| A: English number-word rendered as a digit in Chinese | 6 | en `Start with one ten, then count 4 more ones to get 14.` / zh `先有 1 個十，再數 4 個一，得到 14。`; en `Perimeter is twice length plus width` / zh `周界 = 2 x（長 + 寬）` | benign |
| C: `right angle at C` rendered as `∠C = 90°` | ~26 | `us-ca-g6-g12-v2-s4-c02-q01` | benign — mathematically equivalent |
| C: `scale factor of 3` dropped from the Chinese sentence | ~17 | `us-ca-g6-g12-v2-s4-c02-q03` en `…with a scale factor of 3, and the side matching 3 cm measures 9 cm` / zh `…三角形 B 與 A 相似，對應 3 厘米的邊長為 9 厘米` | benign (9/3 recovers it) but **information loss — P2** |
| C: explanation drops the data list (chapter `p6-c05`) | 20 | `us-ca-g6-g12-v2-p6-c05-q02` en `Mean = (19, 21, 27, 29) sum 96 ÷ 4 = 24.` / zh `平均數 = 總和 96 ÷ 4 = 24。` | **P2 — the worked solution no longer shows the data** |
| C: en repeats an intermediate value the zh sentence elides (chapter `s1-c02`) | 20 | en `5 − (−8) = 13; then 13 + (−6) = 7.` / zh `5 − (−8) = 13；再加 (−6) 得 7。` | benign |

**Zero P0 numeric drift.** After normalising the prompt prefix, prompt-body number multisets
match across en/zh/zhHans for **2 802 / 2 802** items.

---

## Part 2 — Findings

Severity: **P0** = a Chinese-reading student sees a different or unanswerable question, or is
marked wrong when right · **P1** = untranslated/incorrect content shown to students ·
**P2** = polish/consistency.

### P0-1 — Pack B (810 items, all 13 grades) ships zero Chinese; it is the *lead* practice source

| field | value |
|---|---|
| items | **810 / 810** (100 %) |
| pack | B `ccss-textbook-practice-v1` |
| fields | `prompt`, `explanation`, every `option` — `zh` and `zhHans` are byte-identical English |
| severity | **P0** |
| class | missing translation |

Evidence (`ccss-textbook-practice-v1-absolute-value-q03`, grade P6, live):

```json
{
 "id": "ccss-textbook-practice-v1-absolute-value-q03",
 "grade": "P6",
 "type": "multiple-choice",
 "prompt": { "en": "|−6| compared with |−3|:", "zh": "|−6| compared with |−3|:", "zhHans": "|−6| compared with |−3|:" },
 "options": [
  { "en": "|−6| is greater", "zh": "|−6| is greater", "zhHans": "|−6| is greater" },
  { "en": "|−3| is greater", "zh": "|−3| is greater", "zhHans": "|−3| is greater" },
  { "en": "equal",           "zh": "equal",           "zhHans": "equal" },
  { "en": "cannot tell",     "zh": "cannot tell",     "zhHans": "cannot tell" }
 ],
 "answer": "|−6| is greater",
 "explanation": { "en": "6 > 3.", "zh": "6 > 3.", "zhHans": "6 > 3." }
}
```

Second example (`ccss-textbook-practice-v1-counting-ten-frame-q01`, grade K):
`prompt.zh = "A full ten-frame is completely filled. How many counters is that?"`.

**Why this is P0 rather than a known-gap P1.** The pack's own metadata records the decision —
`"languageVariant": "en-first (owner decision 2026-07-19: US California track ships English
lesson bodies; zh/zhHans mirror en until the localization workstream)"` — but it is also
`"packageStatus": "live"` and `data/usCaliforniaLessons.ts:208-230` seeds every topic's
practice list from it *first*:

```ts
// Hand-checked CCSS textbook practice leads; generated-bank questions fill
// the remainder ("CCSS becomes the core" decision, 2026-07-19).
topicQuestions
  .filter((question) => question.batch === "ccss-textbook-practice-v1")
  .forEach((question) => picked.add(question.id));
…
return Array.from(picked).slice(0, 8);
```

Measured impact over the 76 live CA topics:

* **62 / 76 topics** contain pack-B questions.
* **52 / 76 topics** have **all 8** practice slots filled by pack B before any translated
  question is considered.
* **464 / 608 practice slots (76.3 %)** are guaranteed English-only.

So a student on `zh` or `zhHans` sees an all-English practice set in two thirds of CA topics
— including grade K. Fix: either translate pack B, or make `selectPracticeQuestionIds`
locale-aware (de-prioritise `languageVariant: en-first` packs when the request locale is not
`en`) so translated pack A/C items lead for Chinese locales.

### P0-2 — 22 free-response items ask in Chinese but accept only English words

| field | value |
|---|---|
| items | 22 (K 6, P1 4, P3 2, P4 4, plus 6 more K) |
| pack | A `us-ca-k5-knowledge-point-practice-v1` |
| fields | `answer` / `acceptedAnswers` vs `prompt.zh` / `prompt.zhHans` |
| severity | **P0** — student is marked wrong when right |
| class | option/answer-key integrity |

Evidence (`…us-ca-math-p1-1-g-shape-reasoning-q02`):

```json
{
 "id": "us-ca-k5-knowledge-point-practice-v1-us-ca-math-p1-1-g-shape-reasoning-q02",
 "grade": "P1",
 "type": "fill-in",
 "prompt": {
  "en": "Shape Reasoning checkpoint: A flat shape has 3 straight sides and 3 corners. What shape is it?",
  "zh": "幼兒園幾何練習：一個平面圖形有 3 條直邊和 3 個角。這是什麼圖形？",
  "zhHans": "幼儿园几何练习：一个平面图形有 3 条直边和 3 个角。这是什么图形？"
 },
 "answer": "triangle",
 "acceptedAnswers": ["triangle"],
 "independentAnswer": "triangle",
 "explanation": {
  "en": "A shape that has 3 straight sides and 3 corners is a triangle.",
  "zh": "有 3 條直邊和 3 個角的圖形是三角形。",
  "zhHans": "有 3 条直边和 3 个角的图形是三角形。"
 }
}
```

Executed against the live grader: `三角形 → false`, `triangle → true`. The explanation the
student is then shown says the answer *is* 三角形. There is no `options` array, so
`questionAnswerMatches`'s localized-option fallback never runs.

Full list (ids abbreviated, prefix `us-ca-k5-knowledge-point-practice-v1-`):

| id | grade/type | acceptedAnswers | zh prompt (prefix stripped) | should also accept |
|---|---|---|---|---|
| `us-ca-math-k-k-md-attributes-data-q02` | K/fill-in | `["circles"]` | 班級圖表有 6 個圓形和 5 個正方形。哪一類比較多？ | 圓形 / 圆形 |
| `us-ca-math-k-k-md-attributes-data-q03` | K/short-answer | `["marker","the marker"]` | 蠟筆比鉛筆短，鉛筆比馬克筆短。哪一件物件最長？ | 馬克筆 / 马克笔 |
| `us-ca-math-k-k-md-attributes-data-q06` | K/fill-in | `["circles"]` | 班級圖表有 5 個圓形和 4 個正方形。哪一類比較多？ | 圓形 / 圆形 |
| `us-ca-math-k-k-md-attributes-data-q07` | K/short-answer | `["marker","the marker"]` | 蠟筆比鉛筆短… | 馬克筆 / 马克笔 |
| `us-ca-math-k-k-md-attributes-data-q10` | K/fill-in | `["circles"]` | 班級圖表有 4 個圓形和 3 個正方形。哪一類比較多？ | 圓形 / 圆形 |
| `us-ca-math-k-k-md-attributes-data-q11` | K/short-answer | `["marker","the marker"]` | 蠟筆比鉛筆短… | 馬克筆 / 马克笔 |
| `us-ca-math-k-k-g-shapes-position-q02` | K/fill-in | `["square"]` | 一個平面圖形有 4 條一樣長的邊和 4 個方角。這是什麼圖形？ | 正方形 |
| `us-ca-math-k-k-g-shapes-position-q04` | K/short-answer | `["circle"]` | 一個平面圖形完全是圓的… | 圓形 / 圆形 |
| `us-ca-math-k-k-g-shapes-position-q06` | K/fill-in | `["square"]` | …4 條一樣長的邊和 4 個方角… | 正方形 |
| `us-ca-math-k-k-g-shapes-position-q08` | K/short-answer | `["circle"]` | …完全是圓的… | 圓形 / 圆形 |
| `us-ca-math-k-k-g-shapes-position-q10` | K/fill-in | `["square"]` | …4 條一樣長的邊和 4 個方角… | 正方形 |
| `us-ca-math-k-k-g-shapes-position-q12` | K/short-answer | `["circle"]` | …完全是圓的… | 圓形 / 圆形 |
| `us-ca-math-p1-1-g-shape-reasoning-q02` | P1/fill-in | `["triangle"]` | …3 條直邊和 3 個角… | 三角形 |
| `us-ca-math-p1-1-g-shape-reasoning-q04` | P1/short-answer | `["rectangle"]` | …4 個方角，兩條長邊和兩條短邊… | 長方形 / 长方形 |
| `us-ca-math-p1-1-g-shape-reasoning-q08` | P1/short-answer | `["circle"]` | …完全是圓的… | 圓形 / 圆形 |
| `us-ca-math-p1-1-g-shape-reasoning-q10` | P1/fill-in | `["hexagon"]` | 一個平面圖形有 6 條直邊。這是什麼圖形？ | 六邊形 / 六边形 |
| `us-ca-math-p3-3-g-categories-q06` | P3/fill-in | `["pentagon"]` | 一個多邊形正好有 5 條直邊… | 五邊形 / 五边形 |
| `us-ca-math-p3-3-g-categories-q12` | P3/short-answer | `["triangle"]` | 一個多邊形正好有 3 條直邊… | 三角形 |
| `us-ca-math-p4-4-g-lines-shapes-q04` | P4/short-answer | `["parallel","parallel lines"]` | 平面上兩條直線永不相交…叫做什麼？ | 平行線 / 平行线 |
| `us-ca-math-p4-4-g-lines-shapes-q06` | P4/fill-in | `["right angle","right"]` | 一個角形成方角，正好是 90 度… | 直角 |
| `us-ca-math-p4-4-g-lines-shapes-q10` | P4/fill-in | `["acute angle","acute"]` | 一個角比直角小（小於 90 度）… | 銳角 / 锐角 |
| `us-ca-math-p4-4-g-lines-shapes-q12` | P4/short-answer | `["parallel","parallel lines"]` | 平面上兩條直線永不相交… | 平行線 / 平行线 |

Suggested fix (two options): (a) append the Traditional and Simplified forms to
`acceptedAnswers` for these 22 items; or (b) structural — teach `questionAnswerMatches` to
consult a localized answer-key field for non-MC types. (a) is the minimal safe change.
Note the 130+ other free-response items whose key is English-worded are *not* affected,
because their primary `answer` is numeric (`"9"`, `"12 mph"`) and a digit answer matches.

### P1-1 — 12 items tell Grade 1/2 students they are doing kindergarten work

| field | value |
|---|---|
| items | 12 (P1 ×6, P2 ×6) |
| pack | A |
| field | `prompt.zh`, `prompt.zhHans` |
| severity | **P1** |
| class | semantic drift / incorrect content |

The English prefix `"Shape Reasoning checkpoint:"` / `"Partition Shapes checkpoint:"` is
replaced in Chinese by a generic grade+domain label, and the grade in the label is wrong:

| id (prefix `us-ca-k5-knowledge-point-practice-v1-`) | `grade` | zh prefix | correct prefix |
|---|---|---|---|
| `us-ca-math-p1-1-g-shape-reasoning-q02/q03/q04/q08/q09/q10` | **P1** | 幼兒園幾何練習 | 一年級幾何練習 |
| `us-ca-math-p2-2-g-partition-shapes-q01/q02/q06/q07/q08/q12` | **P2** | 幼兒園幾何練習 | 二年級幾何練習 |

Evidence: `us-ca-math-p2-2-g-partition-shapes-q01`, `"grade": "P2"`,
`prompt.zh = "幼兒園幾何練習：一個整體被平均分成 2 等份。每一份叫做什麼？"`,
`prompt.zhHans = "幼儿园几何练习：…"`, `prompt.en = "Partition Shapes checkpoint: …"`.
The other 480 pack-A items label the grade correctly (`一年級`…`五年級`), so this is a
localised generator bug, not the design.

### P1-2 — 37 pack-A items: `zhHans` carries an instruction clause that `zh` and `en` do not

| field | value |
|---|---|
| items | 37 |
| pack | A |
| field | `prompt.zhHans` |
| severity | **P1** |
| class | zh/zhHans divergence — different instructions per locale |

`zhHans` inserts `在教室垫上，选出最合适的答案：` ("on the classroom mat, choose the most
suitable answer:") which is absent from both `zh` and `en`, and which is wrong for
`fill-in`/`short-answer` items where there is nothing to choose from.

Evidence:

```json
{ "id": "…us-ca-math-k-k-nbt-teen-numbers-q03",
  "prompt": {
    "en":     "Teen Numbers checkpoint: Which model shows 15?",
    "zh":     "幼兒園十進位數練習：哪個模型表示 15？",
    "zhHans": "幼儿园十进位数练习：在教室垫上，选出最合适的答案：哪个模型表示 15？" } }

{ "id": "…us-ca-math-p1-1-nbt-place-value-q03",
  "prompt": {
    "en":     "Place Value checkpoint: What number has 4 tens and 3 ones?",
    "zh":     "一年級十進位數練習：由4 個十和 3 個一組成的數是多少？",
    "zhHans": "一年级十进位数练习：在教室垫上，选出最合适的答案：由4 个十和 3 个一组成的数是多少？" } }

{ "id": "…us-ca-math-k-k-md-attributes-data-q03",
  "prompt": {
    "en":     "Attributes Data checkpoint: A crayon is shorter than a pencil…",
    "zh":     "幼兒園測量與資料練習：蠟筆比鉛筆短，鉛筆比馬克筆短。哪一件物件最長？",
    "zhHans": "幼儿园测量与数据练习：在教室垫上，选出最合适的答案：蜡笔比铅笔短，铅笔比马克笔短。哪一件物件最长？" } }
```

Fix: delete the inserted clause from all 37 `zhHans` prompts (`zh` is the correct baseline).
All 37 are pack A; packs B and C show 0 zh/zhHans divergence.

### P1-3 — 12 English distractors inside otherwise-Chinese questions (pack C)

| field | value |
|---|---|
| items | 6 (12 option fields) |
| pack | C, chapter `s5-c04` (Grade 12 / statistics) |
| field | `options[i].zh`, `options[i].zhHans` |
| severity | **P1** (not P0 — none of them is the correct answer, so grading is unaffected) |
| class | missing translation |

```json
{ "id": "us-ca-g6-g12-v2-s5-c04-q05", "grade": "S5", "type": "multiple-choice",
  "prompt": { "en": "Model f has a sum of squared residuals of 28, and model g has 36. Which model fits the data better?",
              "zh": "模型 f 的殘差平方和為 28，模型 g 的殘差平方和為 36。哪個模型擬合得更好？",
              "zhHans": "模型 f 的残差平方和为 28，模型 g 的残差平方和为 36。哪个模型拟合得更好？" },
  "options": [ { "en": "both fit equally well", "zh": "both fit equally well", "zhHans": "both fit equally well" },
               { "en": "g", "zh": "g", "zhHans": "g" },
               { "en": "f", "zh": "f", "zhHans": "f" },
               { "en": "cannot be determined", "zh": "cannot be determined", "zhHans": "cannot be determined" } ],
  "answer": "f" }
```

Affected ids: `us-ca-g6-g12-v2-s5-c04-q05, -q08, -q11, -q17, -q23, -q32`.
Fix: `both fit equally well` → `兩者擬合程度相同` / `两者拟合程度相同`;
`cannot be determined` → `無法確定` / `无法确定`.

### P1-4 — Pack A metadata says it is not live; it is live

| field | value |
|---|---|
| pack | A |
| severity | **P1** (governance / provenance, no direct student impact) |

`question-pack.json` header states `"integrationStatus": "candidate-only-not-live"`,
`"packageStatus": "candidate-only"`,
`"intendedReleaseSurface": "Candidate practice bank only; no live integration in this dialogue"`,
`"excludedScope": ["live data/usCaliforniaQuestions.ts imports", …]`.
But `data/usCaliforniaTopics.ts:172-186` sets `knowledgePointPracticeLive: true` and
`livePracticePackageId: "us-ca-k5-knowledge-point-practice-v1"`, so all 492 items are in
`generatedCaliforniaQuestions`. The pack's own guard rails were bypassed; the localization
defects above (P0-2, P1-1, P1-2) reached students partly because the pack was promoted with
its `candidate-only` QA status intact. Fix: reconcile the header with reality and re-run
whatever review the promotion skipped.

### P2 findings

**P2-1 — `"… checkpoint:"` generator label on all 492 English prompts (pack A).**
`prompt.en` begins `Count Sequence checkpoint:`, `1-H.1 Picture Join Stories to Ten
checkpoint:`, etc. The sanitizer has no rule for it. The Chinese sides replace it with a
generic `<grade><domain>練習：` label, so the knowledge-point identity (`1-H.1`,
`Cube-Train Join Models to Ten`) is visible to English readers and lost to Chinese readers.
Fix: either strip `^.*? checkpoint:\s*` in `sanitizeStudentText`, or translate
`knowledgePointTitle` properly.

**P2-2 — Topic labels shown to Chinese readers are English.**
`data/usCaliforniaTopics.ts:257-258` returns `localized(question.knowledgePointTitle)` /
`localized(question.sourceLessonTitle)`, and `localized(en)` defaults `zh = zhHans = en`.
Those source fields are plain `string` (English) in packs A and B — see the type dumps —
so the topic chrome around every CA question renders in English regardless of locale.

**P2-3 — Terminology inconsistencies.** Table in §3.

**P2-4 — Pack C explanations drop the data set (20 items, chapter `p6-c05`).**
`us-ca-g6-g12-v2-p6-c05-q02`: en `Mean = (19, 21, 27, 29) sum 96 ÷ 4 = 24.` →
zh `平均數 = 總和 96 ÷ 4 = 24。`. The Chinese worked solution no longer shows *which*
values were summed, so it is strictly less useful than the English. Same pattern in q03, q05,
q07, q09, q10, q11, q13 … — 20 items, all in chapter `p6-c05`.

**P2-5 — Pack C drops "scale factor of N" from ~17 similar-triangle prompts.**
`us-ca-g6-g12-v2-s4-c02-q03/q08/q09/q10/…`: en gives both the scale factor and the matched
side; zh gives only the matched side. Still solvable, but the Chinese item is a slightly
harder question than the English one.

**P2-6 — ASCII `x` used as the multiplication sign in pack A Chinese text (56 items; 0 in B, 0 in C).**
`用相等組：5 x 7 = 35。`, `周界 = 2 x（長 + 寬）`. Chinese math typography requires `×`
(pack C already uses `×` throughout, e.g. `120 的 20% = 20/100 × 120 = 24。`).

**P2-7 — Half-width `,` inside Chinese lists (pack C, ~40 real cases).**
`求數據 46, 48, 50, 54, 67 的中位數。` should use `、`. (The other ~115 half-width hits are
coordinate pairs `(9, 6)` and are correct as-is.)

**P2-8 — `"比例圖"` for "scale drawing"** (`us-ca-g6-g12-v2-s1-c04-q25/q42`).
`比例圖` normally means a proportion/pie chart. The concept is 比例尺, so
`比例圖使用 1 厘米：2 米` should be `按比例尺 1 厘米：2 米 繪製的圖`.

---

## Part 3 — Terminology inconsistency table

Counts are field-level occurrences across all three packs. `zh` = Traditional, `zhHans` = Simplified.

| concept | variant A (n) | variant B (n) | where they collide | severity | recommendation |
|---|---|---|---|---|---|
| perimeter | `周界` zh ×6 | `周長` zh ×44 | A `…p3-3-md-time-data-area-perimeter-q04/q08/q12` vs C `…s1-c04-q01`+ | P2 | Standardise on **`周長`/`周长`**. `周界` is the HK EDB term and `scripts/audit-zh-hans.mjs` already lists `周界 → 周长` as a **critical** PRC violation — it just never sees these files. (zhHans is already `周长` everywhere, so only `zh` needs the change.) |
| coordinate | `座標` zh ×1 | `坐標` zh ×161 | A `…p5-5-g-coordinate-shapes-q03` (`在座標平面上`) vs everything else (`x 坐標是 9`) | P2 | Standardise on **`坐標`/`坐标`** (already the 99 % form). |
| data | `資料` zh ×78 (pack A) | `數據` zh ×171 (pack C) | A `…k-k-md-attributes-data-q01` `幼兒園測量與資料練習` vs C `…p6-c05-q16` `求數據 46, 48, …` | P2 | Pick one per track. Note zhHans is already split `数据` ×243 / `资料` ×6 — the 6 `资料` are Mainland-register errors, see next row. |
| "not enough information" | `資料不足` zh / `资料不足` zhHans ×6 | — | A `…p4-4-oa-factors-patterns-q01/q03/q09`, `…p5-5-oa-expressions-patterns-q01/q03/q09` | P2 | zhHans `资料不足` reads as "insufficient documents" in PRC usage → **`信息不足`**. zh → `資料不足` is acceptable but `資訊不足` is clearer. |
| number line | `數線` zh ×65 | `数线` zhHans ×65 | A `…p3-3-nf-fraction-meaning-q01`, C `…p6-c02-q26` | P2 | `數線` is correct Traditional. **`数线` is not standard PRC — should be `数轴`** (0 occurrences of `数轴` anywhere in the CA packs). |
| place value / base ten | `十進位` zh ×72 | `十进位` zhHans ×72 | A `…k-k-nbt-teen-numbers-q01`+, all NBT items | P2 | `十進位` OK for Traditional. PRC standard is **`十进制`**; the repo's own banned list also maps `位值 → 数位`. |
| equal groups | `相等組` zh ×35 | `相等组` zhHans ×35 | A `…p2-2-oa-fluency-arrays-q01`, `…p3-3-oa-mult-div-q01`, `…p4-4-nbt-multi-digit-q01` | P2 | Calque of "equal groups". Prefer **`每組數量相同`** / **`每组数量相同`**, or `等組`. |
| square corner | `方角` ×18 (both variants) | `直角` ×115 (both variants) | A `…k-k-g-shapes-position-q02/q06/q10`, `…p4-4-g-lines-shapes-q06` (`一個角形成方角，正好是 90 度`) | P2 | **`方角` is not a Chinese math term.** Use `直角`, which the same pack already uses 115 times — including in the *explanation* of the very items whose prompt says `方角`. |
| cubes (manipulative) | `立方塊` zh ×42 / `立方块` zhHans ×42 | — | A `…k-k-cc-count-sequence-q01`, `…p1-1-h3-…-q05` | P2 | For a K-2 manipulative prefer `積木`/`小方塊` (zh) and `小正方体`/`方块` (zhHans); `立方塊/立方块` reads as the solid figure. |
| objects | `物件` ×27 (both variants) | — | A `…k-k-cc-count-sequence-q01` (`墊上有多少個物件？`) | P2 | zhHans `物件` reads as a software object in PRC usage → **`物品`**. zh `物件` is acceptable. |
| number-line jumps | `跳距` ×3 (both variants) | — | A `…p3-3-nf-fraction-meaning-q01` | P2 | Non-standard. Use `等分`/`間隔` (zh), `等分`/`间隔` (zhHans). |
| mean | `平均數` zh ×114 | `平均值` zh ×28 | C `…p6-c05-q02` (`平均數`) vs C `…s3-c01-q01` (`中間的數等於平均值`) | P2 | Both correct; unify on **`平均數`/`平均数`** for the statistic and reserve `平均值` for "the average value of". Low priority. |
| expression | `算式` ×36 (pack A, K-5) | `代數式` ×25 (pack C, G6+) | A `…p1-1-h1-…-q04`, C `…p6-c03-q01` | — | **Not a defect** — correct grade-appropriate register split. Listed so it is not re-flagged. |
| opposite side / hypotenuse | `對邊` ×50 | `斜邊` ×26 | C `…s4-c02-q01` (`∠A 的對邊`) vs C `…s2-c04-q08` (`斜邊長`) | — | **Not a defect** — different concepts, both correct. |

Terms verified **correct and consistent** (no action): 分數/分数, 小數/小数, 面積/面积,
體積/体积, 百分比, 中位數/中位数, 概率, 斜率, 頂點/顶点, 判別式/判别式, 標準差/标准差,
條件概率/条件概率, 樣本比例/样本比例, 殘差/残差, 拋物線/抛物线, 四邊形/四边形,
銳角/锐角, 鈍角/钝角, 因數/因数, 分母, 分子, 厘米, 平方米, 立方厘米, 相似比,
負倒數/负倒数, 最簡分數/最简分数, 弧長/弧长, 圓心角/圆心角, 平移, 絕對值/绝对值.
No Mainland-only term was found in `zh`, and no HK/TW-only term in `zhHans`, other than the
`周界` and `資料/资料` rows above.

---

## Part 4 — What this audit did NOT cover

* **Pedagogical/mathematical correctness of the English source.** Out of scope. Two source-side
  oddities noticed in passing and *not* pursued: pack C `…s1-c02-q09` explanation reads
  `1/3 × 1/3 = 1/9 = 1/9.` in all three locales (duplicated term, en bug); pack B
  `…scaled-graphs-q01` uses a literal 📕 emoji as a pictograph key.
* **Rendered UI.** No browser/Playwright pass — line-breaking, font fallback for Traditional
  glyphs, RTL of `／` full-width slashes, and whether `\n` in explanations renders were not
  checked. `data/usCaliforniaPracticeFigures.ts` diagram labels were not audited at all.
* **Lesson bodies.** `us-ca-math-k-g5-textbooks-v1/lessons.json` and the micro-lesson specs are
  typed `studentLesson: { en: { … } }` — English-only by construction — and were not audited
  beyond noting the type.
* **The retired K-G5 DeepSeek pack** (`us-ca-math-k-g5-generated-bank-v3-deepseek-1500`,
  `practiceLive:false`) was inspected only to confirm the sanitizer's provenance
  (1500/1500 prompts carry `Activity N: DeepSeek practice:`). It is not live; if it is ever
  promoted, those artifacts *are* stripped from `prompt` but would remain in `explanation`.
* **Non-CA tracks** (HK, mainland, AR, FL, TX) — untouched.
* **`independentSolution`** — a plain `string` (English) on every item; it flows into
  `usCaliforniaQuestionGenerationMetadata`, not into the student `Question`, so it was scored
  as non-student-facing. If any surface renders it, add it to the localization scope.
* **Tone/age-appropriateness rating** beyond the terminology table; no native-speaker panel.
* Automated Traditional/Simplified detection uses a ~1 500-pair table, not a full OpenCC
  dictionary. It found 0 leaks, cross-checked with an independent hand-picked
  unambiguous character set (also 0). A rare character outside both tables could still slip
  through, though the 0/0 agreement makes that unlikely.

---

## Appendix — reproduction

Scripts used (scratchpad only, nothing written into the repo):
`lib.mjs` (pack loader + Trad/Simp tables + number extractor + sanitizer port),
`answerMatching.mjs` (`lib/server/answerMatching.ts` transpiled verbatim via the repo's
`typescript` so grading is simulated with the real code, not a re-implementation),
`audit.mjs` (class scanner → `findings.json`), `sample.mjs` (stratified hand-read sampler).
