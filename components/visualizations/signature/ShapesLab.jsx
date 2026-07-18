'use client';

/* ============================================================================
   ShapesLab — an interactive "bench" for the very first idea in geometry:
   a shape has a NAME, the name comes from its ATTRIBUTES, and some attributes
   don't get a vote.

   ONE shape sits on the paper.  Six dials touch it.  Three of them can change
   its name; three of them provably cannot — and that is the whole lab:

     THE NAME IS A FUNCTION OF THE DEFINING ATTRIBUTES ONLY.
     Turn it, grow it, paint it — the name does not move.
     Change how many straight sides it has, whether they are all equal, or
     whether it closes — and the name changes at once.

   Turn a square 45° and a child will call it a "diamond".  It is a square.  It
   was a square the whole way round, and this lab makes that impossible to
   miss: the right-angle marks and the equal-side ticks are WELDED to the shape
   and ride around with it, while the name plate up top never flinches through
   a full revolution.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at Kindergarten
   through Grade 2.  Anchor standards:
     • CCSS K.G.A.2  — "Correctly name shapes regardless of their orientations
       or overall size."   ← the turn dial and the size dial ARE this standard.
     • CCSS 1.G.A.1  — "Distinguish between defining attributes (e.g., triangles
       are closed and three-sided) versus non-defining attributes (e.g., color,
       orientation, overall size)."   ← the two-kind panel IS this standard.
     • CCSS K.G.B.4  — analyze/compare shapes by their parts (number of sides
       and vertices/"corners") and other attributes (sides of equal length).
     • CCSS 2.G.A.1  — recognize and draw shapes having specified attributes
       (a given number of sides/angles).   ← the clue-card challenge.
   Also MP7 (look for and make use of structure) and MP6 (attend to precision:
   the name is precise, the picture's pose is not).

   ---------------------------------------------------------------------------
   DISTINCTNESS — what this lab refuses to draw, and why
   ---------------------------------------------------------------------------
   "Shapes" sounds like open ground and is not: this library already teaches
   plane figures from five directions, and every obvious picture for this topic
   was already somebody's centerpiece.  What is left — and it turned out to be
   the standard itself — is the NAME FUNCTION and what it ignores.

     • SortLab (K-2, the closest sibling) owns BINS and the idea that the SAME
       objects REGROUP when you change the attribute.  So there are NO BINS
       here, no tray of nine objects, no counting of a collection, and no
       "guess the secret rule".  Sort asks "which group does each object fall
       in?".  This lab asks "what is this ONE shape called, and which dials is
       the name even allowed to listen to?"  Sort classifies many objects by an
       attribute; this lab NAMES one object from its attributes.
     • QuadrilateralLab owns the four-sided family, the 360° angle sum, the
       square▸rectangle▸rhombus▸parallelogram precedence, and direct vertex
       dragging.  So this lab does NOT drag vertices (a K-1 child does not build
       shapes from points), does NOT draw the family hierarchy, and does NOT sum
       angles.  Its universe deliberately runs ACROSS shape classes — round, 3,
       4, 5, 6 — which is exactly K.G.A.2's job and not the quadrilateral
       hierarchy's.
     • ParallelogramLab owns the HALF-TURN — a ghost rotated 180° about the
       centre that lands exactly on itself, proving point symmetry.  This lab
       also rotates, and must not be confused with it: here the shape rotates
       and does NOT land on itself; a grey ghost stays behind at 0° precisely so
       you can see it MOVED.  Their claim is "the shape maps to itself"; ours is
       "the shape moved and the NAME did not".
     • TriangleLab (angle sum 180°, tear-the-corners), RectangleLab (perimeter
       vs area, "same fence different room"), TrapezoidLab (the doubling proof),
       CircleLab (centre-radius equation) each own their figure's theorem.  This
       lab computes no area, no perimeter, no angle sum, and no equation.
     • CountingLab owns counting a COLLECTION (K.CC — one-to-one, cardinality).
       Counting this shape's own PARTS (sides and corners) is K.G.B.4, a
       different standard: there is no collection here, only one figure's parts.
     • PointLab owns the coordinate plane.  The quadrille here is PAPER, not a
       plane: there are no axes, no coordinates and no origin on the canvas.

   THE REFUSALS ARE ENFORCED IN THE AUDIT, NOT IN THIS COMMENT.  audit-shapes.mjs
   greps this source for bins/vertex-drag/area/perimeter/angle-sum and fails the
   build if they reappear.  A distinctness promise written only in prose is a
   promise you will break.

   ---------------------------------------------------------------------------
   THE CENTRAL THEOREM, ENFORCED STRUCTURALLY
   ---------------------------------------------------------------------------
   nameOf(sides, equal, closed) takes the three DEFINING attributes and nothing
   else.  `turn`, `size` and `fill` are not parameters, are not in scope, and
   cannot be read.  The name is invariant under them BY CONSTRUCTION, not by
   care.  audit-shapes.mjs greps the function's own source text for \bturn\b,
   \bsize\b, \bfill\b and fails if any appears — so the lab's central claim is a
   property of the code's shape, not of its prose.

   The audit then proves the same thing the long way, geometrically: rotation
   and uniform scaling are isometries/similarities, so they preserve every
   defining attribute (side count, corner count, side-length equality classes,
   right angles) to 1e-9 — measured on the ACTUAL generated vertices, over every
   state × every turn × every size.  The name is invariant because the geometry
   is, not because a lookup table says so.

   ---------------------------------------------------------------------------
   HOUSE STYLE
   ---------------------------------------------------------------------------
   interactive-math-bench: state → model → render, quadrille-paper canvas, DPI
   aware, full redraw from state, time-based animation, native form controls,
   dials that unlock one per lesson step, predict-then-check questions (Next
   gates on ANSWERED, not correct), and a calibration challenge with a live
   meter and a CALIBRATED stamp that is provably impossible to fire falsely.

   ONE-ACCENT DISCIPLINE, and the one PRINCIPLED relaxation:
     • CARMINE = THE SHAPE.  Its outline is carmine at every moment, in every
       state — that is the mathematical object.  The name plate is carmine too.
     • BLUE (#2d5f8c) = THE ATTRIBUTE BADGES — corner dots, side ticks,
       right-angle marks, the gap bracket.  The measuring apparatus, never the
       shape.  (Same second-tint role as RectangleLab / ParallelogramLab.)
     • GREY = the ghost left behind at 0°, and the challenge's target card.
     • GREEN = "correct" and "CALIBRATED" only.
     • THE FILL COLOUR IS A DIAL.  This is the relaxation, and it is the lesson:
       the fill is adjustable PRECISELY BECAUSE IT IS NOISE.  1.G.A.1 names
       colour as the archetypal non-defining attribute, so the lab has to let a
       child paint the shape and watch the name refuse to care.  The carmine
       STROKE never changes, so carmine still means "the shape"; only the dead
       space inside it takes the paint.  The swatches are deliberately muted so
       the carmine outline and the blue badges always read on top.

   EXACT MATH — no K-2 child ever meets a float artefact:
     • every number this lab SHOWS a child is an exact integer: the count of
       straight sides, the count of corners, the turn in whole degrees, the size
       step, the tick-group numbers, and the challenge meter's "3 of 4 clues".
     • the name is a STRING chosen by exact integer/boolean tests — never a
       measurement, never a threshold.
     • CALIBRATED fires on EXACT equality of the defining triple, so it cannot
       fire on a float coincidence, and — proven by exhaustive sweep — it fires
       for EVERY turn, size and colour, which is the lesson wearing the gate's
       clothes.

   THE STRETCH FACTOR IS 2, AND THAT IS A CORRECTNESS DECISION, NOT A TASTE ONE:
     a stretched regular n-gon must never accidentally own a right angle it is
     not told about.  At STRETCH=1.5 the stretched pentagon's corners land on
     89.86° — 0.14° from square — and the right-angle badge would fire on a
     PENTAGON.  At STRETCH=1.75 the stretched triangle's apex lands on 90.59°,
     and at exactly √3≈1.732 it is a true right triangle.  At STRETCH=2 every
     non-square corner in the whole state space sits at least 8.2° away from 90°
     while the 4-gon's four corners stay exactly 90.000° at every turn.  The
     audit re-proves this margin rather than trusting this paragraph.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   MODEL — pure mathematics.  Knows nothing about pixels, React, or the DOM.
   ------------------------------------------------------------------------- */

/** The five positions of the "straight sides" dial.  0 means ROUND — that is
 *  the honest answer to "how many straight sides does a circle have?", so the
 *  dial itself is the defining attribute rather than a proxy for it. */
const SIDE_STOPS = [0, 3, 4, 5, 6];

/**
 * The stretch RATIO applied when `equal` is off — long axis : short axis.
 * See the header: 2 is the only value that keeps every non-square corner clear
 * of 90°, so it is a correctness decision and not a taste one.
 *
 * It is applied as (√2, 1/√2) rather than (2, 1) — same 2:1 shape, but the long
 * axis grows less and the short axis gives way, which keeps the biggest state
 * (a stretched circle at maximum size) from dictating a world so large that
 * every other shape is drawn tiny.  This CANNOT touch the mathematics: scaling
 * by (kx, ky) is a uniform scale composed with a stretch of kx/ky = 2, and a
 * uniform scale preserves every angle — so the corner-angle margins are exactly
 * those of a (2, 1) stretch.  The audit measures them rather than trusting this.
 */
const STRETCH = 2;
const STRETCH_X = Math.sqrt(STRETCH);
const STRETCH_Y = 1 / Math.sqrt(STRETCH);

/** Turn dial: whole degrees, 15° apart.  24 stops make a full revolution and
 *  include 45° (the "diamond" moment) and 90° (the square landing on itself). */
const TURN_STEP = 15;
const TURN_STOPS = 360 / TURN_STEP; // 24

/** Size dial: 5 whole steps.  The worst case — a stretched circle at size 5,
 *  turned so its long axis points any way it likes — has half-extent
 *  radiusFor(5) * √2 = 6.8 * 1.414 = 9.62 < WORLD_R, so the shape can never
 *  leave the paper at any pose.  (The audit re-derives this bound by sweeping
 *  every state rather than trusting the arithmetic here.) */
const SIZE_MIN = 1;
const SIZE_MAX = 5;
const radiusFor = (size) => 2.8 + 0.8 * size;

/** Fill swatches.  Four, not a full paintbox: the lesson is "the colour cannot
 *  matter", which one flip proves as well as twenty.  Muted on purpose, so the
 *  carmine outline and the blue badges stay legible on top of every one. */
const FILLS = [
  { id: 'none', label: 'none', css: 'rgba(0,0,0,0)', chip: '#fbfbf8' },
  { id: 'butter', label: 'butter', css: '#f6df8c', chip: '#f6df8c' },
  { id: 'mint', label: 'mint', css: '#a8d8c0', chip: '#a8d8c0' },
  { id: 'lilac', label: 'lilac', css: '#c9bee4', chip: '#c9bee4' },
];
const fillCss = (id) => (FILLS.find((f) => f.id === id) || FILLS[0]).css;

const WORLD_R = 10;

/**
 * Where the first vertex sits, so each shape meets a child in the pose the
 * textbook draws it in at turn = 0:
 *   n=3 → point up, flat base       n=4 → flat top (an axis-aligned square)
 *   n=5 → point up                  n=6 → flat top and bottom (honeycomb)
 * This is PRESENTATION at turn 0 only; it can't touch the name.
 */
function phaseFor(n) {
  if (n === 4) return 45;
  if (n === 6) return 0;
  return 90;
}

/**
 * THE NAME FUNCTION — the mathematical heart of this lab.
 *
 * It takes the three DEFINING attributes and NOTHING else.  How the shape is
 * turned, how big it is drawn, and what colour it is painted are not arguments
 * to this function, are not in its scope, and cannot be consulted.  The name's
 * invariance under them is therefore structural, not careful.
 *
 * (audit-shapes.mjs greps this function's source for \bturn\b, \bsize\b and
 * \bfill\b and fails if it finds them.  Note `return` contains the letters of
 * "turn" — the audit uses word boundaries, which is exactly why it must.)
 *
 * @param {number} sides  count of straight sides; 0 means round
 * @param {boolean} equal are all the sides the same length?
 * @param {boolean} closed does the outline come back to where it started?
 * @returns {{name: string, specific: string|null, note: string|null}}
 */
function nameOf(sides, equal, closed) {
  if (!closed) {
    return {
      name: 'not a closed shape',
      specific: null,
      note: 'The outline never closes.',
    };
  }
  if (sides === 0) {
    if (equal) {
      return {
        name: 'circle',
        specific: null,
        note: 'the same across every way',
      };
    }
    return {
      name: 'oval',
      specific: 'an ellipse',
      // "Wider than it is tall" would be a LIE at turn 90°, where this very
      // shape is 6 across and 12 up.  Every sentence this function returns is
      // read aloud beside a shape that may be turned any way at all, so the
      // prose has to be as pose-blind as the name is.  (The audit greps these
      // strings for pose words; it is how the original wording was caught.)
      note: 'longer one way',
    };
  }
  if (sides === 3) {
    return {
      name: 'triangle',
      specific: equal ? 'an equilateral triangle' : 'an isosceles triangle',
      note: equal ? 'three equal sides' : 'three straight sides',
    };
  }
  if (sides === 4) {
    if (equal) {
      return {
        name: 'square',
        specific: null,
        note: 'four equal sides',
      };
    }
    return {
      name: 'rectangle',
      specific: null,
      note: 'sides not all equal',
    };
  }
  if (sides === 5) {
    return {
      name: 'pentagon',
      specific: equal ? 'a regular pentagon' : null,
      note: equal ? 'five equal sides' : 'five straight sides',
    };
  }
  return {
    name: 'hexagon',
    specific: equal ? 'a regular hexagon' : null,
    note: equal ? 'six equal sides' : 'six straight sides',
  };
}

/**
 * The shape's outline, as world points.
 *
 * ORDER OF OPERATIONS IS LOAD-BEARING: stretch in the shape's OWN frame, THEN
 * turn.  Doing it the other way — turning first and stretching in world space —
 * shears a turned square into a PARALLELOGRAM whose corners are no longer 90°,
 * which would quietly make the lab lie about its own centerpiece.  Stretch
 * first and the 4-gon's corners stay exactly 90° at every angle (audited).
 */
function outlineOf({ sides, equal, size, turn }) {
  const r = radiusFor(size);
  const kx = equal ? 1 : STRETCH_X;
  const ky = equal ? 1 : STRETCH_Y;
  const t = (turn * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);

  const n = sides === 0 ? 96 : sides; // a round shape is sampled finely for drawing
  const ph = (phaseFor(sides === 0 ? 3 : sides) * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = ph + (2 * Math.PI * i) / n;
    // local frame: unit shape, stretched along its OWN axes
    const lx = Math.cos(a) * kx * r;
    const ly = Math.sin(a) * ky * r;
    // then turned
    pts.push({ x: lx * cos - ly * sin, y: lx * sin + ly * cos });
  }
  return pts;
}

/** The edges actually drawn.  Closed → every edge.  Open → we drop the last
 *  edge (the one that would come home), leaving a real gap. */
function edgeCount(sides, closed) {
  if (sides === 0) return 1; // one curved edge (or one arc when open)
  return closed ? sides : sides - 1;
}

/** Corners = joins between two straight sides.
 *  Closed polygon: n vertices, all n are joins.
 *  Open path of n vertices: the two loose ends are endpoints, not corners, so
 *  there are n−2 joins.  (Open triangle: draw AB and BC, skip CA → the only
 *  corner is B.  3−2 = 1. ✓)  A round shape has no corners either way. */
function cornerCount(sides, closed) {
  if (sides === 0) return 0;
  return closed ? sides : sides - 2;
}

/** How many STRAIGHT sides the figure actually shows — the number the facts
 *  panel prints and the number a clue card asks about, from one definition so
 *  the two can never disagree.  A round shape has none, whatever else is true;
 *  an OPEN polygon shows one fewer than its dial, because the edge that would
 *  have come home is the one we dropped. */
function straightSides(sides, closed) {
  if (sides === 0) return 0;
  return edgeCount(sides, closed);
}

/** Side lengths of the drawn edges, in order (polygons only). */
function sideLengths(pts, sides, closed) {
  const m = edgeCount(sides, closed);
  const out = [];
  for (let i = 0; i < m; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    out.push(Math.hypot(b.x - a.x, b.y - a.y));
  }
  return out;
}

const LEN_TOL = 1e-6;

/**
 * Textbook equal-side tick marks: sides of equal length get the same number of
 * ticks, longest group gets 1.  Measured from the ACTUAL vertices, so the ticks
 * cannot disagree with the picture — and because a turn is an isometry, the
 * groups are identical at every angle (audited).
 */
function tickGroups(lengths) {
  const uniq = [];
  for (const L of lengths) {
    if (!uniq.some((u) => Math.abs(u - L) < LEN_TOL)) uniq.push(L);
  }
  uniq.sort((a, b) => b - a);
  return {
    groups: lengths.map((L) => uniq.findIndex((u) => Math.abs(u - L) < LEN_TOL) + 1),
    count: uniq.length,
  };
}

/**
 * Interior angle at each corner, in degrees.  Every shape this lab can build is
 * convex (a regular polygon, or one scaled along an axis — both convex), so the
 * stable atan2(|cross|, dot) form is always the interior angle and never needs
 * the signed/reflex machinery QuadrilateralLab requires.
 */
function cornerAngles(pts, sides, closed) {
  if (sides === 0) return [];
  const n = sides;
  const out = [];
  const from = closed ? 0 : 1;
  const to = closed ? n : n - 1;
  for (let i = from; i < to; i++) {
    const p = pts[(i - 1 + n) % n];
    const v = pts[i];
    const q = pts[(i + 1) % n];
    const e1 = { x: p.x - v.x, y: p.y - v.y };
    const e2 = { x: q.x - v.x, y: q.y - v.y };
    const deg =
      (Math.atan2(Math.abs(e1.x * e2.y - e1.y * e2.x), e1.x * e2.x + e1.y * e2.y) * 180) / Math.PI;
    out.push({ i, deg, v, p, q });
  }
  return out;
}

const RIGHT_TOL = 1e-6; // exact-90 only; the STRETCH=2 margin is 8.2°, not 0.5°

/* ---------------------------------------------------------------------------
   THE TWO KINDS OF ATTRIBUTE — 1.G.A.1 as data.
   `changesName` is the claim; the audit proves each row true by exhaustive
   sweep rather than taking this table's word for it.
   ------------------------------------------------------------------------- */
const ATTRS = [
  { id: 'sides', label: 'straight sides', changesName: true, step: 0 },
  { id: 'equal', label: 'sides all equal', changesName: true, step: 4 },
  { id: 'closed', label: 'closes up', changesName: true, step: 5 },
  { id: 'turn', label: 'the turn', changesName: false, step: 2 },
  { id: 'size', label: 'the size', changesName: false, step: 3 },
  { id: 'fill', label: 'the colour', changesName: false, step: 3 },
];
const DEFINING = ATTRS.filter((a) => a.changesName).map((a) => a.id);
const NON_DEFINING = ATTRS.filter((a) => !a.changesName).map((a) => a.id);

/* ---------------------------------------------------------------------------
   CALIBRATION — "build the shape on the clue card".
   The clue card lists DEFINING attributes only, so it is satisfied by any turn,
   any size and any colour.  The meter counts satisfied clues (exact integers);
   the stamp fires on exact equality of the defining triple.
   ------------------------------------------------------------------------- */

/** Every buildable, closed, defining state.  Round ignores the side count, so
 *  it is canonicalised to sides=0 and appears exactly twice (circle, oval). */
function allTargets() {
  const out = [{ sides: 0, equal: true }, { sides: 0, equal: false }];
  for (const s of [3, 4, 5, 6]) {
    out.push({ sides: s, equal: true });
    out.push({ sides: s, equal: false });
  }
  return out; // 10
}

/** The clue card for a target: only ever defining attributes.
 *  Each row carries the value it WANTS as data.  The prose is display only and
 *  is never parsed back — a clue must not be able to drift from its own test. */
function cluesFor(t) {
  const rows = [{ id: 'closed', text: 'it closes up', want: true }];
  if (t.sides === 0) {
    rows.push({ id: 'sides', text: 'no straight sides', want: 0 });
    rows.push({
      id: 'equal',
      text: t.equal ? 'same width every way' : 'longer one way',
      want: t.equal,
    });
  } else {
    rows.push({ id: 'sides', text: `${t.sides} straight sides`, want: t.sides });
    rows.push({ id: 'corners', text: `${t.sides} corners`, want: t.sides });
    rows.push({
      id: 'equal',
      text: t.equal ? 'all sides equal' : 'sides NOT all equal',
      want: t.equal,
    });
  }
  return rows;
}

/**
 * Is one clue row satisfied?  Exact integer/boolean tests only — no threshold,
 * no measurement, so no float coincidence can ever tick a clue.
 *
 * The counts are read through straightSides/cornerCount rather than off the
 * dial, so the card grades THE FIGURE ON THE PAPER, not the child's intent: an
 * open hexagon really does show 5 straight sides, and the "5 straight sides"
 * clue honestly ticks for it — while "5 corners" and "it closes all the way up"
 * both refuse, so the card as a whole still cannot be satisfied by it.  (The
 * audit proves that the whole card is satisfied if and only if the defining
 * triple matches, exhaustively over every state × every target.)
 */
function clueMet(row, st) {
  if (row.id === 'closed') return st.closed === row.want;
  if (row.id === 'sides') return straightSides(st.sides, st.closed) === row.want;
  if (row.id === 'corners') return cornerCount(st.sides, st.closed) === row.want;
  if (row.id === 'equal') return st.equal === row.want;
  return false;
}

/** The gate.  Exact equality of the defining triple — no threshold, no float.
 *  Round canonicalises so "a circle turned 30°" is the same defining state. */
function definingEqual(st, t) {
  if (!st.closed) return false;
  if (st.sides !== t.sides) return false;
  return st.equal === t.equal;
}

function targetKey(t) {
  return `${t.sides}:${t.equal ? 1 : 0}`;
}

/** Pick a new challenge: never the current shape, never the previous target. */
function newTarget(rnd, prev, cur) {
  const pool = allTargets().filter(
    (t) => (!prev || targetKey(t) !== targetKey(prev)) && !(cur && definingEqual(cur, t))
  );
  return pool[Math.floor(rnd() * pool.length)];
}

/* ---------------------------------------------------------------------------
   LESSON — the steps[].  One control unlocks per step.  Next gates on ANSWERED.
   ------------------------------------------------------------------------- */

const STEP_MEET = 0;
const STEP_PARTS = 1;
const STEP_TURN = 2;
const STEP_BIGSMALL = 3;
const STEP_EQUAL = 4;
const STEP_CLOSED = 5;
const STEP_MACHINE = 6;
const STEP_CALIB = 7;

const STEPS = [
  {
    title: 'Shapes have names',
    body: 'This is a SQUARE. Slide “straight sides”.',
    q: 'Where does the name come from?',
    choices: ['Its sides', 'Where it sits', 'Its colour'],
    answer: 0,
    feedback: 'Sides make the name: 3 a triangle, 4 a square, 6 a hexagon.',
  },
  {
    title: 'Sides and corners',
    body: 'Ticks mark sides. Dots mark corners.',
    q: 'A shape has 5 sides. How many corners?',
    choices: ['5 corners', '4 corners', '10 corners'],
    answer: 0,
    feedback: 'Five and five. They always match.',
  },
  {
    title: 'Turn it',
    body: 'Press Spin. Watch the name.',
    q: 'Turn the square to 45° — a “diamond”?',
    choices: ['Still a square', 'A diamond now', 'A rectangle'],
    answer: 0,
    feedback: 'Still a square. A turn never changes the name.',
  },
  {
    title: 'Big, small, painted',
    body: 'Go huge. Paint it. Watch the name.',
    q: 'A tiny green square — its name?',
    choices: ['Square', 'Green square', 'Too small to name'],
    answer: 0,
    feedback: 'Size and colour never change the name.',
  },
  {
    title: 'Now break the name',
    body: 'Press “stretched”. The name flips!',
    q: 'Stretch a pentagon. What is it now?',
    choices: ['Still a pentagon', 'A rectangle', 'Not a shape'],
    answer: 0,
    feedback: '“Pentagon” only ever asked for 5 sides.',
  },
  {
    title: 'Does it close?',
    body: 'Press “open”. Read the name plate.',
    q: 'Three sides with a gap — a triangle?',
    choices: ['No — it must close', 'Yes', 'Only a big one'],
    answer: 0,
    feedback: 'A triangle must close.',
  },
  {
    title: 'Two kinds',
    body: 'Three things change the name. Three never can.',
    q: 'A tiny upside-down triangle. Still a triangle?',
    choices: ['Yes — count sides', 'No', 'Measure it first'],
    answer: 0,
    feedback: 'Yes! Only the sides vote.',
  },
  {
    title: 'Build the mystery shape',
    body: 'Make every clue turn green.',
    q: 'The card never says the turn. Why?',
    choices: ['Turn cannot matter', 'It forgot', 'It is hiding'],
    answer: 0,
    feedback: 'Clues only say things that matter.',
  },
];

/* ---------------------------------------------------------------------------
   Which control unlocks at which step.
   `size` and `fill` unlock TOGETHER at step 3, on purpose: they are the same
   KIND of attribute (non-defining), and the step's lesson is precisely that
   they behave identically to the turn.  (Precedent: LikeTermsLab unlocks c and
   e together because they are like terms with each other; SystemsLab unlocks
   two dials that are one object.)
   ------------------------------------------------------------------------- */
const UNLOCK = { sides: 0, turn: 2, size: 3, fill: 3, equal: 4, closed: 5 };

const START = { sides: 4, equal: true, closed: true, turn: 0, size: 3, fill: 'none' };

/* ---------------------------------------------------------------------------
   VIEW HELPERS
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f';
const BLUE = '#2d5f8c';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const QUAD = '#c7d8e4';
const OK = '#1f8a5b';
const GHOST = '#9aa8b4';

/** The "equation" of this lab: the attribute list, an arrow, and the name. */
function NamePlate({ sides, equal, closed, flash }) {
  const nm = nameOf(sides, equal, closed);
  const bits = [];
  if (!closed) {
    bits.push('has a gap');
  } else if (sides === 0) {
    bits.push('no straight sides');
    bits.push(equal ? 'same width' : 'stretched');
  } else {
    bits.push(`${sides} straight sides`);
    bits.push(equal ? 'all equal' : 'not all equal');
    bits.push('closed');
  }
  return (
    <p className="equation nameplate" aria-live="polite">
      <span className="attrs mono">{bits.join(' · ')}</span>
      <span className="arrow" aria-hidden="true">→</span>
      <span className={'name' + (flash ? ' flash' : '')}>{nm.name}</span>
      {nm.specific ? <span className="specific">({nm.specific})</span> : null}
    </p>
  );
}

/* ---------------------------------------------------------------------------
   COMPONENT
   ------------------------------------------------------------------------- */
export default function ShapesLab() {
  const [st, setSt] = useState(START);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [lens, setLens] = useState({ parts: false, right: false, ticks: false, ghost: false });
  const [target, setTarget] = useState(null);
  const [flash, setFlash] = useState(false);
  const [pulse, setPulse] = useState(null);
  const [spinning, setSpinning] = useState(false);

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const spinRef = useRef(null); // fractional display degrees; NEVER state
  const rafRef = useRef(0);
  const flashRef = useRef(0);
  const pulseRef = useRef(0);
  const rndRef = useRef(null);
  if (!rndRef.current) {
    let seed = 0x5ee1;
    rndRef.current = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const unlocked = useCallback((id) => step >= UNLOCK[id], [step]);
  const answered = answers[step] !== undefined;

  /* ---- derived model (single source of truth: `st`) ---- */
  const nm = useMemo(() => nameOf(st.sides, st.equal, st.closed), [st.sides, st.equal, st.closed]);
  const nSides = straightSides(st.sides, st.closed);
  const nCorners = cornerCount(st.sides, st.closed);

  /* ---- a defining change flips the plate; a non-defining one must not ---- */
  const prevName = useRef(nm.name);
  useEffect(() => {
    if (prevName.current !== nm.name) {
      prevName.current = nm.name;
      setFlash(true);
      clearTimeout(flashRef.current);
      flashRef.current = setTimeout(() => setFlash(false), 620);
    }
  }, [nm.name]);
  useEffect(() => () => clearTimeout(flashRef.current), []);

  const touch = useCallback((id) => {
    setPulse(id);
    clearTimeout(pulseRef.current);
    pulseRef.current = setTimeout(() => setPulse(null), 900);
  }, []);
  useEffect(() => () => clearTimeout(pulseRef.current), []);

  /* ---- lenses follow the lesson ---- */
  useEffect(() => {
    setLens({
      parts: step >= STEP_PARTS,
      right: step >= STEP_PARTS,
      ticks: step >= STEP_PARTS,
      ghost: step === STEP_TURN || step === STEP_BIGSMALL,
    });
  }, [step]);

  useEffect(() => {
    if (step === STEP_CALIB && !target) {
      setTarget(newTarget(rndRef.current, null, st));
    }
  }, [step, target, st]);

  /* ---- calibration ---- */
  const clues = useMemo(() => (target ? cluesFor(target) : []), [target]);
  const clueState = useMemo(() => clues.map((c) => ({ ...c, met: clueMet(c, st) })), [clues, st]);
  const metCount = clueState.filter((c) => c.met).length;
  const solved = target ? definingEqual(st, target) : false;
  const matchPercent = clues.length ? Math.round((100 * metCount) / clues.length) : 0;

  /* ---- spin: display-only, so the dial (and the NAME) never move ---- */
  const stopSpin = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    spinRef.current = null;
    setSpinning(false);
  }, []);

  const spin = useCallback(() => {
    if (spinning) {
      stopSpin();
      return;
    }
    touch('turn');
    if (reduced) {
      // Same lesson, no motion: jump a quarter turn and let the plate hold.
      setSt((s) => ({ ...s, turn: (s.turn + 45) % 360 }));
      return;
    }
    setSpinning(true);
    const from = st.turn;
    const t0 = performance.now();
    const DUR = 5200; // ms for one full revolution
    const frame = (now) => {
      const u = (now - t0) / DUR;
      if (u >= 1) {
        spinRef.current = null;
        setSpinning(false);
        rafRef.current = 0;
        return;
      }
      spinRef.current = from + 360 * u;
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [spinning, stopSpin, reduced, st.turn, touch]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /* ---- RENDER (full redraw from state, every frame that matters) ---- */
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const rect = cv.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const scale = Math.min(W, H) / (2 * WORLD_R * 1.06);
    const cx = W / 2;
    const cy = H / 2;
    const X = (x) => cx + x * scale;
    const Y = (y) => cy - y * scale;

    /* quadrille PAPER — not a coordinate plane.  No axes, no origin, no labels:
       PointLab owns the plane; this is the house's paper texture and nothing
       more.  It is ruled across the WHOLE canvas rather than only across the
       world square, because paper does not stop halfway: bounding it to the
       world left bare margins on a wide stage that read as an unfinished
       drawing rather than as a sheet of squared paper. */
    ctx.lineWidth = 1;
    const iMinX = Math.floor(-cx / scale);
    const iMaxX = Math.ceil((W - cx) / scale);
    const iMinY = Math.floor((cy - H) / scale);
    const iMaxY = Math.ceil(cy / scale);
    for (let i = iMinX; i <= iMaxX; i++) {
      ctx.strokeStyle = i % 5 === 0 ? 'rgba(199,216,228,0.85)' : 'rgba(199,216,228,0.45)';
      ctx.beginPath();
      ctx.moveTo(Math.round(X(i)) + 0.5, 0);
      ctx.lineTo(Math.round(X(i)) + 0.5, H);
      ctx.stroke();
    }
    for (let i = iMinY; i <= iMaxY; i++) {
      ctx.strokeStyle = i % 5 === 0 ? 'rgba(199,216,228,0.85)' : 'rgba(199,216,228,0.45)';
      ctx.beginPath();
      ctx.moveTo(0, Math.round(Y(i)) + 0.5);
      ctx.lineTo(W, Math.round(Y(i)) + 0.5);
      ctx.stroke();
    }

    const displayTurn = spinRef.current == null ? st.turn : spinRef.current;
    const live = { ...st, turn: displayTurn };
    const pts = outlineOf(live);

    /* --- the grey ghost: where the shape started.  ParallelogramLab's half-turn
       ghost lands ON the shape to prove symmetry; this one deliberately does NOT
       — it stays put so you can see the shape moved and the name did not. --- */
    const turned = Math.abs(((displayTurn % 360) + 360) % 360) > 0.01;
    const resized = st.size !== START.size;
    if (lens.ghost && (turned || resized)) {
      const g = outlineOf({ ...st, turn: 0, size: START.size });
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(154,168,180,0.9)';
      ctx.lineWidth = 1.5;
      tracePath(ctx, g, X, Y, st.sides, st.closed);
      ctx.stroke();
      ctx.restore();
      /* The ghost's caption is a LEGEND pinned to the top-right, not a label
         floating over the drawing.  Anchoring it to the ghost's own bounding box
         put it underneath the live shape, which at 45° is taller than the ghost
         and simply drew straight through it.  There is no safe spot inside the
         paper — the shape can be turned any way at all, which is the entire
         point of this lab — so the caption gets out of the paper's way. */
      ctx.save();
      ctx.font = '500 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const gl = 'where it started';
      const glw = ctx.measureText(gl).width;
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(154,168,180,0.95)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(W - 12 - glw - 22, 18);
      ctx.lineTo(W - 12 - glw - 6, 18);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = GHOST;
      ctx.fillText(gl, W - 12, 18);
      ctx.restore();
    }

    /* --- the target card (challenge only): grey, and deliberately posed
       differently from the child's shape.  Its pose is a lie the lab tells on
       purpose — and the meter refuses to care. --- */
    if (step === STEP_CALIB && target) {
      /* A real CARD laid on the paper, with its own backing — not loose ink.
         Unbacked, it drew straight through the child's shape whenever the shape
         was large (obvious at once on a phone, where the paper is square and a
         size-5 shape fills it).  The backing also lets it sit in the corner
         honestly instead of hunting for a gap that a freely-turning shape can
         never guarantee. */
      ctx.save();
      // Size the card from the MEASURED label, never from a guessed constant:
      // at 108px the text filled it edge to edge with no padding at all.
      ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      const CLABEL = 'the card’s shape';
      const CW = Math.max(96, Math.ceil(ctx.measureText(CLABEL).width) + 18);
      const CH = 84;
      const cxr = W - 10 - CW / 2;
      const cyr = 10 + CH / 2;
      ctx.fillStyle = 'rgba(251,251,248,0.94)';
      roundRect(ctx, cxr - CW / 2, cyr - CH / 2, CW, CH, 8);
      ctx.fill();
      ctx.strokeStyle = solved ? 'rgba(31,138,91,0.55)' : 'rgba(28,43,58,0.22)';
      ctx.lineWidth = 1;
      roundRect(ctx, cxr - CW / 2, cyr - CH / 2, CW, CH, 8);
      ctx.stroke();

      ctx.translate(cxr, cyr - 8);
      const tp = outlineOf({ sides: target.sides, equal: target.equal, size: 2, turn: 30 });
      const s2 = 26 / (radiusFor(2) * Math.SQRT2);
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = solved ? 'rgba(31,138,91,0.9)' : 'rgba(154,168,180,0.95)';
      ctx.lineWidth = 1.6;
      tracePath(ctx, tp, (x) => x * s2, (y) => -y * s2, target.sides, true);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = solved ? OK : INK_SOFT;
      ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(CLABEL, 0, CH / 2 - 11);
      ctx.restore();
    }

    /* --- THE SHAPE.  Carmine outline, always.  The fill is the noise dial. --- */
    const fc = fillCss(st.fill);
    if (st.closed && st.fill !== 'none') {
      ctx.save();
      ctx.fillStyle = fc;
      ctx.globalAlpha = 0.85;
      tracePath(ctx, pts, X, Y, st.sides, true);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    tracePath(ctx, pts, X, Y, st.sides, st.closed);
    ctx.stroke();
    ctx.restore();

    /* --- BADGES.  Blue, and welded on: they are drawn from the LIVE turned
       vertices, so they ride around with the shape.  That is the proof. --- */
    if (st.sides > 0) {
      const lens_ = sideLengths(pts, st.sides, st.closed);
      const tg = tickGroups(lens_);

      if (lens.ticks && st.closed) {
        ctx.save();
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 2;
        for (let i = 0; i < lens_.length; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const L = Math.hypot(dx, dy) || 1;
          const nx = -dy / L;
          const ny = dx / L;
          const ux = dx / L;
          const uy = dy / L;
          const k = tg.groups[i];
          for (let j = 0; j < k; j++) {
            const off = (j - (k - 1) / 2) * 0.26;
            const px = mx + ux * off;
            const py = my + uy * off;
            ctx.beginPath();
            ctx.moveTo(X(px - nx * 0.3), Y(py - ny * 0.3));
            ctx.lineTo(X(px + nx * 0.3), Y(py + ny * 0.3));
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      const angs = cornerAngles(pts, st.sides, st.closed);

      if (lens.right) {
        ctx.save();
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 1.8;
        for (const a of angs) {
          if (Math.abs(a.deg - 90) > RIGHT_TOL) continue;
          const u1 = norm(a.p, a.v);
          const u2 = norm(a.q, a.v);
          const d = 0.62;
          const p1 = { x: a.v.x + u1.x * d, y: a.v.y + u1.y * d };
          const p2 = { x: a.v.x + u2.x * d, y: a.v.y + u2.y * d };
          const p3 = { x: a.v.x + (u1.x + u2.x) * d, y: a.v.y + (u1.y + u2.y) * d };
          ctx.beginPath();
          ctx.moveTo(X(p1.x), Y(p1.y));
          ctx.lineTo(X(p3.x), Y(p3.y));
          ctx.lineTo(X(p2.x), Y(p2.y));
          ctx.stroke();
        }
        ctx.restore();
      }

      if (lens.parts) {
        const cornerIdx = new Set(angs.map((a) => a.i));
        ctx.save();
        let label = 0;
        for (let i = 0; i < pts.length; i++) {
          const isCorner = cornerIdx.has(i);
          const p = pts[i];
          ctx.beginPath();
          ctx.arc(X(p.x), Y(p.y), isCorner ? 5 : 4, 0, Math.PI * 2);
          if (isCorner) {
            ctx.fillStyle = BLUE;
            ctx.fill();
          } else {
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = BLUE;
            ctx.lineWidth = 1.6;
            ctx.stroke();
          }
          if (isCorner) {
            label += 1;
            const L = Math.hypot(p.x, p.y) || 1;
            ctx.fillStyle = BLUE;
            ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(label), X(p.x + (p.x / L) * 0.85), Y(p.y + (p.y / L) * 0.85));
          }
        }
        ctx.restore();
      }

      /* the gap bracket — the honest picture of "not closed" */
      if (!st.closed) {
        const a = pts[pts.length - 1];
        const b = pts[0];
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(X(a.x), Y(a.y));
        ctx.lineTo(X(b.x), Y(b.y));
        ctx.stroke();
        ctx.restore();
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const L = Math.hypot(mx, my) || 1;
        ctx.fillStyle = BLUE;
        ctx.font = '600 11.5px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('never closes', X(mx + (mx / L) * 1.5), Y(my + (my / L) * 1.5));
      }
    } else if (!st.closed) {
      const a = pts[pts.length - 1];
      const b = pts[0];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const L = Math.hypot(mx, my) || 1;
      ctx.fillStyle = BLUE;
      ctx.font = '600 11.5px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('never closes', X(mx + (mx / L) * 1.9), Y(my + (my / L) * 1.9));
    }

    /* --- the diamond callout: the single most valuable sentence in K-1 geometry.
       Only on the TURN step.  It is that step's whole reveal, and leaving it up
       afterwards would both clutter a young child's paper and collide with the
       challenge card on a narrow screen. --- */
    const t360 = ((Math.round(displayTurn) % 360) + 360) % 360;
    if (step === STEP_TURN && st.sides === 4 && st.equal && st.closed && t360 % 90 === 45) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      /* TOP-centre, not bottom-centre: at the bottom this ran straight through
         the note in the corner and rendered as "some people call t[Four straight
         sides…]" — the most important sentence in the lab, illegible at the
         exact moment it fires.  The top strip holds only the small "turned 45°"
         readout on the left and the ghost legend on the right, so a centred
         callout clears both.  On a narrow stage it shortens rather than
         overflowing the paper. */
      ctx.font = '600 13px system-ui, -apple-system, sans-serif';
      let msg = 'a “diamond”? still a SQUARE';
      if (ctx.measureText(msg).width + 20 > W - 190) {
        ctx.font = '600 11.5px system-ui, -apple-system, sans-serif';
        msg = 'still a SQUARE';
      }
      const w = ctx.measureText(msg).width + 20;
      const bx = W / 2;
      const by = 36;
      ctx.fillStyle = 'rgba(251,251,248,0.94)';
      roundRect(ctx, bx - w / 2, by - 13, w, 26, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,30,79,0.5)';
      ctx.lineWidth = 1.2;
      roundRect(ctx, bx - w / 2, by - 13, w, 26, 7);
      ctx.stroke();
      ctx.fillStyle = CARMINE;
      ctx.fillText(msg, bx, by);
      ctx.restore();
    }

    /* The turn used to be printed here too.  It was already on the turn dial and
       in the facts row — the same number in three places at once, on a page made
       for six-year-olds.  The dial keeps it; the paper is for the shape. */
  }, [st, lens, step, target, solved]);

  useEffect(() => {
    draw();
  }, [draw]);

  /* keep the canvas painting through a display-only spin */
  useEffect(() => {
    if (!spinning) return undefined;
    let live = true;
    const tick = () => {
      if (!live) return;
      draw();
      requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => {
      live = false;
      cancelAnimationFrame(id);
    };
  }, [spinning, draw]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => draw());
    ro.observe(el);
    return () => ro.disconnect();
  }, [draw]);

  /* ---- controls ---- */
  const set = (patch, id) => {
    if (spinning) stopSpin();
    if (id) touch(id);
    setSt((s) => ({ ...s, ...patch }));
  };

  const reset = () => {
    stopSpin();
    setSt(START);
  };

  const answer = (i) => {
    if (answers[step] !== undefined) return;
    setAnswers((a) => ({ ...a, [step]: i }));
  };

  const goto = (n) => {
    stopSpin();
    setStep(Math.max(0, Math.min(STEPS.length - 1, n)));
  };

  const S = STEPS[step];
  const sidesIdx = SIDE_STOPS.indexOf(st.sides);

  return (
    <div className="shlab">
      <p className="eyebrow">MAIS · Interactive Math Lab</p>
      <h1>Shape Names</h1>
      <p className="lede">
        Turn it, paint it — the name stays. What <em>does</em> change it?
      </p>

      <div className="bench">
        <section className="panel stage-panel">
          <div className="stage-head">
            <NamePlate sides={st.sides} equal={st.equal} closed={st.closed} flash={flash} />
          </div>

          <div className="stage" ref={wrapRef}>
            {/* The canvas carries the whole readout for a screen reader, which is
                why the facts table beneath it could go: it repeated the name
                plate cell for cell, and the corner count is better counted off
                the numbered dots than read out of a table. */}
            <canvas
              ref={canvasRef}
              aria-label={`A ${nm.name}${nm.specific ? `, ${nm.specific}` : ''}, drawn with ${nSides === 0 ? 'no straight sides' : `${nSides} straight sides`} and ${nCorners} corners, turned ${st.turn} degrees. ${nm.note}`}
            />
          </div>

          {/* ---- THE TWO-KIND PANEL — 1.G.A.1 made into a readout.
                  Rows are STATIC and never move: nothing here flies into a bin,
                  because that picture is SortLab's.  They light up as the child
                  discovers them, and pulse when their dial is touched.

                  It appears at the TURN step, not before, and shows only what has
                  actually been found.  Five rows of "— not found yet —" from the
                  first frame was a table of nothing, and the panel says nothing
                  at all until there are two KINDS to contrast. ---- */}
          {step >= STEP_TURN ? (
            <div className="kinds" aria-label="Which attributes change the name">
              {[true, false].map((kind) => {
                const rows = ATTRS.filter((a) => a.changesName === kind && step >= a.step);
                if (!rows.length) return null;
                return (
                  <div className="kind" key={String(kind)}>
                    <p className={'kind-h ' + (kind ? 'yes' : 'no')}>
                      {kind ? 'changes the name' : 'never changes it'}
                    </p>
                    {rows.map((a) => (
                      <div key={a.id} className={'krow on' + (pulse === a.id ? ' pulse' : '')}>
                        <span className={'kmark ' + (kind ? 'yes' : 'no')} aria-hidden="true">
                          {kind ? '✓' : '✕'}
                        </span>
                        <span className="klab">{a.label}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* ---- DIALS: native controls, one unlocking per step ---- */}
          <div className="dials">
            <div className={'dial' + (unlocked('sides') ? '' : ' locked')}>
              <label htmlFor="d-sides">
                straight sides
                <span className="dv mono">{st.sides === 0 ? 'round — none' : st.sides}</span>
              </label>
              <input
                id="d-sides"
                type="range"
                min={0}
                max={SIDE_STOPS.length - 1}
                step={1}
                value={sidesIdx < 0 ? 0 : sidesIdx}
                disabled={!unlocked('sides')}
                onChange={(e) => set({ sides: SIDE_STOPS[+e.target.value] }, 'sides')}
              />
            </div>

            <div className={'dial' + (unlocked('turn') ? '' : ' locked')}>
              <label htmlFor="d-turn">
                turn it
                <span className="dv mono">{st.turn}°</span>
              </label>
              <input
                id="d-turn"
                type="range"
                min={0}
                max={TURN_STOPS - 1}
                step={1}
                value={Math.round(st.turn / TURN_STEP) % TURN_STOPS}
                disabled={!unlocked('turn') || spinning}
                onChange={(e) => set({ turn: +e.target.value * TURN_STEP }, 'turn')}
              />
            </div>

            <div className={'dial' + (unlocked('size') ? '' : ' locked')}>
              <label htmlFor="d-size">
                how big
                <span className="dv mono">{st.size}</span>
              </label>
              <input
                id="d-size"
                type="range"
                min={SIZE_MIN}
                max={SIZE_MAX}
                step={1}
                value={st.size}
                disabled={!unlocked('size')}
                onChange={(e) => set({ size: +e.target.value }, 'size')}
              />
            </div>

            <div className={'seg-row' + (unlocked('equal') ? '' : ' locked')}>
              <span className="seg-lab">sides</span>
              <button
                type="button"
                className={'seg' + (st.equal ? ' on' : '')}
                disabled={!unlocked('equal')}
                onClick={() => set({ equal: true }, 'equal')}
              >
                all equal
              </button>
              <button
                type="button"
                className={'seg' + (!st.equal ? ' on' : '')}
                disabled={!unlocked('equal')}
                onClick={() => set({ equal: false }, 'equal')}
              >
                stretched
              </button>
            </div>

            <div className={'seg-row' + (unlocked('closed') ? '' : ' locked')}>
              <span className="seg-lab">outline</span>
              <button
                type="button"
                className={'seg' + (st.closed ? ' on' : '')}
                disabled={!unlocked('closed')}
                onClick={() => set({ closed: true }, 'closed')}
              >
                closed
              </button>
              <button
                type="button"
                className={'seg' + (!st.closed ? ' on' : '')}
                disabled={!unlocked('closed')}
                onClick={() => set({ closed: false }, 'closed')}
              >
                open
              </button>
            </div>

            <div className={'seg-row swatches' + (unlocked('fill') ? '' : ' locked')}>
              <span className="seg-lab">colour</span>
              {FILLS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={'swatch' + (st.fill === f.id ? ' on' : '') + (f.id === 'none' ? ' none' : '')}
                  style={{ background: f.chip }}
                  disabled={!unlocked('fill')}
                  onClick={() => set({ fill: f.id }, 'fill')}
                  aria-label={`paint it ${f.label}`}
                  title={f.label}
                />
              ))}
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className="btn"
              disabled={!unlocked('turn')}
              onClick={spin}
            >
              {spinning ? 'Stop' : 'Spin'}
            </button>
            <button type="button" className="btn ghost" onClick={reset}>
              Reset
            </button>
          </div>
        </section>

        <aside className="panel tutor">
          <div className="progress" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span key={i} className={'pip' + (i < step ? ' done' : i === step ? ' cur' : '')} />
            ))}
          </div>
          <p className="eyebrow small">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2>{S.title}</h2>
          <p className="body">{S.body}</p>

          <div className="quiz">
            <p className="q">{S.q}</p>
            <div className="choices">
              {S.choices.map((c, i) => {
                const picked = answers[step];
                const done = picked !== undefined;
                const isRight = i === S.answer;
                const cls =
                  'choice' +
                  (done && isRight ? ' correct' : '') +
                  (done && picked === i && !isRight ? ' wrong' : '') +
                  (done && !isRight && picked !== i ? ' dim' : '');
                return (
                  <button key={i} type="button" className={cls} disabled={done} onClick={() => answer(i)}>
                    <span className="mark" aria-hidden="true">
                      {done ? (isRight ? '✓' : picked === i ? '✕' : '') : '○'}
                    </span>
                    {c}
                  </button>
                );
              })}
            </div>
            {answered ? <p className="feedback">{S.feedback}</p> : null}
          </div>

          {step === STEP_CALIB && target ? (
            <div className="calib">
              <p className="eyebrow small">the clue card</p>
              <ul className="clues">
                {clueState.map((c) => (
                  <li key={c.id} className={c.met ? 'met' : ''}>
                    <span className="cmark" aria-hidden="true">{c.met ? '✓' : '○'}</span>
                    {c.text}
                  </li>
                ))}
              </ul>
              <div className="meter" aria-hidden="true">
                <div
                  className={'meter-fill' + (solved ? ' done' : '')}
                  style={{ width: `${matchPercent}%` }}
                />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {metCount} of {clues.length} clues
                </span>
                {solved ? <span className="stamp">CALIBRATED</span> : null}
              </div>
              <p className="target-hint">
                {solved
                  ? `You built a ${nameOf(target.sides, target.equal, true).name}!`
                  : 'The card never says turn, size or colour.'}
              </p>
              <div className="toolbar">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setTarget(newTarget(rndRef.current, target, st))}
                >
                  New clue card
                </button>
              </div>
            </div>
          ) : null}

          <div className="nav">
            <button type="button" className="btn ghost" disabled={step === 0} onClick={() => goto(step - 1)}>
              Back
            </button>
            <button
              type="button"
              className="btn"
              disabled={!answered || step === STEPS.length - 1}
              onClick={() => goto(step + 1)}
            >
              Next
            </button>
          </div>
        </aside>
      </div>

      <p className="foot">
        MAIS · Shapes · K–2 · CCSS <span className="mono">K.G.A.2</span> ·{' '}
        <span className="mono">1.G.A.1</span> · <span className="mono">K.G.B.4</span> ·{' '}
        <span className="mono">2.G.A.1</span>
      </p>

      <style jsx>{`
        .shlab {
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
          max-width: 74ch;
        }
        .lede em {
          font-style: italic;
          color: var(--ink);
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
          min-height: 46px;
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }

        /* ---- the name plate: this lab's "equation" ---- */
        .nameplate {
          margin: 0;
          display: flex;
          align-items: baseline;
          gap: 10px;
          flex-wrap: wrap;
        }
        .nameplate .attrs {
          font-size: 12.5px;
          color: var(--ink-soft);
        }
        .nameplate .arrow {
          color: var(--ink-soft);
          font-size: 15px;
        }
        .nameplate .name {
          font-family: var(--serif);
          font-size: 26px;
          font-weight: 600;
          color: var(--curve);
          letter-spacing: 0.01em;
        }
        .nameplate .name.flash {
          animation: nameflip 0.6s ease-out;
        }
        @keyframes nameflip {
          0% {
            transform: translateY(-6px) scale(1.12);
            opacity: 0.25;
          }
          100% {
            transform: none;
            opacity: 1;
          }
        }
        .nameplate .specific {
          font-size: 12.5px;
          color: var(--ink-soft);
          font-style: italic;
        }

        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 2;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 1 / 1;
          }
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }

        /* ---- the two-kind panel ---- */
        .kinds {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 18px;
          margin: 14px 4px 2px;
          padding: 12px 14px;
          background: var(--paper);
          border: 1px solid rgba(28, 43, 58, 0.1);
          border-radius: 10px;
        }
        @media (max-width: 560px) {
          .kinds {
            grid-template-columns: 1fr;
          }
        }
        .kind-h {
          font-size: 10.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin: 0 0 7px;
          font-weight: 700;
        }
        .kind-h.yes {
          color: var(--curve);
        }
        .kind-h.no {
          color: var(--ink-soft);
        }
        .krow {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          padding: 3px 5px;
          border-radius: 5px;
          opacity: 0.38;
          transition: opacity 0.2s, background 0.3s;
        }
        .krow.on {
          opacity: 1;
        }
        .krow.pulse {
          background: rgba(200, 30, 79, 0.1);
        }
        .kmark {
          font-weight: 700;
          font-size: 12px;
        }
        .kmark.yes {
          color: var(--curve);
        }
        .kmark.no {
          color: var(--ink-soft);
        }
        .krow:not(.on) .klab {
          font-style: italic;
          color: var(--ink-soft);
        }

        /* ---- dials ---- */
        .dials {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 18px;
          margin: 14px 4px 2px;
        }
        @media (max-width: 560px) {
          .dials {
            grid-template-columns: 1fr;
          }
        }
        .dial label {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 3px;
        }
        .dial .dv {
          font-size: 13px;
          color: var(--ink);
          text-transform: none;
          letter-spacing: 0;
          font-variant-numeric: tabular-nums;
        }
        .dial input[type='range'] {
          width: 100%;
          accent-color: var(--curve);
          cursor: pointer;
        }
        .dial.locked,
        .seg-row.locked {
          opacity: 0.4;
        }
        .dial.locked input,
        .seg-row.locked button {
          cursor: not-allowed;
        }
        .seg-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .seg-lab {
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-right: 2px;
        }
        .seg {
          font: 600 12.5px/1 system-ui, sans-serif;
          padding: 7px 11px;
          border-radius: 8px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .seg.on {
          background: var(--ink);
          border-color: var(--ink);
          color: #fff;
        }
        .seg:not(:disabled):hover {
          border-color: var(--ink);
        }
        .swatch {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid rgba(28, 43, 58, 0.22);
          cursor: pointer;
          padding: 0;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .swatch.none {
          background-image: linear-gradient(45deg, transparent 45%, #c33 45%, #c33 55%, transparent 55%);
        }
        .swatch.on {
          box-shadow: 0 0 0 2px var(--ink);
          transform: scale(1.1);
        }
        .toolbar {
          margin: 14px 4px 2px;
          display: flex;
          gap: 8px;
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
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn:not(:disabled):hover {
          filter: brightness(1.08);
        }

        /* ---- tutor ---- */
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
          margin-top: 4px;
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
        .clues {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 5px;
        }
        .clues li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--ink-soft);
          padding: 5px 8px;
          border: 1px dashed rgba(28, 43, 58, 0.2);
          border-radius: 6px;
          transition: color 0.2s, border-color 0.2s, background 0.2s;
        }
        .clues li.met {
          color: var(--ink);
          border-color: rgba(31, 138, 91, 0.5);
          border-style: solid;
          background: rgba(31, 138, 91, 0.06);
        }
        .cmark {
          font-weight: 700;
          color: var(--ink-soft);
        }
        .clues li.met .cmark {
          color: var(--ok);
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
          transition: width 0.25s ease-out;
        }
        .meter-fill.done {
          background: linear-gradient(90deg, rgba(31, 138, 91, 0.6), var(--ok));
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
          margin: 0;
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
        :global(.shlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .seg,
          .krow,
          .swatch,
          .clues li {
            transition: none;
          }
          .nameplate .name.flash {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Canvas primitives
   ------------------------------------------------------------------------- */

/** Trace the outline.  Round shapes are a sampled loop; open shapes stop one
 *  edge short so the gap is real geometry, not a drawn illusion. */
function tracePath(ctx, pts, X, Y, sides, closed) {
  ctx.beginPath();
  const n = pts.length;
  const last = closed ? n : n - 1;
  ctx.moveTo(X(pts[0].x), Y(pts[0].y));
  for (let i = 1; i <= last; i++) {
    const p = pts[i % n];
    ctx.lineTo(X(p.x), Y(p.y));
  }
  if (closed) ctx.closePath();
}

function norm(p, v) {
  const dx = p.x - v.x;
  const dy = p.y - v.y;
  const L = Math.hypot(dx, dy) || 1;
  return { x: dx / L, y: dy / L };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* Exported for the audit harness (audit-shapes.mjs).  Keeping the model's
   surface explicit is what lets the audit measure the SAME functions the
   component renders, rather than a re-implementation that could drift. */
export {
  nameOf,
  outlineOf,
  cornerAngles,
  sideLengths,
  tickGroups,
  cornerCount,
  edgeCount,
  straightSides,
  allTargets,
  cluesFor,
  clueMet,
  definingEqual,
  newTarget,
  phaseFor,
  radiusFor,
  SIDE_STOPS,
  STRETCH,
  TURN_STEP,
  TURN_STOPS,
  SIZE_MIN,
  SIZE_MAX,
  FILLS,
  ATTRS,
  DEFINING,
  NON_DEFINING,
  UNLOCK,
  START,
  STEPS,
  RIGHT_TOL,
};
