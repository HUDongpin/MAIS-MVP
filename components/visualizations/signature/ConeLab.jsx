'use client';

/* ============================================================================
   ConeLab — an interactive "bench" for the RIGHT CIRCULAR CONE, taught through
   its measurements:

        slant height   l = √(r² + h²)          (Pythagorean theorem)
        base area      B = π r²
        lateral area   L = π r l                (the curved side)
        surface area   S = π r² + π r l = π r (r + l)
        volume         V = ⅓ π r² h            (one third of the cylinder)

   where r is the base radius and h is the (perpendicular) height.

   Built for MAIS (math AI system, www.mais.ac), K-12 (Grade 8 · Geometry —
   CCSS 8.G.C.9 / HSG-GMD). House style: the interactive-math-bench standard —
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions (Next gates on ANSWERED, not
   correct), and a calibration challenge with a live match meter.

   Why this lab is different from every other lab in the library:
   a cone is a genuinely THREE-DIMENSIONAL solid, not a curve y = f(x). So the
   2-D quadrille-paper canvas is replaced by a hand-rolled 3-D renderer — an
   orthographic projection with orbit, flat-shaded faces, and back-face culling
   (exact for a convex solid). It is still PURE <canvas> + React hooks: no
   Three.js, no WebGL, no CDN, ZERO external dependencies, so it drops into a
   Next.js app exactly like the 2-D labs. The state→model→render spine, the
   lesson engine, and the calibration meter are the same machine as the others.

   The carmine accent is the cone's own outline (rim + slant edges) and the
   unrolled net — "the mathematical object." Dimension lines (r, h) are drawn
   in ink; targets and the framing cylinder are grey. One accent, held.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/ConeLab.jsx
     2. Import and render it:
          import ConeLab from './ConeLab';
          export default function Page() { return <ConeLab />; }
   Styles are scoped with styled-jsx (built into Next.js), so nothing here can
   leak into or collide with the host app. JS/TS agnostic.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

const TAU = Math.PI * 2;

/* ---------------------------------------------------------------------------
   Parameters. Two dials — radius and height. Each names the lesson step at
   which it unlocks. Ranges are chosen so the classic 3-4-5 cone (r=3, h=4,
   l=5) is reachable exactly, and so every target snaps to the same 0.5 grid.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'r', label: 'r', min: 0.5, max: 4, step: 0.5, unlock: 1, role: 'base radius' },
  { key: 'h', label: 'h', min: 0.5, max: 6.5, step: 0.5, unlock: 2, role: 'height (apex above center)' },
];
const START = { r: 2, h: 3 };
const MAX_R = 4;
const MAX_H = 6.5;

/* Which lesson step first reveals each overlay. */
const STEP = { intro: 0, radius: 1, height: 2, slant: 3, volume: 4, surface: 5, calib: 6 };

/* ---------------------------------------------------------------------------
   MODEL — pure geometry, no pixels. Every quantity a right circular cone has.
   ------------------------------------------------------------------------- */
function metrics(r, h) {
  const l = Math.hypot(r, h); // slant height  √(r² + h²)
  const circumference = TAU * r; // base perimeter  2πr
  const base = Math.PI * r * r; // base area  πr²
  const lateral = Math.PI * r * l; // curved (lateral) area  πrl
  const total = base + lateral; // total surface area
  const volume = (Math.PI * r * r * h) / 3; // ⅓πr²h
  const cylVolume = Math.PI * r * r * h; // the cylinder it sits inside
  const sectorDeg = l === 0 ? 0 : (r / l) * 360; // net sector's central angle
  return { l, circumference, base, lateral, total, volume, cylVolume, sectorDeg };
}

/* ---------------------------------------------------------------------------
   Lesson. One idea per step; the dial unlocks with the step; the reveal lives
   in `feedback` (shown after answering); distractors are real student
   misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the cone',
    body:
      'This is a right circular cone: a flat circular base and one point — the apex — floating directly ' +
      'above the center of that base. Drag the picture to orbit it in 3-D (or use the arrow keys). Two ' +
      'numbers describe the whole shape: the base radius r and the height h.',
    q: 'What makes a solid a right circular cone?',
    choices: [
      'A circular base and one apex directly above the center',
      'Two circular bases joined by a slant',
      'A circular base and an apex above the edge of the base',
    ],
    answer: 0,
    feedback:
      '“Right” means the apex sits directly over the center, so the height h meets the base at a right ' +
      'angle. “Circular” means the base is a circle of radius r. Those two numbers, r and h, generate ' +
      'every measurement of the cone — as the rest of this lab will show.',
  },
  {
    title: 'r — the base radius',
    body:
      'The r dial is live. r is the radius of the circular base — the distance from the center out to ' +
      'the rim. Watch the base widen as you drag it. The dark line from center to rim, labeled r, is ' +
      'that radius.',
    q: 'You double the radius r but keep the height h the same. The base area (πr²) becomes…',
    choices: ['Four times as large', 'Twice as large', 'Unchanged'],
    answer: 0,
    feedback:
      'Base area is πr², so it grows with the SQUARE of r — double r and the base is 2² = 4 times as ' +
      'big. Because volume is ⅓πr²h, the volume also quadruples. Radius is the cone’s most powerful ' +
      'dial: it counts twice.',
  },
  {
    title: 'h — the height',
    body:
      'The h dial is unlocked. h is the perpendicular height — straight up the axis from the base ' +
      'center to the apex, shown as the dashed vertical line. It is NOT the slanted edge; that comes ' +
      'next.',
    q: 'You double the height h but keep the radius r fixed. The volume (⅓πr²h) becomes…',
    choices: ['Twice as large', 'Four times as large', 'Unchanged'],
    answer: 0,
    feedback:
      'Volume is ⅓πr²h, and h appears to the first power, so doubling h simply doubles the volume — a ' +
      'direct, proportional change. Compare that with r, which is squared. Height is a linear dial; ' +
      'radius is a squared one.',
  },
  {
    title: 'Slant height — the Pythagorean edge',
    body:
      'The carmine slanted edge from the rim up to the apex is the slant height l. Radius r (across the ' +
      'base), height h (up the axis), and slant height l form a RIGHT triangle, with the right angle at ' +
      'the center — so l = √(r² + h²).',
    q: 'Set r = 3 and h = 4. Read the slant height l off the panel. What is it?',
    choices: ['l = 5', 'l = 7', 'l = √7'],
    answer: 0,
    feedback:
      'r = 3 and h = 4 give l = √(3² + 4²) = √(9 + 16) = √25 = 5 — the famous 3-4-5 right triangle, ' +
      'standing up inside the cone. The slant height is always the hypotenuse, so l is always longer ' +
      'than both r and h.',
  },
  {
    title: 'Volume — a third of the cylinder',
    body:
      'The grey wireframe now framing the cone is the cylinder with the SAME base and height. The cone ' +
      'fits inside it — and fills exactly one third of it. That is why V = ⅓πr²h: the ⅓ is not a ' +
      'coincidence, it is the cone-to-cylinder ratio.',
    q: 'A cone and a cylinder share the same circular base and the same height. The cone’s volume is…',
    choices: [
      'One third of the cylinder’s',
      'One half of the cylinder’s',
      'Equal to the cylinder’s',
    ],
    answer: 0,
    feedback:
      'Exactly one third: it takes three identical cones of water to fill the matching cylinder. So ' +
      'V(cone) = ⅓ × (base × height) = ⅓πr²h, where πr²h is the cylinder’s volume. The same ⅓ shows ' +
      'up for a pyramid inside its prism.',
  },
  {
    title: 'Surface area — unroll the cone',
    body:
      'The surface has two parts: the circular base (area πr²) and the curved side (the lateral ' +
      'area). Unroll the curved side flat — the net below — and it becomes a SECTOR whose radius ' +
      'is the slant height l and whose arc is the base circumference 2πr.',
    q: 'When the curved side is unrolled flat, the radius of the sector you get is equal to…',
    choices: ['The slant height l', 'The base radius r', 'The height h'],
    answer: 0,
    feedback:
      'The unrolled sector has radius l (every straight line drawn on the cone from rim to apex has ' +
      'length l) and arc length 2πr (the rim it was rolled from). A sector’s area is ½ × radius × arc ' +
      '= ½ × l × 2πr = πrl — the lateral area. Add the base: S = πr² + πrl = πr(r + l).',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery cone is drawn as a grey dashed guide. Match it: tune r and h until ' +
      'your solid cone fills the dashed outline and the meter reads CALIBRATED. Orbit freely — the ' +
      'match depends only on the dimensions, not the viewing angle. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   Calibration. Two parameters to match (r, h); both snap to the same 0.5 grid
   as the target, so an exact match is always reachable. The meter is a simple
   normalized distance in (r, h) space.
   ------------------------------------------------------------------------- */
function calibError(u, t) {
  return Math.hypot(u.r - t.r, u.h - t.h);
}
const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + err / 0.7)));
const MATCH_ERR = 1e-6; // exact match reachable on the grid -> CALIBRATED

function makeTarget(prev) {
  const rs = [1, 1.5, 2, 2.5, 3, 3.5];
  const hs = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  const same = (a, b) => b && a.r === b.r && a.h === b.h;
  let t;
  let guard = 0;
  do {
    t = { r: rs[Math.floor(Math.random() * rs.length)], h: hs[Math.floor(Math.random() * hs.length)] };
    guard++;
  } while (guard < 60 && (same(t, prev) || same(t, START)));
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign, trimmed decimals.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v, dp = 2) {
  const f = Math.pow(10, dp);
  const n = Math.round(v * f) / f;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}

/* ---------------------------------------------------------------------------
   3-D vector helpers.
   ------------------------------------------------------------------------- */
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm3 = (v) => {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
};

/* Orthographic camera. Azimuth spins the scene about the vertical (z) axis;
   elevation tilts the viewer up/down. Returns a rotate() for directions
   (normals) and a project() for points → [screenX, screenY, depth]. The cone
   axis is z (apex at z = h); the base center O is the origin, so it always
   projects to the anchor and orbiting pivots about the base center. */
function camera(az, el, scale, ax, ay) {
  const cA = Math.cos(az);
  const sA = Math.sin(az);
  const cE = Math.cos(el);
  const sE = Math.sin(el);
  const rot = (x, y, z) => {
    const xa = x * cA - y * sA; // spin about z
    const ya = x * sA + y * cA;
    const za = z;
    const Xc = xa; // screen right
    const Yc = za * cE - ya * sE; // screen up  (world z stays mostly vertical)
    const Zc = za * sE + ya * cE; // depth toward viewer (+ = nearer)
    return [Xc, Yc, Zc];
  };
  const project = (x, y, z) => {
    const c = rot(x, y, z);
    return [ax + c[0] * scale, ay - c[1] * scale, c[2]];
  };
  return { rot, project };
}

const LIGHT = norm3([-0.5, 0.78, 0.6]); // fixed in camera space: upper-left, front
const BODY_LO = [92, 120, 150]; // shaded steel-blue (away from light)
const BODY_HI = [216, 230, 242]; // lit steel-blue
const shadeColor = (t, lo = BODY_LO, hi = BODY_HI) => {
  const c = (i) => Math.round(lo[i] + (hi[i] - lo[i]) * t);
  return `rgb(${c(0)}, ${c(1)}, ${c(2)})`;
};

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ConeLab() {
  const [r, setR] = useState(START.r);
  const [h, setH] = useState(START.h);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [spinning, setSpinning] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const netRef = useRef(null);
  const orbitRef = useRef({ az: -0.6, el: 0.42 }); // camera angles (kept in a ref so orbit never re-renders)
  const dragRef = useRef(null); // { x, y } while dragging, else null
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const m = metrics(r, h);

  const showR = !calib && step >= STEP.radius;
  const showH = !calib && step >= STEP.height;
  const showTri = !calib && step >= STEP.slant; // slant edge highlighted + right angle
  const showCyl = !calib && step === STEP.volume;
  const showNet = !calib && step === STEP.surface;

  // Snapshot everything the renderer needs, so draw() (a stable callback) and the
  // pointer/keyboard handlers never read stale values.
  sceneRef.current = { r, h, calib, target, showR, showH, showTri, showCyl };

  const err = target ? calibError({ r, h }, target) : Infinity;
  const pct = target ? matchPercent(err) : 0;
  const calibrated = target ? err <= MATCH_ERR : false;

  /* ---- the 3-D render: full redraw from state ---------------------------- */
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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const rr = S.r;
    const hh = S.h;

    // Fixed scale from the MAX dimensions, so bigger cones genuinely look
    // bigger (you SEE volume grow) and everything still fits.
    const scale = Math.min((W * 0.42) / MAX_R, (H * 0.46) / MAX_H);
    const ax = W / 2;
    const ay = H * 0.6; // base center anchored a little low, apex has room above
    const { rot, project } = camera(orbitRef.current.az, orbitRef.current.el, scale, ax, ay);

    const N = 128; // base-circle segments
    const apex = [0, 0, hh];
    const apexP = project(apex[0], apex[1], apex[2]);

    // base rim vertices + their projections
    const bv = new Array(N);
    const bp = new Array(N);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      bv[i] = [rr * Math.cos(a), rr * Math.sin(a), 0];
      bp[i] = project(bv[i][0], bv[i][1], bv[i][2]);
    }

    // per-lateral-face outward normal (∝ (h cosφ, h sinφ, r)) rotated to camera
    const front = new Array(N);
    const shade = new Array(N);
    for (let i = 0; i < N; i++) {
      const a = ((i + 0.5) / N) * TAU;
      const nc = norm3(rot(hh * Math.cos(a), hh * Math.sin(a), rr));
      front[i] = nc[2] > 0; // faces the camera → visible on a convex solid
      shade[i] = 0.28 + 0.72 * Math.max(0, dot3(nc, LIGHT));
    }
    const baseNc = rot(0, 0, -1); // base outward normal points down
    const baseFront = baseNc[2] > 0; // visible only when seen from below

    /* ---- soft ground contact (subtle) ---- */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(bp[0][0], bp[0][1]);
    for (let i = 1; i < N; i++) ctx.lineTo(bp[i][0], bp[i][1]);
    ctx.closePath();
    ctx.fillStyle = 'rgba(28,43,58,0.06)';
    ctx.fill();
    ctx.restore();

    /* ---- base disk (only when we can see its underside) ---- */
    if (baseFront) {
      const bshade = 0.30 + 0.55 * Math.max(0, dot3(norm3(baseNc), LIGHT));
      ctx.beginPath();
      ctx.moveTo(bp[0][0], bp[0][1]);
      for (let i = 1; i < N; i++) ctx.lineTo(bp[i][0], bp[i][1]);
      ctx.closePath();
      ctx.fillStyle = shadeColor(bshade, [120, 132, 150], [206, 216, 228]);
      ctx.fill();
    }

    /* ---- lateral surface: fill every front-facing triangle (convex solid →
           back-face culling is exact, no depth sort needed) ---- */
    for (let i = 0; i < N; i++) {
      if (!front[i]) continue;
      const j = (i + 1) % N;
      const col = shadeColor(Math.max(0, Math.min(1, shade[i])));
      ctx.beginPath();
      ctx.moveTo(apexP[0], apexP[1]);
      ctx.lineTo(bp[i][0], bp[i][1]);
      ctx.lineTo(bp[j][0], bp[j][1]);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.strokeStyle = col; // hide antialiased seams between facets
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    }

    /* ---- small drawing helpers (screen space) ---- */
    const seg = (P, Q, color, width, dash) => {
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.setLineDash(dash || []);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(P[0], P[1]);
      ctx.lineTo(Q[0], Q[1]);
      ctx.stroke();
      ctx.restore();
    };
    const dot = (P, rad, fill, ring) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(P[0], P[1], rad, 0, TAU);
      ctx.fillStyle = fill;
      ctx.fill();
      if (ring) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = ring;
        ctx.stroke();
      }
      ctx.restore();
    };
    const chip = (text, X, Y, color) => {
      ctx.save();
      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(text).width;
      const bx = Math.min(Math.max(X, 4), W - tw - 8);
      const by = Math.min(Math.max(Y, 2), H - 17);
      ctx.fillStyle = 'rgba(251,251,248,0.86)';
      ctx.fillRect(bx - 3, by, tw + 6, 16);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text, bx, by + 2);
      ctx.restore();
    };

    const INK = '#1c2b3a';
    const INK_SOFT = '#5b6b7b';
    const CARMINE = '#c81e4f';

    /* ---- framing cylinder (volume step): same base + height, grey wireframe ---- */
    if (S.showCyl) {
      const tp = new Array(N);
      for (let i = 0; i < N; i++) tp[i] = project(bv[i][0], bv[i][1], hh);
      // top rim
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(91,107,123,0.6)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(tp[0][0], tp[0][1]);
      for (let i = 1; i < N; i++) ctx.lineTo(tp[i][0], tp[i][1]);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      // two vertical silhouette posts (leftmost / rightmost rim points)
      let iMin = 0;
      let iMax = 0;
      for (let i = 1; i < N; i++) {
        if (bp[i][0] < bp[iMin][0]) iMin = i;
        if (bp[i][0] > bp[iMax][0]) iMax = i;
      }
      seg(bp[iMin], tp[iMin], 'rgba(91,107,123,0.6)', 1.4, [5, 5]);
      seg(bp[iMax], tp[iMax], 'rgba(91,107,123,0.6)', 1.4, [5, 5]);
      chip('cylinder  V = πr²h', tp[iMax][0] + 6, tp[iMax][1] - 6, INK_SOFT);
    }

    /* ---- target ghost (calibration): grey dashed wireframe over the solid ---- */
    if (S.calib && S.target) {
      const t = S.target;
      const tApex = project(0, 0, t.h);
      const tp = new Array(N);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU;
        tp[i] = project(t.r * Math.cos(a), t.r * Math.sin(a), 0);
      }
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(91,107,123,0.95)';
      ctx.setLineDash([7, 6]);
      ctx.beginPath(); // target rim
      ctx.moveTo(tp[0][0], tp[0][1]);
      for (let i = 1; i < N; i++) ctx.lineTo(tp[i][0], tp[i][1]);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      // target slant edges (leftmost / rightmost)
      let iMin = 0;
      let iMax = 0;
      for (let i = 1; i < N; i++) {
        if (tp[i][0] < tp[iMin][0]) iMin = i;
        if (tp[i][0] > tp[iMax][0]) iMax = i;
      }
      seg(tp[iMin], tApex, 'rgba(91,107,123,0.95)', 2, [7, 6]);
      seg(tp[iMax], tApex, 'rgba(91,107,123,0.95)', 2, [7, 6]);
    }

    /* ---- the cone's own outline — the carmine accent ----
       Rim: visible edges solid, hidden edges faint dashed (textbook solid
       convention). Silhouette generators: apex → the two rim points where
       front-facing flips to back-facing. */
    ctx.save();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = CARMINE;
    ctx.setLineDash([]);
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      if (front[i] || baseFront) {
        ctx.moveTo(bp[i][0], bp[i][1]);
        ctx.lineTo(bp[j][0], bp[j][1]);
      }
    }
    ctx.stroke();
    ctx.restore();

    ctx.save(); // hidden rim, faint dashed
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = 'rgba(200,30,79,0.35)';
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      if (!(front[i] || baseFront)) {
        ctx.moveTo(bp[i][0], bp[i][1]);
        ctx.lineTo(bp[j][0], bp[j][1]);
      }
    }
    ctx.stroke();
    ctx.restore();

    // silhouette generators (front↔back boundary rim vertices)
    const sil = [];
    for (let i = 0; i < N; i++) {
      const prev = (i - 1 + N) % N;
      if (front[i] !== front[prev]) sil.push(i);
    }
    for (const i of sil) seg(apexP, bp[i], CARMINE, 2.4);

    /* ---- dimension overlays: the right triangle r · h · l ----
       Use the rightmost rim point (max screenX): it lies on the silhouette,
       so its slant edge is the visible right outline, and the radius reads at
       full length broadside to the viewer. */
    let iR = 0;
    for (let i = 1; i < N; i++) if (bp[i][0] > bp[iR][0]) iR = i;
    const O = project(0, 0, 0); // base center
    const rimP = bp[iR];

    if (S.showTri) {
      // slant edge highlighted (it is a silhouette generator, already carmine —
      // draw a thicker carmine over it and label l)
      seg(rimP, apexP, CARMINE, 3);
      // label to the RIGHT of the slant edge (paired with h, which sits left of
      // the axis) so the two never collide on a tall, thin cone
      chip('l = ' + trim(Math.hypot(rr, hh)), (rimP[0] + apexP[0]) / 2 + 12, (rimP[1] + apexP[1]) / 2 - 8, CARMINE);
      // right-angle marker at the base center, between radius and axis
      const ur = norm3([bv[iR][0], bv[iR][1], 0]); // unit radius direction (object)
      const d = Math.min(0.5, rr * 0.4, hh * 0.4);
      const c1 = project(ur[0] * d, ur[1] * d, 0);
      const c12 = project(ur[0] * d, ur[1] * d, d);
      const c2 = project(0, 0, d);
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.moveTo(c1[0], c1[1]);
      ctx.lineTo(c12[0], c12[1]);
      ctx.lineTo(c2[0], c2[1]);
      ctx.stroke();
      ctx.restore();
    }
    if (S.showH) {
      seg(O, apexP, INK, 1.8, [5, 4]); // height up the axis
      // label to the LEFT of the axis so it clears the carmine slant label
      chip('h = ' + trim(hh), (O[0] + apexP[0]) / 2 - 52, (O[1] + apexP[1]) / 2 - 8, INK);
    }
    if (S.showR) {
      seg(O, rimP, INK, 1.8); // radius across the base
      chip('r = ' + trim(rr), (O[0] + rimP[0]) / 2 - 6, (O[1] + rimP[1]) / 2 + 4, INK);
    }

    /* ---- key vertices ---- */
    dot(apexP, 3.5, INK, '#FBFBF8'); // apex
    if (S.showR || S.showH || S.showTri) dot(O, 3, INK, '#FBFBF8'); // base center
  }, []);

  /* ---- the unrolled-net inset (surface-area step) ------------------------ */
  const drawNet = useCallback(() => {
    const canvas = netRef.current;
    if (!canvas) return;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    if (W === 0 || H === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const rr = S.r;
    const hh = S.h;
    const mm = metrics(rr, hh);
    const ang = mm.l === 0 ? 0 : mm.circumference / mm.l; // sector angle (rad) = 2πr/l
    const halfAng = ang / 2;

    const CARMINE = '#c81e4f';
    const INK = '#1c2b3a';
    const INK_SOFT = '#5b6b7b';
    const label = (t, x, y, color, align = 'left', baseline = 'middle') => {
      ctx.save();
      ctx.font = '11.5px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      ctx.fillText(t, x, y);
      ctx.restore();
    };

    /* Two shapes share ONE scale so the sector's radius (l) reads as visibly
       longer than the base radius (r), and the arc as longer than nothing —
       the whole point of the net. Each shape's bounding box is centered in its
       own sub-rectangle, so nothing clips no matter the sector angle (which
       ranges from a thin wedge to nearly a full disk). */
    const pad = 16;
    const gap = 20;
    const availH = H - 2 * pad - 14; // leave a strip at the bottom for captions
    const leftW = (W - 2 * pad - gap) * 0.62; // the sector is bigger, give it room
    const rightW = W - 2 * pad - gap - leftW;

    // sector bounding box in world units (apex at origin, arc radius l)
    const K = 72;
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    for (let i = 0; i <= K; i++) {
      const a = -halfAng + (ang * i) / K;
      const x = mm.l * Math.cos(a);
      const y = mm.l * Math.sin(a);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const secW = Math.max(maxX - minX, 1e-3);
    const secH = Math.max(maxY - minY, 1e-3);
    const scale = Math.min(
      leftW / secW,
      availH / secH,
      rightW / (2 * rr),
      availH / (2 * rr)
    );

    // --- sector (the unrolled lateral surface): center its bbox in the left cell ---
    const lcx = pad + leftW / 2;
    const lcy = pad + availH / 2;
    const apx = lcx - scale * (minX + maxX) / 2; // apex screen position
    const apy = lcy - scale * (minY + maxY) / 2;
    const sp = (a) => [apx + mm.l * scale * Math.cos(a), apy + mm.l * scale * Math.sin(a)];
    ctx.beginPath();
    ctx.moveTo(apx, apy);
    for (let i = 0; i <= K; i++) ctx.lineTo(...sp(-halfAng + (ang * i) / K));
    ctx.closePath();
    ctx.fillStyle = 'rgba(200,30,79,0.10)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = CARMINE;
    ctx.setLineDash([]);
    ctx.stroke();

    // labels: l on the lower straight edge, θ in the wedge near the apex
    const edge = sp(halfAng);
    const lm = [(apx + edge[0]) / 2, (apy + edge[1]) / 2];
    const en = Math.hypot(edge[0] - apx, edge[1] - apy) || 1;
    label('l', lm[0] - ((edge[1] - apy) / en) * 12, lm[1] + ((edge[0] - apx) / en) * 12, INK);
    label('θ = ' + trim(mm.sectorDeg, 0) + '°', apx + 14, apy - 3, INK_SOFT);

    // --- base circle: center in the right cell, same scale ---
    const bcx = pad + leftW + gap + rightW / 2;
    const bcy = pad + availH / 2;
    ctx.beginPath();
    ctx.arc(bcx, bcy, rr * scale, 0, TAU);
    ctx.fillStyle = 'rgba(199,216,228,0.5)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = CARMINE;
    ctx.stroke();
    // radius tick + label
    ctx.save();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(bcx, bcy);
    ctx.lineTo(bcx + rr * scale, bcy);
    ctx.stroke();
    ctx.restore();
    label('r', bcx + (rr * scale) / 2, bcy - 9, INK, 'center');

    // captions pinned to the bottom strip, so they never touch the shapes
    label('lateral surface', lcx, H - 8, INK_SOFT, 'center');
    label('base', bcx, H - 8, INK_SOFT, 'center');
  }, []);

  /* ---- redraw the 3-D scene whenever the picture-affecting state changes -- */
  useEffect(() => {
    draw();
  }, [r, h, step, target, calibrated, draw]);

  /* ---- redraw the net inset when it is visible ---- */
  useEffect(() => {
    if (showNet) drawNet();
  }, [showNet, r, h, drawNet]);

  /* ---- fluid canvas: redraw on resize ---- */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      draw();
      if (showNet) drawNet();
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw, drawNet, showNet]);

  /* ---- hand a target to the calibration step the first time we reach it ---- */
  useEffect(() => {
    if (calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- turntable spin — time-based, opt-in, pauses while you drag, and
         respects reduced motion ---- */
  useEffect(() => {
    if (!spinning) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setSpinning(false);
      return;
    }
    let raf;
    let last = null;
    const loop = (now) => {
      if (last == null) last = now;
      const dt = (now - last) / 1000;
      last = now;
      if (!dragRef.current) {
        orbitRef.current.az += dt * 0.5; // rad/sec
        draw();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spinning, draw]);

  /* ---- orbit interaction ------------------------------------------------- */
  const onPointerDown = (e) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current = { x: e.clientX, y: e.clientY };
    const o = orbitRef.current;
    o.az += dx * 0.01;
    o.el = Math.max(-1.3, Math.min(1.3, o.el + dy * 0.01));
    draw();
  };
  const endDrag = (e) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };
  const onKeyDown = (e) => {
    const o = orbitRef.current;
    let hit = true;
    if (e.key === 'ArrowLeft') o.az -= 0.12;
    else if (e.key === 'ArrowRight') o.az += 0.12;
    else if (e.key === 'ArrowUp') o.el = Math.min(1.3, o.el + 0.12);
    else if (e.key === 'ArrowDown') o.el = Math.max(-1.3, o.el - 0.12);
    else hit = false;
    if (hit) {
      e.preventDefault();
      draw();
    }
  };
  const resetView = () => {
    orbitRef.current = { az: -0.6, el: 0.42 };
    draw();
  };

  /* ---- dials & lesson ---------------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 'r') setR(v);
    else setH(v);
  };
  const resetDials = () => {
    setR(START.r);
    setH(START.h);
  };
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken =
    `Right circular cone. Radius ${trim(r)}, height ${trim(h)}. ` +
    `Slant height ${trim(m.l)}. Base area ${trim(m.base)}. Lateral area ${trim(m.lateral)}. ` +
    `Total surface area ${trim(m.total)}. Volume ${trim(m.volume)}.`;

  return (
    <div className="clab">
      <header className="head">
        <h1>The Cone</h1>
        <p className="lede">
          A right circular cone in three dimensions — <span className="mono">drag to orbit</span>. Two
          dials, radius <span className="mono">r</span> and height <span className="mono">h</span>,
          unlock one per step, and from just those two numbers the lab builds every measurement: the
          slant height, the volume, and the surface area you get by unrolling the cone flat. Finish by
          calibrating your cone onto a mystery target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <span className="equation">
              l = √(r² + h²) = <b>{trim(m.l)}</b>
            </span>
            <span className="equation soft">
              V = ⅓πr²h = <b>{trim(m.volume)}</b> &nbsp;·&nbsp; S = πr(r + l) = <b>{trim(m.total)}</b>
            </span>
          </div>

          <div
            className="stage"
            ref={stageRef}
            role="img"
            tabIndex={0}
            aria-label={spoken + ' Drag or use arrow keys to orbit the cone in 3-D.'}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            onKeyDown={onKeyDown}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">drag to orbit · arrow keys too</span>
          </div>

          {showNet && (
            <div className="net">
              <p className="net-cap mono">
                Unrolled net — the curved side becomes a sector (radius <b>l = {trim(m.l)}</b>, arc{' '}
                <b>2πr = {trim(m.circumference)}</b>, angle <b>{trim(m.sectorDeg, 0)}°</b>). Sector area
                = ½·l·2πr = <b>πrl = {trim(m.lateral)}</b>.
              </p>
              <div className="net-stage">
                <canvas ref={netRef} />
              </div>
            </div>
          )}

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Radius r · Height h</span>
              <span className="fact-v mono">
                {trim(r)} · {trim(h)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Slant height l = √(r²+h²)</span>
              <span className="fact-v mono">{trim(m.l)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Base area πr²</span>
              <span className="fact-v mono">{trim(m.base)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Lateral area πrl</span>
              <span className="fact-v mono">{trim(m.lateral)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Surface area πr(r+l)</span>
              <span className="fact-v mono">{trim(m.total)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Volume ⅓πr²h</span>
              <span className="fact-v mono">{trim(m.volume)}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (spinning ? ' on' : '')}
              onClick={() => setSpinning((s) => !s)}
            >
              {spinning ? 'Spinning…' : 'Spin'}
            </button>
            <button type="button" className="btn ghost" onClick={resetView}>
              Reset view
            </button>
            <button type="button" className="btn ghost" onClick={resetDials}>
              Reset dials
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

          <div className="dials">
            {PARAMS.map((d) => {
              const unlocked = step >= d.unlock;
              const val = { r, h }[d.key];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.label}</span>
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
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">target: r = ?, h = ?</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={() => setTarget(makeTarget(target))}>
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
                  resetDials();
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* polite live region: announce success without stealing focus */}
      <p className="sr-only" aria-live="polite">
        {calib && calibrated ? 'Calibrated. Your cone matches the target.' : ''}
      </p>

      <footer className="foot">
        <span className="mono">V = ⅓πr²h</span> &nbsp;·&nbsp;{' '}
        <span className="mono">S = πr(r + l)</span>, &nbsp;<span className="mono">l = √(r² + h²)</span>{' '}
        — the right circular cone, rendered live in 3-D from two dials on a pure canvas.
      </footer>

      <style jsx>{`
        .clab {
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
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
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
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 940px) {
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
          margin-bottom: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .equation {
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          color: var(--curve);
          font-size: 16px;
          font-weight: 600;
        }
        .equation b {
          font-weight: 700;
        }
        .equation.soft {
          color: var(--ink-soft);
          font-size: 13px;
          font-weight: 500;
        }
        .equation.soft b {
          color: var(--ink);
        }
        .stage {
          position: relative;
          width: 100%;
          height: clamp(340px, 52vw, 540px);
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          cursor: grab;
          background: radial-gradient(120% 100% at 50% 22%, #fdfefe 0%, #eef3f7 62%, #e4ebf1 100%);
        }
        .stage:active {
          cursor: grabbing;
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
        .net {
          margin: 12px 2px 2px;
          padding: 10px 12px;
          border: 1px solid var(--quad);
          border-radius: 8px;
          background: linear-gradient(180deg, #fdfefe, #f5f8fa);
        }
        .net-cap {
          margin: 0 0 8px;
          font-size: 11.5px;
          line-height: 1.5;
          color: var(--ink-soft);
        }
        .net-cap b {
          color: var(--ink);
        }
        .net-stage {
          width: 100%;
          height: 168px;
        }
        .net-stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 18px;
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
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v {
          font-size: 13px;
          font-variant-numeric: tabular-nums;
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
        .dials {
          display: grid;
          gap: 12px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 22px 1fr 48px;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 2px 10px;
        }
        .dial.locked {
          opacity: 0.5;
        }
        .dk {
          grid-row: 1 / 3;
          font-family: var(--serif);
          font-style: italic;
          font-size: 19px;
        }
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
          accent-color: var(--ink);
          cursor: pointer;
        }
        .dial input[type='range']:disabled {
          cursor: not-allowed;
        }
        .dv {
          grid-column: 3;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 13.5px;
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
          gap: 10px;
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 11.5px;
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
        :global(.clab) :focus-visible {
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
