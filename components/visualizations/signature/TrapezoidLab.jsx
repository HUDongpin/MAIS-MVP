'use client';

/* ============================================================================
   TrapezoidLab — an interactive "bench" for the trapezoid: its parallel bases,
   its legs, its height, its midsegment, and the theorem that ties them together,

        A  =  ½ · (b₁ + b₂) · h

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, a staged lesson that reveals
   one idea at a time, predict-then-check questions, and a calibration challenge
   with a live match meter.

   Why this bench adapts the y = f(x) / dial template, and how it stays faithful:
     • A trapezoid is a SHAPE you build, not a curve driven by a few parameters,
       so the natural control is DIRECT MANIPULATION — you drag the four corners
       (pointer or keyboard) — exactly as the Triangle and Quadrilateral labs do.
     • But a trapezoid has ONE defining constraint the general quadrilateral does
       not: a pair of PARALLEL sides. So this bench keeps the two bases perfectly
       horizontal BY CONSTRUCTION — grab a bottom corner and it slides along the
       ground line; grab a top corner and it slides along the top line and sets
       the height. However you drag, the two bases stay parallel, so the object
       on screen is ALWAYS a genuine trapezoid. (Contrast the Quadrilateral lab,
       where any four corners are allowed and the trapezoid is only one case.)
     • "One dial unlocks per lesson step" becomes "one OVERLAY reveals per step":
       definition → bases/legs/height → types → base angles → midsegment → area.
       Each step turns on exactly one new layer of the SAME trapezoid.
     • The trapezoid's defining beauty — the analogue of the triangle angle-sum
       "tear the corners" — is the AREA PROOF: a second copy of the trapezoid,
       rotated a half-turn, snaps against the first to make a PARALLELOGRAM whose
       base is (b₁ + b₂) and whose height is h. One trapezoid is exactly half of
       it, which is why A = ½·(b₁ + b₂)·h. The centerpiece animates that.
   Everything else — the state→model→render spine, DPI handling, predict-then-
   check gating (Next is gated on ANSWERED, not on CORRECT), and the RMS
   calibration meter — is the same machine as the rest of the lab library.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/TrapezoidLab.jsx
     2. Import and render it:
          import TrapezoidLab from './TrapezoidLab';
          export default function Page() { return <TrapezoidLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (A, B, C, D, step).
     MODEL  — pure geometry (bases, legs, height, angles, area) with no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   World window & axes. A square window so x and y share one scale and the
   height h reads as a true perpendicular. Grid every 1 unit, labels every 2.
   Corners snap to a half-unit grid and stay inside ±BOUND so labels never clip.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
const GRID = 0.5;  // corners snap to a half-unit grid: crisp, and exact matches reachable
const BOUND = 9.5; // corners stay within ±BOUND
const MINH = 1;    // smallest allowed height (keeps a genuine trapezoid)
const MINB = 1;    // smallest allowed base length

/* Starting trapezoid: a plain SCALENE trapezoid with horizontal bases, well
   inside the window. Deliberately NOT special (not isosceles, not right) so the
   first thing a student sees isn't a symmetric case.
     A = bottom-left, B = bottom-right, C = top-right, D = top-left.
   Order A→B→C→D traces the outline counter-clockwise; AB is the bottom base
   (b₁), DC the top base (b₂), and DA / BC are the two legs. */
const START = {
  A: { x: -6, y: -3 },
  B: { x: 6, y: -3 },
  C: { x: 4, y: 3 },
  D: { x: -2, y: 3 },
};

/* Canonical examples for the classification step — each an exact instance of a
   named type, on the grid. */
const PRESETS = {
  Right: { A: { x: -5, y: -3 }, B: { x: 5, y: -3 }, C: { x: 1, y: 3 }, D: { x: -5, y: 3 } },      // left leg vertical
  Isosceles: { A: { x: -6, y: -3 }, B: { x: 6, y: -3 }, C: { x: 3, y: 3 }, D: { x: -3, y: 3 } },  // symmetric
  Scalene: { A: { x: -6, y: -3 }, B: { x: 5, y: -3 }, C: { x: 4, y: 3 }, D: { x: -3, y: 3 } },     // no symmetry
  Parallelogram: { A: { x: -5, y: -3 }, B: { x: 5, y: -3 }, C: { x: 7, y: 3 }, D: { x: -3, y: 3 } }, // b₁ = b₂
};

/* ---------------------------------------------------------------------------
   The lesson. One idea per step; the matching overlay turns on with the step;
   the reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the trapezoid',
    body:
      'A trapezoid is a four-sided shape (a quadrilateral) with a pair of PARALLEL sides. Those two ' +
      'parallel sides are the BASES — here the top and bottom, marked with matching arrows. Grab any ' +
      'corner and drag it: a bottom corner slides along the ground line, a top corner slides along the ' +
      'top line and sets the height. However you reshape it, the two bases stay parallel — so it stays ' +
      'a trapezoid.',
    q: 'What makes a four-sided shape a trapezoid?',
    choices: [
      'It has a pair of parallel sides',
      'All four sides are equal in length',
      'All four angles are right angles',
    ],
    answer: 0,
    feedback:
      'A trapezoid is defined by having a pair of parallel sides — the two bases. It does NOT need equal ' +
      'sides or right angles. (Heads-up on names: most U.S. textbooks now use the “inclusive” definition, ' +
      '“at least one pair of parallel sides,” which makes every parallelogram a trapezoid too. The older ' +
      '“exclusive” definition says exactly one pair. This lab flags both where it matters.)',
  },
  {
    title: 'Bases, legs, and height',
    body:
      'The two parallel sides are the bases: b₁ (bottom) and b₂ (top). The other two sides — the slanted ' +
      'ones — are the LEGS. The HEIGHT h is the straight-up perpendicular distance between the two bases ' +
      '(the dashed segment with the right-angle mark). The height is NOT the slanted length of a leg. Drag ' +
      'the corners and watch every measure update.',
    q: 'Which measurement is the height of a trapezoid?',
    choices: [
      'The perpendicular distance between the two parallel bases',
      'The length of the longer slanted leg',
      'The length of the longer base',
    ],
    answer: 0,
    feedback:
      'The height is the perpendicular (straight-across) gap between the two bases — how far apart the ' +
      'parallel lines are. A slanted leg is longer than the height unless the leg happens to be vertical. ' +
      'Using a leg length in place of h is the single most common area-formula mistake.',
  },
  {
    title: 'Types of trapezoid',
    body:
      'Trapezoids come in kinds. A RIGHT trapezoid has a leg perpendicular to the bases (two right ' +
      'angles). An ISOSCELES trapezoid has its two legs equal and is symmetric — equal base angles and ' +
      'equal diagonals. Any other is SCALENE. Try the example buttons, or drag your own; the badge names ' +
      'your trapezoid live. (A parallelogram — b₁ = b₂ — is a trapezoid only under the inclusive rule.)',
    q: 'In an isosceles trapezoid, which statement is always true?',
    choices: [
      'The two legs are equal, and the base angles at each base are equal',
      'All four sides are equal',
      'The two bases are equal in length',
    ],
    answer: 0,
    feedback:
      'An isosceles trapezoid has equal legs and a line of symmetry, so the two angles along the bottom ' +
      'base are equal to each other and the two along the top are equal to each other (and its diagonals ' +
      'are equal). If the two BASES were equal you would have a parallelogram, not a proper trapezoid.',
  },
  {
    title: 'The base angles',
    body:
      'Because the two bases are parallel, each leg is a transversal cutting across them — so the two ' +
      'angles on the SAME leg are co-interior and add to 180°. That is, ∠A + ∠D = 180° along the left ' +
      'leg, and ∠B + ∠C = 180° along the right leg. The four angles are now drawn; drag a corner and the ' +
      'two running sums below stay glued to 180°.',
    q: 'A trapezoid has bases top and bottom. One bottom base angle is 70°. What is the angle right above it, at the top of the same leg?',
    choices: ['110°', '70°', '90°'],
    answer: 0,
    feedback:
      '110°, because the two angles on one leg must total 180°: 180 − 70 = 110. The leg crosses two ' +
      'parallel lines, so those co-interior (“same-side interior”) angles are supplementary. That is also ' +
      'why all four angles add to 360°: (∠A + ∠D) + (∠B + ∠C) = 180 + 180 = 360.',
  },
  {
    title: 'The midsegment (median)',
    body:
      'Join the MIDPOINTS of the two legs and you get the midsegment (or median), drawn here at mid-height. ' +
      'It is parallel to the bases, and its length is the AVERAGE of the two bases: m = ½ · (b₁ + b₂). ' +
      'Drag the corners — the midsegment always sits exactly halfway in length between the short base and ' +
      'the long one.',
    q: 'The bases of a trapezoid are 8 and 12. How long is its midsegment?',
    choices: ['10', '20', '4'],
    answer: 0,
    feedback:
      '10 — the midsegment is the average of the bases: (8 + 12) ÷ 2 = 10. (Adding the bases gives 20, ' +
      'their difference is 4, but the midsegment is the halfway average.) This is the key to the area ' +
      'formula: the trapezoid holds as much area as a rectangle m units wide and h units tall.',
  },
  {
    title: 'Area = ½ · (b₁ + b₂) · h',
    body:
      'Here is the heart of it. Take a second copy of the trapezoid, spin it a half-turn, and slot it ' +
      'against the first: together they make a PARALLELOGRAM with base (b₁ + b₂) and height h. That ' +
      'parallelogram has area (b₁ + b₂)·h, so ONE trapezoid is exactly half: A = ½ · (b₁ + b₂) · h. ' +
      'Notice ½·(b₁ + b₂) is just the midsegment m, so A = m · h too. The doubling proof is animated below.',
    q: 'You slide the top base sideways but keep both bases and the height the same. What happens to the area?',
    choices: [
      'It stays the same — area depends only on the two bases and the height',
      'It grows because a leg got longer',
      'It shrinks because the shape looks more slanted',
    ],
    answer: 0,
    feedback:
      'It stays exactly the same. Sliding the top base sideways (shearing) changes the legs and the look, ' +
      'but not b₁, b₂, or h — and A = ½·(b₁ + b₂)·h uses only those three. A leaning trapezoid and an ' +
      'upright one with the same bases and height have equal area, just as with triangles.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery trapezoid is drawn as a dashed grey outline. Drag your carmine corners ' +
      'onto it — match the two bases, the height, and the position — until the meter reads CALIBRATED. ' +
      'Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   MODEL — pure geometry. No pixels. Single source of truth for every number the
   UI and the canvas display, so a label can never drift from the picture.
   Invariant maintained by the interaction handlers: A.y === B.y (bottom base),
   C.y === D.y (top base), so the two bases are always horizontal ⇒ parallel.
     bases: b₁ = |AB| (bottom), b₂ = |DC| (top);  legs: DA (left), BC (right).
   ------------------------------------------------------------------------- */
const RAD2DEG = 180 / Math.PI;
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

/* Interior angle at vertex V between its two neighbours P and Q. atan2(|cross|,
   dot) is numerically stable near 0° and 180°, unlike acos. */
function angleAt(V, P, Q) {
  const ux = P.x - V.x, uy = P.y - V.y;
  const wx = Q.x - V.x, wy = Q.y - V.y;
  const cross = ux * wy - uy * wx;
  const dot = ux * wx + uy * wy;
  return Math.atan2(Math.abs(cross), dot) * RAD2DEG;
}

/* Signed double-area via the shoelace formula; |it|/2 is the polygon's area. */
function shoelace2(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    s += p.x * q.y - q.x * p.y;
  }
  return s;
}

const TOL = 1e-6;

/* Name the trapezoid. Precedence puts the special (parallelogram-family) cases
   first, then the proper-trapezoid kinds. L and R are the horizontal offsets of
   the top base's ends from the bottom base's ends (the "overhangs"); a leg is
   vertical exactly when its overhang is 0. */
function classify(b1, b2, h, tz) {
  const { A, B, C, D } = tz;
  const L = D.x - A.x;      // left leg overhang
  const R = B.x - C.x;      // right leg overhang
  const eqBases = Math.abs(b1 - b2) < TOL;
  const leftVert = Math.abs(L) < TOL;
  const rightVert = Math.abs(R) < TOL;
  if (eqBases) {
    // both bases equal & parallel ⇒ a parallelogram (inclusive-definition trapezoid)
    if (leftVert && rightVert) return Math.abs(b1 - h) < TOL ? 'square' : 'rectangle';
    return 'parallelogram';
  }
  if (leftVert || rightVert) return 'right trapezoid';
  if (Math.abs(L - R) < TOL) return 'isosceles trapezoid';
  return 'scalene trapezoid';
}

/* Everything the UI needs, computed once from the four corners. */
function geometry(tz) {
  const { A, B, C, D } = tz;
  const bottomY = A.y, topY = C.y;
  const h = topY - bottomY;
  const b1 = B.x - A.x;   // bottom base
  const b2 = C.x - D.x;   // top base
  const mid = (b1 + b2) / 2;
  const legL = dist(D, A);
  const legR = dist(B, C);
  const legsEqual = Math.abs(legL - legR) < TOL;
  const poly = [A, B, C, D];
  const area = Math.abs(shoelace2(poly)) / 2;
  const areaFormula = 0.5 * (b1 + b2) * h; // the taught formula, proven == area in the audit
  const degenerate = h < MINH - TOL || b1 < MINB - TOL || b2 < MINB - TOL || h < TOL || b1 < TOL || b2 < TOL;

  const angA = degenerate ? 0 : angleAt(A, B, D);
  const angB = degenerate ? 0 : angleAt(B, C, A);
  const angC = degenerate ? 0 : angleAt(C, D, B);
  const angD = degenerate ? 0 : angleAt(D, A, C);

  return {
    bottomY, topY, h, b1, b2, mid,
    legL, legR, legsEqual,
    area, areaFormula, degenerate,
    angles: { A: angA, B: angB, C: angC, D: angD },
    angleSum: angA + angB + angC + angD, // = 360 for any simple quadrilateral
    perimeter: b1 + b2 + legL + legR,
    className: degenerate ? '—' : classify(b1, b2, h, tz),
    poly,
  };
}

/* ---------------------------------------------------------------------------
   Calibration. The trapezoid here always has a fixed orientation (A bottom-left,
   B bottom-right, C top-right, D top-left), so "the same trapezoid" means the
   four corresponding corners coincide — the match metric is the plain RMS
   distance over the four A↔A, B↔B, C↔C, D↔D pairs. Targets sit on the grid and
   in this same family, so an exact (RMS = 0) match is always reachable by drag.
   ------------------------------------------------------------------------- */
function rmsMatch(tz, target) {
  const keys = ['A', 'B', 'C', 'D'];
  let s = 0;
  for (const k of keys) {
    const dx = tz[k].x - target[k].x;
    const dy = tz[k].y - target[k].y;
    s += dx * dx + dy * dy;
  }
  return Math.sqrt(s / 4);
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 1.2)));
const MATCH_RMS = 0.03; // below this the two trapezoids are effectively identical -> CALIBRATED

function makeTarget(prev) {
  const snap = (v) => Math.round(v / GRID) * GRID;
  const rr = (lo, hi) => snap(lo + Math.random() * (hi - lo));
  let t;
  let guard = 0;
  do {
    const bottomY = rr(-8, 0);
    const h = rr(3, 8);
    const topY = bottomY + h;
    const axL = rr(-9, 1);
    const b1 = rr(4, 10);
    const bxR = axL + b1;
    const b2 = rr(2, Math.max(2, b1 - 1)); // keep it a proper trapezoid (b₂ ≠ b₁ usually)
    const shift = rr(-3, 3);
    const dxL = axL + shift;
    const cxR = dxL + b2;
    t = {
      A: { x: axL, y: bottomY }, B: { x: bxR, y: bottomY },
      C: { x: cxR, y: topY }, D: { x: dxL, y: topY },
    };
    guard++;
  } while (
    guard < 400 &&
    (!inBounds(t) ||
      geometry(t).area < 12 ||
      Math.abs(t.B.x - t.A.x - (t.C.x - t.D.x)) < TOL || // avoid handing back a parallelogram target
      (prev && rmsMatch(t, prev) < 1) ||
      rmsMatch(t, START) < 1)
  );
  return t;
}
function inBounds(t) {
  for (const k of ['A', 'B', 'C', 'D']) {
    if (t[k].x < -BOUND || t[k].x > BOUND || t[k].y < -BOUND || t[k].y > BOUND) return false;
  }
  return t.A.x < t.B.x && t.D.x < t.C.x && t.C.y - t.A.y >= MINH;
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

/* Supplementary-preserving angle display. Because ∠A + ∠D = 180° exactly (and
   ∠B + ∠C = 180°), we round one angle to 0.1° and derive its partner as
   180 − it, so the two shown values ALWAYS total exactly 180.0° — and all four
   total exactly 360.0°. Same idea as rounding percentages so they sum to 100%. */
function angleReadout(g) {
  if (g.degenerate) return null;
  const aR = Math.round(g.angles.A * 10) / 10;
  const dR = Math.round((180 - aR) * 10) / 10;
  const bR = Math.round(g.angles.B * 10) / 10;
  const cR = Math.round((180 - bR) * 10) / 10;
  return {
    A: aR.toFixed(1), D: dR.toFixed(1),
    B: bR.toFixed(1), C: cR.toFixed(1),
  };
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TrapezoidLab() {
  const [tz, setTz] = useState(START);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [selected, setSelected] = useState('A'); // which corner the keyboard nudges
  const [showHeight, setShowHeight] = useState(false);
  const [showMid, setShowMid] = useState(false);
  const [showProof, setShowProof] = useState(false); // the doubling / parallelogram proof inset

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);      // key of the corner being dragged, or null
  const assembleRef = useRef(1);     // 0..1 progress of the doubling animation
  const sceneRef = useRef({});

  const geo = geometry(tz);
  const current = STEPS[step];
  const ar = angleReadout(geo); // supplementary-preserving angle strings

  // Which overlays are live at this step (progressive reveal, one per step).
  const showParts = step >= 1;         // base/leg labels, introduced in step 1
  const showAngles = step === 3;       // the base-angle step
  const areaStep = step === 5;         // the area step exactly (not calibration)

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer/keyboard handlers never read stale values.
  sceneRef.current = {
    tz,
    calib: !!current.calib,
    target,
    selected,
    showParts,
    showAngles,
    showHeight: showHeight || step === 1 || areaStep,
    showMid: showMid || step === 4 || areaStep,
    showProof: showProof || areaStep,
    areaShade: areaStep,
    typesStep: step === 2,
    geo,
    ar,
  };

  const rms = target ? rmsMatch(tz, target) : Infinity;
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
    const t = S.tz;
    const g = S.geo;

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

    const V = { A: t.A, B: t.B, C: t.C, D: t.D };
    const centroid = {
      x: (t.A.x + t.B.x + t.C.x + t.D.x) / 4,
      y: (t.A.y + t.B.y + t.C.y + t.D.y) / 4,
    };

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
      ctx.lineTo(sx(q.D.x), sy(q.D.y));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    /* ---- filled body (faint carmine wash = the object) --------------------- */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx(t.A.x), sy(t.A.y));
    ctx.lineTo(sx(t.B.x), sy(t.B.y));
    ctx.lineTo(sx(t.C.x), sy(t.C.y));
    ctx.lineTo(sx(t.D.x), sy(t.D.y));
    ctx.closePath();
    ctx.fillStyle = S.areaShade ? 'rgba(200,30,79,0.10)' : 'rgba(200,30,79,0.05)';
    ctx.fill();
    ctx.restore();

    /* ---- height overlay: a vertical dashed drop between the two bases ------- */
    if (S.showHeight && !g.degenerate) {
      // drop the height at the horizontal centre of the top base; if that x lands
      // outside the bottom base, extend the bottom base line to reach its foot
      const xMid = (t.D.x + t.C.x) / 2;
      const footY = g.bottomY, topPtY = g.topY;
      ctx.save();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(28,43,58,0.75)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(sx(xMid), sy(topPtY));
      ctx.lineTo(sx(xMid), sy(footY));
      ctx.stroke();
      ctx.restore();
      // extension of the bottom base if the foot lands beyond it
      if (xMid < Math.min(t.A.x, t.B.x) - TOL || xMid > Math.max(t.A.x, t.B.x) + TOL) {
        const near = xMid < t.A.x ? t.A.x : t.B.x;
        ctx.save();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(91,107,123,0.5)';
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(sx(near), sy(footY));
        ctx.lineTo(sx(xMid), sy(footY));
        ctx.stroke();
        ctx.restore();
      }
      // right-angle marker at the foot
      {
        const m = 0.45;
        ctx.save();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(28,43,58,0.6)';
        ctx.beginPath();
        ctx.moveTo(sx(xMid + m), sy(footY));
        ctx.lineTo(sx(xMid + m), sy(footY + m));
        ctx.lineTo(sx(xMid), sy(footY + m));
        ctx.stroke();
        ctx.restore();
      }
      // place the label low (near the base) and on the roomier side, so it never
      // collides with the midsegment label that sits at mid-height
      const hLabelY = footY + g.h * 0.3;
      const hSide = xMid <= 0 ? 1 : -1;
      tag(`h = ${trim(g.h)}`, sx(xMid) + hSide * 10, sy(hLabelY), hSide > 0 ? 'left' : 'right', '#1C2B3A');
    }

    /* ---- midsegment overlay: joins the leg midpoints; length = ½(b₁+b₂) ----- */
    if (S.showMid && !g.degenerate) {
      const mL = { x: (t.D.x + t.A.x) / 2, y: (g.bottomY + g.topY) / 2 };
      const mR = { x: (t.B.x + t.C.x) / 2, y: (g.bottomY + g.topY) / 2 };
      ctx.save();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = 'rgba(28,43,58,0.7)';
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(sx(mL.x), sy(mL.y));
      ctx.lineTo(sx(mR.x), sy(mR.y));
      ctx.stroke();
      ctx.restore();
      // midpoint dots on the legs
      for (const p of [mL, mR]) {
        ctx.beginPath();
        ctx.arc(sx(p.x), sy(p.y), 3, 0, Math.PI * 2);
        ctx.fillStyle = '#1C2B3A';
        ctx.fill();
      }
      tag(`m = ${trim(g.mid)}`, (sx(mL.x) + sx(mR.x)) / 2, sy(mL.y) - 12, 'center', '#C81E4F');
    }

    /* ---- base labels b₁, b₂ and leg labels --------------------------------- */
    if (S.showParts && !S.showAngles && !g.degenerate) {
      // bottom base b₁
      tag(`b₁ = ${trim(g.b1)}`, (sx(t.A.x) + sx(t.B.x)) / 2, sy(g.bottomY) + 14, 'center', '#C81E4F');
      // top base b₂
      tag(`b₂ = ${trim(g.b2)}`, (sx(t.D.x) + sx(t.C.x)) / 2, sy(g.topY) - 14, 'center', '#C81E4F');
      // legs (skip labels on the area step to keep it focused on bases + height)
      if (!S.areaShade) {
        const legLabel = (P, Q, txt) => {
          const mid = { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 };
          let ox = mid.x - centroid.x, oy = mid.y - centroid.y;
          const ol = Math.hypot(ox, oy) || 1;
          ox /= ol; oy /= ol;
          tag(txt, sx(mid.x) + ox * 15, sy(mid.y) - oy * 15, 'center', '#5B6B7B');
        };
        legLabel(V.D, V.A, `leg ${trim(g.legL)}`);
        legLabel(V.B, V.C, `leg ${trim(g.legR)}`);
      }
    }

    /* ---- equal-leg tick marks + right-angle marks on the types step -------- */
    if (S.typesStep && !g.degenerate) {
      // tick marks on the legs when the two legs are equal (isosceles)
      if (g.legsEqual) {
        const tickLeg = (P, Q) => {
          const mid = { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 };
          let dx = Q.x - P.x, dy = Q.y - P.y;
          const dl = Math.hypot(dx, dy) || 1;
          dx /= dl; dy /= dl;
          const nx = -dy, ny = dx; // normal
          const s = 0.32;
          ctx.save();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#C81E4F';
          ctx.beginPath();
          ctx.moveTo(sx(mid.x - nx * s), sy(mid.y - ny * s));
          ctx.lineTo(sx(mid.x + nx * s), sy(mid.y + ny * s));
          ctx.stroke();
          ctx.restore();
        };
        tickLeg(V.D, V.A);
        tickLeg(V.B, V.C);
      }
      // right-angle marks where a leg meets a base perpendicularly
      const rightMark = (corner, along, up) => {
        const m = 0.5;
        ctx.save();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(28,43,58,0.7)';
        ctx.beginPath();
        ctx.moveTo(sx(corner.x + along * m), sy(corner.y));
        ctx.lineTo(sx(corner.x + along * m), sy(corner.y + up * m));
        ctx.lineTo(sx(corner.x), sy(corner.y + up * m));
        ctx.stroke();
        ctx.restore();
      };
      if (Math.abs(t.D.x - t.A.x) < TOL) { // left leg vertical
        rightMark(V.A, 1, 1);
        rightMark(V.D, 1, -1);
      }
      if (Math.abs(t.B.x - t.C.x) < TOL) { // right leg vertical
        rightMark(V.B, -1, 1);
        rightMark(V.C, -1, -1);
      }
    }

    /* ---- parallel-arrow marks on the two bases (the defining feature) ------- */
    if (!g.degenerate && !S.calib) {
      const chevron = (mx, my, dir) => {
        // a single ">" mark pointing in +x, centred at (mx,my) in world coords
        const s = 0.34;
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(200,30,79,0.85)';
        ctx.beginPath();
        ctx.moveTo(sx(mx - dir * s), sy(my + s));
        ctx.lineTo(sx(mx + dir * s), sy(my));
        ctx.lineTo(sx(mx - dir * s), sy(my - s));
        ctx.stroke();
        ctx.restore();
      };
      chevron((t.A.x + t.B.x) / 2, g.bottomY, 1);
      chevron((t.D.x + t.C.x) / 2, g.topY, 1);
    }

    /* ---- the four sides — the one carmine accent --------------------------- */
    ctx.save();
    ctx.lineWidth = 2.75;
    ctx.strokeStyle = '#C81E4F';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(sx(t.A.x), sy(t.A.y));
    ctx.lineTo(sx(t.B.x), sy(t.B.y));
    ctx.lineTo(sx(t.C.x), sy(t.C.y));
    ctx.lineTo(sx(t.D.x), sy(t.D.y));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    /* ---- interior angle arcs + measures (base-angle step) ------------------ */
    if (S.showAngles && !g.degenerate && S.ar) {
      const drawAngle = (Vt, P, Q, label, tint) => {
        const cxp = sx(Vt.x), cyp = sy(Vt.y);
        const a1 = Math.atan2(sy(P.y) - cyp, sx(P.x) - cxp);
        const a2 = Math.atan2(sy(Q.y) - cyp, sx(Q.x) - cxp);
        let d = a2 - a1;
        while (d <= -Math.PI) d += 2 * Math.PI;
        while (d > Math.PI) d -= 2 * Math.PI; // short way = interior angle
        const R = 24;
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
        const bis = a1 + d / 2;
        tag(`${label}°`, cxp + Math.cos(bis) * (R + 15), cyp + Math.sin(bis) * (R + 15), 'center', '#1C2B3A');
      };
      // neighbours in the A→B→C→D cycle: A:(B,D) B:(C,A) C:(D,B) D:(A,C)
      drawAngle(V.A, V.B, V.D, S.ar.A, 'rgba(200,30,79,0.26)');
      drawAngle(V.D, V.A, V.C, S.ar.D, 'rgba(200,30,79,0.20)');
      drawAngle(V.B, V.C, V.A, S.ar.B, 'rgba(200,30,79,0.22)');
      drawAngle(V.C, V.D, V.B, S.ar.C, 'rgba(200,30,79,0.16)');
    }

    /* ---- the four corners, with letter labels ------------------------------ */
    const drawCorner = (P, letter, key) => {
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
      let ox = P.x - centroid.x, oy = P.y - centroid.y;
      const ol = Math.hypot(ox, oy) || 1;
      ox /= ol; oy /= ol;
      ctx.save();
      ctx.font = 'italic 15px "Iowan Old Style", Palatino, Georgia, serif';
      ctx.fillStyle = '#1C2B3A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, X + ox * 18, Y - oy * 18);
      ctx.restore();
    };
    drawCorner(V.A, 'A', 'A');
    drawCorner(V.B, 'B', 'B');
    drawCorner(V.C, 'C', 'C');
    drawCorner(V.D, 'D', 'D');

    /* ---- degenerate note --------------------------------------------------- */
    if (g.degenerate) {
      tag('flatten warning — give the shape a real height and two bases', W / 2, 20, 'center', '#C81E4F');
    }

    /* ---- the doubling / parallelogram proof inset (area step, opt-in) ------- */
    if (S.showProof && !g.degenerate) {
      drawDoublingProof(ctx, W, H, t, g, assembleRef.current, tag);
    }
  }, []);

  /* The area centerpiece: draw the "two trapezoids make a parallelogram" proof
     in an auto-fitting inset card at the bottom of the stage. A second copy of
     the trapezoid is rotated a half-turn about the midpoint of the right leg BC;
     at the end it slots in to form a parallelogram of base (b₁+b₂), height h. */
  function drawDoublingProof(ctx, W, H, t, g, assemble, tag) {
    const A = t.A, B = t.B, C = t.C, D = t.D;
    // final parallelogram vertices (A, D', A', D) in world coords
    const P0 = { x: A.x, y: g.bottomY };
    const P1 = { x: B.x + C.x - D.x, y: g.bottomY };
    const P2 = { x: B.x + C.x - A.x, y: g.topY };
    const P3 = { x: D.x, y: g.topY };
    const para = [P0, P1, P2, P3];

    // rotation of the copy about M = midpoint of BC
    const M = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };
    const theta = Math.PI * assemble;
    const rot = (P) => ({
      x: M.x + (P.x - M.x) * Math.cos(theta) - (P.y - M.y) * Math.sin(theta),
      y: M.y + (P.x - M.x) * Math.sin(theta) + (P.y - M.y) * Math.cos(theta),
    });
    const copy = [rot(A), rot(B), rot(C), rot(D)];

    // fit the parallelogram bbox (with padding) into a bottom card
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of para) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const padW = (maxX - minX) * 0.12 + 0.5;
    const padH = (maxY - minY) * 0.18 + 0.5;
    minX -= padW; maxX += padW; minY -= padH; maxY += padH;

    const cardW = Math.min(W - 24, 360);
    const cardH = 128;
    const cardX = (W - cardW) / 2;
    const cardY = H - cardH - 14;

    // backing card
    ctx.save();
    ctx.fillStyle = 'rgba(251,251,248,0.92)';
    roundRect(ctx, cardX, cardY, cardW, cardH, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(28,43,58,0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.clip(); // keep the sweeping copy inside the card
    ctx.restore();

    // an isotropic transform from proof-world into the card interior
    ctx.save();
    roundRect(ctx, cardX, cardY, cardW, cardH, 10);
    ctx.clip();
    const inX0 = cardX + 12, inY0 = cardY + 26, inW = cardW - 24, inH = cardH - 44;
    const scale = Math.min(inW / (maxX - minX), inH / (maxY - minY));
    const offX = inX0 + (inW - (maxX - minX) * scale) / 2;
    const offY = inY0 + (inH - (maxY - minY) * scale) / 2;
    const px = (x) => offX + (x - minX) * scale;
    const py = (y) => offY + (maxY - y) * scale; // flip y

    // parallelogram outline (forming) — dashed ink
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(px(para[0].x), py(para[0].y));
    for (let i = 1; i < para.length; i++) ctx.lineTo(px(para[i].x), py(para[i].y));
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // the original trapezoid — solid carmine
    const drawPoly = (poly, fill, stroke, lw) => {
      ctx.beginPath();
      ctx.moveTo(px(poly[0].x), py(poly[0].y));
      for (let i = 1; i < poly.length; i++) ctx.lineTo(px(poly[i].x), py(poly[i].y));
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
    };
    drawPoly([A, B, C, D], 'rgba(200,30,79,0.16)', '#C81E4F', 2);
    // the rotating copy — a lighter carmine so the two halves read as two trapezoids
    drawPoly(copy, 'rgba(200,30,79,0.09)', 'rgba(200,30,79,0.6)', 1.6);
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(200,30,79,0.5)'; // dash the shared leg where the copies meet
    ctx.beginPath();
    ctx.moveTo(px(B.x), py(B.y));
    ctx.lineTo(px(C.x), py(C.y));
    ctx.stroke();
    ctx.setLineDash([]);

    // labels once assembled
    const done = assemble > 0.995;
    ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#5B6B7B';
    ctx.fillText('two trapezoids → one parallelogram', cardX + cardW / 2, cardY + 16);
    if (done) {
      ctx.fillStyle = '#C81E4F';
      ctx.fillText(
        `½·(${trim(g.b1)}+${trim(g.b2)})·${trim(g.h)} = ${trim(g.areaFormula)}   (½ of base ${trim(g.b1 + g.b2)})`,
        cardX + cardW / 2, cardY + cardH - 8
      );
    }
    ctx.restore();
  }

  /* rounded-rect helper (used by the proof inset backing) */
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
  }, [tz, step, target, selected, showHeight, showMid, showProof, draw]);

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

  /* each step keeps one focus: entering a step resets the opt-in overlays so
     exactly the right one is showing — height on the anatomy & area steps, the
     midsegment on its step & the area step, the doubling proof on the area step. */
  useEffect(() => {
    const title = STEPS[step] && STEPS[step].title;
    setShowHeight(title === 'Bases, legs, and height' || title === 'Area = ½ · (b₁ + b₂) · h');
    setShowMid(title === 'The midsegment (median)' || title === 'Area = ½ · (b₁ + b₂) · h');
    setShowProof(title === 'Area = ½ · (b₁ + b₂) · h');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the "assemble" animation for the doubling proof — time-based, opt-in via the
     step/toggle, and instant when reduced motion is requested */
  useEffect(() => {
    const on = showProof || step === 5;
    if (!on) {
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
    const DURATION = 1700;
    assembleRef.current = 0;
    const loop = (now) => {
      if (start == null) start = now;
      const p = Math.min(1, (now - start) / DURATION);
      // ease-in-out for a physical settle
      assembleRef.current = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      draw();
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [showProof, step, draw]);

  /* ---- interaction: dragging the corners (keeping the bases horizontal) ---- */
  const worldFromEvent = (e) => {
    const rect = stageRef.current.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    return {
      x: WORLD.xmin + (cssX / rect.width) * (WORLD.xmax - WORLD.xmin),
      y: WORLD.ymax - (cssY / rect.height) * (WORLD.ymax - WORLD.ymin),
    };
  };
  const snap1 = (v) => Math.max(-BOUND, Math.min(BOUND, Math.round(v / GRID) * GRID));

  /* Apply a dragged/nudged corner while enforcing the trapezoid invariant:
     the two bottom corners share one y (the ground line), the two top corners
     share one y (the top line), left-of-right ordering holds on each base, and
     the height stays ≥ MINH. Returns the new corner set. */
  const moveCorner = (prev, key, world) => {
    let { A, B, C, D } = prev;
    A = { ...A }; B = { ...B }; C = { ...C }; D = { ...D };
    const nx = snap1(world.x), ny = snap1(world.y);
    if (key === 'A') {
      const by = Math.min(ny, C.y - MINH);           // bottom line stays below top line
      A.y = by; B.y = by;
      A.x = Math.min(nx, B.x - MINB);
    } else if (key === 'B') {
      const by = Math.min(ny, C.y - MINH);
      A.y = by; B.y = by;
      B.x = Math.max(nx, A.x + MINB);
    } else if (key === 'C') {
      const ty = Math.max(ny, A.y + MINH);           // top line stays above bottom line
      C.y = ty; D.y = ty;
      C.x = Math.max(nx, D.x + MINB);
    } else if (key === 'D') {
      const ty = Math.max(ny, A.y + MINH);
      C.y = ty; D.y = ty;
      D.x = Math.min(nx, C.x - MINB);
    }
    return { A, B, C, D };
  };

  const onPointerDown = (e) => {
    const w = worldFromEvent(e);
    let best = null, bestD = Infinity;
    for (const key of ['A', 'B', 'C', 'D']) {
      const d = dist(w, tz[key]);
      if (d < bestD) { bestD = d; best = key; }
    }
    if (bestD <= 1.1) {
      dragRef.current = best;
      setSelected(best);
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setTz((prev) => moveCorner(prev, best, w));
    }
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const w = worldFromEvent(e);
    const key = dragRef.current;
    setTz((prev) => moveCorner(prev, key, w));
  };
  const onPointerUp = (e) => {
    dragRef.current = null;
    e.currentTarget?.releasePointerCapture?.(e.pointerId);
  };

  /* keyboard: select a corner with A/B/C/D (or 1/2/3/4), nudge it with arrows */
  const onKeyDown = (e) => {
    const k = e.key.toLowerCase();
    const map = { a: 'A', b: 'B', c: 'C', d: 'D', 1: 'A', 2: 'B', 3: 'C', 4: 'D' };
    if (map[k]) { setSelected(map[k]); e.preventDefault(); return; }
    let dx = 0, dy = 0;
    if (e.key === 'ArrowLeft') dx = -GRID;
    else if (e.key === 'ArrowRight') dx = GRID;
    else if (e.key === 'ArrowUp') dy = GRID;
    else if (e.key === 'ArrowDown') dy = -GRID;
    else return;
    e.preventDefault();
    setTz((prev) => {
      const p = prev[selected];
      return moveCorner(prev, selected, { x: p.x + dx, y: p.y + dy });
    });
  };

  /* ---- misc handlers ----------------------------------------------------- */
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const resetTrapezoid = () => setTz(START);
  const applyPreset = (name) => setTz(PRESETS[name]);

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  // is the live shape a "proper" trapezoid (exactly one pair of parallel sides)?
  const isParallelogramFamily =
    !geo.degenerate && ['parallelogram', 'rectangle', 'square'].includes(geo.className);
  const badgeText = geo.degenerate ? 'degenerate' : geo.className;

  return (
    <div className="zlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Trapezoid</h1>
        <p className="lede">
          Drag the four corners and watch a trapezoid’s bases, legs, height, and midsegment respond —
          then discover the formula that falls out when you double it into a parallelogram:{' '}
          <span className="mono">A&nbsp;=&nbsp;½(b₁&nbsp;+&nbsp;b₂)·h</span>. Each step reveals one new
          idea, and it ends with a calibration challenge onto a mystery trapezoid.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation" aria-hidden="true">
              <span className="eq">
                A = ½·(b₁ + b₂)·h ={' '}
                {geo.degenerate ? (
                  <span>—</span>
                ) : (
                  <>
                    ½·({trim(geo.b1)} + {trim(geo.b2)})·{trim(geo.h)}{' = '}
                    <b>{trim(geo.areaFormula)}</b>
                  </>
                )}
              </span>
            </p>
            <p className="equation-sub mono">
              b₁={trim(geo.b1)}&nbsp;&nbsp;b₂={trim(geo.b2)}&nbsp;&nbsp;h={trim(geo.h)}&nbsp;&nbsp;m={trim(geo.mid)}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            tabIndex={0}
            role="application"
            aria-label={
              `Interactive trapezoid on a coordinate grid. Bottom base b1 = ${trim(geo.b1)}, ` +
              `top base b2 = ${trim(geo.b2)}, height = ${trim(geo.h)}, midsegment = ${trim(geo.mid)}, ` +
              `area = ${trim(geo.areaFormula)}. ` +
              `Drag a corner, or select A, B, C or D and use the arrow keys.`
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <canvas ref={canvasRef} />
            {!(showProof || areaStep) && (
              <span className="hint mono">drag a corner — or select A/B/C/D and use the arrow keys</span>
            )}
          </div>

          {/* corner selector — keyboard-accessible way to choose which corner to nudge */}
          <div className="vsel" role="group" aria-label="Select a corner to move with the arrow keys">
            <span className="vsel-lbl">Move:</span>
            {['A', 'B', 'C', 'D'].map((key) => (
              <button
                key={key}
                type="button"
                className={'vbtn' + (selected === key ? ' on' : '')}
                aria-pressed={selected === key}
                onClick={() => setSelected(key)}
              >
                {key} <span className="vco mono">{pt(tz[key])}</span>
              </button>
            ))}
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Bases</span>
              <span className="fact-v mono">b₁={trim(geo.b1)} · b₂={trim(geo.b2)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Legs</span>
              <span className="fact-v mono">
                {trim(geo.legL)} · {trim(geo.legR)}
                {geo.legsEqual && !geo.degenerate ? ' (equal)' : ''}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Height</span>
              <span className="fact-v mono">h = {trim(geo.h)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Midsegment</span>
              <span className="fact-v mono">½(b₁+b₂) = {trim(geo.mid)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Type</span>
              <span className="fact-v mono">
                {badgeText}
                {isParallelogramFamily ? '*' : ''}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Angle sum</span>
              <span className="fact-v mono">{geo.degenerate ? '—' : '360.0°'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Perimeter</span>
              <span className="fact-v mono">{geo.degenerate ? '—' : `≈ ${geo.perimeter.toFixed(2)}`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Area</span>
              <span className="fact-v mono accent">{geo.degenerate ? '—' : trim(geo.areaFormula)}</span>
            </div>
          </div>

          {isParallelogramFamily && (
            <p className="note mono">
              *{badgeText}: a trapezoid only under the inclusive definition (at least one pair of parallel sides).
            </p>
          )}

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + ((showHeight || step === 1 || areaStep) ? ' on' : '')}
              onClick={() => setShowHeight((s) => !s)}
            >
              {(showHeight || step === 1 || areaStep) ? 'Height shown' : 'Show height'}
            </button>
            <button
              type="button"
              className={'btn ghost' + ((showMid || step === 4 || areaStep) ? ' on' : '')}
              onClick={() => setShowMid((s) => !s)}
            >
              {(showMid || step === 4 || areaStep) ? 'Midsegment shown' : 'Show midsegment'}
            </button>
            <button
              type="button"
              className={'btn ghost' + ((showProof || areaStep) ? ' on' : '')}
              onClick={() => setShowProof((s) => !s)}
            >
              {(showProof || areaStep) ? 'Proof shown' : 'Double it'}
            </button>
            <button type="button" className="btn ghost" onClick={resetTrapezoid}>
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

          {/* type examples — only on the types step */}
          {step === 2 && (
            <div className="subctl">
              <span className="subctl-lbl">Examples:</span>
              {Object.keys(PRESETS).map((name) => (
                <button key={name} type="button" className="chip" onClick={() => applyPreset(name)}>
                  {name}
                </button>
              ))}
            </div>
          )}

          {/* base-angle readout — only on the angle step */}
          {step === 3 && !geo.degenerate && ar && (
            <div className="subctl">
              <span className="subctl-lbl">Legs:</span>
              <span className="subctl-note mono" style={{ marginLeft: 0 }}>
                ∠A + ∠D = {ar.A}° + {ar.D}° = <b>180.0°</b>
              </span>
              <span className="subctl-note mono">
                ∠B + ∠C = {ar.B}° + {ar.C}° = <b>180.0°</b>
              </span>
            </div>
          )}

          {/* midsegment readout — only on the midsegment step */}
          {step === 4 && !geo.degenerate && (
            <div className="subctl">
              <span className="subctl-lbl">Average:</span>
              <span className="subctl-note mono" style={{ marginLeft: 0 }}>
                m = ½·(b₁ + b₂) = ½·({trim(geo.b1)} + {trim(geo.b2)}) = <b>{trim(geo.mid)}</b>
              </span>
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
                {calibrated ? 'Calibrated. The trapezoids match.' : ''}
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
                  setShowHeight(false);
                  setShowMid(false);
                  setShowProof(false);
                  resetTrapezoid();
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">A = ½·(b₁ + b₂)·h</span> &nbsp;·&nbsp; two copies of any trapezoid tile a
        parallelogram of base b₁+b₂ and height h, so one is exactly half — holding live as you drag.
      </footer>

      <style jsx>{`
        .zlab {
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
        .note {
          font-size: 11.5px;
          color: var(--ink-soft);
          margin: 8px 4px 0;
          line-height: 1.5;
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
        .subctl-note b {
          color: var(--curve);
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
        :global(.zlab) :focus-visible {
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
