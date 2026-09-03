# Figure label collisions in the 35 Claude chapter openers — found, fixed, measured

**Date:** 2026-09-03 · **Branch:** `replacing-Codex-textbook-by-Claude`
**Gate added:** `scripts/audit-us-ca-lesson-text-collision.mjs`

## The question

Do any two labels inside a chapter opener's figure land on top of each other in
a state a student can reach? Every one of these figures computes its label
positions from control state, so the answer is not visible in the source: whether
`"r = 0.5 units = 1 m"` reaches the height label depends on how wide that string
renders at 11px, and which control settings put them in the same place.

`audit-us-ca-lesson-figure-bounds.mjs` already asks whether a drawn element
leaves its viewBox. This is the neighbouring question, and nothing was asking it.

## How it was measured

A Playwright driver walks each opener's **reachable** control grid inside the
page and, after every state, measures the real bounding box of every visible
`<text>` in every `<svg>` and reports overlapping pairs.

Three properties matter:

- **Reachable, not Cartesian.** Several lessons clamp one control against
  another — g7-ch05 tops "yes answers" out at the current sample size — so an
  axis's bounds are re-derived at every prefix. A fixed odometer covered 528 of
  g7-ch05's states; the ragged walk covers 1,248.
- **Measured, not modelled.** Text extents come from `getBoundingClientRect`,
  so the check sees what the browser actually drew.
- **Fail-closed.** A run that cannot reach the page, is redirected to `/login`,
  finds no openers, visits no states, hits its time cap, or loses a control
  mid-walk reports a coverage problem and exits non-zero. Zero findings from a
  run that inspected nothing is not a pass.

The detector was mutation-tested before it was trusted: pulling one lesson's
tick labels onto the row label's baseline took it from 0 findings to 109, and
reverting took it back to 0.

## What it found — 2026-09-03, before any fix

**380,805 reachable states across the 35 openers. 11 lessons collided,
73 distinct label pairs.**

| Lesson | Pairs | What was wrong |
| --- | --- | --- |
| `ca-g6-ch02-rational-numbers-number-line` | 6 | The point's name P sat a fixed 9px diagonally out, which is the row of x-axis numbers whenever the point is near that axis |
| `ca-g7-ch04-scale-geometry-measurement` | 20 | The height label tracked the plan's own left edge, so a 2-unit-wide plan carried it inward — into the fountain's radius label, which is wider than the plan is across |
| `ca-g8-ch03-transformations-similarity` | 9 | The identity transformation puts the image on the pre-image, so six vertex names compete for three points |
| `ca-g8-ch04-pythagorean-reasoning-coordinate-geometry` | 2 | P and Q can be set to the same point; and the two leg labels hang off the same right-angled corner, so a 1-by-1 triangle puts them in the same pixels |
| `ca-g9-ch05-modeling-evidence` | 3 | The axis name was printed 2px inside the hour numbers it names |
| `ca-g10-ch01-congruence-proof` | 1 | A pre-image vertex and an image vertex land a few pixels apart at legs 5 and 5 |
| `ca-g10-ch03-circle-geometry` | 6 | At 3 cm the wedge is 36px across and "R = 3 cm" is wider than that, so it reached the cut-angle label |
| `ca-g12-ch02-polynomial-structure-behavior` | 13 | q = 0 sends the conjugate pair onto the real axis and onto each other; three markers, two or three identical labels stacked |
| `ca-g12-ch03-decision-statistics` | 4 | Bars are placed by value, so outcomes a couple of dollars apart have labels wider than the gap between them |
| `ca-g12-ch04-function-analysis-rates` | 8 | The axis name in the week numbers; and "run =" / "rise =" sharing the secant's corner |
| `ca-g12-ch05-capstone-modeling` | 1 | Both edge arrows leave the same corner, so the smallest panel puts their names together |

None of these is a typo. Every one is the same defect: a coordinate computed
from control state with nothing tying it to what else is already drawn there.

## How they were fixed

Three shapes of fix, chosen per lesson rather than applied uniformly:

1. **Give the label a choice.** `components/lesson/ccss/labelSpacing.ts` offers a
   label a short list of places it could sit, in preferred order, and takes the
   first that clears what is already down. On an open stretch of figure the label
   lands exactly where it always did; only a crowded one travels. Used by
   g6-ch02, g8-ch03, g8-ch04, g10-ch01, g12-ch02, g12-ch04, g12-ch05.
2. **Reserve the room.** Where two rows were competing for one row's space, the
   figure grew by a row: g9-ch05 (+10px), g12-ch04 (+10px), g12-ch03 (+15px, a
   second row of net-result labels, reserved whether or not a given spin needs it
   so the figure keeps one height).
3. **Say the thing once.** Where the mathematics itself collapses two objects
   into one — P moved onto Q, a repeated root — the figure now draws one marker
   and says so, instead of printing two labels in one place. g8-ch04 marks the
   dot P and puts "= Q" beside it; g12-ch02 draws one dot per distinct zero with
   a ring for multiplicity, and its aria-label spells out "counted twice".

## What the text audit could not see

Two of the first-round fixes passed the audit and still looked wrong, because
both new collisions were text over a *shape*, and the audit only compares text
with text. They were caught by rendering the five worst states and looking:

- **g7-ch04.** Moving the height label into a gutter cleared it, but left the
  radius label crossing the plan's own border and sitting on the fountain — a
  120px label inside a 60px plan. It now has its own line under the plan.
- **g8-ch04.** "= Q" beside the dot was struck through by the x-axis rule when P
  sat on it. The two axis rules are now obstacles like any other, and the label
  has vertical candidates as well as horizontal ones.

Screens of the five worst states are the check that found these; the audit is
the check that they do not come back.

## What guards it now

- **`scripts/audit-us-ca-lesson-text-collision.mjs`** — the exhaustive
  real-pixel check, runnable against a dev server:
  `AUTH_SESSION_SECRET=... BASE_URL=http://localhost:3188 npx tsx scripts/audit-us-ca-lesson-text-collision.mjs`
  (`CLEARANCE=2` additionally fails labels that come within 2px without
  overlapping; `PW_EXECUTABLE=` works around a host whose ms-playwright cache
  does not carry the pinned browser.) It is a script, not an npm entry — the
  package.json script list is under a governance gate.
- **Per-lesson unit assertions** in each fixed lesson's own `*.test.ts`, walking
  the same grid without a browser and asserting that a clear spot was actually
  available (`fitted`), not merely least-bad. These use conservative label boxes
  and demand 2px of clearance, so they are stricter than the pixel audit — one of
  them found a residual in g10-ch01 that the audit at 0px tolerance passed.

Both layers were mutation-tested: making `pickSpot` always return its first
candidate, and returning g7-ch04's height label to the plan edge, fails eight of
the guards; reverting restores them.

## After the fixes — 2026-09-03

**170,076 reachable states across the 35 openers. Zero colliding label pairs.**

An earlier green run reported 3,331,108 states, and that number was wrong in an
instructive way. g9-ch02 offers a row of sequence-term buttons that set the same
`day` the stepper owns, and with choice groups walked INSIDE the steppers,
pressing one moved an axis the walk believed it was holding still: the position
it recorded was fiction, and the walk ran for 3.18 million states without ever
reaching the stepper's bound. Walking choice groups OUTSIDE the steppers makes
every recorded position real, and g9-ch02 finishes in 22,528 states and 29
seconds instead of being cut off at a 50-minute cap.

The run still exits non-zero, on three coverage notes it refuses to hide:

- **g9-ch02, `choice1[4]` and `choice1[5]` vanish mid-walk.** Those are the
  sequence-term buttons T(0) … T(lastDay); how many exist depends on the presale
  and per-day values the walk is changing underneath them. They set only `day`
  and the mode, and both are separate axes the walk covers in full, so no figure
  state goes unvisited — but the driver cannot prove that itself, so it says so.
  Resolving choice members freshly at each visit would close the note.
- **g11-ch01's figure has no `<text>` at all.** Nothing to check is not the same
  as nothing wrong, so it is reported rather than counted as a pass.

## The HTML side

Checked separately and separately clean. All 35 openers were measured at 390,
768 and 1280px for prose that overlaps or overruns its column — per painted
**line box**, because an inline `<strong>` that wraps has a bounding rect
covering the union of its lines, and comparing those unions reports every
emphasis on the page as a collision. **0 findings at all three widths.** The
collisions were entirely inside the figures.

## Coverage this does not claim

- The exhaustive grid walk is SVG text only. The HTML pass above covers the
  openers in their opening state at three widths, not across their control grids.
- Text over *shapes* is not checked — a label covered by a filled marker drawn
  after it would not be reported. The g12-ch03 fix reserved space against the
  balance-point triangle by hand for exactly this reason.
- The grid walk runs at one viewport. SVG labels scale with the viewBox, so an
  overlap inside a figure is width-independent; that is why one width is enough
  there and three were needed for the prose.
