'use client';

/* ============================================================================
   QuadraticFunctionLab — an interactive "bench" for the quadratic function
   in vertex form,  y = a(x − h)² + k.

   Built for MAIS (math AI system, www.mais.hk), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/QuadraticFunctionLab.jsx
     2. Import and render it:
          import QuadraticFunctionLab from './QuadraticFunctionLab';
          export default function Page() { return <QuadraticFunctionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, h, k, lesson step).
     MODEL  — f(x) is pure math; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. Square window so x and y share one scale and
   the parabola is never distorted. Grid every 1 unit, labels every 2.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -8, xmax: 8, ymin: -8, ymax: 8 };

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Each dial names the letter it drives, its range/step,
   and the lesson step at which it unlocks.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'a', label: 'a', min: -2, max: 2, step: 0.05, unlock: 1, role: 'stretch & direction' },
  { key: 'h', label: 'h', min: -4, max: 4, step: 0.5, unlock: 2, role: 'left / right shift' },
  { key: 'k', label: 'k', min: -4, max: 4, step: 0.5, unlock: 3, role: 'up / down shift' },
];
const START = { a: 1, h: 0, k: 0 };

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the parabola',
    body:
      'Every quadratic function graphs to a parabola — a perfectly symmetric U. ' +
      'We write it in vertex form, y = a(x − h)² + k, and unlock one dial at a time so ' +
      'you can see exactly what each letter does. Right now a = 1, h = 0, k = 0, so you are ' +
      'looking at the simplest parabola of all, y = x².',
    q: 'The single point at the very bottom of this curve has a special name. What is it?',
    choices: ['The vertex', 'The root', 'The slope'],
    answer: 0,
    feedback:
      'That lowest point — here (0, 0) — is the vertex. In vertex form it always sits exactly ' +
      'at (h, k), which is what makes this form so easy to read.',
  },
  {
    title: 'a — direction & width',
    body:
      'The a dial is now live. Drag it and watch the curve stretch, then flip over as a passes ' +
      'through zero.',
    q: 'a is 1 and the parabola opens upward. What happens when you make a negative?',
    choices: ['It flips over to open downward', 'It slides to the left', 'It only gets wider, still opening up'],
    answer: 0,
    feedback:
      'The sign of a sets the direction: a > 0 opens upward (the vertex is the lowest point); ' +
      'a < 0 opens downward (the vertex becomes the highest point). The size |a| sets the width — ' +
      '|a| > 1 is narrower and steeper, and 0 < |a| < 1 is wider and flatter.',
  },
  {
    title: 'h — the left/right shift',
    body:
      'Now the h dial is unlocked. Notice that h lives inside the parentheses, right next to x.',
    q: 'Increase h from 0 to 3. Which way does the whole parabola move?',
    choices: ['Right, so the vertex is at x = 3', 'Left, to x = −3', 'Straight up by 3 units'],
    answer: 0,
    feedback:
      'It slides right, so the vertex sits at x = h. Because x appears as (x − h), a positive h ' +
      'shifts the graph in the positive direction — the minus sign fools many students into ' +
      'guessing left. Keep an eye on the vertex: its x-coordinate always equals h.',
  },
  {
    title: 'k — the up/down shift',
    body:
      'The last dial, k, moves the curve straight up and down. k is added on the outside of the ' +
      'square, so it lifts or lowers the entire parabola.',
    q: 'Set a = 1, h = 0, and k = −4. Where does the parabola now cross the x-axis?',
    choices: ['At x = −2 and x = 2', 'It stays above the axis and never crosses', 'Only at x = 0'],
    answer: 0,
    feedback:
      'Dropping the vertex to (0, −4) pushes both arms through the axis. Solving 0 = x² − 4 gives ' +
      'x = ±2 — the two roots. A parabola meets the x-axis wherever a(x − h)² + k = 0 has real ' +
      'solutions.',
  },
  {
    title: 'Symmetry & roots',
    body:
      'You control all three dials now. Look at the dashed vertical line running through the ' +
      'vertex — that is the axis of symmetry, the mirror line of the parabola.',
    q: 'What is the equation of a parabola’s axis of symmetry?',
    choices: ['x = h', 'y = k', 'x = 0, always'],
    answer: 0,
    feedback:
      'The parabola is a perfect mirror image across the vertical line x = h. Whenever there are ' +
      'two roots, they land the same distance to the left and right of this line — that balance ' +
      'is exactly why the quadratic formula carries its ± sign.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery parabola is drawn as a dashed grey curve. Tune a, h, and k until ' +
      'your carmine curve lands exactly on top of it and the meter reads CALIBRATED. Press ' +
      '“New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.  y = a(x − h)² + k
   ------------------------------------------------------------------------- */
function model(x, p) {
  return p.a * (x - p.h) * (x - p.h) + p.k;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. RMS curve-matching with the diverging tails clamped
   (a parabola's arms blow up, so unclamped RMS would swamp the meter). A
   reciprocal mapping turns RMS into a friendly 0–100% reading.
   ------------------------------------------------------------------------- */
function rmsError(p, t) {
  const N = 140;
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
  do {
    const mag = snap(0.4 + Math.random() * 1.6, 0.05); // 0.4 … 2.0
    const a = +((Math.random() < 0.5 ? -1 : 1) * mag).toFixed(2);
    const h = +snap(-3 + Math.random() * 6, 0.5).toFixed(1);
    const k = +snap(-3 + Math.random() * 6, 0.5).toFixed(1);
    t = { a, h, k };
  } while (
    (prev && t.a === prev.a && t.h === prev.h && t.k === prev.k) ||
    (t.a === START.a && t.h === START.h && t.k === START.k) // never hand back the starting curve
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

/* EDIT 5 — Equation display. Vertex form, with careful sign handling. */
function VertexEquation({ a, h, k }) {
  if (Math.abs(a) < 1e-9) {
    return (
      <span>
        y = {k === 0 ? '0' : trim(k)}
      </span>
    );
  }
  const coef = Math.abs(Math.abs(a) - 1) < 1e-9 ? (a < 0 ? MINUS : '') : trim(a);
  const inner =
    h === 0 ? (
      <>x</>
    ) : (
      <>
        x&nbsp;{h > 0 ? MINUS : '+'}&nbsp;{trim(Math.abs(h))}
      </>
    );
  const squared =
    h === 0 ? (
      <>
        x<sup>2</sup>
      </>
    ) : (
      <>
        ({inner})<sup>2</sup>
      </>
    );
  const kpart =
    k === 0 ? null : (
      <>
        &nbsp;{k > 0 ? '+' : MINUS}&nbsp;{trim(Math.abs(k))}
      </>
    );
  return (
    <span>
      y = {coef}
      {squared}
      {kpart}
    </span>
  );
}

/* The same curve in standard form y = ax² + bx + c, to connect the two forms. */
function standardForm(a, h, k) {
  if (Math.abs(a) < 1e-9) return `y = ${trim(k)}`;
  const b = -2 * a * h;
  const c = a * h * h + k;
  let s = 'y = ';
  s += (Math.abs(Math.abs(a) - 1) < 1e-9 ? (a < 0 ? MINUS : '') : trim(a)) + 'x²';
  if (Math.abs(b) > 1e-9) s += ` ${b > 0 ? '+' : MINUS} ${trim(Math.abs(b))}x`;
  if (Math.abs(c) > 1e-9) s += ` ${c > 0 ? '+' : MINUS} ${trim(Math.abs(c))}`;
  return s;
}

/* Roots (x-intercepts), described in words as well as values. */
function describeRoots(a, h, k) {
  if (Math.abs(a) < 1e-9) return 'a = 0 makes a line, not a parabola';
  const disc = -k / a;
  if (disc > 1e-9) {
    const r = Math.sqrt(disc);
    return `x = ${trim(h - r)}  and  x = ${trim(h + r)}`;
  }
  if (Math.abs(disc) <= 1e-9) return `x = ${trim(h)}  (one double root)`;
  return `none — the parabola sits entirely ${a > 0 ? 'above' : 'below'} the x-axis`;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function QuadraticFunctionLab() {
  const [a, setA] = useState(START.a);
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

  const params = { a, h, k };
  const current = STEPS[step];

  // Keep a snapshot of everything the renderer needs, so draw() (a stable
  // callback) and the pointer/tracer handlers never read stale values.
  sceneRef.current = { a, h, k, calib: !!current.calib, target };

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
    const p = { a: S.a, h: S.h, k: S.k };

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
    if (Math.abs(p.a) > 1e-9) {
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(91,107,123,0.55)';
      ctx.setLineDash([4, 5]);
      const X = Math.round(sx(p.h)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
      ctx.stroke();
      ctx.restore();
    }

    /* the mathematical object — the one carmine accent */
    plot((x) => model(x, p), '#C81E4F', 2.75);

    /* roots (x-intercepts) as open carmine circles on the axis */
    if (Math.abs(p.a) > 1e-9) {
      const disc = -p.k / p.a;
      if (disc >= 0) {
        const r = Math.sqrt(disc);
        const xs = r < 1e-9 ? [p.h] : [p.h - r, p.h + r];
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#C81E4F';
        ctx.fillStyle = '#FBFBF8';
        for (const xr of xs) {
          if (xr < WORLD.xmin || xr > WORLD.xmax) continue;
          ctx.beginPath();
          ctx.arc(sx(xr), sy(0), 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    /* vertex marker + label. The label goes on the parabola's OPEN side —
       below an upward parabola, above a downward one — so it lands in the
       empty region and never collides with the rising arms. A soft paper
       backing keeps it legible over the grid and axis-of-symmetry line. */
    if (Math.abs(p.a) > 1e-9 && p.h >= WORLD.xmin && p.h <= WORLD.xmax) {
      const vx = sx(p.h);
      const vy = sy(p.k);
      ctx.save();
      ctx.fillStyle = '#C81E4F';
      ctx.beginPath();
      ctx.arc(vx, vy, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
      const label = `(${trim(p.h)}, ${trim(p.k)})`;
      const opensUp = p.a > 0; // arms rise on screen -> the empty side is below
      const gap = 11;
      const tw = ctx.measureText(label).width;
      const boxH = 16;
      const half = tw / 2 + 4;
      const lx = Math.min(Math.max(vx, half), W - half); // keep it on-canvas
      const ly = opensUp ? vy + gap : vy - gap;
      const boxY = opensUp ? ly - 2 : ly - boxH + 2;
      ctx.fillStyle = 'rgba(251,251,248,0.85)';
      ctx.fillRect(lx - half, boxY, tw + 8, boxH);
      ctx.fillStyle = '#1C2B3A';
      ctx.textAlign = 'center';
      ctx.textBaseline = opensUp ? 'top' : 'bottom';
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
  }, [a, h, k, step, target, draw]);

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

  return (
    <div className="qlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Quadratic Function</h1>
        <p className="lede">
          Explore the parabola in <span className="mono">vertex form, y = a(x&nbsp;&minus;&nbsp;h)²&nbsp;+&nbsp;k</span>.
          Each dial unlocks with the lesson, so you can see one idea at a time — and finish by
          calibrating your curve onto a mystery target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <VertexEquation a={a} h={h} k={k} />
            </p>
            <p className="equation-sub mono">{standardForm(a, h, k)}</p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">hover the graph to read a point</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Vertex</span>
              <span className="fact-v mono">
                {Math.abs(a) < 1e-9 ? '—' : `(${trim(h)}, ${trim(k)})`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Axis of symmetry</span>
              <span className="fact-v mono">{Math.abs(a) < 1e-9 ? '—' : `x = ${trim(h)}`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Opens</span>
              <span className="fact-v">
                {Math.abs(a) < 1e-9
                  ? 'a line (a = 0)'
                  : a > 0
                  ? 'up · vertex is the minimum'
                  : 'down · vertex is the maximum'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Roots (x-intercepts)</span>
              <span className="fact-v mono">{describeRoots(a, h, k)}</span>
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
              const val = { a, h, k }[d.key];
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
                <span className="mono">
                  match&nbsp;{pct.toFixed(0)}%
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    target: a=?, h=?, k=?
                  </span>
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
        <span className="mono">y = a(x − h)² + k</span> &nbsp;·&nbsp; vertex form of the quadratic
        function, plotted live from the dials on a 16×16 quadrille window.
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
