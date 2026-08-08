# California Math — Lesson-Page Content QA — 2026-08-09 (round 9)

**4 defects fixed, 1 refuted on recomputation.** One lens: does a figure drawn
from hard-coded coordinates actually *have* the geometric property its own text
claims?

This is the lens that produced round 6's worst defects — an "inscribed circle"
touching none of its triangle's three sides, two triangles joined by "~" that
were not similar, a "curved, nonlinear path" drawn as four straight segments.
Round 6 found those by reading files one at a time. Round 9 partitions the class.

## Partition — and a correction to it

All 270 lessons were scanned for SVG geometry from literal coordinates alongside
prose asserting a measurable relation. That scan returned **26 candidates**, all
measured, and this report originally described that as the population.

**It was a sample.** The scan tested only two patterns — `points="..."` /
`d="M ..."` and two-or-more fixed `<circle cx={…}>`. A broader net (fixed
coordinates on *any* shape element: `rect x/y`, `line x1/y1`, single circles,
ellipses) finds **48** files. Round 9 measured 26 and skipped 22:

```
absolute-value          approximate-irrationals   area-perimeter-formulas
area-triangles          circle-pi                 count-on-count-back
data-displays           equivalent-fractions      estimate-population
inequalities            length-number-line        mean-median
negative-numbers        partition-equal-areas     perimeter
round-decimals          rounding-multidigit       rounding
scale-drawings          vector-operations         vectors
volume-3d
```

This is the same error rounds 3, 5 and 8 made and this effort keeps documenting:
a heuristic selection reported as a partition. The 22 are being measured as
round 9b; until they are, round 9's coverage claim is 26/48, not 26/26.

Each candidate finding then went to **two independent skeptics** — one
recomputing the geometry from the file itself, one checking the proposed fix
would satisfy the claim *and* stay inside the viewBox. A finding survived only
if both agreed. Findings without arithmetic were rejected by construction.

## The cut that was twice the size of the face it matched

`cross-sections.tsx`, captioned *"A cut parallel to the top and bottom gives a
square the same size as a face."*

The cube is drawn in a **consistent cabinet oblique** — not a loose schematic.
Its front face is a true 80×80 square, and the receding vector (40, −20) is
applied exactly on every face. So the two face directions are **0°** and
**−26.57°**.

| | Required | Drawn |
|---|---|---|
| near edge | 0° | ±14.04° → **14.0° off** |
| receding edge | −26.57° | +14.04° → **40.6° off** |
| area | 1600 px² (= the face) | 3200 px² → **exactly 2×** |
| x-span | within the cube's 40..160 | 20..180 → **protrudes both sides** |

No edge of the "parallel" cut was parallel to either edge of the face it claimed
to match. A horizontal section is simply the top face translated straight down:

```
top face      40,50  120,50  160,30  80,30      area 1600
new cut       40,90  120,90  160,70  80,70      area 1600
              pure (0,+40) translation — verified
```

The same lesson's **diagonal** section drew a 90×55 rectangle for a slice the
text says *"stretches"* the 70×70 face — the short side had **shrunk 21%**. A
slant lengthens one pair of sides and leaves the other alone: now 99×70, with
99 ≈ 70√2.

## Two more

- **`compose-2d`** separates its pieces by 34 px, putting the roof apex at
  y = −14, above the viewBox. So *"put a square and a **triangle** together"*
  rendered a shape with a flat top and four visible vertices. Gap 18 keeps the
  apex at y = 2.
- **`congruence-criteria`** marked both ASA angles with an **identical single
  arc**, which asserts they are equal. They measure **70.56°** and **46.74°** —
  a 23.8° gap, 24× the rendering tolerance. The second is now a double arc,
  matching the 1-tick/2-tick convention its sides already use.

## Refuted on my own recomputation

A fifth finding claimed the acute angle labels in `prove-angle-theorems` fall
outside their wedge. Checking it:

```
label anchor (−24, −8) → 161.6° from the crossing
acute wedge spans (180 − a) .. 180  →  150°..180° at a = 30
inside for every reachable a (30..80)
```

The claim rests on text-centroid estimation that the arithmetic does not
support. Recorded as refuted rather than fixed. Two skeptics had passed it; my
own recomputation did not, and that is the tiebreaker.

## Why this lens still found things after eight rounds

Every earlier round asked *is the text true?* This one asks *is the picture
true?* — and a picture drawn from literal coordinates cannot be checked by
reading the sentence next to it. It needs the distance formula, the dot product,
and the shoelace area, applied to the numbers actually in the file.

The cross-sections defect had survived eight rounds and six gates. It is not
subtle once measured: a section exactly twice the area of the face it claims to
equal, protruding past the solid it cuts.

## Gates

```
audit:ccss-lesson-interaction    270 interactive lessons — clean
audit:us-ca-lesson-content        76 lessons, 614 blocks — clean
test:ccss-textbook                passed
usCaliforniaLessons.test.ts       12 pass, 0 fail
tsc --noEmit                      clean
audit:us-ca-lesson-page-runtime   76 pages, both extremes — clean
audit:us-ca-lesson-label-motion   76/76 inspected — clean
```

## Round 9b — the 22 files the partition had skipped

Measuring them found **5 more defects, two of them high severity**. The skipped
half was not the safe half.

- **`length-number-line`** draws its arrow from `min(start,end)` to
  `max(start,end)`, so in Subtract mode the arrowhead sits on the **starting**
  point, pointing right — away from the answer — under a caption reading *"The
  arrow is the length you add or subtract. Where it lands is the answer."*
- **`vector-operations`** is captioned *"subtract by adding the opposite"* and
  never drew the opposite: in Subtract mode it drew +v from the origin at full
  strength **and again faded**, while −v appeared nowhere. With u = (4,2),
  v = (−1,3) the second arrow now renders (1,−3) = −v exactly.
- **`data-displays`** clipped its last histogram bar to 55px against its
  siblings' 76px — the 15–17 bin **27.6% narrower** in a display whose premise is
  equal-width intervals.
- **`count-on-count-back`** never re-clamped `start` on an operation switch, so
  start = 20 in Add mode drew **zero hop arcs while the Jumps stepper read 1**,
  both its buttons disabled, beside a caption telling the child to count the
  hops. All 42 (op, start) states now leave jumpMax ≥ 1.
- **`vector-operations`** claimed *"k = 1 makes a longer arrow"* at a length
  ratio of exactly 1.000.

## The second gate: does anything draw outside its own viewBox?

`audit:us-ca-lesson-figure-bounds` drives every control to both extremes and
measures each element's box against its SVG viewBox. Five defects, all the same
shape — a line drawn across the full domain with nothing tying it to the visible
range:

| Lesson | State | Outside |
|---|---|---|
| `inverse-functions` | m = 4, b = 4 → f(6) = 28 on a ±6 grid | **502px** of a 340px box |
| `coordinate-proofs` | m = 4 → y = ±24 on a ±6 grid | **374px** of a 308px box |
| `graph-inequalities` | m = −3, b = −3 → y = −18 on a ±5 grid | **364px** of a 352px box |
| `fit-function-residuals` | slope 2.0, b 5 → y = 21 on a 14 axis | **37px** of a 210px box |
| `complex-plane` | grid loop offset left at `R` while its length grew to `extent` | **44px** of a 332px box |

Every fix verified by enumerating the full state space — 36, 4, 63, 78 and 14,641
states respectively — all now 0.00px.

## Two things I got wrong, and how

**The gate reported false positives.** `getBBox()` returns an element's box in its
*own* coordinate system and ignores ancestor transforms.
`fractions-number-line` draws its marker inside `<g transform="translate(…)">`,
so three elements read as up to 62px outside when all sit comfortably inside.
Three of the first sweep's ten findings were that artifact. The gate now maps
each box through `root.inverse() × own`. Verified both directions: the artifacts
are gone, and reverting the two real fixes makes it report 502px and 374px again.

**The gate undercounts.** It reported `graph-inequalities` at **4px** and
`fit-function-residuals` at **17px**; the true worst cases are **364px** and
**37px**. It drives each control to one extreme independently, so it lands on
whatever combination that yields, not the worst one. It is reliable for *"something
here escapes"* and useless as a measure of *how far*. The 4px reading was one
pixel above my noise threshold and nearly got dismissed.

**And one fix was half a fix.** Clipping `fit-function-residuals`' fitted line
left its residual segments on the same unclamped `pred(x)`, so they escaped
exactly when the line would have. The gate caught it on the next sweep.

## Still open

- 48 of 270 lessons draw fixed geometry and were measured by the first lens. The
  other 222 compute their coordinates; the bounds gate covers the escape class
  across all of them, but no lens has checked whether a *computed* figure has the
  property its text claims.
- The two product decisions remain with the owner: 76 `extension` blocks have no
  renderer, and 41 elementary pages discard their authored guided practice.
