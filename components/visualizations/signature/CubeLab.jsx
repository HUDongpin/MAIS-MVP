'use client';

/* ============================================================================
   CubeLab — an interactive "bench" for the cube (regular hexahedron):
   its edge length s, volume s³, surface area 6s², and the two diagonals
   s√2 (face) and s√3 (space).

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — a clean stage, ONE carmine
   accent for the idea in focus, dials that unlock one per lesson step,
   predict-then-check questions, and a build-to-target calibration challenge
   with a live match meter.

   This is the 3-D track of the bench family, but delivered the MAIS way:
   ZERO dependencies. The cube is rendered with a hand-rolled 3-D pipeline on a
   plain <canvas> — rotation, perspective, painter's-algorithm face sorting, and
   flat shading are all a few lines of math here — so there is no Three.js, no
   WebGL, nothing to install. It drops into any Next.js app (app or pages
   router) and its styles are scoped with styled-jsx so nothing leaks.

   DROP-IN USAGE (Next.js):
     1. Save this file anywhere, e.g. app/labs/CubeLab.jsx
     2. Import and render it:
          import CubeLab from './CubeLab';
          export default function Page() { return <CubeLab />; }

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (s, unfold, step, view).
     MODEL  — the cube geometry + formulas are pure math; they know no pixels.
     RENDER — the canvas is fully redrawn from state on every change.

   The geometry below (the folded cube and its unfolding Latin-cross net) is
   verified numerically in audit-cube.mjs: 8 vertices, 12 edges of length s,
   6 faces, a flat non-overlapping net of total area 6s², and exact formulas.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Small 3-D vector helpers (module scope, pure).
   ------------------------------------------------------------------------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm3 = (a) => {
  const L = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / L, a[1] / L, a[2] / L];
};

/* Rotate point p about the line through A with unit axis k by angle t (Rodrigues). */
function rotAbout(A, k, t, p) {
  const v = sub(p, A);
  const c = Math.cos(t), s = Math.sin(t);
  return add(A, add(add(mul(v, c), mul(cross3(k, v), s)), mul(k, dot3(k, v) * (1 - c))));
}

/* ---------------------------------------------------------------------------
   MODEL — the cube-net face tree. Front is the fixed root in the plane z = +h.
   Its four neighbours hinge on the front's four edges; Back hinges on Bottom
   (a second-level child). u = 0 is the folded cube, u = 1 the flat cross net.
   Returns the six faces, each as four corners, in model space.
   ------------------------------------------------------------------------- */
const HALF_PI = Math.PI / 2;
const FACE_NAMES = ['front', 'top', 'bottom', 'left', 'right', 'back'];

function faceCorners(s, u) {
  const h = s / 2;
  const X = [1, 0, 0], Y = [0, 1, 0];

  const folded = {
    front:  [[-h, -h,  h], [ h, -h,  h], [ h,  h,  h], [-h,  h,  h]],
    top:    [[-h,  h,  h], [ h,  h,  h], [ h,  h, -h], [-h,  h, -h]],
    bottom: [[-h, -h,  h], [ h, -h,  h], [ h, -h, -h], [-h, -h, -h]],
    left:   [[-h, -h,  h], [-h,  h,  h], [-h,  h, -h], [-h, -h, -h]],
    right:  [[ h, -h,  h], [ h,  h,  h], [ h,  h, -h], [ h, -h, -h]],
    back:   [[-h, -h, -h], [ h, -h, -h], [ h,  h, -h], [-h,  h, -h]],
  };

  const a = HALF_PI * u; // hinge sweep: 0 (cube) → 90° (flat)
  const top    = (p) => rotAbout([-h,  h,  h], X,  a, p);
  const bottom = (p) => rotAbout([-h, -h,  h], X, -a, p);
  const left   = (p) => rotAbout([-h, -h,  h], Y,  a, p);
  const right  = (p) => rotAbout([ h, -h,  h], Y, -a, p);
  const back   = (p) => bottom(rotAbout([-h, -h, -h], X, -a, p)); // rides Bottom

  return {
    front:  folded.front,
    top:    folded.top.map(top),
    bottom: folded.bottom.map(bottom),
    left:   folded.left.map(left),
    right:  folded.right.map(right),
    back:   folded.back.map(back),
  };
}

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Two dials: the side length s (the cube's ONE
   measurement) and unfold, which flattens the solid into its net.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 's', label: 's', min: 0.5, max: 5, step: 0.5, unlock: 1, role: 'edge length' },
  { key: 'unfold', label: 'unfold', min: 0, max: 1, step: 0.02, unlock: 3, role: 'flatten into the net' },
];
const START = { s: 2, unfold: 0 };

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the reveal lives in `feedback`;
   distractors are real student misconceptions. Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the cube',
    focus: 'faces',
    body:
      'A cube is a 3-D solid built from six identical square faces — think of a die or a sugar cube. ' +
      'Drag the shape to look around it. However big or small a cube is, three counts never change.',
    q: 'How many faces, edges, and vertices (corners) does a cube have?',
    choices: ['6 faces, 12 edges, 8 vertices', '8 faces, 6 edges, 12 vertices', '6 faces, 8 edges, 6 vertices'],
    answer: 0,
    feedback:
      'A cube always has 6 faces, 12 edges, and 8 vertices. A neat pattern ties them together: ' +
      'vertices − edges + faces = 8 − 12 + 6 = 2. That “2” (Euler’s formula) comes out the same for ' +
      'every solid with flat faces and no holes.',
  },
  {
    title: 's — the side length',
    focus: 'edge',
    body:
      'The s dial is now live. A cube has just one measurement to give: the length of an edge, s. ' +
      'Because all twelve edges are equal, that single number sets the whole solid. The carmine edge ' +
      'below is one side, of length s.',
    q: 'As you grow s, which of these does NOT change?',
    choices: ['The number of faces — it stays 6', 'The volume', 'The surface area'],
    answer: 0,
    feedback:
      'The counts are fixed — always 6 faces, 12 edges, 8 vertices — no matter how you slide s. ' +
      'What grows is the measurements: the volume and surface area, which you’ll meet next.',
  },
  {
    title: 'Volume — the space inside',
    focus: 'volume',
    body:
      'Volume counts the unit cubes that fill the solid. Line s of them along each edge, and you fill ' +
      's rows across, s columns deep, and s layers tall. The faint grid shows those unit cubes; one is ' +
      'tinted so you can pick it out.',
    q: 'Set s = 3. How many unit cubes exactly fill the cube?',
    choices: ['27', '9', '18'],
    answer: 0,
    feedback:
      '3 × 3 × 3 = 27, so V = s³ — “s cubed” is literally where the word cubed comes from. ' +
      'Careful: doubling s does not double the volume, it multiplies it by 2³ = 8.',
  },
  {
    title: 'Surface area — unfold the net',
    focus: 'surface',
    body:
      'Slide the unfold dial to flatten the cube into its net — the six squares laid out flat, like a ' +
      'cardboard box opened up. Surface area is simply the total area of that wrapping.',
    q: 'Each face is an s × s square. What is the cube’s total surface area?',
    choices: ['6s²', 's²', 's³'],
    answer: 0,
    feedback:
      'Six faces, each of area s², give SA = 6s² — and the net shows exactly six s-by-s squares. ' +
      'Notice surface area grows like s² while volume grows like s³: the bigger the cube, the more ' +
      'inside it holds for each bit of outside skin.',
  },
  {
    title: 'Diagonals — Pythagoras in 3-D',
    focus: 'diagonal',
    body:
      'Two hidden lengths live inside every cube. A face diagonal crosses one square corner-to-corner; ' +
      'the space diagonal runs from a corner straight through the middle to the opposite corner. ' +
      'The carmine right triangle links them.',
    q: 'The face diagonal is s√2. Taking it as one leg and an edge s as the other, how long is the space diagonal?',
    choices: ['s√3', 's√2', '3s'],
    answer: 0,
    feedback:
      'Pythagoras on the carmine triangle: (s√2)² + s² = 2s² + s² = 3s², so the space diagonal is s√3. ' +
      'It’s the Pythagorean theorem used twice — once flat inside a face, once through the solid.',
  },
  {
    title: 'Build to order',
    focus: 'calib',
    body:
      'Final challenge. You’re handed a target — a volume or a surface area to hit exactly. Turn the s ' +
      'dial until your cube matches it and the meter reads CALIBRATED. This runs the formulas backward: ' +
      'given the answer, find the side. Press New target for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   Cube facts — the correctness anchor. Pure math from s.
   ------------------------------------------------------------------------- */
const facts = (s) => ({
  volume: s * s * s,
  surface: 6 * s * s,
  faceDiag: s * Math.SQRT2,
  spaceDiag: s * Math.sqrt(3),
  totalEdges: 12 * s,
});

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION goal instead of a curve match: hit a
   target volume or surface area. Targets sit at integer s so the answer is a
   clean whole number (a real cube-root / square-root reasoning task). The meter
   reads relative closeness; CALIBRATED when the built solid equals the goal.
   ------------------------------------------------------------------------- */
const measure = (kind, s) => (kind === 'volume' ? s * s * s : 6 * s * s);
const matchPercent = (cur, goal) => Math.max(0, Math.min(100, 100 * (1 - Math.abs(cur - goal) / goal)));
const MATCH_TOL = 1e-6;

function makeTarget(prev) {
  const kinds = ['volume', 'area'];
  let t;
  do {
    const n = 2 + Math.floor(Math.random() * 3); // s ∈ {2, 3, 4}
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    t = { kind, s: n, goal: measure(kind, n) };
  } while (prev && t.kind === prev.kind && t.goal === prev.goal);
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign, trimmed decimals.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-9;

/* Flat-shading colour: interpolate dark→light by brightness; carmine when the
   face is the accented "object in focus", neutral blue-grey otherwise. */
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
export default function CubeLab() {
  const [s, setS] = useState(START.s);
  const [unfold, setUnfold] = useState(START.unfold);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [seeThrough, setSeeThrough] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const rotRef = useRef({ yaw: -0.62, pitch: 0.5 }); // orbit angles (radians)
  const dragRef = useRef(null); // { x, y } last pointer, or null
  const sceneRef = useRef({});

  const current = STEPS[step];
  const focus = current.focus;
  const F = facts(s);

  // Snapshot everything the (stable) renderer reads, so it never sees stale state.
  sceneRef.current = { s, unfold, focus, seeThrough, target };

  const cur = target ? measure(target.kind, s) : 0;
  const pct = target ? matchPercent(cur, target.goal) : 0;
  const calibrated = target ? Math.abs(cur - target.goal) < MATCH_TOL : false;

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
    const LF = facts(S.s); // facts of the CURRENT s — never the stale render-time closure
    const { yaw, pitch } = rotRef.current;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);

    // model → camera space: yaw about Y, then pitch about X
    const rotate = (p) => {
      const x1 = p[0] * cy + p[2] * sy;
      const z1 = -p[0] * sy + p[2] * cy;
      const y2 = p[1] * cp - z1 * sp;
      const z2 = p[1] * sp + z1 * cp;
      return [x1, y2, z2];
    };

    // geometry for the current state, rotated into camera space
    const fc = faceCorners(S.s, S.unfold);
    const faceList = FACE_NAMES.map((name) => ({ name, pts: fc[name].map(rotate) }));

    // centre on the centroid of all points (the net's centre is not the origin)
    let cxm = 0, cym = 0, czm = 0, nP = 0;
    for (const f of faceList) for (const p of f.pts) { cxm += p[0]; cym += p[1]; czm += p[2]; nP++; }
    cxm /= nP; cym /= nP; czm /= nP;
    let radius = 0;
    for (const f of faceList) for (const p of f.pts)
      radius = Math.max(radius, Math.hypot(p[0] - cxm, p[1] - cym, p[2] - czm));
    const D = 3.4 * radius; // camera distance → gentle, scale-invariant perspective

    // project a camera-space point: centre, apply perspective, return [X,Y,depth]
    const proj = (p) => {
      const x = p[0] - cxm, y = p[1] - cym, z = p[2] - czm;
      const f = D / (D - z);
      return [x * f, y * f, z];
    };

    // pass 1 — project everything, find the 2-D bounds, then fit to the stage
    const P = faceList.map((f) => ({ ...f, pj: f.pts.map(proj) }));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const f of P) for (const q of f.pj) {
      if (q[0] < minX) minX = q[0]; if (q[0] > maxX) maxX = q[0];
      if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1];
    }
    const spanX = Math.max(maxX - minX, 1e-6), spanY = Math.max(maxY - minY, 1e-6);
    const fit = (0.82 * Math.min(W, H)) / Math.max(spanX, spanY);
    const ox = (minX + maxX) / 2, oy = (minY + maxY) / 2;
    // camera-space point → screen (Y flips: math-up is screen-down)
    const toScreen = (p) => {
      const q = proj(p);
      return [W / 2 + (q[0] - ox) * fit, H / 2 - (q[1] - oy) * fit];
    };

    // lighting: a fixed key from the upper-left-front
    const light = norm3([-0.45, 0.72, 0.62]);
    const globalC = [cxm, cym, czm];

    // per-face draw data: screen polygon, depth, shading, facing
    const draws = P.map((f) => {
      const scr = f.pts.map(toScreen);
      const depth = (f.pts[0][2] + f.pts[1][2] + f.pts[2][2] + f.pts[3][2]) / 4;
      let n = norm3(cross3(sub(f.pts[1], f.pts[0]), sub(f.pts[3], f.pts[0])));
      // orient the normal outward (away from the solid's centre) for stable shading
      const centre = mul(add(add(f.pts[0], f.pts[1]), add(f.pts[2], f.pts[3])), 0.25);
      if (dot3(n, sub(centre, globalC)) < 0) n = mul(n, -1);
      const bright = 0.42 + 0.58 * Math.max(0, dot3(n, light));
      const facing = n[2] > 0; // outward normal toward the camera
      return { name: f.name, scr, depth, bright, facing };
    });

    // painter's algorithm: far faces first (small depth = away from +z camera)
    draws.sort((a, b) => a.depth - b.depth);

    const accentFaces = S.focus === 'surface'; // net lesson tints every face
    const strokeInk = 'rgba(28,43,58,0.85)';

    const polyPath = (scr) => {
      ctx.beginPath();
      ctx.moveTo(scr[0][0], scr[0][1]);
      for (let i = 1; i < scr.length; i++) ctx.lineTo(scr[i][0], scr[i][1]);
      ctx.closePath();
    };

    if (S.seeThrough) {
      // transparent view — see all 12 edges: back faces faint & dashed, front solid
      for (const d of draws) {
        polyPath(d.scr);
        ctx.fillStyle = shade(d.bright, accentFaces).replace('rgb', 'rgba').replace(')', ',0.22)');
        ctx.fill();
      }
      for (const d of draws) {
        polyPath(d.scr);
        ctx.lineWidth = d.facing ? 2 : 1.2;
        ctx.setLineDash(d.facing ? [] : [4, 4]);
        ctx.strokeStyle = d.facing ? strokeInk : 'rgba(91,107,123,0.6)';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      ctx.setLineDash([]);
    } else {
      // solid — painter's order makes the opaque fills hide the hidden faces
      for (const d of draws) {
        polyPath(d.scr);
        ctx.fillStyle = shade(d.bright, accentFaces);
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = strokeInk;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }

    /* ---- overlays driven by the lesson focus ---------------------------- */

    // small label with a soft paper backing so it stays legible over the solid
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

    const rp = (p) => toScreen(rotate(p)); // model point → screen (through orbit)
    const CARM = '#C81E4F';
    const hh = S.s / 2;

    // STEP 1 — highlight one edge as length s
    if (S.focus === 'edge' && S.unfold < 0.02) {
      const A = rp([-hh, -hh, hh]), B = rp([hh, -hh, hh]);
      ctx.save();
      ctx.lineWidth = 4;
      ctx.strokeStyle = CARM;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(B[0], B[1]);
      ctx.stroke();
      ctx.restore();
      label(`s = ${trim(S.s)}`, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2 + 14, CARM);
    }

    // STEP 2 / volume-goal — unit-cube grid on the three front faces
    if ((S.focus === 'volume' || (S.focus === 'calib' && S.target && S.target.kind === 'volume')) && S.unfold < 0.02) {
      const n = Math.round(S.s);
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(28,43,58,0.28)';
      const gridFace = (o, uVec, vVec) => {
        for (let i = 1; i < n; i++) {
          const t = i / n;
          let a = rp(add(o, mul(uVec, t))), b = rp(add(add(o, vVec), mul(uVec, t)));
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          a = rp(add(o, mul(vVec, t))); b = rp(add(add(o, uVec), mul(vVec, t)));
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      };
      if (isInt(S.s)) {
        const sVec = S.s;
        gridFace([-hh, -hh, hh], [sVec, 0, 0], [0, sVec, 0]); // front
        gridFace([-hh, hh, hh], [sVec, 0, 0], [0, 0, -sVec]); // top
        gridFace([hh, -hh, hh], [0, sVec, 0], [0, 0, -sVec]); // right
        // tint one unit cube's front square carmine as the "unit"
        const uc = [
          rp([-hh, hh - 1, hh]), rp([-hh + 1, hh - 1, hh]),
          rp([-hh + 1, hh, hh]), rp([-hh, hh, hh]),
        ];
        ctx.beginPath();
        ctx.moveTo(uc[0][0], uc[0][1]);
        for (let i = 1; i < 4; i++) ctx.lineTo(uc[i][0], uc[i][1]);
        ctx.closePath();
        ctx.fillStyle = 'rgba(200,30,79,0.5)';
        ctx.fill();
      }
      ctx.restore();
      const vtxt = isInt(S.s) ? `V = ${Math.round(S.s)}³ = ${trim(LF.volume)} unit cubes` : `V = s³ = ${trim(LF.volume)}`;
      label(vtxt, W / 2, H - 16, CARM);
    }

    // STEP 3 — surface area: number the six net squares with "s²"
    if (S.focus === 'surface' && S.unfold > 0.5) {
      for (const d of draws) {
        const cxs = (d.scr[0][0] + d.scr[1][0] + d.scr[2][0] + d.scr[3][0]) / 4;
        const cys = (d.scr[0][1] + d.scr[1][1] + d.scr[2][1] + d.scr[3][1]) / 4;
        ctx.font = 'italic 13px "Iowan Old Style", Palatino, Georgia, serif';
        ctx.fillStyle = '#FBFBF8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('s²', cxs, cys);
      }
      label(`SA = 6 · s² = ${trim(LF.surface)}`, W / 2, H - 16, CARM);
    }

    // STEP 4 — the two diagonals + the right triangle that relates them
    if (S.focus === 'diagonal' && S.unfold < 0.02) {
      const A = [-hh, -hh, -hh]; // near-bottom corner
      const C = [hh, hh, -hh];   // opposite corner on the bottom face → face diagonal AC = s√2
      const G = [hh, hh, hh];    // top corner above C → vertical edge CG = s
      const As = rp(A), Cs = rp(C), Gs = rp(G);
      ctx.save();
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = CARM;
      // face diagonal (dashed leg)
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(As[0], As[1]); ctx.lineTo(Cs[0], Cs[1]); ctx.stroke();
      // vertical edge (solid leg)
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(Cs[0], Cs[1]); ctx.lineTo(Gs[0], Gs[1]); ctx.stroke();
      // space diagonal (solid hypotenuse, heavier)
      ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(As[0], As[1]); ctx.lineTo(Gs[0], Gs[1]); ctx.stroke();
      // corner dots
      ctx.fillStyle = CARM;
      for (const q of [As, Cs, Gs]) { ctx.beginPath(); ctx.arc(q[0], q[1], 3.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      label(`face √: s√2 = ${trim(LF.faceDiag)}`, (As[0] + Cs[0]) / 2, (As[1] + Cs[1]) / 2 + 12, CARM);
      label(`space √: s√3 = ${trim(LF.spaceDiag)}`, (As[0] + Gs[0]) / 2, (As[1] + Gs[1]) / 2 - 12, CARM);
    }
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => { draw(); }, [s, unfold, step, target, seeThrough, focus, draw]);

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

  /* keep the view sensible per step: only the net step should stay unfolded,
     and the build step starts from a fresh, un-matching cube */
  useEffect(() => {
    if (focus !== 'surface' && unfold !== 0) setUnfold(0);
    if (focus === 'calib') { setS(1); setUnfold(0); }
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
      if (!dragRef.current) rotRef.current.yaw += dt * 0.5; // pause spin while dragging
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spinning, draw]);

  /* ---- orbit interaction (pointer drag) ---------------------------------- */
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

  /* ---- dial + nav handlers ----------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 's') setS(v);
    else setUnfold(v);
  };
  const resetView = () => { rotRef.current = { yaw: -0.62, pitch: 0.5 }; draw(); };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((n) => Math.min(STEPS.length - 1, n + 1));
  const goBack = () => setStep((n) => Math.max(0, n - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* spoken equation for screen readers, tuned to the step in focus */
  const spoken = (() => {
    if (focus === 'edge') return `Edge length s equals ${trim(s)}.`;
    if (focus === 'volume') return `Volume equals s cubed, ${trim(F.volume)}.`;
    if (focus === 'surface') return `Surface area equals 6 s squared, ${trim(F.surface)}.`;
    if (focus === 'diagonal') return `Space diagonal equals s times root 3, ${trim(F.spaceDiag)}.`;
    if (focus === 'calib' && target)
      return `Target ${target.kind === 'volume' ? 'volume' : 'surface area'} ${target.goal}. Your cube is ${trim(cur)}.`;
    return 'A cube: 6 faces, 12 edges, 8 vertices.';
  })();

  /* the carmine headline equation, per step */
  const headline = (() => {
    if (focus === 'faces') return '6 faces · 12 edges · 8 vertices';
    if (focus === 'edge') return `s = ${trim(s)}`;
    if (focus === 'volume') return `V = s³ = ${trim(F.volume)}`;
    if (focus === 'surface') return `SA = 6s² = ${trim(F.surface)}`;
    if (focus === 'diagonal') return `space diagonal = s√3 = ${trim(F.spaceDiag)}`;
    if (focus === 'calib' && target)
      return `goal: ${target.kind === 'volume' ? 'V' : 'SA'} = ${target.goal}`;
    return 'the cube';
  })();

  return (
    <div className="clab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Cube</h1>
        <p className="lede">
          One number runs the whole solid: the edge length{' '}
          <span className="mono">s</span>. Drag to orbit the cube, then let each dial unlock in turn to
          see how <span className="mono">s</span> drives its volume{' '}
          <span className="mono">s³</span>, surface area <span className="mono">6s²</span>, and the
          diagonals hidden inside — finishing by building a cube to a target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">{headline}</p>
            <p className="equation-sub mono">
              s = {trim(s)} · V = {trim(F.volume)} · SA = {trim(F.surface)}
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
            <canvas ref={canvasRef} aria-label={`Interactive 3-D cube. ${spoken}`} role="img" />
            <span className="hint mono">drag to orbit</span>
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Side length</span>
              <span className="fact-v mono">s = {trim(s)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Volume</span>
              <span className="fact-v mono">s³ = {trim(F.volume)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Surface area</span>
              <span className="fact-v mono">6s² = {trim(F.surface)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Face diagonal</span>
              <span className="fact-v mono">s√2 = {trim(F.faceDiag)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Space diagonal</span>
              <span className="fact-v mono">s√3 = {trim(F.spaceDiag)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Faces · Edges · Vertices</span>
              <span className="fact-v mono">6 · 12 · 8</span>
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
              const val = d.key === 's' ? s : unfold;
              const shown = d.key === 'unfold' ? Math.round(val * 100) + '%' : trim(val);
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.label === 'unfold' ? '⧉' : d.label}</span>
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
                {target.kind === 'volume' ? 'Target volume' : 'Target surface area'}:{' '}
                <span className="mono goal">{target.goal}</span>
                {target.kind === 'volume' ? ' cubic units' : ' square units'}
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {target.kind === 'volume' ? 'V' : 'SA'} = {trim(cur)} · match {pct.toFixed(0)}%
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {target.kind === 'volume' ? 'find s with s³ = ' : 'find s with 6s² = '}
                    {target.goal}
                  </span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={() => { setTarget(makeTarget(target)); setS(1); }}>
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
                  setS(START.s);
                  setUnfold(START.unfold);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">V = s³ · SA = 6s² · face √ = s√2 · space √ = s√3</span> &nbsp;·&nbsp;
        a cube rendered live from the dials with a dependency-free 3-D canvas.
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
        .nav { margin-top: 20px; display: flex; justify-content: space-between; gap: 10px; }
        .foot { margin-top: 24px; font-size: 12.5px; color: var(--ink-soft); }
        :global(.clab) :focus-visible {
          outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn, .meter-fill, .choice { transition: none; }
        }
      `}</style>
    </div>
  );
}
