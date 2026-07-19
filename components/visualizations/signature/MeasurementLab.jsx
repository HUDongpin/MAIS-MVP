'use client';

/* ============================================================================
   MeasurementLab — an interactive "bench" for MEASURING LENGTH with a ruler.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at Grade 2
   (CCSS 2.MD — Measurement & Data).  A single lab that walks a 7-8 year old
   through the whole Grade-2 length strand:

     • 2.MD.A.1  measure length by lining an object up from 0 and counting
                 equal units end-to-end with a ruler.
     • 2.MD.A.2  measure the SAME object with two different-size units and see
                 how the count relates to the size of the unit  ← the CENTERPIECE.
     • 2.MD.A.3  estimate a length before you measure it.
     • 2.MD.A.4  find how much LONGER one object is than another.
     • 2.MD.B.5  add / subtract lengths (the "how much longer" difference).
     • 2.MD.B.6  whole numbers as lengths from 0 on a number-line ruler.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions gated on
   *answered*, and a construction-goal calibration with a live match meter.

   THE SIGNATURE CENTERPIECE — the measurement analogue of the line's slope
   triangle or the add lab's count-on hops — is the INVERSE RELATIONSHIP between
   the SIZE of a unit and how MANY of them fit:

        (number of units)  ×  (size of one unit)  =  length          [invariant]

   The model is honest connecting-CUBES (a classroom manipulative), so every
   number on screen is exact:
        • a CUBE is the smallest unit (length 1).
        • a ROD is 1, 2, or 3 cubes snapped together — the unit you measure with.
        • length-in-cubes is the object's true length; reading-in-rods = the count.
   Because a rod is 1, 2 or 3 cubes, the only fractional readings possible are
   halves and thirds — shown as clean mixed numbers (e.g. 3½ rods).  Nothing is
   ever a floating-point approximation.

   One-accent discipline, adapted for a measurement lab: CARMINE marks the thing
   being measured and its measurement — the object strip, the reading, and (on
   the compare step) the "how much longer" difference.  Soft blue is the neutral
   second object, exactly as --quad is the neutral secondary in the other labs.
   Gold marks the measuring rods themselves when they are laid along the strip.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/MeasurementLab.jsx
     2. Import and render it:
          import MeasurementLab from './MeasurementLab';
          export default function Page() { return <MeasurementLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (lenA, lenB, unit, step).
     MODEL  — the math is pure integer arithmetic; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World window. A one-dimensional ruler, 0 through 12 CUBES (the finest
   unit). 12 is divisible by 1, 2 and 3, so a rod of any size tiles it exactly —
   which keeps the centerpiece "same object, different unit" pristine.
   ------------------------------------------------------------------------- */
const VMIN = 0;
const VMAX = 12;

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Three whole-number dials, each unlocking one step later
   than the last, so a child meets one idea at a time:
     lenA  — the length of the object you measure (in cubes).
     unit  — the SIZE of one measuring rod (1, 2 or 3 cubes)  ← the 2.MD.A.2 idea.
     lenB  — the length of a second object, for "how much longer?".
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'lenA', label: 'L', min: 1, max: 12, step: 1, unlock: 1, role: 'length of your strip · in cubes' },
  { key: 'unit', label: 'u', min: 1, max: 3, step: 1, unlock: 3, role: 'size of one rod · in cubes' },
  { key: 'lenB', label: 'B', min: 0, max: 12, step: 1, unlock: 5, role: 'length of the other strip · in cubes' },
];
const START = { lenA: 6, unit: 1, lenB: 4 };

const UNIT_STEP = 3;    // "bigger unit, fewer needed" — the centerpiece
const ESTIMATE_STEP = 4; // "estimate first"
const COMPARE_STEP = 5;  // "how much longer?" — lenB is featured here
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Measuring is exact integer arithmetic. The count of rods that
   fit is length / rod-size; because both are integers the count is an exact
   rational whose only possible fraction (for rods of 1, 2, 3 cubes) is a half or
   a third. `countExact` returns {whole, num, den} so nothing is ever a float.
   ------------------------------------------------------------------------- */
function countExact(len, unit) {
  const whole = Math.floor(len / unit);
  const rem = len - whole * unit; // 0 .. unit-1
  return { whole, num: rem, den: unit };
}

/* The defining invariant this lab teaches: count × unit-size = length, always.
   Kept as an assertable function so the audit can hammer it. */
function invariantHolds(len, unit) {
  const { whole, num, den } = countExact(len, unit);
  // (whole + num/den) * unit === len   ⇔   whole*unit + num === len  (integers)
  return whole * unit + num === len && den === unit;
}

/* ---------------------------------------------------------------------------
   Formatting helpers.
   ------------------------------------------------------------------------- */
const FRAC = { '1/2': '½', '1/3': '⅓', '2/3': '⅔' };
function fracGlyph(num, den) {
  if (num === 0) return '';
  return FRAC[`${num}/${den}`] ?? `${num}/${den}`;
}
/* A rod count as a clean mixed number, e.g. "3", "½", "3½", "2⅓". */
function countStr(len, unit) {
  const { whole, num, den } = countExact(len, unit);
  const f = fracGlyph(num, den);
  if (!f) return String(whole);
  return whole === 0 ? f : `${whole}${f}`;
}
const numToWord = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve',
];
const word = (n) => numToWord[n] ?? String(n);
const rodWord = (u) => (u === 1 ? 'cube' : `${word(u)}-cube rod`);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the reveal
   lives in `feedback` (shown after answering); distractors are real Grade-2
   measurement misconceptions (start counting at 1, count the tick-lines not the
   spaces, "bigger unit means bigger number", forgetting same-unit comparison).
   Next is gated on ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the ruler',
    body: 'Line the LEFT end up with 0, then read the number at the other end.',
    q: 'Where should the left end line up?',
    choices: ['On 0', 'On 1', 'Anywhere you like'],
    answer: 0,
    feedback: 'Always start at 0. Start at 1 and every reading comes out one too big.',
  },
  {
    title: 'The length',
    body: 'Drag L. The strip grows and the reading at its end follows.',
    q: 'The strip reaches the 8. How long is it?',
    choices: ['8 cubes long', '7 — skip the 0', '9 — count 0 too'],
    answer: 0,
    feedback: 'Count the SPACES between marks, not the marks. From 0 to 8: eight spaces.',
  },
  {
    title: 'Count the units',
    body: 'Press “Lay rods”. Count the rods that fit end-to-end.',
    q: 'What tells you the length?',
    choices: ['How many rods fit', 'The color of the rods', 'How wide it looks'],
    answer: 0,
    feedback: 'Length is the number of equal units, end-to-end, no gaps, no overlaps.',
  },
  {
    title: 'Bigger unit, fewer needed',
    body: 'Grow the rod. The strip stays the same — but fewer rods fit!',
    q: 'Which rods give the BIGGER number?',
    choices: ['The small rods — more fit', 'The big rods', 'Same either way'],
    answer: 0,
    feedback: 'Smaller unit, bigger count. But rods × size never changes — the strip is the strip.',
  },
  {
    title: 'Estimate first',
    body: 'Press “Estimate” — guess before you count, then check yourself.',
    q: 'Why estimate before you measure?',
    choices: ['To catch big mistakes', 'It replaces measuring', 'For exact answers'],
    answer: 0,
    feedback: 'A wild difference from your guess says: go back and re-check!',
  },
  {
    title: 'How much longer?',
    body: 'A blue strip appears. The carmine piece sticking past it is the difference.',
    q: 'Yours is 9 cubes, blue is 5. How much longer is yours?',
    choices: ['4 cubes longer', '14 cubes', '9 cubes'],
    answer: 0,
    feedback: '9 − 5 = 4. “How much longer” is a subtraction — in the same unit.',
  },
  {
    title: 'Build it!',
    body: 'Build a strip of exactly the target length — measured in the target rod.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): build a strip that measures exactly `count` rods of size
   `size`, i.e. reach a target length of count×size cubes. This ties the whole
   lesson together — to build "4 two-cube rods" the child must realise that is 8
   cubes. The meter is plain integer closeness on the cube length; CALIBRATED
   fires only on an exact hit.
   ------------------------------------------------------------------------- */
const matchPercent = (lenA, targetBase) =>
  100 * Math.max(0, 1 - Math.abs(lenA - targetBase) / 8);
const isCalibrated = (lenA, targetBase) => lenA === targetBase;

function makeTarget(prevBase) {
  const options = [];
  for (let size = 1; size <= 3; size++) {
    for (let count = 2; count <= 12; count++) {
      const base = size * count;
      if (base >= 3 && base <= VMAX) options.push({ size, count, base });
    }
  }
  let pick;
  do {
    pick = options[Math.floor(Math.random() * options.length)];
  } while (prevBase != null && pick.base === prevBase && options.length > 1);
  return pick;
}

/* EDIT 5 — Equation display. The measurement invariant, colour-coded to the
   picture: the count of rods (the reading) and the length share the carmine
   accent; the rod size is gold, matching the rods on the canvas. */
function MeasureEquation({ lenA, unit }) {
  const c = countStr(lenA, unit);
  const rodLabel = unit === 1 ? (c === '1' ? 'cube' : 'cubes') : c === '1' ? 'rod' : 'rods';
  return (
    <span className="eq">
      <span className="t-count">{c}</span>
      <span className="t-op">&nbsp;{rodLabel}&nbsp;×&nbsp;</span>
      <span className="t-unit">{unit}</span>
      <span className="t-op">&nbsp;=&nbsp;</span>
      <span className="t-len">{lenA}</span>
      <span className="t-op">&nbsp;{lenA === 1 ? 'cube' : 'cubes'}</span>
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function MeasurementLab() {
  const [lenA, setLenA] = useState(START.lenA);
  const [unit, setUnit] = useState(START.unit);
  const [lenB, setLenB] = useState(START.lenB);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null); // { size, count, base }
  const [showTiles, setShowTiles] = useState(true);
  const [laying, setLaying] = useState(false); // rod-laying animation running
  const [estimate, setEstimate] = useState(false); // hide the numbers to estimate

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // integer cube value under the pointer, or null
  const layRef = useRef(null);   // during the lay animation: how many rods to draw
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const showB = step === COMPARE_STEP; // the second strip appears only on the compare step
  const cStr = countStr(lenA, unit);
  const cWord = unit === 1 ? (cStr === '1' ? 'cube' : 'cubes') : cStr === '1' ? 'rod' : 'rods';

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer / animation handlers never read stale values.
  sceneRef.current = {
    lenA, unit, lenB, step, calib, target, showTiles, laying, estimate,
    showB,
    isUnitStep: step === UNIT_STEP,
    isCompare: step === COMPARE_STEP,
  };

  const pct = target != null ? matchPercent(lenA, target.base) : 0;
  const calibrated = target != null ? isCalibrated(lenA, target.base) : false;

  /* ---- cube → screen transform + full redraw from state ------------------- */
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
    const CARMINE = '#C81E4F';
    const CARM_SOFT = 'rgba(200,30,79,0.16)';
    const BLUE = '#3F74A6';       // the neutral second object
    const BLUE_SOFT = 'rgba(63,116,166,0.16)';
    const GOLD = '#D9982B';       // the measuring rods
    const GOLD_SOFT = 'rgba(217,152,43,0.30)';
    const GOLD_SOFT2 = 'rgba(217,152,43,0.16)';
    const RULER = '#EFE7D3';      // warm ruler body
    const RULER_EDGE = 'rgba(28,43,58,0.30)';

    const S = sceneRef.current;
    const A = S.lenA;
    const U = S.unit;
    const B = S.lenB;

    /* layout bands (all derived from H so it scales) */
    const padL = 34;
    const padR = 22;
    const spanW = W - padL - padR;
    const nx = (v) => padL + ((v - VMIN) / (VMAX - VMIN)) * spanW;
    const u = nx(1) - nx(0); // pixels per cube

    const rulerTop = Math.round(H * 0.66);
    const rulerH = Math.max(30, Math.round(H * 0.15));
    const barH = Math.max(20, Math.min(40, Math.round(H * 0.13)));
    const gap = Math.max(7, Math.round(H * 0.03));
    const aBottom = rulerTop - gap;
    const aTop = aBottom - barH;
    const bBottom = aTop - gap;
    const bTop = bBottom - barH;

    ctx.clearRect(0, 0, W, H);

    /* ---- quadrille paper: faint vertical cube gridlines --------------------- */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.6)';
    ctx.beginPath();
    for (let v = VMIN; v <= VMAX; v++) {
      const X = Math.round(nx(v)) + 0.5;
      ctx.moveTo(X, 6);
      ctx.lineTo(X, rulerTop);
    }
    ctx.stroke();

    /* ---- helper: a rounded, cube-divided strip ------------------------------ */
    const drawStrip = (v0, v1, top, h, fill, edge) => {
      if (v1 <= v0) return;
      const x0 = nx(v0);
      const x1 = nx(v1);
      const r = Math.min(7, h / 2, (x1 - x0) / 2);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x0 + r, top);
      ctx.arcTo(x1, top, x1, top + h, r);
      ctx.arcTo(x1, top + h, x0, top + h, r);
      ctx.arcTo(x0, top + h, x0, top, r);
      ctx.arcTo(x0, top, x1, top, r);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      // faint cube divisions inside
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let v = v0 + 1; v < v1; v++) {
        const X = Math.round(nx(v)) + 0.5;
        ctx.moveTo(X, top);
        ctx.lineTo(X, top + h);
      }
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
    };

    /* ---- the calibration target: a grey dashed "length to build" ------------ */
    if (S.calib && S.target != null) {
      const gy = aTop - gap - 4;
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.9)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(nx(0), gy);
      ctx.lineTo(nx(S.target.base), gy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(nx(0), gy - 6);
      ctx.lineTo(nx(0), gy + 6);
      ctx.moveTo(nx(S.target.base), gy - 6);
      ctx.lineTo(nx(S.target.base), gy + 6);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        `target: ${plural(S.target.count, rodWord(S.target.size))}`,
        (nx(0) + nx(S.target.base)) / 2,
        gy - 8,
      );
      ctx.restore();
    }

    /* ---- the object strip A (the carmine star) ------------------------------ */
    drawStrip(0, A, aTop, barH, CARM_SOFT, CARMINE);

    /* ---- the measuring rods laid along strip A (the centerpiece) ------------ */
    // How many rods to show: all of them, unless the lay animation is mid-flight.
    const fullRods = Math.floor(A / U);
    const remCubes = A - fullRods * U;         // leftover partial rod (in cubes)
    const animating = S.laying && layRef.current != null;
    const rodsShown = animating ? Math.min(fullRods, layRef.current) : fullRods;
    const showPartial = !animating && remCubes > 0;

    if (S.showTiles) {
      const tTop = aTop + 3;
      const tH = barH - 6;
      for (let i = 0; i < rodsShown; i++) {
        const x0 = nx(i * U);
        const x1 = nx((i + 1) * U);
        ctx.save();
        ctx.fillStyle = i % 2 === 0 ? GOLD_SOFT : GOLD_SOFT2;
        ctx.fillRect(x0 + 1, tTop, x1 - x0 - 2, tH);
        ctx.strokeStyle = S.isUnitStep ? CARMINE : GOLD;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(x0 + 1.5, tTop + 0.5, x1 - x0 - 3, tH - 1);
        // rod ordinal
        if (x1 - x0 > 15) {
          ctx.fillStyle = GOLD;
          ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(i + 1), (x0 + x1) / 2, tTop + tH / 2 + 0.5);
        }
        ctx.restore();
      }
      // the leftover partial rod (a fraction of a rod) — hatched so it reads "not a whole rod"
      if (showPartial) {
        const x0 = nx(fullRods * U);
        const x1 = nx(fullRods * U + remCubes);
        ctx.save();
        ctx.fillStyle = 'rgba(217,152,43,0.10)';
        ctx.fillRect(x0 + 1, tTop, x1 - x0 - 1, tH);
        ctx.strokeStyle = GOLD;
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.4;
        ctx.strokeRect(x0 + 1.5, tTop + 0.5, x1 - x0 - 2.5, tH - 1);
        ctx.restore();
      }
    }

    /* ---- the second strip B + the "how much longer" difference (compare) ---- */
    if (S.showB) {
      drawStrip(0, B, bTop, barH, BLUE_SOFT, BLUE);
      const lo = Math.min(A, B);
      const hi = Math.max(A, B);
      if (hi > lo) {
        // shade the extra piece across both bands and bracket it in carmine
        const x0 = nx(lo);
        const x1 = nx(hi);
        const yTop = Math.min(aTop, bTop);
        const yBot = Math.max(aBottom, bBottom);
        ctx.save();
        ctx.fillStyle = 'rgba(200,30,79,0.10)';
        ctx.fillRect(x0, yTop, x1 - x0, yBot - yTop);
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x0, yTop);
        ctx.lineTo(x0, yBot);
        ctx.moveTo(x1, yTop);
        ctx.lineTo(x1, yBot);
        ctx.stroke();
        ctx.setLineDash([]);
        // label — always a positive difference, naming which strip is longer
        const diff = hi - lo;
        const owner = A > B ? 'yours' : 'blue';
        const label = `${owner} is ${plural(diff, 'cube')} longer`;
        ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
        const tw = ctx.measureText(label).width;
        let mx = (x0 + x1) / 2;
        mx = Math.min(Math.max(mx, padL + tw / 2 + 6), W - padR - tw / 2 - 6);
        const my = yTop - 6;
        ctx.fillStyle = 'rgba(251,251,248,0.92)';
        ctx.fillRect(mx - tw / 2 - 5, my - 15, tw + 10, 18);
        ctx.fillStyle = CARMINE;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, mx, my - 6);
        ctx.restore();
      }
    }

    /* ---- the RULER: a warm body with cube subticks + numbered rod ticks ----- */
    ctx.save();
    ctx.fillStyle = RULER;
    ctx.fillRect(nx(0), rulerTop, nx(VMAX) - nx(0), rulerH);
    ctx.strokeStyle = RULER_EDGE;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(nx(0) + 0.5, rulerTop + 0.5, nx(VMAX) - nx(0) - 1, rulerH - 1);

    // label density: a rod-number needs room; drop every other if it is tight.
    const pxPerUnit = nx(U) - nx(0);
    const labelEvery = pxPerUnit >= 26 ? 1 : 2;
    const nRods = Math.floor(VMAX / U);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = VMIN; v <= VMAX; v++) {
      const X = nx(v);
      const isRodTick = v % U === 0;
      ctx.strokeStyle = isRodTick ? 'rgba(28,43,58,0.75)' : 'rgba(28,43,58,0.32)';
      ctx.lineWidth = isRodTick ? 2 : 1;
      const tickLen = isRodTick ? rulerH * 0.5 : rulerH * 0.28;
      ctx.beginPath();
      const XX = Math.round(X) + (isRodTick ? 0 : 0.5);
      ctx.moveTo(XX, rulerTop);
      ctx.lineTo(XX, rulerTop + tickLen);
      ctx.stroke();
      if (isRodTick && !S.estimate) {
        const k = v / U; // the rod number
        if (k % labelEvery === 0 || k === nRods) {
          ctx.fillStyle = INK;
          ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.fillText(String(k), X, rulerTop + rulerH * 0.5 + 2);
        }
      }
    }
    // unit caption on the ruler
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      S.estimate ? 'estimate — numbers hidden' : `ruler in ${rodWord(U)}s`,
      nx(VMAX) - 4,
      rulerTop + rulerH - 3,
    );
    ctx.restore();

    /* ---- reading guide + pill at strip A's end -----------------------------
       Suppressed on the compare step: there the difference bracket is the star,
       both lengths are in the facts panel, and on a narrow screen the pill could
       otherwise collide with the second (blue) strip when A is shorter than B. */
    if (!S.showB) {
      const X = nx(A);
      // dashed drop line from the strip end to the ruler
      ctx.save();
      ctx.strokeStyle = 'rgba(200,30,79,0.45)';
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(X, aTop);
      ctx.lineTo(X, rulerTop + rulerH);
      ctx.stroke();
      ctx.restore();

      // the reading pill above the strip's right end
      const cs = countStr(A, U);
      const cw = U === 1 ? (cs === '1' ? 'cube' : 'cubes') : cs === '1' ? 'rod' : 'rods';
      const label = S.estimate ? '?' : `${cs} ${cw}`;
      ctx.save();
      ctx.font = '700 14px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(label).width;
      const bw = tw + 16;
      const bh = 22;
      let px = X;
      px = Math.min(Math.max(px, padL + bw / 2), W - padR - bw / 2);
      const py = Math.max(aTop - bh - 6, 4);
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
      // little pointer down to the strip
      ctx.beginPath();
      ctx.moveTo(px - 5, py + bh);
      ctx.lineTo(px + 5, py + bh);
      ctx.lineTo(px, py + bh + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, px, py + bh / 2 + 0.5);
      ctx.restore();
    }

    /* ---- centerpiece caption: the invariant, on the unit step --------------- */
    if (S.isUnitStep && !S.estimate) {
      const read = `${countStr(A, U)} × ${U} = ${A} ${A === 1 ? 'cube' : 'cubes'}  (same strip, any rod)`;
      ctx.save();
      ctx.font = '600 12.5px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(read).width;
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(10, 8, tw + 14, 22);
      ctx.strokeStyle = 'rgba(217,152,43,0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(10.5, 8.5, tw + 13, 21);
      ctx.fillStyle = GOLD;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(read, 17, 20);
      ctx.restore();
    }

    /* ---- hover readout: the cube value under the pointer -------------------- */
    const hv = hoverRef.current;
    if (hv != null && !S.calib && !S.estimate) {
      const X = nx(hv);
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.3)';
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(X, aTop - 4);
      ctx.lineTo(X, rulerTop);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = INK;
      ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${hv}`, X, aTop - 6);
      ctx.restore();
    }
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [lenA, unit, lenB, step, target, showTiles, laying, estimate, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step the first time we reach it; reset the
     strip so it starts clearly un-matched (like the add / cube labs). */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setLenA(1);
      setUnit(1);
      setShowTiles(true);
      setEstimate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the rod-laying animation — rods appear one at a time, time-based, opt-in,
     and respectful of reduced motion */
  useEffect(() => {
    if (!laying) {
      layRef.current = null;
      draw();
      return;
    }
    const fullRods = Math.floor(lenA / unit);
    if (fullRods === 0) {
      setLaying(false);
      return;
    }
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setLaying(false);
      return;
    }
    let raf;
    let start = null;
    const per = 360; // ms per rod
    const total = (fullRods + 0.5) * per;
    layRef.current = 0;
    const loop = (now) => {
      if (start == null) start = now;
      const t = now - start;
      layRef.current = Math.min(fullRods, Math.floor(t / per));
      draw();
      if (t < total) raf = requestAnimationFrame(loop);
      else {
        layRef.current = null;
        setLaying(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [laying, lenA, unit, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'lenA') setLenA(v);
    else if (key === 'unit') setUnit(v);
    else setLenB(v);
    if (laying) setLaying(false);
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const padL = 34;
    const padR = 22;
    const frac = (cssX - padL) / (rect.width - padL - padR);
    const v = Math.round(VMIN + frac * (VMAX - VMIN));
    hoverRef.current = v >= VMIN && v <= VMAX ? v : null;
    draw();
  };
  const onPointerLeave = () => {
    hoverRef.current = null;
    draw();
  };

  const layRods = () => {
    setShowTiles(true);
    setLaying(true);
  };

  const resetDials = () => {
    if (calib) {
      setLenA(1);
      setUnit(1);
    } else {
      setLenA(START.lenA);
      setUnit(step >= UNIT_STEP ? unit : START.unit);
      setLenB(START.lenB);
    }
    if (laying) setLaying(false);
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

  const diff = Math.abs(lenA - lenB);
  const spoken =
    `Your strip is ${plural(lenA, 'cube')} long. ` +
    `Measured with ${rodWord(unit)}s, it reads ${countStr(lenA, unit)} ` +
    `${unit === 1 ? 'cubes' : 'rods'}. ` +
    (showB ? `The other strip is ${plural(lenB, 'cube')}; the difference is ${plural(diff, 'cube')}. ` : '') +
    `The rule: number of units times unit size equals the length.`;

  return (
    <div className="mlab">
      <header className="head">
        <h1>Measuring Length with a Ruler</h1>
        <p className="lede">
          Line an object up from <span className="mono">0</span> and count equal units. Then change
          the <em>size</em> of the unit and watch the number flip: a <em>bigger</em> unit means{' '}
          <em>fewer</em> fit. Each dial unlocks with the lesson, so you meet one idea at a time, and
          finish by building a strip to an exact target.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              {estimate ? (
                <span className="eq est-hint">estimate the reading… then press “Show numbers”</span>
              ) : (
                <MeasureEquation lenA={lenA} unit={unit} />
              )}
            </p>
            <p className="equation-sub mono">number of units × unit size = length</p>
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
            <span className="hint mono">carmine = your strip · gold = the rods you measure with</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — you built ${plural(target.count, rodWord(target.size))}.` : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Length of your strip</span>
              <span className="fact-v mono carm big">{plural(lenA, 'cube')}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Size of one rod</span>
              <span className="fact-v mono gold">{plural(unit, 'cube')}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Rods that fit (the reading)</span>
              <span className="fact-v mono carm">{estimate ? '?' : `${cStr} ${cWord}`}</span>
            </div>
            {showB ? (
              <div className="fact">
                <span className="fact-k">How much longer (longer − shorter)</span>
                <span className="fact-v mono">
                  {lenA === lenB
                    ? 'same length'
                    : `${Math.max(lenA, lenB)} − ${Math.min(lenA, lenB)} = ${Math.abs(
                        lenA - lenB,
                      )} cubes`}
                </span>
              </div>
            ) : (
              <div className="fact">
                <span className="fact-k">Check: units × size</span>
                <span className="fact-v mono">
                  {estimate ? '?' : `${countStr(lenA, unit)} × ${unit} = ${lenA}`}
                </span>
              </div>
            )}
          </div>

          <div className="toolbar">
            <button
              type="button"
              className="btn ghost"
              onClick={layRods}
              disabled={laying || Math.floor(lenA / unit) === 0}
            >
              {laying ? 'Laying…' : 'Lay rods ▸'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (showTiles ? ' on' : '')}
              onClick={() => setShowTiles((s) => !s)}
              aria-pressed={showTiles}
            >
              {showTiles ? 'Hide rods' : 'Show rods'}
            </button>
            <button
              type="button"
              className={'btn ghost' + (estimate ? ' on' : '')}
              onClick={() => setEstimate((s) => !s)}
              aria-pressed={estimate}
            >
              {estimate ? 'Show numbers' : 'Estimate'}
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
            {PARAMS.filter((d) => !(calib && d.key === 'lenB')).map((d) => {
              const unlocked = step >= d.unlock;
              const val = { lenA, unit, lenB }[d.key];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className={'dk ' + d.key}>{d.label}</span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={d.step}
                    value={val}
                    disabled={!unlocked}
                    aria-label={`Dial ${d.label} — ${d.role}`}
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
              <p className="calib-goal mono">
                Build <strong>{plural(target.count, rodWord(target.size))}</strong>
                &nbsp;=&nbsp;{target.base} cubes
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
                    set the rod to {target.size}, then {target.count} must fit
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target.base));
                  setLenA(1);
                  setUnit(1);
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
                  setLenA(START.lenA);
                  setUnit(START.unit);
                  setLenB(START.lenB);
                  setShowTiles(true);
                  setEstimate(false);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">units × unit-size = length</span> &nbsp;·&nbsp; measuring length with
        a ruler: iterate equal units from 0, and the count changes with the size of the unit (CCSS
        2.MD.A.1–A.4, 2.MD.B.5–B.6).
      </footer>

      <style jsx>{`
        .mlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #3f74a6;
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
          font-size: 20px;
          font-weight: 600;
          margin: 0;
          letter-spacing: 0.01em;
        }
        .equation .t-count,
        .equation .t-len {
          color: var(--curve);
          font-weight: 700;
        }
        .equation .t-unit {
          color: var(--gold);
          font-weight: 700;
        }
        .equation .t-op {
          color: var(--ink-soft);
        }
        .equation .est-hint {
          font-size: 15px;
          font-weight: 600;
          font-style: italic;
          color: var(--ink-soft);
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
           (pills, two strips, ruler), so go taller-than-wide there. */
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 5 / 6;
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
          background: rgba(251, 251, 248, 0.78);
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
        .fact-v.gold {
          color: var(--gold);
          font-weight: 700;
        }
        .fact-v.big {
          font-size: 19px;
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
        .dk.lenA {
          color: var(--curve);
        }
        .dk.unit {
          color: var(--gold);
        }
        .dk.lenB {
          color: var(--blue);
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
        .calib-goal {
          margin: 0;
          font-size: 14px;
          color: var(--ink);
        }
        .calib-goal strong {
          color: var(--curve);
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
        :global(.mlab) :focus-visible {
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
