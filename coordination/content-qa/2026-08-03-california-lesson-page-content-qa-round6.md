# California Math — Lesson-Page Content QA — 2026-08-03 (round 6)

**116 defects found and fixed** across 96 of the 270 interactive lessons that
make up the California lesson page. All four static gates and the runtime sweep
were green when round 6 started.

Round 6 exists because rounds 3 and 5 **sampled**. Both audits picked lessons by
heuristic — recently-touched files, files matching a risk pattern, a fixed
per-lens quota — and both reported green on the strength of that sample. Round 6
partitioned the library instead: **270 of 270 lesson files were read in full**,
in ten slices of 27, with no selection step anywhere in the pipeline.

| Round | Method | Defects confirmed |
|---|---|---|
| 1 | static lint of rendered seed text | 375 |
| 2 | Math Check claim review | 23 |
| 3 | browser rendering of every page | 37 |
| 4 | round-3 verification re-run, cap removed | 12 |
| 5 | fresh audit, sampled | 50 |
| **6** | **exhaustive partition, 270/270 read** | **116** |

194 candidates were produced and each was adversarially verified before it
counted; 78 were refuted and dropped. Severity of the 116 confirmed: **34 high,
67 medium, 15 low**.

## What the sampling missed

The 116 are not a long tail of nitpicks. 34 were high severity, and the classes
below were each *already known* from an earlier round — the sampled audits simply
never looked at the files where they survived.

### The figure contradicts the claim printed beside it

The single largest class, and the one static analysis cannot reach: the prose is
true, the arithmetic is true, and the drawing disagrees with both.

| Lesson | Drawn | True |
|---|---|---|
| `circle-constructions` | "inscribed circle" at (120, 105) r 34 — touching none of the three sides | incentre (120, 115.3), inradius 44.7 |
| `circle-constructions` | "circumscribed circle" at (120, 95) R 78 — two vertices outside it, one inside | circumcentre (120, 119.6), R 89.6 |
| `prove-triangle-theorems` | one scalene triangle under "if two sides are equal, the base angles are equal" | isosceles tab now has its own: legs 128.06 / 128.06, base angles 51.3° / 51.3° |
| `similarity-transformations` | two hard-coded triangles joined by "~" measuring 69/45/66 against 46/69/64 | both polygons now derived from the angles the steppers set |
| `laws-sines-cosines` | a fixed polygon with live values stamped on it: the C-vertex measured 56.3° whatever the slider said | triangle built from a, b and C |
| `congruence-criteria` | SSS — "all three pairs of sides equal" — showed one marked side | each criterion marks exactly the parts it names |
| `graph-stories` | "a ball thrown up … a curved, nonlinear path" as four straight segments | a parabola |
| `word-problems-100` | 45 + 12 = 57 in tape, beside "45 − 18 + 12 = 39" | the 18 that flew away is now represented |
| `proportional-relationships` | y-endpoint clamped, so the accent line was y = x for every k | line drawn through the plotted points |
| `shape-attributes` | rotated about the viewBox corner, not about itself | CSS transform-origin removed |

### Reachable states that make a statement false

Every one of these is reachable with the lesson's own controls, most within three
clicks of first load.

- `solve-equations-steps` printed **"0x = 8, x = ?"** justified by **"divide both
  sides by 0"** — in the A-REI.1 lesson whose thesis is that every line follows
  by a legitimate property.
- `multiply-divide-integers` showed **"−3 ÷ 0 = 0"** at 4xl, above a Math Check
  saying division by zero is undefined.
- `line-plot-fractions` **overflowed the stack**: all counts reach 0
  independently, `Math.max(...[])` is −Infinity, and the fraction helper then
  recursed on NaN.
- `add-within-100` clamped the *answer*: **"89 + 50 = 99"**.
- `divide-two-digit` dropped the remainder from its own check, "confirming"
  432 ÷ 17 = 25 R 7 with 17 × 25 = 425.
- `perimeter`'s default 6 × 3 read **"perimeter 18 but area 18 — two different
  numbers"** on first render.
- `independence` declared P(A) = P(B) = 45 %, P(A∩B) = 20 % independent (0.2
  against 0.2025) under a 0.5-percentage-point tolerance, and rounded both
  readouts to the same displayed "0.2".
- `probability-models` rendered **"P(colour) = 3 + 2 + 1 over 6"** — an equation
  chain asserting P = 1 for every colour.

### Recurring classes swept library-wide

Each was found and fixed in an earlier round, then found again in files that
round never opened:

| Class | Round 6 instances |
|---|---|
| rounded value asserted with "=" | `arc-length-sector`, `complex-conjugates`, `linear-equations`, `expected-value`, `two-way-probability`, `multiplication-rule`, `decimal-arithmetic`, `two-patterns-graph` |
| raw negative interpolated after an operator | `complex-solutions`, `graph-inequalities`, `matrix-equations`, `graphs-and-solutions`, `linear-quadratic-systems` |
| `indexOf(max)` naming one winner on a tie | `bar-graph`, `picture-graph`, `measure-line-plot`, `order-and-measure`, `estimate-compare-length` |
| silent clamp reporting the rewritten value as the student's | `length-number-line`, `count-on-count-back`, `add-subtract-stories`, `add-within-100` |
| caption naming a colour absent from the figure | `add-subtract-algorithm`, `compare-length`, `order-and-measure` |
| empty / degenerate state described as populated | `line-plot`, `line-plot-operations`, `protractor`, `two-step-problems`, `multiplication-fluency`, `exponents` |
| figure too small to hold its own result | `complex-plane`, `two-patterns-graph`, `gcf-lcm`, `systems-of-equations`, `multiplicative-comparison` |

### Five of my own earlier fixes were incomplete

Caught by the exhaustive read, not by any gate. Each landed in one place in a
file and missed another in the same file:

- `arithmetic-patterns` — Math Check corrected, pattern table still said "digits
  always add up to 9" (false for 99, which is on the chart)
- `conic-sections` — parabola repositioned, ellipse foci left at 85 and 155 where
  they belong at 53.9 and 186.1
- `mental-10-100` — status line taught to report roll-overs, caption still
  promised "watch just one digit change"
- `order-and-measure` — two-way tie handled, three-way tie not
- `length-number-line` — a `Math.max(1, …)` floor I added **re-created** the exact
  silent clamp its own comment claimed to have fixed

### Interaction reachable only with a mouse

`matrices` needed shift-click or right-click to decrement an entry. On an iPad or
a Chromebook in tablet mode a student could only ever raise a matrix entry.
Every entry now has − and + buttons.

## Verification

Each fix was re-derived against the state that broke it:

```
circle-constructions   incircle    44.70 / 44.71 / 44.71 from the three sides
circle-constructions   circumcircle 89.62 / 89.62 / 89.60 from the three vertices
prove-triangle-thms    legs 128.06 / 128.06, base angles 51.3° / 51.3°
independence           P(A)=P(B)=45 %, P(A∩B)=20 %  →  0.2025 vs 0.2, "not independent"
add-within-100         89 + 50 = 139   (was "= 99")
divide-two-digit       17 × 25 + 7 = 432
multiplication-rule    aces 2, deck 20  →  0.005 vs 0.01, "higher" (was "slightly higher")
two-patterns-graph     s1=3, s2=1  →  y = 1/3 × x   (was "y = 0.33 × x")
long-division          87 ÷ 5:  "1 ten + 7 ones"  and at r1 = 1, "1 ten"
```

Gates re-run after the last batch, all green:

```
audit:ccss-lesson-interaction   270 interactive lessons — no interaction-copy defects
audit:us-ca-lesson-content       76 lessons, 614 blocks — no content defects
test:ccss-textbook               class audit + assignment contract passed
usCaliforniaLessons.test.ts      12 pass, 0 fail
tsc --noEmit                     clean
```

## Process correction carried forward

**A sampled audit may not report green.** Rounds 3 and 5 each ended with "no
further defects found" on the strength of a sample, and each was followed by a
round that found more in files the sample never opened. Round 6's finding rate —
116 confirmed from 96 distinct files, in a library that had already been through
five rounds — is the measure of what heuristic selection was skipping.

The rule going forward: a round may only be reported as clean if its find phase
**partitions** the corpus. Slice it, cover every slice, and say how many units
were read out of how many exist. "Audited the risky files" is a triage step, not
a result.

Two findings are deliberately **not** fixed here — they belong to the
visualization-lab owner, not to the lesson library:

- signature-lab template selection does not match the lesson topic in several CA
  chapters
- `labDescriptionForTopic` lowercases lesson titles mid-sentence
