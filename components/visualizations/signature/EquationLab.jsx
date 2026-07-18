'use client';

/* ============================================================================
   EquationLab — an interactive "bench" for the single-variable linear equation,
        a·x + b = c.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — one carmine accent for the
   mathematical object, dials that unlock one per lesson step, predict-then-check
   questions, and a capstone challenge with a live match meter.

   The signature centerpiece is the BALANCE SCALE — the equation's analogue of
   the line's "slope triangle" or the circle's "radius triangle". An equation is
   a balance: the two sides weigh the same. The left pan holds a·x + b, the right
   holds c, and the beam is LEVEL at exactly one value of x — the SOLUTION. That
   makes the whole method visible:
        • solving  = finding the value of x that levels the scale, and
        • "do the same to BOTH sides" = taking the same weight off both pans, or
          splitting both pans equally, so the balance never breaks.
   The unknown x is the star: the carmine x-boxes, the x dial, and the solution
   are the only carmine things on screen. The known numbers (b, c) are drawn as
   plain slate unit-weights, visually separating the UNKNOWN from the KNOWN.

   SUBTRACTION EQUATIONS (b < 0) — why balloons. A pan cannot hold −2: you cannot
   set a negative weight down on a tray. The usual classroom fix, red algebra
   tiles, fails twice here — red would break the one-accent rule (carmine means
   the unknown, and nothing else), and a "negative tile" resting on a balance is
   physical nonsense. So a negative unit is a BALLOON, pulling UP with a force of
   1. The beam then reads weights − balloons = a·x + b for b of either sign, with
   no special cases, and a ZERO PAIR stops being a rule to memorise: tie a balloon
   to a weight and it genuinely floats neutral, worth 0. The physics and the
   algebra agree, which is the whole reason the picture teaches anything.
   x itself stays a symbolic carmine BOX, never a balloon, however negative it
   goes — the box is the unknown, not a claim about its weight.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/EquationLab.jsx
     2. Import and render it:
          import EquationLab from './EquationLab';
          export default function Page() { return <EquationLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, c, trial x, step).
     MODEL  — the math (left side, solution) is pure; it knows nothing about pixels.
     RENDER — the canvas balance is fully redrawn from state on every change.

   E1 EXTENSION (2026-07-17, roadmap item E1 · 8.EE.C.7): step 8, "When no x
   works — and when every x works." When x-boxes sit on BOTH pans and cancel,
   the leftover x-free claim decides: false ⇒ no solution (3 = 5 never levels),
   true ⇒ every x (3 = 3 always levels), otherwise exactly one. Taught in the
   balance's own voice on the existing scene — per the roadmap, an extension
   here rather than a new lab, which would have duplicated this balance.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Palette constants shared between the canvas and the inline-styled equation
   head (a child component — styled-jsx only scopes a component's OWN JSX, so
   the head is styled inline to render identically in Next.js and any preview).
   ------------------------------------------------------------------------- */
const CURVE = '#c81e4f'; // the one accent — the unknown x and its solution
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const OK = '#1f8a5b';
const UNIT_FILL = '#dce8f2'; // known unit-weights: cool slate-blue (clearly "1s")
const UNIT_BORDER = '#8fb0c8';
const BALLOON_FILL = '#eef4f9'; // negative units — same KNOWN family, lighter body
const BALLOON_BORDER = '#6f96b2';
const GHOST = 0.34; // opacity for items caught mid-move (leaving, or cancelling)
const BEAM = '#41525f';
const STAND = '#5b6b7b';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. a, b, c define the equation a·x + b = c; the trial x is
   the unknown the student moves to balance the scale. One dial unlocks per step.
   Ranges are kept whole and non-negative for b, c so every weight on the pans is
   physically drawable; x (the unknown) is the only thing allowed to go negative
   or fractional, exactly as real solutions do.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'x', label: 'x', min: -6, max: 18, step: 0.5, unlock: 1, star: true, role: 'the unknown · drag to balance' },
  { key: 'a', label: 'a', min: 1, max: 4, step: 1, unlock: 5, role: 'how many x-boxes on the left' },
  // b spans −6…6, but its NEGATIVE half stays sealed until the subtraction step:
  // until then the dial floors at `softMin`, so the lesson meets + b before − b.
  {
    key: 'b',
    label: 'b',
    min: -6,
    max: 6,
    step: 1,
    unlock: 3,
    softMin: 0,
    softMinUntil: 4,
    role: 'units added on the left',
    role2: 'added (+) · or balloons (−)', // once the negative half is unlocked
    role2At: 4,
  },
  { key: 'c', label: 'c', min: 0, max: 12, step: 1, unlock: 2, role: 'the other side · the target' },
];
const START = { a: 1, b: 2, c: 6, x: 1 }; // x + 2 = 6, solution 4 — starts tilted (1 + 2 = 3 < 6)

/* A dial's live min: b's negative half unlocks at `softMinUntil`. Keeping this a
   pure function of (dial, step) means the slider, the clamp and the audit all
   read the SAME rule — the range can never drift out of sync with the lesson. */
const dialMin = (d, step) => (d.softMinUntil != null && step < d.softMinUntil ? d.softMin : d.min);

/* The "show the move" lens unlocks with the b dial: it is not a separate idea but
   the picture OF step 3's idea — doing the same to both sides to strand x alone. */
const LENS_UNLOCK = 3;

/* RANGE INVARIANT (audited): every equation the dials can build has its solution
   exactly reachable on the x dial. solution = (c − b)/a, so it spans
     min (0 − 6)/1 = −6      …      max (12 − (−6))/1 = 18
   which is precisely the x range. Widening b to −6 is why x now reaches 18: the
   two ranges are locked together, and changing one without the other would let a
   student build an equation they cannot possibly balance. */

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.
     leftSide(x)   = a·x + b
     solution      = (c − b) / a          (a ≥ 1, so never a divide-by-zero)
   ------------------------------------------------------------------------- */
const leftSide = (x, p) => p.a * x + p.b;
const solutionValue = (p) => (p.c - p.b) / p.a;

/* The ISOLATE-x move: do the same to both sides until the left pan holds only the
   a x-boxes. Whatever b is, the move is "take b off both sides" — for b > 0 that
   lifts b weights away; for b < 0 it ADDS |b| weights, each of which cancels one
   of the |b| balloons into a ZERO PAIR.
     left  a·x + b − b = a·x          right  c − b
   The move's whole point is that it CANNOT tip the beam: the gap it preserves is
     (a·x) − (c − b) = (a·x + b) − c = L − R
   so the tilt is bit-for-bit identical before and after. The audit proves this
   over every dial combination rather than trusting the algebra above. */
const movedRight = (p) => p.c - p.b; // the right pan after the move (may be < 0 → balloons)
const moveLabel = (b) =>
  b > 0 ? `remove ${b} from both sides` : `add ${Math.abs(b)} to both sides`;

/* the beam's tilt (radians): positive = left pan heavier → left pan sinks.
   A saturating tanh keeps a huge imbalance from spinning the beam past vertical,
   the balance-scale cousin of clamping a curve's blow-ups. */
const MAX_TILT = 0.2; // ~11.5° at full lean
const tiltAngle = (L, R) => MAX_TILT * Math.tanh((L - R) / 5);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the reveal
   lives in `feedback` (shown after answering); distractors are real student
   misconceptions (answer = the right side, add instead of subtract, divide
   before subtracting). Next is gated on ANSWERED, not on CORRECT. The unlock
   order — x, c, b, a — walks the standard curriculum ramp: balance to solve →
   one-step (subtract) → two-step (subtract, then divide).
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the equation',
    body:
      'An equation says two things weigh the same. On this balance the left pan holds x + 2 and the ' +
      'right pan holds 6 — but the beam is NOT level, so the x we are testing is not yet the right one. ' +
      'To SOLVE the equation is to find the value of x that makes the two sides equal: the value that ' +
      'levels the scale.',
    q: 'What does the equals sign in x + 2 = 6 promise?',
    choices: [
      'The left side and the right side have the same value',
      'x is always equal to 6',
      'Add the left side onto the right side',
    ],
    answer: 0,
    feedback:
      'The equals sign means BALANCE — the two sides name the same number. Solving is the hunt for the ' +
      'value of x that makes that promise true: here, the x that makes the left pan weigh exactly 6 and ' +
      'levels the beam.',
  },
  {
    title: 'x — the unknown',
    body:
      'The x dial is live. Each carmine box weighs x, the unknown. Drag x and watch the left pan rise or ' +
      'fall. The moment the beam is perfectly level, the two sides are equal and the equation is SOLVED.',
    q: 'Balance the scale. What value of x makes x + 2 = 6 true?',
    choices: ['x = 4', 'x = 8', 'x = 6'],
    answer: 0,
    feedback:
      'x = 4, because 4 + 2 = 6 levels the scale. That balancing value is called the SOLUTION. x = 6 is ' +
      'the tempting trap — but 6 + 2 = 8 is too heavy. Every method ahead is just a faster way to find ' +
      'this balance point without guessing.',
  },
  {
    title: 'c — the other side',
    body:
      'The c dial sets the right pan — the number the left side must match. Change c and the beam tips; ' +
      'the solution moves with it. The left side x + 2 still has to equal whatever the right side is.',
    q: 'Set c = 10, so the equation is x + 2 = 10. What is the solution now?',
    choices: ['x = 8', 'x = 12', 'x = 10'],
    answer: 0,
    feedback:
      'x = 8, since 8 + 2 = 10. Notice the answer is NOT 10 — the + 2 on the left still has to be ' +
      'accounted for. Changing the right side changes what x must be to keep the scale level.',
  },
  {
    title: 'b — undo the addition',
    body:
      'The b dial adds unit-weights to the left pan, giving x + b = c. To find x you must get it alone. ' +
      'The trick: lift b weights off BOTH pans at once. The balance never breaks, and the left pan is ' +
      'left holding just x. Taking b off both pans is subtracting b from both sides. Switch on ' +
      '“Show the move” to watch it happen — and watch the beam refuse to budge.',
    q: 'To solve x + 5 = 12, what do you do to both sides?',
    choices: [
      'Subtract 5 from both sides → x = 7',
      'Add 5 to both sides → x = 17',
      'Divide both sides by 5',
    ],
    answer: 0,
    feedback:
      'Subtract 5 from both sides: x + 5 − 5 = 12 − 5, so x = 7. You undo an addition with a subtraction, ' +
      'and doing it to BOTH sides keeps the balance. Adding 5 makes it heavier; nothing is multiplied ' +
      'yet, so dividing does not apply.',
  },
  {
    title: 'Subtraction equations — zero pairs',
    body:
      'The b dial now goes below zero. b = −2 means x − 2 = 5: two units are SUBTRACTED from the left. ' +
      'But you cannot drop −2 onto a pan — so a negative unit is drawn as a BALLOON, pulling UP with a ' +
      'force of 1. A weight and a balloon tied together cancel exactly: that is a ZERO PAIR, worth 0. ' +
      'To undo a subtraction you ADD — put 2 weights on BOTH pans, and on the left each one grabs a ' +
      'balloon and floats away, leaving x alone.',
    q: 'To solve x − 2 = 5, what do you do to both sides?',
    choices: [
      'Add 2 to both sides → x = 7',
      'Subtract 2 from both sides → x = 3',
      'Move the 2 across unchanged → x = 5 − 2 = 3',
    ],
    answer: 0,
    feedback:
      'Add 2 to both sides: x − 2 + 2 = 5 + 2, so x = 7. Check it: 7 − 2 = 5 ✓. The trap is to spot a “2” ' +
      'and subtract out of habit — but this 2 is already being subtracted, and a subtraction is undone by ' +
      'an ADDITION. On the pans: the left holds x and two balloons, so adding two weights makes two zero ' +
      'pairs that cancel and leave x by itself. Both wrong answers give x = 3, and 3 − 2 = 1, not 5.',
  },
  {
    title: 'a — undo the multiplication',
    body:
      'The a dial sets how many x-boxes sit on the left: a·x + b = c. Solve it in two moves, undoing the ' +
      'operations in REVERSE order. First take b off BOTH sides — subtract it if it was added, add it if ' +
      'it was subtracted — then DIVIDE both sides by a: splitting the remaining weight equally among the ' +
      'a boxes tells you what one box, one x, weighs.',
    q: 'Solve 3x + 2 = 14. Which order is correct?',
    choices: [
      'Subtract 2 (→ 3x = 12), then divide by 3 (→ x = 4)',
      'Divide by 3 first, then subtract 2',
      'Subtract 2, then subtract 3',
    ],
    answer: 0,
    feedback:
      'Subtract first, then divide: 3x + 2 = 14 → 3x = 12 → x = 4. Undo in reverse: the equation ADDS b ' +
      'last, so you SUBTRACT b first; it MULTIPLIES by a first, so you DIVIDE by a last. Dividing before ' +
      'subtracting would wrongly split the + 2 as well.',
  },
  {
    title: 'Check, and why one answer',
    body:
      'Once you have a solution, CHECK it: put it back in and both sides must come out equal. And a linear ' +
      'equation like this has exactly ONE solution — the left pan gets heavier at a steady rate as x grows, ' +
      'so it passes the right pan’s weight at a single tipping point.',
    q: 'You solved 2x + 1 = 9 and got x = 4. How do you know it is right?',
    choices: [
      'Put x = 4 back in: 2·4 + 1 = 9 ✓',
      'Because 4 is an even number',
      'Because 9 − 1 = 8',
    ],
    answer: 0,
    feedback:
      'Substitute it back: 2·4 + 1 = 9, a true statement, so x = 4 is confirmed. Checking catches slips ' +
      'instantly. And only one value works — the beam tips through level exactly once as x increases.',
  },
  {
    title: 'When no x works — and when every x works',
    body:
      'The beam tips through level exactly once because only the LEFT pan gains weight as x grows. ' +
      'But suppose both pans held x-boxes. Take the same number of x-boxes off both sides — legal as ever — ' +
      'and what remains is a claim with no x in it at all. That leftover claim decides everything: ' +
      'if it is false, no dial position can ever level the beam; if it is true, every single one does.',
    q: 'Both pans hold an x-box: x + 3 = x + 5. Remove one x-box from EACH pan. What remains, and when does the beam level?',
    choices: [
      '3 = 5 remains — false, so the beam NEVER levels: no solution at any x',
      'x = 2 remains — the beam levels at exactly one x',
      '3 = 5 remains — so x must be 2',
    ],
    answer: 0,
    feedback:
      'The x-boxes cancel and the claim left standing is 3 = 5 — false, with no x anywhere in it, so no dial ' +
      'position can rescue it: NO solution. Had the pans matched exactly — x + 3 = x + 3 — the leftover claim ' +
      'would be 3 = 3, true on its own, and EVERY x levels the beam. One solution, none, or all: when the ' +
      'x-boxes cancel, the leftover claim decides (8.EE.C.7).',
  },
  {
    title: 'Solve-it challenge',
    body:
      'Final challenge. You are handed a mystery equation with the a, b, c dials locked — it may add or ' +
      'subtract, and it may take one step or two. Dial x until the beam is perfectly level and the meter ' +
      'reads SOLVED — you will have found the value that makes the equation true. Solve it on paper first ' +
      'and dial straight to the answer. Press “New equation” for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 6 — Capstone (a CONSTRUCTION / solve goal, not a curve match). A mystery
   equation a·x + b = c is generated with a whole-number solution s in range; the
   student tunes only x. SOLVED fires on an exact hit (the beam is level), and the
   meter rewards getting close. Because s is a whole number and x moves in half
   steps, the solution is always exactly reachable.
   ------------------------------------------------------------------------- */
const matchPercent = (dist) => 100 / (1 + dist / 0.8); // dist = |x − solution|
const SOLVE_EPS = 1e-6;

function makeTarget(prev) {
  let t;
  do {
    const a = 1 + Math.floor(Math.random() * 4); // 1 … 4
    const s = Math.floor(Math.random() * 13) - 4; // −4 … 8  (the intended solution)
    const b = Math.floor(Math.random() * 13) - 6; // −6 … 6  (negative ⇒ a subtraction equation)
    const c = a * s + b;
    t = { a, b, c, s };
  } while (
    !(t.c >= 0 && t.c <= 12) || // keep every weight physically on the pans
    (t.a === 1 && t.b === 0) || // skip the trivial x = c
    (prev && t.a === prev.a && t.b === prev.b && t.c === prev.c) ||
    (t.a === START.a && t.b === START.b && t.c === START.c)
  );
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — a proper minus sign (−), trimmed decimals, exact
   fractions for solutions that are not whole numbers.
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
function solutionFraction(p) {
  let num = p.c - p.b;
  let den = p.a; // ≥ 1
  const g = gcd(num, den);
  num /= g;
  den /= g;
  return { num, den };
}
function fmtSolution(p) {
  const { num, den } = solutionFraction(p);
  if (den === 1) return trim(num);
  return `${num < 0 ? MINUS : ''}${Math.abs(num)}/${den}`;
}

/* The b term as it must READ, never as it is stored: b = −2 renders "x − 2 = 5",
   not the tell-tale "x + −2 = 5" that gives away a lab bolted onto positives. */
function fmtTerm(b) {
  if (b === 0) return '';
  return b > 0 ? ` + ${b}` : ` ${MINUS} ${Math.abs(b)}`;
}
/* Same term for screen readers, which must not have to pronounce a glyph. */
function spokenTerm(b) {
  if (b === 0) return '';
  return b > 0 ? ` plus ${b}` : ` minus ${Math.abs(b)}`;
}
/* The equation on one line, correctly signed — shared by the challenge goal, the
   check note and the aria label so they can never disagree with each other. */
function fmtEquation(p) {
  return `${p.a === 1 ? '' : p.a}x${fmtTerm(p.b)} = ${p.c}`;
}
/* A negative substituted into a product needs its brackets: 2·(−3) + 6, never the
   ambiguous 2·−3 + 6. */
const paren = (v) => (v < 0 ? `(${trim(v)})` : trim(v));
/* The substitution check, written as a student would write it: put the solution
   back in and watch both sides land on the same number. */
function checkNote(t) {
  const prod = t.a === 1 ? paren(t.s) : `${t.a}·${paren(t.s)}`;
  return `${prod}${fmtTerm(t.b)} = ${t.c}`;
}

/* EDIT 5 — Equation display. The equation a·x + b = c with the unknown x in
   carmine, plus a solution chip (hidden during the challenge so it is not
   spoiled). Inline styles because this is a CHILD component. */
const CHIP = {
  fontFamily: MONO,
  fontSize: '12.5px',
  fontWeight: 700,
  padding: '3px 9px',
  borderRadius: '999px',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};
function EquationHead({ a, b, c, showSolution, solStr }) {
  const coef = a === 1 ? '' : String(a);
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
        <span style={{ color: CURVE }}>x</span>
        {fmtTerm(b)} = {c}
      </span>
      {showSolution && (
        <span style={{ ...CHIP, color: CURVE, background: 'rgba(200,30,79,0.1)' }}>x = {solStr}</span>
      )}
    </span>
  );
}

/* The live worked solution — the inverse-operation method, generated from the
   current a, b, c. The number of steps depends on the equation: no + b means no
   subtract step, coefficient 1 means no divide step. */
function solveSteps(p) {
  const coef = p.a === 1 ? '' : String(p.a);
  const sol = fmtSolution(p);
  const k = p.c - p.b;
  const out = [
    { lhs: `${coef}x${fmtTerm(p.b)}`, rhs: String(p.c), note: 'the equation to solve' },
  ];
  // b > 0 was ADDED, so undo it by subtracting; b < 0 was SUBTRACTED, so undo it
  // by ADDING. Both are the same move — take b off both sides — and both land on
  // the same line a·x = c − b.
  if (p.b !== 0)
    out.push({
      lhs: `${coef}x`,
      rhs: trim(k),
      note: p.b > 0 ? `subtract ${p.b} from both sides` : `add ${Math.abs(p.b)} to both sides`,
    });
  if (p.a !== 1) out.push({ lhs: 'x', rhs: sol, note: `divide both sides by ${p.a}` });
  if (p.a === 1 && p.b === 0) out[0] = { lhs: 'x', rhs: sol, note: 'x is already on its own' };
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

function balanceWord(L, R) {
  if (Math.abs(L - R) < 1e-9) return 'balanced';
  return L > R ? 'left side heavier' : 'right side heavier';
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function EquationLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [c, setC] = useState(START.c);
  const [x, setX] = useState(START.x);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [showSteps, setShowSteps] = useState(true);
  const [lens, setLens] = useState(false); // "show the move" — take b off both sides

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const thetaRef = useRef(0); // the beam angle currently displayed (eased toward target)
  const sceneRef = useRef({});

  const params = { a, b, c };
  const current = STEPS[step];
  const calib = !!current.calib;

  const L = leftSide(x, params);
  const R = c;
  const solVal = solutionValue(params);
  const solStr = fmtSolution(params);
  const dist = target ? Math.abs(x - target.s) : Infinity;
  const pct = target ? matchPercent(dist) : 0;
  const solved = target ? dist < SOLVE_EPS : false;
  const balanced = Math.abs(L - R) < 1e-9;

  const bDial = PARAMS.find((d) => d.key === 'b');
  // The lens is barred during the challenge for the same reason the worked steps
  // are: with a shown as x-boxes, a post-move right pan of c − b hands over the
  // answer. It is a teaching instrument, not a solver.
  const lensUnlocked = step >= LENS_UNLOCK && !calib;
  const lensOn = lens && lensUnlocked;

  /* The legend explains what is ON SCREEN, not what the lesson has reached. The
     move can strand balloons on the RIGHT pan (c − b < 0) one step before the
     subtraction lesson formally introduces them, and an unexplained balloon is
     worse than an early one. Keyed off the picture, the two can never disagree. */
  const balloonsOnScreen = b < 0 || (lensOn && movedRight(params) < 0);
  const zeroPairsOnScreen = lensOn && b < 0;

  // Snapshot everything the renderer reads so draw() (a stable callback) never
  // sees stale values.
  sceneRef.current = {
    a, b, c, x, L, R, calib, balanced,
    lens: lensOn,
    showBalloonKey: balloonsOnScreen,
    showPairKey: zeroPairsOnScreen,
  };

  /* ---- full redraw of the balance from state ----------------------------- */
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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const s = Math.max(0.55, Math.min(W / 600, H / 480)); // uniform element scale
    const th = thetaRef.current;

    // apparatus geometry (positions as fractions of the stage, sizes scaled by s)
    const cx = W / 2;
    const pivotY = H * 0.34;
    const baseY = H * 0.9;
    const arm = Math.min(W * 0.34, 210);
    const strLen = H * 0.24;
    const trayW = Math.min(W * 0.34, 186);
    const cosT = Math.cos(th);
    const sinT = Math.sin(th);
    const BL = [cx - arm * cosT, pivotY + arm * sinT]; // left beam end (down when left heavier)
    const BR = [cx + arm * cosT, pivotY - arm * sinT];
    const TL = [BL[0], BL[1] + strLen]; // trays hang straight down (vertical strings)
    const TR = [BR[0], BR[1] + strLen];

    /* faint level reference line through the pivot */
    ctx.strokeStyle = 'rgba(28,43,58,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(W * 0.08, pivotY);
    ctx.lineTo(W * 0.92, pivotY);
    ctx.stroke();
    ctx.setLineDash([]);

    /* central stand: a triangle from a wide base up to the pivot, plus a foot */
    ctx.fillStyle = STAND;
    ctx.beginPath();
    ctx.moveTo(cx, pivotY - 4 * s);
    ctx.lineTo(cx - 26 * s, baseY);
    ctx.lineTo(cx + 26 * s, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(28,43,58,0.85)';
    ctx.fillRect(cx - 42 * s, baseY, 84 * s, 7 * s); // foot
    ctx.beginPath(); // ground shadow
    ctx.ellipse(cx, baseY + 10 * s, 60 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(28,43,58,0.08)';
    ctx.fill();

    /* strings from each beam end down to the two ends of its tray (a V of cords) */
    ctx.strokeStyle = 'rgba(28,43,58,0.5)';
    ctx.lineWidth = 1.4 * s;
    for (const [B, T] of [[BL, TL], [BR, TR]]) {
      ctx.beginPath();
      ctx.moveTo(B[0], B[1]);
      ctx.lineTo(T[0] - trayW / 2, T[1]);
      ctx.moveTo(B[0], B[1]);
      ctx.lineTo(T[0] + trayW / 2, T[1]);
      ctx.stroke();
    }

    /* the beam (rotated bar) with a pivot pin */
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 9 * s;
    ctx.strokeStyle = BEAM;
    ctx.beginPath();
    ctx.moveTo(BL[0], BL[1]);
    ctx.lineTo(BR[0], BR[1]);
    ctx.stroke();
    ctx.restore();

    /* a tray: a rounded platform items sit on */
    const drawTray = (T) => {
      const y = T[1];
      const left = T[0] - trayW / 2;
      const h = 7 * s;
      const r = 4 * s;
      ctx.fillStyle = '#556270';
      ctx.beginPath();
      ctx.moveTo(left + r, y);
      ctx.arcTo(left + trayW, y, left + trayW, y + h, r);
      ctx.arcTo(left + trayW, y + h, left, y + h, r);
      ctx.arcTo(left, y + h, left, y, r);
      ctx.arcTo(left, y, left + trayW, y, r);
      ctx.closePath();
      ctx.fill();
    };
    drawTray(TL);
    drawTray(TR);

    /* a small rounded tile used for both the unit-weights and the x-boxes */
    const tile = (px, py, w, h, fill, border, label, labelColor) => {
      const r = 3.5 * s;
      // save/restore: drawing a labelled tile must not leak font or text
      // alignment out to whatever draws next (it once silently centred the
      // legend's captions and stacked them on top of their own swatches).
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(px + r, py);
      ctx.arcTo(px + w, py, px + w, py + h, r);
      ctx.arcTo(px + w, py + h, px, py + h, r);
      ctx.arcTo(px, py + h, px, py, r);
      ctx.arcTo(px, py, px + w, py, r);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 1.5 * s;
      ctx.strokeStyle = border;
      ctx.stroke();
      if (label) {
        ctx.fillStyle = labelColor;
        ctx.font = `700 ${Math.round(12 * s)}px ${MONO}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, px + w / 2, py + h / 2 + 0.5);
      }
      ctx.restore();
    };

    const U = 17 * s; // unit tile size
    const GAP = 4 * s;
    const perRow = 5;
    const BALLOON_H = U * 1.25; // the oval plus its tether

    /* A BALLOON — one NEGATIVE unit. You cannot set −1 down on a pan, but you can
       tie on a balloon that pulls UP with a force of 1, which is the same thing
       to the beam. It stays in the KNOWN slate-blue family (carmine is reserved
       for the unknown x); the OVAL SHAPE and the −1 label carry the distinction,
       not a second accent colour. */
    const balloonAt = (px, py, w, h, alpha) => {
      const bx = px + w / 2;
      const rx = w * 0.47;
      const ry = h * 0.355;
      const by = py + ry + 0.5 * s;
      ctx.save();
      ctx.globalAlpha = alpha;
      // tether — it ends exactly at the cell's bottom edge, so a weight parked
      // directly below reads as TIED to the balloon (that is a zero pair).
      ctx.beginPath();
      ctx.moveTo(bx, by + ry);
      ctx.quadraticCurveTo(bx + 2.6 * s, py + h - (h - 2 * ry) * 0.35, bx, py + h);
      ctx.strokeStyle = 'rgba(28,43,58,0.45)';
      ctx.lineWidth = 1 * s;
      ctx.stroke();
      // body
      ctx.beginPath();
      ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = BALLOON_FILL;
      ctx.fill();
      ctx.lineWidth = 1.5 * s;
      ctx.strokeStyle = BALLOON_BORDER;
      ctx.stroke();
      // knot
      ctx.beginPath();
      ctx.moveTo(bx - 1.7 * s, by + ry);
      ctx.lineTo(bx + 1.7 * s, by + ry);
      ctx.lineTo(bx, by + ry + 2.3 * s);
      ctx.closePath();
      ctx.fillStyle = BALLOON_BORDER;
      ctx.fill();
      // label
      ctx.fillStyle = INK_SOFT;
      ctx.font = `700 ${Math.round(9.5 * s)}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${MINUS}1`, bx, by + 0.5);
      ctx.restore();
    };

    // stack |n| KNOWN units in centered rows growing UP from a baseline: weights
    // when n > 0, balloons when n < 0. `alpha` < 1 ghosts them (items caught in
    // the middle of a move). Returns the y of the top row's top edge.
    const stackUnits = (centerX, baseTop, n, alpha = 1) => {
      const neg = n < 0;
      const cellH = neg ? BALLOON_H : U;
      let top = baseTop;
      let remaining = Math.round(Math.abs(n));
      while (remaining > 0) {
        const inRow = Math.min(perRow, remaining);
        const rowW = inRow * U + (inRow - 1) * GAP;
        const startX = centerX - rowW / 2;
        const rowTop = top - cellH;
        for (let i = 0; i < inRow; i++) {
          const px = startX + i * (U + GAP);
          if (neg) balloonAt(px, rowTop, U, cellH, alpha);
          else {
            ctx.save();
            ctx.globalAlpha = alpha;
            tile(px, rowTop, U, U, UNIT_FILL, UNIT_BORDER, '1', INK_SOFT);
            ctx.restore();
          }
        }
        top = rowTop - GAP;
        remaining -= inRow;
      }
      return top;
    };

    /* ZERO PAIRS — the picture of undoing a subtraction. Each balloon (−1) gets a
       weight (+1) tied to the end of its string: lift 1 and pull 1 cancel, so the
       pair weighs exactly nothing and the pan is left holding only the x-boxes.
       Drawn vertically (balloon above, its weight below) so the tether does the
       explaining, and 6-per-row so the largest case (|b| = 6) stays one row and
       always clears the beam end. */
    const zeroPairs = (centerX, baseTop, count, alpha) => {
      const cellH = BALLOON_H + U;
      const per = 6;
      let top = baseTop;
      let remaining = count;
      while (remaining > 0) {
        const inRow = Math.min(per, remaining);
        const rowW = inRow * U + (inRow - 1) * GAP;
        const startX = centerX - rowW / 2;
        const rowTop = top - cellH;
        for (let i = 0; i < inRow; i++) {
          const px = startX + i * (U + GAP);
          balloonAt(px, rowTop, U, BALLOON_H, alpha);
          ctx.save();
          ctx.globalAlpha = alpha;
          tile(px, rowTop + BALLOON_H, U, U, UNIT_FILL, UNIT_BORDER, '1', INK_SOFT);
          ctx.restore();
        }
        top = rowTop - GAP;
        remaining -= inRow;
      }
      return top;
    };

    // a row of `a` carmine x-boxes; returns the y of their top edge.
    const drawXBoxes = (centerX, baseTop, count) => {
      const bw = 28 * s;
      const bh = 24 * s;
      const g = 6 * s;
      const rowW = count * bw + (count - 1) * g;
      const startX = centerX - rowW / 2;
      const top = baseTop - bh;
      for (let i = 0; i < count; i++) {
        tile(startX + i * (bw + g), top, bw, bh, 'rgba(200,30,79,0.12)', CURVE, 'x', CURVE);
      }
      return top - g;
    };

    // left pan: x-boxes on the tray, then the b units above them — weights when
    // b > 0, balloons when b < 0.
    const leftBase = TL[1] - 2 * s;
    const afterBoxes = drawXBoxes(TL[0], leftBase, S.a);

    if (!S.lens) {
      if (S.b !== 0) stackUnits(TL[0], afterBoxes, S.b);
      stackUnits(TR[0], TR[1] - 2 * s, S.c);
    } else {
      /* THE MOVE — take b off both sides, so the left pan is left holding only
         the a x-boxes. The left shows the MECHANISM (ghosted, because these items
         are mid-move); the right shows the RESULT, c − b, which goes to balloons
         when b > c. The beam does not move either way: the move preserves L − R. */
      if (S.b > 0) stackUnits(TL[0], afterBoxes, S.b, GHOST); // b weights lifted away
      else if (S.b < 0) zeroPairs(TL[0], afterBoxes, -S.b, GHOST); // |b| weights arrive & cancel
      stackUnits(TR[0], TR[1] - 2 * s, S.c - S.b);
    }

    /* a value pill centered under each tray: the current weight on that pan */
    const pill = (centerX, py, text, accent) => {
      ctx.font = `700 ${Math.round(12.5 * s)}px ${MONO}`;
      const tw = ctx.measureText(text).width;
      const w = tw + 16 * s;
      const h = 20 * s;
      const px = centerX - w / 2;
      const r = h / 2;
      ctx.beginPath();
      ctx.moveTo(px + r, py);
      ctx.arcTo(px + w, py, px + w, py + h, r);
      ctx.arcTo(px + w, py + h, px, py + h, r);
      ctx.arcTo(px, py + h, px, py, r);
      ctx.arcTo(px, py, px + w, py, r);
      ctx.closePath();
      ctx.fillStyle = accent ? 'rgba(31,138,91,0.14)' : 'rgba(28,43,58,0.06)';
      ctx.fill();
      ctx.strokeStyle = accent ? OK : 'rgba(28,43,58,0.2)';
      ctx.lineWidth = 1.2 * s;
      ctx.stroke();
      ctx.fillStyle = accent ? OK : INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, centerX, py + h / 2 + 0.5);
    };
    // under the lens the pans read their POST-move weights — a·x and c − b. The
    // gap between them is untouched, so `balanced` still decides the green.
    pill(TL[0], TL[1] + 16 * s, trim(S.lens ? S.a * S.x : S.L), S.balanced);
    pill(TR[0], TR[1] + 16 * s, trim(S.lens ? S.c - S.b : S.R), S.balanced);

    /* "BALANCED" flag over the pivot when the two sides are equal */
    if (S.balanced) {
      const tag = 'BALANCED';
      ctx.font = `700 ${Math.round(12 * s)}px ${MONO}`;
      const tw = ctx.measureText(tag).width;
      const w = tw + 18 * s;
      const h = 22 * s;
      const px = cx - w / 2;
      const py = pivotY - 40 * s;
      const r = 6 * s;
      ctx.beginPath();
      ctx.moveTo(px + r, py);
      ctx.arcTo(px + w, py, px + w, py + h, r);
      ctx.arcTo(px + w, py + h, px, py + h, r);
      ctx.arcTo(px, py + h, px, py, r);
      ctx.arcTo(px, py, px + w, py, r);
      ctx.closePath();
      ctx.fillStyle = 'rgba(31,138,91,0.12)';
      ctx.fill();
      ctx.strokeStyle = OK;
      ctx.lineWidth = 1.5 * s;
      ctx.stroke();
      ctx.fillStyle = OK;
      ctx.letterSpacing = '0.12em';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tag, cx, py + h / 2 + 0.5);
      ctx.letterSpacing = '0px';
    }

    /* the move ribbon — names what is being done to BOTH pans, and states the
       property that makes it legal: the beam does not move. */
    if (S.lens && S.b !== 0) {
      const txt = `${moveLabel(S.b)} — the beam does not move`;
      ctx.font = `${Math.round(11.5 * s)}px ${MONO}`;
      const tw = ctx.measureText(txt).width;
      const w = tw + 20 * s;
      const h = 21 * s;
      const px = cx - w / 2;
      // sits BELOW the "drag x…" hint, which is HTML at a fixed top: 9px and so
      // keeps its ~29px height however small the stage gets. A scaled offset
      // would slide back under it on narrow layouts — this one cannot.
      const py = 34;
      const r = h / 2;
      ctx.beginPath();
      ctx.moveTo(px + r, py);
      ctx.arcTo(px + w, py, px + w, py + h, r);
      ctx.arcTo(px + w, py + h, px, py + h, r);
      ctx.arcTo(px, py + h, px, py, r);
      ctx.arcTo(px, py, px + w, py, r);
      ctx.closePath();
      ctx.fillStyle = 'rgba(28,43,58,0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(28,43,58,0.18)';
      ctx.lineWidth = 1.2 * s;
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, cx, py + h / 2 + 0.5);
    }

    /* Legend, bottom-left — the things that can sit on a pan. Laid out as a
       measured CURSOR rather than fixed offsets: each entry advances by its own
       swatch and caption width, so entries can never land on top of each other
       at any stage size or label length. The balloon and zero-pair entries only
       appear once the lesson has introduced them. */
    const ly = H - 16 * s;
    const legendFont = `${Math.round(11 * s)}px ${MONO}`;
    let lx = 14 * s;
    const caption = (text) => {
      ctx.save();
      ctx.font = legendFont;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = INK_SOFT;
      ctx.fillText(text, lx, ly);
      lx += ctx.measureText(text).width + 16 * s;
      ctx.restore();
    };
    // = 1 · a unit weight
    tile(lx, ly - 8 * s, 15 * s, 15 * s, UNIT_FILL, UNIT_BORDER, '1', INK_SOFT);
    lx += 20 * s;
    caption('= 1');
    // = the unknown · a carmine x-box
    tile(lx, ly - 9 * s, 20 * s, 17 * s, 'rgba(200,30,79,0.12)', CURVE, 'x', CURVE);
    lx += 25 * s;
    caption('= the unknown');
    if (S.showBalloonKey) {
      // = −1 · a balloon
      balloonAt(lx, ly - 11 * s, 15 * s, 21 * s, 1);
      lx += 20 * s;
      caption(`= ${MINUS}1 (pulls up)`);
    }
    if (S.showPairKey) {
      // = 0 · the zero pair, drawn as the thing itself: a balloon tied to a weight
      balloonAt(lx, ly - 19 * s, 13 * s, 17 * s, 1);
      tile(lx, ly - 2 * s, 13 * s, 13 * s, UNIT_FILL, UNIT_BORDER, '1', INK_SOFT);
      lx += 18 * s;
      caption('= 0 (zero pair)');
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [a, b, c, x, step, target, lensOn, balloonsOnScreen, zeroPairsOnScreen, draw]);

  /* Stepping BACK past the subtraction lesson re-seals b's negative half, so a
     value left below the floor is lifted back onto it. Without this a student
     could carry b = −4 back to step 3 and hold a number the slider itself would
     refuse — the dial and its range must never disagree. */
  useEffect(() => {
    setB((v) => Math.min(bDial.max, Math.max(dialMin(bDial, step), v)));
  }, [step, bDial]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* the beam settles toward its true tilt — a real scale easing to rest. Opt-in
     per change (it stops when settled), and snaps instantly under reduced motion. */
  useEffect(() => {
    const targetTheta = tiltAngle(L, R);
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      thetaRef.current = targetTheta;
      draw();
      return;
    }
    let raf;
    const settle = () => {
      const cur = thetaRef.current;
      const d = targetTheta - cur;
      if (Math.abs(d) < 0.0006) {
        thetaRef.current = targetTheta;
        draw();
        return;
      }
      thetaRef.current = cur + d * 0.2;
      draw();
      raf = requestAnimationFrame(settle);
    };
    raf = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(raf);
  }, [L, R, draw]);

  /* hand a fresh equation to the challenge the first time we reach it */
  useEffect(() => {
    if (current.calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* load the target's equation into the (now locked) a, b, c dials and start x
     off the answer so the challenge is real */
  useEffect(() => {
    if (calib && target) {
      setA(target.a);
      setB(target.b);
      setC(target.c);
      setX(target.s === 1 ? 4 : 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, calib]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseFloat(value);
    if (key === 'a') setA(v);
    else if (key === 'b') setB(v);
    else if (key === 'c') setC(v);
    else setX(v);
  };

  const solveForMe = () => setX(solVal); // ease x onto the exact solution (may be a fraction)

  const resetDials = () => {
    setA(START.a);
    setB(START.b);
    setC(START.c);
    setX(START.x);
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
    `Balance scale for the equation ${a === 1 ? '' : a}x${spokenTerm(b)} equals ${c}. ` +
    `Left side ${trim(L)}, right side ${R}. The scale is ${balanceWord(L, R)}.` +
    (b < 0 ? ` The ${Math.abs(b)} subtracted units are shown as balloons, each pulling up with a force of 1.` : '') +
    (lensOn ? ` Showing the move: ${moveLabel(b)}, leaving ${a === 1 ? '' : a}x equals ${trim(movedRight(params))}.` : '') +
    (calib ? '' : ` The solution is x = ${solStr}.`);

  return (
    <div className="eqlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Single-Variable Equations</h1>
        <p className="lede">
          An equation is a{' '}
          <span className="mono">balance: a·x&nbsp;+&nbsp;b&nbsp;=&nbsp;c</span>. Solving means finding
          the value of <em>x</em> that levels the scale — and{' '}
          <em>doing the same to both sides</em> keeps it level. Each dial unlocks with the lesson, from
          a one-step balance to the full two-step solve.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <EquationHead a={a} b={b} c={c} showSolution={!calib} solStr={solStr} />
            </p>
            <p className="equation-sub mono">
              {calib
                ? 'find x that balances the scale'
                : lensOn
                  ? `${moveLabel(b)} → ${a === 1 ? '' : a}x = ${trim(movedRight(params))}`
                  : `left side a·x${fmtTerm(b)} = ${trim(L)}`}
            </p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {balanced ? 'balanced — the two sides are equal' : 'drag x to level the beam'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && solved ? ' Solved — the scale is balanced.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">{lensOn ? 'Left side · a·x' : 'Left side · a·x + b'}</span>
              <span className="fact-v mono">{trim(lensOn ? a * x : L)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">{lensOn ? 'Right side · c − b' : 'Right side · c'}</span>
              <span className="fact-v mono">{trim(lensOn ? movedRight(params) : R)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Balance</span>
              <span className="fact-v" style={{ color: balanced ? OK : INK_SOFT }}>
                {balanced ? 'level — sides equal ✓' : L > R ? 'left heavier' : 'right heavier'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Solution · x</span>
              <span className="fact-v mono">
                {calib && !solved ? '?' : solStr}
              </span>
            </div>
          </div>

          {showSteps && !calib && (
            <div className="steps">
              <p className="steps-title">Solve by keeping the balance</p>
              <ol>
                {solveSteps(params).map((ln, i, arr) => (
                  <li key={i} className={'step-line' + (i === arr.length - 1 ? ' final' : '')}>
                    <span className="step-eq mono">
                      <Xhl text={ln.lhs} /> = <span className={i === arr.length - 1 ? 'sol' : ''}>{ln.rhs}</span>
                    </span>
                    <span className="step-note">{ln.note}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={solveForMe} disabled={calib}>
              Balance it for me
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
            <button
              type="button"
              className={'btn ghost' + (lensOn ? ' on' : '')}
              onClick={() => setLens((v) => !v)}
              aria-pressed={lensOn}
              disabled={!lensUnlocked || b === 0}
              title={
                b === 0
                  ? 'Set b to something other than 0 — there is nothing to take off both sides yet'
                  : moveLabel(b)
              }
            >
              {lensOn ? 'Hide the move' : 'Show the move'}
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

          <div className="dials">
            {PARAMS.map((d) => {
              const unlocked = step >= d.unlock;
              const locked = !unlocked || (calib && d.key !== 'x');
              const val = { a, b, c, x }[d.key];
              const role = d.role2 && step >= d.role2At ? d.role2 : d.role;
              return (
                <label className={'dial' + (locked ? ' locked' : '')} key={d.key}>
                  <span className="dk" style={d.star ? { color: CURVE } : undefined}>
                    {d.label}
                  </span>
                  <span className="drole">{unlocked ? role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={dialMin(d, step)}
                    max={d.max}
                    step={d.step}
                    value={val}
                    disabled={locked}
                    aria-label={`Dial ${d.label} — ${role}`}
                    style={d.star ? { accentColor: CURVE } : undefined}
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
                Solve this equation:{' '}
                <strong className="mono">{fmtEquation(target)}</strong>
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {solved ? (
                  <span className="stamp">SOLVED</span>
                ) : (
                  <span className="mono target-hint">
                    {L > R ? 'left heavier — lower x' : 'right heavier — raise x'}
                  </span>
                )}
              </div>
              {solved && (
                <p className="factnote">
                  x = {trim(target.s)}, because {checkNote(target)}. The scale is balanced.
                </p>
              )}
              <button type="button" className="btn ghost" onClick={() => setTarget(makeTarget(target))}>
                New equation
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
                  setShowSteps(true);
                  setLens(false);
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
        <span className="mono">a·x + b = c</span> &nbsp;·&nbsp; the one-variable linear equation, solved
        by keeping a balance level — take b off both sides (subtract what was added, add what was
        subtracted), then divide both sides by a.
      </footer>

      <style jsx>{`
        .eqlab {
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
        .lede em {
          font-style: italic;
          color: var(--ink);
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
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        .stage {
          position: relative;
          width: min(100%, 600px);
          aspect-ratio: 5 / 4;
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
        .step-eq .sol {
          color: var(--curve);
          font-weight: 700;
        }
        .step-note {
          font-size: 12px;
          color: var(--ink-soft);
          font-style: italic;
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
        .calib-goal {
          margin: 0;
          font-size: 13.5px;
          color: var(--ink);
        }
        .calib-goal strong {
          color: var(--curve);
          font-size: 15px;
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
        :global(.eqlab) :focus-visible {
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
