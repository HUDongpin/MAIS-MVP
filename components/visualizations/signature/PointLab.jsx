'use client';

/* ============================================================================
   PointLab — an interactive "bench" for THE POINT: a location on the coordinate
        plane, named by an ORDERED PAIR (x, y).

   Built for MAIS (math AI system, www.mais.ac), K-12.
   CCSS: 5.G.A.1 (define a coordinate system: two perpendicular axes, the origin,
   the ordered pair, and the convention that the first number travels along the
   x-axis and the second along the y-axis), 5.G.A.2 (plot points), 6.NS.C.6.b
   (signs of the coordinates say which quadrant), 6.NS.C.6.c (plot in all four
   quadrants), 6.NS.C.8 (a coordinate's absolute value is its distance from an
   axis).  Grades 5-6, with a Grade 8 / HS on-ramp.

   House style: the interactive-math-bench standard — one carmine accent for the
   mathematical object, dials that unlock one per lesson step, predict-then-check
   questions gated on ANSWERED (not on correct), and a capstone construction
   challenge with a live meter stamped CALIBRATED on success.

   ---------------------------------------------------------------------------
   WHY A NEW LAB — and how it is DISTINCT from its siblings.

   "Point" lands in the most crowded corner of this library, so the boundaries
   were drawn deliberately and every one of them costs this lab something:

     • DistanceLab owns TWO points, the segment AB, the Δx/Δy right triangle and
       the Pythagorean distance formula.  This lab has ONE point, no second
       endpoint, no hypotenuse, no right-angle marker, and never squares
       anything.  Where that lab measures BETWEEN two addresses, this one asks
       what an address IS.
     • TwoVariableInequalityLab owns the draggable test point AND the lattice
       "point-test grid" lens (every integer point tested and dotted).  This lab
       has no lens of that shape: its unknown is a single location, not a region.
     • LineFunctionLab owns y = m·x + b and the SLOPE TRIANGLE.  No line here has
       a slope; the only lines drawn are the two axis-parallel GUIDES, which are
       not graphs of anything — they are the two coordinates, made visible.
     • LogarithmLab owns the y = x mirror and the reflected twin (y, x) as the
       picture of an INVERSE FUNCTION.  This lab teaches that (3,5) ≠ (5,3), but
       it refuses the mirror device: no y = x diagonal, no reflection segment.
     • CommutativeLab owns the SWAP button and the crease a = b.  There is no
       swap control here either.  Instead, step 3 confronts the misconception the
       commutative labs create — "order never matters" — head on, and the answer
       is that a POINT IS NOT A SUM.  That is a counterpoint, not a copy.

   ---------------------------------------------------------------------------
   THE CENTERPIECE — TWO GUIDES, ONE CROSSING.

   The thesis this lab owns, and which no sibling touches:

       ONE number names a whole LINE of candidates.
       TWO numbers, in order, cross at exactly ONE place.
       That crossing IS the point.

     • THE SMEAR (step 1).  The y dial is LOCKED at the opening step, and this is
       not a gate — it is the mathematics.  Having named only x = 3, the lab
       honestly draws what is actually known: a carmine band down the ENTIRE
       vertical line x = 3.  No dot, because no dot is justified yet.  A student
       who thinks "x = 3" means "the point at 3 on the x-axis" — the single most
       common error in Grade 5 — watches that belief fail on screen.

     • THE COLLAPSE (step 2).  Unlocking y drops the horizontal guide across the
       vertical one.  Two crossing lines meet in exactly one place, so the smear
       collapses to a single carmine dot.  The unlock-per-step machinery of the
       house style is doing real mathematical work here: the locked dial states
       "you have not said y yet", and the picture obeys.

     • THE ROUTE (the lens).  Address as INSTRUCTIONS from the one agreed place,
       the origin: over first, then up.  Two carmine arrows, labelled "3 right"
       and "5 up".  This is the plotting algorithm a student runs on paper.

     • THE QUADRANT MAP (the lens).  The four quadrants tinted and numbered, each
       with its sign pair, so "Quadrant III" is READ off the signs rather than
       memorized — and points on an axis are visibly in no quadrant at all.

   The one accent (CARMINE) is THE POINT — the dot, the smear, the route, the
   address.  BLUE is the two guides: the known reference, the coordinates made
   visible.  Grey is a ghost (the swapped twin) — deliberately not the object.
   Green appears only in the capstone, to mark a clue that is satisfied.

   ---------------------------------------------------------------------------
   EXACT ARITHMETIC.  Every coordinate is an INTEGER on a step-1 dial, so every
   quantity in the lab — a coordinate, a distance from an axis, a sign, a
   quadrant id, a clue's verdict — is exact integer arithmetic.  There is no
   epsilon anywhere in this file, and none is needed.

   THE CAPSTONE'S GATE IS A UNIQUENESS THEOREM.  "The Address Detective" hides a
   point M and reveals it only through three clues.  CALIBRATED fires when all
   three clues are satisfied, which is sound ONLY IF exactly one point satisfies
   them.  So the generator accepts a clue set only after brute-forcing every
   lattice point and finding exactly one solution — and audit-point.mjs re-proves
   that EXHAUSTIVELY, for every M and every clue set the generator can emit, over
   a box far wider than the dials can reach (so a puzzle is never "unique" merely
   because the sliders are short).  That is what makes the stamp unfalsifiable.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/PointLab.jsx
     2. Import and render it:
          import PointLab from './PointLab';
          export default function Page() { return <PointLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (x, y, step, lenses, and
              the capstone puzzle).
     MODEL  — the math (quadrants, distances, clues) is pure; it knows nothing
              about pixels.
     RENDER — the canvas is fully redrawn from state on every change; DPI-aware,
              equal x/y scales, native form controls.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Palette — shared between the canvas and the inline-styled address head (a
   child component; styled-jsx only scopes a component's OWN JSX, so the head is
   styled inline to render identically in Next.js and any preview harness).
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the one accent — THE POINT
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const OK = '#1f8a5b'; // capstone only: a satisfied clue
const BLUE = '#3f74a6'; // the guides — the coordinates made visible
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window.  A square, symmetric integer plane.  The renderer
   derives ONE scale (px per unit) from min(width, height) and uses it for BOTH
   axes.  Equal scales are a correctness property here: a student must be able to
   see that "3 across" and "3 up" are the SAME distance, or the grid is lying.
   ------------------------------------------------------------------------- */
const XMIN = -7;
const XMAX = 7;
const YMIN = -7;
const YMAX = 7;

/* the reachable range for the point — and for the capstone's hidden address */
const PMIN = -6;
const PMAX = 6;

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Just two, because a point IS just two numbers — and the
   unlock order is the lesson:

     x — unlocks at step 0.  Alone, it names a vertical LINE, not a point.
     y — unlocks at step 1.  The second number is what collapses that line to a
         single location.

   Step 1 (integers only): a Grade-5 address is a whole number of steps, and
   integer coordinates make every quantity in this lab exact.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'x', label: 'x', min: PMIN, max: PMAX, step: 1, unlock: 0, star: true, role: 'the FIRST number · across' },
  { key: 'y', label: 'y', min: PMIN, max: PMAX, step: 1, unlock: 1, star: true, role: 'the SECOND number · up' },
];
const START = { x: 3, y: 5 }; // (3, 5) — Quadrant I, and 3 ≠ 5 so the swap moves it

/* the capstone starts the student AT THE ORIGIN — thematically the place every
   address is measured from, and provably never the answer (M is never (0,0)) */
const CALIB_START = { x: 0, y: 0 };

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Pure math, no pixels.  All integer, all exact.
   ------------------------------------------------------------------------- */

/* Quadrant id: 1..4, or 0 for "no quadrant" — the axes and the origin.
   A point ON an axis is in NO quadrant.  That is not a technicality this lab
   glosses over; it is step 5's whole point, and `id: 0` is how the model says
   it.  The quadrants are numbered ANTICLOCKWISE from the top right — the
   convention every US textbook uses. */
const ROMAN = ['', 'I', 'II', 'III', 'IV'];
function quadrantOf(x, y) {
  if (x === 0 && y === 0) return { id: 0, name: 'the origin' };
  if (x === 0) return { id: 0, name: 'on the y-axis' };
  if (y === 0) return { id: 0, name: 'on the x-axis' };
  if (x > 0 && y > 0) return { id: 1, name: 'Quadrant I' };
  if (x < 0 && y > 0) return { id: 2, name: 'Quadrant II' };
  if (x < 0 && y < 0) return { id: 3, name: 'Quadrant III' };
  return { id: 4, name: 'Quadrant IV' }; // x > 0 && y < 0
}
/* the sign pair that DEFINES each quadrant — what the map lens prints */
const QUAD_SIGNS = { 1: '(+, +)', 2: '(−, +)', 3: '(−, −)', 4: '(+, −)' };

/* 6.NS.C.8 — a coordinate's absolute value IS its distance from the other axis.
   |x| counts the unit steps to the y-axis; |y| counts them to the x-axis. */
const distToYAxis = (x) => Math.abs(x);
const distToXAxis = (y) => Math.abs(y);

/* ---------------------------------------------------------------------------
   Formatting — a real minus sign (−), and English for the route legs.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function fmtNum(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
const pointStr = (x, y) => `(${fmtNum(x)}, ${fmtNum(y)})`;

/* the route legs, in the words a student says while plotting.
   x = 0 or y = 0 means that leg is not walked at all — and saying "0 right"
   would be teaching a step that does not exist. */
const acrossWord = (x) => (x === 0 ? 'no step across' : `${Math.abs(x)} ${x > 0 ? 'right' : 'left'}`);
const upWord = (y) => (y === 0 ? 'no step up or down' : `${Math.abs(y)} ${y > 0 ? 'up' : 'down'}`);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; a control unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions ("x = 3 means the point sits at 3 on the x-axis",
   "order never matters because 3 + 5 = 5 + 3", "the origin is in Quadrant I").
   Next is gated on ANSWERED, not on CORRECT.

   The ramp: one number is a LINE → two numbers CROSS at one place → the pair is
   ORDERED → the route from the origin → zero coordinates and the axes → the
   signs make the quadrants → |coordinate| = distance from an axis → find one
   from clues.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One number is not enough',
    body:
      'Say only x = 3. The plane draws a carmine band down the WHOLE vertical ' +
      'line through 3. No dot yet.',
    q: 'You are told only that x = 3. Where is the point?',
    choices: ['Somewhere on that vertical line', 'At 3 on the x-axis', 'At (3, 3)'],
    answer: 0,
    feedback: '"x = 3" names a LINE, not a place. You need one more number.',
  },
  {
    title: 'The second number pins it down',
    body:
      'Unlock y = 5. Two crossing lines meet in exactly one spot — and that ' +
      'crossing IS the point (3, 5).',
    q: 'Why do two numbers pin down exactly one point?',
    choices: [
      'Each number names a line; crossing lines meet once',
      'Because 3 and 5 are odd',
      'They do not',
    ],
    answer: 0,
    feedback: 'That is why a plane is TWO-dimensional: two numbers, two lines, one crossing.',
  },
  {
    title: 'The pair is ORDERED',
    body:
      'Read (3, 5) backwards and you get the grey ghost (5, 3). Same two ' +
      'numbers — different place.',
    q: 'Is (3, 5) the same point as (5, 3)?',
    choices: [
      'No — swapping them lands somewhere else',
      'Yes — 3 + 5 = 5 + 3',
      'Yes — same two numbers',
    ],
    answer: 0,
    feedback:
      'A point is an ADDRESS, not a sum. Read a house number backwards and you ' +
      'arrive at the wrong house.',
  },
  {
    title: 'The route from the origin',
    body:
      'Switch on “The route”: from the ORIGIN (0, 0), go ACROSS first, then UP. ' +
      'A negative just points the other way.',
    q: 'Starting at the origin, how do you plot (−4, 2)?',
    choices: ['4 LEFT, then 2 UP', '4 RIGHT, then 2 UP', '2 up, then 4 left'],
    answer: 0,
    feedback: 'The sign says LEFT. The pair is always read (x, y) — across first.',
  },
  {
    title: 'A zero coordinate puts you on an axis',
    body: 'Set y = 0: the point stays ON the x-axis. Set both to 0: the ORIGIN.',
    q: 'Which point sits on the y-axis?',
    choices: ['(0, 6) — its x is 0', '(6, 0)', 'Only (0, 0)'],
    answer: 0,
    feedback: 'Zero ACROSS never leaves the y-axis. It feels backwards — say it out loud!',
  },
  {
    title: 'The signs make the quadrants',
    body:
      'Four QUADRANTS, numbered I–IV anticlockwise from top right. Just read ' +
      'the two signs.',
    q: 'Which quadrant holds the point (−6, 3)?',
    choices: ['Quadrant II — the sign pair (−, +)', 'Quadrant III', 'Quadrant IV'],
    answer: 0,
    feedback: 'Read the signs, not the sizes. A point on an axis is in NO quadrant.',
  },
  {
    title: 'How far from each axis',
    body:
      '|x| is the distance from the y-axis; |y| from the x-axis. Count the ' +
      'route arrows.',
    q: 'A point is 5 units from the y-axis. What do you know?',
    choices: ['Its x is 5 or −5', 'Its x is 5', 'Its y is 5'],
    answer: 0,
    feedback: 'The distance fixes |x|, not the side. One more clue settles it.',
  },
  {
    title: 'The Address Detective',
    body:
      'Point M is hiding. Exactly ONE address satisfies all three clues — ' +
      'turn every clue green and you have PROVED it.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   CHOICE ORDER.  The steps[] source above keeps the correct answer FIRST: it
   reads better, and it keeps `answer: 0` a meaningful, auditable convention.
   But a student must never be able to pass by always clicking the first choice.
   That is not about scoring — Next is gated on ANSWERED, not on correct, so a
   guessed answer costs nothing anyway. It is that PREDICTING is the entire
   pedagogy of a predict-then-check step, and a student who spots "the first one
   is always right" stops predicting. The lesson quietly stops working.

   So the DISPLAY order is rotated by a hash of the question text:
     • deterministic — the buttons never reorder mid-question or between renders;
     • varies per question AND per lab, unlike a rotation by step index, which
       would leave step 1's answer first in every lab;
     • still lands the answer first ~1 time in 3 — "never first" is just as
       learnable a pattern as "always first".

   ONLY the display moves. State stores ORIGINAL indices throughout, so
   `answer`, the ✓/✕ marks and the feedback are all untouched.
   ------------------------------------------------------------------------- */
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
/* display slot j shows the original choice at index choiceOrder(q, n)[j] */
const choiceOrder = (q, n) => {
  const rot = hashStr(q) % n;
  return Array.from({ length: n }, (_, j) => (j + rot) % n);
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Capstone: THE ADDRESS DETECTIVE (a CONSTRUCTION goal — the skill's
   sanctioned alternative to curve-matching; precedent: IntegerLab, MultiplesLab,
   CubeLab, TwoVariableInequalityLab).

   The lesson runs FORWARD: given an address, find the place.  The capstone runs
   BACKWARD: given facts about a place, find its address.  Deliberately not a
   repeat of what was just practised.

   Every clue is one of the lab's own facts, restated about a hidden M:
     quad   — the sign pair                     (step 5)
     axis   — a zero coordinate                 (step 4)
     distY  — |x|, the distance from the y-axis (step 6)
     distX  — |y|, the distance from the x-axis (step 6)
     xIs    — a coordinate, named outright      (steps 0-1)
     yIs    — likewise
     xSign  — a direction                       (step 3)
     ySign  — likewise

   WHY THE STAMP CANNOT FIRE FALSELY.  The gate is "all three clues satisfied",
   which is only a sound test for "you are standing on M" if M is the ONLY point
   that satisfies them.  So uniqueness is not a nicety here — it is the entire
   correctness argument, and it is enforced twice:

     • the generator brute-forces every lattice point and REJECTS any clue set
       with 0 or 2+ solutions, checked over a box far wider than the dials reach
       (UMIN..UMAX), so a puzzle can never be "unique" merely because the sliders
       are too short to reach the other answer;
     • audit-point.mjs re-proves it EXHAUSTIVELY over every M and every clue set
       the generator could ever emit — not a random sample.

   Two further constraints keep the puzzle honest rather than trivial:
     • never {xIs, yIs} together — that set just hands over the answer;
     • at least one INDIRECT clue (a quadrant, an axis, or a distance), so the
       student has to reason from |x| and a sign back to x, which is the skill
       steps 5-6 just taught.
   ------------------------------------------------------------------------- */
const N_CLUES = 3;

/* the uniqueness box — deliberately far wider than the dials' PMIN..PMAX.  A
   clue set that is unique only inside the dials' reach is not really unique;
   it just has an unreachable rival, and a student who reasoned their way to that
   rival would be RIGHT while the lab called them wrong. */
const UMIN = -20;
const UMAX = 20;

/* does a clue hold at (x, y)?  Pure, and pure integer. */
function clueHolds(c, x, y) {
  switch (c.kind) {
    case 'quad':
      return quadrantOf(x, y).id === c.v;
    case 'axis':
      return c.axis === 'y' ? x === 0 : y === 0;
    case 'distY':
      return distToYAxis(x) === c.d;
    case 'distX':
      return distToXAxis(y) === c.d;
    case 'xIs':
      return x === c.v;
    case 'yIs':
      return y === c.v;
    case 'xSign':
      return c.s > 0 ? x > 0 : x < 0;
    case 'ySign':
      return c.s > 0 ? y > 0 : y < 0;
    default:
      return false;
  }
}

/* the clue, in words a Grade-5 student reads */
function clueText(c) {
  switch (c.kind) {
    case 'quad':
      return `M is in Quadrant ${ROMAN[c.v]}`;
    case 'axis':
      return `M sits on the ${c.axis}-axis`;
    case 'distY':
      return `M is ${c.d} unit${c.d === 1 ? '' : 's'} from the y-axis`;
    case 'distX':
      return `M is ${c.d} unit${c.d === 1 ? '' : 's'} from the x-axis`;
    case 'xIs':
      return `M’s x-coordinate is ${fmtNum(c.v)}`;
    case 'yIs':
      return `M’s y-coordinate is ${fmtNum(c.v)}`;
    case 'xSign':
      return `M’s x-coordinate is ${c.s > 0 ? 'positive' : 'negative'}`;
    case 'ySign':
      return `M’s y-coordinate is ${c.s > 0 ? 'positive' : 'negative'}`;
    default:
      return '';
  }
}

/* every clue that is TRUE of M.  By construction each one holds at M — the audit
   asserts that exhaustively, since a clue that lied about its own target would
   make the puzzle unsolvable. */
function cluePool(M) {
  const pool = [];
  const q = quadrantOf(M.x, M.y);
  if (q.id > 0) pool.push({ kind: 'quad', v: q.id });
  if (M.x === 0) pool.push({ kind: 'axis', axis: 'y' });
  if (M.y === 0) pool.push({ kind: 'axis', axis: 'x' });
  if (M.x !== 0) pool.push({ kind: 'distY', d: distToYAxis(M.x) });
  if (M.y !== 0) pool.push({ kind: 'distX', d: distToXAxis(M.y) });
  pool.push({ kind: 'xIs', v: M.x });
  pool.push({ kind: 'yIs', v: M.y });
  if (M.x !== 0) pool.push({ kind: 'xSign', s: Math.sign(M.x) });
  if (M.y !== 0) pool.push({ kind: 'ySign', s: Math.sign(M.y) });
  return pool;
}

/* every point in a box satisfying all clues.  This is the uniqueness oracle. */
function solutionsOf(clues, lo, hi) {
  const out = [];
  for (let x = lo; x <= hi; x++) {
    for (let y = lo; y <= hi; y++) {
      if (clues.every((c) => clueHolds(c, x, y))) out.push({ x, y });
    }
  }
  return out;
}

const INDIRECT = new Set(['quad', 'axis', 'distY', 'distX']);
/* is this a clue set a student can honestly be asked to solve? */
function comboIsFair(combo) {
  if (combo.some((c) => c.kind === 'xIs') && combo.some((c) => c.kind === 'yIs')) return false;
  return combo.some((c) => INDIRECT.has(c.kind));
}
/* ...and does it prove exactly one address, in the plane at large? */
function comboIsUnique(combo, M) {
  const sols = solutionsOf(combo, UMIN, UMAX);
  return sols.length === 1 && sols[0].x === M.x && sols[0].y === M.y;
}

/* every fair, unique 3-clue set for M.  The pool has at most 9 clues, so this is
   at most C(9,3) = 84 combinations — small enough to enumerate rather than
   sample, which is why the generator never needs a retry loop over clues. */
function validCombos(M) {
  const pool = cluePool(M);
  const out = [];
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      for (let k = j + 1; k < pool.length; k++) {
        const combo = [pool[i], pool[j], pool[k]];
        if (!comboIsFair(combo)) continue;
        if (!comboIsUnique(combo, M)) continue;
        out.push(combo);
      }
    }
  }
  return out;
}

/* Hand the student a fresh case.  M is never the origin: (0, 0) is where the
   capstone STARTS, and a puzzle you solve by not moving is not a puzzle.  (It
   also makes "never pre-solved" a theorem rather than a check — if the only
   solution is M ≠ (0, 0), then the starting point cannot satisfy all three.) */
function makePuzzle(prev, rnd = Math.random) {
  const randInt = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

  for (let guard = 0; guard < 500; guard++) {
    const M = { x: randInt(PMIN, PMAX), y: randInt(PMIN, PMAX) };
    if (M.x === 0 && M.y === 0) continue;
    if (prev && prev.M.x === M.x && prev.M.y === M.y) continue; // never twice running
    const combos = validCombos(M);
    if (!combos.length) continue;
    return { M, clues: combos[randInt(0, combos.length - 1)] };
  }

  /* Unreachable in practice (every non-origin M admits a fair unique set), but a
     hand-checked fallback so the capstone can never hand back null.
     M = (−5, −2): |x| = 5 and |y| = 2 give four candidates, one per quadrant;
     Quadrant III picks out exactly this one. */
  const M = { x: -5, y: -2 };
  return { M, clues: [{ kind: 'quad', v: 3 }, { kind: 'distY', d: 5 }, { kind: 'distX', d: 2 }] };
}

/* how many clues the student's current address satisfies */
const scoreClues = (clues, x, y) => clues.reduce((n, c) => n + (clueHolds(c, x, y) ? 1 : 0), 0);

/* ---------------------------------------------------------------------------
   EDIT 5 — Address display.  The ordered pair, with the two numbers in carmine
   and the comma doing the work it never gets credit for.  Inline styles because
   this is a CHILD component: styled-jsx only scopes a component's OWN JSX, so
   class names declared in the parent's <style jsx> would not reach here — and
   :global() is additionally dropped by the Babel preview harness.  Inlining
   renders identically in both.
   ------------------------------------------------------------------------- */
const CHIP = {
  fontFamily: MONO,
  fontSize: '12.5px',
  fontWeight: 700,
  padding: '3px 9px',
  borderRadius: '999px',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};
function AddressHead({ x, y, yKnown }) {
  const q = quadrantOf(x, y);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <span
        style={{
          fontFamily: MONO,
          fontVariantNumeric: 'tabular-nums',
          fontSize: '26px',
          fontWeight: 700,
          color: INK,
          letterSpacing: '0.01em',
        }}
      >
        (<span style={{ color: CARMINE }}>{fmtNum(x)}</span>,{' '}
        {yKnown ? (
          <span style={{ color: CARMINE }}>{fmtNum(y)}</span>
        ) : (
          <span style={{ color: INK_SOFT }} title="y is not named yet">
            ?
          </span>
        )}
        )
      </span>
      {yKnown ? (
        <span
          style={{
            ...CHIP,
            color: q.id ? CARMINE : INK_SOFT,
            background: q.id ? 'rgba(200,30,79,0.1)' : 'rgba(91,107,123,0.1)',
          }}
        >
          {q.id ? `${q.name} · ${QUAD_SIGNS[q.id]}` : q.name}
        </span>
      ) : (
        <span style={{ ...CHIP, color: INK_SOFT, background: 'rgba(91,107,123,0.1)' }}>a line, not a point</span>
      )}
    </span>
  );
}

/* The live reading of the address — each number, what it names, and where the
   two of them cross.  Generated from x and y, so it can never drift from the
   picture. */
function readLines(x, y, yKnown) {
  const lines = [
    { lhs: 'x', eq: '=', rhs: fmtNum(x), note: 'the FIRST number · names a vertical line' },
  ];
  if (!yKnown) {
    lines.push({ lhs: 'y', eq: '=', rhs: '?', note: 'not named yet · so the point is still a whole line' });
    return lines;
  }
  lines.push({ lhs: 'y', eq: '=', rhs: fmtNum(y), note: 'the SECOND number · names a horizontal line' });
  lines.push({ lhs: 'M', eq: '=', rhs: pointStr(x, y), note: 'where the two guides cross', final: true });
  return lines;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PointLab() {
  const [x, setX] = useState(START.x);
  const [y, setY] = useState(START.y);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [puzzle, setPuzzle] = useState(null);
  const [showRoute, setShowRoute] = useState(false);
  const [showQuads, setShowQuads] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const layoutRef = useRef({});
  const draggingRef = useRef(false);

  const current = STEPS[step];
  const calib = !!current.calib;

  /* THE UNLOCK IS THE MATHEMATICS.  Until y is named there is no point to draw —
     only the line of candidates that x alone allows. */
  const yKnown = calib || step >= 1;
  const showGhost = !calib && step === 2; // the swapped twin lives on exactly one step

  /* derived math — all exact integers */
  const q = quadrantOf(x, y);

  /* capstone scoring — an EXACT integer test over a clue set with a UNIQUE
     solution, so the stamp cannot fire falsely */
  const nRight = calib && puzzle ? scoreClues(puzzle.clues, x, y) : 0;
  const nTotal = puzzle ? puzzle.clues.length : N_CLUES;
  const pct = calib && puzzle ? (100 * nRight) / nTotal : 0;
  const solved = calib && puzzle ? nRight === nTotal : false;

  /* snapshot everything the renderer reads so draw() (a stable callback) never
     sees stale values.  `qid` belongs here too, even though it is derived from x
     and y: the moment draw() reads ANYTHING off the closure instead of this
     snapshot, its dependency list has to track that value as well, and the next
     person to add a lens gets a renderer that paints last render's state. */
  sceneRef.current = { x, y, qid: q.id, yKnown, showGhost, calib, showRoute, showQuads, puzzle, solved };

  /* ---- full redraw from state ------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    const S = sceneRef.current;

    /* ---- ONE scale for both axes ---------------------------------------- */
    const padL = 30;
    const padR = 14;
    const padT = 14;
    const padB = 26;
    const availW = W - padL - padR;
    const availH = H - padT - padB;
    if (availW <= 0 || availH <= 0) return;
    const s = Math.min(availW / (XMAX - XMIN), availH / (YMAX - YMIN)); // px per unit
    const plotW = s * (XMAX - XMIN);
    const plotH = s * (YMAX - YMIN);
    const oxp = padL + (availW - plotW) / 2;
    const oyp = padT + (availH - plotH) / 2;
    const PX = (v) => oxp + (v - XMIN) * s;
    const PY = (v) => oyp + (YMAX - v) * s;
    const plot = { L: oxp, T: oyp, R: oxp + plotW, B: oyp + plotH };
    layoutRef.current = { PX, PY, s, plot };

    const rr = (x0, y0, w, h, rad) => {
      const t = Math.min(rad, w / 2, h / 2);
      g.beginPath();
      g.moveTo(x0 + t, y0);
      g.arcTo(x0 + w, y0, x0 + w, y0 + h, t);
      g.arcTo(x0 + w, y0 + h, x0, y0 + h, t);
      g.arcTo(x0, y0 + h, x0, y0, t);
      g.arcTo(x0, y0, x0 + w, y0, t);
      g.closePath();
    };
    /* Pills of text, drawn LAST so nothing strokes through them.  Split into
       MEASURE and DRAW so pills can be collision-checked before any is
       committed: on a phone the scale compresses to ~22px per unit and the
       address pill, the route labels and the ghost's label all want the same
       few square centimetres.  A dropped label beats an unreadable pile. */
    const PILL_F = '700 11.5px ' + MONO;
    const placed = [];
    const pillRect = (text, cx, cy) => {
      g.font = PILL_F;
      const pw = g.measureText(text).width + 14;
      const ph = 19;
      return {
        x: Math.max(plot.L + 1, Math.min(plot.R - pw - 1, cx - pw / 2)),
        y: Math.max(plot.T + 1, Math.min(plot.B - ph - 1, cy - ph / 2)),
        w: pw,
        h: ph,
        text,
      };
    };
    const overlaps = (a, c) => a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
    const drawPill = (r, col, tint) => {
      rr(r.x, r.y, r.w, r.h, 9);
      /* an OPAQUE base under the tint — a translucent pill lets the grid and the
         axis tick labels underneath show through and the text stops being
         readable */
      g.fillStyle = '#fdfefe';
      g.fill();
      g.fillStyle = tint;
      g.fill();
      g.strokeStyle = col;
      g.lineWidth = 1.1;
      g.stroke();
      g.fillStyle = col;
      g.font = PILL_F;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(r.text, r.x + r.w / 2, r.y + r.h / 2 + 0.5);
      placed.push(r);
    };
    /* try each candidate spot in turn; DROP the label rather than overlap */
    const tryPill = (text, spots, col, tint) => {
      for (const [cx, cy] of spots) {
        const r = pillRect(text, cx, cy);
        if (!placed.some((p) => overlaps(p, r))) {
          drawPill(r, col, tint);
          return true;
        }
      }
      return false;
    };

    /* everything is clipped to the plot rectangle */
    g.save();
    g.beginPath();
    g.rect(plot.L, plot.T, plotW, plotH);
    g.clip();

    /* ---- paper ---------------------------------------------------------- */
    g.fillStyle = '#fdfefe';
    g.fillRect(plot.L, plot.T, plotW, plotH);

    /* =================== THE QUADRANT MAP (a lens) ======================= */
    /* Note what is NOT tinted: the axes.  A point on an axis is in no quadrant,
       and the picture should not quietly suggest otherwise. */
    if (S.showQuads) {
      const x0 = PX(0);
      const y0 = PY(0);
      const tints = [
        { id: 1, l: x0, t: plot.T, r: plot.R, b: y0 },
        { id: 2, l: plot.L, t: plot.T, r: x0, b: y0 },
        { id: 3, l: plot.L, t: y0, r: x0, b: plot.B },
        { id: 4, l: x0, t: y0, r: plot.R, b: plot.B },
      ];
      for (const t of tints) {
        g.fillStyle = t.id === S.qid && S.yKnown ? 'rgba(200,30,79,0.07)' : 'rgba(63,116,166,0.045)';
        g.fillRect(t.l, t.t, t.r - t.l, t.b - t.t);
      }
    }

    /* ---- quadrille paper: integer rules both ways ----------------------- */
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(199,216,228,0.75)';
    g.beginPath();
    for (let v = XMIN; v <= XMAX; v++) {
      const px = Math.round(PX(v)) + 0.5;
      g.moveTo(px, plot.T);
      g.lineTo(px, plot.B);
    }
    for (let v = YMIN; v <= YMAX; v++) {
      const py = Math.round(PY(v)) + 0.5;
      g.moveTo(plot.L, py);
      g.lineTo(plot.R, py);
    }
    g.stroke();

    /* =================== THE SMEAR — x alone is a LINE =================== */
    /* Before y is named, this band is the honest answer to "where is it?": the
       whole set of points the student has actually specified. */
    if (!S.yKnown) {
      const bx = PX(S.x);
      g.fillStyle = 'rgba(200,30,79,0.14)';
      g.fillRect(bx - s * 0.22, plot.T, s * 0.44, plotH);
    }

    /* ---- axes ----------------------------------------------------------- */
    g.strokeStyle = 'rgba(28,43,58,0.75)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(plot.L, Math.round(PY(0)) + 0.5);
    g.lineTo(plot.R, Math.round(PY(0)) + 0.5);
    g.moveTo(Math.round(PX(0)) + 0.5, plot.T);
    g.lineTo(Math.round(PX(0)) + 0.5, plot.B);
    g.stroke();

    /* =================== THE TWO GUIDES (the centerpiece) ================ */
    /* Each guide is one coordinate, made visible: every point on the vertical
       one has first coordinate x; every point on the horizontal one has second
       coordinate y.  They are not graphs — they are the address, drawn. */
    g.save();
    g.strokeStyle = BLUE;
    g.lineWidth = 2;
    g.setLineDash([6, 4]);
    g.beginPath();
    g.moveTo(Math.round(PX(S.x)) + 0.5, plot.T);
    g.lineTo(Math.round(PX(S.x)) + 0.5, plot.B);
    if (S.yKnown) {
      g.moveTo(plot.L, Math.round(PY(S.y)) + 0.5);
      g.lineTo(plot.R, Math.round(PY(S.y)) + 0.5);
    }
    g.stroke();
    g.restore();

    /* the anchors: where each guide meets its axis — the number you named */
    const anchor = (px, py) => {
      g.beginPath();
      g.arc(px, py, 3.2, 0, Math.PI * 2);
      g.fillStyle = BLUE;
      g.fill();
    };
    anchor(PX(S.x), PY(0));
    if (S.yKnown) anchor(PX(0), PY(S.y));

    /* =================== THE ROUTE (a lens) ============================== */
    /* The address as instructions from the origin: across FIRST, then up. */
    if (S.showRoute && S.yKnown) {
      const arrow = (x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 2) return;
        const ux = dx / len;
        const uy = dy / len;
        const hl = Math.min(9, len * 0.5); // head length
        g.strokeStyle = CARMINE;
        g.lineWidth = 2.6;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2 - ux * hl * 0.9, y2 - uy * hl * 0.9);
        g.stroke();
        g.fillStyle = CARMINE;
        g.beginPath();
        g.moveTo(x2, y2);
        g.lineTo(x2 - ux * hl - uy * 4.2, y2 - uy * hl + ux * 4.2);
        g.lineTo(x2 - ux * hl + uy * 4.2, y2 - uy * hl - ux * 4.2);
        g.closePath();
        g.fill();
      };
      arrow(PX(0), PY(0), PX(S.x), PY(0)); // across first …
      arrow(PX(S.x), PY(0), PX(S.x), PY(S.y)); // … then up
    }

    /* =================== THE GHOST TWIN (step 3 only) ==================== */
    /* (y, x) — the same two numbers, read backwards.  Grey, hollow, and
       deliberately NOT the object: no mirror line, no reflection segment. */
    if (S.showGhost && S.x !== S.y) {
      const gx = PX(S.y);
      const gy = PY(S.x);
      g.strokeStyle = INK_SOFT;
      g.lineWidth = 2;
      g.setLineDash([3, 3]);
      g.beginPath();
      g.arc(gx, gy, 7.5, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }

    /* =================== THE POINT (the hero) ============================ */
    /* Drawn only once it EXISTS — that is, once y has been named. */
    if (S.yKnown) {
      const px = PX(S.x);
      const py = PY(S.y);

      /* the capstone reveals M with a green ring the instant it is proved */
      if (S.calib && S.solved) {
        g.strokeStyle = OK;
        g.lineWidth = 2.4;
        g.beginPath();
        g.arc(px, py, 15, 0, Math.PI * 2);
        g.stroke();
      }

      /* a white halo so the dot reads over the guides and the grid */
      g.beginPath();
      g.arc(px, py, 9.5, 0, Math.PI * 2);
      g.fillStyle = '#ffffff';
      g.fill();

      g.beginPath();
      g.arc(px, py, 6.5, 0, Math.PI * 2);
      g.fillStyle = CARMINE;
      g.fill();

      /* grab ring */
      g.strokeStyle = 'rgba(200,30,79,0.3)';
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(px, py, 12.5, 0, Math.PI * 2);
      g.stroke();
    }

    /* ---- tick labels (drawn over the tints, under the pills) ------------- */
    g.font = '600 10px ' + MONO;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    for (let v = XMIN + 1; v <= XMAX - 1; v++) {
      if (v === 0 || v % 2 !== 0) continue;
      g.fillStyle = 'rgba(91,107,123,0.9)';
      g.fillText(fmtNum(v), PX(v), PY(0) + 4);
    }
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    for (let v = YMIN + 1; v <= YMAX - 1; v++) {
      if (v === 0 || v % 2 !== 0) continue;
      g.fillStyle = 'rgba(91,107,123,0.9)';
      g.fillText(fmtNum(v), PX(0) - 5, PY(v));
    }
    /* the origin, named — every address on this plane is measured from here */
    g.textAlign = 'right';
    g.textBaseline = 'top';
    g.fillStyle = 'rgba(91,107,123,0.9)';
    g.fillText('O', PX(0) - 5, PY(0) + 4);

    /* ---- quadrant numerals (a lens) ------------------------------------- */
    if (S.showQuads) {
      const corners = [
        { id: 1, x: 4.6, y: 5.9 },
        { id: 2, x: -4.6, y: 5.9 },
        { id: 3, x: -4.6, y: -5.9 },
        { id: 4, x: 4.6, y: -5.9 },
      ];
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (const c of corners) {
        const on = c.id === S.qid && S.yKnown;
        g.fillStyle = on ? 'rgba(200,30,79,0.85)' : 'rgba(63,116,166,0.5)';
        g.font = `700 ${on ? 16 : 14}px ` + MONO;
        g.fillText(ROMAN[c.id], PX(c.x), PY(c.y));
        g.font = '600 10px ' + MONO;
        g.fillStyle = on ? 'rgba(200,30,79,0.7)' : 'rgba(63,116,166,0.45)';
        g.fillText(QUAD_SIGNS[c.id], PX(c.x), PY(c.y) + 15);
      }
    }

    /* ---- pills, last ---------------------------------------------------- */
    if (S.yKnown) {
      const px = PX(S.x);
      const py = PY(S.y);
      /* the address rides beside its own dot, trying four placements */
      if (!S.calib || S.solved) {
        tryPill(
          pointStr(S.x, S.y),
          [
            [px + 44, py - 20],
            [px - 44, py - 20],
            [px + 44, py + 20],
            [px - 44, py + 20],
          ],
          CARMINE,
          'rgba(200,30,79,0.1)'
        );
      }
      /* the route's two legs, labelled with the words a student says */
      if (S.showRoute) {
        if (S.x !== 0) tryPill(acrossWord(S.x), [[(PX(0) + px) / 2, PY(0) + 17], [(PX(0) + px) / 2, PY(0) - 17]], CARMINE, 'rgba(200,30,79,0.1)');
        if (S.y !== 0) tryPill(upWord(S.y), [[px + 40, (PY(0) + py) / 2], [px - 40, (PY(0) + py) / 2]], CARMINE, 'rgba(200,30,79,0.1)');
      }
      /* the ghost names itself, or the lesson is a riddle */
      if (S.showGhost && S.x !== S.y) {
        tryPill(pointStr(S.y, S.x), [[PX(S.y) + 44, PY(S.x) + 20], [PX(S.y) - 44, PY(S.x) + 20], [PX(S.y) + 44, PY(S.x) - 20]], INK_SOFT, 'rgba(91,107,123,0.1)');
      }
    } else {
      tryPill(`x = ${fmtNum(S.x)}`, [[PX(S.x) + 42, plot.T + 18], [PX(S.x) - 42, plot.T + 18]], CARMINE, 'rgba(200,30,79,0.1)');
    }

    g.restore(); // release the clip

    /* ---- axis names, outside the plot ----------------------------------- */
    g.font = 'italic 700 12px ' + MONO;
    g.fillStyle = INK_SOFT;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText('x', plot.R - 10, PY(0) - 12);
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText('y', PX(0) + 13, plot.T + 14);
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [x, y, step, puzzle, showRoute, showQuads, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* the lenses arrive with the step that needs them — but stay under the
     student's thumb afterwards */
  useEffect(() => {
    if (step === 3) setShowRoute(true);
    if (step === 5) setShowQuads(true);
  }, [step]);

  /* hand a fresh case to the capstone the first time we reach it */
  useEffect(() => {
    if (current.calib && !puzzle) setPuzzle(makePuzzle(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* entering the capstone: start at the ORIGIN, never at the answer */
  useEffect(() => {
    if (calib && puzzle) {
      setX(CALIB_START.x);
      setY(CALIB_START.y);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle, calib]);

  /* ---- pointer drag on the canvas ---------------------------------------- */
  /* Only UNLOCKED axes move.  At step 0 that means the point slides
     horizontally and nothing else — because y has not been named, and letting a
     drag name it would undo the whole opening lesson. */
  const pointerToXY = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const { PX, PY, s } = layoutRef.current;
    if (!canvas || !s) return null;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const snap = (v) => Math.max(PMIN, Math.min(PMAX, Math.round(v)));
    return { x: snap(XMIN + (px - PX(XMIN)) / s), y: snap(YMAX - (py - PY(YMAX)) / s) };
  };
  const place = (e) => {
    const v = pointerToXY(e.clientX, e.clientY);
    if (!v) return;
    setX(v.x);
    if (yKnown) setY(v.y);
  };
  const onDown = (e) => {
    draggingRef.current = true;
    place(e);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!draggingRef.current) return;
    place(e);
  };
  const onUp = (e) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  /* ---- other interaction ------------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'x') setX(v);
    else setY(v);
  };
  const resetDials = () => {
    setX(START.x);
    setY(START.y);
  };
  const goHome = () => {
    setX(0);
    setY(0);
  };
  const showMe = () => {
    if (!puzzle) return;
    setX(puzzle.M.x);
    setY(puzzle.M.y);
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const dialLocked = (d) => !calib && step < d.unlock;

  const spoken = calib
    ? puzzle
      ? `Coordinate plane. Detective challenge: find the hidden point M from ${nTotal} clues. ` +
        `Your point is at ${pointStr(x, y)}, ${q.name}. ${nRight} of ${nTotal} clues are satisfied.` +
        (solved ? ` Calibrated. M is ${pointStr(puzzle.M.x, puzzle.M.y)}.` : '')
      : 'Challenge loading.'
    : yKnown
      ? `Coordinate plane. The point is at ${pointStr(x, y)}, ${q.name}. ` +
        `The vertical guide is the line x equals ${fmtNum(x)} and the horizontal guide is the line y equals ` +
        `${fmtNum(y)}; the point is where they cross. From the origin: ${acrossWord(x)}, then ${upWord(y)}.`
      : `Coordinate plane. Only x has been named, as ${fmtNum(x)}. The picture shows the whole vertical ` +
        `line x equals ${fmtNum(x)} — every point on it fits what is known so far. No single point yet.`;

  return (
    <div className="ptlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Point — an Address on the Plane</h1>
        <p className="lede">
          One number names a whole <em>line</em> of places. Two numbers, in order, cross at exactly{' '}
          <em>one</em>. That crossing is a point, and{' '}
          <span className="mono">(x,&nbsp;y)</span> is its address — first across, then up. Each control
          unlocks with the lesson.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <AddressHead x={x} y={y} yKnown={yKnown} />
            </p>
            <p className="equation-sub mono">
              {calib
                ? `${nRight} of ${nTotal} clues satisfied`
                : yKnown
                  ? 'the point is where the two guides cross'
                  : 'one number named — one line of candidates'}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            role="img"
            aria-label={spoken}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {calib ? 'drag to test an address' : yKnown ? 'drag the point anywhere' : 'slide x — the line slides'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Address · (x, y)</span>
              <span className="fact-v mono">{yKnown ? pointStr(x, y) : `(${fmtNum(x)}, ?)`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">From the origin</span>
              <span className="fact-v mono" style={{ color: BLUE }}>
                {yKnown ? `${acrossWord(x)}, ${upWord(y)}` : acrossWord(x)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Distance from the axes</span>
              <span className="fact-v mono">
                {yKnown ? `|x| = ${distToYAxis(x)} · |y| = ${distToXAxis(y)}` : `|x| = ${distToYAxis(x)}`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">{calib ? 'Clues satisfied' : 'Where it lives'}</span>
              <span
                className="fact-v"
                style={{ color: calib ? (solved ? OK : INK_SOFT) : q.id ? CARMINE : INK_SOFT }}
              >
                {calib ? `${nRight} / ${nTotal}` : yKnown ? q.name : 'nowhere yet — it is a line'}
              </span>
            </div>
          </div>

          <div className="steps">
            <p className="steps-title">Read the address</p>
            <ol>
              {readLines(x, y, yKnown).map((ln, i) => (
                <li key={i} className={'step-line' + (ln.final ? ' final' : '')}>
                  <span className="step-eq mono">
                    <span className="xac">{ln.lhs}</span> <span className="op">{ln.eq}</span>{' '}
                    <span>{ln.rhs}</span>
                  </span>
                  <span className="step-note">{ln.note}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (showRoute ? ' on' : '')}
              onClick={() => setShowRoute((v) => !v)}
              aria-pressed={showRoute}
              disabled={!yKnown}
            >
              {showRoute ? 'Hide the route' : 'Show the route'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showQuads ? ' on' : '')}
              onClick={() => setShowQuads((v) => !v)}
              aria-pressed={showQuads}
            >
              {showQuads ? 'Hide quadrant map' : 'Show quadrant map'}
            </button>
            <button type="button" className="btn ghost" onClick={goHome}>
              Go to the origin
            </button>
            <button type="button" className="btn ghost" onClick={resetDials} disabled={calib}>
              Reset dials
            </button>
          </div>
        </section>

        {/* ---------- TUTOR ---------- */}
        <aside className="panel tutor">
          <div className="progress" role="list" aria-label="Lesson progress">
            {STEPS.map((_, i) => (
              <span
                key={i}
                role="listitem"
                className={'pip' + (i === step ? ' cur' : '') + (i < step ? ' done' : '')}
                aria-current={i === step ? 'step' : undefined}
              />
            ))}
          </div>

          <p className="eyebrow small">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2>{current.title}</h2>
          <p className="body">{current.body}</p>

          <div className="dials">
            {PARAMS.map((d) => {
              const locked = dialLocked(d);
              const val = { x, y }[d.key];
              return (
                <label className={'dial' + (locked ? ' locked' : '')} key={d.key}>
                  <span className="dk" style={d.star ? { color: CARMINE } : undefined}>
                    {d.label}
                  </span>
                  <span className="drole">{locked ? 'not named yet — that is the lesson' : d.role}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={d.step}
                    value={val}
                    disabled={locked}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    style={d.star ? { accentColor: CARMINE } : undefined}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{locked ? '🔒' : fmtNum(val)}</output>
                </label>
              );
            })}
          </div>

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {/* `orig` is the index in steps[].choices; only the ORDER of the
                    buttons is rotated, so every comparison below still speaks
                    the source's language. */}
                {choiceOrder(current.q, current.choices.length).map((orig) => {
                  const chosen = answers[step];
                  const isChosen = chosen === orig;
                  const isCorrect = orig === current.answer;
                  let cls = 'choice';
                  if (chosen != null) {
                    if (isCorrect) cls += ' correct';
                    else if (isChosen) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button
                      type="button"
                      key={orig}
                      className={cls}
                      onClick={() => choose(orig)}
                      disabled={chosen != null}
                    >
                      <span className="mark" aria-hidden="true">
                        {chosen != null && isCorrect ? '✓' : chosen != null && isChosen ? '✕' : ''}
                      </span>
                      {current.choices[orig]}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {/* the capstone panel — guarded on `puzzle`, which an EFFECT supplies:
              reading puzzle.clues on the first render would white-screen the lab
              at the very moment a student reaches it. */}
          {current.calib && puzzle && (
            <div className="calib">
              <p className="calib-goal">
                Three clues. <strong>Exactly one address</strong> on the whole plane fits all of them — find it.
              </p>

              <ul className="clues">
                {puzzle.clues.map((c, i) => {
                  const on = clueHolds(c, x, y);
                  return (
                    <li key={i} className={'clue' + (on ? ' on' : '')}>
                      <span className="clue-mark" aria-hidden="true">
                        {on ? '✓' : '○'}
                      </span>
                      <span className="clue-t">{clueText(c)}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {solved ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {nTotal - nRight} clue{nTotal - nRight === 1 ? '' : 's'} still unsatisfied
                  </span>
                )}
              </div>
              {solved && (
                <p className="factnote">
                  M = {pointStr(puzzle.M.x, puzzle.M.y)}. Only one address on the plane satisfies all three clues,
                  so this is not a lucky guess — the clues PROVE it. From the origin: {acrossWord(puzzle.M.x)},
                  then {upWord(puzzle.M.y)}.
                </p>
              )}
              <div className="calib-btns">
                <button type="button" className="btn ghost" onClick={showMe}>
                  Show me
                </button>
                <button type="button" className="btn ghost" onClick={() => setPuzzle(makePuzzle(puzzle))}>
                  New case
                </button>
              </div>
            </div>
          )}

          <div className="nav">
            <button type="button" className="btn ghost" onClick={goBack} disabled={step === 0}>
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn" onClick={goNext} disabled={!canNext}>
                {hasQuestion && !answered ? 'Answer to continue' : 'Next →'}
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setStep(0);
                  setAnswers({});
                  setPuzzle(null);
                  setShowRoute(false);
                  setShowQuads(false);
                  resetDials();
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">(x, y)</span> &nbsp;·&nbsp; the ordered pair — the first number names a vertical
        line, the second names a horizontal one, and the point is the one place they cross. Read it backwards and
        you arrive at the wrong house.
      </footer>

      <style jsx>{`
        .ptlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #3f74a6;
          --quad: #c7d8e4;
          --ok: #1f8a5b;
          --mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
          --serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
          background: var(--page);
          color: var(--ink);
          font: 16px/1.55 system-ui, -apple-system, 'Segoe UI', sans-serif;
          padding: 28px 18px 44px;
          border-radius: 16px;
          max-width: 1120px;
          margin: 0 auto;
        }
        .mono {
          font-family: var(--mono);
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0 0 6px;
        }
        .eyebrow.small {
          margin: 0 0 4px;
        }
        h1 {
          font-family: var(--serif);
          font-weight: 600;
          font-size: clamp(26px, 4vw, 34px);
          margin: 0 0 6px;
        }
        .lede {
          color: var(--ink-soft);
          margin: 0 0 22px;
          max-width: 72ch;
        }
        .lede em {
          font-style: italic;
          color: var(--ink);
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 350px;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 940px) {
          .bench {
            grid-template-columns: 1fr;
          }
        }
        .panel {
          background: #fff;
          border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel {
          padding: 14px;
        }
        .stage-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .equation {
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        /* A PLANE wants a square box — the renderer keeps the x and y scales
           equal regardless, but a square stage wastes no room doing it. */
        .stage {
          position: relative;
          width: min(100%, 560px);
          aspect-ratio: 1 / 1;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          cursor: crosshair;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        /* A plane cannot trade aspect ratio for room the way a number line can
           (equal x/y scales are non-negotiable when "3 across" and "3 up" must
           look the same length), so on a phone buy the stage back by shedding
           chrome padding instead. */
        @media (max-width: 560px) {
          .ptlab {
            padding: 20px 10px 32px;
          }
          .stage-panel {
            padding: 8px;
          }
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .hint {
          position: absolute;
          left: 10px;
          top: 9px;
          font-size: 11px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.82);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin: 14px 4px 4px;
        }
        @media (max-width: 460px) {
          .facts {
            grid-template-columns: 1fr;
          }
        }
        .fact {
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding: 6px 0;
          border-top: 1px solid rgba(28, 43, 58, 0.08);
        }
        .fact-k {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v {
          font-size: 13.5px;
          font-variant-numeric: tabular-nums;
        }
        .steps {
          margin: 14px 4px 2px;
          padding: 12px 14px;
          background: rgba(28, 43, 58, 0.025);
          border: 1px solid rgba(28, 43, 58, 0.08);
          border-radius: 8px;
        }
        .steps-title {
          margin: 0 0 8px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .steps ol {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 6px;
        }
        .step-line {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
        }
        .step-line.final {
          border-top: 1px solid rgba(28, 43, 58, 0.08);
          padding-top: 6px;
        }
        .step-eq {
          font-size: 15px;
          font-variant-numeric: tabular-nums;
          color: var(--ink);
        }
        .step-line.final .step-eq {
          font-weight: 700;
        }
        .step-eq .xac {
          color: var(--curve);
          font-weight: 700;
        }
        .step-eq .op {
          color: var(--ink-soft);
          padding: 0 1px;
        }
        .step-note {
          font-size: 12px;
          color: var(--ink-soft);
          font-style: italic;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }
        .btn {
          font: 600 13px/1 system-ui, sans-serif;
          padding: 9px 14px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid var(--ink);
          background: var(--ink);
          color: #fff;
          transition: background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
        }
        .btn.ghost {
          background: transparent;
          color: var(--ink);
        }
        .btn.ghost.on {
          background: var(--curve);
          border-color: var(--curve);
          color: #fff;
        }
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn:not(:disabled):hover {
          filter: brightness(1.08);
        }
        .tutor {
          padding: 18px 20px 20px;
        }
        .progress {
          display: flex;
          gap: 5px;
          margin-bottom: 14px;
        }
        .pip {
          height: 5px;
          flex: 1;
          border-radius: 3px;
          background: rgba(28, 43, 58, 0.14);
        }
        .pip.done {
          background: rgba(200, 30, 79, 0.45);
        }
        .pip.cur {
          background: var(--curve);
        }
        h2 {
          font-family: var(--serif);
          font-weight: 600;
          font-size: 20px;
          margin: 0 0 10px;
          padding-bottom: 9px;
          border-bottom: 3px double rgba(200, 30, 79, 0.45);
        }
        .body {
          margin: 0 0 16px;
          font-size: 14.5px;
        }
        .dials {
          display: grid;
          gap: 12px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 22px 1fr 48px;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 2px 10px;
        }
        .dial.locked {
          opacity: 0.5;
        }
        .dk {
          grid-row: 1 / 3;
          font-family: var(--serif);
          font-style: italic;
          font-size: 19px;
        }
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
          accent-color: var(--ink);
          cursor: pointer;
        }
        .dial input[type='range']:disabled {
          cursor: not-allowed;
        }
        .dv {
          grid-column: 3;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 13.5px;
        }
        .quiz {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(28, 43, 58, 0.1);
        }
        .q {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 10px;
        }
        .choices {
          display: grid;
          gap: 7px;
        }
        .choice {
          text-align: left;
          font: 13.5px/1.4 system-ui, sans-serif;
          padding: 9px 11px 9px 30px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 8px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          position: relative;
          transition: border-color 0.15s, background 0.15s;
        }
        .choice:not(:disabled):hover {
          border-color: var(--ink);
        }
        .choice .mark {
          position: absolute;
          left: 10px;
          font-weight: 700;
        }
        .choice.correct {
          border-color: var(--ok);
          background: rgba(31, 138, 91, 0.08);
        }
        .choice.correct .mark {
          color: var(--ok);
        }
        .choice.wrong {
          border-color: var(--ink-soft);
          background: rgba(91, 107, 123, 0.08);
        }
        .choice.wrong .mark {
          color: var(--ink-soft);
        }
        .choice.dim {
          opacity: 0.55;
        }
        .choice:disabled {
          cursor: default;
        }
        .feedback {
          margin: 12px 0 0;
          font-size: 13px;
          line-height: 1.55;
          color: var(--ink);
          background: rgba(200, 30, 79, 0.05);
          border-left: 3px solid var(--curve);
          padding: 10px 12px;
          border-radius: 0 6px 6px 0;
        }
        .calib {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(28, 43, 58, 0.1);
          display: grid;
          gap: 10px;
        }
        .calib-goal {
          margin: 0;
          font-size: 13.5px;
          color: var(--ink);
        }
        .clues {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 6px;
        }
        .clue {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-size: 13px;
          padding: 7px 10px;
          border: 1px solid rgba(28, 43, 58, 0.14);
          border-radius: 8px;
          background: var(--paper);
          color: var(--ink-soft);
          transition: border-color 0.15s, background 0.15s, color 0.15s;
        }
        .clue.on {
          border-color: var(--ok);
          background: rgba(31, 138, 91, 0.08);
          color: var(--ink);
        }
        .clue-mark {
          font-weight: 700;
          color: rgba(28, 43, 58, 0.3);
        }
        .clue.on .clue-mark {
          color: var(--ok);
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--curve));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
          text-align: right;
        }
        .factnote {
          margin: 0;
          font-size: 12.5px;
          color: var(--ink);
          background: rgba(31, 138, 91, 0.08);
          border-left: 3px solid var(--ok);
          padding: 9px 11px;
          border-radius: 0 6px 6px 0;
        }
        .stamp {
          font: 700 12px/1 var(--mono);
          letter-spacing: 0.16em;
          color: var(--ok);
          border: 2px solid var(--ok);
          border-radius: 6px;
          padding: 4px 8px;
          transform: rotate(-3deg);
        }
        .calib-btns {
          display: flex;
          gap: 9px;
        }
        .nav {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }
        .foot {
          margin-top: 24px;
          font-size: 12.5px;
          color: var(--ink-soft);
        }
        :global(.ptlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .clue {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
