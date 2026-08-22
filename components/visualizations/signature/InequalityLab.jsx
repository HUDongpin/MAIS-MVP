'use client';

/* ============================================================================
   InequalityLab — an interactive "bench" for the one-variable linear
        inequality,  a·x + b  {<, ≤, >, ≥}  c.

   Built for MAIS (math AI system, www.mais.ac), K-12 (CCSS 6.EE.B.5/8,
   7.EE.B.4b, HS A-REI.B.3).  House style: the interactive-math-bench standard —
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a capstone challenge with a
   live match meter stamped SOLVED on success.

   WHY A NEW LAB (and not just Equation with a different sign):
   An equation has ONE solution; an inequality has a whole SET. That single
   difference drives everything here, so the lab is built around it. The
   signature centerpiece is TWO LINKED NUMBER LINES on one shared scale:

     • TOP — the SOLUTION LINE (the hero).  The answer to an inequality is a
       RAY, not a dot: a boundary point (OPEN ○ for a strict < >, CLOSED ● for
       ≤ ≥) and a shaded ray in the true direction.  A draggable TEST DOT glows
       green everywhere the statement is true, making "a whole set of answers"
       something you can sweep with your finger.

     • BOTTOM — the COMPARISON LINE (the why).  It shows the two sides as points:
       the moving value a·x + b (carmine) and the fixed number c (blue), with
       the operator and a live TRUE/FALSE verdict.  A connector drops from the
       test dot to the a·x + b point, drawing the map x ↦ a·x + b.

   THE SIGNATURE IDEA — why the sign flips.  When a is NEGATIVE, dragging the
   test dot to the RIGHT sends a·x + b to the LEFT on the comparison line: the
   map reverses order.  That reversal — visible, not asserted — is exactly why
   dividing both sides by a negative flips < into >.  The most-forgotten rule in
   all of algebra becomes something you watch happen.

   The one accent (carmine) is the INEQUALITY and its SOLUTION RAY — the boundary
   circle, the shaded ray, the a·x + b point, the sign, the readout.  Green marks
   a TRUE/satisfied state; blue is the fixed known c; slate is the neutral line.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/InequalityLab.jsx
     2. Import and render it:
          import InequalityLab from './InequalityLab';
          export default function Page() { return <InequalityLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, c, op, test x,
              step, and the calibration graph the student constructs).
     MODEL  — the math (left side, truth, boundary, solved direction) is pure;
              it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change; DPI-aware,
              one path per pixel, native form controls.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Palette — shared between the canvas and the inline-styled equation head (a
   child component; styled-jsx only scopes a component's OWN JSX, so the head is
   styled inline to render identically in Next.js and any preview harness).
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the one accent — the inequality & its solution ray
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const OK = '#1f8a5b'; // TRUE / satisfied
const BLUE = '#3f74a6'; // the fixed known right side, c
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window.  A symmetric integer number line, shared by both the
   solution line and the comparison line so the connector x ↦ a·x+b is honest.
   ------------------------------------------------------------------------- */
const VMIN = -10;
const VMAX = 10;

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  a, b, c, op define a·x + b OP c; the trial x is the
   draggable test point.  One control unlocks per step (unlock = step index):
     x  — always live (the probe that reveals the solution set)
     op — the sign; a 4-way segmented control, not a slider
     b, c — the constant and the right side
     a  — the coefficient; the ONLY one allowed negative, because a<0 is the flip
   Ranges keep b, c small so both sides stay near the visible window; a excludes
   0 (a·x+b with a=0 no longer involves x).
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'x', label: 'x', min: -9, max: 9, step: 0.5, unlock: 0, star: true, role: 'the test point · drag it' },
  { key: 'b', label: 'b', min: 0, max: 6, step: 1, unlock: 4, role: 'the constant added to a·x' },
  { key: 'c', label: 'c', min: -6, max: 10, step: 1, unlock: 4, role: 'the right side' },
  { key: 'a', label: 'a', min: -4, max: 4, step: 1, unlock: 5, role: 'how many x — negative flips the sign' },
];
const START = { a: 1, b: 2, c: 6, op: '<', x: 1 }; // x + 2 < 6  →  x < 4  (open ○ at 4, shade left)

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Pure math, no pixels.
   ------------------------------------------------------------------------- */
const OPS = ['<', '≤', '>', '≥'];
const isStrict = (op) => op === '<' || op === '>'; // strict → open circle
const isLess = (op) => op === '<' || op === '≤'; // "less" → ray points LEFT
const flipOp = (op) => ({ '<': '>', '>': '<', '≤': '≥', '≥': '≤' }[op]);

const leftSide = (x, p) => p.a * x + p.b; // the value of a·x + b
const truth = (x, p) => {
  const L = leftSide(x, p);
  const R = p.c;
  if (p.op === '<') return L < R;
  if (p.op === '≤') return L <= R;
  if (p.op === '>') return L > R;
  return L >= R; // '≥'
};
const boundaryValue = (p) => (p.c - p.b) / p.a; // a ≠ 0 always → never divide by zero
/* The operator that ends up on x after dividing both sides by a: dividing by a
   NEGATIVE reverses the order, so the sign flips.  Division never changes
   strictness, so ≤/≥ stay closed and </> stay open. */
const solvedOp = (p) => (p.a < 0 ? flipOp(p.op) : p.op);

/* ---------------------------------------------------------------------------
   Formatting — a real minus sign (−), trimmed decimals, exact reduced fractions
   for boundaries that are not whole numbers.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function fmtNum(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function fmtBoundary(p) {
  // (c − b) / a, reduced, denominator forced positive
  let num = p.c - p.b;
  let den = p.a;
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  num /= g;
  den /= g;
  if (den === 1) return fmtNum(num);
  return `${num < 0 ? MINUS : ''}${Math.abs(num)}/${den}`;
}
/* the a·x coefficient as it should read: '', '−', or 'a' / '−a' */
function coefStr(a) {
  if (a === 1) return '';
  if (a === -1) return MINUS;
  return fmtNum(a);
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; a control unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   student misconceptions (forget the flip, include the boundary of a strict
   inequality, treat it like an equation).  Next is gated on ANSWERED, not on
   CORRECT.  The ramp: one statement → many answers → the ray & open/closed →
   the flip → check → graph-a-mystery.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the inequality',
    body:
      'An equation says two sides are EQUAL. An inequality says one side is LESS or GREATER: ' +
      'x + 2 < 6 claims the left side is smaller than 6. The lower line shows both sides as points — ' +
      'left side carmine, 6 blue — the sign points at the smaller. Drag the test dot to see which ' +
      'side is bigger.',
    q: 'What does x + 2 < 6 claim?',
    choices: [
      'The left side, x + 2, is less than 6',
      'x is exactly equal to 6',
      'The left side is greater than 6',
    ],
    answer: 0,
    feedback:
      '“<” says the left side is strictly LESS. Unlike “=”, it does not pin x to one number — ' +
      'many different x land the left side below 6.',
  },
  {
    title: 'A whole set of answers',
    body:
      'The equation x + 2 = 6 has exactly ONE solution, x = 4. An inequality has a whole SET — ' +
      'every x that makes it true. Drag the test dot: it glows green wherever the inequality ' +
      'holds, across a whole stretch of the line, not at a single point.',
    q: 'How many values of x make x + 2 < 6 true?',
    choices: [
      'Infinitely many — every x below 4',
      'Exactly one, x = 4',
      'Exactly two',
    ],
    answer: 0,
    feedback:
      'Every x less than 4 works: 3, 0, −1, 3.999 … an endless SOLUTION SET, pictured as a ' +
      'shaded RAY, not a dot.',
  },
  {
    title: 'The boundary and the ray',
    body:
      'The one point where the two sides are EQUAL — here x = 4 — is the BOUNDARY: true on one side, ' +
      'false on the other. For a STRICT sign (< or >) the boundary itself is NOT a solution, so it is ' +
      'drawn as an OPEN circle ○, and the ray shades the true side.',
    q: 'In x + 2 < 6 (boundary at 4), is x = 4 itself a solution?',
    choices: [
      'No — 4 + 2 = 6 is not less than 6, so the circle is open ○',
      'Yes — the boundary always counts',
      'Only when x is positive',
    ],
    answer: 0,
    feedback:
      'At x = 4 the sides are EQUAL, and “<” needs strictly less, so 4 is excluded — an OPEN circle. ' +
      'The ray shades every x below 4.',
  },
  {
    title: 'Closed or open',
    body:
      'Switch the sign to ≤ or ≥. These allow EQUAL, so the boundary IS included — a CLOSED circle ●. ' +
      'The ray’s DIRECTION follows the sign: “less than” shades LEFT, “greater than” shades RIGHT.',
    q: 'How does x + 2 ≤ 6 differ from x + 2 < 6?',
    choices: [
      '≤ includes x = 4 (closed ●); < excludes it (open ○)',
      'They are exactly the same inequality',
      '≤ shades the opposite direction',
    ],
    answer: 0,
    feedback:
      'Same boundary, same left ray — only the endpoint changes. ≤ fills it in, because ' +
      '4 + 2 = 6 is “≤ 6”; “<” leaves it open.',
  },
  {
    title: 'Solve it like an equation',
    body:
      'To FIND the boundary, solve like an equation — the same move on BOTH sides: subtract b, then ' +
      'divide by a. As long as a is POSITIVE, the sign never moves. Try the b and c dials and read ' +
      'the worked steps.',
    q: 'Solve x + 5 < 12. What is the solution?',
    choices: [
      'x < 7 — subtract 5 from both sides',
      'x < 17 — add 5 instead',
      'x < 60 — multiply by 5',
    ],
    answer: 0,
    feedback:
      'Subtract 5 from both sides: x < 7. Positive moves keep “<” pointing the same way. ' +
      'Boundary 7, open circle, shade left.',
  },
  {
    title: 'The flip',
    body:
      'The one rule that makes inequalities different: multiplying or dividing both sides by a ' +
      'NEGATIVE number REVERSES the sign. Set a below zero and drag the test dot RIGHT: on the lower ' +
      'line, a·x + b slides the OTHER way. That reversal of order forces the flip.',
    q: 'Solve −2x < 6. What is the solution?',
    choices: [
      'x > −3 — divide by −2 and FLIP the sign',
      'x < −3 — divide by −2, keep the sign',
      'x < 3 — the negative cancels',
    ],
    answer: 0,
    feedback:
      'Divide both sides by −2 AND flip: x > −3. Forgetting the flip is the most common inequality ' +
      'mistake — dividing by a negative reflects both sides across zero, reversing their order.',
  },
  {
    title: 'Check a point',
    body:
      'Always CHECK. Any x inside the shaded ray must make the statement true; any x outside must ' +
      'make it false. Zero is usually the easiest point to test.',
    q: 'You solved −2x < 6 as x > −3. Test x = 0: is it a solution?',
    choices: [
      'Yes — −2·0 = 0 < 6 is true, and 0 > −3 ✓',
      'No, 0 is never a solution',
      'Not without a calculator',
    ],
    answer: 0,
    feedback:
      'x = 0 gives 0 < 6, true — and 0 sits inside x > −3. One easy test point confirms the flip ' +
      'went the right way.',
  },
  {
    title: 'Graph-it challenge',
    body:
      'Final challenge: a mystery inequality, sign locked. SOLVE it, then GRAPH it — drag the endpoint ' +
      'onto the boundary, choose OPEN ○ or CLOSED ●, and point the ray the right way. A negative a ' +
      'flips the sign! SOLVED lights when your graph is exact.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 6 — Capstone (a CONSTRUCTION / graphing goal).  A mystery inequality is
   generated with a whole-number boundary in [−5, 5]; the student reconstructs
   its SOLUTION GRAPH (endpoint position, open/closed, ray direction).  About
   half the targets have a < 0 so the flip skill is genuinely exercised.  SOLVED
   fires only when the endpoint is exact AND the inclusivity AND the direction
   are correct; the meter rewards getting close but caps hard on a wrong
   direction (the flip) or wrong endpoint style.
   ------------------------------------------------------------------------- */
const matchPercent = (dist) => 100 / (1 + dist / 0.8); // dist = |endpoint − boundary|
const SOLVE_EPS = 1e-6;

function makeTarget(prev) {
  let t;
  let guard = 0;
  do {
    const aMag = 1 + Math.floor(Math.random() * 3); // 1 … 3
    const a = Math.random() < 0.5 ? -aMag : aMag; // ~half negative → exercises the flip
    const boundary = Math.floor(Math.random() * 11) - 5; // −5 … 5, integer → reachable on the 0.5 grid
    const op = OPS[Math.floor(Math.random() * 4)];
    const b = Math.floor(Math.random() * 6); // 0 … 5
    const c = a * boundary + b; // so (c − b)/a = boundary exactly
    t = { a, b, c, op, boundary };
    if (++guard > 10000) break;
  } while (
    !(t.c >= -14 && t.c <= 14) || // keep the printed numbers reasonable
    (prev && t.a === prev.a && t.b === prev.b && t.c === prev.c && t.op === prev.op) ||
    (t.a === START.a && t.b === START.b && t.c === START.c && t.op === START.op)
  );
  return t;
}

/* EDIT 5 — Equation display.  a·x + b OP c with the unknown x and the sign in
   carmine, plus a solution chip (hidden during the challenge so it is not
   spoiled).  Inline styles because this is a CHILD component. */
const CHIP = {
  fontFamily: MONO,
  fontSize: '12.5px',
  fontWeight: 700,
  padding: '3px 9px',
  borderRadius: '999px',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};
function InequalityHead({ p, showSolution, solStr }) {
  const coef = coefStr(p.a);
  const bPart = p.b !== 0 ? ` + ${p.b}` : '';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <span
        style={{
          fontFamily: MONO,
          fontVariantNumeric: 'tabular-nums',
          fontSize: '26px',
          fontWeight: 700,
          color: INK,
          letterSpacing: '0.01em',
        }}
      >
        {coef}
        <span style={{ color: CARMINE }}>x</span>
        {bPart} <span style={{ color: CARMINE, fontSize: '28px' }}>{p.op}</span> {fmtNum(p.c)}
      </span>
      {showSolution && (
        <span style={{ ...CHIP, color: CARMINE, background: 'rgba(200,30,79,0.1)' }}>
          x&nbsp;{solStr}
        </span>
      )}
    </span>
  );
}

/* The live worked solution — the inverse-operation method generated from the
   current a, b, c, op.  The number of lines depends on the inequality: no + b
   means no subtract line; a coefficient of 1 means no divide line; a < 0 marks
   the FLIP. */
function solveSteps(p) {
  const coef = coefStr(p.a);
  const out = [
    { lhs: `${coef}x${p.b !== 0 ? ` + ${p.b}` : ''}`, op: p.op, rhs: fmtNum(p.c), note: 'the inequality', flip: false },
  ];
  let curOp = p.op;
  if (p.b !== 0) {
    out.push({ lhs: `${coef}x`, op: curOp, rhs: fmtNum(p.c - p.b), note: `subtract ${p.b} from both sides`, flip: false });
  }
  if (p.a !== 1) {
    const willFlip = p.a < 0;
    curOp = willFlip ? flipOp(p.op) : p.op;
    out.push({
      lhs: 'x',
      op: curOp,
      rhs: fmtBoundary(p),
      note: willFlip ? `divide by ${fmtNum(p.a)} — FLIP the sign` : `divide both sides by ${p.a}`,
      flip: willFlip,
    });
  }
  if (p.a === 1 && p.b === 0) {
    out[0] = { lhs: 'x', op: p.op, rhs: fmtNum(p.c), note: 'already solved for x', flip: false };
  }
  return out;
}
/* Colour every 'x' inside a step's left side carmine (the one-accent rule). */
function Xhl({ text }) {
  const parts = String(text).split('x');
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 ? <span className="xac">x</span> : null}
    </span>
  ));
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function InequalityLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [c, setC] = useState(START.c);
  const [op, setOp] = useState(START.op);
  const [x, setX] = useState(START.x); // the test point (and, in calib, the endpoint handle)
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [showSteps, setShowSteps] = useState(true);

  // calibration graph the student constructs
  const [gInclusive, setGInclusive] = useState(false); // open ○ vs closed ●
  const [gDir, setGDir] = useState('left'); // 'left' | 'right'

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const layoutRef = useRef({});
  const draggingRef = useRef(false);

  const p = { a, b, c, op };
  const current = STEPS[step];
  const calib = !!current.calib;

  // derived math (guided mode reads the live dials; calib reads the target)
  const L = leftSide(x, p);
  const bnd = boundaryValue(p);
  const sOp = solvedOp(p);
  const solStr = `${sOp} ${fmtBoundary(p)}`;
  const inSet = truth(x, p);

  // calib correctness
  const trueDir = target ? (isLess(solvedOp(target)) ? 'left' : 'right') : 'left';
  const trueInclusive = target ? !isStrict(target.op) : false;
  const endDist = target ? Math.abs(x - target.boundary) : Infinity;
  const directionOK = calib ? gDir === trueDir : true;
  const inclusiveOK = calib ? gInclusive === trueInclusive : true;
  let pct = 0;
  if (calib && target) {
    pct = matchPercent(endDist);
    if (!directionOK) pct = Math.min(pct, 34); // a wrong ray direction (the flip) caps hard
    if (!inclusiveOK) pct = Math.min(pct, 70); // a wrong endpoint style caps softer
  }
  const solved = calib && target ? endDist < SOLVE_EPS && directionOK && inclusiveOK : false;

  // snapshot everything the renderer reads so draw() (a stable callback) never sees stale values
  sceneRef.current = {
    a, b, c, op, x, L, bnd, sOp, inSet, calib,
    gInclusive, gDir, target,
    // in calib the drawn graph comes from the student's controls; in guided mode from the true solution.
    // NOTE: the ray DIRECTION must come from the SOLVED op (sOp), not the original op — for a < 0 the
    // sign has flipped, so isLess(sOp) is what points the ray the right way. Strictness is unchanged by
    // dividing, so drawInclusive can read either op.
    drawBoundary: calib ? x : bnd,
    drawInclusive: calib ? gInclusive : !isStrict(op),
    drawDir: calib ? gDir : isLess(sOp) ? 'left' : 'right',
  };

  /* ---- full redraw from state ------------------------------------------- */
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
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    const S = sceneRef.current;

    const padL = 40;
    const padR = 40;
    const spanW = W - padL - padR;
    const X = (v) => padL + ((v - VMIN) / (VMAX - VMIN)) * spanW;
    const u = X(1) - X(0); // pixels per unit
    const clampX = (px) => Math.max(padL, Math.min(W - padR, px));
    layoutRef.current = { padL, padR, spanW, W };

    const ySol = Math.round(H * (S.calib ? 0.5 : 0.34)); // solution line (hero)
    const yCmp = Math.round(H * 0.76); // comparison line (why)

    const rr = (x0, y0, w, h, rad) => {
      const t = Math.min(rad, w / 2, h / 2);
      g.beginPath();
      g.moveTo(x0 + t, y0);
      g.arcTo(x0 + w, y0, x0 + w, y0 + h, t);
      g.arcTo(x0 + w, y0 + h, x0, y0 + h, t);
      g.arcTo(x0, y0 + h, x0, y0, t);
      g.arcTo(x0, y0, x0 + w, y0, t);
      g.closePath();
    };

    /* ---- faint full-height wash over the TRUE region (reinforces "a set") -- */
    {
      const bx = clampX(X(S.drawBoundary));
      g.fillStyle = 'rgba(200,30,79,0.05)';
      if (S.drawDir === 'left') g.fillRect(0, 0, bx, H);
      else g.fillRect(bx, 0, W - bx, H);
    }

    /* ---- quadrille paper: faint rules + integer-aligned verticals --------- */
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(199,216,228,0.4)';
    g.beginPath();
    const gs = 26;
    for (let yy = gs; yy < H; yy += gs) {
      g.moveTo(0, Math.round(yy) + 0.5);
      g.lineTo(W, Math.round(yy) + 0.5);
    }
    g.stroke();
    g.strokeStyle = 'rgba(199,216,228,0.6)';
    g.beginPath();
    for (let v = VMIN; v <= VMAX; v++) {
      const px = Math.round(X(v)) + 0.5;
      g.moveTo(px, 0);
      g.lineTo(px, H);
    }
    g.stroke();

    /* a reusable horizontal axis with end arrows, ticks & (optional) labels */
    const drawAxis = (yLine, { labels, minor }) => {
      const xL = X(VMIN) - 10;
      const xR = X(VMAX) + 10;
      g.strokeStyle = 'rgba(28,43,58,0.75)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(xL, yLine + 0.5);
      g.lineTo(xR, yLine + 0.5);
      g.stroke();
      g.fillStyle = 'rgba(28,43,58,0.75)';
      const arrow = (px, dir) => {
        g.beginPath();
        g.moveTo(px, yLine);
        g.lineTo(px - dir * 8, yLine - 4.5);
        g.lineTo(px - dir * 8, yLine + 4.5);
        g.closePath();
        g.fill();
      };
      arrow(xL, -1);
      arrow(xR, 1);
      g.textAlign = 'center';
      g.textBaseline = 'top';
      for (let v = VMIN; v <= VMAX; v++) {
        const px = X(v);
        const major = v % 5 === 0;
        const zero = v === 0;
        if (!minor && !major && !zero) continue;
        g.strokeStyle = zero ? 'rgba(28,43,58,0.8)' : 'rgba(28,43,58,0.5)';
        g.lineWidth = zero ? 2.2 : major ? 1.8 : 1;
        const tk = zero ? 8 : major ? 7 : 4;
        g.beginPath();
        g.moveTo(px, yLine - tk);
        g.lineTo(px, yLine + tk);
        g.stroke();
        if (labels && (major || zero)) {
          g.font = (zero ? '700 ' : '600 ') + '11px ' + MONO;
          g.fillStyle = zero ? INK : INK_SOFT;
          g.fillText(fmtNum(v), px, yLine + 11);
        }
      }
    };

    /* ===================== SOLUTION LINE (hero) ============================ */
    drawAxis(ySol, { labels: true, minor: u >= 22 });

    const bDraw = S.drawBoundary;
    const bx = clampX(X(bDraw));
    const dir = S.drawDir;
    const inclusive = S.drawInclusive;

    /* the shaded ray: a thick translucent carmine band along the axis, from the
       boundary to the edge, capped with an arrowhead (the ray goes on forever) */
    const edge = dir === 'left' ? padL - 6 : W - padR + 6;
    g.strokeStyle = 'rgba(200,30,79,0.9)';
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(bx, ySol);
    g.lineTo(edge, ySol);
    g.stroke();
    g.lineWidth = 1;
    // ray arrowhead at the far edge
    {
      const d = dir === 'left' ? -1 : 1;
      const tip = dir === 'left' ? padL - 8 : W - padR + 8;
      g.fillStyle = CARMINE;
      g.beginPath();
      g.moveTo(tip, ySol);
      g.lineTo(tip - d * 9, ySol - 5.5);
      g.lineTo(tip - d * 9, ySol + 5.5);
      g.closePath();
      g.fill();
    }

    /* the boundary circle: open ○ (white fill, carmine ring) for strict, or
       closed ● (carmine fill) for ≤ / ≥ */
    const R = 7.5;
    g.lineWidth = 2.6;
    g.strokeStyle = CARMINE;
    g.beginPath();
    g.arc(bx, ySol, R, 0, Math.PI * 2);
    if (inclusive) {
      g.fillStyle = CARMINE;
      g.fill();
    } else {
      g.fillStyle = '#ffffff';
      g.fill();
      g.stroke();
    }
    // boundary value label under the circle
    g.font = '700 11.5px ' + MONO;
    g.fillStyle = CARMINE;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    const bLabel = S.calib ? fmtNum(bDraw) : fmtBoundary({ a: S.a, b: S.b, c: S.c });
    g.fillText(bLabel, bx, ySol + 13);

    /* ---- the TEST DOT (guided) or ENDPOINT HANDLE (calib) ---------------- */
    if (!S.calib) {
      const tx = clampX(X(S.x));
      // stem up to a value pill
      g.strokeStyle = S.inSet ? 'rgba(31,138,91,0.55)' : 'rgba(91,107,123,0.5)';
      g.setLineDash([3, 3]);
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(tx, ySol - 10);
      g.lineTo(tx, ySol - 40);
      g.stroke();
      g.setLineDash([]);
      // the dot: green when the statement is true here, hollow slate when not
      g.lineWidth = 2.4;
      g.beginPath();
      g.arc(tx, ySol, 8, 0, Math.PI * 2);
      if (S.inSet) {
        g.fillStyle = OK;
        g.fill();
      } else {
        g.fillStyle = '#ffffff';
        g.fill();
        g.strokeStyle = INK_SOFT;
        g.stroke();
      }
      // grab ring
      g.strokeStyle = S.inSet ? 'rgba(31,138,91,0.35)' : 'rgba(91,107,123,0.3)';
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(tx, ySol, 12.5, 0, Math.PI * 2);
      g.stroke();
      // value pill "x = …  TRUE/FALSE"
      const label = `x = ${fmtNum(S.x)}`;
      g.font = '700 12px ' + MONO;
      const tw = g.measureText(label).width;
      const pw = tw + 16;
      const ph = 20;
      const pxp = clampX(tx) - pw / 2;
      const pyp = ySol - 40 - ph;
      g.fillStyle = S.inSet ? 'rgba(31,138,91,0.12)' : 'rgba(91,107,123,0.1)';
      rr(Math.max(2, Math.min(W - pw - 2, pxp)), pyp, pw, ph, 10);
      g.fill();
      g.strokeStyle = S.inSet ? OK : INK_SOFT;
      g.lineWidth = 1.2;
      g.stroke();
      g.fillStyle = S.inSet ? OK : INK_SOFT;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, Math.max(2 + pw / 2, Math.min(W - 2 - pw / 2, tx)), pyp + ph / 2 + 0.5);
    } else {
      // calibration: the boundary circle above IS the draggable handle; add a grab ring + hint
      g.strokeStyle = 'rgba(200,30,79,0.4)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(bx, ySol, 13, 0, Math.PI * 2);
      g.stroke();
      g.font = '600 11px ' + MONO;
      g.fillStyle = INK_SOFT;
      g.textAlign = 'center';
      g.textBaseline = 'bottom';
      g.fillText('drag the endpoint', bx, ySol - 18);
    }

    /* ===================== COMPARISON LINE (why) ========================== */
    if (!S.calib) {
      // connector from the test dot down to the a·x+b point (the map x ↦ a·x+b)
      const tx = clampX(X(S.x));
      const Lx = clampX(X(S.L));
      g.strokeStyle = 'rgba(200,30,79,0.4)';
      g.setLineDash([4, 4]);
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(tx, ySol + 12);
      g.lineTo(Lx, yCmp - 12);
      g.stroke();
      g.setLineDash([]);

      drawAxis(yCmp, { labels: false, minor: false });

      // fixed c mark (blue) with label
      const cx = clampX(X(S.c));
      g.strokeStyle = BLUE;
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(cx, yCmp - 9);
      g.lineTo(cx, yCmp + 9);
      g.stroke();
      g.fillStyle = BLUE;
      g.font = '700 11px ' + MONO;
      g.textAlign = 'center';
      g.textBaseline = 'top';
      g.fillText(`c = ${fmtNum(S.c)}`, cx, yCmp + 12);

      // moving a·x+b point (carmine)
      const Loff = Math.abs(S.L) > VMAX + 1e-9; // off the visible track
      g.beginPath();
      g.arc(Lx, yCmp, 7, 0, Math.PI * 2);
      g.fillStyle = CARMINE;
      g.fill();
      g.fillStyle = CARMINE;
      g.textAlign = 'center';
      g.textBaseline = 'bottom';
      g.font = '700 11px ' + MONO;
      g.fillText(`a·x+b = ${fmtNum(S.L)}${Loff ? ' →' : ''}`, Lx, yCmp - 11);

      // operator glyph + TRUE/FALSE verdict, centered above the line
      const verdict = S.inSet ? 'TRUE' : 'FALSE';
      const vcol = S.inSet ? OK : INK_SOFT;
      g.font = '700 12px ' + MONO;
      const vtext = `${fmtNum(S.L)} ${S.op} ${fmtNum(S.c)}  →  ${verdict}`;
      const vtw = g.measureText(vtext).width;
      const vpw = vtw + 18;
      const vph = 22;
      const vpx = Math.max(2, Math.min(W - vpw - 2, W / 2 - vpw / 2));
      const vpy = yCmp + 30;
      g.fillStyle = S.inSet ? 'rgba(31,138,91,0.1)' : 'rgba(91,107,123,0.08)';
      rr(vpx, vpy, vpw, vph, 11);
      g.fill();
      g.strokeStyle = vcol;
      g.lineWidth = 1.2;
      g.stroke();
      g.fillStyle = vcol;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(vtext, vpx + vpw / 2, vpy + vph / 2 + 0.5);
    }

    /* ---- tiny legend, bottom-left: a real open/closed circle + its meaning.
       Adaptive — pick the wordiest label pair that fits the canvas width so it
       never clips on a phone. ------------------------------------------------ */
    g.font = '10.5px ' + MONO;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    const ly = H - 12;
    const variants = [
      { a: '< >  boundary excluded', b: '≤ ≥  boundary included' },
      { a: '< >  excluded', b: '≤ ≥  included' },
      { a: '< >', b: '≤ ≥' },
    ];
    const circleR = 5;
    const preGap = 6; // circle → its text
    const midGap = 16; // first item → second circle
    const measure = (v) =>
      circleR * 2 + preGap + g.measureText(v.a).width + midGap + circleR * 2 + preGap + g.measureText(v.b).width;
    let V = variants[variants.length - 1];
    for (const v of variants) {
      if (14 + measure(v) <= W - 10) {
        V = v;
        break;
      }
    }
    let lx = 14;
    // open circle + label a
    g.strokeStyle = CARMINE;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(lx, ly, circleR, 0, Math.PI * 2);
    g.fillStyle = '#fff';
    g.fill();
    g.stroke();
    lx += circleR + preGap;
    g.fillStyle = INK_SOFT;
    g.fillText(V.a, lx, ly);
    lx += g.measureText(V.a).width + midGap + circleR;
    // closed circle + label b
    g.beginPath();
    g.arc(lx, ly, circleR, 0, Math.PI * 2);
    g.fillStyle = CARMINE;
    g.fill();
    lx += circleR + preGap;
    g.fillStyle = INK_SOFT;
    g.fillText(V.b, lx, ly);
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [a, b, c, op, x, step, target, gInclusive, gDir, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a fresh inequality to the challenge the first time we reach it */
  useEffect(() => {
    if (current.calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* load the target's inequality into the (now locked) dials and reset the
     student's graph to a deliberately-wrong start so the challenge is real */
  useEffect(() => {
    if (calib && target) {
      setA(target.a);
      setB(target.b);
      setC(target.c);
      setOp(target.op);
      setX(0); // endpoint handle starts at 0
      setGInclusive(false);
      setGDir('left');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, calib]);

  /* ---- pointer drag on the canvas: move the test dot / endpoint handle --- */
  const pointerToX = (clientX) => {
    const canvas = canvasRef.current;
    const { padL, spanW } = layoutRef.current;
    if (!canvas || !spanW) return null;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    let v = VMIN + ((px - padL) / spanW) * (VMAX - VMIN);
    v = Math.round(v * 2) / 2; // snap to 0.5
    return Math.max(-9, Math.min(9, v));
  };
  const onDown = (e) => {
    draggingRef.current = true;
    const v = pointerToX(e.clientX);
    if (v != null) setX(v);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!draggingRef.current) return;
    const v = pointerToX(e.clientX);
    if (v != null) setX(v);
  };
  const onUp = (e) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  /* ---- other interaction ------------------------------------------------- */
  const onParam = (key, value) => {
    let v = parseFloat(value);
    if (key === 'a') {
      if (v === 0) v = a > 0 ? -1 : 1; // skip 0 in the direction of travel (a=0 drops the x term)
      setA(v);
    } else if (key === 'b') setB(v);
    else if (key === 'c') setC(v);
    else setX(v);
  };

  const resetDials = () => {
    setA(START.a);
    setB(START.b);
    setC(START.c);
    setOp(START.op);
    setX(START.x);
  };
  const testInSet = () => {
    // jump the test dot to an easy point inside the solution set
    const step2 = isLess(sOp) ? bnd - 1 : bnd + 1;
    setX(Math.max(-9, Math.min(9, Math.round(step2 * 2) / 2)));
  };
  const solveForMe = () => {
    // calib helper: snap the graph to the correct answer
    if (!target) return;
    setX(target.boundary);
    setGInclusive(trueInclusive);
    setGDir(trueDir);
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
    `Number line. The inequality is ${coefStr(a) || ''}x${b ? ' plus ' + b : ''} ${op} ${fmtNum(c)}. ` +
    (calib
      ? `Graph the solution by placing the endpoint, choosing open or closed, and the ray direction.`
      : `At x = ${fmtNum(x)}, the left side a·x + b = ${fmtNum(L)}, so the statement is ${inSet ? 'true' : 'false'}. ` +
        `The solution is x ${sOp} ${fmtBoundary(p)}, a ${isLess(sOp) ? 'left' : 'right'}-pointing ray with ` +
        `${isStrict(op) ? 'an open' : 'a closed'} endpoint.`);

  return (
    <div className="ineqlab">
      <header className="head">
        <h1>Linear Inequalities</h1>
        <p className="lede">
          An equation has one answer; an inequality has a whole{' '}
          <em>set</em> of them. Solve <span className="mono">a·x&nbsp;+&nbsp;b&nbsp;{'<'}&nbsp;c</span>{' '}
          the same way you solve an equation — with{' '}
          <em>one</em> extra rule: multiply or divide by a <em>negative</em> and the sign{' '}
          <em>flips</em>. Each control unlocks with the lesson.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <InequalityHead p={p} showSolution={!calib} solStr={solStr} />
            </p>
            <p className="equation-sub mono">
              {calib ? 'solve it, then graph the answer' : `solution set:  x ${solStr}`}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            role="img"
            aria-label={spoken}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {calib ? 'drag the endpoint · set ○/● below' : 'drag the dot along the line'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && solved ? ' Solved — the graph matches the solution.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Left side · a·x + b</span>
              <span className="fact-v mono">{fmtNum(L)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Right side · c</span>
              <span className="fact-v mono">{fmtNum(c)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">At x = {fmtNum(x)}</span>
              <span className="fact-v" style={{ color: calib ? INK_SOFT : inSet ? OK : INK_SOFT }}>
                {calib ? '—' : inSet ? 'true ✓' : 'false ✕'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Solution · x</span>
              <span className="fact-v mono">{calib && !solved ? '?' : solStr}</span>
            </div>
          </div>

          {showSteps && !calib && (
            <div className="steps">
              <p className="steps-title">Solve by doing the same to both sides</p>
              <ol>
                {solveSteps(p).map((ln, i, arr) => (
                  <li key={i} className={'step-line' + (i === arr.length - 1 ? ' final' : '')}>
                    <span className="step-eq mono">
                      <Xhl text={ln.lhs} />{' '}
                      <span className={'op' + (ln.flip ? ' flip' : '')}>{ln.op}</span>{' '}
                      <span className={i === arr.length - 1 ? 'sol' : ''}>{ln.rhs}</span>
                    </span>
                    <span className={'step-note' + (ln.flip ? ' flipnote' : '')}>{ln.note}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={testInSet} disabled={calib}>
              Test a solution
            </button>
            <button
              type="button"
              className={'btn ghost' + (showSteps ? ' on' : '')}
              onClick={() => setShowSteps((v) => !v)}
              aria-pressed={showSteps}
              disabled={calib}
            >
              {showSteps ? 'Hide solution steps' : 'Show solution steps'}
            </button>
            <button type="button" className="btn ghost" onClick={resetDials} disabled={calib}>
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

          {/* the sign control — a 4-way segmented control, live from step 3 on */}
          {(() => {
            const opUnlocked = step >= 2;
            const opLocked = !opUnlocked || calib;
            return (
              <div className={'opctl' + (opLocked ? ' locked' : '')}>
                <span className="opk">sign</span>
                <div className="opgroup" role="group" aria-label="Inequality sign">
                  {OPS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className={'opbtn' + (op === o ? ' sel' : '')}
                      disabled={opLocked}
                      aria-pressed={op === o}
                      onClick={() => setOp(o)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <span className="oprole">{opUnlocked ? (calib ? 'locked' : 'strict ○ · or ≤ ≥ ●') : 'unlocks soon'}</span>
              </div>
            );
          })()}

          <div className="dials">
            {PARAMS.map((d) => {
              const unlocked = step >= d.unlock;
              const locked = !unlocked || calib;
              const val = { a, b, c, x }[d.key];
              return (
                <label className={'dial' + (locked ? ' locked' : '')} key={d.key}>
                  <span className="dk" style={d.star ? { color: CARMINE } : undefined}>
                    {d.label}
                  </span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={d.step}
                    value={val}
                    disabled={locked}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    style={d.star ? { accentColor: CARMINE } : undefined}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? fmtNum(val) : '🔒'}</output>
                </label>
              );
            })}
          </div>

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((ch, i) => {
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
                      {ch}
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
                Graph the solution of:{' '}
                <strong className="mono">
                  {coefStr(target.a)}x{target.b ? ` + ${target.b}` : ''} {target.op} {fmtNum(target.c)}
                </strong>
              </p>

              <div className="graphctl">
                <div className="gc-row">
                  <span className="gc-k">endpoint</span>
                  <div className="gc-seg" role="group" aria-label="Endpoint style">
                    <button
                      type="button"
                      className={'gc-btn' + (!gInclusive ? ' sel' : '')}
                      aria-pressed={!gInclusive}
                      onClick={() => setGInclusive(false)}
                    >
                      ○ open
                    </button>
                    <button
                      type="button"
                      className={'gc-btn' + (gInclusive ? ' sel' : '')}
                      aria-pressed={gInclusive}
                      onClick={() => setGInclusive(true)}
                    >
                      ● closed
                    </button>
                  </div>
                </div>
                <div className="gc-row">
                  <span className="gc-k">shade</span>
                  <div className="gc-seg" role="group" aria-label="Ray direction">
                    <button
                      type="button"
                      className={'gc-btn' + (gDir === 'left' ? ' sel' : '')}
                      aria-pressed={gDir === 'left'}
                      onClick={() => setGDir('left')}
                    >
                      ◄ left
                    </button>
                    <button
                      type="button"
                      className={'gc-btn' + (gDir === 'right' ? ' sel' : '')}
                      aria-pressed={gDir === 'right'}
                      onClick={() => setGDir('right')}
                    >
                      right ►
                    </button>
                  </div>
                </div>
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
                    {!directionOK
                      ? 'check the ray direction — did you flip?'
                      : !inclusiveOK
                      ? isStrict(target.op)
                        ? 'strict sign → open ○'
                        : '≤ or ≥ → closed ●'
                      : endDist > SOLVE_EPS
                      ? x < target.boundary
                        ? 'endpoint too far left'
                        : 'endpoint too far right'
                      : ''}
                  </span>
                )}
              </div>
              {solved && (
                <p className="factnote">
                  x {solvedOp(target)} {fmtNum(target.boundary)}. {target.a < 0 ? 'a is negative, so the sign flipped. ' : ''}
                  Endpoint {trueInclusive ? 'closed ●' : 'open ○'}, ray to the {trueDir}.
                </p>
              )}
              <div className="calib-btns">
                <button type="button" className="btn ghost" onClick={solveForMe}>
                  Show me
                </button>
                <button type="button" className="btn ghost" onClick={() => setTarget(makeTarget(target))}>
                  New inequality
                </button>
              </div>
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
                  setShowSteps(true);
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
        <span className="mono">a·x + b {'<'} c</span> &nbsp;·&nbsp; the one-variable linear inequality — its
        answer is a shaded ray, and dividing both sides by a negative flips the sign.
      </footer>

      <style jsx>{`
        .ineqlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #3f74a6;
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
          grid-template-columns: minmax(0, 1fr) 350px;
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
          display: flex;
          justify-content: space-between;
          align-items: baseline;
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
          margin: 0;
        }
        .stage {
          position: relative;
          width: min(100%, 620px);
          aspect-ratio: 5 / 4;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          cursor: ew-resize;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        /* on a phone the 5:4 box gets too short for the two stacked number
           lines — give it a taller, portrait ratio so nothing crowds. */
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 3 / 4;
          }
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .hint {
          position: absolute;
          left: 10px;
          top: 9px;
          font-size: 11px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.82);
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
        .steps {
          margin: 14px 4px 2px;
          padding: 12px 14px;
          background: rgba(28, 43, 58, 0.025);
          border: 1px solid rgba(28, 43, 58, 0.08);
          border-radius: 8px;
        }
        .steps-title {
          margin: 0 0 8px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .steps ol {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 6px;
        }
        .step-line {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
        }
        .step-eq {
          font-size: 15px;
          font-variant-numeric: tabular-nums;
          color: var(--ink);
        }
        .step-line.final .step-eq {
          font-weight: 700;
        }
        .step-eq .xac {
          color: var(--curve);
          font-weight: 700;
        }
        .step-eq .op {
          color: var(--ink-soft);
          font-weight: 700;
          padding: 0 1px;
        }
        .step-eq .op.flip {
          color: var(--curve);
          background: rgba(200, 30, 79, 0.12);
          border-radius: 4px;
          padding: 0 4px;
        }
        .step-eq .sol {
          color: var(--curve);
          font-weight: 700;
        }
        .step-note {
          font-size: 12px;
          color: var(--ink-soft);
          font-style: italic;
        }
        .step-note.flipnote {
          color: var(--curve);
          font-weight: 600;
          font-style: normal;
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
          gap: 5px;
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
        .opctl {
          display: grid;
          grid-template-columns: 34px 1fr;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 3px 10px;
          margin-bottom: 14px;
        }
        .opctl.locked {
          opacity: 0.5;
        }
        .opk {
          grid-row: 1 / 3;
          font-family: var(--serif);
          font-style: italic;
          font-size: 15px;
          color: var(--ink-soft);
        }
        .opgroup {
          grid-column: 2;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .opbtn {
          font: 700 17px/1 var(--mono);
          padding: 8px 0;
          border-radius: 7px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.12s, background 0.12s, color 0.12s;
        }
        .opbtn:not(:disabled):hover {
          border-color: var(--ink);
        }
        .opbtn.sel {
          background: var(--curve);
          border-color: var(--curve);
          color: #fff;
        }
        .opbtn:disabled {
          cursor: not-allowed;
        }
        .oprole {
          grid-column: 2;
          font-size: 11px;
          color: var(--ink-soft);
        }
        @media (max-width: 560px) {
          .opctl {
            grid-template-columns: minmax(0, 1fr);
          }
          .opk,
          .opgroup,
          .oprole {
            grid-column: 1;
          }
          .opk {
            grid-row: auto;
          }
          .opgroup {
            grid-template-columns: repeat(2, minmax(44px, 1fr));
          }
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
        .calib-goal {
          margin: 0;
          font-size: 13.5px;
          color: var(--ink);
        }
        .calib-goal strong {
          color: var(--curve);
          font-size: 15px;
        }
        .graphctl {
          display: grid;
          gap: 8px;
          padding: 10px 12px;
          background: rgba(28, 43, 58, 0.025);
          border: 1px solid rgba(28, 43, 58, 0.08);
          border-radius: 8px;
        }
        .gc-row {
          display: grid;
          grid-template-columns: 62px 1fr;
          align-items: center;
          gap: 10px;
        }
        .gc-k {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .gc-seg {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .gc-btn {
          font: 600 12.5px/1 var(--mono);
          padding: 8px 0;
          border-radius: 7px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.12s, background 0.12s, color 0.12s;
        }
        .gc-btn:hover {
          border-color: var(--ink);
        }
        .gc-btn.sel {
          background: var(--curve);
          border-color: var(--curve);
          color: #fff;
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
          font-size: 12px;
          text-align: right;
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
        .calib-btns {
          display: flex;
          gap: 9px;
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
        :global(.ineqlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .opbtn,
          .gc-btn {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
