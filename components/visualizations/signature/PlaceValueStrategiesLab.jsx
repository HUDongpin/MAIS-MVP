'use client';

/* ============================================================================
   PlaceValueStrategiesLab — an interactive "bench" for PLACE-VALUE STRATEGIES:
   how we add multi-digit whole numbers by breaking them apart by place, adding
   like places, and REGROUPING (carrying) whenever a place fills up past ten.

        A + B  =  (add the ones) + (add the tens) + (add the hundreds),
                   bundling every ten of one place into ONE of the next.

   Built for MAIS (math AI system, www.mais.ac), K-12.  "Use place value
   understanding and the properties of operations to add" is the backbone of
   the number-operations strand (CCSS 1.NBT.C.4, 2.NBT.B.5-7, 4.NBT.B.4).  This
   lab is the ADD-BY-PLACE companion to NumberLab (which teaches what place
   value *is*) and AddLab (single-digit sums on a number line): here two whole
   numbers are stacked in a place-value chart and combined column by column.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter.

   The signature centerpiece is the PLACE-VALUE ADDITION CHART with BASE-TEN
   BLOCKS.  Each place is a column; inside it the blocks of BOTH addends are
   dropped into one bin (addend A in blue, addend B in teal), so a child can
   literally COUNT the column.  The instant a column reaches ten blocks, the
   first ten are haloed and bundle into a single block of the next place — a
   carmine "carry" that slides up to the neighbouring column.  Regrouping stops
   being a mysterious "carry the 1" and becomes a thing you can see: ten ones
   ARE one ten; ten tens ARE one hundred.

   One-accent discipline, adapted for an addition-strategy lab: the two addends
   wear calm blue / teal, and the CARMINE accent is reserved for the one idea
   the whole lab is about — the REGROUP (the bundled ten and the carried digit).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/PlaceValueStrategiesLab.jsx
     2. Import and render it:
          import PlaceValueStrategiesLab from './PlaceValueStrategiesLab';
          export default function Page() { return <PlaceValueStrategiesLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (two addends, step).
     MODEL  — the math is pure integer, per-column addition with carries; it
              knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Two whole-number ADDENDS, each held as three digits
   (ones, tens, hundreds).  Dials unlock a PLACE-PAIR at a time (both addends'
   ones, then both tens, then both hundreds), so a child adds one place at a
   time.  `unlock` is the step index at which that place's two dials go live.
   ------------------------------------------------------------------------- */
const PLACES = [
  { name: 'Ones', short: 'ones', mult: 1, unlock: 1 }, // index 0
  { name: 'Tens', short: 'tens', mult: 10, unlock: 3 }, // index 1
  { name: 'Hundreds', short: 'hundreds', mult: 100, unlock: 4 }, // index 2
  { name: 'Thousands', short: 'thousands', mult: 1000, unlock: 99 }, // index 3 — only ever a carry target, never dialled
];

// Start with 28 + 15 = 43 — the smallest tidy sum whose ONES already overflow
// (8 + 5 = 13), so the star idea (regrouping) is on stage from step one.
const START_A = [8, 2, 0]; // [ones, tens, hundreds] = 28
const START_B = [5, 1, 0]; // = 15

const CALIB_STEP = 6;

/* How many place columns are REVEALED at a given step.  Grows monotonically as
   the lesson climbs from the ones place up to the hundreds.  Locked places
   contribute 0 (so navigating back cleanly shrinks the problem). */
const REVEAL_BY_STEP = [1, 1, 1, 2, 3, 3, 3];
const revealedCols = (s) => REVEAL_BY_STEP[s] ?? 3;

/* Which place is the carmine "focus" of each step (or null for all/none). */
const FOCUS_BY_STEP = [0, 0, 0, 1, 2, null, null];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Column addition with carries — exact integer arithmetic,
   nothing to approximate.  For each revealed place we add the two digits plus
   any carry coming in, write the ones-digit of that total, and carry the tens-
   digit (0 or 1, since the most a column can hold is 9 + 9 + 1 = 19) into the
   next place.  This IS the standard algorithm, laid bare.
   ------------------------------------------------------------------------- */
function addByPlace(aD, bD, cols) {
  const col = [];
  let carry = 0;
  for (let p = 0; p < cols; p++) {
    const a = aD[p];
    const b = bD[p];
    const total = a + b + carry; // blocks in this column before bundling
    const digit = total % 10; // what stays in this place
    const carryOut = Math.floor(total / 10); // bundled ten sent left (0 or 1)
    col.push({ place: p, a, b, carryIn: carry, total, digit, carryOut });
    carry = carryOut;
  }
  return { col, topCarry: carry }; // topCarry === 1 ⇒ a brand-new place is born
}

const valueOf = (d, cols) => {
  let n = 0;
  for (let p = 0; p < cols; p++) n += d[p] * PLACES[p].mult;
  return n;
};

const digitsOf = (n) => [n % 10, Math.floor(n / 10) % 10, Math.floor(n / 100) % 10, Math.floor(n / 1000) % 10];
const commas = (n) => n.toLocaleString('en-US');

/* Count the regroups a problem needs (columns whose total reaches ten). */
function regroupCount(aD, bD, cols) {
  return addByPlace(aD, bD, cols).col.filter((c) => c.carryOut === 1).length;
}

/* Expanded / partial-sums breakdown, largest place first, skipping empty
   places: 28 + 15 → groups (20 + 10), (8 + 5); place-totals 30, 13. */
function partialSums(aD, bD, cols) {
  const groups = [];
  const totals = [];
  for (let p = cols - 1; p >= 0; p--) {
    const av = aD[p] * PLACES[p].mult;
    const bv = bD[p] * PLACES[p].mult;
    if (av + bv === 0) continue;
    groups.push(`(${av} + ${bv})`);
    totals.push(av + bv);
  }
  return { groups, totals };
}

/* Expanded form of a single addend, largest place first: 28 → "20 + 8". */
function expandedOf(d, cols) {
  const parts = [];
  for (let p = cols - 1; p >= 0; p--) {
    const v = d[p] * PLACES[p].mult;
    if (v > 0) parts.push(commas(v));
  }
  return parts.length ? parts.join(' + ') : '0';
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): the lab poses a fixed addition problem that REQUIRES at
   least one regroup, and the child builds the answer on three place dials.
   The meter measures how many of the three answer-places are already right;
   CALIBRATED only when the built number equals A + B exactly.  This drills the
   whole strategy — including the trap of forgetting to carry.
   ------------------------------------------------------------------------- */
const answerCorrectPlaces = (ans, sum) => {
  const sd = digitsOf(sum);
  let c = 0;
  for (let i = 0; i < 3; i++) if (ans[i] === sd[i]) c++;
  return c;
};
const answerPercent = (ans, sum) => (100 * answerCorrectPlaces(ans, sum)) / 3;
const answerCalibrated = (ans, sum) => valueOf(ans, 3) === sum;

/* A well-formed calibration problem: two multi-digit addends whose sum stays
   ≤ 999 (three answer places) and that regroups at least once, so the strategy
   is genuinely exercised rather than a place-by-place copy. */
function makeProblem(prev) {
  for (let guard = 0; guard < 400; guard++) {
    const A = 12 + Math.floor(Math.random() * 470); // 12 … 481
    const B = 12 + Math.floor(Math.random() * 470);
    const sum = A + B;
    if (sum > 999) continue;
    if (regroupCount(digitsOf(A), digitsOf(B), 3) < 1) continue;
    if (prev && A === prev.A && B === prev.B) continue;
    return { A, B, sum };
  }
  return { A: 156, B: 275, sum: 431 };
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One place-idea per step; the dials unlock with the step;
   the reveal lives in `feedback`; distractors are real learner misconceptions
   (adding across places, "carry the 1" meaning one *one*, forgetting the carry,
   thinking a bigger number of digits wins).  Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Adding, one place at a time',
    body:
      'Watch 28 + 15. Break each number into places and add like with like: ' +
      'ones to ones, tens to tens.',
    q: 'Which parts do we add together first?',
    choices: ['Ones with ones (8 + 5)', 'The 8 with the 1', 'All digits at once'],
    answer: 0,
    feedback: 'Add like with like. Never add across places!',
  },
  {
    title: 'Add the ones',
    body: 'Drag the ones dials. Make the ones total reach ten or more…',
    q: 'The ones column holds 13 blocks. What must we do?',
    choices: ['Bundle ten into one ten', 'Write 13 there', 'Drop the extra 3'],
    answer: 0,
    feedback: 'A place holds only 0–9. Ten ones become one ten — the same amount, repackaged.',
  },
  {
    title: 'Regroup: ten ones make one ten',
    body: 'Press “Regroup ▶”: ten unit blocks lock into ONE ten-rod and slide left.',
    q: 'When we “carry the 1”, that 1 really means…',
    choices: ['one ten (worth 10)', 'one one (worth 1)', 'one hundred (worth 100)'],
    answer: 0,
    feedback: 'It sits in the TENS place, so it is worth ten. A carry is never “just a 1”.',
  },
  {
    title: 'Add the tens (don’t forget the carry)',
    body: 'Now the tens column: 2 tens + 1 ten + the carried ten.',
    q: 'In 28 + 15, what is the tens digit of the answer?',
    choices: ['4 — it is 2 + 1 + the 1 carried', '3 — just 2 + 1', '13'],
    answer: 0,
    feedback: '2 + 1 + 1 = 4. Forgetting the carry gives 33 instead of 43!',
  },
  {
    title: 'Bigger numbers, same idea',
    body:
      'Hundreds unlock. Make the TENS column reach ten and watch the bundle ' +
      'carry left.',
    q: 'Ten tens regroup into…',
    choices: ['one hundred', 'ten hundreds', 'one thousand'],
    answer: 0,
    feedback: 'Every place works the same: reach ten, bundle, carry left.',
  },
  {
    title: 'The whole strategy: partial sums',
    body: 'Adding by place is adding PARTIAL SUMS: (20 + 10) + (8 + 5) = 30 + 13 = 43.',
    q: 'Why does “carry a 1” match the blocks bundling a ten?',
    choices: ['It is the same move', 'Unrelated tricks', 'The blocks lie'],
    answer: 0,
    feedback: 'Writing the small 1 IS the bundling, written down.',
  },
  {
    title: 'Solve it yourself',
    body: 'Add each place. Regroup when a column reaches ten. Set the answer dials!',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display.  The classic vertical algorithm with the small
   carried digits above their columns, plus the partial-sums line beneath — the
   written twin of the base-ten picture.  Carmine marks every carry, tying the
   symbol to the bundled ten on the canvas.
   ------------------------------------------------------------------------- */
function VerticalSum({ aD, bD, cols }) {
  const { col, topCarry } = addByPlace(aD, bD, cols);
  const A = valueOf(aD, cols);
  const B = valueOf(bD, cols);
  const sum = A + B;
  const total = topCarry ? cols + 1 : Math.max(1, String(sum).length);
  const width = Math.max(String(A).length, String(B).length, String(sum).length);
  const pad = (s) => s.padStart(width, ' ');

  // carries string: a '1' sits above the SUM digit of any place that received a carry
  const carr = Array.from({ length: width }, () => ' ');
  for (let p = 1; p < cols; p++) {
    if (col[p] && col[p].carryIn === 1) carr[width - 1 - p] = '1';
  }
  const carriesStr = carr.join('');

  const chars = (str, cls) =>
    str.split('').map((ch, i) => (
      <span key={i} className={ch === '1' && cls === 'carry' ? 'cyd' : undefined}>
        {ch === ' ' ? ' ' : ch}
      </span>
    ));

  void total;
  return (
    <span className="vsum">
      <span className="vrow vcarry">{chars(carriesStr, 'carry')}</span>
      <span className="vrow">{'  ' + pad(String(A))}</span>
      <span className="vrow">
        <span className="vop">+</span>
        {' ' + pad(String(B))}
      </span>
      <span className="vrule" />
      <span className="vrow vtot">{'  ' + pad(String(sum))}</span>
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PlaceValueStrategiesLab() {
  const [aDigits, setADigits] = useState(START_A);
  const [bDigits, setBDigits] = useState(START_B);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [problem, setProblem] = useState(null); // calibration { A, B, sum }
  const [answerDigits, setAnswerDigits] = useState([0, 0, 0]);
  const [playing, setPlaying] = useState(false); // regroup animation running
  const [showBlocks, setShowBlocks] = useState(true);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // place index under the pointer, or null
  const animRef = useRef({ p: 0 }); // regroup animation progress 0..1
  const layoutRef = useRef({ cols: [] }); // hit-test + animation anchors from draw()
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const cols = revealedCols(step);
  const focus = FOCUS_BY_STEP[step];

  // In the lesson the dials ARE the addends; in calibration they are frozen to
  // the posed problem and the child instead builds the answer.
  const liveA = calib && problem ? digitsOf(problem.A) : aDigits;
  const liveB = calib && problem ? digitsOf(problem.B) : bDigits;
  const model = addByPlace(liveA, liveB, cols);
  const A = valueOf(liveA, cols);
  const B = valueOf(liveB, cols);
  const sum = A + B;
  const regroups = model.col.filter((c) => c.carryOut === 1).length;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer/animation handlers never read stale values.
  sceneRef.current = {
    aD: liveA,
    bD: liveB,
    cols,
    step,
    focus,
    calib,
    showBlocks,
    model,
    A,
    B,
    sum,
  };

  const ansPct = calib && problem ? answerPercent(answerDigits, problem.sum) : 0;
  const ansCorrect = calib && problem ? answerCorrectPlaces(answerDigits, problem.sum) : 0;
  const calibrated = calib && problem ? answerCalibrated(answerDigits, problem.sum) : false;
  sceneRef.current._cal = calib && calibrated;

  /* ---- base-ten block glyph (one block of a given place at a box) ---------- */
  function drawGlyph(ctx, rr, shade, place, x, y, g, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    if (place === 0) {
      // unit cube
      ctx.fillStyle = color;
      rr(x + g * 0.14, y + g * 0.14, g * 0.72, g * 0.72, 3);
      ctx.fill();
      ctx.strokeStyle = shade(color, -0.22);
      ctx.lineWidth = 1;
      rr(x + g * 0.14, y + g * 0.14, g * 0.72, g * 0.72, 3);
      ctx.stroke();
    } else if (place === 1) {
      // ten-rod: a tall bar divided into 10 unit cells
      const w = g * 0.4;
      const bx = x + (g - w) / 2;
      ctx.fillStyle = color;
      rr(bx, y + g * 0.04, w, g * 0.92, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      for (let j = 1; j < 10; j++) {
        const yy = y + g * 0.04 + (g * 0.92 / 10) * j;
        ctx.beginPath();
        ctx.moveTo(bx, yy);
        ctx.lineTo(bx + w, yy);
        ctx.stroke();
      }
      ctx.strokeStyle = shade(color, -0.22);
      ctx.lineWidth = 1;
      rr(bx, y + g * 0.04, w, g * 0.92, 3);
      ctx.stroke();
    } else if (place === 2) {
      // hundred-flat: a 10×10 grid square
      const s = g * 0.9;
      const bx = x + (g - s) / 2;
      const by = y + (g - s) / 2;
      ctx.fillStyle = color;
      rr(bx, by, s, s, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 0.75;
      for (let j = 1; j < 10; j++) {
        const t = (s / 10) * j;
        ctx.beginPath();
        ctx.moveTo(bx + t, by);
        ctx.lineTo(bx + t, by + s);
        ctx.moveTo(bx, by + t);
        ctx.lineTo(bx + s, by + t);
        ctx.stroke();
      }
      ctx.strokeStyle = shade(color, -0.22);
      ctx.lineWidth = 1;
      rr(bx, by, s, s, 3);
      ctx.stroke();
    } else {
      // thousand-cube: front + top + side faces
      const s = g * 0.72;
      const d = g * 0.2;
      const fx = x + (g - s - d) / 2;
      const fy = y + (g - s - d) / 2 + d;
      ctx.fillStyle = shade(color, 0.28); // top
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + d, fy - d);
      ctx.lineTo(fx + s + d, fy - d);
      ctx.lineTo(fx + s, fy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(color, -0.18); // right
      ctx.beginPath();
      ctx.moveTo(fx + s, fy);
      ctx.lineTo(fx + s + d, fy - d);
      ctx.lineTo(fx + s + d, fy + s - d);
      ctx.lineTo(fx + s, fy + s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = color; // front
      ctx.fillRect(fx, fy, s, s);
      ctx.strokeStyle = shade(color, -0.25);
      ctx.lineWidth = 1;
      ctx.strokeRect(fx, fy, s, s);
    }
    ctx.restore();
  }

  /* ---- place-value chart + full redraw from state ------------------------- */
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

    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const OK = '#1F8A5B';
    const C_A = '#3F74A6'; // addend A — blue
    const C_B = '#2E8B6F'; // addend B — teal
    const C_R = '#C81E4F'; // the accent = the regroup / carry

    const S = sceneRef.current;
    const { aD, bD, model } = S;
    const nCols = S.cols;

    const rr = (x, y, w, h, rad) => {
      const t = Math.min(rad, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + t, y);
      ctx.arcTo(x + w, y, x + w, y + h, t);
      ctx.arcTo(x + w, y + h, x, y + h, t);
      ctx.arcTo(x, y + h, x, y, t);
      ctx.arcTo(x, y, x + w, y, t);
      ctx.closePath();
    };
    const shade = (hex, amt) => {
      const v = parseInt(hex.slice(1), 16);
      let R = (v >> 16) & 255;
      let G = (v >> 8) & 255;
      let Bc = v & 255;
      const to = amt < 0 ? 0 : 255;
      const f = Math.abs(amt);
      R = Math.round(R + (to - R) * f);
      G = Math.round(G + (to - G) * f);
      Bc = Math.round(Bc + (to - Bc) * f);
      return `rgb(${R},${G},${Bc})`;
    };

    ctx.clearRect(0, 0, W, H);

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    const gs = 26;
    ctx.beginPath();
    for (let x = gs; x < W; x += gs) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, H);
    }
    for (let y = gs; y < H; y += gs) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(W, Math.round(y) + 0.5);
    }
    ctx.stroke();

    /* how many columns to DRAW: the revealed places, plus one more if a carry
       spills into a brand-new place (so the born ten/hundred has a home). */
    const drawn = nCols + (model.topCarry ? 1 : 0);

    const padL = 16;
    const padR = 16;
    const chartTop = 12;
    const chartBot = H - 14;
    const gap = Math.max(8, Math.round(W * 0.015));
    const areaX0 = padL;
    const areaW = W - padL - padR;
    const colW = (areaW - gap * (drawn - 1)) / drawn;

    layoutRef.current = { cols: [] };

    // per-column vertical bands
    const headH = 20;
    const resH = 34;
    const binTop = chartTop + headH + 12;
    const binBot = chartBot - resH;

    for (let k = 0; k < drawn; k++) {
      const p = drawn - 1 - k; // leftmost column = highest place
      const place = PLACES[p];
      const c = model.col[p]; // undefined for the born carry-place (a=b=0)
      const a = c ? c.a : 0;
      const b = c ? c.b : 0;
      const carryIn = c ? c.carryIn : model.topCarry; // born place holds topCarry
      const total = c ? c.total : model.topCarry;
      const digit = c ? c.digit : model.topCarry;
      const carryOut = c ? c.carryOut : 0;
      const x0 = areaX0 + k * (colW + gap);
      const cx = x0 + colW / 2;
      const isFocus = S.focus === p;

      layoutRef.current.cols.push({ x0, x1: x0 + colW, y0: chartTop, y1: chartBot, place: p, a, b, total, digit, carryIn, carryOut });

      /* column card */
      ctx.save();
      ctx.fillStyle = isFocus ? 'rgba(200,30,79,0.05)' : 'rgba(255,255,255,0.55)';
      rr(x0, chartTop, colW, chartBot - chartTop, 10);
      ctx.fill();
      ctx.lineWidth = isFocus ? 2 : 1.1;
      ctx.strokeStyle = isFocus ? C_R : 'rgba(28,43,58,0.14)';
      ctx.stroke();
      ctx.restore();

      /* header pill: place name + ×mult */
      ctx.save();
      ctx.fillStyle = INK_SOFT;
      rr(x0 + 7, chartTop + 7, colW - 14, headH - 4, 6);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${colW < 92 ? 9.5 : 11}px system-ui, sans-serif`;
      ctx.fillText(`${place.name} · ×${commas(place.mult)}`, cx, chartTop + 7 + (headH - 4) / 2 + 0.5);
      ctx.restore();

      /* The combined bin of base-ten blocks.  Each column holds its OWN blocks
         plus any ten CARRIED IN from the right — drawn as a single carmine
         block (never a floating chip and never a duplicate in two columns), so
         the same ten is represented exactly once.  The first ten of any column
         is haloed: those ten bundle and reappear as the one carmine block in
         the NEXT column to the left.  ten of a place = one of the next. */
      const binX = x0 + 8;
      const binW = colW - 16;
      const binH = binBot - binTop;
      let bundleAnchor = { x: cx, y: binTop + 16 };
      let binTopCenter = { x: cx, y: binTop + 16 };
      if (S.showBlocks && total > 0) {
        // ordered blocks: the carried-in ten first, then A, then B, so the ten
        // that bundles is a natural front-of-line group.
        const kinds = [];
        for (let i = 0; i < carryIn; i++) kinds.push('carry');
        for (let i = 0; i < a; i++) kinds.push('a');
        for (let i = 0; i < b; i++) kinds.push('b');
        const nB = kinds.length; // === total

        const perRow = Math.min(5, Math.max(1, nB));
        const rows = Math.ceil(nB / perRow);
        const gsz = Math.max(
          10,
          Math.min(30, (binW - (perRow - 1) * 4) / perRow, (binH - (rows - 1) * 4) / rows)
        );
        const cellX = gsz + 4;
        const cellY = gsz + 4;
        const gridW = perRow * gsz + (perRow - 1) * 4;
        const startX = binX + (binW - gridW) / 2;
        const gridH = rows * gsz + (rows - 1) * 4;
        const startY = binTop + Math.max(0, (binH - gridH) / 2);

        const pos = (i) => {
          const r = Math.floor(i / perRow);
          const cc = i % perRow;
          return { x: startX + cc * cellX, y: startY + r * cellY };
        };
        binTopCenter = { x: pos(0).x + gsz / 2, y: pos(0).y + gsz / 2 };

        // during a regroup animation the bundling ten fades as it "lifts off"
        const animP = animRef.current.p;
        const overflow = total >= 10;
        const fadingCount = overflow && animP > 0 ? 10 : 0;

        for (let i = 0; i < nB; i++) {
          const { x, y } = pos(i);
          const kind = kinds[i];
          const col = kind === 'a' ? C_A : kind === 'b' ? C_B : C_R;
          let alpha = 1;
          if (i < fadingCount) alpha = 1 - Math.min(1, animP * 1.4);
          drawGlyph(ctx, rr, shade, p, x, y, gsz, col, alpha);
        }

        // halo the first ten (the group that becomes one of the next place)
        if (overflow) {
          const first = pos(0);
          const tenth = pos(9);
          const hx0 = Math.min(first.x, tenth.x) - 3;
          const hy0 = first.y - 3;
          const hx1 = Math.max(first.x, tenth.x) + gsz + 3;
          const hy1 = tenth.y + gsz + 3;
          bundleAnchor = { x: (hx0 + hx1) / 2, y: (hy0 + hy1) / 2 };
          ctx.save();
          ctx.globalAlpha = 1 - Math.min(1, animRef.current.p * 1.2);
          ctx.strokeStyle = C_R;
          ctx.lineWidth = 2;
          rr(hx0, hy0, hx1 - hx0, hy1 - hy0, 6);
          ctx.stroke();
          ctx.fillStyle = C_R;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.font = '700 10px system-ui, sans-serif';
          const nextName = PLACES[p + 1] ? PLACES[p + 1].short.replace(/s$/, '') : 'group';
          ctx.fillText(`← ten ${place.short} = one ${nextName}`, (hx0 + hx1) / 2, hy0 - 1);
          ctx.restore();
        }
      } else if (total === 0) {
        // explicit empty-place marker — zeros matter in place value
        ctx.save();
        ctx.strokeStyle = 'rgba(91,107,123,0.4)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.2;
        const s = Math.min(binW * 0.4, binH * 0.4, 24);
        rr(cx - s / 2, (binTop + binBot) / 2 - s / 2, s, s, 4);
        ctx.stroke();
        ctx.restore();
      }

      // stash anchors for the traveling-carry animation
      layoutRef.current.cols[layoutRef.current.cols.length - 1].bundleAnchor = bundleAnchor;
      layoutRef.current.cols[layoutRef.current.cols.length - 1].binTopCenter = binTopCenter;

      /* result: divider + big digit + carry-out note */
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.18)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x0 + 10, binBot + 4);
      ctx.lineTo(x0 + colW - 10, binBot + 4);
      ctx.stroke();

      const digFs = Math.min(30, Math.round(colW * 0.34));
      ctx.fillStyle = INK;
      ctx.font = `700 ${digFs}px ui-monospace, "SF Mono", Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(digit), cx, binBot + 4 + resH / 2 + 1);

      if (carryOut === 1) {
        ctx.fillStyle = C_R;
        ctx.font = '700 10px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('carry 1 ↖', x0 + 8, binBot + 4 + resH / 2 + 1);
      }
      ctx.restore();
    }

    /* traveling carry token during the regroup animation (ones→tens etc.) */
    const animP = animRef.current.p;
    if (animP > 0 && animP < 1) {
      // find the rightmost overflowing revealed column and its left neighbour
      const colsL = layoutRef.current.cols;
      let srcIdx = -1;
      for (let i = 0; i < colsL.length; i++) {
        const cc = colsL[i];
        if (cc.place < nCols && cc.total >= 10) srcIdx = i; // reading L→R, keep the rightmost
      }
      if (srcIdx > 0) {
        const src = colsL[srcIdx].bundleAnchor;
        const dst = colsL[srcIdx - 1].binTopCenter;
        const e = animP < 0.5 ? 2 * animP * animP : 1 - Math.pow(-2 * animP + 2, 2) / 2; // easeInOut
        const tx = src.x + (dst.x - src.x) * e;
        const ty = src.y + (dst.y - src.y) * e - Math.sin(Math.PI * e) * 22; // slight arc
        const rgz = 22;
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, e + 0.1));
        drawGlyph(ctx, rr, shade, colsL[srcIdx].place + 1, tx - rgz / 2, ty - rgz / 2, rgz, C_R, 1);
        ctx.restore();
      }
    }

    /* hover caption */
    const hp = hoverRef.current;
    if (hp != null) {
      const cc = layoutRef.current.cols.find((c) => c.place === hp);
      if (cc && cc.place < nCols) {
        const place = PLACES[hp];
        let msg;
        if (cc.total >= 10) {
          msg = `${cc.a} + ${cc.b}${cc.carryIn ? ' + 1 carried' : ''} = ${cc.total} ${place.short} → write ${cc.digit}, carry 1`;
        } else {
          msg = `${cc.a} + ${cc.b}${cc.carryIn ? ' + 1 carried' : ''} = ${cc.total} ${place.short}`;
        }
        ctx.save();
        ctx.font = '600 11.5px ui-monospace, Menlo, monospace';
        const tw = ctx.measureText(msg).width;
        const bx = Math.max(8, Math.min(W - tw - 20, cc.x0));
        ctx.fillStyle = 'rgba(251,251,248,0.95)';
        rr(bx, 8, tw + 14, 22, 5);
        ctx.fill();
        ctx.strokeStyle = shade(C_R, 0.2);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = shade(C_R, -0.15);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(msg, bx + 7, 19);
        ctx.restore();
      }
    }

    /* CALIBRATED — a success overlay drawn last, so it reads cleanly over the
       full-bleed chart: a faint green wash plus a solid centred badge. */
    if (S._cal) {
      ctx.save();
      ctx.fillStyle = 'rgba(31,138,91,0.07)';
      ctx.fillRect(0, 0, W, H);
      ctx.translate(W / 2, H / 2);
      ctx.rotate(-0.04);
      ctx.fillStyle = '#FBFBF8';
      ctx.shadowColor = 'rgba(28,43,58,0.18)';
      ctx.shadowBlur = 10;
      rr(-78, -18, 156, 36, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = OK;
      ctx.lineWidth = 2;
      rr(-78, -18, 156, 36, 8);
      ctx.stroke();
      ctx.fillStyle = OK;
      ctx.font = '700 15px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓ CALIBRATED', 0, 0.5);
      ctx.restore();
    }
  }, []);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [aDigits, bDigits, step, problem, answerDigits, showBlocks, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* pose a calibration problem on first entering the calib step */
  useEffect(() => {
    if (current.calib && problem == null) {
      setProblem(makeProblem(null));
      setAnswerDigits([0, 0, 0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* auto-play the regroup once when arriving at the regroup step */
  useEffect(() => {
    if (step === 2 && regroups > 0) {
      const reduce =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduce) {
        const id = setTimeout(() => setPlaying(true), 380);
        return () => clearTimeout(id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the regroup animation — time-based, opt-in, reduced-motion aware */
  useEffect(() => {
    if (!playing) {
      animRef.current.p = 0;
      draw();
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPlaying(false);
      return;
    }
    let raf;
    let start = null;
    const dur = 1100;
    const loop = (now) => {
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / dur);
      animRef.current.p = t;
      draw();
      if (t < 1) raf = requestAnimationFrame(loop);
      else {
        animRef.current.p = 0;
        setPlaying(false);
      }
    };
    raf = requestAnimationFrame(loop);
    // Safety net: requestAnimationFrame is paused in a hidden/background tab, so
    // guarantee the animation flag clears (and the button re-enables) even if
    // no frames ever fire.
    const safety = setTimeout(() => {
      animRef.current.p = 0;
      setPlaying(false);
    }, dur + 600);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
    };
  }, [playing, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const setADigit = (i, v) => {
    setADigits((prev) => {
      const n = prev.slice();
      n[i] = parseInt(v, 10);
      return n;
    });
  };
  const setBDigit = (i, v) => {
    setBDigits((prev) => {
      const n = prev.slice();
      n[i] = parseInt(v, 10);
      return n;
    });
  };
  const setAnsDigit = (i, v) => {
    setAnswerDigits((prev) => {
      const n = prev.slice();
      n[i] = parseInt(v, 10);
      return n;
    });
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const cols2 = layoutRef.current.cols || [];
    let hit = null;
    for (const c of cols2) {
      if (cssX >= c.x0 && cssX <= c.x1 && cssY >= c.y0 && cssY <= c.y1) {
        hit = c.place;
        break;
      }
    }
    if (hit !== hoverRef.current) {
      hoverRef.current = hit;
      draw();
    }
  };
  const onPointerLeave = () => {
    if (hoverRef.current != null) {
      hoverRef.current = null;
      draw();
    }
  };

  const resetDials = () => {
    if (calib) {
      setAnswerDigits([0, 0, 0]);
    } else {
      setADigits(START_A.slice());
      setBDigits(START_B.slice());
    }
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

  const ps = partialSums(liveA, liveB, cols);
  const spoken = calib
    ? `Add ${problem ? problem.A : ''} plus ${problem ? problem.B : ''}. Set the answer dials to the total.`
    : `${A} plus ${B} equals ${sum}. ${regroups === 0 ? 'No regrouping needed.' : regroups === 1 ? 'One regroup.' : regroups + ' regroups.'}`;

  const regroupText =
    regroups === 0
      ? 'none — every place stays under ten'
      : regroups === 1
      ? '1 — one place reaches ten and carries'
      : `${regroups} — that many places carry`;

  return (
    <div className="pvlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Place Value Strategies: Adding by Breaking Numbers Apart</h1>
        <p className="lede">
          To add big numbers, break them into <em>places</em> and add like with like — ones to ones, tens
          to tens. Whenever a place fills up to <em>ten</em>, bundle those ten into a single block of the
          next place and <span className="mono">carry</span> it left. Unlock the places one at a time and
          watch “carry the 1” become something you can see.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <div className="eq-wrap">
              <VerticalSum aD={liveA} bD={liveB} cols={cols} />
            </div>
            <div className="eq-side">
              <p className="eq-partial mono">
                {ps.groups.length ? ps.groups.join(' + ') : '0'}
                <br />
                <span className="eq-dim">= {ps.totals.length ? ps.totals.join(' + ') : '0'} = </span>
                <span className="eq-sum">{commas(sum)}</span>
              </p>
              <div className="legend" aria-hidden="true">
                <span className="lg"><i className="sw swa" /> {commas(A)}</span>
                <span className="lg"><i className="sw swb" /> {commas(B)}</span>
                <span className="lg"><i className="sw swr" /> carry</span>
              </div>
            </div>
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
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — the sum is ${problem ? problem.sum : ''}.` : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Sum</span>
              <span className="fact-v mono big">{commas(sum)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Break apart</span>
              <span className="fact-v mono">
                ({expandedOf(liveA, cols)}) + ({expandedOf(liveB, cols)})
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Partial sums</span>
              <span className="fact-v mono">{ps.totals.length ? ps.totals.join(' + ') : '0'} = {commas(sum)}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Regroups</span>
              <span className="fact-v">{regroupText}</span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (playing ? ' on' : '')}
              onClick={() => setPlaying(true)}
              disabled={regroups === 0 || playing}
            >
              {playing ? 'Regrouping…' : 'Regroup ▶'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setShowBlocks((s) => !s)}
              aria-pressed={showBlocks}
            >
              {showBlocks ? 'Hide blocks' : 'Show blocks'}
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

          {/* dials — addends in the lesson, the answer in calibration */}
          {!calib ? (
            <div className="dials">
              {[{ label: 'Addend A', d: liveA, set: setADigit, cls: 'a' }, { label: 'Addend B', d: liveB, set: setBDigit, cls: 'b' }].map((row) => (
                <div className={'addend ' + row.cls} key={row.label}>
                  <div className="addend-head">
                    <span className="addend-name">{row.label}</span>
                    <span className="addend-val mono">{commas(valueOf(row.d, cols))}</span>
                  </div>
                  <div className="digit-row">
                    {[2, 1, 0].map((i) => {
                      const place = PLACES[i];
                      const unlocked = step >= place.unlock;
                      if (i >= cols && !unlocked) return null;
                      return (
                        <label className={'digit' + (unlocked ? '' : ' locked')} key={i}>
                          <span className="digit-k">{place.short}</span>
                          <input
                            type="range"
                            min={0}
                            max={9}
                            step={1}
                            value={row.d[i]}
                            disabled={!unlocked}
                            aria-label={`${row.label} — ${place.short} digit`}
                            onChange={(e) => row.set(i, e.target.value)}
                            className={'rng ' + row.cls}
                          />
                          <output className="digit-v">{unlocked ? row.d[i] : '🔒'}</output>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dials">
              <div className="answer-dials">
                {[2, 1, 0].map((i) => {
                  const place = PLACES[i];
                  return (
                    <label className="digit" key={i}>
                      <span className="digit-k">{place.short}</span>
                      <input
                        type="range"
                        min={0}
                        max={9}
                        step={1}
                        value={answerDigits[i]}
                        aria-label={`Answer — ${place.short} digit`}
                        onChange={(e) => setAnsDigit(i, e.target.value)}
                        className="rng ans"
                      />
                      <output className="digit-v ans-v">{answerDigits[i]}</output>
                    </label>
                  );
                })}
              </div>
              <p className="answer-read mono">
                your answer: <strong>{commas(valueOf(answerDigits, 3))}</strong>
              </p>
            </div>
          )}

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

          {current.calib && problem != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">Add these two numbers</span>
                <span className="target-sum mono">
                  {commas(problem.A)} <span className="tplus">+</span> {commas(problem.B)}
                </span>
                {calibrated && <span className="target-num mono">= {commas(problem.sum)}</span>}
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: ansPct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">places right&nbsp;{ansCorrect}/3</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">you built {commas(valueOf(answerDigits, 3))}</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setProblem(makeProblem(problem));
                  setAnswerDigits([0, 0, 0]);
                }}
              >
                New problem
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
                  setProblem(null);
                  setAnswerDigits([0, 0, 0]);
                  setShowBlocks(true);
                  setADigits(START_A.slice());
                  setBDigits(START_B.slice());
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">add each place · bundle ten → carry one</span> &nbsp;·&nbsp; place-value
        strategies for multi-digit addition (CCSS 1.NBT.C.4, 2.NBT.B.5–7, 4.NBT.B.4).
      </footer>

      <style jsx>{`
        .pvlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --addA: #3f74a6;
          --addB: #2e8b6f;
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
          font-size: clamp(24px, 3.6vw, 32px);
          margin: 0 0 6px;
          line-height: 1.15;
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
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 10px;
          padding: 4px 4px 0;
        }
        .eq-wrap {
          display: flex;
          align-items: center;
        }
        .vsum {
          display: inline-flex;
          flex-direction: column;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 24px;
          font-weight: 700;
          line-height: 1.12;
          letter-spacing: 0.06em;
        }
        .vsum :global(.vrow) {
          white-space: pre;
          text-align: right;
        }
        .vsum :global(.vcarry) {
          font-size: 13px;
          height: 15px;
          line-height: 15px;
          color: var(--curve);
        }
        .vsum :global(.vcarry .cyd) {
          color: var(--curve);
        }
        .vsum :global(.vop) {
          float: left;
          color: var(--ink-soft);
          font-weight: 600;
        }
        .vsum :global(.vrule) {
          border-top: 2px solid var(--ink);
          margin: 3px 0;
        }
        .vsum :global(.vtot) {
          color: var(--curve);
        }
        .eq-side {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-end;
        }
        .eq-partial {
          margin: 0;
          font-size: 12.5px;
          color: var(--ink);
          text-align: right;
          line-height: 1.5;
        }
        .eq-dim {
          color: var(--ink-soft);
        }
        .eq-sum {
          color: var(--curve);
          font-weight: 700;
        }
        .legend {
          display: flex;
          gap: 12px;
          font-size: 11.5px;
          color: var(--ink-soft);
          font-family: var(--mono);
        }
        .lg {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .sw {
          width: 11px;
          height: 11px;
          border-radius: 3px;
          display: inline-block;
        }
        .swa {
          background: var(--addA);
        }
        .swb {
          background: var(--addB);
        }
        .swr {
          background: var(--curve);
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 2;
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
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin: 14px 4px 4px;
        }
        @media (max-width: 480px) {
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
          font-size: 14px;
          font-variant-numeric: tabular-nums;
        }
        .fact-v.big {
          font-size: 22px;
          font-weight: 700;
          color: var(--ink);
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
          margin-bottom: 4px;
        }
        .addend {
          border: 1px solid rgba(28, 43, 58, 0.12);
          border-radius: 10px;
          padding: 8px 10px 10px;
          background: var(--paper);
        }
        .addend.a {
          border-left: 4px solid var(--addA);
        }
        .addend.b {
          border-left: 4px solid var(--addB);
        }
        .addend-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }
        .addend-name {
          font-family: var(--serif);
          font-weight: 600;
          font-size: 14px;
        }
        .addend.a .addend-val {
          color: var(--addA);
          font-weight: 700;
        }
        .addend.b .addend-val {
          color: var(--addB);
          font-weight: 700;
        }
        .digit-row,
        .answer-dials {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .digit {
          display: grid;
          grid-template-rows: auto auto auto;
          justify-items: center;
          gap: 3px;
        }
        .digit.locked {
          opacity: 0.45;
        }
        .digit-k {
          font-size: 10px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .rng {
          width: 100%;
          cursor: pointer;
        }
        .rng.a {
          accent-color: var(--addA);
        }
        .rng.b {
          accent-color: var(--addB);
        }
        .rng.ans {
          accent-color: var(--curve);
        }
        .rng:disabled {
          cursor: not-allowed;
        }
        .digit-v {
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 16px;
          font-weight: 700;
        }
        .answer-dials {
          border: 1px solid rgba(200, 30, 79, 0.25);
          border-radius: 10px;
          padding: 10px;
          background: rgba(200, 30, 79, 0.03);
        }
        .ans-v {
          color: var(--curve);
        }
        .answer-read {
          margin: 8px 2px 0;
          font-size: 13px;
          color: var(--ink-soft);
        }
        .answer-read strong {
          color: var(--curve);
          font-size: 15px;
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
        .target-card {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 10px 12px;
          border: 1px solid rgba(28, 43, 58, 0.16);
          border-radius: 8px;
          background: rgba(63, 116, 166, 0.06);
        }
        .target-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .target-sum {
          font-size: 22px;
          font-weight: 700;
          color: var(--ink);
        }
        .tplus {
          color: var(--ink-soft);
        }
        .target-num {
          font-size: 15px;
          color: var(--ok);
          font-weight: 700;
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
        :global(.pvlab) :focus-visible {
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
