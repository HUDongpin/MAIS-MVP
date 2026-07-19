'use client';

/* ============================================================================
   LineFunctionLab — an interactive "bench" for the linear function in
   slope-intercept form,  y = m·x + b.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   The signature centerpiece is the SLOPE TRIANGLE — the line's analogue of the
   ellipse "string" or the circle "radius triangle": it draws a right triangle
   whose hypotenuse rides the line, so a student SEES that
        slope  =  rise / run
   is the same ratio everywhere on the line. That is why the graph is straight.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/LineFunctionLab.jsx
     2. Import and render it:
          import LineFunctionLab from './LineFunctionLab';
          export default function Page() { return <LineFunctionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (m, b, lesson step).
     MODEL  — f(x) is pure math; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. A square window so x and y share one scale and
   a slope of 1 truly looks like 45°. Grid every 1 unit, labels every 2.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -8, xmax: 8, ymin: -8, ymax: 8 };

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Each dial names the letter it drives, its range/step,
   and the lesson step at which it unlocks. A line needs just two: slope and
   intercept.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'm', label: 'm', min: -3, max: 3, step: 0.25, unlock: 1, role: 'slope · steepness & direction' },
  { key: 'b', label: 'b', min: -4, max: 4, step: 0.5, unlock: 2, role: 'y-intercept · up / down shift' },
];
const START = { m: 1, b: 0 };

const TRIANGLE_STEP = 3; // the "slope = rise / run" step; the triangle auto-appears here
const TRI_RUN = 2;       // the horizontal run used to draw the slope triangle

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the line',
    body:
      'A linear function graphs to a perfectly straight line. We write it in slope-intercept ' +
      'form, y = m·x + b, and unlock one dial at a time so you can see exactly what each letter ' +
      'does. Right now m = 1 and b = 0, so you are looking at the simplest line of all, y = x.',
    q: 'In y = m·x + b, which letter controls how STEEP the line is?',
    choices: ['m — the slope', 'b — the intercept', 'Neither; steepness is fixed'],
    answer: 0,
    feedback:
      'm is the slope — it sets the steepness and the tilt direction. b is the y-intercept, the ' +
      'height where the line crosses the y-axis. A line is “linear” because it climbs at a ' +
      'constant rate: equal steps sideways always give equal steps up or down.',
  },
  {
    title: 'm — the slope',
    body:
      'The m dial is now live. Drag it and watch the line pivot about the point where it crosses ' +
      'the y-axis. Bigger |m| tilts it steeper; the sign of m flips its direction.',
    q: 'Make m negative. What happens to the line?',
    choices: [
      'It tilts downhill — falls from left to right',
      'It slides straight down the page',
      'It gets steeper but still rises to the right',
    ],
    answer: 0,
    feedback:
      'The SIGN of m sets the direction: m > 0 rises left-to-right (uphill), m < 0 falls (downhill), ' +
      'and m = 0 is perfectly flat. The SIZE |m| sets the steepness — |m| > 1 is steep, and ' +
      '0 < |m| < 1 is gentle. Notice the line pivots about its y-intercept; it does not just slide.',
  },
  {
    title: 'b — the y-intercept',
    body:
      'Now the b dial is unlocked. b lifts or lowers the whole line without changing its tilt — ' +
      'the slope stays exactly the same.',
    q: 'Set b = 3. Through which point does the line now cross the y-axis?',
    choices: ['(0, 3)', '(3, 0)', '(3, 3)'],
    answer: 0,
    feedback:
      'It crosses at (0, 3). Put x = 0 into y = m·x + b and you always get y = b, so the ' +
      'y-intercept is the point (0, b). Changing b slides the line vertically; the slope never ' +
      'moves. Don’t confuse it with the x-intercept (3, 0), which is where the line meets the ' +
      'x-axis instead.',
  },
  {
    title: 'Slope = rise ÷ run',
    body:
      'The slope triangle shows what m really means. Start anywhere on the line, step across by ' +
      'the RUN, then up or down by the RISE to land back on the line. The slope is their ratio, ' +
      'and it is the same no matter which two points you pick.',
    q: 'On this line, moving exactly 1 unit to the right changes the height by…',
    choices: ['m units (up if m > 0, down if m < 0)', 'exactly 1 unit', 'b units'],
    answer: 0,
    feedback:
      'Slope = rise ÷ run. For a run of 1 the rise is exactly m — that is the meaning of the ' +
      'number. Careful: it is rise OVER run, not run over rise (a classic mix-up). Because the ' +
      'ratio is constant everywhere, the graph never bends — it stays straight.',
  },
  {
    title: 'Intercepts & special lines',
    body:
      'The line meets the x-axis at the x-intercept, where y = 0, so x = −b ÷ m. Two special ' +
      'cases are worth knowing before the final challenge.',
    q: 'Which of these lines can NOT be written in the form y = m·x + b?',
    choices: [
      'A vertical line, x = 4',
      'A horizontal line, y = 4',
      'A line through the origin, y = 2x',
    ],
    answer: 0,
    feedback:
      'A vertical line x = 4 has an UNDEFINED slope (its run is 0, and you cannot divide by 0), so ' +
      'it fails the vertical-line test and is not even a function — it can never be y = m·x + b. A ' +
      'horizontal line is just m = 0, giving y = b. And parallel lines are exactly the lines that ' +
      'share the same slope m.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery line is drawn dashed and grey. Tune m and b until your carmine ' +
      'line lands exactly on top of it and the meter reads CALIBRATED. Press “New target” for a ' +
      'fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.  y = m·x + b
   ------------------------------------------------------------------------- */
function model(x, p) {
  return p.m * x + p.b;
}

/* The slope triangle: two points a run of RUN apart on the line, chosen so the
   whole right triangle stays comfortably inside the window (centered on the
   line's crossing when it can be, otherwise scanned for the best fit). Pure
   geometry — returns world coordinates only. */
function slopeTriangle(m, b, run) {
  const padX = 1.2;
  const padY = 1.2;
  const xLo = WORLD.xmin + padX;
  const xHi = WORLD.xmax - padX - run;
  const yLo = WORLD.ymin + padY;
  const yHi = WORLD.ymax - padY;

  // Ideal base x: put the run leg symmetrically around the x-intercept, so the
  // triangle straddles y = 0 and reads cleanly. For near-flat lines the
  // x-intercept runs off to infinity, so just center the run on the y-axis.
  let x1 = Math.abs(m) < 0.15 ? -run / 2 : -b / m - run / 2;
  x1 = Math.min(Math.max(x1, xLo), xHi);

  const fits = (xx) => {
    const ya = m * xx + b;
    const yb = m * (xx + run) + b;
    return Math.min(ya, yb) >= yLo && Math.max(ya, yb) <= yHi;
  };
  if (!fits(x1)) {
    // Coarse scan for the base x with the least out-of-window overflow.
    let best = x1;
    let bestPen = Infinity;
    for (let xx = xLo; xx <= xHi; xx += 0.2) {
      const ya = m * xx + b;
      const yb = m * (xx + run) + b;
      const pen = Math.max(0, yLo - Math.min(ya, yb)) + Math.max(0, Math.max(ya, yb) - yHi);
      if (pen < bestPen) {
        bestPen = pen;
        best = xx;
      }
    }
    x1 = best;
  }

  const x2 = x1 + run;
  const y1 = m * x1 + b;
  const y2 = m * x2 + b;
  return { p1: [x1, y1], corner: [x2, y1], p3: [x2, y2], rise: y2 - y1, run };
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A line does not blow up inside a finite window, so a
   plain RMS is stable (no clamping needed, unlike the parabola/tangent). RMS
   still scales with the line's magnitude, so the meter mapping is tuned for
   this model: a single dial one step off already reads far below CALIBRATED.
   ------------------------------------------------------------------------- */
function rmsError(p, t) {
  const N = 160;
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    const d = model(x, p) - model(x, t); // (Δm)x + (Δb)
    s += d * d;
  }
  return Math.sqrt(s / (N + 1));
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.8)));
const MATCH_RMS = 0.05; // below this the two lines are effectively identical -> CALIBRATED

function makeTarget(prev) {
  const snap = (v, st) => Math.round(v / st) * st;
  let t;
  do {
    const mMag = snap(0.5 + Math.random() * 2, 0.25); // 0.5 … 2.5
    const m = +((Math.random() < 0.5 ? -1 : 1) * mMag).toFixed(2);
    const b = +snap(-3.5 + Math.random() * 7, 0.5).toFixed(1); // −3.5 … 3.5
    t = { m, b };
  } while (
    (prev && t.m === prev.m && t.b === prev.b) ||
    (t.m === START.m && t.b === START.b) // never hand back the starting line
  );
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−), trimmed decimals.
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

/* EDIT 5 — Equation display. Slope-intercept form, with careful sign handling
   for m = ±1 and b = 0. */
function SlopeInterceptEquation({ m, b }) {
  if (Math.abs(m) < 1e-9) {
    return <span>y = {b === 0 ? '0' : trim(b)}</span>;
  }
  const mPart =
    Math.abs(Math.abs(m) - 1) < 1e-9 ? (m < 0 ? <>{MINUS}x</> : <>x</>) : <>{trim(m)}x</>;
  const bPart =
    b === 0 ? null : (
      <>
        &nbsp;{b > 0 ? '+' : MINUS}&nbsp;{trim(Math.abs(b))}
      </>
    );
  return (
    <span>
      y = {mPart}
      {bPart}
    </span>
  );
}

/* The same line in standard (general) form Ax + By = C with integer coeffs —
   a real Algebra-1 skill: connecting slope-intercept to standard form. m is a
   multiple of 0.25 and b of 0.5, so scaling by 4 clears every fraction. */
function standardForm(m, b) {
  if (Math.abs(m) < 1e-9) return `y = ${trim(b)}`; // horizontal: keep it clean
  let A = Math.round(-4 * m);
  let B = 4;
  let C = Math.round(4 * b);
  const g = gcd(gcd(A, B), C);
  A /= g;
  B /= g;
  C /= g;
  if (A < 0 || (A === 0 && B < 0)) {
    A = -A;
    B = -B;
    C = -C;
  }
  const term = (coef, name, first) => {
    if (coef === 0) return '';
    const mag = Math.abs(coef);
    const body = (mag === 1 ? '' : String(mag)) + name;
    if (first) return (coef < 0 ? MINUS : '') + body;
    return ` ${coef < 0 ? MINUS : '+'} ${body}`;
  };
  const aStr = term(A, 'x', true);
  const bStr = term(B, 'y', aStr === '');
  const lhs = (aStr + bStr) || '0';
  return `${lhs} = ${trim(C)}`;
}

/* Direction & intercept descriptions for the facts panel. */
function directionText(m) {
  if (Math.abs(m) < 1e-9) return 'horizontal · constant height';
  return m > 0 ? 'rising · uphill left → right' : 'falling · downhill left → right';
}
function xInterceptText(m, b) {
  if (Math.abs(m) < 1e-9) {
    return Math.abs(b) < 1e-9 ? 'every x (this is the x-axis)' : 'none — horizontal line';
  }
  return `(${trim(-b / m)}, 0)`;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function LineFunctionLab() {
  const [m, setM] = useState(START.m);
  const [b, setB] = useState(START.b);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [tracing, setTracing] = useState(false);
  const [showTri, setShowTri] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // world-x under the pointer, or null
  const tracerRef = useRef(null); // world-x of the sweeping tracer, or null
  const sceneRef = useRef({});

  const params = { m, b };
  const current = STEPS[step];
  const calib = !!current.calib;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer/tracer handlers never read stale values.
  sceneRef.current = { m, b, calib, target, showTri: showTri && !calib };

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
    const p = { m: S.m, b: S.b };

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

    /* a plotter that samples one point per pixel and breaks the path when the
       curve leaves the window (a steep line correctly exits the top/bottom) */
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

    /* target line (calibration only) — dashed grey, drawn under the accent */
    if (S.calib && S.target) {
      plot((x) => model(x, S.target), 'rgba(91,107,123,0.85)', 2, [7, 6]);
    }

    /* ---- the slope triangle (centerpiece) — legs drawn UNDER the line ---- */
    let tri = null;
    if (S.showTri) {
      tri = slopeTriangle(p.m, p.b, TRI_RUN);
      const P1 = [sx(tri.p1[0]), sy(tri.p1[1])];
      const CN = [sx(tri.corner[0]), sy(tri.corner[1])];
      const P3 = [sx(tri.p3[0]), sy(tri.p3[1])];

      ctx.save();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(91,107,123,0.95)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); // run leg (horizontal)
      ctx.moveTo(P1[0], P1[1]);
      ctx.lineTo(CN[0], CN[1]);
      ctx.stroke();
      ctx.beginPath(); // rise leg (vertical)
      ctx.moveTo(CN[0], CN[1]);
      ctx.lineTo(P3[0], P3[1]);
      ctx.stroke();
      ctx.setLineDash([]);

      // right-angle marker, opening into the triangle interior
      const hxDir = P1[0] < CN[0] ? -1 : 1; // toward P1 (the run leg)
      const vyDir = P3[1] < CN[1] ? -1 : 1; // toward P3 (the rise leg)
      const rq = 9;
      ctx.beginPath();
      ctx.moveTo(CN[0] + hxDir * rq, CN[1]);
      ctx.lineTo(CN[0] + hxDir * rq, CN[1] + vyDir * rq);
      ctx.lineTo(CN[0], CN[1] + vyDir * rq);
      ctx.stroke();
      ctx.restore();
      // (points, leg labels, and the readout are drawn on top, below the line)
    }

    /* the mathematical object — the one carmine accent */
    plot((x) => model(x, p), '#C81E4F', 2.75);

    /* intercept markers (hidden during calibration so the two lines compete) */
    if (!S.calib) {
      // x-intercept: open carmine circle on the x-axis
      if (Math.abs(p.m) > 1e-9) {
        const xr = -p.b / p.m;
        if (xr >= WORLD.xmin && xr <= WORLD.xmax) {
          ctx.save();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#C81E4F';
          ctx.fillStyle = '#FBFBF8';
          ctx.beginPath();
          ctx.arc(sx(xr), sy(0), 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
      // y-intercept: filled carmine dot + label, placed on the line's empty side
      if (p.b >= WORLD.ymin && p.b <= WORLD.ymax) {
        const ix = sx(0);
        const iy = sy(p.b);
        ctx.save();
        ctx.fillStyle = '#C81E4F';
        ctx.beginPath();
        ctx.arc(ix, iy, 4.5, 0, Math.PI * 2);
        ctx.fill();

        if (!S.showTri) {
          // only label when the slope triangle isn't already crowding this area
          ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
          const label = `(0, ${trim(p.b)})`;
          const tw = ctx.measureText(label).width;
          const below = p.m >= 0; // line rises right -> below-right is empty
          const lx = Math.min(ix + 9, W - tw - 6);
          const ly = below ? iy + 8 : iy - 8 - 14;
          ctx.fillStyle = 'rgba(251,251,248,0.85)';
          ctx.fillRect(lx - 3, ly - 1, tw + 6, 16);
          ctx.fillStyle = '#1C2B3A';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(label, lx, ly);
        }
        ctx.restore();
      }
    }

    /* slope-triangle labels, endpoint dots, and the rise/run readout (on top) */
    if (S.showTri && tri) {
      const P1 = [sx(tri.p1[0]), sy(tri.p1[1])];
      const CN = [sx(tri.corner[0]), sy(tri.corner[1])];
      const P3 = [sx(tri.p3[0]), sy(tri.p3[1])];
      const vyDir = P3[1] < CN[1] ? -1 : 1;
      const hxDir = P1[0] < CN[0] ? -1 : 1;

      // endpoint dots (the two chosen points on the line)
      ctx.save();
      ctx.fillStyle = '#1C2B3A';
      for (const P of [P1, P3]) {
        ctx.beginPath();
        ctx.arc(P[0], P[1], 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const paperLabel = (text, cx, cy, align, baseline) => {
        ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
        const tw = ctx.measureText(text).width;
        let bx = cx;
        if (align === 'center') bx = cx - tw / 2;
        else if (align === 'right') bx = cx - tw;
        let by = cy;
        if (baseline === 'middle') by = cy - 7;
        else if (baseline === 'bottom') by = cy - 14;
        ctx.fillStyle = 'rgba(251,251,248,0.9)';
        ctx.fillRect(bx - 3, by - 1, tw + 6, 16);
        ctx.fillStyle = '#1C2B3A';
        ctx.textAlign = align;
        ctx.textBaseline = 'top';
        ctx.fillText(text, cx, by);
      };

      // "run" label: centered under the run leg, on the side away from interior
      const runMidX = (P1[0] + CN[0]) / 2;
      paperLabel(`run = ${trim(tri.run)}`, runMidX, CN[1] - vyDir * 16, 'center', 'top');
      // "rise" label: beside the rise leg, on the side away from interior
      const riseMidY = (CN[1] + P3[1]) / 2;
      const riseX = CN[0] - hxDir * 8;
      paperLabel(
        `rise = ${trim(tri.rise)}`,
        riseX,
        riseMidY,
        hxDir < 0 ? 'left' : 'right',
        'middle'
      );

      // top-left readout: slope = rise / run = m
      ctx.save();
      ctx.font = '600 12.5px ui-monospace, "SF Mono", Menlo, monospace';
      const read = `slope = rise / run = ${trim(tri.rise)} / ${trim(tri.run)} = ${trim(p.m)}`;
      const tw = ctx.measureText(read).width;
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(10, 10, tw + 14, 22);
      ctx.strokeStyle = 'rgba(200,30,79,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(10.5, 10.5, tw + 13, 21);
      ctx.fillStyle = '#C81E4F';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(read, 17, 22);
      ctx.restore();
    }

    /* hover readout: a dot on the line + its coordinates */
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

    /* tracer: a point sweeping the line, showing it as a locus of (x, m·x + b) */
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
  }, [m, b, step, target, showTri, draw]);

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

  /* the slope triangle auto-appears on its lesson step (still user-toggleable) */
  useEffect(() => {
    if (step === TRIANGLE_STEP) setShowTri(true);
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
    const DURATION = 2400;
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
    if (key === 'm') setM(v);
    else setB(v);
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
    setM(START.m);
    setB(START.b);
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

  const spoken =
    `Line y = ${trim(m)} x ${b >= 0 ? 'plus' : 'minus'} ${trim(Math.abs(b))}. ` +
    `Slope ${trim(m)}, ${directionText(m)}. y-intercept at 0, ${trim(b)}.`;

  return (
    <div className="llab">
      <header className="head">
        <h1>The Linear Function</h1>
        <p className="lede">
          Explore the straight line in{' '}
          <span className="mono">slope-intercept form, y = m·x&nbsp;+&nbsp;b</span>. Each dial
          unlocks with the lesson, so you meet one idea at a time — see how slope is{' '}
          <em>rise ÷ run</em>, then finish by calibrating your line onto a mystery target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <SlopeInterceptEquation m={m} b={b} />
            </p>
            <p className="equation-sub mono">{standardForm(m, b)}</p>
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
            <span className="hint mono">hover the line to read a point</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — the two lines match.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Slope m</span>
              <span className="fact-v mono">
                {trim(m)}
                {Math.abs(m) > 1e-9 ? '  (rise ÷ run)' : ''}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">y-intercept</span>
              <span className="fact-v mono">(0, {trim(b)})</span>
            </div>
            <div className="fact">
              <span className="fact-k">x-intercept</span>
              <span className="fact-v mono">{xInterceptText(m, b)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Direction</span>
              <span className="fact-v">{directionText(m)}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (tracing ? ' on' : '')}
              onClick={() => setTracing((t) => !t)}
            >
              {tracing ? 'Tracing…' : 'Trace the line'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showTri && !calib ? ' on' : '')}
              onClick={() => setShowTri((t) => !t)}
              aria-pressed={showTri && !calib}
              disabled={calib}
            >
              {showTri ? 'Hide slope triangle' : 'Slope triangle'}
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
              const val = { m, b }[d.key];
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
                  <span className="mono target-hint">target: m=?, b=?</span>
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
                  setShowTri(false);
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
        <span className="mono">y = m·x + b</span> &nbsp;·&nbsp; slope-intercept form of the linear
        function, plotted live from the dials on a 16×16 quadrille window.
      </footer>

      <style jsx>{`
        .llab {
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
        :global(.llab) :focus-visible {
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
