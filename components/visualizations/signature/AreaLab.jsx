'use client';

/* ============================================================================
   AreaLab — an interactive "bench" for AREA: what it means, why the rectangle
   formula works, and how every other area formula grows out of it,

        Area  =  width × height   →   base × height   →   ½ · base · height

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, a staged lesson that reveals
   one idea at a time, predict-then-check questions, and a calibration challenge
   with a live match meter.

   Why an "Area" bench looks the way it does, and how it stays faithful to the
   y = f(x) / dial template:
     • AREA is not a curve — it is a MEASURE of a region. So the object is a
       shape you size on a unit grid, and the controls are DIALS (width, height,
       slant) that unlock one per step, exactly like the sine/parabola template.
       (Corner + slant handles let you drag it too, for touch and tactility.)
     • "One dial unlocks per step" carries the whole lesson: width alone → then
       height → then the formula → then slant turns the rectangle into a
       parallelogram → then a diagonal turns it into a triangle.
     • The bench's defining beauty — the analogue of the ellipse "string" or the
       triangle's "torn corners" — is that AREA IS A COUNT OF UNIT SQUARES. The
       interior literally tiles with 1×1 squares, so width × height is just
       "columns × rows." And the parallelogram's area is proven by a CUT-AND-
       SLIDE: the triangle that overhangs one end is slid across to fill the
       notch at the other, turning the slanted shape back into the very rectangle
       it came from — same base, same height, same area. That rearrangement is
       the heart of every area formula a student will ever meet.
   Everything else — the state→model→render spine, DPI handling, predict-then-
   check gating (Next is gated on ANSWERED, not on CORRECT), and the calibration
   meter with its CALIBRATED stamp — is the same machine as the rest of the lab
   library.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/AreaLab.jsx
     2. Import and render it:
          import AreaLab from './AreaLab';
          export default function Page() { return <AreaLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (w, h, s, step).
     MODEL  — pure geometry (area, perimeter, corners) that knows no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   World window & axes. A square window so x and y share one scale — essential
   for area, where a stretched axis would make a square look like a rectangle.
   The shape is anchored at a fixed bottom-left corner and grows right and up,
   so its edges always land on the integer grid lines and the unit squares
   coincide exactly with the quadrille paper.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
const ANCHOR = { x: -3, y: -2 }; // fixed bottom-left corner of the shape
const GRID = 1; // width/height snap to whole units → the count is always exact

/* Dial ranges. Chosen so the largest shape (width 8, height 8, slant 3) still
   sits well inside the ±10 window: right edge −3+8+3 = 8, top edge −2+8 = 6. */
const RANGES = {
  w: { min: 1, max: 8, step: 1 },
  h: { min: 1, max: 8, step: 1 },
  s: { min: 0, max: 3, step: 1 },
};

/* Starting shape: a plain 6×4 rectangle, centered on the origin (its center is
   ANCHOR + (3, 2) = (0, 0)). Deliberately not a square, so the first thing a
   student sees isn't the special case where width and height coincide. */
const START = { w: 6, h: 4, s: 0 };

/* The three dials, unlocking one per lesson step — the same "one new control
   per idea" rhythm as the sine and parabola benches. */
const DIALS = [
  { key: 'w', label: 'Width', unit: '', unlock: 0 },
  { key: 'h', label: 'Height', unit: '', unlock: 1 },
  { key: 's', label: 'Slant', unit: '', unlock: 3 },
];

/* ---------------------------------------------------------------------------
   The lesson. One idea per step; the matching overlay turns on with the step;
   the reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions (adding instead of multiplying, confusing area with
   perimeter, thinking a longer slanted side means more area). Next is gated on
   ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'What is area?',
    body:
      'Area is the amount of flat space a shape covers, measured in unit squares — ' +
      'little 1×1 tiles. This rectangle is tiled with them: the area is simply how many ' +
      'tiles fit inside. Slide Width and watch tiles appear and disappear, one column at a time.',
    q: 'The rectangle is 6 wide and 4 tall. How many 1×1 unit squares fit inside it?',
    choices: ['24 square units', '10 square units', '48 square units'],
    answer: 0,
    feedback:
      '24 — four rows of six tiles, 6 × 4 = 24. Area counts the squares that COVER the shape. ' +
      'Adding the sides (6 + 4 = 10) measures how far AROUND it you’d walk — that’s perimeter, a ' +
      'different idea. Area multiplies; perimeter adds.',
  },
  {
    title: 'Rows and columns',
    body:
      'Counting tiles one at a time is slow. Notice they line up in a grid: each ROW has one ' +
      'tile per unit of width, and there is one ROW per unit of height. So the count is just ' +
      'rows × columns. Height is now unlocked — change it and watch the rows stack.',
    q: 'A rectangle has 5 columns and 3 rows of unit squares. What is its area?',
    choices: ['15 square units', '8 square units', '30 square units'],
    answer: 0,
    feedback:
      '15, because 3 rows of 5 tiles is 5 × 3 = 15. This is why area is a MULTIPLICATION: “5 and 3” ' +
      'added gives 8 (that’s not enough tiles to fill the grid), and doubling to 30 counts every tile ' +
      'twice. Rows times columns lands exactly on the tiles you can see.',
  },
  {
    title: 'The area of a rectangle',
    body:
      'That gives the rule for every rectangle: Area = width × height. Both dials are free now — ' +
      'build any rectangle and the tiles, the count, and the formula always agree. And because ' +
      'multiplication doesn’t care about order, turning the rectangle on its side can’t change its area.',
    q: 'Rectangle A is 8 wide and 3 tall. Rectangle B is 3 wide and 8 tall. Which has the larger area?',
    choices: ['They are equal — both are 24', 'A, because it is wider', 'B, because it is taller'],
    answer: 0,
    feedback:
      'Equal: 8 × 3 and 3 × 8 are both 24. Rotating a rectangle swaps which side you call “width,” ' +
      'but the tiles inside are the same tiles — so the area is unchanged. Area depends on the two ' +
      'dimensions, not on which one you measure first.',
  },
  {
    title: 'Slant it: the parallelogram',
    body:
      'Unlock Slant and push the top of the rectangle sideways — it becomes a parallelogram with the ' +
      'same base and the same height. Press “Cut & slide”: the triangle that overhangs the right end ' +
      'slides across to fill the notch on the left, and the shape snaps back into its original ' +
      'rectangle. Nothing was added or removed, so Area = base × height still holds.',
    q: 'You slant the rectangle into a parallelogram, keeping the same base and the same height. What happens to its area?',
    choices: [
      'It stays the same — area is base × height',
      'It grows, because the slanted side is longer',
      'It shrinks, because it looks squashed',
    ],
    answer: 0,
    feedback:
      'It stays exactly the same. The cut-and-slide shows why: you rearrange the very same region into ' +
      'a base × height rectangle. The slanted side IS longer, but the height — the straight-up distance ' +
      'between base and top — hasn’t changed, and area uses the height, not the slanted side.',
  },
  {
    title: 'Half of it: the triangle',
    body:
      'One diagonal cuts the shape into two identical triangles — press “Cut diagonal” to see it. ' +
      'Each triangle is exactly half the whole, so a triangle on the same base and height has half ' +
      'the area: Area = ½ · base · height. That’s where the triangle’s ½ comes from.',
    q: 'A triangle sits on the same base and has the same height as this rectangle. How do their areas compare?',
    choices: [
      'The triangle is exactly half the rectangle',
      'They are equal',
      'The triangle is one-third of the rectangle',
    ],
    answer: 0,
    feedback:
      'Exactly half. The diagonal splits the rectangle into two congruent (identical) triangles, so one ' +
      'triangle is ½ of base × height. This is the same ½ · base · height you get for ANY triangle — ' +
      'slide the top corner along and the area never budges, because base and height don’t change.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery rectangle is drawn as a dashed grey outline. Set Width and Height ' +
      'to cover it exactly — matching its area, tile for tile — until the meter reads CALIBRATED. ' +
      'Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   MODEL — pure geometry. No pixels. Single source of truth for every number
   the UI and the canvas display, so a label can never drift from the picture.

   The shape is a parallelogram with a horizontal base of length w, a vertical
   height h, and a horizontal slant s (the top edge shifted right by s). When
   s = 0 it is a rectangle; when w = h and s = 0 it is a square. Its four
   corners, counter-clockwise from the fixed bottom-left anchor:
   ------------------------------------------------------------------------- */
function corners(w, h, s) {
  const { x: ax, y: ay } = ANCHOR;
  return {
    P0: { x: ax, y: ay },         // bottom-left  (the anchor)
    P1: { x: ax + w, y: ay },     // bottom-right
    P2: { x: ax + w + s, y: ay + h }, // top-right
    P3: { x: ax + s, y: ay + h }, // top-left
  };
}

/* Everything the UI needs, computed once from (w, h, s). The area of a
   parallelogram is base × height regardless of the slant — that invariance is
   the whole lesson of the parallelogram step, so it is computed here, once,
   and every readout reads it from the same place. */
function geometry(w, h, s) {
  const area = w * h; // base × height, independent of slant s
  const slantSide = Math.hypot(h, s); // length of the two slanted edges
  const perimeter = 2 * w + 2 * slantSide;
  const isRect = s === 0;
  const isSquare = isRect && w === h;
  return {
    area,
    slantSide,
    perimeter,
    isRect,
    isSquare,
    unitSquares: isRect ? w * h : null, // whole-tile count only makes sense for a rectangle
    kind: isSquare ? 'square' : isRect ? 'rectangle' : 'parallelogram',
  };
}

/* ---------------------------------------------------------------------------
   Calibration. A construction goal in the house "match the ghost" ritual: hit a
   target rectangle's width AND height. The match metric is the distance between
   (w, h) and the target (W, H); it is 0 exactly when they coincide, and both
   live on the integer grid, so an exact (CALIBRATED) match is always reachable.
   ------------------------------------------------------------------------- */
function matchDistance(w, h, target) {
  return Math.hypot(w - target.W, h - target.H);
}
const matchPercent = (d) => Math.max(0, Math.min(100, 100 / (1 + d / 1.6)));
const MATCH_TOL = 1e-6; // exact grid match → CALIBRATED

function makeTarget(prev) {
  const rnd = (r) => r.min + Math.round(Math.random() * (r.max - r.min));
  let W, H, guard = 0;
  do {
    W = rnd(RANGES.w);
    H = rnd(RANGES.h);
    guard++;
  } while (
    guard < 200 &&
    (W < 2 || H < 2 || // avoid trivial 1-wide strips
      W * H < 6 || // avoid tiny targets
      (W === START.w && H === START.h) || // never hand back the starting shape
      (prev && W === prev.W && H === prev.H)) // and not the same target twice
  );
  return { W, H };
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−), trimmed decimals.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 100) / 100;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function AreaLab() {
  const [w, setW] = useState(START.w);
  const [h, setH] = useState(START.h);
  const [s, setS] = useState(START.s);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [showTiles, setShowTiles] = useState(true); // the unit-square tiling
  const [cutSlide, setCutSlide] = useState(false); // the parallelogram cut-and-slide
  const [diagonal, setDiagonal] = useState(false); // the triangle-is-half overlay

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null); // 'corner' | 'slant' | null
  const slideRef = useRef(1); // 0..1 progress of the cut-and-slide animation
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const geo = geometry(w, h, s);

  // Which dials are unlocked at this step (progressive reveal, one per step).
  // On the calibration step every dimension dial is available, but slant is
  // pinned to 0 (the target is a rectangle, so the challenge is purely area).
  const unlocked = {
    w: step >= 0,
    h: step >= 1,
    s: step >= 3 && !calib,
  };

  const rms = target ? matchDistance(w, h, target) : Infinity;
  const pct = target ? matchPercent(rms) : 0;
  const calibrated = target ? rms < MATCH_TOL : false;

  // The tiling only means "count of unit squares" for a rectangle; a slanted
  // parallelogram can't be tiled by axis-aligned squares, so it's shown only
  // when s === 0.
  const tilesOn = showTiles && s === 0 && !diagonal;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer handlers never read stale values.
  sceneRef.current = {
    w, h, s, geo, calib, target,
    tilesOn,
    cutSlide: cutSlide && s > 0,
    diagonal,
    showHandles: !calib,
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
    const { w: cw, h: ch, s: cs } = S;
    const C = corners(cw, ch, cs);

    ctx.clearRect(0, 0, Wpx, Hpx);

    /* minor grid (quadrille paper) */
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

    /* axes */
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, Math.round(sy(0)) + 0.5);
    ctx.lineTo(Wpx, Math.round(sy(0)) + 0.5);
    ctx.moveTo(Math.round(sx(0)) + 0.5, 0);
    ctx.lineTo(Math.round(sx(0)) + 0.5, Hpx);
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
      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
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
        { x: ax + S.target.W, y: ay },
        { x: ax + S.target.W, y: ay + S.target.H },
        { x: ax, y: ay + S.target.H },
      ];
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(91,107,123,0.85)';
      ctx.setLineDash([7, 6]);
      ctx.lineJoin = 'round';
      poly(g);
      ctx.stroke();
      ctx.restore();
      tag(`target area = ${S.target.W} × ${S.target.H} = ${S.target.W * S.target.H}`,
        sx(ax + S.target.W / 2), sy(ay + S.target.H) - 16, 'center', '#5B6B7B');
    }

    /* ---- reference rectangle behind a parallelogram (same base × height) ---- */
    if (S.s > 0 && !S.cutSlide) {
      const { x: ax, y: ay } = ANCHOR;
      const ref = [
        { x: ax, y: ay },
        { x: ax + cw, y: ay },
        { x: ax + cw, y: ay + ch },
        { x: ax, y: ay + ch },
      ];
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(91,107,123,0.5)';
      ctx.setLineDash([4, 5]);
      poly(ref);
      ctx.stroke();
      ctx.restore();
    }

    /* =====================================================================
       THE SHAPE. Three mutually-exclusive presentations:
         (a) cut-and-slide animation (parallelogram step),
         (b) the plain shape with unit-square tiles and/or diagonal overlay,
       both drawn in the single carmine accent that marks the object.
       ===================================================================== */
    const CARMINE = '#C81E4F';

    if (S.cutSlide) {
      /* --- (a) parallelogram → rectangle by cut-and-slide ------------------ */
      const { x: ax, y: ay } = ANCHOR;
      const t = slideRef.current; // 0..1
      // The region splits into a "core" trapezoid that stays put, plus the
      // triangle overhanging the right end, which slides left by (t · w) until
      // it exactly fills the notch on the left — reforming the base×height
      // rectangle. Nothing is added or removed: area is manifestly unchanged.
      const core = [
        { x: ax, y: ay },
        { x: ax + cw, y: ay },
        { x: ax + cw, y: ay + ch },
        { x: ax + cs, y: ay + ch },
      ];
      const dx = -t * cw; // how far the overhang has slid
      const slid = [
        { x: ax + cw + dx, y: ay },
        { x: ax + cw + dx, y: ay + ch },
        { x: ax + cw + cs + dx, y: ay + ch },
      ];

      // goal rectangle outline (where it's heading)
      const goal = [
        { x: ax, y: ay },
        { x: ax + cw, y: ay },
        { x: ax + cw, y: ay + ch },
        { x: ax, y: ay + ch },
      ];
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(200,30,79,0.35)';
      ctx.setLineDash([3, 4]);
      poly(goal);
      ctx.stroke();
      ctx.restore();

      // fills
      ctx.save();
      ctx.fillStyle = 'rgba(200,30,79,0.12)';
      poly(core);
      ctx.fill();
      poly(slid);
      ctx.fill();
      ctx.restore();

      // outlines
      ctx.save();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = CARMINE;
      ctx.lineJoin = 'round';
      poly(core);
      ctx.stroke();
      poly(slid);
      ctx.stroke();
      ctx.restore();

      // a small arrow showing the slide direction, mid-height
      if (t < 0.98) {
        const yy = ay + ch / 2;
        const x1 = ax + cw + cs / 2;
        const x2 = x1 + dx;
        ctx.save();
        ctx.strokeStyle = 'rgba(28,43,58,0.5)';
        ctx.fillStyle = 'rgba(28,43,58,0.5)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sx(x1), sy(yy));
        ctx.lineTo(sx(x2), sy(yy));
        ctx.stroke();
        const ah = 5;
        ctx.beginPath();
        ctx.moveTo(sx(x2), sy(yy));
        ctx.lineTo(sx(x2) + ah, sy(yy) - ah);
        ctx.lineTo(sx(x2) + ah, sy(yy) + ah);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // base & height labels + the invariant caption
      tag(`base = ${trim(cw)}`, sx(ax + cw / 2), sy(ay) + 16, 'center', CARMINE);
      // height marker (dashed vertical at left) with right-angle tick
      ctx.save();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(28,43,58,0.7)';
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(sx(ax), sy(ay));
      ctx.lineTo(sx(ax), sy(ay + ch));
      ctx.stroke();
      ctx.restore();
      tag(`height = ${trim(ch)}`, sx(ax) - 10, sy(ay + ch / 2), 'right', '#1C2B3A');

      const capY = sy(ay) + 38;
      tag(`base × height = ${trim(cw)} × ${trim(ch)} = ${trim(cw * ch)}  (area unchanged)`,
        sx(ax + cw / 2), capY, 'center', t > 0.98 ? CARMINE : '#5B6B7B');
    } else {
      /* --- (b) the plain shape, with tiles and/or the diagonal overlay ----- */
      const shape = [C.P0, C.P1, C.P2, C.P3];

      // faint body wash = the object
      ctx.save();
      poly(shape);
      ctx.fillStyle = 'rgba(200,30,79,0.06)';
      ctx.fill();
      ctx.restore();

      // unit-square tiling (rectangle only): a subtle checkerboard makes the
      // individual 1×1 tiles countable at a glance, and carmine separators mark
      // every tile edge. Clipped to the shape so nothing spills over.
      if (S.tilesOn) {
        ctx.save();
        poly(shape);
        ctx.clip();
        // faint checkerboard tint on alternate tiles
        for (let i = 0; i < cw; i++) {
          for (let j = 0; j < ch; j++) {
            if ((i + j) % 2 === 0) continue;
            const x0 = ANCHOR.x + i, y0 = ANCHOR.y + j;
            ctx.fillStyle = 'rgba(200,30,79,0.08)';
            ctx.fillRect(sx(x0), sy(y0 + 1), sx(x0 + 1) - sx(x0), sy(y0) - sy(y0 + 1));
          }
        }
        // tile separators
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(200,30,79,0.30)';
        ctx.beginPath();
        for (let gx = ANCHOR.x; gx <= ANCHOR.x + cw + 0.001; gx += 1) {
          ctx.moveTo(Math.round(sx(gx)) + 0.5, sy(ANCHOR.y));
          ctx.lineTo(Math.round(sx(gx)) + 0.5, sy(ANCHOR.y + ch));
        }
        for (let gy = ANCHOR.y; gy <= ANCHOR.y + ch + 0.001; gy += 1) {
          ctx.moveTo(sx(ANCHOR.x), Math.round(sy(gy)) + 0.5);
          ctx.lineTo(sx(ANCHOR.x + cw), Math.round(sy(gy)) + 0.5);
        }
        ctx.stroke();
        ctx.restore();
      }

      // diagonal overlay: shade one of the two congruent triangles
      if (S.diagonal) {
        ctx.save();
        poly([C.P0, C.P1, C.P2]); // lower-right triangle
        ctx.fillStyle = 'rgba(200,30,79,0.20)';
        ctx.fill();
        ctx.restore();
        // the diagonal itself
        ctx.save();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = 'rgba(28,43,58,0.7)';
        ctx.beginPath();
        ctx.moveTo(sx(C.P0.x), sy(C.P0.y));
        ctx.lineTo(sx(C.P2.x), sy(C.P2.y));
        ctx.stroke();
        ctx.restore();
        // half-area label at the centroid of the shaded triangle
        const gcx = (C.P0.x + C.P1.x + C.P2.x) / 3;
        const gcy = (C.P0.y + C.P1.y + C.P2.y) / 3;
        tag(`½ · ${trim(cw)} · ${trim(ch)} = ${trim((cw * ch) / 2)}`, sx(gcx), sy(gcy), 'center', CARMINE);
      }

      // outline — the one carmine accent
      ctx.save();
      ctx.lineWidth = 2.75;
      ctx.strokeStyle = CARMINE;
      ctx.lineJoin = 'round';
      poly(shape);
      ctx.stroke();
      ctx.restore();

      // dimension labels: width/base along the bottom, height along the left.
      const baseLabel = cs === 0 ? `width = ${trim(cw)}` : `base = ${trim(cw)}`;
      tag(baseLabel, sx((C.P0.x + C.P1.x) / 2), sy(ANCHOR.y) + 16, 'center', CARMINE);

      // height: a dashed vertical of true height h, with a right-angle tick at
      // the base — this is the height the area formula actually uses.
      const hx = ANCHOR.x + cs; // sits under the top-left corner
      ctx.save();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(28,43,58,0.6)';
      ctx.setLineDash(cs === 0 ? [] : [5, 4]);
      ctx.beginPath();
      ctx.moveTo(sx(hx), sy(ANCHOR.y));
      ctx.lineTo(sx(hx), sy(ANCHOR.y + ch));
      ctx.stroke();
      ctx.restore();
      if (cs > 0) {
        // right-angle tick where the dashed height meets the base
        const m = 0.5;
        ctx.save();
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = 'rgba(28,43,58,0.55)';
        ctx.beginPath();
        ctx.moveTo(sx(hx + m), sy(ANCHOR.y));
        ctx.lineTo(sx(hx + m), sy(ANCHOR.y + m));
        ctx.lineTo(sx(hx), sy(ANCHOR.y + m));
        ctx.stroke();
        ctx.restore();
      }
      const hLabelX = cs === 0 ? sx(ANCHOR.x) - 10 : sx(hx) - 10;
      tag(`height = ${trim(ch)}`, hLabelX, sy(ANCHOR.y + ch / 2), 'right', '#1C2B3A');
    }

    /* ---- drag handles (top-right corner sizes w,h; top-left sets slant) ---- */
    if (S.showHandles && !S.cutSlide) {
      const handle = (P, active) => {
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
      };
      handle(C.P2); // size handle
      if (S.s > 0 || step >= 3) handle(C.P3); // slant handle (once slant is in play)
    }
  }, [step]);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [w, h, s, step, target, showTiles, cutSlide, diagonal, draw]);

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
     tiles for the counting steps, the cut-and-slide on the parallelogram step,
     the diagonal on the triangle step. Slant resets to 0 when it isn't the
     subject, so the earlier steps always show a clean rectangle. (The toolbar
     toggles still let a student turn any overlay on or off within a step.) */
  useEffect(() => {
    const title = STEPS[step] && STEPS[step].title;
    if (title === 'Slant it: the parallelogram') {
      setS((cur) => (cur === 0 ? 2 : cur)); // give the slant something to show
      setCutSlide(false); // rest on the parallelogram; the student presses "Cut & slide"
      setDiagonal(false);
      setShowTiles(false);
    } else if (title === 'Half of it: the triangle') {
      setS(0); // a clean rectangle split by its diagonal → two congruent triangles
      setCutSlide(false);
      setDiagonal(true);
      setShowTiles(false);
    } else if (title === 'Calibration challenge') {
      setS(0);
      setCutSlide(false);
      setDiagonal(false);
      setShowTiles(true);
    } else {
      // the counting / formula steps: a clean, tiled rectangle
      setS(0);
      setCutSlide(false);
      setDiagonal(false);
      setShowTiles(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the cut-and-slide animation — time-based, opt-in via the toggle/step, and
     instant when reduced motion is requested. It eases 0→1 then holds. */
  useEffect(() => {
    const active = cutSlide && s > 0;
    if (!active) {
      slideRef.current = 1;
      draw();
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      slideRef.current = 1;
      draw();
      return;
    }
    let raf;
    let start = null;
    const DURATION = 1500;
    slideRef.current = 0;
    const ease = (p) => 1 - Math.pow(1 - p, 3); // easeOutCubic
    const loop = (now) => {
      if (start == null) start = now;
      const p = Math.min(1, (now - start) / DURATION);
      slideRef.current = ease(p);
      draw();
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cutSlide, s, w, h, draw]);

  /* ---- interaction: dragging the size / slant handles -------------------- */
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
    if (calib || cutSlide) return;
    const pw = worldFromEvent(e);
    const C = corners(w, h, s);
    const near = (P) => Math.hypot(pw.x - P.x, pw.y - P.y) <= 1.1;
    // slant handle (top-left) takes priority when slant is in play
    if (unlocked.s && near(C.P3)) {
      dragRef.current = 'slant';
    } else if (unlocked.h && near(C.P2)) {
      dragRef.current = 'corner';
    } else {
      return;
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    applyDrag(pw);
  };
  const applyDrag = (pw) => {
    if (dragRef.current === 'corner') {
      // top-right corner sets width (accounting for the current slant) & height
      setW(clampDial('w', pw.x - ANCHOR.x - s));
      if (unlocked.h) setH(clampDial('h', pw.y - ANCHOR.y));
    } else if (dragRef.current === 'slant') {
      setS(clampDial('s', pw.x - ANCHOR.x));
    }
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    applyDrag(worldFromEvent(e));
  };
  const onPointerUp = (e) => {
    dragRef.current = null;
    e.currentTarget?.releasePointerCapture?.(e.pointerId);
  };

  /* ---- misc handlers ----------------------------------------------------- */
  const setDial = (key, value) => {
    const v = clampDial(key, value);
    if (key === 'w') setW(v);
    else if (key === 'h') setH(v);
    else setS(v);
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
    setW(START.w);
    setH(START.h);
    setS(START.s);
    setShowTiles(true);
    setCutSlide(false);
    setDiagonal(false);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);
  const val = { w, h, s };

  // The headline equation, adapting to the current mode.
  const areaEq = diagonal
    ? { lhs: 'A = ½ · base · height', rhs: `½ · ${trim(w)} · ${trim(h)}`, out: trim((w * h) / 2) }
    : s > 0
      ? { lhs: 'A = base × height', rhs: `${trim(w)} × ${trim(h)}`, out: trim(w * h) }
      : { lhs: 'A = width × height', rhs: `${trim(w)} × ${trim(h)}`, out: trim(w * h) };

  return (
    <div className="alab">
      <header className="head">
        <h1>Area</h1>
        <p className="lede">
          Area is how much flat space a shape covers, counted in unit squares. Build a rectangle
          and watch the tiles fill in — then discover why{' '}
          <span className="mono">Area&nbsp;=&nbsp;width&nbsp;×&nbsp;height</span>, and how a slant
          and a diagonal turn that one idea into the parallelogram and the triangle. Each step
          reveals one new idea, and it ends with a calibration challenge.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation" aria-hidden="true">
              <span className="eq">
                {areaEq.lhs} = {areaEq.rhs} = <b>{areaEq.out}</b>
              </span>
            </p>
            <p className="equation-sub mono">
              {geo.kind}
              {geo.isRect ? ` · ${trim(geo.unitSquares)} unit squares` : ` · base×height = ${trim(w * h)}`}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            role="application"
            aria-label={
              `Interactive ${geo.kind} on a coordinate grid, width ${trim(w)}, height ${trim(h)}` +
              (s > 0 ? `, slant ${trim(s)}` : '') +
              `. Area ${trim(w * h)} square units. Use the width, height and slant dials below, ` +
              `or drag the corner handles.`
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">drag a handle — or use the dials below</span>
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
              <span className="fact-k">Width</span>
              <span className="fact-v mono">{trim(w)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Height</span>
              <span className="fact-v mono">{trim(h)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Area</span>
              <span className="fact-v mono accent">
                {diagonal ? `${trim((w * h) / 2)} (½·b·h)` : trim(w * h)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Shape</span>
              <span className="fact-v mono">{geo.kind}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Perimeter</span>
              <span className="fact-v mono">≈ {geo.perimeter.toFixed(2)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Unit squares</span>
              <span className="fact-v mono">{geo.isRect ? trim(geo.unitSquares) : '—'}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (showTiles && s === 0 ? ' on' : '')}
              onClick={() => setShowTiles((v) => !v)}
              disabled={s !== 0}
            >
              {showTiles && s === 0 ? 'Tiles shown' : 'Show unit squares'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (cutSlide && s > 0 ? ' on' : '')}
              onClick={() => setCutSlide((v) => !v)}
              disabled={s === 0}
            >
              {cutSlide && s > 0 ? 'Sliding' : 'Cut & slide'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (diagonal ? ' on' : '')}
              onClick={() => setDiagonal((v) => !v)}
            >
              {diagonal ? 'Diagonal shown' : 'Cut diagonal'}
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
                    cover the ghost — need {target.W} × {target.H}
                  </span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={() => setTarget(makeTarget(target))}>
                New target
              </button>
              <p className="sr-live" aria-live="polite">
                {calibrated ? 'Calibrated. Your rectangle matches the target area.' : ''}
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
        <span className="mono">Area = width × height</span> &nbsp;·&nbsp; the count of unit squares
        that tile a region — the one idea behind the rectangle, the parallelogram, and the triangle.
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
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12px;
          margin: 0;
          text-transform: capitalize;
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
        .dials {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
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
        .fact-v.accent {
          color: var(--curve);
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
