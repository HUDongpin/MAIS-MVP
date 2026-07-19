'use client';

/* ============================================================================
   DecimalLab — an interactive "bench" for DECIMALS: place value to the right
   of the decimal point.  value = ones + tenths/10 + hundredths/100.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at grades 4–5
   (CCSS 4.NF.C.6, 5.NBT.A.1/3) — a child meeting tenths and hundredths for the
   first time and learning that the base-ten system keeps going PAST the ones
   place, one-tenth as big at every step to the right.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter and a CALIBRATED stamp.

   The signature centerpiece is the BASE-TEN GRID paired with a ZOOMABLE NUMBER
   LINE — the decimal analogue of the addition lab's count-on hops or the line
   lab's slope triangle.  A whole is drawn as a 10x10 grid (100 hundredths).
   Each TENTH is a full COLUMN (10 cells); each HUNDREDTH is a single CELL.  The
   SAME number is then shown as a position on a number line, with a magnifier
   that zooms into the one-tenth interval the value lives in and splits it into
   ten hundredths — so "between 1.2 and 1.3, landing on 1.24" is something you
   SEE.  Two models, one number: area (the grid) and measurement (the line).

   One-accent discipline, adapted for a PLACE-VALUE lab: the finest place drives
   the colour.  Soft blue marks the tenths (columns) and whole tiles — the
   larger, more familiar places.  Carmine, the accent, marks the HUNDREDTHS
   (single cells) and the value's position on the line: the newest, finest
   place, which is the whole point of "decimals extend place value rightward."

   All arithmetic is done in INTEGER HUNDREDTHS (cH = 100·ones + 10·tenths +
   hundredths) and only divided by 100 for pixel positioning — so a K-12 student
   never sees a float artefact like 0.30000000004.  The displayed value is built
   from the digits themselves (`${ones}.${tenths}${hundredths}`), exact always.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/DecimalLab.jsx
     2. Import and render it:
          import DecimalLab from './DecimalLab';
          export default function Page() { return <DecimalLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (ones, tenths,
              hundredths digits, lesson step).
     MODEL  — the math is exact integer place value; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Three place-value digits, unlocked one lesson step at a
   time. The whole "ones" place is deliberately unlocked LAST (step 3): decimals
   are taught from the point outward, so the NEW idea (tenths) comes first, then
   hundredths, then we reconnect to the familiar whole numbers on the left.

   ones is capped at 2 so the base-ten grids stay legible (at most two full
   "whole" tiles plus the working tile). value ranges 0.00 … 2.99.
   ------------------------------------------------------------------------- */
const ONES_MAX = 2;
const PARAMS = [
  { key: 'ones', place: 'ones', unit: '1', min: 0, max: ONES_MAX, unlock: 3,
    role: 'whole ones · left of the point' },
  { key: 'tenths', place: 'tenths', unit: '0.1', min: 0, max: 9, unlock: 1,
    role: 'tenths · one-tenth of a whole (a column)' },
  { key: 'hundredths', place: 'hundredths', unit: '0.01', min: 0, max: 9, unlock: 2,
    role: 'hundredths · one-tenth of a tenth (a cell)' },
];
const START = { ones: 0, tenths: 3, hundredths: 0 }; // 0.30 — "three tenths"

const TENTHS_STEP = 1;
const HUND_STEP = 2;
const ONES_STEP = 3;
const EQUIV_STEP = 4; // 0.3 = 0.30 — equivalent decimals
const COMPARE_STEP = 5; // don't be fooled by digit count
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Place value is EXACT: everything is kept in integer
   hundredths so there is never a floating-point artefact to show a child.
   ------------------------------------------------------------------------- */
function hundredths(ones, tenths, hund) {
  return 100 * ones + 10 * tenths + hund; // integer, exact
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): build a target decimal by setting its place-value digits.
   This drills place value under pressure — big misses are fixed with the
   tenths/ones dials, the last hundredth with the hundredths dial. Because the
   places are fixed, every target has exactly one digit build, so CALIBRATED is
   an exact-hit stamp. The meter is a plain closeness in hundredths.
   ------------------------------------------------------------------------- */
const MATCH_SCALE = 50; // hundredths of "half a whole" spread across the meter
const matchPercent = (cH, N) => 100 * Math.max(0, 1 - Math.abs(cH - N) / MATCH_SCALE);
const isCalibrated = (cH, N) => cH === N;

function makeTarget(prev) {
  let N;
  do {
    N = 5 + Math.floor(Math.random() * (100 * (ONES_MAX + 1) - 5)); // 5 … 299 hundredths
  } while (prev != null && N === prev);
  return N;
}

/* ---------------------------------------------------------------------------
   Formatting helpers — all exact, all built from the digits or integer cH.
   ------------------------------------------------------------------------- */
const ONES_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS_WORDS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function words99(n) {
  if (n < 20) return ONES_WORDS[n];
  const t = Math.floor(n / 10);
  const r = n % 10;
  return TENS_WORDS[t] + (r ? '-' + ONES_WORDS[r] : '');
}

// "two and thirty-four hundredths", "three tenths", "one and five hundredths"
function readDecimal(ones, tenths, hund) {
  const frac = 10 * tenths + hund;
  const wholeWord = words99(ones);
  if (frac === 0) return wholeWord;
  let fracPhrase;
  if (hund === 0) {
    fracPhrase = words99(tenths) + (tenths === 1 ? ' tenth' : ' tenths');
  } else {
    fracPhrase = words99(frac) + (frac === 1 ? ' hundredth' : ' hundredths');
  }
  return ones === 0 ? fracPhrase : wholeWord + ' and ' + fracPhrase;
}

function gcd(a, b) {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}
// the reduced fraction for a value given in hundredths cH: cH/100 → p/q
function reducedFraction(cH) {
  if (cH === 0) return { p: 0, q: 1 };
  const g = gcd(cH, 100);
  return { p: cH / g, q: 100 / g };
}

// expanded form "2 + 0.3 + 0.04" (nonzero places only)
function expandedForm(ones, tenths, hund) {
  const parts = [];
  if (ones) parts.push(String(ones));
  if (tenths) parts.push('0.' + tenths);
  if (hund) parts.push('0.0' + hund);
  return parts.length ? parts.join(' + ') : '0';
}

// build the three digits back out of an integer-hundredths value
const digitsOf = (cH) => ({
  ones: Math.floor(cH / 100),
  tenths: Math.floor((cH % 100) / 10),
  hund: cH % 10,
});
const decStr = (ones, tenths, hund) => `${ones}.${tenths}${hund}`;
const decStrFromCH = (cH) => {
  const d = digitsOf(cH);
  return decStr(d.ones, d.tenths, d.hund);
};

/* EDIT 5 — Equation display. The decimal with each digit coloured by place, so
   the symbol is tied to the picture: ones in ink (the familiar whole), tenths
   in blue (columns), hundredths in carmine (cells / the accent). */
function DecimalReadout({ ones, tenths, hund }) {
  return (
    <span className="eq" aria-hidden="true">
      <span className="t-ones">{ones}</span>
      <span className="t-pt">.</span>
      <span className="t-tenths">{tenths}</span>
      <span className="t-hund">{hund}</span>
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   decimal misconceptions (the point splits nothing, hundredths are bigger than
   tenths, "more digits = bigger", 0.3 ≠ 0.30). Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet decimals',
    body:
      'Whole numbers count whole things. A DECIMAL shows a part of a whole, using ' +
      'the same base-ten idea — just kept going to the right. The dot is the DECIMAL ' +
      'POINT: whole ones sit on its left, and the parts of a whole sit on its right. ' +
      'Right now the grid shows 0.3 — three of the ten columns in one whole are shaded.',
    q: 'What does the decimal point separate?',
    choices: [
      'Whole ones (left) from parts of a whole (right)',
      'Big numbers from small numbers',
      'Nothing — it is just a dot',
    ],
    answer: 0,
    feedback:
      'The point splits the whole ones from the fractional parts. To its right, each ' +
      'place is one-tenth the size of the place before it: tenths, then hundredths, ' +
      'then thousandths… the base-ten pattern never stops, it just gets ten times ' +
      'finer at every step.',
  },
  {
    title: 'Tenths — split the whole into 10',
    body:
      'The tenths dial is live. Cut one whole into 10 equal columns — each column is ' +
      'ONE TENTH, written 0.1. Drag the dial and watch the blue columns fill. One tenth ' +
      'is 1 out of 10 equal parts of the whole.',
    q: 'You shade 3 of the 10 columns. What decimal is that?',
    choices: ['0.3 — three tenths', '3.0 — three wholes', '0.03 — three hundredths'],
    answer: 0,
    feedback:
      'Three shaded columns out of ten is three tenths = 0.3. The tenths digit sits in ' +
      'the FIRST place right of the point. 0.3 is the same amount as the fraction 3/10 — ' +
      'a decimal is just another way to write a fraction with a base-ten bottom.',
  },
  {
    title: 'Hundredths — split each tenth into 10',
    body:
      'Now the hundredths dial unlocks. Split ONE column (one tenth) into 10 little ' +
      'cells — each cell is ONE HUNDREDTH, written 0.01. The carmine cells fill the ' +
      'next column one at a time. There are 100 cells in the whole grid.',
    q: 'How many hundredths make one tenth?',
    choices: ['10 — a tenth is ten hundredths', '100 — a tenth is a hundred hundredths', '1 — they are the same'],
    answer: 0,
    feedback:
      'Ten hundredths make one tenth: 0.10 = 0.1, just as ten cells fill one column. ' +
      'So a hundredth is SMALLER than a tenth (0.01 < 0.1), even though the word and the ' +
      'digit “1” look similar. The place tells you the size.',
  },
  {
    title: 'The ones place — put it together',
    body:
      'The ones dial unlocks — the familiar whole numbers on the LEFT of the point. ' +
      'Each whole is a full 10×10 grid. Now you can build any value like 1.24: one whole, ' +
      'two tenths, four hundredths. Read it “one and twenty-four hundredths.”',
    q: 'Read the number 2.05. Which is correct?',
    choices: [
      'Two and five hundredths',
      'Two and five tenths',
      'Twenty-five',
    ],
    answer: 0,
    feedback:
      'The 0 in the tenths place is a placeholder — it holds the spot so the 5 lands in ' +
      'the HUNDREDTHS place. So 2.05 is “two and five hundredths,” not “two and five ' +
      'tenths” (that would be 2.5) and not twenty-five. Every digit’s value comes from ' +
      'its place.',
  },
  {
    title: 'Equivalent decimals — 0.3 = 0.30',
    body:
      'Set the tenths dial to 3 and the hundredths to 0: the grid shades three whole ' +
      'columns. Thinking of them as columns gives 0.3 (three tenths); counting the very ' +
      'same cells gives 0.30 (thirty hundredths). Same shaded area, same amount.',
    q: 'Which statement is true?',
    choices: [
      '0.3 = 0.30 — a zero on the end changes nothing',
      '0.30 is bigger — it has more digits',
      '0.3 is bigger — 3 is more than 30… wait, no',
    ],
    answer: 0,
    feedback:
      '0.3 = 0.30. Three tenths and thirty hundredths shade exactly the same part of the ' +
      'whole. Adding a zero to the RIGHT of a decimal does not change its value — it just ' +
      'renames the same amount in a smaller unit. (Adding a zero on the LEFT of a whole ' +
      'number is different — 30 ≠ 3.)',
  },
  {
    title: 'Comparing — don’t count digits',
    body:
      'A famous trap: is 0.3 or 0.25 bigger? Try it. Set the dials to 0.30 — thirty ' +
      'cells shade. Now set 0.25 — only twenty-five cells. Fewer cells! Compare decimals ' +
      'by lining up PLACES (tenths first), never by which has more digits.',
    q: 'Which is greater, 0.3 or 0.25?',
    choices: [
      '0.3 — it is 0.30, and 30 hundredths > 25 hundredths',
      '0.25 — it has more digits, so it is bigger',
      'They are equal',
    ],
    answer: 0,
    feedback:
      '0.3 is greater. Line up the places: 0.3 has 3 in the tenths place, 0.25 has only ' +
      '2 — and tenths outrank hundredths, so 0.3 wins before you even reach the ' +
      'hundredths. Rewriting as 0.30 vs 0.25 makes it plain: 30 hundredths beats 25. ' +
      'More digits does NOT mean a bigger number.',
  },
  {
    title: 'Build the number',
    body:
      'Final challenge. A grey target sits on the number line and its value is named ' +
      'above. Set the ones, tenths, and hundredths dials so your carmine marker lands ' +
      'exactly on it — the meter reads CALIBRATED. Use tenths to jump close, hundredths ' +
      'to fine-tune. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function DecimalLab() {
  const [ones, setOnes] = useState(START.ones);
  const [tenths, setTenths] = useState(START.tenths);
  const [hund, setHund] = useState(START.hundredths);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null); // target value in integer hundredths
  const [filling, setFilling] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // {type:'cell',col,row} | {type:'line',cH} | null
  const fillRef = useRef(null); // during the fill animation: # of fractional cells shown
  const geoRef = useRef({}); // layout geometry, written by draw(), read by pointer handlers
  const sceneRef = useRef({});

  const cH = hundredths(ones, tenths, hund);
  const frac = 10 * tenths + hund; // fractional part, in hundredths (0..99)
  const current = STEPS[step];
  const calib = !!current.calib;

  const { p: fp, q: fq } = reducedFraction(cH);

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer / animation handlers never read stale values.
  sceneRef.current = {
    ones,
    tenths,
    hund,
    cH,
    frac,
    step,
    calib,
    target,
    equiv: step === EQUIV_STEP,
    fillCells: filling ? fillRef.current : null,
  };

  const pct = target != null ? matchPercent(cH, target) : 0;
  const calibrated = target != null ? isCalibrated(cH, target) : false;

  /* ---- value → screen transform + full redraw from state ------------------ */
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

    /* palette (kept in one place so the drawing matches the CSS tokens) */
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const PAPER = '#FBFBF8';
    const CARMINE = '#C81E4F'; // hundredths (cells) + the value marker — the accent
    const BLUE = '#3F74A6'; // tenths (columns) + whole tiles — the familiar places
    const BLUE_SOFT = 'rgba(63,116,166,0.18)';
    const BLUE_MED = 'rgba(63,116,166,0.42)';
    const CARM_SOFT = 'rgba(200,30,79,0.16)';
    const CARM_MED = 'rgba(200,30,79,0.5)';
    const GOLD = '#D9982B'; // equivalence highlight

    const S = sceneRef.current;
    const O = S.ones;
    const T = S.tenths;
    const Hd = S.hund;
    const fracCells = S.fillCells == null ? S.frac : Math.min(S.frac, S.fillCells);

    ctx.clearRect(0, 0, W, H);

    /* ---- bands ------------------------------------------------------------- */
    const pad = 16;
    const gridBandTop = 12;
    const gridBandH = Math.round(H * 0.5);
    const lineY = gridBandTop + gridBandH + Math.round(H * 0.14);
    const bandW = W - 2 * pad;

    /* ============================ BASE-TEN GRIDS ========================== */
    // one working tile (the fractional part) plus O full "whole" tiles to its left
    const nGrids = O + 1;
    const gap = Math.max(10, Math.round(W * 0.02));
    const gsize = Math.min(gridBandH, (bandW - (nGrids - 1) * gap) / nGrids);
    const cell = gsize / 10;
    const rowW = nGrids * gsize + (nGrids - 1) * gap;
    const gx0 = pad + (bandW - rowW) / 2; // centre the row
    const gy = gridBandTop + (gridBandH - gsize) / 2;

    // faint quadrille backdrop behind everything
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.55)';
    ctx.beginPath();
    for (let gxk = 0; gxk <= W; gxk += Math.max(18, cell)) {
      const X = Math.round(gxk) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, gridBandTop + gridBandH + 6);
    }
    ctx.stroke();

    const drawTile = (tx, whole) => {
      // background
      ctx.fillStyle = PAPER;
      ctx.fillRect(tx, gy, gsize, gsize);

      if (whole) {
        // a filled whole: solid blue wash + faint cell grid + bold "1"
        ctx.fillStyle = BLUE_SOFT;
        ctx.fillRect(tx, gy, gsize, gsize);
      } else {
        // the working tile: shade fractional cells in column-major order.
        // columns [0..T-1] are complete tenths (blue); column T holds the loose
        // hundredths (carmine). Animated fill reveals cells in the same order.
        for (let i = 0; i < fracCells; i++) {
          const col = Math.floor(i / 10);
          const row = i % 10;
          ctx.fillStyle = col < T ? BLUE_SOFT : CARM_SOFT;
          ctx.fillRect(tx + col * cell, gy + row * cell, cell, cell);
        }
      }

      // thin cell gridlines (10 x 10)
      ctx.strokeStyle = 'rgba(28,43,58,0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) {
        const gxx = Math.round(tx + k * cell) + 0.5;
        const gyy = Math.round(gy + k * cell) + 0.5;
        ctx.moveTo(gxx, gy);
        ctx.lineTo(gxx, gy + gsize);
        ctx.moveTo(tx, gyy);
        ctx.lineTo(tx + gsize, gyy);
      }
      ctx.stroke();

      // stronger COLUMN separators — the tenths structure
      ctx.strokeStyle = whole ? 'rgba(63,116,166,0.5)' : 'rgba(28,43,58,0.28)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) {
        const gxx = Math.round(tx + k * cell) + 0.5;
        ctx.moveTo(gxx, gy);
        ctx.lineTo(gxx, gy + gsize);
      }
      ctx.stroke();

      // emphasise complete tenths columns in the working tile with a blue edge
      if (!whole && T > 0) {
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 2;
        ctx.strokeRect(tx + 0.5, gy + 0.5, Math.min(T, 10) * cell - 1, gsize - 1);
      }
      // emphasise the loose hundredths column with a carmine edge
      if (!whole && Hd > 0 && T < 10) {
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 2;
        ctx.strokeRect(tx + T * cell + 0.5, gy + 0.5, cell - 1, Hd * cell - 1);
      }

      // outline
      ctx.strokeStyle = whole ? BLUE : INK;
      ctx.lineWidth = 2;
      ctx.strokeRect(tx + 0.5, gy + 0.5, gsize - 1, gsize - 1);

      // label
      ctx.fillStyle = whole ? BLUE : INK_SOFT;
      ctx.font = '700 ' + Math.max(11, Math.round(gsize * 0.1)) + 'px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(whole ? '1' : decStr(0, T, Hd), tx + gsize / 2, gy + gsize + 5);
    };

    for (let i = 0; i < O; i++) drawTile(gx0 + i * (gsize + gap), true);
    const workTx = gx0 + O * (gsize + gap);
    drawTile(workTx, false);

    // "= 0.30" equivalence tag on its step
    if (S.equiv && T > 0 && Hd === 0) {
      ctx.save();
      ctx.fillStyle = GOLD;
      ctx.font = '700 13px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${T} tenths  =  ${T * 10} hundredths`, workTx + gsize / 2, gy - 8);
      ctx.restore();
    }

    // hover: highlight the cell + its column under the pointer, over the grid
    const hv = hoverRef.current;
    if (hv && hv.type === 'cell') {
      const cx = workTx + hv.col * cell;
      ctx.save();
      // column tint (a tenth)
      ctx.fillStyle = 'rgba(63,116,166,0.12)';
      ctx.fillRect(cx, gy, cell, gsize);
      // cell outline (a hundredth)
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx + 1, gy + hv.row * cell + 1, cell - 2, cell - 2);
      ctx.restore();
    }

    /* store grid geometry for hit-testing */
    const geo = { work: { x: workTx, y: gy, size: gsize, cell } };

    /* ============================ NUMBER LINE ============================= */
    const nlPad = pad + 8;
    const nx0 = nlPad;
    const nx1 = W - nlPad;
    const vmax = ONES_MAX + 1; // 0 … 3
    const nx = (v) => nx0 + (v / vmax) * (nx1 - nx0);
    geo.line = { x0: nx0, x1: nx1, y: lineY, vmax };

    // baseline
    ctx.strokeStyle = 'rgba(28,43,58,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(nx0, lineY + 0.5);
    ctx.lineTo(nx1, lineY + 0.5);
    ctx.stroke();

    // ticks: tenths minor, wholes major+labelled
    ctx.textAlign = 'center';
    for (let k = 0; k <= vmax * 10; k++) {
      const v = k / 10;
      const X = nx(v);
      const major = k % 10 === 0;
      ctx.strokeStyle = major ? 'rgba(28,43,58,0.75)' : 'rgba(28,43,58,0.45)';
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(X + 0.5, lineY);
      ctx.lineTo(X + 0.5, lineY + (major ? 11 : 6));
      ctx.stroke();
      if (major) {
        ctx.fillStyle = INK;
        ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textBaseline = 'top';
        ctx.fillText(String(k / 10), X, lineY + 13);
      }
    }

    // the tenth-interval the value lives in (the region the magnifier zooms)
    const tIndex = Math.floor(S.cH / 10); // which tenth (0..29)
    const lo = tIndex / 10;
    const hi = lo + 0.1;
    const zx0 = nx(lo);
    const zx1 = nx(hi);

    // target (calibration): a grey dashed marker + name
    if (S.calib && S.target != null) {
      const tv = S.target / 100;
      const X = nx(tv);
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.95)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(X, lineY - 34);
      ctx.lineTo(X, lineY + 12);
      ctx.stroke();
      ctx.setLineDash([]);
      // little flag
      ctx.fillStyle = INK_SOFT;
      ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`build ${decStrFromCH(S.target)}`, X, lineY - 37);
      ctx.restore();
    }

    // hover ghost marker on the line
    if (hv && hv.type === 'line') {
      const X = nx(hv.cH / 100);
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.35)';
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(X, lineY - 16);
      ctx.lineTo(X, lineY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = INK;
      ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(decStrFromCH(hv.cH), X, lineY - 17);
      ctx.restore();
    }

    // the value marker (carmine dot + value pill)
    {
      const X = nx(S.cH / 100);
      ctx.save();
      ctx.fillStyle = CARMINE;
      ctx.beginPath();
      ctx.arc(X, lineY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 2;
      ctx.stroke();

      const pill = decStr(O, T, Hd);
      ctx.font = '700 15px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(pill).width;
      const bw = tw + 16;
      const bh = 22;
      let px = X;
      const half = bw / 2 + 4;
      px = Math.min(Math.max(px, nx0 + half), nx1 - half);
      const py = lineY - bh - 12;
      const bxp = px - bw / 2;
      const rr = 6;
      ctx.fillStyle = CARMINE;
      ctx.beginPath();
      ctx.moveTo(bxp + rr, py);
      ctx.arcTo(bxp + bw, py, bxp + bw, py + bh, rr);
      ctx.arcTo(bxp + bw, py + bh, bxp, py + bh, rr);
      ctx.arcTo(bxp, py + bh, bxp, py, rr);
      ctx.arcTo(bxp, py, bxp + bw, py, rr);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pill, px, py + bh / 2 + 0.5);
      ctx.restore();
    }

    /* ============================ ZOOM STRIP ============================== */
    // magnify the one-tenth interval [lo, hi] into ten hundredths
    const stripTop = lineY + 30;
    const stripH = Math.max(30, Math.min(46, H - stripTop - 30));
    const stripY = stripTop;
    const sx0 = nlPad;
    const sx1 = W - nlPad;
    const sxOf = (hundInTenth) => sx0 + (hundInTenth / 10) * (sx1 - sx0); // 0..10

    // magnifier funnel from the interval on the line down to the strip
    ctx.save();
    ctx.fillStyle = 'rgba(63,116,166,0.07)';
    ctx.strokeStyle = 'rgba(63,116,166,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(zx0, lineY + 12);
    ctx.lineTo(zx1, lineY + 12);
    ctx.lineTo(sx1, stripY);
    ctx.lineTo(sx0, stripY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // mark the zoomed interval on the line itself
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(zx0, lineY + 12);
    ctx.lineTo(zx1, lineY + 12);
    ctx.stroke();
    ctx.restore();

    // the strip: a magnified tenth split into ten hundredths
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(sx0, stripY, sx1 - sx0, stripH);
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx0 + 0.5, stripY + 0.5, sx1 - sx0 - 1, stripH - 1);

    // hundredth ticks + end labels (the two bounding tenths)
    for (let k = 0; k <= 10; k++) {
      const X = sxOf(k);
      const end = k === 0 || k === 10;
      ctx.strokeStyle = end ? 'rgba(28,43,58,0.75)' : 'rgba(28,43,58,0.4)';
      ctx.lineWidth = end ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(X + 0.5, stripY);
      ctx.lineTo(X + 0.5, stripY + (end ? stripH : stripH * 0.5));
      ctx.stroke();
    }
    ctx.fillStyle = INK;
    ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    ctx.fillText(lo.toFixed(1), sx0 + 3, stripY + stripH - 3);
    ctx.textAlign = 'right';
    ctx.fillText(hi.toFixed(1), sx1 - 3, stripY + stripH - 3);

    // the value inside the magnified tenth
    const hInTenth = S.cH - tIndex * 10; // 0..9 (which hundredth within the tenth)
    const mX = sxOf(hInTenth);
    ctx.fillStyle = CARMINE;
    ctx.beginPath();
    ctx.arc(mX, stripY + stripH / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('one tenth, split into ten hundredths', (sx0 + sx1) / 2, stripY + 2);
    ctx.restore();

    geoRef.current = geo;
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [ones, tenths, hund, step, target, filling, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step the first time we reach it; reset the
     digits to 0 so it starts clearly un-matched (like the add / cube labs). */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setOnes(0);
      setTenths(0);
      setHund(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the fill animation — fractional cells appear one at a time, time-based,
     opt-in, and respectful of reduced motion */
  useEffect(() => {
    if (!filling) {
      fillRef.current = null;
      draw();
      return;
    }
    if (frac === 0) {
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
    const total = 1100; // ms for the whole fractional fill, regardless of count
    const per = total / frac;
    fillRef.current = 0;
    const loop = (now) => {
      if (start == null) start = now;
      const t = now - start;
      fillRef.current = Math.min(frac, Math.floor(t / per));
      draw();
      if (t < total) raf = requestAnimationFrame(loop);
      else {
        fillRef.current = null;
        setFilling(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [filling, frac, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'ones') setOnes(v);
    else if (key === 'tenths') setTenths(v);
    else setHund(v);
    if (filling) setFilling(false);
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const geo = geoRef.current;
    if (!geo || !geo.work) return;
    const w = geo.work;
    if (x >= w.x && x <= w.x + w.size && y >= w.y && y <= w.y + w.size) {
      const col = Math.min(9, Math.max(0, Math.floor((x - w.x) / w.cell)));
      const row = Math.min(9, Math.max(0, Math.floor((y - w.y) / w.cell)));
      hoverRef.current = { type: 'cell', col, row };
      draw();
      return;
    }
    const ln = geo.line;
    if (ln && Math.abs(y - ln.y) <= 22 && x >= ln.x0 && x <= ln.x1) {
      const v = ((x - ln.x0) / (ln.x1 - ln.x0)) * ln.vmax;
      const cHsnap = Math.max(0, Math.min(100 * ln.vmax, Math.round(v * 100)));
      hoverRef.current = { type: 'line', cH: cHsnap };
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
      setOnes(0);
      setTenths(0);
      setHund(0);
    } else {
      setOnes(START.ones);
      setTenths(START.tenths);
      setHund(START.hundredths);
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

  const reading = readDecimal(ones, tenths, hund);
  const spoken =
    `The value is ${decStr(ones, tenths, hund)}, read ${reading}. ` +
    `${ones} whole${ones === 1 ? '' : 's'}, ${tenths} tenth${tenths === 1 ? '' : 's'}, and ` +
    `${hund} hundredth${hund === 1 ? '' : 's'}. As a fraction, ${cH} hundredths, or ${fp} over ${fq}.`;

  return (
    <div className="dlab">
      <header className="head">
        <h1>Decimals &amp; Place Value</h1>
        <p className="lede">
          A decimal keeps the base-ten pattern going <em>past</em> the ones place — each step to
          the right is one-tenth as big. See the same number two ways: as shaded{' '}
          <span className="mono">area</span> on a base-ten grid, and as a{' '}
          <span className="mono">position</span> on a number line you can zoom into. Each dial
          unlocks with the lesson, so you meet one place at a time.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <DecimalReadout ones={ones} tenths={tenths} hund={hund} />
            </p>
            <p className="equation-sub mono">
              = {cH}/100
              {fq !== 100 ? ` = ${fp}/${fq}` : ''}&nbsp;&nbsp;·&nbsp;&nbsp;{reading}
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
            <span className="hint mono">column = 0.1 (a tenth) · cell = 0.01 (a hundredth)</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — you built ${decStrFromCH(target)}.` : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Value</span>
              <span className="fact-v mono carm big">{decStr(ones, tenths, hund)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">In words</span>
              <span className="fact-v">{reading}</span>
            </div>
            <div className="fact">
              <span className="fact-k">As a fraction</span>
              <span className="fact-v mono">
                {cH}/100{fq !== 100 ? ` = ${fp}/${fq}` : ''}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Expanded form</span>
              <span className="fact-v mono">{expandedForm(ones, tenths, hund)}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (filling ? ' on' : '')}
              onClick={() => setFilling((f) => !f)}
              disabled={frac === 0}
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
              const unlocked = step >= d.unlock;
              const val = { ones, tenths, hundredths: hund }[d.key];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className={'dk ' + d.key}>{d.unit}</span>
                  <span className="dname">{d.place}</span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={1}
                    value={val}
                    disabled={!unlocked}
                    aria-label={`Dial ${d.place} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? val : '🔒'}</output>
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
                  <span className="mono target-hint">build {decStrFromCH(target)}</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setOnes(0);
                  setTenths(0);
                  setHund(0);
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
                  setOnes(START.ones);
                  setTenths(START.tenths);
                  setHund(START.hundredths);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">value = ones + tenths/10 + hundredths/100</span> &nbsp;·&nbsp; place
        value to the right of the point, shown as a base-ten grid and on a number line (CCSS 4.NF.C,
        5.NBT.A).
      </footer>

      <style jsx>{`
        .dlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --addend: #3f74a6;
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
        .equation .t-ones {
          color: var(--ink);
        }
        .equation .t-pt {
          color: var(--ink-soft);
        }
        .equation .t-tenths {
          color: var(--addend);
        }
        .equation .t-hund {
          color: var(--curve);
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
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
        /* On narrow screens the 8:5 ratio gets too short for the stacked bands
           (grids, line, zoom strip), so go a touch taller there. */
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
        .dk.ones {
          color: var(--ink);
        }
        .dk.tenths {
          color: var(--addend);
        }
        .dk.hundredths {
          color: var(--curve);
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
        :global(.dlab) :focus-visible {
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
