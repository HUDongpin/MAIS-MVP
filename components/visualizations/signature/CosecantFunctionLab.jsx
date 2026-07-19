'use client';

/* ============================================================================
   CosecantFunctionLab — an interactive "bench" for the cosecant function
   in standard transformed form,  y = A·csc(B(x − C)) + D.

   Built for MAIS (math AI system, www.mais.hk), K-12 (Precalculus / Trig).
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   ONE carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   The pedagogical spine of this lab is the single identity
        csc(θ) = 1 / sin(θ).
   Everything the student sees is explained by it: a faint helper sine wave
   is drawn underneath, the cosecant is 1 divided by that wave, the vertical
   asymptotes fall exactly where the sine crosses its midline (sin = 0), and
   the U-shaped branches touch the sine's peaks and troughs.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/CosecantFunctionLab.jsx
     2. Import and render it:
          import CosecantFunctionLab from './CosecantFunctionLab';
          export default function Page() { return <CosecantFunctionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (A, B, C, D, step).
     MODEL  — f(x) is pure math; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

const PI = Math.PI;

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. x runs over two full periods of the base
   function (−2π … 2π) so several asymptotes and branches are always in view;
   y is tall enough that the branch tips (at D ± |A|) never clip.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -2 * PI, xmax: 2 * PI, ymin: -6, ymax: 6 };

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  y = A·csc(B(x − C)) + D
     A — vertical stretch & reflection (branch tips reach D ± |A|)
     B — period = 2π/B  (asymptotes every π/B)
     C — phase (horizontal) shift, stepped in π/6 so it reads in unit-circle angles
     D — vertical shift / midline
   Ranges are chosen so the branch tips D ± |A| always stay inside the window.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'A', label: 'A', min: -3, max: 3, step: 0.5, unlock: 1, role: 'vertical stretch & reflection' },
  { key: 'B', label: 'B', min: 0.5, max: 3, step: 0.5, unlock: 2, role: 'period (horizontal squeeze)' },
  { key: 'C', label: 'C', min: -PI, max: PI, step: PI / 6, unlock: 3, role: 'phase (left / right) shift' },
  { key: 'D', label: 'D', min: -2.5, max: 2.5, step: 0.5, unlock: 4, role: 'vertical shift (midline)' },
];
const START = { A: 1, B: 1, C: 0, D: 0 };

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Cosecant is one over sine',
    body:
      'The cosecant function is the reciprocal of sine: csc(x) = 1 / sin(x). That single idea ' +
      'explains everything on screen. You are looking at the base graph y = csc(x). The faint blue ' +
      'wave is its helper, y = sin(x); the carmine curve is 1 divided by that wave; and the dashed ' +
      'grey verticals are asymptotes.',
    q: 'The curve races off to ±∞ at x = …, −π, 0, π, 2π, … . Why is there a vertical asymptote at each of these?',
    choices: [
      'Because sin(x) = 0 there, and you cannot divide by zero',
      'Because cos(x) = 0 there',
      'Because the curve reaches its greatest height there',
    ],
    answer: 0,
    feedback:
      'Exactly. csc(x) = 1/sin(x), so wherever sin(x) = 0 — at every multiple of π — cosecant ' +
      'divides by zero and shoots off to ±∞. Those x-values become vertical asymptotes, and the ' +
      'curve never touches them.',
  },
  {
    title: 'A — stretch & reflection',
    body:
      'The A dial is live. A multiplies the whole cosecant in y = A·csc(B(x − C)) + D. Watch the ' +
      'U-shaped branches: their tips sit exactly on the peaks and troughs of the blue helper sine, ' +
      'at the heights D + |A| and D − |A|.',
    q: 'With D = 0, cosecant never takes a value strictly between −|A| and +|A|. What does making A negative do?',
    choices: [
      'It flips the branches — upward U’s open downward, and vice-versa',
      'It slides every branch to the left',
      'It moves the asymptotes closer together',
    ],
    answer: 0,
    feedback:
      'Right. |A| stretches the branches away from the midline (their tips reach D ± |A|), and the ' +
      'sign of A reflects them across it. Cosecant has no single “amplitude” like sine — instead A ' +
      'sets a forbidden band of width 2|A| that the curve leaps over.',
  },
  {
    title: 'B — the period',
    body:
      'Now B is unlocked. B controls the period exactly as it does for sine: period = 2π / B. ' +
      'Because the asymptotes fall wherever the helper sine crosses its midline, they are spaced ' +
      'half a period apart — one every π / B.',
    q: 'Set B = 2. What happens to the graph?',
    choices: [
      'The period halves to π, so branches and asymptotes pack twice as tightly',
      'The branches grow taller',
      'The whole graph shifts right by 2',
    ],
    answer: 0,
    feedback:
      'Correct. A larger B squeezes the period (2π/B) and therefore the asymptote spacing (π/B). ' +
      'B is a horizontal stretch or compression — it changes how often the curve repeats, never ' +
      'how tall the branches are.',
  },
  {
    title: 'C — the phase shift',
    body:
      'The C dial slides the graph horizontally. In the form y = A·csc(B(x − C)) + D, C is the ' +
      'phase shift, measured in the same units as x (here, in steps of π/6).',
    q: 'Increase C from 0 to π/2 (with B = 1). Which way does the whole picture move?',
    choices: [
      'Right by π/2 — every asymptote and branch shifts in the +x direction',
      'Left by π/2',
      'Up by π/2',
    ],
    answer: 0,
    feedback:
      'It slides right by C. Because x appears as (x − C), a positive C shifts the graph in the ' +
      'positive x-direction — the minus sign fools many students into guessing left. The asymptotes ' +
      'move with it, to x = C + k·(π/B).',
  },
  {
    title: 'D — the midline',
    body:
      'The last dial, D, lifts or lowers the entire graph. D is the midline — the line y = D that ' +
      'the branches straddle. The helper sine oscillates around it, and the asymptotes occur exactly ' +
      'where that sine crosses it.',
    q: 'Set D = 2 (with A = 1). What is the range of the graph now?',
    choices: [
      'y ≤ 1 or y ≥ 3 — the forbidden band lifts by 2',
      '−2 ≤ y ≤ 2',
      'y ≥ 0 only',
    ],
    answer: 0,
    feedback:
      'Yes. Adding D raises everything by D, so the branch tips sit at D − |A| = 1 and D + |A| = 3, ' +
      'and the curve avoids the open band (1, 3). Range: y ≤ D − |A| or y ≥ D + |A|.',
  },
  {
    title: 'Reading the whole graph',
    body:
      'You control all four dials now. Read a cosecant graph like a map: the midline y = D, the ' +
      'branch tips at D ± |A|, an asymptote every π/B starting from x = C, and a period of 2π/B.',
    q: 'In y = A·csc(B(x − C)) + D, which feature do A and D together decide?',
    choices: [
      'The range — the two boundaries the branches never cross, at y = D ± |A|',
      'The period',
      'Where the asymptotes land',
    ],
    answer: 0,
    feedback:
      'Right. A and D fix the vertical picture (range and midline); B and C fix the horizontal ' +
      'picture (period and phase, and therefore where the asymptotes fall). Every question about a ' +
      'cosecant graph comes back to these four numbers.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery cosecant is drawn as a dashed grey curve. Tune A, B, C, and D ' +
      'until your carmine curve lands on top of it and the meter reads CALIBRATED. Match the ' +
      'asymptotes first (that pins down B and C), then the branch tips (A and D). Press “New target” ' +
      'for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.
     cosecant:  y = A·csc(B(x − C)) + D  =  A / sin(B(x − C)) + D
     helper:    y = A·sin(B(x − C)) + D   (drawn faintly; branches touch it)
     phase θ(x) = B(x − C)                (its sign flips across each asymptote)
   ------------------------------------------------------------------------- */
function model(x, p) {
  return p.D + p.A / Math.sin(p.B * (x - p.C));
}
function helper(x, p) {
  return p.D + p.A * Math.sin(p.B * (x - p.C));
}
function phase(x, p) {
  return Math.sin(p.B * (x - p.C)); // discontinuity detector: csc breaks where this changes sign
}

/* Vertical asymptotes in the window: x = C + kπ/B (where sin = 0). */
function asymptotes(p) {
  const out = [];
  if (Math.abs(p.A) < 1e-9) return out;
  const spacing = PI / p.B;
  const kmin = Math.ceil((WORLD.xmin - p.C) / spacing);
  const kmax = Math.floor((WORLD.xmax - p.C) / spacing);
  for (let k = kmin; k <= kmax; k++) out.push(p.C + k * spacing);
  return out;
}

/* Branch tips (local extrema): where sin = ±1, i.e. x = C + (π/2 + kπ)/B.
   There the branch touches the helper sine and y = D ± A. */
function branchTips(p) {
  const out = [];
  if (Math.abs(p.A) < 1e-9) return out;
  const spacing = PI / p.B;
  const first = p.C + PI / 2 / p.B;
  const kmin = Math.ceil((WORLD.xmin - first) / spacing);
  const kmax = Math.floor((WORLD.xmax - first) / spacing);
  for (let k = kmin; k <= kmax; k++) {
    const x = first + k * spacing;
    out.push({ x, y: model(x, p) });
  }
  return out;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. RMS curve-matching. Cosecant's branches blow up at the
   asymptotes, so residuals are (a) clamped to a cap and (b) skipped wherever
   EITHER curve is within a hair of an asymptote (|sin| < 0.16) — otherwise the
   poles would swamp the meter. Targets are grid-aligned, so an exact match is
   reachable and reads a clean 0 error.
   ------------------------------------------------------------------------- */
function rmsError(p, t) {
  const N = 260;
  const CAP = 8;
  let s = 0;
  let cnt = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    const sp = Math.sin(p.B * (x - p.C));
    const st = Math.sin(t.B * (x - t.C));
    if (Math.abs(sp) < 0.16 || Math.abs(st) < 0.16) continue; // near a pole — undefined comparison
    let d = p.D + p.A / sp - (t.D + t.A / st);
    if (d > CAP) d = CAP;
    else if (d < -CAP) d = -CAP;
    s += d * d;
    cnt++;
  }
  return cnt ? Math.sqrt(s / cnt) : CAP;
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 1.5)));
const MATCH_RMS = 0.05; // below this the curves are effectively identical -> CALIBRATED

function makeTarget(prev) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const As = [-2, -1.5, -1, 1, 1.5, 2];
  const Bs = [0.5, 1, 1.5, 2];
  const Cs = [-PI / 2, -PI / 3, -PI / 6, 0, PI / 6, PI / 3, PI / 2];
  const Ds = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
  let t;
  do {
    t = { A: pick(As), B: pick(Bs), C: pick(Cs), D: pick(Ds) };
  } while (
    (prev && t.A === prev.A && t.B === prev.B && t.C === prev.C && t.D === prev.D) ||
    (t.A === START.A && t.B === START.B && t.C === START.C && t.D === START.D)
  );
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−), trimmed decimals, and clean
   multiples of π for the phase, period, and axis labels.
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
/* format (num/den)·π as a reduced, human string: 0, π, −π/2, 3π/2, 5π/6 … */
function piStr(num, den) {
  if (num === 0) return '0';
  const g = gcd(num, den);
  let n = num / g;
  const d = den / g;
  const sign = n < 0 ? MINUS : '';
  n = Math.abs(n);
  let mag;
  if (d === 1) mag = n === 1 ? 'π' : `${n}π`;
  else mag = n === 1 ? `π/${d}` : `${n}π/${d}`;
  return sign + mag;
}
/* C is stored in radians as a multiple of π/6 -> its integer index n. */
const cIndex = (C) => Math.round(C / (PI / 6));
const cStr = (C) => piStr(cIndex(C), 6);
/* B is a multiple of 0.5, so 2B is an integer; period = 4π/(2B), spacing = 2π/(2B). */
const periodStr = (B) => piStr(4, Math.round(2 * B));
const spacingStr = (B) => piStr(2, Math.round(2 * B));

/* The argument B(x − C) as a plain string, for the reciprocal readout & a11y. */
function argText(B, Cn) {
  const inner = Cn === 0 ? 'x' : `x ${Cn > 0 ? '−' : '+'} ${piStr(Math.abs(Cn), 6)}`;
  if (Math.abs(B - 1) < 1e-9) return inner;
  if (Cn === 0) return `${trim(B)}x`;
  return `${trim(B)}(${inner})`;
}

/* EDIT 5 — Equation display. y = A·csc(B(x − C)) + D, careful sign handling. */
function argJSX(B, Cn) {
  const b1 = Math.abs(B - 1) < 1e-9;
  const inner =
    Cn === 0 ? (
      <>x</>
    ) : (
      <>
        x&nbsp;{Cn > 0 ? MINUS : '+'}&nbsp;{piStr(Math.abs(Cn), 6)}
      </>
    );
  if (b1) return inner;
  if (Cn === 0)
    return (
      <>
        {trim(B)}x
      </>
    );
  return (
    <>
      {trim(B)}({inner})
    </>
  );
}
function CscEquation({ A, B, C, D }) {
  if (Math.abs(A) < 1e-9) return <span>y = {D === 0 ? '0' : trim(D)}</span>;
  const coef = Math.abs(Math.abs(A) - 1) < 1e-9 ? (A < 0 ? MINUS : '') : trim(A);
  const Cn = cIndex(C);
  const dpart =
    D === 0 ? null : (
      <>
        &nbsp;{D > 0 ? '+' : MINUS}&nbsp;{trim(Math.abs(D))}
      </>
    );
  return (
    <span>
      y = {coef}csc({argJSX(B, Cn)}){dpart}
    </span>
  );
}
/* The same curve rewritten as 1/sin, to keep the reciprocal identity in view. */
function reciprocalForm(A, B, C, D) {
  if (Math.abs(A) < 1e-9) return `y = ${trim(D)}`;
  const Cn = cIndex(C);
  const num = Math.abs(Math.abs(A) - 1) < 1e-9 ? (A < 0 ? `${MINUS}1` : '1') : trim(A);
  let s = `y = ${num} ∕ sin(${argText(B, Cn)})`;
  if (D !== 0) s += ` ${D > 0 ? '+' : MINUS} ${trim(Math.abs(D))}`;
  return s;
}
/* A spoken description for the canvas aria-label / screen-reader equation. */
function describeGraph(A, B, C, D) {
  if (Math.abs(A) < 1e-9) return `Horizontal line y = ${trim(D)}.`;
  const Cn = cIndex(C);
  return (
    `Graph of y = ${trim(A)} cosecant of ${argText(B, Cn)}` +
    `${D === 0 ? '' : ` ${D > 0 ? 'plus' : 'minus'} ${trim(Math.abs(D))}`}. ` +
    `Period ${periodStr(B)}. Midline y = ${trim(D)}. ` +
    `Branch tips at y = ${trim(D + Math.abs(A))} and y = ${trim(D - Math.abs(A))}. ` +
    `Vertical asymptotes every ${spacingStr(B)}.`
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function CosecantFunctionLab() {
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

  // Snapshot everything the renderer needs so draw() (a stable callback) and
  // the pointer/tracer handlers never read stale values.
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
    const absA = Math.abs(p.A);
    const hasCsc = absA > 1e-9;

    ctx.clearRect(0, 0, W, H);

    /* forbidden band — the strip (D−|A|, D+|A|) the curve never enters.
       (Hidden during calibration to keep the matching view clean.) */
    if (!S.calib && hasCsc) {
      ctx.fillStyle = 'rgba(120,150,175,0.10)';
      const yTop = sy(p.D + absA);
      ctx.fillRect(0, yTop, W, sy(p.D - absA) - yTop);
    }

    /* minor grid — vertical every π/4, horizontal every 1 (quadrille paper) */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.9)';
    ctx.beginPath();
    for (let k = Math.ceil(WORLD.xmin / (PI / 4)); k * (PI / 4) <= WORLD.xmax + 1e-9; k++) {
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

    /* x tick labels every π/2 (in π units); y labels every 2 (integers) */
    ctx.fillStyle = 'rgba(91,107,123,0.95)';
    ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let k = -3; k <= 3; k++) {
      if (k === 0) continue;
      const x = (k * PI) / 2;
      ctx.fillText(piStr(k, 2), sx(x), sy(0) + 4);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let gy = Math.ceil(WORLD.ymin / 2) * 2; gy <= WORLD.ymax; gy += 2) {
      if (gy === 0 || gy <= WORLD.ymin || gy >= WORLD.ymax) continue;
      ctx.fillText(String(gy), sx(0) - 6, sy(gy));
    }

    /* a plotter that samples one point per pixel, breaks the path when the
       curve leaves the window, and (given a discontinuity probe) breaks it at
       every sign change of the probe — so the two sides of an asymptote are
       never joined by a false vertical line. */
    const plot = (fn, stroke, width, dash, discFn) => {
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.setLineDash(dash || []);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let pen = false;
      let prevSign = 0;
      for (let px = 0; px <= W; px++) {
        const x = WORLD.xmin + (px / W) * (WORLD.xmax - WORLD.xmin);
        if (discFn) {
          const g = discFn(x);
          const sign = g > 0 ? 1 : g < 0 ? -1 : 0;
          if (pen && prevSign !== 0 && sign !== 0 && sign !== prevSign) pen = false; // crossed a pole
          if (sign !== 0) prevSign = sign;
        }
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

    /* vertical asymptotes (current parameters) — dashed grey */
    const drawAsymptotes = (pp, alpha) => {
      const xs = asymptotes(pp);
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = `rgba(91,107,123,${alpha})`;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      for (const xa of xs) {
        const X = Math.round(sx(xa)) + 0.5;
        ctx.moveTo(X, 0);
        ctx.lineTo(X, H);
      }
      ctx.stroke();
      ctx.restore();
    };

    if (!S.calib) {
      /* midline y = D */
      ctx.save();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(91,107,123,0.4)';
      ctx.setLineDash([2, 4]);
      const my = Math.round(sy(p.D)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, my);
      ctx.lineTo(W, my);
      ctx.stroke();
      ctx.restore();

      /* branch-tip levels y = D ± |A| (range boundaries) */
      if (hasCsc) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(120,150,175,0.55)';
        ctx.setLineDash([2, 5]);
        for (const yb of [p.D + absA, p.D - absA]) {
          const Y = Math.round(sy(yb)) + 0.5;
          ctx.beginPath();
          ctx.moveTo(0, Y);
          ctx.lineTo(W, Y);
          ctx.stroke();
        }
        ctx.restore();
      }

      drawAsymptotes(p, 0.55);

      /* helper sine — the reciprocal's partner, drawn faint & dashed */
      if (hasCsc) plot((x) => helper(x, p), 'rgba(90,130,165,0.8)', 1.6, [6, 5]);
    } else {
      drawAsymptotes(p, 0.5);
    }

    /* target curve (calibration only) — dashed grey, under the accent */
    if (S.calib && S.target) {
      plot((x) => model(x, S.target), 'rgba(91,107,123,0.85)', 2, [7, 6], (x) => phase(x, S.target));
    }

    /* the mathematical object — the one carmine accent */
    if (hasCsc) {
      plot((x) => model(x, p), '#C81E4F', 2.75, null, (x) => phase(x, p));
    } else {
      /* A = 0: cosecant collapses to the constant line y = D */
      plot((x) => p.D, '#C81E4F', 2.75);
    }

    /* branch-tip markers — small carmine dots where each U touches the sine */
    if (hasCsc) {
      ctx.save();
      ctx.fillStyle = '#C81E4F';
      for (const tp of branchTips(p)) {
        if (tp.y < WORLD.ymin || tp.y > WORLD.ymax) continue;
        ctx.beginPath();
        ctx.arc(sx(tp.x), sy(tp.y), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /* hover readout: a dot on the curve + its coordinates */
    const hx = hoverRef.current;
    if (hx != null && hasCsc) {
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
        ctx.arc(X, Y, 3.5, 0, Math.PI * 2);
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

    /* tracer: a point sweeping the curve — it rides a branch toward an
       asymptote, vanishes, and reappears from the far infinity, dramatizing
       the reciprocal blow-up. Drawn only where the value is on-screen. */
    const tx = tracerRef.current;
    if (tx != null && hasCsc) {
      const ty = model(tx, p);
      if (isFinite(ty) && ty >= WORLD.ymin && ty <= WORLD.ymax) {
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

  /* the tracer sweep — time-based (dt), opt-in, respects reduced motion */
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
    const DURATION = 4200;
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

  const absA = Math.abs(A);
  const vals = { A, B, C, D };
  const rangeStr =
    absA < 1e-9
      ? '—'
      : `y ≤ ${trim(D - absA)}  or  y ≥ ${trim(D + absA)}`;

  return (
    <div className="clab">
      <header className="head">
        <h1>The Cosecant Function</h1>
        <p className="lede">
          Explore{' '}
          <span className="mono">y = A·csc(B(x&nbsp;−&nbsp;C))&nbsp;+&nbsp;D</span> — the reciprocal
          of sine. Each dial unlocks with the lesson, so you see one idea at a time, and you finish by
          calibrating your curve onto a mystery target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <CscEquation A={A} B={B} C={C} D={D} />
            </p>
            <p className="equation-sub mono">{reciprocalForm(A, B, C, D)}</p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            <canvas ref={canvasRef} role="img" aria-label={describeGraph(A, B, C, D)} />
            <span className="hint mono">hover the graph to read a point</span>
          </div>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <i className="sw curve" /> cosecant
            </span>
            {current.calib ? (
              <span className="lg">
                <i className="sw target" /> mystery target
              </span>
            ) : (
              <span className="lg">
                <i className="sw sine" /> helper sine
              </span>
            )}
            <span className="lg">
              <i className="sw asy" /> asymptotes (sin = 0)
            </span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Period</span>
              <span className="fact-v mono">
                {`${periodStr(B)}  ≈  ${((2 * PI) / B).toFixed(2)}`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Asymptotes</span>
              <span className="fact-v mono">
                {absA < 1e-9 ? '— (no cosecant)' : `x = ${cStr(C)} + k·${spacingStr(B)}`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Midline</span>
              <span className="fact-v mono">y = {trim(D)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Phase shift</span>
              <span className="fact-v mono">
                {cIndex(C) === 0
                  ? 'none'
                  : `${cStr(C)}  (${cIndex(C) > 0 ? 'right' : 'left'})`}
              </span>
            </div>
            <div className="fact wide">
              <span className="fact-k">Range</span>
              <span className="fact-v mono">{rangeStr}</span>
            </div>
          </div>

          <div className="toolbar">
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
              const val = vals[d.key];
              const shown = d.key === 'C' ? cStr(val) : trim(val);
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
                  <output className="dv">{unlocked ? shown : '🔒'}</output>
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
                  <span className="mono target-hint">target: A=?, B=?, C=?, D=?</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={() => setTarget(makeTarget(target))}>
                New target
              </button>
              <p className="sr-only" aria-live="polite">
                {calibrated ? 'Calibrated. Your curve matches the target.' : `Match ${pct.toFixed(0)} percent.`}
              </p>
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
        <span className="mono">y = A·csc(B(x − C)) + D</span> &nbsp;·&nbsp; the cosecant is 1 ⁄ sin,
        so it has a vertical asymptote wherever the helper sine hits zero.
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
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          justify-content: center;
          margin: 12px 4px 2px;
          font-size: 12px;
          color: var(--ink-soft);
        }
        .lg {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .sw {
          width: 16px;
          height: 0;
          border-top-width: 2.5px;
          border-top-style: solid;
          display: inline-block;
        }
        .sw.curve {
          border-top-color: var(--curve);
        }
        .sw.sine {
          border-top-color: rgba(90, 130, 165, 0.9);
          border-top-style: dashed;
        }
        .sw.target {
          border-top-color: rgba(91, 107, 123, 0.9);
          border-top-style: dashed;
        }
        .sw.asy {
          border-top-color: rgba(91, 107, 123, 0.75);
          border-top-style: dashed;
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
          grid-template-columns: 22px 1fr 58px;
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
