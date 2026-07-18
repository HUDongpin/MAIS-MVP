'use client';

/* ============================================================================
   TangentFunctionLab — an interactive "bench" for the tangent function
   in transformed form,  y = a·tan(b(x − h)) + k.

   Built for MAIS (math AI system, www.mais.hk), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   Why tangent is its own animal (and what this file gets right):
     • VERTICAL ASYMPTOTES. tan blows up where cos = 0. The plotter breaks the
       path at every asymptote so the curve never draws a false vertical line
       connecting the top of one branch to the bottom of the next.
     • A π-BASED x-AXIS. Ticks are labelled π/2, π, 3π/2 — the natural ruler for
       a trig function — while y stays on plain integers.
     • PERIOD, not amplitude. tan has no amplitude; b sets the period, π/|b|.
     • CLAMPED CALIBRATION. Because the arms run off to ±∞, the match meter
       clamps each residual so the near-asymptote spikes can't swamp it.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/TangentFunctionLab.jsx
     2. Import and render it:
          import TangentFunctionLab from './TangentFunctionLab';
          export default function Page() { return <TangentFunctionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, h, k, step).
     MODEL  — f(x) is pure math; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. A square window (equal x/y scale, so the base
   curve's slope of 1 at each centre really reads as 45°) that spans a little
   over three periods of the base function: asymptotes at ±π/2 and ±3π/2 both
   sit comfortably inside it.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -5, xmax: 5, ymin: -5, ymax: 5 };
const PI = Math.PI;

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Each dial names the letter it drives, its range/step,
   and the lesson step at which it unlocks. b stays positive so the lesson can
   isolate "period" cleanly — the sign flip is a's job.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'a', label: 'a', min: -3, max: 3, step: 0.25, unlock: 1, role: 'vertical stretch & flip' },
  { key: 'b', label: 'b', min: 0.5, max: 3, step: 0.25, unlock: 2, role: 'period  =  π ÷ b' },
  { key: 'h', label: 'h', min: -3, max: 3, step: 0.25, unlock: 3, role: 'left / right shift' },
  { key: 'k', label: 'k', min: -3, max: 3, step: 0.25, unlock: 4, role: 'up / down shift' },
];
const START = { a: 1, b: 1, h: 0, k: 0 };

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the tangent',
    body:
      'Tangent is a ratio: tan(x) = sin(x) ÷ cos(x). Wherever cos(x) = 0 the ratio is undefined, ' +
      'so instead of a smooth wave the graph is a chain of separate branches, each racing from ' +
      '−∞ up to +∞. Right now a = 1, b = 1, h = 0, k = 0, so you are looking at the plainest ' +
      'tangent of all, y = tan(x): it slips through the origin and repeats every π.',
    q: 'The curve rushes toward those dashed vertical lines but never touches them. What are they called?',
    choices: ['Vertical asymptotes', 'Roots', 'Vertices'],
    answer: 0,
    feedback:
      'They are vertical asymptotes. They stand exactly where cos(x) = 0 — at x = π/2, 3π/2, … — ' +
      'because dividing sin by zero is undefined. The curve gets infinitely close but never arrives.',
  },
  {
    title: 'a — steepness & flip',
    body:
      'The a dial is now live. Unlike a sine wave, tangent has no amplitude — it already reaches ' +
      'every height. Instead, a is a vertical stretch: it steepens or softens how fast each branch ' +
      'climbs.',
    q: 'Drag a from 1 up to 3. What happens between two neighbouring asymptotes?',
    choices: [
      'Each branch climbs more steeply — same asymptotes, just stretched vertically',
      'The gaps between the asymptotes get wider',
      'The whole graph slides up by 3',
    ],
    answer: 0,
    feedback:
      'a is a vertical stretch: bigger |a| makes each branch steeper, smaller |a| makes it lean over, ' +
      'but the asymptotes and the period never move. And a negative a flips every branch upside-down, ' +
      'so the curve runs downhill instead of up.',
  },
  {
    title: 'b — the period',
    body:
      'Now the b dial unlocks. This is the one that makes tangent different from a parabola: b ' +
      'squeezes the branches together or spreads them apart by changing the period. The base ' +
      'period is π.',
    q: 'Set b = 2. The branches pack twice as tightly. What is the new period?',
    choices: ['π/2', '2π', 'π — the period never changes'],
    answer: 0,
    feedback:
      'The period is π ÷ |b|, so b = 2 gives π/2. Each larger b crowds more branches (and more ' +
      'asymptotes) into the same width; b between 0 and 1 stretches them apart. The asymptotes now ' +
      'sit one period apart, every π/b.',
  },
  {
    title: 'h — the left/right shift',
    body:
      'The h dial slides the whole pattern sideways. Notice that h lives inside the parentheses, ' +
      'right next to x, as (x − h).',
    q: 'Increase h from 0 to about 1.5. Which way does the entire pattern move?',
    choices: [
      'Right, so the centre branch passes through x ≈ 1.5',
      'Left, toward x ≈ −1.5',
      'Straight up by 1.5',
    ],
    answer: 0,
    feedback:
      'It slides right. Because x appears as (x − h), a positive h shifts the graph in the positive ' +
      'direction — the minus sign fools many students into guessing left. The centre of a branch, and ' +
      'the asymptotes with it, all move together by h.',
  },
  {
    title: 'k — the up/down shift',
    body:
      'The last dial, k, is added on the outside, so it lifts or lowers the entire curve. The ' +
      'horizontal line the branches are centred on is called the midline.',
    q: 'Set k = 2. What happens to the centre points, where each branch crosses its midline?',
    choices: [
      'They rise to y = 2 — the whole midline lifts to y = k',
      'The branches get steeper',
      'The period doubles',
    ],
    answer: 0,
    feedback:
      'k raises the midline to y = k, carrying every centre point up with it. Because it is a purely ' +
      'vertical shift, it slides the curve up or down but leaves the vertical asymptotes exactly where ' +
      'they were — asymptotes depend on b and h, never on k.',
  },
  {
    title: 'Asymptotes & centres',
    body:
      'You control all four dials now. Look at the carmine dots on the midline: those are the centre ' +
      'points, where each branch crosses y = k with its steepest slope. Halfway between each pair of ' +
      'centres stands a dashed asymptote.',
    q: 'For y = a·tan(b(x − h)) + k, where do the vertical asymptotes fall?',
    choices: [
      'Wherever b(x − h) = π/2 + nπ  (the inside equals an odd multiple of π/2)',
      'Wherever x = h',
      'Wherever the curve equals k',
    ],
    answer: 0,
    feedback:
      'Asymptotes appear where the inside of the tangent hits an odd multiple of π/2 — that is where ' +
      'the underlying cosine is zero. Solving b(x − h) = π/2 + nπ gives x = h + (π/2 + nπ)/b, one every ' +
      'π/b. The centre points sit exactly between them, at x = h + nπ/b.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery tangent curve is drawn dashed in grey. Tune a, b, h, and k until ' +
      'your carmine curve lands exactly on top of it and the meter reads CALIBRATED. Match the ' +
      'spacing of the asymptotes first (that pins down b and h), then the steepness and height. ' +
      'Press "New target" for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.  y = a·tan(b(x − h)) + k
   JS Math.tan returns a huge (finite) value near an asymptote rather than
   Infinity; the renderer and the meter both guard against that.
   ------------------------------------------------------------------------- */
function model(x, p) {
  return p.a * Math.tan(p.b * (x - p.h)) + p.k;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. RMS curve-matching with every residual clamped: the
   arms of a tangent run to ±∞, so an unclamped square error would be dominated
   entirely by the handful of samples nearest the asymptotes. Clamping measures
   the shape where it is finite. A reciprocal mapping turns RMS into a friendly
   0–100 % reading; exact grid matches drive it to 0.
   ------------------------------------------------------------------------- */
function rmsError(p, t) {
  const N = 160;
  const CAP = 3; // clamp each residual so the near-asymptote spikes can't dominate
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    let d = model(x, p) - model(x, t);
    if (!isFinite(d)) d = CAP;
    else if (d > CAP) d = CAP;
    else if (d < -CAP) d = -CAP;
    s += d * d;
  }
  return Math.sqrt(s / (N + 1));
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.9)));
const MATCH_RMS = 0.22; // below this the curves are effectively identical -> CALIBRATED

function makeTarget(prev) {
  const snap = (v, st) => Math.round(v / st) * st;
  let t;
  do {
    // a on a 0.5 grid, kept away from ~0 so the branches are clearly steep or flipped
    const amag = snap(0.5 + Math.random() * 2, 0.5); // 0.5 … 2.5
    const a = +((Math.random() < 0.5 ? -1 : 1) * amag).toFixed(2);
    const b = +snap(0.5 + Math.random() * 2, 0.5).toFixed(2); // 0.5 … 2.5, recognisable periods
    const h = +snap(-1.5 + Math.random() * 3, 0.5).toFixed(2); // −1.5 … 1.5
    const k = +snap(-2 + Math.random() * 4, 0.5).toFixed(2); // −2 … 2
    t = { a, b, h, k };
  } while (
    (prev && t.a === prev.a && t.b === prev.b && t.h === prev.h && t.k === prev.k) ||
    (t.a === START.a && t.b === START.b && t.h === START.h && t.k === START.k) // never the starting curve
  );
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−) and trimmed decimals.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 100) / 100;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}

/* Label a tick that is an integer multiple of π/2, e.g. j=3 -> "3π/2", j=2 -> "π". */
function piHalfLabel(j) {
  if (j === 0) return '0';
  const sign = j < 0 ? MINUS : '';
  const a = Math.abs(j);
  if (a % 2 === 0) {
    const n = a / 2;
    return sign + (n === 1 ? 'π' : n + 'π');
  }
  return sign + (a === 1 ? 'π/2' : a + 'π/2');
}

/* EDIT 5 — Equation display. y = a·tan(b(x − h)) + k, with careful sign and
   identity-coefficient handling (a=±1 hides the 1, b=1 hides the 1, etc.). */
function tanEquation(a, b, h, k) {
  if (Math.abs(a) < 1e-9) return `y = ${k === 0 ? '0' : trim(k)}`; // degenerate: a flat line at k
  const coef = Math.abs(Math.abs(a) - 1) < 1e-9 ? (a < 0 ? MINUS : '') : trim(a) + ' ';
  let inner;
  if (Math.abs(b - 1) < 1e-9) {
    inner = h === 0 ? 'x' : `x ${h > 0 ? MINUS : '+'} ${trim(Math.abs(h))}`;
  } else {
    const bstr = trim(b);
    inner = h === 0 ? `${bstr}x` : `${bstr}(x ${h > 0 ? MINUS : '+'} ${trim(Math.abs(h))})`;
  }
  let s = `y = ${coef}tan(${inner})`;
  if (Math.abs(k) > 1e-9) s += ` ${k > 0 ? '+' : MINUS} ${trim(Math.abs(k))}`;
  return s;
}

/* The principal pair of asymptotes bracketing the central branch, plus the spacing. */
function describeAsymptotes(b, h) {
  const half = PI / (2 * b);
  return `x = ${trim(h - half)},  ${trim(h + half)}   (repeating every ${(PI / b).toFixed(2)})`;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TangentFunctionLab() {
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

  // Snapshot everything the renderer needs, so draw() (a stable callback) and
  // the pointer/tracer handlers never read stale values.
  sceneRef.current = { a, b, h, k, calib: !!current.calib, target };

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

    ctx.clearRect(0, 0, W, H);

    /* minor grid: vertical lines every π/4 (the natural trig ruler), horizontal
       lines every 1 unit — quadrille paper adapted to a trig axis */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.9)';
    ctx.beginPath();
    for (let m = Math.ceil(WORLD.xmin / (PI / 4)); m * (PI / 4) <= WORLD.xmax; m++) {
      const X = Math.round(sx(m * (PI / 4))) + 0.5;
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

    /* x tick labels at multiples of π/2 (π/2, π, 3π/2, …) */
    ctx.fillStyle = 'rgba(91,107,123,0.95)';
    ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let j = Math.ceil(WORLD.xmin / (PI / 2)); j * (PI / 2) <= WORLD.xmax; j++) {
      if (j === 0) continue; // origin handled by the y-axis labels
      const xv = j * (PI / 2);
      if (xv <= WORLD.xmin || xv >= WORLD.xmax) continue;
      ctx.fillText(piHalfLabel(j), sx(xv), sy(0) + 4);
    }
    /* y tick labels every 2 units */
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let gy = Math.ceil(WORLD.ymin / 2) * 2; gy <= WORLD.ymax; gy += 2) {
      if (gy === 0 || gy <= WORLD.ymin || gy >= WORLD.ymax) continue;
      ctx.fillText(String(gy), sx(0) - 6, sy(gy));
    }

    /* one-sample-per-pixel plotter. Two independent guards keep the tangent's
       asymptotes from ever drawing a false vertical line:
         1. lift the pen whenever the value leaves the (extended) window, and
         2. if two in-band samples jump more than 60 % of the canvas height
            apart, treat it as a branch crossing and move without drawing. */
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
        if (!isFinite(y) || y < WORLD.ymin - 1.5 || y > WORLD.ymax + 1.5) {
          pen = false;
          continue;
        }
        const X = sx(x);
        const Y = sy(y);
        if (!pen) {
          ctx.moveTo(X, Y);
          pen = true;
        } else if (Math.abs(Y - prevY) > H * 0.6) {
          ctx.moveTo(X, Y); // discontinuity across an asymptote — jump, don't connect
        } else {
          ctx.lineTo(X, Y);
        }
        prevY = Y;
      }
      ctx.stroke();
      ctx.restore();
    };

    /* target curve (calibration only) — dashed grey, drawn under the accent */
    if (S.calib && S.target) {
      plot((x) => model(x, S.target), 'rgba(91,107,123,0.85)', 2, [7, 6]);
    }

    /* vertical asymptotes: dashed grey lines where b(x − h) = π/2 + nπ */
    if (p.b > 1e-9) {
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(91,107,123,0.5)';
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      for (let n = -40; n <= 40; n++) {
        const xa = p.h + (PI / 2 + n * PI) / p.b;
        if (xa < WORLD.xmin || xa > WORLD.xmax) continue;
        const X = Math.round(sx(xa)) + 0.5;
        ctx.moveTo(X, 0);
        ctx.lineTo(X, H);
      }
      ctx.stroke();
      ctx.restore();
    }

    /* midline y = k: a faint dashed horizontal line (drawn only when shifted,
       so it doesn't just double the x-axis) */
    if (Math.abs(p.k) > 1e-9) {
      ctx.save();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(200,30,79,0.35)';
      ctx.setLineDash([2, 5]);
      const Y = Math.round(sy(p.k)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
      ctx.stroke();
      ctx.restore();
    }

    /* the mathematical object — the one carmine accent */
    plot((x) => model(x, p), '#C81E4F', 2.75);

    /* centre points: carmine dots where each branch crosses its midline,
       at x = h + nπ/b, y = k */
    if (p.b > 1e-9) {
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#C81E4F';
      ctx.fillStyle = '#FBFBF8';
      for (let n = -40; n <= 40; n++) {
        const xc = p.h + (n * PI) / p.b;
        if (xc < WORLD.xmin || xc > WORLD.xmax) continue;
        if (p.k < WORLD.ymin || p.k > WORLD.ymax) continue;
        ctx.beginPath();
        ctx.arc(sx(xc), sy(p.k), 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    /* hover readout: a dot on the curve + its coordinates (skipped near an
       asymptote, where the value is off-screen) */
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

    /* tracer: a point sweeping the curve, hidden while it is off-screen between
       branches so it never flies to the top of the canvas */
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
        ctx.moveTo(X, sy(p.k));
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

  const period = PI / Math.abs(b);

  return (
    <div className="tlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Tangent Function</h1>
        <p className="lede">
          Explore the transformed tangent,{' '}
          <span className="mono">y = a·tan(b(x&nbsp;&minus;&nbsp;h))&nbsp;+&nbsp;k</span>. Each dial
          unlocks with the lesson, so you meet one idea at a time — steepness, period, and the two
          shifts — then finish by calibrating your curve onto a mystery target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation mono">{tanEquation(a, b, h, k)}</p>
            <p className="equation-sub mono">
              period&nbsp;=&nbsp;π/{trim(Math.abs(b))}&nbsp;≈&nbsp;{period.toFixed(2)}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            <canvas
              ref={canvasRef}
              aria-label="Graph of y = a·tan(b(x − h)) + k on a π-scaled grid, redrawn live from the dials"
            />
            <span className="hint mono">hover the graph to read a point</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Period</span>
              <span className="fact-v mono">π/{trim(Math.abs(b))} ≈ {period.toFixed(2)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Midline</span>
              <span className="fact-v mono">y = {trim(k)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Centre points</span>
              <span className="fact-v mono">({trim(h)}, {trim(k)}) + n·(π/{trim(Math.abs(b))})</span>
            </div>
            <div className="fact">
              <span className="fact-k">Behaviour</span>
              <span className="fact-v">
                {Math.abs(a) < 1e-9
                  ? 'flat line (a = 0)'
                  : a > 0
                  ? 'increasing on each branch'
                  : 'decreasing · flipped (a < 0)'}
              </span>
            </div>
            <div className="fact wide">
              <span className="fact-k">Vertical asymptotes</span>
              <span className="fact-v mono">
                {Math.abs(a) < 1e-9 ? 'none — the curve is a flat line' : describeAsymptotes(b, h)}
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
        <span className="mono">y = a·tan(b(x − h)) + k</span> &nbsp;·&nbsp; the tangent function,
        plotted live on a π-scaled window with its asymptotes broken cleanly at every cos = 0.
      </footer>

      <style jsx>{`
        .tlab {
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
        :global(.tlab) :focus-visible {
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
