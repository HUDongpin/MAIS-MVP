'use client';

/* ============================================================================
   DistanceLab — an interactive "bench" for the distance between two points,

        d  =  √( (x₂ − x₁)²  +  (y₂ − y₁)² )

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   Why this bench, and the one idea it exists to make visible:
     • The distance formula LOOKS like something to memorize, but it is nothing
       more than the Pythagorean theorem wearing coordinates. Between two points
       you can always travel horizontally by Δx = x₂ − x₁, then vertically by
       Δy = y₂ − y₁ — two perpendicular legs of a right triangle whose
       hypotenuse is the straight segment. Pythagoras then says
       d² = Δx² + Δy², i.e. d = √(Δx² + Δy²). The centerpiece switches that
       triangle on and shows leg² + leg² summing to d² for ANY two points.
     • Because each difference is SQUARED, the order of subtraction can't matter
       and the result is never negative — so no absolute-value bars are needed.
       That misconception ("subtract in a fixed order or the sign flips d") is
       confronted head-on in the lesson.
   The object here is the SEGMENT AB, so the render draws it as one carmine line
   (not a per-pixel y = f(x) plot), and the two endpoints are draggable — the
   canonical interaction for a coordinate-geometry lab.
   Everything else — the state→model→render spine, DPI handling, unlocking dials,
   predict-then-check gating, and the RMS calibration meter — is the same machine
   as the rest of the lab library (its nearest sibling is the Circle lab, whose
   radius triangle is this same Pythagorean idea measured from a center).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/DistanceLab.jsx
     2. Import and render it:
          import DistanceLab from './DistanceLab';
          export default function Page() { return <DistanceLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (x1, y1, x2, y2, step).
     MODEL  — the differences, distance and midpoint are pure math; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. Square window so x and y share one scale and a
   right angle on screen is a right angle in the world (a distance is only read
   correctly when the axes aren't stretched). Grid every 1 unit, labels every 2.
   Point ranges below keep both endpoints, the triangle, and its labels inside
   this window (|coord| ≤ 7 < 10).
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Four coordinate dials, two per point. They unlock in the
   order the lesson needs: move B to build the two legs (x₂, then y₂), then free
   A (x₁, then y₁) to show only the DIFFERENCES drive the distance. All steps are
   0.5 so a grid-aligned calibration target can be matched exactly.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'x2', label: 'x₂', min: -7, max: 7, step: 0.5, unlock: 1, role: 'point B · left / right' },
  { key: 'y2', label: 'y₂', min: -7, max: 7, step: 0.5, unlock: 2, role: 'point B · up / down' },
  { key: 'x1', label: 'x₁', min: -7, max: 7, step: 0.5, unlock: 4, role: 'point A · left / right' },
  { key: 'y1', label: 'y₁', min: -7, max: 7, step: 0.5, unlock: 5, role: 'point A · up / down' },
];
// A starting 3–4–5 triangle: Δx = 4, Δy = 3, so d = 5 exactly.
const START = { x1: -2, y1: -1, x2: 2, y2: 2 };

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; a dial unlocks with its step; the reveal
   lives in `feedback` (shown after answering); distractors are real student
   misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Two points, one distance',
    body:
      'On a coordinate grid, the distance between two points A and B is the length of the straight ' +
      'segment that joins them — how far apart they are, measured in a straight line. Right now ' +
      'A = (−2, −1) and B = (2, 2), and that segment is exactly 5 units long. Our job is to find a ' +
      'formula that gives this length from the coordinates alone. Everything is built from one right ' +
      'triangle.',
    q: 'The distance between two points is…',
    choices: [
      'the length of the straight segment joining them',
      'the difference of their x-coordinates',
      'always a whole number',
    ],
    answer: 0,
    feedback:
      'Distance is the straight-line length of segment AB — the shortest path between the points. It is ' +
      'never negative, and it is usually not a whole number (5 here is a lucky, tidy case). In the next ' +
      'steps we’ll build that length out of a horizontal move and a vertical move.',
  },
  {
    title: 'The run — horizontal separation',
    body:
      'The x₂ dial is live: slide point B left and right. Watch the horizontal gap between the points, ' +
      'called the run, Δx = x₂ − x₁. It measures how far apart A and B are in the x-direction only.',
    q: 'With A at x₁ = −2 and B at x₂ = 2, the run x₂ − x₁ equals…',
    choices: ['4', '−4', '0'],
    answer: 0,
    feedback:
      'Run = x₂ − x₁ = 2 − (−2) = 4. Subtracting a negative adds: minus −2 is plus 2. This is the ' +
      'horizontal leg of the triangle we’re about to build. (Subtract the other way and you’d get −4 — ' +
      'hold that thought; once we square it, the sign won’t matter at all.)',
  },
  {
    title: 'The rise — vertical separation',
    body:
      'Now the y₂ dial unlocks: slide B up and down. The vertical gap is the rise, Δy = y₂ − y₁ — how ' +
      'far apart the points are in the y-direction. The run and the rise are the two legs of a right ' +
      'triangle, meeting at a square corner.',
    q: 'With A at y₁ = −1 and B at y₂ = 2, the rise y₂ − y₁ equals…',
    choices: ['3', '−3', '1'],
    answer: 0,
    feedback:
      'Rise = y₂ − y₁ = 2 − (−1) = 3. So the two legs are 4 across and 3 up. Notice we go across, then ' +
      'up, along two perpendicular paths — and the straight segment AB cuts the corner as the ' +
      'hypotenuse. That triangle is the whole secret.',
  },
  {
    title: 'The right triangle = Pythagoras',
    body:
      'The right triangle is switched on. Travel from A across by Δx, then up by Δy, to reach B: two ' +
      'legs meeting at a right angle, with segment AB as the hypotenuse. The Pythagorean theorem says ' +
      'leg² + leg² = hypotenuse², so d² = Δx² + Δy². Drag a point, or read the box on the graph.',
    q: 'The legs are 4 and 3. What is d² and d?',
    choices: [
      'd² = 16 + 9 = 25, so d = 5',
      'd = 4 + 3 = 7',
      'd² = 4 + 3 = 7',
    ],
    answer: 0,
    feedback:
      'd² = Δx² + Δy² = 4² + 3² = 16 + 9 = 25, so d = √25 = 5. The distance is the hypotenuse of the ' +
      'right triangle whose legs are the horizontal and vertical separations. You can’t just add the ' +
      'legs (4 + 3 = 7 is wrong) — you must add their squares and then take the square root.',
  },
  {
    title: 'The distance formula',
    body:
      'Take the square root of both sides and you have the distance formula: ' +
      'd = √(Δx² + Δy²) = √((x₂ − x₁)² + (y₂ − y₁)²). Now A’s x-dial unlocks too. Slide A and watch: ' +
      'only the differences x₂ − x₁ and y₂ − y₁ change d. The points’ actual positions don’t matter — ' +
      'only how far apart they are.',
    q: 'Does the ORDER of subtraction, (x₂ − x₁) versus (x₁ − x₂), change the distance?',
    choices: [
      'No — it’s squared, so the sign disappears: (x₂ − x₁)² = (x₁ − x₂)²',
      'Yes, you must always compute second minus first',
      'Yes, reversing it flips the sign of d',
    ],
    answer: 0,
    feedback:
      'Each difference is squared, and squaring erases the sign: (x₂ − x₁)² = (x₁ − x₂)². So you may ' +
      'subtract in either order and the distance comes out the same — and always ≥ 0. That’s exactly ' +
      'why the formula needs no absolute-value bars: the squares already guarantee a positive result.',
  },
  {
    title: 'The midpoint',
    body:
      'A’s y-dial unlocks — both points now move freely. The midpoint M is the point exactly halfway ' +
      'along AB. You don’t subtract for it, you AVERAGE: ' +
      'M = ((x₁ + x₂) / 2, (y₁ + y₂) / 2). The midpoint marker is on the graph.',
    q: 'The midpoint of A(−2, −1) and B(2, 2) is…',
    choices: ['(0, 0.5)', '(4, 3)', '(2, 1.5)'],
    answer: 0,
    feedback:
      'Average each coordinate: x = (−2 + 2) / 2 = 0 and y = (−1 + 2) / 2 = 0.5, so M = (0, 0.5). Add ' +
      'and halve — a common slip is to subtract (that gives the run and rise, not the middle). Distance ' +
      'uses differences; midpoint uses sums.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. A mystery segment is drawn as a dashed grey line with hollow endpoints. Tune ' +
      'x₁, y₁, x₂, y₂ — or drag the points directly — until your carmine segment lands exactly on top ' +
      'of it and the meter reads CALIBRATED. Either endpoint may land on either target end (a segment ' +
      'has no built-in direction). Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.
   From two points come the run, the rise, the distance, and the midpoint.
   ------------------------------------------------------------------------- */
function geometry(p) {
  const dx = p.x2 - p.x1; // run  Δx
  const dy = p.y2 - p.y1; // rise Δy
  return {
    dx,
    dy,
    dx2: dx * dx,
    dy2: dy * dy,
    sum: dx * dx + dy * dy,
    dist: Math.hypot(dx, dy), // √(Δx² + Δy²)  — the distance formula
    mx: (p.x1 + p.x2) / 2, // midpoint x = average of the x's
    my: (p.y1 + p.y2) / 2, // midpoint y = average of the y's
  };
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. The match metric is the average endpoint offset between
   your segment and the target, taken orientation-free (a segment AB is the same
   segment as BA), so either endpoint may match either target end. It is 0
   exactly when the segments coincide and grows smoothly otherwise. Targets sit
   on integer coordinates, so an exact (error = 0) match is always reachable.
   ------------------------------------------------------------------------- */
function matchError(p, t) {
  const d = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const straight = d(p.x1, p.y1, t.x1, t.y1) + d(p.x2, p.y2, t.x2, t.y2);
  const swapped = d(p.x1, p.y1, t.x2, t.y2) + d(p.x2, p.y2, t.x1, t.y1);
  return Math.min(straight, swapped) / 2;
}
const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + err / 1.2)));
const MATCH_ERR = 0.03; // below this the segments are effectively identical -> CALIBRATED

function sameSegment(a, b) {
  if (!a || !b) return false;
  const straight = a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2;
  const swapped = a.x1 === b.x2 && a.y1 === b.y2 && a.x2 === b.x1 && a.y2 === b.y1;
  return straight || swapped;
}
function makeTarget(prev) {
  const ri = () => Math.round(-6 + Math.random() * 12); // integer in [−6, 6]
  let t;
  do {
    t = { x1: ri(), y1: ri(), x2: ri(), y2: ri() };
  } while (
    Math.hypot(t.x2 - t.x1, t.y2 - t.y1) < 3 || // reject too-short (or zero) segments
    sameSegment(t, prev) || // never repeat the previous target
    sameSegment(t, START) // never hand back the starting segment
  );
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−), trimmed decimals.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 100) / 100;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
// distance readout: exact integer when it lands on one, else ≈ to 2 dp
function distStr(dist) {
  return Number.isInteger(dist) ? String(dist) : '≈ ' + dist.toFixed(2);
}

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display. The distance formula with a proper radical, and a
   second line that substitutes the current numbers all the way down to d.
   ------------------------------------------------------------------------- */
function Radical({ children }) {
  // √ glyph with an overbar spanning the radicand
  return (
    <span className="root">
      <span className="root-sign">√</span>
      <span className="root-body">{children}</span>
    </span>
  );
}
function DistanceEquation() {
  return (
    <span className="eq">
      <span>d</span>
      <span className="eq-op">=</span>
      <Radical>
        (x<sub>2</sub>&nbsp;{MINUS}&nbsp;x<sub>1</sub>)<sup>2</sup>
        <span className="eq-op">+</span>
        (y<sub>2</sub>&nbsp;{MINUS}&nbsp;y<sub>1</sub>)<sup>2</sup>
      </Radical>
    </span>
  );
}
// the numeric substitution, with the current values put in — the second line
function substitutedForm(g) {
  const tail = Number.isInteger(g.dist) ? `= ${g.dist}` : `≈ ${g.dist.toFixed(2)}`;
  return (
    `d = √((${trim(g.dx)})²&nbsp;+&nbsp;(${trim(g.dy)})²) ` +
    `= √(${trim(g.dx2)}&nbsp;+&nbsp;${trim(g.dy2)}) ` +
    `= √${trim(g.sum)} ${tail}`
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function DistanceLab() {
  const [x1, setX1] = useState(START.x1);
  const [y1, setY1] = useState(START.y1);
  const [x2, setX2] = useState(START.x2);
  const [y2, setY2] = useState(START.y2);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [showTri, setShowTri] = useState(false);
  const [showMid, setShowMid] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null); // 'A' | 'B' while dragging an endpoint, else null
  const sceneRef = useRef({});

  const params = { x1, y1, x2, y2 };
  const current = STEPS[step];
  const g = geometry(params);

  // which coordinates are unlocked at this step (drives dials AND dragging)
  const unlocked = {};
  PARAMS.forEach((d) => {
    unlocked[d.key] = step >= d.unlock;
  });
  const canDragA = unlocked.x1 || unlocked.y1;
  const canDragB = unlocked.x2 || unlocked.y2;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer handlers never read stale values.
  sceneRef.current = {
    x1, y1, x2, y2,
    calib: !!current.calib,
    target,
    showTri,
    showMid,
  };

  const err = target ? matchError(params, target) : Infinity;
  const pct = target ? matchPercent(err) : 0;
  const calibrated = target ? err < MATCH_ERR : false;

  /* ---- world → screen transform + full redraw from state ------------------ */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // capped for perf & crisp lines
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    const sx = (x) => ((x - WORLD.xmin) / (WORLD.xmax - WORLD.xmin)) * W;
    const sy = (y) => ((WORLD.ymax - y) / (WORLD.ymax - WORLD.ymin)) * H;

    const S = sceneRef.current;
    const gg = geometry(S);

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

    const dot = (wx, wy, rad, fill, ring) => {
      ctx.beginPath();
      ctx.arc(sx(wx), sy(wy), rad, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (ring) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = ring;
        ctx.stroke();
      }
    };
    const ring = (wx, wy, rad, stroke) => {
      ctx.beginPath();
      ctx.arc(sx(wx), sy(wy), rad, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    };

    /* a small monospace tag with a soft paper backing, for on-canvas labels */
    const tag = (text, X, Y, align = 'center', color = '#5B6B7B') => {
      ctx.save();
      ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(text).width;
      const bx = align === 'center' ? X - tw / 2 - 2 : align === 'left' ? X - 2 : X - tw - 2;
      ctx.fillStyle = 'rgba(251,251,248,0.85)';
      ctx.fillRect(bx, Y - 8, tw + 4, 15);
      ctx.fillStyle = color;
      ctx.fillText(text, X, Y);
      ctx.restore();
    };

    /* target segment (calibration only) — dashed grey with hollow endpoints */
    if (S.calib && S.target) {
      const t = S.target;
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(91,107,123,0.85)';
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.moveTo(sx(t.x1), sy(t.y1));
      ctx.lineTo(sx(t.x2), sy(t.y2));
      ctx.stroke();
      ctx.restore();
      ring(t.x1, t.y1, 5, 'rgba(91,107,123,0.85)');
      ring(t.x2, t.y2, 5, 'rgba(91,107,123,0.85)');
    }

    /* the right triangle (the Pythagorean property) — drawn under the segment */
    const corner = { x: S.x2, y: S.y1 }; // right-angle corner: across from A, below/above B
    if (S.showTri) {
      const bothLegs = Math.abs(gg.dx) > 1e-9 && Math.abs(gg.dy) > 1e-9;

      /* the two legs, dashed: across (Δx) from A, then up (Δy) to B */
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(91,107,123,0.8)';
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(sx(S.x1), sy(S.y1));
      ctx.lineTo(sx(corner.x), sy(corner.y));
      ctx.lineTo(sx(S.x2), sy(S.y2));
      ctx.stroke();
      ctx.restore();

      /* right-angle marker at the corner, when both legs are visible */
      if (bothLegs) {
        const m = 9;
        const hdir = Math.sign(sx(S.x1) - sx(corner.x)); // toward A, horizontally
        const vdir = Math.sign(sy(S.y2) - sy(corner.y)); // toward B, vertically
        ctx.save();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(28,43,58,0.55)';
        ctx.beginPath();
        ctx.moveTo(sx(corner.x) + hdir * m, sy(corner.y));
        ctx.lineTo(sx(corner.x) + hdir * m, sy(corner.y) + vdir * m);
        ctx.lineTo(sx(corner.x), sy(corner.y) + vdir * m);
        ctx.stroke();
        ctx.restore();
      }

      /* leg labels — the signed differences, matching the formula */
      if (Math.abs(gg.dx) > 0.4) {
        const midX = (sx(S.x1) + sx(corner.x)) / 2;
        // push the label away from B (outside the triangle)
        const off = S.y2 >= S.y1 ? 12 : -12;
        tag('x₂ − x₁', midX, sy(S.y1) + off);
      }
      if (Math.abs(gg.dy) > 0.4) {
        const midY = (sy(corner.y) + sy(S.y2)) / 2;
        // the triangle interior is on A's side of the vertical leg, so push the
        // label to the OPPOSITE side — outside the triangle, clear of the
        // midpoint marker (which shares this exact height).
        const off = S.x1 < S.x2 ? 18 : -18;
        tag('y₂ − y₁', sx(corner.x) + off, midY, off > 0 ? 'left' : 'right');
      }
    }

    /* the mathematical object — the segment AB, the one carmine accent */
    ctx.save();
    ctx.lineWidth = 2.75;
    ctx.strokeStyle = '#C81E4F';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx(S.x1), sy(S.y1));
    ctx.lineTo(sx(S.x2), sy(S.y2));
    ctx.stroke();
    ctx.restore();

    /* the 'd' label on the hypotenuse, offset perpendicular, away from the corner */
    if (gg.dist > 0.5) {
      const Mx = (sx(S.x1) + sx(S.x2)) / 2;
      const My = (sy(S.y1) + sy(S.y2)) / 2;
      let ox = Mx - sx(corner.x); // away from the right-angle corner
      let oy = My - sy(corner.y);
      const on = Math.hypot(ox, oy) || 1;
      ox /= on;
      oy /= on;
      tag('d', Mx + ox * 16, My + oy * 16, 'center', '#C81E4F');
    }

    /* midpoint marker (small carmine ring), optional */
    if (S.showMid) {
      ring(gg.mx, gg.my, 4.5, '#C81E4F');
      dot(gg.mx, gg.my, 1.6, '#C81E4F');
      const X = sx(gg.mx);
      const Y = sy(gg.my);
      tag(`M (${trim(gg.mx)}, ${trim(gg.my)})`, X, Y - 14, 'center', '#5B6B7B');
    }

    /* the two endpoints — dark ink dots with paper rings, plus coordinate labels
       placed on the far side of each point (away from the other) so they never
       sit on top of the segment. */
    const place = (px, py, other, name) => {
      const Px = sx(px);
      const Py = sy(py);
      dot(px, py, 5, '#1C2B3A', '#FBFBF8');
      let ux = Px - sx(other.x);
      let uy = Py - sy(other.y);
      const un = Math.hypot(ux, uy) || 1;
      ux /= un;
      uy /= un;
      const lx = Px + ux * 16;
      const ly = Py + uy * 16;
      const align = ux >= 0 ? 'left' : 'right';
      tag(`${name} (${trim(px)}, ${trim(py)})`, lx, ly, align, '#1C2B3A');
    };
    place(S.x1, S.y1, { x: S.x2, y: S.y2 }, 'A');
    place(S.x2, S.y2, { x: S.x1, y: S.y1 }, 'B');

    /* the running Pythagorean readout, top-left — the payoff. Two lines:
       leg² + leg² = d², then d = √(that) = value. */
    if (S.showTri) {
      ctx.save();
      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
      const l1 = `(x₂−x₁)² + (y₂−y₁)² = ${gg.dx2.toFixed(1)} + ${gg.dy2.toFixed(1)} = ${gg.sum.toFixed(1)}`;
      const l2 = `d = √${gg.sum.toFixed(1)} = ${distStr(gg.dist)}`;
      const tw = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width);
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(8, 8, tw + 12, 38);
      ctx.strokeStyle = 'rgba(28,43,58,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(8.5, 8.5, tw + 11, 37);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1C2B3A';
      ctx.fillText(l1, 14, 20);
      ctx.fillStyle = '#C81E4F';
      ctx.fillText(l2, 14, 35);
      ctx.restore();
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [x1, y1, x2, y2, step, target, showTri, showMid, draw]);

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

  /* steps that own a visual turn it on automatically */
  useEffect(() => {
    const t = STEPS[step] && STEPS[step].title;
    if (t === 'The right triangle = Pythagoras') setShowTri(true);
    if (t === 'The midpoint') setShowMid(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction: dials ------------------------------------------------- */
  const setCoord = (key, v) => {
    if (key === 'x1') setX1(v);
    else if (key === 'y1') setY1(v);
    else if (key === 'x2') setX2(v);
    else setY2(v);
  };
  const onParam = (key, value) => setCoord(key, parseFloat(value));

  /* ---- interaction: dragging the endpoints -------------------------------- */
  // convert a pointer event to CSS-pixel coords within the stage
  const toCss = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { cx: e.clientX - rect.left, cy: e.clientY - rect.top, W: rect.width, H: rect.height };
  };
  const screenOf = (wx, wy, W, H) => ({
    X: ((wx - WORLD.xmin) / (WORLD.xmax - WORLD.xmin)) * W,
    Y: ((WORLD.ymax - wy) / (WORLD.ymax - WORLD.ymin)) * H,
  });
  const clamp = (v) => Math.min(7, Math.max(-7, v));
  const snap = (v) => Math.round(v / 0.5) * 0.5;

  const onPointerDown = (e) => {
    const { cx, cy, W, H } = toCss(e);
    const a = screenOf(x1, y1, W, H);
    const b = screenOf(x2, y2, W, H);
    const dA = Math.hypot(cx - a.X, cy - a.Y);
    const dB = Math.hypot(cx - b.X, cy - b.Y);
    const R = 18; // grab radius in px
    let pick = null;
    if (dA <= R && (dB > dA || !canDragB) && canDragA) pick = 'A';
    else if (dB <= R && canDragB) pick = 'B';
    else if (dA <= R && canDragA) pick = 'A';
    if (!pick) return;
    dragRef.current = pick;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.currentTarget.style.cursor = 'grabbing';
    e.preventDefault();
  };
  const onPointerMove = (e) => {
    const { cx, cy, W, H } = toCss(e);
    if (!dragRef.current) {
      // hover affordance: show a grab cursor over a draggable endpoint
      const a = screenOf(x1, y1, W, H);
      const b = screenOf(x2, y2, W, H);
      const overA = canDragA && Math.hypot(cx - a.X, cy - a.Y) <= 18;
      const overB = canDragB && Math.hypot(cx - b.X, cy - b.Y) <= 18;
      e.currentTarget.style.cursor = overA || overB ? 'grab' : 'default';
      return;
    }
    const wx = clamp(snap(WORLD.xmin + (cx / W) * (WORLD.xmax - WORLD.xmin)));
    const wy = clamp(snap(WORLD.ymax - (cy / H) * (WORLD.ymax - WORLD.ymin)));
    if (dragRef.current === 'A') {
      if (unlocked.x1) setX1(wx);
      if (unlocked.y1) setY1(wy);
    } else {
      if (unlocked.x2) setX2(wx);
      if (unlocked.y2) setY2(wy);
    }
  };
  const endDrag = (e) => {
    if (dragRef.current) {
      dragRef.current = null;
      if (e && e.currentTarget) e.currentTarget.style.cursor = 'default';
    }
  };

  const resetPoints = () => {
    setX1(START.x1);
    setY1(START.y1);
    setX2(START.x2);
    setY2(START.y2);
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

  return (
    <div className="dlab">
      <header className="head">
        <h1>Distance Between Two Points</h1>
        <p className="lede">
          Explore the distance formula{' '}
          <span className="mono">
            d&nbsp;=&nbsp;√((x₂&nbsp;−&nbsp;x₁)²&nbsp;+&nbsp;(y₂&nbsp;−&nbsp;y₁)²)
          </span>
          . Each dial unlocks with the lesson, so you meet one idea at a time — then discover that the
          formula is really the Pythagorean theorem on a right triangle, and calibrate your segment onto
          a mystery target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <DistanceEquation />
            </p>
            <p
              className="equation-sub mono"
              dangerouslySetInnerHTML={{ __html: substitutedForm(g) }}
            />
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            onPointerCancel={endDrag}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">drag point A or B to move it</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Point A</span>
              <span className="fact-v mono">{`(${trim(x1)}, ${trim(y1)})`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Point B</span>
              <span className="fact-v mono">{`(${trim(x2)}, ${trim(y2)})`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Run · Δx = x₂ − x₁</span>
              <span className="fact-v mono">{trim(g.dx)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Rise · Δy = y₂ − y₁</span>
              <span className="fact-v mono">{trim(g.dy)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Distance d</span>
              <span className="fact-v mono">{`√${trim(g.sum)} ${distStr(g.dist)}`}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Midpoint M</span>
              <span className="fact-v mono">{`(${trim(g.mx)}, ${trim(g.my)})`}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (showTri ? ' on' : '')}
              onClick={() => setShowTri((s) => !s)}
            >
              {showTri ? 'Triangle shown' : 'Show right triangle'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showMid ? ' on' : '')}
              onClick={() => setShowMid((s) => !s)}
            >
              {showMid ? 'Midpoint shown' : 'Show midpoint'}
            </button>
            <button type="button" className="btn ghost" onClick={resetPoints}>
              Reset points
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
              const isUnlocked = step >= d.unlock;
              const val = { x1, y1, x2, y2 }[d.key];
              return (
                <label className={'dial' + (isUnlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.label}</span>
                  <span className="drole">{isUnlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={d.step}
                    value={val}
                    disabled={!isUnlocked}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{isUnlocked ? trim(val) : '🔒'}</output>
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
                  <span className="mono target-hint">land both endpoints on ○</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setTarget(makeTarget(target))}
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
                  setShowTri(false);
                  setShowMid(false);
                  resetPoints();
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">d = √((x₂ − x₁)² + (y₂ − y₁)²)</span> &nbsp;·&nbsp; the distance formula
        — the Pythagorean theorem measured between two points, plotted live on a 20×20 quadrille window.
      </footer>

      <style jsx>{`
        .dlab {
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
          max-width: 68ch;
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
          font-size: 12.5px;
          margin: 0;
        }
        /* equation readout (kept generic across the lab family) */
        .eq {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 17px;
          font-weight: 600;
        }
        .eq-op {
          font-weight: 600;
          margin: 0 2px;
        }
        .eq sup {
          font-size: 0.68em;
        }
        .eq sub {
          font-size: 0.68em;
        }
        /* a proper radical: √ glyph plus an overbar across the radicand */
        .root {
          display: inline-flex;
          align-items: stretch;
        }
        .root-sign {
          font-size: 1.15em;
          line-height: 1;
          transform: translateY(-1px);
        }
        .root-body {
          border-top: 2px solid currentColor;
          padding: 3px 4px 0 3px;
          margin-left: 1px;
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
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
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
          grid-template-columns: 26px 1fr 48px;
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
          font-size: 18px;
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
        :global(.dlab) :focus-visible {
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
