# California Math — Lesson-Page Content QA — 2026-08-03 (round 3)

Round 3 stopped reading source and started **rendering the page**. Rounds 1 and 2
audited the CA lesson page statically and both ended green; driving the real page
in a browser found **37 further defects**, 16 of them mathematically false
statements a student can reach in one or two clicks.

| # | Standard | Round-3 result |
|---|---|---|
| 1 | **Mathematical accuracy** — every claim true in *every state the lesson's own controls can reach* | 16 defects fixed |
| 2 | **Interaction copy** — sentences built from live values read correctly at both ends of their control | 19 defects fixed |
| 3 | **Language quality (Chinese)** — Latin text embedded in Chinese copy is spaced correctly | 1 defect fixed (35 lessons) |
| 4 | **Rendering integrity** — every CA lesson page mounts, no console errors | 76/76 clean |

New tooling:

- `scripts/audit-us-ca-lesson-page-runtime.mjs`
  (`npm run audit:us-ca-lesson-page-runtime`) — renders all 76 CA lesson pages,
  drives every control to its **minimum and maximum**, and checks plural
  agreement, subject–verb agreement, degenerate values, non-finite readouts and
  console errors against what is actually on screen. Auth reuses the repo's e2e
  session-token mechanism; no credentials are entered anywhere.

## The methodological finding

**Static analysis of this content is structurally insufficient, and rounds 1–2
over-trusted it.** Three separate blind spots, each of which hid real defects:

1. **Controls behind bespoke components.** The round-2 gate could only link a
   readout to its bound when the bound was declared inline (`<Stepper min={1}>`).
   `ratio-double-number-line` floors its control at 1 inside a local `Control`
   component via `Math.max(1, value - 1)` — invisible to the scanner, and it was
   rendering "1 cups of flour for every 1 spoons of sugar".
2. **Markup between the value and its noun.** `{items}{" "}apples` split across
   JSX children did not match a regex expecting them adjacent.
3. **Defects with no textual signature at all.** "10² = 0.01" and
   "arcsin(0.64) = 39.79°" are well-formed sentences containing correct-looking
   numbers. No pattern finds them; only evaluating the arithmetic does.

`scripts/audit-ccss-lesson-interaction.mjs` now documents in its own header that
it is a cheap pre-check and **not** the authority on this class.

## 1. Mathematical accuracy — 16 defects

Found by a six-lens review of the lesson core with adversarial verification
(each candidate given to an independent skeptic prompted to refute it, defaulting
to "not a defect" when uncertain).

### Rounded intermediates fed back into computation — 4 lessons

One root cause, four lessons: a value was rounded for *display* and then used as
an *input*, so the lesson contradicted its own thesis.

| Lesson | Rendered | Truth |
|---|---|---|
| `trig-identities` | "(0.17)² + (0.98)² = **0.99**" directly under "= 1 for every angle θ" — 27 of 71 slider positions | 1 |
| `inverse-trig` | set 40°: "arcsin(0.64) = **39.79°**", under the claim arcsin "recovers the angle" — 14 of 15 positions | 40° |
| `interpret-expressions` | P=5000, r=20%, t=10 → "**$30950**" | $30,958.68 |
| `rational-exponents` | "27^(4/4) = 27" beside "= (2.28)⁴ = **27.023**" — 180 of 416 states | 27 |

Fixed by computing from exact values and rounding only at the point of display.

### Sign/absolute-value mismatch — `powers-of-ten` (Grade 5, 5.NBT.A.2)

The exponent printed `Math.abs(e)` while the value was built from the signed `e`,
so the ÷10² button rendered **"10² = 0.01"** — in the body, again under
"Exponents count the zeros", and a third time inside the Math Check. Fixed by
pairing the unsigned exponent with the true magnitude (`10² = 100`), which also
keeps negative-exponent notation (8.EE.A.1) out of a Grade 5 lesson.

### Unhandled degenerate states — 9 lessons

| Lesson | Reachable state | What it rendered |
|---|---|---|
| `approximate-irrationals` | n = 4, 9, 16, 25 (perfect squares) | "**4 < 4 < 9, so 2 < √4 < 3**" beneath "You can't write √4 exactly" |
| `triangle-angles` | Angle A = 90° | apex collapsed to the origin — a **flat line** — while the readout still said "90 + 60 + 30 = 180". 122 of 305 states also drew the apex off-canvas |
| `complex-solutions` | b = 6, c = 5 (positive discriminant) | box: "x = −5 or x = −1"; paragraph below: "**x = −3 ± 2i**" |
| `estimate-population` | sample % outside 40–60 | estimate marker drawn **entirely off-canvas** — 10 of 21 settings |
| `two-step-problems` | shrink Packs/Pens after setting Give away | "You give 5 pens… **1 − 5 = −4 pens**" |
| `sort-and-count` (Kindergarten) | any tie, e.g. [4, 3, 4] | "**Most of all: apples (4)**" with grapes also at 4 |
| `multistep-problems` | 56 students ÷ 8 per van | "It comes out even" in the figure; "**but… you round up**" in the prose |
| `conditional-probability` | "given umbrella" | highlighted **15** (no-rain cell) while the readout used 25 — the wrong conditioning subset, in the lesson about P(A\|B) vs P(B\|A) |
| `scatter-plots` | "No association" selected | screen readers announced "**No association association**" |

Fixes: skip perfect squares; locate the apex by the law of sines and auto-fit the
frame; branch the root prose on the discriminant; widen the axis to the reachable
domain; re-clamp the dependent stepper; report all tied leaders; branch the
remainder prose; shade the correct row; drop the duplicated noun.

## 2. Interaction copy — 19 defects across 12 lessons

Sentences correct at the seed value and wrong at a control's floor:
"1 cups of flour", "$1 for 1 apples", "SHORTEST 1 units", "1 hours = 60 minutes",
"1 × 1 = 1 pieces", "1 miles per hour", "1 pens", "1 tens", "1 cubes",
"1 smaller pieces", "1 pizzas cost", plus two subject–verb failures
("So 1 apple **cost** $1", "there **are** 1 layer") and one formatting defect
("**1.00 spoons**" → "1 spoon").

`measurement-conversion` needed singular unit names in its data table rather than
a suffix rule, because "1 feet" → "1 **foot**" is irregular.

## 3. Chinese copy — 1 defect, self-inflicted

The repo-wide `audit:zh-hans` gate reports 0 critical / 0 warnings. Auditing the
California corpus specifically surfaced one defect, introduced by **round 1**:
the misconception-watch rewrite dropped the space before Latin text, rendering
`重做前先重新檢查Ratios & the Double Number Line` in all 35 chapter lessons.

Fixed, and `audit-us-ca-lesson-content` now runs its typography rules over **all
three locales** rather than English only, so this cannot regress.

## Verified clean

- 76/76 CA lesson pages render with an `<h1>` and **zero console errors**.
- Every previously-broken state re-checked numerically after the fix:
  `10² = 100`; sin²+cos² = 1 at 10°/15°/80°; arcsin recovers 40/45/60/80 exactly;
  compound interest = $30,958.68; both rational-exponent routes give 27; the
  right triangle has a real apex at (0, 415.69).
- The multi-lens review also examined grade-band readability (K–2 vocabulary and
  sentence length) and terminology consistency between lessons that render on the
  same page; neither produced a finding that survived adversarial verification.

## Gate false positives corrected

The runtime gate's non-finite-value rule originally flagged `undefined` and `-0`
in rendered text. All 14 hits were legitimate mathematics — "division by 0 is
undefined", "a vertical line's slope is undefined", "the undefined notions of
point, line, and distance" (G-CO.1), and `-0` matching inside "day-0". The rule
now covers only `NaN` and `Infinity`, which are unambiguous. Recorded here so a
later reviewer does not reinstate it.

## Still open — for the visualization-lab owner

Unchanged from rounds 1–2, both outside the lesson-page copy this loop owns:

1. Signature-lab template selection mismatches the lesson topic
   (`Congruence and Proof` → "right triangles" lab; `Quantities, Units, and
   Precision` and `Capstone Modeling` → "statistics and distributions" lab).
2. `labDescriptionForTopic` lowercases lesson titles ("explore 10-a.1 congruence
   and proof"). Not on the lesson page; affects the lab catalog on every track.

## Gates run

```
npm run audit:us-ca-lesson-page-runtime   ✓ 76 pages, both control extremes, 0 defects
npm run audit:us-ca-lesson-content        ✓ 76 lessons, 614 blocks, 3 locales, 0 defects
npm run audit:ccss-lesson-interaction     ✓ 270 lessons, 0 defects
npm run test:ccss-textbook                ✓ class audit 276 files clean + 8/8 contract
npx tsc --noEmit -p tsconfig.json         ✓
npx tsx --test data/usCaliforniaLessons.test.ts
                                          ✓ 12/12
```
