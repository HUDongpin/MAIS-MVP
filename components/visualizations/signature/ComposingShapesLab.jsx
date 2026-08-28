'use client';

/* ============================================================================
   ComposingShapesLab — an interactive "bench" for the first OPERATION in
   geometry: shapes JOIN.  Put two shapes together with full sides touching and
   you no longer have two shapes.  You have ONE, and the sides that touched are
   gone — tucked inside as a seam.

   THE LAW THIS LAB IS BUILT ON (exact, and true of every arrangement):

        sides on the outline  =  sides of the pieces  −  2 × (seams)

   Six triangles carry 18 sides between them.  Fan them round a point and six
   seams appear; each seam swallows two sides; 18 − 12 = 6, and six sides is
   what the hexagon shows the world.  Nothing is lost — the swallowed sides are
   still in there, holding the pieces together where you can no longer see them.

   And the pay-off, which is the whole reason composing matters: THE OUTLINE
   CANNOT TELL WHICH PIECES MADE IT.  The same hexagon comes out of 6 triangles,
   or 3 rhombuses, or 2 trapezoids, or a trapezoid and 3 triangles.  Different
   insides, identical outline.  So the capstone challenge asks the student to
   FILL a mystery outline and accepts ANY recipe that fills it — the challenge
   is the thesis.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at Kindergarten
   and Grade 1.  Anchor standards:
     • CCSS K.G.B.6 — "Compose simple shapes to form larger shapes.  For
       example, 'Can you join these two triangles with full sides touching to
       make a rectangle?'"  ← "with full sides touching" is not decoration, it
       is the rule that makes composing an operation, and this lab enforces it.
     • CCSS 1.G.A.2 — "Compose two-dimensional shapes ... to create a composite
       shape, and compose new shapes from the composite shape."  ← the second
       clause is the one everybody drops.  Here it IS the interaction: every
       shape you compose is added to your kit, so the next thing you build is
       built out of the last thing you built.
   Also MP7 (structure) and MP3 (the seam law is a reason, not a rule to trust).

   ---------------------------------------------------------------------------
   DISTINCTNESS — what this lab refuses to draw, and why
   ---------------------------------------------------------------------------
   Almost every obvious picture for "composing shapes" is already a sibling's
   centerpiece.  What is left — and it is the better idea anyway — is the JOIN
   itself: the operation, its rule, and what it does to a boundary.

     • ShapesLab (K-2, the closest sibling, and the reason this lab is aimed
       where it is) owns THE NAME FUNCTION: one shape, a dial for the number of
       straight sides, and the lesson that the name follows the defining
       attributes and ignores turn, size and colour.  Counting a shape's sides
       to arrive at its name is ITS lesson.  So this lab has no sides dial, no
       name plate as the object of study, no orientation or colour foils, and
       not one question of the form "how many sides ⇒ what is it called?".
       Names appear here only as LABELS on a result.  Its subject is one shape's
       attributes; ours is what happens WHEN TWO SHAPES MEET — which ShapesLab
       structurally cannot show, having only ever one shape and no parts.
     • AreaLab owns the unit-square tiling: a shape covered in 1×1 tiles that
       are COUNTED to give an area.  The gap analysis for this topic named that
       collision first.  So the pieces here are never counted to measure the
       whole: there is no area, no unit square, no tile count, and the pieces
       are deliberately DIFFERENT sizes and shapes, which is exactly what a
       measuring tile may never be.
     • FractionLab owns "one whole, cut into equal parts, and the parts are an
       AMOUNT" (and EquivalentFractionsLab owns the same number's many names).
       Pattern blocks are the classic fraction manipulative — a triangle is one
       sixth of the hexagon — and that reading is refused outright: no fraction
       is written, said, or implied anywhere in this lab.  Our parts are unequal
       and unnumbered.  "Many recipes for one outline" is about SHAPE, not
       amount: 3 rhombuses and 6 triangles are the same hexagon, and the lab
       never asks how much of it anything is.
     • TriangleLab (angle sum, tear-the-corners) and QuadrilateralLab (four
       wedges assembling into a full 360° turn about a point) own angles.  Six
       triangles closing round a point is one nudge away from re-drawing
       QuadrilateralLab's inset as "6 × 60° = 360°", so this lab NEVER MEASURES
       AN ANGLE: no degrees, no arcs, no wedges, no angle sum.  The ring closes
       because the last piece fits, and what we look at is the outline it makes.
     • TrapezoidLab owns the doubling proof (a copy half-turned about a leg's
       midpoint to make a parallelogram) and ParallelogramLab owns the half-turn
       about the centre.  So no composite here is ever made by rotating a COPY
       of the shape onto itself; pieces are separate objects the student moves.
     • RectangleLab owns perimeter — the boundary you walk and ADD UP.  We never
       total a boundary's length; we count how many sides it has left.
     • PointLab and the coordinate labs own the plane.  A five-year-old has no
       coordinates: this paper has NO AXES, NO ORIGIN and NO TICK LABELS.  It is
       isometric paper, and it is only paper.
   These refusals are enforced by `audit-composingshapes.mjs`, which greps this
   file's own lesson copy for them.  A distinctness promise kept only in prose
   is a promise that gets broken by the next edit.

   ---------------------------------------------------------------------------
   WHY THE MATH IS EXACT (and it must be — the whole lab is a claim about
   whether shapes fit)
   ---------------------------------------------------------------------------
   Equilateral triangles have irrational coordinates (√3/2), so anything built
   on floats would decide "do these two sides coincide?" with a tolerance.  This
   lab never does.  Every point lives on the TRIANGULAR LATTICE and is stored as
   an INTEGER PAIR (a, b) meaning

        P(a,b) = a·u + b·v,      u = (1, 0),  v = (1/2, √3/2)

   and the irrational numbers appear only in the last step before pixels.  In
   that basis every question this lab asks is exact integer arithmetic:
     • same point?            (a,b) equality
     • rotate 60°?            (a,b) → (−b, a+b)          [exact, order 6]
     • three points in line?  cross = 0                  [merges collinear sides]
     • same length side?      a² + b² + a·b              [never a square root]
     • do two pieces overlap? set intersection of unit-triangle cells
   Every shape is a set of unit-triangle CELLS, so "full sides touching" is not
   a tolerance either — it is cell edge-adjacency, and a piece that touches
   another only at a corner is provably NOT joined to it.  The lattice IS the
   rule from K.G.B.6, the way ParallelogramLab's forced 4th corner IS the
   parallelogram law.
   A consequence worth knowing: every side of every piece runs along one of the
   three lattice directions, so every corner of anything you can build here is a
   multiple of 60° — which is why this kit has no square in it.  (K.G.B.6's own
   example joins two RIGHT triangles into a rectangle; that is a different kit
   on a different lattice, and mixing the two would make half the pieces refuse
   to fit for reasons a five-year-old could not see.)

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/ComposingShapesLab.jsx
     2. Import and render it:
          import ComposingShapesLab from './ComposingShapesLab';
          export default function Page() { return <ComposingShapesLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (pieces, step, lenses).
     MODEL  — pure integer lattice geometry that knows no pixels: which cells a
              piece covers, which pieces are joined, the outline of each joined
              group, and the seam ledger.  Every readout reads from it.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   THE LATTICE.  P(a,b) = a·u + b·v with u = (1,0), v = (1/2, √3/2).  Integers
   (a,b) in, exact answers out; √3 is touched only by wx/wy on the way to pixels.
   ------------------------------------------------------------------------- */
const SQ3 = Math.sqrt(3);
const wx = (a, b) => a + b / 2; // world x of lattice point (a,b)
const wy = (b) => (b * SQ3) / 2; // world y of lattice point (a,b)

/* A 60° turn is an exact integer map on the lattice, and applying it six times
   is the identity (both audited).  This is why a piece can be turned without
   ever leaving the exact world. */
const rot60 = ([a, b]) => [-b, a + b];
const rotK = (p, k) => {
  let q = p;
  const n = ((k % 6) + 6) % 6;
  for (let i = 0; i < n; i++) q = rot60(q);
  return q;
};
const sub = ([a, b], [c, d]) => [a - c, b - d];
/* cross = 0 ⟺ parallel (used to merge collinear sides, so a "side" is a real
   side and not two half-sides that happen to line up). */
const cross = ([a, b], [c, d]) => a * d - b * c;
/* Squared length in the u,v basis: |a·u + b·v|² = a² + b² + a·b, because
   u·v = 1/2.  Exact integer — equal sides are compared without a square root. */
const len2 = ([a, b]) => a * a + b * b + a * b;

/* ---------------------------------------------------------------------------
   CELLS.  The atom is the unit triangle.  The rhombus spanned by u,v at (a,b)
   splits into an UP cell and a DOWN cell, so every piece is a set of cells and
   two pieces overlap exactly when they share one.  Vertices are listed
   counter-clockwise (needed by the boundary walk).
   ------------------------------------------------------------------------- */
const UP = 0;
const DOWN = 1;
const ck = (a, b, t) => `${a},${b},${t}`;
const pk = ([a, b]) => `${a},${b}`;

const cellVerts = (a, b, t) =>
  t === UP
    ? [[a, b], [a + 1, b], [a, b + 1]]
    : [[a + 1, b], [a + 1, b + 1], [a, b + 1]];

/* The inverse: which cell has these three vertices?  Used to turn a piece — we
   rotate its vertices and read the cell back.  Returns null if the three points
   are not a unit triangle (audited never to happen for real pieces). */
function cellFromVerts(vs) {
  const minA = Math.min(vs[0][0], vs[1][0], vs[2][0]);
  const minB = Math.min(vs[0][1], vs[1][1], vs[2][1]);
  const have = new Set(vs.map(pk));
  const matches = (cand) => cand.every((p) => have.has(pk(p)));
  if (have.size !== 3) return null;
  if (matches(cellVerts(minA, minB, UP))) return [minA, minB, UP];
  if (matches(cellVerts(minA, minB, DOWN))) return [minA, minB, DOWN];
  return null;
}

const rotCell = ([a, b, t], k) => cellFromVerts(cellVerts(a, b, t).map((p) => rotK(p, k)));

/* Edge neighbours — the three cells sharing a FULL SIDE with this one.  This
   function is K.G.B.6's rule in code: joined means edge-adjacent, and a corner
   touch is not on the list. */
const neighbours = ([a, b, t]) =>
  t === UP
    ? [[a, b, DOWN], [a - 1, b, DOWN], [a, b - 1, DOWN]]
    : [[a, b, UP], [a + 1, b, UP], [a, b + 1, UP]];

/* ---------------------------------------------------------------------------
   THE KIT.  Four pieces, each a set of cells around its own pivot.  A piece
   turns about its pivot, the way a child's thumb holds a block down and spins
   it — exact, because the pivot is a lattice point.
   The kit UNLOCKS ONE PIECE PER STEP, which is this library's "one new dial per
   idea" rhythm; here it carries a second meaning, because the piece each step
   unlocks is the shape the previous step composed.  That is CCSS 1.G.A.2's
   "compose new shapes from the composite shape", built into the controls.
   ------------------------------------------------------------------------- */
const KIT = [
  { kind: 'triangle', label: 'Triangle', unlock: 0, cells: [[0, 0, UP]] },
  { kind: 'rhombus', label: 'Rhombus', unlock: 1, cells: [[0, 0, UP], [0, 0, DOWN]] },
  { kind: 'trapezoid', label: 'Trapezoid', unlock: 2, cells: [[0, 0, UP], [0, 0, DOWN], [1, 0, UP]] },
  {
    kind: 'hexagon',
    label: 'Hexagon',
    unlock: 3,
    // the six cells that meet at the pivot (0,0)
    cells: [[0, 0, UP], [-1, 0, UP], [0, -1, UP], [-1, -1, DOWN], [-1, 0, DOWN], [0, -1, DOWN]],
  },
];
const KIND = Object.fromEntries(KIT.map((k) => [k.kind, k]));

/* Where a piece actually sits: turn its cells about the pivot, then slide. */
const pieceCells = (p) => KIND[p.kind].cells.map((c) => {
  const [a, b, t] = rotCell(c, p.rot);
  return [a + p.pos[0], b + p.pos[1], t];
});

/* ---------------------------------------------------------------------------
   THE PAPER.  A square window of isometric paper.  No axes and no tick labels:
   this lab has no coordinates (see the distinctness note) — the grid is here
   because it shows where full sides can meet, exactly as AreaLab's quadrille is
   there because its squares ARE the unit tiles.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -3.8, xmax: 3.8, ymin: -3.8, ymax: 3.8 };
const BOUND = 3.5; // a piece must keep every vertex inside ±BOUND
const inBounds = (cells) =>
  cells.every(([a, b, t]) =>
    cellVerts(a, b, t).every(([va, vb]) => Math.abs(wx(va, vb)) <= BOUND && Math.abs(wy(vb)) <= BOUND)
  );

/* ---------------------------------------------------------------------------
   MODEL — everything the lab knows, from the pieces alone.  No pixels.
   ------------------------------------------------------------------------- */

/* Group the pieces into JOINED wholes: two pieces are in the same group when
   some cell of one shares a full side with some cell of the other.  Pieces that
   merely touch at a corner land in different groups — which is the rule, not a
   detail, and is what step 1's question is about. */
function groupPieces(pieces) {
  const owner = new Map(); // cell key -> piece id
  for (const p of pieces) for (const c of pieceCells(p)) owner.set(ck(...c), p.id);

  const adj = new Map(pieces.map((p) => [p.id, new Set()]));
  for (const p of pieces) {
    for (const c of pieceCells(p)) {
      for (const n of neighbours(c)) {
        const other = owner.get(ck(...n));
        if (other != null && other !== p.id) {
          adj.get(p.id).add(other);
          adj.get(other).add(p.id);
        }
      }
    }
  }
  const seen = new Set();
  const groups = [];
  for (const p of pieces) {
    if (seen.has(p.id)) continue;
    const ids = [];
    const stack = [p.id];
    seen.add(p.id);
    while (stack.length) {
      const id = stack.pop();
      ids.push(id);
      for (const q of adj.get(id)) if (!seen.has(q)) { seen.add(q); stack.push(q); }
    }
    groups.push(ids);
  }
  return groups;
}

/* The outline of a set of cells.  A unit edge is on the boundary when the cell
   on its other side is missing; walk those edges head-to-tail into a cycle.
   Reports the two honest failures rather than naming something that isn't one
   clean shape:
     holes  — more than one cycle (a ring of pieces around a gap)
     pinch  — a corner where the outline meets itself, so the walk has a choice
   Neither can be reached by the lesson's own shapes; both are audited. */
function outline(cells) {
  const dirEdges = new Map();
  for (const [a, b, t] of cells) {
    const v = cellVerts(a, b, t);
    for (let i = 0; i < 3; i++) {
      const p = v[i], q = v[(i + 1) % 3];
      dirEdges.set(pk(p) + '|' + pk(q), [p, q]);
    }
  }
  const out = new Map(); // from-vertex -> outgoing boundary edges
  let unitEdges = 0;
  for (const [, e] of dirEdges) {
    if (dirEdges.has(pk(e[1]) + '|' + pk(e[0]))) continue; // shared → a seam
    unitEdges++;
    const s = pk(e[0]);
    if (!out.has(s)) out.set(s, []);
    out.get(s).push(e);
  }
  for (const [, list] of out) if (list.length > 1) return { ok: false, why: 'pinch' };

  const cycles = [];
  const used = new Set();
  for (const [, list] of out) {
    for (const e0 of list) {
      const id0 = pk(e0[0]) + '|' + pk(e0[1]);
      if (used.has(id0)) continue;
      const cyc = [];
      let e = e0;
      for (let guard = 0; guard <= unitEdges + 1; guard++) {
        const id = pk(e[0]) + '|' + pk(e[1]);
        if (used.has(id)) break;
        used.add(id);
        cyc.push(e[0]);
        const nxt = out.get(pk(e[1]));
        if (!nxt || !nxt.length) break;
        e = nxt[0];
      }
      cycles.push(cyc);
    }
  }
  if (cycles.length !== 1) return { ok: false, why: 'hole' };
  return { ok: true, cycle: cycles[0], unitEdges };
}

/* Drop every vertex whose two edges run the same way: two half-sides in line
   are ONE side.  This is the step that makes 18 − 12 = 6 come out right — and
   the reason a five-triangle fan honestly has seven sides while the six-triangle
   hexagon has six. */
function simplify(cycle) {
  const n = cycle.length;
  const poly = [];
  for (let i = 0; i < n; i++) {
    const p = cycle[(i - 1 + n) % n], q = cycle[i], r = cycle[(i + 1) % n];
    if (cross(sub(q, p), sub(r, q)) !== 0) poly.push(q);
  }
  return poly;
}

/* A LABEL for the result — not a lesson (that is ShapesLab's job), just the
   word for what came out.  Every corner here is a multiple of 60°, so a
   four-sided result is always a rhombus, a parallelogram or a trapezoid, and
   never a square or a kite; and a three-sided one is always equilateral.  Both
   facts are audited. */
const POLY_NAMES = {
  3: 'triangle', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon',
  9: 'nonagon', 10: 'decagon', 11: 'hendecagon', 12: 'dodecagon',
};
function labelFor(poly) {
  const n = poly.length;
  if (n === 4) {
    const d = poly.map((p, i) => sub(poly[(i + 1) % n], p));
    const L = d.map(len2);
    if (L.every((x) => x === L[0])) return 'rhombus';
    if (cross(d[0], d[2]) === 0 && cross(d[1], d[3]) === 0) return 'parallelogram';
    return 'trapezoid';
  }
  return POLY_NAMES[n] || `${n}-sided shape`;
}

/* THE SEAM LEDGER — the law the lab is built on:

        sides on the outline  =  the pieces' own sides  −  2 × seams

   A SEAM is one place where two PIECES are pressed together — not a line inside
   a piece (a hexagon block is one block, not six triangles), which is why this
   counts adjacent PIECE PAIRS and not shared cell edges.

   The law is exactly true when every seam is a full side of both pieces it
   joins and no two outline sides fall into line and merge.  That covers every
   arrangement the lesson builds, but NOT every arrangement a student can build:
   lay two triangles along a trapezoid's long side, for instance, and each
   swallows only half of it, so the tally comes out one short.  Rather than
   print an equation that does not balance, the ledger CHECKS ITSELF — `ok` is
   the equation actually holding — and the head simply hides it when it fails.
   An arithmetic claim a child can see is wrong is worse than no claim. */
function ledgerOf(list) {
  const owner = new Map();
  for (const p of list) for (const c of pieceCells(p)) owner.set(ck(...c), p.id);
  const pairs = new Set();
  for (const p of list) {
    for (const c of pieceCells(p)) {
      for (const n of neighbours(c)) {
        const o = owner.get(ck(...n));
        if (o != null && o !== p.id) pairs.add([p.id, o].sort((x, y) => x - y).join(':'));
      }
    }
  }
  let pieceSides = 0;
  for (const p of list) {
    const o = outline(pieceCells(p));
    pieceSides += o.ok ? simplify(o.cycle).length : 0;
  }
  return { seams: pairs.size, pieceSides };
}

/* The exact visible seam segments.  Internal unit edges inside one physical
   block are not seams; an edge appears here only when cells owned by two
   different pieces share it.  This is the drawing equivalent of ledgerOf's
   piece-pair rule, while retaining every unit segment of a longer shared side. */
function seamEdgesOf(list) {
  const edges = new Map();
  for (const piece of list) {
    for (const cell of pieceCells(piece)) {
      const vertices = cellVerts(...cell);
      for (let i = 0; i < vertices.length; i++) {
        const a = vertices[i];
        const b = vertices[(i + 1) % vertices.length];
        const aKey = pk(a);
        const bKey = pk(b);
        const key = aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
        const entry = edges.get(key) || { edge: [a, b], owners: new Set() };
        entry.owners.add(piece.id);
        edges.set(key, entry);
      }
    }
  }
  return [...edges.values()]
    .filter((entry) => entry.owners.size > 1)
    .map((entry) => entry.edge);
}

/* The whole bench, analysed.  This is the single source of truth for the head,
   the canvas, the a11y label and the challenge meter. */
function analyze(pieces) {
  const byId = new Map(pieces.map((p) => [p.id, p]));
  const groups = groupPieces(pieces).map((ids) => {
    const list = ids.map((id) => byId.get(id));
    const cells = list.flatMap(pieceCells);
    const { seams, pieceSides } = ledgerOf(list);
    const seamEdges = seamEdgesOf(list);
    const o = outline(cells);
    const poly = o.ok ? simplify(o.cycle) : null;
    const counts = {};
    for (const p of list) counts[p.kind] = (counts[p.kind] || 0) + 1;
    const sides = poly ? poly.length : 0;
    return {
      ids, cells, poly, seams, seamEdges, pieceSides, counts, sides,
      joined: ids.length > 1,
      ok: o.ok,
      why: o.why || null,
      unitEdges: o.ok ? o.unitEdges : 0,
      label: poly ? labelFor(poly) : null,
      // the ledger only speaks when its own arithmetic balances
      ledgerOk: ids.length > 1 && o.ok && pieceSides - 2 * seams === sides,
    };
  });
  const all = new Set();
  let overlap = false;
  for (const p of pieces) for (const c of pieceCells(p)) {
    const k = ck(...c);
    if (all.has(k)) overlap = true;
    all.add(k);
  }
  return { groups, overlap, cellKeys: all };
}

/* ---------------------------------------------------------------------------
   THE LESSON.  One idea per step; the reveal lives in `feedback`, shown after
   answering; Next is gated on ANSWERED, not correct.  The distractors are the
   real ones: that touching anywhere counts as joining, that more pieces must
   mean more sides, and that a shape remembers what it was built from.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Full sides touching',
    kit: 'Triangle',
    body: 'Drag a triangle. A full side meets a full side — click!',
    q: 'Two corners touch, like a bow tie. One shape?',
    choices: ['No — sides must touch', 'Yes', 'Only turned'],
    answer: 0,
    feedback: 'A corner is not a side. Full side meets full side.',
  },
  {
    title: 'Three triangles',
    kit: 'Rhombus',
    body: 'Your rhombus is a piece now! Add one more triangle.',
    q: 'How many shapes can three triangles make?',
    choices: ['Only one — a trapezoid', 'Three', 'Lots'],
    answer: 0,
    feedback: 'Only one. This lab checked all 240 of the ways — every one is a trapezoid.',
  },
  {
    title: 'The seam swallows two sides',
    kit: 'Trapezoid',
    body: 'Drop the last triangle in. Watch the side count go DOWN.',
    q: '18 sides went in. Only 6 show. Where are the rest?',
    choices: ['Inside — seams ate them', 'Rubbed out', 'They shrank'],
    answer: 0,
    feedback: 'Seams ate them: 18 − 2 × 6 = 6.',
  },
  {
    title: 'One outline, many recipes',
    kit: 'Hexagon',
    body: 'Press each recipe. The inside changes. The outline never moves.',
    q: 'Built from triangles or from rhombuses — same shape?',
    choices: ['Same — the outline matches', 'Different', 'Cannot tell'],
    answer: 0,
    feedback: 'A shape is its outline, nothing more.',
  },
  {
    title: 'Build with what you built',
    kit: null,
    body: 'Two hexagons. Join them. The ledger knows the answer first.',
    q: '12 sides between them. Join one full side. How many show?',
    choices: ['10 — the seam ate two', '12', '11'],
    answer: 0,
    feedback: 'One seam, two sides gone: 12 − 2 = 10.',
  },
  {
    title: 'Fill the outline',
    kit: null,
    body: 'Fill the grey outline — no gaps, nothing sticking out. Any pieces work!',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   SEEDS.  Every step starts one drag from its point: the pieces are placed in
   their FINISHED positions and then exactly one of them is parked to the side.
   Defining seeds this way makes "one drag away" true by construction, and the
   audit checks both ends — that the goal really is the shape the copy claims,
   and that the parked seed really is not yet joined.
   ------------------------------------------------------------------------- */
const GOALS = {
  rhombus: [
    { kind: 'triangle', pos: [0, -1], rot: 0 },
    { kind: 'triangle', pos: [0, -1], rot: 1 },
  ],
  trapezoid: [
    { kind: 'rhombus', pos: [-1, 0], rot: 0 },
    { kind: 'triangle', pos: [0, 0], rot: 0 },
  ],
  hexagon6: [
    { kind: 'triangle', pos: [0, 0], rot: 0 },
    { kind: 'triangle', pos: [-1, 0], rot: 0 },
    { kind: 'triangle', pos: [0, -1], rot: 0 },
    { kind: 'triangle', pos: [0, 0], rot: 1 },
    { kind: 'triangle', pos: [0, -1], rot: 1 },
    { kind: 'triangle', pos: [1, -1], rot: 1 },
  ],
  twoHexagons: [
    { kind: 'hexagon', pos: [-1, 0], rot: 0 },
    { kind: 'hexagon', pos: [0, 1], rot: 0 },
  ],
};

/* The four ways to fill the same hexagon (all solved and audited to cover the
   identical six cells).  Step 4's recipe buttons play these. */
const RECIPES = [
  { name: '6 triangles', pieces: GOALS.hexagon6 },
  {
    name: '3 rhombuses',
    pieces: [
      { kind: 'rhombus', pos: [-1, 0], rot: 0 },
      { kind: 'rhombus', pos: [-1, 0], rot: 5 },
      { kind: 'rhombus', pos: [0, 1], rot: 4 },
    ],
  },
  {
    name: '2 trapezoids',
    pieces: [
      { kind: 'trapezoid', pos: [-1, 0], rot: 0 },
      { kind: 'trapezoid', pos: [1, 0], rot: 3 },
    ],
  },
  {
    name: 'trapezoid + 3 triangles',
    pieces: [
      { kind: 'trapezoid', pos: [-1, 0], rot: 0 },
      { kind: 'triangle', pos: [-1, 0], rot: 5 },
      { kind: 'triangle', pos: [0, -1], rot: 0 },
      { kind: 'triangle', pos: [0, 0], rot: 5 },
    ],
  },
];

/* step index → { pieces, park: index of the piece to hold back, by: [da,db] } */
const SEEDS = {
  0: { goal: GOALS.rhombus, park: 1, by: [3, -1] },
  1: { goal: GOALS.trapezoid, park: 1, by: [2, 0] },
  2: { goal: GOALS.hexagon6, park: 5, by: [2, 0] },
  3: { goal: RECIPES[0].pieces, park: -1, by: [0, 0] },
  4: { goal: GOALS.twoHexagons, park: 1, by: [2, -1] },
  5: { goal: [], park: -1, by: [0, 0] },
};

let UID = 0;
const mk = (p) => ({ id: ++UID, kind: p.kind, pos: [...p.pos], rot: p.rot });
function seedFor(step) {
  const s = SEEDS[step];
  if (!s) return [];
  return s.goal.map((p, i) =>
    mk(i === s.park ? { ...p, pos: [p.pos[0] + s.by[0], p.pos[1] + s.by[1]] } : p)
  );
}

/* ---------------------------------------------------------------------------
   THE CHALLENGE.  Fill a mystery outline.  The gate is SET EQUALITY of the
   covered cells — not a distance under a threshold — so it is not possible for
   the stamp to fire on a shape that isn't the target: too few cells, one cell
   over the line, or anything sticking out all fail by construction.  Any recipe
   that covers the cells passes, which is exactly step 4's thesis.
   ------------------------------------------------------------------------- */
const TARGETS = [
  {
    name: 'big triangle',
    recipe: [
      { kind: 'rhombus', pos: [0, 0], rot: 0 },
      { kind: 'triangle', pos: [1, 0], rot: 0 },
      { kind: 'triangle', pos: [0, 1], rot: 0 },
    ],
  },
  {
    name: 'parallelogram',
    recipe: [
      { kind: 'rhombus', pos: [0, 0], rot: 0 },
      { kind: 'rhombus', pos: [1, 0], rot: 0 },
    ],
  },
  { name: 'hexagon', recipe: RECIPES[1].pieces },
  { name: 'big trapezoid', recipe: [
      { kind: 'trapezoid', pos: [-1, 0], rot: 0 },
      { kind: 'trapezoid', pos: [1, 0], rot: 3 },
      { kind: 'trapezoid', pos: [-2, 1], rot: 0 },
    ] },
];

/* Centre a target's cells on the paper and turn it, exactly. */
function targetCells(t, rot, shift) {
  return t.recipe.flatMap((p) =>
    pieceCells({ kind: p.kind, rot: (p.rot + rot) % 6, pos: [0, 0] }).map(([a, b, ty]) => {
      const [ra, rb] = rotK([p.pos[0], p.pos[1]], rot);
      return [a + ra + shift[0], b + rb + shift[1], ty];
    })
  );
}
/* NOTE: a piece's cells are (rot about pivot) then (slide), so turning a whole
   recipe means turning each piece AND turning where it sits — which is what the
   two rotK calls above do.  Audited against a direct rotation of the cells. */

function makeTarget(prev) {
  let t, rot, guard = 0;
  do {
    t = TARGETS[Math.floor(Math.random() * TARGETS.length)];
    rot = Math.floor(Math.random() * 6);
    guard++;
  } while (guard < 200 && prev && t.name === prev.name);
  const cells = targetCells(t, rot, [0, 0]);
  return { name: t.name, rot, cells, keys: new Set(cells.map((c) => ck(...c))) };
}

function matchOf(target, covered) {
  if (!target) return { pct: 0, calibrated: false, missing: 0, stray: 0 };
  let hit = 0;
  for (const k of target.keys) if (covered.has(k)) hit++;
  let stray = 0;
  for (const k of covered) if (!target.keys.has(k)) stray++;
  const total = target.keys.size;
  const missing = total - hit;
  const pct = Math.max(0, Math.min(100, ((hit - stray) / total) * 100));
  return { pct, calibrated: hit === total && stray === 0, missing, stray };
}

/* ---------------------------------------------------------------------------
   Canvas colours.  ONE accent, and it carries the lab's meaning: CARMINE IS THE
   OUTLINE OF A JOINED WHOLE.  Carmine appearing is the moment two shapes became
   one shape.  Pieces that are not joined to anything get a plain grey outline —
   they have not earned it yet.  Seams are drawn faint, INSIDE, where they live.
   ------------------------------------------------------------------------- */
const CARMINE = '#C81E4F';
const INK = '#1C2B3A';
const INK_SOFT = '#5B6B7B';
const SEAM = '#445565';
const FILL = 'rgba(199,216,228,0.55)';
const FILL_SEL = 'rgba(200,30,79,0.13)';

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const plural = (n, w) => `${n} ${n === 1 ? w : w === 'rhombus' ? 'rhombuses' : w + 's'}`;

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ComposingShapesLab() {
  const [step, setStep] = useState(0);
  const [pieces, setPieces] = useState(() => seedFor(0));
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);
  const [hideSeams, setHideSeams] = useState(false);
  const [recipe, setRecipe] = useState(0);
  const [blocked, setBlocked] = useState(false); // brief "no room" flash

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null); // { id, offset:[da,db] }
  const fuseRef = useRef({ t0: 0, on: false });
  const lastSigRef = useRef('');
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const model = useMemo(() => analyze(pieces), [pieces]);

  /* THE joined whole — the one thing the head and the ledger talk about.  A
     piece sitting on its own is not a whole (nothing has been joined yet), and
     loose pieces waiting to be used must not silence the ledger: step 3's whole
     point is reading "…= 7 on the outline" off the five-triangle fan WHILE the
     sixth triangle is still parked at the side. */
  const wholes = model.groups.filter((g) => g.joined && g.ok);
  const loose = model.groups.filter((g) => !g.joined).length;
  const named = wholes.length === 1 ? wholes[0] : null;

  const match = useMemo(() => matchOf(target, model.cellKeys), [target, model.cellKeys]);
  const calibrated = calib && match.calibrated;

  const unlockedKinds = KIT.filter((k) => step >= k.unlock).map((k) => k.kind);

  /* ---- the head: a recipe and an arrow, never a measurement ---------------- */
  const recipeOf = (g) =>
    KIT.filter((k) => g.counts[k.kind]).map((k) => plural(g.counts[k.kind], k.label.toLowerCase())).join(' + ');

  const headline = (() => {
    if (model.groups.length === 0) return 'the paper is empty — take a piece from the kit';
    const broken = model.groups.find((g) => !g.ok);
    if (broken)
      return broken.why === 'hole'
        ? 'that ring has a hole in it — no outline of its own'
        : 'that join pinches at a corner';
    if (named) {
      // the recipe, an arrow, and the ONE thing it made — never a measurement
      return `${recipeOf(named)} → 1 ${named.label}` + (loose ? ` · ${loose} still loose` : '');
    }
    if (wholes.length > 1) return `${wholes.length} joined shapes — and ${loose} loose`;
    if (model.groups.length === 1) return `${recipeOf(model.groups[0])} — on its own`;
    return `${model.groups.length} separate shapes — join a full side to a full side`;
  })();

  const showLedger = !!(named && named.ledgerOk && step >= 2);

  /* ---- fuse: fire once, when a NEW joined whole appears -------------------- */
  const sig = named && named.joined ? `${named.ids.length}:${named.label}:${named.sides}` : '';
  useEffect(() => {
    if (sig && sig !== lastSigRef.current) {
      fuseRef.current = { t0: performance.now(), on: !prefersReduced() };
    }
    lastSigRef.current = sig;
  }, [sig]);

  sceneRef.current = { model, named, selected, hideSeams, calib, target, step };

  /* ---- world → screen + full redraw from state ---------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const Wpx = stage.clientWidth, Hpx = stage.clientHeight;
    if (!Wpx || !Hpx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(Wpx * dpr);
    canvas.height = Math.round(Hpx * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sx = (x) => ((x - WORLD.xmin) / (WORLD.xmax - WORLD.xmin)) * Wpx;
    const sy = (y) => ((WORLD.ymax - y) / (WORLD.ymax - WORLD.ymin)) * Hpx;
    const SX = ([a, b]) => sx(wx(a, b));
    const SY = ([, b]) => sy(wy(b));

    const S = sceneRef.current;
    ctx.clearRect(0, 0, Wpx, Hpx);

    /* ---- isometric paper: the three lattice directions ------------------- */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.62)'; // faint: paper, not furniture
    ctx.beginPath();
    const N = 7;
    for (let b = -N; b <= N; b++) { // lines along u
      const p = [-N - 4, b], q = [N + 4, b];
      ctx.moveTo(SX(p), SY(p)); ctx.lineTo(SX(q), SY(q));
    }
    for (let a = -N - 3; a <= N + 3; a++) { // lines along v
      const p = [a, -N], q = [a, N];
      ctx.moveTo(SX(p), SY(p)); ctx.lineTo(SX(q), SY(q));
    }
    for (let s = -N - 3; s <= N + 3; s++) { // lines along u−v (constant a+b)
      const p = [s + N, -N], q = [s - N, N];
      ctx.moveTo(SX(p), SY(p)); ctx.lineTo(SX(q), SY(q));
    }
    ctx.stroke();

    const path = (poly) => {
      ctx.beginPath();
      poly.forEach((p, i) => (i === 0 ? ctx.moveTo(SX(p), SY(p)) : ctx.lineTo(SX(p), SY(p))));
      ctx.closePath();
    };

    const tag = (text, X, Y, color = INK_SOFT, weight = 600, size = 12, serif = false) => {
      ctx.save();
      ctx.font = serif
        ? `${weight} ${size}px "Iowan Old Style", Palatino, Georgia, serif`
        : `${weight} ${size}px ui-monospace, "SF Mono", Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(251,251,248,0.9)';
      ctx.fillRect(X - tw / 2 - 4, Y - size / 2 - 3, tw + 8, size + 6);
      ctx.fillStyle = color;
      ctx.fillText(text, X, Y);
      ctx.restore();
    };

    /* ---- the mystery outline (challenge only) ---------------------------- */
    if (S.calib && S.target) {
      const o = outline(S.target.cells);
      if (o.ok) {
        ctx.save();
        ctx.fillStyle = 'rgba(91,107,123,0.07)';
        path(simplify(o.cycle));
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(91,107,123,0.85)';
        ctx.setLineDash([7, 6]);
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
      }
    }

    /* ---- fills, one per piece -------------------------------------------- */
    for (const p of S.model.groups.flatMap((g) => g.ids)) {
      const piece = pieces.find((x) => x.id === p);
      if (!piece) continue;
      for (const c of pieceCells(piece)) {
        path(cellVerts(...c));
        ctx.fillStyle = piece.id === S.selected ? FILL_SEL : FILL;
        ctx.fill();
      }
    }

    /* ---- seams: the sides that went inside ------------------------------- */
    const fuse = fuseRef.current;
    let seamAlpha = 1;
    if (fuse.on) {
      const t = Math.min(1, (performance.now() - fuse.t0) / 700);
      seamAlpha = 0.15 + 0.85 * (t < 0.5 ? 1 - t * 2 : (t - 0.5) * 2);
    }
    if (!S.hideSeams) {
      ctx.save();
      ctx.globalAlpha = seamAlpha;
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = SEAM;
      ctx.lineCap = 'round';
      for (const g of S.model.groups) {
        if (!g.joined || !g.seamEdges.length) continue;
        ctx.beginPath();
        for (const [a, b] of g.seamEdges) {
          ctx.moveTo(sx(wx(a[0], a[1])), sy(wy(a[1])));
          ctx.lineTo(sx(wx(b[0], b[1])), sy(wy(b[1])));
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ---- the outline of every group.  CARMINE = this is one shape now. ---- */
    for (const g of S.model.groups) {
      if (!g.ok || !g.poly) continue;
      const isWhole = g.joined;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineWidth = isWhole ? 3.2 : 2.8;
      ctx.strokeStyle = isWhole ? CARMINE : INK_SOFT;
      if (isWhole && fuse.on) {
        const t = Math.min(1, (performance.now() - fuse.t0) / 700);
        ctx.lineWidth = 3.2 + 3 * (1 - t);
      }
      path(g.poly);
      ctx.stroke();
      ctx.restore();

      /* The label — a word, not a number, and only for a joined whole.  It sits
         BELOW the shape, never across it: the seams are the thing to look at on
         every step, and a caption with a paper backing would cover the one
         detail the lesson is about. */
      if (isWhole) {
        let cx = 0, minY = Infinity;
        for (const p of g.poly) { cx += wx(p[0], p[1]); minY = Math.min(minY, wy(p[1])); }
        cx /= g.poly.length;
        tag(g.label, sx(cx), Math.min(sy(minY) + 16, Hpx - 12), CARMINE, 600, 15, true);
      }
    }

    /* ---- selection ring on the handle of the selected piece -------------- */
    if (S.selected != null) {
      const piece = pieces.find((x) => x.id === S.selected);
      if (piece) {
        const cs = pieceCells(piece);
        let cx = 0, cy = 0, n = 0;
        for (const c of cs) for (const v of cellVerts(...c)) { cx += wx(v[0], v[1]); cy += wy(v[1]); n++; }
        cx /= n; cy /= n;
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx(cx), sy(cy), 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,30,79,0.18)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx(cx), sy(cy), 3.5, 0, Math.PI * 2);
        ctx.fillStyle = CARMINE;
        ctx.fill();
        ctx.restore();
      }
    }
  }, [pieces]);

  useEffect(() => { draw(); }, [draw, model, selected, hideSeams, target, step]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* the fuse animation — time-based, opt-out under reduced motion, and the NAME
     never depends on it (it is computed from state; this only dims seams). */
  useEffect(() => {
    if (!fuseRef.current.on) return;
    let raf;
    const loop = () => {
      const t = (performance.now() - fuseRef.current.t0) / 700;
      draw();
      if (t < 1) raf = requestAnimationFrame(loop);
      else { fuseRef.current.on = false; draw(); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sig, draw]);

  /* ---- each step reseeds the bench and resets its lens ------------------- */
  useEffect(() => {
    setPieces(seedFor(step));
    setSelected(null);
    setHideSeams(false);
    setRecipe(0);
    if (STEPS[step].calib) setTarget((t) => t || makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- moving a piece ---------------------------------------------------- */
  const legal = (next) => {
    const seen = new Set();
    for (const p of next) {
      const cs = pieceCells(p);
      if (!inBounds(cs)) return false;
      for (const c of cs) {
        const k = ck(...c);
        if (seen.has(k)) return false; // overlap
        seen.add(k);
      }
    }
    return true;
  };
  const tryUpdate = (id, patch) => {
    const next = pieces.map((p) => (p.id === id ? { ...p, ...patch } : p));
    if (!legal(next)) {
      setBlocked(true);
      setTimeout(() => setBlocked(false), 420);
      return false;
    }
    setPieces(next);
    return true;
  };

  /* pointer → the lattice cell under it (exact enough for hit-testing: it only
     picks WHICH piece you grabbed; where it lands is integer arithmetic). */
  const cellAt = (e) => {
    const r = stageRef.current.getBoundingClientRect();
    const x = WORLD.xmin + ((e.clientX - r.left) / r.width) * (WORLD.xmax - WORLD.xmin);
    const y = WORLD.ymax - ((e.clientY - r.top) / r.height) * (WORLD.ymax - WORLD.ymin);
    const b = (2 * y) / SQ3;
    const a = x - y / SQ3;
    const A = Math.floor(a), B = Math.floor(b);
    return [A, B, a - A + (b - B) < 1 ? UP : DOWN];
  };

  const onPointerDown = (e) => {
    const c = cellAt(e);
    const key = ck(...c);
    const hit = pieces.find((p) => pieceCells(p).some((x) => ck(...x) === key));
    if (!hit) { setSelected(null); return; }
    setSelected(hit.id);
    dragRef.current = { id: hit.id, from: [c[0], c[1]], base: [...hit.pos] };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const c = cellAt(e);
    const pos = [d.base[0] + (c[0] - d.from[0]), d.base[1] + (c[1] - d.from[1])];
    const p = pieces.find((x) => x.id === d.id);
    if (!p || (p.pos[0] === pos[0] && p.pos[1] === pos[1])) return;
    tryUpdate(d.id, { pos });
  };
  const onPointerUp = (e) => {
    dragRef.current = null;
    e.currentTarget?.releasePointerCapture?.(e.pointerId);
  };

  /* keyboard parity: pick with 1-9, slide with the arrows, turn with R, and
     take a piece off with Delete.  Native buttons mirror every one of these. */
  const onKeyDown = (e) => {
    if (/^[1-9]$/.test(e.key)) {
      const p = pieces[parseInt(e.key, 10) - 1];
      if (p) { setSelected(p.id); e.preventDefault(); }
      return;
    }
    if (selected == null) return;
    const p = pieces.find((x) => x.id === selected);
    if (!p) return;
    const slide = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (slide) {
      tryUpdate(selected, { pos: [p.pos[0] + slide[0], p.pos[1] + slide[1]] });
      e.preventDefault();
    } else if (e.key === 'r' || e.key === 'R') {
      tryUpdate(selected, { rot: (p.rot + 1) % 6 });
      e.preventDefault();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      setPieces((ps) => ps.filter((x) => x.id !== selected));
      setSelected(null);
      e.preventDefault();
    }
  };

  /* ---- the kit tray ------------------------------------------------------ */
  /* Where a piece from the kit lands: tried from the outside in, and the first
     spot that is legal for THIS piece wins — so a hexagon never appears on top
     of what the student is building. */
  const PARK = [[2, 0], [-2, 0], [0, 2], [0, -2], [2, -2], [-2, 2], [2, -1], [-2, 1], [1, 1], [-1, -1]];
  const addPiece = (kind) => {
    for (const spot of PARK) {
      const cand = mk({ kind, pos: spot, rot: 0 });
      if (legal([...pieces, cand])) {
        setPieces((ps) => [...ps, cand]);
        setSelected(cand.id);
        return;
      }
    }
    setBlocked(true);
    setTimeout(() => setBlocked(false), 420);
  };

  const playRecipe = (i) => {
    setRecipe(i);
    setPieces(RECIPES[i].pieces.map(mk));
    setSelected(null);
  };

  const choose = (i) => {
    if (answers[step] != null) return;
    setAnswers((a) => ({ ...a, [step]: i }));
  };
  const goNext = () => setStep((n) => Math.min(STEPS.length - 1, n + 1));
  const goBack = () => setStep((n) => Math.max(0, n - 1));
  const restart = () => {
    setStep(0); setAnswers({}); setTarget(null);
    setPieces(seedFor(0)); setSelected(null); setHideSeams(false);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);
  const selPiece = pieces.find((p) => p.id === selected);

  const aria = (() => {
    const bits = [`${pieces.length} pieces on the paper.`, headline + '.'];
    if (showLedger)
      bits.push(
        `${named.pieceSides} sides among the pieces, ${named.seams} ${named.seams === 1 ? 'seam' : 'seams'}, ` +
        `${named.sides} on the outline.`
      );
    if (calib && target) bits.push(`Challenge: ${match.missing} cells still to cover, ${match.stray} sticking out.`);
    return bits.join(' ');
  })();

  return (
    <div className="cslab">
      <header className="head">
        <h1>Composing shapes</h1>
        <p className="lede">
          Put two shapes together with <em>full sides touching</em> and you do not have two shapes any
          more — you have <em>one</em>, and the sides that met are inside it now, as a{' '}
          <span className="mono">seam</span>. Every seam swallows two sides, which is how six
          triangles carrying 18 sides between them come out as a hexagon showing 6. Build up a kit of
          your own shapes, then discover the thing that makes composing worth knowing: the{' '}
          <em>same outline can be filled in completely different ways</em>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation" aria-hidden="true">
              <span className={'eq' + (named && named.joined ? ' accent-ink' : '')}>{headline}</span>
              {showLedger && (
                <span className="eq ledger mono">
                  {named.pieceSides} sides {'−'} 2 × {named.seams} {named.seams === 1 ? 'seam' : 'seams'} ={' '}
                  <b>{named.sides}</b> on the outline
                </span>
              )}
            </p>
          </div>

          <div
            className={'stage' + (blocked ? ' blocked' : '')}
            ref={stageRef}
            role="application"
            tabIndex={0}
            aria-label={aria}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {blocked ? 'no room there' : 'drag a piece — or pick with 1-9, move with ↑↓←→, turn with R'}
            </span>
          </div>

          {/* the kit — one new piece per step, and each is a shape you composed */}
          <div className="kit" role="group" aria-label="Your kit of pieces">
            {KIT.map((k) => {
              const open = step >= k.unlock;
              return (
                <button
                  type="button"
                  key={k.kind}
                  className={'block' + (open ? '' : ' locked')}
                  disabled={!open}
                  onClick={() => addPiece(k.kind)}
                  aria-label={open ? `Add a ${k.label}` : `${k.label} locked until step ${k.unlock + 1}`}
                >
                  <Glyph kind={k.kind} />
                  <span className="block-label">{k.label}</span>
                  {!open && <span className="lock mono">🔒 step {k.unlock + 1}</span>}
                </button>
              );
            })}
          </div>

          <div className="toolbar">
            <button type="button" className="btn ghost" disabled={!selPiece}
              onClick={() => selPiece && tryUpdate(selPiece.id, { rot: (selPiece.rot + 1) % 6 })}>
              Turn ↻
            </button>
            <button type="button" className="btn ghost" disabled={!selPiece}
              onClick={() => { setPieces((ps) => ps.filter((p) => p.id !== selected)); setSelected(null); }}>
              Take off
            </button>
            <button type="button" className={'btn ghost' + (hideSeams ? ' on' : '')}
              onClick={() => setHideSeams((v) => !v)}>
              {hideSeams ? 'Seams hidden' : 'Hide the seams'}
            </button>
            <button type="button" className="btn ghost" onClick={() => { setPieces([]); setSelected(null); }}>
              Clear the paper
            </button>
            <button type="button" className="btn ghost" onClick={() => { setPieces(seedFor(step)); setSelected(null); }}>
              Reset this step
            </button>
          </div>

          {current.title === 'One outline, many recipes' && (
            <div className="recipes" role="group" aria-label="Recipes for the same hexagon">
              {RECIPES.map((r, i) => (
                <button type="button" key={r.name}
                  className={'chip' + (recipe === i ? ' on' : '')}
                  onClick={() => playRecipe(i)}>
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ---------- TUTOR ---------- */}
        <aside className="panel tutor">
          <div className="progress" role="list" aria-label="Lesson progress">
            {STEPS.map((_, i) => (
              <span key={i} role="listitem"
                className={'pip' + (i === step ? ' cur' : '') + (i < step ? ' done' : '')}
                aria-current={i === step ? 'step' : undefined} />
            ))}
          </div>

          <p className="eyebrow small">Step {step + 1} of {STEPS.length}</p>
          <h2>{current.title}</h2>
          {current.kit && <p className="unlocked mono">+ {current.kit} added to your kit</p>}
          <p className="body">{current.body}</p>

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((c, i) => {
                  const chosen = answers[step];
                  let cls = 'choice';
                  if (chosen != null) {
                    if (i === current.answer) cls += ' correct';
                    else if (chosen === i) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
                      <span className="mark" aria-hidden="true">
                        {chosen != null && i === current.answer ? '✓' : chosen === i ? '✕' : ''}
                      </span>
                      {c}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {calib && target && (
            <div className="calib">
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: match.pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">filled&nbsp;{match.pct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {match.missing > 0 && `${match.missing} to cover`}
                    {match.missing > 0 && match.stray > 0 && ' · '}
                    {match.stray > 0 && `${match.stray} sticking out`}
                  </span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={() => { setTarget(makeTarget(target)); setPieces([]); setSelected(null); }}>
                New outline
              </button>
              <p className="sr-live" aria-live="polite">
                {calibrated ? 'Calibrated. Your pieces fill the outline exactly.' : ''}
              </p>
            </div>
          )}

          <div className="nav">
            <button type="button" className="btn ghost" onClick={goBack} disabled={step === 0}>← Back</button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn" onClick={goNext} disabled={!canNext}>
                {hasQuestion && !answered ? 'Answer to continue' : 'Next →'}
              </button>
            ) : (
              <button type="button" className="btn" onClick={restart}>Restart lab</button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono accent-ink">outline = pieces’ sides − 2 × seams</span> &nbsp;·&nbsp; join
        full sides and the sides that meet go inside · CCSS K.G.B.6 · 1.G.A.2
      </footer>

      <style jsx>{`
        .cslab {
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
        .mono { font-family: var(--mono); }
        .accent-ink { color: var(--curve); }
        .eyebrow {
          font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase;
          color: var(--ink-soft); margin: 0 0 6px;
        }
        .eyebrow.small { margin: 0 0 4px; }
        h1 {
          font-family: var(--serif); font-weight: 600;
          font-size: clamp(26px, 4vw, 34px); margin: 0 0 6px;
        }
        .lede { color: var(--ink-soft); margin: 0 0 22px; max-width: 68ch; }
        .lede em { color: var(--ink); font-style: italic; }
        .bench {
          display: grid; grid-template-columns: minmax(0, 1fr) 340px;
          gap: 22px; align-items: start;
        }
        @media (max-width: 920px) { .bench { grid-template-columns: 1fr; } }
        .panel {
          background: #fff; border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px; box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel { padding: 14px; }
        .stage-head { margin-bottom: 10px; min-height: 38px; }
        .equation { margin: 0; display: flex; flex-direction: column; gap: 3px; }
        .eq {
          font-family: var(--mono); font-variant-numeric: tabular-nums;
          font-size: 14px; font-weight: 600;
        }
        .ledger { color: var(--ink-soft); font-size: 12.5px; font-weight: 400; }
        .ledger b { color: var(--curve); }
        .stage {
          position: relative; width: min(100%, 560px); aspect-ratio: 1 / 1;
          margin: 0 auto; border: 1px solid var(--quad); border-radius: 8px;
          overflow: hidden; touch-action: none; cursor: grab;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
          transition: border-color 0.15s;
        }
        .stage.blocked { border-color: var(--curve); }
        .stage:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
        .stage canvas { display: block; width: 100%; height: 100%; }
        .hint {
          position: absolute; left: 10px; bottom: 9px; font-size: 11px;
          color: var(--ink-soft); background: #fbfbf8;
          padding: 3px 7px; border: 1px solid #c7d0d7;
          border-radius: 5px; pointer-events: none;
        }
        .kit {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 10px; margin: 14px 4px 2px;
        }
        .block {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 10px 6px 8px; border: 1px solid rgba(28, 43, 58, 0.18);
          border-radius: 10px; background: var(--paper); cursor: pointer;
          transition: border-color 0.15s, background 0.15s, opacity 0.15s;
        }
        .block:not(:disabled):hover { border-color: var(--curve); background: rgba(200, 30, 79, 0.04); }
        .block.locked {
          opacity: 1; cursor: not-allowed; border-color: #a8b3bd;
          background: #eef1f3; color: #445565;
        }
        .block-label { font-size: 12px; font-weight: 600; }
        .lock { font-size: 9.5px; color: var(--ink-soft); }
        .toolbar { margin: 14px 4px 2px; display: flex; gap: 9px; flex-wrap: wrap; }
        .recipes { margin: 12px 4px 2px; display: flex; gap: 8px; flex-wrap: wrap; }
        .chip {
          font: 600 12px/1 var(--mono); padding: 8px 11px; border-radius: 20px;
          border: 1px solid rgba(28, 43, 58, 0.2); background: var(--paper);
          color: var(--ink); cursor: pointer; transition: all 0.15s;
        }
        .chip:hover { border-color: var(--ink); }
        .chip.on { background: var(--curve); border-color: var(--curve); color: #fff; }
        .btn {
          font: 600 13px/1 system-ui, sans-serif; padding: 9px 14px; border-radius: 8px;
          cursor: pointer; border: 1px solid var(--ink); background: var(--ink); color: #fff;
          transition: background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
        }
        .btn.ghost { background: transparent; color: var(--ink); }
        .btn.ghost.on { background: var(--curve); border-color: var(--curve); color: #fff; }
        .btn:disabled {
          opacity: 1; cursor: not-allowed; border-color: #a8b3bd;
          background: #e4e8eb; color: #334250;
        }
        .btn:not(:disabled):hover { filter: brightness(1.08); }
        .tutor { padding: 18px 20px 20px; }
        .progress { display: flex; gap: 6px; margin-bottom: 14px; }
        .pip { height: 5px; flex: 1; border-radius: 3px; background: rgba(28, 43, 58, 0.14); }
        .pip.done { background: rgba(200, 30, 79, 0.45); }
        .pip.cur { background: var(--curve); }
        h2 {
          font-family: var(--serif); font-weight: 600; font-size: 20px;
          margin: 0 0 10px; padding-bottom: 9px;
          border-bottom: 3px double rgba(200, 30, 79, 0.45);
        }
        .unlocked {
          font-size: 11px; color: var(--curve); font-weight: 600;
          margin: 0 0 8px; letter-spacing: 0.02em;
        }
        .body { margin: 0 0 16px; font-size: 14.5px; }
        .quiz { margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(28, 43, 58, 0.1); }
        .q { font-size: 14px; font-weight: 600; margin: 0 0 10px; }
        .choices { display: grid; gap: 7px; }
        .choice {
          text-align: left; font: 13.5px/1.4 system-ui, sans-serif;
          padding: 9px 11px 9px 30px; border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 8px; background: var(--paper); color: var(--ink);
          cursor: pointer; position: relative; transition: border-color 0.15s, background 0.15s;
        }
        .choice:not(:disabled):hover { border-color: var(--ink); }
        .choice .mark { position: absolute; left: 10px; font-weight: 700; }
        .choice.correct { border-color: var(--ok); background: rgba(31, 138, 91, 0.08); }
        .choice.correct .mark { color: var(--ok); }
        .choice.wrong { border-color: var(--ink-soft); background: rgba(91, 107, 123, 0.08); }
        .choice.wrong .mark { color: var(--ink-soft); }
        .choice.dim {
          opacity: 1; border-color: #a8b3bd;
          background: #f1f3f4; color: #445565;
        }
        .choice:disabled { cursor: default; }
        .feedback {
          margin: 12px 0 0; font-size: 13px; line-height: 1.55; color: var(--ink);
          background: rgba(200, 30, 79, 0.05); border-left: 3px solid var(--curve);
          padding: 10px 12px; border-radius: 0 6px 6px 0;
        }
        .calib {
          margin-top: 16px; padding-top: 14px;
          border-top: 1px solid rgba(28, 43, 58, 0.1); display: grid; gap: 10px;
        }
        .meter { height: 12px; border-radius: 6px; background: rgba(28, 43, 58, 0.1); overflow: hidden; }
        .meter-fill {
          height: 100%; background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--curve));
          transition: width 0.12s ease-out;
        }
        .meter-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; gap: 8px; }
        .target-hint { color: var(--ink-soft); font-size: 12px; }
        .stamp {
          font: 700 12px/1 var(--mono); letter-spacing: 0.16em; color: var(--ok);
          border: 2px solid var(--ok); border-radius: 6px; padding: 4px 8px; transform: rotate(-3deg);
        }
        .sr-live {
          position: absolute; width: 1px; height: 1px; overflow: hidden;
          clip: rect(0 0 0 0); white-space: nowrap; margin: 0;
        }
        .nav { margin-top: 20px; display: flex; justify-content: space-between; gap: 10px; }
        .foot { margin-top: 24px; font-size: 12.5px; color: var(--ink-soft); }
        :global(.cslab) :focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px; }
        @media (max-width: 460px) {
          .kit { grid-template-columns: repeat(2, 1fr); }
        }
        @media (prefers-reduced-motion: reduce) {
          .btn, .meter-fill, .choice, .chip, .block, .stage { transition: none; }
        }
      `}</style>
    </div>
  );
}

/* A tiny picture of each kit piece, drawn from the SAME cell data the model
   uses — so a tray button can never advertise a shape the piece is not. */
function Glyph({ kind }) {
  const cells = KIND[kind].cells;
  const pts = [];
  for (const c of cells) for (const v of cellVerts(...c)) pts.push([wx(v[0], v[1]), wy(v[1])]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX || 1, h = maxY - minY || 1;
  const S = 26 / Math.max(w, h);
  const px = (x) => (x - (minX + maxX) / 2) * S + 16;
  const py = (y) => -(y - (minY + maxY) / 2) * S + 14;
  const o = outline(cells);
  const poly = o.ok ? simplify(o.cycle) : [];
  const d = poly.map((p, i) => `${i ? 'L' : 'M'}${px(wx(p[0], p[1])).toFixed(1)},${py(wy(p[1])).toFixed(1)}`).join(' ') + ' Z';
  return (
    <svg width="32" height="28" viewBox="0 0 32 28" aria-hidden="true">
      <path d={d} fill="rgba(199,216,228,0.6)" stroke="#5B6B7B" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
