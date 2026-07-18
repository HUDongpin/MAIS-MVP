'use client';

/* ============================================================================
   FactoringQuadraticsLab — an interactive "bench" for the keystone Algebra 1
   skill: FACTORING A QUADRATIC.  x² + bx + c = (x + p)(x + q).

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   ONE carmine accent for the mathematical object (here THE FACTORIZATION —
   the pair that works), dials that unlock one per lesson step, predict-then-
   check questions gated on ANSWERED (not correct), and a calibration challenge
   with a live meter and a CALIBRATED stamp that cannot fire falsely.

   ---------------------------------------------------------------------------
   THE MATHEMATICS THIS LAB IS ABOUT

   Multiply (x + p)(x + q) out and you get

        (x + p)(x + q) = x² + (p + q)·x + p·q

   so factoring x² + bx + c means finding TWO NUMBERS that

        MULTIPLY to c   (the product clue)   and   ADD to b   (the sum clue).

   That is the whole subject: a SEARCH for a pair under two constraints.

   ---------------------------------------------------------------------------
   THE SIGNATURE CENTERPIECE — THE CANDIDATE LADDER

   Because c is a fixed integer, the pairs that multiply to c form a COMPLETE,
   FINITE list — the ladder. Every rung is one candidate pair (p, q) with
   p·q = c, drawn on one shared number line as a TWO-STAGE BAR: a segment of
   length p out from 0, then a segment of length q from there. The bar's TIP
   therefore sits at p + q — the pair's SUM.

   One vertical dashed FLAG stands at b. Exactly the rung whose tip lands on the
   flag is the factorization, and it lights carmine.

   The picture earns three things a table of numbers cannot:

     1. The product clue is FREE — every rung already multiplies to c by
        construction. Only the sum is in question. That is why the search is a
        search for a SUM, and the ladder makes that structural.

     2. SIGNS become physical. When c > 0 both segments run the same way (p and
        q share a sign). When c < 0 the bar DOUBLES BACK on itself — the two
        numbers pull in opposite directions — which is exactly why a negative c
        gives a small sum from big factors.

     3. "It does not factor" becomes a PROOF, not a shrug. The ladder is the
        complete list of candidates, so if no rung reaches the flag, no integer
        pair exists. The lab can then say so honestly, and back it with the
        exact test below.

   AT MOST ONE RUNG CAN EVER LAND ON THE FLAG. p and q are precisely the roots
   of t² − b·t + c, so the pair is unique as a multiset — two different rungs
   can never share a sum. The picture is never ambiguous. (Audited.)

   THE EXACT TEST. For a MONIC quadratic with integer b and c:

        x² + bx + c factors over the integers  ⟺  Δ = b² − 4c is a PERFECT SQUARE

   (⇐ p, q = (b ± √Δ)/2; since k² ≡ k (mod 2), √Δ always shares b's parity, so
   b ± √Δ is always even and p, q land on integers. ⇒ is immediate.) Δ ≥ 0 alone
   is NOT enough — x² + x − 1 has Δ = 5 > 0 and irrational roots. This lab is
   careful about that distinction; it is where textbooks mislead.

   ---------------------------------------------------------------------------
   DELIBERATELY DISTINCT from its siblings — state this for any future edit:

     • DistributiveLab owns the RECTANGLE THAT PULLS APART (a(b+c) = ab + ac)
       and its EXPAND|FACTOR door. This lab draws NO rectangle and NO area
       model at all — a 5th rectangle lab would duplicate it, MultiplicationLab
       and MultiDigitMultiplicationLab. Factoring here is a SEARCH, not a split.
     • QuadraticPolynomialLab owns y = ax² + bx + c with the DISCRIMINANT AS
       ROOT-COUNTER (Δ > 0 / = 0 / < 0) and the parabola. Δ appears here too but
       answers a DIFFERENT question — not "how many real roots" but "is the
       factorization INTEGER", i.e. is Δ a perfect square. Same quantity,
       different theorem (cf. PrimeNumbersLab's √N vs FactorLab's √N).
     • PolynomialFunctionLab STARTS from factored form and varies the degree to
       teach roots/multiplicity/end behaviour. This lab ENDS at factored form
       and never draws a curve.
     • FactorLab / PrimeFactorizationLab / GreatestCommonFactorLab factor WHOLE
       NUMBERS (divisor set / prime atoms / shared factors). This factors a
       POLYNOMIAL. FactorLab's own entry already draws exactly this boundary.
     • VariableLab / ExpressionLab / LikeTermsLab own the number-line WALK that
       EVALUATES an expression at one x. The ladder's bars are not a walk in x —
       they are candidates in a search, and nothing on this canvas depends on x.

   Deliberately OUT of scope (kept focused): a ≠ 1 (the "ac-method" and factoring
   by grouping), factoring over the rationals/reals, the quadratic formula,
   completing the square, difference-of-squares as its own lab, and the parabola
   — all natural follow-on labs, and several already have one.

   ---------------------------------------------------------------------------
   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/FactoringQuadraticsLab.jsx
     2. Import and render it:
          import FactoringQuadraticsLab from './FactoringQuadraticsLab';
          export default function Page() { return <FactoringQuadraticsLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (b, c, step, hunt).
     MODEL  — factorPairsOf / findPair / disc are pure math, no pixels. EVERY
              quantity is EXACT INTEGER arithmetic: no floats, no thresholds, no
              rounding decides anything a student is shown or graded on.
     RENDER — the canvas is fully redrawn from a state snapshot on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // the ONE accent = THE FACTORIZATION (the rung that lands on the flag)
const CURVE_SOFT = 'rgba(200,30,79,0.10)';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const OK = '#1f8a5b';
const BLUE = '#3f74a6'; // candidate rungs that do NOT match — calm, never the accent
const MINUS = '−';
const TIMES = '×';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. TWO dials:
     b — the middle coefficient. It is the SUM clue: the flag's position.
     c — the constant term.      It is the PRODUCT clue: it builds the ladder.

   RANGES, and why they are exactly these:
     c ∈ [−12, 12] \ {0}. The largest sum any rung can have is |c| + 1 (the
       (1, c) rung), so |c| ≤ 12 keeps every rung's tip reachable by the b dial.
       It also caps the ladder at 6 rungs (|c| = 12 → three divisor pairs × two
       sign patterns), which stays legible at phone width.
     c = 0 IS EXCLUDED, and this is a correctness decision, not a cosmetic one:
       p·q = 0 is satisfied by (0, k) for EVERY k, so the "complete, finite
       ladder" — the claim the whole centerpiece rests on — would be false. The
       dial skips 0 in the direction of travel (InequalityLab's a ≠ 0 precedent).
       x² + bx = x(x + b) always factors; that easy case is named in the notes.
     b ∈ [−13, 13] covers max |p + q| = |c| + 1 = 13 exactly, so every rung on
       every ladder is reachable — no rung is ever a decoy that cannot be won.
   ------------------------------------------------------------------------- */
const B_MIN = -13;
const B_MAX = 13;
const C_MIN = -12;
const C_MAX = 12;
const PARAMS = [
  { key: 'b', label: 'b', min: B_MIN, max: B_MAX, step: 1, unlock: 2, role: 'the middle coefficient — the SUM clue' },
  { key: 'c', label: 'c', min: C_MIN, max: C_MAX, step: 1, unlock: 3, role: 'the constant term — the PRODUCT clue' },
];
// x² + 7x + 12 = (x + 3)(x + 4) — a clean, factor-rich opening.
const START = { b: 7, c: 12 };

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels. All exact integer arithmetic.
   ------------------------------------------------------------------------- */

/* Every unordered integer pair (p, q) with p·q = c, as p ≤ q, sorted by their
   SUM descending (so the ladder's tips form a clean staircase down the page).

   c > 0 → both factors share a sign: (d, e) and (−e, −d).
   c < 0 → the factors have opposite signs: (−d, e) and (−e, d).
   The (−d, d) case for a c < 0 perfect square is generated twice; deduped. */
function factorPairsOf(c) {
  if (!Number.isInteger(c) || c === 0) return [];
  const A = Math.abs(c);
  const seen = new Set();
  const out = [];
  const push = (p, q) => {
    const key = p + ',' + q;
    if (seen.has(key)) return;
    seen.add(key);
    out.push([p, q]);
  };
  for (let d = 1; d * d <= A; d++) {
    if (A % d !== 0) continue;
    const e = A / d;
    if (c > 0) {
      push(d, e); // both positive
      push(-e, -d); // both negative
    } else {
      push(-d, e); // opposite signs, negative one smaller in size
      push(-e, d); // opposite signs, negative one larger in size
    }
  }
  out.sort((r1, r2) => r2[0] + r2[1] - (r1[0] + r1[1]) || r1[0] - r2[0]);
  return out;
}

/* The factorization of x² + bx + c, or null if there is none over the integers.
   At most one pair can match: p and q are the roots of t² − bt + c, so the
   matching multiset is unique — no two rungs share a sum. */
function findPair(b, c) {
  for (const [p, q] of factorPairsOf(c)) if (p + q === b) return [p, q];
  return null;
}

/* Δ = b² − 4c. Exact integer. */
function disc(b, c) {
  return b * b - 4 * c;
}

/* Integer square root, or −1 if n is not a perfect square. Floats never decide:
   Math.sqrt only proposes a candidate, and the k·k === n test is exact. */
function isqrt(n) {
  if (n < 0) return -1;
  const r = Math.floor(Math.sqrt(n));
  for (let k = Math.max(0, r - 1); k <= r + 1; k++) if (k * k === n) return k;
  return -1;
}
function isPerfectSquare(n) {
  return isqrt(n) >= 0;
}

/* Evaluate x² + bx + c exactly (integers in, integer out). Used for the "check
   by expanding" fact and, in the audit, to prove the factorization is real. */
function evalQuad(b, c, x) {
  return x * x + b * x + c;
}

/* ---------------------------------------------------------------------------
   Formatting helpers. Every one of these is a place a lab can quietly lie to a
   student ("+ −3", "1x", "(x + 0)"), so each is audited.
   ------------------------------------------------------------------------- */
function fmt(n) {
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}

/* "x² + 7x + 12" · "x² − x − 6" · "x² + 9" (b = 0) · "x² − 9" */
function quadString(b, c) {
  let s = 'x²';
  if (b !== 0) s += ` ${b > 0 ? '+' : MINUS} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x`;
  if (c !== 0) s += ` ${c > 0 ? '+' : MINUS} ${Math.abs(c)}`;
  return s;
}

/* "(x + 3)(x + 4)" · "(x − 3)(x + 2)" · "(x + 3)²" for a repeated factor.
   p and q are never 0 (their product is c ≠ 0), so "(x + 0)" cannot occur. */
function factorString(p, q) {
  const t = (v) => `x ${v >= 0 ? '+' : MINUS} ${Math.abs(v)}`;
  return p === q ? `(${t(p)})²` : `(${t(p)})(${t(q)})`;
}

/* "3 × 4" · "−4 × −3" — a rung's label. */
function pairLabel(p, q) {
  return `${fmt(p)} ${TIMES} ${fmt(q)}`;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. "HUNT EVERY b THAT FACTORS."

   c is LOCKED to a target. The ladder is HIDDEN. The student sweeps b and
   presses Catch on each one they believe factors. This is a construction/hunt
   goal (the skill's stated alternative to curve-matching; precedent FactorLab's
   factor hunt and PrimeNumbersLab's prime hunt).

   WHY THIS TASK: for a fixed c, only a handful of b values in the whole range
   factor at all — c = 12 admits exactly 6 of the 27 possible b. Discovering that
   scarcity IS the lesson (most quadratics do not factor over the integers), and
   the only way to find them is to run the sum-product search deliberately.

   NO FALSE STAMP, provably: a b enters `found` ONLY after findPair(b, c) returns
   a real pair — an exact integer test — and duplicates are refused. So
   found ⊆ validBs(c) always holds, hence found.length === validBs(c).length if
   and only if every one has genuinely been found. No float, no threshold, and
   no partial credit can reach 100%.

   The pool: every c here has ≥ 3 winning b, and all of them lie inside the b
   dial's range (audited for reachability).
   ------------------------------------------------------------------------- */
const CALIB_TARGETS = [12, -12, 6, -6, 8, -8, 9, -9, 10, -10, 4, -4];
function makeTarget(prev) {
  let t;
  do {
    t = CALIB_TARGETS[Math.floor(Math.random() * CALIB_TARGETS.length)];
  } while (t === prev && CALIB_TARGETS.length > 1);
  return t;
}
/* Every b for which x² + bx + c factors: exactly the sums of c's factor pairs. */
function validBs(c) {
  return factorPairsOf(c)
    .map(([p, q]) => p + q)
    .sort((m, n) => m - n);
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks WITH its step (the
   unlock index and the step's own text must agree — both are 0-indexed, so
   "Step 3 of 8" is index 2); the reveal lives in `feedback`, shown only after
   answering; distractors are real student errors. Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Two numbers, two jobs',
    body:
      'Multiply (x + 3)(x + 4) out and something tidy happens: the two numbers ADD to make the middle ' +
      'coefficient and MULTIPLY to make the constant. So factoring runs that backwards — given x² + bx + c, ' +
      'hunt for two numbers that add to b and multiply to c. Click any rung of the ladder to test it.',
    q: 'Expand (x + 3)(x + 4). What is the coefficient of the middle x term?',
    choices: [
      '7 — because 3 + 4 = 7',
      '12 — because 3 × 4 = 12',
      '34 — you write the 3 and the 4 side by side',
    ],
    answer: 0,
    feedback:
      '(x + 3)(x + 4) = x² + 4x + 3x + 12 = x² + 7x + 12. The two x terms COLLECT into (3 + 4)x = 7x, so the ' +
      'middle coefficient is the SUM. The 12 is their PRODUCT — it is the constant, not the middle term. In ' +
      'general (x + p)(x + q) = x² + (p + q)x + pq: one pair of numbers, two different jobs.',
  },
  {
    title: 'The product clue: c',
    body:
      'Every rung of the ladder is a pair that multiplies to c = 12 — that is what it takes to get on the ' +
      'ladder at all, and the list is COMPLETE: there are no other whole-number pairs. So the product clue ' +
      'is already spent. Click the rungs and read each one: the product is always right; only the sum varies.',
    q: 'The ladder for c = 12 shows 3 × 4 and 2 × 6, but never 5 × 7. Why not?',
    choices: [
      '5 × 7 = 35, not 12 — it fails the product clue, so it is not a candidate at all',
      'Because 5 and 7 are prime numbers',
      'Because 5 + 7 = 12, and 12 is the constant, not the sum',
    ],
    answer: 0,
    feedback:
      'A pair only earns a rung if it multiplies to c. 5 × 7 = 35 ≠ 12, so it never enters the search. ' +
      '(Watch the third answer — 5 + 7 really does equal 12, which is exactly the trap: it confuses the ' +
      'SUM job with the PRODUCT job. c is what the pair multiplies to.) Being prime is irrelevant here: ' +
      '2 and 3 are prime and both appear on the ladder.',
  },
  {
    title: 'The sum clue: b',
    body:
      'The b dial is live now. b is the SUM the pair must make, and it stands on the canvas as a dashed ' +
      'FLAG. A rung wins only when its tip lands on the flag. Slide b and watch the flag sweep across the ' +
      'ladder — at most one rung can ever be lit, because a sum and a product pin the pair down completely.',
    q: 'With c = 12, set the flag to b = 8. Which rung reaches it?',
    choices: [
      '2 × 6 — it multiplies to 12 and adds to 8, so x² + 8x + 12 = (x + 2)(x + 6)',
      '3 × 4 — it is the rung that worked before',
      '1 × 12 — the biggest pair makes the biggest sum, so it wins',
    ],
    answer: 0,
    feedback:
      '2 × 6 = 12 ✓ and 2 + 6 = 8 ✓, so x² + 8x + 12 = (x + 2)(x + 6). The rung 3 × 4 still multiplies to 12 ' +
      'but now adds to 7 — the right product with the wrong sum, which is the commonest near-miss in this ' +
      'topic. And 1 × 12 does make the biggest sum, 13; that only wins when b is 13.',
  },
  {
    title: 'Change c, rebuild the ladder',
    body:
      'Now the c dial unlocks too. c does not just move a marker — it REBUILDS the whole ladder, because the ' +
      'candidates are the factor pairs of c. A c with many factors gives a long ladder and many chances; a ' +
      'prime c gives a very short one. (c skips 0: x² + bx = x(x + b) always factors — the easy case.)',
    q: 'Set c = 5, a prime. How many rungs does its ladder have?',
    choices: [
      'Two — 1 × 5 and −5 × −1, so only b = 6 or b = −6 can ever factor',
      'Five — one for each number from 1 to 5',
      'None — a prime number cannot be factored',
    ],
    answer: 0,
    feedback:
      'A prime c has just one factor pair up to sign, so its ladder is only two rungs: 1 × 5 (sum 6) and ' +
      '−5 × −1 (sum −6). Every other b in the whole range fails. That is the first hint of something the ' +
      'last steps make exact: MOST quadratics do not factor over the integers. (And 5 does factor — as ' +
      '1 × 5. It is 5 as a WHOLE NUMBER that has no other factors.)',
  },
  {
    title: 'What the signs tell you',
    body:
      'Read the signs before you search — they cut the ladder in half. When c is POSITIVE, p and q share a ' +
      'sign (both segments run the same way), and b says which: both positive if b > 0, both negative if ' +
      'b < 0. When c is NEGATIVE, they have OPPOSITE signs — watch the bar double back on itself, which is ' +
      'why big factors can make a small sum. Try c = −6 with b = −1.',
    q: 'Factor x² − x − 6. What must the two numbers look like?',
    choices: [
      'Opposite signs, since c = −6 < 0: −3 and 2 give −6 and −1, so (x − 3)(x + 2)',
      'Both negative, since both b and c are negative: −3 and −2',
      'It cannot factor, because you cannot multiply to a negative',
    ],
    answer: 0,
    feedback:
      'c = −6 is negative, so one number is negative and one is positive: −3 × 2 = −6 ✓ and −3 + 2 = −1 ✓, ' +
      'giving (x − 3)(x + 2). Two NEGATIVES would multiply to +6, not −6 — that is the sign slip this step ' +
      'exists to catch. On the ladder you can see it: with c < 0 the two segments run opposite ways, so the ' +
      'tip lands close to 0 even when the factors are large.',
  },
  {
    title: 'When nothing lands',
    body:
      'Set b = 1 and c = 1. The ladder for c = 1 has exactly two rungs — 1 × 1 (sum 2) and −1 × −1 (sum −2) ' +
      '— and the flag at 1 stands in open space. This is not "keep looking": the ladder is the COMPLETE list ' +
      'of candidates, so nothing lands means nothing CAN. There is an exact test too: Δ = b² − 4c must be a ' +
      'PERFECT SQUARE. Here Δ = 1 − 4 = −3. It is now in the facts.',
    q: 'x² + x − 1 has Δ = 1 + 4 = 5, which is positive. Does it factor over the integers?',
    choices: [
      'No — Δ must be a perfect SQUARE, and 5 is not one. Its roots are real but irrational',
      'Yes — Δ > 0, so it factors',
      'No — Δ must be negative for a quadratic to factor',
    ],
    answer: 0,
    feedback:
      'This is the trap worth remembering. Δ > 0 only says the roots are REAL; it says nothing about them ' +
      'being whole numbers. To factor over the integers you need Δ to be a perfect square: Δ = 5 is not, so ' +
      'no rung can ever land. Compare x² + x − 6, where Δ = 25 = 5² ✓ → (x + 3)(x − 2). (Δ < 0 is a third ' +
      'case — no real roots at all. QuadraticPolynomialLab graphs what Δ does to the curve.)',
  },
  {
    title: 'Check it by expanding',
    body:
      'Factoring is a claim, and a claim you can check yourself in one line: multiply the factors back out ' +
      'and you must land on exactly the quadratic you started with. Never leave a factorization unchecked — ' +
      'it is the one step that costs nothing and catches every sign slip.',
    q: 'A student factors x² − 5x + 6 as (x − 2)(x − 3). Multiply it back out. Are they right?',
    choices: [
      'Yes — x² − 3x − 2x + 6 = x² − 5x + 6 ✓, since −2 + −3 = −5 and −2 × −3 = 6',
      'No — (x − 2)(x − 3) expands to x² − 5x − 6',
      'No — the two numbers must be 2 and 3, giving (x + 2)(x + 3)',
    ],
    answer: 0,
    feedback:
      'Correct: −2 and −3 multiply to +6 (a negative times a negative) and add to −5, so (x − 2)(x − 3) = ' +
      'x² − 5x + 6 ✓. The second choice makes the classic slip — it treats −2 × −3 as −6. The third gets ' +
      'the product right but the sum wrong: 2 + 3 = +5, which would factor x² + 5x + 6 instead. The signs ' +
      'have to satisfy BOTH clues at once.',
  },
  {
    title: 'Hunt every b that factors',
    body:
      'Final challenge, and the ladder is hidden — this time you run the search. c is locked. Sweep the b ' +
      'dial and press Catch on every b that makes x² + bx + c factor. Work through the factor pairs of c in ' +
      'your head and add each one up. Catch them all to earn CALIBRATED.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function FactoringQuadraticsLab() {
  const [b, setB] = useState(START.b);
  const [c, setC] = useState(START.c);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null); // probed rung index

  // calibration state
  const [target, setTarget] = useState(null); // the locked c
  const [found, setFound] = useState([]); // caught b values (always ⊆ validBs)
  const [tried, setTried] = useState([]); // b values tried and rejected
  const [catchNote, setCatchNote] = useState('');

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const prevStepRef = useRef(0);

  const current = STEPS[step];
  const calib = !!current.calib;

  /* ---- derived facts — single source of truth, all exact integers -------- */
  const rows = factorPairsOf(c);
  const match = findPair(b, c);
  const D = disc(b, c);
  const dRoot = isqrt(D);
  const factorable = match !== null;
  const discUnlocked = step >= 5 || calib;

  // calibration grade. `found` can only ever contain genuine winners, so
  // comparing LENGTHS is a complete and sound test — see EDIT 6.
  const total = calib && target != null ? validBs(target).length : 0;
  const calibrated = calib && target != null && found.length === total;
  const pct = total ? Math.round((100 * found.length) / total) : 0;

  /* Single source of truth snapshot for the renderer. */
  sceneRef.current = {
    ...sceneRef.current,
    b,
    c,
    rows,
    match,
    selected,
    step,
    calib,
    target,
    found,
    tried,
  };

  /* ---- full redraw from the state snapshot ------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const S = sceneRef.current;
    // The target-picking effect lands one render LATER than the step change, so
    // the first calibration render has target == null. Bail rather than crash.
    if (S.calib && S.target == null) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

    /* faint quadrille backdrop */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    const q = 22;
    for (let gx = q; gx < W; gx += q) {
      ctx.moveTo(gx + 0.5, 0);
      ctx.lineTo(gx + 0.5, H);
    }
    for (let gy = q; gy < H; gy += q) {
      ctx.moveTo(0, gy + 0.5);
      ctx.lineTo(W, gy + 0.5);
    }
    ctx.stroke();

    if (S.calib) drawHunt(ctx, W, H, S, MONO);
    else drawLadder(ctx, W, H, S, MONO);
  }, []);

  /* ---------- VIEW 1: THE CANDIDATE LADDER (the centerpiece) ---------- */
  function drawLadder(ctx, W, H, S, MONO) {
    const { b: B, rows: R, selected: SEL } = S;
    const n = R.length;
    const narrow = W < 520;

    const padL = narrow ? 76 : 104; // the "p × q" rung labels live here
    const padR = narrow ? 46 : 66; // the "p + q" sum labels live here
    const padT = 56; // flag pennant + column headers
    const axisY = H - 30;
    const rowsTop = padT;
    const rowsBot = axisY - 20;
    const trackW = W - padL - padR;
    if (trackW < 40 || n === 0) return;

    /* Adaptive extent (MultiplesLab's trick): the scale must contain every
       segment END and every TIP, and also the flag — if b sits beyond every
       rung's reach, seeing that gap is the whole point. */
    let E = 2;
    for (const [p, qq] of R) E = Math.max(E, Math.abs(p), Math.abs(p + qq));
    E = Math.max(E, Math.abs(B));
    const dom = E * 1.12;
    const x = (v) => padL + ((v + dom) / (2 * dom)) * trackW;

    /* --- the zero line --- */
    ctx.strokeStyle = 'rgba(28,43,58,0.22)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x(0), padT - 12);
    ctx.lineTo(x(0), axisY);
    ctx.stroke();

    /* --- the FLAG at b: the criterion every rung is judged against --- */
    const fx = x(B);
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(28,43,58,0.7)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(fx, 30);
    ctx.lineTo(fx, axisY + 5);
    ctx.stroke();
    ctx.restore();
    // pennant
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(fx, 30);
    ctx.lineTo(fx + 15, 35);
    ctx.lineTo(fx, 40);
    ctx.closePath();
    ctx.fill();
    // flag label, clamped so it never clips at the canvas edge
    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`b = ${fmt(B)}`, Math.max(30, Math.min(W - 30, fx)), 10);

    /* --- column headers --- */
    ctx.font = `600 10px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`p ${TIMES} q`, padL - 10, 36);
    ctx.textAlign = 'left';
    ctx.fillText('p + q', W - padR + 8, 36);

    /* --- the rungs --- */
    const rowH = (rowsBot - rowsTop) / n;
    const hits = [];
    for (let i = 0; i < n; i++) {
      const [p, qq] = R[i];
      const s = p + qq;
      const yc = rowsTop + (i + 0.5) * rowH;
      const on = s === B; // this rung IS the factorization
      const sel = i === SEL;
      const yP = yc - 5;
      const yQ = yc + 5;
      hits.push({ i, y0: yc - rowH / 2, y1: yc + rowH / 2 });

      /* probe highlight — a neutral band, never carmine (carmine means MATCH) */
      if (sel) {
        ctx.fillStyle = 'rgba(28,43,58,0.05)';
        ctx.fillRect(4, yc - rowH / 2 + 2, W - 8, rowH - 4);
        ctx.strokeStyle = 'rgba(28,43,58,0.22)';
        ctx.lineWidth = 1;
        ctx.strokeRect(4.5, yc - rowH / 2 + 2.5, W - 9, rowH - 5);
      }
      /* the winning rung gets a soft carmine wash behind it */
      if (on) {
        ctx.fillStyle = CURVE_SOFT;
        ctx.fillRect(4, yc - rowH / 2 + 2, W - 8, rowH - 4);
      }

      const col = on ? CURVE : BLUE;

      /* segment p: out from 0. segment q: on from there. The TIP is the sum.
         They sit on two slightly offset lines so that a c < 0 pair — which
         doubles back — reads as two bars, not one bar drawn over itself. */
      ctx.lineCap = 'round';
      ctx.lineWidth = 7;
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.moveTo(x(0), yP);
      ctx.lineTo(x(p), yP);
      ctx.stroke();

      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(x(p), yQ);
      ctx.lineTo(x(s), yQ);
      ctx.stroke();
      ctx.globalAlpha = 1;

      /* the hand-off connector at p */
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = on ? 'rgba(200,30,79,0.5)' : 'rgba(63,116,166,0.45)';
      ctx.beginPath();
      ctx.moveTo(x(p), yP);
      ctx.lineTo(x(p), yQ);
      ctx.stroke();

      /* the tip: where this pair's sum actually lands */
      ctx.beginPath();
      ctx.arc(x(s), yQ, on ? 5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      if (on) {
        ctx.beginPath();
        ctx.arc(x(s), yQ, 8.5, 0, Math.PI * 2);
        ctx.strokeStyle = CURVE;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      /* rung label (left gutter) */
      ctx.font = `${on ? '700' : '600'} ${narrow ? 10 : 11.5}px ${MONO}`;
      ctx.fillStyle = on ? CURVE : INK_SOFT;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(pairLabel(p, qq), padL - 10, yc);

      /* sum label (right gutter) */
      ctx.font = `${on ? '700' : '600'} ${narrow ? 10 : 11.5}px ${MONO}`;
      ctx.fillStyle = on ? CURVE : INK_SOFT;
      ctx.textAlign = 'left';
      ctx.fillText(fmt(s) + (on ? '  ✓' : ''), W - padR + 8, yc);
    }
    sceneRef.current.hits = hits;

    /* --- the shared number line --- */
    ctx.strokeStyle = 'rgba(28,43,58,0.5)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(padL - 6, axisY);
    ctx.lineTo(W - padR + 6, axisY);
    ctx.stroke();

    /* Label spacing must be decided in PIXELS, not in domain units: the same
       ±14 domain that labels comfortably every 2 on a desktop track overprints
       itself into "−14−12−10−8" on a 375px phone. Pick the smallest nice step
       that still buys each label room to breathe. */
    const LABEL_PX = 26;
    const tickStep = [1, 2, 5, 10].find((s) => (s / (2 * dom)) * trackW >= LABEL_PX) || 10;
    const lim = Math.floor(dom);
    ctx.font = `600 10px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = -lim; v <= lim; v++) {
      const X = x(v);
      const major = v % tickStep === 0;
      ctx.strokeStyle = major ? 'rgba(28,43,58,0.4)' : 'rgba(28,43,58,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X, axisY - (major ? 4 : 2));
      ctx.lineTo(X, axisY + (major ? 4 : 2));
      ctx.stroke();
      if (major) {
        ctx.fillStyle = v === 0 ? INK : INK_SOFT;
        ctx.fillText(fmt(v), X, axisY + 6);
      }
    }
  }

  /* ---------- VIEW 2: THE HUNT (calibration) ---------- */
  function drawHunt(ctx, W, H, S, MONO) {
    const { b: B, target: T, found: F, tried: TR } = S;
    const padL = 34;
    const padR = 34;
    const trackW = W - padL - padR;
    // the axis rides high: the space beneath it is the catch LIST, which grows
    // as you work (up to 6 entries for |c| = 12)
    const axisY = H * 0.42;
    const x = (v) => padL + ((v - B_MIN) / (B_MAX - B_MIN)) * trackW;

    /* caption */
    ctx.font = `600 12px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`c is locked at ${fmt(T)} — which b make x² + bx ${T > 0 ? '+' : MINUS} ${Math.abs(T)} factor?`, W / 2, 12);

    /* the b axis */
    ctx.strokeStyle = 'rgba(28,43,58,0.5)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(padL - 6, axisY);
    ctx.lineTo(W - padR + 6, axisY);
    ctx.stroke();
    ctx.font = `600 10px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = B_MIN; v <= B_MAX; v++) {
      const X = x(v);
      const major = v % 2 === 0;
      ctx.strokeStyle = major ? 'rgba(28,43,58,0.4)' : 'rgba(28,43,58,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X, axisY - (major ? 4 : 2));
      ctx.lineTo(X, axisY + (major ? 4 : 2));
      ctx.stroke();
      if (major) {
        ctx.fillStyle = INK_SOFT;
        ctx.fillText(fmt(v), X, axisY + 7);
      }
    }
    ctx.font = `italic 600 11px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.textAlign = 'left';
    ctx.fillText('b', W - padR + 8, axisY - 16);

    /* tried and rejected — faint ✕ under the axis, so you do not retry them */
    ctx.font = `600 11px ${MONO}`;
    ctx.fillStyle = 'rgba(91,107,123,0.55)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const v of TR) if (!F.includes(v)) ctx.fillText('✕', x(v), axisY + 20);

    /* caught — carmine flags above the axis, labels staggered so neighbours
       (c = 12 puts winners at 7 and 8) never overprint each other */
    const asc = [...F].sort((m, n) => m - n);
    for (let i = 0; i < asc.length; i++) {
      const v = asc[i];
      const X = x(v);
      const topY = axisY - 52;
      ctx.strokeStyle = CURVE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X, axisY);
      ctx.lineTo(X, topY);
      ctx.stroke();
      ctx.fillStyle = CURVE;
      ctx.beginPath();
      ctx.moveTo(X, topY);
      ctx.lineTo(X + 13, topY + 4.5);
      ctx.lineTo(X, topY + 9);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(X, axisY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `700 11px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(fmt(v), X, topY - 4 - (i % 2) * 13);
    }

    /* the current b — an ink caret you sweep */
    const cx = x(B);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(28,43,58,0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, axisY - 60);
    ctx.lineTo(cx, axisY + 34);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(cx, axisY + 36);
    ctx.lineTo(cx - 6, axisY + 46);
    ctx.lineTo(cx + 6, axisY + 46);
    ctx.closePath();
    ctx.fill();
    ctx.font = `700 12px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(quadString(B, T), Math.max(52, Math.min(W - 52, cx)), axisY + 50);

    /* THE CATCH LIST — every b caught so far, with the factorization it earned.
       It is the reward for the hunt AND the lesson in one: seeing the four
       winners stacked makes the sum-product pattern read at a glance. Only
       CAUGHT entries appear, so it never leaks an answer. */
    const listTop = axisY + 78;
    ctx.font = `600 11px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(asc.length ? 'caught so far' : 'sweep b, then press Catch when you think it factors', W / 2, listTop - 16);
    for (let i = 0; i < asc.length; i++) {
      const v = asc[i];
      const pr = findPair(v, T);
      if (!pr) continue;
      const y = listTop + i * 17;
      ctx.font = `700 11.5px ${MONO}`;
      ctx.fillStyle = CURVE;
      ctx.textAlign = 'right';
      ctx.fillText(quadString(v, T), W / 2 - 8, y);
      ctx.fillStyle = INK_SOFT;
      ctx.textAlign = 'center';
      ctx.fillText('=', W / 2, y);
      ctx.fillStyle = CURVE;
      ctx.textAlign = 'left';
      ctx.fillText(factorString(pr[0], pr[1]), W / 2 + 8, y);
    }
  }

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [b, c, step, selected, target, found, tried, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* changing c rebuilds the ladder, so a probed rung index no longer means
     anything — clear it, or a stale highlight lingers on an unrelated rung. */
  useEffect(() => {
    setSelected(null);
  }, [c]);

  /* Entering / leaving the calibration challenge. Leaving MUST restore START:
     otherwise the lesson steps render whatever the hunt left behind. */
  useEffect(() => {
    const wasCalib = !!STEPS[prevStepRef.current]?.calib;
    const nowCalib = !!STEPS[step]?.calib;
    if (nowCalib && !wasCalib) {
      const t = makeTarget(null);
      setTarget(t);
      setC(t);
      setB(0);
      setFound([]);
      setTried([]);
      setCatchNote('');
      setSelected(null);
    } else if (!nowCalib && wasCalib) {
      setTarget(null);
      setB(START.b);
      setC(START.c);
      setFound([]);
      setTried([]);
      setCatchNote('');
      setSelected(null);
    }
    prevStepRef.current = step;
  }, [step]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    let v = parseInt(value, 10);
    if (key === 'b') {
      setB(v);
    } else {
      // c = 0 would make the ladder infinite (0 × anything = 0), which would
      // break the completeness the whole picture rests on. Step over it in the
      // direction of travel.
      if (v === 0) v = c < 0 ? 1 : -1;
      setC(v);
    }
  };
  const resetDials = () => {
    setB(START.b);
    setC(START.c);
    setSelected(null);
  };
  const onStagePointerDown = (e) => {
    if (calib) return;
    const hits = sceneRef.current.hits;
    if (!hits) return;
    const rect = stageRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hit = hits.find((h) => y >= h.y0 && y <= h.y1);
    setSelected(hit ? (hit.i === selected ? null : hit.i) : null);
  };

  /* the hunt: a b enters `found` ONLY on an exact integer match, and never
     twice — that is the whole no-false-stamp argument. */
  const doCatch = () => {
    if (!calib || target == null) return;
    const pair = findPair(b, target);
    if (pair) {
      if (found.includes(b)) {
        setCatchNote(`You already have b = ${fmt(b)}.`);
        return;
      }
      setFound((f) => [...f, b]);
      setCatchNote(`✓ ${quadString(b, target)} = ${factorString(pair[0], pair[1])}`);
    } else {
      if (!tried.includes(b)) setTried((t) => [...t, b]);
      setCatchNote(
        `✕ ${quadString(b, target)} — no pair multiplying to ${fmt(target)} adds to ${fmt(b)}.`
      );
    }
  };
  /* an escape hatch (FactorLab's Auto-finish precedent). It can only ever add a
     GENUINE winner, so the stamp stays sound. */
  const showOne = () => {
    if (!calib || target == null) return;
    const missing = validBs(target).find((v) => !found.includes(v));
    if (missing == null) return;
    const pair = findPair(missing, target);
    setB(missing);
    setFound((f) => [...f, missing]);
    setCatchNote(`✓ ${quadString(missing, target)} = ${factorString(pair[0], pair[1])}`);
  };
  const newTarget = () => {
    const t = makeTarget(target);
    setTarget(t);
    setC(t);
    setB(0);
    setFound([]);
    setTried([]);
    setCatchNote('');
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
  const values = { b, c };

  const probe = selected != null && rows[selected] ? rows[selected] : null;

  /* The spoken description. During the hunt it must NOT name the factorization
     — that is the answer the student is being asked for. */
  const spoken = calib
    ? `Hunt. c is locked at ${fmt(c)}. The current quadratic is ${quadString(b, c)}. ` +
      `You have caught ${found.length} of ${total} values of b.` +
      (calibrated ? ' Calibrated.' : '')
    : `The quadratic is ${quadString(b, c)}. The ladder shows ${rows.length} pairs that multiply to ${fmt(c)}. ` +
      (factorable
        ? `The pair ${fmt(match[0])} and ${fmt(match[1])} adds to ${fmt(b)}, so it factors as ${factorString(match[0], match[1])}.`
        : `No pair adds to ${fmt(b)}, so it does not factor over the integers.`);

  return (
    <div className="fqlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Factoring Quadratics</h1>
        <p className="lede">
          Multiply <em>(x + p)(x + q)</em> out and you get <em>x² + (p + q)x + pq</em> — so factoring{' '}
          <em>x² + bx + c</em> is a hunt for two numbers that <em>multiply to c</em> and <em>add to b</em>.
          Because <em>c</em> is fixed, the candidates form a complete, finite <em>ladder</em>; each rung is
          drawn out on a number line so its tip sits at that pair’s sum. One flag stands at <em>b</em>. The
          rung that reaches it <em>is</em> the factorization — and when nothing reaches it, the ladder proves
          there is nothing to find.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <span className="quad">{quadString(b, c)}</span>
              {/* gated during the hunt: this line IS the answer being asked for */}
              {!calib && factorable && (
                <>
                  {' = '}
                  <span className="fac">{factorString(match[0], match[1])}</span>
                </>
              )}
            </p>
            <p className={'verdict ' + (calib ? 'mute' : factorable ? 'yes' : 'no')}>
              {calib
                ? `caught ${found.length} of ${total}`
                : factorable
                ? `${fmt(match[0])} ${TIMES} ${fmt(match[1])} = ${fmt(c)} and ${fmt(match[0])} + ${fmt(match[1])} = ${fmt(b)}`
                : 'no pair multiplies to c and adds to b — it does not factor over the integers'}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            role="img"
            aria-label={spoken}
            onPointerDown={onStagePointerDown}
          >
            <canvas ref={canvasRef} />
          </div>
          {/* The orientation line lives BELOW the stage, not as a floating chip
              inside it: the shared number line runs along the canvas floor, and
              a bottom-left chip buried its negative tick labels. */}
          {!calib && (
            <p className="caption mono">
              every rung multiplies to c · the tip is its sum · click a rung to test it
            </p>
          )}
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          {/* the probe readout — why a near-miss misses */}
          {!calib && (
            <div className={'probe' + (probe ? '' : ' empty')}>
              {probe ? (
                <>
                  <span className="mono probe-eq">
                    {factorString(probe[0], probe[1])} = {quadString(probe[0] + probe[1], c)}
                  </span>
                  <span className={'probe-v ' + (probe[0] + probe[1] === b ? 'yes' : 'no')}>
                    {probe[0] + probe[1] === b
                      ? `sum ${fmt(b)} = b — this is the factorization`
                      : `product ${fmt(c)} ✓ but sum ${fmt(probe[0] + probe[1])} ≠ b = ${fmt(b)}`}
                  </span>
                </>
              ) : (
                <span className="probe-v">Click a rung to expand it and see how its sum compares with b.</span>
              )}
            </div>
          )}

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={resetDials} disabled={calib}>
              Reset dials
            </button>
          </div>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="sw match" /> the factorization
            </span>
            <span className="lg">
              <span className="sw cand" /> a candidate pair
            </span>
            <span className="lg">
              <span className="sw flag" /> b — the sum to hit
            </span>
          </div>

          {/* FACTS — every one of these is gated on !calib: during the hunt they
              would print the very answer the student is being asked to find. */}
          {!calib && (
            <div className="facts">
              <div className="fact">
                <span className="fact-k">Quadratic</span>
                <span className="fact-v mono">{quadString(b, c)}</span>
              </div>
              <div className="fact">
                <span className="fact-k">Candidate pairs (multiply to {fmt(c)})</span>
                <span className="fact-v mono">
                  {rows.map(([p, qq]) => pairLabel(p, qq)).join(' · ')}
                </span>
              </div>
              <div className="fact wide">
                <span className="fact-k">Factored</span>
                <span className="fact-v mono" style={{ color: CURVE, fontWeight: 700, fontSize: '15px' }}>
                  {factorable
                    ? `${quadString(b, c)} = ${factorString(match[0], match[1])}`
                    : 'does not factor over the integers'}
                </span>
              </div>
              {factorable && (
                <div className="fact">
                  <span className="fact-k">Check by expanding</span>
                  {/* Re-derived from the PAIR (sum and product), not echoed back
                      from the b and c dials — that is what makes it a check.
                      It must go through quadString: a hand-rolled copy of that
                      formatting here printed "x² − 1x − 6". */}
                  <span className="fact-v mono">
                    {factorString(match[0], match[1])} ={' '}
                    {quadString(match[0] + match[1], match[0] * match[1])} ✓
                  </span>
                </div>
              )}
              {factorable && (
                <div className="fact">
                  <span className="fact-k">Zeros (where it equals 0)</span>
                  <span className="fact-v mono">
                    x = {fmt(-match[0])}
                    {match[0] === match[1] ? ' (a double zero)' : `, x = ${fmt(-match[1])}`}
                  </span>
                </div>
              )}
              {discUnlocked && (
                <div className="fact wide">
                  <span className="fact-k">The exact test · Δ = b² − 4c</span>
                  <span className="fact-v mono">
                    Δ = ({fmt(b)})² − 4({fmt(c)}) = {fmt(D)} ·{' '}
                    {dRoot >= 0 ? (
                      <strong style={{ color: OK }}>
                        {fmt(dRoot)}² — a perfect square, so it factors over the integers
                      </strong>
                    ) : (
                      <strong style={{ color: INK_SOFT }}>
                        not a perfect square, so it does not factor over the integers
                        {D > 0 ? ' (its roots are real but irrational)' : D < 0 ? ' (it has no real roots)' : ''}
                      </strong>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
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
            {PARAMS.map((dp) => {
              const unlocked = step >= dp.unlock || calib;
              // c is the locked mystery during the hunt
              const disabled = !unlocked || (calib && dp.key === 'c');
              return (
                <label className={'dial' + (disabled ? ' locked' : '')} key={dp.key}>
                  <span className="dk">{dp.label}</span>
                  <span className="drole">
                    {calib && dp.key === 'c' ? 'locked for the hunt' : unlocked ? dp.role : 'unlocks soon'}
                  </span>
                  <input
                    type="range"
                    min={dp.min}
                    max={dp.max}
                    step={dp.step}
                    value={values[dp.key]}
                    disabled={disabled}
                    aria-label={`Dial ${dp.label} — ${dp.role}`}
                    onChange={(e) => onParam(dp.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? fmt(values[dp.key]) : '🔒'}</output>
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

          {calib && target != null && (
            <div className="calib">
              <p className="calib-lead mono">
                c = <strong>{fmt(target)}</strong> · catch every b that makes x² + bx {target > 0 ? '+' : MINUS}{' '}
                {Math.abs(target)} factor
              </p>
              <div className="slots" aria-label={`Caught ${found.length} of ${total}`}>
                {[...found]
                  .sort((m, n) => m - n)
                  .map((v) => (
                    <span className="slot got mono" key={v}>
                      b = {fmt(v)}
                    </span>
                  ))}
                {Array.from({ length: Math.max(0, total - found.length) }).map((_, i) => (
                  <span className="slot mono" key={'q' + i}>
                    ?
                  </span>
                ))}
              </div>
              <div className="meter" aria-hidden="true">
                <div
                  className="meter-fill"
                  style={{ width: pct + '%', background: calibrated ? OK : undefined }}
                />
              </div>
              <div className="meter-row">
                <span className="mono">
                  found {found.length} of {total}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">{pct}%</span>
                )}
              </div>
              {catchNote && (
                <p className={'catch-note ' + (catchNote.startsWith('✓') ? 'ok' : 'bad')}>{catchNote}</p>
              )}
              {calibrated && (
                <p className="calib-note">
                  Only {total} of {B_MAX - B_MIN + 1} values of b factor at all — the rest have no integer
                  pair. Most quadratics do not factor.
                </p>
              )}
              <div className="calib-btns">
                <button type="button" className="btn" onClick={doCatch} disabled={calibrated}>
                  Catch b = {fmt(b)}
                </button>
                <button type="button" className="btn ghost" onClick={showOne} disabled={calibrated}>
                  Show me one
                </button>
                <button type="button" className="btn ghost" onClick={newTarget}>
                  New c
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
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">(x + p)(x + q) = x² + (p + q)x + pq</span> &nbsp;·&nbsp; so factoring x² + bx +
        c means finding two numbers with product c and sum b. A monic integer quadratic factors over the
        integers exactly when Δ = b² − 4c is a perfect square. CCSS&nbsp;HSA-SSE.B.3a, HSA-SSE.A.2,
        HSA-APR.A.1.
      </footer>

      <style jsx>{`
        .fqlab {
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
          max-width: 74ch;
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
            grid-template-columns: minmax(0, 1fr);
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
          font-size: 20px;
          font-weight: 600;
          margin: 0;
          color: var(--ink);
        }
        .equation .fac {
          color: var(--curve);
          font-weight: 700;
        }
        .verdict {
          font-size: 12.5px;
          margin: 0;
          font-weight: 600;
          font-family: var(--mono);
        }
        .verdict.yes {
          color: var(--curve);
        }
        .verdict.no,
        .verdict.mute {
          color: var(--ink-soft);
        }
        .stage {
          position: relative;
          width: min(100%, 640px);
          aspect-ratio: 16 / 11;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          cursor: pointer;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        /* Up to six rungs stack vertically, so give the ladder a taller stage on
           phones. NEVER pair min-height with aspect-ratio on a grid item — it
           inflates the item's intrinsic WIDTH and blows out the track. */
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 5;
          }
        }
        .caption {
          margin: 8px 4px 0;
          font-size: 10.5px;
          color: var(--ink-soft);
          text-align: center;
        }
        .probe {
          margin: 10px 4px 0;
          padding: 9px 11px;
          border: 1px solid rgba(28, 43, 58, 0.14);
          border-radius: 8px;
          background: var(--paper);
          display: flex;
          gap: 6px 14px;
          flex-wrap: wrap;
          align-items: baseline;
          min-height: 20px;
        }
        .probe.empty {
          border-style: dashed;
          background: transparent;
        }
        .probe-eq {
          font-size: 13.5px;
          font-weight: 700;
        }
        .probe-v {
          font-size: 12px;
          color: var(--ink-soft);
        }
        .probe-v.yes {
          color: var(--curve);
          font-weight: 700;
        }
        .probe-v.no {
          color: var(--ink-soft);
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
        }
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          justify-content: center;
          margin: 12px 4px 2px;
          font-size: 12px;
          color: var(--ink-soft);
        }
        .lg {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .sw {
          width: 15px;
          height: 15px;
          border-radius: 3px;
          display: inline-block;
          box-sizing: border-box;
        }
        .sw.match {
          background: rgba(200, 30, 79, 0.12);
          border: 2px solid var(--curve);
        }
        .sw.cand {
          background: rgba(63, 116, 166, 0.14);
          border: 1.4px solid var(--blue);
        }
        .sw.flag {
          background: transparent;
          border: 0;
          border-left: 2px dashed var(--ink);
          border-radius: 0;
          width: 8px;
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
        .fact.wide {
          grid-column: 1 / -1;
        }
        .fact-k {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v {
          font-size: 13px;
          font-variant-numeric: tabular-nums;
          line-height: 1.5;
        }
        .toolbar .btn {
          margin: 0;
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
          grid-template-columns: 22px 1fr 54px;
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
          color: var(--blue);
        }
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
          accent-color: var(--blue);
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
        .calib-lead {
          font-size: 13px;
          margin: 0;
          color: var(--ink-soft);
        }
        .calib-lead strong {
          color: var(--curve);
          font-size: 16px;
        }
        .slots {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .slot {
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px dashed rgba(28, 43, 58, 0.3);
          color: var(--ink-soft);
          min-width: 22px;
          text-align: center;
        }
        .slot.got {
          border: 1px solid var(--curve);
          border-style: solid;
          color: var(--curve);
          background: rgba(200, 30, 79, 0.07);
        }
        .catch-note {
          font-size: 12.5px;
          margin: 0;
          font-family: var(--mono);
          line-height: 1.5;
        }
        .catch-note.ok {
          color: var(--ok);
        }
        .catch-note.bad {
          color: var(--ink-soft);
        }
        .calib-note {
          font-size: 12.5px;
          margin: 0;
          color: var(--ok);
        }
        .calib-btns {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
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
          transition: width 0.14s ease-out;
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
        :global(.fqlab) :focus-visible {
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
