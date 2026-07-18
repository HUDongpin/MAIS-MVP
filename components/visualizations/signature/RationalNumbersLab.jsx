'use client';

/* ============================================================================
   RationalNumbersLab — an interactive "bench" for what a RATIONAL NUMBER really
   is: any number you can write as a RATIO of two integers, p/q (with q ≠ 0), and
   therefore any number that lands on an exact point of the number line once you
   cut the unit into q equal pieces and step p of them.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Where IntegerLab teaches
   the whole numbers and their opposites (the ticks), this lab teaches everything
   BETWEEN the ticks: fractions, their equivalent names, their decimal forms, and
   the fact that "terminates or repeats" is the fingerprint of a rational number.
   This spans CCSS 6.NS.C.6 (a rational number as a point on the number line),
   7.NS.A.2d (convert a rational number to a decimal by dividing; it terminates
   or eventually repeats), and 8.NS.A.1 (numbers that are not p/q are irrational).

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter.

   The signature centerpiece is "CUT THE UNIT INTO q, STEP p": the number line is
   subdivided so every unit is split into q equal pieces; a green bracket names
   one such piece as 1/q; and a carmine band sweeps from 0 across p of those
   pieces to land exactly on p/q — so a child SEES that 3/4 is literally three
   one-fourth pieces from zero.  Change q and the pieces re-cut before your eyes;
   change p and the band grows or shrinks piece by piece.  Equivalent fractions
   land on the SAME point (2/4 sits exactly on 1/2), the decimal form is p ÷ q,
   and negatives are the mirror image across 0.

   One-accent discipline: the carmine accent is the fraction p/q — its band, its
   point, its flag, and its big readout.  The piece size 1/q is measured in green;
   the simplest (reduced) name is a restrained blue; the opposite −p/q is a
   ghosted carmine, "the same object, mirrored".

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/RationalNumbersLab.jsx
     2. Import and render it:
          import RationalNumbersLab from './RationalNumbersLab';
          export default function Page() { return <RationalNumbersLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (p, q, step, …).
     MODEL  — the math is EXACT integer arithmetic (gcd, cross-multiply, long
              division); floats are used only to place pixels, never to decide
              equality.  It knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window.  A symmetric number line from −2 to 2.  Four whole
   units wide is enough to show negatives, a couple of integers each way, and
   improper fractions like 7/4 sitting between 1 and 2, while still leaving each
   unit wide enough to cut into as many as twelve visible pieces.
   ------------------------------------------------------------------------- */
const VMIN = -2;
const VMAX = 2;

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  One fraction, built from two integer dials.
     p — the NUMERATOR (how many pieces, counted from 0). The carmine star.
         Its range is −2q … 2q, so it can reach any p/q inside the window and
         no further; unlocks at step 1.
     q — the DENOMINATOR (how many equal pieces each unit is cut into). 1 … 12;
         unlocks at step 2.
   Starting at 3/4 shows a friendly proper fraction with a clean terminating
   decimal (0.75) right away.
   ------------------------------------------------------------------------- */
const START_P = 3;
const START_Q = 4;
const Q_MIN = 1;
const Q_MAX = 12;

const CALIB_STEP = 6;

/* The numerator's reachable range for a given denominator: exactly the pieces
   that stay inside [VMIN, VMAX]. */
const pMin = (q) => VMIN * q;
const pMax = (q) => VMAX * q;
const clampP = (p, q) => Math.max(pMin(q), Math.min(pMax(q), p));

/* Progressive reveal — one idea per step (values are independent of whether a
   dial is yet editable, so stepping back cleanly hides later ideas). */
const showsEquiv = (s) => s >= 3; // "same point, simpler name"
const showsDecimal = (s) => s >= 4; // p ÷ q terminates or repeats
const showsOpposite = (s) => s >= 5 && s !== CALIB_STEP; // mirror across 0 (hidden during the game)

/* ============================================================================
   EDIT 2 — Model.  Every function here is EXACT: gcd/reduce on integers,
   comparison by cross-multiplication, and decimal expansion by long division
   that detects the repeating block.  Nothing is approximated, so equality is
   never a floating-point coin toss.  These functions ARE the mathematics the
   lab teaches.
   ========================================================================== */

/* Greatest common divisor (Euclid). Always ≥ 1. */
const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
};

/* Lowest terms, sign carried on the numerator, denominator kept positive.
   0 normalises to 0/1. */
const reduce = (p, q) => {
  if (q < 0) {
    p = -p;
    q = -q;
  }
  if (p === 0) return [0, 1];
  const g = gcd(p, q);
  return [p / g, q / g];
};

const value = (p, q) => p / q; // ONLY for pixel positioning, never for equality

/* Exact comparison / equality by cross-multiplication (denominators are > 0). */
const cmpRat = (p1, q1, p2, q2) => Math.sign(p1 * q2 - p2 * q1);
const eqRat = (p1, q1, p2, q2) => p1 * q2 === p2 * q1;

/* A reduced fraction terminates as a decimal iff its denominator's only prime
   factors are 2 and 5. */
const terminates = (p, q) => {
  let [, d] = reduce(p, q);
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
};

/* Long division → exact decimal expansion.  Returns the whole part, the
   non-repeating digits, and the repeating block (empty if it terminates).  The
   classic "remember the remainders" algorithm: when a remainder repeats, the
   digits from its first appearance onward repeat forever. */
function decimalParts(p, q) {
  const neg = p < 0;
  let n = Math.abs(p);
  const whole = Math.floor(n / q);
  let rem = n % q;
  const digits = [];
  const seen = new Map(); // remainder → index in `digits`
  let repeatStart = -1;
  while (rem !== 0) {
    if (seen.has(rem)) {
      repeatStart = seen.get(rem);
      break;
    }
    seen.set(rem, digits.length);
    rem *= 10;
    digits.push(Math.floor(rem / q));
    rem %= q;
  }
  const nonRep = repeatStart < 0 ? digits : digits.slice(0, repeatStart);
  const rep = repeatStart < 0 ? [] : digits.slice(repeatStart);
  return { neg, whole, nonRep, rep, terminates: repeatStart < 0 };
}

/* Plain-text decimal (for aria + audits): "0.75" or "0.1 6 repeating". */
const decimalText = (p, q) => {
  const d = decimalParts(p, q);
  const sign = d.neg && (d.whole || d.nonRep.length || d.rep.length) ? '−' : '';
  const frac = d.nonRep.join('') + (d.rep.length ? ' ' + d.rep.join('') + ' repeating' : '');
  return sign + d.whole + (d.nonRep.length || d.rep.length ? '.' + frac.replace(' repeating', ' repeating') : '');
};

/* Signed p/q as text; when the denominator is 1 it is just an integer. */
const fmtFrac = (p, q) => {
  const [rp, rq] = [p, q];
  const s = rp < 0 ? '−' : '';
  return rq === 1 ? s + Math.abs(rp) : s + Math.abs(rp) + '/' + rq;
};

/* Mixed number, when the fraction is improper (|value| ≥ 1 and not an integer).
   e.g. 7/4 → { neg:false, whole:1, num:3, den:4 }. */
function mixedParts(p, q) {
  const [rp, rq] = reduce(p, q);
  if (rq === 1) return null; // integer
  if (Math.abs(rp) < rq) return null; // proper
  const neg = rp < 0;
  const a = Math.abs(rp);
  return { neg, whole: Math.floor(a / rq), num: a % rq, den: rq };
}

/* ---- number → words ------------------------------------------------------- */
const ONES_W = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS_W = ['', '', 'twenty', 'thirty', 'forty'];
const numWords = (n) => {
  n = Math.abs(n);
  if (n < 20) return ONES_W[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS_W[t] + (o ? '-' + ONES_W[o] : '');
};
/* Denominator name: 2 → half/halves, 3 → third(s), … up to twelfth(s). */
const DENOM_W = {
  2: 'half', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh',
  8: 'eighth', 9: 'ninth', 10: 'tenth', 11: 'eleventh', 12: 'twelfth',
};
const denomWords = (q, plural) => {
  const base = DENOM_W[q] || q + 'th';
  if (!plural) return base;
  return base === 'half' ? 'halves' : base + 's';
};
/* Read a fraction aloud: integer, proper, or improper (as a fraction, e.g.
   "seven-fourths"), with a leading "negative" when needed. */
const fracWords = (p, q) => {
  const [rp, rq] = reduce(p, q);
  if (rp === 0) return 'zero';
  const sign = rp < 0 ? 'negative ' : '';
  if (rq === 1) return sign + numWords(rp);
  const a = Math.abs(rp);
  return sign + numWords(a) + '-' + denomWords(rq, a !== 1);
};

/* ============================================================================
   EDIT 6 — Calibration.  A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): read a CLUE that names one rational number, then build it by
   setting p and q so that p/q lands on that exact POINT.  Because it is the
   point that matters, ANY equivalent fraction calibrates (2/4 counts for 1/2) —
   which quietly rehearses equivalence.  Each clue exercises a lesson idea:
   fraction words, opposites, decimal↔fraction, improper/mixed, number-line
   reasoning, simplifying, and ordering.  The meter reads "warmth" (how close on
   the line) with a directional hint; CALIBRATED only when p/q equals the target
   exactly (checked by cross-multiplication, never by float).
   ========================================================================== */

/* Friendly fractions whose reduced denominator is ≤ 12 and whose value is in
   (0, 2).  Used to seed several clue kinds. */
const NICE = [
  [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5],
  [1, 6], [5, 6], [1, 8], [3, 8], [5, 8], [7, 8], [1, 10], [3, 10], [7, 10], [9, 10],
];
/* Terminating decimals with clean fraction targets (for the decimal→fraction clue). */
const DECS = [
  ['0.5', 1, 2], ['0.25', 1, 4], ['0.75', 3, 4], ['0.2', 1, 5], ['0.4', 2, 5],
  ['0.6', 3, 5], ['0.8', 4, 5], ['0.125', 1, 8], ['0.375', 3, 8], ['0.1', 1, 10],
];
/* Mixed numbers in (1, 2) with a matching improper target. */
const MIXED = [
  ['1½', 3, 2], ['1¼', 5, 4], ['1¾', 7, 4], ['1⅓', 4, 3], ['1⅔', 5, 3], ['1⅕', 6, 5],
];

function makeClue(prev) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const build = () => {
    const kind = Math.floor(Math.random() * 8);
    switch (kind) {
      case 0: {
        // fraction words
        const [n, d] = pick(NICE);
        return { tp: n, tq: d, clue: fracWords(n, d), kind };
      }
      case 1: {
        // opposite
        const [n, d] = pick(NICE);
        return { tp: -n, tq: d, clue: `the opposite of ${n}/${d}`, kind };
      }
      case 2: {
        // decimal → fraction
        const [dec, n, d] = pick(DECS);
        return { tp: n, tq: d, clue: `a fraction equal to the decimal ${dec}`, kind };
      }
      case 3: {
        // mixed number → improper
        const [label, n, d] = pick(MIXED);
        return { tp: n, tq: d, clue: `the mixed number ${label}`, kind };
      }
      case 4: {
        // number-line reasoning (halfway points)
        const opts = [
          { tp: 1, tq: 2, clue: 'the point exactly halfway between 0 and 1' },
          { tp: 1, tq: 4, clue: 'the point exactly halfway between 0 and ½' },
          { tp: 3, tq: 4, clue: 'the point exactly halfway between ½ and 1' },
          { tp: 3, tq: 2, clue: 'the point exactly halfway between 1 and 2' },
          { tp: -1, tq: 2, clue: 'the point exactly halfway between 0 and −1' },
        ];
        return { ...pick(opts), kind };
      }
      case 5: {
        // negative, named directly
        const [n, d] = pick(NICE);
        return { tp: -n, tq: d, clue: `−${n}/${d}`, kind };
      }
      case 6: {
        // simplify: show an un-reduced fraction, target its lowest terms
        const [n, d] = pick(NICE);
        const k = 2 + Math.floor(Math.random() * 2); // 2 or 3
        return { tp: n, tq: d, clue: `the simplest form of ${n * k}/${d * k}`, kind };
      }
      default: {
        // ordering: greater/lesser of two distinct fractions
        let a = pick(NICE);
        let b = pick(NICE);
        let guard = 0;
        while (eqRat(a[0], a[1], b[0], b[1]) && guard++ < 20) b = pick(NICE);
        const greater = cmpRat(a[0], a[1], b[0], b[1]) > 0 ? a : b;
        const lesser = greater === a ? b : a;
        const wantGreater = Math.random() < 0.5;
        const t = wantGreater ? greater : lesser;
        return {
          tp: t[0], tq: t[1],
          clue: `the ${wantGreater ? 'larger' : 'smaller'} of ${a[0]}/${a[1]} and ${b[0]}/${b[1]}`,
          kind,
        };
      }
    }
  };
  let r;
  do {
    r = build();
  } while (prev != null && eqRat(r.tp, r.tq, prev.tp, prev.tq)); // fresh target each time
  return r;
}

const matchPercent = (p, q, tp, tq, calibrated) => {
  if (calibrated) return 100;
  const d = Math.abs(value(p, q) - value(tp, tq));
  return Math.max(0, Math.min(99, Math.round(100 - d * 40)));
};

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback`; distractors are real learner misconceptions
   ("¾ sits near 3", "1/5 > 1/3 because 5 > 3", "add the same number to reduce",
   "1/3 = 0.3 exactly", "−3/4 > −1/2 because 3/4 > 1/2").  Next is gated on
   ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'What is a rational number?',
    body:
      'A RATIONAL NUMBER is any number you can write as p/q — a RATIO of two integers, bottom ' +
      'not 0. A huge family: every whole number (7 = 7/1), every fraction (¾), every terminating ' +
      'or repeating decimal, and their negatives. The fraction reads 3/4. Step through to unlock ' +
      'the dials.',
    q: 'A rational number is a ratio p/q of two integers. Which of these is rational?',
    choices: ['6, because 6 = 6/1', '0.5, because 0.5 = 1/2', 'both — every integer and every terminating decimal is rational'],
    answer: 2,
    feedback:
      'Both. 6 = 6/1 and 0.5 = 1/2 — each a ratio of two integers. Whole numbers, fractions, ' +
      'and terminating or repeating decimals are ALL rational. (Numbers that are no p/q at all — ' +
      'π, √2 — are irrational; those arrive in grade 8.)',
  },
  {
    title: 'The numerator counts the pieces',
    body:
      'Read the fraction from the bottom up. The denominator q cuts each unit into q equal ' +
      'pieces — here fourths. The numerator p counts the pieces you step off from 0. The p dial ' +
      'is live: slide it and watch the carmine band grow a fourth at a time.',
    q: 'With q = 4, where does p/q = 3/4 land on the number line?',
    choices: ['3 one-fourth pieces from 0 — between 0 and 1', '3 whole steps from 0, at the tick “3”', 'between 3 and 4'],
    answer: 0,
    feedback:
      '3/4 is three one-fourth pieces from 0 — between 0 and 1, three-quarters of the way. The ' +
      'bottom sets the piece SIZE; the top COUNTS pieces. Nowhere near the tick “3”.',
  },
  {
    title: 'The denominator sets the piece size',
    body:
      'Now the q dial unlocks. Change q to re-cut every unit: q = 2 halves, q = 3 thirds, q = 10 ' +
      'tenths. Bigger q means MORE pieces, so each piece is SMALLER. p/q is always p of those 1/q ' +
      'pieces.',
    q: 'Which is the bigger piece, 1/3 or 1/5?',
    choices: ['1/3 — fewer pieces means each one is larger', '1/5 — 5 is bigger than 3', 'they are the same size'],
    answer: 0,
    feedback:
      'Cutting a unit into 3 gives bigger pieces than into 5, so 1/3 > 1/5. For unit fractions a ' +
      'bigger denominator means a SMALLER piece — the opposite of what the digits suggest. Watch ' +
      'the ticks spread as q shrinks.',
  },
  {
    title: 'Equivalent fractions: same point, simpler name',
    body:
      'Different fractions can name the SAME point: 2/4, 3/6, and 5/10 all land exactly on 1/2. ' +
      'Multiply or divide top and bottom by the same number — the location never moves. Lowest ' +
      'terms: divide both by their greatest common factor. Try “Simplify”, or set 2/4 then 1/2 — ' +
      'the point stays put.',
    q: 'Which fraction is NOT the same point as 1/2?',
    choices: ['4/8', '3/6', '2/3'],
    answer: 2,
    feedback:
      '4/8 and 3/6 both reduce to 1/2, so they sit exactly on it. 2/3 reduces no further and ' +
      'lands past 1/2, closer to 1. Reducing means DIVIDING top and bottom by the same number — ' +
      'not adding.',
  },
  {
    title: 'Decimal form: it terminates or repeats',
    body:
      'Every rational equals the decimal you get by DIVIDING p ÷ q. It always either TERMINATES ' +
      '(1/4 = 0.25) or REPEATS a block forever (1/3 = 0.333…, written 0.3 with a bar). “Terminates ' +
      'or repeats” is the rational fingerprint. The decimal shows beneath the fraction.',
    q: 'What is the decimal form of 1/3?',
    choices: ['0.333… — the 3 repeats forever', '0.3 exactly', '0.13'],
    answer: 0,
    feedback:
      '1 ÷ 3 never ends: 0.3333…, written 0.3 with a bar. Close to 0.3 but not equal — 0.3 ' +
      'exactly would be 3/10. A denominator built only from 2s and 5s terminates; anything else, ' +
      'like the 3 here, repeats.',
  },
  {
    title: 'Negatives, opposites, and in-between',
    body:
      'The numerator can be negative: −3/4 mirrors 3/4 across 0, three-fourths to the LEFT. The ' +
      'ghost dot shows the opposite. Between ANY two rationals there is always another — just cut ' +
      'finer. The rationals fill the line densely, though never completely: π and √2 are no p/q.',
    q: 'Which is greater, −1/2 or −3/4?',
    choices: ['−1/2 — it is closer to 0, so farther right', '−3/4 — because 3/4 is more than 1/2', 'they are equal'],
    answer: 0,
    feedback:
      '−1/2 sits RIGHT of −3/4, closer to 0, so −1/2 > −3/4. With negatives, more distance from ' +
      '0 means SMALLER — the same trap as −2 > −5. Position on the line decides order, not digit ' +
      'size.',
  },
  {
    title: 'Build the mystery rational',
    body:
      'Final challenge. Read the CLUE below, then build the number it names: q sets the piece ' +
      'size, p counts pieces, until p/q lands on the target point. Any equivalent fraction counts — ' +
      'the POINT is what matters. The meter warms as you near it; land exactly for CALIBRATED. ' +
      '“New clue” deals a fresh one.',
    calib: true,
  },
];

/* ============================================================================
   EDIT 5 — Equation display.  The fraction, big and carmine, drawn as a proper
   stacked fraction; beside it a blue "= reduced" chip (when the simpler name
   differs), a muted mixed-number chip (when improper), a green decimal chip
   with an overline over the repeating block, and a ghosted "opposite" chip.
   Colour is the pedagogical link between symbol and picture.

   Styles are inlined here (not in the styled-jsx block) because these spans are
   rendered by a CHILD component; styled-jsx only scopes a component's own JSX,
   so inlining keeps the readout identical in Next.js and in any plain preview.
   ========================================================================== */
const CHIP_BASE = {
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  fontSize: '12.5px',
  fontWeight: 700,
  padding: '3px 8px',
  borderRadius: '999px',
  lineHeight: 1.15,
  whiteSpace: 'nowrap',
};

/* A stacked fraction a/b with an optional leading minus. */
function Frac({ p, q, color, size = 30 }) {
  const neg = p < 0;
  const a = Math.abs(p);
  if (q === 1) {
    return (
      <span
        style={{
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontVariantNumeric: 'tabular-nums',
          fontSize: size + 'px',
          fontWeight: 700,
          color,
        }}
      >
        {neg ? '−' : ''}
        {a}
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color }}>
      {neg && (
        <span
          style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: size + 'px', fontWeight: 700 }}
        >
          −
        </span>
      )}
      <span
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 700,
          lineHeight: 1.02,
          fontSize: size * 0.6 + 'px',
        }}
      >
        <span>{a}</span>
        <span style={{ width: '100%', height: '2px', background: color, borderRadius: '1px', margin: '1px 0' }} />
        <span>{q}</span>
      </span>
    </span>
  );
}

/* The decimal with a proper overline (vinculum) over the repeating block. */
function DecimalReadout({ p, q, color }) {
  const d = decimalParts(p, q);
  const sign = d.neg && (d.whole || d.nonRep.length || d.rep.length) ? '−' : '';
  return (
    <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontVariantNumeric: 'tabular-nums' }}>
      {sign}
      {d.whole}
      {(d.nonRep.length || d.rep.length) && '.'}
      {d.nonRep.join('')}
      {d.rep.length > 0 && (
        <span style={{ textDecoration: 'overline', textDecorationColor: color }}>{d.rep.join('')}</span>
      )}
    </span>
  );
}

function RationalEquation({ p, q, showEquiv, showDecimal, showOpp }) {
  const [rp, rq] = reduce(p, q);
  const isReduced = rp === p && rq === q;
  const mixed = mixedParts(p, q);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <Frac p={p} q={q} color="#c81e4f" size={30} />
      {showEquiv && !isReduced && (
        <span style={{ ...CHIP_BASE, color: '#3f74a6', background: 'rgba(63,116,166,0.1)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          = <Frac p={rp} q={rq} color="#3f74a6" size={17} />
        </span>
      )}
      {mixed && (
        <span style={{ ...CHIP_BASE, color: '#5b6b7b', background: 'rgba(91,107,123,0.1)' }}>
          = {mixed.neg ? '−' : ''}{mixed.whole} {mixed.num}/{mixed.den}
        </span>
      )}
      {showDecimal && (
        <span style={{ ...CHIP_BASE, color: '#2e8b6f', background: 'rgba(46,139,111,0.1)' }}>
          = <DecimalReadout p={p} q={q} color="#2e8b6f" />
        </span>
      )}
      {showOpp && p !== 0 && (
        <span style={{ ...CHIP_BASE, color: 'rgba(200,30,79,0.7)', background: 'rgba(200,30,79,0.07)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          opp <Frac p={-p} q={q} color="rgba(200,30,79,0.75)" size={17} />
        </span>
      )}
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function RationalNumbersLab() {
  const [p, setP] = useState(START_P);
  const [q, setQ] = useState(START_Q);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [clue, setClue] = useState(null); // { tp, tq, clue, kind }

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const layoutRef = useRef(null); // number-line transform, written by draw()
  const draggingRef = useRef(false);
  const hoverRef = useRef(false);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const pUnlocked = step >= 1;
  const qUnlocked = step >= 2;
  const showEquiv = showsEquiv(step);
  const showDecimal = showsDecimal(step);
  const showOpp = showsOpposite(step);

  const [rp, rq] = reduce(p, q);
  const isReduced = rp === p && rq === q;

  // Snapshot everything the renderer / handlers need so the stable draw()
  // callback never reads stale values.
  sceneRef.current = {
    p, q, step, calib, pUnlocked, qUnlocked, showEquiv, showDecimal, showOpp, rp, rq, isReduced,
  };

  const calibrated = clue ? eqRat(p, q, clue.tp, clue.tq) : false;
  const pct = clue ? matchPercent(p, q, clue.tp, clue.tq, calibrated) : 0;
  const dir = clue ? cmpRat(p, q, clue.tp, clue.tq) : 0;
  const dirHint = calibrated ? '' : dir < 0 ? 'go higher →' : dir > 0 ? '← go lower' : '';
  sceneRef.current._cal = calib && clue != null && calibrated;

  /* ---- rational → screen transform + full redraw from state -------------- */
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
    const g2 = canvas.getContext('2d');
    g2.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    /* palette */
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const CARMINE = '#C81E4F';
    const GREEN = '#2E8B6F';
    const BLUE = '#3F74A6';
    const OK = '#1F8A5B';

    const S = sceneRef.current;
    const P = S.p;
    const Q = S.q;
    const val = value(P, Q);

    const padL = 44;
    const padR = 44;
    const yLine = Math.round(H * 0.5);
    const spanW = W - padL - padR;
    const X = (v) => padL + ((v - VMIN) / (VMAX - VMIN)) * spanW;
    const u = X(1) - X(0); // pixels per unit
    layoutRef.current = { padL, spanW, VMIN, VMAX, yLine, u };

    const rr = (x, y, w, h, rad) => {
      const t = Math.min(rad, w / 2, h / 2);
      g2.beginPath();
      g2.moveTo(x + t, y);
      g2.arcTo(x + w, y, x + w, y + h, t);
      g2.arcTo(x + w, y + h, x, y + h, t);
      g2.arcTo(x, y + h, x, y, t);
      g2.arcTo(x, y, x + w, y, t);
      g2.closePath();
    };

    g2.clearRect(0, 0, W, H);

    /* ---- sign regions: a whisper of cool (negative) / warm (positive) ------ */
    g2.fillStyle = 'rgba(63,116,166,0.05)';
    g2.fillRect(0, 0, X(0), H);
    g2.fillStyle = 'rgba(200,30,79,0.045)';
    g2.fillRect(X(0), 0, W - X(0), H);

    /* ---- quadrille paper: faint horizontal rules -------------------------- */
    g2.lineWidth = 1;
    g2.strokeStyle = 'rgba(199,216,228,0.45)';
    g2.beginPath();
    const gs = 28;
    for (let y = gs; y < H; y += gs) {
      g2.moveTo(0, Math.round(y) + 0.5);
      g2.lineTo(W, Math.round(y) + 0.5);
    }
    g2.stroke();

    /* ---- subdivision ticks: cut every unit into Q equal pieces ------------- */
    // Fainter and shorter when Q is large so the line never looks like a comb.
    const minorH = Q <= 4 ? 6 : Q <= 8 ? 5 : 4;
    const minorA = Q <= 4 ? 0.5 : Q <= 8 ? 0.42 : 0.34;
    if (Q > 1) {
      g2.strokeStyle = `rgba(46,139,111,${minorA})`;
      g2.lineWidth = 1;
      g2.beginPath();
      for (let k = VMIN * Q; k <= VMAX * Q; k++) {
        if (k % Q === 0) continue; // skip integers (drawn as majors below)
        const x = Math.round(X(k / Q)) + 0.5;
        g2.moveTo(x, yLine - minorH);
        g2.lineTo(x, yLine + minorH);
      }
      g2.stroke();
    }

    /* ---- the number line: baseline with end arrows ------------------------- */
    const xL = X(VMIN) - 12;
    const xR = X(VMAX) + 12;
    g2.strokeStyle = 'rgba(28,43,58,0.78)';
    g2.lineWidth = 2;
    g2.beginPath();
    g2.moveTo(xL, yLine + 0.5);
    g2.lineTo(xR, yLine + 0.5);
    g2.stroke();
    g2.fillStyle = 'rgba(28,43,58,0.78)';
    const arrow = (x, d) => {
      g2.beginPath();
      g2.moveTo(x, yLine);
      g2.lineTo(x - d * 8, yLine - 4.5);
      g2.lineTo(x - d * 8, yLine + 4.5);
      g2.closePath();
      g2.fill();
    };
    arrow(xL, -1);
    arrow(xR, 1);

    /* ---- integer ticks + labels ------------------------------------------- */
    g2.textAlign = 'center';
    g2.textBaseline = 'top';
    for (let v = VMIN; v <= VMAX; v++) {
      const x = X(v);
      const zero = v === 0;
      g2.strokeStyle = zero ? 'rgba(28,43,58,0.85)' : 'rgba(28,43,58,0.6)';
      g2.lineWidth = zero ? 2.4 : 2;
      g2.beginPath();
      g2.moveTo(x, yLine - (zero ? 10 : 9));
      g2.lineTo(x, yLine + (zero ? 10 : 9));
      g2.stroke();
      g2.font = (zero ? '700 ' : '600 ') + '12px ui-monospace, "SF Mono", Menlo, monospace';
      g2.fillStyle = INK;
      g2.fillText(v < 0 ? '−' + Math.abs(v) : String(v), x, yLine + 13);
    }

    /* ---- piece-size bracket: name one 1/Q piece in green ------------------- */
    if (Q > 1) {
      const yB = yLine + 34;
      const x0 = X(0);
      const x1 = X(1 / Q);
      g2.save();
      g2.strokeStyle = GREEN;
      g2.lineWidth = 2;
      g2.beginPath();
      g2.moveTo(x0, yB - 5);
      g2.lineTo(x0, yB);
      g2.lineTo(x1, yB);
      g2.lineTo(x1, yB - 5);
      g2.stroke();
      g2.fillStyle = GREEN;
      g2.font = '700 11.5px ui-monospace, Menlo, monospace';
      g2.textAlign = 'left';
      g2.textBaseline = 'middle';
      g2.fillText(`1⁄${Q} = one ${denomWords(Q, false)}`, x1 + 8, yB - 2);
      g2.restore();
    }

    /* ---- the carmine band: sweep p pieces from 0 to p/q -------------------- */
    if (P !== 0) {
      const x0 = X(0);
      const xv = X(val);
      const bandY = yLine;
      // translucent band hugging the line
      g2.save();
      g2.strokeStyle = 'rgba(200,30,79,0.28)';
      g2.lineWidth = 9;
      g2.lineCap = 'round';
      g2.beginPath();
      g2.moveTo(x0, bandY);
      g2.lineTo(xv, bandY);
      g2.stroke();
      g2.restore();
      // notch at each piece boundary k/Q that the band covers
      const steps = Math.abs(P);
      const sgn = P < 0 ? -1 : 1;
      g2.save();
      g2.strokeStyle = 'rgba(200,30,79,0.85)';
      g2.lineWidth = 1.6;
      g2.beginPath();
      for (let k = 0; k <= steps; k++) {
        const x = Math.round(X((sgn * k) / Q)) + 0.5;
        g2.moveTo(x, bandY - 7);
        g2.lineTo(x, bandY + 7);
      }
      g2.stroke();
      g2.restore();
      // count label "p × 1/Q" above the band midpoint
      const label = `${steps} × 1⁄${Q}`;
      g2.save();
      g2.font = '700 12px ui-monospace, Menlo, monospace';
      const lw = g2.measureText(label).width;
      const midX = Math.max(lw / 2 + 4, Math.min(W - lw / 2 - 4, (x0 + xv) / 2));
      g2.fillStyle = CARMINE;
      g2.textAlign = 'center';
      g2.textBaseline = 'bottom';
      g2.fillText(label, midX, bandY - 22);
      g2.restore();
    }

    /* ---- opposite ghost dot + arc (mirror across 0) ------------------------ */
    if (S.showOpp && P !== 0) {
      const xa = X(val);
      const xo = X(-val);
      const apexY = Math.max(12, H * 0.12);
      g2.save();
      g2.strokeStyle = 'rgba(200,30,79,0.5)';
      g2.setLineDash([5, 4]);
      g2.lineWidth = 1.6;
      g2.beginPath();
      g2.moveTo(xa, yLine - 13);
      g2.bezierCurveTo(xa, apexY, xo, apexY, xo, yLine - 13);
      g2.stroke();
      g2.restore();
      g2.save();
      g2.fillStyle = 'rgba(200,30,79,0.82)';
      g2.font = '600 11px ui-monospace, Menlo, monospace';
      g2.textAlign = 'center';
      g2.textBaseline = 'bottom';
      g2.fillText('opposite', (xa + xo) / 2, apexY + 2);
      g2.restore();
      g2.save();
      g2.beginPath();
      g2.arc(xo, yLine, 6.5, 0, Math.PI * 2);
      g2.fillStyle = 'rgba(200,30,79,0.12)';
      g2.fill();
      g2.strokeStyle = 'rgba(200,30,79,0.7)';
      g2.setLineDash([3, 3]);
      g2.lineWidth = 1.6;
      g2.stroke();
      g2.restore();
    }

    /* ---- equivalence note: same point, simpler name (blue) ---------------- */
    if (S.showEquiv && !S.isReduced && P !== 0) {
      const xv = X(val);
      g2.save();
      g2.fillStyle = BLUE;
      g2.font = '700 11.5px ui-monospace, Menlo, monospace';
      g2.textAlign = 'center';
      g2.textBaseline = 'top';
      g2.fillText(`= ${S.rp}⁄${S.rq}`, xv, yLine + 50);
      g2.restore();
    }

    /* ---- the star: the point p/q with a value flag above ------------------ */
    {
      const xv = X(val);
      const hover = hoverRef.current || draggingRef.current;
      const flagText = fmtFrac(P, Q);
      g2.save();
      g2.font = '700 13px ui-monospace, Menlo, monospace';
      const fw = g2.measureText(flagText).width + 18;
      const flagY = Math.max(H * 0.16 + 4, yLine - 50);
      const fx = Math.max(2, Math.min(W - fw - 2, xv - fw / 2));
      // stem
      g2.strokeStyle = CARMINE;
      g2.lineWidth = 1.6;
      g2.beginPath();
      g2.moveTo(xv, flagY + 22);
      g2.lineTo(xv, yLine);
      g2.stroke();
      // flag body
      g2.fillStyle = CARMINE;
      rr(fx, flagY, fw, 22, 6);
      g2.fill();
      g2.beginPath();
      g2.moveTo(xv, flagY + 28);
      g2.lineTo(xv - 5, flagY + 22);
      g2.lineTo(xv + 5, flagY + 22);
      g2.closePath();
      g2.fill();
      g2.fillStyle = '#fff';
      g2.textAlign = 'center';
      g2.textBaseline = 'middle';
      g2.fillText(flagText, fx + fw / 2, flagY + 11);
      // the dot
      g2.beginPath();
      g2.arc(xv, yLine, hover ? 9 : 7.5, 0, Math.PI * 2);
      g2.fillStyle = CARMINE;
      g2.fill();
      g2.strokeStyle = '#fff';
      g2.lineWidth = 2;
      g2.stroke();
      g2.restore();
    }

    /* ---- calibrated stamp -------------------------------------------------- */
    if (S._cal) {
      g2.save();
      g2.translate(W / 2, H * 0.84);
      g2.rotate(-0.05);
      g2.fillStyle = 'rgba(31,138,91,0.10)';
      rr(-70, -16, 140, 32, 7);
      g2.fill();
      g2.strokeStyle = OK;
      g2.lineWidth = 2;
      rr(-70, -16, 140, 32, 7);
      g2.stroke();
      g2.fillStyle = OK;
      g2.font = '700 14px ui-monospace, Menlo, monospace';
      g2.textAlign = 'center';
      g2.textBaseline = 'middle';
      g2.fillText('✓ CALIBRATED', 0, 0.5);
      g2.restore();
    }
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [p, q, step, clue, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a clue to the calibration step the first time we reach it; reset the
     fraction to 0 so it starts plainly un-matched. */
  useEffect(() => {
    if (current.calib && clue == null) {
      setClue(makeClue(null));
      setP(0);
      setQ(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction: drag the point along the line ------------------------ */
  const valAtX = (cssX) => {
    const L = layoutRef.current;
    if (!L) return 0;
    return L.VMIN + ((cssX - L.padL) / L.spanW) * (L.VMAX - L.VMIN);
  };
  const screenX = (v) => {
    const L = layoutRef.current;
    if (!L) return 0;
    return L.padL + ((v - L.VMIN) / (L.VMAX - L.VMIN)) * L.spanW;
  };
  // Snap a pointer x to the nearest p/q for the CURRENT q (dragging counts pieces).
  const setPFromX = (cssX) => {
    const S = sceneRef.current;
    const v = valAtX(cssX);
    const np = clampP(Math.round(v * S.q), S.q);
    if (np !== S.p) setP(np);
  };

  const onPointerDown = (e) => {
    const S = sceneRef.current;
    if (!S.pUnlocked) return;
    draggingRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    setPFromX(e.clientX - rect.left);
    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };
  const onPointerMove = (e) => {
    const S = sceneRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    if (draggingRef.current) {
      setPFromX(cssX);
      return;
    }
    if (!S.pUnlocked) return;
    const near = Math.abs(cssX - screenX(value(S.p, S.q))) < 20;
    if (near !== hoverRef.current) {
      hoverRef.current = near;
      draw();
    }
  };
  const endDrag = () => {
    if (draggingRef.current) draggingRef.current = false;
  };
  const onPointerLeave = () => {
    endDrag();
    if (hoverRef.current) {
      hoverRef.current = false;
      draw();
    }
  };

  /* ---- other handlers ---------------------------------------------------- */
  const choose = (idx) => {
    if (answers[step] != null) return; // lock the answer once given
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const onQChange = (nq) => {
    setQ(nq);
    setP((prev) => clampP(prev, nq)); // keep the numerator inside the new piece count
  };
  const simplify = () => {
    setP(rp);
    setQ(rq);
  };
  const resetFraction = () => {
    if (calib) {
      setP(0);
      setQ(2);
    } else {
      setP(START_P);
      setQ(START_Q);
    }
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* between which integers does the point sit? */
  const lo = Math.floor(value(p, q) + 1e-9);
  const betweenTxt =
    q === 1 || Number.isInteger(value(p, q))
      ? `on the integer ${value(p, q)}`
      : `between ${lo} and ${lo + 1}`;

  /* spoken description (accessibility) */
  const parts = [
    `The rational number is ${fracWords(p, q)}, written ${fmtFrac(p, q)}, ${betweenTxt}.`,
  ];
  if (showEquiv && !isReduced) parts.push(`In lowest terms it is ${fmtFrac(rp, rq)}.`);
  if (showDecimal) parts.push(`Its decimal form is ${decimalText(p, q)}, which ${terminates(p, q) ? 'terminates' : 'repeats'}.`);
  if (showOpp && p !== 0) parts.push(`Its opposite is ${fracWords(-p, q)}.`);
  const spoken = parts.join(' ');

  return (
    <div className="rlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Rational Numbers: Cut the Unit, Step the Pieces</h1>
        <p className="lede">
          A <em>rational number</em> is any number you can write as a ratio{' '}
          <span className="mono">p/q</span> of two integers. On the number line it is the point you
          reach by cutting each unit into <em>q</em> equal pieces and stepping off <em>p</em> of them.
          Explore how the <em>numerator</em> counts, the <em>denominator</em> sizes, how{' '}
          <em>equivalent</em> fractions share a point, and why every rational number’s{' '}
          <em>decimal</em> either terminates or repeats.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <RationalEquation p={p} q={q} showEquiv={showEquiv} showDecimal={showDecimal} showOpp={showOpp} />
            </p>
            <p className="equation-sub mono">{fracWords(p, q)}</p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={onPointerLeave}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {pUnlocked ? 'drag the point, or use the dials' : 'unlock the numerator to begin →'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — you built the mystery rational number.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Reads as</span>
              <span className="fact-v">{fracWords(p, q)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Lowest terms</span>
              <span className="fact-v mono">{isReduced ? 'already simplest' : fmtFrac(rp, rq)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Decimal form</span>
              <span className="fact-v mono">
                {showDecimal ? `${decimalText(p, q).replace(' repeating', '…')} · ${terminates(p, q) ? 'terminates' : 'repeats'}` : '—'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Opposite</span>
              <span className="fact-v mono">{showOpp ? fmtFrac(-p, q) : '—'}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className="btn ghost"
              onClick={simplify}
              disabled={!pUnlocked || isReduced || p === 0}
              title="Set the dials to the lowest-terms name of the same point"
            >
              Simplify
            </button>
            <button type="button" className="btn ghost" onClick={resetFraction}>
              Reset
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
            <label className={'dial' + (pUnlocked ? '' : ' locked')}>
              <span className="dk" style={{ color: '#c81e4f' }}>
                p
              </span>
              <span className="drole">{pUnlocked ? 'numerator — pieces from 0' : 'unlocks at step 2'}</span>
              <input
                type="range"
                min={pMin(q)}
                max={pMax(q)}
                step={1}
                value={p}
                disabled={!pUnlocked}
                aria-label="Numerator p"
                onChange={(e) => setP(parseInt(e.target.value, 10))}
                style={{ accentColor: '#c81e4f' }}
              />
              <output className="dv" style={pUnlocked ? { color: '#c81e4f' } : undefined}>
                {pUnlocked ? (p < 0 ? '−' + Math.abs(p) : p) : '🔒'}
              </output>
            </label>

            <label className={'dial' + (qUnlocked ? '' : ' locked')}>
              <span className="dk" style={{ color: '#2e8b6f' }}>
                q
              </span>
              <span className="drole">
                {qUnlocked ? 'denominator — equal pieces per unit' : 'unlocks at step 3'}
              </span>
              <input
                type="range"
                min={Q_MIN}
                max={Q_MAX}
                step={1}
                value={q}
                disabled={!qUnlocked}
                aria-label="Denominator q"
                onChange={(e) => onQChange(parseInt(e.target.value, 10))}
                style={{ accentColor: '#2e8b6f' }}
              />
              <output className="dv" style={qUnlocked ? { color: '#2e8b6f' } : undefined}>
                {qUnlocked ? q : '🔒'}
              </output>
            </label>
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

          {current.calib && clue != null && (
            <div className="calib">
              <div className="clue-card">
                <span className="clue-k">Build this number…</span>
                <span className="clue-text">{clue.clue}</span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">warmth&nbsp;{pct}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono dir-hint">{dirHint || `now ${fmtFrac(p, q)}`}</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setClue(makeClue(clue));
                  setP(0);
                  setQ(2);
                }}
              >
                New clue
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
                  setClue(null);
                  setP(START_P);
                  setQ(START_Q);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">p/q</span> &nbsp;·&nbsp; rational numbers as points on the number line —
        numerator &amp; denominator, equivalent fractions, and terminating vs. repeating decimals
        (CCSS 6.NS.C.6, 7.NS.A.2d, 8.NS.A.1).
      </footer>

      <style jsx>{`
        .rlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --piece: #2e8b6f;
          --equiv: #3f74a6;
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
          font-size: clamp(24px, 4vw, 33px);
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
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 10px;
          min-height: 40px;
        }
        .equation {
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
          text-transform: capitalize;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 8 / 5;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          cursor: grab;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
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
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 6 / 5;
          }
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
          font-size: 15px;
          font-variant-numeric: tabular-nums;
          text-transform: capitalize;
        }
        .fact-v.mono {
          text-transform: none;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
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
          grid-template-columns: 30px 1fr 42px;
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
          font-weight: 700;
          font-size: 20px;
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
          font-size: 17px;
          font-weight: 700;
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
        .clue-card {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 10px 12px;
          border: 1px solid rgba(28, 43, 58, 0.16);
          border-radius: 8px;
          background: rgba(46, 139, 111, 0.06);
        }
        .clue-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .clue-text {
          font-family: var(--serif);
          font-size: 18px;
          font-weight: 600;
          color: var(--ink);
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.5), var(--curve));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .dir-hint {
          color: var(--ink-soft);
          font-size: 12.5px;
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
        :global(.rlab) :focus-visible {
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
