'use client';

/* ============================================================================
   QuadraticPolynomialLab — an interactive "bench" for the quadratic polynomial
   in STANDARD (coefficient) form,  y = a·x² + b·x + c.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   CCSS: A-SSE.A, A-SSE.B.3a, A-REI.B.4, F-IF.C.7a, F-IF.C.8a (Algebra 1).

   This lab is deliberately DISTINCT from its sibling QuadraticFunctionLab
   (which teaches VERTEX form y = a(x − h)² + k). Here the three dials ARE the
   three coefficients a, b, c, and the centerpiece is the DISCRIMINANT
   Δ = b² − 4ac — the single number that decides how many times the parabola
   crosses the x-axis (two roots, one double root, or none), and how far the
   two roots sit from the axis of symmetry:  roots = −b/2a ± √Δ/(2a).

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/QuadraticPolynomialLab.jsx
     2. Import and render it:
          import QuadraticPolynomialLab from './QuadraticPolynomialLab';
          export default function Page() { return <QuadraticPolynomialLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, c, lesson step).
     MODEL  — f(x) is pure math; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.

   CORRECTNESS — this is K-12 content, so every derived quantity (vertex,
   axis, discriminant, rational roots) is computed with EXACT INTEGER
   ARITHMETIC. Because the dials live on fixed grids (a: quarters, b & c:
   halves) we rescale to integers ai = 4a, bi = 2b, ci = 2c and get
       Δ·4 = bi² − 2·ai·ci   (an exact integer),
   so the discriminant sign, the vertex, the axis, and any rational roots are
   never subject to floating-point error. See audit-quadratic-polynomial.mjs.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. Square window so x and y share one scale and
   the parabola is never distorted. Grid every 1 unit, labels every 2.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -8, xmax: 8, ymin: -8, ymax: 8 };

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Each dial IS a coefficient of the polynomial; it names
   the letter it drives, its range/step, and the lesson step at which it
   unlocks. Steps are chosen so a, b, c live on clean grids (quarters / halves)
   which keeps the exact-integer arithmetic tidy.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'a', label: 'a', min: -3, max: 3, step: 0.25, unlock: 1, role: 'leading coefficient · x² term' },
  { key: 'b', label: 'b', min: -6, max: 6, step: 0.5, unlock: 2, role: 'linear coefficient · x term' },
  { key: 'c', label: 'c', min: -6, max: 6, step: 0.5, unlock: 3, role: 'constant term · y-intercept' },
];
const START = { a: 1, b: 0, c: 0 };

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the quadratic polynomial',
    body:
      'A quadratic polynomial is written in standard form, y = a·x² + b·x + c — a sum of three ' +
      'terms with three coefficients. Its graph is always a parabola. Right now a = 1, b = 0, ' +
      'c = 0, so you are looking at the plainest parabola of all, y = x². We will unlock one ' +
      'coefficient at a time and watch exactly what each one does to the curve.',
    q: 'Which single term is what makes this a QUADRATIC (degree 2), rather than a straight line?',
    choices: ['The a·x² term', 'The b·x term', 'The constant c'],
    answer: 0,
    feedback:
      'The a·x² term is the quadratic term — the highest power of x. As long as a ≠ 0 the graph ' +
      'curves into a parabola. Take a all the way to 0 and the x² term vanishes: what is left, ' +
      'y = b·x + c, is just a straight line.',
  },
  {
    title: 'a — direction & width',
    body:
      'The a dial — the leading coefficient — is now live. Drag it. Watch the parabola stretch, ' +
      'flatten, and then flip over as a passes through zero.',
    q: 'a starts positive and the parabola opens upward. What happens when you make a negative?',
    choices: [
      'It flips over to open downward',
      'It slides to the left',
      'It only gets wider, still opening up',
    ],
    answer: 0,
    feedback:
      'The SIGN of a sets the direction: a > 0 opens upward (the vertex is the lowest point), ' +
      'a < 0 opens downward (the vertex is the highest point). The SIZE |a| sets the width — ' +
      '|a| > 1 is narrow and steep, 0 < |a| < 1 is wide and flat. Exactly at a = 0 it is no ' +
      'longer a parabola at all.',
  },
  {
    title: 'b — the linear coefficient',
    body:
      'Now the b dial is unlocked. b is the trickiest coefficient: unlike a and c you cannot read ' +
      'it straight off a single feature. Watch the dashed vertical line — the axis of symmetry — ' +
      'as you drag b.',
    q: 'With a > 0, slide b upward from 0. Which way does the axis of symmetry move?',
    choices: [
      'Left (its x-value becomes negative)',
      'Right (its x-value becomes positive)',
      'It never moves — only c can shift the curve',
    ],
    answer: 0,
    feedback:
      'The axis of symmetry sits at x = −b/(2a). With a > 0, increasing b makes −b/(2a) negative, ' +
      'so the whole parabola slides LEFT (and down, tracing its own path). b and a together place ' +
      'the vertex; that is why b alone is hard to “see”.',
  },
  {
    title: 'c — the constant term',
    body:
      'The last dial, c, is the constant term. It is the easiest coefficient to read straight ' +
      'off the graph. Drag it and keep your eye on where the curve meets the y-axis.',
    q: 'Set c = −4 (leave a = 1, b = 0). What are the coordinates of the y-intercept?',
    choices: ['(0, −4)', '(−4, 0)', '(0, 4)'],
    answer: 0,
    feedback:
      'Put x = 0 into y = a·x² + b·x + c and the first two terms vanish, leaving y = c. So the ' +
      'y-intercept is always the point (0, c) — here (0, −4). c slides the whole parabola ' +
      'straight up and down.',
  },
  {
    title: 'Reading the vertex from a, b, c',
    body:
      'All three dials are live. Standard form hides the vertex, but you can compute it: the axis ' +
      'of symmetry is x = −b/(2a), and the vertex y-value is whatever the curve does there. The ' +
      'faint second equation below the main one is the same parabola rewritten in vertex form by ' +
      'completing the square.',
    q: 'What is the x-coordinate of the vertex of y = a·x² + b·x + c?',
    choices: ['x = −b/(2a)', 'x = c', 'x = −c/a'],
    answer: 0,
    feedback:
      'The vertex lies on the axis of symmetry, x = −b/(2a). Substituting back gives its height, ' +
      'y = c − b²/(4a). Completing the square turns y = a·x² + b·x + c into ' +
      'y = a(x + b/2a)² + (c − b²/4a) — the same curve, vertex now in plain sight.',
  },
  {
    title: 'The discriminant Δ = b² − 4ac',
    body:
      'Here is the star of standard form. The quadratic formula, x = (−b ± √(b²−4ac)) / (2a), ' +
      'finds the roots — where the parabola crosses the x-axis. The quantity under the square ' +
      'root, Δ = b² − 4ac, is the DISCRIMINANT, and its sign alone decides how many real roots ' +
      'there are. Turn on “Show root spread” and hunt for each case with the dials.',
    q: 'If the discriminant Δ = b² − 4ac is NEGATIVE, how many times does the parabola cross the x-axis?',
    choices: [
      'Zero times — no real roots',
      'Once — a single root',
      'Twice — two real roots',
    ],
    answer: 0,
    feedback:
      'Δ < 0 means √Δ is not a real number, so there are no real roots — the parabola clears the ' +
      'x-axis entirely. Δ > 0 gives two real roots (the ± spreads them √Δ/(2|a|) to each side of ' +
      'the axis); Δ = 0 pinches them together into one “double” root sitting right on the vertex.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery parabola is drawn as a dashed grey curve. Read its clues — where ' +
      'it crosses the y-axis is c; which way and how sharply it opens is a; the position of its ' +
      'axis pins down b — then tune a, b, c until your carmine curve lands exactly on top and the ' +
      'meter reads CALIBRATED. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.  y = a·x² + b·x + c
   ------------------------------------------------------------------------- */
function model(x, p) {
  return (p.a * x + p.b) * x + p.c; // Horner form: a·x² + b·x + c
}

/* ---------------------------------------------------------------------------
   Exact-integer coefficient analysis. Dials live on grids (a: 0.25, b/c: 0.5),
   so ai = 4a, bi = 2b, ci = 2c are exact integers and
       Δ = (bi² − 2·ai·ci) / 4.
   Everything downstream (discriminant sign, vertex, axis, rational roots) is
   therefore exact — no floating-point classification errors near Δ = 0.
   ------------------------------------------------------------------------- */
function ints(p) {
  return { ai: Math.round(p.a * 4), bi: Math.round(p.b * 2), ci: Math.round(p.c * 2) };
}
function discNum(p) {
  const { ai, bi, ci } = ints(p); // returns Δ·4 as an exact integer
  return bi * bi - 2 * ai * ci;
}

const MINUS = '−';
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
/* Format an exact fraction n/d, fully reduced, with a proper minus sign. */
function fmtFrac(n, d) {
  if (d === 0) return '—';
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (d === 1) return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
  const sign = n < 0 ? MINUS : '';
  return `${sign}${Math.abs(n)}/${d}`;
}
function trim(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}

/* Vertex, axis, discriminant, roots — all exact where the numbers are exact. */
function analyze(p) {
  const { ai, bi, ci } = ints(p);
  const linear = ai === 0;
  const dN = bi * bi - 2 * ai * ci; // Δ·4
  const disc = dN / 4; // the real discriminant value
  const out = { linear, disc, dN, ai, bi, ci };

  if (linear) {
    // y = b·x + c is a line. One root at x = −c/b when b ≠ 0.
    out.axisStr = '—';
    out.vertexStr = '—';
    out.rootsFloat = bi !== 0 ? [-p.c / p.b] : [];
    out.rootsStr = bi !== 0 ? [fmtFrac(-ci, bi)] : [];
    out.rootCount = bi !== 0 ? 1 : 0;
    return out;
  }

  // axis / vertex x = −b/2a = −bi/ai ; vertex y = c − b²/4a = −Δ = −dN/(4ai)
  out.hFloat = -bi / ai;
  out.kFloat = -dN / (4 * ai);
  out.axisStr = fmtFrac(-bi, ai);
  out.vertexXStr = fmtFrac(-bi, ai);
  out.vertexYStr = fmtFrac(-dN, 4 * ai);

  if (dN > 0) {
    const s = Math.sqrt(dN);
    const sInt = Math.round(s);
    const perfect = sInt * sInt === dN; // rational roots iff Δ·4 is a perfect square
    const r1f = (-bi - s) / ai;
    const r2f = (-bi + s) / ai;
    out.rootsFloat = [Math.min(r1f, r2f), Math.max(r1f, r2f)];
    out.rootCount = 2;
    if (perfect) {
      out.rootsStr = [fmtFrac(-bi - sInt, ai), fmtFrac(-bi + sInt, ai)];
      out.rootsExact = true;
    } else {
      out.rootsStr = [trim(out.rootsFloat[0]), trim(out.rootsFloat[1])];
      out.rootsExact = false;
    }
  } else if (dN === 0) {
    out.rootsFloat = [-bi / ai];
    out.rootsStr = [fmtFrac(-bi, ai)];
    out.rootsExact = true;
    out.rootCount = 1;
  } else {
    out.rootsFloat = [];
    out.rootsStr = [];
    out.rootCount = 0;
  }
  return out;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. RMS curve-matching with the diverging tails clamped
   (a parabola's arms blow up, so unclamped RMS would swamp the meter). A
   reciprocal mapping turns RMS into a friendly 0–100% reading.
   ------------------------------------------------------------------------- */
function rmsError(p, t) {
  const N = 160;
  const CAP = 12; // clamp each residual so the tails can't dominate the meter
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
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 1.2)));
const MATCH_RMS = 0.06; // below this the curves are effectively identical -> CALIBRATED

function makeTarget(prev) {
  const snap = (v, st) => Math.round(v / st) * st;
  let t;
  let guard = 0;
  do {
    // a ≠ 0 and |a| ≥ 0.5 so the target is unambiguously a parabola
    const aMag = snap(0.5 + Math.random() * 2.0, 0.25); // 0.5 … 2.5
    const a = +((Math.random() < 0.5 ? -1 : 1) * aMag).toFixed(2);
    const b = +snap(-5 + Math.random() * 10, 0.5).toFixed(1); // −5 … 5
    const c = +snap(-5 + Math.random() * 10, 0.5).toFixed(1); // −5 … 5
    t = { a, b, c };
  } while (
    ++guard < 400 &&
    (() => {
      // keep the vertex comfortably on-screen so every clue is visible
      const h = -t.b / (2 * t.a);
      const k = t.c - (t.b * t.b) / (4 * t.a);
      const offscreen = Math.abs(h) > 6 || k < WORLD.ymin + 1 || k > WORLD.ymax - 1;
      const sameAsStart = t.a === START.a && t.b === START.b && t.c === START.c;
      const sameAsPrev = prev && t.a === prev.a && t.b === prev.b && t.c === prev.c;
      return offscreen || sameAsStart || sameAsPrev;
    })()
  );
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation displays. Careful sign handling throughout.
   ------------------------------------------------------------------------- */
function StandardEquation({ a, b, c }) {
  if (Math.abs(a) < 1e-9) {
    // degenerate: a line y = b·x + c
    if (Math.abs(b) < 1e-9) {
      return <span>y&nbsp;=&nbsp;{trim(c)}</span>;
    }
    const bc = Math.abs(Math.abs(b) - 1) < 1e-9 ? (b < 0 ? MINUS : '') : trim(b);
    return (
      <span>
        y&nbsp;=&nbsp;{bc}x{Math.abs(c) < 1e-9 ? null : <>&nbsp;{c > 0 ? '+' : MINUS}&nbsp;{trim(Math.abs(c))}</>}
      </span>
    );
  }
  const aCoef = Math.abs(Math.abs(a) - 1) < 1e-9 ? (a < 0 ? MINUS : '') : trim(a);
  const bPart =
    Math.abs(b) < 1e-9 ? null : (
      <>
        &nbsp;{b > 0 ? '+' : MINUS}&nbsp;
        {Math.abs(Math.abs(b) - 1) < 1e-9 ? '' : trim(Math.abs(b))}x
      </>
    );
  const cPart =
    Math.abs(c) < 1e-9 ? null : (
      <>
        &nbsp;{c > 0 ? '+' : MINUS}&nbsp;{trim(Math.abs(c))}
      </>
    );
  return (
    <span>
      y&nbsp;=&nbsp;{aCoef}x<sup>2</sup>
      {bPart}
      {cPart}
    </span>
  );
}

/* The same curve in VERTEX form y = a(x − h)² + k, via completing the square,
   with h and k shown as exact reduced fractions. Read-only, soft ink. */
function vertexFormStr(p) {
  const { ai, bi } = ints(p);
  if (ai === 0) return null;
  const aCoef = Math.abs(Math.abs(p.a) - 1) < 1e-9 ? (p.a < 0 ? MINUS : '') : trim(p.a);
  // h = −b/2a = −bi/ai ; the bracket is (x − h)
  const hStr = fmtFrac(-bi, ai);
  let squared;
  if (hStr === '0') squared = 'x²';
  else if (hStr.startsWith(MINUS)) squared = `(x + ${hStr.slice(1)})²`;
  else squared = `(x ${MINUS} ${hStr})²`;
  const kStr = fmtFrac(-(bi * bi - 2 * ai * ints(p).ci), 4 * ai); // k = −Δ = −dN/(4ai)
  let tail = '';
  if (kStr !== '0') {
    if (kStr.startsWith(MINUS)) tail = ` ${MINUS} ${kStr.slice(1)}`;
    else tail = ` + ${kStr}`;
  }
  return `y = ${aCoef}${squared}${tail}`;
}

/* Factored form y = a(x − r₁)(x − r₂), shown only when the roots are rational. */
function factoredFormStr(p, info) {
  if (info.linear || !info.rootsExact || info.rootCount === 0) return null;
  const aCoef = Math.abs(Math.abs(p.a) - 1) < 1e-9 ? (p.a < 0 ? MINUS : '') : trim(p.a);
  const factor = (rStr) => {
    if (rStr === '0') return 'x';
    if (rStr.startsWith(MINUS)) return `(x + ${rStr.slice(1)})`;
    return `(x ${MINUS} ${rStr})`;
  };
  if (info.rootCount === 1) return `y = ${aCoef}${factor(info.rootsStr[0])}²`;
  return `y = ${aCoef}${factor(info.rootsStr[0])}${factor(info.rootsStr[1])}`;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function QuadraticPolynomialLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [c, setC] = useState(START.c);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [tracing, setTracing] = useState(false);
  const [showSpread, setShowSpread] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // world-x under the pointer, or null
  const tracerRef = useRef(null); // world-x of the sweeping tracer, or null
  const sceneRef = useRef({});

  const params = { a, b, c };
  const current = STEPS[step];
  const info = analyze(params);

  // Keep a snapshot of everything the renderer needs, so draw() (a stable
  // callback) and the pointer/tracer handlers never read stale values.
  sceneRef.current = { a, b, c, calib: !!current.calib, target, showSpread };

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
    const p = { a: S.a, b: S.b, c: S.c };
    const I = analyze(p);

    ctx.clearRect(0, 0, W, H);

    /* soft paper label helper — a translucent backing so text stays legible */
    const paperLabel = (text, x, y, align, baseline, color) => {
      ctx.save();
      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      const tw = ctx.measureText(text).width;
      let bx = x;
      if (align === 'center') bx = x - tw / 2;
      else if (align === 'right') bx = x - tw;
      let by = y;
      if (baseline === 'middle') by = y - 8;
      else if (baseline === 'bottom') by = y - 16;
      ctx.fillStyle = 'rgba(251,251,248,0.85)';
      ctx.fillRect(bx - 4, by - 2, tw + 8, 18);
      ctx.fillStyle = color || '#1C2B3A';
      ctx.fillText(text, x, y);
      ctx.restore();
    };

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
       curve leaves the window (so the tall arms never draw a false top cap) */
    const plot = (fn, stroke, width, dash) => {
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.setLineDash(dash || []);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let pen = false;
      for (let px = 0; px <= W; px++) {
        const x = WORLD.xmin + (px / W) * (WORLD.xmax - WORLD.xmin);
        const y = fn(x);
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

    /* target curve (calibration only) — dashed grey, drawn under the accent */
    if (S.calib && S.target) {
      plot((x) => model(x, S.target), 'rgba(91,107,123,0.85)', 2, [7, 6]);
    }

    /* axis of symmetry: dashed vertical line through the vertex */
    if (!I.linear && I.hFloat >= WORLD.xmin && I.hFloat <= WORLD.xmax) {
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(91,107,123,0.55)';
      ctx.setLineDash([4, 5]);
      const X = Math.round(sx(I.hFloat)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
      ctx.stroke();
      ctx.restore();
    }

    /* the mathematical object — the one carmine accent */
    plot((x) => model(x, p), '#C81E4F', 2.75);

    /* y-intercept (0, c): a small filled carmine dot with a soft label.
       Skipped when b = 0, because then the y-intercept sits exactly on the
       vertex and its own label would just duplicate the vertex label. */
    if ((I.linear || I.bi !== 0) && S.c >= WORLD.ymin && S.c <= WORLD.ymax) {
      ctx.save();
      ctx.fillStyle = '#C81E4F';
      ctx.beginPath();
      ctx.arc(sx(0), sy(S.c), 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // label placed to the right, nudged so it never sits on the y-axis
      paperLabel(`(0, ${trim(S.c)})`, sx(0) + 9, sy(S.c) - 10, 'left', 'top', '#1C2B3A');
    }

    /* roots (x-intercepts) as open carmine circles on the x-axis */
    if (!I.linear && I.rootsFloat && I.rootsFloat.length) {
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#C81E4F';
      ctx.fillStyle = '#FBFBF8';
      for (const xr of I.rootsFloat) {
        if (xr < WORLD.xmin || xr > WORLD.xmax) continue;
        ctx.beginPath();
        ctx.arc(sx(xr), sy(0), 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    /* root-spread overlay (opt-in): shows the discriminant as a distance.
       roots = axis ± √Δ/(2|a|). A double arrow between the two roots labels
       that spread; Δ = 0 pinches it to a point; Δ < 0 leaves nothing to mark
       so we annotate the clear gap between the vertex and the axis instead. */
    if (S.showSpread && !I.linear) {
      const yAxis = sy(0);
      if (I.disc > 0) {
        const half = Math.sqrt(I.disc) / (2 * Math.abs(p.a)); // world half-spread
        const xl = I.hFloat - half;
        const xr = I.hFloat + half;
        const Xl = sx(Math.max(xl, WORLD.xmin));
        const Xr = sx(Math.min(xr, WORLD.xmax));
        const yBar = yAxis - 22;
        ctx.save();
        ctx.strokeStyle = 'rgba(200,30,79,0.75)';
        ctx.fillStyle = 'rgba(200,30,79,0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(Xl, yBar);
        ctx.lineTo(Xr, yBar);
        ctx.stroke();
        // small end ticks down to the axis
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(Xl, yBar);
        ctx.lineTo(Xl, yAxis);
        ctx.moveTo(Xr, yBar);
        ctx.lineTo(Xr, yAxis);
        ctx.moveTo(sx(I.hFloat), yBar);
        ctx.lineTo(sx(I.hFloat), yAxis);
        ctx.stroke();
        ctx.restore();
        paperLabel(
          `spread ±${trim(half)} = √Δ / (2|a|)`,
          (Xl + Xr) / 2,
          yBar - 4,
          'center',
          'bottom',
          '#C81E4F'
        );
      } else if (I.disc === 0) {
        paperLabel(
          'Δ = 0 · one double root on the vertex',
          sx(I.hFloat),
          yAxis + 22,
          'center',
          'top',
          '#C81E4F'
        );
      } else if (I.hFloat >= WORLD.xmin && I.hFloat <= WORLD.xmax) {
        // Δ < 0 : draw the clear gap from the axis (y=0) up/down to the vertex
        const Xv = sx(I.hFloat);
        const Yv = sy(I.kFloat);
        ctx.save();
        ctx.strokeStyle = 'rgba(91,107,123,0.7)';
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(Xv, yAxis);
        ctx.lineTo(Xv, Yv);
        ctx.stroke();
        ctx.restore();
        paperLabel('Δ < 0 · curve clears the axis', Xv, (yAxis + Yv) / 2, 'center', 'middle', '#5B6B7B');
      }
    }

    /* vertex marker + label. The label goes on the parabola's OPEN side —
       below an upward parabola, above a downward one — so it lands in the
       empty region and never collides with the rising arms. */
    if (!I.linear && I.hFloat >= WORLD.xmin && I.hFloat <= WORLD.xmax) {
      const vx = sx(I.hFloat);
      const vy = sy(I.kFloat);
      if (I.kFloat >= WORLD.ymin - 0.5 && I.kFloat <= WORLD.ymax + 0.5) {
        ctx.save();
        ctx.fillStyle = '#C81E4F';
        ctx.beginPath();
        ctx.arc(vx, vy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        const label = `(${I.vertexXStr}, ${I.vertexYStr})`;
        const opensUp = p.a > 0;
        const gap = 12;
        ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
        const half = ctx.measureText(label).width / 2 + 4;
        const lx = Math.min(Math.max(vx, half), W - half);
        const ly = opensUp ? vy + gap : vy - gap;
        paperLabel(label, lx, ly, 'center', opensUp ? 'top' : 'bottom', '#1C2B3A');
      }
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

    /* tracer: a point sweeping the curve, showing it as a locus of (x, f(x)) */
    const tx = tracerRef.current;
    if (tx != null) {
      const ty = model(tx, p);
      const X = sx(tx);
      const Y = sy(ty);
      if (ty >= WORLD.ymin - 1 && ty <= WORLD.ymax + 1) {
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

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [a, b, c, step, target, showSpread, draw]);

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
    const DURATION = 2600;
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
  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 'a') setA(v);
    else if (key === 'b') setB(v);
    else setC(v);
    if (tracing) setTracing(false); // a dial move ends any sweep
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
    setC(START.c);
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

  /* ---- derived display strings ------------------------------------------- */
  const vertexForm = vertexFormStr(params);
  const factoredForm = factoredFormStr(params, info);
  const rootCountLabel = info.linear
    ? 'a = 0 → not quadratic'
    : info.rootCount === 2
    ? 'two real roots'
    : info.rootCount === 1
    ? 'one double root'
    : 'no real roots';
  const discClass = info.linear
    ? 'na'
    : info.disc > 0
    ? 'two'
    : info.disc === 0
    ? 'one'
    : 'none';
  const rootsText = info.linear
    ? Math.abs(b) < 1e-9
      ? '—'
      : `x = ${info.rootsStr[0]} (a line)`
    : info.rootCount === 0
    ? 'none — the roots are complex'
    : info.rootCount === 1
    ? `x = ${info.rootsStr[0]} (double)`
    : `x = ${info.rootsStr[0]}  and  x = ${info.rootsStr[1]}${info.rootsExact ? '' : '  (≈)'}`;

  // spoken description for screen readers, kept in sync with the picture
  const spoken = info.linear
    ? `Degenerate case: a equals zero, so y equals ${trim(b)} x plus ${trim(c)}, a straight line.`
    : `Parabola y equals ${trim(a)} x squared ${b >= 0 ? 'plus' : 'minus'} ${trim(Math.abs(b))} x ${
        c >= 0 ? 'plus' : 'minus'
      } ${trim(Math.abs(c))}. It opens ${a > 0 ? 'upward' : 'downward'}. Vertex at ${info.vertexXStr}, ${
        info.vertexYStr
      }. Discriminant ${trim(info.disc)}, giving ${rootCountLabel}.`;

  return (
    <div className="qlab">
      <header className="head">
        <h1>The Quadratic Polynomial</h1>
        <p className="lede">
          Explore the parabola in{' '}
          <span className="mono">standard form, y = a·x²&nbsp;+&nbsp;b·x&nbsp;+&nbsp;c</span>. Each
          dial <em>is</em> one of the three coefficients, unlocking with the lesson — and the star of
          the show is the discriminant <span className="mono">Δ = b²&nbsp;&minus;&nbsp;4ac</span>,
          which decides how many times the curve meets the x-axis.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <StandardEquation a={a} b={b} c={c} />
            </p>
            {vertexForm && <p className="equation-sub mono">{vertexForm}</p>}
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
            <span className="hint mono">hover the graph to read a point</span>
          </div>

          {/* discriminant banner — the centerpiece, always visible */}
          <div className={'disc disc-' + discClass}>
            <div className="disc-eq mono">
              Δ = b² − 4ac ={' '}
              <strong>{info.linear ? '—' : trim(info.disc)}</strong>
            </div>
            <div className="disc-verdict">{rootCountLabel}</div>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">y-intercept</span>
              <span className="fact-v mono">(0, {trim(c)})</span>
            </div>
            <div className="fact">
              <span className="fact-k">Axis of symmetry</span>
              <span className="fact-v mono">
                {info.linear ? '—' : `x = ${info.axisStr}`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Vertex</span>
              <span className="fact-v mono">
                {info.linear ? '—' : `(${info.vertexXStr}, ${info.vertexYStr})`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Opens</span>
              <span className="fact-v">
                {info.linear
                  ? 'a line (a = 0)'
                  : a > 0
                  ? 'up · vertex is the minimum'
                  : 'down · vertex is the maximum'}
              </span>
            </div>
            <div className="fact wide">
              <span className="fact-k">Roots (x-intercepts)</span>
              <span className="fact-v mono">{rootsText}</span>
            </div>
            {factoredForm && (
              <div className="fact wide">
                <span className="fact-k">Factored form</span>
                <span className="fact-v mono">{factoredForm}</span>
              </div>
            )}
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (showSpread ? ' on' : '')}
              onClick={() => setShowSpread((s) => !s)}
              aria-pressed={showSpread}
            >
              {showSpread ? 'Root spread ✓' : 'Show root spread'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (tracing ? ' on' : '')}
              onClick={() => setTracing((t) => !t)}
              aria-pressed={tracing}
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
            {PARAMS.map((d) => {
              const unlocked = step >= d.unlock;
              const val = { a, b, c }[d.key];
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
                    aria-label={`Coefficient ${d.label} — ${d.role}`}
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
                  <span className="mono target-hint">target: a = ?, b = ?, c = ?</span>
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
                  setShowSpread(false);
                  resetDials();
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* polite live region: announces the calibration win to screen readers */}
      <p className="sr-only" aria-live="polite">
        {current.calib && calibrated ? 'Calibrated. Your curve matches the target.' : ''}
      </p>

      <footer className="foot">
        <span className="mono">y = a·x² + b·x + c</span> &nbsp;·&nbsp; standard form of the quadratic
        polynomial, plotted live from its three coefficients on a 16×16 quadrille window. Every
        vertex, axis, and rational root above is computed with exact integer arithmetic.
      </footer>

      <style jsx>{`
        .qlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --quad: #c7d8e4;
          --ok: #1f8a5b;
          --gold: #b7791f;
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
        .disc {
          margin: 14px auto 2px;
          width: min(100%, 560px);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 9px 14px;
          border-radius: 9px;
          border: 1px solid rgba(28, 43, 58, 0.14);
          background: var(--paper);
          transition: border-color 0.15s, background 0.15s;
        }
        .disc-eq {
          font-size: 14px;
          font-variant-numeric: tabular-nums;
        }
        .disc-eq strong {
          font-size: 16px;
        }
        .disc-verdict {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 3px 9px;
          border-radius: 20px;
        }
        .disc-two {
          border-color: rgba(200, 30, 79, 0.5);
          background: rgba(200, 30, 79, 0.06);
        }
        .disc-two .disc-verdict {
          color: var(--curve);
          background: rgba(200, 30, 79, 0.12);
        }
        .disc-one {
          border-color: rgba(183, 121, 31, 0.5);
          background: rgba(183, 121, 31, 0.07);
        }
        .disc-one .disc-verdict {
          color: var(--gold);
          background: rgba(183, 121, 31, 0.14);
        }
        .disc-none {
          border-color: rgba(91, 107, 123, 0.4);
          background: rgba(91, 107, 123, 0.07);
        }
        .disc-none .disc-verdict {
          color: var(--ink-soft);
          background: rgba(91, 107, 123, 0.14);
        }
        .disc-na .disc-verdict {
          color: var(--ink-soft);
          background: rgba(91, 107, 123, 0.1);
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
        :global(.qlab) :focus-visible {
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
