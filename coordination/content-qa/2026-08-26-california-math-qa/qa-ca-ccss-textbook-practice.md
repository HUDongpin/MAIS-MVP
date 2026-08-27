# QA audit — `ccss-textbook-practice-v1` (California track, US_CA_MATH)

Target: `/Volumes/Starship/MAIS-MVP/data/generated-content/ccss-textbook-practice-v1/question-pack.json`
810 items / 270 lessons / K–G12. Served via `data/usCaliforniaTopics.ts` → `data/usCaliforniaQuestions.ts`.
Upstream: `data/generated-content/ccss-textbook-source-v1/source.json` (+ `curated-distractors.json`, `assignments.json`).
Build: `scripts/build-ccss-practice-pack.mjs`.

**Coverage:** all 810 items printed and reviewed. 508 computational items independently re-solved
(fill-in 321 + MC with numeric content 187). All 489 MC keys adjudicated for uniqueness.
Read-only audit; no repo file was modified.

---

## Severity summary

| Severity | Count | Class |
|---|---|---|
| P0 | 2 confirmed | multi-correct MC (1), rounding-key contradiction (1) |
| P1 | 9 | self-contradictory stem, false-arithmetic option, wrong-form key text, lesson↔practice drift (4 lessons), grade misplacement (systemic) |
| P2 | ~12 classes | degenerate distractors, cross-grade duplicates, circular stems, imprecise theorem wording |

Wrong-key rate in the 508 re-solved computational items: **2/508 = 0.39%** → projected ~3 items across 810.
The dominant risk is **not** wrong arithmetic. It is **option-set integrity** and **grade/difficulty metadata**,
both of which are 100%-prevalence structural defects introduced *after* the "hand-check" the metadata claims.

---

## Structural facts the existing gate cannot see

These were established with node counts over the pack + upstream snapshot, and they frame every finding below.

**S1. Every single MC item's option set is machine-manufactured, yet every item claims a hand check.**
Upstream has **0** four-option MC items: 479 are 3-option and 10 are 2-option.
`build-ccss-practice-pack.mjs` pads all of them to the MAIS 4-option standard
(`synthesizeNumericDistractors` → `answer+1, answer−1, answer+2, answer*2, max+range, answer+10`;
or `curatedDistractors` / `patternDistractors`).

```
MC items with >=1 padded option: 489 of 489
distinct padded strings: 415
```

Every item nevertheless carries `mathQaStatus: "passed-ccss-textbook-hand-check"` and
`manualQaStatus: "accepted-ccss-textbook-hand-check"`. That provenance is true of the stem, key and
explanation (which the build never alters) and **false of the option set**. The one confirmed P0
multi-correct item (F1) is a direct product of the synthesizer.

**S2. `difficulty` is a pure function of grade — it carries zero information.**
`distinct grade:difficulty pairs: 13` for 13 grades. Source:
`difficulty: lowGrades.has(grade) ? "Low" : highGrades.has(grade) ? "High" : "Medium"`.
So the reported "138 Low / 393 Medium / 279 High" is just K/P1/P2 vs P3–S2 vs S3–S6. No item in the
bank is harder or easier than any sibling in its grade, and the field cannot support adaptive
selection, difficulty ramps, or a "hard set" filter.

**S3. `standardIds` are lesson-level, never item-level.**
`lessons where all items share identical standardIds: 270/270`. 291 items carry 2+ standards, 51 carry 3+.
All 385 distinct codes **do** resolve against `data/ccss/*.ts` (0 unknown) — the codes are real, the
*attribution* is not per-item.

**S4. This pack can never render a figure.**
`data/usCaliforniaQuestions.ts:95` attaches diagrams via `usCaliforniaPracticeFigureFor(question.id)`.
Every key in `data/usCaliforniaPracticeFigures.ts` is prefixed `us-ca-k5-knowledge-point-practice-v1-`;
**0** `ccss-textbook-practice-v1` ids appear there. The upstream authors compensated by describing every
visual in prose — which is why there is no unanswerable-figure P0 (good), but it is also why the
visual-manipulative lessons degenerate into vocabulary recall (F7, F8).

**S5. Practice collapses into definition-recall as grade rises — inverting the difficulty label.**
Share of items that are MC with no numeric content at all:

```
K 40%  P1 27%  P2 21%  P3 17%  P4  9%  P5 10%  P6 17%
S1 38%  S2 47%  S3 62%  S4 76%  S5 55%  S6 52%
```

48 of 270 lessons (18%) have **all three** practice items as no-number definition MC — the student never
performs any mathematics for that lesson. S4 is the extreme: 90 items, all labelled `difficulty: "High"`,
76% of them pure vocabulary.

---

## P0 findings

### F1 — `ccss-textbook-practice-v1-inequalities-q01` | P6 (G6) | lesson `inequalities` | **P0** | multi-correct MC

```json
{"id":"ccss-textbook-practice-v1-inequalities-q01","grade":"P6","difficulty":"Medium",
 "standardIds":["6.EE.B.8"],"prompt":"Which value makes x > 3 true?",
 "options":["5","3","1","6"],"answer":"5","acceptedAnswers":["5"],
 "explanation":"5 is greater than 3."}
```

`"6"` is the padded distractor (upstream choices were `5 | 3 | 1`; `synthesizeNumericDistractors`
emitted `answer + 1 = 6`). **6 > 3 is true**, so the item has two correct options and a student who
picks 6 is marked wrong while being right.
**Why it matters:** this is the generic failure mode of the numeric synthesizer on any "which value
satisfies…" stem — the synthesizer has no notion of the predicate, only of the key's numeric value.
**Fix:** replace `6` with a non-satisfying value (e.g. `0` or `2`); add a build-time rule that refuses
numeric synthesis for stems matching `/which .*(makes|satisfies).*true/i`.

### F2 — `ccss-textbook-practice-v1-divide-two-digit-q02` | P5 (G5) | lesson `divide-two-digit` | **P0** | key contradicts the rounding it demands

```json
{"id":"ccss-textbook-practice-v1-divide-two-digit-q02","grade":"P5","type":"fill-in",
 "standardIds":["5.NBT.B.6"],
 "prompt":"Estimate 432 ÷ 16 by rounding 16 to 20: 432 ÷ 20 ≈ ? (whole number)",
 "answer":"21","acceptedAnswers":["21"],
 "explanation":"432 ÷ 20 = 21.6 → about 21."}
```

432 ÷ 20 = 21.6. The stem demands a whole number; **21.6 rounds to 22**. The explanation asserts
"21.6 → about 21", which is a false rounding claim, and `acceptedAnswers` is `["21"]` only, so the
student who rounds correctly is marked wrong. The pack's own sibling item proves the standard is
known: `circle-pi-q02` (S1) answers `31` for 31.4 **and** accepts `31.4`.
**Fix:** either set answer `22` (+ accept `21.6`), or restate as "…≈ ? (round down to a whole number)"
and accept both `21` and `22`. Correct the explanation either way.

---

## P1 findings

### F3 — `ccss-textbook-practice-v1-scaled-graphs-q01` | P3 (G3) | lesson `scaled-graphs` | **P1** | stem contradicts its own key

```json
{"id":"ccss-textbook-practice-v1-scaled-graphs-q01","grade":"P3","type":"fill-in",
 "standardIds":["3.MD.B.3"],
 "prompt":"Each 📕 stands for 5 books. A row shows 4 books. How many books is that?",
 "answer":"20","acceptedAnswers":["20"],"explanation":"4 × 5 = 20."}
```

The stem literally says the row shows **4 books**; the key requires reading it as 4 *symbols*. A
literal reader answers `4` and is marked wrong. The sibling item is worded correctly and proves the
intent — `scaled-graphs-q02`: *"Each symbol = 10. A room shows 6 **symbols**. How many?"*
**Fix:** change to "A row shows 4 book symbols."

### F4 — `ccss-textbook-practice-v1-add-subtract-bignum-q03` | P4 (G4) | lesson `add-subtract-bignum` | **P1** | distractor prints false arithmetic

```json
{"id":"ccss-textbook-practice-v1-add-subtract-bignum-q03","grade":"P4",
 "standardIds":["4.NBT.B.4"],"prompt":"A good estimate to check 3,648 + 1,875 is…",
 "options":["3,600 + 1,900 = 5,500","3,000 + 1,000","10,000","4,000 + 2,000 = 9,000"],
 "answer":"3,600 + 1,900 = 5,500","explanation":"Round to hundreds."}
```

The padded option **"4,000 + 2,000 = 9,000"** is arithmetically false (it is 6,000). Worse, rounding to
thousands *is* a legitimate estimation strategy — the only thing making the option wrong is a bogus
sum shown to a Grade 4 student who is being taught exactly this operation.
**Why the gate misses it:** `audit-us-math-item-quality.mjs` validates arithmetic claims inside
*explanations*, not inside *option text*.
**Fix:** `4,000 + 2,000 = 6,000` is still wrong-as-an-answer only by being a coarser estimate — prefer
a cleanly wrong distractor such as `3,600 + 1,900 = 4,500`.

### F5 — `ccss-textbook-practice-v1-function-notation-q03` | S3 (G9) | lesson `function-notation` | **P1** | key text is mathematically wrong

```json
{"prompt":"A sequence is a function whose domain is…",
 "options":["the integers (counting numbers)","all real numbers","negative numbers",
            "all real numbers between 0 and 1"],
 "answer":"the integers (counting numbers)","explanation":"Sequences are indexed by n."}
```

The keyed option is self-contradictory: the integers ≠ the counting numbers. A sequence's domain is
the natural numbers (or an initial segment of them) — **not** ℤ, which includes negatives. F-IF.3 says
"a subset of the integers"; the parenthetical destroys that. A student who knows the distinction
cannot pick a correct option.
**Fix:** "a subset of the integers (usually 1, 2, 3, …)".

### F6 — `ccss-textbook-practice-v1-protractor-q01/q02/q03` | P4 (G4) | lesson `protractor` | **P1** | practice drifted off the lesson and off the standard

Lesson summary: *"Measure and name angles in degrees — acute, right, and obtuse."* Standard `4.MD.C.6`
= "measure angles in whole-number degrees **using a protractor**; sketch angles of specified measure."
All three items instead hand the student the measure and ask for the name:

```
q01 "An angle of 90° is…"   → a right angle
q02 "An angle of 45° is…"   → acute
q03 "An angle of 120° is…"  → obtuse
```

Nothing measures, nothing sketches. This is 4.G.A.1 vocabulary tagged as 4.MD.C.6, and it is
strictly easier than the lesson. It is also **unfixable inside this pack** — measuring requires a
figure, and per S4 this pack can never carry one.
**Fix:** either attach a protractor figure archetype (extend `usCaliforniaPracticeFigures.ts` to
`ccss-textbook-practice-v1-` ids) or retag these three to `4.G.A.1` and add real 4.MD.C.6 practice
elsewhere.

### F7 — lesson `constructions` (S4) and `units-quantities` (S6) | **P1** | practice trivially easier than the lesson

`constructions` — lesson: *"Step through the perpendicular-bisector construction, and inscribe a
regular hexagon in a circle."* Standards G-CO.12/13 require **performing** constructions. All three
items are vocabulary MC (`constructions-q03`: "Classic constructions use only a… compass and
straightedge"). Zero construction performed.

`units-quantities` — lesson: *"Chain unit factors so miles and hours cancel — dimensional analysis,
plus choosing sensible precision."* Practice:

```
q01 "Convert 2 hours to minutes."                 → 120   (this is 4.MD.A.1)
q03 "How many feet are in 3 miles? (1 mi=5280 ft)"→ 15840 (this is 5.MD.A.1)
q02 "…unit factors so that…"                      → "ft and s cancel" (vocabulary)
```

Two of three are single-step elementary conversions; none chains unit factors; none touches N-Q.3
(precision). Yet all three are `grade: "S6"` (Grade 12) and `difficulty: "High"`.
**Fix:** author at least one genuine two-factor conversion (e.g. "88 ft/s in mi/hr") per lesson.

### F8 — 12 visual-manipulative lessons with zero-compute practice | **P1** | figure gap laundered into recall

Lessons whose summary is explicitly about reading/manipulating a visual, and whose entire practice set
is no-number definition MC:

```
S1 cross-sections        S3 graphs-and-solutions   S4 constructions          S4 set-operations-events
S2 graph-stories         S3 graph-inequalities     S4 volume-arguments       S4 two-way-probability
S3 fit-function-residuals S5 sampling-inference    S4 solids-cross-sections  S6 random-variables
```

Example: `two-way-probability` — lesson is *"Read joint, marginal, and conditional probabilities
straight from a two-way table"*; all three items are definitions ("A joint probability … divides a cell
by the… grand total"). No table is ever read, because no table can be rendered.
**Fix:** these are the priority queue for a table/Venn/graph figure archetype, or for prose-embedded
data (the `picture-graph` P1 items show the pattern works: state the counts in text, then compute).

### F9 — High-school grade assignment is derived from an unrelated topic map | **P1** | systemic misplacement

Upstream tags every HS lesson `gradeId: "HS"`. The build assigns S3–S6 (G9–G12) from
`assignments.json` home topics, not from course content. Demonstrable misplacements:

| lesson | standards | assigned | should be |
|---|---|---|---|
| `geometric-series` | A-SSE.4 | **S4** (G10 Geometry) | Algebra 2 — likely matched on the word "geometric" |
| `interpret-expressions` | A-SSE.1/2 | **S4** (G10 Geometry) | Algebra 1 |
| `conic-sections` | G-GPE.2/3 (+) | **S3** (G9 Algebra 1) | Algebra 2 / Precalc |
| `matrix-equations` | A-REI.8/9 (+) | **S3** (G9) | Precalc — and its siblings `matrices`, `matrix-algebra`, `matrix-transformations` all sit at **S6** |
| `equation-of-circle`, `coordinate-proofs`, `partition-segment`, `coordinate-perimeter-area` | G-GPE.* | **S3** (G9) | Geometry (G10) |
| `units-quantities` | N-Q.* | **S6** (G12) | Algebra 1 (G9) |
| `quadratic-vertex-form`, `exponential-vs-linear` | F-IF.7/8, F-LE.1/3 | **S5** (G11) | Algebra 1 (G9) |
| `geometric-modeling` | G-MG.* | **S6** (G12) | Geometry (G10) |

This is also the direct cause of the lumpy distribution (S4=90, S3=84, S6=54, S5=51) and, via S2,
of the wrong `difficulty` on every one of those items.
**Fix:** map HS lessons to courses by their standard's domain (N-Q/A-SSE/A-REI/F-IF/F-LE/S-ID → Alg 1;
G-* + S-CP → Geometry; F-TF/N-CN/A-APR/S-IC → Alg 2; N-VM/(+) → Precalc), not by topic-map adjacency.

---

## P2 findings

### F10 — Degenerate padded distractors reduce many 4-option items to 3-way (or 2-way) guesses

Repeated throwaways across the pack: `"cannot tell"` ×21, `"cannot compare"` ×7, `"Cannot tell"` ×4,
`"both"`/`"neither"` ×5 each, `"Only sometimes"` ×2. Plus category-error singletons:

- `compare-groups-q01` (K) — "A group of 7 and a group of 4 — which is greater?" options `7 | 4 | They are equal | **11**`. 11 is neither group.
- `compare-three-digit-q01` (P2) — "Which is greater, 324 or 319?" distractor **`643`** (= 324+319).
- `compare-two-digit-q01` (P1) — distractor **`80`**.
- `time-five-minutes-q01` (P2) — "minute hand points to the 4" distractor **`21`** (= 20+1); not a clock quantity.
- `compare-groups-q02` (K), `compare-two-digit-q02` (P1), `compare-three-digit-q02` (P2) — `< | > | = | **+**` (from `patternDistractors`, 3 occurrences).
- `make-ten-to-add-q03` (P1) — options `3 and 2 | 1 and 4 | 4 and 1 | **2 and 2**`: "1 and 4"/"4 and 1" are the same decomposition, and "2 and 2" doesn't sum to 5. Effectively a 2-way item.

**Fix:** the curated-distractor table should be reviewed for plausibility, not just for
non-duplication; `patternDistractors`' `"+"` rule should be dropped.

### F11 — Cross-grade item recycling

```
375 ÷ 15 = ?                                divide-two-digit-q03 (P5)  == divide-multidigit-q02 (P6)
4x + 3x = ?                                 equivalent-expressions-q02 (P6) == linear-expressions-q02 (S1)
3(x + 2) …                                  equivalent-expressions-q01 (P6) ≈ linear-expressions-q01 (S1)  [identical options]
A right triangle has legs 3 and 4…          pythagorean-theorem-q01 (S2) == solve-right-triangles-q02 (S4)
Which display shows every individual value? data-displays-q03 (P6) ≈ statistical-displays-q01 (S3)
A cone's volume is ___ of its cylinder      volume-3d-q02 (S2) ≈ volume-formulas-q01 (S4)
sin²θ + cos²θ = ?                           trig-identities-q01 (S5) ≈ unit-circle-q03 (S5)
```

A student on the CA track can be served the same item in two different grades. G6→G7 duplication is
the worst case (`4x + 3x` as both a 6.EE and a 7.EE item).

### F12 — Circular / self-answering stems

- `partition-equal-areas-q02` (P3): "Equal-**area** parts must have the same… → **area**"
- `equal-shares-q02` (P2): "Equal shares … must be the same… → size"
- `line-plot-operations-q02` (P5): "To share a total **equally** … you → **divide**"
- `multistep-rational-q03` (S1): "To check that an answer is reasonable, you → estimate"

### F13 — Loose or imprecise mathematical claims (all coherent with their lesson, so not drift)

- `compose-shapes-q01` (K) "Two triangles can be joined to make a **square**" — true only for two congruent right isosceles triangles. The lesson narration makes the same claim (`ccssTextbookNarrations.ts`: *"Two triangles can make a square"*), so this is a source-level looseness, not practice drift. Same for `compose-2d-q02` (P1, two trapezoids → hexagon: pattern-block-specific).
- `complex-solutions-q03` (S6): "a degree-n polynomial has **exactly n complex roots**" — needs "counting multiplicity" in the option, not only in the explanation.
- `slope-unit-rate-q01` (S2): "A steeper line represents a **greater unit rate**" — false for negative slopes.
- `compare-length-q03` (K): "Which of these can you **measure**?" keyed `length`, but the explanation silently changes the question to "is it a length" ("color and sound are not lengths"). A song's duration is measurable.
- `compare-functions-q01` (S3) / `functions-intro-q02` (S2): "g with rate 5" never states g is linear.
- `build-functions-q01` (S5): recursive rule `aₙ = aₙ₋₁ + 2` given without an initial condition.

---

## Clean negatives (checked, no defect found)

- **Chain-of-thought leakage: 0 items.** Regex over all 810 prompts + explanations for `Wait,|Let me reconsider|Hmm|Actually,|I need to|Let's see|On second thought` → no hits. Explanations are uniformly terse and grade-appropriate.
- **Unanswerable figure prompts: 0 items.** 14 prompts contain figure vocabulary; all are either self-contained (numbers stated in prose, e.g. `picture-graph-q01`, `line-plot-q02`) or use "figure/graph" as an abstract noun (`congruence-q01`, `inverse-functions-q02`). Despite S4 (no figures possible), no item is unanswerable for lack of a visual.
- **`standardIds` existence: 385/385 resolve** against `data/ccss/{grades-k2,grades-35,grades-68,grade-hs,practices}.ts`. Zero phantom codes. (Attribution granularity is the problem — S3 — not validity.)
- **K–G3 arithmetic (198 items): zero wrong keys.** Re-solved every fill-in and every numeric MC.
- **HS mathematics: zero wrong keys** across 138 re-solved computational items in S3–S6, including
  `rewrite-expressions-q01` (x²+6x+5 = (x+3)²−4 ✓), `matrix-equations-q03` (det = 5 ✓),
  `geometric-series-q01/q03` (80 ✓, 31 ✓), `matrix-transformations-q02` (det = 4 ✓),
  `decisions-probability-q02` (10·0.15−2 = −0.5 ✓), `estimate-population-q03` (52%±3% → 49–55% ✓),
  `permutations-combinations-q02/q03` (5P3=60 ✓, 4C2=6 ✓), `complex-conjugates-q02/q03` (5 ✓, 25 ✓),
  `trig-symmetry-q03` (sin(180°−θ)=sinθ ✓), `inverse-trig-q03` ([−90°,90°] ✓).
- **`acceptedAnswers` for decimal/fraction fill-ins** is well curated where it exists
  (`multiply-mixed-numbers-q02` accepts `4.5 / 4 1/2 / 9/2`; `line-plot-operations-q03` accepts
  `1.5 / 1 1/2 / 3/2`; `circle-pi-q02` accepts `31 / 31.4`). F2 is the one place the pattern was missed.
- **No wrong-form keys found.** No item asks for simplest radical / exact form and keys a decimal.

---

## Coverage per grade — is it defensible?

```
K  30   P1 45   P2 63   P3 60   P4 78   P5 60   P6 69
S1 60   S2 66   S3 84   S4 90   S5 51   S6 54
```

K–G8 is defensible: the count tracks the number of CCSS lessons in the grade (3 items per lesson,
uniformly), and K is small because Kindergarten genuinely has 10 lessons. **G9–G12 is not
defensible**: the span is not a curriculum decision at all, it is the fallout of F9 — every HS lesson
is `gradeId: "HS"` upstream and lands in a course by topic-map adjacency. S4=90 is inflated by the
whole S-CP probability strand plus mis-shelved `geometric-series` and `interpret-expressions`;
S5=51 is depressed correspondingly. Fix F9 and the distribution self-corrects.

Also note: 3 items per lesson, uniformly, for all 270 lessons. There is no item-count weighting by
standard importance or by major/supporting/additional cluster.

---

## Gate baseline (verified this session)

`node scripts/audit-us-math-item-quality.mjs` was run read-only. It loads
`ccss-textbook-practice-v1 [authored]: 810` and emits **zero findings of any severity** against it —
all 10 reported findings belong to the Arkansas packs:

```
Findings: 10 (P0: 0, P1: 0, P2: 10)   # every one is us-ar-*
```

The two blind spots that matter are structural, not tuning:

- `auditStructure` (line ~656) declares `multiple-correct-options` only when an option is
  **numerically equal to the answer** (`nearlyEqual(optionValue, answerValue)`). It compares option
  values to the key's value, never the option against the *stem's predicate* — so `5` vs `6` on
  "which value makes x > 3 true" is structurally invisible (F1).
- `auditArithmeticClaims` (line ~753) scans `explanation` + `independentSolution`. It never reads
  `options[].en`, so a false equation printed as a choice passes (F4).
- `LEAK_RE` (line 828) is present and working — it caught two Arkansas items this run — which
  corroborates the clean-negative result that this pack has no CoT leakage.

## Suggested gate extensions (would have caught these)

1. **MC predicate check** — for stems matching `which .*(value|number).*(makes|satisfies)`, evaluate
   every option against the predicate; fail on >1 satisfying option. (catches F1)
2. **Option-text arithmetic check** — extend the existing explanation-arithmetic validator to
   `options[].en`. (catches F4)
3. **Rounding-consistency check** — for fill-ins whose explanation contains `X → Y`, verify Y is a
   correct rounding of X, or that both are in `acceptedAnswers`. (catches F2)
4. **Stem/key unit check** — flag fill-ins where the stem's stated quantity equals a non-key option
   of the arithmetic (catches F3's "shows 4 books" / key 20).
5. **Provenance honesty** — an item whose option set was machine-padded must not claim
   `manualQaStatus: "accepted-ccss-textbook-hand-check"`; emit `"auto-padded-options"` instead. (S1)
6. **Difficulty non-degeneracy** — fail if `distinct(grade, difficulty)` pairs == `distinct(grade)`. (S2)
7. **Duplicate prompt across grades** — exact-match prompt in two different `grade` values. (F11)
