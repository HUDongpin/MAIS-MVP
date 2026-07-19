'use client';

/* ============================================================================
   AngleLab — an interactive "bench" for the ANGLE: the figure made by two rays
   sharing an endpoint, and the amount of turn between them.

        an angle = two rays from one vertex,  measured as  m∠ = θ°  =  θ·π/180 rad

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   Why this bench differs from the y = f(x) template, and how it stays faithful:
     • An angle is not a graph of a function — it is a GEOMETRIC figure: a vertex
       (here the origin, so the angle sits in "standard position") and two rays,
       the initial side and the terminal side. So the MODEL is two directions and
       a swept arc, and the RENDER draws rays, a filled interior wedge, and the
       arc of turn — not a per-pixel plot.
     • The single idea that IS the mathematics: the measure of an angle is the
       AMOUNT OF TURN between its sides — nothing else. It does not depend on how
       the angle is rotated (dial α) and it does not depend on how long the sides
       or how big the arc is drawn (dial r). The bench makes both invariances
       visible, and turns the same turn into degrees, into radians (θ·π/180), and
       into arc length (s = rθ) — the bridge to the unit circle in the Circle and
       Sine labs.
   Everything else — the state→model→render spine, DPI handling, unlocking dials,
   predict-then-check gating, and the calibration meter — is the same machine as
   the rest of the lab library.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/AngleLab.jsx
     2. Import and render it:
          import AngleLab from './AngleLab';
          export default function Page() { return <AngleLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (theta, alpha, r, step).
     MODEL  — the ray directions and swept arc are pure math; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

const DEG = Math.PI / 180;

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. A square window so degrees look the same in
   every direction (no distortion), with the vertex at the origin — i.e. angles
   are shown in STANDARD POSITION. Grid every 1 unit, labels every 2.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
const L_RAY = 9.4; // how far each ray is drawn from the vertex (world units)

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Each dial names the letter it drives, its range/step,
   and the lesson step at which it unlocks. Angles move in 15° steps so every
   classic angle (30, 45, 60, 90, 120, …) — and every calibration target — is
   reachable exactly.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'theta', label: 'θ', min: 0, max: 360, step: 15, unit: '°', unlock: 1, role: 'opening · the measure' },
  { key: 'alpha', label: 'α', min: 0, max: 345, step: 15, unit: '°', unlock: 3, role: 'orientation · initial side' },
  { key: 'r', label: 'r', min: 1, max: 8, step: 0.5, unit: '', unlock: 5, role: 'arc radius · drawing size' },
];
const START = { theta: 60, alpha: 0, r: 5 };

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the angle',
    body:
      'An angle is the figure made by two rays that start from the same point — the vertex; the ' +
      'rays are the sides. We measure the “opening” between the sides: how far one has turned ' +
      'from the other. On stage now: a 60° angle with its vertex at the origin.',
    q: 'What makes an angle?',
    choices: [
      'Two rays that share one endpoint, the vertex',
      'Two parallel lines',
      'A single curved line',
    ],
    answer: 0,
    feedback:
      'An angle is exactly two rays sharing an endpoint (the vertex). The rays are the sides — ' +
      'one the initial side, one the terminal side — and we measure the turn between them, the ' +
      'opening. A ray goes on forever: the turn, not the length you draw, decides the angle.',
  },
  {
    title: 'θ — measuring the opening in degrees',
    body:
      'The θ dial is live, and a protractor is now shown. We measure the opening in degrees. One ' +
      'full turn all the way around the vertex is 360°; a square corner is 90°. Drag θ and read ' +
      'the terminal side against the protractor.',
    showTool: 'protractor',
    q: 'A full turn, all the way around and back to the start, is how many degrees?',
    choices: ['360°', '180°', '90°'],
    answer: 0,
    feedback:
      'A full turn is 360°, a half turn (a straight line) is 180°, and a quarter turn (a square ' +
      'corner) is 90°. Each single degree is 1/360 of a full turn — the protractor just chops that ' +
      'full turn into those 360 equal steps so you can read the opening directly.',
  },
  {
    title: 'Naming angles by their size',
    body:
      'Angles get names from how big the opening is. Watch the label by the equation as you drag θ: ' +
      'below 90° is acute, exactly 90° is a right angle, between 90° and 180° is obtuse, exactly ' +
      '180° is straight (a flat line), and more than 180° is reflex.',
    q: 'An angle that measures 120° is called…',
    choices: ['Obtuse', 'Acute', 'Reflex'],
    answer: 0,
    feedback:
      '120° is obtuse — bigger than a right angle (90°) but less than a straight angle (180°). ' +
      'Acute is under 90°, a right angle is exactly 90° (its own little square mark appears), ' +
      'straight is exactly 180°, and reflex is anything over 180°.',
  },
  {
    title: 'α — turning the whole angle',
    body:
      'The α dial unlocks. It rotates the whole angle around its vertex — it aims the initial side ' +
      'in a new direction. When α = 0 the initial side lies along the positive x-axis: that is ' +
      'called standard position. Change α and watch the measure θ stay put.',
    q: 'You rotate the whole angle 40° around its vertex. Its measure θ …',
    choices: [
      'Stays the same — measure is the size of the opening, not the way it faces',
      'Increases by 40°',
      'Turns into its supplement',
    ],
    answer: 0,
    feedback:
      'The measure does not change. An angle’s measure is only the size of the opening between its ' +
      'sides, so turning the whole figure leaves θ exactly the same — a tilted 60° angle is still ' +
      '60°. Standard position (α = 0, initial side on the positive x-axis, measured counter-' +
      'clockwise) is just the tidy way we usually draw it.',
  },
  {
    title: 'Complementary and supplementary',
    body:
      'Two special partnerships. Two angles are complementary when they add to 90°, and ' +
      'supplementary when they add to 180°. The panel shows θ’s complement (if θ < 90°) and its ' +
      'supplement (if θ < 180°). Where two angles sit on a straight line, they are supplementary.',
    q: 'The supplement of a 50° angle is…',
    choices: ['130°', '40°', '310°'],
    answer: 0,
    feedback:
      'Supplements add to 180°, so 180° − 50° = 130°. (Complements add to 90°, which would give ' +
      '90° − 50° = 40°.) A handy check: a straight line is 180°, so an angle and the one that ' +
      'finishes the straight line are always supplementary.',
  },
  {
    title: 'r — radians and arc length',
    body:
      'The r dial unlocks and sets how big the arc is drawn. Here is the deep idea: measure the ' +
      'angle by ARC LENGTH ÷ RADIUS and you get radians. Because the radius divides out, the ' +
      'measure never changes when you drag r — the arc just gets longer (s = r·θ). A full turn is ' +
      '2π rad = 360°, so 180° = π rad and 90° = π/2 rad.',
    q: 'You make the arc radius r bigger. The angle’s measure…',
    choices: [
      'Does not change — a bigger radius only draws a longer arc (s = rθ)',
      'Gets bigger too',
      'Gets smaller',
    ],
    answer: 0,
    feedback:
      'The measure is unchanged. A radian is arc length divided by radius, so scaling the radius ' +
      'scales the arc by the same factor and the ratio — the angle — stays fixed. That ratio is ' +
      'why 360° = 2π rad exactly, the same 2π that wraps once around the unit circle in the Circle ' +
      'and Sine labs.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery angle is drawn with dashed grey sides. Tune θ and α until your ' +
      'carmine angle lands exactly on top of it and the meter reads CALIBRATED. The protractor and ' +
      '“Sweep” button are there to help you read it. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.
   The two sides point in directions α (initial) and α+θ (terminal), measured
   in degrees counter-clockwise from the positive x-axis. A point at direction
   φ° and length L is (L·cos φ, L·sin φ).
   ------------------------------------------------------------------------- */
function dirPoint(deg, L) {
  return [L * Math.cos(deg * DEG), L * Math.sin(deg * DEG)];
}

/* Classify the opening. Exact 90 and 180 are reachable (θ steps by 15°). */
function classify(theta) {
  if (theta <= 0) return 'zero';
  if (theta < 90) return 'acute';
  if (theta === 90) return 'right';
  if (theta < 180) return 'obtuse';
  if (theta === 180) return 'straight';
  if (theta < 360) return 'reflex';
  return 'full';
}

/* Measurements derived from the parameters — all exact for the angle. */
function geometry(p) {
  const rad = p.theta * DEG;
  return {
    rad,
    arc: p.r * rad, // s = rθ, the arc length swept at radius r
    complement: p.theta > 0 && p.theta <= 90 ? 90 - p.theta : null,
    supplement: p.theta > 0 && p.theta <= 180 ? 180 - p.theta : null,
    type: classify(p.theta),
  };
}

/* ---------------------------------------------------------------------------
   Radians as an exact fraction of π. Since θ is a whole number of degrees,
   θ° = (θ/180)·π rad, and θ/180 reduces to a tidy fraction — e.g. 120° → 2π/3.
   ------------------------------------------------------------------------- */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}
function radianLabel(deg) {
  if (deg === 0) return '0';
  const g = gcd(deg, 180);
  const num = deg / g;
  const den = 180 / g;
  const np = num === 1 ? 'π' : `${num}π`;
  return den === 1 ? np : `${np}/${den}`;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. The match metric is the RMS of the two angular errors:
   how far the user's initial side is from the target's, and how far the user's
   terminal side is from the target's. It is 0 exactly when α AND θ both match,
   and — because the two sides are compared separately — it distinguishes an
   angle from its reflex twin (same sides, opposite sweep). Targets snap to the
   15° grid, so an exact (error = 0) match is always reachable.
   ------------------------------------------------------------------------- */
function angDiff(a, b) {
  let d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d; // shortest gap between two directions, 0…180°
}
function matchError(p, t) {
  const eInit = angDiff(p.alpha, t.alpha);
  const eTerm = angDiff(p.alpha + p.theta, t.alpha + t.theta);
  return Math.sqrt((eInit * eInit + eTerm * eTerm) / 2);
}
const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + err / 22)));
const MATCH_ERR = 0.5; // below this the two angles are identical -> CALIBRATED

function makeTarget(prev) {
  const pick = (lo, hi) => {
    const n = Math.floor((hi - lo) / 15) + 1;
    return lo + 15 * Math.floor(Math.random() * n);
  };
  let t;
  do {
    const theta = pick(30, 330); // avoid the degenerate 0°/360°
    const alpha = pick(0, 345);
    t = { theta, alpha };
  } while (
    (prev && t.theta === prev.theta && t.alpha === prev.alpha) ||
    (t.theta === START.theta && t.alpha === START.alpha) // never hand back the start
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

/* EDIT 5 — Equation display. An angle's "equation" is its measure. The carmine
   readout states it as m∠ = θ°, and the sub-line gives the two other faces of
   the very same turn: radians (θ·π/180) and arc length (s = rθ). */
function AngleEquation({ theta }) {
  return (
    <span className="eq">
      <span className="eq-lhs">m∠</span>
      <span className="eq-op">=</span>
      <span>{theta}°</span>
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function AngleLab() {
  const [theta, setTheta] = useState(START.theta);
  const [alpha, setAlpha] = useState(START.alpha);
  const [r, setR] = useState(START.r);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [sweeping, setSweeping] = useState(false);
  const [showProtractor, setShowProtractor] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // world point under the pointer, or null
  const sweepRef = useRef(null); // the currently-swept opening (deg), or null
  const sceneRef = useRef({});

  const params = { theta, alpha, r };
  const current = STEPS[step];
  const g = geometry(params);

  // Snapshot everything the renderer needs, so draw() (a stable callback) and
  // the pointer/sweep handlers never read stale values.
  sceneRef.current = { theta, alpha, r, calib: !!current.calib, target, showProtractor };

  const err = target ? matchError(params, target) : Infinity;
  const pct = target ? matchPercent(err) : 0;
  const calibrated = target ? err < MATCH_ERR : false;

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
    const cx = sx(0);
    const cy = sy(0); // the vertex, at the origin
    const dirScreen = (deg, L) => {
      const [x, y] = dirPoint(deg, L);
      return [sx(x), sy(y)];
    };

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

    /* a small monospace tag with a soft paper backing, for on-canvas labels */
    const tag = (text, X, Y, align = 'center', color = '#5B6B7B') => {
      ctx.save();
      ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(text).width;
      const bx = align === 'center' ? X - tw / 2 - 2 : align === 'left' ? X - 2 : X - tw - 2;
      ctx.fillStyle = 'rgba(251,251,248,0.85)';
      ctx.fillRect(bx, Y - 8, tw + 4, 15);
      ctx.fillStyle = color;
      ctx.fillText(text, X, Y);
      ctx.restore();
    };

    /* draws one ray from the vertex in a given direction, with an arrowhead */
    const drawRay = (deg, color, width, dash, arrow = true) => {
      const [tx, ty] = dirScreen(deg, L_RAY);
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.setLineDash(dash || []);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      if (arrow) {
        const vx = tx - cx;
        const vy = ty - cy;
        const len = Math.hypot(vx, vy) || 1;
        const ux = vx / len;
        const uy = vy / len;
        const a = 12;
        const w = 6;
        const bx = tx - ux * a;
        const by = ty - uy * a;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(bx - uy * w, by + ux * w);
        ctx.lineTo(bx + uy * w, by - ux * w);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.restore();
    };

    /* samples the arc from a0° to a1° at world radius R into screen points */
    const arcPts = (a0, a1, R) => {
      const N = Math.max(2, Math.round(Math.abs(a1 - a0) / 2));
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const ang = a0 + ((a1 - a0) * i) / N;
        pts.push(dirScreen(ang, R));
      }
      return pts;
    };
    const strokeArc = (a0, a1, R, color, width, dash) => {
      const pts = arcPts(a0, a1, R);
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.setLineDash(dash || []);
      ctx.lineCap = 'round';
      ctx.beginPath();
      pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
      ctx.stroke();
      ctx.restore();
    };

    /* ---- calibration target: the mystery angle, dashed grey, drawn under ---- */
    if (S.calib && S.target) {
      const grey = 'rgba(91,107,123,0.9)';
      drawRay(S.target.alpha, grey, 2, [7, 6]);
      drawRay(S.target.alpha + S.target.theta, grey, 2, [7, 6]);
      strokeArc(S.target.alpha, S.target.alpha + S.target.theta, 3, grey, 2, [5, 5]);
    }

    /* ---- protractor: a neutral measuring tool aligned to the initial side --- */
    if (S.showProtractor) {
      const pr = S.r; // the reading radius = the r dial
      const ring = 'rgba(28,43,58,0.32)';
      // the full-circle scale
      strokeArc(S.alpha, S.alpha + 360, pr, ring, 1.2);
      ctx.save();
      ctx.font = '10px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.fillStyle = 'rgba(91,107,123,0.95)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let d = 0; d < 360; d += 10) {
        const major = d % 30 === 0;
        const inner = pr - (major ? 0.7 : 0.38);
        const [ix, iy] = dirScreen(S.alpha + d, inner);
        const [ox, oy] = dirScreen(S.alpha + d, pr);
        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.lineTo(ox, oy);
        ctx.strokeStyle = major ? 'rgba(28,43,58,0.4)' : 'rgba(28,43,58,0.22)';
        ctx.lineWidth = major ? 1.3 : 0.9;
        ctx.stroke();
        if (major) {
          const [lx, ly] = dirScreen(S.alpha + d, pr + 0.75);
          ctx.fillText(String(d), lx, ly);
        }
      }
      ctx.restore();
    }

    /* the opening actually drawn — the sweep animation overrides θ while it runs */
    const drawn = sweepRef.current != null ? sweepRef.current : S.theta;
    const mid = S.alpha + drawn / 2;

    /* ---- the angle (the one carmine accent) --------------------------------- */
    const CARMINE = '#C81E4F';

    /* interior wedge: vertex → along the arc → back to vertex, filled faintly */
    if (drawn > 0.01) {
      const pts = arcPts(S.alpha, S.alpha + drawn, S.r);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      pts.forEach(([X, Y]) => ctx.lineTo(X, Y));
      ctx.closePath();
      ctx.fillStyle = 'rgba(200,30,79,0.10)';
      ctx.fill();
      ctx.restore();
    }

    /* the arc of turn, or — for a right angle — the conventional square mark */
    if (Math.abs(drawn - 90) < 0.001) {
      const s = 1.3;
      const [ax, ay] = dirScreen(S.alpha, s);
      const [bx2, by2] = dirScreen(S.alpha + 90, s);
      const [ux, uy] = dirPoint(S.alpha, s);
      const [vx, vy] = dirPoint(S.alpha + 90, s);
      const [kx, ky] = [sx(ux + vx), sy(uy + vy)];
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = CARMINE;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(kx, ky);
      ctx.lineTo(bx2, by2);
      ctx.stroke();
      ctx.restore();
    } else if (drawn > 0.01) {
      strokeArc(S.alpha, S.alpha + drawn, S.r, CARMINE, 2.75);
    }

    /* the two sides — carmine rays with arrowheads */
    drawRay(S.alpha, CARMINE, 2.75);
    drawRay(S.alpha + drawn, CARMINE, 2.75);

    /* the measure, printed inside the opening */
    {
      const lr = Math.min(S.r * 0.56, 3.1);
      const [mxp, myp] = dirScreen(mid, lr);
      ctx.save();
      ctx.font = '700 15px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = `${Math.round(drawn)}°`;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(251,251,248,0.82)';
      ctx.fillRect(mxp - tw / 2 - 3, myp - 9, tw + 6, 18);
      ctx.fillStyle = CARMINE;
      ctx.fillText(label, mxp, myp);
      ctx.restore();
    }

    /* side labels + vertex, hidden during calibration to keep the target clean */
    if (!S.calib) {
      const [i1x, i1y] = dirScreen(S.alpha, L_RAY * 0.72);
      tag('initial side', i1x, i1y - 12, 'center', '#8a4a5c');
      const [t1x, t1y] = dirScreen(S.alpha + drawn, L_RAY * 0.72);
      tag('terminal side', t1x, t1y - 12, 'center', '#8a4a5c');
      tag('vertex', cx, cy + 16, 'center');
    }

    /* the vertex dot, always on top of the spokes */
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#1C2B3A';
    ctx.fill();

    /* ---- hover: a light measuring ray reading the angle from the initial side */
    if (hoverRef.current) {
      const hv = hoverRef.current;
      const dir = Math.atan2(hv.y, hv.x) / DEG;
      let a = (((dir - S.alpha) % 360) + 360) % 360; // measured CCW from initial side
      const [hx, hy] = dirScreen(dir, S.r);
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(28,43,58,0.5)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.restore();
      const [lx, ly] = dirScreen(dir, S.r + 1.1);
      tag(`${Math.round(a)}° from initial side`, lx, ly, 'center', '#1C2B3A');
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [theta, alpha, r, step, target, showProtractor, draw]);

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

  /* a step can auto-reveal its tool (the θ step turns the protractor on) */
  useEffect(() => {
    if (STEPS[step] && STEPS[step].showTool === 'protractor') setShowProtractor(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the sweep — time-based (dt), opt-in, and respects reduced motion */
  useEffect(() => {
    if (!sweeping) {
      sweepRef.current = null;
      draw();
      return;
    }
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setSweeping(false);
      return;
    }
    let raf;
    let start = null;
    const DURATION = 700 + theta * 7; // longer angles take a touch longer to sweep
    const loop = (now) => {
      if (start == null) start = now;
      const f = Math.min(1, (now - start) / DURATION);
      sweepRef.current = f * theta; // open from 0 up to θ
      draw();
      if (f < 1) raf = requestAnimationFrame(loop);
      else {
        sweepRef.current = null;
        setSweeping(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sweeping, theta, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 'theta') setTheta(v);
    else if (key === 'alpha') setAlpha(v);
    else setR(v);
    if (sweeping) setSweeping(false); // a dial move ends any sweep
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
    setTheta(START.theta);
    setAlpha(START.alpha);
    setR(START.r);
    if (sweeping) setSweeping(false);
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

  const typeName = {
    zero: 'zero angle',
    acute: 'acute',
    right: 'right angle',
    obtuse: 'obtuse',
    straight: 'straight',
    reflex: 'reflex',
    full: 'full turn',
  }[g.type];

  return (
    <div className="alab">
      <header className="head">
        <h1>Angles</h1>
        <p className="lede">
          An angle is two rays sharing a vertex, and its measure is the{' '}
          <span className="mono">amount of turn</span> between them. Each dial unlocks with the
          lesson, so you meet one idea at a time — name angles by size, see that turning or resizing
          them changes nothing, read the same angle in degrees and radians, then calibrate your angle
          onto a mystery target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <AngleEquation theta={theta} />
              <span className={'chip chip-' + g.type}>{typeName}</span>
            </p>
            <p className="equation-sub mono">
              = {radianLabel(theta)} rad ≈ {g.rad.toFixed(3)} &nbsp;·&nbsp; arc s = rθ ≈{' '}
              {g.arc.toFixed(2)}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">hover to measure any direction from the initial side</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Measure</span>
              <span className="fact-v mono">{`${trim(theta)}°`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">In radians</span>
              <span className="fact-v mono">{`${radianLabel(theta)} ≈ ${g.rad.toFixed(2)}`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Type</span>
              <span className="fact-v mono">{typeName}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Complement (→90°)</span>
              <span className="fact-v mono">
                {g.complement != null ? `${trim(g.complement)}°` : '—'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Supplement (→180°)</span>
              <span className="fact-v mono">
                {g.supplement != null ? `${trim(g.supplement)}°` : '—'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Arc length (s = rθ)</span>
              <span className="fact-v mono">{`${g.arc.toFixed(2)}`}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (sweeping ? ' on' : '')}
              onClick={() => setSweeping((s) => !s)}
            >
              {sweeping ? 'Sweeping…' : 'Sweep the angle'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showProtractor ? ' on' : '')}
              onClick={() => setShowProtractor((s) => !s)}
            >
              {showProtractor ? 'Protractor shown' : 'Show protractor'}
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
              const val = { theta, alpha, r }[d.key];
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
                  <output className="dv">{unlocked ? `${trim(val)}${d.unit}` : '🔒'}</output>
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
                  <span className="mono target-hint">target: θ = ?, α = ?</span>
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
                  setSweeping(false);
                  setShowProtractor(false);
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
        <span className="mono">m∠ = θ° = θ·π/180 rad</span> &nbsp;·&nbsp; an angle is the turn
        between two rays from one vertex, plotted live on a 20×20 quadrille window; a full turn is
        360° = 2π rad.
      </footer>

      <style jsx>{`
        .alab {
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
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        .eq {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 17px;
          font-weight: 600;
        }
        .eq-lhs {
          font-family: var(--serif);
        }
        .eq-op {
          font-weight: 600;
        }
        /* the live angle-type label — a neutral chip, so carmine stays the angle */
        .chip {
          font: 600 11px/1 var(--mono);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          background: rgba(28, 43, 58, 0.06);
          border: 1px solid rgba(28, 43, 58, 0.16);
          border-radius: 999px;
          padding: 4px 9px;
        }
        .chip-right {
          color: var(--ink);
          border-color: rgba(28, 43, 58, 0.4);
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
        :global(.alab) :focus-visible {
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
