'use client';

/* ============================================================================
   AbsoluteValueLab — an interactive "bench" for ABSOLUTE VALUE, told as the
   story of A FOLD.

   Built for MAIS (math AI system, www.mais.ac), K-12. Algebra 1 territory with
   a grade 6–7 on-ramp — CCSS 6.NS.C.7c (absolute value as magnitude),
   7.NS.A.1c (|p − q| is the distance between p and q), HSF-IF.B.4 / HSF-BF.B.3
   (graph and interpret an absolute value function), HSA-REI.D.11 (solutions as
   the crossings of two graphs).

   House style: the interactive-math-bench standard — a quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with a
   live match meter and a CALIBRATED stamp.

   THE SIGNATURE CENTERPIECE — "the fold."
     Put a LINE inside the bars: y = |m·x + b|. The blue dashed line is the
     inside; the part of it hanging BELOW the x-axis swings up through the plane
     — exactly as a sheet of paper folds along a crease — and lands as the
     carmine V. The animation is the honest one: a point (x, y) rotating about
     the x-axis through a dihedral angle πf projects to (x, y·cos πf), so
     f = 0 is the bare line, f = ½ is flat on the axis, and f = 1 is |m·x + b|.

     Three things become visible that a rule never shows:
       • The line's X-INTERCEPT BECOMES THE V'S CORNER. The crease lands exactly
         where the inside is 0 — which is WHY the corner sits at x = −b/m.
       • The V ALWAYS OPENS UP, whatever the sign of m, because a fold can only
         lift things onto the non-negative side. "Never negative" is a picture.
       • A V HAS TWO SIDES, so a level line y = d cuts it TWICE — which is why
         |m·x + b| = d has two answers, and why a level BELOW the axis (d < 0)
         has none at all.

     This attacks the classic misconception head-on. "Absolute value drops the
     minus sign" is unusable here: with a whole line inside the bars you cannot
     drop anything, you must ask WHERE the inside is negative. The answer is the
     piecewise rule, and the fold is that rule in motion.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files):
     • IntegerLab owns |a| for ONE INTEGER: a bracket measured from 0 out to a
       on a number line, plus its mirror-at-zero fold that makes OPPOSITES. That
       lab has no curve and no coordinate plane at all. This lab never draws
       that bracket: its object is the FUNCTION x ↦ |m·x + b| on the plane, and
       its fold is a different fold — a crease along the X-AXIS that turns a
       LINE into a V, not a mirror at 0 that turns a into −a.
     • InequalityLab owns the SOLUTION SET of a·x + b {<,≤,>,≥} c as a shaded
       RAY on a number line with a draggable test dot. This lab draws no ray and
       no test dot; it reads solutions off the CROSSINGS of two graphs, and its
       answer is a pair of points, not a half-line.
     • QuadraticFunctionLab owns vertex form y = a(x−h)² + k with its a/h/k
       dials (direction, width, shifts, roots). This lab refuses that dial set
       on purpose — a|x−h|+k would be that same lab with ² swapped for bars.
       Its dials are the INSIDE LINE's own coefficients (m, b) plus a LEVEL (d),
       and its story is folding and sign, not stretching and shifting.
     • DistanceLab owns distance in the coordinate plane (the |Δx|, |Δy| legs of
       the distance formula between two points).
     • LineFunctionLab owns y = m·x + b itself — here that line is the demoted
       blue INPUT to the bars, never the subject.

   COLOUR (following SystemsOfEquationsLab / LCMLab):
     carmine = THE mathematical object, the absolute value — the V, the bars,
               the corner. blue = the INSIDE, the line before the bars (known,
               subordinate). gold = THE ANSWER — the level line and the
               solutions where it meets the V. green = a verified state.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/AbsoluteValueLab.jsx
     2. Import and render it:
          import AbsoluteValueLab from './AbsoluteValueLab';
          export default function Page() { return <AbsoluteValueLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (m, b, d, the fold, the
              lesson step, answers, the challenge target).
     MODEL  — pure math on INTEGER parameters. Every fact the lab states (the
              corner, the solutions, the sign of the inside) is decided by exact
              integer arithmetic; floats only ever move pixels.
     RENDER — the canvas is fully redrawn from state on every change.

   Verified by audit-absolutevalue.mjs (numeric proof) and verify-absolutevalue
   .html (in-browser harness).
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // THE object — the absolute value, the V
const BLUE = '#2f6f9f'; // the inside: the line before the bars
const GOLD = '#c8891e'; // the answer: the level and its solutions
const GOLD_DK = '#8f6410';
const INK_SOFT = '#5b6b7b';
const MINUS = '−'; // U+2212, a real minus sign — never a hyphen
const FOLD_DUR = 1300; // ms for a full unfolded → folded swing

/* the plotted window. Square, so the quadrille cells are square, and symmetric
   in y so the fold has equal room on both sides of its crease. With |m| ≤ 3 and
   |b| ≤ 6 the corner x = −b/m always lands inside it. */
const WORLD = { xmin: -8, xmax: 8, ymin: -8, ymax: 8 };

/* dial ranges */
const M_MIN = -3;
const M_MAX = 3;
const B_MIN = -6;
const B_MAX = 6;
const D_MIN = -3; // negative levels are allowed ON PURPOSE: |…| = −2 has no
const D_MAX = 6; // solution, and that is a fact best seen, not asserted.

/* ===========================================================================
   MODEL — pure math. Integer parameters in, exact facts out.
   =========================================================================== */

/* Euclid, for reducing fractions. */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

/* An exact rational n/d, reduced, denominator kept positive. Returns null for
   d = 0 — the caller must have already ruled that case out. */
function rat(n, d) {
  if (d === 0) return null;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
}

/* a rational's numeric value — for pixels only, never for a decision */
function ratVal(r) {
  return r.n / r.d;
}

/* integers print with a true minus sign */
function num(n) {
  return (n < 0 ? MINUS : '') + Math.abs(n);
}

function ratStr(r) {
  if (!r) return '—';
  return r.d === 1 ? num(r.n) : `${num(r.n)}/${r.d}`;
}

/* the inside, as a line: g(x) = m·x + b */
function inside(m, b, x) {
  return m * x + b;
}

/* the lab's function: y = |m·x + b| */
function absOf(m, b, x) {
  return Math.abs(m * x + b);
}

/* The corner (crease) — where the inside is 0, so where the fold bites.
   Exists only when the inside actually has an x in it. */
function corner(m, b) {
  if (m === 0) return null;
  return rat(-b, m);
}

/* Where is the inside negative? This is the region the fold lifts. */
function negRegion(m, b) {
  if (m === 0) return b < 0 ? 'all' : 'none';
  return m > 0 ? 'left' : 'right'; // left/right of the corner
}

/* Exact solutions of |m·x + b| = d.
   Returns { kind, xs } where kind is 'two' | 'one' | 'none' | 'all'.
     m ≠ 0, d > 0 → two:  m·x + b = d   or   m·x + b = −d
     m ≠ 0, d = 0 → one:  the corner itself
     d < 0        → none: the V never dips below the axis
     m = 0        → the inside is the constant b, so |b| = d is either always
                    true (every x) or never true. */
function solve(m, b, d) {
  if (d < 0) return { kind: 'none', xs: [] };
  if (m === 0) return Math.abs(b) === d ? { kind: 'all', xs: [] } : { kind: 'none', xs: [] };
  if (d === 0) return { kind: 'one', xs: [rat(-b, m)] };
  const p = rat(d - b, m);
  const q = rat(-d - b, m);
  const xs = ratVal(p) <= ratVal(q) ? [p, q] : [q, p];
  return { kind: 'two', xs };
}

/* Two settings draw the SAME V exactly when the insides are negatives of each
   other: |m·x + b| = |(−m)·x + (−b)| for every x. The bars erase the inside's
   sign, so the calibration challenge must accept both — the absolute-value
   analogue of a root list not caring about order. */
function sameV(m1, b1, m2, b2) {
  return (m1 === m2 && b1 === b2) || (m1 === -m2 && b1 === -b2);
}

/* ---- calibration targets -------------------------------------------------
   Every target is reachable by the dials. No two draw the same V, and none is
   ±(1, 0) — the setting the dials reset to — so the challenge can never open
   already solved. Both facts are proven by audit-absolutevalue.mjs. */
const TARGETS = [
  [1, -4],
  [1, 3],
  [2, -4],
  [2, 6],
  [-1, 5],
  [-2, 3],
  [3, 3],
  [-3, 6],
  [1, 6],
  [2, 2],
  [-1, -4],
  [3, -3],
];

function pickTarget(prev) {
  let t = prev;
  while (!t || (prev && t[0] === prev[0] && t[1] === prev[1])) {
    t = TARGETS[Math.floor(Math.random() * TARGETS.length)];
  }
  return t;
}

/* Match meter. RMS is measured across the plotted window and mapped so that an
   off-by-one dial reads in the sixties and a wrong slope reads in the twenties
   (recalibrated for THIS model, as the bench standard requires — a sine bench's
   thresholds would be meaningless here). The STAMP never consults this number:
   it is gated on sameV, an exact integer test, so a false CALIBRATED is
   impossible however the meter is tuned. */
const MATCH_K = 1.8;
const MATCH_N = 201;

function matchRms(m, b, mT, bT) {
  let s = 0;
  for (let i = 0; i < MATCH_N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / (MATCH_N - 1);
    const e = absOf(m, b, x) - absOf(mT, bT, x);
    s += e * e;
  }
  return Math.sqrt(s / MATCH_N);
}

function matchPct(m, b, mT, bT) {
  if (sameV(m, b, mT, bT)) return 100;
  return Math.min(96, Math.round(100 / (1 + matchRms(m, b, mT, bT) / MATCH_K)));
}

/* ---- display -------------------------------------------------------------
   The inside, formatted. This is where sign handling lives, and it is the
   classic place a bench goes subtly wrong: "1x", "+ −4" and "2x + 0" are all
   wrong on a page a student is meant to trust. */
function insideStr(m, b) {
  if (m === 0) return num(b);
  let s = '';
  if (m === 1) s = 'x';
  else if (m === -1) s = MINUS + 'x';
  else s = num(m) + 'x';
  if (b > 0) s += ` + ${b}`;
  else if (b < 0) s += ` ${MINUS} ${Math.abs(b)}`;
  return s;
}

/* ===========================================================================
   LESSON — one capability unlocks per step; the last step is the challenge.
   =========================================================================== */
const STEPS = [
  {
    title: 'A line, folded',
    body:
      'Inside the bars is a line — here just y = x, dashed blue. Half of it hangs BELOW the axis. ' +
      'Absolute value folds that half up, like creasing a sheet of paper along the x-axis, and what ' +
      'lands is the carmine V. Drag the Fold dial, or press “Fold it”, and watch |x| get made.',
    q: 'The line y = x passes through (−3, −3). Where does the fold send that point?',
    choices: [
      '(−3, 3) — it stays at x = −3 and its height flips to +3',
      '(3, 3) — it swings across to the other side',
      '(3, −3) — it slides right and stays below',
    ],
    answer: 0,
    feedback:
      'The crease is the x-axis, so folding keeps x exactly where it is and flips the sign of the ' +
      'height: (−3, −3) lands on (−3, 3). That is |−3| = 3. Nothing ever moves left or right — this ' +
      'fold is not a mirror across the y-axis.',
  },
  {
    title: 'Tilt the line: the V still opens up',
    body:
      'Unlock m and tilt the line inside the bars. Make it fall — m negative — and watch what the ' +
      'fold does. The line goes down to the right, but the V still opens UP. It has to: a fold can ' +
      'only lift things onto the non-negative side, so an absolute value is never negative.',
    q: 'Which way does the graph of y = |−2x| open?',
    choices: [
      'Up — the bars make every output 0 or more',
      'Down — the inside has a negative slope',
      'Neither — it falls to the right, like the line inside',
    ],
    answer: 0,
    feedback:
      'Up. |−2x| is a distance-like size, so it is never negative — every point of the graph sits on ' +
      'or above the axis, and the V opens up. The sign of m sets how the INSIDE tilts and which half ' +
      'gets folded, never which way the V opens. In fact |−2x| and |2x| draw the very same V.',
  },
  {
    title: 'Slide the line: the crease moves',
    body:
      'Unlock b and slide the line. The corner is not glued to the origin — it goes wherever the line ' +
      'crosses the axis, because that is the only place the fold has nothing to lift. The corner of ' +
      'y = |m·x + b| sits exactly where the INSIDE IS ZERO: at x = −b/m.',
    q: 'Where is the corner of y = |x − 5|?',
    choices: [
      'At x = 5 — that is where the inside x − 5 equals 0',
      'At x = −5 — read the sign straight off the bars',
      'At x = 0 — every absolute value corners at the origin',
    ],
    answer: 0,
    feedback:
      'At x = 5, because x − 5 = 0 there. Chasing the −5 you can see is the classic slip: the corner ' +
      'is where the inside is zero, so you must SOLVE x − 5 = 0, not copy the number. And no, the ' +
      'corner is only at the origin when the inside is zero at the origin.',
  },
  {
    title: 'The rule the fold is following',
    body:
      'Turn on the branch lens. The fold treats the two sides of the crease completely differently, ' +
      'and that IS the definition: |u| = u where the inside u is already 0 or more (nothing to do), ' +
      'and |u| = −u where the inside is negative (flip it). Absolute value does not “drop the minus ' +
      'sign” — it negates, but only on one side.',
    q: 'For x < 5, the expression |x − 5| is equal to…',
    choices: [
      '5 − x — that is −(x − 5), and it comes out positive',
      'x − 5 — the bars do not change anything here',
      '0 — nothing is left once the sign is removed',
    ],
    answer: 0,
    feedback:
      'When x < 5 the inside x − 5 is negative, so the rule says negate it: |x − 5| = −(x − 5) = 5 − x. ' +
      'Check it at x = 2: |2 − 5| = |−3| = 3, and 5 − 2 = 3. ✓ Notice −(x − 5) is POSITIVE here — a ' +
      'minus sign in front of a negative quantity is exactly how the fold lifts it.',
  },
  {
    title: 'A level line cuts the V twice',
    body:
      'Unlock d — a gold level line y = d. Wherever it crosses the carmine V, the height there IS d, ' +
      'so those x-values solve |m·x + b| = d. A V has two sides, so a level above the corner is ' +
      'crossed TWICE. Slide d down through 0 and below and watch the crossings run out.',
    q: 'How many numbers x satisfy |x| = 4?',
    choices: [
      'Two — x = 4 and x = −4',
      'One — x = 4, since sizes are positive',
      'Four — the answer is right there in the equation',
    ],
    answer: 0,
    feedback:
      'Two: 4 and −4 both sit 4 away from zero, so both have size 4. On the graph, the level y = 4 ' +
      'cuts the V once on each arm. Keeping only x = 4 is the most common error in the whole topic — ' +
      'the answer is positive, but the two x’s that produce it need not be.',
  },
  {
    title: 'Two crossings, two equations',
    body:
      'To solve |m·x + b| = d without the picture, ask what the inside could have been. The bars send ' +
      'BOTH d and −d to d, so the inside is either: m·x + b = d, or m·x + b = −d. Two little linear ' +
      'equations, one per arm of the V. Push d below 0 and the level misses the V entirely — no ' +
      'solutions, because a size can never be negative.',
    q: 'Solving |x + 1| = 3 means solving…',
    choices: [
      'x + 1 = 3 or x + 1 = −3, giving x = 2 or x = −4',
      'x + 1 = 3 only, giving x = 2',
      'x = 3 + 1 and x = 3 − 1, giving x = 4 or x = 2',
    ],
    answer: 0,
    feedback:
      'Both branches: x + 1 = 3 gives x = 2, and x + 1 = −3 gives x = −4. Check the second one — ' +
      '|−4 + 1| = |−3| = 3 ✓. Taking only the first branch loses an answer, and adding or subtracting ' +
      'the 3 straight from the bars is not a legal move at all — you must undo the inside.',
  },
  {
    title: 'What the height really measures',
    body:
      'With the inside in the form x − c (that is, m = 1), read the V again: its height above any x ' +
      'is the DISTANCE from x to c. The screen opens on |x − 4|, so it is measuring how far x is from ' +
      '4 — and the level at 3 asks “which numbers sit 3 away from 4?” The two arms hand you both. ' +
      'This is also why the corner is the low point: the only number at distance 0 from 4 is 4 itself. ' +
      'A steeper inside just scales that distance by |m|.',
    q: 'Which numbers are exactly 3 away from 4?',
    choices: [
      '1 and 7 — step 3 down, and 3 up',
      '12 and 7 — multiply, then add',
      'Only 7 — distance moves you forward',
    ],
    answer: 0,
    feedback:
      '1 and 7: distance is counted in BOTH directions, so you step 3 each way from 4. That is exactly ' +
      '|x − 4| = 3 with its two answers 4 − 3 and 4 + 3 — the same pair the two arms of the V hand you, ' +
      'and the reason absolute value and distance are the same idea.',
  },
  {
    title: 'Match the mystery fold',
    body:
      'A grey ghost V is drawn on the paper. Tune the line inside YOUR bars — m and b — until your ' +
      'carmine V lands exactly on it. Read the ghost’s corner and the steepness of its arms to work ' +
      'out what its inside must have been. Two settings always work, since |u| and |−u| draw the same ' +
      'V. Land it and the stamp appears; press New ghost for another.',
    calib: true,
  },
];

/* ===========================================================================
   COMPONENT
   =========================================================================== */
export default function AbsoluteValueLab() {
  const [m, setM] = useState(1);
  const [b, setB] = useState(0);
  const [d, setD] = useState(3);
  const [fold, setFold] = useState(0); // 0 = bare line, 1 = fully folded
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const current = STEPS[step];
  const calib = !!current.calib;

  /* what the lesson has unlocked so far */
  const hasM = step >= 1;
  const hasB = step >= 2;
  const lens = step >= 3 && !calib; // the branch lens
  const hasD = step >= 4 && !calib; // the level line

  /* ---- refs -------------------------------------------------------------- */
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const rafRef = useRef(0);
  const reducedRef = useRef(false);
  const foldRef = useRef(0);

  /* ---- derived, exact ---------------------------------------------------- */
  const c = corner(m, b);
  const neg = negRegion(m, b);
  const sol = solve(m, b, d);
  const calibrated = calib && target != null && sameV(m, b, target[0], target[1]);
  const pct = calib && target != null ? matchPct(m, b, target[0], target[1]) : 0;

  foldRef.current = fold;
  sceneRef.current = { ...sceneRef.current, m, b, d, fold, step, lens, hasD, calib, target, c, neg, sol };

  /* ---- reduced-motion awareness ----------------------------------------- */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mq.matches;
    const h = () => (reducedRef.current = mq.matches);
    mq.addEventListener ? mq.addEventListener('change', h) : mq.addListener(h);
    return () => (mq.removeEventListener ? mq.removeEventListener('change', h) : mq.removeListener(h));
  }, []);

  /* Overlays are reset by ONE effect keyed on the step, so a step never opens
     showing the previous step's state. Step 0 is the fold's own lesson and must
     start unfolded; every later step is studying |m·x + b| itself, so it opens
     folded — the dial is still there to re-run the fold at any time. */
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    setFold(step === 0 ? 0 : 1);
    if (step === 6) {
      // "what the height really measures" reads |x − c|: put the inside in that
      // form so the distance sentence on screen is true the moment it appears.
      setM(1);
      setB(-4);
      setD(3);
    }
  }, [step]);

  /* hand the challenge a fresh ghost the first time we reach it */
  useEffect(() => {
    if (STEPS[step].calib && target == null) {
      setTarget(pickTarget(null));
      setM(1);
      setB(0); // never ±(1,0) among the targets ⇒ never opens pre-solved
    }
  }, [step, target]);

  /* =======================================================================
     RENDER — fully redrawn from state.
     ======================================================================= */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const S = sceneRef.current;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

    const spanX = WORLD.xmax - WORLD.xmin;
    const spanY = WORLD.ymax - WORLD.ymin;
    const sx = (x) => ((x - WORLD.xmin) / spanX) * W;
    const sy = (y) => H - ((y - WORLD.ymin) / spanY) * H;

    /* ---- quadrille paper ------------------------------------------------ */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.55)';
    ctx.beginPath();
    for (let gx = Math.ceil(WORLD.xmin); gx <= WORLD.xmax; gx++) {
      const px = Math.round(sx(gx)) + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
    }
    for (let gy = Math.ceil(WORLD.ymin); gy <= WORLD.ymax; gy++) {
      const py = Math.round(sy(gy)) + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(W, py);
    }
    ctx.stroke();

    /* the fold's crease is the x-axis. While a fold is in progress, say so. */
    const folding = S.fold > 0.001 && S.fold < 0.999;

    /* ---- the branch lens, part 1: the SHADING, behind everything --------- */
    let bands = null;
    if (S.lens && S.c) {
      const cx = sx(ratVal(S.c));
      const negLeft = S.neg === 'left';
      const x0 = negLeft ? 0 : cx;
      const x1 = negLeft ? cx : W;
      ctx.fillStyle = 'rgba(200,30,79,0.055)';
      ctx.fillRect(x0, 0, x1 - x0, H);
      // the labels are drawn LAST (see part 2) — an arm of the V reaches the top
      // of the paper on both sides, and whatever is drawn after wins the pixel
      bands = [
        { a: x0, z: x1, t: `inside < 0  →  |u| = ${MINUS}u`, col: CURVE },
        { a: negLeft ? cx : 0, z: negLeft ? W : cx, t: 'inside ≥ 0  →  |u| = u', col: INK_SOFT },
      ];
    }

    /* ---- axes ----------------------------------------------------------- */
    const ax = Math.round(sx(0)) + 0.5;
    const ay = Math.round(sy(0)) + 0.5;
    ctx.strokeStyle = folding ? 'rgba(200,137,30,0.85)' : 'rgba(28,43,58,0.55)';
    ctx.lineWidth = folding ? 2 : 1.4;
    ctx.beginPath();
    ctx.moveTo(0, ay);
    ctx.lineTo(W, ay);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(ax, 0);
    ctx.lineTo(ax, H);
    ctx.stroke();

    /* axis numbers, every 2 units, kept off the axes themselves */
    ctx.font = `10.5px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let gx = Math.ceil(WORLD.xmin / 2) * 2; gx <= WORLD.xmax; gx += 2) {
      if (gx === 0 || gx <= WORLD.xmin || gx >= WORLD.xmax) continue;
      ctx.fillText(num(gx), sx(gx), ay + 4);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let gy = Math.ceil(WORLD.ymin / 2) * 2; gy <= WORLD.ymax; gy += 2) {
      if (gy === 0 || gy <= WORLD.ymin || gy >= WORLD.ymax) continue;
      ctx.fillText(num(gy), ax - 5, sy(gy));
    }

    /* ---- the ghost target V (calibration only) -------------------------- */
    if (S.calib && S.target) {
      const [mT, bT] = S.target;
      ctx.strokeStyle = 'rgba(28,43,58,0.4)';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      strokeAbs(ctx, sx, sy, mT, bT, 1);
      ctx.setLineDash([]);
    }

    /* ---- the level line and its crossings (gold = the answer) ----------- */
    if (S.hasD) {
      const ly = sy(S.d);
      ctx.strokeStyle = 'rgba(200,137,30,0.9)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(W, ly);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `700 11.5px ${MONO}`;
      ctx.fillStyle = GOLD_DK;
      ctx.textAlign = 'left';
      ctx.textBaseline = S.d >= 0 ? 'bottom' : 'top';
      ctx.fillText(`y = ${num(S.d)}`, 7, S.d >= 0 ? ly - 3 : ly + 3);
    }

    /* ---- THE CURVE: the fold, in progress or complete -------------------
       A point of the inside at height y rotates about the x-axis through the
       angle π·fold; on screen its height is y·cos(π·fold). Above the axis
       nothing moves. At fold = 1 that is exactly y = |m·x + b|. */
    ctx.strokeStyle = CURVE;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    strokeAbs(ctx, sx, sy, S.m, S.b, S.fold);

    /* ---- the inside, as a line: dashed blue, drawn ON TOP of the curve ---
       Order matters. At fold = 0 the two coincide exactly, and whichever goes
       last is the only one you see — so the line goes last, and the story reads
       right the whole way through: wherever the blue dashes still lie along the
       carmine, the fold left that half ALONE; the arm with no dashes on it is
       the half the fold lifted, and the dashes below it show where it came from. */
    ctx.strokeStyle = 'rgba(47,111,159,0.9)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(sx(WORLD.xmin), sy(inside(S.m, S.b, WORLD.xmin)));
    ctx.lineTo(sx(WORLD.xmax), sy(inside(S.m, S.b, WORLD.xmax)));
    ctx.stroke();
    ctx.setLineDash([]);
    lineTag(ctx, MONO, sy, S.m, S.b, W, S.hasD ? S.d : null);

    /* ---- the crease point: the line's zero becoming the V's corner ------ */
    if (S.c) {
      const cxv = ratVal(S.c);
      if (cxv >= WORLD.xmin && cxv <= WORLD.xmax) {
        const px = sx(cxv);
        const py = sy(0);
        ctx.fillStyle = CURVE;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Label BELOW the point — the V opens up, so below is the empty side.
        // It clears the x-axis numbers (which sit at ay + 4) rather than
        // landing on them, and gets a paper pill so it stays legible if an arm
        // or the level line passes behind it.
        ctx.font = `700 11.5px ${MONO}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const nameIt = S.fold > 0.5 ? 'corner' : 'inside = 0';
        pill(ctx, `${nameIt}  x = ${ratStr(S.c)}`, clampTxt(px, W, 62), py + 21, CURVE, W);
      }
    }

    /* ---- the solution dots, where the level meets the V ------------------ */
    if (S.hasD && S.fold > 0.999) {
      const { kind, xs } = S.sol;
      xs.forEach((r) => {
        const xv = ratVal(r);
        if (xv < WORLD.xmin || xv > WORLD.xmax) return; // stated exactly below, off-screen here
        const px = sx(xv);
        const py = sy(S.d);
        // drop a dashed plumb line to the axis: this is how you READ the answer
        ctx.strokeStyle = 'rgba(200,137,30,0.65)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, sy(0));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.font = `700 11.5px ${MONO}`;
        ctx.fillStyle = GOLD_DK;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(ratStr(r), clampTxt(px, W, 26), sy(0) - 6);
      });
      if (kind === 'none') {
        const msg = S.d < 0 ? 'no crossings — the V never dips below 0' : 'no crossings';
        ctx.font = `11.5px ${MONO}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = S.d < 0 ? 'top' : 'bottom';
        pill(ctx, msg, W - 8, sy(S.d) + (S.d < 0 ? 4 : -4), GOLD_DK, W);
      }
    }

    /* ---- the branch lens, part 2: the LABELS, in front of the curve ------ */
    if (bands) {
      ctx.font = `11px ${MONO}`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      bands.forEach((bd) => {
        const w = Math.min(bd.z, W) - Math.max(bd.a, 0);
        if (w < ctx.measureText(bd.t).width + 16) return; // no room in this band
        pill(ctx, bd.t, (Math.max(bd.a, 0) + Math.min(bd.z, W)) / 2, 7, bd.col, W);
      });
    }

    /* ---- the fold caption ------------------------------------------------ */
    if (folding) {
      ctx.font = `700 11.5px ${MONO}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      pill(ctx, 'crease: the x-axis', W - 8, 7, GOLD_DK, W);
    }
  }, []);

  /* The V (or the fold in progress) as an exact polyline. Piecewise-linear, so
     exact breakpoints beat per-pixel sampling: the corner comes out perfectly
     sharp, which matters when the corner is the whole point of the lab. */
  function strokeAbs(ctx, sx, sy, m, b, f) {
    const cs = f >= 0.999 ? -1 : Math.cos(Math.PI * f);
    const val = (x) => {
      const g = m * x + b;
      return g >= 0 ? g : g * cs;
    };
    const pts = [];
    pts.push(WORLD.xmin);
    if (m !== 0) {
      const x0 = -b / m;
      if (x0 > WORLD.xmin && x0 < WORLD.xmax) pts.push(x0);
    }
    pts.push(WORLD.xmax);
    ctx.beginPath();
    pts.forEach((x, i) => (i ? ctx.lineTo(sx(x), sy(val(x))) : ctx.moveTo(sx(x), sy(val(x)))));
    ctx.stroke();
  }

  /* keep a label from hanging off the paper */
  function clampTxt(px, W, half) {
    return Math.max(half, Math.min(W - half, px));
  }

  /* a text label on a paper-coloured pill, so it survives whatever it lands on.
     Honours the ctx textAlign/textBaseline already set by the caller. */
  function pill(ctx, text, x, y, colour, W) {
    const tw = ctx.measureText(text).width;
    const th = 13;
    const left =
      ctx.textAlign === 'center' ? x - tw / 2 : ctx.textAlign === 'right' ? x - tw : x;
    const top = ctx.textBaseline === 'bottom' ? y - th : ctx.textBaseline === 'middle' ? y - th / 2 : y;
    ctx.fillStyle = 'rgba(251,251,248,0.86)';
    ctx.fillRect(Math.max(0, left - 4), top - 2, Math.min(tw + 8, W), th + 4);
    ctx.fillStyle = colour;
    ctx.fillText(text, x, y);
  }

  /* Name the dashed line where it exits the window — but stay out of the way.
     The tag is dropped when the line leaves the paper (nothing to label) and
     when it would exit alongside the level line, since that is exactly where a
     solution dot and its value sit. The equation readout and the facts panel
     both name the inside anyway, so a suppressed tag costs the reader nothing. */
  function lineTag(ctx, MONO, sy, m, b, W, level) {
    const yAt = inside(m, b, WORLD.xmax - 0.6);
    if (yAt < WORLD.ymin + 0.6 || yAt > WORLD.ymax - 0.6) return;
    if (level != null && Math.abs(yAt - level) < 1.4) return;
    ctx.font = `11px ${MONO}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = m >= 0 ? 'top' : 'bottom';
    pill(ctx, `the inside:  ${insideStr(m, b)}`, W - 8, sy(yAt) + (m >= 0 ? 5 : -5), BLUE, W);
  }

  useEffect(() => {
    draw();
  }, [m, b, d, fold, step, target, lens, hasD, calib, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /* ---- controls ---------------------------------------------------------- */
  const foldTo = (to) => {
    cancelAnimationFrame(rafRef.current);
    if (reducedRef.current) {
      setFold(to);
      return;
    }
    const from = foldRef.current;
    if (Math.abs(to - from) < 0.001) return;
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const tick = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const p = Math.min(1, (now - t0) / (FOLD_DUR * Math.abs(to - from)));
      const e = p * p * (3 - 2 * p); // smoothstep
      setFold(from + (to - from) * e);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };
  const onFoldDrag = (v) => {
    cancelAnimationFrame(rafRef.current);
    setFold(v / 100);
  };

  const newGhost = () => {
    setTarget((t) => pickTarget(t));
    setM(1);
    setB(0);
  };

  const PRESETS = [
    { t: '|x|', m: 1, b: 0 },
    { t: `|x ${MINUS} 4|`, m: 1, b: -4 },
    { t: '|x + 3|', m: 1, b: 3 },
    { t: `|2x ${MINUS} 4|`, m: 2, b: -4 },
    { t: `|${MINUS}x + 4|`, m: -1, b: 4 },
  ];

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* ---- the sentences the facts panel prints ------------------------------ */
  const negText =
    neg === 'all'
      ? 'everywhere — the whole line is below the axis'
      : neg === 'none'
      ? 'nowhere — the line never dips below the axis'
      : `x ${neg === 'left' ? '<' : '>'} ${ratStr(c)}  (the folded side)`;

  const solText =
    sol.kind === 'two'
      ? `x = ${ratStr(sol.xs[0])}  or  x = ${ratStr(sol.xs[1])}`
      : sol.kind === 'one'
      ? `x = ${ratStr(sol.xs[0])}  (one — the level touches the corner)`
      : sol.kind === 'all'
      ? 'every x  (the inside is the constant, and its size is d)'
      : d < 0
      ? 'none — a size is never negative'
      : 'none';

  /* |m·x + b| = |m| × (distance from x to the corner). Always true when the
     inside has an x in it, and it is what makes absolute value and distance the
     same idea. */
  const distText =
    c == null
      ? '—'
      : Math.abs(m) === 1
      ? `|${insideStr(m, b)}| = the distance from x to ${ratStr(c)}`
      : `|${insideStr(m, b)}| = ${Math.abs(m)} × (distance from x to ${ratStr(c)})`;

  /* ---- spoken description for screen readers ----------------------------- */
  const spoken =
    `The graph of y equals the absolute value of ${insideStr(m, b)}. ` +
    (fold < 0.999
      ? `The fold is ${Math.round(fold * 100)} percent complete. `
      : 'It is a V opening upward. ') +
    (c
      ? `Its corner is at x equals ${ratStr(c)}, where the inside is zero, and its arms have slope plus and minus ${Math.abs(
          m
        )}. `
      : 'The inside has no x, so the graph is a flat line and there is no corner. ') +
    (hasD ? `With the level line at y equals ${num(d)}, the solutions are ${solText}. ` : '') +
    (calibrated ? 'Calibrated.' : '');

  return (
    <div className="avlab">
      <header className="head">
        <h1>Absolute Value</h1>
        <p className="lede">
          Absolute value doesn’t “drop the minus sign” — it <em>folds</em>. Put a line inside the bars
          and the half hanging below the axis swings up, like creasing paper, and lands as a V. The
          crease falls exactly where the inside is <em>zero</em>; the V opens up no matter what; and
          because a V has <em>two sides</em>, an equation like |x + 1| = 3 has two answers.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="prod mono">
              <span className="pv">y</span>
              <span className="eq"> = </span>
              <span className="pv">|</span>
              <span className="pi">{insideStr(m, b)}</span>
              <span className="pv">|</span>
            </p>
            <p className="expo mono" aria-hidden="true">
              {step >= 5
                ? `|u| = d  ⇔  u = d  or  u = ${MINUS}d`
                : step >= 3
                ? `|u| = u  when u ≥ 0,   ${MINUS}u  when u < 0`
                : 'the bars fold the inside up onto y ≥ 0'}
            </p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {fold < 0.999 ? 'blue dashed = the inside, before the bars' : 'carmine = |inside|'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          {/* the fold control — the signature interaction, always available */}
          <div className="foldrow">
            <label className="foldlab mono" htmlFor="foldr">
              fold
            </label>
            <input
              id="foldr"
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(fold * 100)}
              aria-label="Fold the line up along the x-axis"
              onChange={(e) => onFoldDrag(parseInt(e.target.value, 10))}
            />
            <output className="foldv mono">{Math.round(fold * 100)}%</output>
          </div>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="sw" style={{ background: CURVE }} /> |inside| — the V
            </span>
            <span className="lg">
              <span className="sw dash" style={{ borderColor: BLUE }} /> the inside line
            </span>
            {hasD && (
              <span className="lg">
                <span className="sw" style={{ background: GOLD }} /> level &amp; solutions
              </span>
            )}
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">The inside (a line)</span>
              <span className="fact-v mono" style={{ color: BLUE, fontWeight: 700 }}>
                {insideStr(m, b)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Corner · where the inside is 0</span>
              <span className="fact-v mono" style={{ color: CURVE, fontWeight: 700 }}>
                {c ? `x = ${ratStr(c)}` : 'none — the inside has no x'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Arm slopes</span>
              <span className="fact-v mono">{m === 0 ? 'flat' : `± ${Math.abs(m)}`}</span>
            </div>
            {lens && (
              <div className="fact">
                <span className="fact-k">Inside is negative where</span>
                <span className="fact-v mono">{negText}</span>
              </div>
            )}
            {hasD && (
              <div className="fact">
                <span className="fact-k">
                  Solve |{insideStr(m, b)}| = {num(d)}
                </span>
                <span className="fact-v mono" style={{ color: GOLD_DK, fontWeight: 700 }}>
                  {solText}
                </span>
              </div>
            )}
            {step >= 6 && !calib && (
              <div className="fact">
                <span className="fact-k">Distance reading</span>
                <span className="fact-v mono">{distText}</span>
              </div>
            )}
          </div>

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={() => foldTo(1)} disabled={fold > 0.999}>
              ▶ Fold it
            </button>
            <button type="button" className="btn ghost" onClick={() => foldTo(0)} disabled={fold < 0.001}>
              ↺ Unfold
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

          {!calib ? (
            <div className="picker">
              {!hasM && (
                <p className="locked mono">
                  dials unlock as the lesson goes — for now, work the fold
                </p>
              )}
              {hasM && (
                <label className="dial">
                  <span className="dk" style={{ color: BLUE }}>
                    m
                  </span>
                  <span className="drole">the inside’s slope — tilts the line</span>
                  <input
                    type="range"
                    min={M_MIN}
                    max={M_MAX}
                    step={1}
                    value={m}
                    aria-label="Slope of the line inside the bars"
                    style={{ accentColor: BLUE }}
                    onChange={(e) => setM(parseInt(e.target.value, 10))}
                  />
                  <output className="dv">{num(m)}</output>
                </label>
              )}
              {hasB && (
                <label className="dial">
                  <span className="dk" style={{ color: BLUE }}>
                    b
                  </span>
                  <span className="drole">the inside’s constant — slides the line, moving the crease</span>
                  <input
                    type="range"
                    min={B_MIN}
                    max={B_MAX}
                    step={1}
                    value={b}
                    aria-label="Constant of the line inside the bars"
                    style={{ accentColor: BLUE }}
                    onChange={(e) => setB(parseInt(e.target.value, 10))}
                  />
                  <output className="dv">{num(b)}</output>
                </label>
              )}
              {hasD && (
                <label className="dial">
                  <span className="dk" style={{ color: GOLD_DK }}>
                    d
                  </span>
                  <span className="drole">the level — solve |inside| = d</span>
                  <input
                    type="range"
                    min={D_MIN}
                    max={D_MAX}
                    step={1}
                    value={d}
                    aria-label="Level line d"
                    /* the DARK gold, not GOLD: Chrome derives a range's unfilled
                       track colour from the accent's luminance, and the light
                       gold makes it render the track near-black — out of step
                       with every other dial. */
                    style={{ accentColor: GOLD_DK }}
                    onChange={(e) => setD(parseInt(e.target.value, 10))}
                  />
                  <output className="dv">{num(d)}</output>
                </label>
              )}
              {hasB && (
                <div className="presets" role="group" aria-label="Quick examples">
                  {PRESETS.map((p) => (
                    <button
                      key={p.t}
                      type="button"
                      className={'preset mono' + (m === p.m && b === p.b ? ' on' : '')}
                      onClick={() => {
                        setM(p.m);
                        setB(p.b);
                      }}
                    >
                      {p.t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="challenge">
              <div className="chbox">
                <span className="chk mono">Ghost corner</span>
                {/* `target` is handed over by an effect, which has not run yet on
                    this step's FIRST render — so it must be guarded here, or the
                    whole lab throws the moment a student reaches the capstone. */}
                <span className="chv mono">
                  {target ? `x = ${ratStr(corner(target[0], target[1]))}` : '…'}
                </span>
              </div>
              <div className="picker">
                <label className="dial">
                  <span className="dk" style={{ color: BLUE }}>
                    m
                  </span>
                  <span className="drole">the inside’s slope</span>
                  <input
                    type="range"
                    min={M_MIN}
                    max={M_MAX}
                    step={1}
                    value={m}
                    aria-label="Slope of the line inside the bars"
                    style={{ accentColor: BLUE }}
                    onChange={(e) => setM(parseInt(e.target.value, 10))}
                  />
                  <output className="dv">{num(m)}</output>
                </label>
                <label className="dial">
                  <span className="dk" style={{ color: BLUE }}>
                    b
                  </span>
                  <span className="drole">the inside’s constant</span>
                  <input
                    type="range"
                    min={B_MIN}
                    max={B_MAX}
                    step={1}
                    value={b}
                    aria-label="Constant of the line inside the bars"
                    style={{ accentColor: BLUE }}
                    onChange={(e) => setB(parseInt(e.target.value, 10))}
                  />
                  <output className="dv">{num(b)}</output>
                </label>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match {pct}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">land your V on the ghost</span>
                )}
              </div>
              {calibrated && (
                <p className="won mono">
                  |{insideStr(m, b)}| = |{insideStr(-m, -b)}| — both settings draw this same V.
                </p>
              )}
              <div className="chbtns">
                <button type="button" className="btn" onClick={newGhost}>
                  New ghost
                </button>
              </div>
            </div>
          )}

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((ch, i) => {
                  const chosen = answers[step];
                  const isChosen = chosen === i;
                  const isCorrect = i === current.answer;
                  let cls = 'choice';
                  if (chosen != null) {
                    if (isCorrect) cls += ' correct';
                    else if (isChosen) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button
                      type="button"
                      key={i}
                      className={cls}
                      onClick={() => choose(i)}
                      disabled={chosen != null}
                    >
                      <span className="mark" aria-hidden="true">
                        {chosen != null && isCorrect ? '✓' : chosen != null && isChosen ? '✕' : ''}
                      </span>
                      {ch}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
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
                  setTarget(null);
                  setM(1);
                  setB(0);
                  setD(3);
                  setFold(0);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">|u| = u if u ≥ 0, else {MINUS}u</span> &nbsp;·&nbsp; folding a line along
        the x-axis makes y = |m·x + b|: a V whose corner sits where the inside is zero, never below the
        axis, so |m·x + b| = d has two solutions when d &gt; 0, one when d = 0, and none when d &lt; 0.
        And |x − c| is exactly the distance from x to c. CCSS&nbsp;6.NS.C.7c, 7.NS.A.1c, HSF‑IF.B.4,
        HSF‑BF.B.3.
      </footer>

      <style jsx>{`
        .avlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #2f6f9f;
          --gold: #c8891e;
          --gold-dk: #8f6410;
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
          max-width: 74ch;
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
          margin-bottom: 10px;
          min-height: 44px;
        }
        .prod {
          font-variant-numeric: tabular-nums;
          font-size: 21px;
          font-weight: 600;
          margin: 0;
          line-height: 1.3;
        }
        .prod .eq {
          color: var(--ink-soft);
          font-weight: 400;
        }
        .prod .pv {
          color: var(--curve);
          font-weight: 700;
        }
        .prod .pi {
          color: var(--blue);
        }
        .expo {
          margin: 3px 0 0;
          font-size: 13.5px;
          color: var(--ink-soft);
          font-variant-numeric: tabular-nums;
        }
        .stage {
          position: relative;
          width: min(100%, 560px);
          aspect-ratio: 1 / 1;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .hint {
          position: absolute;
          left: 10px;
          bottom: 9px;
          font-size: 11px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.82);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .foldrow {
          display: grid;
          grid-template-columns: 34px 1fr 46px;
          align-items: center;
          gap: 10px;
          max-width: 560px;
          margin: 12px auto 0;
        }
        .foldlab {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .foldrow input[type='range'] {
          width: 100%;
          cursor: pointer;
          accent-color: var(--curve);
        }
        .foldv {
          text-align: right;
          font-size: 13px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          justify-content: center;
          margin: 10px 4px 2px;
          font-size: 12px;
          color: var(--ink-soft);
        }
        .lg {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .sw {
          width: 13px;
          height: 13px;
          border-radius: 50%;
          display: inline-block;
        }
        .sw.dash {
          border-radius: 0;
          height: 0;
          border-top: 2px dashed;
          width: 15px;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin: 12px 4px 4px;
        }
        @media (max-width: 560px) {
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
          min-width: 0;
        }
        .fact-k {
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v {
          font-size: 13.5px;
          font-variant-numeric: tabular-nums;
          overflow-wrap: anywhere;
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
          gap: 6px;
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
        .picker {
          display: grid;
          gap: 10px;
          margin-bottom: 6px;
        }
        .locked {
          margin: 0;
          font-size: 11.5px;
          color: var(--ink-soft);
          background: rgba(28, 43, 58, 0.04);
          border: 1px dashed rgba(28, 43, 58, 0.18);
          border-radius: 8px;
          padding: 9px 11px;
          text-align: center;
        }
        .dial {
          display: grid;
          grid-template-columns: 22px 1fr 46px;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 2px 10px;
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
          cursor: pointer;
        }
        .dv {
          grid-column: 3;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 14px;
          font-weight: 700;
        }
        .presets {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .preset {
          font-size: 13px;
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.14s, background 0.14s;
        }
        .preset:hover {
          border-color: var(--ink);
        }
        .preset.on {
          border-color: var(--curve);
          background: rgba(200, 30, 79, 0.08);
          color: var(--curve);
        }
        .challenge {
          display: grid;
          gap: 10px;
          margin-bottom: 6px;
        }
        .chbox {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(28, 43, 58, 0.15);
          background: linear-gradient(180deg, #fff 0%, #f6f8f9 100%);
        }
        .chk {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .chv {
          font-size: 26px;
          font-weight: 700;
          color: var(--ink);
          font-variant-numeric: tabular-nums;
        }
        .chbtns {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.5), var(--curve));
          transition: width 0.18s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .won {
          margin: 0;
          font-size: 12px;
          color: var(--ok);
          background: rgba(31, 138, 91, 0.08);
          border-left: 3px solid var(--ok);
          padding: 8px 10px;
          border-radius: 0 6px 6px 0;
          overflow-wrap: anywhere;
        }
        .stamp {
          font: 700 12px/1 var(--mono);
          letter-spacing: 0.16em;
          color: var(--ok);
          border: 2px solid var(--ok);
          border-radius: 6px;
          padding: 4px 8px;
          transform: rotate(-3deg);
          white-space: nowrap;
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
          background: rgba(200, 137, 30, 0.08);
          border-left: 3px solid var(--gold);
          padding: 10px 12px;
          border-radius: 0 6px 6px 0;
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
        :global(.avlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .preset {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
