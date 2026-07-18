'use client';

/* ============================================================================
   HyperbolaLab — an interactive "bench" for the hyperbola (conic section)
   in standard form,   (x − h)²/a² − (y − k)²/b² = 1   (opens left/right)
                or      (y − k)²/a² − (x − h)²/b² = 1   (opens up/down).

   Built for MAIS (math AI system, www.mais.hk), K-12 (Algebra 2 / Precalculus).
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   Note on the engine: a hyperbola is a RELATION, not a single-valued y = f(x),
   so this lab extends the 2-D bench with a proper conic renderer — each branch
   is drawn parametrically with cosh/sinh (exact, no vertical-tangent gaps),
   plus asymptotes, the central "characteristic rectangle," foci, and the
   focal-difference property |PF₁ − PF₂| = 2a. Everything else (state→model→
   render, DPI handling, the lesson state machine, the RMS match meter) follows
   the same spine as the other MAIS labs.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/HyperbolaLab.jsx
     2. Import and render it:
          import HyperbolaLab from './HyperbolaLab';
          export default function Page() { return <HyperbolaLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   World window & axes. A SQUARE window so x and y share one scale — essential
   for a conic, or the asymptote slopes and the circular idea of "distance to a
   focus" would be visually wrong. Grid every 1 unit, labels every 2.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -8, xmax: 8, ymin: -8, ymax: 8 };

/* ---------------------------------------------------------------------------
   Parameters. a and b are the semi-transverse and semi-conjugate lengths;
   h, k place the center. Orientation (which term is positive) is a toggle,
   handled separately from the sliders. Each dial names the lesson step at
   which it unlocks.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'a', label: 'a', min: 0.5, max: 3.5, step: 0.25, unlock: 1, role: 'center → vertex (transverse)' },
  { key: 'b', label: 'b', min: 0.5, max: 3.5, step: 0.25, unlock: 2, role: 'conjugate · asymptote slope' },
  { key: 'h', label: 'h', min: -3, max: 3, step: 0.5, unlock: 3, role: 'center left / right' },
  { key: 'k', label: 'k', min: -3, max: 3, step: 0.5, unlock: 3, role: 'center up / down' },
];
const ORIENT_UNLOCK = 4; // the orientation toggle unlocks at this step
const FOCI_STEP = 5;      // foci + focal-difference property revealed here
const START = { a: 3, b: 2, h: 0, k: 0, orient: 'h' };

/* ---------------------------------------------------------------------------
   Lesson. One idea per step; the dial unlocks with the step; the reveal lives
   in `feedback` (shown after answering); distractors are real student
   misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the hyperbola',
    body:
      'A hyperbola is the conic section with TWO separate branches that open away from a ' +
      'center. In standard form it is (x − h)²/a² − (y − k)²/b² = 1. The minus sign between ' +
      'the two terms is the whole story — it splits the curve into two mirror-image pieces. ' +
      'Right now it is centered at the origin with a = 3 and b = 2.',
    q: 'How many separate branches (pieces) does a hyperbola have?',
    choices: ['Two — one opening each way', 'One continuous loop', 'Three'],
    answer: 0,
    feedback:
      'Two branches. The minus sign in x²/a² − y²/b² = 1 forces the curve apart into two ' +
      'mirror-image pieces that open away from the center and chase the asymptotes forever ' +
      'without ever touching them. (An ellipse has a plus sign — and closes into one loop.)',
  },
  {
    title: 'a — the vertices',
    body:
      'The a dial is live. a is the distance from the center out to each vertex — the two ' +
      'turning points where the branches come closest together. They sit on the transverse ' +
      'axis, the segment straight through both vertices.',
    q: 'With the center at the origin and the branches opening left–right, where are the two vertices?',
    choices: ['At (−a, 0) and (a, 0)', 'At (0, −a) and (0, a)', 'At (−a, −a) and (a, a)'],
    answer: 0,
    feedback:
      'The vertices are at (±a, 0) — a units left and right of the center. The segment joining ' +
      'them is the transverse axis, with length 2a. (When the hyperbola opens up–down instead, ' +
      'those vertices swing to (0, ±a).)',
  },
  {
    title: 'b & the asymptotes',
    body:
      'Now b is live. With a and b you can build the central rectangle — width 2a, height 2b — ' +
      'shown dashed. Extend the rectangle’s diagonals and you get the asymptotes: the straight ' +
      'lines the branches approach but never reach.',
    q: 'For this left–right hyperbola, what is the slope of the two asymptotes?',
    choices: ['±b/a', '±a/b', '±ab'],
    answer: 0,
    feedback:
      'The asymptotes are y = ±(b/a)x through the center — exactly the diagonals of the a-by-b ' +
      'rectangle. The branches hug these lines out toward infinity. (Turn the box on its side ' +
      'and an up–down hyperbola gets slopes ±a/b instead.)',
  },
  {
    title: 'h and k — moving the center',
    body:
      'The h and k dials are unlocked. They translate the whole figure — center, vertices, ' +
      'foci, rectangle and asymptotes all move together — landing the center at (h, k). Every ' +
      'feature is measured from that center.',
    q: 'Set h = 2 and k = −1. Where is the center, and where is the right-hand vertex?',
    choices: [
      'Center (2, −1), vertex (2 + a, −1)',
      'Center (−2, 1), vertex (−2 − a, 1)',
      'Center (2, −1), vertex (2, −1 + a)',
    ],
    answer: 0,
    feedback:
      'The center moves to (h, k) = (2, −1), and because this hyperbola opens left–right the ' +
      'vertices stay level with it at (h ± a, k). Replacing x with (x − h) and y with (y − k) ' +
      'slides every feature by the same shift — the graph never changes shape, only position.',
  },
  {
    title: 'Orientation — which way it opens',
    body:
      'The orientation toggle is now live. Which variable’s term is POSITIVE decides the ' +
      'opening direction. (x − h)²/a² − (y − k)²/b² = 1 opens left–right; swap to ' +
      '(y − k)²/a² − (x − h)²/b² = 1 and it opens up–down. Flip it and watch.',
    q: 'In the equation (y − k)²/a² − (x − h)²/b² = 1, which way do the branches open?',
    choices: ['Up and down', 'Left and right', 'They form a closed oval'],
    answer: 0,
    feedback:
      'Up and down. The branches open along the axis of the POSITIVE term — here the y-term — ' +
      'so the vertices are at (h, k ± a). The positive term always points to the transverse ' +
      'axis; the subtracted term never does. That single sign is how you read the direction.',
  },
  {
    title: 'Foci & the defining property',
    body:
      'The two foci now appear, each a distance c from the center where c² = a² + b² — so c is ' +
      'always larger than a. Press “Trace the curve”: as the point rides a branch, watch the two ' +
      'distances to the foci. Their difference never changes.',
    q: 'For every point P on a hyperbola, the difference of distances to the two foci, |PF₁ − PF₂|, is…',
    choices: ['Always equal to 2a', 'Always equal to 2c', 'Different for every point'],
    answer: 0,
    feedback:
      'It is constant: |PF₁ − PF₂| = 2a for every point on the curve — that fixed difference is ' +
      'the actual definition of a hyperbola. Because c > a, the eccentricity e = c/a is always ' +
      'greater than 1, which is exactly what makes the branches fly open instead of closing like ' +
      'an ellipse (e < 1).',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery hyperbola is drawn as a dashed grey curve. Match it: first set ' +
      'the orientation, then tune a, b, h and k until your carmine curve lands on top of it and ' +
      'the meter reads CALIBRATED. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   MODEL — pure geometry, no pixels. `a` is ALWAYS the semi-transverse length
   (center → vertex); `b` is ALWAYS the semi-conjugate length. Orientation only
   decides which axis the transverse axis lies on.
   ------------------------------------------------------------------------- */
function geom(p) {
  const c = Math.sqrt(p.a * p.a + p.b * p.b);
  if (p.orient === 'h') {
    return {
      c,
      e: c / p.a,
      vertices: [[p.h - p.a, p.k], [p.h + p.a, p.k]],
      foci: [[p.h - c, p.k], [p.h + c, p.k]],
      boxX: [p.h - p.a, p.h + p.a],
      boxY: [p.k - p.b, p.k + p.b],
      slope: p.b / p.a, // asymptote slope magnitude
    };
  }
  return {
    c,
    e: c / p.a,
    vertices: [[p.h, p.k - p.a], [p.h, p.k + p.a]],
    foci: [[p.h, p.k - c], [p.h, p.k + c]],
    boxX: [p.h - p.b, p.h + p.b],
    boxY: [p.k - p.a, p.k + p.a],
    slope: p.a / p.b,
  };
}

/* One point on a branch, parametrized so cosh/sinh trace it exactly (no gaps at
   the vertices, where the curve is vertical). sign = +1 / −1 picks the branch:
   right/left for a horizontal hyperbola, upper/lower for a vertical one. */
function branchPoint(p, sign, t) {
  if (p.orient === 'h') {
    return [p.h + sign * p.a * Math.cosh(t), p.k + p.b * Math.sinh(t)];
  }
  return [p.h + p.b * Math.sinh(t), p.k + sign * p.a * Math.cosh(t)];
}

function branchPoints(p, sign, N, T) {
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = -T + (2 * T * i) / N;
    pts.push(branchPoint(p, sign, t));
  }
  return pts;
}

/* Implicit level function G(x, y): the curve is exactly where G = 0. Returned
   with its gradient so we can turn |G| into a first-order geometric distance
   for the calibration meter. */
function implicit(p, x, y) {
  const a2 = p.a * p.a;
  const b2 = p.b * p.b;
  if (p.orient === 'h') {
    return [(x - p.h) ** 2 / a2 - (y - p.k) ** 2 / b2 - 1, (2 * (x - p.h)) / a2, (-2 * (y - p.k)) / b2];
  }
  return [(y - p.k) ** 2 / a2 - (x - p.h) ** 2 / b2 - 1, (-2 * (x - p.h)) / b2, (2 * (y - p.k)) / a2];
}

/* ---------------------------------------------------------------------------
   Calibration meter. There is no single f(x) to difference, so we sample the
   TARGET curve and measure each sampled point's geometric distance to the
   USER's curve via |G| / |∇G| (first-order distance to a level set), clamped
   so the far tails can't swamp the meter. A wrong orientation lands the target
   points far from the user's branches, so it reads low automatically.
   ------------------------------------------------------------------------- */
function calibError(user, target) {
  const CAP = 3; // world units; clamp so diverging tails can't dominate
  const pts = [...branchPoints(target, 1, 200, 4.5), ...branchPoints(target, -1, 200, 4.5)];
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
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.85)));
const MATCH_RMS = 0.05; // below this the curves are effectively identical -> CALIBRATED

function makeTarget(prev) {
  const snap = (v, st) => Math.round(v / st) * st;
  const same = (u, w) =>
    w && u.a === w.a && u.b === w.b && u.h === w.h && u.k === w.k && u.orient === w.orient;
  let t;
  let guard = 0;
  do {
    const orient = Math.random() < 0.5 ? 'h' : 'v';
    const a = +snap(1 + Math.random() * 1.75, 0.25).toFixed(2); // 1.00 … 2.75
    const b = +snap(1 + Math.random() * 1.75, 0.25).toFixed(2);
    const h = +snap(-2 + Math.random() * 4, 0.5).toFixed(1); // −2 … 2
    const k = +snap(-2 + Math.random() * 4, 0.5).toFixed(1);
    t = { a, b, h, k, orient };
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
const pt = ([x, y]) => `(${trim(x)}, ${trim(y)})`;

/* A squared binomial numerator, e.g. (x − 2)²  — or just x² when the shift is 0. */
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
function Frac({ children, den }) {
  return (
    <span className="frac">
      <span className="num">{children}</span>
      <span className="den">{den}</span>
    </span>
  );
}

/* Standard-form equation, with the positive term first (that ordering is how a
   reader tells orientation at a glance). */
function StandardEquation({ p }) {
  const a2 = trim(p.a * p.a);
  const b2 = trim(p.b * p.b);
  // Build explicitly so the positive term leads (that ordering signals orientation).
  if (p.orient === 'h') {
    return (
      <span className="equation" aria-hidden="true">
        <Frac den={a2}>
          <Sq v="x" shift={p.h} />
        </Frac>
        <span className="op">{MINUS}</span>
        <Frac den={b2}>
          <Sq v="y" shift={p.k} />
        </Frac>
        <span className="op">=</span>
        <span>1</span>
      </span>
    );
  }
  return (
    <span className="equation" aria-hidden="true">
      <Frac den={a2}>
        <Sq v="y" shift={p.k} />
      </Frac>
      <span className="op">{MINUS}</span>
      <Frac den={b2}>
        <Sq v="x" shift={p.h} />
      </Frac>
      <span className="op">=</span>
      <span>1</span>
    </span>
  );
}

/* The asymptote equations, as a compact text readout under the main equation. */
function asymptoteText(p) {
  const g = geom(p);
  const m = trim(g.slope);
  const xp = p.h === 0 ? 'x' : `(x ${p.h > 0 ? MINUS : '+'} ${trim(Math.abs(p.h))})`;
  const lhs = p.k === 0 ? 'y' : `y ${p.k > 0 ? MINUS : '+'} ${trim(Math.abs(p.k))}`;
  const slope = m === '1' ? '' : `${m}·`;
  return `${lhs} = ± ${slope}${xp}`;
}

/* A plain-language reading of the equation for screen readers — the visual
   fraction markup alone would be read as a meaningless run of numbers. */
function spokenEquation(p) {
  const a2 = trim(p.a * p.a);
  const b2 = trim(p.b * p.b);
  const sq = (v, shift) =>
    shift === 0
      ? `${v} squared`
      : `open paren ${v} ${shift > 0 ? 'minus' : 'plus'} ${trim(Math.abs(shift))} close paren squared`;
  const xt = sq('x', p.h);
  const yt = sq('y', p.k);
  return p.orient === 'h'
    ? `${xt} over ${a2} minus ${yt} over ${b2} equals 1`
    : `${yt} over ${a2} minus ${xt} over ${b2} equals 1`;
}

/* A summary of the current graph for the canvas's accessible name. */
function canvasLabel(p) {
  const g = geom(p);
  const dir = p.orient === 'h' ? 'left and right' : 'up and down';
  return (
    `Hyperbola centered at ${pt([p.h, p.k])}, opening ${dir}, ` +
    `vertices at ${pt(g.vertices[0])} and ${pt(g.vertices[1])}, ` +
    `asymptote slopes plus or minus ${trim(g.slope)}.`
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function HyperbolaLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [h, setH] = useState(START.h);
  const [k, setK] = useState(START.k);
  const [orient, setOrient] = useState(START.orient);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [tracing, setTracing] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // {wx, wy} world coords under the pointer, or null
  const tracerRef = useRef(null); // branch parameter t of the sweeping tracer, or null
  const sceneRef = useRef({});

  const params = { a, b, h, k, orient };
  const current = STEPS[step];
  const g = geom(params);

  const showBoxAsymp = step >= 2; // rectangle + asymptotes introduced with b
  const showFoci = !current.calib && step >= FOCI_STEP;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer/tracer handlers never read stale values.
  sceneRef.current = { a, b, h, k, orient, calib: !!current.calib, target, showBoxAsymp, showFoci };

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
    const p = { a: S.a, b: S.b, h: S.h, k: S.k, orient: S.orient };
    const gg = geom(p);

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

    /* polyline plotter with a pen-break when the branch leaves the window, so a
       branch that exits and (for a mirror image) re-enters never draws a false
       connecting chord across the canvas. */
    const stroke = (pts, color, width, dash) => {
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

    /* central "characteristic rectangle" + asymptotes (its extended diagonals) */
    if (S.showBoxAsymp) {
      ctx.save();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = 'rgba(120,150,170,0.75)';
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(
        sx(gg.boxX[0]),
        sy(gg.boxY[1]),
        sx(gg.boxX[1]) - sx(gg.boxX[0]),
        sy(gg.boxY[0]) - sy(gg.boxY[1])
      );
      ctx.restore();

      for (const s of [gg.slope, -gg.slope]) {
        const y1 = p.k + s * (WORLD.xmin - p.h);
        const y2 = p.k + s * (WORLD.xmax - p.h);
        line(WORLD.xmin, y1, WORLD.xmax, y2, 'rgba(91,107,123,0.5)', 1.4, [4, 5]);
      }
    }

    /* target curve (calibration only) — dashed grey, drawn under the accent */
    if (S.calib && S.target) {
      stroke(branchPoints(S.target, 1, 640, 4.5), 'rgba(91,107,123,0.9)', 2, [7, 6]);
      stroke(branchPoints(S.target, -1, 640, 4.5), 'rgba(91,107,123,0.9)', 2, [7, 6]);
    }

    /* the mathematical object — the one carmine accent (both branches) */
    stroke(branchPoints(p, 1, 640, 4.5), '#C81E4F', 2.75);
    stroke(branchPoints(p, -1, 640, 4.5), '#C81E4F', 2.75);

    /* transverse axis (vertex to vertex) as a thin carmine segment */
    line(
      gg.vertices[0][0], gg.vertices[0][1],
      gg.vertices[1][0], gg.vertices[1][1],
      'rgba(200,30,79,0.35)', 1.4
    );

    /* vertices — filled carmine dots on the curve */
    for (const v of gg.vertices) dot(v[0], v[1], 4.5, '#C81E4F', '#FBFBF8');

    /* foci + labels (revealed with the focal-property step) */
    if (S.showFoci) {
      const labels = ['F₁', 'F₂'];
      gg.foci.forEach((f, i) => {
        dot(f[0], f[1], 4, '#1C2B3A', '#FBFBF8');
        ctx.save();
        ctx.fillStyle = '#1C2B3A';
        ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(labels[i], sx(f[0]), sy(f[1]) - 7);
        ctx.restore();
      });
    }

    /* center marker + label, placed in the empty gap between the branches */
    dot(p.h, p.k, 3.2, 'rgba(28,43,58,0.9)');
    if (!S.calib) {
      ctx.save();
      ctx.font = '11.5px ui-monospace, "SF Mono", Menlo, monospace';
      const label = `(${trim(p.h)}, ${trim(p.k)})`;
      const cx = sx(p.h);
      const cy = sy(p.k);
      const tw = ctx.measureText(label).width;
      const bx = Math.min(cx + 8, W - tw - 8);
      const by = Math.min(cy + 8, H - 20);
      ctx.fillStyle = 'rgba(251,251,248,0.82)';
      ctx.fillRect(bx - 3, by, tw + 6, 15);
      ctx.fillStyle = '#5B6B7B';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(label, bx, by + 1);
      ctx.restore();
    }

    /* tracer: a point sweeping one branch, showing the curve as a locus. When
       the foci are on, it also draws the two focal radii and the live proof
       that |d₁ − d₂| stays fixed at 2a. */
    const tt = tracerRef.current;
    if (tt != null) {
      const [px, py] = branchPoint(p, 1, tt);
      if (S.showFoci) {
        for (const f of gg.foci) line(px, py, f[0], f[1], 'rgba(28,43,58,0.4)', 1.4, [3, 4]);
        const d1 = Math.hypot(px - gg.foci[0][0], py - gg.foci[0][1]);
        const d2 = Math.hypot(px - gg.foci[1][0], py - gg.foci[1][1]);
        const lines = [
          `d₁ = ${d1.toFixed(2)}`,
          `d₂ = ${d2.toFixed(2)}`,
          `|d₁ − d₂| = ${Math.abs(d1 - d2).toFixed(2)}`,
          `2a = ${trim(2 * p.a)}`,
        ];
        ctx.save();
        ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
        let bw = 0;
        for (const l of lines) bw = Math.max(bw, ctx.measureText(l).width);
        ctx.fillStyle = 'rgba(251,251,248,0.92)';
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
      dot(px, py, 5.5, '#C81E4F', '#FBFBF8');
    }

    /* hover readout: snap to the nearest point on the curve, show its (x, y) and
       drop guides to the axes — proof the point satisfies the equation. */
    const hv = hoverRef.current;
    if (hv) {
      let best = null;
      let bd = Infinity;
      for (const sign of [1, -1]) {
        for (const q of branchPoints(p, sign, 260, 4.5)) {
          if (q[0] < WORLD.xmin || q[0] > WORLD.xmax || q[1] < WORLD.ymin || q[1] > WORLD.ymax) continue;
          const d = (q[0] - hv.wx) ** 2 + (q[1] - hv.wy) ** 2;
          if (d < bd) {
            bd = d;
            best = q;
          }
        }
      }
      if (best && Math.sqrt(bd) < 0.6) {
        const [x, y] = best;
        const X = sx(x);
        const Y = sy(y);
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
        const txt = `(${x.toFixed(1)}, ${y.toFixed(1)})`;
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
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [a, b, h, k, orient, step, target, draw]);

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
    const TR = 1.7; // parameter range swept along the branch
    const loop = (now) => {
      if (start == null) start = now;
      const u = Math.min(1, (now - start) / DURATION);
      tracerRef.current = -TR + u * 2 * TR;
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
    if (key === 'a') setA(v);
    else if (key === 'b') setB(v);
    else if (key === 'h') setH(v);
    else setK(v);
    if (tracing) setTracing(false);
  };

  const onOrient = (o) => {
    setOrient(o);
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
    setA(START.a);
    setB(START.b);
    setH(START.h);
    setK(START.k);
    setOrient(START.orient);
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
  const orientUnlocked = step >= ORIENT_UNLOCK;
  const opensText = orient === 'h' ? 'left ↔ right' : 'up ↕ down';

  return (
    <div className="hlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Hyperbola</h1>
        <p className="lede">
          Explore the conic in{' '}
          <span className="mono">standard form, (x&nbsp;&minus;&nbsp;h)²/a²&nbsp;&minus;&nbsp;(y&nbsp;&minus;&nbsp;k)²/b²&nbsp;=&nbsp;1</span>.
          Each dial unlocks with the lesson, so you meet one idea at a time — vertices, asymptotes,
          the center, orientation, the foci — and finish by calibrating your curve onto a mystery target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <span className="sr-only" role="math">{spokenEquation(params)}</span>
            <StandardEquation p={params} />
            {showBoxAsymp && <p className="equation-sub mono">asymptotes:&nbsp; {asymptoteText(params)}</p>}
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            <canvas ref={canvasRef} role="img" aria-label={canvasLabel(params)} />
            <span className="hint mono">hover the graph to read a point</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Center</span>
              <span className="fact-v mono">{pt([h, k])}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Opens</span>
              <span className="fact-v">{opensText}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Vertices</span>
              <span className="fact-v mono">
                {pt(g.vertices[0])}, {pt(g.vertices[1])}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Foci &nbsp;(c = √(a²+b²))</span>
              <span className="fact-v mono">
                {pt(g.foci[0])}, {pt(g.foci[1])}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Asymptote slopes</span>
              <span className="fact-v mono">± {trim(g.slope)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Eccentricity&nbsp;(c/a)</span>
              <span className="fact-v mono">{trim(g.e)} &nbsp;(&gt; 1)</span>
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

            <div className={'seg' + (orientUnlocked ? '' : ' locked')}>
              <span className="seg-k">orientation</span>
              <span className="seg-role">{orientUnlocked ? 'which term is positive' : 'unlocks soon'}</span>
              <div className="seg-btns" role="group" aria-label="Hyperbola orientation">
                <button
                  type="button"
                  className={orient === 'h' ? 'on' : ''}
                  disabled={!orientUnlocked}
                  aria-pressed={orient === 'h'}
                  aria-label="Opens left and right (x-squared term positive)"
                  onClick={() => onOrient('h')}
                >
                  x² first · ↔
                </button>
                <button
                  type="button"
                  className={orient === 'v' ? 'on' : ''}
                  disabled={!orientUnlocked}
                  aria-pressed={orient === 'v'}
                  aria-label="Opens up and down (y-squared term positive)"
                  onClick={() => onOrient('v')}
                >
                  y² first · ↕
                </button>
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
                  <span className="mono target-hint">target: orientation ?, a=?, b=?, h=?, k=?</span>
                )}
              </div>
              {/* announce only the discrete success state, so continuous dial
                  moves don't spam a screen reader with percentages */}
              <span className="sr-only" role="status" aria-live="polite">
                {calibrated ? 'Calibrated. Your curve matches the target.' : ''}
              </span>
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
        <span className="mono">(x − h)²/a² − (y − k)²/b² = 1</span> &nbsp;·&nbsp; the hyperbola in
        standard form, plotted live from the dials on a 16×16 quadrille window.
      </footer>

      <style jsx>{`
        .hlab {
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
        .frac {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          vertical-align: middle;
          line-height: 1.15;
        }
        .frac .num {
          padding: 0 6px 1px;
          border-bottom: 1.6px solid currentColor;
        }
        .frac .den {
          padding: 1px 6px 0;
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
        .seg {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 2px 10px;
          padding-top: 4px;
          border-top: 1px solid rgba(28, 43, 58, 0.08);
        }
        .seg.locked {
          opacity: 0.5;
        }
        .seg-k {
          font-family: var(--serif);
          font-style: italic;
          font-size: 16px;
        }
        .seg-role {
          grid-row: 2;
          grid-column: 1;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .seg-btns {
          grid-row: 1 / 3;
          grid-column: 2;
          display: inline-flex;
          border: 1px solid rgba(28, 43, 58, 0.25);
          border-radius: 8px;
          overflow: hidden;
        }
        .seg-btns button {
          font: 600 12px/1 system-ui, sans-serif;
          padding: 8px 10px;
          border: none;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .seg-btns button + button {
          border-left: 1px solid rgba(28, 43, 58, 0.2);
        }
        .seg-btns button.on {
          background: var(--curve);
          color: #fff;
        }
        .seg-btns button:disabled {
          cursor: not-allowed;
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
        :global(.hlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .seg-btns button {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
