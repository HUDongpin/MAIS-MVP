# California Math — Lesson-Page Content QA — 2026-08-03 (round 4)

Round 4 exists because of a defect in round 3's **method**, not in the content.

The round-3 multi-lens audit capped adversarial verification at the first six
candidates per lens. Five of six lenses exceeded that cap, so of 69 candidates
produced, **34 were verified and 35 were silently dropped** — including 8 more
from `math-precision` and 5 more from `control-extremes`, the two lenses with the
highest confirmed-defect rate. Round 3 was reported as green over an
incompletely-verified finding set.

Re-running the audit with the cap removed (find phase replayed from cache, only
verification re-run) confirmed **12 further defects**, all still present after
round 3 shipped.

| # | Standard | Round-4 result |
|---|---|---|
| 1 | **Mathematical accuracy** — claims true in every reachable state | 8 defects fixed |
| 2 | **Story-context sense** — the scenario stays possible in its own world | 2 defects fixed |
| 3 | **Terminology consistency** — lessons on one page agree on names | 1 defect fixed |
| 4 | **Accessibility copy** — what a screen reader announces is true | 1 defect fixed |

## Defects found and fixed

### Rendering / notation

| Lesson | Rendered | Root cause |
|---|---|---|
| `angles-fraction-circle` | at 360° the shaded wedge **disappeared** — pixel-identical to the 0° state — while the readout said "360°" and the prose called it a full turn | SVG omits an elliptical-arc segment whose endpoints coincide; now drawn as two half-turns |
| `solve-quadratics` | on first load "(**−-5** ± √1) / 2", and "**−5²** − 4·1·6 = 1" — false as written, since −5² is −25 | the sign was prefixed literally instead of folded into the substituted value |
| `remainder-theorem` | on first load "p(x) = (x **− -2**)(x − 1)(x − 3)" | factor template hardcoded the minus |
| `measurement-conversion` | "Because **1 fee** = 12 inches" | `"feet".slice(0, -1)`; the file already carried `bigOne: "foot"` and used it elsewhere |
| `unit-circle` | "**−0.000**" for sin at 360° and cos at 270° | float residue below display precision, implying a full turn lands below the axis |
| `construct-triangles` | obtuse triangles drawn **off the left edge** | viewport assumed 0 ≤ apex_x ≤ base; a=5, b=4, c=8 gives apex_x = −2.3 |

### Reachable states that make a claim false

| Lesson | State | Problem |
|---|---|---|
| `addition-rule`, `independence` | lower P(A) after setting P(A∩B) | intersection was never re-clamped → "0.1 + 0.4 − 0.2 = 0.3", an intersection larger than P(A); in `independence` it also flipped the independence verdict |
| `volume-formulas` | pyramid selected | showed "≈ 60" with no way to reproduce it: the base side is 2r and nothing on screen said so. The one length control was labelled "radius r" — a square pyramid has no radius |
| `multiply-mixed-numbers` | Whole or Numerator at 0 | "A recipe needs **0 3/4 cups**"; at both zero, a recipe needing nothing |
| `line-of-best-fit` | slope 9, intercept 60 | "predicts a score of **105**" on a 0–100 test-score axis, and the plotted line was silently clamped so the graph and the sentence disagreed |

### Terminology and accessibility

- `make-ten-to-add` called "any order" the **associative** property. "Any order"
  is commutativity; the demonstration reorders nothing. The guided-practice block
  rendered on the same CA page (1-A.1) names the two separately, so a student read
  both versions on one screen.
- `compare-decimals` announced "**plus 10**" on a button that moves the value by
  **0.1** — the stepper stores hundredths. In a 4.NF.C.7 lesson about tenths
  outranking hundredths, that teaches the misconception the lesson targets. Now
  "+0.1" / "plus one tenth", matching the sibling decimal lessons.

## Verified after fixing

Each previously-broken state re-derived:

```
solve-quadratics   (−5)² − 4·1·6 = 1   and   (5 ± √1) / 2
remainder-theorem  p(x) = (x + 2)(x − 1)(x − 3)
line-of-best-fit   highest reachable prediction at 5 h = 99   (was 105)
volume-formulas    "V = ⅓·s²·h, base side s = 2r = 6"  →  60
unit-circle        sin(360°) = 0.000,  cos(270°) = 0.000
measurement-conv.  "1 foot"   (was "1 fee")
```

## Process corrections carried forward

1. **The audit script no longer caps verification.** `.slice(0, 6)` is removed;
   every candidate a lens produces is now adversarially verified. Any future
   bound on coverage must be logged, not silent.
2. **A green gate is evidence, not proof.** Rounds 1–2 were green when 16 math
   defects were live; round 3 was green when 12 more were. Each round's clean
   result only means *the detectors that ran* found nothing — worth stating
   plainly in any readiness claim built on these gates.

## Gates run

```
npm run audit:us-ca-lesson-page-runtime   ✓ 76 pages, both control extremes, 0 defects
npm run audit:us-ca-lesson-content        ✓ 76 lessons, 614 blocks, 3 locales, 0 defects
npm run audit:ccss-lesson-interaction     ✓ 270 lessons, 0 defects
npm run test:ccss-textbook                ✓ class audit 276 files clean + 8/8 contract
npx tsc --noEmit -p tsconfig.json         ✓
npx tsx --test data/usCaliforniaLessons.test.ts data/usCaliforniaMathematicalPractices.test.ts
                                          ✓ 17/17
```
