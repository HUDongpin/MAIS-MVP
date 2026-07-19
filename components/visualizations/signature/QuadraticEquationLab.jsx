'use client';

/* ============================================================================
   QuadraticEquationLab — an interactive "bench" for SOLVING the quadratic
   equation  a·x² + b·x + c = 0  by COMPLETING THE SQUARE.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   CCSS: A-REI.B.4a (complete the square; derive the quadratic formula),
         A-REI.B.4b (solve by inspection / square roots / completing the
         square / the formula, and recognise when there is no real solution),
         A-SSE.B.3b (complete the square).  Algebra 1.

   ── WHY THIS LAB EXISTS ALONGSIDE ITS THREE QUADRATIC SIBLINGS ─────────────
   The quadratic corner of this library is crowded, so the boundaries are
   drawn deliberately:

     QuadraticFunctionLab   — the FUNCTION in vertex form y = a(x−h)²+k.
     QuadraticPolynomialLab — the FUNCTION in standard form y = a·x²+b·x+c;
                              its centerpiece is the DISCRIMINANT Δ = b²−4ac
                              used to COUNT the crossings of a drawn parabola.
     ParabolaLab            — the parabola as a CONIC (focus & directrix).

   All three draw a curve and ask "what shape is it?". This lab asks a
   different kind of question — "which numbers make this true?" — so:

     * IT DRAWS NO PARABOLA. Not once. (The same refusal FormulaLab makes of
       the geometry labs, and LCMLab makes of MultiplesLab's number line.)
       Its stage is a SQUARE being built out of the equation's own terms.
     * Its centerpiece is the GESTURE that names the method: the b·x rectangle
       is CUT IN HALF AND SWUNG round under the x² square, which exposes a
       missing corner of area (b/2)². Filling that corner is the whole method.
     * It earns the ± from "a square has TWO square roots", not from the
       symmetry of a graph (which is how QuadraticPolynomialLab tells it).
     * It ends by DERIVING the quadratic formula rather than quoting it.

   ── THE PICTURE IS TRUE TO SCALE, INCLUDING x ──────────────────────────────
   The square is drawn at the equation's actual (as-yet-unnamed) root x₊, so
   every area on the paper is literally true and the completed square's side
   is exactly √q. That is al-Khwarizmi's own move: geometry lets you reason
   about a length before you can name it. Consequently the tile layout only
   exists when a positive root exists, which is an EXACT integer condition:

       tiles drawable  ⟺  Δ ≥ 0  and  (b ≤ 0 or c ≤ 0)          [see analyze]

   The three states where it does not hold are not bugs, they are content:
   Δ < 0 (no square has negative area → no real solution), Δ = 0 (the square
   shrinks to a point → one double root), and b>0 & c>0 (both roots negative
   → a side length cannot be negative, but the algebra still finds them).

   ── CORRECTNESS: EXACT INTEGER ARITHMETIC ──────────────────────────────────
   a, b, c are INTEGER dials, so every derived quantity is exact:
       Δ  = b² − 4ac                (exact integer)
       p  = b/(2a)                  (exact fraction)
       q  = p² − c/a = Δ/(4a²)      (exact fraction — same sign as Δ)
       √q = √Δ/(2a)                 (exact fraction iff Δ is a perfect square)
       x  = (−b ± √Δ)/(2a)
   So the root COUNT is never a floating-point misclassification near Δ = 0,
   and the calibration stamp is gated on an integer identity, not a tolerance.
   See audit-quadraticequation.mjs.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/QuadraticEquationLab.jsx
     2. Import and render it:
          import QuadraticEquationLab from './QuadraticEquationLab';
          export default function Page() { return <QuadraticEquationLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, c, step).
     MODEL  — analyze()/ladder() are pure math; they know nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Each dial IS a coefficient of the equation. Integers
   only: that is what keeps Δ, p, q and the roots exact. Ranges are chosen so
   the completed square always fits the 10×10 unit window (max figure ≈ 7.6u)
   while still reaching every teaching case, including Δ < 0.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'b', label: 'b', min: -6, max: 6, step: 1, unlock: 1, role: 'the x term — sets the strips' },
  { key: 'c', label: 'c', min: -12, max: 12, step: 1, unlock: 2, role: 'the constant — the other side' },
  { key: 'a', label: 'a', min: 1, max: 4, step: 1, unlock: 7, role: 'the x² term — divide through by it first' },
];

/* START: x² + 4x − 5 = 0.  p = 2, q = 9, and the paper reads 1 + 2 + 2 + 4 = 9
   — a perfect first demonstration: (x+2)² = 9 → x + 2 = ±3 → x = 1 or x = −5. */
const START = { a: 1, b: 4, c: -5 };

/* The construction is zoomed to fit the stage per state (see figureBox), so
   there is no fixed world window — but one grid cell is always one unit of
   area, which is what keeps every region on the paper countable. */
const FIT = 0.74; // fraction of the stage the figure spans
const MIN_SPAN = 2.2; // never zoom in further than this many units across

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback`, shown only after answering; distractors are real
   student misconceptions. Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the equation',
    body:
      'a·x² + b·x + c = 0. This is not a curve to explore — it is a QUESTION: which values of x ' +
      'make the left side land exactly on zero? Those values are the solutions (also called the ' +
      'roots). Right now the question is x² + 4x − 5 = 0. On the paper is the one thing the whole ' +
      'method turns on: a square whose side is x.',
    q: 'What does it mean to SOLVE x² + 4x − 5 = 0?',
    choices: [
      'Find every x that makes the left side equal exactly 0',
      'Find the value of the left side when x = 0',
      'Draw the curve y = x² + 4x − 5',
    ],
    answer: 0,
    feedback:
      'Solving means finding every x that makes the statement true — that drives the left side to ' +
      'exactly 0. A quadratic has at most two such values. Putting x = 0 in just reports the ' +
      'constant (−5), and drawing the curve is a different question. Here we will FIND the ' +
      'numbers, exactly, by building a square.',
  },
  {
    title: 'b — the strip beside the square',
    body:
      'The b dial is live. Look at the paper: x² is a square of side x, and b·x is a rectangle b ' +
      'wide and x tall standing right next to it. Together they are x² + b·x — the whole left side ' +
      'except the constant. Drag b and watch the strip grow, shrink, and (past zero) turn into ' +
      'something taken AWAY.',
    q: 'The rectangle beside the x² square is b units wide and x units tall. What is its area?',
    choices: ['b·x', 'b + x', 'b²'],
    answer: 0,
    feedback:
      'Area = width × height = b·x — exactly the middle term of the equation. That is the whole ' +
      'idea behind the method: every term is a piece of AREA. x² is a square of side x, b·x is a ' +
      'rectangle, and the constant c is just a count of unit squares. When b is negative the strip ' +
      'is removed from the square instead of added beside it — same area, opposite sign.',
  },
  {
    title: 'c — move it to the other side',
    body:
      'The c dial is live. Take the constant across: x² + b·x + c = 0 becomes x² + b·x = −c. Now ' +
      'the shapes on the paper have a known total area, −c. Look at the outline they make. It is ' +
      'almost a square — but not quite, and "almost a square" is a problem we know how to fix.',
    q: 'Starting from x² + 4x − 5 = 0, what do you get when you move the constant across?',
    choices: ['x² + 4x = 5', 'x² + 4x = −5', 'x² + 4x + 5 = 0'],
    answer: 0,
    feedback:
      'Add 5 to both sides: x² + 4x = 5. The pieces on the paper now total exactly 5. Notice the ' +
      'shape is lopsided — all of the b·x strip is stacked on one side. Fixing that lopsidedness ' +
      'is the entire method, and it is the next step.',
  },
  {
    title: 'Cut it in half, swing it round',
    body:
      'Here is the move the method is named for. The b·x strip is useless stuck on one side. CUT ' +
      'IT IN HALF — two strips, each b/2 wide — and SWING one of them down beneath the square. ' +
      'Watch it go. The figure is now symmetric: an L reaching around two sides of x², grasping ' +
      'for a square of side x + b/2. Use "Cut & swing" to replay it.',
    q: 'Why cut the b·x strip into two EQUAL halves rather than any two pieces?',
    choices: [
      'So the same width b/2 sits on both sides, reaching for a square of side x + b/2',
      'Because halves are easier to multiply',
      'Because b is always an even number',
    ],
    answer: 0,
    feedback:
      'Symmetry is the point. Putting b/2 on the right AND b/2 underneath makes the figure reach ' +
      'the same distance both ways — towards a square of side x + b/2. Any other split leaves a ' +
      'rectangle, and a rectangle has no single side to take a square root of. (And b need not be ' +
      'even — try b = 3 and the strips are simply 1.5 wide.)',
  },
  {
    title: 'The missing corner',
    body:
      'Now look at the corner. The L wraps around two sides but leaves a square hole, b/2 by b/2. ' +
      'That hole is the only thing between you and a perfect square — so ADD it. To BOTH sides, ' +
      'because that is the rule for equations. The left side is now genuinely a square, (x + p)², ' +
      'and the right side is a plain number we will call q.',
    q: 'The corner hole is b/2 wide and b/2 tall. What area must you add to BOTH sides?',
    choices: ['(b/2)²', 'b/2', 'b²'],
    answer: 0,
    feedback:
      'The area of the hole, (b/2)². With b = 4 the hole is 2 by 2, so you add 4 to both sides: ' +
      'x² + 4x = 5 becomes x² + 4x + 4 = 9, and the left side collapses into the single square ' +
      '(x + 2)². The right side is 9. This is COMPLETING THE SQUARE — the name is completely ' +
      'literal, and the paper is showing you why.',
  },
  {
    title: '± — a square has two square roots',
    body:
      'You now have (x + p)² = q. The square you built has AREA q, so its SIDE is √q. But here is ' +
      'the step almost everyone shortens: x + p need not be the POSITIVE √q. Both +√q and −√q ' +
      'square to q. So there are two answers — and that is exactly where the ± comes from.',
    q: '(x + 2)² = 9. Which is the complete answer?',
    choices: [
      'x + 2 = 3 or x + 2 = −3, giving x = 1 or x = −5',
      'x + 2 = 3, giving x = 1',
      'x = 9 − 2 = 7',
    ],
    answer: 0,
    feedback:
      'Both branches. 3² = 9 and (−3)² = 9, so x + 2 = ±3, giving x = −2 ± 3 → x = 1 or x = −5. ' +
      'Keeping only the positive root throws away half the answer — the single most common slip ' +
      'in this topic. The square on the paper can only ever show you the positive root, because a ' +
      'side length cannot be negative. The algebra is not so limited, and keeps both.',
  },
  {
    title: 'When q comes out negative',
    body:
      'Push c up until the picture breaks. When q turns NEGATIVE, read what the paper is telling ' +
      'you: you have asked for a square whose area is negative. There is no such square. Try ' +
      'b = 2 and c = 5 (leave a = 1) and watch the square refuse to be drawn.',
    q: 'If completing the square gives (x + p)² = q with q < 0, how many REAL solutions are there?',
    choices: ['None — no real number squares to a negative', 'One', 'Two'],
    answer: 0,
    feedback:
      'None. Squaring any real number gives something ≥ 0, so (x + p)² = q is impossible when ' +
      'q < 0 — the picture refuses to be drawn, and it is right to refuse. (Complex numbers were ' +
      'invented to answer exactly this; in Algebra 1 the honest answer is "no real solutions".) ' +
      'Note q and the discriminant Δ = b² − 4ac always share a sign, because q = Δ/(4a²) and ' +
      '4a² > 0. That is the same Δ the Quadratic Polynomial lab uses to count crossings.',
  },
  {
    title: 'a — divide first, and the formula falls out',
    body:
      'The a dial is live. Everything so far assumed the x² term stood alone. If it does not, ' +
      'divide EVERY term by a first — then p = b/(2a), and the same three moves run unchanged. ' +
      'Now run those moves with letters instead of numbers and watch what drops out at the bottom.',
    q: 'Completing the square on a·x² + b·x + c = 0 in general gives which formula?',
    choices: [
      'x = (−b ± √(b² − 4ac)) / (2a)',
      'x = −b / (2a)',
      'x = (−b ± √(b² + 4ac)) / (2a)',
    ],
    answer: 0,
    feedback:
      'x = (−b ± √(b² − 4ac))/(2a) — the quadratic formula. It is not an incantation to memorise: ' +
      'it is precisely the cut, the swing and the corner you just did, performed once with letters ' +
      'so that nobody ever has to do it again. The ± is the two square roots of your completed ' +
      'square, and b² − 4ac under the root is just 4a²·q — which is why its sign decides whether ' +
      'the square exists at all.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Run the method backwards. You are given the two solutions; build an equation that has them. ' +
      'Tune a, b, c until your equation\'s solutions are exactly the targets and the meter stamps ' +
      'SOLVED. Start with a = 1 — then b is minus the sum of the two solutions, and c is their ' +
      'product. Scaling a, b and c together keeps the very same solutions, so more than one ' +
      'equation earns the stamp whenever the dials reach that far. Press "New target" for a fresh pair.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels. Exact integer / rational arithmetic.
   ------------------------------------------------------------------------- */
const MINUS = '−';
const PM = '±';

function gcd(x, y) {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}
/* Format an exact fraction n/d, fully reduced, with a typographic minus. */
function fmtFrac(n, d) {
  if (d === 0) return '—';
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (d === 1) return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
  return `${n < 0 ? MINUS : ''}${Math.abs(n)}/${d}`;
}

function trim(v, places = 3) {
  const m = Math.pow(10, places);
  const n = Math.round(v * m) / m;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}

/* A signed term for an equation line, e.g. " + 4x", " − 5/2x", "" when zero.
   `d` is the denominator (always > 0 here); `suffix` is the variable part. */
function signedTerm(n, d, suffix) {
  if (n === 0) return '';
  const sign = n / d > 0 ? ` + ` : ` ${MINUS} `;
  let mag = fmtFrac(Math.abs(n), Math.abs(d));
  if (suffix && mag === '1') mag = '';
  return `${sign}${mag}${suffix}`;
}

/* A leading coefficient, e.g. "" for 1, "−" for −1, "3" otherwise. */
function leadStr(n, d) {
  const v = n / d;
  if (v === 1) return '';
  if (v === -1) return MINUS;
  return fmtFrac(n, d);
}

/* Is `n` a perfect square? (n ≥ 0). Exact — no float comparison. */
function perfectSqrt(n) {
  if (n < 0) return null;
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? r : null;
}

/* The whole analysis of a·x² + b·x + c = 0, exact wherever the numbers allow.
   a is always an integer ≥ 1, so 2a > 0 and root ordering is unambiguous. */
function analyze(a, b, c) {
  const delta = b * b - 4 * a * c; // exact integer
  const sInt = perfectSqrt(delta); // integer √Δ, or null
  const exact = sInt !== null; // roots are rational iff Δ is a perfect square
  const s = Math.sqrt(Math.max(delta, 0));

  const out = {
    a,
    b,
    c,
    delta,
    exact,
    sInt,
    /* p = b/(2a) — the shift, i.e. half the monic x-coefficient */
    pNum: b,
    pDen: 2 * a,
    pF: b / (2 * a),
    pStr: fmtFrac(b, 2 * a),
    /* q = Δ/(4a²) — the completed square's area. Same sign as Δ. */
    qNum: delta,
    qDen: 4 * a * a,
    qF: delta / (4 * a * a),
    qStr: fmtFrac(delta, 4 * a * a),
    /* the monic reduction x² + Bx + C = 0 */
    bOverA: fmtFrac(b, a),
    cOverA: fmtFrac(c, a),
  };

  /* √q = √Δ/(2a) */
  out.sqrtQF = s / (2 * a);
  out.sqrtQStr = exact ? fmtFrac(sInt, 2 * a) : `${trim(s / (2 * a), 3)}`;

  if (delta > 0) {
    out.rootCount = 2;
    const r1 = (-b - s) / (2 * a);
    const r2 = (-b + s) / (2 * a);
    out.rootsF = [r1, r2]; // r1 < r2 because a > 0
    out.rootsStr = exact
      ? [fmtFrac(-b - sInt, 2 * a), fmtFrac(-b + sInt, 2 * a)]
      : [trim(r1), trim(r2)];
  } else if (delta === 0) {
    out.rootCount = 1;
    out.rootsF = [-b / (2 * a)];
    out.rootsStr = [fmtFrac(-b, 2 * a)];
  } else {
    out.rootCount = 0;
    out.rootsF = [];
    out.rootsStr = [];
  }

  /* x₊ — the root the picture is drawn at (the larger one when there are two) */
  out.xPlus = delta >= 0 ? (-b + s) / (2 * a) : NaN;

  /* EXACT drawability condition (proved in the audit to be ⟺ xPlus ≥ 0):
       b ≤ 0  → x₊ = (|b| + √Δ)/(2a) ≥ 0 always
       b > 0  → x₊ ≥ 0 ⟺ √Δ ≥ b ⟺ Δ ≥ b² ⟺ −4ac ≥ 0 ⟺ c ≤ 0            */
  out.canTile = delta > 0 && (b <= 0 || c <= 0);

  /* Which of the four honest pictures the stage shows. */
  out.mode =
    delta < 0 ? 'void' : delta === 0 ? 'point' : out.canTile ? 'tiles' : 'nosquare';

  /* 'add' — b ≥ 0, strips laid beside the square.
     'sub' — b < 0, strips taken away from inside it. */
  out.tileMode = b >= 0 ? 'add' : 'sub';
  return out;
}

/* The bounding box of the construction, in area-units, with (0,0) at the
   completed square's top-left corner.

   `phase` 0 = the uncut layout, 1 = the cut layout, omitted = the UNION.
   The renderer takes its ZOOM from the union (so the scale never jumps
   mid-swing — that would wreck the one gesture the method is named for) but
   PANS its centre from phase 0 to phase 1 as the strip travels, so neither
   layout is left stranded in a corner of the paper. */
function figureBox(J, phase) {
  /* the void and nosquare boxes reserve room BELOW the figure for their
     explanatory note, so it cannot ride down onto the stage's hint pill */
  if (J.mode === 'void') return { u0: 0, v0: 0, u1: 3.4, v1: 4.5 };
  if (J.mode === 'point') return { u0: -1.6, v0: -1.6, u1: 1.6, v1: 1.6 };
  const s = J.sqrtQF;
  const x = J.xPlus;
  const P = Math.abs(J.pF);
  if (J.mode === 'nosquare') return { u0: 0, v0: 0, u1: s, v1: s + 1.15 };
  if (J.tileMode === 'add') {
    /* uncut: x² plus the whole b·x strip lying beside it, x tall.
       cut:   the completed square, side x + p. */
    if (phase === 0) return { u0: 0, v0: 0, u1: x + 2 * P, v1: x };
    if (phase === 1) return { u0: 0, v0: 0, u1: x + P, v1: x + P };
    return { u0: 0, v0: 0, u1: x + 2 * P, v1: Math.max(x, x + P) };
  }
  /* sub: everything happens inside (or left of) the x² square */
  if (phase === 1) return { u0: 0, v0: 0, u1: x, v1: x };
  return { u0: Math.min(0, x - 2 * P), v0: 0, u1: x, v1: x };
}

/* ---------------------------------------------------------------------------
   The SOLUTION LADDER — the method, written out live from a, b, c. This is
   the worked solve a student would put on paper, and it is generated from the
   same exact arithmetic the picture is drawn from, so the two can never
   disagree. Rows are dropped when they would be no-ops (a = 1 needs no
   division; b = 0 needs no completing).
   ------------------------------------------------------------------------- */
function ladder(I) {
  const { a, b, c } = I;
  const rows = [];
  const push = (eq, why, key) => rows.push({ eq, why, key });

  /* 1 — the equation as given */
  push(
    `${leadStr(a, 1)}x²${signedTerm(b, 1, 'x')}${signedTerm(c, 1, '')} = 0`,
    'the equation',
    'given'
  );

  /* 2 — divide through by a (only when a ≠ 1) */
  if (a !== 1) {
    push(
      `x²${signedTerm(b, a, 'x')}${signedTerm(c, a, '')} = 0`,
      `divide every term by ${a}`,
      'monic'
    );
  }

  /* 3 — move the constant across */
  push(`x²${signedTerm(b, a, 'x')} = ${fmtFrac(-c, a)}`, 'move the constant across', 'move');

  /* 4 — add p² to both sides (the corner). Skipped when b = 0: there is no
         strip to cut, so the square is already complete. */
  const p2 = fmtFrac(b * b, 4 * a * a);
  if (b !== 0) {
    push(
      `x²${signedTerm(b, a, 'x')} + ${p2} = ${fmtFrac(-c, a)} + ${p2}`,
      `add p² = (b/2a)² = ${p2} to BOTH sides`,
      'complete'
    );
  }

  /* 5 — the left side is now a square. The bracket is only needed while it is
         being squared; once the root is taken it would just be noise. */
  const bare = b === 0 ? 'x' : `x${signedTerm(b, 2 * a, '')}`;
  const inner = b === 0 ? 'x' : `(${bare})`;
  push(`${inner}² = ${I.qStr}`, 'the left side is a square now', 'square');

  /* 6 — take the square root of both sides: the ± is born here */
  if (I.delta < 0) {
    push(
      `${bare} = ${PM}√(${I.qStr})`,
      'no real number squares to a negative — STOP',
      'stop'
    );
    return rows;
  }
  push(
    `${bare} = ${I.delta === 0 ? '0' : `${PM}${I.sqrtQStr}`}`,
    I.delta === 0
      ? 'the square has area 0 — only one root'
      : 'take the square root — a square has TWO',
    'root'
  );

  /* 7 — undo the shift */
  if (b !== 0) {
    push(
      `x = ${fmtFrac(-b, 2 * a)}${I.delta === 0 ? '' : ` ${PM} ${I.sqrtQStr}`}`,
      `subtract p = ${I.pStr} from both sides`,
      'unshift'
    );
  }

  /* 8 — the answer */
  push(
    I.rootCount === 2
      ? `x = ${I.rootsStr[0]}   or   x = ${I.rootsStr[1]}${I.exact ? '' : '   (≈)'}`
      : `x = ${I.rootsStr[0]}   (a double root)`,
    'the solutions',
    'answer'
  );
  return rows;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. This model has no "mystery curve" to match, so the
   capstone is the skill's sanctioned alternative: a CONSTRUCTION GOAL, and
   the natural one here is the method run BACKWARDS. The student is given the
   two solutions and must build an equation that has them.

   The stamp is gated on an EXACT INTEGER IDENTITY, not a tolerance:
       a·(x − t₁)(x − t₂) ≡ a·x² + b·x + c   ⟺   b = −a(t₁+t₂)  and  c = a·t₁·t₂
   so a false SOLVED is impossible by construction. Any a works, which is
   true and worth the student noticing (the meter accepts all four).
   The percentage is a display-only distance readout.
   ------------------------------------------------------------------------- */
function isSolved(a, b, c, t) {
  if (!t) return false;
  return b === -a * (t.t1 + t.t2) && c === a * t.t1 * t.t2;
}

/* Distance from the student's root set to the target's, for the meter only. */
function rootError(I, t) {
  if (!t) return 99;
  if (I.rootCount !== 2) {
    // a double root or none is never the answer here (targets are distinct)
    if (I.rootCount === 1) return Math.abs(I.rootsF[0] - t.t1) + Math.abs(I.rootsF[0] - t.t2);
    return 99;
  }
  return Math.abs(I.rootsF[0] - t.t1) + Math.abs(I.rootsF[1] - t.t2);
}
const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + err / 0.8)));

/* Targets: two DISTINCT integer roots, reachable at a = 1 (and therefore
   guaranteed reachable at all), never trivial, never a repeat. */
function makeTarget(prev) {
  let t;
  let guard = 0;
  do {
    const t1 = Math.floor(Math.random() * 9) - 4; // −4 … 4
    const t2 = Math.floor(Math.random() * 9) - 4;
    t = { t1: Math.min(t1, t2), t2: Math.max(t1, t2) };
  } while (
    ++guard < 500 &&
    (t.t1 === t.t2 || // distinct, so the ± is genuinely in play
      Math.abs(t.t1 + t.t2) > 6 || // b = −(t₁+t₂) must fit the dial
      Math.abs(t.t1 * t.t2) > 12 || // c = t₁·t₂ must fit the dial
      (t.t1 === 0 && t.t2 === 0) ||
      (prev && t.t1 === prev.t1 && t.t2 === prev.t2))
  );
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display. Deliberately styled-jsx-free (plain spans + sup,
   no scoped class names) so it renders identically in a real Next.js build and
   in the bare-React Babel verify harness.
   ------------------------------------------------------------------------- */
function EquationHead({ a, b, c }) {
  const aCoef = a === 1 ? '' : String(a);
  return (
    <span>
      {aCoef}x<sup>2</sup>
      {b === 0 ? null : (
        <>
          &nbsp;{b > 0 ? '+' : MINUS}&nbsp;{Math.abs(b) === 1 ? '' : Math.abs(b)}x
        </>
      )}
      {c === 0 ? null : (
        <>
          &nbsp;{c > 0 ? '+' : MINUS}&nbsp;{Math.abs(c)}
        </>
      )}
      &nbsp;=&nbsp;0
    </span>
  );
}

/* Palette (kept in one place so the canvas and the CSS cannot drift apart).
   ONE ACCENT DISCIPLINE: carmine is the UNKNOWN — the x² square, the completed
   square, the equation, the answers. Cool slate-blue is everything KNOWN — the
   b/2 strips and the corner. Green is the verified/solved state. The corner is
   distinguished from the strips by SHAPE (dashed hole → filled) and by its
   countable grid, never by a second accent colour. */
const CURVE = '#c81e4f';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const KNOWN_FILL = 'rgba(126,164,192,0.34)';
const KNOWN_LINE = 'rgba(64,106,138,0.95)';
const PAPER = '#fbfbf8';

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function QuadraticEquationLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [c, setC] = useState(START.c);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);
  const [replay, setReplay] = useState(0);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const swingRef = useRef(0); // animation progress, 0 = uncut → 1 = swung home
  const animRef = useRef(false); // is a swing actually in flight right now?
  const sceneRef = useRef({});

  const current = STEPS[step];
  const I = analyze(a, b, c);
  const rows = ladder(I);

  const cut = step >= 3; // the strip is cut and swung from step 3 on
  const filled = step >= 4; // the corner is filled from step 4 on

  sceneRef.current = { a, b, c, cut, filled };

  const err = target ? rootError(I, target) : 99;
  const pct = target ? matchPercent(err) : 0;
  const solved = isSolved(a, b, c, target);

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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const J = analyze(S.a, S.b, S.c);
    /* THE SETTLED PICTURE IS DERIVED FROM STATE, NEVER FROM THE ANIMATION.
       The swing is decoration: it only overrides t while it is genuinely in
       flight. If rAF is throttled (a background tab, a low-power machine, a
       student clicking Next faster than the 950ms sweep) the strip still lands
       exactly where the mathematics says it must — you lose the motion, never
       the truth. Caching the settled state in the animation is how a view
       drifts from its model. */
    const t = S.cut ? (animRef.current ? swingRef.current : 1) : 0;

    /* --- fit the construction to the paper -------------------------------
       The zoom is chosen per state so the figure always fills the stage. A
       fixed scale left small equations stranded in one corner. Crucially the
       GRID IS ALWAYS EXACTLY ONE UNIT, so every area on the paper stays
       countable — only the zoom changes, never what a cell means. */
    const box = figureBox(J); // the union — fixes the zoom
    const spanU = Math.max(box.u1 - box.u0, box.v1 - box.v0, MIN_SPAN);
    const U = (Math.min(W, H) * FIT) / spanU; // pixels per area-unit
    /* pan the centre with the swing, so both layouts sit squarely on the paper */
    const bU = figureBox(J, 0);
    const bC = figureBox(J, 1);
    const pan = S.cut ? t : 0;
    const mid = (r, k) => (r[k + '0'] + r[k + '1']) / 2;
    const cU = mid(bU, 'u') + (mid(bC, 'u') - mid(bU, 'u')) * pan;
    const cV = mid(bU, 'v') + (mid(bC, 'v') - mid(bU, 'v')) * pan;
    const gx = (u) => W / 2 + (u - cU) * U;
    const gy = (v) => H / 2 + (v - cV) * U;

    /* --- quadrille paper, one cell = one unit of area -------------------- */
    const uMin = Math.floor(cU - W / 2 / U) - 1;
    const uMax = Math.ceil(cU + W / 2 / U) + 1;
    const vMin = Math.floor(cV - H / 2 / U) - 1;
    const vMax = Math.ceil(cV + H / 2 / U) + 1;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.9)';
    ctx.beginPath();
    for (let k = uMin; k <= uMax; k++) {
      const X = Math.round(gx(k)) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    for (let k = vMin; k <= vMax; k++) {
      const Y = Math.round(gy(k)) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    /* --- helpers ---------------------------------------------------------- */
    const label = (text, X, Y, align, baseline, color, size) => {
      ctx.save();
      ctx.font = `${size || 12}px ui-monospace, "SF Mono", Menlo, monospace`;
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      const tw = ctx.measureText(text).width;
      let bx = X;
      if (align === 'center') bx = X - tw / 2;
      else if (align === 'right') bx = X - tw;
      let by = Y;
      if (baseline === 'middle') by = Y - (size || 12) * 0.7;
      else if (baseline === 'bottom') by = Y - (size || 12) * 1.4;
      ctx.fillStyle = 'rgba(251,251,248,0.86)';
      ctx.fillRect(bx - 4, by - 2, tw + 8, (size || 12) * 1.5);
      ctx.fillStyle = color || INK;
      ctx.fillText(text, X, Y);
      ctx.restore();
    };

    /* diagonal hatching, clipped to a rect — marks area that is REMOVED.
       `dir` −1 draws the opposite diagonal, which is how the corner is marked
       as having been taken TWICE without burying it under a third fill. */
    const hatch = (X, Y, w, h, color, dir) => {
      if (w <= 0 || h <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(X, Y, w, h);
      ctx.clip();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      const span = w + h;
      for (let d = -h; d < span; d += 9) {
        if (dir === -1) {
          ctx.moveTo(X + d, Y + h);
          ctx.lineTo(X + d + h, Y);
        } else {
          ctx.moveTo(X + d, Y);
          ctx.lineTo(X + d + h, Y + h);
        }
      }
      ctx.stroke();
      ctx.restore();
    };
    const REMOVED = 'rgba(64,106,138,0.38)';

    /* unit gridlines INSIDE a shape — this is what makes an area countable */
    const countable = (X, Y, w, h) => {
      if (w <= 0 || h <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(X, Y, w, h);
      ctx.clip();
      ctx.strokeStyle = 'rgba(64,106,138,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k * U < w + U; k++) {
        const px = Math.round(X + k * U) + 0.5;
        ctx.moveTo(px, Y);
        ctx.lineTo(px, Y + h);
      }
      for (let k = 0; k * U < h + U; k++) {
        const py = Math.round(Y + k * U) + 0.5;
        ctx.moveTo(X, py);
        ctx.lineTo(X + w, py);
      }
      ctx.stroke();
      ctx.restore();
    };

    /* a strip mid-swing: a w0×h0 rect whose centre lerps c0→c1 while it
       rotates 0→−90°, which is exactly what "cut it off and swing it round"
       does to a piece of paper. */
    const swung = (tt, c0, c1, w0, h0, fill, stroke, removed) => {
      const cx = c0.x + (c1.x - c0.x) * tt;
      const cy = c0.y + (c1.y - c0.y) * tt;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((-Math.PI / 2) * tt);
      ctx.fillStyle = fill;
      ctx.fillRect(-w0 / 2, -h0 / 2, w0, h0);
      if (removed) hatch(-w0 / 2, -h0 / 2, w0, h0, REMOVED);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(-w0 / 2, -h0 / 2, w0, h0);
      ctx.restore();
    };

    /* ---------------------------------------------------------------------
       MODE 'void' — Δ < 0. There is no square. Say so, and show why.
       ------------------------------------------------------------------- */
    if (J.mode === 'void') {
      const sw = 3.4 * U;
      const X = gx(0);
      const Y = gy(0);
      ctx.save();
      ctx.setLineDash([7, 6]);
      ctx.strokeStyle = 'rgba(91,107,123,0.85)';
      ctx.lineWidth = 2;
      ctx.strokeRect(X, Y, sw, sw);
      ctx.restore();
      hatch(X, Y, sw, sw, 'rgba(91,107,123,0.4)');
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X, Y);
      ctx.lineTo(X + sw, Y + sw);
      ctx.moveTo(X + sw, Y);
      ctx.lineTo(X, Y + sw);
      ctx.stroke();
      ctx.restore();
      label(`area q = ${J.qStr}`, X + sw / 2, Y + sw / 2, 'center', 'middle', INK, 14);
      label(
        'no square has a negative area',
        X + sw / 2,
        Y + sw + 14,
        'center',
        'top',
        INK_SOFT,
        12
      );
      label('→ no real solution', X + sw / 2, Y + sw + 34, 'center', 'top', CURVE, 13);
      return;
    }

    /* ---------------------------------------------------------------------
       MODE 'point' — Δ = 0. The square has shrunk to nothing: one double root.
       ------------------------------------------------------------------- */
    if (J.mode === 'point') {
      ctx.save();
      ctx.fillStyle = CURVE;
      ctx.beginPath();
      ctx.arc(gx(0), gy(0), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      label('q = 0 — the square has shrunk to a point', gx(0) + 12, gy(0) - 2, 'left', 'top', INK, 13);
      label(
        `so x + p = 0, and x = ${J.rootsStr[0]} is the only solution`,
        gx(0) + 12,
        gy(0) + 20,
        'left',
        'top',
        CURVE,
        12
      );
      return;
    }

    /* ---------------------------------------------------------------------
       Δ > 0 — there IS a square, of side √q. Draw it in both remaining modes.
       ------------------------------------------------------------------- */
    const s = J.sqrtQF; // side of the completed square
    const x = J.xPlus; // the root the picture is drawn at
    const P = Math.abs(J.pF); // |p| = |b|/(2a)

    /* ---------------------------------------------------------------------
       MODE 'nosquare' — Δ > 0 but both roots are negative (b > 0 and c > 0).
       The completed square is a perfectly good square; it simply cannot be
       cut up into a POSITIVE x² plus strips. Draw the square, refuse the
       tiles, and say exactly why.
       ------------------------------------------------------------------- */
    if (J.mode === 'nosquare') {
      ctx.save();
      ctx.fillStyle = 'rgba(200,30,79,0.07)';
      ctx.fillRect(gx(0), gy(0), s * U, s * U);
      ctx.restore();
      countable(gx(0), gy(0), s * U, s * U);
      ctx.save();
      ctx.strokeStyle = CURVE;
      ctx.lineWidth = 3;
      ctx.strokeRect(gx(0), gy(0), s * U, s * U);
      ctx.restore();
      label(`area = q = ${J.qStr}`, gx(s / 2), gy(s / 2), 'center', 'middle', INK, 13);
      label(`side = √q = ${J.sqrtQStr}`, gx(0), gy(0) - 8, 'left', 'bottom', CURVE, 12);
      /* The stage's hint pill already reports WHY the tiles are absent, so
         this says only what the pill cannot: that the method still works. */
      label('a side length cannot be negative,', gx(0), gy(s) + 16, 'left', 'top', INK_SOFT, 12);
      label('so the tiles stay off — the algebra finds', gx(0), gy(s) + 34, 'left', 'top', INK_SOFT, 12);
      label('both solutions regardless.', gx(0), gy(s) + 52, 'left', 'top', CURVE, 12);
      return;
    }

    /* ---------------------------------------------------------------------
       MODE 'tiles' — the full construction, true to scale at x = x₊.
       ------------------------------------------------------------------- */
    const addMode = J.tileMode === 'add';

    /* geometry of the four pieces, in units, with (0,0) = the completed
       square's top-left corner:
         add (b ≥ 0): x² fills [0,x]², strips lie beside it, corner at (x,x).
         sub (b < 0): x² fills [0,x]² and OVERHANGS the completed square;
                      the strips are removed from its right and bottom edges,
                      and they overlap in the corner — removed twice. */
    const xSq = addMode ? { u: 0, v: 0, w: x, h: x } : { u: 0, v: 0, w: x, h: x };
    const stripA = addMode
      ? { u: x, v: 0, w: P, h: x } // stays on the right
      : { u: x - P, v: 0, w: P, h: x };
    const cornerU = addMode ? x : x - P;
    const corner = { u: cornerU, v: cornerU, w: P, h: P };

    /* strip B: where it starts (uncut) and where it lands (swung) */
    const bFrom = addMode
      ? { x: gx(x + 1.5 * P), y: gy(x / 2) }
      : { x: gx(x - 1.5 * P), y: gy(x / 2) };
    const bTo = addMode
      ? { x: gx(x / 2), y: gy(x + P / 2) }
      : { x: gx(x / 2), y: gy(x - P / 2) };

    /* --- the x² square: the one carmine object, the UNKNOWN --------------- */
    ctx.save();
    ctx.fillStyle = 'rgba(200,30,79,0.13)';
    ctx.fillRect(gx(xSq.u), gy(xSq.v), xSq.w * U, xSq.h * U);
    ctx.strokeStyle = CURVE;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(gx(xSq.u), gy(xSq.v), xSq.w * U, xSq.h * U);
    ctx.restore();
    /* When b < 0 the strips and the corner cover EVERY part of the x² square
       except the completed square itself, so an "x²" label placed inside would
       always sit under hatching. Hang it off the left edge instead. */
    if (addMode) {
      if (x * U > 30) label('x²', gx(x / 2), gy(x / 2), 'center', 'middle', CURVE, 14);
    } else if (x * U > 30) {
      label('x²', gx(0) - 10, gy(x / 2), 'right', 'middle', CURVE, 14);
    }

    /* --- the two b/2 strips (or, when b < 0, the two removals) ------------ */
    if (P > 0.001) {
      /* strip A — the half that never moves */
      ctx.save();
      ctx.fillStyle = KNOWN_FILL;
      ctx.fillRect(gx(stripA.u), gy(stripA.v), stripA.w * U, stripA.h * U);
      if (!addMode) hatch(gx(stripA.u), gy(stripA.v), stripA.w * U, stripA.h * U, REMOVED);
      ctx.strokeStyle = KNOWN_LINE;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(gx(stripA.u), gy(stripA.v), stripA.w * U, stripA.h * U);
      ctx.restore();

      /* strip B — cut off and swung round (t: 0 → 1) */
      if (S.cut) {
        swung(t, bFrom, bTo, P * U, x * U, KNOWN_FILL, KNOWN_LINE, !addMode);
      } else {
        /* uncut: the whole b·x strip, 2·(b/2) = b wide, in one piece */
        const wu = addMode ? x : x - 2 * P;
        ctx.save();
        ctx.fillStyle = KNOWN_FILL;
        ctx.fillRect(gx(wu), gy(0), 2 * P * U, x * U);
        if (!addMode) hatch(gx(wu), gy(0), 2 * P * U, x * U, REMOVED);
        ctx.strokeStyle = KNOWN_LINE;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(gx(wu), gy(0), 2 * P * U, x * U);
        ctx.restore();
        if (x > 0.7 && P > 0.35) {
          /* the strip is the MONIC middle term: 2·|p| = |b|/a wide, x tall */
          const bMag = fmtFrac(Math.abs(S.b), S.a);
          label(
            `${addMode ? '' : MINUS}${bMag === '1' ? '' : bMag}x`,
            gx(wu + P),
            gy(x / 2),
            'center',
            'middle',
            KNOWN_LINE,
            13
          );
        }
      }

      /* Piece labels, once the strips have settled.
         Each label is anchored in the part of its strip that is NOT shared
         with the corner — otherwise, whenever |p| grows large next to x (say
         x² − 5x, where the strips overlap almost everything), both strip
         labels and the corner label land on the same spot and pile up. */
      const freeExt = addMode ? x : x - P; // the strip's non-corner extent
      if (S.cut && t > 0.85 && freeExt * U > 24 && P * U > 26) {
        const pMag = fmtFrac(Math.abs(S.b), 2 * S.a); // |p|; the sign is spoken
        const pl = `${addMode ? '' : MINUS}${pMag === '1' ? '' : pMag}x`;
        label(pl, gx(stripA.u + P / 2), gy(freeExt / 2), 'center', 'middle', KNOWN_LINE, 12);
        label(pl, gx(freeExt / 2), gy(cornerU + P / 2), 'center', 'middle', KNOWN_LINE, 12);
      }
    }

    /* --- THE CORNER: the missing piece, then the filled one --------------- */
    if (P > 0.001 && S.cut) {
      const cX = gx(corner.u);
      const cY = gy(corner.v);
      const cW = corner.w * U;
      if (S.filled) {
        if (addMode) {
          ctx.save();
          ctx.fillStyle = KNOWN_FILL;
          ctx.fillRect(cX, cY, cW, cW);
          ctx.restore();
          countable(cX, cY, cW, cW); // the piece you ADD — count it
        } else {
          /* When b < 0 the corner lies under BOTH removed strips, so it has
             already been taken twice. Another fill on top would just make mud;
             instead let the strips' own hatching show through and mark it with
             the OPPOSITE diagonal — the cross-hatch IS the "twice". */
          hatch(cX, cY, cW, cW, 'rgba(64,106,138,0.5)', -1);
        }
        ctx.save();
        ctx.strokeStyle = KNOWN_LINE;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(cX, cY, cW, cW);
        ctx.restore();
      } else {
        /* the hole — dashed, empty, and unmistakably missing */
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = CURVE;
        ctx.lineWidth = 2;
        ctx.strokeRect(cX, cY, cW, cW);
        ctx.restore();
      }
      if (cW > 26)
        label(
          S.filled ? fmtFrac(S.b * S.b, 4 * S.a * S.a) : '?',
          cX + cW / 2,
          cY + cW / 2,
          'center',
          'middle',
          S.filled ? KNOWN_LINE : CURVE,
          13
        );
      if (!addMode && S.filled && cW > 26)
        label('taken twice', cX + cW / 2, cY + cW / 2 + 17, 'center', 'top', INK_SOFT, 10);
    }

    /* --- the completed square: the whole point --------------------------- */
    if (S.filled) {
      ctx.save();
      ctx.strokeStyle = CURVE;
      ctx.lineWidth = 3;
      ctx.strokeRect(gx(0), gy(0), s * U, s * U);
      ctx.restore();
      label(`(x ${S.b >= 0 ? '+' : MINUS} ${fmtFrac(Math.abs(S.b), 2 * S.a)})² = ${J.qStr}`,
        gx(0), gy(0) - 8, 'left', 'bottom', CURVE, 13);
      /* The side is what the square root will read off. In ADD mode the
         completed square is the whole figure, so the dimension sits neatly
         under it. In SUB mode it is a small square buried at the top-left, and
         a bracket under it would slice straight through the strips — there the
         top tick already spans exactly this side, and names it. */
      if (addMode) {
        ctx.save();
        ctx.strokeStyle = 'rgba(200,30,79,0.75)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(gx(0), gy(s) + 10);
        ctx.lineTo(gx(s), gy(s) + 10);
        ctx.stroke();
        ctx.restore();
        label(`side = √q = ${J.sqrtQStr}`, gx(s / 2), gy(s) + 14, 'center', 'top', CURVE, 12);
      }
    }

    /* --- the x and p tick marks along the top edge ------------------------ */
    if (x > 0.4) {
      /* clear of the (x + p)² = q label, which sits just above the square */
      const yTick = gy(0) - 46;
      const mark = (u0, u1, text) => {
        if (u1 - u0 < 0.25) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(28,43,58,0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(gx(u0), yTick - 4);
        ctx.lineTo(gx(u0), yTick + 4);
        ctx.moveTo(gx(u1), yTick - 4);
        ctx.lineTo(gx(u1), yTick + 4);
        ctx.moveTo(gx(u0), yTick);
        ctx.lineTo(gx(u1), yTick);
        ctx.stroke();
        ctx.restore();
        label(text, gx((u0 + u1) / 2), yTick, 'center', 'middle', INK_SOFT, 11);
      };
      const pMag = fmtFrac(Math.abs(S.b), 2 * S.a);
      if (addMode) {
        mark(0, x, 'x');
        if (S.cut) mark(x, x + P, J.pStr);
      } else {
        /* this tick spans exactly the completed square's side, so once the
           square exists, name it — it is where the square root comes from */
        mark(0, x - P, S.filled ? `√q = ${J.sqrtQStr}` : `x ${MINUS} ${pMag}`);
        mark(x - P, x, pMag);
      }
    }
  }, []);

  /* redraw whenever anything the picture depends on changes */
  useEffect(() => {
    draw();
  }, [a, b, c, step, draw]);

  /* redraw on resize — the canvas is fluid */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* The cut & swing. Opt-in per change (it fires when the lesson reaches the
     step, and on demand from the button) — never ambient — and it snaps for
     anyone who has asked for reduced motion. */
  useEffect(() => {
    if (!cut) {
      animRef.current = false;
      swingRef.current = 0;
      draw();
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      animRef.current = false; // settled instantly, no motion
      draw();
      return;
    }
    let raf;
    let t0 = null;
    const DUR = 950;
    animRef.current = true;
    swingRef.current = 0;
    const loop = (now) => {
      if (t0 == null) t0 = now;
      const u = Math.min(1, (now - t0) / DUR);
      swingRef.current = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; // easeInOut
      draw();
      if (u < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    /* THE SETTLE IS ON A TIMER, NOT ON rAF. requestAnimationFrame is not
       guaranteed to fire — browsers throttle or drop it in background tabs,
       under low-power mode, and in automated contexts. If the settled picture
       waited on the sweep's last frame, a dropped rAF would strand the strip
       at its starting position and the lab would draw a FALSE construction.
       So a plain timer hands authority back to the state regardless, and rAF
       only ever supplies the in-between frames. */
    const settle = setTimeout(() => {
      animRef.current = false;
      draw();
    }, DUR + 80);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      animRef.current = false; // torn down mid-sweep → the strip lands
    };
  }, [cut, replay, draw]);

  /* hand the calibration step a target the first time it is reached */
  useEffect(() => {
    if (current.calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'a') setA(v);
    else if (key === 'b') setB(v);
    else setC(v);
  };
  const resetDials = () => {
    setA(START.a);
    setB(START.b);
    setC(START.c);
  };
  const choose = (idx) => {
    if (answers[step] != null) return; // an answer, once given, stands
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* ---- derived display --------------------------------------------------- */
  const verdict =
    I.rootCount === 2
      ? 'two real solutions'
      : I.rootCount === 1
      ? 'one double solution'
      : 'no real solutions';

  const stateNote =
    I.mode === 'void'
      ? 'q < 0 — the square cannot be drawn'
      : I.mode === 'point'
      ? 'q = 0 — the square is a single point'
      : I.mode === 'nosquare'
      ? 'both solutions are negative — no positive x to build with'
      : 'drawn to scale at the positive solution';

  /* the check: substituting a root back must give exactly 0 */
  const checkStr = I.rootCount
    ? `${a === 1 ? '' : a}(${I.rootsStr[0]})² ${b >= 0 ? '+' : MINUS} ${Math.abs(b)}(${
        I.rootsStr[0]
      }) ${c >= 0 ? '+' : MINUS} ${Math.abs(c)} = 0`
    : '—';

  const spoken =
    `The equation ${a === 1 ? '' : a} x squared ${b >= 0 ? 'plus' : 'minus'} ${Math.abs(b)} x ${
      c >= 0 ? 'plus' : 'minus'
    } ${Math.abs(c)} equals zero. Completing the square gives x plus ${I.pStr}, all squared, ` +
    `equals ${I.qStr}. ` +
    (I.rootCount === 0
      ? 'That area is negative, so no square exists and there are no real solutions.'
      : I.rootCount === 1
      ? `That area is zero, so there is one solution, x equals ${I.rootsStr[0]}.`
      : `Taking both square roots gives x equals ${I.rootsStr[0]} or ${I.rootsStr[1]}.`);

  return (
    <div className="qelab">
      <header className="head">
        <h1>Solving the Quadratic Equation</h1>
        <p className="lede">
          Not a curve to explore — a question to answer.{' '}
          <span className="mono">a·x²&nbsp;+&nbsp;b·x&nbsp;+&nbsp;c&nbsp;=&nbsp;0</span> asks{' '}
          <em>which x make this true?</em> We answer it the way it has been answered for twelve
          hundred years: by cutting the <span className="mono">b·x</span> strip in half, swinging it
          round, and <em>completing the square</em> — until the quadratic formula falls out on its
          own.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <EquationHead a={a} b={b} c={c} />
            </p>
            <p className="equation-sub mono">
              (x {b >= 0 ? '+' : MINUS} {fmtFrac(Math.abs(b), 2 * a)})² = {I.qStr}
            </p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            <span className="hint mono">{stateNote}</span>
          </div>

          {/* verdict banner — what the square is telling you */}
          <div className={'verdict v-' + (I.rootCount === 2 ? 'two' : I.rootCount === 1 ? 'one' : 'none')}>
            <div className="verdict-eq mono">
              q = Δ / 4a² = <strong>{I.qStr}</strong>
            </div>
            <div className="verdict-tag">{verdict}</div>
          </div>

          {/* THE LADDER — the method, written out live */}
          <div className="ladder">
            <p className="ladder-title">The solve</p>
            {rows.map((r, i) => (
              <div className={'lrow' + (r.key === 'answer' ? ' final' : '') + (r.key === 'stop' ? ' stop' : '')} key={i}>
                <span className="leq mono">{r.eq}</span>
                <span className="lwhy">{r.why}</span>
              </div>
            ))}
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">p = b / 2a</span>
              <span className="fact-v mono">{I.pStr}</span>
            </div>
            <div className="fact">
              <span className="fact-k">The corner, p²</span>
              <span className="fact-v mono">{fmtFrac(b * b, 4 * a * a)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Discriminant Δ = b² − 4ac</span>
              <span className="fact-v mono">{I.delta}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Side of the square, √q</span>
              <span className="fact-v mono">
                {I.rootCount === 0 ? 'not a real number' : `${I.sqrtQStr}${I.exact ? '' : ' (≈)'}`}
              </span>
            </div>
            <div className="fact wide">
              <span className="fact-k">Solutions</span>
              <span className="fact-v mono">
                {I.rootCount === 0
                  ? 'none — the square would need a negative area'
                  : I.rootCount === 1
                  ? `x = ${I.rootsStr[0]} (double)`
                  : `x = ${I.rootsStr[0]}  or  x = ${I.rootsStr[1]}${I.exact ? '' : '  (≈)'}`}
              </span>
            </div>
            {I.rootCount > 0 && I.exact && (
              <div className="fact wide">
                <span className="fact-k">Check — substitute the first one back</span>
                <span className="fact-v mono ok">{checkStr} ✓</span>
              </div>
            )}
          </div>

          <div className="toolbar">
            <button
              type="button"
              className="btn ghost"
              onClick={() => setReplay((r) => r + 1)}
              disabled={!cut || b === 0}
            >
              Cut &amp; swing again
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

          {/* the derivation with letters — the payoff of the whole lab */}
          {step === 7 && (
            <div className="derive mono">
              <div>a·x² + b·x + c = 0</div>
              <div>x² + (b/a)x = {MINUS}c/a</div>
              <div>x² + (b/a)x + (b/2a)² = {MINUS}c/a + (b/2a)²</div>
              <div>(x + b/2a)² = (b² {MINUS} 4ac) / 4a²</div>
              <div>x + b/2a = {PM}√(b² {MINUS} 4ac) / 2a</div>
              <div className="derive-final">x = ({MINUS}b {PM} √(b² {MINUS} 4ac)) / 2a</div>
            </div>
          )}

          <div className="dials">
            {PARAMS.map((d) => {
              const unlocked = step >= d.unlock;
              const val = { a, b, c }[d.key];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.label}</span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={d.step}
                    value={val}
                    disabled={!unlocked}
                    aria-label={`Coefficient ${d.label} — ${d.role}`}
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
              <p className="goal">
                Build an equation whose solutions are{' '}
                <span className="mono goal-x">
                  x = {String(target.t1).replace('-', MINUS)}
                </span>{' '}
                and{' '}
                <span className="mono goal-x">
                  x = {String(target.t2).replace('-', MINUS)}
                </span>
                .
              </p>
              <p className="yours mono">
                yours:{' '}
                {I.rootCount === 2
                  ? `x = ${I.rootsStr[0]}, ${I.rootsStr[1]}`
                  : I.rootCount === 1
                  ? `x = ${I.rootsStr[0]} (double)`
                  : 'no real solutions'}
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: (solved ? 100 : Math.min(pct, 99)).toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{(solved ? 100 : Math.min(pct, 99)).toFixed(0)}%</span>
                {solved ? <span className="stamp">SOLVED</span> : null}
              </div>
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
                  resetDials();
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* polite live region: announces the win to screen readers */}
      <p className="sr-only" aria-live="polite">
        {current.calib && solved ? 'Solved. Your equation has exactly those solutions.' : ''}
      </p>

      <footer className="foot">
        <span className="mono">a·x² + b·x + c = 0</span> &nbsp;·&nbsp; solved by completing the
        square, drawn to scale at the equation&rsquo;s own solution on quadrille paper where one
        cell is one unit of area. Δ, p, q, the corner and every rational root above are computed
        with exact integer arithmetic — see{' '}
        <span className="mono">audit-quadraticequation.mjs</span>. CCSS A-REI.B.4a · A-REI.B.4b ·
        A-SSE.B.3b.
      </footer>

      <style jsx>{`
        .qelab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --quad: #c7d8e4;
          --known: #406a8a;
          --ok: #1f8a5b;
          --gold: #b7791f;
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
        }
        .equation {
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          color: var(--curve);
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }
        .equation sup {
          font-size: 0.7em;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
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
          background: rgba(251, 251, 248, 0.82);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .verdict {
          margin: 14px auto 2px;
          width: min(100%, 560px);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 9px 14px;
          border-radius: 9px;
          border: 1px solid rgba(28, 43, 58, 0.14);
          background: var(--paper);
          transition: border-color 0.15s, background 0.15s;
        }
        .verdict-eq {
          font-size: 14px;
          font-variant-numeric: tabular-nums;
        }
        .verdict-eq strong {
          font-size: 16px;
        }
        .verdict-tag {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 3px 9px;
          border-radius: 20px;
        }
        .v-two {
          border-color: rgba(200, 30, 79, 0.5);
          background: rgba(200, 30, 79, 0.06);
        }
        .v-two .verdict-tag {
          color: var(--curve);
          background: rgba(200, 30, 79, 0.12);
        }
        .v-one {
          border-color: rgba(183, 121, 31, 0.5);
          background: rgba(183, 121, 31, 0.07);
        }
        .v-one .verdict-tag {
          color: var(--gold);
          background: rgba(183, 121, 31, 0.14);
        }
        .v-none {
          border-color: rgba(91, 107, 123, 0.4);
          background: rgba(91, 107, 123, 0.07);
        }
        .v-none .verdict-tag {
          color: var(--ink-soft);
          background: rgba(91, 107, 123, 0.14);
        }
        .ladder {
          margin: 14px auto 2px;
          width: min(100%, 560px);
          border: 1px solid rgba(28, 43, 58, 0.1);
          border-radius: 9px;
          padding: 10px 12px;
          background: var(--paper);
        }
        .ladder-title {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0 0 8px;
        }
        .lrow {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 14px;
          padding: 3px 0;
        }
        .leq {
          font-size: 13.5px;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          overflow-x: auto;
        }
        .lwhy {
          font-size: 11px;
          color: var(--ink-soft);
          text-align: right;
          flex: 0 1 auto;
        }
        .lrow.final .leq {
          color: var(--curve);
          font-weight: 700;
          font-size: 14.5px;
        }
        .lrow.final {
          border-top: 1px solid rgba(28, 43, 58, 0.1);
          margin-top: 4px;
          padding-top: 7px;
        }
        .lrow.stop .leq {
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
          .lrow {
            flex-direction: column;
            gap: 0;
          }
          .lwhy {
            text-align: left;
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
          font-size: 13.5px;
          font-variant-numeric: tabular-nums;
        }
        .fact-v.ok {
          color: var(--ok);
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
        .derive {
          border-left: 3px solid var(--curve);
          background: rgba(200, 30, 79, 0.05);
          padding: 10px 12px;
          border-radius: 0 6px 6px 0;
          margin: 0 0 16px;
          font-size: 12px;
          line-height: 1.85;
          overflow-x: auto;
        }
        .derive-final {
          color: var(--curve);
          font-weight: 700;
          font-size: 13px;
          border-top: 1px solid rgba(200, 30, 79, 0.3);
          margin-top: 5px;
          padding-top: 5px;
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
          gap: 9px;
        }
        .goal {
          margin: 0;
          font-size: 13.5px;
        }
        .goal-x {
          color: var(--curve);
          font-weight: 700;
        }
        .yours {
          margin: 0;
          font-size: 12.5px;
          color: var(--ink-soft);
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
          min-height: 24px;
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
        :global(.qelab) :focus-visible {
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
