'use client';

/* ============================================================================
   PercentageLab — an interactive "bench" for PERCENT: percent means "per
   hundred."  p% = p/100 = a decimal = a fraction, and p% OF a whole W is the
   part (p/100)·W.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at grades 5–7
   (CCSS 6.RP.A.3.C — "find a percent of a quantity as a rate per 100"; ties
   back to 5.NBT decimals and 4.NF fractions).  A child who already knows tenths
   and hundredths meets the word "percent," learns it is literally "per 100,"
   and discovers the single most misused idea in the topic: a percent is a RATE,
   not an amount — it only becomes an amount once you take it OF a whole.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter and a CALIBRATED stamp.  Sibling
   of the Decimal lab: it reuses the base-ten 10×10 grid, because "percent" is
   the same hundred, renamed.

   The signature centerpiece is TWO linked models of one percent:
     • the 100-GRID — one whole cut into 100 equal cells.  Each cell is 1%, each
       column of ten is 10%.  Shade p cells and you SEE p% = p/100 = a decimal.
       This is percent as "per hundred" (the area model).
     • the DOUBLE NUMBER LINE (percent bar) — a whole amount W with a percent
       scale (0–100%) on top and the matching quantity scale (0–W) below.  The
       marker at p% lines up with the part (p/100)·W.  This is percent OF a
       quantity (the measurement model).
   One number, two pictures — the Decimal lab's grid-plus-number-line idea,
   retuned for percent.

   One-accent discipline: CARMINE is the mathematical object — the percent, the
   shaded cells, the bar's fill, the value marker.  Completed 10% columns are a
   stronger carmine, loose 1% cells a lighter carmine, so "tens of percent vs
   ones of percent" reads at a glance while staying one hue.  BLUE is only
   structure — the whole's outline, the grid rules, the bar's track, the
   quantity scale.

   All arithmetic is EXACT and integer, so a K-12 student never sees a float
   artefact like 0.30000000004:
     • p is an integer 0…100; the decimal is built from p's digits.
     • the part is kept in HUNDREDTHS of the unit:  partH = p · W  (an integer),
       and only divided by 100 for display, formatted exactly (40, 7.5, 6.25).
     • the fraction p/100 is reduced with an integer gcd.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/PercentageLab.jsx
     2. Import and render it:
          import PercentageLab from './PercentageLab';
          export default function Page() { return <PercentageLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (percent, whole index,
              lesson step).
     MODEL  — the math is exact integer percent/place value; it knows no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Two dials, unlocked as the lesson earns them. The
   percent dial is the star and is live from step 1. The whole dial unlocks only
   once the lesson turns from "what a percent IS" to "a percent OF a quantity" —
   because until you have a whole, a percent has no amount.

   The whole is chosen from a short list of friendly bases so the double number
   line stays legible and the parts stay classroom-clean; the slider selects an
   index into WHOLES and the readout shows the value itself.
   ------------------------------------------------------------------------- */
const WHOLES = [20, 40, 50, 60, 80, 100, 200];
const DEFAULT_W = 80;
const START = { percent: 25, wIdx: WHOLES.indexOf(DEFAULT_W) }; // 25% of 80 = 20

const PARAMS = [
  { key: 'percent', unit: '%', unlock: 0,
    role: 'the percent · how many per 100' },
  { key: 'whole', unit: 'W', unlock: 3,
    role: 'the base amount · the whole = 100%' },
];

const STEP_PERCENT = 0; // meet percent — per hundred
const STEP_DECIMAL = 1; // percent → decimal (÷100)
const STEP_FRACTION = 2; // percent → fraction (reduce)
const STEP_OF = 3; // percent OF a quantity — whole unlocks
const STEP_BENCH = 4; // benchmark percents / mental math
const STEP_RATE = 5; // a percent is a rate, not an amount
const STEP_CALIB = 6; // build the part (calibration)

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Percent is EXACT. p% = p/100. The part of a whole is kept in
   integer hundredths-of-a-unit so there is never a floating-point artefact to
   show a child, then divided by 100 only for display.
   ------------------------------------------------------------------------- */
const partHundredths = (p, W) => p * W; // (p/100)·W in hundredths of a unit; integer

function gcd(a, b) {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): the whole is fixed and a target amount sits on the bar; set
   the percent so p% of the whole lands exactly on it. This drills the core
   grade-6 skill — a percent OF a quantity. Because the whole is fixed and the
   part strictly increases with the percent, every target has exactly ONE
   integer-percent build, so CALIBRATED is an exact-hit stamp. The meter is a
   plain closeness in percentage points (whole-independent, so it feels the same
   no matter which base was drawn).
   ------------------------------------------------------------------------- */
const MATCH_SCALE = 25; // percentage points spread across the meter
const matchPercent = (p, pT) => 100 * Math.max(0, 1 - Math.abs(p - pT) / MATCH_SCALE);
const isCalibrated = (p, pT) => p === pT;

// friendly bases for the challenge (a subset of WHOLES); pT is any integer 5…100
const CALIB_WHOLES = [20, 40, 50, 80, 100, 200];
function makeTarget(prev) {
  let t;
  do {
    const W = CALIB_WHOLES[Math.floor(Math.random() * CALIB_WHOLES.length)];
    const p = 5 + Math.floor(Math.random() * 96); // 5…100
    t = { p, W, idx: WHOLES.indexOf(W) };
  } while (prev != null && t.p === prev.p && t.W === prev.W);
  return t;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — all exact, all built from integers.
   ------------------------------------------------------------------------- */
// p% as a decimal, two places (÷100 always lands in the hundredths): 7→0.07,
// 30→0.30, 100→1.00. Two places on purpose — it shows the "move the point two
// places" rule the lesson teaches.
function decimal2(p) {
  if (p >= 100) {
    const whole = Math.floor(p / 100);
    const rem = p % 100;
    return whole + '.' + String(rem).padStart(2, '0');
  }
  return '0.' + String(p).padStart(2, '0');
}

// p/100 reduced by gcd. Returns {n, d}; d===1 only for p===100 (→ 1/1 = one whole).
function reducedFraction(p) {
  if (p === 0) return { n: 0, d: 1 };
  const g = gcd(p, 100);
  return { n: p / g, d: 100 / g };
}
function fractionStr(p) {
  const { n, d } = reducedFraction(p);
  return d === 1 ? String(n) : n + '/' + d;
}

// an amount held in integer hundredths → exact display: 2000→"20", 750→"7.5",
// 625→"6.25", 1250→"12.5". Never a float artefact.
function formatAmount(partH) {
  const whole = Math.floor(partH / 100);
  const frac = partH % 100;
  if (frac === 0) return String(whole);
  if (frac % 10 === 0) return whole + '.' + frac / 10;
  return whole + '.' + String(frac).padStart(2, '0');
}

/* EDIT 5 — Equation display. The percent, with the number in the carmine accent
   so the symbol is tied to the picture (carmine = the percent everywhere). */
function PercentReadout({ p }) {
  return (
    <span className="eq" aria-hidden="true">
      <span className="t-pct">{p}</span>
      <span className="t-sign">%</span>
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   percent misconceptions ("% is per ten," 7% = 0.7, a bigger % is always more).
   Next is gated on ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet percent — per hundred',
    body:
      'The whole square is cut into 100 equal cells. The word PERCENT (%) means ' +
      '“per hundred,” so each cell is 1%, and each column of ten cells is 10%. ' +
      'Drag the percent dial: shade p cells and you have shaded p%. Shade all 100 ' +
      'and you have 100% — the whole thing.',
    q: 'What does 45% mean?',
    choices: ['45 out of every 100', '45 out of every 10', '45 whole things'],
    answer: 0,
    feedback:
      '45% means 45 per hundred — 45 of the grid’s 100 cells. The “%” sign is just ' +
      'shorthand for “out of 100.” That is why one full column (10 cells) is 10%, ' +
      'and a single cell is 1%.',
  },
  {
    title: 'Percent → decimal: divide by 100',
    body:
      'Because a percent is a count per hundred, p% is exactly the fraction p/100 — ' +
      'and dividing by 100 shifts the decimal point two places to the left. So ' +
      '30% = 30/100 = 0.30. The shaded part of the whole grid is 0.30 of it: this ' +
      'is the very same 10×10 grid you use for decimals.',
    q: 'Write 7% as a decimal.',
    choices: ['0.07', '0.7', '7.0'],
    answer: 0,
    feedback:
      '7% = 7/100 = 0.07. Dividing by 100 moves the point two places, so the 7 lands ' +
      'in the HUNDREDTHS place — a tiny 7-cell sliver of the grid. (0.7 would be 70%, ' +
      'seven whole columns.)',
  },
  {
    title: 'Percent → fraction: out of 100, then reduce',
    body:
      'A percent is already a fraction with 100 on the bottom: p% = p/100. Simplify ' +
      'by dividing top and bottom by their common factor. 25% = 25/100 = 1/4 — and ' +
      'sure enough, 25 shaded cells is one quarter of the hundred.',
    q: 'What fraction is 20%?',
    choices: ['1/5', '1/20', '20/1'],
    answer: 0,
    feedback:
      '20% = 20/100. Divide top and bottom by 20 to get 1/5. On the grid, 20 cells ' +
      'fill two of the ten columns — one fifth of the whole. (1/20 would be just 5%.)',
  },
  {
    title: 'Percent OF a quantity',
    body:
      'A percent on its own is a rate; to get an amount you take it OF a whole. The ' +
      'bar below is a whole amount W (that is 100%). p% of W is the matching part: ' +
      'part = (p/100)·W. The whole dial is now live — 50% of 80 is 40, but 50% of 200 ' +
      'is 100. Same percent, different wholes, different amounts.',
    q: 'What is 25% of 40?',
    choices: ['10', '25', '15'],
    answer: 0,
    feedback:
      '25% of 40 = (25/100)·40 = ¼ of 40 = 10. On the bar, the 25% mark lines up with ' +
      '10 on the amount scale. The percent gives the RATE (a quarter); the whole tells ' +
      'you a quarter OF WHAT.',
  },
  {
    title: 'Benchmark percents (mental math)',
    body:
      'A few percents are worth knowing by heart. 100% is the whole itself. 50% is ' +
      'half. 10% is one tenth — just divide by 10 (one column of the grid). 1% is one ' +
      'hundredth (one cell). Build the rest from these: 30% is three 10%’s; 5% is half ' +
      'of 10%.',
    q: 'What is the quickest way to find 10% of 60?',
    choices: ['Divide 60 by 10 → 6', 'Multiply 60 by 10 → 600', 'Subtract 10 from 60 → 50'],
    answer: 0,
    feedback:
      '10% = 1/10, so 10% of 60 is 60 ÷ 10 = 6. From there 30% is three of those (18) ' +
      'and 5% is half of one (3). Benchmarks turn a hard percent into easy tens.',
  },
  {
    title: 'A percent is a rate, not an amount',
    body:
      'A bigger percent does not always mean a bigger amount — it depends on the whole. ' +
      'Try it on the bar: 50% of 40 is 20, but 25% of 100 is 25. So here the SMALLER ' +
      'percent gives MORE. Always ask “percent of what?”',
    q: 'Which is more money: 50% of $40, or 25% of $100?',
    choices: ['25% of $100 — it is $25', '50% of $40 — it is $20', 'They are equal'],
    answer: 0,
    feedback:
      '50% of $40 = $20, but 25% of $100 = $25 — the smaller percent wins, because it ' +
      'is a percent of a bigger whole. A percent is a comparison per hundred, not a ' +
      'fixed amount; the whole decides how much it is worth.',
  },
  {
    title: 'Build the part',
    body:
      'Final challenge. The whole is fixed and a grey target sits on the amount bar. ' +
      'Set the percent dial so your carmine marker — p% of the whole — lands exactly ' +
      'on the target. The meter reads CALIBRATED when you nail it. Press “New target” ' +
      'for a fresh one.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PercentageLab() {
  const [percent, setPercent] = useState(START.percent);
  const [wIdx, setWIdx] = useState(START.wIdx);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null); // { p, W, idx } during calibration
  const [filling, setFilling] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // {type:'cell',col,row} | {type:'bar',percent} | null
  const fillRef = useRef(null); // during the fill animation: # of cells shown
  const geoRef = useRef({}); // layout geometry, written by draw(), read by pointer handlers
  const sceneRef = useRef({});

  const W = WHOLES[wIdx];
  const current = STEPS[step];
  const calib = !!current.calib;
  const showAmount = step >= STEP_OF; // the quantity scale appears once the whole is in play

  const partH = partHundredths(percent, W); // integer hundredths of a unit
  const partStr = formatAmount(partH);
  const dec = decimal2(percent);
  const { n: fn, d: fd } = reducedFraction(percent);

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer / animation handlers never read stale values.
  sceneRef.current = {
    percent,
    W,
    step,
    calib,
    showAmount,
    target,
    fillCells: filling ? fillRef.current : null,
  };

  const pct = target != null ? matchPercent(percent, target.p) : 0;
  const calibrated = target != null ? isCalibrated(percent, target.p) : false;

  /* ---- value → screen transform + full redraw from state ------------------ */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const Wd = stage.clientWidth;
    const Hd = stage.clientHeight;
    if (Wd === 0 || Hd === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // capped for perf & crisp lines
    canvas.width = Math.round(Wd * dpr);
    canvas.height = Math.round(Hd * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    /* palette (kept in one place so the drawing matches the CSS tokens) */
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const PAPER = '#FBFBF8';
    const CARMINE = '#C81E4F'; // the percent / shaded cells / bar fill / marker — the accent
    const CARM_COL = 'rgba(200,30,79,0.34)'; // completed 10% columns
    const CARM_CELL = 'rgba(200,30,79,0.15)'; // loose 1% cells
    const BLUE = '#3F74A6'; // structure — the whole outline, the bar track
    const BLUE_SOFT = 'rgba(63,116,166,0.14)';

    const S = sceneRef.current;
    const p = S.percent;
    const cellsFull = S.fillCells == null ? p : Math.min(p, S.fillCells);
    const tens = Math.floor(cellsFull / 10); // completed 10% columns shown
    const ones = cellsFull % 10; // loose 1% cells shown in the next column

    ctx.clearRect(0, 0, Wd, Hd);

    /* ---- bands ------------------------------------------------------------- */
    const pad = 16;
    const gridBandTop = 30; // leave room for the "one whole = 100%" caption
    const gridBandH = Math.round(Hd * 0.5);
    const bandW = Wd - 2 * pad;

    /* faint quadrille backdrop behind everything */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    for (let gxk = 0; gxk <= Wd; gxk += 22) {
      const X = Math.round(gxk) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, Hd);
    }
    ctx.stroke();

    /* ============================ THE 100-GRID ============================= */
    const gsize = Math.min(gridBandH, bandW);
    const cell = gsize / 10;
    const gx0 = pad + (bandW - gsize) / 2; // centre horizontally
    const gy = gridBandTop + (gridBandH - gsize) / 2;

    // caption above the grid
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('one whole = 100 cells = 100%', gx0 + gsize / 2, gy - 8);

    // background
    ctx.fillStyle = PAPER;
    ctx.fillRect(gx0, gy, gsize, gsize);

    // shade the percent: full 10% columns (stronger carmine), then loose 1% cells
    for (let c = 0; c < tens; c++) {
      ctx.fillStyle = CARM_COL;
      ctx.fillRect(gx0 + c * cell, gy, cell, gsize);
    }
    for (let r = 0; r < ones; r++) {
      ctx.fillStyle = CARM_CELL;
      ctx.fillRect(gx0 + tens * cell, gy + r * cell, cell, cell);
    }

    // thin cell gridlines (10 × 10)
    ctx.strokeStyle = 'rgba(28,43,58,0.13)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const gxx = Math.round(gx0 + k * cell) + 0.5;
      const gyy = Math.round(gy + k * cell) + 0.5;
      ctx.moveTo(gxx, gy);
      ctx.lineTo(gxx, gy + gsize);
      ctx.moveTo(gx0, gyy);
      ctx.lineTo(gx0 + gsize, gyy);
    }
    ctx.stroke();

    // stronger 10% column separators (the tens structure)
    ctx.strokeStyle = 'rgba(63,116,166,0.5)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const gxx = Math.round(gx0 + k * cell) + 0.5;
      ctx.moveTo(gxx, gy);
      ctx.lineTo(gxx, gy + gsize);
    }
    ctx.stroke();

    // outline the loose 1% cells with a carmine edge so ones-of-percent read clearly
    if (ones > 0 && tens < 10) {
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2;
      ctx.strokeRect(gx0 + tens * cell + 0.5, gy + 0.5, cell - 1, ones * cell - 1);
    }

    // the whole's outline
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(gx0 + 0.5, gy + 0.5, gsize - 1, gsize - 1);

    // hover: highlight the cell + its column
    const hv = hoverRef.current;
    if (hv && hv.type === 'cell') {
      const cx = gx0 + hv.col * cell;
      ctx.save();
      ctx.fillStyle = 'rgba(63,116,166,0.12)';
      ctx.fillRect(cx, gy, cell, gsize); // the column = 10%
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx + 1, gy + hv.row * cell + 1, cell - 2, cell - 2); // the cell = 1%
      ctx.restore();
    }

    /* store grid geometry for hit-testing */
    const geo = { grid: { x: gx0, y: gy, size: gsize, cell } };

    /* ==================== THE DOUBLE NUMBER LINE (bar) ==================== */
    const barPad = pad + 6;
    const bx0 = barPad;
    const bx1 = Wd - barPad;
    const barW = bx1 - bx0;
    const barH = Math.max(22, Math.min(30, Math.round(Hd * 0.07)));
    const barTop = gy + gsize + Math.round(Hd * 0.13);
    const pxOf = (perc) => bx0 + (perc / 100) * barW;
    geo.bar = { x0: bx0, x1: bx1, top: barTop, h: barH };

    // percent scale above the bar (0 / 50 / 100 labelled, ticks every 10)
    ctx.textAlign = 'center';
    for (let k = 0; k <= 100; k += 10) {
      const X = pxOf(k);
      const major = k % 50 === 0;
      ctx.strokeStyle = major ? 'rgba(28,43,58,0.7)' : 'rgba(28,43,58,0.4)';
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(X + 0.5, barTop - (major ? 10 : 6));
      ctx.lineTo(X + 0.5, barTop);
      ctx.stroke();
      if (major) {
        ctx.fillStyle = INK_SOFT;
        ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textBaseline = 'bottom';
        ctx.fillText(k + '%', X, barTop - 12);
      }
    }

    // bar track (structure) + carmine fill (the percent)
    ctx.fillStyle = BLUE_SOFT;
    ctx.fillRect(bx0, barTop, barW, barH);
    const fillW = (p / 100) * barW;
    ctx.fillStyle = 'rgba(200,30,79,0.5)';
    ctx.fillRect(bx0, barTop, fillW, barH);
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx0 + 0.5, barTop + 0.5, barW - 1, barH - 1);

    // amount scale below the bar (only once the whole is in play)
    if (S.showAmount) {
      ctx.fillStyle = INK;
      ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText('0', bx0, barTop + barH + 6);
      ctx.textAlign = 'right';
      ctx.fillText(String(S.W), bx1, barTop + barH + 6);
      ctx.textAlign = 'center';
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.fillText('amount  (whole = ' + S.W + ')', (bx0 + bx1) / 2, barTop + barH + 6);
    }

    // calibration target: grey dashed marker + amount flag
    if (S.calib && S.target != null) {
      const X = pxOf(S.target.p);
      const tAmt = formatAmount(partHundredths(S.target.p, S.target.W));
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.95)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(X, barTop - 30);
      ctx.lineTo(X, barTop + barH + 4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = INK_SOFT;
      ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('target ' + tAmt, X, barTop - 32);
      ctx.restore();
    }

    // hover ghost on the bar
    if (hv && hv.type === 'bar') {
      const X = pxOf(hv.percent);
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.35)';
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(X, barTop - 6);
      ctx.lineTo(X, barTop + barH + 6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = INK;
      ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const lbl = S.showAmount
        ? hv.percent + '% → ' + formatAmount(partHundredths(hv.percent, S.W))
        : hv.percent + '%';
      ctx.fillText(lbl, X, barTop - 20);
      ctx.restore();
    }

    // the value marker: carmine dot at p% with a pill (percent above, amount below)
    {
      const X = pxOf(p);
      const my = barTop + barH / 2;
      ctx.save();
      // pill: "p%"
      const pill = p + '%';
      ctx.font = '700 14px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(pill).width;
      const bw = tw + 16;
      const bh = 22;
      const half = bw / 2 + 4;
      const px = Math.min(Math.max(X, bx0 + half), bx1 - half);
      // the pill sits just above the bar, tracking the marker
      const pillY = barTop - bh - 4;
      const bxp = px - bw / 2;
      const rr = 6;
      ctx.fillStyle = CARMINE;
      ctx.beginPath();
      ctx.moveTo(bxp + rr, pillY);
      ctx.arcTo(bxp + bw, pillY, bxp + bw, pillY + bh, rr);
      ctx.arcTo(bxp + bw, pillY + bh, bxp, pillY + bh, rr);
      ctx.arcTo(bxp, pillY + bh, bxp, pillY, rr);
      ctx.arcTo(bxp, pillY, bxp + bw, pillY, rr);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pill, px, pillY + bh / 2 + 0.5);

      // the dot on the bar
      ctx.fillStyle = CARMINE;
      ctx.beginPath();
      ctx.arc(X, my, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // amount under the marker (once the whole is in play)
      if (S.showAmount) {
        const amt = formatAmount(partHundredths(p, S.W));
        ctx.fillStyle = CARMINE;
        ctx.font = '700 13px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const ax = Math.min(Math.max(X, bx0 + 12), bx1 - 12);
        ctx.fillText(amt, ax, barTop + barH + 22);
      }
      ctx.restore();
    }

    geoRef.current = geo;
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [percent, wIdx, step, target, filling, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step the first time we reach it; fix the
     whole to the target's base and reset the percent to 0 so it starts clearly
     un-matched (like the decimal / add / cube labs). */
  useEffect(() => {
    if (current.calib && target == null) {
      const t = makeTarget(null);
      setTarget(t);
      setWIdx(t.idx);
      setPercent(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the fill animation — cells appear one at a time, time-based, opt-in, and
     respectful of reduced motion */
  useEffect(() => {
    if (!filling) {
      fillRef.current = null;
      draw();
      return;
    }
    if (percent === 0) {
      setFilling(false);
      return;
    }
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setFilling(false);
      return;
    }
    let raf;
    let start = null;
    const total = 1100; // ms for the whole fill, regardless of count
    const per = total / percent;
    fillRef.current = 0;
    const loop = (now) => {
      if (start == null) start = now;
      const t = now - start;
      fillRef.current = Math.min(percent, Math.floor(t / per));
      draw();
      if (t < total) raf = requestAnimationFrame(loop);
      else {
        fillRef.current = null;
        setFilling(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [filling, percent, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'percent') setPercent(v);
    else setWIdx(v);
    if (filling) setFilling(false);
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const geo = geoRef.current;
    if (!geo || !geo.grid) return;
    const g = geo.grid;
    if (x >= g.x && x <= g.x + g.size && y >= g.y && y <= g.y + g.size) {
      const col = Math.min(9, Math.max(0, Math.floor((x - g.x) / g.cell)));
      const row = Math.min(9, Math.max(0, Math.floor((y - g.y) / g.cell)));
      hoverRef.current = { type: 'cell', col, row };
      draw();
      return;
    }
    const b = geo.bar;
    if (b && y >= b.top - 12 && y <= b.top + b.h + 12 && x >= b.x0 && x <= b.x1) {
      const perc = Math.max(0, Math.min(100, Math.round(((x - b.x0) / (b.x1 - b.x0)) * 100)));
      hoverRef.current = { type: 'bar', percent: perc };
      draw();
      return;
    }
    if (hoverRef.current) {
      hoverRef.current = null;
      draw();
    }
  };
  const onPointerLeave = () => {
    if (hoverRef.current) {
      hoverRef.current = null;
      draw();
    }
  };

  const resetDials = () => {
    if (calib) {
      setPercent(0);
      if (target) setWIdx(target.idx);
    } else {
      setPercent(START.percent);
      setWIdx(START.wIdx);
    }
    if (filling) setFilling(false);
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

  const spoken =
    `${percent} percent. As a fraction, ${percent} over 100` +
    (fd !== 100 ? `, which simplifies to ${fd === 1 ? 'one whole' : `${fn} over ${fd}`}` : '') +
    `. As a decimal, ${dec}.` +
    (showAmount ? ` ${percent} percent of ${W} is ${partStr}.` : '');

  return (
    <div className="plab">
      <header className="head">
        <h1>Percent — Per Hundred</h1>
        <p className="lede">
          <em>Percent</em> means <em>per hundred</em>. See one percent two ways: as shaded{' '}
          <span className="mono">cells</span> of a 100-grid — where it is also a decimal and a
          fraction — and as an <span className="mono">amount</span> on a bar, once you take it{' '}
          <em>of</em> a whole. Each dial unlocks with the lesson, so the picture is never ahead of
          the idea.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <PercentReadout p={percent} />
            </p>
            <p className="equation-sub mono">
              = {percent}/100 = {dec}
              {showAmount ? <> &nbsp;·&nbsp; {percent}% of {W} = <b className="carm">{partStr}</b></> : null}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">cell = 1% · column = 10%</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — you built ${formatAmount(partHundredths(target.p, target.W))}.` : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Percent</span>
              <span className="fact-v mono carm big">{percent}%</span>
            </div>
            <div className="fact">
              <span className="fact-k">As a decimal</span>
              <span className="fact-v mono">
                {dec} <span className="dim">= {percent}/100</span>
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">As a fraction</span>
              <span className="fact-v mono">
                {percent}/100{fd !== 100 ? ` = ${fractionStr(percent)}` : ''}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">{showAmount ? `${percent}% of ${W}` : 'The whole'}</span>
              <span className="fact-v mono">
                {showAmount ? partStr : '100 cells = 100%'}
              </span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (filling ? ' on' : '')}
              onClick={() => setFilling((f) => !f)}
              disabled={percent === 0}
            >
              {filling ? 'Filling…' : 'Fill the grid'}
            </button>
            <button type="button" className="btn ghost" onClick={resetDials}>
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
            {PARAMS.map((d) => {
              const isWhole = d.key === 'whole';
              const baseUnlocked = step >= d.unlock;
              const fixed = calib && isWhole; // whole is fixed during the challenge
              const disabled = !baseUnlocked || fixed;
              const sliderVal = isWhole ? wIdx : percent;
              const roleText = !baseUnlocked
                ? 'unlocks soon'
                : fixed
                ? 'fixed for this challenge'
                : d.role;
              return (
                <label className={'dial' + (disabled ? ' locked' : '')} key={d.key}>
                  <span className={'dk ' + d.key}>{d.unit}</span>
                  <span className="dname">{isWhole ? 'whole' : 'percent'}</span>
                  <span className="drole">{roleText}</span>
                  <input
                    type="range"
                    min={isWhole ? 0 : 0}
                    max={isWhole ? WHOLES.length - 1 : 100}
                    step={1}
                    value={sliderVal}
                    disabled={disabled}
                    aria-label={`Dial ${isWhole ? 'whole' : 'percent'} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">
                    {!baseUnlocked ? '🔒' : isWhole ? W : percent}
                  </output>
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

          {current.calib && target != null && (
            <div className="calib">
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{pct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {formatAmount(partHundredths(target.p, target.W))} of {target.W}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const t = makeTarget(target);
                  setTarget(t);
                  setWIdx(t.idx);
                  setPercent(0);
                }}
              >
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
                  setPercent(START.percent);
                  setWIdx(START.wIdx);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">p% = p/100 &nbsp;·&nbsp; p% of W = (p/100)·W</span> &nbsp;·&nbsp;
        percent as a rate per hundred, shown on a 100-grid and a double number line (CCSS 6.RP.A.3.C).
        Percents can exceed 100% in real life; this lab shows the 0–100% case — a part of one whole.
      </footer>

      <style jsx>{`
        .plab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --whole: #3f74a6;
          --quad: #c7d8e4;
          --gold: #d9982b;
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
          max-width: 68ch;
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
          font-size: 26px;
          font-weight: 600;
          margin: 0;
          letter-spacing: 0.01em;
        }
        .equation .t-pct {
          color: var(--curve);
        }
        .equation .t-sign {
          color: var(--curve);
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        .equation-sub .carm {
          color: var(--curve);
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
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        /* On narrow screens the 8:5 ratio gets too short for the stacked grid +
           bar, so go a touch taller there. */
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 5;
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
          font-size: 15px;
          font-variant-numeric: tabular-nums;
        }
        .fact-v .dim {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .fact-v.carm {
          color: var(--curve);
          font-weight: 700;
        }
        .fact-v.big {
          font-size: 21px;
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
        .dials {
          display: grid;
          gap: 14px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 46px 1fr 44px;
          grid-template-rows: auto auto auto;
          align-items: center;
          gap: 1px 10px;
        }
        .dial.locked {
          opacity: 0.5;
        }
        .dk {
          grid-row: 1 / 3;
          grid-column: 1;
          font-family: var(--mono);
          font-weight: 700;
          font-size: 15px;
          text-align: center;
        }
        .dk.percent {
          color: var(--curve);
        }
        .dk.whole {
          color: var(--whole);
        }
        .dname {
          grid-column: 2 / 4;
          grid-row: 1;
          font-weight: 600;
          font-size: 13px;
        }
        .drole {
          grid-column: 2 / 4;
          grid-row: 2;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          grid-row: 3;
          width: 100%;
          accent-color: var(--ink);
          cursor: pointer;
        }
        .dial input[type='range']:disabled {
          cursor: not-allowed;
        }
        .dv {
          grid-column: 3;
          grid-row: 3;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 15px;
          font-weight: 600;
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
        :global(.plab) :focus-visible {
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
