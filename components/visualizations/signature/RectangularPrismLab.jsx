'use client';

/* ============================================================================
   RectangularPrismLab — an interactive "bench" for the RIGHT RECTANGULAR PRISM
   (a box), taught through its SKIN: six faces that come in three congruent
   pairs, and therefore

        SA = 2·(l×w) + 2·(l×h) + 2·(w×h) = 2(lw + lh + wh)

   plus the SPACE DIAGONAL d = √(l² + w² + h²) — the Pythagorean theorem used
   twice — which is the longest straight line that fits inside the box.

   Built for MAIS (math AI system, www.mais.ac), K-12.

   ---------------------------------------------------------------------------
   Scope / why this lab exists — and how it stays DISTINCT from its siblings.
   ---------------------------------------------------------------------------
   Three labs in this library share the same solid, so their ideas are split on
   a clean seam and must NOT drift into each other:

     • VolumeLab  — the SPACE INSIDE the box. Volume as a count of unit CUBES,
                    V = l·w·h = B·h. Signature visual: the box packed with
                    discrete unit cubes.
     • CubeLab    — the special case l = w = h. V = s³, SA = 6s² (all six faces
                    identical, so pairing is invisible). Signature visual: the
                    hinge-tree UNFOLD into a flat Latin-cross net.
     • THIS LAB   — the SKIN and the SHAPE of a general box. Six faces resolve
                    into THREE CONGRUENT PAIRS (the defining property a cube
                    cannot show, since its faces are all alike) → surface area
                    as a count of unit SQUARES; then the space diagonal.
                    Signature visual: the EXPLODED BLOOM — the six gridded
                    panels slide apart along their outward normals until each
                    pair is plainly two copies of one rectangle.
                    CubeLab folds; this lab blooms. Volume appears here only as
                    a cross-referenced fact and as the CONSTRAINT in the final
                    challenge.

   CCSS: 6.G.A.4 (represent a 3-D figure with nets/faces; use them to find
   surface area), 7.G.B.6 (solve real-world problems involving surface area of
   right prisms), 8.G.B.7 (apply the Pythagorean theorem in three dimensions),
   HSG-GMD/HSG-MG (modelling with solids). Grades ~6–8.

   The capstone is deliberately NOT "hit a target volume" (VolumeLab's game):
   it is the classic packaging problem — LEAST CARDBOARD. Given a required
   volume, find the box with the SMALLEST surface area. That teaches the idea
   this lab exists for and that no sibling teaches: volume does not determine
   surface area, and the closer a box is to a cube, the less skin it needs.

   House style: the interactive-math-bench standard — a clean stage, ONE carmine
   accent for the idea in focus, dials that unlock one per lesson step,
   predict-then-check questions gated on ANSWERED, and a calibration challenge
   with a live match meter and a CALIBRATED stamp.

   Delivered the MAIS way: ZERO dependencies. The prism is rendered with a
   hand-rolled 3-D pipeline on a plain <canvas> — rotation, gentle perspective,
   painter's-algorithm depth sorting, two-sided flat shading and hidden-line
   edges are all just a little math here — so there is no Three.js, no WebGL,
   nothing to install. It drops into any Next.js app (app or pages router) and
   its styles are scoped with styled-jsx so nothing leaks into the host.

   DROP-IN USAGE (Next.js):
     1. Save this file anywhere, e.g. app/labs/RectangularPrismLab.jsx
     2. Import and render it:
          import RectangularPrismLab from './RectangularPrismLab';
          export default function Page() { return <RectangularPrismLab />; }

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (l, w, h, explode, …).
     MODEL  — the prism geometry + every formula are pure math; they know no pixels.
     RENDER — the canvas is fully redrawn from state on every change, reading
              state ONLY through sceneRef so the renderer can never see a stale
              closure (the bug that bit CubeLab once).

   All dial values are INTEGERS, so every face area, the surface area and each
   squared diagonal are exact integers — no floating-point fuzz in anything a
   student reads. Diagonals are shown as exact simplified radicals AND decimals.

   Every formula, highlight count, and the calibration gate are checked
   numerically in audit-rectangularprism.mjs.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Small 3-D vector helpers (module scope, pure).
   ------------------------------------------------------------------------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm3 = (a) => {
  const L = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / L, a[1] / L, a[2] / L];
};

/* Axes used throughout: x = length l (across), y = height h (up),
   z = width w (depth). Same convention as VolumeLab, so the two labs agree. */

/* 8 corners of the box centred on the origin, half-extents (hx, hy, hz).
     0..3 = the z = −hz ring (back),  4..7 = the z = +hz ring (front)
   Order matters: EDGES below indexes into this list. */
function boxCorners(hx, hy, hz) {
  return [
    [-hx, -hy, -hz], // 0
    [+hx, -hy, -hz], // 1
    [+hx, +hy, -hz], // 2
    [-hx, +hy, -hz], // 3
    [-hx, -hy, +hz], // 4
    [+hx, -hy, +hz], // 5
    [+hx, +hy, +hz], // 6
    [-hx, +hy, +hz], // 7
  ];
}

/* The six faces, each as an origin + two edge vectors (u, v) + its outward
   normal + how many unit squares it is scored into. THE POINT OF THE LAB:
   `pair` groups them into the three congruent pairs.
     top/bottom  → l × w      front/back → l × h      left/right → w × h
   Each face uses exactly TWO of the three measurements, which is precisely why
   there are exactly three distinct face shapes. */
function boxFaces(l, w, h) {
  const ox = l / 2, oy = h / 2, oz = w / 2;
  return [
    { key: 'top',    pair: 'lw', n: [0, 1, 0],  o: [-ox, +oy, -oz], u: [l, 0, 0], v: [0, 0, w], uc: l, vc: w, a: l, b: w },
    { key: 'bottom', pair: 'lw', n: [0, -1, 0], o: [-ox, -oy, -oz], u: [l, 0, 0], v: [0, 0, w], uc: l, vc: w, a: l, b: w },
    { key: 'front',  pair: 'lh', n: [0, 0, 1],  o: [-ox, -oy, +oz], u: [l, 0, 0], v: [0, h, 0], uc: l, vc: h, a: l, b: h },
    { key: 'back',   pair: 'lh', n: [0, 0, -1], o: [-ox, -oy, -oz], u: [l, 0, 0], v: [0, h, 0], uc: l, vc: h, a: l, b: h },
    { key: 'right',  pair: 'wh', n: [1, 0, 0],  o: [+ox, -oy, -oz], u: [0, 0, w], v: [0, h, 0], uc: w, vc: h, a: w, b: h },
    { key: 'left',   pair: 'wh', n: [-1, 0, 0], o: [-ox, -oy, -oz], u: [0, 0, w], v: [0, h, 0], uc: w, vc: h, a: w, b: h },
  ];
}

/* The twelve edges, as index pairs into boxCorners, tagged with the axis they
   run along and the two faces that meet there. The axis tag drives the "four
   parallel edges" highlight; the face pair drives hidden-line dashing (an edge
   is visible iff at least one adjoining face points at the camera — exact for a
   convex solid). 4 + 4 + 4 = 12. */
const EDGES = [
  { a: 0, b: 1, axis: 'x', fa: 'bottom', fb: 'back' },
  { a: 3, b: 2, axis: 'x', fa: 'top', fb: 'back' },
  { a: 4, b: 5, axis: 'x', fa: 'bottom', fb: 'front' },
  { a: 7, b: 6, axis: 'x', fa: 'top', fb: 'front' },
  { a: 0, b: 3, axis: 'y', fa: 'left', fb: 'back' },
  { a: 1, b: 2, axis: 'y', fa: 'right', fb: 'back' },
  { a: 4, b: 7, axis: 'y', fa: 'left', fb: 'front' },
  { a: 5, b: 6, axis: 'y', fa: 'right', fb: 'front' },
  { a: 0, b: 4, axis: 'z', fa: 'left', fb: 'bottom' },
  { a: 1, b: 5, axis: 'z', fa: 'right', fb: 'bottom' },
  { a: 3, b: 7, axis: 'z', fa: 'left', fb: 'top' },
  { a: 2, b: 6, axis: 'z', fa: 'right', fb: 'top' },
];

/* Which axis each lesson step lights up. */
const AXIS_OF_FOCUS = { length: 'x', width: 'z', height: 'y' };

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Three integer dials (l, w, h) plus the explode dial
   that drives the signature bloom. Integers keep every area and every squared
   diagonal an exact whole number.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'l', label: 'l', min: 1, max: 6, step: 1, unlock: 1, role: 'length — 4 parallel edges' },
  { key: 'w', label: 'w', min: 1, max: 6, step: 1, unlock: 2, role: 'width — front to back' },
  { key: 'h', label: 'h', min: 1, max: 6, step: 1, unlock: 3, role: 'height — bottom to top' },
  { key: 'explode', label: 'e', min: 0, max: 1, step: 0.02, unlock: 4, role: 'pull the six faces apart' },
];
const START = { l: 4, w: 3, h: 2 };

/* ---------------------------------------------------------------------------
   Prism facts — the correctness anchor. Pure math from l, w, h; no pixels.
   Everything here is an exact integer (the diagonals are returned as the
   SQUARED value, which is an integer, plus a decimal for reading).
   ------------------------------------------------------------------------- */
const facts = (l, w, h) => {
  const lw = l * w, lh = l * h, wh = w * h;
  const baseDiagSq = l * l + w * w;
  const spaceDiagSq = l * l + w * w + h * h;
  return {
    lw, lh, wh,
    surface: 2 * (lw + lh + wh), // SA = 2(lw + lh + wh)
    volume: l * w * h,           // cross-reference to VolumeLab; not taught here
    baseDiagSq,
    spaceDiagSq,
    baseDiag: Math.sqrt(baseDiagSq),   // √(l² + w²)
    spaceDiag: Math.sqrt(spaceDiagSq), // √(l² + w² + h²)
    faces: 6, edges: 12, vertices: 8,
  };
};

/* √n as an exact simplified radical: √n = coef·√rad, with rad square-free. */
function simplifySqrt(n) {
  let coef = 1, rad = n;
  for (let f = 2; f * f <= rad; f++) {
    while (rad % (f * f) === 0) { rad /= f * f; coef *= f; }
  }
  return { coef, rad };
}
/* "2√2" / "√29" / "5" — the exact form alone. */
function radStr(n) {
  const { coef, rad } = simplifySqrt(n);
  if (rad === 1) return String(coef);
  return (coef === 1 ? '' : String(coef)) + '√' + rad;
}
/* "√29 ≈ 5.385", or just "5" when the root is exact — never a bare decimal. */
function rootLabel(n) {
  const { rad } = simplifySqrt(n);
  const exact = radStr(n);
  return rad === 1 ? exact : `${exact} ≈ ${Math.sqrt(n).toFixed(3)}`;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration: THE LEAST CARDBOARD CHALLENGE.

   A CONSTRUCTION goal (the skill's sanctioned alternative to curve-matching).
   You are given a required volume; among every box with that volume you must
   find the one with the SMALLEST surface area. This is the classic packaging
   problem, and it is the payoff of the whole lab: many boxes share a volume,
   but they need very different amounts of skin — and the thriftiest is always
   the most cube-like one.

   Every target below is verified in audit-rectangularprism.mjs to have at least
   two boxes within the dial range AND at least two DIFFERENT surface areas (so
   the challenge is a real choice, and so maxSA > minSA never divides by zero).
   ------------------------------------------------------------------------- */
const MAXD = 6; // dial maximum — the box must fit in 1..6 per side
const TARGETS = [8, 12, 16, 18, 24, 30, 36, 48, 60, 72];

const volOf = (l, w, h) => l * w * h;
const saOf = (l, w, h) => 2 * (l * w + l * h + w * h);

/* Every box with volume P and all sides in 1..MAXD, as sorted triples a≤b≤c. */
function triplesFor(P) {
  const out = [];
  for (let a = 1; a <= MAXD; a++) {
    if (P % a !== 0) continue;
    for (let b = a; b <= MAXD; b++) {
      if ((P / a) % b !== 0) continue;
      const c = P / a / b;
      if (c >= b && c <= MAXD) out.push([a, b, c]);
    }
  }
  return out;
}
/* The cheapest and dearest skins available for volume P. */
function saRange(P) {
  const triples = triplesFor(P);
  let min = Infinity, max = -Infinity;
  for (const [a, b, c] of triples) {
    const s = saOf(a, b, c);
    if (s < min) min = s;
    if (s > max) max = s;
  }
  return { min, max, triples };
}

/* The meter. Two honest halves, so the student always knows which half of the
   problem they are in:
     volume wrong  → 0…<60   (how close the volume is)
     volume right  → 60…100  (how close the skin is to the cheapest possible)
   Because l, w, h are integers, a wrong volume misses by at least 1, so the
   first branch is STRICTLY below 60 and can never masquerade as success.
   pct === 100  ⟺  V === goal AND SA === minSA  ⟺  CALIBRATED. The stamp itself
   is gated on that exact integer test below — never on the percentage — so it
   is provably impossible to fire falsely. */
function matchPercent(l, w, h, goal) {
  const V = volOf(l, w, h);
  if (V !== goal) {
    return Math.max(0, Math.min(59.9, 60 * (1 - Math.abs(V - goal) / goal)));
  }
  const { min, max } = saRange(goal);
  if (max === min) return 100; // guarded against by the audited target list
  return 60 + (40 * (max - saOf(l, w, h))) / (max - min);
}
/* The stamp's gate: exact integers only. */
const isCalibrated = (l, w, h, goal) =>
  volOf(l, w, h) === goal && saOf(l, w, h) === saRange(goal).min;

function makeTarget(prev) {
  let goal;
  do {
    goal = TARGETS[Math.floor(Math.random() * TARGETS.length)];
  } while (prev && goal === prev.goal);
  return { goal };
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the reveal lives in `feedback`, never in
   the intro; every distractor is a real student misconception. Next is gated on
   ANSWERED, not on correct.
   The arc: meet the solid → l → w → h → six faces are three pairs →
            SA = 2(lw + lh + wh) → the space diagonal → least cardboard.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the rectangular prism',
    focus: 'intro',
    body:
      'A right rectangular prism — a box — is a solid whose six faces are all rectangles. It has ' +
      '12 edges and 8 corners, called vertices. Just three measurements describe it completely: ' +
      'the length l, the width w and the height h. Drag the box to look all the way around it.',
    q: 'How many faces does a rectangular prism have?',
    choices: ['6', '8', '12'],
    answer: 0,
    feedback:
      '6 faces, 12 edges, 8 vertices. (Euler’s rule checks out: 8 − 12 + 6 = 2.) Every one of the ' +
      'six faces is a rectangle — that is what makes the prism “rectangular.” A cube is just the ' +
      'special box where all three measurements happen to be equal.',
  },
  {
    title: 'l — the length',
    focus: 'length',
    body:
      'The l dial is now live. Length runs left to right. But watch carefully: l is not one edge — ' +
      'FOUR of the box’s twelve edges are exactly l long, and all four are parallel. They are ' +
      'carmine now. Hidden edges are drawn dashed, the way a textbook draws them.',
    q: 'How many of the box’s 12 edges are exactly l long?',
    choices: ['4', '1', '2'],
    answer: 0,
    feedback:
      'Four. The 12 edges split into three groups of 4 parallel edges: 4 of length l, 4 of width w, ' +
      '4 of height h — and 4 + 4 + 4 = 12. That is exactly why three numbers are enough to pin down ' +
      'the whole box.',
  },
  {
    title: 'w — the width',
    focus: 'width',
    body:
      'The w dial unlocks. Width runs front to back, and it too has its own four parallel edges. ' +
      'With l and w together you have the floor of the box: a rectangle l by w.',
    q: 'The floor of the box is a rectangle l by w. If l = 4 and w = 3, what is its area?',
    choices: ['12 square units', '7 square units', '14 square units'],
    answer: 0,
    feedback:
      'l × w = 4 × 3 = 12 square units — the area of a rectangle is length × width. (Adding gives 7, ' +
      'which is the wrong operation; 14 is the floor’s perimeter.) Now look straight up: the lid is ' +
      'the very same 4 by 3 rectangle. Faces come in matching pairs — that is the next idea.',
  },
  {
    title: 'h — the height',
    focus: 'height',
    body:
      'The h dial unlocks: the third and final measurement, running bottom to top, with the last ' +
      'four parallel edges. The box is now completely determined — any l, w, h describes exactly ' +
      'one box shape.',
    q: 'Which two measurements give the area of the FRONT face?',
    choices: ['l and h', 'l and w', 'w and h'],
    answer: 0,
    feedback:
      'The front face is l wide and h tall, so its area is l × h. Here is the key observation: every ' +
      'face uses exactly TWO of the three measurements. There are only three ways to choose two from ' +
      '{l, w, h} — so a box has only three different face shapes: l×w, l×h and w×h.',
  },
  {
    title: 'Six faces, three pairs',
    focus: 'pairs',
    body:
      'The explode dial unlocks — pull the box apart and the six faces bloom outward. Every face has ' +
      'a twin directly opposite it, and the twins are congruent: identical rectangles. The lid ' +
      'matches the floor (l×w), the front matches the back (l×h), the left matches the right (w×h). ' +
      'Use the buttons under the stage to light up one pair at a time.',
    q: 'The front face of a box measures 4 by 2. What are the dimensions of the back face?',
    choices: ['4 by 2', '4 by 3', '2 by 3'],
    answer: 0,
    feedback:
      'The back face is congruent to the front: the same 4 by 2 rectangle. In a rectangular prism ' +
      'opposite faces are always congruent and parallel. So the six faces are really just three ' +
      'rectangles, each used twice — and that “twice” is about to become the 2 in the formula.',
  },
  {
    title: 'SA = 2(lw + lh + wh)',
    focus: 'surface',
    body:
      'Surface area is the total area of the skin — every unit square you could touch from outside. ' +
      'Each face is scored into unit squares, so you could count them one by one. But you already ' +
      'know the shortcut: three rectangles, each appearing twice. Add the three areas, then double.',
    q: 'A box measures l = 4, w = 3, h = 2. What is its surface area?',
    choices: ['52 square units', '24 square units', '26 square units'],
    answer: 0,
    feedback:
      'SA = 2(lw + lh + wh) = 2(12 + 8 + 6) = 2 × 26 = 52 square units. Two classic traps here. 24 is ' +
      'the VOLUME (4 × 3 × 2) — that counts the cubes packed inside, not the skin outside. And 26 is ' +
      'what you get if you forget that each of the three rectangles appears twice. Surface area is ' +
      'always measured in SQUARE units; volume in CUBIC units.',
  },
  {
    title: 'The space diagonal',
    focus: 'diagonal',
    body:
      'The box turns to glass so you can see inside. Cross the floor from one corner to the opposite ' +
      'one: that is a right triangle with legs l and w, so the floor’s diagonal is √(l² + w²). Now ' +
      'rise straight up by h to the far top corner — a second right triangle, standing on that first ' +
      'diagonal. Its hypotenuse is the space diagonal: the longest straight line that fits in the box.',
    q: 'For a box 4 by 3 by 2, how long is the space diagonal?',
    choices: ['√29 ≈ 5.39', '9', '5'],
    answer: 0,
    feedback:
      'd = √(4² + 3² + 2²) = √(16 + 9 + 4) = √29 ≈ 5.39. It is the Pythagorean theorem used twice: ' +
      'first across the floor, √(4² + 3²) = 5, then upward using that 5 and the height 2, giving ' +
      '√(5² + 2²) = √29. Adding the edges (4 + 3 + 2 = 9) is not how distance works — a diagonal is ' +
      'always shorter than travelling around. And 5 is only the floor’s diagonal: it forgets to climb.',
  },
  {
    title: 'The least cardboard challenge',
    focus: 'calib',
    body:
      'You design boxes for a living. A customer needs a box that holds exactly the target number of ' +
      'unit cubes — but cardboard costs money, so among every box with that volume you must find the ' +
      'one with the SMALLEST surface area. The meter reaches 60% the moment your volume is right; ' +
      'the last 40% is the hunt for the thriftiest skin.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   Rendering helpers.
   ------------------------------------------------------------------------- */
const CARM = '#C81E4F';

/* Flat-shading colour. `accent` paints the carmine "object in focus" (the pair
   being taught). `inside` is the pale, unprinted side of the cardboard — once
   the box blooms open you see the back of the far panels, and colouring them
   like the inside of a real carton makes the exploded view instantly readable. */
function shade(bright, accent, inside) {
  const b = Math.max(0.2, Math.min(1, bright));
  let lo, hi;
  if (accent && inside) { lo = [186, 120, 138]; hi = [250, 228, 234]; }
  else if (accent)      { lo = [150, 26, 58];   hi = [242, 150, 172]; }
  else if (inside)      { lo = [138, 150, 162]; hi = [238, 242, 246]; }
  else                  { lo = [58, 84, 110];   hi = [200, 218, 232]; }
  const r = Math.round(lo[0] + (hi[0] - lo[0]) * b);
  const g = Math.round(lo[1] + (hi[1] - lo[1]) * b);
  const bl = Math.round(lo[2] + (hi[2] - lo[2]) * b);
  return `rgb(${r},${g},${bl})`;
}

/* One accent = the mathematical object. Outside the pair steps nothing is
   carmine-filled (there the accent lives on the edges instead). */
const accentOf = (focus, pairSel, face) => {
  if (focus !== 'pairs' && focus !== 'surface') return false;
  if (pairSel === 'all') return true;
  return face.pair === pairSel;
};

const PAIR_LENSES = [
  { key: 'lw', label: 'l × w', note: 'lid & floor' },
  { key: 'lh', label: 'l × h', note: 'front & back' },
  { key: 'wh', label: 'w × h', note: 'left & right' },
  { key: 'all', label: 'All six', note: 'the whole skin' },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function RectangularPrismLab() {
  const [l, setL] = useState(START.l);
  const [w, setW] = useState(START.w);
  const [h, setH] = useState(START.h);
  const [explode, setExplode] = useState(0);
  const [pairSel, setPairSel] = useState('lw');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [spinning, setSpinning] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const rotRef = useRef({ yaw: -0.62, pitch: 0.42 }); // orbit angles (radians)
  const dragRef = useRef(null);
  const sceneRef = useRef({});
  const explodeRef = useRef(0);
  const animRef = useRef(null); // the bloom animation, or null when scrubbing

  const current = STEPS[step];
  const focus = current.focus;
  const F = facts(l, w, h);

  /* Snapshot EVERYTHING the renderer reads. The renderer never closes over
     state — it only ever reads sceneRef.current, so it cannot go stale. */
  sceneRef.current = { l, w, h, explode, pairSel, focus, target };
  explodeRef.current = explode;

  const goal = target ? target.goal : 0;
  const pct = target ? matchPercent(l, w, h, goal) : 0;
  const calibrated = target ? isCalibrated(l, w, h, goal) : false;
  const volumeRight = target ? F.volume === goal : false;

  /* ---- the hand-rolled 3-D renderer: full redraw from state --------------- */
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
    const L = S.l, Wd = S.w, Ht = S.h;
    /* The diagonal step draws a figure THROUGH the closed box, so a bloomed box
       there is meaningless (and the auto-fit would shrink the figure to nothing
       to frame the scattered panels). The dial is disabled on that step too —
       this clamp is the belt to that suspenders, so the broken picture cannot be
       reached even mid-animation. */
    const e = S.focus === 'diagonal' ? 0 : S.explode;
    const LF = facts(L, Wd, Ht); // facts of the CURRENT dims — never a stale closure
    const { yaw, pitch } = rotRef.current;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);

    /* model → camera space: yaw about Y (vertical), then pitch about X.
       A pure rotation, so normals transform with the same function. */
    const rotate = (p) => {
      const x1 = p[0] * cyw + p[2] * syw;
      const z1 = -p[0] * syw + p[2] * cyw;
      const y2 = p[1] * cp - z1 * sp;
      const z2 = p[1] * sp + z1 * cp;
      return [x1, y2, z2];
    };

    const ox = L / 2, oy = Ht / 2, oz = Wd / 2;
    const F6 = boxFaces(L, Wd, Ht);

    /* The bloom: every face slides out along its own outward normal. Opposite
       faces therefore move apart in a straight line, staying parallel and the
       same size — which is exactly the claim the step is making. */
    const off = e * (Math.max(L, Wd, Ht) * 0.5 + 0.75);
    const faceOrigin = (f) => add(f.o, mul(f.n, off));
    const faceQuad = (f) => {
      const O = faceOrigin(f);
      return [O, add(O, f.u), add(add(O, f.u), f.v), add(O, f.v)];
    };

    /* ---- dynamic auto-fit over the CURRENT (possibly bloomed) geometry -----
       Fitting each frame means the bloom stays framed as it opens, and at e = 0
       the 24 face corners collapse onto the 8 box corners, so the framing is
       identical to a plain box. */
    const quads = F6.map((f) => ({ f, q: faceQuad(f) }));
    const rotAll = [];
    for (const { q } of quads) for (const p of q) rotAll.push(rotate(p));

    let cxm = 0, cym = 0, czm = 0;
    for (const p of rotAll) { cxm += p[0]; cym += p[1]; czm += p[2]; }
    cxm /= rotAll.length; cym /= rotAll.length; czm /= rotAll.length;
    let radius = 1e-6;
    for (const p of rotAll)
      radius = Math.max(radius, Math.hypot(p[0] - cxm, p[1] - cym, p[2] - czm));
    const D = 3.6 * radius; // camera distance → gentle, scale-invariant perspective

    const proj = (p) => {
      const x = p[0] - cxm, y = p[1] - cym, z = p[2] - czm;
      const k = D / (D - z);
      return [x * k, y * k, z];
    };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of rotAll) {
      const q = proj(p);
      if (q[0] < minX) minX = q[0]; if (q[0] > maxX) maxX = q[0];
      if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1];
    }
    const spanX = Math.max(maxX - minX, 1e-6), spanY = Math.max(maxY - minY, 1e-6);
    const fit = (0.78 * Math.min(W, H)) / Math.max(spanX, spanY);
    const oxp = (minX + maxX) / 2, oyp = (minY + maxY) / 2;
    const toScreen = (p) => {
      const q = proj(p);
      return [W / 2 + (q[0] - oxp) * fit, H / 2 - (q[1] - oyp) * fit];
    };
    const rp = (pm) => toScreen(rotate(pm)); // model point → screen, through the orbit

    const light = norm3([-0.42, 0.72, 0.6]);
    const glass = S.focus === 'diagonal';

    /* ---- collect the six panels as screen polygons with depth + shading -----
       No back-face culling: once the box blooms the panels are separate flat
       quads and BOTH sides can be seen. A painter's sort alone is exact here —
       the panels never interpenetrate — and at e = 0 the near faces simply
       paint over the far ones, so the closed box still reads as solid. */
    const items = quads.map(({ f, q }) => {
      const rq = q.map(rotate);
      const nc = rotate(f.n);
      const outside = nc[2] > 0;
      const nEff = outside ? nc : mul(nc, -1); // shade whichever side faces us
      return {
        f,
        scr: rq.map(toScreen),
        depth: (rq[0][2] + rq[1][2] + rq[2][2] + rq[3][2]) / 4,
        bright: 0.44 + 0.56 * Math.max(0, dot3(nEff, light)),
        accent: accentOf(S.focus, S.pairSel, f),
        inside: !outside,
      };
    });
    items.sort((a, b) => a.depth - b.depth); // far first

    const polyPath = (scr) => {
      ctx.beginPath();
      ctx.moveTo(scr[0][0], scr[0][1]);
      for (let i = 1; i < scr.length; i++) ctx.lineTo(scr[i][0], scr[i][1]);
      ctx.closePath();
    };

    /* unit-square scoring — the honest way to see that a face IS its area */
    const gridOnFace = (it) => {
      const f = it.f;
      const O = faceOrigin(f);
      ctx.strokeStyle = it.accent ? 'rgba(120,18,46,0.40)' : 'rgba(28,43,58,0.26)';
      ctx.lineWidth = 1;
      for (let i = 1; i < f.uc; i++) {
        const t = i / f.uc;
        const A = rp(add(O, mul(f.u, t)));
        const B = rp(add(add(O, f.v), mul(f.u, t)));
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      }
      for (let j = 1; j < f.vc; j++) {
        const t = j / f.vc;
        const A = rp(add(O, mul(f.v, t)));
        const B = rp(add(add(O, f.u), mul(f.v, t)));
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      }
    };

    for (const it of items) {
      polyPath(it.scr);
      if (glass) {
        ctx.fillStyle = 'rgba(150,178,200,0.15)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(28,43,58,0.22)';
        ctx.lineWidth = 1;
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = shade(it.bright, it.accent, it.inside);
      ctx.fill();
      gridOnFace(it);
      polyPath(it.scr);
      ctx.strokeStyle = it.accent ? 'rgba(150,26,58,0.8)' : 'rgba(28,43,58,0.55)';
      ctx.lineWidth = 1.4;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    /* ---- a small paper-backed label helper ----------------------------------
       Shrinks to fit rather than overflow: on a narrow phone the stage is only
       ~260px and the longer step notes are wider than that, which used to clamp
       the label to a negative x and shear the first character off. */
    const label = (text, X, Y, color) => {
      const FONT = (s) => `${s}px ui-monospace, "SF Mono", Menlo, monospace`;
      let size = 12;
      ctx.font = FONT(size);
      let tw = ctx.measureText(text).width;
      const maxW = W - 12;
      if (tw > maxW) {
        size = Math.max(8, Math.floor((size * maxW) / tw));
        ctx.font = FONT(size);
        tw = ctx.measureText(text).width;
      }
      const bh = size + 6;
      const bx = Math.min(Math.max(X - tw / 2 - 4, 2), Math.max(2, W - tw - 8));
      const by = Math.min(Math.max(Y - bh / 2, 2), Math.max(2, H - bh - 2));
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(bx, by, tw + 8, bh);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, bx + 4, by + bh / 2);
    };

    const C = boxCorners(ox, oy, oz);

    /* ---- the twelve edges, in three groups of four -------------------------- */
    const hotAxis = AXIS_OF_FOCUS[S.focus];
    if (e < 0.02 && (S.focus === 'intro' || hotAxis)) {
      const front = {};
      for (const f of F6) front[f.key] = rotate(f.n)[2] > 0;
      for (const ed of EDGES) {
        const vis = front[ed.fa] || front[ed.fb]; // exact hidden-line test on a convex solid
        const hot = ed.axis === hotAxis;
        const A = rp(C[ed.a]), B = rp(C[ed.b]);
        ctx.save();
        ctx.setLineDash(vis ? [] : [4, 4]);
        ctx.lineWidth = hot ? 4 : 1.6;
        ctx.strokeStyle = hot
          ? (vis ? CARM : 'rgba(200,30,79,0.55)')
          : (vis ? 'rgba(28,43,58,0.6)' : 'rgba(91,107,123,0.45)');
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
        ctx.restore();
      }
      if (hotAxis) {
        const dim = S.focus === 'length' ? `l = ${L}` : S.focus === 'width' ? `w = ${Wd}` : `h = ${Ht}`;
        const ed = EDGES.find((x) => x.axis === hotAxis && (front[x.fa] || front[x.fb]));
        if (ed) {
          const A = rp(C[ed.a]), B = rp(C[ed.b]);
          label(dim, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - 14, CARM);
        }
      }
    }

    /* ---- the space diagonal: the Pythagorean theorem used twice -------------
       Floor triangle 0-1-5 has legs l and w (right angle at 1) and hypotenuse
       the floor diagonal 0-5 = √(l² + w²). The upright triangle 0-5-6 stands on
       it with the vertical leg h (right angle at 5), so its hypotenuse
       0-6 = √((l² + w²) + h²) = √(l² + w² + h²). */
    if (S.focus === 'diagonal') {
      /* WHICH of the four space diagonals we draw is a correctness question, not
         a cosmetic one. The 0–6 diagonal points almost straight down the barrel
         of the default camera: it projects to just 28% of its true length, so it
         would look SHORTER than the edges while the step insists it is the
         longest line in the box — the picture would contradict the words. The
         4–2 diagonal is broadside to this camera (~99% of true length). The
         audit pins this: the drawn diagonal must project longer than every edge.
           PA →PB  leg l  ┐ floor right triangle, right angle at PB,
           PB →PC  leg w  ┘ hypotenuse PA→PC = √(l² + w²)
           PC →PD  climb h  → upright right triangle, right angle at PC,
           PA →PD  hypotenuse = √(l² + w² + h²) = d */
      const PA = C[4], PB = C[5], PC = C[1], PD = C[2];
      const seg = (Am, Bm, color, width, dash) => {
        const A = rp(Am), B = rp(Bm);
        ctx.save();
        ctx.setLineDash(dash || []);
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
        ctx.restore();
      };
      const rightAngle = (P, Q, R) => {
        const m = Math.max(0.14, Math.min(0.34, 0.16 * Math.min(L, Wd, Ht)));
        const a = mul(norm3(sub(Q, P)), m), b = mul(norm3(sub(R, P)), m);
        const s1 = rp(add(P, a)), s2 = rp(add(add(P, a), b)), s3 = rp(add(P, b));
        ctx.save();
        ctx.strokeStyle = 'rgba(28,43,58,0.75)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(s1[0], s1[1]); ctx.lineTo(s2[0], s2[1]); ctx.lineTo(s3[0], s3[1]);
        ctx.stroke();
        ctx.restore();
      };

      seg(PA, PB, 'rgba(91,107,123,0.9)', 2);           // leg l
      seg(PB, PC, 'rgba(91,107,123,0.9)', 2);           // leg w
      seg(PA, PC, 'rgba(28,43,58,0.85)', 2.2, [6, 4]);  // the floor diagonal
      seg(PC, PD, 'rgba(91,107,123,0.9)', 2);           // the climb, h
      rightAngle(PB, PA, PC);
      rightAngle(PC, PA, PD);
      seg(PA, PD, CARM, 4);                             // the space diagonal — the accent

      const mid = (A, B) => [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
      const sAB = mid(rp(PA), rp(PB)), sBC = mid(rp(PB), rp(PC));
      const sAC = mid(rp(PA), rp(PC)), sCD = mid(rp(PC), rp(PD)), sAD = mid(rp(PA), rp(PD));
      label(`l = ${L}`, sAB[0], sAB[1] + 14, '#5b6b7b');
      label(`w = ${Wd}`, sBC[0] + 18, sBC[1] + 8, '#5b6b7b');
      label(`√${LF.baseDiagSq} = ${rootLabel(LF.baseDiagSq)}`, sAC[0], sAC[1] + 16, '#1c2b3a');
      label(`h = ${Ht}`, sCD[0] + 20, sCD[1], '#5b6b7b');
      label(`d = ${rootLabel(LF.spaceDiagSq)}`, sAD[0] - 26, sAD[1] - 12, CARM);
    }

    /* ---- once bloomed, name every panel by its own two measurements --------- */
    if (e > 0.55 && (S.focus === 'pairs' || S.focus === 'surface')) {
      for (const it of items) {
        const f = it.f;
        const cxs = (it.scr[0][0] + it.scr[1][0] + it.scr[2][0] + it.scr[3][0]) / 4;
        const cys = (it.scr[0][1] + it.scr[1][1] + it.scr[2][1] + it.scr[3][1]) / 4;
        label(`${f.a} × ${f.b} = ${f.a * f.b}`, cxs, cys, it.accent ? CARM : '#5b6b7b');
      }
    }

    /* ---- one contextual note at the bottom, matching the step --------------- */
    const note = (() => {
      switch (S.focus) {
        case 'intro':
          return '6 faces · 12 edges · 8 vertices';
        case 'length':
          return `4 parallel edges of length l = ${L}`;
        case 'width':
          return `4 parallel edges of width w = ${Wd} · floor = ${L} × ${Wd} = ${LF.lw}`;
        case 'height':
          return `4 parallel edges of height h = ${Ht}`;
        case 'pairs': {
          if (S.pairSel === 'all') return `three pairs: 2(${LF.lw}) + 2(${LF.lh}) + 2(${LF.wh})`;
          const a = S.pairSel === 'lw' ? LF.lw : S.pairSel === 'lh' ? LF.lh : LF.wh;
          const nm = S.pairSel === 'lw' ? 'l × w' : S.pairSel === 'lh' ? 'l × h' : 'w × h';
          return `2 × (${nm}) = 2 × ${a} = ${2 * a} square units`;
        }
        case 'surface':
          return `SA = 2(${LF.lw} + ${LF.lh} + ${LF.wh}) = ${LF.surface} square units`;
        case 'diagonal':
          return `d² = l² + w² + h² = ${L * L} + ${Wd * Wd} + ${Ht * Ht} = ${LF.spaceDiagSq}`;
        case 'calib':
          return `V = ${LF.volume} · SA = ${LF.surface}`;
        default:
          return '';
      }
    })();
    if (note) label(note, W / 2, H - 15, CARM);
  }, []);

  /* redraw whenever anything the picture depends on changes */
  useEffect(() => { draw(); }, [l, w, h, explode, pairSel, step, target, focus, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* ---- the bloom animation ------------------------------------------------
     Entering the pair steps opens the box; leaving them closes it. Time-based
     (never per-frame), and instant under prefers-reduced-motion. Scrubbing the
     explode dial cancels it — see onExplode. */
  useEffect(() => {
    const to = focus === 'pairs' || focus === 'surface' ? 1 : 0;
    const from = explodeRef.current;
    if (Math.abs(to - from) < 0.001) return;

    const reduce =
      typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { animRef.current = null; setExplode(to); return; }

    animRef.current = { from, to, t0: null };
    let raf;
    const loop = (now) => {
      const a = animRef.current;
      if (!a) return; // cancelled by the dial
      if (a.t0 === null) a.t0 = now;
      const u = Math.min(1, (now - a.t0) / 1100);
      const eased = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
      setExplode(a.from + (a.to - a.from) * eased);
      if (u < 1) raf = requestAnimationFrame(loop);
      else animRef.current = null;
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); animRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* each pair step opens on a sensible lens: one pair first, then the whole skin */
  useEffect(() => {
    if (focus === 'pairs') setPairSel('lw');
    else if (focus === 'surface') setPairSel('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* hand a target to the calibration step the first time we reach it */
  useEffect(() => {
    if (current.calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the challenge starts from a 1×1×1 box, so it always begins un-matched */
  useEffect(() => {
    if (focus === 'calib') { setL(1); setW(1); setH(1); }
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
      if (!dragRef.current) rotRef.current.yaw += dt * 0.5; // pause while dragging
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
  const onKeyDown = (e) => {
    const r = rotRef.current, k = 0.12;
    if (e.key === 'ArrowLeft') r.yaw -= k;
    else if (e.key === 'ArrowRight') r.yaw += k;
    else if (e.key === 'ArrowUp') r.pitch = Math.max(-1.45, r.pitch - k);
    else if (e.key === 'ArrowDown') r.pitch = Math.min(1.45, r.pitch + k);
    else return;
    e.preventDefault();
    draw();
  };

  /* ---- dial + nav handlers ------------------------------------------------ */
  const onExplode = (v) => { animRef.current = null; setExplode(parseFloat(v)); };
  const onParam = (key, value) => {
    if (key === 'explode') return onExplode(value);
    const v = parseInt(value, 10);
    if (key === 'l') setL(v);
    else if (key === 'w') setW(v);
    else setH(v);
  };
  const dialVal = (key) => (key === 'l' ? l : key === 'w' ? w : key === 'h' ? h : explode);
  const resetView = () => { rotRef.current = { yaw: -0.62, pitch: 0.42 }; draw(); };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((n) => Math.min(STEPS.length - 1, n + 1));
  const goBack = () => setStep((n) => Math.max(0, n - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);
  /* the bloom and the pair lens belong to the two steps that teach the pairs;
     elsewhere the box is closed and the explode dial goes idle */
  const showLens = focus === 'pairs' || focus === 'surface';
  const explodeLive = showLens;

  /* spoken description for screen readers, tuned to the step in focus */
  const spoken = (() => {
    switch (focus) {
      case 'length': return `Length l equals ${l}. Four of the twelve edges have this length.`;
      case 'width': return `Width w equals ${w}. The floor is ${l} by ${w}, area ${F.lw}.`;
      case 'height': return `Height h equals ${h}. The front face is ${l} by ${h}, area ${F.lh}.`;
      case 'pairs':
        return pairSel === 'all'
          ? `Six faces in three congruent pairs: two of ${F.lw}, two of ${F.lh}, two of ${F.wh} square units.`
          : `The ${pairSel === 'lw' ? 'lid and floor' : pairSel === 'lh' ? 'front and back' : 'left and right'} pair, each ${
              pairSel === 'lw' ? `${l} by ${w}` : pairSel === 'lh' ? `${l} by ${h}` : `${w} by ${h}`
            } square units.`;
      case 'surface':
        return `Surface area equals 2 times, ${F.lw} plus ${F.lh} plus ${F.wh}, equals ${F.surface} square units.`;
      case 'diagonal':
        return `Space diagonal equals the square root of ${F.spaceDiagSq}, about ${F.spaceDiag.toFixed(2)}.`;
      case 'calib':
        return target
          ? `Target volume ${goal}. Your box is ${l} by ${w} by ${h}: volume ${F.volume}, surface area ${F.surface}.`
          : '';
      default:
        return 'A rectangular prism: six rectangular faces, twelve edges, eight vertices.';
    }
  })();

  /* the carmine headline equation, per step */
  const headline = (() => {
    switch (focus) {
      case 'intro': return '6 faces · 12 edges · 8 vertices';
      case 'length': return `l = ${l}`;
      case 'width': return `w = ${w}`;
      case 'height': return `h = ${h}`;
      case 'pairs': {
        if (pairSel === 'all') return `2(${F.lw}) + 2(${F.lh}) + 2(${F.wh}) = ${F.surface}`;
        const a = pairSel === 'lw' ? F.lw : pairSel === 'lh' ? F.lh : F.wh;
        const nm = pairSel === 'lw' ? 'l × w' : pairSel === 'lh' ? 'l × h' : 'w × h';
        return `2 × (${nm}) = 2 × ${a} = ${2 * a}`;
      }
      case 'surface': return `SA = 2(lw + lh + wh) = ${F.surface}`;
      case 'diagonal': return `d = √(l² + w² + h²) = ${rootLabel(F.spaceDiagSq)}`;
      case 'calib': return target ? `goal: V = ${goal}, least SA` : '';
      default: return 'the rectangular prism';
    }
  })();

  /* the ranked payoff: every box with the target volume, cheapest skin first */
  const ranked = target
    ? saRange(goal).triples
        .map((t) => ({ t, sa: saOf(t[0], t[1], t[2]) }))
        .sort((a, b) => a.sa - b.sa)
    : [];
  const bestSA = target ? saRange(goal).min : 0;
  const wonWithCube = calibrated && l === w && w === h;

  return (
    <div className="rplab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Rectangular Prism</h1>
        <p className="lede">
          A box has six faces — but only <span className="mono">three</span> different rectangles,
          because opposite faces are congruent twins. Unlock the dials to measure{' '}
          <span className="mono">l</span>, <span className="mono">w</span> and{' '}
          <span className="mono">h</span>, then pull the box apart and watch the six faces settle
          into three pairs — that is where{' '}
          <span className="mono">SA = 2(lw + lh + wh)</span> comes from. Finish with the space
          diagonal <span className="mono">√(l² + w² + h²)</span>, and a challenge: build the box
          that holds what the customer needs using the least cardboard.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">{headline}</p>
            <p className="equation-sub mono">
              l = {l} · w = {w} · h = {h} · SA = {F.surface}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <canvas ref={canvasRef} aria-label={`Interactive 3-D rectangular prism. ${spoken}`} role="img" />
            <span className="hint mono">drag or use arrow keys to orbit</span>
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>

          {showLens && (
            <div className="lens" role="group" aria-label="Light up a pair of faces">
              <span className="lens-k">Light up</span>
              {PAIR_LENSES.map((p) => (
                <button
                  type="button"
                  key={p.key}
                  className={'chip' + (pairSel === p.key ? ' on' : '')}
                  aria-pressed={pairSel === p.key}
                  onClick={() => setPairSel(p.key)}
                >
                  {p.label}
                  <span className="chip-note">{p.note}</span>
                </button>
              ))}
            </div>
          )}

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Faces · edges · vertices</span>
              <span className="fact-v mono">6 · 12 · 8</span>
            </div>
            <div className="fact">
              <span className="fact-k">Lid & floor pair</span>
              <span className="fact-v mono">2 × (l·w) = 2 × {F.lw} = {2 * F.lw}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Front & back pair</span>
              <span className="fact-v mono">2 × (l·h) = 2 × {F.lh} = {2 * F.lh}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Left & right pair</span>
              <span className="fact-v mono">2 × (w·h) = 2 × {F.wh} = {2 * F.wh}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Surface area</span>
              <span className="fact-v mono">2(lw+lh+wh) = {F.surface}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Floor diagonal</span>
              <span className="fact-v mono">√(l²+w²) = {rootLabel(F.baseDiagSq)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Space diagonal</span>
              <span className="fact-v mono">√(l²+w²+h²) = {rootLabel(F.spaceDiagSq)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Volume</span>
              <span className="fact-v mono">l·w·h = {F.volume}</span>
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
              const live = unlocked && (d.key !== 'explode' || explodeLive);
              const val = dialVal(d.key);
              return (
                <label
                  className={'dial' + (unlocked ? '' : ' locked') + (unlocked && !live ? ' idle' : '')}
                  key={d.key}
                >
                  <span className="dk">{d.label}</span>
                  <span className="drole">
                    {!unlocked ? 'unlocks soon' : live ? d.role : 'used on the pair steps'}
                  </span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={d.step}
                    value={val}
                    disabled={!live}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">
                    {unlocked ? (d.key === 'explode' ? val.toFixed(2) : val) : '🔒'}
                  </output>
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
                Must hold exactly <span className="mono goal">{goal}</span> unit cubes — using the
                least cardboard.
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  V = {F.volume} · SA = {F.surface} · match {pct.toFixed(0)}%
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {volumeRight ? 'volume ✓ — now shrink the skin' : `need V = ${goal}`}
                  </span>
                )}
              </div>

              {calibrated && (
                <div className="payoff">
                  <p>
                    <span className="mono">{l}×{w}×{h}</span> holds {goal} cubes with only{' '}
                    <span className="mono">{F.surface}</span> square units of cardboard — the least
                    possible.{' '}
                    {wonWithCube
                      ? 'And notice what it is: a cube. A cube is always the thriftiest box of all.'
                      : 'Notice how close to a cube it is — that is the pattern.'}
                  </p>
                  {ranked.length > 1 && (
                    <ul className="rank">
                      {ranked.map(({ t, sa }) => (
                        <li key={t.join('x')} className={sa === bestSA ? 'best' : ''}>
                          <span className="mono">{t.join(' × ')}</span>
                          <span className="mono">{sa} sq units</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {ranked.length > 1 && (
                    <p className="moral">
                      Every box in that list holds the same {goal} cubes, yet they need different
                      amounts of skin. Volume does not decide surface area.
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                className="btn ghost"
                onClick={() => { setTarget(makeTarget(target)); setL(1); setW(1); setH(1); }}
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
                  setL(START.l); setW(START.w); setH(START.h);
                  setExplode(0);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">SA = 2(lw + lh + wh)</span> &nbsp;·&nbsp;
        <span className="mono">d = √(l² + w² + h²)</span> &nbsp;·&nbsp;
        six faces, three congruent pairs — rendered live from the dials with a dependency-free 3-D canvas.
      </footer>

      <style jsx>{`
        .rplab {
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
        /* top-left, not bottom-left: the canvas prints its per-step note across
           the bottom centre, and the longer notes reach far enough left to
           collide with a bottom-anchored hint. */
        .hint {
          position: absolute; left: 10px; top: 9px; font-size: 11px;
          color: var(--ink-soft); background: rgba(251, 251, 248, 0.78);
          padding: 3px 7px; border-radius: 5px; pointer-events: none;
        }
        .lens {
          display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
          margin: 12px 4px 0;
        }
        .lens-k {
          font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--ink-soft); margin-right: 2px;
        }
        .chip {
          display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
          font: 600 12.5px/1.2 var(--mono); padding: 6px 10px; border-radius: 7px;
          border: 1px solid rgba(28, 43, 58, 0.22); background: var(--paper);
          color: var(--ink); cursor: pointer;
          transition: border-color 0.15s, background 0.15s, color 0.15s;
        }
        .chip:hover { border-color: var(--ink); }
        .chip.on { background: var(--curve); border-color: var(--curve); color: #fff; }
        .chip-note {
          font: 400 9.5px/1.2 system-ui, sans-serif; letter-spacing: 0.04em;
          text-transform: uppercase; opacity: 0.72;
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
        .dial.idle { opacity: 0.55; } /* unlocked, but not the subject of this step */
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
        .meter-row {
          display: flex; justify-content: space-between; align-items: center;
          gap: 8px; font-size: 13px; flex-wrap: wrap;
        }
        .target-hint { color: var(--ink-soft); font-size: 12px; }
        .stamp {
          font: 700 12px/1 var(--mono); letter-spacing: 0.16em; color: var(--ok);
          border: 2px solid var(--ok); border-radius: 6px; padding: 4px 8px;
          transform: rotate(-3deg);
        }
        .payoff {
          margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--ink);
          background: rgba(31, 138, 91, 0.06); border-left: 3px solid var(--ok);
          padding: 9px 11px; border-radius: 0 6px 6px 0;
        }
        .payoff p { margin: 0; }
        .rank { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 3px; }
        .rank li {
          display: flex; justify-content: space-between; gap: 10px; font-size: 12px;
          padding: 3px 6px; border-radius: 4px; color: var(--ink-soft);
        }
        .rank li.best { background: rgba(31, 138, 91, 0.14); color: var(--ink); font-weight: 600; }
        .moral { margin: 8px 0 0 !important; color: var(--ink-soft); }
        .nav { margin-top: 20px; display: flex; justify-content: space-between; gap: 10px; }
        .foot { margin-top: 24px; font-size: 12.5px; color: var(--ink-soft); }
        :global(.rplab) :focus-visible {
          outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn, .meter-fill, .choice, .chip { transition: none; }
        }
      `}</style>
    </div>
  );
}
