'use client';

/* ============================================================================
   ComparingLab — an interactive "bench" for COMPARING two whole numbers:
   deciding which is GREATER, which is LESS, or whether they are EQUAL, and
   recording that decision with the symbols  >  <  =.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Where NumberLab teaches
   how ONE number is built from place value, ComparingLab teaches the relation
   BETWEEN two numbers — the heart of CCSS K.CC.C.6-7 (which group has more),
   1.NBT.B.3 (compare two two-digit numbers), 2.NBT.A.4 and 4.NBT.A.2 (compare
   multi-digit numbers by place value using >, =, <).  It is the foundation for
   ordering, rounding, estimation, and every inequality a student will ever meet.

   The signature centerpiece is the "COMPARE FROM THE LEFT" algorithm made
   visible.  Two things are drawn from the same state:

     1) MAGNITUDE BARS — each number is a proportional bar on a shared scale, so
        "greater" is literally "longer/farther."  This is the number-line idea
        generalised: the bigger number reaches further.  When the two numbers
        are close (like 458 vs 461) the bars look almost the same — and THAT is
        the moment the digit algorithm earns its keep.

     2) A PLACE-VALUE DIGIT GRID — the two numbers stacked and lined up by place
        (ones on the right).  A scan starts at the HIGHEST place and moves right;
        the FIRST place whose digits differ decides the whole comparison — even
        when a lower place has a bigger digit (458 vs 461: the tens decide, so
        461 wins although 8 > 1 in the ones).  Equal all the way ⇒ equal numbers.

   The symbol is taught honestly: its WIDE OPEN side faces the GREATER number and
   its POINT points at the SMALLER — and the very same fact can be written two
   ways (7 > 3 is the same truth as 3 < 7).

   One-accent discipline: the two numbers are the objects, so they own the two
   colours — A is the carmine number you build, B its restrained-blue companion.
   The decision (the greater one, the deciding place) is marked in green so it
   reads as "the answer," never as a third object.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/ComparingLab.jsx
     2. Import and render it:
          import ComparingLab from './ComparingLab';
          export default function Page() { return <ComparingLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, step, …).
     MODEL  — the math is pure integer arithmetic; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window.  Two whole numbers from 0 to 999: three place columns
   (hundreds, tens, ones).  Three places are enough for the deciding-place idea
   to shine, and every value is reachable from three 0-9 digit dials.
   ------------------------------------------------------------------------- */
const VMIN = 0;
const VMAX = 999;

/* Places, written LEFT to RIGHT the way we read and compare them. */
const PLACES = [
  { name: 'Hundreds', short: 'hundreds', mult: 100 },
  { name: 'Tens', short: 'tens', mult: 10 },
  { name: 'Ones', short: 'ones', mult: 1 },
];
const NP = PLACES.length; // 3

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Two whole numbers on the same scale.
     A — the number you build (the star). Dials unlock at step 2.
     B — the companion you compare it with. Dials unlock at step 3.
   Starting on 27 vs 72 is deliberate: SAME two digits {2, 7}, different order,
   so "which digits appear" cannot decide it — the PLACE does. 72 > 27.
   ------------------------------------------------------------------------- */
const START_A = 27;
const START_B = 72;

const GRID_STEP = 3; // the place-value digit grid reveals here
const CALIB_STEP = 5;

const showsGrid = (s) => s >= GRID_STEP;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Whole-number comparison is exact; there is nothing to
   approximate.  These functions ARE the mathematics the lab teaches.
   ------------------------------------------------------------------------- */
const clampN = (n) => Math.max(VMIN, Math.min(VMAX, Math.round(n)));

/* Digits of n, padded to NP places, LEFT to RIGHT: 27 -> [0, 2, 7]. */
const digitsOf = (n) => {
  const v = clampN(n);
  return PLACES.map((p) => Math.floor(v / p.mult) % 10);
};

/* How many digits n is actually written with (no leading zeros). 0 is 1 digit. */
const numDigits = (n) => String(clampN(n)).length;

/* The comparison itself. */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const relSym = (a, b) => (a < b ? '<' : a > b ? '>' : '=');
const relWord = (a, b) => (a < b ? 'less than' : a > b ? 'greater than' : 'equal to');

/* The deciding place: scanning from the LEFT (highest place first), the index
   of the FIRST place whose digits differ.  -1 when the numbers are equal. */
const decidingPlace = (a, b) => {
  const da = digitsOf(a);
  const db = digitsOf(b);
  for (let i = 0; i < NP; i++) if (da[i] !== db[i]) return i;
  return -1;
};

/* ---------------------------------------------------------------------------
   Whole number -> US-English words (0-999), for the readout and the screen-
   reader description.  No "and" (2-digit "one hundred five", not "…and five").
   ------------------------------------------------------------------------- */
const ONES_W = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS_W = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const under100 = (n) => (n < 20 ? ONES_W[n] : TENS_W[Math.floor(n / 10)] + (n % 10 ? '-' + ONES_W[n % 10] : ''));
const numberWord = (n) => {
  const v = clampN(n);
  if (v < 100) return under100(v);
  const h = Math.floor(v / 100);
  const rest = v % 100;
  return ONES_W[h] + ' hundred' + (rest ? ' ' + under100(rest) : '');
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): read a CLUE that names ONE number relative to a fixed B, then
   BUILD A to it with the digit dials.  Each clue exercises the < / > / = relation
   and the discreteness of whole numbers (there is nothing between B and B+1).
   The meter reads "warmth" (how close), with a directional hint; CALIBRATED only
   when A lands exactly on the target.
   ------------------------------------------------------------------------- */
function makeClue(prev) {
  const R = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const build = () => {
    const kind = R(0, 4);
    const b = R(6, 990); // room for B +/- 1 to stay in [0, 999]
    switch (kind) {
      case 0:
        return { b, t: b, clue: `a number EQUAL to ${b}`, kind };
      case 1:
        return { b, t: b - 1, clue: `the GREATEST whole number that is still LESS than ${b}`, kind };
      case 2:
        return { b, t: b + 1, clue: `the LEAST whole number that is GREATER than ${b}`, kind };
      case 3:
        return { b, t: b + 1, clue: `the only whole number GREATER than ${b} and LESS than ${b + 2}`, kind };
      default:
        return { b, t: b - 1, clue: `the only whole number LESS than ${b} and GREATER than ${b - 2}`, kind };
    }
  };
  let r;
  do {
    r = build();
  } while (prev != null && r.t === prev.t); // fresh target each time
  return r;
}

/* Warmth = closeness; 0 beyond 100 away, 100 exact.  The directional hint does
   the coarse guiding, the meter the fine tuning. */
const matchPercent = (a, t) => Math.max(0, Math.min(100, 100 - Math.abs(a - t)));
const isCalibrated = (a, t) => a === t;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; dials unlock with the step; the reveal
   lives in `feedback`; distractors are real learner misconceptions ("compare
   the digits present," "the ones digit decides," "more digits can be smaller").
   Next is gated on ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'What is comparing?',
    body: 'The longer bar is the greater number. A is 27, B is 72.',
    q: 'Comparing two numbers finds…',
    choices: ['Greater, less, or equal', 'Their sum', 'Their digits'],
    answer: 0,
    feedback: '27 and 72 use the same digits — but 72 is greater!',
  },
  {
    title: 'The three symbols: >  <  =',
    body: 'The open side always faces the BIGGER number. Change A and watch.',
    q: 'Which symbol makes  8 ▢ 3  true?',
    choices: ['>  (greater than)', '<  (less than)', '=  (equal to)'],
    answer: 0,
    feedback: '8 > 3. Open side → big number.',
  },
  {
    title: 'Same fact, two ways',
    body: '“8 > 3” and “3 < 8” say the same thing. Swap and flip!',
    q: '5 < 9. Which says the SAME thing?',
    choices: ['9 > 5', '9 < 5', '5 > 9'],
    answer: 0,
    feedback: 'Swap the order, flip the symbol. The open side still faces the 9.',
  },
  {
    title: 'Compare from the LEFT',
    body: 'Compare the highest place first. Press “Scan places” to watch.',
    q: 'Compare 458 and 461. Which is greater?',
    choices: ['461', '458', 'they are equal'],
    answer: 0,
    feedback: 'Hundreds tie. Tens: 6 > 5, so 461 wins. The left decides!',
  },
  {
    title: 'More digits, bigger number',
    body: 'A 3-digit whole number beats any 2-digit one.',
    q: 'Which is greater, 89 or 100?',
    choices: ['100', '89', 'they are equal'],
    answer: 0,
    feedback: '100 has a hundreds place; 89 does not. (Whole numbers only!)',
  },
  {
    title: 'Build the number',
    body: 'Read the clue. Build A. The meter warms as you near it.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display.  The comparison statement, big:  A  [symbol]  B,
   with A carmine, B blue, and the relation symbol in ink; beneath it a plain-
   words reading and (once B is live) the same fact written the other way.
   Colour is the pedagogical link between symbol and picture.
   ------------------------------------------------------------------------- */
/* Styles are inlined here (not in the styled-jsx block) because these spans are
   rendered by a CHILD component; styled-jsx only scopes a component's own JSX,
   so inlining keeps the readout identical in Next.js and in any plain preview. */
const NUM_STYLE = (color) => ({
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  fontVariantNumeric: 'tabular-nums',
  fontSize: '30px',
  fontWeight: 700,
  color,
  letterSpacing: '0.01em',
});
const SYM_STYLE = {
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  fontSize: '30px',
  fontWeight: 700,
  color: '#1c2b3a',
  padding: '0 2px',
};
const CHIP_BASE = {
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  fontSize: '12.5px',
  fontWeight: 700,
  padding: '3px 8px',
  borderRadius: '999px',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};
function CompareEquation({ a, b }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
      <span style={NUM_STYLE('#c81e4f')}>{a}</span>
      <span style={SYM_STYLE}>{relSym(a, b)}</span>
      <span style={NUM_STYLE('#3f74a6')}>{b}</span>
      <span style={{ ...CHIP_BASE, color: '#2e8b6f', background: 'rgba(46,139,111,0.1)' }}>
        {b} {relSym(b, a)} {a}
      </span>
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ComparingLab() {
  const [a, setA] = useState(START_A);
  const [b, setB] = useState(START_B);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [riddle, setRiddle] = useState(null); // { b, t, clue, kind }
  const [scanning, setScanning] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const scanRef = useRef(0); // columns revealed during the animated scan
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const aUnlocked = step >= 1;
  const bUnlocked = step >= 2 && !calib; // B is fixed (the reference) during the game
  const showGrid = showsGrid(step);

  const dec = decidingPlace(a, b);

  // Snapshot everything the renderer needs so the stable draw() callback never
  // reads stale values.
  sceneRef.current = { a, b, step, calib, showGrid, dec, scanning };
  const pct = riddle ? matchPercent(a, riddle.t) : 0;
  const calibrated = riddle ? isCalibrated(a, riddle.t) : false;
  const dirHint = riddle ? (a < riddle.t ? 'make A larger →' : a > riddle.t ? '← make A smaller' : '') : '';
  sceneRef.current._cal = calib && riddle != null && calibrated;

  /* ---- full redraw from state ------------------------------------------- */
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
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    /* palette (kept beside the CSS tokens) */
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const CARMINE = '#C81E4F';
    const BLUE = '#3F74A6';
    const GREEN = '#2E8B6F';
    const OK = '#1F8A5B';

    const S = sceneRef.current;
    const A = S.a;
    const B = S.b;

    const rr = (x, y, w, h, rad) => {
      const t = Math.min(rad, w / 2, h / 2);
      g.beginPath();
      g.moveTo(x + t, y);
      g.arcTo(x + w, y, x + w, y + h, t);
      g.arcTo(x + w, y + h, x, y + h, t);
      g.arcTo(x, y + h, x, y, t);
      g.arcTo(x, y, x + w, y, t);
      g.closePath();
    };

    g.clearRect(0, 0, W, H);

    /* ---- quadrille paper: faint rules -------------------------------------- */
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(199,216,228,0.4)';
    g.beginPath();
    const gs = 28;
    for (let y = gs; y < H; y += gs) {
      g.moveTo(0, Math.round(y) + 0.5);
      g.lineTo(W, Math.round(y) + 0.5);
    }
    for (let x = gs; x < W; x += gs) {
      g.moveTo(Math.round(x) + 0.5, 0);
      g.lineTo(Math.round(x) + 0.5, H);
    }
    g.stroke();

    const padL = 16;
    const padR = 16;

    /* ======================================================================
       MAGNITUDE BARS — each number as a proportional bar on a SHARED scale
       (the larger one fills the track), so "greater" reads as "longer."
       ==================================================================== */
    const barsTop = Math.round(H * (S.showGrid ? 0.10 : 0.24));
    const originX = padL + 34; // room for the A / B chip
    const barMaxW = W - originX - padR - 66; // room for the value label at the end
    const scale = Math.max(A, B, 1);
    const barH = S.showGrid ? Math.max(20, Math.round(H * 0.11)) : Math.max(26, Math.round(H * 0.15));
    const barGap = Math.round(barH * 0.7);

    const drawBar = (val, y, color, letter, isGreater, tie) => {
      // track
      g.fillStyle = 'rgba(28,43,58,0.05)';
      rr(originX, y, barMaxW, barH, 6);
      g.fill();
      // fill proportional to value
      const w = (val / scale) * barMaxW;
      g.fillStyle = color;
      rr(originX, y, Math.max(2, w), barH, 6);
      g.fill();
      // letter chip at the left
      g.fillStyle = color;
      g.font = '700 15px ui-monospace, Menlo, monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(letter, padL + 14, y + barH / 2);
      // value at the right end of the track
      g.fillStyle = INK;
      g.font = '700 16px ui-monospace, Menlo, monospace';
      g.textAlign = 'left';
      g.fillText(String(val), originX + barMaxW + 8, y + barH / 2 + 0.5);
      // "greater" tag on the winning bar (green = the decision)
      if (isGreater && !tie) {
        g.fillStyle = GREEN;
        g.font = '700 10.5px ui-monospace, Menlo, monospace';
        g.textAlign = 'right';
        g.textBaseline = 'bottom';
        g.fillText('▶ greater', originX + Math.max(2, w) - 4, y - 2);
        g.textBaseline = 'middle';
      }
    };

    const tie = A === B;
    drawBar(A, barsTop, CARMINE, 'A', A > B, tie);
    drawBar(B, barsTop + barH + barGap, BLUE, 'B', B > A, tie);

    // relation caption sitting to the right, tying the two bars together
    {
      const cy = barsTop + barH + barGap / 2;
      g.fillStyle = tie ? INK_SOFT : GREEN;
      g.font = '700 13px ui-monospace, Menlo, monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const label = `${A} ${relSym(A, B)} ${B}`;
      g.fillText(label, originX + barMaxW + 37, cy);
    }
    if (tie) {
      g.fillStyle = INK_SOFT;
      g.font = 'italic 600 11px ui-monospace, Menlo, monospace';
      if (W < 260) {
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        const equalityY = barsTop + 2 * barH + barGap + 7;
        g.fillText('same length', W / 2, equalityY - 7);
        g.fillText(`${A} = ${B}`, W / 2, equalityY + 7);
      } else {
        g.textAlign = 'left';
        g.textBaseline = 'top';
        g.fillText('equal — same length', originX + 2, barsTop + 2 * barH + barGap + 6);
      }
    } else if (Math.abs(A - B) <= 3 && S.showGrid) {
      g.fillStyle = INK_SOFT;
      g.font = 'italic 600 11px ui-monospace, Menlo, monospace';
      g.textAlign = 'left';
      g.textBaseline = 'top';
      // adaptive: the full phrase overflows a narrow (phone) canvas, so fall
      // back to a compact version when it will not fit
      const full = 'bars too close — check the digits ↓';
      const short = 'too close — compare the digits ↓';
      const avail = W - originX - padR - 2;
      const msg = g.measureText(full).width <= avail ? full : short;
      g.fillText(msg, originX + 2, barsTop + 2 * barH + barGap + 6);
    }

    if (!S.showGrid) return; // steps 0–2: bars + symbol only

    /* ======================================================================
       PLACE-VALUE DIGIT GRID — the two numbers lined up by place, scanned from
       the left; the first place that differs is highlighted in green.
       ==================================================================== */
    const gridTop = Math.round(H * 0.47);
    const cellH = Math.max(28, Math.round(H * 0.155));
    const gap = 10;
    const gridW = Math.min(barMaxW + 66, W - 2 * padL);
    const cellW = Math.min(64, Math.round((gridW - 2 * (NP - 1)) / NP) - gap);
    const totalW = NP * cellW + (NP - 1) * gap;
    const gridL = Math.round((W - totalW) / 2);
    const headerY = gridTop + 10; // place-name labels (baseline)
    const markY = gridTop + 30; // scan marks band (baseline), clear of the headers
    const rowAY = gridTop + 36;
    const rowBY = rowAY + cellH + 8;

    const da = digitsOf(A);
    const db = digitsOf(B);
    const lz = (n) => NP - numDigits(n); // number of leading "ghost" zeros

    // how far the scan has revealed
    const target = tie ? NP : S.dec + 1; // columns to consider to reach a decision
    const revealed = S.scanning ? Math.min(scanRef.current, target) : target;

    // column headers (place names + place values)
    for (let i = 0; i < NP; i++) {
      const x = gridL + i * (cellW + gap);
      g.fillStyle = INK_SOFT;
      g.font = '600 10px system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'bottom';
      g.fillText(PLACES[i].name, x + cellW / 2, headerY);
    }

    const drawDigitRow = (digits, ghosts, y, color, n) => {
      for (let i = 0; i < NP; i++) {
        const x = gridL + i * (cellW + gap);
        const ghost = i < ghosts;
        const decided = !tie && i === S.dec && revealed >= target;
        // cell
        g.fillStyle = decided ? 'rgba(46,139,111,0.12)' : ghost ? 'rgba(28,43,58,0.03)' : '#fff';
        rr(x, y, cellW, cellH, 8);
        g.fill();
        g.lineWidth = decided ? 2.2 : 1.2;
        g.strokeStyle = decided ? GREEN : 'rgba(28,43,58,0.16)';
        rr(x, y, cellW, cellH, 8);
        g.stroke();
        // digit
        g.fillStyle = ghost ? 'rgba(28,43,58,0.22)' : color;
        g.font = '700 ' + Math.round(cellH * 0.6) + 'px ui-monospace, Menlo, monospace';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(digits[i]), x + cellW / 2, y + cellH / 2 + 1);
      }
    };
    drawDigitRow(da, lz(A), rowAY, CARMINE, A);
    drawDigitRow(db, lz(B), rowBY, BLUE, B);

    // scan marks: a check over each already-compared EQUAL column, an arrow to
    // the deciding one
    for (let i = 0; i < Math.min(revealed, NP); i++) {
      const x = gridL + i * (cellW + gap) + cellW / 2;
      const equalHere = da[i] === db[i];
      const isDecider = !tie && i === S.dec;
      if (isDecider && revealed >= target) {
        g.fillStyle = GREEN;
        g.font = '700 12px ui-monospace, Menlo, monospace';
        g.textAlign = 'center';
        g.textBaseline = 'bottom';
        g.fillText(relSym(da[i], db[i]) === '>' ? '↑ bigger' : '↓ bigger', x, markY);
      } else if (equalHere) {
        g.fillStyle = 'rgba(28,43,58,0.4)';
        g.font = '700 12px ui-monospace, Menlo, monospace';
        g.textAlign = 'center';
        g.textBaseline = 'bottom';
        g.fillText('✓ =', x, markY);
      }
    }

    // the verdict caption under the grid
    if (revealed >= target) {
      const cy = rowBY + cellH + 16;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (tie) {
        g.fillStyle = INK_SOFT;
        g.font = '600 13px system-ui, sans-serif';
        g.fillText(`Every place matches  →  ${A} = ${B}`, W / 2, cy);
      } else {
        g.fillStyle = GREEN;
        g.font = '700 13px system-ui, sans-serif';
        const place = PLACES[S.dec].name;
        g.fillText(
          `${place} decide:  ${da[S.dec]} ${relSym(da[S.dec], db[S.dec])} ${db[S.dec]}   →   ${A} ${relSym(A, B)} ${B}`,
          W / 2,
          cy,
        );
      }
    }

    /* ---- calibrated stamp -------------------------------------------------- */
    if (S._cal) {
      g.save();
      g.translate(W / 2, Math.max(20, H * 0.055));
      g.rotate(-0.05);
      g.fillStyle = 'rgba(31,138,91,0.10)';
      rr(-72, -16, 144, 32, 7);
      g.fill();
      g.strokeStyle = OK;
      g.lineWidth = 2;
      rr(-72, -16, 144, 32, 7);
      g.stroke();
      g.fillStyle = OK;
      g.font = '700 14px ui-monospace, Menlo, monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('✓ CALIBRATED', 0, 0.5);
      g.restore();
    }
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [a, b, step, riddle, scanning, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a clue to the calibration step the first time we reach it; fix B to the
     clue's reference and clear A to 0 so it starts plainly un-matched. */
  useEffect(() => {
    if (current.calib && riddle == null) {
      const r = makeClue(null);
      setRiddle(r);
      setB(r.b);
      setA(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* "Scan places" — the deciding-place highlight sweeps left→right, one place at
     a time.  Time-based, opt-in, and respectful of reduced motion. */
  useEffect(() => {
    if (!scanning) {
      scanRef.current = 0;
      return;
    }
    const S = sceneRef.current;
    const target = S.a === S.b ? NP : decidingPlace(S.a, S.b) + 1;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setScanning(false);
      return;
    }
    scanRef.current = 0;
    let raf;
    let start = null;
    const per = 520; // ms per place
    const loop = (now) => {
      if (start == null) start = now;
      const cols = Math.min(target, 1 + Math.floor((now - start) / per));
      scanRef.current = cols;
      draw();
      if (cols < target) raf = requestAnimationFrame(loop);
      else {
        // hold the finished scan briefly, then release to the static view
        setTimeout(() => setScanning(false), 500);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [scanning, draw]);

  /* ---- controls: per-digit dials ---------------------------------------- */
  const setDigit = (which, placeIdx, val) => {
    const v = Math.max(0, Math.min(9, parseInt(val, 10) || 0));
    if (which === 'a') {
      setA((prev) => {
        const d = digitsOf(prev);
        d[placeIdx] = v;
        return clampN(d[0] * 100 + d[1] * 10 + d[2]);
      });
    } else {
      setB((prev) => {
        const d = digitsOf(prev);
        d[placeIdx] = v;
        return clampN(d[0] * 100 + d[1] * 10 + d[2]);
      });
    }
    if (scanning) setScanning(false);
  };

  const choose = (idx) => {
    if (answers[step] != null) return; // lock the answer once given
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const resetPoints = () => {
    if (scanning) setScanning(false);
    if (calib) setA(0);
    else {
      setA(START_A);
      setB(START_B);
    }
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* spoken description (accessibility) */
  const spokenParts = [`Comparing A, ${numberWord(a)}, with B, ${numberWord(b)}.`, `A is ${relWord(a, b)} B.`];
  if (showGrid && dec >= 0) spokenParts.push(`The ${PLACES[dec].short} place decides.`);
  else if (showGrid && dec < 0) spokenParts.push('Every place matches, so they are equal.');
  const spoken = spokenParts.join(' ');

  const da = digitsOf(a);
  const db = digitsOf(b);

  return (
    <div className="clab">
      <header className="head">
        <h1>Comparing Numbers: Greater, Less, or Equal</h1>
        <p className="lede">
          Two numbers, one question: <em>which is more?</em> Watch the bars show size, learn the
          symbols <span className="mono">&gt; &lt; =</span>, and master the one rule that always
          works — <em>compare the places from the left,</em> and the first place that differs decides.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <CompareEquation a={a} b={b} />
            </p>
            <p className="equation-sub mono">
              {numberWord(a)} <span className="rel">is {relWord(a, b)}</span> {numberWord(b)}
            </p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {aUnlocked ? 'set the digits with the dials →' : 'step forward to unlock the dials →'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — you built the mystery number.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Statement</span>
              <span className="fact-v mono">
                {a} {relSym(a, b)} {b}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">In words</span>
              <span className="fact-v">A is {relWord(a, b)} B</span>
            </div>
            <div className="fact">
              <span className="fact-k">Greater / Less</span>
              <span className="fact-v mono">
                {a === b ? 'equal' : `${Math.max(a, b)} > ${Math.min(a, b)}`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Deciding place</span>
              <span className="fact-v">
                {!showGrid ? '—' : dec < 0 ? 'none (equal)' : PLACES[dec].name}
              </span>
            </div>
          </div>

          <div className="toolbar">
            {showGrid && (
              <button
                type="button"
                className={'btn ghost' + (scanning ? ' on' : '')}
                onClick={() => setScanning((s) => !s)}
                title="Scan from the left"
              >
                {scanning ? 'Scanning…' : 'Scan places'}
              </button>
            )}
            <button type="button" className="btn ghost" onClick={resetPoints}>
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
            <DigitDials
              which="a"
              label="A"
              color="#c81e4f"
              value={a}
              digits={da}
              unlocked={aUnlocked}
              unlockMsg="unlocks at step 2"
              roleMsg={calib ? 'build A to match the clue' : 'the number you build'}
              onDigit={setDigit}
            />
            <DigitDials
              which="b"
              label="B"
              color="#3f74a6"
              value={b}
              digits={db}
              unlocked={bUnlocked}
              unlockMsg={calib ? 'fixed for the challenge' : 'unlocks at step 3'}
              roleMsg="the number to compare with"
              onDigit={setDigit}
            />
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

          {current.calib && riddle != null && (
            <div className="calib">
              <div className="clue-card">
                <span className="clue-k">Build A to be…</span>
                <span className="clue-text">{riddle.clue}</span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">warmth&nbsp;{pct}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono dir-hint">{dirHint || `A = ${a}`}</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const r = makeClue(riddle);
                  setRiddle(r);
                  setB(r.b);
                  setA(0);
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
                  setRiddle(null);
                  setScanning(false);
                  setA(START_A);
                  setB(START_B);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">27 &lt; 72</span> &nbsp;·&nbsp; comparing whole numbers — the symbols
        &gt; &lt; =, and place value from the left (CCSS K.CC.C.7, 1.NBT.B.3, 2.NBT.A.4, 4.NBT.A.2).
      </footer>

      <style jsx>{`
        .clab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --a: #c81e4f;
          --b: #3f74a6;
          --ok-green: #2e8b6f;
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
          line-height: 1.15;
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
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
          text-transform: capitalize;
        }
        .equation-sub .rel {
          text-transform: none;
          font-style: italic;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 8 / 5;
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
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 5 / 5;
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
        .btn.ghost.on {
          background: var(--ok-green);
          border-color: var(--ok-green);
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
          background: var(--a);
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
          gap: 14px;
          margin-bottom: 6px;
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
          border-left: 3px solid var(--a);
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
          background: rgba(63, 116, 166, 0.06);
        }
        .clue-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .clue-text {
          font-family: var(--serif);
          font-size: 17px;
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
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.5), var(--a));
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
        :global(.clab) :focus-visible {
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
   A number's three digit dials (hundreds / tens / ones), each a native 0-9
   slider so keyboard and touch come free.  The whole group locks until its
   step.  Styles are inlined because this is a CHILD component (styled-jsx only
   scopes the parent's own JSX).
   ------------------------------------------------------------------------- */
function DigitDials({ which, label, color, value, digits, unlocked, unlockMsg, roleMsg, onDigit }) {
  return (
    <div style={{ opacity: unlocked ? 1 : 0.5 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
        <span
          style={{
            fontFamily: '"Iowan Old Style", Palatino, Georgia, serif',
            fontWeight: 700,
            fontSize: '18px',
            color,
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: '11px', color: '#5b6b7b' }}>{unlocked ? roleMsg : unlockMsg}</span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontWeight: 700,
            fontSize: '17px',
            color: unlocked ? color : '#5b6b7b',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {unlocked ? value : '🔒'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {PLACES.map((p, i) => (
          <label
            key={p.name}
            style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}
          >
            <span style={{ fontSize: '9.5px', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5b6b7b' }}>
              {p.name}
            </span>
            <input
              type="range"
              min={0}
              max={9}
              step={1}
              value={digits[i]}
              disabled={!unlocked}
              aria-label={`${label} — ${p.short} digit`}
              onChange={(e) => onDigit(which, i, e.target.value)}
              style={{ width: '100%', accentColor: color, cursor: unlocked ? 'pointer' : 'not-allowed' }}
            />
            <span
              style={{
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontWeight: 700,
                fontSize: '15px',
                color: unlocked ? color : '#5b6b7b',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {digits[i]}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
