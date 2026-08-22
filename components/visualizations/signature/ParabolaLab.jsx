'use client';

/* ============================================================================
   ParabolaLab — an interactive "bench" for the parabola as a CONIC SECTION,
   defined by its focus and directrix, in standard form

        (x − h)² = 4p(y − k)     (opens up / down)
        (y − k)² = 4p(x − h)     (opens left / right)

   where (h, k) is the vertex and p is the focal distance (vertex → focus).

   Built for MAIS (math AI system, www.mais.hk), K-12 (Algebra 2 / Precalculus).
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   Why a SEPARATE lab from the quadratic-function one:
     • QuadraticFunctionLab teaches y = a(x − h)² + k — the parabola as the
       graph of a function (direction, width, shifts, roots).
     • THIS lab teaches the parabola as the third conic — the locus of points
       EQUIDISTANT from a fixed point (focus) and a fixed line (directrix).
       That equidistance is the centerpiece, the sibling of the ellipse's
       constant-sum and the hyperbola's constant-difference properties. It ties
       the three conics together through eccentricity (ellipse e<1, parabola
       e=1, hyperbola e>1).

   Note on the engine: a parabola is single-valued along its axis (y = f(x) for
   an up/down parabola, x = f(y) for a left/right one), so it plots as one clean
   arc — no vertical-tangent gaps. The rest (state→model→render, DPI handling,
   the lesson state machine, the RMS match meter) is the same spine as the other
   MAIS labs, so the code reads the same from lab to lab.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/ParabolaLab.jsx
     2. Import and render it:
          import ParabolaLab from './ParabolaLab';
          export default function Page() { return <ParabolaLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   World window & axes. A SQUARE window so x and y share one scale — essential
   for a conic, or "equal distance to a point and a line" would look unequal.
   Grid every 1 unit, labels every 2.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -8, xmax: 8, ymin: -8, ymax: 8 };

/* ---------------------------------------------------------------------------
   Parameters. p is the focal distance (vertex → focus), which also sets the
   width; h, k place the vertex. The opening direction is a 4-way control,
   handled separately from the sliders. Each dial names the lesson step at
   which it unlocks.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'p', label: 'p', min: 0.25, max: 3, step: 0.25, unlock: 1, role: 'vertex → focus distance · width' },
  { key: 'h', label: 'h', min: -3, max: 3, step: 0.5, unlock: 2, role: 'vertex left / right' },
  { key: 'k', label: 'k', min: -3, max: 3, step: 0.5, unlock: 2, role: 'vertex up / down' },
];
const DIR_UNLOCK = 3; // the opening-direction control unlocks at this step
const LATUS_STEP = 4; // latus rectum chord revealed here
const PROP_STEP = 5;  // the equidistance property (focus vs. directrix) revealed here
const START = { p: 1.5, h: 0, k: 0, dir: 'up' };

/* Each opening direction, decoded into an axis orientation and a sign.
   'v' = vertical axis of symmetry (opens up/down); 'h' = horizontal (left/right).
   s = +1 opens in the positive direction (up / right), −1 the negative. */
const DIRS = {
  up: { orient: 'v', s: 1 },
  down: { orient: 'v', s: -1 },
  right: { orient: 'h', s: 1 },
  left: { orient: 'h', s: -1 },
};
const OPENS = { up: 'upward ↑', down: 'downward ↓', right: 'right →', left: 'left ←' };

/* ---------------------------------------------------------------------------
   Lesson. One idea per step; the dial unlocks with the step; the reveal lives
   in `feedback` (shown after answering); distractors are real student
   misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the parabola',
    body:
      'You have probably graphed a parabola as a U-shaped curve. There is a deeper way to see it: ' +
      'a parabola is the set of every point that is EXACTLY as far from one fixed point — the focus ' +
      '(the dark dot) — as it is from one fixed line — the directrix (the dashed line). That single ' +
      'rule builds the whole curve. Right now the vertex sits at the origin.',
    q: 'What makes a point belong to a parabola?',
    choices: [
      'It is equally far from the focus and the directrix',
      'It is a fixed distance from the focus only',
      'It is equally far from two focus points',
    ],
    answer: 0,
    feedback:
      'Exactly. A parabola is the locus of points equidistant from the focus (a point) and the ' +
      'directrix (a line). Compare the family: an ellipse fixes the SUM of distances to two foci, a ' +
      'hyperbola fixes their DIFFERENCE, and a parabola balances the distance to one focus against ' +
      'the distance to a line. That balance is why every parabola has eccentricity exactly 1.',
  },
  {
    title: 'p — the focal distance',
    body:
      'The p dial is live. p is the distance from the vertex to the focus — and, by the definition, ' +
      'the same distance from the vertex to the directrix. Watch both move as you drag it. Because p ' +
      'also sets how tightly the arms curl, it controls the width. The standard form is ' +
      '(x − h)² = 4p(y − k).',
    q: 'As you increase p — pushing the focus and directrix farther from the vertex — the parabola becomes…',
    choices: ['Wider and more open', 'Narrower and steeper', 'Unchanged in shape'],
    answer: 0,
    feedback:
      'Larger p pushes the focus out and opens the parabola wider; smaller p pulls it in and pinches ' +
      'the curve narrow. In (x − h)² = 4p(y − k), the coefficient 4p is exactly the parabola’s width ' +
      'measured across the focus — the bigger it is, the broader the U.',
  },
  {
    title: 'The vertex (h, k)',
    body:
      'The h and k dials are unlocked. Together (h, k) is the vertex — the turning point, the spot on ' +
      'the parabola closest to the directrix. Sliding h and k moves the whole figure: vertex, focus ' +
      'and directrix travel together, because x and y appear as (x − h) and (y − k).',
    q: 'Set h = 2 and k = −1. Where is the vertex, and where is the focus (for a parabola opening up)?',
    choices: [
      'Vertex (2, −1), focus (2, −1 + p)',
      'Vertex (−2, 1), focus (−2, 1)',
      'Vertex (2, −1), focus (2 + p, −1)',
    ],
    answer: 0,
    feedback:
      'The vertex lands at (h, k) = (2, −1), and for an upward parabola the focus stays directly above ' +
      'it at (h, k + p). Replacing x with (x − h) and y with (y − k) slides every feature by the same ' +
      'shift — the shape never changes, only its position.',
  },
  {
    title: 'Which way it opens',
    body:
      'The direction control is now live — up, down, left or right. The focus always sits INSIDE the ' +
      'curve; the directrix always sits on the far side of the vertex, OUTSIDE. The straight line ' +
      'through the vertex and focus is the axis of symmetry, now shown dashed.',
    q: 'For a parabola that opens to the RIGHT, where is the directrix?',
    choices: [
      'A vertical line to the LEFT of the vertex',
      'A horizontal line below the vertex',
      'A vertical line to the right, through the focus',
    ],
    answer: 0,
    feedback:
      'When a parabola opens right, its focus is to the right of the vertex and its directrix is the ' +
      'vertical line the same distance to the LEFT. The curve always wraps around the focus and opens ' +
      'away from the directrix. Up/down parabolas have a horizontal directrix; left/right ones have a ' +
      'vertical directrix.',
  },
  {
    title: 'Axis of symmetry & the latus rectum',
    body:
      'A parabola is a perfect mirror image across its axis of symmetry. The carmine chord now drawn ' +
      'through the focus, perpendicular to that axis, is the latus rectum — the width of the parabola ' +
      'right at the focus. Its length is exactly 4p, the same coefficient from the standard form.',
    q: 'How long is the latus rectum (the chord through the focus) when p = 2?',
    choices: ['8 units — it is 4p', '2 units — it is p', '4 units — it is 2p'],
    answer: 0,
    feedback:
      'The latus rectum has length 4p, so p = 2 gives 8. Its endpoints sit a distance 2p on each side ' +
      'of the focus — a fast way to sketch a parabola by hand: mark the focus, step 2p out each way, ' +
      'and you have two more exact points on the curve.',
  },
  {
    title: 'The defining property',
    body:
      'Now watch the definition itself. Press “Trace the curve” (or hover the curve): from the moving ' +
      'point, one segment runs to the focus and another drops straight to the directrix. Read the two ' +
      'lengths in the box.',
    q: 'As the point travels along the parabola, how do its distance to the focus and its distance to the directrix compare?',
    choices: [
      'They stay exactly equal',
      'The focus distance is always larger',
      'They are equal only at the vertex',
    ],
    answer: 0,
    feedback:
      'They are always equal — that IS the parabola. Every point balances its distance to the focus ' +
      'against its distance to the directrix. It is also why parabolas concentrate energy: rays coming ' +
      'straight in, parallel to the axis, all reflect through the focus — the principle behind ' +
      'satellite dishes, car headlights, and flashlight mirrors.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery parabola is drawn as a dashed grey curve. Match it: first choose the ' +
      'opening direction, then tune p, h and k until your carmine curve lands on top of it and the ' +
      'meter reads CALIBRATED. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   MODEL — pure geometry, no pixels. In every function `q` is the parameter
   object { p, h, k, dir }, with q.p the focal distance (always > 0). The
   direction decides orientation and sign; the math is otherwise identical.
   ------------------------------------------------------------------------- */
function geom(q) {
  const d = DIRS[q.dir];
  const vertical = d.orient === 'v';
  const s = d.s;
  const focus = vertical ? [q.h, q.k + s * q.p] : [q.h + s * q.p, q.k];
  // directrix: a line on the opposite side of the vertex from the focus
  const directrix = vertical
    ? { axis: 'y', at: q.k - s * q.p } // horizontal line  y = k − s·p
    : { axis: 'x', at: q.h - s * q.p }; // vertical line    x = h − s·p
  const coeff = 4 * q.p * s; // signed 4p in the standard form
  const latus = 4 * q.p; // length of the latus rectum
  const lr = vertical // its endpoints, through the focus
    ? [[q.h - 2 * q.p, q.k + s * q.p], [q.h + 2 * q.p, q.k + s * q.p]]
    : [[q.h + s * q.p, q.k - 2 * q.p], [q.h + s * q.p, q.k + 2 * q.p]];
  return { vertical, s, focus, directrix, coeff, latus, lr, vertex: [q.h, q.k] };
}

/* One point on the curve. u is the offset ALONG the axis of symmetry's free
   variable (x for an up/down parabola, y for a left/right one). */
function curveXY(q, u) {
  const d = DIRS[q.dir];
  if (d.orient === 'v') {
    return [q.h + u, q.k + (d.s * (u * u)) / (4 * q.p)]; // x = h+u,  y = k + s·u²/(4p)
  }
  return [q.h + (d.s * (u * u)) / (4 * q.p), q.k + u]; // y = k+u,  x = h + s·u²/(4p)
}

/* The free-variable range that keeps the traced/plotted point inside the
   window — a narrow parabola's arms leave the top almost immediately, so we
   only sweep the part of the axis whose curve stays on screen. */
function visRange(q) {
  const g = geom(q);
  if (g.vertical) {
    const reach = g.s > 0 ? WORLD.ymax - q.k : q.k - WORLD.ymin;
    const half = Math.sqrt(Math.max(0, 4 * q.p * Math.max(0, reach)));
    return { lo: Math.max(q.h - half, WORLD.xmin), hi: Math.min(q.h + half, WORLD.xmax), free: 'x', c: q.h };
  }
  const reach = g.s > 0 ? WORLD.xmax - q.h : q.h - WORLD.xmin;
  const half = Math.sqrt(Math.max(0, 4 * q.p * Math.max(0, reach)));
  return { lo: Math.max(q.k - half, WORLD.ymin), hi: Math.min(q.k + half, WORLD.ymax), free: 'y', c: q.k };
}

function curvePoints(q, N) {
  const r = visRange(q);
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const f = r.lo + ((r.hi - r.lo) * i) / N;
    pts.push(curveXY(q, f - r.c));
  }
  return pts;
}

/* Implicit level function G(x, y): the curve is exactly where G = 0. Returned
   with its gradient so |G|/|∇G| gives a first-order geometric distance to the
   curve for the calibration meter (same technique as the hyperbola lab). */
function implicit(q, x, y) {
  const d = DIRS[q.dir];
  if (d.orient === 'v') {
    // (x − h)² − 4·s·p·(y − k) = 0
    return [(x - q.h) ** 2 - 4 * d.s * q.p * (y - q.k), 2 * (x - q.h), -4 * d.s * q.p];
  }
  // (y − k)² − 4·s·p·(x − h) = 0
  return [(y - q.k) ** 2 - 4 * d.s * q.p * (x - q.h), -4 * d.s * q.p, 2 * (y - q.k)];
}

const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);

/* ---------------------------------------------------------------------------
   Calibration meter. There is no single f(x) to difference against a target of
   a different orientation, so we sample the TARGET's visible arc and measure
   each point's geometric distance to the USER's curve via |G|/|∇G|, clamped so
   the diverging tails can't swamp the meter. A wrong opening direction lands
   the target points far from the user's arc, so it reads low automatically.
   ------------------------------------------------------------------------- */
function calibError(user, target) {
  const CAP = 3; // world units; clamp so diverging tails can't dominate
  const pts = curvePoints(target, 400);
  let s = 0;
  let n = 0;
  for (const [x, y] of pts) {
    if (x < WORLD.xmin || x > WORLD.xmax || y < WORLD.ymin || y > WORLD.ymax) continue;
    const [G, gx, gy] = implicit(user, x, y);
    const grad = Math.hypot(gx, gy) || 1e-6;
    let d = Math.abs(G) / grad;
    if (d > CAP) d = CAP;
    s += d * d;
    n++;
  }
  return n === 0 ? CAP : Math.sqrt(s / n);
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.7)));
const MATCH_RMS = 0.05; // below this the curves are effectively identical -> CALIBRATED

function makeTarget(prev) {
  const snap = (v, st) => Math.round(v / st) * st;
  const dirs = ['up', 'down', 'left', 'right'];
  const same = (u, w) => w && u.p === w.p && u.h === w.h && u.k === w.k && u.dir === w.dir;
  let t;
  let guard = 0;
  do {
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const p = +snap(0.5 + Math.random() * 2, 0.25).toFixed(2); // 0.50 … 2.50
    const h = +snap(-2 + Math.random() * 4, 0.5).toFixed(1); // −2 … 2
    const k = +snap(-2 + Math.random() * 4, 0.5).toFixed(1);
    t = { p, h, k, dir };
    guard++;
  } while (guard < 60 && (same(t, prev) || same(t, START)));
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
const ptStr = ([x, y]) => `(${trim(x)}, ${trim(y)})`;

/* A squared binomial, e.g. (x − 2)²  — or just x² when the shift is 0. */
function Sq({ v, shift }) {
  if (shift === 0)
    return (
      <>
        {v}
        <sup>2</sup>
      </>
    );
  return (
    <>
      ({v}&nbsp;{shift > 0 ? MINUS : '+'}&nbsp;{trim(Math.abs(shift))})<sup>2</sup>
    </>
  );
}
/* A linear binomial, e.g. (y − 2) — or just y when the shift is 0. */
function Lin({ v, shift }) {
  if (shift === 0) return <>{v}</>;
  return (
    <>
      ({v}&nbsp;{shift > 0 ? MINUS : '+'}&nbsp;{trim(Math.abs(shift))})
    </>
  );
}

/* Standard-form equation: squared term on the left, 4p·(linear term) on the
   right. The squared variable is the one WITHOUT the axis of symmetry, so the
   equation's shape tells you the orientation at a glance. */
function StandardEquation({ q }) {
  const g = geom(q);
  const cAbs = Math.abs(g.coeff);
  const cStr = Math.abs(cAbs - 1) < 1e-9 ? '' : trim(cAbs); // drop a redundant "1×"
  const sign = g.coeff < 0 ? <span className="op">{MINUS}</span> : null;
  if (g.vertical) {
    return (
      <span className="equation">
        <span>
          <Sq v="x" shift={q.h} />
        </span>
        <span className="op">=</span>
        {sign}
        {cStr && <span>{cStr}</span>}
        <span>
          <Lin v="y" shift={q.k} />
        </span>
      </span>
    );
  }
  return (
    <span className="equation">
      <span>
        <Sq v="y" shift={q.k} />
      </span>
      <span className="op">=</span>
      {sign}
      {cStr && <span>{cStr}</span>}
      <span>
        <Lin v="x" shift={q.h} />
      </span>
    </span>
  );
}

/* Focus & directrix, as a compact readout beneath the main equation. */
function focusDirectrixText(q) {
  const g = geom(q);
  const line = g.directrix.axis === 'y' ? `y = ${trim(g.directrix.at)}` : `x = ${trim(g.directrix.at)}`;
  return `focus ${ptStr(g.focus)}  ·  directrix ${line}`;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ParabolaLab() {
  const [p, setP] = useState(START.p);
  const [h, setH] = useState(START.h);
  const [k, setK] = useState(START.k);
  const [dir, setDir] = useState(START.dir);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [tracing, setTracing] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // {wx, wy} world coords under the pointer, or null
  const tracerRef = useRef(null); // normalized sweep t ∈ [0,1] of the tracer, or null
  const sceneRef = useRef({});

  const params = { p, h, k, dir };
  const current = STEPS[step];
  const g = geom(params);

  const showFocusDirectrix = !current.calib; // shown throughout the lesson
  const showAxis = !current.calib && step >= DIR_UNLOCK;
  const showLatus = !current.calib && step >= LATUS_STEP;
  const showProperty = !current.calib && step >= PROP_STEP; // equidistance readout

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer/tracer handlers never read stale values.
  sceneRef.current = {
    p, h, k, dir,
    calib: !!current.calib,
    target,
    showFocusDirectrix,
    showAxis,
    showLatus,
    showProperty,
  };

  const rms = target ? calibError(params, target) : Infinity;
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
    const q = { p: S.p, h: S.h, k: S.k, dir: S.dir };
    const gg = geom(q);

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

    /* ---- small drawing helpers ---- */
    const stroke = (pts, color, width, dash) => {
      // polyline with a pen-break when a point leaves the window, so an arm that
      // shoots off-screen never draws a false chord back across the canvas.
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.setLineDash(dash || []);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let pen = false;
      const M = 2;
      for (const [x, y] of pts) {
        const inside = x >= WORLD.xmin - M && x <= WORLD.xmax + M && y >= WORLD.ymin - M && y <= WORLD.ymax + M;
        if (!inside) {
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

    const line = (x1, y1, x2, y2, color, width, dash) => {
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      ctx.moveTo(sx(x1), sy(y1));
      ctx.lineTo(sx(x2), sy(y2));
      ctx.stroke();
      ctx.restore();
    };

    const dot = (x, y, r, fill, ring) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx(x), sy(y), r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (ring) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = ring;
        ctx.stroke();
      }
      ctx.restore();
    };

    const labelChip = (text, X, Y, color) => {
      ctx.save();
      ctx.font = '11.5px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(text).width;
      const bx = Math.min(Math.max(X, 4), W - tw - 8);
      const by = Math.min(Math.max(Y, 2), H - 16);
      ctx.fillStyle = 'rgba(251,251,248,0.82)';
      ctx.fillRect(bx - 3, by, tw + 6, 15);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text, bx, by + 1);
      ctx.restore();
    };

    /* axis of symmetry (faint dashed line through vertex & focus) */
    if (S.showAxis) {
      if (gg.vertical) line(q.h, WORLD.ymin, q.h, WORLD.ymax, 'rgba(91,107,123,0.45)', 1.3, [4, 5]);
      else line(WORLD.xmin, q.k, WORLD.xmax, q.k, 'rgba(91,107,123,0.45)', 1.3, [4, 5]);
    }

    /* directrix — a dashed grey line; the curve opens away from it */
    if (S.showFocusDirectrix) {
      if (gg.directrix.axis === 'y') {
        line(WORLD.xmin, gg.directrix.at, WORLD.xmax, gg.directrix.at, 'rgba(91,107,123,0.85)', 1.8, [7, 5]);
        labelChip('directrix', sx(WORLD.xmax) - 66, sy(gg.directrix.at) + 4, '#5B6B7B');
      } else {
        line(gg.directrix.at, WORLD.ymin, gg.directrix.at, WORLD.ymax, 'rgba(91,107,123,0.85)', 1.8, [7, 5]);
        labelChip('directrix', sx(gg.directrix.at) + 5, sy(WORLD.ymax) + 4, '#5B6B7B');
      }
    }

    /* target curve (calibration only) — dashed grey, drawn under the accent */
    if (S.calib && S.target) {
      stroke(curvePoints(S.target, 480), 'rgba(91,107,123,0.9)', 2, [7, 6]);
    }

    /* the mathematical object — the one carmine accent */
    stroke(curvePoints(q, 640), '#C81E4F', 2.75);

    /* latus rectum — the focal chord of length 4p (thin carmine segment) */
    if (S.showLatus) {
      line(gg.lr[0][0], gg.lr[0][1], gg.lr[1][0], gg.lr[1][1], 'rgba(200,30,79,0.5)', 1.8);
      for (const e of gg.lr) dot(e[0], e[1], 3, '#C81E4F', '#FBFBF8');
    }

    /* the active point on the curve: tracer takes precedence over hover */
    let active = null;
    if (tracerRef.current != null) {
      const r = visRange(q);
      const f = r.lo + (r.hi - r.lo) * tracerRef.current;
      active = curveXY(q, f - r.c);
    } else if (hoverRef.current) {
      const hv = hoverRef.current;
      let best = null;
      let bd = Infinity;
      for (const c of curvePoints(q, 260)) {
        if (c[0] < WORLD.xmin || c[0] > WORLD.xmax || c[1] < WORLD.ymin || c[1] > WORLD.ymax) continue;
        const dd = (c[0] - hv.wx) ** 2 + (c[1] - hv.wy) ** 2;
        if (dd < bd) {
          bd = dd;
          best = c;
        }
      }
      if (best && Math.sqrt(bd) < 0.6) active = best;
    }

    /* the equidistance property: the two equal distances from the active point,
       one to the focus and one straight to the directrix. This is the payoff. */
    if (active && S.showProperty) {
      const [px, py] = active;
      const foot = gg.directrix.axis === 'y' ? [px, gg.directrix.at] : [gg.directrix.at, py];
      line(px, py, gg.focus[0], gg.focus[1], 'rgba(28,43,58,0.55)', 1.7); // to focus
      line(px, py, foot[0], foot[1], 'rgba(28,43,58,0.55)', 1.7, [3, 4]); // to directrix
      dot(foot[0], foot[1], 3, 'rgba(28,43,58,0.7)');

      const d1 = dist(px, py, gg.focus[0], gg.focus[1]);
      const d2 = dist(px, py, foot[0], foot[1]);
      const lines = [
        `d(P, focus)     = ${d1.toFixed(2)}`,
        `d(P, directrix) = ${d2.toFixed(2)}`,
        `equal ✓  — the definition`,
      ];
      ctx.save();
      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
      let bw = 0;
      for (const l of lines) bw = Math.max(bw, ctx.measureText(l).width);
      ctx.fillStyle = 'rgba(251,251,248,0.94)';
      ctx.strokeStyle = 'rgba(28,43,58,0.15)';
      ctx.lineWidth = 1;
      ctx.fillRect(8, 8, bw + 16, lines.length * 16 + 10);
      ctx.strokeRect(8, 8, bw + 16, lines.length * 16 + 10);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      lines.forEach((l, i) => {
        ctx.fillStyle = i === 2 ? '#C81E4F' : '#1C2B3A';
        ctx.fillText(l, 16, 14 + i * 16);
      });
      ctx.restore();
    }

    /* focus + label */
    if (S.showFocusDirectrix) {
      dot(gg.focus[0], gg.focus[1], 4, '#1C2B3A', '#FBFBF8');
      // nudge the label toward the open side so it clears the directrix & chord
      const fx = sx(gg.focus[0]);
      const fy = sy(gg.focus[1]);
      labelChip('F', fx + 8, fy - 16, '#1C2B3A');
    }

    /* vertex — carmine dot on the curve, with its coordinates on the closed side */
    dot(gg.vertex[0], gg.vertex[1], 4.5, '#C81E4F', '#FBFBF8');
    if (!S.calib) {
      const vx = sx(gg.vertex[0]);
      const vy = sy(gg.vertex[1]);
      // place the label on the CLOSED side (opposite the opening), away from arms
      let lx = vx + 8;
      let ly = vy + 8;
      if (q.dir === 'up') ly = vy + 8;
      else if (q.dir === 'down') ly = vy - 22;
      else if (q.dir === 'right') {
        lx = vx - 74;
        ly = vy - 18;
      } else if (q.dir === 'left') {
        lx = vx + 10;
        ly = vy - 18;
      }
      labelChip(ptStr(gg.vertex), lx, ly, '#5B6B7B');
    }

    /* the moving point itself — carmine, drawn last so it sits on top */
    if (active) {
      dot(active[0], active[1], 5.5, '#C81E4F', '#FBFBF8');
      if (!S.showProperty) {
        // plain (x, y) readout, like the other benches
        const [px, py] = active;
        const X = sx(px);
        const Y = sy(py);
        const txt = `(${px.toFixed(1)}, ${py.toFixed(1)})`;
        ctx.save();
        ctx.strokeStyle = 'rgba(28,43,58,0.28)';
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(X, sy(0));
        ctx.lineTo(X, Y);
        ctx.moveTo(sx(0), Y);
        ctx.lineTo(X, Y);
        ctx.stroke();
        ctx.restore();
        labelChip(txt, X + 8, Y - 20, '#1C2B3A');
      }
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [p, h, k, dir, step, target, draw]);

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
    const DURATION = 4200;
    const loop = (now) => {
      if (start == null) start = now;
      const u = Math.min(1, (now - start) / DURATION);
      tracerRef.current = u; // 0 → 1 across the visible arc
      draw();
      if (u < 1) raf = requestAnimationFrame(loop);
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
    if (key === 'p') setP(v);
    else if (key === 'h') setH(v);
    else setK(v);
    if (tracing) setTracing(false);
  };

  const onDir = (d) => {
    setDir(d);
    if (tracing) setTracing(false);
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    hoverRef.current = {
      wx: WORLD.xmin + (cssX / rect.width) * (WORLD.xmax - WORLD.xmin),
      wy: WORLD.ymax - (cssY / rect.height) * (WORLD.ymax - WORLD.ymin),
    };
    draw();
  };
  const onPointerLeave = () => {
    hoverRef.current = null;
    draw();
  };

  const resetDials = () => {
    setP(START.p);
    setH(START.h);
    setK(START.k);
    setDir(START.dir);
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
  const dirUnlocked = step >= DIR_UNLOCK;

  return (
    <div className="plab">
      <header className="head">
        <h1>The Parabola</h1>
        <p className="lede">
          Meet the third conic through its true definition — every point the same distance from a{' '}
          <span className="mono">focus</span> as from a <span className="mono">directrix</span>. Each
          dial unlocks with the lesson, so you meet one idea at a time — the focal distance, the
          vertex, the opening direction, the latus rectum — and finish by calibrating your curve onto
          a mystery target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <StandardEquation q={params} />
            {showFocusDirectrix && <p className="equation-sub mono">{focusDirectrixText(params)}</p>}
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">hover the curve to read a point</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Vertex</span>
              <span className="fact-v mono">{ptStr([h, k])}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Opens</span>
              <span className="fact-v">{OPENS[dir]}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Focus</span>
              <span className="fact-v mono">{ptStr(g.focus)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Directrix</span>
              <span className="fact-v mono">
                {g.directrix.axis === 'y' ? `y = ${trim(g.directrix.at)}` : `x = ${trim(g.directrix.at)}`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Focal distance p · 4p</span>
              <span className="fact-v mono">
                {trim(p)} · {trim(g.latus)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Eccentricity</span>
              <span className="fact-v mono">1 (every parabola)</span>
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
              const val = { p, h, k }[d.key];
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

            <div className={'dirctl' + (dirUnlocked ? '' : ' locked')}>
              <div className="dirctl-head">
                <span className="seg-k">opens</span>
                <span className="seg-role">{dirUnlocked ? 'which way it points' : 'unlocks soon'}</span>
              </div>
              <div className="dir-btns" role="group" aria-label="Opening direction">
                {[
                  ['up', '↑', 'up'],
                  ['down', '↓', 'down'],
                  ['left', '←', 'left'],
                  ['right', '→', 'right'],
                ].map(([key, arrow, word]) => (
                  <button
                    type="button"
                    key={key}
                    className={dir === key ? 'on' : ''}
                    disabled={!dirUnlocked}
                    aria-pressed={dir === key}
                    aria-label={`Opens ${word}`}
                    onClick={() => onDir(key)}
                  >
                    <span className="arw" aria-hidden="true">
                      {arrow}
                    </span>
                    <span>{word}</span>
                  </button>
                ))}
              </div>
            </div>
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
                  <span className="mono target-hint">target: direction ?, p=?, h=?, k=?</span>
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
        <span className="mono">(x − h)² = 4p(y − k)</span> &nbsp;·&nbsp; the parabola in standard
        (conic) form — focus, directrix and all — plotted live from the dials on a 16×16 quadrille
        window.
      </footer>

      <style jsx>{`
        .plab {
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
          max-width: 72ch;
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 940px) {
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
          min-height: 46px;
          margin-bottom: 10px;
        }
        .equation {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          color: var(--curve);
          font-size: 18px;
          font-weight: 600;
        }
        .equation .op {
          font-weight: 600;
        }
        .equation sup {
          font-size: 0.68em;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 8px 0 0;
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
          gap: 6px 18px;
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
          font-size: 13px;
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
        .dirctl {
          padding-top: 8px;
          border-top: 1px solid rgba(28, 43, 58, 0.08);
        }
        .dirctl.locked {
          opacity: 0.5;
        }
        .dirctl-head {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 8px;
        }
        .seg-k {
          font-family: var(--serif);
          font-style: italic;
          font-size: 16px;
        }
        .seg-role {
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dir-btns {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .dir-btns button {
          font: 600 11.5px/1 system-ui, sans-serif;
          padding: 8px 4px;
          border: 1px solid rgba(28, 43, 58, 0.25);
          border-radius: 8px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .dir-btns button .arw {
          font-size: 15px;
          line-height: 1;
        }
        .dir-btns button.on {
          background: var(--curve);
          border-color: var(--curve);
          color: #fff;
        }
        .dir-btns button:disabled {
          cursor: not-allowed;
        }
        .dir-btns button:not(:disabled):hover {
          border-color: var(--ink);
        }
        @media (max-width: 560px) {
          .dir-btns {
            grid-template-columns: repeat(2, minmax(44px, 1fr));
          }
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
          gap: 10px;
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 11.5px;
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
        :global(.plab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .dir-btns button {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
