'use client';

/* ============================================================================
   RectangleLab — an interactive "bench" for the RECTANGLE: what makes a shape a
   rectangle (four right angles), and the two measures students constantly mix
   up — PERIMETER (the fence around the outside) and AREA (the tiles inside):

        Perimeter = 2 · (length + width)        ← the boundary, you ADD
        Area      = length × width              ← the interior, you MULTIPLY

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas, a
   staged lesson that reveals one idea at a time, predict-then-check questions
   (Next is gated on ANSWERED, not CORRECT), and a calibration challenge with a
   live match meter and a CALIBRATED stamp.

   WHY THIS LAB LOOKS THE WAY IT DOES, and how it earns its own place in the
   library next to AreaLab and QuadrilateralLab:
     • AreaLab already teaches "area is a count of unit squares" and grows the
       rectangle into the parallelogram and triangle. QuadrilateralLab already
       teaches the whole four-sided family and the 360° angle sum. So this lab
       is NOT another area lesson. Its subject is the single most-confused pair
       of ideas in elementary geometry: PERIMETER vs AREA — a border you walk
       versus a space you fill.
     • The defining beauty — the analogue of the ellipse "string" or the
       triangle's "torn corners" — is that PERIMETER AND AREA ARE DIFFERENT
       MEASURES OF THE SAME SHAPE, and holding one fixed does not fix the other.
       The capstone idea a student carries away: with the SAME fence you can
       enclose wildly different amounts of room, and a SQUARE holds the most.
       "Reshape (keep the fence)" sweeps every rectangle of one fixed perimeter
       and the area visibly rises to a peak at the square, then falls.
     • Because the whole point is the contrast between boundary and interior,
       this lab deliberately uses TWO colors with fixed mathematical meaning —
       BLUE for the perimeter/boundary (the fence you trace) and CARMINE for the
       area/interior (the region you fill). This is the one place the library's
       "single accent" rule is relaxed on purpose: the second color is not
       decoration, it IS the lesson.
     • A rectangle is pinned down by exactly two numbers, so there are exactly
       two dials — Length and Width — unlocking one per step, the same "one new
       control per idea" rhythm as the sine/parabola/area benches. Corner drag
       lets you size it by hand for touch and tactility.

   Everything else — the state→model→render spine, DPI-aware canvas, per-step
   overlays, and the calibration meter — is the same machine as the rest of the
   lab library.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/RectangleLab.jsx
     2. Import and render it:
          import RectangleLab from './RectangleLab';
          export default function Page() { return <RectangleLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (l, w, step, overlays).
     MODEL  — pure geometry (area, perimeter, diagonal, corners) that knows no
              pixels; every readout reads from it, so a label can never drift.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   World window & axes. A SQUARE window so x and y share one scale — essential
   for a rectangle, where a stretched axis would make a square look oblong. The
   rectangle is anchored at a fixed bottom-left corner and grows right and up,
   so its edges always land on integer grid lines and its unit squares coincide
   exactly with the quadrille paper.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
const ANCHOR = { x: -3, y: -2 }; // fixed bottom-left corner of the rectangle
const GRID = 1; // length/width snap to whole units → perimeter & area stay exact integers

/* Dial ranges. Chosen so the largest rectangle (8×8) sits well inside the ±10
   window (right edge −3+8 = 5, top edge −2+8 = 6), and so the same-perimeter
   "biggest square" ghost (side up to (8+8)/2 = 8) also fits. */
const RANGES = {
  l: { min: 1, max: 8, step: 1 },
  w: { min: 1, max: 8, step: 1 },
};

/* Starting rectangle: a plain 6×4, centered on the origin (center = ANCHOR +
   (3, 2) = (0, 0)). Deliberately NOT a square, so the first thing a student
   sees isn't the special case where length and width coincide. Its perimeter
   is 2·(6+4) = 20 and its area is 6×4 = 24 — two different numbers, on purpose,
   so the contrast is visible from the very first frame. */
const START = { l: 6, w: 4 };

/* The two dials, unlocking one per lesson step. */
const DIALS = [
  { key: 'l', label: 'Length', unlock: 0 },
  { key: 'w', label: 'Width', unlock: 1 },
];

/* ---------------------------------------------------------------------------
   The lesson. One idea per step; the reveal lives in `feedback` (shown after
   answering); distractors are REAL student misconceptions — using area where
   perimeter is asked (and vice versa), forgetting to double the sides, and the
   big one: believing "same perimeter ⇒ same area." Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A rectangle: four square corners',
    body:
      'A rectangle is a four-sided shape whose corners are all square — every corner is a right ' +
      'angle, exactly 90°. The little square marks show them. Because the corners are square, the ' +
      'opposite sides come out equal and parallel: top matches bottom, left matches right. Slide ' +
      'Length to stretch it — the corners stay square no matter what.',
    q: 'What makes a four-sided shape a rectangle?',
    choices: [
      'All four corners are right angles (90°)',
      'All four sides are the same length',
      'It is taller than it is wide',
    ],
    answer: 0,
    feedback:
      'Right angles at all four corners — that is the definition. It forces opposite sides to be ' +
      'equal, but the four sides need NOT all match: a shape with four equal sides is a rhombus, and ' +
      'only a rhombus with square corners is the special rectangle we call a square. And a rectangle ' +
      'can sit any way up — being "tall" has nothing to do with it.',
  },
  {
    title: 'Length and width',
    body:
      'Two numbers describe any rectangle: its length (how far across) and its width (how far up). ' +
      'Width is unlocked now. Because opposite sides are equal, the top and bottom are both the ' +
      'length, and the left and right are both the width — so just those two measurements pin the ' +
      'whole shape down. The tick marks flag which sides are equal.',
    q: 'The top side of a rectangle measures 7 units. Without measuring, how long is the bottom side?',
    choices: [
      '7 units — opposite sides of a rectangle are equal',
      'You cannot tell without measuring it',
      'It depends on how tall the rectangle is',
    ],
    answer: 0,
    feedback:
      '7 units. In a rectangle the two lengthwise sides are always equal and the two widthwise sides ' +
      'are always equal, so top = bottom and left = right. That is exactly why two numbers — length ' +
      'and width — are enough to describe the entire rectangle.',
  },
  {
    title: 'Perimeter: the distance around',
    body:
      'The perimeter is how far it is to walk all the way around the outside — the length of the ' +
      '“fence.” Add the four sides: length + width + length + width. Since each appears twice, ' +
      'Perimeter = 2 × (length + width). Press “Walk the fence” to trace the blue boundary and watch ' +
      'the units add up.',
    q: 'A rectangle is 6 long and 4 wide. What is its perimeter — the distance all the way around?',
    choices: [
      '20 units — 6 + 4 + 6 + 4',
      '24 units — 6 × 4',
      '10 units — 6 + 4',
    ],
    answer: 0,
    feedback:
      '20 units: 6 + 4 + 6 + 4 = 2 × (6 + 4) = 20. That is the fence around the edge. Multiplying ' +
      '6 × 4 = 24 counts the SQUARES inside — that is area, a different measure. And 6 + 4 = 10 only ' +
      'walks two of the four sides; a rectangle has two lengths and two widths, so you double.',
  },
  {
    title: 'Area: the space inside',
    body:
      'The area is how much flat space the rectangle covers inside — the number of 1×1 tiles that ' +
      'fill it. The tiles line up in a grid: length tiles across, width rows down, so ' +
      'Area = length × width. This is completely different from perimeter: perimeter measures the ' +
      'border (you ADD the sides), area measures the inside (you MULTIPLY the two dimensions).',
    q: 'A rectangle is 5 long and 3 wide. Which pair correctly gives its area AND its perimeter?',
    choices: [
      'Area = 15 (5×3), Perimeter = 16 (2×(5+3))',
      'Area = 16, Perimeter = 15',
      'Area = 15 and Perimeter = 15 — they are the same',
    ],
    answer: 0,
    feedback:
      'Area = 5 × 3 = 15 square units (the tiles inside); Perimeter = 2 × (5 + 3) = 16 units (the ' +
      'fence around). They use the same two numbers but combine them differently — area MULTIPLIES, ' +
      'perimeter ADDS — so they are almost never equal. Swapping them is the single most common ' +
      'area/perimeter mistake.',
  },
  {
    title: 'Same fence, different room',
    body:
      'Here is the surprise. Keep the SAME perimeter — the same length of fence — but change the ' +
      'shape. Press “Reshape (keep the fence)” and watch: a long, thin rectangle wastes its fence ' +
      'and holds little area; as it fattens toward a square the area grows; the square holds the ' +
      'most. Same fence, very different room.',
    q: 'Two rectangles each use 20 units of fence (perimeter 20). One is 8×2, the other is 5×5. Which encloses more area?',
    choices: [
      'The 5×5 square — 25 square units (the 8×2 holds only 16)',
      'The 8×2 — a longer rectangle holds more',
      'They are equal — same perimeter means same area',
    ],
    answer: 0,
    feedback:
      'The square wins: 5 × 5 = 25, while 8 × 2 = 16 — both with a perimeter of 20. Same fence does ' +
      'NOT mean same area. Stretching a rectangle long and thin keeps the perimeter but loses area; ' +
      'the closer it is to a square, the more it holds, and the square holds the most of all.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery rectangle is drawn as a dashed grey outline, with its perimeter ' +
      'and area listed beside it. Set Length and Width to cover it exactly — matching both — until ' +
      'the meter reads CALIBRATED. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   MODEL — pure geometry. No pixels. Single source of truth for every number the
   UI and canvas display.

   The rectangle's four corners, counter-clockwise from the fixed bottom-left
   anchor. Because it is axis-aligned, the two lengthwise sides are horizontal
   (length l) and the two widthwise sides are vertical (width w).
   ------------------------------------------------------------------------- */
function corners(l, w) {
  const { x: ax, y: ay } = ANCHOR;
  return {
    P0: { x: ax, y: ay }, // bottom-left (anchor)
    P1: { x: ax + l, y: ay }, // bottom-right
    P2: { x: ax + l, y: ay + w }, // top-right
    P3: { x: ax, y: ay + w }, // top-left
  };
}

/* Everything the UI needs, computed once from (l, w). Perimeter ADDS the sides;
   area MULTIPLIES the dimensions; the diagonal is √(l² + w²) — the Pythagorean
   theorem again, tying this lab to the Circle and Distance labs. */
function geometry(l, w) {
  return {
    area: l * w, // count of unit squares
    perimeter: 2 * (l + w), // the fence: 2·length + 2·width
    diagonal: Math.hypot(l, w), // √(l² + w²), by the Pythagorean theorem
    isSquare: l === w,
    kind: l === w ? 'square' : 'rectangle',
  };
}

/* ---------------------------------------------------------------------------
   Calibration. A construction goal in the house "match the ghost" ritual: hit a
   target rectangle's length AND width. The match metric is the distance between
   (l, w) and the target (L, W); it is 0 exactly when they coincide, and both
   live on the integer grid, so an exact (CALIBRATED) match is always reachable.
   ------------------------------------------------------------------------- */
function matchDistance(l, w, target) {
  return Math.hypot(l - target.L, w - target.W);
}
const matchPercent = (d) => Math.max(0, Math.min(100, 100 / (1 + d / 1.6)));
const MATCH_TOL = 1e-6; // exact grid match → CALIBRATED

function makeTarget(prev) {
  const rnd = (r) => r.min + Math.round(Math.random() * (r.max - r.min));
  let L, W, guard = 0;
  do {
    L = rnd(RANGES.l);
    W = rnd(RANGES.w);
    guard++;
  } while (
    guard < 200 &&
    (L < 2 || W < 2 || // avoid trivial 1-wide strips
      L * W < 6 || // avoid tiny targets
      (L === START.l && W === START.w) || // never hand back the starting shape
      (prev && L === prev.L && W === prev.W)) // and not the same target twice
  );
  return { L, W };
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−), trimmed decimals.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 100) / 100;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
function trim1(v) {
  const n = Math.round(v * 10) / 10;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}

/* Fixed canvas colors, each with a MATHEMATICAL role (see the header note):
   CARMINE = the area / interior (the region you fill);
   FENCE   = the perimeter / boundary (the fence you trace). */
const CARMINE = '#C81E4F';
const FENCE = '#2D5F8C';
const INK = '#1C2B3A';
const INK_SOFT = '#5B6B7B';

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function RectangleLab() {
  const [l, setL] = useState(START.l);
  const [w, setW] = useState(START.w);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);

  const [showTiles, setShowTiles] = useState(false); // the unit-square tiling (area)
  const [showFence, setShowFence] = useState(false); // the highlighted boundary (perimeter)
  const [showDiagonals, setShowDiagonals] = useState(false); // equal, bisecting diagonals
  const [walking, setWalking] = useState(false); // animate a dot around the fence
  const [reshaping, setReshaping] = useState(false); // sweep same-perimeter rectangles

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(false);
  const walkRef = useRef(-1); // 0..1 position around the fence; −1 = no dot
  const reshapeRef = useRef(0.5); // 0..1 sweep parameter (0.5 = the square)
  const reshapeSumRef = useRef(START.l + START.w); // fixed half-perimeter during a sweep
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const geo = geometry(l, w);

  // One dial unlocks per step; on the calibration step both are free.
  const unlocked = { l: step >= 0, w: step >= 1 };

  const rms = target ? matchDistance(l, w, target) : Infinity;
  const pct = target ? matchPercent(rms) : 0;
  const calibrated = target ? rms < MATCH_TOL : false;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer handlers never read stale values.
  sceneRef.current = {
    l, w, step, calib, target,
    showTiles: showTiles && !reshaping,
    showFence,
    showDiagonals: showDiagonals && !reshaping,
    walking,
    reshaping,
    showSideTicks: step <= 1 && !reshaping,
    sameFence: current.title === 'Same fence, different room',
    showHandle: !calib && !reshaping,
  };

  /* ---- world → screen transform + full redraw from state ------------------ */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const Wpx = stage.clientWidth;
    const Hpx = stage.clientHeight;
    if (Wpx === 0 || Hpx === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // capped for perf & crisp lines
    canvas.width = Math.round(Wpx * dpr);
    canvas.height = Math.round(Hpx * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    const sx = (x) => ((x - WORLD.xmin) / (WORLD.xmax - WORLD.xmin)) * Wpx;
    const sy = (y) => ((WORLD.ymax - y) / (WORLD.ymax - WORLD.ymin)) * Hpx;

    const S = sceneRef.current;

    // During the "keep the fence" demo the shape morphs through same-perimeter
    // rectangles: length sweeps while (length + width) stays fixed, so the
    // displayed dims are fractional. Everywhere else they are the integer dials.
    let cl = S.l, cw = S.w;
    if (S.reshaping) {
      const sum = reshapeSumRef.current;
      const t = reshapeRef.current;
      cl = 1 + t * (sum - 2); // t: 0→1 sweeps length from 1 to sum−1
      cw = sum - cl; // width follows so the perimeter never changes
    }
    const C = corners(cl, cw);

    ctx.clearRect(0, 0, Wpx, Hpx);

    /* ---- minor grid (quadrille paper) -------------------------------------- */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.9)';
    ctx.beginPath();
    for (let gx = Math.ceil(WORLD.xmin); gx <= WORLD.xmax; gx++) {
      const X = Math.round(sx(gx)) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, Hpx);
    }
    for (let gy = Math.ceil(WORLD.ymin); gy <= WORLD.ymax; gy++) {
      const Y = Math.round(sy(gy)) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(Wpx, Y);
    }
    ctx.stroke();

    /* ---- axes -------------------------------------------------------------- */
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, Math.round(sy(0)) + 0.5);
    ctx.lineTo(Wpx, Math.round(sy(0)) + 0.5);
    ctx.moveTo(Math.round(sx(0)) + 0.5, 0);
    ctx.lineTo(Math.round(sx(0)) + 0.5, Hpx);
    ctx.stroke();

    /* ---- tick labels (every 2 units) --------------------------------------- */
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
    const tag = (text, X, Y, align = 'center', color = INK_SOFT, weight = 400) => {
      ctx.save();
      ctx.font = `${weight} 12px ui-monospace, "SF Mono", Menlo, monospace`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(text).width;
      const bx = align === 'center' ? X - tw / 2 - 3 : align === 'left' ? X - 3 : X - tw - 3;
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(bx, Y - 9, tw + 6, 18);
      ctx.fillStyle = color;
      ctx.fillText(text, X, Y);
      ctx.restore();
    };

    const poly = (pts, close = true) => {
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(sx(p.x), sy(p.y)) : ctx.lineTo(sx(p.x), sy(p.y))));
      if (close) ctx.closePath();
    };

    /* ---- target ghost (calibration only): a dashed grey rectangle ---------- */
    if (S.calib && S.target) {
      const { x: ax, y: ay } = ANCHOR;
      const g = [
        { x: ax, y: ay },
        { x: ax + S.target.L, y: ay },
        { x: ax + S.target.L, y: ay + S.target.W },
        { x: ax, y: ay + S.target.W },
      ];
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(91,107,123,0.85)';
      ctx.setLineDash([7, 6]);
      ctx.lineJoin = 'round';
      poly(g);
      ctx.stroke();
      ctx.restore();
      const tP = 2 * (S.target.L + S.target.W);
      const tA = S.target.L * S.target.W;
      tag(`target: ${S.target.L} × ${S.target.W}`, sx(ax + S.target.L / 2), sy(ay + S.target.W) - 32, 'center', INK_SOFT, 600);
      tag(`perimeter ${tP} · area ${tA}`, sx(ax + S.target.L / 2), sy(ay + S.target.W) - 16, 'center', INK_SOFT);
    }

    /* ---- same-perimeter "biggest room" square ghost (same-fence step) ------ */
    if (S.sameFence) {
      const sum = S.reshaping ? reshapeSumRef.current : S.l + S.w;
      const side = sum / 2; // the square that shares this perimeter holds the max area
      const { x: ax, y: ay } = ANCHOR;
      const sq = [
        { x: ax, y: ay },
        { x: ax + side, y: ay },
        { x: ax + side, y: ay + side },
        { x: ax, y: ay + side },
      ];
      ctx.save();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(45,95,140,0.6)';
      ctx.setLineDash([5, 5]);
      ctx.lineJoin = 'round';
      poly(sq);
      ctx.stroke();
      ctx.restore();
      tag(`square holds the most: ${trim1(side)} × ${trim1(side)} = ${trim1(side * side)}`,
        sx(ax + side / 2), sy(ay + side) + 14, 'center', FENCE, 600);
    }

    /* =====================================================================
       THE RECTANGLE. Interior wash + optional tiles (AREA, carmine), then the
       boundary (PERIMETER, blue when highlighted, else carmine outline).
       ===================================================================== */
    const shape = [C.P0, C.P1, C.P2, C.P3];

    // faint interior wash = the region (area)
    ctx.save();
    poly(shape);
    ctx.fillStyle = 'rgba(200,30,79,0.06)';
    ctx.fill();
    ctx.restore();

    // unit-square tiling (integer dims only): a subtle checkerboard makes the
    // 1×1 tiles countable at a glance, with carmine separators on every edge.
    if (S.showTiles && !S.reshaping) {
      ctx.save();
      poly(shape);
      ctx.clip();
      for (let i = 0; i < cl; i++) {
        for (let j = 0; j < cw; j++) {
          if ((i + j) % 2 === 0) continue;
          const x0 = ANCHOR.x + i, y0 = ANCHOR.y + j;
          ctx.fillStyle = 'rgba(200,30,79,0.08)';
          ctx.fillRect(sx(x0), sy(y0 + 1), sx(x0 + 1) - sx(x0), sy(y0) - sy(y0 + 1));
        }
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(200,30,79,0.28)';
      ctx.beginPath();
      for (let gx = ANCHOR.x; gx <= ANCHOR.x + cl + 0.001; gx += 1) {
        ctx.moveTo(Math.round(sx(gx)) + 0.5, sy(ANCHOR.y));
        ctx.lineTo(Math.round(sx(gx)) + 0.5, sy(ANCHOR.y + cw));
      }
      for (let gy = ANCHOR.y; gy <= ANCHOR.y + cw + 0.001; gy += 1) {
        ctx.moveTo(sx(ANCHOR.x), Math.round(sy(gy)) + 0.5);
        ctx.lineTo(sx(ANCHOR.x + cl), Math.round(sy(gy)) + 0.5);
      }
      ctx.stroke();
      ctx.restore();
    }

    // area caption, tucked just inside the top edge (only when tiles show). Kept
    // off the vertical center so it never collides with the left "width =" label
    // on narrow rectangles.
    if (S.showTiles && !S.reshaping) {
      const cx = (C.P0.x + C.P1.x) / 2;
      tag(`area = ${trim(cl)} × ${trim(cw)} = ${trim(cl * cw)}`,
        sx(cx), sy(ANCHOR.y + cw) + 13, 'center', CARMINE, 600);
    }

    /* ---- diagonals: equal length, and they bisect each other --------------- */
    if (S.showDiagonals) {
      ctx.save();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(28,43,58,0.65)';
      ctx.beginPath();
      ctx.moveTo(sx(C.P0.x), sy(C.P0.y));
      ctx.lineTo(sx(C.P2.x), sy(C.P2.y));
      ctx.moveTo(sx(C.P1.x), sy(C.P1.y));
      ctx.lineTo(sx(C.P3.x), sy(C.P3.y));
      ctx.stroke();
      ctx.restore();
      // equal-length single tick at each diagonal's midpoint
      const midTick = (A, B) => {
        const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
        let dx = sx(B.x) - sx(A.x), dy = sy(B.y) - sy(A.y);
        const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
        const nx = -dy, ny = dx; // screen perpendicular
        ctx.save();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx(mid.x) - nx * 6, sy(mid.y) - ny * 6);
        ctx.lineTo(sx(mid.x) + nx * 6, sy(mid.y) + ny * 6);
        ctx.stroke();
        ctx.restore();
      };
      midTick(C.P0, C.P2);
      midTick(C.P1, C.P3);
      // crossing point (the center) — they bisect each other
      const ctr = { x: (C.P0.x + C.P2.x) / 2, y: (C.P0.y + C.P2.y) / 2 };
      ctx.save();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(sx(ctr.x), sy(ctr.y), 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      tag(`diagonal = √(${trim(cl)}² + ${trim(cw)}²) = ${geometry(cl, cw).diagonal.toFixed(2)}`,
        sx(ctr.x), sy(ctr.y) - 16, 'center', INK, 600);
    }

    /* ---- the boundary. Blue + thick when the perimeter is the focus; the
       one carmine outline otherwise. ---------------------------------------- */
    const boundaryColor = S.showFence ? FENCE : CARMINE;
    ctx.save();
    ctx.lineWidth = S.showFence ? 4 : 2.75;
    ctx.strokeStyle = boundaryColor;
    ctx.lineJoin = 'round';
    poly(shape);
    ctx.stroke();
    ctx.restore();

    // per-unit tick marks along the boundary (perimeter step) — so a student can
    // literally count the fence units, length on top/bottom, width on the sides.
    if (S.showFence && !S.reshaping) {
      ctx.save();
      ctx.strokeStyle = FENCE;
      ctx.lineWidth = 1.4;
      const t = 5; // tick half-length in px
      for (let i = 0; i <= cl; i++) {
        const X = sx(ANCHOR.x + i);
        ctx.beginPath(); ctx.moveTo(X, sy(ANCHOR.y) - t); ctx.lineTo(X, sy(ANCHOR.y) + t); ctx.stroke(); // bottom
        ctx.beginPath(); ctx.moveTo(X, sy(ANCHOR.y + cw) - t); ctx.lineTo(X, sy(ANCHOR.y + cw) + t); ctx.stroke(); // top
      }
      for (let j = 0; j <= cw; j++) {
        const Y = sy(ANCHOR.y + j);
        ctx.beginPath(); ctx.moveTo(sx(ANCHOR.x) - t, Y); ctx.lineTo(sx(ANCHOR.x) + t, Y); ctx.stroke(); // left
        ctx.beginPath(); ctx.moveTo(sx(ANCHOR.x + cl) - t, Y); ctx.lineTo(sx(ANCHOR.x + cl) + t, Y); ctx.stroke(); // right
      }
      ctx.restore();
    }

    /* ---- right-angle corner marks (the definition: four square corners) ---- */
    {
      const raMark = (Cn, N1, N2, m = 0.5) => {
        const u = (A, B) => {
          let dx = B.x - A.x, dy = B.y - A.y; const L = Math.hypot(dx, dy) || 1;
          return { x: dx / L, y: dy / L };
        };
        const a = u(Cn, N1), b = u(Cn, N2);
        const p1 = { x: Cn.x + a.x * m, y: Cn.y + a.y * m };
        const p2 = { x: p1.x + b.x * m, y: p1.y + b.y * m };
        const p3 = { x: Cn.x + b.x * m, y: Cn.y + b.y * m };
        ctx.beginPath();
        ctx.moveTo(sx(p1.x), sy(p1.y));
        ctx.lineTo(sx(p2.x), sy(p2.y));
        ctx.lineTo(sx(p3.x), sy(p3.y));
        ctx.stroke();
      };
      ctx.save();
      ctx.strokeStyle = S.showSideTicks ? 'rgba(28,43,58,0.75)' : 'rgba(28,43,58,0.4)';
      ctx.lineWidth = 1.5;
      const m = S.showSideTicks ? 0.55 : 0.4;
      raMark(C.P0, C.P1, C.P3, m);
      raMark(C.P1, C.P2, C.P0, m);
      raMark(C.P2, C.P3, C.P1, m);
      raMark(C.P3, C.P0, C.P2, m);
      ctx.restore();
    }

    /* ---- equal-side tick marks (definition / dimension steps) -------------- */
    if (S.showSideTicks) {
      const sideTick = (A, B, n) => {
        const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
        let dx = sx(B.x) - sx(A.x), dy = sy(B.y) - sy(A.y);
        const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
        const nx = -dy, ny = dx;
        ctx.save();
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 2;
        const gap = 4, half = 6;
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * gap;
          const cxp = sx(mid.x) + dx * off, cyp = sy(mid.y) + dy * off;
          ctx.beginPath();
          ctx.moveTo(cxp - nx * half, cyp - ny * half);
          ctx.lineTo(cxp + nx * half, cyp + ny * half);
          ctx.stroke();
        }
        ctx.restore();
      };
      sideTick(C.P0, C.P1, 1); // bottom — length
      sideTick(C.P3, C.P2, 1); // top — length (equal → same single tick)
      sideTick(C.P1, C.P2, 2); // right — width
      sideTick(C.P0, C.P3, 2); // left — width (equal → same double tick)
    }

    /* ---- dimension labels: length below, width to the left ----------------- */
    if (!S.reshaping) {
      tag(`length = ${trim(cl)}`, sx((C.P0.x + C.P1.x) / 2), sy(ANCHOR.y) + 18, 'center', INK, 600);
      tag(`width = ${trim(cw)}`, sx(ANCHOR.x) - 12, sy(ANCHOR.y + cw / 2), 'right', INK, 600);
    }

    /* ---- perimeter running caption + walking dot (perimeter focus) --------- */
    if (S.showFence && !S.reshaping) {
      const P = 2 * (cl + cw);
      // caption above the shape
      tag(`perimeter = 2 × (${trim(cl)} + ${trim(cw)}) = ${trim(P)}`,
        sx((C.P0.x + C.P2.x) / 2), sy(ANCHOR.y + cw) - 16, 'center', FENCE, 600);
      // the walking dot: a point travelling around the boundary by arc length
      if (S.walking && walkRef.current >= 0) {
        const t = walkRef.current; // 0..1 of the whole perimeter
        const segs = [
          { a: C.P0, b: C.P1, len: cl },
          { a: C.P1, b: C.P2, len: cw },
          { a: C.P2, b: C.P3, len: cl },
          { a: C.P3, b: C.P0, len: cw },
        ];
        let dist = t * P; // how far around we've walked
        let pos = C.P0;
        for (const sg of segs) {
          if (dist <= sg.len || sg === segs[segs.length - 1]) {
            const f = sg.len === 0 ? 0 : Math.min(1, dist / sg.len);
            pos = { x: sg.a.x + (sg.b.x - sg.a.x) * f, y: sg.a.y + (sg.b.y - sg.a.y) * f };
            break;
          }
          dist -= sg.len;
        }
        ctx.save();
        ctx.fillStyle = FENCE;
        ctx.beginPath();
        ctx.arc(sx(pos.x), sy(pos.y), 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FBFBF8';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        tag(`walked ${trim1(t * P)} of ${trim(P)}`, sx(pos.x), sy(pos.y) - 14, 'center', FENCE, 600);
      }
    }

    /* ---- same-fence live captions (during the sweep) ----------------------- */
    if (S.reshaping) {
      const P = 2 * (cl + cw);
      const A = cl * cw;
      const atSquare = Math.abs(cl - cw) < 0.06;
      tag(`fence stays ${trim(P)}   ·   room = ${trim1(cl)} × ${trim1(cw)} = ${trim1(A)}`,
        sx((C.P0.x + C.P2.x) / 2), sy(ANCHOR.y + cw) - 16, 'center', atSquare ? CARMINE : INK, 600);
      if (atSquare) {
        tag('◆ square — most room!', sx((C.P0.x + C.P2.x) / 2), sy((C.P0.y + C.P2.y) / 2), 'center', CARMINE, 700);
      }
    }

    /* ---- drag handle (top-right corner sizes length & width) --------------- */
    if (S.showHandle) {
      const P = C.P2;
      const X = sx(P.x), Y = sy(P.y);
      ctx.beginPath();
      ctx.arc(X, Y, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,30,79,0.16)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(X, Y, 5, 0, Math.PI * 2);
      ctx.fillStyle = CARMINE;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FBFBF8';
      ctx.stroke();
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [l, w, step, target, showTiles, showFence, showDiagonals, reshaping, walking, draw]);

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

  /* each step keeps one focus: entering a step sets exactly the right overlay —
     clean corners for the definition, the boundary for perimeter, tiles for
     area, the same-fence ghost for the reshape step, tiles for calibration. */
  useEffect(() => {
    const title = STEPS[step] && STEPS[step].title;
    setWalking(false);
    setReshaping(false);
    if (title === 'A rectangle: four square corners') {
      setShowTiles(false); setShowFence(false);
    } else if (title === 'Length and width') {
      setShowTiles(false); setShowFence(false);
    } else if (title === 'Perimeter: the distance around') {
      setShowTiles(false); setShowFence(true);
    } else if (title === 'Area: the space inside') {
      setShowTiles(true); setShowFence(false);
    } else if (title === 'Same fence, different room') {
      setShowTiles(true); setShowFence(false);
    } else if (title === 'Calibration challenge') {
      setShowTiles(true); setShowFence(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the fence walk — a dot loops around the boundary, time-based and opt-in.
     Under reduced motion we show the highlighted fence with no moving dot. */
  useEffect(() => {
    if (!walking) {
      walkRef.current = -1;
      draw();
      return;
    }
    if (prefersReduced()) {
      walkRef.current = -1;
      draw();
      return;
    }
    let raf;
    let start = null;
    const DURATION = 4600; // ms per full lap
    const loop = (now) => {
      if (start == null) start = now;
      walkRef.current = ((now - start) % DURATION) / DURATION;
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [walking, l, w, draw]);

  /* the same-fence sweep — length ping-pongs while (length + width) stays put,
     so the area rises to a peak at the square and falls back. Time-based and
     opt-in; reduced motion parks it at the square (the maximum). */
  useEffect(() => {
    if (!reshaping) {
      draw();
      return;
    }
    reshapeSumRef.current = l + w; // freeze this perimeter for the whole sweep
    if (l + w < 3) {
      // a 1×1 shape has no other same-perimeter rectangle to show
      setReshaping(false);
      return;
    }
    if (prefersReduced()) {
      reshapeRef.current = 0.5; // the square
      draw();
      return;
    }
    let raf;
    let start = null;
    const DURATION = 4200;
    const loop = (now) => {
      if (start == null) start = now;
      const p = ((now - start) % DURATION) / DURATION;
      reshapeRef.current = p < 0.5 ? p * 2 : 2 - p * 2; // ping-pong 0→1→0
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reshaping, l, w, draw]);

  /* ---- interaction: dragging the top-right corner ------------------------- */
  const worldFromEvent = (e) => {
    const rect = stageRef.current.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    return {
      x: WORLD.xmin + (cssX / rect.width) * (WORLD.xmax - WORLD.xmin),
      y: WORLD.ymax - (cssY / rect.height) * (WORLD.ymax - WORLD.ymin),
    };
  };
  const clampDial = (key, v) =>
    Math.max(RANGES[key].min, Math.min(RANGES[key].max, Math.round(v / GRID) * GRID));

  const onPointerDown = (e) => {
    if (calib || reshaping) return;
    const pw = worldFromEvent(e);
    const C = corners(l, w);
    if (Math.hypot(pw.x - C.P2.x, pw.y - C.P2.y) <= 1.1) {
      dragRef.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      applyDrag(pw);
    }
  };
  const applyDrag = (pw) => {
    setL(clampDial('l', pw.x - ANCHOR.x));
    if (unlocked.w) setW(clampDial('w', pw.y - ANCHOR.y));
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    applyDrag(worldFromEvent(e));
  };
  const onPointerUp = (e) => {
    dragRef.current = false;
    e.currentTarget?.releasePointerCapture?.(e.pointerId);
  };

  /* ---- misc handlers ----------------------------------------------------- */
  const setDial = (key, value) => {
    const v = clampDial(key, value);
    if (key === 'l') setL(v);
    else setW(v);
  };
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((n) => Math.min(STEPS.length - 1, n + 1));
  const goBack = () => setStep((n) => Math.max(0, n - 1));
  const restart = () => {
    setStep(0);
    setAnswers({});
    setTarget(null);
    setL(START.l);
    setW(START.w);
    setShowTiles(false);
    setShowFence(false);
    setShowDiagonals(false);
    setWalking(false);
    setReshaping(false);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);
  const val = { l, w };

  return (
    <div className="rlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Rectangle</h1>
        <p className="lede">
          A rectangle is a shape with four square corners. It carries two measures students love to
          mix up:{' '}
          <span className="mono fence-ink">perimeter</span> — the fence around the outside — and{' '}
          <span className="mono accent-ink">area</span> — the tiles that fill the inside. Build one,
          walk its fence, tile its floor, and discover the surprise: the{' '}
          <em>same fence can hold very different amounts of room</em>. Each step reveals one idea,
          and it ends with a calibration challenge.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation" aria-hidden="true">
              <span className="eq fence-ink">
                P = 2·(l + w) = 2·({trim(l)} + {trim(w)}) = <b>{trim(geo.perimeter)}</b>
              </span>
              <span className="eq accent-ink">
                A = l × w = {trim(l)} × {trim(w)} = <b>{trim(geo.area)}</b>
              </span>
            </p>
            <p className="equation-sub mono">
              {geo.kind} · diagonal √({trim(l)}²+{trim(w)}²) = {geo.diagonal.toFixed(2)}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            role="application"
            aria-label={
              `Interactive ${geo.kind} on a coordinate grid, length ${trim(l)}, width ${trim(w)}. ` +
              `Perimeter ${trim(geo.perimeter)} units, area ${trim(geo.area)} square units. ` +
              `Use the length and width dials below, or drag the top-right corner handle.`
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">drag the corner — or use the dials below</span>
          </div>

          {/* dials — unlock one per step, native range inputs for free a11y */}
          <div className="dials">
            {DIALS.map((d) => {
              const isUnlocked = unlocked[d.key];
              const r = RANGES[d.key];
              return (
                <div className={'dial' + (isUnlocked ? '' : ' locked')} key={d.key}>
                  <div className="dial-head">
                    <label htmlFor={`dial-${d.key}`}>
                      {d.label}
                      {!isUnlocked && (
                        <span className="lock" aria-hidden="true">
                          {' '}🔒 unlocks at step {d.unlock + 1}
                        </span>
                      )}
                    </label>
                    <span className="dial-val mono">{trim(val[d.key])}</span>
                  </div>
                  <input
                    id={`dial-${d.key}`}
                    type="range"
                    min={r.min}
                    max={r.max}
                    step={r.step}
                    value={val[d.key]}
                    disabled={!isUnlocked}
                    onChange={(e) => setDial(d.key, parseFloat(e.target.value))}
                    aria-label={`${d.label}: ${trim(val[d.key])}`}
                  />
                </div>
              );
            })}
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Length</span>
              <span className="fact-v mono">{trim(l)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Width</span>
              <span className="fact-v mono">{trim(w)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Perimeter</span>
              <span className="fact-v mono fence-ink">{trim(geo.perimeter)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Area</span>
              <span className="fact-v mono accent-ink">{trim(geo.area)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Diagonal</span>
              <span className="fact-v mono">≈ {geo.diagonal.toFixed(2)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Shape</span>
              <span className="fact-v mono">{geo.kind}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (showFence ? ' on-fence' : '')}
              onClick={() => setShowFence((v) => !v)}
            >
              {showFence ? 'Fence shown' : 'Show perimeter'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (walking ? ' on-fence' : '')}
              onClick={() => {
                setShowFence(true);
                setWalking((v) => !v);
              }}
            >
              {walking ? 'Walking…' : 'Walk the fence'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showTiles ? ' on' : '')}
              onClick={() => setShowTiles((v) => !v)}
            >
              {showTiles ? 'Tiles shown' : 'Show area'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (reshaping ? ' on' : '')}
              onClick={() => setReshaping((v) => !v)}
              disabled={l + w < 3}
            >
              {reshaping ? 'Reshaping…' : 'Reshape (keep the fence)'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showDiagonals ? ' on' : '')}
              onClick={() => setShowDiagonals((v) => !v)}
            >
              {showDiagonals ? 'Diagonals shown' : 'Show diagonals'}
            </button>
            <button type="button" className="btn ghost" onClick={restart}>
              Reset
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
                  <span className="mono target-hint">
                    cover the ghost — need {target.L} × {target.W}
                  </span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={() => setTarget(makeTarget(target))}>
                New target
              </button>
              <p className="sr-live" aria-live="polite">
                {calibrated ? 'Calibrated. Your rectangle matches the target exactly.' : ''}
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
              <button type="button" className="btn" onClick={restart}>
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono fence-ink">Perimeter = 2·(l + w)</span> &nbsp;·&nbsp;{' '}
        <span className="mono accent-ink">Area = l × w</span> &nbsp;·&nbsp; two measures of one
        shape — the border you add up, and the space you fill in.
      </footer>

      <style jsx>{`
        .rlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f; /* area / interior / primary accent */
          --fence: #2d5f8c; /* perimeter / boundary */
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
        .accent-ink {
          color: var(--curve);
        }
        .fence-ink {
          color: var(--fence);
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
          color: var(--ink);
          font-style: italic;
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
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12px;
          margin: 0;
          text-transform: capitalize;
          align-self: flex-end;
        }
        .eq {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 14px;
          font-weight: 600;
          flex-wrap: wrap;
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
        .dials {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 16px;
          margin: 14px 4px 2px;
        }
        @media (max-width: 460px) {
          .dials {
            grid-template-columns: 1fr;
          }
        }
        .dial.locked {
          opacity: 0.55;
        }
        .dial-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 3px;
        }
        .dial-head label {
          font-size: 12px;
          font-weight: 600;
          color: var(--ink);
        }
        .lock {
          font-weight: 400;
          font-size: 10.5px;
          color: var(--ink-soft);
          letter-spacing: 0.02em;
        }
        .dial-val {
          font-size: 13px;
          font-variant-numeric: tabular-nums;
          color: var(--curve);
          font-weight: 600;
        }
        .dial input[type='range'] {
          width: 100%;
          accent-color: var(--curve);
          cursor: pointer;
        }
        .dial.locked input[type='range'] {
          cursor: not-allowed;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px 18px;
          margin: 16px 4px 4px;
        }
        @media (max-width: 460px) {
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
          font-size: 13px;
          font-variant-numeric: tabular-nums;
        }
        .fact-v.accent-ink {
          font-weight: 600;
        }
        .fact-v.fence-ink {
          font-weight: 600;
        }
        .toolbar {
          margin: 14px 4px 2px;
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
        .btn.ghost.on-fence {
          background: var(--fence);
          border-color: var(--fence);
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
        :global(.rlab) :focus-visible {
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
