'use client';

/* ============================================================================
   SphereLab — an interactive "bench" for the sphere: its radius r, the circles
   hiding inside it (ρ² + y² = r²), its surface area 4πr², and its volume
   (4/3)πr³ — the last one DERIVED, not asserted, by Cavalieri's principle.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   CCSS: 8.G.C.9 (know and use the volume formulas for cones, cylinders and
   spheres), HSG-GMD.A.1 / A.2 (informal limit arguments and Cavalieri's
   principle), HSG-GMD.A.3, HSG-GMD.B.4 (cross-sections of 3-D objects).

   House style: the interactive-math-bench standard — a clean stage, ONE carmine
   accent for the idea in focus, dials that unlock one per lesson step,
   predict-then-check questions gated on ANSWERED, and a calibration challenge
   with a live match meter.

   Delivered the MAIS way: ZERO dependencies. The sphere, its circumscribing
   cylinder and its inscribed double cone are all rendered by a hand-rolled 3-D
   pipeline on a plain <canvas> — orbit, back-face culling, flat shading and
   hidden-line dashing are a few lines of math here — so there is no Three.js,
   no WebGL, nothing to install. Styles are scoped with styled-jsx.

   DROP-IN USAGE (Next.js):
     1. Save this file anywhere, e.g. app/labs/SphereLab.jsx
     2. Import and render it:
          import SphereLab from './SphereLab';
          export default function Page() { return <SphereLab />; }

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (r, y, step, view).
     MODEL  — the geometry + formulas are pure math; they know no pixels.
     RENDER — the canvas is fully redrawn from state on every change.

   WHY THIS LAB LOOKS DIFFERENT FROM ITS 3-D SIBLINGS
   Every other solid in this family is *developable*: the cone unrolls into a
   sector, the cylinder into a rectangle, the cube into a net. A sphere does
   not — no piece of it can be flattened without stretching (Gauss), which is
   exactly why every flat world map distorts something. So there is no net to
   unroll here. Instead the centrepiece is the SLICE:

       at height y a sphere of radius r cuts a circle of radius ρ = √(r² − y²)

   and from that single Pythagorean fact Cavalieri's principle hands us the
   volume, because at EVERY height

       sphere slice  =  cylinder slice  −  double-cone slice
       π(r² − y²)    =  πr²            −  πy²

   so the sphere and the (cylinder − double cone) have equal volumes:
       V = 2πr³ − (2/3)πr³ = (4/3)πr³.
   That is a genuine derivation a K-12 student can follow, and it is the
   informal argument the standards actually ask for.

   TWO DELIBERATE DEPARTURES FROM THE SIBLING 3-D LABS, both for correctness:
   (1) ORTHOGRAPHIC projection, not the gentle perspective CubeLab uses. Under
       an orthographic camera a sphere's outline is EXACTLY a circle of radius r
       and parallel slices stay parallel and evenly spaced — both claims this
       lesson makes out loud. Perspective would quietly falsify them.
   (2) A FIXED world scale, not the siblings' per-frame auto-fit. A sphere has
       no shape to change — size is the only thing r does — so auto-fitting
       would make the r dial look broken. Here the sphere really does grow.

   All the mathematics below (the exact π-coefficients, the slice identity, the
   3 : 2 : 1 ratio, and the reachability of every calibration target) is checked
   in audit-sphere.mjs with exact integer arithmetic — no float tolerances.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Small 3-D vector helpers (module scope, pure).
   ------------------------------------------------------------------------- */
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm3 = (a) => {
  const L = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / L, a[1] / L, a[2] / L];
};

/* ---------------------------------------------------------------------------
   EXACT ARITHMETIC.

   Both dials live on a 0.5 grid, so r = a/2 and y = b/2 for integers a, b.
   Every quantity this lab teaches is then a RATIONAL multiple of π:

       surface area   4r²        = a²          · π
       volume         (4/3)r³    = a³/6        · π
       great circle   2r         = a           · π   (circumference)
       great circle   r²         = a²/4        · π   (area)
       slice area     r² − y²    = (a² − b²)/4 · π
       cylinder       2r³        = a³/4        · π
       double cone    (2/3)r³    = a³/12       · π

   So the lab can show "V = 36π" rather than only "≈ 113.097", and the
   calibration stamp can be gated on EXACT equality of integers instead of a
   float tolerance — which is what makes a false CALIBRATED impossible.
   ------------------------------------------------------------------------- */
const gcdInt = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a || 1;
};
function frac(n, d = 1) {
  if (d < 0) { n = -n; d = -d; }
  const g = gcdInt(n, d);
  return { n: n / g, d: d / g };
}
const fracVal = (f) => f.n / f.d;
const fracEq = (A, B) => A.n * B.d === B.n * A.d;

/* grid index: r = a/2 exactly, for r on the 0.5 dial grid */
const gridA = (v) => Math.round(v * 2);

/* the seven exact π-coefficients, from the integer grid indices a = 2r, b = 2y */
const saCoef = (a) => frac(a * a, 1);                 // 4r²
const volCoef = (a) => frac(a * a * a, 6);            // (4/3)r³
const circCoef = (a) => frac(a, 1);                   // 2r
const gcAreaCoef = (a) => frac(a * a, 4);             // r²
const sliceCoef = (a, b) => frac(a * a - b * b, 4);   // r² − y²
const cylVolCoef = (a) => frac(a * a * a, 4);         // 2r³
const coneVolCoef = (a) => frac(a * a * a, 12);       // (2/3)r³

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Two dials, and only two, because a sphere has only one
   measurement to give (r); the second dial, y, drives the LESSON's centrepiece
   — the slicing plane — rather than the shape.
   ------------------------------------------------------------------------- */
const R_MIN = 1;
const R_MAX = 6;
const PARAMS = [
  { key: 'r', label: 'r', min: R_MIN, max: R_MAX, step: 0.5, unlock: 1, role: 'radius — the one measurement' },
  { key: 'y', label: 'y', min: -R_MAX, max: R_MAX, step: 0.5, unlock: 2, role: 'height of the slicing plane' },
];
const START = { r: 3, y: 0 };

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the reveal lives in `feedback`;
   distractors are real student misconceptions. Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the sphere',
    focus: 'define',
    body:
      'A sphere is not simply a “3-D circle”. It is the set of every point in space that sits exactly ' +
      'the same distance — the radius r — from one centre point. Drag the shape to orbit it: the ' +
      'grid lines turn, but the outline never changes. A sphere looks identical from every direction, ' +
      'and no other solid does.',
    q: 'What do ALL the points on a sphere’s surface have in common?',
    choices: [
      'Each one is exactly r from the centre',
      'They all lie in one flat plane through the centre',
      'Each one is exactly r from every other surface point',
    ],
    answer: 0,
    feedback:
      'That single sentence IS the sphere: every surface point is exactly r from the centre. Compare it ' +
      'with a circle — all points in a PLANE at distance r from the centre. Move that same rule from a ' +
      'plane into space and you get a sphere. Two words worth keeping straight: the sphere is the skin ' +
      'only; the solid it wraps is called a ball.',
  },
  {
    title: 'r — the one measurement',
    focus: 'radius',
    body:
      'The r dial is now live. One number sets the entire solid — there is no length, width or height to ' +
      'choose. The carmine spoke is a radius, and the carmine ring is a great circle: the biggest circle ' +
      'you can cut, the one that passes through the centre. It has radius r and goes 2πr around.',
    q: 'A globe measures 20 inches across. Which number belongs in the sphere formulas?',
    choices: [
      'r = 10 — every sphere formula is written in the radius',
      '20 — “across” is the radius',
      '40 — double the width',
    ],
    answer: 0,
    feedback:
      '“Across” is the diameter, d = 2r, so r = 10. This is the single most common sphere mistake, and it ' +
      'is expensive: the formulas square and cube r, so using 20 in place of 10 overstates the surface ' +
      'area by 4× and the volume by 8×. Read the word before you reach for the formula.',
  },
  {
    title: 'Slice it — the circle inside',
    focus: 'slice',
    body:
      'The y dial slides a flat plane up and down through the sphere. Every cut makes a circle — never an ' +
      'oval, never anything else. The inset panel shows why: drop from a point on the cut circle to the ' +
      'centre and you get a right triangle with legs ρ and y and hypotenuse r. Pythagoras does the rest.',
    q: 'You cut a sphere of radius 5 with a plane 3 units above the centre. What is the radius of the circle you cut?',
    choices: [
      '4 — because ρ² = 5² − 3² = 16',
      '2 — because 5 − 3 = 2',
      '8 — because 5 + 3 = 8',
    ],
    answer: 0,
    feedback:
      'ρ² + y² = r² gives ρ² = 25 − 9 = 16, so ρ = 4 — the 3-4-5 triangle, standing up inside the sphere. ' +
      'Subtracting the lengths (5 − 3 = 2) is the classic trap: r is the HYPOTENUSE, so the squares ' +
      'subtract, not the sides. Notice the cut is widest at y = 0, where it becomes the great circle ' +
      '(ρ = r), and shrinks to a single point at the poles (y = ±r).',
  },
  {
    title: 'Volume — Cavalieri’s slices',
    focus: 'cavalieri',
    body:
      'Here is the whole idea. Box the sphere in the snuggest cylinder (radius r, height 2r) and hang a ' +
      'double cone inside it, apex at the centre. Now slide y and watch the inset: the sphere’s disc and ' +
      'the leftover ring — cylinder minus cone — always have exactly the same area, because ' +
      'π(r² − y²) = πr² − πy². Not sometimes. At every single height.',
    q: 'Every horizontal slice of the sphere has the same area as the matching slice of (cylinder − double cone). What follows?',
    choices: [
      'The two solids must have exactly the same volume',
      'They must also have the same surface area',
      'Nothing — matching slices don’t force matching volume',
    ],
    answer: 0,
    feedback:
      'That is Cavalieri’s principle: two solids of the same height whose cross-sections match in area at ' +
      'every level have the same volume — stack the slices and there is nothing left to differ by. So ' +
      'V = (cylinder) − (double cone) = 2πr³ − (2/3)πr³ = (4/3)πr³. That is a real derivation, not a ' +
      'formula to swallow. (Careful with the second choice: equal volume says nothing about surface area.)',
  },
  {
    title: 'Surface area — four great circles',
    focus: 'surface',
    body:
      'Now the skin. SA = 4πr², which is a startling way to say it: the entire curved surface has the same ' +
      'area as exactly FOUR of its own great circles, each πr². The inset lays those four circles out ' +
      'beside the sphere they measure.',
    q: 'Those four circles have the same total area as the skin. Could you actually peel the skin and lay it flat on them?',
    choices: [
      'No — a sphere cannot be flattened without stretching, which is why every flat world map distorts',
      'Yes — peel it carefully into four discs',
      'Yes — any surface can be cut into a flat net',
    ],
    answer: 0,
    feedback:
      'Equal AREA is not the same as equal SHAPE. A cube, a cylinder and a cone all unroll into flat nets, ' +
      'but no patch of a sphere can be flattened without stretching or tearing it — Gauss proved it. That ' +
      'is exactly why every flat map of the Earth lies about something: Greenland balloons, or the ' +
      'distances go wrong. “Four great circles” is a true and useful way to REMEMBER 4πr². It is not a ' +
      'way to build it.',
  },
  {
    title: 'Archimedes — sphere and cylinder',
    focus: 'archimedes',
    body:
      'Put the sphere back in its snug cylinder and compare the three solids you have met. The inset ' +
      'stacks them: cylinder, sphere, double cone. Their volumes fall into the cleanest ratio in ' +
      'geometry — 3 : 2 : 1 — and the two smaller ones add up to the largest.',
    q: 'A sphere of radius r sits snugly inside a cylinder of radius r and height 2r. What fraction of the cylinder does it fill?',
    choices: ['Two thirds', 'One half', 'Three quarters'],
    answer: 0,
    feedback:
      '(4/3)πr³ ÷ 2πr³ = 2/3, and the double cone takes the remaining 1/3 — so cylinder : sphere : cone ' +
      'is 3 : 2 : 1, with 2 + 1 = 3. There is a second coincidence: the sphere’s surface area 4πr² equals ' +
      'the cylinder’s SIDE area 2πr · 2r, to the number. Archimedes thought this pair of facts was the ' +
      'finest thing he ever proved and asked for a sphere in a cylinder to be carved on his tombstone. ' +
      'It was — Cicero found the grave by that carving 137 years later.',
  },
  {
    title: 'Build to order',
    focus: 'calib',
    body:
      'Final challenge, in two moves. First read the order’s size clue and set r — that runs a formula ' +
      'backwards. Then cut the slice it asks for, which runs Pythagoras backwards. Both must be exactly ' +
      'right for the meter to read CALIBRATED. Either height works: a slice at +y and one at −y cut the ' +
      'very same circle.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   Sphere facts — the correctness anchor. Pure math from (r, y).
   Every π-quantity is carried BOTH exactly (as a rational × π) and as a decimal.
   ------------------------------------------------------------------------- */
const facts = (r, y) => {
  const a = gridA(r);
  const b = gridA(y);
  const rho2 = r * r - y * y;
  return {
    a,
    b,
    diameter: 2 * r,
    circ: 2 * Math.PI * r, circC: circCoef(a),
    gcArea: Math.PI * r * r, gcAreaC: gcAreaCoef(a),
    sa: 4 * Math.PI * r * r, saC: saCoef(a),
    vol: (4 / 3) * Math.PI * r * r * r, volC: volCoef(a),
    rho: Math.sqrt(Math.max(0, rho2)), rho2,
    sliceArea: Math.PI * Math.max(0, rho2), sliceC: sliceCoef(a, b),
    cylVol: 2 * Math.PI * r * r * r, cylVolC: cylVolCoef(a),
    coneVol: (2 / 3) * Math.PI * r * r * r, coneVolC: coneVolCoef(a),
    cylLat: 4 * Math.PI * r * r, // = the sphere's own surface area (Archimedes)
  };
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A two-stage CONSTRUCTION goal (the skill's sanctioned
   alternative to a curve match), built so that it exercises this lab's own
   centrepiece rather than a formula lookup:

     stage 1 — a size clue (SA = 100π, or V = 36π) pins r  … invert a formula
     stage 2 — a slice clue (cut area = 16π)      pins |y| … invert Pythagoras

   Targets use integer r and integer |y| < r, so BOTH answers land on the 0.5
   dial grid and every printed coefficient is a whole number.

   WHY THE STAMP CANNOT LIE. Both clues are compared as exact rationals, never
   as floats within a tolerance. The size clue determines r uniquely among
   positive radii (a² = 4r² and a³/6 = (4/3)r³ are both strictly increasing), and
   with r fixed, r² − y² = C determines |y| uniquely. So CALIBRATED fires if and
   only if the student holds the mathematically correct answer — up to the ±y
   symmetry, which really does cut the identical circle.
   ------------------------------------------------------------------------- */
const SA_RADII = [2, 3, 4, 5, 6];   // SA = 4r² ∈ {16, 36, 64, 100, 144} — always whole
const VOL_RADII = [3, 6];           // V = (4/3)r³ ∈ {36, 288} — whole only when 3 | r

function makeTarget(prev) {
  let t;
  do {
    const kind = Math.random() < 0.5 ? 'surface' : 'volume';
    const pool = kind === 'surface' ? SA_RADII : VOL_RADII;
    const r = pool[Math.floor(Math.random() * pool.length)];
    const y = 1 + Math.floor(Math.random() * (r - 1)); // 1 … r−1: a real slice, not the equator or a pole
    t = {
      kind,
      r,
      y,
      clue: kind === 'surface' ? saCoef(gridA(r)) : volCoef(gridA(r)),
      slice: sliceCoef(gridA(r), gridA(y)),
    };
  } while (prev && prev.kind === t.kind && prev.r === t.r && prev.y === t.y);
  return t;
}

/* A guide meter only — the stamp is gated on exact equality, never on this. */
const closeness = (cur, goal) => Math.max(0, Math.min(100, 100 * (1 - Math.abs(cur - goal) / goal)));

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign, trimmed decimals, exact π terms.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
function piStr(f) {
  if (f.n === 0) return '0';
  const head = f.n === 1 ? 'π' : f.n === -1 ? MINUS + 'π' : `${f.n}π`.replace('-', MINUS);
  return f.d === 1 ? head : `${head}/${f.d}`;
}

/* Flat-shading colour: dark→light by brightness; carmine when the surface is
   the accented "object in focus", neutral blue-grey otherwise. */
function shade(bright, accent) {
  const b = Math.max(0.18, Math.min(1, bright));
  const lo = accent ? [150, 26, 58] : [58, 84, 110];
  const hi = accent ? [242, 162, 182] : [206, 222, 234];
  const r = Math.round(lo[0] + (hi[0] - lo[0]) * b);
  const g = Math.round(lo[1] + (hi[1] - lo[1]) * b);
  const bl = Math.round(lo[2] + (hi[2] - lo[2]) * b);
  return `rgb(${r},${g},${bl})`;
}

const CARM = '#C81E4F';
const INK = '#1C2B3A';
const SOFT = '#5B6B7B';

/* Mesh resolution for the sphere. Flat shading quantises each facet to one
   colour, so too few latitude bands read as visible stripes across the shading
   ramp; 48 bands keep neighbouring facets within ~3/255 of each other, which is
   below the eye's threshold. Measured cost is ~2.7 ms per redraw at 2× DPI —
   far inside a 60 fps frame — and the exact silhouette circle is stroked on top,
   so the outline is never faceted however coarse the mesh. */
const NLON = 96;
const NLAT = 48;

/* A point on the sphere. World axes: x across, y UP, z toward the viewer.
   th = latitude ∈ [−π/2, π/2], ph = longitude ∈ [0, 2π). */
const spherePt = (r, th, ph) => [r * Math.cos(th) * Math.cos(ph), r * Math.sin(th), r * Math.cos(th) * Math.sin(ph)];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function SphereLab() {
  const [r, setR] = useState(START.r);
  const [y, setY] = useState(START.y);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [graticule, setGraticule] = useState(true);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const insetWrapRef = useRef(null);
  const insetRef = useRef(null);
  const rotRef = useRef({ yaw: -0.62, pitch: 0.42 }); // orbit angles (radians)
  const dragRef = useRef(null); // { x, y } last pointer, or null
  const sceneRef = useRef({});

  const current = STEPS[step];
  const focus = current.focus;
  const F = facts(r, y);

  const insetMode =
    focus === 'slice' || focus === 'calib' ? 'slice'
      : focus === 'cavalieri' ? 'cavalieri'
        : focus === 'surface' ? 'surface'
          : focus === 'archimedes' ? 'ratio'
            : null;

  // Snapshot everything the (stable) renderer reads, so it never sees stale state.
  sceneRef.current = { r, y, focus, graticule, target, insetMode };

  /* ---- calibration state: exact comparisons, no tolerances ---------------- */
  const curClue = target ? (target.kind === 'surface' ? saCoef(F.a) : volCoef(F.a)) : null;
  const curSlice = target ? sliceCoef(F.a, F.b) : null;
  const clueOK = target ? fracEq(curClue, target.clue) : false;
  const sliceOK = target ? fracEq(curSlice, target.slice) : false;
  const calibrated = clueOK && sliceOK;
  const pct = target
    ? (closeness(fracVal(curClue), fracVal(target.clue)) + closeness(fracVal(curSlice), fracVal(target.slice))) / 2
    : 0;

  /* =========================================================================
     THE HAND-ROLLED 3-D RENDERER — full redraw from state.

     Camera: orthographic. Model → camera space is a yaw about the vertical
     (y) axis then a pitch about the screen-x axis; +z in camera space points at
     the viewer. Everything in this scene is centred on the sphere's centre O, so
     O projects to the middle of the stage and the orbit pivots about it.

     Visibility is EXACT, not sorted: a point p on the sphere has outward normal
     p/r, so it faces the camera exactly when rotate(p)[2] > 0. That one test
     drives the culled mesh, the hidden-line dashing of every circle, and the
     silhouette — no depth buffer, no painter's sort.
     ======================================================================== */
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
    const R = S.r, Y = S.y;               // read the CURRENT dials from the ref…
    const LF = facts(R, Y);               // …and recompute the facts here, never
    const { yaw, pitch } = rotRef.current; // trusting the render-time closure.
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);

    // model → camera space: yaw about the vertical axis, then pitch about x
    const rotate = (p) => {
      const x1 = p[0] * cy + p[2] * sy;
      const z1 = -p[0] * sy + p[2] * cy;
      const y2 = p[1] * cp - z1 * sp;
      const z2 = p[1] * sp + z1 * cp;
      return [x1, y2, z2];
    };

    const showSlice = S.focus === 'slice' || S.focus === 'cavalieri' || S.focus === 'calib';
    const showFrame = S.focus === 'cavalieri' || S.focus === 'archimedes';
    const accentSurface = S.focus === 'surface';

    /* FIXED world scale (see the header note): the sphere must visibly grow with
       r, so nothing here auto-fits. The half-extent admits the largest figure the
       step can show — r = 6 alone, or r = 6 wrapped in its cylinder, whose far
       rim corner sits √(6² + 6²) ≈ 8.49 from O. */
    const WORLD = showFrame ? 8.9 : 6.8;
    const fit = (0.92 * Math.min(W, H)) / (2 * WORLD);

    // camera-space point → screen (Y flips: math-up is screen-down)
    const toScreen = (p) => [W / 2 + p[0] * fit, H / 2 - p[1] * fit];
    const rp = (p) => toScreen(rotate(p));     // model point → screen
    const faces = (p) => rotate(p)[2] > 0;     // is this SPHERE point toward us?

    /* ---- the sphere: a culled, flat-shaded lat/long mesh ------------------ */
    const light = norm3([-0.42, 0.66, 0.62]); // fixed key light, in CAMERA space,
    //                                           so the highlight stays put as you orbit
    const bodyAlpha = showFrame ? 0.5 : 1;    // translucent when construction lines live inside

    ctx.save();
    ctx.globalAlpha = bodyAlpha;
    for (let i = 0; i < NLAT; i++) {
      const th0 = -Math.PI / 2 + (Math.PI * i) / NLAT;
      const th1 = -Math.PI / 2 + (Math.PI * (i + 1)) / NLAT;
      for (let j = 0; j < NLON; j++) {
        const ph0 = (2 * Math.PI * j) / NLON;
        const ph1 = (2 * Math.PI * (j + 1)) / NLON;
        const c0 = spherePt(R, th0, ph0);
        const c1 = spherePt(R, th1, ph0);
        const c2 = spherePt(R, th1, ph1);
        const c3 = spherePt(R, th0, ph1);

        // the quad's outward normal — for a sphere it is just its own direction
        const n = norm3([
          (c0[0] + c1[0] + c2[0] + c3[0]) / 4,
          (c0[1] + c1[1] + c2[1] + c3[1]) / 4,
          (c0[2] + c1[2] + c2[2] + c3[2]) / 4,
        ]);
        const nc = rotate(n);
        if (nc[2] <= 0) continue; // back-face cull — exact for a convex solid

        const bright = 0.4 + 0.6 * Math.max(0, dot3(nc, light));
        const col = shade(bright, accentSurface);
        const s0 = rp(c0), s1 = rp(c1), s2 = rp(c2), s3 = rp(c3);
        ctx.beginPath();
        ctx.moveTo(s0[0], s0[1]);
        ctx.lineTo(s1[0], s1[1]);
        ctx.lineTo(s2[0], s2[1]);
        ctx.lineTo(s3[0], s3[1]);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
        // stroke each facet in its OWN fill colour: hides the antialiased seams
        ctx.strokeStyle = col;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    }
    ctx.restore();

    /* ---- a circle drawn on / inside the sphere ---------------------------
       A horizontal circle of radius rad at height h. `split` uses the textbook
       hidden-line convention: the half toward us solid, the half behind dashed.
       (Valid only when the circle lies ON the surface, i.e. rad² + h² = r².) */
    const circlePts = (rad, h, N = 160) => {
      const out = [];
      for (let k = 0; k <= N; k++) {
        const t = (2 * Math.PI * k) / N;
        out.push([rad * Math.cos(t), h, rad * Math.sin(t)]);
      }
      return out;
    };
    const strokeCircle = (rad, h, { color, lw = 2, split = false, dash = null }) => {
      const pts = circlePts(rad, h);
      ctx.save();
      ctx.lineWidth = lw;
      ctx.strokeStyle = color;
      ctx.lineJoin = 'round';
      if (!split) {
        ctx.setLineDash(dash || []);
        ctx.beginPath();
        pts.forEach((p, k) => { const q = rp(p); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
        ctx.stroke();
      } else {
        // walk the ring twice — once for the near half, once for the far half
        for (const front of [false, true]) {
          ctx.setLineDash(front ? [] : [5, 5]);
          ctx.globalAlpha = front ? 1 : 0.45;
          ctx.beginPath();
          let pen = false;
          for (const p of pts) {
            const vis = rotate(p)[2] > 0;
            const q = rp(p);
            if (vis === front) {
              if (pen) ctx.lineTo(q[0], q[1]); else { ctx.moveTo(q[0], q[1]); pen = true; }
            } else pen = false;
          }
          ctx.stroke();
        }
      }
      ctx.restore();
    };
    const fillDisc = (rad, h, style) => {
      const pts = circlePts(rad, h);
      ctx.beginPath();
      pts.forEach((p, k) => { const q = rp(p); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
      ctx.closePath();
      ctx.fillStyle = style;
      ctx.fill();
    };

    /* ---- graticule: the lines that make the orbit visible ------------------
       Without them a smooth sphere looks frozen while you drag it. Every
       segment is culled by the same exact surface test. */
    if (S.graticule) {
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = accentSurface ? 'rgba(251,251,248,0.5)' : 'rgba(28,43,58,0.22)';
      for (let m = 1; m < 6; m++) { // parallels every 30°, poles excluded
        const th = -Math.PI / 2 + (Math.PI * m) / 6;
        if (Math.abs(th) < 1e-9) continue; // the equator gets its own treatment
        const rad = R * Math.cos(th), h = R * Math.sin(th);
        const pts = circlePts(rad, h, 96);
        ctx.beginPath();
        let pen = false;
        for (const p of pts) {
          const q = rp(p);
          if (faces(p)) { if (pen) ctx.lineTo(q[0], q[1]); else { ctx.moveTo(q[0], q[1]); pen = true; } }
          else pen = false;
        }
        ctx.stroke();
      }
      for (let m = 0; m < 12; m++) { // meridians every 30°
        const ph = (Math.PI * m) / 6;
        ctx.beginPath();
        let pen = false;
        for (let k = 0; k <= 72; k++) {
          const th = -Math.PI / 2 + (Math.PI * k) / 72;
          const p = spherePt(R, th, ph);
          const q = rp(p);
          if (faces(p)) { if (pen) ctx.lineTo(q[0], q[1]); else { ctx.moveTo(q[0], q[1]); pen = true; } }
          else pen = false;
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ---- the exact silhouette --------------------------------------------
       Under an orthographic camera the outline of a sphere is EXACTLY a circle
       of radius r, whatever the orbit. Draw it analytically — crisp, and it
       covers the mesh's faceted rim. */
    const Ocx = W / 2, Ocy = H / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(Ocx, Ocy, R * fit, 0, Math.PI * 2);
    ctx.lineWidth = accentSurface ? 3 : 2;
    ctx.strokeStyle = accentSurface || S.focus === 'define' ? CARM : 'rgba(28,43,58,0.85)';
    ctx.stroke();
    ctx.restore();

    /* ---- small label with a soft paper backing so it stays legible --------
       The clamp only keeps a label inside the stage while the text is narrower
       than the stage. On a phone a long readout would otherwise pin to a
       negative x and bleed off BOTH edges, so measure first and shrink to fit:
       a readout that runs off the canvas states nothing at all. */
    const labFont = (px, weight) => `${weight} ${px}px ui-monospace, "SF Mono", Menlo, monospace`.trim();
    const label = (text, X, Y2, color, weight = '') => {
      let px = 12;
      ctx.font = labFont(px, weight);
      let tw = ctx.measureText(text).width;
      const maxW = W - 14;
      if (tw > maxW) {
        px = Math.max(8.5, px * (maxW / tw));
        ctx.font = labFont(px, weight);
        tw = ctx.measureText(text).width;
      }
      const bh = Math.round(px * 1.5);
      const bx = Math.min(Math.max(X - tw / 2 - 4, 2), Math.max(2, W - tw - 10));
      const by = Math.min(Math.max(Y2 - bh / 2, 2), H - bh - 2);
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(bx, by, tw + 8, bh);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, bx + 4, by + bh / 2);
    };
    /* the stage is square and tracks its column, so a phone gives it ~260px */
    const narrowStage = W < 430;

    /* ---- STEP: the defining property ------------------------------------- */
    if (S.focus === 'define') {
      /* A fan of radii, every one the same length r — the definition, drawn.
         They are auxiliary lines through the solid, so they go on top in the
         textbook convention rather than being hidden by the surface; a dot at
         each tip lands them ON the sphere so the length reads unambiguously.
         Only the tips facing us are drawn: a spoke to the far side would end
         behind the body and read as longer or shorter than it is. */
      const spokes = [
        [0.95, 0.4], [0.5, 1.9], [0.15, 3.4], [-0.35, 5.0], [-0.9, 0.9],
        [0.62, 5.6], [-0.15, 2.5], [0.3, 0.15], [-0.6, 4.1], [0.05, 4.6],
      ];
      ctx.save();
      for (const [th, ph] of spokes) {
        const p = spherePt(R, th, ph);
        if (!faces(p)) continue;
        const q = rp(p);
        ctx.strokeStyle = 'rgba(200,30,79,0.8)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(Ocx, Ocy);
        ctx.lineTo(q[0], q[1]);
        ctx.stroke();
        ctx.fillStyle = CARM;
        ctx.beginPath();
        ctx.arc(q[0], q[1], 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = CARM;
      ctx.beginPath();
      ctx.arc(Ocx, Ocy, 4, 0, Math.PI * 2);
      ctx.fill();
      // the centre's name, set plainly — a boxed label here reads as a stray "0"
      ctx.save();
      ctx.font = 'italic 13px "Iowan Old Style", Palatino, Georgia, serif';
      ctx.fillStyle = CARM;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(251,251,248,0.9)';
      ctx.strokeText('O', Ocx - 6, Ocy + 3);
      ctx.fillText('O', Ocx - 6, Ocy + 3);
      ctx.restore();
      label(narrowStage ? `every one is exactly r = ${trim(R)}` : `every one of these is exactly r = ${trim(R)}`, W / 2, H - 16, CARM);
    }

    /* ---- STEP: r, the great circle, the diameter -------------------------- */
    if (S.focus === 'radius') {
      strokeCircle(R, 0, { color: CARM, lw: 2.6, split: true }); // the great circle
      const p = spherePt(R, 0.28, 0.55);
      const q = rp(p);
      ctx.save();
      ctx.strokeStyle = CARM;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(Ocx, Ocy);
      ctx.lineTo(q[0], q[1]);
      ctx.stroke();
      ctx.fillStyle = CARM;
      ctx.beginPath();
      ctx.arc(Ocx, Ocy, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      label(`r = ${trim(R)}`, (Ocx + q[0]) / 2 + 16, (Ocy + q[1]) / 2 - 4, CARM);
      label(
        narrowStage
          ? `2πr = ${piStr(LF.circC)} ≈ ${trim(LF.circ)}`
          : `great circle: 2πr = ${piStr(LF.circC)} ≈ ${trim(LF.circ)}`,
        W / 2, H - 16, CARM,
      );
    }

    /* ---- STEP: the slicing plane ----------------------------------------- */
    if (showSlice) {
      const rho = LF.rho;
      // the plane's footprint, drawn a little wider than the sphere so it reads as a cut
      const pad = R * 1.22;
      const planeQuad = [
        [-pad, Y, -pad], [pad, Y, -pad], [pad, Y, pad], [-pad, Y, pad],
      ].map(rp);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(planeQuad[0][0], planeQuad[0][1]);
      for (let k = 1; k < 4; k++) ctx.lineTo(planeQuad[k][0], planeQuad[k][1]);
      ctx.closePath();
      ctx.fillStyle = 'rgba(28,43,58,0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(28,43,58,0.28)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.restore();

      if (rho > 1e-9) {
        fillDisc(rho, Y, 'rgba(200,30,79,0.34)');       // the cut face itself
        strokeCircle(rho, Y, { color: CARM, lw: 2.4, split: true }); // its rim, on the surface
      } else {
        const q = rp([0, Y, 0]);                         // a pole: the cut is one point
        ctx.fillStyle = CARM;
        ctx.beginPath();
        ctx.arc(q[0], q[1], 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Name ρ on the disc only where the disc is the whole story. At the
      // Cavalieri step the cone slants and rims cross the disc's centre, and the
      // inset already prints πρ² — a label here would just fight the figure.
      if (S.focus !== 'cavalieri') {
        const qc = rp([0, Y, 0]);
        label(`ρ = ${trim(rho)}`, qc[0], qc[1] - 4, CARM);
        label(
          narrowStage
            ? `cut = ${piStr(LF.sliceC)} ≈ ${trim(LF.sliceArea)}`
            : `cut area = π(r² − y²) = ${piStr(LF.sliceC)} ≈ ${trim(LF.sliceArea)}`,
          W / 2, H - 16, CARM,
        );
      }
    }

    /* ---- STEP: the Archimedes frame — cylinder + inscribed double cone ----
       Construction lines, so they are drawn ON TOP in the dashed grey of a
       textbook auxiliary figure rather than being occluded by the solid. */
    if (showFrame) {
      const GHOST = 'rgba(91,107,123,0.85)';
      ctx.save();
      ctx.strokeStyle = GHOST;
      ctx.lineWidth = 1.4;

      // the two rims: shared by the cylinder AND the double cone's bases
      for (const h of [R, -R]) strokeCircle(R, h, { color: GHOST, lw: 1.4, dash: [6, 5] });

      // the cylinder's two silhouette generators, at the screen-extreme rim points
      let bestL = null, bestR = null;
      for (let k = 0; k < 240; k++) {
        const t = (2 * Math.PI * k) / 240;
        const q = rp([R * Math.cos(t), 0, R * Math.sin(t)]);
        if (!bestL || q[0] < bestL[0]) bestL = [q[0], t];
        if (!bestR || q[0] > bestR[0]) bestR = [q[0], t];
      }
      ctx.setLineDash([6, 5]);
      for (const bt of [bestL, bestR]) {
        const t = bt[1];
        const top = rp([R * Math.cos(t), R, R * Math.sin(t)]);
        const bot = rp([R * Math.cos(t), -R, R * Math.sin(t)]);
        ctx.beginPath();
        ctx.moveTo(top[0], top[1]);
        ctx.lineTo(bot[0], bot[1]);
        ctx.stroke();
      }

      // the double cone: slants from the apex at O out to both rims
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(91,107,123,0.7)';
      for (let m = 0; m < 8; m++) {
        const t = (2 * Math.PI * m) / 8;
        for (const h of [R, -R]) {
          const q = rp([R * Math.cos(t), h, R * Math.sin(t)]);
          ctx.beginPath();
          ctx.moveTo(Ocx, Ocy);
          ctx.lineTo(q[0], q[1]);
          ctx.stroke();
        }
      }
      ctx.restore();

      // at the Cavalieri step the plane also cuts the cylinder and the cone
      if (S.focus === 'cavalieri') {
        strokeCircle(R, Y, { color: 'rgba(28,43,58,0.5)', lw: 1.4, dash: [4, 4] });          // cylinder's cut
        if (Math.abs(Y) > 1e-9)
          strokeCircle(Math.abs(Y), Y, { color: 'rgba(28,43,58,0.5)', lw: 1.4, dash: [4, 4] }); // cone's cut
        label(
          narrowStage
            ? `πρ² = πr² − πy² = ${piStr(LF.sliceC)}`
            : `π(r² − y²) = πr² − πy²  →  ${piStr(LF.sliceC)}`,
          W / 2, H - 16, CARM,
        );
      } else {
        label(
          narrowStage
            ? 'sphere : cylinder = 2 : 3'
            : `sphere : cylinder = ${piStr(LF.volC)} : ${piStr(LF.cylVolC)} = 2 : 3`,
          W / 2, H - 16, CARM,
        );
      }
    }

    /* ---- STEP: the surface itself is the object --------------------------- */
    if (accentSurface) {
      strokeCircle(R, 0, { color: 'rgba(251,251,248,0.9)', lw: 2, split: true });
      label(`SA = 4πr² = ${piStr(LF.saC)} ≈ ${trim(LF.sa)}`, W / 2, H - 16, CARM);
    }
  }, []);

  /* =========================================================================
     THE INSET — a second canvas, drawn face-on, where each step's identity is
     actually READ. The 3-D stage situates the idea; this panel proves it.
     ======================================================================== */
  const drawInset = useCallback(() => {
    const wrap = insetWrapRef.current;
    const canvas = insetRef.current;
    if (!wrap || !canvas) return;
    const S = sceneRef.current;
    if (!S.insetMode) return;
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const R = S.r, Y = S.y;
    const LF = facts(R, Y);
    const mono = (px, w = '') => `${w} ${px}px ui-monospace, "SF Mono", Menlo, monospace`.trim();
    const serif = (px) => `italic ${px}px "Iowan Old Style", Palatino, Georgia, serif`;
    /* On a phone the panel is ~260px wide, so every caption below is sized and
       (where needed) shortened against the real width rather than a fixed one —
       a clipped identity teaches nothing. */
    const narrow = W < 430;

    /* ---- 'slice': the vertical cross-section — where ρ = √(r² − y²) is born */
    if (S.insetMode === 'slice') {
      const pad = 14;
      const fs = narrow ? 10.5 : 13;
      const fsSub = narrow ? 9.5 : 11.5;
      /* The readout's width swings a long way with the dials — a half-integer r
         turns "cut = 8π" into "cut area = 135π/4 ≈ 106.029". So MEASURE the four
         lines and give the diagram whatever is genuinely left over, rather than
         reserving a guessed column and letting the worst case spill. */
      const L1 = 'ρ²  +  y²  =  r²';
      const L2 = narrow
        ? `${trim(LF.rho2)} + ${trim(Y * Y)} = ${trim(R * R)}`
        : `${trim(LF.rho2)}  +  ${trim(Y * Y)}  =  ${trim(R * R)}`;
      const L3 = narrow ? `ρ = ${trim(LF.rho)}` : `ρ = √(r² − y²) = ${trim(LF.rho)}`;
      const L4 = narrow
        ? `cut = ${piStr(LF.sliceC)}`
        : `cut area = ${piStr(LF.sliceC)} ≈ ${trim(LF.sliceArea)}`;
      ctx.font = mono(fs, '600');
      let textW = ctx.measureText(L1).width;
      ctx.font = mono(fs);
      textW = Math.max(textW, ctx.measureText(L2).width);
      ctx.font = mono(fsSub);
      textW = Math.max(textW, ctx.measureText(L3).width, ctx.measureText(L4).width);
      textW += 6;
      const availW = Math.max(W - textW - pad * 2, 40);
      const sc = Math.min((H - 2 * pad) / (2 * R), availW / (2 * R));
      const cx = pad + availW / 2, cy = H / 2;
      const rho = LF.rho;

      // the great circle, seen edge-on: this is the sphere sliced through its centre
      ctx.beginPath();
      ctx.arc(cx, cy, R * sc, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(199,216,228,0.35)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(28,43,58,0.6)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // axes through the centre
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.25)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - R * sc - 8, cy); ctx.lineTo(cx + R * sc + 8, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - R * sc - 8); ctx.lineTo(cx, cy + R * sc + 8); ctx.stroke();
      ctx.restore();

      const yPx = cy - Y * sc;
      // the chord at height y — this is the cut, seen edge-on
      ctx.save();
      ctx.strokeStyle = CARM;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - rho * sc, yPx);
      ctx.lineTo(cx + rho * sc, yPx);
      ctx.stroke();
      ctx.restore();

      // the right triangle: legs ρ and y, hypotenuse r
      ctx.save();
      ctx.strokeStyle = CARM;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, yPx); ctx.stroke();          // leg y
      ctx.beginPath(); ctx.moveTo(cx, yPx); ctx.lineTo(cx + rho * sc, yPx); ctx.stroke(); // leg ρ
      ctx.setLineDash([]);
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + rho * sc, yPx); ctx.stroke(); // hypotenuse r
      // the right-angle marker sits where the legs meet
      if (Math.abs(Y) > 0.01 && rho > 0.01) {
        const m = 8, sgn = Y > 0 ? 1 : -1;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(cx, yPx + sgn * m);
        ctx.lineTo(cx + m, yPx + sgn * m);
        ctx.lineTo(cx + m, yPx);
        ctx.stroke();
      }
      ctx.fillStyle = CARM;
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + rho * sc, yPx, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      ctx.font = serif(13);
      ctx.fillStyle = CARM;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (Math.abs(Y) > 0.3) ctx.fillText('y', cx - 10, (cy + yPx) / 2);
      if (rho > 0.5) ctx.fillText('ρ', cx + (rho * sc) / 2, yPx + (Y >= 0 ? 14 : -14));
      ctx.fillText('r', cx + (rho * sc) / 2 + 8, (cy + yPx) / 2 - 8);

      // the identity, spelled out in numbers that always balance
      const tx = pad + availW + 6;
      ctx.textAlign = 'left';
      ctx.font = mono(fs, '600');
      ctx.fillStyle = INK;
      ctx.fillText(L1, tx, H / 2 - 26);
      ctx.font = mono(fs);
      ctx.fillStyle = CARM;
      ctx.fillText(L2, tx, H / 2 - 4);
      ctx.fillStyle = SOFT;
      ctx.font = mono(fsSub);
      ctx.fillText(L3, tx, H / 2 + 20);
      ctx.fillText(L4, tx, H / 2 + 38);
      return;
    }

    /* ---- 'cavalieri': the disc and the ring, at one shared scale ---------- */
    if (S.insetMode === 'cavalieri') {
      const pad = 30;
      const sc = Math.min((H - 2 * pad - 22) / (2 * R), (W * 0.3) / (2 * R));
      const cyc = H / 2 - 8;
      const ax = W * 0.24, bx = W * 0.72;
      const rho = LF.rho, ay = Math.abs(Y);

      // LEFT — the sphere's disc, radius ρ
      ctx.beginPath();
      ctx.arc(ax, cyc, rho * sc, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,30,79,0.42)';
      ctx.fill();
      ctx.strokeStyle = CARM;
      ctx.lineWidth = 2;
      ctx.stroke();
      // the great circle it sits inside, for scale
      ctx.beginPath();
      ctx.arc(ax, cyc, R * sc, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(28,43,58,0.28)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // RIGHT — the leftover ring: inside the cylinder (r), outside the cone (|y|)
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, cyc, R * sc, 0, Math.PI * 2);
      ctx.arc(bx, cyc, ay * sc, 0, Math.PI * 2, true); // reverse winding cuts the hole
      ctx.closePath();
      ctx.fillStyle = 'rgba(200,30,79,0.42)';
      ctx.fill('evenodd');
      ctx.restore();
      ctx.beginPath();
      ctx.arc(bx, cyc, R * sc, 0, Math.PI * 2);
      ctx.strokeStyle = CARM;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (ay > 1e-9) {
        ctx.beginPath();
        ctx.arc(bx, cyc, ay * sc, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(28,43,58,0.55)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // the equals sign that is the whole lesson
      ctx.font = mono(26, '600');
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('=', (ax + bx) / 2, cyc);

      ctx.font = mono(narrow ? 9.5 : 11);
      ctx.fillStyle = SOFT;
      ctx.fillText('sphere’s disc', ax, cyc + R * sc + 16);
      ctx.fillText('cylinder − cone', bx, cyc + R * sc + 16);
      ctx.font = mono(narrow ? 10 : 12, '600');
      ctx.fillStyle = CARM;
      ctx.fillText(`πρ² = ${piStr(LF.sliceC)}`, ax, cyc + R * sc + 32);
      ctx.fillText(`πr² − πy² = ${piStr(LF.sliceC)}`, bx, cyc + R * sc + 32);
      return;
    }

    /* ---- 'surface': the four great circles ------------------------------- */
    if (S.insetMode === 'surface') {
      const cols = 4;
      const sc = Math.min((H - 54) / (2 * R), (W / (cols + 0.9)) / (2 * R));
      const cyc = H / 2 - 10;
      const gap = 2 * R * sc + 14;
      const x0 = W / 2 - (gap * (cols - 1)) / 2;
      for (let k = 0; k < cols; k++) {
        const cx = x0 + k * gap;
        ctx.beginPath();
        ctx.arc(cx, cyc, R * sc, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,30,79,0.3)';
        ctx.fill();
        ctx.strokeStyle = CARM;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.font = mono(10.5);
        ctx.fillStyle = INK;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('πr²', cx, cyc);
      }
      ctx.font = mono(narrow ? 10 : 12, '600');
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.fillText(
        narrow
          ? `4 × ${piStr(gcAreaCoef(LF.a))} = ${piStr(LF.saC)} = the whole surface`
          : `4 × πr² = 4 × ${piStr(gcAreaCoef(LF.a))} = ${piStr(LF.saC)} = the whole surface`,
        W / 2, cyc + R * sc + 22,
      );
      ctx.font = mono(narrow ? 9 : 11);
      ctx.fillStyle = SOFT;
      ctx.fillText(
        narrow ? 'equal in area — not flattenable onto them' : 'equal in area — but the skin still cannot be flattened onto them',
        W / 2, cyc + R * sc + 40,
      );
      return;
    }

    /* ---- 'ratio': cylinder : sphere : cone = 3 : 2 : 1 -------------------- */
    if (S.insetMode === 'ratio') {
      const rows = [
        { k: 'cylinder', v: LF.cylVolC, n: 3, note: '2πr³' },
        { k: 'sphere', v: LF.volC, n: 2, note: '(4/3)πr³' },
        { k: 'double cone', v: LF.coneVolC, n: 1, note: '(2/3)πr³' },
      ];
      const fs = narrow ? 9.5 : 11.5;
      const left = narrow ? 78 : 104;   // room for the longest row name, right-aligned
      const right = W - (narrow ? 62 : 150);
      const full = Math.max(right - left, 40);
      const top = 18, rowH = Math.min(34, (H - 34) / 3);
      rows.forEach((row, i) => {
        const yy = top + i * rowH;
        const w = (full * row.n) / 3;
        ctx.fillStyle = i === 1 ? CARM : 'rgba(91,107,123,0.55)';
        ctx.fillRect(left, yy, w, rowH - 12);
        ctx.font = mono(fs);
        ctx.fillStyle = INK;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(row.k, left - 8, yy + (rowH - 12) / 2);
        ctx.textAlign = 'left';
        ctx.fillStyle = i === 1 ? CARM : SOFT;
        ctx.font = mono(fs, '600');
        ctx.fillText(`${piStr(row.v)}`, left + w + 8, yy + (rowH - 12) / 2);
        ctx.fillStyle = '#FBFBF8';
        ctx.font = mono(narrow ? 10 : 12, '700');
        ctx.textAlign = 'left';
        if (w > 22) ctx.fillText(String(row.n), left + 6, yy + (rowH - 12) / 2);
      });
      ctx.font = mono(narrow ? 9.5 : 11.5, '600');
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(
        narrow ? '3 : 2 : 1   ·   2 + 1 = 3' : '3 : 2 : 1   ·   sphere + double cone = cylinder   (2 + 1 = 3)',
        W / 2, H - 14,
      );
      return;
    }
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => { draw(); drawInset(); }, [r, y, step, target, graticule, focus, insetMode, draw, drawInset]);

  /* redraw on resize (both canvases are fluid) */
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { draw(); drawInset(); });
    if (stageRef.current) ro.observe(stageRef.current);
    if (insetWrapRef.current) ro.observe(insetWrapRef.current);
    return () => ro.disconnect();
  }, [draw, drawInset, insetMode]);

  /* the slicing plane can never leave the sphere: keep |y| ≤ r as r shrinks.
     Both live on the 0.5 grid, so clamping lands back on the grid exactly. */
  useEffect(() => { setY((v) => Math.max(-r, Math.min(r, v))); }, [r]);

  /* hand a target to the calibration step the first time we reach it */
  useEffect(() => {
    if (current.calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the build step starts from a fresh, un-matching sphere */
  useEffect(() => {
    if (focus === 'calib') { setR(1); setY(0); }
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
      if (!dragRef.current) rotRef.current.yaw += dt * 0.45; // pause the spin while dragging
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spinning, draw]);

  /* ---- orbit interaction: pointer drag AND arrow keys --------------------- */
  const onPointerDown = (e) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const rr = rotRef.current;
    rr.yaw += (e.clientX - d.x) * 0.01;
    rr.pitch = Math.max(-1.45, Math.min(1.45, rr.pitch + (e.clientY - d.y) * 0.01));
    dragRef.current = { x: e.clientX, y: e.clientY };
    draw();
  };
  const onPointerUp = () => { dragRef.current = null; };
  const onStageKey = (e) => {
    const k = e.key;
    const rr = rotRef.current;
    if (k === 'ArrowLeft') rr.yaw -= 0.12;
    else if (k === 'ArrowRight') rr.yaw += 0.12;
    else if (k === 'ArrowUp') rr.pitch = Math.min(1.45, rr.pitch + 0.1);
    else if (k === 'ArrowDown') rr.pitch = Math.max(-1.45, rr.pitch - 0.1);
    else return;
    e.preventDefault();
    draw();
  };

  /* ---- dial + nav handlers ----------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 'r') setR(v);
    else setY(Math.max(-r, Math.min(r, v)));
  };
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

  /* spoken description for screen readers, tuned to the step in focus */
  const spoken = (() => {
    if (focus === 'radius') return `Radius r equals ${trim(r)}. The great circle measures 2 pi r, about ${trim(F.circ)} around.`;
    if (focus === 'slice')
      return `The plane at height y equals ${trim(y)} cuts a circle of radius rho equals ${trim(F.rho)}, because rho squared plus y squared equals r squared.`;
    if (focus === 'cavalieri')
      return `At height ${trim(y)} the sphere's slice and the cylinder-minus-cone slice both have area ${piStr(F.sliceC)}.`;
    if (focus === 'surface') return `Surface area equals 4 pi r squared, ${piStr(F.saC)}, about ${trim(F.sa)}.`;
    if (focus === 'archimedes')
      return `Cylinder ${piStr(F.cylVolC)}, sphere ${piStr(F.volC)}, double cone ${piStr(F.coneVolC)} — a ratio of 3 to 2 to 1.`;
    if (focus === 'calib' && target)
      return `Target: ${target.kind === 'surface' ? 'surface area' : 'volume'} ${piStr(target.clue)} and a cut of area ${piStr(target.slice)}. Yours: ${piStr(curClue)} and ${piStr(curSlice)}.`;
    return `A sphere of radius ${trim(r)}: every surface point is exactly ${trim(r)} from the centre.`;
  })();

  /* the carmine headline equation, per step */
  const headline = (() => {
    if (focus === 'define') return 'every point exactly r from the centre';
    if (focus === 'radius') return `r = ${trim(r)} · d = ${trim(F.diameter)}`;
    if (focus === 'slice') return `ρ = √(r² − y²) = ${trim(F.rho)}`;
    if (focus === 'cavalieri') return `V = 2πr³ − (2/3)πr³ = (4/3)πr³ = ${piStr(F.volC)}`;
    if (focus === 'surface') return `SA = 4πr² = ${piStr(F.saC)}`;
    if (focus === 'archimedes') return 'cylinder : sphere : cone = 3 : 2 : 1';
    if (focus === 'calib' && target)
      return `order: ${target.kind === 'surface' ? 'SA' : 'V'} = ${piStr(target.clue)} · cut = ${piStr(target.slice)}`;
    return 'the sphere';
  })();

  return (
    <div className="slab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Sphere</h1>
        <p className="lede">
          One number runs the whole solid: the radius <span className="mono">r</span>. Drag to orbit it,
          then slide a plane through it — every cut is a circle of radius{' '}
          <span className="mono">√(r² − y²)</span>. That single Pythagorean fact is enough to{' '}
          <em>derive</em> the volume <span className="mono">(4/3)πr³</span>, not just memorise it.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">{headline}</p>
            <p className="equation-sub mono">
              r = {trim(r)} · SA = {piStr(F.saC)} · V = {piStr(F.volC)}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            tabIndex={0}
            onKeyDown={onStageKey}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <canvas ref={canvasRef} aria-label={`Interactive 3-D sphere. ${spoken}`} role="img" />
            {/* a phone has no arrow keys to offer, and the long form eats the stage */}
            <span className="hint mono">
              <span className="hint-full">drag or use ← → ↑ ↓ to orbit</span>
              <span className="hint-short">drag to orbit</span>
            </span>
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>

          {insetMode && (
            <div className="inset-wrap" ref={insetWrapRef}>
              <canvas ref={insetRef} aria-hidden="true" />
            </div>
          )}

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Radius · diameter</span>
              <span className="fact-v mono">r = {trim(r)} · d = {trim(F.diameter)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Great circle</span>
              <span className="fact-v mono">2πr = {piStr(F.circC)} ≈ {trim(F.circ)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Surface area</span>
              <span className="fact-v mono">4πr² = {piStr(F.saC)} ≈ {trim(F.sa)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Volume</span>
              <span className="fact-v mono">(4/3)πr³ = {piStr(F.volC)} ≈ {trim(F.vol)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Slice at y = {trim(y)}</span>
              <span className="fact-v mono">ρ = {trim(F.rho)} · area {piStr(F.sliceC)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Snug cylinder</span>
              <span className="fact-v mono">V = {piStr(F.cylVolC)} · side = {piStr(F.saC)}</span>
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
              className={'btn ghost' + (graticule ? ' on' : '')}
              onClick={() => setGraticule((v) => !v)}
              aria-pressed={graticule}
            >
              Graticule
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
              const val = d.key === 'r' ? r : y;
              const dmin = d.key === 'y' ? -r : d.min;
              const dmax = d.key === 'y' ? r : d.max;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.label}</span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={dmin}
                    max={dmax}
                    step={d.step}
                    value={val}
                    disabled={!unlocked}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? trim(val) : '🔒'}</output>
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
                <span className="ordinal">1</span> Make{' '}
                {target.kind === 'surface' ? 'the surface area' : 'the volume'}{' '}
                <span className="mono goal">{piStr(target.clue)}</span>
                {clueOK && <span className="tick" aria-hidden="true"> ✓</span>}
              </p>
              <p className="calib-goal">
                <span className="ordinal">2</span> Cut the slice of area{' '}
                <span className="mono goal">{piStr(target.slice)}</span>
                {sliceOK && <span className="tick" aria-hidden="true"> ✓</span>}
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {target.kind === 'surface' ? 'SA' : 'V'} = {piStr(curClue)} · cut = {piStr(curSlice)} ·
                  match {pct.toFixed(0)}%
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {!clueOK
                      ? target.kind === 'surface'
                        ? `find r with 4r² = ${target.clue.n}`
                        : `find r with (4/3)r³ = ${trim(fracVal(target.clue))}`
                      : `find y with r² − y² = ${trim(fracVal(target.slice))}`}
                  </span>
                )}
              </div>
              {calibrated && (
                <p className="won" aria-live="polite">
                  Exactly right: r = {trim(target.r)} and y = ±{trim(target.y)}, so the cut circle has
                  radius ρ = {trim(Math.sqrt(target.r * target.r - target.y * target.y))}.
                </p>
              )}
              <button
                type="button"
                className="btn ghost"
                onClick={() => { setTarget(makeTarget(target)); setR(1); setY(0); }}
              >
                New order
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
                  setR(START.r);
                  setY(START.y);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">
          SA = 4πr² · V = (4/3)πr³ · slice ρ² + y² = r² · cylinder : sphere : cone = 3 : 2 : 1
        </span>
        &nbsp;·&nbsp; a sphere rendered live from the dials with a dependency-free 3-D canvas.
      </footer>

      <style jsx>{`
        .slab {
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
        .lede { color: var(--ink-soft); margin: 0 0 22px; max-width: 70ch; }
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
          color: var(--curve); font-size: 17px; font-weight: 600; margin: 0;
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
        /* top-right: the canvas writes its running commentary along the bottom
           edge, and on a narrow stage a centred label would collide with a
           bottom-left hint */
        .hint {
          position: absolute; right: 10px; top: 9px; font-size: 11px;
          color: var(--ink-soft); background: rgba(251, 251, 248, 0.78);
          padding: 3px 7px; border-radius: 5px; pointer-events: none;
        }
        .hint-short { display: none; }
        @media (max-width: 560px) {
          .hint-full { display: none; }
          .hint-short { display: inline; }
        }
        .inset-wrap {
          width: min(100%, 560px); height: 200px; margin: 12px auto 0;
          border: 1px solid var(--quad); border-radius: 8px; background: var(--paper);
          overflow: hidden;
        }
        .inset-wrap canvas { display: block; width: 100%; height: 100%; }
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
          border-top: 1px solid rgba(28, 43, 58, 0.1); display: grid; gap: 8px;
        }
        .calib-goal { margin: 0; font-size: 13.5px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .calib-goal .ordinal {
          display: inline-grid; place-items: center; width: 18px; height: 18px; flex: none;
          border-radius: 50%; background: var(--ink); color: #fff; font: 700 11px/1 var(--mono);
        }
        .calib-goal .goal { color: var(--curve); font-weight: 700; font-size: 15px; }
        .calib-goal .tick { color: var(--ok); font-weight: 700; }
        .meter { height: 12px; border-radius: 6px; background: rgba(28, 43, 58, 0.1); overflow: hidden; margin-top: 4px; }
        .meter-fill {
          height: 100%; background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--curve));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex; justify-content: space-between; align-items: center;
          gap: 8px; font-size: 12px; flex-wrap: wrap;
        }
        .target-hint { color: var(--ink-soft); font-size: 11.5px; }
        .stamp {
          font: 700 12px/1 var(--mono); letter-spacing: 0.16em; color: var(--ok);
          border: 2px solid var(--ok); border-radius: 6px; padding: 4px 8px;
          transform: rotate(-3deg);
        }
        .won {
          margin: 2px 0 0; font-size: 12.5px; color: var(--ok);
          background: rgba(31, 138, 91, 0.07); border-left: 3px solid var(--ok);
          padding: 8px 10px; border-radius: 0 6px 6px 0;
        }
        .nav { margin-top: 20px; display: flex; justify-content: space-between; gap: 10px; }
        .foot { margin-top: 24px; font-size: 12.5px; color: var(--ink-soft); }
        :global(.slab) :focus-visible {
          outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn, .meter-fill, .choice { transition: none; }
        }
      `}</style>
    </div>
  );
}
