'use client';

/* ============================================================================
   VolumeLab — an interactive "bench" for the VOLUME of a right rectangular
   prism (a box): volume as a COUNT of unit cubes, built up as

        V = length × width × height = l · w · h = (base area) × height.

   Built for MAIS (math AI system, www.mais.ac), K-12.

   Scope / why this lab exists (kept deliberately distinct from CubeLab s³,
   CylinderLab πr²h and ConeLab ⅓πr²h): this is the FOUNDATIONAL idea of volume
   for grades ~5–6 — CCSS 5.MD.C.3 (volume as unit-cube count), 5.MD.C.4
   (measure by packing/counting cubes), 5.MD.C.5a/b (V = l·w·h and V = B·h for a
   right rectangular prism), 6.G.A.2. It is the exact 3-D sibling of AreaLab:
   AREA is the number of unit SQUARES that tile a rectangle; VOLUME is the number
   of unit CUBES that fill a box. Seeing the box literally packed with unit cubes
   is the whole point.

   House style: the interactive-math-bench standard — a clean stage, ONE carmine
   accent for the idea in focus, dials that unlock one per lesson step,
   predict-then-check questions, and a build-to-target calibration challenge with
   a live match meter.

   Delivered the MAIS way: ZERO dependencies. The box and its unit cubes are
   rendered with a hand-rolled 3-D pipeline on a plain <canvas> — rotation,
   orthographic-ish projection, back-face culling, painter's-algorithm depth
   sorting and flat shading are all a few lines of math here — so there is no
   Three.js, no WebGL, nothing to install. It drops into any Next.js app (app or
   pages router) and its styles are scoped with styled-jsx so nothing leaks.

   DROP-IN USAGE (Next.js):
     1. Save this file anywhere, e.g. app/labs/VolumeLab.jsx
     2. Import and render it:
          import VolumeLab from './VolumeLab';
          export default function Page() { return <VolumeLab />; }

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (l, w, h, step, view).
     MODEL  — the box geometry + formulas are pure math; they know no pixels.
     RENDER — the canvas is fully redrawn from state on every change.

   The geometry and every formula are checked numerically in audit-volume.mjs.
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

/* The six faces of a cube, as index quadruples into an 8-corner list.
   Corner order (see cubeCorners): 0..3 = bottom ring (z−), 4..7 = top ring (z+).
   Each quad is wound so its geometric outward normal can be oriented outward. */
const FACE_IDX = [
  [0, 3, 2, 1], // −z (back)
  [4, 5, 6, 7], // +z (front)
  [0, 4, 7, 3], // −x (left)
  [1, 2, 6, 5], // +x (right)
  [0, 1, 5, 4], // −y (bottom)
  [3, 7, 6, 2], // +y (top)
];

/* 8 corners of an axis-aligned box centred at c with half-extents (hx,hy,hz).
   Axes used throughout: x = length (across), y = height (up), z = width (depth). */
function boxCorners(cx, cy, cz, hx, hy, hz) {
  return [
    [cx - hx, cy - hy, cz - hz], // 0
    [cx + hx, cy - hy, cz - hz], // 1
    [cx + hx, cy + hy, cz - hz], // 2
    [cx - hx, cy + hy, cz - hz], // 3
    [cx - hx, cy - hy, cz + hz], // 4
    [cx + hx, cy - hy, cz + hz], // 5
    [cx + hx, cy + hy, cz + hz], // 6
    [cx - hx, cy + hy, cz + hz], // 7
  ];
}

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Three integer dials: length l, width w, height h.
   Integer steps mean the unit-cube count is ALWAYS exact (no half cubes), the
   same trick AreaLab uses so the tile count is honest.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'l', label: 'l', min: 1, max: 6, step: 1, unlock: 1, role: 'length' },
  { key: 'w', label: 'w', min: 1, max: 6, step: 1, unlock: 2, role: 'width' },
  { key: 'h', label: 'h', min: 1, max: 6, step: 1, unlock: 3, role: 'height' },
];
const START = { l: 4, w: 3, h: 2 };

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the reveal lives in `feedback`;
   distractors are real student misconceptions. Next is gated on ANSWERED.
   The arc: what is volume → length → the base layer (l×w) → stack h layers →
   V = l·w·h → V = base × height → build to a target volume.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'What is volume?',
    focus: 'intro',
    body:
      'Volume is the amount of space inside a solid — and we measure it by counting how many ' +
      'unit cubes fit inside with no gaps and no overlaps. One unit cube is 1 wide, 1 deep, and 1 ' +
      'tall: its volume is “1 cubic unit.” Drag the box to look all around it.',
    q: 'What does the volume of this box count?',
    choices: [
      'The unit cubes that fill the inside',
      'The unit squares around the outside',
      'The number of edges',
    ],
    answer: 0,
    feedback:
      'Volume counts the unit cubes packed inside. (The squares on the outside measure surface ' +
      'area — a different idea.) A box that holds more cubes has more volume.',
  },
  {
    title: 'l — the length',
    focus: 'length',
    body:
      'The l dial is now live. Lay a single row of unit cubes along the front bottom edge. The ' +
      'length l tells you how many cubes fit in that one row. The carmine row shows it.',
    q: 'If a row is l = 4 cubes long, how many unit cubes are in that single row?',
    choices: ['4', '1', '8'],
    answer: 0,
    feedback:
      'A row l cubes long holds exactly l cubes. Length is just “how many cubes fit end to end.” ' +
      'Next we will use that row to tile a whole floor.',
  },
  {
    title: 'The base layer — l × w',
    focus: 'base',
    body:
      'Now the w dial unlocks. Repeat that row of l cubes across the width w times and the floor of ' +
      'the box fills in: a rectangle of l × w cubes. That first layer is highlighted. Its cube count ' +
      'equals the area of the base, B.',
    q: 'A floor that is l = 4 cubes long and w = 3 cubes wide holds how many cubes in that one layer?',
    choices: ['12', '7', '9'],
    answer: 0,
    feedback:
      'l × w = 4 × 3 = 12 cubes in the base layer — exactly the AREA of the base (12 unit squares, ' +
      'one under each cube). This is where volume meets area: B = l × w.',
  },
  {
    title: 'h — stack the layers',
    focus: 'stack',
    body:
      'Finally the h dial unlocks. The height h tells you how many identical layers to stack on top ' +
      'of the base. The alternating shades let you count the layers; a carmine column marks h cubes tall.',
    q: 'The base layer holds 12 cubes. If you stack h = 2 layers, how many cubes fill the box?',
    choices: ['24', '14', '12'],
    answer: 0,
    feedback:
      'Each layer holds 12 cubes and there are h = 2 of them: 12 + 12 = 24, i.e. 12 × 2. Height is ' +
      '“how many layers,” so we multiply the layer count by h.',
  },
  {
    title: 'V = l × w × h',
    focus: 'volume',
    body:
      'Put it together. l cubes across, w cubes deep, h layers tall — multiply the three to count ' +
      'every cube at once. One corner cube is tinted so you can see what a single cubic unit looks like.',
    q: 'For this box, which product gives the total number of unit cubes?',
    choices: ['l × w × h', 'l + w + h', '2(l + w + h)'],
    answer: 0,
    feedback:
      'V = l × w × h. Multiplying the three dimensions counts the whole pack of cubes in one shot. ' +
      'Watch out: doubling just one dimension doubles the volume; the counts of faces and edges never ' +
      'change, but the space inside does.',
  },
  {
    title: 'V = base × height',
    focus: 'baseheight',
    body:
      'There is a second way to read the same formula. Group l × w together as the base area B, and ' +
      'the rule becomes V = B × h — “base area times height.” The highlighted base has area B; the box ' +
      'is h of those stacked up.',
    q: 'A prism has base area B = 12 square units and height h = 2. What is its volume?',
    choices: ['24 cubic units', '14 cubic units', '6 cubic units'],
    answer: 0,
    feedback:
      'V = B × h = 12 × 2 = 24. This “base × height” rule is bigger than boxes: it gives the volume ' +
      'of ANY prism or cylinder — find the area of the base, then multiply by how tall it is.',
  },
  {
    title: 'Build to a target',
    focus: 'calib',
    body:
      'Final challenge. You are handed a target volume. Turn the l, w and h dials until your box holds ' +
      'exactly that many unit cubes and the meter reads CALIBRATED. Because many boxes share a volume, ' +
      'there is more than one right answer — press New target for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   Box facts — the correctness anchor. Pure math from l, w, h.
   ------------------------------------------------------------------------- */
const facts = (l, w, h) => ({
  base: l * w, // area of the base = cubes per layer
  volume: l * w * h, // V = l·w·h = number of unit cubes
  surface: 2 * (l * w + l * h + w * h), // total surface area (bonus fact)
});

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION goal (skill's sanctioned alternative to
   curve-matching, precedent CubeLab/AreaLab/MultiplicationLab): hit a target
   VOLUME by choosing l, w, h. Because a volume has several integer factor
   TRIPLES within the dial range, this quietly teaches that many different boxes
   share the same volume. Targets are all reachable with l,w,h ∈ 1..6.
   ------------------------------------------------------------------------- */
const MAXF = 6;
const TARGETS = [8, 12, 18, 24, 30, 36, 48, 60];
const measure = (l, w, h) => l * w * h;
const matchPercent = (cur, goal) =>
  Math.max(0, Math.min(100, 100 * (1 - Math.abs(cur - goal) / goal)));

function makeTarget(prev) {
  let goal;
  do {
    goal = TARGETS[Math.floor(Math.random() * TARGETS.length)];
  } while (prev && goal === prev.goal);
  return { goal };
}

/* All ordered-up factor triples a≤b≤c with a·b·c = P and every factor in 1..MAXF.
   Used to celebrate "different boxes, same volume" once the target is hit. */
function factorTriples(P) {
  const out = [];
  for (let a = 1; a <= MAXF; a++) {
    if (P % a !== 0) continue;
    for (let b = a; b <= MAXF; b++) {
      if ((P / a) % b !== 0) continue;
      const c = P / a / b;
      if (c >= b && c <= MAXF) out.push([a, b, c]);
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Formatting + shading helpers.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}

/* Flat-shading colour: interpolate dark→light by brightness. `accent` paints the
   carmine "object in focus"; `alt` is a slightly deeper blue used to separate
   stacked layers so students can count them. */
function shade(bright, accent, alt) {
  const b = Math.max(0.2, Math.min(1, bright));
  let lo, hi;
  if (accent) {
    lo = [150, 26, 58];
    hi = [242, 150, 172];
  } else if (alt) {
    lo = [40, 62, 86];
    hi = [138, 166, 190];
  } else {
    lo = [58, 84, 110];
    hi = [200, 218, 232];
  }
  const r = Math.round(lo[0] + (hi[0] - lo[0]) * b);
  const g = Math.round(lo[1] + (hi[1] - lo[1]) * b);
  const bl = Math.round(lo[2] + (hi[2] - lo[2]) * b);
  return `rgb(${r},${g},${bl})`;
}

/* Which unit cube (i,j,k) is highlighted, given the lesson focus.
   i ∈ [0,l), j ∈ [0,h) (bottom→top layers), k ∈ [0,w). */
function cubeStyle(focus, i, j, k, l, w, h) {
  switch (focus) {
    case 'length': // one row along the length, on the top-front edge
      return { accent: j === h - 1 && k === w - 1, alt: false };
    case 'base': // the whole top layer = l × w (the base pattern)
    case 'baseheight':
      return { accent: j === h - 1, alt: false };
    case 'volume': // a single corner cube = 1 cubic unit
      return { accent: i === l - 1 && j === h - 1 && k === w - 1, alt: false };
    case 'stack': // alternate layer shading + a carmine height column
      return { accent: i === l - 1 && k === w - 1, alt: j % 2 === 1 };
    default:
      return { accent: false, alt: false };
  }
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function VolumeLab() {
  const [l, setL] = useState(START.l);
  const [w, setW] = useState(START.w);
  const [h, setH] = useState(START.h);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [showCubes, setShowCubes] = useState(true);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const rotRef = useRef({ yaw: -0.62, pitch: 0.48 }); // orbit angles (radians)
  const dragRef = useRef(null); // { x, y } last pointer, or null
  const sceneRef = useRef({});

  const current = STEPS[step];
  const focus = current.focus;
  const F = facts(l, w, h);

  // Snapshot everything the (stable) renderer reads, so it never sees stale state.
  sceneRef.current = { l, w, h, focus, showCubes, target };

  const cur = target ? measure(l, w, h) : 0;
  const pct = target ? matchPercent(cur, target.goal) : 0;
  const calibrated = target ? cur === target.goal : false;

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
    const LF = facts(L, Wd, Ht); // facts of the CURRENT dims — never a stale closure
    const { yaw, pitch } = rotRef.current;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);

    // model → camera space: yaw about Y (vertical), then pitch about X
    const rotate = (p) => {
      const x1 = p[0] * cyw + p[2] * syw;
      const z1 = -p[0] * syw + p[2] * cyw;
      const y2 = p[1] * cp - z1 * sp;
      const z2 = p[1] * sp + z1 * cp;
      return [x1, y2, z2];
    };

    const ox = L / 2, oy = Ht / 2, oz = Wd / 2; // box half-extents / centring offset

    // ---- projection is fit to the FULL box (stable across cube/solid modes) --
    const outer = boxCorners(0, 0, 0, ox, oy, oz).map(rotate);
    let cxm = 0, cym = 0, czm = 0;
    for (const p of outer) { cxm += p[0]; cym += p[1]; czm += p[2]; }
    cxm /= 8; cym /= 8; czm /= 8;
    let radius = 1e-6;
    for (const p of outer)
      radius = Math.max(radius, Math.hypot(p[0] - cxm, p[1] - cym, p[2] - czm));
    const D = 3.6 * radius; // camera distance → gentle, scale-invariant perspective

    const proj = (p) => {
      const x = p[0] - cxm, y = p[1] - cym, z = p[2] - czm;
      const f = D / (D - z);
      return [x * f, y * f, z];
    };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of outer) {
      const q = proj(p);
      if (q[0] < minX) minX = q[0]; if (q[0] > maxX) maxX = q[0];
      if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1];
    }
    const spanX = Math.max(maxX - minX, 1e-6), spanY = Math.max(maxY - minY, 1e-6);
    const fit = (0.8 * Math.min(W, H)) / Math.max(spanX, spanY);
    const oxp = (minX + maxX) / 2, oyp = (minY + maxY) / 2;
    const toScreen = (p) => {
      const q = proj(p);
      return [W / 2 + (q[0] - oxp) * fit, H / 2 - (q[1] - oyp) * fit];
    };
    const rp = (pm) => toScreen(rotate(pm)); // model point → screen (through orbit)

    const light = norm3([-0.42, 0.72, 0.6]);

    // ---- collect every face to paint (as screen polygons w/ depth + shading) --
    const faces = [];
    const pushSolid = (cornersModel, accent, alt) => {
      const rot = cornersModel.map(rotate);
      const centre = mul(add(add(rot[0], rot[6]), add(rot[2], rot[4])), 0.25); // box centre
      for (const idx of FACE_IDX) {
        const fp = idx.map((t) => rot[t]);
        let n = norm3(cross3(sub(fp[1], fp[0]), sub(fp[3], fp[0])));
        const fc = mul(add(add(fp[0], fp[1]), add(fp[2], fp[3])), 0.25);
        if (dot3(n, sub(fc, centre)) < 0) n = mul(n, -1); // orient outward
        const facing = n[2] > 0; // outward normal toward the camera
        if (!facing) continue; // convex solid → cull hidden faces
        const bright = 0.44 + 0.56 * Math.max(0, dot3(n, light));
        faces.push({
          scr: fp.map(toScreen),
          depth: (fp[0][2] + fp[1][2] + fp[2][2] + fp[3][2]) / 4,
          bright, accent, alt,
        });
      }
    };

    if (S.showCubes) {
      // discrete unit-cube packing — only the outer shell is ever visible
      const GAP = 0.14, hs = (1 - GAP) / 2;
      for (let i = 0; i < L; i++)
        for (let j = 0; j < Ht; j++)
          for (let k = 0; k < Wd; k++) {
            const shell =
              i === 0 || i === L - 1 || j === 0 || j === Ht - 1 || k === 0 || k === Wd - 1;
            if (!shell) continue;
            const cx = i + 0.5 - ox, cyc = j + 0.5 - oy, cz = k + 0.5 - oz;
            const st = cubeStyle(S.focus, i, j, k, L, Wd, Ht);
            pushSolid(boxCorners(cx, cyc, cz, hs, hs, hs), st.accent, st.alt);
          }
    } else {
      // one smooth shaded box
      pushSolid(boxCorners(0, 0, 0, ox, oy, oz), false, false);
    }

    // painter's algorithm: far faces first (small depth = away from +z camera)
    faces.sort((a, b) => a.depth - b.depth);
    const strokeInk = 'rgba(28,43,58,0.55)';
    const polyPath = (scr) => {
      ctx.beginPath();
      ctx.moveTo(scr[0][0], scr[0][1]);
      for (let i = 1; i < scr.length; i++) ctx.lineTo(scr[i][0], scr[i][1]);
      ctx.closePath();
    };
    for (const f of faces) {
      polyPath(f.scr);
      ctx.fillStyle = shade(f.bright, f.accent, f.alt);
      ctx.fill();
      ctx.lineWidth = S.showCubes ? 1 : 1.5;
      ctx.strokeStyle = strokeInk;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    const CARM = '#C81E4F';

    // ---- solid mode: score unit grid on the visible faces + a base wash ------
    if (!S.showCubes) {
      const gridFace = (o, uVec, uc, vVec, vc) => {
        for (let i = 1; i < uc; i++) {
          const t = i / uc;
          const a = rp(add(o, mul(uVec, t))), b = rp(add(add(o, vVec), mul(uVec, t)));
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
        for (let j = 1; j < vc; j++) {
          const t = j / vc;
          const a = rp(add(o, mul(vVec, t))), b = rp(add(add(o, uVec), mul(vVec, t)));
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      };
      const boxF = [
        { n: [0, 1, 0], o: [-ox, oy, -oz], u: [L, 0, 0], uc: L, v: [0, 0, Wd], vc: Wd, top: true },
        { n: [0, -1, 0], o: [-ox, -oy, -oz], u: [L, 0, 0], uc: L, v: [0, 0, Wd], vc: Wd },
        { n: [0, 0, 1], o: [-ox, -oy, oz], u: [L, 0, 0], uc: L, v: [0, Ht, 0], vc: Ht },
        { n: [0, 0, -1], o: [-ox, -oy, -oz], u: [L, 0, 0], uc: L, v: [0, Ht, 0], vc: Ht },
        { n: [1, 0, 0], o: [ox, -oy, -oz], u: [0, 0, Wd], uc: Wd, v: [0, Ht, 0], vc: Ht },
        { n: [-1, 0, 0], o: [-ox, -oy, -oz], u: [0, 0, Wd], uc: Wd, v: [0, Ht, 0], vc: Ht },
      ];
      const washBase = S.focus === 'base' || S.focus === 'baseheight';
      for (const bf of boxF) {
        if (rotate(bf.n)[2] <= 0) continue; // only faces toward the camera
        if (bf.top && washBase) {
          const poly = [bf.o, add(bf.o, bf.u), add(add(bf.o, bf.u), bf.v), add(bf.o, bf.v)].map(rp);
          polyPath(poly);
          ctx.fillStyle = 'rgba(200,30,79,0.20)';
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(28,43,58,0.30)';
        ctx.lineWidth = 1;
        gridFace(bf.o, bf.u, bf.uc, bf.v, bf.vc);
      }
    }

    // ---- small paper-backed label helper ------------------------------------
    const label = (text, X, Y, color) => {
      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(text).width;
      const bx = Math.min(Math.max(X - tw / 2 - 4, 2), W - tw - 8);
      const by = Math.min(Math.max(Y - 9, 2), H - 20);
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(bx, by, tw + 8, 18);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text, bx + 4, by + 3);
    };

    // ---- dimension labels on three edges from the front-bottom-right corner --
    const dimEdge = (Am, Bm, text, hot, dx, dy) => {
      const a = rp(Am), b = rp(Bm);
      ctx.save();
      ctx.lineWidth = hot ? 4 : 1.5;
      ctx.strokeStyle = hot ? CARM : 'rgba(91,107,123,0.85)';
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.restore();
      label(text, (a[0] + b[0]) / 2 + dx, (a[1] + b[1]) / 2 + dy, hot ? CARM : '#5b6b7b');
    };
    if (step >= 1 || S.focus !== 'intro') {
      dimEdge([-ox, -oy, oz], [ox, -oy, oz], `l = ${L}`, S.focus === 'length', 0, 16); // length
      dimEdge([ox, -oy, oz], [ox, -oy, -oz], `w = ${Wd}`, S.focus === 'base', 20, 6);   // width
      dimEdge([ox, -oy, oz], [ox, oy, oz], `h = ${Ht}`, S.focus === 'stack' || S.focus === 'baseheight', 22, 0); // height
    }

    // ---- a single contextual note at the bottom, matching the step ----------
    const note = (() => {
      if (S.focus === 'length') return `${L} cubes along the length`;
      if (S.focus === 'base') return `one layer = ${L} × ${Wd} = ${LF.base} cubes`;
      if (S.focus === 'stack') return `${Ht} layers stacked`;
      if (S.focus === 'volume') return `${L} × ${Wd} × ${Ht} = ${LF.volume} unit cubes`;
      if (S.focus === 'baseheight') return `V = B × h = ${LF.base} × ${Ht} = ${LF.volume}`;
      return '';
    })();
    if (note) label(note, W / 2, H - 15, CARM);
  }, [step]);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => { draw(); }, [l, w, h, step, target, showCubes, focus, draw]);

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

  /* the build step starts from a fresh 1×1×1 box so it begins un-matched */
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
    const v = parseInt(value, 10);
    if (key === 'l') setL(v);
    else if (key === 'w') setW(v);
    else setH(v);
  };
  const resetView = () => { rotRef.current = { yaw: -0.62, pitch: 0.48 }; draw(); };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((n) => Math.min(STEPS.length - 1, n + 1));
  const goBack = () => setStep((n) => Math.max(0, n - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const dialVal = (key) => (key === 'l' ? l : key === 'w' ? w : h);

  /* spoken equation for screen readers, tuned to the step in focus */
  const spoken = (() => {
    if (focus === 'length') return `Length l equals ${l}.`;
    if (focus === 'base') return `Base layer equals l times w, ${l} times ${w}, ${F.base} cubes.`;
    if (focus === 'stack') return `Height h equals ${h} layers.`;
    if (focus === 'volume') return `Volume equals l times w times h, ${F.volume} cubic units.`;
    if (focus === 'baseheight') return `Volume equals base ${F.base} times height ${h}, ${F.volume}.`;
    if (focus === 'calib' && target)
      return `Target volume ${target.goal}. Your box holds ${cur} unit cubes.`;
    return 'A rectangular box measured by counting unit cubes.';
  })();

  /* the carmine headline equation, per step */
  const headline = (() => {
    if (focus === 'intro') return 'volume = number of unit cubes';
    if (focus === 'length') return `l = ${l}`;
    if (focus === 'base') return `base = l × w = ${F.base}`;
    if (focus === 'stack') return `h = ${h} layers`;
    if (focus === 'volume') return `V = l × w × h = ${F.volume}`;
    if (focus === 'baseheight') return `V = B × h = ${F.base} × ${h} = ${F.volume}`;
    if (focus === 'calib' && target) return `goal: V = ${target.goal}`;
    return 'the box';
  })();

  const triples = target && calibrated ? factorTriples(target.goal) : [];

  return (
    <div className="vlab">
      <header className="head">
        <h1>The Volume of a Box</h1>
        <p className="lede">
          Volume is how many <span className="mono">unit cubes</span> fill a solid. Drag to orbit the
          box, then unlock each dial in turn to build the count: a row of{' '}
          <span className="mono">l</span> cubes, a floor of <span className="mono">l × w</span>, and{' '}
          <span className="mono">h</span> layers stacked up — until{' '}
          <span className="mono">V = l × w × h = base × height</span> — then build a box to a target
          volume.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">{headline}</p>
            <p className="equation-sub mono">
              l = {l} · w = {w} · h = {h} · V = {F.volume}
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
            <canvas ref={canvasRef} aria-label={`Interactive 3-D box. ${spoken}`} role="img" />
            <span className="hint mono">drag to orbit</span>
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Length</span>
              <span className="fact-v mono">l = {l}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Width</span>
              <span className="fact-v mono">w = {w}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Height</span>
              <span className="fact-v mono">h = {h}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Base area</span>
              <span className="fact-v mono">l·w = {F.base}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Volume</span>
              <span className="fact-v mono">l·w·h = {F.volume}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Surface area</span>
              <span className="fact-v mono">2(lw+lh+wh) = {F.surface}</span>
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
              className={'btn ghost' + (showCubes ? ' on' : '')}
              onClick={() => setShowCubes((v) => !v)}
              aria-pressed={showCubes}
            >
              {showCubes ? 'View: unit cubes' : 'View: solid box'}
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
              const val = dialVal(d.key);
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
                  <output className="dv">{unlocked ? val : '🔒'}</output>
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
                  V = {l}×{w}×{h} = {cur} · match {pct.toFixed(0)}%
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">find l·w·h = {target.goal}</span>
                )}
              </div>
              {calibrated && (
                <p className="triples">
                  Nice — <span className="mono">{l}×{w}×{h}</span> is one box that holds {target.goal}.
                  {triples.length > 1 && (
                    <>
                      {' '}Other boxes with the same volume:{' '}
                      <span className="mono">
                        {triples
                          .map((t) => t.join('×'))
                          .filter((s) => s !== [l, w, h].slice().sort((a, b) => a - b).join('×'))
                          .join(', ')}
                      </span>
                      . Different boxes, same volume.
                    </>
                  )}
                </p>
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
                  setL(START.l);
                  setW(START.w);
                  setH(START.h);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">V = l · w · h = (base area) × height</span> &nbsp;·&nbsp;
        a box packed with unit cubes, rendered live from the dials with a dependency-free 3-D canvas.
      </footer>

      <style jsx>{`
        .vlab {
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
        .triples {
          margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--ink);
          background: rgba(31, 138, 91, 0.06); border-left: 3px solid var(--ok);
          padding: 9px 11px; border-radius: 0 6px 6px 0;
        }
        .nav { margin-top: 20px; display: flex; justify-content: space-between; gap: 10px; }
        .foot { margin-top: 24px; font-size: 12.5px; color: var(--ink-soft); }
        :global(.vlab) :focus-visible {
          outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn, .meter-fill, .choice { transition: none; }
        }
      `}</style>
    </div>
  );
}
