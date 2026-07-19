'use client';

/* ============================================================================
   ExponentRulesLab — an interactive "bench" for the properties of integer
   exponents (Grade 8; CCSS 8.EE.A.1 — "Know and apply the properties of
   integer exponents to generate equivalent numerical expressions").

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions (Next gated on ANSWERED, not
   CORRECT), and a calibration challenge with a live meter and a CALIBRATED
   stamp.

   THE SIGNATURE CENTERPIECE is THE FACTOR TRAIN. A power b^e is drawn as |e|
   tiles, each stamped with the base b — because that is exactly what a power
   IS: a count of factors. The tiles sit ABOVE a fraction bar when e > 0 and
   BELOW it when e < 0; when e = 0 the train is empty. Every rule is then just
   RE-COUNTING the same tiles — no tile is ever created or destroyed:

       b^m · b^n   couple the two trains          →  m + n tiles
       b^m ÷ b^n   flip the second train under
                   the bar; each above/below pair
                   is b ÷ b = 1 and cancels        →  m − n tiles
       (b^m)^n     lay down n copies of the
                   m-train                         →  m × n tiles
       b^0         cancel every tile: an empty
                   train is the empty product      →  1
       b^-n        cancel PAST the end: the
                   stranded tiles are under the bar →  1 / b^n

   THE THESIS the picture is built to deliver: the operation on the POWERS
   becomes the operation one level SIMPLER on the EXPONENTS — multiply→add,
   divide→subtract, power→multiply. The rules are not arbitrary conventions to
   memorise; they are what counting forces. b^0 = 1 and b^-n = 1/b^n are
   likewise FORCED (each is one picture read two ways), not invented.

   DELIBERATELY DISTINCT from its siblings:
     • ExponentialFunctionLab graphs the exponential FUNCTION y = a·b^x + k as
       a CURVE, with a continuous x and a ×b staircase. This lab draws NO curve
       and NO staircase: the exponent here is a whole-number COUNT, and the
       object is the algebra of the rules, not the shape of the growth.
     • LogarithmLab is the inverse function, y = a·log_b(x−h)+k — also a curve.
     • MultiplicationLab owns the ARRAY / AREA model (a × b as a rectangle of
       unit squares whose AREA is the product). The power-of-a-power step here
       draws n stacked COPIES of a train — the tiles are counted, never read as
       an area, and no side lengths or area are labelled. The grid counts
       EXPONENTS; the array model measures a product.
     • PrimeFactorizationLab / FactorLab decompose a specific N into its prime
       atoms (exponent form is incidental notation there). Here the base is an
       arbitrary dial and nothing is factored.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/ExponentRulesLab.jsx
     2. Import and render it:
          import ExponentRulesLab from './ExponentRulesLab';
          export default function Page() { return <ExponentRulesLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (b, m, n, op, step).
     MODEL  — resultExp / poolOf / ratPowInt … are pure math; they know no
              pixels. All values are EXACT rationals over BigInt, so nothing a
              student reads is ever a rounded float.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // accent 1 = the exponent m and every tile it owns
const TEAL = '#0f8f86'; // accent 2 = the exponent n and every tile it owns
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const PAPER = '#fbfbf8';
const OK = '#1f8a5b';
const BLUE = '#3f74a6';
const MINUS = '−'; // U+2212, not a hyphen
const TIMES = '×';
const CDOT = '·';
const DIV = '÷';

/* Two accents, on purpose — the documented relaxation of the one-accent rule
   (the same call ExpressionLab makes for its two variables x and y): CARMINE
   is the exponent m and every tile that came from it, TEAL is the exponent n
   and its tiles. The result train re-uses those same two colours, because the
   whole point of every rule on this page is that the answer's tiles ARE the
   input's tiles, merely re-counted. A third colour would break that link. */

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.

   Values are EXACT rationals held as BigInt pairs {n, d} with d > 0, always
   reduced — never floats. The reason is not fussiness: a negative exponent IS
   a fraction, and most of them have no exact float. 3^-4 is 1/81, which as a
   double is 0.0123456790123456789…, so a float-valued lab would have to print
   a rounded decimal for a number the student can name exactly. Whole powers
   also run to 10^16 here, past 2^53 where integer exactness stops being
   structural. BigInt is native and adds no dependency. NOTE: BigInt(x)
   constructor calls and a multiply loop are used
   in place of `2n` literals and the `**` operator, so the file also compiles
   under a plain Babel `react` preset (the verify harness) where `**` would be
   rewritten to Math.pow and blow up on BigInt operands.
   ------------------------------------------------------------------------- */
const ZERO = BigInt(0);
const ONE = BigInt(1);

function babs(x) {
  return x < ZERO ? -x : x;
}
function bgcd(a, b) {
  let x = babs(a);
  let y = babs(b);
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}
function makeRat(n, d) {
  let nn = n;
  let dd = d;
  if (dd < ZERO) {
    nn = -nn;
    dd = -dd;
  }
  const g = bgcd(nn, dd) || ONE;
  return { n: nn / g, d: dd / g };
}
function mulRat(A, B) {
  return makeRat(A.n * B.n, A.d * B.d);
}
function divRat(A, B) {
  return makeRat(A.n * B.d, A.d * B.n);
}
function eqRat(A, B) {
  return A.n === B.n && A.d === B.d;
}
// integer power of a BigInt by repeated multiplication (e >= 0)
function bpow(base, e) {
  let r = ONE;
  for (let i = 0; i < e; i++) r = r * base;
  return r;
}
// b^e as an exact rational, for any integer e. b is a positive integer >= 2,
// so this never has to face 0^0 or 0^-n (both undefined) — see B_MIN.
function ratPowInt(b, e) {
  const B = BigInt(b);
  return e >= 0 ? { n: bpow(B, e), d: ONE } : { n: ONE, d: bpow(B, -e) };
}
// an exact rational raised to an integer power
function ratPow(A, e) {
  if (e >= 0) return makeRat(bpow(A.n, e), bpow(A.d, e));
  return makeRat(bpow(A.d, -e), bpow(A.n, -e));
}

/* THE RULES themselves — the exponent arithmetic each operator performs.
   This one three-line function is the entire mathematical claim of the lab;
   audit-exponentrules.mjs proves it against an independent reference over
   every reachable state and well beyond. */
function resultExp(op, m, n) {
  if (op === 'mul') return m + n; // b^m · b^n = b^(m+n)
  if (op === 'div') return m - n; // b^m ÷ b^n = b^(m−n)
  return m * n; //                  (b^m)^n   = b^(m·n)
}

/* The value computed the SLOW, honest way — actually combine the two powers —
   so the readout can CHECK the rule rather than assert it. */
function directValue(b, op, m, n) {
  const A = ratPowInt(b, m);
  const B = ratPowInt(b, n);
  if (op === 'mul') return mulRat(A, B);
  if (op === 'div') return divRat(A, B);
  return ratPow(A, n);
}

/* THE TILE POOL — the picture, as data.

   Every power contributes |e| tiles: above the bar when e > 0, below when
   e < 0. Division is not a separate mechanism — dividing by b^n is multiplying
   by b^-n, so the ÷ case simply FLIPS the second train's sign and then the
   pools are identical. That is why one function serves both rules, and why the
   lab can honestly say the quotient rule IS the product rule.

   Tiles are tagged by which exponent they came from ('m' or 'n') so they keep
   their colour all the way into the result — the conservation the lesson leans
   on. Cancellation pairs above[i] with below[i], so the survivors are the tail
   of the longer row. */
function poolOf(op, m, n) {
  const e2 = op === 'div' ? -n : n;
  const above = [];
  const below = [];
  for (let i = 0; i < Math.abs(m); i++) (m > 0 ? above : below).push('m');
  for (let i = 0; i < Math.abs(e2); i++) (e2 > 0 ? above : below).push('n');
  return { above, below, e2 };
}
function cancelCount(pool) {
  return Math.min(pool.above.length, pool.below.length);
}
// the tiles left standing after cancellation, in order — the result train
function survivors(pool) {
  const k = cancelCount(pool);
  const longer = pool.above.length >= pool.below.length ? pool.above : pool.below;
  return longer.slice(k);
}

/* ---------------------------------------------------------------------------
   Formatting helpers. Everything a student reads is exact.
   ------------------------------------------------------------------------- */
function group(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtRat(r) {
  const neg = r.n < ZERO;
  const a = neg ? -r.n : r.n;
  return (neg ? MINUS : '') + (r.d === ONE ? group(a) : group(a) + '/' + group(r.d));
}
function digitCount(r) {
  return (r.d === ONE ? babs(r.n) : r.d).toString().length;
}
function fmtExp(e) {
  return (e < 0 ? MINUS : '') + Math.abs(e);
}
// a real superscript for plain-text contexts (canvas captions, aria) — the
// notation a student reads must never degrade to "2^5"
const SUPS = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', [MINUS]: '⁻' };
function supStr(e) {
  return fmtExp(e)
    .split('')
    .map((c) => SUPS[c] || c)
    .join('');
}
// the exponent arithmetic as a sentence: "3 + 2 = 5"
function expSentence(op, m, n) {
  const glyph = op === 'mul' ? '+' : op === 'div' ? MINUS : TIMES;
  const nn = n < 0 ? '(' + fmtExp(n) + ')' : fmtExp(n);
  return fmtExp(m) + ' ' + glyph + ' ' + nn + ' = ' + fmtExp(resultExp(op, m, n));
}
// the expanded product, e.g. "2 × 2 × 2" (or its reciprocal when e < 0)
function expanded(b, e) {
  if (e === 0) return '(empty product)';
  const body = new Array(Math.abs(e)).fill(String(b)).join(' ' + TIMES + ' ');
  return e > 0 ? body : '1 / (' + body + ')';
}
function spokenRat(r) {
  return r.d === ONE ? r.n.toString() : '1 over ' + r.d.toString();
}
// "-2" is read out inconsistently by screen readers (and this lab is ABOUT
// negative exponents), so say it in words
function spokenExp(e) {
  return e < 0 ? 'negative ' + Math.abs(e) : String(e);
}

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Three dials plus one operator toggle, unlocking one per
   lesson step.

     b — the BASE: what gets multiplied. Stamped on every tile. Starts at 2 and
         never reaches 0 or 1, which keeps the lab away from 0^0 and 0^-n (both
         genuinely undefined) without ever having to fake a special case.
     m — the first EXPONENT: how many tiles. The star.
     n — the second exponent, once a second power joins.

   Exponents run −4..4. That bound is load-bearing for the calibration puzzle:
   m+n and m−n can only reach ±8, while m·n reaches ±16 but skips 5, 7, 10, 11,
   … — so a target of 12 is reachable ONLY through the power rule, and a target
   of 7 ONLY through adding or subtracting. The puzzle can therefore demand a
   specific rule instead of rewarding a shrug.
   ------------------------------------------------------------------------- */
const B_MIN = 2;
const B_MAX = 10;
const E_MIN = -4;
const E_MAX = 4;
const PARAMS = [
  { key: 'b', label: 'b', min: B_MIN, max: B_MAX, step: 1, unlock: 2, role: 'the base — what gets multiplied' },
  { key: 'm', label: 'm', min: E_MIN, max: E_MAX, step: 1, unlock: 1, star: true, role: 'the first exponent — how many tiles' },
  { key: 'n', label: 'n', min: E_MIN, max: E_MAX, step: 1, unlock: 3, second: true, role: 'the second exponent' },
];
const START = { b: 2, m: 3, n: 2, op: 'mul' }; // opens on 2³ (= 8), then 2³ · 2² = 2⁵ = 32

/* The operator is a segmented toggle, not a slider — it picks a RULE, and the
   options unlock one at a time like the dials do. */
const OPS = [
  { key: 'mul', glyph: CDOT, name: 'multiply', unlock: 3 },
  { key: 'div', glyph: DIV, name: 'divide', unlock: 4 },
  { key: 'pow', glyph: '^', name: 'power of a power', unlock: 7 },
];
const opUnlock = (k) => OPS.find((o) => o.key === k).unlock;

/* The rule card — the lab's actual deliverable. Rows light up as their step is
   reached, so the student assembles the five same-base rules themselves. */
const RULES = [
  { unlock: 3, key: 'mul', gloss: 'Multiplying powers ADDS the exponents — the trains couple.' },
  { unlock: 4, key: 'div', gloss: 'Dividing powers SUBTRACTS them — matched tiles cancel.' },
  { unlock: 5, key: 'zero', gloss: 'Cancel every tile: an empty train is the empty product.' },
  { unlock: 6, key: 'neg', gloss: 'Cancel past the end: a minus sign means "under the bar".' },
  { unlock: 7, key: 'pow', gloss: 'A power of a power MULTIPLIES them — n copies of m tiles.' },
];

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration ("build the target power").

   The base is pinned; a grey ghost train shows the target power b^T. Set the
   operator and the two exponents so YOUR train is exactly as long as the ghost.

   The stamp is decided by an EXACT INTEGER comparison, E === T, where E is
   m+n, m−n or m·n — never a float, so a false CALIBRATED is impossible by
   construction. The meter is the exact integer distance |E − T| as well.

   The pool is curated to make each rule necessary at least once:
     T = 12, 16, −9 …… |T| > 8 or an odd prime spacing ⇒ ONLY m·n reaches it
     T = 7, −5 ………… prime and > 4, so m·n cannot ⇒ ONLY m+n / m−n reach it
     T = 0 …………… the b^0 = 1 round
     T = −3, −4 ……… a negative target: the answer is a reciprocal
   None of these equals 2, which is what the reset state (mul, m=1, n=1) makes,
   so no round is ever handed to the student pre-solved. audit-exponentrules.mjs
   proves both of those claims by exhaustive sweep.
   ------------------------------------------------------------------------- */
const CALIB_TARGETS = [
  { b: 2, T: 12 },
  { b: 2, T: 7 },
  { b: 3, T: -4 },
  { b: 10, T: -3 },
  { b: 5, T: 6 },
  { b: 2, T: 16 },
  { b: 3, T: 0 },
  { b: 10, T: 4 },
  { b: 2, T: -9 },
  { b: 6, T: 8 },
];
const CALIB_RESET = { m: 1, n: 1, op: 'mul' };

function makeTarget(prev) {
  let t;
  do {
    t = CALIB_TARGETS[Math.floor(Math.random() * CALIB_TARGETS.length)];
  } while (prev && t.T === prev.T && t.b === prev.b && CALIB_TARGETS.length > 1);
  return t;
}
// every (op, m, n) that lands on the target exponent. Note this does not depend
// on the base at all — the exponent arithmetic is the same for every b.
function solutionsFor(T) {
  const out = [];
  for (const o of OPS)
    for (let m = E_MIN; m <= E_MAX; m++)
      for (let n = E_MIN; n <= E_MAX; n++) if (resultExp(o.key, m, n) === T) out.push({ op: o.key, m, n });
  return out;
}
function reachableWithOp(op, T) {
  for (let m = E_MIN; m <= E_MAX; m++)
    for (let n = E_MIN; n <= E_MAX; n++) if (resultExp(op, m, n) === T) return true;
  return false;
}
const MATCH_SPAN = 8; // exponents this far off read as 0% — the meter's scale
function matchPercent(E, T) {
  return 100 * Math.max(0, 1 - Math.abs(E - T) / MATCH_SPAN);
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with its step; the
   reveal lives in `feedback` (shown after answering, never in the intro); the
   distractors are the real, documented Grade-8 misconceptions — 2³ = 6 (base
   times exponent), 2³·2² = 4⁵ (multiplying the bases), 2³·2² = 2⁶ (multiplying
   the exponents, the right rule for the wrong expression), 7⁰ = 0, 2⁻³ = −8,
   and (2³)² = 2⁹ (reading a power of a power as a tower). Next is gated on
   ANSWERED, not CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the power',
    body:
      'A power is repeated multiplication: 2³ means 2 × 2 × 2 — three 2s. The small raised number ' +
      'is the EXPONENT; its only job is to COUNT copies of the BASE. Every carmine tile below is ' +
      'one factor of 2 — the length of the train IS the exponent.',
    q: 'What does 2³ mean?',
    choices: [
      '2 × 2 × 2 = 8 — three 2s multiplied',
      '2 × 3 = 6 — the base times the exponent',
      '3 × 3 × 3 = 27 — three 3s multiplied',
    ],
    answer: 0,
    feedback:
      '2³ = 2 × 2 × 2 = 8. The exponent COUNTS factors — it is no multiplier, so 2 × 3 = 6 is the ' +
      'classic slip. And the base is 2, not 3: 3 × 3 × 3 = 27 is a different power (3³). Count the ' +
      'tiles: three, each stamped 2.',
  },
  {
    title: 'The exponent counts the factors',
    body:
      'The m dial is live. Slide it and tiles join or leave the train — m IS the tile count. Each ' +
      'extra tile multiplies the running value by another 2: the numbers climb 2, 4, 8, 16 … A ' +
      'power grows by MULTIPLYING, so it gets big in a hurry.',
    q: 'Slide m to 5. What is 2⁵?',
    choices: ['32 — five 2s multiplied: 2·2·2·2·2', '10 — that is 2 × 5', '25 — that is 5 × 5'],
    answer: 0,
    feedback:
      '2⁵ = 2·2·2·2·2 = 32 — five tiles, each doubling the value: 2, 4, 8, 16, 32. Both wrong ' +
      'answers mix up the roles: 2 × 5 = 10 treats the exponent as a multiplier; 5 × 5 = 25 swaps ' +
      'base and exponent.',
  },
  {
    title: 'The base rides along',
    body:
      'The b dial re-stamps every tile at once. The base is WHAT gets multiplied; the exponent is ' +
      'HOW MANY. Slide b from 2 to 3: the train keeps its three tiles but now reads 3 × 3 × 3 = 27. ' +
      'Different jobs — swapping them changes the answer.',
    q: 'Which is larger, 2⁵ or 5²?',
    choices: ['2⁵ = 32 is larger than 5² = 25', 'They are equal — same two numbers', '5² = 25 is larger'],
    answer: 0,
    feedback:
      '2⁵ = 32 and 5² = 25, so 2⁵ is larger — base and exponent are not interchangeable. (Exactly ' +
      'one pair of different whole numbers swaps evenly: 2⁴ = 4² = 16.)',
  },
  {
    title: 'Multiply powers → ADD the exponents',
    body:
      'A second power joins: bᵐ · bⁿ. Multiplying writes every factor in one long line, so the two ' +
      'trains COUPLE — carmine tiles, then teal. Count them: m tiles, then n more. That is the whole ' +
      'product rule — no tile created or destroyed, only re-counted.',
    q: '2³ · 2² = ?',
    choices: [
      '2⁵ — three 2s then two more 2s is five 2s',
      '4⁵ — multiply the bases and add the exponents',
      '2⁶ — multiply the exponents',
    ],
    answer: 0,
    feedback:
      '2³ · 2² = (2·2·2) · (2·2) = 2⁵ = 32; check: 8 × 4 = 32 ✓. The base never changes — every ' +
      'tile still says 2 — so never a power of 4. And 2⁶ multiplies the exponents: the rule for a ' +
      'different expression, (2³)², coming soon.',
  },
  {
    title: 'Divide powers → SUBTRACT the exponents',
    body:
      'Switch the operator to ÷. Dividing by bⁿ flips that train below the bar — dividing is ' +
      'multiplying by the reciprocal. Every tile on top pairs off with one underneath; each pair ' +
      'is b ÷ b = 1 and cancels. What survives is m − n tiles.',
    q: '3⁵ ÷ 3² = ?',
    choices: [
      '3³ — two of the five 3s cancel, three are left',
      '3^2.5 — divide the exponents',
      '1³ — the 3s all cancel and leave 1',
    ],
    answer: 0,
    feedback:
      '3⁵ ÷ 3² = (3·3·3·3·3) / (3·3): two pairs cancel, leaving 3³ = 27. Check: 243 ÷ 9 = 27 ✓. ' +
      'Exponents are never divided. Cancelling only turns matched PAIRS into 1 — the unpaired ' +
      'tiles still stand.',
  },
  {
    title: 'Cancel everything: b⁰ = 1',
    body:
      'Set m = n with ÷ — try 2³ ÷ 2³. Every tile pairs off and cancels; the train is empty. Read ' +
      'that picture two ways: a number divided by itself is 1, and the quotient rule makes the ' +
      'exponent 3 − 3 = 0, i.e. 2⁰. Both describe the same thing, so b⁰ can only be 1.',
    q: 'What is 7⁰?',
    choices: [
      '1 — because 7³ ÷ 7³ = 1 and the rule makes it 7⁰',
      '0 — zero copies means nothing at all',
      '7 — an exponent of 0 does nothing',
    ],
    answer: 0,
    feedback:
      '7⁰ = 1 — not a decree; the quotient rule forces it. 7³ ÷ 7³ is plainly 1, and the rule calls ' +
      'it 7⁰, so they must agree. An empty product is 1 as an empty sum is 0 — the value that ' +
      'changes nothing. (The one exception, 0⁰, is undefined; hence the base starts at 2.)',
  },
  {
    title: 'Cancel past the end: negative exponents',
    body:
      'What if the bottom train is longer? Try 2² ÷ 2⁵: two pairs cancel, but three tiles stay ' +
      'stranded UNDER the bar — a reciprocal, 1/2³. The rule agrees: 2 − 5 = −3. A negative ' +
      'exponent is not a negative number; it means "this many factors underneath".',
    q: 'What is 2⁻³?',
    choices: ['1/8 — three 2s under the bar', '−8 — the answer turns negative', '−6 — that is 2 × (−3)'],
    answer: 0,
    feedback:
      '2⁻³ = 1/2³ = 1/8 — small and POSITIVE. The minus flips factors across the bar; it never ' +
      'touches the value’s sign — a positive base stays positive at any power. And −6 is the old ' +
      'trap: exponent as multiplier.',
  },
  {
    title: 'A power of a power → MULTIPLY the exponents',
    body:
      'The last operator: (bᵐ)ⁿ — take the whole power bᵐ and multiply n copies of IT. Each copy ' +
      'is an m-tile train, so n copies of m tiles: m × n, unavoidably. The one rule where exponents ' +
      'really do multiply.',
    q: '(2³)² = ?',
    choices: [
      '2⁶ — two copies of three 2s is six 2s',
      '2⁵ — add the exponents',
      '2⁹ — 2 to the 3 to the 2 means 3² = 9',
    ],
    answer: 0,
    feedback:
      '(2³)² = 2³ · 2³ = 2⁶ = 64: two copies of three tiles is six, 3 × 2 = 6. Adding gives 2⁵ = ' +
      '32 — the rule for a PRODUCT of powers. And 2⁹ = 512 stacks a tower, a different expression: ' +
      '2^(3²). Brackets decide which you have.',
  },
  {
    title: 'Build the target power',
    body:
      'Final challenge. The base is fixed; a grey ghost train shows the target power. Pick an ' +
      'operator and set m and n so your result train exactly matches the ghost. m and n stop at 4, ' +
      'so adding never passes 8 — a long target forces the power rule. Reach CALIBRATED, then ' +
      'press New target.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ExponentRulesLab() {
  const [b, setB] = useState(START.b);
  const [m, setM] = useState(START.m);
  const [n, setN] = useState(START.n);
  const [op, setOp] = useState(START.op);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);
  const [playing, setPlaying] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const animRef = useRef(1); // 1 = settled; the play button runs it 0 → 1
  const rafRef = useRef(0);

  const current = STEPS[step];
  const calib = !!current.calib;

  // during calibration the base is pinned to the target's base: the puzzle is
  // about the exponents, and a free base would let you sidestep the rules.
  const activeB = calib && target ? target.b : b;
  const showSecond = step >= 3; // no second power exists before the product step

  /* ---- derived facts — the single source of truth is state ---------------- */
  const E = showSecond ? resultExp(op, m, n) : m;
  const value = ratPowInt(activeB, E);
  const direct = showSecond ? directValue(activeB, op, m, n) : value;
  const agrees = eqRat(value, direct); // the rule vs. the slow arithmetic
  const pool = showSecond && op !== 'pow' ? poolOf(op, m, n) : null;
  const k = pool ? cancelCount(pool) : 0;

  const T = target ? target.T : 0;
  const calibrated = calib && target ? E === T : false;
  const pct = calib && target ? matchPercent(E, T) : 0;
  const ways = calib && target ? solutionsFor(T) : [];

  // which of the three animations the play button offers, given the state
  const animMode = !showSecond ? null : op === 'pow' ? 'stack' : k > 0 ? 'cancel' : 'couple';
  const animCount = animMode === 'stack' ? Math.abs(n) : animMode === 'cancel' ? k : Math.abs(pool ? pool.e2 : 0);
  const animDur = Math.max(0.5, animCount * 0.32 + 0.3);
  const canPlay = showSecond && animCount > 0;

  sceneRef.current = { b: activeB, m, n, op, step, calib, target, showSecond, E, animMode, animCount };

  /* ---- full redraw from state -------------------------------------------- */
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
    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
    const anim = animRef.current;
    const GAP = 3;

    /* ---------- faint quadrille backdrop ---------- */
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

    /* ---------- small drawing primitives ---------- */
    const rrect = (x, y, w, h, r) => {
      const rr = Math.max(0, Math.min(r, w / 2, h / 2));
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + w - rr, y);
      ctx.arcTo(x + w, y, x + w, y + rr, rr);
      ctx.lineTo(x + w, y + h - rr);
      ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
      ctx.lineTo(x + rr, y + h);
      ctx.arcTo(x, y + h, x, y + h - rr, rr);
      ctx.lineTo(x, y + rr);
      ctx.arcTo(x, y, x + rr, y, rr);
      ctx.closePath();
    };

    const TILE_STYLE = {
      m: { fill: 'rgba(200,30,79,0.13)', stroke: CURVE, ink: CURVE },
      n: { fill: 'rgba(15,143,134,0.13)', stroke: TEAL, ink: TEAL },
      dead: { fill: 'rgba(28,43,58,0.04)', stroke: 'rgba(28,43,58,0.22)', ink: 'rgba(28,43,58,0.28)' },
      ghost: { fill: 'rgba(28,43,58,0.03)', stroke: 'rgba(91,107,123,0.55)', ink: 'rgba(91,107,123,0.6)' },
    };

    // ONE tile = ONE factor of the base. This is the atom of the whole lab.
    const tile = (x, y, s, src, opts) => {
      const o = opts || {};
      const st = TILE_STYLE[o.struck ? 'dead' : src] || TILE_STYLE.m;
      ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
      rrect(x, y, s, s, Math.max(2.5, s * 0.18));
      ctx.fillStyle = st.fill;
      ctx.fill();
      if (src === 'ghost') ctx.setLineDash([3, 2]);
      ctx.strokeStyle = st.stroke;
      ctx.lineWidth = s < 14 ? 1.1 : 1.4;
      ctx.stroke();
      ctx.setLineDash([]);
      if (s >= 11) {
        ctx.fillStyle = st.ink;
        ctx.font = '700 ' + Math.max(8, Math.round(s * 0.44)) + 'px ' + MONO;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(S.b), x + s / 2, y + s / 2 + 0.5);
      }
      if (o.struck) {
        ctx.strokeStyle = 'rgba(28,43,58,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + s * 0.16, y + s * 0.84);
        ctx.lineTo(x + s * 0.84, y + s * 0.16);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const fitTile = (count, availW, pref) => {
      if (count <= 0) return pref;
      const p = Math.floor((availW - (count - 1) * GAP) / count);
      return Math.max(8, Math.min(pref, p));
    };
    const rowW = (count, s) => (count <= 0 ? s * 1.9 : count * s + (count - 1) * GAP);
    // a power's card is a row of tiles; when the exponent is negative it becomes
    // a real fraction — 1 over the tiles — because that is what it means.
    const cardH = (e, s) => (e < 0 ? s * 0.72 + 12 + s : s);

    const emptySlot = (x, y, w, h) => {
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(91,107,123,0.55)';
      ctx.lineWidth = 1.3;
      rrect(x, y, w, h, 5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(91,107,123,0.75)';
      ctx.font = '600 ' + Math.max(8, Math.round(h * 0.32)) + 'px ' + MONO;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('empty', x + w / 2, y + h / 2 + 0.5);
    };

    /* draws one power as a card centred on cx; returns its height.
       `src` may be a single tag ('m' / 'n' / 'ghost') or a PER-TILE array — the
       result train passes the surviving tiles' own tags, so the answer is drawn
       in the colours of the tiles it is actually made of. Painting the result
       carmine regardless would quietly contradict the lesson's whole promise
       that no tile is created or destroyed. */
    const srcAt = (src, i) => (Array.isArray(src) ? src[i] || 'm' : src);
    const powerCard = (cx, yTop, e, s, src) => {
      const c = Math.abs(e);
      const w = rowW(c, s);
      const x0 = cx - w / 2;
      const ghost = src === 'ghost';
      if (e === 0) {
        emptySlot(x0, yTop, w, s);
        return s;
      }
      if (e > 0) {
        for (let i = 0; i < c; i++) tile(x0 + i * (s + GAP), yTop, s, srcAt(src, i));
        return s;
      }
      // e < 0 — the reciprocal: a numeral 1, a bar, and the tiles beneath it
      ctx.fillStyle = ghost ? 'rgba(91,107,123,0.7)' : INK;
      ctx.font = '600 ' + Math.round(s * 0.6) + 'px ' + MONO;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1', cx, yTop + s * 0.36);
      const yBar = yTop + s * 0.72 + 6;
      ctx.strokeStyle = ghost ? 'rgba(91,107,123,0.55)' : INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x0 - 6, yBar);
      ctx.lineTo(x0 + w + 6, yBar);
      ctx.stroke();
      for (let i = 0; i < c; i++) tile(x0 + i * (s + GAP), yBar + 6, s, srcAt(src, i));
      return cardH(e, s);
    };

    // "2³" with a real superscript, drawn on the canvas. Returns its width.
    const powLabel = (x, y, base, e, color, align) => {
      const bs = 15;
      const es = 11;
      ctx.font = '600 ' + bs + 'px ' + MONO;
      const bw = ctx.measureText(String(base)).width;
      ctx.font = '700 ' + es + 'px ' + MONO;
      const ew = ctx.measureText(fmtExp(e)).width;
      const total = bw + ew + 1;
      const left = align === 'center' ? x - total / 2 : x;
      ctx.fillStyle = color;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.font = '600 ' + bs + 'px ' + MONO;
      ctx.fillText(String(base), left, y);
      ctx.font = '700 ' + es + 'px ' + MONO;
      ctx.fillText(fmtExp(e), left + bw + 1, y - bs * 0.42);
      return total;
    };

    const bandLabel = (text, y) => {
      ctx.fillStyle = 'rgba(91,107,123,0.75)';
      ctx.font = '600 9px ' + MONO;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.save();
      ctx.letterSpacing = '1.5px'; // ignored where unsupported; purely cosmetic
      ctx.fillText(text, 8, y);
      ctx.restore();
    };
    /* A caption must never clip: try the long form, fall back to the short one
       if given, then shrink the type until it fits. A narrow phone stage is not
       a place to discover that a sentence was 20px too wide. */
    const caption = (text, y, color, size, short) => {
      let s = size || 12;
      let t = text;
      ctx.font = '600 ' + s + 'px ' + MONO;
      if (short && ctx.measureText(t).width > W - 16) t = short;
      while (s > 8 && ctx.measureText(t).width > W - 12) {
        s -= 1;
        ctx.font = '600 ' + s + 'px ' + MONO;
      }
      ctx.fillStyle = color || INK_SOFT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t, W / 2, y);
    };

    /* ======================================================================
       SOLO — steps 0–2: a single power. The picture must never run ahead of
       the idea, so no second train and no operator exist yet.
       ==================================================================== */
    if (!S.showSecond) {
      bandLabel('ONE POWER', 10);
      const c = Math.abs(S.m);
      const s = fitTile(Math.max(c, 1), W - 90, 48);
      const h = cardH(S.m, s);
      const cardY = H * 0.42 - h / 2;

      powLabel(W / 2, H * 0.29, S.b, S.m, CURVE, 'center');
      powerCard(W / 2, cardY, S.m, s, 'm');

      // the running product under each tile: every tile multiplies by b again
      if (S.m > 0 && s >= 16) {
        let run = ONE;
        const B = BigInt(S.b);
        const x0 = W / 2 - rowW(c, s) / 2;
        ctx.font = '10px ' + MONO;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let i = 0; i < c; i++) {
          run = run * B;
          ctx.fillStyle = i === c - 1 ? CURVE : 'rgba(91,107,123,0.85)';
          ctx.fillText(group(run), x0 + i * (s + GAP) + s / 2, cardY + s + 7);
        }
        ctx.fillStyle = 'rgba(91,107,123,0.7)';
        ctx.font = '9px ' + MONO;
        ctx.textAlign = 'left';
        ctx.fillText('running product', 8, cardY + s + 7);
      }

      caption(expanded(S.b, S.m) + ' = ' + fmtRat(ratPowInt(S.b, S.m)), H * 0.68, INK, 15);
      caption(
        Math.abs(S.m) === 1
          ? 'one tile — one factor of ' + S.b
          : fmtExp(Math.abs(S.m)) + ' tiles, each one factor of ' + S.b,
        H * 0.76,
        INK_SOFT,
        11,
        fmtExp(Math.abs(S.m)) + ' × ' + S.b
      );
      return;
    }

    /* ======================================================================
       Three bands: the EXPRESSION you wrote, the MEANING (where the rule is
       forced), and the RESULT. Input → work → answer, top to bottom.
       ==================================================================== */
    const aTop = 12;
    const aH = H * 0.28;
    const bTop = aTop + aH + 8;
    const bH = H * 0.36;
    const cTop = bTop + bH + 10;
    const cH = H - cTop - 8;

    /* ---------------- BAND A — the expression ---------------- */
    bandLabel('THE EXPRESSION', aTop);
    {
      const sA = fitTile(Math.max(Math.abs(S.m), Math.abs(S.n), 1), (W - 90) / 2, 22);
      if (S.op === 'pow') {
        // (b^m)^n — a bracketed train wearing an outer exponent
        const w = rowW(Math.abs(S.m), sA);
        const h = cardH(S.m, sA);
        const yTop = aTop + aH / 2 - h / 2 + 6;
        const cx = W / 2 - 10;
        powerCard(cx, yTop, S.m, sA, 'm');
        const py = yTop + h / 2;
        ctx.fillStyle = INK;
        ctx.font = Math.round(h * 1.5) + 'px ' + MONO;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('(', cx - w / 2 - 12, py);
        ctx.fillText(')', cx + w / 2 + 12, py);
        ctx.fillStyle = TEAL;
        ctx.font = '700 15px ' + MONO;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(fmtExp(S.n), cx + w / 2 + 20, py - h * 0.45);
        ctx.fillStyle = 'rgba(91,107,123,0.85)';
        ctx.font = '11px ' + MONO;
        ctx.textAlign = 'center';
        ctx.fillText('this whole power …', W / 2, aTop + 16);
      } else {
        const wM = rowW(Math.abs(S.m), sA);
        const wN = rowW(Math.abs(S.n), sA);
        const opW = 34;
        const total = wM + opW + wN;
        const x0 = (W - total) / 2;
        const cxM = x0 + wM / 2;
        const cxN = x0 + wM + opW + wN / 2;
        const hM = cardH(S.m, sA);
        const hN = cardH(S.n, sA);
        const mid = aTop + aH / 2 + 6;
        powLabel(cxM, aTop + 22, S.b, S.m, CURVE, 'center');
        powLabel(cxN, aTop + 22, S.b, S.n, TEAL, 'center');
        powerCard(cxM, mid - hM / 2, S.m, sA, 'm');
        powerCard(cxN, mid - hN / 2, S.n, sA, 'n');
        ctx.fillStyle = INK;
        ctx.font = '600 20px ' + MONO;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(S.op === 'mul' ? CDOT : DIV, x0 + wM + opW / 2, mid);
      }
    }

    /* ---------------- BAND B — what it means ---------------- */
    bandLabel('WHAT IT MEANS', bTop - 2);
    if (S.op === 'pow') {
      /* n copies of the m-train, laid down as rows.
         Deliberately NOT an area model: the tiles are counted, no side lengths
         and no area are drawn or named. MultiplicationLab owns the rectangle
         whose AREA is a product; this grid's rows are COPIES and its tiles are
         factors. */
      const rows = Math.abs(S.n);
      const cols = Math.abs(S.m);
      const side = Math.sign(S.m * S.n);
      const shown = Math.min(rows, Math.max(0, Math.ceil(anim * rows)));
      const availH = bH - 46;
      let sB = fitTile(Math.max(cols, 1), W - 150, 22);
      if (rows > 0) sB = Math.max(8, Math.min(sB, Math.floor(availH / rows) - GAP));
      const gridW = rowW(Math.max(cols, 1), sB);
      const gridH = rows > 0 ? rows * sB + (rows - 1) * GAP : sB;
      const gx = (W - gridW) / 2 + 12;
      let gy = bTop + 20 + (bH - 30 - gridH) / 2;

      if (rows === 0) {
        emptySlot(W / 2 - 40, bTop + bH / 2 - 16, 80, 32);
        caption('no copies at all — an empty product is 1', bTop + bH - 12, INK_SOFT, 11);
      } else {
        if (side < 0) {
          // the whole stack lives under the bar
          ctx.fillStyle = INK;
          ctx.font = '600 14px ' + MONO;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('1', W / 2 + 12, gy - 18);
          ctx.strokeStyle = INK;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(gx - 8, gy - 8);
          ctx.lineTo(gx + gridW + 8, gy - 8);
          ctx.stroke();
          gy += 4;
        }
        for (let r = 0; r < rows; r++) {
          const a = r < shown ? 1 : 0.08;
          const yy = gy + r * (sB + GAP);
          if (cols === 0) {
            ctx.globalAlpha = a;
            emptySlot(gx, yy, gridW, sB);
            ctx.globalAlpha = 1;
          } else {
            for (let c2 = 0; c2 < cols; c2++) tile(gx + c2 * (sB + GAP), yy, sB, 'm', { alpha: a });
          }
        }
        // the copy brace — teal, because n is what says how many copies
        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 1.5;
        const bx = gx - 12;
        ctx.beginPath();
        ctx.moveTo(bx + 4, gy);
        ctx.lineTo(bx, gy + 4);
        ctx.lineTo(bx, gy + gridH - 4);
        ctx.lineTo(bx + 4, gy + gridH);
        ctx.stroke();
        ctx.save();
        ctx.translate(bx - 8, gy + gridH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = TEAL;
        ctx.font = '700 11px ' + MONO;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(TIMES + ' ' + rows + (rows === 1 ? ' copy' : ' copies'), 0, 0);
        ctx.restore();
        caption(
          rows + (rows === 1 ? ' copy of ' : ' copies of ') + cols + (cols === 1 ? ' tile' : ' tiles'),
          bTop + bH - 10,
          INK_SOFT,
          11
        );
      }
    } else {
      /* the pool: everything above the bar, everything below it, and the pairs
         that annihilate. This single picture is both the product rule and the
         quotient rule — ÷ b^n is × b^-n, which is just the far side of the bar. */
      const P = poolOf(S.op, S.m, S.n);
      const kk = Math.min(P.above.length, P.below.length);
      const shownN = S.animMode === 'couple' ? Math.ceil(anim * Math.abs(P.e2)) : Math.abs(P.e2);
      const shownK = S.animMode === 'cancel' ? Math.floor(anim * kk + 1e-9) : kk;
      const maxCount = Math.max(P.above.length, P.below.length, 1);
      const sB = fitTile(maxCount, W - 70, 24);
      const wMax = rowW(maxCount, sB);
      const x0 = (W - wMax) / 2;
      const yBar = bTop + bH * 0.52;
      const yA = yBar - 11 - sB;
      const yB = yBar + 11;

      let seenN = 0;
      const drawRow = (arr, y, isAbove) => {
        for (let i = 0; i < arr.length; i++) {
          const src = arr[i];
          let alpha = 1;
          if (src === 'n' && S.animMode === 'couple') {
            const idx = seenN++;
            alpha = idx < shownN ? 1 : 0.08;
          }
          const struck = i < shownK;
          tile(x0 + i * (sB + GAP), y, sB, src, { struck, alpha });
        }
        void isAbove;
      };
      // n-tiles are numbered in the order they appear, above row first
      seenN = 0;
      drawRow(P.above, yA, true);
      drawRow(P.below, yB, false);

      if (P.below.length > 0) {
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x0 - 10, yBar);
        ctx.lineTo(x0 + wMax + 10, yBar);
        ctx.stroke();
        if (P.above.length === 0) {
          ctx.fillStyle = INK;
          ctx.font = '600 14px ' + MONO;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('1', W / 2, yA + sB / 2);
        }
      }
      // each cancelled pair: a hairline linking the two tiles that ate each other
      for (let i = 0; i < shownK; i++) {
        const cx = x0 + i * (sB + GAP) + sB / 2;
        ctx.strokeStyle = 'rgba(28,43,58,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(cx, yA + sB);
        ctx.lineTo(cx, yB);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const lines = [];
      if (S.op === 'div')
        lines.push([
          DIV + ' ' + S.b + supStr(S.n) + ' flips its tiles across the bar',
          DIV + ' ' + S.b + supStr(S.n) + ' flips across the bar',
        ]);
      lines.push(
        kk > 0
          ? [
              kk +
                (kk === 1 ? ' pair cancels — it is ' : ' pairs cancel — each is ') +
                S.b +
                ' ' +
                DIV +
                ' ' +
                S.b +
                ' = 1',
              kk + (kk === 1 ? ' pair cancels' : ' pairs cancel'),
            ]
          : ['nothing cancels — every tile is on one side', 'nothing cancels']
      );
      ctx.textAlign = 'center';
      lines.forEach((t, i) => caption(t[0], bTop + bH - 20 + i * 13, INK_SOFT, 11, t[1]));
    }

    /* ---------------- BAND C — the result ---------------- */
    bandLabel(S.calib ? 'YOUR RESULT vs THE TARGET' : 'THE RESULT', cTop - 2);
    {
      const Ev = S.E;
      const Tv = S.calib && S.target ? S.target.T : 0;
      const maxC = Math.max(Math.abs(Ev), S.calib ? Math.abs(Tv) : 0, 1);
      let sC = fitTile(maxC, W - 80, 26);
      const need = () => cardH(Ev, sC) + (S.calib ? cardH(Tv, sC) + 30 : 0) + 30;
      while (sC > 9 && need() > cH) sC -= 1;

      // "= 2⁵" set beside a train, with a real superscript (never "2^5")
      const sideLabel = (prefix, e, yMid, count, color) => {
        ctx.font = '700 12px ' + MONO;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const pw2 = ctx.measureText(prefix).width;
        const x = W / 2 + rowW(count, sC) / 2 + 12;
        if (x + pw2 + 26 > W - 4) return; // no room — the train has the floor
        ctx.fillStyle = color;
        ctx.fillText(prefix, x, yMid);
        powLabel(x + pw2, yMid + 5, S.b, e, color, 'left');
      };

      let y = cTop + 16;
      // your result — literally the surviving tiles, moved down and re-counted,
      // still wearing the colour of the exponent they came from
      const resSrc = S.op === 'pow' ? 'm' : survivors(poolOf(S.op, S.m, S.n));
      const hR = powerCard(W / 2, y, Ev, sC, resSrc);
      sideLabel('= ', Ev, y + hR / 2, Math.abs(Ev), CURVE);
      y += hR + 8;

      if (S.calib && S.target) {
        const hG = powerCard(W / 2, y + 12, Tv, sC, 'ghost');
        sideLabel('target ', Tv, y + 12 + hG / 2, Math.abs(Tv), 'rgba(91,107,123,0.9)');
        y += hG + 20;
        if (Ev === Tv) caption('same length — same exponent ✓', Math.min(y + 4, H - 8), OK, 12, 'match ✓');
      } else {
        // the count arithmetic, in the two accents — the rule and the picture
        // saying the same thing at the same moment
        const parts = [
          { t: fmtExp(S.m), c: CURVE },
          { t: ' ' + (S.op === 'mul' ? '+' : S.op === 'div' ? MINUS : TIMES) + ' ', c: INK_SOFT },
          { t: S.n < 0 ? '(' + fmtExp(S.n) + ')' : fmtExp(S.n), c: TEAL },
          { t: ' = ', c: INK_SOFT },
          { t: fmtExp(Ev), c: INK },
          // a COUNT of tiles is never negative — when the exponent is, the sign
          // is telling you which side of the bar they ended up on
          { t: Ev > 0 ? (Ev === 1 ? ' tile' : ' tiles') : Ev < 0 ? ' — under the bar' : ' — nothing left', c: INK_SOFT },
        ];
        ctx.font = '700 13px ' + MONO;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        const total = parts.reduce((a, p) => a + ctx.measureText(p.t).width, 0);
        let cx = W / 2 - total / 2;
        const cy = Math.min(y + 10, H - 10);
        for (const p of parts) {
          ctx.fillStyle = p.c;
          ctx.fillText(p.t, cx, cy);
          cx += ctx.measureText(p.t).width;
        }
      }
    }
  }, []);

  /* redraw whenever the picture-affecting state changes; a change also settles
     any animation in flight (the picture must always match the dials) */
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    animRef.current = 1;
    setPlaying(false);
    draw();
  }, [b, m, n, op, step, target, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /* entering the calibration step: hand out a fresh target */
  useEffect(() => {
    if (current.calib && !target) newTarget(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* if the operator would leave the student on a locked rule when stepping
     back, fall back to one they have actually met */
  useEffect(() => {
    if (!calib && step < opUnlock(op)) setOp('mul');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction -------------------------------------------------------- */
  function newTarget(prev) {
    const t = makeTarget(prev);
    setTarget(t);
    setM(CALIB_RESET.m);
    setN(CALIB_RESET.n);
    setOp(CALIB_RESET.op);
  }

  const onParam = (key, v) => {
    const x = parseInt(v, 10);
    if (key === 'b') setB(x);
    else if (key === 'm') setM(x);
    else setN(x);
  };

  // opt-in, time-based (dt), reduced-motion aware — never ambient
  const play = () => {
    if (!canPlay) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cancelAnimationFrame(rafRef.current);
    if (reduced) {
      animRef.current = 1;
      draw();
      return;
    }
    animRef.current = 0;
    setPlaying(true);
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); // clamped: tab-switch safe
      last = now;
      animRef.current = Math.min(1, animRef.current + dt / animDur);
      draw();
      if (animRef.current < 1) rafRef.current = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const showOneWay = () => {
    if (!ways.length) return;
    const w = ways[0];
    setOp(w.op);
    setM(w.m);
    setN(w.n);
  };

  const resetDials = () => {
    setB(START.b);
    setM(START.m);
    setN(START.n);
    setOp(step >= opUnlock(START.op) ? START.op : 'mul');
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

  /* ---- readouts ----------------------------------------------------------- */
  const opGlyph = OPS.find((o) => o.key === op).glyph;
  const pw = (base, e, color) => (
    <span style={{ color, fontWeight: 700 }}>
      {base}
      <sup>{fmtExp(e)}</sup>
    </span>
  );
  const ruleFor = (key) => {
    if (key === 'mul')
      return (
        <>
          b<sup>m</sup> {CDOT} b<sup>n</sup> = b<sup>m+n</sup>
        </>
      );
    if (key === 'div')
      return (
        <>
          b<sup>m</sup> {DIV} b<sup>n</sup> = b<sup>m{MINUS}n</sup>
        </>
      );
    if (key === 'pow')
      return (
        <>
          (b<sup>m</sup>)<sup>n</sup> = b<sup>mn</sup>
        </>
      );
    if (key === 'zero')
      return (
        <>
          b<sup>0</sup> = 1
        </>
      );
    return (
      <>
        b<sup>{MINUS}n</sup> = 1 / b<sup>n</sup>
      </>
    );
  };

  // the rule's answer, re-derived by actually combining the two numbers — this
  // is what the ✓ verifies, so it must never read as "(8)^2"
  const checkLine = showSecond
    ? op === 'pow'
      ? '(' + fmtRat(ratPowInt(activeB, m)) + ')' + supStr(n) + ' = ' + fmtRat(direct)
      : fmtRat(ratPowInt(activeB, m)) + ' ' + opGlyph + ' ' + fmtRat(ratPowInt(activeB, n)) + ' = ' + fmtRat(direct)
    : expanded(activeB, m) + ' = ' + fmtRat(value);

  const dig = digitCount(value);
  const bigNote = dig >= 7 ? ' (' + dig + ' digits)' : '';

  const spoken = showSecond
    ? activeB +
      ' to the ' +
      spokenExp(m) +
      (op === 'mul' ? ' times ' : op === 'div' ? ' divided by ' : ' , all raised to the power ') +
      (op === 'pow' ? spokenExp(n) : activeB + ' to the ' + spokenExp(n)) +
      ' equals ' +
      activeB +
      ' to the ' +
      spokenExp(E) +
      ', which is ' +
      spokenRat(value) +
      '. On the exponents, ' +
      expSentence(op, m, n) +
      '.' +
      (k > 0 ? ' ' + k + ' pairs of tiles cancel.' : '') +
      (calib && target
        ? calibrated
          ? ' Calibrated — your exponent matches the target ' + spokenExp(T) + '.'
          : ' The target exponent is ' + spokenExp(T) + '; yours is ' + spokenExp(E) + '.'
        : '')
    : activeB +
      ' to the power ' +
      spokenExp(m) +
      ' is a train of ' +
      Math.abs(m) +
      ' tiles, each a factor of ' +
      activeB +
      ', worth ' +
      spokenRat(value) +
      '.';

  return (
    <div className="xlab">
      <header className="head">
        <h1>Exponent Rules</h1>
        <p className="lede">
          An exponent is not a mystery symbol — it is a <em>count</em>. Every power <em>b</em>
          <sup>n</sup> is a train of <em>n</em> tiles, each one a factor of <em>b</em>. Then every rule you
          are asked to memorise is just <em>re-counting the same tiles</em>: couple two trains and the
          counts <em>add</em>; cancel matched tiles across a fraction bar and they <em>subtract</em>; lay
          down copies of a train and they <em>multiply</em>. Cancel everything and you have found{' '}
          <em>b⁰ = 1</em>; cancel past the end and you have found <em>negative exponents</em>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              {/* solo: b^m = value. With a second power the head becomes the
                  whole argument — expression, then the RULE acting on the
                  exponents, then the single power, then the number. */}
              {showSecond ? (
                <>
                  {op === 'pow' ? (
                    <>
                      ({pw(activeB, m, CURVE)})<sup style={{ color: TEAL, fontWeight: 700 }}>{fmtExp(n)}</sup>
                    </>
                  ) : (
                    <>
                      {pw(activeB, m, CURVE)} <span className="opg">{opGlyph}</span> {pw(activeB, n, TEAL)}
                    </>
                  )}
                  {' = '}
                  <span>
                    {activeB}
                    <sup>
                      <span style={{ color: CURVE }}>{fmtExp(m)}</span>
                      <span style={{ color: INK_SOFT }}>
                        {op === 'mul' ? ' + ' : op === 'div' ? ' ' + MINUS + ' ' : ' ' + TIMES + ' '}
                      </span>
                      {/* a negative n gets brackets, or "2 × −2" reads as two operators */}
                      <span style={{ color: TEAL }}>{n < 0 ? '(' + fmtExp(n) + ')' : fmtExp(n)}</span>
                    </sup>
                  </span>
                  {' = '}
                  <span style={{ color: CURVE, fontWeight: 700 }}>
                    {activeB}
                    <sup>{fmtExp(E)}</sup>
                  </span>
                </>
              ) : (
                pw(activeB, m, CURVE)
              )}
              {' = '}
              <strong className="val">{fmtRat(value)}</strong>
            </p>
            <p className={'verdict ' + (agrees ? 'yes' : 'no')}>
              {agrees ? '✓ ' : '✕ '}
              check: {checkLine}
            </p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {step < 1
                ? 'the exponent dial unlocks next'
                : calib
                ? 'match the ghost train’s length'
                : showSecond
                ? 'drag m and n · switch the operator'
                : 'drag m — each tile is one factor'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="sw m" /> a factor from b<sup>m</sup>
            </span>
            {showSecond && (
              <span className="lg">
                <span className="sw n" /> a factor from b<sup>n</sup>
              </span>
            )}
            {showSecond && op !== 'pow' && (
              <span className="lg">
                <span className="sw dead" /> cancelled pair
              </span>
            )}
            {calib && (
              <span className="lg">
                <span className="sw ghost" /> the target
              </span>
            )}
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">The rule in play</span>
              <span className="fact-v mono" style={{ color: CURVE, fontWeight: 700 }}>
                {showSecond ? ruleFor(op) : <>b<sup>m</sup> = m factors of b</>}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">On the exponents</span>
              <span className="fact-v mono">
                {showSecond ? (
                  <>
                    <span style={{ color: CURVE, fontWeight: 700 }}>{fmtExp(m)}</span>
                    {op === 'mul' ? ' + ' : op === 'div' ? ' ' + MINUS + ' ' : ' ' + TIMES + ' '}
                    <span style={{ color: TEAL, fontWeight: 700 }}>{n < 0 ? '(' + fmtExp(n) + ')' : fmtExp(n)}</span>
                    {' = '}
                    <span style={{ fontWeight: 700 }}>{fmtExp(E)}</span>
                  </>
                ) : (
                  fmtExp(m) + ' tiles'
                )}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Check with numbers</span>
              <span className="fact-v mono big">{checkLine}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Value</span>
              <span className="fact-v mono big">
                {activeB}
                <sup>{fmtExp(E)}</sup> = {fmtRat(value)}
                <span className="dim">{bigNote}</span>
              </span>
            </div>
          </div>

          {/* the operator = which RULE is on stage. Options unlock like dials. */}
          {showSecond && (
            <div className="ops" role="group" aria-label="Choose the operator">
              {OPS.map((o) => {
                const locked = !calib && step < o.unlock;
                const on = op === o.key;
                return (
                  <button
                    type="button"
                    key={o.key}
                    className={'opbtn' + (on ? ' on' : '') + (locked ? ' locked' : '')}
                    aria-pressed={on}
                    disabled={locked}
                    onClick={() => setOp(o.key)}
                  >
                    <span className="mono">
                      {o.key === 'pow' ? (
                        <>
                          (b<sup>m</sup>)<sup>n</sup>
                        </>
                      ) : (
                        <>
                          b<sup>m</sup> {o.glyph} b<sup>n</sup>
                        </>
                      )}
                    </span>
                    <span className="opname">{locked ? '🔒 unlocks soon' : o.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="toolbar">
            {/* the animation only exists once there is a merge to watch */}
            {showSecond && (
              <button type="button" className="btn ghost" onClick={play} disabled={!canPlay || playing}>
                {animMode === 'stack'
                  ? 'Stack the copies'
                  : animMode === 'cancel'
                  ? 'Watch them cancel'
                  : 'Couple the trains'}
              </button>
            )}
            <button type="button" className="btn ghost" onClick={resetDials} disabled={calib}>
              Reset dials
            </button>
          </div>

          {/* THE RULE CARD — the lab's deliverable, assembled by the student */}
          <div className="rules">
            <p className="rules-cap">
              The same-base rules you have unlocked <span className="dim">· all five come from counting tiles</span>
            </p>
            <ul>
              {RULES.map((r) => {
                const on = step >= r.unlock;
                return (
                  <li key={r.key} className={on ? 'on' : 'off'}>
                    <span className="r-sym mono">{on ? ruleFor(r.key) : '🔒'}</span>
                    <span className="r-gloss">{on ? r.gloss : 'unlocks at step ' + (r.unlock + 1)}</span>
                  </li>
                );
              })}
            </ul>
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
            {PARAMS.map((p) => {
              const unlocked = step >= p.unlock;
              const isB = p.key === 'b';
              const val = p.key === 'b' ? activeB : p.key === 'm' ? m : n;
              const disabled = !unlocked || (isB && calib);
              return (
                <label
                  className={
                    'dial' + (disabled ? ' locked' : '') + (p.star ? ' star' : '') + (p.second ? ' second' : '')
                  }
                  key={p.key}
                >
                  <span className="dk">{p.label}</span>
                  <span className="drole">
                    {isB && calib ? 'fixed by the target' : unlocked ? p.role : 'unlocks soon'}
                  </span>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={val}
                    disabled={disabled}
                    aria-label={'Dial ' + p.label + ' — ' + p.role}
                    onChange={(e) => onParam(p.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? fmtExp(val) : '🔒'}</output>
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
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
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

          {calib && target && (
            <div className="calib">
              <p className="calib-lead mono">
                Target:{' '}
                <strong>
                  {target.b}
                  <sup>{fmtExp(T)}</sup>
                </strong>{' '}
                = {fmtRat(ratPowInt(target.b, T))}
              </p>
              <p className="calib-sub">
                Base is fixed at {target.b}. Choose an operator and set m and n so your exponent is exactly{' '}
                {fmtExp(T)}.
              </p>

              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    yours {fmtExp(E)} · target {fmtExp(T)}
                  </span>
                )}
              </div>

              <p className="calib-hint">
                {calibrated ? (
                  <>
                    {ways.length === 1
                      ? 'That was the only way to build it.'
                      : 'You found 1 of ' + ways.length + ' ways to build it.'}{' '}
                    {ways.length > 1 && (
                      <span className="dim">
                        Others:{' '}
                        {ways
                          .filter((w) => !(w.op === op && w.m === m && w.n === n))
                          .slice(0, 3)
                          .map((w) =>
                            w.op === 'pow'
                              ? '(b' + supStr(w.m) + ')' + supStr(w.n)
                              : 'b' + supStr(w.m) + ' ' + OPS.find((o) => o.key === w.op).glyph + ' b' + supStr(w.n)
                          )
                          /* NOT " · " — that is the multiply glyph inside each
                             way, and the list would read as one long product */
                          .join(',  ')}
                        {ways.length > 4 ? ' …' : ''}
                      </span>
                    )}
                  </>
                ) : !reachableWithOp(op, T) ? (
                  <>
                    No m and n can make {fmtExp(T)} by {OPS.find((o) => o.key === op).name}
                    {op !== 'pow' && Math.abs(T) > 8 ? ' — the counts only reach ±8' : ''}. Try another operator.
                  </>
                ) : E < T ? (
                  'Your train is too short — you need more factors.'
                ) : (
                  'Your train is too long — you need fewer factors.'
                )}
              </p>

              <div className="calib-btns">
                <button type="button" className="btn ghost" onClick={showOneWay}>
                  Show me one way
                </button>
                <button type="button" className="btn ghost" onClick={() => newTarget(target)}>
                  New target
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
        <span className="mono">
          b<sup>m</sup> {CDOT} b<sup>n</sup> = b<sup>m+n</sup>
        </span>{' '}
        &nbsp;·&nbsp; every rule here needs the <strong>same base</strong> — 2³ · 3² cannot be combined into a
        single power, because its tiles are not all the same. All of them assume <em>b ≠ 0</em> (0⁰ and 0⁻ⁿ
        are undefined). Spreading an exponent across a product of <em>different</em> bases, (ab)
        <sup>n</sup> = a<sup>n</sup>b<sup>n</sup>, is a separate idea and a separate lab. CCSS&nbsp;8.EE.A.1.
      </footer>

      <style jsx>{`
        .xlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --teal: #0f8f86;
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
        .dim {
          color: var(--ink-soft);
          font-weight: 400;
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
          max-width: 76ch;
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
          margin-bottom: 10px;
        }
        .equation {
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 20px;
          font-weight: 600;
          margin: 0;
          color: var(--ink);
          overflow-wrap: anywhere;
        }
        .equation sup {
          font-size: 0.62em;
        }
        .equation .opg {
          color: var(--ink-soft);
          padding: 0 2px;
        }
        .equation .val {
          color: var(--ink);
        }
        .verdict {
          font-size: 12.5px;
          margin: 4px 0 0;
          font-weight: 600;
          font-family: var(--mono);
          overflow-wrap: anywhere;
        }
        .verdict.yes {
          color: var(--ok);
        }
        .verdict.no {
          color: var(--curve);
        }
        .stage {
          position: relative;
          width: min(100%, 640px);
          aspect-ratio: 16 / 13;
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
        /* three stacked bands need HEIGHT, and a narrow phone has none to spare
           sideways — so the stage goes portrait rather than letting the bands
           crush together, and the hint chip (which would sit on the result
           band) stands down. */
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 3 / 4;
          }
          .hint {
            display: none;
          }
        }
        .hint {
          position: absolute;
          left: 10px;
          bottom: 9px;
          font-size: 11px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.82);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          justify-content: center;
          margin: 10px 4px 2px;
          font-size: 12px;
          color: var(--ink-soft);
        }
        .legend sup {
          font-size: 0.7em;
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
        .sw.m {
          background: rgba(200, 30, 79, 0.13);
          border: 1.4px solid var(--curve);
        }
        .sw.n {
          background: rgba(15, 143, 134, 0.13);
          border: 1.4px solid var(--teal);
        }
        .sw.dead {
          background: rgba(28, 43, 58, 0.04);
          border: 1.4px solid rgba(28, 43, 58, 0.22);
        }
        .sw.ghost {
          background: transparent;
          border: 1.4px dashed var(--ink-soft);
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin: 12px 4px 4px;
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
          min-width: 0;
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
          overflow-wrap: anywhere;
        }
        .fact-v sup {
          font-size: 0.7em;
        }
        .fact-v.big {
          font-size: 12.5px;
        }
        .ops {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
          margin: 12px 4px 2px;
        }
        .opbtn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 8px 4px;
          border-radius: 8px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          font-size: 13px;
          transition: border-color 0.15s, background 0.15s;
        }
        .opbtn sup {
          font-size: 0.68em;
        }
        .opbtn .opname {
          font-size: 10px;
          color: var(--ink-soft);
        }
        .opbtn:not(:disabled):hover {
          border-color: var(--ink);
        }
        .opbtn.on {
          border-color: var(--curve);
          background: rgba(200, 30, 79, 0.07);
          box-shadow: inset 0 0 0 1px var(--curve);
        }
        .opbtn.locked {
          opacity: 0.45;
          cursor: not-allowed;
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
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn:not(:disabled):hover {
          filter: brightness(1.08);
        }
        .rules {
          margin: 14px 4px 2px;
          padding-top: 10px;
          border-top: 1px solid rgba(28, 43, 58, 0.08);
        }
        .rules-cap {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0 0 8px;
        }
        .rules ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 5px;
        }
        .rules li {
          display: grid;
          grid-template-columns: 132px 1fr;
          gap: 10px;
          align-items: baseline;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12.5px;
        }
        @media (max-width: 560px) {
          .rules li {
            grid-template-columns: 1fr;
            gap: 1px;
          }
        }
        .rules li.on {
          background: rgba(200, 30, 79, 0.05);
        }
        .rules li.off {
          opacity: 0.45;
        }
        .r-sym {
          font-weight: 700;
          color: var(--curve);
          font-variant-numeric: tabular-nums;
        }
        .rules li.off .r-sym {
          color: var(--ink-soft);
        }
        .r-sym sup {
          font-size: 0.7em;
        }
        .r-gloss {
          color: var(--ink-soft);
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
        .dials {
          display: grid;
          gap: 12px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 22px 1fr 46px;
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
        .dial.star .dk {
          color: var(--curve);
        }
        .dial.second .dk {
          color: var(--teal);
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
        .dial.star input[type='range'] {
          accent-color: var(--curve);
        }
        .dial.second input[type='range'] {
          accent-color: var(--teal);
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
          gap: 9px;
        }
        .calib-lead {
          font-size: 13px;
          margin: 0;
          color: var(--ink-soft);
        }
        .calib-lead strong {
          color: var(--curve);
          font-size: 17px;
        }
        .calib-lead sup {
          font-size: 0.65em;
        }
        .calib-sub {
          font-size: 12px;
          color: var(--ink-soft);
          margin: 0;
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
        .calib-hint {
          font-size: 12px;
          margin: 0;
          color: var(--ink);
          min-height: 2.4em;
        }
        .calib-btns {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
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
        .foot sup {
          font-size: 0.7em;
        }
        .foot em {
          font-style: italic;
        }
        :global(.xlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .opbtn {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
