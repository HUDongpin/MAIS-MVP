# Content QA — California K–5 knowledge-point practice pack

**Target:** `data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json`
**Live:** yes — `data/usCaliforniaTopics.ts:172` sets `knowledgePointPracticeLive: true`,
`livePracticePackageId: "us-ca-k5-knowledge-point-practice-v1"`, and `practiceLive: false`
(the DeepSeek 1500 pack is retired). These 492 items ARE the entire live CA K–5 practice bank.
**Audit date:** 2026-08-26. **Read-only**: no repo file was modified.

**Coverage:** all 492 items across all 41 knowledge points and all 6 grades were loaded and
reviewed. 360 items were read in full (prompt + options + answer + acceptedAnswers +
explanation + independentSolution); the remaining 132 (the G1 `h2–h6` / `l1–l5` lesson packs)
were read in compact form (prompt + answer + acceptedAnswers) after their templates were
established from full reads of `h1`, `h5` and `l6`. 422 of 492 answer keys were independently
recomputed from the stem by script.

---

## 0. The actual answer-matching rule (read from `lib/`, not assumed)

Grading path for practice attempts:
`lib/server/practiceAttemptStore.ts:195` → `questionAnswerMatches` in
`lib/server/answerMatching.ts:392` (also re-exported by `lib/server/answerGrading.ts`).
The pack reaches it through `data/usCaliforniaQuestions.ts:60` (`acceptedAnswersFor`), which builds
`acceptedAnswers = unique([answer, independentAnswer, ...acceptedAnswers])`.

The rule, exactly:

1. `normalizeAnswer` (`answerMatching.ts:61`): NFKC → trim → **lowercase** → unify dashes →
   `×`→`*`, `÷`→`/` → strip some LaTeX → collapse whitespace → **delete whitespace around
   `= , + - * / : ^ ( )`** → normalise `$`/`hk$`.
   It does **not** strip terminal punctuation, articles, or plural `s`.
2. Extra variants are generated for: whole-string bracket unwrapping (`(9,6)` → `9,6`),
   `X = Y` (right side kept if the left evaluates to it), mixed→improper fractions,
   `$`↔`hk$`, `n%`→`n`, `n°`→`n`/`n degrees`.
3. Scalar parse (`parseScalarAnswer`): English number words **zero–twenty, thirty…ninety,
   hundred** only; `"a out of b"` phrases; mixed numbers; fractions; and a trailing unit is
   stripped **only** if it is in a hard-coded 19-word list
   (`knownAnswerUnitWords`, `answerMatching.ts:40`): blocks, buttons, cards, cm, counters,
   cubes, degree(s), dollars, items, minutes, pencils, shells, side(s), stickers, tiles, units
   — plus a regex for `cm2/cm3/ml/l/km/km-h/°/%`.
4. Match if any normalised variant is string-equal, **or** if both sides parse to scalars
   within 1e-6.
5. For MC, an option also matches if both the typed text and an accepted answer map to the
   same option (options are localised, so a zh click works).

**Consequences that drive the P0 findings below.** Anything not in that 19-word unit list is
not a unit: `"9 objects"`, `"13 dots"`, `"4 apples"`, `"27¢"`, `"7 cubes long"` all fail.
Word answers are pure string equality: `"a triangle"`, `"the circle"`, `"triangles"`,
`"triangle."` all fail against `"triangle"`. Ordinal words (`fourth`) and fraction words
(`one fourth`) are **not** parsed — they only match if an author listed them.
Conversely, numeric equivalence is total: any equivalent fraction or decimal is accepted.

---

## 1. Severity summary

| Severity | Distinct items | Notes |
|---|---|---|
| **P0** | **99** | 54 items reject a plausible correct child answer; 83 items are unanswerable for a zh/zhHans student; overlap 38 → 99 distinct (20.1% of the pack) |
| **P1** | **≈300** | position-guessable MC (71), below-grade content (108), duplicate items (57 exact / 201 identical bodies), missing-figure claims (107), metadata leaking into prompts (492), negative-number distractors (10) — overlapping sets |
| **P2** | 492 (systemic) | trailing-period rejection, filler intros, difficulty labels, EN/zh prefix mismatch |

Answer-key correctness is **clean**: 422 of 492 keys recomputed from the stem, **0 mismatches**.
Canonical standard ids are **clean**: 148 distinct ids, all present in `data/ccss/grades-k2.ts`
/ `grades-35.ts`, 0 items citing an out-of-grade id, `standardIds === canonicalStandardIds`
for all 492. The defects are in what the items *do*, not in their arithmetic or their id strings.

---

## 2. P0 — a correct child answer is marked WRONG

### 2.1 The unit noun the question itself uses is rejected (13 items, all Kindergarten)

| id (suffix of `us-ca-k5-knowledge-point-practice-v1-us-ca-math-`) | grade | type | evidence | why |
|---|---|---|---|---|
| `k-k-cc-count-sequence-q02` | K | fill-in | Q: "Count the collection: 9 cards are on a mat. **How many objects** are on the mat?" A=`"9"` acc=`["9","9 cards"]` | The stem asks for *objects*; `"9 objects"` is rejected because `objects` is not in `knownAnswerUnitWords`, while `"9 cards"` (a word the answer prompt never uses) is accepted. |
| `k-k-cc-count-sequence-q04`, `-q06`, `-q08`, `-q10`, `-q12` | K | fill-in / short-answer | same template, acc = `["8","8 counters"]` etc. | same |
| `k-k-cc-cardinality-compare-q02`, `-q04`, `-q06`, `-q10` | K | fill-in / short-answer | Q: "…**How many dots** are on the card that has more?" A=`"13"` acc=`["13"]` | `"13 dots"` rejected. The sibling KP accepts `"10 cubes"`, so the pack is internally inconsistent. |
| `k-k-md-attributes-data-q04`, `-q08`, `-q12` | K | short-answer | Q: "…**How many cubes long** is the longer strip?" A=`"7"` acc=`["7"]` | `"7 cubes long"` rejected (`cubes` is a known unit but the trailing `long` blocks the strip). `"7 cubes"` passes; the phrasing the question invites does not. |

*Fix:* add the stem's own noun phrase to `acceptedAnswers`, or make `stripKnownUnitSuffix`
tolerate any trailing alphabetic token when the leading token parses as a number.

### 2.2 Word answers reject the article and the plural (20 items, K–G4)

Evidence (acc list is the complete accepted set):

| ids | grade | answer / acc | rejected child answers |
|---|---|---|---|
| `k-k-md-attributes-data-q02`,`-q06`,`-q10` | K | `"circles"` / `["circles"]` | "circle", "the circles" |
| `k-k-md-attributes-data-q03`,`-q07`,`-q11` | K | `"marker"` / `["marker","the marker"]` | "a marker", "markers" |
| `k-k-g-shapes-position-q02`,`-q06`,`-q10` | K | `"square"` / `["square"]` | **"a square"**, "the square", "squares" |
| `k-k-g-shapes-position-q04`,`-q08`,`-q12` | K | `"circle"` / `["circle"]` | **"a circle"**, "the circle" |
| `p1-1-g-shape-reasoning-q02` | G1 | `"triangle"` / `["triangle"]` | **"a triangle"** |
| `p1-1-g-shape-reasoning-q04` | G1 | `"rectangle"` / `["rectangle"]` | "a rectangle" |
| `p1-1-g-shape-reasoning-q08` | G1 | `"circle"` / `["circle"]` | "a circle" |
| `p1-1-g-shape-reasoning-q10` | G1 | `"hexagon"` / `["hexagon"]` | "a hexagon" |
| `p3-3-g-categories-q06` | G3 | `"pentagon"` / `["pentagon"]` | "a pentagon" |
| `p3-3-g-categories-q12` | G3 | `"triangle"` / `["triangle"]` | "a triangle" |
| `p4-4-g-lines-shapes-q06` | G4 | `"right angle"` / `["right angle","right"]` | **"a right angle"** |
| `p4-4-g-lines-shapes-q10` | G4 | `"acute angle"` / `["acute angle","acute"]` | **"an acute angle"** |
| `p4-4-g-lines-shapes-q04`,`-q12` | G4 | `"parallel"` / `["parallel","parallel lines"]` | "the parallel lines" |
| `p2-2-g-partition-shapes-q02`,`-q06`,`-q08`,`-q12` | G2 | `"third"` / `["third","one third","a third","1/3"]` | "the third", "thirds" |

"What shape is it?" invites the answer "a triangle" in ordinary English; 5–7 year-olds type it.
*Fix:* strip a leading `a|an|the` and a trailing `s` in the normalizer (or list the variants).
The `p2-2-g-partition-shapes` items show the author knew to list variants — it was applied to
4 of 24 word-answer families.

### 2.3 Two-part questions accept only one exact phrasing (12 items, G1/G3/G5)

`p1-1-md-measure-data-q01,-q02,-q07,-q09,-q11`;
`p3-3-md-time-data-area-perimeter-q01,-q02,-q07,-q09,-q11`;
`p5-5-md-volume-data-q07,-q11`.

Evidence (`p1-1-md-measure-data-q02`, G1, short-answer):
Q "A picture graph shows 7 apples and 5 oranges. **Which fruit has more, and by how many?**"
A `"2 more apples"`, acc `["2 more apples","2"]`.
Rejected: `"apples"`, `"2 apples"`, `"apples, 2"`, `"2 more"`.
The stem asks two things, and the only accepted long form is one exact word order. A child who
answers the question as asked ("apples, 2") is marked wrong; a child who answers only half of
it ("2") is marked right. *Fix:* split into two items, or accept `{noun}` + `{n} {noun}` +
`{noun}, {n}` + `{n} more`.

### 2.4 Clock answers accept only `H:00` (3 items, G2)

`p2-2-md-measure-data-money-time-q02` (A `"4:00"` acc `["4:00"]`), `-q06` (`"9:00"`),
`-q10` (`"6:00"`). Rejected: `"4 o'clock"`, `"4"`, `"04:00"`, `"4:00 pm"`.
2.MD.C.7 is *"tell and write time … using a.m. and p.m."*, so "4:00 pm" is the taught form and
it fails. *Fix:* accept `H`, `H o'clock`, `H:00 am/pm`, `0H:00`.

### 2.5 Chinese-language students cannot pass any typed word item (83 items)

83 non-multiple-choice items have an answer containing English words, and **0** of them list
any Chinese accepted form — while `prompt.zh` / `prompt.zhHans` exist for all 492 items and the
UI serves them. A student reading "這是什麼形狀？" and typing 「三角形」 is marked wrong on every
one of these. (MC is unaffected: `questionAnswerMatches` matches localised option text.)
Examples: `k-k-g-shapes-position-q02` acc `["square"]`; `p4-4-g-lines-shapes-q06`
acc `["right angle","right"]`; every `N more apples` item.
*Fix:* add zh/zhHans accepted forms for every non-MC word answer, or gate typed word items to
the `en` locale.

### 2.6 Overlap and rate

54 of 357 non-MC items (**15.1%**) reject at least one plausible correct answer
(K 25, G1 9, G2 7, G3 7, G4 4, G5 2). 83 items fail for zh users. Union = **99 distinct P0
items = 20.1% of the pack** (38 items are in both classes). Because every knowledge point was inspected, this is a census,
not a projection.

---

## 3. P1 — unusable or misaligned as written

### 3.1 Multiple choice is guessable without doing the maths (71 of 135 MC items)

Correct-option index distribution over all 135 MC items: **A 38 / B 24 / C 72 / D 1**.
The last option is correct **once in 135 items (0.7 %)**; chance is 25 %.
Worse, in 16 knowledge points with ≥3 MC items the correct index **never changes**:

| knowledge point | MC items | correct index, every time |
|---|---|---|
| `k-k-cc-cardinality-compare` | 8 | A |
| `k-k-cc-count-sequence` | 6 | C |
| `p2-2-oa-fluency-arrays` | 6 | C |
| `p3-3-oa-mult-div` | 6 | C |
| `p5-5-nbt-decimals` | 6 | A |
| `p1-1-h3-cube-train-join-models-to-10` | 6 | C |
| `p3-3-g-categories`, `p4-4-nf-fraction-decimal`, `p5-5-nf-operations` | 4 each | A |
| `p4-4-nbt-multi-digit`, `p1-1-l1`…`l6` (6 KPs) | 3 each | C (l1–l6), C (p4 nbt) |

A child who always clicks the third option scores 100 % on `p3-3-oa-mult-div`. The structural
gate cannot see this because every option set is individually well-formed.
*Fix:* shuffle key position per item with a seeded permutation and assert a ~uniform
distribution in the gate.

### 3.2 108 items teach content below their own grade; 4 knowledge points are entirely below grade

Content grade was assigned per template from the CCSS grade where the skill is introduced,
then compared with the item's labelled grade (400 of 492 items matched a rule).

| labelled grade | items below grade | lowest content grade seen |
|---|---|---|
| G1 | 6 | K |
| G2 | 7 | G1 |
| G3 | 28 | G1 |
| G4 | 31 | G1 |
| G5 | 36 | G1 |

Wholly below-grade knowledge points (12/12 items each, 48 items):

- `p3-3-nbt-arithmetic` — every item is "What number has H hundreds, T tens, and O ones?",
  i.e. **2.NBT.A.3**. None of 3.NBT.A.1 (rounding), A.2 (add/subtract within 1000) or A.3
  (multiply by multiples of 10) is tested by any item.
- `p4-4-nbt-multi-digit` — 9 × 3-digit place value + 3 × `2 equal bags each hold 4 cubes`
  (`p4-4-nbt-multi-digit-q01`, answer 8). 4.NBT is numbers ≥ 1000, standard algorithm, 4-digit ÷
  1-digit. Nothing in the KP touches it.
- `p5-5-nbt-decimals` — 11 × "Which decimal is N ones and M tenths?" (a **4.NF.C.6** skill)
  plus `-q02` "What number has 6 hundreds, 8 tens, and 4 ones?" (G2, and a verbatim copy of
  `p3-3-nbt-arithmetic-q04`). 5.NBT.A.3 (thousandths), B.5–B.7 (decimal operations) untested.
- `p5-5-nf-operations` — cites **5.NF.A.1 (unlike denominators)** but every addition item has
  like denominators (`p5-5-nf-operations-q02`: "Add 2/6 + 3/6"), a 4.NF.B.3 skill; the other 6
  items are "what fraction is shaded", a 3.NF.A.1 skill. 5.NF.B.4–B.7 (× and ÷ of fractions)
  untested.

Other large misalignments: `p4-4-md-conversion-angles` contains **no unit conversion** despite
the name and 4.MD.A.1/A.2 (`-q03` is a G1 "ribbon 10 cm + 3 cm"); `p3-3-oa-mult-div` contains
**no division** despite 3.OA.A.2/B.6 (`-q02` is a K addition item); `p4-4-nf-fraction-decimal`
cites 4.NF.C.5–C.7 and contains **no decimal**; `k-k-g-shapes-position` cites K.G.B.4–B.6
(analyse/compose/build shapes) and only ever asks to name a shape from a verbal description.

### 3.3 G2 items require multiplication and teach it as multiplication

`p2-2-oa-fluency-arrays` q01,q03,q04,q05,q07,q08,q09,q10,q11,q12 (10 items):
`p2-2-oa-fluency-arrays-q04` — "5 equal bags each hold 7 cards. How many cards are there in
all?" A `"35"`, explanation **"Use equal groups: 5 x 7 = 35."**
2.OA.C.4 is explicitly *repeated addition* on arrays of **up to 5 columns**; 5×7, 6×3, 4×6 all
exceed it, and the explanation hands a G2 child a method first taught in 3.OA.
*Fix:* rewrite as repeated addition within 5×5, or move the items to G3.

### 3.4 An explanation states the perimeter rule incorrectly in words (3 items, G3)

`p3-3-md-time-data-area-perimeter-q04`, `-q08`, `-q12`:
"**Perimeter is twice length plus width:** 2 x (7 + 6) = 26 units."
Read as English, "twice length plus width" is 2ℓ + w = 20, not 26. The symbols are right, the
sentence a child reads is wrong, and this is exactly the misconception the item should prevent.
*Fix:* "Perimeter is twice the sum of the length and the width."

### 3.5 Negative numbers appear as distractors in Grade 1 (10 items)

`p1-1-l2-…-q04,-q08,-q12`; `p1-1-l3-…-q04,-q08,-q12`; `p1-1-l4-…-q12`;
`p1-1-l6-…-q04,-q08,-q12`.
Evidence (`p1-1-l6-break-apart-subtraction-equations-to-10-q04`):
options `2 - 6 = -4 | 6 + 2 = 8 | 8 - 2 = 6 | 8 + 2 = 10`.
Negative integers are 6.NS content. A 6-year-old shown "-4" learns nothing from the distractor
and may take it as valid notation. *Fix:* replace with `6 - 2 = 4` or `8 - 6 = 2`.

### 3.6 12 Kindergarten items state their own answer and require no mathematics

All of `k-k-cc-count-sequence-q01…q12`: "Count the collection: **9** cards are on a mat.
How many objects are on the mat?" → `9`. There is nothing to count; the numeral is in the
sentence. Cited standards K.CC.A.1 (count to 100 by ones/tens) and K.CC.A.2 (count forward from
a given number) are not tested by any item in the pack.
*Fix:* these need the ten-frame figure (only q01 and q09 have one) with the count removed from
the stem, or a real count-sequence task ("What number comes after 7?").

### 3.7 Repetition inside a single 12-question set

- **23 groups / 57 items** have a byte-identical English prompt, and **every group is inside one
  knowledge point** — so a child working through a 12-item set meets the same question 2–3
  times. Worst: `k-k-g-shapes-position` is 12 items made of only 4 distinct questions
  (q01=q05=q09, q02=q06=q10, q03=q07=q11, q04=q08=q12).
  Also `p1-1-h1…h6 q04=q08=q12` (18 items), `p5-5-g-coordinate-shapes-q01=q10`, `-q02=-q11`.
- After stripping the `… checkpoint:` prefix, **201 of 492 items (41 %)** share their body with
  another item; **174** share it across different knowledge points and **40 groups span
  different grades** — e.g. "In a math poster, how many sides does a square have?" is served at
  G1, G2 **and** G4; "4 equal bags each hold 6 cubes" at G2, G4 **and** G5;
  "A rectangle is split into 6 equal parts. 3 parts are shaded" at G4 and G5.
- The whole pack is generated from **61 prompt templates**; the top 5 cover 200 items:
  70 × "A tray has N red X and M blue X" (spans **all six grades**),
  66 × "There are N X. M are moved away", 35 × "N equal bags each hold M X",
  24 × "What number has H hundreds, T tens, O ones", 19 × "A ribbon is N cm…".

**Verdict on the brief's question 4:** identical prompts here are a defect, not acceptable
reuse. The duplication is *within* a knowledge point (a child literally re-answers the same
question in one session) and *downward across grades* (a G5 learner is served a G1 item). Reuse
would only be defensible as deliberate spaced repetition across separate sessions, which is not
what this is.

### 3.8 Items claim a picture that is never rendered (107 items; only 10 figures exist)

`data/usCaliforniaPracticeFigures.ts` defines **10** ten-frame specs, all K/G1
(`k-cc-count-sequence-q01,q09`; `k-oa-compose-decompose-q02,q04,q10`;
`k-nbt-teen-numbers-q01,q05`; `p1-h1-…-q01,q02`; `p1-h2-…-q01`), wired in at
`data/usCaliforniaQuestions.ts:95` (`usCaliforniaPracticeFigureFor`). Everything else renders
as text only.

| visual referenced | items | with figure | without |
|---|---|---|---|
| "a ten-frame shows…" / "counters are on a ten-frame" | 21 | 2 | **19** |
| "A picture graph shows…" | 12 | 0 | **12** |
| "In a notebook sketch / math poster / attribute chart / sorting mat…" | 24 | 0 | **24** |
| "One card has N dots…" | 12 | 0 | **12** |
| "A rectangle is split into N equal parts, M shaded" | 15 | 0 | **15** |
| "A class chart…", "A number line…", "A clock shows…", "A coin cup…" | 12 | 0 | 12 |
| **total distinct items with visual language** | **111** | 4 | **107** |

**No item is strictly unanswerable** — every stem restates the numbers, so the child can answer
from text. That is precisely the problem: the item promises a manipulative, then makes the
manipulative irrelevant, which is the opposite of the K–2 concrete→pictorial→abstract sequence.
The inconsistency is visible inside one knowledge point: `k-k-nbt-teen-numbers-q01` and `-q05`
render a ten-frame while `-q09` — same wording — does not.
Rated **P1, not P0**, on the evidence.

### 3.9 Internal metadata is shown to the child in every prompt

All **492** English prompts begin with `"<Cluster Title> checkpoint: "` —
"Compose Decompose checkpoint:", "Cardinality Compare checkpoint:", "Three Digit Place Value
checkpoint:". `sanitizeStudentText` (`data/usCaliforniaQuestions.ts:42`) strips
`Activity N:` and `DeepSeek practice:` prefixes but **not** this one.
**144** G1 prompts additionally start with an internal lesson code:
"1-H.1 Picture Join Stories to Ten checkpoint: …".
The zh prompt does not carry either artefact (it reads 「一年級運算思維練習：」), so the English and
Chinese versions are different reading tasks.

### 3.10 Grade-1 lesson knowledge points promise a representation they never show (144 items)

`p1-1-h1-picture-join-stories`, `h3-cube-train-join-models`, `h5-model-equation-join-stories`,
`l1-picture-take-away-stories`, `l3-cube-train-take-away-models`, … : all 12 lesson KPs draw
from the same four templates ("A tray has N red X and M blue X", "There are N X. M are moved
away", "Which equation matches this join story…", "Which equation matches this take-away
story…"). There is no picture in a "Picture …" KP and no cube train in a "Cube-Train …" KP.
The 12 KPs are pedagogically indistinguishable from each other and from `p1-1-oa-add-subtract`.

### 3.11 Three items cannot detect a wrong answer (false positives)

`p3-3-nf-fraction-meaning-q03`, `-q07`, `-q11`:
"Name a fraction equivalent to **1/8** by splitting each part into 2 equal pieces."
A `"2/16"`, acc `["2/16"]`. Because the matcher compares scalars, typing the fraction from the
question — **`1/8`** — is graded **correct**, as is `0.125` and `3/24`. The item cannot
distinguish a child who did the work from one who copied the stem.
*Fix:* these need a string-form check (denominator must be 16), not scalar equality.

---

## 4. P2 — polish

| id / scope | issue |
|---|---|
| all 357 non-MC items | A trailing full stop is rejected: `"triangle."`, `"8."` all fail. `normalizeAnswer` never strips terminal punctuation. Most damaging on the 83 word-answer items. |
| `p2-2-md-…-money-time-q03`,`-q07`,`-q11` | `"27 cents"` / `"27"` accepted, but `"$0.27"` and `"27¢"` rejected — and 2.MD.C.8 is the standard that introduces `$` and `¢`. |
| `p5-5-g-coordinate-shapes` (10 items) | acc = `["(9, 6)","9,6","(9,6)"]`; `"9 6"` and `"x=9, y=6"` rejected. |
| 24 items (`p1-1-g-shape-reasoning`, `p2-2-g-partition-shapes`, `p3-3-g-categories`, `p4-4-g-lines-shapes`) | Filler intros "In a math poster,", "In an attribute chart,", "In a sorting mat," reference an artefact that does not exist and add reading load for no mathematical purpose. |
| `p4-4-oa-factors-patterns-q01,-q03,-q09`; `p5-5-oa-expressions-patterns-q01,-q03,-q09` | Yes/no question whose four options are `yes`, `no`, `always`, `not enough information` — the last two are not grammatical answers to it, so the item is effectively 50/50. |
| whole pack | `difficulty` (Low 123 / Medium 246 / High 123) does not track difficulty. `p1-1-nbt-place-value-q04` ("5 tens and 4 ones") is **High** while `-q05` ("6 tens and 5 ones") is **Low**; `p2-2-g-partition-shapes-q04` ("how many sides does a rectangle have") is **High**. |
| 18 G1 items | "Which equation matches this take-away story: 8 counters are on a ten-frame and 2 are **covered**?" — covered counters are still on the frame; "covered" is a weak cue for removal. |
| `p2-2-md-…-money-time-q03` etc. | `independentSolution` uses `2 * 10 + 7 = 27` — multiplication notation on a G2 item (teacher-facing field, so low impact). |

---

## 5. Reading level / age-appropriateness (brief item 2)

K + G1 = 264 of 492 items (54 %).

| grade | items | avg words / prompt | max | prompts > 15 words |
|---|---|---|---|---|
| K | 72 | **18.8** | 25 | 63 (88 %) |
| G1 | 192 | **20.1** | 24 | 172 (90 %) |
| G2 | 48 | 17.1 | 22 | 30 |
| G3 | 60 | 16.9 | 27 | 39 |
| G4 | 60 | 15.3 | 27 | 33 |
| G5 | 60 | 15.4 | 22 | 36 |

The K prompts are the **longest in the pack**. Longest K item
(`k-k-md-attributes-data-q04`, 25 words): "Attributes Data checkpoint: One paper strip is 4
cubes long. Another paper strip is 7 cubes long. How many cubes long is the longer strip?"

Teacher vocabulary inside K/G1 student-facing prompts: "checkpoint" ×264, "equation" ×90,
"model" ×52, "ten-frame" ×21, "corners" ×16, "attribute" ×12, "cardinality" ×12,
"decompose" ×12, "compose" ×12, "sequence" ×12, "collection" ×12, "category" ×3.

A kindergartener who is still learning to write numerals 0–20 (K.CC.A.3) cannot read
"Compose Decompose checkpoint: A tray has 2 red counters and 3 blue counters." and cannot type
"circles". This is the single largest usability risk in the pack and it affects **all 264 K/G1
items**. *Fix:* strip the prefix, cut K stems to ≤8 high-frequency words, prefer figure + MC or
numeric entry over typed words below G2, and add audio/read-aloud.

---

## 6. Standards alignment (brief item 6)

- **Id hygiene: clean.** 148 distinct `standardIds`, all resolve in `data/ccss/grades-k2.ts` /
  `grades-35.ts`; `canonicalStandardIds` identical to `standardIds` for all 492; every item's
  standards belong to its own grade; `maisStandardIds` is a 1:1 re-encoding
  (`K.CC.A.1` → `CA.CCSS.Math.K.CC.1`).
- **Content alignment: poor.** Items carry the *entire cluster list* of their domain (up to 10
  ids, e.g. `p2-2-md-…` cites 2.MD.A.1–D.10) while testing one or two sub-skills, so the tags
  overstate coverage by roughly 5–10×. Cross-checked spot list of cited-but-untested standards:
  K.CC.A.1, K.CC.A.2, K.G.B.4–B.6, 1.MD.C.4, 2.NBT.A.4/B.5–B.9, 2.G.A.1–A.2,
  3.OA.A.2/B.6/C.7/D.8–D.9, 3.NBT.A.1–A.3 (all), 3.MD.A.1–A.2/C.5–C.7,
  4.NBT.A.1–B.6 (all), 4.NF.C.5–C.7, 4.MD.A.1–A.3, 5.NBT.A.3–B.7, 5.NF.A.1/B.3–B.7,
  5.G.B.3–B.4, 5.MD.A.1.

---

## 7. Method and what was not covered

**Method.** Loaded the pack with node; transpiled `lib/server/answerMatching.ts` with the
repo's own esbuild and drove `answerMatches` / `questionAnswerMatches` against the pack's real
accepted set (`[answer, independentAnswer, ...acceptedAnswers]`, exactly as
`data/usCaliforniaQuestions.ts` builds it) to prove every acceptance/rejection claim above.
Dumped and read every knowledge point. Independently recomputed 422 answer keys.
Extracted figure ids from `data/usCaliforniaPracticeFigures.ts` and joined them to the pack.
Extracted CCSS ids from `data/ccss/*.ts` and diffed.

**Not covered.**
- The rendered UI: I did not run the app, so I did not verify how a ten-frame diagram actually
  draws, how the answer box behaves (autocorrect, capitalisation, IME), or whether any prompt
  overflows on mobile.
- zh / zh-Hans **translation quality** — I verified only that all 492 items have complete
  `zh` and `zhHans` prompts, options and explanations, and that the zh prefix differs from the
  English one. I did not check the Chinese mathematics register.
- `evidenceCardIds` / `sourceIds` provenance against `us-ca-math-k-g5-textbooks-v1`.
- The teacher-facing surfaces (assignment generation, `independentSolution` display).
- Whether the retired DeepSeek pack or the `ccss-textbook-practice-v1` pack (also live) share
  any of these defects.
- Adaptive sequencing: whether the engine would ever serve the duplicate items in one session
  (it can — the duplicates are inside single knowledge points).

**Top 10, ordered by learner harm.**
1. 83 items unanswerable for a zh/zhHans student (all typed word answers, English-only acc).
2. 20 word-answer items reject "a triangle" / "a square" / "a right angle" (K–G4).
3. 12 two-part "which fruit has more, and by how many" items reject "apples, 2" and "2 apples".
4. 13 K items reject the noun their own stem uses ("9 objects", "13 dots", "7 cubes long").
5. 3 G2 clock items accept only "4:00" — not "4 o'clock", "4", or "4:00 pm".
6. 71 MC items sit at a fixed key position inside their knowledge point (last option correct
   1/135 pack-wide) — guessable without doing any mathematics.
7. 48 items in 4 knowledge points (`p3-3-nbt-arithmetic`, `p4-4-nbt-multi-digit`,
   `p5-5-nbt-decimals`, `p5-5-nf-operations`) test no standard they cite and sit 1–3 grades low.
8. 264 K/G1 items average 19–20 words with teacher vocabulary and an internal
   "… checkpoint:" / "1-H.1 …" prefix.
9. 57 items are exact duplicates inside a single 12-question set; 201 items share a body.
10. 107 items name a picture, ten-frame, graph, chart or number line that is never rendered
    (only 10 figures exist in the whole pack).
