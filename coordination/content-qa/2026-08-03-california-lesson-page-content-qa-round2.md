# California Math — Lesson-Page Content QA — 2026-08-03 (round 2)

Round 2 audits the **lesson core** the California math lesson page renders: the
270 ported CCSS interactive lessons that supply 286 of the page's 614 blocks.
Round 1 (`2026-08-03-california-lesson-page-content-qa.md`) covered the
surrounding generated and templated copy and left this layer's static prose
verified but its *mathematical claims* and *live interaction copy* unreviewed.

| # | Standard | Round-2 result |
|---|---|---|
| 1 | **Mathematical accuracy** — every claim in a lesson's Math Check is true as stated | 3 defects fixed (all 270 claims read) |
| 2 | **Standards alignment** — a CCSS code cited in a Math Check is one the lesson is registered under | 1 defect fixed |
| 3 | **Interaction copy** — sentences built from live control values read correctly at *every* value the control allows | 19 defects fixed across 9 lessons |
| 4 | **Claim/control consistency** — an "always" claim must hold in every state the lesson's own controls can reach | 1 defect fixed |

**28 → 0** on the new gate (`npm run audit:ccss-lesson-interaction`).

New tooling:

- `scripts/audit-ccss-lesson-interaction.mjs` — checks plural agreement against
  each control's actual minimum and cross-checks Math Check citations against
  `ccssTextbookRegistry`. Verified to fire: 28 findings against `HEAD`, 0 after.

## 1. Mathematical accuracy — 3 defects

### `arithmetic-patterns` — false claim about multiples of 9

The Math Check read *"multiples of 9 **have digits that sum to 9**."* The grid
on screen runs 1–100 and highlights 9, 18, …, 90, **99** — and 9 + 9 = 18, not
9. The claim was falsified by a number the student is looking at while reading
it. Corrected to "have digits that sum to a multiple of 9 (9, 18, 27, …)".

### `complex-solutions` — Fundamental Theorem of Algebra stated without multiplicity

*"…guarantees a degree-n polynomial has exactly n complex roots (N-CN.9)."*
False as written: (x − 1)² has degree 2 and one root. Corrected to state
"when each is counted with its **multiplicity**", with that example inline —
a student solving quadratics with a zero discriminant meets this case directly.

### `multiply-fractions` — "always" claim reachable-falsifiable by its own control

The Math Check asserted *"the product of two proper fractions is always smaller
than either factor."* The numerator stepper allows `num = den` (3/3 = 1), a
state in which the on-screen product **equals** the other factor. The sentence
is defensible in isolation — 3/3 is not a proper fraction — but the lesson
gives the student no way to see that distinction. Rewritten to cover every
reachable state: multiplying by a fraction less than 1 shrinks; multiplying by
a fraction equal to 1 leaves the amount unchanged. This is closer to what
5.NF.B.5 actually asks for.

## 2. Standards alignment — 1 defect

`ratio-double-number-line` cited **6.RP.A.2** and defined the unit rate of the
ratio a : b as **b ÷ a**. Two problems, both visible on the same lesson page
(6-A.1 Ratios, Rates, and Percent Reasoning renders both lessons):

- CCSS 6.RP.A.2 pairs the ratio a : b with the unit rate **a/b**, and the
  sibling `unit-rate` lesson — which *is* registered under 6.RP.A.2 — states it
  that way. A student read two contradictory definitions of the same standard
  in one page.
- The lesson is registered under 6.RP.A.1 and 6.RP.A.3 only; 6.RP.A.2 belongs
  to `unit-rate`.

Fixed by stating the invariant in terms of the lesson's own quantities ("every
equivalent pair holds the same rate: each cup of flour is paired with 1.50
spoons of sugar") and dropping the citation the lesson does not own. The
sibling lesson keeps the standard's own notation.

## 3. Interaction copy — 19 defects across 9 lessons

Every one is a sentence that reads correctly at the control's seed value and
breaks at its minimum. All nine controls allow the value 1:

| Lesson | Reads at the low end |
|---|---|
| `add-within-100` | "Taking away **1 tens** removes **1 rods**" (×2 sentences) |
| `arrays-repeated-addition` | "**1 rows** of 4 — that is 4 added **1 times**" (×2 blocks) |
| `fraction-as-division` | "**1 cookies** shared equally by 4 friends"; "that is **1 pieces** of size 1/4" |
| `multiply-by-tens` | "**1 groups** of 30 is **1 groups** of **1 tens**" |
| `multiply-divide-words` | "3 baskets have **1 apples** each" |
| `proportional-relationships` | "every y is **1 times** its x" |
| `rows-and-columns` | "**1 rows** × **1 columns**" — plus the SVG `aria-label`, so a screen reader hears it too |
| `two-step-problems` | "You buy **1 packs** of pens with **1 pens** in each" |
| `unit-rate` | "$5 for **1 apples**" (×3 places, including the Math Check) |

Fixed with the inline `x === 1 ? "" : "s"` guard already used in 30 other
lessons in this library — house style, no new abstraction.

Not a defect, deliberately left: `variables-expressions` renders "1 times a
number", which is idiomatic multiplication language. The gate's noun list
excludes "times" for this reason.

## Verified clean this round

- **All 270 Math Check claims read in full.** Beyond the three above, the
  mathematical content held up, including the cases most likely to be loose:
  sphere-fills-two-thirds-of-its-cylinder, arc = rθ and sector = ½r²θ, the
  triangle inequality's uniqueness clause, "rational + irrational is
  irrational" with its contradiction proof, `figure-symmetry`'s n-gon count,
  and `real-number-closure`'s correct refusal to claim anything about sums of
  two irrationals.
- **Standard citations** — 269/270 already consistent with the registry before
  this round.
- **Edge states** — no division by a control that can reach zero; the three
  candidate hits were matches inside comments.
- **Range-dependent claims** — `exponential-vs-linear`'s "eventually exceeds
  any linear function" is safe because its base slider is bounded below at 1.5;
  `area-model`'s distributive claim survives a degenerate split at 0 columns.

## Judgement calls worth recording

Three Math Checks state standard results without their usual side conditions:
`geometric-series` (a(rⁿ−1)/(r−1) omits r ≠ 1), `conditional-probability`
(P(A|B) = P(A and B)/P(B) omits P(B) > 0), and `roots` ("x² = p gives two
solutions" omits p > 0, though 8.EE.A.2 restricts p to positive rationals).
Left as written: each matches standard textbook phrasing at its grade band, and
in each case the omitted condition makes the expression undefined rather than
false. Flagging here so a later reviewer does not have to re-derive the call.

## Still open

Carried from round 1, unchanged — both belong to the visualization-lab owner:

1. Signature-lab template selection mismatches the lesson topic
   (`Congruence and Proof` → "right triangles" lab;
   `Quantities, Units, and Precision` → "statistics and distributions" lab;
   `Capstone Modeling` → same).
2. `labDescriptionForTopic` lowercases lesson titles ("explore 10-a.1
   congruence and proof"). Not on the lesson page; affects the lab catalog on
   every curriculum track.

## Round 3 queue

- Browser pass on the rendered page: confirm the interactive lessons mount,
  their controls respond, and the repaired sentences render as intended at
  their extremes. This round verified the copy statically at every reachable
  control value; it did not drive the components.
- Traditional/Simplified Chinese review of the California copy via the
  `audit:zh-hans` gate. The interactive CCSS lesson library is English-only by
  design, so this applies to the templated copy in `usCaliforniaLessons.ts`.

## Gates run

```
npm run audit:ccss-lesson-interaction     ✓ 270 lessons, 0 defects
npm run audit:us-ca-lesson-content        ✓ 76 lessons, 614 blocks, 0 defects
npm run test:ccss-textbook                ✓ class audit 276 files clean + 8/8 contract
npx tsc --noEmit -p tsconfig.json         ✓
npx tsx --test data/usCaliforniaLessons.test.ts
                                          ✓ 12/12
```
