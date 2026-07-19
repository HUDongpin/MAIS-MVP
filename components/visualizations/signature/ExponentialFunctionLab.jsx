'use client';

/* ============================================================================
   ExponentialFunctionLab — an interactive "bench" for THE EXPONENTIAL FUNCTION

        y = a · b^x + k        (b > 0)

   Built for MAIS (math AI system, www.mais.ac), K-12 / Algebra 1-2.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   THE SIGNATURE CENTERPIECE — the "× b staircase" (constant ratio).
   This lab is the exponential's answer to the Linear Function lab's SLOPE
   TRIANGLE. There, a line ADDED the same amount every unit step (constant
   DIFFERENCE, rise/run). Here the exponential MULTIPLIES by the same factor b
   every unit step (constant RATIO). We draw that literally: at each whole x we
   raise a bar from the horizontal asymptote up to the curve — its length is the
   "gap" a·b^x — and between neighbouring bars we draw the step that carries the
   old height across and multiplies it by b to reach the new one. So the student
   SEES 1 → 2 → 4 → 8 (each × 2), and can flip on "Compare to a line" to watch a
   line that adds the same first step fall hopelessly behind. Measuring the gap
   ABOVE THE ASYMPTOTE (not the raw y) keeps the ratio exactly b for every k, so
   the centerpiece stays true after the asymptote dial is introduced.

   Also taught: growth (b > 1) vs decay (0 < b < 1) vs the constant boundary
   (b = 1); the y-intercept (0, a + k) because b^0 = 1; the per-step percent
   rate (b = 1 + r); and the horizontal asymptote y = k the curve approaches but
   never touches.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/ExponentialFunctionLab.jsx
     2. Import and render it:
          import ExponentialFunctionLab from './ExponentialFunctionLab';
          export default function Page() { return <ExponentialFunctionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, k, lesson step).
     MODEL  — f(x) = a·b^x + k is pure math; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. A square window (span 10 × 10) so one grid cell
   is a true unit square: essential, because the staircase teaches heights by
   letting you COUNT squares. The window is offset downward (y from −3 to 7) so
   there is room to lift the asymptote below the axis and still watch growth
   climb above it. Grid every 1 unit, labels every 2.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -5, xmax: 5, ymin: -3, ymax: 7 };

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Each dial names the letter it drives, its range/step,
   and the lesson step at which it unlocks. b stays strictly positive (min 0.2)
   because b^x is only a well-behaved function for a positive base; b = 1 is
   reachable and is taught as the flat boundary between growth and decay.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'a', label: 'a', min: 0.25, max: 4, step: 0.25, unlock: 1, role: 'initial value · the starting amount' },
  { key: 'b', label: 'b', min: 0.2, max: 3, step: 0.1, unlock: 2, role: 'base · the growth / decay factor' },
  { key: 'k', label: 'k', min: -3, max: 3, step: 0.5, unlock: 5, role: 'shift · lifts the horizontal asymptote' },
];
const START = { a: 1, b: 2, k: 0 };

const STAIR_STEP = 3; // the × b staircase auto-appears here and stays
const PERCENT_STEP = 4; // growth / decay as a percent rate
const ASYMPTOTE_STEP = 5; // the k dial unlocks; the asymptote line is named
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions (adds vs multiplies; "the base is the y-intercept";
   "it touches / crosses the asymptote"). Next is gated on ANSWERED, not CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the exponential',
    body:
      'A linear function grows by adding the same amount over and over. An exponential function grows ' +
      'by MULTIPLYING by the same factor over and over. Right now a = 1, b = 2 and k = 0, so y = 2^x: ' +
      'start at 1 and keep doubling — 1, 2, 4, 8, 16 … The variable x is up in the exponent, and that ' +
      'is what makes the growth take off.',
    q: 'Going from x to x + 1, the height of y = 2^x is…',
    choices: ['multiplied by 2', 'increased by 2', 'squared'],
    answer: 0,
    feedback:
      'Each unit step to the right MULTIPLIES the height by the base, here × 2: 1 → 2 → 4 → 8. It is ' +
      'not “add 2” (that would be a straight line) and not “squared”. Repeated multiplication by a ' +
      'fixed factor is the heart of every exponential function.',
  },
  {
    title: 'a — the initial value',
    body:
      'The a dial is live. Because any base to the 0 power is 1 (b^0 = 1), at x = 0 the function is ' +
      'y = a · 1 = a. So a is the starting amount, and — while the asymptote is still the x-axis — it ' +
      'is exactly the y-intercept. Slide a and watch the whole curve scale up and down through that ' +
      'one point.',
    q: 'With k = 0, where does y = a · b^x cross the y-axis?',
    choices: ['at y = a', 'at y = b', 'always at y = 1'],
    answer: 0,
    feedback:
      'At x = 0 every exponential passes through (0, a), because b^0 = 1 for every base. Changing a ' +
      'stretches the curve vertically; it does not bend it. The base b — the next dial — is what sets ' +
      'the shape.',
  },
  {
    title: 'b — growth or decay',
    body:
      'Now the base dial b is unlocked — the engine of the function. Watch what happens as you move it ' +
      'across 1. Above 1 the curve climbs to the right; below 1 it falls to the right; exactly at 1 it ' +
      'is flat.',
    q: 'Set b below 1, for example b = 0.5. The curve now…',
    choices: ['decays toward zero as x grows', 'grows even faster', 'turns negative'],
    answer: 0,
    feedback:
      'b > 1 is exponential GROWTH (× a factor bigger than 1 each step); 0 < b < 1 is exponential ' +
      'DECAY (× a factor smaller than 1, so it shrinks); b = 1 multiplies by 1 and stays constant — ' +
      'the boundary between the two. The base is always positive: a negative base has no smooth curve.',
  },
  {
    title: 'The × b staircase',
    body:
      'Here is the whole idea in one picture. Each teal bar is the height of the curve at a whole ' +
      'number x, measured up from the asymptote. Step one unit to the right and the bar is multiplied ' +
      'by exactly b — the arrows show it. A line ADDS the same amount each step; an exponential ' +
      'MULTIPLIES by the same factor. Turn on “Compare to a line” to watch a line with the same first ' +
      'step get left behind.',
    q: 'The staircase shows that from each step to the next, the height is always…',
    choices: [
      'multiplied by the same factor b (constant ratio)',
      'increased by the same amount (constant difference)',
      'changed by an amount that never repeats',
    ],
    answer: 0,
    feedback:
      'Constant RATIO is the signature of an exponential: height(x + 1) ÷ height(x) = b for every x. ' +
      'Compare that with a line, whose constant DIFFERENCE means height(x + 1) − height(x) is fixed. ' +
      'Adding versus multiplying is the whole difference between linear and exponential.',
  },
  {
    title: 'Growth & decay as a percent',
    body:
      'People usually say exponential change as a percent. Write the base as b = 1 + r. Then r is the ' +
      'per-step rate: b = 1.3 means + 30% each step (× 1.3); b = 0.8 means − 20% each step (× 0.8). ' +
      'This is how populations, savings with interest, and radioactive half-lives are all described.',
    q: 'A base of b = 1.3 means the quantity changes each step by…',
    choices: ['+ 30% (it grows by 30%)', '+ 130%', '× 3'],
    answer: 0,
    feedback:
      'b = 1 + r, so b = 1.3 gives r = 0.3 = + 30% per step. A decay base b = 0.8 gives r = −0.2 = ' +
      '− 20% per step. The base and the percent rate are two names for the same multiplier: b = 1 + r.',
  },
  {
    title: 'The horizontal asymptote',
    body:
      'The last dial, k, lifts the whole curve and with it the flat line it hugs — the horizontal ' +
      'asymptote y = k. On the decaying side the curve dives toward this line and gets forever closer ' +
      'but never touches it. With k lifted, the y-intercept becomes (0, a + k), and the staircase now ' +
      'measures each bar from the asymptote, so the × b ratio still holds.',
    q: 'As it decays, the curve approaches the asymptote y = k and…',
    choices: [
      'never quite reaches it',
      'touches it and stops',
      'crosses straight through it',
    ],
    answer: 0,
    feedback:
      'The gap above the asymptote is a · b^x, which keeps shrinking toward 0 but is never 0 — so the ' +
      'curve approaches y = k without ever reaching it. That “forever closer, never touching” line is ' +
      'the horizontal asymptote, and moving k moves it up or down.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery exponential is drawn as a dashed grey curve. Tune a, b and k until ' +
      'your carmine curve lands exactly on top of it and the meter reads CALIBRATED. Read the clues ' +
      'from the picture: the asymptote it hugs gives k, the crossing point gives a + k, and how fast ' +
      'it climbs or falls gives b. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.  y = a·b^x + k, with the "gap" above the
   asymptote (a·b^x) exposed separately because that is the quantity whose ratio
   is exactly b — the star of the staircase.
   ------------------------------------------------------------------------- */
function model(x, p) {
  return p.a * Math.pow(p.b, x) + p.k;
}
function gap(x, p) {
  return p.a * Math.pow(p.b, x); // distance above the asymptote y = k
}
// The straight line with the SAME first step as the exponential: it matches the
// curve at x = 0 and x = 1, then keeps ADDING that first increment. Used by the
// "Compare to a line" overlay to make adding-vs-multiplying visible.
function compareLine(p) {
  const y0 = model(0, p); // a + k
  const y1 = model(1, p); // a·b + k
  const slope = y1 - y0; // a(b − 1)
  return (x) => y0 + slope * x;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION goal disguised as a curve match: a
   mystery exponential (hidden a*, b*, k*) is drawn and the student rebuilds it.
   Exponentials diverge, so each residual is clamped (CAP) before the RMS — the
   same trick the Quadratic bench uses on its arms — so the off-screen tail can
   never swamp the meter. Every target lands on the student's dial grid, so an
   exact match (RMS ≈ 0 → CALIBRATED) is always reachable.
   ------------------------------------------------------------------------- */
function rmsError(p, t) {
  const N = 140;
  const CAP = 8; // clamp each residual so the divergent tail can't dominate
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    let d = model(x, p) - model(x, t);
    if (d > CAP) d = CAP;
    else if (d < -CAP) d = -CAP;
    s += d * d;
  }
  return Math.sqrt(s / (N + 1));
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.3)));
const MATCH_RMS = 0.03; // below this the curves are effectively identical -> CALIBRATED
// (an exact grid match gives RMS ~ 0; the nearest non-exact look-alike stays
//  well above this, so the stamp fires only on the intended curve — see audit)

// Target grids — deliberately a well-posed subset (a moderate, base clearly in
// growth or decay away from the flat b = 1, asymptote modest) so the match has
// one readable answer. All three grids are sub-grids of the student's dials.
const A_TARGETS = [];
for (let v = 0.5; v <= 3 + 1e-9; v += 0.25) A_TARGETS.push(+v.toFixed(2));
const B_TARGETS = [];
for (let v = 0.3; v <= 0.7 + 1e-9; v += 0.1) B_TARGETS.push(+v.toFixed(1)); // decay
for (let v = 1.3; v <= 2.6 + 1e-9; v += 0.1) B_TARGETS.push(+v.toFixed(1)); // growth
const K_TARGETS = [];
for (let v = -2; v <= 2 + 1e-9; v += 0.5) K_TARGETS.push(+v.toFixed(1));

function makeTarget(prev) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  let t;
  do {
    t = { a: pick(A_TARGETS), b: pick(B_TARGETS), k: pick(K_TARGETS) };
  } while (
    (prev && t.a === prev.a && t.b === prev.b && t.k === prev.k) ||
    (t.a === START.a && t.b === START.b && t.k === START.k) // never hand back the start
  );
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−), trimmed decimals.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v, dp = 2) {
  const f = Math.pow(10, dp);
  const n = Math.round(v * f) / f;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}

function rateText(b) {
  if (Math.abs(b - 1) < 1e-9) return 'constant · b = 1 (the boundary)';
  const pct = trim(Math.abs(b - 1) * 100, 0);
  return b > 1 ? `+ ${pct}% each step · growth` : `− ${pct}% each step · decay`;
}
function factorWord(b) {
  if (Math.abs(b - 1) < 1e-9) return 'constant';
  return b > 1 ? 'growth' : 'decay';
}
function behaviorText(b) {
  if (Math.abs(b - 1) < 1e-9) return 'flat — a constant, neither grows nor decays';
  return b > 1 ? 'grows without bound to the right' : 'decays toward the asymptote';
}

/* EDIT 5 — Equation display. y = a·b^x + k, with the coefficient 1 and the
   zero shift dropped so the readout stays clean. */
function ExpEquation({ a, b, k }) {
  const aPart = Math.abs(a - 1) < 1e-9 ? '' : trim(a);
  const dot = aPart === '' ? '' : '·';
  const kPart =
    k === 0 ? null : (
      <>
        &nbsp;{k > 0 ? '+' : MINUS}&nbsp;{trim(Math.abs(k))}
      </>
    );
  return (
    <span>
      y = {aPart}
      {dot}
      {trim(b)}
      <sup>x</sup>
      {kPart}
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ExponentialFunctionLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [k, setK] = useState(START.k);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [stairOn, setStairOn] = useState(false); // manual staircase toggle
  const [lineOn, setLineOn] = useState(false); // compare-to-a-line overlay
  const [walking, setWalking] = useState(false); // the "walk the × b steps" run

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // world-x under the pointer, or null
  const walkRef = useRef(null); // world-x of the climbing marker, or null
  const sceneRef = useRef({});

  const params = { a, b, k };
  const current = STEPS[step];
  const calib = !!current.calib;

  // Per-step display flags — what part of the story is visible right now.
  const showStair = (step >= STAIR_STEP && step <= ASYMPTOTE_STEP) || stairOn;
  const showStairNow = showStair && !calib;
  const showLine = lineOn && !calib && step >= STAIR_STEP;
  const showAsymptote = step >= STAIR_STEP || k !== 0;

  // Snapshot everything the renderer needs so draw() (a stable callback) never
  // reads stale values.
  sceneRef.current = {
    a,
    b,
    k,
    calib,
    target,
    showStair: showStairNow,
    showLine,
    showAsymptote,
    walking,
  };

  const rms = target ? rmsError(params, target) : Infinity;
  const pct = target ? matchPercent(rms) : 0;
  const calibrated = target ? rms < MATCH_RMS : false;

  /* ---- world → screen transform + full redraw from state ------------------ */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // capped for perf & crisp lines
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    const sx = (x) => ((x - WORLD.xmin) / (WORLD.xmax - WORLD.xmin)) * W;
    const sy = (y) => ((WORLD.ymax - y) / (WORLD.ymax - WORLD.ymin)) * H;

    const S = sceneRef.current;
    const p = { a: S.a, b: S.b, k: S.k };
    const INK = '#1C2B3A';
    const SOFT = '#5B6B7B';
    const CARMINE = '#C81E4F';
    const TEAL = '#2E7D9A';
    const PAPER = '#FBFBF8';
    const OK = '#1F8A5B';

    ctx.clearRect(0, 0, W, H);

    /* minor grid (quadrille paper) */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.9)';
    ctx.beginPath();
    for (let gx = Math.ceil(WORLD.xmin); gx <= WORLD.xmax; gx++) {
      const X = Math.round(sx(gx)) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    for (let gy = Math.ceil(WORLD.ymin); gy <= WORLD.ymax; gy++) {
      const Y = Math.round(sy(gy)) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    /* axes */
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, Math.round(sy(0)) + 0.5);
    ctx.lineTo(W, Math.round(sy(0)) + 0.5);
    ctx.moveTo(Math.round(sx(0)) + 0.5, 0);
    ctx.lineTo(Math.round(sx(0)) + 0.5, H);
    ctx.stroke();

    /* tick labels (every 2 units) */
    ctx.fillStyle = 'rgba(91,107,123,0.95)';
    ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let gx = Math.ceil(WORLD.xmin / 2) * 2; gx <= WORLD.xmax; gx += 2) {
      if (gx === 0 || gx <= WORLD.xmin || gx >= WORLD.xmax) continue;
      ctx.fillText(String(gx), sx(gx), sy(0) + 4);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let gy = Math.ceil(WORLD.ymin / 2) * 2; gy <= WORLD.ymax; gy += 2) {
      if (gy === 0 || gy <= WORLD.ymin || gy >= WORLD.ymax) continue;
      ctx.fillText(String(gy), sx(0) - 6, sy(gy));
    }

    /* a plotter that samples one point per pixel and breaks the path when the
       curve leaves the window (so the exploding arm never draws a false cap) */
    const plot = (gfn, stroke, width, dash) => {
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.setLineDash(dash || []);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      let pen = false;
      for (let px = 0; px <= W; px++) {
        const x = WORLD.xmin + (px / W) * (WORLD.xmax - WORLD.xmin);
        const y = gfn(x);
        if (!isFinite(y) || y < WORLD.ymin - 1.5 || y > WORLD.ymax + 1.5) {
          pen = false;
          continue;
        }
        const X = sx(x);
        const Y = sy(y);
        if (!pen) {
          ctx.moveTo(X, Y);
          pen = true;
        } else {
          ctx.lineTo(X, Y);
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    // a small paper-backed label so text stays readable over the grid
    const paperLabel = (text, cx, cy, align, baseline, color) => {
      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(text).width;
      let by = cy;
      if (baseline === 'middle') by = cy - 7;
      else if (baseline === 'bottom') by = cy - 15;
      ctx.fillStyle = 'rgba(251,251,248,0.9)';
      let bx = cx;
      if (align === 'center') bx = cx - tw / 2;
      else if (align === 'right') bx = cx - tw;
      ctx.fillRect(bx - 3, by - 1, tw + 6, 16);
      ctx.fillStyle = color || INK;
      ctx.textAlign = align;
      ctx.textBaseline = 'top';
      ctx.fillText(text, cx, by);
    };

    const inWinX = (x) => x >= WORLD.xmin && x <= WORLD.xmax;
    const inWinY = (y) => y >= WORLD.ymin && y <= WORLD.ymax;

    /* ---- mystery target curve (calibration only) — dashed grey, underneath -- */
    if (S.calib && S.target) {
      plot((x) => model(x, S.target), 'rgba(91,107,123,0.85)', 2, [7, 6]);
      // the target's asymptote, so the student can read k off the picture
      if (inWinY(S.target.k)) {
        ctx.save();
        ctx.strokeStyle = 'rgba(91,107,123,0.5)';
        ctx.setLineDash([2, 5]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, Math.round(sy(S.target.k)) + 0.5);
        ctx.lineTo(W, Math.round(sy(S.target.k)) + 0.5);
        ctx.stroke();
        ctx.restore();
      }
    }

    /* ---- the horizontal asymptote y = k ----------------------------------- */
    if (S.showAsymptote && inWinY(p.k)) {
      ctx.save();
      ctx.strokeStyle = 'rgba(46,125,154,0.75)';
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 1.5;
      const Y = Math.round(sy(p.k)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
      ctx.stroke();
      ctx.setLineDash([]);
      paperLabel(`asymptote  y = ${trim(p.k)}`, W - 8, Y, 'right', 'bottom', TEAL);
      ctx.restore();
    }

    /* ---- compare-to-a-line overlay (adds the same first step) -------------- */
    if (S.showLine) {
      const L = compareLine(p);
      plot(L, 'rgba(28,43,58,0.5)', 2, [3, 5]);
    }

    /* ---- the × b staircase — the signature centerpiece --------------------- */
    if (S.showStair) {
      const n0 = Math.ceil(WORLD.xmin);
      const n1 = Math.floor(WORLD.xmax);
      const yk = p.k;
      const Yk = sy(yk);

      // 1) the "carry across then × b" steps between neighbouring whole numbers
      for (let n = n0; n <= n1 - 1; n++) {
        const f0 = model(n, p);
        const f1 = model(n + 1, p);
        if (!inWinX(n) || !inWinX(n + 1)) continue;
        if (!inWinY(f0) || !inWinY(f1)) continue; // only the on-screen steps
        const X0 = sx(n);
        const X1 = sx(n + 1);
        const Y0 = sy(f0);
        const Y1 = sy(f1);
        ctx.save();
        // carry the old height across (dashed horizontal at f0)
        ctx.strokeStyle = 'rgba(46,125,154,0.55)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(X0, Y0);
        ctx.lineTo(X1, Y0);
        ctx.stroke();
        // multiply by b: a solid arrow from f0 up/down to f1
        ctx.setLineDash([]);
        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(X1, Y0);
        ctx.lineTo(X1, Y1);
        ctx.stroke();
        // arrowhead pointing to the new height
        const dir = Y1 > Y0 ? 1 : -1; // screen-down is + ; growth => f1>f0 => Y1<Y0 => dir −1
        ctx.fillStyle = TEAL;
        ctx.beginPath();
        ctx.moveTo(X1, Y1);
        ctx.lineTo(X1 - 4, Y1 + dir * 7);
        ctx.lineTo(X1 + 4, Y1 + dir * 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // the × b label beside the arrow, only where the jump is tall enough
        if (Math.abs(Y1 - Y0) > 16) {
          paperLabel(`× ${trim(p.b)}`, X1 + 7, (Y0 + Y1) / 2, 'left', 'middle', TEAL);
        }
      }

      // 2) the gap bars themselves + the height value on top of each
      for (let n = n0; n <= n1; n++) {
        if (!inWinX(n)) continue;
        const fn = model(n, p);
        if (!inWinY(fn)) continue;
        const X = sx(n);
        const Yt = sy(fn);
        ctx.save();
        ctx.strokeStyle = 'rgba(46,125,154,0.9)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(X, Yk);
        ctx.lineTo(X, Yt);
        ctx.stroke();
        // dot where the bar meets the curve
        ctx.fillStyle = TEAL;
        ctx.beginPath();
        ctx.arc(X, Yt, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PAPER;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
        // label the gap (a·b^n) above the dot, only if the bar is tall enough
        const g = gap(n, p);
        if (Math.abs(g) > 0.12) {
          const above = g >= 0 ? Yt - 8 : Yt + 8;
          paperLabel(trim(g), X, above, 'center', g >= 0 ? 'bottom' : 'top', TEAL);
        }
      }
    }

    /* ---- the exponential curve — the one carmine accent = the object ------- */
    plot((x) => model(x, p), CARMINE, 2.9);

    /* ---- the climbing "walk the × b steps" marker ------------------------- */
    if (S.walking && walkRef.current != null) {
      const wx = walkRef.current;
      const wy = model(wx, p);
      if (inWinX(wx) && inWinY(wy)) {
        const X = sx(wx);
        const Y = sy(wy);
        // pulse when we land near a whole number
        const nearest = Math.round(wx);
        if (Math.abs(wx - nearest) < 0.08 && inWinY(model(nearest, p))) {
          ctx.save();
          ctx.strokeStyle = 'rgba(200,30,79,0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(X, Y, 11, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = CARMINE;
        ctx.beginPath();
        ctx.arc(X, Y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PAPER;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
        paperLabel(`y = ${trim(wy)}`, X + 9, Y - 9, 'left', 'bottom', CARMINE);
      }
    }

    /* ---- y-intercept marker (0, a + k) ------------------------------------ */
    if (!S.calib) {
      const yi = model(0, p);
      if (inWinY(yi)) {
        const X = sx(0);
        const Y = sy(yi);
        ctx.save();
        ctx.fillStyle = PAPER;
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(X, Y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        if (!S.showStair) {
          paperLabel(`(0, ${trim(yi)})`, X + 9, Y - 2, 'left', 'middle', INK);
        }
      }
    }

    /* ---- legend (only when a second object is on the stage) --------------- */
    const legend = [];
    legend.push({ t: 'y = a·bˣ + k', c: CARMINE, dash: [] });
    if (S.showStair) legend.push({ t: '× b staircase', c: TEAL, dash: [] });
    if (S.showLine) legend.push({ t: 'line (adds)', c: SOFT, dash: [3, 4] });
    if (legend.length > 1) {
      ctx.save();
      ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
      let x0 = 14;
      const y0 = H - 15;
      for (const it of legend) {
        ctx.strokeStyle = it.c;
        ctx.lineWidth = 2.6;
        ctx.setLineDash(it.dash);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + 20, y0);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = it.c;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.t, x0 + 25, y0);
        x0 += 25 + ctx.measureText(it.t).width + 16;
      }
      ctx.restore();
    }

    /* ---- hover readout: a dot on the curve + its coordinates -------------- */
    const hx = hoverRef.current;
    if (hx != null && !S.calib) {
      const hy = model(hx, p);
      if (inWinY(hy)) {
        const X = sx(hx);
        const Y = sy(hy);
        ctx.save();
        ctx.strokeStyle = 'rgba(28,43,58,0.28)';
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(X, sy(0));
        ctx.lineTo(X, Y);
        ctx.moveTo(sx(0), Y);
        ctx.lineTo(X, Y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(28,43,58,0.55)';
        ctx.beginPath();
        ctx.arc(X, Y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        const txt = `(${hx.toFixed(1)}, ${hy.toFixed(2)})`;
        ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
        const tw = ctx.measureText(txt).width;
        const bx = Math.min(Math.max(X + 8, 4), W - tw - 12);
        const by = Math.max(Y - 26, 4);
        ctx.fillStyle = 'rgba(251,251,248,0.92)';
        ctx.fillRect(bx - 4, by - 2, tw + 8, 18);
        ctx.fillStyle = INK;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(txt, bx, by);
        ctx.restore();
      }
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [a, b, k, step, target, stairOn, lineOn, walking, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step the first time we reach it */
  useEffect(() => {
    if (current.calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the "walk the × b steps" animation — a marker climbs the curve through the
     whole numbers. Time-based (dt), opt-in, and respects reduced motion. */
  useEffect(() => {
    if (!walking) {
      walkRef.current = null;
      draw();
      return;
    }
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setWalking(false);
      return;
    }
    const x0 = -2;
    const x1 = 4;
    const DURATION = 3200;
    let raf;
    let start = null;
    const loop = (now) => {
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      walkRef.current = x0 + t * (x1 - x0);
      draw();
      if (t < 1) raf = requestAnimationFrame(loop);
      else {
        walkRef.current = null;
        setWalking(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [walking, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 'a') setA(v);
    else if (key === 'b') setB(v);
    else setK(v);
    if (walking) setWalking(false); // a dial move ends any walk
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    hoverRef.current = WORLD.xmin + (cssX / rect.width) * (WORLD.xmax - WORLD.xmin);
    draw();
  };
  const onPointerLeave = () => {
    hoverRef.current = null;
    draw();
  };

  const resetDials = () => {
    setA(START.a);
    setB(START.b);
    setK(START.k);
    if (walking) setWalking(false);
  };

  const choose = (idx) => {
    if (answers[step] != null) return; // lock the answer once given
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };

  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const yInt = a + k;
  const spoken =
    `Exponential y = ${trim(a)} times ${trim(b)} to the x` +
    `${k === 0 ? '' : (k > 0 ? ' plus ' : ' minus ') + trim(Math.abs(k))}. ` +
    `${factorWord(b)}, ${rateText(b)}. y-intercept at (0, ${trim(yInt)}). ` +
    `Horizontal asymptote y = ${trim(k)}. The curve ${behaviorText(b)}.`;

  return (
    <div className="xlab">
      <header className="head">
        <h1>The Exponential Function</h1>
        <p className="lede">
          A line <em>adds</em> the same amount each step; an exponential{' '}
          <em>multiplies</em> by the same factor. Explore{' '}
          <span className="mono">y = a·b&#8202;&#739; + k</span> one dial at a time, watch the{' '}
          <span className="mono">× b</span> staircase build, then calibrate your curve onto a mystery
          target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <ExpEquation a={a} b={b} k={k} />
            </p>
            <p className="equation-sub mono">{rateText(b)}</p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">hover the curve to read a point</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — your curve matches the mystery target.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">y-intercept (0, a+k)</span>
              <span className="fact-v mono">(0, {trim(yInt)})</span>
            </div>
            <div className="fact">
              <span className="fact-k">Base · factor</span>
              <span className="fact-v mono">
                × {trim(b)} · {factorWord(b)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Per-step rate</span>
              <span className="fact-v">{rateText(b)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Asymptote</span>
              <span className="fact-v mono">y = {trim(k)}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (showStairNow ? ' on' : '')}
              onClick={() => setStairOn((v) => !v)}
              aria-pressed={showStairNow}
            >
              {showStairNow ? 'Hide × b staircase' : 'Show × b staircase'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showLine ? ' on' : '')}
              onClick={() => setLineOn((v) => !v)}
              aria-pressed={showLine}
              disabled={calib || step < STAIR_STEP}
            >
              {showLine ? 'Hide the line' : 'Compare to a line'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (walking ? ' on' : '')}
              onClick={() => setWalking(true)}
              disabled={calib || !showStairNow || walking}
            >
              {walking ? 'Walking…' : 'Walk the × b steps'}
            </button>
            <button type="button" className="btn ghost" onClick={resetDials}>
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
              const unlocked = step >= d.unlock;
              const val = { a, b, k }[d.key];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.label}</span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={d.step}
                    value={val}
                    disabled={!unlocked}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? trim(val) : '🔒'}</output>
                </label>
              );
            })}
          </div>

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((c, i) => {
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
                      {c}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {current.calib && target && (
            <div className="calib">
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">read the clues · a, b, k = ?</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setTarget(makeTarget(target))}
              >
                New target
              </button>
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
                  setStairOn(false);
                  setLineOn(false);
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
        <span className="mono">y = a·b&#8202;&#739; + k</span> &nbsp;·&nbsp; the exponential function —
        a constant RATIO (× b every step) instead of a line&apos;s constant difference, plotted live on
        a 10×10 quadrille window.
      </footer>

      <style jsx>{`
        .xlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --quad: #c7d8e4;
          --teal: #2e7d9a;
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
          max-width: 70ch;
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
        @media (max-width: 920px) {
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
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          color: var(--curve);
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }
        .equation sup {
          font-size: 0.7em;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        .stage {
          position: relative;
          width: min(100%, 560px);
          aspect-ratio: 1 / 1;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
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
          background: rgba(251, 251, 248, 0.78);
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
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
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
          accent-color: var(--curve);
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
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
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
        :global(.xlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
