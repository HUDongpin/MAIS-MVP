'use client';

/* ============================================================================
   CotangentFunctionLab — an interactive "bench" for the cotangent function
   in transformed form,  y = A·cot(B(x − C)) + D.

   Built for MAIS (math AI system, www.mais.hk), K-12 (Algebra 2 / Precalculus).
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   Why cotangent is a good demo of the engine's reach: unlike the parabola it
   is (1) PERIODIC and (2) has VERTICAL ASYMPTOTES where it runs off to ±∞.
   Both are handled by the same spine — a pure model + a per-pixel plotter that
   breaks the path at the asymptotes so no false vertical bars are drawn.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/CotangentFunctionLab.jsx
     2. Import and render it:
          import CotangentFunctionLab from './CotangentFunctionLab';
          export default function Page() { return <CotangentFunctionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (A, B, C, D, step).
     MODEL  — f(x) is pure math; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

const PI = Math.PI;

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. A wide window (−2π … 2π) so several full
   branches show; y kept modest (−4 … 4) since cotangent is unbounded and the
   window simply clips the tall parts. x grid every π/4, y grid every 1.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -2 * PI, xmax: 2 * PI, ymin: -4, ymax: 4 };

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Each dial names the letter it drives, its range/step,
   and the lesson step at which it unlocks. C is a horizontal shift measured in
   radians and stepped by π/4 so the axis stays in clean multiples of π.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'A', label: 'A', min: -3, max: 3, step: 0.5, unlock: 1, role: 'vertical stretch & flip' },
  { key: 'B', label: 'B', min: 0.5, max: 3, step: 0.5, unlock: 2, role: 'period  =  π ⁄ B' },
  { key: 'C', label: 'C', min: -PI / 2, max: PI / 2, step: PI / 4, unlock: 3, role: 'left / right shift' },
  { key: 'D', label: 'D', min: -3, max: 3, step: 0.5, unlock: 4, role: 'up / down shift (midline)' },
];
const START = { A: 1, B: 1, C: 0, D: 0 };

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.  y = A·cot(B(x − C)) + D
   cot(θ) = cos(θ)/sin(θ). At an asymptote sin(θ)=0 so this returns ±Infinity —
   the renderer and the meter both handle that, so the model stays this simple.
   ------------------------------------------------------------------------- */
function model(x, p) {
  const theta = p.B * (x - p.C);
  return p.A * (Math.cos(theta) / Math.sin(theta)) + p.D;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the cotangent',
    body:
      'Cotangent is the cosine-over-sine ratio: cot(x) = cos(x) ⁄ sin(x) = 1 ⁄ tan(x). ' +
      'Wherever sin(x) = 0 the denominator vanishes and the curve shoots off to ±∞ — those ' +
      'are the dashed vertical asymptotes. Between each pair of asymptotes the basic curve ' +
      'falls smoothly from +∞ down to −∞. Right now A = 1, B = 1, C = 0, D = 0, so you are ' +
      'looking at plain y = cot(x).',
    q: 'y = cot(x) is undefined wherever sin(x) = 0. At which x-values are its vertical asymptotes?',
    choices: [
      'Every multiple of π:  …, −π, 0, π, 2π, …',
      'Only at x = 0',
      'At the odd multiples of π⁄2:  π⁄2, 3π⁄2, …',
    ],
    answer: 0,
    feedback:
      'sin(x) = 0 at every multiple of π, so the asymptotes sit at x = …, −π, 0, π, 2π, … ' +
      'The odd multiples of π⁄2 are the opposite — that is where cos(x) = 0, so cot(x) = 0 ' +
      'there (the x-intercepts). Careful: those π⁄2 points are exactly where TANGENT has its ' +
      'asymptotes. Cotangent and tangent trade places.',
  },
  {
    title: 'A — vertical stretch & flip',
    body:
      'The A dial is now live. cotangent has no amplitude — it never levels off at a maximum — ' +
      'so A is a vertical stretch that makes each branch steeper or gentler. Watch what its ' +
      'sign does to the direction of the fall.',
    q: 'With A = 1 each branch falls (decreasing). What happens to every branch when A becomes negative?',
    choices: [
      'They flip to rise (increasing) instead',
      'They slide downward by A',
      'They get taller but keep falling',
    ],
    answer: 0,
    feedback:
      'A negative A reflects the curve vertically, so every falling branch becomes a rising one. ' +
      'The size |A| sets the steepness of the fall (or rise). There is no “taller/shorter” limit ' +
      'to reach — cotangent already spans every height between one asymptote and the next.',
  },
  {
    title: 'B — the period',
    body:
      'Now the B dial is unlocked. B squeezes or stretches the graph horizontally, which changes ' +
      'how far apart the asymptotes sit — that spacing is the period.',
    q: 'y = cot(x) repeats every π. For y = cot(Bx), what is the period?',
    choices: ['π ⁄ B', '2π ⁄ B', 'π · B'],
    answer: 0,
    feedback:
      'The period is π ⁄ B. This is the big difference from sine and cosine, whose period is ' +
      '2π ⁄ B — cotangent (like tangent) already repeats after just π, so a larger B packs more ' +
      'branches into the same width. Every asymptote is exactly one period apart from the next.',
  },
  {
    title: 'C — the left/right shift',
    body:
      'The C dial slides the whole graph horizontally. C lives inside as (x − C), right next to x, ' +
      'and is stepped in quarter-π units so the axis stays clean.',
    q: 'Set C to +π⁄4. Which way does the entire graph — asymptotes and all — move?',
    choices: [
      'Right by π⁄4',
      'Left by π⁄4',
      'Up by π⁄4',
    ],
    answer: 0,
    feedback:
      'Because x appears as (x − C), a positive C shifts the graph to the RIGHT by C. The minus ' +
      'sign fools many students into guessing left. Every asymptote moves from x = n·(π⁄B) to ' +
      'x = C + n·(π⁄B) — the whole picture translates together.',
  },
  {
    title: 'D — the vertical shift & midline',
    body:
      'The last dial, D, lifts or lowers the entire curve. The dashed horizontal line is the ' +
      'midline y = D — the height each branch passes through at its center.',
    q: 'D moves the graph vertically. What is true of the dashed midline?',
    choices: [
      'It sits at y = D, and every branch crosses it at its center point',
      'It always stays at y = 0',
      'D changes how far apart the asymptotes are',
    ],
    answer: 0,
    feedback:
      'D raises or lowers everything by the same amount, and the midline y = D is where each ' +
      'branch crosses through its center (where the cot part equals 0). When D = 0 those centers ' +
      'land right on the x-axis, so they are the x-intercepts. D never touches the period or the ' +
      'asymptote spacing — only B does that.',
  },
  {
    title: 'Reading every feature',
    body:
      'All four dials are unlocked. Put them together: the asymptotes, the period, and the ' +
      'midline crossings can all be read straight off A, B, C, and D.',
    q: 'For y = A·cot(B(x − C)) + D, where are the vertical asymptotes?',
    choices: [
      'x = C + n·(π ⁄ B)  for every integer n',
      'x = C + n·(2π ⁄ B)',
      'x = C + n·π  only',
    ],
    answer: 0,
    feedback:
      'Asymptotes occur where the inside B(x − C) is a multiple of π, which solves to ' +
      'x = C + n·(π ⁄ B) — one every period. The midline crossings sit exactly halfway between ' +
      'them, at x = C + (π⁄2 + nπ) ⁄ B. A and D slide and stretch the curve but never move the ' +
      'asymptotes; only B (the period) and C (the shift) do.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery cotangent curve is drawn dashed in grey. Tune A, B, C, and D ' +
      'until your carmine curve lands exactly on top of it and the meter reads CALIBRATED. Line up ' +
      'the asymptotes first (that fixes B and C), then match the steepness and height (A and D). ' +
      'Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. Cotangent is unbounded, so raw RMS would be dominated
   by the asymptotes. We CLAMP each curve's value into a band a little beyond
   the window before differencing: identical curves give 0 (they clamp to the
   same bound at a shared asymptote), while a mismatched asymptote — a wrong B
   or C — produces a large, honest penalty. A reciprocal mapping turns the RMS
   into a friendly 0–100 % reading. Constants tuned by numerical audit; see
   audit-cotangent.mjs (exact match → 0, one dial-step off → well under 60 %).
   ------------------------------------------------------------------------- */
const CLAMP = 6; // clamp each curve to [−6, 6] (window is ±4) before differencing
const SIN_EPS = 1e-4; // treat a sample as "on a pole" when |sin| is this small
function clampV(y) {
  if (!isFinite(y)) return y > 0 ? CLAMP : -CLAMP;
  return y < -CLAMP ? -CLAMP : y > CLAMP ? CLAMP : y;
}
function rmsError(p, t) {
  const N = 480;
  let s = 0;
  let count = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    // Skip any sample sitting on EITHER curve's asymptote. Exactly at a pole the
    // sign of the clamped value is decided by a machine-epsilon-sized difference,
    // so a sample that lands there would inject a spurious ±2·CLAMP residual and
    // make a genuinely-matched curve (dialed to the exact target) never calibrate
    // — the slider serializes π/4 to ~15 digits, not the full double.
    if (Math.abs(Math.sin(p.B * (x - p.C))) < SIN_EPS) continue;
    if (Math.abs(Math.sin(t.B * (x - t.C))) < SIN_EPS) continue;
    const d = clampV(model(x, p)) - clampV(model(x, t));
    s += d * d;
    count++;
  }
  return count ? Math.sqrt(s / count) : 0;
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.9)));
const MATCH_RMS = 0.05; // below this the curves are effectively identical -> CALIBRATED

const T_A = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2];
const T_B = [0.5, 1, 1.5]; // periods 2π, π, 2π/3 — spaced enough that no target aliases
const T_C = [-PI / 4, 0, PI / 4];
const T_D = [-2, -1, 0, 1, 2];
function makeTarget(prev) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  let t;
  do {
    t = { A: pick(T_A), B: pick(T_B), C: pick(T_C), D: pick(T_D) };
  } while (
    (prev && near(t.A, prev.A) && near(t.B, prev.B) && near(t.C, prev.C) && near(t.D, prev.D)) ||
    (near(t.A, START.A) && near(t.B, START.B) && near(t.C, START.C) && near(t.D, START.D))
  );
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−), trimmed decimals, and clean
   multiples of π for the x-axis, the C dial, and the period readout.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}
/* Express x as a clean multiple of π (e.g. −3π/2, π/4, 2π/3) when it is one,
   otherwise fall back to a decimal. Denominators up to 6 cover every value the
   dials and the world window can produce. */
function formatPiMultiple(x) {
  if (Math.abs(x) < 1e-9) return '0';
  const r = x / PI;
  for (let d = 1; d <= 6; d++) {
    const n = Math.round(r * d);
    if (n !== 0 && Math.abs(r - n / d) < 1e-6) {
      const g = gcd(n, d);
      const nn = n / g;
      const dd = d / g;
      const sign = nn < 0 ? MINUS : '';
      const a = Math.abs(nn);
      const num = a === 1 ? 'π' : a + 'π';
      return dd === 1 ? sign + num : sign + num + '/' + dd;
    }
  }
  return trim(x);
}

/* EDIT 5 — Equation display.  y = A·cot(B(x − C)) + D, with careful sign and
   "drop the 1" handling so it always reads the way a textbook would. */
function argString(B, C) {
  const bPart = Math.abs(B - 1) < 1e-9 ? '' : trim(B);
  if (Math.abs(C) < 1e-9) return bPart === '' ? 'x' : bPart + 'x';
  const inside = 'x ' + (C > 0 ? MINUS : '+') + ' ' + formatPiMultiple(Math.abs(C));
  return bPart === '' ? inside : bPart + '(' + inside + ')';
}
function equationString(A, B, C, D) {
  if (Math.abs(A) < 1e-9) return 'y = ' + (Math.abs(D) < 1e-9 ? '0' : trim(D)); // A=0 → flat line
  const absA = Math.abs(A);
  const coef = Math.abs(absA - 1) < 1e-9 ? (A < 0 ? MINUS : '') : trim(A) + ' ';
  let s = 'y = ' + coef + 'cot(' + argString(B, C) + ')';
  if (Math.abs(D) > 1e-9) s += (D > 0 ? ' + ' : ' ' + MINUS + ' ') + trim(Math.abs(D));
  return s;
}
/* A plain-language version for screen readers. */
function spokenEquation(A, B, C, D) {
  if (Math.abs(A) < 1e-9) return `y equals ${trim(D)}, a horizontal line`;
  const parts = [];
  parts.push(`y equals ${Math.abs(Math.abs(A) - 1) < 1e-9 ? (A < 0 ? 'negative ' : '') : trim(A) + ' times '}cotangent of`);
  parts.push(`${Math.abs(B - 1) < 1e-9 ? '' : trim(B) + ' times '}open parenthesis x ${
    Math.abs(C) < 1e-9 ? '' : (C > 0 ? 'minus ' : 'plus ') + formatPiMultiple(Math.abs(C))
  } close parenthesis`);
  if (Math.abs(D) > 1e-9) parts.push(`${D > 0 ? 'plus' : 'minus'} ${trim(Math.abs(D))}`);
  return parts.join(' ');
}

/* Period, asymptote spacing, and behavior described for the facts panel. */
function periodString(B) {
  return formatPiMultiple(PI / B);
}
function asymptoteString(B, C) {
  const per = periodString(B);
  return Math.abs(C) < 1e-9 ? `x = n · ${per}` : `x = ${formatPiMultiple(C)} + n · ${per}`;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function CotangentFunctionLab() {
  const [A, setA] = useState(START.A);
  const [B, setB] = useState(START.B);
  const [C, setC] = useState(START.C);
  const [D, setD] = useState(START.D);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [tracing, setTracing] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // world-x under the pointer, or null
  const tracerRef = useRef(null); // world-x of the sweeping tracer, or null
  const sceneRef = useRef({});

  const params = { A, B, C, D };
  const current = STEPS[step];

  // Keep a snapshot of everything the renderer needs, so draw() (a stable
  // callback) and the pointer/tracer handlers never read stale values.
  sceneRef.current = { A, B, C, D, calib: !!current.calib, target };

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
    const p = { A: S.A, B: S.B, C: S.C, D: S.D };
    const live = Math.abs(p.A) > 1e-9; // is there a real cotangent to describe?

    ctx.clearRect(0, 0, W, H);

    /* minor grid — verticals every π/4 (quadrille), horizontals every 1 */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.85)';
    ctx.beginPath();
    for (let k = Math.ceil(WORLD.xmin / (PI / 4)); k <= WORLD.xmax / (PI / 4) + 1e-6; k++) {
      const X = Math.round(sx(k * (PI / 4))) + 0.5;
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

    /* x tick labels every π/2, in clean multiples of π */
    ctx.fillStyle = 'rgba(91,107,123,0.95)';
    ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let k = Math.ceil(WORLD.xmin / (PI / 2)); k <= WORLD.xmax / (PI / 2) + 1e-6; k++) {
      const xv = k * (PI / 2);
      if (k === 0 || xv <= WORLD.xmin + 1e-6 || xv >= WORLD.xmax - 1e-6) continue;
      ctx.fillText(formatPiMultiple(xv), sx(xv), sy(0) + 4);
    }
    /* y tick labels every 2 */
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let gy = Math.ceil(WORLD.ymin / 2) * 2; gy <= WORLD.ymax; gy += 2) {
      if (gy === 0 || gy <= WORLD.ymin || gy >= WORLD.ymax) continue;
      ctx.fillText(String(gy), sx(0) - 6, sy(gy));
    }

    /* per-pixel plotter with a DOUBLE-GUARDED asymptote break, so the tall
       near-asymptote parts never draw a false vertical bar:
         (1) lift the pen when the value leaves the (padded) window, and
         (2) lift it when two in-window samples jump more than 60% of the canvas
             height between them — a branch crossing a pole.
       Guard (1) alone is not enough on a narrow canvas with a gentle, fast
       function (small |A|, large B): the pixel step can straddle the whole
       blow-up zone so no sample lands out of band, and the two branches would
       be joined by a near-full-height vertical line. Guard (2) catches exactly
       that case. */
    const plot = (fn, stroke, width, dash) => {
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.setLineDash(dash || []);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let pen = false;
      let prevY = 0;
      for (let px = 0; px <= W; px++) {
        const x = WORLD.xmin + (px / W) * (WORLD.xmax - WORLD.xmin);
        const y = fn(x);
        if (!isFinite(y) || y < WORLD.ymin - 0.5 || y > WORLD.ymax + 0.5) {
          pen = false;
          continue;
        }
        const X = sx(x);
        const Y = sy(y);
        if (!pen || Math.abs(Y - prevY) > 0.6 * H) {
          ctx.moveTo(X, Y);
          pen = true;
        } else {
          ctx.lineTo(X, Y);
        }
        prevY = Y;
      }
      ctx.stroke();
      ctx.restore();
    };

    /* the vertical asymptotes: x = C + n·(π/B) — dashed, drawn under everything */
    const drawAsymptotes = (q, stroke) => {
      if (Math.abs(q.A) < 1e-9) return;
      const per = PI / q.B;
      const n0 = Math.floor((WORLD.xmin - q.C) / per) - 1;
      const n1 = Math.ceil((WORLD.xmax - q.C) / per) + 1;
      ctx.save();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = stroke;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      for (let n = n0; n <= n1; n++) {
        const xa = q.C + n * per;
        if (xa < WORLD.xmin - 1e-9 || xa > WORLD.xmax + 1e-9) continue;
        const X = Math.round(sx(xa)) + 0.5;
        ctx.moveTo(X, 0);
        ctx.lineTo(X, H);
      }
      ctx.stroke();
      ctx.restore();
    };

    /* target curve (calibration only): its own faint asymptotes + dashed curve */
    if (S.calib && S.target) {
      drawAsymptotes(S.target, 'rgba(91,107,123,0.35)');
      plot((x) => model(x, S.target), 'rgba(91,107,123,0.85)', 2, [7, 6]);
    }

    /* the live curve's asymptotes */
    drawAsymptotes(p, 'rgba(200,30,79,0.35)');

    /* midline y = D — dashed, the height each branch crosses through */
    if (live && p.D >= WORLD.ymin && p.D <= WORLD.ymax) {
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(91,107,123,0.55)';
      ctx.setLineDash([4, 5]);
      const Y = Math.round(sy(p.D)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
      ctx.stroke();
      ctx.restore();
    }

    /* the mathematical object — the one carmine accent */
    plot((x) => model(x, p), '#C81E4F', 2.75);

    /* midline crossings: x = C + (π/2 + nπ)/B, marked where the branch meets y = D */
    if (live && p.D >= WORLD.ymin && p.D <= WORLD.ymax) {
      const per = PI / p.B;
      const first = p.C + (PI / 2) / p.B;
      const n0 = Math.floor((WORLD.xmin - first) / per) - 1;
      const n1 = Math.ceil((WORLD.xmax - first) / per) + 1;
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#C81E4F';
      ctx.fillStyle = '#FBFBF8';
      for (let n = n0; n <= n1; n++) {
        const xc = first + n * per;
        if (xc < WORLD.xmin || xc > WORLD.xmax) continue;
        ctx.beginPath();
        ctx.arc(sx(xc), sy(p.D), 4, 0, PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    /* hover readout: a dot on the curve + its coordinates (or an asymptote note) */
    const hx = hoverRef.current;
    if (hx != null && live) {
      const hy = model(hx, p);
      const X = sx(hx);
      let txt;
      let dotY = null;
      if (!isFinite(hy) || Math.abs(hy) > 40) {
        txt = `x=${hx.toFixed(2)}  →  ±∞ (near asymptote)`;
      } else {
        txt = `(${hx.toFixed(2)}, ${hy.toFixed(2)})`;
        if (hy >= WORLD.ymin && hy <= WORLD.ymax) dotY = sy(hy);
      }
      ctx.save();
      if (dotY != null) {
        ctx.strokeStyle = 'rgba(28,43,58,0.28)';
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(X, sy(0));
        ctx.lineTo(X, dotY);
        ctx.moveTo(sx(0), dotY);
        ctx.lineTo(X, dotY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#1C2B3A';
        ctx.beginPath();
        ctx.arc(X, dotY, 3.5, 0, PI * 2);
        ctx.fill();
      }
      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(txt).width;
      const bx = Math.min(Math.max(X + 8, 4), W - tw - 12);
      const by = Math.max((dotY != null ? dotY : sy(0)) - 26, 4);
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(bx - 4, by - 2, tw + 8, 18);
      ctx.fillStyle = '#1C2B3A';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(txt, bx, by);
      ctx.restore();
    }

    /* tracer: a point sweeping the curve, showing it as a locus of (x, f(x)) */
    const tx = tracerRef.current;
    if (tx != null && live) {
      const ty = model(tx, p);
      if (isFinite(ty) && ty >= WORLD.ymin && ty <= WORLD.ymax) {
        const X = sx(tx);
        const Y = sy(ty);
        ctx.save();
        ctx.strokeStyle = 'rgba(200,30,79,0.4)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(X, sy(p.D));
        ctx.lineTo(X, Y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#C81E4F';
        ctx.beginPath();
        ctx.arc(X, Y, 5.5, 0, PI * 2);
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
  }, [A, B, C, D, step, target, draw]);

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
    const DURATION = 3200;
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
    if (key === 'A') setA(v);
    else if (key === 'B') setB(v);
    else if (key === 'C') setC(v);
    else setD(v);
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
    setA(START.A);
    setB(START.B);
    setC(START.C);
    setD(START.D);
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

  const dialVal = { A, B, C, D };
  const live = Math.abs(A) > 1e-9;

  return (
    <div className="clab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Cotangent Function</h1>
        <p className="lede">
          Explore{' '}
          <span className="mono">
            y = A·cot(B(x&nbsp;&minus;&nbsp;C))&nbsp;+&nbsp;D
          </span>
          . Each dial unlocks with the lesson, so you meet one idea at a time — the asymptotes, the
          period, the shifts — and finish by calibrating your curve onto a mystery target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">{equationString(A, B, C, D)}</p>
            <p className="equation-sub mono">cot θ = cos θ ⁄ sin θ = 1 ⁄ tan θ</p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            <canvas ref={canvasRef} aria-label={`Graph of ${spokenEquation(A, B, C, D)}`} />
            <span className="hint mono">hover the graph to read a point</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spokenEquation(A, B, C, D)}. {calibrated ? 'Calibrated — the curve matches the target.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Period</span>
              <span className="fact-v mono">{live ? periodString(B) : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Asymptotes</span>
              <span className="fact-v mono">{live ? asymptoteString(B, C) : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Midline</span>
              <span className="fact-v mono">{live ? `y = ${trim(D)}` : `y = ${trim(D)}`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Each branch</span>
              <span className="fact-v">
                {!live ? 'flat line (A = 0)' : A > 0 ? 'falls · decreasing' : 'rises · increasing'}
              </span>
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
            {PARAMS.map((d) => {
              const unlocked = step >= d.unlock;
              const val = dialVal[d.key];
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
                  <output className="dv">
                    {unlocked ? (d.key === 'C' ? formatPiMultiple(val) : trim(val)) : '🔒'}
                  </output>
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
              <div
                className="meter"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pct)}
                aria-label="Calibration match"
              >
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">line up the dashed curve</span>
                )}
              </div>
              {calibrated && (
                <p className="calib-reveal mono">target was {equationString(target.A, target.B, target.C, target.D)}</p>
              )}
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
        <span className="mono">y = A·cot(B(x − C)) + D</span> &nbsp;·&nbsp; the cotangent function,
        plotted live from the dials. Period <span className="mono">π ⁄ B</span>, asymptotes every
        period where <span className="mono">sin</span> hits zero.
      </footer>

      <style jsx>{`
        .clab {
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
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          color: var(--curve);
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 2;
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
          grid-template-columns: 22px 1fr 52px;
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
        .calib-reveal {
          margin: 0;
          font-size: 12.5px;
          color: var(--ok);
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
        :global(.clab) :focus-visible {
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
