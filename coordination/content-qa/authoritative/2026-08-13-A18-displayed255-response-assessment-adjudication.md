# A18 Displayed-255 Response and Assessment Adjudication — HOLD Implementation Contract

Status: `HOLD / NOT AUTHORIZED FOR INTAKE`

Date: 2026-08-13 HKT

This report binds the focused adjudication of candidate response-form, grading,
prompt-completeness, diagram-caption, and multiple-choice distractor findings in
the exact 255 questions selected by the 51 live Hong Kong lessons. It is a
decision and implementation contract only. It does not authorize copying,
merging, staging, committing, deploying, or editing the HK visualization
recipient.

The final disposition is:

- 16 unique true-defect question IDs;
- 18 independent defect instances, because the tank row and the decimal
  number-line row each have two defects;
- 3 candidate IDs are explicitly `NOT DEFECT` and must not be swept into a
  broad equivalence repair;
- combined with the separately frozen 61-row explanation contract, the current
  displayed repair queue is 74 unique rows and 79 independent issue instances;
- the overall HK `/goal` remains open.

## 1. Source and preimage binding

The two independent displayed-255 reconstructions were byte-bound to the
following question, renderer, response-contract, and answer-matching sources:

```text
bf630d7030ded9537005c96ca0c7043698c72a0b25b70bca68b618f480347270  data/questions.ts
bf3149ac767e7819e357ff1e34e25fb4c64833882b49f27bb73e827caed047ae  components/practice/QuestionFigure.tsx
f64619cc66dec51979174a51c87a77ba45d8e97251210a61d3627d6efa73d7d0  lib/questionFigure.ts
6e65409f18902bf1e905501396a82ec0c982ea851ed2d314bdf5c542ba4023e5  lib/server/questionResponseContracts.ts
32e1f64d9cb1cded405e0c16deb62d5403ef9ae70d8545964ad31bef046eb794  lib/server/questionResponseContracts.test.ts
7173bb8753cf12824dd272a0ee2e37f00f5bea91119351d92ec727bb4edf3ffe  lib/server/answerMatching.ts
420f560d02128d632f07a13f60d2699dcc15b1e64c5fd6aaf62db3552268c3ef  lib/server/answerMatching.test.ts
7c415c8a8e22ee6d793a3a7a8fd2c12e79d858adc880236516ad5113e490d054  data/topics.ts
aae31b33f203e3ac66537419480e28f5f55408193209ee79f49cdb3b30292c4b  components/lesson/LessonView.tsx
2254b2d9ad0a318d710f533f57f5df02b98660922ee44d63db4608cadb4056dd  lib/hongKongQuestionVersioning.ts
```

The independent displayed manifests were equivalent and used two explicit
serializations:

```text
70e1a1b6ad70d319eb38bc34871a8c453e9629876740440322696d702c5528d0
  NN<TAB>grade<TAB>topicId<TAB>id1,...,id5<LF>

5562f9c6abce1d208378ad5ad2c7bc07b6c0adf3bf0f02f9ecfd0e3dda3281b2
  grade|topicId|production-route-slug|id1,...,id5<LF>
```

Both reconstructions produced exactly 51 lessons, 5 rows per lesson, 255
unique displayed question IDs, and an empty intersection with the 701-row EASE
bank. A later z-score-only edit to `data/lessons.ts` does not alter this
question selection or any source bound above.

This report path was absent before materialization. No question, renderer,
response-contract, answer-matching, lesson-view, recipient, or EASE successor
file was changed to create it.

The companion explanation adjudication is authoritative and must be applied as
the same versioned package:

```text
/Volumes/Starship/MAIS-hk-content-qa-wt/coordination/content-qa/2026-08-13-A18-displayed255-explanation-adjudication.md
SHA-256 d86746cf2fc44cbe7f66ab22c86668340db72e1687dfaaeff2e45c5c7e0f7d55
```

## 2. Exact 16 true-defect IDs

1. `supp-p3-multiplication-division-guided-example-v2`
2. `q2`
3. `supp-algebra-basics-key-fact`
4. `q18`
5. `supp-polynomials-key-fact-v2`
6. `supp-polynomials-guided-example`
7. `hk-s3-identities-square-patterns-1`
8. `supp-identities-square-patterns-key-fact`
9. `q10-v2`
10. `supp-differentiation-intro-key-fact-v2`
11. `supp-calculus-guided-example-v2`
12. `supp-p5-volume-key-fact-v2`
13. `graph-p4-decimals-number-line`
14. `supp-linear-equations-first-step-v2`
15. `supp-trigonometry-s5-first-step-v2`
16. `supp-differentiation-intro-first-step-v2`

## 3. Quotient-and-remainder response contract

### Affected ID

`supp-p3-multiplication-division-guided-example-v2`

The prompt asks for the number each pupil receives and the remainder, but does
not prescribe one prose serialization. The production typed-answer surface
must use a semantic quotient-and-remainder contract rather than an expanding
list of exact string aliases.

Required positive cases for quotient 11 and remainder 3 include:

```text
11 each, 3 remain
11 each remainder 3
11 remainder 3
11R3
商11餘3
每人11張，餘3張
```

Required hard negatives include:

```text
3R11
11R4
11
14
```

The parser must reject any remainder less than zero or greater than or equal to
the divisor 4. It must bind the quotient and remainder as separate integers;
substring matching or accepting either number alone is not sufficient.

## 4. Algebraic-equivalence response contract

### Affected IDs

```text
q2
supp-algebra-basics-key-fact
q18
supp-polynomials-key-fact-v2
supp-polynomials-guided-example
hk-s3-identities-square-patterns-1
supp-identities-square-patterns-key-fact
q10-v2
supp-differentiation-intro-key-fact-v2
supp-calculus-guided-example-v2
```

These typed-answer prompts assess algebraic value or expansion, not a single
factor serialization. The current grader arbitrarily rejects commuted numeric
and variable factors, and in one derivative row rejects an equivalent sum of
like terms.

Required positive examples include:

```text
q2                                           x*5       == 5x
supp-algebra-basics-key-fact                 a*7       == 7a
q18                                          x^2+x*5+6 == x^2+5x+6
supp-polynomials-key-fact-v2                 x^2*7     == 7x^2
supp-polynomials-guided-example              x^2+x*4   == x^2+4x
hk-s3-identities-square-patterns-1           a^2+a*b*2+b^2 == a^2+2ab+b^2
supp-identities-square-patterns-key-fact     b*2*a     == 2ab
q10-v2                                       x+x       == 2x
supp-differentiation-intro-key-fact-v2       x^2*3     == 3x^2
supp-calculus-guided-example-v2              x*8       == 8x
```

The minimal safe implementation is a real polynomial/monomial normalizer:

- allow explicit or implicit multiplication;
- allow numerical and variable factors in any commutative order;
- combine repeated powers of the same variable;
- aggregate like terms before comparison;
- preserve signs and exponents exactly;
- fail closed on unsupported functions, malformed syntax, division by a
  variable, or expressions outside the intended polynomial domain.

Do not implement these cases as ten isolated aliases. Required negatives must
include wrong coefficients, wrong signs, wrong powers, missing terms, and
extra nonzero terms for every affected structural family.

## 5. Cuboid-tank prompt and unit contract

### Affected ID

`supp-p5-volume-key-fact-v2`

This row has two independent defects.

### 5.1 Shape is not entailed

“A tank” / 「一個水箱」does not establish that the object is a cuboid. The
calculation `V=lwh` and `h=48/(4*3)=4 cm` therefore do not follow from the
standalone prompt.

Required prompt hardening:

- EN must say `a cuboid tank` or `a rectangular tank`;
- ZH must say `一個長方體水箱`;
- the explanation must explicitly identify height as the unknown and divide
  volume by base area.

### 5.2 Equivalent unit is currently rejected

The current prompt does not explicitly demand centimetres, so `0.04 m` is a
mathematically equivalent height. One of these two contracts must be chosen and
tested explicitly:

1. keep the prompt unit-neutral and accept convertible length units, including
   `4 cm` and `0.04 m`; or
2. add an explicit bilingual instruction to answer in centimetres, then an
   exact-centimetre response policy is defensible.

Silently retaining a unit-neutral prompt while rejecting `0.04 m` is not
acceptable. Required negatives include wrong dimensions, multiplication rather
than division, and dimensionally invalid volume units for the height answer.

## 6. P4 decimal number line

### Affected ID

`graph-p4-decimals-number-line`

This row has two independent defects.

### 6.1 The response form is part of the objective

The prompt asks “What decimal does P represent?” / 「P 代表哪個小數？」.
Generic numeric equivalence currently accepts `37/10`, which is the same value
but not a decimal numeral.

Add an ID-scoped decimal-numeral response contract with numeric target 3.7:

Required positives:

```text
3.7
3.70
3.700
```

Required hard negatives:

```text
37/10
3 7/10
370%
3.7e0
```

The learner response must contain an ordinary decimal point and evaluate to
3.7. Changing the prompt to a generic “What value?” would weaken the intended
P4 decimal objective and is not the preferred repair.

### 6.2 Visible semantic caption leaks the answer

`QuestionFigure` renders the semantic number-line summary as an ordinary
visible `<figcaption>`. The current summary states `P = 3.7` (and the Chinese
equivalent) before the learner submits an answer.

The fix must preserve equivalent solve-able visual semantics rather than
simply hiding the caption. An acceptable contract is:

- EN: `Number line from 3 to 4 in steps of 0.1. Point P is on the seventh small tick after 3.`
- ZH: `數線由 3 到 4，每小格表示 0.1。點 P 位於 3 之後第七個小刻度。`

All supported Chinese variants must preserve that meaning. The rendered
caption and accessible name must not directly contain `P = 3.7`, `P equals
3.7`, `P represents 3.7`, or their Chinese equivalents. A render-level hard
negative and a real browser assertion are required in addition to source tests.

## 7. Three ambiguous distractors and exact replacements

These three rows are also covered by the 61-row explanation report. Replace
the distractor before generating the learner-facing explanation.

### 7.1 `supp-linear-equations-first-step-v2`

Superseded:

- EN: `Divide by the coefficient before undoing an added constant`
- ZH: `未消去所加常數，便先除以係數`

This can be a valid operation when both sides of the equation are divided.

Replacement:

- EN: `Divide only the variable term by its coefficient while leaving the constant and the other side unchanged.`
- ZH: `只把含變量的一項除以係數，常數項和方程另一邊保持不變。`

### 7.2 `supp-trigonometry-s5-first-step-v2`

Superseded:

- EN: `List periodic solutions before checking the required interval`
- ZH: `未檢查題目指定區間，便先列出週期解`

Generating general solutions and then filtering by the interval is a standard
valid workflow.

Replacement:

- EN: `Give only one principal value and never generate or check the other solutions in the required interval.`
- ZH: `只寫一個主值，不列出或檢查指定區間內的其他解。`

### 7.3 `supp-differentiation-intro-first-step-v2`

Superseded:

- EN: `Reduce the exponent before multiplying by the original exponent`
- ZH: `未乘原來指數，便先把指數減一`

The two power-rule substeps can be written in either order if the original
exponent is retained.

Replacement:

- EN: `Reduce the exponent by one but never multiply by the original exponent.`
- ZH: `只把指數減一，卻沒有乘以原來的指數。`

For each row, tests must prove exactly one defensible best option remains in EN
and ZH and must hard-reject the superseded bilingual phrases.

## 8. Exact three candidate non-defects

These findings were independently adjudicated and must not be converted into
broad correctness aliases.

### 8.1 `pq-p2-multiplication-foundations-1-v2`

`NOT DEFECT`. This is multiple choice. The displayed `3 x 4` represents the
lesson’s stated convention of three groups of four. `4 x 3` is not a rendered
choice and, although product-equivalent, does not encode the assessed grouping.

### 8.2 `supp-p2-multiplication-foundations-key-fact-v2`

`NOT DEFECT`, with nonblocking prompt hardening recommended. Under the lesson
convention, `6+6+6+6` is four addends of six and is represented by `4 x 6`.
The prompt may be clarified to say “number of addends x value of each addend,”
but `6 x 4` must not automatically be accepted as the same representation.

### 8.3 `pq-p3-multiplication-division-2-v2`

`NOT DEFECT`. This is multiple choice and the learner selects `10 full groups,
3 remain`. A typed string such as `10R3` is unreachable on this production
surface. The quotient-and-remainder parser belongs only to the typed guided
example identified in section 3.

## 9. Version, history, and acceptance gates

Every learner-facing content or response-contract change must use the existing
HK question versioning, retirement, historical projection, and response
contract lineage. Existing historical snapshots are immutable. The successor
must derive the exact active-version promotions from current bytes; it may not
rewrite old history or treat a generator change as non-material merely because
many rows share one template.

Minimum acceptance evidence before this package can leave HOLD:

1. exact current-source preimage and postimage SHAs for every changed path;
2. exact 16-ID/18-instance row ledger, with the three non-defects preserved;
3. the 61-row explanation contract applied in the same versioned package;
4. positive and hard-negative tests for quotient/remainder, polynomial
   equivalence, unit handling, decimal notation, caption leakage, and all three
   distractors;
5. independent EN/ZH read-back and mathematical re-solve of every changed row;
6. reconstruction of the production 51x5 selection after edits, proving 255
   unique IDs and `displayed255 intersection EASE701 = empty`;
7. two independent post-repair zero sweeps of all 255 displayed rows;
8. render/browser proof for the visible caption and production answer paths,
   with every mutable E2E artifact under `/Volumes/Starship`;
9. A18 content approval, A23 promotion review, A11 regression evidence, A22
   release readiness, and A25 exact-path intake review.

Until all gates pass, the only honest verdict is `needs-repair / HOLD`. This
report does not establish that the 701 EASE rows, all 1,003 HK questions, the
51 lesson pages, the 102 LessonView browser cells, the 918 visualization cells,
or the overall HK curriculum are green.
