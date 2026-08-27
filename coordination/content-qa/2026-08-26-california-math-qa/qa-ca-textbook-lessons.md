# California LESSON / TEXTBOOK surface — content QA audit

Repo: `/Volumes/Starship/MAIS-MVP` (branch `codex/edulab-mais`, read-only audit, 2026-08-26)
Auditor scope: the CA lesson/textbook surface only (not the practice question banks).

Coverage: **44 / 44 lessons fully read and independently verified** —
29 in `data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json`
15 in `data/generated-content/us-ca-math-middle-school-textbooks-v2/live-lessons.json`
Every `workedExample`, `guidedPractice`, `checkpoint`, `answerKey`, `validation.deterministicChecks`
entry was recomputed by hand. Plus **35 / 35 chapters** of
`data/generated-content/us-ca-math-textbooks-v1/textbook-pack.json` (§7c) and the
**12 Grade-1 micro-lessons** in `data/usCaliforniaMicroLessons.ts` (§7b) that ship on the
same surface.

---

## 0. Headline

* **Pure arithmetic is in good shape.** Across the 44 lessons every worked-example numeric
  result, every guided-practice result, and every checkpoint result is arithmetically correct.
  There are **zero wrong final answers**.
* **One P0 remains**: a live Grade 7 lesson states a false comparison rule as its reasoning,
  rendered twice on the production page.
* The real damage is structural: **the K–G5 pack's entire teaching body is dead code in the
  product**, **28 / 29 guided-practice items are verbatim copies of the worked example**,
  **6 / 29 `deterministicChecks` validate a different problem than the lesson contains while
  reporting `status: "pass"`**, and **all 81 middle-school CCSS codes are non-canonical and
  resolve to nothing in `data/ccss`**.

### Severity counts

| Severity | Packs 1+2 (the 44 lessons) | Pack 3 (35 chapters) | Total |
|---|---|---|---|
| **P0** | **1** | 0 | **1** |
| **P1** | **17** | **8** | **25** |
| **P2** | **13** | **9** | **22** |
| | 31 | 17 | **48** distinct findings |

Wrong final answers: **0 / 44 lessons** and **0 / 305 pack-3 numeric items**. Apart from the
single P0 explanation, every defect is in the *structure*, the *routing*, the *standards
metadata*, or the *status claims* — not in the numbers. Many findings are systemic and
apply to every lesson in a pack; the counts above are defect *classes*, not instances.

---

## 1. Live vs candidate vs dormant — the three packs

| Pack | File | Self-declared status | Actually served? | Evidence |
|---|---|---|---|---|
| **K–G5 textbooks v1** (29 lessons) | `data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json` | `packageStatus: "approved-for-review"`, `reviewStatus: "generator-validation-complete-s18-human-sampling-required"`, `integrationStatus: "candidate-only"`, `nextOwner: "S18 curriculum QA"` | **PARTIALLY LIVE.** Topics + goals + guided practice + pitfalls + exit ticket render. `launch`, `conceptExplanation`, `workedExample` and the whole `answerKey` **never render.** | `data/usCaliforniaTopics.ts:172` `californiaK5LiveContentStatus.textbookLive: true`; `data/usCaliforniaLessons.ts:796` `californiaK5TextbookLessonSeeds`; `toTextbookLessonSeed` hard-codes `productionReady: true`; `data/lessons.ts:2176` folds them into `productionLessonSeeds` |
| **Middle-school textbooks v2** (15 lessons) | `data/generated-content/us-ca-math-middle-school-textbooks-v2/live-lessons.json` | `packageStatus: "approved-for-production"`, `integrationStatus: "integrated-into-california-middle-school-textbook-route"`, `livePromotion.promotedAt: "2026-06-19T11:05:00.000Z"` | **FULLY LIVE**, all 15, every field rendered. | `components/lesson/CaliforniaMiddleSchoolReplacementTextbookPage.tsx:4`; mounted at `app/lesson/california-middle-school-textbook/page.tsx` and `app/student/lessons/california-middle-school-textbook/page.tsx` |
| **Textbooks v1** (7 books x 5 chapters) | `data/generated-content/us-ca-math-textbooks-v1/textbook-pack.json` | `releaseStatus: "generated-review-package"`, `integrationStatus: "not-integrated-into-live-lessons"` | **REVIEW-ONLY BUT REACHABLE.** Rendered at `/lesson/california-middle-school-textbook/review` (`robots: index:false, follow:false`, `surface="review"`). The route file does **not** call `requireLessonAuthentication`, but `middleware.ts` `protectedPaths` includes `"/lesson"`, so any signed-in user (including a student) who types the URL sees all 7 books. | `components/lesson/CaliforniaMiddleSchoolTextbookPage.tsx:4`; `app/lesson/california-middle-school-textbook/review/page.tsx`; `middleware.ts:16,53` |

---

## 2. P0 — false math taught to students

### P0-1 · `us-ca-math-middle-school-textbooks-v2-s1-7-ns-rational-operations` · Grade 7 · false stated rule

Exact strings, from `studentLesson.en.guidedPractice[0]` and `studentLesson.en.checkpointExplanations[0]`
and `answerKey.checkpoints[0].solutionSteps[0]`:

> prompt: `"Compute -2.5 + 6.75."`
> answer: `"4.25"`
> explanation: `"The positive amount is 4.25 greater than the negative amount."`

**Why it is wrong.** The answer 4.25 is correct. The *explanation* is not.
"The negative amount" is −2.5. The positive amount 6.75 is **9.25** greater than −2.5,
not 4.25. The number 4.25 is 6.75 minus the *absolute value* 2.5.

There is a charitable reading — "greater than the [size of the] negative amount" — under
which 6.75 − 2.5 = 4.25 is true. But the sentence as written silently swaps −2.5 for |−2.5|,
which is precisely the conflation that produces the `"subtracting negatives"` misconception
this same lesson lists in its own `commonPitfalls`, in a lesson whose `conceptExplanation`
insists `"The sign tells direction, the absolute value tells distance"`. A Grade 7 reader
taking it at face value learns that 6.75 − (−2.5) = 4.25. Rated P0 because it is a false
mathematical statement rendered to students on a production page; downgrade to P1 only if
the owner reads the sentence charitably.

**Blast radius.** Rendered **twice** on the live page: once as the Guided-practice
"Reasoning:" line and again in the right-hand Checkpoint panel
(`CaliforniaMiddleSchoolReplacementTextbookPage.tsx`, `ProblemBlock` renders
`problem.explanation`; the aside renders `studentSafeText(content.checkpointExplanations[0])`).

**Status-honesty aggravator.** This lesson carries
`reviewStatus: "s18-full-scope-qa-approved"`, `review.mathQaStatus: "passed-deterministic-checks"`,
`approval.status: "approved-for-production"`, and `validation.unresolvedRisks: []`.
The `deterministicChecks` entry for this checkpoint is
`{"check":"checkpoint-answer","status":"pass","answer":"4.25"}` — it only compares the
final answer string and never reads the explanation, so a false rule sails through
"full-scope QA approved".

**Suggested fix.** Replace with: `"Start at -2.5 and move 6.75 to the right. 6.75 - 2.5 = 4.25, so the sum is 4.25."`
Apply the same wording to `checkpointExplanations[0]` and `answerKey.checkpoints[0].solutionSteps[0]`.

---

## 3. P1 findings

### P1-1 · ALL 29 K–G5 lessons · the entire teaching body is unreachable (dead content)

`data/usCaliforniaLessons.ts:587-612`:

```
function textbookCoreBlocks(lesson) {
  const topicId = lesson.metadata.topicId;
  if (hasCcssLessonAssignment(topicId)) {
    return ccssInteractiveLessonBlocks(topicId);   // <-- always taken
  }
  ... concept block ... worked-example block ...   // <-- dead
}
```

`data/ccssLessonAssignments.ts` header comment: `"Join result (2026-07-19): 64 topics covered (29 K–G5 textbook + 35 G6–G12 chapter topics)"`.
I verified this by set intersection: **29 / 29** K–G5 topic ids are keys in `ccssLessonAssignments`,
**0** fall through. So the `if` branch is taken for every lesson and the `else` is never executed.

**Consequence:** for all 29 lessons, `studentLesson.en.launch`, `studentLesson.en.conceptExplanation`,
`studentLesson.en.workedExample` (prompt + answer + reasoning) and the whole
`answerKey` object are **never rendered anywhere in the product**. The `teacher-guide`
standards block is likewise swapped for `ccssTeacherGuideBlock`, so the templated
`"...links the separate live California Math Practice Beta bank without using the downlisted K-5 practice package"`
string is also dead.

What *does* render (`data/usCaliforniaLessons.ts:760-786`): the topic title/minutes/standards,
the ported CCSS interactive lesson core, a "Guided practice" checklist built from
`learningGoals` + `guidedPractice[].prompt` + `expectedMove`, and a "Mistake repair"
extension built from `independentPractice` + `commonPitfalls` + `exitTicket`.

**Why it matters:** every "worked-example correctness" claim, every `answerKey` entry, and
every `deterministicChecks` result for this pack is about content no student can see —
while the *questions* from that content are still shown to students with no answer.

**Suggested fix.** Either (a) delete the dead fields from `lessons.json` and stop calling
this a textbook pack, or (b) render the concept/worked example *alongside* the CCSS core,
or (c) stop pulling guided-practice prompts out of a body that isn't rendered.

### P1-2 · ALL 29 K–G5 lessons · guided-practice question with no answer anywhere in the product

The guided-practice block renders `` `${item.prompt} Expected move: ${item.expectedMove}` ``
and nothing else. The corresponding answer lives in `answerKey.workedExample`, which
per P1-1 is never rendered. `expectedMove` has only **2 distinct values across all 29 lessons**:

> `"Name the quantities, choose a representation, solve, and check the units or labels."` (28 lessons)
> `"Match the counters one by one, name the group with unmatched counters, and count the extras."` (1 lesson)

A K–G5 student is therefore asked e.g. `"Find 246 + 130."` and given a generic hint,
with no answer and no worked example on the page.

**Suggested fix.** Surface `answerKey.workedExample.answer` / `solutionSteps` in the block,
or move guided practice into the CCSS interactive lesson that actually renders.

### P1-3 · 28 / 29 K–G5 lessons · guided practice is a verbatim copy of the worked example

Measured programmatically (normalising the `Explain what…` prefix): **28 of 29** guided-practice
prompts are the same question as the worked example. Only
`us-ca-k-g5-tx-v1-k-k-cc-cardinality-compare` differs (WE: `"There are 6 blue counters and 2 green counters…"`,
GP: `"There are 5 red counters and 3 yellow counters…"`).

Examples:
* `us-ca-k-g5-tx-v1-p3-3-nbt-arithmetic` — WE `"Find 246 + 130."` / GP `"Find 246 + 130."`
* `us-ca-k-g5-tx-v1-p4-4-nbt-multi-digit` — WE `"Multiply 34 x 7."` / GP `"Multiply 34 x 7."`
* `us-ca-k-g5-tx-v1-p4-4-g-lines-shapes` — WE `"How many lines of symmetry does a square have?"` / GP same

There is no gradual release; the "practice" is a recall of the sentence just read.

**Suggested fix.** Author one new number-set per lesson for guided practice.

### P1-4 · 15 / 15 middle-school lessons · the checkpoint is the guided-practice question, with the answer displayed directly above it

`checkpointPrompts[0] === guidedPractice[0].prompt` in **15 of 15** lessons. Because the
page renders Guided practice with `Answer:` and `Reasoning:` in the main column and then the
Checkpoint in the right-hand aside, the assessment item's answer is already on screen.

Example (`…-s2-8-g-transformations-pythagorean-volume`):
guided practice `"A right triangle has legs 5 and 12. Find the hypotenuse."` → `Answer: 13`,
checkpoint `"A right triangle has legs 5 and 12. Find the hypotenuse."` → `Answer: 13`.

**Suggested fix.** Author a distinct checkpoint item per lesson.

### P1-5 · 6 / 29 K–G5 lessons · `validation.deterministicChecks` reports `"pass"` for a problem the lesson does not contain

`review.mathQaStatus` is `"passed-deterministic-check"` and `validation.unresolvedRisks` is `[]`
in all 29. In 6 of them the check's own `answer` disagrees with `studentLesson.en.workedExample.answer`,
proving the check never looked at the lesson:

| Lesson id | check as stored | actual worked-example answer |
|---|---|---|
| `us-ca-k-g5-tx-v1-k-k-cc-count-sequence` | `{"kind":"sum","values":{"left":4,"right":2},"answer":"6","status":"pass"}` | `"7"` |
| `us-ca-k-g5-tx-v1-k-k-cc-cardinality-compare` | `{"kind":"sum","values":{"left":6,"right":2},"answer":"8","status":"pass"}` | `"The blue group has 4 more counters."` (a *difference*, not a sum) |
| `us-ca-k-g5-tx-v1-p3-3-nbt-arithmetic` | `{"kind":"place-value","values":{"hundreds":2,"tens":4,"ones":6},"answer":"246","status":"pass"}` | `"376"` (the check validates an *addend*, not the sum) |
| `us-ca-k-g5-tx-v1-p3-3-g-categories` | `{"kind":"shape-name","values":{"sides":5,"answer":"pentagon"},"answer":"pentagon","status":"pass"}` | `"1/4"` — "pentagon" appears nowhere in the lesson |
| `us-ca-k-g5-tx-v1-p4-4-nbt-multi-digit` | `{"kind":"place-value","values":{"hundreds":3,"tens":4,"ones":7},"answer":"347","status":"pass"}` | `"238"` (34 x 7) |
| `us-ca-k-g5-tx-v1-p4-4-g-lines-shapes` | `{"kind":"shape-name","values":{"sides":6,"answer":"hexagon"},"answer":"hexagon","status":"pass"}` | `"4"` (lines of symmetry) — "hexagon" appears nowhere |

**Suggested fix.** Regenerate `deterministicChecks` from the lesson content, and add a
contract test asserting `deterministicChecks[i].answer === studentLesson.en.workedExample.answer`.

### P1-6 · 3 middle-school lessons · `deterministicChecks[].kind` mislabels the mathematics

| Lesson id | stored `kind` | what the lesson actually does |
|---|---|---|
| `…-p6-6-ee-expressions-equations` | `"one-step-equation"` | `12 + 4s = 40` — a **two-step** equation |
| `…-s2-8-sp-bivariate-data` | `"two-way-table"` | `18 robotics / 12 art / 10 music` — a **one-way** frequency table, single categorical variable |
| `…-p6-6-ns-rational-numbers` | `"distance-on-number-line"` | correct label, but the solution shown is `2 - (-3.5)` (see P1-9) |

### P1-7 · ALL 81 middle-school CCSS codes are non-canonical and resolve to nothing

Every `metadata.standardIds` entry in the 15 live middle-school lessons omits the cluster
letter: `"6.RP.1"`, `"6.NS.5"`, `"7.SP.8"`, `"8.EE.7"`, `"8.G.9"` …
The authoritative registry `data/ccss/grades-68.ts` stores `"6.RP.A.1"`, `"6.NS.C.5"`,
`"7.SP.C.8"`, `"8.EE.C.7"`, `"8.G.C.9"`. I resolved all 81 against the 395 ids in
`data/ccss/*.ts`: **81 / 81 miss.** (The K–G5 pack is clean: 148 / 148 resolve.)

These codes are rendered verbatim as badges to the reader via
`StandardsList` in `CaliforniaMiddleSchoolReplacementTextbookPage.tsx`, so a teacher
sees CCSS identifiers that do not exist in California CCSS-M form, and
`findStandard(id)` would return `null` for every one of them.

**Suggested fix.** Insert the cluster letters; add a contract test that every
`standardIds` entry resolves via `findStandard`.

### P1-8 · Systemic standards over-claim: whole clusters/domains claimed, one worked example delivered

Every lesson in both packs has exactly **1** worked example and **1** guided-practice item
but claims on average **5.1** (K–G5, 148 total) and **5.4** (middle school, 81 total) standards.
Worst offenders:

| Lesson id | claims | actually exercised by the one example |
|---|---|---|
| `us-ca-math-p2-2-md-measure-data-money-time` | 10 standards `2.MD.A.1 … 2.MD.D.10` (estimate length, number-line measurement, **tell time**, **count money**, **line plots**, **bar graphs**) | only `14 - 8 = 6`, a length difference. Time, money and data are never exercised. |
| `us-ca-math-p2-2-nbt-three-digit-place-value` | 9 standards incl. `2.NBT.B.5–B.9` (add/subtract within 100 and 1000, explain why strategies work) | only `"A number has 2 hundreds, 3 tens, and 6 ones."` → `236` (`2.NBT.A.1` alone) |
| `us-ca-math-p3-3-oa-mult-div` | 9 standards incl. `3.OA.C.7` fluency and `3.OA.D.8` two-step problems | only `5 x 4 = 20` |
| `us-ca-math-p3-3-md-time-data-area-perimeter` | 8 standards incl. elapsed time, mass/volume, scaled graphs, line plots, perimeter | only rectangle area `12 x 3 = 36` |
| `us-ca-math-p4-4-nf-fraction-decimal` | 7 standards incl. `4.NF.C.5/6/7` **decimal notation** | only `2/6 + 2/6 = 4/6`. The lesson is titled `"Fraction Decimal"` and contains no decimal. |
| `us-ca-math-p1-1-md-measure-data` | `1.MD.B.3` (tell time to hour/half-hour), `1.MD.C.4` (organise/interpret data) | only `13 - 8 = 5` |
| `…-p6-6-ee-expressions-equations` | 9 standards `6.EE.1–9` | one two-step equation |
| `…-s2-8-g-transformations-pythagorean-volume` | 9 standards `8.G.1–9` (transformations, congruence, similarity, angle relationships, cones/cylinders/spheres) | one Pythagorean triple `9-12-15` |
| `…-s1-7-sp-inference-probability` | 8 standards `7.SP.1–8` (sampling, inference, comparing populations) | one compound-probability product `3/8 x 1/2` |

**Suggested fix.** Reduce each lesson's `standardIds` to what it actually develops, or add
the missing examples.

### P1-9 · `…-p6-6-ns-rational-numbers` · Grade 6 lesson teaches with a Grade 7 method

> WE: `"A diver starts at -3.5 meters relative to sea level and rises to 2 meters. How far does the diver move?"`
> reasoning: `"The distance is 2 - (-3.5) = 5.5 meters."`
> GP: `"Find the distance between -6 and 1.5 on a number line."` → `"The distance is 1.5 - (-6) = 7.5 units."`

Both answers are correct. But **subtracting a negative rational number is `7.NS.A.1c`**, a
Grade 7 standard. Grade 6 (`6.NS.C.5–8`) covers *understanding* signed numbers, ordering,
absolute value, and coordinate-plane distance — not signed subtraction. The lesson's own
declared representation is `"vertical number line"`, and the grade-appropriate method is
`|-3.5| + |2| = 3.5 + 2 = 5.5`. The lesson introduces a method before its prerequisite.

**Suggested fix.** Rewrite both explanations as absolute-value / number-line hops.

### P1-10 · `…-p6-6-ee-expressions-equations` · Grade 6 lesson solves two-step equations

> WE: `"A tutoring club has a $12 setup fee and then charges $4 per session. The total is $40. How many sessions are included?"` → `"Let s be the number of sessions. 12 + 4s = 40, so 4s = 28 and s = 7."`
> GP/checkpoint: `"Solve 5 + 3x = 23."` → `"x = 6"`

Arithmetic correct. But `6.EE.B.7` is explicitly limited to `x + p = q` and `px = q`;
multi-step `px + q = r` is `7.EE.B.4a`. Both items in this Grade 6 lesson are two-step.
(The stored check even calls it `"one-step-equation"` — see P1-6.)

### P1-11 · `…-p6-6-g-area-volume` · Grade 6 lesson delivers a Grade 5 problem

> WE: `"A rectangular prism has length 8 cm, width 5 cm, and height 3 cm. What is its volume?"` → `120 cubic centimeters`

Whole-number prism volume is `5.MD.C.5`. The Grade 6 advance (`6.G.A.2`) is volume with
**fractional edge lengths**, which never appears. The guided practice `"A box is 6 cm by 4 cm by 5 cm"`
is also whole-number **and lands on the same answer, 120** — see P2-6.

### P1-12 · `…-s2-8-sp-bivariate-data` · the "bivariate data" lesson contains no bivariate data

> WE: `"In a survey, 18 students chose robotics, 12 chose art, and 10 chose music. What percent chose robotics?"` → `45%`
> GP: `"A club has 14 sixth graders and 21 seventh graders. What percent are sixth graders?"` → `40%`

Both correct. But both are **one-variable** percent-of-total problems (`6.RP.A.3c`, Grade 6).
`8.SP` is scatter plots, association, linear models, and **two-way** tables — which require
two categorical variables per subject. The concept text correctly describes scatter plots
and residuals, then the example exercises none of it. The `illustration`/representation label
is `"categorical data table"`, and the stored `kind` is `"two-way-table"`.

### P1-13 · `us-ca-k-g5-tx-v1-k-k-md-attributes-data` · Kindergarten lesson uses a Grade 1 measurement method

> WE: `"A pencil is 11 cubes long. An eraser is 8 cubes long. Which object is longer?"` → `"pencil"`

`K.MD.A.2` is **direct** comparison of two objects. Measuring by iterating a cube unit is
`1.MD.A.2`. The claimed `K.MD.B.3` (classify into categories, count, sort) is never touched.

### P1-14 · `us-ca-k-g5-tx-v1-k-k-g-shapes-position` · unanswerable prompt under `text-only-v1`

> WE prompt: `"Which shape has 3 straight sides?"`  answer: `"triangle"`

The prompt asks the student to *choose* a shape but supplies no options and no figure —
`illustration.visualPolicy` is `"text-only-v1"` with `plannedAssets: []`. As posed the item
is under-specified. (`…-p2-2-g-partition-shapes` has the same shape: `"Which shape name matches a polygon with 4 sides?"`.)

**Suggested fix.** `"A closed figure has 3 straight sides. What is its name?"`

### P1-15 · `us-ca-k-g5-tx-v1-p2-2-g-partition-shapes` · the worked example does not exercise the concept taught

`conceptExplanation` is entirely about partitioning into equal shares and tiling in rows and
columns (`"Partitioning means splitting one whole into equal shares. Halves, thirds, and fourths…"`).
The single worked example is `"Which shape name matches a polygon with 4 sides?"` → `quadrilateral`,
which exercises `2.G.A.1` only and leaves `2.G.A.2`/`2.G.A.3` — the actual subject of the lesson — with no example.

### P1-16 · The 15 live middle-school lessons have no in-product entry point

`app/lesson/california-middle-school-textbook/page.tsx` and
`app/student/lessons/california-middle-school-textbook/page.tsx` both mount the component,
but a repo-wide grep for the route string across `app/`, `components/`, `lib/`, `data/`
(excluding worktrees, tests, and coordination artefacts) returns **no `Link`/`href`/nav entry**.
The only non-route mention is `components/lesson/lessonAccessPolicy.test.ts` and a coordination
report registry. A student can only reach these 15 lessons by typing the URL.

By contrast the 29 K–G5 lessons *are* discoverable: they become `Topic`s via
`californiaK5TextbookTopics` (`data/usCaliforniaTopics.ts:426`), enter `usCaliforniaTopics`,
and enter `productionLessonByTopicId` via `liveProductionLessonSeeds` (`data/lessons.ts`),
so they resolve through `/student/lessons/[lessonSlug]`.

### P1-17 · Status-field honesty: a `candidate-only` pack is served as `productionReady: true`

See the mismatch table in §5. `lessons.json` states at pack level
`integrationStatus: "candidate-only"` and
`reviewStatus: "generator-validation-complete-s18-human-sampling-required"`,
and at lesson level `integrationStatus: "candidate-only"` /
`approval.status: "approved-for-review"` / `nextOwner: "S18 curriculum QA"`, for all 29.
`scope.intendedReleaseSurface` reads
`"candidate package for future California K-5 textbook/live lesson integration"`.
Meanwhile `data/usCaliforniaTopics.ts:172` sets `textbookLive: true` and
`toTextbookLessonSeed` sets `productionReady: true` unconditionally. Nothing in the code
reads the pack's own `integrationStatus`. Either the flag or the data is lying.

---

## 4. P2 findings

| # | Lesson(s) | Evidence | Why | Fix |
|---|---|---|---|---|
| P2-1 | all 29 K–G5 | `learningGoals[0]`: `"Use models and words to reason about connect number words, written numerals, and ordered counts from small sets toward 100."` | ungrammatical template splice (`"reason about"` + a verb phrase). 26 distinct variants, all broken the same way. **Rendered** in the Guided-practice checklist. | `"…to reason about how number words, written numerals, and ordered counts connect…"` |
| P2-2 | all 15 MS | `objectives[0]`: `"Represent use ratios, rates, percent, and equivalent relationships…"`, `"Represent compute with fractions/decimals…"`, `"Represent solve area, surface area, volume…"` — 15 / 15 | same splice (`"Represent "` + verb phrase). **Rendered** in the Objectives aside. | drop the stray `"Represent "` |
| P2-3 | 10 K–G5 | GP prompts: `"Explain what is the number?"`, `"Explain what is 5.4 + 1.2?"`, `"Explain what teen number is shown?"`, `"Explain what is its volume?"`, `"Explain what are the shares called?"`, `"Explain what ordered pair names point A?"`, `"Explain what fraction is shaded?"`, `"Explain what is their combined angle measure?"`, `"Explain what is its area?"`, `"Explain what is the number?"` | ungrammatical `Explain what is …?` splice; **rendered** verbatim in the Guided-practice checklist | `"Explain what the number is."` |
| P2-4 | `us-ca-k-g5-tx-v1-k-k-cc-count-sequence` | launch: `"Mia lines up six shells…"` and concept `"…6 means Mia stopped at six shells."` vs WE `"Mia counts a row of shells one at a time: 1, 2, 3, 4, 5, 6, 7."` | the story silently changes from 6 shells to 7 between the concept and the example | make the counts agree |
| P2-5 | `us-ca-k-g5-tx-v1-p5-5-nbt-decimals` | `validation.deterministicChecks[0].values.total: 6.6000000000000005` | raw IEEE-754 artefact shipped in the data file | round to 6.6 |
| P2-6 | `…-p6-6-g-area-volume`, `…-s2-8-ee-exponents-linear-systems` | WE and GP answers identical: `120 cubic centimeters` / `(3, 7)` | students can pattern-match the answer instead of solving | change one number set |
| P2-7 | all 29 K–G5 | `independentPractice` is the same two strings in **all 29**: `["Create one similar problem with different numbers or objects.","Swap with a partner and explain the checking step."]`; `commonPitfalls[].repairMove` has **1** distinct value across the whole pack (`"Return to the model, label each quantity, and compare the result with the question."`); `answerKey.guidedPractice` has **1** distinct value (`{"acceptedEvidence":["correct representation","correct computation","reasonableness check"]}`); `estimatedMinutes` is 35 for every lesson | pure template filler; the "repair move" gives no repair specific to the misconception it names | author per-misconception repair moves |
| P2-8 | all 15 MS | `commonPitfalls[].repairMove` has **1** distinct value; `teacherNotes` has **1** distinct value; `objectives[2]` has **1** distinct value; `independentPractice[0].explanation` has **1** distinct value | same template filler | as above |
| P2-9 | all 15 MS | `independentPractice[0].explanation` = `"S18/S05 review should sample student-facing examples before live integration."` | internal process text sitting in a student-facing field. **Mitigated at render**: `studentSafeText()` in `CaliforniaMiddleSchoolReplacementTextbookPage.tsx` swaps it for `"Check that your representation, computation, and final answer agree."`. The data is still wrong, and the scrubber is a regex that breaks if the string is reworded. | fix the data, keep the scrubber as belt-and-braces |
| P2-10 | all 15 MS | `studentLesson.en.launch` and `teacherNotes` are never rendered; `checkpointPrompts[1]`/`checkpointAnswers[1]`/`checkpointExplanations[1]` (`"Explain which representation made the structure of the problem easiest to see."`) are never rendered — the component only reads index `[0]` | orphan data | render or remove |
| P2-11 | K–G5 lesson description | `data/usCaliforniaLessons.ts` `toTextbookLessonSeed`: `` `${title} lesson from the S18-sampled text-only California K-5 textbook beta package, …` `` | internal session label `"S18-sampled"` in learner/parent-facing copy | reword |
| P2-12 | `…-p4-4-nf-fraction-decimal` | `answerKey.workedExample.acceptedAnswers: ["4/6"]` | a student answering `2/3` would be rejected. Harmless today because the key never renders (P1-1), but wrong if the pack is ever wired to grading | add `"2/3"` |

---

## 5. Status-honesty mismatch table

| Field | Stored claim | Reality found in this audit |
|---|---|---|
| **K–G5 pack** `packageStatus` | `"approved-for-review"` | served as production content (`productionReady: true`) |
| **K–G5 pack** `integrationStatus` | `"candidate-only"` (and per-lesson, all 29) | `californiaK5LiveContentStatus.textbookLive: true`; 29 topics + lesson seeds in `liveProductionLessonSeeds` — **P1-17** |
| **K–G5 pack** `reviewStatus` | `"generator-validation-complete-s18-human-sampling-required"` | human sampling still outstanding, yet live |
| **K–G5 pack** `scope.intendedReleaseSurface` | `"candidate package for future … integration"` | already integrated |
| **K–G5 lesson** `review.mathQaStatus` (x29) | `"passed-deterministic-check"` | false for 6 lessons whose check validates a different problem — **P1-5** |
| **K–G5 lesson** `validation.deterministicChecks[].status` (x6) | `"pass"` | the check never read the lesson (e.g. `"pentagon"` / `"hexagon"` for lessons about `1/4` and lines of symmetry) — **P1-5** |
| **K–G5 lesson** `validation.unresolvedRisks` (x29) | `[]` | 0 of 29 flag the dead-content problem, the duplicate guided practice, or the standards over-claim |
| **K–G5 lesson** `review.pedagogyNotes` (x29) | `"Lesson follows concrete-to-representational-to-check sequence for K-5 learners."` | the concrete + representational stages are the `launch`/`conceptExplanation`/`workedExample` that never render (P1-1); what ships is a checklist of questions with no answers (P1-2) |
| **K–G5 lesson** `illustration.notes` (x29) | `"No answer-critical bitmap or diagram is required for this candidate."` | `"Which shape has 3 straight sides?"` needs options or a figure — **P1-14** |
| **MS pack** `packageStatus` / lesson `approval.status` | `"approved-for-production"` (x15) | contains a false stated rule on a live page — **P0-1** |
| **MS pack** `reviewStatus` | `"s18-full-scope-qa-approved-owner-conditional-release"` | "full-scope QA" missed the P0, the 15/15 checkpoint duplication, and 81/81 invalid standard codes |
| **MS lesson** `review.mathQaStatus` (x15) | `"passed-deterministic-checks"` | the checks compare only the final answer string; they cannot see a false explanation (P0-1) and mislabel the maths in 3 lessons (P1-6) |
| **MS lesson** `validation.unresolvedRisks` (x15) | `[]` | 0 of 15 flag the invalid standard codes or the grade-level violations |
| **MS lesson** `integrationStatus` (x15) | `"integrated-into-california-middle-school-textbook-route"` | **true** — this one is honest. But no navigation reaches the route (P1-16). |
| **MS** `livePromotion.promotedBy` | `"S23 live promotion under owner conditional release request"` | consistent with the route being live |
| **v1 textbook-pack** `integrationStatus` | `"not-integrated-into-live-lessons"` | **mostly true but understated**: rendered at `/lesson/california-middle-school-textbook/review`, which `middleware.ts` gates for any signed-in user, including students |
| **v1 textbook-pack** `releaseStatus` | `"generated-review-package"` | consistent |

---

## 6. Reachability table

Pack 1 — **K–G5 (29 lessons)**. All 29 identical in reachability shape.

| What | Reachable? | Path |
|---|---|---|
| topic (title, minutes, standards) | **YES** | `californiaK5TextbookTopics` → `usCaliforniaTopics` → topic directory |
| lesson page | **YES** | `toTextbookLessonSeed` (`productionReady: true`) → `usCaliforniaLessonSeeds` → `productionLessonSeeds` → `liveProductionLessonSeeds` → `productionLessonByTopicId` → `/student/lessons/[lessonSlug]` |
| lesson **core** (`launch`, `conceptExplanation`, `workedExample` + answer + reasoning) | **NO — 29/29 orphaned** | `textbookCoreBlocks` short-circuits to `ccssInteractiveLessonBlocks` because all 29 topic ids are keys in `ccssLessonAssignments` |
| `answerKey` (both sub-objects) | **NO — 29/29 orphaned** | never referenced by any renderer |
| `learningGoals`, `guidedPractice[].prompt` + `expectedMove` | **YES** | "Guided practice" checklist block |
| `independentPractice`, `commonPitfalls`, `exitTicket` | **YES** | "Mistake repair" extension block |
| generated `standards-coverage` teacher-guide fallback string | **NO — dead** | replaced by `ccssTeacherGuideBlock` for all 29 |

Pack 2 — **Middle school (15 lessons)**. All 15 fully rendered on one page.

| Grade | Lesson id suffix | Anchor | Rendered? | Concept PNG |
|---|---|---|---|---|
| G6 | `p6-6-rp-ratios` | `#p6-6-rp-ratios` | YES | `p6-chapter-01-concept.png` ✓ |
| G6 | `p6-6-ns-rational-numbers` | ✓ | YES | `p6-chapter-02-concept.png` ✓ |
| G6 | `p6-6-ee-expressions-equations` | ✓ | YES | `p6-chapter-03-concept.png` ✓ |
| G6 | `p6-6-g-area-volume` | ✓ | YES | `p6-chapter-04-concept.png` ✓ |
| G6 | `p6-6-sp-distributions` | ✓ | YES | `p6-chapter-05-concept.png` ✓ |
| G7 | `s1-7-rp-proportions` | ✓ | YES | `s1-chapter-01-concept.png` ✓ |
| G7 | `s1-7-ns-rational-operations` | ✓ | YES | `s1-chapter-02-concept.png` ✓ |
| G7 | `s1-7-ee-linear-expressions` | ✓ | YES | `s1-chapter-03-concept.png` ✓ |
| G7 | `s1-7-g-scale-circles-angles` | ✓ | YES | `s1-chapter-04-concept.png` ✓ |
| G7 | `s1-7-sp-inference-probability` | ✓ | YES | `s1-chapter-05-concept.png` ✓ |
| G8 | `s2-8-ns-real-numbers` | ✓ | YES | `s2-chapter-01-concept.png` ✓ |
| G8 | `s2-8-ee-exponents-linear-systems` | ✓ | YES | `s2-chapter-02-concept.png` ✓ |
| G8 | `s2-8-f-function-relationships` | ✓ | YES | `s2-chapter-03-concept.png` ✓ |
| G8 | `s2-8-g-transformations-pythagorean-volume` | ✓ | YES | `s2-chapter-04-concept.png` ✓ |
| G8 | `s2-8-sp-bivariate-data` | ✓ | YES | `s2-chapter-05-concept.png` ✓ |

All 15 concept images resolve on disk under
`public/lesson-illustrations/us-ca-middle-school/candidates/` — **no broken assets**.
Fields never rendered: `launch`, `teacherNotes`, `checkpoint*[1]`, `workedExamples[1+]`
(all lessons carry exactly one), `answerKey` (the UI reads `studentLesson.en` directly).

**No UI entry point anywhere in the app points at a lesson that does not exist.** No orphan
references found in either direction from the UI side; the orphaning is entirely
data → UI (pack 1's teaching body).

---

## 7. `claimsNotAllowed` and sourcePolicy compliance — **PASS for packs 1 and 2**

(Pack 3 is the exception — see §7c, last P1 row: its stricter `prohibitedUse[0]` bans
paraphrase, and 8 of its `learningGoals` are close restatements of CCSS standard prose.)

**K–G5 pack** `claimsNotAllowed`:
`["complete California curriculum","official California course","fully launched California K-5 lessons","IXL-equivalent exercises"]`
**Middle-school pack** same list, restated as `livePromotion.forbiddenClaims`, with
`livePromotion.publicClaimLimits: ["California middle-school mathematics replacement lessons","California standards-aligned lesson coverage"]`.

* No lesson text in either pack claims official CA endorsement, a complete curriculum, or
  IXL equivalence. The live MS page copy stays inside the permitted limits:
  `"California Middle School Mathematics · Domain overview beta"`,
  `"Replacement Grade 6-8 Lessons"`,
  `"Illustrated California standards-aligned domain overview lessons…"`.
* **No verbatim or lightly-modified CCSS prose.** I ran a longest-common-word-run comparison
  of every `conceptExplanation` / `learningGoals[0]` / `objectives[0]` in both packs against
  all 229 standard descriptions in `data/ccss/*.ts`. The single longest match is **9 words**
  — `"a function assigns exactly one output to each input"` in
  `…-s2-8-f-function-relationships` — which is the unavoidable textbook definition of a
  function, not a distinctive expression. Every other match is ≤ 6 words and is a bare
  technical phrase (`"hundreds tens and ones"`, `"dot plots histograms box plots"`,
  `"add subtract multiply and divide"`). This is well inside fair use of terminology.
* **No passage reads as copied from a commercial textbook.** The prose is plainly
  MAIS-authored and template-generated — e.g. `"Counting is a careful matching game."`,
  `"Expressions and equations are story machines."`, `"A ratio story keeps two quantities
  moving together."` The tell is the opposite of plagiarism: the same sentence skeleton and
  the same closing "check the unit" beat recur in every one of the 44 lessons.
* Minor note, not a violation: the K–G5 `learningGoals[0]` phrases are close paraphrases of
  CCSS *cluster headings* (e.g. `"solve addition/subtraction situations, understand
  properties, and build fluency within 20"`). They are paraphrases, not reproductions, and
  the pack's `sourcePolicy.copiedOfficialStandardProseAllowed: false` is honoured.

---

## 7b. Bonus: `data/usCaliforniaMicroLessons.ts` — 12 Grade 1 micro-lessons — **CLEAN**

These ship alongside the 29 (`californiaElementaryMicroLessonSpecs` →
`californiaElementaryMicroLessonSeeds` → `usCaliforniaLessonSeeds`), so they are part of the
same live CA lesson surface. I verified all 12 worked examples:
`4+3=7`, `5+2=7`, `6+2=8`, `3+5=8`, `4+5=9`, `2+6=8`,
`9-4=5`, `8-3=5`, `10-6=4`, `7-2=5`, `9-5=4`, `10-4=6` — **all correct**,
all `1.OA` standards resolve in `data/ccss/grades-k2.ts`, language is age-appropriate.

Notably these are **hand-authored and pedagogically much stronger than the generated
K–G5 pack**: `guidedPractice` is a genuine 3-step scaffold per lesson
(e.g. `"Box the starting group in the picture." / "Cross out or cover the part that leaves." / "Count the part that remains."`)
rather than a copy of the worked example, and `commonPitfalls` repair moves are specific.
They are a good template for repairing P1-2 / P1-3 / P2-7.

One P2 governance note: each spec carries
`sourceAlignmentSignal: "IXL 1-H.1 addition word-problem picture skill, paraphrased as a MAIS-owned knowledge point."`
The accompanying `sourcePolicyNote` correctly states no IXL item text, preview wording,
screenshots, or exercise sequence is copied, and I found none. But the *skill taxonomy*
(`1-H.1 … 1-L.6`) mirrors IXL's proprietary skill organisation, and the K–G5 pack's
`claimsNotAllowed` forbids `"IXL-equivalent exercises"`. Worth an explicit legal read on
borrowing the skill-code structure, separate from the item text question.

---

## 7c. Pack 3 — `us-ca-math-textbooks-v1/textbook-pack.json` (7 books x 5 chapters)

Audited jointly (I verified the middle-school books and all declared math facts; a second
pass covered S3–S6 and the practice sets).

**Arithmetic: clean.** I machine-verified all **214** chapter-level `qa.mathFacts`
assertions across all 35 chapters — **0 genuine mismatches**, and `expected === actual`
in 214/214. (The 10 apparent failures on first pass were my evaluator missing
`sqrt`/`abs` and JS treating `^` as XOR; `9^2 + 12^2 === 15^2` and `sqrt(6^2+8^2)=10` are
mathematically correct.) I then hand-checked every numeric item in the 15 middle-school
chapters: `15/6=2.5 ×10=25`, `-6.5→2 = 8.5`, `3(5+4)=27`, `6×4×3=72`, `8×4×h=96→h=3`,
mean of `6,8,8,9,11 = 8.4` / median 8 / range 5, MAD of `3,5,5,7 = 1`, `7.20/4×9=16.20`,
`-3.5+1.75-(-2.25)=0.5`, `(-4)(-6)/3=8`, `5/6-7/12=1/4`, `3(2x-5)+4x=10x-15`,
`2(3y+4)=38→y=5`, `6.4cm×5=32m`, `2π(4)=8π`, `40×1.5²=90`, `5/10=1/2`, `48/80×600=360`,
`4/6=2/3`, `24/40=60% > 52/100=52%`, `7x-5=3x+19→x=6`, table `(0,5),(2,11),(4,17)→y=3x+5`,
`f(6)=-3`, reflection `(3,-2)→(-3,-2)`, rotation `(2,-4)→(4,2)`, dilation `(8,-6)×½=(4,-3)`,
`a²+25=169→a=12`, `9-12-15` right triangle, `y=4x+52` at `x=7` → 80, trend rate `12/2=6`,
residual `74-68=6`. **All correct. 0 P0.** Total across both passes: 305 distinct numeric
items and 459 machine-checked fact assertions, 0 errors.

**But the pack has serious structural defects (all P1):**

| Chapter(s) | Sev | Evidence | Why wrong |
|---|---|---|---|
| **32 of 35 chapters** | P1 | `us-ca-math-s5-chapter-03` is "Trigonometric Functions and Graphs" (`HS.F-TF`) and all 7 of its practice problems read `"A design team uses 24 tiles for 6 identical panels. At the same rate, how many tiles are needed for 11 panels?"` | The entire 245-problem practice corpus collapses to **3 templates** — a Grade-6 unit-rate tile item (147), a two-step linear equation (70), linear-function evaluation (28). Grade-11 trig, Grade-12 polynomials, Grade-10 circle geometry and Grade-8 Pythagorean are all "assessed" with a 6th-grade unit-rate question. The template filler is not standard-aware. |
| `s3-chapter-01` … `s3-chapter-05` | P1 | e.g. `"standardIds": ["CA.CCSS.Math.HS.N-RN"]` on a chapter titled `"Equations from Context"`; `"HS.A-CED"` on `"Function Notation and Interpretation"`; `"HS.G-GPE"` on `"Modeling with Evidence"` | **0 / 5 of the Grade 9 book's chapters carry the right domain.** The whole book is shifted by one. Should be A-CED / F-IF / F-LE / G-GPE / Modeling. |
| `s6-chapter-03`, `s6-chapter-04` | P1 | `"HS.F-IF"` on `"Decision Statistics"` (text: `"combines probability, payoff, risk, and expected value"`) and `"HS.S-MD"` on `"Function Analysis and Rates"` | The two domains are swapped. |
| all 35 | P1 | every chapter's `standardIds` is a domain-level pseudo-code: `"CA.CCSS.Math.G6.RP"`, `"CA.CCSS.Math.HS.Modeling"` | Not CCSS identifiers; **0 / 33 distinct codes resolve in `data/ccss/*.ts`**. Same class of defect as P1-7 but coarser — no cluster or standard number at all. |
| all 15 P6/S1/S2 chapters | P1 | chapter `"reviewStatus": "s18-approved-for-california-middle-school-student-route-2026-06-07"` while the **parent book** says `"generated-pending-human-curriculum-review"` and the **pack** says `"integrationStatus": "not-integrated-into-live-lessons"` | A chapter claims student-route approval that its own book and pack both deny — and 14 of the 15 carry entirely off-standard practice sets. S3–S6 chapters correctly report `"generated-pending-human-curriculum-review"`. |
| 20 chapters (S3–S6), 40 worked examples | P1 | S3–S6 worked examples are `{"title","prompt","solution","check"}` with **no `answer` key**; the answer lives in `check` (e.g. `"3 challenges"`). P6/S1/S2 use `answer`. `CaliforniaMiddleSchoolTextbookPage.tsx` gates the Answer line on `problem.answer` and only falls back to `check` *after* `solution`, which always exists. | 40 worked examples render a question and a solution with **no Answer line**. |
| `s2-chapter-05` | P1 | `qa.mathFacts` contains `{"expression":"association_alone_proves_causation","expected":0,"actual":0}` | Not an expression. It sits under `"mathValidationStatus": "passed-…-validator"`, so "passed" covers a row no evaluator can evaluate. |
| P6 ch1/2/4/5, S1 ch1/4, S2 ch2/4 | P1 | `learningGoals` such as `"Use ratio language and unit rates to describe a relationship between two quantities."` (vs 6.RP.A.1 `"…use ratio language to describe a ratio relationship between two quantities."`); `"Identify statistical questions that anticipate variability."` (vs 6.SP.A.1); `"Use nets to reason about surface area."` (vs 6.G.A.4); `"Find and interpret the constant of proportionality."` (vs 7.RP.A.2b); `"Use the Pythagorean theorem to find missing side lengths in right triangles."` (vs 8.G.B.7) | This pack's `sourcePolicy.prohibitedUse[0]` is stricter than packs 1–2: `"Do not copy, translate, paraphrase, reconstruct, or lightly modify official standards wording."` These preserve the standards' distinctive operative clauses with light rewording, and ship in `zh`/`zhHans` too, which also trips the "translate" clause. **This is the one genuine source-policy exposure in the whole CA lesson surface** — packs 1 and 2 are clean (§7). |

P2s in pack 3: S3–S6 `learningGoals` are placeholders (`"Connect Equations from Context to the standards identifiers listed for this chapter."`, byte-identical across 20 chapters); the S3 book has **1 distinct** misconception clinic and **1 distinct** glossary cloned into all 5 chapters (`"Watch for: mixes degrees and radians."` appears under "Data Modeling and Residuals"); S3–S6 glossaries are kebab-case concept IDs (`"equations-inequalities"`) not vocabulary; 90 of 210 zh/zhHans misconception strings keep an untranslated English `"Watch for: "` prefix while `qa.trilingualStatus` asserts `"en-zh-zhHans-complete"`; S3–S6 `studentText` prompts are byte-identical to the same chapter's `practiceSets` prompts (the student sees the same 7 problems twice); `"f(x) = 2x + 0"` degenerate forms in 4 S6 items; `s1-chapter-04` records `{"expression":"2 * 4","expected":8}` for the answer `"8π meters"` (π dropped); all 14 `exportFiles` docx/pdf paths are absent from disk (`coordination/content-qa/us-ca-math-textbooks-v1/` does not exist).

**Net:** pack 3's *narrative* chapters (P6/S1/S2) are the best-written content in the whole
CA lesson surface — distinct guided practice, independent practice, assessment tasks,
glossaries, per-chapter misconception clinics — and they sit on a noindex review route,
while the thinner pack 2 is what ships to students. Its S3–S6 half is placeholder-grade.

---

## 8. Not checked / delegated

* The ported **CCSS interactive lessons** in `components/lesson/ccss/lessons/` — 270 lessons —
  are what K–G5 students actually see instead of pack 1's body (P1-1). Their mathematical
  correctness was **not** audited here and is now the load-bearing K–G5 content.
* `data/usCaliforniaKnowledgePoints.ts`, `data/usCaliforniaMathematicalPractices.ts` —
  read only for the reachability trace, not audited for content.
* I did not run the app or the test suite (read-only mandate); reachability conclusions are
  from static tracing of imports, exports, and the render functions.
