'use client';

/* ============================================================================
   CosineFunctionLab — an interactive "bench" for the cosine function
   in graphing form,  y = A·cos(B(x − h)) + k.

   Built for MAIS (math AI system, www.mais.hk), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   Why this form (and not y = A·cos(Bx + C) + k):  h and k here mean exactly
   what they mean in this lab's sibling, QuadraticFunctionLab (y = a(x − h)² + k)
   — h is the horizontal shift, k the vertical shift. Each dial maps to one
   geometric feature, and the phase shift is simply h (no −C/B to compute), so
   the notorious sign trap never appears. The equivalent expanded form
   y = A·cos(Bx + φ) + k, φ = −Bh, is shown underneath whenever B ≠ 1 to connect
   the two conventions.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/CosineFunctionLab.jsx
     2. Import and render it:
          import CosineFunctionLab from './CosineFunctionLab';
          export default function Page() { return <CosineFunctionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (A, B, h, k, step).
     MODEL  — f(x) is pure math; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

const TAU = Math.PI * 2;

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. x is in radians, so the horizontal grid runs
   in quarter-π steps (labelled every π/2) and the vertical grid in unit steps.
   The window is −2π … 2π wide so two full cycles of the parent wave are in view.
   16 quarter-π columns × 10 unit rows ⇒ an 8:5 stage keeps the cells square.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -TAU, xmax: TAU, ymin: -5, ymax: 5 };

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Each dial names the letter it drives, its range/step,
   and the lesson step at which it unlocks. h steps in π/12 so it lands on the
   familiar phase shifts (π/6, π/4, π/3, π/2, …).
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'a', label: 'A', min: -3, max: 3, step: 0.25, unlock: 1, role: 'amplitude — height' },
  { key: 'b', label: 'B', min: 0.5, max: 3, step: 0.25, unlock: 2, role: 'period — 2π / B' },
  { key: 'h', label: 'h', min: -Math.PI, max: Math.PI, step: Math.PI / 12, unlock: 3, role: 'phase (left / right) shift' },
  { key: 'k', label: 'k', min: -1.5, max: 1.5, step: 0.25, unlock: 4, role: 'midline (up / down) shift' },
];
const START = { a: 1, b: 1, h: 0, k: 0 };

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the cosine wave',
    body:
      'The cosine function traces a smooth, endlessly repeating wave. We write it as ' +
      'y = A·cos(B(x − h)) + k and unlock one dial at a time so you can see exactly what ' +
      'each letter does. Right now A = 1, B = 1, h = 0, k = 0, so this is the parent wave, ' +
      'y = cos(x): it repeats every 2π and rises no higher than 1 and no lower than −1.',
    q: 'A cosine wave begins at the top of its cycle when x = 0. What is the value of cos(0)?',
    choices: ['1', '0', '−1'],
    answer: 0,
    feedback:
      'cos(0) = 1, so the parent wave starts at its highest point, (0, 1). That is the signature ' +
      'difference from sine, which starts at 0 and climbs. Everything else — how tall the wave is, ' +
      'how often it repeats, where it sits — is set by the four dials you are about to meet.',
  },
  {
    title: 'A — amplitude',
    body:
      'The A dial is now live. Amplitude is the distance from the midline up to a peak (or down to ' +
      'a trough). Drag A and watch the wave grow taller and shorter, then flip when A goes negative.',
    q: 'Set A = 3. How far above the midline does each peak now reach?',
    choices: ['3 units', '6 units', '9 units'],
    answer: 0,
    feedback:
      'The amplitude is |A| = 3, so peaks reach 3 above the midline and troughs 3 below it. The sign ' +
      'of A sets direction: A > 0 keeps a peak at x = h, while A < 0 flips the wave over the midline so ' +
      'a trough sits there instead. The size |A| is the height; the sign is the flip.',
  },
  {
    title: 'B — the period',
    body:
      'Now the B dial is unlocked. B controls how tightly the wave is packed. The length of one full ' +
      'cycle — the period — is 2π / B. Drag B and count how many waves fit across the screen.',
    q: 'The period is 2π / B. Set B = 2. What is the period now?',
    choices: ['π', '2π', '4π'],
    answer: 0,
    feedback:
      'Period = 2π / 2 = π. Doubling B squeezes each cycle into half the width, so you see twice as ' +
      'many waves. A bigger B means a shorter period (more cycles); a smaller B means a longer period ' +
      '(stretched-out waves). B changes the width only — never the height.',
  },
  {
    title: 'h — the phase shift',
    body:
      'The h dial slides the whole wave left and right. Notice h lives inside the parentheses, right ' +
      'next to x, exactly like the h in this lab’s parabola sibling y = a(x − h)² + k.',
    q: 'Set h = π/2. Which way does the wave slide?',
    choices: ['Right by π/2', 'Left by π/2', 'Up by π/2'],
    answer: 0,
    feedback:
      'It slides right by π/2, so the peak that sat at x = 0 now sits at x = h = π/2. Because x appears ' +
      'as (x − h), a positive h shifts in the positive direction — the minus sign tempts many students ' +
      'to guess left. The horizontal shift is exactly h, no matter what B is.',
  },
  {
    title: 'k — the midline',
    body:
      'The last dial, k, lifts or lowers the entire wave. k is added on the outside, so it raises the ' +
      'line the wave oscillates around — the midline, y = k.',
    q: 'With A = 1, set k = 1. Where is the midline, and where is the maximum?',
    choices: ['Midline y = 1, maximum 2', 'Midline y = 0, maximum 1', 'Midline y = 1, maximum 1'],
    answer: 0,
    feedback:
      'k = 1 lifts the midline to y = 1. Peaks and troughs stay |A| = 1 away from it, so the maximum is ' +
      'k + |A| = 2 and the minimum is k − |A| = 0. The wave now rides between y = 0 and y = 2, centred on ' +
      'its midline y = 1.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery wave is drawn as a dashed grey curve. Tune A, B, h, and k until your ' +
      'carmine wave lands exactly on top of it and the meter reads CALIBRATED. ' +
      'Tip: read amplitude = (max − min) / 2 and midline = (max + min) / 2 off the target first, then ' +
      'match its period and where a peak sits. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.  y = A·cos(B(x − h)) + k
   ------------------------------------------------------------------------- */
function model(x, p) {
  return p.a * Math.cos(p.b * (x - p.h)) + p.k;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. The cosine is bounded, so RMS is well behaved (no
   clamping needed, unlike the parabola's diverging arms). A reciprocal mapping
   turns RMS into a friendly 0–100% reading. Targets are drawn only from values
   the dials can land on exactly, so a perfect (RMS ≈ 0) match is always
   reachable — one grid step away in any single dial already lifts RMS well
   above the CALIBRATED threshold.
   ------------------------------------------------------------------------- */
function rmsError(p, t) {
  const N = 240;
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    const d = model(x, p) - model(x, t);
    s += d * d;
  }
  return Math.sqrt(s / (N + 1));
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.9)));
const MATCH_RMS = 0.08; // below this the curves are effectively identical -> CALIBRATED

function sameParams(u, v) {
  return (
    Math.abs(u.a - v.a) < 1e-6 &&
    Math.abs(u.b - v.b) < 1e-6 &&
    Math.abs(u.h - v.h) < 1e-6 &&
    Math.abs(u.k - v.k) < 1e-6
  );
}
function makeTarget(prev) {
  const As = [-2.5, -2, -1.5, -1, 1, 1.5, 2, 2.5];
  const Bs = [0.5, 1, 1.5, 2];
  const Hs = [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2];
  const Ks = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  let t;
  let tries = 0;
  do {
    t = { a: pick(As), b: pick(Bs), h: pick(Hs), k: pick(Ks) };
    tries++;
  } while (tries < 60 && ((prev && sameParams(t, prev)) || sameParams(t, START)));
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−), trimmed decimals, and π-aware
   labels so the x-axis and the phase/period read as fractions of π, not
   decimals of radians.
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
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}
/* Render v as a reduced multiple of π (e.g. "π/2", "−3π/2", "4π/3") when it is
   one to within tolerance; otherwise fall back to a trimmed decimal. */
function piLabel(v) {
  if (Math.abs(v) < 1e-9) return '0';
  const r = v / Math.PI;
  for (let d = 1; d <= 12; d++) {
    const n = Math.round(r * d);
    if (n !== 0 && Math.abs(r * d - n) < 1e-6) {
      const g = gcd(n, d);
      const nn = n / g;
      const dd = d / g;
      const sign = nn < 0 ? MINUS : '';
      const mag = Math.abs(nn);
      const num = mag === 1 ? 'π' : mag + 'π';
      return dd === 1 ? sign + num : sign + num + '/' + dd;
    }
  }
  return trim(v);
}

/* EDIT 5 — Equation display. Graphing form, with careful sign handling. */
function CosineEquation({ a, b, h, k }) {
  if (Math.abs(a) < 1e-9) {
    return <span>y = {k === 0 ? '0' : trim(k)}</span>;
  }
  const coef = Math.abs(Math.abs(a) - 1) < 1e-9 ? (a < 0 ? MINUS : '') : trim(a);
  const inner =
    Math.abs(h) < 1e-9 ? (
      <>x</>
    ) : (
      <>
        x&nbsp;{h > 0 ? MINUS : '+'}&nbsp;{piLabel(Math.abs(h))}
      </>
    );
  const cosBody =
    Math.abs(b - 1) < 1e-9 ? (
      inner
    ) : (
      <>
        {trim(b)}({inner})
      </>
    );
  const kpart =
    Math.abs(k) < 1e-9 ? null : (
      <>
        &nbsp;{k > 0 ? '+' : MINUS}&nbsp;{trim(Math.abs(k))}
      </>
    );
  return (
    <span>
      y = {coef}cos({cosBody}){kpart}
    </span>
  );
}

/* The same wave in expanded form y = A·cos(Bx + φ) + k, φ = −Bh — shown only
   when B ≠ 1 (when B = 1 it is identical to the graphing form). Connects the
   two conventions students meet in different textbooks. */
function expandedForm(a, b, h, k) {
  if (Math.abs(a) < 1e-9) return null;
  if (Math.abs(b - 1) < 1e-9) return null;
  const phi = -b * h;
  let s = 'y = ';
  s += (Math.abs(Math.abs(a) - 1) < 1e-9 ? (a < 0 ? MINUS : '') : trim(a)) + 'cos(' + trim(b) + 'x';
  if (Math.abs(phi) > 1e-9) s += ' ' + (phi > 0 ? '+' : MINUS) + ' ' + piLabel(Math.abs(phi));
  s += ')';
  if (Math.abs(k) > 1e-9) s += ' ' + (k > 0 ? '+' : MINUS) + ' ' + trim(Math.abs(k));
  return s;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function CosineFunctionLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [h, setH] = useState(START.h);
  const [k, setK] = useState(START.k);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [tracing, setTracing] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // world-x under the pointer, or null
  const tracerRef = useRef(null); // world-x of the sweeping tracer, or null
  const sceneRef = useRef({});

  const params = { a, b, h, k };
  const current = STEPS[step];

  // Keep a snapshot of everything the renderer needs, so draw() (a stable
  // callback) and the pointer/tracer handlers never read stale values.
  sceneRef.current = { a, b, h, k, calib: !!current.calib, target };

  const rms = target ? rmsError(params, target) : Infinity;
  const pct = target ? matchPercent(rms) : 0;
  const calibrated = target ? rms < MATCH_RMS : false;

  const expanded = expandedForm(a, b, h, k);

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
    const flat = Math.abs(p.a) < 1e-9;
    const QUARTER = Math.PI / 4;

    ctx.clearRect(0, 0, W, H);

    /* minor grid (quadrille paper): quarter-π columns, unit rows */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.9)';
    ctx.beginPath();
    for (let n = Math.ceil(WORLD.xmin / QUARTER); n * QUARTER <= WORLD.xmax + 1e-9; n++) {
      const X = Math.round(sx(n * QUARTER)) + 0.5;
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

    /* x tick labels every π/2, in π notation */
    ctx.fillStyle = 'rgba(91,107,123,0.95)';
    ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const HALF = Math.PI / 2;
    for (let n = Math.ceil(WORLD.xmin / HALF); n * HALF <= WORLD.xmax + 1e-9; n++) {
      const xv = n * HALF;
      if (n === 0 || xv <= WORLD.xmin + 1e-9 || xv >= WORLD.xmax - 1e-9) continue; // skip origin & edges
      ctx.fillText(piLabel(xv), sx(xv), sy(0) + 4);
    }
    /* y tick labels every 1 */
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let gy = Math.ceil(WORLD.ymin); gy <= WORLD.ymax; gy++) {
      if (gy === 0 || gy <= WORLD.ymin || gy >= WORLD.ymax) continue;
      ctx.fillText(String(gy), sx(0) - 6, sy(gy));
    }

    /* a plotter that samples one point per pixel and breaks the path when the
       curve leaves the window (defensive — the cosine stays in view here) */
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

    /* midline: dashed horizontal line at y = k (the line the wave rides on) */
    {
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(91,107,123,0.5)';
      ctx.setLineDash([4, 5]);
      const Y = Math.round(sy(p.k)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
      ctx.stroke();
      ctx.restore();
    }

    if (!flat) {
      const period = TAU / Math.abs(p.b);

      /* period bracket along the midline, spanning one full cycle from the key
         point — drawn on whichever side of x = h fits inside the window */
      let x0 = null;
      let x1 = null;
      if (p.h + period <= WORLD.xmax + 1e-6) {
        x0 = p.h;
        x1 = p.h + period;
      } else if (p.h - period >= WORLD.xmin - 1e-6) {
        x0 = p.h - period;
        x1 = p.h;
      }
      if (x0 !== null) {
        const X0 = sx(x0);
        const X1 = sx(x1);
        const Ym = Math.round(sy(p.k)) + 0.5;
        ctx.save();
        ctx.strokeStyle = 'rgba(91,107,123,0.75)';
        ctx.lineWidth = 1.3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(X0, Ym - 6);
        ctx.lineTo(X0, Ym + 6);
        ctx.moveTo(X1, Ym - 6);
        ctx.lineTo(X1, Ym + 6);
        ctx.moveTo(X0, Ym);
        ctx.lineTo(X1, Ym);
        ctx.stroke();
        const lbl = 'period ' + piLabel(period);
        const tw = ctx.measureText(lbl).width;
        let lx = (X0 + X1) / 2;
        lx = Math.min(Math.max(lx, tw / 2 + 5), W - tw / 2 - 5);
        const ly = Ym - 8;
        ctx.fillStyle = 'rgba(251,251,248,0.86)';
        ctx.fillRect(lx - tw / 2 - 3, ly - 13, tw + 6, 15);
        ctx.fillStyle = '#5b6b7b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(lbl, lx, ly);
        ctx.restore();
      }

      /* amplitude marker: a short vertical guide from the midline (h, k) up to
         the key point (h, k + A) — the height |A| made visible */
      const Xc = sx(p.h);
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.6)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(Xc, sy(p.k));
      ctx.lineTo(Xc, sy(p.k + p.a));
      ctx.stroke();
      ctx.restore();
    }

    /* the mathematical object — the one carmine accent */
    plot((x) => model(x, p), '#C81E4F', 2.75);

    /* key point: the start of a cycle at (h, k + A). With A > 0 it is a peak,
       with A < 0 a trough; either way cos(0) = 1 puts it k + A above/below.
       A carmine dot (it lives on the curve) with a paper-backed coordinate
       label on the outer side so it never sits on top of the wave. */
    if (!flat && p.h >= WORLD.xmin && p.h <= WORLD.xmax) {
      const vx = sx(p.h);
      const vy = sy(p.k + p.a);
      ctx.save();
      ctx.fillStyle = '#C81E4F';
      ctx.beginPath();
      ctx.arc(vx, vy, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
      const label = `(${piLabel(p.h)}, ${trim(p.k + p.a)})`;
      const peakUp = p.a > 0; // dot above the midline -> label above it
      const gap = 11;
      const tw = ctx.measureText(label).width;
      const boxH = 16;
      const half = tw / 2 + 4;
      const lx = Math.min(Math.max(vx, half), W - half); // keep it on-canvas
      const ly = peakUp ? vy - gap : vy + gap;
      const boxY = peakUp ? ly - boxH + 2 : ly - 2;
      ctx.fillStyle = 'rgba(251,251,248,0.85)';
      ctx.fillRect(lx - half, boxY, tw + 8, boxH);
      ctx.fillStyle = '#1C2B3A';
      ctx.textAlign = 'center';
      ctx.textBaseline = peakUp ? 'bottom' : 'top';
      ctx.fillText(label, lx, ly);
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
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [a, b, h, k, step, target, draw]);

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
    else if (key === 'h') setH(v);
    else setK(v);
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

  const dialVal = { a, b, h, k };

  return (
    <div className="clab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Cosine Function</h1>
        <p className="lede">
          Explore the wave in <span className="mono">graphing form, y = A·cos(B(x&nbsp;&minus;&nbsp;h))&nbsp;+&nbsp;k</span>.
          Each dial unlocks with the lesson, so you can see one idea at a time — amplitude, period,
          phase, midline — and finish by calibrating your wave onto a mystery target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <CosineEquation a={a} b={b} h={h} k={k} />
            </p>
            {expanded && <p className="equation-sub mono">{expanded}</p>}
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            <canvas
              ref={canvasRef}
              aria-label="Quadrille graph of y = A cosine of B times (x minus h) plus k, redrawn live as the dials change."
            />
            <span className="hint mono">hover the graph to read a point</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Amplitude</span>
              <span className="fact-v mono">{trim(Math.abs(a))}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Period</span>
              <span className="fact-v mono">{piLabel(TAU / Math.abs(b))}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Midline</span>
              <span className="fact-v mono">y = {trim(k)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Phase shift</span>
              <span className="fact-v mono">
                {Math.abs(h) < 1e-9 ? 'none' : `${piLabel(Math.abs(h))} ${h > 0 ? 'right' : 'left'}`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Maximum</span>
              <span className="fact-v mono">{trim(k + Math.abs(a))}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Minimum</span>
              <span className="fact-v mono">{trim(k - Math.abs(a))}</span>
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
              const val = dialVal[d.key];
              const shown = d.key === 'h' ? piLabel(val) : trim(val);
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
                  <span className="mono target-hint">target: A=?, B=?, h=?, k=?</span>
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
        <span className="mono">y = A·cos(B(x − h)) + k</span> &nbsp;·&nbsp; the general cosine, plotted
        live from the dials on a 16×10 quadrille window (x in radians).
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
          min-height: 22px;
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
          width: min(100%, 640px);
          aspect-ratio: 8 / 5;
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
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px 18px;
          margin: 14px 4px 4px;
        }
        @media (max-width: 560px) {
          .facts {
            grid-template-columns: 1fr 1fr;
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
