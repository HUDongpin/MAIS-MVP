'use client';

/* ============================================================================
   SubstitutionLab — an interactive "bench" for SUBSTITUTION: the permission to
   replace a letter with anything equal to it — including a whole expression —
   and the method that permission unlocks.

       Eq 1:  y = a·x + b          (the CARD — what y is)
       Eq 2:  c·x + d·y = e        (the HOLE — where y appears)
       drop:  c·x + d·(a·x + b) = e
       →      K·x + C = e          with  K = c + d·a,  C = d·b

   Built for MAIS (math AI system, www.mais.ac), K-12 (Algebra 1 · CCSS
   8.EE.C.8.b, HSA-REI.C.6).
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   an accent colour reserved for the mathematical object, dials that unlock one
   per lesson step, predict-then-check questions gated on ANSWERED, and a
   calibration challenge with a live match meter and a CALIBRATED stamp that
   cannot fire falsely.

   THE SIGNATURE CENTREPIECE — THE CARD AND THE HOLE.
   Equation 1's right side is drawn as a physical carmine CARD, and the y in
   Equation 2 sits in a carmine-outlined SOCKET. Press Substitute and the card
   flies along an arc into the socket, which widens to receive it. Two things
   are then true on screen, and both are the lesson:
     • The card lands WHOLE, and its border IS the pair of parentheses. This is
       the single most expensive error in school algebra — 2y becoming 2x + 3
       instead of 2(x + 3) — and here the parentheses are not a rule to
       remember but the visible edge of the object that moved.
     • Equation 1 KEEPS its card. We copied it, we did not spend it. That is
       why Equation 1 is still available for back-substitution later.

   THE COLOUR IS THE ARGUMENT.
   A principled two-accent scheme (the documented relaxation ExpressionLab,
   SystemsOfEquationsLab and TranslateLab already make):
       CARMINE = y and the card that stands in for it
       BLUE    = x, the variable that survives
   Before the drop, Equation 2 carries a carmine y. After it, every symbol left
   is a blue x. Substitution is the move that eliminates a variable, and the
   carmine draining out of the equation is that elimination made visible.

   DELIBERATELY DISTINCT from four neighbours, and the refusal is the design:
     • VariableLab owns substituting a NUMBER into an expression, drawn as a
       walk on a number line. This lab substitutes an EXPRESSION for a letter
       and draws no walk. (Its back-substitution rung is the moment the two
       ideas meet, and the copy hands that credit back.)
     • SystemsOfEquationsLab owns the system's PICTURE — two lines, the gold
       crossing point, and one/none/infinitely many read off the graph. So this
       lab plots NOTHING: no axes, no lines, no intersection. It reaches the
       same three cases by pure algebra and cites that lab for the why. This is
       the same refusal FormulaLab makes of the geometry labs — the object here
       is the symbolic machinery itself.
     • EquationLab owns solving a·x + b = c on a balance scale. The collapsed
       one-variable equation is handed to it by name rather than re-solved.
     • DistributiveLab owns a(b+c) = ab+ac as a rectangle pulling apart, and
       LikeTermsLab owns collecting terms. Both are cited on the rungs that use
       them; neither picture is redrawn.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/SubstitutionLab.jsx
     2. Import and render it:
          import SubstitutionLab from './SubstitutionLab';
          export default function Page() { return <SubstitutionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, c, d, e, step,
              dropped).
     MODEL  — collapse() and solveSystem() are pure math over exact integers
              and exact reduced fractions; they know nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CARD_COL = '#c81e4f'; // the accent: y, and the card that replaces it
const XCOL = '#2f6f9f'; // x — the variable that survives the substitution
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const OK = '#1f8a5b';
const MINUS = '−';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Five dials, unlocking one per lesson step.
     a, b — build the CARD, Eq 1: y = a·x + b. They are the star (carmine).
     d    — how many y's Eq 2 holds. Kept ≥ 1 so there is ALWAYS a hole to fill;
            d = 0 would delete the y and make the whole lab vacuous.
     c, e — the rest of Eq 2: c·x + d·y = e.
   c, d and e are re-LOCKED during the calibration challenge, because there the
   machine owns Equation 2 (the same move SystemsOfEquationsLab makes when it
   locks both equations for its solve-it capstone).
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'a', label: 'a', min: -3, max: 3, step: 1, unlock: 1, star: true, role: 'the card’s x-coefficient · Eq 1: y = a·x + b' },
  { key: 'b', label: 'b', min: -6, max: 6, step: 1, unlock: 2, star: true, role: 'the card’s constant term' },
  { key: 'd', label: 'd', min: 1, max: 4, step: 1, unlock: 3, calibLock: true, role: 'how many y’s in Eq 2 · the size of the hole' },
  { key: 'c', label: 'c', min: -4, max: 4, step: 1, unlock: 4, calibLock: true, role: 'x’s in Eq 2 · Eq 2: c·x + d·y = e' },
  { key: 'e', label: 'e', min: -8, max: 12, step: 1, unlock: 5, calibLock: true, role: 'Eq 2’s right-hand side' },
];

/* y = x + 3 and x + y = 9 — "two numbers differ by 3 and add to 9". The
   cleanest possible first system: the collapse is 2x + 3 = 9, the answer (3, 6)
   is a pair of small whole numbers, and every rung of the ladder reads easily. */
const START = { a: 1, b: 3, c: 1, d: 1, e: 9 };

/* Step index at which the hole opens and the card may be dropped. */
const DROP_STEP = 3;

/* How long the card takes to fly, in milliseconds. */
const FLIGHT_MS = 750;

/* A reachable, in-range preset where the x's cancel: K = c + d·a = −2 + 1·2 = 0,
   C = d·b = 1, e = 5 → the collapse is the false statement 1 = 5 → no solution.
   Nudging e to 1 makes it 1 = 1 → infinitely many. Both halves of the degenerate
   story from one button. */
const VANISH = { a: 2, b: 1, c: -2, d: 1, e: 5 };

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels. Exact integers, then exact reduced
   fractions — never floating point, so a student is never shown 2.9999999.
   ------------------------------------------------------------------------- */
const gcd = (m, n) => {
  m = Math.abs(m);
  n = Math.abs(n);
  while (n) {
    const t = m % n;
    m = n;
    n = t;
  }
  return m || 1;
};

/* Canonical reduced fraction: gcd(n, d) = 1 and d > 0. */
function frac(n, d) {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
const fracStr = (f) => (f.d === 1 ? fmt(f.n) : `${fmt(f.n)}/${f.d}`);

/* Substituting y = a·x + b into c·x + d·y = e gives c·x + d·(a·x + b) = e,
   which distributes to c·x + (d·a)·x + (d·b) = e and collects to K·x + C = e. */
function collapse(a, b, c, d) {
  return { K: c + d * a, C: d * b };
}

/* The whole method, done exactly. K ≠ 0 is the ordinary case; K = 0 means every
   x cancelled and what is left is a statement with no unknown in it — true for
   all x (infinitely many solutions) or false for all x (no solution). */
function solveSystem(a, b, c, d, e) {
  const { K, C } = collapse(a, b, c, d);
  if (K !== 0) {
    // x = (e − C)/K ; y = a·x + b = (a·(e − C) + b·K)/K — computed from the
    // integers, not from a reduced x, so no rounding can creep in.
    return { kind: 'one', K, C, x: frac(e - C, K), y: frac(a * (e - C) + b * K, K) };
  }
  return { kind: C === e ? 'infinite' : 'none', K, C, x: null, y: null };
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration ("read the collapse backwards"). Equation 2 is locked to
   the machine's own c, d, e, and a hidden card a*·x + b* sits in its hole. The
   student sees only the equation the collapse produces and must reconstruct the
   card by inverting K = c + d·a and C = d·b.

   WHY THE STAMP CANNOT FIRE FALSELY. With c and d locked to the machine's,
       K = K*  ⟺  c + d·a = c + d·a*  ⟺  d·(a − a*) = 0  ⟺  a = a*   (d ≥ 1)
       C = C*  ⟺  d·b = d·b*          ⟺  d·(b − b*) = 0  ⟺  b = b*   (d ≥ 1)
   so matching the collapse is EQUIVALENT to holding the machine's exact card —
   there is no second (a, b) that produces the same collapsed equation. d ≥ 1 is
   what makes this an "if and only if", which is precisely why the d dial's range
   excludes 0. The stamp is gated on exact integer equality of (K, C), never on a
   tolerance; the meter below is display only. audit-substitution.mjs proves the
   equivalence exhaustively over every locked Eq 2 and every target card.
   ------------------------------------------------------------------------- */
function calibError(a, b, t) {
  // K − K* = d·(a − a*) and C − C* = d·(b − b*), so dividing by d gives a
  // dial-space distance whose scale does not drift with the machine's d.
  const me = collapse(a, b, t.c, t.d);
  const th = collapse(t.a, t.b, t.c, t.d);
  return Math.hypot(me.K - th.K, me.C - th.C) / t.d;
}
const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + err / 0.8)));
const MATCH_ERR = 0.05; // integers ⇒ the smallest non-zero error is 1

function targetOk(t, prev, avoid) {
  if (t.a === 0) return false; // a card with no x in it is not worth guessing
  if (t.b === 0) return false; // ...nor one with no constant to find
  // Eq 2 must be a genuine two-variable equation. With c = 0 it reads "d·y = e",
  // so K = d·a and C = d·b, and at d = 1 the collapsed equation just hands the
  // student a and b to copy down — no inversion left to do.
  if (t.c === 0) return false;
  if (t.c + t.d * t.a === 0) return false; // the collapse must keep its x
  if (prev && t.a === prev.a && t.b === prev.b && t.c === prev.c && t.d === prev.d && t.e === prev.e) return false;
  if (avoid && t.a === avoid.a && t.b === avoid.b) return false; // never start already-matched
  return true;
}

/* A known-good card, used only if the rejection sampler somehow exhausts its
   budget: K = 3 + 2·2 = 7, C = 2·(−1) = −2. A student must never be handed an
   illegal challenge because a random draw got unlucky. */
const FALLBACK_TARGET = { a: 2, b: -1, c: 3, d: 2, e: 12 };

function makeTarget(prev, avoid) {
  const pick = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  let t;
  let guard = 0;
  do {
    t = { a: pick(-3, 3), b: pick(-6, 6), c: pick(-4, 4), d: pick(1, 4), e: pick(-8, 12) };
    guard += 1;
  } while (!targetOk(t, prev, avoid) && guard < 400);
  return targetOk(t, prev, avoid) ? t : { ...FALLBACK_TARGET };
}

/* ---------------------------------------------------------------------------
   Formatting + symbolic token builders.

   Every equation on the canvas is built from TOKENS — { s: text, k: kind } —
   and the kind picks the colour, so a symbol's colour and its meaning can never
   drift apart. The plain-text strings used by the header and the screen-reader
   label are derived from these same builders (toksPlain), which keeps one
   source of truth for the mathematics as written.
   ------------------------------------------------------------------------- */
function fmt(n) {
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
const T = (s, k) => ({ s, k: k || 'num' });
const toksPlain = (toks) => toks.map((t) => t.s).join('');

/* The multiplier in front of a VARIABLE term: 1 is silent, −1 is a bare minus. */
function coefToks(n, lead) {
  const t = [];
  if (n < 0) t.push(T(lead ? MINUS : ` ${MINUS} `, 'op'));
  else if (!lead) t.push(T(' + ', 'op'));
  const m = Math.abs(n);
  if (m !== 1) t.push(T(String(m), 'num'));
  return t;
}
/* A CONSTANT term — where 1 must still be printed as "1". */
function constToks(n, lead) {
  const t = [];
  if (n < 0) t.push(T(lead ? MINUS : ` ${MINUS} `, 'op'));
  else if (!lead) t.push(T(' + ', 'op'));
  t.push(T(String(Math.abs(n)), 'num'));
  return t;
}

/* The card's contents: a·x + b. */
function cardBody(a, b) {
  const t = [];
  if (a !== 0) {
    t.push(...coefToks(a, true), T('x', 'x'));
    if (b !== 0) t.push(...constToks(b, false));
  } else {
    t.push(...constToks(b, true)); // b = 0 prints "0" — a card can be worth nothing
  }
  return t;
}
/* The card as it travels — parentheses included, because they are its edges.
   In Eq 1 they are harmless; in Eq 2 they are the whole point. */
const cardToks = (a, b) => [T('(', 'cparen'), ...cardBody(a, b), T(')', 'cparen')];

/* Eq 2 = [prefix] y [suffix]. d ≥ 1, so the connector to the y-term is always
   a "+" and the sign handling stays honest without a special case. */
function eq2Prefix(c, d) {
  const t = [];
  if (c !== 0) {
    t.push(...coefToks(c, true), T('x', 'x'), T(' + ', 'op'));
  }
  if (d !== 1) t.push(T(String(d), 'num'));
  return t;
}
const eq2Suffix = (e) => [T(' = ', 'op'), T(fmt(e), 'num')];

/* Rung 2: distributed — c·x + (d·a)·x + (d·b) = e, products carried out. */
function distribToks(a, b, c, d, e) {
  const t = [];
  let lead = true;
  if (c !== 0) {
    t.push(...coefToks(c, lead), T('x', 'x'));
    lead = false;
  }
  const da = d * a;
  if (da !== 0) {
    t.push(...coefToks(da, lead), T('x', 'x'));
    lead = false;
  }
  const db = d * b;
  if (db !== 0 || lead) {
    t.push(...constToks(db, lead));
    lead = false;
  }
  t.push(...eq2Suffix(e));
  return t;
}

/* Rung 3: collected — K·x + C = e, or just C = e once the x's have cancelled. */
function combineToks(K, C, e) {
  const t = [];
  let lead = true;
  if (K !== 0) {
    t.push(...coefToks(K, lead), T('x', 'x'));
    lead = false;
  }
  if (C !== 0 || lead) {
    t.push(...constToks(C, lead));
    lead = false;
  }
  t.push(...eq2Suffix(e));
  return t;
}

const solveToks = (xs) => [T('x', 'x'), T(' = ', 'op'), T(xs, 'x')];

/* Rung 5: back-substitution — the same card, with a NUMBER dropped into its own
   x-slot. The parentheses are carmine again because it is the same object. */
function backSubToks(a, b, xs, ys) {
  const t = [T('y', 'y'), T(' = ', 'op')];
  if (a !== 0) {
    t.push(...coefToks(a, true), T('(', 'cparen'), T(xs, 'x'), T(')', 'cparen'));
    if (b !== 0) t.push(...constToks(b, false));
  } else {
    t.push(...constToks(b, true));
  }
  t.push(T(' = ', 'op'), T(ys, 'y'));
  return t;
}

/* Rung 6: the check — the pair put back into Eq 2. The two numbers keep the
   colours of the letters they came from. */
function checkToks(c, d, xs, ys, e) {
  const t = [];
  let lead = true;
  if (c !== 0) {
    t.push(...coefToks(c, lead), T('(', 'paren'), T(xs, 'x'), T(')', 'paren'));
    lead = false;
  }
  t.push(...coefToks(d, lead), T('(', 'paren'), T(ys, 'y'), T(')', 'paren'));
  t.push(...eq2Suffix(e), T('  ✓', 'ok'));
  return t;
}

/* plain-text renderings, derived from the token builders above */
const cardPlain = (a, b) => toksPlain(cardBody(a, b));
const eq2Plain = (c, d, e) => toksPlain([...eq2Prefix(c, d), T('y', 'y'), ...eq2Suffix(e)]);
const collapsePlain = (K, C, e) => toksPlain(combineToks(K, C, e));
function solutionPlain(sol) {
  if (sol.kind === 'none') return 'no solution';
  if (sol.kind === 'infinite') return 'infinitely many solutions';
  return `(${fracStr(sol.x)}, ${fracStr(sol.y)})`;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with its step; the
   reveal lives in `feedback`, shown only after answering; Next is gated on
   ANSWERED, not CORRECT. The distractors are the real errors: the card sliding
   in without its parentheses, stopping at x and calling it the answer, and
   reading a cancelled statement as a pair of values.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Two equations, two unknowns',
    body:
      'Equation 2 says x + y = 9. On its own that is not enough to pin down either letter — lots of ' +
      'pairs work: (0, 9), (4, 5), (10, −1). Equation 1 is what narrows it to one pair, and it is ' +
      'written in a specially useful form: it tells you exactly what y is.',
    q: 'On its own, how many pairs (x, y) make x + y = 9 true?',
    choices: ['Infinitely many — (0, 9), (4, 5) and (10, −1) all work', 'Exactly one', 'None — two letters but only one equation'],
    answer: 0,
    feedback:
      'One equation with two unknowns cannot fix both letters; it leaves a whole family of pairs. A ' +
      'second equation cuts that family down to one. The question is how to combine the two — and ' +
      'substitution is the cleanest way, because it uses Equation 1 to get rid of y altogether.',
  },
  {
    title: 'Equals may replace equals',
    body:
      'Read Equation 1 carefully: y = x + 3 does not say y is 3. It says y and x + 3 are two names for ' +
      'the same number. So treat the right side as a card you can carry: the card reads x + 3, and it ' +
      'is worth exactly what y is worth. The a dial sets how many x’s are on it.',
    q: 'Equation 1 says y = 2x. What does that entitle you to do?',
    choices: ['Write 2x anywhere a y appears — they are the same number', 'Replace every x with a y', 'Conclude that y is the number 2'],
    answer: 0,
    feedback:
      'An equals sign is a claim that two expressions have identical value. Euclid put it first on his ' +
      'list of common notions: things equal to the same thing are equal to one another. So wherever a y ' +
      'stands, 2x may stand instead, and nothing about the problem changes. That single permission is ' +
      'the entire method — everything after it is arithmetic.',
  },
  {
    title: 'The card holds a rule, not a number',
    body:
      'The b dial adds a constant to the card. Now notice what the card actually is: not a number, but ' +
      'an expression. Its value moves as x moves — and yet it never stops being equal to y. That is ' +
      'exactly why it is safe to carry it somewhere else.',
    q: 'The card reads x + 3. Is y a fixed number?',
    choices: ['No — y’s value follows x, but y always equals the card’s value', 'Yes — y = 3', 'Yes — y = 4, because x must be 1'],
    answer: 0,
    feedback:
      'Neither y nor the card holds a number yet; they hold the same rule. Putting an actual number into ' +
      'an expression and turning the crank is what The Variable lab is about. Here we do something ' +
      'stronger and stranger: we put an entire expression in for a letter. The card is a rule, and a ' +
      'rule can travel.',
  },
  {
    title: 'Equation 2 has a y-shaped hole',
    body:
      'The d dial sets how many y’s Equation 2 holds — a y-shaped hole, outlined in carmine. Because ' +
      'the card equals y, we may drop the card into that hole. Press Substitute and watch it fly. Keep ' +
      'an eye on Equation 1 as it goes: it keeps its card. We copied it, we did not spend it.',
    q: 'In the term 2y, replace y with the card x + 3. What do you get?',
    choices: ['2(x + 3) = 2x + 6 — the card lands whole', '2x + 3 — the card slides in and the 3 stays outside', '2x + 3y', 'x + 3'],
    answer: 0,
    feedback:
      'This is the error that costs more marks than any other in school algebra. 2y means two of ' +
      'whatever y is — and y is the whole card — so you get two of (x + 3): both parts double, giving ' +
      '2x + 6. Watch the card as it lands: it keeps its border, and that border IS the pair of ' +
      'parentheses. In Equation 1 those parentheses do nothing at all. In Equation 2 they do everything.',
  },
  {
    title: 'The carmine disappears',
    body:
      'Now the ladder builds itself: distribute (that is the law DistributiveLab pulls apart as a ' +
      'rectangle), then collect the x-terms (the move LikeTermsLab is about). The c dial sets how many ' +
      'x’s Equation 2 started with — watch the collapsed coefficient K = c + d·a answer it. And watch ' +
      'the colour: Equation 2 carried a carmine y; now every symbol left standing is a blue x.',
    q: 'What has substituting actually bought you?',
    choices: ['One equation in x alone — y has been eliminated', 'A shorter equation', 'The value of y, straight away'],
    answer: 0,
    feedback:
      'Tidiness is not the point — elimination is. A problem with two unknowns has become a problem ' +
      'with one unknown, and one-unknown equations are already solved territory. That is why the method ' +
      'is worth learning: it does not so much solve the system as reduce it to something you can ' +
      'already solve.',
  },
  {
    title: 'Solve, then put the answer back',
    body:
      'K·x + C = e is an ordinary one-variable equation — the balance scale in EquationLab is built to ' +
      'handle it, so this lab simply hands it over. But finding x is only half the job. A system’s ' +
      'answer is a pair, so the number you found goes back into the card to produce y. Back-substitution ' +
      'is substitution again — this time a number replaces a letter.',
    q: 'You substitute, solve, and get x = 2. Are you finished?',
    choices: ['No — a solution is a pair (x, y); put 2 back into the card to get y', 'Yes — x = 2 is the solution', 'No — you must substitute the card into Equation 1 as well'],
    answer: 0,
    feedback:
      'A system’s solution is a pair of numbers, because a pair is what it takes to satisfy two ' +
      'equations at once. Put x back into the card — that is the fastest route to y. Putting x into ' +
      'Equation 2 instead works too and gives the same y, which is exactly why the check on the bottom ' +
      'rung always passes. And notice the answer need not be tidy: fractions are perfectly legal ' +
      'solutions, so drag the dials until you find one.',
  },
  {
    title: 'When the x’s vanish',
    body:
      'K = c + d·a is the x-coefficient after the collapse. Usually K ≠ 0 and there is exactly one ' +
      'answer. But press Make the x’s vanish: with K = 0 every x cancels, and what is left is a ' +
      'statement holding no unknown at all. Then nudge the e dial to 1 and watch that statement change ' +
      'its mind.',
    q: 'You substitute and the x’s cancel, leaving 1 = 5. What does that tell you?',
    choices: ['No pair (x, y) can satisfy both equations', 'x = 1 and y = 5', 'Infinitely many pairs work'],
    answer: 0,
    feedback:
      '1 = 5 is false no matter what x is, so no x can rescue it: the system has no solution. Had the ' +
      'leftovers come out 1 = 1 — true for every x — then every point on the line would work and there ' +
      'would be infinitely many solutions. The algebra tells you which case you are in; ' +
      'SystemsOfEquationsLab draws you the why (parallel lines never meet; identical lines meet ' +
      'everywhere).',
  },
  {
    title: 'Read the collapse backwards',
    body:
      'Equation 2 is locked, and a hidden card sits in its hole. You cannot see the card — but you can ' +
      'see the collapsed equation it produces. Work backwards through the machinery: K = c + d·a and ' +
      'C = d·b, with c and d locked. Tune a and b until your collapse matches the machine’s, then take ' +
      'a new card.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function SubstitutionLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [c, setC] = useState(START.c);
  const [d, setD] = useState(START.d);
  const [e, setE] = useState(START.e);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [dropped, setDropped] = useState(false);
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  // start = the wall-clock ms the flight began, or 0 for "no flight — snap"
  const flightRef = useRef({ start: 0, raf: 0 });

  const current = STEPS[step];
  const calib = !!current.calib;

  const sol = solveSystem(a, b, c, d, e);
  const { K, C } = sol;
  const th = target ? collapse(target.a, target.b, target.c, target.d) : null;

  const err = target ? calibError(a, b, target) : Infinity;
  const pct = target ? matchPercent(err) : 0;
  // Exact integer equality — never a tolerance. See EDIT 6 for why this cannot
  // fire on any card but the machine's.
  const calibrated = !!th && K === th.K && C === th.C;

  sceneRef.current = { ...sceneRef.current, a, b, c, d, e, step, dropped, calib, target, sol };

  /* ---- full redraw from state -------------------------------------------- */
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
    const F = flightRef.current;
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const lerp = (p, q, t) => p + (q - p) * t;

    /* The flight parameter: 0 = card at home, 1 = card seated in the hole.
       It is derived HERE, from `dropped` plus the wall clock — the animation
       never owns it. requestAnimationFrame only fires while the tab is
       painting, so a student who presses Substitute and switches tabs used to
       come back to a lab frozen half-way with `dropped` still false and the
       ladder never arriving. Reading elapsed time against `dropped` makes the
       picture self-heal on the next redraw however long the tab slept, and
       F.start = 0 means "landed, no flight to play". */
    const u = !S.dropped ? 0 : F.start ? ease(Math.min(1, Math.max(0, (performance.now() - F.start) / FLIGHT_MS))) : 1;

    const sc = Math.min(1, H / 512); // one scale factor, so the scene shrinks whole
    const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    const fEq = `600 ${Math.round(22 * sc)}px ${MONO}`;
    const fLad = `${Math.round(17.5 * sc)}px ${MONO}`;
    const fNote = `${Math.round(10.5 * sc)}px ${MONO}`;
    const fLab = `600 ${Math.round(10 * sc)}px ${MONO}`;

    const colorOf = (k) =>
      k === 'x' ? XCOL : k === 'y' || k === 'cparen' ? CARD_COL : k === 'ok' ? OK : k === 'op' || k === 'paren' ? INK_SOFT : INK;

    const meas = (toks, font) => {
      ctx.font = font;
      let w = 0;
      for (const t of toks) w += ctx.measureText(t.s).width;
      return w;
    };
    const put = (toks, x, y, font, alpha = 1) => {
      ctx.font = font;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = alpha;
      let cx = x;
      for (const t of toks) {
        ctx.fillStyle = colorOf(t.k);
        ctx.fillText(t.s, cx, y);
        cx += ctx.measureText(t.s).width;
      }
      ctx.globalAlpha = 1;
      return cx;
    };
    const rr = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };
    const caps = (s, x, y, align = 'center') => {
      ctx.font = fLab;
      ctx.fillStyle = 'rgba(91,107,123,0.9)';
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.fillText(s, x, y);
    };

    /* the card as a physical object: a rounded carmine slip whose edges are
       literally the parentheses it carries with it */
    /* boxH is a parameter, not a constant: the ladder's card is set in a smaller
       font than the stage's, and a box sized for the big one overlapped the rung
       above it. */
    const cardM = (font, boxH) => {
      const toks = cardToks(S.a, S.b);
      const w = meas(toks, font);
      const padX = 8 * sc;
      return { toks, w, padX, boxW: w + 2 * padX, boxH: boxH || 32 * sc };
    };
    const drawCard = (m, bx, cy, font, alpha = 1) => {
      ctx.globalAlpha = alpha;
      rr(bx, cy - m.boxH / 2, m.boxW, m.boxH, 8 * sc);
      ctx.fillStyle = 'rgba(200,30,79,0.07)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,30,79,0.85)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
      put(m.toks, bx + m.padX, cy, font, alpha);
    };

    /* ---- quadrille paper ------------------------------------------------- */
    const g = 26;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    for (let gx = g; gx < W; gx += g) {
      const X = Math.round(gx) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    for (let gy = g; gy < H; gy += g) {
      const Y = Math.round(gy) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    /* ---- EQUATION 1 — the card ------------------------------------------- */
    /* The section labels sit LEFT, not centred over their equations: the card's
       flight arc runs down the middle of the stage and cut straight through a
       centred caption. Left-aligning also lines them up with the ladder's own
       label, so the three captions read as one column of section markers. */
    const labX = Math.round(W * 0.085);
    const y1 = Math.round(H * 0.118);
    caps('EQUATION 1 · THE CARD', labX, Math.round(H * 0.056), 'left');
    const m1 = cardM(fEq);
    const pre1 = [T('y', 'y'), T(' = ', 'op')];
    const wPre1 = meas(pre1, fEq);
    const x01 = (W - (wPre1 + m1.boxW)) / 2;
    put(pre1, x01, y1, fEq);
    const homeX = x01 + wPre1;
    drawCard(m1, homeX, y1, fEq); // Eq 1 always keeps its card — we copy, never spend

    /* ---- EQUATION 2 — the hole ------------------------------------------- */
    const y2 = Math.round(H * 0.265);
    const holeOpen = S.step >= DROP_STEP;
    caps(holeOpen ? 'EQUATION 2 · THE HOLE' : 'EQUATION 2', labX, Math.round(H * 0.203), 'left');
    const pre2 = eq2Prefix(S.c, S.d);
    const suf2 = eq2Suffix(S.e);
    const wPre2 = meas(pre2, fEq);
    const wSuf2 = meas(suf2, fEq);
    const wY = meas([T('y', 'y')], fEq);
    // The socket widens from y-sized to card-sized as the card comes in, so the
    // rest of the row flows out of the way instead of jumping on landing.
    const slotW = holeOpen ? lerp(wY + 16 * sc, m1.boxW, u) : wY;
    const x02 = (W - (wPre2 + slotW + wSuf2)) / 2;
    put(pre2, x02, y2, fEq);
    const slotX = x02 + wPre2;
    if (!holeOpen) {
      put([T('y', 'y')], slotX, y2, fEq);
    } else {
      const socketA = 1 - u;
      if (socketA > 0.01) {
        ctx.globalAlpha = socketA;
        ctx.setLineDash([4 * sc, 3 * sc]);
        rr(slotX, y2 - m1.boxH / 2, slotW, m1.boxH, 8 * sc);
        ctx.strokeStyle = CARD_COL;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      const yA = Math.max(0, 1 - u * 3); // the y clears out early, before the card arrives
      if (yA > 0.01) put([T('y', 'y')], slotX + (slotW - wY) / 2, y2, fEq, yA);
    }
    put(suf2, slotX + slotW, y2, fEq);

    /* the flight path — an affordance before the drop, the trajectory during */
    if (holeOpen && u < 1) {
      ctx.globalAlpha = 0.4 + 0.2 * (1 - u);
      ctx.setLineDash([3 * sc, 4 * sc]);
      ctx.strokeStyle = CARD_COL;
      ctx.lineWidth = 1.2;
      const ax = homeX + m1.boxW / 2;
      const bx = slotX + slotW / 2;
      ctx.beginPath();
      ctx.moveTo(ax, y1 + m1.boxH / 2 + 2);
      ctx.quadraticCurveTo((ax + bx) / 2, (y1 + y2) / 2 - 16 * sc, bx, y2 - m1.boxH / 2 - 8 * sc);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); // arrowhead into the hole
      ctx.moveTo(bx, y2 - m1.boxH / 2 - 3 * sc);
      ctx.lineTo(bx - 4 * sc, y2 - m1.boxH / 2 - 10 * sc);
      ctx.moveTo(bx, y2 - m1.boxH / 2 - 3 * sc);
      ctx.lineTo(bx + 4 * sc, y2 - m1.boxH / 2 - 10 * sc);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* the travelling copy of the card */
    if (holeOpen && u > 0) {
      const fx = lerp(homeX, slotX, u);
      const fy = lerp(y1, y2, u) - Math.sin(Math.PI * u) * 34 * sc; // arc over, not through
      drawCard(m1, fx, fy, fEq);
    }

    /* ---- the ladder ------------------------------------------------------ */
    ctx.strokeStyle = 'rgba(28,43,58,0.14)';
    ctx.lineWidth = 1;
    const dy = Math.round(H * 0.335) + 0.5;
    ctx.beginPath();
    ctx.moveTo(W * 0.06, dy);
    ctx.lineTo(W * 0.94, dy);
    ctx.stroke();

    /* Vertical budget, verified in the browser at 640×512: the label sits at
       dy+13 and rung 1's card top at row0 − 13, which leaves clear air between
       them; the sixth rung ends well above the solution chip's caption. */
    const ladX = Math.round(W * 0.085);
    const rowH = Math.round(H * 0.08);
    const row0 = Math.round(H * 0.43);
    const mLad = cardM(fLad, 26 * sc);
    caps('THE METHOD · RUNG BY RUNG', ladX, dy + 13 * sc, 'left');

    /* The six rungs are ALWAYS laid out, filling in as the lesson earns them.
       An unearned rung shows as a faint dashed placeholder carrying its name,
       so the student can see the shape of the whole method from step 1 — and
       the stage never sits two-thirds empty waiting for them. */
    const slots = [
      { note: 'substitute the card', parts: null },
      { note: 'distribute', parts: null },
      { note: 'collect like terms', parts: null },
      { note: 'solve for x', parts: null },
      { note: 'back-substitute', parts: null },
      { note: 'check in Eq 2', parts: null },
    ];
    if (S.dropped) {
      slots[0].parts = [{ k: 't', toks: pre2 }, { k: 'card' }, { k: 't', toks: suf2 }];
      if (S.step >= 4) {
        slots[1].parts = [{ k: 't', toks: distribToks(S.a, S.b, S.c, S.d, S.e) }];
        slots[2].parts = [{ k: 't', toks: combineToks(S.sol.K, S.sol.C, S.e) }];
        if (S.sol.K === 0) slots[2].note = 'the x’s cancelled';
      }
      if (S.calib) {
        // the challenge is about the collapse alone — the last three rungs are
        // not part of it, so they are dropped rather than left dangling
        slots.length = 3;
      } else if (S.step >= 5) {
        if (S.sol.kind === 'one') {
          const xs = fracStr(S.sol.x);
          const ys = fracStr(S.sol.y);
          slots[3].parts = [{ k: 't', toks: solveToks(xs) }];
          slots[4].parts = [{ k: 't', toks: backSubToks(S.a, S.b, xs, ys) }];
          slots[5].parts = [{ k: 't', toks: checkToks(S.c, S.d, xs, ys, S.e) }];
        } else {
          // with no single x there is nothing to solve for, put back, or check:
          // the method genuinely stops here
          slots[3] = { note: S.sol.kind === 'none' ? 'impossible' : 'true for every x', parts: [{ k: 'verdict' }] };
          slots.length = 4;
        }
      }
    }

    slots.forEach((r, i) => {
      const ry = row0 + i * rowH;
      if (!r.parts) {
        ctx.setLineDash([3 * sc, 5 * sc]);
        ctx.strokeStyle = 'rgba(28,43,58,0.17)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ladX, ry);
        ctx.lineTo(ladX + W * 0.3, ry);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = fNote;
        ctx.fillStyle = 'rgba(91,107,123,0.42)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.note, W - 12 * sc, ry);
        return;
      }
      let cx = ladX;
      for (const p of r.parts) {
        if (p.k === 't') cx = put(p.toks, cx, ry, fLad);
        else if (p.k === 'card') {
          drawCard(mLad, cx, ry, fLad);
          cx += mLad.boxW;
        } else if (p.k === 'verdict') {
          const txt = S.sol.kind === 'none' ? 'no solution' : 'infinitely many solutions';
          ctx.font = `600 ${Math.round(15 * sc)}px ${MONO}`;
          const tw = ctx.measureText(txt).width;
          rr(cx, ry - 13 * sc, tw + 20 * sc, 26 * sc, 6 * sc);
          ctx.fillStyle = 'rgba(91,107,123,0.10)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(91,107,123,0.6)';
          ctx.lineWidth = 1.3;
          ctx.stroke();
          ctx.fillStyle = INK_SOFT;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(txt, cx + 10 * sc, ry);
          cx += tw + 20 * sc;
        }
      }
      ctx.font = fNote;
      ctx.fillStyle = 'rgba(91,107,123,0.75)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.note, W - 12 * sc, ry);
    });

    /* ---- the solution pair, or the machine's collapse during calibration -- */
    const botY = Math.round(H * 0.945);
    if (S.calib && S.target) {
      /* The ghost sits on the rung directly BELOW the student's own collapsed
         equation, left-aligned to the same column — the two things being
         compared have to be adjacent to be compared. Marooning it at the foot
         of the stage made the student look back and forth across dead space. */
      const t = S.target;
      const g2 = collapse(t.a, t.b, t.c, t.d);
      const ghost = combineToks(g2.K, g2.C, t.e);
      const gy = row0 + 3 * rowH;
      const gw = meas(ghost, fLad);
      ctx.setLineDash([4 * sc, 3 * sc]);
      rr(ladX - 10 * sc, gy - 15 * sc, gw + 20 * sc, 30 * sc, 7 * sc);
      ctx.strokeStyle = 'rgba(91,107,123,0.85)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = fLad; // grey throughout: this collapse is not yours yet
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(91,107,123,0.95)';
      let gx = ladX;
      for (const tk of ghost) {
        ctx.fillText(tk.s, gx, gy);
        gx += ctx.measureText(tk.s).width;
      }
      ctx.font = fNote;
      ctx.fillStyle = 'rgba(91,107,123,0.75)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('the machine’s collapse — match it', W - 12 * sc, gy);
    } else if (S.dropped && S.step >= 5 && S.sol.kind === 'one') {
      const txt = `(${fracStr(S.sol.x)}, ${fracStr(S.sol.y)})`;
      ctx.font = `700 ${Math.round(17 * sc)}px ${MONO}`;
      const tw = ctx.measureText(txt).width;
      const bw = tw + 26 * sc;
      const bx = (W - bw) / 2;
      rr(bx, botY - 15 * sc, bw, 30 * sc, 7 * sc);
      ctx.fillStyle = 'rgba(31,138,91,0.10)';
      ctx.fill();
      ctx.strokeStyle = OK;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = OK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, W / 2, botY);
      caps('THE SOLUTION PAIR', W / 2, botY - 27 * sc);
    }
  }, []);

  useEffect(() => {
    draw();
  }, [a, b, c, d, e, step, dropped, target, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* the card goes home again if the student walks back before the hole opens */
  useEffect(() => {
    if (step < DROP_STEP) {
      cancelAnimationFrame(flightRef.current.raf);
      flightRef.current.start = 0;
      setDropped(false);
    }
  }, [step]);

  /* the calibration challenge is about the collapse, so it starts already dropped */
  useEffect(() => {
    if (!calib) return;
    cancelAnimationFrame(flightRef.current.raf);
    flightRef.current.start = 0; // already landed — no flight to replay
    setDropped(true);
    setTarget((prev) => {
      if (prev) return prev;
      const t = makeTarget(null, { a, b });
      setC(t.c);
      setD(t.d);
      setE(t.e);
      return t;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => () => cancelAnimationFrame(flightRef.current.raf), []);

  /* ---- interaction ------------------------------------------------------- */
  const setters = { a: setA, b: setB, c: setC, d: setD, e: setE };
  const onParam = (key, value) => setters[key](parseInt(value, 10));

  /* `dropped` is set immediately and unconditionally; the flight is decoration
     that plays if the tab is around to see it. Nothing about the lesson waits
     on an animation frame. */
  const doDrop = () => {
    const F = flightRef.current;
    const reduced =
      typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cancelAnimationFrame(F.raf);
    F.start = reduced ? 0 : performance.now();
    setDropped(true);
    if (reduced) return;
    const tick = () => {
      draw();
      if (performance.now() - F.start < FLIGHT_MS) F.raf = requestAnimationFrame(tick);
    };
    F.raf = requestAnimationFrame(tick);
  };
  const undoDrop = () => {
    const F = flightRef.current;
    cancelAnimationFrame(F.raf);
    F.start = 0;
    setDropped(false);
  };

  const resetDials = () => {
    setA(START.a);
    setB(START.b);
    setC(START.c);
    setD(START.d);
    setE(START.e);
  };
  const makeVanish = () => {
    setA(VANISH.a);
    setB(VANISH.b);
    setC(VANISH.c);
    setD(VANISH.d);
    setE(VANISH.e);
    cancelAnimationFrame(flightRef.current.raf);
    flightRef.current.start = 0; // show the cancelled x's at once — no flight
    setDropped(true);
  };
  const newCard = () => {
    const t = makeTarget(target, { a, b });
    setC(t.c);
    setD(t.d);
    setE(t.e);
    setTarget(t);
  };

  const choose = (idx) => {
    if (answers[step] != null) return; // one answer per step, then it locks
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const values = { a, b, c, d, e };

  /* Predict-then-check only works if the lab keeps its own secrets: every
     readout below is gated to the step that earns it, so the collapse never
     appears before the student has been asked to predict it, and the solution
     pair never appears before they have been asked whether x alone is enough.
     The screen-reader narration is gated identically — same lesson, same order. */
  const showCollapse = dropped && step >= 4;
  const showSolution = dropped && step >= 5 && !calib && sol.kind === 'one';

  const headSub = !dropped
    ? `Eq 2: ${eq2Plain(c, d, e)} · substitute to eliminate y`
    : !showCollapse
      ? 'the card is in the hole · now unpack it'
      : showSolution
        ? `${collapsePlain(K, C, e)} → ${solutionPlain(sol)}`
        : `eliminate y → ${collapsePlain(K, C, e)}`;
  const spoken =
    `Equation 1: y equals ${cardPlain(a, b)}. Equation 2: ${eq2Plain(c, d, e)}. ` +
    (!dropped
      ? 'The card has not been substituted yet.'
      : !showCollapse
        ? 'The card has landed in the hole; it has not been unpacked yet.'
        : `Substituting the card gives ${collapsePlain(K, C, e)}.` +
          (showSolution || (dropped && step >= 5 && !calib) ? ` The system has ${solutionPlain(sol)}.` : '')) +
    (calib && calibrated ? ' Calibrated — your collapse matches the machine.' : '');

  return (
    <div className="slab">
      <header className="head">
        <h1>Substitution</h1>
        <p className="lede">
          Substitution is one permission, used well: a letter may be replaced by anything{' '}
          <em>equal</em> to it — including a whole expression. Carry Equation 1’s{' '}
          <em>card</em> into Equation 2’s <em>y-shaped hole</em> and the carmine drains away, leaving a
          single equation in <span className="mono">x</span> that you already know how to solve.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              y = <span className="card-chip">{cardPlain(a, b)}</span>
            </p>
            <p className="equation-sub mono">{headSub}</p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="sw card" /> y &amp; its card
            </span>
            <span className="lg">
              <span className="sw xs" /> x — the survivor
            </span>
            <span className="lg">
              <span className="sw ok" /> the solution pair
            </span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Collapsed x-coefficient</span>
              <span className="fact-v mono" style={{ color: showCollapse ? XCOL : INK_SOFT, fontWeight: 700 }}>
                {showCollapse ? `K = c + d·a = ${fmt(K)}` : '—'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Collapsed constant</span>
              <span className="fact-v mono">{showCollapse ? `C = d·b = ${fmt(C)}` : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Solution x</span>
              <span className="fact-v mono" style={{ color: showSolution ? XCOL : INK_SOFT }}>
                {showSolution ? fracStr(sol.x) : '—'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Solution y</span>
              <span className="fact-v mono" style={{ color: showSolution ? CARD_COL : INK_SOFT }}>
                {showSolution ? fracStr(sol.y) : '—'}
              </span>
            </div>
          </div>

          {showCollapse && sol.kind !== 'one' && (
            <p className="case-note mono">
              {sol.kind === 'none'
                ? `K = 0 and ${fmt(C)} ≠ ${fmt(e)} — the x’s cancel and leave a false statement: no solution.`
                : `K = 0 and ${fmt(C)} = ${fmt(e)} — the x’s cancel and leave a true statement: infinitely many solutions.`}
            </p>
          )}

          <div className="toolbar">
            {step >= DROP_STEP && !calib && (
              <button type="button" className="btn" onClick={dropped ? undoDrop : doDrop}>
                {dropped ? '↺ Take the card back' : 'Substitute →'}
              </button>
            )}
            {step === 6 && (
              <button type="button" className="btn ghost" onClick={makeVanish}>
                Make the x’s vanish
              </button>
            )}
            {!calib && (
              <button type="button" className="btn ghost" onClick={resetDials}>
                Reset dials
              </button>
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

          <div className="dials">
            {PARAMS.map((p) => {
              const locked = step < p.unlock || (calib && p.calibLock);
              const val = values[p.key];
              return (
                <label className={'dial' + (locked ? ' locked' : '') + (p.star ? ' star' : '')} key={p.key}>
                  <span className="dk">{p.label}</span>
                  <span className="drole">
                    {step < p.unlock ? 'unlocks soon' : calib && p.calibLock ? 'locked — the machine owns Eq 2' : p.role}
                  </span>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={val}
                    disabled={locked}
                    aria-label={`Dial ${p.label} — ${p.role}`}
                    onChange={(ev) => onParam(p.key, ev.target.value)}
                  />
                  <output className="dv">{step < p.unlock ? '🔒' : fmt(val)}</output>
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

          {calib && target && th && (
            <div className="calib">
              <p className="calib-eq mono">
                Eq 2 (locked): <strong>{eq2Plain(target.c, target.d, target.e)}</strong>
              </p>
              <table className="io">
                <thead>
                  <tr>
                    <th>collapsed part</th>
                    <th>machine</th>
                    <th>yours</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>x-coefficient K</td>
                    <td className="mono">{fmt(th.K)}</td>
                    <td className={'mono' + (K === th.K ? ' hit' : ' miss')}>{fmt(K)}</td>
                  </tr>
                  <tr>
                    <td>constant C</td>
                    <td className="mono">{fmt(th.C)}</td>
                    <td className={'mono' + (C === th.C ? ' hit' : ' miss')}>{fmt(C)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    K = {fmt(target.c)} + {fmt(target.d)}·a, C = {fmt(target.d)}·b
                  </span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={newCard}>
                New card
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
                  setDropped(false);
                  cancelAnimationFrame(flightRef.current.raf);
                  flightRef.current.start = 0;
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
        <span className="mono">y = a·x + b</span> into <span className="mono">c·x + d·y = e</span>{' '}
        &nbsp;·&nbsp; substitution replaces a variable with an expression equal to it, eliminating that
        variable and collapsing the system to <span className="mono">K·x + C = e</span>.
        CCSS&nbsp;8.EE.C.8.b, HSA-REI.C.6.
      </footer>

      <style jsx>{`
        .slab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --card: #c81e4f;
          --xcol: #2f6f9f;
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
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          color: var(--card);
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }
        .card-chip {
          border: 1.5px solid var(--card);
          background: rgba(200, 30, 79, 0.07);
          border-radius: 7px;
          padding: 1px 8px 2px;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 13px;
          margin: 0;
        }
        .stage {
          position: relative;
          width: min(100%, 640px);
          aspect-ratio: 5 / 4;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
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
          width: 16px;
          height: 5px;
          border-radius: 3px;
          display: inline-block;
        }
        .sw.card {
          background: var(--card);
        }
        .sw.xs {
          background: var(--xcol);
        }
        .sw.ok {
          background: var(--ok);
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
        .case-note {
          margin: 8px 4px 0;
          font-size: 12px;
          color: var(--ink-soft);
          background: rgba(91, 107, 123, 0.07);
          border-left: 3px solid var(--ink-soft);
          padding: 8px 10px;
          border-radius: 0 6px 6px 0;
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
          background: var(--card);
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
          color: var(--card);
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
        .dial.star input[type='range'] {
          accent-color: var(--card);
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
          border-left: 3px solid var(--card);
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
        .calib-eq {
          margin: 0;
          font-size: 12.5px;
          color: var(--ink-soft);
        }
        .calib-eq strong {
          color: var(--ink);
        }
        .io {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .io th {
          text-align: right;
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          font-weight: 600;
          padding: 2px 8px 6px;
          border-bottom: 1px solid rgba(28, 43, 58, 0.12);
        }
        .io th:first-child {
          text-align: left;
        }
        .io td {
          text-align: right;
          padding: 4px 8px;
          font-variant-numeric: tabular-nums;
        }
        .io td:first-child {
          text-align: left;
          color: var(--ink-soft);
        }
        .io td.hit {
          color: var(--ok);
          font-weight: 700;
        }
        .io td.miss {
          color: var(--card);
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--card));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 11.5px;
        }
        .stamp {
          font: 700 12px/1 var(--mono);
          letter-spacing: 0.16em;
          color: var(--ok);
          border: 2px solid var(--ok);
          border-radius: 6px;
          padding: 4px 8px;
          transform: rotate(-3deg);
          white-space: nowrap;
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
