'use client';

/* ============================================================================
   SineFunctionLab — an interactive "bench" for the sine function in the
   general transformed form,  y = A·sin(Bx + C) + D.

   Built for MAIS (math AI system, www.mais.hk), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/SineFunctionLab.jsx
     2. Import and render it:
          import SineFunctionLab from './SineFunctionLab';
          export default function Page() { return <SineFunctionLab />; }
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
   EDIT 3 — World window & axes. x is measured in radians over two full turns
   (−2π … 2π); y spans −4 … 4. The window's width:height ≈ 4π:8 ≈ 11:7, and the
   stage below is given that same aspect ratio, so one radian on x and one unit
   on y draw at nearly the same length — the wave keeps its true shape.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -2 * PI, xmax: 2 * PI, ymin: -4, ymax: 4 };

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Each dial names the letter it drives, its range/step,
   and the lesson step at which it unlocks. C moves in twelfths of π so the
   phase always lands on a clean fraction (π/2, π/4, …).
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'A', label: 'A', min: -3, max: 3, step: 0.25, unlock: 1, role: 'amplitude · height' },
  { key: 'B', label: 'B', min: 0.5, max: 3, step: 0.25, unlock: 2, role: 'frequency · period' },
  { key: 'C', label: 'C', min: -PI, max: PI, step: PI / 12, unlock: 3, role: 'phase · left / right shift' },
  { key: 'D', label: 'D', min: -3, max: 3, step: 0.25, unlock: 4, role: 'midline · up / down shift' },
];
const START = { A: 1, B: 1, C: 0, D: 0 };

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the sine wave',
    body:
      'The sine function traces a smooth, endlessly repeating wave. We write the general ' +
      'form as y = A·sin(Bx + C) + D and unlock one dial at a time so you can see exactly ' +
      'what each letter does. Right now A = 1, B = 1, C = 0, D = 0, so you are looking at the ' +
      'simplest wave of all, y = sin x. The x-axis is measured in radians (π ≈ 3.14).',
    q: 'The wave repeats the same shape over and over. What do we call the length of one full repeat?',
    choices: ['The period', 'The amplitude', 'The frequency'],
    answer: 0,
    feedback:
      'That horizontal length of one complete cycle is the period. For y = sin x the period is ' +
      '2π — the wave finishes exactly one up-and-down trip every 2π units. The B dial, coming next, ' +
      'is what changes it.',
  },
  {
    title: 'A — amplitude (height)',
    body:
      'The A dial is now live. It stretches the wave vertically. The amplitude — how far the wave ' +
      'rises above the middle and falls below it — is |A|.',
    q: 'Set A = 2. How far does the wave now rise above the middle line at its peak?',
    choices: ['2 units', '4 units', '½ a unit'],
    answer: 0,
    feedback:
      'The amplitude is |A| = 2, so the peak sits 2 above the midline and the trough sits 2 below it — ' +
      'a total swing of 4 from top to bottom. Making A negative flips the wave upside down but keeps the ' +
      'same amplitude, because amplitude uses the absolute value |A|.',
  },
  {
    title: 'B — the period',
    body:
      'Now the B dial is unlocked. B controls how tightly the wave is packed. The period is ' +
      'T = 2π ÷ B: a bigger B squeezes more cycles into the same space.',
    q: 'You set B = 2. What happens to the wave?',
    choices: [
      'It squeezes together — twice as many cycles, period π',
      'It grows twice as tall',
      'It slides to the right',
    ],
    answer: 0,
    feedback:
      'Period T = 2π ÷ B = 2π ÷ 2 = π, so the wave now completes a full cycle in half the space — twice ' +
      'as many waves on screen. Notice the inverse relationship: a larger B gives a shorter period. This ' +
      'is the step where many students guess the wrong direction.',
  },
  {
    title: 'C — the phase shift',
    body:
      'The C dial slides the whole wave left or right. Because C sits inside the parentheses with x, ' +
      'the actual horizontal shift is −C ÷ B, not C itself.',
    q: 'With B = 1, you set C = π/2. Which way does the wave slide, and by how much?',
    choices: ['Left by π/2', 'Right by π/2', 'Up by π/2'],
    answer: 0,
    feedback:
      'The horizontal shift is −C ÷ B = −(π/2) ÷ 1 = −π/2, i.e. left by π/2. A positive C inside the ' +
      'parentheses pushes the wave in the negative direction — the same minus-sign trap you meet with ' +
      '(x − h) in the parabola. The dashed vertical line marks where each new cycle begins.',
  },
  {
    title: 'D — the midline',
    body:
      'The last dial, D, lifts or lowers the entire wave. The wave now oscillates around the midline ' +
      'y = D instead of the x-axis.',
    q: 'Set D = 1 while A = 2. What is the highest point the wave reaches now?',
    choices: ['3', '2', '1'],
    answer: 0,
    feedback:
      'The maximum is D + |A| = 1 + 2 = 3, and the minimum is D − |A| = 1 − 2 = −1. The wave swings |A| ' +
      'above and below the midline y = D, so the whole range is [D − |A|, D + |A|].',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery wave is drawn as a dashed grey curve. Tune A, B, C, and D until your ' +
      'carmine wave lands exactly on top of it and the meter reads CALIBRATED. Press “New target” for a ' +
      'fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.  y = A·sin(Bx + C) + D
   ------------------------------------------------------------------------- */
function model(x, p) {
  return p.A * Math.sin(p.B * x + p.C) + p.D;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A sine wave is bounded, so plain RMS over the window
   behaves well (no diverging tails to clamp, unlike the parabola). Targets are
   generated on the dial grid, so an exact match — RMS 0 — is always reachable.
   The reciprocal mapping was tuned so a single dial one step off reads ~70%
   while an exact match reads 100%.
   ------------------------------------------------------------------------- */
function rmsError(p, t) {
  const N = 220;
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    const d = model(x, p) - model(x, t);
    s += d * d;
  }
  return Math.sqrt(s / (N + 1));
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.45)));
const MATCH_RMS = 0.1; // below this the curves are effectively identical -> CALIBRATED

function makeTarget(prev) {
  const Bs = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const Cs = [-PI, (-3 * PI) / 4, -PI / 2, -PI / 4, 0, PI / 4, PI / 2, (3 * PI) / 4, PI];
  let t;
  do {
    const mag = 0.5 + 0.25 * Math.floor(Math.random() * 7); // 0.5 … 2.0
    const A = (Math.random() < 0.35 ? -1 : 1) * mag; // mostly upright, sometimes reflected
    const B = Bs[Math.floor(Math.random() * Bs.length)];
    const C = Cs[Math.floor(Math.random() * Cs.length)];
    const D = -1.5 + 0.5 * Math.floor(Math.random() * 7); // −1.5 … 1.5 (peak stays in view)
    t = { A, B, C, D };
  } while (
    (prev && t.A === prev.A && t.B === prev.B && t.C === prev.C && t.D === prev.D) ||
    (t.A === START.A && t.B === START.B && t.C === START.C && t.D === START.D) // never the starting curve
  );
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−), trimmed decimals, and exact
   fractions of π (the phase and period are always rational multiples of π).
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 100) / 100;
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
/* Format (num / den)·π as a reduced fraction string: "π/2", "−3π/4", "2π", "0". */
function piRatio(num, den) {
  if (den < 0) {
    num = -num;
    den = -den;
  }
  if (num === 0) return '0';
  const g = gcd(num, den);
  let n = num / g;
  const d = den / g;
  const sign = n < 0 ? MINUS : '';
  n = Math.abs(n);
  let core;
  if (d === 1) core = n === 1 ? 'π' : n + 'π';
  else core = n === 1 ? 'π/' + d : n + 'π/' + d;
  return sign + core;
}
const nCof = (C) => Math.round(C / (PI / 12)); // C as an integer number of π/12 units

/* EDIT 5 — Equation display, y = A·sin(Bx + C) + D, with careful sign handling. */
function sineEquation(A, B, C, D) {
  if (Math.abs(A) < 1e-9) return `y = ${Math.abs(D) < 1e-9 ? '0' : trim(D)}`; // flat line
  const nC = nCof(C);
  let s = 'y = ';
  if (Math.abs(Math.abs(A) - 1) < 1e-9) s += (A < 0 ? MINUS : '') + 'sin(';
  else s += trim(A) + ' sin(';
  s += Math.abs(B - 1) < 1e-9 ? 'x' : trim(B) + 'x';
  if (nC !== 0) s += (nC > 0 ? ' + ' : ' ' + MINUS + ' ') + piRatio(Math.abs(nC), 12);
  s += ')';
  if (Math.abs(D) > 1e-9) s += (D > 0 ? ' + ' : ' ' + MINUS + ' ') + trim(Math.abs(D));
  return s;
}

/* The wave's key measurements, described the way a textbook would. */
function periodStr(B) {
  return piRatio(8, Math.round(4 * B)); // 2π / B = 8π / (4B)
}
function phaseStr(B, C) {
  const nC = nCof(C);
  if (nC === 0) return 'none';
  const mag = piRatio(Math.abs(nC), Math.round(12 * B)); // |C ÷ B| as a fraction of π
  const dir = nC > 0 ? '← left' : '→ right'; // +C shifts left
  return `${mag} ${dir}`;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function SineFunctionLab() {
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
  sceneRef.current = { A, B, C, D, step, calib: !!current.calib, target };

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
    const inX = (x) => x >= WORLD.xmin && x <= WORLD.xmax;
    const inY = (y) => y >= WORLD.ymin && y <= WORLD.ymax;

    const S = sceneRef.current;
    const p = { A: S.A, B: S.B, C: S.C, D: S.D };
    const calib = S.calib;

    ctx.clearRect(0, 0, W, H);

    /* minor grid (quadrille paper): vertical every π/4, horizontal every unit */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.9)';
    ctx.beginPath();
    const gxStep = PI / 4;
    for (let gx = Math.ceil(WORLD.xmin / gxStep) * gxStep; gx <= WORLD.xmax + 1e-9; gx += gxStep) {
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

    /* tick labels — x in π-fractions (every π/2), y in integers */
    ctx.fillStyle = 'rgba(91,107,123,0.95)';
    ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const gxlStep = PI / 2;
    for (let gx = Math.ceil(WORLD.xmin / gxlStep) * gxlStep; gx <= WORLD.xmax + 1e-9; gx += gxlStep) {
      const m = Math.round(gx / (PI / 2));
      if (m === 0 || gx <= WORLD.xmin + 0.01 || gx >= WORLD.xmax - 0.01) continue; // skip origin & edges
      ctx.fillText(piRatio(m, 2), sx(gx), sy(0) + 4);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let gy = Math.ceil(WORLD.ymin); gy <= WORLD.ymax; gy++) {
      if (gy === 0 || gy <= WORLD.ymin || gy >= WORLD.ymax) continue; // skip origin & clipped edges
      ctx.fillText(String(gy), sx(0) - 6, sy(gy));
    }

    /* a plotter that samples one point per pixel and breaks the path when the
       curve leaves the window (so a big A/D never draws a false top cap) */
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

    const absA = Math.abs(p.A);
    const T = (2 * PI) / p.B; // period

    /* envelope: faint max/min lines the wave rides between (lesson view only) */
    if (!calib && absA > 1e-9) {
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(91,107,123,0.28)';
      ctx.setLineDash([2, 6]);
      for (const yb of [p.D + absA, p.D - absA]) {
        if (!inY(yb)) continue;
        const Y = Math.round(sy(yb)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, Y);
        ctx.lineTo(W, Y);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* midline y = D — the wave's axis (always shown) */
    if (inY(p.D)) {
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(91,107,123,0.6)';
      ctx.setLineDash([6, 6]);
      const Y = Math.round(sy(p.D)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
      ctx.stroke();
      if (Math.abs(p.D) > 1e-9) {
        ctx.setLineDash([]);
        ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.fillStyle = 'rgba(91,107,123,0.95)';
        const lbl = 'midline';
        const tw = ctx.measureText(lbl).width;
        ctx.fillStyle = 'rgba(251,251,248,0.8)';
        ctx.fillRect(8, Y - 15, tw + 6, 13);
        ctx.fillStyle = 'rgba(91,107,123,0.95)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(lbl, 11, Y - 3);
      }
      ctx.restore();
    }

    /* target curve (calibration only) — dashed grey, drawn under the accent */
    if (calib && S.target) {
      plot((x) => model(x, S.target), 'rgba(91,107,123,0.85)', 2, [7, 6]);
    }

    /* ---- progressively-revealed annotations (lesson view only) ------------ */

    /* phase line: the ascending midline crossing that starts each cycle, at
       x = −C/B. Appears with the C dial. Moves as you change the phase. */
    if (!calib && S.step >= 3 && Math.abs(p.C) > 1e-9 && absA > 1e-9) {
      let xf = -p.C / p.B;
      xf -= Math.round(xf / T) * T; // the crossing nearest the y-axis
      if (inX(xf)) {
        ctx.save();
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = 'rgba(91,107,123,0.55)';
        ctx.setLineDash([4, 5]);
        const X = Math.round(sx(xf)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(X, 0);
        ctx.lineTo(X, H);
        ctx.stroke();
        ctx.restore();
      }
    }

    /* period bracket: a horizontal span of one full cycle along the midline,
       labelled with the period. Appears with the B dial. */
    if (!calib && S.step >= 2 && absA > 1e-9 && inY(p.D)) {
      const x0base = -p.C / p.B; // an ascending crossing
      let best = null;
      for (let k = -4; k <= 4; k++) {
        const sStart = x0base + k * T;
        if (sStart >= WORLD.xmin - 1e-6 && sStart + T <= WORLD.xmax + 1e-6) {
          const center = sStart + T / 2;
          if (best === null || Math.abs(center) < Math.abs(best.center)) best = { s: sStart, center };
        }
      }
      if (best) {
        const y = Math.round(sy(p.D)) + 0.5;
        const X0 = sx(best.s);
        const X1 = sx(best.s + T);
        ctx.save();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(91,107,123,0.75)';
        ctx.beginPath();
        ctx.moveTo(X0, y);
        ctx.lineTo(X1, y);
        ctx.moveTo(X0, y - 6);
        ctx.lineTo(X0, y + 6);
        ctx.moveTo(X1, y - 6);
        ctx.lineTo(X1, y + 6);
        ctx.stroke();
        ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
        const lbl = 'T = ' + periodStr(p.B);
        const tw = ctx.measureText(lbl).width;
        const mid = (X0 + X1) / 2;
        ctx.fillStyle = 'rgba(251,251,248,0.9)';
        ctx.fillRect(mid - tw / 2 - 3, y - 18, tw + 6, 14);
        ctx.fillStyle = 'rgba(91,107,123,1)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(lbl, mid, y - 5);
        ctx.restore();
      }
    }

    /* amplitude bracket: a vertical span from the midline to a peak, labelled
       |A|. Appears with the A dial. Its top sits exactly on the curve. */
    if (!calib && S.step >= 1 && absA > 1e-9) {
      let xp = (PI / 2 - p.C) / p.B; // where sin(Bx + C) = 1
      xp -= Math.round(xp / T) * T; // the peak nearest the y-axis
      if (xp < WORLD.xmin + 0.5) xp += T;
      if (xp > WORLD.xmax - 0.5) xp -= T;
      const yTop = p.D + p.A; // point (xp, yTop) is on the curve
      if (inX(xp) && inY(p.D) && inY(yTop)) {
        const X = Math.round(sx(xp)) + 0.5;
        const Y0 = sy(p.D);
        const Y1 = sy(yTop);
        ctx.save();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(91,107,123,0.85)';
        ctx.beginPath();
        ctx.moveTo(X, Y0);
        ctx.lineTo(X, Y1);
        ctx.moveTo(X - 4, Y0);
        ctx.lineTo(X + 4, Y0);
        ctx.moveTo(X - 4, Y1);
        ctx.lineTo(X + 4, Y1);
        ctx.stroke();
        ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
        const lbl = '|A| = ' + trim(absA);
        const tw = ctx.measureText(lbl).width;
        const my = (Y0 + Y1) / 2;
        let lx = X + 7;
        if (lx + tw + 4 > W) lx = X - 7 - tw;
        ctx.fillStyle = 'rgba(251,251,248,0.9)';
        ctx.fillRect(lx - 2, my - 7, tw + 4, 14);
        ctx.fillStyle = 'rgba(91,107,123,1)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(lbl, lx, my);
        ctx.restore();
      }
    }

    /* the mathematical object — the one carmine accent */
    plot((x) => model(x, p), '#C81E4F', 2.75);

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

    /* tracer: a point sweeping the curve, showing it as a locus of (x, f(x)) */
    const tx = tracerRef.current;
    if (tx != null) {
      const ty = model(tx, p);
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
      ctx.arc(X, Y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FBFBF8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
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
    const DURATION = 3000;
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

  const dialValue = { A, B, C, D };
  const absA = Math.abs(A);

  return (
    <div className="slab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Sine Function</h1>
        <p className="lede">
          Explore the wave in{' '}
          <span className="mono">general form, y = A·sin(Bx&nbsp;+&nbsp;C)&nbsp;+&nbsp;D</span>. Each dial
          unlocks with the lesson, so you can see one idea at a time — and finish by calibrating your
          wave onto a mystery target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation mono">{sineEquation(A, B, C, D)}</p>
            <p className="equation-sub mono">
              range&nbsp;&nbsp;[{trim(D - absA)}, {trim(D + absA)}]
            </p>
          </div>

          <div className="stage" ref={stageRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
            <canvas
              ref={canvasRef}
              aria-label="Graph of y = A sin(Bx + C) + D on radian-scaled quadrille paper, redrawn live from the dials"
            />
            <span className="hint mono">hover the graph to read a point</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Amplitude</span>
              <span className="fact-v mono">{absA < 1e-9 ? '0 · a flat line' : trim(absA)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Period</span>
              <span className="fact-v mono">{periodStr(B)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Phase shift</span>
              <span className="fact-v mono">{phaseStr(B, C)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Midline</span>
              <span className="fact-v mono">y = {trim(D)}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (tracing ? ' on' : '')}
              onClick={() => setTracing((t) => !t)}
            >
              {tracing ? 'Tracing…' : 'Trace the wave'}
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
              const val = dialValue[d.key];
              const shown = d.key === 'C' ? piRatio(nCof(val), 12) : trim(val);
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
        <span className="mono">y = A·sin(Bx + C) + D</span> &nbsp;·&nbsp; the general sine function,
        plotted live from the dials on a radian-scaled quadrille window (−2π … 2π).
      </footer>

      <style jsx>{`
        .slab {
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
          max-width: 1180px;
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
          width: min(100%, 660px);
          aspect-ratio: 11 / 7;
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
          grid-template-columns: 22px 1fr 54px;
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
