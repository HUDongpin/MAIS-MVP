'use client';

/* ============================================================================
   DistributiveLab — an interactive "bench" for the DISTRIBUTIVE PROPERTY of
   multiplication over addition:

        a × (b + c)  =  a × b  +  a × c

   Built for MAIS (math AI system, www.mais.ac). Grades ~3 through 7:
     CCSS 3.OA.B.5   — apply properties of operations as strategies to multiply
     CCSS 6.NS.B.4   — use the distributive property to express a sum of two
                       whole numbers with a common factor as a multiple of a sum
                       of two whole numbers with no common factor  (the capstone)
     CCSS 6.EE.A.3   — apply the properties of operations to generate equivalent
                       expressions, e.g. 3(x + 2) = 3x + 6
     CCSS 7.EE.A.1   — add, subtract, factor and expand linear expressions

   ---------------------------------------------------------------------------
   HOW THIS LAB IS DISTINCT FROM ITS SIBLINGS  (distinctness is a correctness
   property in this library — two labs teaching one picture teach it twice and
   own it never):

     · MultiplicationLab owns a × b as a countable array of literal UNIT
       SQUARES (grades 2–4, factors 1..12). It meets the distributive property
       once, as a computing TACTIC, with a static dashed split line.
     · MultiDigitMultiplicationLab owns the PLACE-VALUE decomposition of BOTH
       factors into a 2×2 partial-products box and the bridge to the paper
       algorithm (grades 4–5).
     · This lab owns the PROPERTY ITSELF, as a law with two directions. It
       deliberately draws NO unit squares and NO place-value box. Its four
       signatures, none of which any sibling has:

         1. THE PULL-APART.   The rectangle physically separates into two tiles
            with a real gap and snaps back. Nothing is added and nothing is
            discarded, so the piece areas must add back to the whole. The
            GESTURE is the proof; a static split line cannot make that argument.
         2. THE REACH DUEL.   Carmine truth (a·b + a·c) against an amber foil
            (a·b + c) — the single most common error in school algebra. The
            foil's uncovered region is drawn literally, and it is exactly
            c·(a − 1): zero only when a = 1, which is why the slip hides.
         3. THE TWO-WAY DOOR. One picture, two readings. EXPAND shares a out;
            FACTOR pulls a back. Factoring is this law walked backwards.
         4. THE ALGEBRA LENS. The b dial is renamed x — it always was a
            variable — and a(x + c) = ax + ac is checked at every value by a
            live table. This is the numbers → algebra bridge.

   ---------------------------------------------------------------------------
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock with the lesson, predict-then-check questions gated on
   ANSWERED (not on correct), and a calibration capstone with a live meter.

   ONE-ACCENT DISCIPLINE, adapted to a two-piece figure: the two tiles are
   deliberately NEUTRAL (blue = the a·b piece, teal = the a·c piece) so that
   CARMINE always means "a — the multiplier, the thing that must reach both",
   plus the law itself. Amber appears only as the foil in the duel.

   ALL ARITHMETIC IS EXACT INTEGER. a, b, c are whole numbers and every quantity
   the lab states (products, sums, the missed area, the gcd, the calibration
   gate) is computed in integers — there is no floating-point anywhere in the
   mathematics, which is what a K-12 lab must guarantee. Floats appear only in
   pixel layout.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/DistributiveLab.jsx
     2. Import and render it:
          import DistributiveLab from './DistributiveLab';
          export default function Page() { return <DistributiveLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, c, step, dir…).
     MODEL  — the math is pure integer arithmetic; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Parameters. Three dials: the multiplier outside, and the two terms inside.
   b and c unlock together — they are one idea ("the inside is a SUM"), and
   splitting them across two steps would spend the lesson on dial mechanics
   instead of on the law.
   ------------------------------------------------------------------------- */
const AMAX = 12;
const BMAX = 12;
const CMAX = 12;

const PARAMS = [
  { key: 'a', label: 'a', min: 1, max: AMAX, step: 1, unlock: 1, role: 'the multiplier · outside the parentheses' },
  { key: 'b', label: 'b', min: 1, max: BMAX, step: 1, unlock: 2, role: 'first term inside' },
  { key: 'c', label: 'c', min: 1, max: CMAX, step: 1, unlock: 2, role: 'second term inside' },
];
const START = { a: 3, b: 4, c: 2 };

// Named step indices (0-based) so the renderer and the effects stay readable.
const MULT_STEP = 1; // a — the multiplier outside
const SUM_STEP = 2; // b, c — the inside is a sum
const LAW_STEP = 3; // the pull-apart: a(b+c) = ab + ac
const DUEL_STEP = 4; // the reach duel vs the ab + c slip
const FACTOR_STEP = 5; // expand ⇄ factor
const ALGEBRA_STEP = 6; // b becomes x
const CALIB_STEP = 7; // capstone

/* ---------------------------------------------------------------------------
   MODEL — pure, exact integer arithmetic.

   The whole mathematical content of this lab is these five lines. Everything
   else in the file is presentation. That is deliberate: it makes correctness
   trivially auditable (see audit-distributive.mjs).
   ------------------------------------------------------------------------- */

// Euclid. Operates on non-negative integers; returns an exact integer.
function gcd(m, n) {
  m = Math.abs(m);
  n = Math.abs(n);
  while (n) {
    const t = m % n;
    m = n;
    n = t;
  }
  return m;
}

const whole = (a, b, c) => a * (b + c); // add first, then multiply
const parts = (a, b, c) => a * b + a * c; // multiply each, then add  — equal, always
const slip = (a, b, c) => a * b + c; // the classic error: a never reached c
const missed = (a, c) => c * (a - 1); // whole − slip, the area the slip never bought

/* ---------------------------------------------------------------------------
   CALIBRATION — a CONSTRUCTION goal, not a curve match (the skill sanctions
   this alternative; precedent: CubeLab, MultiplicationLab, LCMLab).

   The task is CCSS 6.NS.B.4 verbatim: given a sum of two whole numbers that
   share a factor, rewrite it as a multiple of a sum of two whole numbers that
   share NO factor. In this lab's letters: given T₁ + T₂, find a(b + c) with
       a·b = T₁,   a·c = T₂,   gcd(b, c) = 1.

   Why the gate is provably sound (and the audit proves it exhaustively):
   if a·b = T₁ and a·c = T₂ then a divides g = gcd(T₁, T₂), and
       gcd(b, c) = gcd(T₁/a, T₂/a) = g/a,
   so gcd(b, c) = 1  ⟺  a = g. The stamp therefore fires exactly on the
   COMPLETE factoring and on nothing else — no threshold, no float compare.

   The meter is diagnostic rather than continuous (precedent:
   GreatestCommonFactorLab), because the interesting near-miss here is not
   "close to the number" but "a correct factoring that is not the greatest":
       40  each term you have hit exactly
       20  bonus, only when both are hit AND nothing is left to pull out
   so 80% means "correct, but a is not yet the greatest common factor" — a real
   teaching moment — and 100% is unreachable without the complete factoring.

   Both orderings are scored and the better one is reported: a student who
   writes 4(2 + 9) for 8 + 36 has done the mathematics right, and the lab must
   not punish the order they happened to read the terms in.
   ------------------------------------------------------------------------- */
/* Every target is curated so that a PARTIAL factoring is reachable on the dials
   as well as the complete one — i.e. some proper divisor d of the gcf has both
   T₁/d ≤ 12 and T₂/d ≤ 12. That is not a detail: the 80% state ("you have
   factored it, but a is not yet the GREATEST common factor") is the whole
   lesson of this capstone, and a target the student can only score 40 or 100 on
   silently drops it.

   Two consequences worth naming, since they rule out otherwise attractive
   targets. A target whose gcf is PRIME (42 + 35, gcf 7) has no non-trivial
   partial factoring at all — mathematically, not just on these dials — so every
   gcf here is composite. And a target whose reduced terms are large (36 + 8 →
   4(9 + 2), the example named in the standard's own text) needs b = 18 to show
   the halfway step, past the dial's 12; that example is taught in the step's
   prose instead. The audit asserts the reachable-partial property for every
   entry rather than trusting this comment.                                    */
const TARGETS = [
  [12, 16], // 4(3 + 4)
  [12, 20], // 4(3 + 5)
  [20, 24], // 4(5 + 6)
  [12, 30], // 6(2 + 5)
  [18, 24], // 6(3 + 4)
  [24, 30], // 6(4 + 5)
  [30, 36], // 6(5 + 6)
  [16, 24], // 8(2 + 3)
  [24, 40], // 8(3 + 5)
  [40, 48], // 8(5 + 6)
  [18, 27], // 9(2 + 3)
  [27, 36], // 9(3 + 4)
  [20, 30], // 10(2 + 3)
  [30, 40], // 10(3 + 4)
  [24, 36], // 12(2 + 3)
  [36, 48], // 12(3 + 4)
  [60, 72], // 12(5 + 6)
];

function scoreOrder(a, b, c, p, q) {
  const m1 = a * b === p;
  const m2 = a * c === q;
  const complete = m1 && m2 && gcd(b, c) === 1;
  let v = 0;
  if (m1) v += 40;
  if (m2) v += 40;
  if (complete) v += 20;
  return { v, m1, m2, complete };
}

// Score against both readings of the target and keep the better one.
function calibScore(a, b, c, T1, T2) {
  const straight = scoreOrder(a, b, c, T1, T2);
  const swapped = scoreOrder(a, b, c, T2, T1);
  return swapped.v > straight.v ? { ...swapped, swapped: true } : { ...straight, swapped: false };
}

function makeTarget(prev) {
  let t;
  do {
    t = TARGETS[Math.floor(Math.random() * TARGETS.length)];
  } while (prev && t[0] === prev[0] && t[1] === prev[1]);
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting. `coef` writes a coefficient the way algebra does — 1x is just x,
   and 0x disappears — so the algebra lens never prints "1x + 6".
   ------------------------------------------------------------------------- */
const coef = (n) => (n === 1 ? 'x' : `${n}x`);
const units = (n) => (n === 1 ? 'square unit' : 'square units');

/* The headline is STEP-AWARE, and that is a pedagogical requirement rather
   than a flourish: before the law step the student has not met a(b+c) = ab+ac
   yet, so the headline must show only the route they know — add first, then
   multiply. Printing the law above a lesson that is still building up to it
   hands over the answer and turns the questions into copying. */
function headline(a, b, c, algebra, step, calib) {
  if (algebra) return `${a}(x + ${c}) = ${coef(a)} + ${a * c}`;
  if (calib) return `${a} × (${b} + ${c}) = ${a * b} + ${a * c}`;
  if (step < LAW_STEP) return `${a} × (${b} + ${c}) = ${a} × ${b + c} = ${whole(a, b, c)}`;
  return `${a} × (${b} + ${c}) = ${a * b} + ${a * c} = ${whole(a, b, c)}`;
}

/* The one-line relation under the big equation, chosen to match the step. */
function subEquation(step, a, b, c, algebra, dir, calib) {
  if (calib) return `your a × (b + c) = ${a} × (${b} + ${c}) = ${a * b} + ${a * c}`;
  if (algebra) return `at x = ${b}:  ${a}(${b} + ${c}) = ${a * b} + ${a * c} = ${whole(a, b, c)}`;
  if (step === DUEL_STEP)
    return `correct ${whole(a, b, c)}  ·  the slip ${a}×${b} + ${c} = ${slip(a, b, c)}  ·  missed ${missed(a, c)}`;
  if (step === FACTOR_STEP)
    return dir === 'factor'
      ? `${a * b} + ${a * c}  →  ${a} × (${b} + ${c})   ·  pull the ${a} back out`
      : `${a} × (${b} + ${c})  →  ${a * b} + ${a * c}   ·  share the ${a} out`;
  if (step === LAW_STEP) return `${a} rows of ${b}, and ${a} rows of ${c}`;
  if (step === MULT_STEP) return `(${b} + ${c}) = ${b + c}, taken ${a} time${a === 1 ? '' : 's'} → ${whole(a, b, c)}`;
  if (step === SUM_STEP) return `width = ${b} + ${c} = ${b + c}`;
  return `${a} × ${b + c} = ${whole(a, b, c)} ${units(whole(a, b, c))}`;
}

/* ---------------------------------------------------------------------------
   Lesson. One idea per step; the dial unlocks with the step; the reveal lives
   in `feedback`, never in `body`; every distractor is a real student
   misconception. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet a × (b + c)',
    body:
      'Parentheses give an instruction: do the inside first. The rectangle here is 3 units tall, and ' +
      'its width is the inside amount, (4 + 2) = 6 — a blue piece of 4 next to a teal piece of 2. So ' +
      'the area is 3 × 6 = 18. The dials are locked for a moment; just look at the shape.',
    q: 'In 3 × (4 + 2), what do you do first?',
    choices: ['Add 4 + 2 = 6, then multiply by 3', 'Multiply 3 × 4 = 12, then add 2', 'Add 3 + 4 = 7, then multiply by 2'],
    answer: 0,
    feedback:
      'Parentheses first: 4 + 2 = 6, then 3 × 6 = 18. Multiplying first is also ' +
      'allowed — done to BOTH terms. That repair is this lab.',
  },
  {
    title: 'a — the multiplier outside',
    body:
      'The a dial is live. a sits outside the parentheses and says how many copies of the whole inside ' +
      'amount you take. On the rectangle a is the HEIGHT. Slide it: the rectangle grows taller, and the ' +
      'width (b + c) never moves.',
    q: 'Leave the inside at (4 + 2) and set a = 5. What is 5 × (4 + 2)?',
    choices: ['30 — five copies of 6', '22 — 5 × 4, then add the 2', '11 — 5 + 4 + 2'],
    answer: 0,
    feedback:
      '5 × (4 + 2) = 5 × 6 = 30 — five copies of the entire inside amount, which is why the rectangle ' +
      'gets five rows tall. The second choice, 22, only gave the 5 to the 4. Watch for it: the ' +
      'multiplier outside owns EVERYTHING inside the parentheses, not just the term it is touching.',
  },
  {
    title: 'b and c — the inside is a sum',
    body:
      'Both inside dials unlock together, because they are one idea: the inside is not a single number, ' +
      'it is a SUM. The width is cut into a blue b piece and a teal c piece. Slide either — the width ' +
      'changes, the height a does not.',
    q: 'Set a = 4 with b = 7 and c = 3. What is 4 × (7 + 3)?',
    choices: ['40 — four copies of 10', '31 — 4 × 7, then add the 3', '14 — 4 + 7 + 3'],
    answer: 0,
    feedback:
      '4 × (7 + 3) = 4 × 10 = 40. The second choice, 31, is the most common mistake in all of school ' +
      'algebra: the 4 multiplied the 7 and forgot the 3. Two steps from now we put it under a ' +
      'microscope and measure exactly what it costs. First, the law.',
  },
  {
    title: 'The law — pull it apart',
    body:
      'Here is the property. Cut between the b piece and the c piece and slide the two apart. Nothing ' +
      'was added; nothing was thrown away. So the two pieces must add back to the whole:  ' +
      'a × (b + c) = a × b + a × c. The left tile is a rows of b. The right tile is a rows of c. Use ' +
      '"Snap together" and "Pull apart" to run it both ways.',
    q: 'Use the law to work out 6 × (5 + 3) without adding first.',
    choices: ['6×5 + 6×3 = 30 + 18 = 48', '6×5 + 3 = 33', '6 + 5 + 3 = 14'],
    answer: 0,
    feedback:
      '6 × (5 + 3) = 6×5 + 6×3 = 30 + 18 = 48 — and adding first gives 6 × 8 = 48 as well, exactly as ' +
      'it must, because the cut moved no area. This is the distributive property of multiplication over ' +
      'addition, and it is the reason you can do 6 × 48 in your head: 6 × 40 + 6 × 8 = 240 + 48 = 288.',
  },
  {
    title: 'Did the a reach both?',
    body:
      'Now the slip, drawn honestly. Writing a × (b + c) = a×b + c gives the multiplier to the first ' +
      'term only. The blue tile is paid for. But of the teal tile the slip buys just ONE row of c — the ' +
      'amber region is area it never bought. Slide a and watch the amber grow.',
    q: 'Compare 5 × (3 + 2) done properly with the slip 5×3 + 2.',
    choices: ['25 and 17 — the slip misses c(a − 1) = 2 × 4 = 8', '25 and 27 — the slip overshoots a little', 'Both give 25 — the 2 is inside, so it is covered either way'],
    answer: 0,
    feedback:
      '25 versus 17. The loss is exactly c × (a − 1) — the rows the multiplier ' +
      'never reached. It vanishes only when a = 1.',
  },
  {
    title: 'Run it backwards — factoring',
    body:
      'One picture, two readings. Left to right you EXPAND: share the a out to both terms. Right to ' +
      'left you FACTOR: both tiles are a tall, so that shared height can be pulled back out in front ' +
      'of the parentheses. Nothing new is being learned here — factoring IS this law, walked backwards.',
    q: 'Rewrite 7×4 + 7×9 as a single product.',
    choices: ['7 × (4 + 9) = 7 × 13 = 91', '(7 + 7) × (4 + 9) = 182', '7 × 4 × 9 = 252'],
    answer: 0,
    feedback:
      '7 × (4 + 9) = 91. The shared 7 comes out front ONCE — it is one factor ' +
      'used by both terms, not one each.',
  },
  {
    title: 'Now the inside can be unknown',
    body:
      'The b dial has been a variable this whole time — a number you are free to change. So call it x. ' +
      'The law never asked what the inside was worth: a × (x + c) = a×x + a×c. Slide x and read the ' +
      'table. The two columns agree at every value, including ones you have not tried. THAT is what it ' +
      'means to call two expressions equivalent.',
    q: 'Expand 3(x + 2).',
    choices: ['3x + 6', '3x + 2', '5x'],
    answer: 0,
    feedback:
      '3(x + 2) = 3x + 6 — the 3 must reach the x AND the 2. The second choice is the reach slip wearing ' +
      'a letter; test it at x = 1, where 3(1 + 2) = 9 but 3(1) + 2 = 5. The third adds the 3 and the 2 ' +
      'as though they were like terms, but 3x and 6 count different things and cannot merge. So ' +
      '3(x + 2) and 3x + 6 are not two answers — they are two spellings of one expression.',
  },
  {
    title: 'Calibration challenge',
    body:
      'The capstone, taken straight from the Grade 6 standard. Its own example: 36 + 8 = 4 × (9 + 2). ' +
      'Both terms share a 4, so the 4 comes out front — and 9 and 2 share nothing, which is what makes ' +
      'it finished. You are handed a sum of two numbers that share a factor. Rewrite it as a × (b + c) ' +
      'by pulling out the GREATEST common factor. Getting both terms right is worth 80%; the last 20% ' +
      'is for leaving nothing behind.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   Layout. The figure is drawn as two PROPORTIONAL tiles — deliberately NOT as
   literal unit squares, which is MultiplicationLab's picture and its alone.
   Each tile's area is exactly its share of the product regardless of the
   stage's shape, so the eye reads a·b against a·c honestly.

   The pull-apart gap is ALWAYS reserved in the fit computation, so that during
   the separation animation the tiles slide but never resize — a rectangle that
   shrinks while it splits would quietly undercut the whole argument, which is
   that the cut conserves area.
   ------------------------------------------------------------------------- */
const GAP = 1.5; // world units reserved between the tiles when fully apart

/* Padding is ASYMMETRIC, and deliberately so. The left margin carries the `a`
   bracket and its "a = N" label; the bottom carries two rows of brackets (b and
   c, then b + c). Centring the figure in a symmetrically-padded box clips those
   labels once the tiles slide apart, so the fit box reserves what each side
   actually has to hold, and the figure is centred WITHIN that box. */
const PAD_L = 74; // the a-bracket (16px) plus room for its label
const PAD_R = 30;
const PAD_Y = 62; // two bracket rows below the figure, and the readout above

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* The drawn separation of an in-flight slide, read from the WALL CLOCK rather
   than accumulated frame by frame. Once `dur` has elapsed this returns exactly
   `to`, whether or not a single animation frame ever ran — so a stalled
   animation degrades to "no animation", never to a stranded picture. */
function easedSep(an) {
  const t = Math.min(1, Math.max(0, (now() - an.t0) / an.dur));
  if (t >= 1) return an.to; // land EXACTLY on the goal — from + (to − from)·1
  //                           carries float residue (0.3 + 0.7 !== 1), and the
  //                           whole self-healing argument wants an equality.
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
  return an.from + (an.to - an.from) * e;
}

function computeLayout(W, H, a, b, c, sep) {
  const fitW = Math.max(10, W - PAD_L - PAD_R);
  const fitH = Math.max(10, H - 2 * PAD_Y);
  const cellMax = Math.min(W, H) / 6; // keeps a 1×2 figure from ballooning
  const cell = Math.min(fitW / (b + c + GAP), fitH / a, cellMax);
  const g = sep * GAP;
  const ox = PAD_L + (fitW - (b + c + g) * cell) / 2;
  const oy = (H - a * cell) / 2;
  return { cell, ox, oy, g };
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function DistributiveLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [c, setC] = useState(START.c);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [dir, setDir] = useState('expand'); // 'expand' | 'factor'
  const [sepGoal, setSepGoal] = useState(0); // where the tiles are heading

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  // The separation is stored as a GOAL in state (sepGoal). animRef describes an
  // in-flight slide DECLARATIVELY — {from, to, t0, dur} — and never holds an
  // accumulated frame value. The drawn separation is therefore a pure function
  // of (state, wall clock): see easedSep. That is what makes the figure
  // self-healing. rAF only ever means "please repaint"; if frames stop arriving
  // — a background tab, an off-screen embed, an idle preview — the next redraw
  // from any source at all (a dial, a hover, a resize, a step) reads the clock,
  // finds the duration elapsed, and lands exactly on the goal.
  const animRef = useRef(null); // { from, to, t0, dur } while sliding, else null
  const goalRef = useRef(0); // the last goal we committed to
  const hoverRef = useRef(null); // 'b' | 'c' | null — which tile is hovered
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const algebra = step === ALGEBRA_STEP && !calib;

  const N = whole(a, b, c);

  // Snapshot everything the renderer needs, so draw() (a stable callback) can
  // never read a stale closure value. Single source of truth: geometry AND
  // labels are both computed from this ref inside draw.
  sceneRef.current = { a, b, c, step, calib, algebra, dir, sepGoal };

  const cal = target ? calibScore(a, b, c, target[0], target[1]) : null;
  const pct = cal ? cal.v : 0;
  const calibrated = !!cal && cal.v === 100;

  /* ---- full redraw from state -------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // capped: crisp, cheap
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    const S = sceneRef.current;
    const A = S.a;
    const B = S.b;
    const C = S.c;
    const duel = S.step === DUEL_STEP && !S.calib;

    const CARM = '#c81e4f';
    const INK = '#1c2b3a';
    const TEAL = '#2e8b6f';
    const BLUE = '#4a7ea5';
    const AMBER = '#bf7b1b';

    // The drawn separation. With no slide in flight this is simply the goal;
    // during one it is the clock-derived interpolation, which converges on the
    // goal on its own. Either way it is never a value some earlier frame left
    // behind. The duel always needs the pieces together.
    const an = animRef.current;
    const sep = duel ? 0 : an ? easedSep(an) : S.sepGoal;
    const { cell, ox, oy, g } = computeLayout(W, H, A, B, C, sep);

    // world → screen. Column u runs 0..B+g+C left→right; row r runs 0..A up.
    const px = (u) => ox + u * cell;
    const py = (r) => oy + (A - r) * cell;
    const rightX = B + g; // left edge of the c tile, in world units

    ctx.clearRect(0, 0, W, H);

    /* ---- quadrille paper: a faint grid on the figure's own unit, extended
            across the whole stage so the tiles sit on graph paper ----------- */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.7)';
    ctx.beginPath();
    for (let k = Math.floor(-ox / cell); k <= Math.ceil((W - ox) / cell); k++) {
      const X = Math.round(ox + k * cell) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    for (let k = Math.floor(-oy / cell); k <= Math.ceil((H - oy) / cell); k++) {
      const Y = Math.round(oy + k * cell) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    /* ---- reusable label chip (paper-white plate so text stays legible over
            any fill or gridline, however small the tile) -------------------- */
    const chip = (text, cx, cy, align, color, bold) => {
      ctx.font = `${bold ? '600 ' : ''}12.5px ui-monospace, "SF Mono", Menlo, monospace`;
      const tw = ctx.measureText(text).width;
      let bx = cx;
      if (align === 'center') bx = cx - tw / 2;
      else if (align === 'right') bx = cx - tw;
      ctx.fillStyle = 'rgba(251,251,248,0.93)';
      ctx.fillRect(bx - 4, cy - 9, tw + 8, 18);
      ctx.fillStyle = color || INK;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, cy);
    };

    // A dimension bracket under a span: a bar with end ticks + a centred label.
    const hBracket = (u1, u2, yS, tick, label, color) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(px(u1), yS);
      ctx.lineTo(px(u2), yS);
      ctx.moveTo(px(u1), yS);
      ctx.lineTo(px(u1), yS - tick);
      ctx.moveTo(px(u2), yS);
      ctx.lineTo(px(u2), yS - tick);
      ctx.stroke();
      ctx.restore();
      chip(label, (px(u1) + px(u2)) / 2, yS + 14, 'center', color);
    };

    // The same, standing up, to the LEFT of the figure — this is always `a`.
    const vBracket = (xS, r1, r2, tick, label, color) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(xS, py(r1));
      ctx.lineTo(xS, py(r2));
      ctx.moveTo(xS, py(r1));
      ctx.lineTo(xS + tick, py(r1));
      ctx.moveTo(xS, py(r2));
      ctx.lineTo(xS + tick, py(r2));
      ctx.stroke();
      ctx.restore();
      // Belt and braces on top of PAD_L: never let a right-aligned label run off
      // the left edge, however cramped the stage gets.
      ctx.font = '12.5px ui-monospace, "SF Mono", Menlo, monospace';
      const lx = Math.max(xS - 7, ctx.measureText(label).width + 6);
      chip(label, lx, (py(r1) + py(r2)) / 2, 'right', color);
    };

    /* ---- the two tiles ----------------------------------------------------
       Neutral fills. Carmine is reserved for `a` and for the law itself, so
       that the accent always answers the question "what is being taught here?"
       rather than "which piece is which?".                                    */
    const hov = hoverRef.current;

    // left tile — a × b
    ctx.fillStyle = hov === 'b' ? 'rgba(74,126,165,0.34)' : 'rgba(199,216,228,0.9)';
    ctx.fillRect(px(0), py(A), B * cell, A * cell);

    // right tile — a × c
    if (duel) {
      // The duel splits this tile: what the slip actually pays for (one row of
      // c) against what it silently misses (the other a−1 rows).
      ctx.fillStyle = 'rgba(46,139,111,0.26)';
      ctx.fillRect(px(rightX), py(1), C * cell, 1 * cell);

      if (A > 1) {
        ctx.fillStyle = 'rgba(191,123,27,0.15)';
        ctx.fillRect(px(rightX), py(A), C * cell, (A - 1) * cell);

        // hatch the missed region, so it reads as a hole and not as a third tile
        ctx.save();
        ctx.beginPath();
        ctx.rect(px(rightX), py(A), C * cell, (A - 1) * cell);
        ctx.clip();
        ctx.strokeStyle = 'rgba(191,123,27,0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const x0 = px(rightX);
        const y0 = py(A);
        const wD = C * cell;
        const hD = (A - 1) * cell;
        for (let k = -Math.ceil(hD / 9); k <= Math.ceil((wD + hD) / 9); k++) {
          ctx.moveTo(x0 + k * 9, y0);
          ctx.lineTo(x0 + k * 9 + hD, y0 + hD);
        }
        ctx.stroke();
        ctx.restore();
      }
    } else {
      ctx.fillStyle = hov === 'c' ? 'rgba(46,139,111,0.36)' : 'rgba(46,139,111,0.2)';
      ctx.fillRect(px(rightX), py(A), C * cell, A * cell);
    }

    /* ---- tile edges ------------------------------------------------------- */
    ctx.save();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(74,126,165,0.85)';
    ctx.strokeRect(px(0) + 0.5, py(A) + 0.5, B * cell - 1, A * cell - 1);
    ctx.strokeStyle = duel ? 'rgba(191,123,27,0.85)' : 'rgba(46,139,111,0.75)';
    ctx.strokeRect(px(rightX) + 0.5, py(A) + 0.5, C * cell - 1, A * cell - 1);
    ctx.restore();

    /* ---- the whole, outlined in carmine when the pieces are together -------
       This is the law made visible: while sep ≈ 0 there is ONE rectangle whose
       area is a(b+c); as it opens, the single outline gives way to two tiles
       whose areas are a·b and a·c. Same paint, two names.                     */
    if (sep < 0.06) {
      ctx.save();
      ctx.lineWidth = 2.75;
      ctx.strokeStyle = CARM;
      ctx.globalAlpha = 1 - sep / 0.06;
      ctx.strokeRect(px(0) + 0.5, py(A) + 0.5, (B + C) * cell - 1, A * cell - 1);
      ctx.restore();
    }

    /* ---- the cut line ----------------------------------------------------- */
    if (sep < 0.06 && !duel) {
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = CARM;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(Math.round(px(B)) + 0.5, py(A));
      ctx.lineTo(Math.round(px(B)) + 0.5, py(0));
      ctx.stroke();
      ctx.restore();
    }

    /* ---- a — the multiplier — bracketed in carmine on the left ------------- */
    vBracket(px(0) - 16, 0, A, 6, `a = ${A}`, CARM);

    /* ---- b and c under their tiles ----------------------------------------
       Same crowding problem as the tile labels, and the same answer: when the
       two bracket labels are close enough to overlap (small b and c, narrow
       stage) they drop to bare numbers. The brackets themselves and the
       blue/teal colours still say which is which, so nothing is lost but the
       letter — whereas two overlapping chips read as one nonsense word. */
    const baseY = py(0) + 16;
    const bLblFull = S.algebra ? `x = ${B}` : `b = ${B}`;
    const cLblFull = `c = ${C}`;
    ctx.font = '12.5px ui-monospace, "SF Mono", Menlo, monospace';
    const centerB = px(B / 2);
    const centerC = px(rightX + C / 2);
    const crowded =
      centerC - centerB < (ctx.measureText(bLblFull).width + ctx.measureText(cLblFull).width) / 2 + 8;
    hBracket(0, B, baseY, 6, crowded ? `${B}` : bLblFull, BLUE);
    hBracket(rightX, rightX + C, baseY, 6, crowded ? `${C}` : cLblFull, TEAL);

    // the whole width, only while the pieces are together (else it is a lie)
    if (sep < 0.06 && !duel) {
      hBracket(0, B + C, baseY + 22, 6, `b + c = ${B + C}`, CARM);
    }

    /* ---- area labels inside the tiles -------------------------------------
       A tile only b units wide has no room for "a×b = ab" once b is small — at
       b = c = 1 on a phone each tile is ~33px against a ~50px label, and the
       two labels collide into an unreadable smear across the middle of the
       figure. So each label degrades to just its product when the full form
       will not fit. The number is the part that matters; the "a×b =" is
       scaffolding the equation readout above already carries. */
    const fits = (text, tileW) => {
      ctx.font = '600 12.5px ui-monospace, "SF Mono", Menlo, monospace';
      return ctx.measureText(text).width <= tileW - 8;
    };
    const tileLabel = (full, short, tileW) => (fits(full, tileW) ? full : short);

    const bW = B * cell;
    const cW = C * cell;

    const lblB = S.algebra ? `${coef(A)}` : tileLabel(`${A}×${B} = ${A * B}`, `${A * B}`, bW);
    chip(lblB, px(B / 2), py(A / 2), 'center', INK, true);

    if (duel) {
      if (A > 1) {
        chip(
          tileLabel(`missed ${C}×${A - 1} = ${missed(A, C)}`, `${missed(A, C)}`, cW),
          px(rightX + C / 2),
          py((A + 1) / 2),
          'center',
          AMBER,
          true,
        );
      }
      chip(`+ ${C}`, px(rightX + C / 2), py(0.5), 'center', TEAL, true);
    } else {
      chip(tileLabel(`${A}×${C} = ${A * C}`, `${A * C}`, cW), px(rightX + C / 2), py(A / 2), 'center', INK, true);
    }

    /* ---- top-left readout: the taught relation, tied to this exact picture - */
    let read = null;
    if (S.calib) {
      read = `${A}×(${B} + ${C}) = ${A * B} + ${A * C}`;
    } else if (duel) {
      read = `${whole(A, B, C)} − ${slip(A, B, C)} = ${missed(A, C)} = ${C}×(${A} − 1)`;
    } else if (S.algebra) {
      read = `${A}(x + ${C}) = ${coef(A)} + ${A * C}`;
    } else if (S.step >= LAW_STEP) {
      read = `${A}×(${B} + ${C}) = ${A * B} + ${A * C} = ${whole(A, B, C)}`;
    } else {
      read = `${A} × ${B + C} = ${whole(A, B, C)}`;
    }
    if (read) {
      ctx.save();
      ctx.font = '600 12.5px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(read).width;
      ctx.fillStyle = 'rgba(251,251,248,0.94)';
      ctx.fillRect(10, 10, tw + 14, 22);
      ctx.strokeStyle = duel ? 'rgba(191,123,27,0.6)' : 'rgba(200,30,79,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(10.5, 10.5, tw + 13, 21);
      ctx.fillStyle = duel ? AMBER : CARM;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(read, 17, 22);
      ctx.restore();
    }
  }, []);

  /* redraw whenever anything that affects the picture changes */
  useEffect(() => {
    draw();
  }, [a, b, c, step, dir, target, sepGoal, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* each step decides where the tiles belong */
  useEffect(() => {
    if (step === LAW_STEP) setSepGoal(1); // the pull-apart IS the lesson here
    else if (step === DUEL_STEP) setSepGoal(0); // the duel needs one rectangle
    else if (step === FACTOR_STEP) setSepGoal(dir === 'expand' ? 1 : 0);
    else if (step === ALGEBRA_STEP || step === CALIB_STEP) setSepGoal(1);
    else setSepGoal(0);
  }, [step, dir]);

  /* The separation animation — time-based (dt), reduced-motion aware, and
     strictly optional.

     `settle` ends the animation by clearing animRef, which makes draw() fall
     back to sepGoal — the correct resting picture. Every exit reaches it: the
     loop completing, reduced motion, and a safety timeout for the case that
     matters most in a drop-in component. A background tab, an off-screen
     embed or an idle preview stops firing rAF entirely; a browser that has
     already painted one frame of the slide would otherwise strand the tiles
     part-way apart, showing a figure that quietly contradicts the lesson.
     Timers keep running (throttled) where frames do not, so the safety net is
     what turns "animation missing" into "no animation" rather than "wrong
     picture". */
  useEffect(() => {
    const to = sepGoal;
    const from = animRef.current ? easedSep(animRef.current) : goalRef.current;
    goalRef.current = to;

    const settle = () => {
      animRef.current = null;
      draw();
    };

    if (Math.abs(from - to) < 1e-6) {
      settle();
      return;
    }

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      settle();
      return;
    }

    const DUR = 680;
    animRef.current = { from, to, t0: now(), dur: DUR };

    let raf;
    const loop = () => {
      const an = animRef.current;
      if (!an) return; // already settled by another path
      draw();
      if (now() - an.t0 < an.dur) raf = requestAnimationFrame(loop);
      else settle();
    };
    raf = requestAnimationFrame(loop);
    const safety = setTimeout(settle, DUR + 400);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
      animRef.current = null;
    };
  }, [sepGoal, draw]);

  /* Entering the challenge: hand it a target and reset the dials to 1 × (1 + 1)
     so it always opens un-matched — a construction challenge is no challenge if
     it starts already solved.

     LEAVING it (the Back button): put the teaching figure back. Without this the
     1 × (1 + 1) the challenge opens from follows the student backwards into the
     lesson, where every step then renders a degenerate one-unit square — the
     duel in particular collapses to its a = 1 special case, the one setting
     where the slip it exists to expose costs nothing at all. */
  const prevStepRef = useRef(0);
  useEffect(() => {
    const was = prevStepRef.current;
    prevStepRef.current = step;
    if (current.calib) {
      if (!target) setTarget(makeTarget(null));
      setA(1);
      setB(1);
      setC(1);
    } else if (STEPS[was] && STEPS[was].calib) {
      setA(START.a);
      setB(START.b);
      setC(START.c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'a') setA(v);
    else if (key === 'b') setB(v);
    else setC(v);
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // The hit-test must use the SAME separation the renderer used, or hovering
    // would pick out a tile that is not where the student sees it.
    const an = animRef.current;
    const sep = step === DUEL_STEP && !calib ? 0 : an ? easedSep(an) : sepGoal;
    const { cell, ox, oy, g } = computeLayout(rect.width, rect.height, a, b, c, sep);
    const u = (mx - ox) / cell;
    const r = (oy + a * cell - my) / cell;
    let h = null;
    if (r >= 0 && r <= a) {
      if (u >= 0 && u <= b) h = 'b';
      else if (u >= b + g && u <= b + g + c) h = 'c';
    }
    if (h !== hoverRef.current) {
      hoverRef.current = h;
      draw();
    }
  };
  const onPointerLeave = () => {
    if (hoverRef.current !== null) {
      hoverRef.current = null;
      draw();
    }
  };

  const resetDials = () => {
    setA(START.a);
    setB(START.b);
    setC(START.c);
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

  /* ---- the algebra lens table — the "for every x" proof, exact integers ---- */
  const xs = [];
  for (let k = -2; k <= 2; k++) if (b + k >= 0) xs.push(b + k);

  const spoken =
    (algebra
      ? `${a} times, open bracket, x plus ${c}, close bracket, equals ${a} x plus ${a * c}.`
      : `${a} times, open bracket, ${b} plus ${c}, close bracket, equals ${a * b} plus ${a * c}, equals ${N}.`) +
    (calib && target ? ` Target ${target[0]} plus ${target[1]}. Match ${pct} percent.` : '');

  const gcdBC = gcd(b, c);

  return (
    <div className="dlab">
      <header className="head">
        <h1>The Distributive Property</h1>
        <p className="lede">
          One rectangle, cut in two. Because the cut moves no area,{' '}
          <span className="mono">a × (b + c)</span> and <span className="mono">a × b + a × c</span> must be
          the same amount — that is the whole law. Pull the pieces apart to see why, watch what the famous{' '}
          <em>a×b + c</em> slip actually costs, run the law backwards to <em>factor</em>, then let the inside
          go unknown and meet <span className="mono">3(x + 2) = 3x + 6</span>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">{headline(a, b, c, algebra, step, calib)}</p>
            <p className="equation-sub mono">{subEquation(step, a, b, c, algebra, dir, calib)}</p>
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
            <span className="hint mono">hover a tile to pick it out</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — factored completely.' : ''}
          </p>

          {/* legend — named only where two colours are actually in play */}
          {step >= LAW_STEP && !calib && (
            <div className="legend" aria-hidden="true">
              <span className="sw sw-b" /> {algebra ? coef(a) : `a × b = ${a * b}`}
              {step === DUEL_STEP ? (
                <>
                  <span className="sw sw-c" /> what the slip pays for: {c}
                  <span className="sw sw-miss" /> what it misses: {missed(a, c)}
                </>
              ) : (
                <>
                  <span className="sw sw-c" /> a × c = {a * c}
                </>
              )}
            </div>
          )}

          {/* the two-way door */}
          {step === FACTOR_STEP && !calib && (
            <div className="seg" role="group" aria-label="Read the law in either direction">
              <button
                type="button"
                className={'segbtn' + (dir === 'expand' ? ' on' : '')}
                aria-pressed={dir === 'expand'}
                onClick={() => setDir('expand')}
              >
                Expand → a(b+c) = ab + ac
              </button>
              <button
                type="button"
                className={'segbtn' + (dir === 'factor' ? ' on' : '')}
                aria-pressed={dir === 'factor'}
                onClick={() => setDir('factor')}
              >
                Factor ← ab + ac = a(b+c)
              </button>
            </div>
          )}

          {/* the algebra lens: equal at every value, not just the one on screen */}
          {algebra && (
            <div className="xtable">
              <table>
                <caption>
                  Both spellings, checked at five values of <span className="mono">x</span>
                </caption>
                <thead>
                  <tr>
                    <th scope="col">x</th>
                    <th scope="col">
                      {a}(x + {c})
                    </th>
                    <th scope="col">
                      {coef(a)} + {a * c}
                    </th>
                    <th scope="col">same?</th>
                  </tr>
                </thead>
                <tbody>
                  {xs.map((v) => (
                    <tr key={v} className={v === b ? 'cur' : ''}>
                      <td className="mono">{v}</td>
                      <td className="mono">
                        {a}({v} + {c}) = {a * (v + c)}
                      </td>
                      <td className="mono">
                        {a * v} + {a * c} = {a * v + a * c}
                      </td>
                      <td className="yes">✓</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="xnote">
                Slide <span className="mono">x</span> anywhere you like — the two columns never disagree,
                because the law never needed to know what <span className="mono">x</span> was worth.
              </p>
            </div>
          )}

          <div className="facts">
            {/* The facts panel unlocks alongside the lesson, for the same reason
                the dials do: "multiply first" and "factored" ARE the reveals of
                steps 4 and 6, so showing them on step 1 would answer the
                questions before they are asked. */}
            {!calib && !algebra ? (
              <>
                <div className="fact">
                  <span className="fact-k">Add first</span>
                  <span className="fact-v mono">
                    {a} × ({b} + {c}) = {a} × {b + c} = {N}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">The rectangle</span>
                  <span className="fact-v mono">
                    {a} tall × {b + c} wide = {N} {units(N)}
                  </span>
                </div>
                {step >= LAW_STEP && (
                  <div className="fact">
                    <span className="fact-k">Multiply first</span>
                    <span className="fact-v mono">
                      {a * b} + {a * c} = {parts(a, b, c)}
                    </span>
                  </div>
                )}
                {step === DUEL_STEP && (
                  <div className="fact">
                    <span className="fact-k">The slip costs</span>
                    <span className="fact-v mono">
                      {c} × ({a} − 1) = {missed(a, c)}
                      {a === 1 ? ' · nothing, only at a = 1' : ''}
                    </span>
                  </div>
                )}
                {step >= FACTOR_STEP && (
                  <div className="fact">
                    <span className="fact-k">Factored</span>
                    <span className="fact-v mono">
                      {a * b} + {a * c} = {a}({b} + {c})
                    </span>
                  </div>
                )}
              </>
            ) : algebra ? (
              <>
                <div className="fact">
                  <span className="fact-k">Expanded</span>
                  <span className="fact-v mono">
                    {a}(x + {c}) = {coef(a)} + {a * c}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">Factored</span>
                  <span className="fact-v mono">
                    {coef(a)} + {a * c} = {a}(x + {c})
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">At x = {b}</span>
                  <span className="fact-v mono">
                    {a * b} + {a * c} = {N}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">True for</span>
                  <span className="fact-v">every value of x — that is what equivalent means</span>
                </div>
              </>
            ) : (
              <>
                <div className="fact">
                  <span className="fact-k">Target sum</span>
                  <span className="fact-v mono">
                    {target ? `${target[0]} + ${target[1]}` : '—'}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">Your two terms</span>
                  <span className="fact-v mono">
                    {a * b} + {a * c}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">Left inside</span>
                  <span className="fact-v mono">
                    gcd({b}, {c}) = {gcdBC}
                    {gcdBC === 1 ? ' · nothing left' : ' · still shareable'}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">Greatest common factor</span>
                  <span className="fact-v mono">
                    {target ? gcd(target[0], target[1]) : '—'}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (sepGoal === 1 ? ' on' : '')}
              onClick={() => setSepGoal(sepGoal === 1 ? 0 : 1)}
              disabled={step < LAW_STEP || step === DUEL_STEP}
              title={
                step < LAW_STEP
                  ? 'Unlocks at the law step'
                  : step === DUEL_STEP
                  ? 'The duel needs the pieces together'
                  : 'Cut the rectangle and slide the pieces apart'
              }
            >
              {sepGoal === 1 ? 'Snap together' : 'Pull apart'}
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
              const val = { a, b, c }[d.key];
              // The b dial is renamed x at the algebra step — same dial, same
              // number. That relabelling IS the lesson: it was always a variable.
              const isX = algebra && d.key === 'b';
              const label = isX ? 'x' : d.label;
              const role = isX ? 'the unknown · we never need its value' : d.role;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{label}</span>
                  <span className="drole">{unlocked ? role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={d.step}
                    value={val}
                    disabled={!unlocked}
                    aria-label={`Dial ${label} — ${role}`}
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
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
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
                Rewrite <strong>{target[0]} + {target[1]}</strong> as <span className="mono">a × (b + c)</span>,
                pulling out the greatest common factor.
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {cal && cal.m1 && cal.m2
                      ? 'terms right — keep factoring'
                      : cal && (cal.m1 || cal.m2)
                      ? 'one term right'
                      : 'neither term yet'}
                  </span>
                )}
              </div>

              {/* The 80% state is the whole point of the challenge, so it gets a
                  real explanation rather than a nudge. */}
              {cal && cal.m1 && cal.m2 && !cal.complete && (
                <p className="partial">
                  <strong>{a} × ({b} + {c})</strong> really does equal {target[0]} + {target[1]} — that is a
                  correct factoring. But {b} and {c} still share {gcdBC}, so there is more to pull out. The
                  standard asks for the <em>greatest</em> common factor: multiply a by {gcdBC} and divide both
                  inside terms by it.
                </p>
              )}
              {calibrated && (
                <p className="factnote">
                  {target[0]} + {target[1]} = {a} × ({b} + {c}). The greatest common factor of {target[0]} and{' '}
                  {target[1]} is {a}, and gcd({b}, {c}) = 1 — nothing is left inside, so this is the complete
                  factoring.
                </p>
              )}
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
                  setDir('expand');
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
        <span className="mono">a × (b + c) = a × b + a × c</span> &nbsp;·&nbsp; the distributive property of
        multiplication over addition, drawn as one rectangle that comes apart and goes back together.
      </footer>

      <style jsx>{`
        .dlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --quad: #c7d8e4;
          --blue: #4a7ea5;
          --teal: #2e8b6f;
          --amber: #bf7b1b;
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
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          color: var(--curve);
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        .stage {
          position: relative;
          width: min(100%, 580px);
          aspect-ratio: 7 / 5;
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
        .legend {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin: 12px 4px 0;
          font: 12.5px/1.6 var(--mono);
          color: var(--ink-soft);
        }
        .legend .sw {
          display: inline-block;
          width: 16px;
          height: 12px;
          border-radius: 3px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          margin-left: 6px;
        }
        .legend .sw-b {
          background: rgba(199, 216, 228, 0.9);
          margin-left: 0;
        }
        .legend .sw-c {
          background: rgba(46, 139, 111, 0.26);
        }
        .legend .sw-miss {
          background: rgba(191, 123, 27, 0.28);
          border-color: rgba(191, 123, 27, 0.7);
        }
        .seg {
          display: flex;
          gap: 0;
          margin: 12px 4px 0;
          border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 8px;
          overflow: hidden;
        }
        .segbtn {
          flex: 1;
          font: 600 12px/1.3 var(--mono);
          padding: 9px 8px;
          border: 0;
          background: var(--paper);
          color: var(--ink-soft);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .segbtn + .segbtn {
          border-left: 1px solid rgba(28, 43, 58, 0.2);
        }
        .segbtn.on {
          background: var(--curve);
          color: #fff;
        }
        .xtable {
          margin: 12px 4px 0;
        }
        .xtable table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }
        .xtable caption {
          caption-side: top;
          text-align: left;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          padding-bottom: 6px;
        }
        .xtable th {
          text-align: left;
          font: 600 11px/1.4 var(--mono);
          color: var(--ink-soft);
          border-bottom: 1px solid rgba(28, 43, 58, 0.18);
          padding: 4px 6px;
        }
        .xtable td {
          padding: 4px 6px;
          border-bottom: 1px solid rgba(28, 43, 58, 0.07);
          font-variant-numeric: tabular-nums;
        }
        .xtable tr.cur td {
          background: rgba(200, 30, 79, 0.07);
          font-weight: 600;
        }
        .xtable td.yes {
          color: var(--ok);
          font-weight: 700;
        }
        .xnote {
          margin: 8px 0 0;
          font-size: 12px;
          color: var(--ink-soft);
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
          grid-template-columns: 26px 1fr 44px;
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
          font-size: 13px;
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
          font-size: 14px;
        }
        .calib-goal strong {
          font-family: var(--mono);
          color: var(--curve);
          font-size: 17px;
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
        .partial {
          margin: 0;
          font-size: 12.5px;
          line-height: 1.55;
          color: var(--ink);
          background: rgba(191, 123, 27, 0.09);
          border-left: 3px solid var(--amber);
          padding: 9px 11px;
          border-radius: 0 6px 6px 0;
        }
        .partial strong {
          font-family: var(--mono);
        }
        .factnote {
          margin: 0;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--ink);
          background: rgba(31, 138, 91, 0.08);
          border-left: 3px solid var(--ok);
          padding: 9px 11px;
          border-radius: 0 6px 6px 0;
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
          .choice,
          .segbtn {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
