'use client';

/* ============================================================================
   EllipseLab — an interactive "bench" for the ellipse in standard form,
        (x − h)²      (y − k)²
        ────────  +   ────────  =  1
           a²            b²

   Built for MAIS (math AI system, www.mais.hk), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   Why this bench differs from the y = f(x) template, and how it stays faithful:
     • An ellipse is NOT a function of x — for most x there are two y-values.
       So the MODEL is the PARAMETRIC curve  x = h + a·cos t,  y = k + b·sin t,
       and the RENDER draws it as one closed path instead of a per-pixel plot.
     • The ellipse's defining beauty is the two-foci "constant-sum" property.
       That is the centerpiece: turn on the string and the sum of the two focal
       distances stays locked at 2·(semi-major axis) as a point walks the curve.
   Everything else — the state→model→render spine, DPI handling, unlocking
   dials, predict-then-check gating, and the RMS calibration meter — is the
   same machine as the rest of the lab library.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/EllipseLab.jsx
     2. Import and render it:
          import EllipseLab from './EllipseLab';
          export default function Page() { return <EllipseLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, h, k, step).
     MODEL  — the parametric point is pure math; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. Square window so x and y share one scale and
   the ellipse is never distorted. Grid every 1 unit, labels every 2. The
   parameter ranges below keep the whole ellipse inside this window (the
   farthest point is |center| + semi-axis ≤ 3 + 6 = 9 < 10).
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Each dial names the letter it drives, its range/step,
   and the lesson step at which it unlocks. All steps are 0.5 so a grid-aligned
   calibration target can be matched exactly.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'a', label: 'a', min: 1, max: 6, step: 0.5, unlock: 1, role: 'horizontal semi-axis' },
  { key: 'b', label: 'b', min: 1, max: 6, step: 0.5, unlock: 2, role: 'vertical semi-axis' },
  { key: 'h', label: 'h', min: -3, max: 3, step: 0.5, unlock: 3, role: 'center · left / right' },
  { key: 'k', label: 'k', min: -3, max: 3, step: 0.5, unlock: 4, role: 'center · up / down' },
];
const START = { a: 5, b: 3, h: 0, k: 0 };

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the ellipse',
    body:
      'An ellipse is a smooth oval — think of a circle that has been stretched. We write it in ' +
      'standard form, (x − h)²/a² + (y − k)²/b² = 1. The center is (h, k); a is how far the curve ' +
      'reaches left–right, and b is how far it reaches up–down. Right now a = 5 and b = 3, centered ' +
      'at the origin.',
    q: 'With a = 5 and b = 3 the ellipse is wider than it is tall. The longer of its two axes — here the horizontal one — is called the…?',
    choices: ['The major axis', 'The minor axis', 'The radius'],
    answer: 0,
    feedback:
      'The longer axis is the major axis (length 2a = 10 here); the shorter one is the minor axis ' +
      '(length 2b = 6). Their half-lengths, a and b, are the semi-major and semi-minor axes. When ' +
      'a = b the two are equal and the ellipse is a circle.',
  },
  {
    title: 'a — the horizontal semi-axis',
    body:
      'The a dial is now live. It sets how far the ellipse reaches left and right of the center: the ' +
      'curve always passes through x = h − a and x = h + a. Drag it and watch the oval widen.',
    q: 'Increase a. What happens to the ellipse?',
    choices: ['It stretches wider, reaching x = h ± a', 'It slides to the right', 'It moves straight up'],
    answer: 0,
    feedback:
      'a is the semi-axis along the x-direction: the ellipse always touches x = h − a and x = h + a. ' +
      'Growing a widens the oval; shrinking a toward b rounds it toward a circle. Notice a controls ' +
      'width only — it never moves the center.',
  },
  {
    title: 'b — the vertical semi-axis, and the circle',
    body:
      'Now the b dial is unlocked. It controls the up-and-down reach: the curve passes through ' +
      'y = k − b and y = k + b. Try sliding b until it equals a.',
    q: 'What shape appears the moment b equals a?',
    choices: ['A perfect circle', 'A parabola', 'A straight line'],
    answer: 0,
    feedback:
      'When a = b every direction has the same reach, so the ellipse becomes a circle of radius a. ' +
      'An ellipse is exactly a circle scaled differently along x and y. Push b past a and the ellipse ' +
      'becomes taller than wide — its major axis turns vertical.',
  },
  {
    title: 'h — sliding the center left and right',
    body:
      'The h dial moves the whole ellipse horizontally. Look inside the equation: x appears as ' +
      '(x − h), so h lives with the center, not with the shape.',
    q: 'Set h = 3. Where is the center of the ellipse now?',
    choices: ['At x = 3', 'At x = −3', 'Still at x = 0'],
    answer: 0,
    feedback:
      'The center sits at x = h, so h = 3 moves it to (3, 0). The minus sign in (x − h) fools many ' +
      'students: a positive h shifts the graph in the positive x-direction. Everything — foci, ' +
      'vertices, the whole curve — travels with the center.',
  },
  {
    title: 'k — sliding the center up and down',
    body:
      'The last dial, k, moves the ellipse vertically, because y appears as (y − k). Together, ' +
      '(h, k) is the center of the ellipse.',
    q: 'This center (h, k) sits inside (x − h)² and (y − k)². Which other curve you have met is written around its own point (h, k)?',
    choices: [
      'The vertex form of a quadratic, y = a(x − h)² + k',
      'The slope-intercept line y = mx + b',
      'None — this structure is unique to ellipses',
    ],
    answer: 0,
    feedback:
      'Same idea as the parabola’s vertex form: (h, k) is the special point the whole curve is built ' +
      'around. Being able to read a center (or a vertex) straight off the equation is the whole payoff ' +
      'of these “shifted” forms — the (h, k) is sitting right there in the parentheses.',
  },
  {
    title: 'The two foci and the string',
    body:
      'Every ellipse hides two special points inside it, called foci. The string is now switched on: ' +
      'from a point on the ellipse, a line runs to each focus. Move the point around — hover the ' +
      'graph, or press “Trace the string” — and watch the two lengths trade off.',
    q: 'As the point travels around the ellipse, what happens to the SUM of its distances to the two foci?',
    choices: [
      'It stays constant — equal to the major-axis length (2 × the longer semi-axis)',
      'It grows near the ends and shrinks in the middle',
      'It equals zero when the point passes a focus',
    ],
    answer: 0,
    feedback:
      'That constant sum is the true definition of an ellipse: the set of all points whose distances ' +
      'to the two foci add to the same total — the length of the major axis. The foci lie on the major ' +
      'axis, a distance c from the center, where c² = (longer semi-axis)² − (shorter semi-axis)². As ' +
      'the ellipse rounds out the foci slide inward; when a = b they meet at the center, c = 0, and you ' +
      'have a circle.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery ellipse is drawn as a dashed grey curve. Tune a, b, h, and k until ' +
      'your carmine ellipse lands exactly on top of it and the meter reads CALIBRATED. Press ' +
      '“New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.
   Parametric point on the ellipse:  x = h + a·cos t,  y = k + b·sin t.
   ------------------------------------------------------------------------- */
function ellipsePoint(t, p) {
  return [p.h + p.a * Math.cos(t), p.k + p.b * Math.sin(t)];
}

/* Geometry derived from the parameters — foci, orientation, eccentricity.
   Written to be correct for EITHER orientation (a≥b or b>a) and for the
   circle (a=b ⇒ c=0, foci at the center). */
function geometry(p) {
  const horizontal = p.a >= p.b; // is the major axis the horizontal one?
  const semiMajor = Math.max(p.a, p.b);
  const semiMinor = Math.min(p.a, p.b);
  const c = Math.sqrt(Math.max(0, semiMajor * semiMajor - semiMinor * semiMinor));
  const f1 = horizontal ? [p.h - c, p.k] : [p.h, p.k - c];
  const f2 = horizontal ? [p.h + c, p.k] : [p.h, p.k + c];
  const eccentricity = semiMajor > 0 ? c / semiMajor : 0;
  return { horizontal, semiMajor, semiMinor, c, f1, f2, eccentricity, focalSum: 2 * semiMajor };
}

const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. The match metric is the RMS Euclidean distance between
   the two curves at the SAME parameter t. It is 0 exactly when (a, b, h, k)
   all match, and grows smoothly otherwise — a well-defined, orientation-free
   score. Targets are on the 0.5 grid, so an exact (RMS = 0) match is reachable.
   ------------------------------------------------------------------------- */
function rmsError(p, t) {
  const N = 120;
  let s = 0;
  for (let i = 0; i < N; i++) {
    const th = (2 * Math.PI * i) / N;
    const [x1, y1] = ellipsePoint(th, p);
    const [x2, y2] = ellipsePoint(th, t);
    const dx = x1 - x2;
    const dy = y1 - y2;
    s += dx * dx + dy * dy;
  }
  return Math.sqrt(s / N);
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 1.2)));
const MATCH_RMS = 0.03; // below this the ellipses are effectively identical -> CALIBRATED

function makeTarget(prev) {
  const snap = (v, st) => Math.round(v / st) * st;
  let t;
  do {
    const a = snap(2 + Math.random() * 4, 0.5); // 2.0 … 6.0
    const b = snap(2 + Math.random() * 4, 0.5); // 2.0 … 6.0
    const h = snap(-3 + Math.random() * 6, 0.5); // −3 … 3
    const k = snap(-3 + Math.random() * 6, 0.5); // −3 … 3
    t = { a, b, h, k };
  } while (
    Math.abs(t.a - t.b) < 1 || // keep it a clear ellipse (foci visibly off-center), not a near-circle
    (prev && t.a === prev.a && t.b === prev.b && t.h === prev.h && t.k === prev.k) ||
    (t.a === START.a && t.b === START.b && t.h === START.h && t.k === START.k) // never hand back the start
  );
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−), trimmed decimals.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 100) / 100;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}

/* EDIT 5 — Equation display. Standard form with proper stacked fractions and
   careful sign handling. Denominators show the numeric squares (a = 5 ⇒ 25) so
   students connect the dial value to the number under the fraction bar. */
function ShiftedSquared({ sym, val }) {
  // renders  x²  (val 0)  or  (x − v)²  or  (x + |v|)²
  if (val === 0) {
    return (
      <span>
        {sym}
        <sup>2</sup>
      </span>
    );
  }
  return (
    <span>
      ({sym}&nbsp;{val > 0 ? MINUS : '+'}&nbsp;{trim(Math.abs(val))})<sup>2</sup>
    </span>
  );
}
function Frac({ num, den }) {
  return (
    <span className="frac">
      <span className="frac-num">{num}</span>
      <span className="frac-den">{den}</span>
    </span>
  );
}
function StandardEquation({ a, b, h, k }) {
  return (
    <span className="eq">
      <Frac num={<ShiftedSquared sym="x" val={h} />} den={trim(a * a)} />
      <span className="eq-op">+</span>
      <Frac num={<ShiftedSquared sym="y" val={k} />} den={trim(b * b)} />
      <span className="eq-op">=</span>
      <span>1</span>
    </span>
  );
}

/* The parametric form, with the current values substituted — the second way
   to describe the same curve, and the one the tracer animates. */
function parametricForm(a, b, h, k) {
  const term = (center, amp, fn) => {
    const t = `${trim(amp)}&nbsp;${fn}&nbsp;t`;
    return center === 0 ? t : `${trim(center)}&nbsp;+&nbsp;${t}`;
  };
  return `x = ${term(h, a, 'cos')},   y = ${term(k, b, 'sin')}`;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function EllipseLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [h, setH] = useState(START.h);
  const [k, setK] = useState(START.k);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [tracing, setTracing] = useState(false);
  const [showFoci, setShowFoci] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // { x, y } world point under the pointer, or null
  const tracerRef = useRef(null); // parameter t of the sweeping tracer, or null
  const sceneRef = useRef({});

  const params = { a, b, h, k };
  const current = STEPS[step];
  const g = geometry(params);

  // Snapshot everything the renderer needs, so draw() (a stable callback) and
  // the pointer/tracer handlers never read stale values.
  sceneRef.current = { a, b, h, k, calib: !!current.calib, target, showFoci };

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
    const p = { a: S.a, b: S.b, h: S.h, k: S.k };
    const gg = geometry(p);

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
      if (gx === 0 || gx <= WORLD.xmin || gx >= WORLD.xmax) continue; // skip origin & clipped edges
      ctx.fillText(String(gx), sx(gx), sy(0) + 4);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let gy = Math.ceil(WORLD.ymin / 2) * 2; gy <= WORLD.ymax; gy += 2) {
      if (gy === 0 || gy <= WORLD.ymin || gy >= WORLD.ymax) continue; // skip origin & clipped edges
      ctx.fillText(String(gy), sx(0) - 6, sy(gy));
    }

    /* draws a full ellipse as one closed parametric path (no y=f(x) branches) */
    const plotEllipse = (q, stroke, width, dash) => {
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.setLineDash(dash || []);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const N = 256;
      for (let i = 0; i <= N; i++) {
        const th = (2 * Math.PI * i) / N;
        const [x, y] = ellipsePoint(th, q);
        const X = sx(x);
        const Y = sy(y);
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };

    const dot = (wx, wy, r, fill, ring) => {
      ctx.beginPath();
      ctx.arc(sx(wx), sy(wy), r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (ring) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = ring;
        ctx.stroke();
      }
    };

    /* target ellipse (calibration only) — dashed grey, drawn under the accent */
    if (S.calib && S.target) {
      plotEllipse(S.target, 'rgba(91,107,123,0.85)', 2, [7, 6]);
    }

    /* major & minor axes through the center (only when the string is shown) */
    if (S.showFoci) {
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(91,107,123,0.5)';
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(sx(p.h - p.a), sy(p.k));
      ctx.lineTo(sx(p.h + p.a), sy(p.k));
      ctx.moveTo(sx(p.h), sy(p.k - p.b));
      ctx.lineTo(sx(p.h), sy(p.k + p.b));
      ctx.stroke();
      ctx.restore();
      /* vertices & co-vertices — small open markers where a and b reach */
      ctx.save();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(91,107,123,0.9)';
      ctx.fillStyle = '#FBFBF8';
      for (const [vx, vy] of [
        [p.h - p.a, p.k],
        [p.h + p.a, p.k],
        [p.h, p.k - p.b],
        [p.h, p.k + p.b],
      ]) {
        ctx.beginPath();
        ctx.arc(sx(vx), sy(vy), 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    /* the mathematical object — the one carmine accent */
    plotEllipse(p, '#C81E4F', 2.75);

    /* center marker + label */
    if (p.h >= WORLD.xmin && p.h <= WORLD.xmax && p.k >= WORLD.ymin && p.k <= WORLD.ymax) {
      dot(p.h, p.k, 3.5, '#1C2B3A');
      if (!S.calib) {
        ctx.save();
        ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
        const label = `(${trim(p.h)}, ${trim(p.k)})`;
        const tw = ctx.measureText(label).width;
        const cx = sx(p.h);
        const cy = sy(p.k);
        const lx = Math.min(Math.max(cx + 8, 4), W - tw - 8);
        ctx.fillStyle = 'rgba(251,251,248,0.85)';
        ctx.fillRect(lx - 3, cy + 6, tw + 6, 16);
        ctx.fillStyle = '#5B6B7B';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(label, lx, cy + 8);
        ctx.restore();
      }
    }

    /* the active point on the curve: tracer takes precedence over hover */
    let activeT = null;
    if (tracerRef.current != null) activeT = tracerRef.current;
    else if (hoverRef.current) {
      const hv = hoverRef.current;
      // The parametric angle t of the curve point lying in the pointer's
      // geometric direction θ from the center: tan θ = (b sin t)/(a cos t),
      // so t = atan2(a·sin θ, b·cos θ). Plain atan2 of the offsets would put
      // the marker up to ~27° off-direction on an eccentric ellipse.
      activeT = Math.atan2(p.a * (hv.y - p.k), p.b * (hv.x - p.h));
    }

    /* foci + string (constant-sum property) */
    if (S.showFoci) {
      const [f1x, f1y] = gg.f1;
      const [f2x, f2y] = gg.f2;

      if (activeT != null) {
        const [px, py] = ellipsePoint(activeT, p);
        // the two focal radii
        ctx.save();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = 'rgba(28,43,58,0.5)';
        ctx.beginPath();
        ctx.moveTo(sx(f1x), sy(f1y));
        ctx.lineTo(sx(px), sy(py));
        ctx.moveTo(sx(f2x), sy(f2y));
        ctx.lineTo(sx(px), sy(py));
        ctx.stroke();
        ctx.restore();
        // the point on the curve (on the object, so carmine with a paper ring)
        dot(px, py, 5, '#C81E4F', '#FBFBF8');

        // the running sum readout, top-left — the payoff: it never changes
        const r1 = dist(px, py, f1x, f1y);
        const r2 = dist(px, py, f2x, f2y);
        const majSym = p.a >= p.b ? 'a' : 'b'; // the sum equals twice the SEMI-MAJOR axis
        const txt = `PF₁ + PF₂ = ${r1.toFixed(1)} + ${r2.toFixed(1)} = ${(r1 + r2).toFixed(1)} = 2${majSym}`;
        ctx.save();
        ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
        const tw = ctx.measureText(txt).width;
        ctx.fillStyle = 'rgba(251,251,248,0.92)';
        ctx.fillRect(8, 8, tw + 12, 20);
        ctx.strokeStyle = 'rgba(28,43,58,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(8.5, 8.5, tw + 11, 19);
        ctx.fillStyle = '#1C2B3A';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, 14, 19);
        ctx.restore();
      }

      // the foci themselves, drawn last so they sit on top of the radii
      dot(f1x, f1y, 4, '#1C2B3A', '#FBFBF8');
      dot(f2x, f2y, 4, '#1C2B3A', '#FBFBF8');
      if (gg.c > 0.15) {
        ctx.save();
        ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.fillStyle = '#1C2B3A';
        // horizontal major: labels sit above the dots (x-axis ticks are below);
        // vertical major: labels sit to the right (y-axis ticks are to the left),
        // so they never collide with the axis numbers.
        const vertMajor = p.b > p.a;
        ctx.textAlign = vertMajor ? 'left' : 'center';
        ctx.textBaseline = vertMajor ? 'middle' : 'bottom';
        const ox = vertMajor ? 8 : 0;
        const oy = vertMajor ? 0 : -7;
        ctx.fillText('F₁', sx(f1x) + ox, sy(f1y) + oy);
        ctx.fillText('F₂', sx(f2x) + ox, sy(f2y) + oy);
        ctx.restore();
      }
    } else if (activeT != null) {
      /* no foci: a plain hover/trace readout of the point (x, y), like the
         other benches */
      const [px, py] = ellipsePoint(activeT, p);
      dot(px, py, 5, '#C81E4F', '#FBFBF8');
      const txt = `(${px.toFixed(1)}, ${py.toFixed(1)})`;
      ctx.save();
      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(txt).width;
      const X = sx(px);
      const Y = sy(py);
      const bx = Math.min(Math.max(X + 10, 4), W - tw - 12);
      const by = Math.max(Y - 26, 4);
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(bx - 4, by - 2, tw + 8, 18);
      ctx.fillStyle = '#1C2B3A';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(txt, bx, by);
      ctx.restore();
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [a, b, h, k, step, target, showFoci, draw]);

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

  /* the foci step turns the string on automatically */
  useEffect(() => {
    if (STEPS[step] && STEPS[step].title === 'The two foci and the string') setShowFoci(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the tracer sweep — time-based (dt), opt-in, and respects reduced motion */
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
    const DURATION = 4200; // one full lap
    const loop = (now) => {
      if (start == null) start = now;
      const t = (now - start) / DURATION;
      tracerRef.current = t * 2 * Math.PI; // walk the parameter around the ellipse
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
  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 'a') setA(v);
    else if (key === 'b') setB(v);
    else if (key === 'h') setH(v);
    else setK(v);
    if (tracing) setTracing(false); // a dial move ends any sweep
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    hoverRef.current = {
      x: WORLD.xmin + (cssX / rect.width) * (WORLD.xmax - WORLD.xmin),
      y: WORLD.ymax - (cssY / rect.height) * (WORLD.ymax - WORLD.ymin),
    };
    draw();
  };
  const onPointerLeave = () => {
    hoverRef.current = null;
    draw();
  };

  const resetDials = () => {
    setA(START.a);
    setB(START.b);
    setH(START.h);
    setK(START.k);
    if (tracing) setTracing(false);
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

  const orientation =
    Math.abs(a - b) < 1e-9
      ? 'a circle (a = b)'
      : a > b
      ? 'wider than tall · major axis horizontal'
      : 'taller than wide · major axis vertical';

  return (
    <div className="elab">
      <header className="head">
        <h1>The Ellipse</h1>
        <p className="lede">
          Explore the ellipse in{' '}
          <span className="mono">
            standard form, (x&nbsp;&minus;&nbsp;h)²/a²&nbsp;+&nbsp;(y&nbsp;&minus;&nbsp;k)²/b²&nbsp;=&nbsp;1
          </span>
          . Each dial unlocks with the lesson, so you meet one idea at a time — then discover the
          two-foci “string” property and calibrate your curve onto a mystery target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <StandardEquation a={a} b={b} h={h} k={k} />
            </p>
            <p
              className="equation-sub mono"
              dangerouslySetInnerHTML={{ __html: parametricForm(a, b, h, k) }}
            />
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">hover the graph to walk a point around the ellipse</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Center</span>
              <span className="fact-v mono">{`(${trim(h)}, ${trim(k)})`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Semi-axes</span>
              <span className="fact-v mono">{`a = ${trim(a)} · b = ${trim(b)}`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Shape</span>
              <span className="fact-v">{orientation}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Foci</span>
              <span className="fact-v mono">
                {g.c < 1e-9
                  ? 'at the center — it’s a circle'
                  : `(${trim(g.f1[0])}, ${trim(g.f1[1])}) · (${trim(g.f2[0])}, ${trim(g.f2[1])})`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Eccentricity</span>
              <span className="fact-v mono">
                {g.c < 1e-9 ? '0 · a circle' : g.eccentricity.toFixed(2)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Sum of focal radii</span>
              <span className="fact-v mono">{`2${a >= b ? 'a' : 'b'} = ${trim(g.focalSum)} (constant)`}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (tracing ? ' on' : '')}
              onClick={() => {
                setShowFoci(true);
                setTracing((t) => !t);
              }}
            >
              {tracing ? 'Tracing…' : 'Trace the string'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showFoci ? ' on' : '')}
              onClick={() => setShowFoci((s) => !s)}
            >
              {showFoci ? 'Foci shown' : 'Show foci'}
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
              const val = { a, b, h, k }[d.key];
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
                  <span className="mono target-hint">target: a=?, b=?, h=?, k=?</span>
                )}
              </div>
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
                  setShowFoci(false);
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
        <span className="mono">(x − h)²/a² + (y − k)²/b² = 1</span> &nbsp;·&nbsp; standard form of the
        ellipse, plotted live from the dials on a 20×20 quadrille window.
      </footer>

      <style jsx>{`
        .elab {
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
          max-width: 68ch;
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
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
          color: var(--curve);
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        /* stacked-fraction equation readout */
        .eq {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 17px;
          font-weight: 600;
        }
        .eq-op {
          font-weight: 600;
        }
        .eq sup {
          font-size: 0.68em;
        }
        .frac {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          vertical-align: middle;
        }
        .frac-num {
          padding: 0 8px 2px;
          line-height: 1.2;
          border-bottom: 1.6px solid currentColor;
        }
        .frac-den {
          padding: 2px 8px 0;
          line-height: 1.2;
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
        :global(.elab) :focus-visible {
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
