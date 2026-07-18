'use client';

/* ============================================================================
   SystemsOfEquationsLab — an interactive "bench" for a SYSTEM of two linear
   equations in two variables,
        { y = m₁·x + b₁
        { y = m₂·x + b₂
   solved graphically.

   Built for MAIS (math AI system, www.mais.ac), K-12 (Algebra 1 · CCSS 8.EE.C.8
   and HSA-REI.C.6).
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions, and a
   capstone challenge with a live match meter.

   THE SIGNATURE CENTERPIECE is the INTERSECTION POINT — a system's analogue of
   the line's "slope triangle" or the equation's "balance scale". A single linear
   equation in x and y is a whole LINE of solutions; the system asks for the point
   that satisfies BOTH equations at once. Graphically that is exactly where the two
   lines CROSS. So the lab makes the whole idea visible:
        • a SOLUTION of the system = the point (x, y) on BOTH lines, and
        • the NUMBER of solutions = the number of crossing points:
            – different slopes → they cross ONCE            → one solution,
            – equal slopes, different intercepts → PARALLEL → no solution,
            – identical equations → the SAME line           → infinitely many.
   The crossing point is the star: it is drawn as a gold ringed dot with drop-lines
   reading off its (x, y). Because two different equations are two different objects,
   this lab uses a principled THREE-COLOR scheme (a deliberate, documented relaxation
   of the usual single-accent rule, exactly like the Comparing / Ratio / Rectangle
   labs): CARMINE = Line 1 / equation 1, BLUE = Line 2 / equation 2, GOLD = the
   solution point they share. Nothing else uses these colors.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/SystemsOfEquationsLab.jsx
     2. Import and render it:
          import SystemsOfEquationsLab from './SystemsOfEquationsLab';
          export default function Page() { return <SystemsOfEquationsLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (m₁,b₁,m₂,b₂, the trial
              point, lesson step).
     MODEL  — the math (each line, the exact rational intersection, the case) is
              pure; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Palette. Two equations are inherently two objects, so this lab uses three
   meaningful colors (see the header note). The equation head is a CHILD
   component, so its colors are inlined (styled-jsx only scopes a component's
   own JSX) so it renders identically in Next.js and any preview harness.
   ------------------------------------------------------------------------- */
const L1 = '#c81e4f'; // carmine — Line 1 / equation 1 (the primary accent)
const L2 = '#2469c9'; // blue    — Line 2 / equation 2
const SOL = '#c8881e'; // gold    — the solution point the two lines share
const SOL_RING = '#8a5c0d';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const OK = '#1f8a5b';
const PAPER = '#fbfbf8';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window & axes. A square window so x and y share one scale and
   a slope of 1 really looks like 45°. Grid every 1 unit, labels every 2.
   ------------------------------------------------------------------------- */
const WORLD = { xmin: -8, xmax: 8, ymin: -8, ymax: 8 };

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Each line contributes a slope and an intercept dial.
   Line 1's pair unlocks at step 1, Line 2's pair at step 2 — a line is one
   object, so its two dials unlock together as one concept. Intercepts are whole
   (step 1) and slopes step by 0.5, which keeps crossings readable.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'm1', label: 'm₁', min: -3, max: 3, step: 0.5, unlock: 1, line: 1, role: 'Line 1 · slope' },
  { key: 'b1', label: 'b₁', min: -6, max: 6, step: 1, unlock: 1, line: 1, role: 'Line 1 · y-intercept' },
  { key: 'm2', label: 'm₂', min: -3, max: 3, step: 0.5, unlock: 2, line: 2, role: 'Line 2 · slope' },
  { key: 'b2', label: 'b₂', min: -6, max: 6, step: 1, unlock: 2, line: 2, role: 'Line 2 · y-intercept' },
];
// Start with a clean "X": y = x + 1 and y = −x + 3 cross at (1, 2).
const START = { m1: 1, b1: 1, m2: -1, b2: 3 };

const SOLUTION_STEP = 3; // where the intersection point becomes the focus

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.  Each equation is a line y = m·x + b.
   ------------------------------------------------------------------------- */
const lineY = (x, m, b) => m * x + b;

/* Exact rational intersection & case classification. Inputs are discrete (b is
   an integer, m a multiple of 0.5), so scaling m by 2 makes every comparison an
   exact integer test — no floating-point "almost equal" guessing.
     type: 'unique' | 'parallel' | 'coincident'
     for 'unique', x and y are returned BOTH as exact reduced fractions and as
     floats (for drawing). */
function solveSystem(m1, b1, m2, b2) {
  const M1 = Math.round(m1 * 2);
  const M2 = Math.round(m2 * 2);
  const B1 = Math.round(b1);
  const B2 = Math.round(b2);
  if (M1 === M2) {
    return { type: B1 === B2 ? 'coincident' : 'parallel' };
  }
  // x* = (b2 − b1) / (m1 − m2) = 2(b2 − b1) / (M1 − M2)
  let [xN, xD] = reduceFrac(2 * (B2 - B1), M1 - M2);
  // y* = m1·x* + b1 = (M1·xN)/(2·xD) + b1 = (M1·xN + 2·b1·xD)/(2·xD)
  let [yN, yD] = reduceFrac(M1 * xN + 2 * B1 * xD, 2 * xD);
  return { type: 'unique', xN, xD, yN, yD, x: xN / xD, y: yN / yD };
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Capstone (a CONSTRUCTION / solve goal, not a curve match). A mystery
   system with a whole-number solution (x*, y*) is generated with both equations
   LOCKED; the student moves a candidate point with the x, y dials until it lands
   on the crossing — the point that satisfies both equations. Because the two
   lines use integer slopes and the solution is an integer lattice point, the
   x, y dials (step 1) can always hit it exactly. SOLVED fires on an exact hit;
   the meter rewards getting close.
   ------------------------------------------------------------------------- */
const matchPercent = (dist) => Math.max(0, Math.min(100, 100 / (1 + dist / 0.7)));
const SOLVE_EPS = 1e-9;

function makeTarget(prev) {
  let t;
  let guard = 0;
  do {
    const xs = Math.floor(Math.random() * 9) - 4; // −4 … 4  (the intended solution)
    const ys = Math.floor(Math.random() * 9) - 4;
    const m1 = Math.floor(Math.random() * 7) - 3; // −3 … 3  (integer slopes → integer b)
    let m2 = Math.floor(Math.random() * 7) - 3;
    if (m2 === m1) m2 = m1 + (m1 < 3 ? 1 : -1); // force different slopes → a unique solution
    const b1 = ys - m1 * xs;
    const b2 = ys - m2 * xs;
    t = { m1, b1, m2, b2, xs, ys };
  } while (
    ++guard < 500 &&
    (!(t.b1 >= -6 && t.b1 <= 6 && t.b2 >= -6 && t.b2 <= 6) || // keep intercepts on the dials
      (prev && t.m1 === prev.m1 && t.b1 === prev.b1 && t.m2 === prev.m2 && t.b2 === prev.b2))
  );
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dials unlock with the step; the reveal
   lives in `feedback` (shown after answering); distractors are real student
   misconceptions (a solution satisfies only one equation, the crossing is the
   highest point, equal slopes still cross). Next is gated on ANSWERED, not on
   CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the system',
    body:
      'A SYSTEM of equations is two equations solved together. Here: two lines. A SOLUTION is a ' +
      'point (x, y) that makes BOTH equations true at once — on the graph, exactly where the two ' +
      'lines meet.',
    q: 'What must a solution (x, y) of a system do?',
    choices: [
      'Make every equation in the system true at the same time',
      'Make just one of the two equations true',
      'Be the y-intercept of the first line',
    ],
    answer: 0,
    feedback:
      'A solution must satisfy ALL the equations at once. For two lines, only the crossing point ' +
      'lies on both — solving by graphing means finding that intersection.',
  },
  {
    title: 'Each equation is a whole line',
    body:
      'Line 1’s dials are live (carmine). Every point on this line makes equation 1 true — ' +
      'infinitely many. Most fail equation 2. Move Line 1 and watch the crossing point slide.',
    q: 'The carmine line shows all the points that satisfy equation 1. How many are there?',
    choices: ['Infinitely many — every point on the line', 'Exactly one', 'None until we add a second line'],
    answer: 0,
    feedback:
      'One linear equation in two variables has infinitely many solutions — the entire line. The ' +
      'system asks which of those points ALSO lies on the second line.',
  },
  {
    title: 'Add the second equation',
    body:
      'Line 2’s dials are live (blue). Two lines now share the plane. Slide Line 2 and watch where ' +
      'it cuts Line 1 — that shared point is what we hunt.',
    q: 'Two lines with different slopes — how many points lie on BOTH of them?',
    choices: ['Exactly one — the crossing point', 'Two points', 'Every point on Line 1'],
    answer: 0,
    feedback:
      'Different slopes meet at exactly one point. That single shared point is the one (x, y) ' +
      'satisfying both equations — the system’s solution.',
  },
  {
    title: 'The solution is where they cross',
    body:
      'The gold point is the solution. Read straight DOWN for x, straight ACROSS for y. It is the ' +
      'ONE point on the carmine line and the blue line at once — so it makes both equations true.',
    q: 'Why is the crossing point — and only the crossing point — the solution?',
    choices: [
      'It is the single point on both lines, so it satisfies both equations',
      'It is the highest point on the graph',
      'It is halfway between the two y-intercepts',
    ],
    answer: 0,
    feedback:
      'Being ON a line means satisfying its equation. The crossing point lies on both lines, so ' +
      'both equations hold — precisely what "solution of the system" means.',
  },
  {
    title: 'Check it in BOTH equations',
    body:
      'To be certain, substitute the point into each equation and confirm both come out true. ' +
      'Press “Show the check” to test the current solution in both equations.',
    q: 'How do you CHECK that a point (x, y) really solves a system?',
    choices: [
      'Substitute it into every equation; each one must be true',
      'Substitute it into the first equation only',
      'Make sure x equals y',
    ],
    answer: 0,
    feedback:
      'Substitute into each equation; every one must be true. A point that fits one equation but ' +
      'not the other is NOT a solution. Checking catches graph-reading slips instantly.',
  },
  {
    title: 'One, none, or infinitely many',
    body:
      'Not every system has one solution. Try “Match slopes” (m₂ = m₁). Different intercepts: ' +
      'PARALLEL lines, never meet — no solution. Same line twice: every point works — infinitely ' +
      'many. Different slopes always give exactly one.',
    q: 'Both slopes are 2, but b₁ = 1 and b₂ = 4. How many solutions does the system have?',
    choices: [
      'None — the lines are parallel and never cross',
      'Exactly one',
      'Infinitely many',
    ],
    answer: 0,
    feedback:
      'Equal slopes, different intercepts → parallel → NO solution (an "inconsistent" system). ' +
      'Matching intercepts too → the same line → infinitely many. Different slopes cross exactly ' +
      'once.',
  },
  {
    title: 'Solve-it challenge',
    body:
      'Final challenge. Both equations are locked. Move the gold point with the x and y dials onto ' +
      'the crossing — the point that satisfies BOTH equations. A check-mark lights per line; both ' +
      'lit means solved. “New system” deals a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−), trimmed decimals, exact
   reduced fractions for non-integer intersections.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function trim(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function reduceFrac(n, d) {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return [n / g, d / g];
}
function fmtFrac(n, d) {
  if (d === 1) return trim(n);
  return `${n < 0 ? MINUS : ''}${Math.abs(n)}/${d}`;
}
/* the solution as an ordered pair or a case word */
function solutionText(sys) {
  if (sys.type === 'parallel') return 'no solution';
  if (sys.type === 'coincident') return 'infinitely many';
  return `(${fmtFrac(sys.xN, sys.xD)}, ${fmtFrac(sys.yN, sys.yD)})`;
}
function relationshipText(sys) {
  if (sys.type === 'parallel') return 'parallel · never meet';
  if (sys.type === 'coincident') return 'same line · every point shared';
  return 'intersecting · cross once';
}

/* one equation as a string, careful with the signs of m = ±1, m = 0, b = 0 */
function lineEqStr(m, b) {
  if (Math.abs(m) < 1e-9) return `y = ${b === 0 ? '0' : trim(b)}`;
  const am = Math.abs(m);
  let mp;
  if (Math.abs(am - 1) < 1e-9) mp = (m < 0 ? MINUS : '') + 'x';
  else mp = trim(m) + 'x';
  let bp = '';
  if (b !== 0) bp = (b > 0 ? ' + ' : ' ' + MINUS + ' ') + trim(Math.abs(b));
  return `y = ${mp}${bp}`;
}

/* EDIT 5 — Equation display. The SYSTEM, braced, with equation 1 in carmine and
   equation 2 in blue, plus a solution chip in gold (hidden during the challenge
   so the answer is not spoiled). A CHILD component → inline styles. */
function SystemHead({ m1, b1, m2, b2, sys, showSolution }) {
  const rowStyle = {
    fontFamily: MONO,
    fontVariantNumeric: 'tabular-nums',
    fontSize: '19px',
    fontWeight: 700,
    lineHeight: 1.28,
    whiteSpace: 'nowrap',
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        {/* a crisp curly brace grouping the two equations */}
        <svg width="12" height="48" viewBox="0 0 12 48" aria-hidden="true" style={{ flex: '0 0 auto' }}>
          <path
            d="M10 2 C5 2 8.5 21 3 24 C8.5 27 5 46 10 46"
            fill="none"
            stroke={INK}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <span style={{ display: 'inline-flex', flexDirection: 'column' }}>
          <span style={{ ...rowStyle, color: L1 }}>{lineEqStr(m1, b1)}</span>
          <span style={{ ...rowStyle, color: L2 }}>{lineEqStr(m2, b2)}</span>
        </span>
      </span>
      {showSolution && (
        <span
          style={{
            fontFamily: MONO,
            fontSize: '12.5px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '999px',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            color: sys.type === 'unique' ? SOL_RING : INK_SOFT,
            background: sys.type === 'unique' ? 'rgba(200,136,30,0.16)' : 'rgba(28,43,58,0.06)',
            border: `1px solid ${sys.type === 'unique' ? 'rgba(200,136,30,0.5)' : 'rgba(28,43,58,0.18)'}`,
          }}
        >
          {sys.type === 'unique' ? 'solution ' : ''}
          {solutionText(sys)}
        </span>
      )}
    </span>
  );
}

/* spoken description for screen readers */
function spokenText(m1, b1, m2, b2, sys, calib) {
  const base =
    `System of two lines. Line 1, ${lineEqStr(m1, b1).replace(MINUS, 'negative ')}. ` +
    `Line 2, ${lineEqStr(m2, b2).replace(MINUS, 'negative ')}. `;
  if (calib) return base + 'Find the point that lies on both lines.';
  if (sys.type === 'parallel') return base + 'The lines are parallel, so there is no solution.';
  if (sys.type === 'coincident') return base + 'The lines are identical, so there are infinitely many solutions.';
  return base + `They cross at ${solutionText(sys)}, the one solution of the system.`;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function SystemsOfEquationsLab() {
  const [m1, setM1] = useState(START.m1);
  const [b1, setB1] = useState(START.b1);
  const [m2, setM2] = useState(START.m2);
  const [b2, setB2] = useState(START.b2);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [showCheck, setShowCheck] = useState(false);

  // the candidate point for the solve challenge (x, y dials)
  const [px, setPx] = useState(0);
  const [py, setPy] = useState(0);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // {x,y} world coords under the pointer, or null
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;

  const sys = solveSystem(m1, b1, m2, b2);

  // challenge readouts
  const onLine1 = target ? py === m1 * px + b1 : false;
  const onLine2 = target ? py === m2 * px + b2 : false;
  const dist = target ? Math.hypot(px - target.xs, py - target.ys) : Infinity;
  const pct = target ? matchPercent(dist) : 0;
  const solved = target ? dist < SOLVE_EPS : false;

  // Snapshot everything the renderer reads so draw() (a stable callback) and the
  // pointer handler never see stale values.
  sceneRef.current = {
    m1, b1, m2, b2, sys, calib, px, py,
    showSolutionDot: !calib || solved,
    showPoint: calib,
    solved,
  };

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
    ctx.clearRect(0, 0, W, H);

    const sx = (x) => ((x - WORLD.xmin) / (WORLD.xmax - WORLD.xmin)) * W;
    const sy = (y) => ((WORLD.ymax - y) / (WORLD.ymax - WORLD.ymin)) * H;

    const S = sceneRef.current;

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
    ctx.font = `11px ${MONO}`;
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

    /* a plotter for a full line, one sample per pixel, path broken where it
       leaves the window (a steep line correctly exits the top/bottom) */
    const plotLine = (m, b, stroke, width, dash) => {
      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.setLineDash(dash || []);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      let pen = false;
      for (let pxl = 0; pxl <= W; pxl++) {
        const x = WORLD.xmin + (pxl / W) * (WORLD.xmax - WORLD.xmin);
        const y = lineY(x, m, b);
        if (!isFinite(y) || y < WORLD.ymin - 1.5 || y > WORLD.ymax + 1.5) {
          pen = false;
          continue;
        }
        const X = sx(x);
        const Y = sy(y);
        if (!pen) {
          ctx.moveTo(X, Y);
          pen = true;
        } else ctx.lineTo(X, Y);
      }
      ctx.stroke();
      ctx.restore();
    };

    /* the two lines. For a coincident system, Line 1 is drawn solid and Line 2
       dashed on top, so the overlap reads as a two-color candy-cane = same line. */
    if (S.sys.type === 'coincident') {
      plotLine(S.m1, S.b1, L1, 3);
      plotLine(S.m2, S.b2, L2, 2.4, [9, 8]);
    } else {
      plotLine(S.m2, S.b2, L2, 2.75); // blue under
      plotLine(S.m1, S.b1, L1, 2.75); // carmine on top
    }

    /* a small y-intercept dot for each line (skipped in the challenge to keep
       the field clean for the point hunt) */
    if (!S.calib) {
      const dot = (m, b, color) => {
        if (b < WORLD.ymin || b > WORLD.ymax) return;
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx(0), sy(b), 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      dot(S.m1, S.b1, L1);
      dot(S.m2, S.b2, L2);
    }

    /* -------- the CENTERPIECE: the intersection point = the solution -------- */
    if (S.sys.type === 'unique' && S.showSolutionDot) {
      const X = sx(S.sys.x);
      const Y = sy(S.sys.y);
      const inWindow =
        S.sys.x >= WORLD.xmin && S.sys.x <= WORLD.xmax && S.sys.y >= WORLD.ymin && S.sys.y <= WORLD.ymax;
      if (inWindow) {
        // drop-lines down to the x-axis and across to the y-axis
        ctx.save();
        ctx.strokeStyle = 'rgba(200,136,30,0.6)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(X, Y);
        ctx.lineTo(X, sy(0));
        ctx.moveTo(X, Y);
        ctx.lineTo(sx(0), Y);
        ctx.stroke();
        ctx.setLineDash([]);
        // little square ticks on each axis at x* and y*
        ctx.fillStyle = SOL_RING;
        ctx.fillRect(X - 2, sy(0) - 2, 4, 4);
        ctx.fillRect(sx(0) - 2, Y - 2, 4, 4);
        ctx.restore();

        // the gold ringed dot: white halo, gold fill, dark ring
        ctx.save();
        ctx.beginPath();
        ctx.arc(X, Y, 8.5, 0, Math.PI * 2);
        ctx.fillStyle = PAPER;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(X, Y, 6, 0, Math.PI * 2);
        ctx.fillStyle = SOL;
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = SOL_RING;
        ctx.stroke();
        ctx.restore();

        // coordinate label, nudged to a clear quadrant
        const label = `(${fmtFrac(S.sys.xN, S.sys.xD)}, ${fmtFrac(S.sys.yN, S.sys.yD)})`;
        ctx.font = `700 12.5px ${MONO}`;
        const tw = ctx.measureText(label).width;
        let lx = X + 12;
        let ly = Y - 22;
        if (lx + tw + 6 > W) lx = X - tw - 12;
        if (ly < 2) ly = Y + 10;
        ctx.fillStyle = 'rgba(251,251,248,0.92)';
        ctx.fillRect(lx - 4, ly - 2, tw + 8, 18);
        ctx.strokeStyle = 'rgba(200,136,30,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(lx - 3.5, ly - 1.5, tw + 7, 17);
        ctx.fillStyle = SOL_RING;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(label, lx, ly);
      }
    }

    /* a canvas badge for the no-solution / infinite cases (relationship at a glance) */
    if (!S.calib && S.sys.type !== 'unique') {
      const msg = S.sys.type === 'parallel' ? 'no solution — parallel lines' : 'infinitely many — same line';
      ctx.font = `600 12.5px ${MONO}`;
      const tw = ctx.measureText(msg).width;
      const bx = W / 2 - tw / 2;
      const by = 12;
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(bx - 8, by, tw + 16, 22);
      ctx.strokeStyle = S.sys.type === 'parallel' ? 'rgba(91,107,123,0.55)' : 'rgba(200,136,30,0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 7.5, by + 0.5, tw + 15, 21);
      ctx.fillStyle = S.sys.type === 'parallel' ? INK_SOFT : SOL_RING;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(msg, W / 2, by + 11);
    }

    /* -------- the challenge candidate point (gold crosshair) -------- */
    if (S.showPoint) {
      const X = sx(S.px);
      const Y = sy(S.py);
      ctx.save();
      // drop-lines showing the ordered pair being tested
      ctx.strokeStyle = 'rgba(200,136,30,0.55)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(X, Y);
      ctx.lineTo(X, sy(0));
      ctx.moveTo(X, Y);
      ctx.lineTo(sx(0), Y);
      ctx.stroke();
      ctx.setLineDash([]);
      // crosshair + dot; turns solid gold-ringed when it solves the system
      const r = 6;
      ctx.strokeStyle = SOL_RING;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(X - r - 4, Y);
      ctx.lineTo(X + r + 4, Y);
      ctx.moveTo(X, Y - r - 4);
      ctx.lineTo(X, Y + r + 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(X, Y, r, 0, Math.PI * 2);
      ctx.fillStyle = S.solved ? SOL : 'rgba(200,136,30,0.25)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = SOL_RING;
      ctx.stroke();
      // label
      const label = `(${trim(S.px)}, ${trim(S.py)})`;
      ctx.font = `700 12.5px ${MONO}`;
      const tw = ctx.measureText(label).width;
      let lx = X + 12;
      let ly = Y - 22;
      if (lx + tw + 6 > W) lx = X - tw - 12;
      if (ly < 2) ly = Y + 10;
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(lx - 4, ly - 2, tw + 8, 18);
      ctx.fillStyle = SOL_RING;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(label, lx, ly);
      ctx.restore();
    }

    /* hover readout (lesson only): a crosshair + coordinates under the pointer */
    const hv = hoverRef.current;
    if (hv && !S.calib) {
      const X = sx(hv.x);
      const Y = sy(hv.y);
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.28)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(X, sy(0));
      ctx.lineTo(X, Y);
      ctx.moveTo(sx(0), Y);
      ctx.lineTo(X, Y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(28,43,58,0.5)';
      ctx.beginPath();
      ctx.arc(X, Y, 3, 0, Math.PI * 2);
      ctx.fill();
      const txt = `(${hv.x.toFixed(1)}, ${hv.y.toFixed(1)})`;
      ctx.font = `12px ${MONO}`;
      const tw = ctx.measureText(txt).width;
      const bx = Math.min(Math.max(X + 8, 4), W - tw - 12);
      const by = Math.max(Y - 26, 4);
      ctx.fillStyle = 'rgba(251,251,248,0.9)';
      ctx.fillRect(bx - 4, by - 2, tw + 8, 18);
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(txt, bx, by);
      ctx.restore();
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [m1, b1, m2, b2, step, target, px, py, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a fresh system to the challenge the first time we reach it */
  useEffect(() => {
    if (current.calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* load the target's system into the (now locked) dials and place the candidate
     point somewhere OFF the solution so the hunt is real */
  useEffect(() => {
    if (calib && target) {
      setM1(target.m1);
      setB1(target.b1);
      setM2(target.m2);
      setB2(target.b2);
      const startPt = target.xs === 0 && target.ys === 0 ? { x: 2, y: 2 } : { x: 0, y: 0 };
      setPx(startPt.x);
      setPy(startPt.y);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, calib]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 'm1') setM1(v);
    else if (key === 'b1') setB1(v);
    else if (key === 'm2') setM2(v);
    else if (key === 'b2') setB2(v);
    else if (key === 'px') setPx(v);
    else if (key === 'py') setPy(v);
  };

  const onPointerMove = (e) => {
    if (calib) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    hoverRef.current = {
      x: WORLD.xmin + (cssX / rect.width) * (WORLD.xmax - WORLD.xmin),
      y: WORLD.ymax - (cssY / rect.height) * (WORLD.ymax - WORLD.ymin),
    };
    draw();
  };
  const onPointerLeave = () => {
    hoverRef.current = null;
    draw();
  };

  const matchSlopes = () => setM2(m1); // demo the parallel / coincident cases
  const showMe = () => {
    if (target) {
      setPx(target.xs);
      setPy(target.ys);
    }
  };
  const resetDials = () => {
    setM1(START.m1);
    setB1(START.b1);
    setM2(START.m2);
    setB2(START.b2);
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

  const spoken = spokenText(m1, b1, m2, b2, sys, calib);

  // point dials for the challenge
  const POINT_DIALS = [
    { key: 'px', label: 'x', role: 'candidate point · x-coordinate', val: px },
    { key: 'py', label: 'y', role: 'candidate point · y-coordinate', val: py },
  ];

  return (
    <div className="syslab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Systems of Linear Equations</h1>
        <p className="lede">
          Two equations, one shared answer. A{' '}
          <span className="mono">
            system{' '}
            <span style={{ color: L1 }}>{'{ y = m₁x + b₁'}</span>{' '}
            <span style={{ color: L2 }}>{'{ y = m₂x + b₂'}</span>
          </span>{' '}
          is solved by the point that lies on <em>both</em> lines — their{' '}
          <span style={{ color: SOL_RING, fontWeight: 700 }}>intersection</span>. Move the lines and watch
          the solution appear, vanish (parallel), or fill the whole line (coincident).
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <SystemHead m1={m1} b1={b1} m2={m2} b2={b2} sys={sys} showSolution={!calib} />
            </p>
            <p className="equation-sub mono">
              {calib ? 'find the point on both lines' : relationshipText(sys)}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {calib ? 'move the gold point onto the crossing' : 'hover to read any point'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && solved ? ' Solved — the point lies on both lines.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k" style={{ color: L1 }}>
                Line 1
              </span>
              <span className="fact-v mono">{lineEqStr(m1, b1)}</span>
            </div>
            <div className="fact">
              <span className="fact-k" style={{ color: L2 }}>
                Line 2
              </span>
              <span className="fact-v mono">{lineEqStr(m2, b2)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Relationship</span>
              <span className="fact-v">{relationshipText(sys)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Solution (x, y)</span>
              <span
                className="fact-v mono"
                style={{ color: sys.type === 'unique' ? SOL_RING : INK_SOFT, fontWeight: 700 }}
              >
                {calib && !solved ? '?' : solutionText(sys)}
              </span>
            </div>
          </div>

          {showCheck && !calib && (
            <div className="checkbox">
              <p className="check-title">Substitute the solution into both equations</p>
              {sys.type === 'unique' ? (
                <ol>
                  {[
                    { m: m1, b: b1, color: L1, n: 1 },
                    { m: m2, b: b2, color: L2, n: 2 },
                  ].map((e) => {
                    const xStr = fmtFrac(sys.xN, sys.xD);
                    const yStr = fmtFrac(sys.yN, sys.yD);
                    // build "m·x + b" with the solution's x substituted
                    let rhs;
                    if (Math.abs(e.m) < 1e-9) rhs = trim(e.b);
                    else {
                      const mPart =
                        Math.abs(Math.abs(e.m) - 1) < 1e-9 ? (e.m < 0 ? MINUS : '') + xStr : `${trim(e.m)}·${xStr}`;
                      const bPart = e.b === 0 ? '' : (e.b > 0 ? ' + ' : ' ' + MINUS + ' ') + trim(Math.abs(e.b));
                      rhs = `${mPart}${bPart}`;
                    }
                    return (
                      <li key={e.n} className="check-line">
                        <span className="check-eq mono">
                          <span style={{ color: e.color, fontWeight: 700 }}>Eq {e.n}</span>
                          {'  '}
                          {yStr} = {rhs} = {yStr}
                        </span>
                        <span className="check-ok">✓ true</span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="check-note">
                  {sys.type === 'parallel'
                    ? 'The lines are parallel (equal slopes, different intercepts): there is no point on both, so the system has no solution.'
                    : 'Both equations describe the same line: every point on it satisfies both, so the system has infinitely many solutions.'}
                </p>
              )}
            </div>
          )}

          <div className="toolbar">
            {calib ? (
              <button type="button" className="btn ghost" onClick={showMe}>
                Show me the solution
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={'btn ghost' + (showCheck ? ' on' : '')}
                  onClick={() => setShowCheck((v) => !v)}
                  aria-pressed={showCheck}
                >
                  {showCheck ? 'Hide the check' : 'Show the check'}
                </button>
                <button type="button" className="btn ghost" onClick={matchSlopes} disabled={step < 2}>
                  Match slopes
                </button>
                <button type="button" className="btn ghost" onClick={resetDials}>
                  Reset dials
                </button>
              </>
            )}
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

          {/* DIALS — the four line dials during the lesson, the two point dials
              during the challenge */}
          {!calib ? (
            <div className="dials">
              {PARAMS.map((d) => {
                const unlocked = step >= d.unlock;
                const val = { m1, b1, m2, b2 }[d.key];
                const color = d.line === 1 ? L1 : L2;
                return (
                  <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                    <span className="dk" style={{ color }}>
                      {d.label}
                    </span>
                    <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                    <input
                      type="range"
                      min={d.min}
                      max={d.max}
                      step={d.step}
                      value={val}
                      disabled={!unlocked}
                      aria-label={`Dial ${d.label} — ${d.role}`}
                      style={{ accentColor: color }}
                      onChange={(e) => onParam(d.key, e.target.value)}
                    />
                    <output className="dv">{unlocked ? trim(val) : '🔒'}</output>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="dials">
              {POINT_DIALS.map((d) => (
                <label className="dial" key={d.key}>
                  <span className="dk" style={{ color: SOL_RING }}>
                    {d.label}
                  </span>
                  <span className="drole">{d.role}</span>
                  <input
                    type="range"
                    min={WORLD.xmin}
                    max={WORLD.xmax}
                    step={1}
                    value={d.val}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    style={{ accentColor: SOL }}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{trim(d.val)}</output>
                </label>
              ))}
            </div>
          )}

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
              <div className="line-checks">
                <span className={'lc' + (onLine1 ? ' hit' : '')} style={onLine1 ? { color: L1 } : undefined}>
                  <span className="lc-mark">{onLine1 ? '✓' : '○'}</span> on Line 1
                </span>
                <span className={'lc' + (onLine2 ? ' hit' : '')} style={onLine2 ? { color: L2 } : undefined}>
                  <span className="lc-mark">{onLine2 ? '✓' : '○'}</span> on Line 2
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {solved ? (
                  <span className="stamp">SOLVED</span>
                ) : (
                  <span className="mono target-hint">
                    {(() => {
                      const parts = [];
                      if (px < target.xs) parts.push('right');
                      else if (px > target.xs) parts.push('left');
                      if (py < target.ys) parts.push('up');
                      else if (py > target.ys) parts.push('down');
                      return parts.length ? 'move ' + parts.join(' & ') : '';
                    })()}
                  </span>
                )}
              </div>
              {solved && (
                <p className="factnote">
                  ({target.xs}, {target.ys}) lies on both lines, so it is the one solution of the system.
                </p>
              )}
              <button type="button" className="btn ghost" onClick={() => setTarget(makeTarget(target))}>
                New system
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
                  setShowCheck(false);
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
        <span className="mono">{'{ y = m₁x + b₁ ,  y = m₂x + b₂ }'}</span> &nbsp;·&nbsp; a system of two
        linear equations, solved by graphing: the solution is the point on both lines — one, none
        (parallel), or infinitely many (same line).
      </footer>

      <style jsx>{`
        .syslab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --l1: #c81e4f;
          --l2: #2469c9;
          --sol: #c8881e;
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
          max-width: 72ch;
        }
        .lede em {
          font-style: italic;
          color: var(--ink);
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 344px;
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
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .equation {
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 4px 0 0;
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
        .checkbox {
          margin: 14px 4px 2px;
          padding: 12px 14px;
          background: rgba(28, 43, 58, 0.025);
          border: 1px solid rgba(28, 43, 58, 0.08);
          border-radius: 8px;
        }
        .check-title {
          margin: 0 0 8px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .checkbox ol {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 6px;
        }
        .check-line {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
        }
        .check-eq {
          font-size: 14.5px;
          font-variant-numeric: tabular-nums;
          color: var(--ink);
        }
        .check-ok {
          font-size: 12.5px;
          color: var(--ok);
          font-weight: 700;
        }
        .check-note {
          margin: 0;
          font-size: 13px;
          color: var(--ink);
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
          background: var(--sol);
          border-color: var(--sol);
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
          background: var(--l1);
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
          border-left: 3px solid var(--l1);
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
        .line-checks {
          display: flex;
          gap: 16px;
          font-size: 13px;
          color: var(--ink-soft);
          font-weight: 600;
        }
        .lc-mark {
          font-family: var(--mono);
        }
        .lc.hit {
          font-weight: 700;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 136, 30, 0.55), var(--sol));
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
        .factnote {
          margin: 0;
          font-size: 12.5px;
          color: var(--ink);
          background: rgba(31, 138, 91, 0.08);
          border-left: 3px solid var(--ok);
          padding: 9px 11px;
          border-radius: 0 6px 6px 0;
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
        :global(.syslab) :focus-visible {
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
