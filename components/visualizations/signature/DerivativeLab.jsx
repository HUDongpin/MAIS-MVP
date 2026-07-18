'use client';

/* ============================================================================
   DerivativeLab — an interactive "bench" for THE DERIVATIVE, the central idea
   of differential calculus:

        f'(a)  =  lim   f(a + h) − f(a)
                 h→0  ─────────────────
                              h

   Built for MAIS (math AI system, www.mais.ac), K-12 / AP Calculus.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   THE SIGNATURE CENTERPIECE — the secant becoming the tangent.
   This lab is the direct sequel to the Linear Function lab's SLOPE TRIANGLE.
   There, slope = rise / run was constant everywhere on a straight line. Here
   the curve bends, so the slope changes from point to point. We draw the very
   same slope triangle — run = h, rise = f(a+h) − f(a) — between a point P on
   the curve and a nearby point Q. Its hypotenuse is the SECANT line, and its
   slope is the AVERAGE rate of change. Then the student shrinks h toward 0 with
   a dial: Q slides down onto P, the secant pivots, and in the limit it becomes
   the TANGENT line. The tangent's slope is the derivative — the INSTANTANEOUS
   rate of change. Finally, reading that slope at every point traces a whole new
   function, y = f'(x). Three canonical curves (parabola, cubic, sine) let the
   student re-run the idea and meet the three famous rules
        (x²/4)' = x/2,   (x³/12 − x)' = x²/4 − 1,   (2 sin x)' = 2 cos x.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/DerivativeLab.jsx
     2. Import and render it:
          import DerivativeLab from './DerivativeLab';
          export default function Page() { return <DerivativeLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (fn, a, h, lesson step).
     MODEL  — f(x) and its EXACT derivative f'(x) are pure math; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. A square window so x and y share one scale and
   a slope of 1 truly reads as 45° — essential, because this whole lab is about
   reading slopes off the page. Grid every 1 unit, labels every 2.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -6, xmax: 6, ymin: -6, ymax: 6 };

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Three curves, each paired with its EXACT derivative (verified
   against a central-difference in audit-derivative.mjs). The derivative is the
   whole point of the lab, so it is hand-differentiated and correct, never
   approximated. Superscript labels render with <sup> for the equation readout;
   the plain strings feed screen-reader text and the on-canvas rules.
   ------------------------------------------------------------------------- */
const FUNCS = {
  parabola: {
    id: 'parabola',
    name: 'Parabola',
    f: (x) => (x * x) / 4,
    df: (x) => x / 2,
    fStr: 'x²/4',
    dfStr: 'x/2',
    fJSX: (
      <>
        f(x) = x<sup>2</sup>&#8202;/&#8202;4
      </>
    ),
    dfJSX: <>f&#8242;(x) = x&#8202;/&#8202;2</>,
    // where the tangent is horizontal (f'(x)=0) — used in the copy, not the math
    flatAt: '0',
  },
  cubic: {
    id: 'cubic',
    name: 'Cubic',
    f: (x) => (x * x * x) / 12 - x,
    df: (x) => (x * x) / 4 - 1,
    fStr: 'x³/12 − x',
    dfStr: 'x²/4 − 1',
    fJSX: (
      <>
        f(x) = x<sup>3</sup>&#8202;/&#8202;12 &minus; x
      </>
    ),
    dfJSX: (
      <>
        f&#8242;(x) = x<sup>2</sup>&#8202;/&#8202;4 &minus; 1
      </>
    ),
    flatAt: '±2',
  },
  sine: {
    id: 'sine',
    name: 'Sine',
    f: (x) => 2 * Math.sin(x),
    df: (x) => 2 * Math.cos(x),
    fStr: '2 sin x',
    dfStr: '2 cos x',
    fJSX: <>f(x) = 2 sin&#8202;x</>,
    dfJSX: <>f&#8242;(x) = 2 cos&#8202;x</>,
    flatAt: '±π/2, ±3π/2',
  },
};
const FN_ORDER = ['parabola', 'cubic', 'sine'];

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. The derivative's own two dials:
     a — WHERE on the curve we measure the slope (the point of tangency).
     h — the secant gap; the student shrinks it toward 0 to take the limit.
   h stays strictly positive (min 0.1): at h = 0 the difference quotient is the
   indeterminate 0/0, so we never let the dial reach it — the limit is
   approached, not evaluated by division.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'a', label: 'a', min: -4.5, max: 4.5, step: 0.25, unlock: 1, role: 'point of tangency · where we measure the slope' },
  { key: 'h', label: 'h', min: 0.1, max: 3, step: 0.1, unlock: 2, role: 'secant gap · shrink toward 0 to reach the tangent' },
];
const START = { a: 1.5, h: 2 };
const START_FN = 'parabola';

const SECANT_STEP = 2; // "average rate": secant + slope triangle appear
const LIMIT_STEP = 3; // "shrink h": the secant collapses onto the tangent
const DERIV_FN_STEP = 5; // "derivative as a function": f'(x) curve auto-appears
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions (average vs. instantaneous rate; "secant goes
   vertical"; f'=0 confusions). Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A slope that keeps changing',
    body:
      'A straight line has one slope everywhere. A curve does not — it is steep in some places and ' +
      'gentle in others. The derivative is the tool that measures the slope of a curve at a single ' +
      'point. Pick a curve below and watch how its steepness changes as you look along it.',
    q: 'Because the graph of y = f(x) bends, its steepness…',
    choices: ['changes from point to point', 'is the same everywhere, like a line', 'cannot be measured at all'],
    answer: 0,
    feedback:
      'Exactly — a curve has a different slope at every point. So "the slope of the curve" only makes ' +
      'sense at ONE point at a time. The derivative f′(a) is precisely that: the slope of the curve ' +
      'at the single point where x = a.',
  },
  {
    title: 'Pick the point P',
    body:
      'The a dial is live. It places the point P = (a, f(a)) on the curve — the point where we want ' +
      'the slope. Slide it and watch P ride along the curve. P is where the whole question lives: how ' +
      'steep is the curve right here?',
    q: 'Dragging the a dial…',
    choices: ['slides P along the fixed curve', 'changes the shape of the curve', 'tilts the whole curve'],
    answer: 0,
    feedback:
      'The a dial only moves P; the curve itself never changes. Now the challenge: a slope needs TWO ' +
      'points, but P is a single point. The next step solves that with a clever trick.',
  },
  {
    title: 'The secant: average rate',
    body:
      'The h dial adds a second point, Q = (a + h, f(a + h)), a gap of h to the right of P. The line ' +
      'through P and Q is a SECANT. Its slope triangle has run = h and rise = f(a + h) − f(a) — the ' +
      'same rise ÷ run you used for straight lines.',
    q: 'The secant’s slope, [f(a + h) − f(a)] / h, measures the…',
    choices: [
      'average rate of change from P to Q',
      'exact slope of the curve at P',
      'height of the curve at P',
    ],
    answer: 0,
    feedback:
      'A secant slope is rise ÷ run = Δy ÷ h — the AVERAGE rate of change across the interval from a ' +
      'to a + h. It is only an estimate of the steepness at P, because Q is still a whole gap h away. To ' +
      'sharpen the estimate, we shrink that gap.',
  },
  {
    title: 'Shrink h → 0: the tangent',
    body:
      'Now drag h toward 0 (or press "Shrink h → 0"). Q slides down the curve toward P and the secant ' +
      'pivots. Watch the carmine tangent line it is heading for: the line that just grazes the curve at ' +
      'P. Notice the two slope numbers in the corner closing in on each other.',
    q: 'As h → 0, the point Q slides onto P and the secant line…',
    choices: [
      'pivots until it becomes the tangent line at P',
      'becomes vertical',
      'flattens until its slope is 0',
    ],
    answer: 0,
    feedback:
      'As h → 0 the secant pivots into the TANGENT line — the straight line that touches the curve at P ' +
      'without crossing it there. The average rate closes in on a single limiting value: the slope of ' +
      'that tangent. That limit is the derivative.',
  },
  {
    title: 'The derivative f′(a)',
    body:
      'That limiting slope has a name and a symbol: the derivative, f′(a). It is the slope of the ' +
      'tangent at P, and it equals the limit of the average rates as h → 0. The carmine tangent is now ' +
      'drawn from the exact rule — no secant needed. Slide a and read f′(a) change.',
    q: 'f′(a) = lim (h→0) [f(a + h) − f(a)] / h tells you the…',
    choices: [
      'instantaneous rate of change of f at a',
      'value f(a) itself',
      'total area under the curve',
    ],
    answer: 0,
    feedback:
      'f′(a) is the INSTANTANEOUS rate of change — how fast f is changing at the exact instant x = a, ' +
      'and the slope of the tangent there. Each curve has an exact derivative RULE, shown under the ' +
      'equation, so you can find the slope at any point without ever drawing a secant.',
  },
  {
    title: 'The derivative as a function',
    body:
      'Read the tangent slope at EVERY point and the answers trace a brand-new curve, y = f′(x), ' +
      'shown in teal. The dashed link at x = a shows it directly: the slope of f up on the original ' +
      'curve equals the HEIGHT of f′ down on the new one.',
    q: 'Where the original curve has a peak or valley (a turning point), the tangent is flat, so f′(x) is…',
    choices: ['zero — the teal curve crosses the x-axis', 'largest', 'undefined'],
    answer: 0,
    feedback:
      'At a peak or valley the tangent is horizontal, so f′(x) = 0 and the teal curve crosses the ' +
      'x-axis. Where f rises, f′ > 0 (teal above the axis); where f falls, f′ < 0 (teal below). ' +
      'The derivative is itself a function recording the slope at every x.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery tangent line is drawn dashed and grey — it grazes this curve at one ' +
      'hidden point. Slide the a dial until your carmine tangent lands exactly on top of it and the ' +
      'meter reads CALIBRATED. You are hunting the point whose instantaneous slope matches. Press ' +
      '"New target" for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   Derived geometry — pure math, world coordinates only, no pixels.
   ------------------------------------------------------------------------- */
// Average rate of change (secant slope) between a and a+h on curve fn.
function secantSlope(fn, a, h) {
  const F = FUNCS[fn];
  return (F.f(a + h) - F.f(a)) / h;
}
// The tangent line at a: y = f(a) + f'(a)(x − a). Returned as a pure function.
function tangentAt(fn, a) {
  const F = FUNCS[fn];
  const s = F.df(a);
  const y0 = F.f(a);
  return (x) => y0 + s * (x - a);
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. The capstone is a CONSTRUCTION goal disguised as a
   curve match: a mystery tangent line (from a hidden point a*) is drawn, and
   the student moves a to reproduce it. Both tangents live on the SAME curve, so
   matching is a genuine derivative task — "find the point whose slope is this."
   Tangent lines never blow up inside the window, so a plain RMS is stable (no
   clamping needed). The student's a-grid (0.25) contains every target a* (on a
   0.5 grid), so an exact match — RMS 0 — is always reachable.
   ------------------------------------------------------------------------- */
function tangentRms(fn, aStudent, aTarget) {
  const L1 = tangentAt(fn, aStudent);
  const L2 = tangentAt(fn, aTarget);
  const N = 160;
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    const d = L1(x) - L2(x);
    s += d * d;
  }
  return Math.sqrt(s / (N + 1));
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.6)));
const MATCH_RMS = 0.03; // below this the two tangents are effectively identical -> CALIBRATED

function makeTarget(fn, prev) {
  const grid = 0.5;
  let aStar;
  do {
    aStar = Math.round((-4 + Math.random() * 8) / grid) * grid; // −4 … 4 on a 0.5 grid
  } while (
    (prev != null && aStar === prev) ||
    Math.abs(aStar - START.a) < 1e-9 // never hand back the starting point
  );
  return { fn, a: +aStar.toFixed(2) };
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

function behaviorText(slope) {
  if (Math.abs(slope) < 0.04) return 'flat · a turning point (slope ≈ 0)';
  return slope > 0 ? 'rising · slope is positive' : 'falling · slope is negative';
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function DerivativeLab() {
  const [fn, setFn] = useState(START_FN);
  const [a, setA] = useState(START.a);
  const [h, setH] = useState(START.h);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [showDeriv, setShowDeriv] = useState(false);
  const [animating, setAnimating] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // world-x under the pointer, or null
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const F = FUNCS[fn];

  // Per-step display flags — what part of the secant→tangent story is visible.
  const showPoint = step >= 1;
  const showSecant = (step === SECANT_STEP || step === LIMIT_STEP) && !calib;
  const showTangent = step >= LIMIT_STEP; // faint at the limit step, bold once named
  const tangentBold = step >= 4;
  const showDerivCurve = (step === DERIV_FN_STEP || showDeriv) && !calib;

  // Snapshot everything the renderer needs so draw() (a stable callback) never
  // reads stale values.
  sceneRef.current = {
    fn,
    a,
    h,
    calib,
    target,
    showPoint,
    showSecant,
    showTangent,
    tangentBold,
    showDerivCurve,
  };

  const rms = target ? tangentRms(fn, a, target.a) : Infinity;
  const pct = target ? matchPercent(rms) : 0;
  const calibrated = target ? rms < MATCH_RMS : false;

  const slopeInstant = F.df(a);
  const slopeAvg = secantSlope(fn, a, h);

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
    const CF = FUNCS[S.fn];
    const INK = '#1C2B3A';
    const SOFT = '#5B6B7B';
    const CARMINE = '#C81E4F';
    const TEAL = '#2E7D9A';
    const PAPER = '#FBFBF8';

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
       curve leaves the window (so a curve running off the top does not draw a
       false vertical closing line) */
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
      let bx = cx;
      if (align === 'center') bx = cx - tw / 2;
      else if (align === 'right') bx = cx - tw;
      let by = cy;
      if (baseline === 'middle') by = cy - 7;
      else if (baseline === 'bottom') by = cy - 15;
      ctx.fillStyle = 'rgba(251,251,248,0.9)';
      ctx.fillRect(bx - 3, by - 1, tw + 6, 16);
      ctx.fillStyle = color || INK;
      ctx.textAlign = align;
      ctx.textBaseline = 'top';
      ctx.fillText(text, cx, by);
    };

    const inWin = (x, y) => x >= WORLD.xmin && x <= WORLD.xmax && y >= WORLD.ymin && y <= WORLD.ymax;

    /* ---- mystery target tangent (calibration only) — dashed grey, underneath */
    if (S.calib && S.target) {
      plot(tangentAt(S.target.fn, S.target.a), 'rgba(91,107,123,0.85)', 2, [7, 6]);
    }

    /* ---- the derivative function y = f'(x) (teal, a distinct second object) */
    if (S.showDerivCurve) {
      plot((x) => CF.df(x), TEAL, 2.25, [2, 3]);
      // mark the point (a, f'(a)) on the teal curve + a dashed link up to (a, f(a))
      const fa = CF.f(S.a);
      const dfa = CF.df(S.a);
      if (inWin(S.a, dfa) || inWin(S.a, fa)) {
        ctx.save();
        ctx.strokeStyle = 'rgba(46,125,154,0.5)';
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(sx(S.a), sy(fa));
        ctx.lineTo(sx(S.a), sy(dfa));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = TEAL;
        ctx.beginPath();
        ctx.arc(sx(S.a), sy(dfa), 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PAPER;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        paperLabel(`f′(a) = ${trim(dfa)}`, sx(S.a) + 8, sy(dfa), 'left', 'middle', TEAL);
      }
    }

    /* ---- the base curve y = f(x) — the given function, in dark ink -------- */
    plot((x) => CF.f(x), INK, 2.6);

    /* ---- secant line + slope triangle (average-rate & limit steps) -------- */
    if (S.showSecant) {
      const a = S.a;
      const h = S.h;
      const ya = CF.f(a);
      const yq = CF.f(a + h);
      const msec = (yq - ya) / h;
      // secant line across the whole window
      plot((x) => ya + msec * (x - a), 'rgba(91,107,123,0.95)', 2.2);

      // slope triangle: P → corner (run = h) → Q (rise = Δy)
      const P = [sx(a), sy(ya)];
      const CN = [sx(a + h), sy(ya)];
      const Q = [sx(a + h), sy(yq)];
      const runPx = Math.abs(CN[0] - P[0]);
      const risePx = Math.abs(Q[1] - CN[1]);

      ctx.save();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(91,107,123,0.9)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); // run leg (horizontal)
      ctx.moveTo(P[0], P[1]);
      ctx.lineTo(CN[0], CN[1]);
      ctx.stroke();
      ctx.beginPath(); // rise leg (vertical)
      ctx.moveTo(CN[0], CN[1]);
      ctx.lineTo(Q[0], Q[1]);
      ctx.stroke();
      ctx.setLineDash([]);

      // right-angle marker at the corner — only when the triangle is roomy
      // enough that the marker sits inside it (as h → 0 it would overshoot the
      // shrinking legs and read as a stray glyph)
      if (runPx > 22 && risePx > 22) {
        const vyDir = Q[1] < CN[1] ? -1 : 1;
        const rq = 8;
        ctx.beginPath();
        ctx.moveTo(CN[0] - rq, CN[1]);
        ctx.lineTo(CN[0] - rq, CN[1] + vyDir * rq);
        ctx.lineTo(CN[0], CN[1] + vyDir * rq);
        ctx.stroke();
      }
      ctx.restore();

      // leg labels — only when the triangle is big enough on screen to hold
      // them without colliding (as h → 0 the triangle shrinks to a point; the
      // top-left readout carries the numbers, so we simply drop the leg labels)
      const vyDir = Q[1] < CN[1] ? -1 : 1;
      if (runPx > 46 && risePx > 20) {
        paperLabel(`run = ${trim(h)}`, (P[0] + CN[0]) / 2, CN[1] + (vyDir < 0 ? 6 : -22), 'center', 'top', SOFT);
        paperLabel(
          `rise = ${trim(yq - ya)}`,
          CN[0] + 7,
          (CN[1] + Q[1]) / 2,
          'left',
          'middle',
          SOFT
        );
      }
    }

    /* ---- the tangent line — the one carmine accent = the derivative ------- */
    if (S.showTangent) {
      const faint = S.tangentBold ? 1 : 0.5;
      plot(tangentAt(S.fn, S.a), `rgba(200,30,79,${faint})`, S.tangentBold ? 3 : 2.4);
    }

    /* ---- the points P and Q ------------------------------------------------ */
    if (S.showPoint) {
      const a = S.a;
      const ya = CF.f(a);
      // Q first (behind), only while the secant is on screen
      if (S.showSecant) {
        const yq = CF.f(a + S.h);
        if (inWin(a + S.h, yq)) {
          ctx.save();
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.arc(sx(a + S.h), sy(yq), 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = PAPER;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          // label Q only while it is clearly separated from P (drops as h → 0)
          const dPQ = Math.hypot(sx(a + S.h) - sx(a), sy(yq) - sy(ya));
          if (dPQ > 30) paperLabel('Q', sx(a + S.h) + 8, sy(yq) - 8, 'left', 'top', INK);
        }
      }
      // P — carmine, the point of tangency
      if (inWin(a, ya)) {
        ctx.save();
        ctx.fillStyle = CARMINE;
        ctx.beginPath();
        ctx.arc(sx(a), sy(ya), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PAPER;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        if (!S.showDerivCurve) {
          paperLabel(`P (${trim(a, 2)}, ${trim(ya, 2)})`, sx(a) + 9, sy(ya) + 8, 'left', 'top', INK);
        }
      }
    }

    /* ---- top-left readout: the rate(s) currently in play ------------------ */
    if (S.showSecant || (S.showTangent && !S.calib)) {
      const a = S.a;
      const h = S.h;
      const lines = [];
      if (S.showSecant) {
        const msec = (CF.f(a + h) - CF.f(a)) / h;
        lines.push({ t: `avg rate  Δy / h = ${trim(msec)}`, c: SOFT });
      }
      if (S.showTangent) {
        lines.push({ t: `f′(a) = ${trim(CF.df(a))}   (tangent slope)`, c: CARMINE });
      }
      ctx.save();
      ctx.font = '600 12.5px ui-monospace, "SF Mono", Menlo, monospace';
      let wMax = 0;
      for (const ln of lines) wMax = Math.max(wMax, ctx.measureText(ln.t).width);
      const boxH = 8 + lines.length * 18;
      ctx.fillStyle = 'rgba(251,251,248,0.94)';
      ctx.fillRect(10, 10, wMax + 16, boxH);
      ctx.strokeStyle = 'rgba(200,30,79,0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(10.5, 10.5, wMax + 15, boxH - 1);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      lines.forEach((ln, i) => {
        ctx.fillStyle = ln.c;
        ctx.fillText(ln.t, 18, 22 + i * 18);
      });
      ctx.restore();
    }

    /* ---- legend for the derivative curve ---------------------------------- */
    if (S.showDerivCurve) {
      ctx.save();
      ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
      const items = [
        { t: 'f(x)', c: INK },
        { t: "f′(x)", c: TEAL },
      ];
      let x0 = 14;
      const y0 = H - 16;
      for (const it of items) {
        ctx.strokeStyle = it.c;
        ctx.lineWidth = 2.4;
        ctx.setLineDash(it.c === TEAL ? [2, 3] : []);
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
      const hy = CF.f(hx);
      if (inWin(hx, hy)) {
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
        const txt = `(${hx.toFixed(1)}, ${hy.toFixed(1)})`;
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
  }, [fn, a, h, step, target, showDeriv, draw]);

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
    if (current.calib && !target) setTarget(makeTarget(fn, null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the "shrink h → 0" animation — time-based (dt), opt-in, reduced-motion aware */
  useEffect(() => {
    if (!animating) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setH(0.1);
      setAnimating(false);
      return;
    }
    let raf;
    let start = null;
    const h0 = h;
    const hEnd = 0.1;
    const DURATION = 1500;
    const loop = (now) => {
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setH(+(h0 + (hEnd - h0) * ease).toFixed(3));
      if (t < 1) raf = requestAnimationFrame(loop);
      else {
        setH(hEnd);
        setAnimating(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animating]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 'a') setA(v);
    else setH(v);
    if (animating) setAnimating(false); // a manual dial move ends any animation
  };

  const pickFn = (id) => {
    if (calib) return; // locked during calibration so the target stays valid
    setFn(id);
    setA(START.a);
    setH(START.h);
    if (animating) setAnimating(false);
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
    setH(START.h);
    if (animating) setAnimating(false);
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

  const spoken =
    `${F.name}: ${F.fStr}. Derivative ${F.dfStr}. ` +
    `Point P at x = ${trim(a)}, where the tangent slope f′(a) = ${trim(slopeInstant)}. ` +
    `The curve is ${behaviorText(slopeInstant)} at P.`;

  return (
    <div className="dlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Derivative</h1>
        <p className="lede">
          Watch a <span className="mono">secant</span> line collapse into a{' '}
          <span className="mono">tangent</span> as the gap <em>h</em> shrinks to zero. The tangent&apos;s
          slope is the derivative <span className="mono">f&#8242;(a)</span> — the{' '}
          <em>instantaneous rate of change</em>. Then see the slope at every point trace a whole new
          function, <span className="mono">f&#8242;(x)</span>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">{F.fJSX}</p>
            <p className="equation-sub mono">{F.dfJSX}</p>
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
            {calib && calibrated ? ' Calibrated — your tangent matches the mystery tangent.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Point P</span>
              <span className="fact-v mono">
                ({trim(a)}, {trim(F.f(a))})
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Avg rate (a→a+h)</span>
              <span className="fact-v mono">{step >= SECANT_STEP ? trim(slopeAvg) : '— unlock h'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Tangent slope f&#8242;(a)</span>
              <span className="fact-v mono">{trim(slopeInstant)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">At P the curve is</span>
              <span className="fact-v">{behaviorText(slopeInstant)}</span>
            </div>
          </div>

          <div className="toolbar">
            <div className="seg" role="group" aria-label="Choose the curve">
              {FN_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={'seg-btn' + (fn === id ? ' on' : '')}
                  aria-pressed={fn === id}
                  disabled={calib}
                  onClick={() => pickFn(id)}
                >
                  {FUNCS[id].name}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={'btn ghost' + (animating ? ' on' : '')}
              onClick={() => setAnimating(true)}
              disabled={step < SECANT_STEP || calib || animating}
            >
              {animating ? 'Shrinking…' : 'Shrink h → 0'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showDerivCurve ? ' on' : '')}
              onClick={() => setShowDeriv((v) => !v)}
              aria-pressed={showDerivCurve}
              disabled={calib}
            >
              {showDerivCurve ? "Hide f′(x)" : "Show f′(x)"}
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
              const val = { a, h }[d.key];
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
                  <span className="mono target-hint">find the point · slope = ?</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setTarget(makeTarget(fn, target ? target.a : null))}
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
                  setShowDeriv(false);
                  setFn(START_FN);
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
        <span className="mono">
          f&#8242;(a) = lim<sub>h→0</sub> [ f(a+h) − f(a) ] / h
        </span>{' '}
        &nbsp;·&nbsp; the slope of the tangent line = the instantaneous rate of change, plotted live on
        a 12×12 quadrille window.
      </footer>

      <style jsx>{`
        .dlab {
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
        .equation-sub sup {
          font-size: 0.7em;
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
        .seg {
          display: inline-flex;
          border: 1px solid rgba(28, 43, 58, 0.22);
          border-radius: 8px;
          overflow: hidden;
        }
        .seg-btn {
          font: 600 12.5px/1 system-ui, sans-serif;
          padding: 9px 12px;
          border: none;
          border-right: 1px solid rgba(28, 43, 58, 0.16);
          background: transparent;
          color: var(--ink);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .seg-btn:last-child {
          border-right: none;
        }
        .seg-btn.on {
          background: var(--ink);
          color: #fff;
        }
        .seg-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
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
        .foot sub {
          font-size: 0.75em;
        }
        :global(.dlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .seg-btn,
          .meter-fill,
          .choice {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
