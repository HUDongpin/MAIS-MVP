'use client';

/* ============================================================================
   QuadrilateralLab — an interactive "bench" for the quadrilateral: its four
   vertices, four sides, four angles, its two diagonals, the family of special
   quadrilaterals, and the theorem that ties every one of them together,

        ∠A  +  ∠B  +  ∠C  +  ∠D  =  360°

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, a staged lesson that reveals
   one idea at a time, predict-then-check questions, and a calibration challenge
   with a live match meter.

   Why this bench adapts the y = f(x) / dial template, and how it stays faithful:
     • A quadrilateral is a SHAPE you build from four points, not a curve driven
       by a handful of parameters. So the natural control is DIRECT MANIPULATION
       — you drag the corners A, B, C, D (pointer or keyboard) — exactly as the
       Triangle lab does. This is the same principled adaptation the conic and
       3-D labs made when a plain slider/plot no longer fit the object.
     • "One dial unlocks per lesson step" becomes "one OVERLAY reveals per step":
       sides → angles → the 360° angle-sum → diagonals → the family → area. Each
       step turns on exactly one new layer of the SAME quadrilateral, so the
       student still meets one idea at a time.
     • The quadrilateral's defining beauty — the analogue of the ellipse "string"
       or the triangle's torn corners — is that ONE DIAGONAL cuts any
       quadrilateral into TWO TRIANGLES. Since each triangle's angles sum to
       180° (the previous lab!), the quadrilateral's four angles must sum to
       2 · 180° = 360°. The centerpiece makes that visible: it draws the interior
       diagonal, tints the two triangles, and assembles the four corners into a
       full 360° turn. This lab deliberately builds on the Triangle lab — a
       quadrilateral is "two triangles glued along an edge."

   Correctness the lab is careful about (K-12 responsibility):
     • CONCAVE quadrilaterals. A simple quadrilateral can be convex or concave;
       a concave one has exactly one REFLEX interior angle (> 180°). The angle
       sum is still 360°. Interior angles are computed with the polygon's signed
       orientation so the reflex corner reads (say) 253°, not 107°.
     • SELF-INTERSECTING ("crossed"/bowtie) quadrilaterals are detected and
       flagged — their angle sum is NOT 360°, so the lab refuses to claim it.
     • The FAMILY hierarchy (parallelogram ⊃ rectangle/rhombus ⊃ square, plus
       trapezoid and kite) is classified from the true side/parallel/angle data,
       and the two rival definitions of "trapezoid" (US inclusive vs. exclusive)
       are named honestly rather than hidden.
     • The DIAGONAL used to split the shape is chosen to lie INSIDE the polygon
       (for a concave quad only one diagonal is interior), so the two triangles
       always tile the quadrilateral exactly.

   Everything else — the state→model→render spine, DPI handling, predict-then-
   check gating (Next is gated on ANSWERED, not on CORRECT), and the RMS
   calibration meter — is the same machine as the rest of the lab library.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/QuadrilateralLab.jsx
     2. Import and render it:
          import QuadrilateralLab from './QuadrilateralLab';
          export default function Page() { return <QuadrilateralLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (A, B, C, D, step).
     MODEL  — pure geometry (angles, sides, diagonals, area, class) — no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   World window & axes. A square window so x and y share one scale and angles
   are never sheared. Grid every 1 unit, labels every 2. Vertices snap to a
   half-unit grid (crisp, and exact calibration matches are reachable) and stay
   inside a slightly smaller box so labels and handles never clip the edge.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
const GRID = 0.5;
const BOUND = 9.5;

/* Starting quadrilateral: a plain irregular CONVEX quadrilateral, well inside
   the window. Deliberately NOT special (no equal sides, no parallel sides, no
   right angle) so the first thing a student sees isn't a square or a kite. The
   corners are listed in order A → B → C → D going counter-clockwise. */
const START = {
  A: { x: -5, y: -3 },
  B: { x: 4, y: -4 },
  C: { x: 5, y: 3 },
  D: { x: -3, y: 4 },
};

/* Canonical examples for the classification step — each an exact instance of a
   named type, on the grid. Vertices are given in order A → B → C → D. */
const PRESETS = {
  Square: { A: { x: -3, y: -3 }, B: { x: 3, y: -3 }, C: { x: 3, y: 3 }, D: { x: -3, y: 3 } },
  Rectangle: { A: { x: -4, y: -2 }, B: { x: 4, y: -2 }, C: { x: 4, y: 2 }, D: { x: -4, y: 2 } },
  // rhombus: all sides 5, diagonals 6 and 8 (unequal ⇒ not a square)
  Rhombus: { A: { x: 0, y: -3 }, B: { x: 4, y: 0 }, C: { x: 0, y: 3 }, D: { x: -4, y: 0 } },
  // parallelogram: opposite sides equal & parallel, but not all equal, no right angle
  Parallelogram: { A: { x: -4, y: -2 }, B: { x: 2, y: -2 }, C: { x: 4, y: 2 }, D: { x: -2, y: 2 } },
  // trapezoid: exactly one pair of parallel sides (AB ∥ DC), isosceles
  Trapezoid: { A: { x: -5, y: -3 }, B: { x: 5, y: -3 }, C: { x: 3, y: 3 }, D: { x: -3, y: 3 } },
  // kite: two pairs of ADJACENT equal sides (DA=AB=5, BC=CD=√34), axis AC
  Kite: { A: { x: 0, y: -4 }, B: { x: 3, y: 0 }, C: { x: 0, y: 5 }, D: { x: -3, y: 0 } },
};

/* A clearly CONCAVE quadrilateral (an "arrowhead"/dart) for the intro step, so
   the reflex-angle case is one click away. Reflex interior angle at B. */
const CONCAVE = { A: { x: -4, y: 4 }, B: { x: -1, y: 1 }, C: { x: 4, y: 4 }, D: { x: 0, y: -4 } };

/* ---------------------------------------------------------------------------
   The lesson. One idea per step; the matching overlay turns on with the step;
   the reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the quadrilateral',
    body:
      'A quadrilateral is any closed shape with four straight sides and four corners (vertices). ' +
      'Grab a corner and drag it — on a touchscreen or with a mouse — or pick a vertex below and ' +
      'nudge it with the arrow keys. A quadrilateral is CONVEX if no corner is pushed inward, and ' +
      'CONCAVE if one corner caves in past 180°. Try the “Concave example” button to see one.',
    q: 'How many sides and how many vertices does a quadrilateral have?',
    choices: ['Four sides and four vertices', 'Four sides and three vertices', 'Three sides and four vertices'],
    answer: 0,
    feedback:
      'Four of each. “Quad” means four — four sides and, where they meet, four vertices (and four ' +
      'angles inside). A quadrilateral is the next polygon up from the triangle, and as you’ll see, ' +
      'it behaves like two triangles stuck together.',
  },
  {
    title: 'Vertices and sides',
    body:
      'The corners are named A, B, C, D going around the shape, and the four sides are AB, BC, CD, ' +
      'and DA. Sides that share a corner are ADJACENT (like AB and BC); sides that don’t are ' +
      'OPPOSITE (AB and CD are opposite, so are BC and DA). The side lengths are switched on now.',
    q: 'Which side is OPPOSITE side AB?',
    choices: ['Side CD', 'Side BC', 'Side DA'],
    answer: 0,
    feedback:
      'Side CD — opposite sides never touch. Whether opposite pairs are parallel ' +
      'or equal is what sorts the families later.',
  },
  {
    title: 'The four angles',
    body:
      'Every corner holds an interior angle: ∠A opens between sides DA and AB, and so on. The angle ' +
      'arcs are drawn now with their measures. Drag a corner — if you push it inward far enough, its ' +
      'angle passes 180° and becomes a REFLEX angle (that corner caves in and the shape is concave).',
    q: 'You drag corner C straight inward until it dents the shape. What happens to angle ∠C?',
    choices: [
      'It grows past 180° — a reflex angle',
      'It shrinks toward 0°',
      'It locks at exactly 90°',
    ],
    answer: 0,
    feedback:
      'It becomes reflex — past 180°, still measured on the INSIDE. A concave ' +
      'quadrilateral has exactly one reflex corner.',
  },
  {
    title: 'The angle sum is 360°',
    body:
      'Here is the heart of it. Draw ONE diagonal and the quadrilateral splits into TWO triangles. ' +
      'Each triangle’s angles add to 180° (from the last lab), so the quadrilateral’s four angles ' +
      'must add to 2 × 180° = 360°. The corners also pack together to fill one full turn. Drag any ' +
      'corner: the four measures change, but the sum below is glued to 360°.',
    q: 'Three angles of a quadrilateral are 80°, 100°, and 90°. What is the fourth angle?',
    choices: ['90°', '80°', '100°'],
    answer: 0,
    feedback:
      '90°, because the four must total 360°: 360 − 80 − 100 − 90 = 90. Splitting into two triangles ' +
      'is the proof — 180° + 180° = 360° — and it works for every simple quadrilateral, convex or ' +
      'concave. (A “crossed” quadrilateral that cuts through itself is the one exception.)',
  },
  {
    title: 'The two diagonals',
    body:
      'A diagonal joins two opposite corners, so a quadrilateral has exactly two: AC and BD. They’re ' +
      'drawn now, with the point where they cross. The diagonals are the fingerprint of the family — ' +
      'in some shapes they’re equal, in some they cross at right angles, in some they cut each other ' +
      'exactly in half. Drag the corners and watch the readouts below.',
    q: 'How many diagonals does a quadrilateral have?',
    choices: ['Two', 'One', 'Four'],
    answer: 0,
    feedback:
      'Two — AC and BD, each joining a pair of opposite corners. (A triangle has none; every corner ' +
      'is already joined to every other by a side.) Whether these two diagonals are equal, ' +
      'perpendicular, or bisect each other is what tells a rhombus from a rectangle from a kite.',
  },
  {
    title: 'The quadrilateral family',
    body:
      'Special quadrilaterals are sorted by their sides, angles, and diagonals. A PARALLELOGRAM has ' +
      'both pairs of opposite sides parallel; a RECTANGLE is a parallelogram with right angles; a ' +
      'RHOMBUS is one with all sides equal; a SQUARE is both. A KITE has two pairs of adjacent equal ' +
      'sides. A TRAPEZOID has a pair of parallel sides. Try the examples — equal sides get tick ' +
      'marks and parallel sides get arrows.',
    q: 'Is every square also a rectangle?',
    choices: [
      'Yes — a square meets every rule for a rectangle, plus more',
      'No — a square and a rectangle are completely separate shapes',
      'No — rectangles must have unequal sides',
    ],
    answer: 0,
    feedback:
      'Yes. A square is a rectangle (four right angles) AND a rhombus (four equal sides) at once, so ' +
      'it sits inside both. The families nest: every square is a rectangle, every rectangle a ' +
      'parallelogram, and — under the inclusive US definition — every parallelogram a trapezoid.',
  },
  {
    title: 'Area = two triangles',
    body:
      'The same diagonal that proved the 360° rule also gives the area: the diagonal cuts the ' +
      'quadrilateral into two triangles, and the area is just their two areas added together. Each ' +
      'triangle’s area is ½ · base · height. Drag the corners — the two shaded triangles always sum ' +
      'to the whole quadrilateral’s area.',
    q: 'Why does splitting the quadrilateral into two triangles give its exact area?',
    choices: [
      'The two triangles fill the shape with no gaps or overlaps',
      'Triangles always have more area than quadrilaterals',
      'It only works if the quadrilateral is a rectangle',
    ],
    answer: 0,
    feedback:
      'Because the diagonal tiles the quadrilateral perfectly — the two triangles cover every point ' +
      'inside exactly once. Add their areas and you get the whole. Any polygon can be broken into ' +
      'triangles this way, which is how areas of complicated shapes are found.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery quadrilateral is drawn as a dashed grey outline. Drag your four ' +
      'carmine corners onto it — the labels don’t have to match, only the shape and position — until ' +
      'the meter reads CALIBRATED. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ============================================================================
   MODEL — pure geometry. No pixels. Single source of truth for every number
   the UI and the canvas display, so a label can never drift from the picture.
   Vertices are always kept in cyclic order A → B → C → D. Sides: AB, BC, CD, DA.
   ========================================================================== */
const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const d2 = (p, q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2; // squared length (exact on the grid)
const cross2 = (ax, ay, bx, by) => ax * by - ay * bx;
const dot2 = (ax, ay, bx, by) => ax * bx + ay * by;

/* Signed area of a polygon via the shoelace formula. Positive = the vertices
   wind counter-clockwise, negative = clockwise. |signed area| is the area. */
function signedArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    s += p.x * q.y - q.x * p.y;
  }
  return s / 2;
}

/* Proper intersection test / point for two segments p1p2 and p3p4. Returns the
   parameters (t along p1p2, u along p3p4) and the crossing point, or null if
   the segments are parallel. Used for self-intersection and diagonal crossing. */
function segMeet(p1, p2, p3, p4) {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const denom = cross2(d1x, d1y, d2x, d2y);
  if (Math.abs(denom) < 1e-12) return null;
  const t = cross2(p3.x - p1.x, p3.y - p1.y, d2x, d2y) / denom;
  const u = cross2(p3.x - p1.x, p3.y - p1.y, d1x, d1y) / denom;
  return { t, u, pt: { x: p1.x + t * d1x, y: p1.y + t * d1y } };
}

/* A quadrilateral is "self-intersecting" (a crossed/bowtie shape) when a pair of
   NON-adjacent sides cross in their interiors: AB×CD or BC×DA. For such shapes
   the interior-angle idea breaks down and the sum is NOT 360°, so we flag it. */
function selfIntersecting(poly) {
  const [A, B, C, D] = poly;
  const proper = (p1, p2, p3, p4) => {
    const m = segMeet(p1, p2, p3, p4);
    return !!m && m.t > 1e-9 && m.t < 1 - 1e-9 && m.u > 1e-9 && m.u < 1 - 1e-9;
  };
  return proper(A, B, C, D) || proper(B, C, D, A);
}

/* Interior angles of a SIMPLE polygon, in degrees, in vertex order — with full
   support for reflex (> 180°) corners. Method: use the polygon's orientation.
   At each vertex the signed turn (exterior angle) is atan2(cross, dot) of the
   incoming and outgoing edges; the interior angle is π − s·turn, where s = ±1
   is the winding sign. This gives (0°, 360°): convex corners < 180°, the reflex
   corner of a concave polygon > 180°, and the four always sum to exactly 360°. */
function interiorAngles(poly) {
  const s = Math.sign(signedArea(poly)) || 1;
  const n = poly.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const P = poly[(i - 1 + n) % n];
    const V = poly[i];
    const N = poly[(i + 1) % n];
    const inx = V.x - P.x, iny = V.y - P.y; // incoming edge P→V
    const outx = N.x - V.x, outy = N.y - V.y; // outgoing edge V→N
    const turn = Math.atan2(cross2(inx, iny, outx, outy), dot2(inx, iny, outx, outy));
    out.push((Math.PI - s * turn) * RAD2DEG);
  }
  return out; // [∠A, ∠B, ∠C, ∠D]
}

/* Which diagonal (AC or BD) lies INSIDE the quadrilateral. For a convex quad
   both do; for a concave quad only the one from the reflex corner does. Test:
   diagonal AC is interior iff B and D sit on opposite sides of line AC. Using
   the interior diagonal guarantees the two triangles tile the shape exactly. */
function sideSign(P, Q, X) {
  return Math.sign(cross2(Q.x - P.x, Q.y - P.y, X.x - P.x, X.y - P.y));
}
function interiorDiagonal(poly) {
  const [A, B, C, D] = poly;
  const acInterior = sideSign(A, C, B) * sideSign(A, C, D) < 0;
  return acInterior ? 'AC' : 'BD';
}

const EQ2 = 1e-6; // squared-length equality tolerance (exact on the half-grid)
const PAR = 1e-6; // parallel / perpendicular cross-or-dot tolerance

/* Name the most specific family member. Precedence: square ▸ rectangle ▸
   rhombus ▸ parallelogram ▸ kite ▸ trapezoid ▸ (general) quadrilateral. */
function classify(poly, angles) {
  const [A, B, C, D] = poly;
  const sAB = d2(A, B), sBC = d2(B, C), sCD = d2(C, D), sDA = d2(D, A);
  const eq = (x, y) => Math.abs(x - y) < EQ2;
  // opposite-side parallelism (direction-agnostic cross product ≈ 0)
  const parAB_CD = Math.abs(cross2(B.x - A.x, B.y - A.y, D.x - C.x, D.y - C.y)) < PAR;
  const parBC_DA = Math.abs(cross2(C.x - B.x, C.y - B.y, A.x - D.x, A.y - D.y)) < PAR;
  // a right angle at A (⇒ all right, once it's a parallelogram)
  const rightA = Math.abs(dot2(B.x - A.x, B.y - A.y, D.x - A.x, D.y - A.y)) < PAR;
  const reflex = angles.some((a) => a > 180 + 1e-6);

  let name;
  if (parAB_CD && parBC_DA) {
    const allEqual = eq(sAB, sBC) && eq(sBC, sCD) && eq(sCD, sDA);
    if (allEqual && rightA) name = 'square';
    else if (rightA) name = 'rectangle';
    else if (allEqual) name = 'rhombus';
    else name = 'parallelogram';
  } else {
    const kite = (eq(sAB, sBC) && eq(sCD, sDA)) || (eq(sBC, sCD) && eq(sDA, sAB));
    if (kite) name = reflex ? 'dart (concave kite)' : 'kite';
    else if (parAB_CD || parBC_DA) name = 'trapezoid';
    else name = 'quadrilateral';
  }
  return { name, parAB_CD, parBC_DA };
}

/* Diagonal facts: lengths, whether they are equal / perpendicular / bisect each
   other, and their crossing point (as a line–line intersection). */
function diagonals(poly) {
  const [A, B, C, D] = poly;
  const AC = dist(A, C), BD = dist(B, D);
  const equal = Math.abs(AC - BD) < 1e-6;
  const perp = Math.abs(dot2(C.x - A.x, C.y - A.y, D.x - B.x, D.y - B.y)) < PAR;
  const midAC = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
  const midBD = { x: (B.x + D.x) / 2, y: (B.y + D.y) / 2 };
  const bisect = dist(midAC, midBD) < 1e-6;
  const meet = segMeet(A, C, B, D);
  const crossPt = meet ? meet.pt : midAC;
  const crossInside = meet ? meet.t > -1e-9 && meet.t < 1 + 1e-9 && meet.u > -1e-9 && meet.u < 1 + 1e-9 : false;
  return { AC, BD, equal, perp, bisect, crossPt, crossInside };
}

/* Everything the UI needs, computed once from the four vertices. */
function geometry(quad) {
  const poly = [quad.A, quad.B, quad.C, quad.D];
  const area = Math.abs(signedArea(poly));
  const sides = { AB: dist(quad.A, quad.B), BC: dist(quad.B, quad.C), CD: dist(quad.C, quad.D), DA: dist(quad.D, quad.A) };
  const tiny = Math.min(sides.AB, sides.BC, sides.CD, sides.DA) < 1e-9;
  // Self-intersection is tested BEFORE degeneracy: a *symmetric* bowtie has zero
  // shoelace area (its two loops cancel), so an area test alone would wrongly
  // call it "collinear" rather than "crossed". Crossing takes precedence.
  const complex = selfIntersecting(poly);
  const degenerate = !complex && (area < 1e-6 || tiny);
  const valid = !complex && !degenerate; // a simple (non-crossing) quadrilateral

  const angles = valid ? interiorAngles(poly) : [0, 0, 0, 0];
  const reflex = valid && angles.some((a) => a > 180 + 1e-6);
  const cls = valid ? classify(poly, angles) : { name: complex ? 'crossed' : '—', parAB_CD: false, parBC_DA: false };

  return {
    poly,
    sides,
    angles, // [A,B,C,D]
    sum: angles[0] + angles[1] + angles[2] + angles[3], // = 360 for any simple quad
    perimeter: sides.AB + sides.BC + sides.CD + sides.DA,
    area,
    degenerate,
    complex,
    valid,
    convexity: !valid ? '—' : reflex ? 'concave' : 'convex',
    className: cls.name,
    parallels: { AB_CD: cls.parAB_CD, BC_DA: cls.parBC_DA },
    diag: diagonals(poly),
    splitDiag: valid ? interiorDiagonal(poly) : 'AC',
  };
}

/* ---------------------------------------------------------------------------
   Calibration. A quadrilateral is a CYCLIC sequence of corners, so "the same
   shape" may be drawn starting from a different corner or traced the other way.
   The match metric is therefore the RMS vertex distance minimised over the 8
   symmetries of a 4-cycle (the dihedral group D4: 4 rotations + 4 reflections)
   — NOT all 24 permutations, because scrambling the order into a different
   edge-set is a genuinely different (crossed) quadrilateral and must not match.
   It is 0 exactly when the two quadrilaterals coincide, and targets sit on the
   grid, so an exact (RMS = 0) match is reachable.
   ------------------------------------------------------------------------- */
const DIHEDRAL = [
  [0, 1, 2, 3], [1, 2, 3, 0], [2, 3, 0, 1], [3, 0, 1, 2], // rotations
  [0, 3, 2, 1], [1, 0, 3, 2], [2, 1, 0, 3], [3, 2, 1, 0], // reflections
];
function rmsMatch(quad, target) {
  const u = [quad.A, quad.B, quad.C, quad.D];
  const v = [target.A, target.B, target.C, target.D];
  let best = Infinity;
  for (const p of DIHEDRAL) {
    let s = 0;
    for (let i = 0; i < 4; i++) {
      s += (u[i].x - v[p[i]].x) ** 2 + (u[i].y - v[p[i]].y) ** 2;
    }
    best = Math.min(best, Math.sqrt(s / 4));
  }
  return best;
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 1.2)));
const MATCH_RMS = 0.03; // below this the two quadrilaterals are effectively identical -> CALIBRATED

/* Build a fresh mystery target: four grid points ordered into a SIMPLE (non-
   crossing) quadrilateral by sorting around their centroid, with a healthy area
   and not too close to the previous target or the starting shape. */
function makeTarget(prev) {
  const snap = (v) => Math.round(v / GRID) * GRID;
  const rnd = () => snap(-7 + Math.random() * 14);
  let guard = 0;
  while (guard++ < 400) {
    const pts = [];
    for (let i = 0; i < 4; i++) pts.push({ x: rnd(), y: rnd() });
    const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
    const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;
    pts.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
    const t = { A: pts[0], B: pts[1], C: pts[2], D: pts[3] };
    const g = geometry(t);
    if (!g.valid || g.area < 14) continue;
    if (Math.min(g.sides.AB, g.sides.BC, g.sides.CD, g.sides.DA) < 1.5) continue;
    if (prev && rmsMatch(t, prev) < 1.0) continue;
    if (rmsMatch(t, START) < 1.0) continue;
    return t;
  }
  // extremely unlikely fallback
  return { A: { x: -4, y: -3 }, B: { x: 4, y: -3 }, C: { x: 3, y: 3 }, D: { x: -4, y: 2 } };
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
   (by at most 0.1°) so the four shown values ALWAYS total exactly 360.0°.
   Without this, four independently-rounded parts can read "90.1 + 90.1 + 89.9 +
   89.9 = 360.0" — visibly not adding up — which would undermine the one theorem
   this whole lab is about. Returns four "xx.x" strings that sum to 360.0. */
function angleParts(vals) {
  const tenths = vals.map((v) => Math.round(v * 10));
  const diff = 3600 - tenths.reduce((a, b) => a + b, 0); // ∈ {−2..2}
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
export default function QuadrilateralLab() {
  const [quad, setQuad] = useState(START);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [selected, setSelected] = useState('A'); // which vertex the keyboard nudges
  const [assemble, setAssemble] = useState(false); // the "corners fill 360°" inset
  const [showDiag, setShowDiag] = useState(false); // both diagonals overlay

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null); // key of the vertex being dragged, or null
  const assembleRef = useRef(1); // 0..1 progress of the assemble animation
  const sceneRef = useRef({});

  const geo = geometry(quad);
  const current = STEPS[step];
  const pa = geo.valid ? angleParts(geo.angles) : null; // sum-preserving angle strings

  // Which overlays are live at this step (progressive reveal, one per step).
  const showSides = step >= 1 && step !== 3 && step !== 4 && step !== 6 && !current.calib;
  const showAngles = step === 2 || step === 3;
  const splitStep = step === 3; // angle-sum: interior diagonal + two triangles + assemble
  const diagStep = step === 4; // both diagonals
  const familyStep = step === 5; // tick marks + parallel arrows + presets
  const areaStep = step === 6; // interior diagonal split shaded, area = A1 + A2
  const splitOverlay = splitStep || areaStep;
  const diagOverlay = diagStep || showDiag;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer/keyboard handlers never read stale values.
  sceneRef.current = {
    quad,
    calib: !!current.calib,
    target,
    selected,
    showSides,
    showAngles,
    splitOverlay,
    splitStep,
    areaStep,
    diagOverlay,
    familyStep,
    assemble,
    geo,
    pa,
  };

  const rms = target ? rmsMatch(quad, target) : Infinity;
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

    const sx = (x) => ((x - WORLD.xmin) / (WORLD.xmax - WORLD.xmin)) * W;
    const sy = (y) => ((WORLD.ymax - y) / (WORLD.ymax - WORLD.ymin)) * H;

    const S = sceneRef.current;
    const q = S.quad;
    const g = S.geo;
    const V = { A: q.A, B: q.B, C: q.C, D: q.D };
    const poly = [V.A, V.B, V.C, V.D];
    const centroid = {
      x: (V.A.x + V.B.x + V.C.x + V.D.x) / 4,
      y: (V.A.y + V.B.y + V.C.y + V.D.y) / 4,
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

    /* ---- interior-diagonal split: two shaded triangles (angle-sum & area) --- */
    if (S.splitOverlay && g.valid) {
      const diag = g.splitDiag; // 'AC' or 'BD'
      let tri1, tri2, p1, p2; // the two triangles and the diagonal endpoints
      if (diag === 'AC') {
        tri1 = [V.A, V.B, V.C];
        tri2 = [V.A, V.C, V.D];
        p1 = V.A; p2 = V.C;
      } else {
        tri1 = [V.B, V.C, V.D];
        tri2 = [V.B, V.D, V.A];
        p1 = V.B; p2 = V.D;
      }
      const areaTri = (t) =>
        Math.abs(
          (t[1].x - t[0].x) * (t[2].y - t[0].y) - (t[2].x - t[0].x) * (t[1].y - t[0].y)
        ) / 2;

      ctx.save();
      polyPath(tri1);
      ctx.fillStyle = 'rgba(200,30,79,0.16)';
      ctx.fill();
      polyPath(tri2);
      ctx.fillStyle = 'rgba(45,95,140,0.14)';
      ctx.fill();
      ctx.restore();

      // the diagonal itself, a dashed ink line
      ctx.save();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(28,43,58,0.7)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(sx(p1.x), sy(p1.y));
      ctx.lineTo(sx(p2.x), sy(p2.y));
      ctx.stroke();
      ctx.restore();

      // centroids of each triangle for labels
      const cen = (t) => ({ x: (t[0].x + t[1].x + t[2].x) / 3, y: (t[0].y + t[1].y + t[2].y) / 3 });
      const c1 = cen(tri1), c2 = cen(tri2);
      if (S.areaStep) {
        tag(`△ = ${areaTri(tri1).toFixed(2)}`, sx(c1.x), sy(c1.y), 'center', '#C81E4F');
        tag(`△ = ${areaTri(tri2).toFixed(2)}`, sx(c2.x), sy(c2.y), 'center', '#2D5F8C');
      } else {
        tag('180°', sx(c1.x), sy(c1.y), 'center', '#C81E4F');
        tag('180°', sx(c2.x), sy(c2.y), 'center', '#2D5F8C');
      }
    }

    /* ---- both diagonals overlay (diagonals step / toggle) ------------------ */
    if (S.diagOverlay && !S.splitOverlay && g.valid) {
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

      // crossing point + a right-angle marker if the diagonals are perpendicular
      if (d.crossInside) {
        const X = sx(d.crossPt.x), Y = sy(d.crossPt.y);
        if (d.perp) {
          ctx.save();
          ctx.strokeStyle = 'rgba(28,43,58,0.55)';
          ctx.lineWidth = 1.3;
          const m = 9;
          // orient the little square along the AC direction
          let ax = V.C.x - V.A.x, ay = V.C.y - V.A.y;
          const al = Math.hypot(ax, ay) || 1;
          ax /= al; ay /= al;
          let bx = V.D.x - V.B.x, by = V.D.y - V.B.y;
          const bl = Math.hypot(bx, by) || 1;
          bx /= bl; by /= bl;
          const P0 = { x: X + ax * m, y: Y - ay * m };
          const P1 = { x: X + ax * m + bx * m, y: Y - ay * m - by * m };
          const P2 = { x: X + bx * m, y: Y - by * m };
          ctx.beginPath();
          ctx.moveTo(P0.x, P0.y);
          ctx.lineTo(P1.x, P1.y);
          ctx.lineTo(P2.x, P2.y);
          ctx.stroke();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.arc(X, Y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = '#1C2B3A';
        ctx.fill();
      }
      // diagonal length labels near their midpoints
      const midAC = { x: (V.A.x + V.C.x) / 2, y: (V.A.y + V.C.y) / 2 };
      const midBD = { x: (V.B.x + V.D.x) / 2, y: (V.B.y + V.D.y) / 2 };
      tag(`AC = ${trim(d.AC)}`, sx(midAC.x), sy(midAC.y) - 12, 'center', '#1C2B3A');
      tag(`BD = ${trim(d.BD)}`, sx(midBD.x), sy(midBD.y) + 12, 'center', '#1C2B3A');
    }

    /* ---- faint body wash (only when no split/diagonal overlay owns it) ----- */
    if (!S.splitOverlay) {
      ctx.save();
      polyPath(poly);
      ctx.fillStyle = 'rgba(200,30,79,0.05)';
      ctx.fill();
      ctx.restore();
    }

    /* ---- the four sides — the one carmine accent -------------------------- */
    ctx.save();
    ctx.lineWidth = 2.75;
    ctx.strokeStyle = '#C81E4F';
    ctx.lineJoin = 'round';
    polyPath(poly);
    ctx.stroke();
    ctx.restore();

    /* ---- equal-side ticks + parallel arrows (family step) ----------------- */
    if (S.familyStep && g.valid) {
      const sides = [
        { p: V.A, q: V.B, len2: d2(V.A, V.B), dir: 'AB' },
        { p: V.B, q: V.C, len2: d2(V.B, V.C), dir: 'BC' },
        { p: V.C, q: V.D, len2: d2(V.C, V.D), dir: 'CD' },
        { p: V.D, q: V.A, len2: d2(V.D, V.A), dir: 'DA' },
      ];
      // group sides by equal length -> tick counts (only groups with ≥2 members)
      const groups = [];
      sides.forEach((s) => {
        let grp = groups.find((gr) => Math.abs(gr.len2 - s.len2) < EQ2);
        if (!grp) { grp = { len2: s.len2, members: [] }; groups.push(grp); }
        grp.members.push(s);
      });
      let tickN = 0;
      groups.forEach((gr) => {
        if (gr.members.length < 2) return;
        tickN += 1;
        gr.members.forEach((s) => drawTicks(ctx, sx, sy, s.p, s.q, tickN));
      });
      // parallel-pair arrows: AB∥CD gets single chevrons, BC∥DA double
      if (g.parallels.AB_CD) {
        drawChevron(ctx, sx, sy, V.A, V.B, 1);
        drawChevron(ctx, sx, sy, V.C, V.D, 1);
      }
      if (g.parallels.BC_DA) {
        drawChevron(ctx, sx, sy, V.B, V.C, 2);
        drawChevron(ctx, sx, sy, V.D, V.A, 2);
      }
    }

    /* ---- side length labels (opposite-ish, pushed outward) ---------------- */
    if (S.showSides && g.valid) {
      const sideLabel = (P, Q, letter, len) => {
        const mid = { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 };
        let ox = mid.x - centroid.x, oy = mid.y - centroid.y;
        const ol = Math.hypot(ox, oy) || 1;
        ox /= ol; oy /= ol;
        tag(`${letter} = ${trim(len)}`, sx(mid.x) + ox * 15, sy(mid.y) - oy * 15, 'center', '#5B6B7B');
      };
      sideLabel(V.A, V.B, 'AB', g.sides.AB);
      sideLabel(V.B, V.C, 'BC', g.sides.BC);
      sideLabel(V.C, V.D, 'CD', g.sides.CD);
      sideLabel(V.D, V.A, 'DA', g.sides.DA);
    }

    /* ---- interior angle arcs + measures (supports reflex corners) --------- */
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
        // sweep direction: whichever of ±measure lands on ray V→N (handles reflex)
        const sigma = Math.abs(norm(aP + mRad - aN)) <= Math.abs(norm(aP - mRad - aN)) ? 1 : -1;
        const R = measure > 180 ? 20 : 26; // tuck reflex arcs in a little
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
        const bis = aP + sigma * mRad / 2;
        tag(`${label}°`, cxp + Math.cos(bis) * (R + 15), cyp + Math.sin(bis) * (R + 15), 'center', '#1C2B3A');
      };
      drawAngle(V.A, V.D, V.B, g.angles[0], S.pa[0], 'rgba(200,30,79,0.24)');
      drawAngle(V.B, V.A, V.C, g.angles[1], S.pa[1], 'rgba(200,30,79,0.20)');
      drawAngle(V.C, V.B, V.D, g.angles[2], S.pa[2], 'rgba(200,30,79,0.16)');
      drawAngle(V.D, V.C, V.A, g.angles[3], S.pa[3], 'rgba(200,30,79,0.13)');
    }

    /* ---- the four vertices, with letter labels ---------------------------- */
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
    drawVertex(V.D, 'D', 'D');

    /* ---- degenerate / crossed notes --------------------------------------- */
    if (g.degenerate) {
      tag('the four points are (nearly) in a line — spread them out', W / 2, 20, 'center', '#C81E4F');
    } else if (g.complex) {
      tag('this quadrilateral crosses itself — its angles don’t sum to 360°', W / 2, 20, 'center', '#C81E4F');
    }

    /* ---- the "assemble the corners into 360°" inset ----------------------- */
    if (S.assemble && !S.calib && g.valid && S.pa) {
      const R = Math.min(W, H) * 0.15;
      const bx = W / 2;
      const by = H - R - 26;
      // translucent backing card
      ctx.save();
      ctx.fillStyle = 'rgba(251,251,248,0.9)';
      const cardW = R * 2.5, cardH = R * 2 + 34;
      roundRect(ctx, bx - cardW / 2, by - R - 10, cardW, cardH, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(28,43,58,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // faint full-circle frame
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx, by, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const total = 2 * Math.PI * assembleRef.current; // animated sweep 0..2π
      const wedges = [
        { m: g.angles[0], label: S.pa[0], tint: 'rgba(200,30,79,0.30)' },
        { m: g.angles[1], label: S.pa[1], tint: 'rgba(45,95,140,0.26)' },
        { m: g.angles[2], label: S.pa[2], tint: 'rgba(200,30,79,0.20)' },
        { m: g.angles[3], label: S.pa[3], tint: 'rgba(45,95,140,0.16)' },
      ];
      let startAng = -Math.PI / 2; // begin pointing up
      let drawnFully = true;
      for (const w of wedges) {
        const wid = w.m * DEG2RAD;
        const swept = -startAng - Math.PI / 2; // how much has already been laid down
        const drawWid = Math.max(0, Math.min(wid, total - swept));
        if (drawWid <= 1e-4) { drawnFully = false; break; }
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(bx, by);
        const NS = 48;
        for (let i = 0; i <= NS; i++) {
          const ang = startAng - drawWid * (i / NS);
          ctx.lineTo(bx + R * Math.cos(ang), by + R * Math.sin(ang));
        }
        ctx.closePath();
        ctx.fillStyle = w.tint;
        ctx.fill();
        ctx.strokeStyle = 'rgba(28,43,58,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        if (drawWid >= wid - 1e-4) {
          const mid = startAng - wid / 2;
          ctx.save();
          ctx.font = '10px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.fillStyle = '#1C2B3A';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${w.label}°`, bx + Math.cos(mid) * R * 0.66, by + Math.sin(mid) * R * 0.66);
          ctx.restore();
        }
        startAng -= wid;
        if (drawWid < wid - 1e-4) { drawnFully = false; break; }
      }
      // center dot
      ctx.beginPath();
      ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1C2B3A';
      ctx.fill();

      // caption
      ctx.save();
      ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.fillStyle = drawnFully ? '#C81E4F' : '#5B6B7B';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const cap = drawnFully
        ? `${S.pa[0]}° + ${S.pa[1]}° + ${S.pa[2]}° + ${S.pa[3]}° = 360.0°`
        : 'assembling the four corners…';
      ctx.fillText(cap, bx, by + R + 8);
      ctx.restore();
    }
  }, []);

  /* small perpendicular tick marks at a side's midpoint (equal-length notation) */
  function drawTicks(ctx, sx, sy, P, Q, n) {
    const mid = { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 };
    let dx = Q.x - P.x, dy = Q.y - P.y;
    const L = Math.hypot(dx, dy) || 1;
    dx /= L; dy /= L; // unit along the side (world)
    const nx = -dy, ny = dx; // unit perpendicular (world)
    const mx = sx(mid.x), my = sy(mid.y);
    // screen-space directions
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
    const px = -sdy, py = sdx; // screen perpendicular
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

  /* rounded-rect helper (used by the assemble inset backing) */
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
  }, [quad, step, target, selected, assemble, showDiag, draw]);

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

  /* each step keeps one focus: entering a step sets sensible overlay defaults —
     the "assemble" inset on the angle-sum step, both diagonals on the diagonals
     step, and neither anywhere else. (The toolbar toggles still let a student
     turn either on manually within a step.) */
  useEffect(() => {
    const title = STEPS[step] && STEPS[step].title;
    setAssemble(title === 'The angle sum is 360°');
    setShowDiag(title === 'The two diagonals');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the "assemble" animation for the inset — time-based, opt-in via the toggle/
     step, and instant when reduced motion is requested */
  useEffect(() => {
    if (!assemble) {
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
    const DURATION = 1800;
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
  }, [assemble, draw]);

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
    let best = null;
    let bestD = Infinity;
    for (const key of ['A', 'B', 'C', 'D']) {
      const d = dist(w, quad[key]);
      if (d < bestD) { bestD = d; best = key; }
    }
    if (bestD <= 1.1) {
      dragRef.current = best;
      setSelected(best);
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setQuad((prev) => ({ ...prev, [best]: snap(w) }));
    }
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const w = worldFromEvent(e);
    const key = dragRef.current;
    setQuad((prev) => ({ ...prev, [key]: snap(w) }));
  };
  const onPointerUp = (e) => {
    dragRef.current = null;
    e.currentTarget?.releasePointerCapture?.(e.pointerId);
  };

  /* keyboard: select a vertex with 1/2/3/4 (or A/B/C/D), nudge it with arrows */
  const onKeyDown = (e) => {
    const k = e.key.toLowerCase();
    const map = { '1': 'A', a: 'A', '2': 'B', b: 'B', '3': 'C', c: 'C', '4': 'D', d: 'D' };
    if (map[k]) { setSelected(map[k]); e.preventDefault(); return; }
    let dx = 0, dy = 0;
    if (e.key === 'ArrowLeft') dx = -GRID;
    else if (e.key === 'ArrowRight') dx = GRID;
    else if (e.key === 'ArrowUp') dy = GRID;
    else if (e.key === 'ArrowDown') dy = -GRID;
    else return;
    e.preventDefault();
    setQuad((prev) => {
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
  const resetQuad = () => setQuad(START);
  const applyPreset = (name) => setQuad(PRESETS[name]);

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const badgeText = !geo.valid ? geo.className : `${geo.className} · ${geo.convexity}`;
  const dg = geo.diag;
  const diagNote = !geo.valid
    ? '—'
    : [dg.equal ? 'equal' : null, dg.perp ? 'perpendicular' : null, dg.bisect ? 'bisect' : null]
        .filter(Boolean)
        .join(' · ') || 'neither';

  return (
    <div className="qlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Quadrilateral</h1>
        <p className="lede">
          Drag the corners. One rule never breaks:{' '}
          <span className="mono">∠A&nbsp;+&nbsp;∠B&nbsp;+&nbsp;∠C&nbsp;+&nbsp;∠D&nbsp;=&nbsp;360°</span> —
          every quadrilateral is two triangles in disguise.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation" aria-hidden="true">
              <span className="eq">
                ∠A + ∠B + ∠C + ∠D ={' '}
                {!geo.valid ? (
                  <span>—</span>
                ) : (
                  <>
                    {pa[0]}° + {pa[1]}° + {pa[2]}° + {pa[3]}°{' = '}
                    <b>360.0°</b>
                  </>
                )}
              </span>
            </p>
            <p className="equation-sub mono">
              A&nbsp;{pt(quad.A)}&nbsp; B&nbsp;{pt(quad.B)}&nbsp; C&nbsp;{pt(quad.C)}&nbsp; D&nbsp;{pt(quad.D)}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            tabIndex={0}
            role="application"
            aria-label={
              `Interactive quadrilateral on a coordinate grid. Corners A ${pt(quad.A)}, B ${pt(quad.B)}, ` +
              `C ${pt(quad.C)}, D ${pt(quad.D)}. ` +
              (!geo.valid
                ? geo.complex
                  ? 'The quadrilateral crosses itself. '
                  : 'The four points are nearly collinear. '
                : `A ${geo.convexity} ${geo.className}. Angles ${pa[0]}, ${pa[1]}, ${pa[2]} and ${pa[3]} ` +
                  `degrees, summing to 360 degrees. `) +
              `Drag a corner, or select A, B, C or D and use the arrow keys.`
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">drag a corner — or select A/B/C/D and use the arrow keys</span>
          </div>

          {/* vertex selector — keyboard-accessible way to choose which corner to nudge */}
          <div className="vsel" role="group" aria-label="Select a vertex to move with the arrow keys">
            <span className="vsel-lbl">Move:</span>
            {['A', 'B', 'C', 'D'].map((key) => (
              <button
                key={key}
                type="button"
                className={'vbtn' + (selected === key ? ' on' : '')}
                aria-pressed={selected === key}
                onClick={() => setSelected(key)}
              >
                {key} <span className="vco mono">{pt(quad[key])}</span>
              </button>
            ))}
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Sides</span>
              <span className="fact-v mono">
                AB={trim(geo.sides.AB)} · BC={trim(geo.sides.BC)} · CD={trim(geo.sides.CD)} · DA={trim(geo.sides.DA)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Angles</span>
              <span className="fact-v mono">
                {geo.valid ? `${pa[0]}° · ${pa[1]}° · ${pa[2]}° · ${pa[3]}°` : '—'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Angle sum</span>
              <span className="fact-v mono accent">{geo.valid ? '360.0°' : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Type</span>
              <span className="fact-v mono">{badgeText}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Diagonals</span>
              <span className="fact-v mono">
                {geo.valid ? `AC=${trim(dg.AC)} · BD=${trim(dg.BD)}` : '—'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Diagonals are</span>
              <span className="fact-v mono">{diagNote}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Perimeter</span>
              <span className="fact-v mono">{`≈ ${geo.perimeter.toFixed(2)}`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Area</span>
              <span className="fact-v mono">{geo.valid ? `≈ ${geo.area.toFixed(2)}` : '—'}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (assemble ? ' on' : '')}
              onClick={() => setAssemble((s) => !s)}
            >
              {assemble ? 'Corners shown' : 'Assemble corners'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (diagOverlay ? ' on' : '')}
              onClick={() => setShowDiag((s) => !s)}
            >
              {diagOverlay ? 'Diagonals shown' : 'Show diagonals'}
            </button>
            <button type="button" className="btn ghost" onClick={resetQuad}>
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

          {/* intro step: convex vs concave examples */}
          {step === 0 && (
            <div className="subctl">
              <span className="subctl-lbl">Examples:</span>
              <button type="button" className="chip" onClick={resetQuad}>Convex</button>
              <button type="button" className="chip" onClick={() => setQuad(CONCAVE)}>Concave example</button>
              <span className="subctl-note mono">now: {geo.valid ? geo.convexity : '—'}</span>
            </div>
          )}

          {/* family step: the special-quadrilateral presets */}
          {familyStep && (
            <div className="subctl">
              <span className="subctl-lbl">Examples:</span>
              {Object.keys(PRESETS).map((name) => (
                <button key={name} type="button" className="chip" onClick={() => applyPreset(name)}>
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
                {calibrated ? 'Calibrated. The quadrilaterals match.' : ''}
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
                  setAssemble(false);
                  setShowDiag(false);
                  resetQuad();
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">∠A + ∠B + ∠C + ∠D = 360°</span> &nbsp;·&nbsp; one diagonal splits any
        quadrilateral into two triangles, so its angles total 2 × 180°, holding live as you drag the
        corners on a 20×20 quadrille window.
      </footer>

      <style jsx>{`
        .qlab {
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
        :global(.qlab) :focus-visible {
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
