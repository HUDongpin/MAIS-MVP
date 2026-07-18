'use client';

/* ============================================================================
   LongDivisionLab — an interactive "bench" for MULTI-DIGIT DIVISION with and
   without remainders, taught as the STANDARD LONG-DIVISION ALGORITHM: the
   repeating four-step cycle

            DIVIDE  →  MULTIPLY  →  SUBTRACT  →  BRING DOWN

   worked one place-value column at a time, from the highest place down.

   This is the algorithm every US student meets in grade 4 (CCSS 4.NBT.B.6:
   find whole-number quotients and remainders with up to four-digit dividends
   and one-digit divisors) and revisits in grade 5.  It is DISTINCT from the
   equal-groups / array picture of division (that is a different lab): here the
   subject is the pencil-and-paper procedure itself and, crucially, WHY it
   works — each quotient digit lives in a place (hundreds, tens, ones), and the
   "bring down" is really regrouping the leftover into the next-smaller place.

   The signature centerpiece is the LONG-DIVISION TABLEAU (the analogue of the
   sine bench's wave or the division-array's rectangle): the bracket, the
   quotient built digit-by-digit above the vinculum, and the descending ladder
   of products and subtractions.  A step-through player reveals it one micro-
   action at a time so the four-step loop is something you WATCH, not just read,
   with a live plain-English explanation of the current move.

   Two facts anchor everything, exactly (all arithmetic is integer — no floats):

        dividend = divisor × quotient + remainder,     0 ≤ remainder < divisor

   The remainder being strictly less than the divisor is taught as the reason a
   quotient digit is "right": if the leftover reached the divisor, one more
   group would fit.  Division by zero is impossible by construction — the
   divisor dial starts at 2 and never reaches 0.

   The dividend is built with PLACE-VALUE dials (thousands / hundreds / tens /
   ones), each 0–9 — the same de-risked "digits-as-dials" control used by the
   Number and Comparing labs (no dragging on the canvas).  Leading zeros
   collapse automatically, so the same four dials make any 1–4 digit dividend.

   The calibration capstone is a CONSTRUCTION goal that drills the identity
   directly: given a divisor and a target "quotient R remainder", build the
   dividend (= divisor × quotient + remainder) that produces it.  Because the
   target sometimes has a remainder and sometimes not, the capstone itself
   covers "with and without remainders".

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/LongDivisionLab.jsx
     2. Import and render it:
          import LongDivisionLab from './LongDivisionLab';
          export default function Page() { return <LongDivisionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (dividend digits,
              divisor, lesson step, algorithm step).
     MODEL  — solve(D, v) is pure: it produces the exact tableau (bands of
              divide/multiply/subtract/bring-down) and knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Ranges. Four place-value dials (0–9 each) build a dividend 0..9999. The
   divisor runs 2..9 — a single digit, never 0 (so the model never divides by
   zero) and never 1 (which would make the algorithm trivial).
   ------------------------------------------------------------------------- */
const PLACES = ['Th', 'H', 'T', 'O']; // thousands, hundreds, tens, ones
const VMIN = 2;
const VMAX = 9;
const DMAX = 9999;
const START = { dv: [0, 7, 3, 8], v: 6 }; // 738 ÷ 6 = 123, the classic clean example

// Named lesson-step indices (0-based) so the renderer and effects stay readable.
const MEET = 0;
const SETUP = 1;
const DIVIDE = 2;
const MULSUB = 3;
const BRING = 4;
const REMAIN = 5;
const CALIB = 6;

const BIG = 999; // "algorithm fully revealed" sentinel for algoStep (clamped on read)

/* ---------------------------------------------------------------------------
   MODEL — pure long division. Returns the exact tableau as a list of "bands",
   one per processed place-value column (leading columns whose partial value is
   smaller than the divisor are absorbed, so no leading zero is written in the
   quotient — the standard US convention). Every quantity is an exact integer.

   For each band at column `col`:
     curVal   the running number being divided here (1–2 digits)
     qd       the quotient digit for this place  (curVal ÷ divisor, floored)
     prod     qd × divisor        (written under curVal)
     diff     curVal − prod       (the subtraction result; always 0 ≤ diff < v)
     bringDigit  the next dividend digit brought down, or null on the last band
   Row/column geometry for the renderer:
     curLeftCol / prodLeftCol  the leftmost column each number occupies
     sourceRow   the tableau row holding this band's working number
   And a flat `micro` list enumerating every divide/multiply/subtract/bring-down
   action, which the step-through player advances through.
   ------------------------------------------------------------------------- */
function solve(D, v) {
  const digits = String(D).split('').map(Number);
  const n = digits.length;
  const nd = (x) => String(x).length;

  let rem = 0;
  let started = false;
  const bands = [];

  for (let i = 0; i < n; i++) {
    const curVal = rem * 10 + digits[i];
    const qd = Math.floor(curVal / v);
    const prod = qd * v;
    const diff = curVal - prod;
    if (!started && qd === 0) {
      rem = diff; // === curVal — absorb the leading digit(s), write no quotient digit
      continue;
    }
    started = true;
    bands.push({
      k: bands.length,
      col: i,
      curVal,
      qd,
      prod,
      diff,
      curLeftCol: i - (nd(curVal) - 1),
      prodLeftCol: i - (nd(prod) - 1),
      sourceRow: bands.length === 0 ? 1 : 2 * bands.length + 1, // dividend row, or prev band's diff row
      bringDigit: i < n - 1 ? digits[i + 1] : null,
    });
    rem = diff;
  }

  // enumerate the micro-actions and remember each band's action indices
  const micro = [];
  bands.forEach((b) => {
    b.idx = { divide: micro.length };
    micro.push({ k: b.k, phase: 'divide' });
    b.idx.multiply = micro.length;
    micro.push({ k: b.k, phase: 'multiply' });
    b.idx.subtract = micro.length;
    micro.push({ k: b.k, phase: 'subtract' });
    if (b.bringDigit != null) {
      b.idx.bring = micro.length;
      micro.push({ k: b.k, phase: 'bringdown' });
    } else {
      b.idx.bring = null;
    }
  });

  let quotient = 0;
  bands.forEach((b) => (quotient = quotient * 10 + b.qd));

  return { D, v, digits, n, bands, micro, microLen: micro.length, quotient, remainder: rem };
}

const placeWord = (col, n) =>
  ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands'][n - 1 - col] || 'place';
const placeAbbrev = (col, n) => ['O', 'T', 'H', 'Th', 'TTh'][n - 1 - col] || '';

/* ---------------------------------------------------------------------------
   The plain-English explanation of the current step, tied to live state — the
   tutoring layer that makes this a lesson, not just a widget.
   ------------------------------------------------------------------------- */
function explainStep(model, eff) {
  const { bands, n, v, D, quotient, remainder, microLen } = model;
  if (bands.length === 0) {
    if (D === 0) return 'Nothing to divide: 0 ÷ any number is 0.';
    return `${v} is larger than ${D}, so it goes in 0 times. The whole number ${D} is the remainder.`;
  }
  if (eff <= 0) return `Ready: divide ${v} into ${bands[0].curVal}. Press “Step” to begin.`;
  if (eff >= microLen)
    return `Finished: ${D} ÷ ${v} = ${quotient}${remainder ? ` remainder ${remainder}` : ' (no remainder)'}.`;

  const m = model.micro[eff - 1];
  const b = bands[m.k];
  const place = placeWord(b.col, n);
  const last = m.k === bands.length - 1;
  switch (m.phase) {
    case 'divide':
      return b.qd === 0
        ? `Divide: ${v} does not go into ${b.curVal}, so write 0 in the ${place} place.`
        : `Divide: ${v} goes into ${b.curVal} ${b.qd} time${b.qd === 1 ? '' : 's'} — write ${b.qd} in the ${place} place.`;
    case 'multiply':
      return `Multiply: ${b.qd} × ${v} = ${b.prod}. Write ${b.prod} under the ${b.curVal}.`;
    case 'subtract':
      return `Subtract: ${b.curVal} − ${b.prod} = ${b.diff}.${
        last ? ` Nothing left to bring down, so ${b.diff} is the remainder.` : ` ${b.diff} < ${v}, so the digit was right.`
      }`;
    case 'bringdown':
      return `Bring down the ${b.bringDigit}: now divide ${v} into ${b.diff * 10 + b.bringDigit}.`;
    default:
      return '';
  }
}

/* ---------------------------------------------------------------------------
   Lesson. One idea per step; the reveal lives in `feedback` (shown after
   answering); distractors are real student misconceptions (remainder ≥ divisor,
   "6 into 7 is 0 because 6 doesn't divide 7", reading place value wrong). Next
   is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet long division',
    body:
      'When the dividend has several digits, we use long division: the divisor sits outside the bracket, the ' +
      'dividend inside, and we build the answer — the quotient — one digit at a time on top, working from the ' +
      'biggest place down. The example on the stage is 738 ÷ 6 = 123. Anything that cannot be split is the remainder.',
    q: 'In 738 ÷ 6, which number is the dividend — the number placed inside the bracket to be divided?',
    choices: ['738 — the number being divided', '6 — the divisor', '123 — the answer'],
    answer: 0,
    feedback:
      '738 is the dividend (inside the bracket). 6 is the divisor (outside, on the left), and 123 is the quotient ' +
      'we build on top. Dividend ÷ divisor = quotient, with any remainder left at the bottom.',
  },
  {
    title: 'Set up the problem',
    body:
      'The dials are live. Build the dividend with the place-value dials — thousands, hundreds, tens, ones — and ' +
      'pick a one-digit divisor (2–9; never 0, so you can never divide by zero). Long division then processes the ' +
      'dividend one place at a time, always starting from the highest place.',
    q: 'Read the dividend 738 from the left. What is the value of that first digit, the 7?',
    choices: ['7 hundreds = 700', '7 tens = 70', 'just 7'],
    answer: 0,
    feedback:
      '738 = 7 hundreds + 3 tens + 8 ones, so the leading 7 is worth 700. Long division divides the hundreds first, ' +
      'then the tens, then the ones — biggest place to smallest.',
  },
  {
    title: 'Step 1 — Divide',
    body:
      'The first of the four repeating steps. Look at the leading part of the dividend and ask how many whole times ' +
      'the divisor fits. For 738 ÷ 6, 6 fits into 7 once, so a 1 goes above the hundreds place. (If the divisor were ' +
      'bigger than the first digit — say 6 into 4 — you would take two digits instead and look at 48.) Press “Step”.',
    q: 'How many whole times does 6 go into 7?',
    choices: ['1 — 6 × 1 = 6 fits, but 6 × 2 = 12 is too big', '0 — because 6 does not divide 7 evenly', '2'],
    answer: 0,
    feedback:
      '6 goes into 7 once: 6 × 1 = 6 fits and 6 × 2 = 12 overshoots. It does not need to divide evenly — we take as ' +
      'many whole 6s as fit and deal with the leftover next. The 1 is written above the 7, in the hundreds place.',
  },
  {
    title: 'Steps 2 & 3 — Multiply, Subtract',
    body:
      'Multiply the digit you just wrote by the divisor, write the product underneath, and subtract to find the ' +
      'leftover. Here 1 × 6 = 6, and 7 − 6 = 1. That leftover is always smaller than the divisor — if it were 6 or ' +
      'more, the divide step picked too small a digit. Step through to watch the product and difference appear.',
    q: 'You wrote 1, so you compute 1 × 6 = 6 and subtract from 7. What is 7 − 6?',
    choices: ['1', '6', '13'],
    answer: 0,
    feedback:
      '7 − 6 = 1. That 1 is the leftover in the hundreds after removing one 6. Because 1 is less than the divisor 6, ' +
      'we know 1 was the correct quotient digit for this place.',
  },
  {
    title: 'Step 4 — Bring down, then repeat',
    body:
      'Bring the next dividend digit down next to the leftover to form a new number, and repeat the whole cycle. ' +
      'Leftover 1 with the 3 brought down makes 13; 6 goes into 13 twice (12), leaving 1; bring down 8 to make 18; ' +
      '6 into 18 is 3 exactly. DIVIDE, MULTIPLY, SUBTRACT, BRING DOWN — the loop runs until every digit is used.',
    q: 'Leftover 1 with the next digit 3 brought down makes 13. How many times does 6 go into 13?',
    choices: ['2 — 6 × 2 = 12 fits, 6 × 3 = 18 is too big', '3 — because 6 × 3 = 18', '1'],
    answer: 0,
    feedback:
      '6 goes into 13 twice: 6 × 2 = 12 fits, 6 × 3 = 18 overshoots. Write 2 in the tens place, subtract (13 − 12 = 1), ' +
      'and bring down the next digit. Divide, multiply, subtract, bring down — again and again.',
  },
  {
    title: 'Quotient and remainder',
    body:
      'When the last digit has been brought down and divided, the number left at the bottom is the remainder. If it is ' +
      '0, the divisor divides evenly (738 ÷ 6 = 123, no remainder). If not, it is the part that cannot make one more ' +
      'group — always less than the divisor. Check any answer by multiplying back: divisor × quotient + remainder = ' +
      'dividend. Try setting the dials to a division that does NOT come out even.',
    q: 'A division by 6 ends with 4 left at the bottom. What is the remainder — and could it ever be 6?',
    choices: [
      'Remainder 4; it can never reach 6, because another whole 6 would fit',
      'Remainder 6',
      'Remainder 0 — a leftover is always 0',
    ],
    answer: 0,
    feedback:
      'The remainder is 4. A remainder can never equal or exceed the divisor: if 6 were left over, one more 6 would ' +
      'fit and the quotient would be one larger. So every remainder obeys 0 ≤ remainder < divisor.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Last challenge. You are given a divisor and a target answer written as “quotient R remainder”. Build the ' +
      'dividend with the place-value dials so the long division lands on exactly that answer. The dividend you need ' +
      'is divisor × quotient + remainder — set it, then step through to watch it check out. Press “New target” for a ' +
      'fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   Calibration — a CONSTRUCTION goal. Given (v, Q, r), the required dividend is
   req = v·Q + r. The meter is closeness of the built dividend to req; the
   CALIBRATED stamp fires only on an EXACT hit. Targets are 3–4 digit and
   include both remainder and no-remainder cases.
   ------------------------------------------------------------------------- */
const randInt = (n) => Math.floor(Math.random() * n);
function makeTarget(prev) {
  let v, Q, r, req;
  do {
    v = VMIN + randInt(VMAX - VMIN + 1); // 2..9
    Q = 20 + randInt(180); //               20..199
    r = randInt(v); //                       0..v-1  (mix of even and remainder cases)
    req = v * Q + r;
  } while (req < 100 || req > DMAX || (prev && req === prev.req));
  return { v, Q, r, req };
}
const dividendOf = (dv) => dv[0] * 1000 + dv[1] * 100 + dv[2] * 10 + dv[3];
const dialsOf = (D) => [Math.floor(D / 1000) % 10, Math.floor(D / 100) % 10, Math.floor(D / 10) % 10, D % 10];
const buildPercent = (D, req) => (D === req ? 100 : Math.max(0, 100 * (1 - Math.abs(D - req) / req)));

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function LongDivisionLab() {
  const [dv, setDv] = useState(START.dv); // [thousands, hundreds, tens, ones]
  const [v, setV] = useState(START.v); //   divisor
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [algoStep, setAlgoStep] = useState(BIG); // how many micro-actions are revealed
  const [playing, setPlaying] = useState(false);
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const D = dividendOf(dv);
  const model = solve(D, v);
  const eff = Math.max(0, Math.min(algoStep, model.microLen));
  const current = STEPS[step];
  const calib = !!current.calib;
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const req = target ? target.req : null;
  const pct = target ? buildPercent(D, req) : 0;
  const calibrated = target ? D === req : false;

  // Snapshot everything the renderer needs so draw() (a stable callback) never
  // reads stale values.
  sceneRef.current = { model, eff, step, calib, target, D, v };

  /* ---- full redraw from state (auto-fit tableau; no world transform needed) - */
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
    const M = S.model;
    const e = S.eff;
    const n = M.n;
    const bands = M.bands;

    const CARM = '#C81E4F';
    const INK = '#1C2B3A';
    const SOFT = '#5b6b7b';

    /* ---- layout: fit the tableau, reserving a left column for divisor+bracket
            and a thin top strip for place-value labels --------------------- */
    const P = 18;
    const rows = 2 + 2 * bands.length; // quotient row + dividend row + 2 per band
    const availW = Math.max(20, W - 2 * P);
    const availH = Math.max(20, H - 2 * P);
    const LWfrac = 1.9; // left reserve, in cell widths (divisor + bracket)
    let cw = availW / (n + LWfrac);
    let rh = availH / (rows + 1.2); // +1.2 for the place-label strip and breathing room
    cw = Math.max(16, Math.min(cw, 58));
    rh = Math.max(20, Math.min(rh, 52));

    const Lw = LWfrac * cw;
    const topPad = rh * 0.85; // place-label strip
    const blockW = Lw + n * cw;
    const blockH = topPad + rows * rh;
    const ox = P + Math.max(0, (availW - blockW) / 2);
    const oy = P + Math.max(0, (availH - blockH) / 2);

    const xCenter = (col) => ox + Lw + (col + 0.5) * cw;
    const xLeftEdge = (col) => ox + Lw + col * cw;
    const rowCenter = (r) => oy + topPad + (r + 0.5) * rh;
    const rowTop = (r) => oy + topPad + r * rh;

    const digitFont = `${Math.round(Math.min(cw, rh) * 0.62)}px ui-monospace, "SF Mono", Menlo, monospace`;
    const smallFont = '11px ui-monospace, "SF Mono", Menlo, monospace';

    const drawNum = (value, onesCol, r, color) => {
      const str = String(value);
      ctx.font = digitFont;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let j = 0; j < str.length; j++) {
        ctx.fillText(str[j], xCenter(onesCol - (str.length - 1 - j)), rowCenter(r));
      }
    };

    /* ---- faint quadrille paper, aligned to the cell grid ------------------- */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    for (let x = ox + Lw - Math.ceil((ox + Lw) / cw) * cw; x <= W; x += cw) {
      const X = Math.round(x) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    for (let y = rowTop(0) - Math.ceil(rowTop(0) / rh) * rh; y <= H; y += rh) {
      const Y = Math.round(y) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    /* ---- place-value labels across the columns (why the algorithm works) --- */
    ctx.font = smallFont;
    ctx.fillStyle = SOFT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let c = 0; c < n; c++) ctx.fillText(placeAbbrev(c, n), xCenter(c), oy + topPad * 0.42);

    /* ---- the current-action highlight (carmine wash on the working number) - */
    if (bands.length) {
      const m = e > 0 ? M.micro[e - 1] : { k: 0, phase: 'ready' };
      const b = bands[m.k];
      const wash = (col0, col1, r) => {
        ctx.fillStyle = 'rgba(200,30,79,0.12)';
        const x = xLeftEdge(col0) - 2;
        const w = xLeftEdge(col1 + 1) - xLeftEdge(col0) + 4;
        ctx.beginPath();
        ctx.roundRect(x, rowCenter(r) - rh * 0.44, w, rh * 0.88, 6);
        ctx.fill();
      };
      if (m.phase === 'bringdown') {
        if (b.bringDigit != null) wash(b.col + 1, b.col + 1, 2 * b.k + 3);
      } else if (e < M.microLen) {
        wash(b.curLeftCol, b.col, b.sourceRow);
      }
    }

    /* ---- the division bracket: vinculum over the dividend + left curve ----- */
    const barLeft = xLeftEdge(0);
    const barRight = xLeftEdge(n) + cw * 0.12;
    const vinY = rowTop(1);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(barLeft, vinY);
    ctx.lineTo(barRight, vinY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(barLeft, vinY);
    ctx.quadraticCurveTo(barLeft - cw * 0.55, rowCenter(1), barLeft, rowCenter(1) + rh * 0.5);
    ctx.stroke();

    /* ---- divisor, to the left of the bracket ------------------------------- */
    ctx.font = digitFont;
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(M.v), ox + Lw * 0.32, rowCenter(1)); // sits left of the bracket curve

    /* ---- dividend digits (always shown) ------------------------------------ */
    for (let c = 0; c < n; c++) {
      ctx.font = digitFont;
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(M.digits[c]), xCenter(c), rowCenter(1));
    }

    /* ---- the ladder: quotient digits, products, subtraction lines, diffs --- */
    if (bands.length === 0) {
      // divisor larger than dividend (or dividend 0): quotient is 0, dividend is the remainder
      drawNum(0, n - 1, 0, CARM);
    } else {
      bands.forEach((b) => {
        const qShown = e > b.idx.divide;
        const prodShown = e > b.idx.multiply;
        const diffShown = e > b.idx.subtract;
        const bringShown = b.idx.bring != null && e > b.idx.bring;
        const isLast = b.k === bands.length - 1;
        const prodRow = 2 + 2 * b.k;
        const diffRow = 3 + 2 * b.k;

        // quotient digit, above the bar, carmine (the answer being built)
        if (qShown) drawNum(b.qd, b.col, 0, CARM);

        // product, with a subtraction sign to its left
        if (prodShown) {
          drawNum(b.prod, b.col, prodRow, INK);
          ctx.font = digitFont;
          ctx.fillStyle = SOFT;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('−', xLeftEdge(b.prodLeftCol) - cw * 0.28, rowCenter(prodRow));
        }

        // subtraction line + difference
        if (diffShown) {
          ctx.strokeStyle = INK;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(xLeftEdge(b.curLeftCol) + 1, rowTop(diffRow));
          ctx.lineTo(xLeftEdge(b.col + 1) - 1, rowTop(diffRow));
          ctx.stroke();
          const remHere = isLast; // last band's difference is THE remainder
          drawNum(b.diff, b.col, diffRow, remHere ? CARM : INK);
          if (remHere && M.remainder >= 0) {
            ctx.font = smallFont;
            ctx.fillStyle = CARM;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(M.remainder === 0 ? 'r 0' : `r ${M.remainder}`, xCenter(b.col) + cw * 0.62, rowCenter(diffRow));
          }
        }

        // brought-down digit (a copy of the next dividend digit) + a small arrow
        if (bringShown && b.bringDigit != null) {
          drawNum(b.bringDigit, b.col + 1, diffRow, INK);
          ctx.strokeStyle = 'rgba(200,30,79,0.55)';
          ctx.lineWidth = 1.4;
          const ax = xCenter(b.col + 1);
          ctx.beginPath();
          ctx.moveTo(ax, rowCenter(1) + rh * 0.42);
          ctx.lineTo(ax, rowCenter(diffRow) - rh * 0.4);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ax - 3, rowCenter(diffRow) - rh * 0.4 - 3);
          ctx.lineTo(ax, rowCenter(diffRow) - rh * 0.4);
          ctx.lineTo(ax + 3, rowCenter(diffRow) - rh * 0.4 - 3);
          ctx.stroke();
        }
      });
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [dv, v, step, algoStep, target, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* changing the problem (dividend or divisor) reveals the full worked solution
     for the new numbers, and stops any running playback */
  useEffect(() => {
    setAlgoStep(BIG);
    setPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [D, v]);

  /* moving to a lesson step positions the step-through player to spotlight that
     step's action (Divide / Multiply-Subtract / Bring-down), else shows it whole */
  useEffect(() => {
    setPlaying(false);
    if (step === DIVIDE) setAlgoStep(1);
    else if (step === MULSUB) setAlgoStep(3);
    else if (step === BRING) setAlgoStep(4);
    else setAlgoStep(BIG);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* entering calibration: hand out a target, lock the divisor to it, and reset
     the dividend dials to 0 so the build starts un-matched */
  useEffect(() => {
    if (current.calib) {
      const t = target || makeTarget(null);
      if (!target) setTarget(t);
      setV(t.v);
      setDv([0, 0, 0, 0]);
      setPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the step-through player — time-based (ms interval), opt-in, reduced-motion
     jumps straight to the solved tableau */
  useEffect(() => {
    if (!playing) return;
    if (model.microLen === 0) {
      setPlaying(false);
      return;
    }
    const id = setInterval(() => {
      setAlgoStep((prev) => (prev >= model.microLen ? model.microLen : prev) + 1);
    }, 900);
    return () => clearInterval(id);
  }, [playing, model.microLen]);

  useEffect(() => {
    if (playing && eff >= model.microLen) setPlaying(false);
  }, [playing, eff, model.microLen]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onDigit = (idx, value) => {
    const val = parseInt(value, 10);
    setDv((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
    setPlaying(false);
  };
  const onDivisor = (value) => {
    setV(parseInt(value, 10));
    setPlaying(false);
  };

  const onStep = () => {
    setPlaying(false);
    setAlgoStep((s) => (s >= model.microLen ? model.microLen : s) + 1);
  };
  const onBackStep = () => {
    setPlaying(false);
    setAlgoStep((s) => Math.max(0, Math.min(s, model.microLen) - 1));
  };
  const onRestartSteps = () => {
    setPlaying(false);
    setAlgoStep(0);
  };
  const onSolve = () => {
    setPlaying(false);
    setAlgoStep(model.microLen);
  };
  const onPlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (reducedMotion) {
      setAlgoStep(model.microLen);
      return;
    }
    if (eff >= model.microLen) setAlgoStep(0);
    setPlaying(true);
  };

  const resetDials = () => {
    setDv(START.dv);
    setV(START.v);
    setPlaying(false);
    setAlgoStep(BIG);
  };

  // a fresh calibration target also re-locks the divisor to it and clears the build
  const newTarget = () => {
    const t = makeTarget(target);
    setTarget(t);
    setV(t.v);
    setDv([0, 0, 0, 0]);
    setPlaying(false);
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

  const dialsUnlocked = step >= SETUP;
  const explanation = explainStep(model, eff);
  const q = model.quotient;
  const r = model.remainder;

  const spoken =
    `Long division of ${D} by ${v}. ` +
    `The quotient is ${q}${r ? `, remainder ${r}` : ' with no remainder'}. ` +
    `Check: ${v} times ${q}${r ? ` plus ${r}` : ''} equals ${D}. ` +
    explanation +
    (calib && target ? ` Target: divide by ${target.v}, quotient ${target.Q} remainder ${target.r}.` : '');

  return (
    <div className="ldlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Multi-Digit Long Division</h1>
        <p className="lede">
          Divide a multi-digit number by a single digit the way it is done on paper — the repeating loop of{' '}
          <em>divide, multiply, subtract, bring down</em>. Build the problem with the place-value dials, then{' '}
          <em>step through</em> the algorithm and watch the quotient grow one place at a time, with any{' '}
          <em>remainder</em> left at the bottom. Every answer obeys{' '}
          <span className="mono">dividend = divisor × quotient + remainder</span>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              {D} ÷ {v} = {q}
              {r > 0 && <span className="rem"> R {r}</span>}
            </p>
            <p className="equation-sub mono">
              check: {v} × {q}
              {r ? ` + ${r}` : ''} = {D}
            </p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            <span className="hint mono">{calib ? 'build the dividend to the target' : 'divide · multiply · subtract · bring down'}</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — the dividend matches the target.' : ''}
          </p>

          <p className="explain">
            <span className="explain-k mono">
              {model.microLen ? `${Math.min(eff, model.microLen)}/${model.microLen}` : '—'}
            </span>
            {explanation}
          </p>

          <div className="facts">
            {!calib ? (
              <>
                <div className="fact">
                  <span className="fact-k">Dividend</span>
                  <span className="fact-v mono">{D}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Divisor</span>
                  <span className="fact-v mono">{v}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Quotient</span>
                  <span className="fact-v mono">{q}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Remainder</span>
                  <span className="fact-v mono">
                    {r}
                    {r === 0 ? ' · divides evenly' : ` · ${r} < ${v}`}
                  </span>
                </div>
                <div className="fact fact-wide">
                  <span className="fact-k">Check (multiply back)</span>
                  <span className="fact-v mono">
                    {v} × {q}
                    {r ? ` + ${r}` : ''} = {D}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="fact">
                  <span className="fact-k">Your dividend</span>
                  <span className="fact-v mono">{D}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Target</span>
                  <span className="fact-v mono">
                    ÷ {target ? target.v : '—'} → {target ? target.Q : '—'}
                    {target && target.r ? ` R ${target.r}` : target ? ' R 0' : ''}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">This division</span>
                  <span className="fact-v mono">
                    {q}
                    {r ? ` R ${r}` : ' R 0'}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">Exact?</span>
                  <span className="fact-v mono">
                    {calibrated ? `${target.v} × ${target.Q}${target.r ? ` + ${target.r}` : ''} = ${D} ✓` : 'not yet'}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={onRestartSteps} title="Rewind to the start of the algorithm">
              ⏮ Restart
            </button>
            <button type="button" className="btn ghost" onClick={onBackStep} disabled={eff <= 0}>
              ‹ Back
            </button>
            <button type="button" className="btn" onClick={onStep} disabled={eff >= model.microLen}>
              Step ›
            </button>
            <button type="button" className={'btn ghost' + (playing ? ' on' : '')} onClick={onPlay} disabled={model.microLen === 0}>
              {playing ? '⏸ Pause' : '▶ Play'}
            </button>
            <button type="button" className="btn ghost" onClick={onSolve} disabled={eff >= model.microLen}>
              Solve ⏭
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

          <div className={'dials' + (dialsUnlocked ? '' : ' locked')}>
            <div className="dial-head">
              <span className="dh-k">Dividend</span>
              <span className="dh-v mono">{dialsUnlocked ? D : '🔒'}</span>
            </div>
            <div className="digits">
              {PLACES.map((lbl, idx) => (
                <label className="digit" key={lbl}>
                  <span className="digit-lbl">{lbl}</span>
                  <input
                    type="range"
                    min={0}
                    max={9}
                    step={1}
                    value={dv[idx]}
                    disabled={!dialsUnlocked}
                    aria-label={`${['thousands', 'hundreds', 'tens', 'ones'][idx]} digit`}
                    onChange={(e) => onDigit(idx, e.target.value)}
                  />
                  <output className="digit-v mono">{dv[idx]}</output>
                </label>
              ))}
            </div>

            <div className="dial-head divisor-head">
              <span className="dh-k">Divisor {calib ? '(locked to target)' : ''}</span>
              <span className="dh-v mono">{dialsUnlocked ? v : '🔒'}</span>
            </div>
            <label className="digit divisor">
              <span className="digit-lbl">÷</span>
              <input
                type="range"
                min={VMIN}
                max={VMAX}
                step={1}
                value={v}
                disabled={!dialsUnlocked || calib}
                aria-label="divisor"
                onChange={(e) => onDivisor(e.target.value)}
              />
              <output className="digit-v mono">{v}</output>
            </label>
            {!calib && (
              <button type="button" className="btn ghost tiny" onClick={resetDials} disabled={!dialsUnlocked}>
                Reset to 738 ÷ 6
              </button>
            )}
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

          {current.calib && target && (
            <div className="calib">
              <p className="calib-goal">
                Build a dividend so that <strong className="mono">÷ {target.v}</strong> gives{' '}
                <strong className="mono">
                  {target.Q}
                  {target.r ? ` R ${target.r}` : ' R 0'}
                </strong>
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
                    {D < req ? 'dividend too small' : 'dividend too large'}
                  </span>
                )}
              </div>
              {calibrated && (
                <p className="factnote">
                  {D} ÷ {target.v} = {target.Q}
                  {target.r ? ` R ${target.r}` : ' with no remainder'}, because {target.v} × {target.Q}
                  {target.r ? ` + ${target.r}` : ''} = {D}. Step through the stage to see it come out.
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
                  setPlaying(false);
                  setDv(START.dv);
                  setV(START.v);
                  setAlgoStep(BIG);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">divide · multiply · subtract · bring down</span> &nbsp;·&nbsp; the standard long-division
        algorithm, built live from the dials — <span className="mono">dividend = divisor × quotient + remainder</span> on
        a quadrille grid.
      </footer>

      <style jsx>{`
        .ldlab {
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
          grid-template-columns: minmax(0, 1fr) 360px;
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
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }
        .equation .rem {
          opacity: 0.85;
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
          background: rgba(251, 251, 248, 0.78);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .explain {
          margin: 12px 4px 0;
          font-size: 13px;
          line-height: 1.5;
          color: var(--ink);
          min-height: 2.6em;
          display: flex;
          gap: 9px;
          align-items: baseline;
        }
        .explain-k {
          flex: none;
          font-size: 11px;
          color: var(--curve);
          border: 1px solid rgba(200, 30, 79, 0.4);
          border-radius: 5px;
          padding: 2px 6px;
          font-variant-numeric: tabular-nums;
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
        .fact-wide {
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
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .btn {
          font: 600 13px/1 system-ui, sans-serif;
          padding: 9px 13px;
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
        .btn.tiny {
          font-size: 12px;
          padding: 6px 10px;
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
          border: 1px solid rgba(28, 43, 58, 0.12);
          border-radius: 10px;
          padding: 12px 12px 14px;
          background: var(--paper);
        }
        .dials.locked {
          opacity: 0.55;
        }
        .dial-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 8px;
        }
        .divisor-head {
          margin-top: 14px;
        }
        .dh-k {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .dh-v {
          font-size: 18px;
          font-weight: 600;
          color: var(--curve);
          font-variant-numeric: tabular-nums;
        }
        .digits {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .digit {
          display: grid;
          grid-template-rows: auto auto auto;
          justify-items: center;
          gap: 4px;
        }
        .digit-lbl {
          font-size: 10.5px;
          letter-spacing: 0.05em;
          color: var(--ink-soft);
          font-family: var(--mono);
        }
        .digit input[type='range'] {
          writing-mode: vertical-lr;
          direction: rtl;
          width: 22px;
          height: 84px;
          accent-color: var(--ink);
          cursor: pointer;
        }
        .digit input[type='range']:disabled {
          cursor: not-allowed;
        }
        .digit-v {
          font-size: 15px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .divisor {
          grid-template-columns: 22px 1fr 28px;
          grid-template-rows: auto;
          align-items: center;
          justify-items: stretch;
          gap: 10px;
          margin-top: 2px;
        }
        .divisor .digit-lbl {
          font-size: 16px;
        }
        .divisor input[type='range'] {
          writing-mode: horizontal-tb;
          direction: ltr;
          width: 100%;
          height: auto;
        }
        .divisor .digit-v {
          text-align: right;
        }
        .dials .tiny {
          margin-top: 12px;
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
          color: var(--curve);
          font-size: 15px;
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
        :global(.ldlab) :focus-visible {
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
