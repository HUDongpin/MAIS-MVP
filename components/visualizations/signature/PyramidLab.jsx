'use client';

/* ============================================================================
   PyramidLab — an interactive "bench" for the VOLUME OF A PYRAMID:

                        V = ⅓ · B · h

   and, above all, for WHERE THAT ⅓ COMES FROM.

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 8 / HIGH-SCHOOL
   GEOMETRY lab — CCSS G-GMD.A.3 ("use volume formulas for cylinders, pyramids,
   cones and spheres to solve problems") standing on G-GMD.A.1 ("give an
   informal argument for the formulas") and 8.G.C.9's family of solids.

   House style: the interactive-math-bench standard — a clean stage, ONE carmine
   accent for the object in focus, dials that unlock one per lesson step,
   predict-then-check questions gated on ANSWERED (not correct), and a
   calibration challenge with a live meter and a CALIBRATED stamp that cannot
   fire falsely.

   ---------------------------------------------------------------------------
   THE SIGNATURE CENTERPIECE — "THREE PIECES, ONE BOX."
   ---------------------------------------------------------------------------
   A box (prism) a × a × h.  Inside it, three pyramids that share a single
   apex at one corner, each standing on a different face of the box.  Slide the
   split dial and they walk out of the box, each through its own base; slide it
   back and they snap in with nothing left over and nothing overlapping.

   THREE EQUAL PIECES FILL ONE BOX, THEREFORE EACH IS EXACTLY ONE THIRD.

   That is a PROOF — a finite cut-and-reassemble — and it is the reason this
   lab exists.  No liquid, no slicing, no limit.  You can see the whole of it
   at once and check it with your eyes.

   ---------------------------------------------------------------------------
   HOW THIS LAB STAYS DISTINCT FROM ITS SIBLINGS  (the library's hard rule)
   ---------------------------------------------------------------------------
   Three labs in this library land on a "⅓" or on a solid's volume.  They are
   split by their METHOD OF PROOF, which is the real mathematical content, and
   they must not drift into each other:

     • ConeLab    — ⅓πr²h by the POUR.  It takes three cones of water to fill
                    the cylinder: an empirical DEMONSTRATION you believe because
                    you watched it.  (ConeLab asserts the pyramid case in a
                    single sentence and hands it here; this lab returns the
                    favour by pointing back at the cone.)
     • SphereLab  — (4/3)πr³ by CAVALIERI'S PRINCIPLE.  Two solids whose
                    cross-sections match in area at every height have the same
                    volume: a SLICING argument, with a whiff of the infinite.
     • PyramidLab — ⅓Bh by DISSECTION.  Three solid pieces, cut once, that
                    reassemble into the box.  Finite, exact, and complete.

   So: this lab does not pour and it does not slice.  Those words are absent
   from this file on purpose, and audit-pyramid.mjs greps this source to keep
   them absent — a distinctness promise written only in prose is a promise you
   will break.

   ---------------------------------------------------------------------------
   THE MATHEMATICS, EXACTLY
   ---------------------------------------------------------------------------
   Take the box [0,a] × [0,a] × [0,h] and the TOP corner O = (0, 0, h).  Define
   three pyramids, each with apex O and base one of the three faces NOT
   touching O:

       piece Z : base the floor z = 0   (an a × a square)    height h
       piece X : base the wall  x = a   (an a × h rectangle)  height a
       piece Y : base the wall  y = a   (an a × h rectangle)  height a

   (The apex is at the TOP so that the featured pyramid STANDS on its base with
   its apex above a base corner — the solid the lesson describes.  Parking the
   apex at the origin instead is the identical dissection turned upside-down,
   balanced on its tip; the maths would not notice, but the student would.)

   CLAIM 1 — they tile the box.  Normalise u = x/a, v = y/a, and — since the
   apex is up at z = h — let w = 1 − z/h be the point's normalised drop BELOW
   the apex's level.  A point of the box lies in piece Z exactly when w is the
   largest of u, v, w; in X when u is; in Y when v is.  Every triple has a
   largest entry, so the three pieces COVER the box; ties happen only on the
   shared boundary walls, so the interiors are DISJOINT.  (whichPiece / inPiece
   below are literally this test, and the audit checks coverage, overlap and
   the shared walls on a dense lattice.)

   CLAIM 2 — they have equal volume.  Each piece is ⅓ of its own base times its
   own height, and all three come to the same number:

       Z :  ⅓ · (a·a) · h  =  a²h/3
       X :  ⅓ · (a·h) · a  =  a²h/3
       Y :  ⅓ · (a·h) · a  =  a²h/3

   Claims 1 and 2 together give 3 · V = a²h = the box, hence V = ⅓Bh.  Note
   what Claim 2 does NOT require: the pieces are congruent only in the special
   case h = a (the cube, where a 120° turn about the long diagonal through O
   carries each piece to the next).  Equal VOLUME is all the proof ever needed,
   and the h dial exists to make exactly that point.

   EXACT ARITHMETIC (the house rule).  Both dials step by 0.5, so a = k/2 and
   h = m/2 for integers k, m.  Then a·a·h = k²m/8 is a DYADIC rational and is
   therefore represented with ZERO error in binary floating point.  Every
   volume comparison in this file is made on a·a·h (never on a·a·h/3, which
   divides by 3 and can round), so the CALIBRATED stamp tests

       a*a*h === 3*goal

   as an EXACT integer-valued equality with no epsilon anywhere.  Volumes shown
   to the student are built from the integers k and m as reduced fractions
   (V = k²m/24), so a child never meets a float artefact like 8.999999999.

   ---------------------------------------------------------------------------
   Delivered the MAIS way: ZERO dependencies.  The box, the three pyramids,
   their shading, hidden-face removal and the exploded view are a hand-rolled
   3-D pipeline on a plain <canvas> — no Three.js, no WebGL, nothing to
   install.  Styles are scoped with styled-jsx so nothing leaks.

   DROP-IN USAGE (Next.js):
     1. Save this file anywhere, e.g. app/labs/PyramidLab.jsx
     2. Import and render it:
          import PyramidLab from './PyramidLab';
          export default function Page() { return <PyramidLab />; }

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, h, split, step).
     MODEL  — the geometry and the formulas are pure math; they know no pixels.
     RENDER — the canvas is fully redrawn from a state SNAPSHOT on every change.

   The block between the MODEL:START and MODEL:END sentinels below is pure,
   React-free, pixel-free JavaScript.  audit-pyramid.mjs SLICES THAT BLOCK OUT
   OF THIS FILE and evaluates it directly, so the audit tests the code that
   actually ships and cannot drift away from it.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==== MODEL:START — pure math. No React, no pixels, no DOM. =============== */

/* ---- small 3-D vector helpers ------------------------------------------- */
const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const add = (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const mul = (p, s) => [p[0] * s, p[1] * s, p[2] * s];
const dot3 = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross3 = (p, q) => [
  p[1] * q[2] - p[2] * q[1],
  p[2] * q[0] - p[0] * q[2],
  p[0] * q[1] - p[1] * q[0],
];
const norm3 = (p) => {
  const L = Math.hypot(p[0], p[1], p[2]) || 1;
  return [p[0] / L, p[1] / L, p[2] / L];
};

/* ---- Parameters. Three dials: the base edge a, the height h, and split,
   which walks the three pieces out of the box. Both a and h step by 0.5 so
   that a·a·h stays dyadic — see the header's note on exact arithmetic. ---- */
const PARAMS = [
  { key: 'a', label: 'a', min: 1, max: 6, step: 0.5, unlock: 3, role: 'base edge' },
  { key: 'h', label: 'h', min: 1, max: 6, step: 0.5, unlock: 4, role: 'height' },
  { key: 'split', label: 'split', min: 0, max: 1, step: 0.02, unlock: 2, role: 'take the box apart' },
];
/* START is the CUBE case (h = a): the one arrangement where the three pieces
   are congruent, so the dissection convinces before the h dial complicates it. */
const START = { a: 3, h: 3, split: 0 };

/* ---- the three pieces --------------------------------------------------- */
const PIECES = ['z', 'x', 'y'];
const FEATURED = 'z';          // the carmine one: the square-based pyramid
/* The shared apex sits at the TOP corner, directly above the origin — so the
   featured pyramid STANDS ON ITS BASE with its apex over one base corner,
   which is what the lesson says it does. (Parking the apex at the origin
   instead gives the same solid upside-down, balanced on its tip, and makes the
   lab's picture contradict the lab's own words. It is the same dissection
   either way; only this way is honest about which end is up.) */
const apexOf = (h) => [0, 0, h];

/* Base of a piece: one of the three box faces that does NOT touch the apex,
   given as four corners in cyclic order. */
function pieceBase(name, a, h) {
  if (name === 'z') return [[0, 0, 0], [a, 0, 0], [a, a, 0], [0, a, 0]]; // the floor
  if (name === 'x') return [[a, 0, 0], [a, a, 0], [a, a, h], [a, 0, h]]; // wall x = a
  return [[0, a, 0], [a, a, 0], [a, a, h], [0, a, h]];                   // wall y = a
}

/* Each piece's OWN base area and OWN height — the two numbers its ⅓Bh needs.
   The whole of Claim 2 is that B·H is the same for all three. */
function pieceBaseHeight(name, a, h) {
  if (name === 'z') return { B: a * a, H: h };  // the a×a floor, apex h above it
  return { B: a * h, H: a };                    // an a×h wall, apex a across from it
}

/* Which piece owns a point of the box: the one whose normalised coordinate is
   largest. This IS Claim 1 — the tiling — written as code.
   With the apex up at (0, 0, h), the coordinate that races x/a and y/a is the
   point's normalised distance BELOW the apex's level, w = 1 − z/h. */
function inPiece(name, a, h, x, y, z) {
  const u = x / a, v = y / a, w = 1 - z / h;
  if (name === 'z') return w >= u && w >= v;
  if (name === 'x') return u >= v && u >= w;
  return v >= u && v >= w;
}
function whichPiece(a, h, x, y, z) {
  const u = x / a, v = y / a, w = 1 - z / h;
  if (w >= u && w >= v) return 'z';
  if (u >= v && u >= w) return 'x';
  return 'y';
}

/* The exploded view: each piece slides out along the outward normal of its own
   base, so it leaves the box THROUGH the face it stands on. The floor-standing
   piece therefore drops downward; the two wall pieces slide sideways. */
function pieceOffset(name, a, h, split) {
  const d = split * 1.25 * Math.max(a, h);
  if (name === 'z') return [0, 0, -d];
  if (name === 'x') return [d, 0, 0];
  return [0, d, 0];
}
function pieceVerts(name, a, h, split) {
  const off = pieceOffset(name, a, h, split);
  return [add(apexOf(h), off), ...pieceBase(name, a, h).map((p) => add(p, off))];
}
/* A pyramid's five faces: the base quad plus four triangles up to the apex. */
function pieceFaces(name, a, h, split) {
  const off = pieceOffset(name, a, h, split);
  const base = pieceBase(name, a, h).map((p) => add(p, off));
  const apex = add(apexOf(h), off);
  return [
    { kind: 'base', pts: base },
    { kind: 'side', pts: [apex, base[0], base[1]] },
    { kind: 'side', pts: [apex, base[1], base[2]] },
    { kind: 'side', pts: [apex, base[2], base[3]] },
    { kind: 'side', pts: [apex, base[3], base[0]] },
  ];
}

/* The box itself: 8 corners and the 12 edges of the wireframe. */
function boxCorners(a, h) {
  return [
    [0, 0, 0], [a, 0, 0], [a, a, 0], [0, a, 0],
    [0, 0, h], [a, 0, h], [a, a, h], [0, a, h],
  ];
}
const BOX_EDGE_IDX = [
  [0, 1], [1, 2], [2, 3], [3, 0], // floor
  [4, 5], [5, 6], [6, 7], [7, 4], // lid
  [0, 4], [1, 5], [2, 6], [3, 7], // uprights
];
function boxEdges(a, h) {
  const c = boxCorners(a, h);
  return BOX_EDGE_IDX.map(([i, j]) => [c[i], c[j]]);
}

/* ---- exact arithmetic --------------------------------------------------- */
const gcd = (x, y) => (y ? gcd(y, x % y) : Math.abs(x));
/* a and h are multiples of 0.5, so k = 2a and m = 2h are integers. */
const halves = (v) => Math.round(v * 2);
/* box  = a²h     = k²m/8   (exact)
   pyr  = a²h/3   = k²m/24  (exact, as a reduced fraction) */
function boxFrac(a, h) {
  const k = halves(a), m = halves(h);
  const n = k * k * m, d = 8, g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
}
function volFrac(a, h) {
  const k = halves(a), m = halves(h);
  const n = k * k * m, d = 24, g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
}

/* The correctness anchor. pyrVol is for display only; every EQUALITY in this
   file is made on triple = a·a·h, which is dyadic and therefore exact. */
function facts(a, h) {
  return {
    base: a * a,        // B, the square base area
    height: h,
    triple: a * a * h,  // 3V — the exact one
    boxVol: a * a * h,
    pyrVol: (a * a * h) / 3,
  };
}

/* ---- calibration: build a pyramid to a target volume --------------------
   Targets sit at whole a and h with 3 | a²h, so the goal is a whole number and
   is exactly reachable on the 0.5-step dials. Many (a, h) pairs share a goal —
   same volume, different shape — which is this lab's thesis, not a defect, so
   every exact hit earns the stamp and the lab says so. ---------------------- */
function targetPool() {
  const out = [];
  for (let a = 2; a <= 6; a++) {
    for (let h = 2; h <= 6; h++) {
      const t = a * a * h;
      if (t % 3 === 0) out.push({ a, h, goal: t / 3 });
    }
  }
  return out;
}
function makeTarget(prev, rnd) {
  const rand = rnd || Math.random;
  const pool = targetPool();
  let t;
  do { t = pool[Math.floor(rand() * pool.length)]; } while (prev && t.goal === prev.goal);
  return { a: t.a, h: t.h, goal: t.goal };
}
/* EXACT — no epsilon. Both sides are integer-valued and dyadic-exact. */
function isCalibrated(a, h, goal) {
  return a * a * h === 3 * goal;
}
function matchPercent(a, h, goal) {
  const cur = (a * a * h) / 3;
  return Math.max(0, Math.min(100, 100 * (1 - Math.abs(cur - goal) / goal)));
}
/* How many other dial settings reach the same volume — the celebration line. */
function alternates(a, h, goal) {
  let n = 0;
  for (let k = 2; k <= 12; k++) {
    for (let m = 2; m <= 12; m++) {
      const A = k / 2, H = m / 2;
      if (isCalibrated(A, H, goal) && !(A === a && H === h)) n++;
    }
  }
  return n;
}

/* ---- the lesson. One idea per step; the reveal lives in `feedback`;
   every distractor is a real student misconception. ------------------------ */
const STEPS = [
  {
    title: 'Meet the pyramid',
    focus: 'meet',
    body:
      'A pyramid has one flat BASE and a single APEX — the tip. Every other face is a triangle running ' +
      'from a base edge up to that apex. This one stands on a square, and its apex sits directly above ' +
      'one corner of that square. Drag the shape to look around it.',
    q: 'A pyramid on a square base — how many faces, edges and vertices does it have?',
    choices: [
      '5 faces, 8 edges, 5 vertices',
      '6 faces, 12 edges, 8 vertices',
      '4 faces, 6 edges, 4 vertices',
    ],
    answer: 0,
    feedback:
      'One square base plus four triangles makes 5 faces. Four edges around the base plus four climbing ' +
      'to the apex makes 8. Four base corners plus the apex makes 5 vertices — and 5 − 8 + 5 = 2, Euler ' +
      'again. The other two answers are real solids, just not this one: 6/12/8 is a cube, and 4/6/4 is a ' +
      'pyramid on a TRIANGLE (a tetrahedron).',
  },
  {
    title: 'Inside its box',
    focus: 'prism',
    body:
      'Now the box appears: the prism on the very same square base, of the very same height h. The ' +
      'pyramid’s apex just reaches its lid. The pyramid is plainly smaller than the box — but by how ' +
      'much? Commit to a guess before you slide anything.',
    q: 'What fraction of the box does the pyramid fill?',
    choices: [
      'Exactly one half',
      'Exactly one third',
      'It depends on how tall the box is',
    ],
    answer: 1,
    feedback:
      'A half is the popular answer — the pyramid looks like the box with its top corners shaved off, and ' +
      '“shaved off” feels like half. It is a THIRD, exactly, and that fraction never depends on a or on h. ' +
      'The next step is the proof, and it is not a measurement or an estimate: it is a cut.',
  },
  {
    title: 'Three pieces, one box',
    focus: 'dissect',
    body:
      'The split dial is live. Slide it and the box comes apart into pyramids, each walking out through ' +
      'its own base. All three keep the single apex up at the box’s top corner. Nothing is left behind, and ' +
      'nothing overlaps — slide it back and watch them close up.',
    q: 'Slide split all the way open. How many pyramids come out of the box?',
    choices: ['Three', 'Two', 'Four'],
    answer: 0,
    feedback:
      'Three. And right now the box is a cube (h = a), so the three are identical: turn the cube 120° ' +
      'about the long diagonal through the shared apex and each piece lands exactly on the next. Three ' +
      'equal pieces that together fill one box — so each one is exactly ⅓ of it. That is the entire ' +
      'proof, and it needed no measuring, no estimating and no formula.',
  },
  {
    title: 'So V = ⅓ · B · h',
    focus: 'third',
    body:
      'The pyramid is a third of its box, and the box on a square base holds B × h, where B = a² is the ' +
      'base area. Divide by three and the pyramid formula falls out. The a dial is live — grow the base ' +
      'and watch the box and the pyramid climb together.',
    q: 'A pyramid with a = 3 and h = 3 sits in a box holding 27. What is the pyramid’s volume?',
    choices: ['9', '13.5', '27'],
    answer: 0,
    feedback:
      '27 ÷ 3 = 9, and the formula agrees: V = ⅓ · B · h = ⅓ · 3² · 3 = 9. This is the same ⅓ the cone ' +
      'carries in ⅓πr²h — every pyramid and every cone holds a third of the prism or cylinder standing ' +
      'on its base. It stays true when the apex sits over the MIDDLE of the base instead of a corner, ' +
      'too; the corner apex is simply what lets three copies interlock, which is what made the proof ' +
      'above so easy to see.',
  },
  {
    title: 'Different shapes, equal thirds',
    focus: 'siblings',
    body:
      'The h dial is live. Push h away from a and the box stops being a cube — the three pieces stop ' +
      'looking alike. One still stands on the square floor; the other two lie against tall a × h walls. ' +
      'Open the split and read the volume printed on each piece.',
    q: 'Once h ≠ a the three pieces are genuinely different shapes. What happens to their volumes?',
    choices: [
      'All three stay exactly equal',
      'The square-based piece becomes the biggest',
      'They are only equal when the box is a cube',
    ],
    answer: 0,
    feedback:
      'Still exactly equal. Each piece is a third of ITS OWN base times ITS OWN height: the square-based ' +
      'one is ⅓ · a² · h, while each wall piece stands on an a × h rectangle and reaches a across, giving ' +
      '⅓ · (a·h) · a — the same a²h/3. Three equal thirds is precisely why they still fill the box. Being ' +
      'congruent (h = a) was never what the proof needed; equal volume was, and that survives.',
  },
  {
    title: 'Build to order',
    focus: 'calib',
    body:
      'Final challenge. You are handed a volume; build a pyramid that holds exactly that much by turning ' +
      'a and h. Plenty of different shapes hit the same target — that is this lab’s whole point — so any ' +
      'exact match earns the stamp. Press New target for a fresh one.',
    calib: true,
  },
];

/* ==== MODEL:END ========================================================== */

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign, trimmed decimals, exact fractions.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
/* Render a reduced fraction the way a student would write it: whole when it is
   whole, otherwise n/d — never a rounded decimal pretending to be exact. */
function fmtFrac(f) {
  return f.d === 1 ? String(f.n) : `${f.n}/${f.d}`;
}

/* Flat-shading colour: interpolate dark→light by brightness. Carmine marks the
   pyramid the lab is about; its two siblings are neutral blue-grey — context,
   not the object. One accent, no relaxation. */
function shade(bright, accent) {
  const b = Math.max(0.18, Math.min(1, bright));
  const lo = accent ? [150, 26, 58] : [58, 84, 110];
  const hi = accent ? [240, 158, 178] : [205, 221, 233];
  const r = Math.round(lo[0] + (hi[0] - lo[0]) * b);
  const g = Math.round(lo[1] + (hi[1] - lo[1]) * b);
  const bl = Math.round(lo[2] + (hi[2] - lo[2]) * b);
  return `rgb(${r},${g},${bl})`;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PyramidLab() {
  const [a, setA] = useState(START.a);
  const [h, setH] = useState(START.h);
  const [split, setSplit] = useState(START.split);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [seeThrough, setSeeThrough] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const rotRef = useRef({ yaw: 0.34, pitch: 0.34 });
  const dragRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const focus = current.focus;
  const F = facts(a, h);

  /* Snapshot everything the (stable) renderer reads. The renderer must NEVER
     read component-scope state directly: draw() is a useCallback([]) and any
     bare variable inside it would be a stale closure. */
  sceneRef.current = { a, h, split, focus, seeThrough, target };

  const pct = target ? matchPercent(a, h, target.goal) : 0;
  const calibrated = target ? isCalibrated(a, h, target.goal) : false;
  const alts = target && calibrated ? alternates(a, h, target.goal) : 0;

  /* ---- the hand-rolled 3-D renderer: full redraw from the snapshot -------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const LA = S.a, LH = S.h, LS = S.split;   // from the snapshot, never the closure
    const LF = facts(LA, LH);
    const { yaw, pitch } = rotRef.current;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);

    /* The model measures HEIGHT along z (the natural axis for the maths: the
       apex is at z = h). The camera yaws about Y and pitches about X, so it
       treats Y as up. Reconcile them here, in the renderer, where it belongs —
       the maths keeps its clean axis and the student sees h pointing up. This
       is the proper rotation (x, y, z) → (x, z, −y), determinant +1, so the
       solid is turned upright rather than mirrored. */
    const toWorld = (p) => [p[0], p[2], -p[1]];

    // model → camera space: stand it up, yaw about Y, then pitch about X
    const rotate = (p0) => {
      const p = toWorld(p0);
      const x1 = p[0] * cy + p[2] * sy;
      const z1 = -p[0] * sy + p[2] * cy;
      const y2 = p[1] * cp - z1 * sp;
      const z2 = p[1] * sp + z1 * cp;
      return [x1, y2, z2];
    };

    // what this step shows
    const showBox = S.focus !== 'meet';
    const showOthers =
      S.focus === 'dissect' || S.focus === 'siblings' || LS > 0.001;
    const names = showOthers ? PIECES : [FEATURED];

    // geometry for the current state, rotated into camera space
    const pieces = names.map((name) => ({
      name,
      faces: pieceFaces(name, LA, LH, LS).map((f) => ({ ...f, pts: f.pts.map(rotate) })),
      verts: pieceVerts(name, LA, LH, LS).map(rotate),
    }));
    const bEdges = showBox ? boxEdges(LA, LH).map(([p, q]) => [rotate(p), rotate(q)]) : [];

    // centre on the centroid of everything drawn, then fit — so the exploded
    // view zooms out smoothly instead of walking off the stage
    const allPts = [];
    for (const pc of pieces) for (const v of pc.verts) allPts.push(v);
    for (const e of bEdges) { allPts.push(e[0]); allPts.push(e[1]); }
    let cxm = 0, cym = 0, czm = 0;
    for (const p of allPts) { cxm += p[0]; cym += p[1]; czm += p[2]; }
    cxm /= allPts.length; cym /= allPts.length; czm /= allPts.length;
    let radius = 0;
    for (const p of allPts)
      radius = Math.max(radius, Math.hypot(p[0] - cxm, p[1] - cym, p[2] - czm));
    const D = 3.4 * radius; // camera distance → gentle, scale-invariant perspective

    const proj = (p) => {
      const x = p[0] - cxm, y = p[1] - cym, z = p[2] - czm;
      const f = D / (D - z);
      return [x * f, y * f, z];
    };

    // pass 1 — project everything, find the 2-D bounds, fit to the stage
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of allPts) {
      const q = proj(p);
      if (q[0] < minX) minX = q[0]; if (q[0] > maxX) maxX = q[0];
      if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1];
    }
    const spanX = Math.max(maxX - minX, 1e-6), spanY = Math.max(maxY - minY, 1e-6);
    const fit = (0.80 * Math.min(W, H)) / Math.max(spanX, spanY);
    const ox = (minX + maxX) / 2, oy = (minY + maxY) / 2;
    const toScreen = (p) => {
      const q = proj(p);
      return [W / 2 + (q[0] - ox) * fit, H / 2 - (q[1] - oy) * fit];
    };
    const rp = (p) => toScreen(rotate(p)); // model point → screen, through the orbit

    // lighting: a fixed key from the upper-left-front
    const light = norm3([-0.45, 0.72, 0.62]);

    /* ---- the box wireframe (drawn first, so solids sit on top) ---------- */
    const strokeInk = 'rgba(28,43,58,0.85)';
    if (showBox) {
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = LS > 0.001 ? 'rgba(91,107,123,0.55)' : 'rgba(28,43,58,0.5)';
      ctx.setLineDash(LS > 0.001 ? [5, 5] : []);
      for (const [p, q] of bEdges) {
        const A2 = toScreen(p), B2 = toScreen(q);
        ctx.beginPath(); ctx.moveTo(A2[0], A2[1]); ctx.lineTo(B2[0], B2[1]); ctx.stroke();
      }
      ctx.restore();
      ctx.setLineDash([]);
    }

    /* ---- per-face draw data, across every piece -------------------------
       Each piece is CONVEX, so orienting its normals away from its own
       centroid and keeping the front-facing ones is exact hidden-face
       removal for that piece. The pieces never interpenetrate (they tile the
       box), so one painter's sort over the survivors composites them
       correctly: far first, near last. */
    const draws = [];
    for (const pc of pieces) {
      let gx = 0, gy = 0, gz = 0;
      for (const v of pc.verts) { gx += v[0]; gy += v[1]; gz += v[2]; }
      const centroid = [gx / pc.verts.length, gy / pc.verts.length, gz / pc.verts.length];
      for (const f of pc.faces) {
        const scr = f.pts.map(toScreen);
        let depth = 0;
        for (const p of f.pts) depth += p[2];
        depth /= f.pts.length;
        let n = norm3(cross3(sub(f.pts[1], f.pts[0]), sub(f.pts[2], f.pts[0])));
        let fc = [0, 0, 0];
        for (const p of f.pts) fc = add(fc, p);
        fc = mul(fc, 1 / f.pts.length);
        if (dot3(n, sub(fc, centroid)) < 0) n = mul(n, -1); // outward
        const bright = 0.42 + 0.58 * Math.max(0, dot3(n, light));
        draws.push({
          piece: pc.name, kind: f.kind, scr, depth, bright,
          facing: n[2] > 0, accent: pc.name === FEATURED,
        });
      }
    }
    draws.sort((p, q) => p.depth - q.depth);

    const polyPath = (scr) => {
      ctx.beginPath();
      ctx.moveTo(scr[0][0], scr[0][1]);
      for (let i = 1; i < scr.length; i++) ctx.lineTo(scr[i][0], scr[i][1]);
      ctx.closePath();
    };

    if (S.seeThrough) {
      for (const d of draws) {
        polyPath(d.scr);
        ctx.fillStyle = shade(d.bright, d.accent).replace('rgb', 'rgba').replace(')', ',0.20)');
        ctx.fill();
      }
      for (const d of draws) {
        polyPath(d.scr);
        ctx.lineWidth = d.facing ? 1.8 : 1;
        ctx.setLineDash(d.facing ? [] : [4, 4]);
        ctx.strokeStyle = d.facing ? strokeInk : 'rgba(91,107,123,0.55)';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      ctx.setLineDash([]);
    } else {
      for (const d of draws) {
        if (!d.facing) continue; // exact hidden-face removal on a convex piece
        polyPath(d.scr);
        ctx.fillStyle = shade(d.bright, d.accent);
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = strokeInk;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }

    /* ---- overlays -------------------------------------------------------- */
    const CARM = '#C81E4F';
    /* Bottom labels sit ABOVE the "drag to orbit" hint chip, which is pinned at
       the stage's bottom-left. On a wide canvas a centred label never reaches
       that far left, so the collision is invisible on a desktop and lands
       squarely on top of the hint at phone width — which is exactly why this
       band is reserved rather than eyeballed. */
    const BOT = 38;
    const label = (text, X, Y, color) => {
      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(text).width;
      const bx = Math.min(Math.max(X - tw / 2 - 4, 2), W - tw - 8);
      const by = Math.min(Math.max(Y - 9, 2), H - 20);
      ctx.fillStyle = 'rgba(251,251,248,0.9)';
      ctx.fillRect(bx, by, tw + 8, 18);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text, bx + 4, by + 3);
    };
    const centroidScreen = (name) => {
      const vs = pieceVerts(name, LA, LH, LS);
      let gx = 0, gy = 0, gz = 0;
      for (const v of vs) { gx += v[0]; gy += v[1]; gz += v[2]; }
      return rp([gx / vs.length, gy / vs.length, gz / vs.length]);
    };

    // STEP 0 — name the two parts that define a pyramid
    if (S.focus === 'meet') {
      const ap = rp(apexOf(LH));
      ctx.save();
      ctx.fillStyle = CARM;
      ctx.beginPath(); ctx.arc(ap[0], ap[1], 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      label('apex', ap[0], ap[1] - 16, CARM);
      const b = pieceBase(FEATURED, LA, LH);
      const bc = mul(add(add(b[0], b[1]), add(b[2], b[3])), 0.25);
      const bs = rp(bc);
      label('base', bs[0], bs[1], CARM);
    }

    // STEP 1 — the pyramid against its box: both volumes, one unknown
    if (S.focus === 'prism') {
      label(`box = a² · h = ${fmtFrac(boxFrac(LA, LH))}`, W / 2, 16, '#3A546E');
      label('pyramid = ?', W / 2, H - BOT, CARM);
    }

    // STEP 2 — the count that is the proof
    if (S.focus === 'dissect') {
      label('3 pyramids · 1 box', W / 2, 16, CARM);
      if (LS < 0.02) label('slide split →', W / 2, H - BOT, '#5B6B7B');
    }

    // STEP 3 — the formula, live
    if (S.focus === 'third' || S.focus === 'calib') {
      label(
        `V = ⅓ · B · h = ⅓ · ${trim(LF.base)} · ${trim(LH)} = ${fmtFrac(volFrac(LA, LH))}`,
        W / 2, H - BOT, CARM,
      );
    }

    // STEP 4 — the payoff: three different shapes, one number, printed on each
    if (S.focus === 'siblings') {
      for (const name of PIECES) {
        const c = centroidScreen(name);
        const { B, H: Hh } = pieceBaseHeight(name, LA, LH);
        label(
          `⅓·${trim(B)}·${trim(Hh)} = ${fmtFrac(volFrac(LA, LH))}`,
          c[0], c[1], name === FEATURED ? CARM : '#3A546E',
        );
      }
    }
  }, []);

  useEffect(() => { draw(); }, [a, h, split, step, target, seeThrough, focus, draw]);

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

  /* keep the view sensible per step: only the two dissection steps stay open,
     and the build step starts from a fresh, un-matching solid */
  useEffect(() => {
    if (focus !== 'dissect' && focus !== 'siblings' && split !== 0) setSplit(0);
    if (focus === 'calib') { setA(1); setH(1); setSplit(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* auto-spin — opt-in, time-based, and disabled under reduced-motion */
  useEffect(() => {
    if (!spinning) return;
    if (typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSpinning(false);
      return;
    }
    let raf, last = null;
    const loop = (now) => {
      const dt = last ? (now - last) / 1000 : 0; last = now;
      if (!dragRef.current) rotRef.current.yaw += dt * 0.5;
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spinning, draw]);

  /* ---- orbit interaction -------------------------------------------------- */
  const onPointerDown = (e) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const r = rotRef.current;
    r.yaw += (e.clientX - d.x) * 0.01;
    r.pitch = Math.max(-1.45, Math.min(1.45, r.pitch + (e.clientY - d.y) * 0.01));
    dragRef.current = { x: e.clientX, y: e.clientY };
    draw();
  };
  const onPointerUp = () => { dragRef.current = null; };

  /* ---- dial + nav handlers ------------------------------------------------ */
  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 'a') setA(v);
    else if (key === 'h') setH(v);
    else setSplit(v);
  };
  const dialValue = (key) => (key === 'a' ? a : key === 'h' ? h : split);
  const resetView = () => { rotRef.current = { yaw: 0.34, pitch: 0.34 }; draw(); };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((n) => Math.min(STEPS.length - 1, n + 1));
  const goBack = () => setStep((n) => Math.max(0, n - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* spoken description for screen readers, tuned to the step in focus */
  const spoken = (() => {
    if (focus === 'meet') return 'A pyramid on a square base: 5 faces, 8 edges, 5 vertices.';
    if (focus === 'prism')
      return `A pyramid inside its box. The box holds ${fmtFrac(boxFrac(a, h))}.`;
    if (focus === 'dissect')
      return `Three pyramids fill the box. Split is ${Math.round(split * 100)} percent open.`;
    if (focus === 'third')
      return `Volume equals one third times base ${trim(F.base)} times height ${trim(h)}, which is ${fmtFrac(volFrac(a, h))}.`;
    if (focus === 'siblings')
      return `All three pieces have volume ${fmtFrac(volFrac(a, h))}, even though their shapes differ.`;
    if (focus === 'calib' && target)
      return `Target volume ${target.goal}. Your pyramid holds ${fmtFrac(volFrac(a, h))}.`;
    return 'A pyramid and its box.';
  })();

  /* the carmine headline, per step */
  const headline = (() => {
    if (focus === 'meet') return '5 faces · 8 edges · 5 vertices';
    if (focus === 'prism') return `box = a²h = ${fmtFrac(boxFrac(a, h))} · pyramid = ?`;
    if (focus === 'dissect') return '3 equal pyramids = 1 box';
    if (focus === 'third') return `V = ⅓Bh = ${fmtFrac(volFrac(a, h))}`;
    if (focus === 'siblings') return `each piece = ${fmtFrac(volFrac(a, h))}`;
    if (focus === 'calib' && target) return `goal: V = ${target.goal}`;
    return 'the pyramid';
  })();

  return (
    <div className="plab">
      <header className="head">
        <h1>The Pyramid</h1>
        <p className="lede">
          Every pyramid holds exactly one third of the box on its base:{' '}
          <span className="mono">V = ⅓Bh</span>. Not roughly, not usually —{' '}
          <em>exactly</em>, and for a reason you can see all at once. Three pyramids fit
          together to make the box, so each one is a third of it. Drag to orbit, then open
          the split dial and watch the proof come apart in your hands.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">{headline}</p>
            <p className="equation-sub mono">
              a = {trim(a)} · h = {trim(h)} · box = {fmtFrac(boxFrac(a, h))}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <canvas ref={canvasRef} aria-label={`Interactive 3-D pyramid. ${spoken}`} role="img" />
            <span className="hint mono">drag to orbit</span>
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Base edge</span>
              <span className="fact-v mono">a = {trim(a)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Height</span>
              <span className="fact-v mono">h = {trim(h)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Base area</span>
              <span className="fact-v mono">B = a² = {trim(F.base)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Box (prism)</span>
              <span className="fact-v mono">Bh = {fmtFrac(boxFrac(a, h))}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Pyramid</span>
              <span className="fact-v mono">⅓Bh = {fmtFrac(volFrac(a, h))}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Pieces that fill the box</span>
              <span className="fact-v mono">3</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (spinning ? ' on' : '')}
              onClick={() => setSpinning((v) => !v)}
              aria-pressed={spinning}
            >
              {spinning ? 'Spinning…' : 'Auto-spin'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (seeThrough ? ' on' : '')}
              onClick={() => setSeeThrough((v) => !v)}
              aria-pressed={seeThrough}
            >
              See-through
            </button>
            <button type="button" className="btn ghost" onClick={resetView}>
              Reset view
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

          <p className="eyebrow small">Step {step + 1} of {STEPS.length}</p>
          <h2>{current.title}</h2>
          <p className="body">{current.body}</p>

          <div className="dials">
            {PARAMS.map((d) => {
              const unlocked = step >= d.unlock;
              const val = dialValue(d.key);
              const shown = d.key === 'split' ? Math.round(val * 100) + '%' : trim(val);
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.key === 'split' ? '⧉' : d.label}</span>
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
                  <output className="dv">{unlocked ? shown : '🔒'}</output>
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
              <p className="calib-goal">
                Target volume: <span className="mono goal">{target.goal}</span> cubic units
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  V = {fmtFrac(volFrac(a, h))} · match {pct.toFixed(0)}%
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">find a, h with ⅓a²h = {target.goal}</span>
                )}
              </div>
              {calibrated && alts > 0 && (
                <p className="celebrate">
                  Exactly {target.goal}. And <strong>{alts}</strong> other{' '}
                  {alts === 1 ? 'setting of these dials reaches' : 'settings of these dials reach'}{' '}
                  the same volume with a different shape — a squat wide pyramid and a tall
                  narrow one can hold precisely the same amount.
                </p>
              )}
              <button
                type="button"
                className="btn ghost"
                onClick={() => { setTarget(makeTarget(target)); setA(1); setH(1); }}
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
                  setA(START.a);
                  setH(START.h);
                  setSplit(START.split);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">V = ⅓Bh · three pyramids fill their box</span> &nbsp;·&nbsp;
        a dissection proof rendered live from the dials with a dependency-free 3-D canvas.
      </footer>

      <style jsx>{`
        .plab {
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
        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
        }
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
        .stage-head {
          display: flex; justify-content: space-between; align-items: baseline;
          gap: 12px; flex-wrap: wrap; margin-bottom: 10px;
        }
        .equation {
          font-family: var(--mono); font-variant-numeric: tabular-nums;
          color: var(--curve); font-size: 18px; font-weight: 600; margin: 0;
        }
        .equation-sub { color: var(--ink-soft); font-size: 12.5px; margin: 0; }
        .stage {
          position: relative; width: min(100%, 560px); aspect-ratio: 1 / 1;
          margin: 0 auto; border: 1px solid var(--quad); border-radius: 8px;
          overflow: hidden; touch-action: none; cursor: grab;
          background: radial-gradient(120% 120% at 30% 22%, #fdfefe 0%, #eef3f7 55%, #e3ebf1 100%);
        }
        .stage:active { cursor: grabbing; }
        .stage canvas { display: block; width: 100%; height: 100%; }
        .hint {
          position: absolute; left: 10px; bottom: 9px; font-size: 11px;
          color: var(--ink-soft); background: rgba(251, 251, 248, 0.78);
          padding: 3px 7px; border-radius: 5px; pointer-events: none;
        }
        .facts {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px;
          margin: 14px 4px 4px;
        }
        @media (max-width: 460px) { .facts { grid-template-columns: 1fr; } }
        .fact {
          display: flex; flex-direction: column; gap: 1px; padding: 6px 0;
          border-top: 1px solid rgba(28, 43, 58, 0.08);
        }
        .fact-k {
          font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v { font-size: 13.5px; font-variant-numeric: tabular-nums; }
        .toolbar { margin: 12px 4px 2px; display: flex; gap: 9px; flex-wrap: wrap; }
        .btn {
          font: 600 13px/1 system-ui, sans-serif; padding: 9px 14px;
          border-radius: 8px; cursor: pointer; border: 1px solid var(--ink);
          background: var(--ink); color: #fff;
          transition: background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
        }
        .btn.ghost { background: transparent; color: var(--ink); }
        .btn.ghost.on { background: var(--curve); border-color: var(--curve); color: #fff; }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
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
        .body { margin: 0 0 16px; font-size: 14.5px; }
        .dials { display: grid; gap: 12px; margin-bottom: 6px; }
        .dial {
          display: grid; grid-template-columns: 22px 1fr 52px;
          grid-template-rows: auto auto; align-items: center; gap: 2px 10px;
        }
        .dial.locked { opacity: 0.5; }
        .dk { grid-row: 1 / 3; font-family: var(--serif); font-style: italic; font-size: 19px; }
        .drole { grid-column: 2 / 4; font-size: 11px; color: var(--ink-soft); }
        .dial input[type='range'] { grid-column: 2; width: 100%; accent-color: var(--ink); cursor: pointer; }
        .dial input[type='range']:disabled { cursor: not-allowed; }
        .dv {
          grid-column: 3; font-family: var(--mono); font-variant-numeric: tabular-nums;
          text-align: right; font-size: 13.5px;
        }
        .quiz { margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(28, 43, 58, 0.1); }
        .q { font-size: 14px; font-weight: 600; margin: 0 0 10px; }
        .choices { display: grid; gap: 7px; }
        .choice {
          text-align: left; font: 13.5px/1.4 system-ui, sans-serif;
          padding: 9px 11px 9px 30px; border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 8px; background: var(--paper); color: var(--ink);
          cursor: pointer; position: relative;
          transition: border-color 0.15s, background 0.15s;
        }
        .choice:not(:disabled):hover { border-color: var(--ink); }
        .choice .mark { position: absolute; left: 10px; font-weight: 700; }
        .choice.correct { border-color: var(--ok); background: rgba(31, 138, 91, 0.08); }
        .choice.correct .mark { color: var(--ok); }
        .choice.wrong { border-color: var(--ink-soft); background: rgba(91, 107, 123, 0.08); }
        .choice.wrong .mark { color: var(--ink-soft); }
        .choice.dim { opacity: 0.55; }
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
        .calib-goal { margin: 0; font-size: 14px; }
        .calib-goal .goal { color: var(--curve); font-weight: 700; font-size: 16px; }
        .meter { height: 12px; border-radius: 6px; background: rgba(28, 43, 58, 0.1); overflow: hidden; }
        .meter-fill {
          height: 100%; background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--curve));
          transition: width 0.12s ease-out;
        }
        .meter-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; }
        .target-hint { color: var(--ink-soft); font-size: 12px; }
        .stamp {
          font: 700 12px/1 var(--mono); letter-spacing: 0.16em; color: var(--ok);
          border: 2px solid var(--ok); border-radius: 6px; padding: 4px 8px;
          transform: rotate(-3deg);
        }
        .celebrate {
          margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--ink);
          background: rgba(31, 138, 91, 0.07); border-left: 3px solid var(--ok);
          padding: 9px 11px; border-radius: 0 6px 6px 0;
        }
        .nav { margin-top: 20px; display: flex; justify-content: space-between; gap: 10px; }
        .foot { margin-top: 24px; font-size: 12.5px; color: var(--ink-soft); }
        :global(.plab) :focus-visible {
          outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn, .meter-fill, .choice { transition: none; }
        }
      `}</style>
    </div>
  );
}
