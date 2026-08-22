'use client';

/* ============================================================================
   ParallelogramLab — an interactive "bench" for the parallelogram: its two
   pairs of parallel sides, its equal opposite sides and angles, its supplementary
   neighbours, its bisecting diagonals, and the one symmetry that explains them
   all —

        a HALF-TURN about the centre M maps the parallelogram onto itself.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, a staged lesson that reveals
   one idea at a time, predict-then-check questions, and a calibration challenge
   with a live match meter.

   HOW THIS LAB EARNS ITS OWN PLACE (it is not the Area lab, nor the Quadrilateral
   lab, both of which also touch the parallelogram):
     • The Area lab uses a parallelogram to teach AREA = base × height by cutting
       and sliding unit squares. The Quadrilateral lab classifies ALL four-sided
       shapes and proves the 360° angle sum. THIS lab is about the parallelogram
       AS A SHAPE — the five properties that define it and the deep reason they
       are all true at once: its point (central) symmetry.

   Why the control is DIRECT MANIPULATION, and the twist that makes it a
   parallelogram lab:
     • A parallelogram is a shape you build from points, so — like the Triangle
       and Quadrilateral labs — you DRAG the corners rather than turn sliders.
     • BUT a parallelogram has only three free corners: once A, B and C are placed
       the fourth is forced, because opposite sides must stay parallel and equal.
       So you drag A, B, C and the lab computes

              D = A + C − B          (the parallelogram law)

       automatically. D follows as an open "forced" corner. You literally cannot
       break the parallelogram — and WHY the fourth corner is pinned is itself the
       first lesson.

   The centerpiece (the analogue of the ellipse "string" or the triangle's torn
   corners): the HALF-TURN. Rotate the whole shape 180° about its centre M and it
   lands exactly on itself — A ↔ C, B ↔ D. That single symmetry is the engine
   behind every property:
       • opposite sides map onto each other  ⇒  they are equal and parallel,
       • opposite angles map onto each other ⇒  they are equal,
       • each diagonal maps onto itself with its ends swapped ⇒ M is the midpoint
         of BOTH diagonals, i.e. the diagonals bisect each other.

   Correctness the lab is careful about (K-12 responsibility):
     • The forced fourth corner keeps the shape a TRUE parallelogram for every
       drag — no "almost parallel" rounding drift.
     • HEIGHT is the PERPENDICULAR distance between the two base lines, NOT the
       slanted side — the single most common area mistake. It is drawn as a dashed
       perpendicular with a right-angle marker, and the base line is extended so
       the foot of the perpendicular is always visible.
     • Consecutive (neighbouring) angles are SUPPLEMENTARY (sum 180°) because they
       are co-interior angles on the same transversal between parallel sides; the
       four still sum to 360°. Opposite angles are equal.
     • The family (rectangle ⊃/⊂ rhombus ⊃ square) is classified from true side
       and angle data: a right angle ⇒ rectangle, equal adjacent sides ⇒ rhombus,
       both ⇒ square. Diagonals are equal ONLY in a rectangle and perpendicular
       ONLY in a rhombus — but they ALWAYS bisect.

   Everything else — the state → model → render spine, DPI handling, predict-then-
   check gating (Next is gated on ANSWERED, not on CORRECT), and the RMS
   calibration meter — is the same machine as the rest of the lab library.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/ParallelogramLab.jsx
     2. Import and render it:
          import ParallelogramLab from './ParallelogramLab';
          export default function Page() { return <ParallelogramLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (A, B, C, step). D is
              DERIVED, never stored, so the parallelogram invariant can't drift.
     MODEL  — pure geometry (sides, angles, diagonals, area, class) — no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   World window & axes. A square window so x and y share one scale and angles
   are never sheared. Grid every 1 unit, labels every 2. The three free corners
   snap to a half-unit grid (crisp, and exact calibration matches are reachable)
   and stay inside a box; a move is only accepted if the FORCED corner D also
   lands inside, so the whole parallelogram is always on screen.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
const GRID = 0.5;
const BOUND = 9.5; // free corners A, B, C stay within ±BOUND
const DBOUND = 9.5; // the forced corner D must also stay within ±DBOUND

function plotFrame(width, height) {
  const inset = Math.min(12, width / 4, height / 4);
  return {
    bottom: height - inset,
    height: Math.max(1, height - inset * 2),
    left: inset,
    right: width - inset,
    top: inset,
    width: Math.max(1, width - inset * 2),
  };
}

/* The forced fourth corner. In a parallelogram ABCD the diagonals share a
   midpoint, so A + C = B + D, giving D = A + C − B. This keeps AB ∥ DC and
   AD ∥ BC with AB = DC and AD = BC — a perfect parallelogram, always. */
const forcedD = (A, B, C) => ({ x: A.x + C.x - B.x, y: A.y + C.y - B.y });

/* Starting parallelogram: a plainly OBLIQUE one (no right angle, not all sides
   equal) with a horizontal base, so a student's first sight is unmistakably a
   "leaning box" and not a rectangle. Corners go A → B → C (→ forced D)
   counter-clockwise. Base AB = 7, height = 6, area = 42. */
const START = { A: { x: -5, y: -3 }, B: { x: 2, y: -3 }, C: { x: 4, y: 3 } };

/* Canonical family examples (only the three free corners; D is forced). Each is
   an exact instance on the grid. */
const PRESETS = {
  Slanted: { A: { x: -5, y: -3 }, B: { x: 0, y: -3 }, C: { x: 3, y: 3 } }, // generic oblique
  Rectangle: { A: { x: -4, y: -2 }, B: { x: 4, y: -2 }, C: { x: 4, y: 2 } }, // right angles
  // rhombus: all sides 5, diagonals 6 and 8 (unequal ⇒ not a square)
  Rhombus: { A: { x: 0, y: -3 }, B: { x: 4, y: 0 }, C: { x: 0, y: 3 } },
  Square: { A: { x: -3, y: -3 }, B: { x: 3, y: -3 }, C: { x: 3, y: 3 } },
};

/* ---------------------------------------------------------------------------
   The lesson. One idea per step; the matching overlay turns on with the step;
   the reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the parallelogram',
    body:
      'A parallelogram is a four-sided shape whose opposite sides run parallel. Drag corner A, B, or ' +
      'C — with a mouse or your finger — or pick one below and nudge it with the arrow keys. Notice ' +
      'the fourth corner D: it is hollow because you don’t place it. The lab pins it to D = A + C − B ' +
      'so the sides stay parallel no matter how you drag. You cannot make it “not a parallelogram.”',
    q: 'Why does corner D move on its own when you drag the others?',
    choices: [
      'It is forced to the one spot that keeps both pairs of sides parallel',
      'It moves randomly to make the shape interesting',
      'It always stays exactly opposite the origin',
    ],
    answer: 0,
    feedback:
      'D is determined, not free. Three corners already fix a parallelogram, so the fourth has exactly ' +
      'one legal home — D = A + C − B — the point that keeps AB parallel to DC and AD parallel to BC. ' +
      'That “one free corner fewer” is what separates a parallelogram from a general quadrilateral.',
  },
  {
    title: 'Opposite sides are parallel',
    body:
      'This is the definition. The matching arrowheads show it: single chevrons mark AB ∥ DC, double ' +
      'chevrons mark AD ∥ BC. Parallel sides point the same way — side AB and side DC have the very ' +
      'same direction arrow. Drag a corner and watch both pairs stay parallel; that is the promise the ' +
      'forced corner keeps.',
    q: 'A parallelogram is defined by having…',
    choices: [
      'both pairs of opposite sides parallel',
      'exactly one pair of parallel sides',
      'four sides of equal length',
    ],
    answer: 0,
    feedback:
      'Both pairs. “Parallel-o-gram” literally means parallel lines. A shape with only ONE pair of ' +
      'parallel sides is a trapezoid; four equal sides makes a rhombus (a special parallelogram). The ' +
      'plain requirement here is simply: opposite sides parallel — both pairs.',
  },
  {
    title: 'Opposite sides are equal',
    body:
      'Parallel forces something more: the opposite sides are the SAME LENGTH. The tick marks say it — ' +
      'one tick on AB and DC (they are equal), two ticks on BC and DA (equal to each other). Drag any ' +
      'corner: AB and DC change together, and so do BC and DA. Two side lengths describe the whole ' +
      'shape.',
    q: 'In parallelogram ABCD, side AB measures 7. What is the length of the opposite side DC?',
    choices: ['7 — opposite sides are equal', 'It depends on the angle', 'Half of 7, so 3.5'],
    answer: 0,
    feedback:
      'Also 7. In a parallelogram opposite sides are always equal, so DC = AB and DA = BC. That is why ' +
      'the perimeter is just 2 × (AB + BC): you only ever have two different side lengths.',
  },
  {
    title: 'Angles: opposite equal, neighbours to 180°',
    body:
      'The angle arcs are on. Two things are always true. OPPOSITE angles are equal: ∠A = ∠C and ' +
      '∠B = ∠D. NEIGHBOURING angles are SUPPLEMENTARY — they add to 180° — because they sit on the ' +
      'same slanted line crossing the two parallel sides. All four still total 360°. Drag a corner and ' +
      'watch ∠A and ∠B trade off to keep ∠A + ∠B = 180°.',
    q: 'In a parallelogram, one angle is 70°. What is the angle NEXT to it?',
    choices: ['110°, because neighbours add to 180°', '70°, all angles are equal', '20°, they add to 90°'],
    answer: 0,
    feedback:
      '110°. Neighbouring angles are co-interior angles between the parallel sides, so they are ' +
      'supplementary: 70° + 110° = 180°. The angle OPPOSITE the 70° is another 70°, and the last one is ' +
      '110°, giving 70 + 110 + 70 + 110 = 360°.',
  },
  {
    title: 'The half-turn: one symmetry explains it all',
    body:
      'Here is the heart of the shape. Spin the whole parallelogram half a turn (180°) about its centre ' +
      'M and it lands exactly on itself: A swaps with C, B swaps with D. Press “Half-turn” to watch. ' +
      'This single symmetry is WHY opposite sides and angles are equal — and it forces each diagonal to ' +
      'cut the other in half at M. The equal tick marks show AM = MC and BM = MD.',
    q: 'Because a half-turn about M maps the parallelogram onto itself, the diagonals must…',
    choices: [
      'bisect each other — they cross at their common midpoint M',
      'always be equal in length',
      'always meet at right angles',
    ],
    answer: 0,
    feedback:
      'They bisect each other. The half-turn sends each diagonal onto itself with its endpoints ' +
      'swapped, so M is the midpoint of both — AM = MC and BM = MD. (Equal-length diagonals happen only ' +
      'in a rectangle; perpendicular ones only in a rhombus. Bisecting, though, is ALWAYS true.)',
  },
  {
    title: 'Area = base × height',
    body:
      'Pick a side as the BASE (b). The HEIGHT (h) is the perpendicular distance up to the opposite ' +
      'side — the dashed line with the little right-angle square — NOT the slanted side. The area is ' +
      'base × height. Slide the top corners sideways and the shape leans, but as long as the base and ' +
      'the perpendicular height stay the same, the area does not change.',
    q: 'A parallelogram has base 8 and slanted side 5, and its perpendicular height is 4. Its area is…',
    choices: ['32 — base × height = 8 × 4', '40 — base × slant side = 8 × 5', '20 — ½ × base × height'],
    answer: 0,
    feedback:
      '32 = 8 × 4. Area is base times the PERPENDICULAR height, never the slanted side (that 5 is a ' +
      'trap). And it is the full base × height — the “½” belongs to the triangle, which is half of a ' +
      'parallelogram.',
  },
  {
    title: 'The parallelogram family',
    body:
      'Special parallelograms are sorted by angles and sides. A RECTANGLE is a parallelogram with a ' +
      'right angle (so all four are right). A RHOMBUS has all four sides equal. A SQUARE is both at ' +
      'once. Try the examples — right angles get corner squares, equal sides get matching ticks — and ' +
      'watch the type readout.',
    q: 'Is every rectangle a parallelogram?',
    choices: [
      'Yes — a rectangle has both pairs of opposite sides parallel, plus right angles',
      'No — rectangles and parallelograms are unrelated shapes',
      'Only when the rectangle is also a square',
    ],
    answer: 0,
    feedback:
      'Yes. A rectangle keeps every parallelogram rule and adds right angles, so it sits INSIDE the ' +
      'parallelogram family. So does the rhombus (equal sides) and the square (both). Every rectangle, ' +
      'rhombus, and square is a parallelogram — but not the other way around.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery parallelogram is drawn as a dashed grey outline. Drag your three ' +
      'carmine corners — the forced corner D will follow — until your shape lands on the ghost and the ' +
      'meter reads CALIBRATED. The corner labels don’t have to match, only the shape and position. ' +
      'Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ============================================================================
   MODEL — pure geometry. No pixels. Single source of truth for every number
   the UI and the canvas display, so a label can never drift from the picture.
   Corners are kept in cyclic order A → B → C → D. Sides: AB, BC, CD, DA.
   ========================================================================== */
const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const d2 = (p, q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2; // squared length (exact on the grid)
const cross2 = (ax, ay, bx, by) => ax * by - ay * bx;
const dot2 = (ax, ay, bx, by) => ax * bx + ay * by;

/* Signed area of a polygon via the shoelace formula. |signed area| is the area. */
function signedArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    s += p.x * q.y - q.x * p.y;
  }
  return s / 2;
}

/* Interior angle at vertex V between the two sides meeting there, using the two
   edge vectors V→P and V→N. atan2(|cross|, dot) is stable near 0°/180° (unlike
   acos) and returns a value in (0°, 180°). A parallelogram is always convex, so
   every interior angle is below 180° and this is exactly the interior angle. */
function angleAt(V, P, N) {
  const ax = P.x - V.x, ay = P.y - V.y;
  const bx = N.x - V.x, by = N.y - V.y;
  return Math.atan2(Math.abs(cross2(ax, ay, bx, by)), dot2(ax, ay, bx, by)) * RAD2DEG;
}

const EQ2 = 1e-6; // squared-length equality tolerance (exact on the half-grid)
const PAR = 1e-6; // right-angle (dot ≈ 0) tolerance

/* Name the most specific family member. A parallelogram gains a name from a
   right angle (⇒ rectangle) and/or equal adjacent sides (⇒ rhombus); both give a
   square. Because opposite sides are already equal, "adjacent sides equal" means
   all four are equal. */
function classify(A, B, C, D, sides) {
  const rightA = Math.abs(dot2(B.x - A.x, B.y - A.y, D.x - A.x, D.y - A.y)) < PAR;
  const adjEqual = Math.abs(sides.AB2 - sides.BC2) < EQ2;
  if (rightA && adjEqual) return 'square';
  if (rightA) return 'rectangle';
  if (adjEqual) return 'rhombus';
  return 'parallelogram';
}

/* Everything the UI needs, computed once from the three free corners. */
function geometry(free) {
  const A = free.A, B = free.B, C = free.C;
  const D = forcedD(A, B, C);
  const poly = [A, B, C, D];
  const area = Math.abs(signedArea(poly)); // = |(B−A) × (D−A)|
  const sides = {
    AB: dist(A, B), BC: dist(B, C), CD: dist(C, D), DA: dist(D, A),
    AB2: d2(A, B), BC2: d2(B, C),
  };
  const tiny = Math.min(sides.AB, sides.BC) < 1e-9;
  const valid = area > 1e-6 && !tiny; // non-degenerate: the three corners aren't collinear

  const angA = valid ? angleAt(A, D, B) : 0; // between AD and AB
  const angB = valid ? angleAt(B, A, C) : 0; // between BA and BC
  // Opposite angles are exactly equal and neighbours exactly supplementary, so
  // we derive ∠C and ∠D from ∠A and ∠B rather than recomputing (keeps the
  // displayed identities ∠A=∠C, ∠B=∠D, ∠A+∠B=180 clean and exact).
  const angles = [angA, angB, angA, angB]; // [∠A, ∠B, ∠C, ∠D]

  const base = sides.AB;
  const height = valid ? area / base : 0; // perpendicular distance between AB and DC
  const M = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 }; // centre = common diagonal midpoint

  const AC = dist(A, C), BD = dist(B, D);
  const diagEqual = Math.abs(AC - BD) < 1e-6; // ⇔ rectangle
  const diagPerp = Math.abs(dot2(C.x - A.x, C.y - A.y, D.x - B.x, D.y - B.y)) < PAR; // ⇔ rhombus

  return {
    A, B, C, D, poly, valid,
    sides,
    angles,
    sum: angles[0] + angles[1] + angles[2] + angles[3], // = 360
    base, height,
    area,
    perimeter: 2 * (sides.AB + sides.BC),
    M,
    diag: { AC, BD, equal: diagEqual, perp: diagPerp },
    className: valid ? classify(A, B, C, D, sides) : '—',
  };
}

/* ---------------------------------------------------------------------------
   Calibration. A parallelogram is a CYCLIC sequence of corners, so "the same
   shape" may be drawn starting from a different corner or traced the other way.
   The match metric is the RMS vertex distance minimised over the 8 symmetries of
   a 4-cycle (the dihedral group D4: 4 rotations + 4 reflections), measured on all
   four corners INCLUDING the forced D. It is 0 exactly when the two
   parallelograms coincide, and targets sit on the grid, so an exact (RMS = 0)
   match is reachable by dragging only the three free corners.
   ------------------------------------------------------------------------- */
const DIHEDRAL = [
  [0, 1, 2, 3], [1, 2, 3, 0], [2, 3, 0, 1], [3, 0, 1, 2], // rotations
  [0, 3, 2, 1], [1, 0, 3, 2], [2, 1, 0, 3], [3, 2, 1, 0], // reflections
];
function rmsMatch(g, t) {
  const u = [g.A, g.B, g.C, g.D];
  const v = [t.A, t.B, t.C, t.D];
  let best = Infinity;
  for (const p of DIHEDRAL) {
    let s = 0;
    for (let i = 0; i < 4; i++) s += (u[i].x - v[p[i]].x) ** 2 + (u[i].y - v[p[i]].y) ** 2;
    best = Math.min(best, Math.sqrt(s / 4));
  }
  return best;
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 1.2)));
const MATCH_RMS = 0.03; // below this the two parallelograms are effectively identical -> CALIBRATED

/* Build a fresh mystery target: three free grid corners whose forced D also lands
   in the window, with a healthy area and sides, and not too close to the previous
   target or the starting shape. Returns a full {A,B,C,D} geometry-like object. */
function makeTarget(prev) {
  const snap = (v) => Math.round(v / GRID) * GRID;
  const rnd = (lim) => snap(-lim + Math.random() * 2 * lim);
  let guard = 0;
  while (guard++ < 600) {
    const A = { x: rnd(7), y: rnd(7) };
    const B = { x: rnd(7), y: rnd(7) };
    const C = { x: rnd(7), y: rnd(7) };
    const D = forcedD(A, B, C);
    if (Math.abs(D.x) > DBOUND || Math.abs(D.y) > DBOUND) continue;
    const g = geometry({ A, B, C });
    if (!g.valid || g.area < 16) continue;
    if (Math.min(g.sides.AB, g.sides.BC) < 1.8) continue;
    const t = { A, B, C, D };
    if (prev && rmsMatch(t, prev) < 1.2) continue;
    if (rmsMatch(t, { ...geometry(START) }) < 1.2) continue;
    return t;
  }
  // extremely unlikely fallback
  const A = { x: -4, y: -3 }, B = { x: 3, y: -3 }, C = { x: 5, y: 2 };
  return { A, B, C, D: forcedD(A, B, C) };
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

/* Sum-preserving display of the four angles: round each to one decimal but nudge
   (by at most 0.1°) so the four shown values ALWAYS total exactly 360.0°. */
function angleParts(vals) {
  const tenths = vals.map((v) => Math.round(v * 10));
  const diff = 3600 - tenths.reduce((a, b) => a + b, 0);
  if (diff !== 0) {
    const resid = vals.map((v, i) => v * 10 - tenths[i]);
    const order = vals.map((_, i) => i).sort((i, j) => (diff > 0 ? resid[j] - resid[i] : resid[i] - resid[j]));
    for (let j = 0; j < Math.abs(diff) && j < order.length; j++) tenths[order[j]] += diff > 0 ? 1 : -1;
  }
  return tenths.map((t) => (t / 10).toFixed(1));
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ParallelogramLab() {
  const [free, setFree] = useState(START); // the three free corners {A,B,C}
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [selected, setSelected] = useState('A'); // which corner the keyboard nudges
  const [halfTurn, setHalfTurn] = useState(false); // the 180° self-map animation
  const [showDiag, setShowDiag] = useState(false); // both diagonals overlay

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null); // key of the corner being dragged, or null
  const turnRef = useRef(1); // 0..1 progress of the half-turn animation
  const sceneRef = useRef({});

  const geo = geometry(free);
  const current = STEPS[step];
  const pa = geo.valid ? angleParts(geo.angles) : null; // sum-preserving angle strings

  // Which overlays are live at this step (progressive reveal, one per step).
  const defStep = step === 1; // parallel: chevrons
  const equalStep = step === 2; // equal sides: ticks + length labels
  const angleStep = step === 3; // angle arcs
  const symStep = step === 4; // half-turn + bisecting diagonals + M
  const areaStep = step === 5; // base × perpendicular height
  const familyStep = step === 6; // presets + ticks + chevrons + right-angle marks
  const calib = !!current.calib;

  const showChevrons = defStep || familyStep;
  const showTicks = equalStep || familyStep;
  const showSides = equalStep;
  const showAngles = angleStep;
  const diagOverlay = symStep || showDiag;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer/keyboard handlers never read stale values.
  sceneRef.current = {
    geo,
    calib,
    target,
    selected,
    showChevrons,
    showTicks,
    showSides,
    showAngles,
    symStep,
    areaStep,
    familyStep,
    halfTurn,
    diagOverlay,
    pa,
  };

  const rms = target ? rmsMatch(geo, target) : Infinity;
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

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Reserve a physical paint gutter around the mathematical window. At the
    // 320 px host viewport the Canvas is only ~166 px wide, so vertex halos,
    // angle strokes, and labels need real pixels beyond the world boundary.
    const frame = plotFrame(W, H);
    const plotLeft = frame.left;
    const plotTop = frame.top;
    const plotRight = frame.right;
    const plotBottom = frame.bottom;
    const plotWidth = frame.width;
    const plotHeight = frame.height;
    const sx = (x) => plotLeft + ((x - WORLD.xmin) / (WORLD.xmax - WORLD.xmin)) * plotWidth;
    const sy = (y) => plotTop + ((WORLD.ymax - y) / (WORLD.ymax - WORLD.ymin)) * plotHeight;

    const S = sceneRef.current;
    const g = S.geo;
    const V = { A: g.A, B: g.B, C: g.C, D: g.D };
    const poly = g.poly;
    const centroid = g.M; // the parallelogram's centre doubles as the label anchor

    ctx.clearRect(0, 0, W, H);

    /* minor grid (quadrille paper) */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.9)';
    ctx.beginPath();
    for (let gx = Math.ceil(WORLD.xmin); gx <= WORLD.xmax; gx++) {
      const X = Math.round(sx(gx)) + 0.5;
      ctx.moveTo(X, plotTop);
      ctx.lineTo(X, plotBottom);
    }
    for (let gy = Math.ceil(WORLD.ymin); gy <= WORLD.ymax; gy++) {
      const Y = Math.round(sy(gy)) + 0.5;
      ctx.moveTo(plotLeft, Y);
      ctx.lineTo(plotRight, Y);
    }
    ctx.stroke();

    /* axes */
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.beginPath();
    const axisInset = ctx.lineWidth / 2;
    ctx.moveTo(plotLeft + axisInset, Math.round(sy(0)) + 0.5);
    ctx.lineTo(plotRight - axisInset, Math.round(sy(0)) + 0.5);
    ctx.moveTo(Math.round(sx(0)) + 0.5, plotTop + axisInset);
    ctx.lineTo(Math.round(sx(0)) + 0.5, plotBottom - axisInset);
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
      const desiredBoxX = align === 'center' ? X - tw / 2 - 3 : align === 'left' ? X - 3 : X - tw - 3;
      const boxWidth = Math.min(Math.max(1, W - 2), tw + 6);
      const bx = Math.max(1, Math.min(W - boxWidth - 1, desiredBoxX));
      const safeY = Math.max(9, Math.min(H - 9, Y));
      ctx.fillStyle = 'rgba(251,251,248,0.9)';
      ctx.fillRect(bx, safeY - 8, boxWidth, 16);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(text, bx + 3, safeY, Math.max(1, W - bx - 4));
      ctx.restore();
    };

    const polyPath = (p) => {
      ctx.beginPath();
      ctx.moveTo(sx(p[0].x), sy(p[0].y));
      for (let i = 1; i < p.length; i++) ctx.lineTo(sx(p[i].x), sy(p[i].y));
      ctx.closePath();
    };

    /* ---- target ghost (calibration only), dashed grey, under the accent ---- */
    if (S.calib && S.target) {
      const t = S.target;
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(91,107,123,0.85)';
      ctx.setLineDash([7, 6]);
      ctx.lineJoin = 'round';
      polyPath([t.A, t.B, t.C, t.D]);
      ctx.stroke();
      ctx.restore();
    }

    /* ---- area step: base × perpendicular height --------------------------- */
    if (S.areaStep && g.valid) {
      // the base is side AB; the height is the perpendicular from D down to the
      // line through A and B. Extend that base line faintly so the foot is always
      // visible (it can sit beyond the segment on a strongly sheared shape).
      const ux = V.B.x - V.A.x, uy = V.B.y - V.A.y;
      const uLen2 = ux * ux + uy * uy || 1;
      const tD = ((V.D.x - V.A.x) * ux + (V.D.y - V.A.y) * uy) / uLen2;
      const F = { x: V.A.x + tD * ux, y: V.A.y + tD * uy }; // foot of perpendicular from D

      // faint extended base line
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.28)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      const ext = 1.6;
      ctx.beginPath();
      ctx.rect(plotLeft, plotTop, plotWidth, plotHeight);
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(sx(V.A.x - ux * ext), sy(V.A.y - uy * ext));
      ctx.lineTo(sx(V.B.x + ux * ext), sy(V.B.y + uy * ext));
      ctx.stroke();
      ctx.restore();

      // the height: dashed perpendicular D → F
      ctx.save();
      ctx.strokeStyle = '#2D5F8C';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(sx(V.D.x), sy(V.D.y));
      ctx.lineTo(sx(F.x), sy(F.y));
      ctx.stroke();
      ctx.restore();

      // right-angle marker at the foot F, oriented along base (u) and height (F→D)
      let uxs = sx(V.A.x + ux) - sx(V.A.x), uys = sy(V.A.y + uy) - sy(V.A.y);
      const ul = Math.hypot(uxs, uys) || 1; uxs /= ul; uys /= ul;
      let hxs = sx(V.D.x) - sx(F.x), hys = sy(V.D.y) - sy(F.y);
      const hl = Math.hypot(hxs, hys) || 1; hxs /= hl; hys /= hl;
      const m = 10, Fx = sx(F.x), Fy = sy(F.y);
      ctx.save();
      ctx.strokeStyle = 'rgba(45,95,140,0.9)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(Fx + uxs * m, Fy + uys * m);
      ctx.lineTo(Fx + uxs * m + hxs * m, Fy + uys * m + hys * m);
      ctx.lineTo(Fx + hxs * m, Fy + hys * m);
      ctx.stroke();
      ctx.restore();

      // labels: b on the base, h on the height
      const baseMid = { x: (V.A.x + V.B.x) / 2, y: (V.A.y + V.B.y) / 2 };
      tag(`b = ${trim(g.base)}`, sx(baseMid.x), sy(baseMid.y) + 14, 'center', '#C81E4F');
      const hMid = { x: (V.D.x + F.x) / 2, y: (V.D.y + F.y) / 2 };
      tag(`h = ${trim(g.height)}`, sx(hMid.x) - 4, sy(hMid.y), 'right', '#2D5F8C');
    }

    /* ---- half-turn ghost: the parallelogram rotating 180° about M ---------- */
    if (S.halfTurn && !S.calib && g.valid) {
      const theta = Math.PI * turnRef.current; // 0 → π
      const cth = Math.cos(theta), sth = Math.sin(theta);
      const rot = (p) => {
        const dx = p.x - g.M.x, dy = p.y - g.M.y;
        return { x: g.M.x + dx * cth - dy * sth, y: g.M.y + dx * sth + dy * cth };
      };
      const ghost = poly.map(rot);
      ctx.save();
      polyPath(ghost);
      ctx.fillStyle = 'rgba(200,30,79,0.10)';
      ctx.fill();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = 'rgba(200,30,79,0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      // trace arcs showing A→C and B→D swapping (quarter opacity guide)
      const arc = (p) => {
        const dx = p.x - g.M.x, dy = p.y - g.M.y;
        const r = Math.hypot(dx, dy);
        const a0 = Math.atan2(dy, dx);
        ctx.save();
        ctx.strokeStyle = 'rgba(28,43,58,0.18)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) {
          const a = a0 + theta * (i / 24);
          const X = sx(g.M.x + r * Math.cos(a)), Y = sy(g.M.y + r * Math.sin(a));
          if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        }
        ctx.stroke();
        ctx.restore();
      };
      arc(V.A);
      arc(V.B);
    }

    /* ---- both diagonals, their crossing M, and the "bisect" ticks ---------- */
    if (S.diagOverlay && g.valid) {
      const d = g.diag;
      ctx.save();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(28,43,58,0.62)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(sx(V.A.x), sy(V.A.y));
      ctx.lineTo(sx(V.C.x), sy(V.C.y));
      ctx.moveTo(sx(V.B.x), sy(V.B.y));
      ctx.lineTo(sx(V.D.x), sy(V.D.y));
      ctx.stroke();
      ctx.restore();

      // on the diagonals step, mark the equal halves: AM = MC (one tick),
      // BM = MD (two ticks), and a right-angle square if they're perpendicular.
      if (S.symStep) {
        drawTicks(ctx, sx, sy, V.A, g.M, 1);
        drawTicks(ctx, sx, sy, g.M, V.C, 1);
        drawTicks(ctx, sx, sy, V.B, g.M, 2);
        drawTicks(ctx, sx, sy, g.M, V.D, 2);
      }
      const MX = sx(g.M.x), MY = sy(g.M.y);
      if (d.perp && S.symStep) {
        ctx.save();
        ctx.strokeStyle = 'rgba(28,43,58,0.55)';
        ctx.lineWidth = 1.3;
        const mm = 9;
        let ax = V.C.x - V.A.x, ay = V.C.y - V.A.y;
        const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al;
        let bx = V.D.x - V.B.x, by = V.D.y - V.B.y;
        const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
        const sax = sx(g.M.x + ax) - MX, say = sy(g.M.y + ay) - MY;
        const sbx = sx(g.M.x + bx) - MX, sby = sy(g.M.y + by) - MY;
        const nax = Math.hypot(sax, say) || 1, nbx = Math.hypot(sbx, sby) || 1;
        const P0 = { x: MX + (sax / nax) * mm, y: MY + (say / nax) * mm };
        const P1 = { x: P0.x + (sbx / nbx) * mm, y: P0.y + (sby / nbx) * mm };
        const P2 = { x: MX + (sbx / nbx) * mm, y: MY + (sby / nbx) * mm };
        ctx.beginPath();
        ctx.moveTo(P0.x, P0.y);
        ctx.lineTo(P1.x, P1.y);
        ctx.lineTo(P2.x, P2.y);
        ctx.stroke();
        ctx.restore();
      }
      // centre dot + label
      ctx.beginPath();
      ctx.arc(MX, MY, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = '#1C2B3A';
      ctx.fill();
      if (S.symStep) tag('M', MX + 12, MY - 10, 'center', '#1C2B3A');
      // diagonal length labels on the diagonals-only toggle (kept off the busy sym step)
      if (!S.symStep) {
        const midAC = { x: (V.A.x + V.C.x) / 2, y: (V.A.y + V.C.y) / 2 };
        const midBD = { x: (V.B.x + V.D.x) / 2, y: (V.B.y + V.D.y) / 2 };
        tag(`AC = ${trim(d.AC)}`, sx(midAC.x), sy(midAC.y) - 12, 'center', '#1C2B3A');
        tag(`BD = ${trim(d.BD)}`, sx(midBD.x), sy(midBD.y) + 12, 'center', '#1C2B3A');
      }
    }

    /* ---- faint body wash -------------------------------------------------- */
    ctx.save();
    polyPath(poly);
    ctx.fillStyle = 'rgba(200,30,79,0.05)';
    ctx.fill();
    ctx.restore();

    /* ---- the four sides — the one carmine accent -------------------------- */
    ctx.save();
    ctx.lineWidth = 2.75;
    ctx.strokeStyle = '#C81E4F';
    ctx.lineJoin = 'round';
    polyPath(poly);
    ctx.stroke();
    ctx.restore();

    /* ---- equal-side ticks (equal-sides & family steps) -------------------- */
    if (S.showTicks && g.valid) {
      drawTicks(ctx, sx, sy, V.A, V.B, 1);
      drawTicks(ctx, sx, sy, V.C, V.D, 1);
      drawTicks(ctx, sx, sy, V.B, V.C, 2);
      drawTicks(ctx, sx, sy, V.D, V.A, 2);
    }

    /* ---- parallel chevrons (definition & family steps) -------------------- */
    if (S.showChevrons && g.valid) {
      drawChevron(ctx, sx, sy, V.A, V.B, 1);
      drawChevron(ctx, sx, sy, V.D, V.C, 1);
      drawChevron(ctx, sx, sy, V.B, V.C, 2);
      drawChevron(ctx, sx, sy, V.A, V.D, 2);
    }

    /* ---- right-angle corner marks on the family step (rectangle/square) ---- */
    if (S.familyStep && g.valid && Math.abs(dot2(V.B.x - V.A.x, V.B.y - V.A.y, V.D.x - V.A.x, V.D.y - V.A.y)) < PAR) {
      drawRightAngle(ctx, sx, sy, V.A, V.B, V.D);
      drawRightAngle(ctx, sx, sy, V.B, V.C, V.A);
      drawRightAngle(ctx, sx, sy, V.C, V.D, V.B);
      drawRightAngle(ctx, sx, sy, V.D, V.A, V.C);
    }

    /* ---- side length labels (equal-sides step) ---------------------------- */
    if (S.showSides && g.valid) {
      const sideLabel = (P, Q, letter, len) => {
        const mid = { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 };
        let ox = mid.x - centroid.x, oy = mid.y - centroid.y;
        const ol = Math.hypot(ox, oy) || 1;
        ox /= ol; oy /= ol;
        tag(`${letter} = ${trim(len)}`, sx(mid.x) + ox * 16, sy(mid.y) - oy * 16, 'center', '#5B6B7B');
      };
      sideLabel(V.A, V.B, 'AB', g.sides.AB);
      sideLabel(V.B, V.C, 'BC', g.sides.BC);
      sideLabel(V.C, V.D, 'CD', g.sides.CD);
      sideLabel(V.D, V.A, 'DA', g.sides.DA);
    }

    /* ---- interior angle arcs + measures ----------------------------------- */
    if (S.showAngles && g.valid && S.pa) {
      const drawAngle = (Vt, P, N, measure, label, tint) => {
        const cxp = sx(Vt.x), cyp = sy(Vt.y);
        const aP = Math.atan2(sy(P.y) - cyp, sx(P.x) - cxp);
        const aN = Math.atan2(sy(N.y) - cyp, sx(N.x) - cxp);
        const mRad = measure * DEG2RAD;
        const norm = (a) => {
          while (a > Math.PI) a -= 2 * Math.PI;
          while (a <= -Math.PI) a += 2 * Math.PI;
          return a;
        };
        const sigma = Math.abs(norm(aP + mRad - aN)) <= Math.abs(norm(aP - mRad - aN)) ? 1 : -1;
        const R = 26;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cxp, cyp);
        const NS = 40;
        for (let i = 0; i <= NS; i++) {
          const ang = aP + sigma * mRad * (i / NS);
          ctx.lineTo(cxp + R * Math.cos(ang), cyp + R * Math.sin(ang));
        }
        ctx.closePath();
        ctx.fillStyle = tint;
        ctx.fill();
        ctx.strokeStyle = '#C81E4F';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
        const bis = aP + (sigma * mRad) / 2;
        tag(`${label}°`, cxp + Math.cos(bis) * (R + 15), cyp + Math.sin(bis) * (R + 15), 'center', '#1C2B3A');
      };
      // opposite angles share a tint so ∠A/∠C and ∠B/∠D read as pairs
      drawAngle(V.A, V.D, V.B, g.angles[0], S.pa[0], 'rgba(200,30,79,0.22)');
      drawAngle(V.C, V.B, V.D, g.angles[2], S.pa[2], 'rgba(200,30,79,0.22)');
      drawAngle(V.B, V.A, V.C, g.angles[1], S.pa[1], 'rgba(45,95,140,0.18)');
      drawAngle(V.D, V.C, V.A, g.angles[3], S.pa[3], 'rgba(45,95,140,0.18)');
    }

    /* ---- the corners: A, B, C solid (draggable); D open (forced) ---------- */
    const drawFree = (P, letter, key) => {
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
      cornerLabel(letter, P);
    };
    const cornerLabel = (letter, P) => {
      const X = sx(P.x), Y = sy(P.y);
      let ox = P.x - centroid.x, oy = P.y - centroid.y;
      const ol = Math.hypot(ox, oy) || 1;
      ox /= ol; oy /= ol;
      ctx.save();
      ctx.font = 'italic 15px "Iowan Old Style", Palatino, Georgia, serif';
      ctx.fillStyle = '#1C2B3A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const desiredX = X + ox * 20;
      const desiredY = Y - oy * 20;
      const labelWidth = ctx.measureText(letter).width;
      const safeX = Math.max(4 + labelWidth / 2, Math.min(W - 4 - labelWidth / 2, desiredX));
      const safeY = Math.max(12, Math.min(H - 12, desiredY));
      ctx.fillText(letter, safeX, safeY);
      ctx.restore();
    };
    drawFree(V.A, 'A', 'A');
    drawFree(V.B, 'B', 'B');
    drawFree(V.C, 'C', 'C');
    // D — the forced corner: an open ring, so it clearly "follows"
    {
      const X = sx(V.D.x), Y = sy(V.D.y);
      ctx.beginPath();
      ctx.arc(X, Y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#FBFBF8';
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#C81E4F';
      ctx.stroke();
      cornerLabel('D', V.D);
    }

    /* ---- degenerate note -------------------------------------------------- */
    if (!g.valid) {
      tag('the three corners are (nearly) in a line — spread them out', W / 2, 20, 'center', '#C81E4F');
    }
  }, []);

  /* small perpendicular tick marks at a segment's midpoint (equal-length notation) */
  function drawTicks(ctx, sx, sy, P, Q, n) {
    const mid = { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 };
    let dx = Q.x - P.x, dy = Q.y - P.y;
    const L = Math.hypot(dx, dy) || 1;
    dx /= L; dy /= L;
    const nx = -dy, ny = dx;
    const mx = sx(mid.x), my = sy(mid.y);
    let sdx = sx(mid.x + dx) - sx(mid.x), sdy = sy(mid.y + dy) - sy(mid.y);
    const sl = Math.hypot(sdx, sdy) || 1; sdx /= sl; sdy /= sl;
    let snx = sx(mid.x + nx) - sx(mid.x), sny = sy(mid.y + ny) - sy(mid.y);
    const snl = Math.hypot(snx, sny) || 1; snx /= snl; sny /= snl;
    ctx.save();
    ctx.strokeStyle = '#C81E4F';
    ctx.lineWidth = 2;
    const gap = 4, half = 6;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * gap;
      const cx = mx + sdx * off, cy = my + sdy * off;
      ctx.beginPath();
      ctx.moveTo(cx - snx * half, cy - sny * half);
      ctx.lineTo(cx + snx * half, cy + sny * half);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* chevron arrow(s) at a side's midpoint, pointing along the side (parallel notation) */
  function drawChevron(ctx, sx, sy, P, Q, n) {
    const mid = { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 };
    const mx = sx(mid.x), my = sy(mid.y);
    let sdx = sx(Q.x) - sx(P.x), sdy = sy(Q.y) - sy(P.y);
    const sl = Math.hypot(sdx, sdy) || 1; sdx /= sl; sdy /= sl;
    const px = -sdy, py = sdx;
    ctx.save();
    ctx.strokeStyle = '#2D5F8C';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    const size = 5, gap = 5;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * gap;
      const cx = mx + sdx * off, cy = my + sdy * off;
      const tip = { x: cx + sdx * size, y: cy + sdy * size };
      ctx.beginPath();
      ctx.moveTo(tip.x - sdx * size + px * size, tip.y - sdy * size + py * size);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(tip.x - sdx * size - px * size, tip.y - sdy * size - py * size);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* a small right-angle square at vertex V, between rays V→P and V→Q */
  function drawRightAngle(ctx, sx, sy, Vv, P, Q) {
    const VX = sx(Vv.x), VY = sy(Vv.y);
    let ux = sx(P.x) - VX, uy = sy(P.y) - VY;
    const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
    let wx = sx(Q.x) - VX, wy = sy(Q.y) - VY;
    const wl = Math.hypot(wx, wy) || 1; wx /= wl; wy /= wl;
    const m = 9;
    ctx.save();
    ctx.strokeStyle = 'rgba(28,43,58,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(VX + ux * m, VY + uy * m);
    ctx.lineTo(VX + ux * m + wx * m, VY + uy * m + wy * m);
    ctx.lineTo(VX + wx * m, VY + wy * m);
    ctx.stroke();
    ctx.restore();
  }

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [free, step, target, selected, halfTurn, showDiag, draw]);

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

  /* each step keeps one focus: entering the half-turn step turns the animation on
     and the diagonals on; leaving turns them off. (The toolbar toggles still let a
     student replay either within a step.) */
  useEffect(() => {
    const title = STEPS[step] && STEPS[step].title;
    setHalfTurn(title === 'The half-turn: one symmetry explains it all');
    setShowDiag(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the half-turn animation — time-based, opt-in via the toggle/step, and instant
     when reduced motion is requested. It sweeps 0 → 1 (i.e. 0° → 180°) and rests. */
  useEffect(() => {
    if (!halfTurn) {
      turnRef.current = 1;
      draw();
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      turnRef.current = 1;
      draw();
      return;
    }
    let raf;
    let start = null;
    const DURATION = 1900;
    turnRef.current = 0;
    const loop = (now) => {
      if (start == null) start = now;
      const p = Math.min(1, (now - start) / DURATION);
      turnRef.current = p;
      draw();
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [halfTurn, draw]);

  /* ---- interaction: dragging the three free corners ---------------------- */
  const worldFromEvent = (e) => {
    const rect = stageRef.current.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const frame = plotFrame(rect.width, rect.height);
    return {
      x: WORLD.xmin + ((cssX - frame.left) / frame.width) * (WORLD.xmax - WORLD.xmin),
      y: WORLD.ymax - ((cssY - frame.top) / frame.height) * (WORLD.ymax - WORLD.ymin),
    };
  };
  const snap = (p) => ({
    x: Math.max(-BOUND, Math.min(BOUND, Math.round(p.x / GRID) * GRID)),
    y: Math.max(-BOUND, Math.min(BOUND, Math.round(p.y / GRID) * GRID)),
  });

  /* Apply a proposed position for one free corner ONLY if the forced corner D
     stays inside the window — so the whole parallelogram is always on screen. */
  const tryUpdate = (prev, key, p) => {
    const next = { ...prev, [key]: p };
    const D = forcedD(next.A, next.B, next.C);
    if (Math.abs(D.x) > DBOUND || Math.abs(D.y) > DBOUND) return prev;
    return next;
  };

  const onPointerDown = (e) => {
    const w = worldFromEvent(e);
    let best = null;
    let bestD = Infinity;
    for (const key of ['A', 'B', 'C']) {
      const d = dist(w, free[key]);
      if (d < bestD) { bestD = d; best = key; }
    }
    if (bestD <= 1.1) {
      dragRef.current = best;
      setSelected(best);
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setFree((prev) => tryUpdate(prev, best, snap(w)));
    }
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const w = worldFromEvent(e);
    const key = dragRef.current;
    setFree((prev) => tryUpdate(prev, key, snap(w)));
  };
  const onPointerUp = (e) => {
    dragRef.current = null;
    e.currentTarget?.releasePointerCapture?.(e.pointerId);
  };

  /* keyboard: select a corner with 1/2/3 (or A/B/C), nudge it with arrows */
  const onKeyDown = (e) => {
    const k = e.key.toLowerCase();
    const map = { '1': 'A', a: 'A', '2': 'B', b: 'B', '3': 'C', c: 'C' };
    if (map[k]) { setSelected(map[k]); e.preventDefault(); return; }
    let dx = 0, dy = 0;
    if (e.key === 'ArrowLeft') dx = -GRID;
    else if (e.key === 'ArrowRight') dx = GRID;
    else if (e.key === 'ArrowUp') dy = GRID;
    else if (e.key === 'ArrowDown') dy = -GRID;
    else return;
    e.preventDefault();
    setFree((prev) => {
      const p = prev[selected];
      return tryUpdate(prev, selected, snap({ x: p.x + dx, y: p.y + dy }));
    });
  };

  /* ---- misc handlers ----------------------------------------------------- */
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const resetShape = () => setFree(START);
  const applyPreset = (name) => setFree(PRESETS[name]);

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const alphaStr = geo.valid ? geo.angles[0].toFixed(1) : '—'; // ∠A = ∠C
  const betaStr = geo.valid ? geo.angles[1].toFixed(1) : '—'; // ∠B = ∠D

  const dg = geo.diag;
  const diagNote = !geo.valid
    ? '—'
    : ['bisect', dg.equal ? 'equal' : null, dg.perp ? 'perpendicular' : null].filter(Boolean).join(' · ');

  /* adaptive equation head — the step's key relationship, always live */
  const renderHead = () => {
    if (!geo.valid) return <span className="eq">spread the three corners out to form a parallelogram</span>;
    switch (step) {
      case 1:
        return (
          <span className="eq">
            AB ∥ DC&nbsp;&nbsp;and&nbsp;&nbsp;AD ∥ BC&nbsp;&nbsp;<b>both pairs parallel</b>
          </span>
        );
      case 2:
        return (
          <span className="eq">
            AB = CD = <b>{trim(geo.sides.AB)}</b>&nbsp;&nbsp;·&nbsp;&nbsp;BC = DA = <b>{trim(geo.sides.BC)}</b>
          </span>
        );
      case 3:
        return (
          <span className="eq">
            ∠A = ∠C = {alphaStr}°&nbsp;·&nbsp;∠B = ∠D = {betaStr}°&nbsp;·&nbsp;<b>∠A + ∠B = 180°</b>
          </span>
        );
      case 4:
        return (
          <span className="eq">
            AM = MC&nbsp;·&nbsp;BM = MD&nbsp;&nbsp;<b>the diagonals bisect at M</b>
          </span>
        );
      case 5:
        return (
          <span className="eq">
            Area = b × h = {trim(geo.base)} × {trim(geo.height)} = <b>{trim(geo.area)}</b>
          </span>
        );
      case 6:
        return (
          <span className="eq">
            this is a <b>{geo.className}</b>
          </span>
        );
      case 7:
        return <span className="eq">match the mystery parallelogram — the ghost outline</span>;
      default:
        return (
          <span className="eq">
            <b>ABCD</b> is a parallelogram · opposite sides parallel
          </span>
        );
    }
  };

  return (
    <div className="plab">
      <header className="head">
        <h1>The Parallelogram</h1>
        <p className="lede">
          Drag three corners — the fourth is forced, so the shape is always a true parallelogram — and
          meet its five properties and the one idea behind them all:{' '}
          <span className="mono">a half-turn about the centre&nbsp;M maps it onto itself</span>. That
          symmetry makes opposite sides and angles equal and the diagonals bisect. Each step reveals one
          idea, ending in a calibration challenge onto a mystery shape.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation" aria-hidden="true">
              {renderHead()}
            </p>
            <p className="equation-sub mono">
              A&nbsp;{pt(geo.A)}&nbsp; B&nbsp;{pt(geo.B)}&nbsp; C&nbsp;{pt(geo.C)}&nbsp; D&nbsp;{pt(geo.D)}
              &nbsp;⟵ forced
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            tabIndex={0}
            role="application"
            aria-label={
              `Interactive parallelogram on a coordinate grid. Free corners A ${pt(geo.A)}, B ${pt(geo.B)}, ` +
              `C ${pt(geo.C)}; forced corner D ${pt(geo.D)}. ` +
              (!geo.valid
                ? 'The three free corners are nearly in a line. '
                : `A ${geo.className}. Angles ${pa[0]} and ${pa[1]} degrees repeat on opposite corners, ` +
                  `summing to 360 degrees. Base ${trim(geo.base)}, height ${trim(geo.height)}, area ${trim(geo.area)}. `) +
              `Drag a corner, or select A, B or C and use the arrow keys.`
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">drag A, B or C — D follows · or select a corner and use the arrows</span>
          </div>

          {/* corner selector — keyboard-accessible way to choose which corner to nudge */}
          <div className="vsel" role="group" aria-label="Select a corner to move with the arrow keys">
            <span className="vsel-lbl">Move:</span>
            {['A', 'B', 'C'].map((key) => (
              <button
                key={key}
                type="button"
                className={'vbtn' + (selected === key ? ' on' : '')}
                aria-pressed={selected === key}
                onClick={() => setSelected(key)}
              >
                {key} <span className="vco mono">{pt(geo[key])}</span>
              </button>
            ))}
            <span className="vco mono forced-chip">D {pt(geo.D)} · forced</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Sides</span>
              <span className="fact-v mono">
                AB=CD={trim(geo.sides.AB)} · BC=DA={trim(geo.sides.BC)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Angles</span>
              <span className="fact-v mono">
                {geo.valid ? `${pa[0]}° · ${pa[1]}° · ${pa[2]}° · ${pa[3]}°` : '—'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Opposite angles</span>
              <span className="fact-v mono">{geo.valid ? `∠A=∠C · ∠B=∠D` : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Type</span>
              <span className="fact-v mono accent">{geo.className}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Diagonals</span>
              <span className="fact-v mono">
                {geo.valid ? `AC=${trim(dg.AC)} · BD=${trim(dg.BD)}` : '—'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Diagonals</span>
              <span className="fact-v mono">{diagNote}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Base × height</span>
              <span className="fact-v mono">
                {geo.valid ? `${trim(geo.base)} × ${trim(geo.height)}` : '—'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Area</span>
              <span className="fact-v mono accent">{geo.valid ? `${trim(geo.area)}` : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Perimeter</span>
              <span className="fact-v mono">{geo.valid ? `${trim(geo.perimeter)}` : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Centre M</span>
              <span className="fact-v mono">{geo.valid ? pt(geo.M) : '—'}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (halfTurn ? ' on' : '')}
              onClick={() => setHalfTurn((s) => !s)}
            >
              {halfTurn ? 'Half-turn on' : 'Half-turn about M'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (diagOverlay ? ' on' : '')}
              onClick={() => setShowDiag((s) => !s)}
            >
              {diagOverlay ? 'Diagonals shown' : 'Show diagonals'}
            </button>
            <button type="button" className="btn ghost" onClick={resetShape}>
              Reset shape
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

          {/* family step: the special-parallelogram presets */}
          {familyStep && (
            <div className="subctl">
              <span className="subctl-lbl">Examples:</span>
              {Object.keys(PRESETS).map((name) => (
                <button key={name} type="button" className="chip" onClick={() => applyPreset(name)}>
                  {name}
                </button>
              ))}
              <span className="subctl-note mono">now: {geo.className}</span>
            </div>
          )}

          {/* half-turn step: a replay button right where the eye is */}
          {symStep && (
            <div className="subctl">
              <span className="subctl-lbl">Watch:</span>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setHalfTurn(false);
                  requestAnimationFrame(() => setHalfTurn(true));
                }}
              >
                ▶ Replay half-turn
              </button>
              <span className="subctl-note mono">A↔C · B↔D</span>
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
                {calibrated ? 'Calibrated. The parallelograms match.' : ''}
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
                  setHalfTurn(false);
                  setShowDiag(false);
                  resetShape();
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">D = A + C − B</span> &nbsp;·&nbsp; three corners fix a parallelogram and a
        half-turn about the centre M maps it onto itself — so opposite sides and angles are equal and the
        diagonals bisect, holding live as you drag on a 20×20 quadrille window.
      </footer>

      <style jsx>{`
        .plab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #2d5f8c;
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
          font-size: 14.5px;
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
        .forced-chip {
          padding: 6px 9px;
          border: 1px dashed rgba(200, 30, 79, 0.5);
          border-radius: 8px;
          color: var(--curve);
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
        :global(.plab) :focus-visible {
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
