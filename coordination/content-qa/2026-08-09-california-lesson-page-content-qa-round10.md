# California Math — Lesson-Page Content QA — 2026-08-09 (round 10)

**4 defects fixed, 3 high severity.** One lens, and the only one left after nine
rounds: does a figure that **computes** its coordinates satisfy the relation its
text claims — at *every* reachable control setting, not just the one it loads in?

## Partition

Rounds 9 and 9b measured the 48 lessons with *fixed* coordinates. The bounds gate
covers the escape class everywhere. What no lens had asked: of the 222 lessons
that compute their geometry, which assert a measurable relation?

Scanned for the vocabulary — congruent, similar, parallel, perpendicular, right
angle, isosceles, equilateral, regular, inscribed, tangent, bisects, midpoint,
equal areas, same length, to scale, proportional, reflection, rotation,
symmetric. **49 lessons**, all measured.

Agents were instructed to sweep the state space in a script rather than
spot-check, and every finding required a named reachable state plus the
arithmetic. Two skeptics each: one recomputing independently, one checking the
fix holds **everywhere** rather than at the reported state.

## The one nine rounds could not have caught

`linear-quadratic-systems` announces *"A line and a parabola meeting at 2
points"* — in the accessible name, in the result panel, and behind a MathCheck
reading *"Graphically, these are exactly the points where the line meets the
parabola."*

At **m = 3, k = 4** (two presses of each stepper from the default) the roots are
x = −1 and x = 4. The second maps to y = 16 on a window that stops at y = 10, so
its dot is discarded by the clipPath. **One crossing is drawn; two are claimed.**

```
reachable grid m ∈ [−4,4] × k ∈ [−4,8]   =  117 states
draws what it claims                     =   65
claims 2, draws 1                        =   52   (44.4%)
worst overshoot                          =  269px (m = −4, k = 8)
default state (m = 1, k = 2)             =  clean
```

That last line is why it survived. Every earlier lens looked at the figure as it
loads.

Roots reach |x| = 5.46 and y = 29.86 across the grid, so the window is now
XR = 6, YR = 30 — verified: **0 of 117 states** leave a root outside the clip.
Clamping was explicitly rejected; a comment in the file records that it
previously pinned dots to the top edge, which is worse.

## A triangle labelled equilateral that is not

`symmetry` draws its "Equilateral triangle" as `100,20 160,135 40,135`:

| | Required | Drawn |
|---|---|---|
| sides | 120 / 120 / 120 | **129.711 / 120.000 / 129.711** |
| angles | 60 / 60 / 60 | **55.11 / 62.45 / 62.45** |

Labelled equilateral, drawn isosceles — in the one lesson whose three fold lines
depend on it being equilateral. The apex now sits at the true height
135 − 60√3 = 31.077, giving 120/120/120 and 60/60/60 exactly.

## A trig lesson whose triangle ignored its own slider

`trig-ratios` drew the fixed polygon `30,140 200,140 30,40`. The angle at the
labelled vertex is **30.47° whatever the slider says**. At θ = 75 the figure
showed a triangle with **sin = 0.507** beside a readout of **0.97** — in the
lesson that exists to teach that sin θ is a property of the angle.

The triangle is now built from the angle, scaled to fit the drawing area. Across
all 61 slider values:

```
worst |drawn angle − slider|  =  1.4e-14 degrees
worst |drawn sin − sin(θ)|    =  1.1e-16
states drawn outside the viewBox = 0
```

## And one accessible name

`similarity-transformations` reported angle triples in both aria-labels that do
not sum to 180 once the steppers drive the third angle non-positive — at
a1 = a2 = 110, the label claims 110° for an angle measuring 35°. The visible
label already showed "?" in that state; the accessible one did not.

## Gate fixed along the way

The runtime sweep reported "1 runtime content defect" that was a 90-second
navigation timeout on a cold Next route — not content, not a dead server. I had
added retry-on-timeout to `audit:us-ca-lesson-label-motion` and left its sibling
untouched: the same half-fix class this effort keeps finding in the lessons.
Both gates now fail fast on a refused connection, retry a timeout once, and
count retried pages in the summary.

## What this round says about the method

Nine rounds asked *is this true?* about text, then about pictures with fixed
coordinates. This one asked *is it still true three clicks from the default?* —
and 44% of one lesson's state space was wrong.

The rule to carry: **a claim about an interactive figure is a claim about its
whole state space.** Checking the default verifies one point of it. Every fix in
this round was verified by sweeping the range in code; none by looking.

## Gates

```
audit:ccss-lesson-interaction    270 interactive lessons — clean
audit:us-ca-lesson-content        76 lessons, 614 blocks — clean
test:ccss-textbook                passed
usCaliforniaLessons.test.ts       12 pass, 0 fail
tsc --noEmit                      clean
audit:us-ca-lesson-page-runtime   re-running after this round's window changes
audit:us-ca-lesson-figure-bounds  re-running after this round's window changes
```

## Still open

- The 173 computed-geometry lessons that assert **no** measurable relation were
  not measured by this lens — correctly, since there is no claim to check, but it
  means "49 of 222" is the coverage figure, not "222 of 222".
- The two product decisions remain with the owner: 76 `extension` blocks have no
  renderer, and 41 elementary pages discard their authored guided practice.
