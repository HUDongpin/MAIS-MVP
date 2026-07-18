'use client';

/* ============================================================================
   FormulaLab — an interactive "bench" for the idea of a FORMULA: a rule that
   ties named quantities together, where knowing all but one of them gives you
   the one you are missing.

   Built for MAIS (math AI system, www.mais.ac), K-12.
   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions gated on ANSWERED, and a
   calibration challenge with a live match meter and a CALIBRATED stamp.

   CCSS: 6.EE.A.2c (evaluate formulas at specific values), 7.EE.B.4,
         HSA-CED.A.4 (rearrange formulas to highlight a quantity of interest).

   ---------------------------------------------------------------------------
   THE SIGNATURE CENTERPIECE — THE CHAIN, AND UNDOING IT BACKWARDS.

   Read any formula as a machine acting on ONE letter. F = 9/5·C + 32 is:

              [× 9/5]      [+ 32]              <- the formula, as written
        (C) ──────────(·)──────────(F)
              [÷ 9/5]      [− 32]              <- the undo, to solve for C

   The op boxes stack in inverse pairs, vertically aligned, so "× 9/5" sits
   directly above "÷ 9/5". To solve for C you walk the spine RIGHT to LEFT:
   every box becomes its inverse AND the order reverses. That is the whole of
   rearranging a formula, and it is the one thing this lab teaches.

   THE INVARIANT (this lab's analogue of the ellipse "string"): THE ROUND TRIP
   COMES HOME. Solve backwards to get the missing letter, then substitute it
   forwards through the original formula and you land on exactly the number you
   started from. "Run the round trip" animates it. It is EXACT, not merely
   close, because the model is exact rational arithmetic (see the Q type below)
   — never floating point. That exactness is what makes the check honest.

   ONE-ACCENT DISCIPLINE, adapted: CARMINE = THE SUBJECT, the quantity the
   formula is currently giving you. Flip "solve for" and the accent physically
   travels along the spine to the new answer. The accent IS the lesson.

   ---------------------------------------------------------------------------
   DELIBERATELY DISTINCT from its nearest siblings — distinctness is a
   correctness property in this library, not a polish item:
     • VariableLab evaluates a·x + b as a WALK ON A NUMBER LINE (substitution).
       FormulaLab never draws a number line; substitution is step 1 here, not
       the subject, and the subject is the REARRANGEMENT that VariableLab has
       no notion of (it has one letter; a formula has several, any of which can
       be the one you want).
     • EquationLab solves a·x + b = c on a BALANCE SCALE — inverse operations
       applied to find a NUMBER for one unknown. FormulaLab's output is a NEW
       FORMULA (r = d ÷ t), and its picture is a pipeline, not a beam. It is
       the natural high-school sequel to that balance.
     • AreaLab / RectangleLab / CircleLab / VolumeLab each own the GEOMETRIC
       PICTURE of their own formula (unit tiles, the fence, the radius
       triangle). So FormulaLab draws NO scene and NO geometry at all — it
       borrows their formulas purely as algebraic objects to rearrange, and
       leaves every picture to the lab that owns it. (Same refusal LCMLab makes
       of MultiplesLab's number line.)

   ---------------------------------------------------------------------------
   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/FormulaLab.jsx
     2. Import and render it:
          import FormulaLab from './FormulaLab';
          export default function Page() { return <FormulaLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (formula, subject,
              dial values, lesson step).
     MODEL  — exact rational arithmetic over a declarative formula table; it
              knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // the one accent = THE SUBJECT (the quantity being solved for)
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const PAPER = '#fbfbf8';
const OK = '#1f8a5b';
const MINUS = '−'; // U+2212, never a hyphen

/* ============================================================================
   EXACT RATIONAL ARITHMETIC.

   Every quantity in this lab is a fraction of two integers, reduced. Nothing
   is ever a float. This matters for two reasons a K-12 lab cannot compromise
   on: (1) the round-trip check must land EXACTLY home, or the lab would be
   teaching "close enough" while claiming "=", and (2) the calibration stamp is
   gated on exact equality, so it can never fire on a value that is merely near
   the answer.
   ========================================================================== */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

/* Build a reduced rational n/d with a strictly positive denominator. */
function Q(n, d = 1) {
  if (d === 0) throw new Error('Q: zero denominator');
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
const ZERO = Q(0);

const qAdd = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
const qSub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
const qMul = (a, b) => Q(a.n * b.n, a.d * b.d);
const qDiv = (a, b) => {
  if (b.n === 0) throw new Error('qDiv: division by zero');
  return Q(a.n * b.d, a.d * b.n);
};
const qEq = (a, b) => a.n === b.n && a.d === b.d; // both reduced -> structural equality is real equality
const qCmp = (a, b) => Math.sign(a.n * b.d - b.n * a.d);
const qNum = (a) => a.n / a.d; // ONLY for pixels and grid-snapping, never for a claim

/* A decimal string parsed exactly — no float ever touches the value. */
function qFromDecimal(v) {
  const s = String(v).trim();
  const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) throw new Error('qFromDecimal: not a plain decimal: ' + s);
  const sign = m[1] === '-' ? -1 : 1;
  const frac = m[3] || '';
  return Q(sign * Number(m[2] + frac), Math.pow(10, frac.length));
}

const fmtInt = (n) => (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);

/* Exact display. Integers print plain; fractions whose denominator is built
   only from 2s and 5s print as a terminating decimal (exactly — computed by
   integer scaling, not by division); everything else prints as the reduced
   fraction, which is the honest answer. */
function qStr(q) {
  if (q.d === 1) return fmtInt(q.n);
  let d = q.d;
  let twos = 0;
  let fives = 0;
  while (d % 2 === 0) {
    d /= 2;
    twos++;
  }
  while (d % 5 === 0) {
    d /= 5;
    fives++;
  }
  if (d === 1) {
    const k = Math.max(twos, fives);
    const scaled = Math.abs(q.n) * (Math.pow(10, k) / q.d); // an exact integer
    const s = String(scaled).padStart(k + 1, '0');
    const body = s.slice(0, s.length - k) + '.' + s.slice(s.length - k);
    return (q.n < 0 ? MINUS : '') + body;
  }
  return `${fmtInt(q.n)}/${q.d}`;
}

/* For a non-terminating fraction we also offer a rounded decimal — clearly
   marked with ≈ so the exact fraction stays the answer. */
const qIsExactDecimal = (q) => {
  let d = q.d;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
};
const qApprox = (q) => `≈ ${(q.n / q.d).toFixed(2)}`;
const qFull = (q) => (qIsExactDecimal(q) ? qStr(q) : `${qStr(q)} ${qApprox(q)}`);

/* ============================================================================
   EDIT 2 — THE MODEL. A declarative table of real K-12 formulas.

   Each formula is read as a machine acting on one letter at a time:
     chain[L] = the ordered operations that turn L into the left-hand letter.
   Solving for L runs that chain backwards with each operation inverted.

   This representation is only honest when the subject appears EXACTLY ONCE in
   the formula and every operation is invertible for the values in range. Both
   hold for every formula below, and audit-formula.mjs proves it exhaustively
   (no zero divisors are reachable, because every divisor's dial range excludes
   zero).

   Ranges are chosen so the forward direction is CLOSED: for every dial setting
   the computed left-hand value lands inside its own dial's range and grid, so
   flipping the subject never distorts the situation. (C ∈ [−40,100] by 5s maps
   exactly onto F ∈ [−40,212] by 1s, and back.)
   ========================================================================== */
const FORMULAS = [
  {
    id: 'trip',
    name: 'Distance travelled',
    display: 'd = r · t',
    rhs: 'r · t',
    lhs: 'd',
    primary: 'r', // whose chain we show when the subject is the left-hand letter
    order: ['d', 'r', 't'],
    quantities: {
      d: { name: 'distance', unit: 'mi', min: 2.5, max: 480, step: 2.5, positive: true },
      r: { name: 'rate (speed)', unit: 'mi/h', min: 5, max: 80, step: 5, positive: true },
      t: { name: 'time', unit: 'h', min: 0.5, max: 6, step: 0.5, positive: true },
    },
    chain: {
      r: [{ op: 'mul', by: 't' }],
      t: [{ op: 'mul', by: 'r' }],
    },
  },
  {
    id: 'temp',
    name: 'Celsius to Fahrenheit',
    display: 'F = 9/5 · C + 32',
    rhs: '9/5 · C + 32',
    lhs: 'F',
    primary: 'C',
    order: ['F', 'C'],
    quantities: {
      // temperature is the one quantity here that is NOT declared positive —
      // −12 °C is a perfectly real Tuesday.
      F: { name: 'Fahrenheit', unit: '°F', min: -40, max: 212, step: 1, positive: false },
      C: { name: 'Celsius', unit: '°C', min: -40, max: 100, step: 5, positive: false },
    },
    chain: {
      // `sym` keeps the box reading "× 9/5" like the banner, rather than the
      // equal-but-unfamiliar "× 1.8". The audit proves a sym can never lie:
      // it must parse back to exactly the number the op actually uses.
      C: [{ op: 'mul', k: Q(9, 5), sym: '9/5' }, { op: 'add', k: Q(32) }],
    },
    alt: { C: 'C = 5/9 · (F − 32)' },
  },
  {
    id: 'tri',
    name: 'Area of a triangle',
    display: 'A = (b · h) ÷ 2',
    rhs: '(b · h) ÷ 2',
    lhs: 'A',
    primary: 'b',
    order: ['A', 'b', 'h'],
    quantities: {
      A: { name: 'area', unit: 'cm²', min: 0.5, max: 72, step: 0.5, positive: true },
      b: { name: 'base', unit: 'cm', min: 1, max: 12, step: 1, positive: true },
      h: { name: 'height', unit: 'cm', min: 1, max: 12, step: 1, positive: true },
    },
    chain: {
      b: [{ op: 'mul', by: 'h' }, { op: 'div', k: Q(2) }],
      h: [{ op: 'mul', by: 'b' }, { op: 'div', k: Q(2) }],
    },
    alt: { b: 'b = 2A ÷ h', h: 'h = 2A ÷ b' },
  },
  {
    id: 'rect',
    name: 'Perimeter of a rectangle',
    display: 'P = 2 · (l + w)',
    rhs: '2 · (l + w)',
    lhs: 'P',
    primary: 'l',
    order: ['P', 'l', 'w'],
    quantities: {
      P: { name: 'perimeter', unit: 'cm', min: 4, max: 60, step: 1, positive: true },
      l: { name: 'length', unit: 'cm', min: 1, max: 15, step: 0.5, positive: true },
      w: { name: 'width', unit: 'cm', min: 1, max: 15, step: 0.5, positive: true },
    },
    chain: {
      l: [{ op: 'add', by: 'w' }, { op: 'mul', k: Q(2) }],
      w: [{ op: 'add', by: 'l' }, { op: 'mul', k: Q(2) }],
    },
  },
];
const BY_ID = Object.fromEntries(FORMULAS.map((f) => [f.id, f]));

/* The lab opens on a trip anyone can picture: 60 mi/h for 2 hours = 120 miles.
   Each formula's stored values are self-consistent for its own default
   subject, so switching formulas never shows a broken situation. */
const START_FID = 'trip';
const START_SUBJECTS = { trip: 'd', temp: 'F', tri: 'A', rect: 'P' };
const START_VALS = {
  trip: { d: 120, r: 60, t: 2 },
  temp: { F: 68, C: 20 },
  tri: { A: 24, b: 8, h: 6 },
  rect: { P: 30, l: 11, w: 4 },
};

/* ---- running the chain --------------------------------------------------- */
const INV = { mul: 'div', div: 'mul', add: 'sub', sub: 'add' };
const qOf = (vals, key) => qFromDecimal(vals[key]);
const operandOf = (op, vals) => (op.by ? qOf(vals, op.by) : op.k);

function applyOp(op, x, vals, inverse) {
  const k = operandOf(op, vals);
  switch (inverse ? INV[op.op] : op.op) {
    case 'mul':
      return qMul(x, k);
    case 'div':
      return qDiv(x, k);
    case 'add':
      return qAdd(x, k);
    case 'sub':
      return qSub(x, k);
    default:
      throw new Error('applyOp: unknown op ' + op.op);
  }
}

/* Forward: letter -> ... -> left-hand quantity. */
function runForward(f, letter, x, vals) {
  for (const op of f.chain[letter]) x = applyOp(op, x, vals, false);
  return x;
}
/* Backward: left-hand quantity -> ... -> letter. Inverse ops, reverse order —
   the entire lesson, in three lines. */
function runBackward(f, letter, x, vals) {
  const c = f.chain[letter];
  for (let i = c.length - 1; i >= 0; i--) x = applyOp(c[i], x, vals, true);
  return x;
}

/* THE MODEL'S ONE PUBLIC FACT: what the formula gives you. */
function solveFor(f, subject, vals) {
  if (subject === f.lhs) return runForward(f, f.primary, qOf(vals, f.primary), vals);
  return runBackward(f, subject, qOf(vals, f.lhs), vals);
}

/* The spine the canvas draws: the chips (values) and the boxes (operations)
   between them. In solve mode the left chip is the computed answer and the
   right chip is the dialled left-hand quantity; running forward from the
   answer must land back on it exactly — that is the round trip. */
function spine(f, subject, vals) {
  const solving = subject !== f.lhs;
  const letter = solving ? subject : f.primary;
  const chain = f.chain[letter];
  const values = [solving ? solveFor(f, subject, vals) : qOf(vals, letter)];
  for (const op of chain) values.push(applyOp(op, values[values.length - 1], vals, false));
  return { letter, chain, values, solving };
}

/* What the student can actually SEE for a quantity: a dial value if it is an
   input, the computed answer if it is the subject. Nothing else may be read —
   the subject keeps a stale dial value behind it, and that number is invisible,
   so no readout, checklist or gate is ever allowed to consult it. */
function shownValue(f, subject, vals, key) {
  return key === subject ? solveFor(f, subject, vals) : qOf(vals, key);
}

/* ---- symbolic rearrangement (EDIT 5 — the equation display) --------------
   Precedence-aware so the parentheses land where a teacher would put them:
   3 = atom, 2 = multiply/divide, 1 = add/subtract. */
const wrap = (e, need) => (e.p < need ? `(${e.t})` : e.t);

/* How an operand is written: a letter, an explicit symbol, or the number. */
const kLabel = (op) => (op.by ? op.by : op.sym != null ? op.sym : qStr(op.k));

function rearranged(f, subject) {
  if (subject === f.lhs) return f.display;
  let e = { t: f.lhs, p: 3 };
  const c = f.chain[subject];
  for (let i = c.length - 1; i >= 0; i--) {
    const op = c[i];
    const k = kLabel(op);
    switch (op.op) {
      case 'mul':
        e = { t: `${wrap(e, 2)} ÷ ${k}`, p: 2 };
        break;
      case 'div':
        e = { t: `${wrap(e, 2)} · ${k}`, p: 2 };
        break;
      case 'add':
        e = { t: `${wrap(e, 1)} ${MINUS} ${k}`, p: 1 };
        break;
      case 'sub':
        e = { t: `${wrap(e, 1)} + ${k}`, p: 1 };
        break;
      default:
        throw new Error('rearranged: unknown op');
    }
  }
  return `${subject} = ${e.t}`;
}

/* The operation box labels. Forward is what the formula says; inverse is what
   undoing it says. Live values are shown under the symbol, so "× t" also reads
   "× 2" at a glance. */
function opLabel(op, inverse) {
  const kind = inverse ? INV[op.op] : op.op;
  const sym = { mul: '×', div: '÷', add: '+', sub: MINUS }[kind];
  return `${sym} ${kLabel(op)}`;
}
function opValueLabel(op, vals, inverse) {
  if (!op.by) return null; // a constant already shows its own number
  const kind = inverse ? INV[op.op] : op.op;
  const sym = { mul: '×', div: '÷', add: '+', sub: MINUS }[kind];
  return `${sym} ${qStr(qOf(vals, op.by))}`;
}

/* The substitution check: put every value back into the ORIGINAL formula.
   This is exactly the pencil-and-paper habit — and because the model is
   rational, the "=" is a real equals, not a rounding. */
function checkLine(f, subject, vals) {
  let out = '';
  for (const ch of f.rhs) out += f.quantities[ch] ? `(${qStr(shownValue(f, subject, vals, ch))})` : ch;
  return `${out} = ${qStr(shownValue(f, subject, vals, f.lhs))}`;
}

/* Snap a computed value onto a dial's grid when that quantity stops being the
   answer and becomes an input again. qNum is safe here: it only chooses WHICH
   grid point, and the grid point itself is exact. */
function snapToGrid(q, spec) {
  const steps = Math.round((spec.max - spec.min) / spec.step);
  const k = Math.round((qNum(q) - spec.min) / spec.step);
  return spec.min + Math.max(0, Math.min(steps, k)) * spec.step;
}

/* ============================================================================
   EDIT 6 — CALIBRATION. Not a curve match: a MODELLING challenge, which is
   what HSA-CED.A.4 actually asks for. The lab poses a word problem; the
   student must choose the right formula, highlight the right quantity, and
   place the givens. The lab then hands back the answer.

   THE STAMP CANNOT FIRE FALSELY. It is gated on exact equality of every
   requirement AND on the computed answer matching the task's independently
   stated answer. The meter is capped at 99% until every requirement is met, so
   100% and CALIBRATED are the same event. audit-formula.mjs sweeps every
   reachable state against every task and proves pct === 100 ⇔ correct setup.
   ========================================================================== */
const TASKS = [
  { fid: 'trip', subject: 'r', given: { d: 150, t: 3 }, answer: [50, 1], text: 'A school bus covers 150 miles in 3 hours. How fast is it going?' },
  { fid: 'trip', subject: 't', given: { d: 240, r: 60 }, answer: [4, 1], text: 'A car has 240 miles to drive and holds a steady 60 mi/h. How long will the drive take?' },
  { fid: 'trip', subject: 'd', given: { r: 55, t: 2.5 }, answer: [275, 2], text: 'A truck drives at 55 mi/h for 2.5 hours. How far does it get?' },
  { fid: 'temp', subject: 'C', given: { F: 77 }, answer: [25, 1], text: 'The forecast says 77 °F. What is that temperature in Celsius?' },
  { fid: 'temp', subject: 'C', given: { F: 14 }, answer: [-10, 1], text: 'A cold morning reads 14 °F. What is that in Celsius?' },
  { fid: 'temp', subject: 'F', given: { C: 35 }, answer: [95, 1], text: 'A hot day in Madrid hits 35 °C. What is that in Fahrenheit?' },
  { fid: 'tri', subject: 'h', given: { A: 24, b: 6 }, answer: [8, 1], text: 'A triangular sail has area 24 cm² on the plan and a base of 6 cm. How tall is it?' },
  { fid: 'tri', subject: 'b', given: { A: 30, h: 5 }, answer: [12, 1], text: 'A triangle has area 30 cm² and height 5 cm. How long is its base?' },
  { fid: 'tri', subject: 'A', given: { b: 9, h: 4 }, answer: [18, 1], text: 'A triangle has base 9 cm and height 4 cm. What is its area?' },
  { fid: 'rect', subject: 'l', given: { P: 30, w: 4 }, answer: [11, 1], text: 'A rectangular garden has a 30 cm border on the plan and is 4 cm wide. How long is it?' },
  { fid: 'rect', subject: 'w', given: { P: 44, l: 13 }, answer: [9, 1], text: 'A rectangle has perimeter 44 cm and length 13 cm. How wide is it?' },
];

function taskAnswerQ(task) {
  return Q(task.answer[0], task.answer[1]);
}

/* How much of the setup is right. Every comparison is exact, and every value
   compared is one the student can actually see (shownValue) — never a hidden
   dial sitting behind a computed quantity. */
function calibScore(task, fid, subject, vals) {
  const f = BY_ID[fid];
  const fOK = fid === task.fid;
  const sOK = fOK && subject === task.subject;
  const givens = Object.entries(task.given);
  let gOK = 0;
  if (fOK) {
    for (const [k, v] of givens) {
      if (qEq(shownValue(f, subject, vals, k), qFromDecimal(v))) gOK++;
    }
  }
  const met = (fOK ? 1 : 0) + (sOK ? 1 : 0) + gOK;
  const total = 2 + givens.length;
  // The answer check is deliberately redundant with the three above — it is a
  // second lock on the stamp, and the audit proves it can never disagree.
  const computed = fOK ? solveFor(f, subject, vals) : null;
  const solved = met === total && computed !== null && qEq(computed, taskAnswerQ(task));
  return { met, total, solved, fOK, sOK, pct: solved ? 100 : Math.min(99, Math.round((100 * met) / total)) };
}

function makeTask(prev) {
  let t;
  do {
    t = TASKS[Math.floor(Math.random() * TASKS.length)];
  } while (prev && t === prev && TASKS.length > 1);
  return t;
}

/* ============================================================================
   EDIT 4 — THE LESSON. One idea per step; one control unlocks per step; the
   reveal lives in `feedback`, never in `body`; Next is gated on ANSWERED, not
   on CORRECT. Every distractor below is a misconception students actually
   hold, not a filler wrong answer.
   ========================================================================== */
const STEPS = [
  {
    title: 'What a formula is',
    body:
      'A formula is a rule that ties quantities together. This one says distance equals rate times time — ' +
      'true for every trip anyone has ever taken. The letters are not decoration: each one holds a number, ' +
      'and each number comes with a unit. Nothing is live yet; just read the rule.',
    q: 'In the formula d = r · t, what do the letters stand for?',
    choices: [
      'Quantities — each letter holds a number, and that number has a unit',
      'Words — d is just short for “drive”',
      'The same number, written three different ways',
    ],
    answer: 0,
    feedback:
      'Each letter is a quantity: d is a distance in miles, r is a rate in miles per hour, t is a time in ' +
      'hours. A letter is never an abbreviation for a word — it stands for the NUMBER you measured. That is ' +
      'why you can put 60 where r is, and why the three letters almost never hold the same number.',
  },
  {
    title: 'Substitute what you know',
    body:
      'The r dial is live. Substituting means replacing a letter with the number it stands for. Slide r and ' +
      'watch the answer chip on the right: it recomputes instantly, because the formula ties them together.',
    q: 'Right now r = 60 mi/h and t = 2 h, so d = 120 mi. You slide r up to 70. What happens to d?',
    choices: [
      'It changes to 140 — d depends on r',
      'It stays 120 — d was already worked out',
      'r and t swap places',
    ],
    answer: 0,
    feedback:
      'd = 70 · 2 = 140 mi. A formula is not a one-time calculation you finish and file away — it is a ' +
      'standing relationship. Change any quantity it depends on and the answer moves with it, every time.',
  },
  {
    title: 'Evaluate the formula',
    body:
      'Now the t dial unlocks too. With both knowns set, the formula hands you the third quantity. Read the ' +
      'check line under the spine: it puts your numbers back into the original formula and shows it holding.',
    q: 'Evaluate d = r · t when r = 45 mi/h and t = 4 h.',
    choices: ['180 mi — that is 45 · 4', '49 mi — that is 45 + 4', '11.25 mi — that is 45 ÷ 4'],
    answer: 0,
    feedback:
      'd = 45 · 4 = 180 mi. The dot between r and t means multiply, so substituting gives (45) · (4). The ' +
      'units confirm it: miles-per-hour times hours leaves miles. Adding or dividing here would leave you ' +
      'holding a number that is not a distance at all.',
  },
  {
    title: 'A formula is a chain',
    body:
      'Here is the idea the whole lab turns on. Read the formula as a machine that acts on ONE letter: start ' +
      'at r, run it through the boxes, and out comes d. The box shows both the symbol and its live value. ' +
      'Press “Run the round trip” to watch a number travel the chain.',
    q: 'Reading d = r · t as a machine that starts at r, what single operation turns r into d?',
    choices: ['× t — multiply by the time', '+ t — add the time', '÷ t — divide by the time'],
    answer: 0,
    feedback:
      'One box: × t. With t = 2 h fixed, the machine takes any rate and doubles it to give the distance. ' +
      'Every formula can be read this way — as a short chain of operations applied to the letter you start ' +
      'from. Once you can see the chain, you can run it in reverse, which is the next step.',
  },
  {
    title: 'Turn the formula around',
    body:
      'The “solve for” control is live. Choose r and watch the accent travel: r becomes the answer, d becomes ' +
      'a dial you set. A second row of boxes appears underneath — the UNDO row. Each box is the inverse of ' +
      'the one directly above it, and you read the spine right to left. Run the round trip again: it undoes ' +
      'back to r, then substitutes forward and lands exactly where it started.',
    q: 'You know a trip was d = 150 mi and took t = 3 h. To get the rate r, what do you do?',
    choices: [
      'Divide: r = d ÷ t = 50 mi/h',
      'Multiply: r = d · t = 450 mi/h',
      'Subtract: r = d − t = 147 mi/h',
    ],
    answer: 0,
    feedback:
      'r = 150 ÷ 3 = 50 mi/h. The formula multiplies r by t to make d, so to get back to r you undo that ' +
      'multiplication — you divide by t. Multiplying again would take you further away, and subtracting is ' +
      'not even the right kind of operation to undo a multiplication. Check it: 50 · 3 = 150. ✓',
  },
  {
    title: 'Undo in reverse order',
    body:
      'The formula library is open — switch to the temperature formula. Its chain has TWO boxes: multiply by ' +
      '9/5, then add 32. When you solve for C, you walk back through them from the right, so the LAST thing ' +
      'the formula did is the FIRST thing you undo. Order matters now.',
    q: 'For F = 9/5 · C + 32, which do you undo first to solve for C?',
    choices: [
      'Undo the + 32 first (subtract 32), then undo the × 9/5',
      'Undo the × 9/5 first, then subtract 32',
      'Either order — it makes no difference',
    ],
    answer: 0,
    feedback:
      'Subtract 32 first, then divide by 9/5: C = (F − 32) ÷ 9/5, which is usually written C = 5/9 (F − 32). ' +
      'Order is not a style choice here. Try boiling water, F = 212, the wrong way: 5/9 · 212 = 117.78, then ' +
      '− 32 gives 85.78 °C — not boiling. The right way: 212 − 32 = 180, then 5/9 · 180 = 100 °C. ✓ Undo the ' +
      'chain backwards, and each box becomes its inverse.',
  },
  {
    title: 'The modelling challenge',
    body:
      'Last one. Read the problem, then set the lab up to answer it: pick the right formula, highlight the ' +
      'quantity you are missing, and dial in what the problem tells you. The lab will hand you the answer — ' +
      'your job is the modelling. The checklist tracks what is still missing.',
    calib: true,
  },
];

/* Small neutral glyphs for the formula library — identification, not
   mathematics. The pictures of these shapes belong to AreaLab and its
   neighbours; these are 16px icons on a chip. */
function FIcon({ id }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      {id === 'trip' && (
        <g {...p}>
          <path d="M1.5 11.5h13" />
          <path d="M11.5 8.5l3 3-3 3" />
          <path d="M2 4.5h3M7 4.5h3M12 4.5h2" />
        </g>
      )}
      {id === 'temp' && (
        <g {...p}>
          <path d="M6.5 9.2V3.2a1.5 1.5 0 013 0v6a3 3 0 11-3 0z" />
          <path d="M8 6.5v3.2" />
        </g>
      )}
      {id === 'tri' && (
        <g {...p}>
          <path d="M2 13h12L8 3z" />
        </g>
      )}
      {id === 'rect' && (
        <g {...p}>
          <rect x="2" y="4.5" width="12" height="7" rx="0.6" />
        </g>
      )}
    </svg>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function FormulaLab() {
  const [fid, setFid] = useState(START_FID);
  const [subjects, setSubjects] = useState(START_SUBJECTS);
  const [vals, setVals] = useState(START_VALS);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [task, setTask] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const animRef = useRef({ phase: null, p: 0 });
  const rafRef = useRef(0);
  const safeRef = useRef(0);
  const playingRef = useRef(false);

  const current = STEPS[step];
  const calib = !!current.calib;
  const f = BY_ID[fid];
  const subject = subjects[fid];
  const fv = vals[fid];

  const answer = solveFor(f, subject, fv);
  const sp = spine(f, subject, fv);
  const spec = f.quantities[subject];
  const impossible = spec.positive && qCmp(answer, ZERO) <= 0;

  // single source of truth for the renderer
  sceneRef.current = { ...sceneRef.current, fid, subject, vals: fv, step, calib };

  const score = task && calib ? calibScore(task, fid, subject, fv) : null;

  /* ---- controls unlock one per step ------------------------------------- */
  // step 1 frees the first known dial, step 2 the rest, step 3 the round trip,
  // step 4 the subject selector, step 5 the formula library.
  const knownsUnlocked = step >= 2 ? Infinity : step >= 1 ? 1 : 0;
  const tripUnlocked = step >= 3;
  const subjectUnlocked = step >= 4;
  const libraryUnlocked = step >= 5;

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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const F = BY_ID[S.fid];
    const SUB = S.subject;
    const V = S.vals;
    const P = spine(F, SUB, V);
    const solving = P.solving;
    const n = P.values.length - 1;
    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

    /* quadrille paper */
    const cell = 26;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    for (let gx = cell; gx < W; gx += cell) {
      const X = Math.round(gx) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    for (let gy = cell; gy < H; gy += cell) {
      const Y = Math.round(gy) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    /* Shrink a line's font until it fits the stage — the canvas is fluid and a
       phone gives it barely half the width a laptop does. */
    const fitFont = (text, weight, base, maxW) => {
      ctx.font = `${weight} ${base}px ${MONO}`;
      const w = ctx.measureText(text).width;
      const size = w > maxW ? Math.max(8, (base * maxW) / w) : base;
      ctx.font = `${weight} ${size}px ${MONO}`;
      return size;
    };

    /* ---- the banner: the formula as written, subject letter in carmine ---- */
    {
      fitFont(F.display, 600, 21, W - 24);
      const runs = [];
      for (const ch of F.display) runs.push({ t: ch, q: !!F.quantities[ch] && ch });
      const total = runs.reduce((s, r) => s + ctx.measureText(r.t).width, 0);
      let x = W / 2 - total / 2;
      const y = Math.round(H * 0.13);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (const r of runs) {
        ctx.fillStyle = r.q === SUB ? CURVE : INK;
        ctx.fillText(r.t, x, y);
        x += ctx.measureText(r.t).width;
      }
      ctx.font = `11px ${MONO}`;
      ctx.fillStyle = 'rgba(91,107,123,0.95)';
      ctx.textAlign = 'center';
      ctx.fillText(F.name.toUpperCase(), W / 2, y - 24);
    }

    /* ---- layout the spine ------------------------------------------------ */
    ctx.font = `700 15px ${MONO}`;
    const chipW = P.values.map((v) => Math.max(54, ctx.measureText(qStr(v)).width + 22));
    ctx.font = `600 12.5px ${MONO}`;
    const segW = P.chain.map((op) => {
      const a = ctx.measureText(opLabel(op, false)).width;
      const b = ctx.measureText(opLabel(op, true)).width;
      return Math.max(78, Math.max(a, b) + 30);
    });
    const totalW = chipW.reduce((s, w) => s + w, 0) + segW.reduce((s, w) => s + w, 0);
    const spineY = Math.round(H * 0.5);
    const chipX = [];
    const segMid = [];
    {
      let x = W / 2 - totalW / 2;
      for (let i = 0; i <= n; i++) {
        chipX.push(x + chipW[i] / 2);
        x += chipW[i];
        if (i < n) {
          segMid.push(x + segW[i] / 2);
          x += segW[i];
        }
      }
    }

    /* AUTO-FIT (the CylinderLab/CubeLab precedent): the spine is laid out at
       its natural size, then the whole thing — boxes, chips, text and all — is
       scaled about the stage centre so it always fits the width. Reserving the
       caption gutter on BOTH sides keeps the spine centred. */
    const capW = solving && n > 0 ? 74 : 0;
    const fit = Math.min(1, (W - 16) / (totalW + 2 * capW));
    ctx.save();
    ctx.translate(W / 2, spineY);
    ctx.scale(fit, fit);
    ctx.translate(-W / 2, -spineY);

    /* ---- connector segments, with a travel arrow ------------------------- */
    const CH = 34; // chip height
    for (let i = 0; i < n; i++) {
      const x0 = chipX[i] + chipW[i] / 2;
      const x1 = chipX[i + 1] - chipW[i + 1] / 2;
      ctx.strokeStyle = solving ? CURVE : INK;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x0, spineY);
      ctx.lineTo(x1, spineY);
      ctx.stroke();
      // arrowhead in the direction of travel: right when evaluating, left when solving
      const mid = (x0 + x1) / 2;
      const dir = solving ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(mid + dir * 5, spineY);
      ctx.lineTo(mid - dir * 4, spineY - 4.5);
      ctx.lineTo(mid - dir * 4, spineY + 4.5);
      ctx.closePath();
      ctx.fillStyle = solving ? CURVE : INK;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    /* ---- the operation boxes: forward above, undo below ------------------ */
    const box = (cx, cy, op, inverse, active) => {
      const label = opLabel(op, inverse);
      const sub = opValueLabel(op, V, inverse);
      ctx.font = `600 12.5px ${MONO}`;
      const w = Math.max(46, ctx.measureText(label).width + 18);
      const h = sub ? 32 : 24;
      const col = active ? CURVE : INK_SOFT;
      ctx.globalAlpha = active ? 1 : 0.5;
      ctx.fillStyle = PAPER;
      ctx.strokeStyle = col;
      ctx.lineWidth = active ? 1.8 : 1.2;
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, sub ? cy - 6 : cy);
      if (sub) {
        ctx.font = `10.5px ${MONO}`;
        ctx.globalAlpha = active ? 0.75 : 0.4;
        ctx.fillText(sub, cx, cy + 8);
      }
      ctx.globalAlpha = 1;
      return h;
    };

    const rowUp = spineY - 40;
    const rowDn = spineY + 40;
    for (let i = 0; i < n; i++) {
      // the tie between an operation and its inverse, drawn first, behind
      if (solving) {
        ctx.strokeStyle = 'rgba(28,43,58,0.16)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(segMid[i], rowUp + 14);
        ctx.lineTo(segMid[i], rowDn - 14);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      box(segMid[i], rowUp, P.chain[i], false, !solving);
      if (solving) box(segMid[i], rowDn, P.chain[i], true, true);
    }

    /* row captions, only when both rows are showing */
    if (solving && n > 0) {
      ctx.font = `9.5px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const lx = Math.max(6, W / 2 - totalW / 2 - 66);
      ctx.fillStyle = 'rgba(91,107,123,0.85)';
      ctx.fillText('AS WRITTEN', lx, rowUp);
      ctx.fillStyle = CURVE;
      ctx.fillText('TO UNDO', lx, rowDn);
    }

    /* ---- the chips ------------------------------------------------------- */
    for (let i = 0; i <= n; i++) {
      const named = i === 0 ? P.letter : i === n ? F.lhs : null;
      const isAnswer = named === SUB;
      const cx = chipX[i];
      const w = chipW[i];
      ctx.fillStyle = isAnswer ? 'rgba(200,30,79,0.08)' : PAPER;
      ctx.strokeStyle = isAnswer ? CURVE : named ? INK : 'rgba(91,107,123,0.55)';
      ctx.lineWidth = isAnswer ? 2.2 : named ? 1.5 : 1;
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, spineY - CH / 2, w, CH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.font = `700 15px ${MONO}`;
      ctx.fillStyle = isAnswer ? CURVE : named ? INK : INK_SOFT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(qStr(P.values[i]), cx, spineY);
      if (named) {
        ctx.font = `italic 600 14px "Iowan Old Style", Palatino, Georgia, serif`;
        ctx.fillStyle = isAnswer ? CURVE : INK;
        ctx.fillText(named, cx, spineY - CH / 2 - 11);
        ctx.font = `10px ${MONO}`;
        ctx.fillStyle = 'rgba(91,107,123,0.95)';
        ctx.fillText(F.quantities[named].unit, cx, spineY + CH / 2 + 10);
      }
    }

    /* ---- the travelling token (the round trip) --------------------------- */
    const A = animRef.current;
    if (A.phase) {
      const from = A.phase === 'fwd' ? chipX[0] : chipX[n];
      const to = A.phase === 'fwd' ? chipX[n] : chipX[0];
      const x = from + (to - from) * A.p;
      let idx = 0;
      if (A.phase === 'fwd') {
        for (let i = 0; i <= n; i++) if (chipX[i] <= x + 0.5) idx = i;
      } else {
        idx = n;
        for (let i = n; i >= 0; i--) if (chipX[i] >= x - 0.5) idx = i;
      }
      const lab = qStr(P.values[idx]);
      // The token rides OUTSIDE the operation rows — above the "as written"
      // row going forward, below the "to undo" row coming back — so it never
      // sits on a box, and its lane says which row it is travelling through.
      const y = spineY + (A.phase === 'fwd' ? -74 : 74);
      const labY = y + (A.phase === 'fwd' ? -16 : 16);
      ctx.fillStyle = CURVE;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `700 11px ${MONO}`;
      const tw = ctx.measureText(lab).width;
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(x - tw / 2 - 4, labY - 7, tw + 8, 14);
      ctx.fillStyle = CURVE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lab, x, labY);
    }
    ctx.restore(); // end AUTO-FIT

    /* ---- the rearranged formula + the substitution check ------------------ */
    {
      // anchored below the spine (not at a fraction of H) so the token lane can
      // never run into it on a short stage
      const y = Math.min(H - 30, spineY + 104);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const req = rearranged(F, SUB);
      fitFont(req, 700, 16, W - 20);
      ctx.fillStyle = CURVE;
      ctx.fillText(req, W / 2, y);

      const chk = `check:  ${checkLine(F, SUB, V)}  ✓`;
      fitFont(chk, '', 12, W - 20);
      ctx.fillStyle = 'rgba(91,107,123,0.95)';
      ctx.fillText(chk, W / 2, y + 22);
    }

    /* ---- the physical-sense note (a formula can answer, and still be wrong
            about the world — a length is never negative) ------------------- */
    {
      const q = F.quantities[SUB];
      const val = P.solving ? P.values[0] : P.values[n];
      if (q.positive && qCmp(val, ZERO) <= 0) {
        const msg = `⚠  ${SUB} = ${qStr(val)} ${q.unit} — a ${q.name} cannot be negative.`;
        fitFont(msg, '', 11.5, W - 20);
        ctx.fillStyle = INK;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(msg, W / 2, Math.min(H - 8, spineY + 148));
      }
    }
  }, []);

  useEffect(() => {
    draw();
  }, [fid, subjects, vals, step, task, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* entering the challenge resets the bench, so nothing is ever pre-solved */
  useEffect(() => {
    if (STEPS[step].calib) {
      setFid(START_FID);
      setSubjects(START_SUBJECTS);
      setVals(START_VALS);
      setTask((t) => t || makeTask(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* The round trip is pure flourish: the spine already shows every value at
     rest, so under reduced motion there is nothing to "jump" to. Rather than
     leave a button that cannot do anything, we disable it and say why. */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(safeRef.current);
    },
    []
  );

  /* ---- interaction ------------------------------------------------------- */
  const setVal = (key, value) => {
    setVals((v) => ({ ...v, [fid]: { ...v[fid], [key]: parseFloat(value) } }));
  };

  /* Flipping the subject keeps the SITUATION: the quantity that was the answer
     becomes a dial, seeded with the value it was just showing. */
  const chooseSubject = (next) => {
    if (next === subject) return;
    const seeded = snapToGrid(solveFor(f, subject, fv), f.quantities[subject]);
    setVals((v) => ({ ...v, [fid]: { ...v[fid], [subject]: seeded } }));
    setSubjects((s) => ({ ...s, [fid]: next }));
  };

  const runTrip = () => {
    if (playingRef.current) return;
    const reduced =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
    if (reduced) return; // the steady picture is already the whole truth
    const solving = subject !== f.lhs;
    const DUR = solving ? 2600 : 1400;
    playingRef.current = true;
    setPlaying(true);
    const stop = () => {
      animRef.current = { phase: null, p: 0 };
      playingRef.current = false;
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
      draw();
    };
    const t0 = performance.now();
    const tick = (now) => {
      const e = (now - t0) / DUR;
      if (e >= 1) return stop();
      animRef.current = solving
        ? e < 0.5
          ? { phase: 'back', p: e / 0.5 }
          : { phase: 'fwd', p: (e - 0.5) / 0.5 }
        : { phase: 'fwd', p: e };
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    clearTimeout(safeRef.current);
    safeRef.current = setTimeout(stop, DUR + 900); // rAF never fires in a hidden tab
  };

  const resetBench = () => {
    setSubjects((s) => ({ ...s, [fid]: START_SUBJECTS[fid] }));
    setVals((v) => ({ ...v, [fid]: { ...START_VALS[fid] } }));
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

  const knowns = f.order.filter((k) => k !== subject);
  const spoken =
    `Formula: ${f.display}. Solving for ${subject}, the ${spec.name}. ` +
    knowns.map((k) => `${k} is ${qStr(qOf(fv, k))} ${f.quantities[k].unit}`).join(', ') +
    `. So ${subject} = ${qFull(answer)} ${spec.unit}.` +
    (impossible ? ` Warning: a ${spec.name} cannot be negative.` : '') +
    (score && score.solved ? ' Calibrated — the challenge is solved.' : '');

  return (
    <div className="flab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Formulas</h1>
        <p className="lede">
          A <em>formula</em> is a rule that ties quantities together — put in what you know, and it
          hands you what you don’t. Read one as a <em>chain of operations</em>, then learn the move
          that unlocks all of them: to solve for a different letter, walk the chain{' '}
          <em>backwards</em>, turning every operation into its opposite.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">{rearranged(f, subject)}</p>
            <p className="equation-sub mono">
              {subject} = {qFull(answer)} {spec.unit}
            </p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {subject === f.lhs
                ? `the formula gives you ${subject} — read the spine left to right`
                : `solving for ${subject} — read the spine right to left`}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="sw" style={{ background: CURVE }} /> the subject — what the formula
              gives you
            </span>
            <span className="lg">
              <span className="bx" /> an operation in the chain
            </span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Solving for</span>
              <span className="fact-v mono" style={{ color: CURVE, fontWeight: 700 }}>
                {subject} · {spec.name}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Answer</span>
              <span className="fact-v mono" style={{ color: CURVE, fontWeight: 700 }}>
                {qFull(answer)} {spec.unit}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Rearranged</span>
              <span className="fact-v mono">{rearranged(f, subject)}</span>
              {f.alt && f.alt[subject] && (
                <span className="fact-alt mono">usually written {f.alt[subject]}</span>
              )}
            </div>
            <div className="fact">
              <span className="fact-k">Check (back into the formula)</span>
              <span className="fact-v mono">{checkLine(f, subject, fv)} ✓</span>
            </div>
          </div>

          {impossible && (
            <p className="warn">
              This setup gives {subject} = {qStr(answer)} {spec.unit}. The arithmetic is right, but a{' '}
              {spec.name} cannot be negative — no rectangle has those measurements. A formula will
              always hand you a number; deciding whether it can be true is your job.
            </p>
          )}

          <div className="toolbar">
            <button
              type="button"
              className="btn"
              onClick={runTrip}
              disabled={!tripUnlocked || playing || reduced}
              title={
                reduced
                  ? 'Your system asks for reduced motion, so the walk-through is off — every value it would show is already on the spine.'
                  : tripUnlocked
                  ? undefined
                  : 'unlocks at step 4'
              }
            >
              {playing ? 'Running…' : subject === f.lhs ? '▶ Run the chain' : '▶ Run the round trip'}
            </button>
            <button type="button" className="btn ghost" onClick={resetBench}>
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

          <div className={'ctl' + (libraryUnlocked ? '' : ' locked')}>
            <span className="ctl-k">Formula {libraryUnlocked ? '' : '🔒'}</span>
            <div className="lib" role="group" aria-label="Choose a formula">
              {FORMULAS.map((ff) => (
                <button
                  key={ff.id}
                  type="button"
                  className={'chip lib-chip' + (ff.id === fid ? ' on' : '')}
                  aria-pressed={ff.id === fid}
                  disabled={!libraryUnlocked}
                  onClick={() => setFid(ff.id)}
                >
                  <FIcon id={ff.id} />
                  <span className="mono">{ff.display}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={'ctl' + (subjectUnlocked ? '' : ' locked')}>
            <span className="ctl-k">Solve for {subjectUnlocked ? '' : '🔒'}</span>
            <div className="seg" role="group" aria-label="Choose the quantity to solve for">
              {f.order.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={'chip' + (k === subject ? ' on' : '')}
                  aria-pressed={k === subject}
                  disabled={!subjectUnlocked}
                  onClick={() => chooseSubject(k)}
                >
                  <span className="letter">{k}</span>
                  <span className="qname">{f.quantities[k].name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="dials">
            {f.order.map((k) => {
              const q = f.quantities[k];
              if (k === subject) {
                return (
                  <div className="dial answer" key={k}>
                    <span className="dk">{k}</span>
                    <span className="drole">{q.name} · the formula gives you this</span>
                    <output className="dv big">
                      {qStr(answer)} <span className="unit">{q.unit}</span>
                    </output>
                  </div>
                );
              }
              const idx = knowns.indexOf(k);
              const unlocked = idx < knownsUnlocked;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={k}>
                  <span className="dk">{k}</span>
                  <span className="drole">
                    {unlocked ? `${q.name} · ${q.unit}` : 'unlocks soon'}
                  </span>
                  <input
                    type="range"
                    min={q.min}
                    max={q.max}
                    step={q.step}
                    value={fv[k]}
                    disabled={!unlocked}
                    aria-label={`Dial ${k} — ${q.name} in ${q.unit}`}
                    onChange={(e) => setVal(k, e.target.value)}
                  />
                  <output className="dv">{unlocked ? qStr(qFromDecimal(fv[k])) : '🔒'}</output>
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

          {calib && task && score && (
            <div className="calib">
              <p className="task">{task.text}</p>

              <ul className="reqs">
                <li className={score.fOK ? 'hit' : ''}>
                  <span className="tick">{score.fOK ? '✓' : '○'}</span> the right formula
                </li>
                <li className={score.sOK ? 'hit' : ''}>
                  <span className="tick">{score.sOK ? '✓' : '○'}</span> solving for the missing
                  quantity
                </li>
                {/* The givens are named only once the formula is chosen —
                    otherwise the checklist would hand over the modelling by
                    naming the very letters the student is meant to pick. */}
                {score.fOK ? (
                  Object.entries(task.given).map(([k, v]) => {
                    const on = qEq(shownValue(f, subject, fv, k), qFromDecimal(v));
                    return (
                      <li key={k} className={on ? 'hit' : ''}>
                        <span className="tick">{on ? '✓' : '○'}</span> dial{' '}
                        <span className="mono">
                          {k} = {v} {f.quantities[k].unit}
                        </span>
                      </li>
                    );
                  })
                ) : (
                  <li>
                    <span className="tick">○</span> then dial in the{' '}
                    {Object.keys(task.given).length === 1
                      ? 'number'
                      : `${Object.keys(task.given).length} numbers`}{' '}
                    the problem gives you
                  </li>
                )}
              </ul>

              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: score.pct + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{score.pct}%</span>
                {score.solved ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">set up the bench to answer it</span>
                )}
              </div>
              {score.solved && (
                <p className="solved mono">
                  {task.subject} = {qFull(answer)} {BY_ID[task.fid].quantities[task.subject].unit}
                </p>
              )}
              <button type="button" className="btn ghost" onClick={() => setTask(makeTask(task))}>
                New challenge
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
                  setTask(null);
                  setFid(START_FID);
                  setSubjects(START_SUBJECTS);
                  setVals(START_VALS);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">d = r · t</span> &nbsp;·&nbsp; a formula relates quantities; solving
        for a different one means undoing its chain of operations in reverse order. Every value here
        is exact rational arithmetic, so the round-trip check lands exactly home.
        CCSS&nbsp;6.EE.A.2c, 7.EE.B.4, HSA-CED.A.4.
      </footer>

      <style jsx>{`
        .flab {
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
          grid-template-columns: minmax(0, 1fr) 352px;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 940px) {
          /* minmax(0,1fr), not 1fr: an auto-min track lets a wide child push
             the column past the viewport instead of shrinking to it */
          .bench {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        /* The spine needs a fixed vertical budget — banner, two operation rows,
           the token lanes, the rearranged formula, the check line. Below ~640px
           the 16/10 ratio stops paying for that, so height is pinned instead.
           (aspect-ratio and min-height must never both apply: the ratio would
           then demand a width to match, and blow out the layout.) */
        @media (max-width: 640px) {
          .stage {
            aspect-ratio: auto;
            height: 360px;
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
          font-size: 13px;
          margin: 0;
        }
        .stage {
          position: relative;
          width: min(100%, 660px);
          aspect-ratio: 16 / 10;
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
        .bx {
          width: 16px;
          height: 10px;
          border-radius: 3px;
          border: 1px solid var(--ink-soft);
          display: inline-block;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin: 12px 4px 4px;
        }
        @media (max-width: 520px) {
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
        .fact-alt {
          font-size: 11.5px;
          color: var(--ink-soft);
          overflow-wrap: anywhere;
        }
        .warn {
          margin: 10px 4px 0;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--ink);
          background: rgba(91, 107, 123, 0.08);
          border-left: 3px solid var(--ink-soft);
          padding: 9px 11px;
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
        .ctl {
          margin-bottom: 14px;
        }
        .ctl.locked {
          opacity: 0.45;
        }
        .ctl-k {
          display: block;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 6px;
        }
        .lib {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .seg {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(28, 43, 58, 0.22);
          background: var(--paper);
          color: var(--ink);
          border-radius: 8px;
          padding: 7px 9px;
          cursor: pointer;
          font: 12px/1.2 system-ui, sans-serif;
          transition: border-color 0.15s, background 0.15s;
          min-width: 0;
        }
        .lib-chip .mono {
          font-size: 11.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chip:not(:disabled):hover {
          border-color: var(--ink);
        }
        .chip.on {
          border-color: var(--curve);
          background: rgba(200, 30, 79, 0.07);
          color: var(--curve);
        }
        .chip:disabled {
          cursor: not-allowed;
        }
        .chip .letter {
          font-family: var(--serif);
          font-style: italic;
          font-size: 16px;
          font-weight: 600;
        }
        .chip .qname {
          color: var(--ink-soft);
          font-size: 11px;
        }
        .chip.on .qname {
          color: var(--curve);
        }
        .dials {
          display: grid;
          gap: 12px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 22px 1fr 74px;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 2px 10px;
        }
        .dial.locked {
          opacity: 0.5;
        }
        .dial.answer {
          background: rgba(200, 30, 79, 0.05);
          border: 1px solid rgba(200, 30, 79, 0.25);
          border-radius: 8px;
          padding: 7px 9px;
          grid-template-columns: 22px 1fr auto;
        }
        .dk {
          grid-row: 1 / 3;
          font-family: var(--serif);
          font-style: italic;
          font-size: 19px;
        }
        .dial.answer .dk {
          color: var(--curve);
        }
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial.answer .drole {
          grid-column: 2 / 3;
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
        .dial.answer .dv {
          grid-row: 1 / 3;
        }
        .dv.big {
          font-size: 16px;
          font-weight: 700;
          color: var(--curve);
        }
        .dv .unit {
          font-size: 11px;
          font-weight: 400;
          color: var(--ink-soft);
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
        .task {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          background: var(--paper);
          border: 1px solid rgba(28, 43, 58, 0.14);
          border-radius: 8px;
          padding: 10px 12px;
        }
        .reqs {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 4px;
          font-size: 12.5px;
          color: var(--ink-soft);
        }
        .reqs li {
          display: flex;
          gap: 7px;
          align-items: baseline;
        }
        .reqs li.hit {
          color: var(--ok);
        }
        .tick {
          font-weight: 700;
          width: 10px;
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
        .solved {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: var(--ok);
          text-align: center;
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
        :global(.flab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .chip {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
