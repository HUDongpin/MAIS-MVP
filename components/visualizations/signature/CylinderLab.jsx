'use client';

/* ============================================================================
   CylinderLab — an interactive "bench" for the right circular cylinder:
   its radius r, its height h, and the three quantities that fall out of them —

        Volume            V = π r² h
        Lateral surface   S_lateral = 2 π r h        (the unrolled label)
        Total surface     S_total   = 2 π r² + 2 π r h

   Built for MAIS (math AI system, www.mais.ac), K-12 (grade-8 / HS geometry).
   House style: the interactive-math-bench standard — one carmine accent for the
   idea being taught, dials that unlock one per lesson step, predict-then-check
   questions, and a calibration challenge with a live match meter.

   Why this bench differs from the 2-D y = f(x) template, and how it stays faithful:
     • A cylinder is a SOLID, not a curve on graph paper. So the VIEW is a small,
       dependency-free 3-D renderer: an orthographic projection of the cylinder's
       lateral surface, drawn as painter-sorted vertical strips, with the two
       circular bases as foreshortened ellipses. No Three.js, no WebGL, no CDN —
       pure <canvas> + React, so it drops straight into any Next.js project.
     • The cylinder's defining beauty is that its curved side UNROLLS into a flat
       rectangle whose width is the base circumference (2πr) and whose height is h.
       That is the centerpiece: press "Unroll" (or reach the lateral-surface step)
       and the tube peels open into that rectangle, exactly conserving area — the
       "aha" that makes S_lateral = 2πr·h obvious instead of memorized.
   Everything else — the state→model→render spine, DPI-aware canvas, dials that
   unlock per step, predict-then-check gating (Next gates on ANSWERED, not on
   correct), and the calibration meter/stamp — is the same machine as the rest of
   the lab library.

   The unroll is mathematically exact, not a cartoon: at unroll fraction u the
   lateral surface is always a circular arc of radius R = r/(1−u) subtending angle
   Φ = 2π(1−u). Its arc length R·Φ = 2πr is CONSTANT for every u, so no area is
   created or destroyed as the tube opens from a full circle (u=0) to a straight
   segment of length 2πr (u→1). That conserved arc length is precisely why the
   flat rectangle's width is 2πr.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.  app/labs/CylinderLab.jsx
     2. Import and render it:
          import CylinderLab from './CylinderLab';
          export default function Page() { return <CylinderLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (r, h, step, view, …).
     MODEL  — pure geometry: volume, surface areas, and the exact unroll map.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

const PI = Math.PI;

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Two dials drive the whole solid: the base radius r and
   the height h. Steps are 0.5 so a grid-aligned calibration target is exactly
   reachable. r unlocks at step 1, h at step 2; later steps use both.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'r', label: 'r', min: 1, max: 5, step: 0.5, unlock: 1, role: 'base radius' },
  { key: 'h', label: 'h', min: 1, max: 8, step: 0.5, unlock: 2, role: 'height' },
];
const START = { r: 2.5, h: 4 };

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions. `accent` names the quantity this step lights up in
   carmine so symbol and picture stay linked. Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the cylinder',
    accent: null,
    body:
      'A cylinder is a solid with two identical, parallel faces — the bases — joined by one smooth ' +
      'curved side. A soup can is a cylinder. Two numbers describe it completely: the radius r of the ' +
      'base, and the height h between the bases. Drag inside the picture to look at it from different angles.',
    q: 'The two flat bases of a cylinder are always what shape?',
    choices: ['Circles', 'Squares', 'Triangles'],
    answer: 0,
    feedback:
      'Both bases are congruent circles of radius r, and they sit directly above each other. Everything ' +
      'about a cylinder — how much it holds, how much material wraps it — comes from just r and h.',
  },
  {
    title: 'r — the radius of the base',
    accent: 'r',
    body:
      'The r dial is now live, and the radius is drawn in carmine on the top base. Each base is a circle, ' +
      'so its area is the circle formula, A = π r². Grow r and watch the base widen.',
    q: 'If you double the radius r, what happens to the area of the base, π r²?',
    choices: ['It quadruples (×4)', 'It doubles (×2)', 'It stays the same'],
    answer: 0,
    feedback:
      'Because r is squared, doubling it multiplies the base area by 2² = 4. This is the key fact that ' +
      'makes radius so powerful: a small change in r moves everything a lot. The base area π r² is the ' +
      'foundation of the volume you will build next.',
  },
  {
    title: 'h — the height, and the volume',
    accent: 'h',
    body:
      'Now the h dial unlocks and the height is drawn in carmine. Think of the volume as the base area ' +
      'stacked all the way up: V = (base area) × height = π r² × h = π r² h.',
    q: 'A cylinder has r = 2 and h = 5. What is its volume, V = π r² h?',
    choices: ['20π  (≈ 62.8)', '10π  (≈ 31.4)', '100π  (≈ 314.2)'],
    answer: 0,
    feedback:
      'V = π · r² · h = π · 2² · 5 = π · 4 · 5 = 20π ≈ 62.8. Notice we plug into π r² h and keep the answer ' +
      'as 20π when we want it exact, or ≈ 62.8 when we want a decimal. The units are cubic (length³) because ' +
      'volume fills space.',
  },
  {
    title: 'Which grows the volume faster?',
    accent: 'vol',
    body:
      'Both dials are live now. Volume is V = π r² h. The radius appears squared; the height appears just ' +
      'once. Test it: start somewhere, then try doubling one dial at a time and read the volume.',
    q: 'Starting from any cylinder, which single change increases the volume MORE?',
    choices: [
      'Doubling the radius r (volume ×4)',
      'Doubling the height h (volume ×2)',
      'They increase the volume by the same amount',
    ],
    answer: 0,
    feedback:
      'Doubling r multiplies V by 2² = 4, while doubling h multiplies V by only 2. Radius wins because it ' +
      'is squared in π r² h. A wider can gains volume much faster than a taller one of the same base.',
  },
  {
    title: 'The curved side unrolls',
    accent: 'lateral',
    body:
      'The curved side is now lit in carmine, and it is unrolling. Peel the label off a can and lay it ' +
      'flat: it is a rectangle. Its height is the cylinder’s height h. Its width is exactly how far it had ' +
      'to reach around the base — the circumference, 2π r. So the lateral (side) area is S = 2π r · h.',
    q: 'When you unroll the curved side of a cylinder and lay it flat, what shape do you get?',
    choices: [
      'A rectangle that is 2π r wide and h tall',
      'A circle of radius r',
      'A triangle',
    ],
    answer: 0,
    feedback:
      'It is a rectangle: height h (unchanged) and width 2π r (the base circumference, because the side had ' +
      'to wrap all the way around). Its area is width × height = 2π r · h. Unrolling turns a scary curved ' +
      'surface into a rectangle you already know how to measure.',
  },
  {
    title: 'Total surface area — the net',
    accent: 'total',
    body:
      'To wrap the whole cylinder you need three flat pieces — its net: the top circle, the bottom circle, ' +
      'and the unrolled rectangle. The two circles are π r² each; the rectangle is 2π r h. Add them up.',
    q: 'The net (flat pattern) of a cylinder is made of which pieces?',
    choices: [
      'Two circles and one rectangle',
      'Three rectangles',
      'Two triangles and one rectangle',
    ],
    answer: 0,
    feedback:
      'Two circular bases (π r² each) plus the rectangular side (2π r h) give the total surface area: ' +
      'S = 2π r² + 2π r h = 2π r (r + h). Surface area is measured in square units (length²) because it ' +
      'covers, rather than fills.',
  },
  {
    title: 'Calibration challenge',
    accent: 'calib',
    calib: true,
    body:
      'Final challenge. A mystery cylinder is drawn as a dashed grey outline. Tune r and h until your solid ' +
      'cylinder lands exactly on top of it and the meter reads CALIBRATED. Press “New target” for a fresh one.',
  },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure geometry; no pixels. Every formula a student sees in the
   facts panel comes from here, so the readout can never drift from the picture.
   ------------------------------------------------------------------------- */
function geometry(r, h) {
  return {
    baseArea: PI * r * r, //   π r²
    circumference: 2 * PI * r, //   2π r
    volume: PI * r * r * h, //   π r² h
    lateral: 2 * PI * r * h, //   2π r h
    total: 2 * PI * r * r + 2 * PI * r * h, //   2π r² + 2π r h
  };
}

/* The exact unroll map (see header): the lateral surface at unroll fraction u is
   a circular arc of radius R = r/(1−u) through angle Φ = 2π(1−u); arc length
   R·Φ = 2π r is invariant. Returns a horizontal-plane point (x = across,
   y = depth) for arc parameter t ∈ [0,1] and its outward normal, used for both
   geometry and shading. */
function lateralArcPoint(t, r, u) {
  const uu = Math.min(u, 0.9995); // clamp so R stays finite at u→1
  const R = r / (1 - uu);
  const phi = 2 * PI * (1 - uu);
  const beta = (t - 0.5) * phi; // t=0.5 → back seam (β=0); t=0,1 → front, splitting open
  const x = R * Math.sin(beta);
  const y = -r + R - R * Math.cos(beta); // depth; at u=0 this is a circle of radius r
  return { x, y, nx: Math.sin(beta), ny: -Math.cos(beta) };
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. Two parameters on a 0.5 grid, so an exact match is
   reachable. The score is the plain distance between (r,h) and the target,
   which is 0 exactly when both match and grows smoothly otherwise.
   ------------------------------------------------------------------------- */
function matchError(r, h, t) {
  return Math.hypot(r - t.r, h - t.h);
}
const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + err / 1.4)));
const MATCH_ERR = 0.01; // below this the cylinders coincide → CALIBRATED

function makeTarget(prev) {
  const snap = (v, st) => Math.round(v / st) * st;
  let t;
  do {
    const r = snap(1.5 + Math.random() * 3, 0.5); // 1.5 … 4.5
    const h = snap(2 + Math.random() * 5, 0.5); //   2.0 … 7.0
    t = { r, h };
  } while (
    (prev && t.r === prev.r && t.h === prev.h) ||
    (t.r === START.r && t.h === START.h) // never hand back the starting cylinder
  );
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign, trimmed decimals, and π-exact
   readouts so students connect the dial value to the number in the formula.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 100) / 100;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
// "20π" style coefficient; coef is the number multiplying π
function piExact(coef) {
  return `${trim(coef)}π`;
}
function dec(v) {
  return (Math.round(v * 10) / 10).toFixed(1);
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function CylinderLab() {
  const [r, setR] = useState(START.r);
  const [h, setH] = useState(START.h);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [unrollOn, setUnrollOn] = useState(false); // is the surface currently unrolled?

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const viewRef = useRef({ az: -0.6, s: 0.34 }); // azimuth (rad) + ellipse squash (view tilt)
  const unrollRef = useRef(0); // animated unroll fraction 0..1 (a ref: no re-render per frame)
  const sceneRef = useRef({}); // snapshot the renderer reads, so draw() never sees stale state

  const current = STEPS[step];
  const g = geometry(r, h);
  const accent = current.accent;

  sceneRef.current = { r, h, accent, calib: !!current.calib, target };

  const err = target ? matchError(r, h, target) : Infinity;
  const pct = target ? matchPercent(err) : 0;
  const calibrated = target ? err < MATCH_ERR : false;

  /* ---- the 3-D renderer: full redraw from state on every change ----------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // crisp lines, capped for perf
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const view = viewRef.current;
    const u = unrollRef.current;
    const rr = S.r;
    const hh = S.h;
    const s = view.s; // squash: 0 = edge-on, 1 = straight down
    // As the surface unrolls, swing the view square-on so the flat net faces us.
    const az = view.az * (1 - u);
    const ca = Math.cos(az);
    const sa = Math.sin(az);

    // world (x = across, y = depth, z = up) → pre-scale screen offsets (px, py)
    const rot = (x, y) => [x * ca - y * sa, x * sa + y * ca];
    const preX = (x1) => x1;
    const preY = (y1, z) => -z + s * y1; // up shrinks py (higher); depth grows py (lower/front)

    /* ---- fit: scale + center from the projected bounding box, recomputed each
       frame so the drawing NEVER overflows — wrapped (width 2r) or fully
       unrolled (width 2πr) alike. */
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const NFIT = 48;
    for (let i = 0; i <= NFIT; i++) {
      const p = lateralArcPoint(i / NFIT, rr, u);
      const [x1, y1] = rot(p.x, p.y);
      const px = preX(x1);
      for (const z of [0, hh]) {
        const py = preY(y1, z);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
    const bw = Math.max(0.5, maxX - minX);
    const bh = Math.max(0.5, maxY - minY);
    const padX = 46, padY = 58; // room for dimension labels outside the solid
    const scale = Math.min((W - padX) / bw, (H - padY) / bh);
    const cx = W / 2 - scale * (minX + maxX) / 2;
    const cy = H / 2 - scale * (minY + maxY) / 2;

    // full projection: world point → canvas pixel; depth = rotated y (larger = nearer)
    const project = (x, y, z) => {
      const [x1, y1] = rot(x, y);
      return { X: cx + scale * preX(x1), Y: cy + scale * preY(y1, z), depth: y1 };
    };

    /* ---- colour helpers -------------------------------------------------- */
    const INK = '#1C2B3A', INK_SOFT = '#5B6B7B', CARMINE = '#C81E4F';
    const mix = (a, b, t) => [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
    const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
    // body shading ramps: neutral blue normally, carmine when the side is the lesson focus
    const lateralHot = S.accent === 'lateral';
    const DARK = lateralHot ? [150, 26, 62] : [120, 149, 175];
    const LIGHT = lateralHot ? [244, 196, 208] : [232, 240, 247];
    const LIGHT_DIR = [-0.42, 0.66]; // light from front-upper-left (in x=across, y=depth)

    /* ==================================================================== *
     *  DRAW ORDER (painter's algorithm)                                     *
     *  shadow → hidden back rim → body strips (sorted) → top disk →         *
     *  front bottom rim → annotations → calibration ghost                   *
     * ==================================================================== */

    /* ground shadow — a soft ellipse under the base, fades as it unrolls */
    if (u < 0.9) {
      ctx.save();
      ctx.globalAlpha = 0.14 * (1 - u);
      ctx.fillStyle = INK;
      ctx.beginPath();
      const N = 60;
      for (let i = 0; i <= N; i++) {
        const th = (2 * PI * i) / N;
        const p = project(rr * 1.02 * Math.cos(th), rr * 1.02 * Math.sin(th), 0);
        if (i === 0) ctx.moveTo(p.X, p.Y + 4);
        else ctx.lineTo(p.X, p.Y + 4);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // true circular rim (radius rr) at a given height, split into front/back by depth
    const rimPoints = (z) => {
      const pts = [];
      const N = 96;
      for (let i = 0; i <= N; i++) {
        const th = (2 * PI * i) / N;
        const p = project(rr * Math.cos(th), rr * Math.sin(th), z);
        pts.push(p);
      }
      return pts;
    };

    const rimFade = Math.max(0, 1 - u * 1.3); // rims/disks belong to the wrapped solid

    /* hidden BACK half of the bottom rim — dashed, drawn before the body */
    if (rimFade > 0.01) {
      const bot = rimPoints(0);
      ctx.save();
      ctx.globalAlpha = rimFade * 0.9;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = INK_SOFT;
      ctx.beginPath();
      let started = false;
      for (const p of bot) {
        if (p.depth <= 0) {
          // back
          if (!started) {
            ctx.moveTo(p.X, p.Y);
            started = true;
          } else ctx.lineTo(p.X, p.Y);
        } else started = false;
      }
      ctx.stroke();
      ctx.restore();
    }

    /* ---- the lateral surface: painter-sorted vertical strips ------------- */
    const NST = 96;
    const strips = [];
    for (let i = 0; i < NST; i++) {
      const t0 = i / NST, t1 = (i + 1) / NST, tm = (i + 0.5) / NST;
      const a0 = lateralArcPoint(t0, rr, u);
      const a1 = lateralArcPoint(t1, rr, u);
      const am = lateralArcPoint(tm, rr, u);
      const p00 = project(a0.x, a0.y, 0);
      const p10 = project(a1.x, a1.y, 0);
      const p11 = project(a1.x, a1.y, hh);
      const p01 = project(a0.x, a0.y, hh);
      const [nx, ny] = rot(am.nx, am.ny); // outward normal, rotated into view
      const facing = Math.max(0, nx * LIGHT_DIR[0] + ny * LIGHT_DIR[1]);
      const intensity = 0.28 + 0.72 * facing; // ambient + diffuse
      strips.push({
        depth: (p00.depth + p10.depth) / 2,
        col: rgb(mix(DARK, LIGHT, intensity)),
        p00, p10, p11, p01, t: tm,
      });
    }
    strips.sort((a, b) => a.depth - b.depth); // far first, near last → opaque tube
    for (const st of strips) {
      ctx.beginPath();
      ctx.moveTo(st.p00.X, st.p00.Y);
      ctx.lineTo(st.p10.X, st.p10.Y);
      ctx.lineTo(st.p11.X, st.p11.Y);
      ctx.lineTo(st.p01.X, st.p01.Y);
      ctx.closePath();
      ctx.fillStyle = st.col;
      ctx.fill();
      // hairline of the same colour to seal seams between strips
      ctx.strokeStyle = st.col;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* faint vertical gridlines on the surface once it starts to open — they
       make the flat rectangle read as one continuous unrolled band */
    if (u > 0.35) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (u - 0.35) / 0.4) * 0.35;
      ctx.strokeStyle = lateralHot ? '#7a1030' : INK_SOFT;
      ctx.lineWidth = 1;
      for (let k = 1; k < 12; k++) {
        const a = lateralArcPoint(k / 12, rr, u);
        const pa = project(a.x, a.y, 0);
        const pb = project(a.x, a.y, hh);
        ctx.beginPath();
        ctx.moveTo(pa.X, pa.Y);
        ctx.lineTo(pb.X, pb.Y);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* outline the lateral surface (top edge, bottom edge, and the two ends) */
    {
      const topEdge = [], botEdge = [];
      const NE = 96;
      for (let i = 0; i <= NE; i++) {
        const a = lateralArcPoint(i / NE, rr, u);
        botEdge.push(project(a.x, a.y, 0));
        topEdge.push(project(a.x, a.y, hh));
      }
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineWidth = lateralHot ? 2.4 : 1.6;
      ctx.strokeStyle = lateralHot ? CARMINE : INK;
      // top edge of the band (fades where the true top rim takes over when wrapped)
      ctx.globalAlpha = Math.max(u, lateralHot ? 1 : 0.001);
      const strokePath = (pts) => {
        ctx.beginPath();
        pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.X, p.Y) : ctx.lineTo(p.X, p.Y)));
        ctx.stroke();
      };
      if (u > 0.02 || lateralHot) {
        strokePath(topEdge);
        strokePath(botEdge);
      }
      // the two open ends (only visible once unrolling)
      if (u > 0.02) {
        ctx.globalAlpha = Math.min(1, u * 2);
        const ends = [
          [topEdge[0], botEdge[0]],
          [topEdge[NE], botEdge[NE]],
        ];
        for (const [a, b] of ends) {
          ctx.beginPath();
          ctx.moveTo(a.X, a.Y);
          ctx.lineTo(b.X, b.Y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    /* ---- top disk + rims (belong to the wrapped solid; fade as it unrolls) */
    if (rimFade > 0.01) {
      const totalHot = S.accent === 'total';
      const top = rimPoints(hh);
      // filled top face, a touch lighter than the body
      ctx.save();
      ctx.globalAlpha = rimFade;
      ctx.beginPath();
      top.forEach((p, i) => (i === 0 ? ctx.moveTo(p.X, p.Y) : ctx.lineTo(p.X, p.Y)));
      ctx.closePath();
      ctx.fillStyle = rgb(mix(DARK, LIGHT, 0.92));
      ctx.fill();
      ctx.lineWidth = totalHot ? 2.6 : 1.8;
      ctx.strokeStyle = totalHot ? CARMINE : INK;
      ctx.stroke();
      ctx.restore();

      // front half of the bottom rim — solid, on top of the body
      ctx.save();
      ctx.globalAlpha = rimFade;
      ctx.lineWidth = totalHot ? 2.6 : 1.8;
      ctx.strokeStyle = totalHot ? CARMINE : INK;
      ctx.beginPath();
      let started = false;
      for (const p of rimPoints(0)) {
        if (p.depth >= 0) {
          if (!started) {
            ctx.moveTo(p.X, p.Y);
            started = true;
          } else ctx.lineTo(p.X, p.Y);
        } else started = false;
      }
      ctx.stroke();
      ctx.restore();
    }

    /* ---- annotations: radius line, height line, or net dimensions -------- */
    const label = (txt, X, Y, color, align = 'center', baseline = 'middle') => {
      ctx.save();
      ctx.font = '600 13px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      const w = ctx.measureText(txt).width;
      const ax = align === 'center' ? X - w / 2 : align === 'right' ? X - w : X;
      ctx.fillStyle = 'rgba(251,251,248,0.9)';
      ctx.fillRect(ax - 4, Y - 9, w + 8, 18);
      ctx.fillStyle = color;
      ctx.fillText(txt, X, Y);
      ctx.restore();
    };

    const showR = (S.accent === 'r' || S.accent === 'vol') && rimFade > 0.3;
    const showH = (S.accent === 'h' || S.accent === 'vol') && rimFade > 0.3;

    if (showR) {
      // radius on the top face: centre → front rim point, in carmine
      const c0 = project(0, 0, hh);
      const c1 = project(0, rr, hh);
      ctx.save();
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(c0.X, c0.Y);
      ctx.lineTo(c1.X, c1.Y);
      ctx.stroke();
      ctx.fillStyle = CARMINE;
      ctx.beginPath();
      ctx.arc(c0.X, c0.Y, 3, 0, 2 * PI);
      ctx.fill();
      ctx.restore();
      label(`r = ${trim(rr)}`, (c0.X + c1.X) / 2, (c0.Y + c1.Y) / 2 - 12, CARMINE);
    }
    if (showH) {
      // height up the right silhouette edge, in carmine
      const b = project(rr, 0, 0);
      const t = project(rr, 0, hh);
      const off = 14;
      ctx.save();
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(b.X + off, b.Y);
      ctx.lineTo(t.X + off, t.Y);
      // little end ticks
      ctx.moveTo(b.X + off - 5, b.Y);
      ctx.lineTo(b.X + off + 5, b.Y);
      ctx.moveTo(t.X + off - 5, t.Y);
      ctx.lineTo(t.X + off + 5, t.Y);
      ctx.stroke();
      ctx.restore();
      label(`h = ${trim(hh)}`, t.X + off + 8, (b.Y + t.Y) / 2, CARMINE, 'left');
    }

    /* net dimensions once (nearly) unrolled: width = 2πr, height = h, area */
    if (u > 0.82) {
      const a = Math.min(1, (u - 0.82) / 0.18);
      ctx.save();
      ctx.globalAlpha = a;
      const left = lateralArcPoint(0, rr, u);
      const right = lateralArcPoint(1, rr, u);
      const bl = project(left.x, left.y, 0);
      const br = project(right.x, right.y, 0);
      const tl = project(left.x, left.y, hh);
      // width dimension line below the rectangle
      const wy = Math.max(bl.Y, br.Y) + 22;
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(bl.X, wy);
      ctx.lineTo(br.X, wy);
      ctx.moveTo(bl.X, wy - 5);
      ctx.lineTo(bl.X, wy + 5);
      ctx.moveTo(br.X, wy - 5);
      ctx.lineTo(br.X, wy + 5);
      ctx.stroke();
      label(`2πr = ${dec(g.circumference)}`, (bl.X + br.X) / 2, wy + 12, CARMINE);
      // height dimension on the left
      const hx = Math.min(bl.X, tl.X) - 16;
      ctx.beginPath();
      ctx.moveTo(hx, bl.Y);
      ctx.lineTo(hx, tl.Y);
      ctx.moveTo(hx - 5, bl.Y);
      ctx.lineTo(hx + 5, bl.Y);
      ctx.moveTo(hx - 5, tl.Y);
      ctx.lineTo(hx + 5, tl.Y);
      ctx.stroke();
      label(`h = ${trim(hh)}`, hx - 8, (bl.Y + tl.Y) / 2, CARMINE, 'right');
      // area in the middle
      label(`area = 2πrh = ${dec(g.lateral)}`, (bl.X + br.X) / 2, (bl.Y + tl.Y) / 2, CARMINE);
      ctx.restore();
    }

    /* ---- calibration ghost: the target cylinder as a dashed grey outline -- */
    if (S.calib && S.target) {
      const tr = S.target.r, th = S.target.h;
      const ghostRim = (z) => {
        const pts = [];
        const N = 96;
        for (let i = 0; i <= N; i++) {
          const a = (2 * PI * i) / N;
          pts.push(project(tr * Math.cos(a), tr * Math.sin(a), z));
        }
        return pts;
      };
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(91,107,123,0.9)';
      for (const z of [0, th]) {
        const pts = ghostRim(z);
        ctx.beginPath();
        pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.X, p.Y) : ctx.lineTo(p.X, p.Y)));
        ctx.closePath();
        ctx.stroke();
      }
      // side silhouette edges at x = ±tr
      for (const sgn of [-1, 1]) {
        const b = project(sgn * tr, 0, 0);
        const t = project(sgn * tr, 0, th);
        ctx.beginPath();
        ctx.moveTo(b.X, b.Y);
        ctx.lineTo(t.X, t.Y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }, []);

  /* redraw whenever anything visible changes */
  useEffect(() => {
    draw();
  }, [r, h, step, target, draw]);

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

  /* the lateral-surface step unrolls automatically; leaving it re-wraps */
  useEffect(() => {
    setUnrollOn(STEPS[step] && STEPS[step].accent === 'lateral');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the unroll animation — time-based, opt-in, honours reduced motion ------- */
  useEffect(() => {
    const targetU = unrollOn ? 1 : 0;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      unrollRef.current = targetU;
      draw();
      return;
    }
    let raf;
    const DURATION = 1300;
    const from = unrollRef.current;
    let start = null;
    const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const loop = (now) => {
      if (start == null) start = now;
      const k = Math.min(1, (now - start) / DURATION);
      unrollRef.current = from + (targetU - from) * ease(k);
      draw();
      if (k < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [unrollOn, draw]);

  /* ---- drag to orbit: horizontal = azimuth, vertical = view tilt --------- */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let dragging = false, lastX = 0, lastY = 0;
    const down = (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      stage.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if (!dragging) return;
      const v = viewRef.current;
      v.az += (e.clientX - lastX) * 0.01;
      v.s = Math.max(0.16, Math.min(0.5, v.s - (e.clientY - lastY) * 0.004));
      lastX = e.clientX;
      lastY = e.clientY;
      draw();
    };
    const up = () => {
      dragging = false;
    };
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointerleave', up);
    return () => {
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointerleave', up);
    };
  }, [draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 'r') setR(v);
    else setH(v);
  };
  const resetDials = () => {
    setR(START.r);
    setH(START.h);
  };
  const resetView = () => {
    viewRef.current = { az: -0.6, s: 0.34 };
    draw();
  };
  const choose = (idx) => {
    if (answers[step] != null) return; // lock the answer once given
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  // which formula the carmine equation readout shows, keyed to the lesson focus
  const eqFocus =
    accent === 'lateral' ? 'lateral' : accent === 'total' ? 'total' : accent === 'r' ? 'area' : 'volume';

  const spoken =
    `Cylinder with radius ${trim(r)} and height ${trim(h)}. ` +
    `Base area π r squared equals ${dec(g.baseArea)}. Volume π r squared h equals ${dec(g.volume)}. ` +
    `Lateral surface area 2 π r h equals ${dec(g.lateral)}. Total surface area equals ${dec(g.total)}.`;

  return (
    <div className="clab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Cylinder</h1>
        <p className="lede">
          A right circular cylinder is built from two numbers — the base radius{' '}
          <span className="mono">r</span> and the height <span className="mono">h</span>. Turn the dials to
          reshape it, orbit it with a drag, and watch its curved side{' '}
          <span className="mono">unroll</span> into the rectangle that explains{' '}
          <span className="mono">2πrh</span>. Each dial unlocks with the lesson, then calibrate onto a
          mystery cylinder.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation" aria-hidden="true">
              {eqFocus === 'volume' && (
                <>
                  V = π r² h = <b>{piExact(r * r * h)}</b> ≈ {dec(g.volume)}
                </>
              )}
              {eqFocus === 'area' && (
                <>
                  A = π r² = <b>{piExact(r * r)}</b> ≈ {dec(g.baseArea)}
                </>
              )}
              {eqFocus === 'lateral' && (
                <>
                  S<sub>side</sub> = 2π r h = <b>{piExact(2 * r * h)}</b> ≈ {dec(g.lateral)}
                </>
              )}
              {eqFocus === 'total' && (
                <>
                  S = 2π r² + 2π r h = <b>{piExact(2 * r * r + 2 * r * h)}</b> ≈ {dec(g.total)}
                </>
              )}
            </p>
          </div>

          <div className="stage" ref={stageRef}>
            <canvas ref={canvasRef} aria-label={spoken} role="img" />
            <span className="hint mono">drag to orbit</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Radius · Height</span>
              <span className="fact-v mono">{`r = ${trim(r)} · h = ${trim(h)}`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Base area · πr²</span>
              <span className="fact-v mono">{`${piExact(r * r)} ≈ ${dec(g.baseArea)}`}</span>
            </div>
            <div className={'fact' + (eqFocus === 'volume' ? ' hot' : '')}>
              <span className="fact-k">Volume · πr²h</span>
              <span className="fact-v mono">{`${piExact(r * r * h)} ≈ ${dec(g.volume)}`}</span>
            </div>
            <div className={'fact' + (eqFocus === 'lateral' ? ' hot' : '')}>
              <span className="fact-k">Lateral SA · 2πrh</span>
              <span className="fact-v mono">{`${piExact(2 * r * h)} ≈ ${dec(g.lateral)}`}</span>
            </div>
            <div className={'fact' + (eqFocus === 'total' ? ' hot' : '')}>
              <span className="fact-k">Total SA · 2πr²+2πrh</span>
              <span className="fact-v mono">{`${piExact(2 * r * r + 2 * r * h)} ≈ ${dec(g.total)}`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Circumference · 2πr</span>
              <span className="fact-v mono">{`${piExact(2 * r)} ≈ ${dec(g.circumference)}`}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (unrollOn ? ' on' : '')}
              aria-pressed={unrollOn}
              onClick={() => setUnrollOn((v) => !v)}
            >
              {unrollOn ? 'Wrap back up' : 'Unroll the surface'}
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
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                }}
              >
                New target
              </button>
              <p className="sr-only" role="status">
                {calibrated ? 'Calibrated. The cylinders match.' : `Match ${pct.toFixed(0)} percent.`}
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
                  setUnrollOn(false);
                  resetDials();
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">V = πr²h</span> &nbsp;·&nbsp; <span className="mono">S = 2πr² + 2πrh</span>
        &nbsp;·&nbsp; a right circular cylinder rendered live from the dials — no external libraries.
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
          max-width: 70ch;
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
          min-height: 22px;
        }
        .equation {
          color: var(--curve);
          margin: 0;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 15px;
          font-weight: 500;
        }
        .equation b {
          font-weight: 700;
        }
        .equation sub {
          font-size: 0.72em;
        }
        .stage {
          position: relative;
          width: 100%;
          height: clamp(320px, 46vw, 460px);
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          cursor: grab;
          background: linear-gradient(180deg, #fdfefe 0%, #eef3f6 100%);
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
          padding: 6px 8px;
          border-top: 1px solid rgba(28, 43, 58, 0.08);
          border-radius: 4px;
          transition: background 0.2s;
        }
        .fact.hot {
          background: rgba(200, 30, 79, 0.07);
        }
        .fact.hot .fact-v {
          color: var(--curve);
        }
        .fact-k {
          font-size: 11px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v {
          font-size: 13.5px;
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
          accent-color: var(--curve);
          cursor: pointer;
        }
        .dial input[type='range']:disabled {
          cursor: not-allowed;
          accent-color: var(--ink-soft);
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
          .choice,
          .fact {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
