# California Math — Lesson-Page Content QA — 2026-08-04 (round 8)

**23 defects fixed.** Round 8 partitioned three surfaces no earlier round had
opened, using a 546-agent workflow with two adversarial refuters per candidate.
One lens (locale) produced 9 high-severity candidates that adversarial
verification correctly refuted — see "Withdrawn" below.

| Lens | Partition | Coverage |
|---|---|---|
| **Locale** — the zh / zhHans copy against its English source | 8 slices | 76/76 pages |
| **Cross-block consistency** — blocks on one page disagreeing | 6 slices | 76/76 pages |
| **Accessibility text** — what a screen reader hears instead of the figure | 6 slices | 270/270 lessons |

262 candidates were produced; 33 were high severity. This report covers the
verified ones that were fixed, and states plainly what is left.

## Standard codes the app's own registry cannot resolve

**Data defect, not a visible one** — see the correction note below.

Every lab's `californiaAlignment.standardIds` for grades 6–8 cited its standards
without the cluster letter: `6.RP.1` where `data/ccss` has `6.RP.A.1`. All **81**
short ids in the lab catalog fail `findStandard()` outright, so any consumer that
joins the lab catalog to the standards registry resolves nothing. Each maps to
exactly one registry id (229 registry ids, zero ambiguous short forms), so the
rewrite was mechanical.

**Correction.** The first version of this report said these codes were visible on
18 lesson pages and that "a teacher scanning for 6.RP.A.2 had no way to tell".
That is wrong. The sentence carrying them lives in the visualization block's
`content`, and `LessonView.tsx:2143` blanks that content before render (see
"Withdrawn" below). Rendering `us-ca-math-p6-chapter-01` shows only
`6.RP.A.1, 6.RP.A.2, 6.RP.A.3`, from the teacher guide and the coverage line —
the short forms never reached a reader. The fix is still correct as a data-
integrity fix; it fixed nothing a student or teacher could see.

## The page promising content it never renders

`us-ca-math-p5-5-nbt-decimals` promised decimal **division** three times —
guided practice ("Add, subtract, multiply, and divide decimals to hundredths"),
teacher guide (5.NBT.B.7 attributed to "🧮 Decimal Arithmetic"), and that
lesson's own Math Check — while `decimal-operations.tsx` declared
`type Op = "add" | "sub" | "mul"` and opened with *"Decimals add, subtract, and
multiply."* Division is now a fourth tab.

`us-ca-math-p4-4-nbt-multi-digit` told students to *"Find 253 × 6 with an area
model"* under an area model hard-clamped to 11–99 on both factors, drawing
exactly four cells. Now 34 × 26.

## One page, two notations

27 strings across 9 pages wrote the times sign as the **letter x** — `5 x 4`,
`length x width`, and worst, `9 x 4 = 36` on `us-ca-math-p5-5-oa-expressions-patterns`,
a 5.OA page where `x` is about to become a variable — while every interactive
lesson on the same page renders `×`. Three more used a spaced slash for division
where the lessons render `÷`. Fractions (`1/4`, `2/6`) were left alone.

## Captions and labels describing a different figure

Four of these are follow-ons where a round-6 fix landed in the visible text and
missed the screen-reader text or a sibling file.

| Lesson | Said | Actually |
|---|---|---|
| `four-quadrant-plane` | "Point at (0, 3) in quadrant **none**" | the "none" I introduced in round 6 went straight into the accessible name |
| `systems-of-equations` | "two lines and **their intersection**" | static, in parallel / identical / off-grid states |
| `graphs-and-solutions` | "two functions and **their intersection**" | static, and at m = −1 none is drawn |
| `add-subtract-regroup` | "the little **red** mark" | drawn in `--band-early`, the orange token — same defect fixed in its sibling in round 6 |
| `volume-arguments` | "**sheared** stack of layers" | shear starts at 0; the stack is straight |
| `line-plot` | "the most common length — here, N cm" | unguarded for the all-zero state the figure's own sentence already handles |
| `compare-distributions` | "tightly clustered … spread out" | the figure is two panels of summary statistics; nothing is plotted |
| `circle-constructions` | "Angle bisectors meet at the incenter…" | no bisector of either kind is ever drawn |

## Controls a screen reader cannot tell apart

Eleven lessons had controls that a sighted user distinguishes by position and a
screen-reader user cannot distinguish at all:

- `multiply-fractions`, `divide-fractions` — the parent knows it is
  "Across"/"Down" or "Dividend"/"Divisor" and passed the literal
  "numerator"/"denominator" down: four controls, two names.
- `place-value-relationship`, `decimal-place-value` — digit tiles with **no**
  accessible name; the place and the value sat in unassociated sibling spans.
- `two-way-tables` — eight cell buttons sharing "decrease"/"increase".
- `expected-value` — eight payoff buttons with no name at all.
- `coordinate-perimeter-area` — twelve buttons announcing only an arrow glyph.
- `read-compare-decimals-thousandths`, `decimal-operations` — hard-coded ±10 /
  ±0.1 labels, identical across both steppers.
- `powers-of-ten` — the exponent is an inline `<sup>`, so the name concatenated
  to **"×102"**: a control for ×10² announcing "times one hundred and two", in a
  lesson about powers of ten.
- `complex-plane` — `aria-label="complex plane"`, static across all 14,641
  reachable states, with `role="img"` suppressing every text node inside.
- `real-number-closure` — two pickers rendering the identical item list.

## Withdrawn: the "mixed language" finding

Nine of the 33 high-severity candidates claimed the page is served in a mix of
English and Chinese. **They are wrong, and so was the first version of this
report.** The measurement was taken on the seed data and never checked against
what `LessonView` renders — the same mistake this QA effort keeps finding in the
content itself.

Two things the data-level measurement missed:

1. `components/lesson/LessonView.tsx:2143` passes the visualization block through
   `cleanLessonVisualizationContent`, which returns `""` for anything matching
   `/Safeguard Review[\s\S]*Read me first/i`. Every locale of that block matches.
   Checked across the corpus: **228 of 228** visualization strings (76 pages × 3
   locales) are blanked before render. The "one Chinese paragraph inside an
   English page" state does not exist.

2. English-only is enforced, not incidental.
   `tests/e2e/california-middle-school-textbook-english-only.spec.ts` logs in with
   `language: "zh"` and a `US_CA_MATH` profile and asserts no CJK on California
   surfaces.

Verified empirically rather than by reading source: logging in through the app's
own `/api/auth/login` with `language: "zh"` and `curriculumTrack: "US_CA_MATH"`,
then rendering both page types:

```
us-ca-math-p6-chapter-01        html.lang=en-HK   CJK lines: 0
us-ca-math-k-k-nbt-teen-numbers html.lang=en-HK   CJK lines: 0
```

The California lesson page is uniformly English in every reachable state. There
is no defect here, and the locale lens produced **zero** real findings. Its 8
slices are recorded as covered and clean.

The lesson for the method: a partition that reads the data layer has not audited
the page. Round 6 drove the browser; round 7 and this round's locale lens read
source. Any future lens over rendered copy must go through the render path.

## Also open, routed to the visualization-lab owner

Now with exact instances rather than the vague note carried since round 6. These
live in the same non-rendered alignment metadata as the codes above, so they are
a catalog-correctness issue rather than a visible one:

| Page | Its standards | Its lab is aligned to |
|---|---|---|
| `s2-chapter-01` | 8.NS.A.1–2, 8.EE.C.7–8 | 8.EE.A.1–4 (chapter 04's content) |
| `s2-chapter-04` | 8.EE.A.1–4, 8.G.B.6–8, 8.G.C.9 | 8.G.A.1–4 (chapter 03's content) |
| `s3-chapter-03` | A-REI.* | F-LE.1–4 (s5-chapter-02's content) |

Plus `p5-5-md-volume-data`, a volume unit, linking the "arrays and area" lab, and
`labDescriptionForTopic` lowercasing lesson titles mid-sentence.

## Not yet triaged

262 candidates were produced; this round fixed the verified high-severity ones
plus the standard-code sweep. **127 medium and 102 low** candidates remain
untriaged, and **13 verification agents failed on a usage limit** so their
findings are unverified — they are not counted as clean. Named files whose
verification did not complete: `permutations-combinations`,
`multiply-divide-words`, `multiply-divide-integers`, `multistep-rational`,
`place-value-blocks`, `polynomial-operations`, `position-words`.

Saying "round 8 is clean" would repeat exactly the error rounds 3 and 5 made.
It is not clean; it is 23 defects lighter.

## Gates

```
audit:ccss-lesson-interaction   270 interactive lessons — no interaction-copy defects
audit:us-ca-lesson-content       76 lessons, 614 blocks — no content defects
test:ccss-textbook               class audit + assignment contract passed
usCaliforniaLessons.test.ts      12 pass, 0 fail
tsc --noEmit                     clean
audit:us-ca-lesson-page-runtime  76 pages driven to both control extremes — clean
```

`components/visualizations/three/threeDSceneMath.catalog.test.ts` fails at HEAD,
before and after this round's changes (verified by restoring the file and
re-running). It is a 3D launch-allocation contract, not lesson content.
