'use client';

/* ============================================================================
   SecantFunctionLab — an interactive "bench" for the secant function,
       y = a · sec( b (x − c) ) + d,   where  sec θ = 1 / cos θ.

   Built for MAIS (math AI system, www.mais.hk), K-12 (Precalculus / Trig).
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   The idea this bench teaches: secant is the RECIPROCAL of cosine. A faint
   blue guide cosine is drawn behind the carmine secant so the student can see,
   directly, why the two curves kiss where cosine reaches ±1, and why secant
   flies off to ±∞ (a vertical asymptote) wherever cosine crosses zero.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/SecantFunctionLab.jsx
     2. Import and render it:
          import SecantFunctionLab from './SecantFunctionLab';
          export default function Page() { return <SecantFunctionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, c, d, step).
     MODEL  — f(x) is pure math; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

const PI = Math.PI;

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. x runs −2π … 2π (two full periods of the base
   curve); y runs −6 … 6 so the branch turning points (at d ± |a|) sit clear of
   the edges while the arms are free to shoot past toward ±∞. x grid every π/2,
   y grid every 1; x labelled in multiples of π.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -2 * PI, xmax: 2 * PI, ymin: -6, ymax: 6 };

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Each dial names the letter it drives, its range/step,
   and the lesson step at which it unlocks. a is kept positive so every state
   the student can reach is a well-formed secant graph (no 0/0 at a = 0).
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'a', label: 'a', min: 0.5, max: 2.5, step: 0.25, unlock: 1, role: 'vertical stretch' },
  { key: 'b', label: 'b', min: 0.5, max: 2.5, step: 0.25, unlock: 2, role: 'period = 2π / b' },
  { key: 'c', label: 'c', min: -1.5, max: 1.5, step: 0.25, unlock: 3, role: 'left / right shift' },
  { key: 'd', label: 'd', min: -2, max: 2, step: 0.5, unlock: 4, role: 'midline (up / down)' },
];
const START = { a: 1, b: 1, c: 0, d: 0 };

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.
     f(x)     = a · sec(b(x − c)) + d  =  a / cos(b(x − c)) + d
     guide(x) = a · cos(b(x − c)) + d   — the reciprocal partner (bounded)
   Working through cos keeps asymptote detection exact: cos = 0 ⟺ asymptote.
   ------------------------------------------------------------------------- */
function model(x, p) {
  return p.a / Math.cos(p.b * (x - p.c)) + p.d;
}
function guide(x, p) {
  return p.a * Math.cos(p.b * (x - p.c)) + p.d;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the secant',
    body:
      'The secant is defined as the reciprocal of cosine: sec(x) = 1 ⁄ cos(x). ' +
      'The faint blue curve is cosine; the carmine curve is its reciprocal, secant. ' +
      'Where cosine equals 1 or −1, its reciprocal is also 1 or −1, so the two curves ' +
      'touch. Where cosine equals 0 you cannot divide by zero — so secant races off to ' +
      '±∞, leaving a vertical asymptote (the dashed lines).',
    q: 'Right now you are looking at y = sec(x). Since cos(0) = 1, what is sec(0)?',
    choices: ['1', '0', 'undefined'],
    answer: 0,
    feedback:
      'sec(0) = 1 ⁄ cos(0) = 1 ⁄ 1 = 1 — the bottom of the U-shaped branch that sits on ' +
      'cosine’s peak. And because |cos x| ≤ 1 always, its reciprocal always has ' +
      '|sec x| ≥ 1: the curve never enters the open band between y = −1 and y = 1.',
  },
  {
    title: 'a — vertical stretch',
    body:
      'The a dial stretches the secant vertically. It multiplies every value, pushing the ' +
      'turning point of each branch farther from the midline. (Keep d = 0 for now.)',
    q: 'With d = 0 the branches turn around at y = 1 and y = −1. Set a = 2. Where do they turn now?',
    choices: ['y = 2 and y = −2', 'y = 1 and y = −1, unchanged', 'y = 0.5 and y = −0.5'],
    answer: 0,
    feedback:
      'Multiplying by a scales the turning points to y = ± a (measured from the midline, ' +
      '± |a|). The forbidden band the curve can never enter widens to (−a, a) — its width ' +
      'is 2|a|. This is the secant’s echo of a sine wave’s amplitude, except secant has no ' +
      'maximum, only these turning points.',
  },
  {
    title: 'b — the period',
    body:
      'The b dial sets how often the pattern repeats. The period — the horizontal length of ' +
      'one full cycle — is 2π ⁄ |b|. A larger b squeezes the branches, and their asymptotes, ' +
      'closer together.',
    q: 'The base curve y = sec(x) has b = 1 and period 2π. Set b = 2. What is the new period?',
    choices: ['π', '4π', '2π, unchanged'],
    answer: 0,
    feedback:
      'Period = 2π ⁄ |b| = 2π ⁄ 2 = π. The asymptotes mark cosine’s zeros, and they sit exactly ' +
      'half a period apart — a spacing of π ⁄ |b| — so raising b packs more branches into the ' +
      'same window. b is the horizontal counterpart to the vertical stretch a.',
  },
  {
    title: 'c — the horizontal shift',
    body:
      'The c dial slides the whole graph left or right without changing its shape. Because c ' +
      'sits inside, as (x − c), the graph shifts the SAME direction as c: a positive c moves it ' +
      'to the right.',
    q: 'Increase c from 0 up to about 1.5. Which way does the whole graph slide?',
    choices: ['Right', 'Left', 'Straight up'],
    answer: 0,
    feedback:
      'Because x appears as (x − c), a positive c shifts the graph right by c units — the classic ' +
      '“subtract inside, move right.” The shape, period, and range are untouched; only the ' +
      'position changes. A shift of one whole period, 2π ⁄ |b|, would land the graph right back ' +
      'on top of itself.',
  },
  {
    title: 'd — the midline',
    body:
      'The last dial, d, lifts or lowers the entire graph. It moves the midline — the line ' +
      'y = d that the branches straddle — and carries the whole picture with it.',
    q: 'Set a = 1 and d = 2. The turning points were at y = 1 and y = −1. Where are they now?',
    choices: ['y = 3 and y = 1', 'y = 2 and y = −2', 'y = 1 and y = −1, unchanged'],
    answer: 0,
    feedback:
      'd shifts everything up by 2, so the turning points move from ±1 to d ± 1 = 3 and 1, and ' +
      'the forbidden band becomes (1, 3) — still centred on the new midline y = d = 2. d never ' +
      'changes the shape or the positions of the asymptotes, only the height.',
  },
  {
    title: 'Asymptotes, range & symmetry',
    body:
      'You control all four dials now. Two features form the secant’s skeleton: the vertical ' +
      'asymptotes (where the guide cosine crosses the midline) and the forbidden band (the gap ' +
      'the curve never enters).',
    q: 'For y = a·sec(b(x − c)) + d, what is true of EVERY point on the graph?',
    choices: [
      'Its distance from the midline y = d is at least |a|',
      'It lies between y = d − |a| and y = d + |a|',
      'It crosses the x-axis exactly once per branch',
    ],
    answer: 0,
    feedback:
      'Every point satisfies |y − d| ≥ |a|: the curve stays at least |a| away from the midline, ' +
      'which is exactly why the open band (d − |a|, d + |a|) is forbidden. The base secant is ' +
      'also even — sec(−x) = sec(x) — so the untransformed curve is a mirror image across the ' +
      'y-axis.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery secant is drawn as a dashed grey curve. Tune a, b, c, and d ' +
      'until your carmine curve lands exactly on top of it and the meter reads CALIBRATED. ' +
      'Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. Two secants coincide exactly when their GUIDE COSINES
   coincide (a, b, c, d are all recoverable from the bounded cosine), so we
   measure the match on the guide cosine instead of the secant. That is
   mathematically equivalent but numerically stable — cosine never blows up
   near an asymptote the way secant does, so the meter can’t be swamped.
   ------------------------------------------------------------------------- */
function rmsError(p, t) {
  const N = 240;
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    const dd = guide(x, p) - guide(x, t);
    s += dd * dd;
  }
  return Math.sqrt(s / (N + 1));
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.9)));
const MATCH_RMS = 0.05; // below this the curves are effectively identical -> CALIBRATED

function makeTarget(prev) {
  const snap = (v, st) => Math.round(v / st) * st;
  let t;
  do {
    const a = +snap(0.75 + Math.random() * 1.5, 0.25).toFixed(2); // 0.75 … 2.25
    const b = +snap(0.5 + Math.random() * 1.5, 0.5).toFixed(2); //  0.5, 1, 1.5, 2
    const c = +snap(-1 + Math.random() * 2, 0.25).toFixed(2); //   −1 … 1
    const d = +snap(-1.5 + Math.random() * 3, 0.5).toFixed(2); //  −1.5 … 1.5
    t = { a, b, c, d };
  } while (
    (prev && t.a === prev.a && t.b === prev.b && t.c === prev.c && t.d === prev.d) ||
    (t.a === START.a && t.b === START.b && t.c === START.c && t.d === START.d)
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

/* EDIT 5 — Equation display. Builds the argument b(x − c) once, shared by both
   the secant form and its reciprocal (1/cos) form. Careful sign handling. */
function innerArg(b, c) {
  const base = c === 0 ? 'x' : `x ${c > 0 ? MINUS : '+'} ${trim(Math.abs(c))}`;
  if (Math.abs(b - 1) < 1e-9) return base; // b = 1: drop the coefficient
  const bc = trim(b);
  return c === 0 ? `${bc}x` : `${bc}(${base})`;
}
function secantForm(a, b, c, d) {
  const coef = Math.abs(a - 1) < 1e-9 ? '' : `${trim(a)} `;
  let s = `y = ${coef}sec(${innerArg(b, c)})`;
  if (Math.abs(d) > 1e-9) s += ` ${d > 0 ? '+' : MINUS} ${trim(Math.abs(d))}`;
  return s;
}
function reciprocalForm(a, b, c, d) {
  const num = Math.abs(a - 1) < 1e-9 ? '1' : trim(a);
  let s = `y = ${num} / cos(${innerArg(b, c)})`;
  if (Math.abs(d) > 1e-9) s += ` ${d > 0 ? '+' : MINUS} ${trim(Math.abs(d))}`;
  return s;
}
function spokenForm(a, b, c, d) {
  const A = Math.abs(a - 1) < 1e-9 ? '' : `${trim(a)} times `;
  const B = Math.abs(b - 1) < 1e-9 ? '' : `${trim(b)} times `;
  const arg = c === 0 ? 'x' : `open bracket x ${c > 0 ? 'minus' : 'plus'} ${trim(Math.abs(c))} close bracket`;
  const D = Math.abs(d) < 1e-9 ? '' : `, ${d > 0 ? 'plus' : 'minus'} ${trim(Math.abs(d))}`;
  return `y equals ${A}secant of ${B}${arg}${D}. Period ${(2 * PI / b).toFixed(2)}. ` +
    `Vertical asymptotes where the cosine is zero.`;
}
/* Period / asymptote-spacing strings, with b = 1 shown cleanly as "2π" / "π". */
function periodStr(b) {
  const exact = Math.abs(b - 1) < 1e-9 ? '2π' : `2π / ${trim(b)}`;
  return `${exact} ≈ ${(2 * PI / b).toFixed(2)}`;
}
function spacingStr(b) {
  const exact = Math.abs(b - 1) < 1e-9 ? 'π' : `π / ${trim(b)}`;
  return `${exact} ≈ ${(PI / b).toFixed(2)}`;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function SecantFunctionLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [c, setC] = useState(START.c);
  const [d, setD] = useState(START.d);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [tracing, setTracing] = useState(false);
  const [showCosine, setShowCosine] = useState(true);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // world-x under the pointer, or null
  const tracerRef = useRef(null); // world-x of the sweeping tracer, or null
  const sceneRef = useRef({});

  const params = { a, b, c, d };
  const current = STEPS[step];

  // Snapshot everything the renderer needs, so draw() (a stable callback) and
  // the pointer/tracer handlers never read stale values.
  sceneRef.current = { a, b, c, d, calib: !!current.calib, target, showCosine };

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
    const p = { a: S.a, b: S.b, c: S.c, d: S.d };

    ctx.clearRect(0, 0, W, H);

    /* forbidden band: the horizontal strip (d − a, d + a) the curve never enters */
    {
      const yTop = sy(p.d + p.a);
      const yBot = sy(p.d - p.a);
      ctx.fillStyle = 'rgba(28,43,58,0.045)';
      ctx.fillRect(0, yTop, W, yBot - yTop);
    }

    /* minor grid (quadrille paper): x every π/2, y every 1 */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.9)';
    ctx.beginPath();
    for (let n = Math.ceil(WORLD.xmin / (PI / 2)); n * (PI / 2) <= WORLD.xmax; n++) {
      const X = Math.round(sx(n * (PI / 2))) + 0.5;
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

    /* tick labels — x at multiples of π (π-notation), y at even integers */
    ctx.fillStyle = 'rgba(91,107,123,0.95)';
    ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textBaseline = 'top';
    for (let n = Math.ceil(WORLD.xmin / PI); n <= Math.floor(WORLD.xmax / PI); n++) {
      if (n === 0) continue;
      const label = (n === 1 ? '' : n === -1 ? MINUS : trim(n)) + 'π';
      const X = sx(n * PI);
      // keep the endpoint labels (−2π, 2π) fully on-canvas instead of clipping
      if (X < 12) ctx.textAlign = 'left';
      else if (X > W - 12) ctx.textAlign = 'right';
      else ctx.textAlign = 'center';
      const lx = X < 12 ? 3 : X > W - 12 ? W - 3 : X;
      ctx.fillText(label, lx, sy(0) + 4);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let gy = Math.ceil(WORLD.ymin / 2) * 2; gy <= WORLD.ymax; gy += 2) {
      if (gy === 0 || gy <= WORLD.ymin || gy >= WORLD.ymax) continue;
      ctx.fillText(trim(gy), sx(0) - 6, sy(gy));
    }

    /* midline y = d (dashed grey) */
    {
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(91,107,123,0.5)';
      ctx.setLineDash([4, 5]);
      const Y = Math.round(sy(p.d)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
      ctx.stroke();
      ctx.restore();
    }

    /* vertical asymptotes at x = c + (n + ½)·π/b — where cos(b(x − c)) = 0 */
    ctx.save();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(91,107,123,0.5)';
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    for (let n = -30; n <= 30; n++) {
      const xa = p.c + ((n + 0.5) * PI) / p.b;
      if (xa < WORLD.xmin || xa > WORLD.xmax) continue;
      const X = Math.round(sx(xa)) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    ctx.stroke();
    ctx.restore();

    /* a bounded plotter (for the guide cosine): break only at the window edge */
    const plotBounded = (fn, stroke, width) => {
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
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
        } else ctx.lineTo(X, Y);
      }
      ctx.stroke();
      ctx.restore();
    };

    /* the secant plotter: breaks the path at every asymptote (where cos changes
       sign between samples) AND at the window edge, so no false vertical line
       is ever drawn bridging −∞ to +∞ across an asymptote. */
    const plotSecant = (q, stroke, width, dash) => {
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.setLineDash(dash || []);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let pen = false;
      let prevCos = null;
      for (let px = 0; px <= W; px++) {
        const x = WORLD.xmin + (px / W) * (WORLD.xmax - WORLD.xmin);
        const cth = Math.cos(q.b * (x - q.c));
        if (prevCos !== null && Math.sign(cth) !== Math.sign(prevCos)) pen = false; // asymptote crossed
        prevCos = cth;
        const y = q.a / cth + q.d;
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

    /* guide cosine — the reciprocal partner, a muted blue helper (not the accent) */
    if (S.showCosine) {
      plotBounded((x) => guide(x, p), 'rgba(96,142,178,0.9)', 1.8);
    }

    /* target secant (calibration only) — dashed grey, drawn under the accent */
    if (S.calib && S.target) {
      plotSecant(S.target, 'rgba(91,107,123,0.85)', 2, [7, 6]);
    }

    /* the mathematical object — the one carmine accent */
    plotSecant(p, '#C81E4F', 2.75);

    /* turning points: where each branch kisses the guide cosine, at y = d ± a */
    {
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#C81E4F';
      ctx.fillStyle = '#FBFBF8';
      const mLo = Math.floor(((WORLD.xmin - p.c) * p.b) / PI) - 1;
      const mHi = Math.ceil(((WORLD.xmax - p.c) * p.b) / PI) + 1;
      for (let m = mLo; m <= mHi; m++) {
        const xt = p.c + (m * PI) / p.b;
        if (xt < WORLD.xmin || xt > WORLD.xmax) continue;
        const yt = p.d + p.a * (m % 2 === 0 ? 1 : -1); // cos(mπ) = (−1)^m
        if (yt < WORLD.ymin || yt > WORLD.ymax) continue;
        ctx.beginPath();
        ctx.arc(sx(xt), sy(yt), 3.6, 0, PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    /* hover readout: a dot on the curve + its coordinates (skipped near asymptotes) */
    const hx = hoverRef.current;
    if (hx != null) {
      const hy = model(hx, p);
      if (isFinite(hy) && hy >= WORLD.ymin && hy <= WORLD.ymax) {
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
        ctx.arc(X, Y, 3.5, 0, PI * 2);
        ctx.fill();
        const txt = `(${hx.toFixed(2)}, ${hy.toFixed(2)})`;
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

    /* tracer: a point sweeping the curve (hidden while it is off past an asymptote) */
    const tx = tracerRef.current;
    if (tx != null) {
      const ty = model(tx, p);
      if (isFinite(ty) && ty >= WORLD.ymin && ty <= WORLD.ymax) {
        const X = sx(tx);
        const Y = sy(ty);
        ctx.save();
        ctx.strokeStyle = 'rgba(200,30,79,0.4)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(X, sy(p.d));
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
  }, [a, b, c, d, step, target, showCosine, draw]);

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
    if (typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
    if (key === 'a') setA(v);
    else if (key === 'b') setB(v);
    else if (key === 'c') setC(v);
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
    setA(START.a);
    setB(START.b);
    setC(START.c);
    setD(START.d);
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

  return (
    <div className="slab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Secant Function</h1>
        <p className="lede">
          Explore <span className="mono">y = a·sec(b(x&nbsp;&minus;&nbsp;c))&nbsp;+&nbsp;d</span>, built on the
          idea that <span className="mono">sec&nbsp;x = 1⁄cos&nbsp;x</span>. The faint blue cosine is drawn
          behind the carmine secant so you can see why they touch — and where secant flies off to infinity.
          Each dial unlocks with the lesson; finish by calibrating your curve onto a mystery target.
        </p>
      </header>

      {/* accessibility: a spoken version of the current equation + a live calibration cue */}
      <p className="sr-only" aria-live="off">{spokenForm(a, b, c, d)}</p>
      <p className="sr-only" aria-live="polite">
        {calibrated ? 'Calibrated. Your curve matches the target.' : ''}
      </p>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">{secantForm(a, b, c, d)}</p>
            <p className="equation-sub mono">{reciprocalForm(a, b, c, d)}</p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            <canvas
              ref={canvasRef}
              aria-label={`Graph of ${secantForm(a, b, c, d)} from minus 2 pi to 2 pi. A carmine secant curve with vertical asymptotes, over a faint blue guide cosine.`}
            />
            <span className="hint mono">hover the graph to read a point</span>
          </div>

          <div className="legend">
            <span className="leg"><i className="sw sec" />secant — the curve</span>
            {showCosine && <span className="leg"><i className="sw cos" />cosine — reciprocal guide</span>}
            <span className="leg"><i className="sw asy" />asymptotes (cos = 0)</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Period (2π ⁄ b)</span>
              <span className="fact-v mono">{periodStr(b)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Midline</span>
              <span className="fact-v mono">y = {trim(d)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Range</span>
              <span className="fact-v mono">
                y ≤ {trim(d - a)} &nbsp;or&nbsp; y ≥ {trim(d + a)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Asymptote spacing</span>
              <span className="fact-v mono">{spacingStr(b)}</span>
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
            <button
              type="button"
              className={'btn ghost' + (showCosine ? ' on' : '')}
              aria-pressed={showCosine}
              onClick={() => setShowCosine((v) => !v)}
            >
              {showCosine ? 'Hide cosine' : 'Show cosine'}
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
            {PARAMS.map((dl) => {
              const unlocked = step >= dl.unlock;
              const val = { a, b, c, d }[dl.key];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={dl.key}>
                  <span className="dk">{dl.label}</span>
                  <span className="drole">{unlocked ? dl.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={dl.min}
                    max={dl.max}
                    step={dl.step}
                    value={val}
                    disabled={!unlocked}
                    aria-label={`Dial ${dl.label} — ${dl.role}`}
                    onChange={(e) => onParam(dl.key, e.target.value)}
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
                  <span className="mono target-hint">target: a=?, b=?, c=?, d=?</span>
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
        <span className="mono">y = a·sec(b(x − c)) + d</span> &nbsp;·&nbsp; the secant function
        as the reciprocal of cosine, plotted live from the dials on a −2π…2π quadrille window.
      </footer>

      <style jsx>{`
        .slab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --quad: #c7d8e4;
          --cos: #608eb2;
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
          clip: rect(0 0 0 0);
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
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          margin: 12px 4px 2px;
          font-size: 12px;
          color: var(--ink-soft);
        }
        .leg {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }
        .sw {
          display: inline-block;
          width: 18px;
          height: 0;
        }
        .sw.sec {
          border-top: 2.75px solid var(--curve);
        }
        .sw.cos {
          border-top: 1.8px solid var(--cos);
        }
        .sw.asy {
          border-top: 1.6px dashed var(--ink-soft);
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin: 12px 4px 4px;
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
        :global(.slab) :focus-visible {
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
