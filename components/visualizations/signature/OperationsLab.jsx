'use client';

/* ============================================================================
   OperationsLab — an interactive "bench" for the ORDER OF OPERATIONS (PEMDAS):
   the rule that gives every arithmetic expression exactly one value.

   Built for MAIS (math AI system, www.mais.ac), K-12 (grades ~5–6;
   CCSS 5.OA.A.1 write & interpret numerical expressions with parentheses and
   evaluate them, 5.OA.A.2, and the exponent strand 6.EE.A.1).

   This is the CAPSTONE of the four-operations family (AddLab · SubtractionLab ·
   MultiplicationLab · DivisionLab): it is the one lab that ties +, −, ×, ÷ (and
   exponents and parentheses) together into a single rule.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, controls that unlock one idea
   per lesson step, predict-then-check questions (Next gates on ANSWERED, not
   CORRECT), and a calibration challenge with a live match meter.

   The signature centerpiece (the analogue of the ellipse "string" or the line
   "slope triangle") is the REDUCTION LADDER — the expression collapsing one
   operation at a time, with the operation about to be applied boxed in carmine
   and the number it produces shown in carmine on the next rung, exactly as a
   teacher writes it on the board:
          3 + 4 × 2
        = 3 + 8          ← multiply first
        = 11             ← then add
   Paired with a LEFT-TO-RIGHT vs. ORDER-OF-OPERATIONS contrast that gets two
   different answers (11 vs 14) from the identical symbols — the single most
   important thing this lab teaches.

   The calibration capstone is a CONSTRUCTION goal (not a curve match): you are
   given an expression and a target, and you place a pair of parentheses so the
   expression hits the target — CCSS 5.OA.A.1's core skill.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/OperationsLab.jsx
     2. Import and render it:
          import OperationsLab from './OperationsLab';
          export default function Page() { return <OperationsLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   CORRECTNESS GUARANTEE (the #1 priority for a K-12 lab): all arithmetic is
   done with EXACT FRACTIONS (integer numerator/denominator, gcd-reduced) — a
   student NEVER sees a float artefact like 0.30000000004, and 8 ÷ 4 × 2 is
   exactly 4, never 3.9999. Division by zero (reachable via grouping, e.g.
   6 ÷ (4 − 4)) is detected and shown as "undefined", never a crash or ∞.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (numbers, operators,
              exponent, grouping, step).
     MODEL  — a pure exact-fraction expression engine with a step-tracing
              evaluator; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ===========================================================================
   MODEL — exact rational arithmetic. Every value is a fraction {n, d} in lowest
   terms with d > 0; integers are d === 1. No floating point ever reaches a
   student-visible number.
   ======================================================================== */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}
function frac(n, d = 1) {
  if (d === 0) return { n: 0, d: 0 }; // sentinel — never used, guarded upstream
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
const fadd = (x, y) => frac(x.n * y.d + y.n * x.d, x.d * y.d);
const fsub = (x, y) => frac(x.n * y.d - y.n * x.d, x.d * y.d);
const fmul = (x, y) => frac(x.n * y.n, x.d * y.d);
const fdiv = (x, y) => frac(x.n * y.d, x.d * y.n); // caller guards y ≠ 0
function fpow(x, e) {
  let r = frac(1);
  for (let i = 0; i < e; i++) r = fmul(r, x);
  return r;
}
const feq = (x, y) => x && y && x.n === y.n && x.d === y.d;
const fnum = (x) => x.n / x.d;

// Display a fraction: integer when d === 1, else n/d; a true minus sign.
function fstr(x) {
  if (!x) return '?';
  const sign = x.n < 0 ? '−' : '';
  const an = Math.abs(x.n);
  return x.d === 1 ? `${sign}${an}` : `${sign}${an}/${x.d}`;
}

// Unicode superscript for an exponent (used in text readouts; the canvas draws
// its own crisp superscript).
const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
const sup = (n) => String(n).split('').map((d) => SUP[+d]).join('');

/* ---------------------------------------------------------------------------
   Operators are stored as their real typographic glyphs so both the engine and
   the display read the same string. Precedence: ^ beats × ÷, which beat + −.
   ------------------------------------------------------------------------- */
const OPS = ['+', '−', '×', '÷']; // the four the student can pick
const prec = (o) => (o === '^' ? 3 : o === '×' || o === '÷' ? 2 : 1);

function applyOp(o, x, y) {
  if (o === '+') return fadd(x, y);
  if (o === '−') return fsub(x, y);
  if (o === '×') return fmul(x, y);
  if (o === '÷') return fdiv(x, y);
  if (o === '^') return fpow(x, y.n); // y is a small positive integer
  return null;
}

/* ---------------------------------------------------------------------------
   Tokens. A token is a number {t:'num', v:frac}, an operator {t:'op', o}, or a
   parenthesis {t:'lp'} / {t:'rp'}. The lab's expression is always the shape
        a  op1  B  op2  c
   where the middle term B is b or b^e, with an optional pair of parentheses
   grouping the left pair (a op1 B) or the right pair (B op2 c).
   ------------------------------------------------------------------------- */
const num = (v) => ({ t: 'num', v: typeof v === 'number' ? frac(v) : v });
const op = (o) => ({ t: 'op', o });
const LP = { t: 'lp' };
const RP = { t: 'rp' };
const cloneTok = (t) =>
  t.t === 'num' ? { t: 'num', v: { n: t.v.n, d: t.v.d } } : { t: t.t, o: t.o };

function buildTokens({ a, b, c, op1, op2, e, group }) {
  // The middle term is b, or b^e when an exponent is set.
  const mid = e > 1 ? [num(b), op('^'), num(e)] : [num(b)];
  if (group === 'left') return [LP, num(a), op(op1), ...mid, RP, op(op2), num(c)];
  if (group === 'right') return [num(a), op(op1), LP, ...mid, op(op2), num(c), RP];
  return [num(a), op(op1), ...mid, op(op2), num(c)];
}

/* ---------------------------------------------------------------------------
   The step-tracing evaluator. Repeatedly reduce the highest-precedence
   operation in the current scope (inside parentheses first), left-to-right for
   ties, until one number remains. Each rung records the expression state, the
   operation about to be applied (activeOpIndex), and — from the previous
   reduction — which number is freshly produced (resultIndex), so the renderer
   can box the next move and colour the last result.

   Returns { rungs, value, undef }. `undef` is true iff a ÷ 0 was hit.
   ------------------------------------------------------------------------- */
function stripTrivialParens(toks) {
  for (let i = 0; i < toks.length - 2; i++) {
    if (toks[i].t === 'lp' && toks[i + 1].t === 'num' && toks[i + 2].t === 'rp') {
      toks = [...toks.slice(0, i), toks[i + 1], ...toks.slice(i + 3)];
      i--;
    }
  }
  return toks;
}
function pickOp(toks, s, e) {
  let best = -1;
  let bestPrec = 0;
  for (let i = s; i <= e; i++) {
    if (toks[i].t === 'op') {
      const p = prec(toks[i].o);
      if (p > bestPrec) {
        // strictly greater ⇒ keep the LEFTMOST of the highest tier (left-assoc)
        bestPrec = p;
        best = i;
      }
    }
  }
  return best;
}
function nextReduction(toks) {
  // Innermost parentheses = the last '(' before its ')'. Our expressions never
  // nest, so a single scan finding the last lp before the first rp is exact.
  let lo = -1;
  let hi = -1;
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].t === 'lp') lo = i;
    else if (toks[i].t === 'rp') {
      hi = i;
      break;
    }
  }
  const s = lo >= 0 && hi > lo ? lo + 1 : 0;
  const e = lo >= 0 && hi > lo ? hi - 1 : toks.length - 1;
  const oi = pickOp(toks, s, e);
  return oi < 0 ? null : { opIndex: oi };
}

function evaluateTrace(toks0) {
  let toks = stripTrivialParens(toks0.map(cloneTok));
  const rungs = [];
  let undef = false;
  let pendingResult = null; // index of the number produced by the last reduction
  let guard = 0;
  while (guard++ < 24) {
    const nx = nextReduction(toks);
    if (nx == null) {
      rungs.push({ toks: toks.map(cloneTok), activeOpIndex: null, resultIndex: pendingResult, applied: null });
      break;
    }
    const rung = { toks: toks.map(cloneTok), activeOpIndex: nx.opIndex, resultIndex: pendingResult, applied: null };
    rungs.push(rung);

    const i = nx.opIndex;
    const o = toks[i].o;
    const x = toks[i - 1].v;
    const y = toks[i + 1].v;

    if (o === '÷' && y.n === 0) {
      rung.applied = `${fstr(x)} ÷ 0 = undefined`;
      rung.undef = true;
      undef = true;
      break;
    }
    const res = applyOp(o, x, y);
    rung.applied =
      o === '^' ? `${fstr(x)}${sup(y.n)} = ${fstr(res)}` : `${fstr(x)} ${o} ${fstr(y)} = ${fstr(res)}`;

    const rtok = { t: 'num', v: res, _res: true };
    let nt = [...toks.slice(0, i - 1), rtok, ...toks.slice(i + 2)];
    nt = stripTrivialParens(nt);
    pendingResult = nt.findIndex((t) => t._res);
    nt.forEach((t) => {
      delete t._res;
    });
    toks = nt;
  }
  const last = rungs[rungs.length - 1];
  const value = !undef && last && last.toks.length === 1 && last.toks[0].t === 'num' ? last.toks[0].v : null;
  return { rungs, value, undef };
}

/* Naive LEFT-TO-RIGHT evaluation — the classic misconception: apply operators
   in written order, ignoring precedence (and parentheses). Used only for the
   contrast panel, on expressions with no exponent. */
function evaluateLeftToRight(toks0) {
  let t = toks0.filter((k) => k.t !== 'lp' && k.t !== 'rp').map(cloneTok);
  const rungs = [{ toks: t.map(cloneTok), activeOpIndex: t.length > 1 ? 1 : null, resultIndex: null }];
  let undef = false;
  let guard = 0;
  while (t.length > 1 && guard++ < 24) {
    const o = t[1].o;
    const x = t[0].v;
    const y = t[2].v;
    if (o === '÷' && y.n === 0) {
      undef = true;
      break;
    }
    const res = applyOp(o, x, y);
    t = [{ t: 'num', v: res }, ...t.slice(3)];
    rungs.push({ toks: t.map(cloneTok), activeOpIndex: t.length > 1 ? 1 : null, resultIndex: 0 });
  }
  const value = !undef && t.length === 1 ? t[0].v : null;
  return { rungs, value, undef };
}

/* ---------------------------------------------------------------------------
   Plain-text of an expression (for the header, facts and screen-reader label).
   Handles parenthesis spacing and folds b^e into a superscript.
   ------------------------------------------------------------------------- */
function tokensText(toks) {
  const parts = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t === 'num') {
      let str = fstr(t.v);
      if (toks[i + 1] && toks[i + 1].t === 'op' && toks[i + 1].o === '^' && toks[i + 2]) {
        str += sup(toks[i + 2].v.n);
        i += 2;
      }
      parts.push({ s: str, k: 'num' });
    } else if (t.t === 'op') parts.push({ s: t.o, k: 'op' });
    else if (t.t === 'lp') parts.push({ s: '(', k: 'lp' });
    else if (t.t === 'rp') parts.push({ s: ')', k: 'rp' });
  }
  let out = '';
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const prev = parts[i - 1];
    let sep = '';
    if (i > 0) {
      if (prev.k === 'lp') sep = '';
      else if (p.k === 'rp') sep = '';
      else sep = ' ';
    }
    out += sep + p.s;
  }
  return out;
}

// A spoken version for aria (no glyphs a screen reader mangles).
function spokenText(toks) {
  const word = { '+': ' plus ', '−': ' minus ', '×': ' times ', '÷': ' divided by ', '^': ' to the power ' };
  let out = '';
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t === 'num') out += fstr(t.v).replace('−', 'negative ');
    else if (t.t === 'op') out += word[t.o] || ' ';
    else if (t.t === 'lp') out += ' open parenthesis ';
    else if (t.t === 'rp') out += ' close parenthesis ';
  }
  return out.replace(/\s+/g, ' ').trim();
}

/* ===========================================================================
   LESSON — one idea per step; a control unlocks with the step; the reveal lives
   in `feedback` (shown after answering); distractors are real misconceptions
   (add-before-multiply, "multiply before divide", exponent-includes-the-plus,
   ignore-the-parentheses). Next is gated on ANSWERED, not CORRECT.
   ======================================================================== */
const MEET = 0;
const WHY = 1;
const MULDIV = 2;
const TIES = 3;
const EXPO = 4;
const PARENS = 5;
const CALIB_STEP = 6;

// Which control unlocks when.
const NUM_UNLOCK = 0; // the three number dials
const OP_UNLOCK = 2; // the two operator pickers
const EXP_UNLOCK = 4; // the exponent
const GROUP_UNLOCK = 5; // the parentheses

const STEPS = [
  {
    title: 'Meet an expression',
    body:
      'An expression like 3 + 4 × 2 has more than one operation. Do we add first, or multiply first? ' +
      'Mathematicians agreed on one order so that every expression has exactly one answer. Watch the ' +
      'ladder: multiplication happens before addition, so 4 × 2 = 8 first, then 3 + 8 = 11.',
    q: 'In 3 + 4 × 2, which operation do we do first?',
    choices: ['4 × 2 — multiply first', '3 + 4 — just go left to right', 'It makes no difference'],
    answer: 0,
    feedback:
      'Multiply first: 4 × 2 = 8, then 3 + 8 = 11. If you added first you would get 3 + 4 = 7, then ' +
      '7 × 2 = 14 — a different answer. That clash is exactly why we need an agreed order.',
  },
  {
    title: 'One expression, two answers',
    body:
      'Read 3 + 4 × 2 straight across and it looks like 14. Follow the rule and it is 11. Same symbols, ' +
      'different answers — so the order is a real rule, not a suggestion. The rule is PEMDAS: ' +
      'Parentheses, then Exponents, then Multiply/Divide, then Add/Subtract.',
    q: 'Why does math need one agreed order of operations?',
    choices: [
      'So every expression has exactly one correct value',
      'So the answer is always the largest number',
      'So you may skip the harder operations',
    ],
    answer: 0,
    feedback:
      'Without a shared rule, 3 + 4 × 2 could be 11 or 14 and no one could say which is right. PEMDAS ' +
      'gives every expression one — and only one — value. Try changing the numbers; × still goes first.',
  },
  {
    title: 'Multiply and divide first',
    body:
      'The operator pickers are now live. Whatever the numbers, × and ÷ always resolve before + and −. ' +
      'Set up 20 − 3 × 4, or 5 + 6 ÷ 2, and watch the ×/÷ collapse before the +/−.',
    q: 'What is 20 − 3 × 4?',
    choices: [
      '8 — do 3 × 4 = 12 first, then 20 − 12',
      '68 — do 20 − 3 = 17 first, then × 4',
      '20 — ignore the × 4',
    ],
    answer: 0,
    feedback:
      '20 − 3 × 4 = 20 − 12 = 8. The × binds tighter than the −, so 3 × 4 happens first. Subtracting ' +
      '20 − 3 first would give 17 × 4 = 68 — the classic order-of-operations trap.',
  },
  {
    title: 'Ties go left to right',
    body:
      '× and ÷ share one tier; + and − share another. When two operations sit in the SAME tier, do them ' +
      'left to right — it is not "all × before all ÷". Try 8 ÷ 4 × 2: left to right gives ' +
      '(8 ÷ 4) × 2 = 4, not 8 ÷ (4 × 2) = 1.',
    q: 'What is 8 ÷ 4 × 2?',
    choices: [
      '4 — left to right: 8 ÷ 4 = 2, then 2 × 2',
      '1 — multiply first: 4 × 2 = 8, then 8 ÷ 8',
      '16 — the order does not matter here',
    ],
    answer: 0,
    feedback:
      '8 ÷ 4 × 2 = 2 × 2 = 4. Because ÷ and × are equal in rank, we work left to right. "Multiply before ' +
      'divide" is a myth: the M and D of PEMDAS are a tie — and so are the A and S.',
  },
  {
    title: 'Exponents come first',
    body:
      'The E in PEMDAS. An exponent resolves before ×, ÷, +, and − — only parentheses beat it. The ' +
      'exponent dial raises the middle number to a power. In 3 + 2³ × 4, the power goes first: 2³ = 8, ' +
      'then 8 × 4 = 32, then 3 + 32 = 35.',
    q: 'What is 2 + 3² × 2?',
    choices: [
      '20 — 3² = 9 first, then 9 × 2 = 18, then 2 + 18',
      '50 — treat it like (2 + 3)² × 2',
      '22 — do 3² = 9, then 2 + 9 = 11, then × 2',
    ],
    answer: 0,
    feedback:
      '2 + 3² × 2 = 2 + 9 × 2 = 2 + 18 = 20. The exponent acts on just the 3 (giving 9), then the × , ' +
      'then the +. An exponent outranks everything except parentheses.',
  },
  {
    title: 'Parentheses change everything',
    body:
      'Parentheses sit at the very top of the order: whatever is inside is done first, overriding the ' +
      'usual tiers. Group the left or the right pair and watch the answer move. 3 + 4 × 2 = 11, but ' +
      '(3 + 4) × 2 = 14 — the parentheses force the addition to go first.',
    q: 'Which one equals 14?',
    choices: ['(3 + 4) × 2', '3 + 4 × 2', '3 + (4 × 2)'],
    answer: 0,
    feedback:
      '(3 + 4) × 2 = 7 × 2 = 14. Parentheses do the enclosed part first, so here the addition beats the ' +
      'multiplication. Without them, 3 + 4 × 2 and 3 + (4 × 2) are both 11 — the × was already first.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. You are given an expression and a target value. Slide the Grouping control to ' +
      'place a pair of parentheses so the expression equals the target. Read each option with the order ' +
      'of operations to find the one that works. Press "New puzzle" for another.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   Calibration — a CONSTRUCTION goal: insert parentheses to hit a target
   (CCSS 5.OA.A.1). Each puzzle is a fixed expression a op1 b op2 c and a whole
   target reachable only by grouping (the no-parentheses value differs). The
   audit verifies every entry: target is a whole number, a grouping reaches it,
   the plain value does not, and no division by zero occurs.
   ------------------------------------------------------------------------- */
const PUZZLES = [
  { a: 2, op1: '+', b: 3, op2: '×', c: 4, target: 20 }, // (2 + 3) × 4
  { a: 8, op1: '−', b: 2, op2: '×', c: 3, target: 18 }, // (8 − 2) × 3
  { a: 6, op1: '÷', b: 2, op2: '+', c: 1, target: 2 }, //  6 ÷ (2 + 1)
  { a: 9, op1: '−', b: 4, op2: '−', c: 1, target: 6 }, //  9 − (4 − 1)
  { a: 8, op1: '÷', b: 2, op2: '×', c: 2, target: 2 }, //  8 ÷ (2 × 2)
  { a: 5, op1: '+', b: 5, op2: '÷', c: 5, target: 2 }, //  (5 + 5) ÷ 5
  { a: 3, op1: '×', b: 4, op2: '−', c: 2, target: 6 }, //  3 × (4 − 2)
  { a: 7, op1: '−', b: 1, op2: '×', c: 5, target: 30 }, // (7 − 1) × 5
  { a: 6, op1: '+', b: 6, op2: '÷', c: 3, target: 4 }, //  (6 + 6) ÷ 3
  { a: 2, op1: '×', b: 8, op2: '−', c: 4, target: 8 }, //  2 × (8 − 4)
];
function makePuzzle(prevIdx) {
  let i;
  do {
    i = Math.floor(Math.random() * PUZZLES.length);
  } while (PUZZLES.length > 1 && i === prevIdx);
  return { ...PUZZLES[i], idx: i };
}

const START = { a: 3, b: 4, c: 2, op1: '+', op2: '×', e: 1, group: 'none' };

/* ===========================================================================
   COMPONENT
   ======================================================================== */
export default function OperationsLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [c, setC] = useState(START.c);
  const [op1, setOp1] = useState(START.op1);
  const [op2, setOp2] = useState(START.op2);
  const [e, setE] = useState(START.e);
  const [group, setGroup] = useState(START.group);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [puzzle, setPuzzle] = useState(null);
  const [reveal, setReveal] = useState(null); // null = show whole ladder; else # of rungs

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;

  // The active expression: during calibration it is the puzzle (grouping is the
  // only live control); otherwise it is built from the dials.
  const src = calib && puzzle ? { ...puzzle, e: 1, group } : { a, b, c, op1, op2, e, group };
  const toks = buildTokens(src);
  const trace = evaluateTrace(toks);
  const value = trace.value;
  const exprText = tokensText(toks);
  const valueText = trace.undef ? 'undefined' : fstr(value);

  // Calibration meter.
  const noneTrace = calib && puzzle ? evaluateTrace(buildTokens({ ...puzzle, e: 1, group: 'none' })) : null;
  const noneVal = noneTrace ? noneTrace.value : null;
  const target = puzzle ? puzzle.target : null;
  const calibrated = calib && value && value.d === 1 && value.n === target;
  const pct = (() => {
    if (!calib || !puzzle || !value) return 0;
    const scale = Math.max(1, Math.abs((noneVal ? fnum(noneVal) : 0) - target));
    return Math.max(0, Math.min(100, 100 * (1 - Math.abs(fnum(value) - target) / scale)));
  })();

  sceneRef.current = { src, step, calib, reveal, puzzle, target };

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

    const S = sceneRef.current;
    const CARM = '#C81E4F';
    const INK = '#1C2B3A';
    const SOFT = '#5B6B7B';
    const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

    ctx.clearRect(0, 0, W, H);

    /* faint quadrille paper — the house identity, even for a typographic lab */
    const G = 26;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.55)';
    ctx.beginPath();
    for (let x = (W % G) / 2; x < W; x += G) {
      const X = Math.round(x) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    for (let y = (H % G) / 2; y < H; y += G) {
      const Y = Math.round(y) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    /* --- measure a rung's tokens into drawable "units" --------------------- */
    const measure = (rungToks, F) => {
      const PAD = 3;
      const OPGAP = Math.max(5, F * 0.34);
      const units = [];
      for (let i = 0; i < rungToks.length; i++) {
        const t = rungToks[i];
        if (t.t === 'num' && rungToks[i + 1] && rungToks[i + 1].t === 'op' && rungToks[i + 1].o === '^' && rungToks[i + 2]) {
          const baseStr = fstr(t.v);
          const expStr = String(rungToks[i + 2].v.n);
          ctx.font = `${F}px ${MONO}`;
          const bw = ctx.measureText(baseStr).width;
          ctx.font = `${Math.round(F * 0.64)}px ${MONO}`;
          const ew = ctx.measureText(expStr).width;
          units.push({ type: 'pow', baseStr, expStr, w: bw + ew + PAD * 2, ti0: i, ti1: i + 2 });
          i += 2;
        } else if (t.t === 'num') {
          ctx.font = `${F}px ${MONO}`;
          const str = fstr(t.v);
          units.push({ type: 'num', str, w: ctx.measureText(str).width + PAD * 2, ti0: i, ti1: i });
        } else if (t.t === 'op') {
          ctx.font = `${F}px ${MONO}`;
          units.push({ type: 'op', str: t.o, w: ctx.measureText(t.o).width + OPGAP * 2, ti0: i, ti1: i });
        } else {
          const s = t.t === 'lp' ? '(' : ')';
          ctx.font = `${F}px ${MONO}`;
          units.push({ type: 'paren', str: s, w: ctx.measureText(s).width + 1, ti0: i, ti1: i });
        }
      }
      const width = units.reduce((s, u) => s + u.w, 0);
      return { units, width };
    };

    /* --- draw one rung centered at (cx, cy); returns nothing --------------- */
    const drawRung = (rung, cx, cy, F, opt = {}) => {
      const { dim, showActive = true } = opt;
      const { units, width } = measure(rung.toks, F);
      let x = cx - width / 2;
      // lay out unit screen ranges
      units.forEach((u) => {
        u.x = x;
        u.x2 = x + u.w;
        x += u.w;
      });
      // active-op highlight box (spans the two operands + operator)
      if (showActive && rung.activeOpIndex != null && !dim) {
        const oi = rung.activeOpIndex;
        const lu = units.find((u) => u.ti0 <= oi - 1 && oi - 1 <= u.ti1);
        const ru = units.find((u) => u.ti0 <= oi + 1 && oi + 1 <= u.ti1);
        if (lu && ru) {
          const bx = lu.x - 2;
          const bx2 = ru.x2 + 2;
          const bh = F * 1.28;
          ctx.fillStyle = 'rgba(200,30,79,0.10)';
          roundRect(ctx, bx, cy - bh / 2, bx2 - bx, bh, 6);
          ctx.fill();
          ctx.strokeStyle = 'rgba(200,30,79,0.55)';
          ctx.lineWidth = 1.4;
          roundRect(ctx, bx, cy - bh / 2, bx2 - bx, bh, 6);
          ctx.stroke();
        }
      }
      // tokens
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      units.forEach((u) => {
        const isResult = rung.resultIndex != null && u.ti0 <= rung.resultIndex && rung.resultIndex <= u.ti1;
        const mid = (u.x + u.x2) / 2;
        if (u.type === 'pow') {
          ctx.fillStyle = dim ? SOFT : isResult ? CARM : INK;
          ctx.font = `${F}px ${MONO}`;
          const bw = ctx.measureText(u.baseStr).width;
          const ew2 = (() => {
            ctx.font = `${Math.round(F * 0.64)}px ${MONO}`;
            return ctx.measureText(u.expStr).width;
          })();
          const total = bw + ew2;
          const bx = mid - total / 2;
          ctx.font = `${F}px ${MONO}`;
          ctx.textAlign = 'left';
          ctx.fillText(u.baseStr, bx, cy);
          ctx.font = `${Math.round(F * 0.64)}px ${MONO}`;
          ctx.fillText(u.expStr, bx + bw, cy - F * 0.32);
          ctx.textAlign = 'center';
        } else if (u.type === 'op') {
          const isActiveOp = showActive && !dim && rung.activeOpIndex === u.ti0;
          ctx.fillStyle = dim ? SOFT : isActiveOp ? CARM : INK;
          ctx.font = `${F}px ${MONO}`;
          ctx.fillText(u.str, mid, cy);
        } else if (u.type === 'paren') {
          ctx.fillStyle = dim ? SOFT : '#8494a3';
          ctx.font = `${F}px ${MONO}`;
          ctx.fillText(u.str, mid, cy);
        } else {
          ctx.fillStyle = dim ? SOFT : isResult ? CARM : INK;
          ctx.font = `${isResult ? '600 ' : ''}${F}px ${MONO}`;
          ctx.fillText(u.str, mid, cy);
        }
      });
      return { width };
    };

    /* --- the PEMDAS reference strip along the top -------------------------- */
    const drawPemdasStrip = (rungs) => {
      const chips = [
        { label: '( )', tier: 'P' },
        { label: 'xⁿ', tier: 3 },
        { label: '× ÷', tier: 2 },
        { label: '+ −', tier: 1 },
      ];
      // which tier acts first in the current expression?
      let firstTier = null;
      const r0 = rungs[0];
      if (r0 && r0.activeOpIndex != null) {
        const o = r0.toks[r0.activeOpIndex].o;
        // is that first op inside parentheses?
        const insideParen = r0.toks.some((t) => t.t === 'lp');
        firstTier = insideParen ? 'P' : prec(o);
      }
      ctx.font = '600 12px ' + MONO;
      const gap = 10;
      const padx = 10;
      const hh = 22;
      const widths = chips.map((ch) => ctx.measureText(ch.label).width + padx * 2);
      const arrowW = ctx.measureText('→').width + gap * 2;
      const totalW = widths.reduce((s, w) => s + w, 0) + arrowW * 3;
      let x = (W - totalW) / 2;
      const y = 20;
      chips.forEach((ch, i) => {
        const w = widths[i];
        const on = firstTier === ch.tier;
        ctx.fillStyle = on ? CARM : 'rgba(251,251,248,0.9)';
        roundRect(ctx, x, y - hh / 2, w, hh, 6);
        ctx.fill();
        ctx.strokeStyle = on ? CARM : 'rgba(28,43,58,0.18)';
        ctx.lineWidth = 1;
        roundRect(ctx, x, y - hh / 2, w, hh, 6);
        ctx.stroke();
        ctx.fillStyle = on ? '#fff' : SOFT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '600 12px ' + MONO;
        ctx.fillText(ch.label, x + w / 2, y + 1);
        x += w;
        if (i < chips.length - 1) {
          ctx.fillStyle = SOFT;
          ctx.font = '12px ' + MONO;
          ctx.fillText('→', x + arrowW / 2, y + 1);
          x += arrowW;
        }
      });
    };

    /* --- CONTRAST view (step 1): two ladders, wrong vs right ------------- */
    if (S.step === WHY && !S.calib) {
      const t = buildTokens({ ...S.src, e: 1, group: 'none' }); // no exponent in contrast
      const ltr = evaluateLeftToRight(t);
      const pem = evaluateTrace(t);
      const F = Math.max(15, Math.min(21, W / 26));
      const colW = W / 2;
      const drawColumn = (cx, titleTxt, rungs, val, isRight) => {
        const accent = isRight ? CARM : SOFT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '600 12px ' + MONO;
        ctx.fillStyle = accent;
        ctx.fillText(titleTxt, cx, 52);
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = SOFT;
        ctx.fillText(isRight ? '✓ the rule' : '✗ common mistake', cx, 70);
        const n = rungs.length;
        const lh = F * 1.7;
        const top = 100;
        rungs.forEach((r, i) => {
          const cy = top + i * lh;
          if (i > 0) {
            ctx.fillStyle = SOFT;
            ctx.font = `${F}px ${MONO}`;
            ctx.textAlign = 'right';
            ctx.fillText('=', cx - measure(r.toks, F).width / 2 - 12, cy);
            ctx.textAlign = 'center';
          }
          drawRung(r, cx, cy, F, { dim: !isRight });
        });
        // final value pill
        const cy = top + n * lh + 4;
        const vs = val ? fstr(val) : 'undefined';
        ctx.font = '700 ' + Math.round(F * 1.15) + 'px ' + MONO;
        const vw = ctx.measureText(vs).width;
        ctx.fillStyle = isRight ? 'rgba(200,30,79,0.12)' : 'rgba(91,107,123,0.12)';
        roundRect(ctx, cx - vw / 2 - 12, cy - F * 0.85, vw + 24, F * 1.7, 8);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.6;
        roundRect(ctx, cx - vw / 2 - 12, cy - F * 0.85, vw + 24, F * 1.7, 8);
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(vs, cx, cy);
      };
      drawColumn(colW * 0.5, 'left to right', ltr.rungs, ltr.value, false);
      drawColumn(colW * 1.5, 'order of operations', pem.rungs, pem.value, true);
      // divider
      ctx.strokeStyle = 'rgba(28,43,58,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W / 2 + 0.5, 90);
      ctx.lineTo(W / 2 + 0.5, H - 30);
      ctx.stroke();
      // punchline
      const same = ltr.value && pem.value && feq(ltr.value, pem.value);
      ctx.textAlign = 'center';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillStyle = same ? SOFT : INK;
      ctx.fillText(
        same
          ? 'Both agree here — try mixing × or ÷ with + or − to split them apart.'
          : 'Same expression, two different answers. The order is a rule.',
        W / 2,
        H - 16
      );
      return;
    }

    /* --- MAIN view: the reduction ladder ----------------------------------- */
    const rungs = trace.rungs;
    drawPemdasStrip(rungs);

    // choose a font that fits the widest rung
    let F = Math.max(17, Math.min(30, W / 15));
    const maxW = Math.max(...rungs.map((r) => measure(r.toks, F).width));
    const avail = W - 150; // leave room for the "=" gutter and right-margin notes
    if (maxW > avail) F = Math.max(13, F * (avail / maxW));

    const shown = S.reveal == null ? rungs.length : Math.min(S.reveal, rungs.length);
    const lh = F * 1.72;
    const blockH = (rungs.length - 1) * lh;
    const top = Math.max(58 + F, (H - blockH) / 2 + 8);
    // common left edge so the "=" signs line up under each other
    const widest = Math.max(...rungs.map((r) => measure(r.toks, F).width));
    const cx = W / 2 + 14; // nudge right so the "=" gutter has room on the left

    for (let i = 0; i < shown; i++) {
      const r = rungs[i];
      const cy = top + i * lh;
      const isLast = i === rungs.length - 1;
      // "=" gutter for rungs after the first
      if (i > 0) {
        ctx.fillStyle = SOFT;
        ctx.font = `${F}px ${MONO}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('=', cx - widest / 2 - 14, cy);
      }
      drawRung(r, cx, cy, F, { showActive: !isLast });
      // right-margin note: the operation just chosen on this rung
      if (r.applied && !isLast) {
        ctx.fillStyle = SOFT;
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const nx = Math.min(W - 8 - ctx.measureText(r.applied).width, cx + widest / 2 + 22);
        ctx.fillText(r.applied, Math.max(cx + widest / 2 + 10, nx), cy);
      }
    }

    // if the expression is undefined, say why at the bottom
    if (trace.undef) {
      ctx.fillStyle = CARM;
      ctx.textAlign = 'center';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText('undefined — you cannot divide by 0', W / 2, H - 16);
    } else if (shown >= rungs.length) {
      // final value emphasis pill under the last rung
      const last = rungs[rungs.length - 1];
      const cy = top + (rungs.length - 1) * lh;
      const vs = fstr(last.toks[0].v);
      // (already drawn carmine by drawRung; add a soft underline for finality)
      const { width } = measure(last.toks, F);
      ctx.strokeStyle = 'rgba(200,30,79,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - width / 2 - 2, cy + F * 0.72);
      ctx.lineTo(cx + width / 2 + 2, cy + F * 0.72);
      ctx.stroke();
      void vs;
    }

    // calibration target ribbon
    if (S.calib && S.target != null) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillStyle = INK;
      const msg = `target = ${S.target}`;
      const mw = ctx.measureText(msg).width;
      ctx.fillStyle = 'rgba(28,43,58,0.06)';
      roundRect(ctx, W / 2 - mw / 2 - 12, H - 34, mw + 24, 24, 7);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.fillText(msg, W / 2, H - 22);
    }
  }, [trace, value]);

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* redraw whenever anything visible changes */
  useEffect(() => {
    draw();
  }, [a, b, c, op1, op2, e, group, step, puzzle, reveal, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* re-lock controls when stepping back below their unlock; hand a puzzle to
     the calibration step. This keeps a step's picture matched to its lesson. */
  useEffect(() => {
    if (step < OP_UNLOCK) {
      setOp1(START.op1);
      setOp2(START.op2);
    }
    if (step < EXP_UNLOCK) setE(1);
    if (step < GROUP_UNLOCK) setGroup('none');
    if (STEPS[step].calib) {
      setPuzzle((p) => p || makePuzzle(null));
      setGroup('none');
    } else {
      setPuzzle(null);
    }
    setReveal(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- handlers ---------------------------------------------------------- */
  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const resetExpr = () => {
    setA(START.a);
    setB(START.b);
    setC(START.c);
    if (step >= OP_UNLOCK) {
      setOp1(START.op1);
      setOp2(START.op2);
    }
    if (step >= EXP_UNLOCK) setE(1);
    if (step >= GROUP_UNLOCK) setGroup('none');
    setReveal(null);
  };

  const stepReveal = () => {
    setReveal((r) => {
      const total = trace.rungs.length;
      if (r == null) return 1;
      if (r >= total) return null;
      return r + 1;
    });
  };

  // Labels for the grouping control, showing the actual sub-expression grouped.
  const midDisp = e > 1 ? `${b}${sup(e)}` : `${b}`;
  const leftGrpLabel = `(${a} ${op1} ${midDisp})`;
  const rightGrpLabel = `(${midDisp} ${op2} ${c})`;
  const puzzleMid = `${puzzle ? puzzle.b : b}`;
  const groupLabels = calib && puzzle
    ? {
        none: 'no ( )',
        left: `(${puzzle.a} ${puzzle.op1} ${puzzleMid})`,
        right: `(${puzzleMid} ${puzzle.op2} ${puzzle.c})`,
      }
    : { none: 'no ( )', left: leftGrpLabel, right: rightGrpLabel };

  const numsLocked = calib; // during calibration only Grouping is live
  const opsLocked = calib || step < OP_UNLOCK;
  const expLocked = calib || step < EXP_UNLOCK;
  const groupLocked = !calib && step < GROUP_UNLOCK;

  const firstApplied = trace.rungs[0] && trace.rungs[0].applied;
  const spoken =
    `Expression ${spokenText(toks)}. ` +
    (trace.undef ? 'It is undefined because of division by zero.' : `It equals ${fstr(value)}.`) +
    (calib && target != null ? ` Target ${target}.` : '');

  return (
    <div className="oplab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Order of Operations</h1>
        <p className="lede">
          One expression, one answer — because we all agree on an order:{' '}
          <span className="mono">P E MD AS</span>. Build an expression with the controls and watch the{' '}
          <em>reduction ladder</em> collapse it one operation at a time, highest priority first. See how{' '}
          <em>× before +</em>, <em>ties left to right</em>, <em>exponents</em>, and <em>parentheses</em> each
          change the result — then place parentheses to hit a target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              {exprText} = {valueText}
            </p>
            <p className="equation-sub mono">
              {trace.undef
                ? 'cannot divide by zero'
                : firstApplied
                ? `first: ${firstApplied}`
                : 'a single number'}
            </p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {calib ? 'slide Grouping to hit the target' : 'highest priority first, then left to right'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calibrated ? ' Calibrated — the expression matches the target.' : ''}
          </p>

          <div className="facts">
            {!calib ? (
              <>
                <div className="fact">
                  <span className="fact-k">Expression</span>
                  <span className="fact-v mono">{exprText}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Value</span>
                  <span className="fact-v mono">{valueText}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">First step</span>
                  <span className="fact-v mono">{trace.undef ? '÷ 0' : firstApplied || '—'}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Steps</span>
                  <span className="fact-v mono">{Math.max(0, trace.rungs.length - 1)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="fact">
                  <span className="fact-k">Puzzle</span>
                  <span className="fact-v mono">
                    {puzzle ? `${puzzle.a} ${puzzle.op1} ${puzzle.b} ${puzzle.op2} ${puzzle.c}` : '—'}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">Your value</span>
                  <span className="fact-v mono">{valueText}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Target</span>
                  <span className="fact-v mono">{target ?? '—'}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Grouping</span>
                  <span className="fact-v mono">{groupLabels[group]}</span>
                </div>
              </>
            )}
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (reveal != null ? ' on' : '')}
              onClick={stepReveal}
            >
              {reveal == null
                ? '▸ Reveal step by step'
                : reveal >= trace.rungs.length
                ? '↺ Show all'
                : '▸ Next step'}
            </button>
            <button type="button" className="btn ghost" onClick={resetExpr} disabled={calib}>
              Reset expression
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

          {/* ---- controls ---- */}
          <div className="controls">
            {/* numbers */}
            <div className={'ctl-group' + (numsLocked ? ' locked' : '')}>
              <span className="ctl-label">Numbers</span>
              <div className="nums">
                {[
                  ['a', calib && puzzle ? puzzle.a : a, setA],
                  ['b', calib && puzzle ? puzzle.b : b, setB],
                  ['c', calib && puzzle ? puzzle.c : c, setC],
                ].map(([k, val, set]) => (
                  <label className="num" key={k}>
                    <span className="nk">{k}</span>
                    <input
                      type="range"
                      min={1}
                      max={9}
                      step={1}
                      value={val}
                      disabled={numsLocked}
                      aria-label={`Number ${k}`}
                      onChange={(ev) => set(parseInt(ev.target.value, 10))}
                    />
                    <output className="nv">{val}</output>
                  </label>
                ))}
              </div>
            </div>

            {/* operators */}
            <div className={'ctl-group' + (opsLocked ? ' locked' : '')}>
              <span className="ctl-label">
                Operators {opsLocked && !calib ? <em className="soon">unlocks at step {OP_UNLOCK + 1}</em> : null}
              </span>
              <div className="ops-row">
                <div className="seg" role="group" aria-label="First operator">
                  {OPS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className={'segbtn' + ((calib && puzzle ? puzzle.op1 : op1) === o ? ' on' : '')}
                      disabled={opsLocked}
                      aria-pressed={(calib && puzzle ? puzzle.op1 : op1) === o}
                      onClick={() => setOp1(o)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <span className="seg-sep mono">between a &amp; b</span>
              </div>
              <div className="ops-row">
                <div className="seg" role="group" aria-label="Second operator">
                  {OPS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className={'segbtn' + ((calib && puzzle ? puzzle.op2 : op2) === o ? ' on' : '')}
                      disabled={opsLocked}
                      aria-pressed={(calib && puzzle ? puzzle.op2 : op2) === o}
                      onClick={() => setOp2(o)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <span className="seg-sep mono">between b &amp; c</span>
              </div>
            </div>

            {/* exponent */}
            <div className={'ctl-group' + (expLocked ? ' locked' : '')}>
              <span className="ctl-label">
                Exponent on b{' '}
                {expLocked && !calib ? <em className="soon">unlocks at step {EXP_UNLOCK + 1}</em> : null}
              </span>
              <div className="seg" role="group" aria-label="Exponent">
                {[1, 2, 3].map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    className={'segbtn' + ((calib ? 1 : e) === ex ? ' on' : '')}
                    disabled={expLocked}
                    aria-pressed={(calib ? 1 : e) === ex}
                    onClick={() => setE(ex)}
                  >
                    {ex === 1 ? 'none' : `b${sup(ex)}`}
                  </button>
                ))}
              </div>
            </div>

            {/* grouping */}
            <div className={'ctl-group' + (groupLocked ? ' locked' : '')}>
              <span className="ctl-label">
                Grouping{' '}
                {groupLocked ? <em className="soon">unlocks at step {GROUP_UNLOCK + 1}</em> : null}
                {calib ? <em className="soon live">the only live control</em> : null}
              </span>
              <div className="seg grp" role="group" aria-label="Parentheses grouping">
                {['none', 'left', 'right'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={'segbtn wide' + (group === g ? ' on' : '')}
                    disabled={groupLocked}
                    aria-pressed={group === g}
                    onClick={() => setGroup(g)}
                  >
                    {groupLabels[g]}
                  </button>
                ))}
              </div>
            </div>
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

          {calib && puzzle && (
            <div className="calib">
              <p className="calib-goal">
                Make <span className="mono">{`${puzzle.a} ${puzzle.op1} ${puzzle.b} ${puzzle.op2} ${puzzle.c}`}</span>{' '}
                equal <strong>{target}</strong>
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
                    your value {valueText}
                    {value && !trace.undef ? (fnum(value) < target ? ' · too small' : fnum(value) > target ? ' · too big' : '') : ''}
                  </span>
                )}
              </div>
              {calibrated && (
                <p className="factnote">
                  {tokensText(toks)} = {target}.{' '}
                  {noneVal && !feq(noneVal, value)
                    ? `Without the parentheses, ${tokensText(buildTokens({ ...puzzle, e: 1, group: 'none' }))} = ${fstr(noneVal)} — the parentheses change which operation goes first.`
                    : 'The parentheses set the order.'}
                </p>
              )}
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setPuzzle((p) => makePuzzle(p ? p.idx : null));
                  setGroup('none');
                }}
              >
                New puzzle
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
                  setPuzzle(null);
                  setA(START.a);
                  setB(START.b);
                  setC(START.c);
                  setOp1(START.op1);
                  setOp2(START.op2);
                  setE(START.e);
                  setGroup(START.group);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">P · E · MD · AS</span> &nbsp;·&nbsp; parentheses, exponents, then
        multiply/divide and add/subtract left to right — one rule, one value, built live on the reduction
        ladder.
      </footer>

      <style jsx>{`
        .oplab {
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
          max-width: 72ch;
        }
        .lede em {
          font-style: italic;
          color: var(--ink);
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 356px;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 940px) {
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
          font-size: 19px;
          font-weight: 600;
          margin: 0;
          overflow-wrap: anywhere;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 2;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 1 / 1;
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
          overflow-wrap: anywhere;
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
        .controls {
          display: grid;
          gap: 13px;
        }
        .ctl-group {
          display: grid;
          gap: 7px;
        }
        .ctl-group.locked {
          opacity: 0.5;
        }
        .ctl-label {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .soon {
          font-size: 10px;
          letter-spacing: 0.02em;
          text-transform: none;
          font-style: italic;
          color: var(--ink-soft);
          opacity: 0.85;
        }
        .soon.live {
          color: var(--curve);
          opacity: 1;
        }
        .nums {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        .num {
          display: grid;
          grid-template-columns: 16px 1fr 18px;
          align-items: center;
          gap: 5px;
        }
        .nk {
          font-family: var(--serif);
          font-style: italic;
          font-size: 16px;
        }
        .num input[type='range'] {
          width: 100%;
          accent-color: var(--ink);
          cursor: pointer;
        }
        .num input[type='range']:disabled {
          cursor: not-allowed;
        }
        .nv {
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 13px;
        }
        .ops-row {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .seg {
          display: inline-flex;
          border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 8px;
          overflow: hidden;
        }
        .seg.grp {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          width: 100%;
        }
        .segbtn {
          font: 600 14px/1 var(--mono);
          min-width: 34px;
          padding: 8px 10px;
          border: none;
          border-right: 1px solid rgba(28, 43, 58, 0.14);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: background 0.13s, color 0.13s;
        }
        .segbtn.wide {
          font-size: 12px;
          padding: 8px 6px;
          min-width: 0;
        }
        .seg.grp .segbtn:last-child {
          border-right: none;
        }
        .seg > .segbtn:last-child {
          border-right: none;
        }
        .segbtn.on {
          background: var(--curve);
          color: #fff;
        }
        .segbtn:disabled {
          cursor: not-allowed;
        }
        .segbtn:not(:disabled):not(.on):hover {
          background: #eef2f5;
        }
        .seg-sep {
          font-size: 11px;
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
          gap: 10px;
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
          text-align: right;
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
        :global(.oplab) :focus-visible {
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
