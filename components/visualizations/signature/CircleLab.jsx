'use client';

/* ============================================================================
   CircleLab — an interactive "bench" for the circle in center-radius form,

        (x − h)²  +  (y − k)²  =  r²

   Built for MAIS (math AI system, www.mais.hk), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   Why this bench differs from the y = f(x) template, and how it stays faithful:
     • A circle is NOT a function of x — for most x there are two y-values. So
       the MODEL is the PARAMETRIC curve  x = h + r·cos t,  y = k + r·sin t,
       and the RENDER draws it as one closed path instead of a per-pixel plot.
     • The circle's defining beauty is the constant-distance / compass property:
       every point sits exactly one radius from the center. That single idea IS
       the equation — (x − h)² + (y − k)² = r² is the Pythagorean theorem on the
       "radius triangle," so the centerpiece turns that triangle on and shows the
       two legs squared summing to r² as a point walks the curve.
   Everything else — the state→model→render spine, DPI handling, unlocking dials,
   predict-then-check gating, and the RMS calibration meter — is the same machine
   as the rest of the lab library (see the Ellipse lab, its nearest sibling: a
   circle is an ellipse whose two foci have merged into one center).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/CircleLab.jsx
     2. Import and render it:
          import CircleLab from './CircleLab';
          export default function Page() { return <CircleLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (r, h, k, step).
     MODEL  — the parametric point is pure math; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. Square window so x and y share one scale and
   the circle is never distorted into an oval. Grid every 1 unit, labels every
   2. The parameter ranges below keep the whole circle inside this window (the
   farthest point is |center| + radius ≤ 3 + 6 = 9 < 10).
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Each dial names the letter it drives, its range/step,
   and the lesson step at which it unlocks. All steps are 0.5 so a grid-aligned
   calibration target can be matched exactly.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'r', label: 'r', min: 1, max: 6, step: 0.5, unlock: 1, role: 'radius · size' },
  { key: 'h', label: 'h', min: -3, max: 3, step: 0.5, unlock: 2, role: 'center · left / right' },
  { key: 'k', label: 'k', min: -3, max: 3, step: 0.5, unlock: 3, role: 'center · up / down' },
];
const START = { r: 4, h: 0, k: 0 };

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the circle',
    body:
      'A circle is the set of all points that sit the same distance from one fixed point. ' +
      'That fixed point is the center, and that fixed distance is the radius, r. In coordinates we ' +
      'write it in center-radius form, (x − h)² + (y − k)² = r², where (h, k) is the center. Right ' +
      'now r = 4, centered at the origin.',
    q: 'What do ALL the points of a circle share?',
    choices: [
      'They are the same distance from the center',
      'They are the same distance from the x-axis',
      'They all have the same x-coordinate',
    ],
    answer: 0,
    feedback:
      'Exactly — a circle is every point at one fixed distance (the radius) from one fixed point ' +
      '(the center). That single idea is the whole equation: (x − h)² + (y − k)² = r² just says “the ' +
      'distance from (x, y) to the center (h, k) is r.” In a few steps you’ll watch that distance ' +
      'turn into a right triangle.',
  },
  {
    title: 'r — the radius',
    body:
      'The r dial is live. The radius is the distance from the center out to the circle — it sets the ' +
      'size. The full width straight across, through the center, is the diameter, d = 2r. Drag r and ' +
      'watch the circle grow and shrink around its center.',
    q: 'You increase r from 4 to 5. What happens?',
    choices: [
      'It grows — every point moves to distance 5 from the center',
      'It slides to the right',
      'Only the top of the circle moves up',
    ],
    answer: 0,
    feedback:
      'r is the one number that sets a circle’s size. Change it and the curve stays centered while ' +
      'every point moves to the new distance r from the center. The diameter is always twice the ' +
      'radius (d = 2r = 10 when r = 5), and changing r never moves the center.',
  },
  {
    title: 'h — sliding the center left and right',
    body:
      'Now the h dial unlocks. It slides the whole circle left and right. Look inside the equation: x ' +
      'appears as (x − h), so h travels with the center, not with the size.',
    q: 'Set h = 3. Where is the center of the circle now?',
    choices: ['At x = 3', 'At x = −3', 'Still at x = 0'],
    answer: 0,
    feedback:
      'The center sits at x = h, so h = 3 moves it to (3, 0). The minus sign in (x − h) fools many ' +
      'students: a positive h shifts the circle in the positive x-direction. The radius doesn’t change ' +
      '— the whole circle just rides along with its center.',
  },
  {
    title: 'k — sliding the center up and down',
    body:
      'The last dial, k, moves the circle up and down, because y appears as (y − k). Together, (h, k) ' +
      'is the center of the circle.',
    q: 'The pair (h, k) sits inside (x − h)² and (y − k)². Where have you met a curve built around its own point (h, k) before?',
    choices: [
      'The ellipse, and the parabola’s vertex form — the same “shifted” idea',
      'The slope-intercept line y = mx + b',
      'Nowhere — this is unique to circles',
    ],
    answer: 0,
    feedback:
      'Same “shifted form” idea as the ellipse (x − h)²/a² + (y − k)²/b² = 1 and the parabola’s vertex ' +
      'form y = a(x − h)² + k: the (h, k) sitting in the parentheses is the special point the whole ' +
      'curve is built around. In fact a circle is exactly an ellipse whose two foci have merged into ' +
      'a single center.',
  },
  {
    title: 'The radius triangle',
    body:
      'Here is where the equation comes from. The radius triangle is switched on: from the center, go ' +
      'across by (x − h) and up by (y − k) to reach a point on the circle. Those two legs and the ' +
      'radius form a right triangle. Move the point — hover the graph, or press “Trace the radius.”',
    q: 'For every point on the circle, what does (x − h)² + (y − k)² equal?',
    choices: [
      'r², always — it is the Pythagorean theorem',
      'r, always',
      'It changes as the point moves',
    ],
    answer: 0,
    feedback:
      'The two legs are the horizontal distance (x − h) and the vertical distance (y − k); the radius ' +
      'r is the hypotenuse. The Pythagorean theorem says leg² + leg² = hypotenuse², that is ' +
      '(x − h)² + (y − k)² = r² — and that IS the circle’s equation. The distance from any point to ' +
      'the center, √((x − h)² + (y − k)²) = r, is constant no matter where the point sits. That’s why ' +
      'the right side is r², not r.',
  },
  {
    title: 'Circumference and area',
    body:
      'A circle carries two famous measurements, both built from r and the number π ≈ 3.14159. Wrap a ' +
      'string once around it and its length is the circumference, C = 2πr. Fill it in and the space ' +
      'inside is the area, A = πr². Slide r and watch both update.',
    q: 'You double the radius. What happens to the AREA?',
    choices: [
      'It becomes 4 times as large',
      'It also doubles',
      'It stays the same',
    ],
    answer: 0,
    feedback:
      'Circumference grows in step with r (C = 2πr, so doubling r doubles C), but area depends on r², ' +
      'so doubling r makes the area 2² = 4 times bigger. That r-squared is why a 12-inch pizza holds ' +
      'four times the pizza of a 6-inch one, not twice. Circumference is also π times the diameter: ' +
      'C = πd.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery circle is drawn as a dashed grey curve. Tune r, h, and k until your ' +
      'carmine circle lands exactly on top of it and the meter reads CALIBRATED. Press “New target” ' +
      'for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.
   Parametric point on the circle:  x = h + r·cos t,  y = k + r·sin t.
   ------------------------------------------------------------------------- */
function circlePoint(t, p) {
  return [p.h + p.r * Math.cos(t), p.k + p.r * Math.sin(t)];
}

/* Measurements derived from the parameters. All exact for the circle. */
function geometry(p) {
  return {
    diameter: 2 * p.r,
    circumference: 2 * Math.PI * p.r,
    area: Math.PI * p.r * p.r,
    r2: p.r * p.r,
  };
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. The match metric is the RMS Euclidean distance between
   the two curves at the SAME parameter t. It is 0 exactly when (r, h, k) all
   match, and grows smoothly otherwise — a well-defined, orientation-free score.
   Targets are on the 0.5 grid, so an exact (RMS = 0) match is reachable.
   ------------------------------------------------------------------------- */
function rmsError(p, t) {
  const N = 120;
  let s = 0;
  for (let i = 0; i < N; i++) {
    const th = (2 * Math.PI * i) / N;
    const [x1, y1] = circlePoint(th, p);
    const [x2, y2] = circlePoint(th, t);
    const dx = x1 - x2;
    const dy = y1 - y2;
    s += dx * dx + dy * dy;
  }
  return Math.sqrt(s / N);
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 1.2)));
const MATCH_RMS = 0.03; // below this the circles are effectively identical -> CALIBRATED

function makeTarget(prev) {
  const snap = (v, st) => Math.round(v / st) * st;
  let t;
  do {
    const r = snap(2 + Math.random() * 4, 0.5); // 2.0 … 6.0
    const h = snap(-3 + Math.random() * 6, 0.5); // −3 … 3
    const k = snap(-3 + Math.random() * 6, 0.5); // −3 … 3
    t = { r, h, k };
  } while (
    (prev && t.r === prev.r && t.h === prev.h && t.k === prev.k) ||
    (t.r === START.r && t.h === START.h && t.k === START.k) // never hand back the start
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

/* EDIT 5 — Equation display. Center-radius form with careful sign handling. The
   right side is shown as r² (the radius with a visible square), because writing
   “= r” instead of “= r²” is the single most common circle-equation mistake. */
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
function CircleEquation({ r, h, k }) {
  return (
    <span className="eq">
      <ShiftedSquared sym="x" val={h} />
      <span className="eq-op">+</span>
      <ShiftedSquared sym="y" val={k} />
      <span className="eq-op">=</span>
      <span>
        {trim(r)}
        <sup>2</sup>
      </span>
    </span>
  );
}

/* The parametric form, with the current values substituted — the second way to
   describe the same curve, and the one the tracer animates. */
function parametricForm(r, h, k) {
  const term = (center, fn) => {
    const t = `${trim(r)}&nbsp;${fn}&nbsp;t`;
    return center === 0 ? t : `${trim(center)}&nbsp;+&nbsp;${t}`;
  };
  return `x = ${term(h, 'cos')},   y = ${term(k, 'sin')}`;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function CircleLab() {
  const [r, setR] = useState(START.r);
  const [h, setH] = useState(START.h);
  const [k, setK] = useState(START.k);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [tracing, setTracing] = useState(false);
  const [showRadius, setShowRadius] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // { x, y } world point under the pointer, or null
  const tracerRef = useRef(null); // parameter t of the sweeping tracer, or null
  const sceneRef = useRef({});

  const params = { r, h, k };
  const current = STEPS[step];
  const g = geometry(params);

  // Snapshot everything the renderer needs, so draw() (a stable callback) and
  // the pointer/tracer handlers never read stale values.
  sceneRef.current = { r, h, k, calib: !!current.calib, target, showRadius };

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
    const p = { r: S.r, h: S.h, k: S.k };

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

    /* draws a full circle as one closed parametric path (no y=f(x) branches) */
    const plotCircle = (q, stroke, width, dash) => {
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.setLineDash(dash || []);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const N = 256;
      for (let i = 0; i <= N; i++) {
        const th = (2 * Math.PI * i) / N;
        const [x, y] = circlePoint(th, q);
        const X = sx(x);
        const Y = sy(y);
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };

    const dot = (wx, wy, rad, fill, ring) => {
      ctx.beginPath();
      ctx.arc(sx(wx), sy(wy), rad, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (ring) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = ring;
        ctx.stroke();
      }
    };

    /* a small monospace tag with a soft paper backing, for on-canvas labels */
    const tag = (text, X, Y, align = 'center') => {
      ctx.save();
      ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(text).width;
      const bx = align === 'center' ? X - tw / 2 - 2 : align === 'left' ? X - 2 : X - tw - 2;
      ctx.fillStyle = 'rgba(251,251,248,0.85)';
      ctx.fillRect(bx, Y - 8, tw + 4, 15);
      ctx.fillStyle = '#5B6B7B';
      ctx.fillText(text, X, Y);
      ctx.restore();
    };

    /* target circle (calibration only) — dashed grey, drawn under the accent */
    if (S.calib && S.target) {
      plotCircle(S.target, 'rgba(91,107,123,0.85)', 2, [7, 6]);
    }

    /* the mathematical object — the one carmine accent */
    plotCircle(p, '#C81E4F', 2.75);

    /* the active point on the curve: tracer takes precedence over hover */
    let activeT = null;
    if (tracerRef.current != null) activeT = tracerRef.current;
    else if (hoverRef.current) {
      const hv = hoverRef.current;
      activeT = Math.atan2(hv.y - p.k, hv.x - p.h); // geometric direction -> a real point on the curve
    }

    /* the radius triangle (constant-distance / Pythagorean property) */
    if (S.showRadius) {
      const cx = p.h;
      const cy = p.k;

      if (activeT != null) {
        const [px, py] = circlePoint(activeT, p);
        const dx = px - cx; // = r·cos t  →  (x − h)
        const dy = py - cy; // = r·sin t  →  (y − k)

        /* the two legs, dashed: across (x − h), then up (y − k) */
        ctx.save();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(91,107,123,0.8)';
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(sx(cx), sy(cy));
        ctx.lineTo(sx(px), sy(cy));
        ctx.lineTo(sx(px), sy(py));
        ctx.stroke();
        ctx.restore();

        /* right-angle marker at the corner, when both legs are visible */
        if (Math.abs(dx) > 0.5 && Math.abs(dy) > 0.5) {
          const m = 9;
          const hdir = Math.sign(sx(cx) - sx(px)); // toward center, horizontally
          const vdir = Math.sign(sy(py) - sy(cy)); // toward point, vertically
          ctx.save();
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = 'rgba(28,43,58,0.55)';
          ctx.beginPath();
          ctx.moveTo(sx(px) + hdir * m, sy(cy));
          ctx.lineTo(sx(px) + hdir * m, sy(cy) + vdir * m);
          ctx.lineTo(sx(px), sy(cy) + vdir * m);
          ctx.stroke();
          ctx.restore();
        }

        /* the radius itself — the hypotenuse, a solid ink segment */
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(28,43,58,0.7)';
        ctx.beginPath();
        ctx.moveTo(sx(cx), sy(cy));
        ctx.lineTo(sx(px), sy(py));
        ctx.stroke();
        ctx.restore();

        /* leg + hypotenuse labels */
        if (Math.abs(dx) > 0.8) {
          const midX = (sx(cx) + sx(px)) / 2;
          tag(`x ${MINUS} h`, midX, sy(cy) + (py >= cy ? 12 : -12));
        }
        if (Math.abs(dy) > 0.8) {
          const midY = (sy(cy) + sy(py)) / 2;
          tag(`y ${MINUS} k`, sx(px) + (px >= cx ? 16 : -16), midY, px >= cx ? 'left' : 'right');
        }
        {
          const Mx = (sx(cx) + sx(px)) / 2;
          const My = (sy(cy) + sy(py)) / 2;
          let ox = Mx - sx(px); // away from the right-angle corner (px, cy)
          let oy = My - sy(cy);
          const on = Math.hypot(ox, oy) || 1;
          ox /= on;
          oy /= on;
          tag('r', Mx + ox * 15, My + oy * 15);
        }

        /* the point on the curve (on the object → carmine with a paper ring) */
        dot(px, py, 5, '#C81E4F', '#FBFBF8');

        /* the running Pythagorean readout, top-left — the payoff: it stays r² */
        const dx2 = dx * dx;
        const dy2 = dy * dy;
        const txt = `(x−h)² + (y−k)² = ${dx2.toFixed(1)} + ${dy2.toFixed(1)} = ${(dx2 + dy2).toFixed(
          1
        )} = r²`;
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
    }

    /* center marker + label (drawn on top of the triangle spokes). The text
       label is hidden while the radius triangle is live, so it never crowds the
       triangle's own leg labels near the center. */
    if (p.h >= WORLD.xmin && p.h <= WORLD.xmax && p.k >= WORLD.ymin && p.k <= WORLD.ymax) {
      dot(p.h, p.k, 3.5, '#1C2B3A');
      if (!S.calib && !(S.showRadius && activeT != null)) {
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

    /* when the radius triangle is OFF, still give a plain (x, y) hover readout */
    if (!S.showRadius && activeT != null) {
      const [px, py] = circlePoint(activeT, p);
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
  }, [r, h, k, step, target, showRadius, draw]);

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

  /* the radius-triangle step turns the triangle on automatically */
  useEffect(() => {
    if (STEPS[step] && STEPS[step].title === 'The radius triangle') setShowRadius(true);
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
      tracerRef.current = t * 2 * Math.PI; // walk the parameter around the circle
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
    if (key === 'r') setR(v);
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
    setR(START.r);
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
    <div className="clab">
      <header className="head">
        <h1>The Circle</h1>
        <p className="lede">
          Explore the circle in{' '}
          <span className="mono">
            center-radius form, (x&nbsp;&minus;&nbsp;h)²&nbsp;+&nbsp;(y&nbsp;&minus;&nbsp;k)²&nbsp;=&nbsp;r²
          </span>
          . Each dial unlocks with the lesson, so you meet one idea at a time — then discover why the
          equation is really the Pythagorean theorem, and calibrate your circle onto a mystery target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <CircleEquation r={r} h={h} k={k} />
            </p>
            <p
              className="equation-sub mono"
              dangerouslySetInnerHTML={{ __html: parametricForm(r, h, k) }}
            />
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">hover the graph to walk a point around the circle</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Center</span>
              <span className="fact-v mono">{`(${trim(h)}, ${trim(k)})`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Radius</span>
              <span className="fact-v mono">{`r = ${trim(r)}`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Diameter</span>
              <span className="fact-v mono">{`2r = ${trim(g.diameter)}`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Circumference</span>
              <span className="fact-v mono">{`2πr ≈ ${g.circumference.toFixed(2)}`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Area</span>
              <span className="fact-v mono">{`πr² ≈ ${g.area.toFixed(2)}`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Equation constant</span>
              <span className="fact-v mono">{`r² = ${trim(g.r2)}`}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (tracing ? ' on' : '')}
              onClick={() => {
                setShowRadius(true);
                setTracing((t) => !t);
              }}
            >
              {tracing ? 'Tracing…' : 'Trace the radius'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showRadius ? ' on' : '')}
              onClick={() => setShowRadius((s) => !s)}
            >
              {showRadius ? 'Triangle shown' : 'Show radius triangle'}
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
              const val = { r, h, k }[d.key];
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
                  <span className="mono target-hint">target: r=?, h=?, k=?</span>
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
                  setShowRadius(false);
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
        <span className="mono">(x − h)² + (y − k)² = r²</span> &nbsp;·&nbsp; center-radius form of the
        circle, plotted live from the dials on a 20×20 quadrille window.
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
        /* stacked-fraction equation readout (kept generic across the lab family) */
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
