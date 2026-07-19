'use client';

/* ============================================================================
   TriangleLab — an interactive "bench" for the triangle: its vertices, sides,
   angles, and the theorem that ties them together,

        ∠A  +  ∠B  +  ∠C  =  180°

   Built for MAIS (math AI system, www.mais.hk), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, a staged lesson that reveals
   one idea at a time, predict-then-check questions, and a calibration challenge
   with a live match meter.

   Why this bench adapts the y = f(x) / dial template, and how it stays faithful:
     • A triangle is a SHAPE you build from three points, not a curve driven by
       a handful of parameters. So the natural control is DIRECT MANIPULATION —
       you drag the vertices A, B, C (pointer or keyboard) — rather than sliders.
       This is the same principled adaptation the conic and 3-D labs made when a
       plain slider/plot no longer fit the object (see the Ellipse, Cone, Cube).
     • "One dial unlocks per lesson step" becomes "one OVERLAY reveals per step":
       sides → angles → the angle-sum theorem → classification → area. Each step
       turns on exactly one new layer of the SAME triangle, so the student still
       meets one idea at a time.
     • The triangle's defining beauty — the analogue of the ellipse "string" or
       the circle's "radius triangle" — is the ANGLE-SUM THEOREM: no matter how
       you drag the corners, the three interior angles always total 180°. The
       centerpiece makes that invariant visible by tearing the three corners off
       and laying them side by side, where they fill a perfectly straight angle.
   Everything else — the state→model→render spine, DPI handling, predict-then-
   check gating (Next is gated on ANSWERED, not on CORRECT), and the RMS
   calibration meter — is the same machine as the rest of the lab library.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/TriangleLab.jsx
     2. Import and render it:
          import TriangleLab from './TriangleLab';
          export default function Page() { return <TriangleLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (A, B, C, step).
     MODEL  — pure geometry (angles, sides, area) that knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   World window & axes. A square window so x and y share one scale and angles
   are never sheared. Grid every 1 unit, labels every 2. Vertices are kept
   inside a slightly smaller box so labels and handles never clip the edge.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
const GRID = 0.5; // vertices snap to a half-unit grid: crisp, and exact matches are reachable
const BOUND = 9.5; // vertices stay within ±BOUND

/* Starting triangle: a plain scalene triangle with a horizontal base, well
   inside the window. Deliberately NOT special (not isosceles/right) so the
   first thing a student sees isn't a symmetric special case. */
const START = {
  A: { x: -4, y: -3 },
  B: { x: 4, y: -3 },
  C: { x: 1, y: 4 },
};

/* Canonical examples for the classification step — each an exact instance of a
   named type. Equilateral is irrational-by-construction (no equilateral
   triangle has all vertices on a grid), so its coordinates are off-grid; that
   is mathematically correct, and dragging any corner returns to grid play. */
const PRESETS = {
  Equilateral: (() => {
    const R = 4.6; // circumradius; vertices at 90°, 210°, 330°
    return {
      A: { x: 0, y: R },
      B: { x: -R * Math.sqrt(3) / 2, y: -R / 2 },
      C: { x: R * Math.sqrt(3) / 2, y: -R / 2 },
    };
  })(),
  Isosceles: { A: { x: -4, y: -3 }, B: { x: 4, y: -3 }, C: { x: 0, y: 4 } },
  Right: { A: { x: -3, y: -3 }, B: { x: 5, y: -3 }, C: { x: -3, y: 2 } },
  Obtuse: { A: { x: -5, y: -2 }, B: { x: 3, y: -2 }, C: { x: 4, y: 1 } },
};

/* ---------------------------------------------------------------------------
   The lesson. One idea per step; the matching overlay turns on with the step;
   the reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the triangle',
    body:
      'A triangle is the simplest closed shape: three corners (vertices) joined by three straight ' +
      'sides. Grab any corner and drag it — on a touchscreen, or with a mouse — or select a vertex ' +
      'below and nudge it with the arrow keys. However you reshape it, it stays a triangle.',
    q: 'What is the smallest number of straight sides a closed shape can have?',
    choices: ['Three', 'Two', 'Four'],
    answer: 0,
    feedback:
      'Three. With only two straight segments you can’t close up a region — you need at least three ' +
      'sides, and three sides is exactly a triangle. Three vertices, three sides, three angles: the ' +
      'triangle is the building block every other polygon is cut from.',
  },
  {
    title: 'Vertices and sides',
    body:
      'The three corners are named A, B, and C. Each side gets the lowercase letter of the vertex ' +
      'across from it: side a is opposite vertex A, side b opposite B, side c opposite C. So side a ' +
      'is the one that does NOT touch corner A. The side labels are now switched on.',
    q: 'Which side is labelled c?',
    choices: [
      'The side opposite vertex C — the side joining A and B',
      'The side opposite vertex A',
      'Whichever side is on the bottom',
    ],
    answer: 0,
    feedback:
      'Side c sits across from vertex C, so it’s the side connecting the other two corners, A and B. ' +
      'This “opposite” naming is the convention every triangle theorem uses — the Law of Sines and ' +
      'Law of Cosines both pair each side with the angle across from it.',
  },
  {
    title: 'The three angles',
    body:
      'Every corner holds an interior angle: ∠A opens between sides b and c, and so on. The angle ' +
      'arcs are now drawn at each vertex with their measures in degrees. Drag a corner and watch the ' +
      'three angles change — the wide corner is opposite the long side, the pinched corner opposite ' +
      'the short side.',
    q: 'You drag a corner to make one angle bigger. What must happen to the other two angles?',
    choices: [
      'Together they must shrink by the same amount',
      'They stay exactly the same',
      'They both grow too',
    ],
    answer: 0,
    feedback:
      'The three angles are in a fixed budget. If one grows, the other two must give back exactly that ' +
      'much between them — because the three always add to the same total. That total is the subject of ' +
      'the next step, and it’s the most useful fact about triangles you’ll ever learn.',
  },
  {
    title: 'The angle-sum theorem',
    body:
      'Here is the heart of it. Tear the three corners off and lay them side by side: they fit together ' +
      'into a perfectly straight line — a straight angle of 180°. That is the triangle angle-sum ' +
      'theorem, ∠A + ∠B + ∠C = 180°, and it holds for EVERY triangle. Drag any corner: the three ' +
      'measures change, but the running sum below is glued to 180°.',
    q: 'Two angles of a triangle are 50° and 60°. What is the third angle?',
    choices: ['70°', '110°', '90°'],
    answer: 0,
    feedback:
      '70°, because the three must total 180°: 180 − 50 − 60 = 70. This one fact lets you find any ' +
      'missing angle from the other two, and it’s why the “torn corners” always straighten into a flat ' +
      '180° line. (It’s true because the corners rearrange into the co-interior angles on a straight ' +
      'line drawn parallel to one side — the classic proof.)',
  },
  {
    title: 'Classifying triangles',
    body:
      'Triangles are sorted two ways at once. By SIDES: all three equal is equilateral, exactly two ' +
      'equal is isosceles, all different is scalene. By ANGLES: all under 90° is acute, one exactly ' +
      '90° is right, one over 90° is obtuse. Try the example buttons, or drag your own — the badge ' +
      'names your triangle live.',
    q: 'Can a triangle be both right and isosceles at the same time?',
    choices: [
      'Yes — a right angle plus two equal legs (a 45°–45°–90° triangle)',
      'No — right triangles are always scalene',
      'No — isosceles triangles are always acute',
    ],
    answer: 0,
    feedback:
      'Yes. The side and angle labels are independent, so they combine: a 45°–45°–90° triangle is right ' +
      'AND isosceles. An equilateral triangle is always three 60° angles (so always acute), but most ' +
      'other combinations are possible — right-scalene, obtuse-isosceles, and so on.',
  },
  {
    title: 'Area = ½ · base · height',
    body:
      'Pick any side to be the base. The height is the straight-down distance from the opposite corner ' +
      'to that base (the dashed altitude, meeting the base at a right angle). The area is half of the ' +
      'base×height rectangle: A = ½ · base · height. Switch the base with the buttons — the area comes ' +
      'out the same every time.',
    q: 'You keep the base the same but drag the top corner sideways, keeping its height unchanged. What happens to the area?',
    choices: [
      'It stays the same — area depends only on base and height',
      'It grows because a side got longer',
      'It shrinks because the triangle looks more slanted',
    ],
    answer: 0,
    feedback:
      'It stays exactly the same. Sliding the apex parallel to the base changes the shape and the side ' +
      'lengths, but not the base or the height — so ½ · base · height is unchanged. That’s why a leaning ' +
      'triangle and an upright one on the same base with the same height have equal area.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery triangle is drawn as a dashed grey outline. Drag your carmine corners ' +
      'onto it — the labels don’t have to match, only the shape and position — until the meter reads ' +
      'CALIBRATED. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   MODEL — pure geometry. No pixels. Single source of truth for every number
   the UI and the canvas display, so a label can never drift from the picture.
   Convention: side a = |BC| (opposite A), b = |CA| (opposite B), c = |AB|.
   ------------------------------------------------------------------------- */
const RAD2DEG = 180 / Math.PI;
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

/* Interior angle at vertex V, given its two neighbours P and Q. Uses
   atan2(|cross|, dot) — numerically stable near 0° and 180°, unlike acos. */
function angleAt(V, P, Q) {
  const ux = P.x - V.x, uy = P.y - V.y;
  const wx = Q.x - V.x, wy = Q.y - V.y;
  const cross = ux * wy - uy * wx;
  const dot = ux * wx + uy * wy;
  return Math.atan2(Math.abs(cross), dot) * RAD2DEG;
}

/* Signed double-area via the shoelace formula; |area| is the triangle's area. */
function doubleSignedArea(t) {
  return (
    t.A.x * (t.B.y - t.C.y) +
    t.B.x * (t.C.y - t.A.y) +
    t.C.x * (t.A.y - t.B.y)
  );
}

const SIDE_TOL2 = 1e-6; // equal side lengths, compared as squared lengths (exact on the grid)
const RIGHT_TOL = 0.5; // degrees: within this of 90° counts as a right angle

function classifyBySides(a, b, c) {
  // compare squared lengths for exactness on grid coordinates
  const a2 = a * a, b2 = b * b, c2 = c * c;
  const eqAB = Math.abs(a2 - b2) < SIDE_TOL2;
  const eqBC = Math.abs(b2 - c2) < SIDE_TOL2;
  const eqCA = Math.abs(c2 - a2) < SIDE_TOL2;
  if (eqAB && eqBC && eqCA) return 'equilateral';
  if (eqAB || eqBC || eqCA) return 'isosceles';
  return 'scalene';
}

function classifyByAngles(A, B, C) {
  const max = Math.max(A, B, C);
  if (Math.abs(max - 90) <= RIGHT_TOL) return 'right';
  if (max > 90) return 'obtuse';
  return 'acute';
}

/* Foot of the altitude from apex R onto the line through base P→Q, plus the
   height (perpendicular distance). t is the projection parameter; t outside
   [0,1] means the foot lands beyond the base segment (an obtuse triangle). */
function altitude(P, Q, R) {
  const dx = Q.x - P.x, dy = Q.y - P.y;
  const L2 = dx * dx + dy * dy || 1;
  const t = ((R.x - P.x) * dx + (R.y - P.y) * dy) / L2;
  const foot = { x: P.x + t * dx, y: P.y + t * dy };
  return { foot, t, height: dist(R, foot) };
}

/* Everything the UI needs, computed once from the three vertices. */
function geometry(t) {
  const a = dist(t.B, t.C); // opposite A
  const b = dist(t.C, t.A); // opposite B
  const c = dist(t.A, t.B); // opposite C
  const twoArea = doubleSignedArea(t);
  const area = Math.abs(twoArea) / 2;
  const degenerate = area < 1e-6 || a < 1e-9 || b < 1e-9 || c < 1e-9;

  const A = degenerate ? 0 : angleAt(t.A, t.B, t.C);
  const B = degenerate ? 0 : angleAt(t.B, t.C, t.A);
  const C = degenerate ? 0 : angleAt(t.C, t.A, t.B);

  return {
    sides: { a, b, c },
    angles: { A, B, C },
    sum: A + B + C, // = 180 for any non-degenerate planar triangle
    perimeter: a + b + c,
    area,
    degenerate,
    classSides: degenerate ? '—' : classifyBySides(a, b, c),
    classAngles: degenerate ? '—' : classifyByAngles(A, B, C),
  };
}

/* ---------------------------------------------------------------------------
   Calibration. The match metric is the RMS distance between the user's three
   vertices and the target's, minimised over all 6 ways of pairing them up —
   because a triangle is an unordered set of corners, so which handle is "A"
   must not matter. It is 0 exactly when the two triangles coincide, and the
   targets sit on the grid, so an exact (RMS = 0) match is reachable.
   ------------------------------------------------------------------------- */
const PERMS = [
  [0, 1, 2], [0, 2, 1], [1, 0, 2],
  [1, 2, 0], [2, 0, 1], [2, 1, 0],
];
function rmsMatch(t, target) {
  const u = [t.A, t.B, t.C];
  const v = [target.A, target.B, target.C];
  let best = Infinity;
  for (const p of PERMS) {
    let s = 0;
    for (let i = 0; i < 3; i++) {
      const dx = u[i].x - v[p[i]].x;
      const dy = u[i].y - v[p[i]].y;
      s += dx * dx + dy * dy;
    }
    const rms = Math.sqrt(s / 3);
    if (rms < best) best = rms;
  }
  return best;
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 1.2)));
const MATCH_RMS = 0.03; // below this the two triangles are effectively identical -> CALIBRATED

function makeTarget(prev) {
  const snap = (v) => Math.round(v / GRID) * GRID;
  const randPt = () => ({ x: snap(-6 + Math.random() * 12), y: snap(-6 + Math.random() * 12) });
  let t;
  let guard = 0;
  do {
    t = { A: randPt(), B: randPt(), C: randPt() };
    guard++;
  } while (
    guard < 200 &&
    (geometry(t).area < 6 || // avoid slivers and degenerate targets
      (prev && rmsMatch(t, prev) < 0.5) ||
      rmsMatch(t, START) < 0.5) // never hand back the starting triangle
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
const pt = (p) => `(${trim(p.x)}, ${trim(p.y)})`;

/* Sum-preserving display of the three angles: round each to one decimal but
   nudge (by at most 0.1°) so the three shown values ALWAYS total exactly
   180.0°. Without this, three independently-rounded parts can read, say,
   "60.1 + 60.1 + 59.9 = 180.0" — visibly not adding up — which would undermine
   the one theorem this whole lab is about. Same idea as rounding percentages so
   they sum to 100%. Returns three "xx.x" strings that sum to 180.0. */
function angleParts(A, B, C) {
  const vals = [A, B, C];
  const tenths = vals.map((v) => Math.round(v * 10)); // nearest 0.1°, in tenths
  const diff = 1800 - (tenths[0] + tenths[1] + tenths[2]); // ∈ {−1, 0, 1}
  if (diff !== 0) {
    const resid = vals.map((v, i) => v * 10 - tenths[i]); // rounding residual
    const order = [0, 1, 2].sort((i, j) => (diff > 0 ? resid[j] - resid[i] : resid[i] - resid[j]));
    for (let j = 0; j < Math.abs(diff) && j < 3; j++) tenths[order[j]] += diff > 0 ? 1 : -1;
  }
  return tenths.map((t) => (t / 10).toFixed(1));
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TriangleLab() {
  const [tri, setTri] = useState(START);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [selected, setSelected] = useState('A'); // which vertex the keyboard nudges
  const [straighten, setStraighten] = useState(false); // the "tear the corners" demo
  const [showAlt, setShowAlt] = useState(false); // the altitude / area overlay
  const [base, setBase] = useState('c'); // which side is the area base: 'a' | 'b' | 'c'

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null); // key of the vertex being dragged, or null
  const assembleRef = useRef(1); // 0..1 progress of the straighten animation
  const sceneRef = useRef({});

  const geo = geometry(tri);
  const current = STEPS[step];
  // sum-preserving angle strings (always total exactly 180.0°)
  const pa = geo.degenerate ? null : angleParts(geo.angles.A, geo.angles.B, geo.angles.C);

  // Which overlays are live at this step (progressive reveal, one per step).
  const showSides = step >= 1;
  const showAngles = step >= 2;
  const areaStep = step === 5; // the area step exactly (not calibration)

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer/keyboard handlers never read stale values.
  sceneRef.current = {
    tri,
    calib: !!current.calib,
    target,
    selected,
    showSides,
    showAngles,
    straighten,
    showAlt: showAlt || areaStep,
    base,
    geo,
  };

  const rms = target ? rmsMatch(tri, target) : Infinity;
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
    const t = S.tri;
    const g = S.geo;
    const V = { A: t.A, B: t.B, C: t.C };

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
      ctx.font = '11.5px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(text).width;
      const bx = align === 'center' ? X - tw / 2 - 3 : align === 'left' ? X - 3 : X - tw - 3;
      ctx.fillStyle = 'rgba(251,251,248,0.9)';
      ctx.fillRect(bx, Y - 8, tw + 6, 16);
      ctx.fillStyle = color;
      ctx.fillText(text, X, Y);
      ctx.restore();
    };

    const centroid = { x: (t.A.x + t.B.x + t.C.x) / 3, y: (t.A.y + t.B.y + t.C.y) / 3 };
    // one sum-preserving set of angle strings, shared by the vertex arcs and the
    // "straighten" inset so every angle readout on the canvas matches the header
    const aParts = g.degenerate ? null : angleParts(g.angles.A, g.angles.B, g.angles.C);

    /* ---- target ghost (calibration only), dashed grey, under the accent ---- */
    if (S.calib && S.target) {
      const q = S.target;
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(91,107,123,0.85)';
      ctx.setLineDash([7, 6]);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(sx(q.A.x), sy(q.A.y));
      ctx.lineTo(sx(q.B.x), sy(q.B.y));
      ctx.lineTo(sx(q.C.x), sy(q.C.y));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    /* ---- the altitude / area overlay (drawn under the outline) ------------- */
    if (S.showAlt && !g.degenerate) {
      // base side endpoints P,Q and apex R
      const map = {
        a: [V.B, V.C, V.A],
        b: [V.C, V.A, V.B],
        c: [V.A, V.B, V.C],
      };
      const [P, Q, R] = map[S.base];
      const alt = altitude(P, Q, R);

      // shaded triangle body (a touch stronger here to read as "area")
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sx(t.A.x), sy(t.A.y));
      ctx.lineTo(sx(t.B.x), sy(t.B.y));
      ctx.lineTo(sx(t.C.x), sy(t.C.y));
      ctx.closePath();
      ctx.fillStyle = 'rgba(200,30,79,0.10)';
      ctx.fill();
      ctx.restore();

      // if the foot lands off the base segment, extend the base line to it
      if (alt.t < 0 || alt.t > 1) {
        ctx.save();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(91,107,123,0.5)';
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(sx(P.x), sy(P.y));
        ctx.lineTo(sx(alt.foot.x), sy(alt.foot.y));
        ctx.lineTo(sx(Q.x), sy(Q.y));
        ctx.stroke();
        ctx.restore();
      }

      // the altitude (height) — a dashed ink segment from apex to foot
      ctx.save();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(28,43,58,0.75)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(sx(R.x), sy(R.y));
      ctx.lineTo(sx(alt.foot.x), sy(alt.foot.y));
      ctx.stroke();
      ctx.restore();

      // right-angle marker at the foot
      {
        const bx = Q.x - P.x, by = Q.y - P.y;
        const bl = Math.hypot(bx, by) || 1;
        const ubx = bx / bl, uby = by / bl; // unit along base
        let rx = R.x - alt.foot.x, ry = R.y - alt.foot.y;
        const rl = Math.hypot(rx, ry) || 1;
        rx /= rl; ry /= rl; // unit along altitude toward apex
        const m = 0.5; // world units
        const p1 = { x: alt.foot.x + ubx * m, y: alt.foot.y + uby * m };
        const p2 = { x: alt.foot.x + ubx * m + rx * m, y: alt.foot.y + uby * m + ry * m };
        const p3 = { x: alt.foot.x + rx * m, y: alt.foot.y + ry * m };
        ctx.save();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(28,43,58,0.6)';
        ctx.beginPath();
        ctx.moveTo(sx(p1.x), sy(p1.y));
        ctx.lineTo(sx(p2.x), sy(p2.y));
        ctx.lineTo(sx(p3.x), sy(p3.y));
        ctx.stroke();
        ctx.restore();
      }

      // labels: base (carmine, on the base) and height (ink, along the altitude)
      const baseMid = { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 };
      let obx = baseMid.x - centroid.x, oby = baseMid.y - centroid.y;
      const obl = Math.hypot(obx, oby) || 1;
      obx /= obl; oby /= obl;
      tag(`base = ${trim(dist(P, Q))}`, sx(baseMid.x) + obx * 14, sy(baseMid.y) - oby * 14, 'center', '#C81E4F');
      const hMid = { x: (R.x + alt.foot.x) / 2, y: (R.y + alt.foot.y) / 2 };
      tag(`h = ${trim(alt.height)}`, sx(hMid.x) + 6, sy(hMid.y), 'left', '#1C2B3A');
    }

    /* ---- the triangle body (faint carmine wash = the object) --------------- */
    if (!S.showAlt) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sx(t.A.x), sy(t.A.y));
      ctx.lineTo(sx(t.B.x), sy(t.B.y));
      ctx.lineTo(sx(t.C.x), sy(t.C.y));
      ctx.closePath();
      ctx.fillStyle = 'rgba(200,30,79,0.05)';
      ctx.fill();
      ctx.restore();
    }

    /* ---- the three sides — the one carmine accent -------------------------- */
    ctx.save();
    ctx.lineWidth = 2.75;
    ctx.strokeStyle = '#C81E4F';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(sx(t.A.x), sy(t.A.y));
    ctx.lineTo(sx(t.B.x), sy(t.B.y));
    ctx.lineTo(sx(t.C.x), sy(t.C.y));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    /* ---- side labels a, b, c (opposite their vertices) — hidden while the
       altitude overlay is up, so base/height labels don't collide with them --- */
    if (S.showSides && !S.showAlt && !g.degenerate) {
      const sideLabel = (P, Q, letter, len) => {
        const mid = { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 };
        let ox = mid.x - centroid.x, oy = mid.y - centroid.y; // push outward
        const ol = Math.hypot(ox, oy) || 1;
        ox /= ol; oy /= ol;
        tag(`${letter} = ${trim(len)}`, sx(mid.x) + ox * 16, sy(mid.y) - oy * 16, 'center', '#5B6B7B');
      };
      sideLabel(V.B, V.C, 'a', g.sides.a);
      sideLabel(V.C, V.A, 'b', g.sides.b);
      sideLabel(V.A, V.B, 'c', g.sides.c);
    }

    /* ---- interior angle arcs + measures — also hidden under the altitude
       overlay, keeping the area step focused on base × height ---------------- */
    if (S.showAngles && !S.showAlt && !g.degenerate) {
      const drawAngle = (Vt, P, Q, label, tint) => {
        const cxp = sx(Vt.x), cyp = sy(Vt.y);
        const a1 = Math.atan2(sy(P.y) - cyp, sx(P.x) - cxp);
        const a2 = Math.atan2(sy(Q.y) - cyp, sx(Q.x) - cxp);
        let d = a2 - a1;
        while (d <= -Math.PI) d += 2 * Math.PI;
        while (d > Math.PI) d -= 2 * Math.PI; // short way = interior angle
        const R = 26;
        // filled wedge
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cxp, cyp);
        const N = 26;
        for (let i = 0; i <= N; i++) {
          const ang = a1 + d * (i / N);
          ctx.lineTo(cxp + R * Math.cos(ang), cyp + R * Math.sin(ang));
        }
        ctx.closePath();
        ctx.fillStyle = tint;
        ctx.fill();
        ctx.strokeStyle = '#C81E4F';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        // measure label at the bisector (sum-preserving, matches the header)
        const bis = a1 + d / 2;
        tag(`${label}°`, cxp + Math.cos(bis) * (R + 15), cyp + Math.sin(bis) * (R + 15), 'center', '#1C2B3A');
      };
      drawAngle(V.A, V.B, V.C, aParts[0], 'rgba(200,30,79,0.26)');
      drawAngle(V.B, V.C, V.A, aParts[1], 'rgba(200,30,79,0.20)');
      drawAngle(V.C, V.A, V.B, aParts[2], 'rgba(200,30,79,0.16)');
    }

    /* ---- the vertices, with letter labels ---------------------------------- */
    const drawVertex = (P, letter, key) => {
      const X = sx(P.x), Y = sy(P.y);
      const isSel = S.selected === key && !S.calib;
      if (isSel) {
        ctx.beginPath();
        ctx.arc(X, Y, 9, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,30,79,0.18)';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(X, Y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#C81E4F';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FBFBF8';
      ctx.stroke();
      // letter label, pushed away from the centroid so it clears the sides
      let ox = P.x - centroid.x, oy = P.y - centroid.y;
      const ol = Math.hypot(ox, oy) || 1;
      ox /= ol; oy /= ol;
      ctx.save();
      ctx.font = 'italic 15px "Iowan Old Style", Palatino, Georgia, serif';
      ctx.fillStyle = '#1C2B3A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, X + ox * 20, Y - oy * 20);
      ctx.restore();
    };
    drawVertex(V.A, 'A', 'A');
    drawVertex(V.B, 'B', 'B');
    drawVertex(V.C, 'C', 'C');

    /* ---- degenerate note --------------------------------------------------- */
    if (g.degenerate) {
      tag('the three points are in a line — spread them out to form a triangle', W / 2, 20, 'center', '#C81E4F');
    }

    /* ---- the angle-sum "straighten the corners" inset (opt-in on any step) - */
    if (S.straighten && !g.degenerate) {
      const R = Math.min(W, H) * 0.16;
      const bx = W / 2;
      const by = H - R - 30;
      // translucent backing card
      ctx.save();
      ctx.fillStyle = 'rgba(251,251,248,0.86)';
      const cardW = R * 2.3, cardH = R + 40;
      roundRect(ctx, bx - cardW / 2, by - R - 8, cardW, cardH, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(28,43,58,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // faint 180° semicircle frame
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const ang = -Math.PI * (i / 40); // 0 (right) sweeping up to −π (left)
        const X = bx + R * Math.cos(ang);
        const Y = by + R * Math.sin(ang);
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      }
      ctx.stroke();
      ctx.restore();

      // the three angle wedges, laid consecutively along the straight baseline.
      // Labels reuse the shared sum-preserving parts (always total 180.0°).
      const total = Math.PI * assembleRef.current; // animated sweep 0..π
      const wedges = [
        { m: g.angles.A, label: aParts[0], tint: 'rgba(200,30,79,0.30)' },
        { m: g.angles.B, label: aParts[1], tint: 'rgba(200,30,79,0.22)' },
        { m: g.angles.C, label: aParts[2], tint: 'rgba(200,30,79,0.15)' },
      ];
      let startAng = 0; // pointing right along +x (screen)
      let drawnFully = true;
      for (const w of wedges) {
        const wid = w.m / RAD2DEG; // radians
        // magnitude already swept before this wedge is (−startAng); how much of
        // this wedge fits inside the animated total sweep:
        const drawWid = Math.max(0, Math.min(wid, total + startAng));
        if (drawWid <= 1e-4) { drawnFully = false; break; }
        // wedge sweeps from startAng downward (screen up) by drawWid
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(bx, by);
        const N = 30;
        for (let i = 0; i <= N; i++) {
          const ang = startAng - drawWid * (i / N);
          ctx.lineTo(bx + R * Math.cos(ang), by + R * Math.sin(ang));
        }
        ctx.closePath();
        ctx.fillStyle = w.tint;
        ctx.fill();
        ctx.strokeStyle = 'rgba(200,30,79,0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
        // label the wedge when it's fully drawn
        if (drawWid >= wid - 1e-4) {
          const mid = startAng - wid / 2;
          ctx.save();
          ctx.font = '10.5px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.fillStyle = '#1C2B3A';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${w.label}°`, bx + Math.cos(mid) * R * 0.64, by + Math.sin(mid) * R * 0.64);
          ctx.restore();
        }
        startAng -= wid;
        if (drawWid < wid - 1e-4) { drawnFully = false; break; }
      }

      // straight baseline through the center
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.6)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bx - R * 1.06, by);
      ctx.lineTo(bx + R * 1.06, by);
      ctx.stroke();
      // little vertex dot at the shared corner
      ctx.beginPath();
      ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1C2B3A';
      ctx.fill();
      ctx.restore();

      // caption
      ctx.save();
      ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.fillStyle = drawnFully ? '#C81E4F' : '#5B6B7B';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const cap = drawnFully
        ? `${aParts[0]}° + ${aParts[1]}° + ${aParts[2]}° = 180.0°`
        : 'assembling the three corners…';
      ctx.fillText(cap, bx, by + 8);
      ctx.restore();
    }
  }, []);

  /* rounded-rect helper (used by the straighten inset backing) */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [tri, step, target, selected, straighten, showAlt, base, draw]);

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

  /* each step keeps one focus: entering a step resets the overlays so exactly
     the right one is showing — the "straighten" demo on the angle-sum step, the
     altitude on the area step, nothing extra anywhere else. (The toolbar toggles
     still let a student turn either on manually within a step.) */
  useEffect(() => {
    const title = STEPS[step] && STEPS[step].title;
    setStraighten(title === 'The angle-sum theorem');
    setShowAlt(title === 'Area = ½ · base · height');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the "assemble" animation for the straighten inset — time-based, opt-in via
     the toggle/step, and instant when reduced motion is requested */
  useEffect(() => {
    if (!straighten) {
      assembleRef.current = 1;
      draw();
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      assembleRef.current = 1;
      draw();
      return;
    }
    let raf;
    let start = null;
    const DURATION = 1600;
    assembleRef.current = 0;
    const loop = (now) => {
      if (start == null) start = now;
      const p = Math.min(1, (now - start) / DURATION);
      assembleRef.current = p;
      draw();
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [straighten, draw]);

  /* ---- interaction: dragging vertices ------------------------------------ */
  const worldFromEvent = (e) => {
    const rect = stageRef.current.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    return {
      x: WORLD.xmin + (cssX / rect.width) * (WORLD.xmax - WORLD.xmin),
      y: WORLD.ymax - (cssY / rect.height) * (WORLD.ymax - WORLD.ymin),
    };
  };
  const snap = (p) => ({
    x: Math.max(-BOUND, Math.min(BOUND, Math.round(p.x / GRID) * GRID)),
    y: Math.max(-BOUND, Math.min(BOUND, Math.round(p.y / GRID) * GRID)),
  });

  const onPointerDown = (e) => {
    const w = worldFromEvent(e);
    // pick the nearest vertex within a grab radius
    let best = null;
    let bestD = Infinity;
    for (const key of ['A', 'B', 'C']) {
      const d = dist(w, tri[key]);
      if (d < bestD) { bestD = d; best = key; }
    }
    if (bestD <= 1.1) {
      dragRef.current = best;
      setSelected(best);
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setTri((prev) => ({ ...prev, [best]: snap(w) }));
    }
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const w = worldFromEvent(e);
    const key = dragRef.current;
    setTri((prev) => ({ ...prev, [key]: snap(w) }));
  };
  const onPointerUp = (e) => {
    dragRef.current = null;
    e.currentTarget?.releasePointerCapture?.(e.pointerId);
  };

  /* keyboard: select a vertex with 1/2/3 (or A/B/C), nudge it with arrows */
  const onKeyDown = (e) => {
    const k = e.key.toLowerCase();
    if (k === '1' || k === 'a') { setSelected('A'); e.preventDefault(); return; }
    if (k === '2' || k === 'b') { setSelected('B'); e.preventDefault(); return; }
    if (k === '3' || k === 'c') { setSelected('C'); e.preventDefault(); return; }
    let dx = 0, dy = 0;
    if (e.key === 'ArrowLeft') dx = -GRID;
    else if (e.key === 'ArrowRight') dx = GRID;
    else if (e.key === 'ArrowUp') dy = GRID;
    else if (e.key === 'ArrowDown') dy = -GRID;
    else return;
    e.preventDefault();
    setTri((prev) => {
      const p = prev[selected];
      return { ...prev, [selected]: snap({ x: p.x + dx, y: p.y + dy }) };
    });
  };

  /* ---- misc handlers ----------------------------------------------------- */
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const resetTriangle = () => setTri(START);
  const applyPreset = (name) => setTri(PRESETS[name]);

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const badgeText = geo.degenerate
    ? 'degenerate'
    : `${geo.classAngles} · ${geo.classSides}`;

  return (
    <div className="tlab">
      <header className="head">
        <h1>The Triangle</h1>
        <p className="lede">
          Drag the three corners and watch a triangle’s sides, angles, and area respond — then
          discover the one rule that never breaks:{' '}
          <span className="mono">∠A&nbsp;+&nbsp;∠B&nbsp;+&nbsp;∠C&nbsp;=&nbsp;180°</span>. Each step
          reveals one new idea, and it ends with a calibration challenge onto a mystery triangle.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation" aria-hidden="true">
              <span className="eq">
                ∠A + ∠B + ∠C ={' '}
                {geo.degenerate ? (
                  <span>—</span>
                ) : (
                  <>
                    {pa[0]}° + {pa[1]}° + {pa[2]}°{' = '}
                    <b>180.0°</b>
                  </>
                )}
              </span>
            </p>
            <p className="equation-sub mono">
              A&nbsp;{pt(tri.A)}&nbsp;&nbsp; B&nbsp;{pt(tri.B)}&nbsp;&nbsp; C&nbsp;{pt(tri.C)}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            tabIndex={0}
            role="application"
            aria-label={
              `Interactive triangle on a coordinate grid. Vertices A ${pt(tri.A)}, B ${pt(tri.B)}, ` +
              `C ${pt(tri.C)}. ` +
              (geo.degenerate
                ? 'The three points are collinear. '
                : `Angles ${pa[0]}, ${pa[1]} and ${pa[2]} degrees, summing to 180 degrees. `) +
              `Drag a corner, or select A, B or C and use the arrow keys.`
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">drag a corner — or select A/B/C and use the arrow keys</span>
          </div>

          {/* vertex selector — keyboard-accessible way to choose which corner to nudge */}
          <div className="vsel" role="group" aria-label="Select a vertex to move with the arrow keys">
            <span className="vsel-lbl">Move:</span>
            {['A', 'B', 'C'].map((key) => (
              <button
                key={key}
                type="button"
                className={'vbtn' + (selected === key ? ' on' : '')}
                aria-pressed={selected === key}
                onClick={() => setSelected(key)}
              >
                {key} <span className="vco mono">{pt(tri[key])}</span>
              </button>
            ))}
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Sides</span>
              <span className="fact-v mono">
                a={trim(geo.sides.a)} · b={trim(geo.sides.b)} · c={trim(geo.sides.c)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Angles</span>
              <span className="fact-v mono">
                {geo.degenerate ? '—' : `${pa[0]}° · ${pa[1]}° · ${pa[2]}°`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Angle sum</span>
              <span className="fact-v mono accent">{geo.degenerate ? '—' : '180.0°'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Type</span>
              <span className="fact-v mono">{badgeText}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Perimeter</span>
              <span className="fact-v mono">{`a+b+c ≈ ${geo.perimeter.toFixed(2)}`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Area</span>
              <span className="fact-v mono">{geo.degenerate ? '0' : `≈ ${geo.area.toFixed(2)}`}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (straighten ? ' on' : '')}
              onClick={() => setStraighten((s) => !s)}
            >
              {straighten ? 'Corners shown' : 'Straighten the corners'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showAlt || areaStep ? ' on' : '')}
              onClick={() => setShowAlt((s) => !s)}
            >
              {showAlt || areaStep ? 'Height shown' : 'Show height'}
            </button>
            <button type="button" className="btn ghost" onClick={resetTriangle}>
              Reset triangle
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

          {/* base picker — only meaningful on the area step */}
          {areaStep && (
            <div className="subctl">
              <span className="subctl-lbl">Base:</span>
              {[
                ['c', 'AB'],
                ['a', 'BC'],
                ['b', 'CA'],
              ].map(([key, name]) => (
                <button
                  key={key}
                  type="button"
                  className={'chip' + (base === key ? ' on' : '')}
                  aria-pressed={base === key}
                  onClick={() => setBase(key)}
                >
                  {name}
                </button>
              ))}
              <span className="subctl-note mono">
                A = ½ · {trim(base === 'c' ? geo.sides.c : base === 'a' ? geo.sides.a : geo.sides.b)} · h ≈{' '}
                {geo.area.toFixed(2)}
              </span>
            </div>
          )}

          {/* classification examples — only on the classify step */}
          {step === 4 && (
            <div className="subctl">
              <span className="subctl-lbl">Examples:</span>
              {Object.keys(PRESETS).map((name) => (
                <button
                  key={name}
                  type="button"
                  className="chip"
                  onClick={() => applyPreset(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

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
                  <span className="mono target-hint">drag your corners onto the ghost</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={() => setTarget(makeTarget(target))}>
                New target
              </button>
              <p className="sr-live" aria-live="polite">
                {calibrated ? 'Calibrated. The triangles match.' : ''}
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
                  setStraighten(false);
                  setShowAlt(false);
                  setBase('c');
                  resetTriangle();
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">∠A + ∠B + ∠C = 180°</span> &nbsp;·&nbsp; the triangle angle-sum
        theorem, holding live as you drag the corners on a 20×20 quadrille window.
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
          color: var(--curve);
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12px;
          margin: 0;
        }
        .eq {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 15px;
          font-weight: 600;
          flex-wrap: wrap;
        }
        .eq b {
          color: var(--curve);
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
          cursor: crosshair;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage:focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
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
        .vsel {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin: 12px 4px 2px;
        }
        .vsel-lbl {
          font-size: 12px;
          color: var(--ink-soft);
        }
        .vbtn {
          font: 600 13px/1 system-ui, sans-serif;
          padding: 7px 10px;
          border-radius: 8px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .vbtn.on {
          border-color: var(--curve);
          background: rgba(200, 30, 79, 0.08);
        }
        .vco {
          font-size: 11px;
          color: var(--ink-soft);
          font-weight: 400;
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
          font-size: 13px;
          font-variant-numeric: tabular-nums;
        }
        .fact-v.accent {
          color: var(--curve);
          font-weight: 600;
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
        .subctl {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
          margin: 0 0 14px;
          padding: 10px 12px;
          background: rgba(199, 216, 228, 0.16);
          border-radius: 8px;
        }
        .subctl-lbl {
          font-size: 12px;
          color: var(--ink-soft);
          font-weight: 600;
        }
        .chip {
          font: 600 12.5px/1 system-ui, sans-serif;
          padding: 6px 10px;
          border-radius: 7px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
        }
        .chip.on {
          border-color: var(--curve);
          background: rgba(200, 30, 79, 0.08);
          color: var(--curve);
        }
        .subctl-note {
          font-size: 12px;
          color: var(--ink-soft);
          margin-left: auto;
        }
        .dials {
          display: grid;
          gap: 12px;
          margin-bottom: 6px;
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
        .sr-live {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
          white-space: nowrap;
          margin: 0;
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
