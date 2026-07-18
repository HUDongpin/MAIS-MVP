'use client';

/* ============================================================================
   SequencesLab — an interactive "bench" for the SEQUENCE: an ordered list of
   numbers in which every term has a POSITION (an index n = 1, 2, 3, …).

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter and a CALIBRATED stamp.

   THE SIGNATURE CENTERPIECE is THE TERM TRACK — "climb or leap".
   Terms are laid out left→right as indexed carmine TILES; between neighbours a
   teal HOP arc carries you from one term to the next (+d, or ×r). That is the
   RECURSIVE rule, drawn: to know a term you must know the one before it.
   Now push the index probe n out to 20. The track BREAKS — an ellipsis opens,
   "· · · 15 more hops · · ·" — because you cannot climb that far by hand. The
   EXPLICIT rule appears as a single carmine LEAP arc from a₁ straight to aₙ,
   labelled a₁ + (n − 1)·d. That translation, recursive ⇄ explicit, is exactly
   CCSS HSF-BF.A.2, and it is the whole reason the closed form exists.

   THE KILLER DETAIL — THE FENCE-POST. The number of HOPS is one less than the
   number of TERMS. The track makes it countable: 5 tiles, 4 arcs. That is why
   the formula is a₁ + (n − 1)·d and NOT a₁ + n·d — the single most common
   student error in this topic. The step-4 question IS that trap, and the reveal
   is in the feedback, not the intro.

   DELIBERATELY DISTINCT from its siblings (distinctness is a correctness
   property in this library — a lab that duplicates a sibling's picture is
   wrong even if its math is right):
     • MultiplesLab owns the SKIP-COUNT NUMBER LINE: equal jumps of n landing on
       n, 2n, 3n, … — its subject is the LANDING SPOTS, running forever. This lab
       draws no number line at all. Its subject is the INDEX → VALUE pairing and
       the recursive ⇄ explicit translation; a₁ is arbitrary (not n) and d may be
       negative or zero, so the terms are not "the multiples of" anything.
     • LineFunctionLab owns the SLOPE TRIANGLE on a continuous line in the plane.
       This lab's "Dots, not a line" view is the OPPOSITE point: the sequence is
       ONLY the dots at whole-number n. The line through them is drawn faint and
       dashed and explicitly labelled NOT the sequence (CCSS HSF-IF.A.3).
     • ExponentialFunctionLab owns the ×b STAIRCASE — gap bars over a continuous
       curve y = a·bˣ + k with an asymptote. Here "geometric" is one MODE of the
       same track (the hop just becomes ×r), with integer r only and no curve and
       no asymptote. Continuous growth/decay is deliberately left to that lab.
     • VariableLab's number-line walk EVALUATES a·x + b for one chosen x.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/SequencesLab.jsx
     2. Import and render it:
          import SequencesLab from './SequencesLab';
          export default function Page() { return <SequencesLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (type, a1, d, rIdx, n,
              view, lesson step). Nothing else remembers the mathematics.
     MODEL  — term / hops / explicitForm / … are pure math; they know no pixels.
              ALL EXACT INTEGER ARITHMETIC: no float ever decides a term's value,
              so nothing a K-12 student reads here can be off by 0.0000001.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // the ONE accent = THE SEQUENCE (its terms, and the leap that finds them)
const CURVE_SOFT = 'rgba(200,30,79,0.10)';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const PAPER = '#fbfbf8';
const OK = '#1f8a5b';
const TEAL = '#0f7b75'; // the HOP apparatus (the recursive machinery) — a second object, never the star
const TEAL_SOFT = 'rgba(15,123,117,0.12)';
const GOLD = '#c98a1e'; // the ANSWER: the term you probed for, and the calibration targets
const GOLD_SOFT = 'rgba(201,138,30,0.14)';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Three dials, unlocking one per lesson step, plus a
   segmented ARITHMETIC ⇄ GEOMETRIC mode toggle that unlocks at step 5.

     a₁ — the FIRST TERM. Where the sequence starts. Every sequence needs one:
          a recursive rule with no first term names infinitely many sequences.
     d / r — THE HOP. In arithmetic mode it is the common difference d (what you
          ADD each time). In geometric mode it is the common ratio r (what you
          MULTIPLY by). They are separate state values, so switching modes never
          scrambles the other one.
     n  — THE INDEX PROBE. "Which term do you want?" Slide it out and watch the
          track break: this is the dial that motivates the explicit formula.
   ------------------------------------------------------------------------- */
const A1_MIN = -8;
const A1_MAX = 12;
const D_MIN = -6;
const D_MAX = 6;

// The common ratio r is a MAPPED dial: the slider moves over indices 0..5 and
// reads out these values. This is how r = 0 is made unreachable BY CONSTRUCTION
// rather than by a guard — in a geometric sequence r ≠ 0 (and a₁ ≠ 0), or the
// list collapses to zeros and the ratio aₙ₊₁ / aₙ stops existing.
const R_VALUES = [-3, -2, -1, 1, 2, 3];

// Arithmetic terms grow by at most 6 per hop, so n can run far and stay honest.
// Geometric terms EXPLODE (12 · 3¹¹ = 2,125,764) — that is the lesson, but 12
// terms is where the tiles stop being readable, so that is the cap.
const N_MAX_ARITH = 40;
const N_MAX_GEOM = 12;

const PARAMS = [
  { key: 'a1', label: 'a₁', min: A1_MIN, max: A1_MAX, step: 1, unlock: 1, star: true, role: 'the first term — where it starts' },
  { key: 'hop', label: 'd', min: D_MIN, max: D_MAX, step: 1, unlock: 2, hop: true, role: 'the common difference — what you add' },
  { key: 'n', label: 'n', min: 1, max: N_MAX_ARITH, step: 1, unlock: 4, probe: true, role: 'the index — which term do you want?' },
];

// Opens on 2, 5, 8, 11, 14 — an arithmetic sequence that is deliberately NOT
// the multiples of anything (a₁ = 2 ≠ d = 3), so it cannot be misread as
// MultiplesLab's skip-count.
const START = { type: 'arith', a1: 2, d: 3, rIdx: 4 /* r = 2 */, n: 5 };

const BASE_TILES = 4; // always show at least four terms, so it reads as a LIST
const MAX_HEAD = 6; // beyond this the track breaks into the ellipsis

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels. Exact integers everywhere.
   ------------------------------------------------------------------------- */

// exact integer power (no Math.pow, no float dust): r^e for e ≥ 0
function ipow(r, e) {
  let out = 1;
  for (let i = 0; i < e; i++) out *= r;
  return out;
}

// THE MODEL. The n-th term of the sequence, computed by the EXPLICIT rule.
//   arithmetic: aₙ = a₁ + (n − 1)·d        (add the hop n − 1 times)
//   geometric:  aₙ = a₁ · r^(n − 1)        (multiply by the hop n − 1 times)
// Note the shared (n − 1) — the SAME fence-post count in both. That is not a
// coincidence and the lab says so out loud: it is the number of HOPS.
function term(type, a1, d, r, n) {
  return type === 'geom' ? a1 * ipow(r, n - 1) : a1 + (n - 1) * d;
}

// the first `count` terms
function terms(type, a1, d, r, count) {
  const out = [];
  for (let j = 1; j <= count; j++) out.push(term(type, a1, d, r, j));
  return out;
}

// THE FENCE-POST. To reach term n from term 1 you take n − 1 hops.
// Five fence posts, four rails between them. This is the whole (n − 1).
function hops(n) {
  return n - 1;
}

// The explicit rule of an arithmetic sequence, multiplied out:
//   aₙ = a₁ + (n − 1)d = d·n + (a₁ − d)
// which is a LINE in n with slope d — the real Algebra-1 connection, and the
// reason the dots in the "Dots, not a line" view line up. Exact integers.
function explicitLinear(a1, d) {
  return { slope: d, intercept: a1 - d };
}

function nMaxFor(type) {
  return type === 'geom' ? N_MAX_GEOM : N_MAX_ARITH;
}

// Is this state a legal geometric sequence? a₁ ≠ 0 and r ≠ 0.
// (r ≠ 0 is guaranteed by R_VALUES; a₁ = 0 must be steered away from, because
// 0, 0, 0, … has no common ratio at all.)
function geomLegal(a1) {
  return a1 !== 0;
}

/* ---------------------------------------------------------------------------
   Formatting helpers.
   ------------------------------------------------------------------------- */
// Numbers print with a real MINUS SIGN (U+2212), not the ASCII hyphen JS hands
// back — the prose already uses −, and a lab teaching negative common
// differences should not show two different characters for one operation.
const MINUS = '−';
function fmt(v) {
  return (Object.is(v, -0) ? 0 : v).toString().replace('-', MINUS);
}
// big geometric terms get thousands separators so 2125764 stays readable
function fmtBig(v) {
  return (Object.is(v, -0) ? 0 : v).toLocaleString('en-US').replace('-', MINUS);
}
// "an arithmetic" / "a geometric" — the article has to agree with the word
function withArticle(type) {
  return type === 'geom' ? 'a geometric' : 'an arithmetic';
}

// A NEGATIVE BASE MUST BE PARENTHESISED, and this is a correctness rule, not a
// style one. Printed bare, "−2ⁿ⁻¹" reads by order of operations as −(2ⁿ⁻¹),
// which is a DIFFERENT NUMBER from the (−2)ⁿ⁻¹ this lab actually computes:
// at n = 3 the bare form says −4 while the real term is +4. The formula on
// screen would contradict the sequence printed beside it.
function paren(v) {
  return v < 0 ? '(' + fmt(v) + ')' : fmt(v);
}
// real Unicode subscripts, so the page reads like a textbook: a₁, a₂₀, aₙ₋₁
const SUBS = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '-': '₋', n: 'ₙ' };
function sub(s) {
  return String(s)
    .split('')
    .map((ch) => SUBS[ch] || ch)
    .join('');
}
function aOf(i) {
  return 'a' + sub(i);
}
// "+ 3" / "− 3" — sign handled in the words, never a bare "+-3"
function signed(v) {
  return v < 0 ? '− ' + fmt(Math.abs(v)) : '+ ' + fmt(v);
}
function hopLabel(type, d, r) {
  return type === 'geom' ? '×' + fmt(r) : (d < 0 ? '−' : '+') + fmt(Math.abs(d));
}
function termsText(type, a1, d, r, count) {
  return terms(type, a1, d, r, count).map(fmtBig).join(', ') + ', …';
}

// classify the sequence for the readout — the constant cases are legitimate
// sequences, not errors, so they are labelled rather than excluded
function classify(type, d, r) {
  if (type === 'geom') {
    if (r === 1) return 'geometric (r = 1 — constant)';
    if (r === -1) return 'geometric (r = −1 — alternating)';
    return r < 0 ? 'geometric (alternating)' : 'geometric (growing)';
  }
  if (d === 0) return 'arithmetic (d = 0 — constant)';
  return d < 0 ? 'arithmetic (decreasing)' : 'arithmetic (increasing)';
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration: "REBUILD THE SEQUENCE FROM TWO TERMS."

   The capstone Algebra-1 skill: you are told two terms at two positions (say
   a₃ = 7 and a₈ = 22) and must recover the whole sequence. Two grey ghost tiles
   sit at those indices; tune the dials until your carmine terms land in them.

   WHY THE STAMP CANNOT FIRE FALSELY. The gate is
       type === target.type  AND  term(i₁) === v₁  AND  term(i₂) === v₂
   — three EXACT INTEGER equalities. No float, no tolerance, no epsilon. The
   meter is cosmetic and is hard-capped below 100 unless the gate passes, so
   pct === 100 ⟺ CALIBRATED, which the audit proves by exhaustive sweep over
   every (type, a₁, hop) state × every target.

   WHY THE TYPE IS PART OF THE GOAL (and this is the best moment in the lab).
   Two terms DO NOT determine the type. a₂ = 6, a₅ = 48 is satisfied by the
   geometric 3, 6, 12, 24, 48 AND by the arithmetic −8, 6, 20, 34, 48. Both are
   real answers to "two terms" — so the goal names the type, and a student who
   hits both terms in the wrong mode is told exactly that, as a lesson rather
   than as an error. That honest ambiguity is the reason a sequence needs a
   RULE and not just a couple of values.

   Every target below is audited: solvable on the dial grid, not pre-solved by
   the calibration start state, and its full solution set enumerated.
   ------------------------------------------------------------------------- */
const CALIB_TARGETS = [
  { type: 'arith', i1: 3, v1: 7, i2: 8, v2: 22 }, //  a₁ = 1,  d = 3
  { type: 'arith', i1: 2, v1: 9, i2: 6, v2: 1 }, //   a₁ = 11, d = −2
  { type: 'arith', i1: 1, v1: -5, i2: 7, v2: 19 }, // a₁ = −5, d = 4
  { type: 'arith', i1: 4, v1: 3, i2: 7, v2: -3 }, //  a₁ = 9,  d = −2
  { type: 'arith', i1: 2, v1: -3, i2: 5, v2: 6 }, //  a₁ = −6, d = 3
  { type: 'geom', i1: 2, v1: 6, i2: 5, v2: 48 }, //   a₁ = 3,  r = 2   (i₂−i₁ = 3, odd ⇒ unique)
  { type: 'geom', i1: 1, v1: 5, i2: 4, v2: -135 }, // a₁ = 5,  r = −3
  { type: 'geom', i1: 3, v1: 8, i2: 6, v2: 64 }, //   a₁ = 2,  r = 2
  // The ambiguity target, and the best question in the lab. BOTH families fit:
  //   geometric  1, −2,  4, −8   (a₁ = 1, r = −2)
  //   arithmetic 1, −2, −5, −8   (a₁ = 1, d = −3)
  // They agree at a₁, a₂ AND a₄ and part company only at a₃ — so a student who
  // builds the arithmetic one lands both given terms and is told, correctly,
  // that two terms never decide the family. Audited: reachable in both modes.
  { type: 'geom', i1: 1, v1: 1, i2: 4, v2: -8 },
];
// where the calibration dials start: 8, 8, 8, … — a constant sequence, which is
// deliberately no target's answer (audited), so the challenge is never pre-solved
const CALIB_START = { type: 'arith', a1: 8, d: 0, rIdx: 3 /* r = 1 */ };

function makeTarget(prev) {
  let t;
  do {
    t = CALIB_TARGETS[Math.floor(Math.random() * CALIB_TARGETS.length)];
  } while (prev && t.type === prev.type && t.i1 === prev.i1 && t.v1 === prev.v1 && CALIB_TARGETS.length > 1);
  return t;
}

// every (type, a1, hop) on the dial grid that satisfies BOTH target terms and
// the named type — used to celebrate the other real answers on success, and
// swept exhaustively by the audit
function solutionsFor(t) {
  const out = [];
  for (let a1 = A1_MIN; a1 <= A1_MAX; a1++) {
    if (t.type === 'arith') {
      for (let d = D_MIN; d <= D_MAX; d++) {
        if (term('arith', a1, d, 1, t.i1) === t.v1 && term('arith', a1, d, 1, t.i2) === t.v2) out.push({ a1, hop: d });
      }
    } else {
      if (!geomLegal(a1)) continue;
      for (const r of R_VALUES) {
        if (term('geom', a1, 0, r, t.i1) === t.v1 && term('geom', a1, 0, r, t.i2) === t.v2) out.push({ a1, hop: r });
      }
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with its step; the
   reveal lives in `feedback` (shown after answering), never in the intro; the
   distractors are real student misconceptions. Next is gated on ANSWERED, not
   CORRECT — a wrong answer still teaches, and a locked Next just teaches
   students to guess.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the sequence',
    body:
      'A SEQUENCE is an ordered list of numbers. Each number is a TERM, and each term has a POSITION — its ' +
      'INDEX. The first term is called a₁, the second a₂, the third a₃, and so on. Order is everything here: ' +
      '2, 5, 8, 11 and 11, 8, 5, 2 contain the same numbers but they are different sequences, because the ' +
      'terms sit in different positions.',
    q: 'In the sequence 2, 5, 8, 11, 14 — what is a₃?',
    choices: [
      '8 — the term in position 3',
      '3 — the index itself is the term',
      '11 — start counting at a₀ = 2, so a₃ is the fourth number',
    ],
    answer: 0,
    feedback:
      'a₃ = 8 — the subscript is the POSITION, not the value. Read a₃ as "a sub three": the 3rd term. The ' +
      'index and the term are two different numbers, and mixing them up is the classic slip. (A few books do ' +
      'start at a₀, but the standard — and this lab — starts at a₁, so a₁ is the first term.)',
  },
  {
    title: 'a₁ — where it starts',
    body:
      'The a₁ dial is live. It sets the FIRST TERM: the tile in position 1, where the whole list begins. ' +
      'Slide it and watch every term move together — change where you start and you change the entire ' +
      'sequence, even though the pattern between the terms has not changed at all.',
    q: 'Two sequences both step up by 3 each time, but one starts at a₁ = 2 and the other at a₁ = 10. Are they the same sequence?',
    choices: [
      'No — 2, 5, 8, … and 10, 13, 16, … have different terms in every position',
      'Yes — they step by the same amount, so they are the same sequence',
      'Yes — sequences only care about the pattern, not the starting number',
    ],
    answer: 0,
    feedback:
      'They are different sequences. The step tells you how to get from one term to the NEXT, but it never ' +
      'tells you where to begin — so the step alone does not pin down a sequence. You need BOTH the first ' +
      'term and the step. Keep that in your pocket: it is exactly why the recursive rule coming up has two ' +
      'parts and not one.',
  },
  {
    title: 'd — the common difference',
    body:
      'The d dial unlocks, and the teal HOP arcs appear between the tiles. In an ARITHMETIC sequence you get ' +
      'the next term by ADDING the same number every time. That fixed number is the COMMON DIFFERENCE d — ' +
      '"difference" because you can recover it by subtracting: d = a₂ − a₁ = a₃ − a₂, always the same. Try a ' +
      'negative d and the sequence counts down; try d = 0 and it stands still.',
    q: 'Is 3, 7, 11, 15, 19 arithmetic — and if so, what is d?',
    choices: [
      'Yes, d = 4 — every term is 4 more than the one before',
      'Yes, d = 3 — the sequence starts at 3',
      'No — the terms keep changing, so there is no common difference',
    ],
    answer: 0,
    feedback:
      'Yes: 7 − 3 = 4, 11 − 7 = 4, 15 − 11 = 4. The difference is the SAME every time, so the sequence is ' +
      'arithmetic with d = 4. Notice d = 4 is not the first term (that is 3) and it is not found by looking ' +
      'at one term — a difference always needs two neighbours. To test any sequence, subtract each term from ' +
      'the next: if you always get the same number, it is arithmetic.',
  },
  {
    title: 'The recursive rule — one hop at a time',
    body:
      'Read the track exactly as it is drawn and you have written the RECURSIVE rule: to get a term, take ' +
      'the term before it and hop. In symbols, aₙ = aₙ₋₁ + d. But that rule alone is not enough — it tells ' +
      'you how to move, never where to stand. So a recursive rule always comes in TWO parts: a₁ = (the first ' +
      'term), and aₙ = aₙ₋₁ + d for n > 1. Both, or you have described infinitely many sequences at once.',
    q: 'A rule says only "aₙ = aₙ₋₁ + 5". Which sequence does it describe?',
    choices: [
      'You cannot tell — 1, 6, 11, … and 40, 45, 50, … both obey it. The first term is missing',
      'Exactly one: 5, 10, 15, 20, … — the rule says to count by 5',
      'None — a term cannot be defined using another term',
    ],
    answer: 0,
    feedback:
      'You cannot tell. Every sequence that steps up by 5 obeys that rule — 1, 6, 11, … and 40, 45, 50, … ' +
      'and endlessly many more. The rule pins down the SHAPE but not the STARTING POINT, so a recursive ' +
      'definition needs its anchor a₁ to name one sequence. (And defining a term from an earlier term is ' +
      'perfectly legal — that is what "recursive" means. It is just slow, as the next step shows.)',
  },
  {
    title: 'Climb or leap? The explicit rule',
    body:
      'The n dial unlocks — it is a PROBE: which term do you want? Count what is on the track right now: the ' +
      'tiles are the terms, the arcs are the hops. Now slide n out to 20. The track breaks, because nobody ' +
      'wants to take nineteen hops by hand. The EXPLICIT rule leaps straight there in one move, using only n: ' +
      'aₙ = a₁ + (n − 1)·d. Read that carmine arc under the track — it is doing all the hops at once.',
    q: 'Starting from a₁, how many hops of +d do you take to arrive at a₅?',
    choices: [
      '4 hops — a₁→a₂, a₂→a₃, a₃→a₄, a₄→a₅',
      '5 hops — one for each term',
      '6 hops — one for each term, plus one to start',
    ],
    answer: 0,
    feedback:
      'FOUR hops, not five. Count the tiles: five. Count the arcs between them: four. There is always one ' +
      'fewer hop than there are terms — the fence-post rule (five posts, four rails). That is the whole ' +
      'reason the formula reads a₁ + (n − 1)·d and NOT a₁ + n·d: you hop n − 1 times, so you add d exactly ' +
      'n − 1 times. Using n instead of n − 1 is the most common mistake in this entire topic, and it always ' +
      'overshoots by exactly one d.',
  },
  {
    title: 'Geometric — when the hop multiplies',
    body:
      'Switch the mode to GEOMETRIC. Everything about the track stays put; only the hop changes its job. ' +
      'Instead of ADDING d each time you MULTIPLY by a fixed number, the COMMON RATIO r — recoverable by ' +
      'dividing: r = a₂ ÷ a₁. So the explicit rule swaps its operation too: aₙ = a₁ · r^(n − 1). Look hard at ' +
      'that exponent. It is the same n − 1 as before, and for the same reason: it counts the HOPS.',
    q: 'For the geometric sequence 3, 6, 12, 24, … (a₁ = 3, r = 2), what is a₅?',
    choices: [
      '48 — a₅ = 3 · 2⁴ = 3 · 16, because four hops means multiplying by 2 four times',
      '96 — a₅ = 3 · 2⁵ = 3 · 32, one factor of 2 for each of the five terms',
      '13 — a₅ = 3 + 2 · 5, multiply the ratio by the index and add the start',
    ],
    answer: 0,
    feedback:
      'a₅ = 3 · 2⁴ = 48. The exponent is 4, not 5 — the same fence-post as before, now counting how many ' +
      'times you multiply. "3 · 2⁵ = 96" is the off-by-one again, and it overshoots by exactly one factor of ' +
      'r. The third choice mixes the two families up: arithmetic sequences add their step, geometric ' +
      'sequences multiply by theirs — that single difference is what separates them. (r can also be a ' +
      'fraction, which shrinks the terms; this lab keeps r a whole number so every term stays exact.)',
  },
  {
    title: 'A sequence is a function of n',
    body:
      'Switch the view to DOTS. Plot each term against its index and something clicks: a sequence is a ' +
      'FUNCTION whose input is the position n. Feed it 4, it returns a₄. And look — for an arithmetic ' +
      'sequence the dots fall in a perfectly straight line, because adding the same d each step IS constant ' +
      'slope. But the line itself is drawn faint and dashed for a reason. It is not the sequence.',
    q: 'The dots of 2, 5, 8, 11, … lie on a straight line. What is a₂.₅?',
    choices: [
      'There is no such term — n must be a whole number, so only the dots exist',
      '6.5 — read it off the line halfway between 5 and 8',
      '2.5 — the index and the term are the same thing here',
    ],
    answer: 0,
    feedback:
      'There is no a₂.₅. A term needs a POSITION, and there is no position 2½ in a list — you cannot have a ' +
      'two-and-a-half-th item. The domain of a sequence is the counting numbers 1, 2, 3, …, so the sequence ' +
      'is the DOTS and nothing in between; the dashed line is only a helper showing they are lined up. That ' +
      'line does have a story to tell, though: it is exactly aₙ = d·n + (a₁ − d), so an arithmetic sequence ' +
      'is a linear function that has been sampled at the whole numbers.',
  },
  {
    title: 'Rebuild the sequence from two terms',
    body:
      'Final challenge, and the real Algebra-1 skill. You are given only TWO terms, sitting on the track as ' +
      'grey ghost tiles at their positions. Recover the whole sequence: set the mode the goal asks for, then ' +
      'tune a₁ and the hop until your carmine terms land exactly inside both ghosts. Work out the hop first ' +
      '— you know the gap between the two terms AND how many hops it took to cross it.',
    calib: true,
  },
];

/* ============================================================================
   RENDER HELPERS — pure drawing, all reading from the scene snapshot S.
   ========================================================================== */

/* faint quadrille backdrop — the house paper */
function quadrille(ctx, W, H) {
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
}

/* shrink a label until it fits — geometric terms reach 2,125,764 and a tile
   that clips its own number is a lab that lies about the value */
function fitFont(ctx, text, maxW, weight, startPx, minPx) {
  let px = startPx;
  for (;;) {
    ctx.font = `${weight} ${px}px ${MONO}`;
    if (ctx.measureText(text).width <= maxW || px <= minPx) return px;
    px -= 1;
  }
}

function roundRect(ctx, x, y, w, h, r = 8) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/* ---------------------------------------------------------------------------
   THE TERM TRACK — the centerpiece. Tiles are terms; teal arcs are hops; the
   carmine arc underneath is the leap the explicit formula takes.
   ------------------------------------------------------------------------- */
function trackSlots(S) {
  // In calibration the track must reach the far ghost, so the head is pinned to
  // the target's second index. Otherwise: show a decent prefix, and break into
  // the ellipsis as soon as the probe outruns it.
  //
  // `calib && !target` is a REAL frame, not a theoretical one: entering the last
  // step, this redraw runs before the effect that hands out a target, so the
  // target must be read defensively or the whole lab white-screens on arrival.
  const head = S.calib && S.target ? Math.max(BASE_TILES, S.target.i2) : Math.max(BASE_TILES, Math.min(S.n, MAX_HEAD));
  const hasGap = !S.calib && S.n > head;
  const slots = [];
  for (let j = 1; j <= head; j++) slots.push({ kind: 'term', idx: j });
  if (hasGap) {
    slots.push({ kind: 'gap' });
    slots.push({ kind: 'term', idx: S.n });
  }
  return { head, hasGap, slots };
}

function drawTrack(ctx, W, H, S) {
  const { head, hasGap, slots } = trackSlots(S);
  const val = (j) => term(S.type, S.a1, S.d, S.r, j);

  const padL = 16;
  const padR = 16;
  const slotW = (W - padL - padR) / slots.length;
  // Give the hop arcs room to BE arcs. Sizing tiles to fill their slot leaves
  // ~8px between them, and the arc — the whole recursive rule — collapses into
  // an unreadable caret with no "+d" label. The apparatus needs the gap.
  const tileW = Math.min(slotW * 0.64, 84);
  const tileH = Math.min(42, H * 0.17);
  const yMid = Math.round(H * 0.54);
  const xOfSlot = (i) => padL + (i + 0.5) * slotW;

  // where each drawn index lives, so arcs and the leap can find their anchors
  const posOf = new Map();
  slots.forEach((s, i) => {
    if (s.kind === 'term') posOf.set(s.idx, xOfSlot(i));
  });
  const gapIndex = slots.findIndex((s) => s.kind === 'gap');

  /* ---- calibration ghosts: dashed grey tiles at the two given positions,
          drawn BEHIND the real tiles so a matching term lands inside one ---- */
  if (S.calib && S.target) {
    const T = S.target;
    for (const [idx, v] of [[T.i1, T.v1], [T.i2, T.v2]]) {
      const cx = posOf.get(idx);
      if (cx == null) continue;
      const hit = val(idx) === v;
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = hit ? GOLD : 'rgba(28,43,58,0.5)';
      ctx.fillStyle = hit ? GOLD_SOFT : 'rgba(28,43,58,0.04)';
      roundRect(ctx, cx - tileW / 2 - 6, yMid - tileH / 2 - 6, tileW + 12, tileH + 12, 10);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      // the goal value, printed above its ghost
      ctx.fillStyle = hit ? GOLD : INK_SOFT;
      ctx.font = `700 12px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${aOf(idx)} = ${fmtBig(v)}`, cx, yMid - tileH / 2 - 12);
    }
  }

  /* ---- the hop arcs (teal): the recursive rule, drawn ---- */
  if (S.showHops) {
    const label = hopLabel(S.type, S.d, S.r);
    for (let i = 0; i < slots.length - 1; i++) {
      const a = slots[i];
      const b = slots[i + 1];
      if (a.kind !== 'term' || b.kind !== 'term') continue; // arcs across the gap are drawn separately
      const xa = xOfSlot(i) + tileW / 2;
      const xb = xOfSlot(i + 1) - tileW / 2;
      const mid = (xa + xb) / 2;
      const lift = Math.min(34, 14 + (xb - xa) * 0.42);
      const yTop = yMid - tileH / 2 - 4;

      // the chain glow: on the recursive step, spotlight ONE hop (the last drawn
      // one) so "aₙ from aₙ₋₁" is a single visible move rather than a blur
      const isChainHop = S.showChain && b.idx === Math.min(S.n, head);
      ctx.strokeStyle = isChainHop ? CURVE : TEAL;
      ctx.lineWidth = isChainHop ? 2.6 : 1.8;
      ctx.beginPath();
      ctx.moveTo(xa, yTop);
      ctx.quadraticCurveTo(mid, yTop - lift, xb, yTop);
      ctx.stroke();
      // arrowhead into the next tile
      ctx.fillStyle = isChainHop ? CURVE : TEAL;
      ctx.beginPath();
      ctx.moveTo(xb, yTop);
      ctx.lineTo(xb - 6, yTop - 6);
      ctx.lineTo(xb - 1, yTop - 8);
      ctx.closePath();
      ctx.fill();

      ctx.textAlign = 'center';
      if (xb - xa > 22) {
        ctx.fillStyle = isChainHop ? CURVE : TEAL;
        ctx.font = `700 11px ${MONO}`;
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, mid, yTop - lift + 1);
      }
      // THE FENCE-POST, made countable: number every hop. The last one reads
      // n − 1 while the tiles read n — the picture proves the formula.
      if (S.showCount && !hasGap && slotW > 46) {
        const hn = a.idx; // hop a.idx carries you from term a.idx to term a.idx+1
        ctx.fillStyle = TEAL;
        ctx.font = `700 9.5px ${MONO}`;
        ctx.textBaseline = 'bottom';
        ctx.fillText('hop ' + hn, mid, yTop - lift - 11);
      }
    }

    /* ---- the ellipsis: the moment climbing stops being an option ---- */
    if (hasGap && gapIndex > 0) {
      const xa = xOfSlot(gapIndex - 1) + tileW / 2;
      const xb = xOfSlot(gapIndex + 1) - tileW / 2;
      const yTop = yMid - tileH / 2 - 4;
      const mid = (xa + xb) / 2;
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(xa, yTop);
      ctx.quadraticCurveTo(mid, yTop - 40, xb, yTop);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = TEAL;
      ctx.font = `700 11px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`· · · ${fmt(S.n - head)} more hops of ${label} · · ·`, mid, yTop - 42);
      // the dotted "and so on" sitting on the track itself
      ctx.fillStyle = INK_SOFT;
      ctx.font = `700 20px ${MONO}`;
      ctx.textBaseline = 'middle';
      ctx.fillText('· · ·', mid, yMid);
    }
  }

  /* ---- the tiles: the terms themselves (the one carmine accent) ---- */
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s.kind !== 'term') continue;
    const cx = xOfSlot(i);
    const v = val(s.idx);
    const isProbe = S.showProbe && s.idx === S.n;

    ctx.fillStyle = isProbe ? GOLD_SOFT : CURVE_SOFT;
    ctx.strokeStyle = isProbe ? GOLD : CURVE;
    ctx.lineWidth = isProbe ? 2.6 : 1.8;
    roundRect(ctx, cx - tileW / 2, yMid - tileH / 2, tileW, tileH);
    ctx.fill();
    ctx.stroke();

    const text = fmtBig(v);
    const px = fitFont(ctx, text, tileW - 10, 700, 17, 8);
    ctx.font = `700 ${px}px ${MONO}`;
    ctx.fillStyle = isProbe ? '#8a5c10' : CURVE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, yMid + 0.5);

    // the index, under its tile — the POSITION, which is the whole point
    ctx.font = `${isProbe ? '700' : '600'} 11px ${MONO}`;
    ctx.fillStyle = isProbe ? GOLD : INK_SOFT;
    ctx.textBaseline = 'top';
    ctx.fillText(aOf(s.idx), cx, yMid + tileH / 2 + 7);
  }

  /* ---- the LEAP: the explicit rule, in one carmine sweep ---- */
  if (S.showLeap && posOf.has(1) && posOf.has(S.n) && S.n > 1) {
    const x1 = posOf.get(1);
    const x2 = posOf.get(S.n);
    const yFrom = yMid + tileH / 2 + 2;
    const dip = Math.min(52, H - yFrom - 34);
    const mid = (x1 + x2) / 2;
    ctx.strokeStyle = CURVE;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x1, yFrom);
    ctx.quadraticCurveTo(mid, yFrom + dip * 1.5, x2, yFrom);
    ctx.stroke();
    ctx.fillStyle = CURVE;
    ctx.beginPath();
    ctx.moveTo(x2, yFrom);
    ctx.lineTo(x2 - 7, yFrom + 8);
    ctx.lineTo(x2 - 1, yFrom + 10);
    ctx.closePath();
    ctx.fill();

    const nHops = hops(S.n);
    const formula =
      S.type === 'geom'
        ? `${aOf('n')} = a₁ · r${supDigits('n−1')} = ${fmt(S.a1)} · ${paren(S.r)}${supDigits(nHops)} = ${fmtBig(val(S.n))}`
        : `${aOf('n')} = a₁ + (n−1)·d = ${fmt(S.a1)} + ${fmt(nHops)}·(${fmt(S.d)}) = ${fmtBig(val(S.n))}`;
    const px = fitFont(ctx, formula, W - 40, 700, 13, 9);
    ctx.font = `700 ${px}px ${MONO}`;
    ctx.fillStyle = CURVE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(formula, Math.min(Math.max(mid, W / 2 - 10), W / 2 + 10), yFrom + dip * 0.78);
  }

  /* ---- the fence-post caption: n terms, n − 1 hops ---- */
  if (S.showCount) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `700 12.5px ${MONO}`;
    const a = `${fmt(S.n)} terms`;
    const b = `${fmt(hops(S.n))} hops`;
    const wa = ctx.measureText(a).width;
    const wb = ctx.measureText(b).width;
    const wsep = ctx.measureText('  ·  ').width;
    let x = W / 2 - (wa + wb + wsep) / 2;
    ctx.textAlign = 'left';
    ctx.fillStyle = CURVE;
    ctx.fillText(a, x, 8);
    x += wa;
    ctx.fillStyle = INK_SOFT;
    ctx.fillText('  ·  ', x, 8);
    x += wsep;
    ctx.fillStyle = TEAL;
    ctx.fillText(b, x, 8);
    ctx.textAlign = 'center';
    ctx.fillStyle = INK_SOFT;
    ctx.font = `600 10.5px ${MONO}`;
    ctx.fillText('always one fewer hop than terms', W / 2, 24);
  }
}

// Exponent rendering: 2⁴, and the symbolic rⁿ⁻¹.
// Both the letter n and the Unicode MINUS (U+2212, which is what the copy uses)
// need entries — without them "n−1" silently renders as a full-size "n−¹",
// printing r·n−1 where the lab means r to the power n−1.
const SUPS = {
  0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹',
  '-': '⁻', '−': '⁻', n: 'ⁿ', '(': '⁽', ')': '⁾',
};
function supDigits(v) {
  return String(v)
    .split('')
    .map((c) => SUPS[c] || c)
    .join('');
}

/* ---------------------------------------------------------------------------
   THE DOTS VIEW — aₙ against n. The sequence as a FUNCTION of its index.
   The line is drawn faint, dashed, and labelled NOT the sequence, because the
   domain is the counting numbers and there is no term between the dots.
   ------------------------------------------------------------------------- */
function drawDots(ctx, W, H, S) {
  const count = Math.min(S.n, S.type === 'geom' ? 8 : 10);
  const vals = terms(S.type, S.a1, S.d, S.r, count);

  const padL = 52;
  const padR = 22;
  const padT = 26;
  const padB = 34;

  const xMin = 0;
  const xMax = count + 0.7;
  let lo = Math.min(0, ...vals);
  let hi = Math.max(0, ...vals);
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const span = hi - lo;
  lo -= span * 0.12;
  hi += span * 0.12;

  const X = (v) => padL + ((v - xMin) / (xMax - xMin)) * (W - padL - padR);
  const Y = (v) => H - padB - ((v - lo) / (hi - lo)) * (H - padT - padB);

  /* axes */
  ctx.strokeStyle = 'rgba(28,43,58,0.55)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(X(0), padT - 6);
  ctx.lineTo(X(0), H - padB); // the aₙ axis
  ctx.moveTo(X(0) - 6, Y(Math.max(lo, Math.min(hi, 0))));
  ctx.lineTo(W - padR, Y(Math.max(lo, Math.min(hi, 0)))); // the n axis (at aₙ = 0 when in view)
  ctx.stroke();

  /* index ticks — whole numbers only, because that IS the domain */
  ctx.font = `10px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const yAxis = Y(Math.max(lo, Math.min(hi, 0)));
  for (let j = 1; j <= count; j++) {
    ctx.strokeStyle = 'rgba(28,43,58,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(j), yAxis - 4);
    ctx.lineTo(X(j), yAxis + 4);
    ctx.stroke();
    ctx.fillStyle = INK_SOFT;
    // the index label belongs ON its axis — pinned to the canvas floor it
    // detaches from the tick it names as soon as the axis rides up
    ctx.fillText(fmt(j), X(j), yAxis + 6);
  }
  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 11px ${MONO}`;
  ctx.fillText('n  (the index — a counting number)', (padL + W - padR) / 2, H - 15);
  ctx.save();
  ctx.translate(14, (padT + H - padB) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('aₙ  (the term)', 0, 0);
  ctx.restore();

  /* the helper line through the dots — faint, dashed, and disclaimed */
  ctx.save();
  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = 'rgba(91,107,123,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i <= 160; i++) {
    const t = 1 + (i / 160) * (count - 1);
    // arithmetic: the honest continuous extension is the line d·t + (a₁ − d).
    // geometric: a₁·r^(t−1) is only real for r > 0, so a negative ratio gets no
    // through-line at all — drawing one would be a lie about a curve that does
    // not exist between the dots.
    let v;
    if (S.type === 'geom') {
      if (S.r <= 0) break;
      v = S.a1 * Math.pow(S.r, t - 1);
    } else {
      const { slope, intercept } = explicitLinear(S.a1, S.d);
      v = slope * t + intercept;
    }
    const px = X(t);
    const py = Y(v);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  /* the ✗ where a term is NOT: there is no a₂.₅ */
  if (count >= 3) {
    const t = 2.5;
    let v;
    if (S.type === 'geom') v = S.r > 0 ? S.a1 * Math.pow(S.r, t - 1) : null;
    else {
      const { slope, intercept } = explicitLinear(S.a1, S.d);
      v = slope * t + intercept;
    }
    if (v != null && v >= lo && v <= hi) {
      const px = X(t);
      const py = Y(v);
      ctx.strokeStyle = INK_SOFT;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(px - 5, py - 5);
      ctx.lineTo(px + 5, py + 5);
      ctx.moveTo(px + 5, py - 5);
      ctx.lineTo(px - 5, py + 5);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = `600 10px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('no a₂.₅ — there is no position 2½', px + 9, py);
    }
  }

  /* the dots: the sequence itself */
  vals.forEach((v, i) => {
    const j = i + 1;
    const isProbe = S.showProbe && j === S.n;
    const px = X(j);
    const py = Y(v);
    // a hairline stem to the axis, so a dot's value reads without a ruler
    ctx.strokeStyle = 'rgba(200,30,79,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, yAxis);
    ctx.lineTo(px, py);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(px, py, isProbe ? 6.5 : 5, 0, Math.PI * 2);
    ctx.fillStyle = isProbe ? PAPER : CURVE;
    ctx.fill();
    if (isProbe) {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.8;
      ctx.stroke();
    }
    ctx.fillStyle = isProbe ? '#8a5c10' : CURVE;
    ctx.font = `700 10.5px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(fmtBig(v), px, py - 9);
  });

  /* the disclaimer that carries the standard */
  ctx.fillStyle = INK_SOFT;
  ctx.font = `italic 600 11px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('the dashed line is NOT the sequence — only the dots are', W - padR, 6);
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function SequencesLab() {
  const [type, setType] = useState(START.type);
  const [a1, setA1] = useState(START.a1);
  const [d, setD] = useState(START.d);
  const [rIdx, setRIdx] = useState(START.rIdx);
  const [n, setN] = useState(START.n);
  const [view, setView] = useState('track'); // 'track' | 'dots'
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const seededRef = useRef({}); // one-shot seeds, per step

  const current = STEPS[step];
  const calib = !!current.calib;
  const r = R_VALUES[rIdx];

  /* ---- derived facts (single source of truth = state) -------------------- */
  const nMax = nMaxFor(type);
  const nClamped = Math.min(n, nMax);
  const an = term(type, a1, d, r, nClamped);
  const { slope, intercept } = explicitLinear(a1, d);

  /* ---- render flags: exactly one apparatus per step, nothing leaks ------- */
  const showHops = step >= 2 || calib;
  const showChain = step === 3;
  const showProbe = step >= 4 && !calib;
  const showLeap = step >= 4 && !calib && view === 'track';
  const showCount = step >= 4 && !calib && view === 'track';

  /* ---- calibration: exact integer gate, so no false stamp ---------------- */
  const hitOne = calib && target ? term(type, a1, d, r, target.i1) === target.v1 : false;
  const hitTwo = calib && target ? term(type, a1, d, r, target.i2) === target.v2 : false;
  const hitBoth = hitOne && hitTwo;
  const typeOk = calib && target ? type === target.type : false;
  const calibrated = hitBoth && typeOk;

  // cosmetic closeness, hard-capped below 100 unless the gate passes ⇒
  // pct === 100 ⟺ calibrated (proved exhaustively by audit-sequences.mjs)
  let pct = 0;
  if (calib && target) {
    if (calibrated) pct = 100;
    else if (hitBoth) pct = 96; // both terms right, wrong family — the teaching moment
    else {
      const err = Math.abs(term(type, a1, d, r, target.i1) - target.v1) + Math.abs(term(type, a1, d, r, target.i2) - target.v2);
      const scale = Math.max(8, Math.abs(target.v1) + Math.abs(target.v2));
      pct = Math.min(94, Math.max(0, Math.round(100 * (1 - Math.min(1, err / scale)))));
    }
  }

  sceneRef.current = {
    ...sceneRef.current,
    type,
    a1,
    d,
    r,
    n: calib ? Math.max(target ? target.i2 : 4, 1) : nClamped,
    view,
    step,
    calib,
    target,
    showHops,
    showChain,
    showProbe,
    showLeap,
    showCount,
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
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    quadrille(ctx, W, H);
    if (S.view === 'dots' && !S.calib) drawDots(ctx, W, H, S);
    else drawTrack(ctx, W, H, S);
  }, []);

  useEffect(() => {
    draw();
  }, [type, a1, d, rIdx, n, view, step, target, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* ---- per-step setup. One effect owns the view and the one-shot seeds, so
          exactly one apparatus is on and nothing leaks into a later step
          (the house bug this pattern exists to prevent). ------------------- */
  useEffect(() => {
    // the view follows the lesson, but the student can always override it after
    if (step === 6) setView('dots');
    else if (calib || step < 6) setView('track');

    // step 4 opens on n = 5 so the fence-post is COUNTABLE (five tiles, four
    // arcs) before the student pushes n out and the track breaks
    if (step === 4 && !seededRef.current.leap) {
      seededRef.current.leap = true;
      setN(5);
    }
    // step 5 opens on a clean 3, 6, 12, 24 so "the hop multiplies" is legible
    if (step === 5 && !seededRef.current.geom) {
      seededRef.current.geom = true;
      setType('geom');
      setA1(3);
      setRIdx(R_VALUES.indexOf(2));
      setN(5);
    }
    // step 6 seeds BACK to the arithmetic 2, 5, 8, 11, … — its copy and its
    // question are both about dots falling in a straight line, and step 5 leaves
    // the mode on geometric, so without this the words and the picture disagree
    if (step === 6 && !seededRef.current.dots) {
      seededRef.current.dots = true;
      setType('arith');
      setA1(START.a1);
      setD(START.d);
      setN(6);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* entering calibration: fresh target + a start state that is no target's
     answer (8, 8, 8, … — audited un-solved) */
  useEffect(() => {
    if (calib && !target) {
      setTarget(makeTarget(null));
      setType(CALIB_START.type);
      setA1(CALIB_START.a1);
      setD(CALIB_START.d);
      setRIdx(CALIB_START.rIdx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* leaving calibration backwards: restore a sane lesson state, or the earlier
     steps render the degenerate constant sequence the challenge starts from */
  const prevStepRef = useRef(step);
  useEffect(() => {
    if (prevStepRef.current === STEPS.length - 1 && step < STEPS.length - 1) {
      setType(START.type);
      setA1(START.a1);
      setD(START.d);
      setRIdx(START.rIdx);
      setN(START.n);
    }
    prevStepRef.current = step;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'a1') {
      // a₁ = 0 is fine for an arithmetic sequence but destroys a geometric one
      // (0, 0, 0, … has no ratio), so in geometric mode the dial steps over it
      if (type === 'geom' && v === 0) setA1(a1 > 0 ? -1 : 1);
      else setA1(v);
    } else if (key === 'hop') {
      if (type === 'geom') setRIdx(v);
      else setD(v);
    } else if (key === 'n') {
      setN(Math.min(v, nMax));
    }
  };

  const switchType = (t) => {
    if (t === type) return;
    if (t === 'geom') {
      if (!geomLegal(a1)) setA1(1); // enforce a₁ ≠ 0 on the way in
      setN((prev) => Math.min(prev, N_MAX_GEOM)); // geometric terms explode; keep the tiles readable
    }
    setType(t);
  };

  const resetDials = () => {
    if (calib) {
      setType(CALIB_START.type);
      setA1(CALIB_START.a1);
      setD(CALIB_START.d);
      setRIdx(CALIB_START.rIdx);
      return;
    }
    setType(step >= 5 ? 'geom' : START.type);
    setA1(step >= 5 ? 3 : START.a1);
    setD(START.d);
    setRIdx(step >= 5 ? R_VALUES.indexOf(2) : START.rIdx);
    setN(step >= 4 ? 5 : START.n);
  };

  const newTarget = () => {
    setTarget(makeTarget(target));
    setType(CALIB_START.type);
    setA1(CALIB_START.a1);
    setD(CALIB_START.d);
    setRIdx(CALIB_START.rIdx);
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

  const values = { a1, hop: type === 'geom' ? rIdx : d, n: nClamped };

  /* ---- the header readout: the symbolic ↔ picture link ------------------- */
  let equation, verdict, headClass;
  if (calib && target) {
    equation =
      type === 'geom'
        ? `${aOf('n')} = ${fmt(a1)} · ${paren(r)}${supDigits('n−1')}`
        : `${aOf('n')} = ${fmt(a1)} + (n − 1)·${fmt(d)}`;
    verdict = calibrated
      ? `both terms land — you rebuilt the sequence from ${aOf(target.i1)} and ${aOf(target.i2)}`
      : `make ${aOf(target.i1)} = ${fmtBig(target.v1)} and ${aOf(target.i2)} = ${fmtBig(target.v2)}`;
    headClass = calibrated ? 'gold' : 'muted';
  } else if (type === 'geom') {
    equation = `${aOf('n')} = ${fmt(a1)} · ${paren(r)}${supDigits('n−1')}`;
    verdict = `start at ${fmt(a1)}, multiply by ${fmt(r)} each hop`;
    headClass = 'curve';
  } else {
    equation = `${aOf('n')} = ${fmt(a1)} + (n − 1)·${fmt(d)}`;
    verdict = d === 0 ? `start at ${fmt(a1)} and stand still (d = 0)` : `start at ${fmt(a1)}, ${d < 0 ? 'subtract' : 'add'} ${fmt(Math.abs(d))} each hop`;
    headClass = 'curve';
  }

  const solutions = calib && target ? solutionsFor(target) : [];
  const others = solutions.filter((s) => !(s.a1 === a1 && s.hop === (target && target.type === 'geom' ? r : d)));

  const spoken = calib && target
    ? `Rebuild the sequence. The goal is ${withArticle(target.type)} sequence with ${aOf(target.i1)} equal to ${fmt(target.v1)} and ${aOf(target.i2)} equal to ${fmt(target.v2)}. Your sequence is currently ${termsText(type, a1, d, r, 5)}. ${calibrated ? 'Calibrated — both terms land.' : 'Not yet on target.'}`
    : `A ${classify(type, d, r)} sequence. The first terms are ${termsText(type, a1, d, r, Math.min(nClamped, 5))}. Term number ${fmt(nClamped)} is ${fmtBig(an)}, reached in ${fmt(hops(nClamped))} hops from the first term.`;

  const hopParam = type === 'geom'
    ? { key: 'hop', label: 'r', min: 0, max: R_VALUES.length - 1, step: 1, unlock: 2, hop: true, role: 'the common ratio — what you multiply by' }
    : PARAMS[1];

  return (
    <div className="slab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Sequences</h1>
        <p className="lede">
          A <em>sequence</em> is an ordered list of numbers, and every term has a <em>position</em>. Read the
          track left to right: each teal hop carries you from one term to the next — that is the{' '}
          <em>recursive</em> rule. But push the index out to <em>a</em>₂₀ and the track breaks, because nobody
          climbs nineteen hops by hand. The carmine leap underneath is the <em>explicit</em> rule,{' '}
          <em>a</em>ₙ = <em>a</em>₁ + (n − 1)<em>d</em>, arriving in one move. Count the tiles, then count the
          arcs, and you will see where that <em>n</em> − 1 comes from.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className={'equation ' + headClass}>{equation}</p>
            <p className={'verdict ' + headClass}>{verdict}</p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            {/* the dots view carries its own disclaimer on the canvas and needs
                the floor for its index-axis title, so it takes no hint chip */}
            {view !== 'dots' && (
              <span className="hint mono">
                {step < 1
                  ? 'each tile is a term · the label under it is its position'
                  : calib
                  ? 'land your terms inside both grey ghosts'
                  : step < 4
                  ? 'slide the dials — watch every term move'
                  : 'push n out — the track breaks, so the leap takes over'}
              </span>
            )}
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="sw curve" /> the terms
            </span>
            {showHops && (
              <span className="lg">
                <span className="sw teal" /> the hop ({hopLabel(type, d, r)}) — recursive
              </span>
            )}
            {showLeap && (
              <span className="lg">
                <span className="sw gold" /> {aOf(nClamped)} — the term you asked for
              </span>
            )}
            {calib && (
              <span className="lg">
                <span className="sw-ghost" /> the two given terms
              </span>
            )}
          </div>

          {/* facts panel — each row unlocks with the idea that earns it */}
          <div className="facts">
            <div className="fact">
              <span className="fact-k">The sequence</span>
              <span className="fact-v mono" style={{ color: CURVE, fontWeight: 700 }}>
                {termsText(type, a1, d, r, Math.min(Math.max(nClamped, 4), 6))}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Kind</span>
              <span className="fact-v mono">{step >= 2 || calib ? classify(type, d, r) : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Recursive rule</span>
              <span className="fact-v mono">
                {step >= 3 || calib ? (
                  <>
                    a₁ = <b style={{ color: CURVE }}>{fmt(a1)}</b>, {aOf('n')} = aₙ₋₁ {type === 'geom' ? '· ' + paren(r) : signed(d)}
                  </>
                ) : (
                  '—'
                )}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Explicit rule</span>
              <span className="fact-v mono">
                {step >= 4 || calib ? (
                  type === 'geom' ? (
                    <>
                      {aOf('n')} = {fmt(a1)} · {paren(r)}
                      {supDigits('n−1')}
                    </>
                  ) : (
                    <>
                      {aOf('n')} = {fmt(a1)} + (n − 1)·{fmt(d)} ={' '}
                      <b style={{ color: CURVE }}>
                        {slope === 0 ? '' : (slope === 1 ? 'n' : slope === -1 ? '−n' : fmt(slope) + 'n')}
                        {slope === 0 ? fmt(intercept) : intercept === 0 ? '' : ' ' + signed(intercept)}
                      </b>
                    </>
                  )
                ) : (
                  '—'
                )}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Hops from a₁ to {aOf(nClamped)}</span>
              <span className="fact-v mono">
                {step >= 4 || calib ? (
                  <>
                    n − 1 = {fmt(nClamped)} − 1 = <b style={{ color: TEAL }}>{fmt(hops(nClamped))}</b>
                  </>
                ) : (
                  '—'
                )}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">{aOf(nClamped)}</span>
              <span className="fact-v mono">
                {step >= 4 || calib ? <b style={{ color: GOLD }}>{fmtBig(an)}</b> : '—'}
              </span>
            </div>
          </div>

          <div className="toolbar">
            <div className="seg" role="group" aria-label="Sequence kind">
              <button
                type="button"
                className={'segb' + (type === 'arith' ? ' on' : '')}
                aria-pressed={type === 'arith'}
                disabled={step < 5 && !calib}
                onClick={() => switchType('arith')}
              >
                Arithmetic (+d)
              </button>
              <button
                type="button"
                className={'segb' + (type === 'geom' ? ' on' : '')}
                aria-pressed={type === 'geom'}
                disabled={step < 5 && !calib}
                onClick={() => switchType('geom')}
              >
                Geometric (×r)
              </button>
            </div>
            <div className="seg" role="group" aria-label="Stage view">
              <button
                type="button"
                className={'segb' + (view === 'track' ? ' on' : '')}
                aria-pressed={view === 'track'}
                disabled={calib}
                onClick={() => setView('track')}
              >
                Track
              </button>
              <button
                type="button"
                className={'segb' + (view === 'dots' ? ' on' : '')}
                aria-pressed={view === 'dots'}
                disabled={calib || step < 6}
                onClick={() => setView('dots')}
              >
                Dots (aₙ vs n)
              </button>
            </div>
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
            {[PARAMS[0], hopParam, PARAMS[2]].map((p) => {
              const unlocked = step >= p.unlock || calib;
              const disabled = !unlocked || (calib && p.key === 'n');
              const raw = values[p.key];
              const shown = p.key === 'hop' && type === 'geom' ? fmt(r) : fmt(raw);
              return (
                <label
                  className={'dial' + (disabled ? ' locked' : '') + (p.star ? ' star' : '') + (p.hop ? ' hop' : '') + (p.probe ? ' probe' : '')}
                  key={p.key}
                >
                  <span className="dk">{p.label}</span>
                  <span className="drole">{unlocked ? p.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={p.min}
                    max={p.key === 'n' ? nMax : p.max}
                    step={p.step}
                    value={raw}
                    disabled={disabled}
                    aria-label={`Dial ${p.label} — ${p.role}`}
                    aria-valuetext={p.key === 'hop' && type === 'geom' ? fmt(r) : undefined}
                    onChange={(e) => onParam(p.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? shown : '🔒'}</output>
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
                Goal: {withArticle(target.type).split(' ')[0]} <strong>{target.type === 'geom' ? 'geometric' : 'arithmetic'}</strong> sequence with{' '}
                <strong>
                  {aOf(target.i1)} = {fmtBig(target.v1)}
                </strong>{' '}
                and{' '}
                <strong>
                  {aOf(target.i2)} = {fmtBig(target.v2)}
                </strong>
              </p>

              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {aOf(target.i1)} = {fmtBig(term(type, a1, d, r, target.i1))} {hitOne ? '✓' : '✕'} · {aOf(target.i2)} ={' '}
                  {fmtBig(term(type, a1, d, r, target.i2))} {hitTwo ? '✓' : '✕'} · {pct.toFixed(0)}%
                </span>
                {calibrated ? <span className="stamp">CALIBRATED</span> : null}
              </div>
              {!calibrated && hitBoth && !typeOk && (
                <p className="calib-note mono">
                  Both terms land — but this is {classify(type, d, r).split(' ')[0]} and the goal asks for{' '}
                  {target.type === 'geom' ? 'geometric' : 'arithmetic'}. Two terms alone never decide the family: a
                  sequence needs a RULE, not just a couple of values.
                </p>
              )}
              {!calibrated && !hitBoth && (
                <p className="calib-hint mono">
                  {target.i2 - target.i1} hops carry you from {aOf(target.i1)} to {aOf(target.i2)}
                  {target.type === 'geom'
                    ? ` — so r multiplied ${target.i2 - target.i1} times turns ${fmtBig(target.v1)} into ${fmtBig(target.v2)}.`
                    : `, and they close a gap of ${fmtBig(target.v2 - target.v1)} — so d = ${fmtBig(target.v2 - target.v1)} ÷ ${target.i2 - target.i1}.`}
                </p>
              )}
              {calibrated && (
                <p className="calib-note mono">
                  {others.length > 0
                    ? `Other sequences on these dials fitting both terms: ${others
                        .slice(0, 4)
                        .map((s) => `a₁ = ${fmt(s.a1)}, ${target.type === 'geom' ? 'r' : 'd'} = ${fmt(s.hop)}`)
                        .join(' · ')}`
                    : 'And it is the only one — two terms and a named family pin the sequence down completely.'}
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
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setStep(0);
                  setAnswers({});
                  setTarget(null);
                  seededRef.current = {};
                  setType(START.type);
                  setA1(START.a1);
                  setD(START.d);
                  setRIdx(START.rIdx);
                  setN(START.n);
                  setView('track');
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
          arithmetic: aₙ = a₁ + (n − 1)d &nbsp;·&nbsp; geometric: aₙ = a₁ · r{supDigits('n−1')}
        </span>{' '}
        &nbsp;·&nbsp; a sequence is a function of its index n; the recursive rule needs both a₁ and the hop;
        it takes n − 1 hops to reach the n-th term. CCSS&nbsp;HSF-IF.A.3, HSF-BF.A.2, HSF-LE.A.2.
      </footer>

      <style jsx>{`
        .slab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --teal: #0f7b75;
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
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }
        .equation.curve {
          color: var(--curve);
        }
        .equation.gold {
          color: var(--gold);
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
          position: absolute;
          left: 10px;
          bottom: 9px;
          font-size: 11px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.8);
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
        .lg {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .sw {
          width: 15px;
          height: 15px;
          border-radius: 4px;
          display: inline-block;
          box-sizing: border-box;
        }
        .sw.curve {
          background: var(--curve);
        }
        .sw.teal {
          background: var(--teal);
        }
        .sw.gold {
          background: var(--gold);
        }
        /* NOT ".ghost" — that is the house's .btn.ghost modifier, and a bare
           .ghost here silently collapsed every ghost button to a 15px square */
        .sw-ghost {
          width: 15px;
          height: 15px;
          border-radius: 4px;
          display: inline-block;
          box-sizing: border-box;
          border: 1.5px dashed var(--ink-soft);
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
          align-items: center;
        }
        .seg {
          display: inline-flex;
          border: 1px solid rgba(28, 43, 58, 0.25);
          border-radius: 8px;
          overflow: hidden;
        }
        .segb {
          font: 600 12.5px/1 system-ui, sans-serif;
          padding: 9px 11px;
          border: 0;
          background: transparent;
          color: var(--ink-soft);
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, color 0.15s;
        }
        .segb + .segb {
          border-left: 1px solid rgba(28, 43, 58, 0.18);
        }
        .segb.on {
          background: var(--ink);
          color: #fff;
        }
        .segb:disabled {
          opacity: 0.4;
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
          white-space: nowrap;
          flex: 0 0 auto;
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
          grid-template-columns: 26px 1fr 60px;
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
        .dial.hop .dk {
          color: var(--teal);
        }
        .dial.probe .dk {
          color: var(--gold);
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
        .dial.hop input[type='range'] {
          accent-color: var(--teal);
        }
        .dial.probe input[type='range'] {
          accent-color: var(--gold);
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
        .calib-hint {
          font-size: 12.5px;
          margin: 0;
          color: var(--ink);
          background: rgba(15, 123, 117, 0.07);
          border-left: 3px solid var(--teal);
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
          font-size: 12.5px;
          gap: 8px;
          flex-wrap: wrap;
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
          .segb,
          .meter-fill,
          .choice {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
