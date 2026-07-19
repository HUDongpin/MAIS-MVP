'use client';

/* ============================================================================
   SeriesLab — an interactive "bench" for the SERIES: what you get when you add
   a sequence's terms one at a time, and where those running totals are heading.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions (Next gates on ANSWERED, not
   CORRECT), and a calibration challenge with a live meter and CALIBRATED stamp.

   THE SIGNATURE CENTERPIECE is THE ACCUMULATION WATERFALL. Every term is a
   carmine bar on its own row, and each bar STARTS WHERE THE LAST ONE STOPPED —
   so the right edge of row k is the partial sum S_k, echoed as a carmine dot on
   the value axis above. The partial sums are the series. Two moves grow out of
   that one picture:

     • GEOMETRIC — a grey wall stands at S = a/(1−r) and a GOLD bar on every row
       shows the GAP still left. The gold bars shrink by a factor of r per row,
       because gap_n = S − S_n = a·rⁿ/(1−r) = rⁿ × (the original gap). That IS
       the reason a series converges: each term eats the same FRACTION (1−r) of
       what remains. |r| ≥ 1 ⇒ the gap never shrinks ⇒ no sum.

     • ARITHMETIC — press PAIR UP and every bar swings back to a common left
       edge while a BLUE copy of the series, running backwards, is laid on the
       end of each row. Every row then ends at exactly a₁ + aₙ (because
       t_k + t_{n+1−k} = 2a + (n−1)d for every k), so two copies of the series
       tile a perfect rectangle n rows tall and (a₁+aₙ) wide: 2Sₙ = n(a₁+aₙ).
       Gauss's trick, as a picture.

   DELIBERATELY DISTINCT from its siblings:
     • MultiplesLab is a number-line walk of EQUAL jumps that LAND ON the terms
       n, 2n, 3n, … (its capstone is the LCM). SeriesLab never draws equal jumps
       and is not about the terms at all — it is about the RUNNING TOTAL, drawn
       as unequal end-to-end bars closing on a wall. Terms vs. sum.
     • ExponentialFunctionLab OWNS the y = a·bˣ + k CURVE and the ×b STAIRCASE
       above an asymptote. This lab plots no function of x, draws no curve, and
       has no staircase — a geometric series' constant ratio shows up here only
       as the shrink factor of the GOLD GAP, an object that lab never has.
     • ProbabilityLab OWNS the convergence CHART (a relative-frequency trace
       homing onto a theoretical line). Nothing here is a chart or a trace: the
       limit is a WALL and the approach is a cascade of shrinking gap bars.
     • MeanLab/DataLab's "build to a target" capstone is shared house structure,
       but the goal here is an INFINITE SUM built from (a, r) — not a statistic.

   MATH CORRECTNESS NOTES (this is a K-12 product; these were chosen with care):
     • ALL arithmetic is EXACT RATIONAL — a tiny {n, d} integer-fraction module
       with gcd reduction. No float ever decides a term, a sum, or whether the
       student has hit the target. 1/3 + 1/3 + 1/3 is exactly 1 here, never
       0.9999999999999998. Floats are used only to turn values into pixels.
       Every intermediate is proved to stay inside Number.MAX_SAFE_INTEGER by
       audit-series.mjs (the dial ranges are bounded so this is provable, not
       hoped for).
     • r = 1 is a REAL case, not a bug: the formula a(1−rⁿ)/(1−r) divides by
       zero there, but the series is fine (every term is a, so Sₙ = n·a). The
       lab branches exactly and teaches the exclusion rather than hiding it.
     • The nth term uses r^(n−1) and a₁+(n−1)d — the (n−1) off-by-one is the
       single most common student error and is called out in the feedback.
     • Convergence is stated honestly: terms → 0 is NECESSARY but NOT SUFFICIENT
       (the harmonic series is named as the counterexample in step 8's feedback).
       For GEOMETRIC series |r| < 1 is exactly right, and that is all we claim.
     • Gauss pairing is stated so it stays true for ODD n (the leftover middle
       term is exactly the average (a₁+aₙ)/2, i.e. half a pair).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/SeriesLab.jsx
     2. Import and render it:
          import SeriesLab from './SeriesLab';
          export default function Page() { return <SeriesLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, d, rIdx, n, mode,
              pairUp, lesson step). Nothing is cached elsewhere.
     MODEL  — the rational module + termsOf/partialsOf/… are pure math; they
              know nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // the ONE accent = the SERIES (its terms and its partial sums)
const CURVE_SOFT = 'rgba(200,30,79,0.16)';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const PAPER = '#fbfbf8';
const OK = '#1f8a5b';
const BLUE = '#3f74a6'; // the REVERSED second copy in Gauss pairing (a principled 2nd object)
const GOLD = '#c98a1e'; // the GAP still left, and the limit S — the convergence story
const GOLD_SOFT = 'rgba(201,138,30,0.28)'; // the cascade IS the thesis — it has to read

/* ============================================================================
   EDIT 2 — MODEL. Pure math, no pixels.

   Exact rational arithmetic over ordinary integers. Every value is kept in
   canonical form: d > 0, gcd(|n|, d) = 1, and zero is exactly {n: 0, d: 1}.
   Canonical form is what makes ratEq a sound equality test — which is what the
   calibration stamp is gated on, so it can never fire falsely.

   Why plain Numbers are safe here (proved exhaustively in audit-series.mjs):
   the dials bound |a| ≤ 6, n ≤ 10, and every r = p/q has |p| ≤ 3, q ≤ 4. So
   denominators never exceed q^(n−1) ≤ 4⁹ = 262,144 and the largest cross-
   multiplication stays under ~10¹², far below Number.MAX_SAFE_INTEGER ≈ 9×10¹⁵.
   ========================================================================== */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}
function rat(n, d = 1) {
  if (d === 0) throw new Error('rational with zero denominator');
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
}
const ZERO = rat(0, 1);
const ONE = rat(1, 1);
const ratAdd = (x, y) => rat(x.n * y.d + y.n * x.d, x.d * y.d);
const ratSub = (x, y) => rat(x.n * y.d - y.n * x.d, x.d * y.d);
const ratMul = (x, y) => rat(x.n * y.n, x.d * y.d);
const ratDiv = (x, y) => {
  if (y.n === 0) throw new Error('rational division by zero');
  return rat(x.n * y.d, x.d * y.n);
};
const ratAbs = (x) => rat(Math.abs(x.n), x.d);
const ratEq = (x, y) => x.n === y.n && x.d === y.d; // sound: both are canonical
const ratCmp = (x, y) => Math.sign(x.n * y.d - y.n * x.d); // denominators are > 0
const ratNum = (x) => x.n / x.d; // ONLY for pixels and decimal readouts
function ratPow(x, k) {
  // k ≥ 0. Reduce every step so intermediates stay small.
  let out = ONE;
  for (let i = 0; i < k; i++) out = ratMul(out, x);
  return out;
}

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Three dials (one of which swaps with the series type),
   unlocking one per lesson step:
     a — the FIRST term a₁ (the star). 1..6, kept positive and non-zero so every
         reachable state is a well-formed series (a = 0 would make every
         geometric term 0 — a degenerate picture with nothing to teach).
     n — how many terms you add. 1..10; 10 rows still read cleanly on the stage.
     d — the common DIFFERENCE (arithmetic mode). −3..4 includes decreasing
         series, where later terms go negative and the walk turns back.
     r — the common RATIO (geometric mode). A curated list of exact rationals
         rather than a float slider: every reachable r is a clean fraction, and
         the list deliberately spans all three behaviours — |r| < 1 (converges),
         |r| = 1 (diverges: r = 1 grows steadily, r = −1 oscillates forever
         without settling), and |r| > 1 (blows up).
   ------------------------------------------------------------------------- */
const A_MIN = 1;
const A_MAX = 6;
const D_MIN = -3;
const D_MAX = 4;
const N_MIN = 1;
const N_MAX = 10;
const R_LIST = [
  rat(-1, 1),
  rat(-3, 4),
  rat(-2, 3),
  rat(-1, 2),
  rat(-1, 3),
  rat(1, 4),
  rat(1, 3),
  rat(1, 2),
  rat(2, 3),
  rat(3, 4),
  rat(1, 1),
  rat(3, 2),
  rat(2, 1),
];
const R_HALF = 7; // index of r = 1/2 — the iconic convergent ratio
const R_QUARTER = 5; // index of r = 1/4 — the calibration start (S = 4a/3, never a target)
const START = { a: 2, d: 3, rIdx: R_HALF, n: 4 }; // opens on 2 + 5 + 8 + 11 = 26

/* ---- the series itself ---------------------------------------------------- */
// the n terms, exact. arithmetic: a + (k−1)d   ·   geometric: a · r^(k−1)
function termsOf(mode, a, d, r, n) {
  const out = [];
  for (let k = 1; k <= n; k++) {
    out.push(mode === 'arith' ? rat(a + (k - 1) * d, 1) : ratMul(rat(a, 1), ratPow(r, k - 1)));
  }
  return out;
}
// [S₀, S₁, …, Sₙ] with S₀ = 0. Built by ADDING, because that is the definition
// of a partial sum; the closed forms below are checked against it, not trusted.
function partialsOf(terms) {
  const out = [ZERO];
  let acc = ZERO;
  for (const t of terms) {
    acc = ratAdd(acc, t);
    out.push(acc);
  }
  return out;
}
// Gauss: Sₙ = n(a₁ + aₙ)/2, exact.
function closedFormArith(a, d, n) {
  return rat(n * (2 * a + (n - 1) * d), 2);
}
// Sₙ = a(1 − rⁿ)/(1 − r) for r ≠ 1; at r = 1 every term is a, so Sₙ = n·a.
function closedFormGeom(a, r, n) {
  if (ratEq(r, ONE)) return rat(n * a, 1);
  return ratDiv(ratMul(rat(a, 1), ratSub(ONE, ratPow(r, n))), ratSub(ONE, r));
}
// an infinite geometric series converges exactly when |r| < 1
const convergesGeom = (r) => ratCmp(ratAbs(r), ONE) < 0;
// S = a/(1 − r), only meaningful when convergesGeom(r)
const infSumGeom = (a, r) => ratDiv(rat(a, 1), ratSub(ONE, r));
// the gap still left after n terms: S − Sₙ = a·rⁿ/(1 − r) = rⁿ × (the whole sum)
const gapGeom = (a, r, n) => ratDiv(ratMul(rat(a, 1), ratPow(r, n)), ratSub(ONE, r));

/* ---------------------------------------------------------------------------
   Formatting helpers.
   ------------------------------------------------------------------------- */
const SUBS = '₀₁₂₃₄₅₆₇₈₉';
const sub = (k) => String(k).split('').map((c) => SUBS[+c] ?? c).join('');
/* A real typographic MINUS (U+2212), never an ASCII hyphen. It is what a maths
   text prints, it is what a screen reader voices as "minus", and it matches the
   minus in the equation line — "-1/2" beside "− 1/2" reads as two different
   things to a student. */
const MINUS = '−';
const minus = (s) => String(s).replace(/-/g, MINUS);
const ratStr = (x) => minus(x.d === 1 ? String(x.n) : `${x.n}/${x.d}`);
/* …and a negative value embedded in a formula needs bracketing, or the readout
   prints "1−−1/2" instead of "1−(−1/2)". */
const ratParen = (x) => (x.n < 0 ? `(${ratStr(x)})` : ratStr(x));
function fmtNum(v) {
  if (Object.is(v, -0)) v = 0;
  if (Number.isInteger(v)) return minus(String(v));
  const s = v.toFixed(2).replace(/\.?0+$/, '');
  return minus(s === '-0' ? '0' : s);
}
// a decimal echo for the exact value, so students connect 63/32 with 1.97
function ratDec(x, places = 3) {
  const v = ratNum(x);
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(places).replace(/\.?0+$/, '');
}
// "2 + 5 + 8 + 11" — with proper minus signs, and an ellipsis that still names
// the last term, so the notation stays honest when the list is long.
// The sign carried in front of the ⋯ is the sign of the FIRST OMITTED term, per
// standard notation: an alternating series must read 1 − 1/2 + 1/4 − ⋯ − 1/128,
// never "+ ⋯ − 1/128", which invites a reader to take the hidden terms as added.
function seriesText(terms, maxShow = 6) {
  const N = terms.length;
  const piece = (t, first) => {
    const mag = ratStr(ratAbs(t));
    if (first) return (t.n < 0 ? '−' : '') + mag;
    return (t.n < 0 ? ' − ' : ' + ') + mag;
  };
  if (N <= maxShow) return terms.map((t, i) => piece(t, i === 0)).join('');
  const head = terms.slice(0, maxShow - 1).map((t, i) => piece(t, i === 0)).join('');
  const elided = terms[maxShow - 1]; // the first term the ⋯ stands for
  return head + (elided.n < 0 ? ' − ⋯' : ' + ⋯') + piece(terms[N - 1], false);
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration ("build the target sum"). A target integer T is flagged
   on the line; the student tunes the first term a and the ratio r until the
   INFINITE sum a/(1−r) lands exactly on it.

   Why the stamp cannot fire falsely: CALIBRATED is gated on ratEq(S, rat(T)) —
   exact rational equality between canonical forms — never a float compare and
   never a tolerance. Everything short of an exact hit is capped at 96% by the
   meter, so 100% and the stamp are reachable only by actually solving it. A
   divergent choice (|r| ≥ 1) has no infinite sum at all and scores 0.

   Targets are curated so each is reachable by at least TWO distinct (a, r)
   pairs — success then quietly reveals a whole family (S = 6 ← 3 & 1/2,
   2 & 2/3, 4 & 1/3), which is the real lesson: the sum does not name the
   series. audit-series.mjs re-derives the solution set and asserts ≥ 2 for
   every target, so this list cannot silently rot.
   ------------------------------------------------------------------------- */
const CALIB_TARGETS = [2, 3, 4, 6, 8, 9, 12];
// every (a, rIdx) on the dial grid whose infinite sum is exactly T
function infSumSolutions(T) {
  const out = [];
  for (let a = A_MIN; a <= A_MAX; a++) {
    for (let i = 0; i < R_LIST.length; i++) {
      const r = R_LIST[i];
      if (!convergesGeom(r)) continue;
      if (ratEq(infSumGeom(a, r), rat(T, 1))) out.push({ a, rIdx: i });
    }
  }
  return out;
}
function makeTarget(prev) {
  let t;
  do {
    t = CALIB_TARGETS[Math.floor(Math.random() * CALIB_TARGETS.length)];
  } while (t === prev && CALIB_TARGETS.length > 1);
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with its step; the
   reveal lives in `feedback` (shown after answering, never in the intro); the
   distractors are real student misconceptions — the (n−1) off-by-one, "the
   infinite sum is just under 2", "adding forever must give infinity", and
   confusing a partial sum with a term. Next is gated on ANSWERED, not CORRECT.
   Questions state their own numbers so they stay true whatever the dials say.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the series',
    body:
      'A SEQUENCE lists numbers one after another: 2, 5, 8, 11, …. A SERIES is what you get when you ADD ' +
      'them: 2 + 5 + 8 + 11. Below, each carmine bar is one term, and every bar starts exactly where the ' +
      'one above it stopped — so the right edge of the last bar is the running total. A series is about ' +
      'that total, not about the list.',
    q: 'What is the difference between the sequence 2, 5, 8, 11 and the series 2 + 5 + 8 + 11?',
    choices: [
      'The sequence LISTS the terms; the series ADDS them, giving one number (26)',
      'There is no difference — they are two names for the same list',
      'The series is the sequence written backwards',
    ],
    answer: 0,
    feedback:
      'A sequence is an ordered list of terms; a series is the sum of those terms. The sequence 2, 5, 8, 11 ' +
      'is four separate values; the series 2 + 5 + 8 + 11 is one value, 26. That single number is what this ' +
      'whole lab is about — and when you add only part of a list, what you get is called a PARTIAL SUM.',
  },
  {
    title: 'Where it starts',
    body:
      'The a dial is live — it sets the FIRST term, a₁. Slide it and watch the top bar change length. But ' +
      'watch the others too: every later bar slides along with it, because each one starts where the last ' +
      'one ended. In this series the terms are a₁, a₁+d, a₁+2d, a₁+3d — all of them built from a₁.',
    q: 'The four terms are a₁, a₁+d, a₁+2d, a₁+3d. If you slide a₁ up by 1 (leaving d alone), what happens to their sum?',
    choices: [
      'It goes up by 4 — every one of the four terms goes up by 1',
      'It goes up by 1 — only the first term changed',
      'It does not change — d is what controls the total',
    ],
    answer: 0,
    feedback:
      'Every term is built from a₁, so raising a₁ by 1 raises ALL FOUR terms by 1 and the total by 4 × 1 = 4. ' +
      'Slide the a dial and watch the last bar’s right edge jump four units at a time. “Only the first term ' +
      'changed” would be right if the other terms were fixed numbers — but they are tied to a₁, and that is ' +
      'exactly what makes this a series rather than four unrelated numbers.',
  },
  {
    title: 'Partial sums',
    body:
      'The n dial unlocks — it sets how many terms you add. Add them one at a time and you get the PARTIAL ' +
      'SUMS: S₁ = a₁, S₂ = a₁+a₂, S₃ = a₁+a₂+a₃, …. Each carmine dot on the number line at the top is one ' +
      'partial sum — how far you have got after that many terms. Sₙ is the sum of the first n terms.',
    q: 'For the series 2 + 5 + 8 + 11 + … , what is the partial sum S₃?',
    choices: [
      '15 — that is 2 + 5 + 8, the first three terms',
      '8 — the third term',
      '26 — the total of all four terms shown',
    ],
    answer: 0,
    feedback:
      'S₃ means “add the first THREE terms”: 2 + 5 + 8 = 15. It is not the third term by itself (that is a₃ = 8) ' +
      'and not S₄ = 26. The partial sums stack up: S₁ = 2, S₂ = 7, S₃ = 15, S₄ = 26. Notice that the step from ' +
      'one dot to the next, Sₖ − Sₖ₋₁, is always just the next term — which is why the bars chain end to end.',
  },
  {
    title: 'Arithmetic: add d every time',
    body:
      'The d dial unlocks. An ARITHMETIC series adds the same amount, d, to get each next term: a₁, a₁+d, ' +
      'a₁+2d, …. Every bar is the same amount longer (or shorter) than the one above it. The nth term is ' +
      'aₙ = a₁ + (n−1)d — that is (n−1), not n, because the first term has taken no steps yet.',
    q: 'In the arithmetic sequence 4, 7, 10, 13, … , what is the 10th term?',
    choices: [
      '31 — a₁₀ = 4 + (10−1)·3 = 4 + 27',
      '34 — a₁₀ = 4 + 10·3',
      '30 — a₁₀ = 3 × 10',
    ],
    answer: 0,
    feedback:
      'a₁₀ = a₁ + (10−1)d = 4 + 9·3 = 31. The classic slip is 10·d instead of 9·d: by the time you arrive at the ' +
      '10th term you have taken only NINE steps of 3 (1st→2nd, 2nd→3rd, …, 9th→10th). Count the steps between ' +
      'the terms, not the terms. And 3 × 10 forgets the starting value 4 altogether.',
  },
  {
    title: 'Gauss’s trick',
    body:
      'How would you add 1 + 2 + 3 + ⋯ + 10 without adding ten numbers one by one? Press PAIR UP. Every bar ' +
      'swings back to a common left edge, and a BLUE copy of the same series — running BACKWARDS — is laid on ' +
      'the end of each row. Every row now ends in the same place, because a term and its partner always total ' +
      'a₁ + aₙ. Two copies of the series fill a perfect rectangle, n rows tall and (a₁ + aₙ) wide.',
    q: 'Use the pairing idea: what is 1 + 2 + 3 + ⋯ + 100?',
    choices: [
      '5050 — that is 100 × (1 + 100) ÷ 2',
      '10000 — that is 100 × 100',
      '101 — that is 1 + 100',
    ],
    answer: 0,
    feedback:
      'Pair 1 with 100, 2 with 99, 3 with 98, … — every pair makes 101, and there are 50 of them, so the total ' +
      'is 50 × 101 = 5050. The formula says the same thing: Sₙ = n(a₁+aₙ)/2 = 100(1+100)/2 = 5050. The rectangle ' +
      'on screen is why it works — it holds TWO copies of the series, so you halve it. (Legend has Gauss doing ' +
      'this in his head at about eight years old.) It stays true when n is ODD, too: the leftover middle term is ' +
      'exactly the average (a₁+aₙ)/2 — half a pair.',
  },
  {
    title: 'Geometric: multiply by r every time',
    body:
      'Now the other family — press GEOMETRIC. Instead of ADDING d, each term MULTIPLIES the one before it by ' +
      'the common ratio r: a₁, a₁r, a₁r², …. The nth term is aₙ = a₁·r^(n−1). With r = 1/2 every bar is half ' +
      'the length of the one above, so the bars shrink away fast. Slide r past 1 and they explode instead.',
    q: 'In the geometric sequence 3, 6, 12, 24, … , what is the common ratio r, and what is the 6th term?',
    choices: [
      'r = 2 and a₆ = 3·2⁵ = 96',
      'r = 3 and a₆ = 3·6 = 18',
      'r = 2 and a₆ = 3·2⁶ = 192',
    ],
    answer: 0,
    feedback:
      'Each term is DOUBLE the one before (6÷3 = 2, 12÷6 = 2), so r = 2 — r is what you MULTIPLY by, not the ' +
      'first term. Then a₆ = a₁·r^(6−1) = 3·2⁵ = 3·32 = 96. The exponent is (n−1), the same off-by-one as the ' +
      'arithmetic rule: reaching the 6th term takes only five multiplications, so 3·2⁶ = 192 overshoots by one ' +
      'doubling.',
  },
  {
    title: 'Adding a geometric series',
    body:
      'Geometric series have an adding trick of their own. Write Sₙ = a + ar + ar² + ⋯ + ar⁽ⁿ⁻¹⁾, then multiply ' +
      'the whole line by r: rSₙ = ar + ar² + ⋯ + ar⁽ⁿ⁻¹⁾ + arⁿ. Nearly every term appears in BOTH lines, so ' +
      'subtracting wipes them out and only the ends survive: Sₙ − rSₙ = a − arⁿ. Factor and divide to get ' +
      'Sₙ = a(1 − rⁿ)/(1 − r), for r ≠ 1.',
    q: 'Why does the formula Sₙ = a(1 − rⁿ)/(1 − r) exclude r = 1?',
    choices: [
      'Because at r = 1 it divides by 1 − 1 = 0 — and that series needs no formula: every term is a, so Sₙ = n·a',
      'Because a geometric series is not allowed to have r = 1',
      'Because at r = 1 the sum comes out as 0',
    ],
    answer: 0,
    feedback:
      'At r = 1 the denominator 1 − r is zero, and dividing by zero is undefined — the shift-and-subtract trick ' +
      'collapses, because Sₙ − rSₙ = 0 tells you nothing at all. The SERIES is perfectly healthy though: with ' +
      'r = 1 every term equals a, so Sₙ = a + a + ⋯ + a = n·a. Slide r to 1 and the facts panel switches to n·a ' +
      'for exactly this reason. It is the formula that breaks at r = 1, not the mathematics.',
  },
  {
    title: 'Forever: does it add up?',
    body:
      'Now take infinitely many terms. The grey wall stands at S = a/(1−r), and the GOLD bar on each row is the ' +
      'GAP still left over. Watch the gold bars: each one is r times the one above it. That is the whole story — ' +
      'after n terms the gap is S − Sₙ = a·rⁿ/(1−r) = rⁿ × (the original gap), so every term multiplies what ' +
      'remains by r. If |r| < 1 the gap shrinks toward nothing and the series CONVERGES to S = a/(1−r). If ' +
      '|r| ≥ 1 the gap never shrinks and the series DIVERGES — there is no sum.',
    q: 'What is 1 + 1/2 + 1/4 + 1/8 + ⋯ , continuing forever?',
    choices: [
      'Exactly 2 — S = a/(1−r) = 1/(1 − 1/2)',
      'Just under 2 — it gets close, but the true value must be a little less',
      'Infinity — you are adding forever, so it must grow without bound',
    ],
    answer: 0,
    feedback:
      'It is EXACTLY 2. Every partial sum (1, 3/2, 7/4, 15/8, …) really is less than 2, which is why “just under 2” ' +
      'feels right — but the infinite sum is the value those partial sums close in on, and the gap HALVES with every ' +
      'term you add, so it eventually drops below ANY positive number you could name. No gap survives that, so the ' +
      'sum is 2, not a hair less. ' +
      'And adding forever does not have to give infinity: it only does so when the terms fail to shrink away. ' +
      'One caution worth keeping: terms shrinking to 0 is REQUIRED but is not on its own enough — 1 + 1/2 + 1/3 + ' +
      '1/4 + ⋯ has terms going to 0 and still grows past every bound. For GEOMETRIC series, though, |r| < 1 is ' +
      'exactly the right test.',
  },
  {
    title: 'Build the target sum',
    body:
      'Final challenge. A target is flagged on the line. Build an infinite geometric series that adds to EXACTLY ' +
      'that number: tune the first term a and the ratio r until the wall S = a/(1−r) lands on the flag. Several ' +
      'different series hit each target — the sum does not name the series. Remember |r| must be under 1, or ' +
      'there is no sum to speak of. (n only changes how many terms you SEE; the infinite sum depends on a and r ' +
      'alone.)',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function SeriesLab() {
  const [a, setA] = useState(START.a);
  const [d, setD] = useState(START.d);
  const [rIdx, setRIdx] = useState(START.rIdx);
  const [n, setN] = useState(START.n);
  const [modeState, setModeState] = useState('arith');
  const [pairUp, setPairUp] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const pairURef = useRef(0); // animated 0 → 1: waterfall → paired rectangle
  const rafRef = useRef(0);
  const lastTRef = useRef(0);
  const seedGaussRef = useRef(false);
  const seedGeomRef = useRef(false);

  const current = STEPS[step];
  const calib = !!current.calib;

  /* ---- derived state (single source of truth = the state above) ----------
     The series type is DERIVED, never trusted from state alone: before the
     toggle unlocks the lab is arithmetic no matter what, and calibration is
     always geometric (an arithmetic series has no infinite sum to build). This
     is what keeps back-navigation from ever showing an inconsistent picture. */
  const mode = calib ? 'geom' : step >= 5 ? modeState : 'arith';
  const pairing = mode === 'arith' && pairUp && step >= 4;
  const r = R_LIST[rIdx];

  /* ---- the mathematics, recomputed exactly from state -------------------- */
  const terms = termsOf(mode, a, d, r, n);
  const partials = partialsOf(terms);
  const Sn = partials[n];
  const closed = mode === 'arith' ? closedFormArith(a, d, n) : closedFormGeom(a, r, n);
  const formulaAgrees = ratEq(closed, Sn); // exact ⇒ the ✓ can never lie
  const converges = mode === 'geom' && convergesGeom(r);
  const sInf = converges ? infSumGeom(a, r) : null;
  const gap = converges ? gapGeom(a, r, n) : null;
  const nthTerm = terms[n - 1];
  const pairTotal = ratAdd(terms[0], terms[n - 1]); // a₁ + aₙ — constant across pairs

  // the wall and the gap cascade are step 8's reveal; before that they'd give it away
  const showLimit = converges && (step >= 7 || calib);

  /* ---- calibration status — gated on EXACT rational equality ------------- */
  const calibrated = calib && target != null && converges ? ratEq(sInf, rat(target, 1)) : false;
  let pct = 0;
  if (calib && target != null) {
    if (calibrated) pct = 100;
    else if (converges) {
      const err = Math.abs(ratNum(sInf) - target) / target;
      pct = Math.min(96, Math.max(0, Math.round(100 * (1 - Math.min(1, err))))); // capped: no false 100
    } else pct = 0; // a divergent series has no sum at all
  }
  const solutions = calib && target != null ? infSumSolutions(target) : [];
  const otherSolutions = solutions.filter((s) => !(s.a === a && s.rIdx === rIdx));

  /* snapshot for the renderer — the view reads only from here */
  sceneRef.current = {
    ...sceneRef.current,
    mode,
    n,
    terms,
    partials,
    sInf,
    converges,
    showLimit,
    pairTotal,
    calib,
    target,
    calibrated,
    step,
    pairing,
  };

  /* ---- full redraw of the accumulation waterfall from state -------------- */
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

    const S = sceneRef.current;
    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
    const N = S.n;
    const u = pairURef.current; // 0 = waterfall, 1 = paired rectangle

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

    /* ---- values → numbers (pixels are the ONLY place floats are allowed) -- */
    const tNum = S.terms.map(ratNum);
    const pNum = S.partials.map(ratNum);
    const sInfN = S.sInf ? ratNum(S.sInf) : null;
    const pairN = ratNum(S.pairTotal);

    /* ---- world window, tweened between the two arrangements -------------- */
    let loW = Math.min(0, ...pNum);
    let hiW = Math.max(0, ...pNum);
    if (S.showLimit && sInfN != null) {
      loW = Math.min(loW, sInfN);
      hiW = Math.max(hiW, sInfN);
    }
    if (S.calib && S.target != null) hiW = Math.max(hiW, S.target);
    // in the paired arrangement every row runs from 0 (or below, if a term is
    // negative) out to a₁ + aₙ
    let loP = Math.min(0, pairN);
    let hiP = Math.max(0, pairN);
    for (let k = 0; k < N; k++) {
      loP = Math.min(loP, tNum[k], 0);
      hiP = Math.max(hiP, tNum[k], pairN);
    }
    let lo = loW + (loP - loW) * u;
    let hi = hiW + (hiP - hiW) * u;
    let span = hi - lo;
    if (!(span > 0)) span = 1;
    lo -= span * 0.06;
    hi += span * 0.1;
    span = hi - lo;

    const padL = 30;
    const padR = 30;
    const xOf = (v) => padL + ((v - lo) / span) * (W - padL - padR);

    /* ---- the value axis along the top ------------------------------------ */
    const yAx = 34;
    ctx.strokeStyle = 'rgba(28,43,58,0.6)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(padL - 10, yAx);
    ctx.lineTo(W - padR + 10, yAx);
    ctx.stroke();

    const stp = niceStep(span, 7);
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let i = Math.ceil(lo / stp); i <= Math.floor(hi / stp); i++) {
      const v = i * stp;
      const X = xOf(v);
      const zero = i === 0;
      ctx.strokeStyle = zero ? 'rgba(28,43,58,0.55)' : 'rgba(28,43,58,0.28)';
      ctx.lineWidth = zero ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(X, yAx - 4);
      ctx.lineTo(X, yAx + 4);
      ctx.stroke();
      ctx.fillStyle = zero ? INK_SOFT : 'rgba(91,107,123,0.85)';
      ctx.fillText(fmtNum(v), X, yAx - 6);
    }

    /* ---- geometry of the rows --------------------------------------------
       Rows are capped in height so ten of them still fit, then the whole block
       is CENTRED in the space under the axis — otherwise a short series (n = 4)
       huddles at the top and leaves half the stage empty.
       bandTop leaves a clear strip under the axis for the wall's "S = …" tag
       and the paired rectangle's "a₁ + aₙ = …" caption: at n = 10 the rows
       otherwise fill the band exactly and that caption lands on the axis. */
    const bandTop = 64;
    const bandBot = H - 12;
    const rowH = Math.min(34, (bandBot - bandTop) / Math.max(1, N));
    const rowTop = bandTop + Math.max(0, (bandBot - bandTop - rowH * N) / 2);
    const barH = Math.max(6, Math.min(15, rowH * 0.54));
    const yRow = (k) => rowTop + (k - 1) * rowH + rowH / 2; // k is 1-based

    /* ---- the wall at S = a/(1−r), and the gold gap it leaves -------------- */
    if (S.showLimit && sInfN != null && u < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - u;
      const wx = xOf(sInfN);
      ctx.strokeStyle = GOLD;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(wx, yAx + 6);
      ctx.lineTo(wx, H - 4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = GOLD;
      ctx.font = `700 11px ${MONO}`;
      ctx.textAlign = wx > W - 84 ? 'right' : 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`S = ${ratStr(S.sInf)}`, wx + (wx > W - 84 ? -5 : 5), yAx + 8);
      ctx.restore();
    }

    /* ---- calibration: the target flag ------------------------------------ */
    if (S.calib && S.target != null && u < 1) {
      const tx = xOf(S.target);
      ctx.save();
      ctx.globalAlpha = 1 - u;
      ctx.strokeStyle = S.calibrated ? OK : 'rgba(28,43,58,0.55)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(tx, yAx - 16);
      ctx.lineTo(tx, H - 4);
      ctx.stroke();
      ctx.setLineDash([]);
      const flip = tx > W - 96;
      ctx.fillStyle = S.calibrated ? OK : INK;
      ctx.beginPath();
      ctx.moveTo(tx, yAx - 30);
      ctx.lineTo(tx + (flip ? -34 : 34), yAx - 24);
      ctx.lineTo(tx, yAx - 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `700 9px ${MONO}`;
      ctx.textAlign = flip ? 'right' : 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`target ${S.target}`, tx + (flip ? -4 : 4), yAx - 24);
      ctx.restore();
    }

    /* ---- the paired rectangle's flush right edge (Gauss) ------------------ */
    if (S.mode === 'arith' && u > 0.5) {
      const al = (u - 0.5) / 0.5;
      ctx.save();
      ctx.globalAlpha = al;
      const px = xOf(pairN);
      const zx = xOf(0);
      ctx.strokeStyle = BLUE;
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, rowTop - 8);
      ctx.lineTo(px, rowTop + N * rowH + 4);
      ctx.moveTo(zx, rowTop - 8);
      ctx.lineTo(zx, rowTop + N * rowH + 4);
      ctx.stroke();
      ctx.setLineDash([]);
      // the rectangle the two copies fill: n rows tall, (a₁+aₙ) wide
      ctx.strokeStyle = 'rgba(63,116,166,0.55)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(Math.min(zx, px), rowTop - 8, Math.abs(px - zx), N * rowH + 12);
      ctx.fillStyle = BLUE;
      ctx.font = `700 11px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`a₁ + a${sub(N)} = ${ratStr(S.pairTotal)}`, (zx + px) / 2, rowTop - 11);
      ctx.restore();
    }

    /* ---- the rows: one bar per term --------------------------------------- */
    for (let k = 1; k <= N; k++) {
      const y = yRow(k);
      const t = tNum[k - 1];
      const startW = pNum[k - 1]; // waterfall: start where the last term stopped
      const start = startW + (0 - startW) * u; // paired: swing back to a common left edge
      const end = start + t;
      const xa = xOf(start);
      const xb = xOf(end);
      const left = Math.min(xa, xb);
      const w = Math.max(1.5, Math.abs(xb - xa));
      const neg = t < 0;

      /* the chain: a faint connector from the previous bar's end down to this
         bar's start — this is what makes "each term starts where the last one
         stopped" visible rather than merely stated. Fades out when pairing. */
      if (k > 1 && u < 0.6) {
        ctx.save();
        ctx.globalAlpha = (1 - u / 0.6) * 0.5;
        ctx.strokeStyle = INK_SOFT;
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xa, yRow(k - 1) + barH / 2);
        ctx.lineTo(xa, y - barH / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      /* the term bar. Positive terms are solid carmine and push right; negative
         terms are hollow and push back left — the walk turning around. */
      if (neg) {
        ctx.fillStyle = CURVE_SOFT;
        ctx.fillRect(left, y - barH / 2, w, barH);
        ctx.strokeStyle = CURVE;
        ctx.setLineDash([3, 2]);
        ctx.lineWidth = 1.3;
        ctx.strokeRect(left + 0.5, y - barH / 2 + 0.5, Math.max(1, w - 1), barH - 1);
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = CURVE;
        ctx.fillRect(left, y - barH / 2, w, barH);
      }

      /* the term's value: inside the bar when it fits, otherwise just past it.
         An outside label sits on open paper and can land on the wall, the grid
         or a gap bar (late terms crowd right up against the wall), so it gets a
         paper halo and stays legible over whatever is behind it. */
      const lab = ratStr(S.terms[k - 1]);
      ctx.font = `700 10.5px ${MONO}`;
      ctx.textBaseline = 'middle';
      if (w > 30 && barH >= 11 && !neg) {
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(lab, left + w / 2, y + 0.5);
      } else {
        // flip to the bar's left when a right-hand label would run off the edge
        const rx = Math.max(xa, xb) + 5;
        const fits = rx + ctx.measureText(lab).width <= W - 3;
        ctx.textAlign = fits ? 'left' : 'right';
        const lx = fits ? rx : Math.min(xa, xb) - 5;
        ctx.lineWidth = 3;
        ctx.strokeStyle = PAPER;
        ctx.lineJoin = 'round';
        ctx.strokeText(lab, lx, y + 0.5);
        ctx.fillStyle = CURVE;
        ctx.fillText(lab, lx, y + 0.5);
      }

      /* the reversed BLUE copy — laid on this row's end, fading in as we pair.
         t_k + t_{n+1−k} = 2a + (n−1)d for EVERY k, so every row ends flush. */
      if (S.mode === 'arith' && u > 0) {
        const al = Math.max(0, (u - 0.5) / 0.5);
        if (al > 0) {
          const mt = tNum[N - k]; // t_{n+1−k}
          const xc = xOf(end);
          const xd = xOf(end + mt);
          const bl = Math.min(xc, xd);
          const bw = Math.max(1.5, Math.abs(xd - xc));
          ctx.save();
          ctx.globalAlpha = al;
          if (mt < 0) {
            ctx.fillStyle = 'rgba(63,116,166,0.18)';
            ctx.fillRect(bl, y - barH / 2, bw, barH);
            ctx.strokeStyle = BLUE;
            ctx.setLineDash([3, 2]);
            ctx.lineWidth = 1.3;
            ctx.strokeRect(bl + 0.5, y - barH / 2 + 0.5, Math.max(1, bw - 1), barH - 1);
            ctx.setLineDash([]);
          } else {
            ctx.fillStyle = BLUE;
            ctx.fillRect(bl, y - barH / 2, bw, barH);
          }
          if (bw > 30 && barH >= 11 && mt >= 0) {
            ctx.fillStyle = '#fff';
            ctx.font = `700 10.5px ${MONO}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ratStr(S.terms[N - k]), bl + bw / 2, y + 0.5);
          }
          ctx.restore();
        }
      }

      /* the GOLD gap: how much of S is still missing after k terms. Each one is
         r times the one above — the cascade IS why the series converges. */
      if (S.showLimit && sInfN != null && u < 1) {
        const gx0 = xOf(pNum[k]);
        const gx1 = xOf(sInfN);
        const gl = Math.min(gx0, gx1);
        const gw = Math.abs(gx1 - gx0);
        const last = k === N;
        ctx.save();
        ctx.globalAlpha = 1 - u;
        if (gw > 0.6) {
          ctx.fillStyle = last ? GOLD : GOLD_SOFT;
          const gh = last ? barH * 0.8 : barH * 0.5;
          ctx.fillRect(gl, y - gh / 2, Math.max(0.8, gw), gh);
        }
        if (last) {
          ctx.font = `700 10px ${MONO}`;
          ctx.textBaseline = 'top';
          const gTxt = `gap ${ratStr(gapOf(S))}`;
          const gW = ctx.measureText(gTxt).width;
          const room = gw > gW + 8;
          // once the gap is a sliver against a wall near the right margin, the
          // label must fall back to the LEFT or it runs off the canvas
          const rx = gl + Math.max(gw, 2) + 4;
          const fits = rx + gW <= W - 3;
          ctx.textAlign = room ? 'center' : fits ? 'left' : 'right';
          const gX = room ? gl + gw / 2 : fits ? rx : gl - 4;
          const gY = y + barH * 0.6;
          ctx.lineWidth = 3;
          ctx.strokeStyle = PAPER;
          ctx.lineJoin = 'round';
          ctx.strokeText(gTxt, gX, gY);
          ctx.fillStyle = GOLD;
          ctx.fillText(gTxt, gX, gY);
        }
        ctx.restore();
      }

      /* the partial sum S_k, echoed as a dot on the axis: the series' own
         sequence, marching toward the wall */
      if (u < 1) {
        const dx = xOf(pNum[k]);
        ctx.save();
        ctx.globalAlpha = 1 - u;
        const isLast = k === N;
        ctx.beginPath();
        ctx.arc(dx, yAx, isLast ? 5.2 : 3.2, 0, Math.PI * 2);
        ctx.fillStyle = isLast ? PAPER : CURVE;
        ctx.fill();
        if (isLast) {
          ctx.strokeStyle = CURVE;
          ctx.lineWidth = 2.4;
          ctx.stroke();
          // a dashed riser tying the last bar's edge to its dot on the axis
          ctx.strokeStyle = 'rgba(200,30,79,0.4)';
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(dx, yAx + 6);
          ctx.lineTo(dx, y - barH / 2 - 1);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
    }

    /* ---- divergence caption ---------------------------------------------- */
    if (S.mode === 'geom' && !S.converges && S.step >= 7 && u < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = CURVE;
      ctx.font = `italic 700 12px ${MONO}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('the gap never shrinks · · · no sum', W - padR + 8, rowTop + N * rowH + 2);
      ctx.restore();
    }
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [a, d, rIdx, n, mode, step, target, pairing, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* the pair-up tween: time-based (never per-frame), opt-in (a button press,
     never ambient), and instant when the reader prefers reduced motion */
  useEffect(() => {
    const goal = pairing ? 1 : 0;
    /* A reversed second copy is a fact about ARITHMETIC series only
       (t_k + t_{n+1−k} is constant precisely because the terms step by a fixed
       d). So leaving that mode snaps straight back to the waterfall rather than
       tweening through frames whose blue half would be a lie. */
    if (mode === 'geom' && pairURef.current !== 0) {
      pairURef.current = 0;
      draw();
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      pairURef.current = goal;
      draw();
      return;
    }
    if (pairURef.current === goal) return;
    lastTRef.current = 0;
    const tick = (t) => {
      if (!lastTRef.current) lastTRef.current = t;
      const dt = Math.min(0.05, (t - lastTRef.current) / 1000); // seconds, clamped
      lastTRef.current = t;
      const cur = pairURef.current;
      const nxt = goal > cur ? Math.min(goal, cur + dt / 0.7) : Math.max(goal, cur - dt / 0.7);
      pairURef.current = nxt;
      draw();
      if (nxt !== goal) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pairing, mode, draw]);

  /* entering Gauss's step: seed the iconic 1 + 2 + ⋯ + 10 (once, so a reader
     who goes back to explore is never overruled) */
  useEffect(() => {
    if (step === 4 && !seedGaussRef.current) {
      seedGaussRef.current = true;
      setA(1);
      setD(1);
      setN(10);
      setPairUp(false);
    }
    if (step === 5 && !seedGeomRef.current) {
      seedGeomRef.current = true;
      setModeState('geom');
      setA(1);
      setRIdx(R_HALF);
      setN(6);
      setPairUp(false);
    }
  }, [step]);

  /* entering calibration: hand out a target and start well away from it
     (a = 1, r = 1/4 ⇒ S = 4/3, which is not — and cannot be — any target) */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setA(1);
      setRIdx(R_QUARTER);
      setN(5);
      setPairUp(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'a') setA(v);
    else if (key === 'n') setN(v);
    else if (key === 'd') setD(v);
    else setRIdx(v);
  };
  const resetDials = () => {
    if (mode === 'geom') {
      setA(1);
      setRIdx(R_HALF);
      setN(6);
    } else {
      setA(step >= 4 ? 1 : START.a);
      setD(step >= 4 ? 1 : START.d);
      setN(step >= 4 ? 10 : START.n);
    }
  };
  const newTarget = () => {
    setTarget(makeTarget(target));
    setA(1);
    setRIdx(R_QUARTER);
    setN(5);
  };
  const choose = (idx) => {
    if (answers[step] != null) return; // lock the answer once given
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const restart = () => {
    setStep(0);
    setAnswers({});
    setTarget(null);
    seedGaussRef.current = false;
    seedGeomRef.current = false;
    pairURef.current = 0;
    setPairUp(false);
    setModeState('arith');
    setA(START.a);
    setD(START.d);
    setRIdx(START.rIdx);
    setN(START.n);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* ---- the dials. The middle dial SWAPS with the series type: d is what you
     add, r is what you multiply by — the same slot, because they play the same
     role in their own family. Showing only the live one keeps the contrast
     sharp instead of parking a dead control on screen. -------------------- */
  const dials = [
    { key: 'a', label: 'a', min: A_MIN, max: A_MAX, step: 1, unlock: 1, star: true, role: 'the first term a₁', value: a, display: String(a) },
    { key: 'n', label: 'n', min: N_MIN, max: N_MAX, step: 1, unlock: 2, role: 'how many terms you add', value: n, display: String(n) },
    mode === 'arith'
      ? { key: 'd', label: 'd', min: D_MIN, max: D_MAX, step: 1, unlock: 3, second: true, role: 'common difference — add this each time', value: d, display: minus(String(d)) }
      : { key: 'r', label: 'r', min: 0, max: R_LIST.length - 1, step: 1, unlock: 5, second: true, role: 'common ratio — multiply by this each time', value: rIdx, display: ratStr(r) },
  ];

  /* ---- header readout (the symbolic ↔ picture link) ----------------------
     The equation is ALWAYS carmine, because it always reads Sₙ = the sum of the
     carmine bars, whose value is the ringed carmine dot on the axis. That one
     colour is the whole link between the symbol and the picture, so it never
     migrates. The verdict is a different job — it takes the colour of whatever
     object it is talking about: gold for the gap and the wall, blue for the
     paired rectangle. */
  const eqLead = `S${sub(n)} = ${seriesText(terms)} = ${ratStr(Sn)}`;
  let verdict, verdictClass;
  if (calib && target != null) {
    if (!converges) {
      verdict = `|r| = ${ratStr(ratAbs(r))} is not under 1 — this series has no sum at all`;
      verdictClass = 'muted';
    } else if (calibrated) {
      verdict = `S = a/(1−r) = ${ratStr(sInf)} — you built the target sum`;
      verdictClass = 'gold';
    } else {
      verdict = `S = a/(1−r) = ${ratStr(sInf)} — steer the wall onto ${target}`;
      verdictClass = 'muted';
    }
  } else if (mode === 'geom') {
    verdict = converges
      ? `each term multiplies the gap by ${ratStr(r)} — the total closes on ${ratStr(sInf)}`
      : `|r| = ${ratStr(ratAbs(r))} ≥ 1 — the terms never shrink away, so there is no sum`;
    verdictClass = converges ? 'gold' : 'muted';
  } else if (pairing) {
    verdict = `two copies fill ${n} × ${ratStr(pairTotal)} — so S${sub(n)} is half of that`;
    verdictClass = 'blue';
  } else {
    verdict = `add ${n} term${n === 1 ? '' : 's'}, each one starting where the last stopped`;
    verdictClass = 'muted';
  }

  /* ---- spoken description (the canvas is a picture; this is its words) ---- */
  const spoken = calib && target != null
    ? `Build the target sum ${target}. First term a is ${a}, ratio r is ${ratStr(r)}. ${
        converges
          ? `The infinite sum is ${ratStr(sInf)}. ${calibrated ? 'Calibrated — the target is built.' : 'Not yet on target.'}`
          : 'This ratio makes the series diverge, so there is no infinite sum.'
      }`
    : mode === 'geom'
    ? `A geometric series with first term ${a} and ratio ${ratStr(r)}. The first ${n} terms are ${terms
        .map(ratStr)
        .join(', ')}, and their sum S${n} is ${ratStr(Sn)}. ${
        converges
          ? `Because the size of r is under 1, the infinite sum converges to ${ratStr(sInf)}, and the gap left after ${n} terms is ${ratStr(gap)}.`
          : 'Because the size of r is 1 or more, the series diverges and has no sum.'
      }`
    : `An arithmetic series with first term ${a} and common difference ${d}. The first ${n} terms are ${terms
        .map(ratStr)
        .join(', ')}, and their sum S${n} is ${ratStr(Sn)}.${
        pairing ? ` Paired up, every row totals ${ratStr(pairTotal)}, so twice S${n} is ${n} times ${ratStr(pairTotal)}.` : ''
      }`;

  return (
    <div className="slab">
      <header className="head">
        <h1>Series</h1>
        <p className="lede">
          A <em>sequence</em> lists numbers; a <em>series</em> <em>adds</em> them. Each carmine bar below is one
          term, and every bar starts where the last one stopped — so the edge you reach after <em>n</em> terms is
          the <em>partial sum</em> S<sub>n</sub>. Add the same amount each time and you have an{' '}
          <em>arithmetic</em> series, which Gauss showed you can fold into a rectangle. Multiply by the same
          amount each time and you have a <em>geometric</em> series — and if that multiplier is small enough,
          infinitely many terms still add up to a finite number.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation curve">{eqLead}</p>
            <p className={'verdict ' + verdictClass}>{verdict}</p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
          </div>
          {/* The hint sits UNDER the stage rather than floating over it: the rows
              use the canvas's full height, so an overlaid pill covers the last
              term (and wraps to two lines on a narrow screen, covering two). */}
          <p className="hint mono">
            {step < 1
              ? 'each bar starts where the last one stopped'
              : pairing
              ? 'every row ends in the same place'
              : mode === 'geom' && showLimit
              ? `watch the gold gap shrink by ×${ratParen(r)}`
              : 'slide the dials — watch the running total'}
          </p>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="sw curve" /> a term
            </span>
            <span className="lg">
              <span className="ring curve" /> partial sum S{sub(n)}
            </span>
            {showLimit && (
              <span className="lg">
                <span className="sw gold" /> the gap still left
              </span>
            )}
            {pairing && (
              <span className="lg">
                <span className="sw blue" /> the series reversed
              </span>
            )}
          </div>

          {/* facts panel — adapts to the series type */}
          <div className="facts">
            <div className="fact">
              <span className="fact-k">The first {n} term{n === 1 ? '' : 's'}</span>
              <span className="fact-v mono" style={{ color: CURVE, fontWeight: 700 }}>
                {terms.map(ratStr).join(', ')}, …
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">The nth term</span>
              <span className="fact-v mono">
                {mode === 'arith'
                  ? `a${sub(n)} = ${a} + (${n}−1)·${minus(d)} = `
                  : `a${sub(n)} = ${a}·(${ratStr(r)})${supStr(n - 1)} = `}
                <b style={{ color: CURVE }}>{ratStr(nthTerm)}</b>
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Partial sum (by adding)</span>
              <span className="fact-v mono">
                S{sub(n)} = <b style={{ color: CURVE }}>{ratStr(Sn)}</b>
                {Sn.d !== 1 && <span className="dec"> ≈ {ratDec(Sn)}</span>}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Partial sum (by formula)</span>
              <span className="fact-v mono">
                {mode === 'arith' ? (
                  <>
                    {`${n}(${ratStr(terms[0])} + ${ratParen(nthTerm)})/2 = `}
                    <b>{ratStr(closed)}</b>
                  </>
                ) : ratEq(r, ONE) ? (
                  <>
                    {`r = 1 ⇒ n·a = ${n}·${a} = `}
                    <b>{ratStr(closed)}</b>
                  </>
                ) : (
                  <>
                    {`${a}(1−(${ratStr(r)})${supStr(n)})/(1−${ratParen(r)}) = `}
                    <b>{ratStr(closed)}</b>
                  </>
                )}
                {formulaAgrees && <span className="tick"> ✓</span>}
              </span>
            </div>
            <div className="fact wide">
              <span className="fact-k">Adding forever</span>
              {mode === 'arith' ? (
                <span className="fact-v mono">
                  diverges — the terms never shrink to 0, so the total runs away
                </span>
              ) : converges ? (
                <span className="fact-v mono">
                  |r| = {ratStr(ratAbs(r))} &lt; 1 ⇒ S = a/(1−r) ={' '}
                  <b style={{ color: GOLD }}>{ratStr(sInf)}</b>
                  {sInf.d !== 1 && <span className="dec"> ≈ {ratDec(sInf)}</span>} · gap after {n}:{' '}
                  <b style={{ color: GOLD }}>{ratStr(gap)}</b>
                  {gap.d !== 1 && <span className="dec"> ≈ {ratDec(gap)}</span>}
                </span>
              ) : (
                <span className="fact-v mono">
                  |r| = {ratStr(ratAbs(r))} ≥ 1 ⇒ diverges — no sum
                  {ratEq(ratAbs(r), ONE) && ratCmp(r, ZERO) < 0 ? ' (the total flips forever without settling)' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="toolbar">
            {step >= 5 && (
              <div className="seg" role="group" aria-label="Series type">
                <button
                  type="button"
                  className={'segbtn' + (mode === 'arith' ? ' on' : '')}
                  aria-pressed={mode === 'arith'}
                  disabled={calib}
                  onClick={() => setModeState('arith')}
                >
                  Arithmetic +d
                </button>
                <button
                  type="button"
                  className={'segbtn' + (mode === 'geom' ? ' on' : '')}
                  aria-pressed={mode === 'geom'}
                  disabled={calib}
                  onClick={() => setModeState('geom')}
                >
                  Geometric ×r
                </button>
              </div>
            )}
            {step >= 4 && mode === 'arith' && (
              <button
                type="button"
                className={'btn ghost' + (pairUp ? ' on' : '')}
                aria-pressed={pairUp}
                onClick={() => setPairUp((v) => !v)}
              >
                {pairUp ? 'Un-pair' : 'Pair up (Gauss)'}
              </button>
            )}
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
            {dials.map((dp) => {
              const unlocked = step >= dp.unlock;
              return (
                <label
                  className={'dial' + (!unlocked ? ' locked' : '') + (dp.star ? ' star' : '') + (dp.second ? ' second' : '')}
                  key={dp.key}
                >
                  <span className="dk">{dp.label}</span>
                  <span className="drole">{unlocked ? dp.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={dp.min}
                    max={dp.max}
                    step={dp.step}
                    value={dp.value}
                    disabled={!unlocked}
                    aria-label={`Dial ${dp.label} — ${dp.role}`}
                    aria-valuetext={dp.display}
                    onChange={(e) => onParam(dp.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? dp.display : '🔒'}</output>
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

          {current.calib && target != null && (
            <div className="calib">
              <p className="calib-lead mono">
                Target: <strong>S = {target}</strong> · tune a and r so a/(1−r) lands here
              </p>

              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {converges ? `S = ${ratStr(sInf)}` : 'S = —'} · {pct.toFixed(0)}%
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {!converges
                      ? 'diverges — bring |r| under 1'
                      : ratCmp(sInf, rat(target, 1)) < 0
                      ? 'too small — raise a, or push r nearer 1'
                      : 'overshot — lower a, or pull r back'}
                  </span>
                )}
              </div>
              {calibrated && otherSolutions.length > 0 && (
                <p className="calib-note mono">
                  Other series adding to {target}:{' '}
                  {otherSolutions.slice(0, 5).map((s, i) => (
                    <span key={s.a + '-' + s.rIdx}>
                      {i > 0 ? ' · ' : ''}
                      a={s.a}, r={ratStr(R_LIST[s.rIdx])}
                    </span>
                  ))}
                </p>
              )}
              <button type="button" className="btn ghost" onClick={newTarget}>
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
              <button type="button" className="btn" onClick={restart}>
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">
          aₙ = a₁ + (n−1)d · Sₙ = n(a₁+aₙ)/2 &nbsp;|&nbsp; aₙ = a₁rⁿ⁻¹ · Sₙ = a(1−rⁿ)/(1−r), r ≠ 1 · S = a/(1−r)
          when |r| &lt; 1
        </span>{' '}
        &nbsp;·&nbsp; a series adds a sequence’s terms; its partial sums are where it has reached; a geometric
        series converges exactly when |r| &lt; 1. CCSS&nbsp;HSF-BF.A.2, HSA-SSE.B.4; infinite geometric series:
        Precalculus.
      </footer>

      <style jsx>{`
        .slab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #3f74a6;
          --gold: #c98a1e;
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
          font-size: 17px;
          font-weight: 600;
          margin: 0;
          overflow-wrap: anywhere;
        }
        .equation.curve {
          color: var(--curve);
        }
        .equation.gold {
          color: var(--gold);
        }
        .equation.blue {
          color: var(--blue);
        }
        .equation.muted {
          color: var(--ink-soft);
        }
        .verdict {
          font-size: 13px;
          margin: 0;
          font-weight: 600;
          max-width: 46ch;
          text-align: right;
          color: var(--ink-soft);
        }
        .verdict.gold {
          color: var(--gold);
        }
        .verdict.blue {
          color: var(--blue);
        }
        .stage {
          position: relative;
          width: min(100%, 680px);
          aspect-ratio: 16 / 9;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 3;
          }
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .hint {
          margin: 8px 0 0;
          text-align: center;
          font-size: 11px;
          color: var(--ink-soft);
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
        .lg {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .sw {
          width: 15px;
          height: 10px;
          border-radius: 2px;
          display: inline-block;
          box-sizing: border-box;
        }
        .sw.curve {
          background: var(--curve);
        }
        .sw.blue {
          background: var(--blue);
        }
        .sw.gold {
          background: var(--gold);
        }
        .ring {
          width: 13px;
          height: 13px;
          border-radius: 50%;
          display: inline-block;
          box-sizing: border-box;
          background: var(--paper);
        }
        .ring.curve {
          border: 2.4px solid var(--curve);
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
          font-size: 13.5px;
          font-variant-numeric: tabular-nums;
          overflow-wrap: anywhere;
        }
        .dec {
          color: var(--ink-soft);
        }
        .tick {
          color: var(--ok);
          font-weight: 700;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
        }
        .seg {
          display: inline-flex;
          border: 1px solid rgba(28, 43, 58, 0.25);
          border-radius: 8px;
          overflow: hidden;
        }
        .segbtn {
          font: 600 12.5px/1 var(--mono);
          padding: 9px 11px;
          border: 0;
          background: transparent;
          color: var(--ink-soft);
          cursor: pointer;
        }
        .segbtn + .segbtn {
          border-left: 1px solid rgba(28, 43, 58, 0.25);
        }
        .segbtn.on {
          background: var(--ink);
          color: #fff;
        }
        .segbtn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
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
          background: var(--blue);
          border-color: var(--blue);
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
          grid-template-columns: 22px 1fr 60px;
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
          accent-color: var(--ink-soft);
          cursor: pointer;
        }
        .dial.star input[type='range'] {
          accent-color: var(--curve);
        }
        .dial.second input[type='range'] {
          accent-color: var(--blue);
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
          color: var(--gold);
          font-size: 16px;
        }
        .calib-note {
          font-size: 12.5px;
          margin: 0;
          color: var(--ink);
          background: rgba(201, 138, 30, 0.08);
          border-left: 3px solid var(--gold);
          padding: 8px 10px;
          border-radius: 0 6px 6px 0;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(201, 138, 30, 0.5), var(--gold));
          transition: width 0.14s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          gap: 8px;
          flex-wrap: wrap;
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
        :global(.slab) :focus-visible {
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

/* ---------------------------------------------------------------------------
   Small helpers.
   ------------------------------------------------------------------------- */
// the gap still open on the last row, read straight off the scene snapshot as
// S − Sₙ. Kept at module scope so the renderer's useCallback([]) closure can
// never go stale on it.
function gapOf(S) {
  return S.sInf ? ratSub(S.sInf, S.partials[S.n]) : ZERO;
}
// a "nice" axis step (1, 2, 5 × a power of ten) covering span in ~targetTicks
function niceStep(span, targetTicks) {
  const raw = span / Math.max(1, targetTicks);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const s = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return s * mag;
}
// superscript digits for exponents in the facts panel (r², rⁿ⁻¹, …)
const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function supStr(k) {
  const neg = k < 0;
  const body = String(Math.abs(k))
    .split('')
    .map((c) => SUPS[+c] ?? c)
    .join('');
  return (neg ? '⁻' : '') + body;
}
