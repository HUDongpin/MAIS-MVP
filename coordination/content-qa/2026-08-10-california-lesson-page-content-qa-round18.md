# California Math — Lesson-Page Content QA — 2026-08-10 (round 18)

**0 defects found. One lens discarded, one kept and made a gate.**

Round 8 asked whether a figure's accessible name *changes* when the figure does.
It never asked whether the changed name is *true*. Rounds 9 and 10 found wrong
geometry computed from control state — a marker at ±10 on a ±5 grid, a polygon
protruding past the cube it cuts. The accessible name is that same computation
surfaced as text, and for a screen-reader user it is the entire figure.

## Coverage

```
896 distinct accessible names
 76 pages, 58 of which had controls that moved
6188 control presses driving every stepper to both extremes
```

(An exploratory pass measured 897 names and 6251 presses. The small variance is
the order controls become enabled as others move; the gate's own numbers are the
reproducible ones.)

## The lens that was discarded

The first version flagged any number in an accessible name that did not appear in
the figure's printed text. It produced **25 findings, all of them correct
content**:

| name | "missing" | why it is fine |
|---|---|---|
| `clock showing 3:30` | 30 | a clock face prints 1–12, never the minutes |
| `rectangle 6 by 3, perimeter 18` | 18 | 2(6+3)=18 is derived, not printed |
| `Beaker filled to 750 milliliters, which is 0.75 liters` | 750 | the scale prints 0, 0.5, 1, 1.5, 2 L |

It also had a measurement bug that would have manufactured findings on its own:
`textContent` concatenates adjacent `<text>` nodes with no separator, so a number
line reading `60 70 65 63` came back as the single token `60706563`, and every one
of its numbers looked absent.

**Absence is not contradiction.** Same shape as round 13's readability lens and
round 15's isolation test: an instrument that reports on the instrument.

## The lens that was kept

Check only what can be **recomputed from the name itself**. A name that states a
rectangle's sides *and* its perimeter is asserting arithmetic, and arithmetic can
be wrong:

```
rectangle A by B, perimeter P        ->  P = 2(A+B)
rectangle A by B, area X             ->  X = A*B
N between A and B                    ->  strictly inside
clock showing H:MM                   ->  1<=H<=12, MM<60
angle of D degrees                   ->  0 < D <= 360
X milliliters, which is Y liters     ->  Y = X/1000
```

Plus strings that must never reach a screen reader: `undefined`, `NaN`,
`[object Object]`, an unreplaced `${...}`, a leftover LaTeX macro, an empty name,
float noise.

**56 recomputable claims across the driven states — all hold. 0 artifacts in 896
names.**

## Proven to fire, on a real defect

A unit canary is not enough, so the failure was injected into the live component.
`perimeter.tsx:14` computes `const perimeter = 2 * (w + h)`; changed to `+ 1` and
re-run through the real page:

```
✗ us-ca-math-p3-3-md-time-data-area-perimeter
    accessible name asserts arithmetic that does not hold
    name    : rectangle 2 by 1, perimeter 7
    rule    : rectangle A by B, perimeter P => P = 2(A+B)
    expected: 6
```

Restored, and the gate returns to green. It also refuses to pass if it read no
names at all, if it found *no recomputable claim* (the label wording could drift
and silently empty the gate), if the perimeter check stops firing on a known-bad
string, or if it lands anywhere other than the lesson.

That last guard is round 14's lesson: this gate was written with the `/login`
assertion built in from the first line, rather than discovering a year later that
it had been auditing a redirect.

## Why a clean round is still worth the run

Rounds 9 and 10 found this exact class of error — a value computed from control
state that nothing bounded or rechecked — in the *drawn* output. The text output
of those same computations had never been checked. It is now, and it is correct,
and a gate holds it there.

## Gates

```
audit:us-ca-lesson-label-claims   896 names, 56 recomputable claims — clean (new)
audit:us-ca-lesson-readaloud      608 questions + 386 blocks — clean
audit:us-ca-lesson-illustrations    2 records — clean
audit:us-ca-lesson-content         76 lessons, 614 blocks — clean
audit:us-ca-checkpoint-grading    272 free-entry + 336 multiple-choice — clean
audit:us-ca-lesson-figure-bounds   76 pages, 76 with a real lesson figure — clean
audit:us-ca-lesson-label-motion    76 pages, 76 inspected — clean
lib/mathSpeech.test.ts 10 · answerMatching 10 · tsc --noEmit clean
```

## Still open

- **Owner decision:** clear or re-derive `independentAnswer`/`independentSolution`
  for the 464 `ccss-textbook-practice-v1` questions (round 17).
- Both California illustration records remain unreachable (round 14).
- 76 `extension` blocks have no renderer; 41 elementary pages discard their
  authored guided practice.
- Readability remains genuinely unaudited (round 13).
- **Not a content issue, but urgent:** the other session's 275 uncommitted files
  have sat untouched for over 24 hours on this shared branch, including both
  browser-gate rewrites and the `toPlainMathText` fix. My lesson-body block
  coverage in `audit-us-ca-lesson-readaloud.mts` is entangled with it and cannot
  land until they commit.
