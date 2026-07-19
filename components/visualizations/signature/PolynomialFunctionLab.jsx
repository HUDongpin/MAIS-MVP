'use client';

/* ============================================================================
   PolynomialFunctionLab — an interactive "bench" for polynomial functions in
   FACTORED FORM,  y = a·(x − r₁)(x − r₂)…(x − rₙ),  with a tunable degree.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   WHY FACTORED FORM (and why this is DISTINCT from QuadraticFunctionLab):
     The Quadratic lab teaches ONE fixed degree in vertex form, y = a(x−h)²+k,
     where the centrepiece is the vertex. This lab teaches the ideas that only
     appear once you allow ANY degree:
        • roots ARE the x-intercepts               (the Factor Theorem)
        • multiplicity decides CROSS vs TOUCH       (double root bounces)
        • end behaviour = sign(a) and degree parity (odd flips, even matches)
        • a degree-n polynomial has ≤ n roots and ≤ n−1 turning points
     Every one of those reads straight off the factored form, so it is the
     right lens for "what is a polynomial?" — not vertex form.
     CCSS: HSA-APR.B.3, HSF-IF.C.7c, HSA-APR.B.2 (Precalculus / Algebra 2).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/PolynomialFunctionLab.jsx
     2. Import and render it:
          import PolynomialFunctionLab from './PolynomialFunctionLab';
          export default function Page() { return <PolynomialFunctionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, n, roots, step).
     MODEL  — model(x) is pure math; it knows nothing about pixels. All the
              derived math (standard-form coefficients, turning points, end
              behaviour) is computed exactly from state, never from the canvas.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   World window & axes. Square window so x and y share one scale and the curve
   is never distorted. Grid every 1 unit, labels every 2.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -7, xmax: 7, ymin: -7, ymax: 7 };

/* ---------------------------------------------------------------------------
   Parameters.
     • degree n is a segmented toggle (2 / 3 / 4), not a slider.
     • a is the leading coefficient.
     • r1…r4 are the roots; only the first n are "active" at a given degree.
   Roots live on the INTEGER grid so every x-intercept is a clean whole number
   and the expanded standard form has exact coefficients. a steps by ½ so we
   can show vertical stretch/compression while keeping coefficients exact.
   ------------------------------------------------------------------------- */
const DEGREES = [2, 3, 4];
const A_RANGE = { min: -2, max: 2, step: 0.5 };
const ROOT_RANGE = { min: -4, max: 4, step: 1 };
const MAX_DEG = 4;

// Each root's unlock step. r4 shares the degree step (it only exists at n = 4).
const ROOT_UNLOCK = [1, 2, 3, 5];
const A_UNLOCK = 4;
const DEG_UNLOCK = 5;

const START = { a: 1, n: 3, roots: [-2, 0, 2, 3] };

/* ---------------------------------------------------------------------------
   Lesson. One idea per step; the dial unlocks with the step; the reveal lives
   in `feedback` (shown after answering); distractors are real student
   misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the polynomial',
    body:
      'A polynomial is a sum of power terms — like x³ − 4x. The neatest way to write one is ' +
      'FACTORED form, y = a(x − r₁)(x − r₂)(x − r₃), because each factor hands you a fact about ' +
      'the graph for free. Right now a = 1 and the roots are −2, 0, 2, so you are looking at ' +
      'y = (x + 2)(x)(x − 2) = x³ − 4x.',
    q: 'Just from the factors (x + 2), x, and (x − 2), what can you read off instantly?',
    choices: [
      'The three x-values where the graph crosses the x-axis',
      'The highest point of the graph',
      'The slope of the graph',
    ],
    answer: 0,
    feedback:
      'Each factor names a root — a place the curve meets the x-axis. (x + 2) → x = −2, x → x = 0, ' +
      '(x − 2) → x = 2. That is the Factor Theorem: (x − r) is a factor exactly when x = r is a root.',
  },
  {
    title: 'r₁ — a root is an x-intercept',
    body:
      'The r₁ dial is live. Drag it and watch the left-most place the curve meets the x-axis slide ' +
      'to follow it. The dashed carmine ring sits on the intercept.',
    q: 'Set r₁ = −3. What is the value of the whole polynomial exactly at x = −3?',
    choices: ['0 — a root makes one factor zero, so the product is zero', '−3', 'It is undefined'],
    answer: 0,
    feedback:
      'At x = r₁ the factor (x − r₁) becomes 0, and 0 times anything is 0 — so the curve is pinned ' +
      'to the axis there. That is why a root and an x-intercept are the same thing.',
  },
  {
    title: 'r₂ — a second crossing',
    body:
      'Now r₂ is unlocked. Each root you add is one more place the curve is stitched to the x-axis. ' +
      'Between two crossings the curve has to turn around to come back.',
    q: 'With three different roots, how many times must the cubic change direction (turn) in between?',
    choices: ['Twice — once between each pair of neighbouring roots', 'Never', 'Three times'],
    answer: 0,
    feedback:
      'A cubic has at most 2 turning points, and with 3 separate roots it uses both: up-down-up (or ' +
      'the mirror). In general a degree-n polynomial has at most n − 1 turning points.',
  },
  {
    title: 'r₃ — degree = number of factors',
    body:
      'All three roots are unlocked. Three factors multiplied together give an x³ term, so this is a ' +
      'degree-3 polynomial — a cubic. Count the crossings: at most three.',
    q: 'Could a cubic like this ever cross the x-axis four times?',
    choices: [
      'No — three factors give at most three roots',
      'Yes, if a is large enough',
      'Yes, if you shift it up',
    ],
    answer: 0,
    feedback:
      'Never. Degree n caps the number of x-intercepts at n. A cubic can have 3, 2, or 1 real ' +
      'crossing (roots can collide or go complex), but never 4.',
  },
  {
    title: 'a — leading coefficient',
    body:
      'The a dial is unlocked. It multiplies the whole product, so it stretches the curve vertically ' +
      '(|a| > 1 steeper, |a| < 1 flatter) and, when it turns negative, flips the graph upside-down. ' +
      'The roots never move — a factor of 0 stays 0 no matter what it is multiplied by.',
    q: 'You flip a from +1 to −1 on this cubic. What happens to the two far ends of the graph?',
    choices: [
      'They swap: the end that fell now rises, and vice-versa',
      'Nothing — a only changes the middle',
      'Both ends now point the same way',
    ],
    answer: 0,
    feedback:
      'For an ODD degree the two ends already point opposite ways, and the sign of a decides which is ' +
      'which. Flipping a mirrors the whole curve top-to-bottom, so both ends reverse.',
  },
  {
    title: 'Degree & end behaviour',
    body:
      'The degree toggle is unlocked — switch between 2, 3, and 4. Degree controls the FAR ENDS. ' +
      'Watch the arrows at the edges as you change it.',
    showEnds: true,
    q: 'For an EVEN degree (like 2 or 4) with a > 0, which way do BOTH ends point?',
    choices: [
      'Both up — even degree makes the ends match',
      'Both down',
      'One up and one down, like the cubic',
    ],
    answer: 0,
    feedback:
      'Even degree → the ends AGREE (both up if a > 0, both down if a < 0), like a parabola. Odd ' +
      'degree → the ends DISAGREE (one up, one down). The leading term a·xⁿ alone decides this.',
  },
  {
    title: 'Multiplicity — cross vs. touch',
    body:
      'Slide two roots onto the SAME value (try r₁ = r₂ = −2). The factor becomes (x + 2)², a DOUBLE ' +
      'root. Watch what the curve does there — it no longer passes through, it bounces off. Push a ' +
      'third root there too for a triple root.',
    showEnds: true,
    q: 'At a DOUBLE root (multiplicity 2), the curve…',
    choices: [
      'touches the axis and turns back — it does not cross',
      'crosses straight through as usual',
      'has a vertical break there',
    ],
    answer: 0,
    feedback:
      'Even multiplicity → the curve TOUCHES and turns (the sign of y does not change). Odd ' +
      'multiplicity → it CROSSES. A triple root crosses but flattens out first, like an S bending ' +
      'through the axis.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery polynomial is drawn as a dashed grey curve. Set the degree, then ' +
      'tune a and the roots until your carmine curve lands exactly on top of it and the meter reads ' +
      'CALIBRATED. Roots can be entered in any order. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   MODEL — pure math, no pixels.  y = a · Π_{i<n} (x − rᵢ)
   ------------------------------------------------------------------------- */
function model(x, p) {
  let y = p.a;
  for (let i = 0; i < p.n; i++) y *= x - p.roots[i];
  return y;
}

/* Exact standard-form coefficients of a · Π_{i<n}(x − rᵢ).
   Returns c[j] = coefficient of xʲ (length n + 1). Integer roots and half-step
   a keep every coefficient exactly representable in double precision. */
function expand(a, n, roots) {
  let c = [a]; // start with the constant polynomial "a"
  for (let i = 0; i < n; i++) {
    const r = roots[i];
    const next = new Array(c.length + 1).fill(0);
    for (let j = 0; j < c.length; j++) {
      next[j + 1] += c[j]; //  x · c[j]
      next[j] += -r * c[j]; // −r · c[j]
    }
    c = next;
  }
  return c;
}

/* Horner evaluation of a coefficient array (used for the derivative). */
function polyval(c, x) {
  let s = 0;
  for (let j = c.length - 1; j >= 0; j--) s = s * x + c[j];
  return s;
}

/* Exact derivative coefficients. */
function derivative(c) {
  if (c.length <= 1) return [0];
  const d = new Array(c.length - 1);
  for (let j = 1; j < c.length; j++) d[j - 1] = c[j] * j;
  return d;
}

/* Turning points = places f′ genuinely CHANGES SIGN inside the window. A
   dead-band around f′ = 0 (scaled to the derivative's own magnitude) makes the
   count robust: a horizontal inflection — where f′ only TOUCHES zero without
   changing sign, e.g. −2(x+3)³ — dips into the band and comes out the same
   sign, so it is correctly NOT counted, and float noise near that touch can't
   fake a turning point. Each real sign change is then pinned by bisection on
   the exact derivative polynomial. */
function turningPoints(coeffs) {
  const d = derivative(coeffs);
  const scale = d.reduce((m, c) => Math.max(m, Math.abs(c)), 0) || 1;
  const TOL = 1e-6 * scale; // dead-band: below this f′ is treated as zero
  const STEP = 0.004;
  const pts = [];
  let lastSign = 0;
  let lastX = WORLD.xmin;
  for (let x = WORLD.xmin; x <= WORLD.xmax + 1e-9; x += STEP) {
    const v = polyval(d, x);
    if (Math.abs(v) <= TOL) continue; // in the dead-band → ignore this sample
    const s = v > 0 ? 1 : -1;
    if (lastSign !== 0 && s !== lastSign) {
      // a genuine sign change lies between lastX and x → bisect for its root
      let a = lastX;
      let b = x;
      let fa = polyval(d, lastX); // has the definite sign `lastSign`
      for (let it = 0; it < 60; it++) {
        const m = (a + b) / 2;
        const fm = polyval(d, m);
        if (fm === 0) {
          a = b = m;
          break;
        }
        if (fa < 0 === fm < 0) {
          a = m;
          fa = fm;
        } else b = m;
      }
      const xr = (a + b) / 2;
      pts.push({ x: xr, y: polyval(coeffs, xr) });
    }
    lastSign = s;
    lastX = x;
  }
  return pts;
}

/* Distinct roots with multiplicity, sorted left→right. */
function rootInfo(n, roots) {
  const map = new Map();
  for (let i = 0; i < n; i++) {
    const r = roots[i];
    map.set(r, (map.get(r) || 0) + 1);
  }
  return [...map.entries()]
    .map(([value, mult]) => ({ value, mult }))
    .sort((u, v) => u.value - v.value);
}

/* End behaviour: direction each arm heads. right = sign(a); left flips for odd
   degree. +1 means → +∞, −1 means → −∞. */
function endBehavior(a, n) {
  const right = a > 0 ? 1 : a < 0 ? -1 : 0;
  const left = right * (n % 2 === 0 ? 1 : -1);
  return { left, right };
}

/* ---------------------------------------------------------------------------
   Calibration. RMS curve-matching with the diverging tails clamped (polynomial
   arms blow up, so unclamped RMS would swamp the meter). Because it compares
   CURVES, the student may enter roots in any order and an inactive r₄ is
   ignored — matching the target's shape is all that matters.
   ------------------------------------------------------------------------- */
const CAP = 10; // clamp each residual so the steep arms can't dominate
const RMS_SCALE = 2.5; // meter feel: smallest single-root miss reads ≈ 55%
const MATCH_RMS = 1e-6; // reachable exact match gives rms 0 → CALIBRATED

function rmsError(p, t) {
  const N = 200;
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
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / RMS_SCALE)));

function makeTarget(prev) {
  const aSet = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2];
  const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  let t;
  let guard = 0;
  do {
    const n = DEGREES[Math.floor(Math.random() * DEGREES.length)];
    const a = aSet[Math.floor(Math.random() * aSet.length)];
    const roots = [0, 0, 0, 0].map(() => randInt(-3, 3));
    t = { a, n, roots };
    guard++;
  } while (
    guard < 200 &&
    (sameCurve(t, prev) ||
      sameCurve(t, START) ||
      distinctRootCount(t) < 2 || // want at least two visible crossings
      !fitsReasonably(t))
  );
  return t;
}

function distinctRootCount(t) {
  return new Set(t.roots.slice(0, t.n)).size;
}

// Reject targets that are so steep the central shape is off-screen everywhere.
function fitsReasonably(t) {
  let inBand = 0;
  for (let i = 0; i <= 40; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / 40;
    const y = model(x, t);
    if (y >= WORLD.ymin && y <= WORLD.ymax) inBand++;
  }
  return inBand >= 14;
}

// Two targets draw the same curve iff same degree, same a, same root multiset.
function sameCurve(a, b) {
  if (!a || !b) return false;
  if (a.n !== b.n || a.a !== b.a) return false;
  const ra = a.roots.slice(0, a.n).slice().sort((x, y) => x - y);
  const rb = b.roots.slice(0, b.n).slice().sort((x, y) => x - y);
  return ra.every((v, i) => v === rb[i]);
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−), trimmed decimals, superscripts.
   ------------------------------------------------------------------------- */
const MINUS = '−';
const SUP = { 1: '', 2: '²', 3: '³', 4: '⁴' };
function trim(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}

/* Factored-form equation, grouping repeated roots into powers, e.g.
   y = 2(x + 1)²(x − 3). */
function FactoredEquation({ a, n, roots }) {
  if (Math.abs(a) < 1e-12) return <span>y = 0</span>;
  const distinct = rootInfo(n, roots);
  const coef =
    Math.abs(Math.abs(a) - 1) < 1e-12 ? (a < 0 ? MINUS : '') : trim(a);
  return (
    <span>
      y = {coef}
      {distinct.map((d, i) => {
        let base;
        if (d.value === 0) base = 'x';
        else if (d.value > 0) base = `(x ${MINUS} ${trim(d.value)})`;
        else base = `(x + ${trim(Math.abs(d.value))})`;
        return (
          <span key={i}>
            {base}
            {d.mult > 1 && <sup>{d.mult}</sup>}
          </span>
        );
      })}
    </span>
  );
}

/* The same curve expanded to standard form y = a·xⁿ + … + c. */
function standardFormStr(coeffs) {
  const parts = [];
  for (let p = coeffs.length - 1; p >= 0; p--) {
    const c = coeffs[p];
    if (Math.abs(c) < 1e-9) continue;
    const mag = Math.abs(c);
    const sign = c < 0 ? MINUS : '+';
    let term;
    if (p === 0) term = trim(mag);
    else {
      const co = Math.abs(mag - 1) < 1e-9 ? '' : trim(mag);
      term = co + 'x' + (SUP[p] ?? '^' + p);
    }
    parts.push({ sign, term });
  }
  if (parts.length === 0) return 'y = 0';
  let s = 'y = ';
  parts.forEach((pt, i) => {
    if (i === 0) s += (pt.sign === MINUS ? MINUS : '') + pt.term;
    else s += ' ' + pt.sign + ' ' + pt.term;
  });
  return s;
}

function describeRoots(a, distinct) {
  if (Math.abs(a) < 1e-12) return 'every x (the graph is the x-axis)';
  return distinct
    .map((d) => {
      const base = `x = ${trim(d.value)}`;
      if (d.mult === 1) return base;
      const kind = d.mult % 2 === 0 ? 'touch' : 'cross';
      return `${base} (×${d.mult}, ${kind})`;
    })
    .join(',   ');
}

const DEG_NAME = { 2: 'quadratic', 3: 'cubic', 4: 'quartic' };
const arrowUp = '↑';
const arrowDown = '↓';

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PolynomialFunctionLab() {
  const [a, setA] = useState(START.a);
  const [n, setN] = useState(START.n);
  const [roots, setRoots] = useState(START.roots.slice());
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);
  const [tracing, setTracing] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null);
  const tracerRef = useRef(null);
  const sceneRef = useRef({});

  const params = { a, n, roots };
  const current = STEPS[step];

  /* ---- derived math (computed exactly from state, single source of truth) - */
  const coeffs = expand(a, n, roots);
  const distinct = rootInfo(n, roots);
  const turns = turningPoints(coeffs);
  const ends = endBehavior(a, n);
  const yIntercept = coeffs[0]; // f(0)
  const isFlat = Math.abs(a) < 1e-12;

  // snapshot for the stable draw callback + pointer/tracer handlers
  sceneRef.current = {
    a,
    n,
    roots,
    coeffs,
    distinct,
    turns,
    ends,
    calib: !!current.calib,
    showEnds: !!current.showEnds,
    target,
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

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sx = (x) => ((x - WORLD.xmin) / (WORLD.xmax - WORLD.xmin)) * W;
    const sy = (y) => ((WORLD.ymax - y) / (WORLD.ymax - WORLD.ymin)) * H;

    const S = sceneRef.current;
    const p = { a: S.a, n: S.n, roots: S.roots };

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

    /* one-sample-per-pixel plotter; break the path when the curve leaves the
       window so the steep arms never draw a false cap across the top */
    const plot = (fn, stroke, width, dash) => {
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
        const y = fn(x);
        if (!isFinite(y) || y < WORLD.ymin - 2 || y > WORLD.ymax + 2) {
          pen = false;
          continue;
        }
        const X = sx(x);
        const Y = sy(y);
        if (!pen) {
          ctx.moveTo(X, Y);
          pen = true;
        } else ctx.lineTo(X, Y);
      }
      ctx.stroke();
      ctx.restore();
    };

    /* target curve (calibration only) — dashed grey, under the accent */
    if (S.calib && S.target) {
      plot((x) => model(x, S.target), 'rgba(91,107,123,0.85)', 2, [7, 6]);
    }

    /* end-behaviour arrows at the two far edges (on the relevant steps) */
    if (S.showEnds && !isFlatScene(S)) {
      drawEndArrows(ctx, sx, sy, W, H, S.ends);
    }

    /* the mathematical object — the one carmine accent */
    plot((x) => model(x, p), '#C81E4F', 2.75);

    /* turning points — small neutral rings (a polynomial's ≤ n−1 turns) */
    ctx.save();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(91,107,123,0.85)';
    ctx.fillStyle = '#FBFBF8';
    for (const tp of S.turns) {
      if (tp.y < WORLD.ymin || tp.y > WORLD.ymax) continue;
      ctx.beginPath();
      ctx.arc(sx(tp.x), sy(tp.y), 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    /* roots (x-intercepts) — carmine rings on the axis, with ×m labels for
       repeated roots so multiplicity is visible where it happens */
    if (!isFlatScene(S)) {
      ctx.save();
      ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
      for (const d of S.distinct) {
        if (d.value < WORLD.xmin || d.value > WORLD.xmax) continue;
        const X = sx(d.value);
        const Y = sy(0);
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = '#C81E4F';
        ctx.fillStyle = '#FBFBF8';
        ctx.beginPath();
        ctx.arc(X, Y, d.mult > 1 ? 5.5 : 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (d.mult > 1) {
          // inner dot marks a repeated root
          ctx.fillStyle = '#C81E4F';
          ctx.beginPath();
          ctx.arc(X, Y, 1.8, 0, Math.PI * 2);
          ctx.fill();
          const lbl = '×' + d.mult;
          const tw = ctx.measureText(lbl).width;
          const bx = Math.min(Math.max(X - tw / 2, 2), W - tw - 4);
          ctx.fillStyle = 'rgba(251,251,248,0.9)';
          ctx.fillRect(bx - 3, Y + 8, tw + 6, 15);
          ctx.fillStyle = '#C81E4F';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(lbl, bx, Y + 9);
        }
      }
      ctx.restore();
    }

    /* hover readout: a dot on the curve + its coordinates */
    const hx = hoverRef.current;
    if (hx != null) {
      const hy = model(hx, p);
      if (hy >= WORLD.ymin && hy <= WORLD.ymax) {
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
        ctx.fillStyle = '#1C2B3A';
        ctx.beginPath();
        ctx.arc(X, Y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        const txt = `(${hx.toFixed(1)}, ${hy.toFixed(1)})`;
        ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
        const tw = ctx.measureText(txt).width;
        const bx = Math.min(Math.max(X + 8, 4), W - tw - 12);
        const by = Math.max(Y - 26, 4);
        ctx.fillStyle = 'rgba(251,251,248,0.92)';
        ctx.fillRect(bx - 4, by - 2, tw + 8, 18);
        ctx.fillStyle = '#1C2B3A';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(txt, bx, by);
        ctx.restore();
      }
    }

    /* tracer: a point sweeping the curve as a locus of (x, f(x)) */
    const tx = tracerRef.current;
    if (tx != null) {
      const ty = model(tx, p);
      if (ty >= WORLD.ymin - 2 && ty <= WORLD.ymax + 2) {
        const X = sx(tx);
        const Y = sy(ty);
        ctx.save();
        ctx.strokeStyle = 'rgba(200,30,79,0.4)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(X, sy(0));
        ctx.lineTo(X, Y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#C81E4F';
        ctx.beginPath();
        ctx.arc(X, Y, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FBFBF8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    }
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [a, n, roots, step, target, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (current.calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* tracer sweep — time-based (dt), opt-in, respects reduced motion */
  useEffect(() => {
    if (!tracing) {
      tracerRef.current = null;
      draw();
      return;
    }
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setTracing(false);
      return;
    }
    let raf;
    let start = null;
    const DURATION = 2800;
    const loop = (now) => {
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      tracerRef.current = WORLD.xmin + t * (WORLD.xmax - WORLD.xmin);
      draw();
      if (t < 1) raf = requestAnimationFrame(loop);
      else {
        tracerRef.current = null;
        setTracing(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tracing, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onA = (value) => {
    setA(parseFloat(value));
    if (tracing) setTracing(false);
  };
  const onRoot = (i, value) => {
    const v = parseFloat(value);
    setRoots((prev) => {
      const c = prev.slice();
      c[i] = v;
      return c;
    });
    if (tracing) setTracing(false);
  };
  const onDegree = (deg) => {
    setN(deg);
    if (tracing) setTracing(false);
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
    setN(START.n);
    setRoots(START.roots.slice());
    if (tracing) setTracing(false);
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

  const degUnlocked = step >= DEG_UNLOCK;
  const aUnlocked = step >= A_UNLOCK;

  const spokenEq =
    `y = ${trim(a)} times ` +
    distinct
      .map((d) => (d.mult > 1 ? `(x minus ${trim(d.value)}) to the power ${d.mult}` : `(x minus ${trim(d.value)})`))
      .join(' ');

  return (
    <div className="plab">
      <header className="head">
        <h1>Polynomial Functions</h1>
        <p className="lede">
          Explore a polynomial in{' '}
          <span className="mono">factored form, y = a(x&nbsp;&minus;&nbsp;r₁)(x&nbsp;&minus;&nbsp;r₂)…</span>{' '}
          — where every factor is an x-intercept. Dials unlock one at a time, so you meet roots,
          degree, end behaviour, and multiplicity one idea at a time, then calibrate onto a mystery
          curve.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <FactoredEquation a={a} n={n} roots={roots} />
            </p>
            <p className="equation-sub mono">{standardFormStr(coeffs)}</p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            role="img"
            aria-label={`Graph of ${spokenEq}. Degree ${n}. ${describeRoots(a, distinct)}.`}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">hover the graph to read a point</span>
          </div>
          <span className="sr-only">{spokenEq}</span>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Degree</span>
              <span className="fact-v mono">
                {isFlat ? '—' : `${n} · ${DEG_NAME[n]}`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Leading coefficient</span>
              <span className="fact-v mono">a = {trim(a)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">End behaviour</span>
              <span className="fact-v mono">
                {isFlat
                  ? '—'
                  : `${MINUS}∞: ${ends.left > 0 ? arrowUp : arrowDown}   +∞: ${
                      ends.right > 0 ? arrowUp : arrowDown
                    }`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Turning points</span>
              <span className="fact-v mono">
                {isFlat ? '—' : `${turns.length} (≤ ${n - 1})`}
              </span>
            </div>
            <div className="fact wide">
              <span className="fact-k">Roots (x-intercepts)</span>
              <span className="fact-v mono">{describeRoots(a, distinct)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">y-intercept</span>
              <span className="fact-v mono">(0, {trim(yIntercept)})</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (tracing ? ' on' : '')}
              onClick={() => setTracing((t) => !t)}
            >
              {tracing ? 'Tracing…' : 'Trace the curve'}
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
            {/* degree toggle */}
            <div className={'dial degree' + (degUnlocked ? '' : ' locked')}>
              <span className="dk">n</span>
              <span className="drole">{degUnlocked ? 'degree — number of factors' : 'unlocks soon'}</span>
              <div className="seg" role="group" aria-label="Degree">
                {DEGREES.map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    className={'seg-btn' + (n === deg ? ' on' : '')}
                    aria-pressed={n === deg}
                    disabled={!degUnlocked}
                    onClick={() => onDegree(deg)}
                  >
                    {deg}
                  </button>
                ))}
              </div>
              <output className="dv">{degUnlocked ? n : '🔒'}</output>
            </div>

            {/* leading coefficient */}
            <label className={'dial' + (aUnlocked ? '' : ' locked')}>
              <span className="dk">a</span>
              <span className="drole">{aUnlocked ? 'leading coefficient — stretch & flip' : 'unlocks soon'}</span>
              <input
                type="range"
                min={A_RANGE.min}
                max={A_RANGE.max}
                step={A_RANGE.step}
                value={a}
                disabled={!aUnlocked}
                aria-label="Dial a — leading coefficient"
                onChange={(e) => onA(e.target.value)}
              />
              <output className="dv">{aUnlocked ? trim(a) : '🔒'}</output>
            </label>

            {/* roots — only the first n are shown (active at this degree) */}
            {Array.from({ length: n }).map((_, i) => {
              const unlocked = step >= ROOT_UNLOCK[i];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={i}>
                  <span className="dk">
                    r<sub>{i + 1}</sub>
                  </span>
                  <span className="drole">{unlocked ? `root ${i + 1} — an x-intercept` : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={ROOT_RANGE.min}
                    max={ROOT_RANGE.max}
                    step={ROOT_RANGE.step}
                    value={roots[i]}
                    disabled={!unlocked}
                    aria-label={`Dial r${i + 1} — root ${i + 1}`}
                    onChange={(e) => onRoot(i, e.target.value)}
                  />
                  <output className="dv">{unlocked ? trim(roots[i]) : '🔒'}</output>
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
                  <span className="mono target-hint">target: degree ?, a ?, roots ?</span>
                )}
              </div>
              <p className="sr-only" aria-live="polite">
                {calibrated ? 'Calibrated. Your curve matches the target.' : `Match ${pct.toFixed(0)} percent.`}
              </p>
              <button type="button" className="btn ghost" onClick={() => setTarget(makeTarget(target))}>
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
        <span className="mono">y = a(x − r₁)(x − r₂)…(x − rₙ)</span> &nbsp;·&nbsp; factored form of a
        polynomial, plotted live on a 14×14 quadrille window. Roots are x-intercepts; degree and the
        sign of a set the end behaviour.
      </footer>

      <style jsx>{`
        .plab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
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
          max-width: 70ch;
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 348px;
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
          font-size: 17px;
          font-weight: 600;
          margin: 0;
          line-height: 1.4;
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
        .fact.wide {
          grid-column: 1 / -1;
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
          grid-template-columns: 26px 1fr 48px;
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
        .dk sub {
          font-size: 0.6em;
          font-style: normal;
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
        .seg {
          grid-column: 2;
          display: inline-flex;
          gap: 4px;
        }
        .seg-btn {
          flex: 1;
          font: 600 13px/1 var(--mono);
          padding: 7px 0;
          border: 1px solid rgba(28, 43, 58, 0.25);
          border-radius: 7px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s, color 0.12s;
        }
        .seg-btn.on {
          background: var(--ink);
          border-color: var(--ink);
          color: #fff;
        }
        .seg-btn:disabled {
          cursor: not-allowed;
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
        :global(.plab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .seg-btn {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Canvas helpers kept outside the component (they take ctx + transforms).
   ------------------------------------------------------------------------- */
function isFlatScene(S) {
  return Math.abs(S.a) < 1e-12;
}

function drawEndArrows(ctx, sx, sy, W, H, ends) {
  ctx.save();
  ctx.strokeStyle = 'rgba(91,107,123,0.7)';
  ctx.fillStyle = 'rgba(91,107,123,0.7)';
  ctx.lineWidth = 2;
  const pad = 20;
  // left arm at the far-left edge, right arm at the far-right edge
  const arm = (xPx, dir) => {
    const yPx = dir > 0 ? pad + 10 : H - pad - 10; // heads toward top (+) or bottom (−)
    const len = 26;
    const y0 = dir > 0 ? yPx + len : yPx - len;
    ctx.beginPath();
    ctx.moveTo(xPx, y0);
    ctx.lineTo(xPx, yPx);
    ctx.stroke();
    // arrowhead
    ctx.beginPath();
    ctx.moveTo(xPx, yPx);
    ctx.lineTo(xPx - 5, yPx + (dir > 0 ? 8 : -8));
    ctx.lineTo(xPx + 5, yPx + (dir > 0 ? 8 : -8));
    ctx.closePath();
    ctx.fill();
  };
  arm(pad, ends.left);
  arm(W - pad, ends.right);
  ctx.restore();
}
