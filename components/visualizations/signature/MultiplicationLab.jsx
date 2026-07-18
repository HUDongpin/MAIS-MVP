'use client';

/* ============================================================================
   MultiplicationLab — an interactive "bench" for whole-number multiplication,
   taught through the ARRAY / AREA MODEL:  a × b  is a rectangle of a rows and
   b columns of unit squares, and the product is the number of squares.

   Built for MAIS (math AI system, www.mais.ac), K-12 (grades ~2–4;
   CCSS 3.OA.A.1 equal groups & arrays, 3.OA.B.5 commutative & distributive
   properties, 3.MD.C.7 area as multiplication).

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   The signature centerpiece is the BREAK-APART (distributive) model — the
   multiplication analogue of the ellipse "string" or the line "slope triangle":
   a split line cuts the rectangle into two smaller rectangles, so a student
   SEES that
        a × (b₁ + b₂)  =  a × b₁  +  a × b₂
   which is exactly how paper multiplication of bigger numbers works.

   The calibration capstone is a CONSTRUCTION goal (not a curve match): build a
   rectangle with a given target area. Because many rectangles share an area,
   this quietly teaches factor pairs.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/MultiplicationLab.jsx
     2. Import and render it:
          import MultiplicationLab from './MultiplicationLab';
          export default function Page() { return <MultiplicationLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, split, step).
     MODEL  — the math (product, sum, split) is pure; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Layout. The array is drawn as true unit SQUARES (one across = one up — the
   whole point of the area model), centered in the stage. Rather than a fixed
   coordinate window (which would jam a small 3×4 into a corner of a big empty
   12×12 grid), the cell size auto-fits the current rectangle but is capped, so
   small arrays grow with the product yet stay balanced, and a 12×12 fills the
   stage. Growth is also carried by the square COUNT — which, for the area
   model, literally IS the product. (Same philosophy as the cube lab.)
   ------------------------------------------------------------------------- */
const MAXF = 12; // factors run 1..12 (the classic times-table grid, 12×12=144)
const STAGE_PAD = 44; // px reserved around the array for brackets / skip counts

// The shared world→screen layout, used by BOTH the renderer and the pointer
// hit-test so they never disagree. `commute` sizes the cell for the larger of
// the two factors, so the transposed ghost (b×a) also fits on that step.
function computeLayout(W, H, A, B, commute) {
  const fitW = Math.max(10, W - 2 * STAGE_PAD);
  const fitH = Math.max(10, H - 2 * STAGE_PAD);
  const cellMax = Math.min(W, H) / 7; // keep 1×1 from ballooning; caps the scale
  const spanW = commute ? Math.max(A, B) : B;
  const spanH = commute ? Math.max(A, B) : A;
  const cell = Math.min(fitW / spanW, fitH / spanH, cellMax);
  const ox = (W - B * cell) / 2; // screen x of the array's left edge
  const oy = (H - A * cell) / 2; // screen y of the array's top edge
  return { cell, ox, oy };
}

/* ---------------------------------------------------------------------------
   Parameters. Each dial names what it drives, its range/step, and the lesson
   step at which it unlocks. Multiplication has two factors plus a break point
   for the distributive step.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'a', label: 'a', min: 1, max: MAXF, step: 1, unlock: 1, role: 'rows · how many equal groups' },
  { key: 'b', label: 'b', min: 1, max: MAXF, step: 1, unlock: 2, role: 'columns · how many in each row' },
  { key: 'split', label: 'b₁', min: 1, max: MAXF - 1, step: 1, unlock: 5, role: 'break point · b = b₁ + b₂' },
];
const START = { a: 3, b: 4, split: 2 };

// Named step indices (0-based) so the renderer and effects stay readable.
const ROWS_STEP = 1;
const COLS_STEP = 2;
const COMMUTE_STEP = 3;
const AREA_STEP = 4;
const DIST_STEP = 5;
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   Lesson. One idea per step; the dial unlocks with the step; the reveal lives
   in `feedback` (shown after answering); distractors are real student
   misconceptions (add-instead-of-multiply, off-by-a-group, order-matters).
   Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet multiplication',
    body:
      'Multiplication is a fast way to add equal groups. We picture a × b as a rectangle of unit ' +
      'squares: a rows stacked up, with b squares in every row. Right now it is 3 × 4 — three rows ' +
      'of four. Count the squares and you get 12.',
    q: 'What does 3 × 4 mean?',
    choices: ['3 equal groups with 4 in each group', '3 added to 4', '3 and 4 placed side by side'],
    answer: 0,
    feedback:
      '3 × 4 means 3 equal groups of 4, that is 4 + 4 + 4 = 12. The first number is how many rows ' +
      '(groups); the second is how many are in each row. Adding (3 + 4 = 7) is a different ' +
      'operation — multiplying combines equal groups.',
  },
  {
    title: 'a — the number of rows',
    body:
      'The a dial is live. It sets how many rows there are — how many equal groups. Each new row ' +
      'adds another b squares, so multiplying is just repeated addition. The carmine numbers on the ' +
      'left skip-count the running total, one row at a time.',
    q: 'Each row still holds b = 4. Change a from 3 to 5. How many squares now?',
    choices: ['20 — five 4s: 4 + 4 + 4 + 4 + 4', '12 — it stays the same', '9 — you add 5 and 4'],
    answer: 0,
    feedback:
      '5 × 4 = 4 + 4 + 4 + 4 + 4 = 20. Adding one row adds b = 4 squares, so the total skip-counts ' +
      '4, 8, 12, 16, 20. That is why a × b is the same as adding b to itself a times.',
  },
  {
    title: 'b — the number in each row',
    body:
      'Now the b dial unlocks. It sets how many squares sit in each row — the length of every row. ' +
      'Changing b stretches the rectangle sideways; the bracket underneath counts the columns.',
    q: 'A rectangle has 3 rows with 6 squares in each row. What is the product?',
    choices: ['18 — three rows of six', '9 — three plus six', '36 — six sixes'],
    answer: 0,
    feedback:
      '3 × 6 = 18: three rows, six in each, 6 + 6 + 6 = 18. a counts the rows and b counts what is ' +
      'in each row, so the number of squares in the rectangle is the product a × b.',
  },
  {
    title: 'Order does not matter',
    body:
      'Turn the rectangle on its side and the squares do not change. The dashed shape is b × a — the ' +
      'same rectangle rotated a quarter-turn. Both hold the same number of squares, so a × b always ' +
      'equals b × a. Try the Flip button to swap the factors.',
    q: 'You know 3 × 8 = 24. Without recounting, what is 8 × 3?',
    choices: ['24 — the order of the factors does not change the product', '11', 'It could be different'],
    answer: 0,
    feedback:
      '8 × 3 = 24 as well. Swapping the factors just rotates the rectangle; the squares are the same, ' +
      'only rearranged. This is the commutative property, and it nearly halves the number of ' +
      'multiplication facts you have to memorize.',
  },
  {
    title: 'The area model',
    body:
      'The product is exactly the number of unit squares — the AREA of the rectangle. A rectangle a ' +
      'units tall and b units wide covers a × b unit squares. Press "Count the squares" to add them ' +
      'up one by one.',
    q: 'A rectangle is 4 units tall and 5 units wide. What is its area?',
    choices: ['20 square units', '18 square units', '9 square units'],
    answer: 0,
    feedback:
      'Area = height × width = 4 × 5 = 20 square units. Multiplication and rectangle area are the ' +
      'same idea, which is exactly why a product can be seen as a filled rectangle.',
  },
  {
    title: 'Break it apart',
    body:
      'Here is the big idea. Split the columns into two chunks and the whole is the sum of the parts: ' +
      'a × (b₁ + b₂) = a × b₁ + a × b₂. The split line cuts the rectangle into two smaller rectangles ' +
      'whose areas add back to the total. This is how we multiply larger numbers.',
    q: 'Find 6 × 8 by breaking 8 into 5 + 3. Which sum equals it?',
    choices: [
      '6×5 + 6×3 = 30 + 18 = 48',
      '6×5 + 3 = 33',
      '6 + 5 + 3 = 14',
    ],
    answer: 0,
    feedback:
      '6 × 8 = 6 × (5 + 3) = 6×5 + 6×3 = 30 + 18 = 48. Splitting one factor, multiplying each part, ' +
      'then adding is the distributive property. With bigger numbers you split into tens and ones — ' +
      'e.g. 6 × 14 = 6×10 + 6×4 = 60 + 24 = 84 — which is precisely how paper multiplication works.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. You are given a target area. Build a rectangle whose squares add up to it by ' +
      'tuning a and b — that means finding two factors whose product is the target. Many rectangles ' +
      'can share the same area, so any correct factor pair calibrates. Press "New target" for a fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   MODEL — pure whole-number arithmetic. Every quantity here is an exact integer
   (no floating-point error), which is exactly what a K-12 lab must guarantee.
   ------------------------------------------------------------------------- */
const clampSplit = (split, b) => Math.min(Math.max(1, Math.round(split)), Math.max(1, b - 1));

/* ---------------------------------------------------------------------------
   Calibration — a CONSTRUCTION goal (hit a target area), not a curve match.
   Targets are products that have several factor pairs within 1..12, so the
   student can discover more than one rectangle. Meter is a simple linear
   closeness to the goal; CALIBRATED only on an exact whole-number match.
   ------------------------------------------------------------------------- */
const TARGETS = [12, 16, 18, 20, 24, 30, 36, 40, 48, 60, 72];
const areaPercent = (cur, P) => Math.max(0, Math.min(100, 100 * (1 - Math.abs(cur - P) / P)));

function makeTarget(prev) {
  let P;
  do {
    P = TARGETS[Math.floor(Math.random() * TARGETS.length)];
  } while (prev && P === prev);
  return P;
}

// All factor pairs (a ≤ b) of P with both factors in 1..MAXF — used in the
// success message so the student sees the other rectangles with the same area.
function factorPairs(P) {
  const out = [];
  for (let a = 1; a <= MAXF; a++) {
    if (P % a === 0) {
      const b = P / a;
      if (b <= MAXF && a <= b) out.push([a, b]);
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Small formatting helpers — a proper minus sign (there are none here since
   everything is positive, but keep the house convention) and a repeated-sum
   string that stays short for large a.
   ------------------------------------------------------------------------- */
function repeatedAddition(a, b) {
  const N = a * b;
  if (a <= 6) return `${Array(a).fill(b).join(' + ')} = ${N}`;
  return `${b} + ${b} + … + ${b}  (${a} terms) = ${N}`;
}
const units = (n) => (n === 1 ? 'square unit' : 'square units');

/* The one-line relation shown under the big equation, chosen to match whatever
   the current step is teaching. */
function subEquation(step, a, b, split) {
  const N = a * b;
  if (step <= ROWS_STEP) return repeatedAddition(a, b);
  if (step === COLS_STEP) return `${a} rows × ${b} in each row = ${N}`;
  if (step === COMMUTE_STEP) return `${a} × ${b} = ${b} × ${a} = ${N}`;
  if (step === AREA_STEP) return `area = ${N} square units`;
  if (step === DIST_STEP) {
    const b1 = clampSplit(split, b);
    const b2 = b - b1;
    return `${a} × (${b1} + ${b2}) = ${a * b1} + ${a * b2} = ${N}`;
  }
  return `${a} × ${b} = ${N} square units`;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function MultiplicationLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [split, setSplit] = useState(START.split);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [counting, setCounting] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // {c, r} unit cell under the pointer, or null
  const countRef = useRef(null); // # squares currently "counted" (animation), or null
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const N = a * b;
  const b1 = clampSplit(split, b);
  const b2 = b - b1;

  // Snapshot everything the renderer needs so draw() (a stable callback) never
  // reads stale values.
  sceneRef.current = { a, b, split, step, calib, N };

  const pct = target ? areaPercent(N, target) : 0;
  const calibrated = target ? N === target : false;

  /* ---- centered auto-fit layout + full redraw from state ------------------ */
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

    const S = sceneRef.current;
    const A = S.a;
    const B = S.b;
    const bb1 = clampSplit(S.split, B);
    const bb2 = B - bb1;
    const distributive = S.step === DIST_STEP && B >= 2 && !S.calib;
    const commute = S.step === COMMUTE_STEP && !S.calib;

    const CARM = '#C81E4F';
    const INK = '#1C2B3A';

    const { cell, ox, oy } = computeLayout(W, H, A, B, commute);
    // array coords: column c (0..B) left→right, row r (0..A) bottom→top
    const px = (c) => ox + c * cell; // screen x of column line c
    const py = (r) => oy + (A - r) * cell; // screen y of row line r (y points up)

    ctx.clearRect(0, 0, W, H);

    /* quadrille paper — a faint grid aligned to the array cells, extended to
       fill the whole stage so the array sits on graph paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.7)';
    ctx.beginPath();
    for (let k = Math.floor(-ox / cell); k <= Math.ceil((W - ox) / cell); k++) {
      const X = Math.round(ox + k * cell) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    for (let k = Math.floor(-oy / cell); k <= Math.ceil((H - oy) / cell); k++) {
      const Y = Math.round(oy + k * cell) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    const fillCell = (c, r, color) => {
      // c: column 0-based from left; r: row 0-based from bottom
      ctx.fillStyle = color;
      ctx.fillRect(px(c), py(r + 1), cell, cell);
    };

    /* ---- fill the rectangle body (neutral blue; carmine is saved for the
            idea being taught, per the one-accent discipline) ---------------- */
    if (distributive) {
      ctx.fillStyle = 'rgba(199,216,228,0.85)'; // left part  (a × b₁)
      ctx.fillRect(px(0), py(A), bb1 * cell, A * cell);
      ctx.fillStyle = 'rgba(200,30,79,0.12)'; //   right part (a × b₂)
      ctx.fillRect(px(bb1), py(A), bb2 * cell, A * cell);
    } else {
      ctx.fillStyle = 'rgba(199,216,228,0.5)';
      ctx.fillRect(px(0), py(A), B * cell, A * cell);
    }

    /* counted squares (animation / area step) — carmine wash, in reading order */
    const counted = countRef.current;
    if (counted != null) {
      for (let i = 0; i < counted && i < A * B; i++) {
        const rr = Math.floor(i / B); // row from the top
        const cc = i % B;
        fillCell(cc, A - 1 - rr, 'rgba(200,30,79,0.26)');
      }
    }

    /* hovered square highlight */
    const hov = hoverRef.current;
    if (hov && hov.c >= 0 && hov.c < B && hov.r >= 0 && hov.r < A) {
      fillCell(hov.c, hov.r, 'rgba(200,30,79,0.33)');
    }

    /* unit grid inside the rectangle so the squares are countable */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(120,150,175,0.55)';
    ctx.beginPath();
    for (let i = 0; i <= B; i++) {
      const X = Math.round(px(i)) + 0.5;
      ctx.moveTo(X, py(A));
      ctx.lineTo(X, py(0));
    }
    for (let j = 0; j <= A; j++) {
      const Y = Math.round(py(j)) + 0.5;
      ctx.moveTo(px(0), Y);
      ctx.lineTo(px(B), Y);
    }
    ctx.stroke();

    /* ---- reusable label chip (paper-white background, dark text) ----------- */
    const chip = (text, cx, cy, align, color) => {
      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(text).width;
      let bx = cx;
      if (align === 'center') bx = cx - tw / 2;
      else if (align === 'right') bx = cx - tw;
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(bx - 3, cy - 8, tw + 6, 16);
      ctx.fillStyle = color || INK;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, cy);
    };

    /* a small bracket under the array: a bar with end ticks + a centered label */
    const hBracket = (ca, cb, yScreen, tick, label) => {
      ctx.save();
      ctx.strokeStyle = CARM;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(px(ca), yScreen);
      ctx.lineTo(px(cb), yScreen);
      ctx.moveTo(px(ca), yScreen);
      ctx.lineTo(px(ca), yScreen - tick);
      ctx.moveTo(px(cb), yScreen);
      ctx.lineTo(px(cb), yScreen - tick);
      ctx.stroke();
      ctx.restore();
      chip(label, (px(ca) + px(cb)) / 2, yScreen + 14, 'center', CARM);
    };

    /* ---- STEP 3 centerpiece: the transpose ghost (b × a), dashed carmine,
            centered on the same point so the two share their squares -------- */
    if (commute && A !== B) {
      const gW = A * cell; // b×a has a columns → width a·cell
      const gH = B * cell; //                 → height b·cell
      const gox = (W - gW) / 2;
      const goy = (H - gH) / 2;
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = CARM;
      ctx.setLineDash([7, 5]);
      ctx.strokeRect(gox, goy, gW, gH);
      ctx.restore();
      chip(`${B} × ${A}`, gox + gW / 2, goy - 12, 'center', CARM);
    }

    /* ---- the rectangle outline — the mathematical object, one carmine accent */
    ctx.save();
    ctx.lineWidth = 2.75;
    ctx.strokeStyle = CARM;
    ctx.strokeRect(px(0) + 0.5, py(A) + 0.5, B * cell - 1, A * cell - 1);
    ctx.restore();

    /* ---- STEP 5: the split line + partition brackets ----------------------- */
    if (distributive) {
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = CARM;
      ctx.beginPath();
      ctx.moveTo(Math.round(px(bb1)) + 0.5, py(A));
      ctx.lineTo(Math.round(px(bb1)) + 0.5, py(0));
      ctx.stroke();
      ctx.restore();
      hBracket(0, bb1, py(0) + 18, 6, String(bb1));
      hBracket(bb1, B, py(0) + 34, 6, String(bb2));
    }

    /* ---- STEP 1: skip-count running totals down the left ------------------- */
    if (S.step === ROWS_STEP && !S.calib) {
      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
      for (let r = 1; r <= A; r++) {
        const val = String(r * B);
        const rx = Math.max(px(0) - 8, ctx.measureText(val).width + 6);
        chip(val, rx, py(r - 0.5), 'right', CARM);
      }
    }

    /* ---- STEP 2: a bracket under the columns ------------------------------- */
    if (S.step === COLS_STEP && !S.calib) {
      hBracket(0, B, py(0) + 20, 7, `${B} columns`);
    }

    /* ---- STEP 3: label for the solid rectangle --------------------------- */
    if (commute) {
      chip(`${A} × ${B}`, px(B / 2), py(A) - 12, 'center', CARM);
    }

    /* ---- hover readout: which square, and its count number ---------------- */
    if (hov && hov.c >= 0 && hov.c < B && hov.r >= 0 && hov.r < A) {
      const idx = (A - 1 - hov.r) * B + hov.c + 1; // reading order, 1-based
      chip(`square ${idx} of ${A * B}`, px(hov.c + 0.5), py(hov.r + 0.5), 'center', INK);
    }

    /* ---- top-left readout box: the taught relation, tied to the picture ---- */
    let read = null;
    if (S.calib) read = target ? `your area = ${A * B}   ·   target = ${target}` : null;
    else if (S.step <= ROWS_STEP) read = repeatedAddition(A, B);
    else if (S.step === COLS_STEP) read = `${A} × ${B} = ${A * B}`;
    else if (S.step === COMMUTE_STEP) read = `${A} × ${B} = ${B} × ${A} = ${A * B}`;
    else if (S.step === AREA_STEP) {
      const shown = counted != null ? counted : A * B;
      read = `area = ${shown} square unit${shown === 1 ? '' : 's'}`;
    } else if (distributive) {
      read = `${A} × (${bb1} + ${bb2}) = ${A * bb1} + ${A * bb2} = ${A * B}`;
    }
    if (read) {
      ctx.save();
      ctx.font = '600 12.5px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(read).width;
      ctx.fillStyle = 'rgba(251,251,248,0.94)';
      ctx.fillRect(10, 10, tw + 14, 22);
      ctx.strokeStyle = 'rgba(200,30,79,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(10.5, 10.5, tw + 13, 21);
      ctx.fillStyle = CARM;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(read, 17, 22);
      ctx.restore();
    }
  }, [target]);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [a, b, split, step, target, counting, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* keep the split valid whenever b changes (b₁ must stay in 1..b−1) */
  useEffect(() => {
    setSplit((s) => Math.min(Math.max(1, s), Math.max(1, b - 1)));
  }, [b]);

  /* hand a target to the calibration step, and reset to a 1×1 so it starts
     un-matched (a construction challenge, like the cube lab) */
  useEffect(() => {
    if (current.calib) {
      if (!target) setTarget(makeTarget(null));
      setA(1);
      setB(1);
      countRef.current = null;
      setCounting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the area step auto-runs the "count the squares" sweep the first time */
  useEffect(() => {
    if (step === AREA_STEP) setCounting(true);
  }, [step]);

  /* the count sweep — time-based (dt), opt-in, respects reduced motion */
  useEffect(() => {
    if (!counting) return;
    const total = a * b;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      countRef.current = total; // no animation — show the full count at once
      draw();
      setCounting(false);
      return;
    }
    let raf;
    let start = null;
    const DURATION = Math.min(2600, Math.max(700, total * 70));
    const loop = (now) => {
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      countRef.current = Math.round(t * total);
      draw();
      if (t < 1) raf = requestAnimationFrame(loop);
      else setCounting(false);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [counting, a, b, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'a') setA(v);
    else if (key === 'b') setB(v);
    else setSplit(v);
    countRef.current = null; // a change invalidates the running count
    if (counting) setCounting(false);
  };

  const flip = () => {
    setA(b);
    setB(a);
    countRef.current = null;
    if (counting) setCounting(false);
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const commute = step === COMMUTE_STEP && !calib;
    const { cell, ox, oy } = computeLayout(rect.width, rect.height, a, b, commute);
    const c = Math.floor((mx - ox) / cell);
    const r = Math.floor((oy + a * cell - my) / cell); // rows counted from the bottom
    const inside = c >= 0 && c < b && r >= 0 && r < a;
    hoverRef.current = inside ? { c, r } : null;
    draw();
  };
  const onPointerLeave = () => {
    hoverRef.current = null;
    draw();
  };

  const resetDials = () => {
    setA(START.a);
    setB(START.b);
    setSplit(START.split);
    countRef.current = null;
    if (counting) setCounting(false);
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
    `Multiplication array: ${a} row${a === 1 ? '' : 's'} of ${b}. ` +
    `${a} times ${b} equals ${N}.` +
    (calib && target ? ` Target area ${target}. Your area ${N}.` : '');

  const pairs = target ? factorPairs(target) : [];

  return (
    <div className="mlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Multiplication as an Array</h1>
        <p className="lede">
          See <span className="mono">a × b</span> as a rectangle of unit squares — <em>a</em> rows of{' '}
          <em>b</em>. Each dial unlocks with the lesson, so you meet one idea at a time: repeated
          addition, why order doesn’t matter, area, and the <em>break-apart</em> trick behind
          multi-digit multiplication. Finish by building a rectangle to a target area.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              {a} × {b} = {N}
            </p>
            <p className="equation-sub mono">{subEquation(step, a, b, split)}</p>
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
            <span className="hint mono">hover a square to count it</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — the area matches the target.' : ''}
          </p>

          {step === DIST_STEP && !calib && (
            <div className="legend" aria-hidden="true">
              <span className="sw sw-a" /> a × b₁ = {a * b1}
              <span className="sw sw-b" /> a × b₂ = {a * b2}
            </div>
          )}

          <div className="facts">
            {!calib ? (
              <>
                <div className="fact">
                  <span className="fact-k">Product</span>
                  <span className="fact-v mono">
                    {a} × {b} = {N}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">As addition</span>
                  <span className="fact-v mono">
                    {a} group{a === 1 ? '' : 's'} of {b}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">Commutes to</span>
                  <span className="fact-v mono">
                    {b} × {a} = {N}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">Area</span>
                  <span className="fact-v">
                    {N} {units(N)}
                    {a === b ? ' · a perfect square' : ''}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="fact">
                  <span className="fact-k">Your rectangle</span>
                  <span className="fact-v mono">
                    {a} × {b}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">Its area</span>
                  <span className="fact-v mono">
                    {N} {units(N)}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">Target area</span>
                  <span className="fact-v mono">{target ?? '—'}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Factor pair?</span>
                  <span className="fact-v mono">
                    {calibrated ? `${a} × ${b} ✓` : 'not yet'}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (counting ? ' on' : '')}
              onClick={() => {
                countRef.current = null;
                setCounting(true);
              }}
            >
              {counting ? 'Counting…' : 'Count the squares'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={flip}
              disabled={step < COMMUTE_STEP}
              title={step < COMMUTE_STEP ? 'Unlocks at the “order does not matter” step' : 'Swap a and b'}
            >
              Flip a ↔ b
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

          <div className="dials">
            {PARAMS.map((d) => {
              const unlocked = step >= d.unlock;
              let val = { a, b, split }[d.key];
              let disp = String(val);
              let dmax = d.max;
              if (d.key === 'split') {
                disp = `${b1} + ${b2}`;
                dmax = Math.max(1, b - 1);
                val = b1;
              }
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.label}</span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={dmax}
                    step={d.step}
                    value={val}
                    disabled={!unlocked}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? disp : '🔒'}</output>
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

          {current.calib && target && (
            <div className="calib">
              <p className="calib-goal">
                Target area: <strong>{target}</strong> square units
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
                    area {N} {N < target ? 'too small' : N > target ? 'too big' : ''}
                  </span>
                )}
              </div>
              {calibrated && (
                <p className="factnote">
                  {a} × {b} = {target}. Rectangles with this area:{' '}
                  {pairs.map((p, i) => (
                    <span key={i} className="mono">
                      {i > 0 ? ', ' : ''}
                      {p[0]}×{p[1]}
                    </span>
                  ))}
                  .
                </p>
              )}
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
                  countRef.current = null;
                  setCounting(false);
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
        <span className="mono">a × b</span> &nbsp;·&nbsp; the array / area model of multiplication,
        built live from the dials on a 12×12 quadrille grid.
      </footer>

      <style jsx>{`
        .mlab {
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
          font-size: 20px;
          font-weight: 600;
          margin: 0;
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
        .legend {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin: 12px 4px 0;
          font: 12.5px/1 var(--mono);
          color: var(--ink-soft);
        }
        .legend .sw {
          display: inline-block;
          width: 16px;
          height: 12px;
          border-radius: 3px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          margin-left: 6px;
        }
        .legend .sw-a {
          background: rgba(199, 216, 228, 0.85);
          margin-left: 0;
        }
        .legend .sw-b {
          background: rgba(200, 30, 79, 0.18);
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
          grid-template-columns: 26px 1fr 58px;
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
          font-size: 13px;
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
