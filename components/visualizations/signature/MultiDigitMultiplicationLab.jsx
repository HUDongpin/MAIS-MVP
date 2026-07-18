'use client';

/* ============================================================================
   MultiDigitMultiplicationLab — an interactive "bench" for MULTI-DIGIT
   multiplication (two-digit × two-digit), taught through the PARTIAL-PRODUCTS
   AREA MODEL and its bridge to the STANDARD ALGORITHM.

   The big idea: you cannot recall 34 × 26 as a fact, so you break BOTH numbers
   apart by place value and multiply the pieces:

        34 × 26 = (30 + 4) × (20 + 6)
                =  30×20 + 30×6 + 4×20 + 4×6
                =  600   + 180  + 80   + 24   = 884

   A rectangle 34 wide and 26 tall is split — once down the middle by the tens
   and ones of 34, once across by the tens and ones of 26 — into four smaller
   rectangles. Each small rectangle's AREA is one partial product, and the four
   areas add back to the whole. Crucially the pieces are drawn PROPORTIONALLY
   (by place value, not as 884 literal unit squares), so a student SEES that the
   tens×tens box (600) is by far the biggest slice of the product.

   The capstone connection: the TWO ROWS of the box are exactly the two lines of
   the paper ("standard") algorithm — the bottom band is 34 × 6 = 204, the top
   band is 34 × 20 = 680 — which is why the second line carries a placeholder 0.
   This kills the classic error of writing 68 instead of 680.

   Built for MAIS (math AI system, www.mais.ac), K-12 (grades ~4–5;
   CCSS 4.NBT.B.5 multiply using place-value strategies & area models;
   5.NBT.B.5 fluently multiply multi-digit whole numbers by the standard
   algorithm).

   DISTINCT from MultiplicationLab.jsx, which owns single-digit facts (1–12) as
   literal unit-square arrays with ONE distributive split. This lab owns the
   two-sided place-value decomposition (a 2×2 partial-products grid) and the
   standard-algorithm bridge — a different concept and a different grade band.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions, a
   calibration challenge with a live match meter, and one carmine accent for the
   mathematical object. (A second BLUE accent is used on purpose at the standard-
   algorithm step to tie the two partial-product LINES to the two box BANDS — a
   principled two-color relaxation, since the two lines are genuinely two objects.)

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/MultiDigitMultiplicationLab.jsx
     2. Import and render it:
          import MultiDigitMultiplicationLab from './MultiDigitMultiplicationLab';
          export default function Page() { return <MultiDigitMultiplicationLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, step).
     MODEL  — the arithmetic (splits, partial products, algorithm lines) is pure
              and EXACT integer math; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Ranges. Both factors are two-digit (10..99) in the lesson so the box stays a
   clean 2×2. Calibration narrows to 10..50 so hitting an exact target product
   by tuning two dials stays achievable for a young student.
   ------------------------------------------------------------------------- */
const AMIN = 10;
const AMAX = 99;
const CALIB_MIN = 10;
const CALIB_MAX = 50;
const START = { a: 34, b: 26 };

// Named step indices (0-based) so the renderer and effects read clearly.
const MEET = 0; // whole rectangle — too many squares to count
const SPLIT_A = 1; // split the TOP factor into tens + ones (columns)
const SPLIT_B = 2; // split the BOTTOM factor too (rows) → four partial products
const READ = 3; // read the four partial products
const ADD = 4; // add the four parts → the product
const ALG = 5; // the standard algorithm + the placeholder zero
const CALIB = 6; // calibration challenge

/* ---------------------------------------------------------------------------
   Parameters. Two dials — the two factors. The place-value split is NOT a free
   dial (unlike the single-digit lab): place value decides where the break goes,
   which is the whole point. `a` unlocks when we split the top, `b` when we split
   the bottom.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'a', label: 'a', min: AMIN, max: AMAX, step: 1, unlock: SPLIT_A, role: 'top factor · a = tens + ones' },
  { key: 'b', label: 'b', min: AMIN, max: AMAX, step: 1, unlock: SPLIT_B, role: 'bottom factor · b = tens + ones' },
];

/* ---------------------------------------------------------------------------
   Lesson. One idea per step; the dial unlocks with the step; the reveal lives
   in `feedback` (shown after answering); distractors are real student
   misconceptions (multiply-the-digits-only, drop-the-placeholder-zero, add the
   factors). Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A product too big to count',
    body:
      'How much is 34 × 26? It is not a fact you can just recall, and drawing 884 little squares to ' +
      'count would be hopeless. Instead we picture 34 × 26 as the AREA of a rectangle 34 wide and 26 ' +
      'tall — and then break that rectangle apart by place value.',
    q: 'Why not just count unit squares to find 34 × 26?',
    choices: [
      'There are 884 of them — far too many to count one by one',
      'Squares cannot measure multiplication',
      'The rectangle is not really 34 by 26',
    ],
    answer: 0,
    feedback:
      'The area IS 884 unit squares, but counting them one at a time is hopeless. The trick is to cut ' +
      'the rectangle into a few big pieces using the tens and ones of each number, find each piece, ' +
      'and add. That is what every multi-digit method — box, partial products, standard algorithm — is doing.',
  },
  {
    title: 'Split the top number',
    body:
      'The a dial is live. Split the top factor into its tens and ones: 34 = 30 + 4. The rectangle ' +
      'splits into two columns — a wide 30 part and a narrow 4 part. Each column is easier to multiply: ' +
      '30 × 26 and 4 × 26.',
    q: 'Breaking 34 into 30 + 4, which two products cover 34 × 26?',
    choices: [
      '30 × 26 and 4 × 26',
      '30 × 26 and 4 × 6',
      '3 × 26 and 4 × 26',
    ],
    answer: 0,
    feedback:
      '34 × 26 = (30 + 4) × 26 = 30×26 + 4×26 = 780 + 104 = 884. Splitting ONE factor and adding the ' +
      'parts is the distributive property. Note 34 splits into 30 and 4 — three TENS and four ones — ' +
      'not 3 and 4.',
  },
  {
    title: 'Split the bottom number too',
    body:
      'Now the b dial unlocks. Split the bottom factor as well: 26 = 20 + 6. The rectangle is cut both ' +
      'ways at once into FOUR pieces. Every piece is now a basic times-table fact scaled by tens — for ' +
      'example 30 × 20 is just 3 × 2 with two zeros: 600.',
    q: 'After splitting both numbers, how many partial-product rectangles appear?',
    choices: ['Four', 'Two', 'Eight'],
    answer: 0,
    feedback:
      'Two parts across × two parts down = four rectangles: 30×20, 30×6, 4×20, and 4×6. Each is easy ' +
      'because it is a single-digit fact times a power of ten. This four-box picture is the "area model" ' +
      'or "box method".',
  },
  {
    title: 'Read the four parts',
    body:
      'Look at the four boxes. The tens×tens box (30 × 20 = 600) is by far the biggest — it is most of ' +
      'the product. The ones×ones box (4 × 6 = 24) is the smallest. Hover any box to read its partial ' +
      'product. Each area is exactly a place-value fact.',
    q: 'What is the tens×tens piece, 30 × 20?',
    choices: ['600', '60', '500'],
    answer: 0,
    feedback:
      '30 × 20 = (3 × 2) × (10 × 10) = 6 × 100 = 600. A common slip is 60 — that forgets one of the ' +
      'tens. Multiplying two tens gives hundreds, so both zeros come along.',
  },
  {
    title: 'Add the parts',
    body:
      'The whole product is the sum of the four pieces. Press "Add the parts" to total them up: ' +
      '600 + 180 + 80 + 24 = 884. That is 34 × 26. The four areas always add back to the whole rectangle.',
    q: 'Add the partial products 600 + 180 + 80 + 24. What is 34 × 26?',
    choices: ['884', '794', '788'],
    answer: 0,
    feedback:
      '600 + 180 + 80 + 24 = 884. Adding the four partial products gives the exact product — no counting ' +
      'required. This is why the area model always works, for any two numbers.',
  },
  {
    title: 'The standard algorithm',
    body:
      'The paper method is the SAME four boxes, grouped into two rows. The bottom band is 34 × 6 = 204 ' +
      '(the first line). The top band is 34 × 20 = 680 (the second line) — and because you are ' +
      'multiplying by 2 TENS, that line ends in a placeholder 0. Add the two lines: 204 + 680 = 884.',
    q: 'In 34 × 26, the second line is 34 × 2(0). Why write 680, not 68?',
    choices: [
      'The 2 stands for 2 tens, so the answer is ten times bigger — hold the ones place with a 0',
      'You always add a 0 to the second line for decoration',
      'Because 34 × 2 = 68 is wrong',
    ],
    answer: 0,
    feedback:
      'The 2 in 26 means 20, so the second line is 34 × 20 = 680, not 34 × 2 = 68. The placeholder 0 ' +
      'holds the ones place so the digits line up with their true value. On the box, that line is the ' +
      'whole TOP band — the tens row — which sits ten times higher in value than the bottom band.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. You are given a target product. Tune the two factors (10–50) until the rectangle ' +
      'grows to exactly that area. Watch the box: making the tens digits bigger changes the product the ' +
      'most. Several factor pairs hit each target — any correct one calibrates. Press "New target" for a ' +
      'fresh one.',
    calib: true,
  },
];

/* ============================================================================
   MODEL — pure, EXACT integer arithmetic. No floating point anywhere a value is
   claimed; a K-12 lab must never show 0.30000000000000004.
   ========================================================================== */
const clampInt = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(v)));

// Place-value split of a two-digit number: 34 → { tens: 30, ones: 4 }.
const tensOf = (n) => Math.floor(n / 10) * 10;
const onesOf = (n) => n % 10;

// The four partial products of a×b. Named by which place of each factor.
function partials(a, b) {
  const aT = tensOf(a), aO = onesOf(a);
  const bT = tensOf(b), bO = onesOf(b);
  return {
    aT, aO, bT, bO,
    TT: aT * bT, // tens × tens (top-left, biggest)
    TO: aT * bO, // tens × ones (bottom-left)
    OT: aO * bT, // ones × tens (top-right)
    OO: aO * bO, // ones × ones (bottom-right, smallest)
    lineOnes: a * bO, // standard-algorithm first line  = TO + OO
    lineTens: a * bT, // standard-algorithm second line = TT + OT (ends in 0)
    product: a * b,
  };
}

/* ---------------------------------------------------------------------------
   Calibration — a CONSTRUCTION goal (hit a target product), not a curve match,
   matching the sibling MultiplicationLab. Targets each factor as two numbers in
   10..50 in several ways, so the student can discover more than one pair.
   ------------------------------------------------------------------------- */
const TARGETS = [360, 480, 576, 630, 720, 840, 900];
const productPercent = (cur, P) => Math.max(0, Math.min(100, 100 * (1 - Math.abs(cur - P) / P)));

function makeTarget(prev) {
  let P;
  do {
    P = TARGETS[Math.floor(Math.random() * TARGETS.length)];
  } while (prev && P === prev);
  return P;
}

// Factor pairs (x ≤ y) of P with both factors in the calibration range — shown
// on success so the student sees the OTHER rectangles that share the product.
function factorPairs(P) {
  const out = [];
  for (let x = CALIB_MIN; x <= CALIB_MAX; x++) {
    if (P % x === 0) {
      const y = P / x;
      if (y >= CALIB_MIN && y <= CALIB_MAX && x <= y) out.push([x, y]);
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Formatting helpers. Build the "(30 + 4) × (20 + 6)" and "600 + 180 + …" lines
   from state, skipping any zero place (e.g. 40 → "40", not "40 + 0").
   ------------------------------------------------------------------------- */
function decompose(a, b) {
  const aT = tensOf(a), aO = onesOf(a);
  const bT = tensOf(b), bO = onesOf(b);
  const A = aO ? `(${aT} + ${aO})` : `${aT}`;
  const B = bO ? `(${bT} + ${bO})` : `${bT}`;
  return `${A} × ${B}`;
}

// The partial products as a "+"-joined list, largest first (estimation order).
function partialSumStr(a, b) {
  const p = partials(a, b);
  const terms = [p.TT, p.TO, p.OT, p.OO].filter((v) => v > 0).sort((x, y) => y - x);
  return terms.join(' + ');
}

// The one-line relation under the big equation, matched to the current step.
function subEquation(step, a, b) {
  const p = partials(a, b);
  const N = p.product;
  if (step <= MEET) return `area = ${N} square units`;
  if (step === SPLIT_A) return `${decompose(a, b).split(' × ')[0]} × ${b} = ${p.aT * b} + ${p.aO * b} = ${N}`;
  if (step === SPLIT_B || step === READ) return `${decompose(a, b)} = ${partialSumStr(a, b)} = ${N}`;
  if (step === ADD) return `${partialSumStr(a, b)} = ${N}`;
  if (step === ALG) return `${a}×${p.bO} + ${a}×${p.bT} = ${p.lineOnes} + ${p.lineTens} = ${N}`;
  return `${a} × ${b} = ${N}`;
}

/* ---------------------------------------------------------------------------
   Layout. The box fills a padded region of the (square) stage. Room is left on
   top for the a-part labels, on the left for the b-part labels, and at the
   bottom for the standard-algorithm band tags. The box need not be a:b shaped —
   because every sub-box is split by VALUE fraction, each sub-box's area is
   exactly partialProduct / product of the whole, no matter the outer shape.
   Shared by the renderer and the pointer hit-test so they never disagree.
   ------------------------------------------------------------------------- */
function computeRegion(W, H) {
  const left = 50, right = 18, top = 30, bottom = 40;
  const Wp = Math.max(20, W - left - right);
  const Hp = Math.max(20, H - top - bottom);
  return { X0: left, Y0: top, Wp, Hp };
}

// Columns (left→right: tens, ones of a) and rows (top→bottom: tens, ones of b),
// each as {val, x, w} / {val, y, h}. Zero places are dropped so a factor like 40
// draws a single full-width column. `splitA/splitB` gate whether the cut shows.
function segments(a, b, splitA, splitB, region) {
  const aT = tensOf(a), aO = onesOf(a);
  const bT = tensOf(b), bO = onesOf(b);
  const colVals = (splitA ? [aT, aO] : [a]).filter((v) => v > 0);
  const rowVals = (splitB ? [bT, bO] : [b]).filter((v) => v > 0);
  const cols = [];
  let x = region.X0;
  for (const v of colVals) {
    const w = (v / a) * region.Wp;
    cols.push({ val: v, x, w });
    x += w;
  }
  const rows = [];
  let y = region.Y0;
  for (const v of rowVals) {
    const h = (v / b) * region.Hp;
    rows.push({ val: v, y, h });
    y += h;
  }
  return { cols, rows };
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function MultiDigitMultiplicationLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [adding, setAdding] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // {ci, ri} sub-box under the pointer, or null
  const addRef = useRef(null); // # partial products "added" so far (animation), or null
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const p = partials(a, b);
  const N = p.product;

  const splitA = step >= SPLIT_A || calib;
  const splitB = step >= SPLIT_B || calib;

  // Snapshot for the renderer so draw() (a stable callback) never reads stale
  // values through its closure.
  sceneRef.current = { a, b, step, calib, splitA, splitB };

  const pct = target ? productPercent(N, target) : 0;
  const calibrated = target ? N === target : false;

  /* ---- full redraw from state -------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // crisp lines, capped for perf
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    const S = sceneRef.current;
    const A = S.a, B = S.b;
    const pp = partials(A, B);
    const N = A * B; // computed from the SNAPSHOT — never the stale component-scope N
    const isAlg = S.step === ALG && !S.calib;

    const CARM = '#C81E4F'; // the product / the ones-line accent
    const BLUE = '#2b6cb0'; // the tens-line accent (standard-algorithm step)
    const INK = '#1c2b3a';
    const SLATE = 'rgba(120,150,175,0.75)';

    const region = computeRegion(W, H);
    const { cols, rows } = segments(A, B, S.splitA, S.splitB, region);

    ctx.clearRect(0, 0, W, H);

    /* quadrille paper — faint fixed-pitch graph texture behind the model */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.55)';
    ctx.beginPath();
    const pitch = 24;
    for (let X = 0; X <= W; X += pitch) {
      ctx.moveTo(Math.round(X) + 0.5, 0);
      ctx.lineTo(Math.round(X) + 0.5, H);
    }
    for (let Y = 0; Y <= H; Y += pitch) {
      ctx.moveTo(0, Math.round(Y) + 0.5);
      ctx.lineTo(W, Math.round(Y) + 0.5);
    }
    ctx.stroke();

    /* ---- reusable paper-white label chip ---------------------------------- */
    const chip = (text, cx, cy, align, color, weight) => {
      ctx.font = `${weight || 400} 12px ui-monospace, "SF Mono", Menlo, monospace`;
      const tw = ctx.measureText(text).width;
      let bx = cx;
      if (align === 'center') bx = cx - tw / 2;
      else if (align === 'right') bx = cx - tw;
      ctx.fillStyle = 'rgba(251,251,248,0.94)';
      ctx.fillRect(bx - 3, cy - 8, tw + 6, 16);
      ctx.fillStyle = color || INK;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, cy);
    };

    // Build the flat list of sub-boxes (row-major) with their partial products.
    const cells = [];
    rows.forEach((rw, ri) =>
      cols.forEach((cl, ci) => {
        cells.push({
          ci, ri, x: cl.x, y: rw.y, w: cl.w, h: rw.h,
          cv: cl.val, rv: rw.val, prod: cl.val * rw.val,
        });
      }),
    );
    const maxProd = cells.reduce((m, c) => Math.max(m, c.prod), 1);

    // Add-animation: which boxes are "added" so far, ranked largest-first.
    const added = addRef.current;
    let addedSet = null;
    if (added != null) {
      const ranked = cells.map((c, i) => ({ i, prod: c.prod })).sort((u, v) => v.prod - u.prod);
      addedSet = new Set(ranked.slice(0, added).map((r) => r.i));
    }

    /* ---- fill each sub-box: carmine wash, opacity graded by its share of the
            product, so the tens×tens slice reads as the dominant piece ------- */
    cells.forEach((c, i) => {
      const share = c.prod / maxProd;
      let op = 0.1 + 0.26 * share;
      if (addedSet && addedSet.has(i)) op = Math.min(0.5, op + 0.16); // pop when counted
      ctx.fillStyle = `rgba(200,30,79,${op.toFixed(3)})`;
      ctx.fillRect(c.x, c.y, c.w, c.h);
    });

    /* hovered sub-box highlight */
    const hov = hoverRef.current;
    const hovCell =
      hov != null ? cells.find((c) => c.ci === hov.ci && c.ri === hov.ri) : null;
    if (hovCell) {
      ctx.fillStyle = 'rgba(200,30,79,0.22)';
      ctx.fillRect(hovCell.x, hovCell.y, hovCell.w, hovCell.h);
    }

    /* ---- interior grid lines (cell borders) -------------------------------- */
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = SLATE;
    cells.forEach((c) => ctx.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1));

    /* ---- place-value split lines — the tens|ones cuts, dashed & bolder ----- */
    if (cols.length > 1) {
      const xCut = cols[1].x;
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(28,43,58,0.5)';
      ctx.beginPath();
      ctx.moveTo(Math.round(xCut) + 0.5, region.Y0);
      ctx.lineTo(Math.round(xCut) + 0.5, region.Y0 + region.Hp);
      ctx.stroke();
      ctx.restore();
    }
    if (rows.length > 1) {
      const yCut = rows[1].y;
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(28,43,58,0.5)';
      ctx.beginPath();
      ctx.moveTo(region.X0, Math.round(yCut) + 0.5);
      ctx.lineTo(region.X0 + region.Wp, Math.round(yCut) + 0.5);
      ctx.stroke();
      ctx.restore();
    }

    /* ---- STANDARD-ALGORITHM step: outline the two bands (= the two lines) --- */
    if (isAlg && rows.length > 1) {
      const bandTens = rows[0]; // top band  → second line (34 × 20 = 680)
      const bandOnes = rows[1]; // bottom band → first line (34 × 6 = 204)
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = BLUE;
      ctx.strokeRect(region.X0 + 1, bandTens.y + 1, region.Wp - 2, bandTens.h - 2);
      ctx.strokeStyle = CARM;
      ctx.strokeRect(region.X0 + 1, bandOnes.y + 1, region.Wp - 2, bandOnes.h - 2);
      ctx.restore();
      chip(`${A}×${pp.bO} = ${pp.lineOnes}`, region.X0 + region.Wp - 4, bandOnes.y + bandOnes.h - 11, 'right', CARM, 700);
      chip(`${A}×${pp.bT} = ${pp.lineTens}`, region.X0 + region.Wp - 4, bandTens.y + 11, 'right', BLUE, 700);
    }

    /* ---- the whole rectangle outline — the mathematical object ------------- */
    ctx.save();
    ctx.lineWidth = 2.75;
    ctx.strokeStyle = CARM;
    ctx.strokeRect(region.X0 + 0.5, region.Y0 + 0.5, region.Wp - 1, region.Hp - 1);
    ctx.restore();

    /* ---- in-box partial-product labels (skip boxes too small to hold one) --- */
    if (!isAlg) {
      cells.forEach((c) => {
        if (c.w >= 30 && c.h >= 20) {
          chip(String(c.prod), c.x + c.w / 2, c.y + c.h / 2, 'center', INK, 600);
        }
      });
    }

    /* ---- edge labels: the tens/ones of each factor along the top & left ---- */
    cols.forEach((cl) => {
      chip(String(cl.val), cl.x + cl.w / 2, region.Y0 - 13, 'center', CARM, 700);
    });
    rows.forEach((rw) => {
      chip(String(rw.val), region.X0 - 14, rw.y + rw.h / 2, 'right', CARM, 700);
    });

    /* ---- hover readout: the box's partial product as a fact ---------------- */
    if (hovCell) {
      chip(
        `${hovCell.cv} × ${hovCell.rv} = ${hovCell.prod}`,
        Math.min(region.X0 + region.Wp, hovCell.x + hovCell.w / 2),
        hovCell.y + hovCell.h / 2 + (hovCell.h >= 40 ? 16 : 0),
        'center', CARM, 700,
      );
    }

    /* ---- top-left readout box: the running relation, tied to the picture --- */
    let read;
    if (S.calib) {
      read = target ? `you ${N}  ·  target ${target}` : null;
    } else if (S.step <= MEET) {
      read = `${A} × ${B} = ${N}`;
    } else if (S.step === SPLIT_A) {
      read = `${pp.aT}×${B} + ${pp.aO}×${B} = ${pp.aT * B} + ${pp.aO * B} = ${N}`;
    } else if (S.step === ADD && added != null) {
      const ranked = cells.map((c) => c.prod).sort((u, v) => v - u);
      const shown = ranked.slice(0, added);
      const run = shown.reduce((s, v) => s + v, 0);
      read = shown.length ? `${shown.join(' + ')} = ${run}` : 'tap Add the parts';
    } else if (S.step === ALG) {
      read = `${pp.lineOnes} + ${pp.lineTens} = ${N}`;
    } else {
      read = `${partialSumStr(A, B)} = ${N}`;
    }
    if (read) {
      ctx.save();
      ctx.font = '600 12.5px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(read).width;
      const boxW = Math.min(tw + 14, W - 20);
      ctx.fillStyle = 'rgba(251,251,248,0.95)';
      ctx.fillRect(10, 8, boxW, 22);
      ctx.strokeStyle = 'rgba(200,30,79,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(10.5, 8.5, boxW - 1, 21);
      ctx.fillStyle = CARM;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(read, 17, 20);
      ctx.restore();
    }
  }, [target]);

  /* redraw whenever the picture-affecting state changes */
  useEffect(() => {
    draw();
  }, [a, b, step, target, adding, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* entering calibration: hand out a target and reset the dials to a non-answer
     rectangle inside the calibration range, so it starts un-matched */
  useEffect(() => {
    if (current.calib) {
      if (!target) setTarget(makeTarget(null));
      setA((v) => clampInt(v, CALIB_MIN, CALIB_MAX));
      setB((v) => clampInt(v, CALIB_MIN, CALIB_MAX));
      addRef.current = null;
      setAdding(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the "add the parts" step auto-runs the sum sweep the first time */
  useEffect(() => {
    if (step === ADD) {
      addRef.current = null;
      setAdding(true);
    }
  }, [step]);

  /* the add sweep — time-based (dt), opt-in, respects reduced motion */
  useEffect(() => {
    if (!adding) return;
    const nBoxes = (splitA ? (onesOf(a) ? 2 : 1) : 1) * (splitB ? (onesOf(b) ? 2 : 1) : 1);
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      addRef.current = nBoxes;
      draw();
      setAdding(false);
      return;
    }
    let raf;
    let last = null;
    let shown = 0;
    addRef.current = 0;
    const PER = 520; // ms per partial product added
    const loop = (now) => {
      if (last == null) last = now;
      if (now - last >= PER) {
        last = now;
        shown = Math.min(nBoxes, shown + 1);
        addRef.current = shown;
        draw();
        if (shown >= nBoxes) {
          setAdding(false);
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [adding, a, b, splitA, splitB, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (Number.isNaN(v)) return;
    if (key === 'a') setA(v);
    else setB(v);
    addRef.current = null; // a change invalidates the running sum
    if (adding) setAdding(false);
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const region = computeRegion(rect.width, rect.height);
    const { cols, rows } = segments(a, b, splitA, splitB, region);
    let ci = -1, ri = -1;
    cols.forEach((cl, i) => {
      if (mx >= cl.x && mx < cl.x + cl.w) ci = i;
    });
    rows.forEach((rw, i) => {
      if (my >= rw.y && my < rw.y + rw.h) ri = i;
    });
    hoverRef.current = ci >= 0 && ri >= 0 ? { ci, ri } : null;
    draw();
  };
  const onPointerLeave = () => {
    hoverRef.current = null;
    draw();
  };

  const runAdd = () => {
    addRef.current = null;
    setAdding(true);
  };

  const resetDials = () => {
    setA(calib ? clampInt(START.a, CALIB_MIN, CALIB_MAX) : START.a);
    setB(calib ? clampInt(START.b, CALIB_MIN, CALIB_MAX) : START.b);
    addRef.current = null;
    if (adding) setAdding(false);
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

  const dmin = calib ? CALIB_MIN : AMIN;
  const dmax = calib ? CALIB_MAX : AMAX;

  const spoken =
    `Multi-digit multiplication. ${a} times ${b} equals ${N}. ` +
    `${a} is ${p.aT} plus ${p.aO}; ${b} is ${p.bT} plus ${p.bO}. ` +
    `Partial products ${p.TT}, ${p.TO}, ${p.OT}, and ${p.OO}.` +
    (calib && target ? ` Target ${target}. Your product ${N}.` : '');

  const pairs = target ? factorPairs(target) : [];
  const tensDigit = p.bT / 10; // the tens DIGIT of b (e.g. 2 for 26)

  return (
    <div className="mdlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Multi-Digit Multiplication</h1>
        <p className="lede">
          You can’t just <em>know</em> <span className="mono">34 × 26</span>. Break each number into
          tens and ones, multiply the four pieces, and add. The rectangle below cuts into four{' '}
          <em>partial products</em> — and those same four pieces are exactly the two lines of the paper
          algorithm, which is where the mysterious placeholder <span className="mono">0</span> comes from.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              {a} × {b} = {N}
            </p>
            <p className="equation-sub mono">{subEquation(step, a, b)}</p>
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
            <span className="hint mono">hover a piece to read its product</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — the product matches the target.' : ''}
          </p>

          {/* partial-products ledger — the running sum, tied to the boxes */}
          {!calib && step >= SPLIT_A && (
            <div className="ledger" aria-hidden="true">
              {step === SPLIT_A ? (
                <span className="mono">
                  {p.aT}×{b} + {p.aO}×{b} = {p.aT * b} + {p.aO * b} = <b>{N}</b>
                </span>
              ) : (
                <span className="mono">
                  {partialSumStr(a, b)} = <b>{N}</b>
                </span>
              )}
            </div>
          )}

          {/* standard-algorithm card — the misconception centerpiece */}
          {step === ALG && !calib && (
            <div className="algo" role="group" aria-label="Standard algorithm">
              <div className="algo-grid mono">
                <span className="ag num">{a}</span>
                <span className="ag op">×{b}</span>
                <span className="ag rule" />
                <span className="ag line1" title={`${a} × ${p.bO}`}>
                  {p.lineOnes}
                </span>
                <span className="ag line2" title={`${a} × ${p.bT}`}>
                  {p.lineTens > 0 ? String(p.lineTens).slice(0, -1) : '0'}
                  <b className="ph">0</b>
                </span>
                <span className="ag rule" />
                <span className="ag total">{N}</span>
              </div>
              <div className="algo-key">
                <p>
                  <span className="dot dot-c" /> line 1 = {a} × {p.bO} = <b>{p.lineOnes}</b> &nbsp;(the
                  bottom band)
                </p>
                <p>
                  <span className="dot dot-b" /> line 2 = {a} × {p.bT} = <b>{p.lineTens}</b> &nbsp;(the top
                  band){tensDigit ? ` — that's ${a} × ${tensDigit}, then a placeholder 0` : ''}
                </p>
              </div>
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
                  <span className="fact-k">Place value</span>
                  <span className="fact-v mono">{decompose(a, b)}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Partial products</span>
                  <span className="fact-v mono">{partialSumStr(a, b)}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Two lines</span>
                  <span className="fact-v mono">
                    {p.lineOnes} + {p.lineTens}
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
                  <span className="fact-k">Your product</span>
                  <span className="fact-v mono">{N}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Target</span>
                  <span className="fact-v mono">{target ?? '—'}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Off by</span>
                  <span className="fact-v mono">{target != null ? Math.abs(N - target) : '—'}</span>
                </div>
              </>
            )}
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (adding ? ' on' : '')}
              onClick={runAdd}
              disabled={!splitA}
              title={splitA ? 'Sweep-add the partial products' : 'Unlocks once the pieces appear'}
            >
              {adding ? 'Adding…' : 'Add the parts'}
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
              const unlocked = step >= d.unlock || calib;
              const val = d.key === 'a' ? a : b;
              const parts = d.key === 'a' ? `${p.aT} + ${p.aO}` : `${p.bT} + ${p.bO}`;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.label}</span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={dmin}
                    max={dmax}
                    step={d.step}
                    value={val}
                    disabled={!unlocked}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? `${val} = ${parts}` : '🔒'}</output>
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
                Target product: <strong>{target}</strong>
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
                    {N < target ? 'too small — grow a factor' : N > target ? 'too big — shrink a factor' : ''}
                  </span>
                )}
              </div>
              {calibrated && (
                <p className="factnote">
                  {a} × {b} = {target}. Other rectangles with this product:{' '}
                  {pairs.map((pr, i) => (
                    <span key={i} className="mono">
                      {i > 0 ? ', ' : ''}
                      {pr[0]}×{pr[1]}
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
                  addRef.current = null;
                  setAdding(false);
                  setA(START.a);
                  setB(START.b);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">(30 + 4)(20 + 6)</span> &nbsp;·&nbsp; the partial-products area model of
        multi-digit multiplication, built live from the two dials.
      </footer>

      <style jsx>{`
        .mdlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #2b6cb0;
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
        .ledger {
          margin: 12px 4px 0;
          font-size: 14px;
          color: var(--ink-soft);
          text-align: center;
        }
        .ledger b {
          color: var(--curve);
        }
        .algo {
          display: flex;
          gap: 18px;
          align-items: center;
          flex-wrap: wrap;
          margin: 14px 4px 0;
          padding: 12px 14px;
          border: 1px solid rgba(28, 43, 58, 0.12);
          border-radius: 10px;
          background: rgba(199, 216, 228, 0.14);
        }
        .algo-grid {
          display: grid;
          justify-items: end;
          gap: 2px 0;
          font-size: 20px;
          font-variant-numeric: tabular-nums;
          line-height: 1.15;
          min-width: 92px;
        }
        .ag {
          padding: 0 4px;
        }
        .ag.op {
          border-bottom: 0;
        }
        .ag.rule {
          width: 100%;
          height: 0;
          border-top: 2px solid var(--ink);
          margin: 2px 0;
        }
        .ag.line1 {
          color: var(--curve);
        }
        .ag.line2 {
          color: var(--blue);
        }
        .ag.line2 .ph {
          color: var(--curve);
          background: rgba(200, 30, 79, 0.14);
          border-radius: 3px;
          padding: 0 1px;
        }
        .ag.total {
          font-weight: 700;
        }
        .algo-key {
          font-size: 12.5px;
          color: var(--ink-soft);
          line-height: 1.5;
        }
        .algo-key p {
          margin: 0 0 4px;
        }
        .algo-key b {
          color: var(--ink);
          font-family: var(--mono);
        }
        .dot {
          display: inline-block;
          width: 9px;
          height: 9px;
          border-radius: 2px;
          margin-right: 5px;
          vertical-align: baseline;
        }
        .dot-c {
          background: var(--curve);
        }
        .dot-b {
          background: var(--blue);
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
          grid-template-columns: 26px 1fr 96px;
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
          accent-color: var(--curve);
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
          font-size: 12px;
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
        :global(.mdlab) :focus-visible {
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
